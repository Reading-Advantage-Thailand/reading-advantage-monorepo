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
import {
  buildScriptGenerationPrompt,
  buildThaiNarrationRepairPrompt,
} from "@/lib/script-generation";
import {
  scriptSchema,
  thaiNarrationScriptSchema,
  type Script,
} from "@/lib/script-schema";
import { requireMarketingPermission } from "@/lib/auth";
import { generateScriptSchema } from "@/lib/script-request-schema";
import { redactSecrets } from "@/lib/redact";
import { resolveMarketingAIConfig } from "@/lib/ai-credentials";


/**
 * Parses an AI response against the persisted structural script contract.
 * @param response The raw provider text response.
 * @returns The validated script, or null for invalid JSON or structure.
 */
function parseScriptResponse(response: string): Script | null {
  try {
    const parsed: unknown = JSON.parse(response);
    const validation = scriptSchema.safeParse(parsed);
    return validation.success ? validation.data : null;
  } catch {
    return null;
  }
}

/**
 * POST /api/video/generate-script — read LLM settings, build a prompt,
 * call the shared AI adapter, parse + Zod-validate the response.
 *
 * Guard contract: 401 without a valid session, before any DB read or AI
 * call. Validation contract: 400 with a structured Zod error before the
 * prompt is built.
 * @param request The authenticated script-generation request.
 * @returns A generated Thai script or a typed validation or repair response.
 */
export async function POST(request: Request) {
  const guard = await requireMarketingPermission(request, "video:script:generate");
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

    const initialScript = parseScriptResponse(result);
    if (!initialScript) {
      return NextResponse.json(
        { message: "LLM response failed script schema validation" },
        { status: 500 },
      );
    }

    const thaiValidation = thaiNarrationScriptSchema.safeParse(initialScript);
    if (thaiValidation.success) {
      return NextResponse.json({ script: thaiValidation.data });
    }

    const repairedResult = await aiClient.generateText({
      prompt: buildThaiNarrationRepairPrompt(app, topic, initialScript),
      maxTokens: 1500,
    });
    const repairedScript = parseScriptResponse(repairedResult);
    if (repairedScript) {
      const repairedValidation = thaiNarrationScriptSchema.safeParse(
        repairedScript,
      );
      if (repairedValidation.success) {
        return NextResponse.json({ script: repairedValidation.data });
      }
    }

    return NextResponse.json(
      {
        code: "THAI_NARRATION_REQUIRED",
        message: "Generated script narration must be Thai in every scene",
        repairAttempts: 1,
      },
      { status: 422 },
    );
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
