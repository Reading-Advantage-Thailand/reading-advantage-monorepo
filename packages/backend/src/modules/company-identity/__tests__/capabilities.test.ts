import { describe, expect, it, vi } from "vitest";

import {
  createCapabilityExecutor,
  type AuditEvent,
  type DurableIdempotencyPort,
} from "../../../kernel/index.js";
import {
  companyIdentityCapabilityIds,
  createCompanyIdentityCapabilityReferences,
  createCompanyIdentityCapabilityRegistry,
} from "../capabilities.js";
import type { Employee } from "../contracts.js";
import type { CompanyIdentityService } from "../service.js";

const actorAccountId = "22222222-2222-4222-8222-222222222222";
const targetAccountId = "33333333-3333-4333-8333-333333333333";
const idempotencyKey = "identity-operation-0001";
const employee: Employee = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "alex",
  displayName: "Alex Employee",
  status: "ACTIVE",
  companyRoles: ["EMPLOYEE"],
  appRoles: { sales: ["SALES_REP"] },
  createdAt: "2026-07-18T00:00:00.000Z",
};
const managementResult = { employee, sessionsRevoked: 2 };

type ManagementMethod =
  | "listEmployees"
  | "createEmployee"
  | "setEmployeeStatus"
  | "setApplicationRoles"
  | "setCompanyRoles"
  | "resetCredential"
  | "revokeEmployeeSessions";

interface ManagementServiceMocks {
  readonly listEmployees: ReturnType<typeof vi.fn>;
  readonly createEmployee: ReturnType<typeof vi.fn>;
  readonly setEmployeeStatus: ReturnType<typeof vi.fn>;
  readonly setApplicationRoles: ReturnType<typeof vi.fn>;
  readonly setCompanyRoles: ReturnType<typeof vi.fn>;
  readonly resetCredential: ReturnType<typeof vi.fn>;
  readonly revokeEmployeeSessions: ReturnType<typeof vi.fn>;
}

function service(): {
  readonly implementation: CompanyIdentityService;
  readonly methods: ManagementServiceMocks;
} {
  const methods = {
    listEmployees: vi.fn(async () => [employee]),
    createEmployee: vi.fn(async () => employee),
    setEmployeeStatus: vi.fn(async () => managementResult),
    setApplicationRoles: vi.fn(async () => employee),
    setCompanyRoles: vi.fn(async () => employee),
    resetCredential: vi.fn(async () => managementResult),
    revokeEmployeeSessions: vi.fn(async () => managementResult),
  };
  return {
    methods,
    implementation: {
      authenticate: vi.fn(),
      authorize: vi.fn(),
      exchangeCode: vi.fn(),
      introspect: vi.fn(),
      currentEmployee: vi.fn(),
      localLogout: vi.fn(),
      globalLogout: vi.fn(),
      ...methods,
    } as unknown as CompanyIdentityService,
  };
}

function harness(
  input: {
    readonly roles?: readonly string[];
    readonly implementation?: CompanyIdentityService;
  } = {},
) {
  const defaultService = service();
  const implementation = input.implementation ?? defaultService.implementation;
  const references = createCompanyIdentityCapabilityReferences();
  const registry = createCompanyIdentityCapabilityRegistry(
    implementation,
    references,
  );
  const auditEvents: AuditEvent[] = [];
  const complete = vi.fn<DurableIdempotencyPort["complete"]>(async () => {});
  const fail = vi.fn<DurableIdempotencyPort["fail"]>(async () => {});
  const executor = createCapabilityExecutor({
    registry,
    authentication: {
      authenticate: async () => ({
        userId: actorAccountId,
        roles: [...(input.roles ?? ["COMPANY_ADMIN"])],
        schoolId: null,
      }),
    },
    tenancy: { resolve: async () => ({ mode: "global" }) as never },
    authorization: {
      authorize: async ({ principal }) =>
        principal?.roles.includes("COMPANY_ADMIN") === true
          ? { allowed: true }
          : { allowed: false, safeReasonCode: "COMPANY_ADMIN_REQUIRED" },
    },
    transactions: {
      run: async () => {
        throw new Error("unexpected transaction");
      },
    },
    idempotency: {
      acquire: async () => ({ status: "owner", ownershipToken: "owner-1" }),
      complete,
      fail,
    },
    audit: {
      append: async (event) => {
        auditEvents.push(event as AuditEvent);
        return {
          eventId: event.eventId,
          persistedAt: "2026-07-18T00:00:00.000Z",
        };
      },
    },
    references,
    adapters: { get: <TAdapter>() => ({}) as TAdapter },
    logger: { debug: () => {}, info: () => {}, warn: () => {} },
    span: { setAttributes: () => {} },
    clock: { now: () => new Date("2026-07-18T00:00:00.000Z") },
    createCorrelationId: () => "correlation-identity",
  });
  return { auditEvents, complete, executor, fail, ...defaultService };
}

