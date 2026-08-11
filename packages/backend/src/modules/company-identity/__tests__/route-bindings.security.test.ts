import { describe, expect, it, vi } from "vitest";

import {
  createCapabilityExecutor,
  type CapabilityRequestContext,
} from "../../../kernel/index.js";
import {
  companyIdentityCapabilityIds,
  createCompanyIdentityCapabilityReferences,
  createCompanyIdentityCapabilityRegistry,
} from "../capabilities.js";
import {
  companyIdentityRouteBindings,
  companyIdentityRouteBindingIds,
  runWithCompanyIdentityRoute,
} from "../route-bindings.js";
import type { CompanyIdentityService } from "../service.js";

interface SqlCall {
  readonly text: string;
  readonly values: readonly unknown[];
}

type RouteOperationName = keyof ReturnType<
  (typeof import("../internal-route-adapter.js"))["createCompanyIdentityRouteAdapter"]
>["operations"];

interface RouteDimension {
  readonly operation: RouteOperationName;
  readonly bindingId: string;
  readonly capabilityId: string;
  readonly method:
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE"
    | "HEAD"
    | "OPTIONS";
  readonly path: string;
}

const PRIMARY_ROUTE_OPERATIONS: readonly RouteOperationName[] = [
  "authorize",
  "discovery",
  "employeesCreate",
  "employeesList",
  "employeeApplicationRoles",
  "employeeCompanyRoles",
  "employeeCredential",
  "employeeSessions",
  "health",
  "introspect",
  "jwks",
  "login",
  "oidcLogout",
  "ready",
  "sessionLogout",
  "employeeStatus",
  "token",
];

