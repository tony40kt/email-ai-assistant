"use strict";

/**
 * PR #32 – OAuth Provider 抽象介面
 *
 * 定義所有 OAuth provider 必須實作的方法。
 * Gmail 先行實作為 GoogleOAuthProvider；
 * Outlook 後續以 MicrosoftOAuthProvider 實作同介面，不影響上層流程。
 *
 * 參考：docs/OAUTH_IOS_IMPLEMENTATION.md §3
 */

class OAuthProvider {
  /**
   * 產生授權頁 URL（含 state / PKCE code_challenge）。
   * @param {object} params
   * @param {string} params.state  CSRF 防護用隨機字串
   * @param {string} [params.codeChallenge]  PKCE code_challenge
   * @returns {string} authorize URL
   */
  buildAuthorizeUrl(params) {
    throw new Error(`${this.constructor.name}.buildAuthorizeUrl() is not implemented`);
  }

  /**
   * 用 authorization code 換取 access / refresh token。
   * @param {object} params
   * @param {string} params.code          authorization code
   * @param {string} [params.codeVerifier]  PKCE code_verifier
   * @returns {Promise<{accessToken, refreshToken, expiresIn, tokenType}>}
   */
  async exchangeCode(params) {
    throw new Error(`${this.constructor.name}.exchangeCode() is not implemented`);
  }

  /**
   * 用 refresh token 換取新的 access token。
   * @param {string} refreshToken
   * @returns {Promise<{accessToken, refreshToken, expiresIn, tokenType}>}
   */
  async refreshToken(refreshToken) {
    throw new Error(`${this.constructor.name}.refreshToken() is not implemented`);
  }

  /**
   * 以儲存的 access token 代替前端呼叫郵件 API 讀取郵件列表。
   * @param {object} params
   * @param {string} params.accessToken
   * @param {object} [params.options]
   * @returns {Promise<{emails: Array, nextCursor: string|null}>}
   */
  async fetchMail(params) {
    throw new Error(`${this.constructor.name}.fetchMail() is not implemented`);
  }
}

module.exports = { OAuthProvider };
