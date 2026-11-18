// @vitest-environment node
/**
 * The teacher entry (track storytime_app_rebuild_20261025, plan task 6.2, round 7; PM 2026-11-14).
 *
 * Daniel asked: "These two logins are the same content now, correct?" After the sign-in, the
 * family account and the teacher account both land on `/<locale>/st`, and no page links to the
 * teacher view. The PM order has four points. This file pins points 1 to 3 as unit rows. Point 4
 * (the browser check at 390x844 and 1440x900) is the new row 20 of
 * `apps/storytime/__tests__/look-phase2-browser-gate.sh`, which seeds a teacher account and a
 * family account.
 *
 * The one new export that the Green must add: `firstOpenWeek()` in `apps/storytime/lib/content.ts`.
 * It gives `{ level, week }` for the lowest week of the lowest level that a child may open, by the
 * rule of `highestOpenWeeks` (the readiness gate, `STORYTIME_SHOW_DRAFT_MEDIA`, and
 * `STORYTIME_REVIEW_DRAFT_WEEKS`), or `null` when no week is open. It writes no log. The sign-in
 * handler, the sign-in page, and the `/st` pages read it through `../lib/content`; these tests
 * mock it by that file.
 *
 * Two new message keys in `messages/th.json` and `messages/en.json`:
 *   - `teacherChildViewLink`: the label of the link on a teacher page to the child page of the
 *     same week;
 *   - `stTeacherViewLink`: the label of the link on a `/st` page to the teacher view.
 *
 * Decisions that these rows pin (the PM may change them; each has a row of its own):
 *   - "No `next`" for a teacher means an absent, empty, or unsafe `next`, and also the fallback
 *     value `/<locale>/st`. The sign-in form always posts a `next` (the page fills it with the
 *     fallback), so the handler cannot tell "no next" from the fallback. A scan always names a
 *     week (`/st/<level>/<week>`), so the fallback value carries no wish of the visitor.
 *   - There is no `/st/<level>` page in the app (`/th/st/2` answers 404). The "level page" of the
 *     PM order is the `/<locale>/st` fallback page. It links to the teacher page of the first open
 *     week, the same page as the landing, and shows no link when no week is open.
 *   - The week page `/st/<level>/<week>` links to the teacher page of its own level and week.
 *   - While the teacher switch is off, a teacher lands on `/<locale>/st` and no `/st` page shows
 *     a teacher link.
 *
 * The fakes: the fake store, a cheap password check, a mocked content loader, and mocked
 * navigation. No network, no database, and no browser. The unit rows of `firstOpenWeek` use a
 * temporary content folder through `STORYTIME_CONTENT_DIR` and call the real module.
 *
 * Red state at the base: `firstOpenWeek` and the two message keys do not exist, and no page
 * holds the links. The characterization rows pass at the base on purpose (A4).
 */
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { NextRequest } from "next/server";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState, type FakeStore } from "./helpers/fake-store";
import week1 from "../content/l2/w01.json";

const nav = vi.hoisted(() => {
  const redirectCalls: string[] = [];
  return {
    redirectCalls,
    redirect(url: string) {
      redirectCalls.push(url);
      throw new Error(`REDIRECT:${url}`);
    },
    notFound() {
      throw new Error("NOT_FOUND");
    },
    reset() {
      redirectCalls.length = 0;
    },
  };
});

const cookiesState = vi.hoisted(() => {
  let jar: Record<string, string> = {};
  return {
    reset() {
      jar = {};
    },
    set(name: string, value: string) {
      jar[name] = value;
    },
    get(name: string) {
      return jar[name];
    },
    entries() {
      return Object.entries(jar);
    },
  };
});

const content = vi.hoisted(() => ({
  loadVisibleWeek: async (): Promise<unknown> => null,
  loadWeek: async (): Promise<unknown> => ({ kind: "absent" }),
  firstOpenWeek: async (): Promise<{ level: number; week: number } | null> => null,
  firstOpenCalls: 0,
}));

const media = vi.hoisted(() => ({
  async signWeekMedia(): Promise<Record<string, string>> {
    return {};
  },
}));

