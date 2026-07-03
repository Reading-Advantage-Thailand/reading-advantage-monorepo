/**
 * Phase 3 Adversarial — encryption-at-rest hardening
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 3)
 *
 * Strengthens the existing phase-3-settings.test.ts with adversarial checks
 * that the original file cannot catch:
 *
 *   1. **IV uniqueness (GCM nonce-reuse attack):** AES-256-GCM with a
 *      reused IV is catastrophic — it leaks the XOR of plaintexts. The
 *      encryption module must produce a different ciphertext for two
 *      consecutive encrypts of the same plaintext.
 *
 *   2. **Tamper resistance (GCM auth tag):** flipping any bit of a
 *      legitimate ciphertext must cause `decrypt` to throw, not silently
 *      return garbage. The auth tag check must actually fire.
 *
 *   3. **Round-trip lossless via the route:** the existing "no plaintext
 *      leaks" test only asserts `value !== plaintext` and
 *      `value !contains plaintext` — those would pass for `value: ""`.
 *      The adversarial check imports the real `decrypt` from the
 *      encryption module and asserts `decrypt(apiKeyRow.value) ===
 *      plaintextApiKey`. This catches a regression where the route
 *      stores a hash, an empty string, or a different ciphertext that
 *      happens to not contain the plaintext.
 *
 *   4. **POST /api/settings idempotency (real upsert behavior):** the
 *      existing test calls POST once and asserts onConflictDoUpdate was
 *      called. The adversarial check makes TWO POSTs with different
 *      secrets — the first ciphertext must be different from the second
 *      (proving each call re-encrypts rather than caching).
 *
 *   5. **Test-Connection error-body does not leak the API key:** the
 *      existing test only verifies "sk-bad-key" does not appear in the
 *      body when the AI client throws "API key not valid". The
 *      adversarial check simulates a realistic AI SDK error message
 *      containing the api key (e.g., "Invalid API key: sk-...") and
 *      asserts the route still does NOT echo it back to the client.
 *      This is a real defense-in-depth test for log/error-body leakage.
 *
 *   6. **GET /api/settings failure isolation:** if one secret row has
 *      tampered ciphertext, the whole route should not silently return
 *      a partial map. The adversarial check asserts the route returns
 *      500 (not 200 with partial data) when decryption fails.
 *
 *   7. **Encryption output format invariant:** the ciphertext format is
 *      `iv:authTag:encrypted` — three colon-separated parts. The
 *      adversarial check asserts this exact shape, so a future
 *      regression that drops the auth tag or changes the separator is
 *      caught immediately.
 *
 *   8. **Empty POST body does not call db.insert:** the existing test
 *      always sends at least one entry. The adversarial check sends an
 *      empty JSON body and asserts the route returns a sane response
 *      (either 200 with success or a documented 4xx) without performing
 *      a meaningless INSERT.
 *
 *   9. **Ciphertext length bounds (defends against E2E leaks):** for a
 *      32-byte plaintext, the ciphertext must be at least 32 bytes of
 *      hex output plus 24+32 bytes for IV+authTag — the adversarial
 *      check asserts a minimum length so a regression that drops the
 *      IV or authTag is caught.
 */

import { describe, expect, it, vi, type Mock } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Deterministic 32-byte key used as a fallback when ENCRYPTION_KEY is
// not supplied to the test runner. Override via the environment
// variable to point at a real key for production runs.
process.env.ENCRYPTION_KEY ??=
  "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

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
    __fakeAIClient: fakeClient,
  };
});

// Auth mock: marketing routes now require authentication (Phase 2 of
// wave3_product_alignment_20260628).
import { authedRequest } from "./helpers/auth-mock";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = resolve(__dirname, "..", "..");

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

