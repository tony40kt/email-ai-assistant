"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_GMAIL_SCOPES,
  GMAIL_READONLY_SCOPE,
  createGoogleOAuthProvider,
  createOAuthService,
  createOutlookOAuthProvider,
  createSafeLogger,
  createSecureSessionStore
} = require("./oauth-login");

const createMemorySecureStore = () => {
  const db = new Map();
  return {
    setItemAsync: async (key, value) => db.set(key, value),
    getItemAsync: async (key) => db.get(key) || null,
    deleteItemAsync: async (key) => db.delete(key)
  };
};

test("google provider builds OAuth URL with required Gmail readonly scope", () => {
  const provider = createGoogleOAuthProvider({
    clientId: "client-id",
    redirectUri: "myapp://oauth/callback"
  });

  const authorizeUrl = provider.buildAuthorizeUrl({
    state: "state-1",
    codeChallenge: "pkce-challenge"
  });
  const parsed = new URL(authorizeUrl);
  const scopes = parsed.searchParams.get("scope").split(" ");

  assert.equal(parsed.origin + parsed.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(parsed.searchParams.get("client_id"), "client-id");
  assert.equal(parsed.searchParams.get("response_type"), "code");
  assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
  assert.equal(parsed.searchParams.get("state"), "state-1");
  assert.ok(scopes.includes(GMAIL_READONLY_SCOPE));
  assert.deepEqual(scopes, DEFAULT_GMAIL_SCOPES);
});

test("oauth service exposes traditional chinese login content and outlook placeholder", async () => {
  const service = createOAuthService({
    providers: {
      gmail: createGoogleOAuthProvider({
        clientId: "client-id",
        redirectUri: "myapp://oauth/callback",
        exchangeCode: async () => ({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          scope: GMAIL_READONLY_SCOPE
        })
      }),
      outlook: createOutlookOAuthProvider()
    },
    sessionStore: createSecureSessionStore({ secureStore: createMemorySecureStore() })
  });

  const content = service.getLoginContent();
  const startOutlook = service.startLogin({
    provider: "outlook",
    state: "placeholder",
    codeChallenge: "placeholder"
  });

  assert.equal(content.title, "連接你的信箱");
  assert.equal(content.primaryAction, "使用 Gmail 登入");
  assert.equal(content.secondaryAction, "使用 Outlook 登入（即將推出）");
  assert.equal(startOutlook.authorizeUrl, "#outlook-coming-soon");
});

test("completeLogin keeps refresh token out of frontend session and logs", async () => {
  const secureStore = createMemorySecureStore();
  const tokenVaultCalls = [];
  const loggerCalls = [];
  const baseLogger = {
    info: (message, metadata) => loggerCalls.push({ level: "info", message, metadata })
  };

  const service = createOAuthService({
    providers: {
      gmail: createGoogleOAuthProvider({
        clientId: "client-id",
        redirectUri: "myapp://oauth/callback",
        exchangeCode: async () => ({
          accessToken: "access-123",
          refreshToken: "refresh-123",
          accountEmail: "user@example.com",
          scope: `${GMAIL_READONLY_SCOPE} openid`
        })
      })
    },
    tokenVault: {
      saveProviderToken: async (payload) => {
        tokenVaultCalls.push(payload);
      }
    },
    sessionStore: createSecureSessionStore({ secureStore }),
    logger: createSafeLogger(baseLogger)
  });

  const result = await service.completeLogin({
    provider: "gmail",
    code: "oauth-code",
    codeVerifier: "pkce-verifier"
  });

  const savedSession = JSON.parse(await secureStore.getItemAsync("oauth.session"));
  const logPayload = loggerCalls[0].metadata;

  assert.equal(result.mailReadGranted, true);
  assert.equal(savedSession.provider, "gmail");
  assert.equal(savedSession.accountEmail, "user@example.com");
  assert.deepEqual(savedSession.grantedScopes, [GMAIL_READONLY_SCOPE, "openid"]);
  assert.equal(savedSession.refreshToken, undefined);
  assert.equal(savedSession.accessToken, undefined);
  assert.equal(tokenVaultCalls[0].refreshToken, "refresh-123");
  assert.equal(logPayload.provider, "gmail");
  assert.equal(logPayload.accountEmail, "user@example.com");
  assert.equal(logPayload.accessToken, undefined);
  assert.equal(logPayload.refreshToken, undefined);
});

test("safe logger redacts sensitive token fields", () => {
  const calls = [];
  const logger = createSafeLogger({
    info: (message, metadata) => calls.push({ message, metadata })
  });

  logger.info("test", {
    accessToken: "a",
    nested: {
      refreshToken: "b",
      authorizationCode: "c"
    }
  });

  assert.equal(calls[0].metadata.accessToken, "[REDACTED]");
  assert.equal(calls[0].metadata.nested.refreshToken, "[REDACTED]");
  assert.equal(calls[0].metadata.nested.authorizationCode, "[REDACTED]");
});

test("completeLogin rejects Gmail OAuth response without readonly mail scope", async () => {
  const service = createOAuthService({
    providers: {
      gmail: createGoogleOAuthProvider({
        clientId: "client-id",
        redirectUri: "myapp://oauth/callback",
        exchangeCode: async () => ({
          accessToken: "access-token",
          scope: "openid email profile"
        })
      })
    },
    sessionStore: createSecureSessionStore({ secureStore: createMemorySecureStore() })
  });

  await assert.rejects(
    () => service.completeLogin({ provider: "gmail", code: "oauth-code" }),
    /Gmail OAuth 缺少郵件讀取權限/
  );
});
