// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  getLessonGameResults: vi.fn(),
  selects: [] as unknown[][],
  logError: vi.fn(),
}));

/** A thenable query chain that resolves to the next queued select result. */
function chain(): unknown {
  const rows = mocks.selects.shift() ?? [];
  const q: Record<string, unknown> = {};
  for (const name of ["from", "where", "orderBy"]) q[name] = () => q;
  q.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(rows).then(ok, bad);
  return q;
}

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@/server/models/articleModel", () => ({ getArticleActivity: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: mocks.logError } }));
vi.mock("@reading-advantage/db", () => ({
  db: { select: () => chain() },
  eq: () => ({}),
  and: () => ({}),
  desc: () => ({}),
  inArray: () => ({}),
  userActivity: {},
  xpLogs: {},
}));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: (_db: unknown, tenant: unknown) => ({ tenant }) }));
vi.mock("@reading-advantage/domain/games", () => ({ getLessonGameResults: mocks.getLessonGameResults }));

import { getLessonSummaryData } from "../article";

const ARTICLE = "11111111-1111-4111-8111-111111111111";
const student = { id: "s1", role: "STUDENT", schoolId: "school-1" };

describe("getLessonSummaryData game XP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue(student);
    mocks.selects = [[{ id: "a1", activityType: "MC_QUESTION", details: { score: 4 } }], [{ xpEarned: 5 }, { xpEarned: 3 }]];
  });

  it("adds the XP of the saved game runs of the article to the activity XP", async () => {
    mocks.getLessonGameResults.mockResolvedValue({ latest: [], totalXp: 9 });
    const result = await getLessonSummaryData(ARTICLE);
    expect(result).toMatchObject({ success: true, data: { totalXp: 17, gameXp: 9 } });
    expect(mocks.getLessonGameResults).toHaveBeenCalledWith(
      expect.objectContaining({ user: student, tenant: { schoolId: "school-1" }, input: { articleId: ARTICLE } }),
    );
  });

  it("keeps the activity XP when the game read fails, and logs the failure", async () => {
    mocks.getLessonGameResults.mockRejectedValue(new Error("db down"));
    const result = await getLessonSummaryData(ARTICLE);
    expect(result).toMatchObject({ success: true, data: { totalXp: 8, gameXp: 0 } });
    expect(mocks.logError).toHaveBeenCalledWith("lesson_summary_game_xp_failed", expect.objectContaining({ articleId: ARTICLE }));
  });
});
