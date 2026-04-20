"use strict";

/**
 * PR #33 – 分類規則管理（CRUD + 啟用/停用 + 穩定排序 + 儲存驗證）
 *
 * 遵循 docs/ISSUES_DESIGN.md Issue 4 規範：
 * - 規則 CRUD（新增/編輯/刪除）與啟用/停用切換
 * - 儲存時至少需填寫一項條件（sender / keyword / recipient）
 * - 同優先序時排序穩定（按建立時間）
 */

const CONDITION_FIELDS = ["sender", "keyword", "recipient"];

class RuleValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RuleValidationError";
  }
}

class RuleNotFoundError extends Error {
  constructor(id) {
    super(`Rule not found: ${id}`);
    this.name = "RuleNotFoundError";
  }
}

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const hasAtLeastOneCondition = (conditions = {}) =>
  CONDITION_FIELDS.some((field) => isNonEmptyString(conditions[field]));

const validateRule = (rule) => {
  if (!isNonEmptyString(rule?.name)) {
    throw new RuleValidationError("規則名稱不得為空。");
  }
  if (!hasAtLeastOneCondition(rule?.conditions)) {
    throw new RuleValidationError(
      `儲存規則時至少需填寫一項條件：${CONDITION_FIELDS.join(" / ")}。`
    );
  }
};

const normalizePriority = (priority) => {
  const n = Number(priority);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

const normalizeTimestamp = (value) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ts = typeof value === "number" ? value : Date.parse(value);
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
};

const sortRules = (rules) =>
  [...rules].sort((a, b) => {
    const pd = normalizePriority(a.priority) - normalizePriority(b.priority);
    if (pd !== 0) return pd;
    return normalizeTimestamp(a.createdAt) - normalizeTimestamp(b.createdAt);
  });

const createRuleManager = ({ storage, generateId = () => `rule_${Date.now()}_${Math.random().toString(36).slice(2)}` }) => {
  if (!storage || typeof storage.load !== "function" || typeof storage.save !== "function") {
    throw new TypeError("storage must provide load and save methods");
  }

  const list = async () => {
    const rules = await storage.load();
    return sortRules(Array.isArray(rules) ? rules : []);
  };

  const create = async (ruleInput) => {
    validateRule(ruleInput);

    const now = new Date().toISOString();
    const newRule = {
      id: generateId(),
      name: ruleInput.name.trim(),
      conditions: { ...ruleInput.conditions },
      priority: normalizePriority(ruleInput.priority),
      labels: Array.isArray(ruleInput.labels) ? [...ruleInput.labels] : [],
      enabled: ruleInput.enabled !== false,
      createdAt: now,
      updatedAt: now
    };

    const existing = await storage.load() || [];
    await storage.save([...existing, newRule]);
    return newRule;
  };

  const update = async (id, updates) => {
    const existing = await storage.load() || [];
    const index = existing.findIndex((r) => r.id === id);
    if (index === -1) throw new RuleNotFoundError(id);

    const merged = {
      ...existing[index],
      ...updates,
      id,
      createdAt: existing[index].createdAt,
      updatedAt: new Date().toISOString()
    };

    validateRule(merged);

    const next = [...existing];
    next[index] = merged;
    await storage.save(next);
    return merged;
  };

  const remove = async (id) => {
    const existing = await storage.load() || [];
    const index = existing.findIndex((r) => r.id === id);
    if (index === -1) throw new RuleNotFoundError(id);

    const next = existing.filter((r) => r.id !== id);
    await storage.save(next);
  };

  const toggle = async (id, enabled) => {
    const existing = await storage.load() || [];
    const index = existing.findIndex((r) => r.id === id);
    if (index === -1) throw new RuleNotFoundError(id);

    const next = [...existing];
    next[index] = {
      ...existing[index],
      enabled: Boolean(enabled),
      updatedAt: new Date().toISOString()
    };
    await storage.save(next);
    return next[index];
  };

  return { list, create, update, remove, toggle };
};

module.exports = {
  CONDITION_FIELDS,
  RuleValidationError,
  RuleNotFoundError,
  validateRule,
  sortRules,
  createRuleManager
};
