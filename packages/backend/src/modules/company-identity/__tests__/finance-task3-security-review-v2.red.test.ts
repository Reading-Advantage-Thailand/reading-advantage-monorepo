import { describe, expect, it, vi } from "vitest";

interface CompanyIdentityFinanceModule {
  readonly createFinanceCompanyIdentityAttestor?: (input: {
    readonly authenticator: {
      authenticate(input: Readonly<Record<string, unknown>>): Promise<unknown>;
    };
    readonly rolePolicy: {
      readonly policyVersion: string;
      readonly acceptedRoleIds: readonly string[];
    };
    readonly auditPort: {
      append(event: Readonly<Record<string, unknown>>): Promise<void>;
    };
    readonly trustedAuditSources?: {
      readonly createEventId: () => string;
      readonly createRequestId: () => string;
      readonly createCorrelationId: () => string;
      readonly now: () => Date;
    };
  }) => unknown;
}

/** Loads Company Identity through its public Finance boundary. */
async function loadCompanyIdentityModule(): Promise<CompanyIdentityFinanceModule> {
  return (await import("../index.js")) as unknown as CompanyIdentityFinanceModule;
}

describe("Finance Task 3 security Review A v2 RED contract", () => {
  it("requires trusted server audit sources at attestor construction", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createFinanceCompanyIdentityAttestor;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    expect(() =>
      factory({
        authenticator: {
          authenticate: vi.fn(async () => undefined),
        },
        rolePolicy: {
          policyVersion: "finance-role-policy-v2",
          acceptedRoleIds: ["finance-import"],
        },
        auditPort: {
          append: vi.fn(async () => undefined),
        },
      }),
    ).toThrow("COMPANY_IDENTITY_FINANCE_TRUSTED_AUDIT_SOURCES_REQUIRED");
  });

  it("requires every trusted audit source function instead of accepting a partial source", async () => {
    const subject = await loadCompanyIdentityModule();
    const factory = subject.createFinanceCompanyIdentityAttestor;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    expect(() =>
      factory({
        authenticator: {
          authenticate: vi.fn(async () => undefined),
        },
        rolePolicy: {
          policyVersion: "finance-role-policy-v2",
          acceptedRoleIds: ["finance-import"],
        },
        auditPort: {
          append: vi.fn(async () => undefined),
        },
        trustedAuditSources: {
          createEventId: () => "event-id",
          createRequestId: () => "request-id",
          createCorrelationId: undefined as unknown as () => string,
          now: () => new Date("2026-08-12T00:00:00.000Z"),
        },
      }),
    ).toThrow("COMPANY_IDENTITY_FINANCE_TRUSTED_AUDIT_SOURCES_INVALID");
  });
});
