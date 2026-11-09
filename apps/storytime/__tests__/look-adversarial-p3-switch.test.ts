// @vitest-environment node
/**
 * Phase 3 adversarial: the review-draft-weeks switch (track storytime_look_20261107, strategy
 * P3.11, review B F1).
 *
 * The switch is the server environment value STORYTIME_REVIEW_DRAFT_WEEKS, and only the exact
 * string "1" turns it on (lib/content.ts showDraftWeeks). These cases attack the value matrix,
 * the client-name lookalike, and the weeks that must never open: w02 holds draft media approval
 * and w08 holds no books.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

import { DRAFT_WEEKS_ENV, loadVisibleWeek, showDraftWeeks } from "../lib/content";
import { readinessBlocker } from "../lib/readiness";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_NAMES = ["STORYTIME_REVIEW_DRAFT_WEEKS", "NEXT_PUBLIC_STORYTIME_REVIEW_DRAFT_WEEKS"];

/** Removes every switch name from the environment. */
function clearEnv(): void {
  for (const name of ENV_NAMES) delete process.env[name];
}

/** Reads one shipped week file as plain JSON. */
function loadWeek(file: string): Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return JSON.parse(readFileSync(resolve(app, "content", "l2", file), "utf8"));
}

afterEach(clearEnv);

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
  it("keeps w02 closed with the switch off, because its status is draft", async () => {
    clearEnv();
    expect(await loadVisibleWeek(2, 2), "a draft week stays closed without the switch").toBeNull();
  });

  it("keeps w02 closed with the switch on, because its media approval is draft", async () => {
    process.env[DRAFT_WEEKS_ENV] = "1";
    expect(
      await loadVisibleWeek(2, 2),
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
