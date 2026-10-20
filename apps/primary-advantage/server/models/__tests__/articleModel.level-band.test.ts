// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb, type TestDb } from "./helpers/testDb";

const session = vi.hoisted(() => ({ user: null as { level: number | null; role: string } | null }));
vi.mock("@/lib/session", () => ({ currentUser: async () => session.user }));

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
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

import { fetchArticles } from "../../controllers/articleController";

let harness: TestDb;

/** Lists the ra_level of each returned article, sorted. */
async function levels(query: Record<string, string> = {}) {
  const out = await fetchArticles(new URLSearchParams({ limit: "50", offset: "0", ...query }));
  return out.articles.map((a: { raLevel: number | null }) => a.raLevel).sort((x, y) => (x ?? 0) - (y ?? 0));
}

beforeAll(async () => {
  harness = await createTestDb();
}, 60_000);
afterAll(async () => {
  await harness.close();
});

describe("Read list level band", () => {
  beforeEach(async () => {
    await harness.reset();
    for (const level of [1, 2, 3, 4, 5, 6]) {
      await harness.db.execute(sql`INSERT INTO articles (title, content, ra_level, cefr_level, is_draft)
        VALUES (${`L${level}`}, 'x', ${level}, 'A0', false)`);
    }
  });

  it("shows an A0- reader (level 1) only the levels 1 and 2", async () => {
    session.user = { level: 1, role: "STUDENT" };
    expect(await levels()).toEqual([1, 2]);
  });

  it("shows a level 4 reader the levels 3 to 5", async () => {
    session.user = { level: 4, role: "STUDENT" };
    expect(await levels()).toEqual([3, 4, 5]);
  });

  it("keeps the band when the query asks for another level", async () => {
    session.user = { level: 1, role: "STUDENT" };
    expect(await levels({ cefrLevel: "A0" })).toEqual([1, 2]);
  });

  it("shows every level to a TEACHER, who picks the story to assign", async () => {
    session.user = { level: 1, role: "TEACHER" };
    expect(await levels()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("shows every level to a reader with no level", async () => {
    session.user = { level: null, role: "STUDENT" };
    expect(await levels()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
