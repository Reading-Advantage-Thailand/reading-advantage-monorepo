/**
 * Phase 5 Red-phase tests for the provider selector and lazy singleton.
 *
 * Driven by `measure/tracks/ai_adapter_package_20260603/plan.md` Phase 5
 * tasks 1–4 and `test-strategy.md` §1 (row 5 — selector / singleton),
 * §3.1 (singleton-state-leak guardrail), §3.4 (env-matrix coverage),
 * §4 G-4 (barrel-export surface), and §5 Phase 5 ("every test wrapped in
 * `withEnv()`; use `describe.each` for the env matrix").
 *
 * What this file pins:
 *   1. The full env-matrix from test-strategy §3.4: `{AI_PROVIDER,
 *      OPENAI_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY, NODE_ENV}` ×
 *      expected client or thrown error, including the two required
 *      boundary cases (`NODE_ENV=test` mock-default; `NODE_ENV=production`
 *      no-key throw).
 *   2. Plan task 4 explicit scenarios re-codified under the `withEnv()`
 *      pattern so they match the test-strategy §5 contract.
 *   3. Singleton identity + `resetAIClient()` behaviour: the singleton
 *      is stable across calls within one env snapshot, and a reset
 *      forces re-construction (test-strategy §3.1).
 *   4. Architecture guardrail G-4: the public barrel
 *      `packages/ai/src/index.ts` re-exports the Phase 5 surface
 *      (`createAIClient`, `getAIClient`, `resetAIClient`, all three
 *      error classes, `MockProvider`, plus the Phase 2/3/4 additions).
 *   5. Static check on `client.ts`: the file declares an `AIConfig` Zod
 *      schema with `provider`, `apiKey`, `model`, `organization` keys
 *      and a `default('openai')` on `provider` (plan task 2).
 *
 * RED expectations:
 *   - All behavioural assertions on `getAIClient()` / `createAIClient()`
 *     pass against the existing `9c52c8a` implementation. The Red-phase
 *     value of this file is *codification* of the test-strategy §1 / §3 /
 *     §4 / §5 contract: the existing `src/client.test.ts` (9 tests) uses
 *     `vi.stubEnv` / `vi.unstubAllEnvs` and does not exercise the
 *     `describe.each` env-matrix, the `withEnv()` helper, or the
 *     `NODE_ENV` defaulting boundaries. Any future regression in the
 *     selector logic — for example, a new code path that reads
 *     `process.env` without calling `resetAIClient()` first, or a
 *     change to the `NODE_ENV` defaulting rule — will be caught here
 *     before it propagates to Phases 6/7.
 *   - The G-4 barrel assertion will fail if a future refactor drops a
 *     re-export from `src/index.ts`; the static schema assertion will
 *     fail if the Zod schema's shape drifts from plan task 2.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { getAIClient, createAIClient, resetAIClient } from "../client.js";
import {
  AIClientError,
  ProviderNotConfiguredError,
  SchemaValidationError,
} from "../errors.js";
import { GoogleProvider } from "../providers/google.js";
import { MockProvider } from "../providers/mock.js";
import { OpenAIProvider } from "../providers/openai.js";

import * as barrel from "../index.js";
import { withEnv, type EnvOverrides } from "./test-utils.js";

// ---------------------------------------------------------------------------
// Env matrix — test-strategy §3.4.
// ---------------------------------------------------------------------------

/**
 * One row of the env matrix. `env` is patched into `process.env` for the
 * duration of the test; `expect` is the observable outcome of
 * `getAIClient()` (provider class, or `throw` for
 * `ProviderNotConfiguredError`).
 */
type MatrixRow = {
  name: string;
  env: EnvOverrides;
  expect: "openai" | "google" | "mock" | "throw";
};

/**
 * Required env-matrix table from test-strategy.md §3.4, plus the four
 * explicit scenarios from plan.md Phase 5 task 4. Order matches the
 * test-strategy enumeration; do not re-shuffle without updating the
 * plan/test-strategy cross-references.
 */
