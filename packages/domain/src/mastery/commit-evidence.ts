import {
  commitMasteryEvidenceInputSchema,
  masteryCalibrationApprovalInputSchema,
  type ApproveMasteryCalibrationResult,
  type CommitMasteryEvidenceResult,
} from "./persistence-contracts.js";
import {
  MasteryPersistenceError,
  type MasteryPersistencePort,
} from "./persistence-ports.js";

/** Dependencies injected into the canonical mastery evidence service. */
export interface CommitMasteryEvidenceDependencies {
  /** Provider-neutral high-level persistence adapter. */
  persistence: MasteryPersistencePort;
  /** Optional clock retained for transport composition compatibility. */
  clock?: () => string;
  /** Optional ID factory retained for transport composition compatibility. */
  idFactory?: (kind: "commit" | "evidence" | "review") => string;
}

/** Dependencies injected into the calibration approval service. */
export interface ApproveMasteryCalibrationDependencies {
  /** Provider-neutral high-level persistence adapter. */
  persistence: MasteryPersistencePort;
  /** Optional clock retained for transport composition compatibility. */
  clock?: () => string;
  /** Optional ID factory retained for transport composition compatibility. */
  idFactory?: (kind: "calibration") => string;
}

function validationError(paths: string[]): MasteryPersistenceError {
  return new MasteryPersistenceError(
    "VALIDATION_ERROR",
    `Mastery persistence input failed validation: ${paths.join(", ")}`,
  );
}

/**
 * Validates and persists one canonical mastery evidence command.
 * @param input Untrusted evidence command from a transport boundary.
 * @param dependencies Provider-neutral high-level persistence adapter.
 * @returns A stable applied or replayed persistence receipt.
 * @throws When validation or persistence fails.
 */
export async function commitMasteryEvidence(
  input: unknown,
  dependencies: CommitMasteryEvidenceDependencies,
): Promise<CommitMasteryEvidenceResult> {
  const parsed = commitMasteryEvidenceInputSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(
      parsed.error.issues.map((issue) => issue.path.join(".") || "root"),
    );
  }
  return dependencies.persistence.commitMasteryEvidence(parsed.data);
}

/**
 * Validates and persists a fully evidenced calibration approval.
 * @param input Untrusted calibration release command from a transport boundary.
 * @param dependencies Provider-neutral high-level persistence adapter.
 * @returns The stable approved calibration receipt.
 * @throws When validation, release invariants, or persistence fails.
 */
export async function approveMasteryCalibration(
  input: unknown,
  dependencies: ApproveMasteryCalibrationDependencies,
): Promise<ApproveMasteryCalibrationResult> {
  const parsed = masteryCalibrationApprovalInputSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(
      parsed.error.issues.map((issue) => issue.path.join(".") || "root"),
    );
  }
  return dependencies.persistence.approveMasteryCalibration(parsed.data);
}
