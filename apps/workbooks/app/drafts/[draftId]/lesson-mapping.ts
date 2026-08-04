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

/** Editor-shaped vocabulary item, mirroring the legacy VocabularyItemSchema. */
export const draftLessonVocabularyItemSchema = z.object({
  word: z.string(),
  phonetic: z.string().optional(),
  definition: z.string(),
  thai_definition: z.string().optional(),
});

/** Editor-shaped vocabulary matching item, mirroring the legacy MatchItemSchema. */
export const draftLessonMatchItemSchema = z.object({
  number: z.number().int(),
  word: z.string(),
  letter: z.string(),
  definition: z.string(),
  thai_definition: z.string().optional(),
});

/** Editor-shaped vocabulary fill item, mirroring the legacy FillItemSchema. */
export const draftLessonFillItemSchema = z.object({
  number: z.number().int(),
  sentence: z.string(),
});

/** Editor-shaped sentence order question, mirroring the legacy OrderQuestionSchema. */
export const draftLessonOrderQuestionSchema = z.object({
  words: z.array(z.string()),
});

/** Editor-shaped completion prompt, mirroring the legacy CompletionPromptSchema. */
export const draftLessonCompletionPromptSchema = z.object({
  number: z.number().int(),
  prompt: z.string(),
});

/** Editor-shaped multiple-choice answer key, mirroring the legacy McAnswerSchema. */
export const draftLessonMcAnswerSchema = z.object({
  number: z.number().int(),
  letter: z.string(),
  text: z.string(),
});

/** Editor-shaped sentence order answer, mirroring the legacy OrderAnswerSchema. */
export const draftLessonOrderAnswerSchema = z.object({
  number: z.number().int(),
  sentence: z.string(),
});

/** Editor-shaped translation paragraph, mirroring the legacy TranslationParagraphSchema. */
export const draftLessonTranslationParagraphSchema = z.object({
  label: z.string(),
  text: z.string(),
});

/** Positions a legacy article image may occupy in the printed layout. */
export const draftLessonArticleImagePositionSchema = z.enum([
  "hero",
  "vocabulary",
  "inline-para-1",
  "inline-para-2",
  "inline-para-3",
  "inline-para-4",
  "inline-para-5",
  "writing-prompt",
]);

/** Editor-shaped structured article image, mirroring the legacy ArticleImageSchema. */
export const draftLessonArticleImageSchema = z.object({
  url: z.string(),
  caption: z.string(),
  image_prompt: z.string().optional(),
  position: draftLessonArticleImagePositionSchema.optional(),
});

/**
 * Editor-facing workbook lesson contract adapted from the legacy
 * `WorkbookLessonSchema`. Field names and labels preserve the legacy editor
 * UX; every field with a carrier in the extended domain normalized content
 * contract is validated here so no legacy lesson field is dropped.
 */
export const draftLessonSchema = z
  .object({
    lesson_number: z.string().optional(),
    lesson_title: z.string().min(1),
    level_name: z.string().optional(),
    cefr_level: z.string().optional(),
    article_type: z.string().optional(),
    genre: z.string().optional(),
    vocabulary: z.array(draftLessonVocabularyItemSchema).optional(),
    article_image_url: z.union([z.string(), z.array(z.string())]).optional(),
    article_caption: z.string().optional(),
    article_url: z.string().optional(),
    article_images: z.array(draftLessonArticleImageSchema).optional(),
    article_paragraphs: z.array(draftLessonParagraphSchema),
    comprehension_questions: z.array(draftLessonQuestionSchema),
    short_answer_question: z.string().optional(),
    short_answer_hint: z.string().optional(),
    sentence_starters: z.array(z.string()).optional(),
    vocab_match: z.array(draftLessonMatchItemSchema).optional(),
    vocab_fill: z.array(draftLessonFillItemSchema).optional(),
    vocab_word_bank: z.array(z.string()).optional(),
    sentence_order_questions: z.array(draftLessonOrderQuestionSchema).optional(),
    sentence_completion_prompts: z.array(draftLessonCompletionPromptSchema).optional(),
    writing_prompt: z.string().optional(),
    writing_practice_url: z.string().optional(),
    writing_plan_prompts: z.array(z.string()).optional(),
    writing_sentence_frames: z.array(z.string()).optional(),
    connection_question: z.string().optional(),
    grammar_search_term: z.string().optional(),
    phonics_focus: z.string().optional(),
    discussion_question: z.string().optional(),
    reflection_focus: z.string().optional(),
    mc_answers: z.array(draftLessonMcAnswerSchema).optional(),
    vocab_match_answer_string: z.string().optional(),
    vocab_fill_answer_string: z.string().optional(),
    sentence_order_answers: z.array(draftLessonOrderAnswerSchema).optional(),
    translation_paragraphs: z.array(draftLessonTranslationParagraphSchema).optional(),
  })
  .strict();

/** Concrete editor-shaped workbook lesson. */
export type DraftLesson = z.infer<typeof draftLessonSchema>;

/**
 * Reconstructs the editor-shaped flat image URL field from normalized article
 * image entries. Flat URLs map back into article_image_url; structured entries
 * with layout data map back into article_images.
 * @param content Normalized content stored on the draft.
 * @returns The legacy editor image fields.
 */
