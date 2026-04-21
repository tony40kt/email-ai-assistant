"use strict";

const DEFAULT_TRANSLATION_ERROR_MESSAGE = "翻譯失敗，請稍後再試。";

class TranslationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "TranslationError";
    this.retryable = Boolean(options.retryable);
    this.userMessage = options.userMessage || DEFAULT_TRANSLATION_ERROR_MESSAGE;
    this.cause = options.cause;
    this.status = options.status || null;
  }
}

const isRetryableError = (error) => (
  Boolean(error)
  && (error.name === "AbortError" || error.code === "ETIMEDOUT" || error.code === "ECONNRESET")
);

const isRetryableStatus = (status) => status >= 500 && status < 600;

const withTimeout = async (task, timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return task(undefined);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

const translateText = async ({
  text,
  apiUrl,
  apiKey,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
  maxRetries = 1
}) => {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new TypeError("text must be a non-empty string");
  }
  if (typeof apiUrl !== "string" || apiUrl.trim().length === 0) {
    throw new TypeError("apiUrl must be a non-empty string");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetchImpl must be a function");
  }

  let attempts = 0;
  while (attempts <= maxRetries) {
    try {
      const response = await withTimeout(
        (signal) => fetchImpl(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            source: "en",
            target: "zh-Hant",
            format: "text",
            ...(apiKey ? { api_key: apiKey } : {})
          }),
          signal
        }),
        timeoutMs
      );

      if (!response?.ok) {
        const retryable = isRetryableStatus(response?.status || 0);
        throw new TranslationError("Translation request failed", {
          retryable,
          status: response?.status || null
        });
      }

      const data = await response.json();
      const translatedText = data?.translatedText;
      if (typeof translatedText !== "string") {
        throw new TranslationError("Invalid translation response", { retryable: false });
      }

      return translatedText;
    } catch (error) {
      const known = error instanceof TranslationError;
      const retryable = known ? error.retryable : isRetryableError(error);
      if (!retryable || attempts === maxRetries) {
        throw known
          ? error
          : new TranslationError("Translation failed", { retryable, cause: error });
      }
      attempts += 1;
    }
  }

  throw new TranslationError("Translation failed", { retryable: true });
};

module.exports = {
  DEFAULT_TRANSLATION_ERROR_MESSAGE,
  TranslationError,
  translateText
};
