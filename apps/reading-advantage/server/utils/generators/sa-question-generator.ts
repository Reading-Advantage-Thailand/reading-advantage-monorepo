import { z } from "zod";
import { ArticleBaseCefrLevel, ArticleType } from "../../models/enum";
import { generateQuestion, GenerateQuestionParams } from "./question-generator";

interface GenrateSAQuestionParams {
    cefrlevel: ArticleBaseCefrLevel,
    type: ArticleType,
    passage: string,
    title: string,
    summary: string,
    imageDesc: string
}

interface GenerateSAQuestionResponse {
    questions: {
        question_number: number;
        question: string;
        suggested_answer: string;
    }[];
}

export async function generateSAQuestion(params: GenrateSAQuestionParams): Promise<GenerateSAQuestionResponse> {
    // schema
    const schema = z.object({
        questions: z
            .array(
                z.object({
                    question_number: z.number(),
                    question: z.string(),
                    suggested_answer: z.string(),
                })
            )
            .length(5),
    });
    // generate question params
    const generateParams: GenerateQuestionParams<GenerateSAQuestionResponse> = {
        type: params.type,
        passage: params.passage,
        title: params.title,
        summary: params.summary,
        imageDesc: params.imageDesc,
        schema: schema,
        promptFile: "prompts-combined-SA.json",
        modelId: "gpt-4o-mini",
        cefrlevel: params.cefrlevel,
    }
    // generate question
    const generateQuestionResponse = await generateQuestion<GenerateSAQuestionResponse>(generateParams);
    return generateQuestionResponse.question;
}