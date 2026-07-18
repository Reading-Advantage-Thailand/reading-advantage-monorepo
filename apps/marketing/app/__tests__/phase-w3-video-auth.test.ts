/**
 * Phase 2 — Marketing App Public Workflow Security (Wave 3)
 * Group 2B: Video routes unauthenticated.
 *
 * Targets:
 *   app/api/video/save-topics/route.ts
 *   app/api/video/generate-script/route.ts
 *   app/api/video/research-topics/route.ts
 *   app/api/video/projects/route.ts
 * Evidence: LR-004-002.
 */

import { describe, expect, it, vi, type Mock } from "vitest";
import {
  SESSION_COOKIE_NAME,
  validateSession,
} from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { getAIClient } from "@reading-advantage/ai";
import { settings, pastTopics } from "@reading-advantage/db/schema";
import { encrypt } from "@/lib/encryption";

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

const KNOWN_TOKEN = "w3-known-session-token";

function authedRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: {
      ...init.headers,
      Cookie: `${SESSION_COOKIE_NAME}=${KNOWN_TOKEN}`,
    },
  });
}

function unauthedRequest(url: string, init: RequestInit = {}): Request {
  return new Request(url, init);
}

function makeSelectChainMock(rows: unknown[]) {
  const whereMock = vi.fn().mockResolvedValue(rows);
  const fromMock = vi.fn().mockReturnValue({ where: whereMock });
  const selectMock = vi.fn().mockReturnValue({ from: fromMock });
  return { selectMock, fromMock, whereMock };
}

function makeInsertChainMock(returningRows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returningRows);
  const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
  const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
  return { insertMock, valuesMock, returningMock };
}

/**
 * Build a Drizzle select mock that returns different rows depending on which
 * table is queried. This is needed for routes that read both settings and
 * pastTopics in the same handler.
 */
