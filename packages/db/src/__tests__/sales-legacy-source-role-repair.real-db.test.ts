// @vitest-environment node
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

const pgTestUrl = process.env.PG_TEST_URL;
const describeRealPostgres = pgTestUrl ? describe : describe.skip;
const repairScript = resolve(
  import.meta.dirname,
  "../../../../apps/sales-advantage/scripts/sales-legacy-source-role-repair.sql",
);

interface RepairManifest {
  readonly accountId: string;
  readonly expectedCurrentRole: "SALES_ADMIN";
  readonly targetRole: "ADMIN";
}

/** Runs the exact committed repair script through psql without a shell. */
function runRepair(databaseUrl: string, manifest: RepairManifest): void {
  execFileSync(
    "psql",
    [
      databaseUrl,
      "--no-psqlrc",
      `--set=repair_manifest=${JSON.stringify(manifest)}`,
      "-f",
      repairScript,
    ],
    { stdio: "pipe" },
  );
}

/** Reads one compatibility user's current role from the scratch database. */
async function readRole(
  client: ReturnType<typeof postgres>,
  userId: string,
): Promise<string> {
  const rows = await client<{ role: string }[]>`
    SELECT role::text AS role FROM users WHERE id = ${userId}
  `;
  return rows[0]?.role ?? "ABSENT";
}

describeRealPostgres(
  "Sales legacy source-role repair (real PostgreSQL)",
  () => {
    it("fails closed for zero, mismatched, and multiple mappings while updating only the explicit row", async () => {
      const databaseName = `sales_role_repair_${randomUUID().replaceAll("-", "")}`;
      const admin = postgres(pgTestUrl!, { max: 1 });
      const scratchUrl = new URL(pgTestUrl!);
      scratchUrl.pathname = `/${databaseName}`;
      await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
      const databaseUrl = scratchUrl.toString();
      const client = postgres(databaseUrl, { max: 1 });
      const accountId = "00000000-0000-4000-8000-000000000001";
      const unrelatedAccountId = "00000000-0000-4000-8000-000000000002";
      const manifest: RepairManifest = {
        accountId,
        expectedCurrentRole: "SALES_ADMIN",
        targetRole: "ADMIN",
      };

      try {
        await client.unsafe(`
        CREATE TYPE role AS ENUM (
          'INTERN', 'STUDENT', 'TEACHER', 'ADMIN', 'SYSTEM',
          'SALES_REP', 'SALES_ADMIN'
        );
        CREATE TABLE users (
          id text PRIMARY KEY,
          role role NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE company_product_principals (
          organization_id uuid NOT NULL,
          company_account_id uuid NOT NULL,
          application_key text NOT NULL,
          local_user_id text NOT NULL,
          PRIMARY KEY (organization_id, company_account_id, application_key),
          CONSTRAINT company_product_principals_application_local_unique
            UNIQUE (application_key, local_user_id)
        );
        CREATE TABLE audit_events (
          id text PRIMARY KEY,
          actor_user_id text,
          actor_role text,
          action text NOT NULL,
          target_type text,
          target_id text,
          metadata jsonb,
          created_at timestamptz NOT NULL DEFAULT now()
        );
      `);

        await client`INSERT INTO users (id, role) VALUES (${accountId}, 'SALES_ADMIN')`;
        expect(() => runRepair(databaseUrl, manifest)).toThrow();
        expect(await readRole(client, accountId)).toBe("SALES_ADMIN");

        const salesLocalId = `sales:${accountId}`;
        const unrelatedLocalId = `sales:${unrelatedAccountId}`;
        await client`
        INSERT INTO users (id, role) VALUES
          (${salesLocalId}, 'SALES_ADMIN'),
          (${unrelatedAccountId}, 'TEACHER'),
          (${unrelatedLocalId}, 'SALES_REP')
      `;
        await client`
        INSERT INTO company_product_principals (
          organization_id, company_account_id, application_key, local_user_id
        ) VALUES
          ('10000000-0000-4000-8000-000000000001', ${accountId}, 'sales', ${salesLocalId}),
          ('10000000-0000-4000-8000-000000000002', ${unrelatedAccountId}, 'sales', ${unrelatedLocalId})
      `;

        await client`UPDATE users SET role = 'ADMIN' WHERE id = ${accountId}`;
        expect(() => runRepair(databaseUrl, manifest)).toThrow();
        expect(await readRole(client, accountId)).toBe("ADMIN");
        const prematureAuditRows = await client<{ count: number }[]>`
          SELECT count(*)::integer AS count
          FROM audit_events
          WHERE id = ${`sales-source-role-repair:${accountId}`}
        `;
        expect(prematureAuditRows[0]?.count).toBe(0);
        await client`UPDATE users SET role = 'SALES_ADMIN' WHERE id = ${accountId}`;
        expect(await readRole(client, accountId)).toBe("SALES_ADMIN");

        runRepair(databaseUrl, manifest);
        runRepair(databaseUrl, manifest);
        expect(await readRole(client, accountId)).toBe("ADMIN");
        expect(await readRole(client, salesLocalId)).toBe("SALES_ADMIN");
        expect(await readRole(client, unrelatedAccountId)).toBe("TEACHER");
        expect(await readRole(client, unrelatedLocalId)).toBe("SALES_REP");
        const auditRows = await client<
          {
            action: string;
            actor_role: string;
            metadata: Record<string, unknown>;
          }[]
        >`
          SELECT action, actor_role, metadata
          FROM audit_events
          WHERE action = 'sales:legacy_source_role_repaired'
        `;
        expect(auditRows).toEqual([
          {
            action: "sales:legacy_source_role_repaired",
            actor_role: "SYSTEM",
            metadata: {
              applicationKey: "sales",
              expectedCurrentRole: "SALES_ADMIN",
              targetRole: "ADMIN",
              source: "cloud-build-repair-manifest",
            },
          },
        ]);

        await client`
          UPDATE audit_events
          SET metadata = metadata || '{"source":"unexpected"}'::jsonb
          WHERE id = ${`sales-source-role-repair:${accountId}`}
        `;
        expect(() => runRepair(databaseUrl, manifest)).toThrow();
        await client`
          UPDATE audit_events
          SET metadata =
            metadata || '{"source":"cloud-build-repair-manifest"}'::jsonb
          WHERE id = ${`sales-source-role-repair:${accountId}`}
        `;

        await client`UPDATE users SET role = 'TEACHER' WHERE id = ${accountId}`;
        expect(() => runRepair(databaseUrl, manifest)).toThrow();
        expect(await readRole(client, accountId)).toBe("TEACHER");

        const duplicateLocalId = `${salesLocalId}:duplicate`;
        await client`UPDATE users SET role = 'SALES_ADMIN' WHERE id = ${accountId}`;
        await client`INSERT INTO users (id, role) VALUES (${duplicateLocalId}, 'SALES_REP')`;
        await client`
        INSERT INTO company_product_principals (
          organization_id, company_account_id, application_key, local_user_id
        ) VALUES (
          '10000000-0000-4000-8000-000000000003', ${accountId},
          'sales', ${duplicateLocalId}
        )
      `;
        expect(() => runRepair(databaseUrl, manifest)).toThrow();
        expect(await readRole(client, accountId)).toBe("SALES_ADMIN");
        expect(await readRole(client, duplicateLocalId)).toBe("SALES_REP");
      } finally {
        await client.end();
        await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
        await admin.end();
      }
    }, 60_000);
  },
);
