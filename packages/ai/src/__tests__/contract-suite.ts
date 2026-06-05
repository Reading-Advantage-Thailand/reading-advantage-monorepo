/**
 * Shared AIClient contract harness.
 *
 * Re-runs the Phase 2 mock-provider assertions against any concrete
 * `AIClient` implementation. Phases 3 (OpenAI) and 4 (Google) inherit
 * this suite by calling `runAIClientContract(() => makeProvider())`
 * inside their own `*.test.ts` files; that way every new provider must
 * satisfy the same observable contract or the contract suite goes red.
 *
 * Design notes:
 *   - The factory takes a `responses` arg so OpenAI/Google can stub their
 *     SDK mocks with the same fixture before `makeClient` is invoked.
 *   - `prompt: 'phase-2-contract'` is a sentinel string that providers
 *     can pattern-match in their SDK mocks to return the fixture.
 *   - The suite asserts *behaviour*, not internals (no spies on private
 *     state) — so adding a new provider does not require touching the
 *     contract.
 */
import { describe, expect, it } from "vitest";
import type { AIClient } from "../types.js";
import {
  recommendationFixture,
  recommendationFixturePrompt,
  recommendationFixtureSchema,
} from "./recommendations.fixture.js";
import { diagramBuffer } from "./diagram.fixture.js";

/**
 * Optional pre-configured responses that providers may need to wire into
 * their underlying SDK mocks before `makeClient()` is invoked.
 */
export interface ContractFixtures {
  /** Object the provider should return for the recommendation prompt. */
  recommendationObject: typeof recommendationFixture;
  /** Image bytes the provider should return for `generateImage`. */
  imageBuffer: Buffer;
  /** Text the provider should return for `generateText`. */
  textOutput: string;
}

/**
 * Default fixture set used by `runAIClientContract`. Providers that need
 * to wire their SDK mocks can read these values and configure their stubs
 * before calling `runAIClientContract`.
 */
export const defaultContractFixtures: ContractFixtures = {
  recommendationObject: recommendationFixture,
  imageBuffer: diagramBuffer,
  textOutput: "phase-2 contract text output",
};

/**
 * Factory that returns a fresh `AIClient` per test. The factory receives
 * the fixture set so it can wire its SDK mocks to return matching values.
 */
export type AIClientFactory = (fixtures: ContractFixtures) => AIClient;

/**
 * Run the standard AIClient contract suite against the client returned
 * by `makeClient`. Intended to be called from inside an existing
 * `describe()` block so each provider's contract pass is visible in its
 * own test output.
 *
 * @param providerName - Display name for the `describe` block.
 * @param makeClient - Factory producing the client under test, given the
 *   fixture set so the implementer can stub their SDK mocks.
 * @param fixtures - Override fixture set; defaults to `defaultContractFixtures`.
 */
export function runAIClientContract(
  providerName: string,
  makeClient: AIClientFactory,
  fixtures: ContractFixtures = defaultContractFixtures
): void {
  describe(`AIClient contract — ${providerName}`, () => {
    it("generateObject returns the schema-validated response", async () => {
      const client = makeClient(fixtures);

      const result = await client.generateObject({
        schema: recommendationFixtureSchema,
        prompt: recommendationFixturePrompt,
      });

      expect(result).toEqual(fixtures.recommendationObject);
    });

    it("generateObject result satisfies the Zod schema", async () => {
      const client = makeClient(fixtures);

      const result = await client.generateObject({
        schema: recommendationFixtureSchema,
        prompt: recommendationFixturePrompt,
      });

      expect(recommendationFixtureSchema.safeParse(result).success).toBe(true);
    });

    it("generateImage returns a Buffer (not a Uint8Array)", async () => {
      const client = makeClient(fixtures);

      const result = await client.generateImage({
        prompt: "phase-2-contract image",
      });

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.equals(fixtures.imageBuffer)).toBe(true);
    });

    it("generateText returns the configured string", async () => {
      const client = makeClient(fixtures);

      const result = await client.generateText({
        prompt: "phase-2-contract text",
      });

      expect(typeof result).toBe("string");
      expect(result).toBe(fixtures.textOutput);
    });
  });
}
