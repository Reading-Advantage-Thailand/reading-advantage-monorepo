import { resolve } from "node:path";
import { describe, it } from "vitest";

const configuredRoot = process.env.RA_MATH_V2_ROOT;

/** Runs a suite only when the historical ra-math v2 checkout is configured. */
export const describeHistoricalV2 = configuredRoot ? describe : describe.skip;

/** Runs a test only when the historical ra-math v2 checkout is configured. */
export const itHistoricalV2 = configuredRoot ? it : it.skip;

/** Resolves a path inside the configured historical ra-math v2 checkout.
 * @param segments Relative path segments inside the checkout.
 * @returns Absolute path inside the configured checkout.
 * @throws When RA_MATH_V2_ROOT is not configured.
 */
export function resolveHistoricalV2Path(...segments: string[]): string {
  if (!configuredRoot) {
    throw new Error("Set RA_MATH_V2_ROOT to run historical v2 checks.");
  }
  return resolve(configuredRoot, ...segments);
}
