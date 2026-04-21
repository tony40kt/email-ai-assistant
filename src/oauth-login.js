"use strict";

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const DEFAULT_GMAIL_SCOPES = [GMAIL_READONLY_SCOPE, "openid", "email", "profile"];
const IOS_OAUTH_LOGIN_CONTENT = {
  title: "連接你的信箱",
  description: "請選擇郵件服務並完成授權，我們只會在你授權的範圍內讀取郵件。",
  primaryAction: "使用 Gmail 登入",
  secondaryAction: "使用 Outlook 登入（即將推出）",
  securityHints: ["不會在前端日誌顯示 OAuth Token", "你可隨時撤銷授權"]
};
const SENSITIVE_KEY_PATTERN = /(token|authorization|code|secret)/i;

const redactForLogs = (value, key = "", seen = new WeakSet()) => {
  if (SENSITIVE_KEY_PATTERN.test(key)) return "[REDACTED]";
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactForLogs(item, "", seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      redactForLogs(entryValue, entryKey, seen)
    ])
  );
};

const normalizeScopes = (scopeValue) => {
  if (Array.isArray(scopeValue)) return scopeValue.map(String).filter(Boolean);
  if (typeof scopeValue !== "string") return [];
  return scopeValue.split(/\s+/).map((scope) => scope.trim()).filter(Boolean);
};

const createSafeLogger = (baseLogger = console) => {
  const call = (level, message, metadata = {}) => {
    const writer = typeof baseLogger[level] === "function" ? baseLogger[level] : baseLogger.log;
    writer.call(baseLogger, message, redactForLogs(metadata));
  };

  return {
    debug: (message, metadata) => call("debug", message, metadata),
    info: (message, metadata) => call("info", message, metadata),
    warn: (message, metadata) => call("warn", message, metadata),
    error: (message, metadata) => call("error", message, metadata)
  };
};

const createSecureSessionStore = ({
  secureStore,
  storageKey = "oauth.session",
  maxSessionTtlMs = 15 * 60 * 1000,
  now = () => Date.now()
}) => {
  if (!secureStore) throw new TypeError("secureStore is required");
  const setItem = secureStore.setItemAsync || secureStore.setItem;
  const getItem = secureStore.getItemAsync || secureStore.getItem;
  const removeItem = secureStore.deleteItemAsync || secureStore.removeItem;
  if (![setItem, getItem, removeItem].every((method) => typeof method === "function")) {
    throw new TypeError("secureStore must provide set/get/remove methods");
  }

  return {
    save: async ({ provider, accountEmail, grantedScopes = [], expiresAt } = {}) => {
      const expiresAtMs = expiresAt ? Date.parse(expiresAt) : (now() + maxSessionTtlMs);
      const session = {
        provider: String(provider || ""),
        accountEmail: String(accountEmail || ""),
        grantedScopes: normalizeScopes(grantedScopes),
        expiresAt: new Date(expiresAtMs).toISOString()
      };
      await setItem.call(secureStore, storageKey, JSON.stringify(session));
      return session;
    },
    load: async () => {
      const raw = await getItem.call(secureStore, storageKey);
      if (!raw) return null;
      const session = JSON.parse(raw);
      const expiresAtMs = Date.parse(session.expiresAt);
      if (Number.isFinite(expiresAtMs) && expiresAtMs <= now()) {
        await removeItem.call(secureStore, storageKey);
        return null;
      }
      return session;
    },
    clear: async () => {
      await removeItem.call(secureStore, storageKey);
    }
  };
};

