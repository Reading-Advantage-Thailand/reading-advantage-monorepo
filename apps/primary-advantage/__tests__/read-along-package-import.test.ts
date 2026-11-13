// @vitest-environment node
// Task 7.2 of Phase 7: the Primary read-along player comes from the shared package.
//
// The contract of this file:
//   - The Primary copy of the player is gone. The copy holds the implementation files under
//     `apps/primary-advantage/lib/read-along`, `apps/primary-advantage/components/read-along`,
//     and `apps/primary-advantage/hooks/use-read-along.ts`.
//   - Every Primary source file that imports a read-along module imports it from
//     `@reading-advantage/read-along`. The scan names exact paths (A7).
//   - The shared package resolves in the Primary app.
//   - The read-along test count never drops. The label `primary_read_along_tests=<n>` holds the
//     count of the read-along test files of the Primary app, and the label
//     `read_along_test_files_distinct=<n>` holds the count of distinct test file names in the
//     Primary app and the shared package. A test that moves to the package keeps its name, so a
//     move keeps the count and a deleted test lowers it (A3, A4).
//   - The tech-debt row of task 2.3 is removed from `measure/tech-debt.md`.
//
// The test reads the source files of the app. It writes nothing.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** The app folder. Every app path below is relative to it. */
const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The repository root. The package path below is relative to it. */
const REPO_ROOT = resolve(APP_DIR, "..", "..");

/** The shared read-along package folder. */
const PACKAGE_DIR = resolve(REPO_ROOT, "packages/read-along");

/** The name of the shared read-along package. */
const PACKAGE_NAME = "@reading-advantage/read-along";

/** The implementation files of the Primary copy of the player. The copy is gone after task 7.2. */
const COPY_FILES = [
  "lib/read-along/align.ts",
  "lib/read-along/position.ts",
  "lib/read-along/profile.ts",
  "lib/read-along/seek.ts",
  "components/read-along/read-along-player.tsx",
  "components/read-along/read-along-passage.tsx",
  "hooks/use-read-along.ts",
];

/** The Primary callers of the player. They import the player from the shared package. */
const CALLER_FILES = [
  "components/articles/article-content.tsx",
  "components/lesson/task/task-reading.tsx",
  "components/stories/chapter-content.tsx",
];

/** The file extensions the source scan reads. */
const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts"];

/** The folders the source scan skips. */
const SCAN_SKIP_FOLDERS = new Set(["node_modules", ".next"]);

/** The one exact path the source scan excludes. This file names the copy on purpose. */
const SELF_RELATIVE_PATH = "__tests__/read-along-package-import.test.ts";

/** The Primary folders that hold the read-along test files of the targeted command. */
const PRIMARY_TEST_FOLDERS = ["lib/read-along", "components/read-along"];

/** The Primary read-along test file outside the two folders. */
const PRIMARY_TEST_FILES = ["hooks/__tests__/use-read-along.test.tsx"];

/** The baseline of the distinct read-along test file names of the Primary app and the package. */
const BASELINE_DISTINCT_TEST_FILES = 10;

/** The tech-debt file of the repository. */
const TECH_DEBT_FILE = resolve(REPO_ROOT, "measure/tech-debt.md");

/** The words of the tech-debt row of task 2.3. Phase 7 removes the row. */
const TECH_DEBT_ROW_TEXT = "Duplicate read-along player code in Primary and the shared package";

/** Matches a module specifier in an import, an export, a require, or a mock. */
const IMPORT_SPECIFIER_PATTERN =
  /(?:from|import|require|vi\.mock)\s*\(?\s*["']([^"']+)["']/g;

/** One scanned source file. */
type ScannedFile = { relativePath: string; text: string };

/**
 * Collects the source files of the app folder.
 * @returns The relative path and the text of each file.
 */
function collectScannedFiles(): ScannedFile[] {
  const files: ScannedFile[] = [];
  const walk = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const fullPath = resolve(folder, entry.name);
      if (entry.isDirectory()) {
        if (!SCAN_SKIP_FOLDERS.has(entry.name)) walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const relativePath = fullPath.slice(APP_DIR.length + 1);
      if (relativePath === SELF_RELATIVE_PATH) continue;
      const dot = entry.name.lastIndexOf(".");
      const extension = dot >= 0 ? entry.name.slice(dot) : "";
      if (!SCAN_EXTENSIONS.includes(extension)) continue;
      files.push({ relativePath, text: readFileSync(fullPath, "utf-8") });
    }
  };
  walk(APP_DIR);
  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

/**
 * Gives the module specifiers of one source file.
 * @param text The text of the file.
 * @returns The specifier of each import, export, require, and mock.
 */
function importSpecifiers(text: string): string[] {
  const specifiers: string[] = [];
  for (const match of text.matchAll(IMPORT_SPECIFIER_PATTERN)) {
    if (match[1] !== undefined) specifiers.push(match[1]);
  }
  return specifiers;
}

/**
 * Reports whether a module specifier names the Primary copy of the player.
 * @param specifier The module specifier.
 * @returns `true` when the specifier names a read-along module of the Primary app.
 */
function isLocalReadAlongSpecifier(specifier: string): boolean {
  if (!specifier.includes("read-along")) return false;
  if (specifier.includes("__tests__")) return false;
  if (specifier === PACKAGE_NAME) return false;
  if (specifier.startsWith(`${PACKAGE_NAME}/`)) return false;
  return true;
}

/**
 * Lists the test file names of a folder.
 * @param folder The folder to read.
 * @returns The file name of each test file, with repeats.
 */
function listTestFileNames(folder: string): string[] {
  if (!existsSync(folder)) return [];
  const names: string[] = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const fullPath = resolve(folder, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      names.push(...listTestFileNames(fullPath));
      continue;
    }
    if (/\.test\.(ts|tsx)$/.test(entry.name)) names.push(entry.name);
  }
  return names;
}

