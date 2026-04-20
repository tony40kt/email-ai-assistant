"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { REDACTED, maskEmail, maskValue, redactObject, createLogger } = require("./logger");

test("maskEmail masks local part while preserving domain", () => {
  assert.equal(maskEmail("user@example.com"), "us***@example.com");
  assert.equal(maskEmail("a@example.com"), "a***@example.com");
});

test("maskEmail returns REDACTED for invalid email format", () => {
  assert.equal(maskEmail("notanemail"), REDACTED);
  assert.equal(maskEmail("@domain.com"), REDACTED);
});

test("maskValue redacts access_token keys", () => {
  assert.equal(maskValue("access_token", "eyJsomeLongToken"), REDACTED);
  assert.equal(maskValue("accessToken", "eyJsomeLongToken"), REDACTED);
});

test("maskValue redacts refresh_token keys", () => {
  assert.equal(maskValue("refresh_token", "rt_abc123"), REDACTED);
  assert.equal(maskValue("refreshToken", "rt_abc123"), REDACTED);
});

test("maskValue redacts secret and password keys", () => {
  assert.equal(maskValue("client_secret", "my_secret"), REDACTED);
  assert.equal(maskValue("password", "hunter2"), REDACTED);
  assert.equal(maskValue("service_role", "role_key"), REDACTED);
});

test("maskValue masks email-like string values", () => {
  const result = maskValue("sender", "john@example.com");
  assert.ok(result.includes("***"));
  assert.ok(result.includes("@example.com"));
});

test("maskValue passes through non-sensitive string values", () => {
  assert.equal(maskValue("module", "mail-sync"), "mail-sync");
  assert.equal(maskValue("status", "200"), "200");
});

test("redactObject redacts sensitive keys in nested objects", () => {
  const obj = {
    user: "alice",
    credentials: {
      access_token: "tok_abc",
      refresh_token: "rt_xyz"
    },
    meta: { module: "auth" }
  };

  const redacted = redactObject(obj);

  assert.equal(redacted.user, "alice");
  assert.equal(redacted.credentials.access_token, REDACTED);
  assert.equal(redacted.credentials.refresh_token, REDACTED);
  assert.equal(redacted.meta.module, "auth");
});

test("redactObject handles arrays", () => {
  const result = redactObject([{ access_token: "tok" }, { module: "sync" }]);
  assert.equal(result[0].access_token, REDACTED);
  assert.equal(result[1].module, "sync");
});

test("createLogger does not throw for info log with sensitive meta", () => {
  const captured = [];
  const logger = createLogger({ output: (entry) => captured.push(entry) });

  logger.info("User logged in", { access_token: "tok_secret", email: "user@test.com" });

  assert.equal(captured.length, 1);
  assert.equal(captured[0].access_token, REDACTED);
  assert.ok(captured[0].email.includes("***"));
});

test("createLogger respects log level filtering", () => {
  const captured = [];
  const logger = createLogger({ level: "warn", output: (entry) => captured.push(entry) });

  logger.debug("debug msg");
  logger.info("info msg");
  logger.warn("warn msg");
  logger.error("error msg");

  assert.equal(captured.length, 2);
  assert.equal(captured[0].level, "warn");
  assert.equal(captured[1].level, "error");
});
