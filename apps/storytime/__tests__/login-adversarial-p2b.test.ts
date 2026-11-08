/**
 * Adversarial attacks on the Phase 2b login (test strategy P2b.9 rows 1, 2, 3, 5, and 8).
 *
 * This file is the adversarial role's own round. It attacks the live modules, not a copy:
 * the real sign-in and sign-out handlers, the real return-path check, the real origin check,
 * the real cookie builder, and the real media signer with the real storage driver.
 *
 * The cases:
 * 1. An open redirect through `next`: a table of hostile values goes through the POST handler,
 *    and every answer must stay on the app origin. A naive `startsWith("/")` validator is the
 *    positive control (it must be fooled, so the check can see an escape).
 * 2. A cross-site POST: the Origin, Referer, `Sec-Fetch-Site`, `x-forwarded-proto`, and
 *    `x-forwarded-host` variants run through the handler. A refused request answers 403, sets no
 *    cookie, and writes no session and no audit row.
 * 3. `seeOther`: the mutant caller shows that a path with no check escapes; the two production
 *    callers are proved to pass only a checked value.
 * 4. Signed media scope: a key that leaves the week, a scheme key, a leading slash, and a media
 *    path under `approval` must not be signed; `mediaUrl` gives an empty URL for a foreign key.
 * 5. The session cap under parallel calls.
 *
 * A case prints a labeled value and fails with a message. The counts are:
 * `next_adversarial_cases`, `next_offsite`, `next_fallbacks`, `next_errors`, `csrf_cases`,
 * `csrf_rejected`, `csrf_accepted`, `csrf_store_writes`, `seeother_live_escapes`,
 * `media_scope_cases`, `media_scope_escapes`, `cap_parallel_sessions`.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState, type FakeStore } from "./helpers/fake-store";
import week1 from "../content/l2/w01.json";
import { mediaPathsOf } from "../scripts/receive-weeks";

const counters = vi.hoisted(() => ({ verify: 0 }));

vi.mock("@reading-advantage/auth/password", async () => {
  const actual = (await import("@node-rs/argon2")) as unknown as {
    default: {
      hash(value: string, opts?: unknown): Promise<string>;
      verify(value: string, pw: string): Promise<boolean>;
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
const SAME_ORIGIN = resolve(APP, "lib/auth/same-origin.ts");
const SIGN_MODULE = resolve(APP, "lib/media/sign.ts");
const APP_ORIGIN = "https://app.example";
const PASSWORD = "correct horse battery staple";
const DEFAULT_IP = "203.0.113.7";

let passwordHash = "";

/** One row of the open-redirect table. */
interface NextCase {
  label: string;
  value: string;
  /** True when the value must be refused by the return-path check. */
  fallback: boolean;
}

/**
 * The hostile `next` table.
 *
 * The last three values hold a non-ASCII code point above U+00FF. They pass the check today, and
 * the answer then tries to write them into a `Location` header, which a Headers value cannot
 * hold. The case records the answer; it does not hide the fault.
 */
