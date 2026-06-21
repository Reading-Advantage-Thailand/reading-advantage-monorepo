import { NextResponse } from "next/server";
import { createAIClient } from "@/lib/ai";
import { db } from "@/lib/db";
import { pastTopics, settings } from "@reading-advantage/db/schema";
import { eq, or } from "drizzle-orm";
import { buildTopicResearchPrompt } from "@/lib/topic-research";
import { deduplicateTopics } from "@/lib/topic-dedup";

export async function POST(request: Request) {
  try {
    const { app } = await request.json();

    const llmSettings = await db
      .select()
      .from(settings)
      .where(
        or(
          eq(settings.key, "llm.provider"),
          eq(settings.key, "llm.model"),
          eq(settings.key, "llm.apiKey")
        )
      );

    const settingsMap = Object.fromEntries(
      llmSettings.map((s: { key: string; value: string }) => [s.key, s.value])
    );

    if (!settingsMap["llm.apiKey"]) {
      return NextResponse.json(
        { message: "LLM not configured. Please set up API key in Settings." },
        { status: 400 }
      );
    }

    const existingTopics = await db
      .select()
      .from(pastTopics)
      .where(eq(pastTopics.app, app));

    const pastTopicsList = existingTopics.map(
      (t: { topic: string }) => t.topic
    );

    const prompt = buildTopicResearchPrompt(app, pastTopicsList);

    const aiClient = createAIClient({
      provider: (settingsMap["llm.provider"] as "google" | "openai") || "google",
      model: settingsMap["llm.model"] || "gemini-pro",
      apiKey: settingsMap["llm.apiKey"],
    });

    const result = await aiClient.generateText({
      prompt,
      maxTokens: 500,
    });

    const parsed = JSON.parse(result);
    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { message: "LLM did not return a valid topic list" },
        { status: 500 }
      );
    }

    const capped = parsed.slice(0, 5).map(String);
    const filtered = deduplicateTopics(capped, pastTopicsList);

    return NextResponse.json({ topics: filtered });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to research topics",
      },
      { status: 500 }
    );
  }
}
