import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

export const CURRICULUM_PERMISSIONS = {
  "curriculum:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "curriculum:create": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
} as const;

registerDomainModulePermissions({
  moduleName: "curriculum",
  keys: [
    { key: "curriculum:read", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "curriculum:create", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
  ],
});
