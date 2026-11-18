// @vitest-environment node
/**
 * The child-lesson day links and rule D1 keys (track storytime_app_rebuild_20261025, plan task 6.2,
 * round 10; PM 2026-11-14).
 *
 * Daniel: "In the teacher lesson page there are five buttons which they go to the lesson next to
 * each day's lesson but they do not link to that day's lesson they link to the day one lesson".
 * Daniel: "These lessons appear to only have the phonics part and not the reading or song part is
 * that right?" PM: "If a step or its media does not show, fix it in the same round." PM: "Do not
 * change content in the app."
 *
 * Fault 1 (the day link). The child pages have no day address. The pinned defaults (the PM may
 * change each one; each has a row of its own):
 *   a. `/<locale>/st/<level>/<week>?day=N` accepts N only as `^[1-5]$`. A missing, empty, unknown,
 *      out-of-range, padded, or repeated value gives the same output as no `day`.
 *   b. A valid `?day=N` shows a day line from the message key `stDayLine` (`Day {day}` in English,
 *      `วันที่ {day}` in Thai).
 *   c. A valid `?day=N` and no valid `?part=` opens the part of the first step of `scripts[day N]`
 *      with a media part under rule D1: `readalong` -> `book`, `decodable` -> `decodable`, `song`
 *      -> `song`. A day with no such step shows the home view with the day line. A valid `?part=`
 *      wins; the day line still shows. An unknown `?part=` counts as a missing one.
 *   d. The teacher link of the child page shows on the home view only (the effective part is
 *      null), so day 1 of w01 keeps it and day 2 does not.
 *   e. Each lesson row of the teacher week page holds its own child button with the label of
 *      `teacherChildViewLink` and the href `?day=<script.day>`. The week-level button keeps the
 *      address with no day.
 *   f. The teacher day page N holds one child button with the href `?day=N`.
 *
 * Fault 2 (rule D1, `apps/storytime/lib/teacher-media.ts`). The rule also reads the keys
 * `big book or screen` and `small books` (an entry that starts with the key). The title must name
 * a book of the same week, and the kind comes from that book. The title pattern takes one
 * trailing parenthetical note after the closing quote (for example ` (Sprout band)`), for every
 * key. An entry with two or more quoted titles opens nothing for that entry. `student book: ...`
 * and every other key open nothing. The first matching entry wins, and the rule never reads a
 * step id.
 *
 * The fakes: the fake store, a mocked content loader, mocked navigation, and the real message
 * files (a missing key shows as `MISSING:<key>`). No network, no database, no browser.
 *
 * Red state at the base: no page holds a day address, the key `stDayLine` does not exist, and the
 * rule reads two keys. Rows marked "characterization" pass at the base on purpose (A4); each
 * invalid-value row holds a positive control that fails at the base.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState, type FakeStore } from "./helpers/fake-store";
import week1Json from "../content/l2/w01.json";
import week2Json from "../content/l2/w02.json";
import type { StorytimeWeek } from "../lib/contracts/week";
import { stepMediaOf } from "../lib/teacher-media";

const nav = vi.hoisted(() => ({
  notFound(): never {
    throw new Error("NOT_FOUND");
  },
  redirect(url: string): never {
    throw new Error(`REDIRECT:${url}`);
  },
}));

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
// The labels come from the real message files. A call with values fills each `{name}` placeholder,
// so a Green may call `translate(key, { day })` or replace the placeholder itself.
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
    getTranslations: async (arg?: { locale?: string }) => (key: string, values?: Record<string, unknown>) => {
      let text = table[arg?.locale ?? "th"]?.[key] ?? `MISSING:${key}`;
      for (const [name, value] of Object.entries(values ?? {})) {
        text = text.split(`{${name}}`).join(String(value));
      }
      return text;
    },
  };
});
vi.mock("../lib/content", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("../lib/content");
  return {
    ...actual,
    loadVisibleWeek: () => content.loadVisibleWeek(),
    loadWeek: () => content.loadWeek(),
  };
});
vi.mock("../lib/media/sign", () => ({
  signWeekMedia: async (): Promise<Record<string, string>> => ({}),
}));
vi.mock("../lib/auth/store", async () => {
  const helper = await import("./helpers/fake-store");
  return { getStore: () => helper.fakeStoreState.current };
});
vi.mock("@reading-advantage/auth/password", () => ({
  hashPassword: async (password: string) => `plain:${password}`,
  verifyPassword: async (password: string, hash: string) => hash === `plain:${password}`,
}));

const APP = resolve(import.meta.dirname, "..");
const LOCALES = ["th", "en"] as const;
const DAYS = [1, 2, 3, 4, 5] as const;
const TOKEN = "T".repeat(43);
const DAY_MS = 86_400_000;

type Locale = (typeof LOCALES)[number];
type PartName = "book" | "decodable" | "song" | null;

/** The two weeks of the rows, in the shape of the shipped files. */
const WEEKS: Array<{ week: number; data: StorytimeWeek }> = [
  { week: 1, data: week1Json as unknown as StorytimeWeek },
  { week: 2, data: week2Json as unknown as StorytimeWeek },
];

