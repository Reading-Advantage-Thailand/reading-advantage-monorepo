import { describe, expect, it, beforeEach, vi } from "vitest";
import { createAIClient, getAIClient, resetAIClient } from "./client.js";
import { ProviderNotConfiguredError } from "./errors.js";
import { MockProvider } from "./providers/mock.js";
import { OpenAIProvider } from "./providers/openai.js";
import { GoogleProvider } from "./providers/google.js";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => (id: string) => `openai:${id}`),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => (id: string) => `google:${id}`),
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  experimental_generateImage: vi.fn(),
}));

describe("createAIClient", () => {
  it("returns MockProvider for provider='mock'", () => {
    const client = createAIClient({ provider: "mock" });
    expect(client).toBeInstanceOf(MockProvider);
  });

  it("returns OpenAIProvider when API key is provided", () => {
    const client = createAIClient({
      provider: "openai",
      apiKey: "test-key",
    });
    expect(client).toBeInstanceOf(OpenAIProvider);
  });

  it("throws when OpenAI key is missing", () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    expect(() => createAIClient({ provider: "openai" })).toThrow(
      ProviderNotConfiguredError
    );

    if (original) process.env.OPENAI_API_KEY = original;
  });

  it("returns GoogleProvider when API key is provided", () => {
    const client = createAIClient({
      provider: "google",
      apiKey: "gemini-key",
    });
    expect(client).toBeInstanceOf(GoogleProvider);
  });

  it("throws when Google key is missing", () => {
    const origGemini = process.env.GEMINI_API_KEY;
    const origGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    expect(() => createAIClient({ provider: "google" })).toThrow(
      ProviderNotConfiguredError
    );

    if (origGemini) process.env.GEMINI_API_KEY = origGemini;
    if (origGoogle) process.env.GOOGLE_API_KEY = origGoogle;
  });
});

describe("getAIClient", () => {
  beforeEach(() => {
    resetAIClient();
    vi.unstubAllEnvs();
  });

  it("returns mock provider in test env by default", () => {
    vi.stubEnv("NODE_ENV", "test");
    const client = getAIClient();
    expect(client).toBeInstanceOf(MockProvider);
  });

  it("returns the same instance on subsequent calls", () => {
    vi.stubEnv("NODE_ENV", "test");
    const a = getAIClient();
    const b = getAIClient();
    expect(a).toBe(b);
  });

  it("respects AI_PROVIDER env var", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_PROVIDER", "mock");
    const client = getAIClient();
    expect(client).toBeInstanceOf(MockProvider);
  });

  it("resetAIClient forces new instance", () => {
    vi.stubEnv("NODE_ENV", "test");
    const a = getAIClient();
    resetAIClient();
    const b = getAIClient();
    expect(a).not.toBe(b);
  });
});
