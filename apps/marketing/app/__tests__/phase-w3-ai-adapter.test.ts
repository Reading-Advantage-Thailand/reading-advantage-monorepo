/**
 * Phase 2 — Marketing App Public Workflow Security (Wave 3)
 * Group 2E: AI adapter routing.
 *
 * Targets:
 *   app/api/video/generate-script/route.ts
 *   app/api/video/research-topics/route.ts
 * Evidence: LR-004-003.
 *
 * AI calls must route through the shared @reading-advantage/ai adapter
 * (re-exported locally at @/lib/ai), not through per-request provider SDKs.
 */

import { describe, expect, it, vi, type Mock } from "vitest";
import { SESSION_COOKIE_NAME } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { getAIClient } from "@reading-advantage/ai";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { settings, pastTopics } from "@reading-advantage/db/schema";

const fakeAIClient = getAIClient() as unknown as { generateText: Mock };

process.env.ENCRYPTION_KEY ??=
  "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

vi.mock("@reading-advantage/auth", async () => {
  const actual =
    await vi.importActual<typeof import("@reading-advantage/auth")>(
      "@reading-advantage/auth",
    );
  const validateSession = vi.fn(
    async (_db: unknown, token: string): Promise<unknown | null> => {
      if (token === "w3-known-session-token") {
        return {
          id: "00000000-0000-0000-0000-000000000001",
          userId: "00000000-0000-0000-0000-000000000002",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          user: {
            id: "00000000-0000-0000-0000-000000000002",
            username: "staff",
            name: "Staff User",
            role: "ADMIN",
            schoolId: "00000000-0000-0000-0000-000000000003",
            xp: 0,
            level: 1,
            cefrLevel: "B2",
          },
        };
      }
      return null;
    },
  );
  const getSession = async (dbArg: unknown, token: string | undefined) => {
    if (!token) return null;
    return validateSession(dbArg, token);
  };
  const requireAuthImpl = async (
    dbArg: unknown,
    token: string | undefined,
  ) => {
    const session = await getSession(dbArg, token);
    if (!session) {
      throw new actual.AuthError("Authentication required", "UNAUTHORIZED");
    }
    return session;
  };
  return {
    ...actual,
    validateSession,
    getSession,
    requireAuth: requireAuthImpl,
  };
});

vi.mock("@reading-advantage/db", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/db")>(
    "@reading-advantage/db",
  );
  return {
    ...actual,
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({
        strings,
        values,
      }),
      { raw: (strings: TemplateStringsArray) => strings },
    ),
    db: {
      execute: vi.fn(),
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
    },
  };
});

vi.mock("@reading-advantage/ai", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/ai")>(
    "@reading-advantage/ai",
  );
  const generateText = vi.fn();
  const fakeClient = { generateText };
  return {
    ...actual,
    createAIClient: vi.fn(() => fakeClient),
    getAIClient: vi.fn(() => fakeClient),
    resetAIClient: vi.fn(),
  };
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = resolve(__dirname, "..", "..");

const KNOWN_TOKEN = "w3-known-session-token";
const API_KEY = "sk-w3-ai-adapter-test-key";

function authedRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: {
      ...init.headers,
      Cookie: `${SESSION_COOKIE_NAME}=${KNOWN_TOKEN}`,
    },
  });
}

function makeSelectChainMock(rows: unknown[]) {
  const whereMock = vi.fn().mockResolvedValue(rows);
  const fromMock = vi.fn().mockReturnValue({ where: whereMock });
  const selectMock = vi.fn().mockReturnValue({ from: fromMock });
  return { selectMock, fromMock, whereMock };
}

function makeTableAwareSelectMock(tableRows: Record<string, unknown[]>) {
  const fromMock = vi.fn((table) => {
    const name =
      table === settings ? "settings" : table === pastTopics ? "pastTopics" : "default";
    const rows = tableRows[name] ?? [];
    const whereMock = vi.fn().mockResolvedValue(rows);
    return { where: whereMock };
  });
  const selectMock = vi.fn(() => ({ from: fromMock }));
  return { selectMock, fromMock };
}

function stubLLMSettings() {
  const { selectMock } = makeSelectChainMock([
    { key: "llm.provider", value: "google" },
    { key: "llm.model", value: "gemini-pro" },
    { key: "llm.apiKey", value: API_KEY },
  ]);
  (db.select as Mock).mockImplementation(selectMock);
}

