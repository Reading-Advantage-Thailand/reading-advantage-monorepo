import { captureRegisteredTutorialRepository } from "@/lib/tutorial-repository-capture";
import { cloneTutorialRepository, readTutorialFixtureFile, tutorialFixtureGitStatus } from "@/lib/node-tutorial-repository-capture";
import { db, users } from "@reading-advantage/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

/** Handles service-authenticated capture of a registered learner fork. */
export async function POST(request: Request) {
  const token = process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN;
  if (!token || request.headers.get("authorization") !== `Bearer ${token}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await captureRegisteredTutorialRepository(await request.json(), {
      async getGithubUsername(learnerId) {
        const [learner] = await db.select({ githubUsername: users.githubUsername }).from(users).where(eq(users.id, learnerId)).limit(1);
        return learner?.githubUsername ?? null;
      },
      clone: cloneTutorialRepository,
      readFixtureFile: readTutorialFixtureFile,
      gitStatus: tutorialFixtureGitStatus,
      now: () => new Date().toISOString(),
      repositoryBaseUrl: process.env.TUTORIAL_REPOSITORY_BASE_URL,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Capture failed" }, { status: 400 });
  }
}
