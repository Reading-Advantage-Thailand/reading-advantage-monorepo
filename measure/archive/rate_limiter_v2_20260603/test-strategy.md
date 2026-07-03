# Test Strategy: Postgres-Backed Rate Limiter v2 (per-username + per-IP)

> Track: `rate_limiter_v2_20260603` · Baseline SHA: `1daadf0b`
> Owner: `measure-strategy` · Audience: `measure-mid-red`, `measure-jr-green`, `measure-phase-acceptance`

## 0. Headline finding — read this before any Red work

**Most of the spec is already implemented at the baseline SHA.** A prior track
(`wave0_shared_safety_foundations_20260628`, commit `076cda94`) shipped:

| FR | Status at baseline | Evidence |
|----|--------------------|----------|
| FR-1 `login_attempts` table | ✅ shipped | `packages/db/src/schema/auth.ts:11` |
| FR-2 Drizzle migration | ✅ shipped | `packages/db/drizzle/0024_futuristic_vulture.sql` |
| FR-3 `createPostgresRateLimitStore` | ✅ shipped | `packages/auth/src/rate-limit-store.ts` (get/set/delete, `FOR UPDATE`, `onConflictDoUpdate`) |
| FR-4 refactor `rate-limit.ts` | ✅ shipped | `RateLimitStore` interface, `configureRateLimiter`/`configurePostgresRateLimiter`, dev fast-path gated by `NODE_ENV==='development' && RATE_LIMIT_INMEMORY_FASTPATH==='true'`, `checkRateLimit(username, ip?)`, `recordFailure`, `resetLimit`, `_testkit` |
| FR-5 cleanup job | ❌ missing | no `rate-limit-cleanup.ts` anywhere |
| FR-6 login wiring | ✅ shipped (minus captcha) | `packages/api/src/routes/auth/login.ts:62-180` extracts IP, calls both limiters, records/resets |
| FR-7 captcha trigger | ❌ missing | `captchaRequired` appears only in this spec/plan, never in code |
| FR-9 integration tests | ❌ missing | no `login.*integration.test.ts` exists |

**Implication for TDD phasing:** Phases 1–3 are **regression/verification**
phases (code ships at baseline; tests are guardrails, not TDD drivers).
Framing them as Red-then-Green would be anti-pattern **A4 (vacuous-pass)** —
the test would pass on first run because the implementation already exists.
Phases 4, 5-captcha, and 5-integration are the **genuine TDD-Red** phases.

### Changed-contract risk (CR-1)

The spec's FR-3 proposes `checkRateLimit(identifier, kind, config)` with an
explicit `kind: 'username' | 'ip'` parameter. The **shipped** API is
`checkRateLimit(username, ip?)` — the `kind` is encoded inside the store key
(`${kind}:${identifier}`), not exposed to callers. Tests MUST exercise the
**shipped** contract (the one `packages/api/src/routes/auth/login.ts` depends
on), NOT the spec's proposed-but-unimplemented signature. Asserting the
proposed signature would be **A5 (false-claim)**.

### Pre-existing unrelated failure (IR-1)

`pnpm --filter @reading-advantage/auth test` is currently RED because of
`src/__tests__/phase-7-closeout.test.ts` (asserts `measure/tech-debt.md` ≤ 50
lines; it is 51). That failure belongs to track `audit_log_retention_dsar_20260605`,
NOT this track. Green gates below are scoped to rate-limit-relevant files to
avoid being blocked by IR-1. Do not "fix" IR-1 inside this track.

---

## 1. Test-level policy (mocks vs real DB)

