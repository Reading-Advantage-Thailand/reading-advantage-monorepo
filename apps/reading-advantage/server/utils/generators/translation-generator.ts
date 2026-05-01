import { generateObject } from "ai";
import { google, googleModel } from "@/utils/google";
import { z } from "zod";

interface TranslateSummaryParams {
  summary: string;
}

interface TranslatePassageParams {
  passage: string;
}

interface TranslatePassageFromSentencesParams {
  sentences: string[];
}

export type TranslatedSummaryResponse = {
  cn: string;
  en: string;
  th: string;
  tw: string;
  vi: string;
};

export type TranslatedPassageResponse = {
  cn: string[];
  en: string[];
  th: string[];
  tw: string[];
  vi: string[];
};

export async function generateTranslatedSummary(
  params: TranslateSummaryParams,
  maxRetries: number = 3
): Promise<TranslatedSummaryResponse> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const userPrompt = `Translate the following summary into Simplified Chinese (cn), Traditional Chinese (tw), Thai (th), and Vietnamese (vi). Keep the English version (en) as is: ${params.summary}`;

      const schema = z.object({
        cn: z.string().describe("Simplified Chinese translation of the summary"),
        en: z.string().describe("English version of the summary (original)"),
        th: z.string().describe("Thai translation of the summary"),
        tw: z.string().describe("Traditional Chinese translation of the summary"),
        vi: z.string().describe("Vietnamese translation of the summary"),
      });

      const { object: response } = await generateObject({
        model: google(googleModel),
        schema,
        system: "You are a professional translator. Translate the given text accurately while maintaining the original meaning and tone.",
        prompt: userPrompt,
      });

      return response;
    } catch (error) {
      lastError = error;
      console.error(`Error generating translated summary (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // If all retries failed, throw the error to be handled by calling function
  throw new Error(`Failed to generate translated summary after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

export async function generateTranslatedPassage(
  params: TranslatePassageParams,
  maxRetries: number = 3
): Promise<TranslatedPassageResponse> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Split passage into sentences for better translation handling
      const sentences = params.passage
        .split(/[.!?]+/)
        .filter(sentence => sentence.trim().length > 0)
        .map(sentence => sentence.trim() + (sentence.endsWith('.') || sentence.endsWith('!') || sentence.endsWith('?') ? '' : '.'));

      const userPrompt = `Translate the following passage into Simplified Chinese (cn), Traditional Chinese (tw), Thai (th), and Vietnamese (vi). Keep the English version (en) as is. Return each sentence as a separate array element. Passage: ${params.passage}`;

      const schema = z.object({
        cn: z.array(z.string()).describe("Simplified Chinese translation of each sentence"),
        en: z.array(z.string()).describe("English version of each sentence (original)"),
        th: z.array(z.string()).describe("Thai translation of each sentence"),
        tw: z.array(z.string()).describe("Traditional Chinese translation of each sentence"),
        vi: z.array(z.string()).describe("Vietnamese translation of each sentence"),
      });

      const { object: response } = await generateObject({
        model: google(googleModel),
        schema,
        system: "You are a professional translator. Translate the given passage sentence by sentence accurately while maintaining the original meaning and tone. Return each sentence as a separate array element.",
        prompt: userPrompt,
      });

      return response;
    } catch (error) {
      lastError = error;
      console.error(`Error generating translated passage (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // If all retries failed, throw the error to be handled by calling function
  throw new Error(`Failed to generate translated passage after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

export async function generateTranslatedPassageFromSentences(
  params: TranslatePassageFromSentencesParams,
  maxRetries: number = 3
): Promise<TranslatedPassageResponse> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use the pre-split sentences directly
      const sentences = params.sentences;
      const passageText = sentences.join(' ');

      const userPrompt = `Translate the following passage into Simplified Chinese (cn), Traditional Chinese (tw), Thai (th), and Vietnamese (vi). Keep the English version (en) as is. The passage has been pre-split into ${sentences.length} sentences. Return each sentence as a separate array element. Passage: ${passageText}`;

      const schema = z.object({
        cn: z.array(z.string()).describe("Simplified Chinese translation of each sentence"),
        en: z.array(z.string()).describe("English version of each sentence (original)"),
        th: z.array(z.string()).describe("Thai translation of each sentence"),
        tw: z.array(z.string()).describe("Traditional Chinese translation of each sentence"),
        vi: z.array(z.string()).describe("Vietnamese translation of each sentence"),
      });

      const { object: response } = await generateObject({
        model: google(googleModel),
        schema,
        system: `You are a professional translator. Translate the given passage sentence by sentence accurately while maintaining the original meaning and tone. The passage has been pre-split into exactly ${sentences.length} sentences. Return exactly ${sentences.length} translated sentences in each language array, maintaining the same sentence structure as the original.`,
        prompt: userPrompt,
      });

      // Ensure the response arrays match the input sentence count
      const expectedLength = sentences.length;
      if (response.en.length !== expectedLength) {
        response.en = sentences; // Use the original sentences for English
      }

      return response;
    } catch (error) {
      lastError = error;
      console.error(`Error generating translated passage from sentences (attempt ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // If all retries failed, throw the error to be handled by calling function
  throw new Error(`Failed to generate translated passage from sentences after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}