import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createWorkerHealthState } from "../health.js";

type WorkerHandler = {
  readonly jobName: string;
  readonly tenantMode: "global" | "tenant";
  readonly payload: z.ZodType<unknown>;
  readonly result: z.ZodType<unknown>;
  readonly handle: (
    context: Readonly<Record<string, unknown>>,
    payload: unknown,
  ) => Promise<unknown>;
};

type WorkerRuntimeConfig = {
  readonly queueName: string;
  readonly workerId: string;
  readonly concurrency: number;
  readonly pollIntervalMs: number;
  readonly leaseSeconds: number;
  readonly shutdownGraceMs: number;
};

type WorkerComposition = {
  readonly start: () => Promise<void>;
  readonly stop: (signal: "SIGTERM" | "SIGINT") => Promise<void>;
  readonly pollOnce: () => Promise<void>;
  readonly snapshot: () => Readonly<Record<string, unknown>>;
};

type WorkerCompositionModule = {
  readonly createWorkerHandlerRegistry?: (
    handlers: readonly WorkerHandler[],
  ) => unknown;
  readonly parseWorkerRuntimeConfig?: (
    environment: Readonly<Record<string, string | undefined>>,
  ) => WorkerRuntimeConfig;
  readonly createWorkerComposition?: (
    options: Readonly<Record<string, unknown>>,
  ) => WorkerComposition;
};

type WorkerJob = Record<string, unknown>;

const workerCompositionSource = fileURLToPath(
  new URL("../worker-composition.ts", import.meta.url),
);

const fixedNow = "2026-08-13T00:00:00.000Z";

const validEnvironment = {
  NODE_ENV: "test",
  WORKER_QUEUE_NAME: "review",
  WORKER_ID: "worker-red-1",
  WORKER_CONCURRENCY: "2",
  WORKER_POLL_INTERVAL_MS: "25",
  WORKER_LEASE_SECONDS: "30",
  WORKER_SHUTDOWN_GRACE_MS: "1000",
};

const logger = {
  info: vi.fn<(event: string, details: Readonly<Record<string, unknown>>) => void>(),
  error: vi.fn<(event: string, details: Readonly<Record<string, unknown>>) => void>(),
};

const createDeferred = (): {
  promise: Promise<void>;
  resolve: () => void;
} => {
  let resolvePromise!: () => void;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
};

