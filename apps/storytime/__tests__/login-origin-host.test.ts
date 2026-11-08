/**
 * The same-origin check behind a proxy (finding F-origin of the 2b.7 log, task 2b.7).
 *
 * In the standalone image `request.nextUrl.origin` follows the server `HOSTNAME` and not the
 * `Host` header. The image sets `HOSTNAME=0.0.0.0`, so the origin is `http://0.0.0.0:<port>`. A
 * browser on Cloud Run sends `Origin: https://<public host>` with `Host: <public host>` and
 * `x-forwarded-proto: https`. The check must read the own origin from the request headers, so a
 * browser sign-in and sign-out are not refused with 403 on every request.
 *
 * The own origin is `<scheme>://<Host header>`. The scheme is `x-forwarded-proto` when present,
 * else the scheme of the request URL. A cross-site Origin still gets 403, sets no cookie, and
 * changes no session. The cross-site cases below pass at the base for the wrong reason; the
 * proxy cases fail at the base, because the handler compares with the bind address.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState, type FakeStore } from "./helpers/fake-store";
import { sessionTokenDigest } from "../lib/auth/cookie";

const counters = vi.hoisted(() => ({ verify: 0 }));

vi.mock("@reading-advantage/auth/password", async () => {
  const actual = (await import("@node-rs/argon2")) as unknown as {
    default: {
      hash(value: string, opts?: unknown): Promise<string>;
      verify(hash: string, password: string): Promise<boolean>;
    };
  };
  const argon = actual.default;
  const opts = { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };
  return {
    hashPassword: (password: string) => argon.hash(password, opts),
    verifyPassword: async (password: string, hash: string) => {
      counters.verify += 1;
      try {
        return await argon.verify(hash, password);
      } catch {
        return false;
      }
    },
  };
});

vi.mock("../lib/auth/store", async () => {
  const helper = await import("./helpers/fake-store");
  return { getStore: () => helper.fakeStoreState.current };
});

const APP = resolve(import.meta.dirname, "..");
const SIGN_IN_ROUTE = resolve(APP, "app/api/auth/sign-in/route.ts");
const SIGN_OUT_ROUTE = resolve(APP, "app/api/auth/sign-out/route.ts");
const MISSING_SIGN_IN = "Missing apps/storytime/app/api/auth/sign-in/route.ts";
const MISSING_SIGN_OUT = "Missing apps/storytime/app/api/auth/sign-out/route.ts";

// The bind address of the standalone server: the URL origin is not the public origin.
const BIND_ORIGIN = "http://0.0.0.0:3000";
const SITE = "storytime.example.test";
const SITE_ORIGIN = `https://${SITE}`;
const PASSWORD = "correct horse battery staple";
const TOKEN = "proxy-sign-out-token";
const COOKIE = `__Host-st_session=${TOKEN}`;

let passwordHash = "";

/** One cross-site header table, sent with the Host header and the proxy scheme. */
interface CrossCase {
  label: string;
  headers: Record<string, string>;
}

const CROSS_SITE: CrossCase[] = [
  { label: "a cross-site origin", headers: { origin: "https://evil.example.test" } },
  { label: "no origin and no referer", headers: {} },
  {
    label: "the plain scheme while the proxy names https",
    headers: { origin: `http://${SITE}` },
  },
];

/**
 * Reads the Set-Cookie headers of a response.
 * @param response The route response.
 * @returns The values of the Set-Cookie headers.
 */
function setCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

/**
 * Builds the headers of one proxied request.
 * @param extra The header values that the case adds.
 * @returns The request headers.
 */
function proxyHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    host: SITE,
    "x-forwarded-proto": "https",
    ...extra,
  };
}

/**
 * Builds a sign-in POST at the bind address with the given headers.
 * @param headers The request headers.
 * @param password The password field value.
 * @returns The request.
 */
function signInRequest(headers: Record<string, string>, password: string = PASSWORD): NextRequest {
  const body = new URLSearchParams({
    username: "staff-01",
    password,
    next: "/th/st/2/1",
    locale: "th",
  });
  return new NextRequest(new URL(`${BIND_ORIGIN}/api/auth/sign-in`), {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: body.toString(),
  });
}

/**
 * Builds a sign-out POST at the bind address with the given headers.
 * @param headers The request headers.
 * @param cookie The Cookie header value.
 * @returns The request.
 */
function signOutRequest(headers: Record<string, string>, cookie: string): NextRequest {
  return new NextRequest(new URL(`${BIND_ORIGIN}/api/auth/sign-out`), {
    method: "POST",
    headers: { ...headers, cookie },
  });
}

