import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { z } from "zod";

import {
  auditEventSchema,
  type AuditEvent,
  type AuditMetadataProjectorDefinition,
} from "../contracts/audit.js";
import type {
  AdapterToken,
  AuthenticationPort,
  AuthorizationPort,
  CapabilityClock,
  CapabilityLogger,
  CapabilitySpan,
  ResourceReferenceProjectorDefinition,
  ScopedAdapterAccess,
  TenantResolutionRequest,
  TenantResolutionPort,
  TransactionContext,
  TransactionPort,
  TrustedTenantForMode,
  TenancyMode,
} from "../contracts/context.js";
import type {
  CapabilityDescriptor,
  CapabilityHandler,
} from "../contracts/descriptors.js";
import type {
  DurableIdempotencyPort,
  IdempotencyAcquireResult,
} from "../contracts/idempotency.js";
import { RESOURCE_REFERENCE_SCHEMA_IDENTITY } from "../contracts/policies.js";
import {
  createAllowedProjectionContract,
  type ProjectionReference,
  type StructuredDataProjectorDefinition,
} from "../contracts/projections.js";
import {
  createCapabilityExecutor,
  createCapabilityRegistry,
  type CapabilityExecutor,
  type CapabilityExecutorDependencies,
  type CapabilityInvocation,
  type CapabilityRegistrationReferences,
  type CapabilityRegistryDependencies,
} from "../runtime.js";

interface HarnessOptions {
  readonly descriptor?: CapabilityDescriptor;
  readonly handler?: CapabilityHandler<unknown, unknown>;
  readonly principal?: Readonly<{
    userId: string;
    roles: string[];
    schoolId: string | null;
    sessionId?: string;
  }> | null;
  readonly authenticationCandidate?: unknown;
  readonly tenantCandidate?: unknown;
  readonly authorizationDecision?:
    | Readonly<{ allowed: true }>
    | Readonly<{ allowed: false; safeReasonCode: string }>;
  readonly authorizationCandidate?: unknown;
  readonly tenantFailure?: Error;
  readonly acquireResult?: IdempotencyAcquireResult<unknown>;
  readonly acquireCandidate?: unknown;
  readonly acquireFailure?: Error;
  readonly completeFailure?: Error;
  readonly transactionFailure?: Error;
  readonly auditFailure?: Error;
  readonly auditReceiptCandidate?: unknown;
  readonly auditCandidate?: unknown;
  readonly resourceCandidate?: unknown;
  readonly structuredCandidate?: unknown;
  readonly observabilityCandidate?: unknown;
}

interface Harness {
  readonly executor: CapabilityExecutor;
  readonly events: string[];
  readonly handler: ReturnType<typeof vi.fn<CapabilityHandler<unknown, unknown>>>;
  readonly authenticate: ReturnType<typeof vi.fn<AuthenticationPort["authenticate"]>>;
  readonly tenantResolve: ReturnType<
    typeof vi.fn<(request: unknown) => Promise<unknown>>
  >;
  readonly authorize: ReturnType<typeof vi.fn<AuthorizationPort["authorize"]>>;
  readonly acquire: ReturnType<
    typeof vi.fn<
      (request: unknown) => Promise<IdempotencyAcquireResult<unknown>>
    >
  >;
  readonly complete: ReturnType<typeof vi.fn<DurableIdempotencyPort["complete"]>>;
  readonly fail: ReturnType<typeof vi.fn<DurableIdempotencyPort["fail"]>>;
  readonly transactionRun: ReturnType<
    typeof vi.fn<
      (
        policy: unknown,
        operation: (context: Readonly<TransactionContext>) => Promise<unknown>,
      ) => Promise<unknown>
    >
  >;
  readonly appendAudit: ReturnType<
    typeof vi.fn<(event: Readonly<AuditEvent>) => Promise<Readonly<{
      eventId: string;
      persistedAt: string;
    }>>>
  >;
  readonly loggerInfo: ReturnType<typeof vi.fn<CapabilityLogger["info"]>>;
  readonly spanSetAttributes: ReturnType<
    typeof vi.fn<CapabilitySpan["setAttributes"]>
  >;
}

const events: string[] = [];
const inputSchema = z.preprocess(
  (candidate) => {
    events.push("input.validate");
    return candidate;
  },
  z.strictObject({
    lessonId: z.string().min(1),
    schoolId: z.string().optional(),
    password: z.string().optional(),
  }),
);
const outputSchema = z.preprocess(
  (candidate) => {
    events.push("output.validate");
    return candidate;
  },
  z.strictObject({ status: z.literal("published") }),
);
const auditProjection = createAllowedProjectionContract({
  projectorId: "curriculum.lesson.audit",
  shape: { resourceId: z.string().min(1) },
});
const structuredProjection = createAllowedProjectionContract({
  projectorId: "curriculum.lesson.attributes",
  shape: { resourceId: z.string().min(1) },
});
const observabilityProjection = createAllowedProjectionContract({
  projectorId: "curriculum.lesson.observability",
  shape: { lessonId: z.string().min(1) },
});
const errorProjection = createAllowedProjectionContract({
  projectorId: "curriculum.lesson.error-details",
  shape: { resourceId: z.string().min(1) },
});

function referencesMatch(
  left: Readonly<ProjectionReference>,
  right: Readonly<ProjectionReference>,
): boolean {
  return left.projectorId === right.projectorId &&
    left.schemaIdentity === right.schemaIdentity &&
    left.allowedKeys.length === right.allowedKeys.length &&
    left.allowedKeys.every((key, index) => key === right.allowedKeys[index]);
}

