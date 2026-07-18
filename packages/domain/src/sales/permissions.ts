import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/**
 * Permission keys for the sales-advantage domain module.
 * SALES_REP is the base learner role; SALES_ADMIN is the sales-manager role.
 *
 * FR-6: this map is the single source of truth. `registerSalesPermissions()`
 * derives the `registerDomainModulePermissions` payload from it; the keys +
 * role lists must never be duplicated as a literal.
 */
export const SALES_PERMISSIONS = {
  "sales:read": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:attempt:create": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:progress:read": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:chat": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:quiz:submit": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:admin:cohort": [ROLES.SALES_ADMIN],
  "sales:admin:reps": [ROLES.SALES_ADMIN],
  "sales:curriculum:approve": [ROLES.SALES_ADMIN],
} as const;

export function registerSalesPermissions(): void {
  registerDomainModulePermissions({
    moduleName: "sales",
    keys: Object.entries(SALES_PERMISSIONS).map(([key, roles]) => ({
      key,
      roles: [...roles],
    })),
  });
}

registerSalesPermissions();
