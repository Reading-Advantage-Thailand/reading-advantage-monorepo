import { Buffer } from "node:buffer";
import { runInNewContext } from "node:vm";

import { describe, expect, it, vi } from "vitest";

const companyId = "11111111-1111-4111-8111-111111111111";
const schoolId = "school-review-v3";
const jobId = "018f0d8f-31d1-7d50-9f4f-550d34295095";
const payloadDigest = "a".repeat(64);
const objectId = `finance-historical-private-evidence-object-v1|sha256=${"b".repeat(64)}`;

function invalidSha256DigestResults(): ReadonlyArray<{
  readonly name: string;
  readonly value: unknown;
}> {
  const results: Array<{ readonly name: string; readonly value: unknown }> = [
    { name: "undefined", value: undefined },
    {
      name: "plain object",
      value: { byteLength: 32, poison: "POISON_DIGEST_RESULT" },
    },
    { name: "Uint8Array", value: new Uint8Array(32) },
    { name: "DataView", value: new DataView(new ArrayBuffer(32)) },
    { name: "Buffer", value: Buffer.alloc(32) },
  ];
  if (typeof SharedArrayBuffer !== "undefined") {
    const shared = new SharedArrayBuffer(32);
    results.push({ name: "SharedArrayBuffer", value: shared });
    results.push({
      name: "SharedArrayBuffer view",
      value: new Uint8Array(shared),
    });
  }
  return results;
}

function crossRealmSha256Digest(seed: number): {
  readonly buffer: ArrayBuffer;
  readonly hexadecimal: string;
} {
  const buffer = runInNewContext("new ArrayBuffer(32)") as ArrayBuffer;
  const bytes = Uint8Array.from(
    Array.from({ length: 32 }, (_, index) => (seed + index) & 0xff),
  );
  new Uint8Array(buffer).set(bytes);
  return {
    buffer,
    hexadecimal: Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(""),
  };
}

type Intent = {
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
};

type Receipt = {
  readonly outboxEventId: string;
  readonly auditEventId: string;
  readonly auditReceiptId: string;
  readonly objectId: string;
  readonly scope: Readonly<Intent["scope"]>;
  readonly authorizationEvidence: Readonly<Intent["authorizationEvidence"]>;
  readonly policyVersion: string;
  readonly idempotencyKey: string;
  readonly jobId: string;
};

type ClaimResult =
  | { readonly status: "claimed"; readonly claimToken: string }
  | { readonly status: "replay"; readonly receipt: Readonly<Receipt> }
  | {
      readonly status: "reconcile";
      readonly claimToken: string;
      readonly receipt: Readonly<Receipt>;
    };

type ProjectionStore = {
  findByOutboxEventId(
    outboxEventId: string,
  ): Promise<Readonly<Receipt> | undefined>;
  claimReceipt(input: Readonly<Record<string, unknown>>): Promise<ClaimResult>;
  releaseClaim(input: Readonly<Record<string, unknown>>): Promise<void>;
  bindReceipt(input: Readonly<Record<string, unknown>>): Promise<unknown>;
};

type FinanceModule = {
  createHistoricalPrivateEvidenceOutboxProjector(input: {
    durableJobs: {
      enqueue(request: Readonly<Record<string, unknown>>): Promise<unknown>;
    };
    projectionStore: ProjectionStore;
    job: {
      jobName: string;
      queueName: string;
      maxAttempts: number;
    };
  }): {
    project(intent: Readonly<Intent>): Promise<Readonly<Record<string, unknown>>>;
  };
  createHistoricalPrivateEvidenceBindingAdapter(input: {
    reader: {
      readAuthorizedEvidence(
        input: Readonly<Record<string, unknown>>,
      ): Promise<Readonly<Record<string, unknown>>>;
    };
    maxBytes: number;
  }): {
    verify(input: Readonly<Record<string, unknown>>): Promise<unknown>;
  };
};

async function loadFinanceModule(): Promise<FinanceModule> {
  return (await import("../index.js")) as unknown as FinanceModule;
}

function intent(overrides: Partial<Intent> = {}): Intent {
  const value: Intent = {
    outboxEventId: "outbox-review-v3-001",
    auditEventId: "audit-review-v3-001",
    auditReceiptId: "audit-receipt-review-v3-001",
    objectId,
    operation: "historical-private-evidence:import",
    scope: { companyId, schoolId },
    source: {
      sourceSystem: "owner-attested-archive",
      sourceVersion: "archive-v1",
      sourceIdentity: "legacy-receipt-review-v3-001",
    },
    payload: {
      packetVersion: "historical-private-evidence-packet.v1",
      evidenceReference: `private-evidence://${companyId}/historical/receipt.json`,
    },
    authorizationEvidence: {
      source: "company-identity",
      claimsVersion: "company-identity-claims-v3",
      policyVersion: "finance-role-policy-v3",
      subjectId: "employee-review-v3",
      organizationId: companyId,
      appRoleIds: ["role-review-v3"],
      schoolIds: [schoolId],
    },
    payloadDigest,
    ...overrides,
  };
  return Object.freeze({
    ...value,
    scope: Object.freeze(value.scope),
    source: Object.freeze(value.source),
    payload: Object.freeze(value.payload),
    authorizationEvidence: Object.freeze(value.authorizationEvidence),
  });
}