const schoolCommand = {
  id: "curriculum.lesson.publish",
  summary: "Publishes one lesson.",
  owner: {
    package: "@reading-advantage/backend",
    module: "curriculum",
  },
  input: inputSchema,
  output: outputSchema,
  auth: "user",
  risk: "security-sensitive",
  authorization: {
    mode: "policy",
    policyId: "curriculum.lesson.publish",
    parameterProjection: structuredProjection.reference,
  },
  tenancy: { mode: "school", resolverId: "auth.school" },
  errors: [
    {
      code: "LESSON_BUSY",
      safeMessage: "Lesson is being updated.",
      retryable: true,
      transport: {
        httpStatus: 409,
        trpcCode: "CONFLICT",
        jobOutcome: "retry",
      },
      detailsProjection: errorProjection.reference,
    },
  ],
  audit: {
    mode: "required",
    eventType: "curriculum.lesson.published",
    metadataProjection: auditProjection.reference,
    immutable: true,
  },
  observability: {
    operationName: "curriculum.lesson.publish",
    timeoutMs: 20,
    cancellation: "supported",
    logLevel: "info",
    attributeProjection: observabilityProjection.reference,
  },
  kind: "command",
  transaction: { mode: "required" },
  idempotency: {
    mode: "required",
    keySchema: z.string().min(16).max(200),
    scope: "tenant-capability",
    retentionSeconds: 3_600,
    conflict: "replay",
  },
} satisfies CapabilityDescriptor;

const publicGlobalQuery = {
  ...schoolCommand,
  id: "curriculum.lesson.public",
  auth: "public",
  risk: "ordinary",
  authorization: { mode: "none" },
  tenancy: {
    mode: "global",
    globalPolicyId: "curriculum.lesson.global",
  },
  audit: { mode: "none" },
  kind: "query",
  transaction: { mode: "none" },
  idempotency: { mode: "none" },
} satisfies CapabilityDescriptor;

const optionalGlobalQuery = {
  ...publicGlobalQuery,
  id: "curriculum.lesson.preview",
  auth: "optional",
} satisfies CapabilityDescriptor;

const referentialQuery = {
  ...schoolCommand,
  id: "curriculum.lesson.referential",
  risk: "ordinary",
  tenancy: {
    mode: "referential",
    resolverId: "curriculum.lesson.owner",
    resourceReferenceProjectorId: "curriculum.lesson.reference",
    resourceReferenceSchemaIdentity: RESOURCE_REFERENCE_SCHEMA_IDENTITY,
    ownerScopePolicyId: "curriculum.lesson.read",
  },
  audit: { mode: "none" },
  kind: "query",
  transaction: { mode: "none" },
  idempotency: { mode: "none" },
} satisfies CapabilityDescriptor;

const explicitCommand = {
  ...schoolCommand,
  id: "curriculum.lesson.publish-explicit",
  transaction: {
    mode: "explicit",
    isolation: "serializable",
    maxRetries: 2,
    externalCalls: "forbidden",
  },
} satisfies CapabilityDescriptor;

const jobCommand = {
  ...schoolCommand,
  id: "curriculum.lesson.reindex",
  summary: "Reindexes one lesson asynchronously.",
  kind: "job",
} satisfies CapabilityDescriptor;

const networkToken = {
  id: "storage.files",
  effect: "network",
} satisfies AdapterToken<Readonly<{ put(): Promise<void> }>>;
const baseAdapters = {
  get: <TAdapter>() => ({}) as TAdapter,
} satisfies ScopedAdapterAccess;
const transactionAdapters = {
  get: <TAdapter>() => ({ transactionBound: true }) as TAdapter,
} satisfies ScopedAdapterAccess;
const clock = {
  now: () => new Date("2026-07-18T00:00:00.000Z"),
} satisfies CapabilityClock;

