#!/usr/bin/env tsx
/**
 * Checks that every printed legacy article id opens a migrated article (spec D3, FR-4): each
 * Workbooks package with `db.legacy.articleId` must map through `primary_legacy_id_map` to an
 * article of the target. Read only.
 *
 *   DIRECT_DATABASE_URL=postgres://... pnpm --filter @reading-advantage/db legacy-links-check <book dir>...
 *
 * Example book dirs: `~/Desktop/Workbooks/content/primary/origins-2` and `.../origins-3.1`.
 * Exits 1 when an id has no article.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import postgres from "postgres";

const dirs = process.argv.slice(2);
const url = process.env.DIRECT_DATABASE_URL;
if (!url || dirs.length === 0) {
  console.error("Set DIRECT_DATABASE_URL and name at least one Workbooks book directory.");
  process.exit(2);
}

const printed = dirs.flatMap((dir) => readdirSync(dir).filter((f) => f.endsWith(".json")).flatMap((f) => {
  const pkg = JSON.parse(readFileSync(join(dir, f), "utf8")) as { db?: { legacy?: { articleId?: string } } };
  const legacyId = pkg.db?.legacy?.articleId;
  return legacyId ? [{ lesson: `${basename(dir)}/${f}`, legacyId }] : [];
}));

const sql = postgres(url, { max: 1, connection: { default_transaction_read_only: "on" } });
try {
  const rows = await sql<{ legacy_id: string; new_id: string; title: string | null; is_published: boolean | null }[]>`
    select m.legacy_id, m.new_id::text, a.title, a.is_published
    from primary_legacy_id_map m left join articles a on a.id = m.new_id
    where m.table_name = 'article' and m.legacy_id in ${sql(printed.map((p) => p.legacyId))}`;
  const byId = new Map(rows.map((r) => [r.legacy_id, r]));
  let missing = 0;
  for (const { lesson, legacyId } of printed) {
    const row = byId.get(legacyId);
    const ok = Boolean(row?.title);
    if (!ok) missing += 1;
    console.log([ok ? "OK  " : "MISS", lesson, legacyId, row?.new_id ?? "-", row?.is_published ? "published" : "not published", row?.title ?? ""].join("\t"));
  }
  console.log(`${printed.length - missing} of ${printed.length} printed ids open a migrated article.`);
  process.exitCode = missing ? 1 : 0;
} finally {
  await sql.end();
}
