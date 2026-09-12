import { createHash } from "node:crypto";

import { z } from "zod";

/** Exact operator phrase required before local product role grants may write. */
export const DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION =
  "LOCAL-TESTING-ONLY" as const;

/** Exact company identity database that owns every local SSO grant. */
export const DEV_LOCAL_PRODUCT_ACCESS_DATABASE = "company_identity" as const;

/** Stable operation name recorded on every applied local grant audit event. */
export const DEV_LOCAL_ROLE_GRANT_OPERATION = "DEV_LOCAL_ROLE_GRANT" as const;

/** Workbooks application stable key ensured by the local seed. */
export const DEV_LOCAL_WORKBOOKS_APPLICATION_KEY = "workbooks" as const;

/** Workbooks application display name mirrored from the identity bootstrap. */
export const DEV_LOCAL_WORKBOOKS_APPLICATION_DISPLAY_NAME =
  "Workbooks Advantage" as const;

/** Workbooks administrator role key ensured and granted by the local seed. */
export const DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_KEY = "WORKBOOK_ADMIN" as const;

/** Workbooks administrator role display name mirrored from the bootstrap. */
export const DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_DISPLAY_NAME =
  "Administrator" as const;

/** Workbooks administrator role description mirrored from the bootstrap. */
export const DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_DESCRIPTION =
  "Administers Workbooks Advantage." as const;

/** Local workbooks OIDC client id distinct from the production workbooks-web client. */
export const DEV_LOCAL_WORKBOOKS_CLIENT_ID = "workbooks-web-local" as const;

/** Local workbooks OIDC redirect URI targeting the workbooks dev port. */
export const DEV_LOCAL_WORKBOOKS_REDIRECT_URI =
  "http://localhost:3011/api/auth/callback" as const;

/** Environment variable carrying the local workbooks OIDC client secret. */
export const DEV_LOCAL_WORKBOOKS_SECRET_ENV =
  "WORKBOOKS_LOCAL_OIDC_CLIENT_SECRET" as const;

/** Stable operation names recorded on every applied local ensure audit event. */
export const DEV_LOCAL_APPLICATION_ENSURE_OPERATION =
  "DEV_LOCAL_APPLICATION_ENSURE" as const;
export const DEV_LOCAL_ROLE_DEFINITION_ENSURE_OPERATION =
  "DEV_LOCAL_ROLE_DEFINITION_ENSURE" as const;
export const DEV_LOCAL_OIDC_CLIENT_ENSURE_OPERATION =
  "DEV_LOCAL_OIDC_CLIENT_ENSURE" as const;
export const DEV_LOCAL_OIDC_REDIRECT_URI_ENSURE_OPERATION =
  "DEV_LOCAL_OIDC_REDIRECT_URI_ENSURE" as const;

/** Admin role key granted per known application stable key. */
export const DEV_LOCAL_ADMIN_ROLE_BY_APPLICATION: Readonly<Record<string, string>> =
  {
    workbooks: "WORKBOOK_ADMIN",
    codecamp: "ADMIN",
    sales: "SALES_ADMIN",
    marketing: "ADMIN",
  };

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const LOCAL_ONLY_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const URL_UUID_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
const WORKBOOKS_APPLICATION_URN =
  "https://reading-advantage.com/company-identity/application/workbooks";

/** Secret-safe adapter failure that never includes a URL, username, or hash. */
export class DevLocalProductAccessError extends Error {
  /** Stable machine-readable failure category. */
  readonly code: string;

  /**
   * Creates a secret-safe local product access failure.
   * @param code Stable machine-readable failure category.
   * @param message Non-sensitive operator-facing explanation.
   */
  constructor(code: string, message: string) {
    super(message);
    this.name = "DevLocalProductAccessError";
    this.code = code;
  }
}

/** CLI and adapter input for the local product access seed. */
export const devLocalProductAccessInputSchema = z.strictObject({
  /** Direct connection URL that must resolve to a localhost-only host. */
  targetDatabaseUrl: z.string().min(1),
  /** Read-only planning or explicitly approved application. */
  mode: z.enum(["dry-run", "apply"]),
  /** Optional explicit target account username. */
  username: z.string().min(1).max(64).optional(),
  /** Exact apply confirmation phrase. */
  confirmation: z.string().optional(),
  /** Raw local workbooks OIDC client secret; only validated when the client must be created. */
  workbooksLocalOidcClientSecret: z.string().optional(),
});

/** Input used by the PostgreSQL-backed local product access adapter. */
export type PostgresDevLocalProductAccessInput = z.infer<
  typeof devLocalProductAccessInputSchema
