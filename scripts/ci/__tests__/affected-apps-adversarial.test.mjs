/**
 * Adversarial tests for the affected-app logic of the track `per_app_cicd_20261107`.
 *
 * Hostile paths and refs of P1.7 that the Red suite does not cover: a merge
 * commit as the head, a base that the clone still holds after a force push, a
 * very long file list (10 000 changed paths, the only app path last and over
 * 1 MB of path text so a buffer cut drops it), and CRLF line endings in a
 * manifest. Every case runs the real script on a scratch git repository with
 * the existing harness. A case that fails stays red and goes to Green.
 */
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import {
  changedFileCount,
  commitChanges,
  expectIds,
  git,
  gitEnv,
  homeFor,
  makeRepo,
  realWorkspaceFiles,
  removeScratchDirs,
  runScript,
  workspaceSeedFiles,
} from "./helpers/scratch.mjs";

/**
 * Read a changed-path list with a 1 GB stdout buffer.
 *
 * The harness `git` has no `maxBuffer`, so a listing over 1 MB truncates there.
 * This reader keeps the long-list case honest.
 *
 * @param {string} dir The scratch repository path.
 * @param {string} base The base commit.
 * @param {string} head The head commit.
 * @returns {string[]} The changed paths.
 * @throws {Error} When git fails.
 */
function largeChangedPaths(dir, base, head) {
  const result = spawnSync("git", ["diff", "--name-only", "--no-renames", "-z", base, head], {
    cwd: dir,
    env: gitEnv(homeFor(dir)),
    encoding: "utf8",
    maxBuffer: 1 << 30,
  });
  if (result.status !== 0) throw new Error(`H-03 git diff failed: ${result.stderr}`);
  return (result.stdout ?? "").split("\0").filter((name) => name !== "");
}

/** The cached copy of the real workspace files. */
let workspaceFilesCache = null;

/**
 * Get the real workspace files of the repository.
 *
 * @returns {Record<string, string>} The relative path and text of every file.
 */
function workspaceFiles() {
  if (!workspaceFilesCache) workspaceFilesCache = realWorkspaceFiles();
  return workspaceFilesCache;
}

/**
 * Build a scratch repository that holds the real workspace manifests.
 *
 * @returns {{ dir: string, sha: string }} The scratch repository.
 */
function workspaceRepo() {
  return makeRepo({ ...workspaceFiles(), ...workspaceSeedFiles() });
}

afterEach(() => {
  removeScratchDirs();
});

