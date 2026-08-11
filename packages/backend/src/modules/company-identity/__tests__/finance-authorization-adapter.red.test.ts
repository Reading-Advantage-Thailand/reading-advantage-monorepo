import { describe, expect, it, vi } from "vitest";

const scope = {
  companyId: "company-historical",
  schoolId: "school-historical",
} as const;
const companyScope = { companyId: scope.companyId } as const;
const acceptedRoleId = "role-historical-private-evidence-import";

interface AuthenticatedOwnerClaims {
  /** Identity-contract version validated by the owner authentication boundary. */
  readonly claimsVersion: string;
  /** Authenticated employee subject. */
  readonly subjectId: string;
  /** Company organization bound to the authenticated subject. */
  readonly organizationId: string;
  /** Application roles actually issued to the authenticated subject. */
  readonly appRoleIds: readonly string[];
  /** Explicit school attestations, when the owner issues them. */
  readonly schoolIds?: readonly string[];
}

interface FinanceRolePolicy {
  /** Accepted role-mapping version reviewed by the Company Identity owner. */
  readonly policyVersion: string;
  /** Role IDs accepted for this bounded Finance operation. */
  readonly acceptedRoleIds: readonly string[];
}

interface CompanyIdentityAuthenticator {
  /** Resolves a presented authenticated owner credential to verified owner claims. */
  authenticate(input: {
    readonly credential: {
      readonly kind: "session" | "token";
      readonly value: string;
    };
  }): Promise<Readonly<AuthenticatedOwnerClaims> | undefined>;
}

interface FinanceAttestationRequestAuditContext {
  /** Immutable identifier assigned to this requested authorization event. */
  readonly eventId: string;
  /** Finance packet identity to which the authorization applies. */
  readonly objectId: string;
  /** UTC instant at which the caller requested attestation. */
  readonly occurredAt: string;
  /** Request identifier propagated through the attestation boundary. */
  readonly requestId: string;
  /** Correlation identifier shared with the controlled-import command. */
  readonly correlationId: string;
}

type FinanceAttestationAuditActor =
  | { readonly kind: "authenticated-owner"; readonly subjectId: string }
  | { readonly kind: "unauthenticated" };

type FinanceAttestationAuditReason =
  | "role-policy-accepted"
  | "unauthenticated"
  | "claims-version-missing"
  | "organization-mismatch"
  | "role-not-accepted"
  | "school-attestation-missing";

interface FinanceAttestationAuditEvent extends FinanceAttestationRequestAuditContext {
  /** Actor recovered from the owner-authenticated credential, when available. */
  readonly actor: FinanceAttestationAuditActor;
  /** Finance operation authorized or denied by this event. */
  readonly operation: "historical-private-evidence:import";
  /** Company-first scope checked for this event. */
  readonly scope: { readonly companyId: string; readonly schoolId?: string };
  /** Immutable result of the attestation decision. */
  readonly outcome: "allowed" | "denied";
  /** Stable reason for the recorded outcome. */
  readonly reason: FinanceAttestationAuditReason;
}

interface FinanceAttestationAuditPort {
  /** Appends an immutable decision record for a Finance authorization attempt. */
  append(event: Readonly<FinanceAttestationAuditEvent>): Promise<void>;
}

type FinanceAttestationDecision =
  | {
      readonly decision: "allow";
      readonly evidence: {
        readonly source: "company-identity";
        readonly claimsVersion: string;
        readonly subjectId: string;
        readonly organizationId: string;
        readonly appRoleIds: readonly string[];
        readonly schoolIds?: readonly string[];
      };
    }
  | {
      readonly decision: "deny";
      readonly reason:
        | "unauthenticated"
        | "claims-version-missing"
        | "organization-mismatch"
        | "role-not-accepted"
        | "school-attestation-missing";
    };

interface FinanceCompanyIdentityAttestor {
  /** Attests a Finance historical-packet operation using only an authenticated owner credential. */
  attest(input: {
    readonly operation: "historical-private-evidence:import";
    readonly scope: { readonly companyId: string; readonly schoolId?: string };
    readonly credential: {
      readonly kind: "session" | "token";
      readonly value: string;
    };
    /** Exact audit-correlation fields owned by the controlled-import caller. */
    readonly audit: Readonly<FinanceAttestationRequestAuditContext>;
  }): Promise<FinanceAttestationDecision>;
}

interface CompanyIdentityFinanceAdapterModule {
  /** Creates the Finance attestor over owner authentication, accepted role policy, and audit ports. */
  createFinanceCompanyIdentityAttestor(input: {
    readonly authenticator: CompanyIdentityAuthenticator;
    readonly rolePolicy: FinanceRolePolicy;
    readonly auditPort: FinanceAttestationAuditPort;
  }): FinanceCompanyIdentityAttestor;
}

/** Loads the public Company Identity module as the future Finance attestor boundary. */
async function loadCompanyIdentityFinanceAdapter(): Promise<CompanyIdentityFinanceAdapterModule> {
  return (await import("../index.js")) as unknown as CompanyIdentityFinanceAdapterModule;
}

