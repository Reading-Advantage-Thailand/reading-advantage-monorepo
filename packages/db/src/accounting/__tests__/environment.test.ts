// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  createAccountingDirectConfig,
  createAccountingRuntimeConfig,
} from "../environment.js";
import { readFileSync } from "node:fs";

describe("Accounting dedicated-database configuration", () => {
  it("parses ACCOUNTING_DATABASE_URL and the runtime pool max", () => {
    const config = createAccountingRuntimeConfig({
      ACCOUNTING_DATABASE_URL: "postgresql://accounting_runtime@localhost/accounting",
      ACCOUNTING_DATABASE_POOL_MAX: "5",
    });
    expect(config.databaseUrl).toBe(
      "postgresql://accounting_runtime@localhost/accounting",
    );
    expect(config.poolMax).toBe(5);
  });

  it("parses ACCOUNTING_DIRECT_DATABASE_URL for migrations", () => {
    const config = createAccountingDirectConfig({
      ACCOUNTING_DIRECT_DATABASE_URL:
        "postgresql://accounting_migration@localhost/accounting",
    });
    expect(config.directDatabaseUrl).toBe(
      "postgresql://accounting_migration@localhost/accounting",
    );
  });

  it("rejects a runtime URL whose database is not the accounting database", () => {
    expect(() =>
      createAccountingRuntimeConfig({
        ACCOUNTING_DATABASE_URL: "postgresql://accounting_runtime@localhost/other",
      }),
    ).toThrow();
  });

  it("rejects a non-postgresql runtime URL", () => {
    expect(() =>
      createAccountingRuntimeConfig({
        ACCOUNTING_DATABASE_URL: "mysql://accounting_runtime@localhost/accounting",
      }),
    ).toThrow();
  });

  it("fails closed when the runtime URL is absent", () => {
    expect(() => createAccountingRuntimeConfig({})).toThrow();
  });

  it("fails closed when the direct URL is absent", () => {
    expect(() => createAccountingDirectConfig({})).toThrow();
  });

  it("wires migrate and doctor commands to the direct URL and accounting journal", () => {
    const migration = readFileSync(
      new URL("../migration.ts", import.meta.url),
      "utf8",
    );
    for (const commandName of ["migrate", "doctor"]) {
      const command = readFileSync(
        new URL(`../commands/${commandName}.ts`, import.meta.url),
        "utf8",
      );
      expect(command).toContain("createAccountingDirectConfig");
      expect(command).toContain("ACCOUNTING_DIRECT_DATABASE_URL");
    }
    expect(migration).toContain('new URL("../../accounting/drizzle"');
  });
});
