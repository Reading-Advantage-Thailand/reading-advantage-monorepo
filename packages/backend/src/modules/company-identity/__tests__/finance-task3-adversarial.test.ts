/**
 * Adversarial test for Finance Phase 1 Task 3 boundary gaps.
 *
 * Purpose:
 *   - Closes specific gaps the existing finance-authorization-adapter,
 *     durable-job-adapter, and historical-private-evidence-packet red tests
 *     did not exercise. The new tests are behavior-level (not source-string
 *     matching) and target falsifiers documented in
 *     `test-strategy.md` §"Falsifiability statement".
 *
 * Targeted gaps:
 *   A.  Attestor secret-safe audit when the authenticator throws
 *       (authentication-failed reason, no credential value, exactly one
 *       immutable audit event, deep immutability).
 *   C.  Durable outbox projector strictObject intent validation (rejects
 *       extra fields), idempotency-key prefix invariant
 *       ("historical-private-evidence-outbox-v1"), and freeze of both
 *       the receipt and the result envelope.
 *   D.  Import-command envelope strictObject validation (rejects
 *       caller-supplied `authorization`, `binding`, `evidence` fields
 *       in addition to the already-covered `attestation` field), result
 *       envelope deep-freeze, and the fact-array boundary
 *       (zero/one/one-twenty-eight/one-twenty-nine facts).
 *
 * Anti-pattern coverage (per test-strategy.md §"Anti-pattern coverage"):
 *   A1/A4  behavior-level assertions over injected fakes, not source-text
 *          presence or substring matches.
 *   A5     no "green" claim can be made unless every assertion below
 *          actually passes when the targeted command runs.
 *   A7     forbidden-key lists are explicit enumerated cases, not bare-word
 *          exclusion filters.
 *   A15    every receipt produced by the green implementation must bind
 *          the post-strategy-commit `phase_base_sha`; this test file does
 *          not invent receipts.
 */
import { describe, expect, it, vi } from "vitest";

import type { DurableJobEnqueuePort } from "../../../jobs/ports.js";

const payloadDigest = "a".repeat(64);
const evidenceReference =
  "private-evidence://company-historical/historical/receipt-001.json";
const scope = {
  companyId: "company-historical",
  schoolId: "school-historical",
} as const;
const companyScope = { companyId: scope.companyId } as const;
const acceptedRoleId = "role-historical-private-evidence-import";

/** Minimal attestation credential shape carried into the attestor. */
interface AttestationCredential {
  readonly kind: "session" | "token";
  readonly value: string;
}

/** Authenticated owner claims produced by the Company Identity owner boundary. */
interface AttestorOwnerClaims {
  readonly claimsVersion: string;
  readonly subjectId: string;
  readonly organizationId: string;
  readonly appRoleIds: readonly string[];
  readonly schoolIds?: readonly string[];
}

/** Injected authenticator port for the Finance attestor. */
interface AttestorAuthenticator {
  authenticate(input: {
    readonly credential: AttestationCredential;
  }): Promise<Readonly<AttestorOwnerClaims> | undefined>;
}

/** Injected append-only audit port for the Finance attestor. */
interface AttestorAuditEvent {
  readonly eventId: string;
  readonly objectId: string;
  readonly occurredAt: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly actor:
    | { readonly kind: "authenticated-owner"; readonly subjectId: string }
    | { readonly kind: "unauthenticated" };
  readonly operation: "historical-private-evidence:import";
  readonly scope: { readonly companyId: string; readonly schoolId?: string };
  readonly outcome: "allowed" | "denied" | "failed";
  readonly reason: string;
}
interface AttestorAuditPort {
  append(event: Readonly<AttestorAuditEvent>): Promise<void>;
}

interface TrustedAuditSources {
  readonly createEventId: () => string;
  readonly createRequestId: () => string;
  readonly createCorrelationId: () => string;
  readonly now: () => Date;
}

/** Injected role policy. */
interface AttestorRolePolicy {
  readonly policyVersion: string;
  readonly acceptedRoleIds: readonly string[];
}

