import { z } from "zod";

import {
  createAllowedProjectionContract,
  createCapabilityRegistry,
  defineCommandCapability,
  defineQueryCapability,
  type CapabilityRegistrationReferences,
  type CapabilityRuntimeRegistry,
} from "../../kernel/index.js";
import {
  createEmployeeInputSchema,
  employeeSchema,
  managementResultSchema,
  resetCredentialInputSchema,
  revokeEmployeeSessionsInputSchema,
  setApplicationRolesInputSchema,
  setCompanyRolesInputSchema,
  setEmployeeStatusInputSchema,
} from "./contracts.js";
import type { CompanyIdentityService } from "./service.js";

/** Stable capability IDs used by transport adapters without exposing handlers. */
export const companyIdentityCapabilityIds = Object.freeze({
  listEmployees: "company-identity.employees.list",
  createEmployee: "company-identity.employees.create",
  setEmployeeStatus: "company-identity.employees.set-status",
  setApplicationRoles: "company-identity.employees.set-application-roles",
  setCompanyRoles: "company-identity.employees.set-company-roles",
  resetCredential: "company-identity.employees.reset-credential",
  revokeSessions: "company-identity.employees.revoke-sessions",
});

const owner = Object.freeze({
  package: "@reading-advantage/backend",
  module: "company-identity",
});
const globalPolicyId = "company-identity.global";
const adminPolicyId = "company-identity.company-admin";
const sourceModule = "packages/backend/src/modules/company-identity/capabilities.ts";
const idempotencyKeySchema = z.string().min(16).max(200);
const inputWithoutActor = <TSchema extends z.AnyZodObject>(schema: TSchema) =>
  schema.omit({ actorAccountId: true });
const auditProjection = createAllowedProjectionContract({
  projectorId: "company-identity.employee.audit",
  shape: { resourceType: z.literal("company-employee") },
});
const commonErrors = [
  {
    code: "FORBIDDEN",
    safeMessage: "Company administrator access is required.",
    retryable: false,
    transport: { httpStatus: 403, trpcCode: "FORBIDDEN", jobOutcome: "terminal" },
  },
  {
    code: "EMPLOYEE_NOT_FOUND",
    safeMessage: "The employee was not found.",
    retryable: false,
    transport: { httpStatus: 404, trpcCode: "NOT_FOUND", jobOutcome: "terminal" },
  },
  {
    code: "USERNAME_CONFLICT",
    safeMessage: "That username is unavailable.",
    retryable: false,
    transport: { httpStatus: 409, trpcCode: "CONFLICT", jobOutcome: "terminal" },
  },
  {
    code: "LAST_COMPANY_ADMIN_REQUIRED",
    safeMessage: "At least one active company administrator is required.",
    retryable: false,
    transport: { httpStatus: 409, trpcCode: "CONFLICT", jobOutcome: "terminal" },
  },
] as const;

function commandPolicies(id: string, summary: string, risk: "security-sensitive" | "destructive") {
  return {
    id,
    summary,
    owner,
    auth: "user" as const,
    risk,
    authorization: { mode: "policy" as const, policyId: adminPolicyId },
    tenancy: { mode: "global" as const, globalPolicyId },
    errors: commonErrors,
    audit: {
      mode: "required" as const,
      eventType: `${id}.executed`,
      metadataProjection: auditProjection.reference,
      immutable: true as const,
    },
    observability: {
      operationName: id,
      timeoutMs: 10_000,
      cancellation: "deadline-only" as const,
      logLevel: "info" as const,
    },
    kind: "command" as const,
    transaction: { mode: "none" as const },
    idempotency: {
      mode: "required" as const,
      keySchema: idempotencyKeySchema,
      scope: "global-capability" as const,
      retentionSeconds: 86_400,
      conflict: "replay" as const,
    },
  };
}

const listEmployeesInputSchema = z.strictObject({});
const createInputSchema = inputWithoutActor(createEmployeeInputSchema);
const statusInputSchema = inputWithoutActor(setEmployeeStatusInputSchema);
const appRolesInputSchema = inputWithoutActor(setApplicationRolesInputSchema);
const companyRolesInputSchema = inputWithoutActor(setCompanyRolesInputSchema);
const credentialInputSchema = inputWithoutActor(resetCredentialInputSchema);
const revokeInputSchema = inputWithoutActor(revokeEmployeeSessionsInputSchema);

/** Handler-free descriptor for listing company employees. */
export const listEmployeesCapability = defineQueryCapability({
  id: companyIdentityCapabilityIds.listEmployees,
  summary: "Lists employees for an authenticated company administrator.",
  owner,
  input: listEmployeesInputSchema,
  output: z.array(employeeSchema),
  auth: "user",
  risk: "security-sensitive",
  authorization: { mode: "policy", policyId: adminPolicyId },
  tenancy: { mode: "global", globalPolicyId },
  errors: commonErrors,
  audit: {
    mode: "required",
    eventType: "company-identity.employees.listed",
    metadataProjection: auditProjection.reference,
    immutable: true,
  },
  observability: {
    operationName: companyIdentityCapabilityIds.listEmployees,
    timeoutMs: 10_000,
    cancellation: "deadline-only",
    logLevel: "info",
  },
  kind: "query",
  transaction: { mode: "none" },
  idempotency: { mode: "none" },
});

