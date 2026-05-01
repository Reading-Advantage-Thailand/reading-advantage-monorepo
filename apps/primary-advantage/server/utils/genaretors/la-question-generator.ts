import { generateQuestion, GenerateQuestionParams } from "./question-generator";
import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import { LAQuestionSchema } from "@/lib/zod";

interface GenrateLAQuestionParams {
  cefrlevel: ArticleBaseCefrLevel;
  type: ArticleType;
  passage: string;
  title: string;
  summary: string;
  imageDesc: string;
}

interface GenerateLAQuestionResponse {
  question: string;
}

export async function generateLAQuestion(
  params: GenrateLAQuestionParams
): Promise<GenerateLAQuestionResponse> {
  // generate question params
  const generateParams: GenerateQuestionParams<GenerateLAQuestionResponse> = {
    type: params.type,
    passage: params.passage,
    title: params.title,
    summary: params.summary,
    imageDesc: params.imageDesc,
    schema: LAQuestionSchema,
    promptFile: "prompts-combined-LA.json",
    cefrlevel: params.cefrlevel,
  };
  // generate question
  const generateQuestionResponse =
    await generateQuestion<GenerateLAQuestionResponse>(generateParams);
  return generateQuestionResponse.question;
}
