/**
 * Adversarial test for Finance Phase 1 Task 3 A-boundary gaps.
 *
 * Purpose:
 *   - Closes specific gaps the existing finance-authorization-adapter
 *     red tests did not exercise. The tests are behavior-level (not
 *     source-string matching) and target falsifiers documented in
 *     `test-strategy.md` §"Falsifiability statement".
 *
 * Targeted gaps:
 *   A.  Attestor secret-safe audit when the authenticator throws
 *       (authentication-failed reason, no credential value, exactly one
 *       immutable audit event, deep immutability).
 *
 * C-boundary (durable outbox projector) and D-boundary (import-command
 * envelope) coverage lived against finance-operations factories that
 * this track deleted. Those cases are removed with the deleted surface.
 *
 * Anti-pattern coverage (per test-strategy.md §"Anti-pattern coverage"):
 *   A1/A4  behavior-level assertions over injected fakes, not source-text
 *          presence or substring matches.
 *   A5     no "green" claim can be made unless every assertion below
 *          actually passes when the targeted command runs.
 */
import { describe, expect, it, vi } from "vitest";

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
