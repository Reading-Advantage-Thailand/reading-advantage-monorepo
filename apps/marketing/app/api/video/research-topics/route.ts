import { NextResponse } from "next/server";
import { createAIClient } from "@/lib/ai";
import { db } from "@/lib/db";
import { pastTopics, settings } from "@reading-advantage/db/schema";
import { eq, or } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { app } = await request.json();

    // Load LLM settings
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

    // Get past topics for dedup
    const existingTopics = await db
      .select()
      .from(pastTopics)
      .where(eq(pastTopics.app, app));

    const pastTopicsList = existingTopics
      .map((t: { topic: string }) => t.topic)
      .join(", ");

    const aiClient = createAIClient({
      provider: (settingsMap["llm.provider"] as "google" | "openai") || "google",
      model: settingsMap["llm.model"] || "gemini-pro",
      apiKey: settingsMap["llm.apiKey"],
    });

    const prompt = `You are a Thai marketing expert for K-12 education.
    
App: ${app.replace(/-/g, " ")}
${pastTopicsList ? `Past topics (avoid these): ${pastTopicsList}` : ""}

Propose 5 distinct marketing video topics for Thai school directors, parents, and teachers.
Each topic should be compelling and relevant to the app's audience.

Return ONLY a JSON array of 5 strings, nothing else.`;

    const result = await aiClient.generateText({
      prompt,
      maxTokens: 500,
    });

    // Parse the JSON array from the response
    const topics = JSON.parse(result);

    return NextResponse.json({ topics });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to research topics" },
      { status: 500 }
    );
  }
}
