import postgres from "postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { routedSql, type ScriptedSql, type SqlRoute } from "../../../__tests__/support/scripted-sql.js";
import { CODECAMP_MIGRATION_APPLY_CONFIRMATION } from "../codecamp-migration.js";
import {
  PostgresCodecampMigrationError,
  runPostgresCodecampIdentityMigration,
} from "../postgres-codecamp-migration.js";

vi.mock("postgres", () => ({ default: vi.fn() }));

const ORG = "50000000-0000-4000-8000-000000000001";
const APP = "50000000-0000-4000-8000-000000000002";
const HASH = "$argon2id$v=19$m=19456,t=2,p=1$salt$hash";
const SOURCE_TABLES = [
  "users", "accounts", "sessions", "codecamp_chat_conversations", "codecamp_curriculum_assignments",
  "codecamp_pr_review_attempts", "codecamp_pr_reviews", "codecamp_tutor_interventions", "codecamp_user_progress",
];
const TARGET_TABLES = [
  "company_accounts", "company_password_credentials", "company_organizations", "company_organization_memberships",
  "company_role_assignments", "company_applications", "company_application_role_definitions",
  "company_application_role_assignments", "company_identity_audit_events",
];
const urls = {
  sourceDatabaseUrl: "postgresql://source:private@localhost/codecamp_advantage",
  targetDatabaseUrl: "postgresql://target:private@localhost/company_identity",
};

const identities = [
  { id: "legacy-admin", username: "Admin", displayUsername: "Admin", displayName: "Admin User", githubUsername: null, role: "ADMIN", createdAt: new Date("2026-01-02T00:00:00.000Z"), passwordHash: HASH },
  { id: "legacy-intern", username: "intern.one", displayUsername: "intern.one", displayName: "Intern One", githubUsername: null, role: "INTERN", createdAt: new Date("2026-01-03T00:00:00.000Z"), passwordHash: HASH },
];

interface Worlds {
  readonly source: ScriptedSql;
  readonly target: ScriptedSql;
  readonly ends: ReturnType<typeof vi.fn>[];
}

interface WorldOptions {
  readonly source?: readonly SqlRoute[];
  readonly target?: readonly SqlRoute[];
  readonly ownershipRows?: (call: number) => readonly Record<string, unknown>[];
}

/**
 * Installs routed source and target databases behind the mocked postgres factory.
 * @param options Routes checked before the defaults.
 * @returns Both doubles and their end mocks.
 */