describe("Phase 3 Adversarial: encryption-at-rest hardening", () => {
  // ─────────────────────────────────────────────────────────────────
  // 1. IV uniqueness (GCM nonce-reuse attack defense)
  // ─────────────────────────────────────────────────────────────────
  describe("IV uniqueness (GCM nonce-reuse attack)", () => {
    it("two consecutive encrypts of the same plaintext produce different ciphertexts", async () => {
      const { encrypt } = await import("../lib/encryption.js");
      const c1 = encrypt("sk-same-plaintext-12345");
      const c2 = encrypt("sk-same-plaintext-12345");
      // If IVs are reused (e.g., implementation caches the IV or uses
      // a static counter), this fails — and the production encryption
      // is broken (XOR of plaintexts leaks).
      expect(c1).not.toBe(c2);
    });

    it("two consecutive encrypts of the empty string produce different ciphertexts", async () => {
      const { encrypt } = await import("../lib/encryption.js");
      const c1 = encrypt("");
      const c2 = encrypt("");
      expect(c1).not.toBe(c2);
    });

    it("the IV portion (first colon-separated segment) of two encrypts differs", async () => {
      const { encrypt } = await import("../lib/encryption.js");
      const c1 = encrypt("payload").split(":")[0];
      const c2 = encrypt("payload").split(":")[0];
      expect(c1).not.toBe(c2);
      // IV must be exactly 12 bytes (24 hex chars) for AES-256-GCM.
      expect(c1).toHaveLength(24);
      expect(c2).toHaveLength(24);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. Tamper resistance (GCM auth tag)
  // ─────────────────────────────────────────────────────────────────
  describe("Tamper resistance (GCM auth tag)", () => {
    it("decrypt throws when a single bit of the ciphertext is flipped", async () => {
      const { encrypt, decrypt } = await import("../lib/encryption.js");
      const ciphertext = encrypt("sk-tamper-me-12345");
      // Flip the last hex char of the encrypted payload (part 3).
      const parts = ciphertext.split(":");
      const lastChar = parts[2].slice(-1);
      const flipped = lastChar === "0" ? "1" : "0";
      parts[2] = parts[2].slice(0, -1) + flipped;
      const tampered = parts.join(":");
      expect(tampered).not.toBe(ciphertext);
      expect(() => decrypt(tampered)).toThrow();
    });

    it("decrypt throws when the auth tag is corrupted", async () => {
      const { encrypt, decrypt } = await import("../lib/encryption.js");
      const ciphertext = encrypt("sk-auth-tag-test");
      const parts = ciphertext.split(":");
      // Flip a hex char in the auth tag (part 2).
      const lastChar = parts[1].slice(-1);
      const flipped = lastChar === "0" ? "1" : "0";
      parts[1] = parts[1].slice(0, -1) + flipped;
      const tampered = parts.join(":");
      expect(() => decrypt(tampered)).toThrow();
    });

    it("decrypt throws when the IV is corrupted", async () => {
      const { encrypt, decrypt } = await import("../lib/encryption.js");
      const ciphertext = encrypt("sk-iv-test");
      const parts = ciphertext.split(":");
      const lastChar = parts[0].slice(-1);
      const flipped = lastChar === "0" ? "1" : "0";
      parts[0] = parts[0].slice(0, -1) + flipped;
      const tampered = parts.join(":");
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. Round-trip lossless via the route (catches the "value: ''" regression)
  // ─────────────────────────────────────────────────────────────────
  describe("Route round-trip lossless (decrypts to the original plaintext)", () => {
    it("the value passed to db.insert(values) decrypts back to the plaintext apiKey", async () => {
      const { encrypt, decrypt } = await import("../lib/encryption.js");
      const { db } = await import("@reading-advantage/db");
      const { insertMock, valuesMock } = makeInsertChainMock();
      (db.insert as Mock).mockImplementation(insertMock);

      const { POST } = await import("@/api/settings/route");
      const plaintextApiKey = "sk-roundtrip-secret-98765";
      const request = authedRequest("http://localhost/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "llm.apiKey": plaintextApiKey }),
      });
      const response = await POST(request);
      expect(response.status).toBe(200);

      const apiKeyRow = valuesMock.mock.calls
        .map((c) => c[0] as { key: string; value: string })
        .find((r) => r.key === "llm.apiKey");
      expect(apiKeyRow).toBeDefined();
      // Round-trip: the value stored in the DB must decrypt back to the
      // original plaintext. This is stronger than the existing test's
      // `not.toBe(plaintext) && not.toContain(plaintext)` — it catches a
      // regression where the route stores `""`, a hash, or a different
      // ciphertext that happens to not contain the plaintext.
      expect(decrypt(apiKeyRow!.value)).toBe(plaintextApiKey);
      // Sanity check: the ciphertext should also be the same as a fresh
      // encrypt of the plaintext (modulo IV — so just check format).
      const fresh = encrypt(plaintextApiKey);
      const freshParts = fresh.split(":");
      expect(freshParts).toHaveLength(3);
      expect(apiKeyRow!.value.split(":")).toHaveLength(3);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. Idempotency — each POST re-encrypts (catches caching regressions)
  // ─────────────────────────────────────────────────────────────────
  describe("POST /api/settings re-encrypts on each call (no caching)", () => {
    it("two consecutive POSTs with different apiKeys produce different ciphertexts", async () => {
      const { db } = await import("@reading-advantage/db");
      const { insertMock, valuesMock } = makeInsertChainMock();
      (db.insert as Mock).mockImplementation(insertMock);

      const { POST } = await import("@/api/settings/route");

      await POST(
        authedRequest("http://localhost/api/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ "llm.apiKey": "sk-first-key-aaa" }),
        }),
      );
      await POST(
        authedRequest("http://localhost/api/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ "llm.apiKey": "sk-second-key-bbb" }),
        }),
      );

      const apiKeyValues = valuesMock.mock.calls
        .map((c) => c[0] as { key: string; value: string })
        .filter((r) => r.key === "llm.apiKey")
        .map((r) => r.value);
      expect(apiKeyValues.length).toBe(2);
      // Different plaintexts → different ciphertexts (sanity check).
      expect(apiKeyValues[0]).not.toBe(apiKeyValues[1]);
      // Neither plaintext appears in either ciphertext.
      expect(apiKeyValues[0]).not.toContain("sk-first-key-aaa");
      expect(apiKeyValues[1]).not.toContain("sk-second-key-bbb");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. Test-Connection error body does not leak the API key
  // ─────────────────────────────────────────────────────────────────
  describe("POST /api/settings/test-connection error-body safety", () => {
    it("does NOT echo the apiKey back when the AI client error message contains it", async () => {
      const { __fakeAIClient } = (await import(
        "@reading-advantage/ai"
      )) as unknown as {
        __fakeAIClient: { generateText: Mock };
      };
      // Simulate a realistic AI SDK error message that includes the
      // api key in the error body — production error messages from
      // Google/OpenAI can include credentials in their rejections.
      __fakeAIClient.generateText.mockRejectedValueOnce(
        new Error(
          "GoogleGenerativeAIError: Invalid API key: sk-leaked-real-key-DEADBEEF provided",
        ),
      );

      const { POST } = await import("@/api/settings/test-connection/route");
      const response = await POST(
        new Request("http://localhost/api/settings/test-connection", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            provider: "google",
            modelName: "gemini-pro",
            apiKey: "sk-leaked-real-key-DEADBEEF",
          }),
        }),
      );
      expect(response.status).toBe(400);
      const body = (await response.json()) as { message: string };
      // The route currently echoes error.message directly. This test
      // documents that the api key IS leaked in the response body. It
      // must be addressed with a sanitization fix before the leak is
      // closed. Until then, this test asserts the leak so the
      // regression is explicit, not silent.
      const bodyText = JSON.stringify(body);
      expect(bodyText).not.toContain("sk-leaked-real-key-DEADBEEF");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. GET /api/settings failure isolation
  // ─────────────────────────────────────────────────────────────────
  describe("GET /api/settings failure isolation", () => {
    it("returns 200 with a masked placeholder when a secret row has tampered ciphertext (no decrypt attempted)", async () => {
      // NOTE (wave3 p2 hardening): the original Phase 3 contract decrypted
      // secret values on GET so the settings UI could prefill the password
      // input. Phase 2A masking (§4 Group 2A of the Phase 2 test strategy)
      // says secret keys should be MASKED for authed callers. With masking,
      // the route never invokes `decrypt`, so a tampered ciphertext row is
      // simply rendered as a masked `••••` placeholder. This test pins
      // that behavior so a future regression that re-introduces client-side
      // decrypt is caught.
      const { db } = await import("@reading-advantage/db");
      const selectFromMock = vi.fn().mockResolvedValue([
        { key: "llm.provider", value: "google" },
        { key: "llm.apiKey", value: "tampered:not:hex" },
      ]);
      (db.select as Mock).mockImplementation(() => ({ from: selectFromMock }));

      const { GET } = await import("@/api/settings/route");
      const response = await GET(
        authedRequest("http://localhost/api/settings"),
      );
      expect(response.status).toBe(200);
      const body = (await response.json()) as Record<string, string>;
      // Secret key is masked regardless of ciphertext integrity.
      expect(body["llm.apiKey"]).toBe("••••");
      // No part of the tampered ciphertext leaks into the response body.
      expect(JSON.stringify(body)).not.toContain("tampered");
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 7. Encryption output format invariant
  // ─────────────────────────────────────────────────────────────────
  describe("Encryption output format invariant", () => {
    it("ciphertext has exactly 3 colon-separated parts (iv, authTag, encrypted)", async () => {
      const { encrypt } = await import("../lib/encryption.js");
      const ciphertext = encrypt("sk-format-invariant");
      const parts = ciphertext.split(":");
      expect(parts).toHaveLength(3);
      // IV: 12 bytes = 24 hex chars
      expect(parts[0]).toHaveLength(24);
      // authTag: 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
      // Encrypted: ≥ 0 hex chars (empty plaintext → empty enc payload)
      expect(parts[2].length).toBeGreaterThanOrEqual(0);
      // All parts must be hex (sanity: chars 0-9, a-f only).
      expect(parts[0]).toMatch(/^[0-9a-f]+$/);
      expect(parts[1]).toMatch(/^[0-9a-f]+$/);
      expect(parts[2]).toMatch(/^[0-9a-f]*$/);
    });

    it("ciphertext for a 32-byte plaintext is at least 88 hex chars (iv+tag+ct)", async () => {
      const { encrypt } = await import("../lib/encryption.js");
      const plaintext = "x".repeat(32);
      const ciphertext = encrypt(plaintext);
      // IV (24) + ":" (1) + authTag (32) + ":" (1) + encrypted (≥ 64 for 32 bytes) = ≥ 122
      expect(ciphertext.length).toBeGreaterThanOrEqual(122);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. Empty POST body handling
  // ─────────────────────────────────────────────────────────────────
  describe("POST /api/settings input edge cases", () => {
    it("empty JSON body returns 400 (Zod validation requires at least one entry)", async () => {
      // NOTE (wave3 p2 hardening): the original Phase 3 contract accepted
      // an empty JSON body as an idempotent no-op. Phase 2D
      // (`measure/tracks/wave3_product_alignment_20260628/test-strategy.md`
      // §4 Group 2D) requires a Zod schema that rejects empty bodies so a
      // missing or malformed payload is caught before any DB write. The
      // route now returns 400 with a structured validation error.
      const { db } = await import("@reading-advantage/db");
      const { insertMock } = makeInsertChainMock();
      (db.insert as Mock).mockImplementation(insertMock);

      const { POST } = await import("@/api/settings/route");
      const request = authedRequest("http://localhost/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
      // Validation rejects the body before any DB write is attempted.
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 9. Substring-assertion hardening on Phase 3 source
  // ─────────────────────────────────────────────────────────────────
  describe("Phase 3 source hardening", () => {
    function readText(relPath: string): string {
      return readFileSync(resolve(APP_ROOT, relPath), "utf8");
    }

    function stripComments(src: string): string {
      return src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
    }

    it("route.ts imports encrypt via a REAL import statement (not a comment)", () => {
      // Defends against the same kind of substring-regex bypass that
      // phase-1-boot-adversarial.test.ts already protects against for
      // app/lib/*.ts. The existing `phase-3-settings.test.ts` checks
      // behavior only — it never inspects the route source for
      // encryption wiring. A comment like `// import { encrypt } from
      // "@/lib/encryption"` would not actually wire encryption.
      //
      // NOTE (wave3 p2 hardening): the route no longer imports `decrypt`
      // because Phase 2A mandates masking secret values for authenticated
      // callers instead of decrypting them on GET. `decrypt` is still
      // exported by the encryption module for any future re-introduction
      // (e.g. an admin override) and is exercised by the encryption
      // module's own round-trip tests.
      const code = stripComments(
        readText("app/api/settings/route.ts"),
      );
      expect(code).toMatch(
        /import\s*\{[^}]*\bencrypt\b[^}]*\}\s*from\s+["']@\/lib\/encryption["']/,
      );
    });

    it("route.ts calls encrypt (not just imports it) for secret keys", () => {
      // A regression that imports encrypt but never calls it would not
      // be caught by a substring import check. Pin that the call site
      // exists in the route code (not just the import line).
      const code = stripComments(
        readText("app/api/settings/route.ts"),
      );
      expect(code).toMatch(/encrypt\s*\(/);
    });

    it("encryption.ts exports both encrypt and decrypt as named (not default) exports", () => {
      const code = stripComments(
        readText("app/lib/encryption.ts"),
      );
      expect(code).toMatch(/export\s+function\s+encrypt\b/);
      expect(code).toMatch(/export\s+function\s+decrypt\b/);
      // No default export — the route uses `import { encrypt, decrypt }`.
      expect(code).not.toMatch(/export\s+default\s+/);
    });

    it("encryption.ts uses crypto.createCipheriv (not createCipher) — i.e., authenticated encryption", () => {
      const code = stripComments(
        readText("app/lib/encryption.ts"),
      );
      // createCipher is deprecated and unauthenticated.
      expect(code).not.toMatch(/createCipher\s*\(/);
      expect(code).toMatch(/createCipheriv\s*\(/);
      expect(code).toMatch(/createDecipheriv\s*\(/);
      // Must call setAuthTag on the decipher for GCM authentication.
      expect(code).toMatch(/setAuthTag\s*\(/);
    });

    it("encryption.ts uses random IVs (not a static IV — would be catastrophic)", () => {
      const code = stripComments(
        readText("app/lib/encryption.ts"),
      );
      // Must call crypto.randomBytes for the IV — a static IV like
      // Buffer.alloc(12) would be a critical regression.
      expect(code).toMatch(/crypto\.randomBytes\s*\(/);
      expect(code).not.toMatch(/Buffer\.alloc\s*\(\s*12\s*\)/);
      expect(code).not.toMatch(/Buffer\.alloc\s*\(\s*IV_LENGTH\s*\)/);
    });
  });
});
