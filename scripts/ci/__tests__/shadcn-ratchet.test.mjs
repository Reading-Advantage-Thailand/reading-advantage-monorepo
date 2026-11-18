/**
 * Tests for the shadcn ratchet gate of the track `shadcn_lint_ratchet_20261115`.
 *
 * The gate compares two counts with a committed baseline: the warning count of the
 * `@shadcn/lint` rules on the app `components/ui` folders, and the count of local
 * shadcn component copies. A count that goes up fails the gate. A count that stays
 * equal or goes down passes it.
 *
 * These cases cover the comparison logic and the copy counter. The live ESLint run
 * is a gate of the script itself (AC-2 and AC-3 in the spec), not a unit test.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  compareCounts,
  countLocalCopies,
  parseBaseline,
  pascalCase,
  RatchetError,
} from "../shadcn-ratchet.mjs";

/** The repository root, three folders above this test file. */
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** The gate script, relative to the repository root. */
const SCRIPT = join(REPO_ROOT, "scripts/ci/shadcn-ratchet.mjs");

const scratch = [];

/**
 * Make a scratch directory that the test removes at the end.
 *
 * @returns {string} The absolute path of the directory.
 */
function makeScratch() {
  const dir = mkdtempSync(join(tmpdir(), "shadcn-ratchet-"));
  scratch.push(dir);
  return dir;
}

/**
 * Write a file and its parent folders.
 *
 * @param {string} path The absolute path.
 * @param {string} text The file text.
 * @returns {void}
 */
function write(path, text) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
}

afterEach(() => {
  while (scratch.length > 0) rmSync(scratch.pop(), { recursive: true, force: true });
});

describe("pascalCase", () => {
  it("turns a kebab name into the component name", () => {
    expect(pascalCase("alert-dialog")).toBe("AlertDialog");
    expect(pascalCase("card")).toBe("Card");
    expect(pascalCase("state-panel")).toBe("StatePanel");
  });
});

describe("parseBaseline", () => {
  it("reads the counts and the copy file list", () => {
    const baseline = parseBaseline(
      JSON.stringify({ lintWarnings: 4, copies: 2, copyFiles: ["a/b.tsx"] }),
    );
    expect(baseline).toEqual({ lintWarnings: 4, copies: 2, copyFiles: ["a/b.tsx"] });
  });

  it("refuses a baseline without a count", () => {
    expect(() => parseBaseline(JSON.stringify({ copies: 2, copyFiles: [] }))).toThrow(RatchetError);
    expect(() => parseBaseline(JSON.stringify({ copies: 2, copyFiles: [] }))).toThrow(
      /lintWarnings/,
    );
  });

  it("refuses a baseline with a negative or fractional count", () => {
    expect(() => parseBaseline(JSON.stringify({ lintWarnings: -1, copies: 0, copyFiles: [] }))).toThrow(
      RatchetError,
    );
    expect(() => parseBaseline(JSON.stringify({ lintWarnings: 1.5, copies: 0, copyFiles: [] }))).toThrow(
      RatchetError,
    );
  });

  it("refuses a baseline that is not an object", () => {
    expect(() => parseBaseline("[]")).toThrow(RatchetError);
    expect(() => parseBaseline("not json")).toThrow(RatchetError);
  });
});

describe("countLocalCopies", () => {
  it("counts a file that repeats a packages/ui component and skips the rest", () => {
    const root = makeScratch();
    write(join(root, "packages/ui/src/components/Card.tsx"), "export const Card = 1;\n");
    write(join(root, "packages/ui/src/components/Button.tsx"), "export const Button = 1;\n");
    write(join(root, "apps/one/components/ui/card.tsx"), "export const Card = 2;\n");
    write(join(root, "apps/one/components/ui/chart.tsx"), "export const Chart = 2;\n");
    write(join(root, "apps/one/components/ui/__tests__/button.test.tsx"), "test\n");
    write(join(root, "apps/one/components/ui/use-toast.ts"), "export const useToast = 1;\n");

    const result = countLocalCopies({
      root,
      scopes: ["apps/one/components/ui"],
      uiComponents: "packages/ui/src/components",
    });

    expect(result.copies).toBe(1);
    expect(result.files).toEqual(["apps/one/components/ui/card.tsx"]);
  });

  it("returns no copies when a scope folder does not exist", () => {
    const root = makeScratch();
    write(join(root, "packages/ui/src/components/Card.tsx"), "export const Card = 1;\n");

    const result = countLocalCopies({
      root,
      scopes: ["apps/missing/components/ui"],
      uiComponents: "packages/ui/src/components",
    });

    expect(result).toEqual({ copies: 0, files: [] });
  });
});

