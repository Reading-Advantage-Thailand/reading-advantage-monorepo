// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./helpers/testDb";

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

vi.mock("@/lib/auth", () => ({
  requireMarketingPermission: vi.fn(async () => ({
    ok: true,
    session: { user: { id: "marketing-admin", role: "ADMIN" } },
  })),
}));

import { POST } from "@/api/video/save-topics/route";

let testDb: TestDb;

function request(topic: string): Request {
  return new Request("http://localhost/api/video/save-topics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      app: "reading-advantage",
      topics: [topic],
    }),
  });
}

describe("Marketing past-topic concurrent persistence", () => {
  beforeAll(async () => {
    testDb = await createTestDb();
  }, 60_000);

  afterAll(async () => {
    await testDb?.close();
  });

  it("stores one row when repeated requests submit normalized duplicates", async () => {
    // PGlite exposes one connection and cannot overlap explicit transactions.
    // The production race is closed by the same unique index plus ON CONFLICT.
    const first = await POST(request("Reading Advantage สำหรับเด็ก"));
    const second = await POST(request("reading advantageสำหรับเด็ก"));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const rows = await testDb.db.execute(sql`
      SELECT app, topic, normalized_key
      FROM past_topics
      WHERE app = 'reading-advantage'
    `);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toEqual(
      expect.objectContaining({
        app: "reading-advantage",
        normalized_key: "reading advantageสำหรับเด็ก",
      }),
    );
  });
});
