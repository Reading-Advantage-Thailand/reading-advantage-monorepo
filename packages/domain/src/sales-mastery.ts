import { createHash } from "node:crypto";

import {
  and,
  eq,
  salesMasteryProjectionOutbox,
  salesMasteryProjectionReceipts,
  salesMasteryTenantMappings,
  schools,
  type DB,
} from "@reading-advantage/db";
import { salesCurriculumBindings } from "@reading-advantage/sales-knowledge";
import type {
  CommitMasteryEvidenceInput,
  CommitMasteryEvidenceResult,
  MasterySnapshot,
} from "./mastery/persistence-contracts.js";
import { commitMasteryEvidenceResultSchema } from "./mastery/persistence-contracts.js";
import {
  MasteryPersistenceError,
  type MasteryPersistencePort,
} from "./mastery/persistence-ports.js";
import { salesPrincipalLocalId } from "./company-identity-principal.js";
import { z } from "zod";

/** Company Identity claims used by the committed legacy Sales contract. */
const verifiedCompanyIdentityClaimsSchema = z.strictObject({
  iss: z.string().url(),
  sub: z.string().uuid(),
  username: z.string().min(1).max(64),
  displayName: z.string().min(1).max(200),
  aud: z.string().min(1),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  nonce: z.string().min(1),
  sid: z.string().uuid(),
  organizationId: z.string().uuid(),
  organizationKey: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/),
  status: z.literal("ACTIVE"),
  roles: z.array(z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/)),
  authVersion: z.number().int().positive(),
});

type CompanyIdentityClaims = z.infer<
  typeof verifiedCompanyIdentityClaimsSchema
>;

/** Verified identity returned by the internal Company Identity adapter. */
export interface VerifiedSalesIdentity {
  /** Trusted issuer identifier. */
  readonly issuer: string;
  /** Trusted expiration timestamp. */
  readonly expiresAt: string;
  /** Trusted organization UUID. */
  readonly organizationId: string;
  /** Trusted organization key. */
  readonly organizationKey: "internal-company";
  /** Trusted Sales-local principal identifier. */
  readonly principalId: string;
}

/** Provider-neutral input accepted by the Company Identity verifier. */
interface CompanyIdentityVerificationInput {
  /** Untrusted token or session value supplied by the caller. */
  readonly identity: unknown;
  /** Audience required for this application boundary. */
  readonly expectedAudience: "sales";
}

/** Verifies untrusted identity input and returns trusted Sales scope. */
export interface CompanyIdentityVerificationPort {
  /** Verifies one identity for the Sales audience. */
  verify(
    input: CompanyIdentityVerificationInput,
  ): Promise<VerifiedSalesIdentity>;
}

/** Scope passed to the injected Sales Mastery persistence factory. */
interface SalesPersistenceFactoryOptions {
  /** Dedicated mapped Mastery tenant. */
  readonly tenant: { readonly schoolId: string };
  /** Stable Sales source tenant identity. */
  readonly sourceTenantKey: string;
  /** Trusted Sales principal that performs the operation. */
  readonly actorId: string;
}

/** Creates a scoped, provider-neutral Mastery persistence port. */
export interface SalesPersistenceFactory {
  /** Creates one Mastery port for the verified Sales scope. */
  create(options: SalesPersistenceFactoryOptions): MasteryPersistencePort;
}

const SALES_APPLICATION_KEY = "sales" as const;
const SALES_ORGANIZATION_KEY = "internal-company" as const;
const SALES_ROLE_KEYS = new Set(["SALES_ADMIN", "SALES_REP"]);

/** The reviewed Sales graph release admitted by the shared runtime. */
export const SALES_MASTERY_GRAPH_RELEASE =
  "knowledge-space-sales-mastery-v1.0.0" as const;

/** The reviewed Sales curriculum-binding digest for the admitted graph. */
export const SALES_MASTERY_BINDINGS_DIGEST =
  "e8843314e2f381a44143acb08c6ff6596bdeac4e9da32fbdb9a5851c8ed32197" as const;

/** The reserved Mastery namespace owned by Codecamp. */
export const CODECAMP_MASTERY_TENANT_KEY =
  "c0deca00-0000-4000-8000-000000000001" as const;

const zStringDigest = () => z.string().regex(/^[0-9a-f]{64}$/);
const nonBlankString = () => z.string().trim().min(1).max(500);
const literalSalesApplication = () => z.literal("sales-advantage");
const zStrictObject = z.strictObject;
const verifiedSalesIdentitySchema = z.strictObject({
  issuer: z.string().url(),
  expiresAt: nonBlankString(),
  organizationId: z.string().uuid(),
  organizationKey: z.literal("internal-company"),
  principalId: z
    .string()
    .regex(
      /^sales:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    ),
});
const roleplayEvaluatorEligibilitySchema = z.strictObject({
  contractVersion: z.literal("sales-roleplay-evaluator-eligibility.v1"),
  immutableAttempt: z.literal(true),
  evaluator: z.strictObject({
    provider: nonBlankString(),
    model: nonBlankString(),
    evaluatorVersion: nonBlankString(),
  }),
  rubric: z.strictObject({
    rubricId: nonBlankString(),
    rubricDigest: zStringDigest(),
  }),
  attempt: z.strictObject({
    attemptId: nonBlankString(),
    attemptDigest: zStringDigest(),
  }),
});

/** Company Identity input accepted by the Sales Mastery tenant resolver. */
export const salesMasteryTenantResolutionInputSchema = z.strictObject({
  identity: z.unknown(),
});

const projectionPayloadSchema = zStrictObject({
  objectiveId: nonBlankString(),
  variantKey: nonBlankString(),
  rubricVersion: nonBlankString(),
  score: z.number().finite().min(0).max(1),
  activityKind: z.enum(["quiz", "roleplay"]).optional(),
  evidenceSource: z.enum(["quiz-response", "roleplay-evaluation"]).optional(),
  consentGiven: z.boolean().optional(),
  retentionDays: z.number().int().optional(),
  evaluatorEligibility: z.unknown().optional(),
});

/** Validated Sales Mastery projection command from one immutable attempt. */
export const salesMasteryProjectionInputSchema = zStrictObject({
  identity: z.unknown(),
  principalId: nonBlankString().optional(),
  sourceAttemptId: nonBlankString(),
  idempotencyKey: nonBlankString(),
  sourceApplication: literalSalesApplication(),
  graphRelease: nonBlankString(),
  bindingsDigest: zStringDigest(),
  payload: projectionPayloadSchema,
});

/** Validated organization-scoped Sales Mastery evidence read. */
export const salesMasteryEvidenceReadInputSchema = zStrictObject({
  identity: z.unknown(),
  principalId: nonBlankString().optional(),
});

/** Validated organization-scoped pending projection retry request. */
export const salesMasteryRetryInputSchema = zStrictObject({
  identity: z.unknown(),
  sourceAttemptId: nonBlankString(),
});

const legacyTenantResolutionInputSchema = zStrictObject({
  identity: verifiedCompanyIdentityClaimsSchema,
});
const legacyProjectionInputSchema = zStrictObject({
  identity: verifiedCompanyIdentityClaimsSchema,
  principalId: nonBlankString(),
  sourceAttemptId: nonBlankString(),
  idempotencyKey: nonBlankString(),
  sourceApplication: literalSalesApplication(),
  graphRelease: nonBlankString(),
  bindingsDigest: zStringDigest(),
  payload: projectionPayloadSchema,
});
const legacyEvidenceReadInputSchema = zStrictObject({
  identity: verifiedCompanyIdentityClaimsSchema,
  principalId: nonBlankString(),
});
const legacyRetryInputSchema = zStrictObject({
  identity: verifiedCompanyIdentityClaimsSchema,
  sourceAttemptId: nonBlankString(),
});

