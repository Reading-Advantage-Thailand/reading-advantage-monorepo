import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

const { codecampSessionRoleMock, introspectMock, requireRoleMock } = vi.hoisted(() => ({
  codecampSessionRoleMock: vi.fn(),
  introspectMock: vi.fn(),
  requireRoleMock: vi.fn(),
}));

vi.mock("@reading-advantage/auth", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/auth")>(
    "@reading-advantage/auth"
  );
  return {
    ...actual,
    requireRole: requireRoleMock,
  };
});

vi.mock("@reading-advantage/db", () => ({ db: {} }));

vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  codecampSessionRole: codecampSessionRoleMock,
  getCodecampOidcClient: () => ({ introspect: introspectMock }),
}));

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
import { proxy, config } from "../../proxy";

function mockAdmin() {
  requireRoleMock.mockResolvedValue({
    user: { id: "u1", role: "ADMIN", schoolId: "s1", email: "a@b.com", username: "a" },
    token: "valid-token",
  });
}

function createRequest(pathname: string, cookies?: Record<string, string>, headers?: HeadersInit) {
  const url = new URL(pathname, "http://localhost:3000");
  const req = new NextRequest(url, { headers });
  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      req.cookies.set(name, value);
    }
  }
  return req;
}

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CODECAMP_AUTH_MODE", "legacy");
    introspectMock.mockResolvedValue({ identity: { roles: ["ADMIN"] } });
    codecampSessionRoleMock.mockReturnValue("ADMIN");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects unauthenticated users from /admin to home", async () => {
    const req = createRequest("/admin");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects unauthenticated users from /th/admin to home", async () => {
    const req = createRequest("/th/admin");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects unauthenticated users from /en/admin to home", async () => {
    const req = createRequest("/en/admin");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects unauthenticated users from /admin/user-123 to home", async () => {
    const req = createRequest("/admin/user-123");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("allows authenticated users through to locale-prefixed admin routes", async () => {
    mockAdmin();
    const req = createRequest("/th/admin", { session_token: "valid-token" });
    const res = await proxy(req);

    expect(res.status).toBe(200);
  });

  it("redirects non-prefixed root path to locale-prefixed version via intl middleware", async () => {
    const req = createRequest("/");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/th");
  });

  it("keeps an English locale cookie on an unprefixed root request", async () => {
    const req = createRequest("/", { NEXT_LOCALE: "en" });
    const res = await proxy(req);
    const location = new URL(res.headers.get("location")!);

    expect(location.pathname).toMatch(/^\/en\/?$/);
    expect(res.headers.get("set-cookie") ?? "").not.toContain("NEXT_LOCALE=");
  });

  it("sets the default locale only for a cookieless root request", async () => {
    const req = createRequest("/");
    const res = await proxy(req);
    const location = new URL(res.headers.get("location")!);

    expect(location.pathname).toMatch(/^\/th\/?$/);
    expect(res.headers.get("set-cookie") ?? "").toContain("NEXT_LOCALE=th");
  });

  it("builds non-prefixed locale redirects from forwarded Cloud Run host headers", async () => {
    const req = createRequest("/", undefined, {
      "x-forwarded-host": "codecamp.reading-advantage.com",
      "x-forwarded-proto": "https",
    });
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://codecamp.reading-advantage.com/th");
  });

  it("allows API routes through without intl processing", async () => {
    const req = createRequest("/api/trpc");
    const res = await proxy(req);

    expect(res.status).toBe(200);
  });

  it("allows webhook routes through without intl processing", async () => {
    const req = createRequest("/webhooks/github/pr");
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
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("allows authenticated users through to nested locale-prefixed admin routes", async () => {
    mockAdmin();
    const req = createRequest("/en/admin/user-123", { session_token: "valid-token" });
    const res = await proxy(req);

    expect(res.status).toBe(200);
  });

  it("blocks uppercase /Admin bypass via case-insensitive match", async () => {
    const req = createRequest("/Admin");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("blocks /EN/Admin bypass via case-insensitive match", async () => {
    const req = createRequest("/EN/Admin");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects a company-mode unauthenticated admin request to Accounts start", async () => {
    vi.stubEnv("CODECAMP_AUTH_MODE", "company");
    const req = createRequest("/en/admin?tab=users", undefined, {
      "x-forwarded-host": "codecamp.reading-advantage.com",
      "x-forwarded-proto": "https",
    });
    const res = await proxy(req);
    const location = new URL(res.headers.get("location")!);

    expect(res.status).toBe(307);
    expect(location.origin).toBe("https://codecamp.reading-advantage.com");
    expect(location.pathname).toBe("/api/auth/company/start");
    expect(location.searchParams.getAll("returnTo")).toEqual(["/en/admin?tab=users"]);
    expect(location.searchParams.get("redirectTo")).toBeNull();
  });

  it("allows only a verified company ADMIN session through to admin", async () => {
    vi.stubEnv("CODECAMP_AUTH_MODE", "company");
    const req = createRequest("/en/admin", {
      "__Host-ra_codecamp_session": "admin-token",
    });

    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(introspectMock).toHaveBeenCalledWith("admin-token");
    expect(codecampSessionRoleMock).toHaveBeenCalledWith({ roles: ["ADMIN"] });
  });

  it.each(["INTERN", "STUDENT"])(
    "denies a verified company %s session from admin",
    async (role) => {
      vi.stubEnv("CODECAMP_AUTH_MODE", "company");
      introspectMock.mockResolvedValue({ identity: { roles: [role] } });
      codecampSessionRoleMock.mockReturnValue(role);
      const req = createRequest("/en/admin", {
        "__Host-ra_codecamp_session": "user-token",
      });

      const res = await proxy(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "http://localhost:3000/?error=forbidden",
      );
    },
  );

  it("denies a malformed company session and clears its cookie", async () => {
    vi.stubEnv("CODECAMP_AUTH_MODE", "company");
    introspectMock.mockResolvedValue({ identity: { roles: ["UNKNOWN"] } });
    codecampSessionRoleMock.mockImplementation(() => {
      throw new Error("Accounts session has no recognized Codecamp role.");
    });
    const req = createRequest("/en/admin", {
      "__Host-ra_codecamp_session": "malformed-token",
    });

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/?error=session_check_failed",
    );
    expect(res.headers.get("set-cookie")).toContain(
      "__Host-ra_codecamp_session=;",
    );
  });

  it("denies an invalid company session and restarts sign-in", async () => {
    vi.stubEnv("CODECAMP_AUTH_MODE", "company");
    introspectMock.mockResolvedValue(null);
    const req = createRequest("/en/admin", {
      "__Host-ra_codecamp_session": "invalid-token",
    });

    const res = await proxy(req);
    const location = new URL(res.headers.get("location")!);

    expect(res.status).toBe(307);
    expect(location.pathname).toBe("/api/auth/company/start");
    expect(location.searchParams.get("returnTo")).toBe("/en/admin");
    expect(res.headers.get("set-cookie")).toContain(
      "__Host-ra_codecamp_session=;",
    );
  });

  it("exports a matcher config", () => {
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher[0]).toContain("webhooks");
    expect(config.matcher[0]).toContain("\\.");
  });
});
