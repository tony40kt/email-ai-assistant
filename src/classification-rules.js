'use strict';

const EMPTY_CONDITION_USER_MESSAGE = '請至少填寫一項條件：寄件人、關鍵字或收件人。';

class ClassificationRuleValidationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ClassificationRuleValidationError';
    this.userMessage = options.userMessage || EMPTY_CONDITION_USER_MESSAGE;
  }
}

const asArray = (value) => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const hasAnyToken = (value) => asArray(value).some(hasText);

const normalizePriority = (priority) => {
  if (Number.isFinite(priority)) return priority;
  const parsed = Number(priority);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

const normalizeCreatedAt = (value) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
};

const getRecipientCondition = (conditions = {}) => (
  conditions.to ?? conditions.recipients ?? conditions.recipient
);

const hasRequiredCondition = (conditions = {}) => (
  hasAnyToken(conditions.from ?? conditions.sender)
  || hasAnyToken(conditions.keyword ?? conditions.keywords)
  || hasAnyToken(getRecipientCondition(conditions))
);

const sortRulesStable = (rules = []) => asArray(rules)
  .filter(Boolean)
  .map((rule, index) => ({ ...rule, __index: index }))
  .sort((a, b) => {
    const priorityDelta = normalizePriority(a.priority) - normalizePriority(b.priority);
    if (priorityDelta !== 0) return priorityDelta;

    const createdAtDelta = normalizeCreatedAt(a.createdAt) - normalizeCreatedAt(b.createdAt);
    if (createdAtDelta !== 0) return createdAtDelta;

    return a.__index - b.__index;
  })
  .map(({ __index, ...rule }) => rule);

const assertRuleHasCondition = (rule = {}) => {
  if (hasRequiredCondition(rule.conditions || {})) return;
  throw new ClassificationRuleValidationError('rule requires at least one sender/keyword/recipient condition', {
    userMessage: EMPTY_CONDITION_USER_MESSAGE
  });
};

function upsertClassificationRule(rules = [], inputRule = {}) {
  assertRuleHasCondition(inputRule);

  const safeRules = asArray(rules).filter(Boolean);
  const now = new Date().toISOString();
  const nextRule = {
    ...inputRule,
    id: hasText(inputRule.id) ? inputRule.id.trim() : `rule-${Date.now()}`,
    enabled: inputRule.enabled !== false
  };

  const existingIndex = safeRules.findIndex((rule) => rule.id === nextRule.id);
  if (existingIndex < 0) {
    return sortRulesStable([
      ...safeRules,
      {
        ...nextRule,
        createdAt: hasText(nextRule.createdAt) ? nextRule.createdAt : now
      }
    ]);
  }

  const existingRule = safeRules[existingIndex];
  const updatedRules = safeRules.slice();
  updatedRules[existingIndex] = {
    ...existingRule,
    ...nextRule,
    createdAt: hasText(nextRule.createdAt) ? nextRule.createdAt : existingRule.createdAt
  };

  return sortRulesStable(updatedRules);
}

function deleteClassificationRule(rules = [], ruleId) {
  return asArray(rules).filter((rule) => rule?.id !== ruleId);
}

function setClassificationRuleEnabled(rules = [], ruleId, enabled) {
  return asArray(rules).map((rule) => {
    if (rule?.id !== ruleId) return rule;
    return {
      ...rule,
      enabled: Boolean(enabled)
    };
  });
}

function reorderClassificationRules(rules = [], orderedRuleIds = []) {
  const safeRules = asArray(rules).filter(Boolean);
  const orderedIdSet = new Set();
  const byId = new Map(safeRules.map((rule) => [rule.id, rule]));

  const ordered = [];
  for (const id of asArray(orderedRuleIds)) {
    if (orderedIdSet.has(id) || !byId.has(id)) continue;
    orderedIdSet.add(id);
    ordered.push(byId.get(id));
  }

  for (const rule of safeRules) {
    if (!orderedIdSet.has(rule.id)) ordered.push(rule);
  }

  return ordered.map((rule, index) => ({
    ...rule,
    priority: index
  }));
}

module.exports = {
  EMPTY_CONDITION_USER_MESSAGE,
  ClassificationRuleValidationError,
  sortRulesStable,
  upsertClassificationRule,
  deleteClassificationRule,
  setClassificationRuleEnabled,
  reorderClassificationRules
};
