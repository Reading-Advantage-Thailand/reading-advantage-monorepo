# Specification: Postgres-Backed Rate Limiter v2 (per-username + per-IP)

## Overview

Replace the in-memory `Map<string, RateLimitEntry>` in `packages/auth/src/rate-limit.ts:9` (used for login throttling) with a Postgres-backed implementation. Add per-IP rate limiting (30 attempts / 15 min) alongside the existing per-username limit (5 attempts / 15 min). Add a periodic cleanup job to prune old rows. Keep the in-memory `Map` as a development-only fast-path (gated by `NODE_ENV === 'development'`). Closes the AGENTS.md §4.5 violation ("no in-memory `Map<>` caches across requests") and §4.6 gap ("no per-IP throttling, no captcha escalation").

## Problem

Audited 2026-06-03. Findings F-403 (Medium) + F-407 (Low):

### F-403 — Login rate-limiter is an in-memory `Map`, not Postgres-backed
- `packages/auth/src/rate-limit.ts:9` — `const rateLimits = new Map<string, RateLimitEntry>();`.
- The same `Map` is mutated by `checkRateLimit` (read), `recordFailure` (write), `resetLimit` (delete) on lines 19, 49, 63. Process-local.
- **Multi-process impact**: in Vercel serverless, Cloud Run, K8s replicas, each process has its own `Map`. A brute-force attacker can spread their 5-attempt budget across N processes, multiplying the effective rate by N. Cold starts may reset the `Map`.
- AGENTS.md §4.5 calls out "no in-memory sessions, no `Map<>` caches across requests" — the rate-limiter `Map` is a parallel anti-pattern.

### F-407 — Rate limit window is 5 attempts / 15 min; no per-IP throttling, no captcha escalation
- `packages/auth/src/rate-limit.ts:6-7` — `WINDOW_MS = 15 * 60 * 1000` (15 min), `MAX_ATTEMPTS = 5`.
- `checkRateLimit(username)` takes only a `username` parameter — no IP, no user-agent, no captcha.
- **Credential stuffing**: an attacker can iterate over many usernames from the same IP without rate limiting (no per-IP throttle).
- **Username lockout**: a malicious actor can intentionally fail 5 logins for a victim's username to deny them access. No defense.

## Why

- AGENTS.md §4.5 + §4.6 have mandated durable, multi-dimensional rate limiting since the monorepo was scaffolded. This track is the implementation.
- A Postgres-backed implementation is durable across process restarts and consistent across replicas.
- Per-IP throttling closes the credential-stuffing vector.
- A captcha escalation (deferred to a follow-up) closes the username-lockout vector.

## Functional Requirements

### FR-1: `login_attempts` Table

Add `packages/db/src/schema/auth.ts`:

```ts
export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: text('identifier').notNull(),       // username OR IP, depending on `kind`
  kind: text('kind').$type<'username' | 'ip'>().notNull(),
  failedCount: integer('failed_count').notNull().default(0),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull().defaultNow(),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Composite primary index for the upsert pattern
  identifierKindIdx: uniqueIndex('login_attempts_identifier_kind_idx').on(t.identifier, t.kind),
  windowStartIdx: index('login_attempts_window_start_idx').on(t.windowStart),
}));
```

Add to `packages/db/src/schema/index.ts` barrel re-export.

### FR-2: Drizzle Migration

- Generate the Drizzle migration: `pnpm --filter @reading-advantage/db drizzle-kit generate`.
- Apply to `science_advantage_test` + production.
- The migration is reversible: drop the table.

### FR-3: `RateLimitStore` Postgres Implementation

Add `packages/auth/src/rate-limit-store.ts`:

```ts
export interface RateLimitConfig {
  windowMs: number;          // 15 * 60 * 1000
  maxAttempts: number;        // 5 for username, 30 for IP
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

export async function checkRateLimit(
  identifier: string,
  kind: 'username' | 'ip',
  config: RateLimitConfig
): Promise<RateLimitResult>;

export async function recordFailure(
  identifier: string,
  kind: 'username' | 'ip'
): Promise<void>;

export async function resetLimit(
  identifier: string,
  kind: 'username' | 'ip'
): Promise<void>;
```

Implementation: `SELECT ... FOR UPDATE` upsert pattern. Window resets if `lastAttemptAt < now() - windowMs`.

### FR-4: Refactor `packages/auth/src/rate-limit.ts`

- Replace the in-memory `Map` with calls to the new Postgres-backed store.
- Keep the same public API (`checkRateLimit`, `recordFailure`, `resetLimit`) for backward compatibility with `packages/api/src/routes/auth/login.ts`.
- **Dev-only fast-path**: if `process.env.NODE_ENV === 'development'` AND `process.env.RATE_LIMIT_INMEMORY_FASTPATH === 'true'`, use the in-memory `Map` for sub-millisecond responses. Default in dev: use the Postgres-backed store (mirrors prod).
- Add per-IP rate limit: a new exported function `checkRateLimitByIp(ip, config)` that calls the same store with `kind: 'ip'`.

### FR-5: Periodic Cleanup Job