describe("task 7.2 the Primary player comes from the shared package", () => {
  it("removes the Primary copy of the player", () => {
    expect(COPY_FILES.length, "the copy file list is not empty (A4)").toBeGreaterThan(0);
    const present = COPY_FILES.filter((file) => existsSync(resolve(APP_DIR, file)));
    expect(
      present,
      `primary_copy_files_remaining=${present.length} files=${present.join(",")}`,
    ).toEqual([]);
  });

  it("imports the player from the shared package in every Primary caller", () => {
    expect(CALLER_FILES.length, "the caller list is not empty (A4)").toBeGreaterThan(0);
    for (const file of CALLER_FILES) {
      const path = resolve(APP_DIR, file);
      expect(existsSync(path), `Missing Primary caller ${file}`).toBe(true);
      const specifiers = importSpecifiers(readFileSync(path, "utf-8"));
      const packageImports = specifiers.filter(
        (specifier) => specifier === PACKAGE_NAME || specifier.startsWith(`${PACKAGE_NAME}/`),
      );
      expect(
        packageImports.length,
        `${file} imports no module of ${PACKAGE_NAME}: ${specifiers.join(",")}`,
      ).toBeGreaterThan(0);
      const localImports = specifiers.filter(isLocalReadAlongSpecifier);
      expect(localImports, `${file} imports the Primary copy: ${localImports.join(",")}`).toEqual([]);
    }
  });

  it("leaves no Primary source file that imports the Primary copy", () => {
    const files = collectScannedFiles();
    expect(files.length, `scan_files=${files.length}`).toBeGreaterThanOrEqual(900);
    const offenders: string[] = [];
    for (const file of files) {
      const localImports = importSpecifiers(file.text).filter(isLocalReadAlongSpecifier);
      if (localImports.length > 0) {
        offenders.push(`${file.relativePath}:${localImports.join(",")}`);
      }
    }
    expect(
      offenders,
      `local_read_along_imports=${offenders.length} sites=${offenders.join(" | ")}`,
    ).toEqual([]);
  });

  it("resolves the shared package in the Primary app", () => {
    const manifest = JSON.parse(readFileSync(resolve(APP_DIR, "package.json"), "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependency =
      manifest.dependencies?.[PACKAGE_NAME] ?? manifest.devDependencies?.[PACKAGE_NAME];
    const tsconfig = readFileSync(resolve(APP_DIR, "tsconfig.json"), "utf-8");
    const pathMapping =
      tsconfig.includes(`"${PACKAGE_NAME}/*`) || tsconfig.includes(`"${PACKAGE_NAME}"`);
    expect(
      dependency !== undefined || pathMapping,
      `the Primary app names no ${PACKAGE_NAME} in its manifest or its tsconfig paths`,
    ).toBe(true);
  });

  it("keeps the read-along test count and records the labeled count", () => {
    const primaryNames: string[] = [];
    for (const folder of PRIMARY_TEST_FOLDERS) {
      primaryNames.push(...listTestFileNames(resolve(APP_DIR, folder)));
    }
    for (const file of PRIMARY_TEST_FILES) {
      if (existsSync(resolve(APP_DIR, file))) primaryNames.push(file.split("/").pop() as string);
    }
    const distinct = new Set([...primaryNames, ...listTestFileNames(PACKAGE_DIR)]);
    console.log(`primary_read_along_tests=${primaryNames.length}`);
    console.log(`read_along_test_files_distinct=${distinct.size}`);
    expect(
      distinct.size,
      `primary_read_along_tests=${primaryNames.length} read_along_test_files_distinct=${distinct.size}`,
    ).toBeGreaterThanOrEqual(BASELINE_DISTINCT_TEST_FILES);
  });

  it("removes the tech-debt row of task 2.3", () => {
    const text = readFileSync(TECH_DEBT_FILE, "utf-8");
    const rows = text.split("\n").filter((line) => line.includes(TECH_DEBT_ROW_TEXT));
    expect(rows.length, `tech_debt_rows_remaining=${rows.length}`).toBe(0);
  });
});
