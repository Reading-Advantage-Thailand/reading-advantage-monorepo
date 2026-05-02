import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../password.js";

describe("password", () => {
  it("hashes a password", async () => {
    const hash = await hashPassword("mySecretPassword123");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("mySecretPassword123");
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
  });

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

  it("generates different hashes for the same password", async () => {
    const hash1 = await hashPassword("samePassword");
    const hash2 = await hashPassword("samePassword");
    expect(hash1).not.toBe(hash2);
    // But both should verify
    expect(await verifyPassword("samePassword", hash1)).toBe(true);
    expect(await verifyPassword("samePassword", hash2)).toBe(true);
  });
});
