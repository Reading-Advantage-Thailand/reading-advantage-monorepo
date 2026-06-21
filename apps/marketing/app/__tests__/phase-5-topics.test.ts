/**
 * Phase 5 — Video Production: Topic Research
 * (measure/tracks/video_pipeline_20260613/plan.md → Phase 5)
 *
 * Per measure/tracks/video_pipeline_20260613/test-strategy.md §6:
 *   "P5 Topics: prompt-builder unit, dedup-matcher unit (Thai NFC),
 *    integration with MockLLM returning fixed 5 topics + 1 near-duplicate."
 *
 * Per §7 the Red command is `pnpm --filter marketing test phase-5-topics`
 * and the Green gate additionally requires `phase-5-dedup-thai`.
 *
 * This file encodes the Phase 5 verification contract as executable
 * assertions split into four tiers:
 *
 *   1. **Wiring invariants (Phase 5 tasks 1–4):** file-level + module-shape
 *      checks for the video production page and topic API routes.
 *      These stay Green to prove the wiring isn't accidentally reverted.
 *
 *   2. **Topic-research prompt builder (Phase 5 task 2 — research prompt):**
 *      asserts a shared `buildTopicResearchPrompt` helper exists and
 *      includes the app identity, target audience, and past-topic guardrails.
 *      **Red at HEAD** because no such helper module exists.
 *
 *   3. **Topic deduplication matcher (Phase 5 task 2 — dedup):**
 *      asserts a shared dedup helper exists and normalizes Thai text
 *      (NFC + lowercase Latin + trim) before comparing topics.
 *      **Red at HEAD** because no dedup module exists.
 *
 *   4. **Topic API integration (Phase 5 task 6 — verify):**
 *      asserts POST `/api/video/research-topics` returns exactly 5 distinct
 *      topics not already in `past_topics`, and that POST
 *      `/api/video/save-topics` skips duplicates (including Thai/Latin
 *      variants) before inserting. **Red at HEAD** because the routes do
 *      not enforce the 5-topic contract or deduplicate on save.
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

// Mock the Drizzle client so topic tests are deterministic and do not
// require a live Postgres connection during Phase 5 unit tests.
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
    },
  };
});

// Mock the AI client factory so topic research does not call a real LLM.
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

function makeInsertChainMock() {
  const valuesMock = vi.fn();
  const insertMock = vi.fn(() => ({ values: valuesMock }));
  return { insertMock, valuesMock };
}

// ─────────────────────────────────────────────────────────────────────
// Tier 1: Wiring invariants — pass at HEAD, kept as regression guards
// ─────────────────────────────────────────────────────────────────────

describe("Phase 5: Topic Research — wiring invariants (tasks 1-4)", () => {
  it("apps/marketing/app/campaigns/[id]/video/page.tsx exists and exports a page", () => {
    expect(existsSync(resolve(APP_ROOT, "app/campaigns/[id]/video/page.tsx"))).toBe(true);
    const src = readText("app/campaigns/[id]/video/page.tsx");
    expect(src).toMatch(/export\s+default\s+function\s+\w+\s*\(/);
  });

  it("video production page renders the 8-product app selector", () => {
    const src = readText("app/campaigns/[id]/video/page.tsx");
    expect(src).toMatch(/reading-advantage/);
    expect(src).toMatch(/tutor-advantage/);
    expect(src).toMatch(/<select/);
  });

  it("video production page exposes a Research Topics button", () => {
    const src = readText("app/campaigns/[id]/video/page.tsx");
    expect(src).toMatch(/Research\s+Topics/);
    expect(src).toMatch(/handleResearchTopics/);
  });

  it("apps/marketing/app/api/video/research-topics/route.ts exports POST", async () => {
    expect(existsSync(resolve(APP_ROOT, "app/api/video/research-topics/route.ts"))).toBe(true);
    const mod = await import("@/api/video/research-topics/route");
    expect(typeof mod.POST).toBe("function");
  }, 10000);

  it("apps/marketing/app/api/video/save-topics/route.ts exports POST", async () => {
    expect(existsSync(resolve(APP_ROOT, "app/api/video/save-topics/route.ts"))).toBe(true);
    const mod = await import("@/api/video/save-topics/route");
    expect(typeof mod.POST).toBe("function");
  }, 10000);
});

// ─────────────────────────────────────────────────────────────────────
// Tier 2: Topic-research prompt builder — RED at HEAD
// ─────────────────────────────────────────────────────────────────────

describe("Phase 5: Topic Research — prompt builder (task 2, RED)", () => {
  it("exports a shared buildTopicResearchPrompt helper", async () => {
    const mod = await import("../lib/topic-research.js");
    expect(typeof mod.buildTopicResearchPrompt).toBe("function");
  });

  it("prompt names the app and target audience", async () => {
    const { buildTopicResearchPrompt } = await import("../lib/topic-research.js");
    const prompt = buildTopicResearchPrompt("reading-advantage", []);
    expect(prompt).toMatch(/reading advantage/i);
    expect(prompt).toMatch(/Thai/);
    expect(prompt).toMatch(/school directors|parents|teachers/);
  });

  it("prompt includes past topics when provided", async () => {
    const { buildTopicResearchPrompt } = await import("../lib/topic-research.js");
    const past = ["การอ่านนิทานภาษาอังกฤษ", "คณิตศาสตร์สนุก"];
    const prompt = buildTopicResearchPrompt("reading-advantage", past);
    expect(prompt).toContain(past[0]);
    expect(prompt).toContain(past[1]);
    expect(prompt).toMatch(/avoid|past|previous|dedup/i);
  });

  it("prompt instructs the model to return exactly 5 topics", async () => {
    const { buildTopicResearchPrompt } = await import("../lib/topic-research.js");
    const prompt = buildTopicResearchPrompt("reading-advantage", []);
    expect(prompt).toMatch(/5/);
    expect(prompt).toMatch(/JSON array/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tier 3: Topic deduplication matcher — RED at HEAD (phase-5-dedup-thai)
// ─────────────────────────────────────────────────────────────────────

describe("Phase 5: Topic Research — dedup matcher (task 2, RED, phase-5-dedup-thai)", () => {
  it("exports normalizeTopic and deduplicateTopics helpers", async () => {
    const mod = await import("../lib/topic-dedup.js");
    expect(typeof mod.normalizeTopic).toBe("function");
    expect(typeof mod.deduplicateTopics).toBe("function");
  });

  it("normalizeTopic trims whitespace and lowercases Latin letters", async () => {
    const { normalizeTopic } = await import("../lib/topic-dedup.js");
    expect(normalizeTopic("  Reading Advantage ")).toBe("reading advantage");
    expect(normalizeTopic("STEM Advantage")).toBe("stem advantage");
  });

  it("normalizeTopic normalizes text to NFC", async () => {
    const { normalizeTopic } = await import("../lib/topic-dedup.js");
    // Use a Latin string with a precomposed diacritic because Thai codepoints
    // in the modern Unicode block (U+0E00–U+0E7F) have no canonical NFD
    // decomposition, so a Thai-only string would make the precondition below
    // unreachable. "café" (U+0063 U+0061 U+0066 U+00E9) decomposes in NFD
    // to "cafe\u0301" (5 codepoints) and re-composes to the original — the
    // exact contract `normalizeTopic` must satisfy for any input script.
    const nfc = "café";
    const nfd = nfc.normalize("NFD");
    expect(nfd).not.toBe(nfc);
    expect(normalizeTopic(nfd)).toBe(nfc);
  });

  it("deduplicateTopics removes proposed topics already in past topics", async () => {
    const { deduplicateTopics } = await import("../lib/topic-dedup.js");
    const proposed = ["A", "B", "C"];
    const existing = ["b"];
    expect(deduplicateTopics(proposed, existing)).toEqual(["A", "C"]);
  });

  it("deduplicateTopics treats Thai/Latin whitespace variants as duplicates", async () => {
    const { deduplicateTopics } = await import("../lib/topic-dedup.js");
    const proposed = ["Reading Advantage สำหรับเด็ก", "Reading Advantageสำหรับเด็ก"];
    const existing = ["reading advantage สำหรับเด็ก"];
    const result = deduplicateTopics(proposed, existing);
    expect(result).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tier 4: Topic API integration — RED at HEAD
// ─────────────────────────────────────────────────────────────────────

describe("Phase 5: Topic Research — API integration (task 6: verify, RED)", () => {
  it("POST /api/video/research-topics returns exactly 5 distinct topics", async () => {
    const { db } = await import("@reading-advantage/db");
    const { __fakeAIClient } = (await import("@reading-advantage/ai")) as unknown as {
      __fakeAIClient: { generateText: Mock };
    };

    const { selectMock, whereMock } = makeSelectChainMock();
    whereMock
      .mockResolvedValueOnce(mockSettingsRows)
      .mockResolvedValueOnce([]);
    (db.select as Mock).mockImplementation(selectMock);

    // Simulate an LLM that returns 6 topics — the route must cap/enforce 5.
    __fakeAIClient.generateText.mockResolvedValueOnce(
      JSON.stringify(["T1", "T2", "T3", "T4", "T5", "T6"]),
    );

    const { POST } = await import("@/api/video/research-topics/route");
    const response = await POST(
      new Request("http://localhost/api/video/research-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { topics: string[] };
    expect(body.topics).toHaveLength(5);
    expect(new Set(body.topics).size).toBe(5);
  });

  it("POST /api/video/research-topics excludes topics already in past_topics", async () => {
    const { db } = await import("@reading-advantage/db");
    const { __fakeAIClient } = (await import("@reading-advantage/ai")) as unknown as {
      __fakeAIClient: { generateText: Mock };
    };

    const { selectMock, whereMock } = makeSelectChainMock();
    whereMock
      .mockResolvedValueOnce(mockSettingsRows)
      .mockResolvedValueOnce([{ topic: "Old Topic" }]);
    (db.select as Mock).mockImplementation(selectMock);

    __fakeAIClient.generateText.mockResolvedValueOnce(
      JSON.stringify(["Old Topic", "New Topic 1", "New Topic 2"]),
    );

    const { POST } = await import("@/api/video/research-topics/route");
    const response = await POST(
      new Request("http://localhost/api/video/research-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: "reading-advantage" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { topics: string[] };
    expect(body.topics).not.toContain("Old Topic");
    expect(body.topics).toContain("New Topic 1");
    expect(body.topics).toContain("New Topic 2");
  });

  it("POST /api/video/save-topics skips duplicates before inserting", async () => {
    const { db } = await import("@reading-advantage/db");
    const { selectMock, whereMock } = makeSelectChainMock();
    whereMock.mockResolvedValueOnce([]);
    (db.select as Mock).mockImplementation(selectMock);

    const { insertMock, valuesMock } = makeInsertChainMock();
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/video/save-topics/route");
    const response = await POST(
      new Request("http://localhost/api/video/save-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          app: "reading-advantage",
          topics: ["Unique Topic", "Duplicate Topic", "Duplicate Topic"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    const insertedTopics = valuesMock.mock.calls.map(
      (call) => (call[0] as { topic: string }).topic,
    );
    expect(insertedTopics).toContain("Unique Topic");
    expect(insertedTopics.filter((t) => t === "Duplicate Topic")).toHaveLength(1);
  });

  it("POST /api/video/save-topics normalizes Thai/Latin duplicates", async () => {
    const { db } = await import("@reading-advantage/db");
    const { selectMock, whereMock } = makeSelectChainMock();
    whereMock.mockResolvedValueOnce([]);
    (db.select as Mock).mockImplementation(selectMock);

    const { insertMock, valuesMock } = makeInsertChainMock();
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/video/save-topics/route");
    const response = await POST(
      new Request("http://localhost/api/video/save-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          app: "reading-advantage",
          topics: ["Reading Advantage สำหรับเด็ก", "reading advantage สำหรับเด็ก"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    const insertedTopics = valuesMock.mock.calls.map(
      (call) => (call[0] as { topic: string }).topic,
    );
    expect(insertedTopics).toHaveLength(1);
  });

  it("POST /api/video/save-topics skips topics already in past_topics for the same app", async () => {
    const { db } = await import("@reading-advantage/db");
    const { selectMock, whereMock } = makeSelectChainMock();
    whereMock.mockResolvedValueOnce([{ topic: "Existing Topic" }]);
    (db.select as Mock).mockImplementation(selectMock);

    const { insertMock, valuesMock } = makeInsertChainMock();
    (db.insert as Mock).mockImplementation(insertMock);

    const { POST } = await import("@/api/video/save-topics/route");
    const response = await POST(
      new Request("http://localhost/api/video/save-topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          app: "reading-advantage",
          topics: ["Existing Topic", "Brand New Topic"],
        }),
      }),
    );

    expect(response.status).toBe(200);
    const insertedTopics = valuesMock.mock.calls.map(
      (call) => (call[0] as { topic: string }).topic,
    );
    expect(insertedTopics).not.toContain("Existing Topic");
    expect(insertedTopics).toContain("Brand New Topic");
    expect(insertedTopics).toHaveLength(1);
  });
});
