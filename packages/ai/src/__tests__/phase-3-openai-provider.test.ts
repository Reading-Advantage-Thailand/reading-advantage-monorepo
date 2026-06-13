/**
 * Phase 3 Red-phase tests for the OpenAI provider.
 *
 * Driven by `measure/tracks/ai_adapter_package_20260603/plan.md` Phase 3
 * tasks 4–5 and `test-strategy.md` §1 (contract + integration columns),
 * §3.3 (schema-validation boundary), §4 G-3 (no `process` import), and
 * §5.1 (explicit `apiKey` plumbing).
 *
 * What this file pins:
 *   1. The shared `runAIClientContract` harness re-runs the Phase 2
 *      contract suite against the OpenAI provider, with the SDK mocks
 *      wired to return the standard fixture values (test-strategy §1,
 *      contract column). The provider's `@ai-sdk/openai` mock is
 *      programmable via the `ContractFixtures` argument so the harness
 *      is exercised end-to-end.
 *   2. `OpenAIProvider` constructs `@ai-sdk/openai` with the EXPLICIT
 *      `apiKey` passed through the constructor, never with a value
 *      pulled from `process.env` (test-strategy §5.1; G-3).
 *   3. Architecture guardrail G-3: `src/providers/openai.ts` does not
 *      contain an `import … from "process"` / `"node:process"` line
 *      (test-strategy §4). Enforced by reading the file source from
 *      disk so the test fails on a future regression.
 *   4. Schema-validation boundary: when the underlying SDK rejects
 *      malformed output, the provider surfaces `AIClientError` rather
 *      than silently returning invalid data (test-strategy §3.3).
 *   5. Gated real-network integration test using
 *      `it.skipIf(!process.env.OPENAI_API_KEY)` — visible as
 *      "skipped" in CI rather than hidden, per test-strategy §5.7.
 *      The test asserts the real response is a non-empty string, which
 *      is the contract Phase 7's `image-generator.ts` refactor will
 *      rely on (FR-3 response-shape confirmation).
 *
 * RED expectations on first run (Phase 3 Red, pre-`createOpenAI` mock
 * wiring in this file):
 *   - The contract suite is the *new* Red artifact. It will go green
 *     against the existing `9c52c8a` implementation once the SDK mocks
 *     are wired (which this file does up-front in `wireSdkMocks`).
 *   - The G-3 file-source check, explicit-`apiKey` env-leak test, and
 *     schema-validation test are guardrails that may surface
 *     regressions in future edits to `openai.ts`.
 *   - The gated integration test will report as `skipped` in any
 *     environment where `OPENAI_API_KEY` is absent (the sandbox here)
 *     and will run in a real CI lane with the secret exported.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AIClientError } from "../errors.js";
import { OpenAIProvider } from "../providers/openai.js";
import {
  defaultContractFixtures,
  runAIClientContract,
  type ContractFixtures,
} from "./contract-suite.js";
import { diagramBuffer } from "./diagram.fixture.js";
import {
  recommendationFixture,
  recommendationFixturePrompt,
  recommendationFixtureSchema,
} from "./recommendations.fixture.js";

const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  generateImage: vi.fn(),
  createOpenAI: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: mocks.generateObject,
  generateText: mocks.generateText,
  generateImage: mocks.generateImage,
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: mocks.createOpenAI,
}));

function wireSdkMocks(fixtures: ContractFixtures): void {
  mocks.createOpenAI.mockImplementation(() => {
    const provider = vi.fn((id: string) => `openai-text:${id}`) as unknown as {
    (id: string): string;
    image: (id: string) => string;
  };
    provider.image = vi.fn((id: string) => `openai-image:${id}`);
    return provider as unknown as ReturnType<typeof mocks.createOpenAI>;
  });

  mocks.generateObject.mockImplementation(async () => ({
    object: fixtures.recommendationObject,
    finishReason: "stop",
    usage: { promptTokens: 10, completionTokens: 5 },
  }));

  mocks.generateText.mockImplementation(async () => ({
    text: fixtures.textOutput,
    finishReason: "stop",
    usage: { promptTokens: 5, completionTokens: 3 },
  }));

  mocks.generateImage.mockImplementation(async () => ({
    image: {
      base64: fixtures.imageBuffer.toString("base64"),
      uint8Array: new Uint8Array(),
      mediaType: "image/png",
    },
    images: [],
    warnings: [],
  }));
}

function makeOpenAIClient(fixtures: ContractFixtures): OpenAIProvider {
  wireSdkMocks(fixtures);
  return new OpenAIProvider({ apiKey: "test-key-openai-contract" });
}

const testSchema = z.object({ answer: z.string() });

beforeEach(() => {
  vi.clearAllMocks();
});

function latestCallArg(
  mock: { mock: { calls: unknown[][] } }
): Record<string, unknown> | undefined {
  return mock.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
}

describe("OpenAIProvider — delegation to AI SDK (test-strategy §1 unit column)", () => {
  it("generateObject delegates to AI SDK generateObject with the configured model", async () => {
    wireSdkMocks(defaultContractFixtures);
    mocks.generateObject.mockResolvedValueOnce({
      object: { answer: "42" },
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 5 },
    } as never);

    const provider = new OpenAIProvider({ apiKey: "test-key", model: "gpt-4o" });
    const result = await provider.generateObject({
      schema: testSchema,
      prompt: "what is the answer",
    });

    expect(result).toEqual({ answer: "42" });
    expect(mocks.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "what is the answer",
        maxRetries: 1,
      })
    );
  });

  it("generateText delegates to AI SDK generateText", async () => {
    wireSdkMocks(defaultContractFixtures);
    mocks.generateText.mockResolvedValueOnce({
      text: "hello world",
      finishReason: "stop",
      usage: { promptTokens: 5, completionTokens: 3 },
    } as never);

    const provider = new OpenAIProvider({ apiKey: "test-key" });
    const result = await provider.generateText({ prompt: "say hello" });

    expect(result).toBe("hello world");
  });

  it("generateImage returns a Buffer built from the SDK's base64 payload", async () => {
    wireSdkMocks(defaultContractFixtures);
    const imageBase64 = Buffer.from("fake-image-bytes").toString("base64");
    mocks.generateImage.mockResolvedValueOnce({
      image: {
        base64: imageBase64,
        uint8Array: new Uint8Array(),
        mediaType: "image/png",
      },
      images: [],
      warnings: [],
    } as never);

    const provider = new OpenAIProvider({
      apiKey: "test-key",
      imageModel: "dall-e-3",
    });
    const result = await provider.generateImage({ prompt: "a cat" });

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("fake-image-bytes");
    expect(mocks.generateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai-image:dall-e-3",
      })
    );
  });
});

runAIClientContract("OpenAIProvider", (fixtures) => makeOpenAIClient(fixtures));

describe("OpenAIProvider — explicit apiKey plumbing (test-strategy §5.1, FR-3)", () => {
  it("passes the explicit apiKey to createOpenAI and ignores process.env.OPENAI_API_KEY", () => {
    const previousKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-env-leaked-key-9999";
    try {
      mocks.createOpenAI.mockClear();
      const explicitKey = "sk-explicit-key-1234";
      new OpenAIProvider({ apiKey: explicitKey });
      expect(mocks.createOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: explicitKey })
      );
      const callArgs = latestCallArg(mocks.createOpenAI) as
        | { apiKey?: string }
        | undefined;
      expect(callArgs?.apiKey).not.toBe(process.env.OPENAI_API_KEY);
    } finally {
      if (previousKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = previousKey;
      }
    }
  });

  it("omits `organization` from the SDK call when not configured (G-3 friendly)", () => {
    mocks.createOpenAI.mockClear();
    new OpenAIProvider({ apiKey: "test-key" });
    const callArgs = latestCallArg(mocks.createOpenAI);
    expect(callArgs).not.toHaveProperty("organization");
  });

  it("forwards `organization` to createOpenAI when provided", () => {
    mocks.createOpenAI.mockClear();
    new OpenAIProvider({ apiKey: "test-key", organization: "org-test" });
    expect(mocks.createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ organization: "org-test" })
    );
  });

  it("uses the explicit model override when generating objects", async () => {
    wireSdkMocks(defaultContractFixtures);
    mocks.generateObject.mockResolvedValueOnce({
      object: { answer: "ok" },
      finishReason: "stop",
      usage: { promptTokens: 1, completionTokens: 1 },
    } as never);

    const provider = new OpenAIProvider({
      apiKey: "test-key",
      model: "gpt-4o-mini",
    });
    await provider.generateObject({
      schema: testSchema,
      prompt: "x",
      model: "gpt-4o-turbo",
    });

    expect(mocks.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai-text:gpt-4o-turbo",
      })
    );
  });
});

describe("OpenAIProvider — architecture guardrail G-3 (no process import)", () => {
  it("src/providers/openai.ts does not import 'process' (test-strategy §4 G-3, FR-3)", async () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.resolve(here, "../providers/openai.ts");
    const source = await fs.readFile(filePath, "utf8");
    const importProcessRe =
      /(?:^|\n)\s*(?:import|export)\b[^\n]*\bfrom\s+['"](?:node:)?process['"]/m;
    expect(source).not.toMatch(importProcessRe);
  });
});

describe("OpenAIProvider — schema-validation boundary (test-strategy §3.3)", () => {
  it("surfaces schema validation failures as AIClientError, not silent passthrough", async () => {
    wireSdkMocks(defaultContractFixtures);
    mocks.generateObject.mockRejectedValueOnce(
      new AIClientError("schema validation failed", "SCHEMA_VALIDATION_ERROR")
    );

    const provider = new OpenAIProvider({ apiKey: "test-key" });
    await expect(
      provider.generateObject({
        schema: z.object({ ok: z.boolean() }),
        prompt: "x",
      })
    ).rejects.toBeInstanceOf(AIClientError);
  });

  it("surfaces unknown provider errors as AIClientError with PROVIDER_ERROR code", async () => {
    wireSdkMocks(defaultContractFixtures);
    mocks.generateText.mockRejectedValueOnce(new Error("network down"));

    const provider = new OpenAIProvider({ apiKey: "test-key" });
    await expect(
      provider.generateText({ prompt: "x" })
    ).rejects.toMatchObject({
      name: "AIClientError",
      code: "PROVIDER_ERROR",
    });
  });
});

// ─── v2/v5 call shape (Phase 2 Red) ──────────────────────────────────
//
// See `measure/tracks/ai_sdk_major_migration/test-strategy.md` §5
// (P2 — extend `phase-3-*` with v2-shape assertions). The adapter was
// bumped to `ai@^5` in Phase 1, but `openai.ts` still spreads the v1
// keyword `maxTokens` into the SDK call. v5 silently drops it. Phase 3
// must rename the kwarg to `maxOutputTokens`. These assertions pin
// the v5 contract on the `vi.mock`'d `generateText` / `generateObject`
// calls.
describe("OpenAIProvider — v2/v5 call shape (test-strategy §5 P2)", () => {
  it("generateText forwards consumer maxTokens as maxOutputTokens (v5 renamed the kwarg)", async () => {
    wireSdkMocks(defaultContractFixtures);
    mocks.generateText.mockResolvedValueOnce({
      text: "v2 shape",
      finishReason: "stop",
      usage: { promptTokens: 1, completionTokens: 1 },
    } as never);

    const provider = new OpenAIProvider({ apiKey: "test-key" });
    await provider.generateText({ prompt: "x", maxTokens: 100 });

    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 100 }),
    );
    const callArgs = latestCallArg(mocks.generateText);
    expect(
      callArgs,
      "OpenAIProvider.generateText must not pass `maxTokens` to the v5 SDK; " +
        "v5 silently drops the v1 keyword so token caps do not apply.",
    ).not.toHaveProperty("maxTokens");
  });

  it("generateObject forwards consumer maxTokens as maxOutputTokens (v5 renamed the kwarg)", async () => {
    wireSdkMocks(defaultContractFixtures);
    mocks.generateObject.mockResolvedValueOnce({
      object: { answer: "ok" },
      finishReason: "stop",
      usage: { promptTokens: 1, completionTokens: 1 },
    } as never);

    const provider = new OpenAIProvider({ apiKey: "test-key" });
    await provider.generateObject({
      schema: testSchema,
      prompt: "x",
      maxTokens: 200,
    });

    expect(mocks.generateObject).toHaveBeenCalledWith(
      expect.objectContaining({ maxOutputTokens: 200 }),
    );
    const callArgs = latestCallArg(mocks.generateObject);
    expect(callArgs).not.toHaveProperty("maxTokens");
  });
});

const itIfOpenAIKey = it.skipIf(!process.env.OPENAI_API_KEY);

describe("OpenAIProvider — real-network integration (gated, test-strategy §1, §5.7)", () => {
  itIfOpenAIKey(
    "generateText against the real OpenAI API returns a non-empty string",
    async () => {
      const provider = new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY as string,
        model: "gpt-4o-mini",
      });
      const text = await provider.generateText({
        prompt: "Respond with the single word: ok",
      });
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
    },
    30_000
  );
});

// Surface a couple of fixture imports so future editors do not accidentally
// remove them when the harness is the only consumer; both
// `recommendationFixturePrompt` and `diagramBuffer` are consumed by
// `runAIClientContract` above through `defaultContractFixtures`.
void recommendationFixture;
void recommendationFixturePrompt;
void recommendationFixtureSchema;
void diagramBuffer;
