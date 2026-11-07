/**
 * The sign-in handler (AC-4.3, test strategy P2b.7, task 2b.2).
 *
 * The handler checks the origin, the rate limit, the Argon2id hash, writes one audit event, and
 * answers the pinned response codes. A wrong password, an unknown username, and a disabled
 * account give the same response. The audit rows hold no password and no token.
 *
 * The app unit layer uses the fake store through `vi.mock("../lib/auth/store")` and the real
 * Argon2id cost options (P2b.5). The password helpers come from the Q2 subpath.
 *
 * At the base the first assertion fails on `Missing app/api/auth/sign-in/route.ts`. The route is
 * loaded only after that assertion, so no case fails with a load error.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState, type FakeStore } from "./helpers/fake-store";

const counters = vi.hoisted(() => ({ verify: 0 }));

vi.mock("@reading-advantage/auth/password", async () => {
  const actual = (await import("@node-rs/argon2")) as unknown as {
    default: { hash(value: string, opts?: unknown): Promise<string>; verify(value: string, pw: string): Promise<boolean> };
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
const ROUTE = resolve(APP, "app/api/auth/sign-in/route.ts");
const MISSING = "Missing apps/storytime/app/api/auth/sign-in/route.ts";
const APP_ORIGIN = "https://app.example";
const PASSWORD = "correct horse battery staple";
const DEFAULT_IP = "203.0.113.7";

let passwordHash = "";
let disabledHash = "";

/** Reads the path and query of a response Location header. */
function locationPath(response: Response): string | null {
  const value = response.headers.get("location");
  if (!value) return null;
  const url = new URL(value, APP_ORIGIN);
  return `${url.pathname}${url.search}`;
}

/** Counts the Set-Cookie headers of a response. */
function setCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

/** Loads the sign-in route after the pinned path check. */
async function loadRoute(): Promise<{ POST(request: NextRequest): Promise<Response> }> {
  return (await import("../app/api/auth/sign-in/route.js")) as {
    POST(request: NextRequest): Promise<Response>;
  };
}

/**
 * Posts one sign-in form to the handler.
 * @param fields The form fields.
 * @param headers The extra request headers.
 * @returns The route response.
 */
async function post(
  fields: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<Response> {
  const route = await loadRoute();
  return route.POST(
    new NextRequest(new URL(`${APP_ORIGIN}/api/auth/sign-in`), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: APP_ORIGIN,
        "x-forwarded-for": DEFAULT_IP,
        ...headers,
      },
      body: new URLSearchParams(fields).toString(),
    }),
  );
}

/**
 * Posts one sign-in with the given username and password.
 * @param username The username.
 * @param password The password.
 * @param extra The extra form and header values.
 * @returns The route response.
 */
