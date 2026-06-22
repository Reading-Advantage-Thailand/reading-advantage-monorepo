import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/**
 * Permission keys for the sales-advantage domain module.
 * SALES_REP is the base learner role; SALES_ADMIN is the sales-manager role.
 */
export const SALES_PERMISSIONS = {
  "sales:read": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:attempt:create": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:progress:read": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:chat": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:quiz:submit": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:admin:cohort": [ROLES.SALES_ADMIN],
  "sales:admin:create-rep": [ROLES.SALES_ADMIN],
  "sales:admin:reps": [ROLES.SALES_ADMIN],
  "sales:curriculum:approve": [ROLES.SALES_ADMIN],
} as const;

registerDomainModulePermissions({
  moduleName: "sales",
  keys: [
    {
      key: "sales:read",
      roles: [ROLES.SALES_REP, ROLES.SALES_ADMIN],
    },
    {
      key: "sales:attempt:create",
      roles: [ROLES.SALES_REP, ROLES.SALES_ADMIN],
    },
    {
      key: "sales:progress:read",
      roles: [ROLES.SALES_REP, ROLES.SALES_ADMIN],
    },
    {
      key: "sales:chat",
      roles: [ROLES.SALES_REP, ROLES.SALES_ADMIN],
    },
    {
      key: "sales:quiz:submit",
      roles: [ROLES.SALES_REP, ROLES.SALES_ADMIN],
    },
    { key: "sales:admin:cohort", roles: [ROLES.SALES_ADMIN] },
    { key: "sales:admin:create-rep", roles: [ROLES.SALES_ADMIN] },
    { key: "sales:admin:reps", roles: [ROLES.SALES_ADMIN] },
    { key: "sales:curriculum:approve", roles: [ROLES.SALES_ADMIN] },
  ],
});
