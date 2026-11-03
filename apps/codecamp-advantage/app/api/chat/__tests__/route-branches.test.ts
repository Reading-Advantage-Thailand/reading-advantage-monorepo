// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAIClient: vi.fn(),
  streamText: vi.fn(),
  requireAuth: vi.fn(),
  getAuthToken: vi.fn(),
  legacyMode: vi.fn(),
  introspect: vi.fn(),
  readCookie: vi.fn(),
  resolveUser: vi.fn(),
  getChatContext: vi.fn(),
  createTenantDB: vi.fn(() => ({ tenant: true })),
  checkChatRateLimit: vi.fn(),
  db: { kind: "db" },
}));

vi.mock("@reading-advantage/ai", () => ({ createAIClient: mocks.createAIClient }));
vi.mock("@reading-advantage/auth", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@reading-advantage/api/context", () => ({ getAuthToken: mocks.getAuthToken }));
vi.mock("@/lib/auth-mode", () => ({ isLegacyCodecampAuthEnabled: mocks.legacyMode }));
vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  getCodecampOidcClient: () => ({ introspect: mocks.introspect }),
  readCodecampCookie: mocks.readCookie,
  resolveCodecampSessionUser: mocks.resolveUser,
}));
vi.mock("@reading-advantage/domain/codecamp", () => ({ getChatContext: mocks.getChatContext }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: mocks.createTenantDB }));
vi.mock("@/lib/rate-limit", () => ({ checkChatRateLimit: mocks.checkChatRateLimit }));
vi.mock("@reading-advantage/db", () => ({ db: mocks.db }));

import { POST } from "../route";

const user = { id: "u1", role: "INTERN", schoolId: "school-1" };
const moduleId = "00000000-0000-4000-8000-000000000001";

/** Builds a chat request with the given JSON body. */
function chat(body: unknown): NextRequest {
  return new NextRequest("https://codecamp.example/api/chat", { method: "POST", body: JSON.stringify(body) });
}

/** Builds a text stream that yields the given chunks. */
async function* stream(chunks: string[]) {
  for (const chunk of chunks) yield chunk;
}

describe("POST /api/chat branches", () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "test-key";
    mocks.legacyMode.mockReturnValue(false);
    mocks.readCookie.mockReturnValue("company-token");
    mocks.introspect.mockResolvedValue({ identity: { sub: "acct" } });
    mocks.resolveUser.mockResolvedValue(user);
    mocks.checkChatRateLimit.mockReturnValue({ allowed: true });
    mocks.getChatContext.mockResolvedValue("\n[context]");
    mocks.streamText.mockResolvedValue({ textStream: stream(["a", "b"]) });
    mocks.createAIClient.mockReturnValue({ streamText: mocks.streamText });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  });

  it("returns 401 when Accounts introspection throws", async () => {
    mocks.introspect.mockRejectedValue(new Error("accounts down"));

    const response = await POST(chat({ message: "hi" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication required" });
    expect(mocks.checkChatRateLimit).not.toHaveBeenCalled();
  });

  it("returns 401 without introspection when no session cookie exists", async () => {
    mocks.readCookie.mockReturnValue(undefined);

    const response = await POST(chat({ message: "hi" }));

    expect(response.status).toBe(401);
    expect(mocks.introspect).not.toHaveBeenCalled();
  });

  it("authenticates through the legacy adapter only in legacy mode", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.getAuthToken.mockResolvedValue("legacy-token");
    mocks.requireAuth.mockResolvedValue({ user });

    const response = await POST(chat({ message: "hi" }));

    expect(response.status).toBe(200);
    expect(mocks.requireAuth).toHaveBeenCalledWith(mocks.db, "legacy-token");
    expect(mocks.introspect).not.toHaveBeenCalled();
  });

  it("returns 429 with retryAfter and does not call the AI when rate limited", async () => {
    mocks.checkChatRateLimit.mockReturnValue({ allowed: false, retryAfter: 12 });

    const response = await POST(chat({ message: "hi" }));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: "Rate limit exceeded", retryAfter: 12 });
    expect(mocks.checkChatRateLimit).toHaveBeenCalledWith("u1");
    expect(mocks.createAIClient).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty message", { message: "" }],
    ["a message over 4000 characters", { message: "x".repeat(4001) }],
    ["a non-uuid module id", { message: "hi", moduleId: "module-1" }],
    ["an unsupported locale", { message: "hi", locale: "fr" }],
  ])("returns 400 for %s", async (_label, body) => {
    const response = await POST(chat(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Invalid input" });
    expect(mocks.getChatContext).not.toHaveBeenCalled();
  });

  it("returns the fallback text without context lookup when no API key is configured", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const response = await POST(chat({ message: "What is tRPC?" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.response).toContain("OPENROUTER_API_KEY not configured");
    expect(body.response).toContain('You asked: "What is tRPC?"');
    expect(mocks.getChatContext).not.toHaveBeenCalled();
  });

  it("scopes the context lookup to the learner's school and appends it to the English prompt", async () => {
    const response = await POST(chat({ message: "hi", moduleId, locale: "en" }));

    expect(mocks.createTenantDB).toHaveBeenCalledWith(mocks.db, { schoolId: "school-1" });
    expect(mocks.getChatContext).toHaveBeenCalledWith({ db: { tenant: true }, user, tenant: { schoolId: "school-1" }, input: { moduleId, lessonId: undefined } });
    const call = mocks.streamText.mock.calls[0][0];
    expect(call.system).toContain("Respond in English by default.");
    expect(call.system.endsWith("\n[context]")).toBe(true);
    expect(call).toMatchObject({ prompt: "hi", maxTokens: 2048 });
    expect(mocks.createAIClient).toHaveBeenCalledWith(expect.objectContaining({ provider: "openrouter", apiKey: "test-key" }));
    await expect(response.text()).resolves.toBe("ab");
    expect(response.headers.get("cache-control")).toBe("no-cache, no-transform");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
  });

  it("defaults the tutor prompt to Thai when no locale is sent", async () => {
    await POST(chat({ message: "hi" }));

    expect(mocks.streamText.mock.calls[0][0].system).toContain("Respond in Thai");
  });

  it("returns 500 and logs a structured error when context lookup fails", async () => {
    mocks.getChatContext.mockRejectedValue(new Error("Forbidden"));

    const response = await POST(chat({ message: "hi", moduleId }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to generate response" });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"event":"chat_api_error"'));
  });

  it("returns 500 for a malformed JSON body", async () => {
    const response = await POST(new NextRequest("https://codecamp.example/api/chat", { method: "POST", body: "{" }));

    expect(response.status).toBe(500);
  });

  it("errors the response stream when the AI stream fails mid-response", async () => {
    mocks.streamText.mockResolvedValue({
      textStream: (async function* () { yield "partial"; throw new Error("upstream reset"); })(),
    });

    const response = await POST(chat({ message: "hi" }));

    expect(response.status).toBe(200);
    await expect(response.text()).rejects.toThrow("upstream reset");
  });
});
