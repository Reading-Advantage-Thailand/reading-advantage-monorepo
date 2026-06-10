import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/**
 * Permission keys for the assignments module.
 */
export const ASSIGNMENT_PERMISSIONS = {
  "assignment:create": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "assignment:list": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "assignment:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "assignment:update": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "assignment:delete": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "assignment:submit": [ROLES.STUDENT],
} as const;

registerDomainModulePermissions({
  moduleName: "assignments",
  keys: [
    { key: "assignment:create", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "assignment:list", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "assignment:read", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "assignment:update", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "assignment:delete", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "assignment:submit", roles: [ROLES.STUDENT] },
  ],
});
