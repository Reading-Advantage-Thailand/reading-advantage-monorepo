# Specification: Auth Security Hardening

## Overview

Close the security and correctness gaps identified in the June 2026 audit of
`packages/auth` and its consuming routes in `packages/api/src/routes/auth/`.
All changes are scoped to the existing username/password-only flow. No OAuth,
email verification, or new auth methods are introduced.

## Functional Requirements

### FR-1: Hash Session Tokens Before Storage

**Problem:** `sessions.token` stores the raw 256-bit bearer token. A DB read
(backup leak, SQL injection, admin query) gives an attacker every active session.

**Change:** `createSession` hashes the generated token with SHA-256 before
writing it to `sessions.tokenHash`. `validateSession` and `deleteSession` hash
the incoming token before the DB lookup. The raw token is only ever held in
memory and sent in the cookie — it never touches the DB.

```ts
function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
```

A Drizzle migration adds `token_hash TEXT NOT NULL UNIQUE` alongside the
existing `token` column (zero-downtime). The `token` column is dropped in a
follow-up migration after all apps are deployed with `token_hash`.

---

### FR-2: Fix `assertTenantAccess` — Check Order and Error Type

**Problem (a):** `tenant.ts:29` checks `!user.schoolId` before the admin/system
bypass, so an admin with no school assignment is denied access. The bypass must
come first.

**Problem (b):** `assertTenantAccess` throws a bare `Error`, not `AuthError`,
making it impossible for callers to map it reliably to a 403.

**Change:** Swap the two checks; throw `AuthError(..., "FORBIDDEN")` instead of
`Error`.

---

### FR-3: Fix `rehashOnLogin` Provider Filter

**Problem:** `password.ts:78` updates `accounts` by `userId` only, without
filtering on `providerId = 'credential'`. If any other provider row exists for
the user with a non-null `password`, it would be overwritten.

**Change:** Add `eq(accounts.providerId, "credential")` to the UPDATE `.where()`
using `and()`.

---

### FR-4: Eliminate Username-Enumeration Timing Oracle in `handleLogin`

**Problem:** Unknown username → instant 401; known username → ~20–50 ms Argon2id
verify then 401. A timing measurement distinguishes valid from invalid usernames.

**Change:** When the user or account is not found, call
`await verifyPassword(password, DUMMY_HASH)` before returning 401. `DUMMY_HASH`
is a pre-computed Argon2id hash of a known string stored as a module-level
constant in `login.ts`.

---

### FR-5: Do Not Record Rate-Limit Failures on DB Infrastructure Errors

**Problem:** `login.ts:73-79` and `login.ts:104-111` call `recordFailure` on DB
errors. During a DB blip, every legitimate login attempt burns rate-limit budget,
locking users out when the DB recovers.

**Change:** Remove `recordFailure` from the DB-error catch blocks. DB errors
return HTTP 503 with a generic body (not 401, which implies wrong credentials).

---

### FR-6: Gate `handleRegister` Behind Admin/Teacher Session

**Problem:** `register.ts` accepts unauthenticated self-signup. This violates
the spec: users are imported by admin and teachers only.

**Change:** At the top of `handleRegister`, call
`requireRole(db, token, "TEACHER")`. Unauthenticated or under-privileged
requests receive 401/403.

---

### FR-7: Add `revokeAllUserSessions` + Admin/Teacher Password Reset Endpoint

**Problem:** No way for admin/teacher to reset a student's password, and no
primitive to revoke all sessions after a password change.

**Changes:**

**(a)** Add `revokeAllUserSessions(db: Db, userId: string): Promise<{ revoked: number }>`
to `packages/auth/src/session.ts`. Deletes all session rows for `userId`.