describe("P1 hostile paths and refs", () => {
  it("H-01 a merge commit as the head diffs the trees", () => {
    const { dir, sha: base } = workspaceRepo();
    git(dir, ["checkout", "-q", "-b", "side"]);
    const side = commitChanges(dir, {
      write: {
        "apps/storytime/app/page.tsx":
          "export default function Page() {\n  return <main>storytime</main>;\n}\n",
      },
    });
    git(dir, ["checkout", "-q", "master"]);
    commitChanges(dir, {
      write: {
        "apps/www-reading-advantage/src/app/page.tsx":
          "export default function Page() {\n  return <main>www</main>;\n}\n",
      },
    });
    const merged = git(dir, ["merge", "--no-ff", "--no-edit", "-q", "side"]);
    expect(merged.status, "H-01 merge exit").toBe(0);
    const head = git(dir, ["rev-parse", "HEAD"]).stdout.trim();
    expect(head === side, "H-01 head is a merge").toBe(false);
    const parents = git(dir, ["rev-list", "--parents", "-n", "1", "HEAD"]).stdout.trim().split(" ");
    expect(parents.length, "H-01 parents=3").toBe(3);
    const changed = changedFileCount(dir, base, head);
    expect(changed, `H-01 changed_files=${changed}`).toBe(2);
    const result = git(dir, ["rev-parse", "HEAD"]);
    expect(result.status).toBe(0);
    const out = runScript(dir, base, head);
    expectIds(
      out,
      ["storytime", "www-reading-advantage"],
      `H-01 rows=2 changed_files=${changed}`,
      changed,
    );
  });

  it("H-02 a base that the clone holds after a force push is readable", () => {
    const { dir, sha: base } = workspaceRepo();
    const pushed = commitChanges(dir, {
      write: {
        "apps/www-reading-advantage/src/app/page.tsx":
          "export default function Page() {\n  return <main>www</main>;\n}\n",
      },
    });
    const reset = git(dir, ["reset", "-q", "--hard", base]);
    expect(reset.status, "H-02 reset exit").toBe(0);
    const head = commitChanges(dir, {
      write: {
        "apps/storytime/app/page.tsx":
          "export default function Page() {\n  return <main>storytime</main>;\n}\n",
      },
    });
    const held = git(dir, ["cat-file", "-e", `${pushed}^{commit}`]);
    expect(held.status, "H-02 base still held").toBe(0);
    const changed = changedFileCount(dir, pushed, head);
    expect(changed, `H-02 changed_files=${changed}`).toBe(2);
    const out = runScript(dir, pushed, head);
    expectIds(
      out,
      ["storytime", "www-reading-advantage"],
      `H-02 rows=2 changed_files=${changed}`,
      changed,
    );
  });

  it("H-03 a very long file list is read in full", () => {
    const { dir, sha: base } = workspaceRepo();
    const write = {};
    const filler = "x".repeat(96);
    for (let index = 0; index < 9999; index += 1) {
      write[`apps/aaa-bulk/data/${filler}-${index}.txt`] = `generated ${index}\n`;
    }
    // The only app path sorts last, so a read cut at the default 1 MB buffer drops it.
    const onlyAppPath = "apps/storytime/content/zzzz-only.txt";
    write[onlyAppPath] = "only storytime\n";
    const head = commitChanges(dir, { write });
    const listing = largeChangedPaths(dir, base, head);
    const changed = listing.length;
    expect(changed, `H-03 changed_files=${changed}`).toBe(10000);
    expect(listing[listing.length - 1], `H-03 last_path=${listing[listing.length - 1]}`).toBe(
      onlyAppPath,
    );
    expect(
      listing.join("").length,
      `H-03 path_bytes=${listing.join("").length}`,
    ).toBeGreaterThan(1024 * 1024);
    const out = runScript(dir, base, head);
    expectIds(out, ["storytime"], `H-03 rows=1 changed_files=${changed}`, changed);
  });

  it("H-04 CRLF line endings do not change the answer", () => {
    const files = { ...workspaceFiles(), ...workspaceSeedFiles() };
    const { dir, sha: base } = makeRepo(files);
    const crlfWorkspace = files["pnpm-workspace.yaml"].replaceAll("\n", "\r\n");
    const first = commitChanges(dir, {
      write: {
        "pnpm-workspace.yaml": crlfWorkspace,
        "apps/www-reading-advantage/src/app/page.tsx":
          "export default function Page() {\n  return <main>www</main>;\n}\n",
      },
    });
    const firstChanged = changedFileCount(dir, base, first);
    expect(firstChanged, `H-04 changed_files=${firstChanged}`).toBe(2);
    const firstOut = runScript(dir, base, first);
    expectIds(
      firstOut,
      ["www-reading-advantage"],
      `H-04 rows=1 changed_files=${firstChanged}`,
      firstChanged,
    );
    const crlfManifest = files["apps/storytime/package.json"].replaceAll("\n", "\r\n");
    const second = commitChanges(dir, {
      write: {
        "apps/storytime/package.json": crlfManifest,
        "apps/storytime/app/page.tsx":
          "export default function Page() {\n  return <main>storytime</main>;\n}\n",
      },
    });
    const secondChanged = changedFileCount(dir, first, second);
    expect(secondChanged, `H-04 changed_files=${secondChanged}`).toBe(2);
    const secondOut = runScript(dir, first, second);
    expectIds(
      secondOut,
      ["storytime"],
      `H-04 rows=1 changed_files=${secondChanged}`,
      secondChanged,
    );
  });
});