>;

/** One active account membership eligible as the local seed target. */
export const devLocalAccountCandidateSchema = z.strictObject({
  accountId: z.string().uuid(),
  username: z.string().min(1).max(64),
  normalizedUsername: z.string().min(1).max(64),
  membershipId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

/** Active account membership eligible as the local seed target. */
export type DevLocalAccountCandidate = z.infer<
  typeof devLocalAccountCandidateSchema
>;

/** One registered company application row. */
export const devLocalApplicationRecordSchema = z.strictObject({
  id: z.string().uuid(),
  stableKey: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/),
});

/** One registered company application row. */
export type DevLocalApplicationRecord = z.infer<
  typeof devLocalApplicationRecordSchema
>;

/** One existing non-expired application role held by the target membership. */
export const devLocalHeldAssignmentSchema = z.strictObject({
  applicationId: z.string().uuid(),
  roleKey: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/),
});

/** One existing non-expired application role held by the target membership. */
export type DevLocalHeldAssignment = z.infer<
  typeof devLocalHeldAssignmentSchema
>;

/** Per-application outcome inside a local product access plan. */
export const devLocalGrantStatusSchema = z.enum([
  "TO_GRANT",
  "ALREADY_HELD",
  "SKIPPED",
]);

/** One per-application grant plan entry. */
export const devLocalGrantPlanEntrySchema = z.strictObject({
  applicationId: z.string().uuid(),
  applicationKey: z.string().min(1),
  roleKey: z.string().nullable(),
  status: devLocalGrantStatusSchema,
  reason: z.string().nullable(),
});

/** Per-application grant plan entry. */
export type DevLocalGrantPlanEntry = z.infer<
  typeof devLocalGrantPlanEntrySchema
>;

/** One local infrastructure ensure step inside the plan. */
export const devLocalEnsureStatusSchema = z.enum(["PRESENT", "WOULD_CREATE"]);

/** One local infrastructure ensure step inside the plan. */
export const devLocalEnsureStepSchema = z.strictObject({
  step: z.enum([
    "APPLICATION",
    "ROLE_DEFINITION",
    "OIDC_CLIENT",
    "OIDC_REDIRECT_URI",
  ]),
  status: devLocalEnsureStatusSchema,
  detail: z.string().nullable(),
});

/** Local infrastructure ensure step inside the plan. */
export type DevLocalEnsureStep = z.infer<typeof devLocalEnsureStepSchema>;

/** Deterministic local product access plan for one target membership. */
export const devLocalProductAccessPlanSchema = z.strictObject({
  accountId: z.string().uuid(),
  accountUsername: z.string().min(1),
  membershipId: z.string().uuid(),
  organizationId: z.string().uuid(),
  workbooksApplicationId: z.string().uuid(),
  grants: z.array(devLocalGrantPlanEntrySchema),
  toGrantCount: z.number().int().nonnegative(),
  alreadyHeldCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  ensureSteps: z.array(devLocalEnsureStepSchema),
  ensurePendingCount: z.number().int().nonnegative(),
  workbooksOidcClientSecretRequired: z.boolean(),
  workbooksOidcClientSecretSet: z.boolean(),
});

/** Deterministic local product access plan for one target membership. */
export type DevLocalProductAccessPlan = z.infer<
  typeof devLocalProductAccessPlanSchema
>;

/** Secret-safe aggregate report emitted by dry-run and apply commands. */
export const devLocalProductAccessSummarySchema = z.strictObject({
  mode: z.enum(["dry-run", "apply"]),
  accountUsername: z.string().min(1),
  grants: z.array(devLocalGrantPlanEntrySchema),
  toGrantCount: z.number().int().nonnegative(),
  alreadyHeldCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  ensureSteps: z.array(devLocalEnsureStepSchema),
  ensurePendingCount: z.number().int().nonnegative(),
  workbooksOidcClientSecretRequired: z.boolean(),
  appliedGrantCount: z.number().int().nonnegative().optional(),
  auditEventCount: z.number().int().nonnegative().optional(),
  warnings: z.array(z.string()),
});

/** Secret-safe aggregate report emitted by dry-run and apply commands. */
export type DevLocalProductAccessSummary = z.infer<
  typeof devLocalProductAccessSummarySchema
>;

/** Result of admin-role resolution for one application. */
export interface AdminRoleResolution {
  /** Chosen admin role key, or null when the application must be skipped. */
  readonly roleKey: string | null;
  /** Human-readable skip reason, or null when a role was chosen. */
  readonly reason: string | null;
}

