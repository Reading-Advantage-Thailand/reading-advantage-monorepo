import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const selectWhere = vi.fn();
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));
  const returning = vi.fn();
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));
  const transaction = vi.fn(async (handler: (tx: unknown) => unknown) =>
    handler({ insert }),
  );
  const generateText = vi.fn();
  return {
    selectWhere,
    select,
    returning,
    onConflictDoNothing,
    values,
    insert,
    transaction,
    generateText,
  };
});

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/ai", () => ({
  createAIClient: () => ({ generateText: mocks.generateText }),
}));

vi.mock("@/lib/ai-credentials", () => ({
  resolveMarketingAIConfig: () => ({
    provider: "openai",
    model: "test-model",
    apiKey: "test-api-key",
  }),
}));

vi.mock("@/lib/auth", () => ({
  requireMarketingPermission: vi.fn(async () => ({
    ok: true,
    session: { user: { id: "marketing-user", role: "ADMIN" } },
  })),
}));

import { POST as generateScript } from "@/api/video/generate-script/route";
import { POST as researchTopics } from "@/api/video/research-topics/route";
import { POST as saveTopics } from "@/api/video/save-topics/route";

const settingsRows = [
  { key: "llm.provider", value: "openai" },
  { key: "llm.model", value: "test-model" },
];

const thaiScript = Array.from({ length: 5 }, (_, index) => ({
  narration: `คำบรรยายภาษาไทยฉากที่ ${index + 1}`,
  imagePrompt: `Image prompt ${index + 1}`,
  motionDirection: `Motion ${index + 1}`,
}));

const englishScript = thaiScript.map((scene, index) => ({
  ...scene,
  narration: `English narration scene ${index + 1}`,
}));

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Marketing generated-script Thai narration contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectWhere.mockResolvedValue(settingsRows);
  });

  it("repairs a structurally valid English-narration response once", async () => {
    mocks.generateText
      .mockResolvedValueOnce(JSON.stringify(englishScript))
      .mockResolvedValueOnce(JSON.stringify(thaiScript));

    const response = await generateScript(
      post("http://localhost/api/video/generate-script", {
        app: "reading-advantage",
        topic: "การอ่าน",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ script: thaiScript });
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
    expect(mocks.generateText.mock.calls[1]?.[0]?.prompt).toMatch(
      /repair|Thai narration|ภาษาไทย/i,
    );
  });

  it("returns a typed 422 after the single repair still lacks Thai narration", async () => {
    mocks.generateText.mockResolvedValue(JSON.stringify(englishScript));

    const response = await generateScript(
      post("http://localhost/api/video/generate-script", {
        app: "reading-advantage",
        topic: "การอ่าน",
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      code: "THAI_NARRATION_REQUIRED",
      message: "Generated script narration must be Thai in every scene",
      repairAttempts: 1,
    });
    expect(mocks.generateText).toHaveBeenCalledTimes(2);
  });

  it("accepts a Thai script without an unnecessary repair call", async () => {
    mocks.generateText.mockResolvedValueOnce(JSON.stringify(thaiScript));

    const response = await generateScript(
      post("http://localhost/api/video/generate-script", {
        app: "reading-advantage",
        topic: "การอ่าน",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.generateText).toHaveBeenCalledTimes(1);
  });
});

describe("Marketing topic research cardinality contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectWhere
      .mockResolvedValueOnce(settingsRows)
      .mockResolvedValueOnce([{ topic: "Old Topic" }]);
  });

  it("deduplicates before capping and returns five topics when the model supplies enough", async () => {
    mocks.generateText.mockResolvedValueOnce(
      JSON.stringify([
        "Old Topic",
        "New 1",
        "New 2",
        "New 3",
        "New 4",
        "New 5",
      ]),
    );

    const response = await researchTopics(
      post("http://localhost/api/video/research-topics", {
        app: "reading-advantage",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      topics: ["New 1", "New 2", "New 3", "New 4", "New 5"],
    });
  });

  it("returns a typed 422 instead of silently returning fewer than five topics", async () => {
    mocks.generateText.mockResolvedValueOnce(
      JSON.stringify(["Old Topic", "New 1", "New 2", "New 3", "New 4"]),
    );

    const response = await researchTopics(
      post("http://localhost/api/video/research-topics", {
        app: "reading-advantage",
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      code: "TOPIC_RESEARCH_SHORTFALL",
      message: "Topic research produced fewer than five distinct new topics",
      expectedCount: 5,
      actualCount: 4,
    });
  });
});

describe("Marketing approved-topic conflict-safe persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.returning.mockResolvedValue([
      { normalizedKey: "reading advantageสำหรับเด็ก" },
    ]);
  });

  it("uses one transaction and an app-plus-normalized-key conflict target", async () => {
    const response = await saveTopics(
      post("http://localhost/api/video/save-topics", {
        app: "reading-advantage",
        topics: [
          "Reading Advantage สำหรับเด็ก",
          "reading advantageสำหรับเด็ก",
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledWith([
      {
        app: "reading-advantage",
        topic: "Reading Advantage สำหรับเด็ก",
        normalizedKey: "reading advantageสำหรับเด็ก",
      },
    ]);
    expect(mocks.onConflictDoNothing).toHaveBeenCalledWith({
      target: expect.any(Array),
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      insertedCount: 1,
    });
  });
});
