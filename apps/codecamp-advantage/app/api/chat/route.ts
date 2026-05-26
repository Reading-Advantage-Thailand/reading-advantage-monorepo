import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@reading-advantage/db";
import { requireAuth } from "@reading-advantage/auth";
import { getAuthToken } from "@reading-advantage/api/context";
import { createTenantDB } from "@reading-advantage/domain";
import { getChatContext } from "@reading-advantage/domain/codecamp";
import { checkChatRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

function buildSystemPrompt(locale: string): string {
  const thaiInstruction = `Respond in Thai (ภาษาไทย) by default. **Mirror the user: if the user writes entirely in English, answer in English; otherwise answer in Thai.**
Note: The lesson content is written in English, not Thai. If the user asks about lesson content or wants it explained, you may translate it to Thai on request.`;
  const englishInstruction = `Respond in English by default. Mirror the user's language if they switch.
Note: The lesson content is in English, which is the default language for all materials.`;

  const effectiveLocale = locale === "en" ? "en" : "th";
  const languageInstruction = effectiveLocale === "th" ? thaiInstruction : englishInstruction;

  return `You are CodeCamp Advantage AI Tutor, an expert in Next.js, React, TypeScript, and monorepo architecture.

You teach the Reading Advantage monorepo patterns:
- Next.js 16 App Router with Server Components
- tRPC with thin routers and thick domain functions in packages/domain
- Drizzle ORM for database queries with multi-tenant scoping
- Cookie-based auth with roles (STUDENT, TEACHER, ADMIN, SYSTEM)
- Turborepo monorepo with shared packages (@reading-advantage/ui, @reading-advantage/db, etc.)

Key architectural principles:
1. Domain functions receive { db, user, tenant, input } and call assertCan() first
2. Routers are thin — they validate input and delegate to domain
3. TenantDB automatically injects schoolId into queries
4. All workspace packages build to dist/ and export built output

Be concise, practical, and reference actual files when helpful. If asked about code, provide working TypeScript examples that follow the monorepo conventions.

${languageInstruction}`;
}

const chatInputSchema = z.object({
  message: z.string().min(1).max(4000),
  lessonId: z.string().uuid().optional(),
  moduleId: z.string().uuid().optional(),
  locale: z.enum(["th", "en"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate using shared token helper
    const token = await getAuthToken();
    const session = await requireAuth(db, token);

    // Create tenant context for domain function
    const tenantDb = createTenantDB(db, { schoolId: session.user.schoolId });
    const user = session.user;
    const tenant = { schoolId: session.user.schoolId };

    // Rate limit check
    const rateCheck = checkChatRateLimit(session.user.id);
    if (!rateCheck.allowed) {
      return Response.json(
        { error: "Rate limit exceeded", retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = chatInputSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { message, moduleId, lessonId, locale } = parsed.data;

    // Fallback if no API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      return Response.json({
        response: `[AI Tutor fallback mode — OPENROUTER_API_KEY not configured]\n\nYou asked: "${message}"\n\nIn production, this would stream a response from OpenRouter grounded in the monorepo's architecture patterns.`,
      });
    }

    // Fetch module/lesson context through domain layer (with auth check)
    const contextAddition = await getChatContext({
      db: tenantDb,
      user,
      tenant,
      input: { moduleId, lessonId },
    });

    const systemPrompt = buildSystemPrompt(locale ?? "th") + contextAddition;

    const result = streamText({
      model: openrouter("xiaomi/mimo-v2.5"),
      system: systemPrompt,
      prompt: message,
      maxTokens: 2048,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication required") {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
