// @vitest-environment node
/**
 * The approved A-42 pin of the at-home release (plan task 2.1, strategy P2 rows P1 to P8).
 *
 * The file reads the shipped week files of the app and the source record. The pin of the task is
 * the Workbooks commit `70278a9b`, whose week files hold `approval.loops` `approved` and whose
 * statuses do not move: w01 stays `published`, and w02 to w08 stay `draft`. The loops approval
 * gates the routines and never opens a draft week.
 *
 * A broken copy is a deep clone of a shipped week with one change, made inside the test. No week
 * fixture file sits under `__tests__`.
 *
 * The rows P1 to P7 fail at the base, because the shipped content is the pin before the approval.
 * Row P8 holds at both pins: the statuses are already the statuses of the release, and the
 * positive control proves that a published week reaches the readiness rule.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadVisibleWeek } from "../lib/content";
import { isWeekReady, readinessBlocker } from "../lib/readiness";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDirectory = resolve(app, "content");
const weekDirectory = resolve(contentDirectory, "l2");

/** The approved pin that the source record must name. */
const PIN = "70278a9beb8ef7314d98df80e0462892a0ca5019";

/** The date of the loops approval of the pin. */
const LOOPS_DATE = "2026-11-15";

/** The weeks of the release, from 1 to 8. */
const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8];

/** The draft weeks of the release, from 2 to 8. */
const DRAFT_WEEKS = [2, 3, 4, 5, 6, 7, 8];

/** A word of an unused approval, which the pin must not hold. */
const DRAFT_WORDS = /^(draft|pending|tbd|tba|todo|n\/a|none|waiting|not approved)$/i;

/** The media approval parts that the readiness rule reads. */
const MEDIA_PARTS = ["images", "audio", "song"] as const;

/** A week as plain JSON, for a broken copy. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const previousContentDir = process.env.STORYTIME_CONTENT_DIR;
const previousDraftMedia = process.env.STORYTIME_SHOW_DRAFT_MEDIA;

beforeEach(() => {
  delete process.env.STORYTIME_CONTENT_DIR;
  delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
});

afterEach(() => {
  if (previousContentDir === undefined) delete process.env.STORYTIME_CONTENT_DIR;
  else process.env.STORYTIME_CONTENT_DIR = previousContentDir;
  if (previousDraftMedia === undefined) delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
  else process.env.STORYTIME_SHOW_DRAFT_MEDIA = previousDraftMedia;
  vi.restoreAllMocks();
});

/**
 * Reads one shipped week file.
 * @param week The week of the level.
 * @returns The week as plain JSON.
 */
function readShippedWeek(week: number): Json {
  return JSON.parse(readFileSync(resolve(weekDirectory, `w0${week}.json`), "utf8")) as Json;
}

/**
 * Reads the loops approval of a week.
 * @param week The week.
 * @returns The loops part, or undefined when the week holds none.
 */
function loopsOf(week: Json): Json | undefined {
  const loops = week.approval?.loops;
  return loops && typeof loops === "object" ? (loops as Json) : undefined;
}

/**
 * Loads one shipped week with the loader of the app and records its log lines.
 * @param week The week of the level.
 * @returns The visible week and the log lines of the loader.
 */
async function loadShipped(
  week: number,
): Promise<{ visible: Awaited<ReturnType<typeof loadVisibleWeek>>; warnings: string[] }> {
  process.env.STORYTIME_CONTENT_DIR = contentDirectory;
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const visible = await loadVisibleWeek(2, week);
  const warnings = warn.mock.calls.map((call) => String(call[0]));
  warn.mockRestore();
  return { visible, warnings };
}

describe("P1 to P4 the loops approval of the approved pin", () => {
  it("holds an approved loops part in every shipped week", () => {
    const weeks = WEEKS.map((week) => readShippedWeek(week));
    expect(weeks.length, "the test must read eight shipped weeks (A4)").toBe(8);
    const approved = weeks.filter((week) => loopsOf(week)?.status === "approved").length;
    console.log(`approved_weeks=${approved}`);
    expect(approved, "approved_weeks").toBe(8);
  });

  it("holds the approval date of 2026-11-15 in every shipped week", () => {
    const weeks = WEEKS.map((week) => readShippedWeek(week));
    const valid = weeks.filter((week) => {
      const date = loopsOf(week)?.date;
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return false;
      return date === LOOPS_DATE;
    }).length;
    console.log(`loops_date_valid=${valid}`);
    expect(valid, "loops_date_valid").toBe(8);
  });

  it("holds non-empty approval words that are not a draft word", () => {
    const weeks = WEEKS.map((week) => readShippedWeek(week));
    const nonempty = weeks.filter((week) => {
      const words = loopsOf(week)?.words;
      if (typeof words !== "string") return false;
      const trimmed = words.trim();
      return trimmed.length > 0 && !DRAFT_WORDS.test(trimmed);
    }).length;
    console.log(`loops_words_nonempty=${nonempty}`);
    expect(nonempty, "loops_words_nonempty").toBe(8);
  });

  it("names the Tasks item that approved the loops", () => {
    const weeks = WEEKS.map((week) => readShippedWeek(week));
    const present = weeks.filter((week) => {
      const source = loopsOf(week)?.source;
      return typeof source === "string" && /Google Tasks/.test(source) && /PM item/.test(source);
    }).length;
    console.log(`loops_source_present=${present}`);
    expect(present, "loops_source_present").toBe(8);
  });
});