/** The markers of the bind address, with the bind port of the standalone image. */
const BIND_MARKERS = ["0.0.0.0", "localhost", "127.0.0.1"];

/**
 * Reads the Location header of a response.
 * @param response The route response.
 * @returns The Location value, or an empty string.
 */
function locationValue(response: Response): string {
  return response.headers.get("location") ?? "";
}

/**
 * Reports whether a Location is a relative path or the exact public URL.
 * @param location The Location header value.
 * @param pathWithQuery The expected path and query.
 * @returns True when the value holds no bind address.
 */
function pinnedLocation(location: string, pathWithQuery: string): boolean {
  if (location === pathWithQuery) return true;
  try {
    const url = new URL(location);
    return url.origin === SITE_ORIGIN && `${url.pathname}${url.search}` === pathWithQuery;
  } catch {
    return false;
  }
}

/**
 * Counts the bind markers of a Location.
 * @param location The Location header value.
 * @returns The number of bind markers in the value.
 */
function bindMarkerHits(location: string): number {
  const lowered = location.toLowerCase();
  let hits = 0;
  for (const marker of BIND_MARKERS) if (lowered.includes(marker)) hits += 1;
  if (/:3000(?:[/?#]|$)/.test(lowered)) hits += 1;
  return hits;
}

/**
 * Creates a fresh store with the site account and one live session.
 * @returns The fake store.
 */
function seedSite(): FakeStore {
  const store = createFakeStore({
    accounts: [{ username: "staff-01", passwordHash, role: "family" }],
  });
  seedSession(store);
  fakeStoreState.current = store;
  return store;
}

/**
 * Adds one live session to the fake store.
 * @param store The fake store.
 */
function seedSession(store: FakeStore): void {
  store.sessions.push({
    tokenDigest: sessionTokenDigest(TOKEN),
    accountId: store.accounts[0]?.id ?? "account-1",
    expiresAt: new Date("2027-11-07T00:00:00.000Z"),
    lastUseAt: new Date("2026-11-07T00:00:00.000Z"),
    createdAt: new Date("2026-11-07T00:00:00.000Z"),
  });
}

/** Loads the sign-in route after the pinned path check. */
async function loadSignIn(): Promise<{ POST(request: NextRequest): Promise<Response> }> {
  return (await import("../app/api/auth/sign-in/route.js")) as {
    POST(request: NextRequest): Promise<Response>;
  };
}

/** Loads the sign-out route after the pinned path check. */
async function loadSignOut(): Promise<{ POST(request: NextRequest): Promise<Response> }> {
  return (await import("../app/api/auth/sign-out/route.js")) as {
    POST(request: NextRequest): Promise<Response>;
  };
}

beforeAll(async () => {
  const argon = (await import("@node-rs/argon2")) as unknown as {
    default: { hash(value: string, opts?: unknown): Promise<string> };
  };
  const opts = { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };
  passwordHash = await argon.default.hash(PASSWORD, opts);
});

beforeEach(() => {
  counters.verify = 0;
  fakeStoreState.current = createFakeStore({
    accounts: [{ username: "staff-01", passwordHash, role: "family" }],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("login origin behind a proxy (red, F-origin)", () => {
  it("accepts the proxy origin for sign-in and sign-out and ends the session", async () => {
    expect(existsSync(SIGN_IN_ROUTE), MISSING_SIGN_IN).toBe(true);
    expect(existsSync(SIGN_OUT_ROUTE), MISSING_SIGN_OUT).toBe(true);
    const signIn = await loadSignIn();
    const signOut = await loadSignOut();

    const signedIn = await signIn.POST(signInRequest(proxyHeaders({ origin: SITE_ORIGIN })));
    expect(signedIn.status, "a proxied browser sign-in is not cross-origin").toBe(303);
    expect(setCookies(signedIn), "the proxied sign-in sets the session cookie").toHaveLength(1);
    expect(fakeStoreState.current.sessions, "the proxied sign-in writes one session").toHaveLength(
      1,
    );

    const store = fakeStoreState.current;
    seedSession(store);
    const signedOut = await signOut.POST(
      signOutRequest(proxyHeaders({ origin: SITE_ORIGIN }), COOKIE),
    );
    expect(signedOut.status, "a proxied browser sign-out is not cross-origin").toBe(303);
    const cleared = setCookies(signedOut).join(" ");
    expect(cleared, "the proxied sign-out clears the session cookie").toContain(
      "__Host-st_session=;",
    );
    expect(cleared, "the proxied sign-out clears the session cookie").toContain("Max-Age=0");
    expect(
      store.sessions.some((row) => row.tokenDigest === sessionTokenDigest(TOKEN)),
      "the proxied sign-out ends the session",
    ).toBe(false);
    console.log(`proxy_signin_status=${signedIn.status} proxy_signout_status=${signedOut.status}`);
  });

  it("refuses a cross-site origin, a missing origin, and a scheme mismatch behind the proxy", async () => {
    expect(existsSync(SIGN_IN_ROUTE), MISSING_SIGN_IN).toBe(true);
    expect(existsSync(SIGN_OUT_ROUTE), MISSING_SIGN_OUT).toBe(true);
    const signIn = await loadSignIn();
    const signOut = await loadSignOut();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    let crossOriginCases = 0;
    for (const entry of CROSS_SITE) {
      const store = seedSite();
      const headers = proxyHeaders(entry.headers);

      const rejected = await signIn.POST(signInRequest(headers));
      expect(rejected.status, `${entry.label} is refused`).toBe(403);
      expect(setCookies(rejected), `${entry.label} sets no cookie`).toHaveLength(0);
      expect(store.sessions, `${entry.label} creates no session`).toHaveLength(1);
      expect(store.auditEvents, `${entry.label} writes no audit row`).toHaveLength(0);

      const rejectedOut = await signOut.POST(signOutRequest(headers, COOKIE));
      expect(rejectedOut.status, `${entry.label} is refused on sign-out`).toBe(403);
      expect(setCookies(rejectedOut), `${entry.label} clears no cookie`).toHaveLength(0);
      expect(
        store.sessions.some((row) => row.tokenDigest === sessionTokenDigest(TOKEN)),
        `${entry.label} keeps the session`,
      ).toBe(true);
      crossOriginCases += 1;
    }
    expect(crossOriginCases, "cross_origin_cases").toBe(CROSS_SITE.length);
    expect(crossOriginCases, "cross_origin_cases").toBe(3);
    console.log(`cross_origin_cases=${crossOriginCases}`);

    // The positive control: the same request with the site origin is not refused. This proves
    // that the 403 rows above answer the origin rule and not an unrelated fault.
    const accepted = await signIn.POST(signInRequest(proxyHeaders({ origin: SITE_ORIGIN })));
    expect(accepted.status, "the site origin is accepted with the same headers").toBe(303);
    expect(warn, "a refused request logs one warning per refusal").toHaveBeenCalled();
    console.log(`proxy_same_origin_status=${accepted.status}`);
  });

  it("pins the 303 Location to the public host behind the proxy (F60)", async () => {
    expect(existsSync(SIGN_IN_ROUTE), MISSING_SIGN_IN).toBe(true);
    expect(existsSync(SIGN_OUT_ROUTE), MISSING_SIGN_OUT).toBe(true);
    const signIn = await loadSignIn();
    const signOut = await loadSignOut();
    const store = seedSite();

    const good = await signIn.POST(signInRequest(proxyHeaders({ origin: SITE_ORIGIN })));
    const bad = await signIn.POST(
      signInRequest(proxyHeaders({ origin: SITE_ORIGIN }), "wrong password"),
    );
    const out = await signOut.POST(
      signOutRequest(proxyHeaders({ origin: SITE_ORIGIN }), COOKIE),
    );

    const errorPath = `/th/sign-in?error=invalid&next=${encodeURIComponent("/th/st/2/1")}`;
    const rows = [
      { label: "sign-in good password", response: good, path: "/th/st/2/1" },
      { label: "sign-in error redirect", response: bad, path: errorPath },
      { label: "sign-out", response: out, path: "/th/sign-in" },
    ];

    let locationBindHits = 0;
    for (const row of rows) locationBindHits += bindMarkerHits(locationValue(row.response));
    console.log(`location_bind_hits=${locationBindHits}`);

    let pinnedCases = 0;
    for (const row of rows) {
      expect(row.response.status, `${row.label} answers 303`).toBe(303);
      const location = locationValue(row.response);
      const pinned = pinnedLocation(location, row.path);
      expect(
        pinned,
        `${row.label} Location ${JSON.stringify(location)} names the bind host ${BIND_ORIGIN}; ` +
          `expected the relative path ${row.path} or ${SITE_ORIGIN}${row.path}`,
      ).toBe(true);
      if (pinned) pinnedCases += 1;
    }
    expect(
      locationBindHits,
      "the Location must never hold 0.0.0.0, localhost, 127.0.0.1, or the bind port",
    ).toBe(0);
    expect(pinnedCases, "pinned_location_cases").toBe(3);
    expect(
      store.sessions.some((row) => row.tokenDigest === sessionTokenDigest(TOKEN)),
      "the sign-out ends the seeded session",
    ).toBe(false);
  });
});
