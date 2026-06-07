import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

async function getHeadersConfig() {
  expect(typeof nextConfig).toBe("object");
  const headers = nextConfig.headers;
  expect(typeof headers).toBe("function");
  return headers();
}

function headersForSource(entries: Awaited<ReturnType<NonNullable<typeof nextConfig.headers>>>, source: string) {
  const entry = entries.find((candidate) => candidate.source === source);
  expect(entry, `missing headers() source ${source}`).toBeDefined();
  return new Map(entry?.headers.map((header) => [header.key.toLowerCase(), header.value]));
}

describe("next.config security headers", () => {
  it("sets all P0 security headers on app routes", async () => {
    const entries = await getHeadersConfig();
    const headers = headersForSource(entries, "/(.*)");

    expect(headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("strict-transport-security")).toMatch(/max-age=\d+/);
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });

  it("sets same-origin CORS headers on API routes", async () => {
    const entries = await getHeadersConfig();
    const headers = headersForSource(entries, "/api/(.*)");

    expect(headers.get("access-control-allow-origin")).toBe("https://codecamp.reading-advantage.com");
    expect(headers.get("access-control-allow-methods")).toContain("OPTIONS");
    expect(headers.get("access-control-allow-headers")).toContain("Content-Type");
    expect(headers.get("access-control-allow-headers")).toContain("Authorization");
    expect(headers.get("strict-transport-security")).toMatch(/max-age=\d+/);
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  });
});
