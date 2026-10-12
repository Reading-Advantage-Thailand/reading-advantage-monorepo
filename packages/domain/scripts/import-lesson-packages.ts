#!/usr/bin/env tsx
/**
 * Imports Workbooks lesson packages into the Primary class book catalogue
 * (track primary_teacher_books_lesson_support_20261003, FR-2). Idempotent: run it again after a
 * package changes.
 *
 * Usage (from packages/domain):
 *   pnpm import-lesson-packages <book folder or package file>... [--dry-run]
 *   pnpm import-lesson-packages ~/Desktop/Workbooks/content/primary/origins-3.2 --dry-run
 *
 * Print data: for each package `<folder>/<name>.json` the script reads the sibling
 * `<folder>/print/<name>.json` (the Workbooks print export) and stores it as `package.printLesson`.
 * A package without a print file stores none and counts as "no print data". Pass
 * `--workbooks-commit <sha>` to store the commit id of the export with the data.
 *
 * Needs DIRECT_DATABASE_URL (or DATABASE_URL). With --dry-run nothing is written and the report
 * says what a real run would do: new-article, linked, unmapped (legacy article not in
 * primary_legacy_id_map yet), or skipped.
 * Exit: 0 done, 1 a package failed to parse or import, 2 config error.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createPrivilegedDb } from "@reading-advantage/db";
import { importLessonPackage, parseLessonPackage, type ImportLessonResult } from "../src/primary-books/index.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const commitIndex = args.indexOf("--workbooks-commit");
const workbooksCommit = commitIndex >= 0 ? args[commitIndex + 1] : undefined;
const targets = args.filter((arg, index) => !arg.startsWith("--") && !(commitIndex >= 0 && index === commitIndex + 1));

/**
 * Lists the package files of a target: a folder gives its `*.json` files (no `inject-log`), a
 * file gives itself.
 * @param target A folder or a file path.
 * @returns Absolute package paths, sorted.
 */
function packageFiles(target: string): string[] {
  const path = resolve(target);
  if (statSync(path).isFile()) return [path];
  return readdirSync(path)
    .filter((name) => name.endsWith(".json") && !name.startsWith("inject-log"))
    .sort()
    .map((name) => join(path, name));
}

/**
 * Reads the Workbooks print file next to a package file.
 * @param file The absolute package path.
 * @returns The print file path and parsed JSON, or undefined when the file does not exist.
 */
function printFileOf(file: string): { source: string; content: unknown } | undefined {
  const path = join(dirname(file), "print", basename(file));
  if (!existsSync(path)) return undefined;
  return { source: sourceOf(path), content: JSON.parse(readFileSync(path, "utf8")) };
}

/**
 * The source path stored on the lesson row: relative to `content/primary/` when possible.
 * @param file The absolute package path.
 * @returns The short path.
 */
function sourceOf(file: string): string {
  const marker = "/content/primary/";
  const index = file.indexOf(marker);
  return index >= 0 ? file.slice(index + marker.length) : basename(file);
}

async function main(): Promise<number> {
  if (targets.length === 0) {
    console.error("Usage: import-lesson-packages <book folder or package file>... [--dry-run] [--workbooks-commit <sha>]");
    return 2;
  }
  let files: string[];
  try {
    files = targets.flatMap(packageFiles);
  } catch (error) {
    console.error(`Config error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
  let connection: ReturnType<typeof createPrivilegedDb>;
  try {
    connection = createPrivilegedDb();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
  const results: ImportLessonResult[] = [];
  let failed = 0;
  try {
    for (const file of files) {
      const sourceFile = sourceOf(file);
      try {
        const pkg = parseLessonPackage(JSON.parse(readFileSync(file, "utf8")));
        const result = await importLessonPackage({ db: connection.db, pkg, sourceFile, dryRun, printFile: printFileOf(file), workbooksCommit });
        results.push(result);
        console.log(`${result.action.padEnd(12)} ${result.key.padEnd(9)} ${result.title}${result.reason ? ` (${result.reason})` : ""}`);
      } catch (error) {
        failed++;
        console.error(`FAILED       ${sourceFile}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await connection.client.end();
  }
  const count = (action: ImportLessonResult["action"]) => results.filter((result) => result.action === action).length;
  console.log(
    `${dryRun ? "Dry run: " : ""}${results.length} lessons: ${count("new-article")} new articles, ${count("linked")} linked, ${count("unmapped")} unmapped, ${count("skipped")} skipped, ${failed} failed. Print data: ${results.filter((result) => result.printed).length} stored, ${results.filter((result) => !result.printed && result.action !== "skipped").length} with no print data.`,
  );
  return failed ? 1 : 0;
}

main().then((code) => process.exit(code));
