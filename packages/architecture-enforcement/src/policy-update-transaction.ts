import { createHash, randomUUID } from "node:crypto";
import {
  isAbsolute,
  relative,
  resolve,
  sep,
  posix as posixPath,
} from "node:path";

/** One proposed repository file replacement in transaction order. */
export interface RepositoryFileReplacementProposal {
  /** Stable reviewer-facing document identifier. */
  id: string;
  /** Exact normalized repository-relative destination path. */
  repositoryPath: string;
  /** Complete replacement bytes interpreted as UTF-8 text. */
  contents: string;
}

/** Minimal regular-file and symbolic-link facts required by the transaction. */
export interface RepositoryFileInspection {
  /** Whether the inspected path is a regular file. */
  isFile: boolean;
  /** Whether the inspected path itself is a symbolic link. */
  isSymbolicLink: boolean;
}

/** Injected filesystem boundary used by preview, commit, rollback, and tests. */
export interface RepositoryFileTransactionOperations {
  /** Copies an existing file to a destination that must not already exist. */
  copyFileExclusive(source: string, destination: string): Promise<void>;
  /** Returns regular-file and symbolic-link facts without following the final link. */
  inspect(path: string): Promise<RepositoryFileInspection>;
  /** Reads one complete UTF-8 text file. */
  readFile(path: string): Promise<string>;
  /** Resolves one existing path through symbolic links. */
  realpath(path: string): Promise<string>;
  /** Atomically renames one path over another path on the same filesystem. */
  rename(source: string, destination: string): Promise<void>;
  /** Removes one transaction artifact. */
  unlink(path: string): Promise<void>;
  /** Creates a private staged file without replacing an existing path. */
  writeFileExclusive(path: string, contents: string): Promise<void>;
}

/** One immutable replacement recorded by a read-only transaction preview. */
export interface RepositoryFileTransactionPlanReplacement extends RepositoryFileReplacementProposal {
  /** Absolute destination validated as contained by the repository. */
  destination: string;
  /** SHA-256 of the destination bytes observed during preview. */
  beforeHash: string;
  /** SHA-256 of the proposed replacement bytes. */
  afterHash: string;
}

/** Deterministic read-only preview consumed by the acknowledged transaction. */
export interface RepositoryFileTransactionPlan {
  /** Version of the plan contract. */
  schemaVersion: 1;
  /** Absolute repository root used to validate and apply the plan. */
  repoRoot: string;
  /** Ordered regular-file replacements, including their exact proposed bytes. */
  replacements: readonly RepositoryFileTransactionPlanReplacement[];
  /** SHA-256 binding ordered paths, identifiers, and before/after bytes. */
  planHash: string;
}

/** Inputs used to construct a mutation-free transaction preview. */
export interface PreviewRepositoryFileTransactionOptions {
  /** Absolute repository root containing every destination. */
  repoRoot: string;
  /** Three or four ordered repository file replacements. */
  replacements: readonly RepositoryFileReplacementProposal[];
  /** Injected read-only filesystem boundary. */
  fileOperations: RepositoryFileTransactionOperations;
}

/** One cleanup failure paired with the artifact whose removal failed. */
export interface RepositoryTransactionArtifactError {
  /** Transaction artifact that could not be removed. */
  path: string;
  /** Original filesystem failure. */
  error: unknown;
}

/** Explicit non-writing outcome returned when acknowledgement is absent. */
export interface RepositoryFileTransactionNotAcknowledged {
  /** Stable outcome discriminator. */
  state: "not-acknowledged";
  /** Deterministic plan hash that may be reviewed and acknowledged later. */
  planHash: string;
}

/** Successful commit with complete artifact cleanup. */
export interface RepositoryFileTransactionCommitted {
  /** Stable outcome discriminator. */
  state: "committed";
  /** Exact plan hash whose bytes were committed and validated. */
  planHash: string;
}

/** Successful commit whose recovery-artifact cleanup needs operator attention. */
export interface RepositoryFileTransactionCommittedCleanupIncomplete {
  /** Stable outcome discriminator that must never be treated as safe to retry. */
  state: "committed-cleanup-incomplete";
  /** Exact plan hash whose bytes were committed and validated. */
  planHash: string;
  /** Every cleanup failure without loss of earlier failures. */
  cleanupErrors: readonly RepositoryTransactionArtifactError[];
}

/** Result of applying or declining one repository file transaction. */
export type RepositoryFileTransactionOutcome =
  | RepositoryFileTransactionNotAcknowledged
  | RepositoryFileTransactionCommitted
  | RepositoryFileTransactionCommittedCleanupIncomplete;

