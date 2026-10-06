import { and, eq } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import {
  articles,
  longAnswerQuestions,
  multipleChoiceQuestions,
  primaryBookLessons,
  primaryBookSeries,
  primaryBooks,
  primaryLegacyIdMap,
  sentencsAndWordsForFlashcards,
  shortAnswerQuestions,
} from "@reading-advantage/db/schema";
import { createTenantDB } from "../db-contract.js";
import type { ImportLessonResult } from "./contracts.js";
import { BOOKS, legacyArticleIdOf, splitKey, toArticleRow, toFlashcardRow, toLessonPackageJson, toQuestionRows } from "./mapping.js";
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
 * level-bank article is skipped.
 * @param options The database, the package, the source path, and the dry-run switch.
 * @returns What the importer did with the lesson.
 */
export async function importLessonPackage(options: ImportLessonPackageOptions): Promise<ImportLessonResult> {
  const { pkg, sourceFile, dryRun = false } = options;
  const db = createTenantDB(options.db, { schoolId: null }).unscoped("catalogue import: the catalogue and article tables are global (EXEMPT); privileged CLI, no tenant");
  const newId = options.newId ?? (() => crypto.randomUUID());
  const { bookKey, number } = splitKey(pkg.meta.key);
  const approved = pkg.approval?.lesson?.status === "approved";
  const base = { key: pkg.meta.key, title: pkg.meta.title, bookKey, number, legacyArticleId: legacyArticleIdOf(pkg), approved };
  if (pkg.meta.role !== "workbook") return { ...base, action: "skipped", articleId: null, reason: `role ${pkg.meta.role}` };
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
    if (!dryRun && action === "new-article") await replaceArticleContent(db, pkg, articleId);
  } else if (base.legacyArticleId) {
    const mapped = await db
      .select({ newId: primaryLegacyIdMap.newId })
      .from(primaryLegacyIdMap)
      .where(and(eq(primaryLegacyIdMap.tableName, "articles"), eq(primaryLegacyIdMap.legacyId, base.legacyArticleId)))
      .limit(1);
    articleId = mapped[0]?.newId ?? null;
    action = articleId ? "linked" : "unmapped";
  } else if (approved) {
    action = "new-article";
    articleId = newId();
    if (!dryRun) await insertArticle(db, pkg, articleId);
  } else {
    action = "catalogue-only";
  }

  if (!dryRun) await upsertCatalogue(db, pkg, { bookKey, number, articleId, sourceFile, book, approved });
  return { ...base, action, articleId };
}

/**
 * Inserts a new article with its questions and flashcard row in one transaction.
 * @param db The database.
 * @param pkg The package.
 * @param articleId The new article uuid.
 */
async function insertArticle(db: DB, pkg: LessonPackage, articleId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(articles).values(toArticleRow(pkg, articleId));
    await insertQuestions(tx, pkg, articleId);
  });
}

/**
 * Updates an article this importer created earlier (a package edit after the first import) and
 * replaces its questions and flashcard row (field map rule Q-ORF-01).
 * @param db The database.
 * @param pkg The package.
 * @param articleId The article uuid.
 */
async function replaceArticleContent(db: DB, pkg: LessonPackage, articleId: string): Promise<void> {
  const { id: _id, ...values } = toArticleRow(pkg, articleId);
  await db.transaction(async (tx) => {
    await tx.update(articles).set({ ...values, updatedAt: new Date() }).where(eq(articles.id, articleId));
    await tx.delete(multipleChoiceQuestions).where(eq(multipleChoiceQuestions.articleId, articleId));
    await tx.delete(shortAnswerQuestions).where(eq(shortAnswerQuestions.articleId, articleId));
    await tx.delete(longAnswerQuestions).where(eq(longAnswerQuestions.articleId, articleId));
    await tx.delete(sentencsAndWordsForFlashcards).where(eq(sentencsAndWordsForFlashcards.articleId, articleId));
    await insertQuestions(tx, pkg, articleId);
  });
}

/**
 * Inserts the question bank and the flashcard row of an article.
 * @param tx The transaction.
 * @param pkg The package.
 * @param articleId The article uuid.
 */
async function insertQuestions(tx: Pick<DB, "insert">, pkg: LessonPackage, articleId: string): Promise<void> {
  const rows = toQuestionRows(pkg, articleId);
  if (rows.mcq.length) await tx.insert(multipleChoiceQuestions).values(rows.mcq);
  if (rows.saq.length) await tx.insert(shortAnswerQuestions).values(rows.saq);
  if (rows.laq.length) await tx.insert(longAnswerQuestions).values(rows.laq);
  await tx.insert(sentencsAndWordsForFlashcards).values(toFlashcardRow(pkg, articleId));
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
