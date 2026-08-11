import { describe, expect, it, vi } from "vitest";

const companyId = "11111111-1111-4111-8111-111111111111";
const subjectId = "22222222-2222-4222-8222-222222222222";
const acceptedRoleId = "finance-historical-private-evidence-import";
const operation = "historical-private-evidence:import" as const;

interface AuditContext {
  readonly eventId: string;
  readonly objectId: string;
  readonly occurredAt: string;
  readonly requestId: string;
  readonly correlationId: string;
}

interface TrustedAuditSources {
  readonly createEventId: () => string;
  readonly createRequestId: () => string;
  readonly createCorrelationId: () => string;
  readonly now: () => Date;
}

interface OwnerClaims {
  readonly claimsVersion: string;
  readonly subjectId: string;
  readonly organizationId: string;
  readonly appRoleIds: readonly string[];
  readonly schoolIds?: readonly string[];
}

interface ExpectedAuthenticator {
  authenticate(input: {
    readonly credential: { readonly kind: "session" | "token"; readonly value: string };
  }): Promise<Readonly<OwnerClaims> | undefined>;
}

interface AttestorModule {
  readonly createFinanceCompanyIdentityAttestor?: (input: {
    readonly authenticator: {
      authenticate(input: {
        readonly credential: { readonly kind: "session" | "token"; readonly value: string };
      }): Promise<Readonly<{
        readonly claimsVersion: string;
        readonly subjectId: string;
        readonly organizationId: string;
        readonly appRoleIds: readonly string[];
        readonly schoolIds?: readonly string[];
      }> | undefined>;
    };
    readonly rolePolicy: {
      readonly policyVersion: string;
      readonly acceptedRoleIds: readonly string[];
    };
    readonly auditPort: {
      append(event: Readonly<Record<string, unknown>>): Promise<void>;
    };
    readonly trustedAuditSources?: TrustedAuditSources;
  }) => {
    attest(input: {
      readonly operation: typeof operation;
      readonly scope: { readonly companyId: string; readonly schoolId?: string };
      readonly credential: { readonly kind: "session" | "token"; readonly value: string };
      readonly audit: Readonly<AuditContext>;
    }): Promise<unknown>;
  };
  readonly createCompanyIdentityFinanceAttestationAuditPort?: (input: {
    readonly repository: {
      appendAudit(input: Readonly<Record<string, unknown>>): Promise<void>;
    };
  }) => {
    append(event: Readonly<Record<string, unknown>>): Promise<void>;
  };
}

/** Loads the public Company Identity module for the Review B remediation contract. */
async function loadCompanyIdentityModule(): Promise<AttestorModule> {
  return (await import("../index.js")) as unknown as AttestorModule;
}

/** Creates deterministic server-owned audit sources for a falsifiable trust-root test. */
function trustedAuditSources(): TrustedAuditSources {
  return {
    createEventId: vi.fn(
      () => "33333333-3333-4333-8333-333333333333",
    ),
    createRequestId: vi.fn(
      () => "44444444-4444-4444-8444-444444444444",
    ),
    createCorrelationId: vi.fn(
      () => "55555555-5555-4555-8555-555555555555",
    ),
    now: vi.fn(() => new Date("2026-08-11T05:00:00.000Z")),
  };
}

/** Builds an authenticated owner claim set for the historical import operation. */
function ownerClaims(overrides: Partial<OwnerClaims> = {}): OwnerClaims {
  return {
    claimsVersion: "company-identity-claims-v7",
    subjectId,
    organizationId: companyId,
    appRoleIds: [acceptedRoleId],
    schoolIds: ["school-historical"],
    ...overrides,
  };
}

/** Builds a caller audit envelope containing fields that the server must replace. */
function callerAudit(secret: string): AuditContext {
  return {
    eventId: "caller-event-id",
    objectId: "66666666-6666-4666-8666-666666666666",
    occurredAt: "1999-01-01T00:00:00.000Z",
    requestId: secret,
    correlationId: secret,
  };
}

/** Creates the attestor fakes and captures the exact immutable audit references. */
function createAttestorHarness(): {
  readonly authenticate: ReturnType<typeof vi.fn>;
  readonly append: ReturnType<typeof vi.fn>;
  readonly events: ReadonlyArray<Readonly<Record<string, unknown>>>;
  readonly authenticator: ExpectedAuthenticator;
  readonly auditPort: {
    append(event: Readonly<Record<string, unknown>>): Promise<void>;
  };
} {
  const events: Array<Readonly<Record<string, unknown>>> = [];
  const authenticate = vi.fn(
    async (_input: {
      readonly credential: { readonly kind: "session" | "token"; readonly value: string };
    }): Promise<OwnerClaims> => ownerClaims(),
  );
  const append = vi.fn(async (event: Readonly<Record<string, unknown>>) => {
    events.push(event);
  });
  return {
    authenticate,
    append,
    events,
    authenticator: { authenticate },
    auditPort: { append },
  };
}

