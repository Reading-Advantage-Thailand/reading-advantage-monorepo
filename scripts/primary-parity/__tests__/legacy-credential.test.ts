import { scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as credential from "../legacy-credential.js";

/** API that Phase 3 adds: hashLegacyPassword(password) and verifyLegacyPassword({hash, password}). */
const api = credential as unknown as {
  hashLegacyPassword: (password: string) => Promise<string>;
  verifyLegacyPassword: (input: { hash: string; password: string }) => Promise<boolean>;
};

/**
 * Independent check of the legacy algorithm (bfea121 lib/password.ts:8-45):
 * scrypt N 16384, r 16, p 1, 64 bytes, NFKC, and the hex salt text used as the salt string.
 */
function legacyVerify(hash: string, password: string): boolean {
  const [salt, key] = hash.split(":");
  const derived = scryptSync(password.normalize("NFKC"), salt, 64, { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 });
  return derived.toString("hex") === key;
}

describe("legacy credential hash", () => {
  it("has the format <32 hex>:<128 hex>", async () => {
    const hash = await api.hashLegacyPassword("k7mq-x3ra-p9vd");
    expect(hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("is accepted by the legacy algorithm", async () => {
    const hash = await api.hashLegacyPassword("k7mq-x3ra-p9vd");
    expect(legacyVerify(hash, "k7mq-x3ra-p9vd")).toBe(true);
  });

  it("is refused by the legacy algorithm for another password", async () => {
    const hash = await api.hashLegacyPassword("k7mq-x3ra-p9vd");
    expect(legacyVerify(hash, "k7mq-x3ra-p9ve")).toBe(false);
  });

  it("uses a new salt for each hash", async () => {
    const a = await api.hashLegacyPassword("same-password");
    const b = await api.hashLegacyPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("normalizes the password with NFKC", async () => {
    const hash = await api.hashLegacyPassword("ｐａｓｓ１２３");
    expect(legacyVerify(hash, "pass123")).toBe(true);
  });

  it("verifies its own hash and refuses a wrong password", async () => {
    const hash = await api.hashLegacyPassword("right-one");
    await expect(api.verifyLegacyPassword({ hash, password: "right-one" })).resolves.toBe(true);
    await expect(api.verifyLegacyPassword({ hash, password: "wrong-one" })).resolves.toBe(false);
  });

  it("refuses a malformed hash", async () => {
    await expect(api.verifyLegacyPassword({ hash: "nocolon", password: "x" })).resolves.toBe(false);
  });
});
