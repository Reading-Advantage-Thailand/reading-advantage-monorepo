import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

const SECURITY_HEADER_KEYS = [
  "Content-Security-Policy",
  "Permissions-Policy",
] as const;

describe("next.config security headers", () => {
  it("sets Content-Security-Policy and Permissions-Policy on every source", async () => {
    const headerGroups = (await nextConfig.headers?.()) ?? [];

    expect(headerGroups.length).toBeGreaterThan(0);
    for (const group of headerGroups) {
      const keys = group.headers.map((header) => header.key);
      for (const key of SECURITY_HEADER_KEYS) {
        expect(keys).toContain(key);
      }
    }
  });

  it("matches the sibling accounts Content-Security-Policy policy", async () => {
    const headerGroups = (await nextConfig.headers?.()) ?? [];
    const csp = headerGroups
      .flatMap((group) => group.headers)
      .find((header) => header.key === "Content-Security-Policy");

    expect(csp?.value).toContain("default-src 'self'");
    expect(csp?.value).toContain("frame-ancestors 'none'");
    expect(csp?.value).toContain("base-uri 'none'");
    expect(csp?.value).toContain("form-action 'self'");
  });

  it("disallows camera, microphone, and geolocation", async () => {
    const headerGroups = (await nextConfig.headers?.()) ?? [];
    const permissions = headerGroups
      .flatMap((group) => group.headers)
      .find((header) => header.key === "Permissions-Policy");

    expect(permissions?.value).toBe("camera=(), microphone=(), geolocation=()");
  });
});
