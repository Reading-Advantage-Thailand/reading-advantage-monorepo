import { describe, expect, it } from "vitest";

import {
  isDurableJobPostgres16IntegrationEnabled,
  withDurableJobPostgres16Harness,
} from "./postgres16-harness.js";

const integrationEnabled =
  isDurableJobPostgres16IntegrationEnabled(process.env);

describe.skipIf(!integrationEnabled)(
  "durable job isolated PostgreSQL 16 harness",
  () => {
    it("runs exact hooks over two independent connections and tears down", async () => {
      const events: string[] = [];
      let firstBackendPid = 0;
      let secondBackendPid = 0;

      await withDurableJobPostgres16Harness(
        {
          async migrate({ migrationConnection }) {
            events.push("migrate");
            await migrationConnection.unsafe(`
              CREATE TABLE task7_harness_receipt (
                id integer PRIMARY KEY,
                phase text NOT NULL
              )
            `);
          },
          async setup({ connectionOne }) {
            events.push("setup");
            await connectionOne`
              INSERT INTO task7_harness_receipt (id, phase)
              VALUES (1, 'setup')
            `;
          },
          validations: {
            async legacyPreflight({ connectionOne }) {
              events.push("legacy-preflight");
              const [row] = await connectionOne<
                { phase: string }[]
              >`SELECT phase FROM task7_harness_receipt WHERE id = 1`;
              expect(row?.phase).toBe("setup");
            },
            async roleFence() {
              events.push("role-fence");
            },
            async auditPrivileges() {
              events.push("audit-privileges");
            },
            async explainPlans() {
              events.push("explain-plans");
            },
          },
          async teardown({ connectionTwo }) {
            events.push("teardown");
            const [row] = await connectionTwo<
              { row_count: string }[]
            >`SELECT count(*)::text AS row_count FROM task7_harness_receipt`;
            expect(row?.row_count).toBe("1");
          },
        },
        async ({ connectionOne, connectionTwo, databaseName }) => {
          events.push("test");
          const [first] = await connectionOne<
            { backend_pid: number; database_name: string }[]
          >`
            SELECT
              pg_backend_pid() AS backend_pid,
              current_database() AS database_name
          `;
          const [second] = await connectionTwo<
            { backend_pid: number; database_name: string }[]
          >`
            SELECT
              pg_backend_pid() AS backend_pid,
              current_database() AS database_name
          `;
          firstBackendPid = first?.backend_pid ?? 0;
          secondBackendPid = second?.backend_pid ?? 0;
          expect(first?.database_name).toBe(databaseName);
          expect(second?.database_name).toBe(databaseName);
        },
      );

      expect(firstBackendPid).toBeGreaterThan(0);
      expect(secondBackendPid).toBeGreaterThan(0);
      expect(firstBackendPid).not.toBe(secondBackendPid);
      expect(events).toEqual([
        "migrate",
        "setup",
        "legacy-preflight",
        "role-fence",
        "audit-privileges",
        "explain-plans",
        "test",
        "teardown",
      ]);
    });
  },
);
