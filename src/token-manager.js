"use strict";

/**
 * PR #30 – Token 生命週期管理
 *
 * 遵循 docs/SECURITY_PRIVACY_GOVERNANCE.md §1 規範：
 * - Token 不得明文寫入日誌或程式碼
 * - 到期前或收到 401 時觸發 refresh flow
 * - 登出/撤銷時清除本地 token 並觸發重新授權
 */

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;

class TokenManagerError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "TokenManagerError";
    this.code = options.code || "TOKEN_ERROR";
    this.requiresReauth = Boolean(options.requiresReauth);
  }
}

const isTokenExpired = (expiresAt, bufferMs = TOKEN_EXPIRY_BUFFER_MS) => {
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - bufferMs;
};

const createTokenManager = ({
  storage,
  refreshTokenFn,
  onTokenRevoked = () => {}
}) => {
  if (!storage || typeof storage.load !== "function" || typeof storage.save !== "function" || typeof storage.clear !== "function") {
    throw new TypeError("storage must provide load/save/clear methods");
  }
  if (typeof refreshTokenFn !== "function") {
    throw new TypeError("refreshTokenFn must be a function");
  }

  const getToken = async () => {
    const tokenData = await storage.load();

    if (!tokenData || !tokenData.accessToken) {
      throw new TokenManagerError("No token found, re-authorization required", {
        code: "NO_TOKEN",
        requiresReauth: true
      });
    }

    if (isTokenExpired(tokenData.expiresAt)) {
      return refreshToken(tokenData);
    }

    return tokenData;
  };

  const refreshToken = async (current) => {
    if (!current || !current.refreshToken) {
      throw new TokenManagerError("No refresh token available, re-authorization required", {
        code: "NO_REFRESH_TOKEN",
        requiresReauth: true
      });
    }

    let refreshed;
    try {
      refreshed = await refreshTokenFn(current.refreshToken);
    } catch (error) {
      if (error.status === 401 || error.message?.includes("invalid_token")) {
        await storage.clear();
        throw new TokenManagerError("Refresh token rejected, re-authorization required", {
          code: "REFRESH_REJECTED",
          requiresReauth: true
        });
      }
      throw new TokenManagerError("Token refresh failed", {
        code: "REFRESH_FAILED"
      });
    }

    const next = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken || current.refreshToken,
      expiresAt: refreshed.expiresAt || (Date.now() + (refreshed.expiresIn || 3600) * 1000),
      tokenType: refreshed.tokenType || "Bearer"
    };

    await storage.save(next);
    return next;
  };

  const saveToken = async (tokenData) => {
    if (!tokenData || !tokenData.accessToken) {
      throw new TokenManagerError("Cannot save token without accessToken", { code: "INVALID_TOKEN" });
    }

    const toStore = {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken || null,
      expiresAt: tokenData.expiresAt || (Date.now() + (tokenData.expiresIn || 3600) * 1000),
      tokenType: tokenData.tokenType || "Bearer"
    };

    await storage.save(toStore);
    return toStore;
  };

  const revokeToken = async () => {
    await storage.clear();
    onTokenRevoked();
  };

  return {
    getToken,
    saveToken,
    revokeToken,
    isTokenExpired
  };
};

module.exports = {
  TOKEN_EXPIRY_BUFFER_MS,
  TokenManagerError,
  isTokenExpired,
  createTokenManager
};
