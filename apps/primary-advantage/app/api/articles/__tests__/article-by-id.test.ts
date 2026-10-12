// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ fetchArticleById: vi.fn() }));

vi.mock("@/server/controllers/articleController", () => ({ fetchArticleById: mocks.fetchArticleById }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock("@/server/models/articleModel", () => ({
  ArticleNotFoundError: class ArticleNotFoundError extends Error {},
}));

import { GET } from "../[articleId]/route";
import { ArticleNotFoundError } from "@/server/models/articleModel";

const UUID = "3f8c1c3e-5b8e-4b53-9d0a-0c8f7a9f1a11";

/**
 * Calls the route with a path id and an optional query string.
 * @param id The path id.
 * @param query The query string, with its leading question mark.
 * @returns The route response.
 */
function call(id: string, query = "") {
  const url = new URL(`http://localhost/api/articles/${id}${query}`);
  const req = Object.assign(new Request(url), { nextUrl: url }) as unknown as NextRequest;
  return GET(req, { params: Promise.resolve({ articleId: id }) });
}

describe("GET /api/articles/[articleId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gives 404 JSON for a malformed id and does not load an article", async () => {
    const res = await call("generate");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Article not found" });
    expect(mocks.fetchArticleById).not.toHaveBeenCalled();
  });

  it("gives 404 JSON for an unknown article", async () => {
    mocks.fetchArticleById.mockRejectedValue(new ArticleNotFoundError());
    expect((await call(UUID)).status).toBe(404);
  });

  it("gives 500 JSON for an unexpected error", async () => {
    mocks.fetchArticleById.mockRejectedValue(new Error("db down"));
    const res = await call(UUID);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });

  it("returns the article for a valid id", async () => {
    mocks.fetchArticleById.mockResolvedValue({ article: { id: UUID } });
    const res = await call(UUID);
    expect(res.status).toBe(200);
    expect(mocks.fetchArticleById.mock.calls[0][0].get("articleId")).toBe(UUID);
  });
});
