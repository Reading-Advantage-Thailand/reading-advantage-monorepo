import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import type { DurableJobEnqueuePort } from "../../../jobs/ports.js";

const payloadDigest = "a".repeat(64);
const jobId = "018f0d8f-31d1-7d50-9f4f-550d34295095";
const companyId = "11111111-1111-4111-8111-111111111111";

interface Intent {
  readonly outboxEventId: string;
  readonly auditEventId: string;
  readonly auditReceiptId: string;
  readonly objectId: string;
  readonly operation: "historical-private-evidence:import";
  readonly scope: { readonly companyId: string; readonly schoolId?: string };
  readonly source: {
    readonly sourceSystem: string;
    readonly sourceVersion: string;
    readonly sourceIdentity: string;
  };
  readonly payload: {
    readonly packetVersion: "historical-private-evidence-packet.v1";
    readonly evidenceReference: string;
  };
  readonly authorizationEvidence: {
    readonly source: "company-identity";
    readonly claimsVersion: string;
    readonly policyVersion: string;
    readonly subjectId: string;
    readonly organizationId: string;
    readonly appRoleIds: readonly string[];
    readonly schoolIds?: readonly string[];
  };
  readonly payloadDigest: string;
}

interface Receipt {
  readonly outboxEventId: string;
  readonly auditEventId: string;
  readonly auditReceiptId: string;
  readonly objectId: string;
  readonly scope: { readonly companyId: string; readonly schoolId?: string };
  readonly authorizationEvidence: Intent["authorizationEvidence"];
  readonly policyVersion: string;
  readonly idempotencyKey: string;
  readonly jobId: string;
}

type ClaimResult =
  | { readonly status: "claimed"; readonly claimToken: string }
  | { readonly status: "replay"; readonly receipt: Readonly<Receipt> }
  | {
      readonly status: "reconcile";
      readonly claimToken: string;
      readonly receipt: Readonly<Receipt>;
    };

interface ProjectionStore {
  findByOutboxEventId(
    outboxEventId: string,
  ): Promise<Readonly<Receipt> | undefined>;
  claimReceipt(
    input: Readonly<{
      readonly outboxEventId: string;
      readonly idempotencyKey: string;
      readonly intent: Readonly<Intent>;
    }>,
  ): Promise<Readonly<ClaimResult>>;
  releaseClaim(input: Readonly<Record<string, unknown>>): Promise<void>;
  bindReceipt(input: Readonly<{ claimToken: string; receipt: Receipt }>): Promise<unknown>;
}

interface ProjectorModule {
  readonly createHistoricalPrivateEvidenceOutboxProjector?: (input: {
    readonly durableJobs: DurableJobEnqueuePort;
    readonly projectionStore: ProjectionStore;
    readonly job: {
      readonly jobName: string;
      readonly queueName: string;
      readonly maxAttempts: number;
    };
  }) => {
    project(intent: Readonly<Intent>): Promise<
      Readonly<{
        readonly status: string;
        readonly receipt: Receipt;
      }>
    >;
  };
}

/** Loads the public Finance Operations projector boundary. */
async function loadProjectorModule(): Promise<ProjectorModule> {
  return (await import("../index.js")) as unknown as ProjectorModule;
}

/** Builds a valid immutable projector intent with caller-selected boundary values. */
function intent(overrides: Partial<Intent> = {}): Intent {
  const value: Intent = {
    outboxEventId: "outbox-review-b-001",
    auditEventId: "audit-review-b-001",
    auditReceiptId: "audit-receipt-review-b-001",
    objectId:
      "finance-historical-private-evidence-object-v1|sha256=" + "c".repeat(64),
    operation: "historical-private-evidence:import",
    scope: { companyId, schoolId: "school-review-b" },
    source: {
      sourceSystem: "owner-attested-archive",
      sourceVersion: "archive-v1",
      sourceIdentity: "legacy-receipt-review-b-001",
    },
    payload: {
      packetVersion: "historical-private-evidence-packet.v1",
      evidenceReference: `private-evidence://${companyId}/historical/receipt.json`,
    },
    authorizationEvidence: {
      source: "company-identity",
      claimsVersion: "company-identity-claims-v1",
      policyVersion: "finance-historical-import-role-policy-v1",
      subjectId: "employee-review-b",
      organizationId: companyId,
      appRoleIds: ["role-review-b"],
      schoolIds: ["school-review-b"],
    },
    payloadDigest,
    ...overrides,
  };
  return Object.freeze({
    ...value,
    scope: Object.freeze(value.scope),
    source: Object.freeze(value.source),
    payload: Object.freeze(value.payload),
    authorizationEvidence: Object.freeze({
      ...value.authorizationEvidence,
      organizationId: value.scope.companyId,
      ...(value.scope.schoolId === undefined
        ? { schoolIds: undefined }
        : { schoolIds: [value.scope.schoolId] }),
    }),
  });
}

