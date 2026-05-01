import z from "zod";
import path from "path";
import { readJsonFile } from "../read-json";
import { generateObject } from "ai";
import { ArticleBaseCefrLevel, ArticleType } from "../../models/enum";
import { openai, openaiModel } from "@/utils/openai";
import { google, googleModel,googleProPrewiew } from "@/utils/google";

export interface GenerateArticleParams {
  type: ArticleType;
  genre: string;
  subgenre: string;
  topic: string;
  cefrLevel: ArticleBaseCefrLevel;
  previousContent?: string;
}

export interface GenerateArticleResponse {
  passage: string;
  title: string;
  summary: string;
  imageDesc: string;
}

type CefrLevelPromptType = {
  type: ArticleType;
  levels: CefrLevelType[];
};

type CefrLevelType = {
  level: string;
  systemPrompt: string;
  modelId: string;
  userPromptTemplate: string;
};

// schema
const schema = z.object({
  brainstorming: z
    .string()
    .describe(
      "Brainstorm various ideas for the article or passage in short phrases."
    ),
  planning: z
    .string()
    .describe(
      "Planning for the passage: a strategy for incorporating vocabulary and grammar features suited to the specified CEFR level, including sentence structures, common phrases, and appropriate linguistic complexity. For nonfiction, focus on a logical organization of ideas and clear transitions; for fiction, consider narrative techniques, character development, and descriptive language. Provide a bullet-point outline covering the structure, key content points, and any specific stylistic or thematic elements to include."
    ),
  title: z
    .string()
    .describe(
      "An interesting title for the article written at the same CEFR level"
    ),
  passage: z
    .string()
    .describe(
      "The reading passage written to the supplied specifications for both CEFR and type."
    ),
  summary: z
    .string()
    .describe(
      "A one-sentence summary of the article written at the same CEFR level"
    ),
  imageDesc: z
    .string()
    .describe(
      "A detailed description of an image to go along with the passage"
    ),
});

export async function generateArticle(
  params: GenerateArticleParams
): Promise<GenerateArticleResponse> {
  const dataFilePath = path.join(
    process.cwd(),
    "data",
    "cefr-level-prompts.json"
  );

  // read prompts from file
  const prompts = readJsonFile<CefrLevelPromptType[]>(dataFilePath);

  // find the level config
  const levelConfig = prompts
    .find((item) => item.type === params.type)
    ?.levels.find((lvl) => lvl.level === params.cefrLevel);

  if (!levelConfig) {
    throw new Error(`level config not found for ${params.cefrLevel}`);
  }

  const userPrompt = levelConfig.userPromptTemplate
    .replace("{genre}", params.genre)
    .replace("{subgenre}", params.subgenre)
    .replace("{topic}", params.topic);

  // generate article
  try {
    console.log(
      `${params.cefrLevel} generating article model ID: ${googleProPrewiew} type: ${params.type}`
    );

    const { object: article } = await generateObject({
      model: google(googleProPrewiew),
      //model: openai(openaiModel),
      schema: schema,
      system: levelConfig.systemPrompt,
      prompt: userPrompt,
      seed: Math.floor(Math.random() * 1000),
      temperature: 1,
    });

    return article;
  } catch (error) {
    throw `failed to generate article: ${error}`;
  }
}
