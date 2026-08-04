import type { WorkbookNormalizedContent } from "../contracts.js";
import type { LegacyWorkbookLesson } from "../legacy-workbook-importer.js";

/**
 * Maps normalized workbook content (camelCase) to the legacy snake_case
 * lesson shape the teacher-manual generators consume. The mapping mirrors the
 * legacy-to-normalized importer in reverse: carriers with a normalized
 * counterpart are carried across, empty carriers are omitted, and normalized
 * fields without a legacy schema field are dropped rather than invented.
 * @param content Normalized workbook content to adapt.
 * @returns A legacy-shaped lesson satisfying legacyWorkbookLessonSchema.
 */
export function toTeacherManualLesson(
  content: WorkbookNormalizedContent,
): LegacyWorkbookLesson {
  const orderedParagraphs = content.paragraphs
    .slice()
    .sort((a, b) => a.order - b.order);

  return {
    lesson_title: content.title,
    cefr_level: content.cefrLevel,
    article_paragraphs: orderedParagraphs.map((paragraph, index) => ({
      number: index + 1,
      text: paragraph.text,
    })),
    ...(content.questions.length > 0
      ? {
          comprehension_questions: content.questions.map((question, index) => ({
            number: index + 1,
            question: question.prompt,
            options: question.choices ?? [],
          })),
        }
      : {}),
    ...(content.lessonNumber !== undefined && content.lessonNumber !== ""
      ? { lesson_number: content.lessonNumber }
      : {}),
    ...(content.levelName !== undefined && content.levelName !== ""
      ? { level_name: content.levelName }
      : {}),
    ...(content.articleType !== undefined && content.articleType !== ""
      ? { article_type: content.articleType }
      : {}),
    ...(content.genre !== undefined && content.genre !== ""
      ? { genre: content.genre }
      : {}),
    ...(content.vocabulary !== undefined && content.vocabulary.length > 0
      ? { vocabulary: content.vocabulary }
      : {}),
    ...(content.vocabMatch !== undefined && content.vocabMatch.length > 0
      ? { vocab_match: content.vocabMatch }
      : {}),
    ...(content.vocabFill !== undefined && content.vocabFill.length > 0
      ? { vocab_fill: content.vocabFill }
      : {}),
    ...(content.vocabWordBank !== undefined && content.vocabWordBank.length > 0
      ? { vocab_word_bank: content.vocabWordBank }
      : {}),
    ...(content.sentenceOrderQuestions !== undefined &&
    content.sentenceOrderQuestions.length > 0
      ? { sentence_order_questions: content.sentenceOrderQuestions }
      : {}),
    ...(content.sentenceCompletionPrompts !== undefined &&
    content.sentenceCompletionPrompts.length > 0
      ? { sentence_completion_prompts: content.sentenceCompletionPrompts }
      : {}),
    ...(content.shortAnswerQuestion !== undefined &&
    content.shortAnswerQuestion !== ""
      ? { short_answer_question: content.shortAnswerQuestion }
      : {}),
    ...(content.shortAnswerHint !== undefined && content.shortAnswerHint !== ""
      ? { short_answer_hint: content.shortAnswerHint }
      : {}),
    ...(content.sentenceStarters !== undefined && content.sentenceStarters.length > 0
      ? { sentence_starters: content.sentenceStarters }
      : {}),
    ...(content.writingPrompt !== undefined && content.writingPrompt !== ""
      ? { writing_prompt: content.writingPrompt }
      : {}),
    ...(content.writingPlanPrompts !== undefined &&
    content.writingPlanPrompts.length > 0
      ? { writing_plan_prompts: content.writingPlanPrompts }
      : {}),
    ...(content.writingSentenceFrames !== undefined &&
    content.writingSentenceFrames.length > 0
      ? { writing_sentence_frames: content.writingSentenceFrames }
      : {}),
    ...(content.connectionQuestion !== undefined && content.connectionQuestion !== ""
      ? { connection_question: content.connectionQuestion }
      : {}),
    ...(content.grammarSearchTerm !== undefined && content.grammarSearchTerm !== ""
      ? { grammar_search_term: content.grammarSearchTerm }
      : {}),
    ...(content.phonicsFocus !== undefined && content.phonicsFocus !== ""
      ? { phonics_focus: content.phonicsFocus }
      : {}),
    ...(content.discussionQuestion !== undefined && content.discussionQuestion !== ""
      ? { discussion_question: content.discussionQuestion }
      : {}),
    ...(content.reflectionFocus !== undefined && content.reflectionFocus !== ""
      ? { reflection_focus: content.reflectionFocus }
      : {}),
    ...(content.mcAnswers !== undefined && content.mcAnswers.length > 0
      ? { mc_answers: content.mcAnswers }
      : {}),
    ...(content.vocabMatchAnswerString !== undefined &&
    content.vocabMatchAnswerString !== ""
      ? { vocab_match_answer_string: content.vocabMatchAnswerString }
      : {}),
    ...(content.vocabFillAnswerString !== undefined &&
    content.vocabFillAnswerString !== ""
      ? { vocab_fill_answer_string: content.vocabFillAnswerString }
      : {}),
    ...(content.sentenceOrderAnswers !== undefined &&
    content.sentenceOrderAnswers.length > 0
      ? { sentence_order_answers: content.sentenceOrderAnswers }
      : {}),
    ...(content.translationParagraphs !== undefined &&
    content.translationParagraphs.length > 0
      ? { translation_paragraphs: content.translationParagraphs }
      : {}),
    ...(content.articleCaption !== undefined && content.articleCaption !== ""
      ? { article_caption: content.articleCaption }
      : {}),
    ...(content.articleUrl !== undefined && content.articleUrl !== ""
      ? { article_url: content.articleUrl }
      : {}),
    ...(content.articleImages !== undefined && content.articleImages.length > 0
      ? { article_images: toLegacyArticleImages(content.articleImages) }
      : {}),
  };
}

/**
 * Maps structured normalized article images to the legacy article image
 * shape. The legacy shape requires a renderable URL, so images carrying only a
 * canonical asset key (no legacy URL provenance) map to an empty URL rather
 * than inventing one.
 * @param images Normalized article images with key or legacyUrl provenance.
 * @returns Legacy article image entries satisfying the legacy lesson schema.
 */
function toLegacyArticleImages(
  images: NonNullable<WorkbookNormalizedContent["articleImages"]>,
): NonNullable<LegacyWorkbookLesson["article_images"]> {
  return images.map((image) => ({
    url: image.legacyUrl ?? "",
    caption: image.caption ?? "",
    ...(image.imagePrompt !== undefined && image.imagePrompt !== ""
      ? { image_prompt: image.imagePrompt }
      : {}),
    ...(image.position !== undefined ? { position: image.position } : {}),
  }));
}
