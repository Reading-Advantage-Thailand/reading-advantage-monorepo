import { ROLES } from "@reading-advantage/auth";

/**
 * Every canonical role, used to prove each role owns a proxy policy.
 */
export const POLICY_ROLES = Object.values(ROLES);

/**
 * Protected routes with required session roles, derived from the role enum.
 * Every member of the canonical role enum appears in at least one list.
 */
export const protectedRoutes: Record<string, readonly string[]> = {
  "/admin": [ROLES.ADMIN, ROLES.SYSTEM],
  "/teacher": [ROLES.TEACHER, ROLES.ADMIN, ROLES.SYSTEM],
  "/student": [ROLES.STUDENT],
  "/system": [ROLES.SYSTEM],
  "/settings": [...POLICY_ROLES],
  "/intern": [ROLES.INTERN],
  "/dashboard": [ROLES.SALES_REP, ROLES.ADMIN, ROLES.SYSTEM],
};

/** Default landing page per normalized lowercase role. */
export const roleDefaultRedirects: Record<string, string> = {
  intern: "/intern",
  student: "/student/read",
  teacher: "/teacher/my-classes",
  admin: "/admin/dashboard",
  system: "/system/dashboard",
  // Sales roles intentionally have no default landing in this app.
};
