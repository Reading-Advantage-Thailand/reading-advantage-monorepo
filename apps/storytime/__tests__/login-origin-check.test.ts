/**
 * The same-origin (CSRF) check of the sign-in and sign-out handlers (AC-4.3, test strategy P2b.7,
 * task 2b.2).
 *
 * The check is `assertSameOrigin(headers, ownOrigin)`. It reads the exact `Origin` header, or the
 * `Referer` header when `Origin` is absent. A cross-origin request gets 403, sets no cookie, and
 * touches no store. The forwarded host never moves the comparison.
 *
 * At the base the first assertion fails on `Missing apps/storytime/lib/auth/same-origin.ts`. The
 * module is loaded only after that assertion, so no case fails with a load error.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// The store must not be reached on a cross-origin request. A call is a test failure, not a mock.
vi.mock("../lib/auth/store", () => ({
  getStore: () => {
    throw new Error("the store was called on a cross-origin request");
  },
}));

const APP = resolve(import.meta.dirname, "..");
const SAME_ORIGIN = resolve(APP, "lib/auth/same-origin.ts");
const SIGN_IN_ROUTE = resolve(APP, "app/api/auth/sign-in/route.ts");
const SIGN_OUT_ROUTE = resolve(APP, "app/api/auth/sign-out/route.ts");
const MISSING = "Missing apps/storytime/lib/auth/same-origin.ts";
const APP_ORIGIN = "https://app.example";

/** One header table of the origin check. */
interface HeaderCase {
  label: string;
  headers: Record<string, string>;
}

/** Header tables that must answer as cross-origin. */
const CROSS_ORIGIN: HeaderCase[] = [
  { label: "another origin", headers: { origin: "https://evil.example" } },
  { label: "null origin", headers: { origin: "null" } },
  { label: "another scheme", headers: { origin: "http://app.example" } },
  { label: "another port", headers: { origin: "https://app.example:8443" } },
  {
    label: "no origin and a referer of another site",
    headers: { referer: "https://evil.example/x" },
  },
  { label: "no origin and no referer", headers: {} },
  {
    label: "referer prefix attack",
    headers: { referer: "https://app.example.evil.example/" },
  },
  {
    label: "referer user-info attack",
    headers: { referer: "https://app.example@evil.example/" },
  },
  {
    label: "forged forwarded host",
    headers: { origin: "https://evil.example", "x-forwarded-host": "app.example" },
  },
  { label: "origin with a trailing dot", headers: { origin: "https://app.example." } },
];

/** Header tables that must answer as same-origin. */
const SAME_ORIGIN_CASES: HeaderCase[] = [
  { label: "exact origin", headers: { origin: APP_ORIGIN } },
  {
    label: "no origin and a same-origin referer",
    headers: { referer: `${APP_ORIGIN}/th/sign-in` },
  },
  {
    label: "the origin wins over an evil referer",
    headers: { origin: APP_ORIGIN, referer: "https://evil.example/x" },
  },
];

/**
 * Builds a `Headers` object from a plain table.
 * @param table The header table.
 * @returns The headers.
 */
function headersOf(table: Record<string, string>): Headers {
  return new Headers(table);
}

/**
 * Builds a POST request for the sign-in handler.
 * @param headers The request headers.
 * @returns The request.
 */
function signInRequest(headers: Record<string, string>): NextRequest {
  const body = new URLSearchParams({
    username: "staff-01",
    password: "correct horse battery staple",
    next: "/th/st/2/1",
    locale: "th",
  });
  return new NextRequest(new URL(`${APP_ORIGIN}/api/auth/sign-in`), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: body.toString(),
  });
}