const MATRIX: MatrixRow[] = [
  // Plan task 4 explicit scenarios.
  {
    name: "AI_PROVIDER='mock' returns the mock provider (plan task 4.1)",
    env: { AI_PROVIDER: "mock" },
    expect: "mock",
  },
  {
    name:
      "AI_PROVIDER='openai' + OPENAI_API_KEY='test-key' returns OpenAI provider (plan task 4.2)",
    env: { AI_PROVIDER: "openai", OPENAI_API_KEY: "test-key" },
    expect: "openai",
  },
  {
    name:
      "no env vars + NODE_ENV='production' throws ProviderNotConfiguredError (plan task 4.3)",
    env: { NODE_ENV: "production" },
    expect: "throw",
  },
  {
    name:
      "no env vars + NODE_ENV='test' returns the mock provider (plan task 4.4)",
    env: { NODE_ENV: "test" },
    expect: "mock",
  },
  // Test-strategy §3.4 boundary cases.
  {
    name: "no env + NODE_ENV='development' defaults to OpenAI (no key → throw)",
    env: { NODE_ENV: "development" },
    expect: "throw",
  },
  {
    name: "AI_PROVIDER='google' + GEMINI_API_KEY='test-key' returns Google provider",
    env: { AI_PROVIDER: "google", GEMINI_API_KEY: "test-key" },
    expect: "google",
  },
  {
    name: "AI_PROVIDER='google' + GOOGLE_API_KEY='test-key' returns Google provider (fallback var)",
    env: { AI_PROVIDER: "google", GOOGLE_API_KEY: "test-key" },
    expect: "google",
  },
  {
    name: "AI_PROVIDER='openai' + no OPENAI_API_KEY throws",
    env: { AI_PROVIDER: "openai" },
    expect: "throw",
  },
  {
    name: "AI_PROVIDER='google' + no GEMINI_API_KEY/GOOGLE_API_KEY throws",
    env: { AI_PROVIDER: "google" },
    expect: "throw",
  },
  {
    name:
      "AI_PROVIDER='mock' ignores stray OPENAI_API_KEY (mock does not need a key)",
    env: { AI_PROVIDER: "mock", OPENAI_API_KEY: "ignored-on-mock" },
    expect: "mock",
  },
];

/**
 * Stash of env vars the matrix mutates; we delete them before each row
 * so cross-test leakage cannot false-pass a "no env" boundary case.
 */
const MATRIX_KEYS = [
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "NODE_ENV",
] as const;

