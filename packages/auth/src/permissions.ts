import type { Role } from "./roles.js";
import { ROLES } from "./roles.js";

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
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) {
    throw new Error(`Unknown permission: ${permission}`);
  }
  return (allowedRoles as readonly Role[]).includes(role);
}
