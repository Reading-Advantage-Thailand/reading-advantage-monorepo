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
  readonly kind: "table" | "column" | "trigger" | "constraint";
  readonly schemaName: string;
  readonly tableName: string;
  readonly columnName?: string;
  readonly triggerName?: string;
  readonly constraintName?: string;
  readonly expectedAllowlistKeys?: readonly string[];
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
 * @returns The stable catalog sentinel for the migration.
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
    case "0002_identity_audit_metadata_allowlist":
      return {
        migrationTag: entry.tag,
        kind: "column",
        schemaName: "public",
        tableName: "company_identity_audit_events",
        columnName: "metadata",
      };
    case "0003_finance_attestation_audit_metadata":
      return {
        migrationTag: entry.tag,
        kind: "constraint",
        schemaName: "public",
        tableName: "company_identity_audit_events",
        constraintName:
          "company_identity_audit_events_metadata_allowed_keys_check",
        expectedAllowlistKeys: [
          "source",
          "previousStatus",
          "newStatus",
          "roleKey",
          "clientId",
          "requestedClientId",
          "registeredClientId",
          "applicationKey",
          "resourceType",
          "actorKind",
          "actorSubjectId",
          "objectId",
          "requestId",
          "eventId",
          "occurredAt",
          "schoolId",
          "claimsVersion",
          "policyVersion",
          "routeBindingId",
          "routeMethod",
          "routePath",
          "routeTransport",
          "credentialAlgorithm",
          "sessionCount",
          "normalizationVersion",
          "migrationRunId",
          "sourcePrincipalId",
          "sourceFingerprint",
          "idempotencyReplay",
          "expiresAt",
          "reasonCategory",
        ],
      };
    default:
      throw new Error(
        `Company identity doctor has no reviewed sentinel for migration ${entry.tag}.`,
      );
  }
}

/** Removes one balanced pair of SQL parentheses from a normalized expression. */
function unwrapSqlParentheses(value: string): string {
  let result = value.trim();
  while (result.startsWith("(") && result.endsWith(")")) {
    let depth = 0;
    let quoted = false;
    let closesAtEnd = true;
    for (let index = 0; index < result.length; index += 1) {
      const character = result[index]!;
      if (character === "'" && result[index + 1] === "'") {
        index += 1;
        continue;
      }
      if (character === "'") {
        quoted = !quoted;
        continue;
      }
      if (quoted) continue;
      if (character === "(") depth += 1;
      if (character === ")") {
        depth -= 1;
        if (depth === 0 && index !== result.length - 1) {
          closesAtEnd = false;
          break;
        }
      }
    }
    if (!closesAtEnd || depth !== 0) break;
    result = result.slice(1, -1).trim();
  }
  return result;
}

/**
 * Normalizes SQL keywords and whitespace without changing quoted string literals.
 * @param value PostgreSQL's rendered SQL expression.
 * @returns The expression with unquoted SQL spelling normalized for comparison.
 */
function normalizeSqlDefinition(value: string): string {
  let normalized = "";
  let quoted = false;
  let pendingWhitespace = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (character === "'") {
      if (pendingWhitespace && normalized.length > 0) {
        normalized += " ";
        pendingWhitespace = false;
      }
      normalized += character;
      if (value[index + 1] === "'") {
        normalized += "'";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && /\s/u.test(character)) {
      pendingWhitespace = true;
      continue;
    }
    if (pendingWhitespace && normalized.length > 0) {
      normalized += " ";
      pendingWhitespace = false;
    }
    normalized += quoted ? character : character.toLowerCase();
  }
  return normalized.trim();
}

/** Removes identifier quotes without changing any single-quoted SQL literal. */
function stripIdentifierQuotesOutsideLiterals(value: string): string {
  let result = "";
  let quotedLiteral = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (character === "'") {
      result += character;
      if (value[index + 1] === "'") {
        result += "'";
        index += 1;
      } else {
        quotedLiteral = !quotedLiteral;
      }
      continue;
    }
    if (!quotedLiteral && character === '"') continue;
    result += character;
  }
  return result;
}

