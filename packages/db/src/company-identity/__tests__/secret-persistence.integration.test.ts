import { createHash, randomUUID } from "node:crypto";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { withCompanyIdentityScratchDatabase } from "./test-postgres.js";

const RAW_SESSION_TOKEN = "session-secret".padEnd(32, "s");
const RAW_AUTHORIZATION_CODE = "authorization-code".padEnd(32, "c");
const PKCE_CHALLENGE = "A".repeat(43);

interface MigrationModule {
  migrateCompanyIdentity(input: { directDatabaseUrl: string }): Promise<void>;
}

interface BootstrapModule {
  bootstrapCompanyIdentity(input: {
    directDatabaseUrl: string;
  }): Promise<void>;
}

interface PersistenceModule {
  persistCompanySsoSession(input: {
    sql: ReturnType<typeof postgres>;
    id: string;
    rawToken: string;
    organizationId: string;
    membershipId: string;
    accountAuthVersion: number;
    createdAt: Date;
    lastSeenAt: Date;
    idleExpiresAt: Date;
    absoluteExpiresAt: Date;
    userAgent: string;
  }): Promise<void>;
  persistCompanyOidcAuthorizationCode(input: {
    sql: ReturnType<typeof postgres>;
    id: string;
    rawCode: string;
    oidcClientId: string;
    redirectUriId: string;
    ssoSessionId: string;
    codeChallenge: string;
    nonce: string;
    scope: string[];
    issuedAt: Date;
    expiresAt: Date;
  }): Promise<void>;
}

