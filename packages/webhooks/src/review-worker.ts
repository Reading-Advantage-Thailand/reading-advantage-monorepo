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
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { eq, and, isNull } from "drizzle-orm";
import { reviewJobs } from "@reading-advantage/db";
import type { DB } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import * as codecampDomain from "@reading-advantage/domain/codecamp";
import { getAIClient } from "@reading-advantage/ai";

/**
 * A privileged (direct-connection) DB handle plus its raw postgres client.
 * Mirrors the `PrivilegedConnection` shape used by
 * `packages/auth/src/rate-limit-cleanup.ts` and `audit-retention-job.ts` so
 * `FOR UPDATE SKIP LOCKED` / advisory-lock paths get a session-scoped
 * connection (transaction-mode poolers break those features).
 */
interface PrivilegedConnection {
  db: DB;
  client: { end: () => Promise<void> };
}

/**
 * Lazy `createPrivilegedDb` wrapper. The function pulls from
 * `@reading-advantage/db` at call-time so test files that mock the
 * `@reading-advantage/db` module do not break the top-level
 * import-resolution chain.
 *
 * @returns The privileged DB + raw client.
 */
async function privilegedDb(): Promise<PrivilegedConnection> {
  const mod = await import("@reading-advantage/db");
  return mod.createPrivilegedDb() as PrivilegedConnection;
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
  // Anchored at start-of-string: require an http(s):// scheme followed by
  // the github.com host (or www.github.com) so URLs like
  // `ftp://github.com/...` or `https://github.corp.example.com/...` (which
  // contain `github.com/` as a substring) are rejected. The trailing
  // delimiter class `(?=$|/|\?|#)` ensures the captured PR number is the
  // full segment — `pull/1.5` would otherwise match as `pull/1`.
  const match = prUrl.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?=$|[/?#])/i,
  );
  if (!match) {
    throw new Error(`normalizePrKey: not a GitHub PR URL: ${prUrl}`);
  }
  const owner = match[1]!.toLowerCase();
  const rawRepo = match[2]!;
  const repo = rawRepo.replace(/\.git$/i, "").toLowerCase();
  const pullNumber = parseInt(match[3]!, 10);
  if (pullNumber <= 0) {
    // The regex captures `\d+` (>= 0); we additionally reject zero here so
    // the idempotency key can never be `owner/repo#0` (no such thing on
    // GitHub — pull numbers are positive integers).
    throw new Error(`normalizePrKey: PR number must be positive: ${prUrl}`);
  }
  return { owner, repo, pullNumber };
}

/**
 * Retained as a compatibility hook for older tests. Queue idempotency is
 * durable now, so there is no process-local state to reset.
 * @returns Nothing; durable queue state is intentionally untouched.
 */
export function __resetReviewWorkerState(): void {
  // Intentionally empty: never reintroduce process-local synchronization.
}

export interface EnqueueReviewJobInput {
  /** The DB connection (privileged for `FOR UPDATE SKIP LOCKED` paths; regular is fine for inserts). */
  db: DB;
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
 * The job shape returned by `enqueueReviewJob`. The runtime-only `enqueued`
 * flag remains for transport compatibility and is true after the durable
 * upsert completes, including when the unique key conflicted.
 */
export interface ReviewJob {
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
  /** GitHub delivery identity captured by the claim's durable queue row. */
  deliveryId: string | null;
  /** FK to `codecamp_pr_reviews.id`. Nullable: the review row may not exist yet. */
  reviewId: string | null;
  /** Full webhook payload for re-running the review after worker restart. */
  payloadJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  prUrl: string;
  /** Runtime-only: true if this call inserted the row, false if it deduped. */
  enqueued: boolean;
}

/**
 * @deprecated Use `ReviewJob` (the result IS the job — we no longer wrap it).
 * Kept as a back-compat alias for callers that haven't migrated yet.
 */
export type EnqueueReviewJobResult = ReviewJob;

/**
 * Enqueues a `review_jobs` row for the given PR URL. Idempotent on the
 * normalized PR key — a redelivery (or a duplicate webhook with case /
 * `.git` / trailing-slash URL variants) collapses to a single row.
 *
 * Idempotency strategy: INSERT with `onConflictDoUpdate`; the unique index
 * `review_jobs_pr_key_unique` enforces uniqueness while updating the latest
 * webhook payload and head on every redelivery.
 *
 * @param input - The enqueue payload (DB + review ID + action + PR URL + raw payload).
 * @returns The job result after the durable upsert completes.
 */
export async function enqueueReviewJob(
  input: EnqueueReviewJobInput,
): Promise<EnqueueReviewJobResult> {
  // Ensure the lazy-loaded table reference is available before any
  // synchronous Drizzle query builder touches it.
  const { owner, repo, pullNumber } = normalizePrKey(input.prUrl);

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
        prUrl: input.prUrl,
        payloadJson: input.payload as Record<string, unknown> | null,
        deliveryId: input.deliveryId ?? null,
        updatedAt: now,
        ...(input.reviewId != null ? { reviewId: input.reviewId } : {}),
      },
    })
    .returning();

  const row: Partial<typeof reviewJobs.$inferSelect> | undefined = Array.isArray(insertedRows)
    ? insertedRows[0]
    : (insertedRows as Partial<typeof reviewJobs.$inferSelect> | undefined);
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
    deliveryId: row?.deliveryId ?? null,
    reviewId: row?.reviewId ?? null,
    payloadJson: row?.payloadJson ?? null,
    createdAt: row?.createdAt,
    updatedAt: row?.updatedAt,
    prUrl: row?.prUrl,
    enqueued: true,
  } as ReviewJob;
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

