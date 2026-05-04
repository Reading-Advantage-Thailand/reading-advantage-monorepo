import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { articlesRouter } from "../routers/articles.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/domain/articles", () => ({
  listArticles: vi.fn(),
  getArticle: vi.fn(),
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
}));

import {
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
} from "@reading-advantage/domain/articles";

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } | null;
}>().create({
  transformer: superjson,
});

const appRouter = t.router({ articles: articlesRouter });

function createCaller(
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } | null
) {
  const tenantDb = createTenantDB({} as unknown as DB, auth?.tenant ?? { schoolId: null });
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testSchoolId = "550e8400-e29b-41d4-a716-446655440001";
const testDate = new Date("2024-01-01T00:00:00Z");

function makeArticleResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Test Article",
    content: "Content",
    summary: null,
    level: 1,
    cefrLevel: "A1",
    topic: "science",
    image: null,
    published: true,
    createdAt: testDate,
    updatedAt: testDate,
    extraField: "should-be-stripped",
    ...overrides,
  };
}

describe("articles router", () => {
  describe("list", () => {
    it("returns articles with safe fields", async () => {
      const articleRows = [makeArticleResponse()];
      vi.mocked(listArticles).mockResolvedValue(articleRows as unknown as Awaited<ReturnType<typeof listArticles>>);
      const caller = createCaller(null);

      const result = await caller.articles.list({});

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(result[0]).not.toHaveProperty("extraField");
    });
  });

  describe("get", () => {
    it("returns article by id with safe fields", async () => {
      const articleRow = makeArticleResponse();
      vi.mocked(getArticle).mockResolvedValue(articleRow as unknown as Awaited<ReturnType<typeof getArticle>>);
      const caller = createCaller(null);

      const result = await caller.articles.get({ id: "550e8400-e29b-41d4-a716-446655440001" });

      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(result).not.toHaveProperty("extraField");
    });
  });

  describe("create", () => {
    it("returns created article with safe fields", async () => {
      const articleRow = makeArticleResponse({ id: "550e8400-e29b-41d4-a716-446655440002" });
      vi.mocked(createArticle).mockResolvedValue(articleRow as unknown as Awaited<ReturnType<typeof createArticle>>);
      const caller = createCaller({ user: { id: "a1", role: "ADMIN" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.articles.create({ title: "New Article", content: "Content" });

      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440002");
      expect(result).not.toHaveProperty("extraField");
    });
  });

  describe("update", () => {
    it("returns updated article with safe fields", async () => {
      const articleRow = makeArticleResponse({ title: "Updated Article" });
      vi.mocked(updateArticle).mockResolvedValue(articleRow as unknown as Awaited<ReturnType<typeof updateArticle>>);
      const caller = createCaller({ user: { id: "a1", role: "ADMIN" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.articles.update({ id: "550e8400-e29b-41d4-a716-446655440001", title: "Updated Article" });

      expect(result.title).toBe("Updated Article");
      expect(result).not.toHaveProperty("extraField");
    });
  });
});
