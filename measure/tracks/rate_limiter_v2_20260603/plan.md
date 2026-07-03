# Plan: Postgres-Backed Rate Limiter v2 (per-username + per-IP)

> TDD-first. Each FR writes failing tests against the Postgres-backed store before the implementation.

## Phase 0: Setup

- [x] Task: Confirm `packages/db` migrations apply cleanly against `science_advantage_test`. *(confirmed — migration `0024_futuristic_vulture.sql` applied; auth test suite runs without schema errors)*
- [x] Task: Read `packages/auth/src/rate-limit.ts` and `packages/api/src/routes/auth/login.ts:36-132`; understand the current surface. *(done — see test-strategy §0 baseline table)*
- [x] Task: Coordinate with Track 4 (Audit Log) — failed-login events are audit-worthy; this track emits them as a side effect. *(de facto satisfied — `login.ts:155-168` already emits `auth:login_failed` / `auth:login`; verify the captcha change preserves the emit)*

## Phase 1: `login_attempts` Schema + Migration

> Regression/verification phase — FR-1 + FR-2 shipped at baseline (commit `076cda94`,
> migration `0024_futuristic_vulture.sql`). Only the schema-parity assertion is new.

- [x] Task: Add `loginAttempts` table to `packages/db/src/schema/auth.ts` (FR-1). *(shipped at baseline)*
- [x] Task: Add to `packages/db/src/schema/index.ts` barrel. *(shipped — `export * from "./auth.js"`)*
- [x] Task: Generate Drizzle migration: `pnpm --filter @reading-advantage/db drizzle-kit generate`. Inspect the generated SQL. *(shipped — `0024_futuristic_vulture.sql`)*
- [x] Task: Apply migration to `science_advantage_test`. Verify table + indexes. *(applied; auth test suite runs clean)*
- [~] Task: Add a schema test in `packages/db/src/__tests__/schema-parity.test.ts` asserting the columns + indexes exist. *(genuinely missing — see test-strategy §2 Phase 1)*
  - **Red-phase evidence (2026-07-03):** Added `loginAttempts — Track 10 Rate Limiter v2` block. Regression command passes:
    ```
    pnpm --filter @reading-advantage/db exec vitest run src/__tests__/schema-parity.test.ts
    # Test Files 1 passed (1) / Tests 90 passed (90)
    ```

## Phase 2: `RateLimitStore` Postgres Implementation

> Regression/verification phase — FR-3 shipped at baseline (`packages/auth/src/rate-limit-store.ts`).
> Existing tests `rate-limit-store.test.ts` (4) + `wave0-phase2-rate-limit-architecture.test.ts` (5) pass.

- [x] Task: Create `packages/auth/src/rate-limit-store.ts` with the 3 functions (FR-3). *(shipped — `createPostgresRateLimitStore` implements get/set/delete)*
- [x] Task: Implement with `SELECT ... FOR UPDATE` upsert pattern. *(shipped — `.for("update")` + `onConflictDoUpdate`)*
- [x] Task: Write failing tests: *(shipped + passing — these are regression guards, not TDD-Red, since the impl already exists; see test-strategy §0)*
  - Empty DB: `checkRateLimit('alice', 'username', { windowMs: 900_000, maxAttempts: 5 })` returns `{ allowed: true, remaining: 5, resetAt: now + 15min }`.
  - 4 failures recorded: 5th attempt returns `{ allowed: true, remaining: 0 }`; 6th returns `{ allowed: false, retryAfterMs: <windowMs - elapsed> }`.
  - Successful login (`resetLimit`): counter resets to 0.
  - Window reset: simulate `lastAttemptAt` older than `windowMs`; the next attempt is allowed.
  - Per-IP and per-username are independent: 5 failures for `alice` does not block 5 failures for `bob`; 30 failures for IP `1.2.3.4` does not block 30 failures for IP `5.6.7.8`.
- [x] Task: Implement. Confirm tests pass. *(confirmed — 17 rate-limit tests green)*

> **Note (CR-1):** the shipped API is `checkRateLimit(username, ip?)`, NOT the
> spec's proposed `checkRateLimit(identifier, kind, config)`. Tests must exercise
> the shipped contract. See test-strategy §0 "Changed-contract risk."

## Phase 3: Refactor `packages/auth/src/rate-limit.ts`

> Regression/verification phase — shipped at baseline. `rate-limit.test.ts` (8 tests) passes.