// ─── Input validation helpers ─────────────────────────────────

/**
 * Validates that `value` is a positive integer. Strings that parse to a
 * positive integer are accepted; all other values throw.
 *
 * @param value - The value to validate.
 * @param name - Parameter name for error messages.
 * @returns A positive integer.
 * @throws When `value` is not a positive integer.
 */
function validatePositiveInteger(value: unknown, name: string): number {
  let parsed: number;
  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string") {
    parsed = parseInt(value, 10);
  } else {
    throw new Error(`${name} must be a positive integer`);
  }
  if (!Number.isFinite(parsed) || parsed <= 0 || Math.floor(parsed) !== parsed) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

const SAFE_WORKER_ID_PATTERN = /^[a-zA-Z0-9_:.-]{1,256}$/;

/**
 * Validates that `value` is a safe worker identifier. Falls back to
 * `fallback` when value is missing. The allowed character set is
 * intentionally restrictive to keep the value safe inside SQL parameters.
 *
 * @param value - The worker id to validate.
 * @param fallback - The fallback worker id (must already be safe).
 * @returns A safe worker id string.
 * @throws When the resolved id contains disallowed characters.
 */
function validateWorkerId(value: unknown, fallback: string): string {
  const id = typeof value === "string" && value.length > 0 ? value : fallback;
  if (!SAFE_WORKER_ID_PATTERN.test(id)) {
    throw new Error(`workerId contains unsafe characters`);
  }
  return id;
}

/**
 * Creates the lease value written to `review_jobs.claimed_by` for one claim
 * operation. The stable worker identity remains the prefix for observability,
 * while the nonce prevents a visibility reclaim in the same process from
 * making an older lease look current.
 * @param workerId Stable worker identity used for observability.
 * @returns A fresh, SQL-safe lease identity.
 */
function createReviewLeaseId(workerId: string): string {
  const leaseId = `${workerId}:${randomUUID()}`;
  if (!SAFE_WORKER_ID_PATTERN.test(leaseId)) {
    throw new Error("worker lease identity contains unsafe characters");
  }
  return leaseId;
}

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
 *     SET status='claimed', claimed_at=now(), claimed_by=$leaseId
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
 * @param opts - Optional batch size, "now" reference, and base worker id overrides.
 * @returns Array of claimed job rows (each with the `ReviewJob` shape).
 */
