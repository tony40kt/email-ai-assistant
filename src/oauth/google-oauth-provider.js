"use strict";

/**
 * PR #32 – Google OAuth Provider（Gmail MVP）
 *
 * 實作 OAuthProvider 介面，對應 docs/OAUTH_IOS_IMPLEMENTATION.md §2。
 *
 * 安全原則：
 * - access / refresh token 不寫入任何日誌
 * - refresh token 僅存後端，不回傳前端
 * - 支援 Authorization Code + PKCE 流程
 */

const { OAuthProvider } = require("./oauth-provider");

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "openid",
  "email",
  "profile"
];

class GoogleOAuthProvider extends OAuthProvider {
  /**
   * @param {object} config
   * @param {string} config.clientId       GMAIL_CLIENT_ID
   * @param {string} config.clientSecret   GMAIL_CLIENT_SECRET
   * @param {string} config.redirectUri    GMAIL_REDIRECT_URI
   * @param {Function} [config.httpClient] injectable fetch-compatible function for testing
   */
  constructor({ clientId, clientSecret, redirectUri, httpClient = globalThis.fetch }) {
    super();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new TypeError("GoogleOAuthProvider requires clientId, clientSecret, and redirectUri");
    }
    this._clientId = clientId;
    this._clientSecret = clientSecret;
    this._redirectUri = redirectUri;
    this._http = httpClient;
  }

  buildAuthorizeUrl({ state, codeChallenge }) {
    const params = new URLSearchParams({
      client_id: this._clientId,
      redirect_uri: this._redirectUri,
      response_type: "code",
      scope: GMAIL_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state
    });

    if (codeChallenge) {
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode({ code, codeVerifier }) {
    const body = new URLSearchParams({
      code,
      client_id: this._clientId,
      client_secret: this._clientSecret,
      redirect_uri: this._redirectUri,
      grant_type: "authorization_code"
    });

    if (codeVerifier) {
      body.set("code_verifier", codeVerifier);
    }

    const response = await this._http(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(`Google token exchange failed: ${data.error || response.status}`);
      error.status = response.status;
      throw error;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresIn: data.expires_in,
      tokenType: data.token_type || "Bearer"
    };
  }

  async refreshToken(currentRefreshToken) {
    const body = new URLSearchParams({
      refresh_token: currentRefreshToken,
      client_id: this._clientId,
      client_secret: this._clientSecret,
      grant_type: "refresh_token"
    });

    const response = await this._http(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(`Google token refresh failed: ${data.error || response.status}`);
      error.status = response.status;
      throw error;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      expiresIn: data.expires_in,
      tokenType: data.token_type || "Bearer"
    };
  }

  async fetchMail({ accessToken, options = {} }) {
    const { pageToken, maxResults = 25 } = options;
    const params = new URLSearchParams({ maxResults: String(maxResults) });
    if (pageToken) params.set("pageToken", pageToken);

    const listResponse = await this._http(
      `${GOOGLE_GMAIL_API_BASE}/messages?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listResponse.ok) {
      const error = new Error(`Gmail API error: ${listResponse.status}`);
      error.status = listResponse.status;
      throw error;
    }

    const listData = await listResponse.json();
    return {
      emails: listData.messages || [],
      nextCursor: listData.nextPageToken || null
    };
  }
}

module.exports = {
  GoogleOAuthProvider,
  GMAIL_SCOPES
};