function createStore(options: {
  readonly find?: Readonly<Receipt>;
  readonly findError?: Error;
  readonly claim?: ClaimResult;
  readonly onBind?: (input: Readonly<Record<string, unknown>>) => Promise<unknown>;
} = {}): {
  readonly store: ProjectionStore;
  readonly find: ReturnType<typeof vi.fn>;
  readonly claim: ReturnType<typeof vi.fn>;
  readonly bind: ReturnType<typeof vi.fn>;
  readonly release: ReturnType<typeof vi.fn>;
} {
  const find = vi.fn(async () => {
    if (options.findError !== undefined) throw options.findError;
    return options.find;
  });
  const claim = vi.fn(
    async () =>
      options.claim ?? {
        status: "claimed" as const,
        claimToken: "claim-token-review-v3-001",
      },
  );
  const bind = vi.fn(
    async (input: Readonly<Record<string, unknown>>) =>
      (await options.onBind?.(input)) ?? { status: "bound" as const },
  );
  const release = vi.fn(async () => undefined);
  return {
    store: { findByOutboxEventId: find, claimReceipt: claim, releaseClaim: release, bindReceipt: bind },
    find,
    claim,
    bind,
    release,
  };
}

function createProjector(
  subject: FinanceModule,
  store: ProjectionStore,
  enqueue: ReturnType<typeof vi.fn>,
) {
  return subject.createHistoricalPrivateEvidenceOutboxProjector({
    durableJobs: {
      enqueue: enqueue as unknown as (
        request: Readonly<Record<string, unknown>>,
      ) => Promise<unknown>,
    },
    projectionStore: store,
    job: {
      jobName: "finance.historical-private-evidence.import",
      queueName: "finance-historical-imports",
      maxAttempts: 3,
    },
  });
}

function firstEnqueueRequest(
  enqueue: ReturnType<typeof vi.fn>,
): { readonly idempotencyKey: string } {
  const calls = enqueue.mock.calls as unknown as ReadonlyArray<
    readonly [unknown]
  >;
  const request = calls[0]?.[0];
  if (typeof request !== "object" || request === null) {
    throw new Error("test enqueue request missing");
  }
  return request as { readonly idempotencyKey: string };
}

