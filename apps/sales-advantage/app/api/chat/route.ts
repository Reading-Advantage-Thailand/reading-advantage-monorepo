import { NextRequest, NextResponse } from "next/server";
import { validateSession, SESSION_COOKIE_NAME, AuthError } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { getAIClient } from "@reading-advantage/ai";
import { sales } from "@reading-advantage/domain";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const session = await validateSession(db, sessionToken);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;

    const rateLimit = checkRateLimit(`sales:chat:${user.id}`, 30, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    try {
      sales.authorizeSalesChat({ user });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    const body = await request.json();
    const { messages, lessonId, moduleId } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const systemPrompt = [
      "You are an expert sales coach for Reading Advantage Thailand, drawing from:",
      "- SPIN Selling (Situation, Problem, Implication, Need-payoff)",
      "- Sandler 7-step methodology",
      "- The Challenger Sale (Teach-Tailor-Take Control)",
      "- 'Never Split the Difference' (active listening, mirroring, labeling)",
      "",
      "Your job is to coach the rep on HOW to sell effectively — not just product features.",
      "Focus on: discovery questions, listening, framing value in the buyer's language,",
      "handling objections without discounting, asking for the order.",
      "",
      "Always respond in Thai (ภาษาไทย).",
      "Be concise (under 200 words) and give practical examples.",
      lessonId ? `Lesson context: ${lessonId}.` : "",
      moduleId ? `Module context: ${moduleId}.` : "",
    ].filter(Boolean).join(" ");

    const fullPrompt =
      systemPrompt +
      "\n\n" +
      messages.map((m: { role: string; content: string }) => `${m.role === "user" ? "REP" : "COACH"}: ${m.content}`).join("\n\n") +
      "\n\nCOACH:";

    const aiClient = getAIClient();
    const chatModel = process.env.SALES_CHAT_MODEL ?? "nvidia/nemotron-3-nano-30b-a3b:free";

    // Use streamText for incremental response
    const stream = await aiClient.streamText({
      prompt: fullPrompt,
      model: chatModel,
      temperature: 0.7,
      maxTokens: 512,
    });

    return stream.toDataStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat unavailable" }, { status: 500 });
  }
}