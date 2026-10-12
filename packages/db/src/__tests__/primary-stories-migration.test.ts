import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { sentinelProbes } from "../sentinels.js";

const drizzle = join(__dirname, "../../drizzle");
const TAG = "0072_primary_stories";

describe("migration 0072_primary_stories", () => {
  it("is in the journal with the agreed index and time", () => {
    const journal = JSON.parse(readFileSync(join(drizzle, "meta/_journal.json"), "utf8")) as { entries: Array<{ idx: number; when: number; tag: string }> };
    const entry = journal.entries.find((e) => e.tag === TAG);
    expect(entry).toMatchObject({ idx: 72, when: 1791800000000 });
  });

  it("has a sentinel for every new column", () => {
    const sentinel = sentinelProbes[TAG];
    expect(sentinel).toBeDefined();
    const targets = JSON.stringify(sentinel);
    for (const column of ["stories.image", "chapters.image", "sentencs_and_words_for_flashcard.chapter_id"]) expect(targets).toContain(column);
  });

  it("adds the columns, relaxes article_id, and keeps exactly one owner", async () => {
    const sql = readFileSync(join(drizzle, `${TAG}.sql`), "utf8");
    expect(sql).not.toMatch(/DROP\s+(COLUMN|TABLE|VIEW)|ALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE|CASCADE/i);
    const db = new PGlite();
    try {
      await db.exec(`create table articles (id uuid primary key);
        create table stories (id uuid primary key);
        create table chapters (id uuid primary key);
        create table sentencs_and_words_for_flashcard (id uuid primary key default gen_random_uuid(), article_id uuid not null references articles(id));
        insert into articles values ('00000000-0000-4000-8000-000000000001');
        insert into sentencs_and_words_for_flashcard (article_id) values ('00000000-0000-4000-8000-000000000001');`);
      await db.exec(sql.replaceAll("--> statement-breakpoint", ""));
      await db.exec(`insert into sentencs_and_words_for_flashcard (chapter_id) values ('c1');
        insert into stories (id, image) values ('00000000-0000-4000-8000-000000000002', 'x');`);
      await expect(db.exec(`insert into sentencs_and_words_for_flashcard (article_id, chapter_id) values ('00000000-0000-4000-8000-000000000001', 'c2')`)).rejects.toThrow();
      await expect(db.exec(`insert into sentencs_and_words_for_flashcard default values`)).rejects.toThrow();
    } finally {
      await db.close();
    }
  }, 30_000);
});
