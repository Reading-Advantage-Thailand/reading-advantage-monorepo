/**
 * Phase 2 — Marketing App Public Workflow Security (Wave 3)
 * Group 2D: Zod input validation.
 *
 * Targets:
 *   app/api/settings/route.ts
 *   app/api/campaigns/route.ts
 *   app/api/campaigns/[id]/route.ts
 *   app/api/video/save-topics/route.ts
 *   app/api/video/research-topics/route.ts
 *   app/api/video/generate-script/route.ts
 * Evidence: LR-004-001, LR-marketing-app-003-004/006.
 *
 * Every mutating route must validate its body with a Zod schema before any
 * persistence or AI side effect. Tests use a valid session so failures are
 * isolated to validation, not auth.
 */

import { describe, expect, it, vi, type Mock } from "vitest";
import { SESSION_COOKIE_NAME } from "@reading-advantage/auth";
import { db } from "@reading-advantage/db";
import { getAIClient } from "@reading-advantage/ai";
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
const CAMPAIGN_ID = "00000000-0000-0000-0000-000000000004";

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
  const orderByMock = vi.fn().mockResolvedValue(rows);
  const fromMock = vi
    .fn()
    .mockReturnValue({ where: whereMock, orderBy: orderByMock });
  const selectMock = vi.fn().mockReturnValue({ from: fromMock });
  return { selectMock, fromMock, orderByMock, whereMock };
}

function makeInsertChainMock(returningRows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returningRows);
  const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
  const insertMock = vi.fn().mockReturnValue({ values: valuesMock });
  return { insertMock, valuesMock, returningMock };
}

function makeUpdateChainMock(returningRows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returningRows);
  const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  const updateMock = vi.fn().mockReturnValue({ set: setMock });
  return { updateMock, setMock, whereMock, returningMock };
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

describe("Phase 2D: Zod schemas exist and reject malformed input", () => {
  it("settingsPostSchema rejects non-object bodies", async () => {
    const mod = (await import("../lib/settings-schema.js")) as Record<
      string,
      unknown
    >;
    const schema = mod.settingsPostSchema as {
      safeParse: (input: unknown) => { success: boolean };
    };
    expect(schema).toBeDefined();
    expect(schema.safeParse("not-an-object").success).toBe(false);
    expect(schema.safeParse({ "llm.apiKey": 123 }).success).toBe(false);
  });

  it("createCampaignSchema rejects invalid type/app/name", async () => {
    const mod = (await import("../lib/campaign-schema.js")) as Record<
      string,
      unknown
    >;
    const schema = mod.createCampaignSchema as {
      safeParse: (input: unknown) => { success: boolean };
    };
    expect(schema).toBeDefined();
    expect(schema.safeParse({}).success).toBe(false);
    expect(
      schema.safeParse({
        type: "invalid",
        app: "reading-advantage",
        name: "x",
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        type: "video",
        app: "invalid-app",
        name: "x",
      }).success,
    ).toBe(false);
  });

  it("updateCampaignSchema rejects invalid status", async () => {
    const mod = (await import("../lib/campaign-schema.js")) as Record<
      string,
      unknown
    >;
    const schema = mod.updateCampaignSchema as {
      safeParse: (input: unknown) => { success: boolean };
    };
    expect(schema).toBeDefined();
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ status: "invalid" }).success).toBe(false);
  });

  it("saveTopicsSchema rejects non-array topics or invalid app", async () => {
    const mod = (await import("../lib/topic-schema.js")) as Record<
      string,
      unknown
    >;
    const schema = mod.saveTopicsSchema as {
      safeParse: (input: unknown) => { success: boolean };
    };
    expect(schema).toBeDefined();
    expect(
      schema.safeParse({ app: "reading-advantage", topics: "AI" })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({
        app: "invalid-app",
        topics: ["AI"],
      }).success,
    ).toBe(false);
  });

  it("researchTopicsSchema rejects missing or invalid app", async () => {
    const mod = (await import("../lib/topic-schema.js")) as Record<
      string,
      unknown
    >;
    const schema = mod.researchTopicsSchema as {
      safeParse: (input: unknown) => { success: boolean };
    };
    expect(schema).toBeDefined();
    expect(schema.safeParse({}).success).toBe(false);
    expect(
      schema.safeParse({ app: "invalid-app" }).success,
    ).toBe(false);
  });

  it("generateScriptSchema rejects missing or non-string app/topic", async () => {
    const mod = (await import("../lib/script-request-schema.js")) as Record<
      string,
      unknown
    >;
    const schema = mod.generateScriptSchema as {
      safeParse: (input: unknown) => { success: boolean };
    };
    expect(schema).toBeDefined();
    expect(schema.safeParse({}).success).toBe(false);
    expect(
      schema.safeParse({ app: "reading-advantage" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ topic: "AI" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        app: "reading-advantage",
        topic: { inject: "prompt" },
      }).success,
    ).toBe(false);
  });
});

