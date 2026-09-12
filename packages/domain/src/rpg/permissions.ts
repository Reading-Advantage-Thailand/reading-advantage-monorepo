import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/** RPG permissions for own-state reads and cosmetic equipment. */
export const RPG_PERMISSIONS = {
  "rpg:read:own": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "rpg:equip:own": [ROLES.STUDENT],
} as const;

registerDomainModulePermissions({
  moduleName: "rpg",
  keys: [
    { key: "rpg:read:own", roles: [...RPG_PERMISSIONS["rpg:read:own"]] },
    { key: "rpg:equip:own", roles: [...RPG_PERMISSIONS["rpg:equip:own"]] },
  ],
});
