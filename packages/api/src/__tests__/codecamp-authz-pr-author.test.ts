/**
 * Finding 1 of `authz-codecamp-report.md`: `codecamp.createPrReview` must
 * not let a learner claim another learner's pull request.
 *
 * The real router and domain run; only the database and GitHub are fakes.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createFakeDb, learnerContext, stubGitHubPrAuthor, exerciseRepo, REPO_ID, PR_URL } from "./codecamp-authz-fakes.js";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { codecampRouter } from "../routers/codecamp.js";

vi.mock("@reading-advantage/ai", () => ({
  getAIClient: vi.fn(() => ({ generateObject: vi.fn(), generateImage: vi.fn(), generateText: vi.fn() })),
  createAIClient: vi.fn(() => ({ generateObject: vi.fn(), generateImage: vi.fn(), generateText: vi.fn() })),
}));

const t = initTRPC.create({ transformer: superjson });
const appRouter = t.router({ codecamp: codecampRouter });

/**
 * Creates a tRPC caller signed in as a learner.
 * @param tenantDb The fake tenant DB for this test.
 * @returns A caller for the codecamp router.
 */
function learnerCaller(tenantDb: unknown) {
  return t.createCallerFactory(appRouter)(learnerContext(tenantDb));
}

describe("finding 1: codecamp.createPrReview checks the PR author", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a learner who submits another learner's PR and stores no review", async () => {
    stubGitHubPrAuthor("learner-b-gh");
    const { tenantDb, inserts } = createFakeDb({
      codecamp_exercise_repos: [exerciseRepo],
      users: [{ githubUsername: "learner-a-gh" }],
      codecamp_pr_reviews: [],
    });

    await expect(
      learnerCaller(tenantDb).codecamp.createPrReview({ exerciseRepoId: REPO_ID, prUrl: PR_URL }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(inserts.filter((i) => i.table === "codecamp_pr_reviews"), "no review row for another learner's PR").toHaveLength(0);
  });

  it("rejects the PR when the GitHub author lookup fails", async () => {
    stubGitHubPrAuthor(null);
    const { tenantDb, inserts } = createFakeDb({
      codecamp_exercise_repos: [exerciseRepo],
      users: [{ githubUsername: "learner-a-gh" }],
      codecamp_pr_reviews: [],
    });

    await expect(
      learnerCaller(tenantDb).codecamp.createPrReview({ exerciseRepoId: REPO_ID, prUrl: PR_URL }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(inserts, "no review row when the author is unknown").toHaveLength(0);
  });

  it("rejects a learner who has no linked GitHub username", async () => {
    stubGitHubPrAuthor("learner-a-gh");
    const { tenantDb, inserts } = createFakeDb({
      codecamp_exercise_repos: [exerciseRepo],
      users: [{ githubUsername: null }],
      codecamp_pr_reviews: [],
    });

    await expect(
      learnerCaller(tenantDb).codecamp.createPrReview({ exerciseRepoId: REPO_ID, prUrl: PR_URL }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(inserts, "no review row without a linked GitHub username").toHaveLength(0);
  });

  it("creates the review when the caller authored the PR (case-insensitive login)", async () => {
    const fetchSpy = stubGitHubPrAuthor("Learner-A-GH");
    const { tenantDb, inserts } = createFakeDb({
      codecamp_exercise_repos: [exerciseRepo],
      users: [{ githubUsername: "learner-a-gh" }],
      codecamp_pr_reviews: [],
    });

    const result = await learnerCaller(tenantDb).codecamp.createPrReview({ exerciseRepoId: REPO_ID, prUrl: PR_URL });

    expect(result.userId).toBe("learner-a");
    expect(result.prUrl).toBe(PR_URL);
    expect(inserts.filter((i) => i.table === "codecamp_pr_reviews"), "one review row for the author").toHaveLength(1);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe("https://api.github.com/repos/codecamp-org/exercise-1/pulls/7");
  });
});
