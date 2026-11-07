/**
 * The session cookie and the stored digest (AC-4.3, AC-4.4, test strategy P2b.7, task 2b.2).
 *
 * The contract pins of P2b.2: the cookie name `__Host-st_session`, the flags, the 365-day
 * `Max-Age`, the 43-character base64url value, and the lowercase 64-hex SHA-256 digest in the
 * database. Sign-out deletes the row and clears the cookie. A chosen cookie value is never reused.
 *
 * `lib/auth/cookie.ts` exports `SESSION_COOKIE_NAME`, `newSessionToken()`,
 * `sessionTokenDigest(token)`, `createSessionCookie(token)`, and `clearSessionCookie()`.
 *
 * At the base the first assertion fails on `Missing apps/storytime/lib/auth/cookie.ts`. The module
 * is loaded only after that assertion, so no case fails with a load error.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState, type FakeStore } from "./helpers/fake-store";

vi.mock("../lib/auth/store", async () => {
  const helper = await import("./helpers/fake-store");
  return { getStore: () => helper.fakeStoreState.current };
});

const APP = resolve(import.meta.dirname, "..");
const COOKIE_MODULE = resolve(APP, "lib/auth/cookie.ts");
const SIGN_IN_ROUTE = resolve(APP, "app/api/auth/sign-in/route.ts");
const SIGN_OUT_ROUTE = resolve(APP, "app/api/auth/sign-out/route.ts");
const MISSING = "Missing apps/storytime/lib/auth/cookie.ts";
const APP_ORIGIN = "https://app.example";
const PASSWORD = "correct horse battery staple";

let passwordHash = "";

/** The cookie module shape that the contract pins. */
interface CookieModule {
  SESSION_COOKIE_NAME: string;
  newSessionToken(): string;
  sessionTokenDigest(token: string): string;
  createSessionCookie(token: string): string;
  clearSessionCookie(): string;
}

/** Reads a Set-Cookie header into a lower-case attribute map. */
function attributes(header: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    map.set(key.toLowerCase(), rest.join("="));
  }
  return map;
}

/** Reads the token of the session cookie from one Set-Cookie header. */
function tokenOf(header: string): string {
  return attributes(header).get("__host-st_session") ?? "";
}

/** Loads the cookie module after the pinned path check. */
async function loadCookie(): Promise<CookieModule> {
  return (await import("../lib/auth/cookie.js")) as CookieModule;
}

/** Sends one sign-in form request. */
async function signInRequest(username: string, password: string, cookie?: string): Promise<Response> {
  const route = (await import("../app/api/auth/sign-in/route.js")) as {
    POST(request: NextRequest): Promise<Response>;
  };
  return route.POST(
    new NextRequest(new URL(`${APP_ORIGIN}/api/auth/sign-in`), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: APP_ORIGIN,
        "x-forwarded-for": "203.0.113.7",
        ...(cookie ? { cookie } : {}),
      },
      body: new URLSearchParams({
        username,
        password,
        next: "/th/st/2/1",
        locale: "th",
      }).toString(),
    }),
  );
}

/** Sends one sign-out POST request. */
async function signOutRequest(cookie?: string): Promise<Response> {
  const route = (await import("../app/api/auth/sign-out/route.js")) as {
    POST(request: NextRequest): Promise<Response>;
  };
  return route.POST(
    new NextRequest(new URL(`${APP_ORIGIN}/api/auth/sign-out`), {
      method: "POST",
      headers: {
        origin: APP_ORIGIN,
        ...(cookie ? { cookie } : {}),
      },
    }),
  );
}

