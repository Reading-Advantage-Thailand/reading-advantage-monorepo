import { describe, expect, it } from "vitest";
import { backfillPrimaryTags, type TagBackfillPort } from "../backfill.js";
import { parseTagsExport } from "../objective-key.js";
import { sampleTagsExport } from "./fixtures.js";

const ART = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BANK_ART = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const Q1 = "11111111-1111-4111-8111-111111111111";
const S1 = "22222222-2222-4222-8222-222222222222";
const L1 = "33333333-3333-4333-8333-333333333333";

/** An in-memory port that records every write and answers from the given maps. */
function portWith(data: {
  legacyArticles?: Record<string, string>;
  lessons?: Record<string, { articleId: string | null; bank: { mcq: { id: string; question: string }[]; saq: { id: string; question: string }[]; laq: { id: string; question: string }[] } }>;
  legacyQuestions?: Record<string, string>;
  questions?: Record<string, { id: string; question: string }[]>;
}) {
  const writes: { kind: string; payload: unknown }[] = [];
  const port: TagBackfillPort = {
    articleIdByLegacy: async (legacyId) => data.legacyArticles?.[legacyId] ?? null,
    lessonByKey: async (key) => data.lessons?.[key] ?? null,
    questionIdsByLegacy: async (_type, legacyIds) => new Map(legacyIds.filter((id) => data.legacyQuestions?.[id]).map((id) => [id, data.legacyQuestions![id]])),
    questionsOfArticle: async (articleId, type) => data.questions?.[`${articleId}:${type}`] ?? [],
    replaceArticleLinks: async (articleId, rows) => { writes.push({ kind: "article", payload: { articleId, rows } }); },
    replaceQuestionLinks: async (questionIds, rows) => { writes.push({ kind: "question", payload: { questionIds, rows } }); },
  };
  return { port, writes };
}

describe("backfillPrimaryTags (FR-5)", () => {
  it("writes the links of a package whose legacy ids are mapped and reports nothing unmatched", async () => {
    const { port, writes } = portWith({ legacyArticles: { cmlegacyart: ART }, legacyQuestions: { cmlegacyq1: Q1, cmlegacys1: S1 } });
    const parsed = parseTagsExport(sampleTagsExport());
    const report = await backfillPrimaryTags({ port, export: { ...parsed, packages: [parsed.packages[0]] } });
    expect(report).toMatchObject({ packages: 1, articlesMatched: 1, articlesNotFound: [], questionsMatched: 2, questionsNotMatched: [] });
    expect(report.rowsWritten).toEqual({ articleObjectives: 2, questionObjectives: 3, wordNodes: 2 });
    const article = writes.find((write) => write.kind === "article")?.payload as { articleId: string; rows: { articleObjectives: unknown[]; wordNodes: { word: string; nodeId: string; graphRelease: string }[] } };
    expect(article.articleId).toBe(ART);
    expect(article.rows.articleObjectives).toEqual([
      expect.objectContaining({ articleId: ART, shortId: "R12.1", role: "target", graphRelease: "7344a27" }),
      expect.objectContaining({ articleId: ART, shortId: "L19.2", role: "supporting" }),
    ]);
    expect(article.rows.wordNodes.map((row) => [row.word, row.nodeId, row.graphRelease])).toEqual([["puppy", "english.vocabulary.skill.puppy.noun", "2daf568"], ["run", "english.vocabulary.skill.run.verb", "2daf568"]]);
    const question = writes.find((write) => write.kind === "question")?.payload as { questionIds: string[]; rows: { questionId: string; questionType: string; shortId: string }[] };
    expect(question.questionIds).toEqual([Q1, S1]);
    expect(question.rows).toEqual([
      expect.objectContaining({ questionId: Q1, questionType: "mcq", shortId: "L19.2" }),
      expect.objectContaining({ questionId: S1, questionType: "saq", shortId: "R12.1" }),
      expect.objectContaining({ questionId: S1, questionType: "saq", shortId: "R10.2" }),
    ]);
  });

  it("reports an article it cannot find by key and writes nothing for it", async () => {
    const { port, writes } = portWith({ legacyArticles: { cmlegacyart: ART } });
    const parsed = parseTagsExport(sampleTagsExport());
    const report = await backfillPrimaryTags({ port, export: parsed });
    expect(report.articlesNotFound).toEqual([{ key: "bank-1/1", legacyArticleId: null }]);
    expect(report.articlesMatched).toBe(1);
    expect(writes.filter((write) => (write.payload as { articleId?: string }).articleId === BANK_ART)).toEqual([]);
  });

  it("finds the article and the questions of an imported package by key and question text when the id map has none", async () => {
    const { port, writes } = portWith({
      lessons: { "bank-1/1": { articleId: BANK_ART, bank: { mcq: [{ id: "p1", question: "What is in the box?" }], saq: [], laq: [] } } },
      questions: { [`${BANK_ART}:mcq`]: [{ id: Q1, question: "What is in the box?" }, { id: L1, question: "Who has a box?" }] },
    });
    const parsed = parseTagsExport(sampleTagsExport());
    const report = await backfillPrimaryTags({ port, export: { ...parsed, packages: [parsed.packages[1]] } });
    expect(report).toMatchObject({ articlesMatched: 1, questionsMatched: 1, questionsNotMatched: [] });
    const question = writes.find((write) => write.kind === "question")?.payload as { questionIds: string[] };
    expect(question.questionIds).toEqual([Q1]);
  });

  it("writes nothing in a dry run and still reports the matches", async () => {
    const { port, writes } = portWith({ legacyArticles: { cmlegacyart: ART }, legacyQuestions: { cmlegacyq1: Q1, cmlegacys1: S1 } });
    const parsed = parseTagsExport(sampleTagsExport());
    const report = await backfillPrimaryTags({ port, export: { ...parsed, packages: [parsed.packages[0]] }, dryRun: true });
    expect(report).toMatchObject({ dryRun: true, articlesMatched: 1, questionsMatched: 2 });
    expect(writes).toEqual([]);
  });

  it("replaces, never appends: a second run issues the same replace calls", async () => {
    const { port, writes } = portWith({ legacyArticles: { cmlegacyart: ART }, legacyQuestions: { cmlegacyq1: Q1, cmlegacys1: S1 } });
    const parsed = parseTagsExport(sampleTagsExport());
    const one = { ...parsed, packages: [parsed.packages[0]] };
    await backfillPrimaryTags({ port, export: one });
    await backfillPrimaryTags({ port, export: one });
    expect(writes.map((write) => write.kind)).toEqual(["article", "question", "article", "question"]);
  });
});