vi.mock("next/navigation", () => ({ redirect: nav.redirect, notFound: nav.notFound }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookiesState.get(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll: () => cookiesState.entries().map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => cookiesState.set(name, value),
    delete: (name: string) => cookiesState.set(name, ""),
  }),
  headers: async () => new Headers(),
}));
// The page labels come from the real message files, so a missing key shows as `MISSING:<key>`.
vi.mock("next-intl/server", async () => {
  const { readFileSync: read } = await import("node:fs");
  const { resolve: path } = await import("node:path");
  const table: Record<string, Record<string, string>> = {};
  for (const locale of ["th", "en"]) {
    table[locale] = JSON.parse(
      read(path(import.meta.dirname, "..", "messages", `${locale}.json`), "utf8"),
    ) as Record<string, string>;
  }
  return {
    getTranslations: async (arg?: { locale?: string }) => (key: string) =>
      table[arg?.locale ?? "th"]?.[key] ?? `MISSING:${key}`,
  };
});
vi.mock("../lib/content", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../lib/content");
  return {
    ...actual,
    loadVisibleWeek: () => content.loadVisibleWeek(),
    loadWeek: () => content.loadWeek(),
    firstOpenWeek: () => {
      content.firstOpenCalls += 1;
      return content.firstOpenWeek();
    },
  };
});
vi.mock("../lib/media/sign", () => ({ signWeekMedia: media.signWeekMedia }));
vi.mock("../lib/auth/store", async () => {
  const helper = await import("./helpers/fake-store");
  return { getStore: () => helper.fakeStoreState.current };
});
// A cheap password check: the stored hash `plain:<password>` matches the password. The Argon2id
// rules have their own tests; this file reads only the landing.
vi.mock("@reading-advantage/auth/password", () => ({
  hashPassword: async (password: string) => `plain:${password}`,
  verifyPassword: async (password: string, hash: string) => hash === `plain:${password}`,
}));

const APP = resolve(import.meta.dirname, "..");
const ORIGIN = "https://app.example";
const PASSWORD = "pw-r7";
const DAY_MS = 86_400_000;
const TOKEN = "R".repeat(43);
const LOCALES = ["th", "en"] as const;
/** The week that the mocked `firstOpenWeek` gives. It differs from the fixture week 2/1 on purpose. */
const FIRST_OPEN = { level: 2, week: 3 };
const LINK_KEYS = ["teacherChildViewLink", "stTeacherViewLink"] as const;

/** The message files, read once for the label rows. */
const MESSAGES = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(readFileSync(resolve(APP, "messages", `${locale}.json`), "utf8")) as Record<
      string,
      string
    >,
  ]),
) as Record<(typeof LOCALES)[number], Record<string, string>>;

/** The week fixture of the teacher and child pages. */
const week = JSON.parse(JSON.stringify(week1)) as typeof week1;

/** The labeled counts of the Red evidence (A3: labeled integers). */
const counts = { landingCases: 0, pageCases: 0, linkCases: 0, openWeekCases: 0 };

type Locale = (typeof LOCALES)[number];
type Role = "family" | "class" | "teacher";
const ACCOUNT_OF: Record<Role, string> = {
  family: "staff-01",
  class: "demo-class-01",
  teacher: "tutor-01",
};

/** Computes the pinned session digest of the token. */
function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Seeds one signed-in session for an account. */
function signInAs(store: FakeStore, username: string): void {
  const account = store.accounts.find((entry) => entry.username === username);
  if (!account) throw new Error(`unknown account ${username}`);
  const now = new Date("2026-11-14T00:00:00.000Z");
  store.sessions.push({
    tokenDigest: tokenDigest(TOKEN),
    accountId: account.id,
    expiresAt: new Date(now.getTime() + 365 * DAY_MS),
    lastUseAt: now,
    createdAt: now,
  });
  cookiesState.set("__Host-st_session", TOKEN);
}

type PageResult = { html: string } | { thrown: string };

/**
 * Renders one async page, or reports the sentinel that it threw.
 * @param page The page component.
 * @param props The page props.
 * @returns The static HTML or the thrown message.
 */
async function renderPage(
  page: (props: never) => Promise<unknown> | unknown,
  props: unknown,
): Promise<PageResult> {
  try {
    const element = await page(props as never);
    return { html: renderToStaticMarkup(element as ReactElement) };
  } catch (error) {
    return { thrown: (error as Error).message };
  }
}

/** One link of a page. */
interface PageLink {
  href: string;
  text: string;
}

/**
 * Decodes the entities that React writes into markup.
 * @param value The markup text.
 * @returns The plain text.
 */
function decode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Lists the links of a page.
 * @param html The static markup.
 * @returns Each `<a href>` with its decoded href and its text.
 */
function linksOf(html: string): PageLink[] {
  const links: PageLink[] = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const href = /\bhref="([^"]*)"/.exec(match[1] ?? "")?.[1];
    if (href === undefined) continue;
    links.push({
      href: decode(href),
      text: decode((match[2] ?? "").replace(/<[^>]*>/g, "")).trim(),
    });
  }
  return links;
}

/**
 * Reports whether a page holds any text of a teacher address.
 * @param html The static markup.
 * @returns `true` when a link points at `/teacher/` or the markup names that path.
 */
