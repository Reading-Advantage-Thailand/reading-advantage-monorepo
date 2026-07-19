import { createHash } from "node:crypto";
import { z } from "zod";

/** Exact production database that owns existing Codecamp identities and product rows. */
export const CODECAMP_MIGRATION_SOURCE_DATABASE = "codecamp_advantage" as const;

/** Exact production database that owns company identities and SSO credentials. */
export const CODECAMP_MIGRATION_TARGET_DATABASE = "company_identity" as const;

/** Exact operator phrase required before a Codecamp identity migration may write. */
export const CODECAMP_MIGRATION_APPLY_CONFIRMATION =
  "APPLY_CODECAMP_SSO_MIGRATION" as const;

/** Roles that preserve current Codecamp authorization without granting company administration. */
export const codecampMigrationRoleSchema = z.enum([
  "ADMIN",
  "INTERN",
  "STUDENT",
  "TEACHER",
]);

/** Supported legacy credential algorithms accepted by Accounts. */
export const codecampMigrationPasswordAlgorithmSchema = z.enum([
  "ARGON2ID",
  "BCRYPT",
]);

/** One source identity read from the Codecamp product database. */
export const codecampSourceIdentitySchema = z.strictObject({
  id: z.string().min(1),
  username: z.string().min(1),
  displayUsername: z.string().min(1),
  displayName: z.string().nullable(),
  githubUsername: z.string().nullable(),
  role: codecampMigrationRoleSchema,
  createdAt: z.date(),
  passwordHash: z.string().min(1),
});

/** One source identity used internally by the migration planner. */
export type CodecampSourceIdentity = z.infer<
  typeof codecampSourceIdentitySchema
>;

