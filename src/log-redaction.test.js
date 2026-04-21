"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { REDACTED, sanitizeLogValue } = require("./log-redaction");

test("sanitizeLogValue redacts sensitive credential keys", () => {
  const input = {
    accessToken: "abc",
    refresh_token: "def",
    apiKey: "ghi",
    nested: {
      authorization: "Bearer raw-token",
      password: "pass"
    }
  };

  const sanitized = sanitizeLogValue(input);

  assert.equal(sanitized.accessToken, REDACTED);
  assert.equal(sanitized.refresh_token, REDACTED);
  assert.equal(sanitized.apiKey, REDACTED);
  assert.equal(sanitized.nested.authorization, REDACTED);
  assert.equal(sanitized.nested.password, REDACTED);
});

test("sanitizeLogValue masks emails and token-like string segments", () => {
  const input = "request failed for user alice@example.com with header Bearer abc.def.ghi and path /cb?access_token=12345";

  const sanitized = sanitizeLogValue(input);

  assert.equal(sanitized.includes("alice@example.com"), false);
  assert.equal(sanitized.includes("a***@example.com"), true);
  assert.equal(sanitized.includes("Bearer [REDACTED]"), true);
  assert.equal(sanitized.includes("access_token=[REDACTED]"), true);
});

test("sanitizeLogValue keeps non-sensitive values", () => {
  const input = {
    module: "mail-sync",
    retry: 2,
    tags: ["sync", "network"]
  };

  const sanitized = sanitizeLogValue(input);

  assert.deepEqual(sanitized, input);
});