| Layer | Tool | When |
|-------|------|------|
| Unit — `rate-limit.ts` logic | in-memory store via `_testkit.resetRateLimiter()` | window math, independence, reset, fast-path branch |
| Unit — `rate-limit-store.ts` Postgres query chains | `vi.mock("drizzle-orm")` + hand-written mock DB (mirror existing `rate-limit-store.test.ts`) | upsert, stale-row delete, key parse, `FOR UPDATE` chain shape |
| Unit — `rate-limit-cleanup.ts` (new) | shared `packages/domain/src/__tests__/mock-db.ts` (`vi.fn()`) OR hand-written mock | batch loop, `LIMIT 1000`, idempotency, return shape |
| Schema-parity — `loginAttempts` shape | pure import, no DB | columns + indexes exist (regression guard) |
| Integration — login 429 + cleanup deletes | **real** `science_advantage_test` DB via `apps/science-advantage/vitest.integration.config.ts` | FR-9 acceptance: 6th/31st fail → 429, success resets, captcha fires, cleanup deletes |

**Rule:** anything that touches `DELETE FROM login_attempts`, a real
`SELECT ... FOR UPDATE`, or the live `handleLogin(NextRequest)` is
**integration-only** against the real DB. Unit tests may never assert
"the row was actually deleted from Postgres" — that is **A5** if claimed from
a mock. (Mirrors the policy in
`packages/auth/src/__tests__/audit-retention-boundary.integration.test.ts:46-49`.)

The shared `mock-db.ts` helper does **not** model `.for("update")` or
`.onConflictDoUpdate` without `.returning()`, so `rate-limit-store.ts` unit
tests keep the existing hand-written mock. New cleanup-job unit tests MAY use
`mock-db.ts` (its `delete().where()` chain is sufficient) or a hand-written
mock — either is acceptable as long as the mock is explicit.

---

## 2. Phase-by-phase strategy

### Phase 0 — Setup (verification, no tests)

Coherence check: the three Phase-0 tasks are coherent. Task 1 (migrations
apply cleanly) is already true — migration `0024_futuristic_vulture.sql` exists
and the auth test suite runs without schema errors. Task 2 (read current
surface) is satisfied by this strategy's §0 table. Task 3 (coordinate with
Track 4 audit log) is already de facto satisfied: `login.ts:155-168` already
emits `auth:login_failed` / `auth:login` audit events — so the coordination is
"verify the existing emit survives the captcha change," not "add emits."

**No Red command.** Phase 0 produces no test artifact.

### Phase 1 — Schema + migration (REGRESSION, not TDD-Red)

Code ships at baseline. The only genuinely missing artifact is the
`schema-parity.test.ts` assertion for `loginAttempts` (currently 0 references).

- **Red command:** none — adding the assertion will PASS immediately (table
  exists). Framing it as Red would be **A4**. Run it as a regression guard:
  ```
  pnpm --filter @reading-advantage/db exec vitest run src/__tests__/schema-parity.test.ts
  ```
- **Green gate:** the new `describe("loginAttempts — rate limiter v2")` block
  asserts `schema.loginAttempts` is defined AND `cols()` contains exactly
  `id, identifier, kind, failedCount, windowStart, lastAttemptAt`. Assert the
  **full labeled column set**, not `toContain("id")` alone (A3 defense: a
  digit-only/substring match is fragile).
- **Closeout gate:** `pnpm --filter @reading-advantage/db test` exits 0.
- **Live-behavior proof:** none at this layer — schema-parity is an artifact
  test (see §3).
- **Anti-patterns defended:** A4 (labeled regression, not vacuous Red), A3
  (full column-set assertion, not digit/substring), A5 (no "all checks pass"
  claim while IR-1 is red).

### Phase 2 — `RateLimitStore` Postgres impl (REGRESSION)

Shipped + tested. `rate-limit-store.test.ts` (4 tests) and
`wave0-phase2-rate-limit-architecture.test.ts` (5 source-inspection tests)
already pass. No new Red work unless the mid-red role finds a gap (see §4
adversarial probes).

- **Red command:** none (regression).
- **Green gate:** `pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit-store.test.ts src/__tests__/wave0-phase2-rate-limit-architecture.test.ts` exits 0.
- **Closeout gate:** same command exits 0; `rg "new Map" packages/auth/src/rate-limit.ts` returns exactly one hit (the dev fast-path `inMemoryStore`, gated — see Phase 8 grep gate).
- **Anti-patterns defended:** A4 (tests assert specific `failedCount: 3`, not `toBeDefined`), A5 (source-inspection tests prove "not process-local" structurally, not by claim text).