function createReferences(options: HarnessOptions): CapabilityRegistrationReferences {
  const auditProjector = {
    contract: auditProjection,
    project: async () => {
      events.push("audit.project");
      return options.auditCandidate ?? { resourceId: "lesson-1" };
    },
  } satisfies AuditMetadataProjectorDefinition<unknown>;
  const structuredProjector = {
    contract: structuredProjection,
    project: async () => {
      events.push("authorization.project");
      return options.structuredCandidate ?? { resourceId: "lesson-1" };
    },
  } satisfies StructuredDataProjectorDefinition<unknown, { resourceId: z.ZodString }>;
  const observabilityProjector = {
    contract: observabilityProjection,
    project: async () => {
      events.push("observability.project");
      return options.observabilityCandidate ?? { lessonId: "lesson-1" };
    },
  } satisfies StructuredDataProjectorDefinition<unknown, { lessonId: z.ZodString }>;
  const detailsProjector = {
    contract: errorProjection,
    project: async () => ({ resourceId: "lesson-1" }),
  } satisfies StructuredDataProjectorDefinition<unknown, { resourceId: z.ZodString }>;
  const resourceProjector = {
    projectorId: "curriculum.lesson.reference",
    schemaIdentity: RESOURCE_REFERENCE_SCHEMA_IDENTITY,
    project: async (source: unknown) => {
      events.push("resource.project");
      if ("resourceCandidate" in options) {
        return options.resourceCandidate;
      }
      const lessonId = typeof source === "object" && source !== null &&
        "lessonId" in source
        ? String(source.lessonId)
        : "missing";
      return { resourceType: "curriculum.lesson", resourceId: lessonId };
    },
  } satisfies ResourceReferenceProjectorDefinition<unknown>;

  return {
    authorizationPolicies: {
      getAuthorizationPolicy: (policyId) =>
        policyId === "curriculum.lesson.publish" ||
        policyId === "curriculum.lesson.read"
          ? {
              policyId,
              authentication: "user",
              parameterProjection: structuredProjection.reference,
            }
          : undefined,
    },
    globalTenancyPolicies: {
      getGlobalTenancyPolicy: (policyId) =>
        policyId === "curriculum.lesson.global"
          ? {
              policyId,
              ownerPackage: "@reading-advantage/backend",
            }
          : undefined,
    },
    tenantResolvers: {
      getTenantResolver: (resolverId) => {
        if (resolverId === "auth.school") {
          return { resolverId, modes: ["school"] };
        }
        if (resolverId === "curriculum.lesson.owner") {
          return { resolverId, modes: ["referential"] };
        }
        return undefined;
      },
    },
    structuredProjectors: {
      getProjector: (reference) => {
        if (referencesMatch(reference, structuredProjection.reference)) {
          return structuredProjector;
        }
        if (referencesMatch(reference, errorProjection.reference)) {
          return detailsProjector;
        }
        if (referencesMatch(reference, observabilityProjection.reference)) {
          return observabilityProjector;
        }
        return undefined;
      },
    },
    auditProjectors: {
      getAuditProjector: (reference) =>
        referencesMatch(reference, auditProjection.reference)
          ? auditProjector
          : undefined,
    },
    resourceReferenceProjectors: {
      getResourceReferenceProjector: (projectorId) =>
        projectorId === resourceProjector.projectorId
          ? resourceProjector
          : undefined,
    },
    externalCallProtocols: {
      hasExternalCallProtocol: (protocolRef) =>
        protocolRef === "curriculum.lesson.outbox",
    },
  } satisfies CapabilityRegistrationReferences;
}

function createHarness(options: HarnessOptions = {}): Harness {
  events.length = 0;
  const descriptor = options.descriptor ?? schoolCommand;
  const references = createReferences(options);
  const registryDependencies = {
    ownership: { allows: () => true },
    references,
  } satisfies CapabilityRegistryDependencies;
  const registry = createCapabilityRegistry(registryDependencies);
  const handler = vi.fn<CapabilityHandler<unknown, unknown>>(
    options.handler ?? (async () => {
      events.push("handler");
      return { status: "published" };
    }),
  );
  registry.register({
    descriptor,
    handler,
    sourceModule: `packages/backend/src/modules/curriculum/${descriptor.id}.ts`,
  });

  const authenticate = vi.fn<AuthenticationPort["authenticate"]>(async () => {
    events.push("auth");
    if ("authenticationCandidate" in options) {
      return options.authenticationCandidate as Awaited<
        ReturnType<AuthenticationPort["authenticate"]>
      >;
    }
    return options.principal === undefined
      ? {
          userId: "user-1",
          roles: ["TEACHER"],
          schoolId: "trusted-school",
          sessionId: "session-1",
        }
      : options.principal;
  });
  const tenantResolve = vi.fn(async (request: unknown) => {
    events.push("tenant");
    if (options.tenantFailure !== undefined) {
      throw options.tenantFailure;
    }
    if ("tenantCandidate" in options) {
      return options.tenantCandidate;
    }
    if (typeof request === "object" && request !== null && "mode" in request) {
      if (request.mode === "global") {
        return { mode: "global" as const };
      }
      if (request.mode === "referential") {
        return {
          mode: "referential" as const,
          schoolId: "trusted-school",
          referenceId: "lesson-1",
          ownerScopeReason: "verified lesson owner",
        };
      }
    }
    return { mode: "school" as const, schoolId: "trusted-school" };
  });
  const tenancy: TenantResolutionPort = {
    resolve: async <TMode extends TenancyMode>(
      request: Readonly<TenantResolutionRequest<TMode>>,
    ): Promise<Readonly<TrustedTenantForMode<TMode>>> =>
      await tenantResolve(request) as TrustedTenantForMode<TMode>,
  };
  const authorize = vi.fn<AuthorizationPort["authorize"]>(async () => {
    events.push("authorize");
    if ("authorizationCandidate" in options) {
      return options.authorizationCandidate as Awaited<
        ReturnType<AuthorizationPort["authorize"]>
      >;
    }
    return options.authorizationDecision ?? { allowed: true };
  });
  const acquire = vi.fn<
    (request: unknown) => Promise<IdempotencyAcquireResult<unknown>>
  >(async () => {
    events.push("idempotency.acquire");
    if (options.acquireFailure !== undefined) {
      throw options.acquireFailure;
    }
    if ("acquireCandidate" in options) {
      return options.acquireCandidate as IdempotencyAcquireResult<unknown>;
    }
    return options.acquireResult ?? {
      status: "owner",
      ownershipToken: "ownership-1",
    };
  });
  const complete = vi.fn<DurableIdempotencyPort["complete"]>(async () => {
    events.push("idempotency.complete");
    if (options.completeFailure !== undefined) {
      throw options.completeFailure;
    }
  });
  const fail = vi.fn<DurableIdempotencyPort["fail"]>(async () => {
    events.push("idempotency.fail");
  });
  const idempotency = {
    acquire: acquire as DurableIdempotencyPort["acquire"],
    complete,
    fail,
  } satisfies DurableIdempotencyPort;
  const transactionRun = vi.fn(
    async (_policy: unknown, operation: (
      context: Readonly<TransactionContext>,
    ) => Promise<unknown>) => {
      events.push("transaction.open");
      if (options.transactionFailure !== undefined) {
        throw options.transactionFailure;
      }
      try {
        const result = await operation({ adapters: transactionAdapters });
        events.push("transaction.commit");
        return result;
      } catch (error) {
        events.push("transaction.rollback");
        throw error;
      }
    },
  );
  const transactions = {
    run: transactionRun as TransactionPort["run"],
  } satisfies TransactionPort;
  const appendAudit = vi.fn(async (event: Readonly<AuditEvent>) => {
    events.push("audit.append");
    auditEventSchema.parse(event);
    if (options.auditFailure !== undefined) {
      throw options.auditFailure;
    }
    if ("auditReceiptCandidate" in options) {
      return options.auditReceiptCandidate as Readonly<{
        eventId: string;
        persistedAt: string;
      }>;
    }
    return {
      eventId: event.eventId,
      persistedAt: "2026-07-18T00:00:00.000Z",
    };
  });
  const loggerInfo = vi.fn<CapabilityLogger["info"]>();
  const logger = {
    debug: vi.fn<CapabilityLogger["debug"]>(),
    info: loggerInfo,
    warn: vi.fn<CapabilityLogger["warn"]>(),
  } satisfies CapabilityLogger;
  const spanSetAttributes = vi.fn<CapabilitySpan["setAttributes"]>();
  const span = { setAttributes: spanSetAttributes } satisfies CapabilitySpan;
  const dependencies = {
    registry,
    authentication: { authenticate },
    tenancy,
    authorization: { authorize },
    transactions,
    idempotency,
    audit: { append: appendAudit },
    references,
    adapters: baseAdapters,
    logger,
    span,
    clock,
    createCorrelationId: () => {
      events.push("correlation");
      return "correlation-1";
    },
  } satisfies CapabilityExecutorDependencies;

  return {
    executor: createCapabilityExecutor(dependencies),
    events,
    handler,
    authenticate,
    tenantResolve,
    authorize,
    acquire,
    complete,
    fail,
    transactionRun,
    appendAudit,
    loggerInfo,
    spanSetAttributes,
  };
}

