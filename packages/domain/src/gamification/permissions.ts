import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/**
 * Permission keys for the gamification module.
 *
 * - `gamification:read:own` — Students can read their own gamification profile.
 * - `gamification:read:all` — Teachers/admins can read any student's profile.
 * - `gamification:update` — Admins can update XP values.
 */
export const GAMIFICATION_PERMISSIONS = {
  "gamification:read:own": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "gamification:read:all": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "gamification:update": [ROLES.ADMIN, ROLES.SYSTEM],
} as const;

registerDomainModulePermissions({
  moduleName: "gamification",
  keys: [
    { key: "gamification:read:own", roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "gamification:read:all", roles: [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM] },
    { key: "gamification:update", roles: [ROLES.ADMIN, ROLES.SYSTEM] },
  ],
});
