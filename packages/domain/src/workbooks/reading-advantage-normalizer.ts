import { z } from "zod";
import type { WorkbookSourceRecord } from "./contracts.js";
import { WorkbookCatalogError } from "./content-catalog-port.js";
import { computeWorkbookDigest } from "./digest.js";

/**
 * Raw shape of a Reading Advantage article payload as produced by the owning app.
 * Deliberately not strict so upstream may add fields without breaking ingestion.
 */
export const readingAdvantageArticleSchema = z.object({
  /** Stable identifier of the article in the owning app. */
  id: z.string().min(1),
  /** Human-readable article headline. */
  title: z.string().min(1),
  /** Full article body with paragraphs separated by blank lines. */
  passage: z.string().min(1),
  /** CEFR level label assigned to the article. */
  cefr_level: z.string().min(1),
  /** Internal reading level, accepted as either a number or its string form. */
  ra_level: z.union([z.string(), z.number()]),
  /** Optional article subtype label. */
  type: z.string().optional(),
  /** Optional literary genre label. */
  genre: z.string().optional(),
  /** Optional natural-language description of the article illustration. */
  image_description: z.string().optional(),
});

/**
 * Full raw payload handed to the workbook normalizer for Reading Advantage.
 * Deliberately not strict so upstream may add fields without breaking ingestion.
 */
export const readingAdvantageSourceInputSchema = z.object({
  /** The article whose content becomes the workbook source record. */
  article: readingAdvantageArticleSchema,
  /** Vocabulary entries extracted alongside the article. */
  wordList: z.array(
    z.object({
      /** Headword displayed in the workbook. */
      vocabulary: z.string(),
      /** Definition payload; its exact shape is owned by the source app. */
      definition: z.unknown(),
    }),
  ),
  /** Multiple-choice comprehension questions. */
  mcq: z.array(
    z.object({
      /** Question prompt text. */
      question: z.string(),
      /** Candidate answer choices. */
      options: z.array(z.string()),
    }),
  ),
  /** Revision identifier of the source payload. */
  sourceRevision: z.string().min(1),
});

/** Parsed, type-safe form of a Reading Advantage source payload. */
export type ReadingAdvantageSourceInput = z.infer<
  typeof readingAdvantageSourceInputSchema
>;

/**
 * Normalizes a raw Reading Advantage article payload into the portable
 * WorkbookSourceRecord contract. The function is pure: it performs no I/O and
 * only derives paragraphs, questions, and the content digest.
 * @param input Raw payload from the Reading Advantage app.
 * @returns Normalized source record satisfying workbookSourceRecordSchema.
 * @throws WorkbookCatalogError with code INCOMPATIBLE_SOURCE_SHAPE when the
 * payload does not match the expected shape or the passage has no paragraphs.
 */
export function normalizeReadingAdvantageSource(
  input: unknown,
): WorkbookSourceRecord {
  const parsed = readingAdvantageSourceInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new WorkbookCatalogError(
      "INCOMPATIBLE_SOURCE_SHAPE",
      "Reading Advantage source is not in the expected workbook source shape",
      {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.length === 0 ? "(root)" : issue.path.join("."),
          reason: issue.message,
        })),
      },
    );
  }

  const { article, mcq, sourceRevision } = parsed.data;

  const paragraphs = article.passage
    .split("\n\n")
    .map((raw) => raw.trim())
    .filter((text) => text.length > 0)
    .map((text, index) => ({ order: index, text }));

  if (paragraphs.length === 0) {
    throw new WorkbookCatalogError(
      "INCOMPATIBLE_SOURCE_SHAPE",
      "Reading Advantage article has no usable paragraphs",
      {
        issues: [{ path: "article.passage", reason: "article has no paragraphs" }],
      },
    );
  }

  const questions = mcq.map((item, index) => ({
    questionId: `q-${index + 1}`,
    prompt: item.question,
    questionType: "multiple-choice",
    choices: item.options,
  }));

  const content = {
    title: article.title,
    cefrLevel: article.cefr_level,
    paragraphs,
    questions,
    assets: [],
  };

  const identity = {
    sourceApp: "reading-advantage",
    sourceId: article.id,
    sourceRevision,
    contentHash: computeWorkbookDigest(content),
  } as const;

  return { identity, content };
}
