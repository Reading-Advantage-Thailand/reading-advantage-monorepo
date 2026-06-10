import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

export const REPORT_PERMISSIONS = {
  "progress:read:all": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
} as const;

registerDomainModulePermissions({
  moduleName: "reports",
  keys: [
    { key: "progress:read:all", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
  ],
});
