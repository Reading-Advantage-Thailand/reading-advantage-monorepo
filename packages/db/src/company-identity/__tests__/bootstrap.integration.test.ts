import { createHash } from "node:crypto";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { withCompanyIdentityScratchDatabase } from "./test-postgres.js";

const URL_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
const BOOTSTRAP_NAMES = {
  organization:
    "https://reading-advantage.com/company-identity/organization/internal-company",
  marketing:
    "https://reading-advantage.com/company-identity/application/marketing",
  sales: "https://reading-advantage.com/company-identity/application/sales",
  codecamp:
    "https://reading-advantage.com/company-identity/application/codecamp",
} as const;

interface MigrationModule {
  migrateCompanyIdentity(input: { directDatabaseUrl: string }): Promise<void>;
}

interface BootstrapModule {
  bootstrapCompanyIdentity(input: {
    directDatabaseUrl: string;
  }): Promise<void>;
}

function uuidBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replaceAll("-", ""), "hex");
}

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

function uuidV5(name: string): string {
  const digest = createHash("sha1")
    .update(Buffer.concat([uuidBytes(URL_NAMESPACE), Buffer.from(name, "utf8")]))
    .digest()
    .subarray(0, 16);
  digest[6] = (digest[6]! & 0x0f) | 0x50;
  digest[8] = (digest[8]! & 0x3f) | 0x80;
  return formatUuid(digest);
}

async function loadProductionModule<T>(
  relativePath: string,
  exportName: string,
): Promise<T> {
  try {
    const moduleUrl = new URL(relativePath, import.meta.url).href;
    const loaded = (await import(/* @vite-ignore */ moduleUrl)) as Record<
      string,
      unknown
    >;
    expect(
      loaded[exportName],
      `PostgreSQL 16 was reached, but production export ${exportName} is absent.`,
    ).toBeTypeOf("function");
    return loaded as T;
  } catch (error) {
    throw new Error(
      `PostgreSQL 16 was reached, but the production ${exportName} primitive is absent.`,
      { cause: error },
    );
  }
}