describe("login origin check (red)", () => {
  it("rejects every cross-origin header table and accepts the same-origin tables", async () => {
    expect(existsSync(SAME_ORIGIN), MISSING).toBe(true);
    const mod = (await import("../lib/auth/same-origin.js")) as {
      assertSameOrigin(headers: Headers, ownOrigin: string): void;
      CrossOriginError: new (...args: never[]) => Error;
    };
    expect(typeof mod.assertSameOrigin, "assertSameOrigin is exported").toBe("function");
    expect(typeof mod.CrossOriginError, "CrossOriginError is exported").toBe("function");

    let crossOriginCases = 0;
    for (const entry of CROSS_ORIGIN) {
      expect(
        () => mod.assertSameOrigin(headersOf(entry.headers), APP_ORIGIN),
        `${entry.label} is cross-origin`,
      ).toThrow(mod.CrossOriginError);
      crossOriginCases += 1;
    }
    let sameOriginCases = 0;
    for (const entry of SAME_ORIGIN_CASES) {
      expect(
        () => mod.assertSameOrigin(headersOf(entry.headers), APP_ORIGIN),
        `${entry.label} is same-origin`,
      ).not.toThrow();
      sameOriginCases += 1;
    }
    console.log(
      `cross_origin_cases=${crossOriginCases} same_origin_cases=${sameOriginCases}`,
    );
    expect(crossOriginCases, "cross_origin_cases").toBeGreaterThanOrEqual(10);
    expect(sameOriginCases, "same_origin_cases").toBeGreaterThanOrEqual(3);

    // The mutant is a referer prefix check without the trailing slash. The prefix-attack row
    // proves that the mutant is fooled and the real check is not.
    const naive = (headers: Headers): boolean => {
      const origin = headers.get("origin");
      if (origin !== null) return origin === APP_ORIGIN;
      const referer = headers.get("referer");
      return referer !== null && referer.startsWith(APP_ORIGIN);
    };
    const prefixAttack = headersOf(CROSS_ORIGIN[6].headers);
    console.log(`mutant_accepts_prefix_attack=${naive(prefixAttack) ? 1 : 0}`);
    expect(naive(prefixAttack), "the naive referer check is fooled").toBe(true);
    expect(() => mod.assertSameOrigin(prefixAttack, APP_ORIGIN)).toThrow(mod.CrossOriginError);
  });

  it("answers 403 on a cross-origin sign-in and sign-out POST and 405 on a sign-out GET", async () => {
    expect(existsSync(SAME_ORIGIN), MISSING).toBe(true);
    expect(existsSync(SIGN_IN_ROUTE), "Missing apps/storytime/app/api/auth/sign-in/route.ts").toBe(
      true,
    );
    expect(
      existsSync(SIGN_OUT_ROUTE),
      "Missing apps/storytime/app/api/auth/sign-out/route.ts",
    ).toBe(true);
    const signIn = (await import("../app/api/auth/sign-in/route.js")) as {
      POST(request: NextRequest): Promise<Response>;
    };
    const signOut = (await import("../app/api/auth/sign-out/route.js")) as {
      POST(request: NextRequest): Promise<Response>;
      GET(request: NextRequest): Promise<Response>;
    };

    const crossOrigin = { origin: "https://evil.example" };
    const signInResponse = await signIn.POST(signInRequest(crossOrigin));
    expect(signInResponse.status, "cross-origin sign-in gets 403").toBe(403);
    expect(signInResponse.headers.get("set-cookie"), "no cookie on a rejected sign-in").toBeNull();
    expect(signInResponse.headers.get("location"), "no redirect on a rejected sign-in").toBeNull();

    const signOutResponse = await signOut.POST(
      new NextRequest(new URL(`${APP_ORIGIN}/api/auth/sign-out`), {
        method: "POST",
        headers: { ...crossOrigin, cookie: "__Host-st_session=forged" },
      }),
    );
    expect(signOutResponse.status, "cross-origin sign-out gets 403").toBe(403);
    expect(signOutResponse.headers.get("set-cookie"), "no cookie on a rejected sign-out").toBeNull();

    const getResponse = await signOut.GET(
      new NextRequest(new URL(`${APP_ORIGIN}/api/auth/sign-out`)),
    );
    expect(getResponse.status, "sign-out GET answers 405").toBe(405);

    const forgedHost = await signIn.POST(
      signInRequest({ origin: "https://evil.example", "x-forwarded-host": "app.example" }),
    );
    expect(forgedHost.status, "a forged forwarded host does not help").toBe(403);
  });
});
