// @vitest-environment node
/**
 * Phase 3 adversarial: the deploy-runbook scan for the review switch (track
 * storytime_look_20261107, review B F1; PM decision 2026-11-09).
 *
 * The deploy-config guard of look-draft-week-switch.test.ts reads the build files. This scan
 * extends the same guard to the tracked runbooks: a runbook command that sets
 * STORYTIME_REVIEW_DRAFT_WEEKS on the deploy would show the draft weeks on the live app. The
 * files_checked floor guards the scan itself (A4). The positive control proves the scan catches
 * such a line.
 *
 * Changed in task 7.7 (PM 2026-11-14 15:20): the release (live) deploy step must remove the review
 * switches with `--remove-env-vars=...` and its env-name compare must name them as absent, so the
 * runbook has to name the switches. The scan now bans a line that SETS a draft switch (a set or
 * update flag, or `NAME=`), and it still bans the client-side look-alike name. A line that removes
 * or compares a name is not a hit. The teacher routes flag is not in the setter list: its on
 * command is a documented no-traffic step of the runbook.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** The client-side look-alike name that must never appear in a runbook. */
const BANNED_NAMES = ["NEXT_PUBLIC_STORYTIME_REVIEW"];

/** The draft switches that a runbook may name to remove or to compare, never to set. */
const DRAFT_SWITCHES = ["STORYTIME_REVIEW_DRAFT_WEEKS", "STORYTIME_SHOW_DRAFT_MEDIA"];

/** The gcloud flags that set a value. */
const SETTER_FLAG_RE = /--(?:set|update)-(?:env-vars|secrets)\b/;

/** Lists the tracked runbooks of the repository. */
function listRunbooks(): string[] {
  const out = execFileSync("git", ["ls-files", "docs/runbooks/*.md"], {
    cwd: repo,
    encoding: "utf8",
  });
  return out.split("\n").filter((line) => line.length > 0);
}

/** Returns the banned names that one text holds. */
function findBannedNames(text: string): string[] {
  return BANNED_NAMES.filter((name) => text.includes(name));
}

/**
 * Returns the lines of a text that set a draft switch. A backslash continuation joins lines.
 * @param text The text to scan.
 * @returns One entry per line that holds a draft switch name with a set or update flag, or with
 *   an assignment (`NAME=`).
 */
function findSetterLines(text: string): string[] {
  const joined = text.replace(/\\\n\s*/g, " ");
  return joined.split("\n").filter((line) =>
    DRAFT_SWITCHES.some(
      (name) => line.includes(`${name}=`) || (line.includes(name) && SETTER_FLAG_RE.test(line)),
    ),
  );
}

describe("the deploy runbooks never name the review switch as a setting", () => {
  it("scans at least one tracked runbook, and the storytime runbook is among them", () => {
    const files = listRunbooks();
    console.log(`runbook_files_checked=${files.length}`);
    expect(files.length, "runbook_files_checked must be above zero").toBeGreaterThan(0);
    expect(files, "the scan must cover the storytime deploy runbook").toContain(
      "docs/runbooks/storytime-deploy.md",
    );
  });

  it("finds no client-side look-alike name in any tracked runbook", () => {
    const hits: string[] = [];
    for (const file of listRunbooks()) {
      const text = readFileSync(resolve(repo, file), "utf8");
      for (const name of findBannedNames(text)) hits.push(`${file}: ${name}`);
    }
    expect(hits, "a runbook must never name a client-side review switch").toEqual([]);
  });

  it("finds no line that sets a draft switch in any tracked runbook", () => {
    const hits: string[] = [];
    for (const file of listRunbooks()) {
      const text = readFileSync(resolve(repo, file), "utf8");
      for (const line of findSetterLines(text)) hits.push(`${file}: ${line.trim()}`);
    }
    expect(hits, "a runbook must never set a draft switch").toEqual([]);
  });

  it("positive control: a runbook line that sets the switch fails the scan", () => {
    const source = readFileSync(resolve(repo, "docs/runbooks/storytime-deploy.md"), "utf8");
    const poisoned = `${source}\n   gcloud run services update storytime-app --set-env-vars=STORYTIME_REVIEW_DRAFT_WEEKS=1\n`;
    const dir = mkdtempSync(join(tmpdir(), "storytime-runbook-scan-"));
    try {
      const copy = join(dir, "storytime-deploy.md");
      writeFileSync(copy, poisoned);
      const hits = findSetterLines(readFileSync(copy, "utf8"));
      expect(hits.join("\n"), "the scan must catch a poisoned runbook").toContain(
        "STORYTIME_REVIEW_DRAFT_WEEKS",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("positive control: each draft switch is caught in a set, an update, an assignment, and a continuation", () => {
    for (const name of DRAFT_SWITCHES) {
      const plants = [
        `gcloud run services update s --set-env-vars=${name}=1`,
        `gcloud run services update s --update-env-vars ${name}=1`,
        `export ${name}=1`,
        `gcloud run services update s --update-env-vars \\\n   ${name}`,
        `gcloud run services update s --update-secrets ${name}=x:latest`,
      ];
      for (const plant of plants) {
        expect(findSetterLines(plant).length, `the scan must catch: ${plant.replace(/\n/g, " ")}`).toBe(1);
      }
    }
  });

  it("negative control: a line that removes or compares a switch is not a hit", () => {
    const safe = [
      "--remove-env-vars=STORYTIME_REVIEW_DRAFT_WEEKS,STORYTIME_SHOW_DRAFT_MEDIA,STORYTIME_TEACHER_ROUTES",
      "gcloud run services update s --remove-env-vars STORYTIME_SHOW_DRAFT_MEDIA --no-traffic",
      "The names STORYTIME_REVIEW_DRAFT_WEEKS and STORYTIME_SHOW_DRAFT_MEDIA must be absent on the live revision.",
    ];
    for (const line of safe) {
      expect(findSetterLines(line), `the scan must not flag: ${line}`).toEqual([]);
    }
  });
});
