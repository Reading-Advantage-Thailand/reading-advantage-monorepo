// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  leaderboard: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/server/controllers/schoolController", () => ({
  getSchoolLeaderboardController: mocks.leaderboard,
  updateSchoolRankingController: mocks.update,
}));

import { GET, POST } from "../route";

const req = (url: string, headers: Record<string, string> = {}) =>
  new Request(url, { headers }) as unknown as NextRequest;

describe("GET /api/schools/ranking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.leaderboard.mockResolvedValue({ success: true, data: [] });
  });

  it("returns 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await GET(req("http://x/api/schools/ranking"))).status).toBe(401);
  });

  it("ignores the query schoolId for a non-SYSTEM caller", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "STUDENT", schoolId: "school-a" });
    const res = await GET(req("http://x/api/schools/ranking?schoolId=school-b"));
    expect(res.status).toBe(200);
    expect(mocks.leaderboard).toHaveBeenCalledWith("school-a", "u1");
  });

  it("ignores the query schoolId for an ADMIN", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "ADMIN", schoolId: "school-a" });
    await GET(req("http://x/api/schools/ranking?schoolId=school-b"));
    expect(mocks.leaderboard).toHaveBeenCalledWith("school-a", "u1");
  });

  it("lets SYSTEM name a school", async () => {
    mocks.currentUser.mockResolvedValue({ id: "s1", role: "SYSTEM", schoolId: null });
    await GET(req("http://x/api/schools/ranking?schoolId=school-b"));
    expect(mocks.leaderboard).toHaveBeenCalledWith("school-b", "s1");
  });

  it("returns 404 for a caller with no school", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "STUDENT", schoolId: null });
    expect((await GET(req("http://x/api/schools/ranking?schoolId=school-b"))).status).toBe(404);
    expect(mocks.leaderboard).not.toHaveBeenCalled();
  });
});

describe("POST /api/schools/ranking", () => {
  const old = process.env.ACCESS_KEY;
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({ success: true, message: "ok" });
  });
  afterEach(() => {
    if (old === undefined) delete process.env.ACCESS_KEY;
    else process.env.ACCESS_KEY = old;
  });

  it("fails closed when ACCESS_KEY is unset", async () => {
    delete process.env.ACCESS_KEY;
    const res = await POST(req("http://x/api/schools/ranking", { "x-access-key": "undefined" }));
    expect([401, 500]).toContain(res.status);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects a wrong key, also one of other length", async () => {
    process.env.ACCESS_KEY = "secret-key";
    expect((await POST(req("http://x/a", { "x-access-key": "secret-kez" }))).status).toBe(401);
    expect((await POST(req("http://x/a", { "x-access-key": "short" }))).status).toBe(401);
    expect((await POST(req("http://x/a"))).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("accepts the right key", async () => {
    process.env.ACCESS_KEY = "secret-key";
    expect((await POST(req("http://x/a", { "x-access-key": "secret-key" }))).status).toBe(200);
  });
});