### Phase 3 — Refactor `rate-limit.ts` (REGRESSION)

Shipped. `rate-limit.test.ts` (8 tests) covers: empty/within-limit/over-limit,
reset, per-user independence, per-IP independence, IP-blocks-different-usernames,
`_testkit` reset. All pass.

- **Red command:** none (regression).
- **Green gate:** `pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit.test.ts` exits 0.
- **Closeout gate:** a new structural assertion that the dev fast-path is
  gated by **both** `NODE_ENV==='development'` **and**
  `RATE_LIMIT_INMEMORY_FASTPATH==='true'` (the existing
  `wave0-phase2-rate-limit-architecture.test.ts` checks the interface exists
  but does not assert the dual gate). Mid-red should add this as a labeled
  source-inspection test to defend CR-1 / spec §4 risk ("misconfigured flag
  re-introduces F-403").
- **Anti-patterns defended:** A5 (the dual-gate test refutes "fast-path leaks
  to prod" by source inspection), A7 (the grep for `new Map` is scoped to one
  file, not a bare keyword sweep).

### Phase 4 — Periodic cleanup job (GENUINE TDD-Red) 🔴

`rate-limit-cleanup.ts` does not exist. This is real Red→Green work. Mirror
`audit-retention-job.ts` (advisory lock + `run/start/stop` + `{ deleted }`
return) and `session-cleanup.ts` (batch loop). The job must NOT collide with
`AUDIT_RETENTION_LOCK_KEY` — derive a distinct advisory-lock constant.

- **Red command (unit, new file):**
  ```
  pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit-cleanup.test.ts
  ```
  Expected: import of `cleanupOldAttempts` / `createRateLimitCleanupJob` fails
  (module absent) → RED.
- **Red command (integration, new file in science-advantage):**
  ```
  pnpm --filter science-advantage exec vitest run --config vitest.integration.config.ts <path>/rate-limit-cleanup.integration.test.ts
  ```
  Expected: same import failure → RED.
- **Green gate (unit):** mock-DB unit tests pass:
  - `cleanupOldAttempts()` returns `{ deleted: <labeled int> }` (A3: assert
    exact `100`, not `> 0`).
  - Calls delete in batches of `LIMIT 1000`; loop terminates when a batch
    returns `< 1000` (assert the mock `delete` was called the labeled number
    of times, e.g. `expect(deleteMock).toHaveBeenCalledTimes(1)` for 100 rows).
  - `run()` returns `{ deleted: 0 }` when `stopped` (mirror audit-retention-job).
  - `start()`/`stop()` idempotent; `stop()` when never started does not throw.
  - Advisory-lock constant is a distinct BigInt ≠ `AUDIT_RETENTION_LOCK_KEY`
    (refutes lock collision — a changed-contract/architecture guardrail).
- **Green gate (integration):** against real `science_advantage_test`:
  - Insert 100 rows with `windowStart = now() - 25h`; call `cleanupOldAttempts()`;
    assert exactly 100 deleted AND the table is empty after (live-behavior
    proof — not a mock claim).
  - Insert 1 row with `windowStart = now() - 1h`; call cleanup; assert 0
    deleted and the row survives (refutes "cleanup nukes fresh rows" — A4
    defense: a vacuous test would only check "something got deleted").
  - Idempotency: second consecutive call returns `{ deleted: 0 }`.
- **Closeout gate:** both unit + integration files green; `rg "rate-limit-cleanup" apps/science-advantage packages/auth` shows the job is imported by the
  app's instrumentation/startup path (or a documented follow-up if
  `instrumentation.node.ts` is Track 9-gated — see plan Phase 4 note).
- **Anti-patterns defended:** A4 (exact-count assertions + the "fresh row
  survives" refutation), A3 (labeled integer `deleted: 100`), A5 (live-DB
  delete is proven, not claimed from a mock), A7 (test files named by exact
  path, not a keyword filter).

