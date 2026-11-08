/**
 * Adversarial attacks on the Phase 2b login, round 2 (test strategy P2b.9 row 1).
 *
 * This file attacks the F90 fix and the browser-gate look-asset skip. It runs the real modules,
 * not a copy: `safeReturnPath`, the sign-in POST, the sign-out POST, and the `isLookStaticAsset`
 * helper of `phase2b-browser-gate.sh` (read from the gate source).
 *
 * A case prints a labeled value and fails with a message. The counts are
 * `round2_path_cases`, `round2_handler_cases`, `round2_matcher_cases`.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState, type FakeStore } from "./helpers/fake-store";

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
const RETURN_PATH = resolve(APP, "lib/auth/return-path.ts");
const SIGN_IN_ROUTE = resolve(APP, "app/api/auth/sign-in/route.ts");
const SIGN_OUT_ROUTE = resolve(APP, "app/api/auth/sign-out/route.ts");
const GATE = resolve(APP, "__tests__/phase2b-browser-gate.sh");
const APP_ORIGIN = "https://app.example";
const PASSWORD = "correct horse battery staple";
const DEFAULT_IP = "203.0.113.7";
const FALLBACK = "/th/st";
/** Every byte is ASCII (U+0000 to U+007F). The property escape avoids no-control-regex. */
const ASCII_ONLY = /^\p{ASCII}*$/u;

/** One hostile `next` value and the label of the rule it attacks. */
interface RawCase {
  label: string;
  value: string;
  /** True when the value must fall back to the default path. */
  fallback: boolean;
}

/** A raw code point above U+007F must fall back (a header cannot carry it). */
const RAW_CASES: RawCase[] = [
  { label: "U+0080 code point", value: "/th/st/2/1?x=\u0080", fallback: true },
  { label: "U+00FF code point", value: "/th/st/2/1?x=\u00ff", fallback: true },
  { label: "astral emoji (a surrogate pair)", value: "/th/st/2/1?x=\u{1f600}", fallback: true },
  { label: "lone high surrogate", value: "/th/st/2/1?x=\ud800", fallback: true },
  {
    label: "raw non-ASCII after an encoded part",
    value: "/th/st/2/1?x=%C3%A9\u00e9",
    fallback: true,
  },
  { label: "raw NUL", value: "/th/st/2/1?x=\u0000", fallback: true },
  { label: "raw DEL", value: "/th/st/2/1?x=\u007f", fallback: true },
];

/** An encoded ASCII value keeps its path or falls back, and it never throws. */
const ENCODED_CASES: RawCase[] = [
  { label: "mixed-case encoded e-acute", value: "/th/st/2/1?x=%c3%a9", fallback: false },
  { label: "double-encoded e-acute", value: "/th/st/2/1?x=%25C3%25A9", fallback: false },
];

/** One hostile file name for the gate matcher. */
interface MatcherCase {
  label: string;
  pathname: string;
  lookAsset: boolean;
}

/** The gate must not skip a file that only starts with a look asset name. */
const MATCHER_CASES: MatcherCase[] = [
  {
    label: "story media with a look prefix",
    pathname: "/_next/static/media/grove-d-evil.webp",
    lookAsset: false,
  },
  {
    label: "look name outside /_next/static/",
    pathname: "/media/grove-d.webp",
    lookAsset: false,
  },
  {
    label: "look name with a query string",
    pathname: "/_next/static/media/grove-d.4f3a.webp?v=1",
    lookAsset: false,
  },
  {
    label: "look name with a hash",
    pathname: "/_next/static/media/grove-d.4f3a.webp#x",
    lookAsset: false,
  },
  {
    label: "case variant of a look name",
    pathname: "/_next/static/media/GROVE-D.4f3a.webp",
    lookAsset: false,
  },
  {
    label: "a dot-dot segment before a look name",
    pathname: "/_next/static/media/../grove-d.webp",
    lookAsset: false,
  },
  {
    label: "positive control: a built look place",
    pathname: "/_next/static/media/grove-d.4f3a.webp",
    lookAsset: true,
  },
  {
    label: "positive control: a built look font",
    pathname: "/_next/static/media/fredoka-latin.9c1.woff2",
    lookAsset: true,
  },
];

let passwordHash = "";

/** Replaces the fake store with one family account. */
function freshStore(): FakeStore {
  const store = createFakeStore({
    accounts: [{ username: "staff-01", passwordHash, role: "family" }],
  });
  fakeStoreState.current = store;
  return store;
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

/**
 * Posts one sign-in form to the real handler.
 * @param fields The form fields.
 * @returns The route answer.
 */
async function postSignIn(fields: Record<string, string>): Promise<Response> {
  const route = await loadSignIn();
  return route.POST(
    new NextRequest(new URL(`${APP_ORIGIN}/api/auth/sign-in`), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: APP_ORIGIN,
        "x-forwarded-for": DEFAULT_IP,
      },
      body: new URLSearchParams(fields).toString(),
    }),
  );
}

