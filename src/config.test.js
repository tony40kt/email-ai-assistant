"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ConfigError, loadConfig, loadPublicConfig, assertNoFrontendSecrets } = require("./config");

const FULL_ENV = {
  NODE_ENV: "test",
  APP_BASE_URL: "http://localhost:19006",
  API_BASE_URL: "http://localhost:3000",
  GMAIL_CLIENT_ID: "test_client_id",
  GMAIL_CLIENT_SECRET: "test_client_secret",
  GMAIL_REDIRECT_URI: "http://localhost:3000/auth/google/callback",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "test_anon_key",
  SUPABASE_SERVICE_ROLE_KEY: "test_service_role_key",
  LIBRETRANSLATE_API_URL: "https://translate.example.com/translate",
  LIBRETRANSLATE_API_KEY: "test_translate_key"
};

test("loadConfig returns structured config for complete env", () => {
  const config = loadConfig(FULL_ENV);

  assert.equal(config.nodeEnv, "test");
  assert.equal(config.gmail.clientId, "test_client_id");
  assert.equal(config.gmail.clientSecret, "test_client_secret");
  assert.equal(config.gmail.redirectUri, "http://localhost:3000/auth/google/callback");
  assert.equal(config.supabase.url, "https://test.supabase.co");
  assert.equal(config.supabase.anonKey, "test_anon_key");
  assert.equal(config.supabase.serviceRoleKey, "test_service_role_key");
  assert.equal(config.libretranslate.apiUrl, "https://translate.example.com/translate");
});

test("loadConfig throws ConfigError when required keys are missing", () => {
  const incomplete = { ...FULL_ENV };
  delete incomplete.GMAIL_CLIENT_ID;
  delete incomplete.SUPABASE_SERVICE_ROLE_KEY;

  assert.throws(
    () => loadConfig(incomplete),
    (error) => {
      assert.ok(error instanceof ConfigError);
      assert.ok(error.message.includes("GMAIL_CLIENT_ID"));
      assert.ok(error.message.includes("SUPABASE_SERVICE_ROLE_KEY"));
      return true;
    }
  );
});

test("loadConfig throws ConfigError when env is empty", () => {
  assert.throws(() => loadConfig({}), ConfigError);
});

test("loadPublicConfig returns only public fields without secrets", () => {
  const config = loadPublicConfig(FULL_ENV);

  assert.equal(config.nodeEnv, "test");
  assert.ok(!Object.prototype.hasOwnProperty.call(config, "gmail"));
  assert.ok(!Object.prototype.hasOwnProperty.call(config, "supabase"));
  assert.ok(!Object.prototype.hasOwnProperty.call(config, "SUPABASE_SERVICE_ROLE_KEY"));
});

test("loadPublicConfig uses defaults when optional vars are absent", () => {
  const config = loadPublicConfig({});
  assert.equal(config.nodeEnv, "development");
  assert.equal(config.appBaseUrl, "http://localhost:19006");
  assert.equal(config.apiBaseUrl, "http://localhost:3000");
});

test("assertNoFrontendSecrets throws when SUPABASE_SERVICE_ROLE_KEY is present", () => {
  assert.throws(
    () => assertNoFrontendSecrets({ SUPABASE_SERVICE_ROLE_KEY: "secret" }),
    ConfigError
  );
});

test("assertNoFrontendSecrets does not throw for safe objects", () => {
  assert.doesNotThrow(() => assertNoFrontendSecrets({ nodeEnv: "production" }));
});