const routeDimensions: readonly RouteDimension[] = [
  {
    operation: "authorize",
    bindingId: "accounts.oidc.authorize",
    capabilityId: "accounts.oidc.authorize",
    method: "GET",
    path: "/api/oidc/authorize",
  },
  {
    operation: "authorizeHead",
    bindingId: "accounts.oidc.authorize.head",
    capabilityId: "accounts.oidc.authorize",
    method: "HEAD",
    path: "/api/oidc/authorize",
  },
  {
    operation: "authorizeOptions",
    bindingId: "accounts.oidc.authorize.options",
    capabilityId: "accounts.oidc.authorize",
    method: "OPTIONS",
    path: "/api/oidc/authorize",
  },
  {
    operation: "discovery",
    bindingId: "accounts.discovery.openid-configuration",
    capabilityId: "accounts.discovery.openid-configuration",
    method: "GET",
    path: "/.well-known/openid-configuration",
  },
  {
    operation: "discoveryHead",
    bindingId: "accounts.discovery.openid-configuration.head",
    capabilityId: "accounts.discovery.openid-configuration",
    method: "HEAD",
    path: "/.well-known/openid-configuration",
  },
  {
    operation: "discoveryOptions",
    bindingId: "accounts.discovery.openid-configuration.options",
    capabilityId: "accounts.discovery.openid-configuration",
    method: "OPTIONS",
    path: "/.well-known/openid-configuration",
  },
  {
    operation: "employeesCreate",
    bindingId: "company-identity.employees.create",
    capabilityId: "company-identity.employees.create",
    method: "POST",
    path: "/api/admin/employees",
  },
  {
    operation: "employeesCreateOptions",
    bindingId: "company-identity.employees.create.options",
    capabilityId: "company-identity.employees.create",
    method: "OPTIONS",
    path: "/api/admin/employees",
  },
  {
    operation: "employeesList",
    bindingId: "company-identity.employees.list",
    capabilityId: "company-identity.employees.list",
    method: "GET",
    path: "/api/admin/employees",
  },
  {
    operation: "employeesListHead",
    bindingId: "company-identity.employees.list.head",
    capabilityId: "company-identity.employees.list",
    method: "HEAD",
    path: "/api/admin/employees",
  },
  {
    operation: "employeeApplicationRoles",
    bindingId: "company-identity.employees.set-application-roles",
    capabilityId: "company-identity.employees.set-application-roles",
    method: "PUT",
    path: "/api/admin/employees/:accountId/roles",
  },
  {
    operation: "employeeApplicationRolesOptions",
    bindingId: "company-identity.employees.set-application-roles.options",
    capabilityId: "company-identity.employees.set-application-roles",
    method: "OPTIONS",
    path: "/api/admin/employees/:accountId/roles",
  },
  {
    operation: "employeeCompanyRoles",
    bindingId: "company-identity.employees.set-company-roles",
    capabilityId: "company-identity.employees.set-company-roles",
    method: "PUT",
    path: "/api/admin/employees/:accountId/company-roles",
  },
  {
    operation: "employeeCompanyRolesOptions",
    bindingId: "company-identity.employees.set-company-roles.options",
    capabilityId: "company-identity.employees.set-company-roles",
    method: "OPTIONS",
    path: "/api/admin/employees/:accountId/company-roles",
  },
  {
    operation: "employeeCredential",
    bindingId: "company-identity.employees.reset-credential",
    capabilityId: "company-identity.employees.reset-credential",
    method: "PUT",
    path: "/api/admin/employees/:accountId/credential",
  },
  {
    operation: "employeeCredentialOptions",
    bindingId: "company-identity.employees.reset-credential.options",
    capabilityId: "company-identity.employees.reset-credential",
    method: "OPTIONS",
    path: "/api/admin/employees/:accountId/credential",
  },
  {
    operation: "employeeSessions",
    bindingId: "company-identity.employees.revoke-sessions",
    capabilityId: "company-identity.employees.revoke-sessions",
    method: "DELETE",
    path: "/api/admin/employees/:accountId/sessions",
  },
  {
    operation: "employeeSessionsOptions",
    bindingId: "company-identity.employees.revoke-sessions.options",
    capabilityId: "company-identity.employees.revoke-sessions",
    method: "OPTIONS",
    path: "/api/admin/employees/:accountId/sessions",
  },
  {
    operation: "health",
    bindingId: "accounts.health",
    capabilityId: "accounts.health",
    method: "GET",
    path: "/api/health",
  },
  {
    operation: "healthHead",
    bindingId: "accounts.health.head",
    capabilityId: "accounts.health",
    method: "HEAD",
    path: "/api/health",
  },
  {
    operation: "healthOptions",
    bindingId: "accounts.health.options",
    capabilityId: "accounts.health",
    method: "OPTIONS",
    path: "/api/health",
  },
  {
    operation: "introspect",
    bindingId: "accounts.oidc.introspect",
    capabilityId: "accounts.oidc.introspect",
    method: "POST",
    path: "/api/oidc/introspect",
  },
  {
    operation: "introspectOptions",
    bindingId: "accounts.oidc.introspect.options",
    capabilityId: "accounts.oidc.introspect",
    method: "OPTIONS",
    path: "/api/oidc/introspect",
  },
  {
    operation: "jwks",
    bindingId: "accounts.oidc.jwks",
    capabilityId: "accounts.oidc.jwks",
    method: "GET",
    path: "/api/oidc/jwks",
  },
  {
    operation: "jwksHead",
    bindingId: "accounts.oidc.jwks.head",
    capabilityId: "accounts.oidc.jwks",
    method: "HEAD",
    path: "/api/oidc/jwks",
  },
  {
    operation: "jwksOptions",
    bindingId: "accounts.oidc.jwks.options",
    capabilityId: "accounts.oidc.jwks",
    method: "OPTIONS",
    path: "/api/oidc/jwks",
  },
  {
    operation: "login",
    bindingId: "accounts.session.login",
    capabilityId: "accounts.session.login",
    method: "POST",
    path: "/api/session/login",
  },
  {
    operation: "loginOptions",
    bindingId: "accounts.session.login.options",
    capabilityId: "accounts.session.login",
    method: "OPTIONS",
    path: "/api/session/login",
  },
  {
    operation: "oidcLogout",
    bindingId: "accounts.oidc.logout",
    capabilityId: "accounts.oidc.logout",
    method: "POST",
    path: "/api/oidc/logout",
  },
  {
    operation: "oidcLogoutOptions",
    bindingId: "accounts.oidc.logout.options",
    capabilityId: "accounts.oidc.logout",
    method: "OPTIONS",
    path: "/api/oidc/logout",
  },
  {
    operation: "ready",
    bindingId: "accounts.ready",
    capabilityId: "accounts.ready",
    method: "GET",
    path: "/api/ready",
  },
  {
    operation: "readyHead",
    bindingId: "accounts.ready.head",
    capabilityId: "accounts.ready",
    method: "HEAD",
    path: "/api/ready",
  },
  {
    operation: "readyOptions",
    bindingId: "accounts.ready.options",
    capabilityId: "accounts.ready",
    method: "OPTIONS",
    path: "/api/ready",
  },
  {
    operation: "sessionLogout",
    bindingId: "accounts.session.logout",
    capabilityId: "accounts.session.logout",
    method: "POST",
    path: "/api/session/logout",
  },
  {
    operation: "sessionLogoutOptions",
    bindingId: "accounts.session.logout.options",
    capabilityId: "accounts.session.logout",
    method: "OPTIONS",
    path: "/api/session/logout",
  },
  {
    operation: "employeeStatus",
    bindingId: "company-identity.employees.set-status",
    capabilityId: "company-identity.employees.set-status",
    method: "PATCH",
    path: "/api/admin/employees/:accountId/status",
  },
  {
    operation: "employeeStatusOptions",
    bindingId: "company-identity.employees.set-status.options",
    capabilityId: "company-identity.employees.set-status",
    method: "OPTIONS",
    path: "/api/admin/employees/:accountId/status",
  },
  {
    operation: "token",
    bindingId: "accounts.oidc.token",
    capabilityId: "accounts.oidc.token",
    method: "POST",
    path: "/api/oidc/token",
  },
  {
    operation: "tokenOptions",
    bindingId: "accounts.oidc.token.options",
    capabilityId: "accounts.oidc.token",
    method: "OPTIONS",
    path: "/api/oidc/token",
  },
];

