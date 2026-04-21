'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyEmail } = require('../src/classification-engine');

test('matches multi-condition rules and applies labels', () => {
  const email = {
    from: 'alerts@bank.com',
    to: ['me@example.com'],
    subject: 'Payment reminder',
    body: 'Your invoice is due tomorrow.',
    labels: []
  };

  const rules = [
    {
      id: 'billing',
      name: '帳務提醒',
      priority: 2,
      conditions: {
        from: 'bank.com',
        to: 'me@example.com',
        keyword: 'invoice'
      },
      labels: ['Finance']
    }
  ];

  const result = classifyEmail(email, rules);

  assert.equal(result.winningRule.id, 'billing');
  assert.deepEqual(result.email.labels, ['Finance']);
  assert.deepEqual(result.trace.matchedRuleIds, ['billing']);
  assert.equal(result.trace.winningRuleId, 'billing');
});

test('resolves conflicts by priority then createdAt', () => {
  const email = {
    from: 'service@vendor.com',
    subject: 'Invoice available',
    body: 'invoice',
    labels: []
  };

  const rules = [
    {
      id: 'later-created',
      name: '後建立規則',
      priority: 1,
      createdAt: '2026-04-20T09:00:00.000Z',
      conditions: { from: 'vendor.com', keyword: 'invoice' },
      labels: ['Ops']
    },
    {
      id: 'higher-priority',
      name: '高優先',
      priority: 0,
      createdAt: '2026-04-20T10:00:00.000Z',
      conditions: { from: 'vendor.com', keyword: 'invoice' },
      labels: ['Urgent']
    },
    {
      id: 'earlier-created',
      name: '先建立規則',
      priority: 1,
      createdAt: '2026-04-20T08:00:00.000Z',
      conditions: { from: 'vendor.com', keyword: 'invoice' },
      labels: ['Finance']
    }
  ];

  const result = classifyEmail(email, rules);

  assert.equal(result.winningRule.id, 'higher-priority');

  const samePriorityOnly = classifyEmail(email, rules.filter((rule) => rule.priority === 1));
  assert.equal(samePriorityOnly.winningRule.id, 'earlier-created');
});

test('resolves exact ties by declaration order', () => {
  const email = {
    from: 'service@vendor.com',
    subject: 'Monthly report',
    body: 'report ready',
    labels: []
  };

  const rules = [
    {
      id: 'first',
      name: '第一條',
      priority: 1,
      conditions: { from: 'vendor.com', keyword: 'report' },
      labels: ['A']
    },
    {
      id: 'second',
      name: '第二條',
      priority: 1,
      conditions: { from: 'vendor.com', keyword: 'report' },
      labels: ['B']
    }
  ];

  const result = classifyEmail(email, rules);

  assert.equal(result.winningRule.id, 'first');
});

test('skips disabled matching rules', () => {
  const email = {
    from: 'billing@service.com',
    subject: 'Invoice ready',
    body: 'invoice attached',
    labels: []
  };

  const rules = [
    {
      id: 'disabled-top-priority',
      name: '停用高優先',
      priority: 0,
      enabled: false,
      conditions: { from: 'service.com', keyword: 'invoice' },
      labels: ['DoNotUse']
    },
    {
      id: 'enabled-rule',
      name: '啟用規則',
      priority: 1,
      conditions: { from: 'service.com', keyword: 'invoice' },
      labels: ['Finance']
    }
  ];

  const result = classifyEmail(email, rules);

  assert.equal(result.winningRule.id, 'enabled-rule');
  assert.deepEqual(result.trace.matchedRuleIds, ['enabled-rule']);
});

test('updates labels by replacing previous auto-applied labels only', () => {
  const email = {
    from: 'alerts@shop.com',
    subject: 'Flash sale',
    body: '50% off',
    labels: ['Pinned', 'OldPromo'],
    classification: {
      appliedLabels: ['OldPromo'],
      matchedRuleId: 'old'
    }
  };

  const rules = [
    {
      id: 'new-promo',
      name: '新促銷',
      priority: 1,
      conditions: { from: 'shop.com', keyword: 'sale' },
      labels: ['Promo']
    }
  ];

  const result = classifyEmail(email, rules);

  assert.deepEqual(result.email.labels.sort(), ['Pinned', 'Promo']);
  assert.deepEqual(result.email.classification.appliedLabels, ['Promo']);
  assert.equal(result.email.classification.matchedRuleId, 'new-promo');
});

test('normalizes whitespace in recipients and labels', () => {
  const email = {
    from: 'alerts@shop.com',
    to: ['  me@example.com  '],
    subject: 'Flash sale',
    body: '50% off',
    labels: ['Pinned', '  OldPromo  '],
    classification: {
      appliedLabels: ['OldPromo']
    }
  };

  const rules = [
    {
      id: 'trimmed-match',
      name: '空白正規化',
      priority: 1,
      conditions: { to: 'me@example.com', keyword: 'sale' },
      labels: ['  Promo  ']
    }
  ];

  const result = classifyEmail(email, rules);

  assert.equal(result.winningRule.id, 'trimmed-match');
  assert.deepEqual(result.email.labels.sort(), ['Pinned', 'Promo']);
  assert.deepEqual(result.email.classification.appliedLabels, ['Promo']);
});

test('supports read/unread conditions for rule matching', () => {
  const unreadEmail = {
    from: 'alerts@shop.com',
    subject: 'Flash sale',
    body: '50% off',
    isRead: false,
    labels: []
  };

  const readEmail = {
    ...unreadEmail,
    isRead: true
  };

  const rules = [
    {
      id: 'read-only',
      name: '已讀推送',
      priority: 0,
      conditions: { from: 'shop.com', keyword: 'sale', read: true },
      labels: ['ReadAlert']
    },
    {
      id: 'unread-only',
      name: '未讀推送',
      priority: 0,
      conditions: { from: 'shop.com', keyword: 'sale', isRead: '未讀' },
      labels: ['UnreadAlert']
    }
  ];

  const unreadResult = classifyEmail(unreadEmail, rules);
  const readResult = classifyEmail(readEmail, rules);

  assert.equal(unreadResult.winningRule.id, 'unread-only');
  assert.equal(readResult.winningRule.id, 'read-only');
});

test('clears previous auto labels when no rule matches', () => {
  const email = {
    from: 'noreply@system.com',
    subject: 'Generic notice',
    body: 'No keyword',
    labels: ['KeepMe', 'AutoTag'],
    classification: {
      appliedLabels: ['AutoTag'],
      matchedRuleId: 'old-rule'
    }
  };

  const rules = [
    {
      id: 'unmatched',
      name: '不命中規則',
      priority: 1,
      conditions: { keyword: 'invoice' },
      labels: ['Finance']
    }
  ];

  const result = classifyEmail(email, rules);

  assert.equal(result.winningRule, null);
  assert.deepEqual(result.email.labels, ['KeepMe']);
  assert.deepEqual(result.email.classification.appliedLabels, []);
  assert.equal(result.trace.winningRuleId, null);
});