function splitArticleImages(
  content: workbooks.WorkbookNormalizedContent,
): {
  article_image_url: string[] | undefined;
  article_images: {
    url: string;
    caption: string;
    image_prompt?: string;
    position?: workbooks.WorkbookArticleImagePosition;
  }[] | undefined;
} {
  const entries = content.articleImages ?? [];
  // The two editor fields partition the entries: an entry carrying layout data
  // belongs to article_images only. Emitting it into both fields duplicates the
  // URL on every save/load cycle, growing article_image_url without bound.
  const carriesLayout = (
    image: workbooks.WorkbookArticleImage,
  ): boolean =>
    image.position !== undefined ||
    image.caption !== undefined ||
    image.imagePrompt !== undefined;
  const flat = entries
    .filter((image) => !carriesLayout(image))
    .map((image) => image.legacyUrl)
    .filter((url): url is string => url !== undefined);
  const structured = entries
    .filter(carriesLayout)
    .map((image) => ({
      url: image.legacyUrl ?? "",
      caption: image.caption ?? "",
      image_prompt: image.imagePrompt,
      position: image.position,
    }));
  return {
    article_image_url: flat.length > 0 ? flat : undefined,
    article_images: structured.length > 0 ? structured : undefined,
  };
}

/**
 * Maps normalized draft content to the legacy-shaped lesson the editor edits.
 *
 * The normalized contract is the source of truth for persistence; this is the
 * reverse boundary mapping that restores legacy field names and 1-based
 * paragraph/question numbering for the editor UI. Every optional carrier on
 * the extended normalized contract is restored so no legacy field is dropped.
 * @param content Normalized content stored on the draft.
 * @returns The legacy-shaped lesson state shown by the editor.
 */
export function workbookContentToLesson(
  content: workbooks.WorkbookNormalizedContent,
): DraftLesson {
  const images = splitArticleImages(content);
  return {
    lesson_number: content.lessonNumber,
    lesson_title: content.title,
    level_name: content.levelName,
    cefr_level:
      content.cefrLevel === "unknown" ? undefined : content.cefrLevel,
    article_type: content.articleType,
    genre: content.genre,
    vocabulary: content.vocabulary,
    article_image_url: images.article_image_url,
    article_caption: content.articleCaption,
    article_url: content.articleUrl,
    article_images: images.article_images,
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
    short_answer_question: content.shortAnswerQuestion,
    short_answer_hint: content.shortAnswerHint,
    sentence_starters: content.sentenceStarters,
    vocab_match: content.vocabMatch,
    vocab_fill: content.vocabFill,
    vocab_word_bank: content.vocabWordBank,
    sentence_order_questions: content.sentenceOrderQuestions,
    sentence_completion_prompts: content.sentenceCompletionPrompts,
    writing_prompt: content.writingPrompt,
    writing_practice_url: content.writingPracticeUrl,
    writing_plan_prompts: content.writingPlanPrompts,
    writing_sentence_frames: content.writingSentenceFrames,
    connection_question: content.connectionQuestion,
    grammar_search_term: content.grammarSearchTerm,
    phonics_focus: content.phonicsFocus,
    discussion_question: content.discussionQuestion,
    reflection_focus: content.reflectionFocus,
    mc_answers: content.mcAnswers,
    vocab_match_answer_string: content.vocabMatchAnswerString,
    vocab_fill_answer_string: content.vocabFillAnswerString,
    sentence_order_answers: content.sentenceOrderAnswers,
    translation_paragraphs: content.translationParagraphs,
  };
}

/**
 * Collects normalized article image entries from the editor's flat image URL
 * field and structured image list. Structured entries carry their layout data;
 * flat URLs become legacyUrl-only provenance entries.
 * @param lesson Legacy-shaped lesson state produced by the editor.
 * @returns Normalized article image entries, or undefined when the editor has none.
 */
function collectEditorArticleImages(
  lesson: DraftLesson,
): workbooks.WorkbookArticleImage[] | undefined {
  const images: workbooks.WorkbookArticleImage[] = [];

  for (const item of lesson.article_images ?? []) {
    if (item.url === "") continue;
    const entry: workbooks.WorkbookArticleImage = { legacyUrl: item.url };
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
 * Maps the legacy-shaped lesson the editor edits to normalized draft content.
 *
 * Paragraphs are renumbered by order (as the legacy importer does), blank
 * paragraphs are dropped so the normalized contract stays publishable, and the
 * existing asset metadata is preserved because the editor does not manage
 * assets. Every extended carrier on the normalized contract is populated from
 * the corresponding legacy field so no editor field is dropped.
 * @param lesson Legacy-shaped lesson state produced by the editor.
 * @param assets Existing normalized asset metadata to preserve on the draft.
 * @returns Normalized content satisfying workbookNormalizedContentSchema.
 */
export function lessonToWorkbookContent(
  lesson: DraftLesson,
  assets: readonly workbooks.WorkbookAssetMetadata[] = [],
): workbooks.WorkbookNormalizedContent {
  const articleImages = collectEditorArticleImages(lesson);
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
    ...(lesson.writing_practice_url !== undefined &&
    lesson.writing_practice_url !== ""
      ? { writingPracticeUrl: lesson.writing_practice_url }
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
}
