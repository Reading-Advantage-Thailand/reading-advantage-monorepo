import { NextRequest, NextResponse } from "next/server";
import { validateSession, SESSION_COOKIE_NAME, AuthError } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { getAIClient } from "@reading-advantage/ai";
import { sales } from "@reading-advantage/domain";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const chatInputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  lessonId: z.string().optional(),
  moduleId: z.string().optional(),
});

const ROLE_MARKER_SPOOF = /\[(?:REP|COACH)\]:?|(^|\s)(?:REP|COACH):/gi;
function sanitizeRoleMarkers(content: string): string {
  return content.replace(ROLE_MARKER_SPOOF, "$1");
}

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

    const rawBody = await request.json();
    const parsed = chatInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { messages, lessonId, moduleId } = parsed.data;

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
      messages
        .map((m) => `[${m.role === "user" ? "REP" : "COACH"}] ${sanitizeRoleMarkers(m.content)}`)
        .join("\n\n") +
      "\n\n[COACH]:";

    const aiClient = getAIClient();
    const chatModel = process.env.SALES_CHAT_MODEL ?? "nvidia/nemotron-3-nano-30b-a3b:free";

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