describe("Finance Task 3 Review B Company Identity remediation RED contract", () => {
  it("uses trusted server-generated IDs and time, and rejects credential injection into audit fields", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createFinanceCompanyIdentityAttestor;
    expect(
      factory,
      "Company Identity must expose the Finance attestor factory.",
    ).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const harness = createAttestorHarness();
    const trusted = trustedAuditSources();
    const credential = {
      kind: "token" as const,
      value: "secret-owner-token-must-never-enter-audit",
    };
    const attestor = factory({
      authenticator: harness.authenticator,
      rolePolicy: {
        policyVersion: "finance-role-policy-v9",
        acceptedRoleIds: [acceptedRoleId],
      },
      auditPort: harness.auditPort,
      trustedAuditSources: trusted,
    });

    await expect(
      attestor.attest({
        operation,
        scope: { companyId },
        credential,
        audit: callerAudit(credential.value),
      }),
    ).resolves.toMatchObject({ decision: "allow" });

    expect(harness.append).toHaveBeenCalledTimes(1);
    const event = harness.events[0];
    expect(event).toMatchObject({
      eventId: "33333333-3333-4333-8333-333333333333",
      occurredAt: "2026-08-11T05:00:00.000Z",
      requestId: "44444444-4444-4444-8444-444444444444",
      correlationId: "55555555-5555-4555-8555-555555555555",
      objectId: "66666666-6666-4666-8666-666666666666",
    });
    expect(JSON.stringify(event)).not.toContain(credential.value);
    expect(trusted.createEventId).toHaveBeenCalledTimes(1);
    expect(trusted.createRequestId).toHaveBeenCalledTimes(1);
    expect(trusted.createCorrelationId).toHaveBeenCalledTimes(1);
    expect(trusted.now).toHaveBeenCalledTimes(1);
  });

  it("records the accepted claims version and injected role-policy version in the decision and audit", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createFinanceCompanyIdentityAttestor;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const harness = createAttestorHarness();
    harness.authenticate.mockResolvedValue(
      ownerClaims({ claimsVersion: "company-identity-claims-v8" }),
    );
    const policyVersion = "finance-role-policy-v10";
    const attestor = factory({
      authenticator: harness.authenticator,
      rolePolicy: { policyVersion, acceptedRoleIds: [acceptedRoleId] },
      auditPort: harness.auditPort,
      trustedAuditSources: trustedAuditSources(),
    });

    const decision = await attestor.attest({
      operation,
      scope: { companyId },
      credential: { kind: "session", value: "opaque-session" },
      audit: callerAudit("caller-controlled-audit-value"),
    });

    expect(decision).toMatchObject({
      decision: "allow",
      evidence: {
        claimsVersion: "company-identity-claims-v8",
        policyVersion,
      },
    });
    expect(harness.events[0]).toMatchObject({
      claimsVersion: "company-identity-claims-v8",
      policyVersion,
      outcome: "allowed",
      reason: "role-policy-accepted",
    });
  });

  it("routes historical-private-evidence:import audit events through a Company Identity durable append-only adapter", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createCompanyIdentityFinanceAttestationAuditPort;
    expect(
      factory,
      "Company Identity must expose a durable Finance attestation audit adapter.",
    ).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const persisted: Array<Readonly<Record<string, unknown>>> = [];
    const appendAudit = vi.fn(async (input: Readonly<Record<string, unknown>>) => {
      persisted.push(input);
    });
    const port = factory({ repository: { appendAudit } });
    const event = Object.freeze({
      eventId: "77777777-7777-4777-8777-777777777777",
      objectId: "88888888-8888-4888-8888-888888888888",
      occurredAt: "2026-08-11T05:01:00.000Z",
      requestId: "99999999-9999-4999-8999-999999999999",
      correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      actor: {
        kind: "authenticated-owner" as const,
        subjectId,
      },
      operation,
      scope: { companyId },
      outcome: "allowed" as const,
      reason: "role-policy-accepted" as const,
    });

    await port.append(event);

    expect(appendAudit).toHaveBeenCalledTimes(1);
    const durableInput = persisted[0];
    expect(durableInput).toMatchObject({
      correlationId: event.correlationId,
      organizationId: companyId,
      operation,
      outcome: "SUCCEEDED",
      reasonCode: "role-policy-accepted",
    });
    expect(durableInput?.metadata).toMatchObject({
      source: "finance-operations",
      resourceType: "historical-private-evidence",
    });
    expect(Object.keys(port).sort()).toEqual(["append"]);
  });
});
