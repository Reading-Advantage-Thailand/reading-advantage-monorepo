/**
 * The username flash cookie of the sign-in handler (UX finding F1, test strategy P2b.7 F5,
 * task 2b.7b, PM decision Q7).
 *
 * A wrong sign-in keeps the username for one trip back to the form. The handler answers 303 with
 * one host-only flash cookie: `st_signin_username=<username>`; Max-Age=60; Path=/<locale>/sign-in;
 * HttpOnly; Secure; SameSite=Strict. The value is the username only, and only when the username
 * matches the username rule (trim, lower case, 1 to 64 characters, and the characters a-z, 0-9,
 * "-", "_", "."). The log holds no username value. A good sign-in sets no flash cookie and clears
 * one that the device holds.
 *
 * The cookie name is `SIGN_IN_USERNAME_COOKIE`, exported from apps/storytime/lib/auth/index.ts.
 * Every case prints a labeled value. At the base every case fails with a message; the route is
 * loaded only after the existsSync check, so no case fails with a load error.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState, type FakeStore } from "./helpers/fake-store";

const counters = vi.hoisted(() => ({ verify: 0 }));

vi.mock("@reading-advantage/auth/password", async () => {
  const actual = (await import("@node-rs/argon2")) as unknown as {
    default: {
      hash(value: string, opts?: unknown): Promise<string>;
      verify(value: string, hash: string): Promise<boolean>;
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
const ROUTE = resolve(APP, "app/api/auth/sign-in/route.ts");
const AUTH_ENTRY = resolve(APP, "lib/auth/index.ts");
const MISSING = "Missing apps/storytime/app/api/auth/sign-in/route.ts";
const APP_ORIGIN = "https://app.example";
const PASSWORD = "correct horse battery staple";
const DEFAULT_IP = "203.0.113.7";
const FLASH_COOKIE = "st_signin_username";

let passwordHash = "";

/** One parsed Set-Cookie line. */
interface ParsedCookie {
  name: string;
  value: string;
  attrs: Record<string, string>;
}

/** Parses one Set-Cookie header into a name, a value, and its attributes. */
function parseCookie(line: string): ParsedCookie {
  const parts = line.split(";").map((part) => part.trim());
  const pair = parts.shift() ?? "";
  const eq = pair.indexOf("=");
  const attrs: Record<string, string> = {};
  for (const part of parts) {
    const i = part.indexOf("=");
    if (i === -1) attrs[part.toLowerCase()] = "";
    else attrs[part.slice(0, i).toLowerCase()] = part.slice(i + 1);
  }
  return { name: pair.slice(0, eq), value: pair.slice(eq + 1), attrs };
}

/** Returns the Set-Cookie headers of a response as separate lines. */
function setCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

