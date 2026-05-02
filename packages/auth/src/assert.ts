import { hasPermission, type Permission } from "./permissions.js";
import type { UserContext, Tenant } from "./tenant.js";

export class AuthError extends Error {
  constructor(message: string, public code: "UNAUTHORIZED" | "FORBIDDEN") {
    super(message);
    this.name = "AuthError";
  }
}

export function assertCan(user: UserContext, permission: Permission, tenant?: Tenant): void {
  if (!hasPermission(user.role, permission)) {
    throw new AuthError(
      `User ${user.id} (${user.role}) lacks permission: ${permission}`,
      "FORBIDDEN"
    );
  }
}
