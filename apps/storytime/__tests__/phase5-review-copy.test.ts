// @vitest-environment node
// Phase 5 red test for plan tasks 5.6 and 5.7: the review copy server and the review page.
//
// The review copy server lives in `apps/storytime/scripts/review/review-server.ts`. The flat path
// `apps/storytime/scripts/review-server.ts` is the second accepted path. This file is the
// contract of that module.
//
// Contract of `review-server.ts`:
//   - It exports `REVIEW_ITEMS`: the five items of FR-12. Each item holds `id`, `label`, and
//     `paths`. The five ids are `teacher-app`, `home-entry`, `read-along`, `decodable`, and
//     `song`. The paths are the routes of the milestone week (level 2, week 1):
//       teacher-app  /th/teacher/2/1 and /th/teacher/2/1/1 (the week view and one lesson day)
//       home-entry   /th/st/2/1
//       read-along   /th/st/2/1?part=book
//       decodable    /th/st/2/1?part=decodable
//       song         /th/st/2/1?part=song
//   - It exports `REVIEW_ANSWERS_FILE_NAME`: the name `review-answers-p5.json`. The answers file
//     sits in the run folder `measure/runs/storytime_app_rebuild_20261025/`.
//   - It exports `renderReviewPage()`: the HTML of the review page. Each item sits in a block with
//     the attribute `data-review-item="<id>"`. The block holds one link per route of the item,
//     with the attribute `data-review-path`. The block holds four controls: a pass control with
//     `data-review-action="pass"`, a fail control with `data-review-action="fail"`, a comment
//     control with `data-review-comment`, and a send control with `data-review-action="send"`.
//   - It exports `appendReviewAnswer(answersPath, answer)`: it appends one JSON line to the file
//     at `answersPath`. The line holds `itemId`, `verdict`, and `comment`. The verdict is `pass`
//     or `fail`.
//   - It exports `startReviewServer(options)`: the options hold `port`, `appUrl`, and
//     `answersPath`. The server serves the review page at `/review`, takes one answer at
//     `POST /review/answer`, and proxies every other path to `appUrl`. The server holds no
//     database.
//   - When the module runs as a program, it reads `--port`, `--app-url`, and `--answers`, starts
//     the server, and prints `review_port=<n>`.
//   - The teacher-app item holds a sign-in line, so Daniel can open that item. The line sits in
//     an element with the attribute `data-review-signin`, and its text is not empty.
//   - The review page holds one page-level sign-in note. The note sits in an element with the
//     attribute `data-review-signin-all`, outside every item block. The page holds exactly one
//     such element. Its text names the path `/th/sign-in`, and it says that one sign-in opens
//     all five items. The text holds the words `one sign-in` and `all five` in one sentence, in
//     either order, so a loose text cannot pass.
//   - No sign-in text of the page names `launcher` or `password`. The sign-in texts of the page
//     are the `data-review-signin` line of the teacher-app item and the `data-review-signin-all`
//     note. The check reads both texts, so it never passes on an empty list.
//   - The launch script lives in `apps/storytime/scripts/review/launch-review-copy.ts`. The flat
//     path `apps/storytime/scripts/launch-review-copy.ts` is the second accepted path. It exports
//     `planLaunch(options)`: the options hold `port`, `contentDir`, `answersPath`, `passwordFile`,
//     `logFile`, and `commit`. The plan holds the same fields and the `url` of the review page.
//     The plan refuses a port of 3005 and a port of 3099, and it refuses a password file that is
//     the log file. The function starts no server and touches no database.
//   - The launch script makes the teacher account, writes the password to the password file,
//     prints the URL, and records the commit when it runs. The unit test reads the plan only.
//
// The page holds no app code path: no file under `apps/storytime/app/` names the review page or
// the answers file. The page needs no database: the module names no database package and no
// database URL, and the answers land in a plain JSON file.
//
// The test reads no path under `measure/tracks/`, so it stays valid after the track moves to
// `measure/archive/` (A9).
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The two accepted paths of the review server module. */
const MODULE_PATHS = [
  resolve(app, "scripts", "review", "review-server.ts"),
  resolve(app, "scripts", "review-server.ts"),
];

