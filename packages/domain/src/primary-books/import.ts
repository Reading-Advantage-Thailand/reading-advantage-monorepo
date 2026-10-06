import { and, eq } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  articles,
  longAnswerQuestions,
  multipleChoiceQuestions,
  primaryArticleObjectives,
  primaryArticleWordNodes,
  primaryBookLessons,
  primaryBookSeries,
  primaryBooks,
  primaryLegacyIdMap,
  primaryQuestionObjectives,
  sentencsAndWordsForFlashcards,
  shortAnswerQuestions,
} from "@reading-advantage/db/schema";
import { createTenantDB } from "../db-contract.js";
import type { ImportLessonResult } from "./contracts.js";
import { GRAPH_RELEASE } from "../primary-mastery/objective-key.js";
import { LEGACY_ARTICLE_TABLE } from "../primary-mastery/backfill.js";
import { BOOKS, hasTags, legacyArticleIdOf, splitKey, toArticleRow, toFlashcardRow, toLessonPackageJson, toQuestionRows, toTagRows, type QuestionRows } from "./mapping.js";
import type { LessonPackage } from "./package-schema.js";

/** Options of one package import. */
export interface ImportLessonPackageOptions {
  /** The database (a direct connection; the importer runs one transaction per lesson). */
  db: DB;
  pkg: LessonPackage;
  /** The package path, stored on the lesson row. */
  sourceFile: string;
  /** With true the importer decides and reports, and writes nothing. */
  dryRun?: boolean;
  /** Makes the uuid of a new article. Tests replace it. */
  newId?: () => string;
}

/**
 * Imports one Workbooks lesson package into the class book catalogue (FR-2). Idempotent on the
 * natural keys (`primary_books.key`, `primary_book_lessons.key`). Every workbook package gets its
 * catalogue rows (series, book, lesson with the approval flag). A package that names a legacy
 * article links to it through `primary_legacy_id_map` and never changes that article (Tutor
 * reads it); a package with a legacy article the map does not know is stored without an article
 * and reported. An approved package with no legacy article gets a new article, its questions,
 * and its flashcard row, all written in one transaction; a draft one waits (catalogue only). A
 * level-bank article is skipped. The objective and vocabulary link rows (FR-4 of
 * primary_objective_tags_20261006) are written with the questions; a linked legacy article gets
 * its article-level links only, since its question rows belong to Tutor and the backfill.
 * @param options The database, the package, the source path, and the dry-run switch.
 * @returns What the importer did with the lesson.
 */
