import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/** Challenge permissions for teacher creation and class-member reads. */
export const CHALLENGE_PERMISSIONS = {
  "challenges:create": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "challenges:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "challenges:start": [ROLES.STUDENT, ROLES.TEACHER],
} as const;

registerDomainModulePermissions({
  moduleName: "challenges",
  keys: [
    { key: "challenges:create", roles: [...CHALLENGE_PERMISSIONS["challenges:create"]] },
    { key: "challenges:read", roles: [...CHALLENGE_PERMISSIONS["challenges:read"]] },
    { key: "challenges:start", roles: [...CHALLENGE_PERMISSIONS["challenges:start"]] },
  ],
});
