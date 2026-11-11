// @vitest-environment node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { NextRequest } from "next/server";
import type { ReactElement } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import week1 from "../content/l2/w01.json";
import { SESSION_COOKIE_NAME } from "../lib/auth/cookie";
import { DATABASE_URL_ENV } from "../lib/auth/store";
import { parseTeacherDay, parseTeacherRoute, teacherRoutesEnabled } from "../lib/teacher";
import { hasSignedMedia, type StepMedia } from "../lib/teacher-media";
import proxy from "../proxy";

/**
 * The adversarial round of Phase 4, route half (test strategy P4 "Review applicability").
 *
 * The cases attack the flag `STORYTIME_TEACHER_ROUTES`, the guard order of the two teacher pages,
 * the route segments, and the proxy. The pages run for real with a mocked session, loader, and
 * signer. Each outcome is one word: `404`, `403`, `redirect`, or `ok`. Every count is a labeled
 * integer (A3), and each case reads a list that is not empty (A4).
 */

/** The name of the teacher route flag. */
const FLAG_ENV = "STORYTIME_TEACHER_ROUTES";

/** The repository root. */
const REPO = resolve(import.meta.dirname, "../../..");

/** The Storytime app folder. */
const APP = resolve(import.meta.dirname, "..");

/** The kind of session that the mocked `requireRole` gives. */
type SessionKind = "teacher" | "other" | "none";

/** The state of the mocks. */
const mocks = vi.hoisted(() => ({
  session: "teacher" as "teacher" | "other" | "none",
  flipTo: undefined as string | null | undefined,
  sessionCalls: 0,
  returnPaths: [] as string[],
  loadCalls: [] as Array<[number, number]>,
  signCalls: 0,
  weekDays: [1, 2, 3, 4, 5] as number[],
}));

vi.mock("next/navigation", () => ({
  redirect(url: string) {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound() {
    throw new Error("NOT_FOUND");
  },
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async (arg?: { locale?: string }) => (key: string) =>
    `${arg?.locale ?? "th"}:${key}`,
}));

vi.mock("../lib/auth", () => ({
  requireRole: async (_role: string, returnPath: string) => {
    mocks.sessionCalls += 1;
    mocks.returnPaths.push(returnPath);
    if (mocks.flipTo === null) delete process.env.STORYTIME_TEACHER_ROUTES;
    else if (mocks.flipTo !== undefined) process.env.STORYTIME_TEACHER_ROUTES = mocks.flipTo;
    if (mocks.session === "none") throw new Error(`REDIRECT:/th/sign-in?next=${returnPath}`);
    return mocks.session === "teacher" ? { id: "u-teach", username: "teach-01", role: "teacher" } : null;
  },
}));

vi.mock("../lib/content", () => ({
  loadVisibleWeek: async () => null,
  loadWeek: async (level: number, weekNumber: number) => {
    mocks.loadCalls.push([level, weekNumber]);
    if (level !== 2 || weekNumber !== 1) return { kind: "absent" };
    const copy = structuredClone(week1) as unknown as { scripts: Array<{ day: number }> };
    copy.scripts = copy.scripts.filter((script) => mocks.weekDays.includes(script.day));
    return { kind: "ok", week: copy };
  },
}));

vi.mock("../lib/media/sign", () => ({
  signWeekMedia: async () => {
    mocks.signCalls += 1;
    return {};
  },
}));

/** The route params of a page call. */
interface Params {
  /** The locale segment. */
  locale: string;
  /** The level segment. */
  level: string;
  /** The week segment. */
  week: string;
  /** The day segment, for the day page. */
  day?: string;
}

/** One page function of the teacher group. */
type PageFn = (props: { params: Promise<Params> }) => Promise<ReactElement>;

/** The two pages under test. */
let pages: { week: PageFn; day: PageFn; weekModule: Record<string, unknown>; dayModule: Record<string, unknown> };

beforeAll(async () => {
  const weekModule = (await import("../app/[locale]/teacher/[level]/[week]/page")) as Record<string, unknown>;
  const dayModule = (await import("../app/[locale]/teacher/[level]/[week]/[day]/page")) as Record<string, unknown>;
  pages = {
    week: weekModule.default as PageFn,
    day: dayModule.default as PageFn,
    weekModule,
    dayModule,
  };
});

beforeEach(() => {
  delete process.env[FLAG_ENV];
  mocks.session = "teacher";
  mocks.flipTo = undefined;
  mocks.sessionCalls = 0;
  mocks.returnPaths.length = 0;
  mocks.loadCalls.length = 0;
  mocks.signCalls = 0;
  mocks.weekDays = [1, 2, 3, 4, 5];
});

afterEach(() => {
  delete process.env[FLAG_ENV];
  delete process.env[DATABASE_URL_ENV];
});

/** The result of one page call. */
interface Outcome {
  /** One word: `404`, `403`, `redirect`, or `ok`. */
  word: "404" | "403" | "redirect" | "ok";
  /** The element that the page returned, for `403` and `ok`. */
  element?: ReactElement;
}

/**
 * Calls one page and reads its outcome.
 * @param page Which page.
 * @param params The route params.
 * @returns The outcome.
 */
async function call(page: "week" | "day", params: Params): Promise<Outcome> {
  const fn = page === "week" ? pages.week : pages.day;
  try {
    const element = await fn({ params: Promise.resolve(params) });
    const name = typeof element.type === "function" ? element.type.name : String(element.type);
    if (name === "TeacherForbidden") return { word: "403", element };
    return { word: "ok", element };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "NOT_FOUND") return { word: "404" };
    if (message.startsWith("REDIRECT:")) return { word: "redirect" };
    throw error;
  }
}