function holdsTeacherPath(html: string): boolean {
  return linksOf(html).some((link) => link.href.includes("/teacher/")) || html.includes('"/th/teacher/') || html.includes('"/en/teacher/');
}

const familyWeekPage = () => import("../app/[locale]/st/[level]/[week]/page.js").then((m) => m.default as (props: never) => Promise<unknown>);
const fallbackPage = () => import("../app/[locale]/st/page.js").then((m) => m.default as (props: never) => Promise<unknown>);
const signInPage = () => import("../app/[locale]/sign-in/page.js").then((m) => m.default as (props: never) => Promise<unknown>);
const teacherWeekPage = () => import("../app/[locale]/teacher/[level]/[week]/page.js").then((m) => m.default as (props: never) => Promise<unknown>);
const teacherDayPage = () => import("../app/[locale]/teacher/[level]/[week]/[day]/page.js").then((m) => m.default as (props: never) => Promise<unknown>);

/** Signs the account of one role in (a session cookie) and clears the redirect log. */
function startSession(role: Role): void {
  fakeStoreState.current.sessions.length = 0;
  signInAs(fakeStoreState.current, ACCOUNT_OF[role]);
  nav.reset();
}

/** Reads the path and query of a response Location header. */
function locationPath(response: Response): string | null {
  const value = response.headers.get("location");
  if (!value) return null;
  const url = new URL(value, ORIGIN);
  return `${url.pathname}${url.search}`;
}

/**
 * Posts one sign-in form to the handler.
 * @param role The account that signs in.
 * @param locale The locale field of the form.
 * @param next The `next` field, or `undefined` to leave the field out.
 * @param password The password of the form.
 * @returns The route response.
 */
async function postSignIn(
  role: Role,
  locale: Locale,
  next: string | undefined,
  password = PASSWORD,
): Promise<Response> {
  const route = (await import("../app/api/auth/sign-in/route.js")) as {
    POST(request: NextRequest): Promise<Response>;
  };
  const form = new URLSearchParams({ username: ACCOUNT_OF[role], password, locale });
  if (next !== undefined) form.set("next", next);
  return route.POST(
    new NextRequest(new URL(`${ORIGIN}/api/auth/sign-in`), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: ORIGIN,
        "x-forwarded-for": "203.0.113.9",
      },
      body: form.toString(),
    }),
  );
}

/** The teacher landing of a locale. */
const teacherLanding = (locale: Locale): string =>
  `/${locale}/teacher/${FIRST_OPEN.level}/${FIRST_OPEN.week}`;

const initialEnv = {
  teacher: process.env.STORYTIME_TEACHER_ROUTES,
  contentDir: process.env.STORYTIME_CONTENT_DIR,
  draftWeeks: process.env.STORYTIME_REVIEW_DRAFT_WEEKS,
  draftMedia: process.env.STORYTIME_SHOW_DRAFT_MEDIA,
};
let scratch: string | undefined;

beforeEach(() => {
  nav.reset();
  cookiesState.reset();
  content.firstOpenCalls = 0;
  process.env.STORYTIME_TEACHER_ROUTES = "1";
  delete process.env.STORYTIME_REVIEW_DRAFT_WEEKS;
  delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
  fakeStoreState.current = createFakeStore({
    accounts: (Object.keys(ACCOUNT_OF) as Role[]).map((role) => ({
      username: ACCOUNT_OF[role],
      passwordHash: `plain:${PASSWORD}`,
      role,
    })),
  });
  content.loadVisibleWeek = async () => week;
  content.loadWeek = async () => ({ kind: "ok", week });
  content.firstOpenWeek = async () => FIRST_OPEN;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  const restore = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  restore("STORYTIME_TEACHER_ROUTES", initialEnv.teacher);
  restore("STORYTIME_CONTENT_DIR", initialEnv.contentDir);
  restore("STORYTIME_REVIEW_DRAFT_WEEKS", initialEnv.draftWeeks);
  restore("STORYTIME_SHOW_DRAFT_MEDIA", initialEnv.draftMedia);
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  scratch = undefined;
  vi.restoreAllMocks();
});

afterAll(() => {
  console.log(`teacher_landing_cases=${counts.landingCases}`);
  console.log(`teacher_page_cases=${counts.pageCases}`);
  console.log(`teacher_link_cases=${counts.linkCases}`);
  console.log(`first_open_week_cases=${counts.openWeekCases}`);
});

describe("row 0: the helpers see what they should (positive control)", () => {
  it("linksOf finds a link with its text and ignores plain text that names a path", () => {
    const html =
      '<main><p>/th/teacher/2/1</p><a class="x" href="/th/teacher/2/3?a=1&amp;b=2"><span>Go</span> on</a><a>no href</a></main>';
    expect(linksOf(html)).toEqual([{ href: "/th/teacher/2/3?a=1&b=2", text: "Go on" }]);
    expect(holdsTeacherPath(html)).toBe(true);
    expect(holdsTeacherPath("<main><p>/th/teacher/2/1</p></main>")).toBe(false);
  });
});

