// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

const pgTestUrl = process.env.PG_TEST_URL;
const describeRealPostgres = pgTestUrl ? describe : describe.skip;
const drizzleDir = resolve(import.meta.dirname, "../../drizzle");

/**
 * Executes one Drizzle SQL migration through its statement breakpoints.
 * @param client Scratch PostgreSQL client.
 * @param tag Exact migration tag.
 * @returns Completion after every statement commits to the current transaction.
 */
async function executeMigration(
  client: ReturnType<typeof postgres>,
  tag: string,
): Promise<void> {
  const sql = readFileSync(resolve(drizzleDir, `${tag}.sql`), "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) await client.unsafe(statement);
  }
}

describeRealPostgres(
  "0042 Sales app-local principal migration (real PostgreSQL)",
  () => {
    it("applies after safe 0041 while preserving Codecamp and Sales product data", async () => {
      const databaseName = `sales_0042_${randomUUID().replaceAll("-", "")}`;
      const admin = postgres(pgTestUrl!, { max: 1 });
      const scratchUrl = new URL(pgTestUrl!);
      scratchUrl.pathname = `/${databaseName}`;
      await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
      const client = postgres(scratchUrl.toString(), { max: 1 });
      const sub = "00000000-0000-4000-8000-000000000001";
      const localUserId = `sales:${sub}`;
      const revokedSub = "00000000-0000-4000-8000-000000000002";
      const revokedLocalUserId = `sales:${revokedSub}`;

      try {
        await client.unsafe(`
        CREATE TYPE role AS ENUM (
          'INTERN', 'STUDENT', 'TEACHER', 'ADMIN', 'SYSTEM',
          'SALES_REP', 'SALES_ADMIN'
        );
        CREATE TABLE users (
          id text PRIMARY KEY,
          username text NOT NULL UNIQUE,
          display_username text NOT NULL UNIQUE,
          name text,
          image text,
          role role NOT NULL,
          school_id uuid,
          xp integer NOT NULL DEFAULT 0,
          level integer NOT NULL DEFAULT 1,
          cefr_level text NOT NULL DEFAULT 'A1-',
          grade_level integer,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        );
        CREATE TABLE company_product_principals (
          organization_id uuid NOT NULL,
          organization_key text NOT NULL,
          company_account_id uuid NOT NULL,
          application_key text NOT NULL,
          local_user_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          role_key text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (organization_id, company_account_id, application_key),
          CONSTRAINT company_product_principals_application_local_unique
            UNIQUE (organization_id, application_key, local_user_id)
        );
        CREATE TABLE sales_roleplay_attempts (
          id uuid PRIMARY KEY,
          user_id text NOT NULL REFERENCES users(id)
        );
        CREATE TABLE sales_progress (
          id uuid PRIMARY KEY,
          user_id text NOT NULL REFERENCES users(id)
        );
        CREATE TABLE sales_conversations (
          id uuid PRIMARY KEY,
          user_id text NOT NULL REFERENCES users(id)
        );
        CREATE TABLE past_topics (
          id uuid PRIMARY KEY,
          app text NOT NULL,
          topic text NOT NULL,
          created_at timestamp NOT NULL DEFAULT now()
        );

        INSERT INTO users (
          id, username, display_username, name, role, xp, level, cefr_level
        ) VALUES
          (
            '${sub}', 'codecamp.dual.user', 'codecamp.dual.user',
            'Dual Product User', 'TEACHER', 19, 3, 'B1'
          ),
          (
            '${revokedSub}', 'codecamp.revoked.user', 'codecamp.revoked.user',
            'Revoked Product User', 'ADMIN', 0, 1, 'A1-'
          );
        INSERT INTO company_product_principals (
          organization_id, organization_key, company_account_id,
          application_key, local_user_id, role_key
        ) VALUES
          (
            '20000000-0000-4000-8000-000000000003', 'internal-company',
            '${sub}', 'sales', '${sub}', 'SALES_REP'
          ),
          (
            '20000000-0000-4000-8000-000000000003', 'internal-company',
            '${revokedSub}', 'sales', '${revokedSub}', 'REVOKED'
          );
        INSERT INTO sales_roleplay_attempts VALUES (
          '30000000-0000-4000-8000-000000000001', '${sub}'
        );
        INSERT INTO sales_progress VALUES (
          '30000000-0000-4000-8000-000000000002', '${sub}'
        );
        INSERT INTO sales_conversations VALUES (
          '30000000-0000-4000-8000-000000000003', '${sub}'
        );
      `);

        await executeMigration(
          client,
          "0041_marketing_past_topic_normalized_key",
        );
        await client`
          INSERT INTO past_topics (id, app, topic)
          VALUES ('40000000-0000-4000-8000-000000000001', 'marketing', '  Mixed   Topic  ')
        `;
        const normalizedInsert = await client<{ normalized_key: string }[]>`
          SELECT normalized_key FROM past_topics
          WHERE id = '40000000-0000-4000-8000-000000000001'
        `;
        expect(normalizedInsert).toEqual([{ normalized_key: "mixed topic" }]);
        await client`
          UPDATE past_topics SET topic = 'Updated   Topic'
          WHERE id = '40000000-0000-4000-8000-000000000001'
        `;
        const normalizedUpdate = await client<{ normalized_key: string }[]>`
          SELECT normalized_key FROM past_topics
          WHERE id = '40000000-0000-4000-8000-000000000001'
        `;
        expect(normalizedUpdate).toEqual([{ normalized_key: "updated topic" }]);
        const normalizedIndex = await client<{ indexdef: string }[]>`
          SELECT indexdef FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'past_topics_app_normalized_key_unique'
        `;
        expect(normalizedIndex).toHaveLength(1);
        expect(normalizedIndex[0]?.indexdef).toContain(
          "UNIQUE INDEX past_topics_app_normalized_key_unique",
        );

        await executeMigration(
          client,
          "0042_company_product_principal_local_unique",
        );

        const codecamp = await client<
          { id: string; role: string }[]
        >`SELECT id, role::text AS role FROM users WHERE id = ${sub}`;
        expect(codecamp).toEqual([{ id: sub, role: "TEACHER" }]);

        const sales = await client<
          { id: string; username: string; role: string }[]
        >`SELECT id, username, role::text AS role FROM users WHERE id = ${localUserId}`;
        expect(sales).toEqual([
          {
            id: localUserId,
            username: localUserId,
            role: "SALES_REP",
          },
        ]);

        const revokedSales = await client<{ role: string }[]>`
          SELECT role::text AS role FROM users WHERE id = ${revokedLocalUserId}
        `;
        expect(revokedSales).toEqual([{ role: "INTERN" }]);

        const mapping = await client<
          { local_user_id: string }[]
        >`SELECT local_user_id FROM company_product_principals
          WHERE application_key = 'sales' AND company_account_id = ${sub}`;
        expect(mapping).toEqual([{ local_user_id: localUserId }]);

        for (const table of [
          "sales_roleplay_attempts",
          "sales_progress",
          "sales_conversations",
        ]) {
          const rows = (await client.unsafe(
            `SELECT user_id FROM ${table}`,
          )) as Array<{ user_id: string }>;
          expect(rows).toEqual([{ user_id: localUserId }]);
        }

        const constraint = await client<{ columns: string[] }[]>`
        SELECT array_agg(attribute.attname ORDER BY key.ordinality) AS columns
        FROM pg_constraint constraint_record
        JOIN pg_class relation ON relation.oid = constraint_record.conrelid
        JOIN LATERAL unnest(constraint_record.conkey)
          WITH ORDINALITY AS key(attribute_number, ordinality) ON true
        JOIN pg_attribute attribute
          ON attribute.attrelid = relation.oid
         AND attribute.attnum = key.attribute_number
        WHERE constraint_record.conname =
          'company_product_principals_application_local_unique'
        GROUP BY constraint_record.oid
      `;
        expect(constraint).toEqual([
          {
            columns: ["application_key", "local_user_id"],
          },
        ]);
      } finally {
        await client.end();
        await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
        await admin.end();
      }
    }, 60_000);

    it("fails before mutation for duplicate mappings and occupied app-local targets", async () => {
      const databaseName = `sales_0042_preflight_${randomUUID().replaceAll("-", "")}`;
      const admin = postgres(pgTestUrl!, { max: 1 });
      const scratchUrl = new URL(pgTestUrl!);
      scratchUrl.pathname = `/${databaseName}`;
      await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
      const client = postgres(scratchUrl.toString(), { max: 1 });
      const sub = "00000000-0000-4000-8000-000000000011";

      try {
        await client.unsafe(`
          CREATE TYPE role AS ENUM (
            'INTERN', 'STUDENT', 'TEACHER', 'ADMIN', 'SYSTEM',
            'SALES_REP', 'SALES_ADMIN'
          );
          CREATE TABLE users (
            id text PRIMARY KEY,
            username text NOT NULL UNIQUE,
            display_username text NOT NULL UNIQUE,
            name text,
            image text,
            role role NOT NULL,
            school_id uuid,
            xp integer NOT NULL DEFAULT 0,
            level integer NOT NULL DEFAULT 1,
            cefr_level text NOT NULL DEFAULT 'A1-',
            grade_level integer,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
          );
          CREATE TABLE company_product_principals (
            organization_id uuid NOT NULL,
            organization_key text NOT NULL,
            company_account_id uuid NOT NULL,
            application_key text NOT NULL,
            local_user_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            role_key text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (organization_id, company_account_id, application_key),
            CONSTRAINT company_product_principals_application_local_unique
              UNIQUE (organization_id, application_key, local_user_id)
          );
        `);
        await client`
          INSERT INTO users (id, username, display_username, role)
          VALUES (${sub}, 'duplicate.source', 'duplicate.source', 'ADMIN')
        `;
        await client`
          INSERT INTO company_product_principals (
            organization_id, organization_key, company_account_id,
            application_key, local_user_id, role_key
          ) VALUES
            ('20000000-0000-4000-8000-000000000011', 'internal-company',
             ${sub}, 'sales', ${sub}, 'SALES_REP'),
            ('20000000-0000-4000-8000-000000000012', 'internal-company',
             ${sub}, 'sales', ${sub}, 'SALES_REP')
        `;
        await expect(
          executeMigration(
            client,
            "0042_company_product_principal_local_unique",
          ),
        ).rejects.toThrow(
          /duplicate application\/local|multiple product mappings/,
        );
        await expect(
          client`SELECT count(*)::int AS count FROM users`,
        ).resolves.toEqual([{ count: 1 }]);

        await client`DELETE FROM company_product_principals`;
        await client`
          INSERT INTO users (id, username, display_username, role)
          VALUES (
            ${`sales:${sub}`}, ${`sales:${sub}`},
            ${`sales:${sub}`}, 'SALES_REP'
          )
        `;
        await client`
          INSERT INTO company_product_principals (
            organization_id, organization_key, company_account_id,
            application_key, local_user_id, role_key
          ) VALUES (
            '20000000-0000-4000-8000-000000000011', 'internal-company',
            ${sub}, 'sales', ${sub}, 'SALES_REP'
          )
        `;
        await expect(
          executeMigration(
            client,
            "0042_company_product_principal_local_unique",
          ),
        ).rejects.toThrow("Sales app-local principal target already exists");
        await expect(
          client`SELECT role::text AS role FROM users WHERE id = ${sub}`,
        ).resolves.toEqual([{ role: "ADMIN" }]);
      } finally {
        await client.end();
        await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
        await admin.end();
      }
    }, 60_000);
  },
);
