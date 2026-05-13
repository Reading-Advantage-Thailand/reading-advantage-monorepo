import { NextRequest } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

const SYSTEM_PROMPT = `You are CodeCamp Advantage AI Tutor, an expert in Next.js, React, TypeScript, and monorepo architecture.

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

Be concise, practical, and reference actual files when helpful. If asked about code, provide working TypeScript examples that follow the monorepo conventions.`;

export async function POST(req: NextRequest) {
  try {
    const { message, lessonId: _lessonId, moduleId: _moduleId } = await req.json();

    if (!message || typeof message !== "string") {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Fallback if no API key is configured
    if (!process.env.GOOGLE_AI_API_KEY) {
      return Response.json({
        response: `[AI Tutor fallback mode — GOOGLE_AI_API_KEY not configured]\n\nYou asked: "${message}"\n\nIn production, this would stream a response from Google's Gemini model grounded in the monorepo's architecture patterns.`,
      });
    }

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system: SYSTEM_PROMPT,
      prompt: message,
      maxTokens: 2048,
    });

    return Response.json({ response: text });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
