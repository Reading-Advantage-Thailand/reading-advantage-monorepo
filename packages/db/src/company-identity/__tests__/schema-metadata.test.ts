/**
 * Red-phase metadata oracle for the dedicated company-identity schema.
 *
 * The module is loaded only after an explicit existence assertion so the Red
 * result names the missing production schema instead of failing collection.
 * Once present, every assertion uses live Drizzle table metadata.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import {
  getTableConfig,
  PgDialect,
  type PgTable,
} from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as productSchema from "../../schema/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DB_ROOT = resolve(HERE, "../../..");
const REPO_ROOT = resolve(DB_ROOT, "../..");
const IDENTITY_SCHEMA_INDEX = join(
  DB_ROOT,
  "src/company-identity/schema/index.ts",
);
const TENANT_REGISTRY = join(
  REPO_ROOT,
  "packages/domain/src/tenant-registry.ts",
);

type ForeignKeyContract = {
  name: string;
  columns: readonly string[];
  foreignTable: string;
  foreignColumns: readonly string[];
  onDelete: "cascade" | "restrict";
};

type TableContract = {
  exportName: string;
  sqlName: string;
  columns: readonly string[];
  primaryColumns: readonly string[];
  uniqueNames: readonly string[];
  checkNames: readonly string[];
  indexNames: readonly string[];
  foreignKeys: readonly ForeignKeyContract[];
};

const TABLES: readonly TableContract[] = [
  {
    exportName: "companyAccounts",
    sqlName: "company_accounts",
    columns: [
      "id", "username", "normalized_username", "normalization_version",
      "display_name", "status", "auth_version", "status_changed_at",
      "created_at", "updated_at",
    ],
    primaryColumns: ["id"],
    uniqueNames: ["company_accounts_normalized_username_unique"],
    checkNames: [
      "company_accounts_auth_version_check",
      "company_accounts_display_name_length_check",
      "company_accounts_normalization_version_check",
      "company_accounts_normalized_username_format_check",
      "company_accounts_username_length_check",
    ],
    indexNames: ["company_accounts_status_idx"],
    foreignKeys: [],
  },
  {
    exportName: "companyPasswordCredentials",
    sqlName: "company_password_credentials",
    columns: [
      "account_id", "password_hash", "algorithm", "credential_version",
      "legacy_imported_at", "last_verified_at", "created_at", "updated_at",
    ],
    primaryColumns: ["account_id"],
    uniqueNames: [],
    checkNames: [
      "company_password_credentials_hash_prefix_check",
      "company_password_credentials_version_check",
    ],
    indexNames: [],
    foreignKeys: [
      {
        name: "company_password_credentials_account_fk",
        columns: ["account_id"],
        foreignTable: "company_accounts",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
    ],
  },
  {
    exportName: "companyOrganizations",
    sqlName: "company_organizations",
    columns: [
      "id", "stable_key", "display_name", "organization_type", "status",
      "created_at", "updated_at",
    ],
    primaryColumns: ["id"],
    uniqueNames: ["company_organizations_stable_key_unique"],
    checkNames: [
      "company_organizations_display_name_length_check",
      "company_organizations_stable_key_format_check",
    ],
    indexNames: [],
    foreignKeys: [],
  },
  {
    exportName: "companyOrganizationMemberships",
    sqlName: "company_organization_memberships",
    columns: [
      "id", "organization_id", "account_id", "status", "joined_at",
      "status_changed_at", "ended_at", "created_at", "updated_at",
    ],
    primaryColumns: ["id"],
    uniqueNames: [
      "company_memberships_organization_account_unique",
      "company_memberships_organization_id_id_unique",
    ],
    checkNames: ["company_memberships_ended_state_check"],
    indexNames: [
      "company_memberships_account_status_idx",
      "company_memberships_organization_status_idx",
    ],
    foreignKeys: [
      {
        name: "company_organization_memberships_organization_fk",
        columns: ["organization_id"],
        foreignTable: "company_organizations",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
      {
        name: "company_organization_memberships_account_fk",
        columns: ["account_id"],
        foreignTable: "company_accounts",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
    ],
  },
  {
    exportName: "companyRoleAssignments",
    sqlName: "company_role_assignments",
    columns: [
      "organization_id", "membership_id", "role_key",
      "assigned_by_account_id", "assigned_at",
    ],
    primaryColumns: ["membership_id", "role_key"],
    uniqueNames: [],
    checkNames: [],
    indexNames: [],
    foreignKeys: [
      {
        name: "company_role_assignments_membership_fk",
        columns: ["organization_id", "membership_id"],
        foreignTable: "company_organization_memberships",
        foreignColumns: ["organization_id", "id"],
        onDelete: "restrict",
      },
      {
        name: "company_role_assignments_assigned_by_fk",
        columns: ["assigned_by_account_id"],
        foreignTable: "company_accounts",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
    ],
  },
  {
    exportName: "companyApplications",
    sqlName: "company_applications",
    columns: [
      "id", "stable_key", "display_name", "status", "created_at",
      "updated_at",
    ],
    primaryColumns: ["id"],
    uniqueNames: ["company_applications_stable_key_unique"],
    checkNames: [
      "company_applications_display_name_length_check",
      "company_applications_stable_key_format_check",
    ],
    indexNames: [],
    foreignKeys: [],
  },
  {
    exportName: "companyApplicationRoleDefinitions",
    sqlName: "company_application_role_definitions",
    columns: [
      "application_id", "role_key", "display_name", "description", "status",
      "created_at", "updated_at",
    ],
    primaryColumns: ["application_id", "role_key"],
    uniqueNames: [],
    checkNames: [
      "company_application_role_definitions_description_length_check",
      "company_application_role_definitions_display_name_length_check",
      "company_application_role_definitions_role_key_format_check",
    ],
    indexNames: [],
    foreignKeys: [
      {
        name: "company_application_role_definitions_application_fk",
        columns: ["application_id"],
        foreignTable: "company_applications",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
    ],
  },
  {
    exportName: "companyApplicationRoleAssignments",
    sqlName: "company_application_role_assignments",
    columns: [
      "id", "organization_id", "membership_id", "application_id", "role_key",
      "assigned_by_account_id", "assigned_at", "expires_at",
    ],
    primaryColumns: ["id"],
    uniqueNames: [
      "company_app_role_assignments_membership_app_role_unique",
    ],
    checkNames: [
      "company_app_role_assignments_expiry_check",
      "company_app_role_assignments_role_key_format_check",
    ],
    indexNames: [
      "company_app_role_assignments_app_membership_idx",
      "company_app_role_assignments_expiry_idx",
    ],
    foreignKeys: [
      {
        name: "company_app_role_assignments_membership_fk",
        columns: ["organization_id", "membership_id"],
        foreignTable: "company_organization_memberships",
        foreignColumns: ["organization_id", "id"],
        onDelete: "restrict",
      },
      {
        name: "company_app_role_assignments_role_definition_fk",
        columns: ["application_id", "role_key"],
        foreignTable: "company_application_role_definitions",
        foreignColumns: ["application_id", "role_key"],
        onDelete: "restrict",
      },
      {
        name: "company_app_role_assignments_assigned_by_fk",
        columns: ["assigned_by_account_id"],
        foreignTable: "company_accounts",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
    ],
  },
  {
    exportName: "companySsoSessions",
    sqlName: "company_sso_sessions",
    columns: [
      "id", "token_hash", "organization_id", "membership_id",
      "account_auth_version", "created_at", "last_seen_at", "idle_expires_at",
      "absolute_expires_at", "revoked_at", "revoke_reason", "ip_hash",
      "user_agent",
    ],
    primaryColumns: ["id"],
    uniqueNames: [
      "company_sso_sessions_membership_identity_unique",
      "company_sso_sessions_token_hash_unique",
    ],
    checkNames: [
      "company_sso_sessions_expiry_order_check",
      "company_sso_sessions_ip_hash_hex_check",
      "company_sso_sessions_revocation_check",
      "company_sso_sessions_token_hash_hex_check",
      "company_sso_sessions_user_agent_length_check",
    ],
    indexNames: [
      "company_sso_sessions_absolute_expiry_idx",
      "company_sso_sessions_idle_expiry_idx",
      "company_sso_sessions_membership_revoked_idx",
    ],
    foreignKeys: [
      {
        name: "company_sso_sessions_membership_fk",
        columns: ["organization_id", "membership_id"],
        foreignTable: "company_organization_memberships",
        foreignColumns: ["organization_id", "id"],
        onDelete: "restrict",
      },
    ],
  },
  {
    exportName: "companyApplicationSessions",
    sqlName: "company_application_sessions",
    columns: [
      "id", "token_hash", "sso_session_id", "organization_id",
      "membership_id", "application_id", "account_auth_version", "created_at",
      "last_checked_at", "expires_at", "revoked_at", "revoke_reason",
    ],
    primaryColumns: ["id"],
    uniqueNames: [
      "company_application_sessions_scope_unique",
      "company_application_sessions_token_hash_unique",
    ],
    checkNames: [
      "company_application_sessions_expiry_check",
      "company_application_sessions_revocation_check",
      "company_application_sessions_token_hash_hex_check",
    ],
    indexNames: [
      "company_application_sessions_application_membership_revoked_idx",
      "company_application_sessions_expiry_idx",
      "company_application_sessions_sso_session_idx",
    ],
    foreignKeys: [
      {
        name: "company_application_sessions_sso_scope_fk",
        columns: ["sso_session_id", "organization_id", "membership_id"],
        foreignTable: "company_sso_sessions",
        foreignColumns: ["id", "organization_id", "membership_id"],
        onDelete: "cascade",
      },
      {
        name: "company_application_sessions_application_fk",
        columns: ["application_id"],
        foreignTable: "company_applications",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
    ],
  },
  {
    exportName: "companyOidcClients",
    sqlName: "company_oidc_clients",
    columns: [
      "id", "application_id", "client_id", "client_type",
      "token_auth_method", "client_secret_hash", "secret_version",
      "pkce_required", "status", "created_at", "updated_at",
    ],
    primaryColumns: ["id"],
    uniqueNames: [
      "company_oidc_clients_application_client_unique",
      "company_oidc_clients_client_id_unique",
    ],
    checkNames: [
      "company_oidc_clients_auth_method_check",
      "company_oidc_clients_client_id_length_check",
      "company_oidc_clients_pkce_required_check",
      "company_oidc_clients_secret_version_check",
    ],
    indexNames: [],
    foreignKeys: [
      {
        name: "company_oidc_clients_application_fk",
        columns: ["application_id"],
        foreignTable: "company_applications",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
    ],
  },
  {
    exportName: "companyOidcRedirectUris",
    sqlName: "company_oidc_redirect_uris",
    columns: ["id", "oidc_client_id", "redirect_uri", "created_at"],
    primaryColumns: ["id"],
    uniqueNames: [
      "company_oidc_redirect_uris_client_uri_unique",
      "company_oidc_redirect_uris_id_client_unique",
    ],
    checkNames: ["company_oidc_redirect_uris_length_check"],
    indexNames: [],
    foreignKeys: [
      {
        name: "company_oidc_redirect_uris_client_fk",
        columns: ["oidc_client_id"],
        foreignTable: "company_oidc_clients",
        foreignColumns: ["id"],
        onDelete: "cascade",
      },
    ],
  },
  {
    exportName: "companyOidcAuthorizationCodes",
    sqlName: "company_oidc_authorization_codes",
    columns: [
      "id", "code_hash", "oidc_client_id", "redirect_uri_id",
      "sso_session_id", "code_challenge", "code_challenge_method", "nonce",
      "scope", "issued_at", "expires_at", "consumed_at", "revoked_at",
    ],
    primaryColumns: ["id"],
    uniqueNames: ["company_oidc_authorization_codes_code_hash_unique"],
    checkNames: [
      "company_oidc_authorization_codes_code_hash_hex_check",
      "company_oidc_codes_consumed_time_check",
      "company_oidc_codes_expiry_check",
      "company_oidc_codes_nonce_length_check",
      "company_oidc_codes_pkce_challenge_format_check",
      "company_oidc_codes_terminal_state_check",
    ],
    indexNames: [
      "company_oidc_codes_client_expiry_idx",
      "company_oidc_codes_session_idx",
    ],
    foreignKeys: [
      {
        name: "company_oidc_authorization_codes_client_fk",
        columns: ["oidc_client_id"],
        foreignTable: "company_oidc_clients",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
      {
        name: "company_oidc_authorization_codes_redirect_client_fk",
        columns: ["redirect_uri_id", "oidc_client_id"],
        foreignTable: "company_oidc_redirect_uris",
        foreignColumns: ["id", "oidc_client_id"],
        onDelete: "restrict",
      },
      {
        name: "company_oidc_authorization_codes_sso_session_fk",
        columns: ["sso_session_id"],
        foreignTable: "company_sso_sessions",
        foreignColumns: ["id"],
        onDelete: "cascade",
      },
    ],
  },
  {
    exportName: "companyIdentityAuditEvents",
    sqlName: "company_identity_audit_events",
    columns: [
      "id", "occurred_at", "correlation_id", "actor_type",
      "actor_account_id", "actor_service_key", "organization_id",
      "application_id", "target_account_id", "operation", "outcome",
      "reason_code", "ip_hash", "user_agent_family", "metadata",
    ],
    primaryColumns: ["id"],
    uniqueNames: [],
    checkNames: [
      "company_identity_audit_events_actor_check",
      "company_identity_audit_events_actor_service_key_length_check",
      "company_identity_audit_events_ip_hash_hex_check",
      "company_identity_audit_events_metadata_allowed_keys_check",
      "company_identity_audit_events_operation_length_check",
      "company_identity_audit_events_reason_code_length_check",
      "company_identity_audit_events_user_agent_family_length_check",
    ],
    indexNames: [
      "company_identity_audit_events_actor_occurred_idx",
      "company_identity_audit_events_correlation_idx",
      "company_identity_audit_events_occurred_at_idx",
      "company_identity_audit_events_operation_occurred_idx",
      "company_identity_audit_events_target_occurred_idx",
    ],
    foreignKeys: [
      {
        name: "company_identity_audit_events_actor_account_fk",
        columns: ["actor_account_id"],
        foreignTable: "company_accounts",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
      {
        name: "company_identity_audit_events_organization_fk",
        columns: ["organization_id"],
        foreignTable: "company_organizations",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
      {
        name: "company_identity_audit_events_application_fk",
        columns: ["application_id"],
        foreignTable: "company_applications",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
      {
        name: "company_identity_audit_events_target_account_fk",
        columns: ["target_account_id"],
        foreignTable: "company_accounts",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
    ],
  },
  {
    exportName: "companyLoginAttempts",
    sqlName: "company_login_attempts",
    columns: [
      "id", "occurred_at", "correlation_id", "normalized_username_hash",
      "ip_hash", "oidc_client_id", "outcome", "account_id", "latency_ms",
    ],
    primaryColumns: ["id"],
    uniqueNames: [],
    checkNames: [
      "company_login_attempts_ip_hash_hex_check",
      "company_login_attempts_latency_check",
      "company_login_attempts_username_hash_hex_check",
    ],
    indexNames: [
      "company_login_attempts_ip_occurred_idx",
      "company_login_attempts_occurred_at_idx",
      "company_login_attempts_outcome_occurred_idx",
      "company_login_attempts_username_occurred_idx",
    ],
    foreignKeys: [
      {
        name: "company_login_attempts_oidc_client_fk",
        columns: ["oidc_client_id"],
        foreignTable: "company_oidc_clients",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
      {
        name: "company_login_attempts_account_fk",
        columns: ["account_id"],
        foreignTable: "company_accounts",
        foreignColumns: ["id"],
        onDelete: "restrict",
      },
    ],
  },
  {
    exportName: "companyLoginRateLimitBuckets",
    sqlName: "company_login_rate_limit_buckets",
    columns: [
      "id", "kind", "identifier_hash", "failed_count", "window_started_at",
      "last_attempt_at", "blocked_until", "challenge_required_at", "updated_at",
    ],
    primaryColumns: ["id"],
    uniqueNames: ["company_rate_limit_buckets_kind_identifier_unique"],
    checkNames: [
      "company_rate_limit_buckets_blocked_until_check",
      "company_rate_limit_buckets_challenge_required_at_check",
      "company_rate_limit_buckets_failed_count_check",
      "company_rate_limit_buckets_identifier_hash_hex_check",
      "company_rate_limit_buckets_last_attempt_check",
    ],
    indexNames: [],
    foreignKeys: [],
  },
  {
    exportName: "companyIdentityIdempotencyRecords",
    sqlName: "company_identity_idempotency_records",
    columns: [
      "id", "operation", "scope_key", "idempotency_key_hash", "request_hash",
      "state", "owner_token_hash", "safe_result", "safe_error_code",
      "created_at", "lease_expires_at", "completed_at", "expires_at",
    ],
    primaryColumns: ["id"],
    uniqueNames: ["company_identity_idempotency_operation_scope_key_unique"],
    checkNames: [
      "company_identity_idempotency_completed_time_check",
      "company_identity_idempotency_expiry_check",
      "company_identity_idempotency_key_hash_hex_check",
      "company_identity_idempotency_operation_length_check",
      "company_identity_idempotency_owner_hash_hex_check",
      "company_identity_idempotency_request_hash_hex_check",
      "company_identity_idempotency_safe_error_code_length_check",
      "company_identity_idempotency_scope_key_format_check",
      "company_identity_idempotency_scope_key_length_check",
      "company_identity_idempotency_state_check",
    ],
    indexNames: ["company_identity_idempotency_expires_idx"],
    foreignKeys: [],
  },
] as const;

const EXPECTED_SQL_TABLES = TABLES.map(({ sqlName }) => sqlName).sort();
const dialect = new PgDialect();

async function loadIdentitySchema(): Promise<Record<string, unknown>> {
  expect(
    existsSync(IDENTITY_SCHEMA_INDEX),
    "Missing dedicated schema entrypoint: packages/db/src/company-identity/schema/index.ts",
  ).toBe(true);
  if (!existsSync(IDENTITY_SCHEMA_INDEX)) return {};
  return import(/* @vite-ignore */ pathToFileURL(IDENTITY_SCHEMA_INDEX).href) as Promise<
    Record<string, unknown>
  >;
}

