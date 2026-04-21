"use strict";

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN = /(token|secret|api[_-]?key|authorization|cookie|password)/i;
const TOKEN_QUERY_PATTERN = /((?:access_token|refresh_token|token|api[_-]?key|client_secret)=)([^&\s]+)/gi;
const BEARER_PATTERN = /Bearer\s+[^\s,;]+/gi;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;

const maskEmail = (value) => value.replace(EMAIL_PATTERN, (_full, domain) => `***${domain}`);

const redactText = (value) => (
  maskEmail(
    value
      .replace(BEARER_PATTERN, "Bearer [REDACTED]")
      .replace(TOKEN_QUERY_PATTERN, `$1${REDACTED}`)
  )
);

const sanitizeLogValue = (value, key = "") => {
  if (value === null || value === undefined) {
    return value;
  }

  if (SENSITIVE_KEY_PATTERN.test(String(key))) {
    return REDACTED;
  }

  if (typeof value === "string") {
    return redactText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item));
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce((acc, [childKey, childValue]) => {
      acc[childKey] = sanitizeLogValue(childValue, childKey);
      return acc;
    }, {});
  }

  return value;
};

module.exports = {
  REDACTED,
  sanitizeLogValue
};
