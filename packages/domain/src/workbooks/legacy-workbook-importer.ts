import { z } from "zod";
import type { WorkbookSourceRecord } from "./contracts.js";
import { WorkbookCatalogError } from "./content-catalog-port.js";
import { computeWorkbookDigest } from "./digest.js";

/**
 * Raw shape of a single lesson in a legacy standalone-dashboard workbook JSON.
 * Deliberately not strict so legacy files may carry extra fields without
 * breaking ingestion.
 */
export const legacyWorkbookLessonSchema = z.object({
  /** Human-readable title of the legacy lesson. */
  lesson_title: z.string().min(1),
  /** Optional CEFR level label assigned to the lesson. */
  cefr_level: z.string().optional(),
  /** Article body split into numbered paragraphs. */
  article_paragraphs: z.array(
    z.object({
      /** Original 1-based paragraph number from the legacy file. */
      number: z.number(),
      /** Paragraph body text. */
      text: z.string(),
    }),
  ),
  /** Optional multiple-choice comprehension questions. */
  comprehension_questions: z
    .array(
      z.object({
        /** Original question number from the legacy file. */
        number: z.number(),
        /** Question prompt text. */
        question: z.string(),
        /** Candidate answer choices. */
        options: z.array(z.string()),
      }),
    )
    .optional(),
  /** Optional vocabulary entries extracted alongside the lesson. */
  vocabulary: z
    .array(
      z.object({
        /** Headword displayed in the workbook. */
        word: z.string(),
        /** Definition text for the headword. */
        definition: z.string(),
      }),
    )
    .optional(),
});

/**
 * Full raw payload handed to the importer for a legacy standalone-dashboard
 * workbook lesson. Deliberately not strict so legacy files may add fields.
 */
export const legacyWorkbookImportInputSchema = z.object({
  /** The lesson whose content becomes the workbook source record. */
  lesson: legacyWorkbookLessonSchema,
  /** Stable identifier of the lesson in the owning app. */
  sourceId: z.string().min(1),
  /** Revision identifier of the source payload. */
  sourceRevision: z.string().min(1),
});

/** Parsed, type-safe form of a legacy standalone-dashboard workbook payload. */
export type LegacyWorkbookImportInput = z.infer<
  typeof legacyWorkbookImportInputSchema
>;

/**
 * Imports a legacy standalone-dashboard workbook lesson into the portable
 * WorkbookSourceRecord contract. The function is pure: it performs no I/O and
 * only normalizes paragraphs, questions, and the content digest.
 * @param input Raw legacy workbook payload.
 * @returns Normalized source record satisfying workbookSourceRecordSchema.
 * @throws WorkbookCatalogError with code INCOMPATIBLE_SOURCE_SHAPE when the
 * payload does not match the expected shape or the lesson has no paragraphs.
 */
export function importLegacyWorkbook(input: unknown): WorkbookSourceRecord {
  const parsed = legacyWorkbookImportInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new WorkbookCatalogError(
      "INCOMPATIBLE_SOURCE_SHAPE",
      "Legacy workbook source is not in the expected workbook source shape",
      {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.length === 0 ? "(root)" : issue.path.join("."),
          reason: issue.message,
        })),
      },
    );
  }

  const { lesson, sourceId, sourceRevision } = parsed.data;

  const paragraphs = lesson.article_paragraphs
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((paragraph) => paragraph.text.trim())
    .filter((text) => text.length > 0)
    .map((text, index) => ({ order: index, text }));

  if (paragraphs.length === 0) {
    throw new WorkbookCatalogError(
      "INCOMPATIBLE_SOURCE_SHAPE",
      "Legacy workbook lesson has no usable paragraphs",
      {
        issues: [
          { path: "lesson.article_paragraphs", reason: "lesson has no paragraphs" },
        ],
      },
    );
  }

  const questions = (lesson.comprehension_questions ?? []).map((item, index) => ({
    questionId: `q-${index + 1}`,
    prompt: item.question,
    questionType: "multiple-choice",
    choices: item.options,
  }));

  const content = {
    title: lesson.lesson_title,
    cefrLevel: lesson.cefr_level ?? "unknown",
    paragraphs,
    questions,
    assets: [],
  };

  const identity = {
    sourceApp: "reading-advantage",
    sourceId,
    sourceRevision,
    contentHash: computeWorkbookDigest(content),
  } as const;

  return { identity, content };
}
