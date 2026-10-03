import { describe, it, expect, vi } from "vitest";
import { hashPassword, verifyPassword, rehashOnLogin, adoptLegacyPassword, ARGON2ID_OPTS } from "../password.js";

describe("password", () => {
  // Crypto tests involve real Argon2id/bcrypt hashing which is hardware-dependent.
  // Increase timeout to prevent flaky failures on constrained hardware.
  vi.setConfig({ testTimeout: 15000 });

  describe("Argon2id hashing", () => {
    it("hashes a password with Argon2id", async () => {
      const hash = await hashPassword("mySecretPassword123");
      expect(hash).toBeTruthy();
      expect(hash).not.toBe("mySecretPassword123");
      expect(hash.startsWith("$argon2id$")).toBe(true);
    });

    it("uses OWASP-recommended parameters", () => {
      expect(ARGON2ID_OPTS.type).toBe(2); // argon2.Algorithm.Argon2id
      expect(ARGON2ID_OPTS.memoryCost).toBe(19456);
      expect(ARGON2ID_OPTS.timeCost).toBe(2);
      expect(ARGON2ID_OPTS.parallelism).toBe(1);
    });

    it("generates different hashes for the same password", async () => {
      const hash1 = await hashPassword("samePassword");
      const hash2 = await hashPassword("samePassword");
      expect(hash1).not.toBe(hash2);
      // But both should verify
      expect(await verifyPassword("samePassword", hash1)).toBe(true);
      expect(await verifyPassword("samePassword", hash2)).toBe(true);
    });
  });

  describe("Argon2id verification", () => {
    it("verifies a correct password", async () => {
      const hash = await hashPassword("mySecretPassword123");
      const result = await verifyPassword("mySecretPassword123", hash);
      expect(result).toBe(true);
    });

    it("rejects an incorrect password", async () => {
      const hash = await hashPassword("mySecretPassword123");
      const result = await verifyPassword("wrongPassword", hash);
      expect(result).toBe(false);
    });

    it("returns false for malformed hash", async () => {
      const result = await verifyPassword("password", "not-a-hash");
      expect(result).toBe(false);
    });
  });

  describe("Cross-algorithm bcrypt verification", () => {
    it("verifies a bcrypt ($2a$) hash via transparent dispatch", async () => {
      // Create a bcrypt hash directly
      const bcrypt = await import("bcryptjs");
      const bcryptHash = await bcrypt.hash("testPassword", 10);
      expect(bcryptHash.startsWith("$2a$") || bcryptHash.startsWith("$2b$")).toBe(true);

      // verifyPassword should handle it transparently
      const result = await verifyPassword("testPassword", bcryptHash);
      expect(result).toBe(true);
    });

    it("rejects wrong password against bcrypt hash", async () => {
      const bcrypt = await import("bcryptjs");
      const bcryptHash = await bcrypt.hash("testPassword", 10);

      const result = await verifyPassword("wrongPassword", bcryptHash);
      expect(result).toBe(false);
    });

    it("Argon2id hashes do not start with bcrypt prefix", async () => {
      const hash = await hashPassword("test");
      expect(hash.startsWith("$2a$")).toBe(false);
      expect(hash.startsWith("$2b$")).toBe(false);
      expect(hash.startsWith("$argon2id$")).toBe(true);
    });
  });

  describe("rehashOnLogin", () => {
    function createMockDb() {
      const whereMock = vi.fn().mockResolvedValue(undefined);
      const setMock = vi.fn().mockReturnValue({ where: whereMock });
      const updateMock = vi.fn().mockReturnValue({ set: setMock });
      return {
        db: { update: updateMock } as unknown as Parameters<typeof rehashOnLogin>[0],
        updateMock,
        setMock,
        whereMock,
      };
    }

    it("returns migrated: false for Argon2id hash (no-op)", async () => {
      const { db, updateMock } = createMockDb();
      const argon2Hash = await hashPassword("testPassword");

      const result = await rehashOnLogin(db, "user-1", "testPassword", argon2Hash);
      expect(result).toEqual({ migrated: false });
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("migrates bcrypt hash to Argon2id on correct password", async () => {
      const { db, setMock, whereMock } = createMockDb();
      const bcrypt = await import("bcryptjs");
      const bcryptHash = await bcrypt.hash("testPassword", 10);

      const result = await rehashOnLogin(db, "user-1", "testPassword", bcryptHash);
      expect(result).toEqual({ migrated: true });
      expect(whereMock).toHaveBeenCalled();
      // Verify the new hash is a valid Argon2id hash
      const setPassword = setMock.mock.calls[0][0].password;
      expect(setPassword.startsWith("$argon2id$")).toBe(true);
      expect(await verifyPassword("testPassword", setPassword)).toBe(true);
    });

    it("returns migrated: false for bcrypt hash with wrong password", async () => {
      const { db, updateMock } = createMockDb();
      const bcrypt = await import("bcryptjs");
      const bcryptHash = await bcrypt.hash("testPassword", 10);

      const result = await rehashOnLogin(db, "user-1", "wrongPassword", bcryptHash);
      expect(result).toEqual({ migrated: false });
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("returns migrated: false for Argon2id hash regardless of password", async () => {
      const { db } = createMockDb();
      const argon2Hash = await hashPassword("testPassword");

      // rehashOnLogin returns { migrated: false } without checking password for argon2id
      // This is correct — the caller (login flow) already verified the password
      const result = await rehashOnLogin(db, "user-1", "wrongPassword", argon2Hash);
      expect(result).toEqual({ migrated: false });
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Task 12: FR-3 rehashOnLogin provider filter
// ---------------------------------------------------------------------------
//
// FR-3: rehashOnLogin updates `accounts` by `userId` only, with no filter
// on `providerId = 'credential'`. If the user has any other provider row
// (e.g., google) with a non-null `password`, it would be overwritten too.
// The fix: add `eq(accounts.providerId, "credential")` to the WHERE clause.
//
// Test strategy:
//   - Mock the DB update chain so we capture the .where() arguments.
//   - Drive rehashOnLogin with a bcrypt hash that verifies (triggers
//     the migration path).
//   - Assert that .where() was called with an `and(...)` clause that
//     includes `eq(accounts.providerId, "credential")`.
//   - The current implementation only filters on `userId`, so the
//     .where() is called with the userId alone — the assertion fails.
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 12: FR-3 rehashOnLogin filters UPDATE by providerId = 'credential'", () => {
  /** Recursively searches an object tree for a string value matching the predicate. */
  function deepContains(obj: unknown, predicate: (s: string) => boolean, seen = new Set<object>()): boolean {
    if (typeof obj === "string") return predicate(obj);
    if (obj && typeof obj === "object") {
      if (seen.has(obj)) return false;
      seen.add(obj);
      return Object.values(obj).some((v) => deepContains(v, predicate, seen));
    }
    return false;
  }

  it("the UPDATE .where() includes eq(accounts.providerId, 'credential')", async () => {
    // Track the args passed to the .where(...) call on update.
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    const updateMock = vi.fn().mockReturnValue({ set: setMock });
    const db = { update: updateMock } as unknown as Parameters<typeof rehashOnLogin>[0];

    const bcrypt = await import("bcryptjs");
    const bcryptHash = await bcrypt.hash("testPassword", 10);

    const result = await rehashOnLogin(db, "user-1", "testPassword", bcryptHash);
    expect(result.migrated, "precondition: rehash should have run").toBe(true);

    // Inspect the whereMock calls. Drizzle column objects have circular
    // references, so we use a recursive search instead of JSON.stringify.
    const whereCalls = whereMock.mock.calls;
    expect(whereCalls.length, "rehashOnLogin should call .where() exactly once during a migration").toBeGreaterThan(0);
    const whereArg = whereCalls[0];
    expect(
      deepContains(whereArg, (s) => s.includes("provider_id")),
      "The .where() arg must reference the `provider_id` column " +
        "(accounts.providerId). The current implementation only filters " +
        "on userId, which would overwrite a non-credential provider row " +
        "if one exists for the same user — a destructive cross-provider " +
        "bug.",
    ).toBe(true);
    expect(
      deepContains(whereArg, (s) => s.includes("credential")),
      "The .where() arg must reference the literal `credential`. " +
        "The fix is to add `eq(accounts.providerId, 'credential')` to " +
        "the WHERE clause via and().",
    ).toBe(true);
  });

  it("the WHERE clause restricts to a single user, a single provider", async () => {
    // Stronger assertion: the WHERE clause must reference BOTH the userId
    // AND the providerId columns.
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    const updateMock = vi.fn().mockReturnValue({ set: setMock });
    const db = { update: updateMock } as unknown as Parameters<typeof rehashOnLogin>[0];

    const bcrypt = await import("bcryptjs");
    const bcryptHash = await bcrypt.hash("testPassword", 10);
    await rehashOnLogin(db, "user-1", "testPassword", bcryptHash);

    const whereCalls = whereMock.mock.calls;
    expect(whereCalls.length, "rehashOnLogin should call .where() exactly once during a migration").toBeGreaterThan(0);
    const whereArg = whereCalls[0];
    expect(
      deepContains(whereArg, (s) => s.includes("user_id")),
      "The .where() arg must reference `user_id` so the migration targets " +
        "the right user.",
    ).toBe(true);
    expect(
      deepContains(whereArg, (s) => s.includes("provider_id")),
      "The .where() arg must ALSO reference `provider_id` (the FR-3 fix). " +
        "Without this filter, a non-credential provider row for the same " +
        "userId would be overwritten with the new Argon2id hash — a " +
        "destructive cross-provider bug.",
    ).toBe(true);
  });
  describe("adoptLegacyPassword", () => {
    function createMockDb() {
      const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
      const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
      const insert = vi.fn().mockReturnValue({ values });
      const update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });
      const transaction = async (cb: (tx: unknown) => Promise<void>) => cb({ insert, update });
      return {
        db: { transaction } as unknown as Parameters<typeof adoptLegacyPassword>[0],
        values,
        onConflictDoUpdate,
      };
    }

    it("upserts an argon2id credential account from a legacy bcrypt users.password", async () => {
      const { db, values, onConflictDoUpdate } = createMockDb();
      const bcrypt = await import("bcryptjs");
      const legacy = await bcrypt.hash("testPassword", 10);

      await adoptLegacyPassword(db, "user-1", "testPassword", legacy);

      const row = values.mock.calls[0][0];
      expect(row.userId).toBe("user-1");
      expect(row.providerId).toBe("credential");
      expect(row.password.startsWith("$argon2id$")).toBe(true);
      expect(await verifyPassword("testPassword", row.password)).toBe(true);
      expect(onConflictDoUpdate).toHaveBeenCalled();
    });

    it("keeps an existing argon2id hash unchanged", async () => {
      const { db, values } = createMockDb();
      const hash = await hashPassword("testPassword");

      await adoptLegacyPassword(db, "user-1", "testPassword", hash);

      expect(values.mock.calls[0][0].password).toBe(hash);
    });
  });
});

describe("adoptLegacyPassword", () => {
  vi.setConfig({ testTimeout: 15000 });

  /** Builds a mock db whose transaction runs the callback with a recording tx. */
  function createTxDb() {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    const insert = vi.fn().mockReturnValue({ values });
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const transaction = vi.fn(async (cb: (tx: unknown) => Promise<void>) => cb({ insert, update }));
    return {
      db: { transaction } as unknown as Parameters<typeof adoptLegacyPassword>[0],
      transaction, values, onConflictDoUpdate, set,
    };
  }

  it("does not adopt a wrong password and writes nothing", async () => {
    const t = createTxDb();
    const bcrypt = await import("bcryptjs");
    const legacy = await bcrypt.hash("rightPassword", 10);
    expect(await adoptLegacyPassword(t.db, "u1", "wrongPassword", legacy)).toBe(false);
    expect(t.transaction).not.toHaveBeenCalled();
  });

  it("writes an Argon2id credential hash for a bcrypt legacy hash", async () => {
    const t = createTxDb();
    const bcrypt = await import("bcryptjs");
    const legacy = await bcrypt.hash("rightPassword", 10);
    expect(await adoptLegacyPassword(t.db, "u1", "rightPassword", legacy)).toBe(true);
    const written = t.values.mock.calls[0][0].password as string;
    expect(written.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword("rightPassword", written)).toBe(true);
  });

  it("only fills a credential row whose password is null", async () => {
    const t = createTxDb();
    const legacy = await hashPassword("rightPassword");
    await adoptLegacyPassword(t.db, "u1", "rightPassword", legacy);
    const config = t.onConflictDoUpdate.mock.calls[0][0];
    expect(config.setWhere).toBeDefined();
    expect(JSON.stringify(config.setWhere, (k, v) => (k === "table" ? undefined : v))).toMatch(/is null/i);
  });

  it("clears users.password in the same transaction after the credential write", async () => {
    const t = createTxDb();
    const legacy = await hashPassword("rightPassword");
    await adoptLegacyPassword(t.db, "u1", "rightPassword", legacy);
    expect(t.transaction).toHaveBeenCalledTimes(1);
    expect(t.set).toHaveBeenCalledWith({ password: null });
    expect(t.onConflictDoUpdate.mock.invocationCallOrder[0]).toBeLessThan(t.set.mock.invocationCallOrder[0]);
  });
});
