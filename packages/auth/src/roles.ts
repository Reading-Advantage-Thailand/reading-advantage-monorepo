export const ROLES = {
  INTERN: "INTERN",
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
  SALES_REP: "SALES_REP",
  SALES_ADMIN: "SALES_ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  INTERN: 0,
  STUDENT: 1,
  TEACHER: 2,
  ADMIN: 3,
  SYSTEM: 4,
  SALES_REP: 1,
  SALES_ADMIN: 3,
};

export const ROLE_ROUTES: Record<Role, string> = {
  INTERN: "/intern",
  STUDENT: "/student",
  TEACHER: "/teacher",
  ADMIN: "/admin",
  SYSTEM: "/system",
  SALES_REP: "/dashboard",
  SALES_ADMIN: "/admin",
};

/**
 * Checks if a user's role meets the minimum required role level.
 * @param userRole - The role of the user to check
 * @param requiredRole - The minimum required role level
 * @returns True if userRole is >= requiredRole in hierarchy
 */
export function roleAtLeast(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
