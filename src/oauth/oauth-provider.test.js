"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { GoogleOAuthProvider, GMAIL_SCOPES } = require("./google-oauth-provider");
const { MicrosoftOAuthProvider } = require("./microsoft-oauth-provider");
const { OAuthProvider } = require("./oauth-provider");

const BASE_CONFIG = {
  clientId: "test_client_id",
  clientSecret: "test_client_secret",
  redirectUri: "http://localhost:3000/auth/callback"
};

const makeHttpMock = (responseBody, status = 200) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => responseBody
});

test("OAuthProvider base class throws Not Implemented for all methods", async () => {
  const provider = new OAuthProvider();
  assert.throws(() => provider.buildAuthorizeUrl({}), /not implemented/i);
  await assert.rejects(() => provider.exchangeCode({}), /not implemented/i);
  await assert.rejects(() => provider.refreshToken("rf"), /not implemented/i);
  await assert.rejects(() => provider.fetchMail({}), /not implemented/i);
});

test("GoogleOAuthProvider is an instance of OAuthProvider", () => {
  const provider = new GoogleOAuthProvider({ ...BASE_CONFIG, httpClient: makeHttpMock({}) });
  assert.ok(provider instanceof OAuthProvider);
});

test("GoogleOAuthProvider throws when required config is missing", () => {
  assert.throws(() => new GoogleOAuthProvider({ clientId: "", clientSecret: "s", redirectUri: "r" }), TypeError);
  assert.throws(() => new GoogleOAuthProvider({ clientId: "i", clientSecret: "", redirectUri: "r" }), TypeError);
  assert.throws(() => new GoogleOAuthProvider({ clientId: "i", clientSecret: "s", redirectUri: "" }), TypeError);
});

test("GoogleOAuthProvider.buildAuthorizeUrl includes all required params", () => {
  const provider = new GoogleOAuthProvider({ ...BASE_CONFIG, httpClient: makeHttpMock({}) });
  const url = provider.buildAuthorizeUrl({ state: "csrf123" });

  assert.ok(url.startsWith("https://accounts.google.com/o/oauth2/v2/auth"));
  assert.ok(url.includes("client_id=test_client_id"));
  assert.ok(url.includes("state=csrf123"));
  assert.ok(url.includes("response_type=code"));
  assert.ok(url.includes("access_type=offline"));
});

test("GoogleOAuthProvider.buildAuthorizeUrl includes PKCE params when codeChallenge provided", () => {
  const provider = new GoogleOAuthProvider({ ...BASE_CONFIG, httpClient: makeHttpMock({}) });
  const url = provider.buildAuthorizeUrl({ state: "s", codeChallenge: "challenge_abc" });

  assert.ok(url.includes("code_challenge=challenge_abc"));
  assert.ok(url.includes("code_challenge_method=S256"));
});

test("GoogleOAuthProvider.exchangeCode returns normalized token shape", async () => {
  const provider = new GoogleOAuthProvider({
    ...BASE_CONFIG,
    httpClient: makeHttpMock({
      access_token: "acc_tok",
      refresh_token: "ref_tok",
      expires_in: 3600,
      token_type: "Bearer"
    })
  });

  const result = await provider.exchangeCode({ code: "auth_code" });
  assert.equal(result.accessToken, "acc_tok");
  assert.equal(result.refreshToken, "ref_tok");
  assert.equal(result.expiresIn, 3600);
  assert.equal(result.tokenType, "Bearer");
});

test("GoogleOAuthProvider.exchangeCode throws on HTTP error response", async () => {
  const provider = new GoogleOAuthProvider({
    ...BASE_CONFIG,
    httpClient: makeHttpMock({ error: "invalid_grant" }, 400)
  });
  await assert.rejects(() => provider.exchangeCode({ code: "bad_code" }), /token exchange failed/i);
});

test("GoogleOAuthProvider.refreshToken returns new access token", async () => {
  const provider = new GoogleOAuthProvider({
    ...BASE_CONFIG,
    httpClient: makeHttpMock({ access_token: "new_acc", expires_in: 3600 })
  });

  const result = await provider.refreshToken("old_refresh");
  assert.equal(result.accessToken, "new_acc");
});

test("GoogleOAuthProvider.fetchMail returns emails and nextCursor", async () => {
  const provider = new GoogleOAuthProvider({
    ...BASE_CONFIG,
    httpClient: makeHttpMock({ messages: [{ id: "msg1" }], nextPageToken: "page2" })
  });

  const result = await provider.fetchMail({ accessToken: "acc_tok" });
  assert.equal(result.emails.length, 1);
  assert.equal(result.nextCursor, "page2");
});

test("MicrosoftOAuthProvider is an instance of OAuthProvider", () => {
  const provider = new MicrosoftOAuthProvider({ ...BASE_CONFIG, httpClient: makeHttpMock({}) });
  assert.ok(provider instanceof OAuthProvider);
});

test("MicrosoftOAuthProvider.buildAuthorizeUrl targets Microsoft auth endpoint", () => {
  const provider = new MicrosoftOAuthProvider({ ...BASE_CONFIG, httpClient: makeHttpMock({}) });
  const url = provider.buildAuthorizeUrl({ state: "st" });

  assert.ok(url.includes("login.microsoftonline.com"));
  assert.ok(url.includes("state=st"));
});

test("GMAIL_SCOPES includes gmail.readonly and openid", () => {
  assert.ok(GMAIL_SCOPES.includes("https://www.googleapis.com/auth/gmail.readonly"));
  assert.ok(GMAIL_SCOPES.includes("openid"));
  assert.ok(GMAIL_SCOPES.includes("email"));
});
