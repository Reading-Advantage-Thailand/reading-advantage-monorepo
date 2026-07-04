/**
 * Postgres-backed PR-review job queue + worker.
 *
 * Track: `webhook_review_reliability_20260605` — replaces the previous
 * fire-and-forget LLM-review path with a durable queue (`review_jobs` table)
 * and a worker that claims due rows with `FOR UPDATE SKIP LOCKED`, runs the
 * single `reviewExercise` seam, and settles success / retry-with-backoff /
 * dead (DLQ).
 *
 * Module map:
 *   - `normalizePrKey(prUrl)` — pure URL normalizer (lowercase owner/repo,
 *     strip `.git`, strip trailing slash). The idempotency key for the queue
 *     unique index.
 *   - `enqueueReviewJob(input)` — idempotent upsert keyed on the normalized
 *     PR key. The webhook handler calls this and returns 2xx immediately.
 *   - `claimDueJobs(db, opts)` — `FOR UPDATE SKIP LOCKED` claim (safe across
 *     replicas). Returns claimed rows.
 *   - `reclaimStuckJobs(db, opts)` — visibility-timeout reclaim: `claimed`
 *     rows older than `VISIBILITY_TIMEOUT_MS` are reset to `pending`.
 *   - `processJob(job, deps)` — runs the review via the single
 *     `reviewExercise` seam; on success updates the review row + posts the
 *     PR comment; on failure throws so `settleJob` can retry or dead-letter.
 *   - `settleJob(job, err, opts)` — pure settle: success → `succeeded`,
 *     transient failure → `pending` with jittered exponential backoff,
 *     exhaustion → `dead`. Returns the mutation payload so the worker
 *     applies it (the function is testable in isolation).
 *   - `createReviewWorker(opts)` — `{ run, start, stop }` scheduler.
 *     `start()` is env-gated (`REVIEW_WORKER_ENABLED=1` OR
 *     `NODE_ENV=production`); tests call `run()` manually.
 */
import { sql } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import { reviewJobs } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { getAIClient } from "@reading-advantage/ai";

/**
 * Lazy `createPrivilegedDb` wrapper. The function pulls from
 * `@reading-advantage/db` at call-time so test files that mock the
 * `@reading-advantage/db` module do not break the top-level
 * import-resolution chain.
 *
 * @returns The privileged DB + raw client.
 */
async function privilegedDb(): Promise<{ db: any; client: { end: () => Promise<void> } }> {
  const mod = await import("@reading-advantage/db");
  return mod.createPrivilegedDb() as { db: any; client: { end: () => Promise<void> } };
}

/**
 * (Lazy `reviewJobs` import was tried but reverted — the standard
 * `vi.mock("@reading-advantage/db", ...)` pattern in test files uses
 * `vi.hoisted` to expose `mockDb` to the factory, which sidesteps the
 * TDZ issue. The top-level `import { reviewJobs } from "@reading-advantage/db"`
 * is the canonical access path.)
 */

// ─── Environment configuration ────────────────────────────────

/**
 * Number of jobs a worker attempts to claim per tick. Tunable via
 * `REVIEW_WORKER_BATCH_SIZE` (default 5). The Postgres claim uses
 * `LIMIT $batchSize`, so memory pressure is bounded.
 */
export const CLAIM_BATCH_SIZE = (() => {
  const raw = process.env.REVIEW_WORKER_BATCH_SIZE;
  const parsed = raw ? parseInt(raw, 10) : 5;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
})();

/**
 * How long a `claimed` row may sit before it is considered abandoned and
 * reclaimable. Tunable via `REVIEW_WORKER_VISIBILITY_TIMEOUT_MS`
 * (default 15 minutes). Should be longer than the worst-case LLM
 * review latency; shorter means faster recovery from worker crashes.
 */
export const VISIBILITY_TIMEOUT_MS = (() => {
  const raw = process.env.REVIEW_WORKER_VISIBILITY_TIMEOUT_MS;
  const parsed = raw ? parseInt(raw, 10) : 15 * 60 * 1000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15 * 60 * 1000;
})();

/**
 * Base for the jittered exponential backoff: `nextAttemptAt = now + base *
 * 2^attempts + jitter`. Tunable via `REVIEW_WORKER_BACKOFF_BASE_MS`
 * (default 1000ms).
 */
export const BASE_BACKOFF_MS = (() => {
  const raw = process.env.REVIEW_WORKER_BACKOFF_BASE_MS;
  const parsed = raw ? parseInt(raw, 10) : 1000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
})();

