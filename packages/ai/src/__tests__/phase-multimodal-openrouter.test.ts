import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenRouterProvider } from "../providers/openrouter.js";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  experimental_generateImage: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() =>
    Object.assign(vi.fn((id: string) => `resolved:${id}`), {
      image: vi.fn((id: string) => `image:${id}`),
    })
  ),
}));

import { generateObject } from "ai";

const rubricSchema = z.object({
  overallScore: z.number(),
  passed: z.boolean(),
  summary: z.string(),
  transcriptExcerpt: z.string(),
});

const audioBuffer = Buffer.from("fake-audio-bytes");
const expectedBase64 = audioBuffer.toString("base64");

function latestCallArg(): Record<string, unknown> | undefined {
  return (generateObject as unknown as { mock: { calls: unknown[][] } }).mock.calls
    .at(-1)?.[0] as Record<string, unknown> | undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OpenRouterProvider.generateObjectFromMedia", () => {
  it("sends a user message with a file part (audio base64) then a text part (prompt)", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { overallScore: 80, passed: true, summary: "good", transcriptExcerpt: "hi" },
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 5 },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const provider = new OpenRouterProvider({ apiKey: "test-key" });
    await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "score this roleplay against the rubric",
      media: { buffer: audioBuffer, mimeType: "audio/webm" },
    });

    const args = latestCallArg();
    expect(args).toBeDefined();
    expect(args).not.toHaveProperty("prompt");
    expect(args?.messages).toBeInstanceOf(Array);
    const messages = args?.messages as Array<{ role: string; content: unknown[] }>;
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe("user");
    const parts = messages[0].content;
    expect(parts).toHaveLength(2);
    expect(parts[0]).toEqual({
      type: "file",
      data: expectedBase64,
      mediaType: "audio/webm",
    });
    expect(parts[1]).toEqual({
      type: "text",
      text: "score this roleplay against the rubric",
    });
  });

  it("passes the schema through to the SDK", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { overallScore: 1, passed: true, summary: "s", transcriptExcerpt: "t" },
      finishReason: "stop",
      usage: { promptTokens: 1, completionTokens: 1 },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const provider = new OpenRouterProvider({ apiKey: "test-key" });
    await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "p",
      media: { buffer: audioBuffer, mimeType: "audio/webm" },
    });

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({ schema: rubricSchema, maxRetries: 1 })
    );
  });

  it("defaults to the nemotron-omni free model", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { overallScore: 1, passed: true, summary: "s", transcriptExcerpt: "t" },
      finishReason: "stop",
      usage: { promptTokens: 1, completionTokens: 1 },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const provider = new OpenRouterProvider({ apiKey: "test-key" });
    await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "p",
      media: { buffer: audioBuffer, mimeType: "audio/webm" },
    });

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "resolved:nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      })
    );
  });

  it("respects an explicit model override and strips the openrouter/ prefix", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { overallScore: 1, passed: true, summary: "s", transcriptExcerpt: "t" },
      finishReason: "stop",
      usage: { promptTokens: 1, completionTokens: 1 },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const provider = new OpenRouterProvider({ apiKey: "test-key" });
    await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "p",
      media: { buffer: audioBuffer, mimeType: "audio/webm" },
      model: "openrouter/google/gemini-2.5-flash-lite",
    });

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "resolved:google/gemini-2.5-flash-lite",
      })
    );
  });

  it("forwards temperature when provided", async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({
      object: { overallScore: 1, passed: true, summary: "s", transcriptExcerpt: "t" },
      finishReason: "stop",
      usage: { promptTokens: 1, completionTokens: 1 },
    } as unknown as Awaited<ReturnType<typeof generateObject>>);

    const provider = new OpenRouterProvider({ apiKey: "test-key" });
    await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "p",
      media: { buffer: audioBuffer, mimeType: "audio/webm" },
      temperature: 0.2,
    });

    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.2 })
    );
  });

  it("wraps SDK errors in AIClientError with PROVIDER_ERROR code", async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error("rate limited"));

    const provider = new OpenRouterProvider({ apiKey: "test-key" });
    await expect(
      provider.generateObjectFromMedia({
        schema: rubricSchema,
        prompt: "p",
        media: { buffer: audioBuffer, mimeType: "audio/webm" },
      })
    ).rejects.toThrow("OpenRouter generateObjectFromMedia failed: rate limited");
  });
});
