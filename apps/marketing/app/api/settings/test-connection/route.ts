/**
 * `/api/settings/test-connection` — test an LLM connection by sending a
 * lightweight prompt.
 *
 * **Auth policy:** authentication required. Unauthenticated callers receive
 * 401 before any AI call. The guard short-circuits before the provider SDK
 * so no credentials are used for anonymous callers.
 *
 * **Secret leakage defense:** the AI SDK sometimes echoes the supplied API
 * key back in the thrown error. The route redacts any caller-supplied
 * secret values before returning the message to the client.
 *
 * @see apps/marketing/app/lib/auth.ts
 */
import { NextResponse } from "next/server";
import { createAIClient } from "@reading-advantage/ai";
import { requireMarketingPermission } from "@/lib/auth";
import { redactSecrets } from "@/lib/redact";
import { settingsTestConnectionSchema } from "@/lib/settings-schema";

/**
 * POST /api/settings/test-connection — validate an LLM connection.
 *
 * Guard contract: 401 without a valid session, before any AI call.
 */
export async function POST(request: Request) {
  const guard = await requireMarketingPermission(request, "settings:test-connection");
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

  const parsed = settingsTestConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid connection test payload",
        error: parsed.error.message,
      },
      { status: 400 },
    );
  }

  const apiKey = parsed.data.apiKey;
  try {
    const client = createAIClient({
      provider: parsed.data.provider,
      model: parsed.data.modelName,
      apiKey,
    });

    // Simple test prompt
    const result = await client.generateText({
      prompt: "Say 'Connection successful' in Thai.",
      maxTokens: 50,
    });

    return NextResponse.json({ success: true, response: result });
  } catch (error) {
    // Defense-in-depth: the AI SDK sometimes echoes the supplied API key
    // back in the thrown error. Redact any caller-supplied secret values
    // before returning the message to the client. Do NOT log the raw
    // error here either — its message may itself contain the secret.
    const rawMessage =
      error instanceof Error ? error.message : "Connection failed";
    const sanitized = redactSecrets(rawMessage, [apiKey]);
    return NextResponse.json(
      {
        message: sanitized,
      },
      { status: 400 }
    );
  }
}
