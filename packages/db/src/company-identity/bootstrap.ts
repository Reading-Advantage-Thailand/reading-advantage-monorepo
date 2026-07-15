import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";
import {
  createCompanyIdentityDirectClient,
  proveCompanyIdentityConnectionTopology,
} from "./client.js";
import { migrateCompanyIdentity } from "./migration.js";
import { configureCompanyIdentityDatabasePrivileges } from "./privileged.js";

const URL_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
const COMPANY_IDENTITY_DATABASE = "company_identity";
const POSTGRES_ROLE_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/;

interface LocalRoleCredentials {
  readonly password: string;
  readonly quotedRole: string;
  readonly roleName: string;
}

const ORGANIZATION = {
  id: uuidV5(
    "https://reading-advantage.com/company-identity/organization/internal-company",
  ),
  stableKey: "internal-company",
  displayName: "Reading Advantage",
} as const;

const APPLICATIONS = [
  {
    id: uuidV5(
      "https://reading-advantage.com/company-identity/application/marketing",
    ),
    stableKey: "marketing",
    displayName: "Marketing Advantage",
  },
  {
    id: uuidV5(
      "https://reading-advantage.com/company-identity/application/sales",
    ),
    stableKey: "sales",
    displayName: "Sales Advantage",
  },
  {
    id: uuidV5(
      "https://reading-advantage.com/company-identity/application/codecamp",
    ),
    stableKey: "codecamp",
    displayName: "Codecamp Advantage",
  },
] as const;

const APPLICATION_ROLES = [
  {
    applicationKey: "marketing",
    roleKey: "MEMBER",
    displayName: "Member",
    description: "Uses Marketing Advantage.",
  },
  {
    applicationKey: "marketing",
    roleKey: "ADMIN",
    displayName: "Administrator",
    description: "Administers Marketing Advantage.",
  },
  {
    applicationKey: "sales",
    roleKey: "SALES_REP",
    displayName: "Sales representative",
    description: "Uses the Sales Advantage sales workflow.",
  },
  {
    applicationKey: "sales",
    roleKey: "SALES_ADMIN",
    displayName: "Sales administrator",
    description: "Administers Sales Advantage.",
  },
] as const;

/**
 * Converts a canonical UUID into its sixteen namespace bytes.
 * @param uuid The canonical UUID string.
 * @returns The UUID bytes used by UUIDv5 hashing.
 */
function uuidBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replaceAll("-", ""), "hex");
}

/**
 * Formats sixteen UUID bytes as a canonical lowercase UUID string.
 * @param bytes The UUID bytes to format.
 * @returns The canonical UUID representation.
 */
function formatUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/**
 * Derives the deterministic UUIDv5 used by company identity bootstrap rows.
 * @param name The stable URL-namespace name.
 * @returns The canonical deterministic UUID.
 */
function uuidV5(name: string): string {
  const digest = createHash("sha1")
    .update(
      Buffer.concat([uuidBytes(URL_NAMESPACE), Buffer.from(name, "utf8")]),
    )
    .digest()
    .subarray(0, 16);
  digest[6] = (digest[6]! & 0x0f) | 0x50;
  digest[8] = (digest[8]! & 0x3f) | 0x80;
  return formatUuid(digest);
}

/**
 * Reads local login credentials from an exact company-identity URL.
 * @param databaseUrl The local runtime or direct connection URL.
 * @param label The non-secret role label used in validation errors.
 * @returns Validated credentials for local role provisioning.
 * @throws When the URL target, role, or password is invalid.
 */
function localRoleCredentialsFromUrl(
  databaseUrl: string,
  label: "migration" | "runtime",
): LocalRoleCredentials {
  const parsed = new URL(databaseUrl);
  const roleName = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  if (
    parsed.protocol !== "postgresql:" ||
    parsed.pathname !== `/${COMPANY_IDENTITY_DATABASE}` ||
    !POSTGRES_ROLE_PATTERN.test(roleName) ||
    password.length === 0
  ) {
    throw new Error(
      `Local company identity bootstrap requires an exact company_identity URL with valid ${label} credentials.`,
    );
  }
  return { password, quotedRole: `"${roleName}"`, roleName };
}

