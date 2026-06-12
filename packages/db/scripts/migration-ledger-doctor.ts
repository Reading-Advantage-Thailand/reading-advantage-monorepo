#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import postgres from "postgres";
import { sentinelProbes, type SentinelProbe } from "../src/sentinels.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");
const DRIZZLE_DIR = join(PACKAGE_ROOT, "drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta", "_journal.json");
const args = process.argv.slice(2);
const mode = args.includes("--repair") ? "repair" : args.includes("--check") ? "check" : null;
if (!mode) { console.error("Usage: tsx scripts/migration-ledger-doctor.ts [--check|--repair]"); process.exit(2); }

interface JournalEntry { idx: number; version: string; when: number; tag: string; breakpoints: boolean; }
interface Journal { version: string; dialect: string; entries: JournalEntry[]; }
interface LedgerRow { hash: string; created_at: bigint | null; }

async function checkSentinel(client: postgres.Sql, probe: SentinelProbe): Promise<boolean> {
  if (probe.kind === "table") {
    const rows = await client.unsafe("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1", [probe.target]);
    return rows.length > 0;
  } else {
    const [table, column] = probe.target.split(".");
    if (!table || !column) return false;
    const rows = await client.unsafe("SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1", [table, column]);
    return rows.length > 0;
  }
}

async function main() {
  const dbUrl = process.env.DIRECT_DATABASE_URL;
  if (!dbUrl) { console.error("DIRECT_DATABASE_URL is not set"); process.exit(2); }
  let journal: Journal;
  try { journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as Journal; } catch (err) { console.error("Failed to read journal:", err); process.exit(2); }
  let client: postgres.Sql;
  try { client = postgres(dbUrl, { max: 1, connect_timeout: 10 }); await client.unsafe("SELECT 1"); } catch (err) { console.error("Failed to connect:", err); process.exit(2); }
  try {
    await client.unsafe("CREATE SCHEMA IF NOT EXISTS drizzle");
    await client.unsafe("CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)");
    const ledgerRows = await client.unsafe("SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at") as LedgerRow[];
    const ledgerByCreatedAt = new Map<number, LedgerRow>();
    for (const row of ledgerRows) { if (row.created_at !== null) ledgerByCreatedAt.set(Number(row.created_at), row); }
    let hasDivergence = false;
    for (const entry of journal.entries) {
      const sentinel = sentinelProbes[entry.tag];
      if (!sentinel) continue;
      const sentinelPresent = await checkSentinel(client, sentinel);
      const ledgerPresent = ledgerByCreatedAt.has(entry.when);
      if (sentinelPresent && !ledgerPresent) {
        console.error(`DIVERGENCE: ${entry.tag} (idx ${entry.idx}) \u2014 schema present, ledger row missing`);
        hasDivergence = true;
        if (mode === "repair") {
          const sqlFile = join(DRIZZLE_DIR, `${entry.tag}.sql`);
          let hash: string;
          try { hash = createHash("sha256").update(readFileSync(sqlFile, "utf8")).digest("hex"); } catch { hash = "manual-repair"; }
          await client.unsafe('INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at") VALUES ($1, $2)', [hash, entry.when]);
          console.error(`REPAIRED: inserted ledger row for ${entry.tag}`);
        }
      } else if (!sentinelPresent && ledgerPresent) {
        console.error(`DIVERGENCE: ${entry.tag} (idx ${entry.idx}) \u2014 ledger row present, schema missing`);
        hasDivergence = true;
      }
    }
    if (hasDivergence && mode === "repair") {
      let stillDivergent = false;
      for (const entry of journal.entries) {
        const sentinel = sentinelProbes[entry.tag];
        if (!sentinel) continue;
        const sentinelPresent = await checkSentinel(client, sentinel);
        const updatedLedger = await client.unsafe("SELECT created_at FROM drizzle.__drizzle_migrations WHERE created_at = $1", [entry.when]);
        if (sentinelPresent && updatedLedger.length === 0) stillDivergent = true;
      }
      process.exit(stillDivergent ? 1 : 0);
    }
    process.exit(hasDivergence ? 1 : 0);
  } finally { await client.end(); }
}
main().catch((err) => { console.error("Unhandled error:", err); process.exit(2); });
