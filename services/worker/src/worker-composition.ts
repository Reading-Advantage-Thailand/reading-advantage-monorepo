import { z } from "zod";
import {
  jobNameSchema,
  jobQueueNameSchema,
  jobTenantSchema,
} from "@reading-advantage/backend/jobs";
import type {
  DurableJobExecutionContext,
  DurableJobHandler,
  DurableJobWorkerPort,
  JobEnvelope,
  JobTenant,
} from "@reading-advantage/backend/jobs";

import type { WorkerHealthState } from "./health.js";

/** Runtime configuration used by the worker polling loop. */
export interface WorkerRuntimeConfig {
  /** Queue identity claimed by this worker. */
  readonly queueName: string;
  /** Stable worker identity attached to each claim. */
  readonly workerId: string;
  /** Maximum number of handlers running in one poll. */
  readonly concurrency: number;
  /** Delay between completed polls. */
  readonly pollIntervalMs: number;
  /** Lease duration requested for each claim. */
  readonly leaseSeconds: number;
  /** Maximum shutdown wait configured for the worker. */
  readonly shutdownGraceMs: number;
}

/** Typed handler accepted by the worker registry. */
export type WorkerHandler = DurableJobHandler<unknown, unknown>;

/** Lookup boundary for handlers without queue persistence access. */
export interface WorkerHandlerRegistry {
  /**
   * Finds the handler registered for one durable job name.
   * @param jobName Stable durable job name from a claimed envelope.
   * @returns The matching handler, or undefined when no handler is registered.
   */
  get(jobName: string): WorkerHandler | undefined;
}

/** Structured logger boundary used by worker composition. */
export interface WorkerLogger {
  /**
   * Writes one safe informational lifecycle event.
   * @param event Stable lifecycle event name.
   * @param details Secret-safe event fields.
   * @returns Nothing after the event is written.
   */
  info(event: string, details: Readonly<Record<string, unknown>>): void;
  /**
   * Writes one safe error lifecycle event.
   * @param event Stable lifecycle event name.
   * @param details Secret-safe event fields.
   * @returns Nothing after the event is written.
   */
  error(event: string, details: Readonly<Record<string, unknown>>): void;
}

/**
 * Delays polling or lease renewal through an injectable runtime boundary.
 * @param milliseconds Delay duration in milliseconds.
 * @param signal Optional signal that cancels the delay.
 * @returns A promise that resolves after the delay or cancellation.
 */
export type WorkerSleep = (
  milliseconds: number,
  signal?: AbortSignal,
) => Promise<void>;

/** Lifecycle state exposed by the worker composition root. */
export type WorkerLifecycleStatus =
  | "starting"
  | "ready"
  | "draining"
  | "stopped";

/** Safe runtime snapshot used by health and lifecycle tests. */
export interface WorkerCompositionSnapshot {
  /** Number of handlers currently running. */
  readonly activeJobs: number;
  /** Whether the worker accepts new claims. */
  readonly ready: boolean;
  /** Current provider-neutral lifecycle state. */
  readonly status: WorkerLifecycleStatus;
}

/** Dependencies required to construct the provider-neutral worker boundary. */
export interface WorkerCompositionOptions {
  /** Validated polling and shutdown configuration. */
  readonly config: WorkerRuntimeConfig;
  /** Health state that receives ready and draining transitions. */
  readonly health: WorkerHealthState;
  /** Structured logger for safe lifecycle events. */
  readonly logger?: WorkerLogger;
  /** Explicit global or tenant scope for claim and reclaim. */
  readonly pollingScope?: JobTenant;
  /** Least-privilege lifecycle port supplied by the backend adapter. */
  readonly port: DurableJobWorkerPort;
  /** Typed handler lookup boundary. */
  readonly registry: WorkerHandlerRegistry;
  /** Optional time source for deterministic lifecycle requests. */
  readonly clock?: () => Date;
  /** Optional delay boundary for tests and runtime control. */
  readonly sleep?: WorkerSleep;
}

