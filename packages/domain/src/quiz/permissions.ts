import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

export const QUIZ_PERMISSIONS = {
  "quiz:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "quiz:read:all": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "quiz:submit": [ROLES.STUDENT],
  "quiz:create": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
} as const;

registerDomainModulePermissions({
  moduleName: "quiz",
  keys: [
    { key: "quiz:read", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "quiz:read:all", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "quiz:submit", roles: [ROLES.STUDENT] },
    { key: "quiz:create", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
  ],
});
