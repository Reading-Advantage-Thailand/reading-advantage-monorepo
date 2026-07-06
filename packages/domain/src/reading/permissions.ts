import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/**
 * Permission keys for the reading-app domain module.
 *
 * - `system:dashboard:read` — SYSTEM users can read aggregated system dashboards.
 * - `admin:license:read` — Admins can read license-scoped admin data.
 * - `admin:license:read:own` — Non-SYSTEM users can read their own license data only.
 * - `admin:segments:read` — Read school segment aggregates.
 */
export const READING_PERMISSIONS = {
  "system:dashboard:read": [ROLES.SYSTEM],
  "admin:license:read": [ROLES.ADMIN, ROLES.SYSTEM],
  "admin:license:read:own": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "admin:segments:read": [ROLES.ADMIN, ROLES.SYSTEM],
} as const;

registerDomainModulePermissions({
  moduleName: "reading",
  keys: [
    { key: "system:dashboard:read", roles: [ROLES.SYSTEM] },
    { key: "admin:license:read", roles: [ROLES.ADMIN, ROLES.SYSTEM] },
    {
      key: "admin:license:read:own",
      roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
    },
    { key: "admin:segments:read", roles: [ROLES.ADMIN, ROLES.SYSTEM] },
  ],
});