const NEXT_CASES: NextCase[] = [
  { label: "protocol-relative", value: "//evil.test", fallback: true },
  { label: "backslash after the first slash", value: "/\\evil.test", fallback: true },
  { label: "backslash and slash", value: "/\\/evil.test", fallback: true },
  { label: "encoded protocol-relative", value: "/%2F%2Fevil.test", fallback: true },
  { label: "encoded backslash", value: "/%5Cevil.test", fallback: true },
  { label: "encoded backslash inside the allowed prefix", value: "/th/st/%5Cevil.test", fallback: false },
  { label: "encoded tab then a protocol-relative value", value: "/th/st/2/1%09//evil.test", fallback: true },
  { label: "encoded newline then a protocol-relative value", value: "/th/st/2/1%0a//evil.test", fallback: true },
  { label: "raw newline", value: "/th/st/2/1\n//evil.test", fallback: true },
  { label: "raw tab", value: "/th/st/2/1\t//evil.test", fallback: true },
  { label: "absolute scheme", value: "https://evil.test/th/st/2/1", fallback: true },
  { label: "protocol-relative with a path", value: "//evil.test/th/st/2/1", fallback: true },
  { label: "CRLF in a query", value: "/th/st/2/1?x=%0d%0aLocation:%20//evil.test", fallback: true },
  { label: "dot segments", value: "/th/st/../../..//evil.test", fallback: true },
  { label: "encoded dot segments", value: "/th/st/%2e%2e/%2e%2e//evil.test", fallback: true },
  { label: "double-encoded dot segments", value: "/th/st/%252e%252e/evil", fallback: false },
  { label: "fragment with two slashes", value: "/th/st/2/1#//evil.test", fallback: false },
  { label: "query with two slashes", value: "/th/st/2/1?next=//evil.test", fallback: false },
  { label: "triple slash", value: "///evil.test", fallback: true },
  { label: "at sign", value: "/@evil.test", fallback: true },
  { label: "valid encoded e-acute", value: "/th/st/2/1?x=%C3%A9", fallback: false },
  { label: "upper-case locale", value: "/TH/st/2/1", fallback: true },
  { label: "201 characters", value: `/th/st/${"a".repeat(194)}`, fallback: true },
  { label: "NUL escape", value: "/th/st/%00", fallback: true },
  { label: "raw NUL", value: "/th/st/2/1\u0000", fallback: true },
  { label: "encoded NUL then a protocol-relative value", value: "/%00//evil.test", fallback: true },
  { label: "raw line separator", value: "/th/st/2/1\u2028", fallback: false },
  { label: "raw paragraph separator", value: "/th/st/2/1\u2029", fallback: false },
  { label: "raw Thai letter in the query", value: "/th/st/2/1?x=\u0e01", fallback: false },
];

/** One row of the cross-site table. */
interface OriginCase {
  label: string;
  headers: Record<string, string>;
  accept: boolean;
  /** True when the request carries no Origin header at all. */
  noOrigin?: boolean;
}

/** The header tables of the sign-in POST. */
const ORIGIN_CASES: OriginCase[] = [
  { label: "null origin without Sec-Fetch-Site", headers: { origin: "null" }, accept: false },
  {
    label: "null origin with Sec-Fetch-Site cross-site",
    headers: { origin: "null", "sec-fetch-site": "cross-site" },
    accept: false,
  },
  {
    label: "null origin with Sec-Fetch-Site same-site",
    headers: { origin: "null", "sec-fetch-site": "same-site" },
    accept: false,
  },
  {
    label: "null origin with Sec-Fetch-Site same-origin",
    headers: { origin: "null", "sec-fetch-site": "same-origin" },
    accept: true,
  },
  { label: "another origin", headers: { origin: "https://evil.test" }, accept: false },
  { label: "another port", headers: { origin: "https://app.example:8443" }, accept: false },
  {
    label: "matching origin with Sec-Fetch-Site cross-site",
    headers: { origin: APP_ORIGIN, "sec-fetch-site": "cross-site" },
    accept: true,
  },
  {
    label: "a spoofed http proto against a https origin",
    headers: { origin: APP_ORIGIN, host: "app.example", "x-forwarded-proto": "http" },
    accept: false,
  },
  {
    label: "a spoofed proto list with https first",
    headers: { origin: APP_ORIGIN, host: "app.example", "x-forwarded-proto": "https, http" },
    accept: true,
  },
  {
    label: "an unknown proto falls back to the request scheme",
    headers: { origin: APP_ORIGIN, host: "app.example", "x-forwarded-proto": "ftp" },
    accept: true,
  },
  {
    label: "the forwarded host does not move the comparison",
    headers: { origin: APP_ORIGIN, "x-forwarded-host": "evil.test" },
    accept: true,
  },
  { label: "no origin and no referer", headers: {}, accept: false, noOrigin: true },
  {
    label: "a referer prefix attack",
    headers: { referer: "https://app.example.evil.test/" },
    accept: false,
    noOrigin: true,
  },
  {
    label: "a referer user-info attack",
    headers: { referer: "https://app.example@evil.test/" },
    accept: false,
    noOrigin: true,
  },
  {
    label: "a same-origin referer only",
    headers: { referer: `${APP_ORIGIN}/th/sign-in` },
    accept: true,
    noOrigin: true,
  },
];

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
async function loadSignOut(): Promise<{
  POST(request: NextRequest): Promise<Response>;
}> {
  return (await import("../app/api/auth/sign-out/route.js")) as {
    POST(request: NextRequest): Promise<Response>;
  };
}