/** The day-to-part map of rule c per week, checked against the shipped files with rule D1 fixed. */
const EXPECTED_PART: Record<number, PartName[]> = {
  1: [null, "book", "decodable", "decodable", "song"],
  2: [null, "book", "decodable", "decodable", null],
};

const MESSAGES = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(readFileSync(resolve(APP, "messages", `${locale}.json`), "utf8")) as Record<string, string>,
  ]),
) as Record<Locale, Record<string, string>>;

/** The labeled counts of the Red evidence (A3). */
const counts = { weekRows: 0, dayRows: 0, childCases: 0, d1Rows: 0 };

/** Copies a week for a fixture change. */
function cloneWeek(source: StorytimeWeek): StorytimeWeek {
  return JSON.parse(JSON.stringify(source)) as StorytimeWeek;
}

/**
 * Signs the teacher session in.
 * @returns Nothing.
 */
function startTeacherSession(): void {
  const store: FakeStore = createFakeStore({
    accounts: [{ username: "tutor-01", passwordHash: "plain:pw", role: "teacher" }],
  });
  fakeStoreState.current = store;
  const account = store.accounts.find((entry) => entry.username === "tutor-01");
  if (!account) throw new Error("no teacher account");
  const now = new Date("2026-11-14T00:00:00.000Z");
  store.sessions.push({
    tokenDigest: createHash("sha256").update(TOKEN).digest("hex"),
    accountId: account.id,
    expiresAt: new Date(now.getTime() + 365 * DAY_MS),
    lastUseAt: now,
    createdAt: now,
  });
  cookiesState.set("__Host-st_session", TOKEN);
}

type PageResult = { html: string } | { thrown: string };

/**
 * Renders one async page, or reports the message that it threw.
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

/**
 * Renders a page and demands HTML.
 * @param result The render result.
 * @param label The case label for the failure message.
 * @returns The markup.
 */
