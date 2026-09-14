// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  unlink: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("fs/promises", () => ({ unlink: mocks.unlink, readdir: vi.fn() }));
vi.mock("fs", () => ({ existsSync: mocks.existsSync }));

import { DELETE, POST } from "../route";

/**
 * Builds a cleanup request for a file name.
 * @param fileName The file name query value.
 * @returns A DELETE request.
 */
function deleteRequest(fileName: string) {
  return new Request(
    `http://localhost/api/upload/csv/cleanup?fileName=${encodeURIComponent(fileName)}`,
    { method: "DELETE" },
  ) as NextRequest;
}

describe("csv cleanup authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);

    const response = await DELETE(deleteRequest("1_upload.csv"));

    expect(response.status).toBe(401);
    expect(mocks.unlink).not.toHaveBeenCalled();
  });

  it("returns 403 for a student caller", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s-1", role: "STUDENT" });

    const response = await DELETE(deleteRequest("1_upload.csv"));

    expect(response.status).toBe(403);
    expect(mocks.unlink).not.toHaveBeenCalled();
  });

  it("rejects traversal file names before unlink", async () => {
    mocks.currentUser.mockResolvedValue({ id: "a-1", role: "ADMIN" });
    mocks.existsSync.mockReturnValue(true);

    const response = await DELETE(deleteRequest("../../secret"));

    expect(response.status).toBe(400);
    expect(mocks.unlink).not.toHaveBeenCalled();
  });

  it("returns 401 for bulk cleanup without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
  });
});