const invocation = {
  capabilityId: schoolCommand.id,
  input: {
    lessonId: "lesson-1",
    schoolId: "frontend-selected-school",
    password: "private-value",
  },
  evidence: { kind: "session", opaqueSessionRef: "opaque-session" },
  idempotencyKey: "idempotency-key-0001",
} satisfies CapabilityInvocation;

async function captureFailure(operation: Promise<unknown>): Promise<unknown> {
  try {
    await operation;
    return { code: "EXECUTION_UNEXPECTEDLY_SUCCEEDED" };
  } catch (error) {
    return error;
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ordered executor Red matrix", () => {
  it("rejects an unknown capability before parsing capability input", async () => {
    const harness = createHarness();

    await expect(harness.executor.execute({
      ...invocation,
      capabilityId: "curriculum.lesson.unknown",
    })).rejects.toMatchObject({ code: "CAPABILITY_NOT_FOUND" });
    expect(harness.events).toEqual([]);
    expect(harness.authenticate).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("starts with input validation, then establishes correlation and context", async () => {
    const harness = createHarness();

    await harness.executor.execute(invocation);

    expect(harness.events.slice(0, 3)).toEqual([
      "input.validate",
      "correlation",
      "observability.project",
    ]);
  });

  it("uses commit-first post-commit audit and idempotency settlement", async () => {
    const harness = createHarness();

    const result = await harness.executor.execute(invocation);

    expect(harness.events).toEqual([
      "input.validate",
      "correlation",
      "observability.project",
      "auth",
      "tenant",
      "authorization.project",
      "authorize",
      "idempotency.acquire",
      "transaction.open",
      "handler",
      "output.validate",
      "transaction.commit",
      "audit.project",
      "audit.append",
      "idempotency.complete",
    ]);
    expect(result).toEqual({ status: "published" });
  });

  it("rejects invalid input before correlation or authentication", async () => {
    const harness = createHarness();

    await expect(
      harness.executor.execute({ ...invocation, input: { lessonId: "" } }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(harness.events).toEqual(["input.validate"]);
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("rejects malformed authentication evidence before the auth adapter", async () => {
    const harness = createHarness();
    const malformedEvidence = {
      ...invocation,
      evidence: { kind: "session", opaqueSessionRef: "", cookie: "private" },
    } as unknown as CapabilityInvocation;

    await expect(harness.executor.execute(malformedEvidence)).rejects.toMatchObject({
      code: "INVALID_AUTHENTICATION_EVIDENCE",
    });
    expect(harness.authenticate).not.toHaveBeenCalled();
    expect(harness.tenantResolve).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("rejects a missing required principal before tenancy", async () => {
    const harness = createHarness({ principal: null });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(harness.tenantResolve).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("normalizes an authentication adapter failure and stops", async () => {
    const harness = createHarness();
    harness.authenticate.mockRejectedValueOnce(new Error("session store unavailable"));

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
    expect(harness.tenantResolve).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("rejects a malformed authentication adapter principal", async () => {
    const harness = createHarness({
      authenticationCandidate: {
        userId: "user-1",
        roles: "TEACHER",
        schoolId: "trusted-school",
        credential: "private",
      },
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
    expect(harness.tenantResolve).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("permits public auth with anonymous evidence without calling authentication", async () => {
    const harness = createHarness({ descriptor: publicGlobalQuery });
    const publicInvocation = {
      capabilityId: publicGlobalQuery.id,
      input: { lessonId: "lesson-1" },
      evidence: { kind: "anonymous" },
    } satisfies CapabilityInvocation;

    await harness.executor.execute(publicInvocation);

    expect(harness.authenticate).not.toHaveBeenCalled();
    expect(harness.tenantResolve).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "global", principal: null }),
    );
    expect(harness.authorize).not.toHaveBeenCalled();
    expect(harness.handler).toHaveBeenCalledTimes(1);
  });

  it("permits optional auth when authentication resolves no principal", async () => {
    const harness = createHarness({
      descriptor: optionalGlobalQuery,
      principal: null,
    });
    const optionalInvocation = {
      capabilityId: optionalGlobalQuery.id,
      input: { lessonId: "lesson-1" },
      evidence: { kind: "anonymous" },
    } satisfies CapabilityInvocation;

    await harness.executor.execute(optionalInvocation);

    expect(harness.authenticate).toHaveBeenCalledTimes(1);
    expect(harness.handler).toHaveBeenCalledTimes(1);
  });

  it("rejects failed tenant resolution before authorization", async () => {
    const harness = createHarness({
      tenantFailure: new Error("owner lookup ambiguous"),
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "TENANT_RESOLUTION_FAILED",
    });
    expect(harness.authorize).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("rejects a malformed tenant resolver result before authorization", async () => {
    const harness = createHarness({
      tenantCandidate: {
        mode: "school",
        schoolId: "",
        untrusted: "frontend-selected-school",
      },
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "TENANT_RESOLUTION_FAILED",
    });
    expect(harness.authorize).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("derives referential tenancy from the reviewed resource projector", async () => {
    const harness = createHarness({ descriptor: referentialQuery });
    const referentialInvocation = {
      ...invocation,
      capabilityId: referentialQuery.id,
      idempotencyKey: undefined,
    } satisfies CapabilityInvocation;

    await harness.executor.execute(referentialInvocation);

    expect(harness.events).toContain("resource.project");
    expect(harness.tenantResolve).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "referential",
        resourceReference: {
          resourceType: "curriculum.lesson",
          resourceId: "lesson-1",
        },
      }),
    );
  });

  it("rejects malformed referential resource projection before tenancy", async () => {
    const harness = createHarness({
      descriptor: referentialQuery,
      resourceCandidate: {
        resourceType: "curriculum.lesson",
        resourceId: "",
        schoolId: "frontend-selected-school",
      },
    });
    const referentialInvocation = {
      ...invocation,
      capabilityId: referentialQuery.id,
      idempotencyKey: undefined,
    } satisfies CapabilityInvocation;

    await expect(
      harness.executor.execute(referentialInvocation),
    ).rejects.toMatchObject({ code: "TENANT_RESOLUTION_FAILED" });
    expect(harness.events).toContain("resource.project");
    expect(harness.tenantResolve).not.toHaveBeenCalled();
    expect(harness.authorize).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("never treats an input school ID as trusted tenant authority", async () => {
    const harness = createHarness();

    await harness.executor.execute(invocation);

    expect(harness.authorize).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: { mode: "school", schoolId: "trusted-school" },
      }),
    );
    expect(harness.authorize).not.toHaveBeenCalledWith(
      expect.objectContaining({
        tenant: expect.objectContaining({ schoolId: "frontend-selected-school" }),
      }),
    );
  });

  it("passes exact validated projected parameters to authorization", async () => {
    const harness = createHarness();

    await harness.executor.execute(invocation);

    expect(harness.authorize).toHaveBeenCalledWith(expect.objectContaining({
      policyId: "curriculum.lesson.publish",
      capabilityId: schoolCommand.id,
      input: expect.objectContaining({ lessonId: "lesson-1" }),
      parameters: {
        projectorId: structuredProjection.reference.projectorId,
        schemaIdentity: structuredProjection.reference.schemaIdentity,
        allowedKeys: ["resourceId"],
        values: { resourceId: "lesson-1" },
      },
    }));
    const request = harness.authorize.mock.calls[0]?.[0];
    expect(JSON.stringify(request?.parameters)).not.toMatch(/password|private-value/iu);
  });

  it("records a complete denial audit event and never invokes the handler", async () => {
    const harness = createHarness({
      authorizationDecision: {
        allowed: false,
        safeReasonCode: "LESSON_ACCESS_DENIED",
      },
    });

    const failure = await captureFailure(harness.executor.execute(invocation));
    const event = harness.appendAudit.mock.calls[0]?.[0];
    expect(auditEventSchema.safeParse(event).success).toBe(true);
    expect(event).toMatchObject({
      eventId: expect.any(String),
      occurredAt: "2026-07-18T00:00:00.000Z",
      eventType: "curriculum.lesson.published",
      capabilityId: schoolCommand.id,
      correlationId: "correlation-1",
      actor: { type: "user", id: "user-1" },
      tenant: { mode: "school", schoolId: "trusted-school" },
      outcome: "denied",
      metadata: {
        projectorId: auditProjection.reference.projectorId,
        schemaIdentity: auditProjection.reference.schemaIdentity,
        allowedKeys: ["resourceId"],
        values: { resourceId: "lesson-1" },
      },
    });
    expect(failure).toMatchObject({ code: "FORBIDDEN" });
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("rejects an authorization adapter failure without invoking the handler", async () => {
    const harness = createHarness();
    harness.authorize.mockRejectedValueOnce(new Error("policy unavailable"));

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("fails closed on a malformed authorization decision", async () => {
    const harness = createHarness({
      authorizationCandidate: { allowed: "yes", reason: "trust me" },
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(harness.acquire).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("requires and validates the declared idempotency key before acquisition", async () => {
    const missing = createHarness();
    const invalid = createHarness();

    await expect(
      missing.executor.execute({ ...invocation, idempotencyKey: undefined }),
    ).rejects.toMatchObject({ code: "INVALID_IDEMPOTENCY_KEY" });
    await expect(
      invalid.executor.execute({ ...invocation, idempotencyKey: "short" }),
    ).rejects.toMatchObject({ code: "INVALID_IDEMPOTENCY_KEY" });
    expect(missing.acquire).not.toHaveBeenCalled();
    expect(invalid.acquire).not.toHaveBeenCalled();
    expect(missing.handler).not.toHaveBeenCalled();
    expect(invalid.handler).not.toHaveBeenCalled();
  });

  it("rejects a deterministic idempotency conflict before transaction setup", async () => {
    const harness = createHarness({
      acquireResult: {
        status: "conflict",
        code: "IDEMPOTENCY_CONFLICT",
        retryable: false,
      },
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
      retryable: false,
    });
    expect(harness.transactionRun).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("normalizes an idempotency acquisition adapter failure before transaction setup", async () => {
    const harness = createHarness({
      acquireFailure: new Error("idempotency store unavailable"),
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
    expect(harness.transactionRun).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("rejects a malformed idempotency acquisition result", async () => {
    const harness = createHarness({
      acquireCandidate: { status: "owner", ownershipToken: "", rawKey: "private" },
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
    expect(harness.transactionRun).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("returns a validated replay without re-executing mutation or audit work", async () => {
    const harness = createHarness({
      acquireResult: { status: "replay", output: { status: "published" } },
    });

    const result = await harness.executor.execute(invocation);

    expect(result).toEqual({ status: "published" });
    expect(harness.events).toContain("output.validate");
    expect(harness.transactionRun).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
    expect(harness.appendAudit).not.toHaveBeenCalled();
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.fail).not.toHaveBeenCalled();
  });

  it("validates replay output before returning it", async () => {
    const harness = createHarness({
      acquireResult: { status: "replay", output: { status: "draft" } },
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
    expect(harness.events).toContain("output.validate");
    expect(harness.transactionRun).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("uses no transaction port for transaction-none queries", async () => {
    const harness = createHarness({ descriptor: publicGlobalQuery });

    await harness.executor.execute({
      capabilityId: publicGlobalQuery.id,
      input: { lessonId: "lesson-1" },
      evidence: { kind: "anonymous" },
    });

    expect(harness.transactionRun).not.toHaveBeenCalled();
    expect(harness.handler).toHaveBeenCalledTimes(1);
  });

  it("opens the exact explicit transaction and rebinds handler adapters", async () => {
    const handler = vi.fn<CapabilityHandler<unknown, unknown>>(async (context) => {
      events.push("handler");
      expect(context.adapters).not.toBe(baseAdapters);
      expect(context.adapters.get({ id: "db.scoped", effect: "database" }))
        .toEqual({ transactionBound: true });
      return { status: "published" };
    });
    const harness = createHarness({ descriptor: explicitCommand, handler });

    await harness.executor.execute({
      ...invocation,
      capabilityId: explicitCommand.id,
    });

    expect(harness.transactionRun).toHaveBeenCalledWith(
      explicitCommand.transaction,
      expect.any(Function),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("denies an undocumented network adapter inside a transaction", async () => {
    const handler = vi.fn<CapabilityHandler<unknown, unknown>>(async (context) => {
      events.push("handler");
      context.adapters.get(networkToken);
      return { status: "published" };
    });
    const harness = createHarness({ descriptor: explicitCommand, handler });

    await expect(
      harness.executor.execute({ ...invocation, capabilityId: explicitCommand.id }),
    ).rejects.toMatchObject({ code: "NETWORK_EFFECT_FORBIDDEN" });
    expect(harness.events).toContain("transaction.rollback");
  });

  it("does not invoke the handler when transaction setup fails", async () => {
    const harness = createHarness({
      transactionFailure: new Error("transaction unavailable"),
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("fails at the independent observability projection stage", async () => {
    const harness = createHarness({
      observabilityCandidate: {
        lessonId: "lesson-1",
        accessToken: "private",
      },
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
    expect(harness.events).toContain("observability.project");
    expect(harness.events).not.toContain("authorization.project");
    expect(harness.authorize).not.toHaveBeenCalled();
    expect(harness.loggerInfo).not.toHaveBeenCalled();
    expect(harness.spanSetAttributes).not.toHaveBeenCalled();
    expect(harness.handler).not.toHaveBeenCalled();
  });

  it("uses the exact independent observability projection for logger attributes", async () => {
    const harness = createHarness();

    await harness.executor.execute(invocation);

    expect(harness.loggerInfo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        projectorId: observabilityProjection.reference.projectorId,
        schemaIdentity: observabilityProjection.reference.schemaIdentity,
        allowedKeys: ["lessonId"],
        values: { lessonId: "lesson-1" },
      }),
    );
    expect(JSON.stringify(harness.loggerInfo.mock.calls)).not.toMatch(
      /password|private-value/iu,
    );
  });

  it("uses the exact independent observability projection for span attributes", async () => {
    const harness = createHarness();

    await harness.executor.execute(invocation);

    expect(harness.spanSetAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        projectorId: observabilityProjection.reference.projectorId,
        schemaIdentity: observabilityProjection.reference.schemaIdentity,
        allowedKeys: ["lessonId"],
        values: { lessonId: "lesson-1" },
      }),
    );
    expect(JSON.stringify(harness.spanSetAttributes.mock.calls)).not.toMatch(
      /password|private-value/iu,
    );
  });

  it("executes a registered durable job through the ordered kernel", async () => {
    const harness = createHarness({ descriptor: jobCommand });
    const jobInvocation = {
      ...invocation,
      capabilityId: jobCommand.id,
      evidence: { kind: "job", opaqueJobRef: "job-1" },
    } satisfies CapabilityInvocation;

    const result = await harness.executor.execute(jobInvocation);

    expect(result).toEqual({ status: "published" });
    expect(harness.authenticate).toHaveBeenCalledWith(expect.objectContaining({
      evidence: { kind: "job", opaqueJobRef: "job-1" },
    }));
    expect(harness.handler).toHaveBeenCalledTimes(1);
    expect(harness.appendAudit).toHaveBeenCalledTimes(1);
    expect(harness.complete).toHaveBeenCalledTimes(1);
  });

  it("enforces timeout cancellation with a boundary-safe error", async () => {
    vi.useFakeTimers();
    const handler = vi.fn<CapabilityHandler<unknown, unknown>>(
      async (context) => await new Promise((_resolve, reject) => {
        context.signal.addEventListener("abort", () => {
          events.push("handler.abort");
          reject(new Error("aborted"));
        });
      }),
    );
    const harness = createHarness({ handler });

    const operation = harness.executor.execute(invocation);
    await vi.advanceTimersByTimeAsync(21);

    await expect(operation).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(harness.events).toContain("handler.abort");
    expect(harness.complete).not.toHaveBeenCalled();
  });
});

describe("executor error, audit, and settlement Red matrix", () => {
  it("validates and deeply freezes a complete success audit event", async () => {
    const harness = createHarness();

    await harness.executor.execute(invocation);

    const event = harness.appendAudit.mock.calls[0]?.[0];
    expect(auditEventSchema.safeParse(event).success).toBe(true);
    expect(event).toMatchObject({
      eventType: "curriculum.lesson.published",
      capabilityId: schoolCommand.id,
      correlationId: "correlation-1",
      actor: { type: "user", id: "user-1" },
      tenant: { mode: "school", schoolId: "trusted-school" },
      outcome: "success",
      metadata: {
        projectorId: auditProjection.reference.projectorId,
        schemaIdentity: auditProjection.reference.schemaIdentity,
        allowedKeys: ["resourceId"],
        values: { resourceId: "lesson-1" },
      },
    });
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event?.metadata)).toBe(true);
    expect(Object.isFrozen(event?.metadata.values)).toBe(true);
    expect(JSON.stringify(event)).not.toMatch(/password|private-value/iu);
  });

  it("rolls back a declared handler failure and records complete failure evidence", async () => {
    const harness = createHarness({
      handler: async () => {
        events.push("handler");
        throw {
          code: "LESSON_BUSY",
          details: { resourceId: "lesson-1", providerPayload: "private" },
        };
      },
    });

    const failure = await captureFailure(harness.executor.execute(invocation));
    const event = harness.appendAudit.mock.calls[0]?.[0];

    expect(auditEventSchema.safeParse(event).success).toBe(true);
    expect(event).toMatchObject({
      eventId: expect.any(String),
      occurredAt: "2026-07-18T00:00:00.000Z",
      eventType: "curriculum.lesson.published",
      capabilityId: schoolCommand.id,
      correlationId: "correlation-1",
      actor: { type: "user", id: "user-1" },
      tenant: { mode: "school", schoolId: "trusted-school" },
      outcome: "failure",
      metadata: {
        projectorId: auditProjection.reference.projectorId,
        schemaIdentity: auditProjection.reference.schemaIdentity,
        allowedKeys: ["resourceId"],
        values: { resourceId: "lesson-1" },
      },
    });
    expect(failure).toMatchObject({
      code: "LESSON_BUSY",
      message: "Lesson is being updated.",
      retryable: true,
      correlationId: "correlation-1",
      details: {
        values: { resourceId: "lesson-1" },
      },
    });
    expect(JSON.stringify(failure)).not.toContain("providerPayload");
    expect(harness.events).toContain("transaction.rollback");
    expect(harness.fail).toHaveBeenCalledWith(
      expect.objectContaining({
        ownershipToken: "ownership-1",
        disposition: "store-retryable",
      }),
    );
  });

  it("rolls back invalid fresh handler output without success settlement", async () => {
    const harness = createHarness({
      handler: async () => {
        events.push("handler");
        return { status: "draft" };
      },
    });

    const failure = await captureFailure(harness.executor.execute(invocation));
    const auditOutcomes = harness.appendAudit.mock.calls.map(
      ([event]) => event.outcome,
    );

    expect(failure).toMatchObject({
      code: "INTERNAL_ERROR",
      retryable: false,
      correlationId: "correlation-1",
    });
    expect(harness.events).toContain("output.validate");
    expect(harness.events).toContain("transaction.rollback");
    expect(harness.events).not.toContain("transaction.commit");
    expect(auditOutcomes).toContain("failure");
    expect(auditOutcomes).not.toContain("success");
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.fail).toHaveBeenCalledWith(expect.objectContaining({
      ownershipToken: "ownership-1",
      disposition: "store-terminal",
    }));
  });

  it("rejects error details outside the exact reviewed projection", async () => {
    const harness = createHarness({
      handler: async () => {
        throw {
          code: "LESSON_BUSY",
          details: { resourceId: "lesson-1", accessToken: "private" },
        };
      },
    });

    const failure = await captureFailure(harness.executor.execute(invocation));

    expect(failure).toMatchObject({ code: "LESSON_BUSY" });
    expect(JSON.stringify(failure)).not.toContain("accessToken");
    expect(JSON.stringify(failure)).not.toContain("private");
  });

  it("normalizes unexpected failures without stack, SQL, session, or credentials", async () => {
    const harness = createHarness({
      handler: async () => {
        throw new Error(
          "password=private SELECT * FROM sessions stack=provider-stack",
        );
      },
    });

    const failure = await captureFailure(harness.executor.execute(invocation));
    const serialized = JSON.stringify(failure);

    expect(failure).toMatchObject({
      code: "INTERNAL_ERROR",
      retryable: false,
      correlationId: "correlation-1",
    });
    expect(serialized).not.toMatch(/password|SELECT \*|sessions|provider-stack/iu);
    expect(harness.complete).not.toHaveBeenCalled();
  });

  it("rejects audit metadata outside its exact reviewed projection", async () => {
    const harness = createHarness({
      auditCandidate: {
        resourceId: "lesson-1",
        accessToken: "private",
      },
    });

    await expect(harness.executor.execute(invocation)).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
    expect(harness.events).toContain("transaction.commit");
    expect(harness.events).not.toContain("transaction.rollback");
    expect(harness.appendAudit).not.toHaveBeenCalled();
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.fail).toHaveBeenCalledWith(expect.objectContaining({
      ownershipToken: "ownership-1",
      disposition: "store-terminal",
    }));
  });

  it("uses terminal post-commit settlement for a malformed audit receipt", async () => {
    const harness = createHarness({
      auditReceiptCandidate: {
        eventId: "",
        persistedAt: "not-a-date",
        providerToken: "private",
      },
    });

    const failure = await captureFailure(harness.executor.execute(invocation));

    expect(failure).toMatchObject({ code: "INTERNAL_ERROR" });
    expect(harness.events).toContain("transaction.commit");
    expect(harness.events).not.toContain("transaction.rollback");
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.fail).toHaveBeenCalledWith(expect.objectContaining({
      ownershipToken: "ownership-1",
      disposition: "store-terminal",
    }));
  });

  it("rejects a schema-valid audit receipt for a different event ID terminally", async () => {
    const harness = createHarness({
      auditReceiptCandidate: {
        eventId: "different-event-id",
        persistedAt: "2026-07-18T00:00:00.000Z",
      },
    });

    const failure = await captureFailure(harness.executor.execute(invocation));
    const appendedEvent = harness.appendAudit.mock.calls[0]?.[0];

    expect(failure).toMatchObject({ code: "INTERNAL_ERROR" });
    expect(appendedEvent?.eventId).toBeDefined();
    expect(appendedEvent?.eventId).not.toBe("different-event-id");
    expect(harness.events).toContain("transaction.commit");
    expect(harness.events).not.toContain("transaction.rollback");
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.fail).toHaveBeenCalledWith(expect.objectContaining({
      ownershipToken: "ownership-1",
      disposition: "store-terminal",
    }));
  });

  it("uses terminal post-commit settlement when completion fails after valid audit", async () => {
    const harness = createHarness({
      completeFailure: new Error("idempotency completion unavailable"),
    });

    const failure = await captureFailure(harness.executor.execute(invocation));

    expect(failure).toMatchObject({ code: "INTERNAL_ERROR" });
    expect(harness.events).toContain("transaction.commit");
    expect(harness.events).not.toContain("transaction.rollback");
    expect(harness.appendAudit).toHaveBeenCalledTimes(1);
    expect(harness.complete).toHaveBeenCalledWith(
      "ownership-1",
      { status: "published" },
    );
    expect(harness.fail).toHaveBeenCalledWith(expect.objectContaining({
      ownershipToken: "ownership-1",
      disposition: "store-terminal",
    }));
  });

  it("uses defined post-commit semantics when required audit append fails", async () => {
    const harness = createHarness({
      auditFailure: new Error("audit store unavailable"),
    });

    const failure = await captureFailure(harness.executor.execute(invocation));

    expect(failure).toMatchObject({ code: "INTERNAL_ERROR" });
    expect(harness.events).toContain("transaction.commit");
    expect(harness.events).not.toContain("transaction.rollback");
    expect(harness.complete).not.toHaveBeenCalled();
    expect(harness.fail).toHaveBeenCalledWith(
      expect.objectContaining({
        ownershipToken: "ownership-1",
        disposition: "store-terminal",
      }),
    );
  });

  it("namespaces ownership by trusted tenant and passes fingerprints only", async () => {
    const harness = createHarness();

    await harness.executor.execute(invocation);

    expect(harness.acquire).toHaveBeenCalledWith({
      namespace: {
        capabilityId: schoolCommand.id,
        scope: "tenant-capability",
        tenantId: "trusted-school",
      },
      keyFingerprint: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      inputFingerprint: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      retentionSeconds: 3_600,
    });
    const request = harness.acquire.mock.calls[0]?.[0];
    expect(JSON.stringify(request)).not.toContain("idempotency-key-0001");
    expect(JSON.stringify(request)).not.toContain("frontend-selected-school");
  });
});