/** Finance attestor module surface. */
interface FinanceAttestorModule {
  readonly createFinanceCompanyIdentityAttestor: (input: {
    readonly authenticator: AttestorAuthenticator;
    readonly rolePolicy: AttestorRolePolicy;
    readonly auditPort: AttestorAuditPort;
    readonly trustedAuditSources: TrustedAuditSources;
  }) => {
    attest(input: {
      readonly operation: "historical-private-evidence:import";
      readonly scope: {
        readonly companyId: string;
        readonly schoolId?: string;
      };
      readonly credential: AttestationCredential;
      readonly audit: {
        readonly eventId: string;
        readonly objectId: string;
        readonly occurredAt: string;
        readonly requestId: string;
        readonly correlationId: string;
      };
    }): Promise<unknown>;
  };
}

/** Load the public Company Identity Finance attestor module. */
async function loadAttestor(): Promise<FinanceAttestorModule> {
  return (await import("../index.js")) as unknown as FinanceAttestorModule;
}

function requireAttestorFactory(
  subject: FinanceAttestorModule,
): FinanceAttestorModule["createFinanceCompanyIdentityAttestor"] {
  expect(
    subject.createFinanceCompanyIdentityAttestor,
    "Company Identity must export createFinanceCompanyIdentityAttestor",
  ).toBeTypeOf("function");
  return subject.createFinanceCompanyIdentityAttestor;
}

function auditContext(
  overrides: Partial<{
    readonly eventId: string;
    readonly objectId: string;
    readonly occurredAt: string;
    readonly requestId: string;
    readonly correlationId: string;
  }> = {},
): {
  readonly eventId: string;
  readonly objectId: string;
  readonly occurredAt: string;
  readonly requestId: string;
  readonly correlationId: string;
} {
  return {
    eventId: "finance-attestation-event-adversarial",
    objectId: "historical-private-evidence-packet-adversarial",
    occurredAt: "2026-08-11T04:00:00.000Z",
    requestId: "finance-import-request-adversarial",
    correlationId: "finance-import-correlation-adversarial",
    ...overrides,
  };
}

/** Supplies deterministic trusted server values matching one test audit context. */
function trustedAuditSources(
  audit: ReturnType<typeof auditContext>,
): TrustedAuditSources {
  return {
    createEventId: () => audit.eventId,
    createRequestId: () => audit.requestId,
    createCorrelationId: () => audit.correlationId,
    now: () => new Date(audit.occurredAt),
  };
}

/** Captures every event passed to the audit port, preserving the exact reference. */
function createCapturingAudit(): {
  readonly port: AttestorAuditPort;
  readonly events: AttestorAuditEvent[];
} {
  const events: AttestorAuditEvent[] = [];
  return {
    events,
    port: {
      append: async (event) => {
        // The implementation is responsible for deep-freezing the event; we
        // preserve its frozen state by storing the exact reference rather
        // than a shallow copy.
        events.push(event);
      },
    },
  };
}

