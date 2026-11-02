// Review A F5 (round 5, 2026-11-02): the receiving step resolves the --commit value to the full
// commit id with `git rev-parse --verify`, so a short commit and the full id record the same
// source.json. The test builds its own git repository in the system temp folder.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, "..");
const work = mkdtempSync(join(tmpdir(), "receive-commit-"));

/** One git commit of the fixture repository. */
let fullCommit = "";

afterAll(() => {
  rmSync(work, { recursive: true, force: true });
});

/**
 * Runs git in the fixture repository.
 * @param args The git arguments.
 * @returns The stdout.
 */
function git(...args: string[]): string {
  return execFileSync("git", ["-C", work, ...args], { encoding: "utf8" });
}

/**
 * Loads the receiving step and picks its commit resolver.
 * @returns The function that resolves a commit reference.
 */
async function loadResolveCommit(): Promise<(directory: string, reference: string) => string> {
  const path = resolve(app, "scripts/receive-weeks.ts");
  const loaded = (await import(/* @vite-ignore */ path)) as Record<string, unknown>;
  const resolveCommit = loaded["resolveCommit"];
  expect(resolveCommit, "The receiving step exports no resolveCommit").toBeTypeOf("function");
  return resolveCommit as (directory: string, reference: string) => string;
}

execFileSync("git", ["init", "--quiet", "--initial-branch", "main", work]);
git("config", "user.email", "green@example.invalid");
git("config", "user.name", "Green");
writeFileSync(join(work, "week.txt"), "w01\n");
git("add", "week.txt");
git("commit", "--quiet", "--message", "the handed-off week");
fullCommit = git("rev-parse", "HEAD").trim();

describe("Review A F5 the receiving step resolves the commit id", () => {
  it("resolves a short commit to the full id", async () => {
    const resolveCommit = await loadResolveCommit();
    const short = fullCommit.slice(0, 7);
    expect(resolveCommit(work, short)).toBe(fullCommit);
  });

  it("keeps the full id unchanged", async () => {
    const resolveCommit = await loadResolveCommit();
    expect(resolveCommit(work, fullCommit)).toBe(fullCommit);
  });

  it("refuses a reference that names no commit", async () => {
    const resolveCommit = await loadResolveCommit();
    expect(() => resolveCommit(work, "0000000")).toThrow();
  });
});
