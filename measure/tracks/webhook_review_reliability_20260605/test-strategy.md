# Test Strategy — Webhook → LLM Review Reliability (Postgres-Backed Retry + DLQ)

> Track: `webhook_review_reliability_20260605`
> Owner: `measure-strategy` (this file). Mid-Red / Jr-Green / Acceptance roles consume it.
> Baseline SHA: `f70628646697dd960acc383037d9f181fbb72391`
> Spec: `measure/tracks/webhook_review_reliability_20260605/spec.md`
> Plan: `measure/tracks/webhook_review_reliability_20260605/plan.md`

---

## 0. Pre-Flight Findings (informs every phase)

The Mid-Red role MUST read this section before writing any test.

### 0.1 Dependency gate — PASS

`codecamp_review_ai_consolidation_20260605` is **archived** (track dir at
`measure/archive/codecamp_review_ai_consolidation_20260605/`). The single review
seam is `reviewExercise` in `packages/domain/src/codecamp/review-exercise.ts`:

- Signature: `reviewExercise({ db, user, tenant, prDiff, moduleId?, repoUrl?, generateReview })`
- DI callback: `generateReview: (system, prompt) => Promise<ReviewResult>`
- Adapter: `aiClientToGenerateReview(client, schema)` bridges `AIClient.generateObject`.
- Output contract: `reviewResultSchema` (`{ passed, summary, comments[] }`).

The worker MUST call `reviewExercise` via `aiClientToGenerateReview(getAIClient(),
reviewResultSchema)`. Phase 0 does NOT halt.

### 0.2 The track is genuinely new — no partial implementation

Grepped `packages/webhooks`, `packages/domain`, `packages/db`: zero matches for
`review_jobs`, `reviewJobs`, `FOR UPDATE SKIP LOCKED`, or `review-jobs`. Unlike
`rate_limiter_v2` (partially built before its track opened), this track starts
from a clean sheet.

### 0.3 Where `review_jobs` lives

- **Schema:** `packages/db/src/schema/codecamp.ts` (codecamp-specific queue).
  Add `codecampReviewJobs` (or `reviewJobs`) `pgTable` + a `pgEnum` for status
  (`pending | claimed | succeeded | failed | dead`). `failed` is the transient
  retry state; `dead` is the terminal exhaustion state.
- **Barrel:** `packages/db/src/schema/index.ts` already does `export * from
  "./codecamp.js"` — the table is auto-exported.
- **Tenant classification:** `packages/domain/src/tenant-registry.ts` MUST
  register the new table as `REFERENTIAL`. Codecamp is single-tenant/global
  (`globalTenant = { schoolId: null }`); `review_jobs` carries NO `schoolId`.
  `tenant-coverage.test.ts` (FR-6) fails the build if the table is unclassified.
- **Migration:** next sequence number is **`0025`** (latest is
  `0024_futuristic_vulture.sql`). Follow the hand-written protocol in
  `packages/db/drizzle/MIGRATION_LEDGER.md`: SQL file + `_journal.json` entry
  with `idx: 25` and `when > 1782627369208`.

### 0.4 Where the worker lives

`packages/webhooks/src/review-worker.ts` (alongside `github.ts`), mirroring the
`rate-limit-cleanup` pattern (`packages/auth/src/rate-limit-cleanup.ts`):

- `claimDueJobs(conn, limit)` — `UPDATE ... SET status='claimed' ... WHERE id IN
  (SELECT id WHERE status='pending' AND next_attempt_at <= now() FOR UPDATE
  SKIP LOCKED LIMIT N) RETURNING *`.
- `processJob(job, { aiClient, githubClient })` — calls `reviewExercise`, posts
  PR comment, settles the job row.
- `settleJob(...)` — success → `succeeded`; failure → `attempts++` + jittered
  backoff (`next_attempt_at = now() + base * 2^attempts ± jitter`) → `pending`
  if `attempts < max_attempts`, else `dead` with `last_error`.
- `reclaimStuckJobs(conn, visibilityTimeoutMs)` — `UPDATE ... SET status='pending'
  WHERE status='claimed' AND claimed_at < now() - visibilityTimeout`.
- `createReviewWorker({ intervalMs, ... })` — `{ run(), start(), stop() }`
  factory with `setInterval`, env-gated (e.g. `REVIEW_WORKER_ENABLED=1`), mirroring
  `createRateLimitCleanupJob`.

Use `createPrivilegedDb()` (DIRECT_DATABASE_URL) for the claim —
`FOR UPDATE SKIP LOCKED` is a session-scoped feature that breaks under
transaction-mode pooling (PgBouncer/Hyperdrive). Same caveat as
`audit-retention-job.ts`. Integration tests MUST set `DIRECT_DATABASE_URL` and
skip otherwise (mirror `audit-retention.integration.test.ts:56-58`).

### 0.5 Where admin endpoints live

The established admin surface for codecamp is the tRPC router at
`packages/api/src/routers/codecamp.ts` (see `webhookEvents: adminProcedure`,
`listInterns: adminProcedure`). The spec's "GET /api/admin/review-jobs" is
REST-flavored — the **recommended** implementation is two new `adminProcedure`
entries on the codecamp tRPC router:

- `listDeadReviewJobs: adminProcedure` — `.query` returning
  `z.array(reviewJobSchema)` with optional `status` filter (default `dead`).
- `requeueReviewJob: adminProcedure` —
  `.input(z.object({ jobId: z.string().uuid() }))` `.mutation` resetting the
  job to `pending` / `attempts = 0` / `next_attempt_at = now()`.

A Hono `/admin/review-jobs` sub-app in `packages/webhooks/src/admin.ts` is also
acceptable. The strategy recommends tRPC for consistency with `webhookEvents`.

### 0.6 URL normalization — the idempotency key

`parsePrUrl` (`packages/webhooks/src/github-client.ts:329`) returns
`{ owner, repo, pullNumber }` but does NOT normalize case, `.git`, or trailing
slash. The existing `createPrReview` (`packages/domain/src/codecamp/pr-reviews.ts:69`)
normalizes the *exercise repo* URL via `.replace(/\.git$/, "").replace(/\/$/, "")`
but stores the PR URL raw.

The `review_jobs` idempotency unique index MUST be on a **normalized** PR key.
Two acceptable designs:

- **(A) Composite key** `(pr_owner, pr_repo, pr_pull_number)` — derived from
  `parsePrUrl`. Owner/repo lowercased. Pull number is an integer. **Recommended** —
  sidesteps `.git`/trailing-slash ambiguity entirely.
- **(B) Normalized `pr_url` text** — `.replace(/\.git$/, "").replace(/\/$/,
  "").toLowerCase()`. Matches the existing `createPrReview` convention.

Either is falsifiable: the idempotency test enqueues the same logical PR via
two URL variants (`https://github.com/Org/Repo/pull/1` vs
`https://github.com/org/repo/pull/1` — case differs) and asserts exactly one row.

### 0.7 `reviewedAt` terminal-stamping — the contract this track changes

`updatePrReview` (`packages/domain/src/codecamp/pr-reviews.ts:91-111`) already
conditionally stamps:

```ts
reviewedAt: input.reviewStatus !== "pending" ? new Date() : sql`${codecampPrReviews.reviewedAt}`
```

So `pending` preserves the prior `reviewedAt`; any other status stamps `now()`.