- [x] Task: Replace the in-memory `Map` with calls to the new Postgres-backed store. *(shipped — `configurePostgresRateLimiter` is the production default)*
- [x] Task: Keep the same public API (`checkRateLimit`, `recordFailure`, `resetLimit`) for backward compatibility. *(shipped — signatures are `checkRateLimit(username, ip?)`, etc.)*
- [x] Task: **Dev-only fast-path**: if `NODE_ENV === 'development'` AND `RATE_LIMIT_INMEMORY_FASTPATH === 'true'`, use the in-memory `Map`. Default: Postgres-backed. *(shipped — `isInMemoryFastPathEnabled()` dual gate)*
- [x] Task: Add per-IP rate limit: `checkRateLimitByIp(ip, config)` that calls the same store with `kind: 'ip'`. *(shipped differently — IP is folded into `checkRateLimit(username, ip?)`; see CR-1. A standalone `checkRateLimitByIp` export does NOT exist — resolve in Phase 6.)*
- [x] Task: Write failing test: `checkRateLimit` with a Postgres backend uses the new store; with the dev fast-path flag set, uses the in-memory `Map`. *(shipped — `rate-limit.test.ts` covers the in-memory path; the dual-gate fast-path assertion is a gap — see test-strategy §2 Phase 3 closeout gate)*
- [x] Task: Confirm tests pass; existing `packages/auth` test suite still passes. *(confirmed — 8/8 rate-limit tests green)*

## Phase 4: Periodic Cleanup Job

- [~] Task: Create `packages/auth/src/rate-limit-cleanup.ts` (or `apps/science-advantage/lib/platform/rate-limit-cleanup.ts` — same pattern as `lib/platform/session-cleanup.ts`).
  - **Red-phase evidence (2026-07-03):** Unit test `packages/auth/src/__tests__/rate-limit-cleanup.test.ts` created. RED command fails because the module does not exist:
    ```
    pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit-cleanup.test.ts
    # Error: Cannot find module '../rate-limit-cleanup.js'
    ```
- [~] Task: Implement `cleanupOldAttempts(): Promise<{ deleted: number }>` that deletes rows where `windowStart < now() - 24 hours`, with `LIMIT 1000` per batch.
  - **Red-phase evidence:** Same as above; the function is imported by the new unit test and resolves once `rate-limit-cleanup.ts` is implemented.
- [~] Task: Schedule the job: `setInterval(cleanupOldAttempts, 60 * 60 * 1000)` (1 hour). Started by `instrumentation.node.ts` (Track 9 prerequisite; for now, a top-level `setInterval` in `lib/platform/rate-limit-cleanup.ts`).
  - **Red-phase evidence:** Same as above; `createRateLimitCleanupJob` is imported by the new unit test.
- [~] Task: Write failing test: insert 100 rows with `windowStart` = 25 hours ago; call `cleanupOldAttempts`; assert 100 rows deleted.
  - **Red-phase evidence:** Same as above; the unit test includes this scenario against a mock privileged DB.
- [~] Task: Confirm.
  - **Red-phase evidence:** Confirmed RED (module missing) — see command output above.

## Phase 5: Wire into Login Flow

> Login wiring (IP extract, both limiters, record/reset, 429) shipped at baseline.
> Captcha trigger (FR-7) + integration tests (FR-9) are genuinely Red.

