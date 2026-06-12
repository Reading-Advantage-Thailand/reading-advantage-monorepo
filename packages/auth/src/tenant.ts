import type { Role } from "./roles.js";
import { AuthError } from "./assert.js";

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
  // FR-2: Admin/system bypass must come BEFORE the schoolId check
  if (user.role === "ADMIN" || user.role === "SYSTEM") {
    return;
  }
  if (!user.schoolId) {
    throw new AuthError("User has no school assignment", "FORBIDDEN");
  }
  if (user.schoolId !== targetSchoolId) {
    throw new AuthError("Access denied: user does not belong to this school", "FORBIDDEN");
  }
}
