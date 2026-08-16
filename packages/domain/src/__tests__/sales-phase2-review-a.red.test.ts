// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  companyIdentityClaimsSchema,
  type CompanyIdentityClaims,
} from "../../../backend/src/modules/company-identity/contracts.js";
import { salesCurriculumBindings } from "../../../sales-knowledge/src/index.js";
import { describe, expect, it, vi } from "vitest";

import {
  createSalesMasteryProjection,
  SALES_MASTERY_BINDINGS_DIGEST,
  SALES_MASTERY_GRAPH_RELEASE,
  SalesMasteryProjectionError,
  type SalesMasteryProjectionInput,
} from "../sales-mastery.js";
import type {
  CommitMasteryEvidenceResult,
  MasterySnapshot,
} from "../mastery/persistence-contracts.js";
import type { MasteryPersistencePort } from "../mastery/persistence-ports.js";

const ISSUER = "https://accounts.example.test";
const ORGANIZATION_A = "20000000-0000-4000-8000-000000000201";
const ORGANIZATION_B = "20000000-0000-4000-8000-000000000202";
const COMPANY_ACCOUNT_A = "00000000-0000-4000-8000-000000000201";
const COMPANY_ACCOUNT_B = "00000000-0000-4000-8000-000000000202";
const COMPANY_SESSION_A = "00000000-0000-4000-8000-000000000211";
const LEARNER_A = `sales:${COMPANY_ACCOUNT_A}`;
const LEARNER_B = `sales:${COMPANY_ACCOUNT_B}`;
const VALID_IDENTITY_TOKEN = "internal-company-identity-token";
const NOW = new Date("2026-08-16T12:00:00.000Z");
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

type ProviderFaultPoint = "transaction" | "external-select" | "external-insert";

interface VerifiedSalesIdentity {
  readonly issuer: string;
  readonly expiresAt: string;
  readonly organizationId: string;
  readonly organizationKey: "internal-company";
  readonly principalId: string;
}

interface CompanyIdentityVerificationInput {
  readonly identity: unknown;
  readonly expectedAudience: "sales";
}

interface CompanyIdentityVerificationPort {
  verify(
    input: CompanyIdentityVerificationInput,
  ): Promise<VerifiedSalesIdentity>;
}

interface SalesPersistenceFactoryOptions {
  readonly tenant: { readonly schoolId: string };
  readonly sourceTenantKey: string;
  readonly actorId: string;
}

interface SalesPersistenceFactory {
  create(options: SalesPersistenceFactoryOptions): MasteryPersistencePort;
}

interface ExpectedSalesProjection {
  resolveTenant(input: unknown): Promise<unknown>;
  project(input: unknown): Promise<unknown>;
  readEvidence(input: unknown): Promise<unknown>;
  retryPending(input: unknown): Promise<unknown>;
}

interface ExpectedSalesProjectionFactoryOptions {
  readonly database: unknown;
  readonly companyIdentity: CompanyIdentityVerificationPort;
  readonly masteryFactory: SalesPersistenceFactory;
}

type ExpectedSalesProjectionFactory = (
  options: ExpectedSalesProjectionFactoryOptions,
) => ExpectedSalesProjection;