/** The two accepted paths of the launch script of the review copy. */
const LAUNCH_PATHS = [
  resolve(app, "scripts", "review", "launch-review-copy.ts"),
  resolve(app, "scripts", "launch-review-copy.ts"),
];

/** The name of the answers file of the review page. */
const ANSWERS_FILE_NAME = "review-answers-p5.json";

/** The five ids of the items of FR-12, in the order of the page. */
const ITEM_IDS = ["teacher-app", "home-entry", "read-along", "decodable", "song"];

/** The routes of each item of FR-12 on the milestone week. */
const ITEM_PATHS: Record<string, string[]> = {
  "teacher-app": ["/th/teacher/2/1", "/th/teacher/2/1/1"],
  "home-entry": ["/th/st/2/1"],
  "read-along": ["/th/st/2/1?part=book"],
  decodable: ["/th/st/2/1?part=decodable"],
  song: ["/th/st/2/1?part=song"],
};

/** One item of the review page. */
interface ReviewItem {
  /** The machine id of the item. */
  id: string;
  /** The text of the item on the page. */
  label: string;
  /** The routes of the item on the review copy. */
  paths: string[];
}

/** One answer of one item. */
interface ReviewAnswer {
  /** The id of the item. */
  itemId: string;
  /** The verdict of the item. */
  verdict: string;
  /** The comment of the owner. */
  comment: string;
}

/** One element of the review page, found by an attribute. */
interface PageElement {
  /** The start index of the element in the page. */
  start: number;
  /** The end index of the element in the page. */
  end: number;
  /** The text of the element, with the inner tags removed. */
  text: string;
  /** The value of the attribute of the element. */
  value: string;
}

/** The options of the launch of the review copy. */
interface LaunchOptions {
  /** The port of the review server. */
  port: number;
  /** The folder that holds the received weeks. */
  contentDir: string;
  /** The path of the answers file. */
  answersPath: string;
  /** The path of the file that holds the password of the teacher account. */
  passwordFile: string;
  /** The path of the log file of the servers. */
  logFile: string;
  /** The Git commit of the tree. */
  commit: string;
}

/** The plan of the launch of the review copy. */
interface LaunchPlan extends LaunchOptions {
  /** The URL of the review page. */
  url: string;
}

/** The folder that holds the answers file of the test. */
const scratch = mkdtempSync(resolve(tmpdir(), "storytime-phase5-review-"));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/**
 * Gives the path of the review server module.
 * @returns The first path of the two accepted paths that exists.
 */
function modulePath(): string {
  const found = MODULE_PATHS.find((path) => existsSync(path));
  if (!found) {
    throw new Error(`Missing ${MODULE_PATHS.join(" or ")}`);
  }
  return found;
}

/**
 * Reads the review server module.
 * @returns The exports of the module.
 */
async function loadModule(): Promise<Record<string, unknown>> {
  const path = modulePath();
  return (await import(/* @vite-ignore */ new URL(`file://${path}`).href)) as Record<string, unknown>;
}

/**
 * Gives the path of the launch script of the review copy.
 * @returns The first path of the two accepted paths that exists.
 */
function launchPath(): string {
  const found = LAUNCH_PATHS.find((path) => existsSync(path));
  if (!found) {
    throw new Error(`Missing ${LAUNCH_PATHS.join(" or ")}`);
  }
  return found;
}

/**
 * Reads the launch script of the review copy.
 * @returns The exports of the launch script.
 */
async function loadLaunchModule(): Promise<Record<string, unknown>> {
  const path = launchPath();
  return (await import(/* @vite-ignore */ new URL(`file://${path}`).href)) as Record<string, unknown>;
}

/**
 * Gives the text of the element with an attribute in a block of the page.
 * @param block The text of the block.
 * @param name The name of the attribute.
 * @returns The text of the element, with the inner tags removed.
 */
