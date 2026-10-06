import { getQuestionsByArticleId } from "@/server/models/articleModel";
import { ActivityType, QuestionState } from "@/types/enum";
import type { QuestionResponse } from "@/types";

/**
 * Loads the questions of one type for a question card. A failed load gives the ERROR state,
 * so the card shows its own error and the article page still renders (audit S2).
 * @param articleId The article.
 * @param type The question activity type.
 * @returns The questions and their state.
 */
export async function loadQuestions(articleId: string, type: ActivityType): Promise<QuestionResponse> {
  try {
    return await getQuestionsByArticleId(articleId, type);
  } catch (error) {
    console.error(`Question load failed (${type}, article ${articleId}):`, error);
    return { questions: [], result: { details: { timer: 0 }, completed: false }, questionStatus: QuestionState.ERROR };
  }
}
