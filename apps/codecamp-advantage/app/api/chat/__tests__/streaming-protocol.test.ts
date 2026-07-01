import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@reading-advantage/ai", () => ({
  createOpenAI: vi.fn(() => (model: string) => model),
  streamText: vi.fn(),
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
import { streamText } from "@reading-advantage/ai";
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
 * Builds a streamText result whose toDataStreamResponse returns the given
 * chunks encoded as Vercel AI SDK data-stream lines. The Content-Type is set
 * to text/plain to mirror the default response from the real provider adapter;
 * this exposes the content-type mismatch with the client parser.
 */
function buildStreamTextResult(chunks: string[]) {
  const body = chunks.map((chunk) => `0:${JSON.stringify(chunk)}`).join("\n") + "\n";
  return {
    toDataStreamResponse() {
      return new Response(body, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    },
  };
}

/**
 * Mirrors the parsing logic in lib/use-chat-stream.ts so the test verifies
 * that server framing and client parsing agree.
 */
function parseClientStream(bodyText: string): string {
  let message = "";
  for (const line of bodyText.split("\n")) {
    if (line.startsWith("0:")) {
      try {
        message += JSON.parse(line.slice(2));
      } catch {
        // ignore malformed lines, matching client behavior
      }
    }
  }
  return message;
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
  });

  it("returns a streaming content-type the client parser recognizes and emits Vercel AI SDK data stream chunks", async () => {
    vi.mocked(streamText).mockResolvedValue(
      buildStreamTextResult(["Hello", " world"]) as unknown as Awaited<
        ReturnType<typeof streamText>
      >
    );

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
      "client parser must reconstruct assistant message from data stream chunks"
    ).toBe("Hello world");
  });
});