The current fire-and-forget code (`packages/webhooks/src/github.ts:349-362`)
calls `updatePrReview` with `reviewStatus: "reviewed"` on LLM failure — **that
is the bug**. The new worker must:

- On success: `updatePrReview({ reviewStatus: "approved" | "needs_changes", ... })`
  → stamps `reviewedAt`. ✅
- On retry (transient failure): leave the review row at `pending`. Do NOT call
  `updatePrReview` with `"reviewed"`. The job row tracks retry state.
- On exhaustion (`dead`): leave the review row at `pending`. The spec: "A
  dead-lettered review is NOT shown as 'reviewed' anywhere; status is distinct."
  The JOB is `dead`; the REVIEW stays `pending` until an admin replays it.
- Do NOT add a `dead` status to `codecampReviewStatusEnum`
  (`["pending","reviewed","needs_changes","approved"]`). The DLQ state lives
  only on `review_jobs.status`.

### 0.8 Changed-contract risk — existing tests that must be updated

`packages/webhooks/src/__tests__/github-review.test.ts` (lines 361-389) and
`phase-6-acceptance.test.ts` (lines 385-412, 414-441 — the latter is a benign
duplicate) assert the **current** fire-and-forget contract:

> "AIClient rejection returns 200 and stamps `reviewed` status with a 'Review
> failed' summary."

This contract is **changed** by this track. The new contract is:

> "Webhook enqueues a `review_jobs` row and returns 200 immediately. The worker
> claims the job, calls `reviewExercise`, and on transient failure retries with
> backoff. On exhaustion the job goes `dead` and the review row stays `pending`
> (NOT `reviewed`)."

The Mid-Red role MUST rewrite these tests in Phase 2 to assert the new contract.
The `waitForBackgroundReviews` export in `github.ts` becomes unused after the
rewrite — remove it (grep for consumers first) or keep as a no-op shim. The
plan's Phase 2 must call out this rewrite (see §9.3).

### 0.9 Pre-existing tests that must NOT be modified

These test files belong to the **dependency track**
`codecamp_review_ai_consolidation_20260605` (archived). They are GREEN on the
baseline (verified: 82/82 webhooks tests pass). The Mid-Red / Jr-Green /
Acceptance roles MUST NOT modify them:

- `packages/webhooks/src/__tests__/phase-5-dead-code.test.ts` (164 lines, 7 tests, GREEN)
- `packages/webhooks/src/__tests__/phase-6-acceptance.test.ts` (539 lines, 6 tests, GREEN — the duplicated test at lines 414-441 is a benign artifact; do not "fix" it)
- `packages/webhooks/src/__tests__/phase-7-closeout.test.ts` (518 lines, 16 tests, GREEN)

These pin the consolidation track's closeout (tech-debt.md row flip, lessons
entry, archive dir move, git notes). Editing them reopens a closed track. The
Phase 2 rewrite (§0.8) touches ONLY the fire-and-forget-posture tests in
`phase-6-acceptance.test.ts` (lines 385-441); the rest of that file is immutable.

### 0.10 Aggregate-suite baseline (intentionally-red handling)

