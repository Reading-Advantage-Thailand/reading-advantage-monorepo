// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

const pgTestUrl = process.env.PG_TEST_URL;
const describeRealPostgres = pgTestUrl ? describe : describe.skip;
const migrationPath = resolve(
  import.meta.dirname,
  "../../drizzle/0043_codecamp_company_principal_sync.sql",
);

/**
 * Applies migration 0043 through its Drizzle statement boundary.
 * @param client Scratch PostgreSQL client.
 * @returns Completion after both migration statements run.
 */
async function applyMigration0043(
  client: ReturnType<typeof postgres>,
): Promise<void> {
  const source = readFileSync(migrationPath, "utf8");
  for (const statement of source.split("--> statement-breakpoint")) {
    if (statement.trim()) await client.unsafe(statement);
  }
}

describeRealPostgres(
  "0043 Codecamp company-principal synchronization (real PostgreSQL)",
  () => {
    it("preserves history, synchronizes roles, revokes, and serializes provisioning", async () => {
      const databaseName = `codecamp_0043_${randomUUID().replaceAll("-", "")}`;
      const admin = postgres(pgTestUrl!, { max: 1 });
      const scratchUrl = new URL(pgTestUrl!);
      scratchUrl.pathname = `/${databaseName}`;
      await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
      const client = postgres(scratchUrl.toString(), { max: 4 });
      const organizationId = "20000000-0000-4000-8000-000000000003";
      const legacyAccountId = "00000000-0000-4000-8000-000000000011";
      const concurrentAccountId = "00000000-0000-4000-8000-000000000012";
      const collisionAccountId = "00000000-0000-4000-8000-000000000013";

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
            role role NOT NULL,
            school_id uuid,
            xp integer NOT NULL DEFAULT 0,
            level integer NOT NULL DEFAULT 1,
            cefr_level text NOT NULL DEFAULT 'N/A',
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
              UNIQUE (application_key, local_user_id),
            CONSTRAINT company_product_principals_application_account_unique
              UNIQUE (application_key, company_account_id)
          );
          CREATE TABLE codecamp_user_progress (
            id uuid PRIMARY KEY,
            user_id text NOT NULL REFERENCES users(id),
            completed boolean NOT NULL
          );
          INSERT INTO users (
            id, username, display_username, name, role, school_id,
            xp, level, cefr_level
          ) VALUES (
            'legacy-codecamp-owner', 'legacy.owner', 'legacy.owner',
            'Legacy Owner', 'INTERN', NULL, 42, 3, 'B1'
          );
          INSERT INTO company_product_principals (
            organization_id, organization_key, company_account_id,
            application_key, local_user_id, role_key
          ) VALUES (
            '${organizationId}', 'internal-company', '${legacyAccountId}',
            'codecamp', 'legacy-codecamp-owner', 'INTERN'
          );
          INSERT INTO codecamp_user_progress
          VALUES (
            '30000000-0000-4000-8000-000000000001',
            'legacy-codecamp-owner', true
          );
        `);

        await applyMigration0043(client);

        await expect(client`
          SELECT local_user_id, user_role::text, mapping_role_key
          FROM public.sync_codecamp_company_principal(
            ${organizationId}, 'internal-company', ${legacyAccountId},
            'Legacy Teacher', 'TEACHER'
          )
        `).resolves.toEqual([
          {
            local_user_id: "legacy-codecamp-owner",
            user_role: "TEACHER",
            mapping_role_key: "TEACHER",
          },
        ]);
        await expect(client`
          SELECT target.id, target.role::text AS role, target.xp,
                 progress.user_id, progress.completed
          FROM users target
          JOIN codecamp_user_progress progress ON progress.user_id = target.id
          WHERE target.id = 'legacy-codecamp-owner'
        `).resolves.toEqual([
          {
            id: "legacy-codecamp-owner",
            role: "TEACHER",
            xp: 42,
            user_id: "legacy-codecamp-owner",
            completed: true,
          },
        ]);

        await expect(client`
          SELECT * FROM public.sync_codecamp_company_principal(
            ${organizationId}, 'internal-company', ${legacyAccountId},
            'Legacy Teacher', 'REVOKED'
          )
        `).resolves.toEqual([]);
        await expect(client`
          SELECT role_key FROM company_product_principals
          WHERE application_key = 'codecamp'
            AND company_account_id = ${legacyAccountId}
        `).resolves.toEqual([{ role_key: "REVOKED" }]);
        await expect(client`
          SELECT local_user_id, user_role::text, mapping_role_key
          FROM public.sync_codecamp_company_principal(
            ${organizationId}, 'internal-company', ${legacyAccountId},
            'Legacy Admin', 'ADMIN'
          )
        `).resolves.toEqual([
          {
            local_user_id: "legacy-codecamp-owner",
            user_role: "ADMIN",
            mapping_role_key: "ADMIN",
          },
        ]);

        const concurrentResults = await Promise.all([
          client`
            SELECT local_user_id, user_role::text, mapping_role_key
            FROM public.sync_codecamp_company_principal(
              ${organizationId}, 'internal-company', ${concurrentAccountId},
              'Concurrent Intern', 'INTERN'
            )
          `,
          client`
            SELECT local_user_id, user_role::text, mapping_role_key
            FROM public.sync_codecamp_company_principal(
              ${organizationId}, 'internal-company', ${concurrentAccountId},
              'Concurrent Intern', 'INTERN'
            )
          `,
        ]);
        expect(concurrentResults).toEqual([
          [
            {
              local_user_id: `codecamp:${concurrentAccountId}`,
              user_role: "INTERN",
              mapping_role_key: "INTERN",
            },
          ],
          [
            {
              local_user_id: `codecamp:${concurrentAccountId}`,
              user_role: "INTERN",
              mapping_role_key: "INTERN",
            },
          ],
        ]);
        await expect(client`
          SELECT count(*)::integer AS count
          FROM company_product_principals
          WHERE application_key = 'codecamp'
            AND company_account_id = ${concurrentAccountId}
        `).resolves.toEqual([{ count: 1 }]);

        await expect(client`
          SELECT * FROM public.sync_codecamp_company_principal(
            '20000000-0000-4000-8000-000000000099',
            'internal-company', ${legacyAccountId}, 'Wrong Org', 'INTERN'
          )
        `).rejects.toMatchObject({ code: "RA002" });

        const occupiedLocalId = `codecamp:${collisionAccountId}`;
        await client`
          INSERT INTO users (id, username, display_username, name, role)
          VALUES (
            ${occupiedLocalId}, ${occupiedLocalId}, ${occupiedLocalId},
            'Occupied', 'INTERN'
          )
        `;
        await expect(client`
          SELECT * FROM public.sync_codecamp_company_principal(
            ${organizationId}, 'internal-company', ${collisionAccountId},
            'Collision', 'INTERN'
          )
        `).rejects.toMatchObject({ code: "RA002" });

        await expect(client<
          {
            security_definer: boolean;
            safe_search_path: boolean;
            owner_can_execute: boolean;
            public_can_execute: boolean;
          }[]
        >`
          SELECT p.prosecdef AS security_definer,
                 p.proconfig @> ARRAY['search_path=pg_catalog'] AS safe_search_path,
                 has_function_privilege(current_user, p.oid, 'EXECUTE')
                   AS owner_can_execute,
                 has_function_privilege('public', p.oid, 'EXECUTE')
                   AS public_can_execute
          FROM pg_proc p
          WHERE p.oid =
            'public.sync_codecamp_company_principal(uuid,text,uuid,text,text)'::regprocedure
        `).resolves.toEqual([
          {
            security_definer: true,
            safe_search_path: true,
            owner_can_execute: true,
            public_can_execute: false,
          },
        ]);
      } finally {
        await client.end({ timeout: 5 });
        await admin.unsafe(
          `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
        );
        await admin.end({ timeout: 5 });
      }
    }, 60_000);
  },
);
