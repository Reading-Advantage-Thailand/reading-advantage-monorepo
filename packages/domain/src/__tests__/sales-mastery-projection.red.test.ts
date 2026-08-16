// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import {
  salesMasteryProjectionOutbox,
  salesMasteryProjectionReceipts,
  salesMasteryTenantMappings,
  schools,
} from "@reading-advantage/db";
import {
  companyIdentityClaimsSchema,
  type CompanyIdentityClaims,
} from "../../../backend/src/modules/company-identity/contracts.js";
import type { MasteryPersistencePort } from "../mastery/persistence-ports.js";

const SALES_MASTERY_MODULE_PATH = "../sales-mastery.js";
const ORGANIZATION_A = "20000000-0000-4000-8000-000000000003";
const ORGANIZATION_B = "20000000-0000-4000-8000-000000000004";
const LEARNER_A = "sales:00000000-0000-4000-8000-000000000001";
const LEARNER_B = "sales:00000000-0000-4000-8000-000000000002";
const SCHOOL_A = "30000000-0000-4000-8000-000000000001";
const GRAPH_RELEASE = "knowledge-space-sales-mastery-v1.0.0";
const BINDINGS_DIGEST =
  "e8843314e2f381a44143acb08c6ff6596bdeac4e9da32fbdb9a5851c8ed32197";

interface SalesMasteryTenantBinding {
  readonly applicationKey: "sales";
  readonly organizationId: string;
  readonly organizationKey: string;
  readonly masteryTenantKey: string;
  readonly sourceTenantKey: string;
}

