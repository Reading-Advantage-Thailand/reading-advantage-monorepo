import { ROLES, registerDomainModulePermissions } from "@reading-advantage/auth";

/**
 * Permission keys for the games domain module.
 *
 * - `games:complete` — student records their own completion (host app writes
 *   via `recordGameCompletion`).
 * - `games:read:own` — student reads their own completion history
 *   (`getGameCompletions`).
 *
 * Phase 4 may add `games:read:all` for teachers viewing class-wide results.
 */
export const GAMES_PERMISSIONS = {
  "games:complete": [
    ROLES.STUDENT,
    ROLES.TEACHER,
    ROLES.ADMIN,
    ROLES.SYSTEM,
  ],
  "games:read:own": [
    ROLES.STUDENT,
    ROLES.TEACHER,
    ROLES.ADMIN,
    ROLES.SYSTEM,
  ],
} as const;

registerDomainModulePermissions({
  moduleName: "games",
  keys: [
    {
      key: "games:complete",
      roles: [
        ROLES.STUDENT,
        ROLES.TEACHER,
        ROLES.ADMIN,
        ROLES.SYSTEM,
      ],
    },
    {
      key: "games:read:own",
      roles: [
        ROLES.STUDENT,
        ROLES.TEACHER,
        ROLES.ADMIN,
        ROLES.SYSTEM,
      ],
    },
  ],
});