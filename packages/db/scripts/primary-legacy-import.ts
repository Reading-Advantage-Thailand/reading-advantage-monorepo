#!/usr/bin/env tsx
/**
 * CLI of the Primary Advantage cutover ETL (spec A6).
 *
 *   LEGACY_DATABASE_URL=postgres://... DIRECT_DATABASE_URL=postgres://... \
 *     pnpm --filter @reading-advantage/db legacy-import [--dry-run] [--report out.md] [--roles roles.json] [--teachers teachers.json]
 *
 * `--roles` names a JSON object `{ "<legacy user id>": "STUDENT" | "TEACHER" | "ADMIN" | "SYSTEM" }`
 * for the legacy users whose role text the mapping does not know (D9). `--teachers` names a JSON
 * object `{ "<legacy classroom id>": "<legacy user id>" }` for classrooms with no teacher and no
 * school admin. The legacy connection is read only; the target must already be migrated.
 * `--dry-run` rolls every group back.
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import { renderReport, runPrimaryLegacyImport, type TargetRole } from "../src/migrations-data/primary-legacy-import.js";

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const legacyUrl = process.env.LEGACY_DATABASE_URL;
const targetUrl = process.env.DIRECT_DATABASE_URL;
if (!legacyUrl || !targetUrl) {
  console.error("Set LEGACY_DATABASE_URL (read only) and DIRECT_DATABASE_URL (the migrated target).");
  process.exit(2);
}
if (legacyUrl === targetUrl) {
  console.error("The legacy and the target database must differ.");
  process.exit(2);
}
const rolesFile = flag("--roles");
const roleOverrides = rolesFile ? (JSON.parse(readFileSync(rolesFile, "utf8")) as Record<string, TargetRole>) : undefined;
const teachersFile = flag("--teachers");
const classroomTeacherOverrides = teachersFile ? (JSON.parse(readFileSync(teachersFile, "utf8")) as Record<string, string>) : undefined;
const legacy = postgres(legacyUrl, { max: 2, connection: { default_transaction_read_only: "on" } });
const target = postgres(targetUrl, { max: 2 });
try {
  const report = await runPrimaryLegacyImport({ legacy, target, dryRun: args.includes("--dry-run"), roleOverrides, classroomTeacherOverrides, log: (line) => console.error(`[legacy-import] ${line}`) });
  const markdown = renderReport(report);
  const out = flag("--report");
  if (out) { writeFileSync(out, markdown); console.error(`[legacy-import] report written to ${out}`); } else console.log(markdown);
} finally {
  await Promise.all([legacy.end(), target.end()]);
}
