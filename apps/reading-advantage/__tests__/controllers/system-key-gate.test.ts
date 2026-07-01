/**
 * System Access Key Gate Tests
 *
 * Proves that assertSystemAccess fails closed when the access key is missing,
 * invalid, or empty, and allows the request to proceed only when the supplied
 * Access-Key header matches the configured non-empty secret.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { assertSystemAccess } from "@/server/middleware/system-key";

describe("assertSystemAccess", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ACCESS_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function makeRequest(key?: string): NextRequest {
    const headers: Record<string, string> = {};
    if (key !== undefined) {
      headers["Access-Key"] = key;
    }
    return new NextRequest("http://localhost:3000/api/v1/system/refresh-views", {
      method: "POST",
      headers,
    });
  }

  it("rejects requests when ACCESS_KEY is not configured", async () => {
    const res = assertSystemAccess(makeRequest("any-key"));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it("rejects requests with an incorrect access key", async () => {
    process.env.ACCESS_KEY = "a-reasonably-long-configured-secret-key-32chars";
    const res = assertSystemAccess(makeRequest("wrong-key"));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it("rejects requests when the configured key is empty", async () => {
    process.env.ACCESS_KEY = "";
    const res = assertSystemAccess(makeRequest(""));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });

  it("allows requests with the correct access key", async () => {
    process.env.ACCESS_KEY = "a-reasonably-long-configured-secret-key-32chars";
    const res = assertSystemAccess(makeRequest(process.env.ACCESS_KEY));
    expect(res).toBeNull();
  });

  it("is case-sensitive for the access key value", async () => {
    process.env.ACCESS_KEY = "a-reasonably-long-configured-secret-key-32chars";
    const res = assertSystemAccess(
      makeRequest(process.env.ACCESS_KEY.toUpperCase())
    );
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
  });
});
