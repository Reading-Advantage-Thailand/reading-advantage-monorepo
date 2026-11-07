/**
 * The page guard and the role matrix (AC-4.1, AC-4.6, test strategy P2b.7, task 2b.2).
 *
 * Page guard order: no session redirects to sign-in; the teacher flag off answers 404 for every
 * session; a wrong role gets the 403 page; then the week loads. The role comes from the store at
 * request time, so a role change between two requests is obeyed. A page with no session signs no
 * media URL.
 *
 * At the base the first assertion fails on `Missing apps/storytime/lib/auth/index.ts`. The pages
 * are loaded only after that assertion, so no case fails with a load error.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState, type FakeStore } from "./helpers/fake-store";
import week1 from "../content/l2/w01.json";

const nav = vi.hoisted(() => {
  let notFoundCalls = 0;
  const redirectCalls: string[] = [];
  return {
    redirectCalls,
    redirect(url: string) {
      redirectCalls.push(url);
      throw new Error(`REDIRECT:${url}`);
    },
    notFound() {
      notFoundCalls += 1;
      throw new Error("NOT_FOUND");
    },
    reset() {
      redirectCalls.length = 0;
      notFoundCalls = 0;
    },
    get notFoundCalls() {
      return notFoundCalls;
    },
  };
});

const cookiesState = vi.hoisted(() => {
  let jar: Record<string, string> = {};
  let setCalls = 0;
  return {
    reset() {
      jar = {};
      setCalls = 0;
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
    bumpSet() {
      setCalls += 1;
    },
    get setCalls() {
      return setCalls;
    },
  };
});

const content = vi.hoisted(() => ({
  loadVisibleWeek: async (): Promise<unknown> => null,
  loadWeek: async (): Promise<unknown> => ({ kind: "absent" }),
}));

const media = vi.hoisted(() => ({
  calls: [] as unknown[],
  async signWeekMedia(...args: unknown[]): Promise<Record<string, string>> {
    media.calls.push(args);
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
    set: (name: string, value: string) => {
      cookiesState.bumpSet();
      cookiesState.set(name, value);
    },
    delete: (name: string) => {
      cookiesState.set(name, "");
    },
  }),
  headers: async () => new Headers(),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async (arg?: { locale?: string }) => (key: string) =>
    `${arg?.locale ?? "th"}:${key}`,
}));
vi.mock("../lib/content", () => ({
  loadVisibleWeek: content.loadVisibleWeek,
  loadWeek: content.loadWeek,
}));
vi.mock("../lib/media/sign", () => ({ signWeekMedia: media.signWeekMedia }));
vi.mock("../lib/auth/store", async () => {
  const helper = await import("./helpers/fake-store");
  return { getStore: () => helper.fakeStoreState.current };
});

const APP = resolve(import.meta.dirname, "..");
const AUTH_ENTRY = resolve(APP, "lib/auth/index.ts");
const MISSING = "Missing apps/storytime/lib/auth/index.ts";
const DAY_MS = 86_400_000;
const TOKEN = "A".repeat(43);

/** The week fixture of one test. */
const week = JSON.parse(JSON.stringify(week1)) as {
  meta: { title?: string };
  focus: { element?: string; paSkill?: string; family?: unknown };
};

/** The distinctive strings of the teacher week view. */
function teacherStrings(): string[] {
  const family = week.focus.family;
  const values: string[] = [];
  if (week.focus.element) values.push(week.focus.element);
  if (week.focus.paSkill) values.push(week.focus.paSkill);
  if (Array.isArray(family)) {
    for (const entry of family) if (typeof entry === "string") values.push(entry);
  }
  return values;
}

/** Computes the pinned session digest of the token. */
function tokenDigest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Seeds one signed-in session for an account and returns its token. */
function signInAs(store: FakeStore, username: string): string {
  const account = store.accounts.find((entry) => entry.username === username);
  if (!account) throw new Error(`unknown account ${username}`);
  const now = new Date("2026-11-07T00:00:00.000Z");
  store.sessions.push({
    tokenDigest: tokenDigest(TOKEN),
    accountId: account.id,
    expiresAt: new Date(now.getTime() + 365 * DAY_MS),
    lastUseAt: now,
    createdAt: now,
  });
  cookiesState.set("__Host-st_session", TOKEN);
  return TOKEN;
}

type PageResult = { html: string } | { thrown: string };

