"use strict";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_MAX_PAGES_PER_SYNC = 4;
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_ERROR_CODES = new Set(["ETIMEDOUT", "ECONNRESET"]);

class MailSyncError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MailSyncError";
    this.retryable = Boolean(options.retryable);
    this.userMessage = options.userMessage || "郵件同步失敗，請稍後重試。";
    this.cause = options.cause;
  }
}

const asArray = (value) => Array.isArray(value) ? value : [];

const mapEmailModel = (source = {}) => ({
  id: String(source.id || ""),
  sender: String(source.sender || source.from || ""),
  recipients: asArray(source.recipients || source.to).map((v) => String(v)),
  subject: String(source.subject || ""),
  isRead: Boolean(source.isRead ?? source.read),
  receivedAt: source.receivedAt || source.date || null
});

const isRetryableError = (error) => Boolean(error && (error.retryable || RETRYABLE_ERROR_CODES.has(error.code)));

const syncEmails = async ({
  fetchPage,
  storage,
  pageSize = DEFAULT_PAGE_SIZE,
  maxPagesPerSync = DEFAULT_MAX_PAGES_PER_SYNC,
  maxRetries = DEFAULT_MAX_RETRIES
}) => {
  if (typeof fetchPage !== "function") {
    throw new TypeError("fetchPage must be a function");
  }
  if (!storage || typeof storage.loadState !== "function" || typeof storage.saveState !== "function" || typeof storage.saveEmails !== "function") {
    throw new TypeError("storage must provide loadState/saveState/saveEmails");
  }

  const state = await storage.loadState();
  const syncState = state || {};
  const since = syncState.lastSyncToken || syncState.lastSyncedAt || null;
  let cursor = null;
  let pagesLoaded = 0;
  let totalEmails = 0;
  let latestSyncToken = since;

  while (pagesLoaded < maxPagesPerSync) {
    let response;
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        response = await fetchPage({ cursor, since, pageSize });
        break;
      } catch (error) {
        if (!isRetryableError(error) || attempts === maxRetries) {
          throw new MailSyncError("Mail sync request failed", {
            retryable: isRetryableError(error),
            userMessage: "同步失敗，請檢查網路後重試。",
            cause: error
          });
        }
        attempts += 1;
      }
    }

    const mappedEmails = asArray(response?.emails).map(mapEmailModel);
    if (mappedEmails.length > 0) {
      await storage.saveEmails(mappedEmails);
      totalEmails += mappedEmails.length;
    }

    pagesLoaded += 1;
    cursor = response?.nextCursor || null;
    latestSyncToken = response?.syncToken || latestSyncToken;

    if (!cursor) {
      break;
    }
  }

  const syncCompletedAt = new Date().toISOString();
  const incrementalCursor = latestSyncToken || syncCompletedAt;
  await storage.saveState({
    lastSyncToken: incrementalCursor,
    lastSyncedAt: syncCompletedAt
  });

  return {
    totalEmails,
    pagesLoaded,
    hasMore: Boolean(cursor),
    lastSyncToken: incrementalCursor
  };
};

module.exports = {
  MailSyncError,
  mapEmailModel,
  syncEmails
};
