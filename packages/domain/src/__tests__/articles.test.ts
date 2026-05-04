import { describe, expect, it, vi } from "vitest";
import { listArticles } from "../articles/index.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/db/schema", () => ({
  articles: {
    topic: "topic",
    cefrLevel: "cefr_level",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ type: "eq", col, val })),
  and: vi.fn((...conds: unknown[]) => ({ type: "and", conds })),
}));

const tenant = { schoolId: "s1" };

function wrapDb(db: { select: ReturnType<typeof vi.fn> }) {
  return createTenantDB(db as unknown as DB, tenant);
}

function createArticleDb() {
  const rows = [{ id: "article-1" }];
  const offset = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn().mockReturnValue({ offset });
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where, limit });
  const db = {
    select: vi.fn().mockReturnValue({ from }),
  };
  return { db, where };
}

describe("listArticles", () => {
  it("applies topic and CEFR filters", async () => {
    const { db, where } = createArticleDb();

    const result = await listArticles({
      db: wrapDb(db),
      input: { topic: "science", cefrLevel: "A2", limit: 10, offset: 0 },
    });

    expect(result).toEqual([{ id: "article-1" }]);
    expect(where).toHaveBeenCalledWith({
      type: "and",
      conds: [
        { type: "eq", col: "topic", val: "science" },
        { type: "eq", col: "cefr_level", val: "A2" },
      ],
    });
  });
});