/**
 * Renders one async page or reports the sentinel that it threw.
 * @param page The page component.
 * @param props The page props.
 * @returns The static HTML or the thrown sentinel.
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

/** Loads the family week page. */
async function familyWeekPage() {
  const mod = (await import("../app/[locale]/st/[level]/[week]/page.js")) as {
    default: (props: never) => Promise<unknown>;
  };
  return mod.default;
}

/** Loads the teacher week page. */
async function teacherWeekPage() {
  const mod = (await import("../app/[locale]/teacher/[level]/[week]/page.js")) as {
    default: (props: never) => Promise<unknown>;
  };
  return mod.default;
}

/** Loads the return fallback page. */
async function fallbackPage() {
  const mod = (await import("../app/[locale]/st/page.js")) as {
    default: (props: never) => Promise<unknown>;
  };
  return mod.default;
}

/** Loads the sign-in page. */
async function signInPage() {
  const mod = (await import("../app/[locale]/sign-in/page.js")) as {
    default: (props: never) => Promise<unknown>;
  };
  return mod.default;
}

beforeEach(() => {
  nav.reset();
  cookiesState.reset();
  media.calls.length = 0;
  process.env.STORYTIME_TEACHER_ROUTES = "1";
  fakeStoreState.current = createFakeStore({
    accounts: [
      { username: "staff-01", passwordHash: "$argon2id$test", role: "family" },
      { username: "demo-class-01", passwordHash: "$argon2id$test", role: "class" },
      { username: "tutor-01", passwordHash: "$argon2id$test", role: "teacher" },
    ],
  });
  content.loadVisibleWeek = async () => week;
  content.loadWeek = async () => ({ kind: "ok", week });
});

afterEach(() => {
  delete process.env.STORYTIME_TEACHER_ROUTES;
});

