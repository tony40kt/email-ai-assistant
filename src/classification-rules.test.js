'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  EMPTY_CONDITION_USER_MESSAGE,
  ClassificationRuleValidationError,
  sortRulesStable,
  upsertClassificationRule,
  deleteClassificationRule,
  setClassificationRuleEnabled,
  reorderClassificationRules
} = require('./classification-rules');

test('upsertClassificationRule saves new and edited rules with stable sorting', () => {
  const initialRules = [
    {
      id: 'later-created',
      name: '後建立規則',
      priority: 1,
      createdAt: '2026-04-20T09:00:00.000Z',
      enabled: true,
      conditions: { from: 'vendor.com' }
    },
    {
      id: 'earlier-created',
      name: '先建立規則',
      priority: 1,
      createdAt: '2026-04-20T08:00:00.000Z',
      enabled: true,
      conditions: { from: 'vendor.com' }
    }
  ];

  const withNewRule = upsertClassificationRule(initialRules, {
    id: 'top-priority',
    name: '最高優先',
    priority: 0,
    conditions: { keyword: 'invoice' }
  });

  assert.deepEqual(withNewRule.map((rule) => rule.id), ['top-priority', 'earlier-created', 'later-created']);

  const edited = upsertClassificationRule(withNewRule, {
    id: 'top-priority',
    name: '最高優先-已更新',
    priority: 2,
    conditions: { to: 'me@example.com' }
  });

  const editedRule = edited.find((rule) => rule.id === 'top-priority');
  assert.equal(editedRule.name, '最高優先-已更新');
  assert.equal(editedRule.priority, 2);
});

test('upsertClassificationRule rejects empty sender/keyword/recipient conditions with clear message', () => {
  assert.throws(
    () => upsertClassificationRule([], {
      id: 'invalid',
      name: '空條件',
      priority: 1,
      conditions: { from: '   ', keyword: '', to: [] }
    }),
    (error) => {
      assert.equal(error instanceof ClassificationRuleValidationError, true);
      assert.equal(error.userMessage, EMPTY_CONDITION_USER_MESSAGE);
      return true;
    }
  );
});

test('supports delete and enable/disable operations', () => {
  const rules = [
    { id: 'r1', enabled: true, priority: 0, conditions: { from: 'a.com' } },
    { id: 'r2', enabled: true, priority: 1, conditions: { keyword: 'invoice' } }
  ];

  const disabled = setClassificationRuleEnabled(rules, 'r1', false);
  assert.equal(disabled.find((rule) => rule.id === 'r1').enabled, false);

  const removed = deleteClassificationRule(disabled, 'r2');
  assert.deepEqual(removed.map((rule) => rule.id), ['r1']);
});

test('reorderClassificationRules updates priority order for UI sorting', () => {
  const rules = [
    { id: 'r1', priority: 0, conditions: { from: 'a.com' } },
    { id: 'r2', priority: 1, conditions: { keyword: 'b' } },
    { id: 'r3', priority: 2, conditions: { to: 'me@example.com' } }
  ];

  const reordered = reorderClassificationRules(rules, ['r3', 'r1']);

  assert.deepEqual(reordered.map((rule) => rule.id), ['r3', 'r1', 'r2']);
  assert.deepEqual(reordered.map((rule) => rule.priority), [0, 1, 2]);
});

test('sortRulesStable keeps tie order by createdAt', () => {
  const sorted = sortRulesStable([
    { id: 'later', priority: 1, createdAt: '2026-04-20T09:00:00.000Z' },
    { id: 'earlier', priority: 1, createdAt: '2026-04-20T08:00:00.000Z' }
  ]);

  assert.deepEqual(sorted.map((rule) => rule.id), ['earlier', 'later']);
});
