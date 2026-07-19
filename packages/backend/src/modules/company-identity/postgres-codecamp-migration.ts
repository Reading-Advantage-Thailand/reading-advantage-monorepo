import { createHash } from "node:crypto";
import postgres from "postgres";

import {
  CODECAMP_MIGRATION_APPLY_CONFIRMATION,
  CODECAMP_MIGRATION_SOURCE_DATABASE,
  CODECAMP_MIGRATION_TARGET_DATABASE,
  CodecampMigrationPlanningError,
  deriveCodecampMigrationUuid,
  fingerprintCodecampMigrationSource,
  planCodecampIdentityMigration,
  summarizeCodecampMigrationPlan,
  type CodecampMigrationPlan,
  type CodecampMigrationSummary,
  type CodecampOwnershipEvidence,
  type CodecampSourceIdentity,
  type CodecampTargetIdentity,
} from "./codecamp-migration.js";

type Sql = ReturnType<typeof postgres>;
const CODECAMP_ROLES = ["ADMIN", "INTERN", "STUDENT", "TEACHER"] as const;
const SOURCE_TABLES = [
  "users",
  "accounts",
  "sessions",
  "codecamp_chat_conversations",
  "codecamp_curriculum_assignments",
  "codecamp_pr_review_attempts",
  "codecamp_pr_reviews",
  "codecamp_tutor_interventions",
  "codecamp_user_progress",
] as const;
const OWNERSHIP_TABLES = SOURCE_TABLES.filter((table) =>
  table.startsWith("codecamp_"),
);
const TARGET_TABLES = [
  "company_accounts",
  "company_password_credentials",
  "company_organizations",
  "company_organization_memberships",
  "company_role_assignments",
  "company_applications",
  "company_application_role_definitions",
  "company_application_role_assignments",
  "company_identity_audit_events",
] as const;
const CODECAMP_SYNC_MIGRATION_MILLIS = 1_784_446_059_725;
const CODECAMP_SYNC_MIGRATION_SHA256 =
  "9d7aee6db524a5629ce868fa8cd5e088d0695415d719fa678e8a4f9eb70f9d52";
const SAFE_IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;

/** Input for the PostgreSQL-backed Codecamp identity migration adapter. */
export interface PostgresCodecampMigrationInput {
  /** Direct connection to the exact Codecamp source database. */
  readonly sourceDatabaseUrl: string;
  /** Direct connection to the exact company identity target database. */
  readonly targetDatabaseUrl: string;
  /** Read-only planning or explicitly approved application. */
  readonly mode: "dry-run" | "apply";
  /** Exact dry-run fingerprint approved by the operator for apply. */
  readonly expectedSourceFingerprint?: string;
  /** Exact apply confirmation phrase. */
  readonly confirmation?: string;
}

interface TargetPreflight {
  readonly organizationId: string;
  readonly applicationId: string;
}
interface SourceInventory {
  readonly identities: readonly CodecampSourceIdentity[];
  readonly ownership: readonly CodecampOwnershipEvidence[];
  readonly legacySessionCount: number;
  readonly unexpiredLegacySessionCount: number;
  readonly mappingSchemaReady: boolean;
}

/**
 * Validates explicit write authorization before opening a database connection.
 * @param input Operator-selected mode and explicit apply authorization.
 * @returns Nothing after validation succeeds.
 * @throws When dry-run includes write flags or apply lacks exact authorization.
 */
export function validatePostgresCodecampMigrationInput(
  input: PostgresCodecampMigrationInput,
): void {
  if (input.mode === "dry-run") {
    if (input.expectedSourceFingerprint || input.confirmation) {
      throw new PostgresCodecampMigrationError(
        "DRY_RUN_APPLY_INPUT_REJECTED",
        "Dry run does not accept apply authorization values.",
      );
    }
    return;
  }
  if (!/^[a-f0-9]{64}$/.test(input.expectedSourceFingerprint ?? "")) {
    throw new PostgresCodecampMigrationError(
      "EXPECTED_FINGERPRINT_REQUIRED",
      "Apply requires an exact 64-character expected source fingerprint.",
    );
  }
  if (input.confirmation !== CODECAMP_MIGRATION_APPLY_CONFIRMATION) {
    throw new PostgresCodecampMigrationError(
      "APPLY_CONFIRMATION_REQUIRED",
      "Apply requires the exact Codecamp migration confirmation phrase.",
    );
  }
}

