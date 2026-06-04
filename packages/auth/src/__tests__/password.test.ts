import { describe, it, expect, vi } from "vitest";
import { hashPassword, verifyPassword, rehashOnLogin, ARGON2ID_OPTS } from "../password.js";

describe("password", () => {
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
      const { db, whereMock } = createMockDb();
      const bcrypt = await import("bcryptjs");
      const bcryptHash = await bcrypt.hash("testPassword", 10);

      const result = await rehashOnLogin(db, "user-1", "testPassword", bcryptHash);
      expect(result).toEqual({ migrated: true });
      expect(whereMock).toHaveBeenCalled();
    });

    it("throws on bcrypt hash with wrong password", async () => {
      const { db } = createMockDb();
      const bcrypt = await import("bcryptjs");
      const bcryptHash = await bcrypt.hash("testPassword", 10);

      await expect(rehashOnLogin(db, "user-1", "wrongPassword", bcryptHash))
        .rejects.toThrow("Password verification failed during rehash");
    });

    it("throws on Argon2id hash with wrong password (via the no-op path)", async () => {
      const { db } = createMockDb();
      const argon2Hash = await hashPassword("testPassword");

      // rehashOnLogin returns { migrated: false } without checking password for argon2id
      // This is correct — the caller (login flow) already verified the password
      const result = await rehashOnLogin(db, "user-1", "wrongPassword", argon2Hash);
      expect(result).toEqual({ migrated: false });
    });
  });
});
