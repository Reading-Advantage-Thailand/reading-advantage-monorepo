import { describe, it, expect, vi, beforeEach } from "vitest";

const aiMocks = vi.hoisted(() => ({ createAIClient: vi.fn(), streamText: vi.fn() }));
const authMocks = vi.hoisted(() => ({
  legacyMode: vi.fn(),
  introspect: vi.fn(),
  readCookie: vi.fn(),
  resolveUser: vi.fn(),
}));

vi.mock("@reading-advantage/ai", () => ({
  createAIClient: aiMocks.createAIClient,
}));

vi.mock("@reading-advantage/auth", () => ({ requireAuth: vi.fn() }));

vi.mock("@reading-advantage/api/context", () => ({
  getAuthToken: vi.fn(),
}));

vi.mock("@/lib/auth-mode", () => ({
  isLegacyCodecampAuthEnabled: authMocks.legacyMode,
}));

vi.mock("@/lib/company-oidc", () => ({
  CODECAMP_SESSION_COOKIE: "__Host-ra_codecamp_session",
  getCodecampOidcClient: () => ({ introspect: authMocks.introspect }),
  readCodecampCookie: authMocks.readCookie,
  resolveCodecampSessionUser: authMocks.resolveUser,
}));

vi.mock("@reading-advantage/domain/codecamp", () => ({
  getChatContext: vi.fn(),
}));

vi.mock("@reading-advantage/domain", () => ({
  createTenantDB: vi.fn(() => ({})),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkChatRateLimit: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@reading-advantage/db", () => ({ db: {} }));

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
    authMocks.legacyMode.mockReturnValue(true);
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
    expect(requireAuth).toHaveBeenCalledWith({}, "token");
    expect(authMocks.introspect).not.toHaveBeenCalled();
  });

  it("streams for a verified company session", async () => {
    authMocks.legacyMode.mockReturnValue(false);
    authMocks.readCookie.mockReturnValue("company-token");
    authMocks.introspect.mockResolvedValue({ identity: { organizationId: "org-1" } });
    authMocks.resolveUser.mockResolvedValue(user);
    aiMocks.streamText.mockResolvedValue(buildStreamTextResult(["Company", " chat"]));

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi", locale: "en" }),
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toBe("Company chat");
    expect(authMocks.introspect).toHaveBeenCalledWith("company-token");
    expect(authMocks.resolveUser).toHaveBeenCalledWith({ organizationId: "org-1" });
    expect(requireAuth).not.toHaveBeenCalled();
  });

  it("rejects a revoked company session", async () => {
    authMocks.legacyMode.mockReturnValue(false);
    authMocks.readCookie.mockReturnValue("revoked-token");
    authMocks.introspect.mockResolvedValue(null);

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "hi" }),
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Authentication required" });
    expect(aiMocks.streamText).not.toHaveBeenCalled();
  });

  it("rejects a legacy token in company mode", async () => {
    authMocks.legacyMode.mockReturnValue(false);
    authMocks.readCookie.mockReturnValue(undefined);
    vi.mocked(getAuthToken).mockResolvedValue("legacy-token");

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { cookie: "session_token=legacy-token" },
      body: JSON.stringify({ message: "hi" }),
    });
    const res = await POST(req as unknown as import("next/server").NextRequest);

    expect(res.status).toBe(401);
    expect(getAuthToken).not.toHaveBeenCalled();
    expect(requireAuth).not.toHaveBeenCalled();
    expect(authMocks.introspect).not.toHaveBeenCalled();
  });
});