/** Builds the params of a valid route for one page. */
function validParams(page: "week" | "day"): Params {
  return page === "week"
    ? { locale: "th", level: "2", week: "1" }
    : { locale: "th", level: "2", week: "1", day: "1" };
}

/** The flag values that the Red test and the adversarial round try. */
const FLAG_VALUES: Array<string | undefined> = [
  undefined,
  "",
  "false",
  "0",
  "true",
  " 1",
  "1 ",
  "01",
  "1",
  "TRUE",
  "yes",
  "on",
  "+1",
  "1.0",
  "1\n",
  "١",
];

/**
 * Sets the flag in the environment.
 * @param value The value, or `undefined` for unset.
 */
function setFlag(value: string | undefined): void {
  if (value === undefined) delete process.env[FLAG_ENV];
  else process.env[FLAG_ENV] = value;
}

describe("Phase 4 adversarial: the flag STORYTIME_TEACHER_ROUTES", () => {
  it("reads the flag as on only for the exact value 1", () => {
    const on: Array<string | undefined> = [];
    for (const value of FLAG_VALUES) {
      setFlag(value);
      if (teacherRoutesEnabled()) on.push(value);
    }
    expect(FLAG_VALUES.length, `flag_values=${FLAG_VALUES.length}`).toBeGreaterThan(8);
    expect(on, `flag_on_values=${on.length}: only the value 1 turns the flag on`).toEqual(["1"]);
  });

  it("gives every session 404 for every flag value but 1, and a redirect to a visitor, on both pages", async () => {
    let cases = 0;
    for (const page of ["week", "day"] as const) {
      for (const session of ["teacher", "other", "none"] as SessionKind[]) {
        for (const value of FLAG_VALUES) {
          setFlag(value);
          mocks.session = session;
          mocks.sessionCalls = 0;
          mocks.loadCalls.length = 0;
          mocks.signCalls = 0;
          mocks.returnPaths.length = 0;
          const outcome = await call(page, validParams(page));
          const on = value === "1";
          const expected =
            session === "none" ? "redirect" : !on ? "404" : session === "teacher" ? "ok" : "403";
          const label = `page=${page} session=${session} flag=${JSON.stringify(value)}`;
          expect(outcome.word, `${label}: outcome`).toBe(expected);
          expect(mocks.sessionCalls, `${label}: session_calls`).toBe(1);
          const loads = mocks.loadCalls.length;
          expect(loads, `${label}: load_calls=${loads}`).toBe(expected === "ok" ? 1 : 0);
          expect(mocks.signCalls, `${label}: sign_calls`).toBe(expected === "ok" ? 1 : 0);
          cases += 1;
        }
      }
    }
    expect(cases, `matrix_cases=${cases}`).toBe(2 * 3 * FLAG_VALUES.length);
  });

  it("reads the session before the flag: a session read that turns the flag on or off decides the answer", async () => {
    for (const page of ["week", "day"] as const) {
      delete process.env[FLAG_ENV];
      mocks.flipTo = "1";
      const turnedOn = await call(page, validParams(page));
      expect(turnedOn.word, `page=${page}: a flag set during the session read must count`).toBe("ok");

      process.env[FLAG_ENV] = "1";
      mocks.flipTo = null;
      const turnedOff = await call(page, validParams(page));
      expect(turnedOff.word, `page=${page}: a flag cleared during the session read must count`).toBe("404");
    }
  });

  it("reads the flag at request time on one imported module", async () => {
    const words: string[] = [];
    for (const value of [undefined, "1", undefined, "1", "0"]) {
      setFlag(value);
      words.push((await call("day", validParams("day"))).word);
    }
    expect(words, `flag_flips=${words.length}: the page must follow the flag with no restart`).toEqual([
      "404",
      "ok",
      "404",
      "ok",
      "404",
    ]);
  });

  it("exports no static params, runs force-dynamic, and marks both pages noindex", () => {
    for (const [label, module] of [["week", pages.weekModule], ["day", pages.dayModule]] as const) {
      expect("generateStaticParams" in module, `${label} must export no generateStaticParams`).toBe(false);
      expect(module.dynamic, `${label} must render at request time`).toBe("force-dynamic");
      const metadata = (module.generateMetadata as () => { robots?: string })();
      expect(metadata.robots, `${label} must stay out of the search index`).toBe("noindex, nofollow");
    }
  });
});

