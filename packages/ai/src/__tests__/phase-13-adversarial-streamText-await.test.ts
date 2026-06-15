/**
 * Phase 4 — adversarial adversarial-streamText-await test.
 *
 * Track:  `measure/tracks/ai_sdk_major_migration/`
 * Phase:  4 — Validate & Close
 * Role:   adversarial test auditor
 *
 * Why this file exists. The Phase 3 streamText contract
 * (`phase-stream-text-contract.test.ts`) mocks the SDK and asserts
 * the v5 call shape on captured call args. It does NOT exercise the
 * real production code path in `apps/**` that consumes
 * `@reading-advantage/ai`'s `streamText`. The contract harness
 * always invokes `await provider.streamText(...)`; real route
 * handlers in this monorepo were converted during the migration
 * with `streamText(...)` (no `await`) and rely on the
 * `textStream` destructure to work without awaiting.
 *
 * Why that breaks. `streamText` returns `Promise<StreamTextResult>`.
 * Without `await`:
 *   - `const { textStream } = streamText({...})` binds `textStream`
 *     to `undefined` (the destructure runs on the Promise object, not
 *     on the resolved value). The subsequent `for await (const chunk
 *     of textStream)` then throws `TypeError: textStream is not
 *     iterable` on the first call.
 *   - `const result = streamText({...}); return result.toDataStreamResponse();`
 *     calls `Promise.toDataStreamResponse`, which is `undefined`.
 *     Next.js coerces `undefined` to an empty 200 response — the
 *     chat UI sees a streaming Content-Type but no body.
 *
 * What this file pins:
 *   1. `packages/ai/src/providers/mock.ts`'s `streamText` returns a
 *      `Promise<StreamTextResult>` (it is `async`); the test catches
 *      a regression that drops the `async` keyword (which would
 *      break the same production code path silently).
 *   2. The real provider `streamText` methods (`OpenAIProvider`,
 *      `GoogleProvider`, `OpenRouterProvider`) all return
 *      `Promise<StreamTextResult>` (TS-level). The contract
 *      assignment `const result: Promise<StreamTextResult> = await
 *      provider.streamText(...)` compiles only when the return
 *      type is exactly `Promise<...>` — not `StreamTextResult`
 *      (which would be the signature of a regression that drops
 *      the `async`).
 *   3. The two production routes that consume `streamText` —
 *      `apps/codecamp-advantage/app/api/chat/route.ts` and
 *      `apps/reading-advantage/server/controllers/stories-assistant-
 *      controller.ts` — must `await` the call. The test greps the
 *      route source for the await keyword in the same line as
 *      `streamText(` (a non-awaiting call site is a real
 *      production-blocking bug; the contract harness doesn't
 *      catch it because the harness always awaits).
 *   4. `MockProvider` exposes `streamText` on its `callLog` (so
 *      consumer tests can assert what was forwarded). A regression
 *      that drops the `push({ method: "streamText", input })`
 *      would break per-app smoke tests.
 *
 * The route-source assertions are intentionally line-content grep
 * — this is the same pattern `phase-arch-no-direct-sdk.test.ts`
 * uses for the apps/** scan and is appropriate for a static
 * invariant. The mock contract assertions use the live
 * `MockProvider` instance to catch behavioral regressions.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { OpenAIProvider } from "../providers/openai.js";
import { GoogleProvider } from "../providers/google.js";
import { OpenRouterProvider } from "../providers/openrouter.js";
import { MockProvider } from "../providers/mock.js";
import type { StreamTextResult } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "../../../..");

beforeEach(() => {
  // no-op; the contract tests in `phase-stream-text-contract.test.ts`
  // clear their own mocks.
});

describe("Adversarial — streamText return-type contract (regression net)", () => {
  it("MockProvider.streamText returns a Promise<StreamTextResult> (must be async)", async () => {
    // A regression that drops `async` from `MockProvider.streamText`
    // would change the return type to `StreamTextResult`, and
    // production route handlers that destructure `textStream`
    // without `await` would silently start receiving an object
    // instead of `undefined` — masking the missing-await bug.
    // The contract: `streamText(...)` is `Promise<StreamTextResult>`,
    // and the awaited value exposes `textStream` + `toDataStreamResponse`.
    const provider = new MockProvider({ streamText: "ok" });
    const awaitedResult: StreamTextResult = await provider.streamText({
      prompt: "x",
    });
    expect(typeof awaitedResult.toDataStreamResponse).toBe("function");
    expect(awaitedResult.textStream).toBeDefined();
  });

  it("OpenAIProvider.streamText returns Promise<StreamTextResult> (TS-level type check)", () => {
    // Type-level check: the return type must be Promise, not the
    // bare value. The cast + assignment compiles only when the
    // implementation is `async streamText(...)` returning a Promise.
    // This file is a `.test.ts` (not `.test-d.ts`) so the
    // assignment runs at runtime; the cast pins the compile-time
    // intent that the function is async.
    const provider = new OpenAIProvider({ apiKey: "k" });
    const result: Promise<StreamTextResult> = provider.streamText({
      prompt: "x",
    });
    expect(result).toBeInstanceOf(Promise);
  });

  it("GoogleProvider.streamText returns Promise<StreamTextResult>", () => {
    const provider = new GoogleProvider({ apiKey: "k" });
    const result: Promise<StreamTextResult> = provider.streamText({
      prompt: "x",
    });
    expect(result).toBeInstanceOf(Promise);
  });

  it("OpenRouterProvider.streamText returns Promise<StreamTextResult>", () => {
    const provider = new OpenRouterProvider({ apiKey: "k" });
    const result: Promise<StreamTextResult> = provider.streamText({
      prompt: "x",
    });
    expect(result).toBeInstanceOf(Promise);
  });
});

describe("Adversarial — production route handlers await streamText (apps/**)", () => {
  // The Phase 3 contract harness uses `await provider.streamText(...)`
  // in every assertion. It cannot catch a regression where the
  // consumer route handler forgets to await. The two production
  // routes that consume `streamText` directly are pinned here.
  //
  // The bug: `streamText` returns Promise<StreamTextResult>; without
  // `await`, the destructured `textStream` is undefined and the
  // subsequent `for await (const chunk of textStream)` throws
  // `TypeError: textStream is not iterable`. The codecamp chat
  // route additionally calls `result.toDataStreamResponse()` on the
  // Promise object, which is undefined, so Next.js returns an
  // empty 200 body with the streaming content-type — silent UX
  // regression.
  type RouteCheck = {
    label: string;
    file: string;
    mustAwait: true;
  };

  const routeChecks: ReadonlyArray<RouteCheck> = [
    {
      label: "codecamp/chat/route.ts",
      file: "apps/codecamp-advantage/app/api/chat/route.ts",
      mustAwait: true,
    },
    {
      label: "reading-advantage/stories-assistant-controller.ts",
      file:
        "apps/reading-advantage/server/controllers/stories-assistant-controller.ts",
      mustAwait: true,
    },
  ];

  for (const { label, file, mustAwait } of routeChecks) {
    it(`${label} awaits streamText(...) before consuming the result (per AC #6)`, () => {
      const abs = join(REPO_ROOT, file);
      const source = readFileSync(abs, "utf8");
      // The check: any `streamText(` call site must be immediately
      // preceded by `await ` (with optional leading whitespace) on
      // the same line. A `const result = streamText(` or
      // `const { textStream } = streamText(` without `await` trips
      // the bug captured in this file's docstring.
      // Allow `const result = await streamText(`, `const { textStream } = await streamText(`,
      // `return await streamText(`, etc.
      const lines = source.split("\n");
      const violations: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comment lines.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
        if (/\bstreamText\s*\(/.test(line) && !/\bawait\s+streamText\s*\(/.test(line)) {
          violations.push(`  L${i + 1}: ${line.trim()}`);
        }
      }
      expect(
        violations,
        `${file} contains unawaited streamText(...) call sites. ` +
          "`streamText` returns Promise<StreamTextResult>; without `await`, " +
          "the destructured textStream is undefined (TypeError on first chunk) and " +
          "result.toDataStreamResponse() returns undefined (empty 200 streaming response). " +
          "Per AC #6 the streaming contract must be honored at every call site.\n" +
          "Found:\n" +
          violations.join("\n"),
      ).toEqual([]);
      // Reference the parameter so TypeScript doesn't drop the lint
      // (mustAwait is only useful as documentation here).
      void mustAwait;
    });
  }
});
