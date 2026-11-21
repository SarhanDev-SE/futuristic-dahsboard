import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import {
  extractBearerToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  validateCredentials,
  verifyPassword,
} from "./auth.ts";

test("hashPassword and verifyPassword validate matching and reject wrong passwords", () => {
  const hash = hashPassword("correct-horse-99");
  assert.ok(hash.includes(":"));
  assert.equal(verifyPassword("correct-horse-99", hash), true);
  assert.equal(verifyPassword("wrong-password", hash), false);
  assert.equal(verifyPassword("correct-horse-99", "malformed-hash"), false);
});

test("normalizeEmail trims and lowercases input", () => {
  assert.equal(normalizeEmail("  Alex@Home.IO "), "alex@home.io");
});

test("validateCredentials enforces email, password length, and registration name", () => {
  assert.ok(validateCredentials({ email: "invalid", password: "password1", isRegister: false }));
  assert.ok(validateCredentials({ email: "a@b.com", password: "short", isRegister: false }));
  assert.equal(validateCredentials({ email: "a@b.com", password: "password1", isRegister: false }), null);
  assert.ok(validateCredentials({ email: "a@b.com", password: "password1", name: "A", isRegister: true }));
  assert.equal(
    validateCredentials({ email: "a@b.com", password: "password1", name: "Alex", isRegister: true }),
    null
  );
});

test("hashSessionToken produces deterministic sha256 hex digest", () => {
  const a = hashSessionToken("sample-token");
  const b = hashSessionToken("sample-token");
  const c = hashSessionToken("other-token");
  assert.equal(a.length, 64);
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("extractBearerToken parses Authorization Bearer header cleanly", () => {
  assert.equal(
    extractBearerToken({ headers: { authorization: "Bearer abc123" } } as Request),
    "abc123"
  );
  assert.equal(extractBearerToken({ headers: { authorization: "Basic xyz" } } as Request), null);
  assert.equal(extractBearerToken({ headers: {} } as Request), null);
});