describe("Phase 4 adversarial: route variants with the flag on", () => {
  /** Segments that no position accepts. */
  const BAD = [
    "0", "01", "1.0", " 1", "1 ", "+1", "-1", "1e0", "0x1", "\u0662", "2\n", "", "NaN",
    "__proto__", "constructor", "2%2F1", "2/1", "9".repeat(5000),
  ];

  /** Extra segments that are out of bounds for one position only. */
  const EXTRA = { level: ["5", "9"], week: ["33", "99"], day: ["6", "9"] };

  it("answers 404 and never loads a week for a bad level, week, or day", async () => {
    setFlag("1");
    let cases = 0;
    for (const [position, extra] of [["level", EXTRA.level], ["week", EXTRA.week], ["day", EXTRA.day]] as const) {
      for (const bad of [...BAD, ...extra]) {
        const params: Params =
          position === "level"
            ? { locale: "th", level: bad, week: "1", day: "1" }
            : position === "week"
              ? { locale: "th", level: "2", week: bad, day: "1" }
              : { locale: "th", level: "2", week: "1", day: bad };
        for (const page of position === "day" ? (["day"] as const) : (["week", "day"] as const)) {
          mocks.loadCalls.length = 0;
          const outcome = await call(page, page === "week" ? { locale: "th", level: params.level, week: params.week } : params);
          const label = `page=${page} ${position}=${JSON.stringify(bad.slice(0, 12))}`;
          expect(outcome.word, label).toBe("404");
          expect(mocks.loadCalls.length, `${label}: load_calls=0 for a bad segment`).toBe(0);
          cases += 1;
        }
      }
    }
    expect(cases, `bad_route_cases=${cases}`).toBe(
      (BAD.length + EXTRA.level.length) * 2 + (BAD.length + EXTRA.week.length) * 2 + (BAD.length + EXTRA.day.length),
    );
    expect(parseTeacherRoute("2", "1"), "the positive control parses").toEqual({ level: 2, week: 1 });
    expect(parseTeacherDay("5"), "the positive control parses day 5").toBe(5);
    expect(parseTeacherDay("6"), "day 6 is out of bounds").toBeNull();
    for (const bad of [...BAD, ...EXTRA.day]) {
      expect(parseTeacherDay(bad), `parseTeacherDay(${JSON.stringify(bad.slice(0, 12))})`).toBeNull();
    }
  });

  it("loads once for a valid route, answers 404 for an absent week, and signs nothing for a 404", async () => {
    setFlag("1");
    for (const page of ["week", "day"] as const) {
      mocks.loadCalls.length = 0;
      mocks.signCalls = 0;
      const ok = await call(page, validParams(page));
      expect(ok.word, `page=${page}: the positive control`).toBe("ok");
      expect(mocks.loadCalls, "load_calls=1 with level 2 and week 1").toEqual([[2, 1]]);
      expect(mocks.signCalls, "sign_calls=1").toBe(1);

      mocks.loadCalls.length = 0;
      mocks.signCalls = 0;
      const absent = await call(page, { ...validParams(page), level: "1" });
      expect(absent.word, `page=${page}: a valid level with no week file`).toBe("404");
      expect(mocks.loadCalls.length, "load_calls=1").toBe(1);
      expect(mocks.signCalls, "sign_calls=0 for an absent week").toBe(0);
    }

    mocks.weekDays = [1, 2, 3, 4];
    mocks.signCalls = 0;
    const noDay = await call("day", { ...validParams("day"), day: "5" });
    expect(noDay.word, "a week with no script for day 5").toBe("404");
    expect(mocks.signCalls, "sign_calls=0 for a day with no script").toBe(0);
  });

  it("encodes a hostile segment in the 403 sign-in link and keeps the locale text", async () => {
    setFlag("1");
    mocks.session = "other";
    const level = '2"><script>alert(1)</script> ';
    const outcome = await call("week", { locale: "th", level, week: "1" });
    expect(outcome.word, "a session of another role gets the 403 view").toBe("403");
    const props = outcome.element!.props as { href: string; heading: string };
    const path = `/th/teacher/${level}/1`;
    expect(props.href, "the link must hold the encoded return path").toBe(
      `/th/sign-in?next=${encodeURIComponent(path)}`,
    );
    expect(/["<> ]/.test(props.href), "no raw quote, bracket, or space in the link").toBe(false);
    expect(props.heading, "the heading comes from the translations of the locale").toBe(
      "th:teacherForbiddenHeading",
    );
    expect(mocks.loadCalls.length, "load_calls=0 for the 403 view").toBe(0);
  });
});

describe("Phase 4 adversarial: the proxy on teacher paths", () => {
  const BASE = "https://app.example";

  /**
   * Builds one request for the proxy.
   * @param path The path with its query.
   * @param options The cookie and the headers.
   * @returns The request.
   */
  function request(path: string, options: { cookie?: boolean; headers?: Record<string, string> } = {}) {
    return new NextRequest(new URL(path, BASE), {
      headers: {
        ...(options.cookie ? { cookie: `${SESSION_COOKIE_NAME}=${"A".repeat(43)}` } : {}),
        ...options.headers,
      },
    });
  }

  /** The visible path of a redirect, or `null`. */
  function locationOf(response: Response): string | null {
    const value = response.headers.get("location");
    if (!value) return null;
    const url = new URL(value, BASE);
    return `${url.pathname}${url.search}`;
  }

  const VARIANTS: Array<{ label: string; path: string; locale: string; headers?: Record<string, string> }> = [
    { label: "week", path: "/th/teacher/2/1", locale: "th" },
    { label: "day", path: "/th/teacher/2/1/1", locale: "th" },
    { label: "english locale", path: "/en/teacher/2/1/1", locale: "en" },
    { label: "rsc query", path: "/th/teacher/2/1?_rsc=abc12", locale: "th" },
    { label: "rsc header", path: "/th/teacher/2/1/1", locale: "th", headers: { RSC: "1" } },
    {
      label: "prefetch header",
      path: "/th/teacher/2/1/1?_rsc=zz",
      locale: "th",
      headers: { RSC: "1", "Next-Router-Prefetch": "1", "Next-Router-Segment-Prefetch": "/_tree" },
    },
    { label: "rsc suffix", path: "/th/teacher/2/1/1.rsc", locale: "th" },
    { label: "segment prefix", path: "/th/teacher/2/1.segments/_tree.segment.rsc", locale: "th" },
    { label: "index text", path: "/th/teacher/2/1/index.txt", locale: "th" },
    { label: "upper-case locale", path: "/TH/teacher/2/1", locale: "th" },
    { label: "upper-case section", path: "/th/TEACHER/2/1", locale: "th" },
    { label: "encoded t", path: "/th/%74eacher/2/1", locale: "th" },
    { label: "encoded slash", path: "/th/teacher%2F2/1", locale: "th" },
    { label: "double slash", path: "/th//teacher/2/1", locale: "th" },
    { label: "trailing slash", path: "/th/teacher/2/1/", locale: "th" },
    { label: "path parameter", path: "/th/teacher/2/1;x=1", locale: "th" },
    { label: "bad percent encoding", path: "/th/%E0%A4%A/teacher/2/1", locale: "th" },
  ];

  it("sends a request with no session cookie to sign-in, with no-store, for every variant", async () => {
    expect(VARIANTS.length, `variants=${VARIANTS.length}`).toBeGreaterThan(10);
    for (const variant of VARIANTS) {
      const response = await Promise.resolve(proxy(request(variant.path, { headers: variant.headers })));
      const target = locationOf(response);
      expect(target, `${variant.label}: ${variant.path} must redirect`).not.toBeNull();
      expect(
        target,
        `${variant.label}: the redirect must go to sign-in and keep the scanned path`,
      ).toBe(`/${variant.locale}/sign-in?next=${encodeURIComponent(variant.path)}`);
      expect(response.headers.get("cache-control"), `${variant.label}: a prefetch must not cache the redirect`).toBe(
        "no-store",
      );
    }
  });

  it("passes a request with a cookie on, and sends a path with no locale through the locale step first", async () => {
    delete process.env[DATABASE_URL_ENV];
    let passed = 0;
    for (const variant of VARIANTS) {
      const response = await Promise.resolve(proxy(request(variant.path, { cookie: true, headers: variant.headers })));
      expect(locationOf(response), `${variant.label}: a request with a cookie must pass`).toBeNull();
      passed += 1;
    }
    expect(passed, `passed=${passed}`).toBe(VARIANTS.length);

    const noLocale = await Promise.resolve(proxy(request("/teacher/2/1/1")));
    expect(locationOf(noLocale), "a path with no locale redirects to the Thai path, never to a page").toBe(
      "/th/teacher/2/1/1",
    );
    const noLocaleCookie = await Promise.resolve(proxy(request("/teacher/2/1/1", { cookie: true })));
    expect(locationOf(noLocaleCookie), "the locale step runs for a request with a cookie too").toBe(
      "/th/teacher/2/1/1",
    );
  });
});

describe("Phase 4 adversarial: build and source facts of the flag", () => {
  /**
   * Lists the TypeScript files of a folder, skipping folders by exact name.
   * @param root The folder.
   * @param skip The exact folder names to skip.
   * @returns The file paths.
   */
  function sourceFiles(root: string, skip: Set<string>): string[] {
    const out: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          if (!skip.has(entry)) walk(path);
        } else if (/\.(ts|tsx)$/.test(entry)) out.push(path);
      }
    };
    walk(root);
    return out;
  }

  it("holds no flag value in the Dockerfile and the Cloud Build file, so no build turns the routes on", () => {
    const files = ["apps/storytime/Dockerfile", "apps/storytime/cloudbuild.yaml"].map((file) => resolve(REPO, file));
    for (const file of files) expect(existsSync(file), `files_scanned: ${file} must exist`).toBe(true);
    for (const file of files) {
      expect(readFileSync(file, "utf8"), `${file} must not name the teacher flag`).not.toMatch(/TEACHER_ROUTES/);
    }
  });

  it("links to a teacher route from no source outside the teacher folder", () => {
    const sources = sourceFiles(resolve(APP, "app"), new Set(["node_modules", ".next", "teacher"]));
    expect(sources.length, `files_scanned=${sources.length}`).toBeGreaterThan(10);
    const hits: string[] = [];
    for (const file of sources) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n");
      if (/["'`][^"'`\n]*\/teacher\b/.test(code)) hits.push(file.slice(APP.length + 1));
    }
    expect(hits, `teacher_links=${hits.length}: a public page must not link to a flag-gated route`).toEqual([]);
  });

  it("names the flag and its default in the deploy runbook (strategy P4 changed-contract risk)", () => {
    const runbook = resolve(REPO, "docs/runbooks/storytime-deploy.md");
    expect(existsSync(runbook), "files_scanned=1: the runbook must exist").toBe(true);
    const text = readFileSync(runbook, "utf8");
    expect(
      text.includes(FLAG_ENV),
      `runbook_flag_mentions=0: the strategy says the runbook must state that ${FLAG_ENV} is off by default (F452)`,
    ).toBe(true);
    const at = text.indexOf(FLAG_ENV);
    const near = text.slice(Math.max(0, at - 400), at + 600);
    expect(near, "the runbook must say that the default is off").toMatch(/off by default|default (?:is )?off|unset|not set/i);
  });
});

