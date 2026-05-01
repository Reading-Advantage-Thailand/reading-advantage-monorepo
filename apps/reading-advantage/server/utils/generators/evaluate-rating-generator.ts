import path from "path";
import { readJsonFile } from "../read-json";
import { z } from "zod";
import { generateObject } from "ai";
import { ArticleBaseCefrLevel, ArticleType } from "../../models/enum";
import { ArticleCefrLevel } from "../../models/article";
import { openai, openaiModel } from "@/utils/openai";
import { google, googleModel } from "@/utils/google";
import fs from "fs";

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
  cefr_level?: string;
}

interface CefrLevelEvaluationPromptType {
  level: string;
  systemPrompt: string;
}

export async function evaluateRating(
  params: EvaluateRatingParams
): Promise<EvaluateRatingResponse> {
  const dataFilePath = path.join(
    process.cwd(),
    "data",
    "cefr-level-evaluation-prompts.json"
  );

  const systemPrompt = fs.readFileSync(
    path.join(process.cwd(), "data", "new-level-evaluation-prompts.md"),
    "utf-8"
  );

  // read prompts from file
  const prompt = readJsonFile<CefrLevelEvaluationPromptType[]>(dataFilePath);

  try {
    // const { object: evaluated } = await generateObject({
    //   model: openai(openaiModel),
    //   schema: z.object({
    //     rating: z.number(),
    //   }),
    //   system: prompt.find((p) => p.level === params.cefrLevel)?.systemPrompt,
    //   prompt: JSON.stringify({
    //     title: params.title,
    //     summary: params.summary,
    //     type: params.type,
    //     subgenre: params.subgenre,
    //     passage: params.passage,
    //     image: params.image_description,
    //   }),
    // });

    const { object: evaluated } = await generateObject({
      model: google(googleModel),
      schema: z.object({
        rating: z.number(),
        // cefr_level: z
        //   .string()
        //   .describe(
        //     "The 'cefr_level' value should be a string representing the CEFR level (e.g., 'B1+', 'C1-')"
        //   ),
      }),
      system: prompt.find((p) => p.level === params.cefrLevel)?.systemPrompt,
      //system: systemPrompt,
      prompt: JSON.stringify({
        // title: params.title,
        // summary: params.summary,
        // type: params.type,
        // subgenre: params.subgenre,
        passage: params.passage,
        //image: params.image_description,
      }),
      seed: Math.floor(Math.random() * 1000),
      temperature: 1,
    });

    return {
      rating: evaluated.rating,
    };
  } catch (error) {
    throw `failed to evaluate rating`;
  }
}
