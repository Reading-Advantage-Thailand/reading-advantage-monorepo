// @vitest-environment node
/**
 * tutor_reader grant script (primary_legacy_data_migration_20261004, cutover spec D4/A7).
 * Tutor must read the four tutor_compat views and nothing else.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const SCRIPT = readFileSync(resolve(ROOT, "scripts/tutor-reader-grants.sql"), "utf8");
const STATEMENTS = SCRIPT.replace(/--.*$/gm, "");
const VIEWS_SQL = readFileSync(resolve(ROOT, "drizzle/0061_tutor_compat_views.sql"), "utf8");
const VIEWS = [...VIEWS_SQL.matchAll(/CREATE VIEW tutor_compat\.(\w+)/g)].map((m) => m[1]!).sort();

const pgTestUrl = process.env.PG_TEST_URL;
const describeRealPostgres = pgTestUrl ? describe : describe.skip;

describe("tutor_reader grant script", () => {
  it("grants SELECT on exactly the four views of migration 0061", () => {
    expect(VIEWS).toHaveLength(4);
    const granted = STATEMENTS.match(/GRANT SELECT ON([\s\S]*?)TO tutor_reader/)![1]!
      .split(",")
      .map((v) => v.trim().replace(/^tutor_compat\./, ""))
      .sort();
    expect(granted).toEqual(VIEWS);
  });

  it("grants nothing on public and nothing that writes", () => {
    expect(STATEMENTS).not.toMatch(/\bON\s+(SCHEMA\s+)?public\b/i);
    expect(STATEMENTS).not.toMatch(/\bGRANT\s+(ALL|INSERT|UPDATE|DELETE|TRUNCATE|CREATE)\b/i);
  });

  it("sets the search path on the role for the current database only", () => {
    expect(SCRIPT).toContain("ALTER ROLE tutor_reader IN DATABASE %I SET search_path = tutor_compat");
  });
});

describeRealPostgres("tutor_reader grant script (real PostgreSQL)", () => {
  it("lets tutor_reader read the views by legacy name and nothing else", async () => {
    const admin = postgres(pgTestUrl!, { max: 1, onnotice: () => {} });
    const [existing] = await admin`SELECT 1 FROM pg_roles WHERE rolname = 'tutor_reader'`;
    if (existing) {
      await admin.end();
      throw new Error("A tutor_reader role already exists on this server. Drop it before you run this test.");
    }

    const databaseName = `tutor_reader_${randomUUID().replaceAll("-", "")}`;
    const scratchUrl = new URL(pgTestUrl!);
    scratchUrl.pathname = `/${databaseName}`;
    await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    const client = postgres(scratchUrl.toString(), { max: 1, onnotice: () => {} });
    const password = randomUUID();
    let reader: ReturnType<typeof postgres> | undefined;

    try {
      await client.unsafe(`
        CREATE TABLE public.articles (id uuid PRIMARY KEY, title text, is_published boolean);
        CREATE TABLE public.users (id text PRIMARY KEY);
        CREATE SCHEMA tutor_compat;
        ${VIEWS.map(
          (v) => `CREATE VIEW tutor_compat.${v} AS SELECT id::text AS id, title, is_published FROM public.articles;`,
        ).join("\n")}
      `);
      await client`INSERT INTO public.articles VALUES ('00000000-0000-4000-8000-000000000001', 'Origins', true)`;

      await expect(client.unsafe(SCRIPT)).rejects.toThrow(/Create the tutor_reader login/);
      await client.unsafe("ROLLBACK");

      await admin.unsafe(`CREATE ROLE tutor_reader LOGIN PASSWORD '${password}'`);
      await client.unsafe(SCRIPT);

      const readerUrl = new URL(scratchUrl);
      readerUrl.username = "tutor_reader";
      readerUrl.password = password;
      reader = postgres(readerUrl.toString(), { max: 1, onnotice: () => {} });

      const rows = await reader`SELECT title FROM article WHERE id = ${"00000000-0000-4000-8000-000000000001"} AND is_published = true`;
      expect(rows).toEqual([{ title: "Origins" }]);
      for (const v of VIEWS) await expect(reader.unsafe(`SELECT 1 FROM ${v} LIMIT 1`)).resolves.toBeDefined();

      await expect(reader`SELECT 1 FROM public.articles`).rejects.toThrow(/permission denied/);
      await expect(reader`SELECT 1 FROM public.users`).rejects.toThrow(/permission denied/);
      await expect(reader`INSERT INTO public.articles (id) VALUES (gen_random_uuid())`).rejects.toThrow(/permission denied/);
      await expect(reader`DELETE FROM article`).rejects.toThrow(/permission denied/);
      await expect(reader`CREATE TABLE tutor_compat.probe (id int)`).rejects.toThrow(/permission denied/);
    } finally {
      await reader?.end();
      await client.end();
      await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await admin.unsafe(`DROP ROLE IF EXISTS tutor_reader`);
      await admin.end();
    }
  });
});