- Add `packages/auth/src/rate-limit-cleanup.ts` (or `apps/science-advantage/lib/platform/rate-limit-cleanup.ts` — same pattern as `lib/platform/session-cleanup.ts`).
- Runs every 1 hour via the existing worker / cron infrastructure (or as a Node.js `setInterval` in the same process as the auth surface).
- Deletes rows where `windowStart < now() - 24 hours`.
- Idempotent.

### FR-6: Wire into Login Flow

- `packages/api/src/routes/auth/login.ts:36-132`:
  - Extract `ip` from the request (use a helper that respects `x-forwarded-for` and `x-real-ip` headers; falls back to the connection IP).
  - Before `verifyPassword`, call `checkRateLimit(username, 'username', { windowMs: 15*60*1000, maxAttempts: 5 })`. If denied, return 429.
  - Also call `checkRateLimit(ip, 'ip', { windowMs: 15*60*1000, maxAttempts: 30 })`. If denied, return 429.
  - On `verifyPassword` failure, call `recordFailure` for both `username` and `ip`.
  - On `verifyPassword` success, call `resetLimit` for both.
- Add tests for each scenario.

### FR-7: Captcha Trigger (Phase 1 — Hook Only)

- After 3 failed attempts (configurable), the login response includes a `captchaRequired: true` flag. The frontend (out of scope for this track) can render a captcha and submit the captcha token with the next login attempt.
- This track wires the flag; the actual captcha verification is a follow-up track.

## Non-Functional Requirements

- **Rate limit survives process restart** (Postgres-backed).
- **Per-IP throttle is independent of per-username**: a user on a shared IP (e.g. a school) is not affected by another user's failed logins, and vice versa.
- **Cleanup job does not block the auth path**: deletes happen async, with `LIMIT 1000` per batch to avoid long transactions.
- **Lint + type-check + build** green for `packages/auth`, `packages/db`, `packages/api`, and `apps/science-advantage`.

## Acceptance Criteria

1. `login_attempts` table exists in `packages/db/src/schema/auth.ts`.
2. Drizzle migration creates the table + indexes.
3. `checkRateLimit` / `recordFailure` / `resetLimit` are exported from `packages/auth/src/rate-limit-store.ts`.
4. `packages/auth/src/rate-limit.ts` uses the Postgres-backed store; the in-memory `Map` is only present behind `RATE_LIMIT_INMEMORY_FASTPATH='true'`.
5. Per-IP rate limit (30/15 min) is enforced alongside per-username (5/15 min).
6. Login flow at `packages/api/src/routes/auth/login.ts:36-132` calls both rate limiters.
7. Cleanup job runs every 1 hour; deletes rows where `windowStart < now() - 24 hours`.
8. Captcha trigger: after 3 failed attempts, login response includes `captchaRequired: true`.
9. Integration tests:
   - 6th failed login from same IP within 15 min returns 429.
   - 31st failed login from same IP (different usernames) within 15 min returns 429.
   - Successful login resets the per-username counter.
   - Captcha trigger fires after 3 failed attempts.
   - Cleanup job deletes old rows.
10. `pnpm turbo run test --filter=@reading-advantage/auth --filter=science-advantage` exits 0.
11. `pnpm turbo run build --filter=science-advantage` exits 0.

## Out of Scope

- A real captcha implementation (reCAPTCHA, hCaptcha, Turnstile) — separate track; this track wires the trigger.
- IP reputation lookups (AbuseIPDB, etc.) — out of scope.
- A "username lockout notification" — the user is informed via email when their account is locked; separate track.
- A bot-detection layer (Cloudflare Turnstile, etc.) — out of scope.
- Rate limiting for non-login endpoints (e.g. `/api/classes`, `/api/lessons`) — separate tracks; this track is login-specific.

## Constraints & Risks

- **Risk: The `SELECT ... FOR UPDATE` upsert pattern is a per-request DB roundtrip.** Mitigation: a single roundtrip is acceptable for the login path (low traffic, high stakes). Future optimization: Redis cache layer (Track 6's `packages/storage` doesn't cover this; a `packages/cache` package is a follow-up).
- **Risk: `x-forwarded-for` header can be spoofed.** Mitigation: trust the header only if the request comes from a known proxy (Vercel, Cloud Run); use a library like `request-ip` that respects the trust chain.
- **Risk: The captcha trigger adds complexity to the login response shape.** Mitigation: the trigger is a new field (`captchaRequired: true`); existing clients that ignore it continue to work.
- **Risk: A misconfigured `RATE_LIMIT_INMEMORY_FASTPATH=true` in production would re-introduce the F-403 vulnerability.** Mitigation: the dev-only fast-path is gated by `NODE_ENV === 'development'` AND the explicit env flag. Document in `packages/auth/README.md`.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 4 (F-403, F-407)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 10
- `packages/auth/src/rate-limit.ts:9` (the in-memory `Map` to replace)
- `packages/api/src/routes/auth/login.ts:36-132` (the login flow to wire)
- `lib/platform/session-cleanup.ts` (the template for the periodic cleanup job)
- AGENTS.md §4.5 ("no in-memory `Map<>` caches across requests") + §4.6 ("Rate limiting exists on login and other security-sensitive endpoints")