describe("login page guard (red)", () => {
  it("redirects a family week request with no session and renders it for a family session", async () => {
    expect(existsSync(AUTH_ENTRY), MISSING).toBe(true);
    const page = await familyWeekPage();
    const stranger = await renderPage(page, {
      params: Promise.resolve({ locale: "th", level: "2", week: "1" }),
      searchParams: Promise.resolve({}),
    });
    expect("thrown" in stranger, "the stranger is redirected").toBe(true);
    if ("thrown" in stranger) {
      expect(stranger.thrown, "the redirect names the sign-in page").toContain("/th/sign-in");
      expect(stranger.thrown).toContain("next=");
    }
    expect(media.calls, "a stranger signs no media").toHaveLength(0);

    signInAs(fakeStoreState.current, "staff-01");
    nav.reset();
    const signedIn = await renderPage(page, {
      params: Promise.resolve({ locale: "th", level: "2", week: "1" }),
      searchParams: Promise.resolve({}),
    });
    expect("html" in signedIn, "a family session renders the week").toBe(true);
    if ("html" in signedIn) expect(signedIn.html.length).toBeGreaterThan(0);
  });

  it("gives family and class sessions the 403 page on teacher routes and teacher a page", async () => {
    expect(existsSync(AUTH_ENTRY), MISSING).toBe(true);
    const page = await teacherWeekPage();
    const props = {
      params: Promise.resolve({ locale: "th", level: "2", week: "1" }),
    };
    const strings = teacherStrings();
    expect(strings.length, "the teacher strings are not empty").toBeGreaterThan(0);

    for (const username of ["staff-01", "demo-class-01"]) {
      fakeStoreState.current = createFakeStore({
        accounts: [{ username, passwordHash: "$argon2id$test", role: username === "staff-01" ? "family" : "class" }],
      });
      signInAs(fakeStoreState.current, username);
      nav.reset();
      const forbidden = await renderPage(page, props);
      expect("html" in forbidden, `${username} gets a page, not a redirect`).toBe(true);
      if ("html" in forbidden) {
        expect(forbidden.html, `${username} gets the teacher sign-in link`).toContain(
          "/th/sign-in?next=",
        );
        for (const value of strings) {
          expect(forbidden.html, `${username} leaks no teacher text`).not.toContain(value);
        }
      }
    }

    fakeStoreState.current = createFakeStore({
      accounts: [{ username: "tutor-01", passwordHash: "$argon2id$test", role: "teacher" }],
    });
    signInAs(fakeStoreState.current, "tutor-01");
    const allowed = await renderPage(page, props);
    expect("html" in allowed, "a teacher session renders the teacher week").toBe(true);
    if ("html" in allowed) {
      const found = strings.some((value) => allowed.html.includes(value));
      console.log(`teacher_text_positive_control=${found ? 1 : 0}`);
      expect(found, "the positive control finds the teacher text").toBe(true);
    }

    const familyPage = await familyWeekPage();
    const teacherOnFamily = await renderPage(familyPage, {
      params: Promise.resolve({ locale: "th", level: "2", week: "1" }),
      searchParams: Promise.resolve({}),
    });
    expect("html" in teacherOnFamily, "a teacher session opens the family routes").toBe(true);
  });

  it("reads the role from the store on every request", async () => {
    expect(existsSync(AUTH_ENTRY), MISSING).toBe(true);
    const page = await teacherWeekPage();
    const props = { params: Promise.resolve({ locale: "th", level: "2", week: "1" }) };
    const account = fakeStoreState.current.accounts.find(
      (entry) => entry.username === "tutor-01",
    );
    expect(account).toBeDefined();
    signInAs(fakeStoreState.current, "tutor-01");
    const first = await renderPage(page, props);
    expect("html" in first, "the first request obeys the teacher role").toBe(true);
    nav.reset();
    if (account) account.role = "family";
    const second = await renderPage(page, props);
    expect("html" in second, "the second request follows the changed role").toBe(true);
    if ("html" in second) {
      expect(second.html, "the changed family role gets the 403 link").toContain(
        "/th/sign-in?next=",
      );
    }
  });

  it("renders the fallback page for a session and redirects a stranger", async () => {
    expect(existsSync(AUTH_ENTRY), MISSING).toBe(true);
    expect(existsSync(resolve(APP, "app/[locale]/st/page.tsx")), "Missing app/[locale]/st/page.tsx").toBe(
      true,
    );
    const page = await fallbackPage();
    const props = { params: Promise.resolve({ locale: "th" }) };
    const stranger = await renderPage(page, props);
    expect("thrown" in stranger, "a stranger is redirected").toBe(true);
    if ("thrown" in stranger) expect(stranger.thrown).toContain("/th/sign-in");
    signInAs(fakeStoreState.current, "staff-01");
    const signedIn = await renderPage(page, props);
    expect("html" in signedIn, "a signed-in family sees the fallback").toBe(true);
    if ("html" in signedIn) expect(signedIn.html.length).toBeGreaterThan(0);
  });

  it("answers 404 on the teacher routes when the flag is off", async () => {
    expect(existsSync(AUTH_ENTRY), MISSING).toBe(true);
    delete process.env.STORYTIME_TEACHER_ROUTES;
    const page = await teacherWeekPage();
    for (const username of ["staff-01", "tutor-01"]) {
      fakeStoreState.current = createFakeStore({
        accounts: [{ username, passwordHash: "$argon2id$test", role: username === "tutor-01" ? "teacher" : "family" }],
      });
      signInAs(fakeStoreState.current, username);
      nav.reset();
      const result = await renderPage(page, {
        params: Promise.resolve({ locale: "th", level: "2", week: "1" }),
      });
      expect("thrown" in result, `${username} gets 404`).toBe(true);
      if ("thrown" in result) expect(result.thrown).toContain("NOT_FOUND");
    }
  });

  it("redirects the sign-in GET only for a session that may open the next path", async () => {
    expect(existsSync(AUTH_ENTRY), MISSING).toBe(true);
    const page = await signInPage();
    const props = {
      params: Promise.resolve({ locale: "th" }),
      searchParams: Promise.resolve({ next: "/th/teacher/2/1" }),
    };
    const stranger = await renderPage(page, props);
    expect("html" in stranger, "a stranger sees the form").toBe(true);

    fakeStoreState.current = createFakeStore({
      accounts: [{ username: "staff-01", passwordHash: "$argon2id$test", role: "family" }],
    });
    signInAs(fakeStoreState.current, "staff-01");
    nav.reset();
    const family = await renderPage(page, props);
    expect("html" in family, "a family session sees the form for a teacher next").toBe(true);
    expect(nav.redirectCalls.length, "no redirect loop").toBeLessThanOrEqual(2);

    fakeStoreState.current = createFakeStore({
      accounts: [{ username: "tutor-01", passwordHash: "$argon2id$test", role: "teacher" }],
    });
    signInAs(fakeStoreState.current, "tutor-01");
    nav.reset();
    const teacher = await renderPage(page, props);
    console.log(`redirect_hops=${nav.redirectCalls.length}`);
    expect(nav.redirectCalls.length, "the teacher redirects at most twice").toBeLessThanOrEqual(2);
    if ("thrown" in teacher) expect(teacher.thrown).toContain("/th/teacher/2/1");
    else expect(teacher.html.length).toBeGreaterThan(0);
  });
});
