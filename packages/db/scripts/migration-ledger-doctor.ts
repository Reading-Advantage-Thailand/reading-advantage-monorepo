#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import postgres from "postgres";
import { sentinelProbes, type SentinelProbe } from "../src/sentinels.js";
import {
  buildPostgresOptions,
  normalizePostgresConnectionString,
} from "../src/connection-options.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta", "_journal.json");
const args = process.argv.slice(2);
const mode = args.includes("--repair")
  ? "repair"
  : args.includes("--check")
    ? "check"
    : null;

/**
 * Parse `--required-migration <tag>` from argv. The flag is the deploy-gate
 * contract: app pipelines pass the minimum migration tag their app code
 * requires. If the ledger is behind, the doctor fails closed (exit 1) and
 * prints `Required migration behind count: N` so the gate can be wired to
 * Cloud Build / GitHub Actions / etc.
 *
 * The same contract is honored via the `REQUIRED_MIGRATION` env var so a
 * pipeline can set it from a secret manager without rebuilding the command.
 */
function parseRequiredMigration(): string | null {
  const envTag = process.env.REQUIRED_MIGRATION?.trim();
  if (envTag) return envTag;
  const flagIdx = args.indexOf("--required-migration");
  if (flagIdx >= 0 && flagIdx + 1 < args.length) {
    const value = args[flagIdx + 1]?.trim();
    if (value) return value;
  }
  return null;
}

if (!mode) {
  console.error(
    "Usage: tsx scripts/migration-ledger-doctor.ts [--check|--repair] [--required-migration <tag>]",
  );
  process.exit(2);
}

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}
interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}
interface LedgerRow {
  hash: string;
  created_at: bigint | null;
}

async function checkSentinel(
  client: postgres.Sql,
  probe: SentinelProbe,
): Promise<boolean> {
  if (probe.kind === "table") {
    const rows = await client.unsafe(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1",
      [probe.target],
    );
    return rows.length > 0;
  }
  if (probe.kind === "column") {
    const [table, column] = probe.target.split(".");
    if (!table || !column) return false;
    const rows = await client.unsafe(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1",
      [table, column],
    );
    return rows.length > 0;
  }
  if (probe.kind === "function") {
    const rows = (await client.unsafe(
      "SELECT to_regprocedure($1) IS NOT NULL AS present",
      [probe.target],
    )) as Array<{ present: boolean }>;
    return rows.length === 1 && rows[0]?.present === true;
  }
  if (!probe.table || !probe.columns) return false;
  const rows = (await client.unsafe(
    `
    SELECT array_agg(attribute.attname ORDER BY key.ordinality) AS columns
    FROM pg_constraint constraint_record
    JOIN pg_class relation ON relation.oid = constraint_record.conrelid
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    JOIN LATERAL unnest(constraint_record.conkey)
      WITH ORDINALITY AS key(attribute_number, ordinality) ON true
    JOIN pg_attribute attribute
      ON attribute.attrelid = relation.oid
     AND attribute.attnum = key.attribute_number
    WHERE namespace.nspname = 'public'
      AND relation.relname = $1
      AND constraint_record.conname = $2
      AND constraint_record.contype = 'u'
    GROUP BY constraint_record.oid
  `,
    [probe.table, probe.target],
  )) as Array<{ columns: string[] }>;
  return (
    rows.length === 1 &&
    JSON.stringify(rows[0]?.columns) === JSON.stringify(probe.columns)
  );
}