/** Secret-safe adapter failure that never includes a URL, username, or hash. */
export class PostgresCodecampMigrationError extends Error {
  /** Stable machine-readable failure category. */
  readonly code: string;

  /**
   * Creates a secret-safe PostgreSQL migration failure.
   * @param code Stable machine-readable failure category.
   * @param message Non-sensitive operator-facing explanation.
   */
  constructor(code: string, message: string) {
    super(message);
    this.name = "PostgresCodecampMigrationError";
    this.code = code;
  }
}

async function assertDatabaseAndTables(
  sql: Sql,
  databaseName: string,
  tables: readonly string[],
  kind: "SOURCE" | "TARGET",
): Promise<void> {
  const [database] = await sql<Array<{ name: string }>>`
    select current_database() as name
  `;
  if (database?.name !== databaseName) {
    throw new PostgresCodecampMigrationError(
      `${kind}_DATABASE_INVALID`,
      `${kind === "SOURCE" ? "Source" : "Target"} database must be ${databaseName}.`,
    );
  }
  const rows = await sql<Array<{ name: string }>>`
    select table_name as name from information_schema.tables
     where table_schema = 'public' and table_name = any(${tables as string[]})
  `;
  const present = new Set(rows.map((row) => row.name));
  const missing = tables.filter((table) => !present.has(table));
  if (missing.length > 0) {
    throw new PostgresCodecampMigrationError(
      `${kind}_SCHEMA_NOT_READY`,
      `${kind === "SOURCE" ? "Source Codecamp" : "Target identity"} schema is missing ${missing.length} required table(s).`,
    );
  }
}

async function preflightSource(sql: Sql): Promise<void> {
  await assertDatabaseAndTables(
    sql,
    CODECAMP_MIGRATION_SOURCE_DATABASE,
    SOURCE_TABLES,
    "SOURCE",
  );
  const columns = await sql<Array<{ tableName: string; columnName: string }>>`
    select table_name as "tableName", column_name as "columnName"
      from information_schema.columns
     where table_schema = 'public'
       and (
         (table_name = 'users' and column_name = any(${[
           "id",
           "username",
           "display_username",
           "name",
           "github_username",
           "role",
           "created_at",
         ]}))
         or (table_name = 'accounts' and column_name = any(${[
           "user_id",
           "provider_id",
           "password",
         ]}))
       )
  `;
  if (columns.length !== 10) {
    throw new PostgresCodecampMigrationError(
      "SOURCE_COLUMNS_INVALID",
      "Source Codecamp identity columns are incomplete.",
    );
  }
  const [ledger] = await sql<Array<{ present: boolean }>>`
    select to_regclass('drizzle.__drizzle_migrations') is not null as present
  `;
  if (!ledger?.present) {
    throw new PostgresCodecampMigrationError(
      "SOURCE_MIGRATION_LEDGER_MISSING",
      "Source Codecamp migration ledger is missing.",
    );
  }
}

