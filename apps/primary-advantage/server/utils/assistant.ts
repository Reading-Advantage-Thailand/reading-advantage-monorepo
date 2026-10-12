import { laquestion_system, saqeution_system } from "@/data/prompts-ai";
import { db } from '@reading-advantage/db';
import { eq } from "drizzle-orm";
import { articles, chapters } from "@reading-advantage/db";
import {
  laqFeedbackInputSchema,
  laqFeedbackOutputSchema,
  saqFeedbackInputSchema,
  saqFeedbackOutputSchema,
} from "@/lib/zod";
import { LAQFeedback, LAQFeedbackResponse, SAQFeedbackResponse } from "@/types";
import { ActivityType } from "@/types/enum";
import { feedbackClient, loggedAiCall } from "@/lib/ai/models";
import fs from "fs";
import path from "path";

/** The reading source of a feedback request: an article id, or a chapter id. */
export type FeedbackSource = { articleId?: string; chapterId?: string };

/**
 * Reads the passage and the CEFR level behind a feedback request, from an article or a chapter.
 * @param source The article or the chapter id.
 * @returns The passage and the CEFR level.
 * @throws When the source names no article or chapter row, or its feedback fields are incomplete.
 */
export async function readFeedbackSource(source: FeedbackSource): Promise<{ passage: string; cefrLevel: string }> {
  if (source.chapterId) {    const chapterRows = await db.select({
      passage: chapters.passage,
      cefrLevel: chapters.cefrLevel,
    })
      .from(chapters)
      .where(eq(chapters.id, source.chapterId))
      .limit(1);

    const chapter = chapterRows[0];

    if (!chapter) {
      throw new Error("Chapter not found");
    }
    if (!chapter.cefrLevel || !chapter.passage) {
      throw new Error("Chapter feedback fields are incomplete");
    }
    return { passage: chapter.passage, cefrLevel: chapter.cefrLevel };
  }

  if (!source.articleId) {
    throw new Error("Feedback source needs an article or a chapter");
  }
  const articleRows = await db.select({
    passage: articles.passage,
    cefrLevel: articles.cefrLevel,
  })
    .from(articles)
    .where(eq(articles.id, source.articleId))
    .limit(1);

  const article = articleRows[0];

  if (!article) {
    throw new Error("Article not found");
  }
  if (!article.cefrLevel || !article.passage) {
    throw new Error("Article feedback fields are incomplete");
  }
  return { passage: article.passage, cefrLevel: article.cefrLevel };
}

/**
 * Generates feedback for a short-answer response.
 * @param req The response and learner context.
 * @returns The generated feedback.
 */
export async function getSaqFeedback(req: {
  data: {
    articleId?: string;
    chapterId?: string;
    question: string;
    answer: string;
    suggestedResponse?: string;
    preferredLanguage: string;
  };
  activityType: ActivityType;
}): Promise<SAQFeedbackResponse> {
  let prompt: string | undefined;

    const { passage, cefrLevel } = await readFeedbackSource(
      req.data.chapterId ? { chapterId: req.data.chapterId } : { articleId: req.data.articleId },
    );

    const rawPrompt = fs.readFileSync(
      path.join(process.cwd(), "data", "prompts-feedback-user-SA.json"),
      "utf-8",
    );

    const data = {
      preferredLanguage: req.data.preferredLanguage,
      targetCEFRLevel: cefrLevel.replace(/[+-]/g, ""),
      article: passage,
      question: req.data.question,
      suggestedResponse: req.data.suggestedResponse,
      studentResponse: req.data.answer,
    };

    const validatedInput = saqFeedbackInputSchema.parse(data);

    prompt = rawPrompt
      .replace("{preferredLanguage}", validatedInput.preferredLanguage)
      .replace("{targetCEFRLevel}", validatedInput.targetCEFRLevel)
      .replace("{article}", validatedInput.article)
      .replace("{question}", validatedInput.question)
      .replace("{suggestedResponse}", validatedInput.suggestedResponse)
      .replace("{studentResponse}", validatedInput.studentResponse);

    const object = await loggedAiCall("qa.feedback", () =>
      feedbackClient().generateObject({
        schema: saqFeedbackOutputSchema,
        system: saqeution_system,
        prompt: prompt!,
      }),
    );

    return object as SAQFeedbackResponse;
}

/**
 * Generates feedback for a long-answer response.
 * @param req The response and learner context.
 * @returns The generated feedback.
 */
export async function getLaqFeedback(req: {
  data: {
    articleId?: string;
    chapterId?: string;
    question: string;
    answer: string;
    suggestedResponse?: string;
    preferredLanguage: string;
  };
}) {
  let prompt: string | undefined;

    const { passage, cefrLevel } = await readFeedbackSource(
      req.data.chapterId ? { chapterId: req.data.chapterId } : { articleId: req.data.articleId },
    );

    const rawPrompt = fs.readFileSync(
      path.join(process.cwd(), "data", "prompts-feedback-user-LA.json"),
      "utf-8",
    );

    const data = {
      preferredLanguage: req.data.preferredLanguage,
      targetCEFRLevel: cefrLevel.replace(/[+-]/g, ""),
      readingPassage: passage,
      writingPrompt: req.data.question,
      studentResponse: req.data.answer,
    };

    const validatedInput = laqFeedbackInputSchema.parse(data);

    prompt = rawPrompt
      .replace("{preferredLanguage}", validatedInput.preferredLanguage)
      .replace("{targetCEFRLevel}", validatedInput.targetCEFRLevel)
      .replace("{readingPassage}", validatedInput.readingPassage)
      .replace("{writingPrompt}", validatedInput.writingPrompt)
      .replace("{studentResponse}", validatedInput.studentResponse);

    const object = await loggedAiCall("qa.feedback", () =>
      feedbackClient().generateObject({
        schema: laqFeedbackOutputSchema,
        system: laquestion_system,
        prompt: prompt!,
      }),
    );

    if (!object.feedback) {
      return { error: "An error occurred" };
    } else {
      return object.feedback;
    }
}
