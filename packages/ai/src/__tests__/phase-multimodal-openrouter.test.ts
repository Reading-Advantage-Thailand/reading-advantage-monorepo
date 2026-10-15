import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenRouterProvider } from "../providers/openrouter.js";
import { AIClientError, SchemaValidationError, UnsupportedError } from "../errors.js";

// Audio goes to OpenRouter chat completions as `input_audio`. The AI SDK
// Responses request format rejects every audio file part, and its chat
// converter cannot send WebM (observed 2026-10-15), so these tests check the
// raw request body instead of mocking the SDK.

const rubricSchema = z.object({
  overallScore: z.number(),
  passed: z.boolean(),
  summary: z.string(),
  transcriptExcerpt: z.string(),
});

const audioBuffer = Buffer.from("fake-audio-bytes");
const expectedBase64 = audioBuffer.toString("base64");
const validObject = { overallScore: 80, passed: true, summary: "good", transcriptExcerpt: "hi" };

/** Builds a fetch reply in the OpenRouter chat completions shape. */
function chatReply(content: unknown, status = 200, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }], ...extra }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

const fetchMock = vi.fn();

/** Returns the URL, init, and parsed JSON body of the latest fetch call. */
function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, body: JSON.parse(String(init.body)) };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenRouterProvider.generateObjectFromMedia", () => {
  it("posts the audio as input_audio with its format and the prompt to chat completions", async () => {
    fetchMock.mockResolvedValueOnce(chatReply(JSON.stringify(validObject)));
    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "score this roleplay against the rubric",
      media: { buffer: audioBuffer, mimeType: "audio/webm" },
      temperature: 0.2,
    });

    const { url, init, body } = lastRequest();
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(body.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "input_audio", input_audio: { data: expectedBase64, format: "webm" } },
          { type: "text", text: "score this roleplay against the rubric" },
        ],
      },
    ]);
    expect(body.temperature).toBe(0.2);
    expect(body.reasoning).toBeUndefined();
  });

  it("sends the reasoning effort when the call sets one", async () => {
    fetchMock.mockResolvedValueOnce(chatReply(JSON.stringify(validObject)));
    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "score",
      media: { buffer: audioBuffer, mimeType: "audio/webm" },
      reasoningEffort: "low",
    });

    expect(lastRequest().body.reasoning).toEqual({ effort: "low" });
  });

  it("asks for JSON that matches the zod schema", async () => {
    fetchMock.mockResolvedValueOnce(chatReply(JSON.stringify(validObject)));
    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "p",
      media: { buffer: audioBuffer, mimeType: "audio/webm" },
    });

    const { body } = lastRequest();
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(false);
    expect(Object.keys(body.response_format.json_schema.schema.properties)).toEqual([
      "overallScore",
      "passed",
      "summary",
      "transcriptExcerpt",
    ]);
  });

  it.each([
    ["audio/webm;codecs=opus", "webm"],
    ["audio/ogg", "ogg"],
    ["audio/wav", "wav"],
    ["audio/mpeg", "mp3"],
    ["audio/mp3", "mp3"],
    ["audio/mp4", "m4a"],
  ])("sends %s as format %s", async (mimeType, format) => {
    fetchMock.mockResolvedValueOnce(chatReply(JSON.stringify(validObject)));
    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    await provider.generateObjectFromMedia({
      schema: rubricSchema,
      prompt: "p",
      media: { buffer: audioBuffer, mimeType },
    });

    expect(lastRequest().body.messages[0].content[0].input_audio.format).toBe(format);
  });

  it("rejects an audio type with no OpenRouter format before any request", async () => {
    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    await expect(
      provider.generateObjectFromMedia({
        schema: rubricSchema,
        prompt: "p",
        media: { buffer: audioBuffer, mimeType: "video/mp4" },
      }),
    ).rejects.toBeInstanceOf(UnsupportedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("defaults to qwen/qwen3.8-omni-flash and strips the openrouter/ prefix of an override", async () => {
    fetchMock.mockImplementation(async () => chatReply(JSON.stringify(validObject)));
    const provider = new OpenRouterProvider({ apiKey: "test-key" });
    const input = { schema: rubricSchema, prompt: "p", media: { buffer: audioBuffer, mimeType: "audio/webm" } };

    await provider.generateObjectFromMedia(input);
    expect(lastRequest().body.model).toBe("qwen/qwen3.8-omni-flash");

    await provider.generateObjectFromMedia({ ...input, model: "openrouter/google/gemini-2.5-flash-lite" });
    expect(lastRequest().body.model).toBe("google/gemini-2.5-flash-lite");
  });

  it("returns the parsed object, also from a fenced JSON reply", async () => {
    fetchMock.mockResolvedValueOnce(chatReply("```json\n" + JSON.stringify(validObject) + "\n```"));
    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    await expect(
      provider.generateObjectFromMedia({
        schema: rubricSchema,
        prompt: "p",
        media: { buffer: audioBuffer, mimeType: "audio/webm" },
      }),
    ).resolves.toEqual(validObject);
  });

  it.each([
    ["text that is not JSON", "no json here"],
    ["JSON that does not match the schema", JSON.stringify({ overallScore: "high" })],
  ])("throws SchemaValidationError for %s", async (_label, content) => {
    fetchMock.mockResolvedValueOnce(chatReply(content));
    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    await expect(
      provider.generateObjectFromMedia({
        schema: rubricSchema,
        prompt: "p",
        media: { buffer: audioBuffer, mimeType: "audio/webm" },
      }),
    ).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it("throws PROVIDER_ERROR with the status and provider message for an HTTP error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Worker local total request limit reached" } }), {
        status: 502,
      }),
    );
    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    const error = await provider
      .generateObjectFromMedia({ schema: rubricSchema, prompt: "p", media: { buffer: audioBuffer, mimeType: "audio/webm" } })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AIClientError);
    expect((error as AIClientError).code).toBe("PROVIDER_ERROR");
    expect((error as Error).message).toMatch(/502.*Worker local total request limit reached/);
  });

  it("throws PROVIDER_ERROR when a 200 reply carries an error or no content", async () => {
    fetchMock
      .mockResolvedValueOnce(chatReply(null, 200, { error: { message: "upstream failed" } }))
      .mockResolvedValueOnce(chatReply(null));
    const provider = new OpenRouterProvider({ apiKey: "test-key" });
    const input = { schema: rubricSchema, prompt: "p", media: { buffer: audioBuffer, mimeType: "audio/webm" } };

    await expect(provider.generateObjectFromMedia(input)).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
    await expect(provider.generateObjectFromMedia(input)).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });

  it("throws PROVIDER_ERROR when the request itself fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("The operation was aborted due to timeout"));
    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    await expect(
      provider.generateObjectFromMedia({
        schema: rubricSchema,
        prompt: "p",
        media: { buffer: audioBuffer, mimeType: "audio/webm" },
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR", message: expect.stringMatching(/timeout/) });
  });
});

describe("OpenRouterProvider API key", () => {
  it("keeps the API key out of the object's properties and JSON", () => {
    const provider = new OpenRouterProvider({ apiKey: "secret-test-key" });
    expect(Object.keys(provider)).not.toContain("apiKey");
    expect(JSON.stringify(provider)).not.toContain("secret-test-key");
  });
});

describe("OpenRouterProvider.transcribeAudio", () => {
  it("asks an audio chat model for a verbatim transcript and returns the text", async () => {
    fetchMock.mockResolvedValueOnce(chatReply("สวัสดีค่ะคุณแม่"));
    const provider = new OpenRouterProvider({ apiKey: "test-key" });

    const result = await provider.transcribeAudio({
      media: { buffer: audioBuffer, mimeType: "audio/webm" },
      language: "th",
    });

    expect(result).toEqual({ text: "สวัสดีค่ะคุณแม่" });
    const { body } = lastRequest();
    expect(body.model).toBe("google/gemini-2.5-flash-lite");
    expect(body.response_format).toBeUndefined();
    expect(body.messages[0].content[0].input_audio.format).toBe("webm");
    expect(body.messages[0].content[1].text).toMatch(/Transcribe.*Language: th/);
  });
});