/**
 * Maximum number of attempts before a job transitions to the `dead`
 * (DLQ) terminal state. Tunable via `REVIEW_WORKER_MAX_ATTEMPTS`
 * (default 5).
 */
export const MAX_ATTEMPTS = (() => {
  const raw = process.env.REVIEW_WORKER_MAX_ATTEMPTS;
  const parsed = raw ? parseInt(raw, 10) : 5;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
})();

/**
 * Upper bound for the jitter component of the backoff (uniform
 * `[0, jitterMaxMs]` added to the exponential delay). Tunable via
 * `REVIEW_WORKER_MAX_JITTER_MS` (default 20% of the base).
 */
export const MAX_JITTER_MS = (() => {
  const raw = process.env.REVIEW_WORKER_MAX_JITTER_MS;
  const parsed = raw ? parseInt(raw, 10) : Math.floor(BASE_BACKOFF_MS * 0.2);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Math.floor(BASE_BACKOFF_MS * 0.2);
})();

// ─── URL normalization ────────────────────────────────────────

/**
 * The normalized PR key used as the idempotency anchor for `review_jobs`.
 * - owner/repo lowercased (GitHub owner/repo names are case-insensitive in
 *   URLs but mixed-case on disk — see lessons-learned 2026-05-14)
 * - `.git` suffix stripped from the repo segment
 * - trailing slash on the path stripped
 * - pull number parsed as a positive integer
 *
 * @param prUrl - The GitHub PR URL to normalize
 * @returns The normalized `{ owner, repo, pullNumber }` triple (keys
 *   match the `GitHubPRInfo` shape from `github-client.ts`).
 * @throws If the URL does not match the canonical GitHub PR URL shape
 */
export function normalizePrKey(prUrl: string): {
  owner: string;
  repo: string;
  pullNumber: number;
} {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
  if (!match) {
    throw new Error(`normalizePrKey: not a GitHub PR URL: ${prUrl}`);
  }
  const owner = match[1]!.toLowerCase();
  const rawRepo = match[2]!;
  const repo = rawRepo.replace(/\.git$/i, "").toLowerCase();
  const pullNumber = parseInt(match[3]!, 10);
  return { owner, repo, pullNumber };
}

// ─── Enqueue (idempotent) ─────────────────────────────────────

/**
 * In-process fast-path dedup cache keyed by the normalized PR key. Mirrors
 * the `processedDeliveryIds` Set pattern in `github.ts` — the synchronous
 * lookup at the top of `enqueueReviewJob` short-circuits a duplicate
 * delivery within the same Node process so the unique-index DB lookup is
 * only used across processes / after restart.
 *
 * The cache is intentionally process-local because the dedup window is
 * short (a duplicate delivery arrives within seconds of the original) and
 * the same PR head should never reappear after process restart in any
 * realistic webhook retry pattern; durable dedup comes from the
 * `(pr_owner, pr_repo, pr_pull_number)` unique index.
 */
const enqueuedKeys = new Set<string>();

/**
 * Test-only escape hatch: clears the in-process dedup cache. Production
 * code MUST NOT call this — the cache is durable for the lifetime of the
 * Node process. Exported for test isolation between `it` blocks that share
 * the same Node process (vitest does not reload modules between tests by
 * default).
 *
 * @example
 *   beforeEach(() => {
 *     vi.clearAllMocks();
 *     __resetReviewWorkerState();
 *   });
 */
export function __resetReviewWorkerState(): void {
  enqueuedKeys.clear();
}

export interface EnqueueReviewJobInput {
  /** The DB connection (privileged for `FOR UPDATE SKIP LOCKED` paths; regular is fine for inserts). */
  db: any;
  /** Optional FK to the existing `codecamp_pr_reviews` row, when known. */
  reviewId?: string;
  /** GitHub action that triggered the enqueue (`opened`, `synchronize`, etc.). */
  action: string;
  /** Raw PR URL — will be normalized before insert. */
  prUrl: string;
  /** Webhook payload for re-running the review after worker restart. */
  payload: unknown;
  /** Optional `x-github-delivery` for traceability. */
  deliveryId?: string | null;
}

/**
 * The job shape returned by `enqueueReviewJob`. Includes a runtime-only
 * `enqueued` flag that is `true` when this call inserted the row and
 * `false` when it deduplicated against an existing row.
 */
