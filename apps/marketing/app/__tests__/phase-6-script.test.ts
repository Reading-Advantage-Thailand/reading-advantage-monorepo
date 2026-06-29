/**
 * Phase 6 — Video Production: Script Generation
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 6)
 *
 * Per measure/tracks/video_pipeline_20260613/test-strategy.md §6:
 *   "P6 Script: JSONB-shape zod-schema test, scene reorder pure function,
 *    integration with MockLLM script fixture."
 *
 * Per §7 the Red command is `pnpm --filter marketing test phase-6-script`
 * and the Green gate additionally requires `phase-6-jsonb-schema`.
 *
 * This file encodes the Phase 6 verification contract as executable
 * assertions split into five tiers:
 *
 *   1. **Wiring invariants (Phase 6 tasks 1–3):** file-level + module-shape
 *      checks for the video production page and new script API routes.
 *      Some checks are Red at HEAD because the Step 3 UI and routes do
 *      not yet exist.
 *
 *   2. **Script-generation prompt builder (Phase 6 task 2 — LLM prompt):**
 *      asserts a shared `buildScriptGenerationPrompt` helper exists and
 *      requests a 5–7 scene Thai script with narration, image prompt, and
 *      motion direction per scene. **Red at HEAD** because no helper
 *      module exists.
 *
 *   3. **Script JSONB-shape schema (Phase 6 task 2 — contract):** asserts
 *      a `scriptSchema` with a Zod-compatible `safeParse` exists and
 *      enforces the 5–7 scene shape. **Red at HEAD** because no schema
 *      module exists.
 *
 *   4. **Scene-editor pure functions (Phase 6 task 3 — editor):** asserts
 *      shared `reorderScenes`, `addScene`, and `removeScene` helpers
 *      exist and behave immutably. **Red at HEAD** because no editor
 *      module exists.
 *
 *   5. **Script API integration (Phase 6 tasks 4–5 — verify):** asserts
 *      POST `/api/video/generate-script` returns a valid script array
 *      and POST `/api/video/projects` persists a script as JSONB in
 *      `video_projects`. **Red at HEAD** because the routes do not exist.
 */

import { describe, expect, it, vi, type Mock } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Mock the Next.js server primitives so route handlers can be imported
// and exercised without requiring a full Next.js runtime.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

// Mock the Drizzle client so script tests are deterministic and do not
// require a live Postgres connection during Phase 6 unit tests.
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

// Mock the AI client factory so script generation does not call a real LLM.
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
    __fakeAIClient: fakeClient,
  };
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const APP_ROOT = resolve(__dirname, "..", "..");

function readText(relPath: string): string {
  return readFileSync(resolve(APP_ROOT, relPath), "utf8");
}

interface Scene {
  narration: string;
  imagePrompt: string;
  motionDirection: string;
}

const mockSettingsRows = [
  { key: "llm.provider", value: "google" },
  { key: "llm.model", value: "gemini-pro" },
  { key: "llm.apiKey", value: "sk-test-key" },
];

function makeSelectChainMock() {
  const whereMock = vi.fn();
  const fromMock = vi.fn(() => ({ where: whereMock }));
  const selectMock = vi.fn(() => ({ from: fromMock }));
  return { selectMock, fromMock, whereMock };
}

function makeInsertChainMock(returningRows: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returningRows);
  const valuesMock = vi.fn(() => ({ returning: returningMock }));
  const insertMock = vi.fn(() => ({ values: valuesMock }));
  return { insertMock, valuesMock, returningMock };
}

const scriptFixture: Scene[] = [
  {
    narration: "ยินดีต้อนรับสู่ Reading Advantage",
    imagePrompt: "A bright Thai classroom with students reading tablets",
    motionDirection: "Slow zoom in from the back of the classroom",
  },
  {
    narration: "แพลตฟอร์มนี้ช่วยให้นักเรียนฝึกอ่านภาษาอังกฤษได้ทุกที่",
    imagePrompt: "A student smiling while using a tablet on a bench",
    motionDirection: "Gentle pan from left to right",
  },
  {
    narration: "ครูสามารถติดตามความก้าวหน้าของนักเรียนได้แบบเรียลไทม์",
    imagePrompt: "A teacher dashboard showing student progress charts",
    motionDirection: "Static frame with subtle UI highlight pulse",
  },
  {
    narration: "บทเรียนปรับระดับตามความสามารถของแต่ละคน",
    imagePrompt: "Adaptive learning path visualization with Thai labels",
    motionDirection: "Scroll along the path from start to current level",
  },
  {
    narration: "เริ่มต้นการเรียนรู้ที่สนุกและมีประสิทธิภาพวันนี้",
    imagePrompt: "Happy Thai students raising hands in a modern classroom",
    motionDirection: "Slow dolly out to reveal the classroom",
  },
  {
    narration: "ดาวน์โหลด Reading Advantage ฟรีผ่าน LINE หรือเว็บไซต์",
    imagePrompt: "Smartphone showing the Reading Advantage app with LINE QR",
    motionDirection: "Push in toward the phone screen",
  },
];

