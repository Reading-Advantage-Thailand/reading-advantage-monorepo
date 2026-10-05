// @vitest-environment node
/**
 * Audit S2: the article page must render when an article has no questions. The question
 * loader returns an EMPTY state for a missing question type; it does not throw.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./helpers/testDb";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy(
    {},
    {
      get(_target, property) {
        const real = (globalThis as Record<string, unknown>).__TEST_DB__ as Record<string | symbol, unknown> | undefined;
        if (!real) throw new Error("Test DB not initialized");
        const value = real[property];
        return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(real) : value;
      },
    },
  );
  return { ...actual, db: dbProxy };
});
vi.mock("../../utils/generators/image-generator", () => ({ generateImage: vi.fn() }));
vi.mock("../../utils/generators/audio-word-generator", () => ({ generateWordLists: vi.fn() }));
vi.mock("@/lib/session", () => ({ currentUser: async () => ({ id: "s1", role: "STUDENT" }) }));

import { getQuestionsByArticleId } from "../articleModel";
import { ActivityType, QuestionState } from "@/types/enum";

const ARTICLE_ID = "00000000-0000-0000-0000-0000000000e1";
let harness: TestDb;

describe("getQuestionsByArticleId", () => {
  beforeAll(async () => {
    harness = await createTestDb();
  }, 60_000);
  afterAll(async () => {
    await harness.close();
  });
  afterEach(async () => {
    await harness.reset();
  });

  /** Seeds the student and an article with no questions. */
  async function seedArticle() {
    await harness.db.execute(sql`INSERT INTO users (id, username, display_username, name, email, role, created_at)
      VALUES ('s1','s1','s1','Ann','s1@x.com','STUDENT', now())`);
    await harness.db.execute(sql`INSERT INTO articles (id, title, content, passage)
      VALUES (${ARTICLE_ID}, 'The Moon', 'Text', 'Text')`);
  }

  it.each([ActivityType.MC_QUESTION, ActivityType.SA_QUESTION, ActivityType.LA_QUESTION])(
    "returns the EMPTY state, not an error, when the article has no %s questions",
    async (type) => {
      await seedArticle();
      const result = await getQuestionsByArticleId(ARTICLE_ID, type);
      expect(result.questionStatus).toBe(QuestionState.EMPTY);
      expect(result.questions).toEqual([]);
    },
  );

  it("returns the questions as INCOMPLETE when the article has them", async () => {
    await seedArticle();
    await harness.db.execute(sql`INSERT INTO multiple_choice_questions (article_id, question, options, correct_answer)
      VALUES (${ARTICLE_ID}, 'Where is the moon?', '["Sky","Sea"]'::jsonb, 0),
             (${ARTICLE_ID}, 'What color is it?', '["White","Red"]'::jsonb, 0)`);
    const result = await getQuestionsByArticleId(ARTICLE_ID, ActivityType.MC_QUESTION);
    expect(result.questionStatus).toBe(QuestionState.INCOMPLETE);
    expect(result.questions).toHaveLength(2);
  });
});