/** Input used by the pure local product access planner. */
export interface PlanDevLocalProductAccessInput {
  /** Operator-selected mode that determines secret authorization rules. */
  readonly mode: "dry-run" | "apply";
  /** Resolved target account membership selected by the operator or discovery. */
  readonly target: DevLocalAccountCandidate;
  /** Every registered company application row. */
  readonly applications: readonly DevLocalApplicationRecord[];
  /** Active role keys defined per application id. */
  readonly roleDefinitionsByApplicationId: Readonly<
    Record<string, readonly string[]>
  >;
  /** Existing non-expired roles already held by the target membership. */
  readonly heldAssignments: readonly DevLocalHeldAssignment[];
  /** Whether the workbooks application row already exists. */
  readonly workbooksApplicationPresent: boolean;
  /** Whether the workbooks WORKBOOK_ADMIN role definition already exists. */
  readonly workbooksRoleDefined: boolean;
  /** Whether the local workbooks OIDC client already exists. */
  readonly workbooksLocalOidcClientPresent: boolean;
  /** Whether the local workbooks redirect URI is already registered. */
  readonly workbooksLocalRedirectUriPresent: boolean;
  /** Raw local workbooks OIDC client secret; ignored when the client already exists. */
  readonly workbooksLocalOidcClientSecret?: string;
}

/**
 * Derives the deterministic UUIDv5 used by the identity bootstrap for workbooks.
 * @returns The stable workbooks application identifier shared by ensure and grant steps.
 */
export function deriveDevLocalWorkbooksApplicationId(): string {
  const bytes = Buffer.from(URL_UUID_NAMESPACE.replaceAll("-", ""), "hex");
  const digest = createHash("sha1")
    .update(bytes)
    .update(Buffer.from(WORKBOOKS_APPLICATION_URN, "utf8"))
    .digest()
    .subarray(0, 16);
  digest[6] = (digest[6]! & 0x0f) | 0x50;
  digest[8] = (digest[8]! & 0x3f) | 0x80;
  const hex = digest.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Normalizes a local seed username with the Accounts Version 1 algorithm.
 * @param username Operator-selected target username.
 * @returns The canonical normalized Accounts username.
 * @throws When the username cannot be represented safely in Accounts.
 */
export function normalizeDevLocalUsername(username: string): string {
  const normalized = username.normalize("NFKC").trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new DevLocalProductAccessError(
      "TARGET_USERNAME_INVALID",
      "The local seed username is incompatible with Accounts normalization.",
    );
  }
  return normalized;
}

/**
 * Refuses every database host except loopback-only local PostgreSQL.
 * @param databaseUrl Direct company identity connection URL.
 * @returns Nothing when the observed host is loopback-only.
 * @throws When the URL is unparseable or targets any non-loopback host.
 */
export function assertLocalOnlyDatabaseHost(databaseUrl: string): void {
  let hostname: string;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    throw new DevLocalProductAccessError(
      "NON_LOCAL_DATABASE_REFUSED",
      'Local product access seed requires a localhost-only database; observed host "<unparseable>" (empty host or Unix socket path).',
    );
  }
  const normalized = hostname.replace(/^\[|\]$/g, "");
  if (!LOCAL_ONLY_HOSTNAMES.has(normalized)) {
    throw new DevLocalProductAccessError(
      "NON_LOCAL_DATABASE_REFUSED",
      `Local product access seed requires a localhost-only database; observed host "${hostname}".`,
    );
  }
}

/**
 * Selects the exact target account membership for the local seed.
 * @param input Optional explicit username and discovery candidates.
 * @returns The single eligible target candidate.
 * @throws When the selection is missing or ambiguous.
 */
export function resolveDevLocalTargetAccount(input: {
  readonly username?: string;
  readonly discoveryCandidates: readonly DevLocalAccountCandidate[];
}): DevLocalAccountCandidate {
  if (input.username !== undefined) {
    const normalized = normalizeDevLocalUsername(input.username);
    const matches = input.discoveryCandidates.filter(
      (candidate) => candidate.normalizedUsername === normalized,
    );
    if (matches.length === 0) {
      throw new DevLocalProductAccessError(
        "TARGET_ACCOUNT_NOT_FOUND",
        `No active account matches username "${input.username}".`,
      );
    }
    if (matches.length > 1) {
      throw new DevLocalProductAccessError(
        "TARGET_ACCOUNT_AMBIGUOUS",
        `Username "${input.username}" matches multiple active memberships; pass --username with a unique account.`,
      );
    }
    return matches[0]!;
  }
  if (input.discoveryCandidates.length === 0) {
    throw new DevLocalProductAccessError(
      "ADMIN_CANDIDATE_NOT_FOUND",
      "No account holds an active Codecamp ADMIN assignment; pass --username=<name> explicitly.",
    );
  }
  if (input.discoveryCandidates.length > 1) {
    throw new DevLocalProductAccessError(
      "ADMIN_CANDIDATE_AMBIGUOUS",
      `${input.discoveryCandidates.length} accounts hold an active Codecamp ADMIN assignment; pass --username=<name> explicitly.`,
    );
  }
  return input.discoveryCandidates[0]!;
}