async function signIn(
  username: string,
  password: string,
  extra: { next?: string; locale?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  return post(
    {
      username,
      password,
      next: extra.next ?? "/th/st/2/1",
      locale: extra.locale ?? "th",
    },
    extra.headers,
  );
}

/** Reports whether a response is the invalid-credential response. */
function isInvalid(response: Response): boolean {
  return (
    response.status === 303 &&
    locationPath(response) === "/th/sign-in?error=invalid&next=%2Fth%2Fst%2F2%2F1"
  );
}

beforeAll(async () => {
  const argon = (await import("@node-rs/argon2")) as unknown as {
    default: { hash(value: string, opts?: unknown): Promise<string> };
  };
  const opts = { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };
  passwordHash = await argon.default.hash(PASSWORD, opts);
  disabledHash = passwordHash;
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T00:00:00.000Z"));
  counters.verify = 0;
  const store: FakeStore = createFakeStore({
    accounts: [
      { username: "staff-01", passwordHash, role: "family" },
      { username: "tutor-01", passwordHash, role: "teacher" },
      { username: "demo-class-01", passwordHash, role: "class" },
      { username: "disabled-01", passwordHash: disabledHash, role: "family", disabled: true },
    ],
  });
  fakeStoreState.current = store;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("login sign-in handler (red)", () => {
  it("signs in a good password and writes one session and one audit event", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const route = await loadRoute();
    expect(typeof route.POST, "POST is exported").toBe("function");
    const response = await signIn("staff-01", PASSWORD, {
      next: "/th/st/2/1?part=song",
    });
    expect(response.status).toBe(303);
    expect(locationPath(response)).toBe("/th/st/2/1?part=song");
    expect(setCookies(response), "one cookie").toHaveLength(1);
    const store = fakeStoreState.current;
    expect(store.sessions, "one session row").toHaveLength(1);
    expect(store.auditEvents.filter((event) => event.action === "sign_in_success")).toHaveLength(1);
  });

  it("gives the same response for a bad password, an unknown user, and a disabled account", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const route = await loadRoute();
    expect(typeof route.POST, "POST is exported").toBe("function");
    const responses = [
      await signIn("staff-01", "wrong password"),
      await signIn("nobody-01", PASSWORD),
      await signIn("disabled-01", PASSWORD),
    ];
    let enumerationCases = 0;
    for (const response of responses) {
      expect(response.status, "status").toBe(303);
      expect(locationPath(response), "location").toBe(
        "/th/sign-in?error=invalid&next=%2Fth%2Fst%2F2%2F1",
      );
      expect(setCookies(response), "no cookie").toHaveLength(0);
      enumerationCases += 1;
    }
    console.log(`enumeration_cases=${enumerationCases}`);
    expect(enumerationCases, "enumeration_cases").toBe(3);
    expect(counters.verify, "each row verifies once").toBeGreaterThanOrEqual(3);
    const reasons = fakeStoreState.current.auditEvents.map((event) => event.reason);
    expect(reasons).toContain("bad_password");
    expect(reasons).toContain("unknown_user");
    expect(reasons).toContain("disabled");
  });

  it("locks the sixth attempt and opens the window again after 15 minutes", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const route = await loadRoute();
    expect(typeof route.POST, "POST is exported").toBe("function");
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await signIn("staff-01", "wrong password");
      expect(isInvalid(response), `attempt ${attempt} is invalid, not locked`).toBe(true);
    }
    const locked = await signIn("staff-01", PASSWORD);
    expect(locationPath(locked), "the sixth attempt is locked even with the right password").toBe(
      "/th/sign-in?error=locked&next=%2Fth%2Fst%2F2%2F1",
    );
    expect(setCookies(locked), "a locked attempt sets no cookie").toHaveLength(0);
    console.log("locked_after=6");

    vi.setSystemTime(new Date("2026-11-07T00:15:01.000Z"));
    const reopened = await signIn("staff-01", PASSWORD);
    expect(reopened.status, "the window reopens").toBe(303);
    expect(locationPath(reopened)).toBe("/th/st/2/1");
  });

  it("limits the client IP by the last forwarded entry and keeps accounts separate", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const route = await loadRoute();
    expect(typeof route.POST, "POST is exported").toBe("function");
    let spoofCases = 0;
    let lockedAt = 0;
    for (let index = 1; index <= 40; index += 1) {
      const response = await signIn(`spoof-${index}`, "wrong password", {
        headers: { "x-forwarded-for": `10.0.0.${index}, ${DEFAULT_IP}` },
      });
      spoofCases += 1;
      if (locationPath(response)?.includes("error=locked")) {
        lockedAt = index;
        break;
      }
    }
    expect(lockedAt, "the IP limit locks at attempt 31").toBe(31);
    console.log(`ip_spoof_cases=${spoofCases} ip_locked_at=${lockedAt}`);

    const otherIp = await signIn("spoof-other", "wrong password", {
      headers: { "x-forwarded-for": "198.51.100.9" },
    });
    expect(isInvalid(otherIp), "another IP is not locked").toBe(true);

    vi.setSystemTime(new Date("2026-11-07T00:15:02.000Z"));
    const accountA = await signIn("staff-01", "wrong password");
    expect(isInvalid(accountA)).toBe(true);
    const accountB = await signIn("tutor-01", PASSWORD, {
      headers: { "x-forwarded-for": DEFAULT_IP },
    });
    expect(locationPath(accountB), "another account is not blocked").toBe("/th/st/2/1");
  });

  it("rejects an overlong password and username before hashing", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const route = await loadRoute();
    expect(typeof route.POST, "POST is exported").toBe("function");
    counters.verify = 0;
    const longPassword = await signIn("staff-01", "x".repeat(100_000));
    expect(isInvalid(longPassword), "a long password is invalid").toBe(true);
    expect(counters.verify, "the long password is not hashed").toBe(0);
    counters.verify = 0;
    const longUsername = await signIn(`${"u".repeat(65)}`, PASSWORD);
    expect(isInvalid(longUsername), "a long username is invalid").toBe(true);
    expect(counters.verify, "the long username is not hashed").toBe(0);
  });

  it("trims and lower-cases the username and falls back on a bad next", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const route = await loadRoute();
    expect(typeof route.POST, "POST is exported").toBe("function");
    const trimmed = await signIn("  STAFF-01  ", PASSWORD);
    expect(trimmed.status).toBe(303);
    expect(locationPath(trimmed)).toBe("/th/st/2/1");
    const badNext = await signIn("staff-01", PASSWORD, { next: "//evil.example" });
    expect(locationPath(badNext), "a bad next falls back to /<locale>/st").toBe("/th/st");
  });

  it("keeps the password and the token out of the audit rows and the logs", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const route = await loadRoute();
    expect(typeof route.POST, "POST is exported").toBe("function");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const response = await signIn("staff-01", PASSWORD);
      expect(response.status).toBe(303);
      const cookie = setCookies(response)[0] ?? "";
      const rawToken = cookie.replace(/^[^=]+=/, "").split(";")[0];
      const rows = JSON.stringify(fakeStoreState.current.auditEvents);
      const consoleText = [
        ...logSpy.mock.calls,
        ...errorSpy.mock.calls,
        ...warnSpy.mock.calls,
      ]
        .flat()
        .map((value) => String(value))
        .join(" ");
      const text = `${rows}\n${consoleText}`;
      let secretHits = 0;
      for (const secret of [PASSWORD, rawToken]) {
        if (secret && text.includes(secret)) secretHits += 1;
      }
      console.log(`secret_hits=${secretHits}`);
      expect(secretHits, "secret_hits").toBe(0);
      // The positive control proves that the scan finds a planted string.
      expect(`${text} ${PASSWORD}`.includes(PASSWORD), "the scan finds a planted string").toBe(
        true,
      );
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
