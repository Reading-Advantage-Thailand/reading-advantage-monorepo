import { z } from "zod";

export const workbookSourceAppSchema = z.enum([
  "reading-advantage",
  "primary-advantage",
]);

export const workbookAssetKeySchema = z
  .string()
  .min(1)
  .refine(
    (value) => !value.startsWith("http://") && !value.startsWith("https://"),
    { message: "asset key must be a canonical key, not a URL" },
  );

export const workbookAssetMetadataSchema = z
  .object({
    key: workbookAssetKeySchema,
    contentType: z.string().min(1),
    byteSize: z.number().int().nonnegative(),
    checksum: z.string().min(1),
  })
  .strict();

export const workbookSourceIdentitySchema = z
  .object({
    sourceApp: workbookSourceAppSchema,
    sourceId: z.string().min(1),
    sourceRevision: z.string().min(1),
    contentHash: z.string().min(1),
  })
  .strict();

export const workbookQuestionSchema = z
  .object({
    questionId: z.string().min(1),
    prompt: z.string().min(1),
    questionType: z.string().min(1),
    choices: z.array(z.string().min(1)).optional(),
    correctChoiceIndex: z.number().int().nonnegative().optional(),
  })
  .strict();

/**
 * Vocabulary item carried from a legacy lesson. Field names mirror the legacy
 * standalone dashboard `VocabularyItemSchema`.
 */
export const workbookVocabularyItemSchema = z
  .object({
    word: z.string().min(1),
    phonetic: z.string().optional(),
    definition: z.string().min(1),
    thai_definition: z.string().optional(),
  })
  .strict();

/**
 * Vocabulary matching-activity item carried from a legacy lesson. Field names
 * mirror the legacy `MatchItemSchema`.
 */
export const workbookMatchItemSchema = z
  .object({
    number: z.number().int(),
    word: z.string().min(1),
    letter: z.string().min(1),
    definition: z.string().min(1),
    thai_definition: z.string().optional(),
  })
  .strict();

/**
 * Vocabulary fill-in-the-blank item carried from a legacy lesson. Field names
 * mirror the legacy `FillItemSchema`.
 */
export const workbookFillItemSchema = z
  .object({
    number: z.number().int(),
    sentence: z.string().min(1),
  })
  .strict();

/**
 * Sentence reordering activity item carried from a legacy lesson. Field names
 * mirror the legacy `OrderQuestionSchema`.
 */
export const workbookOrderQuestionSchema = z
  .object({
    words: z.array(z.string().min(1)),
  })
  .strict();

/**
 * Sentence completion prompt carried from a legacy lesson. Field names mirror
 * the legacy `CompletionPromptSchema`.
 */
export const workbookCompletionPromptSchema = z
  .object({
    number: z.number().int(),
    prompt: z.string().min(1),
  })
  .strict();

/**
 * Multiple-choice answer key entry carried from a legacy lesson. Field names
 * mirror the legacy `McAnswerSchema`.
 */
export const workbookMcAnswerSchema = z
  .object({
    number: z.number().int(),
    letter: z.string().min(1),
    text: z.string().min(1),
  })
  .strict();

/**
 * Sentence order answer key entry carried from a legacy lesson. Field names
 * mirror the legacy `OrderAnswerSchema`.
 */
export const workbookOrderAnswerSchema = z
  .object({
    number: z.number().int(),
    sentence: z.string().min(1),
  })
  .strict();

/**
 * Translation paragraph pair carried from a legacy lesson. Field names mirror
 * the legacy `TranslationParagraphSchema`.
 */
export const workbookTranslationParagraphSchema = z
  .object({
    label: z.string().min(1),
    text: z.string().min(1),
  })
  .strict();

/** Positions a legacy article image may occupy in the printed layout. */
export const workbookArticleImagePositionSchema = z.enum([
  "hero",
  "vocabulary",
  "inline-para-1",
  "inline-para-2",
  "inline-para-3",
  "inline-para-4",
  "inline-para-5",
  "writing-prompt",
]);

/**
 * Structured article image carrier. A canonical asset key is the release
 * authority when known; legacyUrl is retained as provenance only and is never
 * treated as the release authority.
 */
export const workbookArticleImageSchema = z
  .object({
    key: workbookAssetKeySchema.optional(),
    legacyUrl: z.string().url().optional(),
    caption: z.string().optional(),
    imagePrompt: z.string().optional(),
    position: workbookArticleImagePositionSchema.optional(),
  })
  .strict()
  .refine(
    (image) => image.key !== undefined || image.legacyUrl !== undefined,
    { message: "article image requires a canonical key or legacyUrl provenance" },
  );

