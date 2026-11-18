// @vitest-environment node
/**
 * Phase 3 adversarial: the review-draft-weeks switch (track storytime_look_20261107, strategy
 * P3.11, review B F1).
 *
 * The switch is the server environment value STORYTIME_REVIEW_DRAFT_WEEKS, and only the exact
 * string "1" turns it on (lib/content.ts showDraftWeeks). These cases attack the value matrix,
 * the client-name lookalike, and the weeks that must never open: w08 is the draft week of the
 * shipped content, and a clone with draft media approval stays closed under the switch.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { DRAFT_WEEKS_ENV, loadVisibleWeek, showDraftWeeks } from "../lib/content";
import { readinessBlocker, type WeekReadiness } from "../lib/readiness";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_NAMES = ["STORYTIME_REVIEW_DRAFT_WEEKS", "NEXT_PUBLIC_STORYTIME_REVIEW_DRAFT_WEEKS"];

/** One media part of a week, with the status that the readiness rule reads. */
interface LoadedApprovalPart {
  status: string;
}

/** One picture of a loaded week, with the file that production has made. */
interface LoadedPicture {
  file?: string;
}

/** One page of a loaded week. */
interface LoadedPage {
  image: LoadedPicture;
}

/** One book of a loaded week. */
interface LoadedBook {
  kind: string;
  pages: LoadedPage[];
}

/** A loaded week file, shaped so that a case can change its fields. */
interface LoadedWeek extends WeekReadiness {
  approval: Record<string, LoadedApprovalPart>;
  books: LoadedBook[];
}

/** Removes every switch name from the environment. */
function clearEnv(): void {
  for (const name of ENV_NAMES) delete process.env[name];
}

/** Reads one shipped week file as plain JSON. */
function loadWeek(file: string): LoadedWeek {
  return JSON.parse(readFileSync(resolve(app, "content", "l2", file), "utf8")) as LoadedWeek;
}

/** The scratch content folders of the file; the test removes them after each case. */
const scratch: string[] = [];

/**
 * Loads one clone with the loader of the app in a scratch content folder.
 *
 * The shipped weeks w01 to w07 are published and ready, so the case that needs a draft week with
 * draft media approval writes a clone of w02 into a scratch folder. The test never writes in
 * `apps/storytime/content`.
 * @param week The week of the level.
 * @param clone The clone to load.
 * @returns The visible week, or null when the week stays closed.
 */
async function loadClone(week: number, clone: unknown): Promise<unknown> {
  const directory = mkdtempSync(join(tmpdir(), "storytime-switch-"));
  scratch.push(directory);
  mkdirSync(resolve(directory, "l2"), { recursive: true });
  writeFileSync(
    resolve(directory, "l2", `w${String(week).padStart(2, "0")}.json`),
    JSON.stringify(clone),
  );
  const previous = process.env.STORYTIME_CONTENT_DIR;
  process.env.STORYTIME_CONTENT_DIR = directory;
  try {
    return await loadVisibleWeek(2, week);
  } finally {
    if (previous === undefined) delete process.env.STORYTIME_CONTENT_DIR;
    else process.env.STORYTIME_CONTENT_DIR = previous;
  }
}

afterEach(() => {
  clearEnv();
  for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("the switch value matrix", () => {
  it.each([
    ["1", true],
    ["1 ", false],
    [" 1", false],
    ["01", false],
    ["TRUE", false],
    ["true", false],
    ["yes", false],
    ["2", false],
    ["１", false],
    ["", false],
  ])("the value %j opens the draft weeks: %s", (value, expected) => {
    clearEnv();
    process.env[DRAFT_WEEKS_ENV] = value;
    expect(showDraftWeeks(), `value ${JSON.stringify(value)}`).toBe(expected);
  });

  it("stays off when the variable is not set", () => {
    clearEnv();
    expect(showDraftWeeks()).toBe(false);
  });

  it("ignores the client-name lookalike NEXT_PUBLIC_STORYTIME_REVIEW_DRAFT_WEEKS", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_STORYTIME_REVIEW_DRAFT_WEEKS = "1";
    expect(showDraftWeeks(), "a client name must never turn the server switch on").toBe(false);
  });

  it("reads no NEXT_PUBLIC_ name in lib/content.ts", () => {
    const source = readFileSync(resolve(app, "lib", "content.ts"), "utf8");
    expect(source.includes("NEXT_PUBLIC_"), "the switch must stay a server value").toBe(false);
  });
});

describe("the draft weeks under the switch", () => {
  it("keeps w08 closed with the switch off, because its status is draft", async () => {
    clearEnv();
    expect(await loadVisibleWeek(2, 8), "a draft week stays closed without the switch").toBeNull();
  });

  it("keeps a draft clone with draft media approval closed with the switch on", async () => {
    process.env[DRAFT_WEEKS_ENV] = "1";
    const clone = loadWeek("w02.json");
    clone.meta.status = "draft";
    clone.approval.audio.status = "draft";
    clone.approval.song.status = "draft";
    expect(
      await loadClone(2, clone),
      "the switch lifts only the draft blocker; unapproved media stays closed",
    ).toBeNull();
  });

  it("opens no week that does not exist, even with the switch on", async () => {
    process.env[DRAFT_WEEKS_ENV] = "1";
    expect(await loadVisibleWeek(2, 9), "week 9 does not exist").toBeNull();
  });

  it("flags the draft media approval of w02", () => {
    const week = loadWeek("w02.json");
    week.meta.status = "published";
    week.approval.audio.status = "draft";
    expect(readinessBlocker(week), "draft audio approval blocks the week").toBe("media_not_approved");
  });

  it("flags a missing picture on an otherwise ready week", () => {
    const week = loadWeek("w02.json");
    week.meta.status = "published";
    for (const part of ["images", "audio", "song"]) week.approval[part].status = "approved";
    delete week.books[0].pages[0].image.file;
    expect(readinessBlocker(week), "a page without a file blocks the week").toBe("missing_picture");
  });

  it("never opens w08, which holds no books, even with the switch on", async () => {
    process.env[DRAFT_WEEKS_ENV] = "1";
    expect(await loadVisibleWeek(2, 8), "a week with no books never opens").toBeNull();
    const week = loadWeek("w08.json");
    expect(week.books, "w08 holds no book").toHaveLength(0);
    expect(readinessBlocker(week), "the draft status blocks first").toBe("draft");
    const asPublished = loadWeek("w08.json");
    asPublished.meta.status = "published";
    expect(readinessBlocker(asPublished), "a week with no book lacks every picture").toBe(
      "missing_picture",
    );
  });
});