describe("row 1a: the sign-in handler sends a teacher without a next to the first open week", () => {
  for (const locale of LOCALES) {
    const noNext: Array<[string, string | undefined]> = [
      ["absent next", undefined],
      ["empty next", ""],
      ["external next", "https://evil.example/x"],
      ["protocol-relative next", "//evil.example/x"],
      ["unknown section next", `/${locale}/admin/x`],
      ["teacher section without a slash", `/${locale}/teacher`],
      ["backslash next", `/${locale}/st/2/1\\x`],
      ["dot segment next", `/${locale}/st/../teacher/2/1/x`],
      ["the fallback value the form posts", `/${locale}/st`],
    ];
    for (const [label, next] of noNext) {
      it(`${locale}: a teacher with ${label} lands on the teacher week page`, async () => {
        const response = await postSignIn("teacher", locale, next);
        expect(response.status).toBe(303);
        expect(locationPath(response)).toBe(teacherLanding(locale));
        counts.landingCases += 1;
      });
    }
  }

  it("the teacher landing still sets the session cookie", async () => {
    const response = await postSignIn("teacher", "th", undefined);
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const cookies = headers.getSetCookie ? headers.getSetCookie() : [response.headers.get("set-cookie") ?? ""];
    expect(locationPath(response)).toBe(teacherLanding("th"));
    expect(cookies.some((line) => line.startsWith("__Host-st_session="))).toBe(true);
  });

  it("the form default of the sign-in page (what a stranger posts) lands a teacher on the week page", async () => {
    const page = await signInPage();
    const rendered = await renderPage(page, {
      params: Promise.resolve({ locale: "th" }),
      searchParams: Promise.resolve({}),
    });
    expect("html" in rendered, "a stranger sees the form").toBe(true);
    if (!("html" in rendered)) return;
    const input = /<input\b[^>]*name="next"[^>]*>/.exec(rendered.html)?.[0] ?? "";
    expect(input, "the form holds a hidden next field").not.toBe("");
    const posted = /\bvalue="([^"]*)"/.exec(input)?.[1];
    const response = await postSignIn("teacher", "th", posted === undefined ? undefined : decode(posted));
    expect(locationPath(response)).toBe(teacherLanding("th"));
    counts.landingCases += 1;
  });

  it("the sign-in of a teacher does not fail when the content read throws", async () => {
    content.firstOpenWeek = async () => {
      throw new Error("content folder unreadable");
    };
    const response = await postSignIn("teacher", "th", undefined);
    expect(response.status).toBe(303);
    expect(locationPath(response)).toBe("/th/st");
    const set = response.headers.get("set-cookie") ?? "";
    expect(set).toContain("__Host-st_session=");
  });

  it("a teacher lands on /st when no week is open", async () => {
    content.firstOpenWeek = async () => null;
    const response = await postSignIn("teacher", "th", undefined);
    expect(locationPath(response)).toBe("/th/st");
    counts.landingCases += 1;
  });
});

describe("row 1b: a teacher with a safe next still goes to that next", () => {
  const safe: Array<[Locale, string]> = [
    ["th", "/th/st/2/1"],
    ["th", "/th/st/2/1?part=song"],
    ["th", "/th/teacher/2/4/2"],
    ["th", "/th/teacher/2/1"],
    ["en", "/en/st/2/5"],
    ["en", "/en/teacher/2/2"],
  ];
  for (const [locale, next] of safe) {
    it(`${locale}: next ${next} is kept`, async () => {
      const response = await postSignIn("teacher", locale, next);
      expect(locationPath(response)).toBe(next);
      counts.landingCases += 1;
    });
  }
});