const employee = {
  id: "20000000-0000-4000-8000-000000000001",
  username: "owner",
  displayName: "Company Owner",
  status: "ACTIVE" as const,
  companyRoles: ["EMPLOYEE", "COMPANY_ADMIN"] as const,
  appRoles: { sales: ["SALES_ADMIN"] },
  createdAt: "2026-07-18T00:00:00.000Z",
};

/** Creates a tagged SQL double that records immutable-audit insert values. */
function createSqlDouble(): {
  readonly sql: unknown;
  readonly calls: readonly SqlCall[];
} {
  const calls: SqlCall[] = [];
  const sql = Object.assign(
    vi.fn(
      async (strings: TemplateStringsArray, ...values: readonly unknown[]) => {
        calls.push({ text: strings.join(""), values });
        return [];
      },
    ),
    { json: vi.fn((value: unknown) => value) },
  );
  return { sql, calls };
}

/** Builds the capability executor with the reviewed company-identity registries. */
function createRouteMismatchExecutor(): {
  readonly executor: ReturnType<typeof createCapabilityExecutor>;
  readonly createEmployee: ReturnType<typeof vi.fn>;
} {
  const createEmployee = vi.fn(async () => employee);
  const service = {
    listEmployees: vi.fn(async () => [employee]),
    createEmployee,
    setEmployeeStatus: vi.fn(async () => ({ employee, sessionsRevoked: 0 })),
    setApplicationRoles: vi.fn(async () => employee),
    setCompanyRoles: vi.fn(async () => employee),
    resetCredential: vi.fn(async () => ({ employee, sessionsRevoked: 0 })),
    revokeEmployeeSessions: vi.fn(async () => ({
      employee,
      sessionsRevoked: 0,
    })),
  } as unknown as CompanyIdentityService;
  const references = createCompanyIdentityCapabilityReferences();
  const registry = createCompanyIdentityCapabilityRegistry(service, references);
  const executor = createCapabilityExecutor({
    registry,
    authentication: {
      authenticate: async () => ({
        userId: employee.id,
        roles: ["COMPANY_ADMIN"],
        schoolId: null,
      }),
    },
    tenancy: { resolve: async () => ({ mode: "global" }) as never },
    authorization: { authorize: async () => ({ allowed: true }) },
    transactions: { run: async () => ({}) as never },
    idempotency: {
      acquire: async () => ({
        status: "owner" as const,
        ownershipToken: "route-mismatch-owner",
      }),
      complete: async () => undefined,
      fail: async () => undefined,
    },
    audit: {
      append: async (event) => ({
        eventId: event.eventId,
        persistedAt: "2026-08-11T00:00:00.000Z",
      }),
    },
    references,
    adapters: { get: <TAdapter>() => ({}) as TAdapter },
    logger: { debug: () => {}, info: () => {}, warn: () => {} },
    span: { setAttributes: () => {} },
    clock: { now: () => new Date("2026-08-11T00:00:00.000Z") },
    createCorrelationId: () => "route-mismatch-correlation",
  });
  return { executor, createEmployee };
}