/** Handler-free descriptor for creating one employee. */
export const createEmployeeCapability = defineCommandCapability({
  ...commandPolicies(companyIdentityCapabilityIds.createEmployee, "Creates one company employee.", "security-sensitive"),
  input: createInputSchema,
  output: employeeSchema,
});
/** Handler-free descriptor for changing employee lifecycle status. */
export const setEmployeeStatusCapability = defineCommandCapability({
  ...commandPolicies(companyIdentityCapabilityIds.setEmployeeStatus, "Suspends or restores one employee.", "destructive"),
  input: statusInputSchema,
  output: managementResultSchema,
});
/** Handler-free descriptor for replacing application roles. */
export const setApplicationRolesCapability = defineCommandCapability({
  ...commandPolicies(companyIdentityCapabilityIds.setApplicationRoles, "Replaces roles in one application namespace.", "security-sensitive"),
  input: appRolesInputSchema,
  output: employeeSchema,
});
/** Handler-free descriptor for replacing additive company roles. */
export const setCompanyRolesCapability = defineCommandCapability({
  ...commandPolicies(companyIdentityCapabilityIds.setCompanyRoles, "Replaces additive company roles.", "security-sensitive"),
  input: companyRolesInputSchema,
  output: employeeSchema,
});
/** Handler-free descriptor for resetting one employee credential. */
export const resetCredentialCapability = defineCommandCapability({
  ...commandPolicies(companyIdentityCapabilityIds.resetCredential, "Resets one credential and revokes sessions.", "destructive"),
  input: credentialInputSchema,
  output: managementResultSchema,
});
/** Handler-free descriptor for revoking one employee's sessions. */
export const revokeSessionsCapability = defineCommandCapability({
  ...commandPolicies(companyIdentityCapabilityIds.revokeSessions, "Revokes every active employee session.", "destructive"),
  input: revokeInputSchema,
  output: managementResultSchema,
});

/**
 * Creates the seven exact reviewed registries used by company-identity registration.
 * @returns Fail-closed registration references with no wildcard resolution.
 */
export function createCompanyIdentityCapabilityReferences(): CapabilityRegistrationReferences {
  return {
    authorizationPolicies: {
      getAuthorizationPolicy: (policyId) => policyId === adminPolicyId
        ? { policyId, authentication: "user" }
        : undefined,
    },
    globalTenancyPolicies: {
      getGlobalTenancyPolicy: (policyId) => policyId === globalPolicyId
        ? { policyId, ownerPackage: owner.package }
        : undefined,
    },
    tenantResolvers: { getTenantResolver: () => undefined },
    structuredProjectors: { getProjector: () => undefined },
    auditProjectors: {
      getAuditProjector: (reference) =>
        reference.projectorId === auditProjection.reference.projectorId &&
        reference.schemaIdentity === auditProjection.reference.schemaIdentity
          ? { contract: auditProjection, project: async () => ({ resourceType: "company-employee" as const }) }
          : undefined,
    },
    resourceReferenceProjectors: { getResourceReferenceProjector: () => undefined },
    externalCallProtocols: { hasExternalCallProtocol: () => false },
  };
}

/**
 * Registers all company-identity management operations with private service handlers.
 * @param service Transport-independent identity service invoked only behind the registry.
 * @param references Exact reviewed registries shared with the executor.
 * @returns Opaque runtime registry exposing handler-free metadata only.
 */
export function createCompanyIdentityCapabilityRegistry(
  service: CompanyIdentityService,
  references: CapabilityRegistrationReferences,
): CapabilityRuntimeRegistry {
  const registry = createCapabilityRegistry({
    ownership: {
      allows: (descriptor, source) =>
        descriptor.owner.package === owner.package &&
        descriptor.owner.module === owner.module &&
        source === sourceModule,
    },
    references,
  });
  const actor = (context: { readonly principal: { readonly userId: string } | null }) => {
    if (!context.principal) throw Object.assign(new Error("Authentication required"), { code: "FORBIDDEN" });
    return context.principal.userId;
  };
  registry.register({
    descriptor: listEmployeesCapability,
    sourceModule,
    handler: async (context) => service.listEmployees(actor(context)),
  });
  registry.register({
    descriptor: createEmployeeCapability,
    sourceModule,
    handler: async (context, input) => service.createEmployee({ ...input, actorAccountId: actor(context) }),
  });
  registry.register({
    descriptor: setEmployeeStatusCapability,
    sourceModule,
    handler: async (context, input) => service.setEmployeeStatus({ ...input, actorAccountId: actor(context) }),
  });
  registry.register({
    descriptor: setApplicationRolesCapability,
    sourceModule,
    handler: async (context, input) => service.setApplicationRoles({ ...input, actorAccountId: actor(context) }),
  });
  registry.register({
    descriptor: setCompanyRolesCapability,
    sourceModule,
    handler: async (context, input) => service.setCompanyRoles({ ...input, actorAccountId: actor(context) }),
  });
  registry.register({
    descriptor: resetCredentialCapability,
    sourceModule,
    handler: async (context, input) => service.resetCredential({ ...input, actorAccountId: actor(context) }),
  });
  registry.register({
    descriptor: revokeSessionsCapability,
    sourceModule,
    handler: async (context, input) => service.revokeEmployeeSessions({ ...input, actorAccountId: actor(context) }),
  });
  return registry;
}