describe("row 1c: a family or class account keeps its landing (characterization)", () => {
  for (const role of ["family", "class"] as const) {
    for (const locale of LOCALES) {
      const noNext: Array<[string, string | undefined]> = [
        ["absent next", undefined],
        ["empty next", ""],
        ["external next", "https://evil.example/x"],
        ["the fallback value", `/${locale}/st`],
      ];
      for (const [label, next] of noNext) {
        it(`${role} ${locale}: ${label} lands on /${locale}/st`, async () => {
          const response = await postSignIn(role, locale, next);
          expect(response.status).toBe(303);
          expect(locationPath(response)).toBe(`/${locale}/st`);
          counts.landingCases += 1;
        });
      }
      it(`${role} ${locale}: a safe next is kept`, async () => {
        const next = `/${locale}/st/2/1`;
        const response = await postSignIn(role, locale, next);
        expect(locationPath(response)).toBe(next);
      });
    }
    it(`${role}: a teacher next is kept in the handler (the page answers 403; current behavior)`, async () => {
      const response = await postSignIn(role, "th", "/th/teacher/2/1");
      expect(locationPath(response)).toBe("/th/teacher/2/1");
    });
    it(`${role}: the content is read for no landing (a family or class sign-in never needs it)`, async () => {
      await postSignIn(role, "th", undefined);
      expect(content.firstOpenCalls).toBe(0);
    });
  }

  it("a wrong password keeps the invalid redirect and the next of the form", async () => {
    const response = await postSignIn("teacher", "th", undefined, "wrong");
    expect(response.status).toBe(303);
    expect(locationPath(response)).toBe("/th/sign-in?error=invalid&next=%2Fth%2Fst");
    expect(response.headers.get("set-cookie") ?? "").not.toContain("__Host-st_session=");
  });
});

describe("row 1d: the teacher switch off keeps the /st landing", () => {
  it("a teacher without a next lands on /st while the switch is off", async () => {
    delete process.env.STORYTIME_TEACHER_ROUTES;
    for (const locale of LOCALES) {
      fakeStoreState.current = createFakeStore({
        accounts: [{ username: ACCOUNT_OF.teacher, passwordHash: `plain:${PASSWORD}`, role: "teacher" }],
      });
      const response = await postSignIn("teacher", locale, undefined);
      expect(locationPath(response)).toBe(`/${locale}/st`);
    }
    counts.landingCases += 2;
  });

  it("the switch value 0 or true is off as well, and a safe next is kept", async () => {
    for (const value of ["0", "true", ""]) {
      process.env.STORYTIME_TEACHER_ROUTES = value;
      fakeStoreState.current = createFakeStore({
        accounts: [{ username: ACCOUNT_OF.teacher, passwordHash: `plain:${PASSWORD}`, role: "teacher" }],
      });
      expect(locationPath(await postSignIn("teacher", "th", undefined))).toBe("/th/st");
    }
    delete process.env.STORYTIME_TEACHER_ROUTES;
    fakeStoreState.current = createFakeStore({
      accounts: [{ username: ACCOUNT_OF.teacher, passwordHash: `plain:${PASSWORD}`, role: "teacher" }],
    });
    expect(locationPath(await postSignIn("teacher", "th", "/th/st/2/1"))).toBe("/th/st/2/1");
  });
});

describe("row 1e: a signed-in teacher on the sign-in page goes to the same landing", () => {
  const props = (locale: Locale, next?: string) => ({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(next === undefined ? {} : { next }),
  });
  for (const locale of LOCALES) {
    for (const [label, next] of [
      ["no next", undefined],
      ["an unsafe next", "https://evil.example/x"],
      ["the fallback value", `/${locale}/st`],
    ] as Array<[string, string | undefined]>) {
      it(`${locale}: a teacher session with ${label} redirects to the teacher week page`, async () => {
        const page = await signInPage();
        startSession("teacher");
        const result = await renderPage(page, props(locale, next));
        expect(result).toEqual({ thrown: `REDIRECT:${teacherLanding(locale)}` });
        counts.pageCases += 1;
      });
    }
    it(`${locale}: a family session with no next redirects to /${locale}/st (characterization)`, async () => {
      const page = await signInPage();
      startSession("family");
      expect(await renderPage(page, props(locale))).toEqual({ thrown: `REDIRECT:/${locale}/st` });
    });
  }
  it("a teacher session keeps a safe next", async () => {
    const page = await signInPage();
    startSession("teacher");
    expect(await renderPage(page, props("th", "/th/st/2/1"))).toEqual({
      thrown: "REDIRECT:/th/st/2/1",
    });
  });
  it("a class session with no next redirects to /th/st (characterization)", async () => {
    const page = await signInPage();
    startSession("class");
    expect(await renderPage(page, props("th"))).toEqual({ thrown: "REDIRECT:/th/st" });
  });
  it("the switch off sends a teacher session to /th/st", async () => {
    delete process.env.STORYTIME_TEACHER_ROUTES;
    const page = await signInPage();
    startSession("teacher");
    expect(await renderPage(page, props("th"))).toEqual({ thrown: "REDIRECT:/th/st" });
  });
  it("a teacher session with no open week goes to /th/st", async () => {
    content.firstOpenWeek = async () => null;
    const page = await signInPage();
    startSession("teacher");
    expect(await renderPage(page, props("th"))).toEqual({ thrown: "REDIRECT:/th/st" });
  });
  it("a stranger still sees the form", async () => {
    const page = await signInPage();
    const result = await renderPage(page, props("th"));
    expect("html" in result).toBe(true);
  });
});

