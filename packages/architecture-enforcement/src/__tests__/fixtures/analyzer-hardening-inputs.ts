/** Exact source paths and bytes used by the analyzer hardening assertions. */
export const analyzerHardeningInputs = {
  directOrigins: {
    sourcePath: "apps/example/src/direct.ts",
    source: [
      "/** Exact non-default source location for lookup validation. */",
      "",
      '  import { db, reviewJobs } from "@reading-advantage/db";',
      "export const secretSafeReference = [db, reviewJobs];",
    ].join("\n"),
  },
  durableAccess: {
    sourcePaths: {
      namespace: "packages/backend/src/jobs/namespace-durable-query.ts",
      dynamic: "packages/backend/src/jobs/dynamic-durable-query.ts",
      commonjs: "packages/backend/src/jobs/commonjs-durable-query.ts",
      reexport: "packages/backend/src/jobs/reexport-durable-query.ts",
      clientConstruction:
        "packages/backend/src/jobs/client-construction-durable.ts",
      rawSql: "packages/backend/src/jobs/raw-durable-query.ts",
      adapterRawSql:
        "packages/backend/src/jobs/adapters/postgres/raw-durable-query.ts",
      literalConst: "packages/backend/src/jobs/literal-const-durable-query.ts",
      literalConcat:
        "packages/backend/src/jobs/literal-concat-durable-query.ts",
      sqlMention: "packages/backend/src/jobs/sql-mention-durable-query.ts",
      shadowed: "packages/backend/src/jobs/shadowed-durable-query.ts",
      reexportSupport: "packages/backend/src/jobs/durable-reexports.ts",
    } as const,
    sources: {
      "packages/backend/src/jobs/namespace-durable-query.ts": [
        'import * as database from "@reading-advantage/db";',
        "const query = {",
        "  select: () => ({ from: (table: unknown) => table }),",
        "};",
        "export const namespaceAccess = query.select().from(database.durableJobs);",
      ].join("\n"),
      "packages/backend/src/jobs/dynamic-durable-query.ts": [
        "const query = {",
        "  select: () => ({ from: (table: unknown) => table }),",
        "};",
        "export async function dynamicAccess() {",
        '  const database = await import("@reading-advantage/db");',
        "  return query.select().from(database.durableJobs);",
        "}",
      ].join("\n"),
      "packages/backend/src/jobs/commonjs-durable-query.ts": [
        'const database = require("@reading-advantage/db");',
        "const query = {",
        "  select: () => ({ from: (table: unknown) => table }),",
        "};",
        "export const commonjsAccess = query.select().from(database.durableJobs);",
      ].join("\n"),
      "packages/backend/src/jobs/reexport-durable-query.ts": [
        'import { durableJobs } from "./durable-reexports.js";',
        "const query = {",
        "  select: () => ({ from: (table: unknown) => table }),",
        "};",
        "export const reexportAccess = query.select().from(durableJobs);",
      ].join("\n"),
      "packages/backend/src/jobs/client-construction-durable.ts": [
        'import { durableJobs } from "@reading-advantage/db";',
        "class SyntheticDurableClient {",
        "  constructor(readonly table: unknown) {}",
        "}",
        "export const clientConstructionAccess = new SyntheticDurableClient(durableJobs);",
      ].join("\n"),
      "packages/backend/src/jobs/raw-durable-query.ts": [
        'import postgres from "postgres";',
        "const client = postgres();",
        'export const rawSqlAccess = client.unsafe(`SELECT * FROM "durable_jobs" JOIN "review_jobs" ON true`);',
      ].join("\n"),
      "packages/backend/src/jobs/adapters/postgres/raw-durable-query.ts": [
        'import postgres from "postgres";',
        "const client = postgres();",
        'export const adapterRawSqlAccess = client.unsafe(`SELECT * FROM "durable_jobs" JOIN "review_jobs" ON true`);',
      ].join("\n"),
      "packages/backend/src/jobs/literal-const-durable-query.ts": [
        'import postgres from "postgres";',
        "const client = postgres();",
        'const sql = `SELECT * FROM "durable_jobs" JOIN "review_jobs" ON true`;',
        "export const literalConstAccess = client.unsafe(sql);",
      ].join("\n"),
      "packages/backend/src/jobs/literal-concat-durable-query.ts": [
        'import postgres from "postgres";',
        "const client = postgres();",
        'const sql = "SELECT * FROM " +\n          \'"durable_jobs" JOIN "review_jobs" ON true\';',
        "export const literalConcatAccess = client.unsafe(sql);",
      ].join("\n"),
      "packages/backend/src/jobs/sql-mention-durable-query.ts": [
        'import postgres from "postgres";',
        "const client = postgres();",
        'export const commentMention = client.unsafe("SELECT 1 /* durable_jobs review_jobs */");',
        "export const valueMention = client.unsafe(\"SELECT 'durable_jobs' AS durable, 'review_jobs' AS review\");",
      ].join("\n"),
      "packages/backend/src/jobs/shadowed-durable-query.ts": [
        'import { durableJobs } from "@reading-advantage/db";',
        "const query = {",
        "  select: () => ({ from: (table: unknown) => table }),",
        "};",
        "export const shadowedAccess = (durableJobs: unknown) =>",
        "  query.select().from(durableJobs);",
      ].join("\n"),
      "packages/backend/src/jobs/durable-reexports.ts":
        'export { durableJobs } from "@reading-advantage/db";',
    } as const,
  },
} as const;