/**
 * Resolves the administrator role key for one application.
 * @param applicationKey Stable company application key.
 * @param definedRoleKeys Active role keys defined for the application.
 * @returns The chosen admin role key, or a skip reason when no unique choice exists.
 * @throws When an explicit preference map role is not defined for the application.
 */
export function resolveAdminRoleKeyForApplication(
  applicationKey: string,
  definedRoleKeys: readonly string[],
): AdminRoleResolution {
  const explicit = DEV_LOCAL_ADMIN_ROLE_BY_APPLICATION[applicationKey];
  if (explicit !== undefined) {
    if (!definedRoleKeys.includes(explicit)) {
      throw new DevLocalProductAccessError(
        "ADMIN_ROLE_DEFINITION_MISSING",
        `Application "${applicationKey}" requires role ${explicit} but it is not defined.`,
      );
    }
    return { roleKey: explicit, reason: null };
  }
  const adminSuffixed = definedRoleKeys.filter((roleKey) =>
    roleKey.endsWith("ADMIN"),
  );
  if (adminSuffixed.length === 1) {
    return { roleKey: adminSuffixed[0]!, reason: null };
  }
  if (adminSuffixed.length === 0) {
    return {
      roleKey: null,
      reason: `Application "${applicationKey}" defines no ADMIN role.`,
    };
  }
  return {
    roleKey: null,
    reason: `Application "${applicationKey}" defines ${adminSuffixed.length} ADMIN roles; refusing ambiguous selection.`,
  };
}

/**
 * Builds the deterministic, fail-closed local product access plan.
 * @param input Resolved target, applications, role definitions, held roles, and ensure state.
 * @returns The per-application grant plan with ensure, already-held, and skip outcomes.
 * @throws When the target or inventory is invalid, a preference role is undefined, or apply lacks the client secret.
 */
