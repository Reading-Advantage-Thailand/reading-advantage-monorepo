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

/** Verified Company Identity claims required by the Sales projection boundary. */
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

/** The reviewed Sales graph release admitted by the shared runtime. */
export const SALES_MASTERY_GRAPH_RELEASE =
  "knowledge-space-sales-mastery-v1.0.0" as const;

/** The reviewed Sales curriculum-binding digest for the admitted graph. */
export const SALES_MASTERY_BINDINGS_DIGEST =
  "e8843314e2f381a44143acb08c6ff6596bdeac4e9da32fbdb9a5851c8ed32197" as const;

/** The reserved Mastery namespace owned by Codecamp. */
export const CODECAMP_MASTERY_TENANT_KEY =
  "c0deca00-0000-4000-8000-000000000001" as const;

const zRecord = () => z.record(z.unknown());
const zStringDigest = () => z.string().regex(/^[0-9a-f]{64}$/);
const nonBlankString = () => z.string().trim().min(1).max(500);
const literalSalesApplication = () => z.literal("sales-advantage");
const zStrictObject = z.strictObject;

/** Company Identity input accepted by the Sales Mastery tenant resolver. */
export const salesMasteryTenantResolutionInputSchema = z.strictObject({
  identity: verifiedCompanyIdentityClaimsSchema,
});

const projectionPayloadSchema = zRecord().superRefine((payload, context) => {
  const requiredStrings = ["objectiveId", "variantKey", "rubricVersion"];
  for (const key of requiredStrings) {
    if (typeof payload[key] !== "string" || payload[key].trim().length === 0) {
      context.addIssue({
        code: "custom",
        path: [key],
        message: `${key} is required`,
      });
    }
  }
  if (
    typeof payload.score !== "number" ||
    !Number.isFinite(payload.score) ||
    payload.score < 0 ||
    payload.score > 1
  ) {
    context.addIssue({
      code: "custom",
      path: ["score"],
      message: "score must be a finite number between 0 and 1",
    });
  }
});

/** Validated Sales Mastery projection command from one immutable attempt. */
export const salesMasteryProjectionInputSchema = zStrictObject({
  identity: verifiedCompanyIdentityClaimsSchema,
  principalId: nonBlankString(),
  sourceAttemptId: nonBlankString(),
  idempotencyKey: nonBlankString(),
  sourceApplication: literalSalesApplication(),
  graphRelease: nonBlankString(),
  bindingsDigest: zStringDigest(),
  payload: projectionPayloadSchema,
});

/** Validated organization-scoped Sales Mastery evidence read. */
export const salesMasteryEvidenceReadInputSchema = zStrictObject({
  identity: verifiedCompanyIdentityClaimsSchema,
  principalId: nonBlankString(),
});