**(b)** Add `POST /api/auth/reset-password` in `packages/api/src/routes/auth/`,
consuming:
```ts
{ userId: string, newPassword: string (min 8, max 128) }
```
Required session: TEACHER or ADMIN. A TEACHER may only reset passwords for
STUDENT users in their own school. An ADMIN may reset any STUDENT or TEACHER
password. Flow: validate session → load target user → check authorization →
`hashPassword(newPassword)` → update `accounts.password` where
`userId` + `providerId='credential'` → `revokeAllUserSessions` → audit event →
200.

---

### FR-8: Wire `ipAddress` and `userAgent` Into `createSession`

**Problem:** `sessions.ip_address` and `sessions.user_agent` columns exist but
are never populated.

**Change:** `createSession` accepts an optional third argument
`opts?: { ipAddress?: string; userAgent?: string }` and writes values to the
row. Callers in `handleLogin`, `handleRegister`, and `handleImpersonate` extract
these from `x-forwarded-for ?? x-real-ip` and `user-agent` request headers.

---

### FR-9: Audit Events for Login, Failed Login, and Password Reset

**Problem:** `recordAuditEvent` exists but login and password-reset routes emit
no audit events.

**Change:**
- `handleLogin` success: `action: "auth:login"`
- `handleLogin` wrong-password failure: `action: "auth:login_failed"`
- `handleResetPassword` success: `action: "auth:password_reset"` with
  `targetType: "user"`, `targetId: userId`

All are fire-and-forget (`.catch(() => {})`).

---

### FR-10: Cap Active Sessions Per User at 10

**Problem:** Expired and abandoned sessions accumulate indefinitely.

**Change:** In `createSession`, before inserting, count active sessions for
`userId`. If ≥ 10, delete the single oldest (by `createdAt`) session for that
user. Gives a rolling window of at most 10 concurrent sessions with passive
cleanup.

---

### FR-11: Gate Impersonation Behind Explicit Opt-In Env Var

**Problem:** `handleImpersonate` allows session minting in any environment where
`NODE_ENV !== "production"`. A misconfigured staging deploy would expose it.

**Change:** Require `process.env.IMPERSONATION_ENABLED === "true"` in addition
to `NODE_ENV !== "production"`. Default deny when the var is unset.

---

## Non-Functional Requirements

- All changed functions in `packages/auth/src/` maintain ≥ 80% test coverage.
- No breaking changes to the public `@reading-advantage/auth` API surface except:
  - `createSession` gains an optional third options parameter (backward-compatible).
  - New export: `revokeAllUserSessions`.
- SHA-256 hashing uses Node.js built-in `crypto` (no new dependency).
- The session-token migration is zero-downtime-capable: `token_hash` added
  alongside `token`; `token` column dropped in a follow-up migration.

## Acceptance Criteria

1. A DB read of `sessions.token_hash` reveals only irreversible hashes — no raw tokens.
2. An admin user with `schoolId = null` passes `assertTenantAccess` without error.
3. Login timing for unknown username vs wrong password is within 5 ms variance (Argon2id dummy hash dominates both paths).
4. `POST /api/auth/register` with no session returns 401.
5. `POST /api/auth/reset-password` by a TEACHER resets only a STUDENT in their own school; cross-school and cross-role attempts return 403.
6. After password reset, prior session tokens for the target user return null from `validateSession`.
7. `sessions.ip_address` and `sessions.user_agent` are non-null for all new login sessions.
8. Audit events exist for successful login, failed login, and password reset.
9. At most 10 active session rows exist per user at any moment.
10. `POST /api/auth/impersonate` returns 404 when `IMPERSONATION_ENABLED` is not `"true"`.
11. All existing tests in `packages/auth/src/__tests__/` continue to pass.

## Out of Scope

- OAuth / social login / email-based flows.
- CAPTCHA escalation (tracked in `rate_limiter_v2_20260603`).
- Postgres-backed per-IP rate limiting (tracked in `rate_limiter_v2_20260603`).
- Dropping the legacy `sessions.token` column (zero-downtime phase 2 — follow-up after all apps deploy with `token_hash`).
- Session sliding renewal / absolute-expiry policies (deferred).
- Self-service password change by a student.