async function preflightTarget(sql: Sql): Promise<TargetPreflight> {
  await assertDatabaseAndTables(
    sql,
    CODECAMP_MIGRATION_TARGET_DATABASE,
    TARGET_TABLES,
    "TARGET",
  );
  const rows = await sql<
    Array<{ organizationId: string; applicationId: string }>
  >`
    select organization.id::text as "organizationId",
           application.id::text as "applicationId"
      from company_organizations organization
      cross join company_applications application
     where organization.stable_key = 'internal-company'
       and organization.status = 'ACTIVE'
       and application.stable_key = 'codecamp'
       and application.status = 'ACTIVE'
  `;
  if (rows.length !== 1) {
    throw new PostgresCodecampMigrationError(
      "TARGET_BOOTSTRAP_INVALID",
      "Target must contain one active internal company and Codecamp application.",
    );
  }
  const roles = await sql<Array<{ roleKey: string }>>`
    select definition.role_key as "roleKey"
      from company_application_role_definitions definition
      join company_applications application on application.id = definition.application_id
     where application.stable_key = 'codecamp'
       and definition.status = 'ACTIVE'
       and definition.role_key = any(${[...CODECAMP_ROLES]})
     order by definition.role_key
  `;
  if (
    roles.map((row) => row.roleKey).join(",") !== "ADMIN,INTERN,STUDENT,TEACHER"
  ) {
    throw new PostgresCodecampMigrationError(
      "TARGET_ROLE_DEFINITIONS_INVALID",
      "Target Codecamp role definitions are incomplete.",
    );
  }
  return rows[0]!;
}

function assertIdentifier(identifier: string): void {
  if (!SAFE_IDENTIFIER.test(identifier)) {
    throw new PostgresCodecampMigrationError(
      "SOURCE_OWNERSHIP_SCHEMA_INVALID",
      "Codecamp ownership metadata is invalid.",
    );
  }
}

async function readOwnership(sql: Sql): Promise<CodecampOwnershipEvidence[]> {
  const evidence: CodecampOwnershipEvidence[] = [];
  for (const table of OWNERSHIP_TABLES) {
    assertIdentifier(table);
    const keys = await sql<Array<{ name: string }>>`
      select attribute.attname as name
        from pg_constraint constraint_row
        join pg_class relation on relation.oid = constraint_row.conrelid
        join pg_namespace namespace on namespace.oid = relation.relnamespace
        join unnest(constraint_row.conkey) with ordinality key(attnum, position) on true
        join pg_attribute attribute
          on attribute.attrelid = relation.oid and attribute.attnum = key.attnum
       where namespace.nspname = 'public' and relation.relname = ${table}
         and constraint_row.contype = 'p'
       order by key.position
    `;
    if (keys.length === 0) {
      throw new PostgresCodecampMigrationError(
        "SOURCE_OWNERSHIP_SCHEMA_INVALID",
        "A Codecamp ownership table has no primary key.",
      );
    }
    keys.forEach((key) => assertIdentifier(key.name));
    const selected = ["user_id", ...keys.map((key) => key.name)];
    const selection = selected.map((column) => `"${column}"::text`).join(", ");
    const ordering = selected.map((column) => `"${column}"`).join(", ");
    const rows = await sql.unsafe<Array<Record<string, string>>>(
      `select ${selection} from "${table}" order by ${ordering}`,
    );
    const hash = createHash("sha256");
    const owners = new Set<string>();
    for (const row of rows) {
      owners.add(row.user_id ?? "");
      for (const column of selected) {
        const value = row[column] ?? "";
        hash.update(`${Buffer.byteLength(value, "utf8")}:${value}`);
      }
      hash.update("\n");
    }
    evidence.push({
      table,
      rowCount: rows.length,
      ownerCount: owners.size,
      fingerprint: hash.digest("hex"),
    });
  }
  return evidence;
}