/** Provider-neutral worker lifecycle boundary. */
export interface WorkerComposition {
  /**
   * Starts polling and resolves after a graceful stop.
   * @returns A promise that resolves when polling stops.
   */
  start(): Promise<void>;
  /**
   * Stops new claims and waits up to the configured drain bound.
   * @param signal Operating-system signal that initiated the drain.
   * @returns A promise that resolves when the drain ends or reaches its bound.
   */
  stop(signal: "SIGTERM" | "SIGINT"): Promise<void>;
  /**
   * Executes one bounded reclaim and claim cycle.
   * @returns A promise that resolves after the cycle and its handlers finish.
   */
  pollOnce(): Promise<void>;
  /**
   * Returns the current safe lifecycle snapshot.
   * @returns The current lifecycle state and active handler count.
   */
  snapshot(): WorkerCompositionSnapshot;
}

const workerRuntimeEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  WORKER_QUEUE_NAME: jobQueueNameSchema,
  WORKER_ID: z.string().trim().min(1).max(200),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(1).max(300_000),
  WORKER_LEASE_SECONDS: z.coerce.number().int().min(1).max(3_600),
  WORKER_SHUTDOWN_GRACE_MS: z.coerce.number().int().min(1).max(300_000),
});

const defaultSleep: WorkerSleep = (milliseconds, signal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

const defaultLogger: WorkerLogger = {
  info: (event, details) => {
    console.info(JSON.stringify({ event, ...details }));
  },
  error: (event, details) => {
    console.error(JSON.stringify({ event, ...details }));
  },
};

const sameTenantScope = (left: JobTenant, right: JobTenant): boolean => {
  if (left.mode !== right.mode) return false;
  if (left.mode === "global") return true;
  return right.mode === "tenant" && left.tenantId === right.tenantId;
};

const requireTenantScope = (scope: JobTenant, expected: JobTenant): void => {
  if (!sameTenantScope(scope, expected)) {
    throw new Error(
      "Claimed job tenant scope does not match the polling scope.",
    );
  }
};

const validateWorkerHandler = (handler: WorkerHandler): void => {
  jobNameSchema.parse(handler.jobName);
  z.enum(["global", "tenant"]).parse(handler.tenantMode);
  if (!(handler.payload instanceof z.ZodType)) {
    throw new TypeError("A genuine Zod payload schema is required.");
  }
  if (!(handler.result instanceof z.ZodType)) {
    throw new TypeError("A genuine Zod result schema is required.");
  }
  if (typeof handler.handle !== "function") {
    throw new TypeError("A durable job handler function is required.");
  }
};

const errorDetails = (
  error: unknown,
): Readonly<{ code: string; safeSummary: string }> => {
  if (error instanceof z.ZodError) {
    return {
      code: "HANDLER_CONTRACT_INVALID",
      safeSummary: "The handler contract rejected the job value.",
    };
  }

  return {
    code: "HANDLER_FAILED",
    safeSummary: "The job handler failed.",
  };
};

const runningEnvelope = (
  job: Extract<JobEnvelope, { state: "running" }>,
): Extract<JobEnvelope, { state: "running" }> => job;

/**
 * Creates a duplicate-free registry of validated typed handlers.
 * @param handlers Handler definitions available to the worker.
 * @returns A lookup boundary that preserves each registered handler object.
 * @throws When a handler has invalid schemas or a duplicate job name.
 */
export function createWorkerHandlerRegistry(
  handlers: readonly WorkerHandler[],
): WorkerHandlerRegistry {
  const registry = new Map<string, WorkerHandler>();

  for (const handler of handlers) {
    validateWorkerHandler(handler);
    if (registry.has(handler.jobName)) {
      throw new Error(`Duplicate worker handler: ${handler.jobName}.`);
    }
    registry.set(handler.jobName, handler);
  }

  return Object.freeze({
    get: (jobName: string) => registry.get(jobName),
  });
}

/**
 * Parses bounded worker polling settings from untrusted process environment data.
 * @param environment Environment values supplied to the worker process.
 * @returns Validated provider-neutral worker runtime configuration.
 * @throws When a queue, identity, or lifecycle bound is invalid.
 */
export function parseWorkerRuntimeConfig(
  environment: Readonly<Record<string, string | undefined>>,
): WorkerRuntimeConfig {
  const result = workerRuntimeEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join(".") || "environment")
      .join(", ");
    throw new Error(`Invalid worker runtime configuration: ${fields}.`);
  }

  return Object.freeze({
    queueName: result.data.WORKER_QUEUE_NAME,
    workerId: result.data.WORKER_ID,
    concurrency: result.data.WORKER_CONCURRENCY,
    pollIntervalMs: result.data.WORKER_POLL_INTERVAL_MS,
    leaseSeconds: result.data.WORKER_LEASE_SECONDS,
    shutdownGraceMs: result.data.WORKER_SHUTDOWN_GRACE_MS,
  });
}

