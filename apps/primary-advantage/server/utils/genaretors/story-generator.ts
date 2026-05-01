import { generateObject } from "ai";
import { google, googleModel } from "@/utils/google";
import { storyGeneratorSchema } from "@/lib/zod";
import { z } from "zod";

export interface GenerateStoryParams {
  cefrLevel: string;
  genre?: string;
  topic?: string;
}

export type GenerateStoryResponse = z.infer<typeof storyGeneratorSchema>;

const SYSTEM_PROMPT = `You are an expert creative writer and language educator specializing in creating engaging stories for English language learners. Your task is to generate a complete story with multiple chapters, characters, and educational exercises tailored to a specific CEFR level.

Guidelines:
1.  **CEFR Level Compliance:** The vocabulary, grammar, sentence structure, and story complexity must strictly adhere to the specified CEFR level.
2.  **Story Structure:** Create a cohesive narrative with a clear beginning, middle, and end, divided into chapters.
3.  **Engagement:** The story should be interesting, age-appropriate, and culturally inclusive.
4.  **Educational Content:**
    *   **Vocabulary:** Identify key vocabulary words appropriate for the level.
    *   **Questions:** Create multiple-choice, short-answer, and long-answer questions that test comprehension and critical thinking.
    *   **Translations:** Provide accurate translations for summaries, sentences, and vocabulary in Thai (th), Simplified Chinese (cn), Traditional Chinese (tw), and Vietnamese (vi).

Output Format:
Generate a JSON object matching the provided schema. Ensure all fields are populated and formatted correctly.`;

export async function generateStoryContent(
  params: GenerateStoryParams,
): Promise<GenerateStoryResponse> {
  try {
    console.log(
      `${params.cefrLevel} generating story model ID: ${googleModel}`,
    );

    const userPrompt = `Create a story for English learners at CEFR level ${
      params.cefrLevel
    }.
    ${params.genre ? `Genre: ${params.genre}` : ""}
    ${params.topic ? `Topic: ${params.topic}` : ""}
    
    The story should have engaging characters and a compelling plot. Include 3-5 chapters.`;

    const { object: story } = await generateObject({
      model: google(googleModel),
      schema: storyGeneratorSchema,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 1,
      maxTokens: 8192, // Increase max tokens for longer content
    });

    return story;
  } catch (error) {
    console.error("Error generating story:", error);
    throw new Error(`Failed to generate story: ${error}`);
  }
}