const validScriptJson = JSON.stringify([
  {
    narration: "Welcome to Reading Advantage.",
    imagePrompt: "A child reading a book",
    motionDirection: "Slow zoom in",
  },
  {
    narration: "Our platform adapts to every learner.",
    imagePrompt: "A tablet showing a quiz",
    motionDirection: "Pan right",
  },
  {
    narration: "Teachers track progress in real time.",
    imagePrompt: "A teacher dashboard",
    motionDirection: "Static",
  },
  {
    narration: "Students stay motivated with games.",
    imagePrompt: "A game screen",
    motionDirection: "Bounce",
  },
  {
    narration: "Join us today.",
    imagePrompt: "A school logo",
    motionDirection: "Fade in",
  },
]);

describe("Phase 2E: AI adapter routing — regression guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generate-script uses the shared adapter and returns parsed script", async () => {
    const { POST } = await import("@/api/video/generate-script/route");
    stubLLMSettings();
    fakeAIClient.generateText.mockResolvedValueOnce(validScriptJson);
    const { createAIClient } = await import("@reading-advantage/ai");

    const response = await POST(
      authedRequest("http://localhost/api/video/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage", topic: "AI" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createAIClient).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: API_KEY }),
    );
    const body = (await response.json()) as { script: unknown };
    expect(body.script).toBeDefined();
  });

  it("research-topics uses the shared adapter and returns topics", async () => {
    const { POST } = await import("@/api/video/research-topics/route");
    const { selectMock } = makeTableAwareSelectMock({
      settings: [
        { key: "llm.provider", value: "google" },
        { key: "llm.model", value: "gemini-pro" },
        { key: "llm.apiKey", value: API_KEY },
      ],
      pastTopics: [],
    });
    (db.select as Mock).mockImplementation(selectMock);
    fakeAIClient.generateText.mockResolvedValueOnce(
      JSON.stringify(["Machine Learning", "Neural Networks"]),
    );
    const { createAIClient } = await import("@reading-advantage/ai");

    const response = await POST(
      authedRequest("http://localhost/api/video/research-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(createAIClient).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: API_KEY }),
    );
  });

  it("marketing route sources contain zero direct provider-SDK imports", () => {
    // Static guard: count direct imports of @ai-sdk/* or provider SDKs in
    // marketing route sources. Emit a labeled integer for auditability (A3).
    const allFiles = readdirSync(APP_ROOT, { recursive: true }) as string[];
    const routeFiles = allFiles.filter(
      (p) => p.startsWith("app/api/") && p.endsWith(".ts"),
    );
    const bannedPatterns = [
      /from\s+["']@ai-sdk\//,
      /from\s+["']@google\/generative-ai["']/,
      /from\s+["']openai["']/,
      /from\s+["']@anthropic-ai\/sdk["']/,
    ];
    let directSdkImportCount = 0;
    for (const file of routeFiles) {
      const src = readFileSync(resolve(APP_ROOT, file), "utf8");
      for (const pattern of bannedPatterns) {
        if (pattern.test(src)) {
          directSdkImportCount++;
          break;
        }
      }
    }
    console.log(`Direct SDK import count: ${directSdkImportCount}`);
    expect(directSdkImportCount).toBe(0);
  });
});

describe("Phase 2E: AI adapter error redaction — RED at baseline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generate-script does not echo the llm.apiKey when the adapter throws", async () => {
    const { POST } = await import("@/api/video/generate-script/route");
    stubLLMSettings();
    fakeAIClient.generateText.mockRejectedValueOnce(
      new Error(`GoogleGenerativeAIError: Invalid API key: ${API_KEY} provided`),
    );

    const response = await POST(
      authedRequest("http://localhost/api/video/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage", topic: "AI" }),
      }),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    const body = await response.text();
    expect(body).not.toContain(API_KEY);
  });

  it("research-topics does not echo the llm.apiKey when the adapter throws", async () => {
    const { POST } = await import("@/api/video/research-topics/route");
    const { selectMock } = makeTableAwareSelectMock({
      settings: [
        { key: "llm.provider", value: "google" },
        { key: "llm.model", value: "gemini-pro" },
        { key: "llm.apiKey", value: API_KEY },
      ],
      pastTopics: [],
    });
    (db.select as Mock).mockImplementation(selectMock);
    fakeAIClient.generateText.mockRejectedValueOnce(
      new Error(`GoogleGenerativeAIError: Invalid API key: ${API_KEY} provided`),
    );

    const response = await POST(
      authedRequest("http://localhost/api/video/research-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage" }),
      }),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    const body = await response.text();
    expect(body).not.toContain(API_KEY);
  });
});