describe("compareCounts", () => {
  it("passes when both counts equal the baseline", () => {
    const result = compareCounts({
      baseline: { lintWarnings: 4, copies: 2, copyFiles: ["a/b.tsx", "a/c.tsx"] },
      current: { lintWarnings: 4, copies: 2, copyFiles: ["a/b.tsx", "a/c.tsx"] },
    });
    expect(result.exitCode).toBe(0);
    expect(result.lines.join("\n")).not.toMatch(/UP/);
  });

  it("passes and asks for a lower baseline when a count goes down", () => {
    const result = compareCounts({
      baseline: { lintWarnings: 4, copies: 2, copyFiles: ["a/b.tsx", "a/c.tsx"] },
      current: { lintWarnings: 1, copies: 2, copyFiles: ["a/b.tsx", "a/c.tsx"] },
    });
    expect(result.exitCode).toBe(0);
    expect(result.lines.join("\n")).toMatch(/lint warnings went down: baseline 4, current 1/i);
    expect(result.lines.join("\n")).toMatch(/lower the baseline/i);
  });

  it("fails when the lint warning count goes up", () => {
    const result = compareCounts({
      baseline: { lintWarnings: 4, copies: 2, copyFiles: [] },
      current: { lintWarnings: 6, copies: 2, copyFiles: [] },
    });
    expect(result.exitCode).toBe(1);
    expect(result.lines.join("\n")).toMatch(/lint warnings went up: baseline 4, current 6, delta \+2/i);
  });

  it("fails when the copy count goes up", () => {
    const result = compareCounts({
      baseline: { lintWarnings: 4, copies: 2, copyFiles: ["a/b.tsx", "a/c.tsx"] },
      current: { lintWarnings: 4, copies: 3, copyFiles: ["a/b.tsx", "a/c.tsx", "a/d.tsx"] },
    });
    expect(result.exitCode).toBe(1);
    expect(result.lines.join("\n")).toMatch(/local copies went up: baseline 2, current 3, delta \+1/i);
  });

  it("reports a changed copy file list at an equal count", () => {
    const result = compareCounts({
      baseline: { lintWarnings: 4, copies: 2, copyFiles: ["a/b.tsx", "a/c.tsx"] },
      current: { lintWarnings: 4, copies: 2, copyFiles: ["a/b.tsx", "a/d.tsx"] },
    });
    expect(result.exitCode).toBe(0);
    const text = result.lines.join("\n");
    expect(text).toMatch(/copy file list changed/i);
    expect(text).toMatch(/- a\/c\.tsx/);
    expect(text).toMatch(/\+ a\/d\.tsx/);
  });

  it("ignores the copy file list when it is absent from the baseline", () => {
    const result = compareCounts({
      baseline: { lintWarnings: 1, copies: 0 },
      current: { lintWarnings: 1, copies: 0, copyFiles: [] },
    });
    expect(result.exitCode).toBe(0);
    expect(result.lines.join("\n")).not.toMatch(/copy file list changed/i);
  });
});

describe("the plugin resolution path", () => {
  it("exits 2 and names SHADCN_LINT_DIR when the variable is not set", () => {
    const env = { ...process.env };
    delete env.SHADCN_LINT_DIR;

    const result = spawnSync(process.execPath, [SCRIPT], { cwd: REPO_ROOT, env, encoding: "utf8" });

    expect(result.status).toBe(2);
    expect(`${result.stdout}${result.stderr}`).toMatch(/SHADCN_LINT_DIR/);
  });

  it("exits 2 and names the plugin when the folder holds no plugin", () => {
    const empty = makeScratch();

    const result = spawnSync(process.execPath, [SCRIPT], {
      cwd: REPO_ROOT,
      env: { ...process.env, SHADCN_LINT_DIR: empty },
      encoding: "utf8",
    });

    expect(result.status).toBe(2);
    const text = `${result.stdout}${result.stderr}`;
    expect(text).toMatch(/@shadcn\/lint/);
    expect(text).toMatch(/SHADCN_LINT_DIR|not installed/i);
  });
});
