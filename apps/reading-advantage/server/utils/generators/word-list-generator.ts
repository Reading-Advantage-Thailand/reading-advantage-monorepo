import { WordListResponse } from "./audio-words-generator";
import { generateObject } from "ai";
import { openai, openaiModel } from "@/utils/openai";
import { google, googleModel, googleModelAudio } from "@/utils/google";
import { z } from "zod";

interface GenerateWordListParams {
  passage: string;
}

export type GenerateWordListResponse = {
  word_list: WordListResponse[];
};

export async function generateWordList(
  params: GenerateWordListParams
): Promise<GenerateWordListResponse> {
  try {
    const userPrompt = `Extract the ten most difficult vocabulary words, phrases, or idioms from the following passage: ${params.passage}`;

    // const schema = {
    //   type: "object",
    //   properties: {
    //     word_list: {
    //       type: "array",
    //       items: {
    //         type: "object",
    //         properties: {
    //           vocabulary: {
    //             type: "string",
    //             description: "A difficult vocabulary word, phrase, or idiom.",
    //           },
    //           definition: {
    //             type: "object",
    //             properties: {
    //               en: {
    //                 type: "string",
    //                 description:
    //                   "The English definition of the vocabulary in simple language.",
    //               },
    //               th: {
    //                 type: "string",
    //                 description: "The Thai translation of the vocabulary.",
    //               },
    //               cn: {
    //                 type: "string",
    //                 description:
    //                   "The Simplified Chinese translation of the vocabulary.",
    //               },
    //               tw: {
    //                 type: "string",
    //                 description:
    //                   "The Traditional Chinese translation of the vocabulary.",
    //               },
    //               vi: {
    //                 type: "string",
    //                 description:
    //                   "The Vietnamese translation of the vocabulary.",
    //               },
    //             },
    //           },
    //         },
    //       },
    //     },
    //   },
    //   required: ["word_list"],
    // };

    const vocabularySchema = z.object({
      vocabulary: z
        .string()
        .describe("A difficult vocabulary word, phrase, or idiom."),
      definition: z.object({
        en: z
          .string()
          .describe(
            "The English definition of the vocabulary in simple language."
          ),
        th: z.string().describe("The Thai translation of the vocabulary."),
        cn: z
          .string()
          .describe("The Simplified Chinese translation of the vocabulary."),
        tw: z
          .string()
          .describe("The Traditional Chinese translation of the vocabulary."),
        vi: z
          .string()
          .describe("The Vietnamese translation of the vocabulary."),
      }),
    });

    const schema = z
      .object({
        word_list: z
          .array(vocabularySchema)
          .describe("A list of vocabulary objects with their translations."),
      })
      .required();

    const { object: response } = await generateObject({
      model: google(googleModelAudio),
      schema,
      system: "You are an article database assisstant.",
      prompt: userPrompt,
    });

    // const response = await openai.chat.completions.create({
    //   model: "gpt-4o-mini",
    //   messages: [
    //     {
    //       role: "system",
    //       content: "You are an article database assisstant.",
    //     },
    //     { role: "user", content: `${userPrompt}` },
    //   ],
    //   functions: [
    //     {
    //       name: "extract_difficult_vocabulary",
    //       description:
    //         "Extracts the ten most difficult vocabulary words, phrases, or idioms from a given passage and provides their definitions or translations in multiple languages.",
    //       parameters: schema,
    //     },
    //   ],
    //   function_call: {
    //     name: "extract_difficult_vocabulary",
    //   },
    //   temperature: 0.7,
    // });

    // const resultWordList = await JSON.parse(
    //   response.choices[0].message.function_call?.arguments as string
    // )?.word_list;

    return response;
  } catch (error) {
    console.log(error);
    throw `failed to generate audio: ${
      error as unknown
    } \n\n error: ${JSON.stringify((error as any).response.data)}`;
  }
}
