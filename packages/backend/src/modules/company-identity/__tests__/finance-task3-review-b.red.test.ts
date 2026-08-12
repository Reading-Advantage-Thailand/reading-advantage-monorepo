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
    readonly credential: {
      readonly kind: "session" | "token";
      readonly value: string;
    };
  }): Promise<Readonly<OwnerClaims> | undefined>;
}

interface AttestorModule {
  readonly createFinanceCompanyIdentityAttestor?: (input: {
    readonly authenticator: {
      authenticate(input: {
        readonly credential: {
          readonly kind: "session" | "token";
          readonly value: string;
        };
      }): Promise<
        | Readonly<{
            readonly claimsVersion: string;
            readonly subjectId: string;
            readonly organizationId: string;
            readonly appRoleIds: readonly string[];
            readonly schoolIds?: readonly string[];
          }>
        | undefined
      >;
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
      readonly scope: {
        readonly companyId: string;
        readonly schoolId?: string;
      };
      readonly credential: {
        readonly kind: "session" | "token";
        readonly value: string;
      };
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
    createEventId: vi.fn(() => "33333333-3333-4333-8333-333333333333"),
    createRequestId: vi.fn(() => "44444444-4444-4444-8444-444444444444"),
    createCorrelationId: vi.fn(() => "55555555-5555-4555-8555-555555555555"),
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
      readonly credential: {
        readonly kind: "session" | "token";
        readonly value: string;
      };
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
    const appendAudit = vi.fn(
      async (input: Readonly<Record<string, unknown>>) => {
        persisted.push(input);
      },
    );
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
      scope: { companyId, schoolId: "school-alpha" },
      outcome: "allowed" as const,
      reason: "role-policy-accepted" as const,
      claimsVersion: "company-identity-claims-v8",
      policyVersion: "finance-role-policy-v10",
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
      schoolId: "school-alpha",
    });
    expect(Object.keys(port).sort()).toEqual(["append"]);
  });

  it("snapshots every audit field once before a deferred repository append", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createCompanyIdentityFinanceAttestationAuditPort;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const current = {
      eventId: "77777777-7777-4777-8777-777777777777",
      objectId:
        "finance-historical-private-evidence-object-v1|sha256=" + "a".repeat(64),
      occurredAt: "2026-08-11T05:01:00.000Z",
      requestId: "99999999-9999-4999-8999-999999999999",
      correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      actorKind: "authenticated-owner" as const,
      actorSubjectId: subjectId,
      companyId,
      schoolId: "school-alpha",
      operation,
      outcome: "allowed" as const,
      reason: "role-policy-accepted" as const,
      claimsVersion: "company-identity-claims-v8",
      policyVersion: "finance-role-policy-v10",
    };
    const reads = new Map<string, number>();
    const read = <T>(name: string, value: T): T => {
      reads.set(name, (reads.get(name) ?? 0) + 1);
      return value;
    };
    const event = {
      get eventId() {
        return read("eventId", current.eventId);
      },
      get objectId() {
        return read("objectId", current.objectId);
      },
      get occurredAt() {
        return read("occurredAt", current.occurredAt);
      },
      get requestId() {
        return read("requestId", current.requestId);
      },
      get correlationId() {
        return read("correlationId", current.correlationId);
      },
      get actor() {
        return read("actor", {
          get kind() {
            return read("actor.kind", current.actorKind);
          },
          get subjectId() {
            return read("actor.subjectId", current.actorSubjectId);
          },
        });
      },
      get operation() {
        return read("operation", current.operation);
      },
      get scope() {
        return read("scope", {
          get companyId() {
            return read("scope.companyId", current.companyId);
          },
          get schoolId() {
            return read("scope.schoolId", current.schoolId);
          },
        });
      },
      get outcome() {
        return read("outcome", current.outcome);
      },
      get reason() {
        return read("reason", current.reason);
      },
      get policyVersion() {
        return read("policyVersion", current.policyVersion);
      },
      get claimsVersion() {
        return read("claimsVersion", current.claimsVersion);
      },
    };
    let releaseRepository!: () => void;
    const repositoryPending = new Promise<void>((resolve) => {
      releaseRepository = resolve;
    });
    let persisted: Readonly<Record<string, unknown>> | undefined;
    const appendAudit = vi.fn(
      async (input: Readonly<Record<string, unknown>>) => {
        persisted = input;
        await repositoryPending;
      },
    );
    const port = factory({ repository: { appendAudit } });
    const appendPromise = port.append(
      event as unknown as Parameters<typeof port.append>[0],
    );

    expect(appendAudit).toHaveBeenCalledTimes(1);
    current.eventId = "attacker-event";
    current.objectId = "attacker-object";
    current.occurredAt = "2099-01-01T00:00:00.000Z";
    current.requestId = "POISON_REQUEST_SECRET";
    current.correlationId = "POISON_CORRELATION_SECRET";
    current.actorKind = "unauthenticated";
    current.actorSubjectId = "attacker-subject";
    current.companyId = "attacker-company";
    current.schoolId = "attacker-school";
    current.operation = "attacker-operation" as typeof operation;
    current.outcome = "denied";
    current.reason = "organization-mismatch";
    current.claimsVersion = "attacker-claims";
    current.policyVersion = "attacker-policy";
    releaseRepository();
    await appendPromise;

    expect(reads).toEqual(
      new Map([
        ["eventId", 1],
        ["objectId", 1],
        ["occurredAt", 1],
        ["requestId", 1],
        ["correlationId", 1],
        ["actor", 1],
        ["actor.kind", 1],
        ["actor.subjectId", 1],
        ["operation", 1],
        ["scope", 1],
        ["scope.companyId", 1],
        ["scope.schoolId", 1],
        ["outcome", 1],
        ["reason", 1],
        ["policyVersion", 1],
        ["claimsVersion", 1],
      ]),
    );
    expect(persisted).toMatchObject({
      correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      organizationId: companyId,
      operation,
      outcome: "SUCCEEDED",
      reasonCode: "role-policy-accepted",
      metadata: {
        eventId: "77777777-7777-4777-8777-777777777777",
        objectId: "finance-historical-private-evidence-object-v1|sha256=" + "a".repeat(64),
        requestId: "99999999-9999-4999-8999-999999999999",
        occurredAt: "2026-08-11T05:01:00.000Z",
        schoolId: "school-alpha",
        actorKind: "authenticated-owner",
        actorSubjectId: subjectId,
        claimsVersion: "company-identity-claims-v8",
        policyVersion: "finance-role-policy-v10",
      },
    });
    expect(JSON.stringify(persisted)).not.toContain("POISON_");
    expect(Object.isFrozen(persisted)).toBe(true);
    expect(Object.isFrozen(persisted?.metadata)).toBe(true);
  });

  it.each([
    "eventId",
    "objectId",
    "occurredAt",
    "requestId",
    "correlationId",
    "actor.kind",
    "actor.subjectId",
    "operation",
    "scope.companyId",
    "scope.schoolId",
    "outcome",
    "reason",
    "claimsVersion",
    "policyVersion",
  ] as const)(
    "maps a poisoned audit event getter (%s) without repository side effects",
    async (poisonedPath) => {
      const subject = await loadCompanyIdentityModule();
      const factory = subject.createCompanyIdentityFinanceAttestationAuditPort;
      expect(factory).toBeTypeOf("function");
      if (typeof factory !== "function") return;

      const secret = "POISON_AUDIT_EVENT_SECRET_73f94";
      const makeGetter = (path: string, value: unknown) =>
        path === poisonedPath
          ? () => {
              throw new Error(secret);
            }
          : () => value;
      const actor = {
        get kind() {
          return makeGetter("actor.kind", "authenticated-owner")();
        },
        get subjectId() {
          return makeGetter("actor.subjectId", subjectId)();
        },
      };
      const scope = {
        get companyId() {
          return makeGetter("scope.companyId", companyId)();
        },
        get schoolId() {
          return makeGetter("scope.schoolId", "school-alpha")();
        },
      };
      const event = {
        get eventId() {
          return makeGetter("eventId", "77777777-7777-4777-8777-777777777777")();
        },
        get objectId() {
          return makeGetter(
            "objectId",
            "finance-historical-private-evidence-object-v1|sha256=" + "a".repeat(64),
          )();
        },
        get occurredAt() {
          return makeGetter("occurredAt", "2026-08-11T05:01:00.000Z")();
        },
        get requestId() {
          return makeGetter("requestId", "99999999-9999-4999-8999-999999999999")();
        },
        get correlationId() {
          return makeGetter("correlationId", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")();
        },
        get actor() {
          return actor;
        },
        get operation() {
          return makeGetter("operation", operation)();
        },
        get scope() {
          return scope;
        },
        get outcome() {
          return makeGetter("outcome", "allowed")();
        },
        get reason() {
          return makeGetter("reason", "role-policy-accepted")();
        },
        get claimsVersion() {
          return makeGetter("claimsVersion", "company-identity-claims-v8")();
        },
        get policyVersion() {
          return makeGetter("policyVersion", "finance-role-policy-v10")();
        },
      };
      const appendAudit = vi.fn(async () => undefined);
      const port = factory({ repository: { appendAudit } });
      const failure = await port
        .append(event as unknown as Parameters<typeof port.append>[0])
        .catch((error: unknown) => error);

      expect(failure).toEqual(
        expect.objectContaining({
          message: "COMPANY_IDENTITY_FINANCE_AUDIT_METADATA_INVALID",
        }),
      );
      expect(String(failure)).not.toContain(secret);
      expect(JSON.stringify(failure)).not.toContain(secret);
      expect((failure as Error).cause).toBeUndefined();
      expect(appendAudit).not.toHaveBeenCalled();
    },
  );

  it("maps a poisoned Company Identity audit repository failure to a stable error", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createCompanyIdentityFinanceAttestationAuditPort;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const secret = "POISON_DEPENDENCY_SECRET_73f94";
    const port = factory({
      repository: {
        appendAudit: vi.fn(async () => {
          throw new Error(secret);
        }),
      },
    });
    const failure = await port.append({
      eventId: "77777777-7777-4777-8777-777777777777",
      objectId: "finance-historical-private-evidence-object-v1|sha256=" + "a".repeat(64),
      occurredAt: "2026-08-11T05:01:00.000Z",
      requestId: "99999999-9999-4999-8999-999999999999",
      correlationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      actor: { kind: "unauthenticated" as const },
      operation,
      scope: { companyId },
      outcome: "failed" as const,
      reason: "authentication-failed" as const,
      claimsVersion: null,
      policyVersion: "finance-role-policy-v10",
    }).catch((error: unknown) => error);

    expect(failure).toEqual(expect.objectContaining({
      message: "COMPANY_IDENTITY_FINANCE_AUDIT_APPEND_FAILED",
    }));
    expect(JSON.stringify(failure)).not.toContain(secret);
  });

  it.each([
    {
      name: "allowed owner",
      claims: ownerClaims(),
      expectedDecision: { decision: "allow" as const },
      expectedOutcome: "SUCCEEDED",
    },
    {
      name: "denied owner",
      claims: ownerClaims({ appRoleIds: ["other-role"] }),
      expectedDecision: { decision: "deny" as const, reason: "role-not-accepted" },
      expectedOutcome: "DENIED",
    },
  ] as const)(
    "persists exactly one durable $name audit with a 255-character policy version",
    async ({ claims, expectedDecision, expectedOutcome }) => {
      const subject = await loadCompanyIdentityModule();
      const createAttestor = subject.createFinanceCompanyIdentityAttestor;
      const createAuditPort =
        subject.createCompanyIdentityFinanceAttestationAuditPort;
      expect(createAttestor).toBeTypeOf("function");
      expect(createAuditPort).toBeTypeOf("function");
      if (
        typeof createAttestor !== "function" ||
        typeof createAuditPort !== "function"
      ) {
        return;
      }
      const policyVersion = "p".repeat(255);
      const persisted: Array<Readonly<Record<string, unknown>>> = [];
      const auditPort = createAuditPort({
        repository: {
          appendAudit: vi.fn(async (input: Readonly<Record<string, unknown>>) => {
            persisted.push(input);
          }),
        },
      });
      const attestor = createAttestor({
        authenticator: { authenticate: vi.fn(async () => claims) },
        rolePolicy: { policyVersion, acceptedRoleIds: [acceptedRoleId] },
        auditPort,
        trustedAuditSources: trustedAuditSources(),
      });

      await expect(
        attestor.attest({
          operation,
          scope: { companyId },
          credential: { kind: "token", value: "opaque-owner-token" },
          audit: callerAudit("caller-controlled-audit-value"),
        }),
      ).resolves.toMatchObject(expectedDecision);
      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({
        outcome: expectedOutcome,
        metadata: { policyVersion },
      });
    },
  );

  it("rejects an oversized policy version before any audit append", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createFinanceCompanyIdentityAttestor;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const harness = createAttestorHarness();
    expect(() =>
      factory({
        authenticator: harness.authenticator,
        rolePolicy: {
          policyVersion: "p".repeat(256),
          acceptedRoleIds: [acceptedRoleId],
        },
        auditPort: harness.auditPort,
        trustedAuditSources: trustedAuditSources(),
      }),
    ).toThrow("COMPANY_IDENTITY_FINANCE_ATTESTOR_DEPENDENCY_INVALID");
    expect(harness.append).not.toHaveBeenCalled();
  });

  it.each([
    "createEventId",
    "createRequestId",
    "createCorrelationId",
    "now",
  ] as const)(
    "maps a poisoned trusted audit source (%s) to a stable error",
    async (sourceName) => {
      const subject = await loadCompanyIdentityModule();
      const factory = subject.createFinanceCompanyIdentityAttestor;
      expect(factory).toBeTypeOf("function");
      if (typeof factory !== "function") return;

      const harness = createAttestorHarness();
      const trusted = trustedAuditSources();
      const secret = "POISON_DEPENDENCY_SECRET_73f94";
      (
        trusted[sourceName] as unknown as {
          mockImplementation(implementation: () => never): void;
        }
      ).mockImplementation(() => {
        throw new Error(secret);
      });
      const attestor = factory({
        authenticator: harness.authenticator,
        rolePolicy: {
          policyVersion: "finance-role-policy-trusted-source-v1",
          acceptedRoleIds: [acceptedRoleId],
        },
        auditPort: harness.auditPort,
        trustedAuditSources: trusted,
      });

      const failure = await attestor
        .attest({
          operation,
          scope: { companyId },
          credential: { kind: "token", value: "opaque-owner-token" },
          audit: callerAudit("caller-controlled-audit-value"),
        })
        .catch((error: unknown) => error);

      expect(failure).toEqual(
        expect.objectContaining({
          message: "COMPANY_IDENTITY_FINANCE_TRUSTED_AUDIT_SOURCE_FAILED",
        }),
      );
      expect(JSON.stringify(failure)).not.toContain(secret);
      expect(String(failure)).not.toContain(secret);
      expect((failure as Error).cause).toBeUndefined();
      expect(harness.append).not.toHaveBeenCalled();
    },
  );

  it("binds policy and claims versions before a composed authenticator failure reaches the durable adapter", async () => {
    const subject = await loadCompanyIdentityModule();
    const createAttestor = subject.createFinanceCompanyIdentityAttestor;
    const createAuditPort =
      subject.createCompanyIdentityFinanceAttestationAuditPort;
    expect(createAttestor).toBeTypeOf("function");
    expect(createAuditPort).toBeTypeOf("function");
    if (
      typeof createAttestor !== "function" ||
      typeof createAuditPort !== "function"
    ) {
      return;
    }

    const persisted: Array<Readonly<Record<string, unknown>>> = [];
    const secret = "bearer-token-must-not-reach-durable-audit";
    const policyVersion = "finance-role-policy-failure-v1";
    const auditPort = createAuditPort({
      repository: {
        appendAudit: vi.fn(async (input: Readonly<Record<string, unknown>>) => {
          persisted.push(input);
        }),
      },
    });
    const attestor = createAttestor({
      authenticator: {
        authenticate: vi.fn(async () => {
          throw new Error(secret);
        }),
      },
      rolePolicy: {
        policyVersion,
        acceptedRoleIds: [acceptedRoleId],
      },
      auditPort,
      trustedAuditSources: trustedAuditSources(),
    });

    await expect(
      attestor.attest({
        operation,
        scope: { companyId },
        credential: { kind: "token", value: secret },
        audit: callerAudit(secret),
      }),
    ).rejects.toThrow("COMPANY_IDENTITY_FINANCE_AUTHENTICATION_FAILED");

    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({
      outcome: "FAILED",
      reasonCode: "authentication-failed",
      metadata: {
        policyVersion,
        claimsVersion: null,
      },
    });
    expect(JSON.stringify(persisted[0])).not.toContain(secret);
  });

  it.each([
    {
      name: "blank claims version",
      claims: ownerClaims({ claimsVersion: "" }),
      reason: "claims-version-missing" as const,
      claimsVersion: null,
      actorKind: "authenticated-owner",
      actorSubjectId: subjectId,
    },
    {
      name: "oversized subject",
      claims: ownerClaims({ subjectId: "s".repeat(256) }),
      reason: "organization-mismatch" as const,
      claimsVersion: "company-identity-claims-v7",
      actorKind: "unauthenticated",
      actorSubjectId: null,
    },
  ] as const)(
    "normalizes $name claims before the composed durable audit adapter",
    async ({ claims, reason, claimsVersion, actorKind, actorSubjectId }) => {
      const subject = await loadCompanyIdentityModule();
      const createAttestor = subject.createFinanceCompanyIdentityAttestor;
      const createAuditPort =
        subject.createCompanyIdentityFinanceAttestationAuditPort;
      expect(createAttestor).toBeTypeOf("function");
      expect(createAuditPort).toBeTypeOf("function");
      if (
        typeof createAttestor !== "function" ||
        typeof createAuditPort !== "function"
      ) {
        return;
      }

      const persisted: Array<Readonly<Record<string, unknown>>> = [];
      const auditPort = createAuditPort({
        repository: {
          appendAudit: vi.fn(async (input: Readonly<Record<string, unknown>>) => {
            persisted.push(input);
          }),
        },
      });
      const attestor = createAttestor({
        authenticator: {
          authenticate: vi.fn(async () => claims),
        },
        rolePolicy: {
          policyVersion: "finance-role-policy-claims-normalization-v1",
          acceptedRoleIds: [acceptedRoleId],
        },
        auditPort,
        trustedAuditSources: trustedAuditSources(),
      });

      await expect(
        attestor.attest({
          operation,
          scope: { companyId },
          credential: { kind: "token", value: "opaque-owner-token" },
          audit: callerAudit("caller-controlled-audit-value"),
        }),
      ).resolves.toEqual({ decision: "deny", reason });

      expect(persisted).toHaveLength(1);
      expect(persisted[0]).toMatchObject({
        outcome: "DENIED",
        reasonCode: reason,
        metadata: {
          actorKind,
          actorSubjectId,
          claimsVersion,
          policyVersion: "finance-role-policy-claims-normalization-v1",
        },
      });
      expect(JSON.stringify(persisted[0])).not.toContain("s".repeat(256));
      expect(JSON.stringify(persisted[0])).not.toContain("POISON");
    },
  );

  it("uses constructor-bound authenticator, policy, audit, and trusted-source references after dependency mutation", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createFinanceCompanyIdentityAttestor;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const originalAuthenticate = vi.fn(async () => ownerClaims());
    const originalAppend = vi.fn(async () => undefined);
    const originalTrusted = trustedAuditSources();
    const dependencies = {
      authenticator: { authenticate: originalAuthenticate },
      rolePolicy: {
        policyVersion: "finance-role-policy-bound-v1",
        acceptedRoleIds: [acceptedRoleId],
      },
      auditPort: { append: originalAppend },
      trustedAuditSources: originalTrusted,
    };
    const attestor = factory(dependencies);
    const replacementAuthenticate = vi.fn(async () => ownerClaims());
    const replacementAppend = vi.fn(async () => undefined);
    const replacementTrusted = {
      createEventId: vi.fn(() => "replacement-event"),
      createRequestId: vi.fn(() => "replacement-request"),
      createCorrelationId: vi.fn(() => "replacement-correlation"),
      now: vi.fn(() => new Date("2099-01-01T00:00:00.000Z")),
    };
    dependencies.authenticator = { authenticate: replacementAuthenticate };
    dependencies.rolePolicy = {
      policyVersion: "replacement-policy",
      acceptedRoleIds: [],
    };
    dependencies.auditPort = { append: replacementAppend };
    dependencies.trustedAuditSources = replacementTrusted;

    const decision = await attestor.attest({
      operation,
      scope: { companyId },
      credential: { kind: "session", value: "opaque-session" },
      audit: callerAudit("caller-controlled-audit-value"),
    });

    expect(decision).toMatchObject({
      decision: "allow",
      evidence: { policyVersion: "finance-role-policy-bound-v1" },
    });
    expect(originalAuthenticate).toHaveBeenCalledTimes(1);
    expect(originalAppend).toHaveBeenCalledTimes(1);
    expect(originalTrusted.createEventId).toHaveBeenCalledTimes(1);
    expect(originalTrusted.createRequestId).toHaveBeenCalledTimes(1);
    expect(originalTrusted.createCorrelationId).toHaveBeenCalledTimes(1);
    expect(originalTrusted.now).toHaveBeenCalledTimes(1);
    expect(replacementAuthenticate).not.toHaveBeenCalled();
    expect(replacementAppend).not.toHaveBeenCalled();
    expect(replacementTrusted.createEventId).not.toHaveBeenCalled();
    expect(replacementTrusted.now).not.toHaveBeenCalled();
  });

  it("captures a side-effectful acceptedRoleIds getter once before attestation", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createFinanceCompanyIdentityAttestor;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const harness = createAttestorHarness();
    let roleReads = 0;
    const rolePolicy = {
      policyVersion: "finance-role-policy-getter-v1",
      get acceptedRoleIds(): readonly string[] | undefined {
        roleReads += 1;
        return roleReads === 1 ? [acceptedRoleId] : undefined;
      },
    } as unknown as {
      readonly policyVersion: string;
      readonly acceptedRoleIds: readonly string[];
    };
    const attestor = factory({
      authenticator: harness.authenticator,
      rolePolicy,
      auditPort: harness.auditPort,
      trustedAuditSources: trustedAuditSources(),
    });

    await expect(
      attestor.attest({
        operation,
        scope: { companyId },
        credential: { kind: "session", value: "opaque-session" },
        audit: callerAudit("caller-controlled-audit-value"),
      }),
    ).resolves.toMatchObject({ decision: "allow" });
    expect(roleReads).toBe(1);
    expect(harness.append).toHaveBeenCalledTimes(1);
  });

  it("captures each accepted role element once and authorizes only the captured value", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createFinanceCompanyIdentityAttestor;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const harness = createAttestorHarness();
    const roleIds: string[] = [];
    let elementReads = 0;
    Object.defineProperty(roleIds, "0", {
      configurable: true,
      enumerable: true,
      get: () => {
        elementReads += 1;
        return elementReads === 1 ? acceptedRoleId : "attacker-role";
      },
    });
    const attestor = factory({
      authenticator: harness.authenticator,
      rolePolicy: {
        policyVersion: "finance-role-policy-element-getter-v1",
        acceptedRoleIds: roleIds,
      },
      auditPort: harness.auditPort,
      trustedAuditSources: trustedAuditSources(),
    });

    await expect(
      attestor.attest({
        operation,
        scope: { companyId },
        credential: { kind: "session", value: "opaque-session" },
        audit: callerAudit("caller-controlled-audit-value"),
      }),
    ).resolves.toMatchObject({ decision: "allow" });
    expect(elementReads).toBe(1);
    expect(harness.append).toHaveBeenCalledTimes(1);
    expect(harness.events[0]).toMatchObject({ reason: "role-policy-accepted" });
  });
});