function worlds(options: WorldOptions = {}): Worlds {
  const accounts = new Map<string, readonly unknown[]>();
  const credentials = new Map<string, readonly unknown[]>();
  const appRoles = new Map<string, unknown>();
  const mappings = new Map<string, readonly unknown[]>();
  let ownershipCalls = 0;
  const source = routedSql([
    ...(options.source ?? []),
    { match: "current_database()", rows: [{ name: "codecamp_advantage" }] },
    { match: "information_schema.tables", rows: SOURCE_TABLES.map((name) => ({ name })) },
    { match: "information_schema.columns", rows: Array.from({ length: 10 }, (_, index) => ({ tableName: "users", columnName: `c${index}` })) },
    { match: "to_regclass('drizzle.__drizzle_migrations')", rows: [{ present: true }] },
    { match: "(select count(*)::int from users) as users", rows: [{ users: 2, credentials: 2, owners: 2, missing: 0 }] },
    { match: "role::text <> all", rows: [{ count: 0 }] },
    { match: "users.display_username as", rows: identities },
    { match: "as unexpired", rows: [{ total: 3, unexpired: 1 }] },
    { match: "to_regclass('public.company_product_principals')", rows: [{ tableReady: true, functionReady: true, ledgerReady: true }] },
    { match: "contype = 'p'", rows: [{ name: "id" }] },
    { match: /^select "user_id"::text/, rows: () => {
      ownershipCalls += 1;
      return options.ownershipRows?.(ownershipCalls) ?? [{ user_id: "legacy-admin", id: "r1" }, { user_id: "legacy-admin", id: "r2" }, { user_id: "legacy-intern", id: "r3" }];
    } },
    { match: "insert into company_product_principals", rows: (values) => { mappings.set(String(values[1]), values); return []; } },
    { match: /from company_product_principals\s+where application_key = 'codecamp'\s+and company_account_id = \?/, rows: (values) => {
      const inserted = mappings.get(String(values[0]));
      return inserted ? [{ organizationId: inserted[0], accountId: inserted[1], localId: inserted[2], role: inserted[3] }] : [];
    } },
    { match: "count(*)::int as count from company_product_principals", rows: [{ count: 2 }] },
  ]);
  const target = routedSql([
    ...(options.target ?? []),
    { match: "current_database()", rows: [{ name: "company_identity" }] },
    { match: "information_schema.tables", rows: TARGET_TABLES.map((name) => ({ name })) },
    { match: "cross join company_applications", rows: [{ organizationId: ORG, applicationId: APP }] },
    { match: "definition.role_key = any", rows: ["ADMIN", "INTERN", "STUDENT", "TEACHER"].map((roleKey) => ({ roleKey })) },
    { match: "and id <> ? for update", rows: [] },
    { match: "insert into company_accounts", rows: (values) => { accounts.set(String(values[0]), values); return []; } },
    { match: "display_name as display", rows: (values) => {
      const row = accounts.get(String(values[0]));
      return row ? [{ username: row[1], normalized: row[2], display: row[3], status: "ACTIVE" }] : [];
    } },
    { match: "insert into company_password_credentials", rows: (values) => { credentials.set(String(values[0]), values); return []; } },
    { match: "legacy_imported_at is not null as imported", rows: (values) => {
      const row = credentials.get(String(values[0]));
      return row ? [{ hash: row[1], algorithm: row[2], imported: true }] : [];
    } },
    { match: "as exact", rows: [{ exact: true }] },
    { match: "select role_key::text as role from company_role_assignments", rows: [{ role: "EMPLOYEE" }] },
    { match: "insert into company_application_role_assignments", rows: (values) => { appRoles.set(String(values[2]), values[4]); return []; } },
    { match: "select role_key as role from company_application_role_assignments", rows: (values) => [{ role: appRoles.get(String(values[0])) }] },
    { match: "select exists(select 1 from company_identity_audit_events", rows: [{ present: false }] },
    { match: "count(*)::int as count from company_accounts", rows: [{ count: 2 }] },
  ]);
  const ends = [vi.fn(async () => undefined), vi.fn(async () => undefined)];
  Object.assign(source.sql, { end: ends[0] });
  Object.assign(target.sql, { end: ends[1] });
  vi.mocked(postgres).mockReturnValueOnce(source.sql as never).mockReturnValueOnce(target.sql as never);
  return { source, target, ends };
}

/**
 * Captures the migration error code of a rejected run.
 * @param promise Run expected to reject.
 * @returns The error code.
 */
async function codeOf(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(() => undefined, (caught: unknown) => caught);
  expect(error).toHaveProperty("code");
  return (error as PostgresCodecampMigrationError).code;
}

/**
 * Counts statements that contain a fragment.
 * @param db SQL double.
 * @param fragment Statement fragment.
 * @returns Number of matching statements.
 */
function count(db: ScriptedSql, fragment: string): number {
  return db.statements.filter((text) => text.includes(fragment)).length;
}

/**
 * Runs a dry run in a fresh default world and returns its fingerprint.
 * @returns The source fingerprint.
 */
async function approvedFingerprint(): Promise<string> {
  worlds();
  return (await runPostgresCodecampIdentityMigration({ ...urls, mode: "dry-run" })).sourceFingerprint;
}

const applyInput = (fingerprint: string) => ({ ...urls, mode: "apply" as const, expectedSourceFingerprint: fingerprint, confirmation: CODECAMP_MIGRATION_APPLY_CONFIRMATION });

beforeEach(() => {
  vi.mocked(postgres).mockReset();
});

