/**
 * Read functions of the objective tags (track primary_objective_tags_20261006, FR-7): the only
 * read path the evidence pipeline (T2) uses. The link tables are global content (EXEMPT), so a
 * tenant database reads them as is.
 */
import { eq, inArray } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { primaryArticleObjectives, primaryArticleWordNodes, primaryQuestionObjectives } from "@reading-advantage/db/schema";
import { createTenantDB } from "../db-contract.js";

const UNSCOPED_REASON = "objective tags are global content (EXEMPT): articles, questions, and their graph links are shared by every school";

/** The raw database for the global link tables. */
const contentDb = (db: DB): DB => createTenantDB(db, { schoolId: null }).unscoped(UNSCOPED_REASON);

/** An objective of an article. */
export interface ArticleObjective {
  shortId: string;
  nodeId: string;
  role: string;
}

/** An objective of a question. */
export interface QuestionObjective {
  questionType: string;
  shortId: string;
  nodeId: string;
}

/** A vocabulary node of an article. */
export interface ArticleWordNode {
  word: string;
  pos: string;
  nodeId: string;
  role: string;
}

/**
 * The target and supporting objectives of an article.
 * @param params The database and the article uuid.
 * @returns The objectives with their nodes and roles; empty for an untagged article.
 */
export async function getArticleObjectives(params: { db: DB; articleId: string }): Promise<ArticleObjective[]> {
  return contentDb(params.db).select({ shortId: primaryArticleObjectives.shortId, nodeId: primaryArticleObjectives.nodeId, role: primaryArticleObjectives.role }).from(primaryArticleObjectives).where(eq(primaryArticleObjectives.articleId, params.articleId));
}

/**
 * The objectives of several questions, grouped by question id.
 * @param params The database and the question uuids.
 * @returns A map from question id to its objectives; an unlisted question has none.
 */
export async function getQuestionObjectives(params: { db: DB; questionIds: string[] }): Promise<Map<string, QuestionObjective[]>> {
  const byQuestion = new Map<string, QuestionObjective[]>();
  if (!params.questionIds.length) return byQuestion;
  const rows = await contentDb(params.db).select({ questionId: primaryQuestionObjectives.questionId, questionType: primaryQuestionObjectives.questionType, shortId: primaryQuestionObjectives.shortId, nodeId: primaryQuestionObjectives.nodeId }).from(primaryQuestionObjectives).where(inArray(primaryQuestionObjectives.questionId, params.questionIds));
  for (const row of rows) {
    const list = byQuestion.get(row.questionId) ?? [];
    list.push({ questionType: row.questionType, shortId: row.shortId, nodeId: row.nodeId });
    byQuestion.set(row.questionId, list);
  }
  return byQuestion;
}

/**
 * The vocabulary nodes of an article's glossary.
 * @param params The database and the article uuid.
 * @returns The word nodes; empty for an untagged article.
 */
export async function getArticleWordNodes(params: { db: DB; articleId: string }): Promise<ArticleWordNode[]> {
  return contentDb(params.db).select({ word: primaryArticleWordNodes.word, pos: primaryArticleWordNodes.pos, nodeId: primaryArticleWordNodes.nodeId, role: primaryArticleWordNodes.role }).from(primaryArticleWordNodes).where(eq(primaryArticleWordNodes.articleId, params.articleId));
}