describe("Phase 5 — provider selector env matrix (test-strategy §3.4, plan task 4)", () => {
  describe.each(MATRIX)("$name", (row) => {
    it("returns the expected client or throws ProviderNotConfiguredError", async () => {
      // Pre-clean: drop every matrix key the test runner might have
      // populated from its own env (e.g. CI secrets). The withEnv()
      // helper snapshots/restores, but a stale key from the parent
      // process would skip the "no env" boundary cases.
      for (const key of MATRIX_KEYS) {
        delete process.env[key];
      }
      resetAIClient();

      await withEnv(row.env, () => {
        if (row.expect === "throw") {
          expect(() => getAIClient()).toThrow(ProviderNotConfiguredError);
          return;
        }

        const client = getAIClient();
        if (row.expect === "openai") {
          expect(client).toBeInstanceOf(OpenAIProvider);
        } else if (row.expect === "google") {
          expect(client).toBeInstanceOf(GoogleProvider);
        } else {
          expect(client).toBeInstanceOf(MockProvider);
        }
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Singleton / reset behaviour — test-strategy §3.1.
// ---------------------------------------------------------------------------

describe("Phase 5 — lazy singleton (test-strategy §3.1, plan task 1)", () => {
  it("getAIClient() returns the same instance on subsequent calls within one env snapshot", async () => {
    for (const key of MATRIX_KEYS) {
      delete process.env[key];
    }
    resetAIClient();

    await withEnv({ AI_PROVIDER: "mock" }, () => {
      const a = getAIClient();
      const b = getAIClient();
      expect(a).toBe(b);
    });
  });

  it("resetAIClient() forces getAIClient() to construct a fresh instance", async () => {
    for (const key of MATRIX_KEYS) {
      delete process.env[key];
    }
    resetAIClient();

    await withEnv({ AI_PROVIDER: "mock" }, () => {
      const a = getAIClient();
      resetAIClient();
      const b = getAIClient();
      expect(a).not.toBe(b);
      expect(a).toBeInstanceOf(MockProvider);
      expect(b).toBeInstanceOf(MockProvider);
    });
  });

  it("changing AI_PROVIDER between withEnv() blocks picks up the new provider (singleton does not leak across blocks)", async () => {
    for (const key of MATRIX_KEYS) {
      delete process.env[key];
    }
    resetAIClient();

    await withEnv({ AI_PROVIDER: "mock" }, () => {
      expect(getAIClient()).toBeInstanceOf(MockProvider);
    });

    await withEnv(
      { AI_PROVIDER: "openai", OPENAI_API_KEY: "test-key" },
      () => {
        expect(getAIClient()).toBeInstanceOf(OpenAIProvider);
      }
    );

    await withEnv(
      { AI_PROVIDER: "google", GEMINI_API_KEY: "test-key" },
      () => {
        expect(getAIClient()).toBeInstanceOf(GoogleProvider);
      }
    );
  });
});

// ---------------------------------------------------------------------------
// createAIClient — explicit-config sanity (plan task 1).
// ---------------------------------------------------------------------------

describe("Phase 5 — createAIClient explicit config (plan task 1)", () => {
  it("returns MockProvider for provider='mock' regardless of any keys", () => {
    const client = createAIClient({ provider: "mock" });
    expect(client).toBeInstanceOf(MockProvider);
  });

  it("returns OpenAIProvider when apiKey is provided explicitly", () => {
    const client = createAIClient({
      provider: "openai",
      apiKey: "explicit-openai-key",
    });
    expect(client).toBeInstanceOf(OpenAIProvider);
  });

  it("returns GoogleProvider when apiKey is provided explicitly", () => {
    const client = createAIClient({
      provider: "google",
      apiKey: "explicit-google-key",
    });
    expect(client).toBeInstanceOf(GoogleProvider);
  });

  it("throws ProviderNotConfiguredError when provider='openai' and no key is available", () => {
    const previousOpenAI = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      expect(() => createAIClient({ provider: "openai" })).toThrow(
        ProviderNotConfiguredError
      );
    } finally {
      if (previousOpenAI !== undefined) {
        process.env.OPENAI_API_KEY = previousOpenAI;
      }
    }
  });

  it("throws ProviderNotConfiguredError when provider='google' and no key is available", () => {
    const previousGemini = process.env.GEMINI_API_KEY;
    const previousGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      expect(() => createAIClient({ provider: "google" })).toThrow(
        ProviderNotConfiguredError
      );
    } finally {
      if (previousGemini !== undefined) {
        process.env.GEMINI_API_KEY = previousGemini;
      }
      if (previousGoogle !== undefined) {
        process.env.GOOGLE_API_KEY = previousGoogle;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Barrel exports — test-strategy §4 G-4.
// ---------------------------------------------------------------------------

describe("Phase 5 — barrel exports (test-strategy §4 G-4)", () => {
  it("re-exports createAIClient, getAIClient, resetAIClient from the public barrel", () => {
    expect(barrel.createAIClient).toBe(createAIClient);
    expect(barrel.getAIClient).toBe(getAIClient);
    expect(barrel.resetAIClient).toBe(resetAIClient);
  });

  it("re-exports all three error classes from the public barrel", () => {
    expect(barrel.AIClientError).toBe(AIClientError);
    expect(barrel.ProviderNotConfiguredError).toBe(ProviderNotConfiguredError);
    expect(barrel.SchemaValidationError).toBe(SchemaValidationError);
  });

  it("re-exports MockProvider, OpenAIProvider, GoogleProvider from the public barrel", () => {
    expect(barrel.MockProvider).toBe(MockProvider);
    expect(barrel.OpenAIProvider).toBe(OpenAIProvider);
    expect(barrel.GoogleProvider).toBe(GoogleProvider);
  });
});

// ---------------------------------------------------------------------------
// Static check on the AIConfig Zod schema — plan task 2.
// ---------------------------------------------------------------------------

const here = path.dirname(fileURLToPath(import.meta.url));
const clientSourcePath = path.resolve(here, "../client.ts");

describe("Phase 5 — AIConfig Zod schema shape (plan task 2)", () => {
  it("client.ts declares an AIConfig Zod schema with the required keys and a default provider of 'openai'", async () => {
    const source = await fs.readFile(clientSourcePath, "utf8");

    // The Zod schema is the `aiConfigSchema` const declared with
    // `z.object({...})`. We assert on the textual shape rather than
    // importing the runtime value, so this test stays a *guardrail*:
    // it fails on a future edit that drops a key, removes the default,
    // or moves the schema to a new file without updating this assertion.
    expect(source).toMatch(/aiConfigSchema\s*=\s*z\.object\(\{/);
    expect(source).toMatch(/provider:\s*z\.enum\(\[\s*["']openai["']\s*,\s*["']google["']\s*,\s*["']openrouter["']\s*,\s*["']mock["']\s*\]\)/);
    expect(source).toMatch(/provider:[^\n]*\.default\(\s*["']openai["']\s*\)/);
    expect(source).toMatch(/apiKey:\s*z\.string\(\)\.optional\(\)/);
    expect(source).toMatch(/model:\s*z\.string\(\)\.optional\(\)/);
    expect(source).toMatch(/organization:\s*z\.string\(\)\.optional\(\)/);
  });
});
