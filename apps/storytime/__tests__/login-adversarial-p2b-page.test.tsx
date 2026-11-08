/**
 * Adversarial session and role cases at the page layer (test strategy P2b.9 rows 3, 5, and 10).
 *
 * The existing page-guard file seeds a valid session and checks the stranger and the role matrix.
 * This file attacks the session itself: an expired row, a disabled account, a deleted account, a
 * forged cookie, the stored digest used as the cookie, an 8 KB cookie, and a cookie with a `;`.
 * Every one of them must redirect to the sign-in page and must sign no media URL. It then attacks
 * the teacher day route, which holds its own role check.
 *
 * A valid session renders the week, so the harness can see content (positive control). The counts
 * are `page_session_cases`, `page_leaks`, `media_signed_for_bad_session`, `teacher_day_403`,
 * `teacher_day_leaks`.
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
    set: (name: string, value: string) => cookiesState.set(name, value),
    delete: (name: string) => cookiesState.set(name, ""),
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
const DAY_MS = 86_400_000;
const TOKEN = "A".repeat(43);

/** The week fixture of one test. */
const week = JSON.parse(JSON.stringify(week1)) as {
  scripts?: Array<{ day: number; title: { en?: string; th?: string } }>;
};

/** Computes the stored digest of a cookie value. */
function tokenDigest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Seeds one account and one session.
 * @param options The session and account state to seed.
 */
