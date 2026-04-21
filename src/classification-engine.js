'use strict';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const normalizeString = (value) => value.trim().toLowerCase();
const TRUTHY_BOOLEAN_LIKE_VALUES = ['true', '1', 'yes'];
const FALSY_BOOLEAN_LIKE_VALUES = ['false', '0', 'no'];
const READ_STATE_TRUE_VALUES = ['read', '已讀'];
const READ_STATE_FALSE_VALUES = ['unread', '未讀'];

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
};

const toLowerTokens = (value) => toArray(value)
  .filter(isNonEmptyString)
  .map((item) => item.trim().toLowerCase());

const containsAny = (target, tokens) => {
  if (!tokens.length) return true;
  if (!isNonEmptyString(target)) return false;

  const normalizedTarget = normalizeString(target);
  return tokens.some((token) => normalizedTarget.includes(token));
};

const recipientsContainAny = (recipients, tokens) => {
  if (!tokens.length) return true;

  const pool = toArray(recipients)
    .filter(isNonEmptyString)
    .map((item) => normalizeString(item));

  if (!pool.length) return false;
  return pool.some((recipient) => tokens.some((token) => recipient.includes(token)));
};

const normalizePriority = (priority) => {
  if (Number.isFinite(priority)) return priority;
  const parsed = Number(priority);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

const normalizeTimestamp = (value) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
};

const hasAnyCondition = (conditions = {}) => (
  toLowerTokens(conditions.from ?? conditions.sender).length > 0
  || toLowerTokens(conditions.to ?? conditions.recipient).length > 0
  || toLowerTokens(conditions.keyword ?? conditions.keywords).length > 0
  || toLowerTokens(conditions.subject).length > 0
  || toLowerTokens(conditions.body).length > 0
);

const resolveRecipients = (email) => {
  if (Array.isArray(email?.to)) return email.to;
  if (isNonEmptyString(email?.to)) return [email.to];
  if (Array.isArray(email?.recipients)) return email.recipients;
  if (isNonEmptyString(email?.recipients)) return [email.recipients];
  return [];
};

const normalizeBooleanLike = (value) => {
  if (value === true || value === false) return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (!isNonEmptyString(value)) return null;

  const normalized = value.trim().toLowerCase();
  if (TRUTHY_BOOLEAN_LIKE_VALUES.includes(normalized) || READ_STATE_TRUE_VALUES.includes(normalized)) return true;
  if (FALSY_BOOLEAN_LIKE_VALUES.includes(normalized) || READ_STATE_FALSE_VALUES.includes(normalized)) return false;
  return null;
};

const readConditionMatches = (email, conditions) => {
  const rawExpected = conditions.isRead ?? conditions.read;
  if (rawExpected === undefined || rawExpected === null) return true;
  if (typeof rawExpected === 'string' && rawExpected.trim().length === 0) return true;

  const expected = normalizeBooleanLike(rawExpected);
  if (expected === null) return false;

  const actual = normalizeBooleanLike(email?.isRead ?? email?.read);
  if (actual === null) return false;

  return actual === expected;
};

const ruleMatches = (email, rule) => {
  const conditions = rule?.conditions || {};
  if (!hasAnyCondition(conditions)) return false;
  const sender = isNonEmptyString(email?.from)
    ? email.from
    : (isNonEmptyString(email?.sender) ? email.sender : '');
  const recipients = resolveRecipients(email);
  const subject = isNonEmptyString(email?.subject) ? email.subject : '';
  const body = isNonEmptyString(email?.body) ? email.body : '';
  const combined = `${subject}\n${body}`;

  const fromTokens = toLowerTokens(conditions.from ?? conditions.sender);
  const toTokens = toLowerTokens(conditions.to ?? conditions.recipient);
  const keywordTokens = toLowerTokens(conditions.keyword ?? conditions.keywords);
  const subjectTokens = toLowerTokens(conditions.subject);
  const bodyTokens = toLowerTokens(conditions.body);

  return containsAny(sender, fromTokens)
    && recipientsContainAny(recipients, toTokens)
    && containsAny(combined, keywordTokens)
    && containsAny(subject, subjectTokens)
    && containsAny(body, bodyTokens)
    && readConditionMatches(email, conditions);
};

const pickWinningRule = (rules) => {
  if (!rules.length) return null;

  let winner = rules[0];

  for (let index = 1; index < rules.length; index += 1) {
    const candidate = rules[index];

    const priorityDelta = normalizePriority(candidate.priority) - normalizePriority(winner.priority);
    if (priorityDelta < 0) {
      winner = candidate;
      continue;
    }
    if (priorityDelta > 0) continue;

    const createdDelta = normalizeTimestamp(candidate.createdAt) - normalizeTimestamp(winner.createdAt);
    if (createdDelta < 0) {
      winner = candidate;
      continue;
    }
    if (createdDelta > 0) continue;

    if (candidate.__index < winner.__index) winner = candidate;
  }

  return winner;
};

const normalizeLabels = (labels) => toArray(labels)
  .filter(isNonEmptyString)
  .map((label) => label.trim());

const mergeLabels = (baseLabels, removedLabels, addedLabels) => {
  const result = new Set(normalizeLabels(baseLabels));
  for (const label of normalizeLabels(removedLabels)) result.delete(label);
  for (const label of normalizeLabels(addedLabels)) result.add(label);
  return [...result];
};

function classifyEmail(email, rules) {
  const safeEmail = email || {};
  const safeRules = toArray(rules)
    .filter((rule) => rule && rule.enabled !== false)
    .map((rule, index) => ({ ...rule, __index: index }));

  const matchedRules = safeRules.filter((rule) => ruleMatches(safeEmail, rule));
  const winningRule = pickWinningRule(matchedRules);

  const previousAutoLabels = normalizeLabels(safeEmail.classification?.appliedLabels);
  const nextAutoLabels = normalizeLabels(winningRule?.labels);
  const nextLabels = mergeLabels(safeEmail.labels, previousAutoLabels, nextAutoLabels);

  const trace = {
    matchedRuleIds: matchedRules.map((rule) => rule.id).filter((id) => id !== undefined),
    matchedRules: matchedRules.map((rule) => ({
      id: rule.id ?? null,
      name: rule.name ?? null,
      priority: normalizePriority(rule.priority)
    })),
    winningRuleId: winningRule?.id ?? null,
    winningRuleName: winningRule?.name ?? null
  };

  return {
    email: {
      ...safeEmail,
      labels: nextLabels,
      classification: {
        appliedLabels: nextAutoLabels,
        matchedRuleId: winningRule?.id ?? null,
        matchedRuleName: winningRule?.name ?? null,
        priority: winningRule ? normalizePriority(winningRule.priority) : null
      }
    },
    matchedRules: matchedRules.map(({ __index, ...rule }) => rule),
    winningRule: winningRule ? (({ __index, ...rule }) => rule)(winningRule) : null,
    trace
  };
}

module.exports = {
  classifyEmail
};
