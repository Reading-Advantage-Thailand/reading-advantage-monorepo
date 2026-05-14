import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@reading-advantage/db";
import { requireAuth } from "@reading-advantage/auth";
import { getAuthToken } from "@reading-advantage/api/context";
import { createTenantDB } from "@reading-advantage/domain";
import { getChatContext } from "@reading-advantage/domain/codecamp";
import { z } from "zod";

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const BASE_SYSTEM_PROMPT = `You are CodeCamp Advantage AI Tutor, an expert in Next.js, React, TypeScript, and monorepo architecture.

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

const chatInputSchema = z.object({
  message: z.string().min(1).max(4000),
  lessonId: z.string().uuid().optional(),
  moduleId: z.string().uuid().optional(),
});

// ─── Per-user rate limiting (bounded, TTL-cleanup) ───────────

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;      // 30 requests per minute
const MAX_RATE_LIMIT_ENTRIES = 10000;    // Prevent unbounded memory growth

const rateLimits = new Map<string, RateLimitEntry>();

function checkChatRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  // Periodic cleanup: evict stale entries when Map gets large
  if (rateLimits.size > MAX_RATE_LIMIT_ENTRIES) {
    const now = Date.now();
    for (const [key, entry] of rateLimits) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimits.delete(key);
      }
    }
  }

  const now = Date.now();
  const entry = rateLimits.get(userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(userId, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate using shared token helper
    const token = await getAuthToken();
    const session = await requireAuth(db, token);

    // Create tenant context for domain function
    const tenantDb = createTenantDB(db, { schoolId: session.user.schoolId });
    const user = {
      id: session.user.id,
      username: session.user.username ?? "",
      name: session.user.name ?? "",
      role: session.user.role as "INTERN" | "STUDENT" | "TEACHER" | "ADMIN" | "SYSTEM",
      schoolId: session.user.schoolId,
      xp: session.user.xp,
      level: session.user.level,
      cefrLevel: session.user.cefrLevel as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    };
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

    const { message, moduleId, lessonId } = parsed.data;

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

    const systemPrompt = BASE_SYSTEM_PROMPT + contextAddition;

    const result = streamText({
      model: openrouter("openrouter/free"),
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