function asTable(value: unknown): PgTable | undefined {
  if (!value || typeof value !== "object") return undefined;
  try {
    getTableConfig(value as PgTable);
    return value as PgTable;
  } catch {
    return undefined;
  }
}

function tablesIn(module: Record<string, unknown>): PgTable[] {
  return Object.values(module)
    .map(asTable)
    .filter((value): value is PgTable => value !== undefined);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function primaryColumns(table: PgTable): string[] {
  const config = getTableConfig(table);
  return sorted([
    ...config.columns.filter((column) => column.primary).map(({ name }) => name),
    ...config.primaryKeys.flatMap((key) => key.columns.map(({ name }) => name)),
  ]);
}

function uniqueNames(table: PgTable): string[] {
  const config = getTableConfig(table);
  return sorted([
    ...config.uniqueConstraints
      .map((constraint) => constraint.getName())
      .filter((name): name is string => typeof name === "string"),
    ...config.indexes
      .filter(({ config: index }) => index.unique)
      .map(({ config: index }) => index.name)
      .filter((name): name is string => typeof name === "string"),
  ]);
}

function nonUniqueIndexNames(table: PgTable): string[] {
  return sorted(
    getTableConfig(table).indexes
      .filter(({ config }) => !config.unique)
      .map(({ config }) => config.name)
      .filter((name): name is string => typeof name === "string"),
  );
}

function renderedCheck(table: PgTable, checkName: string): string {
  const check = getTableConfig(table).checks.find(({ name }) => name === checkName);
  expect(check, `Missing Drizzle check ${checkName}`).toBeDefined();
  if (!check) return "";
  const query = dialect.sqlToQuery(check.value);
  return `${query.sql} ${JSON.stringify(query.params)}`;
}

describe("company identity schema allowlist and product isolation", () => {
  it("exports exactly the reviewed seventeen identity tables", async () => {
    const identitySchema = await loadIdentitySchema();
    expect(
      tablesIn(identitySchema).map((table) => getTableConfig(table).name).sort(),
      "The dedicated schema must contain exactly the 17 reviewed identity tables",
    ).toEqual(EXPECTED_SQL_TABLES);
  });

  it("does not export identity tables from the product schema barrel", () => {
    const productNames = new Set(
      tablesIn(productSchema).map((table) => getTableConfig(table).name),
    );
    expect(
      EXPECTED_SQL_TABLES.filter((name) => productNames.has(name)),
      "Identity tables must remain absent from packages/db/src/schema/index.ts",
    ).toEqual([]);
  });

  it("keeps every identity table outside the education TenantDB registry", async () => {
    const identitySchema = await loadIdentitySchema();
    const registry = await import(
      /* @vite-ignore */ pathToFileURL(TENANT_REGISTRY).href
    ) as { classifyTable(table: PgTable): unknown };
    for (const table of tablesIn(identitySchema)) {
      expect(
        () => registry.classifyTable(table),
        `${getTableConfig(table).name} must not be classified by education TenantDB`,
      ).toThrow("is not classified in the tenant registry");
    }
  });
});

describe.each(TABLES)("$sqlName metadata contract", (contract) => {
  it("has the exact SQL columns and primary-key columns", async () => {
    const identitySchema = await loadIdentitySchema();
    const table = asTable(identitySchema[contract.exportName]);
    expect(table, `Missing Drizzle export ${contract.exportName}`).toBeDefined();
    if (!table) return;
    const config = getTableConfig(table);
    expect(config.name).toBe(contract.sqlName);
    expect(sorted(config.columns.map(({ name }) => name))).toEqual(
      sorted(contract.columns),
    );
    expect(primaryColumns(table)).toEqual(sorted(contract.primaryColumns));
    expect(config.columns.some(({ name }) => name === "school_id")).toBe(false);
  });

  it("has the exact unique, check, and non-unique index names", async () => {
    const identitySchema = await loadIdentitySchema();
    const table = asTable(identitySchema[contract.exportName]);
    expect(table, `Missing Drizzle export ${contract.exportName}`).toBeDefined();
    if (!table) return;
    expect(uniqueNames(table)).toEqual(sorted(contract.uniqueNames));
    expect(sorted(getTableConfig(table).checks.map(({ name }) => name))).toEqual(
      sorted(contract.checkNames),
    );
    expect(nonUniqueIndexNames(table)).toEqual(sorted(contract.indexNames));
  });

  it("has exact named foreign keys, referenced columns, and deletion rules", async () => {
    const identitySchema = await loadIdentitySchema();
    const table = asTable(identitySchema[contract.exportName]);
    expect(table, `Missing Drizzle export ${contract.exportName}`).toBeDefined();
    if (!table) return;
    const actual = getTableConfig(table).foreignKeys
      .map((foreignKey) => {
        const reference = foreignKey.reference();
        return {
          name: foreignKey.getName(),
          columns: reference.columns.map(({ name }) => name),
          foreignTable: getTableConfig(reference.foreignTable).name,
          foreignColumns: reference.foreignColumns.map(({ name }) => name),
          onDelete: foreignKey.onDelete,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
    expect(actual).toEqual(
      [...contract.foreignKeys].sort((left, right) =>
        left.name.localeCompare(right.name)),
    );
  });
});

const HASH_COLUMNS = [
  ["companySsoSessions", "token_hash", false, "company_sso_sessions_token_hash_hex_check"],
  ["companySsoSessions", "ip_hash", true, "company_sso_sessions_ip_hash_hex_check"],
  ["companyApplicationSessions", "token_hash", false, "company_application_sessions_token_hash_hex_check"],
  ["companyOidcAuthorizationCodes", "code_hash", false, "company_oidc_authorization_codes_code_hash_hex_check"],
  ["companyIdentityAuditEvents", "ip_hash", true, "company_identity_audit_events_ip_hash_hex_check"],
  ["companyLoginAttempts", "normalized_username_hash", false, "company_login_attempts_username_hash_hex_check"],
  ["companyLoginAttempts", "ip_hash", false, "company_login_attempts_ip_hash_hex_check"],
  ["companyLoginRateLimitBuckets", "identifier_hash", false, "company_rate_limit_buckets_identifier_hash_hex_check"],
  ["companyIdentityIdempotencyRecords", "idempotency_key_hash", false, "company_identity_idempotency_key_hash_hex_check"],
  ["companyIdentityIdempotencyRecords", "request_hash", false, "company_identity_idempotency_request_hash_hex_check"],
  ["companyIdentityIdempotencyRecords", "owner_token_hash", true, "company_identity_idempotency_owner_hash_hex_check"],
] as const;

describe("hash-only secret persistence metadata", () => {
  it.each(HASH_COLUMNS)(
    "%s.%s is fixed-length lowercase hex with reviewed nullability",
    async (exportName, columnName, nullable, checkName) => {
      const identitySchema = await loadIdentitySchema();
      const table = asTable(identitySchema[exportName]);
      expect(table, `Missing Drizzle export ${exportName}`).toBeDefined();
      if (!table) return;
      const column = getTableConfig(table).columns.find(
        ({ name }) => name === columnName,
      );
      expect(column, `Missing hash column ${exportName}.${columnName}`).toBeDefined();
      expect(column?.getSQLType()).toMatch(/^(?:char|character)\(64\)$/);
      expect(column?.notNull).toBe(!nullable);
      expect(renderedCheck(table, checkName)).toContain("[0-9a-f]{64}");
    },
  );

  it("contains no raw secret, token, code, IP, or idempotency columns", async () => {
    const identitySchema = await loadIdentitySchema();
    const forbidden = new Set([
      "password", "token", "authorization_code", "code", "client_secret",
      "ip", "ip_address", "idempotency_key", "owner_token",
    ]);
    const found = tablesIn(identitySchema).flatMap((table) =>
      getTableConfig(table).columns
        .map(({ name }) => name)
        .filter((name) => forbidden.has(name))
        .map((name) => `${getTableConfig(table).name}.${name}`),
    );
    expect(found).toEqual([]);
  });
});

describe("grammar and expiry constraints are executable Drizzle metadata", () => {
  it.each([
    ["companyAccounts", "company_accounts_normalized_username_format_check", "[a-z0-9]"],
    ["companyOrganizations", "company_organizations_stable_key_format_check", "[a-z0-9-]"],
    ["companyApplications", "company_applications_stable_key_format_check", "[a-z0-9-]"],
    ["companyApplicationRoleDefinitions", "company_application_role_definitions_role_key_format_check", "[A-Z0-9_]"],
    ["companyApplicationRoleAssignments", "company_app_role_assignments_role_key_format_check", "[A-Z0-9_]"],
    ["companyOidcAuthorizationCodes", "company_oidc_codes_pkce_challenge_format_check", "[A-Za-z0-9_-]{43}"],
    ["companyIdentityIdempotencyRecords", "company_identity_idempotency_scope_key_format_check", "organization:"],
  ] as const)("%s enforces %s", async (exportName, checkName, token) => {
    const identitySchema = await loadIdentitySchema();
    const table = asTable(identitySchema[exportName]);
    expect(table, `Missing Drizzle export ${exportName}`).toBeDefined();
    if (!table) return;
    expect(renderedCheck(table, checkName)).toContain(token);
  });

  it.each([
    ["companyApplicationRoleAssignments", "company_app_role_assignments_expiry_check", ["assigned_at", "expires_at"]],
    ["companySsoSessions", "company_sso_sessions_expiry_order_check", ["created_at", "idle_expires_at", "absolute_expires_at"]],
    ["companyApplicationSessions", "company_application_sessions_expiry_check", ["created_at", "expires_at"]],
    ["companyOidcAuthorizationCodes", "company_oidc_codes_expiry_check", ["issued_at", "expires_at", "5 minutes"]],
    ["companyIdentityIdempotencyRecords", "company_identity_idempotency_expiry_check", ["created_at", "expires_at"]],
  ] as const)("%s enforces %s", async (exportName, checkName, tokens) => {
    const identitySchema = await loadIdentitySchema();
    const table = asTable(identitySchema[exportName]);
    expect(table, `Missing Drizzle export ${exportName}`).toBeDefined();
    if (!table) return;
    const rendered = renderedCheck(table, checkName);
    for (const token of tokens) expect(rendered).toContain(token);
  });
});