export async function importLessonPackage(options: ImportLessonPackageOptions): Promise<ImportLessonResult> {
  const { pkg, sourceFile, dryRun = false } = options;
  const db = createTenantDB(options.db, { schoolId: null }).unscoped("catalogue import: the catalogue and article tables are global (EXEMPT); privileged CLI, no tenant");
  const newId = options.newId ?? (() => crypto.randomUUID());
  const { bookKey, number } = splitKey(pkg.meta.key);
  const approved = pkg.approval?.lesson?.status === "approved";
  const base = { key: pkg.meta.key, title: pkg.meta.title, bookKey, number, legacyArticleId: legacyArticleIdOf(pkg), approved, tagged: false };
  if (pkg.meta.role !== "workbook") return { ...base, action: "skipped", articleId: null, reason: `role ${pkg.meta.role}` };
  const tagged = hasTags(pkg);
  if (tagged) toTagRows(pkg, "00000000-0000-4000-8000-000000000000", null, { gse: "check", vocabulary: "check" }); // validate the short ids before any write
  if (number !== pkg.meta.number) throw new Error(`${pkg.meta.key}: meta.number ${pkg.meta.number} does not match the key`);
  const book = BOOKS[bookKey];
  if (!book) throw new Error(`${pkg.meta.key}: unknown book key "${bookKey}"`);

  // Decide the article before any write.
  let action: ImportLessonResult["action"];
  let articleId: string | null = null;
  const existing = await db.select({ articleId: primaryBookLessons.articleId }).from(primaryBookLessons).where(eq(primaryBookLessons.key, pkg.meta.key)).limit(1);
  if (existing[0]?.articleId) {
    action = base.legacyArticleId ? "linked" : "new-article";
    articleId = existing[0].articleId;
    if (!dryRun && action === "new-article") await replaceArticleContent(db, pkg, articleId, newId);
    if (!dryRun && action === "linked" && tagged) await replaceArticleLinks(db, pkg, articleId);
  } else if (base.legacyArticleId) {
    const mapped = await db
      .select({ newId: primaryLegacyIdMap.newId })
      .from(primaryLegacyIdMap)
      .where(and(eq(primaryLegacyIdMap.tableName, LEGACY_ARTICLE_TABLE), eq(primaryLegacyIdMap.legacyId, base.legacyArticleId)))
      .limit(1);
    articleId = mapped[0]?.newId ?? null;
    action = articleId ? "linked" : "unmapped";
    if (!dryRun && articleId && tagged) await replaceArticleLinks(db, pkg, articleId);
  } else if (approved) {
    action = "new-article";
    articleId = newId();
    if (!dryRun) await insertArticle(db, pkg, articleId, newId);
  } else {
    action = "catalogue-only";
  }

  if (!dryRun) await upsertCatalogue(db, pkg, { bookKey, number, articleId, sourceFile, book, approved });
  return { ...base, action, articleId, tagged: tagged && (action === "new-article" || action === "linked") };
}

/**
 * Inserts a new article with its questions and flashcard row in one transaction.
 * @param db The database.
 * @param pkg The package.
 * @param articleId The new article uuid.
 */
async function insertArticle(db: DB, pkg: LessonPackage, articleId: string, newId: () => string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(articles).values(toArticleRow(pkg, articleId));
    const rows = await insertQuestions(tx, pkg, articleId, newId);
    await insertLinks(tx, pkg, articleId, rows);
  });
}

/**
 * Updates an article this importer created earlier (a package edit after the first import) and
 * replaces its questions and flashcard row (field map rule Q-ORF-01).
 * @param db The database.
 * @param pkg The package.
 * @param articleId The article uuid.
 * @param newId Makes the question uuids.
 */
async function replaceArticleContent(db: DB, pkg: LessonPackage, articleId: string, newId: () => string): Promise<void> {
  const { id: _id, ...values } = toArticleRow(pkg, articleId);
  await db.transaction(async (tx) => {
    await tx.update(articles).set({ ...values, updatedAt: new Date() }).where(eq(articles.id, articleId));
    await tx.delete(multipleChoiceQuestions).where(eq(multipleChoiceQuestions.articleId, articleId));
    await tx.delete(shortAnswerQuestions).where(eq(shortAnswerQuestions.articleId, articleId));
    await tx.delete(longAnswerQuestions).where(eq(longAnswerQuestions.articleId, articleId));
    await tx.delete(sentencsAndWordsForFlashcards).where(eq(sentencsAndWordsForFlashcards.articleId, articleId));
    await deleteLinks(tx, articleId, true);
    const rows = await insertQuestions(tx, pkg, articleId, newId);
    await insertLinks(tx, pkg, articleId, rows);
  });
}

/**
 * Rewrites the article-level links (objectives, word nodes) of a linked legacy article. Its
 * question links are left to the backfill, which knows the legacy question ids.
 * @param db The database.
 * @param pkg The package.
 * @param articleId The mapped article uuid.
 */
async function replaceArticleLinks(db: DB, pkg: LessonPackage, articleId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await deleteLinks(tx, articleId, false);
    await insertLinks(tx, pkg, articleId, null);
  });
}

/**
 * Deletes an article's link rows before a rewrite.
 * @param tx The transaction.
 * @param articleId The article uuid.
 * @param withQuestions Also delete the question links (the importer owns them only for its own questions).
 */
