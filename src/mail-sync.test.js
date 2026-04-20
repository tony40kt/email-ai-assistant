"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { DEFAULT_SYNC_ERROR_MESSAGE, MailSyncError, mapEmailModel, syncEmails } = require("./mail-sync");

const createMemoryStorage = (initialState = { lastSyncToken: null }) => {
  const db = {
    state: { ...initialState },
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

test("mapEmailModel supports single and object recipient inputs", () => {
  assert.deepEqual(
    mapEmailModel({
      id: "m2",
      sender: "sender@example.com",
      recipients: "one@example.com",
      subject: "single"
    }).recipients,
    ["one@example.com"]
  );

  assert.deepEqual(
    mapEmailModel({
      id: "m3",
      sender: "sender@example.com",
      recipients: { email: "obj@example.com" },
      subject: "object"
    }).recipients,
    ["obj@example.com"]
  );
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
      assert.equal(error.userMessage, DEFAULT_SYNC_ERROR_MESSAGE);
      return true;
    }
  );

  assert.equal(callCount, 2);
});

test("syncEmails persists lastSyncedAt fallback when syncToken is absent", async () => {
  const storage = createMemoryStorage({ lastSyncToken: null });

  const result = await syncEmails({
    fetchPage: async () => ({
      emails: [],
      nextCursor: null
    }),
    storage
  });

  assert.equal(result.lastSyncToken, null);
  assert.equal(typeof result.sinceMarker, "string");
  assert.ok(result.sinceMarker.length > 0);
  assert.equal(storage.getState().lastSyncToken, null);
  assert.equal(storage.getState().lastSyncedAt, result.sinceMarker);
});

test("syncEmails preserves state and stores resume cursor when max pages are reached", async () => {
  const storage = createMemoryStorage({
    lastSyncToken: "sync-v1",
    customPreference: "keep-me"
  });
  const calls = [];

  const firstResult = await syncEmails({
    fetchPage: async (params) => {
      calls.push(params);
      return {
        emails: [{ id: "1", from: "a@x.com", to: "b@x.com", subject: "S1", read: false }],
        nextCursor: "cursor-2",
        syncToken: "sync-v2"
      };
    },
    storage,
    maxPagesPerSync: 1
  });

  assert.equal(firstResult.hasMore, true);
  assert.equal(firstResult.sinceMarker, "sync-v1");
  assert.equal(calls[0].cursor, null);
  assert.equal(calls[0].since, "sync-v1");
  assert.equal(storage.getState().lastSyncToken, "sync-v1");
  assert.equal(storage.getState().syncCursor, "cursor-2");
  assert.equal(storage.getState().syncSinceMarker, "sync-v1");
  assert.equal(storage.getState().customPreference, "keep-me");
});

test("syncEmails resumes from stored cursor and advances markers after pagination drains", async () => {
  const storage = createMemoryStorage({
    lastSyncToken: "sync-v1",
    syncCursor: "cursor-2",
    syncSinceMarker: "sync-v1"
  });
  const calls = [];

  const result = await syncEmails({
    fetchPage: async (params) => {
      calls.push(params);
      return {
        emails: [{ id: "2", from: "c@x.com", to: "d@x.com", subject: "S2", read: true }],
        nextCursor: null,
        syncToken: "sync-v2"
      };
    },
    storage,
    maxPagesPerSync: 1
  });

  assert.equal(calls[0].cursor, "cursor-2");
  assert.equal(calls[0].since, "sync-v1");
  assert.equal(result.hasMore, false);
  assert.equal(result.lastSyncToken, "sync-v2");
  assert.equal(storage.getState().lastSyncToken, "sync-v2");
  assert.equal(storage.getState().syncCursor, null);
  assert.equal(storage.getState().syncSinceMarker, null);
});