/** Inputs accepted by the explicitly acknowledged transaction application. */
export interface ApplyRepositoryFileTransactionOptions {
  /** Exact plan produced by the read-only preview. */
  plan: RepositoryFileTransactionPlan;
  /** Explicit consent required before the first staged file is created. */
  acknowledge: boolean;
  /** Reviewed plan hash that must equal both the plan and its recomputed digest. */
  expectedPlanHash: string;
  /** Injected filesystem boundary used for all reads and mutations. */
  fileOperations: RepositoryFileTransactionOperations;
  /** Optional deterministic artifact identifier used by isolated tests. */
  transactionId?: string;
  /** Optional post-write parser or semantic validator called after hash verification. */
  validate?: (
    replacement: RepositoryFileTransactionPlanReplacement,
    contents: string,
  ) => void | Promise<void>;
}

/** Aggregated primary, rollback, verification, and cleanup transaction failure. */
export class RepositoryFileTransactionFailure extends AggregateError {
  /** Original staging, backup, commit, or post-write validation failure. */
  readonly primaryError: unknown;
  /** Failures emitted while restoring backups in reverse order. */
  readonly rollbackErrors: readonly unknown[];
  /** Failures proving that every destination regained its original bytes. */
  readonly verificationErrors: readonly unknown[];
  /** Cleanup failures retained without replacing the primary failure. */
  readonly cleanupErrors: readonly RepositoryTransactionArtifactError[];

  /**
   * Creates a lossless transaction failure.
   * @param primaryError Original operation failure.
   * @param rollbackErrors Backup restoration failures.
   * @param verificationErrors Original-byte verification failures.
   * @param cleanupErrors Transaction artifact cleanup failures.
   */
  constructor(
    primaryError: unknown,
    rollbackErrors: readonly unknown[],
    verificationErrors: readonly unknown[],
    cleanupErrors: readonly RepositoryTransactionArtifactError[],
  ) {
    super(
      [
        primaryError,
        ...rollbackErrors,
        ...verificationErrors,
        ...cleanupErrors.map((failure) => failure.error),
      ],
      "Repository file transaction failed; original-byte recovery was attempted",
    );
    this.name = "RepositoryFileTransactionFailure";
    this.primaryError = primaryError;
    this.rollbackErrors = rollbackErrors;
    this.verificationErrors = verificationErrors;
    this.cleanupErrors = cleanupErrors;
  }
}

interface TransactionReplacement extends RepositoryFileTransactionPlanReplacement {
  staged: string;
  backup: string;
}

/** Computes a lowercase hexadecimal SHA-256 digest for exact text bytes. */
function sha256(contents: string): string {
  return createHash("sha256").update(contents, "utf8").digest("hex");
}

