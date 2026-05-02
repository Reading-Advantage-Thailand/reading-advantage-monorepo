import type { Role } from "./roles.js";

export const PERMISSIONS = {
  // Classrooms
  "class:create": [ROLES.TEACHER, ROLES.ADMIN],
  "class:list": [ROLES.TEACHER, ROLES.ADMIN],
  "class:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN],
  "class:update": [ROLES.TEACHER, ROLES.ADMIN],
  "class:archive": [ROLES.TEACHER, ROLES.ADMIN],
  "class:join": [ROLES.STUDENT],
  "class:roster": [ROLES.TEACHER, ROLES.ADMIN],

  // Students
  "student:list": [ROLES.TEACHER, ROLES.ADMIN],
  "student:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN],
  "student:create": [ROLES.TEACHER, ROLES.ADMIN],
  "student:import": [ROLES.TEACHER, ROLES.ADMIN],

  // Assignments
  "assignment:create": [ROLES.TEACHER, ROLES.ADMIN],
  "assignment:list": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN],
  "assignment:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN],
  "assignment:update": [ROLES.TEACHER, ROLES.ADMIN],
  "assignment:delete": [ROLES.TEACHER, ROLES.ADMIN],
  "assignment:submit": [ROLES.STUDENT],

  // Progress
  "progress:read:own": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN],
  "progress:read:all": [ROLES.TEACHER, ROLES.ADMIN],
  "progress:record": [ROLES.STUDENT],

  // Articles
  "article:list": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN],
  "article:read": [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN],
  "article:create": [ROLES.ADMIN],
  "article:update": [ROLES.ADMIN],

  // Admin
  "admin:dashboard": [ROLES.ADMIN],
  "admin:users": [ROLES.ADMIN],
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

import { ROLES } from "./roles.js";

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly Role[]).includes(role);
}
