import { describe, it, expect } from "vitest";
import { proxy, config } from "./proxy";
import { NextRequest } from "next/server";

const make = (path: string, cookie?: string) =>
  new NextRequest(
    new URL(`https://workbooks.reading-advantage.com${path}`),
    cookie ? { headers: { cookie } } : undefined
  );

describe("workbooks proxy", () => {
  it("redirects an unauthenticated page request to the SSO start", async () => {
    const res = await proxy(make("/drafts"));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/api/auth/company/start");
    expect(location.searchParams.get("returnTo")).toBe("/drafts");
  });

  it("preserves the query string in returnTo", async () => {
    const res = await proxy(make("/drafts?page=2"));
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("returnTo")).toBe("/drafts?page=2");
  });

  it("allows a request carrying the session cookie", async () => {
    const res = await proxy(make("/drafts", "__Host-ra_workbooks_session=opaque-token"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("never blocks the SSO handshake endpoints", async () => {
    for (const p of ["/api/auth/company/start", "/api/auth/callback", "/api/auth/logout"]) {
      const res = await proxy(make(p));
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("excludes next internals and assets from the matcher", () => {
    const matcher = new RegExp(config.matcher[0].replace(/^\//, "^/").replace(/$/, "$"));
    expect(config.matcher[0]).toContain("_next");
    expect(config.matcher[0]).toContain("\\..*");
  });
});
