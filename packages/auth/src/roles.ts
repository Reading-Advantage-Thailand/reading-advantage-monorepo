export const ROLES = {
  STUDENT: "STUDENT",
  USER: "USER",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  STUDENT: 0,
  USER: 1,
  TEACHER: 2,
  ADMIN: 3,
};

export function roleAtLeast(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