beforeAll(async () => {
  const argon = (await import("@node-rs/argon2")) as unknown as {
    default: { hash(value: string, opts?: unknown): Promise<string> };
  };
  passwordHash = await argon.default.hash(PASSWORD, {
    type: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
});

beforeEach(() => {
  fakeStoreState.current = createFakeStore({
    accounts: [{ username: "staff-01", passwordHash, role: "family" }],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("login session cookie (red)", () => {
  it("sets exactly the pinned cookie attributes", async () => {
    expect(existsSync(COOKIE_MODULE), MISSING).toBe(true);
    const cookie = await loadCookie();
    expect(cookie.SESSION_COOKIE_NAME, "cookie name").toBe("__Host-st_session");
    const token = cookie.newSessionToken();
    const header = cookie.createSessionCookie(token);
    const parsed = attributes(header);
    expect(parsed.get("__host-st_session"), "the value is the token").toBe(token);
    expect(parsed.get("httponly"), "HttpOnly").toBeDefined();
    expect(parsed.get("secure"), "Secure").toBeDefined();
    expect(parsed.get("samesite"), "SameSite").toBe("Lax");
    expect(parsed.get("path"), "Path").toBe("/");
    expect(parsed.get("max-age"), "Max-Age").toBe("31536000");
    expect(parsed.has("domain"), "no Domain").toBe(false);
    const policy = (await import("../lib/auth/session-policy.js")) as {
      SESSION_MAX_AGE_S: number;
    };
    expect(policy.SESSION_MAX_AGE_S, "the constant").toBe(31_536_000);
    console.log("cookie_flag_cases=6");
  });

  it("draws 1000 unique 43-character base64url tokens", async () => {
    expect(existsSync(COOKIE_MODULE), MISSING).toBe(true);
    const cookie = await loadCookie();
    const seen = new Set<string>();
    for (let index = 0; index < 1000; index += 1) {
      const token = cookie.newSessionToken();
      expect(token, `draw ${index} is 43 base64url characters`).toMatch(/^[A-Za-z0-9_-]{43}$/);
      seen.add(token);
    }
    console.log(`token_draws=1000 token_unique=${seen.size}`);
    expect(seen.size, "1000 draws have no repeat").toBe(1000);
  });

  it("stores only the lowercase 64-hex digest and no raw token", async () => {
    expect(existsSync(COOKIE_MODULE), MISSING).toBe(true);
    const cookie = await loadCookie();
    const token = cookie.newSessionToken();
    const digest = cookie.sessionTokenDigest(token);
    expect(digest, "the digest is 64 lower-case hex characters").toMatch(/^[0-9a-f]{64}$/);
    expect(digest, "the digest is the SHA-256 of the token").toBe(
      createHash("sha256").update(token).digest("hex"),
    );

    const response = await signInRequest("staff-01", PASSWORD);
    expect(response.status).toBe(303);
    const header = response.headers.get("set-cookie") ?? "";
    const rawToken = tokenOf(header);
    expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const store = fakeStoreState.current;
    expect(store.sessions, "one session").toHaveLength(1);
    expect(store.sessions[0].tokenDigest).toBe(cookie.sessionTokenDigest(rawToken));
    const rawTokenRows = store.sessions.filter((session) =>
      JSON.stringify(session).includes(rawToken),
    ).length;
    console.log(`raw_token_rows=${rawTokenRows}`);
    expect(rawTokenRows, "raw_token_rows").toBe(0);
  });

  it("issues a new value on each sign-in and never reuses a chosen cookie", async () => {
    expect(existsSync(COOKIE_MODULE), MISSING).toBe(true);
    const cookie = await loadCookie();
    const first = await signInRequest("staff-01", PASSWORD);
    const second = await signInRequest("staff-01", PASSWORD);
    const firstToken = tokenOf(first.headers.get("set-cookie") ?? "");
    const secondToken = tokenOf(second.headers.get("set-cookie") ?? "");
    expect(firstToken).not.toBe(secondToken);

    const chosen = cookie.newSessionToken();
    const fixed = await signInRequest(
      "staff-01",
      PASSWORD,
      `__Host-st_session=${chosen}`,
    );
    const fixedToken = tokenOf(fixed.headers.get("set-cookie") ?? "");
    expect(fixedToken, "the chosen value is not reused").not.toBe(chosen);
    const chosenDigest = cookie.sessionTokenDigest(chosen);
    expect(
      fakeStoreState.current.sessions.filter((session) => session.tokenDigest === chosenDigest),
      "no row for the chosen value",
    ).toHaveLength(0);
  });

  it("deletes the row on sign-out, clears the cookie, and rejects the old value", async () => {
    expect(existsSync(COOKIE_MODULE), MISSING).toBe(true);
    const cookie = await loadCookie();
    const signIn = await signInRequest("staff-01", PASSWORD);
    const header = signIn.headers.get("set-cookie") ?? "";
    const rawToken = tokenOf(header);
    expect(fakeStoreState.current.sessions).toHaveLength(1);

    const signOut = await signOutRequest(`__Host-st_session=${rawToken}`);
    expect(signOut.status, "sign-out redirects").toBe(303);
    expect(signOut.headers.get("location"), "sign-out goes to sign-in").toContain("/th/sign-in");
    const cleared = attributes(signOut.headers.get("set-cookie") ?? "");
    expect(cleared.get("max-age"), "the cookie is cleared").toBe("0");
    expect(fakeStoreState.current.sessions, "the row is deleted").toHaveLength(0);

    const replay = await signOutRequest(`__Host-st_session=${rawToken}`);
    expect(replay.status, "an old value still answers 303").toBe(303);
    const empty = await signOutRequest();
    expect(empty.status, "a sign-out with no cookie answers 303").toBe(303);
  });
});
