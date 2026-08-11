import { describe, expect, it, vi } from "vitest";

import type { DurableJobEnqueuePort } from "../../../jobs/ports.js";

const payloadDigest = "a".repeat(64);
const jobId = "018f0d8f-31d1-7d50-9f4f-550d34295095";
const companyId = "11111111-1111-4111-8111-111111111111";

interface Intent {
  readonly outboxEventId: string;
  readonly auditEventId: string;
  readonly auditReceiptId: string;
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
  readonly payloadDigest: string;
}

interface Receipt {
  readonly outboxEventId: string;
  readonly auditEventId: string;
  readonly auditReceiptId: string;
  readonly idempotencyKey: string;
  readonly jobId: string;
}

type ClaimResult =
  | { readonly status: "claimed" }
  | { readonly status: "replay"; readonly receipt: Readonly<Receipt> };

interface ProjectionStore {
  findByOutboxEventId(
    outboxEventId: string,
  ): Promise<Readonly<Receipt> | undefined>;
  claimReceipt(input: Readonly<{
    readonly outboxEventId: string;
    readonly idempotencyKey: string;
  }>): Promise<Readonly<ClaimResult>>;
  bindReceipt(input: Readonly<Receipt>): Promise<void>;
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
    project(intent: Readonly<Intent>): Promise<Readonly<{
      readonly status: string;
      readonly receipt: Receipt;
    }>>;
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
    payloadDigest,
    ...overrides,
  };
  return Object.freeze({
    ...value,
    scope: Object.freeze(value.scope),
    source: Object.freeze(value.source),
    payload: Object.freeze(value.payload),
  });
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
        return { status: "claimed" };
      }
      const receipt = await firstBound.promise;
      return { status: "replay", receipt };
    });
    const followUpSideEffects: unknown[] = [];
    const bindReceipt = vi.fn(async (receipt: Receipt) => {
      stored.receipt = receipt;
      firstBound.resolve(receipt);
      followUpSideEffects.push("bind");
    });
    const enqueue = vi.fn(async () => ({
      outcome: "enqueued" as const,
      jobId,
    }));
    const projectionStore: ProjectionStore = {
      findByOutboxEventId,
      claimReceipt,
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
    const enqueue = vi.fn(async (request: Readonly<Record<string, unknown>>) => {
      expect(String(request.idempotencyKey).length).toBeLessThanOrEqual(500);
      return { outcome: "enqueued" as const, jobId };
    });
    const bindReceipt = vi.fn(async () => undefined);
    const projector = factory({
      durableJobs: { enqueue } as unknown as DurableJobEnqueuePort,
      projectionStore: {
        findByOutboxEventId: async () => undefined,
        claimReceipt: async () => ({ status: "claimed" as const }),
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
});
