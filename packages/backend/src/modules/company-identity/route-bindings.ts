import {
  nextHttpRouteBindingSchema,
  type RouteBinding,
} from "../../kernel/contracts/route-bindings.js";
import { runWithTrustedCapabilityRequestContext } from "../../kernel/contracts/request-context.js";

/** One reviewed Next.js route binding owned by the company-identity backend. */
export type CompanyIdentityNextHttpRouteBinding = Extract<
  RouteBinding,
  { transport: "next-http" }
>;

/** Stable identifiers for every reviewed Accounts company-identity route. */
export const companyIdentityRouteBindingIds = Object.freeze({
  listEmployees: "company-identity.employees.list",
  createEmployee: "company-identity.employees.create",
  setStatus: "company-identity.employees.set-status",
  setApplicationRoles: "company-identity.employees.set-application-roles",
  setCompanyRoles: "company-identity.employees.set-company-roles",
  resetCredential: "company-identity.employees.reset-credential",
  revokeEmployeeSessions: "company-identity.employees.revoke-sessions",
  discovery: "accounts.discovery.openid-configuration",
  health: "accounts.health",
  ready: "accounts.ready",
  authorize: "accounts.oidc.authorize",
  introspect: "accounts.oidc.introspect",
  jwks: "accounts.oidc.jwks",
  oidcLogout: "accounts.oidc.logout",
  token: "accounts.oidc.token",
  login: "accounts.session.login",
  sessionLogout: "accounts.session.logout",
});

/** Union of stable route identifiers accepted by the backend executor. */
export type CompanyIdentityRouteBindingId =
  (typeof companyIdentityRouteBindingIds)[keyof typeof companyIdentityRouteBindingIds];

type CompanyIdentityRouteBinding = Omit<
  CompanyIdentityNextHttpRouteBinding,
  "exposure"
> & { exposure: "public" | "authenticated" };

const reviewedRouteInventoryBase = [
  {
    bindingId: companyIdentityRouteBindingIds.authorize,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.authorize,
    capabilityKind: "command",
    exposure: "authenticated",
    method: "GET",
    path: "/api/oidc/authorize",
  },
  {
    bindingId: companyIdentityRouteBindingIds.discovery,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.discovery,
    capabilityKind: "query",
    exposure: "public",
    method: "GET",
    path: "/.well-known/openid-configuration",
  },
  {
    bindingId: companyIdentityRouteBindingIds.health,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.health,
    capabilityKind: "query",
    exposure: "public",
    method: "GET",
    path: "/api/health",
  },
  {
    bindingId: companyIdentityRouteBindingIds.ready,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.ready,
    capabilityKind: "query",
    exposure: "public",
    method: "GET",
    path: "/api/ready",
  },
  {
    bindingId: companyIdentityRouteBindingIds.introspect,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.introspect,
    capabilityKind: "query",
    exposure: "authenticated",
    method: "POST",
    path: "/api/oidc/introspect",
  },
  {
    bindingId: companyIdentityRouteBindingIds.jwks,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.jwks,
    capabilityKind: "query",
    exposure: "public",
    method: "GET",
    path: "/api/oidc/jwks",
  },
  {
    bindingId: companyIdentityRouteBindingIds.login,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.login,
    capabilityKind: "command",
    exposure: "public",
    method: "POST",
    path: "/api/session/login",
  },
  {
    bindingId: companyIdentityRouteBindingIds.oidcLogout,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.oidcLogout,
    capabilityKind: "command",
    exposure: "authenticated",
    method: "POST",
    path: "/api/oidc/logout",
  },
  {
    bindingId: companyIdentityRouteBindingIds.resetCredential,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.resetCredential,
    capabilityKind: "command",
    exposure: "authenticated",
    method: "PUT",
    path: "/api/admin/employees/:accountId/credential",
  },
  {
    bindingId: companyIdentityRouteBindingIds.revokeEmployeeSessions,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.revokeEmployeeSessions,
    capabilityKind: "command",
    exposure: "authenticated",
    method: "DELETE",
    path: "/api/admin/employees/:accountId/sessions",
  },
  {
    bindingId: companyIdentityRouteBindingIds.sessionLogout,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.sessionLogout,
    capabilityKind: "command",
    exposure: "authenticated",
    method: "POST",
    path: "/api/session/logout",
  },
  {
    bindingId: companyIdentityRouteBindingIds.setApplicationRoles,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.setApplicationRoles,
    capabilityKind: "command",
    exposure: "authenticated",
    method: "PUT",
    path: "/api/admin/employees/:accountId/roles",
  },
  {
    bindingId: companyIdentityRouteBindingIds.setCompanyRoles,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.setCompanyRoles,
    capabilityKind: "command",
    exposure: "authenticated",
    method: "PUT",
    path: "/api/admin/employees/:accountId/company-roles",
  },
  {
    bindingId: companyIdentityRouteBindingIds.setStatus,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.setStatus,
    capabilityKind: "command",
    exposure: "authenticated",
    method: "PATCH",
    path: "/api/admin/employees/:accountId/status",
  },
  {
    bindingId: companyIdentityRouteBindingIds.token,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.token,
    capabilityKind: "command",
    exposure: "authenticated",
    method: "POST",
    path: "/api/oidc/token",
  },
  {
    bindingId: companyIdentityRouteBindingIds.createEmployee,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.createEmployee,
    capabilityKind: "command",
    exposure: "authenticated",
    method: "POST",
    path: "/api/admin/employees",
  },
  {
    bindingId: companyIdentityRouteBindingIds.listEmployees,
    transport: "next-http",
    capabilityId: companyIdentityRouteBindingIds.listEmployees,
    capabilityKind: "query",
    exposure: "authenticated",
    method: "GET",
    path: "/api/admin/employees",
  },
] as const;

