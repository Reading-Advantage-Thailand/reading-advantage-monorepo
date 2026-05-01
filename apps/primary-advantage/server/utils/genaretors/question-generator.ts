import { z } from "zod";
import { generateObject } from "ai";
import { openai, openaiModel } from "@/utils/openai";
import { google, googleModel } from "@/utils/google";
import path from "path";
import fs from "fs";
import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";

export interface GenerateQuestionParams<T> {
  cefrlevel: ArticleBaseCefrLevel;
  type: ArticleType;
  passage: string;
  title: string;
  summary: string;
  imageDesc: string;
  promptFile: string;
  schema: z.ZodType<T>;
}

export interface GenerateQuestionResponse<T> {
  question: T;
}

interface PromptsFileType {
  level: string;
  system_prompt: string;
  user_prompt: string;
}

interface PromptFileType {
  fiction: PromptsFileType[];
  nonfiction: PromptsFileType[];
}

export async function generateQuestion<T>(
  params: GenerateQuestionParams<T>
): Promise<GenerateQuestionResponse<T>> {
  try {
    const dataFilePath = path.join(process.cwd(), "data", params.promptFile);
    const rawData = fs.readFileSync(dataFilePath, "utf-8");
    const prompt: PromptFileType = JSON.parse(rawData);

    const prompts = prompt[params.type].find(
      (item) => item.level === params.cefrlevel
    );

    const userPrompt = `${prompts?.user_prompt}\n\nPassage: ${params.passage}\nTitle: ${params.title}\nSummary: ${params.summary}\nImage Description: ${params.imageDesc}`;
    const { object: question } = await generateObject({
      model: google(googleModel),
      schema: params.schema,
      system: prompts?.system_prompt,
      prompt: userPrompt,
      maxTokens: 4000,
    });
    return {
      question,
    };
  } catch (error) {
    console.log(error);
    throw `failed to generate ${params.promptFile
      .replace(".json", "")
      .replace("prompts-combined-", "")} question: ${error}`;
  }
}