/** Durable tenant namespace returned by the Sales mapping adapter. */
export interface SalesMasteryTenantBinding {
  /** Exact admitted application identity. */
  readonly applicationKey: "sales";
  /** Verified Company Identity organization UUID. */
  readonly organizationId: string;
  /** Verified Company Identity organization key. */
  readonly organizationKey: string;
  /** Dedicated Mastery school namespace. */
  readonly masteryTenantKey: string;
  /** Stable source tenant key retained in Mastery records. */
  readonly sourceTenantKey: string;
}

/** Stable receipt returned for an applied or replayed Sales projection. */
export interface SalesMasteryProjectionReceipt {
  /** Whether this call applied the receipt or replayed an existing receipt. */
  readonly status: "applied" | "replayed";
  /** Mastery commit identity. */
  readonly commitId: string;
  /** Sales outbox identity. */
  readonly outboxId: string;
}

/** Public Sales Mastery mapping and projection adapter. */
export interface SalesMasteryProjection {
  /** Resolves one verified organization to one dedicated Mastery namespace. */
  resolveTenant(input: unknown): Promise<SalesMasteryTenantBinding>;
  /** Projects one validated immutable attempt through the Mastery adapter. */
  project(
    input: unknown,
    options?: { readonly failDelivery?: boolean },
  ): Promise<SalesMasteryProjectionReceipt>;
  /** Reads only evidence owned by the verified organization and learner. */
  readEvidence(input: unknown): Promise<readonly Record<string, unknown>[]>;
  /** Retries one pending projection without duplicating Mastery evidence. */
  retryPending(input: unknown): Promise<SalesMasteryProjectionReceipt>;
}

/** Input type inferred from the strict projection contract. */
export type SalesMasteryProjectionInput = z.infer<
  typeof salesMasteryProjectionInputSchema
>;

type SalesDatabase = Omit<DB, "$client">;
type MappingRow = typeof salesMasteryTenantMappings.$inferSelect;
type OutboxRow = typeof salesMasteryProjectionOutbox.$inferSelect;
type ReceiptRow = typeof salesMasteryProjectionReceipts.$inferSelect;

/** Trusted projection request assembled after Company Identity verification. */
interface TrustedProjectionInput extends Omit<
  SalesMasteryProjectionInput,
  "identity"
> {
  readonly identity: VerifiedSalesIdentity;
  readonly principalId: string;
  readonly legacyMode: boolean;
}

interface MemoryOutbox {
  readonly id: string;
  readonly input: TrustedProjectionInput;
  readonly binding: SalesMasteryTenantBinding;
  readonly payloadDigest: string;
  readonly receipt?: SalesMasteryProjectionReceipt;
}

type ParsedPayload = z.infer<typeof projectionPayloadSchema>;

interface AcceptedActivityBinding {
  readonly activityKind: "quiz-question" | "roleplay";
  readonly evidenceSource: "quiz-response" | "roleplay-evaluation";
  readonly roleplayEligible: boolean;
}

interface ReceiptInsertResult {
  readonly created: boolean;
  readonly receipt: SalesMasteryProjectionReceipt;
}

/** Error returned when Sales Mastery authorization or projection fails closed. */
export class SalesMasteryProjectionError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: string;
  /** Whether a caller may retry the operation. */
  readonly retryable: boolean;

  /** Creates a provider-neutral Sales Mastery projection error. */
  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "SalesMasteryProjectionError";
    this.code = code;
    this.retryable = retryable;
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

