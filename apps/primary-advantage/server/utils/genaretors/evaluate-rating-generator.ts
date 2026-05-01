import path from "path";
import { z } from "zod";
import fs from "fs";
import { generateObject } from "ai";
import { google, googleModel } from "@/utils/google";
import {
  ArticleBaseCefrLevel,
  ArticleCefrLevel,
  ArticleType,
} from "@/types/enum";

export interface EvaluateRatingParams {
  type?: ArticleType;
  genre?: string;
  subgenre?: string;
  cefrLevel?: ArticleBaseCefrLevel | ArticleCefrLevel;
  title?: string;
  summary?: string;
  passage: string;
  image_description?: string;
}

export interface EvaluateRatingResponse {
  rating: number;
  cefrLevel?: string;
}

interface CefrLevelEvaluationPromptType {
  level: string;
  systemPrompt: string;
}

export async function evaluateRating(
  params: EvaluateRatingParams,
): Promise<EvaluateRatingResponse> {
  const dataFilePath = path.join(
    process.cwd(),
    "data",
    "new-level-evaluation-prompts.json",
  );

  // read prompts from file
  const rawData = fs.readFileSync(dataFilePath, "utf-8");
  const prompt: CefrLevelEvaluationPromptType[] = JSON.parse(rawData);

  const systemPrompt = prompt.find(
    (p) => p.level === params.cefrLevel,
  )?.systemPrompt;

  try {
    const { object: evaluated } = await generateObject({
      model: google(googleModel),
      schema: z.object({
        cefrLevel: z.string(),
        rating: z.number(),
      }),
      system: systemPrompt,
      prompt: JSON.stringify({
        passage: params.passage,
      }),
      seed: Math.floor(Math.random() * 1000),
      temperature: 1,
    });

    return {
      rating: evaluated.rating,
      cefrLevel: evaluated.cefrLevel,
    };
  } catch (error) {
    throw `failed to evaluate rating`;
  }
}