/** Requires the behavior-level factory without inspecting source text or module layout. */
function requireAttestorFactory(
  subject: CompanyIdentityFinanceAdapterModule,
): CompanyIdentityFinanceAdapterModule["createFinanceCompanyIdentityAttestor"] {
  expect(
    subject.createFinanceCompanyIdentityAttestor,
    "Company Identity must export createFinanceCompanyIdentityAttestor for authenticated historical-private-evidence authorization.",
  ).toBeTypeOf("function");
  return subject.createFinanceCompanyIdentityAttestor;
}

/** Builds valid authenticated owner claims without relying on a globally hard-coded Finance role. */
function ownerClaims(
  overrides: Partial<AuthenticatedOwnerClaims> = {},
): AuthenticatedOwnerClaims {
  return {
    claimsVersion: "company-identity-claims-v1",
    subjectId: "employee-historical-importer",
    organizationId: scope.companyId,
    appRoleIds: [acceptedRoleId],
    schoolIds: [scope.schoolId],
    ...overrides,
  };
}

/** Creates injected owner-authentication and audit fakes with recorded boundary calls. */
function createAttestorFakes(
  input: {
    readonly claims?: AuthenticatedOwnerClaims;
    readonly authenticated?: boolean;
  } = {},
): {
  readonly authenticator: CompanyIdentityAuthenticator;
  readonly authenticate: ReturnType<typeof vi.fn>;
  readonly auditPort: FinanceAttestationAuditPort;
  readonly events: Array<Parameters<FinanceAttestationAuditPort["append"]>[0]>;
} {
  const events: Array<Parameters<FinanceAttestationAuditPort["append"]>[0]> =
    [];
  const authenticate = vi.fn(async () =>
    input.authenticated === false ? undefined : (input.claims ?? ownerClaims()),
  );
  return {
    authenticate,
    authenticator: { authenticate },
    auditPort: {
      append: async (event) => {
        events.push(Object.freeze({ ...event }));
      },
    },
    events,
  };
}

/** Creates the accepted Company Identity role policy as an injected, versioned decision. */
function rolePolicy(
  acceptedRoleIds: readonly string[] = [acceptedRoleId],
): FinanceRolePolicy {
  return {
    policyVersion: "finance-historical-import-role-policy-v1",
    acceptedRoleIds,
  };
}

/** Creates immutable correlation metadata that must be reproduced exactly in the audit event. */
function auditRequest(
  overrides: Partial<FinanceAttestationRequestAuditContext> = {},
): FinanceAttestationRequestAuditContext {
  return {
    eventId: "finance-attestation-event-001",
    objectId: "historical-private-evidence-packet-001",
    occurredAt: "2026-08-11T04:00:00.000Z",
    requestId: "finance-import-request-001",
    correlationId: "finance-import-correlation-001",
    ...overrides,
  };
}

