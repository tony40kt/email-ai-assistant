"use strict";

const DEFAULT_TRANSLATION_TIMEOUT_MS = 8000;
const DEFAULT_TRANSLATION_MAX_RETRIES = 2;
const DEFAULT_TRANSLATION_RETRY_DELAY_MS = 200;
const DEFAULT_TRANSLATION_ERROR_MESSAGE = "翻譯失敗，請稍後再試。";
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set(["ETIMEDOUT", "ECONNRESET"]);

const TRANSLATE_BUTTON_LABEL = "翻譯";
const RESTORE_ORIGINAL_BUTTON_LABEL = "還原原文";
const TRANSLATION_EXTERNAL_SERVICE_NOTICE = "翻譯可能將內容送至外部服務。";

class EmailTranslationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "EmailTranslationError";
    this.retryable = Boolean(options.retryable);
    this.userMessage = options.userMessage || DEFAULT_TRANSLATION_ERROR_MESSAGE;
    this.status = options.status ?? null;
    this.cause = options.cause;
  }
}

const wait = (delayMs) => new Promise((resolve) => {
  setTimeout(resolve, delayMs);
});

const isAbortError = (error) => Boolean(error && error.name === "AbortError");
const isRetryableError = (error) => Boolean(error && (error.retryable || isAbortError(error) || RETRYABLE_ERROR_CODES.has(error.code)));

const createLibreTranslateClient = ({
  apiUrl,
  apiKey = null,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TRANSLATION_TIMEOUT_MS,
  maxRetries = DEFAULT_TRANSLATION_MAX_RETRIES,
  retryDelayMs = DEFAULT_TRANSLATION_RETRY_DELAY_MS
} = {}) => {
  if (typeof apiUrl !== "string" || apiUrl.trim().length === 0) {
    throw new TypeError("apiUrl is required");
  }
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetchImpl must be a function");
  }

  const endpoint = apiUrl.trim();

  const translateEnglishToTraditionalChinese = async (inputText) => {
    const text = String(inputText || "");
    if (!text.trim()) return "";

    let retries = 0;
    const maxAttempts = maxRetries + 1;
    while (retries < maxAttempts) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            source: "en",
            target: "zh-Hant",
            format: "text",
            ...(apiKey ? { api_key: apiKey } : {})
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const retryable = RETRYABLE_STATUS_CODES.has(response.status);
          if (retryable && retries < maxRetries) {
            retries += 1;
            if (retryDelayMs > 0) await wait(retryDelayMs);
            continue;
          }

          throw new EmailTranslationError("Translation request failed", {
            retryable,
            status: response.status
          });
        }

        const payload = await response.json();
        if (typeof payload?.translatedText !== "string") {
          throw new EmailTranslationError("Translation response missing required translatedText field");
        }
        return payload.translatedText;
      } catch (error) {
        clearTimeout(timeout);
        const retryable = isRetryableError(error);
        if (retryable && retries < maxRetries) {
          retries += 1;
          if (retryDelayMs > 0) await wait(retryDelayMs);
          continue;
        }

        if (error instanceof EmailTranslationError) throw error;
        throw new EmailTranslationError("Translation request failed", {
          retryable,
          cause: error
        });
      }
    }
  };

  return {
    translateEnglishToTraditionalChinese
  };
};

const createEmailDetailTranslationState = (email = {}) => {
  const originalBody = String(email.body || "");

  return {
    originalBody,
    displayedBody: originalBody,
    translatedBody: null,
    isTranslated: false,
    isTranslating: false,
    canRestoreOriginal: false,
    translateButtonLabel: TRANSLATE_BUTTON_LABEL,
    restoreButtonLabel: RESTORE_ORIGINAL_BUTTON_LABEL,
    disclosure: TRANSLATION_EXTERNAL_SERVICE_NOTICE,
    error: null
  };
};

const handleTranslateButtonClick = async ({ state, translate }) => {
  if (!state || typeof state !== "object") {
    throw new TypeError("state is required");
  }
  if (typeof translate !== "function") {
    throw new TypeError("translate must be a function");
  }

  if (state.translatedBody !== null) {
    return {
      ...state,
      displayedBody: state.translatedBody,
      isTranslated: true,
      canRestoreOriginal: true,
      error: null
    };
  }

  const translatedBody = await translate(state.originalBody);

  return {
    ...state,
    displayedBody: translatedBody,
    translatedBody,
    isTranslated: true,
    canRestoreOriginal: true,
    error: null
  };
};

const handleRestoreOriginalClick = (state) => {
  if (!state || typeof state !== "object") {
    throw new TypeError("state is required");
  }

  return {
    ...state,
    displayedBody: state.originalBody,
    isTranslated: false,
    canRestoreOriginal: state.translatedBody !== null
  };
};

module.exports = {
  DEFAULT_TRANSLATION_ERROR_MESSAGE,
  EmailTranslationError,
  TRANSLATION_EXTERNAL_SERVICE_NOTICE,
  createEmailDetailTranslationState,
  createLibreTranslateClient,
  handleRestoreOriginalClick,
  handleTranslateButtonClick
};
