#!/usr/bin/env tsx
/**
 * Tutor read test (Lane A FR-5). Runs Tutor's five reads on a target database
 * (read through schema tutor_compat) and a reference (legacy) database.
 *
 * Usage:
 *   tsx scripts/tutor-read-check.ts --target <url> --reference <url> [--article-ids <file> | --sample N]
 * The target search_path is set to tutor_compat. The reference uses its default schema.
 * Exit: 0 match, 1 difference, 2 connection or config error.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { buildPostgresOptions, normalizePostgresConnectionString } from "../src/connection-options.js";
import { diffColumnShapes, diffRows, type ColumnShape, type Difference } from "../src/tutor-read-compare.js";
import { TUTOR_READ_QUERIES } from "../src/tutor-read-queries.js";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

type Sql = ReturnType<typeof postgres>;

function connect(url: string, searchPath?: string): Sql {
  const normalized = normalizePostgresConnectionString(url);
  return postgres(normalized, {
    ...buildPostgresOptions(url),
    max: 1,
    ...(searchPath ? { connection: { search_path: searchPath } } : {}),
  });
}

/**
 * Describes the result columns of a query without reading any row.
 * @param sql Open connection.
 * @param query Verbatim Tutor SQL with at most one $1 placeholder.
 * @param takesParam Whether the query uses $1.
 * @returns Column names and Postgres type names.
 */
export async function describeColumns(sql: Sql, query: string, takesParam: boolean): Promise<ColumnShape[]> {
  const res = await sql.unsafe(`SELECT * FROM (${query}) q LIMIT 0`, takesParam ? ["probe"] : []);
  const oids = [...new Set(res.columns.map((c) => c.type))];
  const types = await sql.unsafe<{ oid: number; typname: string }[]>(
    "SELECT oid::int AS oid, typname FROM pg_type WHERE oid = ANY($1::oid[])",
    [oids as never],
  );
  const names = new Map(types.map((t) => [t.oid, t.typname]));
  return res.columns.map((c) => ({ name: c.name, type: names.get(c.type) ?? `oid:${c.type}` }));
}

async function pickArticleIds(ref: Sql): Promise<string[]> {
  const ids = flag("--article-ids");
  if (ids) return readFileSync(ids, "utf8").split(/\s+/).filter(Boolean);
  const n = Number(flag("--sample"));
  const rows = await ref.unsafe<{ id: string }[]>(
    "SELECT id FROM article WHERE is_published = true ORDER BY id LIMIT $1",
    [n as never],
  );
  return rows.map((r) => r.id);
}

async function main(): Promise<number> {
  const targetUrl = flag("--target");
  const referenceUrl = flag("--reference");
  if (!targetUrl || !referenceUrl) {
    console.error("Missing --target or --reference.");
    return 2;
  }
  const target = connect(targetUrl, "tutor_compat");
  const ref = connect(referenceUrl);
  const failures: Difference[] = [];
  try {
    console.log("Shape check (column: reference type -> target type)");
    for (const q of TUTOR_READ_QUERIES) {
      const [r, t] = await Promise.all([
        describeColumns(ref, q.sql, q.takesArticleId),
        describeColumns(target, q.sql, q.takesArticleId),
      ]);
      const d = diffColumnShapes(r, t);
      console.log(`  ${d.length ? "FAIL" : "PASS"}  ${q.name}  (${r.length} ref cols, ${t.length} target cols)`);
      for (const x of d) console.log(`        ${x.kind}: ${x.detail}`);
      failures.push(...d);
    }
    if (flag("--article-ids") || flag("--sample")) {
      const articleIds = await pickArticleIds(ref);
      console.log(`Row check (${articleIds.length} article ids)`);
      for (const q of TUTOR_READ_QUERIES.filter((x) => x.takesArticleId)) {
        let diffs = 0;
        for (const id of articleIds) {
          const [r, t] = await Promise.all([ref.unsafe(q.sql, [id]), target.unsafe(q.sql, [id])]);
          const d = diffRows(r as never, t as never);
          diffs += d.length;
          for (const x of d) console.log(`        ${q.name} [${id}]: ${x.kind} ${x.detail}`);
          failures.push(...d);
        }
        console.log(`  ${diffs ? "FAIL" : "PASS"}  ${q.name}  (${diffs} differences)`);
      }
    }
  } catch (error) {
    console.error(`Connection or query error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  } finally {
    await Promise.allSettled([target.end(), ref.end()]);
  }
  console.log(failures.length ? `RESULT: FAIL (${failures.length} differences)` : "RESULT: MATCH");
  return failures.length ? 1 : 0;
}

main().then((code) => process.exit(code));
