import type { Role } from "./roles.js";

export interface Tenant {
  schoolId: string | null;
}

export interface UserContext {
  id: string;
  username: string;
  name: string | null;
  role: Role;
  schoolId: string | null;
  xp: number;
  level: number;
  cefrLevel: string;
}

export interface AuthContext {
  user: UserContext;
  tenant: Tenant;
}

/**
 * Verify that the current user has access to the given tenant.
 * Teachers and admins can access any school they belong to.
 * Students can only access their own school.
 */
export function assertTenantAccess(user: UserContext, targetSchoolId: string): void {
  if (!user.schoolId) {
    throw new Error("User has no school assignment");
  }
  if (user.role === "ADMIN" || user.role === "SYSTEM") {
    return; // Admins and system can access any school
  }
  if (user.schoolId !== targetSchoolId) {
    throw new Error("Access denied: user does not belong to this school");
  }
}
