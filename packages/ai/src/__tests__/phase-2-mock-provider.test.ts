/**
 * Phase 2 Red-phase tests for the mock AI provider.
 *
 * Driven by `measure/tracks/ai_adapter_package_20260603/plan.md` Phase 2
 * task 5 ("Add snapshot test: feed a prompt, capture the response, snapshot
 * for regression") and `test-strategy.md` §2 ("Add an exported
 * `createTestClient(overrides)` helper that returns a `MockAIClient`
 * pre-loaded with the fixtures").
 *
 * What this file pins:
 *   1. `createTestClient` is exported from `../providers/mock.js` and from
 *      the public barrel `../index.js` so Phase 6/7 service-class tests
 *      can pull a pre-loaded `AIClient` in one line.
 *   2. `createTestClient()` returns a working `MockProvider` whose
 *      `generateObject`/`generateImage`/`generateText` calls succeed with
 *      the standard fixture set (no extra wiring required).
 *   3. Per-call overrides (`createTestClient({ generateText: 'custom' })`)
 *      win over the fixture defaults.
 *   4. The shared `runAIClientContract` harness is exercised against the
 *      mock — this is the contract Phases 3 and 4 inherit.
 *   5. A snapshot of the mock's recommendation response is stored under
 *      `__snapshots__/`, so any future drift in either the fixture or
 *      MockProvider's pass-through path goes red on the next test run.
 *
 * RED expectations on first run (pre-implementation):
 *   - `createTestClient` is not exported by `../providers/mock.ts`. Items
 *     1-5 above all fail with a clear `createTestClient is not exported …`
 *     runtime error from the `resolveCreateTestClient` helper below.
 *   - `resolveCreateTestClient` is purposely written so `tsc --noEmit`
 *     (the Phase 0 build-smoke gate) stays *green* — the Red signal is
 *     runtime-only. The Green-phase implementer adds `createTestClient`
 *     to `src/providers/mock.ts`, re-exports it from `src/index.ts`,
 *     and these tests start passing without any further test edits.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { MockProvider } from "../providers/mock.js";
import * as mockModule from "../providers/mock.js";
import * as barrel from "../index.js";

import {
  recommendationFixture,
  recommendationFixturePrompt,
  recommendationFixtureSchema,
} from "../__fixtures__/recommendations.js";
import { diagramBuffer } from "../__fixtures__/diagram.js";
import {
  defaultContractFixtures,
  runAIClientContract,
} from "../__fixtures__/contract-suite.js";
import type { MockResponses } from "../providers/mock.js";

/**
 * Runtime-resolved signature for `createTestClient`. Kept here (rather than
 * imported) so this test file compiles even when the helper does not yet
 * exist in `mock.ts`. The Green-phase implementer's export must be
 * structurally compatible with this type.
 */
type CreateTestClient = (overrides?: MockResponses) => MockProvider;

/**
 * Resolve `createTestClient` from the mock module at runtime. Throws a
 * descriptive `TypeError` when the export is missing — that error is the
 * Red-phase signal the Green-phase implementer should chase.
 */
function resolveCreateTestClient(): CreateTestClient {
  const fn = (mockModule as unknown as { createTestClient?: CreateTestClient })
    .createTestClient;
  if (typeof fn !== "function") {
    throw new TypeError(
      "Phase 2 RED: `createTestClient` is not exported from " +
        "`packages/ai/src/providers/mock.ts`. Green-phase implementer: " +
        "export `createTestClient(overrides?: MockResponses): MockProvider` " +
        "and re-export it from `src/index.ts`."
    );
  }
  return fn;
}

describe("Phase 2 — createTestClient helper (test-strategy.md §2)", () => {
  it("is exported from providers/mock.js", () => {
    const exported = (
      mockModule as unknown as { createTestClient?: unknown }
    ).createTestClient;
    expect(exported).toBeDefined();
    expect(typeof exported).toBe("function");
  });

  it("is re-exported from the public barrel (packages/ai)", () => {
    const exported = (barrel as unknown as { createTestClient?: unknown })
      .createTestClient;
    expect(exported).toBeDefined();
    expect(typeof exported).toBe("function");
  });

  it("returns a MockProvider preloaded with all standard fixtures", async () => {
    const createTestClient = resolveCreateTestClient();
    const client = createTestClient();

    expect(client).toBeInstanceOf(MockProvider);

    const obj = await client.generateObject({
      schema: recommendationFixtureSchema,
      prompt: recommendationFixturePrompt,
    });
    expect(obj).toEqual(recommendationFixture);

    const img = await client.generateImage({ prompt: "any" });
    expect(Buffer.isBuffer(img)).toBe(true);
    expect(img.equals(diagramBuffer)).toBe(true);

    const txt = await client.generateText({ prompt: "any" });
    expect(typeof txt).toBe("string");
    expect(txt).toBe(defaultContractFixtures.textOutput);
  });

  it("per-call overrides win over fixture defaults", async () => {
    const createTestClient = resolveCreateTestClient();
    const customSchema = z.object({ ok: z.boolean() });
    const client = createTestClient({
      generateObject: { ok: true },
      generateText: "overridden",
    });

    await expect(
      client.generateObject({ schema: customSchema, prompt: "x" })
    ).resolves.toEqual({ ok: true });

    await expect(client.generateText({ prompt: "x" })).resolves.toBe(
      "overridden"
    );

    // generateImage was *not* overridden — falls back to the fixture default.
    const img = await client.generateImage({ prompt: "y" });
    expect(img.equals(diagramBuffer)).toBe(true);
  });
});

// -----------------------------------------------------------------------
// Shared contract suite — Phases 3 and 4 will call `runAIClientContract`
// with their own factories. Phase 2 establishes the baseline by running
// it against the mock so the harness itself is exercised in CI.
// -----------------------------------------------------------------------

runAIClientContract("MockProvider via createTestClient", () => {
  const createTestClient = resolveCreateTestClient();
  return createTestClient();
});

// -----------------------------------------------------------------------
// Snapshot test — plan.md Phase 2 task 5.
// -----------------------------------------------------------------------

describe("Phase 2 — mock provider snapshot (plan.md §Phase 2 task 5)", () => {
  it("emits the captured recommendation fixture for the deterministic prompt", async () => {
    const createTestClient = resolveCreateTestClient();
    const client = createTestClient();

    const result = await client.generateObject({
      schema: recommendationFixtureSchema,
      prompt: recommendationFixturePrompt,
    });

    expect(result).toMatchSnapshot();
  });

  it("emits the 1×1 PNG buffer for the deterministic image prompt", async () => {
    const createTestClient = resolveCreateTestClient();
    const client = createTestClient();

    const buf = await client.generateImage({
      prompt: "phase-2 deterministic diagram prompt",
    });

    expect({
      isBuffer: Buffer.isBuffer(buf),
      byteLength: buf.byteLength,
      base64: buf.toString("base64"),
    }).toMatchSnapshot();
  });
});
