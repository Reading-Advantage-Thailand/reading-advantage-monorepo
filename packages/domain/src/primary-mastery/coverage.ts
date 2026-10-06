/**
 * The tag coverage report (track primary_objective_tags_20261006, FR-6): which objectives of the
 * key no article targets, which articles and questions carry no tag, and which glossary words have
 * no node or a node of another part of speech. `summarizeTagCoverage` is pure; the loader runs
 * the queries.
 */
import type { DB } from "@reading-advantage/db";
import {
  articles,
  longAnswerQuestions,
  multipleChoiceQuestions,
  primaryArticleObjectives,
  primaryArticleWordNodes,
  primaryBookLessons,
  primaryQuestionObjectives,
  sentencsAndWordsForFlashcards,
  shortAnswerQuestions,
} from "@reading-advantage/db/schema";
import { createTenantDB } from "../db-contract.js";
import type { ObjectiveKeyEntry } from "./contracts.js";
import { OBJECTIVE_KEY } from "./objective-key.js";

/** The rows the report reads. */
export interface TagCoverageInput {
  articles: { id: string; level: number | null }[];
  articleObjectives: { articleId: string; shortId: string; role: string }[];
  questions: { id: string; articleId: string; type: string }[];
  questionObjectives: { questionId: string; questionType: string; shortId: string }[];
  /** Glossary words with the part of speech when the stored package has it, else an empty string. */
  glossary: { articleId: string; word: string; pos: string }[];
  wordNodes: { articleId: string; word: string; pos: string; nodeId: string }[];
}

/** The report. */
export interface TagCoverageReport {
  objectivesInKey: number;
  objectivesTargeted: number;
  objectivesNotTargeted: Pick<ObjectiveKeyEntry, "shortId" | "gse" | "skill" | "text">[];
  articlesByLevel: { level: number | null; articles: number; tagged: number }[];
  articlesWithoutTags: { id: string; level: number | null }[];
  questions: { total: number; withObjectives: number; withoutObjectives: number };
  wordsWithoutNode: { articleId: string; word: string; pos: string }[];
  wordPosMismatches: { articleId: string; word: string; glossaryPos: string; nodeId: string }[];
}

const normalizeWord = (word: string): string => word.trim().toLowerCase().replace(/\s+/g, "-");

/**
 * A crude stem for the glossary-to-node join when the glossary form is inflected (`pets`, `puts on`)
 * and the export carries the node's dictionary form only.
 */
const stem = (word: string): string => normalizeWord(word).replace(/(ies|es|ed|ing|s)$/, "");

/**
 * Summarizes the tag coverage of the loaded rows.
 * @param input The rows.
 * @returns The report.
 */
export function summarizeTagCoverage(input: TagCoverageInput): TagCoverageReport {
  const targeted = new Set(input.articleObjectives.filter((row) => row.role === "target").map((row) => row.shortId));
  const objectivesNotTargeted = OBJECTIVE_KEY.filter((entry) => !targeted.has(entry.shortId)).map(({ shortId, gse, skill, text }) => ({ shortId, gse, skill, text }));

  const taggedArticles = new Set(input.articleObjectives.map((row) => row.articleId));
  const byLevel = new Map<number | null, { level: number | null; articles: number; tagged: number }>();
  for (const article of input.articles) {
    const entry = byLevel.get(article.level) ?? { level: article.level, articles: 0, tagged: 0 };
    entry.articles += 1;
    if (taggedArticles.has(article.id)) entry.tagged += 1;
    byLevel.set(article.level, entry);
  }
  const articlesByLevel = [...byLevel.values()].sort((a, b) => (a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER));
  const articlesWithoutTags = input.articles.filter((article) => !taggedArticles.has(article.id)).map(({ id, level }) => ({ id, level }));

  const questionsWithObjectives = new Set(input.questionObjectives.map((row) => `${row.questionType}:${row.questionId}`));
  const withObjectives = input.questions.filter((question) => questionsWithObjectives.has(`${question.type}:${question.id}`)).length;

  const nodesByArticleWord = new Map<string, { pos: string; nodeId: string }[]>();
  const nodesByArticleStem = new Map<string, { pos: string; nodeId: string }[]>();
  for (const node of input.wordNodes) {
    const key = `${node.articleId}:${normalizeWord(node.word)}`;
    nodesByArticleWord.set(key, [...(nodesByArticleWord.get(key) ?? []), { pos: node.pos, nodeId: node.nodeId }]);
    const stemKey = `${node.articleId}:${stem(node.word)}`;
    nodesByArticleStem.set(stemKey, [...(nodesByArticleStem.get(stemKey) ?? []), { pos: node.pos, nodeId: node.nodeId }]);
  }
  const wordsWithoutNode: TagCoverageReport["wordsWithoutNode"] = [];
  const wordPosMismatches: TagCoverageReport["wordPosMismatches"] = [];
  for (const entry of input.glossary) {
    const nodes = nodesByArticleWord.get(`${entry.articleId}:${normalizeWord(entry.word)}`) ?? nodesByArticleStem.get(`${entry.articleId}:${stem(entry.word)}`) ?? [];
    if (!nodes.length) {
      wordsWithoutNode.push({ articleId: entry.articleId, word: entry.word, pos: entry.pos });
      continue;
    }
    if (entry.pos && !nodes.some((node) => node.pos === entry.pos)) {
      for (const node of nodes) wordPosMismatches.push({ articleId: entry.articleId, word: entry.word, glossaryPos: entry.pos, nodeId: node.nodeId });
    }
  }

  return {
    objectivesInKey: OBJECTIVE_KEY.length,
    objectivesTargeted: OBJECTIVE_KEY.length - objectivesNotTargeted.length,
    objectivesNotTargeted,
    articlesByLevel,
    articlesWithoutTags,
    questions: { total: input.questions.length, withObjectives, withoutObjectives: input.questions.length - withObjectives },
    wordsWithoutNode,
    wordPosMismatches,
  };
}

