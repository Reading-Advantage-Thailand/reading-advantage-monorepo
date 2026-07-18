import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { AuditEvent } from "../contracts/audit.js";
import type {
  ScopedAdapterAccess,
  TransactionContext,
  TransactionPort,
} from "../contracts/context.js";
import type {
  CapabilityHandler,
  CommandCapabilityDescriptor,
} from "../contracts/descriptors.js";
import type {
  DurableIdempotencyPort,
  IdempotencyAcquireRequest,
  IdempotencyAcquireResult,
  IdempotencyConflictBehavior,
} from "../contracts/idempotency.js";
import { createAllowedProjectionContract } from "../contracts/projections.js";
import {
  createCapabilityExecutor,
  createCapabilityRegistry,
  type CapabilityRegistrationReferences,
} from "../runtime.js";

const auditProjection = createAllowedProjectionContract({
  projectorId: "kernel.hardening.audit",
  shape: { resourceId: z.string().min(1) },
});

function descriptor(
  conflict: "reject" | "replay",
  audited = true,
): CommandCapabilityDescriptor<unknown, { status: "published" }> {
  return {
    id: `kernel.hardening.${conflict}.${audited ? "audited" : "plain"}`,
    summary: "Exercises reviewed kernel invariants.",
    owner: {
      package: "@reading-advantage/backend",
      module: "kernel-hardening",
    },
    input: z.unknown(),
    output: z.strictObject({ status: z.literal("published") }),
    auth: "public",
    risk: "ordinary",
    authorization: { mode: "none" },
    tenancy: {
      mode: "global",
      globalPolicyId: "kernel.hardening.global",
    },
    errors: [],
    audit: audited
      ? {
          mode: "required",
          eventType: "kernel.hardening.executed",
          metadataProjection: auditProjection.reference,
          immutable: true,
        }
      : { mode: "none" },
    observability: {
      operationName: "kernel.hardening.execute",
      timeoutMs: 2_000,
      cancellation: "supported",
      logLevel: "info",
    },
    kind: "command",
    transaction: { mode: "required" },
    idempotency: {
      mode: "required",
      keySchema: z.string().min(1).max(200),
      scope: "global-capability",
      retentionSeconds: 3_600,
      conflict,
    },
  };
}

interface HarnessOptions {
  readonly descriptor?: CommandCapabilityDescriptor<unknown, unknown>;
  readonly handler?: CapabilityHandler<unknown, unknown>;
  readonly acquireResult?: IdempotencyAcquireResult<unknown>;
  readonly transactionRun?: (
    policy: unknown,
    operation: (context: Readonly<TransactionContext>) => Promise<unknown>,
  ) => Promise<unknown>;
}

function references(): CapabilityRegistrationReferences {
  return {
    authorizationPolicies: { getAuthorizationPolicy: () => undefined },
    globalTenancyPolicies: {
      getGlobalTenancyPolicy: (policyId) =>
        policyId === "kernel.hardening.global"
          ? {
              policyId,
              ownerPackage: "@reading-advantage/backend",
            }
          : undefined,
    },
    tenantResolvers: { getTenantResolver: () => undefined },
    structuredProjectors: { getProjector: () => undefined },
    auditProjectors: {
      getAuditProjector: (reference) =>
        reference.projectorId === auditProjection.reference.projectorId &&
        reference.schemaIdentity === auditProjection.reference.schemaIdentity
          ? {
              contract: auditProjection,
              project: async () => ({ resourceId: "resource-1" }),
            }
          : undefined,
    },
    resourceReferenceProjectors: {
      getResourceReferenceProjector: () => undefined,
    },
    externalCallProtocols: { hasExternalCallProtocol: () => false },
  };
}