### Phase 5 — Wire captcha + login integration tests (GENUINE TDD-Red) 🔴

Login **wiring** (IP extract, both limiters, record/reset, 429) ships at
baseline. Two things are genuinely Red: (a) the `captchaRequired` flag after
3 failures (FR-7), (b) the FR-9 integration tests (real 429, real reset).

- **Red command (unit, captcha):**
  ```
  pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit-captcha.test.ts
  ```
  Expected: `getCaptchaTriggerState` (or equivalent) does not exist → RED.
  (Or, if captcha is implemented inside `login.ts`, the unit test asserts the
  login response shape includes `captchaRequired: true` after 3 failures.)
- **Red command (integration, login):**
  ```
  pnpm --filter science-advantage exec vitest run --config vitest.integration.config.ts <path>/login.rate-limit.integration.test.ts
  ```
  Expected: the captcha assertion fails (no `captchaRequired` in response);
  the 429/reset assertions should PASS against the existing wiring (regression).
- **Green gate (captcha):**
  - After `recordFailure` count ≥ 3 for a username, the login 401 response
    body includes `captchaRequired: true`. Assert the **labeled field name and
    boolean** (`expect(body.captchaRequired).toBe(true)`), not a substring
    search (A3/A7).
  - Below 3 failures: `captchaRequired` is absent or `false` (refutation —
    A4 defense: proves the trigger is threshold-gated, not always-on).
  - Successful login resets the captcha counter alongside the rate counter.
- **Green gate (integration — FR-9):** against real `science_advantage_test`:
  - 6 failed logins (same username, same IP) within 15 min → 6th returns 429
    with `Retry-After` header present and `> 0` (labeled integer parse, A3).
  - 31 failed logins (31 distinct usernames, same IP) within 15 min → 31st
    returns 429 (proves per-IP independence from per-username — live-behavior
    proof).
  - 4 failures then a successful login → 5th attempt is allowed AND a
    follow-up failure starts counting from 1 (proves `resetLimit` clears real
    `login_attempts` rows, not just in-memory state — A5 defense).
  - Each integration test truncates `login_attempts` (and the relevant
    `users`/`accounts`/`sessions` rows) in `beforeEach` to avoid cross-test
    contamination (mirror `audit-retention-boundary.integration.test.ts:57`).
- **Closeout gate:** both files green; `rg "captchaRequired" packages/api/src/routes/auth/login.ts` returns ≥ 1 hit.
- **Changed-contract risk:** the captcha field name `captchaRequired` is a new
  response-shape contract. Existing clients that ignore unknown fields are
  unaffected (spec §Constraints). The test must assert the field is **added**,
  not that the response shape is otherwise unchanged (a shape-snapshot test
  would be brittle and would be A7 if it over-matched).
- **Anti-patterns defended:** A4 (refutation tests: "below threshold → not
  triggered", "fresh row survives cleanup"), A5 (429 + reset proven on real
  DB, not mock claim), A7 (exact field-name assertion, not keyword filter),
  A8 (plan captcha task is `[~]`, not `[ ]`).

### Phase 6 — Exports + README + JSDoc (mixed)

- Exports (`checkRateLimitByIp`/`RateLimitConfig`/`RateLimitResult`): the
  shipped `index.ts` exports `DEFAULT_IP_RATE_LIMIT_CONFIG`, `RateLimitConfig`,
  `RateLimitStore`, etc. — but NOT a `checkRateLimitByIp` named export (the
  shipped API folds IP into `checkRateLimit(username, ip?)`). **This is a
  spec-vs-shipped divergence (CR-1).** Mid-red: either (a) add
  `checkRateLimitByIp` as a thin wrapper for spec conformance, or (b) update
  the spec/plan to retire `checkRateLimitByIp` in favor of the shipped
  `checkRateLimit(username, ip)`. Do NOT silently leave the plan claiming an
  export that doesn't exist (A5).
- README dev-fast-path doc: **missing** (confirmed: `RATE_LIMIT_INMEMORY_FASTPATH`
  not in `packages/auth/README.md`). This is a documentation test (see §3).
