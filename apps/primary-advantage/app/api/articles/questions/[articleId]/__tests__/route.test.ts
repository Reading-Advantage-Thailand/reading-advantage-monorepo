// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  handleUpdateUserActivity: vi.fn(),
  getQuestionsByArticleId: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@/server/controllers/userController", () => ({ handleUpdateUserActivity: mocks.handleUpdateUserActivity }));
vi.mock("@/server/models/articleModel", () => ({ getQuestionsByArticleId: mocks.getQuestionsByArticleId }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { GET, POST } from "../route";

const ctx = { params: Promise.resolve({ articleId: "a1" }) };
const getReq = (qs: string) => {
  const url = new URL(`http://x/api/articles/questions/a1?${qs}`);
  return Object.assign(new Request(url), { nextUrl: url }) as unknown as NextRequest;
};
const postReq = (body: unknown) =>
  new Request("http://x/api/articles/questions/a1", { method: "POST", body: JSON.stringify(body) }) as unknown as NextRequest;
const good = { activityType: "MC_QUESTION", data: { progress: [0, 0, 1], timer: 12 } };

describe("GET /api/articles/questions/[articleId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const res = await GET(getReq("articleId=a1&questionType=SA_QUESTION"));
    expect(res.status).toBe(401);
    expect(mocks.getQuestionsByArticleId).not.toHaveBeenCalled();
  });

  it("returns 400 for missing parameters", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "STUDENT" });
    expect((await GET(getReq("articleId=a1"))).status).toBe(400);
  });

  it("returns 400 for an unknown question type", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "STUDENT" });
    expect((await GET(getReq("articleId=a1&questionType=NOPE"))).status).toBe(400);
  });

  it("serves a signed-in student", async () => {
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "STUDENT" });
    mocks.getQuestionsByArticleId.mockResolvedValue({ questions: [] });
    expect((await GET(getReq("articleId=a1&questionType=SA_QUESTION"))).status).toBe(200);
  });
});

describe("POST /api/articles/questions/[articleId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({ id: "u1", role: "STUDENT" });
    mocks.handleUpdateUserActivity.mockResolvedValue({ ok: true });
  });

  it("accepts the client body", async () => {
    expect((await POST(postReq(good), ctx)).status).toBe(200);
    expect(mocks.handleUpdateUserActivity).toHaveBeenCalledWith(good, "a1");
  });

  it.each([
    ["no data", { activityType: "MC_QUESTION" }],
    ["bad activityType", { ...good, activityType: "HACK" }],
    ["progress not numbers", { activityType: "MC_QUESTION", data: { progress: ["x"], timer: 1 } }],
    ["missing timer", { activityType: "MC_QUESTION", data: { progress: [0] } }],
    ["huge progress", { activityType: "MC_QUESTION", data: { progress: Array(500).fill(0), timer: 1 } }],
  ])("returns 400 for %s", async (_n, body) => {
    expect((await POST(postReq(body), ctx)).status).toBe(400);
    expect(mocks.handleUpdateUserActivity).not.toHaveBeenCalled();
  });

  it("keeps the staff preview guard first", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "s1" });
    expect((await POST(postReq({}), ctx)).status).toBe(403);
    expect(mocks.handleUpdateUserActivity).not.toHaveBeenCalled();
  });
});
