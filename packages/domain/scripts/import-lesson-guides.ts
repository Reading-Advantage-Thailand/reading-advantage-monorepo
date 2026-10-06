#!/usr/bin/env tsx
/**
 * Imports the teacher guide (13 steps, en and th) from the Workbooks manual into
 * `primary_lesson_guides` (track primary_teacher_books_lesson_support_20261003, FR-8). The texts
 * are imported as they are. Idempotent: upsert on (step, locale).
 *
 * Usage (from packages/domain):
 *   pnpm import-lesson-guides [--workbooks ~/Desktop/Workbooks] [--dry-run]
 *
 * Reads `dashboard/lib/teacher-manual/i18n/{en,th}.ts` (notes per step and the plan lines with
 * the Thai step titles) and `Teacher guide/step-N.md` and `step-N-th.md` (the scripted segments).
 * Exit: 0 done, 1 a locale failed, 2 config error.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { createPrivilegedDb, primaryLessonGuides } from "@reading-advantage/db";
import { toGuideRows, type ManualLocale } from "../src/primary-books/index.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const flagIndex = args.indexOf("--workbooks");
const workbooks = resolve(flagIndex >= 0 ? args[flagIndex + 1] : join(homedir(), "Desktop", "Workbooks"));

/**
 * Reads the scripted step files of one locale.
 * @param locale `en` or `th`.
 * @returns The file content by step number; missing files are left out.
 */
function scriptsOf(locale: "en" | "th"): Record<number, string | undefined> {
  const out: Record<number, string | undefined> = {};
  for (let step = 1; step <= 13; step++) {
    const file = join(workbooks, "Teacher guide", locale === "en" ? `step-${step}.md` : `step-${step}-th.md`);
    if (existsSync(file)) out[step] = readFileSync(file, "utf8");
  }
  return out;
}

async function main(): Promise<number> {
  const i18n = join(workbooks, "dashboard", "lib", "teacher-manual", "i18n");
  if (!existsSync(join(i18n, "en.ts"))) {
    console.error(`The manual was not found at ${i18n}. Pass --workbooks <path>.`);
    return 2;
  }
  let connection: ReturnType<typeof createPrivilegedDb> | null = null;
  if (!dryRun) {
    try {
      connection = createPrivilegedDb();
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return 2;
    }
  }
  let failed = 0;
  try {
    for (const locale of ["en", "th"] as const) {
      try {
        const module = (await import(pathToFileURL(join(i18n, `${locale}.ts`)).href)) as Record<string, ManualLocale>;
        const manual = module[locale];
        if (!manual) throw new Error(`${locale}.ts does not export "${locale}"`);
        const rows = toGuideRows(locale, manual, scriptsOf(locale));
        const withScript = rows.filter((row) => row.scriptMd).length;
        console.log(`${locale}: ${rows.length} steps, ${withScript} with a script${dryRun ? " (dry run)" : ""}`);
        if (connection) {
          for (const row of rows) {
            await connection.db
              .insert(primaryLessonGuides)
              .values(row)
              .onConflictDoUpdate({ target: [primaryLessonGuides.step, primaryLessonGuides.locale], set: { ...row, updatedAt: sql`now()` } });
          }
        }
      } catch (error) {
        failed++;
        console.error(`FAILED ${locale}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await connection?.client.end();
  }
  return failed ? 1 : 0;
}

main().then((code) => process.exit(code));