describe("company-identity route and capability security contracts", () => {
  it("does not let a public backend subpath forge accounts route provenance", async () => {
    let publicAdapter: {
      readonly createCompanyIdentityRouteAdapter: () => {
        readonly operations: {
          readonly oidcLogout: (
            operation: (
              context: Readonly<CapabilityRequestContext>,
            ) => Promise<void>,
          ) => Promise<void>;
        };
      };
    };
    try {
      publicAdapter =
        (await import("@reading-advantage/backend/company-identity/internal-route-adapter")) as typeof publicAdapter;
    } catch (error) {
      expect((error as { readonly code?: unknown }).code).toBe(
        "ERR_PACKAGE_PATH_NOT_EXPORTED",
      );
      return;
    }

    const backendPublicApi = await import("@reading-advantage/backend");
    const { sql, calls } = createSqlDouble();
    const repository = backendPublicApi.createPostgresCompanyIdentityRepository(
      sql as Parameters<
        typeof backendPublicApi.createPostgresCompanyIdentityRepository
      >[0],
    );
    const adapter = publicAdapter.createCompanyIdentityRouteAdapter();
    let callbackInvoked = false;
    let operationError: unknown;
    try {
      await adapter.operations.oidcLogout(async () => {
        callbackInvoked = true;
        await repository.appendAudit({
          correlationId: "30000000-0000-4000-8000-000000000001",
          operation: "identity:external-route-forge",
          outcome: "FAILED",
          metadata: { source: "external-consumer" },
        });
      });
    } catch (error) {
      operationError = error;
    }

    const auditInsertCalls = calls.filter((call) =>
      call.text.includes("insert into company_identity_audit_events"),
    );
    expect(callbackInvoked).toBe(true);
    if (operationError !== undefined) {
      expect(auditInsertCalls).toHaveLength(0);
      return;
    }
    expect(auditInsertCalls).toHaveLength(1);
    for (const call of auditInsertCalls) {
      const metadata = call.values.at(-1) as Record<string, unknown>;
      expect(metadata.routeBindingId).toBeUndefined();
      expect(metadata.routeMethod).toBeUndefined();
      expect(metadata.routePath).toBeUndefined();
      expect(metadata.routeTransport).toBeUndefined();
    }
  });

  it("rejects a route binding that disagrees with the invoked capability", async () => {
    const { executor, createEmployee } = createRouteMismatchExecutor();
    const invocation = {
      capabilityId: companyIdentityCapabilityIds.createEmployee,
      input: {
        username: "new-employee",
        displayName: "New Employee",
        initialPassword: "valid-password-123",
        companyRoles: ["EMPLOYEE"],
        appRoles: { sales: ["SALES_REP"] },
        idempotencyKey: "route-capability-mismatch-0001",
      },
      evidence: {
        kind: "session" as const,
        opaqueSessionRef: "s".repeat(32),
      },
      idempotencyKey: "route-capability-mismatch-0001",
    };

    await expect(
      runWithCompanyIdentityRoute(
        companyIdentityRouteBindingIds.listEmployees,
        () => executor.execute(invocation),
      ),
    ).rejects.toMatchObject({ code: "ROUTE_CAPABILITY_MISMATCH" });
    expect(createEmployee).not.toHaveBeenCalled();
  });

  it("binds each route method to one exact path, operation, and capability", async () => {
    const adapter = (
      await import("../internal-route-adapter.js")
    ).createCompanyIdentityRouteAdapter();
    expect({ "Primary operations": PRIMARY_ROUTE_OPERATIONS.length }).toEqual({
      "Primary operations": 17,
    });
    expect(
      routeDimensions.filter(({ operation }) =>
        PRIMARY_ROUTE_OPERATIONS.includes(operation),
      ),
    ).toHaveLength(17);
    expect({ "Effective route/method rows": routeDimensions.length }).toEqual({
      "Effective route/method rows": 39,
    });

    for (const row of routeDimensions) {
      const binding = companyIdentityRouteBindings.find(
        (candidate) => candidate.bindingId === row.bindingId,
      );
      expect(binding, `Missing binding ${row.bindingId}`).toEqual(
        expect.objectContaining({
          bindingId: row.bindingId,
          capabilityId: row.capabilityId,
          method: row.method,
          path: row.path,
        }),
      );
      const operation = adapter.operations[row.operation];
      const context = operation((observed) => observed);
      expect(context).toMatchObject({
        bindingId: row.bindingId,
        capabilityId: row.capabilityId,
        method: row.method,
        path: row.path,
      });
    }
  });
});