/**
 * Creates a persistence-free worker lifecycle over the typed job port.
 * @param options Health, port, registry, polling scope, and runtime boundaries.
 * @returns A controllable worker composition root.
 */
export function createWorkerComposition(
  options: WorkerCompositionOptions,
): WorkerComposition {
  const config = options.config;
  const health = options.health;
  const logger = options.logger ?? defaultLogger;
  const clock = options.clock ?? (() => new Date());
  const sleep = options.sleep ?? defaultSleep;
  const pollingScope = jobTenantSchema.parse(
    options.pollingScope ?? { mode: "global" },
  );
  const activeWork = new Set<Promise<void>>();
  const heartbeatControllers = new Set<AbortController>();
  let status: WorkerLifecycleStatus = "starting";
  let stopRequested = false;
  let loopPromise: Promise<void> | undefined;
  let stopPromise: Promise<void> | undefined;

  const snapshot = (): WorkerCompositionSnapshot =>
    Object.freeze({
      activeJobs: activeWork.size,
      ready: health.snapshot().ready && status === "ready",
      status,
    });

  const renewLease = async (
    job: Extract<JobEnvelope, { state: "running" }>,
    signal: AbortSignal,
  ): Promise<void> => {
    const intervalMs = Math.max(
      1,
      Math.floor((config.leaseSeconds * 1_000) / 2),
    );

    while (!signal.aborted) {
      try {
        await options.port.heartbeat({
          jobId: job.id,
          tenant: job.tenant,
          leaseToken: job.lease.token,
          now: clock().toISOString(),
          extendBySeconds: config.leaseSeconds,
        });
      } catch {
        logger.error("worker.job.heartbeat_failed", {
          correlationId: job.id,
          jobName: job.jobName,
        });
        return;
      }

      await sleep(intervalMs, signal);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  };

  const runJob = async (
    rawJob: Extract<JobEnvelope, { state: "running" }>,
    handler: WorkerHandler,
  ): Promise<void> => {
    const job = runningEnvelope(rawJob);
    const controller = new AbortController();
    heartbeatControllers.add(controller);
    const heartbeatPromise = renewLease(job, controller.signal);

    try {
      const payload = handler.payload.parse(job.payload);
      const context: DurableJobExecutionContext = {
        jobId: job.id,
        attempt: job.attempt,
        maxAttempts: job.maxAttempts,
        tenant: job.tenant,
        signal: controller.signal,
      };
      const result = handler.result.parse(
        await handler.handle(context, payload),
      );
      await options.port.settle({
        jobId: job.id,
        tenant: job.tenant,
        leaseToken: job.lease.token,
        result,
        now: clock().toISOString(),
      });
      logger.info("worker.job.succeeded", {
        correlationId: job.id,
        jobName: job.jobName,
        attempt: job.attempt,
      });
    } catch (error: unknown) {
      const safeError = errorDetails(error);
      try {
        await options.port.fail({
          jobId: job.id,
          tenant: job.tenant,
          leaseToken: job.lease.token,
          error: safeError,
          now: clock().toISOString(),
        });
      } catch {
        logger.error("worker.job.fail_failed", {
          correlationId: job.id,
          jobName: job.jobName,
        });
      }
      logger.error("worker.job.failed", {
        correlationId: job.id,
        jobName: job.jobName,
        attempt: job.attempt,
        errorCode: safeError.code,
      });
    } finally {
      controller.abort();
      heartbeatControllers.delete(controller);
      await heartbeatPromise;
    }
  };

  const runTrackedJob = async (
    job: Extract<JobEnvelope, { state: "running" }>,
    handler: WorkerHandler,
  ): Promise<void> => {
    const work = runJob(job, handler);
    activeWork.add(work);
    void work.then(
      () => activeWork.delete(work),
      () => activeWork.delete(work),
    );
    await work;
  };

  const pollOnce = async (): Promise<void> => {
    if (stopRequested) return;

    const now = clock().toISOString();
    await options.port.reclaimExpired({
      queueName: config.queueName,
      tenant: pollingScope,
      limit: config.concurrency,
      now,
    });
    if (stopRequested) return;
    const claimResult = await options.port.claim({
      queueName: config.queueName,
      tenant: pollingScope,
      workerId: config.workerId,
      limit: config.concurrency,
      leaseSeconds: config.leaseSeconds,
      now,
    });
    if (stopRequested) return;

    if (claimResult.outcome === "empty") return;
    if (claimResult.jobs.length > config.concurrency) {
      throw new Error(
        "Worker provider returned more jobs than the configured poll limit.",
      );
    }

    const jobs = claimResult.jobs.map((job) => {
      requireTenantScope(job.tenant, pollingScope);
      const handler = options.registry.get(job.jobName);
      if (!handler) {
        throw new Error(`No worker handler is registered for ${job.jobName}.`);
      }
      if (handler.tenantMode !== job.tenant.mode) {
        throw new Error(
          `Worker handler tenant mode does not match ${job.jobName}.`,
        );
      }
      return { handler, job };
    });

    for (let offset = 0; offset < jobs.length; offset += config.concurrency) {
      if (stopRequested) return;
      const batch = jobs.slice(offset, offset + config.concurrency);
      await Promise.all(
        batch.map(({ handler, job }) => runTrackedJob(job, handler)),
      );
    }
  };

  const start = async (): Promise<void> => {
    if (loopPromise) return loopPromise;
    if (stopRequested) return;

    status = "ready";
    health.markReady();
    loopPromise = (async () => {
      while (!stopRequested) {
        try {
          await pollOnce();
        } catch {
          logger.error("worker.poll.failed", {
            correlationId: `${config.workerId}:${clock().toISOString()}`,
            queueName: config.queueName,
          });
        }
        if (!stopRequested) await sleep(config.pollIntervalMs);
      }
      status = "stopped";
    })();
    return loopPromise;
  };

  const stop = async (signal: "SIGTERM" | "SIGINT"): Promise<void> => {
    if (stopPromise) return stopPromise;
    stopRequested = true;
    status = "draining";
    health.markDraining();
    for (const controller of heartbeatControllers) controller.abort();
    heartbeatControllers.clear();

    stopPromise = (async () => {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const drain = (async () => {
        if (loopPromise) await loopPromise;
        while (activeWork.size > 0) {
          await Promise.all([...activeWork]);
        }
      })().catch(() => {
        logger.error("worker.shutdown.drain_failed", {
          workerId: config.workerId,
        });
      });
      const timeout = new Promise<void>((resolve) => {
        timeoutHandle = setTimeout(resolve, config.shutdownGraceMs);
      });

      try {
        await Promise.race([drain, timeout]);
      } finally {
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      }
      if (activeWork.size > 0) {
        logger.error("worker.shutdown.timeout", {
          activeJobs: activeWork.size,
          workerId: config.workerId,
        });
      }
      status = "stopped";
      logger.info("worker.stopped", { signal, workerId: config.workerId });
    })();
    return stopPromise;
  };

  return Object.freeze({ pollOnce, snapshot, start, stop });
}
