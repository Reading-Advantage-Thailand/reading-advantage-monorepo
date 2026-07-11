import { describe, expect, it, vi } from "vitest";
import { captureRegisteredTutorialRepository, type TutorialCapturePorts } from "../tutorial-repository-capture";
import { cloneTutorialRepository, readTutorialFixtureFile, tutorialFixtureGitStatus, type TutorialGitRunner } from "../node-tutorial-repository-capture";
import { createTutorialCaptureLimiter } from "../tutorial-capture-limiter";
import { access, mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const input = { tenantKey: "codecamp", learnerId: "learner-1", sessionId: "00000000-0000-4000-8000-000000000001", repositoryId: "repo.apk.guided", allowedFiles: ["src/cartridge.ts", "src/game-state.ts"] };

function ports(overrides: Partial<TutorialCapturePorts> = {}): TutorialCapturePorts {
  return {
    getGithubUsername: vi.fn().mockResolvedValue("learner-one"),
    clone: vi.fn().mockResolvedValue({ checkoutRoot: "/checkout", cleanup: vi.fn() }),
    readFixtureFile: vi.fn().mockImplementation(async (_root, path) => `content:${path}`),
    gitStatus: vi.fn().mockResolvedValue(""), now: () => "2026-07-11T00:00:00Z", ...overrides,
  };
}

describe("tutorial repository capture worker", () => {
  it("derives the fork URL and captures only the authored allowlist", async () => {
    const adapter = ports();
    await expect(captureRegisteredTutorialRepository(input, adapter)).resolves.toEqual({ files: { "src/cartridge.ts": "content:src/cartridge.ts", "src/game-state.ts": "content:src/game-state.ts" }, gitStatus: "", capturedAt: "2026-07-11T00:00:00.000Z" });
    expect(adapter.clone).toHaveBeenCalledWith("https://github.com/learner-one/reading-advantage-monorepo.git");
  });

  it("rejects client path expansion and unregistered identities", async () => {
    await expect(captureRegisteredTutorialRepository({ ...input, allowedFiles: [...input.allowedFiles, ".env"] }, ports())).rejects.toThrow("allowlist mismatch");
    await expect(captureRegisteredTutorialRepository(input, ports({ getGithubUsername: vi.fn().mockResolvedValue("bad/name") }))).rejects.toThrow("not registered");
  });

  it("uses fixed Git commands, removes failed clones, and rejects symlink escapes", async () => {
    let failedCheckout = "";
    const failedRunner: TutorialGitRunner = vi.fn(async (_file, args) => { failedCheckout = args.at(-1)!; throw new Error("clone failed"); });
    await expect(cloneTutorialRepository("file:///missing.git", failedRunner)).rejects.toThrow("clone failed");
    await expect(access(dirname(failedCheckout))).rejects.toThrow();
    expect(failedRunner).toHaveBeenCalledWith("prlimit", ["--fsize=8388608", "--as=268435456", "--cpu=20", "--", "git", "clone", "--depth", "1", "--filter=blob:none", "--sparse", "file:///missing.git", expect.any(String)], expect.objectContaining({ timeout: 25_000 }));

    const statusRunner: TutorialGitRunner = vi.fn(async () => ({ stdout: "" }));
    await expect(tutorialFixtureGitStatus("/checkout", statusRunner)).resolves.toBe("");
    expect(statusRunner).toHaveBeenCalledWith("prlimit", ["--fsize=8388608", "--as=268435456", "--cpu=20", "--", "git", "-c", "core.hooksPath=/dev/null", "status", "--porcelain=v1", "--untracked-files=all", "--", "."], expect.objectContaining({ cwd: "/checkout/packages/codecamp-knowledge/fixtures/apk-guided", timeout: 10_000 }));

    const root = await mkdtemp(join(tmpdir(), "capture-symlink-test-"));
    const fixture = join(root, "packages/codecamp-knowledge/fixtures/apk-guided");
    await mkdir(fixture, { recursive: true });
    const secret = join(root, "secret.txt");
    await writeFile(secret, "secret");
    await symlink(secret, join(fixture, "escape.ts"));
    await expect(readTutorialFixtureFile(root, "escape.ts")).rejects.toThrow("escaped fixture root");
    await writeFile(join(fixture, "oversized.ts"), "x".repeat(128 * 1024 + 1));
    await expect(readTutorialFixtureFile(root, "oversized.ts")).rejects.toThrow("capture quota");
  });

  it("fails fast on per-learner concurrency and sliding-window capture rates", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const limiter = createTutorialCaptureLimiter({ maxConcurrent: 2, maxPerLearner: 2, windowMs: 60_000, now: () => 1_000 });
    const first = limiter.run("learner-1", () => pending);
    await expect(limiter.run("learner-1", async () => undefined)).rejects.toThrow("already running");
    release();
    await first;
    await expect(limiter.run("learner-1", async () => "second")).resolves.toBe("second");
    await expect(limiter.run("learner-1", async () => undefined)).rejects.toThrow("rate limit");
  });

  it("fails closed at the route service-token boundary", async () => {
    const original = process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN;
    const { POST } = await import("../../app/api/internal/tutorial-repository-capture/route");
    delete process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN;
    await expect(POST(new Request("http://localhost/internal", { method: "POST" }))).resolves.toMatchObject({ status: 401 });
    process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN = "service-secret";
    await expect(POST(new Request("http://localhost/internal", { method: "POST", headers: { authorization: "Bearer wrong" } }))).resolves.toMatchObject({ status: 401 });
    if (original === undefined) delete process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN;
    else process.env.TUTORIAL_REPOSITORY_WORKER_TOKEN = original;
  }, 15_000);
});