interface SalesMasteryProjectionInput {
  readonly identity: CompanyIdentityClaims;
  readonly principalId: string;
  readonly sourceAttemptId: string;
  readonly idempotencyKey: string;
  readonly sourceApplication: "sales-advantage";
  readonly graphRelease: string;
  readonly bindingsDigest: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

interface SalesMasteryProjectionReceipt {
  readonly status: "applied" | "replayed";
  readonly commitId: string;
  readonly outboxId: string;
}

interface SalesMasteryProjection {
  resolveTenant(input: unknown): Promise<SalesMasteryTenantBinding>;
  project(
    input: SalesMasteryProjectionInput,
    options?: { readonly failDelivery?: boolean },
  ): Promise<SalesMasteryProjectionReceipt>;
  readEvidence(input: unknown): Promise<readonly Record<string, unknown>[]>;
  retryPending(input: unknown): Promise<SalesMasteryProjectionReceipt>;
}

interface SalesMasteryProjectionModule {
  createSalesMasteryProjection(options: {
    readonly database: unknown;
    readonly mastery: MasteryPersistencePort;
  }): SalesMasteryProjection;
}

interface TransactionalDatabaseProbe {
  readonly database: Record<string, unknown>;
  mappingCount(): number;
}

/** Creates a rollback-capable database double for the atomic-boundary contract. */
function transactionalDatabaseProbe(options: {
  readonly failOutboxInsert: boolean;
}): TransactionalDatabaseProbe {
  const rows = new Map<unknown, Record<string, unknown>[]>([
    [salesMasteryTenantMappings, []],
    [salesMasteryProjectionOutbox, []],
    [salesMasteryProjectionReceipts, []],
    [schools, []],
  ]);

  function rowsFor(table: unknown): Record<string, unknown>[] {
    const tableRows = rows.get(table);
    if (!tableRows) throw new Error("Unexpected table in database probe.");
    return tableRows;
  }

  function databaseApi(): Record<string, unknown> {
    return {
      select: () => {
        let selectedTable: unknown;
        const query: Record<string, unknown> = {
          from(table: unknown) {
            selectedTable = table;
            return query;
          },
          where() {
            return query;
          },
          limit: async (count: number) =>
            rowsFor(selectedTable).slice(0, count),
        };
        return query;
      },
      insert: (table: unknown) => ({
        values(value: Record<string, unknown>) {
          return {
            onConflictDoNothing: async () => {
              if (
                options.failOutboxInsert &&
                table === salesMasteryProjectionOutbox
              ) {
                throw new Error("forced outbox insert failure");
              }
              rowsFor(table).push(value);
              return [];
            },
          };
        },
      }),
    };
  }

  const database = databaseApi();
  database.transaction = async (
    callback: (transaction: Record<string, unknown>) => Promise<unknown>,
  ) => {
    const snapshot = new Map(
      [...rows.entries()].map(([table, tableRows]) => [
        table,
        tableRows.map((row) => ({ ...row })),
      ]),
    );
    try {
      return await callback(databaseApi());
    } catch (error) {
      for (const [table, tableRows] of snapshot.entries()) {
        rows.set(table, tableRows);
      }
      throw error;
    }
  };

  return {
    database,
    mappingCount: () => rowsFor(salesMasteryTenantMappings).length,
  };
}

/** Creates one Company Identity claim set for the requested organization. */
function companyClaims(
  organizationId: string,
  overrides: Partial<CompanyIdentityClaims> = {},
): CompanyIdentityClaims {
  return companyIdentityClaimsSchema.parse({
    iss: "https://accounts.example.test",
    sub: "00000000-0000-4000-8000-000000000001",
    username: "sales.rep",
    displayName: "Sales Rep",
    aud: "sales",
    exp: 1_900_000_000,
    iat: 1_800_000_000,
    nonce: "nonce-sales-phase2",
    sid: "00000000-0000-4000-8000-000000000002",
    organizationId,
    organizationKey: "internal-company",
    status: "ACTIVE",
    roles: ["SALES_REP"],
    authVersion: 1,
    ...overrides,
  });
}

/** Creates a valid Sales projection command without a frontend tenant field. */
function projectionInput(
  identity: CompanyIdentityClaims,
  overrides: Partial<SalesMasteryProjectionInput> = {},
): SalesMasteryProjectionInput {
  return {
    identity,
    principalId: LEARNER_A,
    sourceAttemptId: "quiz-attempt-phase2-001",
    idempotencyKey: "sales-projection-idempotency-phase2-001",
    sourceApplication: "sales-advantage",
    graphRelease: GRAPH_RELEASE,
    bindingsDigest: BINDINGS_DIGEST,
    payload: {
      objectiveId: "sales.value-proposition",
      variantKey: "quiz.recognition",
      score: 0.9,
      rubricVersion: "sales-rubric.v1",
    },
    ...overrides,
  };
}

/** Creates the existing empty Mastery adapter result used by the domain contract. */
function masteryDouble(): MasteryPersistencePort {
  return {
    readSnapshot: vi.fn().mockResolvedValue({
      cards: [],
      reviews: [],
      evidence: [],
      states: [],
      placements: [],
      calibrations: [],
      commits: [],
    }),
    commitMasteryEvidence: vi.fn().mockResolvedValue({
      status: "applied",
      commitId: "40000000-0000-4000-8000-000000000001",
      resultDigest: `sha256:${"a".repeat(64)}`,
      cardRevision: 0,
      stateRevision: 0,
      recordIds: {
        card: "40000000-0000-4000-8000-000000000002",
        review: "40000000-0000-4000-8000-000000000003",
        evidence: ["40000000-0000-4000-8000-000000000004"],
        state: "40000000-0000-4000-8000-000000000005",
        placement: "40000000-0000-4000-8000-000000000006",
      },
    }),
    approveMasteryCalibration: vi.fn(),
  };
}

/** Loads the future Sales projection seam and labels its absent Red behavior. */
async function loadSalesMasteryProjection(): Promise<SalesMasteryProjectionModule> {
  try {
    return (await import(
      SALES_MASTERY_MODULE_PATH
    )) as SalesMasteryProjectionModule;
  } catch (error) {
    if (error instanceof Error && error.message.includes("sales-mastery.js")) {
      throw new Error(
        "Missing Sales tenant mapping/projection behavior: sales-mastery.js",
        { cause: error },
      );
    }
    throw error;
  }
}

/** Creates the real future projection seam with the existing Mastery adapter port. */
async function createProjection(database: unknown = {}): Promise<{
  readonly projection: SalesMasteryProjection;
  readonly mastery: MasteryPersistencePort;
}> {
  const module = await loadSalesMasteryProjection();
  const mastery = masteryDouble();
  return {
    projection: module.createSalesMasteryProjection({
      database,
      mastery,
    }),
    mastery,
  };
}

describe("Sales Phase 2 tenant authorization and durable projection", () => {
  it.each([
    { name: "missing claims", input: {} },
    {
      name: "wrong audience",
      input: {
        identity: { ...companyClaims(ORGANIZATION_A), aud: "codecamp" },
      },
    },
    {
      name: "suspended identity",
      input: {
        identity: {
          ...companyClaims(ORGANIZATION_A),
          status: "SUSPENDED",
        },
      },
    },
  ])("rejects $name before adapter access", async ({ input }) => {
    const { projection, mastery } = await createProjection();

    await expect(projection.resolveTenant(input)).rejects.toThrow(
      /Company Identity|authorization|audience|status/i,
    );
    expect(mastery.commitMasteryEvidence).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "roleless Company Identity claims",
      overrides: { roles: [] },
    },
    {
      name: "non-canonical organization key",
      overrides: { organizationKey: "other-company" },
    },
  ])("rejects $name before tenant mapping", async ({ overrides }) => {
    const { projection, mastery } = await createProjection();

    await expect(
      projection.resolveTenant({
        identity: companyClaims(ORGANIZATION_A, overrides),
      }),
    ).rejects.toThrow(/Company Identity|authorization|organization|role/i);
    expect(mastery.commitMasteryEvidence).not.toHaveBeenCalled();
  });

  it("rejects caller-built tenant, organization, or application bindings", async () => {
    const { projection } = await createProjection();
    const claims = companyClaims(ORGANIZATION_A);

    await expect(
      projection.resolveTenant({
        identity: claims,
        schoolId: SCHOOL_A,
        organizationId: ORGANIZATION_B,
        tenantKey: "codecamp",
        applicationKey: "codecamp",
      }),
    ).rejects.toThrow(/tenant|scope|validation/i);
  });

  it("creates one mapping and reuses it for repeated verified claims", async () => {
    const { projection } = await createProjection();
    const claims = companyClaims(ORGANIZATION_A);

    const first = await projection.resolveTenant({ identity: claims });
    const second = await projection.resolveTenant({ identity: claims });

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      applicationKey: "sales",
      organizationId: ORGANIZATION_A,
      organizationKey: "internal-company",
      sourceTenantKey: `sales:${ORGANIZATION_A}`,
    });
    expect(first.masteryTenantKey).not.toBe("codecamp");
  });

  it("serializes concurrent first-use mapping and returns one tenant", async () => {
    const { projection } = await createProjection();
    const claims = companyClaims(ORGANIZATION_A);

    const mappings = await Promise.all(
      Array.from({ length: 8 }, () =>
        projection.resolveTenant({ identity: claims }),
      ),
    );

    expect(
      new Set(mappings.map((mapping) => mapping.masteryTenantKey)).size,
    ).toBe(1);
  });

  it("rejects Codecamp namespace reuse", async () => {
    const { projection } = await createProjection();

    await expect(
      projection.resolveTenant({
        identity: companyClaims(ORGANIZATION_A),
        targetTenantNamespace: "codecamp",
      }),
    ).rejects.toThrow(/Codecamp|namespace|tenant/i);
  });

  it("rejects cross-organization reads, writes, replay, and evidence reuse", async () => {
    const { projection } = await createProjection();
    const organizationA = companyClaims(ORGANIZATION_A);
    const organizationB = companyClaims(ORGANIZATION_B, {
      sub: "00000000-0000-4000-8000-000000000003",
    });
    const input = projectionInput(organizationA);

    await projection.project(input);
    await expect(
      projection.readEvidence({
        identity: organizationB,
        principalId: LEARNER_B,
      }),
    ).rejects.toThrow(/organization|tenant|scope/i);
    await expect(
      projection.project({
        ...input,
        identity: organizationB,
        principalId: LEARNER_B,
      }),
    ).rejects.toThrow(/organization|tenant|scope/i);
    await expect(
      projection.project({ ...input, identity: organizationB }),
    ).rejects.toThrow(/organization|tenant|scope|idempotency/i);
  });

  it("rejects cross-organization source-attempt and idempotency replay with the new learner principal", async () => {
    const { projection } = await createProjection();
    const organizationA = companyClaims(ORGANIZATION_A);
    const organizationB = companyClaims(ORGANIZATION_B, {
      sub: "00000000-0000-4000-8000-000000000002",
    });
    const input = projectionInput(organizationA);

    await projection.project(input);
    await expect(
      projection.project({
        ...input,
        identity: organizationB,
        principalId: LEARNER_B,
      }),
    ).rejects.toThrow(/organization|tenant|scope|replay|idempotency/i);
  });

  it("returns the original receipt for an equal replay", async () => {
    const { projection } = await createProjection();
    const input = projectionInput(companyClaims(ORGANIZATION_A));

    const applied = await projection.project(input);
    const replayed = await projection.project(structuredClone(input));

    expect(applied.status).toBe("applied");
    expect(replayed).toMatchObject({
      status: "replayed",
      commitId: applied.commitId,
      outboxId: applied.outboxId,
    });
  });

  it("rejects a conflicting replay without a second mutation", async () => {
    const { projection, mastery } = await createProjection();
    const input = projectionInput(companyClaims(ORGANIZATION_A));

    await projection.project(input);
    await expect(
      projection.project({
        ...input,
        payload: { ...input.payload, score: 0.1 },
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", retryable: false });
    expect(mastery.commitMasteryEvidence).toHaveBeenCalledTimes(1);
  });

  it("retries a failed delivery without duplicating the projection", async () => {
    const { projection } = await createProjection();
    const input = projectionInput(companyClaims(ORGANIZATION_A));

    await expect(
      projection.project(input, { failDelivery: true }),
    ).rejects.toMatchObject({ retryable: true });
    const retried = await projection.retryPending({
      identity: input.identity,
      sourceAttemptId: input.sourceAttemptId,
    });

    expect(retried.status).toBe("applied");
    await expect(projection.project(input)).resolves.toMatchObject({
      status: "replayed",
      commitId: retried.commitId,
    });
  });

  it("converges equal concurrent submissions to one applied receipt", async () => {
    const { projection } = await createProjection();
    const input = projectionInput(companyClaims(ORGANIZATION_A));
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => projection.project(input)),
    );
    const appliedCount = results.filter(
      (result) =>
        result.status === "fulfilled" && result.value.status === "applied",
    ).length;
    const replayedCount = results.filter(
      (result) =>
        result.status === "fulfilled" && result.value.status === "replayed",
    ).length;

    expect({ appliedCount, replayedCount }).toEqual({
      appliedCount: 1,
      replayedCount: 7,
    });
  });

  it("converges conflicting concurrent submissions to one apply and conflicts", async () => {
    const { projection } = await createProjection();
    const input = projectionInput(companyClaims(ORGANIZATION_A));
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, (_, index) =>
        projection.project({
          ...input,
          payload: { ...input.payload, score: index / 10 },
        }),
      ),
    );
    const appliedCount = results.filter(
      (result) =>
        result.status === "fulfilled" && result.value.status === "applied",
    ).length;
    const conflictCount = results.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof Error &&
        "code" in result.reason &&
        result.reason.code === "IDEMPOTENCY_CONFLICT",
    ).length;

    expect({ appliedCount, conflictCount }).toEqual({
      appliedCount: 1,
      conflictCount: 3,
    });
  });

  it("rejects graph or binding drift before durable projection", async () => {
    const { projection } = await createProjection();
    const input = projectionInput(companyClaims(ORGANIZATION_A));

    await expect(
      projection.project({
        ...input,
        graphRelease: "knowledge-space-synthetic-codecamp-proof-v1.0.0",
      }),
    ).rejects.toThrow(/graph|release|provenance/i);
    await expect(
      projection.project({
        ...input,
        bindingsDigest: `0${BINDINGS_DIGEST.slice(1)}`,
      }),
    ).rejects.toThrow(/binding|digest|provenance/i);
  });

  it("rejects an activity and rubric that are absent from the approved Sales bindings", async () => {
    const { projection, mastery } = await createProjection();
    const input = projectionInput(companyClaims(ORGANIZATION_A));

    await expect(
      projection.project({
        ...input,
        payload: {
          ...input.payload,
          objectiveId: "sales.unknown.objective",
          variantKey: "sales.unknown.variant",
          rubricVersion: "sales.unapproved-rubric.v9",
        },
      }),
    ).rejects.toThrow(/activity|binding|objective|rubric|provenance/i);
    expect(mastery.commitMasteryEvidence).not.toHaveBeenCalled();
  });

  it("rejects roleplay evidence without the accepted consent and retention gate", async () => {
    const { projection, mastery } = await createProjection();
    const input = projectionInput(companyClaims(ORGANIZATION_A));

    await expect(
      projection.project({
        ...input,
        payload: {
          ...input.payload,
          activityKind: "roleplay",
          evidenceSource: "roleplay-evaluation",
          consentGiven: false,
          retentionDays: 0,
          evaluatorEligibility: null,
        },
      }),
    ).rejects.toThrow(/consent|retention|roleplay|eligib|binding/i);
    expect(mastery.commitMasteryEvidence).not.toHaveBeenCalled();
  });

  it("rolls back a new mapping when its projection outbox insert fails", async () => {
    const probe = transactionalDatabaseProbe({ failOutboxInsert: true });
    const { projection } = await createProjection(probe.database);

    await expect(
      projection.project(projectionInput(companyClaims(ORGANIZATION_A))),
    ).rejects.toThrow(/persistence|outbox|unavailable/i);
    expect(probe.mappingCount()).toBe(0);
  });
});
