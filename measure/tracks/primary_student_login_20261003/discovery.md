# Discovery — Primary Student Login (Phase 0)

Paths are relative to the repo root. Line numbers refer to this branch.

## Current student flow
- `apps/primary-advantage/components/auth/student-signin-form.tsx:83-94` sends the class code to `fetchStudentsByClassCode` (`actions/classroom.ts:11`, calls `getClassroomStudentForLogin` in `server/models/classroomModel.ts`). The list holds `studentName` and `studentEmail` (PII before sign-in).
- `student-signin-form.tsx:96-107` POSTs `/api/auth/login` with `{username: studentEmail, password: classCode}`. The shared handler has no class-code path. Lane B replaces this flow.
- The form also reads `?classroom_code=` (line 41) and signs in from a link. No rate limit exists on the code lookup.
- Teacher code: `app/api/classroom/[id]/generate-code/route.ts` writes `classrooms.class_code`. This is a long-lived code, not a teacher-started session.

## Auth routes
- `app/api/auth/login/route.ts:2` is `createLoginHandler({legacyUsersPasswordFallback: true})` from `packages/api/src/routes/auth/login.ts:86`.
- Login: lower-cases the username (login.ts:104), checks per-username and per-IP limits (112), verifies argon2id with a dummy hash for unknown users (37, 149), writes audit events, and calls `createSession` (267). Cookie `session_token`: HttpOnly, SameSite=Lax, 7 days (45-51).
- Other routes: `logout`, `session`, `register`, `reset-password`, `impersonate` in `app/api/auth/*`. Client IP: `packages/api/src/routes/auth/client-ip.ts`.

## Session, proxy, policy
- `packages/auth/src/session.ts:34` `createSession(db, userId, {ipAddress, userAgent})`: random 32-byte token, SHA-256 hash stored, 7-day expiry, 10-session cap per user (line 58). No `expiresAt` or idle option.
- `validateSession` (line 151) returns `{id, userId, expiresAt, user}`. No idle tracking and no strength field. `sessions` table: `packages/db/src/schema/users.ts:78`.
- `apps/primary-advantage/lib/session.ts:5-14` returns only `session.user`. The session id and expiry are not exposed.
- `proxy.ts:17-34` redirects signed-in users away from signin. `proxy.ts:37-58` enforces `protectedRoutes`.
- `lib/route-policies.ts:12-20`: `/student` is STUDENT only. Policy is role-based. `/api` is outside the proxy matcher (proxy.ts:74).

## `@reading-advantage/auth` offers
- Password: `hashPassword`, `verifyPassword` (argon2id, `password.ts`), `rehashOnLogin`.
- Rate limit: `checkRateLimit(username, ip?)`, `checkRateLimitByIp`, `consumeRateLimit`, `recordFailure`, `resetLimit`; Postgres store via `configurePostgresRateLimiter(db)`. Defaults: 5 per 15 min per key, 30 per 15 min per IP (`rate-limit.ts:99-109`). Keys are free text, so keys such as `class:<id>` work.
- Audit: `recordAuditEvent(ctx, payload)` (`audit.ts:75`); it strips PII and token keys from metadata.
- Sessions: `createSession`, `validateSession`, `deleteSession`, `revokeAllUserSessions`.
- Not offered: lockout timers per credential, short expiry, idle expiry, auth strength, one-login-per-device.

## Design decisions for Phase 1-2
- Contracts and logic: `packages/domain/src/student-login/` (`contracts.ts` now; `class-session.ts`, `picture-password.ts`, `card-token.ts` in Phase 2). Export as `studentLogin` in `packages/domain/src/index.ts`.
- Tables: `primary_class_login_sessions` and `primary_student_credentials` in `packages/db/src/schema/primary.ts`. Both carry `school_id`, so both are FLAT in `tenant-registry.ts`. Migration `0062_primary_student_login`.
- Hashes: the class code hash and the card token hash use SHA-256 (codes and tokens are high-entropy or rate-limited; this matches the `sessions.token_hash` style). The picture password hash uses argon2id via `hashPassword`.
- `authStrength`: nullable `auth_strength` text column on `sessions` (NULL means `full`). `createSession` gets an optional `authStrength`; `validateSession` returns it as `full` or `code_only`.
- Policy helper: `apps/primary-advantage/lib/auth-strength.ts` (`requiresFullAuth`, `canUseFullAuthFeature`). `lib/session.ts` gains a `currentSession` reader later. Reedy wiring belongs to Lane F.
- Route handlers: thin files in `apps/primary-advantage/app/api/auth/student/*` that call domain functions. The shared `/api/auth/login` stays unchanged for username/password.
- Rate limits (Phase 2): reuse `consumeRateLimit`/`checkRateLimit` with keys `student-code-ip:<ip>` and `student-code-class:<classId>`. Picture-password lockout lives in the credentials row (5 tries, 5 minutes).
- Audit (Phase 2): `recordAuditEvent` with actions `student_login:class_start`, `class_end`, `lockout`, `reset`, `card_rotate`.
- Phase 2 gaps to solve there: student session expiry (end of day Asia/Bangkok, 30 min idle) and one session per student need an `expiresAt` option on `createSession` and a revoke call before create.