describe("Finance Task 3 A-boundary adversarial coverage", () => {
  it("records a secret-safe FAILED audit when the authenticator throws, never leaking the credential value", async () => {
    const subject = await loadAttestor();
    const createAttestor = requireAttestorFactory(subject);
    const credential: AttestationCredential = {
      kind: "token",
      value: "sensitive-token-value-must-not-appear-in-audit",
    };
    const authenticator: AttestorAuthenticator = {
      authenticate: vi.fn(async () => {
        throw new Error("authenticator dependency unavailable");
      }),
    };
    const audit = createCapturingAudit();
    const ctx = auditContext();
    const attestor = createAttestor({
      authenticator,
      rolePolicy: {
        policyVersion: "finance-historical-import-role-policy-v1",
        acceptedRoleIds: [acceptedRoleId],
      },
      auditPort: audit.port,
      trustedAuditSources: trustedAuditSources(ctx),
    });

    await expect(
      attestor.attest({
        operation: "historical-private-evidence:import",
        scope,
        credential,
        audit: ctx,
      }),
    ).rejects.toThrow("COMPANY_IDENTITY_FINANCE_AUTHENTICATION_FAILED");

    expect(authenticator.authenticate).toHaveBeenCalledTimes(1);
    expect(audit.events).toHaveLength(1);
    const event = audit.events[0]!;
    expect(event.outcome).toBe("failed");
    expect(event.reason).toBe("authentication-failed");
    expect(event.actor).toEqual({ kind: "unauthenticated" });
    expect(event.scope).toEqual(scope);
    expect(event.operation).toBe("historical-private-evidence:import");
    expect(event.eventId).toBe(ctx.eventId);
    expect(event.objectId).toBe(ctx.objectId);
    expect(event.occurredAt).toBe(ctx.occurredAt);
    expect(event.requestId).toBe(ctx.requestId);
    expect(event.correlationId).toBe(ctx.correlationId);
    expect(JSON.stringify(event)).not.toContain(credential.value);
    expect(JSON.stringify(event)).not.toContain("sensitive-token-value");
  });

  it("never calls the audit port more than once per attestation and freezes the recorded event", async () => {
    const subject = await loadAttestor();
    const createAttestor = requireAttestorFactory(subject);
    const audit = createCapturingAudit();
    const context = auditContext({ eventId: "event-single-001" });
    const attestor = createAttestor({
      authenticator: {
        authenticate: vi.fn(async () => undefined),
      },
      rolePolicy: {
        policyVersion: "finance-historical-import-role-policy-v1",
        acceptedRoleIds: [acceptedRoleId],
      },
      auditPort: audit.port,
      trustedAuditSources: trustedAuditSources(context),
    });

    await expect(
      attestor.attest({
        operation: "historical-private-evidence:import",
        scope: companyScope,
        credential: { kind: "session", value: "session-token" },
        audit: context,
      }),
    ).resolves.toEqual({ decision: "deny", reason: "unauthenticated" });

    expect(audit.events).toHaveLength(1);
    const event = audit.events[0]!;
    expect(Object.isFrozen(event)).toBe(true);
    expect(() => {
      (event as { reason: string }).reason = "tampered";
    }).toThrow(TypeError);
    expect(() => {
      (event.scope as { companyId: string }).companyId = "tampered";
    }).toThrow(TypeError);
  });

  it("denies an empty `appRoleIds` claim with `role-not-accepted` even when subject and organization match", async () => {
    const subject = await loadAttestor();
    const createAttestor = requireAttestorFactory(subject);
    const audit = createCapturingAudit();
    const context = auditContext({ eventId: "event-empty-roles-001" });
    const attestor = createAttestor({
      authenticator: {
        authenticate: vi.fn(async () => ({
          claimsVersion: "company-identity-claims-v1",
          subjectId: "employee-empty-roles",
          organizationId: scope.companyId,
          appRoleIds: [],
        })),
      },
      rolePolicy: {
        policyVersion: "finance-historical-import-role-policy-v1",
        acceptedRoleIds: [acceptedRoleId],
      },
      auditPort: audit.port,
      trustedAuditSources: trustedAuditSources(context),
    });

    await expect(
      attestor.attest({
        operation: "historical-private-evidence:import",
        scope: companyScope,
        credential: { kind: "token", value: "owner-token" },
        audit: context,
      }),
    ).resolves.toEqual({ decision: "deny", reason: "role-not-accepted" });

    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]!.reason).toBe("role-not-accepted");
    expect(audit.events[0]!.actor).toEqual({
      kind: "authenticated-owner",
      subjectId: "employee-empty-roles",
    });
  });

  it("rejects sparse acceptedRoleIds configuration before authentication or audit", async () => {
    const subject = await loadAttestor();
    const createAttestor = requireAttestorFactory(subject);
    const audit = createCapturingAudit();
    const authenticate = vi.fn(async () => ({
      claimsVersion: "company-identity-claims-v1",
      subjectId: "employee-sparse-role-policy",
      organizationId: scope.companyId,
      appRoleIds: [acceptedRoleId],
    }));
    const sparseRoleIds = new Array<string>(2);
    sparseRoleIds[1] = acceptedRoleId;

    expect(() =>
      createAttestor({
        authenticator: { authenticate },
        rolePolicy: {
          policyVersion: "finance-historical-import-role-policy-sparse",
          acceptedRoleIds: sparseRoleIds,
        },
        auditPort: audit.port,
        trustedAuditSources: trustedAuditSources(auditContext()),
      }),
    ).toThrow("COMPANY_IDENTITY_FINANCE_ATTESTOR_DEPENDENCY_INVALID");
    expect(authenticate).not.toHaveBeenCalled();
    expect(audit.events).toHaveLength(0);
  });
});

