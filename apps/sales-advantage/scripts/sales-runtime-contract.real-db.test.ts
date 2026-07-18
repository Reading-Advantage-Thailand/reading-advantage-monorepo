// @vitest-environment node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

const adminUrl = process.env.SALES_TEST_ADMIN_DATABASE_URL;
const migrationUrl = process.env.SALES_TEST_DIRECT_DATABASE_URL;
const runtimeUrl = process.env.SALES_TEST_DATABASE_URL;
const legacyRuntimeUrl = process.env.SALES_TEST_LEGACY_DATABASE_URL;
const appRoot = resolve(import.meta.dirname, "..");
const probeOwner = randomUUID();

/**
 * Runs one SQL contract with psql without exposing its connection string.
 * @param databaseUrl Database credential under test.
 * @param file SQL contract file.
 * @param variables psql variables supplied to the contract.
 * @returns Completed psql process.
 */
function runPsql(
  databaseUrl: string,
  file: string,
  variables: Readonly<Record<string, string>> = {},
) {
  const variableArgs = Object.entries(variables).flatMap(([key, value]) => [
    `--set=${key}=${value}`,
  ]);
  return spawnSync("psql", [
    "--no-psqlrc",
    databaseUrl,
    ...variableArgs,
    "-f",
    file,
  ], {
    cwd: appRoot,
    encoding: "utf8",
  });
}

/** Runs a read-only SQL assertion without exposing its database credential. */
function runPsqlCommand(databaseUrl: string, command: string) {
  return spawnSync("psql", ["--no-psqlrc", databaseUrl, "-Atc", command], {
    cwd: appRoot,
    encoding: "utf8",
  });
}

const describeRealDatabase =
  adminUrl && migrationUrl && runtimeUrl && legacyRuntimeUrl
    ? describe
    : describe.skip;

describeRealDatabase(
  "Sales runtime database contract (real PostgreSQL)",
  () => {
    it("uses a privileged administrator only for one-time role provisioning", () => {
      const result = runPsql(
        adminUrl!,
        resolve(appRoot, "scripts/sales-runtime-role-provision.sql"),
      );
      if (result.status !== 0) throw new Error(result.stderr);
      expect(result.status).toBe(0);
    });

    it("provisions both runtime roles without inheritance or replication", () => {
      const flags = runPsqlCommand(
        adminUrl!,
        "SELECT rolname || ',' || rolinherit::text || ',' || rolreplication::text FROM pg_roles WHERE rolname IN ('sales_runtime','sales_legacy_runtime') ORDER BY rolname",
      );
      if (flags.status !== 0) throw new Error(flags.stderr);
      expect(flags.stdout.trim().split("\n")).toEqual([
        "sales_legacy_runtime,false,false",
        "sales_runtime,false,false",
      ]);
    });

    it("applies recurring grants with the NOCREATEROLE migration credential", () => {
      const identity = runPsqlCommand(
        migrationUrl!,
        "SELECT current_user || ',' || rolsuper::text || ',' || rolcreaterole::text FROM pg_roles WHERE rolname = current_user",
      );
      if (identity.status !== 0) throw new Error(identity.stderr);
      expect(identity.stdout.trim()).toBe("sales_migration,false,false");

      const result = runPsql(
        migrationUrl!,
        resolve(appRoot, "scripts/sales-runtime-grants.sql"),
      );
      if (result.status !== 0) throw new Error(result.stderr);
      const legacyResult = runPsql(
        migrationUrl!,
        resolve(appRoot, "scripts/sales-legacy-runtime-grants.sql"),
      );
      if (legacyResult.status !== 0) throw new Error(legacyResult.stderr);
      expect([result.status, legacyResult.status]).toEqual([0, 0]);
    });

    it("performs company and compatibility writes without touching fixed-ID curriculum", () => {
      const fixedRows = runPsqlCommand(
        migrationUrl!,
        `INSERT INTO sales_modules (id, slug, title, description, phase, "order") VALUES ('00000000-0000-0000-0000-000000000051', '__preexisting_fixed_probe__', 'Existing', 'Existing', 'Foundations', 999); INSERT INTO sales_rubrics (id, name, criteria_json, review_status) VALUES ('00000000-0000-0000-0000-000000000053', '__preexisting_fixed_probe__', '[]'::jsonb, 'approved');`,
      );
      if (fixedRows.status !== 0) throw new Error(fixedRows.stderr);
      let runtimeError: Error | undefined;
      let cleanupError: Error | undefined;
      let fixedCountOutput: string | undefined;
      try {
        const setup = runPsql(
          migrationUrl!,
          resolve(appRoot, "scripts/sales-runtime-probe-setup.sql"),
          { probe_owner: probeOwner },
        );
        if (setup.status !== 0) throw new Error(setup.stderr);
        const result = runPsql(
          runtimeUrl!,
          resolve(appRoot, "scripts/sales-runtime-probe.sql"),
          { probe_owner: probeOwner },
        );
        if (result.status !== 0) runtimeError = new Error(result.stderr);
        const legacyResult = runPsql(
          legacyRuntimeUrl!,
          resolve(appRoot, "scripts/sales-legacy-runtime-probe.sql"),
          { probe_owner: probeOwner },
        );
        if (legacyResult.status !== 0) {
          runtimeError = new Error(legacyResult.stderr);
        }
        const fixedCount = runPsqlCommand(
          migrationUrl!,
          "SELECT (SELECT count(*) FROM sales_modules WHERE id = '00000000-0000-0000-0000-000000000051')::text || ',' || (SELECT count(*) FROM sales_rubrics WHERE id = '00000000-0000-0000-0000-000000000053')::text",
        );
        if (fixedCount.status !== 0) {
          runtimeError = new Error(fixedCount.stderr);
        } else {
          fixedCountOutput = fixedCount.stdout.trim();
        }
      } finally {
        const cleanup = runPsql(
          migrationUrl!,
          resolve(appRoot, "scripts/sales-runtime-probe-cleanup.sql"),
          { probe_owner: probeOwner },
        );
        if (cleanup.status !== 0) cleanupError = new Error(cleanup.stderr);
        const fixedCleanup = runPsqlCommand(
          migrationUrl!,
          "DELETE FROM sales_modules WHERE id = '00000000-0000-0000-0000-000000000051'; DELETE FROM sales_rubrics WHERE id = '00000000-0000-0000-0000-000000000053';",
        );
        if (fixedCleanup.status !== 0) {
          cleanupError = new Error(fixedCleanup.stderr);
        }
      }
      if (runtimeError) throw runtimeError;
      if (cleanupError) throw cleanupError;
      expect(fixedCountOutput).toBe("1,1");
    });
  },
);
