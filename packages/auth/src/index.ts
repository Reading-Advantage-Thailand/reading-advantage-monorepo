// Roles & Permissions
export {
  ROLES,
  type Role,
  roleAtLeast,
  ROLE_HIERARCHY,
  ROLE_ROUTES,
} from "./roles.js";
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
export {
  productAuthorizationScopeSchema,
  type ProductAuthorizationScope,
} from "./product-scope.js";

// Authorization
export { assertCan, AuthError } from "./assert.js";

// Audit
export {
  recordAuditEvent,
  type AuditContext,
  type AuditPayload,
  AuditEventError,
} from "./audit.js";

// Password
export {
  hashPassword,
  verifyPassword,
  rehashOnLogin,
  ARGON2ID_OPTS,
} from "./password.js";

// Interim first-party credential compatibility adapter
export {
  createCredentialAccount,
  CredentialUsernameConflictError,
  type CreateCredentialAccountInput,
  type CreatedCredentialAccount,
} from "./credential-account.js";

// Sessions
export {
  createSession,
  validateSession,
  deleteSession,
  revokeAllUserSessions,
  type Session,
  type CreateSessionResult,
} from "./session.js";

// Rate Limiting
export {
  checkRateLimit,
  checkRateLimitByIp,
  consumeRateLimit,
  recordFailure,
  resetLimit,
  configureRateLimiter,
  configurePostgresRateLimiter,
  createInMemoryRateLimitStore,
  getRateLimitConfig,
  getIpRateLimitConfig,
  DEFAULT_RATE_LIMIT_CONFIG,
  DEFAULT_IP_RATE_LIMIT_CONFIG,
  CAPTCHA_THRESHOLD,
  type RateLimitConfig,
  type RateLimitCheckResult,
  type RateLimitStore,
  type RateLimitStoreEntry,
  _testkit,
} from "./rate-limit.js";
export { createPostgresRateLimitStore } from "./rate-limit-store.js";

// Company employee identity configuration (provider-neutral auth boundary)
export * from "./company-identity/environment.js";
export * from "./company-identity/client.js";

// Rate Limit Cleanup
export {
  cleanupOldAttempts,
  createRateLimitCleanupJob,
  runCleanupWithLock,
  RATE_LIMIT_CLEANUP_LOCK_KEY,
} from "./rate-limit-cleanup.js";

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
