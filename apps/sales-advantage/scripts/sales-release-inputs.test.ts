// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "..");
const validator = resolve(
  appRoot,
  "scripts/verify-sales-release-inputs.mjs",
);
const temporaryRoot = mkdtempSync(join(tmpdir(), "sales-release-inputs-"));
const metadataPath = join(temporaryRoot, "backup.json");
const commit = "a".repeat(40);
const boundary = "2026-07-19T05:00:00Z";
const now = "2026-07-19T05:30:00Z";
const description =
  `sales-curriculum-before-${commit}-not-before-${boundary}`;

/** Executes the exact Node release validator used by Cloud Build. */
function run(args: string[]) {
  return spawnSync(process.execPath, [validator, ...args], {
    cwd: appRoot,
    encoding: "utf8",
  });
}

/** Executes backup validation against deterministic Cloud SQL metadata. */
function runBackup(
  metadata: Record<string, string>,
  releaseCommit = commit,
  start = boundary,
  current = now,
) {
  writeFileSync(metadataPath, JSON.stringify(metadata));
  return run(["backup-file", releaseCommit, start, current, metadataPath]);
}

afterAll(() => {
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe("Sales release input validation", () => {
  it("accepts an exact fresh boundary", () => {
    expect(run(["inputs", commit, boundary, now]).status).toBe(0);
  });

  it.each([
    ["sentinel commit", "REQUIRED_RELEASE_COMMIT_SHA", boundary, now],
    ["uppercase commit", "A".repeat(40), boundary, now],
    ["malformed boundary", commit, "2026-07-19", now],
    ["impossible boundary", commit, "2026-02-30T05:00:00Z", now],
    ["stale boundary", commit, boundary, "2026-07-19T06:00:00.000000001Z"],
    ["future boundary", commit, "2026-07-19T05:30:00.000000001Z", now],
  ])("rejects %s", (_label, release, start, current) => {
    expect(run(["inputs", release, start, current]).status).not.toBe(0);
  });
});

describe("Sales curriculum backup validation", () => {
  it("accepts a backup one nanosecond after the exact boundary", () => {
    expect(runBackup({
      status: "SUCCESSFUL",
      type: "ON_DEMAND",
      endTime: "2026-07-19T05:00:00.000000001Z",
      description,
    }).status).toBe(0);
  });

  it.each([
    ["status", "FAILED", "ON_DEMAND", "2026-07-19T05:00:01Z", description],
    ["type", "SUCCESSFUL", "AUTOMATED", "2026-07-19T05:00:01Z", description],
    ["end boundary", "SUCCESSFUL", "ON_DEMAND", boundary, description],
    ["old end", "SUCCESSFUL", "ON_DEMAND", "2026-07-19T04:59:59Z", description],
    ["description", "SUCCESSFUL", "ON_DEMAND", "2026-07-19T05:00:01Z", `sales-curriculum-before-${commit}`],
  ])("rejects the wrong %s", (_label, status, type, endTime, suppliedDescription) => {
    expect(runBackup({
      status,
      type,
      endTime,
      description: suppliedDescription,
    }).status).not.toBe(0);
  });
});
