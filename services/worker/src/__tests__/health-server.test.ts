import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import {
  createWorkerHealthServer,
  createWorkerHealthState,
  type WorkerHealthServer,
} from "../health.js";

const servers = new Set<WorkerHealthServer>();

afterEach(async () => {
  await Promise.all(Array.from(servers, (server) => server.close()));
  servers.clear();
});

async function startHealthServer() {
  const health = createWorkerHealthState({
    clock: () => new Date("2026-07-22T00:00:00.000Z"),
    serviceName: "worker-test",
  });
  const server = createWorkerHealthServer({
    health,
    host: "127.0.0.1",
    port: 0,
  });
  servers.add(server);
  await server.listen();

  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    health,
    server,
  };
}

describe("worker health server", () => {
  it("uses the system clock when no deterministic clock is supplied", () => {
    const snapshot = createWorkerHealthState({
      serviceName: "worker-clock-test",
    }).snapshot();

    expect(Number.isNaN(Date.parse(snapshot.timestamp))).toBe(false);
  });

  it("is live while readiness stays closed until startup completes", async () => {
    const { baseUrl, health } = await startHealthServer();

    const liveResponse = await fetch(`${baseUrl}/livez`);
    expect(liveResponse.status).toBe(200);
    await expect(liveResponse.json()).resolves.toEqual({
      live: true,
      ready: false,
      service: "worker-test",
      status: "alive",
      timestamp: "2026-07-22T00:00:00.000Z",
    });

    const coldReadiness = await fetch(`${baseUrl}/readyz`);
    expect(coldReadiness.status).toBe(503);

    health.markReady();
    const warmReadiness = await fetch(`${baseUrl}/readyz`);
    expect(warmReadiness.status).toBe(200);
    await expect(warmReadiness.json()).resolves.toMatchObject({
      live: true,
      ready: true,
      status: "ready",
    });
  });

  it("closes readiness while draining without failing liveness", async () => {
    const { baseUrl, health } = await startHealthServer();
    health.markReady();
    health.markDraining();

    expect((await fetch(`${baseUrl}/readyz`)).status).toBe(503);
    const liveResponse = await fetch(`${baseUrl}/healthz`);
    expect(liveResponse.status).toBe(200);
    await expect(liveResponse.json()).resolves.toMatchObject({
      live: true,
      ready: false,
      status: "draining",
    });
  });

  it("supports probe-safe HEAD requests and rejects unsupported routes", async () => {
    const { baseUrl } = await startHealthServer();

    const headResponse = await fetch(`${baseUrl}/livez`, { method: "HEAD" });
    expect(headResponse.status).toBe(200);
    expect(await headResponse.text()).toBe("");

    expect((await fetch(`${baseUrl}/unknown`)).status).toBe(404);
    expect(
      (await fetch(`${baseUrl}/livez`, { method: "POST" })).status,
    ).toBe(405);
  });
});
