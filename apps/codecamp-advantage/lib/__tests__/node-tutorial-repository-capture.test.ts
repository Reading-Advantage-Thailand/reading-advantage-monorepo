// @vitest-environment node
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cloneTutorialRepository, readTutorialFixtureFile, type TutorialGitRunner } from "../node-tutorial-repository-capture";

const FIXTURE = "packages/codecamp-knowledge/fixtures/apk-guided";

/** Creates a fake Git runner that writes the given files into the clone target. */
function writingRunner(files: Record<string, string>): TutorialGitRunner {
  return vi.fn(async (_file, args, _options) => {
    if (args.includes("clone")) {
      const target = args.at(-1)!;
      for (const [path, content] of Object.entries(files)) {
        await mkdir(dirname(join(target, path)), { recursive: true });
        await writeFile(join(target, path), content);
      }
    }
    return { stdout: "" };
  });
}

describe("node tutorial repository capture", () => {
  const roots: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it("clones, sparse-checks out only the fixture, and cleans the checkout on demand", async () => {
    const runner = writingRunner({ [`${FIXTURE}/src/cartridge.ts`]: "export {};" });

    const clone = await cloneTutorialRepository("https://github.com/learner/reading-advantage-monorepo.git", runner);

    expect(runner).toHaveBeenNthCalledWith(2, "prlimit", ["--fsize=8388608", "--as=268435456", "--cpu=20", "--", "git", "sparse-checkout", "set", FIXTURE], expect.objectContaining({ cwd: clone.checkoutRoot, timeout: 25_000, maxBuffer: 262_144, windowsHide: true, encoding: "utf8" }));
    const env = (runner as ReturnType<typeof vi.fn>).mock.calls[0][2].env;
    expect(Object.keys(env).sort()).toEqual(["NODE_ENV", "PATH"]);
    await expect(access(join(clone.checkoutRoot, FIXTURE, "src/cartridge.ts"))).resolves.toBeUndefined();
    await clone.cleanup();
    await expect(access(dirname(clone.checkoutRoot))).rejects.toThrow();
  });

  it("rejects a checkout above the 4 MiB quota and removes the temporary directory", async () => {
    let target = "";
    const big = "x".repeat(2 * 1024 * 1024 + 1);
    const inner = writingRunner({ "a.bin": big, "nested/b.bin": big });
    const runner: TutorialGitRunner = vi.fn(async (file, args, options) => {
      if (args.includes("clone")) target = args.at(-1)!;
      return inner(file, args, options);
    });

    await expect(cloneTutorialRepository("https://github.com/learner/repo.git", runner)).rejects.toThrow("exceeds the capture quota");
    await expect(access(dirname(target))).rejects.toThrow();
  });

  it("removes the temporary directory when sparse checkout fails", async () => {
    let target = "";
    const runner: TutorialGitRunner = vi.fn(async (_file, args) => {
      if (args.includes("clone")) { target = args.at(-1)!; await mkdir(target, { recursive: true }); return { stdout: "" }; }
      throw new Error("sparse failed");
    });

    await expect(cloneTutorialRepository("https://github.com/learner/repo.git", runner)).rejects.toThrow("sparse failed");
    await expect(access(dirname(target))).rejects.toThrow();
  });

  it("refuses to run Git outside the constrained Linux worker", async () => {
    vi.spyOn(process, "platform", "get").mockReturnValue("darwin");
    const runner: TutorialGitRunner = vi.fn(async () => ({ stdout: "" }));

    await expect(cloneTutorialRepository("https://github.com/learner/repo.git", runner)).rejects.toThrow("constrained Linux worker");
    expect(runner).not.toHaveBeenCalled();
  });

  it("reads an in-root fixture file and rejects traversal and directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "capture-read-test-"));
    roots.push(root);
    await mkdir(join(root, FIXTURE, "src"), { recursive: true });
    await writeFile(join(root, FIXTURE, "src/game-state.ts"), "state");
    await writeFile(join(root, "outside.ts"), "secret");

    await expect(readTutorialFixtureFile(root, "src/game-state.ts")).resolves.toBe("state");
    await expect(readTutorialFixtureFile(root, "../../../../outside.ts")).rejects.toThrow("escaped fixture root");
    await expect(readTutorialFixtureFile(root, "src")).rejects.toThrow("capture quota");
  });

  it("accepts a fixture file of exactly 128 KiB", async () => {
    const root = await mkdtemp(join(tmpdir(), "capture-limit-test-"));
    roots.push(root);
    await mkdir(join(root, FIXTURE), { recursive: true });
    await writeFile(join(root, FIXTURE, "limit.ts"), "x".repeat(128 * 1024));

    await expect(readTutorialFixtureFile(root, "limit.ts")).resolves.toHaveLength(128 * 1024);
  });
});
