import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl/middleware", async () => {
  const { NextResponse } = await import("next/server");
  return {
    default: vi.fn(() => (req: Request) => {
      const url = new URL(req.url);
      const { pathname } = url;
      if (pathname === "/" || pathname === "") {
        const localeUrl = new URL("/th/", req.url);
        return NextResponse.redirect(localeUrl);
      }
      return NextResponse.next();
    }),
  };
});

import { NextRequest } from "next/server";
import { proxy } from "../../proxy";

function createRequest(pathname: string, cookies?: Record<string, string>) {
  const url = new URL(pathname, "http://localhost:3000");
  const req = new NextRequest(url);
  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      req.cookies.set(name, value);
    }
  }
  return req;
}

describe("proxy", () => {
  it("redirects unauthenticated users from /admin to home", async () => {
    const req = createRequest("/admin");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/?redirectTo=%2Fadmin");
  });

  it("redirects unauthenticated users from /th/admin to home", async () => {
    const req = createRequest("/th/admin");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/?redirectTo=%2Fth%2Fadmin");
  });

  it("redirects unauthenticated users from /en/admin to home", async () => {
    const req = createRequest("/en/admin");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/?redirectTo=%2Fen%2Fadmin");
  });

  it("redirects unauthenticated users from /admin/user-123 to home", async () => {
    const req = createRequest("/admin/user-123");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/?redirectTo=%2Fadmin%2Fuser-123");
  });

  it("allows authenticated users through to locale-prefixed admin routes", async () => {
    const req = createRequest("/th/admin", { session_token: "valid-token" });
    const res = await proxy(req);

    expect(res.status).toBe(200);
  });

  it("redirects non-prefixed root path to locale-prefixed version via intl middleware", async () => {
    const req = createRequest("/");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/th/");
  });

  it("allows API routes through without intl processing", async () => {
    const req = createRequest("/api/trpc");
    const res = await proxy(req);

    expect(res.status).toBe(200);
  });

  it("allows static assets through without intl processing", async () => {
    const req = createRequest("/favicon.ico");
    const res = await proxy(req);

    expect(res.status).toBe(200);
  });

  it("redirects unauthenticated access to /th/admin/user-123 to home", async () => {
    const req = createRequest("/th/admin/user-123");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/?redirectTo=%2Fth%2Fadmin%2Fuser-123");
  });
});
