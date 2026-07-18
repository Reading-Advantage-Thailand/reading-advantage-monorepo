import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { aiConfigs, createAIClientMock, databaseState, generateTextMock } =
  vi.hoisted(() => ({
    aiConfigs: [] as Array<Record<string, unknown>>,
    createAIClientMock: vi.fn(),
    databaseState: {
      settings: [] as Array<{ key: string; value: string }>,
    },
    generateTextMock: vi.fn(),
  }));

vi.mock("@/lib/auth", () => {
  const allowMarketingRequest = vi.fn().mockResolvedValue({
    ok: true,
    session: { user: { id: "marketing-admin", role: "ADMIN" } },
  });
  return {
    requireMarketingPermission: allowMarketingRequest,
    requireMarketingSession: allowMarketingRequest,
  };
});

vi.mock("@/lib/ai", () => ({
  createAIClient: createAIClientMock,
  getAIClient: createAIClientMock,
}));

vi.mock("@/lib/db", async () => {
  const schema =
    await vi.importActual<typeof import("@reading-advantage/db/schema")>(
      "@reading-advantage/db/schema",
    );
  const select = vi.fn(() => ({
    from: vi.fn((table: unknown) => ({
      where: vi.fn().mockResolvedValue(
        table === schema.settings ? databaseState.settings : [],
      ),
    })),
  }));
  const insert = vi.fn((table: unknown) => ({
    values: vi.fn((row: { key?: string; value?: string }) => {
      const { key, value } = row;
      if (table !== schema.settings || !key || value === undefined) {
        throw new Error("Unexpected insert in credential lifecycle test");
      }
      return {
        onConflictDoUpdate: vi.fn(
          async (config: { set: { value: string } }) => {
            const existing = databaseState.settings.find(
              (candidate) => candidate.key === key,
            );
            if (existing) {
              existing.value = config.set.value;
            } else {
              databaseState.settings.push({ key, value });
            }
          },
        ),
      };
    }),
  }));
  return { db: { insert, select } };
});

const scriptFixture = Array.from({ length: 5 }, (_, index) => ({
  narration: `คำบรรยายฉากที่ ${index + 1}`,
  imagePrompt: `Image ${index}`,
  motionDirection: `Motion ${index}`,
}));

describe("Marketing AI credential lifecycle", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    aiConfigs.length = 0;
    databaseState.settings.length = 0;
    vi.stubEnv("ENCRYPTION_KEY", "11".repeat(32));
    createAIClientMock.mockImplementation((config) => {
      aiConfigs.push(config as Record<string, unknown>);
      return { generateText: generateTextMock };
    });
    generateTextMock.mockImplementation(async (input: { maxTokens: number }) =>
      input.maxTokens === 500
        ? JSON.stringify([
            "Topic one",
            "Topic two",
            "Topic three",
            "Topic four",
            "Topic five",
          ])
        : JSON.stringify(scriptFixture),
    );
  });

  it(
    "saves ciphertext then supplies plaintext to research and script adapters",
    async () => {
      const plaintextKey = "provider-key-that-must-not-remain-in-storage";
      const { POST: saveSettings } = await import("@/api/settings/route");
      const saveResponse = await saveSettings(
        new Request("http://localhost/api/settings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            "llm.apiKey": plaintextKey,
            "llm.model": "gemini-test-model",
            "llm.provider": "google",
          }),
        }),
      );
      expect(saveResponse.status).toBe(200);

      const storedKey = databaseState.settings.find(
        (setting) => setting.key === "llm.apiKey",
      )?.value;
      expect(storedKey).toBeDefined();
      expect(storedKey).not.toBe(plaintextKey);
      expect(storedKey).not.toContain(plaintextKey);

      const { POST: researchTopics } = await import(
        "@/api/video/research-topics/route"
      );
      const researchResponse = await researchTopics(
        new Request("http://localhost/api/video/research-topics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ app: "reading-advantage" }),
        }),
      );
      expect(researchResponse.status).toBe(200);

      const { POST: generateScript } = await import(
        "@/api/video/generate-script/route"
      );
      const scriptResponse = await generateScript(
        new Request("http://localhost/api/video/generate-script", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            app: "reading-advantage",
            topic: "A test topic",
          }),
        }),
      );
      expect(scriptResponse.status).toBe(200);

      expect(aiConfigs).toHaveLength(2);
      for (const config of aiConfigs) {
        expect(config).toEqual({
          apiKey: plaintextKey,
          model: "gemini-test-model",
          provider: "google",
        });
      }
    },
    30_000,
  );

  it.each([
    ["google", "GOOGLE_API_KEY", "google-fallback"],
    ["openai", "OPENAI_API_KEY", "openai-fallback"],
    ["openrouter", "OPENROUTER_API_KEY", "openrouter-fallback"],
  ])("uses the %s environment key when no key is stored", async (provider, key, value) => {
    const { resolveMarketingAIConfig } = await import("@/lib/ai-credentials");
    expect(
      resolveMarketingAIConfig(
        {},
        { AI_PROVIDER: provider, [key]: value },
      ),
    ).toEqual({ apiKey: value, model: undefined, provider });
  });

  it.each(["", "   ", "\n\t "])(
    "normalizes a blank persisted model value to undefined",
    async (model) => {
      const { resolveMarketingAIConfig } = await import("@/lib/ai-credentials");
      expect(
        resolveMarketingAIConfig(
          { "llm.model": model },
          { AI_PROVIDER: "google", GOOGLE_API_KEY: "google-fallback" },
        ),
      ).toEqual({
        apiKey: "google-fallback",
        model: undefined,
        provider: "google",
      });
    },
  );
});