describe("row 2: the teacher pages link to the child pages of the same week", () => {
  it("both message files hold the two link labels, in Thai and in English", () => {
    for (const key of LINK_KEYS) {
      for (const locale of LOCALES) {
        const text = MESSAGES[locale][key];
        expect(typeof text, `${locale}.json holds ${key}`).toBe("string");
        expect((text ?? "").trim().length, `${locale}.json ${key} is not empty`).toBeGreaterThan(0);
      }
      expect(MESSAGES.th[key] ?? "", `th ${key} has Thai script`).toMatch(/[฀-๿]/);
      expect(MESSAGES.en[key] ?? "", `en ${key} has no Thai script`).not.toMatch(/[฀-๿]/);
      expect(MESSAGES.en[key]).not.toBe(MESSAGES.th[key]);
    }
    expect(MESSAGES.en.teacherChildViewLink).not.toBe(MESSAGES.en.stTeacherViewLink);
  });

  for (const locale of LOCALES) {
    it(`${locale}: the teacher week page holds the link to /${locale}/st/2/1`, async () => {
      const page = await teacherWeekPage();
      startSession("teacher");
      const result = await renderPage(page, {
        params: Promise.resolve({ locale, level: "2", week: "1" }),
      });
      expect("html" in result, "a teacher session renders the week").toBe(true);
      if (!("html" in result)) return;
      const links = linksOf(result.html).filter((link) => link.href === `/${locale}/st/2/1`);
      expect(links.length, "one link to the child page of the week").toBeGreaterThanOrEqual(1);
      expect(links[0]?.text).toBe(MESSAGES[locale].teacherChildViewLink);
      counts.linkCases += 1;
    });

    for (const day of [1, 2, 3, 4, 5]) {
      // Round 10 (PM 2026-11-14): the day page button opens that day's child lesson, so its
      // address is the week address with `?day=<day>` (row of `p6-r10-child-day-link.test.tsx`).
      it(`${locale}: the teacher day page ${day} holds the link to /${locale}/st/2/1?day=${day}`, async () => {
        const page = await teacherDayPage();
        startSession("teacher");
        const result = await renderPage(page, {
          params: Promise.resolve({ locale, level: "2", week: "1", day: String(day) }),
        });
        expect("html" in result, "a teacher session renders the day").toBe(true);
        if (!("html" in result)) return;
        const links = linksOf(result.html).filter((link) => link.href === `/${locale}/st/2/1?day=${day}`);
        expect(links.length, "one link to the child page of that day").toBeGreaterThanOrEqual(1);
        expect(links[0]?.text).toBe(MESSAGES[locale].teacherChildViewLink);
        counts.linkCases += 1;
      });
    }
  }

  it("the teacher pages still answer 404 while the switch is off (characterization)", async () => {
    delete process.env.STORYTIME_TEACHER_ROUTES;
    startSession("teacher");
    const weekPage = await teacherWeekPage();
    const dayPage = await teacherDayPage();
    for (const locale of LOCALES) {
      const weekResult = await renderPage(weekPage, {
        params: Promise.resolve({ locale, level: "2", week: "1" }),
      });
      expect(weekResult).toEqual({ thrown: "NOT_FOUND" });
      const dayResult = await renderPage(dayPage, {
        params: Promise.resolve({ locale, level: "2", week: "1", day: "1" }),
      });
      expect(dayResult).toEqual({ thrown: "NOT_FOUND" });
    }
  });
});

