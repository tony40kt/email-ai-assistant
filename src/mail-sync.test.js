"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { MailSyncError, mapEmailModel, syncEmails } = require("./mail-sync");

const createMemoryStorage = (state = { lastSyncToken: null }) => {
  const db = {
    state: { ...state },
    emails: []
  };
  return {
    loadState: async () => ({ ...db.state }),
    saveState: async (nextState) => {
      db.state = { ...nextState };
    },
    saveEmails: async (emails) => {
      db.emails.push(...emails);
    },
    getState: () => db.state,
    getEmails: () => db.emails
  };
};

test("mapEmailModel maps required mail fields", () => {
  const mapped = mapEmailModel({
    id: "m1",
    from: "a@example.com",
    to: ["b@example.com"],
    subject: "hello",
    read: true
  });

  assert.deepEqual(mapped, {
    id: "m1",
    sender: "a@example.com",
    recipients: ["b@example.com"],
    subject: "hello",
    isRead: true,
    receivedAt: null
  });
});

test("syncEmails supports pagination and incremental sync token updates", async () => {
  const storage = createMemoryStorage({ lastSyncToken: "sync-v1" });
  const fetchCalls = [];
  const responses = [
    {
      emails: [{ id: "1", from: "a@x.com", to: ["b@x.com"], subject: "S1", read: false }],
      nextCursor: "cursor-2",
      syncToken: "sync-v2"
    },
    {
      emails: [{ id: "2", from: "c@x.com", to: ["d@x.com"], subject: "S2", read: true }],
      nextCursor: null,
      syncToken: "sync-v2"
    }
  ];

  const result = await syncEmails({
    fetchPage: async (params) => {
      fetchCalls.push(params);
      return responses[fetchCalls.length - 1];
    },
    storage,
    pageSize: 10,
    maxPagesPerSync: 5
  });

  assert.equal(fetchCalls.length, 2);
  assert.equal(fetchCalls[0].since, "sync-v1");
  assert.equal(fetchCalls[0].cursor, null);
  assert.equal(fetchCalls[1].cursor, "cursor-2");
  assert.equal(result.totalEmails, 2);
  assert.equal(result.hasMore, false);
  assert.equal(storage.getEmails().length, 2);
  assert.equal(storage.getState().lastSyncToken, "sync-v2");
});

test("syncEmails retries retryable errors and returns retryable message when exhausted", async () => {
  const storage = createMemoryStorage();
  let callCount = 0;

  await assert.rejects(
    () => syncEmails({
      fetchPage: async () => {
        callCount += 1;
        const error = new Error("timeout");
        error.code = "ETIMEDOUT";
        throw error;
      },
      storage,
      maxRetries: 1
    }),
    (error) => {
      assert.equal(error instanceof MailSyncError, true);
      assert.equal(error.retryable, true);
      assert.equal(error.userMessage, "同步失敗，請檢查網路後重試。");
      return true;
    }
  );

  assert.equal(callCount, 2);
});

test("syncEmails persists incremental cursor even when API does not return syncToken", async () => {
  const storage = createMemoryStorage({ lastSyncToken: null });

  const result = await syncEmails({
    fetchPage: async () => ({
      emails: [],
      nextCursor: null
    }),
    storage
  });

  assert.equal(typeof result.lastSyncToken, "string");
  assert.ok(result.lastSyncToken.length > 0);
  assert.equal(storage.getState().lastSyncToken, result.lastSyncToken);
});
