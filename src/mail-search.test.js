"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { DEFAULT_EMPTY_MESSAGE, MailSearchError, searchEmails } = require("./mail-search");

const sampleEmails = [
  {
    id: "1",
    sender: "alerts@shop.com",
    subject: "Flash sale",
    body: "Limited coupon today",
    labels: ["Promo"],
    isRead: false,
    receivedAt: "2026-04-20T08:00:00.000Z"
  },
  {
    id: "2",
    sender: "billing@bank.com",
    subject: "Invoice reminder",
    body: "Please pay before due date",
    labels: ["Finance"],
    isRead: true,
    receivedAt: "2026-04-21T08:00:00.000Z"
  },
  {
    id: "3",
    sender: "support@shop.com",
    subject: "Order update",
    body: "Your order has shipped",
    labels: ["Orders", "Important"],
    isRead: false,
    receivedAt: "2026-04-19T08:00:00.000Z"
  }
];

test("searchEmails supports sender/label/read/date filters with keyword search", () => {
  const result = searchEmails({
    emails: sampleEmails,
    filters: {
      sender: "shop.com",
      label: "promo",
      isRead: false,
      dateFrom: "2026-04-20T00:00:00.000Z",
      dateTo: "2026-04-21T00:00:00.000Z"
    },
    keyword: "coupon"
  });

  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, "1");
});

test("searchEmails sorts results and returns stable pagination metadata", () => {
  const result = searchEmails({
    emails: sampleEmails,
    sortBy: "sender",
    sortOrder: "asc",
    page: 2,
    pageSize: 1
  });

  assert.equal(result.total, 3);
  assert.equal(result.page, 2);
  assert.equal(result.totalPages, 3);
  assert.equal(result.hasPreviousPage, true);
  assert.equal(result.hasNextPage, true);
  assert.equal(result.items[0].id, "2");
});

test("searchEmails returns clear empty-state message when no matches", () => {
  const result = searchEmails({
    emails: sampleEmails,
    filters: { sender: "missing.example.com" }
  });

  assert.equal(result.total, 0);
  assert.deepEqual(result.items, []);
  assert.equal(result.emptyMessage, DEFAULT_EMPTY_MESSAGE);
});

test("searchEmails throws clear validation errors for invalid inputs", () => {
  assert.throws(
    () => searchEmails({ emails: null }),
    (error) => {
      assert.equal(error instanceof MailSearchError, true);
      assert.equal(error.userMessage, "搜尋條件格式錯誤，請重新整理頁面後再試。");
      return true;
    }
  );

  assert.throws(
    () => searchEmails({ emails: sampleEmails, page: 0 }),
    (error) => {
      assert.equal(error instanceof MailSearchError, true);
      assert.equal(error.userMessage, "分頁參數錯誤，請重新設定後再試。");
      return true;
    }
  );
});
