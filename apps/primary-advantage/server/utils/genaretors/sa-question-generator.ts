import { z } from "zod";
import { generateQuestion, GenerateQuestionParams } from "./question-generator";
import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import { SAQuestionSchema } from "@/lib/zod";

interface GenrateSAQuestionParams {
  cefrlevel: ArticleBaseCefrLevel;
  type: ArticleType;
  passage: string;
  title: string;
  summary: string;
  imageDesc: string;
}

interface GenerateSAQuestionResponse {
  questions: {
    question_number: number;
    question: string;
    answer: string;
  }[];
}

export async function generateSAQuestion(
  params: GenrateSAQuestionParams
): Promise<GenerateSAQuestionResponse> {
  // schema

  // generate question params
  const generateParams: GenerateQuestionParams<GenerateSAQuestionResponse> = {
    type: params.type,
    passage: params.passage,
    title: params.title,
    summary: params.summary,
    imageDesc: params.imageDesc,
    schema: SAQuestionSchema,
    promptFile: "prompts-combined-SA.json",
    cefrlevel: params.cefrlevel,
  };
  // generate question
  const generateQuestionResponse =
    await generateQuestion<GenerateSAQuestionResponse>(generateParams);
  return generateQuestionResponse.question;
}
