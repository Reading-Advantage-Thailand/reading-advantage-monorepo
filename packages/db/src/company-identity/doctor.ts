import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createCompanyIdentityDirectClient } from "./client.js";

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../company-identity/drizzle/", import.meta.url),
);
const IMMUTABLE_AUDIT_TRIGGER_DEFINITION =
  "CREATE TRIGGER company_identity_audit_events_immutable_trigger BEFORE DELETE OR UPDATE OR TRUNCATE ON public.company_identity_audit_events FOR EACH STATEMENT EXECUTE FUNCTION company_identity_reject_audit_mutation()";
const IMMUTABLE_AUDIT_FUNCTION_BODY =
  "BEGIN RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'company_identity_audit_events is immutable'; RETURN NULL; END;";

interface JournalEntry {
  readonly idx: number;
  readonly when: number;
  readonly tag: string;
}

interface Journal {
  readonly entries: readonly JournalEntry[];
}

/** A catalog marker used to detect schema drift for a migration. */
export interface CompanyIdentityDoctorSentinel {
  readonly migrationTag: string;
  readonly kind: "table" | "column" | "trigger";
  readonly schemaName: string;
  readonly tableName: string;
  readonly columnName?: string;
  readonly triggerName?: string;
}

/** One migration-ledger or catalog defect reported by the identity doctor. */
export interface CompanyIdentityDoctorIssue {
  readonly code:
    | "MISSING_LEDGER"
    | "LEDGER_HASH_MISMATCH"
    | "LEDGER_TIMESTAMP_MISMATCH"
    | "UNEXPECTED_LEDGER"
    | "MISSING_SENTINEL";
  readonly migrationTag: string;
}

/** Result of a company identity migration-ledger and catalog inspection. */
export interface CompanyIdentityDoctorReport {
  readonly clean: boolean;
  readonly issues: readonly CompanyIdentityDoctorIssue[];
  readonly sentinels: readonly CompanyIdentityDoctorSentinel[];
}

/**
 * Selects the catalog object whose absence proves a migration is incomplete.
 * @param entry The reviewed identity migration journal entry.
 * @returns The stable table, column, or trigger sentinel for the migration.
 */
function sentinelFor(entry: JournalEntry): CompanyIdentityDoctorSentinel {
  switch (entry.tag) {
    case "0000_company_identity_base":
      return {
        migrationTag: entry.tag,
        kind: "table",
        schemaName: "public",
        tableName: "company_accounts",
      };
    case "0001_immutable_identity_audit":
      return {
        migrationTag: entry.tag,
        kind: "trigger",
        schemaName: "public",
        tableName: "company_identity_audit_events",
        triggerName: "company_identity_audit_events_immutable_trigger",
      };
    default:
      throw new Error(
        `Company identity doctor has no reviewed sentinel for migration ${entry.tag}.`,
      );
  }
}

/**
 * Inspects the company identity migration ledger and catalog sentinels for drift.
 * @param input Direct company identity database URL with ledger and catalog read access.
 * @returns A deterministic report describing missing or modified migration evidence.
 * @throws When the target probe, migration files, ledger query, or catalog query fails.
 */
export async function inspectCompanyIdentityDatabase(input: {
  readonly directDatabaseUrl: string;
}): Promise<CompanyIdentityDoctorReport> {
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
  const sentinels = journal.entries.map(sentinelFor);
  const issues: CompanyIdentityDoctorIssue[] = [];
  const sql = await createCompanyIdentityDirectClient({
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

    for (const sentinel of sentinels) {
      let present: { exists: boolean } | undefined;
      if (sentinel.kind === "table") {
        [present] = await sql<{ exists: boolean }[]>`
          select exists(
            select 1
              from information_schema.tables
             where table_schema = ${sentinel.schemaName}
               and table_name = ${sentinel.tableName}
               and table_type = 'BASE TABLE'
          ) as exists
        `;
      } else if (sentinel.kind === "column") {
        [present] = await sql<{ exists: boolean }[]>`
          select exists(
            select 1
              from information_schema.columns
             where table_schema = ${sentinel.schemaName}
               and table_name = ${sentinel.tableName}
               and column_name = ${sentinel.columnName ?? ""}
          ) as exists
        `;
      } else {
        [present] = await sql<{ exists: boolean }[]>`
          select exists(
            select 1
              from pg_catalog.pg_trigger trigger
              join pg_catalog.pg_class relation
                on relation.oid = trigger.tgrelid
              join pg_catalog.pg_namespace namespace
                on namespace.oid = relation.relnamespace
              join pg_catalog.pg_proc procedure
                on procedure.oid = trigger.tgfoid
             where namespace.nspname = ${sentinel.schemaName}
               and relation.relname = ${sentinel.tableName}
               and trigger.tgname = ${sentinel.triggerName ?? ""}
               and not trigger.tgisinternal
               and trigger.tgenabled in ('O', 'A')
               and pg_catalog.pg_get_triggerdef(trigger.oid, false) =
                   ${IMMUTABLE_AUDIT_TRIGGER_DEFINITION}
               and btrim(
                     regexp_replace(
                       procedure.prosrc,
                       '[[:space:]]+',
                       ' ',
                       'g'
                     )
                   ) = ${IMMUTABLE_AUDIT_FUNCTION_BODY}
          ) as exists
        `;
      }
      if (!present?.exists) {
        issues.push({
          code: "MISSING_SENTINEL",
          migrationTag: sentinel.migrationTag,
        });
      }
    }
  } finally {
    await sql.end({ timeout: 5 });
  }

  return { clean: issues.length === 0, issues, sentinels };
}
