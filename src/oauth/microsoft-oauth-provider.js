"use strict";

/**
 * PR #32 – Microsoft OAuth Provider（Outlook – 次階段 stub）
 *
 * 預留擴充點，實作 OAuthProvider 介面。
 * 目前各方法皆拋出 Not Implemented 錯誤，確保 Gmail 主流程不受影響。
 *
 * 參考：docs/OAUTH_IOS_IMPLEMENTATION.md §3
 */

const { OAuthProvider } = require("./oauth-provider");

const MICROSOFT_AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0";

const OUTLOOK_SCOPES = [
  "https://graph.microsoft.com/Mail.Read",
  "offline_access",
  "openid",
  "email",
  "profile"
];

class MicrosoftOAuthProvider extends OAuthProvider {
  /**
   * @param {object} config
   * @param {string} config.clientId      Azure app client ID
   * @param {string} config.clientSecret  Azure app client secret
   * @param {string} config.redirectUri   Registered redirect URI
   * @param {Function} [config.httpClient] injectable fetch-compatible function for testing
   */
  constructor({ clientId, clientSecret, redirectUri, httpClient = globalThis.fetch }) {
    super();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new TypeError("MicrosoftOAuthProvider requires clientId, clientSecret, and redirectUri");
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
      scope: OUTLOOK_SCOPES.join(" "),
      state
    });

    if (codeChallenge) {
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }

    return `${MICROSOFT_AUTH_BASE}/authorize?${params.toString()}`;
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

    const response = await this._http(`${MICROSOFT_AUTH_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(`Microsoft token exchange failed: ${data.error || response.status}`);
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

    const response = await this._http(`${MICROSOFT_AUTH_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(`Microsoft token refresh failed: ${data.error || response.status}`);
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
    const { nextLink, top = 25 } = options;
    const url = nextLink || `https://graph.microsoft.com/v1.0/me/messages?$top=${top}&$select=id,subject,from,toRecipients,isRead,receivedDateTime`;

    const response = await this._http(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const error = new Error(`Microsoft Graph API error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    return {
      emails: data.value || [],
      nextCursor: data["@odata.nextLink"] || null
    };
  }
}

module.exports = {
  MicrosoftOAuthProvider,
  OUTLOOK_SCOPES
};
