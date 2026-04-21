"use strict";

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_MAX_PAGES_PER_SYNC = 4;
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_ERROR_CODES = new Set(["ETIMEDOUT", "ECONNRESET"]);
const RETRYABLE_ERROR_STATUSES = new Set([429]);
const DEFAULT_SYNC_ERROR_MESSAGE = "同步失敗，請檢查網路後重試。";

class MailSyncError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "MailSyncError";
    this.retryable = Boolean(options.retryable);
    this.userMessage = options.userMessage || DEFAULT_SYNC_ERROR_MESSAGE;
    this.cause = options.cause;
  }
}

const asArray = (value) => {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const normalizeRecipient = (recipient) => {
  if (recipient === null || recipient === undefined) {
    return "";
  }
  if (typeof recipient === "object") {
    return String(recipient.email || recipient.address || recipient.value || "");
  }
  return String(recipient);
};

const mapEmailModel = (source = {}) => ({
  id: String(source.id || ""),
  sender: String(source.sender || source.from || ""),
  recipients: asArray(source.recipients || source.to || source.recipient).map(normalizeRecipient).filter(Boolean),
  subject: String(source.subject || ""),
  isRead: Boolean(source.isRead ?? source.read),
  receivedAt: source.receivedAt || source.date || null
});

const isRetryableStatus = (status) => status >= 500 || RETRYABLE_ERROR_STATUSES.has(status);
const isRetryableError = (error) => Boolean(error && (
  error.retryable
  || RETRYABLE_ERROR_CODES.has(error.code)
  || isRetryableStatus(error.status || 0)
));
const hasRequiredStorageMethods = (storage) => (
  storage
  && typeof storage.loadState === "function"
  && typeof storage.saveState === "function"
  && typeof storage.saveEmails === "function"
);

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
  if (!hasRequiredStorageMethods(storage)) {
    throw new TypeError("storage must provide loadState/saveState/saveEmails");
  }

  const state = await storage.loadState();
  const syncState = state || {};
  const sinceMarker = syncState.syncSinceMarker || syncState.lastSyncToken || syncState.lastSyncedAt || null;
  let cursor = syncState.syncCursor || null;
  let pagesLoaded = 0;
  let totalEmails = 0;
  let latestSyncToken = syncState.lastSyncToken || null;

  while (pagesLoaded < maxPagesPerSync) {
    let response;
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        response = await fetchPage({ cursor, since: sinceMarker, pageSize });
        break;
      } catch (error) {
        if (!isRetryableError(error) || attempts === maxRetries) {
          throw new MailSyncError("Mail sync request failed", {
            retryable: isRetryableError(error),
            userMessage: DEFAULT_SYNC_ERROR_MESSAGE,
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

  const hasMore = Boolean(cursor);
  const syncCompletedAt = new Date().toISOString();
  const nextSinceMarker = latestSyncToken || syncCompletedAt;
  const nextState = hasMore
    ? {
        ...syncState,
        syncCursor: cursor,
        syncSinceMarker: sinceMarker
      }
    : {
        ...syncState,
        lastSyncToken: latestSyncToken || null,
        lastSyncedAt: syncCompletedAt,
        syncCursor: null,
        syncSinceMarker: null
      };

  await storage.saveState(nextState);

  return {
    totalEmails,
    pagesLoaded,
    hasMore,
    lastSyncToken: latestSyncToken || null,
    sinceMarker: hasMore ? sinceMarker : nextSinceMarker
  };
};

module.exports = {
  DEFAULT_SYNC_ERROR_MESSAGE,
  MailSyncError,
  mapEmailModel,
  syncEmails
};