function htmlOf(result: PageResult, label: string): string {
  expect("html" in result, `${label} renders (${"thrown" in result ? result.thrown : "html"})`).toBe(true);
  return "html" in result ? result.html : "";
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
 * Lists the links of a markup piece.
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
 * Splits the five-lessons list of the teacher week page into rows.
 * @param html The teacher week markup.
 * @returns The day of each row (from its "Open the lesson" link) and the markup of the row.
 */
function lessonRowsOf(html: string): Array<{ day: number; markup: string }> {
  const section = /<section aria-label="The five lessons"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
  const rows: Array<{ day: number; markup: string }> = [];
  for (const match of section.matchAll(/<li\b[\s\S]*?<\/li>/g)) {
    const lesson = linksOf(match[0]).find((link) => /\/teacher\/\d+\/\d+\/\d+$/.test(link.href));
    const day = Number(/\/(\d+)$/.exec(lesson?.href ?? "")?.[1] ?? 0);
    rows.push({ day, markup: match[0] });
  }
  return rows;
}

/**
 * Lists the day lines of a child page: the numbers that follow the day word of either locale.
 * @param html The child page markup.
 * @returns The numbers of the day lines, in page order.
 */
function dayLinesOf(html: string): number[] {
  const text = decode(html.replace(/<[^>]*>/g, " "));
  return [...text.matchAll(/(?:\bDay|วันที่)\s+(\d+)/g)].map((match) => Number(match[1]));
}

/**
 * Reads the part that a child page shows.
 * @param html The child page markup.
 * @returns The part, or `null` for the home view.
 */
function partOf(html: string): PartName {
  const value = /<section data-part="(book|decodable|song)"/.exec(html)?.[1];
  return (value as PartName | undefined) ?? null;
}

const teacherWeekPage = () =>
  import("../app/[locale]/teacher/[level]/[week]/page.js").then((m) => m.default as (props: never) => Promise<unknown>);
const teacherDayPage = () =>
  import("../app/[locale]/teacher/[level]/[week]/[day]/page.js").then((m) => m.default as (props: never) => Promise<unknown>);
const childWeekPage = () =>
  import("../app/[locale]/st/[level]/[week]/page.js").then((m) => m.default as (props: never) => Promise<unknown>);

/**
 * Loads one week into the mocked loaders.
 * @param data The week.
 */
function serve(data: StorytimeWeek): void {
  content.loadVisibleWeek = async () => data;
  content.loadWeek = async () => ({ kind: "ok", week: data });
}

/**
 * Renders the child page.
 * @param locale The locale segment.
 * @param week The week segment.
 * @param search The query values.
 * @returns The markup.
 */
async function renderChild(
  locale: Locale,
  week: number,
  search: Record<string, string | string[]> = {},
): Promise<string> {
  const page = await childWeekPage();
  const result = await renderPage(page, {
    params: Promise.resolve({ locale, level: "2", week: String(week) }),
    searchParams: Promise.resolve(search),
  });
  return htmlOf(result, `child ${locale} week ${week} ${JSON.stringify(search)}`);
}

beforeEach(() => {
  cookiesState.reset();
  process.env.STORYTIME_TEACHER_ROUTES = "1";
  startTeacherSession();
  serve(WEEKS[0]!.data);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.STORYTIME_TEACHER_ROUTES;
  vi.restoreAllMocks();
});

afterAll(() => {
  console.log(`week_row_cases=${counts.weekRows}`);
  console.log(`day_page_cases=${counts.dayRows}`);
  console.log(`child_page_cases=${counts.childCases}`);
  console.log(`d1_rows=${counts.d1Rows}`);
});

describe("row 0: the helpers see what they should (positive control)", () => {
  it("lessonRowsOf finds five rows with their days, and dayLinesOf and partOf read the markup", async () => {
    const page = await teacherWeekPage();
    const html = htmlOf(
      await renderPage(page, { params: Promise.resolve({ locale: "en", level: "2", week: "1" }) }),
      "teacher week",
    );
    const rows = lessonRowsOf(html);
    expect(rows.map((row) => row.day)).toEqual([1, 2, 3, 4, 5]);
    expect(dayLinesOf("<p>Day 3</p><p>วันที่ 4</p><p>Monday 5</p>")).toEqual([3, 4]);
    expect(partOf('<main><section data-part="song">x</section></main>')).toBe("song");
    expect(partOf("<main>no part</main>")).toBeNull();
  });
});

describe("row 1: each lesson row of the teacher week page holds its own child button (fault 1, e)", () => {
  for (const { week, data } of WEEKS) {
    for (const locale of LOCALES) {
      it(`${locale} week ${week}: the button of row N opens /${locale}/st/2/${week}?day=N`, async () => {
        serve(data);
        const page = await teacherWeekPage();
        const html = htmlOf(
          await renderPage(page, { params: Promise.resolve({ locale, level: "2", week: String(week) }) }),
          "teacher week",
        );
        const label = MESSAGES[locale].teacherChildViewLink ?? "";
        const rows = lessonRowsOf(html);
        expect(rows.map((row) => row.day), "five lesson rows, days 1 to 5").toEqual([1, 2, 3, 4, 5]);
        for (const row of rows) {
          const buttons = linksOf(row.markup).filter((link) => link.text === label);
          expect(buttons.length, `row ${row.day}: one child button with the label`).toBe(1);
          expect(buttons[0]?.href, `row ${row.day}: the button opens that day`).toBe(
            `/${locale}/st/2/${week}?day=${row.day}`,
          );
          counts.weekRows += 1;
        }
      });

      it(`${locale} week ${week}: the week-level button stays and keeps the address with no day (characterization)`, async () => {
        serve(data);
        const page = await teacherWeekPage();
        const html = htmlOf(
          await renderPage(page, { params: Promise.resolve({ locale, level: "2", week: String(week) }) }),
          "teacher week",
        );
        const label = MESSAGES[locale].teacherChildViewLink ?? "";
        const rowMarkup = lessonRowsOf(html).map((row) => row.markup).join("");
        const outside = linksOf(html.replace(rowMarkup, "")).filter((link) => link.text === label);
        expect(outside.map((link) => link.href), "one week-level button, no day").toEqual([
          `/${locale}/st/2/${week}`,
        ]);
      });
    }
  }
});

describe("row 2: the teacher day page child button opens that day (fault 1, f)", () => {
  for (const { week, data } of WEEKS) {
    for (const locale of LOCALES) {
      for (const day of DAYS) {
        it(`${locale} week ${week} day ${day}: the child button opens /${locale}/st/2/${week}?day=${day}`, async () => {
          serve(data);
          const page = await teacherDayPage();
          const html = htmlOf(
            await renderPage(page, {
              params: Promise.resolve({ locale, level: "2", week: String(week), day: String(day) }),
            }),
            "teacher day",
          );
          const label = MESSAGES[locale].teacherChildViewLink ?? "";
          const buttons = linksOf(html).filter((link) => link.text === label);
          expect(buttons.length, "one child button on the day page").toBe(1);
          expect(buttons[0]?.href).toBe(`/${locale}/st/2/${week}?day=${day}`);
          counts.dayRows += 1;
          // The back link keeps the week address (characterization).
          expect(linksOf(html).some((link) => link.href === `/${locale}/teacher/2/${week}`)).toBe(true);
        });
      }
    }
  }
});

describe("row 3: the day line message (fault 1, b)", () => {
  it("both message files hold stDayLine with the day placeholder, English and Thai", () => {
    expect(MESSAGES.en.stDayLine).toBe("Day {day}");
    expect(MESSAGES.th.stDayLine).toBe("วันที่ {day}");
  });
});

describe("row 4: the child page reads ?day= (fault 1, a to d)", () => {
  for (const { week, data } of WEEKS) {
    for (const locale of LOCALES) {
      for (const day of DAYS) {
        const expected = EXPECTED_PART[week]![day - 1] ?? null;
        it(`${locale} week ${week} day ${day}: day line ${day} and part ${expected ?? "home view"}`, async () => {
          serve(data);
          const html = await renderChild(locale, week, { day: String(day) });
          expect(dayLinesOf(html), "one visible day line with the day").toEqual([day]);
          expect(partOf(html), "the part of the first media step of that day").toBe(expected);
          counts.childCases += 1;
        });
      }
    }
  }

  it("the child page with no day shows no day line, in both locales (characterization)", async () => {
    for (const locale of LOCALES) {
      const searches: Array<Record<string, string>> = [{}, { part: "book" }, { part: "decodable" }, { part: "song" }];
      for (const search of searches) {
        expect(dayLinesOf(await renderChild(locale, 1, search)), `${locale} ${JSON.stringify(search)}`).toEqual([]);
      }
    }
  });

  const invalid: Array<[string, string | string[]]> = [
    ["zero", "0"],
    ["six", "6"],
    ["padded 01", "01"],
    ["letter", "x"],
    ["empty", ""],
    ["ten", "10"],
    ["negative", "-1"],
    ["decimal", "2.0"],
    ["leading space", " 2"],
    ["trailing space", "2 "],
    ["full-width digit", "２"],
    ["repeated different", ["2", "3"]],
    ["repeated same", ["2", "2"]],
  ];
  for (const [label, value] of invalid) {
    it(`an invalid day (${label}) gives the same output as no day, with and without part`, async () => {
      const control = await renderChild("en", 1, { day: "2" });
      expect(dayLinesOf(control), "control: a valid day shows its day line").toEqual([2]);
      for (const locale of LOCALES) {
        expect(await renderChild(locale, 1, { day: value }), `${locale} no part`).toBe(await renderChild(locale, 1, {}));
        expect(await renderChild(locale, 1, { day: value, part: "song" }), `${locale} part=song`).toBe(
          await renderChild(locale, 1, { part: "song" }),
        );
      }
      counts.childCases += 1;
    });
  }

  it("a valid ?part= wins over the day mapping, and the day line still shows", async () => {
    const cases: Array<[string, PartName]> = [
      ["2", "song"],
      ["5", "book"],
      ["1", "decodable"],
      ["3", "song"],
    ];
    for (const [day, part] of cases) {
      const html = await renderChild("en", 1, { day, part: part as string });
      expect(partOf(html), `day ${day} with part ${part}`).toBe(part);
      expect(dayLinesOf(html), `day ${day} with part ${part}: the day line`).toEqual([Number(day)]);
    }
    counts.childCases += 1;
  });

  it("an unknown ?part= counts as a missing one, so the day mapping applies", async () => {
    const html = await renderChild("en", 1, { day: "3", part: "x" });
    expect(partOf(html)).toBe("decodable");
    expect(dayLinesOf(html)).toEqual([3]);
  });

  it("the teacher link shows on the home view only (rule d)", async () => {
    const teacherHref = "/en/teacher/2/1";
    const hasLink = (html: string) => linksOf(html).some((link) => link.href === teacherHref);
    expect(hasLink(await renderChild("en", 1, {})), "control: no day, home view").toBe(true);
    expect(hasLink(await renderChild("en", 1, { day: "1" })), "day 1 is the home view with the day line").toBe(true);
    expect(dayLinesOf(await renderChild("en", 1, { day: "1" })), "the day line shows on day 1").toEqual([1]);
    expect(hasLink(await renderChild("en", 1, { day: "2" })), "day 2 opens the book").toBe(false);
    expect(hasLink(await renderChild("en", 1, { day: "1", part: "song" })), "an explicit part").toBe(false);
    expect(hasLink(await renderChild("en", 1, { part: "song" })), "part with no day").toBe(false);
    counts.childCases += 1;
  });

  it("walks the steps in order: the first step with a media part decides the day", async () => {
    const copy = cloneWeek(WEEKS[0]!.data);
    const day2 = copy.scripts.find((script) => script.day === 2)!;
    day2.steps[0]!.materials = ['karaoke videos: "Hello, I Am Pip"'];
    serve(copy);
    const html = await renderChild("en", 1, { day: "2" });
    expect(partOf(html), "the first step now opens the song").toBe("song");
    expect(dayLinesOf(html)).toEqual([2]);
  });

  it("skips a step whose title names no book, and shows the home view when no step has a part", async () => {
    const copy = cloneWeek(WEEKS[0]!.data);
    const day3 = copy.scripts.find((script) => script.day === 3)!;
    day3.steps[0]!.materials = ['small books (each child\'s own): "No Such Book"'];
    day3.steps[1]!.materials = ['big book or screen: "Hello!"'];
    serve(copy);
    expect(partOf(await renderChild("en", 1, { day: "3" })), "the second step opens the read-along").toBe("book");

    for (const step of day3.steps) {
      step.materials = ['small books (each child\'s own): "No Such Book"', "student book: practice sheet"];
    }
    serve(copy);
    const home = await renderChild("en", 1, { day: "3" });
    expect(partOf(home), "no step has a part").toBeNull();
    expect(dayLinesOf(home), "the day line still shows").toEqual([3]);
  });

  it("shows the home view with the day line when the week holds no script for that day", async () => {
    const copy = cloneWeek(WEEKS[0]!.data);
    copy.scripts = copy.scripts.filter((script) => script.day !== 5);
    serve(copy);
    const html = await renderChild("en", 1, { day: "5" });
    expect(partOf(html)).toBeNull();
    expect(dayLinesOf(html)).toEqual([5]);
  });
});

describe("row 5: rule D1 reads the keys big book or screen and small books (fault 2)", () => {
  const week = WEEKS[0]!.data;
  const other = WEEKS[1]!.data;
  const base = week.scripts[1]!.steps[0]!;

  /** Builds a step of the shipped shape with new materials and a chosen id. */
  function stepWith(materials: string[], id = "Z9"): (typeof base) {
    return { ...JSON.parse(JSON.stringify(base)), id, materials } as typeof base;
  }

  const rows: Array<[string, string[], { kind: string; title: string } | null]> = [
    ['big book or screen: "<read-along>"', ['big book or screen: "Hello!"'], { kind: "readalong", title: "Hello!" }],
    ["big book or screen names the decodable", ['big book or screen: "Nan Can Nod"'], { kind: "decodable", title: "Nan Can Nod" }],
    ["small books: the decodable", ['small books (each child\'s own): "Nan Can Nod"'], { kind: "decodable", title: "Nan Can Nod" }],
    ["small books: the read-along (kind from the book)", ['small books (each child\'s own): "Hello!"'], { kind: "readalong", title: "Hello!" }],
    ["the (Sprout band) suffix names the book", ['small books (each child\'s own): "Hello!" (Sprout band)'], { kind: "readalong", title: "Hello!" }],
    ["the suffix on big book or screen", ['big book or screen: "Nan Can Nod" (Sprout band)'], { kind: "decodable", title: "Nan Can Nod" }],
    ["the suffix after trailing space", ['big book or screen: "Hello!" (Sprout band) '], { kind: "readalong", title: "Hello!" }],
    ["the suffix on a karaoke entry", ['karaoke videos: "Hello, I Am Pip" (Sprout band)'], { kind: "song", title: "Hello, I Am Pip" }],
    ["the suffix on a book audio entry", ['book audio: "Hello!" (Sprout band)'], { kind: "readalong", title: "Hello!" }],
    ["two quoted titles open nothing", ['small books (each child\'s own): "Hello!", "Nan Can Nod"'], null],
    ["two quoted titles and a suffix open nothing", ['small books (each child\'s own): "Hello!", "Nan Can Nod" (Sprout band)'], null],
    ["two parenthetical notes open nothing", ['big book or screen: "Hello!" (Sprout band) (extra)'], null],
    ["an unknown title opens nothing (big book or screen)", ['big book or screen: "No Such Book"'], null],
    ["an unknown title opens nothing (small books)", ['small books (each child\'s own): "No Such Book" (Sprout band)'], null],
    ["student book: practice sheet opens nothing", ["student book: practice sheet"], null],
    ["student book with a book title opens nothing", ['student book: "Hello!"'], null],
    ["stickers with a book title opens nothing", ['stickers: "Nan Can Nod"'], null],
    ["a key that is not at the start opens nothing", ['a big book or screen: "Hello!"'], null],
    ["an entry with no title opens nothing", ["big book or screen"], null],
    ["the first matching entry wins (book first)", ['big book or screen: "Nan Can Nod"', 'karaoke videos: "Hello, I Am Pip"'], { kind: "decodable", title: "Nan Can Nod" }],
    ["the first matching entry wins (song first)", ['karaoke videos: "Hello, I Am Pip"', 'big book or screen: "Nan Can Nod"'], { kind: "song", title: "Hello, I Am Pip" }],
    ["an unmatched entry is skipped (the E2 shape)", ['small books (each child\'s own): "Hello!", "Nan Can Nod"', 'karaoke videos: "Hello, I Am Pip"'], { kind: "song", title: "Hello, I Am Pip" }],
    ["the existing book audio key keeps working", ['book audio, on the tablet or by the QR code: "Hello!"'], { kind: "readalong", title: "Hello!" }],
    ["the existing karaoke key keeps working", ['karaoke videos: "Hello, I Am Pip"', "class tablet"], { kind: "song", title: "Hello, I Am Pip" }],
    ["an unknown song title opens nothing", ['karaoke videos: "No Such Song"'], null],
  ];
  for (const [label, materials, expected] of rows) {
    it(`${label}`, () => {
      const media = stepMediaOf(stepWith(materials), week);
      if (expected === null) {
        expect(media, "no player").toBeNull();
      } else {
        expect(media?.kind, "kind").toBe(expected.kind);
        expect(media?.title, "title").toBe(expected.title);
        expect(media?.files.length ?? 0, "a part with files").toBeGreaterThan(0);
      }
      counts.d1Rows += 1;
    });
  }

  it("never reads a step id: every id gives the same answer", () => {
    for (const id of ["B2", "Z9", "A1", ""]) {
      expect(stepMediaOf(stepWith(['big book or screen: "Hello!"'], id), week)?.kind, `id ${JSON.stringify(id)}`).toBe(
        "readalong",
      );
    }
  });

  it("the title must name a book of the same week", () => {
    // "How Many?" is a book of w02 and not of w01.
    const entry = ['big book or screen: "How Many?"'];
    expect(stepMediaOf(stepWith(entry), week), "w01 holds no such book").toBeNull();
    expect(stepMediaOf(stepWith(entry), other)?.kind, "w02 holds it").toBe("readalong");
  });

  it("the shipped w01 holds twelve media steps with the pinned kinds (media_steps=12)", () => {
    const found: Array<[string, string | null]> = [];
    for (const script of week.scripts) {
      for (const step of script.steps) {
        const media = stepMediaOf(step, week);
        if (media) found.push([step.id, media.kind]);
      }
    }
    expect(found.length, `media_steps=${found.length}`).toBe(12);
    expect(found).toEqual([
      ["B2", "readalong"],
      ["B3", "readalong"],
      ["B4", "readalong"],
      ["B6", "readalong"],
      ["B7", "song"],
      ["C4", "decodable"],
      ["C5", "decodable"],
      ["C6", "decodable"],
      ["D1", "decodable"],
      ["D3", "readalong"],
      ["D6", "song"],
      ["E2", "song"],
    ]);
  });

  it("the shipped w02 holds eleven media steps; E2 stays without media (two quoted titles)", () => {
    const ids: string[] = [];
    for (const script of other.scripts) {
      for (const step of script.steps) {
        if (stepMediaOf(step, other)) ids.push(step.id);
      }
    }
    expect(ids.length, `media_steps=${ids.length}`).toBe(11);
    expect(ids).toEqual(["B2", "B3", "B4", "B6", "B7", "C4", "C5", "C6", "D1", "D3", "D6"]);
  });

  it("the paper steps of w01 stay without media (A7, C7, A8)", () => {
    for (const [dayIndex, id] of [[0, "A7"], [0, "A8"], [2, "C7"]] as const) {
      const step = week.scripts[dayIndex]!.steps.find((entry) => entry.id === id)!;
      expect(stepMediaOf(step, week), id).toBeNull();
    }
  });
});
