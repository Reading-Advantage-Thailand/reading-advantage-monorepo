import { execFile } from "node:child_process";
import { lstat, mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";

/** Fixed-command runner injected by security-boundary tests. */
export type TutorialGitRunner = (file: string, args: readonly string[], options: { cwd?: string; timeout: number; maxBuffer: number; windowsHide: boolean; encoding: "utf8"; env: NodeJS.ProcessEnv }) => Promise<{ stdout: string }>;

const defaultGitRunner: TutorialGitRunner = async (file, args, options) => promisify(execFile)(file, [...args], options);
const commandOptions = (cwd?: string) => ({ cwd, timeout: 25_000, maxBuffer: 256 * 1024, windowsHide: true, encoding: "utf8" as const, env: { PATH: process.env.PATH ?? "", NODE_ENV: process.env.NODE_ENV ?? "production" } });
const MAX_GIT_FILE_BYTES = 8 * 1024 * 1024;
const MAX_CHECKOUT_BYTES = 4 * 1024 * 1024;
const MAX_FIXTURE_FILE_BYTES = 128 * 1024;
const FIXTURE_DIRECTORY = "packages/codecamp-knowledge/fixtures/apk-guided";

function boundedGitCommand(args: readonly string[]): { file: string; args: string[] } {
  if (process.platform !== "linux") throw new Error("Tutorial repository capture requires the constrained Linux worker");
  return { file: "prlimit", args: [`--fsize=${MAX_GIT_FILE_BYTES}`, "--as=268435456", "--cpu=20", "--", "git", ...args] };
}

async function directoryBytes(path: string): Promise<number> {
  const entries = await readdir(path, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) total += await directoryBytes(target);
    else if (entry.isFile()) total += (await lstat(target)).size;
    if (total > MAX_CHECKOUT_BYTES) return total;
  }
  return total;
}

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
    const clone = boundedGitCommand(["clone", "--depth", "1", "--filter=blob:none", "--sparse", repositoryUrl, checkoutRoot]);
    await runGit(clone.file, clone.args, commandOptions());
    const sparse = boundedGitCommand(["sparse-checkout", "set", FIXTURE_DIRECTORY]);
    await runGit(sparse.file, sparse.args, commandOptions(checkoutRoot));
    if (await directoryBytes(checkoutRoot) > MAX_CHECKOUT_BYTES) throw new Error("Tutorial repository exceeds the capture quota");
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
  const fixtureRoot = await realpath(resolve(checkoutRoot, FIXTURE_DIRECTORY));
  const target = await realpath(resolve(fixtureRoot, filePath));
  if (target !== fixtureRoot && !target.startsWith(`${fixtureRoot}${sep}`)) throw new Error("Tutorial file escaped fixture root");
  const metadata = await lstat(target);
  if (!metadata.isFile() || metadata.size > MAX_FIXTURE_FILE_BYTES) throw new Error("Tutorial fixture file exceeds the capture quota");
  return readFile(target, "utf8");
}

/**
 * Returns porcelain status using a fixed Git invocation scoped to the guided fixture.
 * @param checkoutRoot Trusted cloned checkout.
 * @param runGit Fixed-command runner used by tests and production.
 * @returns Git porcelain output.
 */
export async function tutorialFixtureGitStatus(checkoutRoot: string, runGit: TutorialGitRunner = defaultGitRunner): Promise<string> {
  const fixtureRoot = resolve(checkoutRoot, FIXTURE_DIRECTORY);
  const status = boundedGitCommand(["-c", "core.hooksPath=/dev/null", "status", "--porcelain=v1", "--untracked-files=all", "--", "."]);
  return (await runGit(status.file, status.args, { ...commandOptions(fixtureRoot), timeout: 10_000 })).stdout;
}