/**
 * Creates or normalizes a local non-inheriting identity login role.
 * @param adminSql Local PostgreSQL administrator connection.
 * @param credentials Validated role credentials from the intended connection URL.
 * @returns A promise that resolves after the role is safe for identity use.
 * @throws When the role inherits another role or provisioning fails.
 */
async function ensureLocalIdentityRole(
  adminSql: postgres.Sql,
  credentials: LocalRoleCredentials,
): Promise<void> {
  const [role] = await adminSql<
    Array<{ exists: boolean; has_memberships: boolean }>
  >`
    select
      exists(
        select 1 from pg_catalog.pg_roles role
         where role.rolname = ${credentials.roleName}
      ) as exists,
      exists(
        select 1
          from pg_catalog.pg_auth_members membership
          join pg_catalog.pg_roles role on role.oid = membership.member
         where role.rolname = ${credentials.roleName}
      ) as has_memberships
  `;
  if (role?.has_memberships) {
    throw new Error(
      "Local company identity roles must not inherit or SET ROLE into another database role.",
    );
  }
  if (!role?.exists) {
    const [createRole] = await adminSql<Array<{ statement: string }>>`
      select format(
        'create role %I login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password %L',
        ${credentials.roleName}::text,
        ${credentials.password}::text
      ) as statement
    `;
    await adminSql.unsafe(createRole!.statement);
    return;
  }
  const [alterRole] = await adminSql<Array<{ statement: string }>>`
    select format(
      'alter role %I login noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls password %L',
      ${credentials.roleName}::text,
      ${credentials.password}::text
    ) as statement
  `;
  await adminSql.unsafe(alterRole!.statement);
}

/**
 * Proves the local administrator and migration URL reach the same identity cluster.
 * @param adminDatabaseUrl The local administrator URL initially targeting postgres.
 * @param directDatabaseUrl The migration-owner URL targeting company_identity.
 * @returns A promise that resolves after a cross-connection advisory-lock proof.
 * @throws When the administrator and migration URLs resolve to separate clusters.
 */
async function proveLocalAdminConnectionTopology(
  adminDatabaseUrl: string,
  directDatabaseUrl: string,
): Promise<void> {
  const identityAdminUrl = new URL(adminDatabaseUrl);
  identityAdminUrl.pathname = `/${COMPANY_IDENTITY_DATABASE}`;
  const adminSql = postgres(identityAdminUrl.toString(), {
    max: 1,
    prepare: false,
  });
  const generatedKey = randomBytes(4).readInt32BE();
  const lockKey = generatedKey === 0 ? 1 : generatedKey;
  let directSql: postgres.Sql | undefined;
  try {
    directSql = await createCompanyIdentityDirectClient({ directDatabaseUrl });
    await adminSql.begin(async (adminTransaction) => {
      await adminTransaction`select pg_catalog.pg_advisory_xact_lock(${lockKey})`;
      const [probe] = await directSql!<Array<{ acquired: boolean }>>`
        select pg_catalog.pg_try_advisory_xact_lock(${lockKey}) as acquired
      `;
      if (probe?.acquired !== false) {
        throw new Error(
          "Local company identity administrator and migration URLs resolve to different PostgreSQL clusters or returned no topology proof.",
        );
      }
    });
  } finally {
    await Promise.allSettled([
      directSql?.end({ timeout: 5 }) ?? Promise.resolve(),
      adminSql.end({ timeout: 5 }),
    ]);
  }
}

/**
 * Inserts deterministic company organization, application, and role-definition records without overwriting operator changes.
 * @param input Direct company identity database URL.
 * @returns A promise that resolves after the transactional bootstrap completes.
 * @throws When a deterministic ID and stable key resolve to different existing records.
 */