/** Aggregate ownership evidence for one Codecamp product table. */
export const codecampOwnershipEvidenceSchema = z.strictObject({
  table: z.string().regex(/^codecamp_[a-z0-9_]+$/),
  rowCount: z.number().int().nonnegative(),
  ownerCount: z.number().int().nonnegative(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});

/** Aggregate ownership evidence that contains no account identifiers or content. */
export type CodecampOwnershipEvidence = z.infer<
  typeof codecampOwnershipEvidenceSchema
>;

/** Existing target identity fields needed to reject unsafe automatic merges. */
export const codecampTargetIdentitySchema = z.strictObject({
  id: z.string().uuid(),
  normalizedUsername: z.string().min(1),
  displayName: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

/** Existing target identity projection used only for collision checks. */
export type CodecampTargetIdentity = z.infer<
  typeof codecampTargetIdentitySchema
>;

/** Internal deterministic mapping for one migrated Codecamp identity. */
export interface PlannedCodecampIdentity {
  /** Original source principal retained by every Codecamp product foreign key. */
  readonly sourcePrincipalId: string;
  /** First-party username copied without changing login spelling. */
  readonly username: string;
  /** Original display-username spelling included in source-drift detection. */
  readonly sourceDisplayUsername: string;
  /** Canonical username used by Accounts uniqueness checks. */
  readonly normalizedUsername: string;
  /** Human-readable employee name with a non-empty deterministic fallback. */
  readonly displayName: string;
  /** Existing GitHub product identity retained in Codecamp and fingerprinted. */
  readonly githubUsername: string | null;
  /** Existing compatible password hash, never included in public output. */
  readonly passwordHash: string;
  /** Password algorithm recorded by the Accounts credential row. */
  readonly passwordAlgorithm: z.infer<
    typeof codecampMigrationPasswordAlgorithmSchema
  >;
  /** Exact Codecamp application role retained by this principal. */
  readonly role: z.infer<typeof codecampMigrationRoleSchema>;
  /** Original account creation time. */
  readonly createdAt: Date;
  /** Deterministic Accounts subject for safe resume. */
  readonly companyAccountId: string;
  /** Deterministic company membership for safe resume. */
  readonly companyMembershipId: string;
}

/** Secret-safe aggregate report emitted by dry-run and apply commands. */
export interface CodecampMigrationSummary {
  /** Operation that produced this report. */
  readonly mode: "dry-run" | "apply";
  /** Whether all source and target structures required by apply are present. */
  readonly schemaReadyForApply: boolean;
  /** Deterministic fingerprint that must be approved for apply. */
  readonly sourceFingerprint: string;
  /** Total source identities admitted by the exact migration contract. */
  readonly sourceAccountCount: number;
  /** Aggregate source roles without account identifiers. */
  readonly roleCounts: Readonly<Record<string, number>>;
  /** Aggregate credential algorithms without hashes. */
  readonly credentialAlgorithmCounts: Readonly<Record<string, number>>;
  /** Existing normalized usernames that block an automatic merge. */
  readonly targetCollisionCount: number;
  /** Source normalized-username collision groups that block apply. */
  readonly sourceCollisionGroupCount: number;
  /** Legacy sessions observed but intentionally not migrated. */
  readonly legacySessionCount: number;
  /** Unexpired legacy sessions observed but intentionally not migrated. */
  readonly unexpiredLegacySessionCount: number;
  /** Aggregate product ownership evidence before or after apply. */
  readonly ownership: readonly CodecampOwnershipEvidence[];
  /** Number of company accounts proven after apply. */
  readonly appliedAccountCount?: number;
  /** Number of durable Codecamp principal mappings proven after apply. */
  readonly appliedPrincipalMappingCount?: number;
}

/** Input used by the pure deterministic migration planner. */
export interface PlanCodecampMigrationInput {
  /** Source identities from the verified Codecamp database. */
  readonly sourceIdentities: readonly CodecampSourceIdentity[];
  /** Existing Accounts identities used only to reject collisions. */
  readonly targetIdentities: readonly CodecampTargetIdentity[];
  /** Stable internal-company organization identifier. */
  readonly organizationId: string;
}

/** Result of the pure planner; callers must never serialize the records. */
export interface CodecampMigrationPlan {
  /** Sensitive per-principal write plan retained only in process memory. */
  readonly records: readonly PlannedCodecampIdentity[];
  /** Number of normalized source collision groups. */
  readonly sourceCollisionGroupCount: number;
  /** Number of unsafe target identity collisions. */
  readonly targetCollisionCount: number;
}

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_NAMESPACE = "d88d4ec9-e94d-5ddb-8bc8-460b2b17f588";

/** Safe planning failure that contains a category but no source identity data. */
export class CodecampMigrationPlanningError extends Error {
  /** Stable non-PII failure category. */
  readonly code: string;

  /**
   * Creates a secret-safe planning failure.
   * @param code Stable machine-readable failure category.
   * @param message Non-sensitive operator-facing explanation.
   */
  constructor(code: string, message: string) {
    super(message);
    this.name = "CodecampMigrationPlanningError";
    this.code = code;
  }
}

/**
 * Normalizes a Codecamp username with the Accounts Version 1 algorithm.
 * @param username Source username to normalize and validate.
 * @returns The canonical Accounts username.
 * @throws When the source username cannot be represented safely in Accounts.
 */
export function normalizeCodecampMigrationUsername(username: string): string {
  const normalized = username.normalize("NFKC").trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new CodecampMigrationPlanningError(
      "SOURCE_USERNAME_INVALID",
      "One or more source usernames are incompatible with Accounts normalization.",
    );
  }
  return normalized;
}

/**
 * Classifies an existing Codecamp password hash without exposing it.
 * @param passwordHash Existing source credential hash.
 * @returns The compatible Accounts credential algorithm.
 * @throws When Accounts cannot verify the legacy hash format.
 */
export function classifyCodecampPasswordHash(
  passwordHash: string,
): "ARGON2ID" | "BCRYPT" {
  if (passwordHash.startsWith("$argon2id$")) return "ARGON2ID";
  if (/^\$2[aby]\$/.test(passwordHash)) return "BCRYPT";
  throw new CodecampMigrationPlanningError(
    "SOURCE_CREDENTIAL_INCOMPATIBLE",
    "One or more source credentials use an unsupported password algorithm.",
  );
}

function uuidBytes(uuid: string): Buffer {
  if (!UUID_PATTERN.test(uuid)) {
    throw new CodecampMigrationPlanningError(
      "MIGRATION_UUID_INVALID",
      "Migration identity configuration contains an invalid UUID.",
    );
  }
  return Buffer.from(uuid.replaceAll("-", ""), "hex");
}

function formatUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Derives a stable UUIDv5 for a migration-owned identity.
 * @param name Stable namespace-local identity name.
 * @returns A deterministic UUIDv5.
 */
export function deriveCodecampMigrationUuid(name: string): string {
  const digest = createHash("sha1")
    .update(uuidBytes(UUID_NAMESPACE))
    .update(Buffer.from(name, "utf8"))
    .digest()
    .subarray(0, 16);
  digest[6] = (digest[6]! & 0x0f) | 0x50;
  digest[8] = (digest[8]! & 0x3f) | 0x80;
  return formatUuid(digest);
}

/**
 * Builds the deterministic, fail-closed migration plan in process memory.
 * @param input Verified source identities, target identities, and organization.
 * @returns The deterministic sensitive write plan and aggregate collision counts.
 * @throws When source data is invalid or an automatic merge would be required.
 */
export function planCodecampIdentityMigration(
  input: PlanCodecampMigrationInput,
): CodecampMigrationPlan {
  if (!UUID_PATTERN.test(input.organizationId)) {
    throw new CodecampMigrationPlanningError(
      "TARGET_ORGANIZATION_INVALID",
      "The target company organization identifier is invalid.",
    );
  }
  const parsedSources = input.sourceIdentities.map((identity) =>
    codecampSourceIdentitySchema.parse(identity),
  );
  const parsedTargets = input.targetIdentities.map((identity) =>
    codecampTargetIdentitySchema.parse(identity),
  );
  const records = parsedSources.map((source): PlannedCodecampIdentity => {
    const normalizedUsername = normalizeCodecampMigrationUsername(
      source.username,
    );
    const companyAccountId = deriveCodecampMigrationUuid(
      `${CODECAMP_MIGRATION_SOURCE_DATABASE}:account:${source.id}`,
    );
    return {
      sourcePrincipalId: source.id,
      username: source.username.normalize("NFKC").trim(),
      sourceDisplayUsername: source.displayUsername,
      normalizedUsername,
      displayName: source.displayName?.trim() || source.displayUsername.trim(),
      githubUsername: source.githubUsername,
      passwordHash: source.passwordHash,
      passwordAlgorithm: classifyCodecampPasswordHash(source.passwordHash),
      role: source.role,
      createdAt: source.createdAt,
      companyAccountId,
      companyMembershipId: deriveCodecampMigrationUuid(
        `${CODECAMP_MIGRATION_SOURCE_DATABASE}:membership:${input.organizationId}:${companyAccountId}`,
      ),
    };
  });

  const sourceGroups = new Map<string, number>();
  for (const record of records) {
    sourceGroups.set(
      record.normalizedUsername,
      (sourceGroups.get(record.normalizedUsername) ?? 0) + 1,
    );
  }
  const sourceCollisionGroupCount = [...sourceGroups.values()].filter(
    (count) => count > 1,
  ).length;
  if (sourceCollisionGroupCount > 0) {
    throw new CodecampMigrationPlanningError(
      "SOURCE_USERNAME_COLLISION",
      `${sourceCollisionGroupCount} normalized source username collision group(s) require manual resolution.`,
    );
  }

  const plannedByName = new Map(
    records.map((record) => [record.normalizedUsername, record]),
  );
  let targetCollisionCount = 0;
  for (const target of parsedTargets) {
    const planned = plannedByName.get(target.normalizedUsername);
    if (planned && target.id !== planned.companyAccountId) {
      targetCollisionCount += 1;
    }
  }
  if (targetCollisionCount > 0) {
    throw new CodecampMigrationPlanningError(
      "TARGET_USERNAME_COLLISION",
      `${targetCollisionCount} target username collision(s) require manual resolution; automatic merge is disabled.`,
    );
  }

  return { records, sourceCollisionGroupCount, targetCollisionCount };
}

/**
 * Computes a deterministic source fingerprint without returning source fields.
 * @param input Sensitive plan records and aggregate product-ownership evidence.
 * @returns The lowercase SHA-256 fingerprint required for apply approval.
 */
export function fingerprintCodecampMigrationSource(input: {
  readonly records: readonly PlannedCodecampIdentity[];
  readonly ownership: readonly CodecampOwnershipEvidence[];
}): string {
  const hash = createHash("sha256");
  hash.update(`database\0${CODECAMP_MIGRATION_SOURCE_DATABASE}\n`);
  for (const record of [...input.records].sort((left, right) =>
    left.sourcePrincipalId.localeCompare(right.sourcePrincipalId),
  )) {
    const fields = [
      record.sourcePrincipalId,
      record.username,
      record.sourceDisplayUsername,
      record.normalizedUsername,
      record.displayName,
      record.githubUsername ?? "",
      record.role,
      record.createdAt.toISOString(),
      record.passwordHash,
      record.passwordAlgorithm,
      record.companyAccountId,
      record.companyMembershipId,
    ];
    for (const field of fields) {
      hash.update(`${Buffer.byteLength(field, "utf8")}:${field}`);
    }
    hash.update("\n");
  }
  for (const evidence of [...input.ownership].sort((left, right) =>
    left.table.localeCompare(right.table),
  )) {
    hash.update(
      `${evidence.table}\0${evidence.rowCount}\0${evidence.ownerCount}\0${evidence.fingerprint}\n`,
    );
  }
  return hash.digest("hex");
}

/**
 * Converts a sensitive plan into aggregate role and credential counts.
 * @param plan Sensitive in-memory migration plan.
 * @returns A non-identifying aggregate summary.
 */
export function summarizeCodecampMigrationPlan(
  plan: CodecampMigrationPlan,
): Pick<
  CodecampMigrationSummary,
  "sourceAccountCount" | "roleCounts" | "credentialAlgorithmCounts"
> {
  const roleCounts: Record<string, number> = {};
  const credentialAlgorithmCounts: Record<string, number> = {};
  for (const record of plan.records) {
    roleCounts[record.role] = (roleCounts[record.role] ?? 0) + 1;
    credentialAlgorithmCounts[record.passwordAlgorithm] =
      (credentialAlgorithmCounts[record.passwordAlgorithm] ?? 0) + 1;
  }
  return {
    sourceAccountCount: plan.records.length,
    roleCounts,
    credentialAlgorithmCounts,
  };
}
