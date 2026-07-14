import { describe, it, expect, vi, beforeEach } from "vitest";

const aiMocks = vi.hoisted(() => ({ createAIClient: vi.fn(), streamText: vi.fn() }));

vi.mock("@reading-advantage/ai", () => ({
  createAIClient: aiMocks.createAIClient,
}));

vi.mock("@reading-advantage/auth", async () => {
  const actual =
    await vi.importActual<typeof import("@reading-advantage/auth")>("@reading-advantage/auth");
  return {
    ...actual,
    requireAuth: vi.fn(),
  };
});

vi.mock("@reading-advantage/api/context", () => ({
  getAuthToken: vi.fn(),
}));

vi.mock("@reading-advantage/domain/codecamp", () => ({
  getChatContext: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkChatRateLimit: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@reading-advantage/db", async () => {
  const actual =
    await vi.importActual<typeof import("@reading-advantage/db")>("@reading-advantage/db");
  return {
    ...actual,
    db: {},
  };
});

import { POST } from "../route.js";
import { requireAuth } from "@reading-advantage/auth";
import { getAuthToken } from "@reading-advantage/api/context";
import { getChatContext } from "@reading-advantage/domain/codecamp";

const user = {
  id: "u1",
  username: "intern1",
  name: "Intern 1",
  role: "INTERN" as const,
  schoolId: "s1",
  xp: 0,
  level: 1,
  cefrLevel: "A1" as const,
};

/**
 * Builds a public adapter streamText result containing the given raw chunks.
 * @param chunks Text chunks emitted by the adapter.
 * @returns A public streamText-shaped result.
 */
function buildStreamTextResult(chunks: string[]) {
  return {
    textStream: (async function* () { for (const chunk of chunks) yield chunk; })(),
  };
}

/**
 * Mirrors the parsing logic in lib/use-chat-stream.ts so the test verifies
 * that server framing and client parsing agree: the client appends decoded
 * text chunks directly, so the reconstructed message is the raw body.
 */
function parseClientStream(bodyText: string): string {
  return bodyText;
}

describe("POST /api/chat streaming protocol", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = "test-key";
    vi.mocked(requireAuth).mockResolvedValue({ user } as unknown as Awaited<
      ReturnType<typeof requireAuth>
    >);
    vi.mocked(getAuthToken).mockResolvedValue("token");
    vi.mocked(getChatContext).mockResolvedValue("");
    aiMocks.createAIClient.mockReturnValue({ streamText: aiMocks.streamText });
  });

  it("returns a streaming content-type the client parser recognizes and emits raw text-stream chunks", async () => {
    aiMocks.streamText.mockResolvedValue(buildStreamTextResult(["Hello", " world"]));

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi", locale: "en" }),
    });

    const res = await POST(req as unknown as import("next/server").NextRequest);

    expect(res.status).toBe(200);
    const contentType = res.headers.get("content-type") ?? "";
    const bodyText = await res.text();
    const parsedMessage = parseClientStream(bodyText);

    expect(
      contentType,
      "server content-type must be recognized by useChatStream as event-stream"
    ).toContain("text/event-stream");
    expect(
      parsedMessage,
      "client parser must reconstruct assistant message from text stream chunks"
    ).toBe("Hello world");
    expect(aiMocks.createAIClient).toHaveBeenCalledWith({
      provider: "openrouter",
      apiKey: "test-key",
      model: "xiaomi/mimo-v2.5",
    });
  });
});