/** Builds a valid receipt for an immutable intent in reconciliation tests. */
function receiptFor(input: Intent): Receipt {
  const encode = (value: string): string =>
    `${new TextEncoder().encode(value).byteLength}:${value}`;
  const sourceIdentityDomain = new TextEncoder().encode(
    "reading-advantage.finance.historical-private-evidence.source-identity.v1",
  );
  const sourceIdentityBytes = new TextEncoder().encode(
    input.source.sourceIdentity,
  );
  const sourceIdentityFrame = new Uint8Array(
    sourceIdentityDomain.byteLength + 4 + sourceIdentityBytes.byteLength,
  );
  sourceIdentityFrame.set(sourceIdentityDomain, 0);
  new DataView(sourceIdentityFrame.buffer).setUint32(
    sourceIdentityDomain.byteLength,
    sourceIdentityBytes.byteLength,
  );
  sourceIdentityFrame.set(
    sourceIdentityBytes,
    sourceIdentityDomain.byteLength + 4,
  );
  const sourceIdentityDigest = createHash("sha256")
    .update(sourceIdentityFrame)
    .digest("hex");
  const encodeList = (values: readonly string[] | undefined): string =>
    values === undefined
      ? "none"
      : `some:${values.length}:${values.map(encode).join(",")}`;
  const identity = [
    "historical-private-evidence-outbox-v1",
    `operation=${encode(input.operation)}`,
    `company=${encode(input.scope.companyId)}`,
    input.scope.schoolId === undefined
      ? "school=none"
      : `school=some:${encode(input.scope.schoolId)}`,
    `source-system=${encode(input.source.sourceSystem)}`,
    `source-version=${encode(input.source.sourceVersion)}`,
    `source-identity=sha256:${sourceIdentityDigest}`,
    `payload-digest=${encode(input.payloadDigest)}`,
    `object-id=${encode(input.objectId)}`,
    `claims-version=${encode(input.authorizationEvidence.claimsVersion)}`,
    `policy-version=${encode(input.authorizationEvidence.policyVersion)}`,
    `subject-id=${encode(input.authorizationEvidence.subjectId)}`,
    `organization-id=${encode(input.authorizationEvidence.organizationId)}`,
    `app-role-ids=${encodeList(input.authorizationEvidence.appRoleIds)}`,
    `school-ids=${encodeList(input.authorizationEvidence.schoolIds)}`,
  ].join("|");
  return {
    outboxEventId: input.outboxEventId,
    auditEventId: input.auditEventId,
    auditReceiptId: input.auditReceiptId,
    objectId: input.objectId,
    scope: input.scope,
    authorizationEvidence: input.authorizationEvidence,
    policyVersion: input.authorizationEvidence.policyVersion,
    idempotencyKey:
      identity.length <= 500
        ? identity
        : `historical-private-evidence-outbox-v1|sha256=${createHash("sha256")
            .update(identity)
            .digest("hex")}`,
    jobId,
  };
}