- [x] Task: In `packages/api/src/routes/auth/login.ts:36-132`: *(wiring shipped at baseline)*
  - Extract `ip` using a helper (use `request.headers.get('x-forwarded-for')` with fallback to `request.headers.get('x-real-ip')` and finally `'0.0.0.0'`). *(shipped — `login.ts:62-65`)*
  - Add per-username rate limit check at the top: `const usernameResult = await checkRateLimit(username, 'username', { windowMs: 900_000, maxAttempts: 5 })`. If `!usernameResult.allowed`, return 429 with `Retry-After` header. *(shipped — `login.ts:68-77`; note: uses shipped signature `checkRateLimit(username, ip?)` not the spec's 3-arg form — CR-1)*
  - Add per-IP rate limit check: `const ipResult = await checkRateLimit(ip, 'ip', { windowMs: 900_000, maxAttempts: 30 })`. If `!ipResult.allowed`, return 429. *(shipped — folded into the single `checkRateLimit(username, ip)` call)*
  - On `verifyPassword` failure: `await recordFailure(username, 'username'); await recordFailure(ip, 'ip')`. *(shipped — `recordFailure(lowerUsername, clientIp)` at lines 101, 134, 147, 164)*
  - On `verifyPassword` success: `await resetLimit(username, 'username'); await resetLimit(ip, 'ip')`. *(shipped — `resetLimit(lowerUsername, clientIp)` at line 180)*
  - **Captcha trigger** (FR-7): after 3 failed attempts (`failedCount >= 3`), set `captchaRequired: true` in the response. The next login attempt must include a `captchaToken` (out of scope; the helper accepts it but does not verify it). *(❌ NOT shipped — `captchaRequired` absent from `login.ts`; genuine Red — see test-strategy §2 Phase 5)*
- [~] Task: Write failing integration tests: *(genuinely missing — see test-strategy §2 Phase 5)*
  - 6 failed logins (same username, same IP) within 15 min → 6th returns 429.
  - 31 failed logins (31 distinct usernames, same IP) within 15 min → 31st returns 429.
  - Successful login after 4 failures → counter resets to 0; 5th attempt is allowed.
  - 4th failed login (counter = 3) returns `captchaRequired: true` in the response.
  - **Red-phase evidence (2026-07-03):**
    - Unit captcha test `packages/auth/src/__tests__/rate-limit-captcha.test.ts` created. RED command shows `captchaRequired` is undefined:
      ```
      pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit-captcha.test.ts
      # FAIL: requires captcha after 3 failures — expected undefined to be true
      ```
    - Integration test `apps/science-advantage/src/__tests__/rate-limit-login.integration.test.ts` created.
      Local run blocked by `drizzle-kit migrate` infra failure against `science_advantage_test`
      (global setup exits status 1 before tests collect); the file is ready to run once the
      test-DB migration path is restored.
- [~] Task: Confirm.
  - **Red-phase evidence:** Captcha unit test is RED for the expected reason (`captchaRequired` missing). Integration test is authored and will fail on the captcha assertion once migration infra is green.

## Phase 6: Update `packages/auth` Exports

- [x] Task: Re-export `checkRateLimitByIp`, `RateLimitConfig`, `RateLimitResult` from `packages/auth/src/index.ts`. *(partially shipped — `RateLimitConfig`, `RateLimitStore`, `DEFAULT_IP_RATE_LIMIT_CONFIG` are exported; `checkRateLimitByIp` is NOT, because the shipped API folds IP into `checkRateLimit(username, ip?)`. Resolve CR-1: either add the wrapper export or retire the spec name.)*
- [~] Task: Update `packages/auth/README.md` with the new API + the dev fast-path flag. *(❌ NOT shipped — `RATE_LIMIT_INMEMORY_FASTPATH` absent from README; genuine Red doc test — see test-strategy §2 Phase 6)*
  - **Red-phase evidence (2026-07-03):** Doc test `packages/auth/src/__tests__/rate-limit-readme.test.ts` created. RED command fails because README does not mention the rate-limiter env flag, per-IP limits, or Postgres-as-default:
    ```
    pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit-readme.test.ts
    # FAIL: README names the RATE_LIMIT_INMEMORY_FASTPATH env var
    # FAIL: README documents per-IP rate limiting
    # FAIL: README documents Postgres as the production default
    ```
- [x] Task: Update `packages/auth/src/rate-limit.ts` JSDoc to mark the in-memory `Map` as "dev-only fast-path; production uses Postgres-backed store." *(shipped — `rate-limit.ts:79-86`)*

## Phase 7: 6-App Smoke Test

- [~] Task: For each of the 6 apps (reading, primary, www-reading, codecamp, advantage-games, science): run the login integration test; confirm 6 failed logins trigger 429.
- [~] Task: Document the cross-app impact in a lessons-learned entry.

## Phase 8: Final Acceptance

> **Intentionally-red aggregate (IR-1):** `pnpm turbo run test --filter=@reading-advantage/auth`
> is currently RED because of `src/__tests__/phase-7-closeout.test.ts` (tech-debt.md
> 51 > 50 lines) — that failure belongs to track `audit_log_retention_dsar_20260605`,
> NOT this track. Do NOT "fix" it here. Scope the real Green check to rate-limit
> files (see test-strategy §2 Phase 8).

- [~] Task: `pnpm turbo run test --filter=@reading-advantage/auth --filter=@reading-advantage/db --filter=science-advantage` exits 0. *(blocked by IR-1 for the auth slice; the rate-limit-scoped command in test-strategy §5 must exit 0)*
- [~] Task: `pnpm turbo run build --filter=science-advantage` exits 0.
- [~] Task: Grep gate: `rg "new Map" packages/auth/src/rate-limit.ts` returns exactly 1 hit (the dev fast-path `inMemoryStore`, dual-gated). *(file-scoped — A7 defense)*
- [~] Task: All 6 apps' integration tests pass (or are `[b] deferred:<owner>` per Phase 7).

## Phase 9: Closeout

- [~] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to mark F-403, F-407 `Resolved`. *(A6 defense: only after Phase 5 integration tests are green — "resolved" requires the adversarial test to pass)*
- [~] Task: Add a lessons-learned entry: "In-memory `Map` is the wrong default for security state; Postgres-backed is one roundtrip more, but correctness is non-negotiable for rate limiting."
- [~] Task: Add a follow-up track placeholder in `measure/tracks.md` under Pending Tracks: "Captcha Verification (reCAPTCHA/hCaptcha/Turnstile integration)."
- [~] Task: Move track to `measure/archive/rate_limiter_v2_20260603/` and update `measure/tracks.md`. *(A13 defense: remove `measure/tracks/rate_limiter_v2_20260603/` after the archive copy is verified — no stale dir left behind; A9 defense: no test references the pre-archive path)*
