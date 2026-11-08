/**
 * The proxy session check (AC-4.1, test strategy P2b.7, task 2b.2).
 *
 * The proxy checks the session cookie on `/<locale>/st/**` and `/<locale>/teacher/**` and
 * redirects to `/<locale>/sign-in?next=<path>` when the cookie is absent. The protected rule runs
 * BEFORE the file-path rule and the passthrough list, so a dotted last segment can not skip it
 * (fact M13). The proxy checks only that a cookie exists; the pages check the session against the
 * database.
 *
 * The three characterization cases C1 to C3 pass at the base. Every other case fails at the base
 * (`NextResponse.next()` where the sign-in redirect is expected), so the file holds exactly three
 * passing cases.
 */
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import proxy from "../proxy";

const BASE = "https://app.example";

/** Builds one request for the proxy. */
function request(
  path: string,
  options: { cookie?: string; headers?: Record<string, string> } = {},
): NextRequest {
  return new NextRequest(new URL(path, BASE), {
    headers: { ...(options.cookie ? { cookie: options.cookie } : {}), ...options.headers },
  });
}

/** Reads the path and query of a redirect response. */
function redirectPath(response: Response): string | null {
  const value = response.headers.get("location");
  if (!value) return null;
  const url = new URL(value, BASE);
  return `${url.pathname}${url.search}`;
}

/** Reports whether a response is a pass-through from the proxy. */
function isNext(response: Response): boolean {
  return response.headers.get("location") === null && response.status === 200;
}

/** The sign-in redirect of one path. */
function signInFor(locale: string, path: string): string {
  return `/${locale}/sign-in?next=${encodeURIComponent(path)}`;
}

/** The bypass table of the proxy (fact M13). */
const BYPASS: Array<{ label: string; path: string }> = [
  { label: "dotted last segment", path: "/th/st/2/1.x" },
  { label: "trailing slash", path: "/th/st/2/1/" },
  { label: "double slash", path: "/th//st/2/1" },
  { label: "upper-case locale", path: "/TH/st/2/1" },
  { label: "upper-case section", path: "/th/ST/2/1" },
  { label: "encoded s", path: "/th/%73t/2/1" },
  { label: "encoded slash", path: "/th/st%2F2/1" },
  { label: "dotted teacher path", path: "/th/teacher/2/1.json" },
  { label: "path parameter", path: "/th/st/2/1;x=1" },
  { label: "bad percent encoding", path: "/th/%E0%A4%A/st/2/1" },
];

describe("login proxy (red)", () => {
  it("C1 adds the Thai locale to a path without a locale", () => {
    const response = proxy(request("/st/2/1"));
    expect(response.status).toBe(307);
    expect(redirectPath(response)).toBe("/th/st/2/1");
  });

  it("C2 passes a build asset through", () => {
    const response = proxy(request("/_next/static/x.js"));
    expect(isNext(response), "the build asset passes").toBe(true);
  });

  it("C3 passes the auth API through", () => {
    const response = proxy(request("/api/auth/sign-in"));
    expect(isNext(response), "the auth API passes").toBe(true);
  });

  it("redirects a request with no cookie to the locale sign-in page", () => {
    const week = proxy(request("/th/st/2/1?part=song"));
    expect(week.status, "the week path redirects").toBe(307);
    expect(redirectPath(week)).toBe(signInFor("th", "/th/st/2/1?part=song"));
    const teacher = proxy(request("/en/teacher/2/1"));
    expect(teacher.status, "the teacher path redirects").toBe(307);
    expect(redirectPath(teacher)).toBe(signInFor("en", "/en/teacher/2/1"));
  });

  it("passes the public paths and a request that carries any cookie", () => {
    // The first read is the protection, so this case fails at the base.
    expect(proxy(request("/th/st/2/1")).status, "the protected path redirects").toBe(307);
    for (const path of [
      "/th/join",
      "/th/sign-in",
      "/th/sign-in?next=%2Fth%2Fst%2F2%2F1",
      "/api/auth/sign-out",
      "/favicon.ico",
    ]) {
      expect(isNext(proxy(request(path))), `${path} passes`).toBe(true);
    }
    expect(
      isNext(proxy(request("/th/st/2/1", { cookie: "__Host-st_session=forged" }))),
      "the proxy checks only that a cookie exists",
    ).toBe(true);
  });

  it("runs the protected rule before the file-path and passthrough rules", () => {
    let bypassCases = 0;
    for (const entry of BYPASS) {
      const response = (() => {
        try {
          return proxy(request(entry.path));
        } catch {
          return null;
        }
      })();
      expect(response, `${entry.label} does not throw`).not.toBeNull();
      expect(response?.status, `${entry.label} redirects`).toBe(307);
      expect(redirectPath(response as Response), `${entry.label} goes to sign-in`).toMatch(
        /^\/(th|en)\/sign-in\?next=/,
      );
      bypassCases += 1;
    }
    console.log(`bypass_cases=${bypassCases}`);
    expect(bypassCases, "bypass_cases").toBeGreaterThanOrEqual(9);
  });

  it("answers no-store with no cookie, and the dotted last segment is protected", () => {
    const response = proxy(request("/th/st/2/1"));
    expect(response.status, "the protected path redirects").toBe(307);
    expect(response.headers.get("cache-control"), "the redirect is not cached").toContain(
      "no-store",
    );
    expect(response.headers.get("set-cookie"), "the proxy sets no cookie").toBeNull();

    // Fact M13: a dotted last segment used to pass BEFORE the cookie rule.
    const dotted = proxy(request("/th/st/2/1.x"));
    expect(dotted.status, "the dotted path redirects").toBe(307);
    expect(redirectPath(dotted)).toBe(signInFor("th", "/th/st/2/1.x"));
  });
});

describe("sign-in username flash cookie clear (red, UX F1 / task 2b.7b)", () => {
  const FLASH_COOKIE = "st_signin_username";

  /** Returns the Set-Cookie headers of a response as separate lines. */
  function setCookieLines(response: Response): string[] {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
    const value = headers.get("set-cookie");
    return value ? [value] : [];
  }

  it("clears the username flash cookie on a GET of the sign-in page", async () => {
    const response = await proxy(
      request("/th/sign-in?error=invalid", { cookie: `${FLASH_COOKIE}=staff-02` }),
    );
    const lines = setCookieLines(response);
    const clear = lines.filter((line) => line.startsWith(`${FLASH_COOKIE}=`));
    console.log(`flash_clear_count=${clear.length} flash_clear=${clear[0] ?? "<none>"}`);
    console.log(`flash_clear_response_status=${response.status}`);
    expect(response.status, "the sign-in page passes through").toBe(200);
    expect(response.headers.get("location"), "no redirect").toBeNull();
    expect(clear, "one clearing flash cookie").toHaveLength(1);
    expect(clear[0], "the value is empty").toContain(`${FLASH_COOKIE}=;`);
    expect(clear[0], "Max-Age=0").toContain("Max-Age=0");
    expect(clear[0], "the same Path").toContain("Path=/th/sign-in");
  });
});