/** Reads the raw Location header value of one answer. */
function locationOf(response: Response): string | null {
  return response.headers.get("location");
}

/** Counts the Set-Cookie headers of one answer. */
function setCookieCount(response: Response): number {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie().length;
  return response.headers.get("set-cookie") ? 1 : 0;
}

/**
 * Reads the look-asset helper out of the gate source.
 * @returns The helper, the look names, and the source of the file name check.
 */
function loadMatcher(): {
  match(pathname: string): boolean;
  names: string[];
} {
  const source = readFileSync(GATE, "utf8");
  const namesMatch = source.match(/const LOOK_ASSET_NAMES = \[([\s\S]*?)\];/);
  const functionMatch = source.match(/function isLookStaticAsset\(pathname\) \{([\s\S]*?)\n\}/);
  expect(namesMatch, "the gate names the look assets").not.toBeNull();
  expect(functionMatch, "the gate defines isLookStaticAsset").not.toBeNull();
  const names = [...(namesMatch as RegExpMatchArray)[1].matchAll(/"([^"]+)"/g)].map(
    (match) => match[1],
  );
  const body = (functionMatch as RegExpMatchArray)[1];
  const factory = new Function(
    "LOOK_ASSET_NAMES",
    `return function isLookStaticAsset(pathname) {${body}\n};`,
  ) as (names: string[]) => (pathname: string) => boolean;
  return { match: factory(names), names };
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
  freshStore();
});

