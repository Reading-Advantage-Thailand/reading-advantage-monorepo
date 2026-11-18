// @vitest-environment node
/**
 * The publish-readiness proof of the at-home release (plan task 3.0a).
 *
 * The PM puts Daniel's approval of audio, songs, and scripts for w02 to w07 in front of him on
 * 2026-11-18. After his answer, only the approval flags may change. This file proves that the
 * shipped weeks w02 to w07 become servable when `meta.status` turns `published` and the three
 * approval statuses `audio`, `song`, and `scripts` turn `approved`.
 *
 * The file reads each shipped week with the reader of the other phase 3 tests
 * (`__tests__/phase3-approved-pin.test.ts`). Each clone is a deep copy made inside the test. No
 * week fixture file sits under `__tests__`, no file outside the repository is read, and no hash
 * is used (root AGENTS.md hashing policy).
 *
 * A second block asserts the shipped state after the receipt: w02 to w07 are published, the three
 * parts are approved, and every week is ready (plan task 3.0b).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { weekSchema } from "../lib/contracts/week";
import { isWeekReady, readinessBlocker } from "../lib/readiness";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const weekDirectory = resolve(app, "content", "l2");

/** The weeks of the proof, from 2 to 7. */
const WEEKS = [2, 3, 4, 5, 6, 7];

/** The approval parts that Daniel approves for the release. */
const APPROVAL_PARTS = ["audio", "song", "scripts"] as const;

/** A week as plain JSON, for a clone. */
type Json = Record<string, unknown> & {
  meta: { status: string; [key: string]: unknown };
  approval: Record<string, { status: string; [key: string]: unknown }>;
};

/**
 * Reads one shipped week file, as the phase 3 tests do.
 * @param week The week of the level.
 * @returns The week as plain JSON.
 */
function readShippedWeek(week: number): Json {
  const path = resolve(weekDirectory, `w0${week}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

/**
 * Clones a shipped week with only the publish flags changed.
 * @param week The shipped week.
 * @returns The clone with `published` and the three approved parts.
 */
function publishClone(week: Json): Json {
  const clone = structuredClone(week) as Json;
  clone.meta.status = "published";
  for (const part of APPROVAL_PARTS) {
    clone.approval[part] = { ...clone.approval[part], status: "approved" };
  }
  return clone;
}

/**
 * Describes one parse issue as `path: message`.
 * @param issue The issue of the parse.
 * @returns The one-line description.
 */
function describeIssue(issue: { path: Array<string | number>; message: string }): string {
  return `${issue.path.join(".")}: ${issue.message}`;
}

describe("3.0a w02 to w07 publish on the flags alone", () => {
  it("parses every shipped week w02 to w07 as published with no issue", () => {
    const weeks = WEEKS.map((week) => readShippedWeek(week));
    expect(weeks.length, "The proof must read six shipped weeks (A4)").toBe(6);
    let parseOk = 0;
    for (const [index, shipped] of weeks.entries()) {
      const week = WEEKS[index];
      const clone = publishClone(shipped);
      const parsed = weekSchema.safeParse(clone);
      const issues = parsed.success ? [] : parsed.error.issues;
      const firstIssues = issues.slice(0, 3).map(describeIssue).join(" | ") || "none";
      console.log(
        `w0${week} parse_ok=${parsed.success ? 1 : 0} issues=${issues.length} ready=${
          parsed.success && isWeekReady(clone) ? 1 : 0
        }`,
      );
      expect(
        issues.length,
        `The published clone of w0${week} must parse, and its first issues are: ${firstIssues}`,
      ).toBe(0);
      if (parsed.success) parseOk += 1;
    }
    expect(parseOk, "The proof must parse six published clones (A4)").toBe(6);
  });

  it("reads every published clone of w02 to w07 as ready with no blocker", () => {
    const clones = WEEKS.map((week) => publishClone(readShippedWeek(week)));
    expect(clones.length, "The proof must clone six shipped weeks (A4)").toBe(6);
    let ready = 0;
    for (const [index, clone] of clones.entries()) {
      const week = WEEKS[index];
      const blocker = readinessBlocker(clone);
      console.log(`w0${week} ready=${isWeekReady(clone) ? 1 : 0} blocker=${blocker ?? "none"}`);
      expect(blocker, `The published clone of w0${week} must hold no readiness blocker`).toBeNull();
      expect(isWeekReady(clone), `The published clone of w0${week} must be ready`).toBe(true);
      ready += 1;
    }
    expect(ready, "The proof must read six ready clones (A4)").toBe(6);
  });
});

describe("3.0b the shipped files carry the receipt", () => {
  it("keeps the shipped w02 to w07 published, approved, and ready", () => {
    const weeks = WEEKS.map((week) => readShippedWeek(week));
    expect(weeks.length, "The proof must read six shipped weeks (A4)").toBe(6);
    let receipt = 0;
    for (const [index, week] of weeks.entries()) {
      const number = WEEKS[index];
      expect(week.meta.status, `The shipped w0${number} is not published`).toBe("published");
      for (const part of APPROVAL_PARTS) {
        expect(
          week.approval[part]?.status,
          `The ${part} approval of the shipped w0${number} is not approved`,
        ).toBe("approved");
      }
      expect(isWeekReady(week), `The shipped w0${number} must be ready`).toBe(true);
      expect(readinessBlocker(week), `The shipped w0${number} must hold no blocker`).toBeNull();
      receipt += 1;
    }
    expect(receipt, "The proof must read six published weeks (A4)").toBe(6);
    console.log(`receipt_weeks=${receipt}`);
  });
});
