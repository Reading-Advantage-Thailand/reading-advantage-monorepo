import { codecampAPKUnit } from "@reading-advantage/codecamp-knowledge/apk-unit";
import { z } from "zod";

const requestSchema = z.object({
  tenantKey: z.literal("codecamp"), learnerId: z.string().min(1), sessionId: z.string().uuid(),
  repositoryId: z.literal("repo.apk.guided"), allowedFiles: z.array(z.string()).min(1),
}).strict();

/** Trusted ports used by the isolated repository-capture boundary. */
export interface TutorialCapturePorts {
  /** Resolves the server-registered GitHub identity for one learner. */
  getGithubUsername(learnerId: string): Promise<string | null>;
  /** Clones one server-derived repository URL and returns its checkout root. */
  clone(repositoryUrl: string): Promise<{ checkoutRoot: string; cleanup(): Promise<void> }>;
  /** Reads one allowlisted file below the cloned guided fixture root. */
  readFixtureFile(checkoutRoot: string, filePath: string): Promise<string>;
  /** Returns normalized Git status for the cloned guided fixture. */
  gitStatus(checkoutRoot: string): Promise<string>;
  /** Returns the capture timestamp. */
  now(): string;
}

/** Captures a learner fork without accepting a client-controlled URL or path. */
export async function captureRegisteredTutorialRepository(input: unknown, ports: TutorialCapturePorts) {
  const request = requestSchema.parse(input);
  const expectedFiles = [...codecampAPKUnit.wedo.manifest.allowedFiles].sort();
  if (JSON.stringify([...request.allowedFiles].sort()) !== JSON.stringify(expectedFiles)) throw new Error("Tutorial capture allowlist mismatch");
  const githubUsername = await ports.getGithubUsername(request.learnerId);
  if (!githubUsername || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(githubUsername)) throw new Error("Learner GitHub identity is not registered");
  const clone = await ports.clone(`https://github.com/${githubUsername}/reading-advantage-monorepo.git`);
  try {
    const files = Object.fromEntries(await Promise.all(expectedFiles.map(async (filePath) => [filePath, await ports.readFixtureFile(clone.checkoutRoot, filePath)] as const)));
    return { files, gitStatus: await ports.gitStatus(clone.checkoutRoot), capturedAt: new Date(ports.now()).toISOString() };
  } finally {
    await clone.cleanup();
  }
}
