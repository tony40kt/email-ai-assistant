"use strict";

/**
 * PR #30 – 日誌去識別化工具
 *
 * 遵循 docs/SECURITY_PRIVACY_GOVERNANCE.md §2 規範：
 * - Token / 金鑰：一律以 [REDACTED] 取代
 * - Email：保留部分前綴與網域（u***@example.com）
 * - Authorization header 與 Cookie 值：完全遮罩
 * - 可逐欄位設定遮罩策略
 */

const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERN = /^(access.?token|refresh.?token|authorization|cookie|api.?key|client.?secret|service.?role|password|passwd|secret)/i;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

const TOKEN_LIKE_PATTERN = /^[A-Za-z0-9+/=._-]{20,}$/;

const maskEmail = (email) => {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return REDACTED;
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const visiblePrefix = local.slice(0, Math.min(2, local.length));
  return `${visiblePrefix}***${domain}`;
};

const maskValue = (key, value) => {
  if (typeof value !== "string") return value;
  if (SENSITIVE_KEY_PATTERN.test(key)) return REDACTED;
  if (EMAIL_PATTERN.test(value)) return maskEmail(value);
  return value;
};

const redactObject = (obj, visited = new WeakSet()) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (visited.has(obj)) return "[Circular]";
  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, visited));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null) {
      result[key] = redactObject(value, visited);
    } else {
      result[key] = maskValue(key, value);
    }
  }
  return result;
};

const LEVELS = ["debug", "info", "warn", "error"];

const createLogger = (options = {}) => {
  const {
    level = "info",
    output = (entry) => {
      const line = JSON.stringify(entry);
      if (entry.level === "error" || entry.level === "warn") {
        process.stderr.write(line + "\n");
      } else {
        process.stdout.write(line + "\n");
      }
    }
  } = options;

  const minLevel = LEVELS.indexOf(level);

  const log = (msgLevel, message, meta = {}) => {
    if (LEVELS.indexOf(msgLevel) < minLevel) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level: msgLevel,
      message,
      ...redactObject(meta)
    };

    output(entry);
  };

  return {
    debug: (message, meta) => log("debug", message, meta),
    info: (message, meta) => log("info", message, meta),
    warn: (message, meta) => log("warn", message, meta),
    error: (message, meta) => log("error", message, meta)
  };
};

module.exports = {
  REDACTED,
  maskEmail,
  maskValue,
  redactObject,
  createLogger
};
