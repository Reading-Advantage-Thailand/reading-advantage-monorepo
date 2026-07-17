import { createHash, randomUUID } from "node:crypto";
import {
  isAbsolute,
  relative,
  resolve,
  sep,
  posix as posixPath,
} from "node:path";
import { z } from "zod";

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
  /** Filesystem device identity captured without following the final link. */
  device: string;
  /** Filesystem inode identity captured without following the final link. */
  inode: string;
  /** Whether the inspected path is a regular file. */
  isFile: boolean;
  /** Whether the inspected path itself is a symbolic link. */
  isSymbolicLink: boolean;
}

/** Injected filesystem boundary used by preview, commit, rollback, and tests. */
export interface RepositoryFileTransactionOperations {
  /** Acquires the repository-wide lock with its complete durable recovery record. */
  acquireExclusiveLock(path: string, recoveryRecord: string): Promise<void>;
  /** Asserts that a path's parent still names its bound directory handle. */
  assertTransactionPath(path: string): Promise<void>;
  /** Opens stable no-follow parent-directory handles for every transaction path. */
  bindTransactionPaths(paths: readonly string[]): Promise<void>;
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
  /** Releases the repository-wide architecture-writer lock. */
  releaseExclusiveLock(path: string): Promise<void>;
  /** Closes every stable transaction directory handle. */
  releaseTransactionPaths(): Promise<void>;
  /** Removes one transaction artifact. */
  unlink(path: string): Promise<void>;
  /** Creates a private staged file without replacing an existing path. */
  writeFileExclusive(path: string, contents: string): Promise<void>;
}

