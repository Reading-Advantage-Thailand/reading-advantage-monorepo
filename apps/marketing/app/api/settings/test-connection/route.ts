import { NextResponse } from "next/server";
import { createAIClient } from "@reading-advantage/ai";

export async function POST(request: Request) {
  try {
    const { provider, modelName, apiKey } = await request.json();

    const client = createAIClient({
      provider: provider as "google" | "openai",
      model: modelName,
      apiKey,
    });

    // Simple test prompt
    const result = await client.generateText({
      prompt: "Say 'Connection successful' in Thai.",
      maxTokens: 50,
    });

    return NextResponse.json({ success: true, response: result });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Connection failed",
      },
      { status: 400 }
    );
  }
}
