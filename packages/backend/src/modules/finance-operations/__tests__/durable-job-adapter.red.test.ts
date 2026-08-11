import { describe, expect, it, vi } from "vitest";

import type { DurableJobEnqueuePort } from "../../../jobs/ports.js";

const payloadDigest = "a".repeat(64);

interface PersistedHistoricalPrivateEvidenceIntent {
  /** Immutable outbox event ID created with the Finance record and succeeded audit. */
  readonly outboxEventId: string;
  /** Immutable Finance audit-event ID committed in the same transaction as the intent. */
  readonly auditEventId: string;
  /** Persisted audit receipt binding the intent to Finance's succeeded audit. */
  readonly auditReceiptId: string;
  /** Operation represented by the durable intent. */
  readonly operation: "historical-private-evidence:import";
  /** Company-first optional-school scope committed with the record. */
  readonly scope: { readonly companyId: string; readonly schoolId?: string };
  /** Source identity retained from the owner-attested historical packet. */
  readonly source: {
    readonly sourceSystem: string;
    readonly sourceVersion: string;
    readonly sourceIdentity: string;
  };
  /** Deeply immutable payload locator retained by Finance without a provider object. */
  readonly payload: {
    readonly packetVersion: "historical-private-evidence-packet.v1";
    readonly evidenceReference: string;
  };
  /** Digest of the immutable private-evidence packet. */
  readonly payloadDigest: string;
}

interface HistoricalProjectionStore {
  /** Looks up the sole prior projector receipt for an immutable persisted intent. */
  findByOutboxEventId(
    outboxEventId: string,
  ): Promise<Readonly<ProjectorReceipt> | undefined>;
  /** Binds the accepted durable receipt to the persisted audit and outbox identities. */
  bindReceipt(input: Readonly<ProjectorReceipt>): Promise<void>;
}

interface ProjectorReceipt {
  /** Immutable Finance outbox event already committed by the record repository. */
  readonly outboxEventId: string;
  /** Immutable succeeded audit event committed beside the outbox event. */
  readonly auditEventId: string;
  /** Existing Finance audit receipt to which the durable outcome is bound. */
  readonly auditReceiptId: string;
  /** Collision-free durable idempotency identity. */
  readonly idempotencyKey: string;
  /** Durable job identifier returned by the provider-neutral queue port. */
  readonly jobId: string;
}

type ProjectorResult =
  | {
      readonly status: "accepted";
      readonly receipt: Readonly<ProjectorReceipt>;
    }
  | { readonly status: "replay"; readonly receipt: Readonly<ProjectorReceipt> }
  | {
      readonly status: "conflict";
      readonly receipt: Readonly<ProjectorReceipt>;
      readonly reason: "outbox-identity-mismatch";
    };

interface HistoricalPrivateEvidenceOutboxProjector {
  /** Projects one atomically persisted Finance intent into the durable-job boundary. */
  project(
    intent: Readonly<PersistedHistoricalPrivateEvidenceIntent>,
  ): Promise<ProjectorResult>;
}

interface HistoricalPrivateEvidenceProjectorModule {
  /** Creates the Finance durable projector over the generic provider-neutral enqueue port. */
  createHistoricalPrivateEvidenceOutboxProjector(input: {
    readonly durableJobs: DurableJobEnqueuePort;
    readonly projectionStore: HistoricalProjectionStore;
    readonly job: {
      readonly jobName: string;
      readonly queueName: string;
      readonly maxAttempts: number;
    };
  }): HistoricalPrivateEvidenceOutboxProjector;
}

/** Loads Finance Operations as the public durable-outbox projector boundary. */
async function loadHistoricalPrivateEvidenceProjector(): Promise<HistoricalPrivateEvidenceProjectorModule> {
  return (await import("../index.js")) as unknown as HistoricalPrivateEvidenceProjectorModule;
}

/** Requires the executable projector factory without relying on source-layout inspection. */
function requireProjectorFactory(
  subject: HistoricalPrivateEvidenceProjectorModule,
): HistoricalPrivateEvidenceProjectorModule["createHistoricalPrivateEvidenceOutboxProjector"] {
  expect(
    subject.createHistoricalPrivateEvidenceOutboxProjector,
    "Finance Operations must export createHistoricalPrivateEvidenceOutboxProjector for atomically persisted historical private-evidence intents.",
  ).toBeTypeOf("function");
  return subject.createHistoricalPrivateEvidenceOutboxProjector;
}

