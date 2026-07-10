export * from "./persistence-contracts.js";
export * from "./persistence-ports.js";
export * from "./in-memory-mastery-persistence.js";
export * from "./commit-evidence.js";
export {
  recordRun,
  recordRunFailure,
  resetRateLimitStore,
  RateLimitError,
  type MasteryHttpResponse,
} from "./legacy.js";
export type { DrizzleMasteryPersistenceOptions } from "./drizzle-mastery-persistence.js";

import type { DrizzleMasteryPersistenceOptions } from "./drizzle-mastery-persistence.js";
import type { MasteryPersistencePort } from "./persistence-ports.js";

/**
 * Creates a lazily loaded Drizzle adapter without initializing database state.
 * @param options Schema-aware Drizzle database and tenant composition options.
 * @returns A high-level mastery persistence port backed by Drizzle.
 */
export function createDrizzleMasteryPersistence(
  options: DrizzleMasteryPersistenceOptions,
): MasteryPersistencePort {
  let adapter: Promise<MasteryPersistencePort> | undefined;
  const load = (): Promise<MasteryPersistencePort> => {
    adapter ??= import("./drizzle-mastery-persistence.js").then(
      (module) => module.createDrizzleMasteryPersistence(options) as MasteryPersistencePort,
    );
    return adapter;
  };
  return {
    readSnapshot: async (input) => (await load()).readSnapshot(input),
    commitMasteryEvidence: async (input) =>
      (await load()).commitMasteryEvidence(input),
    approveMasteryCalibration: async (input) =>
      (await load()).approveMasteryCalibration(input),
  };
}