async function readSource(sql: Sql): Promise<SourceInventory> {
  const [coverage] = await sql<
    Array<{
      users: number;
      credentials: number;
      owners: number;
      missing: number;
    }>
  >`
    select (select count(*)::int from users) as users,
           count(*)::int as credentials,
           count(distinct user_id)::int as owners,
           count(*) filter (where password is null)::int as missing
      from accounts where provider_id = 'credential'
  `;
  if (
    !coverage ||
    coverage.users !== coverage.credentials ||
    coverage.users !== coverage.owners ||
    coverage.missing !== 0
  ) {
    throw new PostgresCodecampMigrationError(
      "SOURCE_CREDENTIAL_COVERAGE_INVALID",
      "Every source identity must have exactly one non-empty credential.",
    );
  }
  const [unsupported] = await sql<Array<{ count: number }>>`
    select count(*)::int as count from users
     where role::text <> all(${[...CODECAMP_ROLES]})
  `;
  if ((unsupported?.count ?? 0) !== 0) {
    throw new PostgresCodecampMigrationError(
      "SOURCE_ROLE_UNSUPPORTED",
      "One or more source identities have an unsupported or ambiguous role.",
    );
  }
  const identities = await sql<CodecampSourceIdentity[]>`
    select users.id, users.username,
           users.display_username as "displayUsername",
           users.name as "displayName",
           users.github_username as "githubUsername",
           users.role::text as role, users.created_at as "createdAt",
           account.password as "passwordHash"
      from users join accounts account
        on account.user_id = users.id and account.provider_id = 'credential'
     order by users.id
  `;
  const [sessions] = await sql<Array<{ total: number; unexpired: number }>>`
    select count(*)::int as total,
           count(*) filter (where expires_at > now())::int as unexpired
      from sessions
  `;
  const [mapping] = await sql<
    Array<{ tableReady: boolean; functionReady: boolean; ledgerReady: boolean }>
  >`
    select to_regclass('public.company_product_principals') is not null as "tableReady",
           to_regprocedure('public.sync_codecamp_company_principal(uuid,text,uuid,text,text)') is not null as "functionReady",
           exists(
             select 1 from drizzle.__drizzle_migrations
              where created_at = ${CODECAMP_SYNC_MIGRATION_MILLIS}
                and hash = ${CODECAMP_SYNC_MIGRATION_SHA256}
           ) as "ledgerReady"
  `;
  return {
    identities,
    ownership: await readOwnership(sql),
    legacySessionCount: sessions?.total ?? 0,
    unexpiredLegacySessionCount: sessions?.unexpired ?? 0,
    mappingSchemaReady: Boolean(
      mapping?.tableReady && mapping.functionReady && mapping.ledgerReady,
    ),
  };
}

async function readTargets(sql: Sql): Promise<CodecampTargetIdentity[]> {
  return sql<CodecampTargetIdentity[]>`
    select id::text as id, normalized_username as "normalizedUsername",
           display_name as "displayName", status::text as status
      from company_accounts order by id
  `;
}

function planSafely(
  source: SourceInventory,
  targets: readonly CodecampTargetIdentity[],
  organizationId: string,
): CodecampMigrationPlan {
  try {
    return planCodecampIdentityMigration({
      sourceIdentities: source.identities,
      targetIdentities: targets,
      organizationId,
    });
  } catch (error) {
    if (error instanceof CodecampMigrationPlanningError) throw error;
    throw new PostgresCodecampMigrationError(
      "MIGRATION_PLAN_INVALID",
      "Codecamp migration planning rejected malformed source data.",
    );
  }
}