describe("row 3: the /st pages show a teacher the link to the teacher view", () => {
  const weekProps = (locale: Locale, search: Record<string, string> = {}) => ({
    params: Promise.resolve({ locale, level: "2", week: "1" }),
    searchParams: Promise.resolve(search),
  });
  const fallbackProps = (locale: Locale) => ({ params: Promise.resolve({ locale }) });

  for (const locale of LOCALES) {
    it(`${locale}: the /st page links a teacher to the teacher page of the first open week`, async () => {
      const page = await fallbackPage();
      startSession("teacher");
      const result = await renderPage(page, fallbackProps(locale));
      expect("html" in result, "a teacher session renders the /st page").toBe(true);
      if (!("html" in result)) return;
      const links = linksOf(result.html).filter((link) => link.href === teacherLanding(locale));
      expect(links.length, "one link to the first open week").toBe(1);
      expect(links[0]?.text).toBe(MESSAGES[locale].stTeacherViewLink);
      counts.linkCases += 1;
    });

    it(`${locale}: the week page links a teacher to the teacher page of its own week`, async () => {
      const page = await familyWeekPage();
      startSession("teacher");
      const result = await renderPage(page, weekProps(locale));
      expect("html" in result, "a teacher session renders the week page").toBe(true);
      if (!("html" in result)) return;
      const links = linksOf(result.html).filter((link) => link.href === `/${locale}/teacher/2/1`);
      expect(links.length, "one link to the teacher week of the same week").toBe(1);
      expect(links[0]?.text).toBe(MESSAGES[locale].stTeacherViewLink);
      counts.linkCases += 1;
    });
  }

  it("the /st page shows no link to a teacher when no week is open (no dead link)", async () => {
    content.firstOpenWeek = async () => null;
    const page = await fallbackPage();
    startSession("teacher");
    const result = await renderPage(page, fallbackProps("th"));
    expect("html" in result).toBe(true);
    if ("html" in result) expect(holdsTeacherPath(result.html)).toBe(false);
  });

  it("the /st page shows no link to a teacher when the content read throws", async () => {
    content.firstOpenWeek = async () => {
      throw new Error("content folder unreadable");
    };
    const page = await fallbackPage();
    startSession("teacher");
    const result = await renderPage(page, fallbackProps("th"));
    expect("html" in result, "the page still renders").toBe(true);
    if ("html" in result) expect(holdsTeacherPath(result.html)).toBe(false);
  });

  for (const role of ["family", "class"] as const) {
    for (const locale of LOCALES) {
      it(`${role} ${locale}: the /st pages show no teacher link (the teacher control shows one)`, async () => {
        const fallback = await fallbackPage();
        const weekPage = await familyWeekPage();
        // Positive control: the same two pages, rendered for a teacher, hold the link.
        startSession("teacher");
        const control = await renderPage(fallback, fallbackProps(locale));
        expect("html" in control && holdsTeacherPath(control.html), "the control finds the link").toBe(true);
        const controlWeek = await renderPage(weekPage, weekProps(locale));
        expect("html" in controlWeek && holdsTeacherPath(controlWeek.html), "the week control finds the link").toBe(true);

        startSession(role);
        const fallbackResult = await renderPage(fallback, fallbackProps(locale));
        expect("html" in fallbackResult, `${role} renders the /st page`).toBe(true);
        if ("html" in fallbackResult) {
          expect(holdsTeacherPath(fallbackResult.html)).toBe(false);
          expect(fallbackResult.html).not.toContain(MESSAGES[locale].stTeacherViewLink ?? "\u0000");
        }
        for (const search of [{}, { part: "book" }, { part: "decodable" }, { part: "song" }] as Array<Record<string, string>>) {
          const weekResult = await renderPage(weekPage, weekProps(locale, search));
          expect("html" in weekResult, `${role} renders the week page ${JSON.stringify(search)}`).toBe(true);
          if ("html" in weekResult) {
            expect(holdsTeacherPath(weekResult.html), `${role} ${JSON.stringify(search)}`).toBe(false);
            expect(weekResult.html).not.toContain(MESSAGES[locale].stTeacherViewLink ?? "\u0000");
          }
        }
        counts.linkCases += 1;
      });
    }
  }
});

describe("row 4: the teacher switch off shows no teacher link on any page", () => {
  for (const locale of LOCALES) {
    it(`${locale}: a teacher session sees no teacher link on the /st pages while the switch is off`, async () => {
      const fallback = await fallbackPage();
      const weekPage = await familyWeekPage();
      // Positive control with the switch on.
      startSession("teacher");
      const on = await renderPage(fallback, { params: Promise.resolve({ locale }) });
      expect("html" in on && holdsTeacherPath(on.html), "the control finds the link with the switch on").toBe(true);

      delete process.env.STORYTIME_TEACHER_ROUTES;
      const off = await renderPage(fallback, { params: Promise.resolve({ locale }) });
      expect("html" in off, "the /st page renders").toBe(true);
      if ("html" in off) expect(holdsTeacherPath(off.html)).toBe(false);
      const offWeek = await renderPage(weekPage, {
        params: Promise.resolve({ locale, level: "2", week: "1" }),
        searchParams: Promise.resolve({}),
      });
      expect("html" in offWeek, "the week page renders").toBe(true);
      if ("html" in offWeek) expect(holdsTeacherPath(offWeek.html)).toBe(false);
      counts.linkCases += 1;
    });
  }
});

