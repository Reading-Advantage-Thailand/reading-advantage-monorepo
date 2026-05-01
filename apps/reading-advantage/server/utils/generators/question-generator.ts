import { ArticleBaseCefrLevel, ArticleType } from "../../models/enum";
import { z } from "zod";
import { readJsonFile } from "../read-json";
import { generateObject } from "ai";
import { openai, openaiModel } from "@/utils/openai";
import { google, googleModel } from "@/utils/google";
import path from "path";

export interface GenerateQuestionParams<T> {
  cefrlevel: ArticleBaseCefrLevel;
  type: ArticleType;
  passage: string;
  title: string;
  summary: string;
  imageDesc: string;
  promptFile: string;
  modelId: string;
  schema: z.ZodType<T>;
}

export interface GenerateQuestionResponse<T> {
  question: T;
}

interface PromptFileType {
  fiction: {
    A1: { level: string; system_prompt: string; user_prompt: string };
    A2: { level: string; system_prompt: string; user_prompt: string };
    B1: { level: string; system_prompt: string; user_prompt: string };
    B2: { level: string; system_prompt: string; user_prompt: string };
    C1: { level: string; system_prompt: string; user_prompt: string };
    C2: { level: string; system_prompt: string; user_prompt: string };
  };
  nonfiction: {
    A1: { level: string; system_prompt: string; user_prompt: string };
    A2: { level: string; system_prompt: string; user_prompt: string };
    B1: { level: string; system_prompt: string; user_prompt: string };
    B2: { level: string; system_prompt: string; user_prompt: string };
    C1: { level: string; system_prompt: string; user_prompt: string };
    C2: { level: string; system_prompt: string; user_prompt: string };
  };
}

export async function generateQuestion<T>(
  params: GenerateQuestionParams<T>
): Promise<GenerateQuestionResponse<T>> {
  try {
    const dataFilePath = path.join(process.cwd(), "data", params.promptFile);
    const prompt = readJsonFile<PromptFileType>(dataFilePath);

    const normalizedCefrLevel = params.cefrlevel
      .replace(/[+-]/g, "")
      .toUpperCase() as keyof PromptFileType["fiction"];

    if (!prompt[params.type]) {
      throw new Error(`Type '${params.type}' not found in prompt file`);
    }

    if (!prompt[params.type][normalizedCefrLevel]) {
      throw new Error(
        `CEFR level '${normalizedCefrLevel}' not found for type '${params.type}' in prompt file`
      );
    }

    const { system_prompt, user_prompt } =
      prompt[params.type][normalizedCefrLevel];

    const userPrompt = `${user_prompt}\n\nPassage: ${params.passage}\nTitle: ${params.title}\nSummary: ${params.summary}\nImage Description: ${params.imageDesc}`;

    console.log(
      `Generating ${params.promptFile} - Model: ${params.modelId}, Type: ${params.type}, CEFR: ${normalizedCefrLevel}`
    );

    const { object: question } = await generateObject({
      model: google(googleModel),
      schema: params.schema,
      system: system_prompt,
      prompt: userPrompt,
      maxTokens: 4000,
    });

    return {
      question,
    };
  } catch (error) {
    console.error("Error in generateQuestion:", error);
    throw `failed to generate ${params.promptFile
      .replace(".json", "")
      .replace("prompts-combined-", "")} question: ${error}`;
  }
}
