import {
  companyIdentityRouteBindings,
  companyIdentityRouteBindingIds,
  runWithCompanyIdentityRoute,
  type CompanyIdentityRouteBindingId,
  type CompanyIdentityNextHttpRouteBinding,
} from "./route-bindings.js";
import {
  getCapabilityRequestContext,
  type CapabilityRequestContext,
} from "../../kernel/contracts/request-context.js";

type RouteOperation<T> = (context: Readonly<CapabilityRequestContext>) => T;

/** Named route operations exposed only to the Accounts transport adapter. */
export interface CompanyIdentityRouteOperations {
  readonly employeesList: <T>(operation: RouteOperation<T>) => T;
  readonly employeesListHead: <T>(operation: RouteOperation<T>) => T;
  readonly employeesListOptions: <T>(operation: RouteOperation<T>) => T;
  readonly employeesCreate: <T>(operation: RouteOperation<T>) => T;
  readonly employeesCreateOptions: <T>(operation: RouteOperation<T>) => T;
  readonly employeeStatus: <T>(operation: RouteOperation<T>) => T;
  readonly employeeStatusOptions: <T>(operation: RouteOperation<T>) => T;
  readonly employeeApplicationRoles: <T>(operation: RouteOperation<T>) => T;
  readonly employeeApplicationRolesOptions: <T>(operation: RouteOperation<T>) => T;
  readonly employeeCompanyRoles: <T>(operation: RouteOperation<T>) => T;
  readonly employeeCompanyRolesOptions: <T>(operation: RouteOperation<T>) => T;
  readonly employeeCredential: <T>(operation: RouteOperation<T>) => T;
  readonly employeeCredentialOptions: <T>(operation: RouteOperation<T>) => T;
  readonly employeeSessions: <T>(operation: RouteOperation<T>) => T;
  readonly employeeSessionsOptions: <T>(operation: RouteOperation<T>) => T;
  readonly discovery: <T>(operation: RouteOperation<T>) => T;
  readonly discoveryHead: <T>(operation: RouteOperation<T>) => T;
  readonly discoveryOptions: <T>(operation: RouteOperation<T>) => T;
  readonly health: <T>(operation: RouteOperation<T>) => T;
  readonly healthHead: <T>(operation: RouteOperation<T>) => T;
  readonly healthOptions: <T>(operation: RouteOperation<T>) => T;
  readonly ready: <T>(operation: RouteOperation<T>) => T;
  readonly readyHead: <T>(operation: RouteOperation<T>) => T;
  readonly readyOptions: <T>(operation: RouteOperation<T>) => T;
  readonly authorize: <T>(operation: RouteOperation<T>) => T;
  readonly authorizeHead: <T>(operation: RouteOperation<T>) => T;
  readonly authorizeOptions: <T>(operation: RouteOperation<T>) => T;
  readonly introspect: <T>(operation: RouteOperation<T>) => T;
  readonly introspectOptions: <T>(operation: RouteOperation<T>) => T;
  readonly jwks: <T>(operation: RouteOperation<T>) => T;
  readonly jwksHead: <T>(operation: RouteOperation<T>) => T;
  readonly jwksOptions: <T>(operation: RouteOperation<T>) => T;
  readonly oidcLogout: <T>(operation: RouteOperation<T>) => T;
  readonly oidcLogoutOptions: <T>(operation: RouteOperation<T>) => T;
  readonly token: <T>(operation: RouteOperation<T>) => T;
  readonly tokenOptions: <T>(operation: RouteOperation<T>) => T;
  readonly login: <T>(operation: RouteOperation<T>) => T;
  readonly loginOptions: <T>(operation: RouteOperation<T>) => T;
  readonly sessionLogout: <T>(operation: RouteOperation<T>) => T;
  readonly sessionLogoutOptions: <T>(operation: RouteOperation<T>) => T;
}

/** Backend-owned route contract consumed by the Accounts-only adapter. */
export interface CompanyIdentityRouteAdapter {
  /** Complete reviewed route denominator, including explicit HEAD/OPTIONS methods. */
  readonly bindings: readonly CompanyIdentityNextHttpRouteBinding[];
  /** Named operations that cannot accept an arbitrary binding ID or route shape. */
  readonly operations: CompanyIdentityRouteOperations;
}