/** Creates a promise that the second projector call can await until the first binds. */
function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("Finance Task 3 Review B durable projector remediation RED contract", () => {
  it("uses an atomic claim/CAS so concurrent projectors perform one enqueue and no follow-up side effect", async () => {
    const subject = await loadProjectorModule();
    const factory = subject.createHistoricalPrivateEvidenceOutboxProjector;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const currentIntent = intent();
    const firstBound = deferred<Receipt>();
    const findReady = deferred<void>();
    let findCount = 0;
    let claimed = false;
    const stored: { receipt?: Receipt } = {};
    const findByOutboxEventId = vi.fn(async () => {
      findCount += 1;
      if (findCount === 2) findReady.resolve();
      await findReady.promise;
      return stored.receipt;
    });
    const claimReceipt = vi.fn(async (): Promise<ClaimResult> => {
      if (!claimed) {
        claimed = true;
        return {
          status: "claimed",
          claimToken: "claim-token-review-b-001",
        };
      }
      const receipt = await firstBound.promise;
      return { status: "replay", receipt };
    });
    const followUpSideEffects: unknown[] = [];
    const bindReceipt = vi.fn(
      async ({ receipt }: { claimToken: string; receipt: Receipt }) => {
        stored.receipt = receipt;
        firstBound.resolve(receipt);
        followUpSideEffects.push("bind");
        return { status: "bound" as const };
      },
    );
    const enqueue = vi.fn(async () => ({
      outcome: "enqueued" as const,
      jobId,
    }));
    const projectionStore: ProjectionStore = {
      findByOutboxEventId,
      claimReceipt,
      releaseClaim: vi.fn(async () => undefined),
      bindReceipt,
    };
    const projector = factory({
      durableJobs: { enqueue } as DurableJobEnqueuePort,
      projectionStore,
      job: {
        jobName: "finance.historical-private-evidence.import",
        queueName: "finance-historical-imports",
        maxAttempts: 3,
      },
    });

    const results = await Promise.all([
      projector.project(currentIntent),
      projector.project(currentIntent),
    ]);

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(bindReceipt).toHaveBeenCalledTimes(1);
    expect(claimReceipt).toHaveBeenCalledTimes(2);
    expect(followUpSideEffects).toHaveLength(1);
    expect(results.map((result) => result.status).sort()).toEqual([
      "accepted",
      "replay",
    ]);
  });

  it("accepts the maximum source and scope identities while keeping the durable idempotency key within its 500-character contract", async () => {
    const subject = await loadProjectorModule();
    const factory = subject.createHistoricalPrivateEvidenceOutboxProjector;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const maximumCompanyId = "c".repeat(63);
    const maximumSchoolId = "s".repeat(256);
    const maximumIntent = intent({
      outboxEventId: "o".repeat(256),
      auditEventId: "a".repeat(256),
      auditReceiptId: "r".repeat(256),
      scope: {
        companyId: maximumCompanyId,
        schoolId: maximumSchoolId,
      },
      source: {
        sourceSystem: "y".repeat(256),
        sourceVersion: "v".repeat(256),
        sourceIdentity: "i".repeat(256),
      },
      payload: {
        packetVersion: "historical-private-evidence-packet.v1",
        evidenceReference: `private-evidence://${maximumCompanyId}/historical/maximum.json`,
      },
    });
    const enqueue = vi.fn(
      async (request: Readonly<Record<string, unknown>>) => {
        expect(String(request.idempotencyKey).length).toBeLessThanOrEqual(500);
        return { outcome: "enqueued" as const, jobId };
      },
    );
    const bindReceipt = vi.fn(async () => ({ status: "bound" as const }));
    const projector = factory({
      durableJobs: { enqueue } as unknown as DurableJobEnqueuePort,
      projectionStore: {
        findByOutboxEventId: async () => undefined,
        claimReceipt: async () => ({
          status: "claimed" as const,
          claimToken: "claim-token-review-b-002",
        }),
        releaseClaim: async () => undefined,
        bindReceipt,
      },
      job: {
        jobName: "finance.historical-private-evidence.import",
        queueName: "finance-historical-imports",
        maxAttempts: 3,
      },
    });

    await expect(projector.project(maximumIntent)).resolves.toMatchObject({
      status: "accepted",
    });
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(bindReceipt).toHaveBeenCalledTimes(1);
  });

  it("uses constructor-bound claim and enqueue references after dependencies are replaced", async () => {
    const subject = await loadProjectorModule();
    const factory = subject.createHistoricalPrivateEvidenceOutboxProjector;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const currentIntent = intent();
    const enqueue = vi.fn(async () => ({
      outcome: "enqueued" as const,
      jobId,
    }));
    const claimReceipt = vi.fn(async () => ({
      status: "claimed" as const,
      claimToken: "claim-token-bound-ref-001",
    }));
    const bindReceipt = vi.fn(async () => ({ status: "bound" as const }));
    const releaseClaim = vi.fn(async () => undefined);
    const projectionStore: ProjectionStore = {
      findByOutboxEventId: async () => undefined,
      claimReceipt,
      releaseClaim,
      bindReceipt,
    };
    const durableJobs = { enqueue } as DurableJobEnqueuePort;
    const projector = factory({
      durableJobs,
      projectionStore,
      job: {
        jobName: "finance.historical-private-evidence.import",
        queueName: "finance-historical-imports",
        maxAttempts: 3,
      },
    });

    Object.assign(projectionStore, {
      claimReceipt: vi.fn(async () => ({ status: "malformed" })),
    });
    Object.assign(durableJobs, {
      enqueue: vi.fn(async () => ({ outcome: "malformed" })),
    });

    await expect(projector.project(currentIntent)).resolves.toMatchObject({
      status: "accepted",
    });
    expect(claimReceipt).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(bindReceipt).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed non-replay claim without enqueueing", async () => {
    const subject = await loadProjectorModule();
    const factory = subject.createHistoricalPrivateEvidenceOutboxProjector;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const enqueue = vi.fn(async () => ({
      outcome: "enqueued" as const,
      jobId,
    }));
    const projectionStore: ProjectionStore = {
      findByOutboxEventId: async () => undefined,
      claimReceipt: async () =>
        ({ status: "claimed" }) as unknown as ClaimResult,
      releaseClaim: async () => undefined,
      bindReceipt: async () => ({ status: "bound" as const }),
    };
    const projector = factory({
      durableJobs: { enqueue } as DurableJobEnqueuePort,
      projectionStore,
      job: {
        jobName: "finance.historical-private-evidence.import",
        queueName: "finance-historical-imports",
        maxAttempts: 3,
      },
    });

    await expect(projector.project(intent())).rejects.toThrow(
      "FINANCE_PROJECTOR_CLAIM_RESULT_INVALID",
    );
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("returns an enqueue failure to pending so a later retry can enqueue", async () => {
    const subject = await loadProjectorModule();
    const factory = subject.createHistoricalPrivateEvidenceOutboxProjector;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const enqueue = vi
      .fn()
      .mockRejectedValueOnce(new Error("provider unavailable"))
      .mockResolvedValueOnce({ outcome: "enqueued" as const, jobId });
    const claimReceipt = vi.fn(async () => ({
      status: "claimed" as const,
      claimToken: "claim-token-retry-001",
    }));
    const releaseClaim = vi.fn(async () => undefined);
    const bindReceipt = vi.fn(async () => ({ status: "bound" as const }));
    const projector = factory({
      durableJobs: { enqueue } as unknown as DurableJobEnqueuePort,
      projectionStore: {
        findByOutboxEventId: async () => undefined,
        claimReceipt,
        releaseClaim,
        bindReceipt,
      },
      job: {
        jobName: "finance.historical-private-evidence.import",
        queueName: "finance-historical-imports",
        maxAttempts: 3,
      },
    });

    await expect(projector.project(intent())).rejects.toThrow(
      "FINANCE_DURABLE_ENQUEUE_FAILED",
    );
    await expect(projector.project(intent())).resolves.toMatchObject({
      status: "accepted",
    });
    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(releaseClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "pending",
        reason: "enqueue-failed",
        claimToken: "claim-token-retry-001",
      }),
    );
    expect(bindReceipt).toHaveBeenCalledTimes(1);
  });

  it("records reconciliation after bind failure and retries binding without enqueueing", async () => {
    const subject = await loadProjectorModule();
    const factory = subject.createHistoricalPrivateEvidenceOutboxProjector;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const currentIntent = intent();
    const originalReceipt = receiptFor(currentIntent);
    const enqueue = vi.fn(async () => ({
      outcome: "enqueued" as const,
      jobId,
    }));
    const claimReceipt = vi
      .fn()
      .mockResolvedValueOnce({
        status: "claimed" as const,
        claimToken: "claim-token-reconcile-001",
      })
      .mockResolvedValueOnce({
        status: "reconcile" as const,
        claimToken: "claim-token-reconcile-002",
        receipt: originalReceipt,
      });
    const bindReceipt = vi
      .fn()
      .mockRejectedValueOnce(new Error("ledger unavailable"))
      .mockResolvedValueOnce({ status: "bound" as const });
    const releaseClaim = vi.fn(async () => undefined);
    const projector = factory({
      durableJobs: { enqueue } as DurableJobEnqueuePort,
      projectionStore: {
        findByOutboxEventId: async () => undefined,
        claimReceipt,
        releaseClaim,
        bindReceipt,
      },
      job: {
        jobName: "finance.historical-private-evidence.import",
        queueName: "finance-historical-imports",
        maxAttempts: 3,
      },
    });

    await expect(projector.project(currentIntent)).rejects.toThrow(
      "FINANCE_PROJECTOR_BIND_FAILED",
    );
    await expect(projector.project(currentIntent)).resolves.toMatchObject({
      status: "accepted",
    });
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(releaseClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "reconcile",
        reason: "bind-failed",
        receipt: originalReceipt,
      }),
    );
    expect(bindReceipt).toHaveBeenCalledTimes(2);
  });
});
