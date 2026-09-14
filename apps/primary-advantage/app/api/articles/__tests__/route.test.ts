// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  fetchArticles: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@/server/controllers/articleController", () => ({
  fetchArticles: mocks.fetchArticles,
}));

import { GET } from "../route";

/**
 * Builds an article catalogue request with a Next URL.
 * @returns A GET request carrying nextUrl search params.
 */
function catalogueRequest() {
  const request = new Request(
    "http://localhost/api/articles",
  ) as unknown as NextRequest;
  (request as unknown as Record<string, unknown>).nextUrl = new URL(
    "http://localhost/api/articles",
  );
  return request;
}

describe("GET /api/articles authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/articles") as NextRequest,
    );

    expect(response.status).toBe(401);
    expect(mocks.fetchArticles).not.toHaveBeenCalled();
  });

  it("serves an authenticated student", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s-1", role: "STUDENT" });
    mocks.fetchArticles.mockResolvedValue({ articles: [], totalArticles: 0 });

    const response = await GET(catalogueRequest());

    expect(response.status).toBe(200);
    expect(mocks.fetchArticles).toHaveBeenCalled();
  });
});