async function loadProductionModule<T>(
  relativePath: string,
  exportNames: readonly string[],
): Promise<T> {
  try {
    const moduleUrl = new URL(relativePath, import.meta.url).href;
    const loaded = (await import(/* @vite-ignore */ moduleUrl)) as Record<
      string,
      unknown
    >;
    for (const exportName of exportNames) {
      expect(
        loaded[exportName],
        `PostgreSQL 16 was reached, but production export ${exportName} is absent.`,
      ).toBeTypeOf("function");
    }
    return loaded as T;
  } catch (error) {
    throw new Error(
      `PostgreSQL 16 was reached, but production primitive ${exportNames.join(
        "/",
      )} is absent.`,
      { cause: error },
    );
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe catalog identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

interface PostgreSqlFailure {
  code?: string;
  constraint_name?: string;
}

async function expectDatabaseFailure(
  action: () => Promise<unknown>,
  expectedCode: string,
  expectedConstraint: string,
): Promise<void> {
  let failure: PostgreSqlFailure | undefined;
  try {
    await action();
  } catch (error) {
    failure = error as PostgreSqlFailure;
  }
  expect(failure, `${expectedConstraint} must reject the write`).toBeDefined();
  expect(failure?.code).toBe(expectedCode);
  expect(failure?.constraint_name).toBe(expectedConstraint);
}

describe("company identity secret persistence", () => {
  it("persists only fixed hashes and never stores raw session/code sentinels", async () => {
    await withCompanyIdentityScratchDatabase(async ({
      adminSql,
      directDatabaseUrl,
    }) => {
      expect(await adminSql`select current_setting('server_version_num')::int as version`)
        .toHaveLength(1);
      const migration = await loadProductionModule<MigrationModule>(
        "../migration.js",
        ["migrateCompanyIdentity"],
      );
      const bootstrap = await loadProductionModule<BootstrapModule>(
        "../bootstrap.js",
        ["bootstrapCompanyIdentity"],
      );
      const persistence = await loadProductionModule<PersistenceModule>(
        "../persistence.js",
        [
          "persistCompanySsoSession",
          "persistCompanyOidcAuthorizationCode",
        ],
      );
      await migration.migrateCompanyIdentity({ directDatabaseUrl });
      await bootstrap.bootstrapCompanyIdentity({ directDatabaseUrl });

      const sql = postgres(directDatabaseUrl, { max: 1 });
      try {
        const accountId = randomUUID();
        const membershipId = randomUUID();
        const ssoSessionId = randomUUID();
        const oidcClientId = randomUUID();
        const redirectUriId = randomUUID();
        const authorizationCodeId = randomUUID();
        const now = new Date("2026-07-15T12:00:00.000Z");
        const idleExpiry = new Date("2026-07-15T13:00:00.000Z");
        const absoluteExpiry = new Date("2026-07-16T12:00:00.000Z");
        const codeExpiry = new Date("2026-07-15T12:05:00.000Z");
        const [{ id: organizationId }] = await sql<
          Array<{ id: string }>
        >`select id::text from company_organizations where stable_key = 'internal-company'`;
        const [{ id: applicationId }] = await sql<
          Array<{ id: string }>
        >`select id::text from company_applications where stable_key = 'marketing'`;

        await sql`
          insert into company_accounts (
            id, username, normalized_username, display_name
          ) values (
            ${accountId}, 'Secret Test', 'secret.test', 'Secret Test'
          )
        `;
        await sql`
          insert into company_organization_memberships (
            id, organization_id, account_id
          ) values (${membershipId}, ${organizationId!}, ${accountId})
        `;
        await sql`
          insert into company_oidc_clients (
            id, application_id, client_id, client_type, token_auth_method
          ) values (
            ${oidcClientId}, ${applicationId!}, 'secret-test-client', 'PUBLIC', 'NONE'
          )
        `;
        await sql`
          insert into company_oidc_redirect_uris (
            id, oidc_client_id, redirect_uri
          ) values (
            ${redirectUriId}, ${oidcClientId}, 'https://marketing.example.com/auth/secret-test'
          )
        `;

        await persistence.persistCompanySsoSession({
          sql,
          id: ssoSessionId,
          rawToken: RAW_SESSION_TOKEN,
          organizationId: organizationId!,
          membershipId,
          accountAuthVersion: 1,
          createdAt: now,
          lastSeenAt: now,
          idleExpiresAt: idleExpiry,
          absoluteExpiresAt: absoluteExpiry,
          userAgent: "Task4 secret-persistence test",
        });
        await persistence.persistCompanyOidcAuthorizationCode({
          sql,
          id: authorizationCodeId,
          rawCode: RAW_AUTHORIZATION_CODE,
          oidcClientId,
          redirectUriId,
          ssoSessionId,
          codeChallenge: PKCE_CHALLENGE,
          nonce: "secret-test-nonce",
          scope: ["openid"],
          issuedAt: now,
          expiresAt: codeExpiry,
        });

        expect(
          await sql`select token_hash, idle_expires_at, absolute_expires_at from company_sso_sessions where id = ${ssoSessionId}`,
        ).toEqual([
          {
            token_hash: sha256(RAW_SESSION_TOKEN),
            idle_expires_at: idleExpiry,
            absolute_expires_at: absoluteExpiry,
          },
        ]);
        expect(
          await sql`select code_hash, expires_at from company_oidc_authorization_codes where id = ${authorizationCodeId}`,
        ).toEqual([
          { code_hash: sha256(RAW_AUTHORIZATION_CODE), expires_at: codeExpiry },
        ]);

        await expectDatabaseFailure(
          () =>
            persistence.persistCompanySsoSession({
              sql,
              id: randomUUID(),
              rawToken: RAW_SESSION_TOKEN,
              organizationId: organizationId!,
              membershipId,
              accountAuthVersion: 1,
              createdAt: now,
              lastSeenAt: now,
              idleExpiresAt: idleExpiry,
              absoluteExpiresAt: absoluteExpiry,
              userAgent: "Duplicate bearer token test",
            }),
          "23505",
          "company_sso_sessions_token_hash_unique",
        );
        await expectDatabaseFailure(
          () =>
            persistence.persistCompanyOidcAuthorizationCode({
              sql,
              id: randomUUID(),
              rawCode: RAW_AUTHORIZATION_CODE,
              oidcClientId,
              redirectUriId,
              ssoSessionId,
              codeChallenge: PKCE_CHALLENGE,
              nonce: "duplicate-code-test",
              scope: ["openid"],
              issuedAt: now,
              expiresAt: codeExpiry,
            }),
          "23505",
          "company_oidc_authorization_codes_code_hash_unique",
        );

        await expectDatabaseFailure(
          () =>
            sql`
              insert into company_sso_sessions (
                id, token_hash, organization_id, membership_id,
                account_auth_version, created_at, last_seen_at,
                idle_expires_at, absolute_expires_at
              ) values (
                ${randomUUID()}, ${sha256("invalid-session-expiry")},
                ${organizationId!}, ${membershipId}, 1, ${now}, ${now},
                ${now}, ${absoluteExpiry}
              )
            `,
          "23514",
          "company_sso_sessions_expiry_order_check",
        );
        await expectDatabaseFailure(
          () =>
            sql`
              insert into company_oidc_authorization_codes (
                id, code_hash, oidc_client_id, redirect_uri_id, sso_session_id,
                code_challenge, code_challenge_method, nonce, scope,
                issued_at, expires_at
              ) values (
                ${randomUUID()}, ${sha256("invalid-code-expiry")},
                ${oidcClientId}, ${redirectUriId}, ${ssoSessionId},
                ${PKCE_CHALLENGE}, 'S256', 'invalid-expiry', array['openid'],
                ${now}, ${now}
              )
            `,
          "23514",
          "company_oidc_codes_expiry_check",
        );

        const candidateColumns = await sql<
          Array<{ table_name: string; column_name: string }>
        >`
          select table_name, column_name
            from information_schema.columns
           where table_schema = 'public'
             and data_type in (
               'character', 'character varying', 'text', 'json', 'jsonb', 'ARRAY'
             )
           order by table_name, ordinal_position
        `;
        for (const { table_name: tableName, column_name: columnName } of candidateColumns) {
          const table = quoteIdentifier(tableName);
          const column = quoteIdentifier(columnName);
          const rows = await sql.unsafe(
            `select count(*)::int as count from ${table} where cast(${column} as text) like $1 or cast(${column} as text) like $2`,
            [`%${RAW_SESSION_TOKEN}%`, `%${RAW_AUTHORIZATION_CODE}%`],
          );
          expect(
            rows,
            `${tableName}.${columnName} must not persist either raw bearer secret`,
          ).toEqual([{ count: 0 }]);
        }

        expect(
          await sql`
            select table_name, column_name, data_type, character_maximum_length
              from information_schema.columns
             where table_schema = 'public'
               and (
                 (table_name = 'company_sso_sessions' and column_name = 'token_hash')
                 or
                 (table_name = 'company_oidc_authorization_codes' and column_name = 'code_hash')
               )
             order by table_name
          `,
        ).toEqual([
          {
            table_name: "company_oidc_authorization_codes",
            column_name: "code_hash",
            data_type: "character",
            character_maximum_length: 64,
          },
          {
            table_name: "company_sso_sessions",
            column_name: "token_hash",
            data_type: "character",
            character_maximum_length: 64,
          },
        ]);
        expect(
          await sql`
            select table_name, column_name
              from information_schema.columns
             where table_schema = 'public'
               and column_name in (
                 'token', 'raw_token', 'session_token', 'authorization_code',
                 'raw_code', 'code', 'client_secret', 'raw_secret'
               )
             order by table_name, column_name
          `,
        ).toEqual([]);

        const uniqueIndexes = await sql<
          Array<{ index_name: string; index_definition: string; is_unique: boolean }>
        >`
          select
            index_class.relname as index_name,
            pg_get_indexdef(index_class.oid) as index_definition,
            index_data.indisunique as is_unique
          from pg_index index_data
          join pg_class index_class on index_class.oid = index_data.indexrelid
          join pg_class table_class on table_class.oid = index_data.indrelid
          join pg_namespace namespace on namespace.oid = table_class.relnamespace
          where namespace.nspname = 'public'
            and index_class.relname in (
              'company_sso_sessions_token_hash_unique',
              'company_oidc_authorization_codes_code_hash_unique'
            )
          order by index_class.relname
        `;
        expect(
          uniqueIndexes.map(({ index_name: indexName, is_unique: isUnique }) => ({
            indexName,
            isUnique,
          })),
        ).toEqual([
          {
            indexName: "company_oidc_authorization_codes_code_hash_unique",
            isUnique: true,
          },
          {
            indexName: "company_sso_sessions_token_hash_unique",
            isUnique: true,
          },
        ]);
        for (const { index_definition: definition } of uniqueIndexes) {
          expect(definition).toMatch(/^CREATE UNIQUE INDEX /);
        }

        const constraintRows = await sql<Array<{ conname: string }>>`
          select conname
            from pg_constraint
           where contype = 'c'
             and conname in (
               'company_sso_sessions_token_hash_hex_check',
               'company_sso_sessions_expiry_order_check',
               'company_oidc_authorization_codes_code_hash_hex_check',
               'company_oidc_codes_expiry_check'
             )
           order by conname
        `;
        expect(constraintRows.map(({ conname }) => conname)).toEqual([
          "company_oidc_authorization_codes_code_hash_hex_check",
          "company_oidc_codes_expiry_check",
          "company_sso_sessions_expiry_order_check",
          "company_sso_sessions_token_hash_hex_check",
        ]);
      } finally {
        await sql.end();
      }
    });
  }, 180_000);
});