/** Tests whether an absolute candidate is the root or one of its descendants. */
function isContained(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${sep}`) &&
      relativePath !== ".." &&
      !isAbsolute(relativePath))
  );
}

/** Validates one normalized repository-relative file path. */
function validateRepositoryPath(repositoryPath: string): void {
  if (
    repositoryPath.length === 0 ||
    repositoryPath.startsWith("/") ||
    repositoryPath.endsWith("/") ||
    repositoryPath.includes("\\") ||
    repositoryPath.includes("//") ||
    posixPath.normalize(repositoryPath) !== repositoryPath ||
    repositoryPath
      .split("/")
      .some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(
      `Transaction destination must be an exact normalized repository-relative file path: ${repositoryPath}`,
    );
  }
}

/** Validates transaction cardinality, stable identities, and distinct paths. */
function validateProposals(
  replacements: readonly RepositoryFileReplacementProposal[],
): void {
  if (replacements.length < 3 || replacements.length > 4) {
    throw new Error(
      "Repository file transactions require exactly three or four replacements",
    );
  }
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const replacement of replacements) {
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(replacement.id)) {
      throw new Error(
        `Invalid transaction document identifier: ${replacement.id}`,
      );
    }
    validateRepositoryPath(replacement.repositoryPath);
    if (ids.has(replacement.id) || paths.has(replacement.repositoryPath)) {
      throw new Error(
        "Transaction identifiers and destination paths must be distinct",
      );
    }
    ids.add(replacement.id);
    paths.add(replacement.repositoryPath);
  }
}

/** Validates regular-file containment and returns exact absolute destinations. */
async function validatedDestinations(
  repoRoot: string,
  replacements: readonly RepositoryFileReplacementProposal[],
  fileOperations: RepositoryFileTransactionOperations,
): Promise<string[]> {
  if (!isAbsolute(repoRoot)) {
    throw new Error("Repository file transaction root must be absolute");
  }
  validateProposals(replacements);
  const canonicalRoot = await fileOperations.realpath(repoRoot);
  const destinations: string[] = [];
  for (const replacement of replacements) {
    const destination = resolve(repoRoot, replacement.repositoryPath);
    if (!isContained(repoRoot, destination)) {
      throw new Error(
        `Transaction destination escapes repository root: ${replacement.repositoryPath}`,
      );
    }
    const inspection = await fileOperations.inspect(destination);
    if (inspection.isSymbolicLink) {
      throw new Error(
        `Transaction destination must not be a symbolic link: ${replacement.repositoryPath}`,
      );
    }
    if (!inspection.isFile) {
      throw new Error(
        `Transaction destination must be a regular file: ${replacement.repositoryPath}`,
      );
    }
    const canonicalDestination = await fileOperations.realpath(destination);
    if (!isContained(canonicalRoot, canonicalDestination)) {
      throw new Error(
        `Transaction destination resolves outside repository root: ${replacement.repositoryPath}`,
      );
    }
    destinations.push(destination);
  }
  if (new Set(destinations).size !== destinations.length) {
    throw new Error("Transaction destinations must resolve to distinct files");
  }
  return destinations;
}

/** Computes the machine-independent digest represented by one complete plan. */
function computePlanHash(
  replacements: readonly RepositoryFileTransactionPlanReplacement[],
): string {
  return sha256(
    JSON.stringify({
      schemaVersion: 1,
      replacements: replacements.map((replacement) => ({
        id: replacement.id,
        repositoryPath: replacement.repositoryPath,
        beforeHash: replacement.beforeHash,
        afterHash: replacement.afterHash,
      })),
    }),
  );
}

/**
 * Creates a deterministic transaction plan without performing any mutation.
 * @param options Repository root, ordered proposals, and injected filesystem reads.
 * @returns Exact before/after hashes and the acknowledgement-bound plan hash.
 */
export async function previewRepositoryFileTransaction(
  options: PreviewRepositoryFileTransactionOptions,
): Promise<RepositoryFileTransactionPlan> {
  const destinations = await validatedDestinations(
    options.repoRoot,
    options.replacements,
    options.fileOperations,
  );
  const replacements = await Promise.all(
    options.replacements.map(async (replacement, index) => {
      const destination = destinations[index]!;
      const before = await options.fileOperations.readFile(destination);
      return {
        ...replacement,
        destination,
        beforeHash: sha256(before),
        afterHash: sha256(replacement.contents),
      };
    }),
  );
  return {
    schemaVersion: 1,
    repoRoot: options.repoRoot,
    replacements,
    planHash: computePlanHash(replacements),
  };
}

/** Converts a filesystem error into a stable missing-path decision. */
function isMissingPath(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

/** Attempts every selected artifact cleanup and retains all real failures. */
async function cleanupArtifacts(
  replacements: readonly TransactionReplacement[],
  fileOperations: RepositoryFileTransactionOperations,
  removeBackups: boolean,
): Promise<RepositoryTransactionArtifactError[]> {
  const failures: RepositoryTransactionArtifactError[] = [];
  for (const replacement of replacements) {
    const paths = removeBackups
      ? [replacement.staged, replacement.backup]
      : [replacement.staged];
    for (const path of paths) {
      try {
        await fileOperations.unlink(path);
      } catch (error) {
        if (!isMissingPath(error)) failures.push({ path, error });
      }
    }
  }
  return failures;
}

/** Restores every original backup in reverse transaction order. */
async function restoreOriginals(
  replacements: readonly TransactionReplacement[],
  fileOperations: RepositoryFileTransactionOperations,
): Promise<unknown[]> {
  const failures: unknown[] = [];
  for (const replacement of [...replacements].reverse()) {
    try {
      await fileOperations.rename(replacement.backup, replacement.destination);
    } catch (error) {
      failures.push(error);
    }
  }
  return failures;
}

/** Verifies every destination against the previewed original bytes. */
async function verifyOriginals(
  replacements: readonly TransactionReplacement[],
  fileOperations: RepositoryFileTransactionOperations,
): Promise<unknown[]> {
  const failures: unknown[] = [];
  for (const replacement of replacements) {
    try {
      const contents = await fileOperations.readFile(replacement.destination);
      if (sha256(contents) !== replacement.beforeHash) {
        throw new Error(
          `Rollback did not restore original bytes: ${replacement.repositoryPath}`,
        );
      }
    } catch (error) {
      failures.push(error);
    }
  }
  return failures;
}

/** Validates after-hashes and invokes the optional parser callback. */
async function validateCommittedFiles(
  replacements: readonly TransactionReplacement[],
  fileOperations: RepositoryFileTransactionOperations,
  validate: ApplyRepositoryFileTransactionOptions["validate"],
): Promise<void> {
  for (const replacement of replacements) {
    const contents = await fileOperations.readFile(replacement.destination);
    if (sha256(contents) !== replacement.afterHash) {
      throw new Error(
        `Committed file hash does not match preview: ${replacement.repositoryPath}`,
      );
    }
    await validate?.(replacement, contents);
  }
}

/** Verifies every recovery copy contains the exact previewed original bytes. */
async function validateRecoveryBackups(
  replacements: readonly TransactionReplacement[],
  fileOperations: RepositoryFileTransactionOperations,
): Promise<void> {
  for (const replacement of replacements) {
    const contents = await fileOperations.readFile(replacement.backup);
    if (sha256(contents) !== replacement.beforeHash) {
      throw new Error(
        `Transaction destination raced after preview: ${replacement.repositoryPath}`,
      );
    }
  }
}

/** Validates an injected transaction identifier used only in artifact names. */
function validatedTransactionId(transactionId: string | undefined): string {
  const value = transactionId ?? randomUUID();
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(value)) {
    throw new Error("Transaction identifier contains unsafe path characters");
  }
  return value;
}

/**
 * Applies one exact previewed plan with rollback and post-write validation.
 * @param options Reviewed plan, acknowledgement, expected hash, and injected operations.
 * @returns Explicit unacknowledged, committed, or committed-cleanup-incomplete outcome.
 * @throws RepositoryFileTransactionFailure when a mutation or recovery operation fails.
 */
export async function applyRepositoryFileTransaction(
  options: ApplyRepositoryFileTransactionOptions,
): Promise<RepositoryFileTransactionOutcome> {
  if (!options.acknowledge) {
    return { state: "not-acknowledged", planHash: options.plan.planHash };
  }
  if (
    options.plan.schemaVersion !== 1 ||
    options.expectedPlanHash !== options.plan.planHash ||
    computePlanHash(options.plan.replacements) !== options.plan.planHash
  ) {
    throw new Error(
      "Acknowledged transaction plan hash does not match the preview",
    );
  }

  const destinations = await validatedDestinations(
    options.plan.repoRoot,
    options.plan.replacements,
    options.fileOperations,
  );
  for (const [index, replacement] of options.plan.replacements.entries()) {
    if (destinations[index] !== replacement.destination) {
      throw new Error(
        `Transaction destination changed after preview: ${replacement.repositoryPath}`,
      );
    }
    const current = await options.fileOperations.readFile(
      replacement.destination,
    );
    if (sha256(current) !== replacement.beforeHash) {
      throw new Error(
        `Transaction destination changed after preview: ${replacement.repositoryPath}`,
      );
    }
    if (sha256(replacement.contents) !== replacement.afterHash) {
      throw new Error(
        `Transaction replacement bytes changed after preview: ${replacement.repositoryPath}`,
      );
    }
  }

  const transactionId = validatedTransactionId(options.transactionId);
  const replacements: TransactionReplacement[] = options.plan.replacements.map(
    (replacement) => ({
      ...replacement,
      staged: `${replacement.destination}.architecture-transaction-${transactionId}.tmp`,
      backup: `${replacement.destination}.architecture-transaction-${transactionId}.bak`,
    }),
  );
  let commitStarted = false;
  try {
    for (const replacement of replacements) {
      await options.fileOperations.writeFileExclusive(
        replacement.staged,
        replacement.contents,
      );
    }
    for (const replacement of replacements) {
      await options.fileOperations.copyFileExclusive(
        replacement.destination,
        replacement.backup,
      );
    }
    await validateRecoveryBackups(replacements, options.fileOperations);
    commitStarted = true;
    for (const replacement of replacements) {
      await options.fileOperations.rename(
        replacement.staged,
        replacement.destination,
      );
    }
    await validateCommittedFiles(
      replacements,
      options.fileOperations,
      options.validate,
    );
  } catch (primaryError) {
    const rollbackErrors = commitStarted
      ? await restoreOriginals(replacements, options.fileOperations)
      : [];
    const verificationErrors = await verifyOriginals(
      replacements,
      options.fileOperations,
    );
    const cleanupErrors = await cleanupArtifacts(
      replacements,
      options.fileOperations,
      !commitStarted || verificationErrors.length === 0,
    );
    throw new RepositoryFileTransactionFailure(
      primaryError,
      rollbackErrors,
      verificationErrors,
      cleanupErrors,
    );
  }

  const cleanupErrors = await cleanupArtifacts(
    replacements,
    options.fileOperations,
    true,
  );
  if (cleanupErrors.length > 0) {
    return {
      state: "committed-cleanup-incomplete",
      planHash: options.plan.planHash,
      cleanupErrors,
    };
  }
  return { state: "committed", planHash: options.plan.planHash };
}