/**
 * Prints the report as Markdown for the track folder.
 * @param report The report.
 * @returns Markdown text.
 */
export function tagCoverageToMarkdown(report: TagCoverageReport): string {
  const lines: string[] = ["# Primary tag coverage", ""];
  lines.push(`Objectives targeted by at least one article: ${report.objectivesTargeted} of ${report.objectivesInKey}.`);
  lines.push(`Questions with objectives: ${report.questions.withObjectives} of ${report.questions.total}.`, "");
  lines.push("## Articles by level", "", "| Level | Articles | Tagged |", "|---|---|---|");
  for (const row of report.articlesByLevel) lines.push(`| ${row.level ?? "none"} | ${row.articles} | ${row.tagged} |`);
  lines.push("", `## Objectives no article targets (${report.objectivesNotTargeted.length})`, "", "| Short id | GSE | Skill | Descriptor |", "|---|---|---|---|");
  for (const entry of report.objectivesNotTargeted) lines.push(`| ${entry.shortId} | ${entry.gse} | ${entry.skill} | ${entry.text} |`);
  lines.push("", `## Articles without tags (${report.articlesWithoutTags.length})`, "");
  for (const article of report.articlesWithoutTags) lines.push(`- ${article.id} (level ${article.level ?? "none"})`);
  lines.push("", `## Glossary words without a node (${report.wordsWithoutNode.length})`, "");
  for (const word of report.wordsWithoutNode) lines.push(`- ${word.word}${word.pos ? ` (${word.pos})` : ""} in ${word.articleId}`);
  lines.push("", `## Word nodes whose part of speech differs from the glossary (${report.wordPosMismatches.length})`, "");
  for (const row of report.wordPosMismatches) lines.push(`- ${row.word} (${row.glossaryPos}) -> ${row.nodeId} in ${row.articleId}`);
  return lines.join("\n") + "\n";
}

/**
 * Loads the rows of the report from the database (privileged CLI; the tables are global).
 * @param rawDb A direct database connection.
 * @returns The rows.
 */
export async function loadTagCoverageInput(rawDb: DB): Promise<TagCoverageInput> {
  const db = createTenantDB(rawDb, { schoolId: null }).unscoped("tag coverage report: content tables are global (EXEMPT); privileged CLI, no tenant");
  const articleRows = await db.select({ id: articles.id, level: articles.raLevel }).from(articles);
  const articleObjectives = await db.select({ articleId: primaryArticleObjectives.articleId, shortId: primaryArticleObjectives.shortId, role: primaryArticleObjectives.role }).from(primaryArticleObjectives);
  const questions: TagCoverageInput["questions"] = [];
  for (const [type, table] of [["mcq", multipleChoiceQuestions], ["saq", shortAnswerQuestions], ["laq", longAnswerQuestions]] as const) {
    const rows = await db.select({ id: table.id, articleId: table.articleId }).from(table);
    for (const row of rows) if (row.articleId) questions.push({ id: row.id, articleId: row.articleId, type });
  }
  const questionObjectives = await db.select({ questionId: primaryQuestionObjectives.questionId, questionType: primaryQuestionObjectives.questionType, shortId: primaryQuestionObjectives.shortId }).from(primaryQuestionObjectives);
  const wordNodes = await db.select({ articleId: primaryArticleWordNodes.articleId, word: primaryArticleWordNodes.word, pos: primaryArticleWordNodes.pos, nodeId: primaryArticleWordNodes.nodeId }).from(primaryArticleWordNodes);

  // Glossary words: the stored package has the part of speech; the flashcard row has the words only.
  const glossary: TagCoverageInput["glossary"] = [];
  const withPackage = new Set<string>();
  const lessons = await db.select({ articleId: primaryBookLessons.articleId, pkg: primaryBookLessons.package }).from(primaryBookLessons);
  for (const lesson of lessons) {
    if (!lesson.articleId) continue;
    const entries = ((lesson.pkg as { glossary?: { word: string; pos?: string }[] } | null)?.glossary) ?? [];
    if (!entries.length) continue;
    withPackage.add(lesson.articleId);
    for (const entry of entries) glossary.push({ articleId: lesson.articleId, word: entry.word, pos: entry.pos ?? "" });
  }
  const flashcards = await db.select({ articleId: sentencsAndWordsForFlashcards.articleId, words: sentencsAndWordsForFlashcards.words }).from(sentencsAndWordsForFlashcards);
  for (const row of flashcards) {
    if (!row.articleId || withPackage.has(row.articleId)) continue;
    const words = (row.words as { vocabulary?: string }[] | null) ?? [];
    for (const word of words) if (word.vocabulary) glossary.push({ articleId: row.articleId, word: word.vocabulary, pos: "" });
  }
  return { articles: articleRows, articleObjectives, questions, questionObjectives, glossary, wordNodes };
}
