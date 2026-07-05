import type { Role } from "./roles.js";
import { ROLES } from "./roles.js";

/**
 * Describes a domain module's permission registrations.
 * Each module can register its own permission keys with associated roles.
 */
export interface DomainModulePermissions {
  moduleName: string;
  keys: Array<{ key: string; roles: Role[] }>;
}

/**
 * Registry of domain module permissions. Modules register at import time
 * via `registerDomainModulePermissions()`. Checked first by `lookupPermission`
 * before falling back to the central `PERMISSIONS` map.
 */
const modulePermissions: DomainModulePermissions[] = [];

/**
 * Registers a domain module's permission keys. Call this at module load time
 * from each domain module's `permissions.ts`.
 * @param mod - The module permissions to register
 */
export function registerDomainModulePermissions(mod: DomainModulePermissions): void {
  modulePermissions.push(mod);
}

/**
 * Looks up the allowed roles for a permission key. Checks module-level
 * registrations first, then falls back to the central PERMISSIONS map.
 * @param key - The permission key to look up
 * @returns The array of allowed roles, or undefined if not found
 */
export function lookupPermission(key: string): Role[] | undefined {
  // 1. Check module-level first (last registered wins for duplicates)
  for (let i = modulePermissions.length - 1; i >= 0; i--) {
    const entry = modulePermissions[i].keys.find((k) => k.key === key);
    if (entry) return entry.roles;
  }
  // 2. Fall back to central map
  return (PERMISSIONS as Record<string, readonly Role[]>)[key] as Role[] | undefined;
}

export const PERMISSIONS = {
  // Classrooms
  "class:create": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "class:list": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "class:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "class:update": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "class:archive": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "class:join": [ROLES.STUDENT],
  "class:roster": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Students
  "student:list": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "student:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "student:create": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "student:import": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Assignments
  "assignment:create": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "assignment:list": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "assignment:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "assignment:update": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "assignment:delete": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "assignment:submit": [ROLES.STUDENT],

  // Progress
  "progress:read:own": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "progress:read:all": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "progress:record": [ROLES.STUDENT],

  // Articles
  "article:list": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "article:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "article:create": [ROLES.ADMIN, ROLES.SYSTEM],
  "article:update": [ROLES.ADMIN, ROLES.SYSTEM],

  // Users
  "user:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "user:list": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "user:update": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Admin
  "admin:dashboard": [ROLES.ADMIN, ROLES.SYSTEM],
  "admin:users": [ROLES.ADMIN, ROLES.SYSTEM],

  // Codecamp
  "codecamp:read": [ROLES.INTERN, ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "codecamp:submit": [ROLES.INTERN, ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "codecamp:chat": [ROLES.INTERN, ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Sales-advantage
  "sales:read": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:attempt:create": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:progress:read": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:chat": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:quiz:submit": [ROLES.SALES_REP, ROLES.SALES_ADMIN],
  "sales:admin:cohort": [ROLES.SALES_ADMIN],
  "sales:admin:create-rep": [ROLES.SALES_ADMIN],
  "sales:admin:reps": [ROLES.SALES_ADMIN],
  "sales:curriculum:approve": [ROLES.SALES_ADMIN],

  // Licenses
  "license:create": [ROLES.ADMIN, ROLES.SYSTEM],
  "license:manage": [ROLES.ADMIN, ROLES.SYSTEM],
  "license:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Stories
  "story:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "story:list": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "story:create": [ROLES.ADMIN, ROLES.SYSTEM],

  // Students (own data)
  "student:read:own": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Gamification (science)
  "gamification:read:own": [ROLES.STUDENT],
  "gamification:read:all": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "gamification:update": [ROLES.ADMIN, ROLES.SYSTEM],

  // Mastery (science)
  "mastery:write:own": [ROLES.STUDENT],

  // AI (science)
  "ai:recommend": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "ai:recommend:all": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Interventions (science)
  "intervention:read": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Teachers (science)
  "teachers:read:own": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Curriculum (science)
  "curriculum:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "curriculum:create": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Quiz (science)
  "quiz:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "quiz:read:all": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "quiz:submit": [ROLES.STUDENT],
  "quiz:create": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],

  // Audit log
  "audit:read:all": [ROLES.ADMIN, ROLES.SYSTEM],

  // DSAR (Data Subject Access Request)
  "dsar:export": [ROLES.ADMIN, ROLES.SYSTEM],

  // Games (Wave 3 / Advantage Games)
  // Phase 3: only student-authored paths. Teacher/admin views are Phase 4+.
  "games:complete": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "games:read:own": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Checks if a role has a specific permission.
 * @param role - The role to check
 * @param permission - The permission to verify
 * @returns True if the role has the permission, false otherwise
 * @throws {Error} Throws if the permission is not defined in PERMISSIONS or any module
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = lookupPermission(permission as string);
  if (!allowedRoles) {
    throw new Error(`Unknown permission: ${permission}`);
  }
  return allowedRoles.includes(role);
}
