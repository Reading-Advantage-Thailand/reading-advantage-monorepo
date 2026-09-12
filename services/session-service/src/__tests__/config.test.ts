import { describe, expect, it } from "vitest";

import { parseSessionServiceConfig } from "../config.js";

describe("parseSessionServiceConfig", () => {
  it("defaults to the memory store and the worker-standard port", () => {
    const config = parseSessionServiceConfig({});
    expect(config.host).toBe("0.0.0.0");
    expect(config.port).toBe(8080);
    expect(config.store.kind).toBe("memory");
  });

  it("parses a redis store from SESSION_STORE and REDIS_URL", () => {
    const config = parseSessionServiceConfig({
      SESSION_STORE: "redis",
      REDIS_URL: "redis://localhost:6379",
    });
    expect(config.store.kind).toBe("redis");
    if (config.store.kind === "redis") {
      expect(config.store.redisUrl).toBe("redis://localhost:6379");
    }
  });

  it("honors HOST and PORT overrides", () => {
    const config = parseSessionServiceConfig({ HOST: "0.0.0.0", PORT: "9000" });
    expect(config.host).toBe("0.0.0.0");
    expect(config.port).toBe(9000);
  });

  it("rejects a redis store without REDIS_URL", () => {
    expect(() =>
      parseSessionServiceConfig({ SESSION_STORE: "redis" }),
    ).toThrow();
  });

  it("rejects a non-numeric port", () => {
    expect(() =>
      parseSessionServiceConfig({ PORT: "not-a-number" }),
    ).toThrow();
  });
});
