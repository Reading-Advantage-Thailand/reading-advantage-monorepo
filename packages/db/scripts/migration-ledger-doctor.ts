#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import postgres from "postgres";
import { sentinelProbes, type SentinelProbe } from "../src/sentinels.js";
import { checkTableSentinel } from "../src/sentinel-evaluation.js";
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
 * contract: app pipelines pass the exact migration tag their app code
 * requires. The doctor fails closed (exit 1) unless that timestamp has one
 * matching committed-SQL hash and its schema sentinel is present.
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

const TRIGGER_TYPE_BITS = {
  ROW: 1,
  BEFORE: 2,
  INSERT: 4,
  DELETE: 8,
  UPDATE: 16,
  TRUNCATE: 32,
  INSTEAD: 64,
} as const;

/** Computes PostgreSQL's trigger type bitmask for a sentinel declaration. */
function triggerTypeCode(probe: SentinelProbe): number | undefined {
  if (
    probe.triggerTiming === undefined ||
    probe.triggerLevel === undefined ||
    probe.triggerEvents === undefined
  ) {
    return undefined;
  }
  const timing =
    probe.triggerTiming === "BEFORE"
      ? TRIGGER_TYPE_BITS.BEFORE
      : probe.triggerTiming === "AFTER"
        ? 0
        : TRIGGER_TYPE_BITS.INSTEAD;
  const level = probe.triggerLevel === "ROW" ? TRIGGER_TYPE_BITS.ROW : 0;
  const events = probe.triggerEvents.reduce(
    (bits, event) => bits | TRIGGER_TYPE_BITS[event],
    0,
  );
  return timing | level | events;
}

/** Produces a stable representation of a PostgreSQL function body for review hashing. */
function normalizeFunctionBody(source: string): string {
  return source.replace(/\s+/gu, " ").trim();
}

/**
 * Reads the committed SQL hash for a journal entry.
 * @param entry The journal entry whose migration file is trusted.
 * @returns The SHA-256 hash recorded by the migration runner.
 * @throws When the checked-in migration file cannot be read.
 */
function readMigrationHash(entry: JournalEntry): string {
  return createHash("sha256")
    .update(readFileSync(join(DRIZZLE_DIR, `${entry.tag}.sql`), "utf8"))
    .digest("hex");
}