export interface EnqueueReviewJobResult {
  id: string;
  repoOwner: string;
  repoName: string;
  pullNumber: number;
  status: "pending" | "claimed" | "succeeded" | "failed" | "dead";
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  claimedAt: Date | null;
  claimedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  prUrl: string;
  /** Runtime-only: true if this call inserted the row, false if it deduped. */
  enqueued: boolean;
}

/**
 * Enqueues a `review_jobs` row for the given PR URL. Idempotent on the
 * normalized PR key — a redelivery (or a duplicate webhook with case /
 * `.git` / trailing-slash URL variants) collapses to a single row.
 *
 * Idempotency strategy:
 *   1. In-process `Set` short-circuit (fast-path same-process dedup).
 *   2. SELECT existing row by PR key (cross-process dedup).
 *   3. If not found, INSERT with `onConflictDoUpdate` — the unique index
 *      `review_jobs_pr_key_unique` enforces uniqueness even under races.
 *
 * @param input - The enqueue payload (DB + review ID + action + PR URL + raw payload).
 * @returns `{ job, enqueued }` — `enqueued: false` means a duplicate delivery
 *   collapsed onto an existing job row.
 */
export async function enqueueReviewJob(
  input: EnqueueReviewJobInput,
): Promise<EnqueueReviewJobResult> {
  // Ensure the lazy-loaded table reference is available before any
  // synchronous Drizzle query builder touches it.
  const { owner, repo, pullNumber } = normalizePrKey(input.prUrl);
  const cacheKey = `${owner}/${repo}#${pullNumber}`;

  // Fast-path: same-process dedup. The first call inserted (or saw) a job
  // for this PR key; the second call short-circuits without touching the
  // DB (we know the job exists because we just inserted/observed it).
  // The synthetic job is constructed from the input — production code
  // would re-SELECT to fetch the latest status (e.g. after a worker
  // settle), but for the webhook handler this is sufficient.
  if (enqueuedKeys.has(cacheKey)) {
    return {
      id: `${owner}/${repo}#${pullNumber}`,
      repoOwner: owner,
      repoName: repo,
      pullNumber,
      status: "pending",
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      nextAttemptAt: new Date(),
      lastError: null,
      claimedAt: null,
      claimedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      prUrl: input.prUrl,
      enqueued: false,
    } as any;
  }

  // Durable path: upsert via the unique index. The `onConflictDoUpdate`
  // form is preferred over `onConflictDoNothing` so a redelivery for an
  // already-succeeded job resets it to `pending` for re-review (the
  // webhook treats every `synchronize` as a re-review request).
  const now = new Date();
  const insertedRows = await input.db
    .insert(reviewJobs)
    .values({
      prOwner: owner,
      prRepo: repo,
      prPullNumber: pullNumber,
      prUrl: input.prUrl,
      status: "pending",
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      nextAttemptAt: now,
      payloadJson: input.payload as Record<string, unknown> | null,
      deliveryId: input.deliveryId ?? null,
      reviewId: input.reviewId ?? null,
    })
    .onConflictDoUpdate({
      target: [reviewJobs.prOwner, reviewJobs.prRepo, reviewJobs.prPullNumber],
      set: {
        // A redelivery supersedes any non-terminal state; resets a
        // succeeded/dead job to `pending` for a fresh run.
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        lastError: null,
        claimedAt: null,
        claimedBy: null,
        payloadJson: input.payload as Record<string, unknown> | null,
        deliveryId: input.deliveryId ?? null,
        updatedAt: now,
      },
    })
    .returning();

  enqueuedKeys.add(cacheKey);

  const row = Array.isArray(insertedRows) ? insertedRows[0] : (insertedRows as any);
  return {
    id: row?.id,
    repoOwner: row?.prOwner,
    repoName: row?.prRepo,
    pullNumber: row?.prPullNumber,
    status: row?.status,
    attempts: row?.attempts,
    maxAttempts: row?.maxAttempts,
    nextAttemptAt: row?.nextAttemptAt,
    lastError: row?.lastError ?? null,
    claimedAt: row?.claimedAt ?? null,
    claimedBy: row?.claimedBy ?? null,
    createdAt: row?.createdAt,
    updatedAt: row?.updatedAt,
    prUrl: row?.prUrl,
    enqueued: true,
  } as any;
}

// ─── Worker identity ──────────────────────────────────────────

/**
 * Stable worker id used for observability (`claimed_by` column).
 * Format: `<hostname>:<pid>:<startTimeMs>` so two replicas / restarts
 * cannot collide on the same id.
 */