const cases: readonly {
  readonly label: string;
  readonly capabilityId: string;
  readonly method: ManagementMethod;
  readonly input: Readonly<Record<string, unknown>>;
  readonly expected: unknown;
}[] = [
  {
    label: "list employees",
    capabilityId: companyIdentityCapabilityIds.listEmployees,
    method: "listEmployees",
    input: {},
    expected: [employee],
  },
  {
    label: "create employee",
    capabilityId: companyIdentityCapabilityIds.createEmployee,
    method: "createEmployee",
    input: {
      username: "alex",
      displayName: "Alex Employee",
      initialPassword: "valid-password-123",
      companyRoles: ["EMPLOYEE"],
      appRoles: { sales: ["SALES_REP"] },
      idempotencyKey,
    },
    expected: employee,
  },
  {
    label: "set employee status",
    capabilityId: companyIdentityCapabilityIds.setEmployeeStatus,
    method: "setEmployeeStatus",
    input: { targetAccountId, status: "SUSPENDED", idempotencyKey },
    expected: managementResult,
  },
  {
    label: "set application roles",
    capabilityId: companyIdentityCapabilityIds.setApplicationRoles,
    method: "setApplicationRoles",
    input: {
      targetAccountId,
      applicationKey: "sales",
      roleKeys: ["SALES_REP"],
      idempotencyKey,
    },
    expected: employee,
  },
  {
    label: "set company roles",
    capabilityId: companyIdentityCapabilityIds.setCompanyRoles,
    method: "setCompanyRoles",
    input: {
      targetAccountId,
      roleKeys: ["EMPLOYEE", "COMPANY_ADMIN"],
      idempotencyKey,
    },
    expected: employee,
  },
  {
    label: "reset credential",
    capabilityId: companyIdentityCapabilityIds.resetCredential,
    method: "resetCredential",
    input: {
      targetAccountId,
      newPassword: "replacement-password-123",
      idempotencyKey,
    },
    expected: managementResult,
  },
  {
    label: "revoke sessions",
    capabilityId: companyIdentityCapabilityIds.revokeSessions,
    method: "revokeEmployeeSessions",
    input: { targetAccountId, idempotencyKey },
    expected: managementResult,
  },
];

function invocation(testCase: (typeof cases)[number]) {
  return {
    capabilityId: testCase.capabilityId,
    evidence: { kind: "session" as const, opaqueSessionRef: "s".repeat(32) },
    input: testCase.input,
    ...(Object.hasOwn(testCase.input, "idempotencyKey")
      ? { idempotencyKey: testCase.input.idempotencyKey }
      : {}),
  };
}

describe("company identity capability composition", () => {
  it("publishes seven handler-free descriptors through exact registries", () => {
    const registry = createCompanyIdentityCapabilityRegistry(
      service().implementation,
      createCompanyIdentityCapabilityReferences(),
    );
    expect(registry.listDescriptors()).toHaveLength(7);
    expect(
      registry.snapshot().entries.map((entry) => entry.descriptor.id),
    ).toEqual(Object.values(companyIdentityCapabilityIds).sort());
    expect(
      registry.getDescriptor(companyIdentityCapabilityIds.createEmployee),
    ).not.toHaveProperty("handler");
  });

  it.each(cases)("executes and validates $label", async (testCase) => {
    const context = harness();

    await expect(
      context.executor.execute(invocation(testCase)),
    ).resolves.toEqual(testCase.expected);

    const method = context.methods[testCase.method];
    expect(method).toHaveBeenCalledOnce();
    if (testCase.method === "listEmployees") {
      expect(method).toHaveBeenCalledWith(actorAccountId);
    } else {
      expect(method).toHaveBeenCalledWith({
        ...testCase.input,
        actorAccountId,
      });
      expect(context.complete).toHaveBeenCalledOnce();
    }
    expect(context.auditEvents).toHaveLength(1);
    expect(context.auditEvents[0]?.outcome).toBe("success");
  });

  it.each(cases)(
    "denies ordinary employees before invoking $label",
    async (testCase) => {
      const context = harness({ roles: ["EMPLOYEE"] });

      await expect(
        context.executor.execute(invocation(testCase)),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        correlationId: "correlation-identity",
      });

      for (const method of Object.values(context.methods)) {
        expect(method).not.toHaveBeenCalled();
      }
      expect(context.auditEvents).toHaveLength(1);
      expect(context.auditEvents[0]?.outcome).toBe("denied");
      expect(context.complete).not.toHaveBeenCalled();
    },
  );

  it.each(["SALES_ADMIN", "ADMIN", "TEACHER"])(
    "does not treat the product role %s as company-administrator authority",
    async (role) => {
      const context = harness({ roles: [role] });
      const testCase = cases[0];
      expect(testCase).toBeDefined();

      await expect(
        context.executor.execute(invocation(testCase!)),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      for (const method of Object.values(context.methods)) {
        expect(method).not.toHaveBeenCalled();
      }
    },
  );

  it("rejects malformed capability output at the executor boundary", async () => {
    const context = service();
    context.methods.setApplicationRoles.mockResolvedValueOnce({
      ...employee,
      status: "UNKNOWN",
    });
    const execution = harness({ implementation: context.implementation });
    const testCase = cases.find(
      ({ method }) => method === "setApplicationRoles",
    );
    expect(testCase).toBeDefined();

    await expect(
      execution.executor.execute(invocation(testCase!)),
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(execution.fail).toHaveBeenCalledWith(
      expect.objectContaining({
        disposition: "store-terminal",
      }),
    );
  });
});
