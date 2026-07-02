import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { z } from "zod";
import { streamText } from "@reading-advantage/ai/internal-sdk";
import { openai, openaiModel5 } from "@/utils/openai";
import { promptLevelTestChat } from "@/data/prompt-level-test-chat";

// Schema for level test chat request
const levelTestChatSchema = z.object({
  messages: z.array(
    z.object({
      text: z.string(),
      sender: z.enum(["user", "bot"]),
    })
  ),
  isInitial: z.boolean().optional().default(false),
  preferredLanguage: z.string().optional().default("en"),
  skipCount: z.number().optional().default(0),
  forceAssessment: z.boolean().optional().default(false),
});

export type LevelTestChatRequest = z.infer<typeof levelTestChatSchema>;

// Zod schema for the assessment JSON returned by the AI. Used to reject
// malformed/missing fields at the boundary rather than forward a 200 with
// `assessment: null`.
const assessmentSchema = z.object({
  level: z.string().min(1),
  sublevel: z.string().min(1),
  explanation: z.string().min(1),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  nextSteps: z.string().min(1),
});

export type LevelTestAssessment = z.infer<typeof assessmentSchema>;

/**
 * Strict variant that REQUIRES the assessment JSON to be parseable and to
 * pass the contract schema. Returns the parsed assessment on success, or a
 * structured error response payload that the caller may surface as a 400.
 */
export function validateAssessment(
  fullMessage: string
):
  | { ok: true; assessment: LevelTestAssessment }
  | { ok: false; error: string } {
  const codeFenceMatch = fullMessage.match(/```json\n?([\s\S]*?)\n?```/);
  let candidate: string | null = null;
  if (codeFenceMatch) {
    candidate = codeFenceMatch[1];
  } else {
    // Fall back to scanning for the first balanced JSON object on its own line.
    const bareMatch = fullMessage.match(/^\s*\{[\s\S]*\}\s*$/m);
    if (bareMatch) {
      candidate = bareMatch[0];
    }
  }
  if (!candidate) {
    return { ok: false, error: "No assessment JSON block found in AI response" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (err) {
    return {
      ok: false,
      error: `Assessment JSON failed to parse: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  const result = assessmentSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: `Assessment JSON is missing required fields: ${result.error.issues
        .map((i) => i.path.join(".") || "(root)")
        .join(", ")}`,
    };
  }
  return { ok: true, assessment: result.data as LevelTestAssessment };
}

// Language display names for instruction
const languageNames: Record<string, string> = {
  en: "English",
  th: "Thai (ภาษาไทย)",
  cn: "Chinese Simplified (简体中文)",
  tw: "Chinese Traditional (繁體中文)",
  vi: "Vietnamese (Tiếng Việt)",
};

/**
 * Build system message for level test chat
 */
function buildSystemMessage(
  isInitial: boolean,
  preferredLanguage: string,
  skipCount: number,
  forceAssessment: boolean
): string {
  const languageName = languageNames[preferredLanguage] || preferredLanguage;

  let languageInstruction = "";
  if (preferredLanguage !== "en") {
    languageInstruction = `\n\n**CRITICAL LANGUAGE INSTRUCTION:** The user's preferred language is ${languageName}.

RULES:
1. ALWAYS conduct the conversation and ask questions in ENGLISH (this is an English proficiency test)
2. When providing the final assessment JSON, you MUST write these fields in ${languageName}:
   - "explanation": Write in ${languageName}
   - "strengths": Each item in the array MUST be in ${languageName}
   - "improvements": Each item in the array MUST be in ${languageName}
   - "nextSteps": Write in ${languageName}
3. Keep ONLY "level" (A1, B1, etc.) and "sublevel" (+, -) in English
4. The friendly closing message before JSON can be in ${languageName}

Example for ${languageName} assessment:
"strengths": ["คำศัพท์ดีสำหรับหัวข้อประจำวัน", "โครงสร้างประโยคชัดเจน"]
"improvements": ["ฝึกใช้ past tense กับกริยาอปกติ", "ฝึกประโยคเงื่อนไข"]`;
  }

  let skipInstruction = "";
  if (skipCount > 0) {
    skipInstruction = `\n\nNote: The user has skipped ${skipCount} question(s). This may indicate difficulty with those topics. Consider this when assessing and adjust question difficulty accordingly. If the user skips frequently, consider moving to easier questions or concluding the assessment early.`;
  }

  let forceAssessmentInstruction = "";
  if (forceAssessment) {
    forceAssessmentInstruction = `\n\nIMPORTANT: The user has requested to end the assessment early or has skipped too many questions. Please provide your assessment now based on the responses you have received so far. Even with limited data, provide your best estimate of their level.`;
  }

  if (isInitial) {
    return `${promptLevelTestChat}${languageInstruction}${skipInstruction}${forceAssessmentInstruction}

Start the conversation now with a warm greeting and your first assessment question. Make it simple and friendly to help the user feel comfortable.`;
  }

  return `${promptLevelTestChat}${languageInstruction}${skipInstruction}${forceAssessmentInstruction}`;
}

/**
 * Parse assessment from AI response
 */
function parseAssessment(fullMessage: string): object | null {
  const result = validateAssessment(fullMessage);
  return result.ok ? result.assessment : null;
}

/**
 * POST /api/v1/level-test/chat
 * Handle level test chat conversation with AI
 */
export async function handleLevelTestChat(req: ExtendedNextRequest) {
  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = levelTestChatSchema.parse(body);

    const {
      messages,
      isInitial,
      preferredLanguage,
      skipCount,
      forceAssessment,
    } = validatedData;

    // Build system message with all context
    const systemMessage = {
      role: "system" as const,
      content: buildSystemMessage(
        isInitial,
        preferredLanguage,
        skipCount,
        forceAssessment
      ),
    };

    // Convert messages from frontend to OpenAI format
    const chatMessages = messages.map((msg) => ({
      role: msg.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: msg.text,
    }));

    // Send to OpenAI with history
    const { textStream } = await streamText({
      temperature: 1,
      model: openai(openaiModel5),
      messages: [systemMessage, ...chatMessages],
    });

    // Collect stream chunks
    const streamChunks: string[] = [];
    for await (const chunk of textStream) {
      if (chunk) {
        streamChunks.push(chunk);
      }
    }

    const fullMessage = streamChunks.join("").trim();

    // Check if this is the final assessment (contains JSON) and enforce the
    // contract: malformed/partial assessments are rejected with 400 rather
    // than forwarded to the client as a 200 + `assessment: null`.
    const validation = validateAssessment(fullMessage);

    // When the caller has asked the AI to force an assessment, treat the
    // absence of a parseable assessment as a contract violation.
    if (forceAssessment && !validation.ok) {
      return NextResponse.json(
        {
          message: "Invalid level test assessment",
          code: "INVALID_ASSESSMENT",
          error: validation.error,
        },
        { status: 400 }
      );
    }

    if (!validation.ok) {
      // Non-forced flow: just omit the assessment field rather than 200 with null.
      return NextResponse.json(
        {
          message: "success",
          sender: "bot",
          text: fullMessage,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      message: "success",
      sender: "bot",
      text: fullMessage,
      assessment: validation.assessment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation Error:", error.errors);
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }

    console.error("Level Test Chat API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