function textOfAttribute(block: string, name: string): string {
  const hit = new RegExp(`${name}[^>]*>([\\s\\S]*?)</[^>]+>`).exec(block);
  if (!hit) return "";
  return (hit[1] ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Gives the HTML of the review page.
 * @param module The exports of the review server module.
 * @returns The HTML of the page.
 */
function renderPage(module: Record<string, unknown>): string {
  const render = module["renderReviewPage"] as (() => string) | undefined;
  expect(typeof render, "the review server module exports no function renderReviewPage").toBe(
    "function",
  );
  const page = (render as () => string)();
  expect(typeof page, "the review page is not text").toBe("string");
  return page as string;
}

/**
 * Reports whether a text holds an attribute with a value.
 * @param text The text to read.
 * @param name The name of the attribute.
 * @param value The value of the attribute.
 * @returns `true` when the attribute holds the value.
 */
function hasAttribute(text: string, name: string, value: string): boolean {
  const escape = (part: string): string => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escape(name)}=["']${escape(value)}["']`).test(text);
}

/**
 * Gives the item blocks of the review page.
 * @param page The HTML of the page.
 * @returns The text of each block, keyed by the id of the item.
 */
function blocksOf(page: string): Map<string, string> {
  const marker = /data-review-item=["']([^"']+)["']/g;
  const hits: Array<{ id: string; start: number }> = [];
  let hit = marker.exec(page);
  while (hit !== null) {
    hits.push({ id: hit[1], start: hit.index });
    hit = marker.exec(page);
  }
  const blocks = new Map<string, string>();
  hits.forEach((entry, index) => {
    const next = hits[index + 1];
    const end = next ? next.start : page.length;
    blocks.set(entry.id, page.slice(entry.start, end));
  });
  return blocks;
}

/**
 * Gives the range of the element that starts at an index.
 * @param page The HTML of the page.
 * @param index The index of the opening tag of the element.
 * @returns The start index and the end index of the element, or null when the element has no end.
 */
function elementRangeAt(page: string, index: number): { start: number; end: number } | null {
  const tag = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(page.slice(index))?.[1];
  if (!tag) return null;
  const token = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
  token.lastIndex = index;
  let depth = 0;
  let hit = token.exec(page);
  while (hit !== null) {
    if (hit[1] === "/") {
      depth -= 1;
      if (depth === 0) return { start: index, end: hit.index + hit[0].length };
    } else {
      depth += 1;
    }
    hit = token.exec(page);
  }
  return null;
}

/**
 * Gives the text of an element of the page, with the inner tags removed.
 * @param page The HTML of the page.
 * @param range The start index and the end index of the element.
 * @returns The text of the element.
 */
function innerTextOf(page: string, range: { start: number; end: number }): string {
  const openEnd = page.indexOf(">", range.start);
  const closeStart = page.lastIndexOf("</", range.end);
  const inner = page.slice(openEnd + 1, closeStart > openEnd ? closeStart : range.end);
  return inner.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Gives every element of the page that holds an attribute.
 * @param page The HTML of the page.
 * @param name The name of the attribute.
 * @returns The range, the text, and the value of each element.
 */
function pageElements(page: string, name: string): PageElement[] {
  const open = new RegExp(
    `<([a-zA-Z][a-zA-Z0-9-]*)[^>]*\\s${name}(?=[\\s=/>])(?:=["']([^"']*)["'])?[^>]*>`,
    "g",
  );
  const found: PageElement[] = [];
  let hit = open.exec(page);
  while (hit !== null) {
    const range = elementRangeAt(page, hit.index);
    if (range) {
      found.push({
        start: range.start,
        end: range.end,
        text: innerTextOf(page, range),
        value: hit[2] ?? "",
      });
    }
    hit = open.exec(page);
  }
  return found;
}

/**
 * Gives the source files under a folder.
 * @param folder The folder to read.
 * @returns The path of every TypeScript file under the folder.
 */
function sourceFilesUnder(folder: string): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name)) found.push(path);
    }
  };
  walk(folder);
  return found;
}