export async function claimDueJobs(
  dbArg?: DB,
  opts: ClaimDueJobsOptions | number = {},
): Promise<ReviewJob[]> {
  const options: ClaimDueJobsOptions = typeof opts === "number" ? { batchSize: opts } : opts;
  const batchSize = validatePositiveInteger(options.batchSize ?? CLAIM_BATCH_SIZE, "batchSize");
  const workerId = validateWorkerId(options.workerId, WORKER_ID);
  // A fresh nonce is part of every claim operation. Reclaiming and claiming
  // the same row again in this process must produce a different lease value.
  const leaseId = createReviewLeaseId(workerId);

  // Allow tests to pass a mock DB; otherwise always use the privileged
  // (direct) connection so `FOR UPDATE SKIP LOCKED` row locks work across
  // replicas. The pooled `db` singleton may be behind a transaction-mode
  // pooler that breaks session-scoped locks.
  let conn: DB | undefined = dbArg;
  let owned: PrivilegedConnection | null = null;
  if (!conn || typeof conn.execute !== "function") {
    owned = await privilegedDb();
    conn = owned!.db;
  }

  try {
    const now = options.now ?? new Date();
    const nowIso = now.toISOString();
    // Parameterized query: all variable values are sent as query parameters,
    // eliminating SQL injection risk on batchSize, workerId, and timestamps.
    const claimSql = sql`
      WITH claimed AS (
        UPDATE review_jobs
        SET status = 'claimed',
            claimed_at = ${nowIso}::timestamptz,
            claimed_by = ${leaseId},
            updated_at = ${nowIso}::timestamptz
        WHERE id IN (
          SELECT id FROM review_jobs
          WHERE status = 'pending'
            AND next_attempt_at <= ${nowIso}::timestamptz
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
  dbArg?: DB,
  optsOrTimeout: ReclaimStuckJobsOptions | number = {},
): Promise<string[]> {
  const opts: ReclaimStuckJobsOptions =
    typeof optsOrTimeout === "number"
      ? { visibilityTimeoutMs: optsOrTimeout }
      : optsOrTimeout;
  const visibilityTimeoutMs = validatePositiveInteger(
    opts.visibilityTimeoutMs ?? VISIBILITY_TIMEOUT_MS,
    "visibilityTimeoutMs",
  );

  // Allow tests to pass a mock DB; otherwise always use the privileged
  // (direct) connection for the same lock/session-scoping reason as
  // `claimDueJobs`.
  let conn: DB | undefined = dbArg;
  let owned: PrivilegedConnection | null = null;
  if (!conn || typeof conn.execute !== "function") {
    owned = await privilegedDb();
    conn = owned!.db;
  }

  try {
    const now = opts.now ?? new Date();
    const cutoff = new Date(now.getTime() - visibilityTimeoutMs);
    const nowIso = now.toISOString();
    const cutoffIso = cutoff.toISOString();
    // Parameterized query: timestamps are sent as query parameters, not
    // interpolated, so a malformed `now` value cannot inject SQL.
    const reclaimSql = sql`
      UPDATE review_jobs
      SET status = 'pending',
          claimed_at = NULL,
          claimed_by = NULL,
          updated_at = ${nowIso}::timestamptz
      WHERE status = 'claimed'
        AND claimed_at IS NOT NULL
        AND claimed_at < ${cutoffIso}::timestamptz
      RETURNING id
    `;
    const result = await conn.execute(reclaimSql);

    const rows = Array.isArray(result) ? (result as unknown as Array<{ id: string }>) : [];
    return rows.map((row) => row.id);
  } finally {
    if (owned) await owned.client.end();
  }
}

// ─── Process ──────────────────────────────────────────────────

export interface ProcessJobDeps {
  db: DB;
  /** Override the AIClient; defaults to `getAIClient()`. Tests inject a Mock. */
  getAIClient?: () => {
    generateObject: (input: unknown) => Promise<unknown>;
    generateObjectWithProvenance?: (input: unknown) => Promise<unknown>;
  };
  /** Override the PR diff fetcher; defaults to `fetchPrDiff`. */
  fetchDiff?: (
    prInfo: { owner: string; repo: string; pullNumber: number },
    token?: string,
  ) => Promise<string>;
  /** Override the bounded GitHub Check Runs fetcher used for deterministic context. */
  fetchCheckEvidence?: (
    prInfo: { owner: string; repo: string; pullNumber: number },
    headSha: string,
    token?: string,
  ) => Promise<{
    availability: "available" | "unavailable";
    reason: "github_token_unavailable" | "github_check_runs_unavailable" | "missing_head_sha" | null;
    checkRuns: Array<{
      name: string;
      status: "queued" | "in_progress" | "completed";
      conclusion: "action_required" | "cancelled" | "failure" | "neutral" | "skipped" | "stale" | "success" | "timed_out" | null;
      detailsUrl: string | null;
    }>;
  }>;
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
  /** Resolve fail-closed model execution and learner-visible feedback policy. */
  resolveRollout?: () => import("@reading-advantage/domain/codecamp").PrEvaluationRuntimeRollout;
  /**
   * Check whether this worker still owns the durable claim immediately before
   * a persistence or learner-visible side effect. The production default
   * reads `review_jobs`; tests may inject a deterministic race seam.
   */
  isCurrentClaim?: (claim: ReviewJobClaimIdentity) => Promise<boolean>;
  /** Identity to log under. */
  workerId?: string;
}

/**
 * Durable identity of one review-job lease.
 * @property id The queue row identifier.
 * @property status The required claimed status.
 * @property claimedBy The worker lease owner.
 * @property deliveryId The webhook delivery version, or null for legacy rows.
 */
export interface ReviewJobClaimIdentity {
  id: string;
  status: "claimed";
  claimedBy: string | null | undefined;
  deliveryId: string | null | undefined;
}

/**
 * Reads the queue row and verifies that the worker still owns the same lease.
 * Minimal test doubles without a query surface are treated as compatibility
 * fixtures; a real database connection always takes the durable branch.
 * @param db The database connection containing the queue row.
 * @param claim The claimed row identity to compare.
 * @returns Whether the claim is still current.
 */
async function isCurrentReviewJobClaim(
  db: DB,
  claim: ReviewJobClaimIdentity,
): Promise<boolean> {
  if (typeof db.select !== "function") return true;
  // Older unit fixtures predate the durable lease fields and omit them from
  // their hand-built job objects. `claimDueJobs` always normalizes both
  // fields before production processing, so this compatibility branch does
  // not weaken the real queue path.
  if (claim.claimedBy === undefined || claim.deliveryId === undefined) return true;
  if (!claim.id || !claim.claimedBy) return false;

  const deliveryPredicate = claim.deliveryId == null
    ? isNull(reviewJobs.deliveryId)
    : eq(reviewJobs.deliveryId, claim.deliveryId);
  const rows = await db
    .select({ id: reviewJobs.id })
    .from(reviewJobs)
    .where(and(
      eq(reviewJobs.id, claim.id),
      eq(reviewJobs.status, "claimed"),
      eq(reviewJobs.claimedBy, claim.claimedBy),
      deliveryPredicate,
    ));
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Renders bounded graph-authorized objective evidence as advisory Markdown.
 * @param review Validated review result with diff-backed objective references.
 * @returns Empty text when the repository has no graph-bound PR objective evidence.
 */
export function renderAdvisoryObjectiveEvidence(
  review: import("@reading-advantage/domain/codecamp").ReviewResult,
): string {
  const objectiveEvidence = review.objectiveEvidence ?? [];
  if (objectiveEvidence.length === 0) return "";
  return "### Objective evidence (advisory)\n" + objectiveEvidence.map((objective) => {
    const references = objective.references
      .map((reference) => `\`${reference.filePath}:${reference.startLine}-${reference.endLine}\``)
      .join(", ");
    return `- \`${objective.objectiveId}\`: ${objective.score}/100 advisory score (${objective.confidence}% confidence); references ${references}`;
  }).join("\n");
}

