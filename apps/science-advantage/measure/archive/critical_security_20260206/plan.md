# Implementation Plan: Critical Security Fixes

## Phase 1: PrismaClient Consolidation & Session ID Separation [checkpoint: 0c82a64]

- [x] Task: Fix PrismaClient singleton in lib/prisma.ts 7c9fa77
    - [x] Write unit tests verifying singleton is used in all environments
    - [x] Update `lib/prisma.ts` to use global pattern in production (remove `NODE_ENV` guard)
    - [x] Verify test passes

- [x] Task: Remove duplicate PrismaClient from session.ts 37de871
    - [x] Write tests for `createSession`, `validateSession`, `deleteSession` using mocked `lib/prisma`
    - [x] Replace `new PrismaClient()` in `lib/auth/session.ts` with import from `lib/prisma`
    - [x] Remove `setPrismaClient()` function and `let prismaClient` variable
    - [x] Update existing `lib/auth/session.test.ts` to mock `lib/prisma` instead of using `setPrismaClient()`

- [x] Task: Separate session ID from token abe7ccd
    - [x] Write tests asserting `session.id !== session.token` after creation
    - [x] Update Prisma schema: add `@default(cuid())` to `session.id`
    - [x] Update `createSession()` to omit `id` field (let Prisma auto-generate) and keep `token` as the random value
    - [x] Update login route to call `setSessionCookie(session.token)` instead of `setSessionCookie(session.id)`
    - [x] Update session API route to exclude both `id` and `token` from response
    - [x] Run `npx prisma generate` and verify all tests pass
    - [x] Create migration for existing data (backfill `id` with cuid where `id === token`)

- [x] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) 0c82a64

## Phase 2: Dev Auth Flag & Input Validation [checkpoint: b937052]

- [x] Task: Rename NEXT_PUBLIC_DEV_AUTH to server-only 5902edc
    - [x] Write test verifying `DEV_AUTH_ENABLED` is not in any `NEXT_PUBLIC_` env schema
    - [x] Rename in `lib/env.ts`: change schema key and transformation logic
    - [x] Update `app/api/students/[studentId]/mastery-profile/route.ts` to use `env.DEV_AUTH_ENABLED`
    - [x] Update `app/api/ai/recommendations/route.ts` to use `env.DEV_AUTH_ENABLED`
    - [x] Update `.env.example` with new variable name
    - [x] Update integration tests that reference the old name
    - [x] Verify no `NEXT_PUBLIC_DEV_AUTH` string remains in codebase

- [x] Task: Add input length limits on login 0d815fe
    - [x] Write tests: reject username >100 chars with 400, reject password >128 chars with 400
    - [x] Write test: normal-length credentials still work
    - [x] Add Zod schema validation in `app/api/auth/login/route.ts` with `z.string().max(100)` for username and `z.string().max(128)` for password
    - [x] Return 400 with descriptive error before any DB/bcrypt call

- [x] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) b937052

## Phase 3: Login Rate Limiting [checkpoint: 5df9cb0]

- [x] Task: Create per-username rate limiter module ec18192
    - [x] Write unit tests for rate limiter: allows 5 attempts, blocks 6th, resets after window, reset on success
    - [x] Create `lib/auth/rate-limit.ts` with `LoginRateLimiter` class
    - [x] Implement in-memory Map store with username key, failed count, and window expiry
    - [x] Methods: `checkLimit(username)`, `recordFailure(username)`, `recordSuccess(username)`
    - [x] `checkLimit` throws/returns error with retryAfter when limit exceeded

- [x] Task: Integrate rate limiter into login route 316515e
    - [x] Write integration tests: 5 failed logins then 429 response, successful login resets counter
    - [x] Import rate limiter in `app/api/auth/login/route.ts`
    - [x] Call `checkLimit(username)` before DB lookup
    - [x] Call `recordFailure(username)` on invalid credentials
    - [x] Call `recordSuccess(username)` on successful login
    - [x] Return 429 with `Retry-After` header on rate limit exceeded

- [x] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) 5df9cb0

## Phase 4: Authorization Bug Fix & Security Headers [checkpoint: 4a9c9bb]

- [x] Task: Fix student analytics authorization aee49cf
    - [x] Write test: teacher of classA cannot access analytics for student NOT enrolled in classA (expect 403)
    - [x] Write test: teacher of classA CAN access analytics for student enrolled in classA (expect 200)
    - [x] Write test: ADMIN can access any student/class combination (expect 200)
    - [x] Update `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` to verify student enrollment in class
    - [x] Verify all tests pass

- [x] Task: Add security headers to next.config.ts 01a2a62
    - [x] Write test or verification script confirming headers are present in responses
    - [x] Add `headers()` config to `next.config.ts` with X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security
    - [x] Verify headers appear in dev server responses

- [x] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) 4a9c9bb