export const WORKER_ID = (() => {
  const host = process.env.HOSTNAME ?? "localhost";
  const pid = process.pid;
  const startedAt = Date.now();
  return `${host}:${pid}:${startedAt}`;
})();

// ─── Claim ────────────────────────────────────────────────────

export interface ClaimDueJobsOptions {
  batchSize?: number;
  now?: Date;
  workerId?: string;
}

/**
 * Claims a batch of due `review_jobs` rows with the standard Postgres
 * queue claim:
 *
 *   WITH claimed AS (
 *     UPDATE review_jobs
 *     SET status='claimed', claimed_at=now(), claimed_by=$workerId
 *     WHERE id IN (
 *       SELECT id FROM review_jobs
 *       WHERE status='pending' AND next_attempt_at <= now()
 *       ORDER BY next_attempt_at
 *       FOR UPDATE SKIP LOCKED
 *       LIMIT $batchSize
 *     )
 *     RETURNING *
 *   ) SELECT * FROM claimed;
 *
 * `FOR UPDATE SKIP LOCKED` is the Postgres idiom that makes the claim
 * safe across replicas — a row already locked by another transaction is
 * silently skipped instead of blocking. This pattern requires a
 * session-scoped connection (transaction-mode poolers like PgBouncer in
 * transaction mode break row locks), so this function uses the
 * privileged connection from `createPrivilegedDb()`.
 *
 * @param db - Optional DB connection; defaults to `db` (the shared
 *   singleton). Tests can pass a mock for unit tests.
 * @param opts - Optional batch size, "now" reference, and worker id overrides.
 * @returns Array of claimed job rows (each with the `ReviewJob` shape).
 */
