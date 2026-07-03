import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp } from "../client-ip.js";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers,
  });
}

describe("getClientIp", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TRUST_PROXY_COUNT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses the leftmost XFF entry by default (legacy behavior)", async () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("skips the rightmost trusted proxies", async () => {
    process.env.TRUST_PROXY_COUNT = "1";
    // client, proxy
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("ignores attacker-prepended IPs when proxies are trusted", async () => {
    process.env.TRUST_PROXY_COUNT = "1";
    // attacker-spoofed, real-client, proxy
    const req = makeRequest({ "x-forwarded-for": "9.9.9.9, 1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to X-Real-IP when XFF is absent", async () => {
    const req = makeRequest({ "x-real-ip": "1.2.3.4" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to X-Real-IP when XFF does not contain enough entries", async () => {
    process.env.TRUST_PROXY_COUNT = "1";
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "2.2.2.2" });
    expect(getClientIp(req)).toBe("2.2.2.2");
  });

  it("ignores XFF when TRUST_PROXY_COUNT is 0", async () => {
    process.env.TRUST_PROXY_COUNT = "0";
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "2.2.2.2" });
    expect(getClientIp(req)).toBe("2.2.2.2");
  });

  it("returns undefined when no IP headers are present", async () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBeUndefined();
  });

  it("treats invalid TRUST_PROXY_COUNT as legacy (leftmost XFF)", async () => {
    process.env.TRUST_PROXY_COUNT = "not-a-number";
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("trims whitespace from IP values", async () => {
    const req = makeRequest({ "x-forwarded-for": "  1.2.3.4  " });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });
});
