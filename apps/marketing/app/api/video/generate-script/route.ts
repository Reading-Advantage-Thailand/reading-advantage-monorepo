/**
 * `/api/video/generate-script` — generate a Thai video script via the
 * shared `@reading-advantage/ai` adapter.
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
 * (`generateScriptSchema`) BEFORE the prompt builder is called. A bad
 * payload — oversized topic, missing `app`, non-string field — returns
 * 400 with a structured error and never reaches `buildScriptGenerationPrompt`.
 *
 * **Tenant/owner policy:** marketing tables are global-internal and are
 * not scoped by `schoolId`. Auth + the exact role allow-list is the boundary.
 *
 * @see apps/marketing/app/lib/auth.ts
 * @see apps/marketing/app/lib/script-request-schema.ts
 * @see apps/marketing/app/lib/redact.ts
 */
import { NextResponse } from "next/server";
import { createAIClient } from "@/lib/ai";
import { db } from "@/lib/db";
import { settings } from "@reading-advantage/db/schema";
import { or, eq } from "drizzle-orm";
import { buildScriptGenerationPrompt } from "@/lib/script-generation";
import { scriptSchema } from "@/lib/script-schema";
import { requireMarketingSession } from "@/lib/auth";
import { generateScriptSchema } from "@/lib/script-request-schema";
import { redactSecrets } from "@/lib/redact";
import { resolveMarketingAIConfig } from "@/lib/ai-credentials";

/**
 * POST /api/video/generate-script — read LLM settings, build a prompt,
 * call the shared AI adapter, parse + Zod-validate the response.
 *
 * Guard contract: 401 without a valid session, before any DB read or AI
 * call. Validation contract: 400 with a structured Zod error before the
 * prompt is built.
 */
export async function POST(request: Request) {
  const guard = await requireMarketingSession(request);
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

  const parsed = generateScriptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid script request payload",
        error: parsed.error.message,
      },
      { status: 400 },
    );
  }

  let apiKey: string | undefined;
  try {
    const { app, topic } = parsed.data;

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

    const prompt = buildScriptGenerationPrompt(app, topic);

    const aiClient = createAIClient(aiConfig);

    const result = await aiClient.generateText({
      prompt,
      maxTokens: 1500,
    });

    const resultJson = JSON.parse(result);
    const validation = scriptSchema.safeParse(resultJson);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "LLM response failed script schema validation",
          error: validation.error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ script: validation.data });
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "Failed to generate script";
    return NextResponse.json(
      {
        message: redactSecrets(rawMessage, [apiKey]),
      },
      { status: 500 },
    );
  }
}
