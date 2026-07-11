import { captureRegisteredTutorialRepository } from "@/lib/tutorial-repository-capture";
import { db, users } from "@reading-advantage/db";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";
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
      async clone(repositoryUrl) {
        const temporaryRoot = await mkdtemp(join(tmpdir(), "codecamp-tutorial-"));
        const checkoutRoot = join(temporaryRoot, "checkout");
        await promisify(execFile)("git", ["clone", "--depth", "1", "--filter=blob:none", repositoryUrl, checkoutRoot], { timeout: 25_000, maxBuffer: 256 * 1024, windowsHide: true, env: { PATH: process.env.PATH ?? "", NODE_ENV: process.env.NODE_ENV ?? "production" } });
        return { checkoutRoot, cleanup: () => rm(temporaryRoot, { recursive: true, force: true }) };
      },
      async readFixtureFile(checkoutRoot, filePath) {
        const fixtureRoot = await realpath(resolve(checkoutRoot, "packages/codecamp-knowledge/fixtures/apk-guided"));
        const target = await realpath(resolve(fixtureRoot, filePath));
        if (!target.startsWith(`${fixtureRoot}${sep}`)) throw new Error("Tutorial file escaped fixture root");
        return readFile(target, "utf8");
      },
      async gitStatus(checkoutRoot) {
        const fixtureRoot = resolve(checkoutRoot, "packages/codecamp-knowledge/fixtures/apk-guided");
        const { stdout } = await promisify(execFile)("git", ["-c", "core.hooksPath=/dev/null", "status", "--porcelain=v1", "--untracked-files=all", "--", "."], { cwd: fixtureRoot, timeout: 10_000, maxBuffer: 256 * 1024, windowsHide: true, env: { PATH: process.env.PATH ?? "", NODE_ENV: process.env.NODE_ENV ?? "production" } });
        return stdout;
      },
      now: () => new Date().toISOString(),
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Capture failed" }, { status: 400 });
  }
}
