/**
 * Phase 3 — Settings Page (Marketing Production Platform)
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 3)
 *
 * Per measure/tracks/video_pipeline_20260613/test-strategy.md §6:
 *   "P3 Settings: encrypt round-trip unit, 'test connection' integration
 *    with mocked AI client returning 200 vs 401."
 *
 * Per §7 the Red command is
 *   `pnpm --filter marketing test phase-3-settings`
 * and the Green gate additionally requires
 *   `phase-3-encrypt-roundtrip` (unit) and
 *   `phase-3-test-connection` (integration, mocked AI).
 *
 * This file is the bounded Red command target. It encodes the Phase 3
 * verification contract split into four tiers:
 *
 *   1. **Wiring invariants (Phase 3 tasks 1, 2, 5 — already [x]):**
 *      file-level + module-shape checks for the settings page module,
 *      the LLM provider dropdown, the masked API key input, and the
 *      mmx CLI path input. Pass at HEAD because the page exists.
 *
 *   2. **Encryption-at-rest contract (Phase 3 task 3 — [~]):**
 *      proves that the encryption module exports `encrypt`/`decrypt`
 *      that round-trip a plaintext API key without loss and that the
 *      ciphertext differs from the plaintext. **Red at HEAD** because
 *      no `@/lib/encryption` module exists yet — the import fails
 *      (expected: ERR_MODULE_NOT_FOUND or equivalent). The Jr agent
 *      must add the module so these tests go Green.
 *
 *   3. **Settings route encryption (Phase 3 task 3 + task 6 — [~]):**
 *      proves that POST `/api/settings` passes the encrypted ciphertext
 *      to `db.insert(settings).values(...)`, never the raw plaintext
 *      api key. Mocked `db` so no live Postgres is required. **Red at
 *      HEAD** because the current route calls `db.insert` with
 *      `String(value)` — the plaintext is stored. The Jr agent must
 *      wire the encryption module into the route so the value handed
 *      to Drizzle is ciphertext, not the raw API key.
 *
 *   4. **Test Connection integration (Phase 3 task 4 + task 6):**
 *      proves that POST `/api/settings/test-connection` delegates the
 *      request body to `createAIClient` from `@reading-advantage/ai`
 *      and returns 200 on success / 400 on AI failure. Mocked AI
 *      client so no real network round-trip is needed. Passes at
 *      HEAD (the route is already implemented and [x] in plan.md);
 *      kept here as a regression guard.
 *
 * The settings page itself does not handle the api key directly — the
 * `/api/settings` route does. The encryption layer is expected to live
 * at `apps/marketing/app/lib/encryption.ts` per test-strategy §3 (the
 * "single source of truth" lib layout). The §9 open question Q-VP-02
 * (pgcrypto vs app-layer libsodium) is unresolved; this test asserts
 * the round-trip *contract*, not the underlying library, so it remains
 * valid regardless of the eventual choice.
 */

import { describe, expect, it, vi, type Mock } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Deterministic 32-byte key used as a fallback when ENCRYPTION_KEY is
// not supplied to the test runner. Override via the environment
// variable to point at a real key for production runs.
process.env.ENCRYPTION_KEY ??=
  "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

// ─────────────────────────────────────────────────────────────────────
// Mock the Drizzle client. The mock factory's spread order matters:
//   { ...actual, ..., db: { insert: vi.fn(), select: vi.fn() } }
// The explicit `db` after the spread overrides any `db` exported from
// actual. This is the SAME pattern as phase-1-boot.test.ts so the
// Phase 3 settings route tests piggyback on it.
//
// We do NOT mock the encryption module — its absence is the entire
// point of the Red contract. Importing from `@/lib/encryption` is
// expected to fail at HEAD and become Green once the Jr agent
// implements the module.
// ─────────────────────────────────────────────────────────────────────
vi.mock("@reading-advantage/db", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/db")>(
    "@reading-advantage/db",
  );
  return {
    ...actual,
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({
        strings,
        values,
      }),
      { raw: (strings: TemplateStringsArray) => strings },
    ),
    db: {
      execute: vi.fn(),
      insert: vi.fn(),
      select: vi.fn(),
    },
  };
});

