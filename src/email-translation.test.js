"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_TRANSLATION_ERROR_MESSAGE,
  EmailTranslationError,
  TRANSLATION_EXTERNAL_SERVICE_NOTICE,
  createEmailDetailTranslationState,
  createLibreTranslateClient,
  handleRestoreOriginalClick,
  handleTranslateButtonClick
} = require("./email-translation");

test("email detail translation state does not auto translate before button click", () => {
  const state = createEmailDetailTranslationState({
    body: "Please review the attached report."
  });

  assert.equal(state.displayedBody, "Please review the attached report.");
  assert.equal(state.translatedBody, null);
  assert.equal(state.isTranslated, false);
  assert.equal(state.disclosure, TRANSLATION_EXTERNAL_SERVICE_NOTICE);
});

test("translate button click translates and restore button returns original", async () => {
  const initial = createEmailDetailTranslationState({
    body: "Please review the attached report."
  });
  let calls = 0;

  const translated = await handleTranslateButtonClick({
    state: initial,
    translate: async (text) => {
      calls += 1;
      assert.equal(text, "Please review the attached report.");
      return "請查看附件報告。";
    }
  });

  assert.equal(calls, 1);
  assert.equal(translated.displayedBody, "請查看附件報告。");
  assert.equal(translated.isTranslated, true);
  assert.equal(translated.canRestoreOriginal, true);

  const restored = handleRestoreOriginalClick(translated);
  assert.equal(restored.displayedBody, "Please review the attached report.");
  assert.equal(restored.isTranslated, false);
});

test("translate button reuses cached translation instead of sending data again", async () => {
  const state = {
    ...createEmailDetailTranslationState({ body: "Hello world" }),
    translatedBody: "你好，世界",
    displayedBody: "Hello world"
  };
  let calls = 0;

  const translated = await handleTranslateButtonClick({
    state,
    translate: async () => {
      calls += 1;
      return "should-not-run";
    }
  });

  assert.equal(calls, 0);
  assert.equal(translated.displayedBody, "你好，世界");
  assert.equal(translated.isTranslated, true);
});

test("libre translate client calls endpoint with english to traditional chinese payload", async () => {
  const requests = [];
  const client = createLibreTranslateClient({
    apiUrl: "https://example.com/translate",
    apiKey: "k1",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ translatedText: "你好" })
      };
    }
  });

  const result = await client.translateEnglishToTraditionalChinese("Hello");

  assert.equal(result, "你好");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://example.com/translate");
  assert.equal(requests[0].options.method, "POST");
  const payload = JSON.parse(requests[0].options.body);
  assert.equal(payload.source, "en");
  assert.equal(payload.target, "zh-Hant");
  assert.equal(payload.q, "Hello");
  assert.equal(payload.api_key, "k1");
});

test("libre translate client omits api key when not provided", async () => {
  let payload;
  const client = createLibreTranslateClient({
    apiUrl: "https://example.com/translate",
    fetchImpl: async (_url, options) => ({
      ok: true,
      status: 200,
      json: async () => {
        payload = JSON.parse(options.body);
        return { translatedText: "你好" };
      }
    })
  });

  const result = await client.translateEnglishToTraditionalChinese("Hello");
  assert.equal(result, "你好");
  assert.equal(Object.hasOwn(payload, "api_key"), false);
});

test("libre translate client retries timeout-like errors and succeeds", async () => {
  let calls = 0;
  const client = createLibreTranslateClient({
    apiUrl: "https://example.com/translate",
    retryDelayMs: 0,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        const timeoutError = new Error("timeout");
        timeoutError.code = "ETIMEDOUT";
        throw timeoutError;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ translatedText: "重試成功" })
      };
    }
  });

  const result = await client.translateEnglishToTraditionalChinese("Hello");
  assert.equal(result, "重試成功");
  assert.equal(calls, 2);
});

test("libre translate client throws user-safe error when retries are exhausted", async () => {
  const client = createLibreTranslateClient({
    apiUrl: "https://example.com/translate",
    maxRetries: 1,
    retryDelayMs: 0,
    fetchImpl: async () => {
      const timeoutError = new Error("timeout");
      timeoutError.code = "ETIMEDOUT";
      throw timeoutError;
    }
  });

  await assert.rejects(
    () => client.translateEnglishToTraditionalChinese("Hello"),
    (error) => {
      assert.equal(error instanceof EmailTranslationError, true);
      assert.equal(error.retryable, true);
      assert.equal(error.userMessage, DEFAULT_TRANSLATION_ERROR_MESSAGE);
      return true;
    }
  );
});

test("libre translate client throws when retry loop exits without attempts", async () => {
  const client = createLibreTranslateClient({
    apiUrl: "https://example.com/translate",
    maxRetries: -1,
    retryDelayMs: 0,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ translatedText: "不會到達" })
    })
  });

  await assert.rejects(
    () => client.translateEnglishToTraditionalChinese("Hello"),
    (error) => {
      assert.equal(error instanceof EmailTranslationError, true);
      assert.equal(error.retryable, false);
      return true;
    }
  );
});