describe("Finance Task 3 security Review B v3 RED contract", () => {
  it("sanitizes projection receipt lookup failures without exposing provider errors", async () => {
    const subject = await loadFinanceModule();
    const secret = "projection-db=finance-secret-token";
    const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const store = createStore({ findError: new Error(`lookup failed: ${secret}`) });
    const projector = createProjector(subject, store.store, enqueue);

    let failure: unknown;
    try {
      await projector.project(intent());
    } catch (error) {
      failure = error;
    }

    expect(failure).toEqual(
      expect.objectContaining({
        message: "FINANCE_PROJECTOR_RECEIPT_LOOKUP_FAILED",
      }),
    );
    expect(JSON.stringify(failure)).not.toContain(secret);
    expect(store.claim).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("binds the exact acquired claim token and persists the trusted scope/evidence receipt", async () => {
    const subject = await loadFinanceModule();
    const currentIntent = intent();
    const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const store = createStore();
    const projector = createProjector(subject, store.store, enqueue);

    await expect(projector.project(currentIntent)).resolves.toMatchObject({
      status: "accepted",
      receipt: {
        objectId,
        policyVersion: "finance-role-policy-v3",
        authorizationEvidence: currentIntent.authorizationEvidence,
      },
    });
    expect(store.bind).toHaveBeenCalledWith({
      claimToken: "claim-token-review-v3-001",
      receipt: expect.objectContaining({
        objectId,
        policyVersion: "finance-role-policy-v3",
      }),
    });
    expect(store.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        outboxEventId: currentIntent.outboxEventId,
        intent: currentIntent,
      }),
    );
  });

  it("returns the authoritative takeover receipt without releasing through the stale token", async () => {
    const subject = await loadFinanceModule();
    const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    let authoritativeReceipt: Receipt | undefined;
    const store = createStore({
      onBind: async (input) => {
        authoritativeReceipt = input.receipt as Receipt;
        return { status: "stale" as const, receipt: authoritativeReceipt };
      },
    });
    const projector = createProjector(subject, store.store, enqueue);

    await expect(projector.project(intent())).resolves.toMatchObject({
      status: "replay",
      receipt: { jobId },
    });
    expect(store.bind).toHaveBeenCalledWith(
      expect.objectContaining({ claimToken: "claim-token-review-v3-001" }),
    );
    expect(store.release).not.toHaveBeenCalled();
    expect(authoritativeReceipt).toEqual(
      expect.objectContaining({ jobId, objectId }),
    );

    const retryEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const retryStore = createStore({ find: authoritativeReceipt });
    const retryProjector = createProjector(subject, retryStore.store, retryEnqueue);
    await expect(retryProjector.project(intent())).resolves.toMatchObject({
      status: "replay",
      receipt: { jobId },
    });
    expect(retryEnqueue).not.toHaveBeenCalled();
    expect(retryStore.release).not.toHaveBeenCalled();
  });

  it.each([
    { name: "stale extra field", kind: "stale-extra" },
    { name: "stale missing receipt", kind: "stale-missing-receipt" },
    { name: "takeover extra field", kind: "takeover-extra" },
    { name: "takeover missing receipt", kind: "takeover-missing-receipt" },
  ] as const)(
    "rejects a strict ownership-loss envelope ($name) without releasing its lost token",
    async ({ kind }) => {
      const subject = await loadFinanceModule();
      const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const store = createStore({
        onBind: async (input) => {
          const receipt = input.receipt as Receipt;
          switch (kind) {
            case "stale-extra":
              return {
                status: "stale" as const,
                receipt,
                unexpected: "unreviewed",
              };
            case "stale-missing-receipt":
              return { status: "stale" as const };
            case "takeover-extra":
              return {
                status: "conflict" as const,
                reason: "claim-taken-over" as const,
                receipt,
                unexpected: "unreviewed",
              };
            case "takeover-missing-receipt":
              return {
                status: "conflict" as const,
                reason: "claim-taken-over" as const,
              };
          }
        },
      });
      const projector = createProjector(subject, store.store, enqueue);

      const failure = await projector.project(intent()).catch(
        (error: unknown) => error,
      );
      expect(failure).toMatchObject({
        message: "FINANCE_PROJECTOR_BIND_RESULT_INVALID",
      });
      expect(enqueue).toHaveBeenCalledTimes(1);
      expect(store.bind).toHaveBeenCalledTimes(1);
      expect(store.release).not.toHaveBeenCalled();
    },
  );

  it.each([
    { name: "wrong conflict reason", kind: "wrong-reason" },
    { name: "wrong ownership-loss status", kind: "wrong-status" },
  ] as const)(
    "recovers an owned claim for a strict bind envelope with $name",
    async ({ kind }) => {
      const subject = await loadFinanceModule();
      const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const store = createStore({
        onBind: async (input) => {
          const receipt = input.receipt as Receipt;
          return kind === "wrong-reason"
            ? {
                status: "conflict" as const,
                reason: "unreviewed" as const,
                receipt,
              }
            : {
                status: "claim-taken-over" as const,
                reason: "claim-taken-over" as const,
                receipt,
              };
        },
      });
      const projector = createProjector(subject, store.store, enqueue);

      await expect(projector.project(intent())).rejects.toThrow(
        "FINANCE_PROJECTOR_BIND_RESULT_INVALID",
      );
      expect(store.release).toHaveBeenCalledWith(
        expect.objectContaining({
          claimToken: "claim-token-review-v3-001",
          reason: "bind-failed",
        }),
      );
    },
  );

  it("captures an ownership-loss status getter once before strict parsing", async () => {
    const subject = await loadFinanceModule();
    const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    let statusReads = 0;
    const store = createStore({
      onBind: async (input) => ({
        get status() {
          statusReads += 1;
          return statusReads === 1 ? "stale" : "bound";
        },
        receipt: input.receipt,
      }),
    });
    const projector = createProjector(subject, store.store, enqueue);

    await expect(projector.project(intent())).resolves.toMatchObject({
      status: "replay",
      receipt: { jobId },
    });
    expect(statusReads).toBe(1);
    expect(store.release).not.toHaveBeenCalled();
  });

  it("captures a reconciliation takeover reason getter once before strict parsing", async () => {
    const subject = await loadFinanceModule();
    let originalReceipt: Receipt | undefined;
    const seedEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const seedStore = createStore({
      onBind: async (input) => {
        originalReceipt = input.receipt as Receipt;
        return { status: "bound" as const };
      },
    });
    await createProjector(subject, seedStore.store, seedEnqueue).project(intent());
    expect(originalReceipt).toBeDefined();

    const retryEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    let reasonReads = 0;
    const retryStore = createStore({
      claim: {
        status: "reconcile" as const,
        claimToken: "claim-token-reconcile-reason-001",
        receipt: originalReceipt as Receipt,
      },
      onBind: async (input) => ({
        status: "conflict" as const,
        get reason() {
          reasonReads += 1;
          return reasonReads === 1 ? "claim-taken-over" : "receipt-mismatch";
        },
        receipt: input.receipt,
      }),
    });
    const projector = createProjector(subject, retryStore.store, retryEnqueue);

    await expect(projector.project(intent())).resolves.toMatchObject({
      status: "replay",
      receipt: { jobId },
    });
    expect(reasonReads).toBe(1);
    expect(retryEnqueue).not.toHaveBeenCalled();
    expect(retryStore.release).not.toHaveBeenCalled();
  });

  it.each(["receipt getter", "ownKeys proxy"] as const)(
    "maps ownership-loss bind %s poison without releasing its lost token",
    async (poisonKind) => {
      const subject = await loadFinanceModule();
      const secret = `bind-output-${poisonKind}-secret`;
      const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const store = createStore({
        onBind: async (input) => {
          if (poisonKind === "receipt getter") {
            return {
              status: "stale" as const,
              get receipt() {
                throw new Error(secret);
              },
            };
          }
          return new Proxy(
            { status: "stale" as const, receipt: input.receipt },
            {
              ownKeys() {
                throw new Error(secret);
              },
            },
          );
        },
      });
      const projector = createProjector(subject, store.store, enqueue);

      const failure = await projector.project(intent()).catch(
        (error: unknown) => error,
      );
      expect(failure).toMatchObject({
        message: "FINANCE_PROJECTOR_BIND_RESULT_INVALID",
      });
      expect(JSON.stringify(failure)).not.toContain(secret);
      expect(store.release).not.toHaveBeenCalled();
    },
  );

  it.each([
    { name: "stale extra field", kind: "stale-extra" },
    { name: "stale missing receipt", kind: "stale-missing-receipt" },
    { name: "takeover extra field", kind: "takeover-extra" },
    { name: "takeover missing receipt", kind: "takeover-missing-receipt" },
  ] as const)(
    "rejects a strict ownership-loss envelope ($name) during reconciliation without stale-token writes",
    async ({ kind }) => {
      const subject = await loadFinanceModule();
      let originalReceipt: Receipt | undefined;
      const seedEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const seedStore = createStore({
        onBind: async (input) => {
          originalReceipt = input.receipt as Receipt;
          return { status: "bound" as const };
        },
      });
      await createProjector(subject, seedStore.store, seedEnqueue).project(intent());
      expect(originalReceipt).toBeDefined();

      const retryEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const retryStore = createStore({
        claim: {
          status: "reconcile" as const,
          claimToken: "claim-token-reconcile-strict-001",
          receipt: originalReceipt as Receipt,
        },
        onBind: async (input) => {
          const receipt = input.receipt as Receipt;
          switch (kind) {
            case "stale-extra":
              return {
                status: "stale" as const,
                receipt,
                unexpected: "unreviewed",
              };
            case "stale-missing-receipt":
              return { status: "stale" as const };
            case "takeover-extra":
              return {
                status: "conflict" as const,
                reason: "claim-taken-over" as const,
                receipt,
                unexpected: "unreviewed",
              };
            case "takeover-missing-receipt":
              return {
                status: "conflict" as const,
                reason: "claim-taken-over" as const,
              };
          }
        },
      });
      const projector = createProjector(subject, retryStore.store, retryEnqueue);

      const failure = await projector.project(intent()).catch(
        (error: unknown) => error,
      );
      expect(failure).toMatchObject({
        message: "FINANCE_PROJECTOR_BIND_RESULT_INVALID",
      });
      expect(retryEnqueue).not.toHaveBeenCalled();
      expect(retryStore.bind).toHaveBeenCalledTimes(1);
      expect(retryStore.release).not.toHaveBeenCalled();
    },
  );

  it("records a malformed bind CAS result as reconciliation after enqueue", async () => {
    const subject = await loadFinanceModule();
    const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const store = createStore({
      onBind: async () => ({ status: "bound", unexpected: "unreviewed" }),
    });
    const projector = createProjector(subject, store.store, enqueue);

    await expect(projector.project(intent())).rejects.toThrow(
      "FINANCE_PROJECTOR_BIND_RESULT_INVALID",
    );
    expect(store.release).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "reconcile",
        reason: "bind-failed",
        claimToken: "claim-token-review-v3-001",
        receipt: expect.objectContaining({ jobId }),
      }),
    );
  });

  it.each(["stale", "claim-taken-over"] as const)(
    "does not release a lost token when authoritative %s receipt validation fails",
    async (ownershipLoss) => {
      const subject = await loadFinanceModule();
      const secret = `malformed-authoritative-receipt-${ownershipLoss}-secret`;
      const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const store = createStore({
        onBind: async () =>
          ownershipLoss === "stale"
            ? { status: "stale" as const, receipt: { jobId: secret } }
            : {
                status: "conflict" as const,
                reason: "claim-taken-over" as const,
                receipt: { jobId: secret },
              },
      });
      const projector = createProjector(subject, store.store, enqueue);

      const failure = await projector.project(intent()).catch(
        (error: unknown) => error,
      );
      expect(failure).toMatchObject({
        message: "FINANCE_PROJECTOR_BIND_RESULT_INVALID",
      });
      expect(JSON.stringify(failure)).not.toContain(secret);
      expect(enqueue).toHaveBeenCalledTimes(1);
      expect(store.bind).toHaveBeenCalledTimes(1);
      expect(store.release).not.toHaveBeenCalled();
    },
  );

  it.each(["stale", "claim-taken-over"] as const)(
    "does not release a lost reconciliation token when authoritative %s receipt validation fails",
    async (ownershipLoss) => {
      const subject = await loadFinanceModule();
      let originalReceipt: Receipt | undefined;
      const seedEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const seedStore = createStore({
        onBind: async (input) => {
          originalReceipt = input.receipt as Receipt;
          return { status: "bound" as const };
        },
      });
      const seedProjector = createProjector(
        subject,
        seedStore.store,
        seedEnqueue,
      );
      await seedProjector.project(intent());
      expect(originalReceipt).toBeDefined();

      const secret = `malformed-reconcile-receipt-${ownershipLoss}-secret`;
      const retryEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const retryStore = createStore({
        claim: {
          status: "reconcile" as const,
          claimToken: "claim-token-reconcile-malformed-001",
          receipt: originalReceipt as Receipt,
        },
        onBind: async () =>
          ownershipLoss === "stale"
            ? { status: "stale" as const, receipt: { jobId: secret } }
            : {
                status: "conflict" as const,
                reason: "claim-taken-over" as const,
                receipt: { jobId: secret },
              },
      });
      const retryProjector = createProjector(
        subject,
        retryStore.store,
        retryEnqueue,
      );

      const failure = await retryProjector.project(intent()).catch(
        (error: unknown) => error,
      );
      expect(failure).toMatchObject({
        message: "FINANCE_PROJECTOR_BIND_RESULT_INVALID",
      });
      expect(JSON.stringify(failure)).not.toContain(secret);
      expect(retryEnqueue).not.toHaveBeenCalled();
      expect(retryStore.bind).toHaveBeenCalledTimes(1);
      expect(retryStore.release).not.toHaveBeenCalled();
    },
  );

  it("returns the authoritative canonical receipt on a successful replay bind", async () => {
    const subject = await loadFinanceModule();
    const canonicalJobId = "018f0d8f-31d1-7d50-9f4f-550d34295096";
    const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const store = createStore({
      onBind: async (input) => ({
        status: "replay" as const,
        receipt: {
          ...(input.receipt as Receipt),
          jobId: canonicalJobId,
        },
      }),
    });
    const projector = createProjector(subject, store.store, enqueue);

    const result = await projector.project(intent());
    expect(result).toMatchObject({
      status: "replay",
      receipt: { jobId: canonicalJobId },
    });
    expect(
      (result.receipt as { readonly jobId?: string } | undefined)?.jobId,
    ).not.toBe(jobId);
    expect(Object.isFrozen(result.receipt)).toBe(true);
  });

  it("keeps optional school-list and member encodings collision-free", async () => {
    const subject = await loadFinanceModule();
    const keyFor = async (
      schoolIds: readonly string[] | undefined,
    ): Promise<string> => {
      const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const store = createStore();
      const projector = createProjector(subject, store.store, enqueue);
      await projector.project(
        intent({
          scope: { companyId },
          authorizationEvidence: {
            ...intent().authorizationEvidence,
            schoolIds,
          },
        }),
      );
      return firstEnqueueRequest(enqueue).idempotencyKey;
    };

    const pairs = [
      [undefined, ["none"]],
      [["left,right"], ["left", "right"]],
      [["first", "second"], ["second", "first"]],
      [["same"], ["same", "same"]],
    ] as const;
    for (const [first, second] of pairs) {
      await expect(keyFor(first)).resolves.not.toBe(await keyFor(second));
    }
  });

  it("keeps raw source identity out of the durable idempotency key", async () => {
    const subject = await loadFinanceModule();
    const secret = "bearer-token-or-email-source-identity";
    const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const store = createStore();
    const projector = createProjector(subject, store.store, enqueue);

    await projector.project(
      intent({
        source: {
          sourceSystem: "owner-attested-archive",
          sourceVersion: "archive-v1",
          sourceIdentity: secret,
        },
      }),
    );

    const idempotencyKey = firstEnqueueRequest(enqueue).idempotencyKey;
    expect(idempotencyKey).toMatch(
      /^historical-private-evidence-outbox-v1\|sha256=[a-f0-9]{64}$/u,
    );
    expect(idempotencyKey).not.toContain(secret);

    const otherEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const otherProjector = createProjector(subject, createStore().store, otherEnqueue);
    await otherProjector.project(
      intent({
        objectId: objectId.replace(/b+$/u, "c".repeat(64)),
        source: {
          sourceSystem: "owner-attested-archive",
          sourceVersion: "archive-v1",
          sourceIdentity: secret,
        },
      }),
    );
    const otherIdempotencyKey = firstEnqueueRequest(otherEnqueue).idempotencyKey;
    expect(otherIdempotencyKey).not.toBe(idempotencyKey);
  });

  it("maps oversized idempotency-key derivation failures to a stable error", async () => {
    const subject = await loadFinanceModule();
    const secret = "POISON_IDEMPOTENCY_DIGEST_SECRET";
    const digest = vi
      .spyOn(globalThis.crypto.subtle, "digest")
      .mockRejectedValue(new Error(secret));
    try {
      const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const store = createStore();
      const projector = createProjector(subject, store.store, enqueue);
      const oversized = "x".repeat(256);
      const failure = await projector
        .project(
          intent({
            source: {
              sourceSystem: oversized,
              sourceVersion: oversized,
              sourceIdentity: oversized,
            },
          }),
        )
        .catch((error: unknown) => error);
      expect(failure).toEqual(
        expect.objectContaining({
          message: "FINANCE_IDEMPOTENCY_KEY_DERIVATION_FAILED",
        }),
      );
      expect(JSON.stringify(failure)).not.toContain(secret);
      expect(store.find).not.toHaveBeenCalled();
      expect(enqueue).not.toHaveBeenCalled();
    } finally {
      digest.mockRestore();
    }
  });

  it.each([0, 31, 33] as const)(
    "rejects a %s-byte source-identity SHA-256 result before lookup or enqueue",
    async (byteLength) => {
      const subject = await loadFinanceModule();
      const digest = vi
        .spyOn(globalThis.crypto.subtle, "digest")
        .mockResolvedValue(new ArrayBuffer(byteLength));
      try {
        const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
        const store = createStore();
        const projector = createProjector(subject, store.store, enqueue);
        const failure = await projector
          .project(intent())
          .catch((error: unknown) => error);
        expect(failure).toEqual(
          expect.objectContaining({
            message: "FINANCE_IDEMPOTENCY_KEY_DERIVATION_FAILED",
          }),
        );
        expect(String(failure)).not.toContain("POISON");
        expect(JSON.stringify(failure)).not.toContain("POISON");
        expect(store.find).not.toHaveBeenCalled();
        expect(store.claim).not.toHaveBeenCalled();
        expect(enqueue).not.toHaveBeenCalled();
      } finally {
        digest.mockRestore();
      }
    },
  );

  it.each(invalidSha256DigestResults())(
    "rejects a non-ArrayBuffer source digest result ($name) before lookup or enqueue",
    async ({ value: result }) => {
      const subject = await loadFinanceModule();
      const digest = vi
        .spyOn(globalThis.crypto.subtle, "digest")
        .mockResolvedValue(result as unknown as ArrayBuffer);
      try {
        const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
        const store = createStore();
        const projector = createProjector(subject, store.store, enqueue);
        const failure = await projector
          .project(intent())
          .catch((error: unknown) => error);
        expect(failure).toEqual(
          expect.objectContaining({
            message: "FINANCE_IDEMPOTENCY_KEY_DERIVATION_FAILED",
          }),
        );
        expect(JSON.stringify(failure)).not.toContain("POISON");
        expect(store.find).not.toHaveBeenCalled();
        expect(store.claim).not.toHaveBeenCalled();
        expect(store.bind).not.toHaveBeenCalled();
        expect(enqueue).not.toHaveBeenCalled();
      } finally {
        digest.mockRestore();
      }
    },
  );

  it("accepts and copies a cross-realm source-identity digest before provider mutation", async () => {
    const subject = await loadFinanceModule();
    const digestValue = crossRealmSha256Digest(1);
    const boundedKeyDigest = new ArrayBuffer(32);
    new Uint8Array(boundedKeyDigest).fill(0xaa);
    expect(digestValue.buffer).not.toBeInstanceOf(ArrayBuffer);
    let digestCall = 0;
    let oversizedDigestInput: unknown;
    const digest = vi
      .spyOn(globalThis.crypto.subtle, "digest")
      .mockImplementation(async (_algorithm, data) => {
        digestCall += 1;
        if (digestCall === 2) oversizedDigestInput = data;
        return digestCall === 1 ? digestValue.buffer : boundedKeyDigest;
      });
    try {
      const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const store = createStore();
      const projector = createProjector(subject, store.store, enqueue);
      await projector.project(intent());
      const request = firstEnqueueRequest(enqueue);
      new Uint8Array(digestValue.buffer).fill(0xff);

      expect(digestCall).toBe(2);
      expect(oversizedDigestInput).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(oversizedDigestInput as Uint8Array)).toContain(
        `source-identity=sha256:${digestValue.hexadecimal}`,
      );
      expect(request.idempotencyKey).toBe(
        `historical-private-evidence-outbox-v1|sha256=${"aa".repeat(32)}`,
      );
      expect(store.find).toHaveBeenCalledTimes(1);
      expect(store.claim).toHaveBeenCalledTimes(1);
      expect(store.bind).toHaveBeenCalledTimes(1);
    } finally {
      digest.mockRestore();
    }
  });

  it.each([
    ...([0, 31, 33] as const).map((byteLength) => ({
      name: `${byteLength}-byte result`,
      value: new ArrayBuffer(byteLength),
    })),
    ...invalidSha256DigestResults().map(({ name, value }) => ({
      name,
      value,
    })),
  ])(
    "rejects an invalid oversized idempotency SHA-256 result ($name) before lookup or enqueue",
    async ({ value: invalidValue }) => {
      const subject = await loadFinanceModule();
      let digestCall = 0;
        const digest = vi
          .spyOn(globalThis.crypto.subtle, "digest")
          .mockImplementation(async () => {
            digestCall += 1;
            return digestCall === 1
              ? new ArrayBuffer(32)
              : (invalidValue as ArrayBuffer);
          });
      try {
        const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
        const store = createStore();
        const projector = createProjector(subject, store.store, enqueue);
        const oversized = "x".repeat(256);
        const failure = await projector
          .project(
            intent({
              source: {
                sourceSystem: oversized,
                sourceVersion: oversized,
                sourceIdentity: oversized,
              },
            }),
          )
          .catch((error: unknown) => error);
        expect(failure).toEqual(
          expect.objectContaining({
            message: "FINANCE_IDEMPOTENCY_KEY_DERIVATION_FAILED",
          }),
        );
        expect(digestCall).toBe(2);
        expect(String(failure)).not.toContain("POISON");
        expect(JSON.stringify(failure)).not.toContain("POISON");
        expect(store.find).not.toHaveBeenCalled();
        expect(store.claim).not.toHaveBeenCalled();
        expect(store.bind).not.toHaveBeenCalled();
        expect(enqueue).not.toHaveBeenCalled();
      } finally {
        digest.mockRestore();
      }
    },
  );

  it("accepts and copies cross-realm source and oversized-key digests independently", async () => {
    const subject = await loadFinanceModule();
    const sourceDigest = crossRealmSha256Digest(1);
    const oversizedDigest = crossRealmSha256Digest(101);
    expect(sourceDigest.buffer).not.toBeInstanceOf(ArrayBuffer);
    expect(oversizedDigest.buffer).not.toBeInstanceOf(ArrayBuffer);
    let digestCall = 0;
    const digest = vi
      .spyOn(globalThis.crypto.subtle, "digest")
      .mockImplementation(async () => {
        digestCall += 1;
        return digestCall === 1
          ? sourceDigest.buffer
          : oversizedDigest.buffer;
      });
    try {
      const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
      const store = createStore();
      const projector = createProjector(subject, store.store, enqueue);
      const oversized = "x".repeat(256);
      await projector.project(
        intent({
          source: {
            sourceSystem: oversized,
            sourceVersion: oversized,
            sourceIdentity: oversized,
          },
        }),
      );
      const request = firstEnqueueRequest(enqueue);
      new Uint8Array(sourceDigest.buffer).fill(0xff);
      new Uint8Array(oversizedDigest.buffer).fill(0xff);

      expect(digestCall).toBe(2);
      expect(request.idempotencyKey).toBe(
        `historical-private-evidence-outbox-v1|sha256=${oversizedDigest.hexadecimal}`,
      );
      expect(store.find).toHaveBeenCalledTimes(1);
      expect(store.claim).toHaveBeenCalledTimes(1);
      expect(store.bind).toHaveBeenCalledTimes(1);
    } finally {
      digest.mockRestore();
    }
  });

  it("rejects authorization evidence from another company before enqueue or claim", async () => {
    const subject = await loadFinanceModule();
    const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const store = createStore();
    const projector = createProjector(subject, store.store, enqueue);

    await expect(
      projector.project(
        intent({
          authorizationEvidence: {
            ...intent().authorizationEvidence,
            organizationId: "22222222-2222-4222-8222-222222222222",
          },
        }),
      ),
    ).rejects.toThrow("FINANCE_OUTBOX_INTENT_INVALID");
    expect(store.find).not.toHaveBeenCalled();
    expect(store.claim).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("treats changed policy/evidence as a conflict instead of replaying an old receipt", async () => {
    const subject = await loadFinanceModule();
    const acceptedIntent = intent();
    const firstEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const firstStore = createStore();
    const firstProjector = createProjector(subject, firstStore.store, firstEnqueue);
    const firstResult = await firstProjector.project(acceptedIntent);
    const receipt = (firstResult.receipt ?? {}) as unknown as Receipt;

    const changedIntent = intent({
      authorizationEvidence: {
        ...acceptedIntent.authorizationEvidence,
        policyVersion: "finance-role-policy-v4",
        subjectId: "employee-review-v3-replaced",
      },
    });
    const replayEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const replayStore = createStore({ find: receipt });
    const replayProjector = createProjector(subject, replayStore.store, replayEnqueue);

    await expect(replayProjector.project(changedIntent)).resolves.toMatchObject({
      status: "conflict",
      reason: "outbox-identity-mismatch",
    });
    expect(replayEnqueue).not.toHaveBeenCalled();
    expect(replayStore.bind).not.toHaveBeenCalled();
  });

  it("reconciles only the original receipt and rejects changed intent after bind failure", async () => {
    const subject = await loadFinanceModule();
    const originalIntent = intent();
    const enqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    let originalReceipt: Readonly<Record<string, unknown>> | undefined;
    const firstStore = createStore({
      onBind: async (input) => {
        originalReceipt = input.receipt as Readonly<Record<string, unknown>>;
        throw new Error("ledger unavailable");
      },
    });
    const firstProjector = createProjector(subject, firstStore.store, enqueue);

    await expect(firstProjector.project(originalIntent)).rejects.toThrow(
      "FINANCE_PROJECTOR_BIND_FAILED",
    );
    expect(firstStore.release).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "reconcile",
        intent: originalIntent,
        receipt: originalReceipt,
      }),
    );

    const changedIntent = intent({
      authorizationEvidence: {
        ...originalIntent.authorizationEvidence,
        policyVersion: "finance-role-policy-v4",
      },
    });
    const retryEnqueue = vi.fn(async () => ({ outcome: "enqueued", jobId }));
    const retryStore = createStore({
      claim: {
        status: "reconcile",
        claimToken: "claim-token-reconcile-v3-002",
        receipt: originalReceipt as Receipt,
      },
    });
    const retryProjector = createProjector(subject, retryStore.store, retryEnqueue);

    await expect(retryProjector.project(changedIntent)).resolves.toMatchObject({
      status: "conflict",
      reason: "outbox-identity-mismatch",
    });
    expect(retryEnqueue).not.toHaveBeenCalled();
    expect(retryStore.bind).not.toHaveBeenCalled();
  });

  it("keeps the binding adapter on construction-bound reader and byte-limit references", async () => {
    const subject = await loadFinanceModule();
    const firstReader = {
      readAuthorizedEvidence: vi.fn(async (input: Readonly<Record<string, unknown>>) => ({
        evidenceReference: input.evidenceReference,
        payloadDigest,
      })),
    };
    const replacementReader = {
      readAuthorizedEvidence: vi.fn(async () => ({
        evidenceReference: "private-evidence://wrong-company/replaced.json",
        payloadDigest: "f".repeat(64),
      })),
    };
    const dependencies = { reader: firstReader, maxBytes: 64 };
    const adapter = subject.createHistoricalPrivateEvidenceBindingAdapter(dependencies);
    dependencies.reader = replacementReader;
    dependencies.maxBytes = 999;

    await adapter.verify({
      evidenceReference: `private-evidence://${companyId}/historical/receipt.json`,
      scope: { companyId },
      expectedPayloadDigest: payloadDigest,
      authorization: {
        source: "company-identity",
        claimsVersion: "company-identity-claims-v1",
        policyVersion: "finance-role-policy-v3",
        subjectId: "employee-review-v3",
        organizationId: companyId,
        appRoleIds: ["role-review-v3"],
      },
    });
    expect(firstReader.readAuthorizedEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ maxBytes: 64 }),
    );
    expect(replacementReader.readAuthorizedEvidence).not.toHaveBeenCalled();
  });
});
