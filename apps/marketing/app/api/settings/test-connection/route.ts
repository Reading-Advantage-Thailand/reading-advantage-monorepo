import { NextResponse } from "next/server";
import { createAIClient } from "@reading-advantage/ai";

/**
 * Replace occurrences of any caller-supplied secret in `message` with a
 * `[REDACTED]` marker. Some AI SDKs (notably the Google Generative AI
 * client) echo the supplied API key back inside the error message they
 * throw, e.g.:
 *
 *   "GoogleGenerativeAIError: Invalid API key: sk-... provided"
 *
 * Returning that string verbatim would leak the secret in HTTP responses
 * and any downstream access logs / error trackers. We scrub known secrets
 * before returning. We deliberately avoid logging the raw message: the
 * upstream SDK's error message may itself contain the secret, so logging
 * it server-side is also a leak.
 */
function redactSecrets(
  message: string,
  secrets: ReadonlyArray<string | undefined>,
): string {
  let sanitized = message;
  for (const secret of secrets) {
    if (typeof secret !== "string" || secret.length === 0) continue;
    sanitized = sanitized.split(secret).join("[REDACTED]");
  }
  return sanitized;
}

export async function POST(request: Request) {
  let apiKey: string | undefined;
  try {
    const body = (await request.json()) as {
      provider?: string;
      modelName?: string;
      apiKey?: string;
    };
    apiKey = body.apiKey;

    const client = createAIClient({
      provider: body.provider as "google" | "openai",
      model: body.modelName,
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
