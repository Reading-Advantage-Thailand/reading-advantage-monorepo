# Plan: Postgres-Backed Rate Limiter v2 (per-username + per-IP)

> TDD-first. Each FR writes failing tests against the Postgres-backed store before the implementation.

## Phase 0: Setup

- [~] Task: Confirm `packages/db` migrations apply cleanly against `science_advantage_test`.
- [~] Task: Read `packages/auth/src/rate-limit.ts` and `packages/api/src/routes/auth/login.ts:36-132`; understand the current surface.
- [~] Task: Coordinate with Track 4 (Audit Log) — failed-login events are audit-worthy; this track emits them as a side effect.

## Phase 1: `login_attempts` Schema + Migration

- [~] Task: Add `loginAttempts` table to `packages/db/src/schema/auth.ts` (FR-1).
- [~] Task: Add to `packages/db/src/schema/index.ts` barrel.
- [~] Task: Generate Drizzle migration: `pnpm --filter @reading-advantage/db drizzle-kit generate`. Inspect the generated SQL.
- [~] Task: Apply migration to `science_advantage_test`. Verify table + indexes.
- [~] Task: Add a schema test in `packages/db/src/__tests__/schema-parity.test.ts` asserting the columns + indexes exist.

## Phase 2: `RateLimitStore` Postgres Implementation

- [~] Task: Create `packages/auth/src/rate-limit-store.ts` with the 3 functions (FR-3).
- [~] Task: Implement with `SELECT ... FOR UPDATE` upsert pattern.
- [~] Task: Write failing tests:
  - Empty DB: `checkRateLimit('alice', 'username', { windowMs: 900_000, maxAttempts: 5 })` returns `{ allowed: true, remaining: 5, resetAt: now + 15min }`.
  - 4 failures recorded: 5th attempt returns `{ allowed: true, remaining: 0 }`; 6th returns `{ allowed: false, retryAfterMs: <windowMs - elapsed> }`.
  - Successful login (`resetLimit`): counter resets to 0.
  - Window reset: simulate `lastAttemptAt` older than `windowMs`; the next attempt is allowed.
  - Per-IP and per-username are independent: 5 failures for `alice` does not block 5 failures for `bob`; 30 failures for IP `1.2.3.4` does not block 30 failures for IP `5.6.7.8`.
- [~] Task: Implement. Confirm tests pass.

## Phase 3: Refactor `packages/auth/src/rate-limit.ts`

- [~] Task: Replace the in-memory `Map` with calls to the new Postgres-backed store.
- [~] Task: Keep the same public API (`checkRateLimit`, `recordFailure`, `resetLimit`) for backward compatibility.
- [~] Task: **Dev-only fast-path**: if `NODE_ENV === 'development'` AND `RATE_LIMIT_INMEMORY_FASTPATH === 'true'`, use the in-memory `Map`. Default: Postgres-backed.
- [~] Task: Add per-IP rate limit: `checkRateLimitByIp(ip, config)` that calls the same store with `kind: 'ip'`.
- [~] Task: Write failing test: `checkRateLimit` with a Postgres backend uses the new store; with the dev fast-path flag set, uses the in-memory `Map`.
- [~] Task: Confirm tests pass; existing `packages/auth` test suite still passes.

## Phase 4: Periodic Cleanup Job

- [~] Task: Create `packages/auth/src/rate-limit-cleanup.ts` (or `apps/science-advantage/lib/platform/rate-limit-cleanup.ts` — same pattern as `lib/platform/session-cleanup.ts`).
- [~] Task: Implement `cleanupOldAttempts(): Promise<{ deleted: number }>` that deletes rows where `windowStart < now() - 24 hours`, with `LIMIT 1000` per batch.
- [~] Task: Schedule the job: `setInterval(cleanupOldAttempts, 60 * 60 * 1000)` (1 hour). Started by `instrumentation.node.ts` (Track 9 prerequisite; for now, a top-level `setInterval` in `lib/platform/rate-limit-cleanup.ts`).
- [~] Task: Write failing test: insert 100 rows with `windowStart` = 25 hours ago; call `cleanupOldAttempts`; assert 100 rows deleted.
- [~] Task: Confirm.

## Phase 5: Wire into Login Flow

- [~] Task: In `packages/api/src/routes/auth/login.ts:36-132`:
  - Extract `ip` using a helper (use `request.headers.get('x-forwarded-for')` with fallback to `request.headers.get('x-real-ip')` and finally `'0.0.0.0'`).
  - Add per-username rate limit check at the top: `const usernameResult = await checkRateLimit(username, 'username', { windowMs: 900_000, maxAttempts: 5 })`. If `!usernameResult.allowed`, return 429 with `Retry-After` header.
  - Add per-IP rate limit check: `const ipResult = await checkRateLimit(ip, 'ip', { windowMs: 900_000, maxAttempts: 30 })`. If `!ipResult.allowed`, return 429.
  - On `verifyPassword` failure: `await recordFailure(username, 'username'); await recordFailure(ip, 'ip')`.
  - On `verifyPassword` success: `await resetLimit(username, 'username'); await resetLimit(ip, 'ip')`.
  - **Captcha trigger** (FR-7): after 3 failed attempts (`failedCount >= 3`), set `captchaRequired: true` in the response. The next login attempt must include a `captchaToken` (out of scope; the helper accepts it but does not verify it).
- [~] Task: Write failing integration tests:
  - 6 failed logins from same IP for same username → 6th returns 429 with `Retry-After`.
  - 31 failed logins from same IP for 31 different usernames → 31st returns 429.
  - Successful login after 4 failures → counter resets to 0; 5th attempt is allowed.
  - 4th failed login (counter = 3) returns `captchaRequired: true` in the response.
- [~] Task: Confirm.

## Phase 6: Update `packages/auth` Exports

- [~] Task: Re-export `checkRateLimitByIp`, `RateLimitConfig`, `RateLimitResult` from `packages/auth/src/index.ts`.
- [~] Task: Update `packages/auth/README.md` with the new API + the dev fast-path flag.
- [~] Task: Update `packages/auth/src/rate-limit.ts` JSDoc to mark the in-memory `Map` as "dev-only fast-path; production uses Postgres-backed store."

## Phase 7: 6-App Smoke Test

- [~] Task: For each of the 6 apps (reading, primary, www-reading, codecamp, advantage-games, science): run the login integration test; confirm 6 failed logins trigger 429.
- [~] Task: Document the cross-app impact in a lessons-learned entry.

## Phase 8: Final Acceptance

- [~] Task: `pnpm turbo run test --filter=@reading-advantage/auth --filter=@reading-advantage/db --filter=science-advantage` exits 0.
- [~] Task: `pnpm turbo run build --filter=science-advantage` exits 0.
- [~] Task: Grep gate: `rg "new Map" packages/auth/src/rate-limit.ts` returns 0 hits (or only the dev fast-path with a comment).
- [~] Task: All 6 apps' integration tests pass.

## Phase 9: Closeout

- [~] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to mark F-403, F-407 `Resolved`.
- [~] Task: Add a lessons-learned entry: "In-memory `Map` is the wrong default for security state; Postgres-backed is one roundtrip more, but correctness is non-negotiable for rate limiting."
- [~] Task: Add a follow-up track placeholder in `measure/tracks.md` under Pending Tracks: "Captcha Verification (reCAPTCHA/hCaptcha/Turnstile integration)."
- [~] Task: Move track to `measure/archive/rate_limiter_v2_20260603/` and update `measure/tracks.md`.