describe("Phase 2D: Routes reject malformed input with 400 (RED at baseline)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/settings rejects non-object body and performs no insert", async () => {
    const { POST } = await import("@/api/settings/route");
    const { insertMock } = makeInsertChainMock([]);
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      authedRequest("http://localhost/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify("not-an-object"),
      }),
    );

    expect(response.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("POST /api/settings rejects non-string value and performs no insert", async () => {
    const { POST } = await import("@/api/settings/route");
    const { insertMock } = makeInsertChainMock([]);
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      authedRequest("http://localhost/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ "llm.apiKey": 123 }),
      }),
    );

    expect(response.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("POST /api/campaigns rejects invalid input and performs no insert", async () => {
    const { POST } = await import("@/api/campaigns/route");
    const { insertMock } = makeInsertChainMock([]);
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      authedRequest("http://localhost/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "invalid", app: "invalid-app" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("PATCH /api/campaigns/[id] rejects invalid status before status machine", async () => {
    const { PATCH } = await import("@/api/campaigns/[id]/route");
    const { selectMock } = makeSelectChainMock([
      {
        id: CAMPAIGN_ID,
        type: "video",
        app: "reading-advantage",
        name: "x",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    (db.select as Mock).mockImplementation(selectMock);
    const { updateMock } = makeUpdateChainMock([]);
    (db.update as Mock).mockImplementation(updateMock);

    const response = await PATCH(
      authedRequest(`http://localhost/api/campaigns/${CAMPAIGN_ID}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "invalid-status" }),
      }),
      { params: { id: CAMPAIGN_ID } },
    );

    expect(response.status).toBe(400);
    // Validation must short-circuit before the route looks up the campaign.
    expect(db.select).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("POST /api/video/save-topics rejects malformed topics and performs no insert", async () => {
    const { POST } = await import("@/api/video/save-topics/route");
    const { selectMock } = makeSelectChainMock([]);
    (db.select as Mock).mockImplementation(selectMock);
    const { insertMock } = makeInsertChainMock([]);
    (db.insert as Mock).mockImplementation(insertMock);

    const response = await POST(
      authedRequest("http://localhost/api/video/save-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage", topics: "AI" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("POST /api/video/research-topics rejects invalid app and performs no AI call", async () => {
    const { POST } = await import("@/api/video/research-topics/route");
    stubLLMSettings();
    const { createAIClient } = await import("@reading-advantage/ai");

    const response = await POST(
      authedRequest("http://localhost/api/video/research-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "invalid-app" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(db.select).not.toHaveBeenCalled();
    expect(createAIClient).not.toHaveBeenCalled();
  });

  it("POST /api/video/generate-script rejects unvalidated input before prompt/AI", async () => {
    const { POST } = await import("@/api/video/generate-script/route");
    stubLLMSettings();
    fakeAIClient.generateText.mockResolvedValueOnce(validScriptJson);
    const { createAIClient } = await import("@reading-advantage/ai");
    const promptSpy = vi.spyOn(
      await import("../lib/script-generation.js"),
      "buildScriptGenerationPrompt",
    );

    const response = await POST(
      authedRequest("http://localhost/api/video/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          app: "reading-advantage",
          topic: { inject: "prompt-injection-payload" },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(promptSpy).not.toHaveBeenCalled();
    expect(createAIClient).not.toHaveBeenCalled();
  });

  it("POST /api/video/generate-script rejects oversized topic", async () => {
    const { POST } = await import("@/api/video/generate-script/route");
    stubLLMSettings();
    fakeAIClient.generateText.mockResolvedValueOnce(validScriptJson);
    const { createAIClient } = await import("@reading-advantage/ai");

    const response = await POST(
      authedRequest("http://localhost/api/video/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          app: "reading-advantage",
          topic: "x".repeat(60_000),
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(createAIClient).not.toHaveBeenCalled();
  });
});
