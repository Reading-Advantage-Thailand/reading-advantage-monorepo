import { NextRequest, NextResponse } from "next/server";
import {
  AuthError,
} from "@reading-advantage/auth";
import { getAIClient } from "@reading-advantage/ai";
import { authorizeSalesChat } from "@reading-advantage/domain/sales";
import { checkRateLimit } from "@/lib/rate-limit";
import { authenticateSalesRequest } from "@/lib/company-oidc";
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

const BARE_MARKER_SPOOF = /(^|\s)(REP|COACH):/gi;
const BRACKETED_MARKER_SPOOF = /\[(?:REP|COACH)\]:/gi;

/**
 * Strips role-marker spoof tokens (bare and bracket-prefixed) from user-provided
 * text to prevent prompt-injection via turn-spoofing.  The two-pass design
 * avoids the empty-$1 ambiguity of a single alternation regex when the
 * bracket-prefixed branch matches.
 */
function sanitizeRoleMarkers(content: string): string {
  return content
    .replace(BARE_MARKER_SPOOF, "$1")
    .replace(BRACKETED_MARKER_SPOOF, "");
}

/**
 * Sanitizes a context-scope identifier (lessonId / moduleId) by stripping
 * newlines and role-marker spoof tokens so it cannot inject turn separators
 * into the system prompt.
 */
function sanitizeContextId(value: string): string {
  return sanitizeRoleMarkers(value.replace(/\n/g, " "));
}

export async function POST(request: NextRequest) {
  try {
    const principal = await authenticateSalesRequest(request);
    if (!principal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user } = principal;
    const rateLimit = checkRateLimit(`sales:chat:${user.id}`, 30, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    try {
      authorizeSalesChat({ user });
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
      lessonId ? `Lesson context: ${sanitizeContextId(lessonId)}.` : "",
      moduleId ? `Module context: ${sanitizeContextId(moduleId)}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const fullPrompt =
      systemPrompt +
      "\n\n" +
      messages
        .map(
          (m) =>
            `[${m.role === "user" ? "REP" : "COACH"}] ${sanitizeRoleMarkers(m.content)}`,
        )
        .join("\n\n") +
      "\n\n[COACH]:";

    const aiClient = getAIClient();
    const chatModel =
      process.env.SALES_CHAT_MODEL ?? "nvidia/nemotron-3-nano-30b-a3b:free";

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
