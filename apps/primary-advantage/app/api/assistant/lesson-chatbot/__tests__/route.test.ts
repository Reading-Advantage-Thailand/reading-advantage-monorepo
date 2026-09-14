// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@/utils/openai", () => ({
  openai: vi.fn(() => ({})),
  openaiModel: "test-model",
}));
vi.mock("@reading-advantage/ai/internal-sdk", () => ({
  streamText: mocks.streamText,
}));

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
    expect(mocks.streamText).toHaveBeenCalled();
  });
});
