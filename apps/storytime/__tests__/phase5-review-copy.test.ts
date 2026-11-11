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
});
