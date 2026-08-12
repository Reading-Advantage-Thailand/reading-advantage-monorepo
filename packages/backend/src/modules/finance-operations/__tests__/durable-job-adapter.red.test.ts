import { createHash } from "node:crypto";
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
  /** Opaque Finance object identity bound to the audit and worker intent. */
  readonly objectId: string;
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
  /** Company Identity evidence retained by the outbox for worker authorization. */
  readonly authorizationEvidence: {
    readonly source: "company-identity";
    readonly claimsVersion: string;
    readonly policyVersion: string;
    readonly subjectId: string;
    readonly organizationId: string;
    readonly appRoleIds: readonly string[];
    readonly schoolIds?: readonly string[];
  };
  /** Digest of the immutable private-evidence packet. */
  readonly payloadDigest: string;
}

interface HistoricalProjectionStore {
  /** Looks up the sole prior projector receipt for an immutable persisted intent. */
  findByOutboxEventId(
    outboxEventId: string,
  ): Promise<Readonly<ProjectorReceipt> | undefined>;
  /** Binds the accepted durable receipt under the exact claim lease token. */
  bindReceipt(input: Readonly<{ claimToken: string; receipt: ProjectorReceipt }>): Promise<unknown>;
  /** Atomically claims the receipt identity before enqueueing. */
  claimReceipt(
    input: Readonly<{
      readonly outboxEventId: string;
      readonly idempotencyKey: string;
      readonly intent: Readonly<PersistedHistoricalPrivateEvidenceIntent>;
    }>,
  ): Promise<
    | { readonly status: "claimed"; readonly claimToken: string }
    | {
        readonly status: "replay";
        readonly receipt: Readonly<ProjectorReceipt>;
      }
    | {
        readonly status: "reconcile";
        readonly claimToken: string;
        readonly receipt: Readonly<ProjectorReceipt>;
      }
  >;
  /** Returns a failed claim to pending or durable reconciliation. */
  releaseClaim(input: Readonly<Record<string, unknown>>): Promise<void>;
}