describe("Company Identity historical private-evidence attestation RED contract", () => {
  it("derives a school-scoped Finance attestation from an authenticated owner token and injected accepted-role policy", async () => {
    const subject = await loadCompanyIdentityFinanceAdapter();
    const createAttestor = requireAttestorFactory(subject);
    const fakes = createAttestorFakes();
    const attestor = createAttestor({
      authenticator: fakes.authenticator,
      rolePolicy: rolePolicy(),
      auditPort: fakes.auditPort,
    });
    const audit = auditRequest();

    await expect(
      attestor.attest({
        operation: "historical-private-evidence:import",
        scope,
        credential: { kind: "token", value: "authenticated-owner-token" },
        audit,
      }),
    ).resolves.toEqual({
      decision: "allow",
      evidence: {
        source: "company-identity",
        claimsVersion: "company-identity-claims-v1",
        subjectId: "employee-historical-importer",
        organizationId: scope.companyId,
        appRoleIds: [acceptedRoleId],
        schoolIds: [scope.schoolId],
      },
    });
    expect(fakes.authenticate).toHaveBeenCalledTimes(1);
    expect(fakes.authenticate).toHaveBeenCalledWith({
      credential: { kind: "token", value: "authenticated-owner-token" },
    });
    expect(fakes.events).toEqual([
      {
        ...audit,
        actor: {
          kind: "authenticated-owner",
          subjectId: "employee-historical-importer",
        },
        operation: "historical-private-evidence:import",
        scope,
        outcome: "allowed",
        reason: "role-policy-accepted",
      },
    ]);
  });

  it("allows a company-scoped packet without a school attestation but never expands a school claim globally", async () => {
    const subject = await loadCompanyIdentityFinanceAdapter();
    const createAttestor = requireAttestorFactory(subject);
    const fakes = createAttestorFakes({
      claims: ownerClaims({ schoolIds: undefined }),
    });
    const attestor = createAttestor({
      authenticator: fakes.authenticator,
      rolePolicy: rolePolicy(),
      auditPort: fakes.auditPort,
    });
    const companyAudit = auditRequest({
      eventId: "finance-attestation-event-company-001",
      objectId: "historical-private-evidence-packet-company-001",
    });
    const schoolAudit = auditRequest({
      eventId: "finance-attestation-event-school-001",
      objectId: "historical-private-evidence-packet-school-001",
    });

    await expect(
      attestor.attest({
        operation: "historical-private-evidence:import",
        scope: companyScope,
        credential: { kind: "session", value: "authenticated-owner-session" },
        audit: companyAudit,
      }),
    ).resolves.toEqual({
      decision: "allow",
      evidence: {
        source: "company-identity",
        claimsVersion: "company-identity-claims-v1",
        subjectId: "employee-historical-importer",
        organizationId: scope.companyId,
        appRoleIds: [acceptedRoleId],
      },
    });
    await expect(
      attestor.attest({
        operation: "historical-private-evidence:import",
        scope,
        credential: { kind: "session", value: "authenticated-owner-session" },
        audit: schoolAudit,
      }),
    ).resolves.toEqual({
      decision: "deny",
      reason: "school-attestation-missing",
    });
    expect(fakes.events).toEqual([
      {
        ...companyAudit,
        actor: {
          kind: "authenticated-owner",
          subjectId: "employee-historical-importer",
        },
        operation: "historical-private-evidence:import",
        scope: companyScope,
        outcome: "allowed",
        reason: "role-policy-accepted",
      },
      {
        ...schoolAudit,
        actor: {
          kind: "authenticated-owner",
          subjectId: "employee-historical-importer",
        },
        operation: "historical-private-evidence:import",
        scope,
        outcome: "denied",
        reason: "school-attestation-missing",
      },
    ]);
  });

  it("denies and audits a school scope when the authenticated owner has a nonempty attestation list for different schools", async () => {
    const subject = await loadCompanyIdentityFinanceAdapter();
    const createAttestor = requireAttestorFactory(subject);
    const fakes = createAttestorFakes({
      claims: ownerClaims({ schoolIds: ["school-other", "school-another"] }),
    });
    const attestor = createAttestor({
      authenticator: fakes.authenticator,
      rolePolicy: rolePolicy(),
      auditPort: fakes.auditPort,
    });
    const audit = auditRequest({
      eventId: "finance-attestation-event-nonmatching-school-001",
      objectId: "historical-private-evidence-packet-nonmatching-school-001",
    });

    await expect(
      attestor.attest({
        operation: "historical-private-evidence:import",
        scope,
        credential: { kind: "token", value: "authenticated-owner-token" },
        audit,
      }),
    ).resolves.toEqual({
      decision: "deny",
      reason: "school-attestation-missing",
    });
    expect(fakes.events).toEqual([
      {
        ...audit,
        actor: {
          kind: "authenticated-owner",
          subjectId: "employee-historical-importer",
        },
        operation: "historical-private-evidence:import",
        scope,
        outcome: "denied",
        reason: "school-attestation-missing",
      },
    ]);
  });

  it.each([
    {
      name: "an unauthenticated credential",
      fakes: { authenticated: false },
      policy: rolePolicy(),
      expected: "unauthenticated",
    },
    {
      name: "a missing claims version",
      fakes: { claims: ownerClaims({ claimsVersion: "" }) },
      policy: rolePolicy(),
      expected: "claims-version-missing",
    },
    {
      name: "an organization for another company",
      fakes: { claims: ownerClaims({ organizationId: "another-company" }) },
      policy: rolePolicy(),
      expected: "organization-mismatch",
    },
    {
      name: "a role absent from the injected policy",
      fakes: { claims: ownerClaims({ appRoleIds: ["role-other-app"] }) },
      policy: rolePolicy(),
      expected: "role-not-accepted",
    },
  ] as const)(
    "denies and audits $name",
    async ({ fakes: fakeInput, policy, expected }) => {
      const subject = await loadCompanyIdentityFinanceAdapter();
      const createAttestor = requireAttestorFactory(subject);
      const fakes = createAttestorFakes(fakeInput);
      const attestor = createAttestor({
        authenticator: fakes.authenticator,
        rolePolicy: policy,
        auditPort: fakes.auditPort,
      });
      const audit = auditRequest({
        eventId: `finance-attestation-${expected}`,
      });
      const claims =
        fakeInput.authenticated === false
          ? undefined
          : (fakeInput.claims ?? ownerClaims());

      await expect(
        attestor.attest({
          operation: "historical-private-evidence:import",
          scope,
          credential: { kind: "token", value: "owner-token-for-denial" },
          audit,
        }),
      ).resolves.toEqual({ decision: "deny", reason: expected });
      expect(fakes.events).toEqual([
        {
          ...audit,
          actor:
            claims === undefined
              ? { kind: "unauthenticated" }
              : { kind: "authenticated-owner", subjectId: claims.subjectId },
          operation: "historical-private-evidence:import",
          scope,
          outcome: "denied",
          reason: expected,
        },
      ]);
    },
  );
});
