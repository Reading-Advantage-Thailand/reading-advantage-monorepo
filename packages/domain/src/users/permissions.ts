import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

export const USER_PERMISSIONS = {
  "user:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "user:list": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "user:update": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
} as const;

registerDomainModulePermissions({
  moduleName: "users",
  keys: [
    { key: "user:read", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "user:list", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "user:update", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
  ],
});