/**
 * Resolves a single claimed job by:
 *   1. Fetching the PR diff
 *   2. Calling `reviewExercise` via the single seam
 *   3. On success: store advisory `reviewed` feedback and post the PR comment
 *   4. Throwing on any error so `settleJob` can retry / dead-letter
 *
 * The job is NOT settled here — `runWorkerTick` calls `settleJob` after
 * `processJob` resolves/rejects. This separation lets `settleJob` be a
 * pure function over `(job, err, config) → mutation payload`.
 *
 * @param job - The claimed job row (must include `prOwner`, `prRepo`,
 *   `prPullNumber`, `reviewId`, `payloadJson`).
 * @param deps - Dependency overrides for testing.
 * @returns True when the claimed job completed; false when its lease was
 * superseded before a side effect and the caller must leave the newer claim
 * untouched.
 */
export async function processJob(
  job: ReviewJob,
  deps: ProcessJobDeps,
): Promise<boolean> {
  const {
    fetchDiff,
    postComment,
    getToken,
    updatePrReview,
    workerId,
  } = deps;

  if (typeof job.reviewId !== "string" || job.reviewId.trim().length === 0) {
    throw createPermanentReviewContractError("Review job is missing its persisted review relationship");
  }

  const prInfo = { owner: job.repoOwner, repo: job.repoName, pullNumber: job.pullNumber };
  const domain = codecampDomain;
  const rollout = (deps.resolveRollout ?? domain.resolvePrEvaluationRuntimeRollout)();
  if (!rollout.runModel) return true;
  const shouldPublishFeedback = rollout.mayPublishFeedback && (
    rollout.mode !== "canary" || domain.isPrEvaluationCanarySelected(job.id, rollout.canaryPercent)
  );
  const githubClient = await import("./github-client");
  const tokenFn = getToken ?? githubClient.getInstallationTokenForRepo;
  const fetchDiffFn = fetchDiff ?? githubClient.fetchPrDiff;
  const postCommentFn = postComment ?? githubClient.postPrComment;
  const fetchCheckEvidenceFn = deps.fetchCheckEvidence ?? githubClient.fetchPrCheckEvidence;
  const claimIdentity: ReviewJobClaimIdentity = {
    id: job.id,
    status: "claimed",
    claimedBy: job.claimedBy,
    deliveryId: job.deliveryId,
  };
  const isCurrentClaim = deps.isCurrentClaim
    ?? ((claim: ReviewJobClaimIdentity) => isCurrentReviewJobClaim(deps.db, claim));

  const token = await tokenFn();
  const diff = await fetchDiffFn(prInfo, token);
  const prepared = domain.prepareReviewDiff(diff);
  // An empty stripped diff is a deterministic skip. Surface it as a
  // typed marker so the durable queue can settle `skipped_generated`
  // without invoking the model. The marker carries the removed paths
  // so the read path can derive the operational status durably.
  if (prepared.empty) {
    throw Object.assign(new Error("PR diff contained only generated artifacts"), {
      code: "CODECAMP_REVIEW_DIFF_SKIPPED" as const,
      reason: prepared.removedPaths.length > 0
        ? `[SKIPPED_GENERATED] ${prepared.removedPaths.join(", ")}`
        : "[SKIPPED_GENERATED]",
      removedPaths: prepared.removedPaths,
    });
  }
  const headSha = readHeadSha(job.payloadJson);
  const deterministicChecks = headSha
    ? await fetchCheckEvidenceFn(prInfo, headSha, token)
    : { availability: "unavailable" as const, reason: "missing_head_sha" as const, checkRuns: [] };

  const client = (deps.getAIClient ?? getAIClient)();
  let provenance: import("@reading-advantage/domain/codecamp").ReviewGenerationProvenance | null = null;
  const generateReview = typeof client.generateObjectWithProvenance === "function"
    ? async (system: string, prompt: string) => {
      const generation = await domain.aiClientToGenerateReviewWithProvenance(
        client as unknown as Parameters<typeof domain.aiClientToGenerateReviewWithProvenance>[0],
        domain.reviewResultGenerationSchema,
      )(system, prompt);
      provenance = generation.provenance;
      return generation.review;
    }
    : domain.aiClientToGenerateReview(
      client as unknown as Parameters<typeof domain.aiClientToGenerateReview>[0],
      domain.reviewResultGenerationSchema,
    );

  const tenantDb = createTenantDB(deps.db, { schoolId: null });
  const priorAttempts = job.reviewId
    ? await domain.listPriorPrReviewAttempts({
      db: tenantDb,
      user: {
        id: workerId ?? WORKER_ID, username: workerId ?? WORKER_ID, name: "Review Worker",
        role: "SYSTEM" as const, schoolId: null, xp: 0, level: 1, cefrLevel: "A1" as const,
      },
      tenant: { schoolId: null },
      input: { reviewId: job.reviewId, excludeHeadSha: headSha },
    })
    : [];
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
    reviewId: job.reviewId,
    trustedContext: {
      schemaVersion: "codecamp.pr-review-context.v1",
      pullRequest: { number: job.pullNumber, headSha },
      deterministicChecks,
      priorAttempts,
    },
    generateReview,
  });

  // Persist the result to the PR review row. The domain function stamps
  // `reviewedAt` on any non-`pending` status (terminal-stamping rule from
  // lessons-learned 2026-05-15).
  const updateFn = updatePrReview ?? domain.updatePrReview;
  const reviewUser = {
    id: workerId ?? WORKER_ID,
    username: workerId ?? WORKER_ID,
    name: "Review Worker",
    role: "SYSTEM" as const,
    schoolId: null,
    xp: 0,
    level: 1,
    cefrLevel: "A1" as const,
  };
  const trustedContext = {
    schemaVersion: "codecamp.pr-review-context.v1",
    reviewJobId: job.id,
    repository: `${job.repoOwner}/${job.repoName}`,
    pullRequest: { number: job.pullNumber, headSha },
    deterministicChecks,
    priorAttempts,
    evidenceAuthority: "advisory_model" as const,
  };
  const objectiveEvidence = renderAdvisoryObjectiveEvidence(reviewResult);
  const removedPaths = Array.isArray((reviewResult as { removedPaths?: unknown }).removedPaths)
    ? (reviewResult as { removedPaths: string[] }).removedPaths
    : [];
  const removedPathsSection = removedPaths.length > 0
    ? `\n\n### Ignored paths\nThe following generated paths were stripped from the diff before review and do not belong in a commit:\n${removedPaths.map((path) => `- \`${path}\``).join("\n")}`
    : "";
  const commentBody = `## 🤖 CodeCamp AI Review\n\n**Status:** ℹ️ Advisory feedback — this review does not approve, block, or create mastery evidence.\n\n**Summary:** ${reviewResult.summary}\n\n${
    reviewResult.comments.length > 0
      ? "### Comments\n" +
        reviewResult.comments
          .map((c) => `- ${c.line ? `Line ${c.line}: ` : ""}${c.body}`)
          .join("\n")
      : ""
  }${objectiveEvidence ? `\n\n${objectiveEvidence}` : ""}${removedPathsSection}`;

  /**
   * Persists review evidence and publishes feedback against one database
   * handle. When `verifyClaim` is true this compatibility path rechecks the
   * injected lease seam between side effects; the production transaction
   * path holds the queue-row lock instead.
   * @param writeDb Database handle, optionally the active transaction.
   * @param verifyClaim Whether to use the compatibility claim-check seam.
   * @returns Whether this worker completed the side effects for its claim.
   */
  const persistAndPublish = async (writeDb: DB, verifyClaim: boolean): Promise<boolean> => {
    const writeTenantDb = createTenantDB(writeDb, { schoolId: null });
    const claimIsCurrent = async (): Promise<boolean> => {
      if (!verifyClaim) return true;
      return isCurrentClaim(claimIdentity);
    };

    if (job.reviewId && headSha) {
      // The production transaction already owns the queue-row lock. The
      // compatibility path retains the injected seam for focused unit tests.
      if (!await claimIsCurrent()) return false;
      await domain.recordAdvisoryPrReviewAttempt({
        db: writeTenantDb,
        user: reviewUser,
        tenant: { schoolId: null },
        input: {
          reviewId: job.reviewId,
          headSha,
          idempotencyKey: `codecamp-pr-review:${job.reviewId}:${headSha}:advisory-model.v1`,
          provenance,
          review: reviewResult,
          trustedContext,
        },
      });
    }

    if (job.reviewId && shouldPublishFeedback) {
      if (!await claimIsCurrent()) return false;
      await updateFn({
        db: writeTenantDb,
        user: reviewUser,
        tenant: { schoolId: null },
        input: {
          reviewId: job.reviewId,
          reviewStatus: "reviewed",
          llmReviewSummary: reviewResult.summary,
          rubricEvaluation: reviewResult.apkEvaluation,
        },
      });
    }

    // Keep the external learner-visible callback inside the same transaction
    // while the queue row is locked. A GitHub failure remains best-effort: the
    // durable advisory/status writes are the source of truth.
    if (shouldPublishFeedback && token) {
      if (!await claimIsCurrent()) return false;
      try {
        await postCommentFn(prInfo, commentBody, token);
      } catch (commentErr) {
        console.error("[Review Worker] Failed to post PR comment:", commentErr);
      }
    }
    return true;
  };

  // An injected claim seam is deliberately authoritative for unit tests and
  // test doubles. Production uses the transaction branch below, where the
  // exact queue row/lease is verified with SELECT ... FOR UPDATE and kept
  // locked across all bounded persistence/publication side effects.
  if (deps.isCurrentClaim) {
    if (!await isCurrentClaim(claimIdentity)) return false;
    return persistAndPublish(deps.db, true);
  }

  const transactionDb = deps.db as unknown as {
    transaction?: (callback: (tx: DB) => Promise<boolean>) => Promise<boolean>;
  };
  // Legacy hand-built test jobs may omit the durable lease fields. Real
  // `claimDueJobs` rows always normalize both fields, so only those rows take
  // the row-locking transaction path.
  const hasDurableLeaseIdentity = claimIdentity.claimedBy !== undefined
    && claimIdentity.deliveryId !== undefined;
  if (hasDurableLeaseIdentity && typeof transactionDb.transaction === "function") {
    return transactionDb.transaction(async (tx) => {
      if (!claimIdentity.id || !claimIdentity.claimedBy) return false;
      const deliveryPredicate = claimIdentity.deliveryId == null
        ? isNull(reviewJobs.deliveryId)
        : eq(reviewJobs.deliveryId, claimIdentity.deliveryId);
      const rows = await tx
        .select({ id: reviewJobs.id })
        .from(reviewJobs)
        .where(and(
          eq(reviewJobs.id, claimIdentity.id),
          eq(reviewJobs.status, "claimed"),
          eq(reviewJobs.claimedBy, claimIdentity.claimedBy),
          deliveryPredicate,
        ))
        .for("update")
        .limit(1);
      if (!Array.isArray(rows) || rows.length === 0) return false;
      return persistAndPublish(tx, false);
    });
  }

  // Minimal unit fixtures may not implement transactions. Preserve the
  // injected/compatibility behavior there; production DB handles always do.
  return persistAndPublish(deps.db, true);
}

/** Extracts a validated GitHub pull-request head SHA from a durable webhook payload. */
function readHeadSha(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const pullRequest = (payload as { pull_request?: unknown }).pull_request;
  if (typeof pullRequest !== "object" || pullRequest === null) return null;
  const head = (pullRequest as { head?: unknown }).head;
  if (typeof head !== "object" || head === null) return null;
  const sha = (head as { sha?: unknown }).sha;
  return typeof sha === "string" && /^[0-9a-f]{40}$/i.test(sha) ? sha : null;
}

// ─── Settle ───────────────────────────────────────────────────

export interface SettleJobOptions {
  baseDelayMs?: number;
  maxJitterMs?: number;
  now?: Date;
}

/**
 * Derived terminal state of a settled review job. Distinct from the durable
 * `status` column: this value is computed at settle time and surfaces the
 * learner-visible reason a job ended without changing `codecamp_review_status`.
 */
export type ReviewJobTerminalOutcome =
  | "succeeded"
  | "skipped_generated"
  | "failed_permanent"
  | "failed_exhausted";

export interface SettleJobPayload {
  status: "pending" | "claimed" | "succeeded" | "failed" | "dead";
  attempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  claimedAt: Date | null;
  claimedBy: string | null;
  /** Derived terminal outcome; absent for transient retry schedules. */
  outcome?: ReviewJobTerminalOutcome;
  /** Plain-language terminal reason, capped at 240 characters to fit durable storage and log lines. */
  failureReason?: string;
}

/** Truncates a settle-side string to fit the durable storage and structured log budget. */
function capFailureReason(reason: string): string {
  if (reason.length <= 240) return reason;
  return reason.slice(0, 240);
}

/**
 * Computes the settle payload for a job that just finished (success or
 * failure). Pure function — given `(job, err, config)` it returns the
 * mutation payload. The worker applies the payload through `applySettle`.
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

  // Failure path. `job.attempts` is the CURRENT (pre-increment) attempt
  // count. The next-attempt count for retry is `+1`. We compare against
  // `job.attempts + 1` so the exhaustion check honors the spec semantics
  // "after `max_attempts` failed attempts, the job goes dead" — i.e.
  // with `maxAttempts=1`, the very first failure transitions straight to
  // dead (no retry).
  //
  // On exhaustion we leave attempts at its current value (the test in
  // `phase-3-exhaust-to-dead.test.ts` passes `attempts: maxAttempts` and
  // expects the dead row to retain that value).
  const nextAttempts = job.attempts + 1;
  const lastError = err.message;
  const failureReason = capFailureReason(lastError);

  // Contract violations are deterministic: retrying the same review input
  // cannot change its identity, schema, safe-diff, or objective result. Keep
  // the first failure auditable as one failed attempt and dead-letter it.
  if (isPermanentReviewContractFailure(err)) {
    return {
      status: "dead",
      attempts: Math.max(1, nextAttempts),
      nextAttemptAt: now,
      lastError,
      claimedAt: null,
      claimedBy: null,
      outcome: "failed_permanent",
      failureReason,
    };
  }

  if (job.attempts + 1 >= job.maxAttempts) {
    // Exhaustion: terminal dead-letter state. Review row stays pending.
    return {
      status: "dead",
      attempts: job.attempts,
      nextAttemptAt: now,
      lastError,
      claimedAt: null,
      claimedBy: null,
      outcome: "failed_exhausted",
      failureReason,
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
 * Tests the structural permanent-error marker without importing domain code.
 * @param error Unknown failure returned by a review job.
 * @returns True when the failure is a non-retryable PR-review contract violation.
 */
function isPermanentReviewContractFailure(error: unknown): boolean {
  return typeof error === "object" && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "CODECAMP_PR_REVIEW_CONTRACT_VIOLATION"
    && "retryable" in error
    && (error as { retryable?: unknown }).retryable === false;
}

/**
 * Creates a permanent worker-side contract failure for invalid durable-job identity.
 * @param message Human-readable explanation of the invalid job contract.
 * @returns An error carrying the marker consumed by settleJob.
 */
function createPermanentReviewContractError(message: string): Error {
  return Object.assign(new Error(message), {
    code: "CODECAMP_PR_REVIEW_CONTRACT_VIOLATION" as const,
    retryable: false as const,
  });
}

/**
 * Applies a `settleJob` payload to the database. Separated from
 * `settleJob` so the latter stays a pure function for testing.
 *
 * The update is a compare-and-swap on ID plus `status = 'claimed'` and, when
 * supplied by the worker, the complete lease identity. The latter prevents a
 * stale worker from settling a newer claim after visibility reclaim/re-claim.
 *
 * For terminal outcomes (`failed_permanent`, `failed_exhausted`,
 * `skipped_generated`), `payload.failureReason` is persisted into
 * `last_error` so the read path can derive the operational status without a
 * schema migration. Transient schedules leave `lastError` to the worker's
 * raw error message.
 *
 * @param dbArg - DB connection (or privileged singleton if omitted).
 * @param jobId - The job id to settle.
 * @param payload - The output of `settleJob`.
 * @param claim - Optional lease identity used to strengthen the CAS.
 */
export async function applySettle(
  dbArg: DB | undefined,
  jobId: string,
  payload: SettleJobPayload,
  claim?: ReviewJobClaimIdentity,
): Promise<void> {
  const { db: defaultDb } = await import("@reading-advantage/db");
  let conn: DB | undefined = dbArg ?? (defaultDb as DB);
  let owned: PrivilegedConnection | null = null;
  if (!conn || typeof conn.update !== "function") {
    owned = await privilegedDb();
    conn = owned!.db;
  }
  try {
    // A claimed row without a worker identity cannot be safely settled by a
    // worker. Leave it for visibility-timeout reclaim instead of risking a
    // stale update; legacy direct callers without `claim` retain the original
    // ID + status CAS contract.
    if (claim && !claim.claimedBy) return;
    const claimWhere = claim
      ? and(
        eq(reviewJobs.id, jobId),
        eq(reviewJobs.status, "claimed"),
        eq(reviewJobs.claimedBy, claim.claimedBy!),
        claim.deliveryId == null
          ? isNull(reviewJobs.deliveryId)
          : eq(reviewJobs.deliveryId, claim.deliveryId),
      )
      : and(eq(reviewJobs.id, jobId), eq(reviewJobs.status, "claimed"));
    const lastError = payload.outcome && payload.failureReason
      ? payload.failureReason
      : payload.lastError;
    await conn
      .update(reviewJobs)
      .set({
        status: payload.status,
        attempts: payload.attempts,
        nextAttemptAt: payload.nextAttemptAt,
        lastError,
        claimedAt: payload.claimedAt,
        claimedBy: payload.claimedBy,
        updatedAt: new Date(),
      })
      .where(claimWhere);
  } finally {
    if (owned) await owned.client.end();
  }
}

// ─── Worker tick / scheduler ──────────────────────────────────

export interface CreateReviewWorkerOptions {
  intervalMs?: number;
  /** Soft deadline in milliseconds; the tick stops claiming new batches once it passes. Default 120,000 ms. */
  deadlineMs?: number;
  deps?: Partial<ProcessJobDeps>;
  /** Override `claimDueJobs` for tests (e.g. a no-op). */
  claim?: (
    db?: DB,
    opts?: ClaimDueJobsOptions | number,
  ) => Promise<ReviewJob[]>;
  /** Override `reclaimStuckJobs` for tests. */
  reclaim?: (db?: DB, opts?: ReclaimStuckJobsOptions | number) => Promise<string[]>;
  /** Override `settleJob` for tests. */
  settle?: (job: { id: string; attempts: number; maxAttempts: number }, err: Error | null, opts: SettleJobOptions) => SettleJobPayload;
  /** Override the durable settlement write for isolated worker tests. */
  applySettle?: (
    db: DB | undefined,
    jobId: string,
    payload: SettleJobPayload,
    claim?: ReviewJobClaimIdentity,
  ) => Promise<void>;
}

/** Default tick deadline — 120 seconds — sized to clear the worst-case LLM latency without exceeding the scheduler budget. */
export const DEFAULT_TICK_DEADLINE_MS = 120_000;

export interface ReviewWorker {
  run(): Promise<void>;
  start(): void;
  stop(): void;
}

/**
 * Runs a single worker tick: reclaim stuck jobs, claim due jobs,
 * process each, settle each. The tick stops claiming new batches once
 * `deadlineMs` (default 120 s) has elapsed, after the currently claimed
 * batch has settled.
 */
export async function runWorkerTick(opts: CreateReviewWorkerOptions = {}): Promise<void> {
  const claim = opts.claim ?? claimDueJobs;
  const reclaim = opts.reclaim ?? reclaimStuckJobs;
  const settle = opts.settle ?? settleJob;
  const applySettlement = opts.applySettle ?? applySettle;
  const tickStartedAt = Date.now();
  const deadlineMs = opts.deadlineMs ?? DEFAULT_TICK_DEADLINE_MS;

  // Lazy import so test files can mock `@reading-advantage/db` and have the
  // worker use the mock instead of the privileged DB. In production this
  // resolves to the real `db` singleton and falls back to the privileged
  // DB only when the connection URL is missing.
  const dbModule = await import("@reading-advantage/db");
  const defaultDb: DB = dbModule.db;

  await reclaim(undefined, undefined).catch(() => {
    // Reclaim failure is non-fatal — the next tick will retry.
  });

  // Loop until no due jobs remain. This drains retried jobs (those whose
  // `nextAttemptAt` is now <= now()) in the same `run()` call — the
  // exponential backoff pushes the next attempt into the future, so
  // each iteration settles at most one batch of due jobs. The loop
  // terminates when `claim()` returns an empty array or the deadline
  // elapses after the current batch has settled.
  let iterations = 0;
  const MAX_ITERATIONS_PER_RUN = 100;
  while (iterations < MAX_ITERATIONS_PER_RUN) {
    iterations++;
    // Always allow at least the first claim attempt so a tick that
    // starts just past the deadline still drains one batch. Subsequent
    // attempts honor the deadline once it elapses.
    if (iterations > 1 && Date.now() - tickStartedAt > deadlineMs) break;
    const claimed = await claim(undefined);
    if (claimed.length === 0) break;

    for (const job of claimed) {
      const settlePayload = async (err: Error | null, skipInfo?: { removedPaths: string[]; reason: string }) => {
        const payload = skipInfo !== undefined
          ? {
              status: "succeeded" as const,
              attempts: job.attempts,
              nextAttemptAt: new Date(),
              lastError: skipInfo.reason,
              claimedAt: null,
              claimedBy: null,
              outcome: "skipped_generated" as const,
              failureReason: skipInfo.reason,
            }
          : settle({ id: job.id, attempts: job.attempts, maxAttempts: job.maxAttempts }, err, {});
        if (payload.outcome) {
          // One structured log line per terminal settle (FR-9).
          console.log({
            event: "reviewJob.settled",
            reviewJobId: job.id,
            reviewId: job.reviewId,
            outcome: payload.outcome,
            reason: payload.failureReason ?? null,
          });
        }
        await applySettlement(undefined, job.id, payload, {
          id: job.id,
          status: "claimed",
          claimedBy: job.claimedBy,
          deliveryId: job.deliveryId,
        });
      };
      try {
        const completed = await processJob(job, {
          db: defaultDb,
          ...(opts.deps ?? {}),
        });
        // A superseded worker intentionally leaves the durable row alone;
        // either the newer claim is already processing it or the pending row
        // will be picked up on the next tick.
        if (!completed) continue;
        await settlePayload(null);
      } catch (err) {
        // The empty-stripped-diff skip is delivered as a typed marker
        // from the worker seam so the durable queue can settle
        // `skipped_generated` without invoking the model. Post an
        // advisory PR comment so the intern learns why the review was
        // skipped (FR-4).
        if (err && typeof err === "object" && (err as { code?: unknown }).code === "CODECAMP_REVIEW_DIFF_SKIPPED") {
          const marker = err as { reason?: unknown; removedPaths?: unknown };
          const removedPaths = Array.isArray(marker.removedPaths)
            ? marker.removedPaths.filter((p): p is string => typeof p === "string")
            : [];
          const reason = typeof marker.reason === "string"
            ? marker.reason
            : "[SKIPPED_GENERATED]";
          const depsPostComment = opts.deps?.postComment;
          if (depsPostComment) {
            try {
              const skippedBody = `## 🤖 CodeCamp AI Review\n\n**Status:** ⏭️ Review skipped — the PR diff contained only generated artifacts.\n\nBuild output and other generated paths do not belong in a commit. Please regenerate from source and push a follow-up commit that excludes the following paths:\n\n${
                removedPaths.length > 0
                  ? removedPaths.map((path) => `- \`${path}\``).join("\n")
                  : "_No reviewable source remained after stripping._"
              }`;
              const depsGetToken = opts.deps?.getToken ?? (await import("./github-client")).getInstallationTokenForRepo;
              const tokenLocal = await depsGetToken();
              await depsPostComment(
                { owner: job.repoOwner, repo: job.repoName, pullNumber: job.pullNumber },
                skippedBody,
                tokenLocal,
              );
            } catch (commentErr) {
              console.error("[Review Worker] Failed to post skip PR comment:", commentErr);
            }
          }
          await settlePayload(null, { removedPaths, reason });
          continue;
        }
        const e = err instanceof Error ? err : new Error(String(err));
        await settlePayload(e).catch(() => {
          // Settle failure is non-fatal — log + move on.
          console.error("[Review Worker] Failed to settle job:", job.id, e);
        });
      }
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
function normalizeJobRow(row: Record<string, unknown>): ReviewJob {
  const get = <T>(snake: string, camel: string): T => (row[camel] ?? row[snake]) as T;
  return {
    id: get<string>("id", "id"),
    repoOwner: get<string>("pr_owner", "prOwner"),
    repoName: get<string>("pr_repo", "prRepo"),
    pullNumber: get<number>("pr_pull_number", "prPullNumber"),
    status: get<ReviewJob["status"]>("status", "status"),
    attempts: get<number>("attempts", "attempts"),
    maxAttempts: get<number>("max_attempts", "maxAttempts"),
    nextAttemptAt: new Date(get<string | Date>("next_attempt_at", "nextAttemptAt")),
    lastError: (get<string | null>("last_error", "lastError") ?? null) as string | null,
    claimedAt: row["claimed_at"]
      ? new Date(get<string | Date>("claimed_at", "claimedAt"))
      : null,
    claimedBy: (get<string | null>("claimed_by", "claimedBy") ?? null) as string | null,
    deliveryId: (get<string | null>("delivery_id", "deliveryId") ?? null) as string | null,
    createdAt: new Date(get<string | Date>("created_at", "createdAt")),
    updatedAt: new Date(get<string | Date>("updated_at", "updatedAt")),
    prUrl: get<string>("pr_url", "prUrl"),
    reviewId: (get<string | null>("review_id", "reviewId") ?? null) as string | null,
    payloadJson: get<unknown>("payload_json", "payloadJson") ?? null,
    enqueued: false, // worker doesn't enqueue
  };
}
