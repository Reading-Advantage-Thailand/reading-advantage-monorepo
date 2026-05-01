import { Role } from "@/types/enum";

// Permission types for different navigation items
export type Permission =
  | "STUDENT_ACCESS"
  | "TEACHER_ACCESS"
  | "ADMIN_ACCESS"
  | "SYSTEM_ACCESS"
  | "SCHOOL_ADMIN_ACCESS"
  | "ARTICLE_CREATION"
  | "USER_MANAGEMENT"
  | "IMPORT_DATA"
  | "REPORTS_ACCESS"
  | "CLASS_MANAGEMENT";

// Role hierarchy mapping
const ROLE_HIERARCHY: Record<string, number> = {
  [Role.student]: 1,
  [Role.teacher]: 2,
  [Role.admin]: 3,
  [Role.system]: 4,
};

// Permission requirements mapping
const PERMISSION_REQUIREMENTS: Record<
  Permission,
  {
    roles: string[];
    minHierarchyLevel?: number;
    schoolAdminAllowed?: boolean;
  }
> = {
  STUDENT_ACCESS: {
    roles: [Role.student, Role.teacher, Role.admin, Role.system],
    schoolAdminAllowed: true,
  },
  TEACHER_ACCESS: {
    roles: [Role.teacher, Role.admin, Role.system],
    minHierarchyLevel: 2,
    schoolAdminAllowed: true,
  },
  ADMIN_ACCESS: {
    roles: [Role.admin, Role.system],
    minHierarchyLevel: 3,
    schoolAdminAllowed: true,
  },
  SYSTEM_ACCESS: {
    roles: [Role.system],
    minHierarchyLevel: 4,
    schoolAdminAllowed: false,
  },
  SCHOOL_ADMIN_ACCESS: {
    roles: [Role.admin, Role.system],
    schoolAdminAllowed: true,
  },
  ARTICLE_CREATION: {
    roles: [Role.admin, Role.system],
    minHierarchyLevel: 3,
    schoolAdminAllowed: true,
  },
  USER_MANAGEMENT: {
    roles: [Role.admin, Role.system],
    minHierarchyLevel: 3,
    schoolAdminAllowed: true,
  },
  IMPORT_DATA: {
    roles: [Role.admin, Role.system],
    minHierarchyLevel: 3,
    schoolAdminAllowed: true,
  },
  REPORTS_ACCESS: {
    roles: [Role.teacher, Role.admin, Role.system],
    minHierarchyLevel: 2,
    schoolAdminAllowed: true,
  },
  CLASS_MANAGEMENT: {
    roles: [Role.teacher, Role.admin, Role.system],
    minHierarchyLevel: 2,
    schoolAdminAllowed: true,
  },
};

// User type for permission checking
export interface UserForPermissions {
  role?: string;
  roles?: Array<{
    role: {
      name: string;
    };
  }>;
  SchoolAdmins?: Array<{
    id: string;
    schoolId: string;
  }>;
}

/**
 * Check if a user has the required permission
 * @param user - User object with role information
 * @param permission - Permission to check
 * @returns boolean indicating if user has permission
 */
export function hasPermission(
  user: UserForPermissions | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;

  const requirement = PERMISSION_REQUIREMENTS[permission];
  if (!requirement) return false;

  // Get user's primary role (from session) or roles array (from database)
  const userRole = user.role;
  const userRoles = user.roles?.map((r) => r.role.name) || [];
  const isSchoolAdmin = (user.SchoolAdmins?.length || 0) > 0;

  // Check if user is school admin and it's allowed for this permission
  if (isSchoolAdmin && requirement.schoolAdminAllowed) {
    return true;
  }

  // Check primary role from session
  if (userRole && requirement.roles.includes(userRole)) {
    return true;
  }

  // Check roles from database
  if (userRoles.some((role) => requirement.roles.includes(role))) {
    return true;
  }

  // Check hierarchy level if specified
  if (requirement.minHierarchyLevel) {
    const userLevel = userRole ? ROLE_HIERARCHY[userRole] : 0;
    const roleLevel = Math.max(
      ...userRoles.map((role) => ROLE_HIERARCHY[role] || 0),
    );
    const maxLevel = Math.max(userLevel, roleLevel);

    if (maxLevel >= requirement.minHierarchyLevel) {
      return true;
    }
  }

  return false;
}

/**
 * Check multiple permissions (user needs ALL permissions)
 * @param user - User object with role information
 * @param permissions - Array of permissions to check
 * @returns boolean indicating if user has all permissions
 */
export function hasAllPermissions(
  user: UserForPermissions | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

/**
 * Check multiple permissions (user needs ANY permission)
 * @param user - User object with role information
 * @param permissions - Array of permissions to check
 * @returns boolean indicating if user has any of the permissions
 */
export function hasAnyPermission(
  user: UserForPermissions | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Get user's effective role considering hierarchy and school admin status
 * @param user - User object with role information
 * @returns string representing the highest effective role
 */
export function getEffectiveRole(
  user: UserForPermissions | null | undefined,
): string {
  if (!user) return "Guest";

  const isSchoolAdmin = (user.SchoolAdmins?.length || 0) > 0;
  if (isSchoolAdmin) {
    return "School Admin";
  }

  const userRole = user.role;
  const userRoles = user.roles?.map((r) => r.role.name) || [];

  // Find highest role in hierarchy
  const allRoles = userRole ? [userRole, ...userRoles] : userRoles;
  const highestRole = allRoles.reduce((highest, current) => {
    const currentLevel = ROLE_HIERARCHY[current] || 0;
    const highestLevel = ROLE_HIERARCHY[highest] || 0;
    return currentLevel > highestLevel ? current : highest;
  }, Role.student);

  return highestRole;
}

/**
 * Check if user can access a specific route based on role
 * @param user - User object with role information
 * @param route - Route path to check
 * @returns boolean indicating if user can access the route
 */
export function canAccessRoute(
  user: UserForPermissions | null | undefined,
  route: string,
): boolean {
  if (!user) return false;

  // Define route-based permissions
  const routePermissions: Record<string, Permission[]> = {
    "/admin": ["ADMIN_ACCESS"],
    "/system": ["SYSTEM_ACCESS"],
    "/teacher": ["TEACHER_ACCESS"],
    "/student": ["STUDENT_ACCESS"],
  };

  // Check if route matches any pattern
  for (const [routePattern, permissions] of Object.entries(routePermissions)) {
    if (route.startsWith(routePattern)) {
      return hasAnyPermission(user, permissions);
    }
  }

  // Default to allowing access if no specific permission required
  return true;
}
