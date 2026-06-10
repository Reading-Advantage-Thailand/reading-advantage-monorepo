import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

export const CODECAMP_PERMISSIONS = {
  "codecamp:read": [ROLES.INTERN, ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "codecamp:submit": [ROLES.INTERN, ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "codecamp:chat": [ROLES.INTERN, ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "admin:dashboard": [ROLES.ADMIN, ROLES.SYSTEM],
} as const;

registerDomainModulePermissions({
  moduleName: "codecamp",
  keys: [
    { key: "codecamp:read", roles: [ROLES.INTERN, ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "codecamp:submit", roles: [ROLES.INTERN, ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "codecamp:chat", roles: [ROLES.INTERN, ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "admin:dashboard", roles: [ROLES.ADMIN, ROLES.SYSTEM] },
  ],
});