describe("row 5: firstOpenWeek gives the lowest open week of the lowest open level", () => {
  type FirstOpen = () => Promise<{ level: number; week: number } | null>;
  /** A week file as loose JSON, for the fixtures. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Json = Record<string, any>;

  /** Calls the real `firstOpenWeek` of lib/content.ts, or fails on the missing export. */
  async function openWeek(): Promise<{ level: number; week: number } | null> {
    const actual = await vi.importActual<{ firstOpenWeek?: FirstOpen }>("../lib/content");
    expect(typeof actual.firstOpenWeek, "apps/storytime/lib/content.ts exports firstOpenWeek").toBe("function");
    counts.openWeekCases += 1;
    return (actual.firstOpenWeek as FirstOpen)();
  }

  /** Writes one week of the scratch folder, cloned from the shipped ready week. */
  function writeWeek(level: number, number: number, change?: (value: Json) => void): void {
    const clone = JSON.parse(JSON.stringify(week1)) as Json;
    clone.meta.level = level;
    clone.meta.week = number;
    clone.meta.key = `st${level}/${number}`;
    clone.meta.status = "published";
    change?.(clone);
    mkdirSync(join(scratch as string, `l${level}`), { recursive: true });
    writeFileSync(
      join(scratch as string, `l${level}`, `w${String(number).padStart(2, "0")}.json`),
      JSON.stringify(clone),
    );
  }

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), "st-first-open-"));
    process.env.STORYTIME_CONTENT_DIR = scratch;
  });

  const draft = (value: Json) => {
    value.meta.status = "draft";
  };

  it("gives week 1 of level 2 for the shipped content folder", async () => {
    process.env.STORYTIME_CONTENT_DIR = resolve(APP, "content");
    expect(await openWeek()).toEqual({ level: 2, week: 1 });
  });

  it("skips a draft week and gives the next ready week of the level", async () => {
    writeWeek(2, 1, draft);
    writeWeek(2, 2);
    writeWeek(3, 1);
    expect(await openWeek()).toEqual({ level: 2, week: 2 });
  });

  it("gives the lowest week, not the highest, and not the file name order of a larger number", async () => {
    writeWeek(2, 10);
    writeWeek(2, 3);
    writeWeek(2, 7);
    expect(await openWeek()).toEqual({ level: 2, week: 3 });
  });

  it("gives the lowest level that holds an open week", async () => {
    writeWeek(3, 1);
    writeWeek(2, 5);
    writeWeek(4, 1);
    expect(await openWeek()).toEqual({ level: 2, week: 5 });
  });

  it("moves to the next level when the lower level holds no open week", async () => {
    writeWeek(2, 1, draft);
    writeWeek(2, 2, draft);
    writeWeek(3, 4);
    writeWeek(3, 2, draft);
    expect(await openWeek()).toEqual({ level: 3, week: 4 });
  });

  it("skips a published week with a page picture that has no file", async () => {
    writeWeek(2, 1, (value) => {
      delete value.books[0].pages[0].image.file;
    });
    writeWeek(2, 2);
    expect(await openWeek()).toEqual({ level: 2, week: 2 });
  });

  it("skips a week whose media is not approved, until the draft media switch is on", async () => {
    const unapproved = (value: Json) => {
      value.approval.audio = { status: "draft" };
    };
    writeWeek(2, 1, unapproved);
    writeWeek(2, 2);
    expect(await openWeek()).toEqual({ level: 2, week: 2 });
    process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
    expect(await openWeek()).toEqual({ level: 2, week: 1 });
  });

  it("opens a draft week when the review switch is on, by the published-week rules", async () => {
    writeWeek(2, 1, draft);
    writeWeek(2, 2);
    process.env.STORYTIME_REVIEW_DRAFT_WEEKS = "1";
    expect(await openWeek()).toEqual({ level: 2, week: 1 });
    // A draft week with a missing picture still blocks under the switch.
    writeWeek(2, 1, (value) => {
      draft(value);
      delete value.books[0].pages[0].image.file;
    });
    expect(await openWeek()).toEqual({ level: 2, week: 2 });
  });

  it("skips a file that holds no JSON, and does not throw", async () => {
    mkdirSync(join(scratch as string, "l2"), { recursive: true });
    writeFileSync(join(scratch as string, "l2", "w01.json"), "{not json");
    writeWeek(2, 2);
    expect(await openWeek()).toEqual({ level: 2, week: 2 });
  });

  it("gives null when no week is open, when the folder is empty, and when the folder is absent", async () => {
    writeWeek(2, 1, draft);
    writeWeek(3, 1, draft);
    expect(await openWeek()).toBeNull();
    rmSync(scratch as string, { recursive: true, force: true });
    mkdirSync(scratch as string, { recursive: true });
    expect(await openWeek()).toBeNull();
    process.env.STORYTIME_CONTENT_DIR = join(scratch as string, "does-not-exist");
    expect(await openWeek()).toBeNull();
  });

  it("writes no log, because the sign-in and the /st pages call it on every visit", async () => {
    writeWeek(2, 1, draft);
    writeWeek(2, 2);
    const warn = vi.spyOn(console, "warn");
    warn.mockClear();
    const log = vi.spyOn(console, "log");
    const info = vi.spyOn(console, "info");
    expect(await openWeek()).toEqual({ level: 2, week: 2 });
    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });
});
