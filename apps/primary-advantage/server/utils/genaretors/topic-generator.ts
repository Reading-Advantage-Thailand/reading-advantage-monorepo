import { generateObject } from "ai";
import { z } from "zod";
import { google, googleModel } from "@/utils/google";
import { ArticleType } from "@/types/enum";

interface GenerateTopicParams {
  type: ArticleType;
  genre: string;
  subgenre: string;
  // amountPerGenre?: number;
}

export interface GenerateTopicResponse {
  genre: string;
  subgenre: string;
  topics?: string;
}

export async function generateTopic(
  params: GenerateTopicParams
): Promise<GenerateTopicResponse> {
  const prompts = {
    fiction: `Please provide 1 reading passage topics in the ${params.type} ${params.genre} genre and ${params.subgenre} subgenre appropriate for secondary school students. Output as a JSON array.`,
    nonfiction: `Please provide 1 reading passage topics in the ${params.type} ${params.genre} genre and ${params.subgenre} subgenre appropriate for secondary school students. Output as a JSON array.`,
  };
  try {
    const { object } = await generateObject({
      model: google(googleModel),
      schema: z.object({
        topics: z.string(),
      }),
      prompt: prompts[params.type],
    });

    return {
      genre: params.genre,
      subgenre: params.subgenre,
      topics: object.topics,
    };
  } catch (error) {
    throw new Error(`failed to generate topic: ${error}`);
  }
}