async function checkSentinel(
  client: postgres.Sql,
  probe: SentinelProbe,
): Promise<boolean> {
  if (probe.kind === "all") {
    if (probe.allOf === undefined || probe.allOf.length === 0) return false;
    const results = await Promise.all(
      probe.allOf.map(async (requiredProbe) =>
        checkSentinel(client, requiredProbe),
      ),
    );
    return results.every((present) => present);
  }
  if (probe.kind === "table") {
    return checkTableSentinel(client, "table", probe.target);
  }
  if (probe.kind === "table_absent") {
    return checkTableSentinel(client, "table_absent", probe.target);
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
  if (probe.kind === "trigger") {
    const triggerType = triggerTypeCode(probe);
    if (
      !probe.table ||
      !probe.triggerFunction ||
      triggerType === undefined ||
      probe.triggerFunctionBodySha256 === undefined ||
      probe.triggerFunctionConfig === undefined ||
      probe.triggerFunctionLanguage === undefined ||
      probe.triggerFunctionSecurityDefiner === undefined
    ) {
      return false;
    }
    const rows = (await client.unsafe(
      `
      SELECT trigger_function.prosrc AS function_body,
             trigger_function.proconfig AS function_config,
             trigger_language.lanname AS function_language,
             trigger_function.prosecdef AS function_security_definer
        FROM pg_trigger trigger_record
        JOIN pg_class relation ON relation.oid = trigger_record.tgrelid
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        JOIN pg_proc trigger_function ON trigger_function.oid = trigger_record.tgfoid
        JOIN pg_language trigger_language
          ON trigger_language.oid = trigger_function.prolang
        JOIN pg_namespace function_namespace
          ON function_namespace.oid = trigger_function.pronamespace
       WHERE namespace.nspname = 'public'
         AND relation.relname = $1
         AND trigger_record.tgname = $2
         AND function_namespace.nspname = 'public'
         AND trigger_function.proname = $3
         AND trigger_function.pronargs = 0
         AND trigger_record.tgtype = $4
         AND trigger_record.tgenabled IN ('O', 'A')
         AND NOT trigger_record.tgisinternal
      LIMIT 1
    `,
      [probe.table, probe.target, probe.triggerFunction, triggerType],
    )) as Array<{
      function_body: string;
      function_config: string[] | null;
      function_language: string;
      function_security_definer: boolean;
    }>;
    const row = rows[0];
    if (rows.length !== 1 || row === undefined) return false;
    const functionBodySha256 = createHash("sha256")
      .update(normalizeFunctionBody(row.function_body))
      .digest("hex");
    return (
      functionBodySha256 === probe.triggerFunctionBodySha256 &&
      JSON.stringify(row.function_config ?? []) ===
        JSON.stringify(probe.triggerFunctionConfig) &&
      row.function_language === probe.triggerFunctionLanguage &&
      row.function_security_definer === probe.triggerFunctionSecurityDefiner
    );
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
  if (!mode) {
    console.error(
      "Usage: tsx scripts/migration-ledger-doctor.ts [--check|--repair] [--required-migration <tag>]",
    );
    process.exit(2);
  }
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
    const duplicateLedgerTimestamps = new Set<number>();
    let malformedLedgerRows = false;
    let hasDivergence = false;
    for (const row of ledgerRows) {
      if (row.created_at === null) {
        console.error(
          "DIVERGENCE: migration ledger contains a null created_at timestamp",
        );
        malformedLedgerRows = true;
        hasDivergence = true;
        continue;
      }
      const createdAt = Number(row.created_at);
      if (!Number.isSafeInteger(createdAt)) {
        console.error(
          `DIVERGENCE: invalid migration ledger created_at timestamp ${String(row.created_at)}`,
        );
        malformedLedgerRows = true;
        hasDivergence = true;
        continue;
      }
      if (ledgerByCreatedAt.has(createdAt)) {
        duplicateLedgerTimestamps.add(createdAt);
      } else {
        ledgerByCreatedAt.set(createdAt, row);
      }
    }
    for (const createdAt of duplicateLedgerTimestamps) {
      console.error(
        `DIVERGENCE: duplicate migration ledger timestamp ${createdAt}`,
      );
      hasDivergence = true;
    }
    const requiredTag = parseRequiredMigration();
    const requiredEntry = requiredTag
      ? journal.entries.find((entry) => entry.tag === requiredTag)
      : undefined;
    // A deploy check with a required migration validates that migration's
    // exact sentinel below. Full parity scanning remains the default and is
    // retained for repair mode so existing reconciliation behavior is intact.
    const inspectAllSentinels = mode === "repair" || !requiredEntry;
    for (const entry of journal.entries) {
      if (
        !inspectAllSentinels &&
        requiredEntry &&
        entry.tag !== requiredEntry.tag
      ) {
        continue;
      }
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
    // `REQUIRED_MIGRATION=<tag>` is supplied, the DB must contain exactly one
    // row at the requested journal timestamp with the committed SQL hash, and
    // the migration's schema sentinel must be present. A later unknown ledger
    // timestamp cannot satisfy this exact gate.
    let requiredGateValid = true;
    if (requiredTag) {
      if (!requiredEntry) {
        console.error(
          `Required migration behind count: 0 — required tag "${requiredTag}" is not in _journal.json (typo or stale pipeline config)`,
        );
        process.exit(1);
      }
      const requiredLedgerRows = (await client.unsafe(
        `SELECT hash, created_at
           FROM drizzle.__drizzle_migrations
          WHERE created_at = $1
          ORDER BY id`,
        [requiredEntry.when],
      )) as LedgerRow[];
      const expectedRequiredHash = readMigrationHash(requiredEntry);
      const requiredSentinel = sentinelProbes[requiredTag];
      const requiredSentinelPresent = requiredSentinel
        ? await checkSentinel(client, requiredSentinel)
        : false;
      if (requiredLedgerRows.length !== 1) {
        console.error(
          `Required migration gate failed — "${requiredTag}" requires exactly one ledger row at timestamp ${requiredEntry.when}, found ${requiredLedgerRows.length}.`,
        );
        hasDivergence = true;
        requiredGateValid = false;
      } else if (requiredLedgerRows[0]?.hash !== expectedRequiredHash) {
        console.error(
          `Required migration gate failed — "${requiredTag}" ledger hash does not match the committed SQL hash.`,
        );
        hasDivergence = true;
        requiredGateValid = false;
      }
      if (!requiredSentinel) {
        console.error(
          `Required migration gate failed — no sentinel is configured for "${requiredTag}".`,
        );
        hasDivergence = true;
        requiredGateValid = false;
      } else if (!requiredSentinelPresent) {
        console.error(
          `Required migration gate failed — schema sentinel is missing for "${requiredTag}".`,
        );
        hasDivergence = true;
        requiredGateValid = false;
      }
      if (requiredGateValid) {
        console.error(
          `Required migration gate OK — "${requiredTag}" has its exact ledger timestamp, committed hash, and schema sentinel.`,
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
      if (malformedLedgerRows) stillDivergent = true;
      if (duplicateLedgerTimestamps.size > 0) stillDivergent = true;
      if (requiredTag && !requiredGateValid) stillDivergent = true;
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