/** Builds a deeply frozen outbox intent that the Finance record repository has already committed atomically. */
function persistedIntent(
  overrides: Partial<PersistedHistoricalPrivateEvidenceIntent> = {},
): PersistedHistoricalPrivateEvidenceIntent {
  const defaultScope = {
    companyId: "company-historical",
    schoolId: "school-historical",
  } as const;
  const defaultSource = {
    sourceSystem: "owner-attested-archive",
    sourceVersion: "archive-v1",
    sourceIdentity: "legacy-receipt-001",
  } as const;
  const defaultPayload = {
    packetVersion: "historical-private-evidence-packet.v1" as const,
    evidenceReference:
      "private-evidence://company-historical/historical/receipt-001.json",
  };
  const intent = {
    outboxEventId: "finance-outbox-event-001",
    auditEventId: "finance-audit-event-001",
    auditReceiptId: "finance-audit-receipt-001",
    operation: "historical-private-evidence:import",
    scope: Object.freeze({ ...defaultScope, ...overrides.scope }),
    source: Object.freeze({ ...defaultSource, ...overrides.source }),
    payload: Object.freeze({ ...defaultPayload, ...overrides.payload }),
    payloadDigest,
    ...overrides,
  } satisfies PersistedHistoricalPrivateEvidenceIntent;
  return Object.freeze({
    ...intent,
    scope: Object.freeze({ ...defaultScope, ...overrides.scope }),
    source: Object.freeze({ ...defaultSource, ...overrides.source }),
    payload: Object.freeze({ ...defaultPayload, ...overrides.payload }),
  });
}

/** Generates the delimiter-safe durable identity required for the persisted Finance intent. */
function expectedIdempotencyKey(
  intent: Readonly<PersistedHistoricalPrivateEvidenceIntent>,
): string {
  const encode = (value: string): string => `${value.length}:${value}`;
  return [
    "historical-private-evidence-outbox-v1",
    `operation=${encode(intent.operation)}`,
    `company=${encode(intent.scope.companyId)}`,
    intent.scope.schoolId === undefined
      ? "school=none"
      : `school=some:${encode(intent.scope.schoolId)}`,
    `source-system=${encode(intent.source.sourceSystem)}`,
    `source-version=${encode(intent.source.sourceVersion)}`,
    `source-identity=${encode(intent.source.sourceIdentity)}`,
    `payload-digest=${encode(intent.payloadDigest)}`,
  ].join("|");
}

/** Creates a concrete enqueue-port fake with a caller-selected durable outcome. */
function createDurableJobFake(outcome: unknown): {
  readonly durableJobs: DurableJobEnqueuePort;
  readonly enqueue: ReturnType<typeof vi.fn>;
} {
  const enqueue = vi.fn(async () => outcome);
  return {
    durableJobs: { enqueue } as unknown as DurableJobEnqueuePort,
    enqueue,
  };
}

/** Creates a projection-store fake that can return a receipt only for its exact persisted outbox key. */
function createProjectionStoreFake(
  receiptsByOutboxEventId: ReadonlyMap<
    string,
    Readonly<ProjectorReceipt>
  > = new Map(),
): {
  readonly projectionStore: HistoricalProjectionStore;
  readonly findByOutboxEventId: ReturnType<typeof vi.fn>;
  readonly bindReceipt: ReturnType<typeof vi.fn>;
} {
  const findByOutboxEventId = vi.fn(async (outboxEventId: string) =>
    receiptsByOutboxEventId.get(outboxEventId),
  );
  const bindReceipt = vi.fn(async () => undefined);
  return {
    projectionStore: { findByOutboxEventId, bindReceipt },
    findByOutboxEventId,
    bindReceipt,
  };
}

/** Builds the immutable receipt shape expected from a previously accepted outbox projection. */
function projectorReceipt(
  intent: Readonly<PersistedHistoricalPrivateEvidenceIntent>,
  overrides: Partial<ProjectorReceipt> = {},
): ProjectorReceipt {
  return {
    outboxEventId: intent.outboxEventId,
    auditEventId: intent.auditEventId,
    auditReceiptId: intent.auditReceiptId,
    idempotencyKey: expectedIdempotencyKey(intent),
    jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
    ...overrides,
  };
}

/** Verifies that Finance freezes both its return envelope and its immutable durable receipt. */
function expectFrozenProjectorResult(result: Readonly<ProjectorResult>): void {
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.receipt)).toBe(true);
  expect(() => {
    (result as { status: string }).status = "mutated";
  }).toThrow(TypeError);
  expect(() => {
    (result.receipt as { jobId: string }).jobId = "mutated";
  }).toThrow(TypeError);
}

const jobDefinition = {
  jobName: "finance.historical-private-evidence.import",
  queueName: "finance-historical-imports",
  maxAttempts: 3,
} as const;