async function writeTarget(
  sql: Sql,
  plan: CodecampMigrationPlan,
  target: TargetPreflight,
  sourceFingerprint: string,
): Promise<number> {
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('codecamp_company_identity_migration'))`;
    await tx.unsafe(
      `lock table ${TARGET_TABLES.map((table) => `"${table}"`).join(", ")} in share row exclusive mode`,
    );
    const migrationRunId = deriveCodecampMigrationUuid(
      `codecamp:migration-run:${sourceFingerprint}`,
    );
    for (const record of plan.records) {
      const conflicts = await tx<Array<{ id: string }>>`
        select id::text from company_accounts
         where (id = ${record.companyAccountId}
            or normalized_username = ${record.normalizedUsername})
           and id <> ${record.companyAccountId} for update
      `;
      if (conflicts.length > 0) {
        throw new PostgresCodecampMigrationError(
          "TARGET_USERNAME_COLLISION",
          "A target username collision appeared after the approved dry run.",
        );
      }
      await tx`
        insert into company_accounts (
          id, username, normalized_username, normalization_version, display_name,
          status, status_changed_at, created_at, updated_at
        ) values (
          ${record.companyAccountId}, ${record.username},
          ${record.normalizedUsername}, 1, ${record.displayName}, 'ACTIVE',
          ${record.createdAt}, ${record.createdAt}, now()
        ) on conflict (id) do nothing
      `;
      const [account] = await tx<
        Array<{
          username: string;
          normalized: string;
          display: string;
          status: string;
        }>
      >`
        select username, normalized_username as normalized,
               display_name as display, status::text as status
          from company_accounts where id = ${record.companyAccountId} for update
      `;
      if (
        !account ||
        account.username !== record.username ||
        account.normalized !== record.normalizedUsername ||
        account.display !== record.displayName ||
        account.status !== "ACTIVE"
      ) {
        throw new PostgresCodecampMigrationError(
          "TARGET_ACCOUNT_CONFLICT",
          "A deterministic target account conflicts with the approved plan.",
        );
      }
      await tx`
        insert into company_password_credentials (
          account_id, password_hash, algorithm, legacy_imported_at
        ) values (
          ${record.companyAccountId}, ${record.passwordHash},
          ${record.passwordAlgorithm}, now()
        ) on conflict (account_id) do nothing
      `;
      const [credential] = await tx<
        Array<{ hash: string; algorithm: string; imported: boolean }>
      >`
        select password_hash as hash, algorithm::text as algorithm,
               legacy_imported_at is not null as imported
          from company_password_credentials
         where account_id = ${record.companyAccountId} for update
      `;
      if (
        !credential ||
        credential.hash !== record.passwordHash ||
        credential.algorithm !== record.passwordAlgorithm ||
        !credential.imported
      ) {
        throw new PostgresCodecampMigrationError(
          "TARGET_CREDENTIAL_CONFLICT",
          "A deterministic target credential conflicts with the approved plan.",
        );
      }
      await tx`
        insert into company_organization_memberships (
          id, organization_id, account_id, status, joined_at,
          status_changed_at, created_at, updated_at
        ) values (
          ${record.companyMembershipId}, ${target.organizationId},
          ${record.companyAccountId}, 'ACTIVE', ${record.createdAt},
          ${record.createdAt}, ${record.createdAt}, now()
        ) on conflict (id) do nothing
      `;
      const [membership] = await tx<Array<{ exact: boolean }>>`
        select organization_id = ${target.organizationId}::uuid
           and account_id = ${record.companyAccountId}::uuid
           and status = 'ACTIVE' as exact
          from company_organization_memberships
         where id = ${record.companyMembershipId} for update
      `;
      if (!membership?.exact) {
        throw new PostgresCodecampMigrationError(
          "TARGET_MEMBERSHIP_CONFLICT",
          "A deterministic target membership conflicts with the approved plan.",
        );
      }
      await tx`
        insert into company_role_assignments (
          organization_id, membership_id, role_key, assigned_by_account_id
        ) values (
          ${target.organizationId}, ${record.companyMembershipId}, 'EMPLOYEE', null
        ) on conflict (membership_id, role_key) do nothing
      `;
      const companyRoles = await tx<Array<{ role: string }>>`
        select role_key::text as role from company_role_assignments
         where membership_id = ${record.companyMembershipId} order by role_key
      `;
      if (companyRoles.map((row) => row.role).join(",") !== "EMPLOYEE") {
        throw new PostgresCodecampMigrationError(
          "TARGET_COMPANY_ROLE_CONFLICT",
          "Migrated Codecamp accounts must receive only the EMPLOYEE company role.",
        );
      }
      await tx`
        insert into company_application_role_assignments (
          id, organization_id, membership_id, application_id, role_key
        ) values (
          ${deriveCodecampMigrationUuid(
            `codecamp:role:${record.companyMembershipId}:${record.role}`,
          )},
          ${target.organizationId}, ${record.companyMembershipId},
          ${target.applicationId}, ${record.role}
        ) on conflict (membership_id, application_id, role_key) do nothing
      `;
      const appRoles = await tx<Array<{ role: string }>>`
        select role_key as role from company_application_role_assignments
         where membership_id = ${record.companyMembershipId}
           and application_id = ${target.applicationId} order by role_key
      `;
      if (appRoles.map((row) => row.role).join(",") !== record.role) {
        throw new PostgresCodecampMigrationError(
          "TARGET_APPLICATION_ROLE_CONFLICT",
          "A migrated account has an unexpected Codecamp application role.",
        );
      }
      const [audit] = await tx<Array<{ present: boolean }>>`
        select exists(select 1 from company_identity_audit_events
          where target_account_id = ${record.companyAccountId}
            and operation = 'identity:codecamp-migration'
            and metadata->>'sourceFingerprint' = ${sourceFingerprint}) as present
      `;
      if (!audit?.present) {
        await tx`
          insert into company_identity_audit_events (
            correlation_id, actor_type, actor_service_key, organization_id,
            application_id, target_account_id, operation, outcome, metadata
          ) values (
            ${deriveCodecampMigrationUuid(
              `codecamp:audit:${sourceFingerprint}:${record.companyAccountId}`,
            )},
            'SERVICE', 'accounts-codecamp-migration', ${target.organizationId},
            ${target.applicationId}, ${record.companyAccountId},
            'identity:codecamp-migration', 'SUCCEEDED', ${tx.json({
              source: CODECAMP_MIGRATION_SOURCE_DATABASE,
              migrationRunId,
              sourcePrincipalId: record.sourcePrincipalId,
              sourceFingerprint,
              roleKey: record.role,
              credentialAlgorithm: record.passwordAlgorithm,
              normalizationVersion: 1,
            })}
          )
        `;
      }
    }
    const [verified] = await tx<Array<{ count: number }>>`
      select count(*)::int as count from company_accounts
       where id = any(${plan.records.map((record) => record.companyAccountId)})
    `;
    return verified?.count ?? 0;
  });
}

async function writeMappings(
  sql: Sql,
  plan: CodecampMigrationPlan,
  target: TargetPreflight,
): Promise<number> {
  for (const record of plan.records) {
    await sql`
      insert into company_product_principals (
        organization_id, organization_key, company_account_id,
        application_key, local_user_id, role_key
      ) values (
        ${target.organizationId}, 'internal-company', ${record.companyAccountId},
        'codecamp', ${record.sourcePrincipalId}, ${record.role}
      ) on conflict (organization_id, company_account_id, application_key) do nothing
    `;
    const [mapping] = await sql<
      Array<{
        organizationId: string;
        accountId: string;
        localId: string;
        role: string;
      }>
    >`
      select organization_id::text as "organizationId",
             company_account_id::text as "accountId",
             local_user_id as "localId", role_key as role
        from company_product_principals
       where application_key = 'codecamp'
         and company_account_id = ${record.companyAccountId} for update
    `;
    if (
      !mapping ||
      mapping.organizationId !== target.organizationId ||
      mapping.accountId !== record.companyAccountId ||
      mapping.localId !== record.sourcePrincipalId ||
      mapping.role !== record.role
    ) {
      throw new PostgresCodecampMigrationError(
        "SOURCE_PRINCIPAL_MAPPING_CONFLICT",
        "A durable Codecamp product-principal mapping conflicts with the approved plan.",
      );
    }
  }
  const [verified] = await sql<Array<{ count: number }>>`
    select count(*)::int as count from company_product_principals
     where application_key = 'codecamp'
       and company_account_id = any(${plan.records.map(
         (record) => record.companyAccountId,
       )})
  `;
  return verified?.count ?? 0;
}

function summary(
  mode: "dry-run" | "apply",
  source: SourceInventory,
  plan: CodecampMigrationPlan,
  sourceFingerprint: string,
  appliedAccountCount?: number,
  appliedPrincipalMappingCount?: number,
): CodecampMigrationSummary {
  return {
    mode,
    schemaReadyForApply: source.mappingSchemaReady,
    sourceFingerprint,
    ...summarizeCodecampMigrationPlan(plan),
    sourceCollisionGroupCount: plan.sourceCollisionGroupCount,
    targetCollisionCount: plan.targetCollisionCount,
    legacySessionCount: source.legacySessionCount,
    unexpiredLegacySessionCount: source.unexpiredLegacySessionCount,
    ownership: source.ownership,
    ...(appliedAccountCount === undefined ? {} : { appliedAccountCount }),
    ...(appliedPrincipalMappingCount === undefined
      ? {}
      : { appliedPrincipalMappingCount }),
  };
}

/**
 * Runs a fail-closed dry run or explicitly approved Codecamp identity migration.
 * @param input Direct database connections, mode, and explicit apply authorization.
 * @returns A non-identifying aggregate migration report.
 * @throws When any source, target, fingerprint, ownership, or database gate fails.
 */
export async function runPostgresCodecampIdentityMigration(
  input: PostgresCodecampMigrationInput,
): Promise<CodecampMigrationSummary> {
  validatePostgresCodecampMigrationInput(input);
  const source = postgres(input.sourceDatabaseUrl, { max: 1, prepare: false });
  const target = postgres(input.targetDatabaseUrl, { max: 1, prepare: false });
  try {
    await preflightSource(source);
    const targetState = await preflightTarget(target);
    if (input.mode === "dry-run") {
      const sourceState = await readSource(source);
      const plan = planSafely(
        sourceState,
        await readTargets(target),
        targetState.organizationId,
      );
      const fingerprint = fingerprintCodecampMigrationSource({
        records: plan.records,
        ownership: sourceState.ownership,
      });
      return summary("dry-run", sourceState, plan, fingerprint);
    }
    if (!(await readSource(source)).mappingSchemaReady) {
      throw new PostgresCodecampMigrationError(
        "SOURCE_MAPPING_SCHEMA_NOT_READY",
        "Apply requires the source product database through migration 0043.",
      );
    }
    return source.begin(async (sourceTx) => {
      await sourceTx`set transaction isolation level serializable`;
      await sourceTx`select pg_advisory_xact_lock(hashtext('codecamp_company_identity_migration'))`;
      await sourceTx.unsafe(
        `lock table ${[...SOURCE_TABLES, "company_product_principals"]
          .map((table) => `"${table}"`)
          .join(", ")} in share row exclusive mode`,
      );
      const lockedSource = await readSource(sourceTx as unknown as Sql);
      const plan = planSafely(
        lockedSource,
        await readTargets(target),
        targetState.organizationId,
      );
      const fingerprint = fingerprintCodecampMigrationSource({
        records: plan.records,
        ownership: lockedSource.ownership,
      });
      if (fingerprint !== input.expectedSourceFingerprint) {
        throw new PostgresCodecampMigrationError(
          "SOURCE_FINGERPRINT_CHANGED",
          "The source fingerprint changed after dry run; apply was refused.",
        );
      }
      const accountCount = await writeTarget(
        target,
        plan,
        targetState,
        fingerprint,
      );
      const mappingCount = await writeMappings(
        sourceTx as unknown as Sql,
        plan,
        targetState,
      );
      const ownershipAfter = await readOwnership(sourceTx as unknown as Sql);
      if (
        JSON.stringify(ownershipAfter) !==
        JSON.stringify(lockedSource.ownership)
      ) {
        throw new PostgresCodecampMigrationError(
          "PRODUCT_OWNERSHIP_CHANGED",
          "Codecamp product ownership evidence changed during migration.",
        );
      }
      return summary(
        "apply",
        { ...lockedSource, ownership: ownershipAfter },
        plan,
        fingerprint,
        accountCount,
        mappingCount,
      );
    });
  } catch (error) {
    if (
      error instanceof PostgresCodecampMigrationError ||
      error instanceof CodecampMigrationPlanningError
    )
      throw error;
    throw new PostgresCodecampMigrationError(
      "MIGRATION_DATABASE_ERROR",
      "Codecamp identity migration stopped because a database gate failed.",
    );
  } finally {
    await Promise.allSettled([
      source.end({ timeout: 5 }),
      target.end({ timeout: 5 }),
    ]);
  }
}
