import { hasPermission, type Permission } from "./permissions.js";
import type { UserContext, Tenant } from "./tenant.js";

export class AuthError extends Error {
  constructor(message: string, public code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Asserts that a user has permission for an action on a tenant.
 * @param user - The user context containing role and id
 * @param permission - The permission to check
 * @param _tenant - The tenant context (optional, reserved for future multi-tenant checks)
 * @throws {AuthError} Throws if user lacks the required permission
 */
export function assertCan(user: UserContext, permission: Permission, _tenant?: Tenant): void {
  if (!hasPermission(user.role, permission)) {
    throw new AuthError(
      `User ${user.id} (${user.role}) lacks permission: ${permission}`,
      "FORBIDDEN"
    );
  }
}
