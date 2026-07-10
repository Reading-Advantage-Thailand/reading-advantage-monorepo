export {
  recordRun,
  recordRunFailure,
  resetRateLimitStore,
  RateLimitError,
  type MasteryHttpResponse,
} from "./record-run.js";

export {
  MASTERY_PERSISTENCE_CONTRACT_VERSION,
  masteryProvenanceSchema,
  masteryAuditSchema,
  masteryCardRecordSchema,
  masteryReviewRecordSchema,
  masteryEvidenceRecordSchema,
  masteryStateRecordSchema,
  masteryPlacementRecordSchema,
  masteryCalibrationRecordSchema,
  masteryCommitRecordIdsSchema,
  masteryCommitRecordSchema,
  masterySnapshotInputSchema,
  masterySnapshotSchema,
  commitMasteryEvidenceInputSchema as masteryPersistenceCommitInputSchema,
  commitMasteryEvidenceResultSchema,
  type MasteryProvenance,
  type MasteryAudit,
  type MasteryCardRecord,
  type MasteryReviewRecord,
  type MasteryEvidenceRecord,
  type MasteryStateRecord,
  type MasteryPlacementRecord,
  type MasteryCalibrationRecord,
  type MasteryCommitRecord,
  type MasterySnapshotInput,
  type MasterySnapshot,
  type CommitMasteryEvidenceInput,
  type CommitMasteryEvidenceResult,
} from "./persistence-contracts.js";
export * from "./persistence-ports.js";
export * from "./in-memory-mastery-persistence.js";
export * from "./commit-evidence.js";
export type { DrizzleMasteryPersistenceOptions } from "./drizzle-mastery-persistence.js";

import {
  commitMasteryEvidenceInputSchema as masteryPersistenceCommitInputSchema,
} from "./persistence-contracts.js";
import { masteryEvidenceCommitInputSchema } from "./commit-evidence.js";
import type { MasteryPersistencePort } from "./persistence-ports.js";
import type { DrizzleMasteryPersistenceOptions } from "./drizzle-mastery-persistence.js";

/**
 * Public mastery commit boundary accepting either the orchestration command or
 * the portable persistence-adapter command.
 */
export const commitMasteryEvidenceInputSchema = masteryEvidenceCommitInputSchema.or(
  masteryPersistenceCommitInputSchema,
);

/**
 * Creates a lazily loaded Drizzle adapter without coupling non-database domain
 * consumers to the database runtime.
 * @param options Schema-aware Drizzle database and optional tenant composition factory.
 * @returns A mastery persistence port backed by the Drizzle adapter.
 */
export function createDrizzleMasteryPersistence(
  options: DrizzleMasteryPersistenceOptions,
): MasteryPersistencePort {
  let adapter: Promise<MasteryPersistencePort> | undefined;
  const load = (): Promise<MasteryPersistencePort> => {
    adapter ??= import("./drizzle-mastery-persistence.js").then((module) =>
      module.createDrizzleMasteryPersistence(options),
    );
    return adapter;
  };
  return {
    readSnapshot: async (input) => (await load()).readSnapshot(input),
    commitMasteryEvidence: async (input) =>
      (await load()).commitMasteryEvidence(input),
  };
}