async function deleteLinks(tx: Pick<DB, "delete">, articleId: string, withQuestions: boolean): Promise<void> {
  await tx.delete(primaryArticleObjectives).where(eq(primaryArticleObjectives.articleId, articleId));
  await tx.delete(primaryArticleWordNodes).where(eq(primaryArticleWordNodes.articleId, articleId));
  if (withQuestions) await tx.delete(primaryQuestionObjectives).where(eq(primaryQuestionObjectives.articleId, articleId));
}

/**
 * Inserts the link rows of an article; nothing when the package has no tags.
 * @param tx The transaction.
 * @param pkg The package.
 * @param articleId The article uuid.
 * @param rows The question rows written in this transaction, or null for a linked legacy article.
 */
async function insertLinks(tx: Pick<DB, "insert">, pkg: LessonPackage, articleId: string, rows: QuestionRows | null): Promise<void> {
  if (!hasTags(pkg)) return;
  const links = toTagRows(pkg, articleId, rows, { gse: GRAPH_RELEASE.gse.commit, vocabulary: GRAPH_RELEASE.vocabulary.commit });
  if (links.articleObjectives.length) await tx.insert(primaryArticleObjectives).values(links.articleObjectives);
  if (links.questionObjectives.length) await tx.insert(primaryQuestionObjectives).values(links.questionObjectives);
  if (links.wordNodes.length) await tx.insert(primaryArticleWordNodes).values(links.wordNodes);
}

/**
 * Inserts the question bank and the flashcard row of an article.
 * @param tx The transaction.
 * @param pkg The package.
 * @param articleId The article uuid.
 * @param newId Makes the question uuids.
 * @returns The question rows, with their ids.
 */
async function insertQuestions(tx: Pick<DB, "insert">, pkg: LessonPackage, articleId: string, newId: () => string): Promise<QuestionRows> {
  const rows = toQuestionRows(pkg, articleId, newId);
  if (rows.mcq.length) await tx.insert(multipleChoiceQuestions).values(rows.mcq);
  if (rows.saq.length) await tx.insert(shortAnswerQuestions).values(rows.saq);
  if (rows.laq.length) await tx.insert(longAnswerQuestions).values(rows.laq);
  await tx.insert(sentencsAndWordsForFlashcards).values(toFlashcardRow(pkg, articleId));
  return rows;
}

/**
 * Upserts the series, the book, and the lesson rows.
 * @param db The database.
 * @param pkg The package.
 * @param lesson The decided article id, the book, and the source path.
 */
async function upsertCatalogue(
  db: DB,
  pkg: LessonPackage,
  lesson: { bookKey: string; number: number; articleId: string | null; sourceFile: string; book: (typeof BOOKS)[string]; approved: boolean },
): Promise<void> {
  await db.transaction(async (tx) => {
    const [series] = await tx
      .insert(primaryBookSeries)
      .values({ key: lesson.book.seriesKey, name: lesson.book.seriesName })
      .onConflictDoUpdate({ target: primaryBookSeries.key, set: { name: lesson.book.seriesName } })
      .returning({ id: primaryBookSeries.id });
    const [book] = await tx
      .insert(primaryBooks)
      .values({ seriesId: series.id, key: lesson.bookKey, name: lesson.book.name, raLevel: pkg.meta.raLevel, cefrLevel: pkg.meta.cefrLevel })
      .onConflictDoUpdate({ target: primaryBooks.key, set: { name: lesson.book.name, updatedAt: new Date() } })
      .returning({ id: primaryBooks.id });
    const values = {
      bookId: book.id,
      number: lesson.number,
      key: pkg.meta.key,
      title: pkg.meta.title,
      articleId: lesson.articleId,
      legacyArticleId: legacyArticleIdOf(pkg),
      sourceFile: lesson.sourceFile,
      approved: lesson.approved,
      package: toLessonPackageJson(pkg),
      importedAt: new Date(),
    };
    await tx.insert(primaryBookLessons).values(values).onConflictDoUpdate({ target: primaryBookLessons.key, set: values });
  });
}
