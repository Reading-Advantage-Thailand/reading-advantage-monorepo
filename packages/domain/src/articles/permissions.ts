import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/**
 * Permission keys for the articles module.
 */
export const ARTICLE_PERMISSIONS = {
  "article:list": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "article:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "article:create": [ROLES.ADMIN, ROLES.SYSTEM],
  "article:update": [ROLES.ADMIN, ROLES.SYSTEM],
} as const;

registerDomainModulePermissions({
  moduleName: "articles",
  keys: [
    { key: "article:list", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "article:read", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "article:create", roles: [ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "article:update", roles: [ROLES.ADMIN, ROLES.SYSTEM] },
  ],
});