interface ProjectorReceipt {
  /** Immutable Finance outbox event already committed by the record repository. */
  readonly outboxEventId: string;
  /** Immutable succeeded audit event committed beside the outbox event. */
  readonly auditEventId: string;
  /** Existing Finance audit receipt to which the durable outcome is bound. */
  readonly auditReceiptId: string;
  /** Opaque Finance object identity bound to the audit and worker intent. */
  readonly objectId: string;
  /** Company and optional school scope retained by the receipt. */
  readonly scope: { readonly companyId: string; readonly schoolId?: string };
  /** Authorization evidence retained by the receipt. */
  readonly authorizationEvidence: PersistedHistoricalPrivateEvidenceIntent["authorizationEvidence"];
  /** Policy version retained by the receipt. */
  readonly policyVersion: string;
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
    objectId:
      "finance-historical-private-evidence-object-v1|sha256=" + "b".repeat(64),
    operation: "historical-private-evidence:import",
    scope: Object.freeze({ ...defaultScope, ...overrides.scope }),
    source: Object.freeze({ ...defaultSource, ...overrides.source }),
    payload: Object.freeze({ ...defaultPayload, ...overrides.payload }),
    authorizationEvidence: {
      source: "company-identity",
      claimsVersion: "company-identity-claims-v1",
      policyVersion: "finance-historical-import-role-policy-v1",
      subjectId: "employee-historical-importer",
      organizationId: defaultScope.companyId,
      appRoleIds: ["role-historical-private-evidence-import"],
      schoolIds: [defaultScope.schoolId],
    },
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
  const encode = (value: string): string =>
    `${new TextEncoder().encode(value).byteLength}:${value}`;
  const sourceIdentityDomain = new TextEncoder().encode(
    "reading-advantage.finance.historical-private-evidence.source-identity.v1",
  );
  const sourceIdentityBytes = new TextEncoder().encode(
    intent.source.sourceIdentity,
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
    `operation=${encode(intent.operation)}`,
    `company=${encode(intent.scope.companyId)}`,
    intent.scope.schoolId === undefined
      ? "school=none"
      : `school=some:${encode(intent.scope.schoolId)}`,
    `source-system=${encode(intent.source.sourceSystem)}`,
    `source-version=${encode(intent.source.sourceVersion)}`,
    `source-identity=sha256:${sourceIdentityDigest}`,
    `payload-digest=${encode(intent.payloadDigest)}`,
    `object-id=${encode(intent.objectId)}`,
    `claims-version=${encode(intent.authorizationEvidence.claimsVersion)}`,
    `policy-version=${encode(intent.authorizationEvidence.policyVersion)}`,
    `subject-id=${encode(intent.authorizationEvidence.subjectId)}`,
    `organization-id=${encode(intent.authorizationEvidence.organizationId)}`,
    `app-role-ids=${encodeList(intent.authorizationEvidence.appRoleIds)}`,
    `school-ids=${encodeList(intent.authorizationEvidence.schoolIds)}`,
  ].join("|");
  if (identity.length <= 500) return identity;
  return `historical-private-evidence-outbox-v1|sha256=${createHash("sha256")
    .update(identity)
    .digest("hex")}`;
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
  readonly claimReceipt: ReturnType<typeof vi.fn>;
  readonly releaseClaim: ReturnType<typeof vi.fn>;
} {
  const findByOutboxEventId = vi.fn(async (outboxEventId: string) =>
    receiptsByOutboxEventId.get(outboxEventId),
  );
  const bindReceipt = vi.fn(async () => ({ status: "bound" as const }));
  const claimReceipt = vi.fn(async () => ({
    status: "claimed" as const,
    claimToken: "claim-token-adapter-001",
  }));
  const releaseClaim = vi.fn(async () => undefined);
  return {
    projectionStore: {
      findByOutboxEventId,
      bindReceipt,
      claimReceipt,
      releaseClaim,
    },
    findByOutboxEventId,
    bindReceipt,
    claimReceipt,
    releaseClaim,
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
    objectId: intent.objectId,
    scope: intent.scope,
    authorizationEvidence: intent.authorizationEvidence,
    policyVersion: intent.authorizationEvidence.policyVersion,
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
      objectId: intent.objectId,
      authorizationEvidence: intent.authorizationEvidence,
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
      objectId: intent.objectId,
      scope: intent.scope,
      authorizationEvidence: intent.authorizationEvidence,
      policyVersion: intent.authorizationEvidence.policyVersion,
      idempotencyKey,
      jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
    };
    expect(store.findByOutboxEventId).toHaveBeenCalledTimes(1);
    expect(store.findByOutboxEventId).toHaveBeenCalledWith(
      intent.outboxEventId,
    );
    expect(durable.enqueue).toHaveBeenCalledTimes(1);
    expect(store.bindReceipt).toHaveBeenCalledWith({
      claimToken: "claim-token-adapter-001",
      receipt: expectedReceipt,
    });
    expect(store.bindReceipt).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: "accepted", receipt: expectedReceipt });
    expectFrozenProjectorResult(result);
    const storedReceipt = store.bindReceipt.mock.calls[0]?.[0]
      ?.receipt as ProjectorReceipt;
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

  it("binds source identity into the key by digest without exposing it or duplicating object identity", async () => {
    const subject = await loadHistoricalPrivateEvidenceProjector();
    const createProjector = requireProjectorFactory(subject);
    const sourceSecretA = "source-A-bearer-token-or-email";
    const sourceSecretB = "source-B-bearer-token-or-email";

    const projectWithSourceIdentity = async (
      sourceIdentity: string,
      outboxEventId: string,
    ): Promise<string> => {
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
      await projector.project(
        persistedIntent({
          outboxEventId,
          source: { ...persistedIntent().source, sourceIdentity },
        }),
      );
      return durable.enqueue.mock.calls[0]?.[0]?.idempotencyKey as string;
    };

    const firstKey = await projectWithSourceIdentity(
      sourceSecretA,
      "finance-outbox-source-a",
    );
    const secondKey = await projectWithSourceIdentity(
      sourceSecretB,
      "finance-outbox-source-b",
    );

    expect(firstKey).not.toBe(secondKey);
    expect(firstKey).toMatch(
      /^historical-private-evidence-outbox-v1\|sha256=[a-f0-9]{64}$/u,
    );
    expect(secondKey).toMatch(
      /^historical-private-evidence-outbox-v1\|sha256=[a-f0-9]{64}$/u,
    );
    expect(firstKey).not.toContain(sourceSecretA);
    expect(secondKey).not.toContain(sourceSecretB);
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
    expect(store.bindReceipt).toHaveBeenCalledWith({
      claimToken: "claim-token-adapter-001",
      receipt,
    });
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
        objectId: acceptedIntent.objectId,
        scope: acceptedIntent.scope,
        authorizationEvidence: acceptedIntent.authorizationEvidence,
        policyVersion: acceptedIntent.authorizationEvidence.policyVersion,
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
