// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createAIClient: vi.fn(() => ({})), info: vi.fn(), error: vi.fn() }));

vi.mock("@reading-advantage/ai", () => ({ createAIClient: mocks.createAIClient }));
vi.mock("@/lib/observability/logger", () => ({
  logger: { info: mocks.info, warn: vi.fn(), error: mocks.error },
}));

import {
  PRIMARY_AI_TASKS,
  chatbotClient,
  feedbackClient,
  loggedAiCall,
  resetPrimaryAiClients,
} from "../models";

describe("Primary AI models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPrimaryAiClients();
    delete process.env.PRIMARY_AI_FEEDBACK_MODEL;
    delete process.env.PRIMARY_AI_CHATBOT_MODEL;
    process.env.PROJECT_ID = "proj-test";
  });
  afterEach(() => {
    delete process.env.PROJECT_ID;
  });

  it("defaults equal the live legacy rows", () => {
    expect(PRIMARY_AI_TASKS["qa.feedback"]).toMatchObject({
      provider: "vertex",
      defaultModel: "gemini-3.5-flash-lite",
      location: "global",
    });
    expect(PRIMARY_AI_TASKS["chatbot.stream"]).toMatchObject({
      provider: "openai",
      defaultModel: "gpt-4o-mini",
    });
  });

  it("makes the feedback client with Vertex, location global, and PROJECT_ID", () => {
    feedbackClient();
    expect(mocks.createAIClient).toHaveBeenCalledWith({
      provider: "vertex",
      model: "gemini-3.5-flash-lite",
      location: "global",
      project: "proj-test",
    });
  });

  it("makes the chatbot client with OpenAI", () => {
    chatbotClient();
    expect(mocks.createAIClient).toHaveBeenCalledWith({ provider: "openai", model: "gpt-4o-mini" });
  });

  it("reuses the client for the same model", () => {
    expect(feedbackClient()).toBe(feedbackClient());
    expect(mocks.createAIClient).toHaveBeenCalledTimes(1);
  });

  it("an override replaces the model", () => {
    process.env.PRIMARY_AI_FEEDBACK_MODEL = "gemini-3.5-flash";
    feedbackClient();
    expect(mocks.createAIClient).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-3.5-flash" }),
    );
  });

  it("a value with a space throws with the variable name", () => {
    process.env.PRIMARY_AI_CHATBOT_MODEL = "gpt 4o";
    expect(() => chatbotClient()).toThrow("PRIMARY_AI_CHATBOT_MODEL");
  });

  it("loggedAiCall logs ai_call with task, provider, model, and duration", async () => {
    const result = await loggedAiCall("qa.feedback", async () => 7);
    expect(result).toBe(7);
    expect(mocks.info).toHaveBeenCalledWith("ai_call", {
      task: "qa.feedback",
      provider: "vertex",
      model: "gemini-3.5-flash-lite",
      durationMs: expect.any(Number),
    });
  });

  it("loggedAiCall logs and rethrows when the call fails", async () => {
    await expect(
      loggedAiCall("chatbot.stream", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(mocks.info).toHaveBeenCalledWith("ai_call", expect.objectContaining({ task: "chatbot.stream" }));
    // L-16: a failed call also writes one error line with the task and the error.
    expect(mocks.error).toHaveBeenCalledWith(
      "ai_call_failed",
      expect.objectContaining({ task: "chatbot.stream", error: expect.any(Error) }),
    );
  });

  it("loggedAiCall writes no error line when the call succeeds", async () => {
    await loggedAiCall("qa.feedback", async () => 1);
    expect(mocks.error).not.toHaveBeenCalled();
  });
});
