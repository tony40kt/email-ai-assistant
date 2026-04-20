"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  RuleValidationError,
  RuleNotFoundError,
  validateRule,
  sortRules,
  createRuleManager
} = require("../src/rule-management");

const makeStorage = (initial = []) => {
  let db = [...initial];
  return {
    load: async () => [...db],
    save: async (rules) => { db = [...rules]; },
    peek: () => db
  };
};

const baseRule = (overrides = {}) => ({
  name: "Test Rule",
  conditions: { sender: "bank.com" },
  priority: 1,
  labels: ["Finance"],
  ...overrides
});

// ─── validateRule ────────────────────────────────────────────────────────────

test("validateRule passes when at least one condition is provided", () => {
  assert.doesNotThrow(() => validateRule(baseRule()));
  assert.doesNotThrow(() => validateRule(baseRule({ conditions: { keyword: "invoice" } })));
  assert.doesNotThrow(() => validateRule(baseRule({ conditions: { recipient: "me@x.com" } })));
});

test("validateRule throws RuleValidationError when no condition is provided", () => {
  assert.throws(
    () => validateRule(baseRule({ conditions: {} })),
    RuleValidationError
  );
  assert.throws(
    () => validateRule(baseRule({ conditions: { sender: " " } })),
    RuleValidationError
  );
});

test("validateRule throws RuleValidationError when name is empty", () => {
  assert.throws(() => validateRule(baseRule({ name: "" })), RuleValidationError);
  assert.throws(() => validateRule(baseRule({ name: "  " })), RuleValidationError);
});

// ─── sortRules ───────────────────────────────────────────────────────────────

test("sortRules orders by priority ascending", () => {
  const rules = [
    { id: "b", priority: 2, createdAt: "2026-01-01T00:00:00Z" },
    { id: "a", priority: 1, createdAt: "2026-01-01T00:00:00Z" }
  ];
  const sorted = sortRules(rules);
  assert.equal(sorted[0].id, "a");
});

test("sortRules uses createdAt as tiebreaker for equal priority", () => {
  const rules = [
    { id: "later", priority: 1, createdAt: "2026-04-20T09:00:00Z" },
    { id: "earlier", priority: 1, createdAt: "2026-04-20T08:00:00Z" }
  ];
  const sorted = sortRules(rules);
  assert.equal(sorted[0].id, "earlier");
});

test("sortRules does not mutate the original array", () => {
  const rules = [
    { id: "b", priority: 2, createdAt: "2026-01-01T00:00:00Z" },
    { id: "a", priority: 1, createdAt: "2026-01-01T00:00:00Z" }
  ];
  const copy = [...rules];
  sortRules(rules);
  assert.deepEqual(rules, copy);
});

// ─── createRuleManager ───────────────────────────────────────────────────────

test("createRuleManager throws when storage is invalid", () => {
  assert.throws(() => createRuleManager({ storage: {} }), TypeError);
  assert.throws(() => createRuleManager({ storage: null }), TypeError);
});

test("list returns empty array when no rules", async () => {
  const manager = createRuleManager({ storage: makeStorage([]) });
  const rules = await manager.list();
  assert.deepEqual(rules, []);
});

test("create adds a new rule with default fields", async () => {
  const storage = makeStorage([]);
  const manager = createRuleManager({ storage });

  const created = await manager.create(baseRule());

  assert.ok(typeof created.id === "string");
  assert.equal(created.name, "Test Rule");
  assert.equal(created.enabled, true);
  assert.ok(typeof created.createdAt === "string");
  assert.equal(storage.peek().length, 1);
});

test("create sets enabled=false when explicitly passed", async () => {
  const storage = makeStorage([]);
  const manager = createRuleManager({ storage });
  const rule = await manager.create(baseRule({ enabled: false }));
  assert.equal(rule.enabled, false);
});

test("create throws RuleValidationError for empty conditions", async () => {
  const storage = makeStorage([]);
  const manager = createRuleManager({ storage });
  await assert.rejects(
    () => manager.create(baseRule({ conditions: {} })),
    RuleValidationError
  );
});

test("update modifies rule fields and preserves id/createdAt", async () => {
  const storage = makeStorage([{ id: "r1", name: "Old", conditions: { sender: "x.com" }, priority: 1, createdAt: "2026-01-01T00:00:00Z" }]);
  const manager = createRuleManager({ storage });

  const updated = await manager.update("r1", { name: "New", conditions: { keyword: "urgent" } });

  assert.equal(updated.id, "r1");
  assert.equal(updated.name, "New");
  assert.equal(updated.createdAt, "2026-01-01T00:00:00Z");
  assert.ok(updated.updatedAt !== "2026-01-01T00:00:00Z");
});

test("update throws RuleNotFoundError for unknown id", async () => {
  const storage = makeStorage([]);
  const manager = createRuleManager({ storage });
  await assert.rejects(() => manager.update("nonexistent", {}), RuleNotFoundError);
});

test("remove deletes a rule by id", async () => {
  const storage = makeStorage([{ id: "r1", name: "R1", conditions: { sender: "a.com" } }]);
  const manager = createRuleManager({ storage });

  await manager.remove("r1");
  assert.equal(storage.peek().length, 0);
});

test("remove throws RuleNotFoundError for unknown id", async () => {
  const storage = makeStorage([]);
  const manager = createRuleManager({ storage });
  await assert.rejects(() => manager.remove("missing"), RuleNotFoundError);
});

test("toggle enables a disabled rule", async () => {
  const storage = makeStorage([{ id: "r1", name: "R1", conditions: { sender: "x.com" }, enabled: false }]);
  const manager = createRuleManager({ storage });

  const result = await manager.toggle("r1", true);
  assert.equal(result.enabled, true);
});

test("toggle disables an enabled rule", async () => {
  const storage = makeStorage([{ id: "r1", name: "R1", conditions: { sender: "x.com" }, enabled: true }]);
  const manager = createRuleManager({ storage });

  const result = await manager.toggle("r1", false);
  assert.equal(result.enabled, false);
});

test("list returns rules sorted by priority then createdAt", async () => {
  const storage = makeStorage([
    { id: "c", priority: 1, createdAt: "2026-04-20T10:00:00Z", name: "C", conditions: { sender: "c.com" } },
    { id: "a", priority: 0, createdAt: "2026-04-20T08:00:00Z", name: "A", conditions: { sender: "a.com" } },
    { id: "b", priority: 1, createdAt: "2026-04-20T09:00:00Z", name: "B", conditions: { sender: "b.com" } }
  ]);
  const manager = createRuleManager({ storage });

  const sorted = await manager.list();
  assert.equal(sorted[0].id, "a");
  assert.equal(sorted[1].id, "b");
  assert.equal(sorted[2].id, "c");
});
