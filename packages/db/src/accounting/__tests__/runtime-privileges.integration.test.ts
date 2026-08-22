import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAccountingDirectClient,
  createAccountingRuntimeClient,
} from "../client.js";
import {
  createAccountingDirectConfig,
  createAccountingRuntimeConfig,
} from "../environment.js";
import { migrateAccounting } from "../migration.js";
import { configureAccountingDatabasePrivileges } from "../privileged.js";

type DatabaseError = Error & { code?: string };

const directConfig = createAccountingDirectConfig({
  ACCOUNTING_DIRECT_DATABASE_URL: process.env.ACCOUNTING_DIRECT_DATABASE_URL,
});
const runtimeConfig = createAccountingRuntimeConfig({
  ACCOUNTING_DATABASE_URL: process.env.ACCOUNTING_DATABASE_URL,
  ACCOUNTING_DATABASE_POOL_MAX: "2",
});
const runtimeRole = decodeURIComponent(
  new URL(runtimeConfig.databaseUrl).username,
);
const migrationRole = decodeURIComponent(
  new URL(directConfig.directDatabaseUrl).username,
);

let insertedId: string | undefined;

/** Expects a PostgreSQL operation to fail with one SQLSTATE. */
async function expectDatabaseError(
  operation: () => Promise<unknown>,
  code: string,
): Promise<void> {
  let caught: DatabaseError | undefined;
  try {
    await operation();
  } catch (error) {
    caught = error as DatabaseError;
  }
  expect(caught).toBeDefined();
  expect(caught?.code).toBe(code);
}

beforeAll(async () => {
  await migrateAccounting({
    directDatabaseUrl: directConfig.directDatabaseUrl,
  });
  await configureAccountingDatabasePrivileges({
    databaseUrl: directConfig.directDatabaseUrl,
    runtimeRole,
    migrationRole,
  });
});

afterAll(async () => {
  if (!insertedId) return;
  const directSql = await createAccountingDirectClient({
    directDatabaseUrl: directConfig.directDatabaseUrl,
  });
  try {
    await directSql`delete from accounting_submissions where id = ${insertedId}`;
  } finally {
    await directSql.end({ timeout: 5 });
  }
});

describe("accounting runtime and migration privilege boundaries", () => {
  it("allows only runtime schema usage and submission select/insert", async () => {
    const runtimeSql = await createAccountingRuntimeClient({
      databaseUrl: runtimeConfig.databaseUrl,
      expectedDatabaseName: "accounting",
      expectedRole: runtimeRole,
      poolMax: runtimeConfig.poolMax,
    });
    try {
      expect(runtimeSql.options.port).toEqual([6432]);
      expect(runtimeSql.options.prepare).toBe(false);

      const [probe] = await runtimeSql<
        Array<{
          database_name: string;
          role_name: string;
          schema_create: boolean;
          schema_usage: boolean;
          can_select: boolean;
          can_insert: boolean;
          can_update: boolean;
          can_delete: boolean;
          can_truncate: boolean;
          can_references: boolean;
          can_trigger: boolean;
        }>
      >`
        select
          current_database() as database_name,
          current_user as role_name,
          has_schema_privilege(current_user, 'public', 'CREATE') as schema_create,
          has_schema_privilege(current_user, 'public', 'USAGE') as schema_usage,
          has_table_privilege(current_user, 'public.accounting_submissions', 'SELECT') as can_select,
          has_table_privilege(current_user, 'public.accounting_submissions', 'INSERT') as can_insert,
          has_table_privilege(current_user, 'public.accounting_submissions', 'UPDATE') as can_update,
          has_table_privilege(current_user, 'public.accounting_submissions', 'DELETE') as can_delete,
          has_table_privilege(current_user, 'public.accounting_submissions', 'TRUNCATE') as can_truncate,
          has_table_privilege(current_user, 'public.accounting_submissions', 'REFERENCES') as can_references,
          has_table_privilege(current_user, 'public.accounting_submissions', 'TRIGGER') as can_trigger
      `;
      expect(probe).toEqual({
        database_name: "accounting",
        role_name: runtimeRole,
        schema_create: false,
        schema_usage: true,
        can_select: true,
        can_insert: true,
        can_update: false,
        can_delete: false,
        can_truncate: false,
        can_references: false,
        can_trigger: false,
      });

      const submissionId = randomUUID();
      insertedId = submissionId;
      await runtimeSql`
        insert into accounting_submissions
          (id, kind, payee, category, amount_minor, currency,
           evidence_reference, scope_company_id, submitted_by_account_id)
        values
          (${submissionId}, 'expense', 'Runtime privilege probe', 'test', '100',
           'THB', 'private-evidence://accounting-test/runtime/receipt.pdf',
           ${randomUUID()}, ${randomUUID()})
      `;
      const [inserted] = await runtimeSql<Array<{ id: string }>>`
        select id from accounting_submissions where id = ${submissionId}
      `;
      expect(inserted?.id).toBe(submissionId);
      await expectDatabaseError(
        () =>
          runtimeSql`update accounting_submissions set payee = 'forbidden' where id = ${submissionId}`,
        "42501",
      );
      await expectDatabaseError(
        () => runtimeSql`delete from accounting_submissions where id = ${submissionId}`,
        "42501",
      );
      await expectDatabaseError(
        () =>
          runtimeSql.begin(async (tx) => {
            await tx`truncate table accounting_submissions`;
            throw new Error("Runtime TRUNCATE was unexpectedly allowed.");
          }),
        "42501",
      );
    } finally {
      await runtimeSql.end({ timeout: 5 });
    }
  });

  it("rejects the migration owner at the runtime client boundary", async () => {
    await expect(
      createAccountingRuntimeClient({
        databaseUrl: directConfig.directDatabaseUrl,
      }),
    ).rejects.toMatchObject({ code: "ACCOUNTING_PRIVILEGE_MISMATCH" });
  });
});
