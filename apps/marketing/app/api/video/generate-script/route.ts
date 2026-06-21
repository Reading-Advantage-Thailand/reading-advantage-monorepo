import { NextResponse } from "next/server";
import { createAIClient } from "@/lib/ai";
import { db } from "@/lib/db";
import { settings } from "@reading-advantage/db/schema";
import { or, eq } from "drizzle-orm";
import { buildScriptGenerationPrompt } from "@/lib/script-generation";
import { scriptSchema } from "@/lib/script-schema";

export async function POST(request: Request) {
  try {
    const { app, topic } = (await request.json()) as { app: string; topic: string };

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

    if (!settingsMap["llm.apiKey"]) {
      return NextResponse.json(
        { message: "LLM not configured. Please set up API key in Settings." },
        { status: 400 },
      );
    }

    const prompt = buildScriptGenerationPrompt(app, topic);

    const aiClient = createAIClient({
      provider: (settingsMap["llm.provider"] as "google" | "openai") || "google",
      model: settingsMap["llm.model"] || "gemini-pro",
      apiKey: settingsMap["llm.apiKey"],
    });

    const result = await aiClient.generateText({
      prompt,
      maxTokens: 1500,
    });

    const parsed = JSON.parse(result);
    const validation = scriptSchema.safeParse(parsed);

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
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to generate script",
      },
      { status: 500 },
    );
  }
}