/** Validated organization-scoped pending projection retry request. */
export const salesMasteryRetryInputSchema = zStrictObject({
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
    input: SalesMasteryProjectionInput,
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

type SalesDatabase = DB;
type MappingRow = typeof salesMasteryTenantMappings.$inferSelect;
type OutboxRow = typeof salesMasteryProjectionOutbox.$inferSelect;
type ReceiptRow = typeof salesMasteryProjectionReceipts.$inferSelect;

interface MemoryOutbox {
  readonly id: string;
  readonly input: SalesMasteryProjectionInput;
  readonly binding: SalesMasteryTenantBinding;
  readonly payloadDigest: string;
  readonly receipt?: SalesMasteryProjectionReceipt;
}

interface ParsedPayload {
  readonly objectiveId: string;
  readonly variantKey: string;
  readonly rubricVersion: string;
  readonly score: number;
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
  const hex = value.replace(/^sha256:/, "").padEnd(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(
    13,
    16,
  )}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
  if (error instanceof MasteryPersistenceError) throw error;
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

function validatedIdentity(input: unknown): CompanyIdentityClaims {
  const parsed = verifiedCompanyIdentityClaimsSchema.safeParse(input);
  if (!parsed.success || parsed.data.aud !== "sales") {
    throw new SalesMasteryProjectionError(
      "COMPANY_IDENTITY_FORBIDDEN",
      "Company Identity authorization is required for Sales Mastery.",
    );
  }
  return parsed.data;
}

function rejectCallerTenant(input: unknown): void {
  if (!isRecord(input)) return;
  if (input.targetTenantNamespace === "codecamp") {
    throw new SalesMasteryProjectionError(
      "CODECAMP_NAMESPACE_FORBIDDEN",
      "Codecamp namespace reuse is forbidden for Sales Mastery.",
    );
  }
  const forbidden = [
    "schoolId",
    "tenantKey",
    "masteryTenantKey",
    "targetTenantNamespace",
    "organizationId",
    "organizationKey",
  ];
  if (forbidden.some((key) => key in input)) {
    throw new SalesMasteryProjectionError(
      "CALLER_TENANT_FORBIDDEN",
      "Caller-selected tenant or organization override is forbidden.",
    );
  }
}

function parseTenantInput(input: unknown): CompanyIdentityClaims {
  rejectCallerTenant(input);
  if (!isRecord(input) || !("identity" in input)) {
    throw new SalesMasteryProjectionError(
      "COMPANY_IDENTITY_FORBIDDEN",
      "Verified Company Identity claims are required.",
    );
  }
  const parsed = salesMasteryTenantResolutionInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "COMPANY_IDENTITY_FORBIDDEN",
      "Company Identity claims failed validation.",
    );
  }
  return validatedIdentity(parsed.data.identity);
}

function parseProjectionInput(input: unknown): SalesMasteryProjectionInput {
  rejectCallerTenant(input);
  const parsed = salesMasteryProjectionInputSchema.safeParse(input);
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
  projectionPayloadSchema.parse(parsed.data.payload);
  return parsed.data;
}

function parseReadInput(input: unknown): {
  readonly identity: CompanyIdentityClaims;
  readonly principalId: string;
} {
  rejectCallerTenant(input);
  const parsed = salesMasteryEvidenceReadInputSchema.safeParse(input);
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
  return { identity, principalId: parsed.data.principalId };
}

function parseRetryInput(input: unknown): {
  readonly identity: CompanyIdentityClaims;
  readonly sourceAttemptId: string;
} {
  rejectCallerTenant(input);
  const parsed = salesMasteryRetryInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new SalesMasteryProjectionError(
      "VALIDATION_ERROR",
      "Sales Mastery retry input failed validation.",
    );
  }
  return {
    identity: validatedIdentity(parsed.data.identity),
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

function bindingKey(identity: CompanyIdentityClaims): string {
  return `${identity.organizationId}\u0000${identity.organizationKey}`;
}

function projectionIdentity(
  input: SalesMasteryProjectionInput,
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

function payloadDigest(input: SalesMasteryProjectionInput): string {
  return digest(projectionIdentity(input));
}

function rowPayload(row: OutboxRow): Record<string, unknown> {
  return isRecord(row.payloadJson) ? row.payloadJson : {};
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

function mappingNamespace(identity: CompanyIdentityClaims): string {
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

function mappingRequestId(identity: CompanyIdentityClaims): string {
  return `sales-mastery-tenant:${identity.organizationId}`;
}

function mappingName(identity: CompanyIdentityClaims): string {
  return `Sales Mastery tenant ${identity.organizationKey}`;
}

function masteryCommand(
  input: SalesMasteryProjectionInput,
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

  /** Creates a Sales Mastery adapter over a durable database or test double. */
  constructor(
    private readonly dbInput: unknown,
    private readonly mastery: MasteryPersistencePort,
  ) {
    this.database = rawDatabase(dbInput);
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
    const identity = parseTenantInput(input);
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
    identity: CompanyIdentityClaims,
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
    input: SalesMasteryProjectionInput,
    options: { readonly failDelivery?: boolean } = {},
  ): Promise<SalesMasteryProjectionReceipt> {
    const parsed = parseProjectionInput(input);
    const key = `${parsed.identity.organizationId}\u0000${parsed.idempotencyKey}`;
    const previous = this.projectionLocks.get(key);
    const next = (previous ?? Promise.resolve(undefined)).then(() =>
      this.projectOnce(parsed, options),
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
    input: SalesMasteryProjectionInput,
    options: { readonly failDelivery?: boolean },
  ): Promise<SalesMasteryProjectionReceipt> {
    const binding = await this.resolveTenant({ identity: input.identity });
    const requestDigest = payloadDigest(input);
    const memoryKey = `${binding.masteryTenantKey}\u0000${input.idempotencyKey}`;
    if (!this.database) {
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
        return this.deliverMemory(existing, memoryKey);
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
      return this.deliverMemory(outbox, memoryKey);
    }

    const outbox = await this.ensureOutbox(input, binding, requestDigest);
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

  private async deliverMemory(
    outbox: MemoryOutbox,
    memoryKey: string,
  ): Promise<SalesMasteryProjectionReceipt> {
    const now = new Date().toISOString();
    const snapshot = await this.mastery.readSnapshot({
      schoolId: outbox.binding.masteryTenantKey,
    });
    const result = parseMasteryResult(
      await this.mastery.commitMasteryEvidence(
        masteryCommand(outbox.input, outbox.binding, snapshot, now),
      ),
    );
    const receipt = outboxReceipt(outbox.id, result.commitId, "applied");
    this.outbox.set(memoryKey, { ...outbox, receipt });
    return receipt;
  }

  private async ensureOutbox(
    input: SalesMasteryProjectionInput,
    binding: SalesMasteryTenantBinding,
    requestDigest: string,
  ): Promise<OutboxRow> {
    if (!this.database) throw new Error("Durable database is unavailable");
    const rubricVersion = parsePayload(input.payload).rubricVersion;
    const id = uuidFromDigest(`sales-outbox:${requestDigest}`);
    try {
      await this.database.transaction(async (transaction) => {
        const [existingAttempt] = await transaction
          .select()
          .from(salesMasteryProjectionOutbox)
          .where(
            and(
              eq(
                salesMasteryProjectionOutbox.masteryTenantKey,
                binding.masteryTenantKey,
              ),
              eq(
                salesMasteryProjectionOutbox.sourceAttemptId,
                input.sourceAttemptId,
              ),
            ),
          )
          .limit(1);
        if (
          existingAttempt &&
          existingAttempt.payloadDigest !== requestDigest
        ) {
          throw new MasteryPersistenceError(
            "IDEMPOTENCY_CONFLICT",
            "The source attempt is already bound to different Sales evidence.",
          );
        }
        await transaction
          .insert(salesMasteryProjectionOutbox)
          .values({
            id,
            applicationKey: "sales",
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
      });
      const [row] = await this.database
        .select()
        .from(salesMasteryProjectionOutbox)
        .where(
          and(
            eq(
              salesMasteryProjectionOutbox.masteryTenantKey,
              binding.masteryTenantKey,
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
        row.organizationId !== binding.organizationId ||
        row.learnerPrincipalId !== input.principalId
      ) {
        throw new SalesMasteryProjectionError(
          "TENANT_SCOPE_ERROR",
          "The Sales projection is outside the verified organization scope.",
        );
      }
      return row;
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
    const [row] = await this.database
      .select()
      .from(salesMasteryProjectionReceipts)
      .where(eq(salesMasteryProjectionReceipts.outboxId, outboxId))
      .limit(1);
    return row ? receiptFromRow(row, outboxId) : null;
  }

  private async deliverDatabase(
    input: SalesMasteryProjectionInput,
    binding: SalesMasteryTenantBinding,
    outbox: OutboxRow,
    requestDigest: string,
  ): Promise<SalesMasteryProjectionReceipt> {
    const snapshot = await this.mastery.readSnapshot({
      schoolId: binding.masteryTenantKey,
    });
    const result = parseMasteryResult(
      await this.mastery.commitMasteryEvidence(
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
  }

  private async insertReceipt(
    outbox: OutboxRow,
    input: SalesMasteryProjectionInput,
    result: CommitMasteryEvidenceResult,
    requestDigest: string,
  ): Promise<ReceiptInsertResult> {
    if (!this.database) throw new Error("Durable database is unavailable");
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
    const parsed = parseReadInput(input);
    const binding = await this.resolveTenant({ identity: parsed.identity });
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
    const rows = await this.database
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
    const completed = await Promise.all(
      rows.map(async (row) =>
        (await this.findReceipt(row.id)) ? rowPayload(row) : null,
      ),
    );
    return completed.filter(
      (row): row is Record<string, unknown> => row !== null,
    );
  }

  /** Retries one pending outbox intent with the verified organization binding. */
  async retryPending(input: unknown): Promise<SalesMasteryProjectionReceipt> {
    const parsed = parseRetryInput(input);
    const binding = await this.resolveTenant({ identity: parsed.identity });
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
      return this.project(pending.input);
    }
    const [row] = await this.database
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
    if (!row) {
      throw new SalesMasteryProjectionError(
        "TENANT_SCOPE_ERROR",
        "The pending Sales projection is outside the verified organization scope.",
      );
    }
    const receipt = await this.findReceipt(row.id);
    if (receipt) return receipt;
    const retryInput: SalesMasteryProjectionInput = {
      identity: parsed.identity,
      principalId: row.learnerPrincipalId,
      sourceAttemptId: row.sourceAttemptId,
      idempotencyKey: row.idempotencyKey,
      sourceApplication: "sales-advantage",
      graphRelease: row.graphRelease,
      bindingsDigest: row.bindingsDigest,
      payload: rowPayload(row),
    };
    return this.project(retryInput);
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

/** Creates the fail-closed Sales tenant mapping and projection adapter. */
export function createSalesMasteryProjection(options: {
  /** Database adapter used for durable mapping and outbox records. */
  readonly database: unknown;
  /** Existing provider-neutral Mastery persistence adapter. */
  readonly mastery: MasteryPersistencePort;
}): SalesMasteryProjection {
  return new SalesMasteryProjectionAdapter(options.database, options.mastery);
}
