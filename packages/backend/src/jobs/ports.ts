import type {
  ClaimJobsRequest,
  ClaimJobsResult,
  EnqueueJobRequest,
  EnqueueJobResult,
  FailJobRequest,
  FailJobResult,
  HeartbeatJobRequest,
  HeartbeatJobResult,
  ReclaimExpiredJobsRequest,
  ReclaimExpiredJobsResult,
  ReplayJobRequest,
  ReplayJobResult,
  SettleJobRequest,
  SettleJobResult,
} from "./contracts.js";
import type {
  ListDeadJobsRequest,
  ListDeadJobsResult,
} from "./dead-letter-contracts.js";

/** Provider-neutral enqueue capability for application/backend producers. */
export interface DurableJobEnqueuePort {
  /**
   * Atomically creates or safely refreshes one idempotent durable identity.
   * @param request Validated handler identity, tenant, payload, and schedule.
   * @returns Created, refreshed, or active-lease-retained outcome.
   */
  enqueue(
    request: Readonly<EnqueueJobRequest>,
  ): Promise<Readonly<EnqueueJobResult>>;
}

/**
 * Least-privilege lifecycle capability exposed to worker composition.
 *
 * Implementations own atomic persistence, lease-token comparison, retry policy,
 * and database-specific locking. The worker receives no administrative ports.
 */
export interface DurableJobWorkerPort {
  /**
   * Atomically claims a bounded due batch with fresh opaque leases.
   * @param request Queue, tenant, worker, bound, lease duration, and trusted time.
   * @returns Explicit empty poll or a non-empty running batch.
   */
  claim(
    request: Readonly<ClaimJobsRequest>,
  ): Promise<Readonly<ClaimJobsResult>>;

  /**
   * Extends only a matching live lease in its trusted tenant scope.
   * @param request Job identity, tenant, opaque lease token, and extension boundary.
   * @returns Extension receipt or explicit zero-row ownership outcome.
   */
  heartbeat(
    request: Readonly<HeartbeatJobRequest>,
  ): Promise<Readonly<HeartbeatJobResult>>;

  /**
   * Settles success only for a matching live lease in its tenant scope.
   * @param request Job identity, tenant, opaque lease token, result, and trusted time.
   * @returns Success receipt or explicit zero-row ownership outcome.
   */
  settle(
    request: Readonly<SettleJobRequest>,
  ): Promise<Readonly<SettleJobResult>>;

  /**
   * Applies bounded retry or dead-letter policy to a matching live lease.
   * @param request Job identity, tenant, opaque lease token, safe error, and time.
   * @returns Retry, terminal, or explicit zero-row ownership outcome.
   */
  fail(
    request: Readonly<FailJobRequest>,
  ): Promise<Readonly<FailJobResult>>;

  /**
   * Returns a bounded tenant-scoped set of expired leases to pending.
   * @param request Queue boundary, tenant, batch bound, and trusted time.
   * @returns No-op or positive reclamation receipt.
   */
  reclaimExpired(
    request: Readonly<ReclaimExpiredJobsRequest>,
  ): Promise<Readonly<ReclaimExpiredJobsResult>>;
}

/** Authorized dead-letter visibility kept outside worker composition. */
export interface DurableJobDeadLetterPort {
  /**
   * Lists a bounded tenant-scoped page without payloads or raw errors.
   * @param request Queue, trusted tenant, limit, and opaque cursor.
   * @returns Payload-free dead-letter summaries and an optional next cursor.
   */
  listDead(
    request: Readonly<ListDeadJobsRequest>,
  ): Promise<Readonly<ListDeadJobsResult>>;
}

/** Authorized replay administration kept outside worker composition. */
export interface DurableJobReplayPort {
  /**
   * Performs audited replay without revoking a valid active lease.
   * @param request Job, tenant, authorization evidence, reason, and trusted time.
   * @returns Replay, idempotent, rejection, or missing outcome.
   */
  replay(
    request: Readonly<ReplayJobRequest>,
  ): Promise<Readonly<ReplayJobResult>>;
}

/** Complete adapter surface used only at backend composition roots. */
export type DurableJobQueuePort = DurableJobEnqueuePort &
  DurableJobWorkerPort &
  DurableJobDeadLetterPort &
  DurableJobReplayPort;
