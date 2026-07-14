import { createTutorialCaptureLimiter, TutorialCaptureLimitError } from "@/lib/tutorial-capture-limiter";

export const runtime = "nodejs";
const captureLimiter = createTutorialCaptureLimiter({ maxConcurrent: 2, maxPerLearner: 20, windowMs: 60_000 });

/** Handles service-authenticated capture of a registered learner fork. */
export async function POST(request: Request) {
  const token = process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [{ captureRegisteredTutorialRepository }, { cloneTutorialRepository, readTutorialFixtureFile, tutorialFixtureGitStatus }, { acquireTutorialCaptureLease }, { db, users }, { eq }] = await Promise.all([
      import("@/lib/tutorial-repository-capture"),
      import("@/lib/node-tutorial-repository-capture"),
      import("@/lib/tutorial-capture-lease"),
      import("@reading-advantage/db"),
      import("drizzle-orm"),
    ]);
    const body = await request.json();
    const learnerId = typeof body === "object" && body !== null && "learnerId" in body && typeof body.learnerId === "string" ? body.learnerId : "invalid";
    const lease = await acquireTutorialCaptureLease(db, learnerId);
    if (!lease) return Response.json({ error: "Tutorial capture worker is busy or rate limited" }, { status: 429 });
    try {
      const result = await captureLimiter.run(learnerId, () => captureRegisteredTutorialRepository(body, {
        async getGithubUsername(learnerId) {
          const [learner] = await db.select({ githubUsername: users.githubUsername }).from(users).where(eq(users.id, learnerId)).limit(1);
          return learner?.githubUsername ?? null;
        },
        clone: cloneTutorialRepository,
        readFixtureFile: readTutorialFixtureFile,
        gitStatus: tutorialFixtureGitStatus,
        now: () => new Date().toISOString(),
        repositoryBaseUrl: process.env.TUTORIAL_REPOSITORY_BASE_URL,
      }));
      return Response.json(result);
    } finally {
      await lease.release();
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Capture failed" }, { status: error instanceof TutorialCaptureLimitError ? 429 : 400 });
  }
}