function seedSession(options: {
  role?: "family" | "class" | "teacher";
  disabled?: boolean;
  expiresInMs?: number;
  accountPresent?: boolean;
  cookieValue?: string;
  rowPresent?: boolean;
}): FakeStore {
  const role = options.role ?? "family";
  const store = createFakeStore({
    accounts: [{ username: "staff-01", passwordHash: "$argon2id$test", role, disabled: options.disabled }],
  });
  if (options.accountPresent === false) store.accounts.length = 0;
  if (options.rowPresent !== false) {
    store.sessions.push({
      tokenDigest: tokenDigest(TOKEN),
      accountId: "account-1",
      expiresAt: new Date(Date.now() + (options.expiresInMs ?? 365 * DAY_MS)),
      lastUseAt: new Date(),
      createdAt: new Date(),
    });
  }
  fakeStoreState.current = store;
  cookiesState.set("__Host-st_session", options.cookieValue ?? TOKEN);
  return store;
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
async function familyWeekPage(): Promise<(props: never) => Promise<unknown>> {
  const mod = (await import("../app/[locale]/st/[level]/[week]/page.js")) as {
    default: (props: never) => Promise<unknown>;
  };
  return mod.default;
}

/** Loads the teacher day page. */
async function teacherDayPage(): Promise<(props: never) => Promise<unknown>> {
  const mod = (await import("../app/[locale]/teacher/[level]/[week]/[day]/page.js")) as {
    default: (props: never) => Promise<unknown>;
  };
  return mod.default;
}

beforeEach(() => {
  nav.reset();
  cookiesState.reset();
  media.calls.length = 0;
  process.env.STORYTIME_TEACHER_ROUTES = "1";
  content.loadVisibleWeek = async () => week;
  content.loadWeek = async () => ({ kind: "ok", week });
});

afterEach(() => {
  delete process.env.STORYTIME_TEACHER_ROUTES;
});

describe("login adversarial sessions at the page layer", () => {
  it("serves no week and signs no media for an expired, disabled, deleted, or forged session", async () => {
    expect(existsSync(AUTH_ENTRY), "Missing apps/storytime/lib/auth/index.ts").toBe(true);
    const page = await familyWeekPage();
    const props = {
      params: Promise.resolve({ locale: "th", level: "2", week: "1" }),
      searchParams: Promise.resolve({}),
    };

    // Positive control: a valid session renders the week and signs the media.
    seedSession({});
    const valid = await renderPage(page, props);
    const validContent = "html" in valid && valid.html.length > 0;
    const validMedia = media.calls.length;
    console.log(`page_valid_content=${validContent ? 1 : 0} page_valid_media=${validMedia}`);
    expect(validContent, "the positive control renders the week").toBe(true);
    expect(validMedia, "the positive control signs the media").toBe(1);

    const cases: Array<{ label: string; seed: () => void }> = [
      {
        label: "expired session",
        seed: () => seedSession({ expiresInMs: -1000 }),
      },
      {
        label: "disabled account",
        seed: () => seedSession({ disabled: true }),
      },
      {
        label: "deleted account",
        seed: () => seedSession({ accountPresent: false }),
      },
      {
        label: "forged cookie with no row",
        seed: () => seedSession({ rowPresent: false }),
      },
      {
        label: "the stored digest used as the cookie",
        seed: () => seedSession({ cookieValue: tokenDigest(TOKEN) }),
      },
      {
        label: "an 8 KB cookie",
        seed: () => seedSession({ rowPresent: false, cookieValue: "A".repeat(8192) }),
      },
      {
        label: "a cookie with a semicolon",
        seed: () => seedSession({ rowPresent: false, cookieValue: "abc;def" }),
      },
    ];

    let pageCases = 0;
    let leaks = 0;
    let signedForBadSession = 0;
    const wrong: string[] = [];
    for (const entry of cases) {
      entry.seed();
      nav.reset();
      media.calls.length = 0;
      pageCases += 1;
      const result = await renderPage(page, props);
      if (!("thrown" in result)) {
        leaks += 1;
        wrong.push(`${entry.label}: the week rendered`);
        continue;
      }
      if (!result.thrown.includes("/th/sign-in")) {
        wrong.push(`${entry.label}: redirect ${result.thrown}, not the sign-in page`);
      }
      if (media.calls.length > 0) {
        signedForBadSession += media.calls.length;
        wrong.push(`${entry.label}: the page signed media for a bad session`);
      }
    }

    console.log(`page_session_cases=${pageCases} page_leaks=${leaks}`);
    console.log(`media_signed_for_bad_session=${signedForBadSession}`);
    expect(pageCases, "page_session_cases").toBe(7);
    expect(leaks, `page_leaks: ${wrong.join("; ")}`).toBe(0);
    expect(signedForBadSession, "media_signed_for_bad_session").toBe(0);
    expect(wrong, "every bad session redirects and serves nothing").toEqual([]);
  });

  it("gives a family and a class session the 403 page on the teacher day route", async () => {
    expect(existsSync(AUTH_ENTRY), "Missing apps/storytime/lib/auth/index.ts").toBe(true);
    const page = await teacherDayPage();
    const props = {
      params: Promise.resolve({ locale: "th", level: "2", week: "1", day: "1" }),
    };
    const teacherLine = week.scripts?.find((script) => script.day === 1)?.title.en ?? "";
    expect(teacherLine, "the day fixture holds the day 1 title").toBeTruthy();

    let forbidden = 0;
    let leaks = 0;
    const wrong: string[] = [];
    for (const role of ["family", "class"] as const) {
      seedSession({ role });
      nav.reset();
      const result = await renderPage(page, props);
      if (!("html" in result)) {
        wrong.push(`${role}: the day page redirected or threw (${result.thrown})`);
        continue;
      }
      if (!result.html.includes("/th/sign-in?next=")) {
        wrong.push(`${role}: the 403 page holds no teacher sign-in link`);
      }
      if (result.html.includes(teacherLine)) {
        leaks += 1;
        wrong.push(`${role}: the 403 page leaks the teacher day title`);
      }
      forbidden += 1;
    }

    // Positive control: the teacher session renders the day, and the title is in the HTML.
    seedSession({ role: "teacher" });
    nav.reset();
    const allowed = await renderPage(page, props);
    const teacherSeesDay = "html" in allowed && allowed.html.includes(teacherLine);
    console.log(
      `teacher_day_403=${forbidden} teacher_day_leaks=${leaks} teacher_day_positive=${teacherSeesDay ? 1 : 0}`,
    );
    expect(forbidden, "both other roles get the 403 page").toBe(2);
    expect(leaks, `teacher_day_leaks: ${wrong.join("; ")}`).toBe(0);
    expect(teacherSeesDay, "the positive control finds the teacher day title").toBe(true);
    expect(wrong, "the teacher day role check holds").toEqual([]);
  });
});
