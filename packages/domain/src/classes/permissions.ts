import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/** Permission keys of the classes module that the Primary school management uses. */
export const CLASS_TEACHER_PERMISSIONS = {
  "class:teachers:assign": [ROLES.ADMIN, ROLES.SYSTEM],
} as const;

registerDomainModulePermissions({
  moduleName: "classes",
  keys: [{ key: "class:teachers:assign", roles: [ROLES.ADMIN, ROLES.SYSTEM] }],
});