/**
 * Writes one answer through the module of the review server.
 * @param module The exports of the review server module.
 * @param answersPath The path of the answers file.
 * @param answer The answer to write.
 */
function writeAnswer(
  module: Record<string, unknown>,
  answersPath: string,
  answer: ReviewAnswer,
): void {
  const append = module["appendReviewAnswer"] as
    | ((path: string, answer: ReviewAnswer) => unknown)
    | undefined;
  expect(
    typeof append,
    "the review server module exports no function appendReviewAnswer",
  ).toBe("function");
  (append as (path: string, answer: ReviewAnswer) => unknown)(answersPath, answer);
}

describe("Phase 5 review copy and review page (tasks 5.6 and 5.7, spec FR-5 and FR-12)", () => {
  it("names the review server module of tasks 5.6 and 5.7", () => {
    expect(
      MODULE_PATHS.some((path) => existsSync(path)),
      `Missing ${MODULE_PATHS.join(" or ")}`,
    ).toBe(true);
  });

  it("lists the five items of FR-12, each with the four controls", async () => {
    const module = await loadModule();
    const items = module["REVIEW_ITEMS"] as ReviewItem[] | undefined;
    expect(Array.isArray(items), "the module exports no list REVIEW_ITEMS").toBe(true);
    const list = items as ReviewItem[];
    expect(list.length, "the review page holds other than the five items of FR-12").toBe(5);
    expect(
      list.map((item) => item.id),
      "the five items of FR-12 hold other ids",
    ).toEqual(ITEM_IDS);
    for (const item of list) {
      expect(typeof item.label, `the item ${item.id} holds no label`).toBe("string");
      expect(item.label.trim().length, `the item ${item.id} holds an empty label`).toBeGreaterThan(
        0,
      );
      expect(
        [...(item.paths ?? [])].sort(),
        `the item ${item.id} holds other routes than the milestone week`,
      ).toEqual([...ITEM_PATHS[item.id]].sort());
    }
    const blocks = blocksOf(renderPage(module));
    expect(blocks.size, "the review page holds other than five item blocks").toBe(5);
    for (const id of ITEM_IDS) {
      const block = blocks.get(id) ?? "";
      expect(block.length, `the review page holds no block for the item ${id}`).toBeGreaterThan(0);
      expect(
        hasAttribute(block, "data-review-action", "pass"),
        `the item ${id} holds no pass control`,
      ).toBe(true);
      expect(
        hasAttribute(block, "data-review-action", "fail"),
        `the item ${id} holds no fail control`,
      ).toBe(true);
      expect(
        /data-review-comment/.test(block),
        `the item ${id} holds no comment control`,
      ).toBe(true);
      expect(
        hasAttribute(block, "data-review-action", "send"),
        `the item ${id} holds no send control`,
      ).toBe(true);
      for (const path of ITEM_PATHS[id]) {
        expect(
          hasAttribute(block, "data-review-path", path),
          `the item ${id} holds no link to the route ${path}`,
        ).toBe(true);
      }
    }
  });

  it("writes the answers to the JSON file of the run folder", async () => {
    const module = await loadModule();
    expect(
      module["REVIEW_ANSWERS_FILE_NAME"],
      "the module names other answers file than review-answers-p5.json",
    ).toBe(ANSWERS_FILE_NAME);
    const answersPath = resolve(scratch, ANSWERS_FILE_NAME);
    writeAnswer(module, answersPath, {
      itemId: "song",
      verdict: "pass",
      comment: "the song plays",
    });
    writeAnswer(module, answersPath, {
      itemId: "decodable",
      verdict: "fail",
      comment: "the sound cuts",
    });
    expect(existsSync(answersPath), `the answers file ${answersPath} was not written`).toBe(true);
    const lines = readFileSync(answersPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    expect(lines.length, "the answers file holds other than two answers").toBe(2);
    const answers = lines.map((line) => JSON.parse(line) as ReviewAnswer);
    expect(answers[0]?.itemId, "the first answer names another item").toBe("song");
    expect(answers[0]?.verdict, "the first answer holds another verdict").toBe("pass");
    expect(answers[0]?.comment, "the first answer holds no comment").toBe("the song plays");
    expect(answers[1]?.itemId, "the second answer names another item").toBe("decodable");
    expect(answers[1]?.verdict, "the second answer holds another verdict").toBe("fail");
  });

  it("holds no app code path", async () => {
    const path = modulePath();
    expect(existsSync(path), `Missing ${path}`).toBe(true);
    const routeFiles = sourceFilesUnder(resolve(app, "app"));
    expect(routeFiles.length, "the app route tree holds no source file").toBeGreaterThan(0);
    const offenders = routeFiles.filter((file) => {
      const text = readFileSync(file, "utf8");
      return (
        text.includes(ANSWERS_FILE_NAME) ||
        text.includes("data-review-item") ||
        text.includes("REVIEW_ITEMS")
      );
    });
    expect(
      offenders.map((file) => relative(app, file)),
      "an app route serves the review page",
    ).toEqual([]);
  });

  it("needs no database", async () => {
    const path = modulePath();
    expect(existsSync(path), `Missing ${path}`).toBe(true);
    const source = readFileSync(path, "utf8");
    expect(source, "the review server names a database package").not.toMatch(
      /@reading-advantage\/db|drizzle-orm/,
    );
    expect(source, "the review server names a database URL").not.toMatch(/DATABASE_URL|postgres:\/\//);
    const module = await loadModule();
    const answersPath = resolve(scratch, "no-database-answers.json");
    writeAnswer(module, answersPath, {
      itemId: "home-entry",
      verdict: "pass",
      comment: "the entry page shows the three tiles",
    });
    const lines = readFileSync(answersPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    expect(lines.length, "the answer was lost without a database").toBe(1);
  });

  it("holds a sign-in line in the teacher-app item of the review page", async () => {
    const module = await loadModule();
    const blocks = blocksOf(renderPage(module));
    const block = blocks.get("teacher-app") ?? "";
    expect(block.length, "the review page holds no block for the item teacher-app").toBeGreaterThan(
      0,
    );
    expect(block, "the teacher-app item holds no sign-in line").toMatch(/data-review-signin/);
    const text = textOfAttribute(block, "data-review-signin");
    expect(text.length, "the sign-in line of the teacher-app item holds no text").toBeGreaterThan(0);
    const tells = ["sign", "teach-01", "/th/sign-in"].some((hint) =>
      text.toLowerCase().includes(hint.toLowerCase()),
    );
    expect(tells, "the sign-in line of the teacher-app item names no sign-in").toBe(true);
  });

  it("holds one page-level sign-in note outside every item block", async () => {
    const module = await loadModule();
    const page = renderPage(module);
    const notes = pageElements(page, "data-review-signin-all");
    expect(
      notes.length,
      "the review page holds no page-level sign-in note with the attribute data-review-signin-all",
    ).toBe(1);
    const note = notes[0];
    expect(note, "the review page holds no page-level sign-in note").toBeDefined();
    const text = note?.text ?? "";
    expect(text.length, "the page-level sign-in note holds no text").toBeGreaterThan(0);
    expect(
      text.toLowerCase(),
      "the page-level sign-in note names no path /th/sign-in",
    ).toContain("/th/sign-in");
    // A loose text cannot pass: the note must hold the words "one sign-in" and "all five" in
    // one sentence, in either order. A note that only says "sign-in", that writes the count as
    // the digit 5, or that puts the two claims in two different sentences fails this check.
    const claims = /one sign[-\s]?in[^.]{0,140}all five|all five[^.]{0,140}one sign[-\s]?in/i;
    expect(
      claims.test(text),
      "the page-level sign-in note does not say that one sign-in opens all five items",
    ).toBe(true);
    const items = pageElements(page, "data-review-item");
    expect(items.length, "the review page holds other than five item blocks").toBe(5);
    for (const item of items) {
      const inside = (note?.start ?? 0) < item.end && (note?.end ?? 0) > item.start;
      expect(
        inside,
        `the page-level sign-in note sits inside the item block ${item.value}`,
      ).toBe(false);
    }
  });

  it("names no launcher and no password in the sign-in texts of the review page", async () => {
    const module = await loadModule();
    const page = renderPage(module);
    const notes = pageElements(page, "data-review-signin-all");
    expect(
      notes.length,
      "the review page holds no page-level sign-in note, so no sign-in text covers the five items",
    ).toBe(1);
    const teacherBlock = blocksOf(page).get("teacher-app") ?? "";
    expect(
      teacherBlock,
      "the teacher-app item holds no sign-in line with the attribute data-review-signin",
    ).toMatch(/data-review-signin(?=[\s=/>])/);
    const lines = pageElements(page, "data-review-signin");
    expect(
      lines.length,
      "the review page holds no sign-in line for the teacher-app item",
    ).toBeGreaterThanOrEqual(1);
    const texts = [...notes, ...lines].map((element) => element.text.toLowerCase());
    expect(texts.length, "the review page holds fewer than two sign-in texts").toBeGreaterThanOrEqual(
      2,
    );
    for (const text of texts) {
      expect(text, "a sign-in text of the review page names the launcher").not.toContain("launcher");
      expect(text, "a sign-in text of the review page names the password").not.toContain("password");
    }
  });

  it("holds a launch script that plans the review copy without a server or a database", async () => {
    const path = launchPath();
    expect(existsSync(path), `Missing ${path}`).toBe(true);
    const module = await loadLaunchModule();
    const plan = module["planLaunch"] as ((options: LaunchOptions) => LaunchPlan) | undefined;
    expect(typeof plan, "the launch script exports no function planLaunch").toBe("function");
    const options: LaunchOptions = {
      port: 45123,
      contentDir: "/tmp/storytime-review/content",
      answersPath: "/tmp/storytime-review/review-answers-p5.json",
      passwordFile: "/tmp/storytime-review/teacher-password.txt",
      logFile: "/tmp/storytime-review/servers.log",
      commit: "0123456789abcdef0123456789abcdef01234567",
    };
    const value = (plan as (options: LaunchOptions) => LaunchPlan)(options);
    expect(value.port, "the plan holds no port").toBe(options.port);
    expect(value.url, "the URL of the plan holds no port").toContain(String(options.port));
    expect(value.passwordFile, "the plan holds no password file").toBe(options.passwordFile);
    expect(value.logFile, "the plan holds no log file").toBe(options.logFile);
    expect(value.commit, "the plan holds no commit").toBe(options.commit);
  });

  it("refuses the ports 3005 and 3099, and a password file that is the log file", async () => {
    const path = launchPath();
    expect(existsSync(path), `Missing ${path}`).toBe(true);
    const module = await loadLaunchModule();
    const plan = module["planLaunch"] as ((options: LaunchOptions) => LaunchPlan) | undefined;
    expect(typeof plan, "the launch script exports no function planLaunch").toBe("function");
    const options: LaunchOptions = {
      port: 45123,
      contentDir: "/tmp/storytime-review/content",
      answersPath: "/tmp/storytime-review/review-answers-p5.json",
      passwordFile: "/tmp/storytime-review/teacher-password.txt",
      logFile: "/tmp/storytime-review/servers.log",
      commit: "0123456789abcdef0123456789abcdef01234567",
    };
    for (const port of [3005, 3099]) {
      expect(
        () => (plan as (options: LaunchOptions) => LaunchPlan)({ ...options, port }),
        `the plan takes the port ${port}`,
      ).toThrow(/port/i);
    }
    expect(
      () =>
        (plan as (options: LaunchOptions) => LaunchPlan)({
          ...options,
          passwordFile: options.logFile,
        }),
      "the plan puts the password in the log file",
    ).toThrow();
  });
});
