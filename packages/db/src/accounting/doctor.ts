import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createAccountingDirectClient } from "./client.js";

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../accounting/drizzle/", import.meta.url),
);

interface JournalEntry {
  readonly idx: number;
  readonly when: number;
  readonly tag: string;
}

interface Journal {
  readonly entries: readonly JournalEntry[];
}

/** One migration-ledger or catalog defect reported by the Accounting doctor. */
export interface AccountingDoctorIssue {
  readonly code:
    | "MISSING_LEDGER"
    | "LEDGER_HASH_MISMATCH"
    | "LEDGER_TIMESTAMP_MISMATCH"
    | "UNEXPECTED_LEDGER"
    | "MISSING_TABLE";
  readonly migrationTag: string;
}

/** Result of an Accounting migration-ledger and catalog inspection. */
export interface AccountingDoctorReport {
  readonly clean: boolean;
  readonly issues: readonly AccountingDoctorIssue[];
  readonly tables: readonly string[];
}

/**
 * Inspects the Accounting migration ledger and table existence for drift.
 * @param input Direct Accounting database URL with ledger and catalog read access.
 * @returns A deterministic report describing missing or modified migration evidence.
 * @throws When the target probe, migration files, ledger query, or catalog query fails.
 */
export async function inspectAccountingDatabase(input: {
  readonly directDatabaseUrl: string;
}): Promise<AccountingDoctorReport> {
  const journal = JSON.parse(
    await readFile(`${MIGRATIONS_FOLDER}meta/_journal.json`, "utf8"),
  ) as Journal;
  const expected = await Promise.all(
    journal.entries.map(async (entry) => ({
      entry,
      hash: createHash("sha256")
        .update(await readFile(`${MIGRATIONS_FOLDER}${entry.tag}.sql`, "utf8"))
        .digest("hex"),
    })),
  );
  const issues: AccountingDoctorIssue[] = [];
  const sql = await createAccountingDirectClient({
    directDatabaseUrl: input.directDatabaseUrl,
  });
  try {
    const ledger = await sql<
      Array<{ id: number; hash: string; created_at: string }>
    >`
      select id, hash, created_at::text
        from drizzle.__drizzle_migrations
       order by id
    `;
    for (let index = 0; index < expected.length; index += 1) {
      const expectedMigration = expected[index]!;
      const actual = ledger[index];
      if (!actual) {
        issues.push({
          code: "MISSING_LEDGER",
          migrationTag: expectedMigration.entry.tag,
        });
        continue;
      }
      if (actual.hash !== expectedMigration.hash) {
        issues.push({
          code: "LEDGER_HASH_MISMATCH",
          migrationTag: expectedMigration.entry.tag,
        });
      }
      if (BigInt(actual.created_at) !== BigInt(expectedMigration.entry.when)) {
        issues.push({
          code: "LEDGER_TIMESTAMP_MISMATCH",
          migrationTag: expectedMigration.entry.tag,
        });
      }
    }
    for (let index = expected.length; index < ledger.length; index += 1) {
      issues.push({
        code: "UNEXPECTED_LEDGER",
        migrationTag: `ledger-row-${ledger[index]!.id}`,
      });
    }

    const tables = ["accounting_submissions", "accounting_submission_audit_events"];
    for (const tableName of tables) {
      const [present] = await sql<{ exists: boolean }[]>`
        select exists(
          select 1
            from information_schema.tables
           where table_schema = 'public'
             and table_name = ${tableName}
             and table_type = 'BASE TABLE'
        ) as exists
      `;
      if (!present?.exists) {
        issues.push({ code: "MISSING_TABLE", migrationTag: tableName });
      }
    }

    return { clean: issues.length === 0, issues, tables };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