/** Reads the path and query of a response Location header. */
function locationPath(response: Response): string | null {
  const value = response.headers.get("location");
  if (!value) return null;
  const url = new URL(value, APP_ORIGIN);
  return `${url.pathname}${url.search}`;
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

/** Returns the flash cookies of a response. */
function flashCookies(response: Response): ParsedCookie[] {
  return setCookies(response)
    .map(parseCookie)
    .filter((cookie) => cookie.name === FLASH_COOKIE);
}

beforeAll(async () => {
  const argon = (await import("@node-rs/argon2")) as unknown as {
    default: { hash(value: string, opts?: unknown): Promise<string> };
  };
  const opts = { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };
  passwordHash = await argon.default.hash(PASSWORD, opts);
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T00:00:00.000Z"));
  counters.verify = 0;
  const store: FakeStore = createFakeStore({
    accounts: [
      { username: "staff-01", passwordHash, role: "family" },
      { username: "demo-class-01", passwordHash, role: "class" },
    ],
  });
  fakeStoreState.current = store;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("sign-in username flash cookie (red)", () => {
  it("exports SIGN_IN_USERNAME_COOKIE with the pinned name", async () => {
    expect(existsSync(AUTH_ENTRY), "Missing apps/storytime/lib/auth/index.ts").toBe(true);
    const auth = (await import("../lib/auth/index.js")) as Record<string, unknown>;
    const name = auth.SIGN_IN_USERNAME_COOKIE;
    console.log(`sign_in_username_cookie_export=${String(name)}`);
    expect(name, "SIGN_IN_USERNAME_COOKIE is exported").toBe(FLASH_COOKIE);
  });

  it("answers a wrong password with one host-only flash cookie of the username", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const response = await signIn("staff-01", "wrong-password");
    const cookies = setCookies(response).map(parseCookie);
    const flash = cookies.filter((cookie) => cookie.name === FLASH_COOKIE);
    console.log(
      `flash_cookie_count=${flash.length} flash_cookie_name=${flash[0]?.name ?? "<none>"} ` +
        `flash_cookie_value=${flash[0]?.value ?? "<none>"} flash_cookie_attrs=${JSON.stringify(flash[0]?.attrs ?? {})}`,
    );
    expect(response.status, "status").toBe(303);
    expect(locationPath(response), "the invalid sign-in Location").toBe(
      "/th/sign-in?error=invalid&next=%2Fth%2Fst%2F2%2F1",
    );
    expect(cookies, "one cookie only").toHaveLength(1);
    expect(flash, "one flash cookie").toHaveLength(1);
    const cookie = flash[0];
    expect(cookie.value, "the value is the username").toBe("staff-01");
    expect(cookie.attrs["max-age"], "Max-Age").toBe("60");
    expect(cookie.attrs["path"], "Path").toBe("/th/sign-in");
    expect(cookie.attrs["domain"], "no Domain").toBeUndefined();
    expect(cookie.attrs["httponly"], "HttpOnly").toBeDefined();
    expect(cookie.attrs["secure"], "Secure").toBeDefined();
    expect(cookie.attrs["samesite"], "SameSite").toBe("Strict");
  });

  it("puts the username only in the cookie, and sets no cookie for a refused username", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const good = await signIn("staff-01", "wrong-password");
    const goodFlash = flashCookies(good);
    console.log(`flash_value_holds_password=${goodFlash[0]?.value.includes("wrong-password") ? 1 : 0}`);
    expect(goodFlash[0]?.value, "the value is the username").toBe("staff-01");
    expect(goodFlash[0]?.value.includes("wrong-password"), "the value never holds the password").toBe(
      false,
    );
    const refused = [
      "a".repeat(65),
      "bad\nuser",
      "staff 01",
      "ผู้ใช้",
      "<script>",
      '"><img src=x>',
    ];
    const leaks: string[] = [];
    for (const username of refused) {
      const response = await signIn(username, "wrong-password");
      const count = flashCookies(response).length;
      console.log(`flash_refused_username=${JSON.stringify(username)} flash_cookie_count=${count}`);
      if (count !== 0 || response.status !== 303) leaks.push(`${JSON.stringify(username)}: ${count}`);
    }
    expect(leaks, "no flash cookie for a refused username").toEqual([]);
  });

  it("logs no username value on a wrong password", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await signIn("staff-01", "wrong-password");
    const flash = flashCookies(response);
    const text = [...warnSpy.mock.calls, ...logSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .map((value) => String(value))
      .join(" ");
    console.log(`flash_log_lines=${warnSpy.mock.calls.length} flash_log_holds_username=${text.includes("staff-01") ? 1 : 0}`);
    expect(flash, "the flash cookie is set").toHaveLength(1);
    expect(text.includes("staff-01"), "no log line holds the username").toBe(false);
  });

  it("sets a good sign-in with no flash cookie, and clears one that exists", async () => {
    expect(existsSync(ROUTE), MISSING).toBe(true);
    const fresh = await signIn("staff-01", PASSWORD);
    const freshFlash = flashCookies(fresh);
    console.log(`good_sign_in_flash_cookies=${freshFlash.length}`);
    expect(freshFlash, "a good sign-in sets no flash cookie").toHaveLength(0);
    expect(setCookies(fresh), "one session cookie").toHaveLength(1);
    const carried = await signIn("staff-01", PASSWORD, {
      headers: { cookie: `${FLASH_COOKIE}=staff-02` },
    });
    const lines = setCookies(carried);
    const clear = lines.map(parseCookie).filter((cookie) => cookie.name === FLASH_COOKIE);
    console.log(`good_sign_in_clear_cookies=${clear.length} clears=${JSON.stringify(clear.map((c) => c.attrs))}`);
    expect(clear, "one clearing flash cookie").toHaveLength(1);
    expect(clear[0].value, "the clearing value is empty").toBe("");
    expect(clear[0].attrs["max-age"], "Max-Age").toBe("0");
    expect(clear[0].attrs["path"], "Path").toBe("/th/sign-in");
    expect(
      lines.map(parseCookie).filter((cookie) => cookie.name === "__Host-st_session"),
      "one session cookie",
    ).toHaveLength(1);
  });
});