/** Removes SQL whitespace outside quoted literals for structural parsing. */
function compactSqlDefinition(value: string): string {
  let compact = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (character === "'") {
      compact += character;
      if (value[index + 1] === "'") {
        compact += "'";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (quoted || !/\s/u.test(character)) compact += character;
  }
  return compact;
}

/** Splits a normalized SQL expression at its top-level AND operator. */
function splitTopLevelAnd(value: string): readonly string[] {
  const compact = compactSqlDefinition(value);
  const parts: string[] = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quoted = false;
  for (let index = 0; index < compact.length; index += 1) {
    const character = compact[index]!;
    if (character === "'" && compact[index + 1] === "'") {
      index += 1;
      continue;
    }
    if (character === "'") {
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (character === "(") parentheses += 1;
    else if (character === ")") parentheses -= 1;
    else if (character === "[") brackets += 1;
    else if (character === "]") brackets -= 1;
    else if (
      parentheses === 0 &&
      brackets === 0 &&
      compact.slice(index, index + 3) === "and"
    ) {
      parts.push(compact.slice(start, index));
      start = index + 3;
      index += 2;
    }
  }
  parts.push(compact.slice(start));
  return parts;
}

/** Validates the exact reviewed Finance metadata constraint semantics.
 * @param definition PostgreSQL's rendered check-constraint definition.
 * @param expectedKeys Ordered metadata keys approved by the Finance migration.
 * @returns Whether the definition exactly matches the reviewed constraint.
 */
export function isExactCompanyIdentityFinanceMetadataConstraintDefinition(
  definition: string,
  expectedKeys: readonly string[],
): boolean {
  const normalized = normalizeSqlDefinition(
    stripIdentifierQuotesOutsideLiterals(definition),
  );
  if (!normalized.startsWith("check")) return false;
  const expression = unwrapSqlParentheses(normalized.slice("check".length));
  const parts = splitTopLevelAnd(expression);
  if (parts.length !== 2) return false;
  const left = unwrapSqlParentheses(parts[0]!);
  if (
    left !== "jsonb_typeof(metadata)='object'::text" &&
    left !== "jsonb_typeof(metadata)='object'"
  ) {
    return false;
  }

  let right = unwrapSqlParentheses(parts[1]!);
  const groupedArrayPrefix = "(metadata-array[";
  const groupedArrayMarker = "])='{}'::jsonb";
  if (
    right.startsWith(groupedArrayPrefix) &&
    right.endsWith(groupedArrayMarker)
  ) {
    right = `metadata-array[${right.slice(
      groupedArrayPrefix.length,
      -groupedArrayMarker.length,
    )}]='{}'::jsonb`;
  }
  const suffix = "]='{}'::jsonb";
  if (!right.startsWith("metadata-array[") || !right.endsWith(suffix)) {
    return false;
  }
  const encodedKeys = right.slice("metadata-array[".length, -suffix.length);
  const expectedEncodedKeys = expectedKeys
    .map((key) => `'${key}'::text`)
    .join(",");
  return encodedKeys === expectedEncodedKeys;
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
      } else if (sentinel.kind === "trigger") {
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
      } else {
        const [constraint] = await sql<{ definition: string }[]>`
          select pg_catalog.pg_get_constraintdef(constraint_row.oid, false) as definition
            from pg_catalog.pg_constraint constraint_row
            join pg_catalog.pg_class relation
              on relation.oid = constraint_row.conrelid
            join pg_catalog.pg_namespace namespace
              on namespace.oid = relation.relnamespace
           where namespace.nspname = ${sentinel.schemaName}
             and relation.relname = ${sentinel.tableName}
             and constraint_row.conname = ${sentinel.constraintName ?? ""}
             and constraint_row.contype = 'c'
        `;
        present = {
          exists:
            constraint !== undefined &&
            sentinel.expectedAllowlistKeys !== undefined &&
            isExactCompanyIdentityFinanceMetadataConstraintDefinition(
              constraint.definition,
              sentinel.expectedAllowlistKeys,
            ),
        };
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
