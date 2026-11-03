import { createHmac, randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { scriptedSql } from "../../../__tests__/support/scripted-sql.js";
import { createPostgresCompanyLoginRateLimit } from "../postgres-rate-limit.js";

const keyBytes = Buffer.alloc(32, 7);
const KEY = keyBytes.toString("base64url");
const NOW = new Date("2026-01-01T00:00:00.000Z");

/**
 * Computes the expected keyed identifier hash.
 * @param value Normalized identifier.
 * @returns Hex HMAC-SHA256 digest.
 */
function hmac(value: string): string {
  return createHmac("sha256", keyBytes).update(value).digest("hex");
}

describe("PostgreSQL company login rate limit", () => {
  it.each([
    ["a short key", Buffer.alloc(31, 1).toString("base64url")],
    ["a non-canonical key", `${randomBytes(32).toString("base64url")}=`],
    ["a standard base64 key", Buffer.alloc(32, 0xfb).toString("base64")],
  ])("rejects %s", (_label, identifierHashKey) => {
    const db = scriptedSql([]);
    expect(() => createPostgresCompanyLoginRateLimit({ sql: db.sql, identifierHashKey })).toThrow("COMPANY_AUTH_IDENTIFIER_HASH_KEY_INVALID");
  });

  it("returns a frozen adapter", () => {
    const db = scriptedSql([]);
    expect(Object.isFrozen(createPostgresCompanyLoginRateLimit({ sql: db.sql, identifierHashKey: KEY }))).toBe(true);
  });

  it("checks the normalized username hash and the trimmed IP hash", async () => {
    const db = scriptedSql([[]]);
    const limit = createPostgresCompanyLoginRateLimit({ sql: db.sql, identifierHashKey: KEY });

    await expect(limit.check({ username: "  ＡＤＭＩＮ  ", ipAddress: " 10.0.0.1 ", now: NOW })).resolves.toBe(true);
    expect(db.bindings[0]).toEqual([hmac("admin"), hmac("10.0.0.1")]);
    expect(db.bindings[0]).not.toContain("admin");
  });

  it.each([
    ["no block", [{ blocked_until: null }], true],
    ["an expired block", [{ blocked_until: new Date(NOW.getTime() - 1) }], true],
    ["a block that ends now", [{ blocked_until: NOW }], true],
    ["an active block", [{ blocked_until: new Date(NOW.getTime() + 1) }], false],
    ["one active block of two", [{ blocked_until: null }, { blocked_until: new Date(NOW.getTime() + 60_000) }], false],
  ])("returns the allowed state for %s", async (_label, rows, allowed) => {
    const db = scriptedSql([rows]);
    const limit = createPostgresCompanyLoginRateLimit({ sql: db.sql, identifierHashKey: KEY });

    await expect(limit.check({ username: "user", ipAddress: "10.0.0.1", now: NOW })).resolves.toBe(allowed);
  });

  it("upserts a 5-attempt username bucket and a 30-attempt IP bucket in one transaction", async () => {
    const db = scriptedSql([[], []]);
    const limit = createPostgresCompanyLoginRateLimit({ sql: db.sql, identifierHashKey: KEY });

    await limit.recordFailure({ username: "User", ipAddress: "10.0.0.1", now: NOW });
    expect(db.transactions()).toBe(1);
    expect(db.statements).toHaveLength(2);
    const windowStart = new Date(NOW.getTime() - 15 * 60_000);
    const blockedUntil = new Date(NOW.getTime() + 15 * 60_000);
    expect(db.bindings[0]).toEqual(["USERNAME", hmac("user"), NOW, NOW, NOW, windowStart, windowStart, NOW, NOW, windowStart, 5, blockedUntil, NOW]);
    expect(db.bindings[1]).toEqual(["IP", hmac("10.0.0.1"), NOW, NOW, NOW, windowStart, windowStart, NOW, NOW, windowStart, 30, blockedUntil, NOW]);
    expect(db.statements[0]).toContain("on conflict (kind, identifier_hash) do update");
  });

  it("propagates a failed upsert", async () => {
    const db = scriptedSql([() => { throw new Error("write failed"); }]);
    const limit = createPostgresCompanyLoginRateLimit({ sql: db.sql, identifierHashKey: KEY });

    await expect(limit.recordFailure({ username: "user", ipAddress: "10.0.0.1", now: NOW })).rejects.toThrow("write failed");
  });

  it("clears only the username bucket on success", async () => {
    const db = scriptedSql([[]]);
    const limit = createPostgresCompanyLoginRateLimit({ sql: db.sql, identifierHashKey: KEY });

    await limit.recordSuccess({ username: " User ", now: NOW });
    expect(db.statements[0]).toContain("delete from company_login_rate_limit_buckets");
    expect(db.statements[0]).toContain("kind = 'USERNAME'");
    expect(db.statements[0]).not.toContain("'IP'");
    expect(db.bindings[0]).toEqual([hmac("user")]);
  });
});