// Mock the AI client factory so the test-connection route does not
// call a real provider. The current route calls createAIClient and
// then .generateText() on the result; we capture both.
vi.mock("@reading-advantage/ai", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/ai")>(
    "@reading-advantage/ai",
  );
  const generateText = vi.fn();
  const fakeClient = { generateText };
  return {
    ...actual,
    createAIClient: vi.fn(() => fakeClient),
    getAIClient: vi.fn(() => fakeClient),
    resetAIClient: vi.fn(),
    // Re-export the fake client for tests to inspect:
    __fakeAIClient: fakeClient,
  };
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = resolve(__dirname, "..", "..");

function readText(relPath: string): string {
  return readFileSync(resolve(APP_ROOT, relPath), "utf8");
}

// ─────────────────────────────────────────────────────────────────────
// Tier 1: Wiring invariants — pass at HEAD, kept as regression guards
// ─────────────────────────────────────────────────────────────────────

describe("Phase 3: Settings Page — wiring invariants (tasks 1, 2, 5)", () => {
  describe("Settings page module (Phase 3 task 1)", () => {
    // FR-12: removed the `existsSync(...)` test — file presence is verified by
    // the build system, not the test suite.

    it("settings page is a default-exported React component", async () => {
      const { default: SettingsPage } = await import("@/settings/page");
      expect(SettingsPage).toBeDefined();
      expect(typeof SettingsPage).toBe("function");
    });

    it("settings page contains a heading identifying it as the Settings page", () => {
      const src = readText("app/settings/page.tsx");
      expect(src).toMatch(/<h1[^>]*>\s*Settings\s*<\/h1>/);
    });
  });

  describe("LLM config form (Phase 3 task 2)", () => {
    it("provider dropdown exposes Google and OpenAI options", () => {
      const src = readText("app/settings/page.tsx");
      // Look for <select> with <option value="google"> and <option value="openai">.
      // The current implementation uses raw strings — this asserts the contract
      // is preserved through the encryption refactor.
      expect(src).toMatch(/value="google"[^>]*>\s*Google/);
      expect(src).toMatch(/value="openai"[^>]*>\s*OpenAI/);
    });

    it("API key input is a masked (type='password') input", () => {
      const src = readText("app/settings/page.tsx");
      // The api key field must render as type="password" so the value
      // does not leak into the DOM in cleartext.
      expect(src).toMatch(/type="password"[\s\S]{0,200}apiKey/);
    });
  });

  describe("mmx CLI path config (Phase 3 task 5)", () => {
    it("mmx CLI path input is rendered on the settings page", () => {
      const src = readText("app/settings/page.tsx");
      expect(src).toMatch(/mmx CLI Path/);
      // The mmx path field is part of the POST body as tools.mmxPath
      expect(src).toMatch(/tools\.mmxPath/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tier 2: Encryption-at-rest contract — GREEN at HEAD
// ─────────────────────────────────────────────────────────────────────
//
// Implemented: `app/lib/encryption.ts` exposes encrypt/decrypt and is
// wired through the Phase 3 settings route. The describe block below
// exercises the round-trip + minimum-length contract.

describe("Phase 3: Settings Page — encryption at rest (task 3, GREEN)", () => {
  describe("encryption module exists at app/lib/encryption", () => {
    it("exports an `encrypt` function and a `decrypt` function", async () => {
      // Import is expected to FAIL at HEAD — no such module exists.
      // The Jr agent must add apps/marketing/app/lib/encryption.ts
      // exporting `encrypt(value: string): string` and
      // `decrypt(value: string): string` for this to pass.
      const mod = await import("../lib/encryption.js");
      expect(typeof mod.encrypt).toBe("function");
      expect(typeof mod.decrypt).toBe("function");
    });
  });

  describe("round-trip contract", () => {
    it("encrypt(plaintext) returns a non-empty string different from the plaintext", async () => {
      const { encrypt } = await import("../lib/encryption.js");
      const plaintext = "sk-test-secret-api-key-12345";
      const ciphertext = encrypt(plaintext);
      expect(typeof ciphertext).toBe("string");
      expect(ciphertext.length).toBeGreaterThan(0);
      // The whole point of encryption-at-rest: the stored value MUST
      // NOT contain the plaintext api key in any position.
      expect(ciphertext).not.toContain(plaintext);
      expect(ciphertext).not.toBe(plaintext);
    });

    it("decrypt(encrypt(plaintext)) === plaintext (lossless round-trip)", async () => {
      const { encrypt, decrypt } = await import("../lib/encryption.js");
      const plaintext = "sk-test-secret-api-key-12345";
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it("round-trip works for empty string and Unicode (Thai) payloads", async () => {
      const { encrypt, decrypt } = await import("../lib/encryption.js");
      for (const plaintext of [
        "",
        "a",
        "x".repeat(1024),
        "การเข้ารหัส",
        "นวัตกรรมใหม่ เพื่ออนาคต",
      ]) {
        expect(decrypt(encrypt(plaintext)), `round-trip failed for ${JSON.stringify(plaintext)}`).toBe(
          plaintext,
        );
      }
    });

    it("refuses to encrypt when ENCRYPTION_KEY is missing", async () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      // Re-import to ensure the module sees the cleared env var. ESM cache
      // means the same module instance is returned, but getKey() is evaluated
      // at call time so the missing-key check still fires.
      const { encrypt } = await import("../lib/encryption.js");
      expect(() => encrypt("secret")).toThrow("ENCRYPTION_KEY environment variable");
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tier 3: Settings route encryption — GREEN at HEAD
// ─────────────────────────────────────────────────────────────────────
//
// Implemented: POST /api/settings encrypts sensitive fields before
// insert; the describe block below verifies the chain through Drizzle
// mock + the route's request handler.

describe("Phase 3: Settings Page — POST /api/settings encryption (tasks 3 + 6, GREEN)", () => {
  /**
   * Build a chainable Drizzle insert mock that records every value
   * passed to `.values(...)`. The mock must mirror Drizzle's
   * `db.insert(table).values(row).onConflictDoUpdate({...})` shape
   * so the current route compiles and runs end-to-end.
   */
  function makeInsertChainMock() {
    const valuesMock = vi.fn();
    const onConflictDoUpdateMock = vi.fn();
    const insertMock = vi.fn();
    insertMock.mockReturnValue({ values: valuesMock });
    valuesMock.mockReturnValue({
      onConflictDoUpdate: onConflictDoUpdateMock,
    });
    onConflictDoUpdateMock.mockResolvedValue(undefined);
    return { insertMock, valuesMock, onConflictDoUpdateMock };
  }

  it("encrypts the apiKey before passing it to db.insert (no plaintext leaks)", async () => {
    const { db } = await import("@reading-advantage/db");
    const { insertMock, valuesMock } = makeInsertChainMock();
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/settings/route");
    const plaintextApiKey = "sk-test-secret-api-key-12345";

    const request = new Request("http://localhost/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ "llm.apiKey": plaintextApiKey }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);

    // Collect every {key, value} row the route handed to db.insert.
    const allRows: Array<{ key: string; value: string }> = [];
    for (const call of valuesMock.mock.calls) {
      const arg = call[0] as { key: string; value: string };
      allRows.push(arg);
    }
    expect(allRows.length).toBeGreaterThan(0);

    // Find the apiKey row specifically.
    const apiKeyRow = allRows.find((r) => r.key === "llm.apiKey");
    expect(apiKeyRow, "expected llm.apiKey row to be inserted").toBeDefined();

    // The ciphertext must NOT contain the plaintext in any position.
    // This is the test-strategy §4 edge case 5 invariant:
    //   "settings.value must never appear plaintext in DB"
    expect(apiKeyRow!.value).not.toBe(plaintextApiKey);
    expect(apiKeyRow!.value).not.toContain(plaintextApiKey);
  });

  it("encrypts the apiKey before passing it to ON CONFLICT DO UPDATE on re-save", async () => {
    const { db } = await import("@reading-advantage/db");
    const { insertMock, valuesMock, onConflictDoUpdateMock } =
      makeInsertChainMock();
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/settings/route");
    const plaintextApiKey = "sk-rotate-secret-key-98765";

    const request = new Request("http://localhost/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ "llm.apiKey": plaintextApiKey }),
    });
    await POST(request);

    // Verify the onConflictDoUpdate set payload also received ciphertext.
    // The route calls `.onConflictDoUpdate({ target, set })` — first arg
    // is the config object, second arg is undefined.
    const updateCalls = onConflictDoUpdateMock.mock.calls;
    expect(updateCalls.length).toBeGreaterThan(0);
    const updateConfig = (updateCalls[0] as unknown[])[0] as {
      target: unknown;
      set: { value: string };
    };
    expect(updateConfig.set.value).not.toBe(plaintextApiKey);
    expect(updateConfig.set.value).not.toContain(plaintextApiKey);
    // Suppress unused warning for valuesMock in this test.
    expect(valuesMock).toBeDefined();
  });

  it("uses ON CONFLICT DO UPDATE on the settings.key for idempotent re-save", async () => {
    const { db } = await import("@reading-advantage/db");
    const { insertMock, valuesMock, onConflictDoUpdateMock } =
      makeInsertChainMock();
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/settings/route");
    const request = new Request("http://localhost/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ "tools.mmxPath": "/usr/local/bin/mmx" }),
    });
    await POST(request);

    // The mmxPath is not a secret; it should still go through the
    // encryption layer (or be left plaintext per impl choice) — but
    // the route MUST call onConflictDoUpdate so re-saves upsert.
    expect(onConflictDoUpdateMock).toHaveBeenCalledTimes(1);
    // And the insert mock was called with the settings table.
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("GET /api/settings decrypts secret values before returning them", async () => {
    const { encrypt } = await import("../lib/encryption.js");
    const { db } = await import("@reading-advantage/db");
    const plaintextApiKey = "sk-test-secret-api-key-12345";
    const ciphertextApiKey = encrypt(plaintextApiKey);

    const selectFromMock = vi.fn().mockResolvedValue([
      { key: "llm.provider", value: "google" },
      { key: "llm.model", value: "gemini-pro" },
      { key: "llm.apiKey", value: ciphertextApiKey },
      { key: "tools.mmxPath", value: "/usr/local/bin/mmx" },
    ]);
    (db.select as Mock).mockImplementation(() => ({ from: selectFromMock }));

    const { GET } = await import("@/api/settings/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, string>;

    // Non-secret values are returned as-is.
    expect(body["llm.provider"]).toBe("google");
    expect(body["llm.model"]).toBe("gemini-pro");
    expect(body["tools.mmxPath"]).toBe("/usr/local/bin/mmx");
    // The secret apiKey must be decrypted, not returned as ciphertext.
    expect(body["llm.apiKey"]).toBe(plaintextApiKey);
    expect(body["llm.apiKey"]).not.toBe(ciphertextApiKey);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tier 4: Test Connection integration — passes at HEAD (regression guard)
// ─────────────────────────────────────────────────────────────────────

describe("Phase 3: Settings Page — POST /api/settings/test-connection (task 4 + 6)", () => {
  it("returns 200 with success when the AI client returns text", async () => {
    const { __fakeAIClient } = (await import(
      "@reading-advantage/ai"
    )) as unknown as {
      __fakeAIClient: { generateText: Mock };
    };
    __fakeAIClient.generateText.mockResolvedValueOnce("เชื่อมต่อสำเร็จ");

    const { POST } = await import("@/api/settings/test-connection/route");
    const request = new Request(
      "http://localhost/api/settings/test-connection",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          modelName: "gemini-pro",
          apiKey: "sk-test-secret-api-key-12345",
        }),
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
    // The route MUST delegate to createAIClient with the request body.
    const { createAIClient } = await import("@reading-advantage/ai");
    expect(createAIClient).toHaveBeenCalledWith({
      provider: "google",
      model: "gemini-pro",
      apiKey: "sk-test-secret-api-key-12345",
    });
  });

  it("returns 400 when the AI client throws (401-style unauthorized)", async () => {
    const { __fakeAIClient } = (await import(
      "@reading-advantage/ai"
    )) as unknown as {
      __fakeAIClient: { generateText: Mock };
    };
    __fakeAIClient.generateText.mockRejectedValueOnce(
      new Error("API key not valid"),
    );

    const { POST } = await import("@/api/settings/test-connection/route");
    const request = new Request(
      "http://localhost/api/settings/test-connection",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "openai",
          modelName: "gpt-4",
          apiKey: "sk-bad-key",
        }),
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = (await response.json()) as { message: string };
    expect(body.message).toBe("API key not valid");
    // The error message MUST NOT echo the api key back to the client
    // (defense against log / error-body leakage of the secret).
    expect(body.message).not.toContain("sk-bad-key");
  });
});
