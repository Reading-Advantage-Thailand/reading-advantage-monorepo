// @vitest-environment node
// Phase 2 round 8 (Green, 2026-11-03): Review C F48 and F51. The documented receive command must
// keep the exit code of the script, so it runs the root tsx binary and not `pnpm exec`.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const text = readFileSync(resolve(root, "docs/runbooks/storytime-app-week-sync.md"), "utf8");

describe("the week sync runbook command", () => {
  it("runs the root tsx binary, so the operator sees the real exit code", () => {
    expect(text).toContain("node_modules/.bin/tsx apps/storytime/scripts/receive-weeks.ts --commit");
    expect(text).not.toMatch(/pnpm --filter storytime exec tsx/);
  });

  it("names the kind of missing picture that hides a week, and the help flag", () => {
    expect(text).toMatch(/only a missing (book )?page picture hides the week/i);
    expect(text).toContain("--help");
  });

  it("tells the operator what to do when the rollback is incomplete", () => {
    expect(text).toMatch(/not fully restored/);
    expect(text).toMatch(/\.orig-/);
  });
});

describe("the recovery steps of the runbook", () => {
  const section = text.slice(text.indexOf("## Recover from a failed run"));

  it("deletes no recovery copy before the operator compares and decides", () => {
    expect(section).not.toMatch(/git restore apps\/storytime\/content`\. Then delete/);
    expect(section).toMatch(/Do not delete any file/i);
    expect(section).toContain("git diff --no-index");
    expect(section).toMatch(/explicit decision/i);
    expect(section).toMatch(/does not prove/i);
  });

  it("states that a leftover file stops the next run, and why", () => {
    expect(text).toMatch(/leftover/i);
    expect(text).toMatch(/exits with code 1 before it reads or writes/i);
  });
});

