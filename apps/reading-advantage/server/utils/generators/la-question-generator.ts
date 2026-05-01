import { z } from "zod";
import { ArticleBaseCefrLevel, ArticleType } from "../../models/enum";
import { generateQuestion, GenerateQuestionParams } from "./question-generator";

interface GenrateLAQuestionParams {
    cefrlevel: ArticleBaseCefrLevel,
    type: ArticleType,
    passage: string,
    title: string,
    summary: string,
    imageDesc: string
}

interface GenerateLAQuestionResponse {
    question: string;
}

export async function generateLAQuestion(params: GenrateLAQuestionParams): Promise<GenerateLAQuestionResponse> {
    // schema
    const schema = z.object({
        question: z.string(),
    });
    // generate question params
    const generateParams: GenerateQuestionParams<GenerateLAQuestionResponse> = {
        type: params.type,
        passage: params.passage,
        title: params.title,
        summary: params.summary,
        imageDesc: params.imageDesc,
        schema: schema,
        promptFile: "prompts-combined-LA.json",
        modelId: "gpt-4o-mini",
        cefrlevel: params.cefrlevel,
    }
    // generate question
    const generateQuestionResponse = await generateQuestion<GenerateLAQuestionResponse>(generateParams);
    return generateQuestionResponse.question;
}