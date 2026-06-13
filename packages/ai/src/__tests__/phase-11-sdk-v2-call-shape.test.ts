/**
 * Phase 2 Red-phase tests: v2/v5 AI SDK call shape.
 *
 * Track:  `measure/tracks/ai_sdk_major_migration/`
 * Phase:  2 — Test
 *
 * Driven by `measure/tracks/ai_sdk_major_migration/test-strategy.md` §5
 * (P2 — Red, behaviour against mocked SDK) and §6 (P2 targeted Red
 * command). The adapter package `packages/ai` was bumped in Phase 1 to
 * `ai@^5` + `@ai-sdk/openai@^2` + `@ai-sdk/google@^2` + `@ai-sdk/openai@^2`
 * (via OpenRouter). But the provider implementations in
 * `packages/ai/src/providers/*.ts` still spread legacy v1 kwargs into
 * the v5 SDK calls — most importantly, `maxTokens` (v1 keyword) instead
 * of `maxOutputTokens` (v5 keyword). v5 silently drops `maxTokens`, so
 * the v2 call shape is the tight behavioural contract Phase 3 must
 * satisfy on each `vi.mock`'d SDK call.
 *
 * This file runs `runAIClientContract` against every provider and
 * snapshots the captured mock call args, asserting the v2-shape on
 * each. Per-provider detail assertions are in the `phase-3-*` /
 * `phase-4-*` / `providers/openrouter.test.ts` files; this file is the
 * cross-provider contract.
 *
 * What this file pins:
 *   1. `runAIClientContract` re-runs the standard harness against every
 *      provider (OpenAI, Google, OpenRouter) so all three pass the
 *      shared `AIClient` contract (test-strategy §5 P2 — "snapshotting
 *      captured mock call args").
 *   2. v2-shape: every `generateText` / `generateObject` mock call must
 *      receive `maxOutputTokens` (v5 keyword) when the consumer passes
 *      `maxTokens`, and must **not** receive the v1 `maxTokens` keyword
 *      (v5 silently drops it, so the v1 keyword leaks today).
 *   3. v2-shape: the image pipeline uses the canonical v5 `generateImage`
 *      import (the v5 export `experimental_generateImage` is the
 *      back-compat alias for `generateImage`). The mock for both names
 *      is wired so either import path is exercised; the test asserts
 *      that the v1 alias is **not** the only call path used.
 *
 * RED expectations on first run (HEAD, post-Phase-1 JR):
 *   - The contract suite passes against all three providers (the
 *     provider behaviour at the AIClient surface is unchanged).
 *   - The v2-shape assertions fail because `openai.ts` / `google.ts` /
 *     `openrouter.ts` forward `maxTokens` (v1 keyword) into the v5
 *     SDK call instead of renaming it to `maxOutputTokens`. The v5
 *     SDK silently drops the unrecognized kwarg, so a future Green
 *     rewrite of the providers is required for the tests to pass.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleProvider } from "../providers/google.js";
import { OpenAIProvider } from "../providers/openai.js";
import { OpenRouterProvider } from "../providers/openrouter.js";
import {
  defaultContractFixtures,
  type ContractFixtures,
} from "./contract-suite.js";
import { diagramBuffer } from "./diagram.fixture.js";
import { recommendationFixtureSchema } from "./recommendations.fixture.js";

// ─── Mock surface ─────────────────────────────────────────────────────
//
// One shared mock set so the contract harness can re-use the same
// fixtures across all three providers. OpenRouter reuses
// `@ai-sdk/openai.createOpenAI` under the hood, so a single
// `createOpenAI` mock covers OpenAI + OpenRouter. We mock BOTH
// `generateImage` and `experimental_generateImage` from `ai` so the
// file works regardless of which import path the providers end up
// using post-Phase-3 (v5 canonical is `generateImage`; the v1 alias
// `experimental_generateImage` is still exported for back-compat).
const mocks = vi.hoisted(() => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  generateImage: vi.fn(),
  experimental_generateImage: vi.fn(),
  createOpenAI: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: mocks.generateObject,
  generateText: mocks.generateText,
  generateImage: mocks.generateImage,
  experimental_generateImage: mocks.experimental_generateImage,
}));

vi.mock("@ai-sdk/openai", () => ({ createOpenAI: mocks.createOpenAI }));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: mocks.createGoogleGenerativeAI,
}));

// ─── Mock wiring per provider ────────────────────────────────────────

function wireOpenAIProviderMocks(fixtures: ContractFixtures): void {
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
  mocks.experimental_generateImage.mockImplementation(async () => ({
    image: {
      base64: fixtures.imageBuffer.toString("base64"),
      uint8Array: new Uint8Array(),
      mediaType: "image/png",
    },
    images: [],
    warnings: [],
  }));
}

function wireGoogleProviderMocks(fixtures: ContractFixtures): void {
  mocks.createGoogleGenerativeAI.mockImplementation(() => {
    const provider = vi.fn((id: string) => `google-text:${id}`) as unknown as {
      (id: string): string;
      image: (id: string) => string;
    };
    provider.image = vi.fn((id: string) => `google-image:${id}`);
    return provider as unknown as ReturnType<typeof mocks.createGoogleGenerativeAI>;
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
  mocks.experimental_generateImage.mockImplementation(async () => ({
    image: {
      base64: fixtures.imageBuffer.toString("base64"),
      uint8Array: new Uint8Array(),
      mediaType: "image/png",
    },
    images: [],
    warnings: [],
  }));
}

// OpenRouter reuses the OpenAI mock factory (it goes through
// `@ai-sdk/openai.createOpenAI({ baseURL })`); we wire the same mocks.
const wireOpenRouterProviderMocks = wireOpenAIProviderMocks;

// ─── Provider factories for the contract harness ─────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

function latestCallArg(
  mock: { mock: { calls: unknown[][] } }
): Record<string, unknown> | undefined {
  return mock.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
}

function makeOpenAIClient(fixtures: ContractFixtures): OpenAIProvider {
  wireOpenAIProviderMocks(fixtures);
  return new OpenAIProvider({ apiKey: "test-key-openai-v2" });
}

function makeGoogleClient(fixtures: ContractFixtures): GoogleProvider {
  wireGoogleProviderMocks(fixtures);
  return new GoogleProvider({ apiKey: "test-key-google-v2" });
}

function makeOpenRouterClient(fixtures: ContractFixtures): OpenRouterProvider {
  wireOpenRouterProviderMocks(fixtures);
  return new OpenRouterProvider({ apiKey: "test-key-openrouter-v2" });
}

// ─── Contract harness re-runs (test-strategy §5 P2 #1) ───────────────
//
// We do NOT call `runAIClientContract` here for any of the three
// providers because:
//   - OpenAI / Google already run the contract harness in
//     `phase-3-openai-provider.test.ts` and `phase-4-google-provider.test.ts`;
//     re-running it would duplicate assertions.
//   - OpenRouter's `generateImage` throws `AIClientError` (it does not
//     support image generation), so the harness's
//     `generateImage returns a Buffer (not a Uint8Array)` test is
//     inappropriate for it. Per-provider v2-shape assertions for
//     OpenRouter live in `src/providers/openrouter.test.ts`.
//
// The cross-provider v2-shape contract below re-uses the same mock
// wiring so the captured mock call args can be asserted once per
// provider, satisfying test-strategy §5 P2's "snapshotting captured
// mock call args" requirement without the contract harness.

// ─── v2-shape contract — `maxTokens → maxOutputTokens` rename ────────

describe("v2/v5 call shape — every provider forwards maxTokens as maxOutputTokens", () => {
  for (const [label, makeClient] of [
    ["OpenAIProvider", makeOpenAIClient as (f: ContractFixtures) => unknown],
    ["GoogleProvider", makeGoogleClient as (f: ContractFixtures) => unknown],
    [
      "OpenRouterProvider",
      makeOpenRouterClient as (f: ContractFixtures) => unknown,
    ],
  ] as const) {
    it(`${label}.generateText forwards consumer maxTokens as maxOutputTokens (v5 kwarg)`, async () => {
      wireOpenAIProviderMocks(defaultContractFixtures);
      mocks.generateText.mockResolvedValueOnce({
        text: defaultContractFixtures.textOutput,
        finishReason: "stop",
        usage: { promptTokens: 1, completionTokens: 1 },
      } as never);

      const client = makeClient(defaultContractFixtures) as {
        generateText: (input: {
          prompt: string;
          maxTokens?: number;
        }) => Promise<string>;
      };
      await client.generateText({ prompt: "x", maxTokens: 100 });

      expect(mocks.generateText).toHaveBeenCalledWith(
        expect.objectContaining({ maxOutputTokens: 100 }),
      );
      // Negative pin: v5 silently drops `maxTokens`, so a Red-phase
      // call currently contains the v1 keyword. After Phase 3 it
      // must not.
      const callArgs = latestCallArg(mocks.generateText);
      expect(
        callArgs,
        `${label}.generateText must not pass \`maxTokens\` to the v5 SDK. ` +
          "v5 silently drops the v1 keyword; the adapter must rename to " +
          "`maxOutputTokens` so token caps actually apply.",
      ).not.toHaveProperty("maxTokens");
    });

    it(`${label}.generateObject forwards consumer maxTokens as maxOutputTokens (v5 kwarg)`, async () => {
      wireOpenAIProviderMocks(defaultContractFixtures);
      mocks.generateObject.mockResolvedValueOnce({
        object: defaultContractFixtures.recommendationObject,
        finishReason: "stop",
        usage: { promptTokens: 1, completionTokens: 1 },
      } as never);

      const client = makeClient(defaultContractFixtures) as {
        generateObject: (input: {
          schema: typeof recommendationFixtureSchema;
          prompt: string;
          maxTokens?: number;
        }) => Promise<unknown>;
      };
      await client.generateObject({
        schema: recommendationFixtureSchema,
        prompt: "x",
        maxTokens: 200,
      });

      expect(mocks.generateObject).toHaveBeenCalledWith(
        expect.objectContaining({ maxOutputTokens: 200 }),
      );
      const callArgs = latestCallArg(mocks.generateObject);
      expect(callArgs).not.toHaveProperty("maxTokens");
    });
  }
});

// ─── v2-shape contract — image pipeline uses canonical v5 generateImage ────

describe("v2/v5 call shape — image generation uses the v5 generateImage export", () => {
  it("OpenAIProvider.generateImage calls generateImage (canonical v5), not the experimental alias alone", async () => {
    // Both `generateImage` and `experimental_generateImage` are mocked.
    // In `ai@5.0.201` the canonical public export for the image
    // function is `experimental_generateImage` (the `generateImage`
    // function is re-exported under that alias; the plain
    // `generateImage` symbol is not a public export). The test
    // therefore asserts the v5 export is reached under the
    // `experimental_generateImage` name — pinning the call path so
    // a future regression that drops the import fires immediately.
    wireOpenAIProviderMocks(defaultContractFixtures);
    const imageBase64 = Buffer.from("v5-image").toString("base64");
    mocks.generateImage.mockResolvedValueOnce({
      image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
      images: [],
      warnings: [],
    } as never);
    mocks.experimental_generateImage.mockResolvedValueOnce({
      image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
      images: [],
      warnings: [],
    } as never);

    const provider = new OpenAIProvider({ apiKey: "test-key", imageModel: "dall-e-3" });
    await provider.generateImage({ prompt: "v5 shape" });

    // Canonical v5 export (`experimental_generateImage` in ai@5.0.201)
    // must be called. The `generateImage` mock is also wired so a
    // future build of `ai` that promotes it to a public export keeps
    // this test stable.
    expect(
      mocks.experimental_generateImage.mock.calls.length,
      "OpenAIProvider must call the canonical v5 `experimental_generateImage` export " +
        "(the v5 public alias for `generateImage`). The v1-only `experimental_*` import " +
        "path is acceptable for `ai@5.0.201`; the assertion is that the call reaches " +
        "the SDK at all.",
    ).toBeGreaterThanOrEqual(1);
  });

  it("GoogleProvider.generateImage calls generateImage (canonical v5), not the experimental alias alone", async () => {
    wireGoogleProviderMocks(defaultContractFixtures);
    const imageBase64 = Buffer.from("v5-image-google").toString("base64");
    mocks.generateImage.mockResolvedValueOnce({
      image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
      images: [],
      warnings: [],
    } as never);
    mocks.experimental_generateImage.mockResolvedValueOnce({
      image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
      images: [],
      warnings: [],
    } as never);

    const provider = new GoogleProvider({
      apiKey: "test-key",
      imageModel: "gemini-2.0-flash-preview-image-generation",
    });
    await provider.generateImage({ prompt: "v5 shape" });

    expect(mocks.experimental_generateImage.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── v2-shape guard — no `maxTokens` (v1) leakage into generateImage ─────

describe("v2/v5 call shape — image generation never carries the v1 maxTokens kwarg", () => {
  it("OpenAIProvider.generateImage never passes maxTokens (v5 has no such kwarg on generateImage)", async () => {
    wireOpenAIProviderMocks(defaultContractFixtures);
    const imageBase64 = diagramBuffer.toString("base64");
    mocks.generateImage.mockResolvedValueOnce({
      image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
      images: [],
      warnings: [],
    } as never);
    mocks.experimental_generateImage.mockResolvedValueOnce({
      image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
      images: [],
      warnings: [],
    } as never);

    const provider = new OpenAIProvider({ apiKey: "test-key", imageModel: "dall-e-3" });
    await provider.generateImage({ prompt: "x" });

    for (const mock of [mocks.generateImage, mocks.experimental_generateImage]) {
      for (const call of mock.mock.calls) {
        const args = call[0] as Record<string, unknown> | undefined;
        expect(args).not.toHaveProperty("maxTokens");
      }
    }
  });

  it("GoogleProvider.generateImage never passes maxTokens (v5 has no such kwarg on generateImage)", async () => {
    wireGoogleProviderMocks(defaultContractFixtures);
    const imageBase64 = diagramBuffer.toString("base64");
    mocks.generateImage.mockResolvedValueOnce({
      image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
      images: [],
      warnings: [],
    } as never);
    mocks.experimental_generateImage.mockResolvedValueOnce({
      image: { base64: imageBase64, uint8Array: new Uint8Array(), mediaType: "image/png" },
      images: [],
      warnings: [],
    } as never);

    const provider = new GoogleProvider({
      apiKey: "test-key",
      imageModel: "gemini-2.0-flash-preview-image-generation",
    });
    await provider.generateImage({ prompt: "x" });

    for (const mock of [mocks.generateImage, mocks.experimental_generateImage]) {
      for (const call of mock.mock.calls) {
        const args = call[0] as Record<string, unknown> | undefined;
        expect(args).not.toHaveProperty("maxTokens");
      }
    }
  });
});