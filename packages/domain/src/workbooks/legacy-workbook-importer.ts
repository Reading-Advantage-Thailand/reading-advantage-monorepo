import { z } from "zod";
import {
  workbookDraftSettingsSchema,
  workbookSourceAppSchema,
  type WorkbookArticleImagePosition,
  type WorkbookSourceRecord,
} from "./contracts.js";
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
        /** Optional phonetic transcription of the headword. */
        phonetic: z.string().optional(),
        /** Definition text for the headword. */
        definition: z.string(),
        /** Optional Thai translation of the definition. */
        thai_definition: z.string().optional(),
      }),
    )
    .optional(),
  /** Optional human-readable lesson number label. */
  lesson_number: z.string().optional(),
  /** Optional human-readable level label. */
  level_name: z.string().optional(),
  /** Optional article subtype label. */
  article_type: z.string().optional(),
  /** Optional literary genre label. */
  genre: z.string().optional(),
  /** Optional flat image URL, or list of image URLs, for the article. */
  article_image_url: z.union([z.string(), z.array(z.string())]).optional(),
  /** Optional caption for the article imagery. */
  article_caption: z.string().optional(),
  /** Optional public URL of the article in the owning app. */
  article_url: z.string().optional(),
  /** Optional structured article images with captions and positions. */
  article_images: z
    .array(
      z.object({
        /** Source URL of the image. */
        url: z.string(),
        /** Caption displayed with the image. */
        caption: z.string(),
        /** Optional prompt used to generate the image. */
        image_prompt: z.string().optional(),
        /** Position the image occupies in the legacy layout. */
        position: z
          .enum([
            "hero",
            "vocabulary",
            "inline-para-1",
            "inline-para-2",
            "inline-para-3",
            "inline-para-4",
            "inline-para-5",
            "writing-prompt",
          ])
          .optional(),
      }),
    )
    .optional(),
  /** Optional short-answer question prompt. */
  short_answer_question: z.string().optional(),
  /** Optional hint shown beside the short-answer question. */
  short_answer_hint: z.string().optional(),
  /** Optional sentence starters offered for writing. */
  sentence_starters: z.array(z.string()).optional(),
  /** Optional vocabulary matching activity items. */
  vocab_match: z
    .array(
      z.object({
        /** Original 1-based item number. */
        number: z.number(),
        /** Headword to match. */
        word: z.string(),
        /** Matching letter for the definition column. */
        letter: z.string(),
        /** Definition text to match against. */
        definition: z.string(),
        /** Optional Thai translation of the definition. */
        thai_definition: z.string().optional(),
      }),
    )
    .optional(),
  /** Optional vocabulary fill-in-the-blank items. */
  vocab_fill: z
    .array(
      z.object({
        /** Original 1-based item number. */
        number: z.number(),
        /** Sentence containing a blank to fill. */
        sentence: z.string(),
      }),
    )
    .optional(),
  /** Optional bank of words offered for vocabulary exercises. */
  vocab_word_bank: z.array(z.string()).optional(),
  /** Optional sentence reordering activity items. */
  sentence_order_questions: z
    .array(
      z.object({
        /** Words offered for the student to reorder. */
        words: z.array(z.string()),
      }),
    )
    .optional(),
  /** Optional sentence completion prompt items. */
  sentence_completion_prompts: z
    .array(
      z.object({
        /** Original 1-based prompt number. */
        number: z.number(),
        /** Prompt text the student completes. */
        prompt: z.string(),
      }),
    )
    .optional(),
  /** Optional main writing prompt for the lesson. */
  writing_prompt: z.string().optional(),
  /** Optional planning questions offered before writing. */
  writing_plan_prompts: z.array(z.string()).optional(),
  /** Optional sentence frames offered for writing. */
  writing_sentence_frames: z.array(z.string()).optional(),
  /** Optional pedagogical connection question. */
  connection_question: z.string().optional(),
  /** Optional grammar focus search term. */
  grammar_search_term: z.string().optional(),
  /** Optional phonics focus label. */
  phonics_focus: z.string().optional(),
  /** Optional discussion question. */
  discussion_question: z.string().optional(),
  /** Optional reflection focus prompt. */
  reflection_focus: z.string().optional(),
  /** Optional answer key for the comprehension questions. */
  mc_answers: z
    .array(
      z.object({
        /** Original 1-based question number. */
        number: z.number(),
        /** Correct choice letter. */
        letter: z.string(),
        /** Correct choice text. */
        text: z.string(),
      }),
    )
    .optional(),
  /** Optional serialized vocabulary matching answer string. */
  vocab_match_answer_string: z.string().optional(),
  /** Optional serialized vocabulary fill answer string. */
  vocab_fill_answer_string: z.string().optional(),
  /** Optional answer key for the sentence ordering activity. */
  sentence_order_answers: z
    .array(
      z.object({
        /** Original 1-based item number. */
        number: z.number(),
        /** Correct sentence. */
        sentence: z.string(),
      }),
    )
    .optional(),
  /** Optional Thai translation paragraphs for the article. */
  translation_paragraphs: z
    .array(
      z.object({
        /** Label identifying the translated paragraph. */
        label: z.string(),
        /** Translated paragraph text. */
        text: z.string(),
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
  /** Owning app the lesson was authored in. */
  sourceApp: workbookSourceAppSchema,
  /** Stable identifier of the lesson in the owning app. */
  sourceId: z.string().min(1),
  /** Revision identifier of the source payload. */
  sourceRevision: z.string().min(1),
  /** Optional project settings attached to the created source record. */
  settings: workbookDraftSettingsSchema.optional(),
});

/** Parsed, type-safe form of a legacy standalone-dashboard workbook payload. */
export type LegacyWorkbookImportInput = z.infer<
  typeof legacyWorkbookImportInputSchema
>;

/** Parsed, type-safe form of a single legacy standalone-dashboard lesson. */
export type LegacyWorkbookLesson = z.infer<typeof legacyWorkbookLessonSchema>;

/** Structured article image entry built from a legacy lesson image. */
type LegacyArticleImageEntry = {
  legacyUrl: string;
  caption?: string;
  imagePrompt?: string;
  position?: WorkbookArticleImagePosition;
};

/**
 * Collects article image entries from the flat image URL field and the
 * structured image list of a legacy lesson. Empty strings and empty lists
 * contribute nothing so the carrier is omitted when the lesson has no images.
 * @param lesson Parsed legacy lesson payload.
 * @returns Structured image entries carrying legacyUrl provenance.
 */
function collectLegacyArticleImages(
  lesson: LegacyWorkbookLesson,
): LegacyArticleImageEntry[] | undefined {
  const images: LegacyArticleImageEntry[] = [];

  for (const item of lesson.article_images ?? []) {
    if (item.url === "") continue;
    const entry: LegacyArticleImageEntry = { legacyUrl: item.url };
    if (item.caption !== "") entry.caption = item.caption;
    if (item.image_prompt !== undefined && item.image_prompt !== "") {
      entry.imagePrompt = item.image_prompt;
    }
    if (item.position !== undefined) entry.position = item.position;
    images.push(entry);
  }

  const flat = Array.isArray(lesson.article_image_url)
    ? lesson.article_image_url
    : typeof lesson.article_image_url === "string" &&
        lesson.article_image_url !== ""
      ? [lesson.article_image_url]
      : [];
  for (const url of flat) {
    if (url !== "") images.push({ legacyUrl: url });
  }

  return images.length > 0 ? images : undefined;
}

/**
 * Imports a legacy standalone-dashboard workbook lesson into the portable
 * WorkbookSourceRecord contract. The function is pure: it performs no I/O and
 * only normalizes paragraphs, questions, legacy carriers, and the content
 * digest. Every legacy lesson field with a carrier in the extended normalized
 * content contract is preserved rather than dropped.
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

  const { lesson, sourceApp, sourceId, sourceRevision, settings } = parsed.data;

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

  const articleImages = collectLegacyArticleImages(lesson);

  const content = {
    title: lesson.lesson_title,
    cefrLevel: lesson.cefr_level ?? "unknown",
    paragraphs,
    questions,
    assets: [],
    ...(lesson.lesson_number !== undefined && lesson.lesson_number !== ""
      ? { lessonNumber: lesson.lesson_number }
      : {}),
    ...(lesson.level_name !== undefined && lesson.level_name !== ""
      ? { levelName: lesson.level_name }
      : {}),
    ...(lesson.article_type !== undefined && lesson.article_type !== ""
      ? { articleType: lesson.article_type }
      : {}),
    ...(lesson.genre !== undefined && lesson.genre !== ""
      ? { genre: lesson.genre }
      : {}),
    ...(lesson.vocabulary !== undefined && lesson.vocabulary.length > 0
      ? { vocabulary: lesson.vocabulary }
      : {}),
    ...(lesson.vocab_match !== undefined && lesson.vocab_match.length > 0
      ? { vocabMatch: lesson.vocab_match }
      : {}),
    ...(lesson.vocab_fill !== undefined && lesson.vocab_fill.length > 0
      ? { vocabFill: lesson.vocab_fill }
      : {}),
    ...(lesson.vocab_word_bank !== undefined && lesson.vocab_word_bank.length > 0
      ? { vocabWordBank: lesson.vocab_word_bank }
      : {}),
    ...(lesson.sentence_order_questions !== undefined &&
    lesson.sentence_order_questions.length > 0
      ? { sentenceOrderQuestions: lesson.sentence_order_questions }
      : {}),
    ...(lesson.sentence_completion_prompts !== undefined &&
    lesson.sentence_completion_prompts.length > 0
      ? { sentenceCompletionPrompts: lesson.sentence_completion_prompts }
      : {}),
    ...(lesson.short_answer_question !== undefined && lesson.short_answer_question !== ""
      ? { shortAnswerQuestion: lesson.short_answer_question }
      : {}),
    ...(lesson.short_answer_hint !== undefined && lesson.short_answer_hint !== ""
      ? { shortAnswerHint: lesson.short_answer_hint }
      : {}),
    ...(lesson.sentence_starters !== undefined && lesson.sentence_starters.length > 0
      ? { sentenceStarters: lesson.sentence_starters }
      : {}),
    ...(lesson.writing_prompt !== undefined && lesson.writing_prompt !== ""
      ? { writingPrompt: lesson.writing_prompt }
      : {}),
    ...(lesson.writing_plan_prompts !== undefined &&
    lesson.writing_plan_prompts.length > 0
      ? { writingPlanPrompts: lesson.writing_plan_prompts }
      : {}),
    ...(lesson.writing_sentence_frames !== undefined &&
    lesson.writing_sentence_frames.length > 0
      ? { writingSentenceFrames: lesson.writing_sentence_frames }
      : {}),
    ...(lesson.connection_question !== undefined && lesson.connection_question !== ""
      ? { connectionQuestion: lesson.connection_question }
      : {}),
    ...(lesson.grammar_search_term !== undefined && lesson.grammar_search_term !== ""
      ? { grammarSearchTerm: lesson.grammar_search_term }
      : {}),
    ...(lesson.phonics_focus !== undefined && lesson.phonics_focus !== ""
      ? { phonicsFocus: lesson.phonics_focus }
      : {}),
    ...(lesson.discussion_question !== undefined && lesson.discussion_question !== ""
      ? { discussionQuestion: lesson.discussion_question }
      : {}),
    ...(lesson.reflection_focus !== undefined && lesson.reflection_focus !== ""
      ? { reflectionFocus: lesson.reflection_focus }
      : {}),
    ...(lesson.mc_answers !== undefined && lesson.mc_answers.length > 0
      ? { mcAnswers: lesson.mc_answers }
      : {}),
    ...(lesson.vocab_match_answer_string !== undefined &&
    lesson.vocab_match_answer_string !== ""
      ? { vocabMatchAnswerString: lesson.vocab_match_answer_string }
      : {}),
    ...(lesson.vocab_fill_answer_string !== undefined &&
    lesson.vocab_fill_answer_string !== ""
      ? { vocabFillAnswerString: lesson.vocab_fill_answer_string }
      : {}),
    ...(lesson.sentence_order_answers !== undefined &&
    lesson.sentence_order_answers.length > 0
      ? { sentenceOrderAnswers: lesson.sentence_order_answers }
      : {}),
    ...(lesson.translation_paragraphs !== undefined &&
    lesson.translation_paragraphs.length > 0
      ? { translationParagraphs: lesson.translation_paragraphs }
      : {}),
    ...(lesson.article_caption !== undefined && lesson.article_caption !== ""
      ? { articleCaption: lesson.article_caption }
      : {}),
    ...(lesson.article_url !== undefined && lesson.article_url !== ""
      ? { articleUrl: lesson.article_url }
      : {}),
    ...(articleImages !== undefined ? { articleImages } : {}),
  };

  const identity = {
    sourceApp,
    sourceId,
    sourceRevision,
    contentHash: computeWorkbookDigest(content),
  } as const;

  const sourceRecord: WorkbookSourceRecord = {
    identity,
    content,
    ...(settings !== undefined ? { settings } : {}),
  };

  return sourceRecord;
}