export const workbookNormalizedContentSchema = z
  .object({
    title: z.string().min(1),
    cefrLevel: z.string().min(1),
    paragraphs: z
      .array(
        z
          .object({
            order: z.number().int().nonnegative(),
            text: z.string().min(1),
          })
          .strict(),
      ),
    questions: z.array(workbookQuestionSchema),
    assets: z.array(workbookAssetMetadataSchema),
    // Lesson metadata retained from legacy lessons.
    lessonNumber: z.string().optional(),
    levelName: z.string().optional(),
    articleType: z.string().optional(),
    genre: z.string().optional(),
    // Vocabulary carriers retained from legacy lessons.
    vocabulary: z.array(workbookVocabularyItemSchema).optional(),
    vocabMatch: z.array(workbookMatchItemSchema).optional(),
    vocabFill: z.array(workbookFillItemSchema).optional(),
    vocabWordBank: z.array(z.string().min(1)).optional(),
    // Sentence practice carriers retained from legacy lessons.
    sentenceOrderQuestions: z.array(workbookOrderQuestionSchema).optional(),
    sentenceCompletionPrompts: z.array(workbookCompletionPromptSchema).optional(),
    // Short-answer carriers retained from legacy lessons.
    shortAnswerQuestion: z.string().optional(),
    shortAnswerHint: z.string().optional(),
    // Writing carriers retained from legacy lessons.
    writingPrompt: z.string().optional(),
    /**
     * Digital writing-practice destination for the lesson's QR code. Retained
     * as provenance from the legacy lesson; never a release authority.
     */
    writingPracticeUrl: z.string().url().optional(),
    writingPlanPrompts: z.array(z.string().min(1)).optional(),
    writingSentenceFrames: z.array(z.string().min(1)).optional(),
    sentenceStarters: z.array(z.string().min(1)).optional(),
    // Pedagogical connector carriers retained from legacy lessons.
    connectionQuestion: z.string().optional(),
    grammarSearchTerm: z.string().optional(),
    phonicsFocus: z.string().optional(),
    discussionQuestion: z.string().optional(),
    // Lesson reflection prompt carrier retained from legacy lessons.
    reflectionFocus: z.string().optional(),
    // Answer key carriers retained from legacy lessons.
    mcAnswers: z.array(workbookMcAnswerSchema).optional(),
    vocabMatchAnswerString: z.string().optional(),
    vocabFillAnswerString: z.string().optional(),
    sentenceOrderAnswers: z.array(workbookOrderAnswerSchema).optional(),
    translationParagraphs: z.array(workbookTranslationParagraphSchema).optional(),
    // Article image provenance carriers retained from legacy lessons.
    articleCaption: z.string().optional(),
    articleUrl: z.string().url().optional(),
    articleImages: z.array(workbookArticleImageSchema).optional(),
  })
  .strict();

/**
 * Per-draft project settings carried on a workbook source record. Field names
 * mirror the legacy standalone dashboard's project metadata. Every field is
 * optional: partial settings are legal, and lessons may predate settings.
 */
export const workbookDraftSettingsSchema = z
  .object({
    seriesName: z.string().min(1).optional(),
    levelNumber: z.string().min(1).optional(),
    cefrLevel: z.string().min(1).optional(),
    type: z.enum(["primary", "secondary"]).optional(),
  })
  .strict();

export const workbookSourceRecordSchema = z
  .object({
    identity: workbookSourceIdentitySchema,
    content: workbookNormalizedContentSchema,
    settings: workbookDraftSettingsSchema.optional(),
  })
  .strict();

export const workbookIncompatibilityIssueSchema = z
  .object({
    path: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

export const workbookIncompatibilityErrorSchema = z
  .object({
    sourceApp: workbookSourceAppSchema,
    sourceId: z.string().min(1),
    issues: z.array(workbookIncompatibilityIssueSchema).min(1),
  })
  .strict();

export type WorkbookSourceApp = z.infer<typeof workbookSourceAppSchema>;
export type WorkbookAssetKey = z.infer<typeof workbookAssetKeySchema>;
export type WorkbookAssetMetadata = z.infer<typeof workbookAssetMetadataSchema>;
export type WorkbookSourceIdentity = z.infer<typeof workbookSourceIdentitySchema>;
export type WorkbookQuestion = z.infer<typeof workbookQuestionSchema>;
export type WorkbookVocabularyItem = z.infer<typeof workbookVocabularyItemSchema>;
export type WorkbookMatchItem = z.infer<typeof workbookMatchItemSchema>;
export type WorkbookFillItem = z.infer<typeof workbookFillItemSchema>;
export type WorkbookOrderQuestion = z.infer<typeof workbookOrderQuestionSchema>;
export type WorkbookCompletionPrompt = z.infer<typeof workbookCompletionPromptSchema>;
export type WorkbookMcAnswer = z.infer<typeof workbookMcAnswerSchema>;
export type WorkbookOrderAnswer = z.infer<typeof workbookOrderAnswerSchema>;
export type WorkbookTranslationParagraph = z.infer<
  typeof workbookTranslationParagraphSchema
>;
export type WorkbookArticleImagePosition = z.infer<
  typeof workbookArticleImagePositionSchema
>;
export type WorkbookArticleImage = z.infer<typeof workbookArticleImageSchema>;
export type WorkbookNormalizedContent = z.infer<typeof workbookNormalizedContentSchema>;
export type WorkbookDraftSettings = z.infer<typeof workbookDraftSettingsSchema>;
export type WorkbookSourceRecord = z.infer<typeof workbookSourceRecordSchema>;
export type WorkbookIncompatibilityIssue = z.infer<typeof workbookIncompatibilityIssueSchema>;
export type WorkbookIncompatibilityError = z.infer<typeof workbookIncompatibilityErrorSchema>;
