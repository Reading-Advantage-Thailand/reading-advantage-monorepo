// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  generateAllArticle: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@/server/controllers/articleController", () => ({
  generateAllArticle: mocks.generateAllArticle,
}));

import { POST } from "../route";

/**
 * Builds a generation request with a JSON body.
 * @param body The request payload.
 * @returns A POST request.
 */
function postRequest(body: unknown) {
  return new Request("http://localhost/api/articles/generate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}

describe("POST /api/articles/generate authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);

    const response = await POST(postRequest({ amountPerGenre: 2 }));

    expect(response.status).toBe(401);
    expect(mocks.generateAllArticle).not.toHaveBeenCalled();
  });

  it("returns 403 for a student caller", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s-1", role: "STUDENT" });

    const response = await POST(postRequest({ amountPerGenre: 2 }));

    expect(response.status).toBe(403);
    expect(mocks.generateAllArticle).not.toHaveBeenCalled();
  });

  it("rejects an unbounded amountPerGenre before generation", async () => {
    mocks.currentUser.mockResolvedValue({ id: "a-1", role: "ADMIN" });

    const response = await POST(postRequest({ amountPerGenre: 1000 }));

    expect(response.status).toBe(400);
    expect(mocks.generateAllArticle).not.toHaveBeenCalled();
  });

  it("starts generation for a bounded admin request", async () => {
    mocks.currentUser.mockResolvedValue({ id: "a-1", role: "ADMIN" });
    mocks.generateAllArticle.mockResolvedValue([]);

    const response = await POST(postRequest({ amountPerGenre: 2 }));

    expect(response.status).toBe(200);
    expect(mocks.generateAllArticle).toHaveBeenCalledWith(2);
  });
});