function operationFor<T>(
  bindingId: string,
  operation: RouteOperation<T>,
): T {
  return runWithCompanyIdentityRoute(
    bindingId as CompanyIdentityRouteBindingId,
    () => operation(getCapabilityRequestContext()!),
  );
}

function frameworkBindingId(
  baseBindingId: string,
  method: "HEAD" | "OPTIONS",
): string {
  return `${baseBindingId}.${method.toLowerCase()}`;
}

/**
 * Creates the non-generic route contract used by the Accounts application adapter.
 * @returns Backend-owned route denominator and named route operations.
 */
export function createCompanyIdentityRouteAdapter(): CompanyIdentityRouteAdapter {
  const operations: CompanyIdentityRouteOperations = {
    employeesList: (operation) => operationFor(companyIdentityRouteBindingIds.listEmployees, operation),
    employeesListHead: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.listEmployees, "HEAD"), operation),
    employeesListOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.createEmployee, "OPTIONS"), operation),
    employeesCreate: (operation) => operationFor(companyIdentityRouteBindingIds.createEmployee, operation),
    employeesCreateOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.createEmployee, "OPTIONS"), operation),
    employeeStatus: (operation) => operationFor(companyIdentityRouteBindingIds.setStatus, operation),
    employeeStatusOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.setStatus, "OPTIONS"), operation),
    employeeApplicationRoles: (operation) => operationFor(companyIdentityRouteBindingIds.setApplicationRoles, operation),
    employeeApplicationRolesOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.setApplicationRoles, "OPTIONS"), operation),
    employeeCompanyRoles: (operation) => operationFor(companyIdentityRouteBindingIds.setCompanyRoles, operation),
    employeeCompanyRolesOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.setCompanyRoles, "OPTIONS"), operation),
    employeeCredential: (operation) => operationFor(companyIdentityRouteBindingIds.resetCredential, operation),
    employeeCredentialOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.resetCredential, "OPTIONS"), operation),
    employeeSessions: (operation) => operationFor(companyIdentityRouteBindingIds.revokeEmployeeSessions, operation),
    employeeSessionsOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.revokeEmployeeSessions, "OPTIONS"), operation),
    discovery: (operation) => operationFor(companyIdentityRouteBindingIds.discovery, operation),
    discoveryHead: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.discovery, "HEAD"), operation),
    discoveryOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.discovery, "OPTIONS"), operation),
    health: (operation) => operationFor(companyIdentityRouteBindingIds.health, operation),
    healthHead: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.health, "HEAD"), operation),
    healthOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.health, "OPTIONS"), operation),
    ready: (operation) => operationFor(companyIdentityRouteBindingIds.ready, operation),
    readyHead: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.ready, "HEAD"), operation),
    readyOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.ready, "OPTIONS"), operation),
    authorize: (operation) => operationFor(companyIdentityRouteBindingIds.authorize, operation),
    authorizeHead: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.authorize, "HEAD"), operation),
    authorizeOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.authorize, "OPTIONS"), operation),
    introspect: (operation) => operationFor(companyIdentityRouteBindingIds.introspect, operation),
    introspectOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.introspect, "OPTIONS"), operation),
    jwks: (operation) => operationFor(companyIdentityRouteBindingIds.jwks, operation),
    jwksHead: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.jwks, "HEAD"), operation),
    jwksOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.jwks, "OPTIONS"), operation),
    oidcLogout: (operation) => operationFor(companyIdentityRouteBindingIds.oidcLogout, operation),
    oidcLogoutOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.oidcLogout, "OPTIONS"), operation),
    token: (operation) => operationFor(companyIdentityRouteBindingIds.token, operation),
    tokenOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.token, "OPTIONS"), operation),
    login: (operation) => operationFor(companyIdentityRouteBindingIds.login, operation),
    loginOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.login, "OPTIONS"), operation),
    sessionLogout: (operation) => operationFor(companyIdentityRouteBindingIds.sessionLogout, operation),
    sessionLogoutOptions: (operation) => operationFor(frameworkBindingId(companyIdentityRouteBindingIds.sessionLogout, "OPTIONS"), operation),
  };

  return Object.freeze({
    bindings: companyIdentityRouteBindings,
    operations: Object.freeze(operations),
  });
}
