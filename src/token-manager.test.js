"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { TokenManagerError, isTokenExpired, createTokenManager } = require("./token-manager");

const makeStorage = (initial = null) => {
  let stored = initial;
  return {
    load: async () => stored,
    save: async (data) => { stored = { ...data }; },
    clear: async () => { stored = null; },
    peek: () => stored
  };
};

test("isTokenExpired returns true when expiresAt is in the past", () => {
  assert.equal(isTokenExpired(Date.now() - 1000), true);
});

test("isTokenExpired returns true when expiresAt is within buffer window", () => {
  assert.equal(isTokenExpired(Date.now() + 30 * 1000), true);
});

test("isTokenExpired returns false when expiresAt is beyond buffer", () => {
  assert.equal(isTokenExpired(Date.now() + 5 * 60 * 1000), false);
});

test("isTokenExpired returns true when expiresAt is null or undefined", () => {
  assert.equal(isTokenExpired(null), true);
  assert.equal(isTokenExpired(undefined), true);
});

test("createTokenManager throws when storage is missing methods", () => {
  assert.throws(
    () => createTokenManager({ storage: {}, refreshTokenFn: async () => {} }),
    TypeError
  );
});

test("createTokenManager throws when refreshTokenFn is not a function", () => {
  const storage = makeStorage();
  assert.throws(
    () => createTokenManager({ storage, refreshTokenFn: null }),
    TypeError
  );
});

test("getToken returns stored token when it is not expired", async () => {
  const tokenData = {
    accessToken: "access_abc",
    refreshToken: "refresh_xyz",
    expiresAt: Date.now() + 10 * 60 * 1000
  };
  const storage = makeStorage(tokenData);
  const manager = createTokenManager({
    storage,
    refreshTokenFn: async () => { throw new Error("should not be called"); }
  });

  const result = await manager.getToken();
  assert.equal(result.accessToken, "access_abc");
});

test("getToken triggers refresh when token is expired", async () => {
  const expired = {
    accessToken: "old_access",
    refreshToken: "rf_token",
    expiresAt: Date.now() - 1000
  };
  const storage = makeStorage(expired);
  const manager = createTokenManager({
    storage,
    refreshTokenFn: async () => ({
      accessToken: "new_access",
      expiresAt: Date.now() + 10 * 60 * 1000
    })
  });

  const result = await manager.getToken();
  assert.equal(result.accessToken, "new_access");
  assert.equal(storage.peek().accessToken, "new_access");
});

test("getToken throws requiresReauth when no token is stored", async () => {
  const storage = makeStorage(null);
  const manager = createTokenManager({
    storage,
    refreshTokenFn: async () => {}
  });

  await assert.rejects(
    () => manager.getToken(),
    (error) => {
      assert.ok(error instanceof TokenManagerError);
      assert.equal(error.requiresReauth, true);
      return true;
    }
  );
});

test("revokeToken clears storage and calls onTokenRevoked", async () => {
  const storage = makeStorage({ accessToken: "tok" });
  let revoked = false;
  const manager = createTokenManager({
    storage,
    refreshTokenFn: async () => {},
    onTokenRevoked: () => { revoked = true; }
  });

  await manager.revokeToken();
  assert.equal(storage.peek(), null);
  assert.equal(revoked, true);
});

test("saveToken persists token and returns stored shape", async () => {
  const storage = makeStorage(null);
  const manager = createTokenManager({
    storage,
    refreshTokenFn: async () => {}
  });

  const saved = await manager.saveToken({
    accessToken: "tok_new",
    refreshToken: "rf_new",
    expiresIn: 3600
  });

  assert.equal(saved.accessToken, "tok_new");
  assert.ok(typeof saved.expiresAt === "number");
  assert.equal(storage.peek().accessToken, "tok_new");
});
