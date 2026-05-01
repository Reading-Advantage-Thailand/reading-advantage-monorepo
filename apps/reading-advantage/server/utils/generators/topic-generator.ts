import { generateObject, generateText } from "ai";
import { ArticleBaseCefrLevel, ArticleType } from "../../models/enum";
import { z } from "zod";
import { openai, openaiModel } from "@/utils/openai";
import { google, googleModel } from "@/utils/google";

interface GenerateTopicParams {
  type: ArticleType;
  genre: string;
  subgenre: string;
  amountPerGenre: number;
}

export interface GenerateTopicResponse {
  topics: string[];
}

export async function generateTopic(
  params: GenerateTopicParams
): Promise<GenerateTopicResponse> {
  //console.log(
  //  `generating topic for ${params.type} ${params.genre} ${params.subgenre} amount: ${params.amountPerGenre}`
  //);
  const prompts = {
    fiction: `Please provide ${params.amountPerGenre} reading passage topics in the ${params.type} ${params.genre} genre and ${params.subgenre} subgenre appropriate for secondary school students. Output as a JSON array.`,
    nonfiction: `Please provide ${params.amountPerGenre} reading passage topics in the ${params.type} ${params.genre} genre and ${params.subgenre} subgenre appropriate for secondary school students. Output as a JSON array.`,
  };
  try {
    const response = await generateObject({
      //model: openai(openaiModel),
      model: google(googleModel),
      schema: z.object({
        topics: z
          .array(z.string())
          .describe("An array of topics")
          .length(params.amountPerGenre),
      }),
      prompt: prompts[params.type],
    });

    return {
      topics: response.object.topics,
    };
  } catch (error) {
    throw new Error(`failed to generate topic: ${error}`);
  }
}