- JSDoc on the in-memory `Map`: **already shipped** (`rate-limit.ts:79-86`
  "Dev/test-only in-memory store ... production code MUST replace this").

- **Red command (README doc test):**
  ```
  pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit-readme.test.ts
  ```
  Expected: README does not mention `RATE_LIMIT_INMEMORY_FASTPATH` → RED.
- **Green gate:** README documents the flag + the dual gate; doc test passes.
- **Closeout gate:** `rg "RATE_LIMIT_INMEMORY_FASTPATH" packages/auth/README.md` returns ≥ 1 hit.
- **Anti-patterns defended:** A5 (plan marker corrected to match shipped
  export reality), A6 (README claim must match the implemented dual gate, not
  overstate "production-safe").

### Phase 7 — 6-app smoke test (integration, cross-app)

- **Red command:** per-app login integration test (the Phase 5 file, run under
  each app's integration config). For apps without an integration harness,
  this is `[b] deferred:integration-harness` (a real external gate — Track 11
  CI work) — NOT silently `[~]`.
- **Green gate:** at minimum `science-advantage` passes; other apps either
  pass or are explicitly `[b]`-blocked with a named owner.
- **Closeout gate:** a `lessons-learned` entry records which apps passed and
  which are deferred (A6: don't claim "all 6 apps green" if some are blocked).
- **Anti-patterns defended:** A11 (deferred apps are `[b] deferred:<owner>`,
  not `[~]` pretending to be runnable), A6 (no overstatement).

### Phase 8 — Final acceptance

- **Red command (aggregate, intentionally-red scoping):**
  ```
  pnpm turbo run test --filter=@reading-advantage/auth --filter=@reading-advantage/db
  ```
  Expected: `@reading-advantage/auth` is RED due to IR-1 (`phase-7-closeout.test.ts`,
  unrelated track). This is the **intentionally-red aggregate** — do not
  "fix" it here. Scope the real Green check to rate-limit files (Phase 2/3/4/5
  Green gates above).
- **Green gate (scoped):**
  ```
  pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit.test.ts src/__tests__/rate-limit-store.test.ts src/__tests__/wave0-phase2-rate-limit-architecture.test.ts src/__tests__/rate-limit-cleanup.test.ts src/__tests__/rate-limit-captcha.test.ts src/__tests__/rate-limit-readme.test.ts
  ```
  + `pnpm --filter @reading-advantage/db test` green
  + `pnpm --filter science-advantage test:integration` green for the login + cleanup integration files
  + `pnpm turbo run build --filter=science-advantage` green
- **Closeout gate (grep, A7-scoped):**
  ```
  rg -n "new Map" packages/auth/src/rate-limit.ts
  ```
  Returns exactly 1 hit (line 84, the dev fast-path `inMemoryStore`). Zero
  hits would mean the dev fast-path was deleted (contract change); > 1 hit
  would mean a second process-local Map leaked in (F-403 regression).
- **Anti-patterns defended:** A4 (scoped Green gate refuses to claim "all
  pass" while IR-1 is red), A5 (no "PASS=N, FAIL=0" text in plan while IR-1
  is red), A7 (grep is file-scoped, not a repo-wide keyword sweep).

### Phase 9 — Closeout

- **No Red command.** Closeout is artifact moves + registry updates.
- **Closeout gate:**
  - `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` marks
    F-403, F-407 `Resolved` **only if** the Phase 5 integration tests are
    green (A6 defense: "resolved" requires the adversarial test to pass).
  - `measure/tracks.md` registry entry moves under `./archive/` AND the
    `measure/tracks/rate_limiter_v2_20260603/` directory is **removed** (A13
    defense: no stale track dir left behind).
  - A follow-up track placeholder for "Captcha Verification" is added under
    Pending Tracks.
- **Anti-patterns defended:** A6 (resolved-claim gated on green test), A13
  (stale-dir removal), A9 (no test references the pre-archive path after move).

---

## 3. Artifact/documentation tests vs live-behavior tests

| Test | Class | What it proves |
|------|-------|----------------|
| `schema-parity.test.ts` loginAttempts block | **artifact** | the schema file declares the columns/indexes (shape, not behavior) |
| `wave0-phase2-rate-limit-architecture.test.ts` | **artifact** (source-inspection) | the source contains the interface, dual-gate, no hardcoded constants — structural, not runtime |
| `rate-limit-readme.test.ts` | **artifact** (doc) | README mentions the env flag |
| `rate-limit.test.ts` (in-memory store) | **live-behavior** (unit) | window math + independence logic executes correctly against the in-memory store |
| `rate-limit-store.test.ts` (mocked Drizzle) | **live-behavior** (unit, mocked) | the store calls the right Drizzle chains — but does NOT prove Postgres actually persists |
| `rate-limit-cleanup.test.ts` (mocked) | **live-behavior** (unit, mocked) | batch loop + return shape — does NOT prove real deletes |
| `login.rate-limit.integration.test.ts` | **live-behavior** (integration, real DB) | **the only proof** that 429/reset/captcha actually work end-to-end against Postgres |
| `rate-limit-cleanup.integration.test.ts` | **live-behavior** (integration, real DB) | **the only proof** that rows are actually deleted |

**Rule for mid-red:** a mocked test may never use the word "persists" /
"durable" / "survives restart" in its assertion or comment — those claims
require the integration test (A5). Mocked tests assert "the store called
`onConflictDoUpdate`" (call-shape), not "the row is in Postgres" (state).

---

## 4. Adversarial probes the mid-red role should consider

These are optional Red tests that strengthen falsifiability beyond the plan:

1. **Window-boundary probe:** a row with `windowStart = now() - windowMs - 1ms`
   is treated as expired (allowed); `now() - windowMs + 1ms` is not. Pins the
   `elapsed > config.windowMs` boundary (off-by-one refutation, A3/A4).
2. **Concurrent-store probe (integration):** two `createPostgresRateLimitStore`
   instances sharing one DB — `storeA.set` then `storeB.get` returns the value
   (proves "not process-local" with real Postgres, not just the mock claim in
   the existing unit test).
3. **Lock-collision probe:** `RATE_LIMIT_CLEANUP_LOCK_KEY ≠ AUDIT_RETENTION_LOCK_KEY`
   (BigInt inequality assertion — architecture guardrail).
4. **Fast-path-leak refutation:** with `NODE_ENV='production'`, setting
   `RATE_LIMIT_INMEMORY_FASTPATH='true'` must NOT activate the in-memory store
   (source-inspection or behavior test — defends CR-1/spec §4 risk).

---

## 5. Test commands (canonical)

| Purpose | Command |
|---------|---------|
| Auth unit (rate-limit only, scoped) | `pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit.test.ts src/__tests__/rate-limit-store.test.ts src/__tests__/wave0-phase2-rate-limit-architecture.test.ts` |
| Auth unit (cleanup + captcha, new) | `pnpm --filter @reading-advantage/auth exec vitest run src/__tests__/rate-limit-cleanup.test.ts src/__tests__/rate-limit-captcha.test.ts src/__tests__/rate-limit-readme.test.ts` |
| DB schema parity | `pnpm --filter @reading-advantage/db test` |
| Integration (real DB) | `pnpm --filter science-advantage test:integration` |
| Lint | `pnpm turbo run lint --filter=@reading-advantage/auth --filter=@reading-advantage/db --filter=@reading-advantage/api` |
| Typecheck | `pnpm turbo run check-types --filter=@reading-advantage/auth --filter=@reading-advantage/db --filter=@reading-advantage/api` |
| Build | `pnpm turbo run build --filter=science-advantage` |

**Integration DB prerequisite:** `science_advantage_test` must exist and have
migrations applied (`vitest.integration.global-setup.ts` runs `drizzle-kit migrate`).
`DATABASE_URL` (and `DIRECT_DATABASE_URL` if the cleanup job uses a privileged
connection like `audit-retention-job`) must point at the test DB.
