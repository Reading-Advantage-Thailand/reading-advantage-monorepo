import { describe, expect, it, vi } from "vitest";
import {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
} from "../articles/index.js";
import { createMockDb } from "./mock-db.js";
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

const teacher = {
  id: "t1",
  username: "teacher1",
  name: "Teacher",
  role: "TEACHER" as const,
  schoolId: "s1",
};
const admin = {
  id: "a1",
  username: "admin1",
  name: "Admin",
  role: "ADMIN" as const,
  schoolId: "s1",
};
const tenant = { schoolId: "s1" };

function wrapDb(db: { select: ReturnType<typeof vi.fn> }) {
  return createTenantDB(db as unknown as DB, tenant);
}

function createArticleDb() {
  const rows = [{ id: "article-1" }];
  const where = vi.fn().mockReturnValue(
    Object.assign(Promise.resolve(rows), {
      limit: vi.fn().mockImplementation(() =>
        Object.assign(Promise.resolve(rows), {
          offset: vi.fn().mockResolvedValue(rows),
        })
      ),
    })
  );
  const from = vi.fn().mockReturnValue({
    where,
    limit: vi.fn().mockImplementation(() =>
      Object.assign(Promise.resolve(rows), {
        offset: vi.fn().mockResolvedValue(rows),
      })
    ),
  });
  const db = {
    select: vi.fn().mockReturnValue({ from }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "article-new", title: "New Article" }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(
          Object.assign(Promise.resolve([{ id: "article-1", title: "Updated Article" }]), {
            returning: vi.fn().mockResolvedValue([{ id: "article-1", title: "Updated Article" }]),
          })
        ),
      }),
    }),
  };
  return { db, where };
}

describe("listArticles", () => {
  it("applies topic and CEFR filters", async () => {
    const { db, where } = createArticleDb();

    const result = await listArticles({
      db: wrapDb(db),
      user: teacher,
      tenant,
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

describe("getArticle", () => {
  it("returns article by id", async () => {
    const articleRow = { id: "article-1", title: "Test Article" };
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([articleRow]),
          }),
        }),
      }),
    };

    const result = await getArticle({
      db: wrapDb(db),
      user: teacher,
      tenant,
      input: { id: "article-1" },
    });

    expect(result).toEqual(articleRow);
  });

  it("throws when article not found", async () => {
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    await expect(
      getArticle({
        db: wrapDb(db),
        user: teacher,
        tenant,
        input: { id: "missing" },
      })
    ).rejects.toThrow(/Article not found/);
  });
});

describe("createArticle", () => {
  it("creates article when admin", async () => {
    const { db } = createArticleDb();

    const result = await createArticle({
      db: wrapDb(db),
      user: admin,
      tenant,
      input: { title: "New Article", content: "Content" },
    });

    expect(result.id).toBe("article-new");
    expect(result.title).toBe("New Article");
  });

  it("rejects teacher without article:create permission", async () => {
    const { db } = createArticleDb();

    await expect(
      createArticle({
        db: wrapDb(db),
        user: teacher,
        tenant,
        input: { title: "New Article", content: "Content" },
      })
    ).rejects.toThrow(/article:create/);
  });
});

describe("updateArticle", () => {
  it("updates article when admin", async () => {
    const { db } = createArticleDb();

    const result = await updateArticle({
      db: wrapDb(db),
      user: admin,
      tenant,
      input: { id: "article-1", title: "Updated Article" },
    });

    expect(result.title).toBe("Updated Article");
  });

  it("rejects teacher without article:update permission", async () => {
    const { db } = createArticleDb();

    await expect(
      updateArticle({
        db: wrapDb(db),
        user: teacher,
        tenant,
        input: { id: "article-1", title: "Updated Article" },
      })
    ).rejects.toThrow(/article:update/);
  });
});