describe("company identity deterministic bootstrap", () => {
  it("replays stable organization and application records without duplicate grants or evidence", async () => {
    await withCompanyIdentityScratchDatabase(async ({
      adminSql,
      directDatabaseUrl,
    }) => {
      expect(await adminSql`select current_setting('server_version_num')::int as version`)
        .toHaveLength(1);

      const migration = await loadProductionModule<MigrationModule>(
        "../migration.js",
        "migrateCompanyIdentity",
      );
      const bootstrap = await loadProductionModule<BootstrapModule>(
        "../bootstrap.js",
        "bootstrapCompanyIdentity",
      );
      await migration.migrateCompanyIdentity({ directDatabaseUrl });

      const sql = postgres(directDatabaseUrl, { max: 1 });
      try {
        await bootstrap.bootstrapCompanyIdentity({ directDatabaseUrl });

        const firstOrganization = await sql<
          Array<{ id: string; stable_key: string }>
        >`select id::text, stable_key from company_organizations`;
        const firstApplications = await sql<
          Array<{ id: string; stable_key: string }>
        >`select id::text, stable_key from company_applications order by stable_key`;

        expect(firstOrganization).toEqual([
          {
            id: uuidV5(BOOTSTRAP_NAMES.organization),
            stable_key: "internal-company",
          },
        ]);
        expect(firstApplications).toEqual(
          ["codecamp", "marketing", "sales"].map((stableKey) => ({
            id: uuidV5(BOOTSTRAP_NAMES[stableKey as keyof typeof BOOTSTRAP_NAMES]),
            stable_key: stableKey,
          })),
        );
        const firstRoleDefinitions = await sql<
          Array<{
            description: string | null;
            role_key: string;
            stable_key: string;
            status: string;
          }>
        >`
          select a.stable_key, r.role_key, r.description, r.status
            from company_application_role_definitions r
            join company_applications a on a.id = r.application_id
           order by a.stable_key, r.role_key
        `;
        expect(
          firstRoleDefinitions.map(({ stable_key: stableKey, role_key: roleKey }) =>
            `${stableKey}:${roleKey}`,
          ),
        ).toEqual([
          "marketing:ADMIN",
          "marketing:MEMBER",
          "sales:SALES_ADMIN",
          "sales:SALES_REP",
        ]);

        const evidenceCountsBeforeReplay = await sql<
          Array<{
            app_grants: number;
            audit_events: number;
            company_grants: number;
            idempotency_records: number;
          }>
        >`
          select
            (select count(*)::int from company_application_role_assignments) as app_grants,
            (select count(*)::int from company_identity_audit_events) as audit_events,
            (select count(*)::int from company_role_assignments) as company_grants,
            (select count(*)::int from company_identity_idempotency_records) as idempotency_records
        `;
        expect(evidenceCountsBeforeReplay[0]!.audit_events).toBeLessThanOrEqual(1);
        expect(evidenceCountsBeforeReplay[0]!.idempotency_records)
          .toBeLessThanOrEqual(1);

        await sql`
          update company_organizations
             set display_name = 'Operator Company', status = 'SUSPENDED'
           where stable_key = 'internal-company'
        `;
        await sql`
          update company_applications
             set display_name = 'Operator Marketing', status = 'DISABLED'
           where stable_key = 'marketing'
        `;
        await sql`
          update company_application_role_definitions
             set description = 'Operator role description', status = 'RETIRED'
           where application_id = (
             select id from company_applications where stable_key = 'marketing'
           ) and role_key = 'MEMBER'
        `;
        await bootstrap.bootstrapCompanyIdentity({ directDatabaseUrl });

        expect(
          await sql`select id::text, stable_key from company_organizations`,
        ).toEqual(firstOrganization);
        expect(
          await sql`select id::text, stable_key from company_applications order by stable_key`,
        ).toEqual(firstApplications);
        expect(
          await sql`
            select display_name, status
              from company_organizations
             where stable_key = 'internal-company'
          `,
        ).toEqual([{ display_name: "Operator Company", status: "SUSPENDED" }]);
        expect(
          await sql`
            select display_name, status
              from company_applications
             where stable_key = 'marketing'
          `,
        ).toEqual([{ display_name: "Operator Marketing", status: "DISABLED" }]);
        expect(
          await sql`
            select a.stable_key, r.role_key, r.description, r.status
              from company_application_role_definitions r
              join company_applications a on a.id = r.application_id
             order by a.stable_key, r.role_key
          `,
        ).toEqual(
          firstRoleDefinitions.map((row) =>
            row.stable_key === "marketing" && row.role_key === "MEMBER"
              ? {
                  ...row,
                  description: "Operator role description",
                  status: "RETIRED",
                }
              : row,
          ),
        );
        const evidenceCountsAfterReplay = await sql`
          select
            (select count(*)::int from company_application_role_assignments) as app_grants,
            (select count(*)::int from company_identity_audit_events) as audit_events,
            (select count(*)::int from company_role_assignments) as company_grants,
            (select count(*)::int from company_identity_idempotency_records) as idempotency_records
        `;
        expect(evidenceCountsAfterReplay).toEqual(evidenceCountsBeforeReplay);

        await sql`
          update company_organizations
             set stable_key = 'mismatched-company-key'
           where id = ${uuidV5(BOOTSTRAP_NAMES.organization)}
        `;
        await expect(
          bootstrap.bootstrapCompanyIdentity({ directDatabaseUrl }),
        ).rejects.toThrow(/mismatch|stable key|bootstrap/i);
        expect(
          await sql`
            select id::text, stable_key
              from company_organizations
             order by stable_key
          `,
        ).toEqual([
          {
            id: uuidV5(BOOTSTRAP_NAMES.organization),
            stable_key: "mismatched-company-key",
          },
        ]);
      } finally {
        await sql.end();
      }
    });
  }, 120_000);
});
