import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

/** Observable lifecycle states exposed by the worker health endpoints. */
export type WorkerHealthStatus = "alive" | "ready" | "draining";

/** Provider-neutral JSON response returned by worker health probes. */
export interface WorkerHealthSnapshot {
  /** Whether the worker process is alive and serving health requests. */
  live: true;
  /** Whether the worker may receive new work. */
  ready: boolean;
  /** Stable service identifier. */
  service: string;
  /** Current worker lifecycle status. */
  status: WorkerHealthStatus;
  /** ISO-8601 time at which the snapshot was generated. */
  timestamp: string;
}

/** Mutable health-state boundary used by the future worker composition root. */
export interface WorkerHealthState {
  /** Marks startup complete and opens readiness unless draining already began. */
  markReady(): void;
  /** Closes readiness before graceful process shutdown. */
  markDraining(): void;
  /** Produces an immutable health snapshot. */
  snapshot(): WorkerHealthSnapshot;
}

/** Dependencies used to construct deterministic worker health state. */
export interface WorkerHealthStateOptions {
  /** Optional time source used for deterministic tests. */
  clock?: () => Date;
  /** Stable service identifier included in every probe response. */
  serviceName: string;
}

/** Network and lifecycle dependencies for the worker health server. */
export interface WorkerHealthServerOptions {
  /** Health state reflected by probe responses. */
  health: WorkerHealthState;
  /** Interface on which the HTTP server listens. */
  host: string;
  /** Port on which the HTTP server listens; zero is allowed for tests. */
  port: number;
}

/** Controllable worker health server used by the process composition root. */
export interface WorkerHealthServer {
  /** Returns the bound address after the server begins listening. */
  address(): AddressInfo | string | null;
  /** Stops accepting health requests and waits for the server to close. */
  close(): Promise<void>;
  /** Starts listening on the configured interface and port. */
  listen(): Promise<void>;
}

type InternalHealthStatus = "starting" | "ready" | "draining";

class DefaultWorkerHealthState implements WorkerHealthState {
  private status: InternalHealthStatus = "starting";

  constructor(private readonly options: Required<WorkerHealthStateOptions>) {}

  markReady(): void {
    if (this.status !== "draining") this.status = "ready";
  }

  markDraining(): void {
    this.status = "draining";
  }

  snapshot(): WorkerHealthSnapshot {
    const ready = this.status === "ready";
    const status: WorkerHealthStatus =
      this.status === "starting" ? "alive" : this.status;

    return Object.freeze({
      live: true,
      ready,
      service: this.options.serviceName,
      status,
      timestamp: this.options.clock().toISOString(),
    });
  }
}

/**
 * Writes one JSON health response with cache prevention headers.
 * @param response Node HTTP response to complete.
 * @param statusCode HTTP status selected by the probe state.
 * @param snapshot Current immutable health snapshot.
 * @param includeBody Whether the request method permits a response body.
 * @returns Nothing after the response is completed.
 */
function writeHealthResponse(
  response: ServerResponse,
  statusCode: number,
  snapshot: WorkerHealthSnapshot,
  includeBody: boolean,
): void {
  const body = JSON.stringify(snapshot);
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-length": includeBody ? Buffer.byteLength(body) : 0,
    "content-type": "application/json; charset=utf-8",
  });
  response.end(includeBody ? body : undefined);
}

/**
 * Closes one Node HTTP server while tolerating an already-closed instance.
 * @param server Node HTTP server to close.
 * @returns A promise settled after the server stops accepting requests.
 */
function closeServer(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();

  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

/**
 * Creates the fail-closed worker health lifecycle state.
 * @param options Service identity and optional deterministic time source.
 * @returns A health state that begins live but not ready.
 */
export function createWorkerHealthState(
  options: WorkerHealthStateOptions,
): WorkerHealthState {
  return new DefaultWorkerHealthState({
    clock: options.clock ?? (() => new Date()),
    serviceName: options.serviceName,
  });
}

/**
 * Creates an HTTP server exposing liveness and readiness probes only.
 * @param options Network configuration and health state.
 * @returns A controllable server that has not started listening yet.
 */
export function createWorkerHealthServer(
  options: WorkerHealthServerOptions,
): WorkerHealthServer {
  const knownPaths = new Set(["/healthz", "/livez", "/readyz"]);
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://worker.local").pathname;
    if (!knownPaths.has(path)) {
      response.writeHead(404).end();
      return;
    }

    const method = request.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      response.writeHead(405, { allow: "GET, HEAD" }).end();
      return;
    }

    const snapshot = options.health.snapshot();
    const statusCode = path === "/readyz" && !snapshot.ready ? 503 : 200;
    writeHealthResponse(response, statusCode, snapshot, method !== "HEAD");
  });

  return {
    address: () => server.address(),
    close: () => closeServer(server),
    listen: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(options.port, options.host, () => {
          server.off("error", reject);
          resolve();
        });
      }),
  };
}