/** Adds the framework-generated method obligations to one explicit route. */
function addNextFrameworkMethods(
  binding: (typeof reviewedRouteInventoryBase)[number],
  optionsPaths: Set<string>,
): readonly CompanyIdentityRouteBinding[] {
  const frameworkMethods: Array<"HEAD" | "OPTIONS"> =
    binding.method === "GET" ? ["HEAD"] : [];
  if (!optionsPaths.has(binding.path)) {
    optionsPaths.add(binding.path);
    frameworkMethods.push("OPTIONS");
  }
  return [
    binding,
    ...frameworkMethods.map((method) => ({
      ...binding,
      bindingId: `${binding.bindingId}.${method.toLowerCase()}`,
      exposure: "public" as const,
      method,
    })),
  ];
}

/** Complete reviewed route inventory, including explicit framework method handlers. */
const optionsPaths = new Set<string>();
const reviewedRouteInventory = reviewedRouteInventoryBase.flatMap((binding) =>
  addNextFrameworkMethods(binding, optionsPaths),
);

/** Complete one-to-one route/method inventory used by Accounts. */
export const companyIdentityRouteInventory = Object.freeze(
  reviewedRouteInventory.map((binding) => Object.freeze(binding)),
);

/** Validated immutable route bindings used by the trusted executor. */
export const companyIdentityRouteBindings: readonly CompanyIdentityRouteBinding[] =
  Object.freeze(
    companyIdentityRouteInventory.map(
      (binding) =>
        Object.freeze(
          nextHttpRouteBindingSchema.parse(binding),
        ) as CompanyIdentityRouteBinding,
    ),
  );

/**
 * Resolves one reviewed route binding by its stable identifier.
 * @param bindingId Stable identifier from the reviewed route registry.
 * @returns The immutable route binding.
 * @throws When the identifier is not registered.
 */
export function companyIdentityRouteBindingFor(
  bindingId: string,
): CompanyIdentityRouteBinding {
  const binding = companyIdentityRouteBindings.find(
    (candidate) => candidate.bindingId === bindingId,
  );
  if (binding === undefined) {
    throw new Error(`COMPANY_IDENTITY_ROUTE_BINDING_NOT_FOUND:${bindingId}`);
  }
  return binding;
}

/**
 * Executes one operation under an exact backend-owned route binding.
 * @param bindingId Stable identifier resolved from the reviewed registry.
 * @param operation Operation invoked by the transport adapter.
 * @returns The operation result.
 */
export function runWithCompanyIdentityRoute<T>(
  bindingId: CompanyIdentityRouteBindingId,
  operation: () => T,
): T {
  return runWithTrustedCapabilityRequestContext(
    companyIdentityRouteBindingFor(bindingId),
    operation,
  );
}
