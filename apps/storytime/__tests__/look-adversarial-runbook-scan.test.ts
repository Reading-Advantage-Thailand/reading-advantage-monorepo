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
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** The switch names that must never appear in a runbook. */
const BANNED_NAMES = ["STORYTIME_REVIEW_DRAFT_WEEKS", "NEXT_PUBLIC_STORYTIME_REVIEW"];

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

describe("the deploy runbooks never name the review switch", () => {
  it("scans at least one tracked runbook, and the storytime runbook is among them", () => {
    const files = listRunbooks();
    console.log(`runbook_files_checked=${files.length}`);
    expect(files.length, "runbook_files_checked must be above zero").toBeGreaterThan(0);
    expect(files, "the scan must cover the storytime deploy runbook").toContain(
      "docs/runbooks/storytime-deploy.md",
    );
  });

  it("finds no switch name in any tracked runbook", () => {
    const hits: string[] = [];
    for (const file of listRunbooks()) {
      const text = readFileSync(resolve(repo, file), "utf8");
      for (const name of findBannedNames(text)) hits.push(`${file}: ${name}`);
    }
    expect(hits, "a runbook must never set the review switch").toEqual([]);
  });

  it("positive control: a runbook line that sets the switch fails the scan", () => {
    const source = readFileSync(resolve(repo, "docs/runbooks/storytime-deploy.md"), "utf8");
    const poisoned = `${source}\n   gcloud run services update storytime-app --set-env-vars=STORYTIME_REVIEW_DRAFT_WEEKS=1\n`;
    const dir = mkdtempSync(join(tmpdir(), "storytime-runbook-scan-"));
    try {
      const copy = join(dir, "storytime-deploy.md");
      writeFileSync(copy, poisoned);
      const hits = findBannedNames(readFileSync(copy, "utf8"));
      expect(hits, "the scan must catch a poisoned runbook").toContain("STORYTIME_REVIEW_DRAFT_WEEKS");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
