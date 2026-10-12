// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  streamText: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@reading-advantage/ai", () => ({
  createAIClient: vi.fn(() => ({ streamText: mocks.streamText })),
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { info: mocks.info, warn: vi.fn(), error: mocks.error },
}));

import { resetPrimaryAiClients } from "@/lib/ai/models";
import { POST } from "../route";

const validBody = {
  messages: [{ text: "hello", sender: "user" }],
  title: "Title",
  passage: "Passage",
  summary: "Summary",
  image_description: "Image",
};

/**
 * Builds a chatbot request with a JSON body.
 * @param body The request payload.
 * @returns A POST request.
 */
function postRequest(body: unknown) {
  return new Request("http://localhost/api/assistant/lesson-chatbot", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}

describe("POST /api/assistant/lesson-chatbot authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(401);
    expect(mocks.streamText).not.toHaveBeenCalled();
  });

  it("serves an authenticated student", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s-1", role: "STUDENT" });
    async function* chunks() {
      yield "hi";
    }
    mocks.streamText.mockResolvedValue({ textStream: chunks() });

    const response = await POST(postRequest(validBody));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ messages: "success", sender: "bot", text: "hi" });
    const input = mocks.streamText.mock.calls[0][0];
    expect(input.system).toContain("Title: \"Title\"");
    expect(input.messages).toEqual([{ role: "user", content: "hello" }]);
    expect(mocks.info).toHaveBeenCalledWith("ai_call", {
      task: "chatbot.stream",
      provider: "openai",
      model: "gpt-4o-mini",
      durationMs: expect.any(Number),
    });
  });

  it("returns 400 and logs through the logger for a bad body", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s-1", role: "STUDENT" });
    const response = await POST(postRequest({ title: 1 }));
    expect(response.status).toBe(400);
    expect(mocks.error).toHaveBeenCalledWith("lesson_chatbot_validation_error", expect.anything());
  });

  it("returns 500 and logs when the model call fails", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s-1", role: "STUDENT" });
    mocks.streamText.mockRejectedValue(new Error("boom"));
    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(500);
    expect(mocks.error).toHaveBeenCalledWith("lesson_chatbot_error", expect.anything());
  });

  describe("body size limits", () => {
    beforeEach(() => mocks.currentUser.mockResolvedValue({ id: "s-1", role: "STUDENT" }));

    it.each([
      ["passage", { passage: "p".repeat(20_001) }],
      ["summary", { summary: "s".repeat(5_001) }],
      ["title", { title: "t".repeat(501) }],
      ["image_description", { image_description: "i".repeat(2_001) }],
      ["messages count", { messages: Array.from({ length: 61 }, () => ({ text: "x", sender: "user" })) }],
      ["message text", { messages: [{ text: "x".repeat(4_001), sender: "user" }] }],
      ["blacklist count", { blacklistedQuestions: Array.from({ length: 101 }, () => "q") }],
    ])("returns 400 for an oversized %s", async (_name, patch) => {
      const response = await POST(postRequest({ ...validBody, ...patch }));
      expect(response.status).toBe(400);
      expect(mocks.streamText).not.toHaveBeenCalled();
    });
  });
});
