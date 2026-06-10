import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

export const LICENSE_PERMISSIONS = {
  "license:create": [ROLES.ADMIN, ROLES.SYSTEM],
  "license:manage": [ROLES.ADMIN, ROLES.SYSTEM],
  "license:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
} as const;

registerDomainModulePermissions({
  moduleName: "licenses",
  keys: [
    { key: "license:create", roles: [ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "license:manage", roles: [ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "license:read", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
  ],
});