/** One immutable replacement recorded by a read-only transaction preview. */
export interface RepositoryFileTransactionPlanReplacement extends RepositoryFileReplacementProposal {
  /** Absolute destination validated as contained by the repository. */
  destination: string;
  /** Canonical destination resolved during preview. */
  canonicalDestination: string;
  /** Previewed filesystem device identity of the destination. */
  device: string;
  /** Previewed filesystem inode identity of the destination. */
  inode: string;
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
  /** Two through four ordered repository file replacements. */
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

/** Inputs required to recover one acknowledged transaction after interruption. */
export interface RecoverRepositoryFileTransactionOptions {
  /** Repository root recorded by the interrupted transaction. */
  repoRoot: string;
  /** Exact transaction identifier read from the retained lock. */
  transactionId: string;
  /** Explicit recovery consent required before any rollback or cleanup. */
  acknowledge: boolean;
  /** Fresh filesystem adapter used by the recovery process. */
  fileOperations: RepositoryFileTransactionOperations;
  /** Optional semantic validator used when recovery finds an all-new state. */
  validate?: ApplyRepositoryFileTransactionOptions["validate"];
}

/** Deterministic state recovered from a durable prepared transaction. */
export interface RepositoryFileTransactionRecoveryOutcome {
  /** Stable outcome discriminator for a finalized or rolled-back transaction. */
  state: "finalized-committed" | "recovered-originals";
  /** Exact acknowledged plan hash recovered from the journal. */
  planHash: string;
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

/** Repository-relative lock used by every supported architecture policy writer. */
export const ARCHITECTURE_WRITE_LOCK_PATH =
  ".architecture-enforcement-write.lock";

/** Prefix of durable prepared-transaction journals retained after a crash. */
export const ARCHITECTURE_WRITE_JOURNAL_PREFIX =
  ".architecture-enforcement-write-";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const journalReplacementSchema = z
  .object({
    id: z.string().min(1),
    repositoryPath: z.string().min(1),
    contents: z.string(),
    destination: z.string().min(1),
    canonicalDestination: z.string().min(1),
    device: z.string().min(1),
    inode: z.string().min(1),
    beforeHash: sha256Schema,
    afterHash: sha256Schema,
  })
  .strict();
const transactionJournalSchema = z
  .object({
    schemaVersion: z.literal(1),
    transactionId: z.string().min(1),
    plan: z
      .object({
        schemaVersion: z.literal(1),
        repoRoot: z.string().min(1),
        replacements: z.array(journalReplacementSchema).min(2).max(4),
        planHash: sha256Schema,
      })
      .strict(),
  })
  .strict();

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
  if (replacements.length < 2 || replacements.length > 4) {
    throw new Error(
      "Repository file transactions require two through four replacements",
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

interface ValidatedDestination {
  destination: string;
  canonicalDestination: string;
  device: string;
  inode: string;
}

/** Validates regular-file containment and returns exact bound destinations. */
async function validatedDestinations(
  repoRoot: string,
  replacements: readonly RepositoryFileReplacementProposal[],
  fileOperations: RepositoryFileTransactionOperations,
): Promise<ValidatedDestination[]> {
  if (!isAbsolute(repoRoot)) {
    throw new Error("Repository file transaction root must be absolute");
  }
  validateProposals(replacements);
  const canonicalRoot = await fileOperations.realpath(repoRoot);
  const destinations: ValidatedDestination[] = [];
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
    destinations.push({
      destination,
      canonicalDestination,
      device: inspection.device,
      inode: inspection.inode,
    });
  }
  if (
    new Set(destinations.map((entry) => entry.canonicalDestination)).size !==
    destinations.length
  ) {
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
      const binding = destinations[index]!;
      const before = await options.fileOperations.readFile(binding.destination);
      return {
        ...replacement,
        ...binding,
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

/** Revalidates every destination's reviewed containment and file identity. */
async function assertPlanDestinationBindings(
  plan: RepositoryFileTransactionPlan,
  fileOperations: RepositoryFileTransactionOperations,
): Promise<void> {
  const destinations = await validatedDestinations(
    plan.repoRoot,
    plan.replacements,
    fileOperations,
  );
  for (const [index, replacement] of plan.replacements.entries()) {
    const binding = destinations[index]!;
    if (
      binding.destination !== replacement.destination ||
      binding.canonicalDestination !== replacement.canonicalDestination ||
      binding.device !== replacement.device ||
      binding.inode !== replacement.inode ||
      sha256(replacement.contents) !== replacement.afterHash
    ) {
      throw new Error(
        `Transaction destination changed after preview: ${replacement.repositoryPath}`,
      );
    }
  }
}

/** Revalidates every destination's reviewed identity and original bytes. */
async function assertPlanDestinationsAreCurrent(
  plan: RepositoryFileTransactionPlan,
  fileOperations: RepositoryFileTransactionOperations,
): Promise<void> {
  await assertPlanDestinationBindings(plan, fileOperations);
  for (const replacement of plan.replacements) {
    await validateDestinationBeforeRename(replacement, fileOperations);
  }
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

/** Revalidates each destination immediately before its committed replacement. */
async function validateDestinationBeforeRename(
  replacement: RepositoryFileTransactionPlanReplacement,
  fileOperations: RepositoryFileTransactionOperations,
): Promise<void> {
  await fileOperations.assertTransactionPath(replacement.destination);
  const inspection = await fileOperations.inspect(replacement.destination);
  const canonicalDestination = await fileOperations.realpath(
    replacement.destination,
  );
  if (
    !inspection.isFile ||
    inspection.isSymbolicLink ||
    inspection.device !== replacement.device ||
    inspection.inode !== replacement.inode ||
    canonicalDestination !== replacement.canonicalDestination
  ) {
    throw new Error(
      `Transaction destination identity changed after preview: ${replacement.repositoryPath}`,
    );
  }
  const contents = await fileOperations.readFile(replacement.destination);
  if (sha256(contents) !== replacement.beforeHash) {
    throw new Error(
      `Transaction destination raced after recovery capture: ${replacement.repositoryPath}`,
    );
  }
}

/** Releases the supported-writer lock and reports, rather than masks, failure. */
async function releaseTransactionLock(
  lockPath: string,
  fileOperations: RepositoryFileTransactionOperations,
): Promise<RepositoryTransactionArtifactError[]> {
  try {
    await fileOperations.releaseExclusiveLock(lockPath);
    return [];
  } catch (error) {
    return [{ path: lockPath, error }];
  }
}

/** Releases stable directory handles and reports, rather than masks, failure. */
async function releaseTransactionPaths(
  repoRoot: string,
  fileOperations: RepositoryFileTransactionOperations,
): Promise<RepositoryTransactionArtifactError[]> {
  try {
    await fileOperations.releaseTransactionPaths();
    return [];
  } catch (error) {
    return [{ path: repoRoot, error }];
  }
}

/** Returns the fixed durable journal path for one validated transaction id. */
function transactionJournalPath(
  repoRoot: string,
  transactionId: string,
): string {
  return resolve(
    repoRoot,
    `${ARCHITECTURE_WRITE_JOURNAL_PREFIX}${transactionId}.journal.json`,
  );
}

/** Serializes a strict prepared journal containing the complete reviewed plan. */
function serializeTransactionJournal(
  transactionId: string,
  plan: RepositoryFileTransactionPlan,
): string {
  return `${JSON.stringify(
    transactionJournalSchema.parse({
      schemaVersion: 1,
      transactionId,
      plan,
    }),
    null,
    2,
  )}\n`;
}

/** Removes one optional transaction artifact while retaining real failures. */
async function cleanupOptionalArtifact(
  path: string,
  fileOperations: RepositoryFileTransactionOperations,
): Promise<RepositoryTransactionArtifactError[]> {
  try {
    await fileOperations.unlink(path);
    return [];
  } catch (error) {
    return isMissingPath(error) ? [] : [{ path, error }];
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

  const transactionId = validatedTransactionId(options.transactionId);
  const lockPath = resolve(options.plan.repoRoot, ARCHITECTURE_WRITE_LOCK_PATH);
  const journalPath = transactionJournalPath(
    options.plan.repoRoot,
    transactionId,
  );
  const replacements: TransactionReplacement[] = options.plan.replacements.map(
    (replacement) => ({
      ...replacement,
      staged: `${replacement.destination}.architecture-transaction-${transactionId}.tmp`,
      backup: `${replacement.destination}.architecture-transaction-${transactionId}.bak`,
    }),
  );
  const journalSource = serializeTransactionJournal(
    transactionId,
    options.plan,
  );
  try {
    await options.fileOperations.bindTransactionPaths([
      ...replacements.map((replacement) => replacement.destination),
      lockPath,
      journalPath,
    ]);
    await assertPlanDestinationsAreCurrent(
      options.plan,
      options.fileOperations,
    );
    await options.fileOperations.acquireExclusiveLock(lockPath, journalSource);
  } catch (error) {
    const pathReleaseErrors = await releaseTransactionPaths(
      options.plan.repoRoot,
      options.fileOperations,
    );
    if (pathReleaseErrors.length > 0) {
      throw new AggregateError(
        [error, ...pathReleaseErrors.map((failure) => failure.error)],
        "Repository transaction preparation and handle cleanup failed",
      );
    }
    throw error;
  }
  let commitStarted = false;
  try {
    await assertPlanDestinationsAreCurrent(
      options.plan,
      options.fileOperations,
    );
    await options.fileOperations.writeFileExclusive(journalPath, journalSource);
    for (const replacement of replacements) {
      await validateDestinationBeforeRename(
        replacement,
        options.fileOperations,
      );
      await options.fileOperations.writeFileExclusive(
        replacement.staged,
        replacement.contents,
      );
    }
    for (const replacement of replacements) {
      await validateDestinationBeforeRename(
        replacement,
        options.fileOperations,
      );
      await options.fileOperations.copyFileExclusive(
        replacement.destination,
        replacement.backup,
      );
    }
    await validateRecoveryBackups(replacements, options.fileOperations);
    for (const replacement of replacements) {
      await validateDestinationBeforeRename(
        replacement,
        options.fileOperations,
      );
    }
    for (const replacement of replacements) {
      await validateDestinationBeforeRename(
        replacement,
        options.fileOperations,
      );
      commitStarted = true;
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
    const recovered =
      !commitStarted ||
      (rollbackErrors.length === 0 && verificationErrors.length === 0);
    const cleanupErrors = [
      ...(await cleanupArtifacts(
        replacements,
        options.fileOperations,
        recovered,
      )),
      ...(recovered
        ? await cleanupOptionalArtifact(journalPath, options.fileOperations)
        : []),
      ...(recovered
        ? await releaseTransactionLock(lockPath, options.fileOperations)
        : []),
      ...(await releaseTransactionPaths(
        options.plan.repoRoot,
        options.fileOperations,
      )),
    ];
    throw new RepositoryFileTransactionFailure(
      primaryError,
      rollbackErrors,
      verificationErrors,
      cleanupErrors,
    );
  }

  const cleanupErrors = [
    ...(await cleanupArtifacts(replacements, options.fileOperations, true)),
    ...(await cleanupOptionalArtifact(journalPath, options.fileOperations)),
    ...(await releaseTransactionLock(lockPath, options.fileOperations)),
    ...(await releaseTransactionPaths(
      options.plan.repoRoot,
      options.fileOperations,
    )),
  ];
  if (cleanupErrors.length > 0) {
    return {
      state: "committed-cleanup-incomplete",
      planHash: options.plan.planHash,
      cleanupErrors,
    };
  }
  return { state: "committed", planHash: options.plan.planHash };
}

/**
 * Recovers one prepared transaction retained after process or host interruption.
 * @param options Exact repository, retained transaction id, consent, and fresh adapter.
 * @returns Whether recovery finalized the reviewed commit or restored all originals.
 * @throws When the lock, journal, path binding, hashes, or cleanup cannot be proven.
 */
export async function recoverRepositoryFileTransaction(
  options: RecoverRepositoryFileTransactionOptions,
): Promise<RepositoryFileTransactionRecoveryOutcome> {
  if (!options.acknowledge) {
    throw new Error("Repository transaction recovery requires acknowledgement");
  }
  const transactionId = validatedTransactionId(options.transactionId);
  const lockPath = resolve(options.repoRoot, ARCHITECTURE_WRITE_LOCK_PATH);
  const journalPath = transactionJournalPath(options.repoRoot, transactionId);
  const lockSource = await options.fileOperations.readFile(lockPath);
  const lockRecord = transactionJournalSchema.parse(JSON.parse(lockSource));
  const plan = lockRecord.plan as RepositoryFileTransactionPlan;
  if (
    lockRecord.transactionId !== transactionId ||
    plan.repoRoot !== options.repoRoot ||
    computePlanHash(plan.replacements) !== plan.planHash
  ) {
    throw new Error("Retained transaction lock does not match recovery id");
  }
  const replacements: TransactionReplacement[] = plan.replacements.map(
    (replacement) => ({
      ...replacement,
      staged: `${replacement.destination}.architecture-transaction-${transactionId}.tmp`,
      backup: `${replacement.destination}.architecture-transaction-${transactionId}.bak`,
    }),
  );
  await options.fileOperations.bindTransactionPaths([
    ...replacements.map((replacement) => replacement.destination),
    lockPath,
    journalPath,
  ]);
  try {
    if ((await options.fileOperations.readFile(lockPath)) !== lockSource) {
      throw new Error("Retained transaction lock changed during recovery");
    }
    try {
      const journalSource = await options.fileOperations.readFile(journalPath);
      transactionJournalSchema.parse(JSON.parse(journalSource));
      if (journalSource !== lockSource) {
        throw new Error(
          "Retained transaction journal does not match durable lock record",
        );
      }
    } catch (error) {
      if (!isMissingPath(error)) throw error;
    }
    const recoveryBindings = await validatedDestinations(
      options.repoRoot,
      plan.replacements,
      options.fileOperations,
    );
    for (const [index, replacement] of replacements.entries()) {
      const binding = recoveryBindings[index]!;
      if (
        binding.destination !== replacement.destination ||
        binding.canonicalDestination !== replacement.canonicalDestination ||
        binding.device !== replacement.device ||
        sha256(replacement.contents) !== replacement.afterHash
      ) {
        throw new Error(
          `Transaction destination changed after preview: ${replacement.repositoryPath}`,
        );
      }
    }
    const hashes = await Promise.all(
      replacements.map(async (replacement) =>
        sha256(await options.fileOperations.readFile(replacement.destination)),
      ),
    );
    const allAfter = hashes.every(
      (hash, index) => hash === replacements[index]!.afterHash,
    );
    const allBefore = hashes.every(
      (hash, index) => hash === replacements[index]!.beforeHash,
    );
    for (const [index, hash] of hashes.entries()) {
      if (
        hash === replacements[index]!.beforeHash &&
        recoveryBindings[index]!.inode !== replacements[index]!.inode
      ) {
        throw new Error(
          `Transaction original identity changed after preview: ${replacements[index]!.repositoryPath}`,
        );
      }
    }
    let state: RepositoryFileTransactionRecoveryOutcome["state"];
    if (allAfter) {
      await validateCommittedFiles(
        replacements,
        options.fileOperations,
        options.validate,
      );
      state = "finalized-committed";
    } else {
      const knownState = hashes.every(
        (hash, index) =>
          hash === replacements[index]!.beforeHash ||
          hash === replacements[index]!.afterHash,
      );
      if (!knownState) {
        throw new Error(
          "Interrupted transaction contains bytes outside the reviewed plan",
        );
      }
      if (!allBefore) {
        await validateRecoveryBackups(replacements, options.fileOperations);
        const rollbackErrors = await restoreOriginals(
          replacements,
          options.fileOperations,
        );
        if (rollbackErrors.length > 0) {
          throw new AggregateError(
            rollbackErrors,
            "Interrupted transaction rollback was incomplete",
          );
        }
      }
      const verificationErrors = await verifyOriginals(
        replacements,
        options.fileOperations,
      );
      if (verificationErrors.length > 0) {
        throw new AggregateError(
          verificationErrors,
          "Interrupted transaction originals could not be verified",
        );
      }
      state = "recovered-originals";
    }
    const cleanupErrors = [
      ...(await cleanupArtifacts(replacements, options.fileOperations, true)),
      ...(await cleanupOptionalArtifact(journalPath, options.fileOperations)),
    ];
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        cleanupErrors.map((failure) => failure.error),
        "Recovered transaction cleanup is incomplete; lock retained",
      );
    }
    await options.fileOperations.releaseExclusiveLock(lockPath);
    const pathReleaseErrors = await releaseTransactionPaths(
      options.repoRoot,
      options.fileOperations,
    );
    if (pathReleaseErrors.length > 0) {
      throw new AggregateError(
        pathReleaseErrors.map((failure) => failure.error),
        "Recovered transaction handle cleanup is incomplete after lock release",
      );
    }
    return { state, planHash: plan.planHash };
  } catch (error) {
    await options.fileOperations.releaseTransactionPaths().catch(() => {});
    throw error;
  }
}
