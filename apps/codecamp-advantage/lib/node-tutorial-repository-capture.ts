import { execFile } from "node:child_process";
import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";

/** Fixed-command runner injected by security-boundary tests. */
export type TutorialGitRunner = (file: string, args: readonly string[], options: { cwd?: string; timeout: number; maxBuffer: number; windowsHide: boolean; encoding: "utf8"; env: NodeJS.ProcessEnv }) => Promise<{ stdout: string }>;

const defaultGitRunner: TutorialGitRunner = async (file, args, options) => promisify(execFile)(file, [...args], options);
const commandOptions = (cwd?: string) => ({ cwd, timeout: 25_000, maxBuffer: 256 * 1024, windowsHide: true, encoding: "utf8" as const, env: { PATH: process.env.PATH ?? "", NODE_ENV: process.env.NODE_ENV ?? "production" } });

/**
 * Clones one server-derived tutorial repository into an owned temporary directory.
 * @param repositoryUrl Server-derived clone URL.
 * @param runGit Fixed-command runner used by tests and production.
 * @returns Checkout root plus mandatory recursive cleanup.
 * @throws When Git clone fails, after removing the allocated temporary directory.
 */
export async function cloneTutorialRepository(repositoryUrl: string, runGit: TutorialGitRunner = defaultGitRunner): Promise<{ checkoutRoot: string; cleanup(): Promise<void> }> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "codecamp-tutorial-"));
  const checkoutRoot = join(temporaryRoot, "checkout");
  try {
    await runGit("git", ["clone", "--depth", "1", "--filter=blob:none", repositoryUrl, checkoutRoot], commandOptions());
    return { checkoutRoot, cleanup: () => rm(temporaryRoot, { recursive: true, force: true }) };
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Reads one authored fixture file after resolving symlinks below the checkout boundary.
 * @param checkoutRoot Trusted cloned checkout.
 * @param filePath Authored repository-relative fixture path.
 * @returns UTF-8 fixture contents.
 */
export async function readTutorialFixtureFile(checkoutRoot: string, filePath: string): Promise<string> {
  const fixtureRoot = await realpath(resolve(checkoutRoot, "packages/codecamp-knowledge/fixtures/apk-guided"));
  const target = await realpath(resolve(fixtureRoot, filePath));
  if (target !== fixtureRoot && !target.startsWith(`${fixtureRoot}${sep}`)) throw new Error("Tutorial file escaped fixture root");
  return readFile(target, "utf8");
}

/**
 * Returns porcelain status using a fixed Git invocation scoped to the guided fixture.
 * @param checkoutRoot Trusted cloned checkout.
 * @param runGit Fixed-command runner used by tests and production.
 * @returns Git porcelain output.
 */
export async function tutorialFixtureGitStatus(checkoutRoot: string, runGit: TutorialGitRunner = defaultGitRunner): Promise<string> {
  const fixtureRoot = resolve(checkoutRoot, "packages/codecamp-knowledge/fixtures/apk-guided");
  return (await runGit("git", ["-c", "core.hooksPath=/dev/null", "status", "--porcelain=v1", "--untracked-files=all", "--", "."], { ...commandOptions(fixtureRoot), timeout: 10_000 })).stdout;
}
