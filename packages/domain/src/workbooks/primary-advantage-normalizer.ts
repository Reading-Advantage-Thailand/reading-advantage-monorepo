import { z } from "zod";
import type { WorkbookSourceRecord } from "./contracts.js";
import { WorkbookCatalogError } from "./content-catalog-port.js";
import { computeWorkbookDigest } from "./digest.js";

/**
 * Raw shape of a Primary Advantage article row as read from the shared Drizzle
 * `articles` table. Fields are camelCase to mirror the database columns, and
 * the schema is deliberately not strict so the row may grow without breaking
 * ingestion.
 */
export const primaryAdvantageArticleSchema = z.object({
  /** Stable identifier of the article in the owning app. */
  id: z.string().min(1),
  /** Human-readable article headline. */
  title: z.string().min(1),
  /** Full article body with paragraphs separated by blank lines. */
  passage: z.string().min(1),
  /** CEFR level label assigned to the article. */
  cefrLevel: z.string().min(1),
  /** Internal reading level, accepted as either a number or its string form. */
  raLevel: z.union([z.string(), z.number()]),
  /** Whether the article has been published for readers. */
  published: z.boolean(),
  /** Whether the article has been approved for curriculum use. */
  isApproved: z.boolean(),
  /** Whether the article is still being drafted. */
  isDraft: z.boolean(),
  /** Whether the article is publicly visible; carried for rights decisions. */
  isPublic: z.boolean(),
  /** Optional article subtype label. */
  type: z.string().optional(),
  /** Optional literary genre label. */
  genre: z.string().optional(),
  /** Optional natural-language description of the article illustration. */
  imageDescription: z.string().optional(),
});

/**
 * Full raw payload handed to the workbook normalizer for Primary Advantage.
 * Deliberately not strict so upstream may add fields without breaking ingestion.
 */
export const primaryAdvantageSourceInputSchema = z.object({
  /** The article whose content becomes the workbook source record. */
  article: primaryAdvantageArticleSchema,
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

/** Parsed, type-safe form of a Primary Advantage source payload. */
export type PrimaryAdvantageSourceInput = z.infer<
  typeof primaryAdvantageSourceInputSchema
>;

/**
 * Normalizes a raw Primary Advantage article row into the portable
 * WorkbookSourceRecord contract. The function is pure: it performs no I/O and
 * only derives paragraphs, questions, and the content digest. It enforces the
 * source eligibility gate before any content is produced, failing closed on
 * unpublished, unapproved, or still-draft sources without leaking the source
 * content into error messages.
 * @param input Raw payload from the Primary Advantage app.
 * @returns Normalized source record satisfying workbookSourceRecordSchema.
 * @throws WorkbookCatalogError with code SOURCE_NOT_ELIGIBLE when the source
 * fails an eligibility condition, and code INCOMPATIBLE_SOURCE_SHAPE when the
 * payload does not match the expected shape or the passage has no paragraphs.
 */
export function normalizePrimaryAdvantageSource(
  input: unknown,
): WorkbookSourceRecord {
  const parsed = primaryAdvantageSourceInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new WorkbookCatalogError(
      "INCOMPATIBLE_SOURCE_SHAPE",
      "Primary Advantage source is not in the expected workbook source shape",
      {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.length === 0 ? "(root)" : issue.path.join("."),
          reason: issue.message,
        })),
      },
    );
  }

  const { article, mcq, sourceRevision } = parsed.data;

  const eligibilityIssues: Array<{ path: string; reason: string }> = [];
  if (article.published !== true) {
    eligibilityIssues.push({
      path: "article.published",
      reason: "source is not published",
    });
  }
  if (article.isApproved !== true) {
    eligibilityIssues.push({
      path: "article.isApproved",
      reason: "source is not approved",
    });
  }
  if (article.isDraft === true) {
    eligibilityIssues.push({
      path: "article.isDraft",
      reason: "source is still a draft",
    });
  }

  if (eligibilityIssues.length > 0) {
    throw new WorkbookCatalogError(
      "SOURCE_NOT_ELIGIBLE",
      "Primary Advantage source is not eligible for workbook use",
      { issues: eligibilityIssues },
    );
  }

  const paragraphs = article.passage
    .split("\n\n")
    .map((raw) => raw.trim())
    .filter((text) => text.length > 0)
    .map((text, index) => ({ order: index, text }));

  if (paragraphs.length === 0) {
    throw new WorkbookCatalogError(
      "INCOMPATIBLE_SOURCE_SHAPE",
      "Primary Advantage article has no usable paragraphs",
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
    cefrLevel: article.cefrLevel,
    paragraphs,
    questions,
    assets: [],
  };

  const identity = {
    sourceApp: "primary-advantage",
    sourceId: article.id,
    sourceRevision,
    contentHash: computeWorkbookDigest(content),
  } as const;

  return { identity, content };
}
