// @vitest-environment node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const adminUrl = process.env.SALES_TEST_ADMIN_DATABASE_URL;
const migrationUrl = process.env.SALES_TEST_DIRECT_DATABASE_URL;
const runtimeUrl = process.env.SALES_TEST_DATABASE_URL;
const appRoot = resolve(import.meta.dirname, "..");

/**
 * Runs one SQL contract with psql without exposing its connection string.
 * @param databaseUrl Database credential under test.
 * @param file SQL contract file.
 * @returns Completed psql process.
 */
function runPsql(databaseUrl: string, file: string) {
  return spawnSync("psql", ["--no-psqlrc", databaseUrl, "-f", file], {
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
  adminUrl && migrationUrl && runtimeUrl ? describe : describe.skip;

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

    it("provisions the runtime role without inheritance or replication", () => {
      const flags = runPsqlCommand(
        adminUrl!,
        "SELECT rolinherit::text || ',' || rolreplication::text FROM pg_roles WHERE rolname = 'sales_runtime'",
      );
      if (flags.status !== 0) throw new Error(flags.stderr);
      expect(flags.stdout.trim()).toBe("false,false");
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
      expect(result.status).toBe(0);
    });

    it("performs runtime writes and rolls them back", () => {
      const setup = runPsql(
        migrationUrl!,
        resolve(appRoot, "scripts/sales-runtime-probe-setup.sql"),
      );
      if (setup.status !== 0) throw new Error(setup.stderr);
      let runtimeError: Error | undefined;
      let cleanupError: Error | undefined;
      try {
        const result = runPsql(
          runtimeUrl!,
          resolve(appRoot, "scripts/sales-runtime-probe.sql"),
        );
        if (result.status !== 0) runtimeError = new Error(result.stderr);
      } finally {
        const cleanup = runPsql(
          migrationUrl!,
          resolve(appRoot, "scripts/sales-runtime-probe-cleanup.sql"),
        );
        if (cleanup.status !== 0) cleanupError = new Error(cleanup.stderr);
      }
      if (runtimeError) throw runtimeError;
      if (cleanupError) throw cleanupError;
    });
  },
);
