import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

export const STORY_PERMISSIONS = {
  "story:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "story:list": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "story:create": [ROLES.ADMIN, ROLES.SYSTEM],
  "progress:record": [ROLES.STUDENT],
} as const;

registerDomainModulePermissions({
  moduleName: "stories",
  keys: [
    { key: "story:read", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "story:list", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "story:create", roles: [ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "progress:record", roles: [ROLES.STUDENT] },
  ],
});
