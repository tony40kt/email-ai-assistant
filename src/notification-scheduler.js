"use strict";

const PUSH_MODES = {
  IMMEDIATE: "immediate",
  FIXED_TIMES: "fixed_times",
  DAILY: "daily"
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ZONED_FORMATTER_CACHE = new Map();

const toDate = (value) => {
  if (!value) return new Date();
  if (value instanceof Date) return new Date(value.getTime());
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError("now must be a valid Date or date-like value");
  }
  return parsed;
};

const parseClock = (value, fieldName) => {
  if (typeof value !== "string") {
    throw new TypeError(`${fieldName} must be a HH:mm string`);
  }
  const match = value.match(TIME_PATTERN);
  if (!match) {
    throw new TypeError(`${fieldName} must be a valid HH:mm string`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return {
    hour,
    minute,
    minutesOfDay: (hour * 60) + minute
  };
};

const getFormatter = (timeZone) => {
  if (!ZONED_FORMATTER_CACHE.has(timeZone)) {
    ZONED_FORMATTER_CACHE.set(timeZone, new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }));
  }
  return ZONED_FORMATTER_CACHE.get(timeZone);
};

const normalizeTimeZone = (timeZone) => {
  const safeZone = typeof timeZone === "string" && timeZone.trim() ? timeZone.trim() : "UTC";
  try {
    getFormatter(safeZone);
    return safeZone;
  } catch (error) {
    throw new TypeError(`Invalid timeZone: ${safeZone}`);
  }
};

const getZonedParts = (date, timeZone) => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const pick = (type) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second")
  };
};

const addLocalDays = (localDate, days) => {
  const shifted = new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  };
};

const localPartsToEpoch = (value) => Date.UTC(
  value.year,
  value.month - 1,
  value.day,
  value.hour,
  value.minute,
  value.second || 0
);

const zonedDateTimeToUtc = (value, timeZone) => {
  let guess = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second || 0);

  for (let i = 0; i < 4; i += 1) {
    const actual = getZonedParts(new Date(guess), timeZone);
    const delta = localPartsToEpoch(value) - localPartsToEpoch(actual);
    if (delta === 0) break;
    guess += delta;
  }

  return new Date(guess);
};

const parseQuietHours = (quietHours) => {
  if (!quietHours) return null;
  const start = parseClock(quietHours.start, "quietHours.start");
  const end = parseClock(quietHours.end, "quietHours.end");
  return { start, end };
};

const isInQuietWindow = (minuteOfDay, quietHours) => {
  const start = quietHours.start.minutesOfDay;
  const end = quietHours.end.minutesOfDay;
  if (start === end) return false;
  if (start < end) return minuteOfDay >= start && minuteOfDay < end;
  return minuteOfDay >= start || minuteOfDay < end;
};

const applyQuietHours = (candidateUtc, quietHours, timeZone) => {
  if (!quietHours) return candidateUtc;

  let adjusted = candidateUtc;
  for (let i = 0; i < 4; i += 1) {
    const parts = getZonedParts(adjusted, timeZone);
    const minuteOfDay = (parts.hour * 60) + parts.minute;
    if (!isInQuietWindow(minuteOfDay, quietHours)) return adjusted;

    const crossesMidnight = quietHours.start.minutesOfDay >= quietHours.end.minutesOfDay;
    const needsNextDay = crossesMidnight && minuteOfDay >= quietHours.start.minutesOfDay;
    const targetDate = needsNextDay ? addLocalDays(parts, 1) : parts;

    adjusted = zonedDateTimeToUtc({
      year: targetDate.year,
      month: targetDate.month,
      day: targetDate.day,
      hour: quietHours.end.hour,
      minute: quietHours.end.minute,
      second: 0
    }, timeZone);
  }

  return adjusted;
};

const getNextDailyCandidate = ({ now, dailyTime, timeZone }) => {
  const nowLocal = getZonedParts(now, timeZone);
  const todayCandidate = zonedDateTimeToUtc({
    year: nowLocal.year,
    month: nowLocal.month,
    day: nowLocal.day,
    hour: dailyTime.hour,
    minute: dailyTime.minute,
    second: 0
  }, timeZone);

  if (todayCandidate > now) return todayCandidate;

  const tomorrow = addLocalDays(nowLocal, 1);
  return zonedDateTimeToUtc({
    year: tomorrow.year,
    month: tomorrow.month,
    day: tomorrow.day,
    hour: dailyTime.hour,
    minute: dailyTime.minute,
    second: 0
  }, timeZone);
};

const getNextFixedTimesCandidate = ({ now, fixedTimes, timeZone }) => {
  if (!Array.isArray(fixedTimes) || fixedTimes.length === 0) {
    throw new TypeError("fixedTimes must contain at least one HH:mm slot");
  }

  const slots = fixedTimes
    .map((slot) => parseClock(slot, "fixedTimes"))
    .sort((a, b) => a.minutesOfDay - b.minutesOfDay);
  const nowLocal = getZonedParts(now, timeZone);

  for (const slot of slots) {
    const candidate = zonedDateTimeToUtc({
      year: nowLocal.year,
      month: nowLocal.month,
      day: nowLocal.day,
      hour: slot.hour,
      minute: slot.minute,
      second: 0
    }, timeZone);
    if (candidate > now) return candidate;
  }

  const tomorrow = addLocalDays(nowLocal, 1);
  const firstSlot = slots[0];
  return zonedDateTimeToUtc({
    year: tomorrow.year,
    month: tomorrow.month,
    day: tomorrow.day,
    hour: firstSlot.hour,
    minute: firstSlot.minute,
    second: 0
  }, timeZone);
};

const resolveMode = (mode) => {
  const normalized = typeof mode === "string" ? mode.trim().toLowerCase() : "";
  if (!normalized || normalized === PUSH_MODES.IMMEDIATE) return PUSH_MODES.IMMEDIATE;
  if (normalized === PUSH_MODES.FIXED_TIMES || normalized === "fixed") return PUSH_MODES.FIXED_TIMES;
  if (normalized === PUSH_MODES.DAILY) return PUSH_MODES.DAILY;
  throw new TypeError(`Unsupported push mode: ${mode}`);
};

const resolvePushSchedule = (options = {}) => {
  const now = toDate(options.now);
  const mode = resolveMode(options.mode);
  const timeZone = normalizeTimeZone(options.timeZone);
  const quietHours = parseQuietHours(options.quietHours);

  let scheduledFor = now;
  if (mode === PUSH_MODES.DAILY) {
    const dailyTime = parseClock(options.dailyTime, "dailyTime");
    scheduledFor = getNextDailyCandidate({ now, dailyTime, timeZone });
  } else if (mode === PUSH_MODES.FIXED_TIMES) {
    scheduledFor = getNextFixedTimesCandidate({ now, fixedTimes: options.fixedTimes, timeZone });
  }

  scheduledFor = applyQuietHours(scheduledFor, quietHours, timeZone);

  return {
    mode,
    timeZone,
    scheduledFor: scheduledFor.toISOString(),
    deliverNow: scheduledFor.getTime() <= now.getTime()
  };
};

module.exports = {
  PUSH_MODES,
  resolvePushSchedule
};