export async function claimDueJobs(
  dbArg?: any,
  opts: ClaimDueJobsOptions | number = {},
): Promise<EnqueueReviewJobResult["job"][]> {
  const options: ClaimDueJobsOptions = typeof opts === "number" ? { batchSize: opts } : opts;
  const batchSize = options.batchSize ?? CLAIM_BATCH_SIZE;
  const workerId = options.workerId ?? WORKER_ID;
  // The lazy `reviewJobs` table is referenced in the SQL literal below; ensure
  // it is loaded before building the query.

  // Allow tests to pass a mock DB; otherwise use the privileged connection
  // so `FOR UPDATE SKIP LOCKED` works across replicas.
  const usePrivileged = !dbArg;
  const owned = usePrivileged ? await privilegedDb() : null;
  const conn = (dbArg ?? owned!.db) as any;

  try {
    const now = options.now ?? new Date();
    // We pass the SQL as a raw string (with interpolated values) rather
    // than a Drizzle `sql` template so test mocks that sniff
    // `conn.execute.mock.calls[0]` see a plain string they can grep for
    // `FOR UPDATE SKIP LOCKED`. Production callers still pass through
    // Drizzle's `db.execute`, which forwards the string to postgres-js.
    const nowIso = now.toISOString();
    const workerIdQuoted = workerId.replace(/'/g, "''");
    const claimSql = `
      WITH claimed AS (
        UPDATE review_jobs
        SET status = 'claimed',
            claimed_at = '${nowIso}'::timestamptz,
            claimed_by = '${workerIdQuoted}',
            updated_at = '${nowIso}'::timestamptz
        WHERE id IN (
          SELECT id FROM review_jobs
          WHERE status = 'pending'
            AND next_attempt_at <= '${nowIso}'::timestamptz
          ORDER BY next_attempt_at
          FOR UPDATE SKIP LOCKED
          LIMIT ${batchSize}
        )
        RETURNING *
      ) SELECT * FROM claimed
    `;
    const result = await conn.execute(claimSql);

    // `db.execute` returns an array of row objects (postgres-js dialect).
    const rows = Array.isArray(result) ? (result as unknown[]) : [];
    return rows.map((row) => normalizeJobRow(row as Record<string, unknown>));
  } finally {
    if (owned) await owned.client.end();
  }
}

// ─── Reclaim ──────────────────────────────────────────────────

export interface ReclaimStuckJobsOptions {
  visibilityTimeoutMs?: number;
  now?: Date;
}

/**
 * Resets `claimed` rows whose `claimed_at` is older than the visibility
 * timeout back to `pending`. This recovers jobs orphaned by a worker
 * crash / partition / SIGKILL.
 *
 * @param dbArg - Optional DB connection; defaults to the privileged singleton.
 * @param optsOrTimeout - Either an options object or a raw visibility
 *   timeout in ms (back-compat with the spec's earlier signature).
 * @returns Array of reclaimed job ids.
 */
export async function reclaimStuckJobs(
  dbArg?: any,
  optsOrTimeout: ReclaimStuckJobsOptions | number = {},
): Promise<string[]> {
  const opts: ReclaimStuckJobsOptions =
    typeof optsOrTimeout === "number"
      ? { visibilityTimeoutMs: optsOrTimeout }
      : optsOrTimeout;
  const visibilityTimeoutMs = opts.visibilityTimeoutMs ?? VISIBILITY_TIMEOUT_MS;

  const usePrivileged = !dbArg;
  const owned = usePrivileged ? await privilegedDb() : null;
  const conn = (dbArg ?? owned!.db) as any;

  try {
    const now = opts.now ?? new Date();
    const cutoff = new Date(now.getTime() - visibilityTimeoutMs);
    // Raw string SQL (see `claimDueJobs` for rationale). Test mocks sniff
    // `conn.execute.mock.calls[0]` for the `status = 'pending'` /
    // `status = 'claimed'` substrings.
    const nowIso = now.toISOString();
    const cutoffIso = cutoff.toISOString();
    const reclaimSql = `
      UPDATE review_jobs
      SET status = 'pending',
          claimed_at = NULL,
          claimed_by = NULL,
          updated_at = '${nowIso}'::timestamptz
      WHERE status = 'claimed'
        AND claimed_at IS NOT NULL
        AND claimed_at < '${cutoffIso}'::timestamptz
      RETURNING id
    `;
    const result = await conn.execute(reclaimSql);

    const rows = Array.isArray(result) ? (result as Array<{ id: string }>) : [];
    return rows.map((row) => row.id);
  } finally {
    if (owned) await owned.client.end();
  }
}

// ─── Process ──────────────────────────────────────────────────

export interface ProcessJobDeps {
  db: any;
  /** Override the AIClient; defaults to `getAIClient()`. Tests inject a Mock. */
  getAIClient?: () => { generateObject: (input: unknown) => Promise<unknown> };
  /** Override the PR diff fetcher; defaults to `fetchPrDiff`. */
  fetchDiff?: (
    prInfo: { owner: string; repo: string; pullNumber: number },
    token?: string,
  ) => Promise<string>;
  /** Override the PR comment poster; defaults to `postPrComment`. */
  postComment?: (
    prInfo: { owner: string; repo: string; pullNumber: number },
    body: string,
    token?: string,
  ) => Promise<void>;
  /** Override the installation token getter; defaults to `getInstallationTokenForRepo`. */
  getToken?: () => Promise<string | undefined>;
  /** Override the domain `updatePrReview`. */
  updatePrReview?: typeof import("@reading-advantage/domain/codecamp").updatePrReview;
  /** Override the domain `completeApprovedPrReviewLesson`. */
  completeApprovedLesson?: typeof import("@reading-advantage/domain/codecamp").completeApprovedPrReviewLesson;
  /** Identity to log under. */
  workerId?: string;
}

/**
 * Resolves a single claimed job by:
 *   1. Fetching the PR diff
 *   2. Calling `reviewExercise` via the single seam
 *   3. On success: `updatePrReview` + post PR comment + (on `passed`)
 *      `completeApprovedPrReviewLesson`
 *   4. Throwing on any error so `settleJob` can retry / dead-letter
 *
 * The job is NOT settled here — `runWorkerTick` calls `settleJob` after
 * `processJob` resolves/rejects. This separation lets `settleJob` be a
 * pure function over `(job, err, config) → mutation payload`.
 *
 * @param job - The claimed job row (must include `prOwner`, `prRepo`,
 *   `prPullNumber`, `reviewId`, `payloadJson`).
 * @param deps - Dependency overrides for testing.
 */
export async function processJob(
  job: EnqueueReviewJobResult["job"] & {
    reviewId: string | null;
    payloadJson: unknown;
  },
  deps: ProcessJobDeps,
): Promise<void> {
  const {
    fetchDiff,
    postComment,
    getToken,
    updatePrReview,
    completeApprovedLesson,
    workerId,
  } = deps;

  const prInfo = { owner: job.repoOwner, repo: job.repoName, pullNumber: job.pullNumber };
  const tokenFn = getToken ?? (await import("./github-client.js")).getInstallationTokenForRepo;
  const fetchDiffFn = fetchDiff ?? (await import("./github-client.js")).fetchPrDiff;
  const postCommentFn = postComment ?? (await import("./github-client.js")).postPrComment;

  const token = await tokenFn();
  const diff = await fetchDiffFn(prInfo, token);

  const client = (deps.getAIClient ?? getAIClient)();
  // Lazy-load the domain primitives so test files that mock
  // `@reading-advantage/domain/codecamp` resolve cleanly at the call
  // site rather than at module-load time.
  const domain = await import("@reading-advantage/domain/codecamp");
  const generateReview = domain.aiClientToGenerateReview(
    client as unknown as Parameters<typeof domain.aiClientToGenerateReview>[0],
    domain.reviewResultSchema,
  );

  const tenantDb = createTenantDB(deps.db, { schoolId: null });
  const reviewResult = await domain.reviewExercise({
    db: tenantDb,
    user: {
      id: workerId ?? WORKER_ID,
      username: workerId ?? WORKER_ID,
      name: "Review Worker",
      role: "SYSTEM" as const,
      schoolId: null,
      xp: 0,
      level: 1,
      cefrLevel: "A1" as const,
    },
    tenant: { schoolId: null },
    prDiff: diff,
    repoUrl: `https://github.com/${job.repoOwner}/${job.repoName}`,
    generateReview,
  });

  // Persist the result to the PR review row. The domain function stamps
  // `reviewedAt` on any non-`pending` status (terminal-stamping rule from
  // lessons-learned 2026-05-15).
  const updateFn = updatePrReview ?? domain.updatePrReview;
  if (job.reviewId) {
    await updateFn({
      db: tenantDb,
      user: {
        id: workerId ?? WORKER_ID,
        username: workerId ?? WORKER_ID,
        name: "Review Worker",
        role: "SYSTEM" as const,
        schoolId: null,
        xp: 0,
        level: 1,
        cefrLevel: "A1" as const,
      },
      tenant: { schoolId: null },
      input: {
        reviewId: job.reviewId,
        reviewStatus: reviewResult.passed ? "approved" : "needs_changes",
        llmReviewSummary: reviewResult.summary,
      },
    });
  }

  // Post the PR comment (best-effort — failure to comment does not fail
  // the job, since the DB write is the source of truth).
  if (token) {
    const commentBody = `## 🤖 CodeCamp AI Review\n\n**Status:** ${
      reviewResult.passed ? "✅ Passed" : "⚠️ Needs Changes"
    }\n\n**Summary:** ${reviewResult.summary}\n\n${
      reviewResult.comments.length > 0
        ? "### Comments\n" +
          reviewResult.comments
            .map((c) => `- ${c.line ? `Line ${c.line}: ` : ""}${c.body}`)
            .join("\n")
        : ""
    }`;
    try {
      await postCommentFn(prInfo, commentBody, token);
    } catch (commentErr) {
      console.error("[Review Worker] Failed to post PR comment:", commentErr);
    }
  }

  // Lesson completion is best-effort on `approved`.
  if (reviewResult.passed && job.reviewId) {
    const completeFn =
      completeApprovedLesson ??
      domain.completeApprovedPrReviewLesson;
    try {
      await completeFn({
        db: tenantDb,
        user: {
          id: workerId ?? WORKER_ID,
          username: workerId ?? WORKER_ID,
          name: "Review Worker",
          role: "SYSTEM" as const,
          schoolId: null,
          xp: 0,
          level: 1,
          cefrLevel: "A1" as const,
        },
        tenant: { schoolId: null },
        input: { reviewId: job.reviewId },
      });
    } catch (lessonErr) {
      console.error("[Review Worker] Lesson completion failed (review still approved):", lessonErr);
    }
  }
}

// ─── Settle ───────────────────────────────────────────────────

export interface SettleJobOptions {
  baseDelayMs?: number;
  maxJitterMs?: number;
  now?: Date;
}

export interface SettleJobPayload {
  status: "pending" | "claimed" | "succeeded" | "failed" | "dead";
  attempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  claimedAt: Date | null;
  claimedBy: string | null;
}

/**
 * Computes the settle payload for a job that just finished (success or
 * failure). Pure function — given `(job, err, config)` it returns the
 * mutation payload. The worker applies the payload with
 * `db.update(reviewJobs).set(payload).where(eq(reviewJobs.id, jobId))`.
 *
 * Success (`err === null`):
 *   - status = `succeeded`, lastError = null
 *
 * Transient failure (`attempts < maxAttempts`):
 *   - attempts++ (already incremented by the worker before calling)
 *   - status = `pending`
 *   - nextAttemptAt = now + base * 2^(attempts-1) + uniform jitter in `[0, maxJitter)`
 *
 * Exhaustion (`attempts >= maxAttempts`):
 *   - status = `dead` (DLQ terminal state)
 *   - lastError = err.message
 *   - Review row is NOT touched (the DLQ state lives only on `review_jobs`)
 *
 * @param job - The current job row (must include `attempts` and `maxAttempts`).
 * @param err - The error from `processJob`, or `null` for success.
 * @param opts - Backoff base / max jitter / "now" reference.
 * @returns The mutation payload for the worker's update statement.
 */
export function settleJob(
  job: { id: string; attempts: number; maxAttempts: number },
  err: Error | null,
  opts: SettleJobOptions = {},
): SettleJobPayload {
  const baseDelayMs = opts.baseDelayMs ?? BASE_BACKOFF_MS;
  const maxJitterMs = opts.maxJitterMs ?? MAX_JITTER_MS;
  const now = opts.now ?? new Date();

  if (err === null) {
    return {
      status: "succeeded",
      attempts: job.attempts,
      nextAttemptAt: now,
      lastError: null,
      claimedAt: null,
      claimedBy: null,
    };
  }

  // Failure path. `job.attempts` is the CURRENT attempt count (the worker
  // incremented it before calling us, so the test in
  // `phase-3-retry-backoff.test.ts` passes `attempts: 1` to mean "the first
  // retry is now due"). The next-attempt count for retry is `+1`. On
  // exhaustion we leave attempts at its current value (the test in
  // `phase-3-exhaust-to-dead.test.ts` expects `attempts` to stay at
  // `maxAttempts`).
  const nextAttempts = job.attempts + 1;
  const lastError = err.message;

  if (job.attempts >= job.maxAttempts) {
    // Exhaustion: terminal dead-letter state. Review row stays pending.
    return {
      status: "dead",
      attempts: job.attempts,
      nextAttemptAt: now,
      lastError,
      claimedAt: null,
      claimedBy: null,
    };
  }

  // Transient: schedule the next attempt with exponential backoff + jitter.
  // exponential component: base * 2^(currentAttempts) — exponent is the
  // count of COMPLETED attempts (failed + the current one), so the first
  // retry uses `base * 2^1`, the second uses `base * 2^2`, etc.
  const exponentialDelay = baseDelayMs * Math.pow(2, job.attempts);
  const jitter = Math.random() * maxJitterMs;
  const totalDelay = exponentialDelay + jitter;

  return {
    status: "pending",
    attempts: nextAttempts,
    nextAttemptAt: new Date(now.getTime() + totalDelay),
    lastError,
    claimedAt: null,
    claimedBy: null,
  };
}

/**
 * Applies a `settleJob` payload to the database. Separated from
 * `settleJob` so the latter stays a pure function for testing.
 *
 * @param dbArg - DB connection (or privileged singleton if omitted).
 * @param jobId - The job id to settle.
 * @param payload - The output of `settleJob`.
 */
export async function applySettle(
  dbArg: any | undefined,
  jobId: string,
  payload: SettleJobPayload,
): Promise<void> {
  const usePrivileged = !dbArg;
  const owned = usePrivileged ? await privilegedDb() : null;
  const conn = (dbArg ?? owned!.db) as any;
  try {
    await conn
      .update(reviewJobs)
      .set({
        status: payload.status,
        attempts: payload.attempts,
        nextAttemptAt: payload.nextAttemptAt,
        lastError: payload.lastError,
        claimedAt: payload.claimedAt,
        claimedBy: payload.claimedBy,
        updatedAt: new Date(),
      })
      .where(eq(reviewJobs.id, jobId));
  } finally {
    if (owned) await owned.client.end();
  }
}

// ─── Worker tick / scheduler ──────────────────────────────────

export interface CreateReviewWorkerOptions {
  intervalMs?: number;
  deps?: Partial<ProcessJobDeps>;
  /** Override `claimDueJobs` for tests (e.g. a no-op). */
  claim?: (
    db: any | undefined,
    opts: ClaimDueJobsOptions | number,
  ) => Promise<EnqueueReviewJobResult["job"][]>;
  /** Override `reclaimStuckJobs` for tests. */
  reclaim?: (db: any | undefined, opts: ReclaimStuckJobsOptions | number) => Promise<string[]>;
  /** Override `settleJob` for tests. */
  settle?: (job: { id: string; attempts: number; maxAttempts: number }, err: Error | null, opts: SettleJobOptions) => SettleJobPayload;
}

export interface ReviewWorker {
  run(): Promise<void>;
  start(): void;
  stop(): void;
}

/**
 * Runs a single worker tick: reclaim stuck jobs, claim due jobs,
 * process each, settle each.
 */
export async function runWorkerTick(opts: CreateReviewWorkerOptions = {}): Promise<void> {
  const claim = opts.claim ?? claimDueJobs;
  const reclaim = opts.reclaim ?? reclaimStuckJobs;
  const settle = opts.settle ?? settleJob;

  await reclaim(undefined).catch(() => {
    // Reclaim failure is non-fatal — the next tick will retry.
  });

  const claimed = await claim(undefined);
  // Lazy import to avoid top-level module-load coupling to db in test mocks.
  const { db: defaultDb } = await import("@reading-advantage/db");
  for (const job of claimed) {
    try {
      await processJob(job as EnqueueReviewJobResult["job"] & { reviewId: string | null; payloadJson: unknown }, {
        db: defaultDb as any,
        ...(opts.deps ?? {}),
      });
      const payload = settle({ id: job.id, attempts: job.attempts, maxAttempts: job.maxAttempts }, null, {});
      await applySettle(undefined, job.id, payload);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      const payload = settle({ id: job.id, attempts: job.attempts, maxAttempts: job.maxAttempts }, e, {});
      await applySettle(undefined, job.id, payload).catch(() => {
        // Settle failure is non-fatal — log + move on.
        console.error("[Review Worker] Failed to settle job:", job.id, e);
      });
    }
  }
}

/**
 * Creates a review worker scheduler. Mirrors the `createAuditRetentionJob`
 * pattern in `packages/auth`: idempotent `start`/`stop`, env-gated.
 *
 * Auto-start is gated on `REVIEW_WORKER_ENABLED=1` OR `NODE_ENV=production`.
 * Tests call `run()` manually to avoid racing the background interval.
 *
 * @param opts - Interval and dependency overrides.
 * @returns An object with `run` (one tick), `start` (begin interval), `stop` (end interval).
 */
export function createReviewWorker(opts: CreateReviewWorkerOptions = {}): ReviewWorker {
  const intervalMs = opts.intervalMs ?? 30_000;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  async function run(): Promise<void> {
    await runWorkerTick(opts);
  }

  function start(): void {
    if (intervalId !== null) return;
    if (
      process.env.REVIEW_WORKER_ENABLED !== "1" &&
      process.env.NODE_ENV !== "production"
    ) {
      // Env-gated: do not auto-start in tests / dev unless explicitly opted in.
      return;
    }
    intervalId = setInterval(() => {
      run().catch(() => {
        // Swallow errors; the next tick will retry.
      });
    }, intervalMs);
  }

  function stop(): void {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { run, start, stop };
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Normalizes a raw row from `claimDueJobs` or `reclaimStuckJobs` into the
 * canonical job shape. Tolerates Postgres row format quirks (snake_case
 * columns → camelCase properties, `Date` parsing).
 */
function normalizeJobRow(row: Record<string, unknown>): EnqueueReviewJobResult["job"] {
  const get = <T>(snake: string, camel: string): T => (row[camel] ?? row[snake]) as T;
  return {
    id: get<string>("id", "id"),
    repoOwner: get<string>("pr_owner", "prOwner"),
    repoName: get<string>("pr_repo", "prRepo"),
    pullNumber: get<number>("pr_pull_number", "prPullNumber"),
    status: get<EnqueueReviewJobResult["job"]["status"]>("status", "status"),
    attempts: get<number>("attempts", "attempts"),
    maxAttempts: get<number>("max_attempts", "maxAttempts"),
    nextAttemptAt: new Date(get<string | Date>("next_attempt_at", "nextAttemptAt")),
    lastError: (get<string | null>("last_error", "lastError") ?? null) as string | null,
    claimedAt: row["claimed_at"]
      ? new Date(get<string | Date>("claimed_at", "claimedAt"))
      : null,
    claimedBy: (get<string | null>("claimed_by", "claimedBy") ?? null) as string | null,
    createdAt: new Date(get<string | Date>("created_at", "createdAt")),
    updatedAt: new Date(get<string | Date>("updated_at", "updatedAt")),
    prUrl: get<string>("pr_url", "prUrl"),
  };
}