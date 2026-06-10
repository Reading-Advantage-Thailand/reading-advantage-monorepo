// Roles & Permissions
export { ROLES, type Role, roleAtLeast, ROLE_HIERARCHY, ROLE_ROUTES } from "./roles.js";
export {
  PERMISSIONS,
  type Permission,
  hasPermission,
  type DomainModulePermissions,
  registerDomainModulePermissions,
  lookupPermission,
} from "./permissions.js";

// Tenant & Auth Context
export type { Tenant, UserContext, AuthContext } from "./tenant.js";
export { assertTenantAccess } from "./tenant.js";

// Authorization
export { assertCan, AuthError } from "./assert.js";

// Audit
export { recordAuditEvent, type AuditContext, type AuditPayload, AuditEventError } from "./audit.js";

// Password
export { hashPassword, verifyPassword, rehashOnLogin, ARGON2ID_OPTS } from "./password.js";

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

// Audit Retention Config
export {
  retentionConfigSchema,
  getRetentionDays,
} from "./audit-retention-config.js";

// Audit Retention Purge
export {
  purgeExpiredAuditEvents,
  getRetentionCutoff,
} from "./audit-retention.js";

// Audit Retention Job (periodic scheduler)
export {
  createAuditRetentionJob,
  runPurgeWithLock,
  AUDIT_RETENTION_LOCK_KEY,
} from "./audit-retention-job.js";