export async function bootstrapCompanyIdentity(input: {
  readonly directDatabaseUrl: string;
}): Promise<void> {
  const sql = await createCompanyIdentityDirectClient({
    directDatabaseUrl: input.directDatabaseUrl,
  });
  try {
    await sql.begin(async (tx) => {
      const organizationRows = await tx<
        Array<{ id: string; stable_key: string }>
      >`
        select id::text, stable_key
          from company_organizations
         where id = ${ORGANIZATION.id} or stable_key = ${ORGANIZATION.stableKey}
         for update
      `;
      if (organizationRows.length === 0) {
        await tx`
          insert into company_organizations (id, stable_key, display_name)
          values (${ORGANIZATION.id}, ${ORGANIZATION.stableKey}, ${ORGANIZATION.displayName})
        `;
      } else if (
        organizationRows.length !== 1 ||
        organizationRows[0]!.id !== ORGANIZATION.id ||
        organizationRows[0]!.stable_key !== ORGANIZATION.stableKey
      ) {
        throw new Error(
          "Company identity bootstrap organization ID/stable key mismatch.",
        );
      }

      for (const application of APPLICATIONS) {
        const applicationRows = await tx<
          Array<{ id: string; stable_key: string }>
        >`
          select id::text, stable_key
            from company_applications
           where id = ${application.id} or stable_key = ${application.stableKey}
           for update
        `;
        if (applicationRows.length === 0) {
          await tx`
            insert into company_applications (id, stable_key, display_name)
            values (${application.id}, ${application.stableKey}, ${application.displayName})
          `;
        } else if (
          applicationRows.length !== 1 ||
          applicationRows[0]!.id !== application.id ||
          applicationRows[0]!.stable_key !== application.stableKey
        ) {
          throw new Error(
            `Company identity bootstrap application ID/stable key mismatch for ${application.stableKey}.`,
          );
        }
      }

      for (const role of APPLICATION_ROLES) {
        const application = APPLICATIONS.find(
          ({ stableKey }) => stableKey === role.applicationKey,
        );
        if (!application) {
          throw new Error(
            `Company identity bootstrap has no application ${role.applicationKey}.`,
          );
        }
        await tx`
          insert into company_application_role_definitions (
            application_id, role_key, display_name, description
          ) values (
            ${application.id}, ${role.roleKey}, ${role.displayName}, ${role.description}
          )
          on conflict (application_id, role_key) do nothing
        `;
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/**
 * Creates and migrates the persistent local company identity database without touching product databases.
 * @param input Separate administrative, migration-role, and runtime-role PostgreSQL URLs.
 * @returns A promise that resolves after migrations and deterministic bootstrap are current.
 * @throws When PostgreSQL is not version 16, database creation fails, or migration/bootstrap fails.
 */
export async function ensureLocalCompanyIdentityDatabase(input: {
  readonly adminDatabaseUrl: string;
  readonly directDatabaseUrl: string;
  readonly runtimeDatabaseUrl: string;
}): Promise<void> {
  const migrationRole = localRoleCredentialsFromUrl(
    input.directDatabaseUrl,
    "migration",
  );
  const runtimeRole = localRoleCredentialsFromUrl(
    input.runtimeDatabaseUrl,
    "runtime",
  );
  const adminRole = decodeURIComponent(
    new URL(input.adminDatabaseUrl).username,
  );
  if (
    migrationRole.roleName === adminRole ||
    runtimeRole.roleName === adminRole ||
    migrationRole.roleName === runtimeRole.roleName
  ) {
    throw new Error(
      "Local company identity bootstrap requires separate administrator, migration, and runtime credentials.",
    );
  }
  const adminSql = postgres(input.adminDatabaseUrl, {
    max: 1,
    prepare: false,
  });
  try {
    const [version] = await adminSql<{ version_number: string }[]>`
      select current_setting('server_version_num') as version_number
    `;
    const versionNumber = Number(version?.version_number);
    if (versionNumber < 160_000 || versionNumber >= 170_000) {
      throw new Error(
        "Company identity local bootstrap requires PostgreSQL 16.",
      );
    }
    await ensureLocalIdentityRole(adminSql, migrationRole);
    await ensureLocalIdentityRole(adminSql, runtimeRole);
    const [existing] = await adminSql<
      Array<{ exists: boolean; owner_name: string | null }>
    >`
      select
        exists(
          select 1 from pg_catalog.pg_database
           where datname = ${COMPANY_IDENTITY_DATABASE}
        ) as exists,
        (
          select pg_catalog.pg_get_userbyid(datdba)
            from pg_catalog.pg_database
           where datname = ${COMPANY_IDENTITY_DATABASE}
        ) as owner_name
    `;
    if (!existing?.exists) {
      try {
        await adminSql.unsafe(
          `create database "${COMPANY_IDENTITY_DATABASE}" owner ${migrationRole.quotedRole}`,
        );
      } catch (error) {
        if ((error as { code?: string }).code !== "42P04") throw error;
      }
    } else if (existing.owner_name !== migrationRole.roleName) {
      const identityAdminUrl = new URL(input.adminDatabaseUrl);
      identityAdminUrl.pathname = `/${COMPANY_IDENTITY_DATABASE}`;
      const identityAdminSql = postgres(identityAdminUrl.toString(), {
        max: 1,
        prepare: false,
      });
      try {
        const [catalog] = await identityAdminSql<
          { user_object_count: number }[]
        >`
          select count(*)::int as user_object_count
            from (
              select relation.oid
                from pg_catalog.pg_class relation
                join pg_catalog.pg_namespace namespace
                  on namespace.oid = relation.relnamespace
               where namespace.nspname not in ('information_schema', 'pg_catalog')
                 and namespace.nspname not like 'pg_toast%'
              union all
              select procedure.oid
                from pg_catalog.pg_proc procedure
                join pg_catalog.pg_namespace namespace
                  on namespace.oid = procedure.pronamespace
               where namespace.nspname not in ('information_schema', 'pg_catalog')
                 and namespace.nspname not like 'pg_toast%'
              union all
              select type.oid
                from pg_catalog.pg_type type
                join pg_catalog.pg_namespace namespace
                  on namespace.oid = type.typnamespace
               where namespace.nspname not in ('information_schema', 'pg_catalog')
                 and namespace.nspname not like 'pg_toast%'
                 and type.typtype in ('d', 'e', 'r')
              union all
              select namespace.oid
                from pg_catalog.pg_namespace namespace
               where namespace.nspname not in (
                 'information_schema',
                 'pg_catalog',
                 'public'
               )
                 and namespace.nspname not like 'pg_toast%'
              union all
              select extension.oid
                from pg_catalog.pg_extension extension
                join pg_catalog.pg_namespace namespace
                  on namespace.oid = extension.extnamespace
               where namespace.nspname not in ('information_schema', 'pg_catalog')
                 and namespace.nspname not like 'pg_toast%'
            ) user_object
        `;
        if ((catalog?.user_object_count ?? 0) > 0) {
          throw new Error(
            "Existing company_identity database ownership does not match the migration role. Back up the database and perform a reviewed identity-object ownership transfer before retrying.",
          );
        }
      } finally {
        await identityAdminSql.end({ timeout: 5 });
      }
      await adminSql.unsafe(
        `alter database "${COMPANY_IDENTITY_DATABASE}" owner to ${migrationRole.quotedRole}`,
      );
    }
  } finally {
    await adminSql.end({ timeout: 5 });
  }

  await proveLocalAdminConnectionTopology(
    input.adminDatabaseUrl,
    input.directDatabaseUrl,
  );
  await migrateCompanyIdentity({
    directDatabaseUrl: input.directDatabaseUrl,
  });
  await configureCompanyIdentityDatabasePrivileges({
    databaseUrl: input.directDatabaseUrl,
    migrationRole: migrationRole.roleName,
    runtimeRole: runtimeRole.roleName,
  });
  await proveCompanyIdentityConnectionTopology({
    directDatabaseUrl: input.directDatabaseUrl,
    runtimeDatabaseUrl: input.runtimeDatabaseUrl,
  });
  await bootstrapCompanyIdentity({
    directDatabaseUrl: input.directDatabaseUrl,
  });
}
