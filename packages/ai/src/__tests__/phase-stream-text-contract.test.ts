/**
 * Phase 3 Red-phase contract: `AIClient.streamText` exists, returns
 * the documented `StreamTextResult` shape, and forwards `maxTokens`
 * as the v5 SDK kwarg `maxOutputTokens` (NOT the legacy v1 `maxTokens`).
 *
 * Track:  `measure/tracks/ai_sdk_major_migration/`
 * Phase:  3 — Implement (Task 2: "Update the internal AI adapter for
 *         breaking API changes")
 *
 * Per test-strategy §3 item 4 ("Streaming (acceptance #6): codecamp
 * uses `streamText` directly. Either grow `AIClient.streamText` or
 * document codecamp as exempt in tech-debt"), the JR chose Path A —
 * grow the adapter. This file is the Red half of that contract; the
 * Green implementation lives in `packages/ai/src/{types,providers/*}.ts`.
 *
 * What this file pins:
 *   1. `AIClient` interface exposes a `streamText` method
 *      (interface surface — `packages/ai/src/types.ts`).
 *   2. `StreamTextInput` / `StreamTextResult` are exported from the
 *      adapter barrel (`packages/ai/src/index.ts`) so app code can
 *      import the types without reaching into internal paths.
 *   3. `MockProvider.streamText` returns a `StreamTextResult` with the
 *      documented `textStream` (AsyncIterable<string>) and
 *      `toDataStreamResponse` method.
 *   4. Each real provider (`OpenAIProvider`, `GoogleProvider`,
 *      `OpenRouterProvider`) forwards the consumer's `maxTokens` to
 *      the v5 SDK as `maxOutputTokens` (mirrors the v2-shape contract
 *      from `phase-11-sdk-v2-call-shape.test.ts` for the existing
 *      `generateText` / `generateObject` paths).
 *
 * RED expectations at HEAD (recorded in the commit body):
 *   - HEAD `AIClient` interface (last commit `ebcc9719`) has no
 *     `streamText` method; `MockProvider` has no `streamText`
 *     implementation; real providers do not import `streamText`
 *     from `"ai"`; `StreamTextInput` / `StreamTextResult` types are
 *     not exported. This file's TS-level `import { streamText } from
 *     "../types.js"` reference to the interface method will fail
 *     to compile under `pnpm check-types`, and the runtime asserts
 *     below will throw "client.streamText is not a function".
 *   - The v2-shape assertions on the real providers fail because the
 *     real providers never invoke `aiStreamText(...)` at HEAD, so the
 *     `mocks.streamText` mock has zero captured calls.
 *
 * Per test-strategy §7, this file is owned by its `[~]` task and
 * flips Green only when the JR completes the adapter changes. It is
 * NOT paired with a per-app `*-ai-adapter-smoke.test.ts`; the
 * per-app smokes are owned by each per-app migration task and added
 * when those tasks start (test-strategy §5 P3).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleProvider } from "../providers/google.js";
import { OpenAIProvider } from "../providers/openai.js";
import { OpenRouterProvider } from "../providers/openrouter.js";
import { MockProvider } from "../providers/mock.js";
import type { AIClient, StreamTextResult } from "../types.js";

// ─── Mock surface ─────────────────────────────────────────────────────
//
// Mock the v5 SDK `streamText` export. The contract is "the adapter
// forwards consumer `maxTokens` as `maxOutputTokens` (v5 kwarg)" — the
// mock lets the test pin both the positive (`maxOutputTokens: 100`) and
// the negative (`maxTokens` must not appear) on the captured call args.
const mocks = vi.hoisted(() => ({
  streamText: vi.fn(),
}));

vi.mock("ai", async () => {
  const actual =
    await vi.importActual<typeof import("ai")>("ai").catch(() => ({
      // Fallback when the test runner cannot resolve the real module
      // (CI environment without network); the mock below provides the
      // symbols the providers import so they load without throwing.
    } as unknown as typeof import("ai")));
  return {
    ...actual,
    streamText: mocks.streamText,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────

interface StreamTextCallArg {
  model?: unknown;
  prompt?: unknown;
  messages?: unknown;
  system?: unknown;
  temperature?: unknown;
  maxTokens?: unknown;
  maxOutputTokens?: unknown;
}

function latestStreamTextCall(): StreamTextCallArg | undefined {
  return mocks.streamText.mock.calls.at(-1)?.[0] as
    | StreamTextCallArg
    | undefined;
}

function makeResultStream(chunks: string[]): AsyncIterable<string> {
  async function* gen() {
    for (const c of chunks) yield c;
  }
  return gen();
}

function wireStreamTextMockResult(chunks: string[] = ["hello-stream"]): void {
  mocks.streamText.mockResolvedValue({
    textStream: makeResultStream(chunks),
    toDataStreamResponse: () =>
      new Response(chunks.join(""), { headers: { "Content-Type": "text/plain" } }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. `AIClient` interface exposes `streamText` (compile-time + runtime) ─

describe("Phase 3 Task 2 — AIClient interface exposes streamText", () => {
  it("AIClient.streamText is declared on the interface and callable at runtime", async () => {
    // Compile-time check: assigning a `MockProvider` to `AIClient`
    // and calling `.streamText({...})` must type-check. At HEAD,
    // `MockProvider` does not implement `streamText`, so the cast
    // below will fail at `pnpm check-types`. The runtime assert
    // independently pins that the function exists.
    const client: AIClient = new MockProvider({ streamText: "ok" });

    expect(
      typeof client.streamText,
      "AIClient interface must declare a `streamText` method. " +
        "Today (HEAD) the adapter does not expose streamText, so the " +
        "Phase 3 Task 2 implementation must add it (see test-strategy " +
        "§3 item 4: 'grow AIClient.streamText').",
    ).toBe("function");

    const result = await client.streamText({ prompt: "hi" });
    const typed: StreamTextResult = result;

    expect(typed).toBeDefined();
    expect(
      typed.textStream,
      "StreamTextResult must expose an AsyncIterable<string> textStream",
    ).toBeDefined();
    expect(
      typeof typed.toDataStreamResponse,
      "StreamTextResult must expose a toDataStreamResponse() method for Next.js route handlers",
    ).toBe("function");
  });

  it("MockProvider.streamText records the call and returns the configured text", async () => {
    const provider = new MockProvider({ streamText: "streamed text" });
    const result = await provider.streamText({ prompt: "hello" });

    // MockProvider pushes the call onto its callLog so consumer
    // tests can assert what was forwarded. At HEAD this method
    // does not exist, so this assertion fires.
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]).toEqual({
      method: "streamText",
      input: { prompt: "hello" },
    });

    // Drain the textStream so we can assert the MockProvider yields
    // its configured string back to the caller.
    const collected: string[] = [];
    for await (const chunk of result.textStream) collected.push(chunk);
    expect(collected.join("")).toBe("streamed text");

    // toDataStreamResponse must be callable and return a Response.
    const response = result.toDataStreamResponse();
    expect(response).toBeInstanceOf(Response);
  });
});

// ─── 2. Real providers forward maxTokens as maxOutputTokens (v5 kwarg) ─

describe("Phase 3 Task 2 — real providers forward maxTokens as maxOutputTokens (v5)", () => {
  function wireMocksForProvider(): void {
    wireStreamTextMockResult(["v5-stream-chunk"]);
  }

  it("OpenAIProvider.streamText calls the v5 SDK with maxOutputTokens, not maxTokens", async () => {
    wireMocksForProvider();

    const provider = new OpenAIProvider({ apiKey: "test-key" });
    await provider.streamText({ prompt: "x", maxTokens: 100 });

    expect(
      mocks.streamText,
      "OpenAIProvider.streamText must invoke the v5 `streamText` SDK call",
    ).toHaveBeenCalledTimes(1);
    const callArgs = latestStreamTextCall();
    expect(callArgs).toBeDefined();
    expect(
      callArgs!.maxOutputTokens,
      "OpenAIProvider.streamText must rename consumer `maxTokens` to `maxOutputTokens` " +
        "(v5 SDK keyword). v5 silently drops `maxTokens`, so token caps " +
        "would not apply otherwise.",
    ).toBe(100);
    expect(
      callArgs!.maxTokens,
      "OpenAIProvider.streamText must NOT pass `maxTokens` (v1 kwarg) to the v5 SDK",
    ).toBeUndefined();
  });

  it("GoogleProvider.streamText calls the v5 SDK with maxOutputTokens, not maxTokens", async () => {
    wireMocksForProvider();

    const provider = new GoogleProvider({ apiKey: "test-key" });
    await provider.streamText({ prompt: "x", maxTokens: 250 });

    expect(mocks.streamText).toHaveBeenCalledTimes(1);
    const callArgs = latestStreamTextCall();
    expect(callArgs!.maxOutputTokens).toBe(250);
    expect(callArgs!.maxTokens).toBeUndefined();
  });

  it("OpenRouterProvider.streamText calls the v5 SDK with maxOutputTokens, not maxTokens", async () => {
    wireMocksForProvider();

    const provider = new OpenRouterProvider({ apiKey: "test-key" });
    await provider.streamText({ prompt: "x", maxTokens: 75 });

    expect(mocks.streamText).toHaveBeenCalledTimes(1);
    const callArgs = latestStreamTextCall();
    expect(callArgs!.maxOutputTokens).toBe(75);
    expect(callArgs!.maxTokens).toBeUndefined();
  });
});

// ─── 3. Adapter barrel re-exports StreamTextInput / StreamTextResult ────

describe("Phase 3 Task 2 — adapter barrel exports StreamTextInput / StreamTextResult", () => {
  it("packages/ai/src/index.ts re-exports StreamTextInput from ./types.js", async () => {
    // Re-read the index barrel as text to avoid coupling this test to
    // a built dist/ output (the package is workspace-linked via source).
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const indexPath = join(__dirname, "../index.ts");
    const source = readFileSync(indexPath, "utf8");

    // Compile-time ref: StreamTextInput must be in the type export list.
    const typeExportBlock = source.match(
      /export\s+type\s*\{[^}]*\}\s+from\s+["']\.\/types\.js["']/,
    );
    expect(typeExportBlock, "packages/ai/src/index.ts must declare a type export block from ./types.js").not.toBeNull();
    expect(
      /\bStreamTextInput\b/.test(typeExportBlock![0]),
      "packages/ai/src/index.ts must re-export `StreamTextInput` from ./types.js so " +
        "consumers can type their StreamTextInput without reaching into the " +
        "internal types module.",
    ).toBe(true);
  });
});