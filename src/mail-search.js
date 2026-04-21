"use strict";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_EMPTY_MESSAGE = "找不到符合條件的郵件。請調整篩選條件或關鍵字。";
const DEFAULT_SEARCH_ERROR_MESSAGE = "搜尋失敗，請稍後再試。";

class MailSearchError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MailSearchError";
    this.userMessage = options.userMessage || DEFAULT_SEARCH_ERROR_MESSAGE;
    this.cause = options.cause;
  }
}

const asArray = (value) => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const toTimestamp = (value) => {
  if (!value) return null;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
};

const includesKeyword = (email, keyword) => {
  if (!keyword) return true;
  const subject = normalizeText(email?.subject);
  const body = normalizeText(email?.body);
  return subject.includes(keyword) || body.includes(keyword);
};

const matchesFilters = (email, filters = {}, keyword) => {
  const senderFilter = normalizeText(filters.sender);
  const labelFilter = normalizeText(filters.label);
  const fromTs = toTimestamp(filters.dateFrom);
  const toTs = toTimestamp(filters.dateTo);
  const receivedTs = toTimestamp(email?.receivedAt || email?.date);

  if (senderFilter && !normalizeText(email?.sender || email?.from).includes(senderFilter)) return false;
  if (labelFilter) {
    const labels = asArray(email?.labels).map(normalizeText).filter(Boolean);
    if (!labels.includes(labelFilter)) return false;
  }
  if (typeof filters.isRead === "boolean" && Boolean(email?.isRead) !== filters.isRead) return false;
  if (fromTs !== null && (receivedTs === null || receivedTs < fromTs)) return false;
  if (toTs !== null && (receivedTs === null || receivedTs > toTs)) return false;

  return includesKeyword(email, keyword);
};

const compareEmails = (a, b, sortBy, sortOrder) => {
  const direction = sortOrder === "asc" ? 1 : -1;
  const fieldA = sortBy === "sender"
    ? normalizeText(a?.sender || a?.from)
    : sortBy === "subject"
      ? normalizeText(a?.subject)
      : toTimestamp(a?.receivedAt || a?.date) ?? Number.NEGATIVE_INFINITY;
  const fieldB = sortBy === "sender"
    ? normalizeText(b?.sender || b?.from)
    : sortBy === "subject"
      ? normalizeText(b?.subject)
      : toTimestamp(b?.receivedAt || b?.date) ?? Number.NEGATIVE_INFINITY;

  if (fieldA < fieldB) return -1 * direction;
  if (fieldA > fieldB) return 1 * direction;
  return (a.__index - b.__index);
};

function searchEmails({
  emails,
  filters = {},
  keyword = "",
  sortBy = "receivedAt",
  sortOrder = "desc",
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
} = {}) {
  if (!Array.isArray(emails)) {
    throw new MailSearchError("emails must be an array", {
      userMessage: "搜尋條件格式錯誤，請重新整理頁面後再試。"
    });
  }
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1) {
    throw new MailSearchError("invalid pagination options", {
      userMessage: "分頁參數錯誤，請重新設定後再試。"
    });
  }

  try {
    const normalizedKeyword = normalizeText(keyword);
    const filtered = emails
      .map((email, index) => ({ ...email, __index: index }))
      .filter((email) => matchesFilters(email, filters, normalizedKeyword))
      .sort((a, b) => compareEmails(a, b, sortBy, sortOrder));

    const total = filtered.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: filtered.slice(start, end).map(({ __index, ...email }) => email),
      total,
      page: safePage,
      pageSize,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
      emptyMessage: total === 0 ? DEFAULT_EMPTY_MESSAGE : null
    };
  } catch (error) {
    if (error instanceof MailSearchError) throw error;
    throw new MailSearchError("unexpected search failure", {
      cause: error
    });
  }
}

module.exports = {
  DEFAULT_EMPTY_MESSAGE,
  DEFAULT_SEARCH_ERROR_MESSAGE,
  MailSearchError,
  searchEmails
};
