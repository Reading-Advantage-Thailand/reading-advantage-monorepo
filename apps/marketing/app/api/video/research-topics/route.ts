/**
 * `/api/video/research-topics` — propose 5 distinct marketing topics for an
 * app, asking the shared AI adapter.
 *
 * **Auth policy:** authentication required. Unauthenticated callers receive
 * 401 before any DB read or AI call.
 *
 * **Adapter routing:** this route uses `createAIClient` from
 * `@reading-advantage/ai` (re-exported via `@/lib/ai`), NOT a per-request
 * provider SDK. The static guard test (`phase-w3-ai-adapter.test.ts`)
 * asserts no `@ai-sdk/*` or provider SDK imports exist in `app/api/`.
 *
 * **Input validation:** the request body is validated with a Zod schema
 * (`researchTopicsSchema`) BEFORE the prompt builder is called.
 *
 * **Tenant/owner policy:** marketing tables are global-internal and are
 * not scoped by `schoolId`. Auth + the exact role allow-list is the boundary.
 *
 * @see apps/marketing/app/lib/auth.ts
 * @see apps/marketing/app/lib/topic-schema.ts
 * @see apps/marketing/app/lib/redact.ts
 */
import { NextResponse } from "next/server";
import { createAIClient } from "@/lib/ai";
import { db } from "@/lib/db";
import { pastTopics, settings } from "@reading-advantage/db/schema";
import { eq, or } from "drizzle-orm";
import { buildTopicResearchPrompt } from "@/lib/topic-research";
import { deduplicateTopics } from "@/lib/topic-dedup";
import { requireMarketingPermission } from "@/lib/auth";
import {
  researchedTopicListSchema,
  researchTopicsSchema,
} from "@/lib/topic-schema";
import { redactSecrets } from "@/lib/redact";
import { resolveMarketingAIConfig } from "@/lib/ai-credentials";

/**
 * POST /api/video/research-topics — read LLM settings + past topics,
 * build a prompt, call the shared AI adapter, dedup + cap the response.
 *
 * Guard contract: 401 without a valid session, before any DB read or AI
 * call. Validation contract: 400 with a structured Zod error before the
 * prompt is built.
 * @param request The authenticated topic-research request.
 * @returns Five distinct new topics or a typed validation or shortfall response.
 */
export async function POST(request: Request) {
  const guard = await requireMarketingPermission(request, "video:topics:research");
  if (!guard.ok) {
    return guard.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = researchTopicsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid research-topics payload",
        error: parsed.error.message,
      },
      { status: 400 },
    );
  }

  let apiKey: string | undefined;
  try {
    const { app } = parsed.data;

    const llmSettings = await db
      .select()
      .from(settings)
      .where(
        or(
          eq(settings.key, "llm.provider"),
          eq(settings.key, "llm.model"),
          eq(settings.key, "llm.apiKey"),
        ),
      );

    const settingsMap = Object.fromEntries(
      llmSettings.map((s: { key: string; value: string }) => [s.key, s.value]),
    );

    const aiConfig = resolveMarketingAIConfig(settingsMap);
    apiKey = aiConfig?.apiKey;
    if (!aiConfig) {
      return NextResponse.json(
        { message: "LLM not configured. Please set up API key in Settings." },
        { status: 400 },
      );
    }

    const existingTopics = await db
      .select()
      .from(pastTopics)
      .where(
        eq(
          pastTopics.app,
          app as
            | "reading-advantage"
            | "primary-advantage"
            | "storytime"
            | "math-advantage"
            | "science-advantage"
            | "stem-advantage"
            | "zhongwen-advantage"
            | "tutor-advantage",
        ),
      );

    const pastTopicsList = existingTopics.map(
      (t: { topic: string }) => t.topic,
    );

    const prompt = buildTopicResearchPrompt(app, pastTopicsList);

    const aiClient = createAIClient(aiConfig);

    const result = await aiClient.generateText({
      prompt,
      maxTokens: 500,
    });

    const resultJson: unknown = JSON.parse(result);
    const topicValidation = researchedTopicListSchema.safeParse(resultJson);
    if (!topicValidation.success) {
      return NextResponse.json(
        { message: "LLM did not return a valid topic list" },
        { status: 500 },
      );
    }

    const filtered = deduplicateTopics(
      topicValidation.data,
      pastTopicsList,
    ).slice(0, 5);
    if (filtered.length < 5) {
      return NextResponse.json(
        {
          code: "TOPIC_RESEARCH_SHORTFALL",
          message: "Topic research produced fewer than five distinct new topics",
          expectedCount: 5,
          actualCount: filtered.length,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ topics: filtered });
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "Failed to research topics";
    return NextResponse.json(
      {
        message: redactSecrets(rawMessage, [apiKey]),
      },
      { status: 500 },
    );
  }
}
