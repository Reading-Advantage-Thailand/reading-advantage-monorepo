import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import z from "zod";
import { consumeRateLimit, createInMemoryRateLimitStore } from "@reading-advantage/auth";
import { chatbotClient, loggedAiCall } from "@/lib/ai/models";
import { logger } from "@/lib/observability/logger";
import { currentUser } from "@/lib/session";
import { getLessonChatbotContext } from "@/server/models/articleModel";

/** The client names the article; the server loads its text. Unknown keys are refused. */
const createLessonChatbotQuestionSchema = z.object({
  articleId: z.string().uuid(),
  messages: z.array(
    z.object({
      text: z.string().max(4000),
      sender: z.enum(["user", "bot"]),
    }),
  ).max(60),
  isInitial: z.boolean().optional().default(false),
}).strict();

/** At most 40 chatbot calls in 10 minutes for one user on one instance. */
const LIMIT = { windowMs: 10 * 60_000, maxAttempts: 40 };
const limits = createInMemoryRateLimitStore();

/**
 * Answers one lesson chatbot turn about a stored article.
 * @param request A JSON body: the article id, the conversation so far, and the opening flag.
 * @returns 201 with the bot text; 400 for a bad body; 401 when signed out; 404 for a missing or
 * draft article; 429 after 40 calls in 10 minutes; 500 when the model call fails.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await consumeRateLimit(limits, `lesson-chatbot:${user.id}`, LIMIT)).allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const param = await request.json();
    const { articleId, messages, isInitial } = createLessonChatbotQuestionSchema.parse(param);

    const article = await getLessonChatbotContext(articleId);
    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }
    const { title, passage, summary, imageDescription: image_description, questions: blacklistedQuestions } = article;

    // เตรียม system prompt ตามว่าเริ่มบทสนทนาใหม่หรือไม่
    const blacklistedQuestionsText =
      blacklistedQuestions && blacklistedQuestions.length > 0
        ? `\n\nBlacklisted Questions (DO NOT answer these):\n${blacklistedQuestions.map((q, index) => `${index + 1}. ${q}`).join("\n")}`
        : "";

    const system = isInitial
        ? `You are a helpful and friendly AI English language tutor. Start the conversation by asking the user one engaging, open-ended question related to the following article to encourage reflection or discussion. Do not answer anything yet.
    
    **IMPORTANT RULES:**
    - You can answer questions about the article content, vocabulary, grammar, language learning, pronunciation, and related educational topics.
    - You can explain vocabulary words, grammar structures, and language concepts from the article.
    - You can provide translation help and explanations in Thai when requested.
    - Do NOT respond to inquiries about comprehension questions from the lesson.
    - For any questions completely unrelated to language learning or the article topic, respond with: "I am sorry, but I can only discuss the current article and help with English language learning. Let me ask you something related to the content instead."
    - Always respond in the language of the user's question. If the user asks in Thai, explain in Thai.
    - Always recommend a next step or question in the conversation after answering.
    
    Article:
    Title: "${title}"
    Summary: "${summary}"
    Passage: "${passage}"
    Image Description: "${image_description}"${blacklistedQuestionsText}`
        : `You are an AI English tutor helping with conversation practice and language learning about a specific article. You are here to help students improve their English skills.
    
    **IMPORTANT RULES:**
    - You can answer questions about the article content, vocabulary, grammar, pronunciation, and language learning concepts.
    - You can explain difficult words, phrases, and grammar structures from the article.
    - You can provide translations and explanations in Thai when students need clarification.
    - You can discuss vocabulary that students should learn from the article.
    - You can help with understanding the meaning and usage of words and phrases.
    - Do NOT respond to inquiries about comprehension questions from the lesson - instead respond with: "That is one of our article's comprehension questions that you must answer on your own, so I can't help you with that. Sorry."
    - If the user asks any of the blacklisted questions, respond with: "That is one of our article's comprehension questions that you must answer on your own, so I can't help you with that. Sorry."
    - For questions completely unrelated to the article or English language learning, respond with: "I am sorry, but I can only help with the current article and English language learning. Let me redirect our conversation back to the content."
    - Always respond in the language of the user's question. If the user asks in Thai, explain in Thai.
    - After answering, provide helpful feedback and ask a related follow-up question.
    
    **TOPICS YOU CAN HELP WITH:**
    - Vocabulary explanations and usage
    - Grammar structures in the article
    - Pronunciation guidance
    - Translation and Thai explanations
    - Article content discussion
    - Language learning tips related to the article
    
    When the user asks appropriate questions, you should:
    1. Correct any grammar or sentence structure errors in their question (if any).
    2. Answer their question about the article content, vocabulary, or language learning.
    3. Provide constructive feedback and encouragement.
    4. Ask a related follow-up question to continue the conversation.
    
    Use clear, friendly, and helpful language. Be specific about what they did well and how they can improve.
    
    Article:
    Title: "${title}"
    Summary: "${summary}"
    Passage: "${passage}"
    Image Description: "${image_description}"${blacklistedQuestionsText}`;


    // แปลงข้อความทั้งหมดจาก frontend เป็น messages สำหรับ OpenAI
    // The opening call (isInitial) has no messages yet, and the model refuses an empty list
    // ("messages must not be empty"): one user turn asks the bot to start.
    const chatMessages = messages.length
      ? messages.map((msg) => ({
          role: msg.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: msg.text,
        }))
      : [{ role: "user" as const, content: "Please start." }];


    const fullMessage = await loggedAiCall("chatbot.stream", async () => {
      const { textStream } = await chatbotClient().streamText({
        system,
        messages: chatMessages,
      });
      const streamChunks: string[] = [];
      for await (const chunk of textStream) {
        if (chunk && chunk !== "{" && chunk !== "}") {
          streamChunks.push(chunk);
        }
      }
      return streamChunks.join("").trim();
    });


    return NextResponse.json(
      {
        messages: "success",
        sender: "bot",
        text: fullMessage,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("lesson_chatbot_validation_error", { issues: error.errors });
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }

    logger.error("lesson_chatbot_error", { error });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