describe("P5 the source record names the approved pin", () => {
  it("records the full approved pin", () => {
    const record = JSON.parse(
      readFileSync(resolve(contentDirectory, "source.json"), "utf8"),
    ) as { commit?: string; files?: string[] };
    const full = typeof record.commit === "string" && /^[0-9a-f]{40}$/.test(record.commit);
    console.log(`pin=${record.commit} full_pin=${full ? 1 : 0}`);
    expect(full, "the source record holds a full commit id").toBe(true);
    expect(record.commit, "the source record names the approved pin").toBe(PIN);
    expect(record.files?.length, "the source record lists eight week files").toBe(8);
  });
});

describe("P6 the loops approval does not open a draft week", () => {
  it("keeps w02 to w08 at 404 with the draft reason, with the draft-media switch on", async () => {
    let approvedDraftWeeks = 0;
    for (const week of DRAFT_WEEKS) {
      const shipped = readShippedWeek(week);
      expect(loopsOf(shipped)?.status, `the approved pin approves the loops of w0${week}`).toBe(
        "approved",
      );
      const { visible, warnings } = await loadShipped(week);
      expect(visible, `the approved pin must not open w0${week}`).toBeNull();
      expect(
        warnings.some((line) => line.includes("blocked: draft")),
        `the loader names the draft reason for w0${week}: ${warnings.join(" | ")}`,
      ).toBe(true);
      process.env.STORYTIME_SHOW_DRAFT_MEDIA = "1";
      const withMedia = await loadShipped(week);
      delete process.env.STORYTIME_SHOW_DRAFT_MEDIA;
      expect(
        withMedia.visible,
        `the draft-media switch must not open w0${week}`,
      ).toBeNull();
      approvedDraftWeeks += 1;
    }
    console.log(`loops_approved_draft_weeks=${approvedDraftWeeks}`);
    expect(approvedDraftWeeks, "loops_approved_draft_weeks").toBe(7);
  });
});

describe("P7 w08 of the approved pin", () => {
  it("holds no book, stays draft, holds approved loops, and is not ready", () => {
    const week = readShippedWeek(8);
    const loops = loopsOf(week)?.status;
    const ready = isWeekReady(week);
    console.log(`w08_books=${week.books.length} w08_ready=${ready ? 1 : 0} w08_loops=${loops}`);
    expect(week.books.length, "the shipped w08 holds no book").toBe(0);
    expect(week.meta.status, "the shipped w08 stays a draft").toBe("draft");
    expect(loops, "the shipped w08 holds approved loops").toBe("approved");
    expect(ready, "the shipped w08 is not ready").toBe(false);
  });
});

describe("P8 the statuses hold and a published week reaches readiness", () => {
  it("keeps one published week and seven draft weeks", () => {
    const statuses = WEEKS.map((week) => readShippedWeek(week).meta.status);
    const published = statuses.filter((status) => status === "published").length;
    const draft = statuses.filter((status) => status === "draft").length;
    console.log(`published_weeks=${published} draft_weeks=${draft}`);
    expect(statuses.length, "the test must read eight statuses (A4)").toBe(8);
    expect(published, "published_weeks").toBe(1);
    expect(draft, "draft_weeks").toBe(7);
  });

  it("makes a published clone ready when its media parts are approved", () => {
    // The pin keeps `audio` and `song` at draft for w02 to w08, so the draft status is not the
    // only blocker of a published clone. The control approves the three media parts of the
    // readiness rule, then asserts the readiness result.
    const clone = structuredClone(readShippedWeek(2)) as Json;
    clone.meta.status = "published";
    const before = readinessBlocker(clone);
    for (const part of MEDIA_PARTS) clone.approval[part] = { ...clone.approval[part], status: "approved" };
    const ready = isWeekReady(clone);
    console.log(`published_clone_blocker=${before} published_clone_ready=${ready ? 1 : 0}`);
    expect(before, "the media approvals block the published clone before the control").toBe(
      "media_not_approved",
    );
    expect(ready, "published_clone_ready").toBe(true);
  });
});