describe("PostgreSQL Codecamp migration dry run", () => {
  it("summarizes the source without writing and closes both connections", async () => {
    const { source, target, ends } = worlds();

    const result = await runPostgresCodecampIdentityMigration({ ...urls, mode: "dry-run" });
    expect(result).toMatchObject({ mode: "dry-run", schemaReadyForApply: true, legacySessionCount: 3, unexpiredLegacySessionCount: 1 });
    expect(result.sourceFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result.ownership).toHaveLength(6);
    expect(result.ownership[0]).toMatchObject({ table: "codecamp_chat_conversations", rowCount: 3, ownerCount: 2 });
    expect(result).not.toHaveProperty("appliedAccountCount");
    expect(target.transactions()).toBe(0);
    expect(source.transactions()).toBe(0);
    expect([...source.statements, ...target.statements].some((text) => /\binsert\b/i.test(text))).toBe(false);
    expect(ends[0]).toHaveBeenCalledWith({ timeout: 5 });
    expect(ends[1]).toHaveBeenCalledWith({ timeout: 5 });
    expect(postgres).toHaveBeenCalledWith(urls.sourceDatabaseUrl, { max: 1, prepare: false });
  });

  it("gives the same fingerprint for the same source", async () => {
    expect(await approvedFingerprint()).toBe(await approvedFingerprint());
  });

  it("changes the fingerprint when product ownership changes", async () => {
    const before = await approvedFingerprint();
    worlds({ ownershipRows: () => [{ user_id: "legacy-intern", id: "r1" }] });
    const after = (await runPostgresCodecampIdentityMigration({ ...urls, mode: "dry-run" })).sourceFingerprint;
    expect(after).not.toBe(before);
  });

  it("reports a source that is not ready for apply", async () => {
    worlds({ source: [{ match: "to_regclass('public.company_product_principals')", rows: [{ tableReady: true, functionReady: true, ledgerReady: false }] }] });

    await expect(runPostgresCodecampIdentityMigration({ ...urls, mode: "dry-run" })).resolves.toMatchObject({ schemaReadyForApply: false });
  });
});