describe("Phase 4 adversarial round 2: the runbook section of the teacher flag", () => {
  /**
   * Reads the teacher flag section of the deploy runbook.
   * @returns The text from the heading of the section to the next level 2 heading.
   */
  function flagSection(): string {
    const text = readFileSync(resolve(REPO, "docs/runbooks/storytime-deploy.md"), "utf8");
    const start = text.indexOf("## The teacher routes flag");
    expect(start, "the runbook must hold a section for the teacher routes flag").toBeGreaterThanOrEqual(0);
    const rest = text.slice(start + 3);
    const end = rest.indexOf("\n## ");
    return end === -1 ? rest : rest.slice(0, end);
  }

  it("names the flag, the on value 1, and the default off", () => {
    const section = flagSection();
    expect(section.includes(FLAG_ENV), "the section names the flag").toBe(true);
    expect(section, "the section names the on value 1").toMatch(/on value is `1`/);
    expect(section, "the section says the default is off").toMatch(/off by default/i);
    expect(section, "the section says that no Dockerfile or build file sets the flag").toMatch(/Dockerfile/);
  });

  it("F461: gives a command that keeps the other variables of the service", () => {
    const section = flagSection();
    const command = /gcloud run services update[^`]*/.exec(section)?.[0] ?? "";
    expect(command, "the section must hold one gcloud update command").not.toBe("");
    expect(
      command.includes("--set-env-vars"),
      `the command "${command}" uses --set-env-vars, which removes every other variable of the service first, such as STORYTIME_MEDIA_BASE (F461). Use --update-env-vars.`,
    ).toBe(false);
    expect(command, "the command must use --update-env-vars").toMatch(/--update-env-vars/);
    expect(command, "the command must name the service, the project, and the region like the other commands of the runbook").toMatch(
      /storytime-app[\s\S]*--project primary-advantage[\s\S]*--region asia-southeast1/,
    );
  });
});

describe("Phase 4 adversarial round 3: the runbook text after 9e2d04418", () => {
  /**
   * Lists the lines of the text files of the given folders that hold a gcloud env-var setter.
   * @param roots The folders to scan, relative to the repository root.
   * @returns One entry per line, with the file and the text.
   */
  function setterLines(roots: string[]): string[] {
    const hits: string[] = [];
    const skip = new Set(["node_modules", ".next", "__tests__", ".git"]);
    const walk = (dir: string): void => {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          if (!skip.has(entry)) walk(path);
        } else if (/\.(md|yaml|yml|sh|json|ts|tsx)$/.test(entry)) {
          readFileSync(path, "utf8")
            .split("\n")
            .forEach((line, index) => {
              if (/--set-env-vars/.test(line)) hits.push(`${path.slice(REPO.length + 1)}:${index + 1}: ${line.trim()}`);
            });
        }
      }
    };
    for (const root of roots) walk(resolve(REPO, root));
    return hits;
  }

  it("holds no --set-env-vars line for the storytime service in docs, workflows, or the app", () => {
    const hits = setterLines(["docs", ".github", "apps/storytime"]);
    const storytime = hits.filter((line) => /storytime/i.test(line));
    expect(storytime, `storytime_set_env_vars_lines=${storytime.length}`).toEqual([]);
    expect(hits.length, `all_set_env_vars_lines=${hits.length}: the scan reads files (the Codecamp doc holds some)`).toBeGreaterThan(0);
    expect(
      hits.every((line) => line.startsWith("docs/deployment/")),
      `every remaining setter is in the generic deployment doc: ${hits.filter((line) => !line.startsWith("docs/deployment/")).join(" | ")}`,
    ).toBe(true);
  });

  it("sets exactly one variable on the update command and removes exactly one on the way back", () => {
    const text = readFileSync(resolve(REPO, "docs/runbooks/storytime-deploy.md"), "utf8");
    const update = /--update-env-vars ([^\s`]+)/.exec(text)?.[1];
    const remove = /--remove-env-vars ([^\s`]+)/.exec(text)?.[1];
    expect(update, "the update command sets one pair with no comma").toBe(`${FLAG_ENV}=1`);
    expect(remove, "the removal command names the flag only").toBe(FLAG_ENV);
  });

  it("F475: warns that the update copies the latest revision, or pins the approved image", () => {
    const text = readFileSync(resolve(REPO, "docs/runbooks/storytime-deploy.md"), "utf8");
    const start = text.indexOf("## The teacher routes flag");
    const rest = text.slice(start + 3);
    const section = rest.slice(0, rest.indexOf("\n## ") === -1 ? undefined : rest.indexOf("\n## "));
    expect(section, "the flag section must hold the update command").toMatch(/--update-env-vars/);
    expect(
      section,
      "the update command makes a new revision from the template of the LATEST revision, which can be a no-traffic build that Daniel has not approved; the section must say so, check the latest revision against the live revision, or pass --image of the live revision (F475)",
    ).toMatch(/latest revision|live revision|--image/i);
  });
});

describe("Phase 4 adversarial round 4: the runbook flag section after 534f9ec41", () => {
  /** The whole runbook text. */
  const runbook = (): string => readFileSync(resolve(REPO, "docs/runbooks/storytime-deploy.md"), "utf8");

  /**
   * Cuts the teacher flag section out of the runbook.
   * @returns The section text.
   */
  function section(): string {
    const text = runbook();
    const start = text.indexOf("## The teacher routes flag");
    expect(start, "the runbook must hold the flag section").toBeGreaterThanOrEqual(0);
    const rest = text.slice(start + 3);
    const end = rest.indexOf("\n## ");
    return end === -1 ? rest : rest.slice(0, end);
  }

  /**
   * Lists the lines of a text that start a gcloud services update command.
   * @param text The text to scan.
   * @returns The command lines.
   */
  function updateLines(text: string): string[] {
    return text.split("\n").filter((line) => /gcloud run services update(?!-traffic)\b/.test(line));
  }

  it("holds --no-traffic, a pinned image, and a tag on every services update line of the runbook", () => {
    const lines = updateLines(runbook());
    expect(lines.length, `update_lines=${lines.length}: the on and off commands`).toBe(2);
    for (const line of lines) {
      expect(line, "every update names --no-traffic").toContain("--no-traffic");
      expect(line, "every update pins the image").toMatch(/--image=\S+/);
      expect(line, "every update names a tag").toMatch(/--tag=[a-z][a-z0-9-]*/);
    }
    const planted = "gcloud run services update storytime-app --update-env-vars X=1";
    expect(updateLines(planted).filter((line) => !line.includes("--no-traffic")).length, "the check can fail").toBe(1);
    expect(section(), "the section holds no gcloud run deploy command").not.toMatch(/gcloud run deploy/);
    expect(runbook(), "no update sends all traffic to the latest revision").not.toMatch(/--to-latest|latestRevision=true/);
  });

  it("orders the live read, then the update, then the way back, then the tag URL check, then the traffic step", () => {
    const text = section();
    const at = (needle: string): number => {
      const index = text.indexOf(needle);
      expect(index, `the section must hold "${needle}"`).toBeGreaterThan(-1);
      return index;
    };
    const readTraffic = at("value(status.traffic)");
    const readImage = at("value(status.imageDigest)");
    const turnOn = at("--update-env-vars");
    const turnOff = at("--remove-env-vars");
    const tagCheck = at("open the tag URL");
    const trafficStep = at("traffic step (step 4)");
    expect(readTraffic, "the traffic read comes first").toBeLessThan(readImage);
    expect(readImage, "the image read comes before the update").toBeLessThan(turnOn);
    expect(turnOn, "the update comes before the way back").toBeLessThan(turnOff);
    expect(turnOff, "the way back comes before the tag URL check").toBeLessThan(tagCheck);
    expect(tagCheck, "the tag URL check comes before the traffic step").toBeLessThan(trafficStep);
    expect(text.slice(trafficStep), "the traffic step waits for Daniel's go").toMatch(/Daniel/);
  });

  it("keeps each flag tag valid, distinct from the build tags, and within the 46 character limit", () => {
    const tags = [...runbook().matchAll(/--tag=([^\s`]+)/g)].map((match) => match[1]!);
    const flagTags = tags.filter((tag) => tag.startsWith("teacher-flag"));
    expect(flagTags.length, `flag_tags=${flagTags.length}`).toBe(2);
    expect(new Set(flagTags).size, "the on tag and the off tag differ").toBe(2);
    for (const tag of flagTags) {
      expect(tag, `tag ${tag} uses lower-case letters, digits, and dashes`).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(tag.startsWith("st-"), "a flag tag never clashes with an st- build tag").toBe(false);
      expect(`${tag}${"storytime-app"}`.length, `tag ${tag} plus the service name stays within 46 characters`).toBeLessThanOrEqual(46);
    }
    expect(tags.every((tag) => tag.startsWith("teacher-flag") || tag.startsWith("st-")), `every tag of the runbook: ${tags.join(",")}`).toBe(true);
  });

  it("names the revision in the traffic step and uses update-traffic only for steps 4 and 5", () => {
    const lines = runbook().split("\n").filter((line) => /update-traffic/.test(line));
    expect(lines.length, `update_traffic_lines=${lines.length}`).toBe(2);
    for (const line of lines) {
      expect(line, "the traffic step names one revision at 100 percent").toMatch(/--to-revisions=[^\s=]*<[a-z -]+>[^\s=]*=100/);
    }
  });
});

describe("Phase 4 adversarial: the signed URL map", () => {
  /** A media part with one primary file. */
  function media(file: string): StepMedia {
    return { kind: "song", title: "T", files: [file] };
  }

  it("counts only an own, non-empty entry as a signed URL", () => {
    expect(hasSignedMedia(media("a.mp3"), { "a.mp3": "https://signed.example/1" }), "the positive control").toBe(true);
    expect(hasSignedMedia(media("a.mp3"), { "a.mp3": "" }), "an empty URL").toBe(false);
    expect(hasSignedMedia(media("a.mp3"), {}), "no entry").toBe(false);
    for (const name of ["toString", "constructor", "__proto__", "hasOwnProperty", "valueOf"]) {
      expect(hasSignedMedia(media(name), {}), `the inherited name ${name} is no signed URL`).toBe(false);
    }
    expect(hasSignedMedia({ kind: "song", title: "T", files: [] }, { "a.mp3": "x" }), "no file").toBe(false);
  });
});
