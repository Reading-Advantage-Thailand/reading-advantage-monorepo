import React from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessRoute,
  getEffectiveRole,
  type Permission,
} from "@/lib/permissions";

/**
 * Custom hook for permission checking in React components
 * Provides convenient access to permission utilities with current user context
 */
export function usePermissions() {
  const currentUser = useCurrentUser();

  return {
    // Core permission checks
    hasPermission: (permission: Permission) =>
      hasPermission(currentUser, permission),
    hasAnyPermission: (permissions: Permission[]) =>
      hasAnyPermission(currentUser, permissions),
    hasAllPermissions: (permissions: Permission[]) =>
      hasAllPermissions(currentUser, permissions),
    canAccessRoute: (route: string) => canAccessRoute(currentUser, route),

    // User info
    getEffectiveRole: () => getEffectiveRole(currentUser),
    currentUser,

    // Common permission checks for UI components
    canManageUsers: () => hasPermission(currentUser, "USER_MANAGEMENT"),
    canCreateArticles: () => hasPermission(currentUser, "ARTICLE_CREATION"),
    canImportData: () => hasPermission(currentUser, "IMPORT_DATA"),
    canAccessReports: () => hasPermission(currentUser, "REPORTS_ACCESS"),
    canManageClasses: () => hasPermission(currentUser, "CLASS_MANAGEMENT"),

    // Role checks
    isStudent: () => hasPermission(currentUser, "STUDENT_ACCESS"),
    isTeacher: () => hasPermission(currentUser, "TEACHER_ACCESS"),
    isAdmin: () => hasPermission(currentUser, "ADMIN_ACCESS"),
    isSystem: () => hasPermission(currentUser, "SYSTEM_ACCESS"),
    isSchoolAdmin: () => hasPermission(currentUser, "SCHOOL_ADMIN_ACCESS"),
  };
}

/**
 * Higher-order component for protecting components based on permissions
 * @param permissions - Required permissions (user needs ANY of these)
 * @param fallback - Component to render when no permission (default: null)
 * @param hideWhenNoPermission - Whether to hide completely (default: true)
 */
export function withPermissions<P extends object>(
  permissions: Permission[],
  fallback: React.ComponentType<P> | React.ReactElement | null = null,
  hideWhenNoPermission: boolean = true,
) {
  return function PermissionWrapper(Component: React.ComponentType<P>) {
    return function ProtectedComponent(props: P) {
      const { hasAnyPermission } = usePermissions();

      const hasRequiredPermission = hasAnyPermission(permissions);

      if (!hasRequiredPermission) {
        if (hideWhenNoPermission) {
          return null;
        }

        if (fallback) {
          if (React.isValidElement(fallback)) {
            return fallback;
          }
          const FallbackComponent = fallback as React.ComponentType<P>;
          return React.createElement(FallbackComponent, props);
        }

        return null;
      }

      return React.createElement(Component, props);
    };
  };
}

/**
 * Component for conditionally rendering content based on permissions
 */
interface PermissionGuardProps {
  permissions: Permission[];
  requireAll?: boolean; // If true, user needs ALL permissions (default: false - needs ANY)
  fallback?: React.ReactNode;
  hideWhenNoPermission?: boolean;
  children: React.ReactNode;
}

export function PermissionGuard({
  permissions,
  requireAll = false,
  fallback = null,
  hideWhenNoPermission = true,
  children,
}: PermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  const hasRequiredPermission = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasRequiredPermission) {
    if (hideWhenNoPermission) {
      return null;
    }
    return React.createElement(React.Fragment, null, fallback);
  }

  return React.createElement(React.Fragment, null, children);
}
