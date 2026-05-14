import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../../middleware";

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

describe("middleware", () => {
  it("redirects unauthenticated users from /admin to home", async () => {
    const req = createRequest("/admin");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/?redirectTo=%2Fadmin");
  });

  it("redirects unauthenticated users from /admin/user-123 to home", async () => {
    const req = createRequest("/admin/user-123");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/?redirectTo=%2Fadmin%2Fuser-123");
  });

  it("allows authenticated users through to admin routes (defers role check to tRPC)", async () => {
    const req = createRequest("/admin", { session_token: "valid-token" });
    const res = await middleware(req);

    expect(res.status).toBe(200);
  });

  it("allows all non-admin routes through unchanged", async () => {
    const req = createRequest("/lesson/module-1");
    const res = await middleware(req);

    expect(res.status).toBe(200);
  });
});