function makeTableAwareSelectMock(
  tableRows: Record<string, unknown[]>,
) {
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
    { key: "llm.apiKey", value: encrypt("sk-w3-video-test-key") },
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

describe("Phase 2B: Video routes — unauthenticated boundary (RED at baseline)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/video/save-topics without session returns 401 and does not insert", async () => {
    const { POST } = await import("@/api/video/save-topics/route");
    const { selectMock } = makeSelectChainMock([]);
    (db.select as Mock).mockImplementation(selectMock);
    const { insertMock } = makeInsertChainMock([]);
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      unauthedRequest("http://localhost/api/video/save-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage", topics: ["AI"] }),
      }),
    );

    expect(response.status).toBe(401);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("POST /api/video/generate-script without session returns 401 and does not call AI or read settings", async () => {
    const { POST } = await import("@/api/video/generate-script/route");
    stubLLMSettings();
    fakeAIClient.generateText.mockResolvedValueOnce(validScriptJson);
    const { createAIClient } = await import("@reading-advantage/ai");

    const response = await POST(
      unauthedRequest("http://localhost/api/video/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage", topic: "AI" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(db.select).not.toHaveBeenCalled();
    expect(createAIClient).not.toHaveBeenCalled();
  });

  it("POST /api/video/research-topics without session returns 401 and does not call AI or read settings", async () => {
    const { POST } = await import("@/api/video/research-topics/route");
    const { selectMock } = makeTableAwareSelectMock({
      settings: [
        { key: "llm.provider", value: "google" },
        { key: "llm.model", value: "gemini-pro" },
        {
          key: "llm.apiKey",
          value: encrypt("sk-w3-video-test-key"),
        },
      ],
      pastTopics: [],
    });
    (db.select as Mock).mockImplementation(selectMock);
    fakeAIClient.generateText.mockResolvedValueOnce(
      JSON.stringify(["Machine Learning", "Neural Networks"]),
    );
    const { createAIClient } = await import("@reading-advantage/ai");

    const response = await POST(
      unauthedRequest("http://localhost/api/video/research-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(db.select).not.toHaveBeenCalled();
    expect(createAIClient).not.toHaveBeenCalled();
  });

  it("GET /api/video/projects without session returns 401 and does not select", async () => {
    const { GET } = await import("@/api/video/projects/route");
    const { selectMock } = makeSelectChainMock([]);
    (db.select as Mock).mockImplementation(selectMock);

    const response = await GET(
      unauthedRequest(
        "http://localhost/api/video/projects?campaignId=00000000-0000-0000-0000-000000000004",
      ),
    );

    expect(response.status).toBe(401);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("POST /api/video/projects without session returns 401 and does not insert", async () => {
    const { POST } = await import("@/api/video/projects/route");
    const { insertMock } = makeInsertChainMock([
      {
        id: "00000000-0000-0000-0000-000000000005",
        campaignId: "00000000-0000-0000-0000-000000000004",
        topic: "AI",
        script: JSON.parse(validScriptJson),
        status: "draft",
      },
    ]);
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      unauthedRequest("http://localhost/api/video/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId: "00000000-0000-0000-0000-000000000004",
          topic: "AI",
          script: JSON.parse(validScriptJson),
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("Phase 2B: Video routes — authenticated positive controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/video/save-topics with valid session proceeds past the guard", async () => {
    const { POST } = await import("@/api/video/save-topics/route");
    const { selectMock } = makeSelectChainMock([]);
    (db.select as Mock).mockImplementation(selectMock);
    const { insertMock } = makeInsertChainMock([]);
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      authedRequest("http://localhost/api/video/save-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage", topics: ["AI"] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(validateSession).toHaveBeenCalledWith(
      expect.anything(),
      KNOWN_TOKEN,
    );
  });

  it("POST /api/video/generate-script with valid session proceeds past the guard", async () => {
    const { POST } = await import("@/api/video/generate-script/route");
    stubLLMSettings();
    fakeAIClient.generateText.mockResolvedValueOnce(validScriptJson);

    const response = await POST(
      authedRequest("http://localhost/api/video/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage", topic: "AI" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(validateSession).toHaveBeenCalledWith(
      expect.anything(),
      KNOWN_TOKEN,
    );
  });

  it("POST /api/video/research-topics with valid session proceeds past the guard", async () => {
    const { POST } = await import("@/api/video/research-topics/route");
    const { selectMock } = makeTableAwareSelectMock({
      settings: [
        { key: "llm.provider", value: "google" },
        { key: "llm.model", value: "gemini-pro" },
        {
          key: "llm.apiKey",
          value: encrypt("sk-w3-video-test-key"),
        },
      ],
      pastTopics: [],
    });
    (db.select as Mock).mockImplementation(selectMock);
    fakeAIClient.generateText.mockResolvedValueOnce(
      JSON.stringify(["Machine Learning", "Neural Networks"]),
    );

    const response = await POST(
      authedRequest("http://localhost/api/video/research-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(validateSession).toHaveBeenCalledWith(
      expect.anything(),
      KNOWN_TOKEN,
    );
  });

  it("GET /api/video/projects with valid session proceeds past the guard", async () => {
    const { GET } = await import("@/api/video/projects/route");
    const { selectMock } = makeSelectChainMock([]);
    (db.select as Mock).mockImplementation(selectMock);

    const response = await GET(
      authedRequest(
        "http://localhost/api/video/projects?campaignId=00000000-0000-0000-0000-000000000004",
      ),
    );

    expect(response.status).toBe(200);
    expect(validateSession).toHaveBeenCalledWith(
      expect.anything(),
      KNOWN_TOKEN,
    );
  });

  it("POST /api/video/projects with valid session proceeds past the guard", async () => {
    const { POST } = await import("@/api/video/projects/route");
    const { insertMock } = makeInsertChainMock([
      {
        id: "00000000-0000-0000-0000-000000000005",
        campaignId: "00000000-0000-0000-0000-000000000004",
        topic: "AI",
        script: JSON.parse(validScriptJson),
        status: "draft",
      },
    ]);
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      authedRequest("http://localhost/api/video/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId: "00000000-0000-0000-0000-000000000004",
          topic: "AI",
          script: JSON.parse(validScriptJson),
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(validateSession).toHaveBeenCalledWith(
      expect.anything(),
      KNOWN_TOKEN,
    );
  });
});