describe("login adversarial round 2 (P2b.9)", () => {
  it("refuses every raw non-ASCII value and keeps encoded ASCII values", async () => {
    expect(existsSync(RETURN_PATH), "Missing lib/auth/return-path.ts").toBe(true);
    const mod = (await import("../lib/auth/return-path.js")) as {
      safeReturnPath(value: unknown, fallback: string): string;
    };
    const rows = [...RAW_CASES, ...ENCODED_CASES];
    const wrong: string[] = [];
    let fallenBack = 0;
    for (const entry of rows) {
      let result: string;
      try {
        result = mod.safeReturnPath(entry.value, FALLBACK);
      } catch (error) {
        wrong.push(`${entry.label}: safeReturnPath threw (${(error as Error).message})`);
        continue;
      }
      console.log(`round2_path ${entry.label}: ${JSON.stringify(result)}`);
      if (!ASCII_ONLY.test(result)) {
        wrong.push(`${entry.label}: result holds a non-ASCII byte`);
      }
      if (entry.fallback && result !== FALLBACK) {
        wrong.push(`${entry.label}: expected the fallback, got ${JSON.stringify(result)}`);
      }
      if (!entry.fallback && result !== entry.value && result !== FALLBACK) {
        wrong.push(`${entry.label}: expected the value or the fallback, got ${JSON.stringify(result)}`);
      }
      if (result === FALLBACK) fallenBack += 1;
    }
    console.log(`round2_path_cases=${rows.length} round2_path_fallbacks=${fallenBack}`);
    expect(rows.length, "round2_path_cases").toBe(9);
    expect(fallenBack, "round2_path_fallbacks").toBe(7);
    expect(wrong, "every raw non-ASCII value falls back and no value throws").toEqual([]);
  });

  it("answers every hostile next value with a 303 and an ASCII relative Location", async () => {
    expect(existsSync(SIGN_IN_ROUTE), "Missing app/api/auth/sign-in/route.ts").toBe(true);
    const rows = [...RAW_CASES, ...ENCODED_CASES];
    const wrong: string[] = [];
    let statuses = 0;
    for (const entry of rows) {
      freshStore();
      let response: Response | null = null;
      try {
        response = await postSignIn({
          username: "staff-01",
          password: PASSWORD,
          next: entry.value,
          locale: "th",
        });
      } catch (error) {
        wrong.push(`${entry.label}: the handler threw (${(error as Error).message})`);
        continue;
      }
      const location = locationOf(response);
      if (response.status !== 303) {
        wrong.push(`${entry.label}: status ${response.status}, not 303`);
        continue;
      }
      statuses += 1;
      if (setCookieCount(response) !== 1) {
        wrong.push(`${entry.label}: ${setCookieCount(response)} cookies, not 1`);
      }
      if (!location) {
        wrong.push(`${entry.label}: no Location`);
        continue;
      }
      if (!location.startsWith("/") || location.startsWith("//")) {
        wrong.push(`${entry.label}: Location ${JSON.stringify(location)} is not a relative path`);
      }
      if (!ASCII_ONLY.test(location)) {
        wrong.push(`${entry.label}: Location ${JSON.stringify(location)} holds a non-ASCII byte`);
      }
      const origin = new URL(location, APP_ORIGIN).origin;
      if (origin !== APP_ORIGIN) {
        wrong.push(`${entry.label}: Location ${location} leaves the app origin (${origin})`);
      }
      if (entry.fallback && location !== FALLBACK) {
        wrong.push(`${entry.label}: expected ${FALLBACK}, got ${JSON.stringify(location)}`);
      }
    }
    console.log(`round2_handler_cases=${rows.length} round2_handler_303=${statuses}`);
    expect(rows.length, "round2_handler_cases").toBe(9);
    expect(wrong, "every hostile next value answers 303 with an ASCII relative Location").toEqual(
      [],
    );
  });

  it("writes no session and no audit row when the redirect build fails", async () => {
    expect(existsSync(SIGN_IN_ROUTE), "Missing app/api/auth/sign-in/route.ts").toBe(true);
    // Positive control: the same request writes one session and one audit row without the mock.
    const controlStore = freshStore();
    const control = await postSignIn({
      username: "staff-01",
      password: PASSWORD,
      next: "/th/st/2/1",
      locale: "th",
    });
    console.log(
      `round2_control sessions=${controlStore.sessions.length} audits=${controlStore.auditEvents.length}`,
    );
    expect(control.status, "the control answers 303").toBe(303);
    expect(controlStore.sessions.length, "the control writes one session").toBe(1);

    vi.resetModules();
    const actualSameOrigin =
      await vi.importActual<typeof import("../lib/auth/same-origin")>(
        "../lib/auth/same-origin",
      );
    vi.doMock("../lib/auth/same-origin", () => ({
      ...actualSameOrigin,
      seeOther: () => {
        throw new Error("the Location cannot be built");
      },
    }));
    try {
      freshStore();
      let response: Response | null = null;
      let thrown: unknown = null;
      try {
        response = await postSignIn({
          username: "staff-01",
          password: PASSWORD,
          next: "/th/st/2/1",
          locale: "th",
        });
      } catch (error) {
        thrown = error;
      }
      const sessions = fakeStoreState.current.sessions.length;
      const audits = fakeStoreState.current.auditEvents.length;
      console.log(
        `round2_bad_location sessions=${sessions} audits=${audits} thrown=${thrown === null ? 0 : 1}`,
      );
      expect(thrown, "the handler does not throw").toBeNull();
      expect(sessions, "no session on a failed redirect build").toBe(0);
      expect(audits, "no audit row on a failed redirect build").toBe(0);
      expect(response, "the handler answers").not.toBeNull();
      const answer = response as unknown as Response;
      expect(answer.status, "the answer is 303").toBe(303);
      const location = locationOf(answer);
      expect(location, "a Location is set").not.toBeNull();
      expect(ASCII_ONLY.test(location ?? ""), "the Location is ASCII").toBe(true);
      expect(location, "the Location is relative and default").toBe(FALLBACK);
    } finally {
      vi.doUnmock("../lib/auth/same-origin");
      vi.resetModules();
    }
  });

  it("gives the sign-out route an ASCII relative Location for each locale", async () => {
    expect(existsSync(SIGN_OUT_ROUTE), "Missing app/api/auth/sign-out/route.ts").toBe(true);
    const route = await loadSignOut();
    const wrong: string[] = [];
    for (const locale of ["th", "en"]) {
      freshStore();
      const response = await route.POST(
        new NextRequest(new URL(`${APP_ORIGIN}/api/auth/sign-out`), {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            origin: APP_ORIGIN,
          },
          body: new URLSearchParams({ locale }).toString(),
        }),
      );
      const location = locationOf(response);
      console.log(`round2_signout ${locale}: status=${response.status} location=${location}`);
      if (response.status !== 303) wrong.push(`${locale}: status ${response.status}, not 303`);
      if (location !== `/${locale}/sign-in`) {
        wrong.push(`${locale}: Location ${JSON.stringify(location)}`);
      }
      if (!ASCII_ONLY.test(location ?? "")) wrong.push(`${locale}: Location is not ASCII`);
      if (setCookieCount(response) !== 1) wrong.push(`${locale}: no clearing cookie`);
    }
    expect(wrong, "the sign-out Location is ASCII, relative, and per locale").toEqual([]);
  });

  it("skips only a built look asset, not a file that starts with a look name", async () => {
    expect(existsSync(GATE), "Missing __tests__/phase2b-browser-gate.sh").toBe(true);
    const { match, names } = loadMatcher();
    console.log(`round2_matcher_names=${names.length}`);
    // A4: an empty name list would make every hostile row pass for the wrong reason.
    expect(names.length, "the gate names 16 look assets").toBe(16);
    const wrong: string[] = [];
    let falseSkips = 0;
    for (const entry of MATCHER_CASES) {
      const result = match(entry.pathname);
      console.log(`round2_matcher ${entry.label}: ${result}`);
      if (result !== entry.lookAsset) {
        if (!entry.lookAsset) falseSkips += 1;
        wrong.push(
          `${entry.label}: isLookStaticAsset(${entry.pathname}) is ${result}, expected ${entry.lookAsset}`,
        );
      }
    }
    console.log(
      `round2_matcher_cases=${MATCHER_CASES.length} round2_matcher_false_skips=${falseSkips}`,
    );
    expect(MATCHER_CASES.length, "round2_matcher_cases").toBe(8);
    expect(wrong, "the look-asset skip does not swallow a story media file").toEqual([]);
  });
});