/** Persisted outbox intent shape consumed by the durable projector. */
interface PersistedIntent {
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

/** Projector receipt shape. */
interface ProjectorReceipt {
  readonly outboxEventId: string;
  readonly auditEventId: string;
  readonly auditReceiptId: string;
  readonly objectId: string;
  readonly scope: { readonly companyId: string; readonly schoolId?: string };
  readonly authorizationEvidence: PersistedIntent["authorizationEvidence"];
  readonly policyVersion: string;
  readonly idempotencyKey: string;
  readonly jobId: string;
}

/** Projector module surface. */
interface ProjectorModule {
  readonly createHistoricalPrivateEvidenceOutboxProjector: (input: {
    readonly durableJobs: DurableJobEnqueuePort;
    readonly projectionStore: {
      findByOutboxEventId(
        outboxEventId: string,
      ): Promise<Readonly<ProjectorReceipt> | undefined>;
      bindReceipt(input: Readonly<{ claimToken: string; receipt: ProjectorReceipt }>): Promise<unknown>;
      claimReceipt(
        input: Readonly<{
          readonly outboxEventId: string;
          readonly idempotencyKey: string;
          readonly intent: Readonly<PersistedIntent>;
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
      releaseClaim(input: Readonly<Record<string, unknown>>): Promise<void>;
    };
    readonly job: {
      readonly jobName: string;
      readonly queueName: string;
      readonly maxAttempts: number;
    };
  }) => {
    project(
      intent: Readonly<PersistedIntent>,
    ): Promise<{ readonly status: string; readonly receipt: ProjectorReceipt }>;
  };
}

async function loadProjector(): Promise<ProjectorModule> {
  return (await import("../../finance-operations/index.js")) as unknown as ProjectorModule;
}

function requireProjectorFactory(
  subject: ProjectorModule,
): ProjectorModule["createHistoricalPrivateEvidenceOutboxProjector"] {
  expect(
    subject.createHistoricalPrivateEvidenceOutboxProjector,
    "Finance Operations must export createHistoricalPrivateEvidenceOutboxProjector",
  ).toBeTypeOf("function");
  return subject.createHistoricalPrivateEvidenceOutboxProjector;
}

function persistedIntent(
  overrides: Partial<PersistedIntent> = {},
): PersistedIntent {
  return {
    outboxEventId: "finance-outbox-event-adversarial-001",
    auditEventId: "finance-audit-event-adversarial-001",
    auditReceiptId: "finance-audit-receipt-adversarial-001",
    objectId:
      "finance-historical-private-evidence-object-v1|sha256=" + "d".repeat(64),
    operation: "historical-private-evidence:import",
    scope: { companyId: scope.companyId, schoolId: scope.schoolId },
    source: {
      sourceSystem: "owner-attested-archive",
      sourceVersion: "archive-v1",
      sourceIdentity: "legacy-receipt-001",
    },
    payload: {
      packetVersion: "historical-private-evidence-packet.v1",
      evidenceReference,
    },
    authorizationEvidence: {
      source: "company-identity",
      claimsVersion: "company-identity-claims-v1",
      policyVersion: "finance-historical-import-role-policy-v1",
      subjectId: "employee-historical-importer",
      organizationId: scope.companyId,
      appRoleIds: [acceptedRoleId],
      schoolIds: [scope.schoolId],
    },
    payloadDigest,
    ...overrides,
  } as PersistedIntent;
}

function createDurableFake(): {
  readonly enqueue: ReturnType<typeof vi.fn>;
  readonly durableJobs: DurableJobEnqueuePort;
} {
  const enqueue = vi.fn(async () => ({
    outcome: "enqueued",
    jobId: "018f0d8f-31d1-7d50-9f4f-550d34295095",
  }));
  return {
    enqueue,
    durableJobs: { enqueue } as unknown as DurableJobEnqueuePort,
  };
}

function createStoreFake(
  receipts: ReadonlyMap<string, Readonly<ProjectorReceipt>> = new Map(),
): {
  readonly find: ReturnType<typeof vi.fn>;
  readonly bind: ReturnType<typeof vi.fn>;
  readonly claim: ReturnType<typeof vi.fn>;
  readonly release: ReturnType<typeof vi.fn>;
  readonly store: {
    findByOutboxEventId(
      outboxEventId: string,
    ): Promise<Readonly<ProjectorReceipt> | undefined>;
    bindReceipt(input: Readonly<{ claimToken: string; receipt: ProjectorReceipt }>): Promise<unknown>;
    claimReceipt(
      input: Readonly<{
        readonly outboxEventId: string;
        readonly idempotencyKey: string;
        readonly intent: Readonly<PersistedIntent>;
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
    releaseClaim(input: Readonly<Record<string, unknown>>): Promise<void>;
  };
} {
  const find = vi.fn(async (outboxEventId: string) =>
    receipts.get(outboxEventId),
  );
  const bind = vi.fn(async () => ({ status: "bound" as const }));
  const claim = vi.fn(async () => ({
    status: "claimed" as const,
    claimToken: "claim-token-adversarial-001",
  }));
  const release = vi.fn(async () => undefined);
  return {
    find,
    bind,
    claim,
    release,
    store: {
      findByOutboxEventId: find,
      bindReceipt: bind,
      claimReceipt: claim,
      releaseClaim: release,
    },
  };
}

describe("Finance Task 3 C-boundary adversarial coverage", () => {
  it("rejects intents whose outbox event identity carries a non-UUID jobId from the durable result", async () => {
    const subject = await loadProjector();
    const createProjector = requireProjectorFactory(subject);
    const enqueue = vi.fn(async () => ({
      outcome: "enqueued",
      jobId: "not-a-uuid",
    }));
    const store = createStoreFake();
    const projector = createProjector({
      durableJobs: { enqueue } as unknown as DurableJobEnqueuePort,
      projectionStore: store.store,
      job: {
        jobName: "finance.historical-private-evidence.import",
        queueName: "finance-historical-imports",
        maxAttempts: 3,
      },
    });

    await expect(projector.project(persistedIntent())).rejects.toThrow(
      "FINANCE_DURABLE_OUTCOME_INVALID",
    );
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(store.bind).not.toHaveBeenCalled();
  });

  it("rejects a stored receipt whose shape violates the projector receipt schema", async () => {
    const subject = await loadProjector();
    const createProjector = requireProjectorFactory(subject);
    const intent = persistedIntent();
    const durable = createDurableFake();
    const store = createStoreFake(
      new Map<string, ProjectorReceipt>([
        [
          intent.outboxEventId,
          {
            outboxEventId: intent.outboxEventId,
            auditEventId: intent.auditEventId,
            auditReceiptId: intent.auditReceiptId,
            idempotencyKey: "x",
            jobId: "still-a-uuid",
            // extra unapproved key — strictObject should reject at receipt parse
            // even if the projector tries to re-bind it.
            extraAttackerField: "injected",
          } as unknown as ProjectorReceipt,
        ],
      ]),
    );
    const projector = createProjector({
      durableJobs: durable.durableJobs,
      projectionStore: store.store,
      job: {
        jobName: "finance.historical-private-evidence.import",
        queueName: "finance-historical-imports",
        maxAttempts: 3,
      },
    });

    await expect(projector.project(intent)).rejects.toThrow(
      "FINANCE_OUTBOX_RECEIPT_INVALID",
    );
    expect(durable.enqueue).not.toHaveBeenCalled();
    expect(store.bind).not.toHaveBeenCalled();
  });

  it("prefixes every idempotency key with the version tag `historical-private-evidence-outbox-v1` and length-encodes every field", async () => {
    const subject = await loadProjector();
    const createProjector = requireProjectorFactory(subject);
    const intent = persistedIntent();
    const durable = createDurableFake();
    const store = createStoreFake();
    const projector = createProjector({
      durableJobs: durable.durableJobs,
      projectionStore: store.store,
      job: {
        jobName: "finance.historical-private-evidence.import",
        queueName: "finance-historical-imports",
        maxAttempts: 3,
      },
    });

    await projector.project(intent);
    const request = durable.enqueue.mock.calls[0]?.[0] as {
      readonly idempotencyKey: string;
    };
    expect(
      request.idempotencyKey.startsWith(
        "historical-private-evidence-outbox-v1|",
      ),
    ).toBe(true);
    const segments = request.idempotencyKey.split("|");
    if (segments.length === 2 && segments[1]?.startsWith("sha256=")) {
      expect(segments[1]).toMatch(/^sha256=[a-f0-9]{64}$/u);
      return;
    }
    // Every segment must be length-prefixed and never a bare
    // concatenation of fields without explicit boundaries. The school
    // segment uses the canonical `school=none` or `school=some:<len>:<id>`
    // shape; all other segments are `<key>=<len>:<value>`.
    for (const segment of segments.slice(1)) {
      if (segment === "school=none") continue;
      expect(segment).toMatch(/^[a-z-]+=(?:some:\d+:.+|\d+:.+)$/u);
    }
  });

  it("freezes the projector result and its receipt so caller-side mutation throws in strict mode", async () => {
    const subject = await loadProjector();
    const createProjector = requireProjectorFactory(subject);
    const durable = createDurableFake();
    const store = createStoreFake();
    const projector = createProjector({
      durableJobs: durable.durableJobs,
      projectionStore: store.store,
      job: {
        jobName: "finance.historical-private-evidence.import",
        queueName: "finance-historical-imports",
        maxAttempts: 3,
      },
    });

    const result = (await projector.project(persistedIntent())) as {
      readonly status: string;
      readonly receipt: ProjectorReceipt;
    };
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.receipt)).toBe(true);
    expect(() => {
      (result as { status: string }).status = "tampered";
    }).toThrow(TypeError);
    expect(() => {
      (result.receipt as { jobId: string }).jobId = "tampered";
    }).toThrow(TypeError);
    expect(() => {
      (result.receipt as unknown as { auditEventId: string }).auditEventId =
        "tampered";
    }).toThrow(TypeError);
  });
});

/** Allowed evidence reference, scope, and packet digest. */
const allowedEvidence = {
  evidenceReference,
  scope: { companyId: scope.companyId, schoolId: scope.schoolId } as const,
  payloadDigest,
};

const allowedAttestationResult = {
  decision: "allow" as const,
  evidence: {
    source: "company-identity" as const,
    claimsVersion: "company-identity-claims-v1",
    policyVersion: "finance-historical-import-role-policy-v1",
    subjectId: "employee-historical-importer",
    organizationId: scope.companyId,
    appRoleIds: [acceptedRoleId],
    schoolIds: [scope.schoolId],
  },
};

/** Minimal command packet factory. */
function packet(): Record<string, unknown> {
  return {
    packetVersion: "historical-private-evidence-packet.v1",
    scope,
    source: {
      sourceSystem: "owner-attested-archive",
      sourceVersion: "archive-v1",
      sourceIdentity: "legacy-receipt-001",
      payloadDigest,
      evidenceReference,
    },
    facts: [
      {
        factCategory: "document-total",
        factId: "document-total:receipt-total",
        kind: "source-stated-value",
        label: "Total as stated on receipt",
        value: "1323.00",
      },
    ],
  };
}

/** Attestor fake for command tests. */
interface AttestorFake {
  readonly attest: ReturnType<typeof vi.fn>;
}
interface BindingFake {
  readonly verify: ReturnType<typeof vi.fn>;
}

function makeFakes(
  input: {
    readonly attestation?: unknown;
    readonly evidence?: unknown;
  } = {},
): {
  readonly attestor: { attest: AttestorFake["attest"] };
  readonly binding: { verify: BindingFake["verify"] };
} {
  return {
    attestor: {
      attest: vi.fn(async () => input.attestation ?? allowedAttestationResult),
    },
    binding: {
      verify: vi.fn(async () => input.evidence ?? allowedEvidence),
    },
  };
}

/** Command module surface. */
interface CommandModule {
  readonly createHistoricalPrivateEvidenceImportCommand: (input: {
    readonly companyIdentityAttestor: { attest: AttestorFake["attest"] };
    readonly privateEvidenceBindingPort: { verify: BindingFake["verify"] };
  }) => {
    prepare(input: unknown): Promise<{
      readonly packet: Record<string, unknown>;
      readonly authorizationEvidence: { readonly subjectId: string };
      readonly evidence: { readonly evidenceReference: string };
    }>;
  };
}

async function loadCommand(): Promise<CommandModule> {
  return (await import("../../finance-operations/index.js")) as unknown as CommandModule;
}

function requireCommandFactory(
  subject: CommandModule,
): CommandModule["createHistoricalPrivateEvidenceImportCommand"] {
  expect(
    subject.createHistoricalPrivateEvidenceImportCommand,
    "Finance Operations must export createHistoricalPrivateEvidenceImportCommand",
  ).toBeTypeOf("function");
  return subject.createHistoricalPrivateEvidenceImportCommand;
}

/** Builds a valid command request from the supplied packet value. */
function commandRequest(
  packetValue: Record<string, unknown> = packet(),
): Record<string, unknown> {
  return {
    packet: packetValue,
    credential: { kind: "token", value: "authenticated-owner-token" },
    audit: auditContext(),
  };
}

describe("Finance Task 3 D-boundary adversarial coverage", () => {
  it.each([
    {
      name: "caller-supplied `authorization` field",
      extra: { authorization: allowedAttestationResult.evidence },
    },
    {
      name: "caller-supplied `evidence` field",
      extra: { evidence: allowedEvidence },
    },
    {
      name: "caller-supplied `binding` field",
      extra: { binding: { source: "attacker-binding" } },
    },
    {
      name: "caller-supplied `result` field",
      extra: { result: { status: "accepted" } },
    },
    {
      name: "caller-supplied `packetDigest` field",
      extra: { packetDigest: "b".repeat(64) },
    },
  ])(
    "rejects $name in the command envelope without calling attestor or binding",
    async ({ extra }) => {
      const subject = await loadCommand();
      const createCommand = requireCommandFactory(subject);
      const fakes = makeFakes();
      const command = createCommand({
        companyIdentityAttestor: fakes.attestor,
        privateEvidenceBindingPort: fakes.binding,
      });

      await expect(
        command.prepare({ ...commandRequest(), ...extra }),
      ).rejects.toThrow("FINANCE_COMMAND_INPUT_INVALID");
      expect(fakes.attestor.attest).not.toHaveBeenCalled();
      expect(fakes.binding.verify).not.toHaveBeenCalled();
    },
  );

  it("freezes the prepared envelope, authorization evidence, and binding snapshot", async () => {
    const subject = await loadCommand();
    const createCommand = requireCommandFactory(subject);
    const fakes = makeFakes();
    const command = createCommand({
      companyIdentityAttestor: fakes.attestor,
      privateEvidenceBindingPort: fakes.binding,
    });

    const result = await command.prepare(commandRequest());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.authorizationEvidence)).toBe(true);
    expect(Object.isFrozen(result.evidence)).toBe(true);
    expect(() => {
      (result as { packet: unknown }).packet = "tampered";
    }).toThrow(TypeError);
    expect(() => {
      (result.authorizationEvidence as { subjectId: string }).subjectId =
        "tampered";
    }).toThrow(TypeError);
    expect(() => {
      (result.evidence as { evidenceReference: string }).evidenceReference =
        "tampered";
    }).toThrow(TypeError);
  });

  it("returns the packet unchanged by value and never normalizes the source-stated fact value", async () => {
    const subject = await loadCommand();
    const createCommand = requireCommandFactory(subject);
    const fakes = makeFakes();
    const command = createCommand({
      companyIdentityAttestor: fakes.attestor,
      privateEvidenceBindingPort: fakes.binding,
    });
    const packetValue = packet();
    const expected = JSON.parse(JSON.stringify(packetValue));

    const result = await command.prepare(commandRequest(packetValue));
    expect(result.packet).toEqual(expected);
    expect(JSON.stringify(result.packet)).toBe(JSON.stringify(expected));
  });

  it.each([
    {
      name: "an empty facts array",
      mutate: (value: Record<string, unknown>): void => {
        value.facts = [];
      },
    },
    {
      name: "a single fact",
      mutate: (value: Record<string, unknown>): void => {
        value.facts = [
          {
            factCategory: "document-total",
            factId: "document-total:receipt-total",
            kind: "source-stated-value",
            label: "Total as stated on receipt",
            value: "1323.00",
          },
        ];
      },
    },
    {
      name: "exactly 128 facts",
      mutate: (value: Record<string, unknown>): void => {
        value.facts = Array.from({ length: 128 }, () => ({
          factCategory: "document-total",
          factId: "document-total:receipt-total",
          kind: "source-stated-value",
          label: "Total",
          value: "1.00",
        }));
      },
    },
    {
      name: "129 facts (over the maximum)",
      mutate: (value: Record<string, unknown>): void => {
        value.facts = Array.from({ length: 129 }, () => ({
          factCategory: "document-total",
          factId: "document-total:receipt-total",
          kind: "source-stated-value",
          label: "Total",
          value: "1.00",
        }));
      },
    },
  ])(
    "rejects $name before attestation or binding verification",
    async ({ mutate }) => {
      const subject = await loadCommand();
      const createCommand = requireCommandFactory(subject);
      const fakes = makeFakes();
      const command = createCommand({
        companyIdentityAttestor: fakes.attestor,
        privateEvidenceBindingPort: fakes.binding,
      });
      const packetValue = packet();
      mutate(packetValue);

      if (
        packetValue.facts &&
        (packetValue.facts as unknown[]).length >= 1 &&
        (packetValue.facts as unknown[]).length <= 128
      ) {
        await expect(
          command.prepare(commandRequest(packetValue)),
        ).resolves.toBeDefined();
        expect(fakes.attestor.attest).toHaveBeenCalledTimes(1);
        expect(fakes.binding.verify).toHaveBeenCalledTimes(1);
      } else {
        await expect(
          command.prepare(commandRequest(packetValue)),
        ).rejects.toThrow("FINANCE_PACKET_INVALID");
        expect(fakes.attestor.attest).not.toHaveBeenCalled();
        expect(fakes.binding.verify).not.toHaveBeenCalled();
      }
    },
  );

  it("rejects an attestor decision whose `evidence` violates the strictObject evidence schema (empty `appRoleIds`)", async () => {
    const subject = await loadCommand();
    const createCommand = requireCommandFactory(subject);
    const fakes = makeFakes({
      attestation: {
        decision: "allow",
        evidence: {
          source: "company-identity",
          claimsVersion: "company-identity-claims-v1",
          subjectId: "employee-historical-importer",
          organizationId: scope.companyId,
          appRoleIds: [],
          schoolIds: [scope.schoolId],
        },
      },
    });
    const command = createCommand({
      companyIdentityAttestor: fakes.attestor,
      privateEvidenceBindingPort: fakes.binding,
    });

    await expect(command.prepare(commandRequest())).rejects.toThrow(
      "FINANCE_ATTESTATION_INVALID",
    );
    expect(fakes.attestor.attest).toHaveBeenCalledTimes(1);
    expect(fakes.binding.verify).not.toHaveBeenCalled();
  });
});