describe("PostgreSQL Codecamp migration preflight gates", () => {
  it.each<[string, WorldOptions, string]>([
    ["the wrong source database", { source: [{ match: "current_database()", rows: [{ name: "reading_advantage" }] }] }, "SOURCE_DATABASE_INVALID"],
    ["a missing source table", { source: [{ match: "information_schema.tables", rows: [{ name: "users" }] }] }, "SOURCE_SCHEMA_NOT_READY"],
    ["incomplete source columns", { source: [{ match: "information_schema.columns", rows: [] }] }, "SOURCE_COLUMNS_INVALID"],
    ["a missing source ledger", { source: [{ match: "to_regclass('drizzle.__drizzle_migrations')", rows: [] }] }, "SOURCE_MIGRATION_LEDGER_MISSING"],
    ["the wrong target database", { target: [{ match: "current_database()", rows: [] }] }, "TARGET_DATABASE_INVALID"],
    ["a missing target table", { target: [{ match: "information_schema.tables", rows: [] }] }, "TARGET_SCHEMA_NOT_READY"],
    ["no target bootstrap", { target: [{ match: "cross join company_applications", rows: [] }] }, "TARGET_BOOTSTRAP_INVALID"],
    ["incomplete target roles", { target: [{ match: "definition.role_key = any", rows: [{ roleKey: "ADMIN" }] }] }, "TARGET_ROLE_DEFINITIONS_INVALID"],
    ["a user without a credential", { source: [{ match: "(select count(*)::int from users) as users", rows: [{ users: 3, credentials: 2, owners: 2, missing: 0 }] }] }, "SOURCE_CREDENTIAL_COVERAGE_INVALID"],
    ["an empty credential", { source: [{ match: "(select count(*)::int from users) as users", rows: [{ users: 2, credentials: 2, owners: 2, missing: 1 }] }] }, "SOURCE_CREDENTIAL_COVERAGE_INVALID"],
    ["no coverage row", { source: [{ match: "(select count(*)::int from users) as users", rows: [] }] }, "SOURCE_CREDENTIAL_COVERAGE_INVALID"],
    ["an unsupported role", { source: [{ match: "role::text <> all", rows: [{ count: 1 }] }] }, "SOURCE_ROLE_UNSUPPORTED"],
    ["an ownership table without a primary key", { source: [{ match: "contype = 'p'", rows: [] }] }, "SOURCE_OWNERSHIP_SCHEMA_INVALID"],
  ])("refuses %s", async (_label, options, code) => {
    const { ends } = worlds(options);

    expect(await codeOf(runPostgresCodecampIdentityMigration({ ...urls, mode: "dry-run" }))).toBe(code);
    expect(ends[0]).toHaveBeenCalled();
    expect(ends[1]).toHaveBeenCalled();
  });

  it("refuses an unsafe primary key column before building dynamic SQL", async () => {
    const { source } = worlds({ source: [{ match: "contype = 'p'", rows: [{ name: 'id"; drop table users; --' }] }] });

    expect(await codeOf(runPostgresCodecampIdentityMigration({ ...urls, mode: "dry-run" }))).toBe("SOURCE_OWNERSHIP_SCHEMA_INVALID");
    expect(source.statements.some((text) => text.includes("drop table"))).toBe(false);
  });

  it("hides a raw database error behind MIGRATION_DATABASE_ERROR", async () => {
    worlds({ target: [{ match: "current_database()", rows: () => { throw new Error("password authentication failed for target"); } }] });

    const error = await runPostgresCodecampIdentityMigration({ ...urls, mode: "dry-run" }).catch((caught: unknown) => caught);
    expect((error as PostgresCodecampMigrationError).code).toBe("MIGRATION_DATABASE_ERROR");
    expect((error as Error).message).not.toContain("password");
  });

  it("maps malformed source rows to MIGRATION_PLAN_INVALID", async () => {
    worlds({ source: [{ match: "users.display_username as", rows: [{ ...identities[0], createdAt: "not a date" }] }] });

    expect(await codeOf(runPostgresCodecampIdentityMigration({ ...urls, mode: "dry-run" }))).toBe("MIGRATION_PLAN_INVALID");
  });

  it("rejects an apply before connecting when the approval is missing", async () => {
    expect(await codeOf(runPostgresCodecampIdentityMigration({ ...urls, mode: "apply" }))).toBe("EXPECTED_FINGERPRINT_REQUIRED");
    expect(postgres).not.toHaveBeenCalled();
  });
});

