# Spec: Critical Security Fixes

## Overview
Address the most urgent security vulnerabilities in the bespoke auth system and API routes that could lead to data leaks, connection exhaustion, or unauthorized access. These are pre-production blockers.

## Functional Requirements

### FR-1: Consolidate PrismaClient singleton
- `lib/auth/session.ts` must import from `lib/prisma.ts` instead of instantiating its own `new PrismaClient()`
- Remove `setPrismaClient()` test helper; tests should mock `lib/prisma` instead
- The singleton in `lib/prisma.ts` must use the global pattern in ALL environments (currently skips production)

### FR-2: Make dev auth flag server-only
- Rename `NEXT_PUBLIC_DEV_AUTH` to `DEV_AUTH_ENABLED` (no `NEXT_PUBLIC_` prefix)
- Update `lib/env.ts` schema and all consumers (mastery-profile route, recommendations route)
- Ensure the flag is never exposed to client bundles
- Default behavior preserved: true in development, false in production

### FR-3: Separate session ID from token
- Session `id` field should use `cuid()` (auto-generated), not the secret token value
- Session `token` remains the cryptographic random value used for cookie lookup
- Update `createSession()` to stop setting `id: token`
- Update `setSessionCookie()` call in login route to pass `session.token` (not `session.id`)
- Update `validateSession()` - already looks up by `token`, should continue to do so

### FR-4: Add per-username login rate limiting
- Limit: 5 failed attempts per username per 15-minute window
- Successful logins reset the counter for that username
- Successful logins never count against the limit
- Return 429 with `Retry-After` header when limit exceeded
- In-memory store is acceptable for Phase 1 (Redis deferred to Track 3)
- Must NOT rate-limit by IP (schools share a single IP for 40+ students)

### FR-5: Add input length limits on login
- Username: max 100 characters
- Password: max 128 characters
- Reject with 400 before any database lookup or bcrypt call

### FR-6: Fix student analytics authorization bug
- `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` must verify the student is enrolled in the class before returning data
- A teacher owning a class should only see analytics for students enrolled in that class
- ADMIN role can still access any student/class combination

### FR-7: Add security headers
- Configure `next.config.ts` with headers:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production only)

## Non-Functional Requirements
- All changes must have >80% test coverage
- No breaking changes to the login flow UX
- Existing integration tests must continue to pass (updated as needed)

## Acceptance Criteria
- [ ] `lib/auth/session.ts` has zero `new PrismaClient()` calls
- [ ] `NEXT_PUBLIC_DEV_AUTH` string appears nowhere in the codebase
- [ ] Session table records have different values for `id` and `token`
- [ ] Login returns 429 after 5 failed attempts for same username within 15 min
- [ ] Login rejects username >100 chars or password >128 chars with 400
- [ ] Teacher cannot access analytics for a student not enrolled in their class
- [ ] Response headers include all specified security headers
- [ ] All existing tests pass

## Out of Scope
- Redis-backed rate limiting (Track: data_safety_20260206)
- Centralized auth middleware/wrappers (Track: auth_centralization_20260206)
- Soft deletes (Track: data_safety_20260206)
- CSRF tokens
- 2FA, password reset, account lockout