const invalidScriptMissingField = [
  {
    narration: "Scene without image prompt",
    motionDirection: "Static",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Tier 1: Wiring invariants — some Red at HEAD, kept as regression guards
// ─────────────────────────────────────────────────────────────────────

describe("Phase 6: Script Generation — wiring invariants (tasks 1-3)", () => {
  // FR-12: removed brittle `existsSync(...)` and `export default function`
  // source-regex assertions (build system already verifies file presence).

  it("video production page exposes Step 3: Generate Script", () => {
    const src = readText("app/campaigns/[id]/video/page.tsx");
    expect(src).toMatch(/Generate\s+Script/);
    expect(src).toMatch(/handleGenerateScript/);
  });

  it("video production page exposes scene editor controls", () => {
    const src = readText("app/campaigns/[id]/video/page.tsx");
    expect(src).toMatch(/reorderScenes|onReorder|moveScene|drag/i);
    expect(src).toMatch(/addScene|onAddScene/i);
    expect(src).toMatch(/removeScene|onRemoveScene|deleteScene/i);
  });

  it("apps/marketing/app/api/video/generate-script/route.ts exports POST", async () => {
    const mod = await import("@/api/video/generate-script/route");
    expect(typeof mod.POST).toBe("function");
  }, 20000);

  it("apps/marketing/app/api/video/projects/route.ts exports POST", async () => {
    const mod = await import("@/api/video/projects/route");
    expect(typeof mod.POST).toBe("function");
  }, 20000);
});

// ─────────────────────────────────────────────────────────────────────
// Tier 2: Script-generation prompt builder — RED at HEAD
// ─────────────────────────────────────────────────────────────────────

describe("Phase 6: Script Generation — prompt builder (task 2, RED)", () => {
  it("exports a shared buildScriptGenerationPrompt helper", async () => {
    const mod = await import("../lib/script-generation.js");
    expect(typeof mod.buildScriptGenerationPrompt).toBe("function");
  });

  it("prompt names the app and topic", async () => {
    const { buildScriptGenerationPrompt } = await import("../lib/script-generation.js");
    const prompt = buildScriptGenerationPrompt("reading-advantage", "การอ่านนิทาน");
    expect(prompt).toMatch(/reading advantage/i);
    expect(prompt).toContain("การอ่านนิทาน");
  });

  it("prompt requests 5–7 scenes", async () => {
    const { buildScriptGenerationPrompt } = await import("../lib/script-generation.js");
    const prompt = buildScriptGenerationPrompt("reading-advantage", "Topic");
    expect(prompt).toMatch(/5\s*[–-]\s*7/);
    expect(prompt).toMatch(/5\s+to\s+7/i);
  });

  it("prompt requests Thai narration", async () => {
    const { buildScriptGenerationPrompt } = await import("../lib/script-generation.js");
    const prompt = buildScriptGenerationPrompt("reading-advantage", "Topic");
    expect(prompt).toMatch(/Thai/);
    expect(prompt).toMatch(/narration|voiceover|คำบรรยาย/i);
  });

  it("prompt requests image prompt and motion direction per scene", async () => {
    const { buildScriptGenerationPrompt } = await import("../lib/script-generation.js");
    const prompt = buildScriptGenerationPrompt("reading-advantage", "Topic");
    expect(prompt).toMatch(/image\s+prompt/i);
    expect(prompt).toMatch(/motion\s+direction/i);
  });

  it("prompt requests JSON array output", async () => {
    const { buildScriptGenerationPrompt } = await import("../lib/script-generation.js");
    const prompt = buildScriptGenerationPrompt("reading-advantage", "Topic");
    expect(prompt).toMatch(/JSON\s+array/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tier 3: Script JSONB-shape schema — RED at HEAD (phase-6-jsonb-schema)
// ─────────────────────────────────────────────────────────────────────

describe("Phase 6: Script Generation — script schema (task 2, RED, phase-6-jsonb-schema)", () => {
  it("exports a scriptSchema with safeParse", async () => {
    const mod = await import("../lib/script-schema.js");
    expect(typeof mod.scriptSchema).toBe("object");
    expect(typeof mod.scriptSchema.safeParse).toBe("function");
  });

  it("safeParse accepts a valid 5–7 scene script", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const result = scriptSchema.safeParse(scriptFixture);
    expect(result.success).toBe(true);
  });

  it("safeParse rejects a non-array script", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const result = scriptSchema.safeParse({ narration: "wrong" });
    expect(result.success).toBe(false);
  });

  it("safeParse rejects a scene missing narration, imagePrompt, or motionDirection", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const result = scriptSchema.safeParse(invalidScriptMissingField);
    expect(result.success).toBe(false);
  });

  it("safeParse rejects a script with fewer than 5 scenes", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const result = scriptSchema.safeParse(scriptFixture.slice(0, 4));
    expect(result.success).toBe(false);
  });

  it("safeParse rejects a script with more than 7 scenes", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const result = scriptSchema.safeParse([...scriptFixture, ...scriptFixture]);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tier 4: Scene editor pure functions — RED at HEAD
// ─────────────────────────────────────────────────────────────────────

describe("Phase 6: Script Generation — scene editor (task 3, RED)", () => {
  it("exports reorderScenes, addScene, and removeScene helpers", async () => {
    const mod = await import("../lib/scene-editor.js");
    expect(typeof mod.reorderScenes).toBe("function");
    expect(typeof mod.addScene).toBe("function");
    expect(typeof mod.removeScene).toBe("function");
  });

  it("reorderScenes moves a scene from one index to another", async () => {
    const { reorderScenes } = await import("../lib/scene-editor.js");
    const reordered = reorderScenes(scriptFixture, 0, 2);
    expect(reordered).toHaveLength(scriptFixture.length);
    expect(reordered[2]).toEqual(scriptFixture[0]);
    expect(reordered[0]).toEqual(scriptFixture[1]);
    expect(reordered[1]).toEqual(scriptFixture[2]);
    // Original array must remain unchanged.
    expect(scriptFixture[0].narration).toBe("ยินดีต้อนรับสู่ Reading Advantage");
  });

  it("addScene appends a new scene to the script", async () => {
    const { addScene } = await import("../lib/scene-editor.js");
    const newScene: Scene = {
      narration: "ฉากใหม่",
      imagePrompt: "New image prompt",
      motionDirection: "Static",
    };
    const updated = addScene(scriptFixture, newScene);
    expect(updated).toHaveLength(scriptFixture.length + 1);
    expect(updated[updated.length - 1]).toEqual(newScene);
    // Original array must remain unchanged.
    expect(scriptFixture).toHaveLength(6);
  });

  it("removeScene removes a scene by index", async () => {
    const { removeScene } = await import("../lib/scene-editor.js");
    const updated = removeScene(scriptFixture, 1);
    expect(updated).toHaveLength(scriptFixture.length - 1);
    expect(updated[1]).toEqual(scriptFixture[2]);
    // Original array must remain unchanged.
    expect(scriptFixture).toHaveLength(6);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tier 5: Script API integration — RED at HEAD
// ─────────────────────────────────────────────────────────────────────

describe("Phase 6: Script Generation — API integration (tasks 4-5: verify, RED)", () => {
  it("POST /api/video/generate-script returns a 5–7 scene script", async () => {
    const { db } = await import("@reading-advantage/db");
    const { __fakeAIClient } = (await import("@reading-advantage/ai")) as unknown as {
      __fakeAIClient: { generateText: Mock };
    };

    const { selectMock, whereMock } = makeSelectChainMock();
    whereMock.mockResolvedValueOnce(mockSettingsRows);
    (db.select as Mock).mockImplementation(selectMock);

    __fakeAIClient.generateText.mockResolvedValueOnce(JSON.stringify(scriptFixture));

    const { POST } = await import("@/api/video/generate-script/route");
    const response = await POST(
      new Request("http://localhost/api/video/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage", topic: "การอ่านนิทาน" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { script: Scene[] };
    expect(body.script).toHaveLength(scriptFixture.length);
    expect(body.script[0]).toMatchObject({
      narration: expect.any(String),
      imagePrompt: expect.any(String),
      motionDirection: expect.any(String),
    });
  });

  it("POST /api/video/generate-script returns 500 for an LLM response that fails schema validation", async () => {
    const { db } = await import("@reading-advantage/db");
    const { __fakeAIClient } = (await import("@reading-advantage/ai")) as unknown as {
      __fakeAIClient: { generateText: Mock };
    };

    const { selectMock, whereMock } = makeSelectChainMock();
    whereMock.mockResolvedValueOnce(mockSettingsRows);
    (db.select as Mock).mockImplementation(selectMock);

    __fakeAIClient.generateText.mockResolvedValueOnce(JSON.stringify([{ narration: "incomplete" }]));

    const { POST } = await import("@/api/video/generate-script/route");
    const response = await POST(
      new Request("http://localhost/api/video/generate-script", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage", topic: "การอ่านนิทาน" }),
      }),
    );

    expect(response.status).toBe(500);
  });

  it("POST /api/video/projects inserts a video_project row with script JSONB", async () => {
    const { db } = await import("@reading-advantage/db");
    const mockProject = {
      id: "22222222-2222-2222-2222-222222222222",
      campaignId: "11111111-1111-1111-1111-111111111111",
      topic: "การอ่านนิทาน",
      script: scriptFixture,
      status: "draft",
    };
    const { insertMock, valuesMock, returningMock } = makeInsertChainMock([mockProject]);
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/video/projects/route");
    const response = await POST(
      new Request("http://localhost/api/video/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId: mockProject.campaignId,
          topic: mockProject.topic,
          script: scriptFixture,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: mockProject.campaignId,
        topic: mockProject.topic,
        script: scriptFixture,
      }),
    );
    expect(returningMock).toHaveBeenCalled();
  });

  it("POST /api/video/projects returns 400 for an invalid script shape", async () => {
    const { db } = await import("@reading-advantage/db");
    const { insertMock, valuesMock } = makeInsertChainMock([]);
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/video/projects/route");
    const response = await POST(
      new Request("http://localhost/api/video/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId: "11111111-1111-1111-1111-111111111111",
          topic: "Topic",
          script: [{ narration: "incomplete" }],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(valuesMock).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Phase 3 remaining: Zod-backed script schema with exhaustive edge cases
// ─────────────────────────────────────────────────────────────────────

describe("Phase 6: Script Generation — Zod-backed schema edge cases (Phase 3, RED)", () => {
  it("exports a Zod-backed schema with a parse method", async () => {
    const mod = await import("../lib/script-schema.js");
    expect(typeof (mod.scriptSchema as unknown as { parse?: unknown }).parse).toBe("function");
  });

  it("safeParse failures return ZodError issues with path details", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const result = scriptSchema.safeParse([{ narration: "Scene only" }]);
    expect(result.success).toBe(false);
    if (result.success) return;
    const issues = (result.error as unknown as { issues?: unknown[] }).issues ?? [];
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    const paths = issues.map((issue) => (issue as { path?: string[] }).path ?? []);
    expect(
      paths.some(
        (path) =>
          path.includes("imagePrompt") || path.includes("motionDirection"),
      ),
    ).toBe(true);
  });

  it("rejects fewer than 5 scenes with structured ZodError issues", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const result = scriptSchema.safeParse(scriptFixture.slice(0, 4));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      Array.isArray((result.error as unknown as { issues?: unknown[] }).issues),
    ).toBe(true);
  });

  it("rejects more than 7 scenes with structured ZodError issues", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const result = scriptSchema.safeParse([...scriptFixture, ...scriptFixture]);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      Array.isArray((result.error as unknown as { issues?: unknown[] }).issues),
    ).toBe(true);
  });

  it("rejects empty string fields with path-aware issues", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const emptyScene = {
      narration: "",
      imagePrompt: "",
      motionDirection: "",
    };
    const result = scriptSchema.safeParse(Array.from({ length: 5 }, () => emptyScene));
    expect(result.success).toBe(false);
    if (result.success) return;
    const issues = (result.error as unknown as { issues?: { message?: string; path?: string[] }[] }).issues ?? [];
    const messages = issues.map((i) => i.message ?? "").join(" ");
    expect(messages).toMatch(/narration|imagePrompt|motionDirection|empty|string/i);
  });

  it("rejects non-string field types with structured issues", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const result = scriptSchema.safeParse([
      { narration: 123, imagePrompt: true, motionDirection: null },
    ]);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      Array.isArray((result.error as unknown as { issues?: unknown[] }).issues),
    ).toBe(true);
  });

  it("rejects scenes with extra unknown fields (strict scene contract)", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const scene = { ...scriptFixture[0], extraField: "should not be allowed" };
    const result = scriptSchema.safeParse(Array.from({ length: 5 }, () => scene));
    expect(result.success).toBe(false);
  });

  it("accepts scripts with exactly 5, 6, and 7 scenes", async () => {
    const { scriptSchema } = await import("../lib/script-schema.js");
    const five = scriptFixture.slice(0, 5);
    const six = scriptFixture;
    const seven = [...scriptFixture, { ...scriptFixture[0] }];
    expect(scriptSchema.safeParse(five).success).toBe(true);
    expect(scriptSchema.safeParse(six).success).toBe(true);
    expect(scriptSchema.safeParse(seven).success).toBe(true);
  });
});
