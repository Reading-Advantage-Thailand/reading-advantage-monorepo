export const ROLES = {
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  STUDENT: 1,
  TEACHER: 2,
  ADMIN: 3,
  SYSTEM: 4,
};

export const ROLE_ROUTES: Record<Role, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  ADMIN: "/admin",
  SYSTEM: "/system",
};

export function roleAtLeast(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