const createGoogleOAuthProvider = ({
  clientId,
  redirectUri,
  scopes = DEFAULT_GMAIL_SCOPES,
  authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth",
  exchangeCode,
  refreshToken,
  fetchMail
} = {}) => {
  if (!clientId) throw new TypeError("Google OAuth clientId is required");
  if (!redirectUri) throw new TypeError("Google OAuth redirectUri is required");

  return {
    provider: "gmail",
    buildAuthorizeUrl: ({ state, codeChallenge, redirectUri: customRedirectUri } = {}) => {
      if (!state) throw new TypeError("state is required");
      if (!codeChallenge) throw new TypeError("codeChallenge is required");
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: customRedirectUri || redirectUri,
        response_type: "code",
        scope: normalizeScopes(scopes).join(" "),
        access_type: "offline",
        prompt: "consent",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state
      });
      return `${authorizationEndpoint}?${params.toString()}`;
    },
    exchangeCode: async (params) => {
      if (typeof exchangeCode !== "function") throw new Error("Google OAuth exchangeCode is not configured");
      return exchangeCode(params);
    },
    refreshToken: async (params) => {
      if (typeof refreshToken !== "function") throw new Error("Google OAuth refreshToken is not configured");
      return refreshToken(params);
    },
    fetchMail: async (params) => {
      if (typeof fetchMail !== "function") throw new Error("Google OAuth fetchMail is not configured");
      return fetchMail(params);
    }
  };
};

const createOutlookOAuthProvider = (overrides = {}) => {
  const notReady = async () => {
    throw new Error("Outlook OAuth 尚未啟用");
  };

  return {
    provider: "outlook",
    buildAuthorizeUrl: overrides.buildAuthorizeUrl || (() => "#outlook-coming-soon"),
    exchangeCode: overrides.exchangeCode || notReady,
    refreshToken: overrides.refreshToken || notReady,
    fetchMail: overrides.fetchMail || notReady
  };
};

const createOAuthService = ({
  providers,
  tokenVault = {},
  sessionStore,
  logger = createSafeLogger(console)
} = {}) => {
  if (!providers || typeof providers !== "object") throw new TypeError("providers is required");
  if (!sessionStore || typeof sessionStore.save !== "function") throw new TypeError("sessionStore is required");

  const getProvider = (name) => {
    const provider = providers[name];
    if (!provider) throw new Error(`Unsupported OAuth provider: ${name}`);
    return provider;
  };

  return {
    getLoginContent: () => ({ ...IOS_OAUTH_LOGIN_CONTENT }),
    startLogin: ({ provider = "gmail", state, codeChallenge, redirectUri } = {}) => ({
      provider,
      authorizeUrl: getProvider(provider).buildAuthorizeUrl({ state, codeChallenge, redirectUri })
    }),
    completeLogin: async ({ provider = "gmail", code, codeVerifier, redirectUri } = {}) => {
      const oauthProvider = getProvider(provider);
      const exchanged = await oauthProvider.exchangeCode({ code, codeVerifier, redirectUri });
      const grantedScopes = normalizeScopes(exchanged.scope || exchanged.scopes);

      if (provider === "gmail" && !grantedScopes.includes(GMAIL_READONLY_SCOPE)) {
        throw new Error("Gmail OAuth 缺少郵件讀取權限");
      }

      if (typeof tokenVault.saveProviderToken === "function") {
        await tokenVault.saveProviderToken({
          provider,
          accessToken: exchanged.accessToken || null,
          refreshToken: exchanged.refreshToken || null,
          scope: grantedScopes,
          expiresIn: exchanged.expiresIn || null
        });
      }

      const session = await sessionStore.save({
        provider,
        accountEmail: exchanged.accountEmail,
        grantedScopes,
        expiresAt: exchanged.expiresAt
      });

      logger.info("OAuth login success", {
        provider,
        accountEmail: exchanged.accountEmail,
        grantedScopes
      });

      return {
        provider,
        mailReadGranted: provider !== "gmail" || grantedScopes.includes(GMAIL_READONLY_SCOPE),
        session
      };
    }
  };
};

module.exports = {
  DEFAULT_GMAIL_SCOPES,
  GMAIL_READONLY_SCOPE,
  IOS_OAUTH_LOGIN_CONTENT,
  createGoogleOAuthProvider,
  createOAuthService,
  createOutlookOAuthProvider,
  createSafeLogger,
  createSecureSessionStore
};
