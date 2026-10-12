// @vitest-environment node
/** FR-11 (STU-16): `getArticleById` returns only the activity logs of the given user. Real SQL (PGlite). */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./helpers/testDb";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy(
    {},
    {
      get(_t, prop) {
        const real = (globalThis as Record<string, unknown>).__TEST_DB__ as Record<string | symbol, unknown> | undefined;
        if (!real) throw new Error("Test DB not initialized");
        const v = real[prop];
        return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
      },
    },
  );
  return { ...actual, db: dbProxy };
});

import { getArticleById } from "../articleModel";

const ARTICLE = "00000000-0000-4000-8000-0000000000a1";
let h: TestDb;

async function seed() {
  await h.db.execute(sql`INSERT INTO schools (id, name) VALUES ('00000000-0000-4000-8000-0000000000f1', 'S')`);
  for (const id of ["u1", "u2"]) {
    await h.db.execute(sql`INSERT INTO users (id, username, display_username, name, role) VALUES (${id}, ${id}, ${id}, ${id}, 'STUDENT')`);
  }
  await h.db.execute(sql`INSERT INTO articles (id, title, content) VALUES (${ARTICLE}, 'T', 'C')`);
  await h.db.execute(sql`INSERT INTO article_activity_logs (article_id, user_id, is_sentence_and_words_saved)
    VALUES (${ARTICLE}, 'u1', true), (${ARTICLE}, 'u2', false)`);
}

describe("getArticleById logs (PGlite)", () => {
  beforeAll(async () => {
    h = await createTestDb();
    // The shared harness has no snapshot table; articles TRUNCATE ... CASCADE clears it.
    await h.db.execute(sql`CREATE TABLE IF NOT EXISTS sentencs_and_words_for_flashcard (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      sentence jsonb, audio_sentences_url text, words jsonb, words_url text,
      created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now())`);
  }, 60_000);
  afterAll(async () => {
    await h.close();
  });
  afterEach(async () => {
    await h.reset();
  });

  it("returns only the logs of the given user", async () => {
    await seed();
    const { article } = await getArticleById(ARTICLE, "u2");
    expect(article.articleActivityLog.map((l: { userId: string }) => l.userId)).toEqual(["u2"]);
  });

  it("returns no log without a user", async () => {
    await seed();
    const { article } = await getArticleById(ARTICLE);
    expect(article.articleActivityLog).toEqual([]);
  });
});