function createHarness(options: HarnessOptions = {}) {
  const capability = options.descriptor ?? descriptor("replay");
  const resolvedReferences = references();
  const registry = createCapabilityRegistry({
    ownership: { allows: () => true },
    references: resolvedReferences,
  });
  const handler = vi.fn<CapabilityHandler<unknown, unknown>>(
    options.handler ?? (async () => ({ status: "published" })),
  );
  registry.register({
    descriptor: capability,
    handler,
    sourceModule: "packages/backend/src/modules/kernel-hardening.ts",
  });

  const requests: IdempotencyAcquireRequest[] = [];
  const conflictPolicies: IdempotencyConflictBehavior[] = [];
  const acquire = vi.fn(async (request: IdempotencyAcquireRequest) => {
    requests.push(request);
    return options.acquireResult ?? {
      status: "owner" as const,
      ownershipToken: "owner-1",
    };
  });
  const acquireWithPolicy = vi.fn(async (
    request: IdempotencyAcquireRequest,
    conflict: IdempotencyConflictBehavior,
  ) => {
    conflictPolicies.push(conflict);
    return await acquire(request);
  });
  const complete = vi.fn<DurableIdempotencyPort["complete"]>(async () => {});
  const fail = vi.fn<DurableIdempotencyPort["fail"]>(async () => {});
  const auditEvents: AuditEvent[] = [];
  const append = vi.fn(async (event: Readonly<AuditEvent>) => {
    auditEvents.push(event as AuditEvent);
    return {
      eventId: event.eventId,
      persistedAt: "2026-07-18T00:00:00.000Z",
    };
  });
  const scopedAdapters: ScopedAdapterAccess = {
    get: <TAdapter>() => ({}) as TAdapter,
  };
  const defaultTransactionRun =
    async (
      _policy: unknown,
      operation: (context: Readonly<TransactionContext>) => Promise<unknown>,
    ) => await operation({ adapters: scopedAdapters });
  const transactionRun = vi.fn(
    options.transactionRun ?? defaultTransactionRun,
  );
  const executor = createCapabilityExecutor({
    registry,
    authentication: { authenticate: async () => null },
    tenancy: {
      resolve: async () => ({ mode: "global" }) as never,
    },
    authorization: { authorize: async () => ({ allowed: true }) },
    transactions: { run: transactionRun as TransactionPort["run"] },
    idempotency: {
      acquire: acquire as DurableIdempotencyPort["acquire"],
      acquireWithPolicy:
        acquireWithPolicy as NonNullable<DurableIdempotencyPort["acquireWithPolicy"]>,
      complete,
      fail,
    },
    audit: { append },
    references: resolvedReferences,
    adapters: scopedAdapters,
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
    },
    span: { setAttributes: () => {} },
    clock: { now: () => new Date("2026-07-18T00:00:00.000Z") },
    createCorrelationId: () => "correlation-hardening",
  });

  return {
    acquire,
    auditEvents,
    complete,
    conflictPolicies,
    executor,
    fail,
    handler,
    requests,
    transactionRun,
  };
}

function invocation(input: unknown, key = "kernel-hardening-key") {
  return {
    capabilityId: "kernel.hardening.replay.audited",
    input,
    evidence: { kind: "anonymous" as const },
    idempotencyKey: key,
  };
}

describe("idempotency conflict policy hardening", () => {
  it("replays only when the descriptor explicitly permits replay", async () => {
    const replay = createHarness({
      acquireResult: { status: "replay", output: { status: "published" } },
    });
    await expect(replay.executor.execute(invocation({ value: 1 }))).resolves
      .toEqual({ status: "published" });
    expect(replay.conflictPolicies).toEqual(["replay"]);
    expect(replay.handler).not.toHaveBeenCalled();

    const rejectDescriptor = descriptor("reject");
    const reject = createHarness({
      descriptor: rejectDescriptor,
      acquireResult: { status: "replay", output: { status: "published" } },
    });
    await expect(reject.executor.execute({
      ...invocation({ value: 1 }),
      capabilityId: rejectDescriptor.id,
    })).rejects.toMatchObject({
      code: "IDEMPOTENCY_REPLAY_REJECTED",
      retryable: false,
    });
    expect(reject.conflictPolicies).toEqual(["reject"]);
    expect(reject.handler).not.toHaveBeenCalled();
  });
});

