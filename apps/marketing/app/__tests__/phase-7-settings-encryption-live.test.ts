// @vitest-environment node
/**
 * Phase 7.2 — live settings encryption invariant.
 *
 * Exercises POST and GET through the route boundary against PGlite, then
 * inspects the raw persisted value directly, then independently decrypts it
 * to prove a lossless production-helper round trip.
 *
 * The settings schema only accepts the four keys the settings page writes,
 * so legacy secret keys are asserted to be rejected with 400 before any
 * DB write.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

import { createTestDb, type TestDb } from "./helpers/testDb";
import { authedRequest } from "./helpers/auth-mock";
import { decrypt } from "@/lib/encryption";

const TEST_ENCRYPTION_KEY =
  "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy(
    {},
    {
      get(_target, property) {
        const testDb = (globalThis as Record<string, unknown>).__TEST_DB__ as
          | Record<string | symbol, unknown>
          | undefined;
        if (!testDb) throw new Error("Test DB not initialized");
        const value = testDb[property];
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(testDb)
          : value;
      },
    },
  );
  return { ...actual, db: dbProxy };
});

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

import { GET, POST } from "@/api/settings/route";

const SECRET_CASES = [
  ["llm.apiKey", "sk-phase7-live-api-key-12345"],
] as const;

const REJECTED_LEGACY_KEYS = ["provider.secret", "oauth.token"] as const;

let testDb: TestDb;

describe("Phase 7.2: settings encryption live invariant", () => {
  beforeAll(async () => {
    vi.stubEnv("ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);
    testDb = await createTestDb();
  }, 60_000);

  afterEach(async () => {
    await testDb.reset();
  });

  afterAll(async () => {
    try {
      await testDb?.close();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each(SECRET_CASES)(
    "encrypts %s at rest and masks it on GET",
    async (key, plaintext) => {
      const postResponse = await POST(
        authedRequest("http://localhost/api/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ [key]: plaintext }),
        }),
      );

      expect(postResponse.status).toBe(200);

      const rawRows = await testDb.db.execute(
        sql`SELECT value FROM settings WHERE key = ${key}`,
      );
      expect(rawRows.rows).toHaveLength(1);
      const persistedValue = String(
        (rawRows.rows[0] as { value: unknown }).value,
      );
      expect(persistedValue).not.toContain(plaintext);

      const fields = persistedValue.split(":");
      expect(fields).toHaveLength(3);
      const [iv = "", authTag = "", ciphertext = ""] = fields;
      for (const field of [iv, authTag, ciphertext]) {
        expect(field).toMatch(/^[0-9a-f]+$/);
        expect(field.length % 2).toBe(0);
      }
      expect(iv).toHaveLength(24);
      expect(authTag).toHaveLength(32);
      expect(ciphertext.length).toBeGreaterThan(0);
      expect(decrypt(persistedValue)).toBe(plaintext);

      const getResponse = await GET(
        authedRequest("http://localhost/api/settings"),
      );
      expect(getResponse.status).toBe(200);
      const responseBody = (await getResponse.json()) as Record<string, string>;
      expect(responseBody[key]).toBe("••••");
      expect(JSON.stringify(responseBody)).not.toContain(plaintext);
    },
  );

  it.each(REJECTED_LEGACY_KEYS)(
    "rejects legacy secret key %s with 400 before any DB write",
    async (key) => {
      const postResponse = await POST(
        authedRequest("http://localhost/api/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ [key]: "phase7-live-legacy-secret" }),
        }),
      );

      expect(postResponse.status).toBe(400);

      const rawRows = await testDb.db.execute(
        sql`SELECT value FROM settings WHERE key = ${key}`,
      );
      expect(rawRows.rows).toHaveLength(0);
    },
  );
});
