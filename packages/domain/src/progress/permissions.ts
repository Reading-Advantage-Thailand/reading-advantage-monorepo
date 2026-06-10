import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

export const PROGRESS_PERMISSIONS = {
  "progress:read:own": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "progress:read:all": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "progress:record": [ROLES.STUDENT],
} as const;

registerDomainModulePermissions({
  moduleName: "progress",
  keys: [
    { key: "progress:read:own", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "progress:read:all", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "progress:record", roles: [ROLES.STUDENT] },
  ],
});
