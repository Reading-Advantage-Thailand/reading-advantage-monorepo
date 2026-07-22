import { describe, expect, it } from "vitest";

import { parseWorkerStartupConfig } from "../startup-config.js";

describe("parseWorkerStartupConfig", () => {
  it("provides portable HTTP defaults without requiring a database URL", () => {
    expect(parseWorkerStartupConfig({ NODE_ENV: "production" })).toEqual({
      environment: "production",
      host: "0.0.0.0",
      port: 8080,
      serviceName: "reading-advantage-worker",
      shutdownGraceMs: 10_000,
    });
  });

  it("accepts explicit startup configuration", () => {
    expect(
      parseWorkerStartupConfig({
        HOST: "127.0.0.1",
        NODE_ENV: "test",
        PORT: "9090",
        WORKER_SERVICE_NAME: "worker-smoke",
        WORKER_SHUTDOWN_GRACE_MS: "2500",
      }),
    ).toEqual({
      environment: "test",
      host: "127.0.0.1",
      port: 9090,
      serviceName: "worker-smoke",
      shutdownGraceMs: 2500,
    });
  });

  it.each([
    [{ PORT: "0" }, "PORT"],
    [{ PORT: "65536" }, "PORT"],
    [{ PORT: "not-a-port" }, "PORT"],
    [{ HOST: "" }, "HOST"],
    [{ WORKER_SERVICE_NAME: "contains spaces" }, "WORKER_SERVICE_NAME"],
    [{ WORKER_SHUTDOWN_GRACE_MS: "0" }, "WORKER_SHUTDOWN_GRACE_MS"],
    [{ NODE_ENV: "staging" }, "NODE_ENV"],
  ])("rejects invalid startup input %j", (environment, field) => {
    expect(() => parseWorkerStartupConfig(environment)).toThrow(field);
  });
});