`pnpm --filter @reading-advantage/webhooks exec vitest run` is GREEN on the
baseline (82 tests, 8 files). After this track opens Red phases, the aggregate
will go RED from the new test files (source doesn't exist yet). This is the
expected intentionally-red aggregate state.

The aggregate is **expected to return to GREEN** by the end of Phase 5. If the
aggregate is still RED after Phase 5, Phase 5 is not done — do not mark `[x]`.

The broader `pnpm turbo run test` aggregate across the monorepo has pre-existing
REDs (see `measure/tech-debt.md` rows for reading-advantage's 26 failed suites,
primary-advantage's `ignoreBuildErrors`, advantage-games ESLint warnings). Those
are owner-labeled IRs and MUST NOT be fixed by this track. The closeout gate
uses the **filtered** Turbo command (Phase 6 task 3), not the full monorepo
aggregate.

### 0.11 Anti-pattern coverage map (per-phase)

Relevant A-class anti-patterns from `measure/anti-patterns.md`: A3, A4, A5, A8,
A12, A13. A1/A2/A6/A7/A9/A10/A11 are out of scope (orchestrator-side,
catalog-side, or review-track-specific). Each phase below lists which A-class
its tests must defend against and what the defense looks like.

---

## 1. Phase 0 — Setup + Dependency Gate

### 1.1 Red command

```bash
# Verify the dependency gate (no new test file — source-inspection phase).
cat > /tmp/phase0-dep-gate-probe.ts <<'EOF'
import { reviewExercise, aiClientToGenerateReview, reviewResultSchema } from "@reading-advantage/domain/codecamp";
import { getAIClient } from "@reading-advantage/ai";
const _ok = aiClientToGenerateReview(getAIClient(), reviewResultSchema);
console.log(typeof reviewExercise, typeof _ok);
EOF
pnpm --filter @reading-advantage/webhooks exec tsx /tmp/phase0-dep-gate-probe.ts
```

If the probe prints `function function`, the gate PASSES. If it throws
(`reviewExercise` not exported, `aiClientToGenerateReview` missing), HALT and
escalate per spec §Constraints & Risks.

### 1.2 Green gate / Closeout gate

No source changes. The probe exits 0. Plan Phase 0 tasks 1-4 flip to `[x]`.
Task 4 records: "`review_jobs` classified REFERENTIAL (no schoolId; codecamp is
single-tenant globalTenant)."

### 1.3 Anti-pattern coverage

- **A5 (false-claim text vs test reality):** the probe is the live evidence.
  The plan must NOT say "dependency gate confirmed" unless the probe exits 0.

---

## 2. Phase 1 — `review_jobs` Schema (Contract) — TDD

### 2.1 Red command

```bash
pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/phase-1-review-jobs-schema.test.ts \
  src/__tests__/phase-1-review-jobs-migration.test.ts
```

### 2.2 Red expectations (falsification conditions)

Test files don't exist → `vitest run <path>` exits non-zero with "no test files
found". Once Mid-Red writes the tests but source is missing, they fail on:

- `import { reviewJobs } from "@reading-advantage/db/schema"` →
  `SyntaxError: The requested module does not provide an export named 'reviewJobs'`.
- `readFileSync("drizzle/0025_review_jobs.sql")` → `ENOENT`.
- `_journal.json` `entries[25]` → `undefined`.
- `classifyTable(reviewJobs)` → throws "not classified in tenant registry" (FR-6).

### 2.3 Green gate

After Jr-Green adds schema + migration + journal entry + tenant-registry
classification:

- Schema test asserts the table has: `id` (uuid PK), `pr_owner`, `pr_repo`,
  `pr_pull_number` (integer), `payload_json` (jsonb — full webhook payload for
  re-run), `status` (enum `pending|claimed|succeeded|failed|dead`), `attempts`
  (integer, default 0), `max_attempts` (integer, default 5), `next_attempt_at`
  (timestamptz, default now()), `last_error` (text, nullable), `claimed_at`
  (timestamptz, nullable), `claimed_by` (text, nullable), `review_id` (uuid FK
  to `codecamp_pr_reviews.id`, nullable), `created_at`, `updated_at`.
- Migration test asserts `0025_review_jobs.sql` contains:
  - `CREATE TYPE "codecamp_review_job_status" AS ENUM('pending','claimed','succeeded','failed','dead')` (or `pgEnum`).
  - `CREATE TABLE "review_jobs" (...)` with the columns above.
  - `CREATE UNIQUE INDEX "review_jobs_pr_key_unique" ON "review_jobs" ("pr_owner","pr_repo","pr_pull_number")` (design A) OR `("pr_url_normalized")` (design B).
  - `CREATE INDEX "review_jobs_claim_idx" ON "review_jobs" ("status","next_attempt_at")`.
- Journal test asserts `_journal.json` has `idx: 25`, `tag: "0025_review_jobs"`,
  `when > 1782627369208`, `breakpoints: true`.
- `tenant-coverage.test.ts` passes — `reviewJobs` classified `REFERENTIAL`.
- Migration applies cleanly to the test DB (live-DB proof, gated on
  `DIRECT_DATABASE_URL`).

### 2.4 Closeout gate

- `pnpm --filter @reading-advantage/db exec vitest run src/__tests__/phase-1-review-jobs-*.test.ts` exits 0.
- `pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/tenant-coverage.test.ts` exits 0 (FR-6 gate).

### 2.5 Anti-pattern coverage

- **A3 (digit-only as labeled count):** the migration-test assertion on journal
  `idx` must be a labeled integer parse, not a bare `[0-9]+` regex. Use
  `expect(journal.entries[25]?.idx).toBe(25)` — never
  `expect(source).toMatch(/25/)`.
- **A4 (vacuous-pass on nothing-done):** the schema test must FAIL if the table
  is missing (not pass because "no table → no columns → no violation").
  `expect(() => readFileSync(MIGRATION_PATH)).not.toThrow()` so ENOENT fails.

### 2.6 Fixtures / mocks / live-behavior proof

- **Schema test:** pure source-read on `packages/db/src/schema/codecamp.ts`.
  No DB connection. Drizzle table introspected via `table[Symbol.for("drizzle:Name")]`.
- **Migration test:** pure file-read on `drizzle/0025_review_jobs.sql` +
  `drizzle/meta/_journal.json`. No DB.
- **Apply-cleanly test:** live Postgres. Requires `DIRECT_DATABASE_URL`. Skip
  via `(hasDirectDbUrl ? describe : describe.skip)` if unset.

### 2.7 Artifact vs. live-behavior

- Schema-shape and migration-SQL assertions are **artifact tests** (file
  content) — they pin the contract.
- The apply-cleanly assertion is a **live-behavior test** — the only
  falsification of "the migration is valid SQL."

---

## 3. Phase 2 — Enqueue (Idempotent) — TDD

### 3.1 Red command

```bash
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-2-enqueue-idempotent.test.ts \
  src/__tests__/phase-2-enqueue-url-normalization.test.ts \
  src/__tests__/phase-2-webhook-acks-after-enqueue.test.ts
```

### 3.2 Red expectations

- `enqueueReviewJob` not exported → import fails.
- Webhook still calls `reviewExercise` inline → "no inline review" assertion fails.
- `waitForBackgroundReviews` still called by existing tests → if Jr-Green removes
  it, existing tests break (intentional — see §0.8).

### 3.3 Green gate

The rewritten webhook handler:

1. Verifies signature (unchanged).
2. Dedup layer 1: `processedDeliveryIds` Set (unchanged — synchronous dedup).
3. Looks up / creates the `codecamp_pr_reviews` row (unchanged).
4. **NEW:** calls `enqueueReviewJob({ db, reviewId, prOwner, prRepo,
   prPullNumber, payload })`. Idempotent upsert on normalized PR key. A
   redelivery reuses the existing `pending`/`claimed` job OR supersedes a
   terminal `succeeded`/`dead` job (resets to `pending`, `attempts = 0`).
5. Returns `c.json({ received: true, action, prUrl, jobId }, 200)` promptly.
6. Does NOT call `reviewExercise`, `fetchPrDiff`, `postPrComment`, or
   `getInstallationTokenForRepo` inline. The `runReview` closure and
   `backgroundReviewJobs` Map are removed.

The test asserts:

- **Single enqueue:** one webhook delivery → exactly one `review_jobs` row with
  `status: 'pending'`, `attempts: 0`, `next_attempt_at <= now()`.
- **Duplicate redelivery:** second delivery for same PR head → no second row.
  Assert `count(review_jobs where pr_key = X) === 1`.
- **URL normalization:** two deliveries with case variants
  (`https://github.com/Org/Repo/pull/1` vs `https://github.com/org/repo/pull/1`)
  → one row.
- **Prompt ACK:** webhook returns 200 within a tight budget (e.g. 100ms after
  the enqueue INSERT). The existing `github-webhook-ack-latency.test.ts` is
  updated: ACK must win the race against the worker's first claim tick.
- **No inline review:** `reviewExercise` NOT called from the webhook handler.
  `vi.mocked(reviewExercise).mock.calls.length === 0` after the handler returns.
  (The existing `github-review.test.ts` "invokes the injected AIClient" test is
  REWRITTEN — see §0.8.)

### 3.4 Closeout gate

- `pnpm --filter @reading-advantage/webhooks exec vitest run src/__tests__/phase-2-*.test.ts` exits 0.
- The rewritten `github-review.test.ts` and the fire-and-forget-posture tests in
  `phase-6-acceptance.test.ts` are GREEN with the new contract.
- `pnpm --filter @reading-advantage/webhooks exec vitest run` (full webhooks
  suite) exits 0 — no regression on `github-webhook.test.ts`,
  `github-webhook-idempotency.test.ts`, `github-webhook-ack-latency.test.ts`,
  `github-client.test.ts`, or the dependency-track tests (§0.9).

### 3.5 Anti-pattern coverage

- **A3 (digit-only as labeled count):** the "single enqueue" assertion must use
  a labeled integer count: `expect(enqueueCount, "Enqueue call count:
  ${enqueueCount}").toBe(1)` — never `expect(source).toMatch(/[0-9]+/)`.
- **A4 (vacuous-pass on nothing-done):** the "no inline review" assertion must
  FAIL if `reviewExercise` is never imported (not pass because "no calls → 0
  calls → equals 0"). Concretely: `expect(vi.mocked(reviewExercise)).toBeDefined()`
  AND `expect(vi.mocked(reviewExercise)).not.toHaveBeenCalled()`.
- **A5 (false-claim text vs test reality):** the plan task "webhook returns 2xx
  promptly" must NOT be marked `[x]` if the ACK-latency test is still RED.
- **A8 (`[ ]` marker ambiguity):** plan task markers must be `[~]` (Red in
  progress) or `[x]` (Green done), never `[ ]` (space — supervisor ignores per
  A8). Mid-Red must not introduce `[ ]` markers when updating the plan.

### 3.6 Fixtures / mocks / live-behavior proof

- **Mock DB:** the enqueue logic CAN be unit-tested with the existing `mock-db.ts`
  pattern. Use `vi.mocked(db.insert).mockReturnValue({ values: ...
  onConflictDoUpdate: ... returning: vi.fn().mockResolvedValue([row]) })`.
- **Live DB (recommended for the idempotency assertion):** the unique-index
  behavior cannot be fully exercised on mock-db. A `phase-2-enqueue-live.test.ts`
  gated on `DIRECT_DATABASE_URL` truncates `review_jobs`, fires two webhook
  deliveries (via `githubApp.fetch`), and asserts
  `SELECT count(*) FROM review_jobs WHERE pr_owner='org' AND pr_repo='repo' AND
  pr_pull_number=1` returns 1.
- **URL normalization:** unit-test by calling `enqueueReviewJob` with two URL
  variants and asserting the upsert key is identical. The normalization function
  itself should be a pure export (`normalizePrKey(prUrl): { owner, repo,
  pullNumber }`) with its own property tests.

### 3.7 Artifact vs. live-behavior

- The "no inline review" assertion is an **artifact test** (source-grep for
  `reviewExercise(` in `github.ts` returns 0 matches outside comments).
- The "single enqueue" and "URL normalization" assertions are **live-behavior
  tests**. Mock-db is acceptable for the happy path; the unique-index idempotency
  is a live-DB proof.

---

## 4. Phase 3 — Worker Claim + Process + Settle — TDD

### 4.1 Red command

```bash
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-3-claim-skip-locked.test.ts \
  src/__tests__/phase-3-success-settle.test.ts \
  src/__tests__/phase-3-retry-backoff.test.ts \
  src/__tests__/phase-3-exhaust-to-dead.test.ts \
  src/__tests__/phase-3-reclaim-stuck.test.ts
```

### 4.2 Red expectations

- `claimDueJobs`, `processJob`, `settleJob`, `reclaimStuckJobs`,
  `createReviewWorker` not exported from `../review-worker.js` → import fails.
- `FOR UPDATE SKIP LOCKED` SQL string not present in `review-worker.ts` →
  source-grep assertion fails.
- `reviewExercise` not called by `processJob` → "uses the single seam" assertion fails.

### 4.3 Green gate

The worker implementation satisfies:

- **Claim:** `claimDueJobs(conn, limit = 5)` issues
  `UPDATE review_jobs SET status='claimed', claimed_at=now(), claimed_by=$workerId
  WHERE id IN (SELECT id FROM review_jobs WHERE status='pending' AND
  next_attempt_at <= now() FOR UPDATE SKIP LOCKED LIMIT $limit) RETURNING *`.
  Returns claimed rows. `FOR UPDATE SKIP LOCKED` is in the SQL text (asserted
  by source-grep + by the two-worker concurrency test).
- **Process:** `processJob(job)` builds a `tenantDb`, calls `reviewExercise({
  db: tenantDb, user: systemUser, tenant: globalTenant, prDiff, repoUrl,
  generateReview: aiClientToGenerateReview(getAIClient(), reviewResultSchema) })`,
  then `postPrComment` (stubbed in tests), then `updatePrReview({ reviewStatus:
  result.passed ? 'approved' : 'needs_changes', llmReviewSummary: result.summary })`
  → stamps `reviewedAt`.
- **Settle success:** `status='succeeded'`, `last_error=null`. Single PR comment.
  `reviewedAt` stamped (via `updatePrReview`).
- **Settle retry:** on `reviewExercise` / `postPrComment` throw: `attempts++`,
  `status='pending'`, `next_attempt_at = now() + base * 2^attempts + jitter`
  (base default 1000ms, env `REVIEW_WORKER_BACKOFF_BASE_MS`). `last_error =
  err.message`. Review row NOT updated (stays `pending`). No PR comment on retry.
- **Settle dead:** when `attempts >= max_attempts` (default 5, env
  `REVIEW_WORKER_MAX_ATTEMPTS`): `status='dead'`, `last_error=err.message`.
  Review row NOT updated (stays `pending` — NOT `reviewed`). No PR comment.
- **Reclaim stuck:** `reclaimStuckJobs(conn, visibilityTimeoutMs)` issues
  `UPDATE review_jobs SET status='pending', claimed_at=null, claimed_by=null
  WHERE status='claimed' AND claimed_at < now() - $visibilityTimeout`. Default
  5 minutes (env `REVIEW_WORKER_VISIBILITY_TIMEOUT_MS`).
- **Scheduler:** `createReviewWorker({ intervalMs })` returns `{ run, start,
  stop }`. `start()` calls `setInterval(run, intervalMs)`; `stop()` clears it.
  `run()` claims + processes + settles in a loop until no due jobs remain.
  Env-gated: `start()` is a no-op unless `REVIEW_WORKER_ENABLED=1` OR
  `NODE_ENV=production` (pick one and document — mirror `rate-limit-cleanup`).

### 4.4 Closeout gate

- All five Phase 3 test files GREEN.
- `pnpm --filter @reading-advantage/webhooks exec vitest run` (full suite) GREEN.
- The two-worker concurrency test (`phase-3-claim-skip-locked.test.ts`) is a
  **live-DB integration test** gated on `DIRECT_DATABASE_URL`. Seeds N due jobs,
  starts two workers concurrently, asserts each job processed exactly once (no
  double-claim). Falsification of "safe across replicas" (spec FR-3).
- `reviewedAt` terminal-stamping preserved: success-settle asserts
  `updatePrReview` called with `reviewStatus: 'approved'` (stamps `reviewedAt`);
  retry/dead tests assert `updatePrReview` NOT called with `reviewStatus:
  'reviewed'` (the bug we're fixing).

### 4.5 Anti-pattern coverage

- **A3 (digit-only as labeled count):** the backoff-timing assertion must parse
  a labeled integer: `expect(attempts, "Retry attempts:
  ${attempts}").toBeLessThan(maxAttempts)`. The concurrency test must report
  `Processed job count: X / Seeded job count: Y` with labeled integers.
- **A4 (vacuous-pass on nothing-done):** the concurrency test must FAIL if zero
  jobs are processed (e.g. both workers no-op'd because the claim query is
  broken). `expect(processedCount, "Processed job count:
  ${processedCount}").toBeGreaterThan(0)` AND
  `expect(processedCount).toBe(seededCount)`.
- **A5 (false-claim text vs test reality):** the plan task "FOR UPDATE SKIP
  LOCKED ensures a job is processed once" must NOT be marked `[x]` unless the
  two-worker concurrency test is GREEN.
- **A8 (`[ ]` marker ambiguity):** same as Phase 2 — use `[~]` / `[x]` only.

### 4.6 Fixtures / mocks / live-behavior proof

- **Mock AIClient + GitHub client:** the success/retry/dead tests use the
  `vi.hoisted` `mockHolder` with `setResponse` / `setThrowOnGenerateObject`
  (mirror `github-review.test.ts`). GitHub client stubbed via
  `vi.mock("../github-client", ...)` (mirror `phase-6-acceptance.test.ts:246-253`).
- **Mock DB (for settle logic):** the backoff computation, attempts increment,
  and dead-transition can be unit-tested with a mock `db` that returns seeded
  job rows. `settleJob` is pure given `(job, err, config)` → `updatePayload`.
- **Live DB (for claim + concurrency):** `claimDueJobs` and `reclaimStuckJobs`
  are integration-only. `FOR UPDATE SKIP LOCKED` cannot be exercised on mock-db.
  Mirror `audit-retention-job.integration.test.ts`:
  `(hasDirectDbUrl ? describe : describe.skip)`. Seed jobs directly via
  `db.insert(reviewJobs).values([...])`, call `claimDueJobs` from two concurrent
  promises, assert no overlap in claimed ids.
- **Backoff jitter:** the backoff test asserts `next_attempt_at` is within
  `[base * 2^attempts, base * 2^attempts + jitterMax]`. Use `vi.useFakeTimers()`
  to control `now()`, or assert the computed delta is within bounds.

### 4.7 Artifact vs. live-behavior

- The "FOR UPDATE SKIP LOCKED in source" assertion is an **artifact test**
  (source-grep on `review-worker.ts`).
- The "two workers never claim the same job" assertion is a **live-behavior
  test** (real Postgres row locks).
- The "backoff is exponential + jittered" assertion is a **live-behavior test**
  on the `settleJob` function output (pure function given inputs).

---

## 5. Phase 4 — Dead-Letter Visibility + Replay — TDD

### 5.1 Red command

```bash
# tRPC-router design (recommended):
pnpm --filter @reading-advantage/api exec vitest run \
  src/__tests__/phase-4-admin-list-dead-review-jobs.test.ts \
  src/__tests__/phase-4-admin-requeue-review-job.test.ts
# OR Hono-admin design:
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-4-admin-list-dead-review-jobs.test.ts \
  src/__tests__/phase-4-admin-requeue-review-job.test.ts
```

Mid-Red picks ONE design and writes tests against it. The plan task text
reflects the chosen design.

### 5.2 Red expectations

- `listDeadReviewJobs` / `requeueReviewJob` tRPC procedures (or Hono routes) do
  not exist → import / fetch fails.
- Non-admin caller → no 403 (tRPC `adminProcedure` enforces this; the test
  asserts the procedure is wired to `adminProcedure`, not `protectedProcedure`).
- Requeue does not reset `attempts` → "resets to pending/0" assertion fails.

### 5.3 Green gate

- **List dead:** `listDeadReviewJobs: adminProcedure.query(...)` returns
  `z.array(reviewJobSchema)` filtered by `status = 'dead'` (or accepts an
  optional `status` input). Zod-validated output. Non-admin → tRPC
  `UNAUTHORIZED` (the `adminProcedure` middleware throws).
- **Requeue:** `requeueReviewJob: adminProcedure.input(z.object({ jobId:
  z.string().uuid() })).mutation(...)` sets `status='pending'`, `attempts=0`,
  `next_attempt_at=now()`, `last_error=null`, `claimed_at=null`,
  `claimed_by=null`. Returns the updated job. The next worker tick picks it up.
- **Replay flow:** the integration test seeds a `dead` job, calls
  `requeueReviewJob`, runs the worker once, and asserts the job transitions
  `dead → pending → (succeeded | failed | dead)` depending on the mock
  AIClient's behavior on the replayed run.
- **Not "reviewed":** the dead-job listing returns jobs whose `review_id` review
  row is still `pending` (NOT `reviewed`). The test asserts
  `codecamp_pr_reviews.reviewStatus === 'pending'` for the dead job's
  `review_id`. Falsification of "A dead-lettered review is NOT shown as reviewed."

### 5.4 Closeout gate

- Both Phase 4 test files GREEN.
- The non-admin-403 assertion is GREEN.
- The replay-flow integration test is GREEN (live DB, gated on
  `DIRECT_DATABASE_URL`).

### 5.5 Anti-pattern coverage

- **A3 (digit-only as labeled count):** the dead-job listing assertion must use
  a labeled count: `expect(deadJobs.length, "Dead job count:
  ${deadJobs.length}").toBe(1)`.
- **A4 (vacuous-pass on nothing-done):** the "non-admin → 403" test must FAIL if
  the procedure is wired to `protectedProcedure` (which allows STUDENT/TEACHER).
  Call with a STUDENT-role user and assert the call throws / returns 403.
- **A5 (false-claim text vs test reality):** the plan task "dead jobs are
  admin-queryable" must NOT be marked `[x]` unless the list-dead test is GREEN
  with a real `dead` row.

### 5.6 Fixtures / mocks / live-behavior proof

- **List dead:** can be unit-tested with a mock `db.select` returning a seeded
  `dead` job. The Zod output validation is the contract.
- **Requeue:** live-DB integration test (the `UPDATE ... WHERE id = $jobId` is a
  real mutation). Assert the row is updated AND the worker picks it up on the
  next tick.
- **Replay flow:** live-DB integration test with a mock AIClient. Seed dead job
  → requeue → run worker → assert terminal state.

### 5.7 Artifact vs. live-behavior

- The "procedure is wired to `adminProcedure`" assertion is an **artifact test**
  (source-grep on `codecamp.ts` for `listDeadReviewJobs: adminProcedure`).
- The "non-admin → 403" assertion is a **live-behavior test** (tRPC middleware
  actually enforces).
- The "requeue resets attempts" assertion is a **live-behavior test** (real DB
  mutation).

---

## 6. Phase 5 — Pipeline Integration Tests (the missing coverage)

### 6.1 Red command

```bash
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-5-happy-path.test.ts \
  src/__tests__/phase-5-retry-then-succeed.test.ts \
  src/__tests__/phase-5-exhaust-to-dead.test.ts \
  src/__tests__/phase-5-idempotent-redelivery.test.ts \
  src/__tests__/phase-5-concurrency.test.ts
```

### 6.2 Red expectations

These tests exercise the **full pipeline** (webhook → enqueue → worker → review
→ comment → DB). They depend on Phases 1-4 being GREEN. If the Red command is
run before Phases 1-4 are GREEN, the tests fail on missing source (the expected
Red signal). Mid-Red may write them in the same Red phase as Phases 1-4 (all RED
together) OR defer to a separate Red phase after Phases 1-4 are GREEN. The plan
clarifies the sequencing.

### 6.3 Green gate

- **Happy path E2E:** webhook delivery → `review_jobs` row `pending` → worker
  claims → `reviewExercise` (Mock returns `passed: true`) → `postPrComment`
  called once → `updatePrReview({ reviewStatus: 'approved', summary })` →
  `reviewedAt` stamped → job `succeeded`. Assert: persisted review summary
  matches Mock fixture; exactly one `postPrComment` call; job terminal state
  `succeeded`.
- **Retry-then-succeed:** Mock throws on attempts 1 and 2, succeeds on attempt
  3. Assert: job transitions `pending → claimed → pending → claimed → pending
  → claimed → succeeded`; `attempts === 3`; `next_attempt_at` advanced by
  `base * 2^1 + jitter` then `base * 2^2 + jitter`; exactly one `postPrComment`
  call (on the successful attempt); `reviewedAt` stamped only on terminal success.
- **Exhaust-to-dead:** Mock always throws. Assert: job transitions through
  `max_attempts` retries to `dead`; `last_error` set; `updatePrReview` was NOT
  called with `reviewStatus: 'reviewed'` (the bug we're fixing); review row
  stays `pending`; no `postPrComment` call.
- **Idempotent redelivery:** two webhook deliveries for the same PR head → one
  `review_jobs` row → one `postPrComment` call → one `updatePrReview` call. The
  second delivery may reset a `succeeded`/`dead` job to `pending` (per the
  enqueue design) OR be a no-op (if the job is still `pending`/`claimed`). The
  test pins whichever design Jr-Green chose.
- **Concurrency:** two workers, N=5 due jobs. Assert: each job processed exactly
  once; total `postPrComment` calls === 5; total `succeeded` jobs === 5; no job
  claimed by both workers.

### 6.4 Closeout gate

- All five Phase 5 test files GREEN.
- The concurrency test is a live-DB integration test gated on
  `DIRECT_DATABASE_URL`.
- The happy-path / retry-then-succeed / exhaust-to-dead tests CAN be mock-DB
  (they exercise the worker's settle logic, not row-lock semantics), but the
  strategy recommends running them against the live test DB as well (a separate
  `*.integration.test.ts` variant) to catch schema/constraint bugs the mock-db
  hides (lessons-learned 2026-05-14).

### 6.5 Anti-pattern coverage

- **A3 (digit-only as labeled count):** the "exactly one comment" assertion must
  use a labeled count: `expect(commentCount, "PR comment count:
  ${commentCount}").toBe(1)`. The concurrency test must report `Processed job
  count: X / Seeded job count: Y / Double-claimed count: Z` with labeled integers.
- **A4 (vacuous-pass on nothing-done):** the happy-path test must FAIL if the
  worker never claims the job (e.g. the claim query is broken). Assert
  `expect(claimedJobs, "Claimed job count").toBeGreaterThan(0)` AND the
  terminal-state assertion.
- **A5 (false-claim text vs test reality):** the plan task "integration tests
  cover happy path, retry-then-succeed, exhaust-to-dead, idempotent redelivery,
  two-worker single-processing" must NOT be marked `[x]` unless all five tests
  are GREEN. Each test is the live evidence for its bullet.
- **A8 (`[ ]` marker ambiguity):** same as Phase 2.

### 6.6 Fixtures / mocks / live-behavior proof

- **Mock AIClient:** the `vi.hoisted` `mockHolder` with `setResponse` /
  `setThrowOnGenerateObject` (mirror `phase-6-acceptance.test.ts`).
- **Stubbed GitHub client:** `vi.mock("../github-client", ...)` returning a mock
  diff and recording `postPrComment` calls (mirror
  `phase-6-acceptance.test.ts:246-253`).
- **Live DB (recommended):** the happy-path / retry / exhaust tests are most
  valuable against the real test DB. Mock-db variants are acceptable for
  CI-without-Postgres, but the live variants catch constraint/index bugs. Use
  `describe.skip` gating on `DIRECT_DATABASE_URL`.
- **Concurrency test:** live-DB only. Two `claimDueJobs` calls in `Promise.all`,
  each with `limit = 5`, against 5 seeded due jobs. Assert the union of claimed
  ids has 5 elements (no overlap).

### 6.7 Artifact vs. live-behavior

- All five Phase 5 tests are **live-behavior tests**. They exercise the full
  pipeline end-to-end. There are no artifact assertions in this phase (artifact
  assertions live in Phases 1-4).

---

## 7. Phase 6 — Acceptance

### 7.1 Red command

```bash
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-6-reliability-acceptance.test.ts
```

The file name is `phase-6-reliability-acceptance.test.ts` to distinguish it
from the dependency track's `phase-6-acceptance.test.ts` (§0.9).

### 7.2 Red expectations

The acceptance test fails until Phases 1-5 are GREEN. It asserts the spec's
Acceptance Criteria 1-8 in source-form (artifact) + live-form (behavior).

### 7.3 Green gate

The acceptance test asserts each AC:

1. `review_jobs` table + migration + idempotency/claim indexes exist → artifact
   assertion (source-read on schema + migration SQL).
2. Webhook enqueues (idempotent on PR key) and returns 2xx promptly; no inline
   review → live-behavior assertion (webhook fetch + `review_jobs` row count +
   `reviewExercise` not called).
3. Worker claims with `FOR UPDATE SKIP LOCKED`, processes via `reviewExercise`,
   settles success/retry/dead with jittered exponential backoff → artifact
   assertion (source-grep for `FOR UPDATE SKIP LOCKED` + `2^attempts` in
   `review-worker.ts`) + live-behavior assertion (retry-then-succeed test from
   Phase 5).
4. Stuck `claimed` jobs are reclaimable after the visibility timeout →
   live-behavior assertion (Phase 3 `reclaim-stuck` test).
5. Dead jobs are admin-queryable and replayable; never surfaced as "reviewed" →
   live-behavior assertion (Phase 4 tests + the "review row stays `pending`"
   check).
6. Integration tests cover: happy path, retry-then-succeed, exhaust-to-dead,
   idempotent redelivery, two-worker single-processing → artifact assertion
   (the five Phase 5 test files exist and are GREEN).
7. `reviewedAt` terminal-stamping preserved → live-behavior assertion (Phase 3
   success-settle test asserts `reviewedAt` stamped; Phase 5 exhaust-to-dead
   test asserts `reviewedAt` NOT stamped).
8. No new external infra; quality gates green for the four filtered packages/app
   → live-behavior assertion (the filtered Turbo command exits 0).

### 7.4 Closeout gate

- `phase-6-reliability-acceptance.test.ts` GREEN.
- `pnpm turbo run {test,check-types,build} --filter=@reading-advantage/webhooks
  --filter=@reading-advantage/domain --filter=@reading-advantage/db
  --filter=codecamp-advantage` exits 0.
- `pnpm --filter codecamp-advantage exec next build` (or the in-repo build
  command) exits 0 — server-only / bundle-leak check (no `OPENROUTER_API_KEY` or
  `createOpenAI` strings in `.next/` chunks, mirroring the dependency track's
  Phase 6 build gate).
- `scripts/codecamp-pr-e2e.sh` adapted to the queued path (Mock provider) is
  documented. If the integration suite (Phase 5) supersedes it, the plan task
  records why (e.g. "the integration suite exercises the
  webhook→enqueue→worker→review→comment→DB loop with a Mock AIClient; the e2e
  script's real-GitHub-PR poll is not reproducible in CI and is deferred to
  manual prod QA").

### 7.5 Anti-pattern coverage

- **A3 (digit-only as labeled count):** the AC-6 assertion ("5 integration
  tests") must use a labeled count: `expect(testFileCount, "Phase 5 test file
  count: ${testFileCount}").toBe(5)`.
- **A4 (vacuous-pass on nothing-done):** the AC-8 assertion (filtered gates exit
  0) must FAIL if the Turbo command exits non-zero. The test should shell out to
  the Turbo command and assert exit 0 — not just assert the command string
  exists in the plan.
- **A5 (false-claim text vs test reality):** the plan task "all filtered gates
  green" must NOT be marked `[x]` unless the Turbo command actually exits 0.

### 7.6 Artifact vs. live-behavior

- AC-1, AC-6 are **artifact tests** (file existence + source-read).
- AC-2, AC-3, AC-4, AC-5, AC-7 are **live-behavior tests** (they exercise the
  pipeline).
- AC-8 is a **live-behavior test** (the Turbo command shell-out).

---

## 8. Phase 7 — Closeout

### 8.1 Red command

```bash
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-7-reliability-closeout.test.ts
```

### 8.2 Red expectations

The closeout test asserts the four bookkeeping tasks:

1. `measure/tech-debt.md` rows 2026-05-16 (retry/DLQ) and 2026-05-15 (no
   integration tests) are flipped to **Resolved** with the resolving commit(s)
   and track id `webhook_review_reliability_20260605`. The 2026-05-15 row has
   TWO sub-items (Duplicate `generateReview` — already Resolved by the
   dependency track; and "No integration tests" — this track resolves). Only the
   second sub-item is resolved by this track; the row text must distinguish them.
2. `measure/lessons-learned.md` has an entry tagged
   `(YYYY-MM-DD, webhook_review_reliability_20260605)` capturing the
   Postgres-`FOR UPDATE SKIP LOCKED`-as-Redis-free-queue lesson +
   visibility-timeout reclaim + idempotent webhook enqueue.
3. `measure/tracks.md` flips the `webhook_review_reliability_20260605` entry to
   `[x]` with the `./archive/webhook_review_reliability_20260605/` link; the
   track dir is moved from `measure/tracks/` to `measure/archive/`.
4. The latest commit touching the track dir has a `git notes` note mentioning
   the track id and the resolving commit(s).

Until the closeout owner performs these four tasks, the test is RED.

### 8.3 Green gate / Closeout gate

All four closeout tasks done. The test is GREEN. The track dir no longer exists
at `measure/tracks/`; `measure/archive/webhook_review_reliability_20260605/`
exists with the full artifact set (`plan.md`, `spec.md`, `metadata.json`,
`test-strategy.md`). `git notes show <closeout-commit>` prints the track summary.

### 8.4 Anti-pattern coverage

- **A5 (false-claim text vs test reality):** the plan task "tech-debt rows
  marked Resolved" must NOT be marked `[x]` unless the closeout test's
  tech-debt assertions are GREEN.
- **A8 (`[ ]` marker ambiguity):** the closeout plan tasks must use `[x]` when
  done, never `[ ]`.
- **A13 (stale track dir left in `measure/tracks/`):** the closeout test
  asserts `!existsSync(measure/tracks/webhook_review_reliability_20260605/)`.
  This is the A13 guard for this track.

### 8.5 Artifact vs. live-behavior

- All four closeout tasks are **artifact tests** (file-content + git-state
  reads). No live-behavior assertions in this phase.

---

## 9. Plan Corrections (for the orchestrator / plan-updater role)

The current `plan.md` is mostly correct but should be adjusted before Mid-Red
starts:

### 9.1 Phase 0

- Task 1 ("Confirm `codecamp_review_ai_consolidation_20260605` has landed") can
  be marked `[x]` after the Phase 0 probe (§1.1) exits 0. The dependency is
  archived; the seam exists.
- Task 4 ("Identify whether codecamp tables are tenant-scoped"): the answer is
  **REFERENTIAL (no schoolId)**. `review_jobs` carries no tenant key. Decided in
  §0.3.

### 9.2 Phase 1

- Task 1 should specify the canonical test home:
  `packages/db/src/__tests__/phase-1-review-jobs-schema.test.ts` +
  `phase-1-review-jobs-migration.test.ts`. The webhooks-package import smoke is
  optional.
- Task 3 should specify the migration file name: `0025_review_jobs.sql` (next
  after `0024_futuristic_vulture.sql`).
- Task 4 should add: "register `reviewJobs` as REFERENTIAL in
  `packages/domain/src/tenant-registry.ts` (FR-6 gate)."

### 9.3 Phase 2

- **NEW task:** "Rewrite `github-review.test.ts` 'preserves fire-and-forget
  posture' test (lines 361-389) and `phase-6-acceptance.test.ts` 'preserves the
  fire-and-forget posture' tests (lines 385-412, 414-441) to assert the new
  enqueue-then-ACK contract. The old contract (review row stamped 'reviewed' on
  failure) is the bug this track fixes." (See §0.8.)
- **NEW task:** "Decide the fate of `waitForBackgroundReviews` export in
  `github.ts`. Grep for consumers; if only the dependency-track tests use it,
  remove the export (and update the tests per §0.8). If other importers exist,
  keep it as a no-op shim."
- Task 3 should specify the idempotency key design (composite
  `(pr_owner, pr_repo, pr_pull_number)` is recommended — §0.6).

### 9.4 Phase 3

- Task 1 should specify: `claimDueJobs` uses `FOR UPDATE SKIP LOCKED` — the
  concurrency test is a live-DB integration test gated on `DIRECT_DATABASE_URL`.
  Mock-db cannot exercise row locks.
- Task 4 should specify: on the dead path, `updatePrReview` is NOT called with
  `reviewStatus: 'reviewed'`. The review row stays `pending`. (§0.7.)
- Task 6 should specify the env-gating convention for the scheduler: pick
  `REVIEW_WORKER_ENABLED=1` OR `NODE_ENV=production` and document the choice.
  Mirror `rate-limit-cleanup` (env-gated by application bootstrap). The worker
  MUST NOT start automatically in test environments (it would race the test
  suite's manual `run()` calls).

### 9.5 Phase 4

- Task 1 should specify the recommended design: tRPC `adminProcedure` on the
  codecamp router (`listDeadReviewJobs`, `requeueReviewJob`), matching
  `webhookEvents: adminProcedure`. The Hono `/admin/review-jobs` route is the
  alternative.
- Task 3 should specify: the requeue resets `attempts=0`, `next_attempt_at=now()`,
  `last_error=null`, `claimed_at=null`, `claimed_by=null`.

### 9.6 Phase 5

- Task 5 (concurrency) should specify: live-DB integration test, two workers,
  N=5 due jobs, assert each job processed exactly once. Gated on
  `DIRECT_DATABASE_URL`.

### 9.7 Phase 6

- Task 1 (`scripts/codecamp-pr-e2e.sh` adapted): the strategy recommends
  documenting that the Phase 5 integration suite supersedes the e2e script for
  CI purposes. The e2e script's real-GitHub-PR poll is not CI-runnable and is
  deferred to manual prod QA. The plan task should record this decision rather
  than require the script be modified.

### 9.8 Phase 7

- Task 1 should specify BOTH tech-debt rows: 2026-05-16 (retry/DLQ) AND 2026-05-15
  (no integration tests). The 2026-05-15 row has TWO sub-items (Duplicate
  `generateReview` — already Resolved by the dependency track; and "No
  integration tests" — this track resolves). Only the second sub-item is
  resolved by this track; the row text must distinguish them.
- Task 4 (`git notes`): the note should reference the resolving commit(s) for
  the worker + enqueue + DLQ implementation.

---

## 10. Issues for Mid-Red (handed off explicitly)

1. **Changed-contract test rewrite (§0.8):** the existing `github-review.test.ts`
   and `phase-6-acceptance.test.ts` fire-and-forget tests MUST be rewritten to
   assert the new enqueue-then-ACK contract. Do NOT preserve the "reviewed on
   failure" assertion — that is the bug being fixed. The rewrite is part of
   Phase 2, not a separate phase.

2. **Dependency-track tests are immutable (§0.9):** `phase-5-dead-code.test.ts`,
   `phase-6-acceptance.test.ts` (the OTHER tests in that file, not the
   fire-and-forget ones), and `phase-7-closeout.test.ts` belong to the archived
   `codecamp_review_ai_consolidation_20260605` track. Do NOT modify them. If a
   Phase 2 rewrite touches `phase-6-acceptance.test.ts`, only modify the
   fire-and-forget-posture tests (lines 385-412, 414-441); leave the rest intact.

3. **Live-DB integration tests (Phases 1, 3, 4, 5):** every test that exercises
   `FOR UPDATE SKIP LOCKED`, the unique-index idempotency, or the requeue
   mutation MUST be gated on `DIRECT_DATABASE_URL` via
   `(hasDirectDbUrl ? describe : describe.skip)`. Mock-db variants are
   acceptable for CI-without-Postgres but do not falsify the row-lock /
   unique-index claims. The live variants are the falsification.

4. **Migration sequence (Phase 1):** the next migration is `0025`. The journal
   entry must have `idx: 25`, `when > 1782627369208`, `tag: "0025_review_jobs"`.
   Follow `MIGRATION_LEDGER.md` hand-written protocol.

5. **Tenant-registry classification (Phase 1):** adding `reviewJobs` to the
   schema WITHOUT classifying it in `tenant-registry.ts` fails
   `tenant-coverage.test.ts` (FR-6 gate). Classify as REFERENTIAL.

6. **URL normalization (Phase 2):** the idempotency key must normalize the PR
   URL (lowercase owner/repo; or strip `.git`/trailing slash per design B). The
   `parsePrUrl` function does NOT normalize — the enqueue path must normalize
   before the upsert. Lessons-learned 2026-05-14.

7. **`reviewedAt` on the dead path (Phase 3):** the worker MUST NOT call
   `updatePrReview({ reviewStatus: 'reviewed' })` on failure. The review row
   stays `pending`. The DLQ state lives only on `review_jobs.status`. (§0.7.)

8. **Aggregate-suite handling (§0.10):** the webhooks aggregate is GREEN on
   baseline (82 tests). After Phase 2 Red, it will be RED from the new test
   files. This is expected. The aggregate must return to GREEN by end of Phase 5.
   If still RED after Phase 5, Phase 5 is not done. The broader monorepo
   aggregate has pre-existing REDs (reading-advantage, primary-advantage,
   advantage-games) — do NOT fix those.

9. **`codecamp-pr-e2e.sh` (Phase 6):** do NOT modify the script. Document that
   the Phase 5 integration suite supersedes it for CI. The script's
   real-GitHub-PR poll is deferred to manual prod QA.

10. **Worker env-gating (Phase 3):** pick `REVIEW_WORKER_ENABLED=1` OR
    `NODE_ENV=production` and document the choice. The worker MUST NOT start
    automatically in test environments (it would race the test suite's manual
    `run()` calls).

---

## 11. RED_TEST_COMMAND and GREEN_TEST_COMMAND (canonical)

### 11.1 RED_TEST_COMMAND (per phase)

```bash
# Phase 1 (schema + migration):
pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/phase-1-review-jobs-schema.test.ts \
  src/__tests__/phase-1-review-jobs-migration.test.ts

# Phase 2 (enqueue):
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-2-enqueue-idempotent.test.ts \
  src/__tests__/phase-2-enqueue-url-normalization.test.ts \
  src/__tests__/phase-2-webhook-acks-after-enqueue.test.ts

# Phase 3 (worker):
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-3-claim-skip-locked.test.ts \
  src/__tests__/phase-3-success-settle.test.ts \
  src/__tests__/phase-3-retry-backoff.test.ts \
  src/__tests__/phase-3-exhaust-to-dead.test.ts \
  src/__tests__/phase-3-reclaim-stuck.test.ts

# Phase 4 (admin DLQ):
pnpm --filter @reading-advantage/api exec vitest run \
  src/__tests__/phase-4-admin-list-dead-review-jobs.test.ts \
  src/__tests__/phase-4-admin-requeue-review-job.test.ts

# Phase 5 (integration):
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-5-happy-path.test.ts \
  src/__tests__/phase-5-retry-then-succeed.test.ts \
  src/__tests__/phase-5-exhaust-to-dead.test.ts \
  src/__tests__/phase-5-idempotent-redelivery.test.ts \
  src/__tests__/phase-5-concurrency.test.ts

# Phase 6 (acceptance):
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-6-reliability-acceptance.test.ts

# Phase 7 (closeout):
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-7-reliability-closeout.test.ts
```

### 11.2 GREEN_TEST_COMMAND (per phase)

Each phase's Green command is the same as its Red command (the test files are
the same; they go from RED to GREEN when Jr-Green implements the source). The
closeout-level Green command for each phase adds the full-suite + filtered-gate
checks:

```bash
# Phase 1 closeout:
pnpm --filter @reading-advantage/db exec vitest run \
  src/__tests__/phase-1-review-jobs-*.test.ts && \
pnpm --filter @reading-advantage/domain exec vitest run \
  src/__tests__/tenant-coverage.test.ts

# Phase 2 closeout:
pnpm --filter @reading-advantage/webhooks exec vitest run src/__tests__/phase-2-*.test.ts && \
pnpm --filter @reading-advantage/webhooks exec vitest run

# Phase 3 closeout:
pnpm --filter @reading-advantage/webhooks exec vitest run src/__tests__/phase-3-*.test.ts && \
pnpm --filter @reading-advantage/webhooks exec vitest run

# Phase 4 closeout:
pnpm --filter @reading-advantage/api exec vitest run src/__tests__/phase-4-*.test.ts

# Phase 5 closeout:
pnpm --filter @reading-advantage/webhooks exec vitest run src/__tests__/phase-5-*.test.ts && \
pnpm --filter @reading-advantage/webhooks exec vitest run

# Phase 6 closeout (full filtered gates):
pnpm turbo run test check-types build \
  --filter=@reading-advantage/webhooks \
  --filter=@reading-advantage/domain \
  --filter=@reading-advantage/db \
  --filter=codecamp-advantage

# Phase 7 closeout:
pnpm --filter @reading-advantage/webhooks exec vitest run \
  src/__tests__/phase-7-reliability-closeout.test.ts
```

### 11.3 Aggregate-suite handling (intentionally-red)

- **Baseline (HEAD = `f70628646697dd960acc383037d9f181fbb72391`):** webhooks
  aggregate GREEN (82 tests, 8 files).
- **After Phase 2 Red:** webhooks aggregate RED from new test files (source
  missing). This is the expected intentionally-red state.
- **After Phase 5 Green:** webhooks aggregate must return to GREEN. If still
  RED, Phase 5 is not done.
- **Monorepo `pnpm turbo run test` aggregate:** has pre-existing REDs in
  reading-advantage, primary-advantage, advantage-games (owner-labeled IRs —
  see `measure/tech-debt.md`). This track MUST NOT fix those. The closeout gate
  uses the filtered Turbo command (Phase 6 closeout, §11.2), not the full
  monorepo aggregate.

---

## 12. Summary — what the next roles must know

- **Mid-Red:** write the test files listed in §11.1 for the in-progress phase.
  Follow §10 (issues). Use labeled integer counts (A3), fail-on-nothing (A4),
  never mark a plan task `[x]` unless the cited test is GREEN (A5), use `[~]` /
  `[x]` markers only (A8). Do NOT modify the dependency-track tests (§0.9).
- **Jr-Green:** implement the source to make the Red tests GREEN. Do NOT
  reintroduce the fire-and-forget `reviewed`-on-failure behavior (§0.7). Use
  `createPrivilegedDb()` for the claim (§0.4). Classify `reviewJobs` as
  REFERENTIAL (§0.3).
- **Acceptance:** run the Phase 6 filtered Turbo command (§11.2). If it exits
  non-zero, Phase 6 is not done. Do NOT mark the plan task `[x]` otherwise (A5).
- **Closeout:** perform the four bookkeeping tasks (§8.2). The closeout test is
  the live evidence. Move the track dir to `measure/archive/` (A13).