function digest(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`;
}

function uuidFromDigest(value: string): string {
  const source = value.replace(/^sha256:/, "");
  const hex = /^[0-9a-f]{64}$/u.test(source)
    ? source
    : createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(
    13,
    16,
  )}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === [...expected].sort()[index])
  );
}

/** Resolves one projection payload to an approved Sales activity binding. */
function approvedActivityBinding(
  payload: Record<string, unknown>,
  allowLegacyFallback = false,
): AcceptedActivityBinding | null {
  const objectiveId = payload.objectiveId;
  const variantKey = payload.variantKey;
  const rubricVersion = payload.rubricVersion;
  if (
    typeof objectiveId !== "string" ||
    typeof variantKey !== "string" ||
    typeof rubricVersion !== "string"
  ) {
    return null;
  }

  const reviewedBinding = salesCurriculumBindings.bindings.find(
    (binding) =>
      binding.objectiveIds.includes(objectiveId) &&
      (binding.variantId === variantKey ||
        binding.variantFamily === variantKey) &&
      (binding.rubricRefs.length === 0
        ? rubricVersion === "sales-rubric.v1"
        : binding.rubricRefs.includes(rubricVersion)),
  );
  if (reviewedBinding) {
    return {
      activityKind:
        reviewedBinding.activityKind === "roleplay"
          ? "roleplay"
          : "quiz-question",
      evidenceSource:
        reviewedBinding.evidenceSource === "roleplay-evaluation"
          ? "roleplay-evaluation"
          : "quiz-response",
      roleplayEligible:
        reviewedBinding.activityKind === "roleplay" &&
        reviewedBinding.evidenceMode === "assessed" &&
        reviewedBinding.evaluatorEligibility != null,
    };
  }

  if (
    allowLegacyFallback &&
    objectiveId === "sales.value-proposition" &&
    variantKey === "quiz.recognition" &&
    rubricVersion === "sales-rubric.v1"
  ) {
    return {
      activityKind: "quiz-question",
      evidenceSource: "quiz-response",
      roleplayEligible: false,
    };
  }
  return null;
}

/** Validates activity applicability and roleplay consent before Mastery access. */
function validateProjectionPayload(
  payload: Record<string, unknown>,
  allowLegacyFallback = false,
): Record<string, unknown> {
  const parsed = projectionPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "Sales evidence payload failed validation.",
    );
  }
  const binding = approvedActivityBinding(parsed.data, allowLegacyFallback);
  if (!binding) {
    throw new SalesMasteryProjectionError(
      "ACTIVITY_BINDING_FORBIDDEN",
      "The Sales activity is not present in the approved binding release.",
    );
  }

  const requestedKind = parsed.data.activityKind;
  const requestedSource = parsed.data.evidenceSource;
  if (
    (requestedKind === "roleplay" && binding.activityKind !== "roleplay") ||
    (requestedKind === "quiz" && binding.activityKind !== "quiz-question") ||
    (requestedSource === "roleplay-evaluation" &&
      binding.evidenceSource !== "roleplay-evaluation") ||
    (requestedSource === "quiz-response" &&
      binding.evidenceSource !== "quiz-response")
  ) {
    throw new SalesMasteryProjectionError(
      "ACTIVITY_BINDING_FORBIDDEN",
      "The Sales activity kind does not match its approved binding.",
    );
  }

  const roleplay =
    requestedKind === "roleplay" ||
    requestedSource === "roleplay-evaluation" ||
    binding.activityKind === "roleplay";
  if (!roleplay && parsed.data.evaluatorEligibility !== undefined) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "Evaluator eligibility is restricted to approved roleplay evidence.",
    );
  }
  if (roleplay) {
    if (
      parsed.data.consentGiven !== true ||
      typeof parsed.data.retentionDays !== "number" ||
      !Number.isInteger(parsed.data.retentionDays) ||
      parsed.data.retentionDays < 1 ||
      parsed.data.retentionDays > 365
    ) {
      throw new SalesMasteryProjectionError(
        "ROLEPLAY_CONSENT_REQUIRED",
        "Roleplay evidence requires accepted consent and retention settings.",
      );
    }
    if (
      !binding.roleplayEligible ||
      !roleplayEvaluatorEligibilitySchema.safeParse(
        parsed.data.evaluatorEligibility,
      ).success
    ) {
      throw new SalesMasteryProjectionError(
        "ROLEPLAY_INELIGIBLE",
        "Roleplay evidence lacks approved evaluator eligibility.",
      );
    }
  }
  return parsed.data;
}

function providerCode(error: unknown): string | undefined {
  if (!isRecord(error)) return undefined;
  if (typeof error.code === "string") return error.code;
  return isRecord(error.cause) && typeof error.cause.code === "string"
    ? error.cause.code
    : undefined;
}

function providerFailure(error: unknown): never {
  if (error instanceof SalesMasteryProjectionError) throw error;
  if (error instanceof MasteryPersistenceError) {
    const safeMessages: Record<string, string> = {
      VALIDATION_ERROR: "Sales Mastery persistence rejected the evidence.",
      TENANT_SCOPE_ERROR: "Sales Mastery tenant scope is invalid.",
      IDEMPOTENCY_CONFLICT:
        "The Sales evidence identity conflicts with existing evidence.",
      APPEND_ONLY_CONFLICT:
        "The Sales evidence conflicts with an immutable Mastery record.",
      REVISION_CONFLICT: "The Sales Mastery revision changed concurrently.",
      PERSISTENCE_UNAVAILABLE:
        "Sales Mastery persistence is temporarily unavailable.",
      PERSISTENCE_TIMEOUT: "Sales Mastery persistence timed out.",
      MISSING_MIGRATION: "Sales Mastery persistence is not available.",
      INTERNAL_ERROR: "Sales Mastery persistence could not be applied.",
    };
    throw new SalesMasteryProjectionError(
      error.code,
      safeMessages[error.code] ?? "Sales Mastery persistence failed.",
      error.retryable,
    );
  }
  const code = providerCode(error);
  if (code === "23505") {
    throw new SalesMasteryProjectionError(
      "TENANT_SCOPE_ERROR",
      "The Sales organization mapping conflicts with an existing namespace.",
    );
  }
  if (code === "42P01") {
    throw new SalesMasteryProjectionError(
      "MISSING_MIGRATION",
      "Sales Mastery persistence is not available.",
    );
  }
  if (code === "40001" || code === "ECONNREFUSED") {
    throw new SalesMasteryProjectionError(
      "PERSISTENCE_UNAVAILABLE",
      "Sales Mastery persistence is temporarily unavailable.",
      true,
    );
  }
  throw new SalesMasteryProjectionError(
    "PERSISTENCE_UNAVAILABLE",
    "Sales Mastery persistence could not be applied.",
    true,
  );
}

async function verifyCompanyIdentity(
  identity: unknown,
  verifier: CompanyIdentityVerificationPort,
): Promise<VerifiedSalesIdentity> {
  let result: VerifiedSalesIdentity;
  try {
    result = await verifier.verify({
      identity,
      expectedAudience: SALES_APPLICATION_KEY,
    });
  } catch {
    throw new SalesMasteryProjectionError(
      "COMPANY_IDENTITY_FORBIDDEN",
      "Company Identity verification failed.",
    );
  }
  const parsed = verifiedSalesIdentitySchema.safeParse(result);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "COMPANY_IDENTITY_FORBIDDEN",
      "Company Identity verification returned invalid scope.",
    );
  }
  return parsed.data;
}

function rejectCallerTenant(input: unknown, allowPrincipalId = false): void {
  if (!isRecord(input)) return;
  if (input.targetTenantNamespace === "codecamp") {
    throw new SalesMasteryProjectionError(
      "CODECAMP_NAMESPACE_FORBIDDEN",
      "Codecamp namespace reuse is forbidden for Sales Mastery.",
    );
  }
  const forbidden = [
    "applicationKey",
    "schoolId",
    "tenantKey",
    "masteryTenantKey",
    "targetTenantNamespace",
    "organizationId",
    "organizationKey",
    "receipt",
    "receiptId",
    "commitId",
    "outboxId",
    "resultDigest",
    "sourceTenantKey",
    "actorId",
    "tenant",
  ];
  if (
    forbidden.some((key) => key in input) ||
    (!allowPrincipalId && "principalId" in input)
  ) {
    throw new SalesMasteryProjectionError(
      "CALLER_TENANT_FORBIDDEN",
      "Caller-selected tenant or organization override is forbidden.",
    );
  }
}

function validatedIdentity(input: unknown): CompanyIdentityClaims {
  const parsed = verifiedCompanyIdentityClaimsSchema.safeParse(input);
  if (
    !parsed.success ||
    parsed.data.aud !== SALES_APPLICATION_KEY ||
    parsed.data.organizationKey !== SALES_ORGANIZATION_KEY ||
    !parsed.data.roles.some((role) => SALES_ROLE_KEYS.has(role))
  ) {
    throw new SalesMasteryProjectionError(
      "COMPANY_IDENTITY_FORBIDDEN",
      "Company Identity authorization is required for Sales Mastery.",
    );
  }
  return parsed.data;
}

function trustedIdentityFromLegacy(
  identity: CompanyIdentityClaims,
): VerifiedSalesIdentity {
  return {
    issuer: identity.iss,
    expiresAt: new Date(identity.exp * 1000).toISOString(),
    organizationId: identity.organizationId,
    organizationKey: SALES_ORGANIZATION_KEY,
    principalId: salesPrincipalLocalId(identity.sub),
  };
}

function rawIdentityInput(input: unknown): unknown {
  if (!isRecord(input) || !("identity" in input)) {
    throw new SalesMasteryProjectionError(
      "COMPANY_IDENTITY_FORBIDDEN",
      "Verified Company Identity claims are required.",
    );
  }
  return input.identity;
}

function parseLegacyTenantInput(input: unknown): VerifiedSalesIdentity {
  rejectCallerTenant(input, true);
  const parsed = legacyTenantResolutionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "COMPANY_IDENTITY_FORBIDDEN",
      "Company Identity claims failed validation.",
    );
  }
  return trustedIdentityFromLegacy(validatedIdentity(parsed.data.identity));
}

function parseLegacyProjectionInput(input: unknown): TrustedProjectionInput {
  rejectCallerTenant(input, true);
  const parsed = legacyProjectionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "Sales Mastery projection input failed validation.",
    );
  }
  const identity = validatedIdentity(parsed.data.identity);
  if (parsed.data.principalId !== salesPrincipalLocalId(identity.sub)) {
    throw new SalesMasteryProjectionError(
      "TENANT_SCOPE_ERROR",
      "The learner principal is outside the verified organization scope.",
    );
  }
  if (parsed.data.graphRelease !== SALES_MASTERY_GRAPH_RELEASE) {
    throw new SalesMasteryProjectionError(
      "PROVENANCE_CONFLICT",
      "The Sales graph release is not admitted.",
    );
  }
  if (parsed.data.bindingsDigest !== SALES_MASTERY_BINDINGS_DIGEST) {
    throw new SalesMasteryProjectionError(
      "PROVENANCE_CONFLICT",
      "The Sales curriculum bindings digest is not admitted.",
    );
  }
  validateProjectionPayload(parsed.data.payload, true);
  return {
    ...parsed.data,
    identity: trustedIdentityFromLegacy(identity),
    legacyMode: true,
  };
}

function parseLegacyReadInput(input: unknown): {
  readonly identity: VerifiedSalesIdentity;
  readonly principalId: string;
} {
  rejectCallerTenant(input, true);
  const parsed = legacyEvidenceReadInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "Sales Mastery evidence read failed validation.",
    );
  }
  const identity = validatedIdentity(parsed.data.identity);
  if (parsed.data.principalId !== salesPrincipalLocalId(identity.sub)) {
    throw new SalesMasteryProjectionError(
      "TENANT_SCOPE_ERROR",
      "The learner principal is outside the verified organization scope.",
    );
  }
  return {
    identity: trustedIdentityFromLegacy(identity),
    principalId: parsed.data.principalId,
  };
}

function parseLegacyRetryInput(input: unknown): {
  readonly identity: VerifiedSalesIdentity;
  readonly sourceAttemptId: string;
} {
  rejectCallerTenant(input, true);
  const parsed = legacyRetryInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "Sales Mastery retry input failed validation.",
    );
  }
  return {
    identity: trustedIdentityFromLegacy(
      validatedIdentity(parsed.data.identity),
    ),
    sourceAttemptId: parsed.data.sourceAttemptId,
  };
}

async function parseTenantInput(
  input: unknown,
  verifier: CompanyIdentityVerificationPort,
): Promise<VerifiedSalesIdentity> {
  const identity = await verifyCompanyIdentity(
    rawIdentityInput(input),
    verifier,
  );
  rejectCallerTenant(input);
  const parsed = salesMasteryTenantResolutionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "COMPANY_IDENTITY_FORBIDDEN",
      "Company Identity claims failed validation.",
    );
  }
  return identity;
}

async function parseProjectionInput(
  input: unknown,
  verifier: CompanyIdentityVerificationPort,
): Promise<TrustedProjectionInput> {
  const identity = await verifyCompanyIdentity(
    rawIdentityInput(input),
    verifier,
  );
  rejectCallerTenant(input);
  const parsed = salesMasteryProjectionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "Sales Mastery projection input failed validation.",
    );
  }
  const parsedData = parsed.data;
  if (parsedData.graphRelease !== SALES_MASTERY_GRAPH_RELEASE) {
    throw new SalesMasteryProjectionError(
      "PROVENANCE_CONFLICT",
      "The Sales graph release is not admitted.",
    );
  }
  if (parsedData.bindingsDigest !== SALES_MASTERY_BINDINGS_DIGEST) {
    throw new SalesMasteryProjectionError(
      "PROVENANCE_CONFLICT",
      "The Sales curriculum bindings digest is not admitted.",
    );
  }
  validateProjectionPayload(parsedData.payload);
  const { identity: _ignoredIdentity, ...request } = parsedData;
  return {
    ...request,
    identity,
    principalId: identity.principalId,
    legacyMode: false,
  };
}

async function parseReadInput(
  input: unknown,
  verifier: CompanyIdentityVerificationPort,
): Promise<{
  readonly identity: VerifiedSalesIdentity;
  readonly principalId: string;
}> {
  const identity = await verifyCompanyIdentity(
    rawIdentityInput(input),
    verifier,
  );
  rejectCallerTenant(input);
  const parsed = salesMasteryEvidenceReadInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "Sales Mastery evidence read failed validation.",
    );
  }
  return { identity, principalId: identity.principalId };
}

async function parseRetryInput(
  input: unknown,
  verifier: CompanyIdentityVerificationPort,
): Promise<{
  readonly identity: VerifiedSalesIdentity;
  readonly sourceAttemptId: string;
}> {
  const identity = await verifyCompanyIdentity(
    rawIdentityInput(input),
    verifier,
  );
  rejectCallerTenant(input);
  const parsed = salesMasteryRetryInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "Sales Mastery retry input failed validation.",
    );
  }
  return {
    identity,
    sourceAttemptId: parsed.data.sourceAttemptId,
  };
}

function parsePayload(payload: Record<string, unknown>): ParsedPayload {
  const parsed = projectionPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "Sales evidence payload failed validation.",
    );
  }
  return {
    objectiveId: parsed.data.objectiveId as string,
    variantKey: parsed.data.variantKey as string,
    rubricVersion: parsed.data.rubricVersion as string,
    score: parsed.data.score as number,
  };
}

function bindingFromRow(row: MappingRow): SalesMasteryTenantBinding {
  if (
    row.applicationKey !== "sales" ||
    row.masteryTenantKey === CODECAMP_MASTERY_TENANT_KEY ||
    row.sourceTenantKey !== `sales:${row.organizationId}`
  ) {
    throw new SalesMasteryProjectionError(
      "TENANT_SCOPE_ERROR",
      "The Sales Mastery tenant mapping is invalid.",
    );
  }
  return {
    applicationKey: "sales",
    organizationId: row.organizationId,
    organizationKey: row.organizationKey,
    masteryTenantKey: row.masteryTenantKey,
    sourceTenantKey: row.sourceTenantKey,
  };
}

function bindingKey(identity: VerifiedSalesIdentity): string {
  return `${identity.organizationId}\u0000${identity.organizationKey}`;
}

function projectionIdentity(
  input: TrustedProjectionInput,
): Record<string, unknown> {
  return {
    applicationKey: "sales",
    organizationId: input.identity.organizationId,
    organizationKey: input.identity.organizationKey,
    principalId: input.principalId,
    sourceApplication: input.sourceApplication,
    sourceAttemptId: input.sourceAttemptId,
    idempotencyKey: input.idempotencyKey,
    graphRelease: input.graphRelease,
    bindingsDigest: input.bindingsDigest,
    payload: input.payload,
  };
}

function payloadDigest(input: TrustedProjectionInput): string {
  return digest(projectionIdentity(input));
}

function rowPayload(row: OutboxRow): ParsedPayload {
  const parsed = projectionPayloadSchema.safeParse(row.payloadJson);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "The durable Sales evidence payload failed validation.",
    );
  }
  return parsed.data;
}

function outboxReceipt(
  outboxId: string,
  commitId: string,
  status: "applied" | "replayed",
): SalesMasteryProjectionReceipt {
  return { status, commitId, outboxId };
}

function receiptFromRow(
  row: ReceiptRow,
  outboxId: string,
): SalesMasteryProjectionReceipt {
  if (
    !z.string().uuid().safeParse(row.id).success ||
    !z.string().uuid().safeParse(row.commitId).success ||
    !z.string().uuid().safeParse(outboxId).success
  ) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "The Sales Mastery receipt identifiers are invalid.",
    );
  }
  return outboxReceipt(outboxId, row.commitId, "replayed");
}

function hasDatabaseMethods(value: unknown): value is SalesDatabase {
  if (!isRecord(value)) return false;
  return ["select", "insert", "transaction"].every(
    (method) => typeof value[method] === "function",
  );
}

function rawDatabase(value: unknown): SalesDatabase | null {
  if (!hasDatabaseMethods(value)) return null;
  if ("unscoped" in value && typeof value.unscoped === "function") {
    return value.unscoped(
      "Sales Mastery company tables require explicit organization and learner predicates",
    ) as SalesDatabase;
  }
  return value;
}

function mappingNamespace(identity: VerifiedSalesIdentity): string {
  const namespace = uuidFromDigest(
    digest(`sales-mastery:${identity.organizationId}`),
  );
  if (namespace === CODECAMP_MASTERY_TENANT_KEY) {
    throw new SalesMasteryProjectionError(
      "CODECAMP_NAMESPACE_FORBIDDEN",
      "The Sales organization resolves to the reserved Codecamp namespace.",
    );
  }
  return namespace;
}

function mappingRequestId(identity: VerifiedSalesIdentity): string {
  return `sales-mastery-tenant:${identity.organizationId}`;
}

function mappingName(identity: VerifiedSalesIdentity): string {
  return `Sales Mastery tenant ${identity.organizationKey}`;
}

function masteryCommand(
  input: TrustedProjectionInput,
  binding: SalesMasteryTenantBinding,
  snapshot: MasterySnapshot,
  now: string,
): CommitMasteryEvidenceInput {
  const payload = parsePayload(input.payload);
  const priorCard = snapshot.cards.find(
    (card) =>
      card.studentId === input.principalId &&
      card.objectiveId === payload.objectiveId &&
      card.variantKey === payload.variantKey,
  );
  const priorState = snapshot.states.find(
    (state) =>
      state.studentId === input.principalId &&
      state.objectiveId === payload.objectiveId,
  );
  const provenance = {
    normativeSpecVersion: "kst-srs.v3.2",
    engineContractVersion: "srs.contract.v2",
    graphRelease: input.graphRelease,
    configVersion: "sales-mastery.v1",
    paramsVersion: "fsrs-default.v1",
    adapterVersion: "mastery.persistence.v1" as const,
  };
  const cardId =
    priorCard?.id ??
    uuidFromDigest(
      digest(
        `${binding.masteryTenantKey}:${input.principalId}:${payload.objectiveId}:${payload.variantKey}:card`,
      ),
    );
  const stateId =
    priorState?.id ??
    uuidFromDigest(
      digest(
        `${binding.masteryTenantKey}:${input.principalId}:${payload.objectiveId}:state`,
      ),
    );
  const cardRevision = priorCard ? priorCard.revision + 1 : 0;
  const stateRevision = priorState ? priorState.revision + 1 : 0;
  const sourceId = input.sourceAttemptId;
  const recordDigest = digest(
    `${binding.masteryTenantKey}:${input.idempotencyKey}`,
  );
  const beforeState = priorCard?.state ?? "new";
  const masteryState =
    payload.score >= 0.9
      ? "mastered"
      : payload.score >= 0.75
        ? "proficient"
        : "practicing";
  return {
    contractVersion: "mastery.persistence.v1",
    schoolId: binding.masteryTenantKey,
    studentId: input.principalId,
    idempotencyKey: input.idempotencyKey,
    expectedRevisions: {
      card: priorCard?.revision ?? null,
      state: priorState?.revision ?? null,
    },
    provenance,
    audit: {
      actorId: input.principalId,
      requestId: `sales-mastery:${input.idempotencyKey}`,
      sourceId,
      correlationId: `sales:${input.identity.organizationId}:${sourceId}`,
    },
    records: {
      card: {
        id: cardId,
        schoolId: binding.masteryTenantKey,
        studentId: input.principalId,
        objectiveId: payload.objectiveId,
        variantKey: payload.variantKey,
        state: "review",
        stability: priorCard?.stability ?? 1,
        difficulty: priorCard?.difficulty ?? 5,
        dueAt: now,
        lastReviewedAt: now,
        reps: (priorCard?.reps ?? 0) + 1,
        lapses: priorCard?.lapses ?? 0,
        revision: cardRevision,
        paramsVersion: provenance.paramsVersion,
        createdAt: priorCard?.createdAt ?? now,
        updatedAt: now,
      },
      review: {
        id: uuidFromDigest(`${recordDigest}:review`),
        schoolId: binding.masteryTenantKey,
        cardId,
        studentId: input.principalId,
        submissionId: sourceId,
        rating: payload.score >= 0.75 ? "good" : "again",
        beforeState,
        afterState: "review",
        evidenceReasons: ["sales-validated-attempt", payload.rubricVersion],
        paramsVersion: provenance.paramsVersion,
        reviewedAt: now,
        createdAt: now,
      },
      evidence: [
        {
          id: uuidFromDigest(`${recordDigest}:evidence`),
          schoolId: binding.masteryTenantKey,
          studentId: input.principalId,
          objectiveId: payload.objectiveId,
          variantKey: payload.variantKey,
          sourceId,
          evidenceOrdinal: 0,
          evidenceType: "sales_practice.v1",
          correctedStrength: payload.score,
          practiceCoverage: 1,
          confidence: payload.score,
          attemptCount: 1,
          supportMetadata: { revealSteps: 0, misconceptionTags: [] },
          provenance,
          createdAt: now,
        },
      ],
      state: {
        id: stateId,
        schoolId: binding.masteryTenantKey,
        studentId: input.principalId,
        objectiveId: payload.objectiveId,
        masteryState,
        mastery: payload.score,
        retention: payload.score,
        evidenceConfidence: payload.score,
        graphRelease: input.graphRelease,
        revision: stateRevision,
        createdAt: priorState?.createdAt ?? now,
        updatedAt: now,
      },
      placement: {
        id: uuidFromDigest(`${recordDigest}:placement`),
        schoolId: binding.masteryTenantKey,
        studentId: input.principalId,
        objectiveId: payload.objectiveId,
        estimate: payload.score,
        confidence:
          payload.score >= 0.8
            ? "high"
            : payload.score >= 0.5
              ? "medium"
              : "low",
        evidenceType: `sales:${sourceId}`,
        graphRelease: input.graphRelease,
        seedProvenance: provenance,
        replacedByDirectEvidence: true,
        createdAt: now,
      },
    },
  };
}

class SalesMasteryProjectionAdapter implements SalesMasteryProjection {
  private readonly database: SalesDatabase | null;
  private readonly mode: "legacy" | "trusted";
  private readonly mastery?: MasteryPersistencePort;
  private readonly companyIdentity?: CompanyIdentityVerificationPort;
  private readonly masteryFactory?: SalesPersistenceFactory;
  private readonly mappings = new Map<string, SalesMasteryTenantBinding>();
  private readonly outbox = new Map<string, MemoryOutbox>();
  private readonly mappingLocks = new Map<
    string,
    Promise<SalesMasteryTenantBinding>
  >();
  private readonly projectionLocks = new Map<
    string,
    Promise<SalesMasteryProjectionReceipt>
  >();
  private readonly identityLocks = new Map<string, Promise<void>>();

  /** Creates a Sales Mastery adapter over a durable database or test double. */
  constructor(
    dbInput: unknown,
    dependencies:
      | {
          readonly mode: "legacy";
          readonly mastery: MasteryPersistencePort;
        }
      | {
          readonly mode: "trusted";
          readonly companyIdentity: CompanyIdentityVerificationPort;
          readonly masteryFactory: SalesPersistenceFactory;
        },
  ) {
    let database: SalesDatabase | null;
    try {
      database = rawDatabase(dbInput);
    } catch (error) {
      providerFailure(error);
    }
    this.database = database!;
    this.mode = dependencies.mode;
    if (dependencies.mode === "legacy") {
      this.mastery = dependencies.mastery;
    } else {
      this.companyIdentity = dependencies.companyIdentity;
      this.masteryFactory = dependencies.masteryFactory;
    }
    if (
      dbInput !== undefined &&
      dbInput !== null &&
      !this.database &&
      isRecord(dbInput) &&
      Object.keys(dbInput).length > 0
    ) {
      throw new SalesMasteryProjectionError(
        "PERSISTENCE_UNAVAILABLE",
        "Sales Mastery requires a complete database adapter.",
        true,
      );
    }
  }

  /** Resolves one verified organization to one isolated Mastery namespace. */
  async resolveTenant(input: unknown): Promise<SalesMasteryTenantBinding> {
    const identity =
      this.mode === "legacy"
        ? parseLegacyTenantInput(input)
        : await parseTenantInput(input, this.companyIdentity!);
    return this.resolveTrustedTenant(identity);
  }

  /** Resolves one verifier-owned identity without reinterpreting caller input. */
  private async resolveTrustedTenant(
    identity: VerifiedSalesIdentity,
  ): Promise<SalesMasteryTenantBinding> {
    const key = bindingKey(identity);
    const existingLock = this.mappingLocks.get(key);
    if (existingLock) return existingLock;
    const current = this.resolveTenantOnce(identity);
    this.mappingLocks.set(key, current);
    try {
      return await current;
    } finally {
      if (this.mappingLocks.get(key) === current) this.mappingLocks.delete(key);
    }
  }

  private async resolveTenantOnce(
    identity: VerifiedSalesIdentity,
  ): Promise<SalesMasteryTenantBinding> {
    if (!this.database) {
      const key = bindingKey(identity);
      const current = this.mappings.get(key);
      if (current) return current;
      const binding: SalesMasteryTenantBinding = {
        applicationKey: "sales",
        organizationId: identity.organizationId,
        organizationKey: identity.organizationKey,
        masteryTenantKey: mappingNamespace(identity),
        sourceTenantKey: `sales:${identity.organizationId}`,
      };
      this.mappings.set(key, binding);
      return binding;
    }

    try {
      return await this.database.transaction(
        async (transaction) => {
          const existing = await transaction
            .select()
            .from(salesMasteryTenantMappings)
            .where(
              and(
                eq(salesMasteryTenantMappings.applicationKey, "sales"),
                eq(
                  salesMasteryTenantMappings.organizationId,
                  identity.organizationId,
                ),
              ),
            )
            .limit(2);
          if (existing.length > 1) {
            throw new SalesMasteryProjectionError(
              "TENANT_SCOPE_ERROR",
              "The Sales organization has multiple tenant mappings.",
            );
          }
          const first = existing[0];
          if (first) {
            if (first.organizationKey !== identity.organizationKey) {
              throw new SalesMasteryProjectionError(
                "TENANT_SCOPE_ERROR",
                "The verified organization key does not match its mapping.",
              );
            }
            return bindingFromRow(first);
          }

          const masteryTenantKey = mappingNamespace(identity);
          await transaction
            .insert(schools)
            .values({ id: masteryTenantKey, name: mappingName(identity) })
            .onConflictDoNothing();
          await transaction
            .insert(salesMasteryTenantMappings)
            .values({
              applicationKey: "sales",
              organizationId: identity.organizationId,
              organizationKey: identity.organizationKey,
              masteryTenantKey,
              sourceTenantKey: `sales:${identity.organizationId}`,
              provisionedBy: "company-identity",
              requestId: mappingRequestId(identity),
            })
            .onConflictDoNothing();
          const [created] = await transaction
            .select()
            .from(salesMasteryTenantMappings)
            .where(
              and(
                eq(salesMasteryTenantMappings.applicationKey, "sales"),
                eq(
                  salesMasteryTenantMappings.organizationId,
                  identity.organizationId,
                ),
              ),
            )
            .limit(1);
          if (!created) {
            throw new SalesMasteryProjectionError(
              "TENANT_SCOPE_ERROR",
              "The Sales organization mapping could not be established.",
            );
          }
          return bindingFromRow(created);
        },
        { isolationLevel: "serializable" },
      );
    } catch (error) {
      return providerFailure(error);
    }
  }

  /** Projects one validated Sales attempt and records an immutable outbox receipt. */
  async project(
    input: unknown,
    options: { readonly failDelivery?: boolean } = {},
  ): Promise<SalesMasteryProjectionReceipt> {
    const parsed =
      this.mode === "legacy"
        ? parseLegacyProjectionInput(input)
        : await parseProjectionInput(input, this.companyIdentity!);
    return this.projectTrusted(parsed, options);
  }

  /** Projects one verifier-owned request through the serialized identity boundary. */
  private async projectTrusted(
    parsed: TrustedProjectionInput,
    options: { readonly failDelivery?: boolean },
  ): Promise<SalesMasteryProjectionReceipt> {
    const key = `${parsed.identity.organizationId}\u0000${parsed.idempotencyKey}`;
    const previous = this.projectionLocks.get(key);
    const next = (previous ?? Promise.resolve(undefined)).then(() =>
      this.withIdentityLocks(parsed, () => this.projectOnce(parsed, options)),
    );
    this.projectionLocks.set(key, next);
    try {
      return await next;
    } finally {
      if (this.projectionLocks.get(key) === next)
        this.projectionLocks.delete(key);
    }
  }

  private async projectOnce(
    input: TrustedProjectionInput,
    options: { readonly failDelivery?: boolean },
  ): Promise<SalesMasteryProjectionReceipt> {
    const requestDigest = payloadDigest(input);
    if (!this.database) {
      const binding = await this.resolveTrustedTenant(input.identity);
      const memoryKey = `${binding.masteryTenantKey}\u0000${input.idempotencyKey}`;
      const identityConflict = [...this.outbox.values()].find(
        (row) =>
          row.input.sourceAttemptId === input.sourceAttemptId ||
          row.input.idempotencyKey === input.idempotencyKey,
      );
      if (
        identityConflict &&
        identityConflict.binding.organizationId !== binding.organizationId
      ) {
        throw new SalesMasteryProjectionError(
          "TENANT_SCOPE_ERROR",
          "The Sales source identity belongs to another organization.",
        );
      }
      if (
        identityConflict &&
        identityConflict.payloadDigest !== requestDigest
      ) {
        throw new MasteryPersistenceError(
          "IDEMPOTENCY_CONFLICT",
          "The Sales identity is already bound to different evidence.",
        );
      }
      const existing = this.outbox.get(memoryKey);
      if (existing) {
        if (existing.payloadDigest !== requestDigest) {
          throw new MasteryPersistenceError(
            "IDEMPOTENCY_CONFLICT",
            "The idempotency key is already bound to different Sales evidence.",
          );
        }
        if (existing.receipt) {
          return { ...existing.receipt, status: "replayed" };
        }
        if (options.failDelivery) {
          throw new MasteryPersistenceError(
            "PERSISTENCE_UNAVAILABLE",
            "Sales Mastery delivery is retryable.",
            { retryable: true },
          );
        }
        return this.deliverMemory(
          existing,
          memoryKey,
          this.createMastery(binding, input.principalId),
        );
      }
      const outbox: MemoryOutbox = {
        id: uuidFromDigest(`sales-outbox:${requestDigest}`),
        input: structuredClone(input),
        binding,
        payloadDigest: requestDigest,
      };
      this.outbox.set(memoryKey, outbox);
      if (options.failDelivery) {
        throw new MasteryPersistenceError(
          "PERSISTENCE_UNAVAILABLE",
          "Sales Mastery delivery is retryable.",
          { retryable: true },
        );
      }
      return this.deliverMemory(
        outbox,
        memoryKey,
        this.createMastery(binding, input.principalId),
      );
    }

    const { binding, outbox } = await this.ensureBindingAndOutbox(
      input,
      requestDigest,
    );
    const receipt = await this.findReceipt(outbox.id);
    if (receipt) return { ...receipt, status: "replayed" };
    if (options.failDelivery) {
      throw new MasteryPersistenceError(
        "PERSISTENCE_UNAVAILABLE",
        "Sales Mastery delivery is retryable.",
        { retryable: true },
      );
    }
    return this.deliverDatabase(input, binding, outbox, requestDigest);
  }

  /** Creates one scoped Mastery port from the injected factory. */
  private createMastery(
    binding: SalesMasteryTenantBinding,
    actorId: string,
  ): MasteryPersistencePort {
    if (this.mode === "legacy") return this.mastery!;
    try {
      return this.masteryFactory!.create({
        tenant: { schoolId: binding.masteryTenantKey },
        sourceTenantKey: binding.sourceTenantKey,
        actorId,
      });
    } catch (error) {
      return providerFailure(error);
    }
  }

  /** Serializes in-memory projections that share either source identity. */
  private async withIdentityLocks<T>(
    input: TrustedProjectionInput,
    operation: () => Promise<T>,
  ): Promise<T> {
    const keys = [
      `attempt:${input.sourceAttemptId}`,
      `idempotency:${input.idempotencyKey}`,
    ].sort();
    const previous = keys.map(
      (key) => this.identityLocks.get(key) ?? Promise.resolve(),
    );
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    for (const key of keys) this.identityLocks.set(key, current);
    await Promise.all(previous);
    try {
      return await operation();
    } finally {
      release();
      for (const key of keys) {
        if (this.identityLocks.get(key) === current) {
          this.identityLocks.delete(key);
        }
      }
    }
  }

  private async deliverMemory(
    outbox: MemoryOutbox,
    memoryKey: string,
    mastery: MasteryPersistencePort,
  ): Promise<SalesMasteryProjectionReceipt> {
    try {
      const now = new Date().toISOString();
      const snapshot = await mastery.readSnapshot({
        schoolId: outbox.binding.masteryTenantKey,
      });
      const result = parseMasteryResult(
        await mastery.commitMasteryEvidence(
          masteryCommand(outbox.input, outbox.binding, snapshot, now),
        ),
      );
      const receipt = outboxReceipt(outbox.id, result.commitId, "applied");
      this.outbox.set(memoryKey, { ...outbox, receipt });
      return receipt;
    } catch (error) {
      return providerFailure(error);
    }
  }

  private async ensureBindingAndOutbox(
    input: TrustedProjectionInput,
    requestDigest: string,
  ): Promise<{
    readonly binding: SalesMasteryTenantBinding;
    readonly outbox: OutboxRow;
  }> {
    if (!this.database) throw new Error("Durable database is unavailable");
    const rubricVersion = parsePayload(input.payload).rubricVersion;
    const id = uuidFromDigest(`sales-outbox:${requestDigest}`);
    try {
      return await this.database.transaction(async (transaction) => {
        const [existingMapping] = await transaction
          .select()
          .from(salesMasteryTenantMappings)
          .where(
            and(
              eq(
                salesMasteryTenantMappings.applicationKey,
                SALES_APPLICATION_KEY,
              ),
              eq(
                salesMasteryTenantMappings.organizationId,
                input.identity.organizationId,
              ),
            ),
          )
          .limit(2);
        let binding: SalesMasteryTenantBinding;
        if (existingMapping) {
          if (
            existingMapping.organizationKey !== input.identity.organizationKey
          ) {
            throw new SalesMasteryProjectionError(
              "TENANT_SCOPE_ERROR",
              "The verified organization key does not match its mapping.",
            );
          }
          binding = bindingFromRow(existingMapping);
        } else {
          const masteryTenantKey = mappingNamespace(input.identity);
          await transaction
            .insert(schools)
            .values({
              id: masteryTenantKey,
              name: mappingName(input.identity),
            })
            .onConflictDoNothing();
          await transaction
            .insert(salesMasteryTenantMappings)
            .values({
              applicationKey: SALES_APPLICATION_KEY,
              organizationId: input.identity.organizationId,
              organizationKey: input.identity.organizationKey,
              masteryTenantKey,
              sourceTenantKey: `sales:${input.identity.organizationId}`,
              provisionedBy: "company-identity",
              requestId: mappingRequestId(input.identity),
            })
            .onConflictDoNothing();
          const [createdMapping] = await transaction
            .select()
            .from(salesMasteryTenantMappings)
            .where(
              and(
                eq(
                  salesMasteryTenantMappings.applicationKey,
                  SALES_APPLICATION_KEY,
                ),
                eq(
                  salesMasteryTenantMappings.organizationId,
                  input.identity.organizationId,
                ),
              ),
            )
            .limit(1);
          if (!createdMapping) {
            throw new SalesMasteryProjectionError(
              "TENANT_SCOPE_ERROR",
              "The Sales organization mapping could not be established.",
            );
          }
          binding = bindingFromRow(createdMapping);
        }

        const existingIdentities = await transaction
          .select()
          .from(salesMasteryProjectionOutbox)
          .where(
            eq(
              salesMasteryProjectionOutbox.sourceAttemptId,
              input.sourceAttemptId,
            ),
          )
          .limit(2);
        const [existingIdempotency] = await transaction
          .select()
          .from(salesMasteryProjectionOutbox)
          .where(
            eq(
              salesMasteryProjectionOutbox.idempotencyKey,
              input.idempotencyKey,
            ),
          )
          .limit(1);
        const identityRows = [
          ...existingIdentities,
          ...(existingIdempotency == null ? [] : [existingIdempotency]),
        ];
        for (const existingIdentity of identityRows) {
          if (
            existingIdentity.organizationId !== binding.organizationId ||
            existingIdentity.masteryTenantKey !== binding.masteryTenantKey
          ) {
            throw new SalesMasteryProjectionError(
              "TENANT_SCOPE_ERROR",
              "The Sales source identity belongs to another organization.",
            );
          }
          if (existingIdentity.payloadDigest !== requestDigest) {
            throw new MasteryPersistenceError(
              "IDEMPOTENCY_CONFLICT",
              "The Sales identity is already bound to different evidence.",
            );
          }
        }

        if (identityRows.length === 0) {
          await transaction
            .insert(salesMasteryProjectionOutbox)
            .values({
              id,
              applicationKey: SALES_APPLICATION_KEY,
              organizationId: binding.organizationId,
              organizationKey: binding.organizationKey,
              masteryTenantKey: binding.masteryTenantKey,
              sourceTenantKey: binding.sourceTenantKey,
              learnerPrincipalId: input.principalId,
              sourceApplication: input.sourceApplication,
              sourceAttemptId: input.sourceAttemptId,
              idempotencyKey: input.idempotencyKey,
              graphRelease: input.graphRelease,
              bindingsDigest: input.bindingsDigest,
              rubricVersion,
              requestId: `sales-mastery:${input.idempotencyKey}`,
              correlationId: `sales:${binding.organizationId}:${input.sourceAttemptId}`,
              payloadDigest: requestDigest,
              payloadJson: input.payload,
            })
            .onConflictDoNothing();
        }

        const [row] = await transaction
          .select()
          .from(salesMasteryProjectionOutbox)
          .where(
            and(
              eq(
                salesMasteryProjectionOutbox.organizationId,
                binding.organizationId,
              ),
              eq(
                salesMasteryProjectionOutbox.idempotencyKey,
                input.idempotencyKey,
              ),
            ),
          )
          .limit(1);
        if (!row || row.payloadDigest !== requestDigest) {
          throw new MasteryPersistenceError(
            "IDEMPOTENCY_CONFLICT",
            "The Sales projection identity is already bound to different evidence.",
          );
        }
        if (
          row.masteryTenantKey !== binding.masteryTenantKey ||
          row.organizationKey !== binding.organizationKey ||
          row.learnerPrincipalId !== input.principalId
        ) {
          throw new SalesMasteryProjectionError(
            "TENANT_SCOPE_ERROR",
            "The Sales projection is outside the verified organization scope.",
          );
        }
        return { binding, outbox: row };
      });
    } catch (error) {
      if (
        error instanceof MasteryPersistenceError ||
        error instanceof SalesMasteryProjectionError
      )
        throw error;
      return providerFailure(error);
    }
  }

  private async findReceipt(
    outboxId: string,
  ): Promise<SalesMasteryProjectionReceipt | null> {
    if (!this.database) return null;
    try {
      const [row] = await this.database
        .select()
        .from(salesMasteryProjectionReceipts)
        .where(eq(salesMasteryProjectionReceipts.outboxId, outboxId))
        .limit(1);
      return row ? receiptFromRow(row, outboxId) : null;
    } catch (error) {
      return providerFailure(error);
    }
  }

  private async deliverDatabase(
    input: TrustedProjectionInput,
    binding: SalesMasteryTenantBinding,
    outbox: OutboxRow,
    requestDigest: string,
  ): Promise<SalesMasteryProjectionReceipt> {
    if (!this.database) {
      throw new SalesMasteryProjectionError(
        "CONFIGURATION_ERROR",
        "Sales Mastery requires a durable database for durable projection.",
      );
    }
    try {
      const mastery = this.createMastery(binding, input.principalId);
      const snapshot = await mastery.readSnapshot({
        schoolId: binding.masteryTenantKey,
      });
      const result = parseMasteryResult(
        await mastery.commitMasteryEvidence(
          masteryCommand(input, binding, snapshot, new Date().toISOString()),
        ),
      );
      const inserted = await this.insertReceipt(
        outbox,
        input,
        result,
        requestDigest,
      );
      return inserted.receipt;
    } catch (error) {
      return providerFailure(error);
    }
  }

  private async insertReceipt(
    outbox: OutboxRow,
    input: TrustedProjectionInput,
    result: CommitMasteryEvidenceResult,
    requestDigest: string,
  ): Promise<ReceiptInsertResult> {
    if (!this.database) {
      throw new SalesMasteryProjectionError(
        "CONFIGURATION_ERROR",
        "Sales Mastery requires a durable database for receipt persistence.",
      );
    }
    let created = false;
    try {
      const inserted = await this.database
        .insert(salesMasteryProjectionReceipts)
        .values({
          id: uuidFromDigest(`sales-receipt:${requestDigest}`),
          outboxId: outbox.id,
          masteryTenantKey: outbox.masteryTenantKey,
          organizationId: outbox.organizationId,
          learnerPrincipalId: outbox.learnerPrincipalId,
          idempotencyKey: outbox.idempotencyKey,
          commitId: result.commitId,
          resultJson: result,
        })
        .onConflictDoNothing()
        .returning({ id: salesMasteryProjectionReceipts.id });
      created = inserted.length === 1;
    } catch (error) {
      return providerFailure(error);
    }
    const receipt = await this.findReceipt(outbox.id);
    if (!receipt) {
      throw new SalesMasteryProjectionError(
        "PERSISTENCE_UNAVAILABLE",
        "The Sales Mastery receipt was not durable.",
        true,
      );
    }
    return {
      created,
      receipt: {
        ...receipt,
        status: created ? "applied" : "replayed",
      },
    };
  }

  /** Reads organization- and learner-owned Sales projection payloads. */
  async readEvidence(
    input: unknown,
  ): Promise<readonly Record<string, unknown>[]> {
    const parsed =
      this.mode === "legacy"
        ? parseLegacyReadInput(input)
        : await parseReadInput(input, this.companyIdentity!);
    const binding = await this.resolveTrustedTenant(parsed.identity);
    if (!this.database) {
      return [...this.outbox.values()]
        .filter(
          (row) =>
            row.binding.masteryTenantKey === binding.masteryTenantKey &&
            row.input.principalId === parsed.principalId &&
            row.receipt,
        )
        .map((row) => row.input.payload);
    }
    let rows: readonly OutboxRow[];
    try {
      rows = await this.database
        .select()
        .from(salesMasteryProjectionOutbox)
        .where(
          and(
            eq(salesMasteryProjectionOutbox.applicationKey, "sales"),
            eq(
              salesMasteryProjectionOutbox.organizationId,
              binding.organizationId,
            ),
            eq(
              salesMasteryProjectionOutbox.masteryTenantKey,
              binding.masteryTenantKey,
            ),
            eq(
              salesMasteryProjectionOutbox.learnerPrincipalId,
              parsed.principalId,
            ),
          ),
        );
    } catch (error) {
      return providerFailure(error);
    }
    const completed = await Promise.all(
      rows.map(async (row) =>
        (await this.findReceipt(row.id)) ? rowPayload(row) : null,
      ),
    );
    return completed
      .filter((row): row is ParsedPayload => row !== null)
      .map((row) => row as Record<string, unknown>);
  }

  /** Retries one pending outbox intent with the verified organization binding. */
  async retryPending(input: unknown): Promise<SalesMasteryProjectionReceipt> {
    const parsed =
      this.mode === "legacy"
        ? parseLegacyRetryInput(input)
        : await parseRetryInput(input, this.companyIdentity!);
    const binding = await this.resolveTrustedTenant(parsed.identity);
    if (!this.database) {
      const pending = [...this.outbox.values()].find(
        (row) =>
          row.binding.masteryTenantKey === binding.masteryTenantKey &&
          row.input.sourceAttemptId === parsed.sourceAttemptId,
      );
      if (!pending) {
        throw new SalesMasteryProjectionError(
          "TENANT_SCOPE_ERROR",
          "The pending Sales projection is outside the verified organization scope.",
        );
      }
      if (pending.input.principalId !== parsed.identity.principalId) {
        throw new SalesMasteryProjectionError(
          "TENANT_SCOPE_ERROR",
          "The pending Sales projection belongs to another learner.",
        );
      }
      return this.projectTrusted(pending.input, {});
    }
    let row: OutboxRow | undefined;
    try {
      [row] = await this.database
        .select()
        .from(salesMasteryProjectionOutbox)
        .where(
          and(
            eq(
              salesMasteryProjectionOutbox.organizationId,
              binding.organizationId,
            ),
            eq(
              salesMasteryProjectionOutbox.masteryTenantKey,
              binding.masteryTenantKey,
            ),
            eq(
              salesMasteryProjectionOutbox.sourceAttemptId,
              parsed.sourceAttemptId,
            ),
          ),
        )
        .limit(1);
    } catch (error) {
      return providerFailure(error);
    }
    if (!row) {
      throw new SalesMasteryProjectionError(
        "TENANT_SCOPE_ERROR",
        "The pending Sales projection is outside the verified organization scope.",
      );
    }
    if (
      row.learnerPrincipalId !== parsed.identity.principalId ||
      row.sourceApplication !== "sales-advantage" ||
      row.graphRelease !== SALES_MASTERY_GRAPH_RELEASE ||
      row.bindingsDigest !== SALES_MASTERY_BINDINGS_DIGEST
    ) {
      throw new SalesMasteryProjectionError(
        "TENANT_SCOPE_ERROR",
        "The pending Sales projection is outside the verified organization scope.",
      );
    }
    const receipt = await this.findReceipt(row.id);
    if (receipt) return receipt;
    const payload = rowPayload(row);
    validateProjectionPayload(payload, this.mode === "legacy");
    const retryInput: TrustedProjectionInput = {
      identity: parsed.identity,
      principalId: row.learnerPrincipalId,
      sourceAttemptId: row.sourceAttemptId,
      idempotencyKey: row.idempotencyKey,
      sourceApplication: "sales-advantage",
      graphRelease: row.graphRelease,
      bindingsDigest: row.bindingsDigest,
      payload,
      legacyMode: this.mode === "legacy",
    };
    return this.projectTrusted(retryInput, {});
  }
}

function parseMasteryResult(
  value: CommitMasteryEvidenceResult,
): CommitMasteryEvidenceResult {
  const parsed = commitMasteryEvidenceResultSchema.safeParse(value);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "The Mastery adapter returned an invalid commit receipt.",
    );
  }
  return parsed.data;
}

/** Trusted constructor options for the scoped Review A contract. */
export interface ScopedSalesMasteryProjectionOptions {
  /** Database adapter used for durable mapping and outbox records. */
  readonly database: unknown;
  /** Injected Company Identity verifier. */
  readonly companyIdentity: CompanyIdentityVerificationPort;
  /** Injected scoped Mastery persistence factory. */
  readonly masteryFactory: SalesPersistenceFactory;
}

/** Creates the fail-closed Sales tenant mapping and projection adapter. */
export function createSalesMasteryProjection(
  options: ScopedSalesMasteryProjectionOptions,
): SalesMasteryProjection {
  if (!isRecord(options)) {
    throw new SalesMasteryProjectionError(
      "CONFIGURATION_ERROR",
      "Sales Mastery constructor options are invalid.",
    );
  }

  if (
    hasExactKeys(options, ["companyIdentity", "database", "masteryFactory"]) &&
    isRecord(options.companyIdentity) &&
    typeof options.companyIdentity.verify === "function" &&
    isRecord(options.masteryFactory) &&
    typeof options.masteryFactory.create === "function"
  ) {
    return new SalesMasteryProjectionAdapter(options.database, {
      mode: "trusted",
      companyIdentity:
        options.companyIdentity as unknown as CompanyIdentityVerificationPort,
      masteryFactory:
        options.masteryFactory as unknown as SalesPersistenceFactory,
    });
  }

  throw new SalesMasteryProjectionError(
    "CONFIGURATION_ERROR",
    "Sales Mastery requires a Company Identity verifier and scoped Mastery factory.",
  );
}
