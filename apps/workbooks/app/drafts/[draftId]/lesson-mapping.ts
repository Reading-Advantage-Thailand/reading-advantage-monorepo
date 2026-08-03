import { z } from "zod";
import type { workbooks } from "@reading-advantage/domain";

/**
 * Editor-shaped paragraph carried by the lesson editor, mirroring the legacy
 * standalone dashboard's snake_case lesson JSON.
 */
export const draftLessonParagraphSchema = z.object({
  number: z.number().int(),
  text: z.string(),
});

/** Editor-shaped comprehension question carried by the lesson editor. */
export const draftLessonQuestionSchema = z.object({
  number: z.number().int(),
  question: z.string(),
  options: z.array(z.string()),
});

/**
 * Editor-facing workbook lesson contract adapted from the legacy
 * `WorkbookLessonSchema`. Field names and labels preserve the legacy editor
 * UX; only fields with a carrier in the domain normalized content contract
 * are validated here.
 */
export const draftLessonSchema = z
  .object({
    lesson_title: z.string().min(1),
    cefr_level: z.string().optional(),
    article_paragraphs: z.array(draftLessonParagraphSchema),
    comprehension_questions: z.array(draftLessonQuestionSchema),
  })
  .strict();

/** Concrete editor-shaped workbook lesson. */
export type DraftLesson = z.infer<typeof draftLessonSchema>;

/**
 * Maps normalized draft content to the legacy-shaped lesson the editor edits.
 *
 * The normalized contract is the source of truth for persistence; this is the
 * reverse boundary mapping that restores legacy field names and 1-based
 * paragraph/question numbering for the editor UI.
 * @param content Normalized content stored on the draft.
 * @returns The legacy-shaped lesson state shown by the editor.
 */
export function workbookContentToLesson(
  content: workbooks.WorkbookNormalizedContent,
): DraftLesson {
  return {
    lesson_title: content.title,
    cefr_level:
      content.cefrLevel === "unknown" ? undefined : content.cefrLevel,
    article_paragraphs: content.paragraphs.map((paragraph) => ({
      number: paragraph.order + 1,
      text: paragraph.text,
    })),
    comprehension_questions: content.questions.map((question, index) => {
      const number = Number.parseInt(
        question.questionId.replace(/^\D+/, ""),
        10,
      );
      return {
        number: Number.isNaN(number) ? index + 1 : number,
        question: question.prompt,
        options: question.choices ?? [],
      };
    }),
  };
}

/**
 * Maps the legacy-shaped lesson the editor edits to normalized draft content.
 *
 * Paragraphs are renumbered by order (as the legacy importer does), blank
 * paragraphs are dropped so the normalized contract stays publishable, and the
 * existing asset metadata is preserved because the editor does not manage
 * assets. Legacy fields without a carrier in the normalized contract
 * (lesson_number, level_name, genre, article images, vocabulary, short answer,
 * writing prompt, connectors, reflection) are not persisted and must be
 * excluded from the editor UI.
 * @param lesson Legacy-shaped lesson state produced by the editor.
 * @param assets Existing normalized asset metadata to preserve on the draft.
 * @returns Normalized content satisfying workbookNormalizedContentSchema.
 */
export function lessonToWorkbookContent(
  lesson: DraftLesson,
  assets: readonly workbooks.WorkbookAssetMetadata[] = [],
): workbooks.WorkbookNormalizedContent {
  return {
    title: lesson.lesson_title.trim(),
    cefrLevel: lesson.cefr_level?.trim() || "unknown",
    paragraphs: lesson.article_paragraphs
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((paragraph) => ({ order: 0, text: paragraph.text.trim() }))
      .filter((paragraph) => paragraph.text.length > 0)
      .map((paragraph, index) => ({ ...paragraph, order: index })),
    questions: lesson.comprehension_questions.map((question) => ({
      questionId: `q-${question.number}`,
      prompt: question.question,
      questionType: "multiple-choice",
      choices: question.options,
    })),
    assets: [...assets],
  };
}
