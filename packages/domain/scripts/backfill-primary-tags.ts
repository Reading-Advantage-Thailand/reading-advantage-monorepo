#!/usr/bin/env tsx
/**
 * Writes the objective and vocabulary links from the Workbooks export into the Primary
 * database (track primary_objective_tags_20261006, FR-5 and FR-6). Idempotent: run it again
 * after a re-export.
 *
 * Usage (from packages/domain):
 *   pnpm backfill-primary-tags [--file <tags.json>] [--dry-run] [--coverage [<out.md>]]
 *   pnpm backfill-primary-tags --file ~/Desktop/Workbooks/content/primary/tags.json --dry-run
 *
 * Needs DIRECT_DATABASE_URL (or DATABASE_URL). With --dry-run nothing is written and the report
 * says what a real run would match. With --coverage the coverage report is printed as Markdown
 * after the backfill, or written to the given file. Never points at the legacy database.
 * Exit: 0 done, 1 the export failed to parse or a package failed, 2 config error.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createPrivilegedDb } from "@reading-advantage/db";
import { backfillPrimaryTags, createDrizzleTagBackfillPort, loadTagCoverageInput, parseTagsExport, summarizeTagCoverage, tagCoverageToMarkdown } from "../src/primary-mastery/index.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const coverageIndex = args.indexOf("--coverage");
const fileIndex = args.indexOf("--file");
const file = fileIndex >= 0 ? args[fileIndex + 1] : resolve(homedir(), "Desktop/Workbooks/content/primary/tags.json");
const coverageOut = coverageIndex >= 0 && args[coverageIndex + 1] && !args[coverageIndex + 1].startsWith("--") ? args[coverageIndex + 1] : null;

async function main(): Promise<number> {
  if (!file) {
    console.error("Usage: backfill-primary-tags [--file <tags.json>] [--dry-run] [--coverage [<out.md>]]");
    return 2;
  }
  if (!process.env.DIRECT_DATABASE_URL && !process.env.DATABASE_URL) {
    console.error("DIRECT_DATABASE_URL (or DATABASE_URL) is required");
    return 2;
  }
  const parsed = parseTagsExport(JSON.parse(readFileSync(resolve(file), "utf8")));
  if (parsed.keyDrift.length) console.error(`Header key differs from the key in code for ${parsed.keyDrift.length} objectives: ${parsed.keyDrift.map((drift) => drift.shortId).join(", ")}`);
  if (parsed.unknownToCode.length) console.error(`Header key has ${parsed.unknownToCode.length} objectives the key in code lacks: ${parsed.unknownToCode.join(", ")}`);
  const { db, client } = createPrivilegedDb();
  const report = await backfillPrimaryTags({ port: createDrizzleTagBackfillPort(db), export: parsed, dryRun });
  console.log(JSON.stringify(report, null, 2));
  if (coverageIndex >= 0) {
    const markdown = tagCoverageToMarkdown(summarizeTagCoverage(await loadTagCoverageInput(db)));
    if (coverageOut) writeFileSync(resolve(coverageOut), markdown);
    else console.log(markdown);
  }
  await client.end();
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