describe("PostgreSQL Codecamp migration apply", () => {
  it("writes accounts, credentials, roles, audits and mappings for the approved fingerprint", async () => {
    const fingerprint = await approvedFingerprint();
    const { source, target } = worlds();

    const result = await runPostgresCodecampIdentityMigration(applyInput(fingerprint));
    expect(result).toMatchObject({ mode: "apply", sourceFingerprint: fingerprint, appliedAccountCount: 2, appliedPrincipalMappingCount: 2 });
    expect(source.statements).toContain("set transaction isolation level serializable");
    expect(source.statements.some((text) => text.startsWith('lock table "users"') && text.includes('"company_product_principals"'))).toBe(true);
    expect(target.statements.some((text) => text.startsWith('lock table "company_accounts"'))).toBe(true);
    expect(count(target, "insert into company_accounts")).toBe(2);
    expect(count(target, "insert into company_password_credentials")).toBe(2);
    expect(count(target, "'EMPLOYEE', null")).toBe(2);
    expect(count(target, "insert into company_identity_audit_events")).toBe(2);
    expect(count(source, "insert into company_product_principals")).toBe(2);
    const roles = target.statements.flatMap((text, index) => text.includes("insert into company_application_role_assignments") ? [target.bindings[index]?.[4]] : []);
    expect(roles.sort()).toEqual(["ADMIN", "INTERN"]);
    const audit = target.statements.findIndex((text) => text.includes("insert into company_identity_audit_events"));
    expect(target.bindings[audit]?.at(-1)).toMatchObject({ sourceFingerprint: fingerprint, credentialAlgorithm: expect.any(String) });
    expect(JSON.stringify(target.bindings)).not.toContain("private");
  });

  it("skips the audit insert when the migration audit already exists", async () => {
    const fingerprint = await approvedFingerprint();
    const { target } = worlds({ target: [{ match: "select exists(select 1 from company_identity_audit_events", rows: [{ present: true }] }] });

    await runPostgresCodecampIdentityMigration(applyInput(fingerprint));
    expect(count(target, "insert into company_identity_audit_events")).toBe(0);
  });

  it("refuses apply when the source mapping schema is not ready", async () => {
    const fingerprint = await approvedFingerprint();
    const { target } = worlds({ source: [{ match: "to_regclass('public.company_product_principals')", rows: [{ tableReady: false, functionReady: true, ledgerReady: true }] }] });

    expect(await codeOf(runPostgresCodecampIdentityMigration(applyInput(fingerprint)))).toBe("SOURCE_MAPPING_SCHEMA_NOT_READY");
    expect(target.transactions()).toBe(0);
  });

  it("refuses apply when the source changed after the dry run", async () => {
    worlds();
    const { target } = worlds();

    expect(await codeOf(runPostgresCodecampIdentityMigration(applyInput("a".repeat(64))))).toBe("SOURCE_FINGERPRINT_CHANGED");
    expect(target.transactions()).toBe(0);
    expect(count(target, "insert into")).toBe(0);
  });

  it.each<[string, SqlRoute, string]>([
    ["a username collision", { match: "and id <> ? for update", rows: [{ id: "other" }] }, "TARGET_USERNAME_COLLISION"],
    ["a different existing account", { match: "display_name as display", rows: [{ username: "x", normalized: "x", display: "x", status: "ACTIVE" }] }, "TARGET_ACCOUNT_CONFLICT"],
    ["a missing account row", { match: "display_name as display", rows: [] }, "TARGET_ACCOUNT_CONFLICT"],
    ["a different existing credential", { match: "legacy_imported_at is not null as imported", rows: [{ hash: "other", algorithm: "ARGON2ID", imported: true }] }, "TARGET_CREDENTIAL_CONFLICT"],
    ["a different existing membership", { match: "as exact", rows: [{ exact: false }] }, "TARGET_MEMBERSHIP_CONFLICT"],
    ["an extra company role", { match: "select role_key::text as role from company_role_assignments", rows: [{ role: "COMPANY_ADMIN" }, { role: "EMPLOYEE" }] }, "TARGET_COMPANY_ROLE_CONFLICT"],
    ["an extra application role", { match: "select role_key as role from company_application_role_assignments", rows: [{ role: "ADMIN" }, { role: "STUDENT" }] }, "TARGET_APPLICATION_ROLE_CONFLICT"],
  ])("refuses apply on %s", async (_label, route, code) => {
    const fingerprint = await approvedFingerprint();
    const { source } = worlds({ target: [route] });

    expect(await codeOf(runPostgresCodecampIdentityMigration(applyInput(fingerprint)))).toBe(code);
    expect(count(source, "insert into company_product_principals")).toBe(0);
  });

  it("refuses apply on a conflicting product-principal mapping", async () => {
    const fingerprint = await approvedFingerprint();
    worlds({ source: [{ match: /from company_product_principals\s+where application_key = 'codecamp'\s+and company_account_id = \?/, rows: [{ organizationId: ORG, accountId: "x", localId: "x", role: "ADMIN" }] }] });

    expect(await codeOf(runPostgresCodecampIdentityMigration(applyInput(fingerprint)))).toBe("SOURCE_PRINCIPAL_MAPPING_CONFLICT");
  });

  it("refuses apply when product ownership changes during the migration", async () => {
    const fingerprint = await approvedFingerprint();
    worlds({ ownershipRows: (call) => call <= 12 ? [{ user_id: "legacy-admin", id: "r1" }, { user_id: "legacy-admin", id: "r2" }, { user_id: "legacy-intern", id: "r3" }] : [] });

    expect(await codeOf(runPostgresCodecampIdentityMigration(applyInput(fingerprint)))).toBe("PRODUCT_OWNERSHIP_CHANGED");
  });
});
