"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { DEFAULT_TRANSLATION_ERROR_MESSAGE, TranslationError, translateText } = require("./translation-service");

test("translateText marks timeout as retryable and fails after retries", async () => {
  let calls = 0;

  await assert.rejects(
    () => translateText({
      text: "Hello",
      apiUrl: "https://example.test/translate",
      timeoutMs: 5,
      maxRetries: 1,
      fetchImpl: async (_url, { signal }) => {
        calls += 1;
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 20);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            const error = new Error("timeout");
            error.name = "AbortError";
            reject(error);
          });
        });
        return { ok: true, json: async () => ({ translatedText: "哈囉" }) };
      }
    }),
    (error) => {
      assert.equal(error instanceof TranslationError, true);
      assert.equal(error.retryable, true);
      assert.equal(error.userMessage, DEFAULT_TRANSLATION_ERROR_MESSAGE);
      return true;
    }
  );

  assert.equal(calls, 2);
});

test("translateText does not retry non-retryable http errors", async () => {
  let calls = 0;

  await assert.rejects(
    () => translateText({
      text: "Hello",
      apiUrl: "https://example.test/translate",
      maxRetries: 2,
      fetchImpl: async () => {
        calls += 1;
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: "bad request" })
        };
      }
    }),
    (error) => {
      assert.equal(error instanceof TranslationError, true);
      assert.equal(error.retryable, false);
      assert.equal(error.status, 400);
      return true;
    }
  );

  assert.equal(calls, 1);
});

test("translateText retries retryable server errors and then succeeds", async () => {
  let calls = 0;

  const result = await translateText({
    text: "Important update",
    apiUrl: "https://example.test/translate",
    maxRetries: 2,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: "temporary unavailable" })
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ translatedText: "重要更新" })
      };
    }
  });

  assert.equal(result, "重要更新");
  assert.equal(calls, 2);
});
