import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import { MCQuestionSchema } from "@/lib/zod";
import { generateQuestion, GenerateQuestionParams } from "./question-generator";

interface GenrateMCQuestionParams {
  cefrlevel: ArticleBaseCefrLevel;
  type: ArticleType;
  passage: string;
  title: string;
  summary: string;
  imageDesc: string;
}

interface GenerateMCQuestionResponse {
  questions: {
    question_number: number;
    question: string;
    answer: string;
    options: string[];
    textual_evidence: string;
  }[];
}

export async function generateMCQuestion(
  params: GenrateMCQuestionParams
): Promise<GenerateMCQuestionResponse> {
  // generate question params
  const generateParams: GenerateQuestionParams<GenerateMCQuestionResponse> = {
    type: params.type,
    passage: params.passage,
    title: params.title,
    summary: params.summary,
    imageDesc: params.imageDesc,
    schema: MCQuestionSchema,
    promptFile: "prompts-combined-MC.json",
    cefrlevel: params.cefrlevel,
  };
  // generate question
  const generateQuestionResponse =
    await generateQuestion<GenerateMCQuestionResponse>(generateParams);
  return generateQuestionResponse.question;
}
