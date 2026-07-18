// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./helpers/testDb";
import { authedRequest } from "./helpers/auth-mock";

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@reading-advantage/db")>();
  const dbProxy = new Proxy(
    {},
    {
      get(_target, property) {
        const real = (globalThis as Record<string, unknown>).__TEST_DB__ as
          | Record<string | symbol, unknown>
          | undefined;
        if (!real) throw new Error("Test DB not initialized");
        const value = real[property];
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(real)
          : value;
      },
    },
  );
  return { ...actual, db: dbProxy };
});

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), init),
  },
}));

import { GET, PATCH } from "@/api/video/projects/route";

const campaignId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const originalScript = Array.from({ length: 5 }, (_, index) => ({
  narration: `ต้นฉบับ ${index + 1}`,
  imagePrompt: `Original image ${index + 1}`,
  motionDirection: `Original motion ${index + 1}`,
}));
const editedScript = originalScript.map((scene, index) =>
  index === 0 ? { ...scene, narration: "ฉบับแก้ไข" } : scene,
);

let testDb: TestDb;

describe("Marketing project update PGlite round trip", () => {
  beforeAll(async () => {
    testDb = await createTestDb();
    await testDb.db.execute(sql`
      INSERT INTO campaigns (id, type, app, name, status)
      VALUES (${campaignId}, 'video', 'reading-advantage', 'Reload Campaign', 'draft')
    `);
    await testDb.db.execute(sql`
      INSERT INTO video_projects (id, campaign_id, topic, script)
      VALUES (${projectId}, ${campaignId}, 'หัวข้อเดิม', ${JSON.stringify(originalScript)}::jsonb)
    `);
  }, 60_000);

  afterAll(async () => {
    await testDb?.close();
  });

  it("PATCH persists an edited script and GET reloads the same JSONB", async () => {
    const patchResponse = await PATCH(
      authedRequest("http://localhost/api/video/projects", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          campaignId,
          topic: "หัวข้อที่แก้ไข",
          script: editedScript,
        }),
      }),
    );

    expect(patchResponse.status).toBe(200);
    const updated = (await patchResponse.json()) as {
      id: string;
      topic: string;
      script: typeof editedScript;
    };
    expect(updated.id).toBe(projectId);
    expect(updated.topic).toBe("หัวข้อที่แก้ไข");
    expect(updated.script).toEqual(editedScript);

    const getResponse = await GET(
      authedRequest(
        `http://localhost/api/video/projects?campaignId=${campaignId}`,
      ),
    );
    expect(getResponse.status).toBe(200);
    const projects = (await getResponse.json()) as Array<{
      id: string;
      topic: string;
      script: typeof editedScript;
    }>;
    expect(projects).toEqual([
      expect.objectContaining({
        id: projectId,
        topic: "หัวข้อที่แก้ไข",
        script: editedScript,
      }),
    ]);

    const rows = await testDb.db.execute(
      sql`SELECT topic, script FROM video_projects WHERE id = ${projectId}`,
    );
    expect(rows.rows).toEqual([
      expect.objectContaining({
        topic: "หัวข้อที่แก้ไข",
        script: editedScript,
      }),
    ]);
  });
});