describe("transaction callback integrity", () => {
  it("rejects a skipped callback without success audit or settlement", async () => {
    const harness = createHarness({
      transactionRun: async () => ({ status: "published" }),
    });
    await expect(harness.executor.execute(invocation({ value: 1 }))).rejects
      .toMatchObject({ code: "INTERNAL_ERROR" });
    expect(harness.handler).not.toHaveBeenCalled();
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.fail).toHaveBeenCalledWith(expect.objectContaining({
      disposition: "store-terminal",
    }));
    expect(harness.auditEvents.map((event) => event.outcome)).toEqual(["failure"]);
  });

  it("rejects a double callback while invoking the handler only once", async () => {
    const harness = createHarness({
      transactionRun: async (_policy, operation) => {
        const context = {
          adapters: { get: <TAdapter>() => ({}) as TAdapter },
        };
        const first = await operation(context);
        try {
          await operation(context);
        } catch {
          // A malicious adapter may swallow the callback-integrity failure.
        }
        return first;
      },
    });
    await expect(harness.executor.execute(invocation({ value: 1 }))).rejects
      .toMatchObject({ code: "INTERNAL_ERROR" });
    expect(harness.handler).toHaveBeenCalledTimes(1);
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.auditEvents.map((event) => event.outcome)).toEqual(["failure"]);
  });

  it("rejects a transaction adapter that replaces the callback result", async () => {
    const harness = createHarness({
      transactionRun: async (_policy, operation) => {
        await operation({
          adapters: { get: <TAdapter>() => ({}) as TAdapter },
        });
        return { status: "published" };
      },
    });
    await expect(harness.executor.execute(invocation({ value: 1 }))).rejects
      .toMatchObject({ code: "INTERNAL_ERROR" });
    expect(harness.handler).toHaveBeenCalledTimes(1);
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.auditEvents.map((event) => event.outcome)).toEqual(["failure"]);
  });

  it("rejects unsupported replay output before transaction commit", async () => {
    const unsafeDescriptor = {
      ...descriptor("replay"),
      id: "kernel.hardening.unsupported-output",
      output: z.unknown(),
    } satisfies CommandCapabilityDescriptor<unknown, unknown>;
    let rolledBack = false;
    const harness = createHarness({
      descriptor: unsafeDescriptor,
      handler: async () => ({
        executable: function privateCredentialValue() {},
      }),
      transactionRun: async (_policy, operation) => {
        try {
          return await operation({
            adapters: { get: <TAdapter>() => ({}) as TAdapter },
          });
        } catch (error) {
          rolledBack = true;
          throw error;
        }
      },
    });
    await expect(harness.executor.execute({
      ...invocation({ value: 1 }),
      capabilityId: unsafeDescriptor.id,
    })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(rolledBack).toBe(true);
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.auditEvents.map((event) => event.outcome)).toEqual(["failure"]);
  });
});

describe("request fingerprint hardening", () => {
  it("is tagged, collision-safe, deterministic, and cycle-safe", async () => {
    const fingerprints = new Map<string, string>();
    const capture = async (label: string, input: unknown): Promise<string> => {
      const harness = createHarness({
        descriptor: descriptor("replay", false),
        acquireResult: {
          status: "conflict",
          code: "IDEMPOTENCY_IN_PROGRESS",
          retryable: true,
        },
      });
      await expect(harness.executor.execute({
        ...invocation(input, `key-${label}`),
        capabilityId: "kernel.hardening.replay.plain",
      })).rejects.toMatchObject({ code: "IDEMPOTENCY_IN_PROGRESS" });
      const value = harness.requests[0]?.inputFingerprint;
      if (value === undefined) throw new Error("Fingerprint was not captured.");
      fingerprints.set(label, value);
      return value;
    };

    const distinctValues = [
      undefined,
      null,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -0,
      0,
      1n,
      "1",
      new Date("2026-07-18T00:00:00.000Z"),
      { nested: [undefined, Number.NaN, 1n] },
    ];
    for (const [index, value] of distinctValues.entries()) {
      await capture(`distinct-${index}`, value);
    }
    expect(new Set(fingerprints.values()).size).toBe(distinctValues.length);

    const mapLeft = new Map<unknown, unknown>([["b", 2], ["a", 1]]);
    const mapRight = new Map<unknown, unknown>([["a", 1], ["b", 2]]);
    expect(await capture("map-left", mapLeft)).not.toBe(
      await capture("map-right", mapRight),
    );
    expect(await capture("set-left", new Set([3, 1, 2]))).not.toBe(
      await capture("set-right", new Set([1, 2, 3])),
    );

    const firstCycle: { name: string; self?: unknown } = { name: "cycle" };
    firstCycle.self = firstCycle;
    const secondCycle: { self?: unknown; name: string } = { name: "cycle" };
    secondCycle.self = secondCycle;
    expect(await capture("cycle-left", firstCycle)).toBe(
      await capture("cycle-right", secondCycle),
    );
    expect(await capture("cycle", firstCycle)).not.toBe(
      await capture("acyclic", { name: "cycle", self: null }),
    );
  });

  it("normalizes unsupported values without exposing their contents", async () => {
    const harness = createHarness({ descriptor: descriptor("replay", false) });
    const sensitive = function privateCredentialValue() {};
    await expect(harness.executor.execute({
      ...invocation(sensitive),
      capabilityId: "kernel.hardening.replay.plain",
    })).rejects.toEqual(expect.objectContaining({
      code: "INTERNAL_ERROR",
      message: "The operation could not be completed.",
    }));
    expect(harness.acquire).not.toHaveBeenCalled();
  });
});
