"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { PUSH_MODES, resolvePushSchedule } = require("./notification-scheduler");

test("immediate mode dispatches now when outside quiet hours", () => {
  const now = "2026-04-21T09:00:00.000Z";
  const result = resolvePushSchedule({
    mode: PUSH_MODES.IMMEDIATE,
    now,
    timeZone: "UTC"
  });

  assert.equal(result.deliverNow, true);
  assert.equal(result.scheduledFor, now);
});

test("immediate mode is deferred to quiet-hour end", () => {
  const result = resolvePushSchedule({
    mode: PUSH_MODES.IMMEDIATE,
    now: "2026-04-21T15:30:00.000Z",
    timeZone: "Asia/Taipei",
    quietHours: {
      start: "22:00",
      end: "07:00"
    }
  });

  assert.equal(result.deliverNow, false);
  assert.equal(result.scheduledFor, "2026-04-21T23:00:00.000Z");
});

test("fixed-times mode picks next slot in the same day", () => {
  const result = resolvePushSchedule({
    mode: PUSH_MODES.FIXED_TIMES,
    now: "2026-04-21T00:10:00.000Z",
    timeZone: "UTC",
    fixedTimes: ["12:00", "00:30", "18:30"]
  });

  assert.equal(result.deliverNow, false);
  assert.equal(result.scheduledFor, "2026-04-21T00:30:00.000Z");
});

test("fixed-times mode rolls over to the next day after all slots pass", () => {
  const result = resolvePushSchedule({
    mode: PUSH_MODES.FIXED_TIMES,
    now: "2026-04-21T23:50:00.000Z",
    timeZone: "UTC",
    fixedTimes: ["08:00", "20:00"]
  });

  assert.equal(result.scheduledFor, "2026-04-22T08:00:00.000Z");
});

test("daily mode respects timezone and cross-day behavior", () => {
  const result = resolvePushSchedule({
    mode: PUSH_MODES.DAILY,
    now: "2026-04-21T23:30:00.000Z",
    timeZone: "Asia/Taipei",
    dailyTime: "08:00"
  });

  assert.equal(result.scheduledFor, "2026-04-22T00:00:00.000Z");
});

test("scheduled pushes are also deferred by quiet hours", () => {
  const result = resolvePushSchedule({
    mode: PUSH_MODES.DAILY,
    now: "2026-04-21T20:00:00.000Z",
    timeZone: "UTC",
    dailyTime: "23:00",
    quietHours: {
      start: "22:00",
      end: "07:00"
    }
  });

  assert.equal(result.scheduledFor, "2026-04-22T07:00:00.000Z");
});
