// import { WordListResponse } from "./audio-words-generator";
import { generateObject } from "ai";
import { openai, openaiModel } from "@/utils/openai";
import { google, googleModel, googleModelLite } from "@/utils/google";
import { VocabularySchema } from "@/lib/zod";

interface GenerateWordListParams {
  passage: string;
}

export type WordListResponse = {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
};

export type GenerateWordListResponse = {
  wordlist: WordListResponse[];
};

export async function generateWordList(
  params: GenerateWordListParams,
): Promise<WordListResponse[]> {
  try {
    const userPrompt = `Extract the ten most difficult vocabulary words, phrases, or idioms from the following passage: ${params.passage}`;

    const { object } = await generateObject({
      model: google(googleModelLite),
      schema: VocabularySchema,
      system: "You are an article database assisstant.",
      prompt: userPrompt,
    });

    return object;
  } catch (error) {
    console.log(error);
    throw `failed to generate audio: ${
      error as unknown
    } \n\n error: ${JSON.stringify((error as any).response.data)}`;
  }
}
