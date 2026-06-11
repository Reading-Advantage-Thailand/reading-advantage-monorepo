# Specification: Auth Security Hardening

## Overview

Close the security and correctness gaps identified in the June 2026 audit of
`packages/auth` and its consuming routes in `packages/api/src/routes/auth/`.
All changes are scoped to the existing username/password-only flow. No OAuth,
email verification, or new auth methods are introduced.

**Appended 2026-06-11:** FR-12 through FR-16 cover the follow-up audit of
`packages/auth-client` (the React provider/hooks consumed by all four apps).
FR-16 also resolves the interaction between FR-6 (gated registration) and the
auth-client `register()` action / reading-advantage signup form that FR-6
would otherwise silently break.

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

### FR-12: Login Response Must Satisfy the `AuthUser` Contract

**Problem:** `auth-client`'s `AuthUser` type declares `xp: number`,
`level: number`, `cefrLevel: string` as required. The session endpoint enriches
the user with these fields (`session.ts:41-56`), but `handleLogin` returns only
`{ id, username, name, role, schoolId }`. The provider hides the mismatch with
an `as AuthUser` cast (`provider.tsx:72,97`). In apps that SPA-navigate after
login (science-advantage, primary-advantage use `router.push`), every consumer
reading these fields gets `undefined` until a hard reload — e.g.
primary-advantage `la-question-content.tsx:91` computes
`(user?.level as number) * 30` → `NaN`, breaking its zod validation.

**Change:**
- Extract the user-enrichment query from `handleSession` into a shared helper
  `enrichAuthUser(db, user)` in `packages/api/src/routes/auth/enrich.ts`
  returning the full `AuthUser` shape.
- `handleSession` and `handleLogin` both use it; the login response body's
  `user` matches `AuthUser` exactly.
- `provider.tsx` removes the `as AuthUser` casts; the login state is set from
  the now-complete response.

---

### FR-13: Eliminate Mount-Session-Check / Login Race in `AuthProvider`

**Problem:** The mount effect's `cancelled` flag (`provider.tsx:24-56`) only
guards unmount. If the initial `/api/auth/session` response (fetched pre-login,
`session: null`) resolves *after* a fast `login()` has set authenticated state,
it overwrites it back to logged-out even though the session cookie is set.

**Change:** Track in a ref whether any auth action (login/logout) has completed;
the mount session-check discards its result if so.

---

### FR-14: `logout` Must Surface Server Failure

**Problem:** `provider.tsx:103-115` ignores the logout response status and
swallows network errors, then unconditionally clears local state. If the
endpoint fails, the server session and cookie survive — the UI shows
logged-out, but the next mount silently logs the user back in. On shared
school computers this is a security-relevant inconsistency.

**Change:** `logout` still clears local state regardless (defense in depth),
but when the request fails (network error or `!res.ok`) it throws
`Error("Logout may not have completed on the server")` so the UI can warn.

---

### FR-15: Consistent Auth State Derivation + Package Hygiene

**Problems:**
- `provider.tsx:36-37` sets `user: data.session?.user ?? null` but
  `isAuthenticated: !!data.session` — a `{ session: {} }` body yields
  `isAuthenticated: true` with `user: null`.
- `package.json` lists `react` in both `dependencies` and `peerDependencies`
  (risk of duplicate React copies outside pnpm dedupe).
- `zod` is declared as a dependency but never imported.

**Changes:** Derive both `user` and `isAuthenticated` from
`data.session?.user`. Move `react` to `peerDependencies` + `devDependencies`
only. Remove `zod`.

---

### FR-16: Align `register` Flow With FR-6 (Gated Registration)

**Problem:** FR-6 gates `handleRegister` behind a TEACHER/ADMIN session, but:
- `handleRegister` sets the *created* user's session cookie — under FR-6 this
  would replace the teacher's own session with the new student's.
- auth-client's `register()` action sets the created user as the logged-in
  user, encoding the old self-signup model.
- reading-advantage's `user-signup-form.tsx:41` (the only `register()`
  consumer) is a public self-signup form that would start failing with 401.

**Changes:**
- `handleRegister` no longer creates a session or sets the cookie; returns
  `201` with the created user.
- Remove `register` from `AuthActions` and from `AuthProvider` (the gated
  endpoint is an admin operation, not an auth-state transition).
- Remove the reading-advantage self-signup form and its route/page; the signup
  entry point directs users to their teacher (matching the product spec that
  users are imported by admin and teachers only).

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
12. The `POST /api/auth/login` response body's `user` object contains non-null
    `xp`, `level`, and `cefrLevel`; `provider.tsx` contains no `as AuthUser` cast.
13. A mount session-check response that resolves after a completed `login()`
    does not overwrite the authenticated state.
14. A failed logout request rejects the `logout()` promise while still clearing
    local auth state.
15. A `{ session: {} }` session response yields `isAuthenticated: false`.
16. `packages/auth-client/package.json` has no `zod` dependency and lists
    `react` only as a peer + dev dependency; `dist/index.js` still begins with
    `"use client"`.
17. `register` is no longer exported from `@reading-advantage/auth-client`, and
    no app references the removed self-signup form.

## Out of Scope

- OAuth / social login / email-based flows.
- CAPTCHA escalation (tracked in `rate_limiter_v2_20260603`).
- Postgres-backed per-IP rate limiting (tracked in `rate_limiter_v2_20260603`).
- Dropping the legacy `sessions.token` column (zero-downtime phase 2 — follow-up after all apps deploy with `token_hash`).
- Session sliding renewal / absolute-expiry policies (deferred).
- Self-service password change by a student.
- An admin/teacher UI for creating users (the consumer of the now-gated
  register endpoint) — separate feature track.
- `useRequireAuth` redesign (throws a plain `Error` during render instead of
  redirecting). No app currently consumes it; revisit before first adoption.