interface QueryDouble {
  from(table: unknown): QueryDouble;
  where(condition: unknown): QueryDouble;
  limit(count: number): Promise<readonly Record<string, unknown>[]>;
  then<TResult1 = readonly Record<string, unknown>[], TResult2 = never>(
    onfulfilled?:
      | ((
          value: readonly Record<string, unknown>[],
        ) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
}

/** Creates one approved quiz coordinate from the immutable Sales release. */
function approvedQuizCoordinate(): {
  readonly objectiveId: string;
  readonly variantKey: string;
  readonly rubricVersion: string;
} {
  const binding = salesCurriculumBindings.bindings.find(
    (candidate) => candidate.activityKind === "quiz-question",
  );
  if (!binding || !binding.variantId || !binding.objectiveIds[0]) {
    throw new Error("The approved Sales quiz binding is unavailable.");
  }
  return {
    objectiveId: binding.objectiveIds[0],
    variantKey: binding.variantId,
    rubricVersion: "sales-rubric.v1",
  };
}

/** Creates one Company Identity claim set for the Sales boundary. */
function companyClaims(
  organizationId: string,
  overrides: Partial<CompanyIdentityClaims> = {},
): CompanyIdentityClaims {
  return companyIdentityClaimsSchema.parse({
    iss: ISSUER,
    sub: COMPANY_ACCOUNT_A,
    username: "sales.rep",
    displayName: "Sales Rep",
    aud: "sales",
    exp: 1_900_000_000,
    iat: 1_750_000_000,
    nonce: "sales-review-a-nonce",
    sid: COMPANY_SESSION_A,
    organizationId,
    organizationKey: "internal-company",
    status: "ACTIVE",
    roles: ["SALES_REP"],
    authVersion: 1,
    ...overrides,
  });
}

/** Creates one projection input with reviewed Sales coordinates. */
function projectionInput(
  identity: CompanyIdentityClaims,
  overrides: Partial<SalesMasteryProjectionInput> = {},
): SalesMasteryProjectionInput {
  return {
    identity,
    principalId: LEARNER_A,
    sourceAttemptId: "sales-review-a-attempt-001",
    idempotencyKey: "sales-review-a-idempotency-001",
    sourceApplication: "sales-advantage",
    graphRelease: SALES_MASTERY_GRAPH_RELEASE,
    bindingsDigest: SALES_MASTERY_BINDINGS_DIGEST,
    payload: {
      ...approvedQuizCoordinate(),
      score: 0.9,
    },
    ...overrides,
  };
}

/** Creates the internal Sales identity result returned by Company Identity. */
function verifiedIdentity(
  organizationId: string,
  principalId: string,
): VerifiedSalesIdentity {
  return {
    issuer: ISSUER,
    expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(),
    organizationId,
    organizationKey: "internal-company",
    principalId,
  };
}

/** Creates the internal verifier double and rejects raw claims at its boundary. */
function identityVerifierDouble(
  result: VerifiedSalesIdentity = verifiedIdentity(ORGANIZATION_A, LEARNER_A),
): CompanyIdentityVerificationPort {
  return {
    verify: vi.fn(async (input: CompanyIdentityVerificationInput) => {
      if (input.identity === VALID_IDENTITY_TOKEN) return result;
      if (input.identity && typeof input.identity === "object") {
        const claims = input.identity as Record<string, unknown>;
        if (claims.iss !== ISSUER) {
          throw new Error("IDENTITY_TOKEN_ISSUER_INVALID");
        }
        if (
          typeof claims.exp === "number" &&
          claims.exp <= Math.floor(NOW.getTime() / 1000)
        ) {
          throw new Error("IDENTITY_TOKEN_EXPIRED");
        }
      }
      throw new Error("RAW_COMPANY_IDENTITY_CLAIMS_UNTRUSTED");
    }),
  };
}

/** Creates a projection through the expected internal seams before Green exists. */
function createExpectedProjection(
  options: ExpectedSalesProjectionFactoryOptions,
): ExpectedSalesProjection {
  const factory =
    createSalesMasteryProjection as unknown as ExpectedSalesProjectionFactory;
  return factory(options);
}

/** Creates a projection command with an untrusted identity and caller principal. */
function expectedProjectionInput(
  identity: unknown,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    identity,
    sourceAttemptId: "sales-review-a-attempt-001",
    idempotencyKey: "sales-review-a-idempotency-001",
    sourceApplication: "sales-advantage",
    graphRelease: SALES_MASTERY_GRAPH_RELEASE,
    bindingsDigest: SALES_MASTERY_BINDINGS_DIGEST,
    payload: {
      ...approvedQuizCoordinate(),
      score: 0.9,
    },
    ...overrides,
  };
}

/** Canonicalizes nested projection values before digesting the request. */
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

/** Computes the Sales projection request digest used by the durable adapter. */
function projectionDigest(input: SalesMasteryProjectionInput): string {
  const identity = {
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
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(identity)))
    .digest("hex")}`;
}

/** Creates the empty snapshot accepted by the Mastery persistence contract. */
function emptySnapshot(): MasterySnapshot {
  return {
    cards: [],
    reviews: [],
    evidence: [],
    states: [],
    placements: [],
    calibrations: [],
    commits: [],
  };
}

/** Creates a valid Mastery commit receipt for the projection test double. */
function masteryResult(): CommitMasteryEvidenceResult {
  return {
    status: "applied",
    commitId: "40000000-0000-4000-8000-000000000201",
    resultDigest: `sha256:${"a".repeat(64)}`,
    cardRevision: 0,
    stateRevision: 0,
    recordIds: {
      card: "40000000-0000-4000-8000-000000000202",
      review: "40000000-0000-4000-8000-000000000203",
      evidence: ["40000000-0000-4000-8000-000000000204"],
      state: "40000000-0000-4000-8000-000000000205",
      placement: "40000000-0000-4000-8000-000000000206",
    },
  };
}

/** Creates a Mastery port with optional provider faults. */
function masteryDouble(
  options: {
    readonly readError?: Error;
    readonly writeError?: Error;
    readonly onCommand?: (input: unknown) => void;
  } = {},
): MasteryPersistencePort {
  return {
    readSnapshot: vi.fn().mockImplementation(async () => {
      if (options.readError) throw options.readError;
      return emptySnapshot();
    }),
    commitMasteryEvidence: vi.fn().mockImplementation(async (input) => {
      options.onCommand?.(input);
      if (options.writeError) throw options.writeError;
      return masteryResult();
    }),
    approveMasteryCalibration: vi.fn(),
  };
}

/** Creates a persistence factory that records its Sales scope. */
function salesPersistenceFactoryDouble(
  options: {
    readonly scopes?: SalesPersistenceFactoryOptions[];
    readonly commands?: unknown[];
    readonly mastery?: MasteryPersistencePort;
  } = {},
): SalesPersistenceFactory {
  return {
    create(scope) {
      options.scopes?.push(scope);
      return (
        options.mastery ??
        masteryDouble({
          onCommand: (input) => options.commands?.push(input),
        })
      );
    },
  };
}

/** Creates one provider error that contains a secret diagnostic message. */
function providerError(label: string): Error & { readonly code: string } {
  return Object.assign(new Error(`provider-secret-${label}`), {
    code: "XX999",
  });
}

/** Creates a thenable Drizzle query double for the Sales adapter. */
function queryDouble(rows: readonly Record<string, unknown>[]): QueryDouble {
  const query = {} as QueryDouble;
  query.from = () => query;
  query.where = () => query;
  query.limit = async () => rows;
  query.then = (onfulfilled, onrejected) =>
    Promise.resolve(rows).then(
      onfulfilled ?? undefined,
      onrejected ?? undefined,
    );
  return query;
}

/** Creates the durable rows needed by the database boundary double. */
function durableRows(): {
  readonly mapping: Record<string, unknown>;
  readonly outbox: Record<string, unknown>;
} {
  const input = projectionInput(companyClaims(ORGANIZATION_A));
  return {
    mapping: {
      applicationKey: "sales",
      organizationId: ORGANIZATION_A,
      organizationKey: "internal-company",
      masteryTenantKey: "30000000-0000-4000-8000-000000000201",
      sourceTenantKey: `sales:${ORGANIZATION_A}`,
    },
    outbox: {
      id: "50000000-0000-4000-8000-000000000201",
      organizationId: ORGANIZATION_A,
      organizationKey: "internal-company",
      masteryTenantKey: "30000000-0000-4000-8000-000000000201",
      sourceTenantKey: `sales:${ORGANIZATION_A}`,
      learnerPrincipalId: LEARNER_A,
      sourceAttemptId: "sales-review-a-attempt-001",
      idempotencyKey: "sales-review-a-idempotency-001",
      payloadDigest: projectionDigest(input),
      graphRelease: SALES_MASTERY_GRAPH_RELEASE,
      bindingsDigest: SALES_MASTERY_BINDINGS_DIGEST,
      rubricVersion: "sales-rubric.v1",
      payloadJson: { ...approvedQuizCoordinate(), score: 0.9 },
    },
  };
}

/** Creates a durable database double with one selected external fault. */
function databaseDouble(fault: ProviderFaultPoint): Record<string, unknown> {
  const rows = durableRows();
  let transactionSelectCount = 0;
  const transaction = {
    select: () => {
      transactionSelectCount += 1;
      if (transactionSelectCount === 1) return queryDouble([rows.mapping]);
      if (transactionSelectCount === 4) return queryDouble([rows.outbox]);
      return queryDouble([]);
    },
    insert: () => {
      const builder = {
        values: () => ({
          onConflictDoNothing: async () => [],
        }),
      };
      return builder;
    },
  };

  return {
    select: () => {
      if (fault === "external-select") throw providerError("select");
      return queryDouble([]);
    },
    insert: () => {
      if (fault === "external-insert") throw providerError("insert");
      return {
        values: () => ({
          onConflictDoNothing: async () => [],
          returning: async () => [],
        }),
      };
    },
    transaction: async (
      callback: (value: Record<string, unknown>) => Promise<unknown>,
    ) => {
      if (fault === "transaction") throw providerError("transaction");
      return callback(transaction);
    },
  };
}

/** Asserts that an external failure becomes a safe provider-neutral error. */
async function expectPortableFailure(
  operation: Promise<unknown>,
): Promise<void> {
  const outcome = await Promise.allSettled([operation]);
  if (outcome[0]?.status !== "rejected") {
    throw new Error("The provider-faulted operation unexpectedly succeeded.");
  }
  expect(outcome[0].reason).toMatchObject({
    code: "PERSISTENCE_UNAVAILABLE",
    retryable: true,
  });
  expect(outcome[0].reason).toBeInstanceOf(SalesMasteryProjectionError);
  expect(String(outcome[0].reason.message)).not.toContain("provider-secret");
}

describe("Sales Phase 2 Review A remediation Red contracts", () => {
  it("SMC-P2-RA-002 verifies every projection boundary and uses returned scope", async () => {
    const verifier = identityVerifierDouble(
      verifiedIdentity(ORGANIZATION_B, LEARNER_B),
    );
    const scopes: SalesPersistenceFactoryOptions[] = [];
    const commands: unknown[] = [];
    const projection = createExpectedProjection({
      database: {},
      companyIdentity: verifier,
      masteryFactory: salesPersistenceFactoryDouble({ scopes, commands }),
    });

    await Promise.allSettled([
      projection.resolveTenant({ identity: VALID_IDENTITY_TOKEN }),
      projection.project(expectedProjectionInput(VALID_IDENTITY_TOKEN)),
      projection.readEvidence({
        identity: VALID_IDENTITY_TOKEN,
      }),
      projection.retryPending({
        identity: VALID_IDENTITY_TOKEN,
        sourceAttemptId: "sales-review-a-attempt-001",
      }),
    ]);

    expect(verifier.verify).toHaveBeenCalledTimes(4);
    for (const call of vi.mocked(verifier.verify).mock.calls) {
      expect(call[0]).toMatchObject({
        identity: VALID_IDENTITY_TOKEN,
        expectedAudience: "sales",
      });
    }
    expect(scopes[0]).toMatchObject({
      tenant: { schoolId: expect.stringMatching(UUID_PATTERN) },
      sourceTenantKey: `sales:${ORGANIZATION_B}`,
      actorId: LEARNER_B,
    });
    expect(commands[0]).toMatchObject({
      studentId: LEARNER_B,
      audit: { actorId: LEARNER_B },
    });
  });

  it.each([
    {
      label: "expired claims",
      identity: companyClaims(ORGANIZATION_A, { exp: 1_700_000_000 }),
    },
    {
      label: "wrong issuer claims",
      identity: companyClaims(ORGANIZATION_A, {
        iss: "https://wrong-issuer.example.test",
      }),
    },
    {
      label: "raw structurally valid claims",
      identity: companyClaims(ORGANIZATION_B),
    },
  ])(
    "SMC-P2-RA-002 rejects $label before DB or Mastery access",
    async ({ identity }) => {
      const verifier = identityVerifierDouble();
      const database = {
        select: vi.fn(),
        insert: vi.fn(),
        transaction: vi.fn(),
      };
      const scopes: SalesPersistenceFactoryOptions[] = [];
      const commands: unknown[] = [];
      const projection = createExpectedProjection({
        database,
        companyIdentity: verifier,
        masteryFactory: salesPersistenceFactoryDouble({ scopes, commands }),
      });
      const outcomes = await Promise.allSettled([
        projection.resolveTenant({ identity }),
        projection.project(expectedProjectionInput(identity)),
        projection.readEvidence({ identity }),
        projection.retryPending({
          identity,
          sourceAttemptId: "sales-review-a-attempt-001",
        }),
      ]);

      expect(outcomes.every((outcome) => outcome.status === "rejected")).toBe(
        true,
      );
      expect(verifier.verify).toHaveBeenCalledTimes(4);
      expect(database.select).not.toHaveBeenCalled();
      expect(database.insert).not.toHaveBeenCalled();
      expect(database.transaction).not.toHaveBeenCalled();
      expect(scopes).toHaveLength(0);
      expect(commands).toHaveLength(0);
    },
  );

  it("SMC-P2-RA-002 keeps domain production free of provider SDK calls", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../sales-mastery.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /from ["'](?:openai|anthropic|@ai-sdk|@google\/generative-ai)/u,
    );
    expect(source).not.toMatch(
      /\b(?:fetch|generateText|streamText|generateObject|embed)\s*\(/u,
    );
  });

  it("SMC-P2-RA-002/004 rejects the legacy direct-Mastery constructor path", () => {
    const database = {
      select: vi.fn(),
      insert: vi.fn(),
      transaction: vi.fn(),
    };
    const mastery = masteryDouble();
    const createProjection = createSalesMasteryProjection as unknown as (
      options: unknown,
    ) => unknown;
    let error: unknown;

    try {
      createProjection({ database, mastery });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(SalesMasteryProjectionError);
    expect(error).toMatchObject({ code: "CONFIGURATION_ERROR" });
    expect(database.select).not.toHaveBeenCalled();
    expect(database.insert).not.toHaveBeenCalled();
    expect(database.transaction).not.toHaveBeenCalled();
    expect(mastery.readSnapshot).not.toHaveBeenCalled();
    expect(mastery.commitMasteryEvidence).not.toHaveBeenCalled();
  });

  it("SMC-P2-RA-004 obtains a scoped Mastery port through the factory", async () => {
    const verifier = identityVerifierDouble();
    const scopes: SalesPersistenceFactoryOptions[] = [];
    const commands: unknown[] = [];
    const projection = createExpectedProjection({
      database: {},
      companyIdentity: verifier,
      masteryFactory: salesPersistenceFactoryDouble({ scopes, commands }),
    });

    await Promise.allSettled([
      projection.project(expectedProjectionInput(VALID_IDENTITY_TOKEN)),
    ]);

    expect(scopes).toHaveLength(1);
    expect(scopes[0]).toEqual({
      tenant: { schoolId: expect.stringMatching(UUID_PATTERN) },
      sourceTenantKey: `sales:${ORGANIZATION_A}`,
      actorId: LEARNER_A,
    });
    expect(commands[0]).toMatchObject({
      schoolId: scopes[0]?.tenant.schoolId,
      studentId: LEARNER_A,
      audit: { actorId: LEARNER_A },
    });
  });

  it.each([
    { label: "caller principal", overrides: { principalId: LEARNER_B } },
    {
      label: "source tenant",
      overrides: { sourceTenantKey: `sales:${ORGANIZATION_B}` },
    },
    { label: "actor", overrides: { actorId: LEARNER_B } },
    {
      label: "tenant",
      overrides: {
        tenant: { schoolId: "40000000-0000-4000-8000-000000000202" },
      },
    },
    { label: "organization", overrides: { organizationId: ORGANIZATION_B } },
  ])(
    "SMC-P2-RA-004 rejects caller $label overrides before writing",
    async ({ overrides }) => {
      const verifier = identityVerifierDouble();
      const scopes: SalesPersistenceFactoryOptions[] = [];
      const commands: unknown[] = [];
      const projection = createExpectedProjection({
        database: {},
        companyIdentity: verifier,
        masteryFactory: salesPersistenceFactoryDouble({ scopes, commands }),
      });
      const outcome = await Promise.allSettled([
        projection.project(
          expectedProjectionInput(VALID_IDENTITY_TOKEN, overrides),
        ),
      ]);

      expect(outcome[0]?.status).toBe("rejected");
      expect(verifier.verify).toHaveBeenCalledTimes(1);
      expect(scopes).toHaveLength(0);
      expect(commands).toHaveLength(0);
    },
  );

  it("SMC-P2-RA-003 rejects the legacy unreviewed activity fallback", async () => {
    const scopes: SalesPersistenceFactoryOptions[] = [];
    const commands: unknown[] = [];
    const projection = createExpectedProjection({
      database: {},
      companyIdentity: identityVerifierDouble(),
      masteryFactory: salesPersistenceFactoryDouble({ scopes, commands }),
    });

    await expect(
      projection.project({
        ...expectedProjectionInput(VALID_IDENTITY_TOKEN),
        payload: {
          objectiveId: "sales.value-proposition",
          variantKey: "quiz.recognition",
          rubricVersion: "sales-rubric.v1",
          score: 0.9,
        },
      }),
    ).rejects.toMatchObject({ code: "ACTIVITY_BINDING_FORBIDDEN" });
    expect(scopes).toHaveLength(0);
    expect(commands).toHaveLength(0);
  });

  it("SMC-P2-RA-006 rejects arbitrary, raw, audio, and secret payload fields", async () => {
    const scopes: SalesPersistenceFactoryOptions[] = [];
    const commands: unknown[] = [];
    const projection = createExpectedProjection({
      database: {},
      companyIdentity: identityVerifierDouble(),
      masteryFactory: salesPersistenceFactoryDouble({ scopes, commands }),
    });

    await expect(
      projection.project({
        ...expectedProjectionInput(VALID_IDENTITY_TOKEN),
        payload: {
          ...expectedProjectionInput(VALID_IDENTITY_TOKEN).payload,
          arbitrary: "not in practice.v1",
          raw: { answer: "raw learner text" },
          audio: "data:audio/wav;base64,secret",
          secret: "provider-secret-value",
        },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(scopes).toHaveLength(0);
    expect(commands).toHaveLength(0);
  });

  it.each([
    {
      label: "mapping transaction",
      database: databaseDouble("transaction"),
      operation: (projection: ExpectedSalesProjection) =>
        projection.resolveTenant({ identity: VALID_IDENTITY_TOKEN }),
    },
    {
      label: "evidence read",
      database: databaseDouble("external-select"),
      operation: (projection: ExpectedSalesProjection) =>
        projection.readEvidence({
          identity: VALID_IDENTITY_TOKEN,
        }),
    },
    {
      label: "pending retry read",
      database: databaseDouble("external-select"),
      operation: (projection: ExpectedSalesProjection) =>
        projection.retryPending({
          identity: VALID_IDENTITY_TOKEN,
          sourceAttemptId: "sales-review-a-attempt-001",
        }),
    },
    {
      label: "receipt lookup",
      database: databaseDouble("external-select"),
      operation: (projection: ExpectedSalesProjection) =>
        projection.project(expectedProjectionInput(VALID_IDENTITY_TOKEN)),
    },
    {
      label: "receipt write",
      database: databaseDouble("external-insert"),
      operation: (projection: ExpectedSalesProjection) =>
        projection.project(expectedProjectionInput(VALID_IDENTITY_TOKEN)),
    },
  ])(
    "SMC-P2-RA-005 maps provider failures from every database $label boundary",
    async ({ database, operation }) => {
      await expectPortableFailure(
        operation(
          createExpectedProjection({
            database,
            companyIdentity: identityVerifierDouble(),
            masteryFactory: salesPersistenceFactoryDouble(),
          }),
        ),
      );
    },
  );

  it.each([
    {
      label: "Mastery read",
      mastery: masteryDouble({ readError: providerError("mastery-read") }),
    },
    {
      label: "Mastery write",
      mastery: masteryDouble({ writeError: providerError("mastery-write") }),
    },
  ])(
    "SMC-P2-RA-005 maps provider failures from every external $label boundary",
    async ({ mastery }) => {
      await expectPortableFailure(
        createExpectedProjection({
          database: {},
          companyIdentity: identityVerifierDouble(),
          masteryFactory: salesPersistenceFactoryDouble({ mastery }),
        }).project(expectedProjectionInput(VALID_IDENTITY_TOKEN)),
      );
    },
  );
});