const waitFor = async (
  predicate: () => boolean,
  description: string,
): Promise<void> => {
  const deadline = Date.now() + 1_000;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for ${description}.`);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
};

const createHandler = (
  handle: (
    context: Readonly<Record<string, unknown>>,
    payload: unknown,
  ) => Promise<unknown> = async () => ({ ok: true }),
): WorkerHandler => ({
  jobName: "review.process",
  tenantMode: "tenant",
  payload: z.object({
    secret: z.string().optional(),
    value: z.string(),
  }),
  result: z.object({ ok: z.boolean() }),
  handle: vi.fn(handle),
});

const createJob = (index: number, secret = `secret-${index}`): WorkerJob => ({
  id: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
  jobName: "review.process",
  queueName: "review",
  tenant: { mode: "tenant", tenantId: "school-1" },
  idempotencyKey: `review-${index}`,
  payload: { secret, value: `value-${index}` },
  state: "running",
  attempt: 1,
  maxAttempts: 3,
  availableAt: fixedNow,
  createdAt: fixedNow,
  updatedAt: fixedNow,
  lease: {
    token: `lease-token-${index.toString().padStart(20, "0")}`,
    workerId: "worker-red-1",
    expiresAt: "2026-08-13T00:00:30.000Z",
  },
});

const createWorkerPort = (jobs: readonly WorkerJob[]) => {
  let pendingJobs = [...jobs];

  return {
    claim: vi.fn(async (request: Readonly<Record<string, unknown>>) => {
      void request;
      const claimedJobs = pendingJobs;
      pendingJobs = [];
      return claimedJobs.length > 0
        ? { outcome: "claimed", jobs: claimedJobs }
        : { outcome: "empty" };
    }),
    heartbeat: vi.fn(async (request: Readonly<Record<string, unknown>>) => {
      void request;
      return { outcome: "extended", expiresAt: "2026-08-13T00:01:00.000Z" };
    }),
    settle: vi.fn(async (request: Readonly<Record<string, unknown>>) => {
      void request;
      return { outcome: "settled", state: "succeeded" };
    }),
    fail: vi.fn(async (request: Readonly<Record<string, unknown>>) => {
      void request;
      return { outcome: "dead" };
    }),
    reclaimExpired: vi.fn(
      async (request: Readonly<Record<string, unknown>>) => {
        void request;
        return { outcome: "no-op" };
      },
    ),
  };
};

const loadWorkerComposition = async (): Promise<WorkerCompositionModule> => {
  if (!existsSync(workerCompositionSource)) {
    throw new Error(
      "Missing worker composition module: services/worker/src/worker-composition.ts",
    );
  }

  return await vi.importActual<WorkerCompositionModule>(
    "../worker-composition.js",
  );
};

const requireExport = <K extends keyof WorkerCompositionModule>(
  module: WorkerCompositionModule,
  name: K,
): NonNullable<WorkerCompositionModule[K]> => {
  const exported = module[name];
  if (typeof exported !== "function") {
    throw new Error(`Missing worker composition export: ${String(name)}.`);
  }
  return exported as NonNullable<WorkerCompositionModule[K]>;
};

const createComposition = async (
  jobs: readonly WorkerJob[],
  handler = createHandler(),
  overrides: Readonly<Record<string, unknown>> = {},
): Promise<{
  composition: WorkerComposition;
  health: ReturnType<typeof createWorkerHealthState>;
  port: ReturnType<typeof createWorkerPort>;
  module: WorkerCompositionModule;
}> => {
  const module = await loadWorkerComposition();
  const createRegistry = requireExport(module, "createWorkerHandlerRegistry");
  const createWorkerComposition = requireExport(module, "createWorkerComposition");
  const parseConfig = requireExport(module, "parseWorkerRuntimeConfig");
  const port = createWorkerPort(jobs);
  const health = createWorkerHealthState({
    clock: () => new Date(fixedNow),
    serviceName: "worker-red-test",
  });
  const registry = createRegistry([handler]);
  const config = parseConfig(validEnvironment);
  const composition = createWorkerComposition({
    config,
    health,
    logger,
    port,
    registry,
    sleep: async () => undefined,
    ...overrides,
  });

  return { composition, health, module, port };
};

afterEach(() => {
  vi.restoreAllMocks();
  logger.info.mockReset();
  logger.error.mockReset();
});

describe("durable worker lifecycle Red contract", () => {
  it("registers typed handlers and rejects duplicate or untyped definitions", async () => {
    const module = await loadWorkerComposition();
    const createRegistry = requireExport(module, "createWorkerHandlerRegistry");
    const handler = createHandler();

    const registry = createRegistry([handler]) as {
      get: (jobName: string) => WorkerHandler | undefined;
    };
    expect(registry.get("review.process")).toBe(handler);
    expect(() => createRegistry([handler, { ...handler }])).toThrow(
      /duplicate|unique/i,
    );
    expect(() =>
      createRegistry([
        { ...handler, payload: {} } as unknown as WorkerHandler,
      ]),
    ).toThrow(/payload|schema|Zod/i);
  });

  it("validates startup settings for queue identity, concurrency, polling, lease, and drain bounds", async () => {
    const module = await loadWorkerComposition();
    const parseConfig = requireExport(module, "parseWorkerRuntimeConfig");

    expect(parseConfig(validEnvironment)).toMatchObject({
      concurrency: 2,
      leaseSeconds: 30,
      pollIntervalMs: 25,
      queueName: "review",
      shutdownGraceMs: 1_000,
      workerId: "worker-red-1",
    });

    for (const [field, value] of [
      ["WORKER_QUEUE_NAME", ""],
      ["WORKER_ID", ""],
      ["WORKER_CONCURRENCY", "0"],
      ["WORKER_POLL_INTERVAL_MS", "0"],
      ["WORKER_LEASE_SECONDS", "0"],
      ["WORKER_SHUTDOWN_GRACE_MS", "0"],
    ] as const) {
      expect(() => parseConfig({ ...validEnvironment, [field]: value })).toThrow(
        field,
      );
    }
  });

  it("claims one bounded poll and never exceeds configured handler concurrency", async () => {
    let activeHandlers = 0;
    let maximumActiveHandlers = 0;
    const handler = createHandler(async () => {
      activeHandlers += 1;
      maximumActiveHandlers = Math.max(maximumActiveHandlers, activeHandlers);
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      activeHandlers -= 1;
      return { ok: true };
    });
    const { composition, port } = await createComposition(
      Array.from({ length: 5 }, (_, index) => createJob(index)),
      handler,
    );

    await composition.pollOnce();

    expect(port.claim).toHaveBeenCalledTimes(1);
    expect(port.claim.mock.calls[0]?.[0]).toMatchObject({
      leaseSeconds: 30,
      limit: 2,
      queueName: "review",
      tenant: { mode: "global" },
      workerId: "worker-red-1",
    });
    expect(maximumActiveHandlers).toBeLessThanOrEqual(2);
    expect(port.settle).toHaveBeenCalledTimes(5);
  });

  it("opens readiness after start and drains active work on SIGTERM before stopping claims", async () => {
    const jobStarted = createDeferred();
    const releaseJob = createDeferred();
    const sleepReleases: Array<() => void> = [];
    const handler = createHandler(async () => {
      jobStarted.resolve();
      await releaseJob.promise;
      return { ok: true };
    });
    const sleep = vi.fn(
      async (_milliseconds: number, _signal?: AbortSignal): Promise<void> => {
        await new Promise<void>((resolve) => sleepReleases.push(resolve));
      },
    );
    const { composition, health, port } = await createComposition(
      [createJob(1)],
      handler,
      { sleep },
    );

    const startPromise = composition.start();
    await jobStarted.promise;
    await waitFor(() => health.snapshot().ready, "worker readiness");
    expect(health.snapshot()).toMatchObject({ ready: true, status: "ready" });

    const stopPromise = composition.stop("SIGTERM");
    expect(health.snapshot()).toMatchObject({ ready: false, status: "draining" });
    const claimsWhileDraining = port.claim.mock.calls.length;
    await composition.pollOnce();
    expect(port.claim).toHaveBeenCalledTimes(claimsWhileDraining);

    releaseJob.resolve();
    for (const release of sleepReleases.splice(0)) release();
    await expect(stopPromise).resolves.toBeUndefined();
    await expect(startPromise).resolves.toBeUndefined();
    expect(composition.snapshot()).toMatchObject({
      activeJobs: 0,
      ready: false,
      status: "stopped",
    });
  });

  it("emits correlation-safe structured logs and persists only classified safe errors", async () => {
    const payloadSecret = "payload-secret-must-not-leak";
    const providerSecret = "provider-response-must-not-leak";
    const handler = createHandler(async () => {
      throw new Error(providerSecret);
    });
    const { composition, port } = await createComposition(
      [createJob(7, payloadSecret)],
      handler,
    );

    await expect(composition.pollOnce()).resolves.toBeUndefined();

    const serializedLogs = JSON.stringify({
      errors: logger.error.mock.calls,
      info: logger.info.mock.calls,
    });
    expect(serializedLogs).toContain("worker.job.failed");
    expect(serializedLogs).toContain("correlationId");
    expect(serializedLogs).not.toContain(payloadSecret);
    expect(serializedLogs).not.toContain(providerSecret);

    const serializedFailure = JSON.stringify(port.fail.mock.calls);
    expect(serializedFailure).toContain("safeSummary");
    expect(serializedFailure).toContain("code");
    expect(serializedFailure).not.toContain(payloadSecret);
    expect(serializedFailure).not.toContain(providerSecret);
    expect(serializedFailure).not.toContain('"message"');
  });

  it("uses only the worker lifecycle job port and never reaches enqueue, replay, or dead-letter administration", async () => {
    const { composition, port } = await createComposition([createJob(1)]);
    for (const forbiddenMethod of ["enqueue", "listDead", "replay"]) {
      Object.defineProperty(port, forbiddenMethod, {
        configurable: true,
        get: () => {
          throw new Error(`Worker accessed forbidden job-port method: ${forbiddenMethod}`);
        },
      });
    }

    await composition.pollOnce();
    expect(port.claim).toHaveBeenCalledTimes(1);
    expect(port.settle).toHaveBeenCalledTimes(1);
  });
});
