// @vitest-environment node
// Task 2.3 of the Phase 2 test strategy. The shared package packages/read-along starts from a copy
// of the Primary player. The copied code and the moved tests must live in the package.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(packageRoot, "../..");
const packageName = "@reading-advantage/read-along";
const COPIED_MODULES = ["align", "position", "seek", "profile"];
const COPIED_EXPORTS = [
  "parseSentences",
  "splitDisplayWords",
  "tokenizeWords",
  "buildWordMaps",
  "findPosition",
  "seekTimeForSentence",
  "seekTimeForWord",
  "seekOrWait",
  "classifySentence",
  "profileArticles",
];
const MOVED_TESTS = ["align.test.ts", "position.test.ts", "profile.test.ts"];
const MOVED_FIXTURES = [
  "contraction.json",
  "curly-quote.json",
  "audio-dropped.json",
  "digit.json",
  "hyphen.json",
];

/**
 * Lists the files of the shared package.
 * @returns The file paths.
 */
function packageFiles(): string[] {
  const files: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (["node_modules", "dist", ".turbo"].includes(entry.name)) continue;
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push(path);
    }
  };
  walk(packageRoot);
  return files;
}

/**
 * Lists the file names of the shared package.
 * @returns The file names.
 */
function packageFileNames(): string[] {
  return packageFiles().map((file) => file.split("/").pop() ?? "");
}

describe("task 2.3 the shared read-along package", () => {
  it("names the package @reading-advantage/read-along", () => {
    const path = resolve(packageRoot, "package.json");
    expect(
      existsSync(path),
      `Missing shared package manifest: ${relative(root, path)} (task 2.3)`,
    ).toBe(true);
    const manifest = JSON.parse(readFileSync(path, "utf8")) as { name?: string };
    expect(manifest.name, `The package manifest names no ${packageName}`).toBe(packageName);
  });

  it("holds the copied player modules", () => {
    const names = packageFileNames();
    expect(names.length, "The shared package holds no file (A4)").toBeGreaterThan(0);
    for (const module of COPIED_MODULES) {
      expect(
        names.includes(`${module}.ts`) || names.includes(`${module}.tsx`),
        `The shared package holds no copied module ${module}.ts (task 2.3)`,
      ).toBe(true);
    }
  });

  it("exports the copied player functions", () => {
    const sources = packageFiles().filter(
      (file) => /\.[cm]?[jt]sx?$/.test(file) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file),
    );
    expect(
      sources.length,
      "The shared package holds no source file (task 2.3, A4)",
    ).toBeGreaterThan(0);
    const text = sources.map((file) => readFileSync(file, "utf8")).join("\n");
    const missing = COPIED_EXPORTS.filter(
      (name) => !new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|var|class)\\s+${name}\\b`).test(text),
    );
    expect(missing, `The shared package exports no copied function: ${missing.join(", ")}`).toEqual([]);
  });

  it("holds the moved Primary tests and their fixtures", () => {
    const names = packageFileNames();
    expect(names.length, "The shared package holds no file (A4)").toBeGreaterThan(0);
    for (const test of MOVED_TESTS) {
      expect(names.includes(test), `The shared package holds no moved test ${test} (task 2.3)`).toBe(
        true,
      );
    }
    for (const fixture of MOVED_FIXTURES) {
      expect(
        names.includes(fixture),
        `The shared package holds no moved fixture ${fixture} (task 2.3)`,
      ).toBe(true);
    }
  });
});
