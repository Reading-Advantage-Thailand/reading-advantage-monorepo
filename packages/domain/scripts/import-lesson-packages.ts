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
 * Needs DIRECT_DATABASE_URL (or DATABASE_URL). With --dry-run nothing is written and the report
 * says what a real run would do: new-article, linked, unmapped (legacy article not in
 * primary_legacy_id_map yet), or skipped.
 * Exit: 0 done, 1 a package failed to parse or import, 2 config error.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createPrivilegedDb } from "@reading-advantage/db";
import { importLessonPackage, parseLessonPackage, type ImportLessonResult } from "../src/primary-books/index.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const targets = args.filter((arg) => !arg.startsWith("--"));

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
    console.error("Usage: import-lesson-packages <book folder or package file>... [--dry-run]");
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
    for (const file of targets.flatMap(packageFiles)) {
      const sourceFile = sourceOf(file);
      try {
        const pkg = parseLessonPackage(JSON.parse(readFileSync(file, "utf8")));
        const result = await importLessonPackage({ db: connection.db, pkg, sourceFile, dryRun });
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
    `${dryRun ? "Dry run: " : ""}${results.length} lessons: ${count("new-article")} new articles, ${count("linked")} linked, ${count("unmapped")} unmapped, ${count("skipped")} skipped, ${failed} failed.`,
  );
  return failed ? 1 : 0;
}

main().then((code) => process.exit(code));
