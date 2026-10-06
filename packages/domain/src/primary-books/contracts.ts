import { z } from "zod";

/** What the importer did with one lesson package. */
export const importLessonResultSchema = z.object({
  key: z.string(),
  title: z.string(),
  bookKey: z.string(),
  number: z.number().int(),
  /**
   * `new-article`: the article, its questions, and its flashcard row were inserted (approved package, no legacy article).
   * `linked`: the lesson points at the mapped legacy article (Tutor-read; not touched).
   * `unmapped`: the package names a legacy article that `primary_legacy_id_map` does not know yet; the lesson is stored without an article.
   * `catalogue-only`: a draft package with no legacy article; the lesson is stored without an article until the review approves it.
   * `skipped`: the package is not a workbook lesson (a level-bank article).
   */
  action: z.enum(["new-article", "linked", "unmapped", "catalogue-only", "skipped"]),
  /** True when the Workbooks review approved the lesson. */
  approved: z.boolean(),
  articleId: z.string().nullable(),
  legacyArticleId: z.string().nullable(),
  /** True when the objective and vocabulary link rows were (or, in a dry run, would be) written. */
  tagged: z.boolean(),
  reason: z.string().optional(),
});
export type ImportLessonResult = z.infer<typeof importLessonResultSchema>;

/** The report of one import run. */
export const importReportSchema = z.object({
  dryRun: z.boolean(),
  lessons: z.array(importLessonResultSchema),
});
export type ImportReport = z.infer<typeof importReportSchema>;
