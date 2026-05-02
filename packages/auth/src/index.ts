// Roles & Permissions
export { ROLES, type Role, roleAtLeast, ROLE_HIERARCHY, ROLE_ROUTES } from "./roles.js";
export { PERMISSIONS, type Permission, hasPermission } from "./permissions.js";

// Tenant & Auth Context
export type { Tenant, UserContext, AuthContext } from "./tenant.js";
export { assertTenantAccess } from "./tenant.js";

// Authorization
export { assertCan, AuthError } from "./assert.js";

// Password
export { hashPassword, verifyPassword } from "./password.js";

// Sessions
export {
  createSession,
  validateSession,
  deleteSession,
  type Session,
} from "./session.js";

// Rate Limiting
export { checkRateLimit, recordFailure, resetLimit, _testkit } from "./rate-limit.js";

// Server Guards (framework-agnostic)
export {
  getSession,
  requireAuth,
  requireRole,
  hasRole,
  SESSION_COOKIE_NAME,
} from "./server.js";
