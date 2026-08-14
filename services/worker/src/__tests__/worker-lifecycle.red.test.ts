import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { DurableJobWorkerPort, JobEnvelope } from "../../../../packages/backend/src/jobs/index.js";
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

type WorkerLifecyclePort = Pick<
  DurableJobWorkerPort,
  "claim" | "heartbeat" | "settle" | "fail" | "reclaimExpired"
>;

type WorkerJob = Extract<JobEnvelope, { state: "running" }>;

const workerCompositionSource = fileURLToPath(
  new URL("../worker-composition.ts", import.meta.url),
);

const fixedNow = "2026-08-13T00:00:00.000Z";
const globalScope = { mode: "global" } as const;
const tenantScope = { mode: "tenant", tenantId: "school-1" } as const;

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
  tenantMode: WorkerHandler["tenantMode"] = "global",
): WorkerHandler => ({
  jobName: "codecamp.review-pr",
  tenantMode,
  payload: z.object({
    secret: z.string().optional(),
    value: z.string(),
  }),
  result: z.object({ ok: z.boolean() }),
  handle: vi.fn(handle),
});

const createJob = (
  index: number,
  secret = `secret-${index}`,
  tenant: WorkerJob["tenant"] = globalScope,
): WorkerJob => ({
  id: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
  jobName: "codecamp.review-pr",
  queueName: "review",
  tenant,
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

  const port = {
    claim: vi.fn(async (
      request: Parameters<DurableJobWorkerPort["claim"]>[0],
    ): ReturnType<DurableJobWorkerPort["claim"]> => {
      void request;
      const claimedJobs = pendingJobs;
      pendingJobs = [];
      return claimedJobs.length > 0
        ? { outcome: "claimed", jobs: claimedJobs }
        : { outcome: "empty" };
    }),
    heartbeat: vi.fn(async (
      request: Parameters<DurableJobWorkerPort["heartbeat"]>[0],
    ): ReturnType<DurableJobWorkerPort["heartbeat"]> => {
      void request;
      return { outcome: "extended", expiresAt: "2026-08-13T00:01:00.000Z" };
    }),
    settle: vi.fn(async (
      request: Parameters<DurableJobWorkerPort["settle"]>[0],
    ): ReturnType<DurableJobWorkerPort["settle"]> => {
      void request;
      return { outcome: "settled", state: "succeeded" };
    }),
    fail: vi.fn(async (
      request: Parameters<DurableJobWorkerPort["fail"]>[0],
    ): ReturnType<DurableJobWorkerPort["fail"]> => {
      void request;
      return { outcome: "dead" };
    }),
    reclaimExpired: vi.fn(
      async (
        request: Parameters<DurableJobWorkerPort["reclaimExpired"]>[0],
      ): ReturnType<DurableJobWorkerPort["reclaimExpired"]> => {
        void request;
        return { outcome: "no-op" };
      },
    ),
  };

  const lifecyclePort: WorkerLifecyclePort = port;
  void lifecyclePort;
  return port;
};

const forbiddenAdministrativeMethods = ["enqueue", "listDead", "replay"] as const;

const trapForbiddenAdministrativeMethods = (port: WorkerLifecyclePort): void => {
  for (const forbiddenMethod of forbiddenAdministrativeMethods) {
    Object.defineProperty(port, forbiddenMethod, {
      configurable: true,
      get: () => {
        throw new Error(`Worker accessed forbidden job-port method: ${forbiddenMethod}`);
      },
    });
  }
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
  preparePort: (port: WorkerLifecyclePort) => void = () => undefined,
  pollingScope: WorkerJob["tenant"] = globalScope,
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
  preparePort(port);
  const registry = createRegistry([handler]);
  const config = parseConfig(validEnvironment);
  const composition = createWorkerComposition({
    config,
    health,
    logger,
    pollingScope,
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

    const persistedError = port.fail.mock.calls[0]?.[0]?.error;
    expect(persistedError).toStrictEqual({
      code: expect.any(String),
      safeSummary: expect.any(String),
    });
    for (const forbiddenField of [
      "rawError",
      "stack",
      "providerResponse",
      "payload",
      "message",
      "unknownField",
    ]) {
      expect(persistedError).not.toHaveProperty(forbiddenField);
    }
    expect(JSON.stringify(persistedError)).not.toContain(payloadSecret);
    expect(JSON.stringify(persistedError)).not.toContain(providerSecret);
  });

  it("uses only the worker lifecycle job port across every lifecycle path", async () => {
    const jobStarted = createDeferred();
    const releaseJob = createDeferred();
    const startCase = await createComposition(
      [createJob(1)],
      createHandler(async () => {
        jobStarted.resolve();
        await releaseJob.promise;
        return { ok: true };
      }),
      {},
      trapForbiddenAdministrativeMethods,
    );

    const startPromise = startCase.composition.start();
    await jobStarted.promise;
    await waitFor(() => startCase.health.snapshot().ready, "worker readiness");
    const stopPromise = startCase.composition.stop("SIGTERM");
    expect(startCase.health.snapshot()).toMatchObject({
      ready: false,
      status: "draining",
    });
    releaseJob.resolve();
    await expect(stopPromise).resolves.toBeUndefined();
    await expect(startPromise).resolves.toBeUndefined();
    expect(startCase.port.claim).toHaveBeenCalled();
    expect(startCase.port.settle).toHaveBeenCalledTimes(1);

    const successCase = await createComposition(
      [createJob(2)],
      createHandler(),
      {},
      trapForbiddenAdministrativeMethods,
    );
    await successCase.composition.pollOnce();
    expect(successCase.port.settle).toHaveBeenCalledTimes(1);

    const failureCase = await createComposition(
      [createJob(3)],
      createHandler(async () => {
        throw new Error("provider failure");
      }),
      {},
      trapForbiddenAdministrativeMethods,
    );
    await expect(failureCase.composition.pollOnce()).resolves.toBeUndefined();
    expect(failureCase.port.fail).toHaveBeenCalledTimes(1);

    const reclaimCase = await createComposition(
      [],
      createHandler(),
      {},
      trapForbiddenAdministrativeMethods,
    );
    await reclaimCase.composition.pollOnce();
    expect(reclaimCase.port.reclaimExpired).toHaveBeenCalledTimes(1);
  });

  it("uses the declared tenant polling scope for accepted jobs and lifecycle requests", async () => {
    const handledTenants: unknown[] = [];
    const releaseJob = createDeferred();
    const tenantJob = createJob(8, undefined, tenantScope);
    const handler = createHandler(async (context) => {
      handledTenants.push(context.tenant);
      await releaseJob.promise;
      return { ok: true };
    }, "tenant");
    const heartbeatCase = await createComposition([tenantJob], handler, {
      config: {
        queueName: "review",
        workerId: "worker-red-1",
        concurrency: 2,
        pollIntervalMs: 1,
        leaseSeconds: 1,
        shutdownGraceMs: 1_000,
      },
      sleep: async (milliseconds: number): Promise<void> => {
        await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
      },
    }, () => undefined, tenantScope);

    const startPromise = heartbeatCase.composition.start();
    await waitFor(() => handledTenants.length === 1, "tenant handler context");
    await waitFor(
      () => heartbeatCase.port.heartbeat.mock.calls.length >= 1,
      "tenant heartbeat request",
    );
    const stopPromise = heartbeatCase.composition.stop("SIGTERM");
    releaseJob.resolve();
    await expect(stopPromise).resolves.toBeUndefined();
    await expect(startPromise).resolves.toBeUndefined();

    expect(handledTenants).toEqual([tenantScope]);
    expect(heartbeatCase.port.claim.mock.calls[0]?.[0].tenant).toStrictEqual(
      tenantScope,
    );
    expect(heartbeatCase.port.settle).toHaveBeenCalledTimes(1);
    for (const [request] of heartbeatCase.port.heartbeat.mock.calls) {
      expect(request.tenant).toStrictEqual(tenantScope);
    }
    for (const [request] of heartbeatCase.port.settle.mock.calls) {
      expect(request.tenant).toStrictEqual(tenantScope);
    }
    for (const [request] of heartbeatCase.port.reclaimExpired.mock.calls) {
      expect(request.tenant).toStrictEqual(tenantScope);
    }

    const failureTenants: unknown[] = [];
    const failureCase = await createComposition(
      [createJob(9, undefined, tenantScope)],
      createHandler(async (context) => {
        failureTenants.push(context.tenant);
        throw new Error("provider failure");
      }, "tenant"),
      {},
      () => undefined,
      tenantScope,
    );
    await expect(failureCase.composition.pollOnce()).resolves.toBeUndefined();
    expect(failureTenants).toEqual([tenantScope]);
    expect(failureCase.port.claim.mock.calls[0]?.[0].tenant).toStrictEqual(
      tenantScope,
    );
    expect(failureCase.port.fail).toHaveBeenCalledTimes(1);
    for (const [request] of failureCase.port.fail.mock.calls) {
      expect(request.tenant).toStrictEqual(tenantScope);
    }
    for (const [request] of failureCase.port.reclaimExpired.mock.calls) {
      expect(request.tenant).toStrictEqual(tenantScope);
    }

    const reclaimCase = await createComposition(
      [],
      createHandler(undefined, "tenant"),
      {},
      () => undefined,
      tenantScope,
    );
    await reclaimCase.composition.pollOnce();
    expect(reclaimCase.port.claim.mock.calls[0]?.[0].tenant).toStrictEqual(
      tenantScope,
    );
    expect(reclaimCase.port.reclaimExpired).toHaveBeenCalledTimes(1);
    for (const [request] of reclaimCase.port.reclaimExpired.mock.calls) {
      expect(request.tenant).toStrictEqual(tenantScope);
    }
  });

  it("rejects an envelope outside the declared polling scope before the handler", async () => {
    const handler = createHandler(undefined, "tenant");
    const { composition, port } = await createComposition(
      [createJob(10, undefined, globalScope)],
      handler,
      {},
      () => undefined,
      tenantScope,
    );

    await expect(composition.pollOnce()).rejects.toThrow(/tenant|scope|mismatch/i);
    expect(port.claim).toHaveBeenCalledTimes(1);
    expect(port.claim.mock.calls[0]?.[0].tenant).toStrictEqual(tenantScope);
    expect(handler.handle).not.toHaveBeenCalled();
    expect(port.heartbeat).not.toHaveBeenCalled();
    expect(port.settle).not.toHaveBeenCalled();
    expect(port.fail).not.toHaveBeenCalled();
    for (const [request] of port.reclaimExpired.mock.calls) {
      expect(request.tenant).toStrictEqual(tenantScope);
    }
  });
});