async function main() {
  // Prefer DIRECT_DATABASE_URL (session-mode direct connection); fall back
  // to DATABASE_URL with a warning, mirroring drizzle.config.ts and the
  // codecamp seed. Environments like the Cloud Build deploy gate reach the
  // DB through the Cloud SQL Auth Proxy, which is already a direct
  // connection under either env name.
  const dbUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      "DIRECT_DATABASE_URL is not set (and no DATABASE_URL fallback)",
    );
    process.exit(2);
  }
  if (!process.env.DIRECT_DATABASE_URL) {
    console.warn(
      "[doctor] DIRECT_DATABASE_URL is not set; falling back to DATABASE_URL.",
    );
  }
  let journal: Journal;
  try {
    journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as Journal;
  } catch (err) {
    console.error("Failed to read journal:", err);
    process.exit(2);
  }
  let client: postgres.Sql;
  // Normalize Cloud SQL unix-socket URLs (?host=/cloudsql/<instance>) the
  // same way the runtime client and seed do — raw postgres() does not
  // honor the `host` query param as a socket directory.
  try {
    client = postgres(normalizePostgresConnectionString(dbUrl), {
      ...buildPostgresOptions(dbUrl),
      max: 1,
      connect_timeout: 10,
    });
    await client.unsafe("SELECT 1");
  } catch (err) {
    console.error("Failed to connect:", err);
    process.exit(2);
  }
  try {
    await client.unsafe("CREATE SCHEMA IF NOT EXISTS drizzle");
    await client.unsafe(
      "CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)",
    );
    const ledgerRows = (await client.unsafe(
      "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
    )) as LedgerRow[];
    const ledgerByCreatedAt = new Map<number, LedgerRow>();
    for (const row of ledgerRows) {
      if (row.created_at !== null)
        ledgerByCreatedAt.set(Number(row.created_at), row);
    }
    let hasDivergence = false;
    for (const entry of journal.entries) {
      const sentinel = sentinelProbes[entry.tag];
      if (!sentinel) continue;
      const sentinelPresent = await checkSentinel(client, sentinel);
      const ledgerPresent = ledgerByCreatedAt.has(entry.when);
      if (sentinelPresent && !ledgerPresent) {
        console.error(
          `DIVERGENCE: ${entry.tag} (idx ${entry.idx}) \u2014 schema present, ledger row missing`,
        );
        hasDivergence = true;
        if (mode === "repair") {
          const sqlFile = join(DRIZZLE_DIR, `${entry.tag}.sql`);
          let hash: string;
          try {
            hash = createHash("sha256")
              .update(readFileSync(sqlFile, "utf8"))
              .digest("hex");
          } catch {
            hash = "manual-repair";
          }
          await client.unsafe(
            'INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") VALUES ($1, $2)',
            [hash, entry.when],
          );
          console.error(`REPAIRED: inserted ledger row for ${entry.tag}`);
        }
      } else if (!sentinelPresent && ledgerPresent) {
        console.error(
          `DIVERGENCE: ${entry.tag} (idx ${entry.idx}) \u2014 ledger row present, schema missing`,
        );
        hasDivergence = true;
      }
    }

    // Required-migration deploy gate: when `--required-migration <tag>` or
    // `REQUIRED_MIGRATION=<tag>` is supplied, the DB ledger MUST have
    // applied every journal entry at or after the required tag. If the
    // highest applied `when` is less than the required tag's `when`, the
    // ledger is behind and we fail closed (exit 1) with a labeled
    // `Required migration behind count: N` so CI/Cloud Build can branch
    // on it. The check runs after the divergence pass so a missing
    // required migration also shows up as a sentinel divergence.
    const requiredTag = parseRequiredMigration();
    if (requiredTag) {
      const requiredEntry = journal.entries.find((e) => e.tag === requiredTag);
      if (!requiredEntry) {
        console.error(
          `Required migration behind count: 0 — required tag "${requiredTag}" is not in _journal.json (typo or stale pipeline config)`,
        );
        process.exit(1);
      }
      const appliedWhenValues = Array.from(ledgerByCreatedAt.keys());
      const highestAppliedWhen =
        appliedWhenValues.length > 0 ? Math.max(...appliedWhenValues) : -1;
      if (highestAppliedWhen < requiredEntry.when) {
        // "Behind count" = number of journal entries (in idx order) at or
        // after the required tag whose `when` is greater than the highest
        // applied `when`. This is the canonical "how far behind" signal
        // for a deploy gate.
        const behindEntries = journal.entries.filter(
          (e) => e.when > highestAppliedWhen && e.idx >= requiredEntry.idx,
        );
        console.error(
          `Required migration behind count: ${behindEntries.length} — ` +
            `required tag "${requiredTag}" (idx ${requiredEntry.idx}, when ${requiredEntry.when}) ` +
            `but highest applied ledger when is ${highestAppliedWhen} ` +
            `(${behindEntries.map((e) => e.tag).join(", ") || "no entries beyond required"} are not applied)`,
        );
        hasDivergence = true;
      } else {
        console.error(
          `Required migration gate OK — "${requiredTag}" (when ${requiredEntry.when}) ` +
            `is at or below highest applied when ${highestAppliedWhen}`,
        );
      }
    }

    if (hasDivergence && mode === "repair") {
      let stillDivergent = false;
      for (const entry of journal.entries) {
        const sentinel = sentinelProbes[entry.tag];
        if (!sentinel) continue;
        const sentinelPresent = await checkSentinel(client, sentinel);
        const updatedLedger = await client.unsafe(
          "SELECT created_at FROM drizzle.__drizzle_migrations WHERE created_at = $1",
          [entry.when],
        );
        if (sentinelPresent !== updatedLedger.length > 0) stillDivergent = true;
      }
      process.exit(stillDivergent ? 1 : 0);
    }
    process.exit(hasDivergence ? 1 : 0);
  } finally {
    await client.end();
  }
}
main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(2);
});
