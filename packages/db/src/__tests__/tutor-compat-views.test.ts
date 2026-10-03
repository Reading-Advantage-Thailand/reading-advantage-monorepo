/**
 * FR-2 (primary_legacy_data_migration_20261004): `tutor_compat` views.
 * Tutor reads four legacy tables by name. The views must expose every column
 * that Tutor selects or filters on, and nothing destructive may ship.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const journal = JSON.parse(readFileSync(resolve(ROOT, "drizzle/meta/_journal.json"), "utf8")) as {
  entries: { tag: string }[];
};
const tag = journal.entries.find((e) => e.tag.endsWith("_tutor_compat_views"))?.tag;
const SQL = tag ? readFileSync(resolve(ROOT, `drizzle/${tag}.sql`), "utf8") : "";

/**
 * Verbatim copy of Tutor's four queries.
 * Source: ~/Desktop/tutor-advantage/services/learning-service/src/services/PrimaryAdvantageDB.ts
 * lines 91-97 (article), 100-104 (MCQ), 105-109 (SAQ), 110-118 (flashcard).
 */
const TUTOR_QUERIES: Record<string, string> = {
  article: `SELECT id, title, summary, passage, cefr_level, ra_level, words, sentences,
              translated_passage, translated_summary, audio_url, audio_word_url, genre, type
         FROM article
        WHERE id = $1 AND is_published = true`,
  multiple_choice_questions: `SELECT id, question, options, answer
           FROM multiple_choice_questions
          WHERE article_id = $1`,
  short_answer_questions: `SELECT id, question, answer
           FROM short_answer_questions
          WHERE article_id = $1`,
  sentencs_and_words_for_flashcard: `SELECT sentence, audio_sentences_url, words, words_url
           FROM sentencs_and_words_for_flashcard
          WHERE article_id = $1
          LIMIT 1`,
};

/** Returns the columns a Tutor query selects and filters on. */
function tutorColumns(query: string): string[] {
  const select = query.match(/SELECT([\s\S]*?)\bFROM\b/)![1]!.split(",").map((c) => c.trim());
  const where = [...query.matchAll(/\b(\w+)\s*=\s*(?:\$1|true)/g)].map((m) => m[1]!);
  return [...new Set([...select, ...where])].sort();
}

/** Returns the SQL of one `CREATE VIEW tutor_compat.<name>` statement. */
function viewSql(name: string): string {
  const m = SQL.match(new RegExp(`CREATE VIEW "?tutor_compat"?\\."?${name}"? AS([\\s\\S]*?)(?:--> statement-breakpoint|$)`));
  return m?.[1] ?? "";
}

describe("tutor_compat views migration", () => {
  it("exists as a journaled migration", () => {
    expect(tag).toBeDefined();
    expect(SQL).toContain("CREATE SCHEMA");
    expect(SQL).toMatch(/tutor_compat/);
  });

  it("is additive: no DROP TABLE/COLUMN/SCHEMA and no ALTER TABLE", () => {
    expect(SQL).not.toMatch(/\bDROP\s+(TABLE|COLUMN|SCHEMA)\b/i);
    expect(SQL).not.toMatch(/\bALTER\s+TABLE\b/i);
  });

  for (const [name, query] of Object.entries(TUTOR_QUERIES)) {
    describe(`view ${name}`, () => {
      const sql = viewSql(name);
      it("is defined", () => expect(sql).not.toBe(""));
      it("exposes exactly the columns Tutor selects and filters on", () => {
        const aliases = [...sql.matchAll(/\bAS\s+"?(\w+)"?\s*(?:,|\n|$)/g)].map((m) => m[1]!).sort();
        expect(aliases).toEqual(tutorColumns(query));
      });
    });
  }

  it("shows legacy ids as text through the id map", () => {
    for (const name of ["article", "multiple_choice_questions", "short_answer_questions", "sentencs_and_words_for_flashcard"]) {
      expect(viewSql(name)).toMatch(/LEFT JOIN (public\.)?primary_legacy_id_map/);
    }
    expect(viewSql("article")).toMatch(/coalesce\(m\.legacy_id, a\.id::text\) AS id/);
  });

  it("keeps Tutor's is_published filter column", () => {
    expect(viewSql("article")).toMatch(/is_published\s+AS is_published|a\.is_published AS is_published/);
  });
});
