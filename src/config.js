"use strict";

/**
 * PR #29 – 環境變數與 Secrets 設定模組
 *
 * 讀取所有定義在 .env.example 的環境變數並進行必要欄位驗證。
 * 後端啟動時如缺少必要金鑰，即拋出 ConfigError 阻止啟動。
 */

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}

const REQUIRED_BACKEND_KEYS = [
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REDIRECT_URI",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
];

const OPTIONAL_KEYS = [
  "NODE_ENV",
  "APP_BASE_URL",
  "API_BASE_URL",
  "LIBRETRANSLATE_API_URL",
  "LIBRETRANSLATE_API_KEY"
];

const FRONTEND_FORBIDDEN_KEYS = new Set(["SUPABASE_SERVICE_ROLE_KEY"]);

const loadConfig = (env = process.env) => {
  const missing = REQUIRED_BACKEND_KEYS.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required environment variables: ${missing.join(", ")}. ` +
      "Please copy .env.example to .env and fill in the values."
    );
  }

  return {
    nodeEnv: env.NODE_ENV || "development",
    appBaseUrl: env.APP_BASE_URL || "http://localhost:19006",
    apiBaseUrl: env.API_BASE_URL || "http://localhost:3000",

    gmail: {
      clientId: env.GMAIL_CLIENT_ID,
      clientSecret: env.GMAIL_CLIENT_SECRET,
      redirectUri: env.GMAIL_REDIRECT_URI
    },

    supabase: {
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
    },

    libretranslate: {
      apiUrl: env.LIBRETRANSLATE_API_URL || null,
      apiKey: env.LIBRETRANSLATE_API_KEY || null
    }
  };
};

/**
 * Returns a client-safe subset of config (omits all backend-only secrets).
 * SUPABASE_SERVICE_ROLE_KEY and other high-privilege keys are never included.
 */
const loadPublicConfig = (env = process.env) => {
  return {
    nodeEnv: env.NODE_ENV || "development",
    appBaseUrl: env.APP_BASE_URL || "http://localhost:19006",
    apiBaseUrl: env.API_BASE_URL || "http://localhost:3000"
  };
};

const assertNoFrontendSecrets = (configObject) => {
  for (const key of FRONTEND_FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(configObject, key)) {
      throw new ConfigError(
        `${key} must never be exposed to frontend or client-side code.`
      );
    }
  }
};

module.exports = {
  ConfigError,
  REQUIRED_BACKEND_KEYS,
  OPTIONAL_KEYS,
  loadConfig,
  loadPublicConfig,
  assertNoFrontendSecrets
};