/**
 * Posts one sign-in form to the real handler.
 * @param fields The form fields.
 * @param headers The extra request headers.
 * @returns The route answer.
 */
async function postSignIn(
  fields: Record<string, string>,
  headers: Record<string, string> = {},
  noOrigin = false,
): Promise<Response> {
  const route = await loadSignIn();
  const merged: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    origin: APP_ORIGIN,
    "x-forwarded-for": DEFAULT_IP,
    ...headers,
  };
  // A table row that omits Origin must send no Origin header at all, not the default one.
  if (noOrigin) delete merged.origin;
  return route.POST(
    new NextRequest(new URL(`${APP_ORIGIN}/api/auth/sign-in`), {
      method: "POST",
      headers: merged,
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

/** The mutant validator: the naive check that the table must defeat. */
function naiveValidator(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") ? value : "/th/st";
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
  freshStore();
});

describe("login adversarial round (P2b.9)", () => {
  it("keeps every hostile next value on the app origin through the real handler", async () => {
    expect(existsSync(SIGN_IN_ROUTE), "Missing app/api/auth/sign-in/route.ts").toBe(true);

    let cases = 0;
    let fallbacks = 0;
    let offsite = 0;
    let errors = 0;
    const wrong: string[] = [];
    let naiveOffsite = 0;

    for (const entry of NEXT_CASES) {
      freshStore();
      cases += 1;
      if (naiveValidator(entry.value) !== "/th/st") naiveOffsite += 1;
      let response: Response | null = null;
      let errorText = "";
      try {
        response = await postSignIn({
          username: "staff-01",
          password: PASSWORD,
          next: entry.value,
          locale: "th",
        });
      } catch (error) {
        errors += 1;
        errorText = (error as Error).message;
      }
      if (response === null) {
        wrong.push(`${entry.label}: the handler threw (${errorText})`);
        continue;
      }
      const location = locationOf(response);
      if (response.status !== 303) {
        wrong.push(`${entry.label}: status ${response.status}, not 303`);
        continue;
      }
      if (setCookieCount(response) !== 1) {
        wrong.push(`${entry.label}: ${setCookieCount(response)} cookies, not 1`);
      }
      if (!location) {
        wrong.push(`${entry.label}: no Location`);
        continue;
      }
      if (!location.startsWith("/") || location.startsWith("//") || /[\r\n]/.test(location)) {
        wrong.push(`${entry.label}: Location ${JSON.stringify(location)} is not a relative path`);
        offsite += 1;
        continue;
      }
      const origin = new URL(location, APP_ORIGIN).origin;
      if (origin !== APP_ORIGIN) {
        offsite += 1;
        wrong.push(`${entry.label}: Location ${location} leaves the app origin (${origin})`);
        continue;
      }
      if (entry.fallback) {
        if (location === "/th/st") fallbacks += 1;
        else wrong.push(`${entry.label}: expected the fallback, got ${JSON.stringify(location)}`);
      } else if (location !== entry.value) {
        wrong.push(`${entry.label}: expected ${JSON.stringify(entry.value)}, got ${location}`);
      }
    }

    console.log(
      `next_adversarial_cases=${cases} next_fallbacks=${fallbacks} ` +
        `next_offsite=${offsite} next_errors=${errors}`,
    );
    console.log(`naive_offsite=${naiveOffsite}`);
    console.log(`next_table=${NEXT_CASES.length}`);
    expect(NEXT_CASES.length, "next_table").toBeGreaterThanOrEqual(29);
    expect(naiveOffsite, "the naive validator is fooled (positive control)").toBeGreaterThanOrEqual(
      10,
    );
    expect(offsite, "next_offsite").toBe(0);
    expect(errors, `the handler threw for a next value: ${wrong.join("; ")}`).toBe(0);
    expect(wrong, "every hostile next value is refused or stays same-origin").toEqual([]);
  });

  it("answers a cross-site POST with 403 and writes nothing, and accepts only the pinned tables", async () => {
    expect(existsSync(SIGN_IN_ROUTE), "Missing app/api/auth/sign-in/route.ts").toBe(true);

    let cases = 0;
    let rejected = 0;
    let accepted = 0;
    let storeWrites = 0;
    const wrong: string[] = [];

    for (const entry of ORIGIN_CASES) {
      cases += 1;
      const store = freshStore();
      let response: Response;
      try {
        response = await postSignIn(
          { username: "staff-01", password: PASSWORD, next: "/th/st/2/1", locale: "th" },
          entry.headers,
          entry.noOrigin ?? false,
        );
      } catch (error) {
        wrong.push(`${entry.label}: the handler threw (${(error as Error).message})`);
        continue;
      }
      if (entry.accept) {
        accepted += 1;
        if (response.status !== 303) {
          wrong.push(`${entry.label}: expected 303, got ${response.status}`);
        }
        if (setCookieCount(response) !== 1) {
          wrong.push(`${entry.label}: expected one cookie, got ${setCookieCount(response)}`);
        }
        if (store.sessions.length !== 1) {
          wrong.push(`${entry.label}: expected one session, got ${store.sessions.length}`);
        }
        if (locationOf(response) !== "/th/st/2/1") {
          wrong.push(`${entry.label}: Location ${locationOf(response)}, not the checked next`);
        }
      } else {
        rejected += 1;
        storeWrites += store.sessions.length + store.auditEvents.length;
        if (store.sessions.length > 0 || store.auditEvents.length > 0) {
          console.log(
            `csrf_write ${entry.label}: sessions=${store.sessions.length} audits=${store.auditEvents.length}`,
          );
        }
        if (response.status !== 403) {
          wrong.push(`${entry.label}: expected 403, got ${response.status}`);
        }
        if (setCookieCount(response) !== 0) {
          wrong.push(`${entry.label}: a refused request set a cookie`);
        }
        if (store.sessions.length !== 0) {
          wrong.push(`${entry.label}: a refused request wrote a session`);
        }
        if (store.auditEvents.length !== 0) {
          wrong.push(`${entry.label}: a refused request wrote an audit row`);
        }
        if (locationOf(response) !== null) {
          wrong.push(`${entry.label}: a refused request sent a Location`);
        }
      }
    }

    // The sign-out route follows the same rule: the null-origin cases and an evil origin.
    const signOut = await loadSignOut();
    const signOutCases: Array<{ label: string; headers: Record<string, string>; status: number }> =
      [
        { label: "null origin without Sec-Fetch-Site", headers: { origin: "null" }, status: 403 },
        { label: "null origin with same-origin", headers: { origin: "null", "sec-fetch-site": "same-origin" }, status: 303 },
        { label: "an evil origin", headers: { origin: "https://evil.test" }, status: 403 },
      ];
    for (const entry of signOutCases) {
      freshStore().sessions.push({
        tokenDigest: "a".repeat(64),
        accountId: "account-1",
        expiresAt: new Date(Date.now() + 86_400_000),
        lastUseAt: new Date(),
        createdAt: new Date(),
      });
      const response = await signOut.POST(
        new NextRequest(new URL(`${APP_ORIGIN}/api/auth/sign-out`), {
          method: "POST",
          headers: { ...entry.headers, cookie: `__Host-st_session=forged` },
        }),
      );
      if (response.status !== entry.status) {
        wrong.push(`sign-out ${entry.label}: expected ${entry.status}, got ${response.status}`);
      }
      if (entry.status === 403 && fakeStoreState.current.sessions.length !== 1) {
        wrong.push(`sign-out ${entry.label}: a refused request ended the session`);
      }
    }

    console.log(`csrf_cases=${cases + signOutCases.length} csrf_rejected=${rejected} csrf_accepted=${accepted}`);
    console.log(`csrf_store_writes=${storeWrites}`);
    expect(cases, "csrf_cases").toBeGreaterThanOrEqual(15);
    expect(rejected, "csrf_rejected").toBeGreaterThanOrEqual(7);
    expect(accepted, "csrf_accepted").toBeGreaterThanOrEqual(6);
    expect(storeWrites, "csrf_store_writes").toBe(0);
    expect(wrong, "every cross-site table behaves as pinned").toEqual([]);
  });

  it("proves the seeOther mutant escapes while both production callers never pass a hostile path", async () => {
    expect(existsSync(SAME_ORIGIN), "Missing apps/storytime/lib/auth/same-origin.ts").toBe(true);
    const mod = (await import("../lib/auth/same-origin.js")) as {
      seeOther(path: string): Response;
    };

    // The mutant: a caller that passes a raw value. The Location is protocol-relative, so a
    // browser leaves the site. This is finding F70, unreachable from the two production callers.
    const mutant = mod.seeOther("//evil.test");
    const mutantLocation = mutant.headers.get("location") ?? "";
    const mutantEscapes = new URL(mutantLocation, APP_ORIGIN).origin !== APP_ORIGIN;
    console.log(`seeother_mutant_escapes=${mutantEscapes ? 1 : 0}`);
    expect(mutantEscapes, "the mutant caller escapes (positive control)").toBe(true);

    // The live path: every hostile value goes through the validator first and then the handler.
    let liveEscapes = 0;
    let liveCases = 0;
    for (const value of ["//evil.test", "/\\evil.test", "/%2F%2Fevil.test", "https://evil.test/x"]) {
      liveCases += 1;
      freshStore();
      const response = await postSignIn({
        username: "staff-01",
        password: PASSWORD,
        next: value,
        locale: "th",
      });
      const location = locationOf(response);
      if (!location) continue;
      if (!location.startsWith("/") || location.startsWith("//")) liveEscapes += 1;
      else if (new URL(location, APP_ORIGIN).origin !== APP_ORIGIN) liveEscapes += 1;
    }
    console.log(`seeother_live_cases=${liveCases} seeother_live_escapes=${liveEscapes}`);
    expect(liveEscapes, "seeother_live_escapes").toBe(0);
  });

  it("refuses a media key that leaves the week and does not sign the approval prose", async () => {
    expect(existsSync(SIGN_MODULE), "Missing apps/storytime/lib/media/sign.ts").toBe(true);
    const sign = (await import("../lib/media/sign.js")) as {
      signWeekMedia(
        week: unknown,
        deps: { storage?: { getSignedUrl(key: string, expiresIn?: number): Promise<string> }; mediaBase?: string },
      ): Promise<Record<string, string>>;
    };
    const storageMod = (await import("@reading-advantage/storage")) as {
      createStorageClient(config: {
        endpoint: string;
        region: string;
        bucket: string;
        accessKeyId: string;
        secretAccessKey: string;
      }): { getSignedUrl(key: string, expiresIn?: number): Promise<string> };
    };
    const storage = storageMod.createStorageClient({
      endpoint: "https://storage.googleapis.com",
      region: "auto",
      bucket: "storytime-app-media",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
    });
    const mediaBase = "gs://storytime-app-media";

    const clone = (): Record<string, unknown> =>
      JSON.parse(JSON.stringify(week1)) as Record<string, unknown>;

    /** Replaces the first `file` string of the week with a hostile key. */
    const withFile = (key: string): Record<string, unknown> => {
      const week = clone();
      let done = false;
      const walk = (value: unknown): void => {
        if (done || !value || typeof value !== "object") return;
        const record = value as Record<string, unknown>;
        if (typeof record.file === "string") {
          record.file = key;
          done = true;
          return;
        }
        for (const entry of Object.values(record)) walk(entry);
      };
      walk(week);
      expect(done, `the week holds a file to replace with ${key}`).toBe(true);
      return week;
    };

    let scopeCases = 0;
    const escapes: string[] = [];
    for (const key of [
      "../l2/w02/secret.jpg",
      "/l2/w01/secret.jpg",
      "https://evil.test/secret.jpg",
      "l2/w01/../../w02/secret.jpg",
    ]) {
      scopeCases += 1;
      let threw = false;
      try {
        await sign.signWeekMedia(withFile(key), { storage, mediaBase });
      } catch {
        threw = true;
      }
      if (!threw) escapes.push(key);
    }
    console.log(`media_scope_throws=${scopeCases - escapes.length} media_scope_escapes=${escapes.length}`);
    expect(escapes, "every key that leaves the week is refused").toEqual([]);

    // A media path under `approval` is prose, so it is not signed.
    const approvalWeek = clone();
    const approval = (approvalWeek.approval ?? {}) as Record<string, unknown>;
    const audio = (approval.audio ?? {}) as Record<string, unknown>;
    audio.source = "l2/w02/approval-prose.mp3";
    approval.audio = audio;
    approvalWeek.approval = approval;
    const map = await sign.signWeekMedia(approvalWeek, { storage, mediaBase });
    const approvalKeys = Object.keys(map).filter((key) => key.endsWith("approval-prose.mp3"));
    const expected = new Set(
      mediaPathsOf(approvalWeek)
        .filter((entry) => !entry.path.startsWith("approval."))
        .map((entry) => entry.file),
    );
    const outside = Object.keys(map).filter((key) => !expected.has(key));
    console.log(`approval_prose_signed=${approvalKeys.length} media_keys_outside_week=${outside.length}`);
    expect(approvalKeys, "the approval prose is not signed").toEqual([]);
    expect(outside, "no signed key is outside the week").toEqual([]);

    // A foreign file gets no URL from the client helper.
    const urlMod = (await import("../lib/media/url.js")) as {
      mediaUrl(mediaUrls: Record<string, string>, file: string): string;
    };
    const foreign = urlMod.mediaUrl(map, "../l2/w02/secret.jpg");
    console.log(`media_url_foreign=${foreign === "" ? 0 : 1}`);
    expect(foreign, "a foreign key gets no URL").toBe("");
  });

  it("keeps the family cap at 5 under twelve parallel session creations", async () => {
    const store = freshStore();
    const account = store.accounts[0];
    const now = new Date("2026-11-08T00:00:00.000Z");
    const expiresAt = new Date(now.getTime() + 365 * 86_400_000);
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        store.createSessionWithCap({
          accountId: account.id,
          tokenDigest: `${String(index).padStart(2, "0")}${"a".repeat(62)}`,
          now: new Date(now.getTime() + index * 1000),
          expiresAt,
          cap: 5,
        }),
      ),
    );
    const sessions = store.sessions.length;
    const ended = results.reduce((sum, result) => sum + result.endedDigests.length, 0);
    console.log(`cap_parallel_sessions=${sessions} cap_parallel_ended=${ended}`);
    expect(sessions, "a family account holds 5 sessions after the race").toBe(5);
    const first = store.sessions.map((session) => session.tokenDigest);
    expect(first, "the newest five sessions stay").toEqual([
      "07aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "08aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "09aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "10aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "11aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ]);
  });
});