/** Builds the exact provider-neutral enqueue call permitted for an immutable outbox intent. */
function expectedEnqueueCall(
  intent: Readonly<PersistedHistoricalPrivateEvidenceIntent>,
): Record<string, unknown> {
  return {
    jobName: jobDefinition.jobName,
    queueName: jobDefinition.queueName,
    tenant: { mode: "tenant", tenantId: intent.scope.companyId },
    idempotencyKey: expectedIdempotencyKey(intent),
    payload: {
      outboxEventId: intent.outboxEventId,
      auditEventId: intent.auditEventId,
    },
    maxAttempts: jobDefinition.maxAttempts,
    availableAt: expect.any(String),
  };
}

describe("Finance historical private-evidence durable outbox RED contract", () => {
  it("creates a collision-free operation/scope/source/digest identity and binds an accepted queue receipt to the already-persisted audit intent", async () => {
    const subject = await loadHistoricalPrivateEvidenceProjector();
    const createProjector = requireProjectorFactory(subject);
    const intent = persistedIntent();
    const durable = createDurableJobFake({
      outcome: "enqueued",
      jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
    });
    const store = createProjectionStoreFake();
    const projector = createProjector({
      durableJobs: durable.durableJobs,
      projectionStore: store.projectionStore,
      job: jobDefinition,
    });
    const beforeProjecting = structuredClone(intent);

    expect(Object.isFrozen(intent)).toBe(true);
    expect(Object.isFrozen(intent.scope)).toBe(true);
    expect(Object.isFrozen(intent.source)).toBe(true);
    expect(Object.isFrozen(intent.payload)).toBe(true);

    const result = await projector.project(intent);
    const idempotencyKey = expectedIdempotencyKey(intent);

    expect(durable.enqueue).toHaveBeenCalledWith(expectedEnqueueCall(intent));
    const expectedReceipt: ProjectorReceipt = {
      outboxEventId: intent.outboxEventId,
      auditEventId: intent.auditEventId,
      auditReceiptId: intent.auditReceiptId,
      idempotencyKey,
      jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
    };
    expect(store.findByOutboxEventId).toHaveBeenCalledTimes(1);
    expect(store.findByOutboxEventId).toHaveBeenCalledWith(
      intent.outboxEventId,
    );
    expect(durable.enqueue).toHaveBeenCalledTimes(1);
    expect(store.bindReceipt).toHaveBeenCalledWith(expectedReceipt);
    expect(store.bindReceipt).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: "accepted", receipt: expectedReceipt });
    expectFrozenProjectorResult(result);
    const storedReceipt = store.bindReceipt.mock
      .calls[0]?.[0] as ProjectorReceipt;
    expect(Object.isFrozen(storedReceipt)).toBe(true);
    expect(() => {
      (storedReceipt as { jobId: string }).jobId = "mutated";
    }).toThrow(TypeError);
    expect(intent).toEqual(beforeProjecting);

    expect(
      expectedIdempotencyKey(
        persistedIntent({
          scope: { companyId: "a|school=some:1:b" },
          source: { ...intent.source, sourceIdentity: "c" },
        }),
      ),
    ).not.toEqual(
      expectedIdempotencyKey(
        persistedIntent({
          scope: { companyId: "a" },
          source: { ...intent.source, sourceIdentity: "b|source-identity=1:c" },
        }),
      ),
    );
  });

  it("returns a receipt-bound replay from the persisted projector ledger without enqueueing again", async () => {
    const subject = await loadHistoricalPrivateEvidenceProjector();
    const createProjector = requireProjectorFactory(subject);
    const intent = persistedIntent();
    const receipt = projectorReceipt(intent);
    const durable = createDurableJobFake({
      outcome: "enqueued",
      jobId: receipt.jobId,
    });
    const replayStore = createProjectionStoreFake(
      new Map([[intent.outboxEventId, receipt]]),
    );
    const replayProjector = createProjector({
      durableJobs: durable.durableJobs,
      projectionStore: replayStore.projectionStore,
      job: jobDefinition,
    });

    const result = await replayProjector.project(intent);
    expect(result).toEqual({
      status: "replay",
      receipt,
    });
    expectFrozenProjectorResult(result);
    expect(replayStore.findByOutboxEventId).toHaveBeenCalledTimes(1);
    expect(replayStore.findByOutboxEventId).toHaveBeenCalledWith(
      intent.outboxEventId,
    );
    expect(durable.enqueue).not.toHaveBeenCalled();
    expect(replayStore.bindReceipt).not.toHaveBeenCalled();
  });

  it("does not treat a receipt stored under another outbox key as a replay for this intent", async () => {
    const subject = await loadHistoricalPrivateEvidenceProjector();
    const createProjector = requireProjectorFactory(subject);
    const intent = persistedIntent();
    const staleReceipt = projectorReceipt(
      persistedIntent({ outboxEventId: "finance-outbox-event-stale" }),
    );
    const durable = createDurableJobFake({
      outcome: "enqueued",
      jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
    });
    const store = createProjectionStoreFake(
      new Map([["finance-outbox-event-stale", staleReceipt]]),
    );
    const projector = createProjector({
      durableJobs: durable.durableJobs,
      projectionStore: store.projectionStore,
      job: jobDefinition,
    });
    const receipt = projectorReceipt(intent);

    const result = await projector.project(intent);

    expect(result).toEqual({ status: "accepted", receipt });
    expectFrozenProjectorResult(result);
    expect(store.findByOutboxEventId).toHaveBeenCalledTimes(1);
    expect(store.findByOutboxEventId).toHaveBeenCalledWith(
      intent.outboxEventId,
    );
    expect(durable.enqueue).toHaveBeenCalledTimes(1);
    expect(durable.enqueue).toHaveBeenCalledWith(expectedEnqueueCall(intent));
    expect(store.bindReceipt).toHaveBeenCalledTimes(1);
    expect(store.bindReceipt).toHaveBeenCalledWith(receipt);
  });

  it.each([
    {
      name: "the payload digest",
      intent: persistedIntent({ payloadDigest: "b".repeat(64) }),
    },
    {
      name: "the outbox event identity",
      intent: persistedIntent({ outboxEventId: "finance-outbox-event-other" }),
    },
    {
      name: "the succeeded audit event identity",
      intent: persistedIntent({ auditEventId: "finance-audit-event-other" }),
    },
    {
      name: "the immutable audit receipt identity",
      intent: persistedIntent({
        auditReceiptId: "finance-audit-receipt-other",
      }),
    },
  ] as const)(
    "fails closed when a persisted projector receipt mismatches $name",
    async ({ intent: conflictingIntent }) => {
      const subject = await loadHistoricalPrivateEvidenceProjector();
      const createProjector = requireProjectorFactory(subject);
      const acceptedIntent = persistedIntent();
      const receipt: ProjectorReceipt = {
        outboxEventId: acceptedIntent.outboxEventId,
        auditEventId: acceptedIntent.auditEventId,
        auditReceiptId: acceptedIntent.auditReceiptId,
        idempotencyKey: expectedIdempotencyKey(acceptedIntent),
        jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
      };
      const durable = createDurableJobFake({
        outcome: "enqueued",
        jobId: receipt.jobId,
      });
      const store = createProjectionStoreFake(
        new Map([[conflictingIntent.outboxEventId, receipt]]),
      );
      const projector = createProjector({
        durableJobs: durable.durableJobs,
        projectionStore: store.projectionStore,
        job: jobDefinition,
      });

      const result = await projector.project(conflictingIntent);
      expect(result).toEqual({
        status: "conflict",
        receipt,
        reason: "outbox-identity-mismatch",
      });
      expectFrozenProjectorResult(result);
      expect(store.findByOutboxEventId).toHaveBeenCalledTimes(1);
      expect(store.findByOutboxEventId).toHaveBeenCalledWith(
        conflictingIntent.outboxEventId,
      );
      expect(durable.enqueue).not.toHaveBeenCalled();
      expect(store.bindReceipt).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      name: "refreshed terminal work",
      outcome: {
        outcome: "refreshed",
        jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
        priorState: "succeeded",
      },
    },
    {
      name: "an active lease retained by the worker",
      outcome: {
        outcome: "active-lease-retained",
        jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
        followUpScheduled: true,
      },
    },
  ] as const)(
    "fails closed instead of mapping $name to a Finance replay",
    async ({ outcome }) => {
      const subject = await loadHistoricalPrivateEvidenceProjector();
      const createProjector = requireProjectorFactory(subject);
      const durable = createDurableJobFake(outcome);
      const store = createProjectionStoreFake();
      const projector = createProjector({
        durableJobs: durable.durableJobs,
        projectionStore: store.projectionStore,
        job: jobDefinition,
      });
      const intent = persistedIntent();

      await expect(projector.project(intent)).rejects.toThrow(
        "FINANCE_DURABLE_OUTCOME_UNSUPPORTED",
      );
      expect(store.findByOutboxEventId).toHaveBeenCalledTimes(1);
      expect(store.findByOutboxEventId).toHaveBeenCalledWith(
        intent.outboxEventId,
      );
      expect(durable.enqueue).toHaveBeenCalledTimes(1);
      expect(durable.enqueue).toHaveBeenCalledWith(expectedEnqueueCall(intent));
      expect(store.bindReceipt).not.toHaveBeenCalled();
    },
  );
});
