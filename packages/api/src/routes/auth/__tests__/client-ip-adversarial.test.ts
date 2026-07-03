/**
 * Adversarial probes for `getClientIp` — XFF spoofing, header-bomb,
 * malformed IP, IPv6, and TRUST_PROXY_COUNT edge cases.
 *
 * These tests probe boundary cases that the happy-path tests in
 * `client-ip.test.ts` do not cover. They are pure unit tests — no DB,
 * no network — so they can run on any environment.
 *
 * Why this file matters: the X-Forwarded-For header is attacker-controlled
 * unless the request passed through a known proxy chain. The
 * `getClientIp` helper is the sole gate between the request and the
 * per-IP rate limiter, so any flaw here lets an attacker either (a)
 * evade the per-IP limiter entirely, or (b) poison another client's
 * rate-limit bucket.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp } from "../client-ip.js";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers,
  });
}

describe("getClientIp — adversarial probes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TRUST_PROXY_COUNT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ───────────────────────────────────────────────────────────────────
  // Empty / missing header behavior
  // ───────────────────────────────────────────────────────────────────

  it("falls back to x-real-ip when XFF is an empty string and proxies are trusted", () => {
    process.env.TRUST_PROXY_COUNT = "1";
    const req = makeRequest({
      "x-forwarded-for": "",
      "x-real-ip": "2.2.2.2",
    });
    expect(getClientIp(req)).toBe("2.2.2.2");
  });

  it("returns undefined when XFF is empty, x-real-ip is absent, and proxies are trusted", () => {
    process.env.TRUST_PROXY_COUNT = "1";
    const req = makeRequest({ "x-forwarded-for": "" });
    expect(getClientIp(req)).toBeUndefined();
  });

  it("returns undefined when XFF is whitespace-only and proxies are trusted", () => {
    process.env.TRUST_PROXY_COUNT = "1";
    const req = makeRequest({
      "x-forwarded-for": "   ",
      "x-real-ip": "  ",
    });
    // The helper trims X-Real-IP only; whitespace-only xri falls
    // through. After trim + filter(Boolean), the XFF array is empty
    // and the function falls through to x-real-ip which is also empty
    // → undefined.
    expect(getClientIp(req)).toBeUndefined();
  });

  it("does not throw when XFF contains only commas and spaces", () => {
    process.env.TRUST_PROXY_COUNT = "1";
    const req = makeRequest({
      "x-forwarded-for": ", , ,",
      "x-real-ip": "9.9.9.9",
    });
    expect(() => getClientIp(req)).not.toThrow();
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  // ───────────────────────────────────────────────────────────────────
  // Header-bomb — large XFF lists
  // ───────────────────────────────────────────────────────────────────

  it("handles a 100-entry XFF list without throwing", () => {
    process.env.TRUST_PROXY_COUNT = "1";
    const entries = Array.from({ length: 100 }, (_, i) => `10.0.0.${i}`);
    const req = makeRequest({ "x-forwarded-for": entries.join(", ") });
    expect(() => getClientIp(req)).not.toThrow();
    // With TRUST_PROXY_COUNT=1, the rightmost entry is the trusted
    // proxy and the client IP is the one immediately to its left.
    // entries[98] = "10.0.0.98".
    expect(getClientIp(req)).toBe("10.0.0.98");
  });

  it("handles a 1000-entry XFF list without throwing", () => {
    process.env.TRUST_PROXY_COUNT = "1";
    const entries = Array.from({ length: 1000 }, (_, i) => `10.0.0.${i % 256}`);
    const req = makeRequest({ "x-forwarded-for": entries.join(", ") });
    expect(() => getClientIp(req)).not.toThrow();
    // The trusted proxy is the rightmost entry (index 999). The
    // client IP is index 998.
    expect(getClientIp(req)).toBe(entries[998]);
  });

  it("ignores attacker-prepended entries when TRUST_PROXY_COUNT > 0", () => {
    process.env.TRUST_PROXY_COUNT = "2";
    // Attacker appends 9.9.9.9 to the head of XFF hoping the
    // naive-leftmost fallback would return it.
    const entries = ["9.9.9.9", "8.8.8.8", "7.7.7.7", "6.6.6.6", "5.5.5.5", "1.2.3.4", "10.0.0.1", "10.0.0.2"];
    const req = makeRequest({ "x-forwarded-for": entries.join(", ") });
    // With TRUST_PROXY_COUNT=2, rightmost two entries (10.0.0.2 and
    // 10.0.0.1) are trusted proxies; client IP is index 5 = "1.2.3.4".
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  // ───────────────────────────────────────────────────────────────────
  // Malformed IPs — graceful handling
  // ───────────────────────────────────────────────────────────────────

  it("returns the leftmost plausible IP when XFF mixes malformed and valid entries", () => {
    process.env.TRUST_PROXY_COUNT = "1";
    // The current implementation does NOT validate IP syntax — it
    // returns the trimmed string at the computed index. Pin this so
    // a future strict-validation change does not silently reject
    // legacy proxy IPs that happen to look non-standard.
    const req = makeRequest({
      "x-forwarded-for": "not-an-ip, 1.2.3.4, 5.6.7.8",
    });
    // With TRUST_PROXY_COUNT=1, ips.length=3 > 1, so client IP is
    // ips[3 - 1 - 1] = ips[1] = "1.2.3.4". The malformed
    // "not-an-ip" is at index 0 and is ignored.
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("does not crash on XFF with port-suffixed IPs", () => {
    process.env.TRUST_PROXY_COUNT = "1";
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4:8080, 5.6.7.8",
    });
    expect(() => getClientIp(req)).not.toThrow();
    expect(getClientIp(req)).toBe("1.2.3.4:8080");
  });

  // ───────────────────────────────────────────────────────────────────
  // Private / internal IPs
  // ───────────────────────────────────────────────────────────────────

  it("returns the correct private IP with TRUST_PROXY_COUNT=2", () => {
    process.env.TRUST_PROXY_COUNT = "2";
    // Three internal hops plus two trusted public proxies.
    const req = makeRequest({
      "x-forwarded-for": "192.168.1.10, 10.0.0.5, 172.16.0.1, 203.0.113.1, 198.51.100.1",
    });
    // Rightmost two are trusted; client is ips[5 - 2 - 1] = ips[2]
    // = "172.16.0.1".
    expect(getClientIp(req)).toBe("172.16.0.1");
  });

  // ───────────────────────────────────────────────────────────────────
  // TRUST_PROXY_COUNT=0 — ignore XFF entirely
  // ───────────────────────────────────────────────────────────────────

  it("ignores XFF entirely when TRUST_PROXY_COUNT=0 and uses x-real-ip", () => {
    process.env.TRUST_PROXY_COUNT = "0";
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "5.6.7.8",
    });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("returns undefined when TRUST_PROXY_COUNT=0 and no x-real-ip is set", () => {
    process.env.TRUST_PROXY_COUNT = "0";
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBeUndefined();
  });

  it("does not pick the leftmost XFF entry when TRUST_PROXY_COUNT=0 (anti-spoof)", () => {
    // Attacker hopes that with no proxy configured the legacy
    // leftmost fallback activates. With TRUST_PROXY_COUNT=0 explicit,
    // XFF must be ignored entirely.
    process.env.TRUST_PROXY_COUNT = "0";
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(req)).toBeUndefined();
  });

  // ───────────────────────────────────────────────────────────────────
  // IPv6 addresses
  // ───────────────────────────────────────────────────────────────────

  it("handles IPv6 addresses in XFF with TRUST_PROXY_COUNT=1", () => {
    process.env.TRUST_PROXY_COUNT = "1";
    const req = makeRequest({
      "x-forwarded-for": "2001:db8::1, 2001:db8::2",
    });
    // Rightmost is trusted proxy (2001:db8::2); client IP is
    // ips[0] = "2001:db8::1".
    expect(getClientIp(req)).toBe("2001:db8::1");
  });

  it("handles a bracketed IPv6 address in x-real-ip", () => {
    process.env.TRUST_PROXY_COUNT = "0";
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "[2001:db8::1]",
    });
    // The helper trims but does not strip brackets. Pin the actual
    // shipped behavior so a future strict-IP-parse change does not
    // silently break IPv6 deployments.
    expect(getClientIp(req)).toBe("[2001:db8::1]");
  });

  // ───────────────────────────────────────────────────────────────────
  // Case sensitivity — header names
  // ───────────────────────────────────────────────────────────────────

  it("returns undefined when XFF is absent and only an unrelated header is set", () => {
    process.env.TRUST_PROXY_COUNT = "1";
    const req = makeRequest({ "X-Custom-Header": "1.2.3.4" });
    expect(getClientIp(req)).toBeUndefined();
  });

  // ───────────────────────────────────────────────────────────────────
  // TRUST_PROXY_COUNT edge values
  // ───────────────────────────────────────────────────────────────────

  it("treats a negative TRUST_PROXY_COUNT as undefined (legacy leftmost fallback)", () => {
    process.env.TRUST_PROXY_COUNT = "-1";
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    });
    // getTrustProxyCount() returns undefined when the parsed value is
    // < 0. The legacy leftmost path activates.
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("treats a non-integer TRUST_PROXY_COUNT as undefined", () => {
    process.env.TRUST_PROXY_COUNT = "1.5";
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when XFF has fewer entries than trustProxyCount", () => {
    process.env.TRUST_PROXY_COUNT = "5";
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      "x-real-ip": "9.9.9.9",
    });
    // ips.length (2) is NOT greater than trustProxyCount (5), so
    // the helper falls through to x-real-ip.
    expect(getClientIp(req)).toBe("9.9.9.9");
  });
});