export function planDevLocalProductAccess(
  input: PlanDevLocalProductAccessInput,
): DevLocalProductAccessPlan {
  const target = devLocalAccountCandidateSchema.parse(input.target);
  const applications = input.applications.map((application) =>
    devLocalApplicationRecordSchema.parse(application),
  );
  const existingWorkbooksApplication = applications.find(
    (application) => application.stableKey === DEV_LOCAL_WORKBOOKS_APPLICATION_KEY,
  );
  const workbooksApplicationId =
    existingWorkbooksApplication?.id ?? deriveDevLocalWorkbooksApplicationId();
  const effectiveRoleDefinitions = {
    ...input.roleDefinitionsByApplicationId,
  };
  if (!input.workbooksRoleDefined) {
    effectiveRoleDefinitions[workbooksApplicationId] = [
      ...(effectiveRoleDefinitions[workbooksApplicationId] ?? []),
      DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_KEY,
    ];
  }
  const effectiveApplications = existingWorkbooksApplication
    ? applications
    : [
        ...applications,
        {
          id: workbooksApplicationId,
          stableKey: DEV_LOCAL_WORKBOOKS_APPLICATION_KEY,
        },
      ];
  const held = new Set(
    input.heldAssignments.map(
      (assignment) => `${assignment.applicationId}\0${assignment.roleKey}`,
    ),
  );
  const grants = [...effectiveApplications]
    .sort((left, right) => left.stableKey.localeCompare(right.stableKey))
    .map((application) => {
      const resolution = resolveAdminRoleKeyForApplication(
        application.stableKey,
        effectiveRoleDefinitions[application.id] ?? [],
      );
      if (resolution.roleKey === null) {
        return {
          applicationId: application.id,
          applicationKey: application.stableKey,
          roleKey: null,
          status: "SKIPPED" as const,
          reason: resolution.reason,
        };
      }
      if (held.has(`${application.id}\0${resolution.roleKey}`)) {
        return {
          applicationId: application.id,
          applicationKey: application.stableKey,
          roleKey: resolution.roleKey,
          status: "ALREADY_HELD" as const,
          reason: null,
        };
      }
      return {
        applicationId: application.id,
        applicationKey: application.stableKey,
        roleKey: resolution.roleKey,
        status: "TO_GRANT" as const,
        reason: null,
      };
    });
  const ensureSteps = [
    {
      step: "APPLICATION" as const,
      status: input.workbooksApplicationPresent ? "PRESENT" as const : "WOULD_CREATE" as const,
      detail: DEV_LOCAL_WORKBOOKS_APPLICATION_KEY,
    },
    {
      step: "ROLE_DEFINITION" as const,
      status: input.workbooksRoleDefined ? "PRESENT" as const : "WOULD_CREATE" as const,
      detail: DEV_LOCAL_WORKBOOKS_ADMIN_ROLE_KEY,
    },
    {
      step: "OIDC_CLIENT" as const,
      status: input.workbooksLocalOidcClientPresent ? "PRESENT" as const : "WOULD_CREATE" as const,
      detail: DEV_LOCAL_WORKBOOKS_CLIENT_ID,
    },
    {
      step: "OIDC_REDIRECT_URI" as const,
      status: input.workbooksLocalRedirectUriPresent ? "PRESENT" as const : "WOULD_CREATE" as const,
      detail: DEV_LOCAL_WORKBOOKS_REDIRECT_URI,
    },
  ];
  const workbooksOidcClientSecretRequired = ensureSteps.some(
    (step) => step.step === "OIDC_CLIENT" && step.status === "WOULD_CREATE",
  );
  const workbooksOidcClientSecretSet =
    input.workbooksLocalOidcClientSecret !== undefined &&
    input.workbooksLocalOidcClientSecret.length >= 32;
  if (
    input.mode === "apply" &&
    workbooksOidcClientSecretRequired &&
    !workbooksOidcClientSecretSet
  ) {
    throw new DevLocalProductAccessError(
      "OIDC_CLIENT_SECRET_REQUIRED",
      `Apply requires the ${DEV_LOCAL_WORKBOOKS_SECRET_ENV} environment variable (min 32 chars) because the local workbooks OIDC client must be created.`,
    );
  }
  return devLocalProductAccessPlanSchema.parse({
    accountId: target.accountId,
    accountUsername: target.username,
    membershipId: target.membershipId,
    organizationId: target.organizationId,
    workbooksApplicationId,
    grants,
    toGrantCount: grants.filter((grant) => grant.status === "TO_GRANT").length,
    alreadyHeldCount: grants.filter((grant) => grant.status === "ALREADY_HELD")
      .length,
    skippedCount: grants.filter((grant) => grant.status === "SKIPPED").length,
    ensureSteps,
    ensurePendingCount: ensureSteps.filter(
      (step) => step.status === "WOULD_CREATE",
    ).length,
    workbooksOidcClientSecretRequired,
    workbooksOidcClientSecretSet,
  });
}

/**
 * Converts a local product access plan into the secret-safe aggregate report.
 * @param input Operation mode, plan, and optional applied write counts.
 * @returns The aggregate dry-run or apply report.
 */
export function summarizeDevLocalProductAccessPlan(input: {
  readonly mode: "dry-run" | "apply";
  readonly plan: DevLocalProductAccessPlan;
  readonly appliedGrantCount?: number;
  readonly auditEventCount?: number;
}): DevLocalProductAccessSummary {
  const warnings = input.plan.grants.flatMap((grant) =>
    grant.status === "SKIPPED" && grant.reason
      ? [`Application "${grant.applicationKey}": ${grant.reason}`]
      : [],
  );
  if (
    input.mode === "dry-run" &&
    input.plan.workbooksOidcClientSecretRequired &&
    !input.plan.workbooksOidcClientSecretSet
  ) {
    warnings.push(
      `The local workbooks OIDC client must be created; --apply requires ${DEV_LOCAL_WORKBOOKS_SECRET_ENV} (min 32 chars).`,
    );
  }
  return devLocalProductAccessSummarySchema.parse({
    mode: input.mode,
    accountUsername: input.plan.accountUsername,
    grants: input.plan.grants,
    toGrantCount: input.plan.toGrantCount,
    alreadyHeldCount: input.plan.alreadyHeldCount,
    skippedCount: input.plan.skippedCount,
    ensureSteps: input.plan.ensureSteps,
    ensurePendingCount: input.plan.ensurePendingCount,
    workbooksOidcClientSecretRequired: input.plan.workbooksOidcClientSecretRequired,
    warnings,
    ...(input.appliedGrantCount === undefined
      ? {}
      : { appliedGrantCount: input.appliedGrantCount }),
    ...(input.auditEventCount === undefined
      ? {}
      : { auditEventCount: input.auditEventCount }),
  });
}
