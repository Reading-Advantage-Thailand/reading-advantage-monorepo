// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "..");
const manifestScript = resolve(
  appRoot,
  "scripts/release-source-manifest.mjs",
);
const archiveScript = resolve(
  appRoot,
  "scripts/create-sales-release-archive.sh",
);
const temporaryRoots: string[] = [];

/**
 * Runs the archive helper bytes from the exact reviewed commit.
 * @param root Temporary repository root.
 * @param commit Exact commit being archived.
 * @param archive Empty destination for the release archive.
 * @returns Completed Bash process result.
 */
function createArchiveFromCommit(root: string, commit: string, archive: string) {
  return spawnSync(
    "bash",
    [
      "-o",
      "pipefail",
      "-c",
      'git show "$1:apps/sales-advantage/scripts/create-sales-release-archive.sh" | bash -s -- "$1" "$2"',
      "sales-release-source-test",
      commit,
      archive,
    ],
    { cwd: root, encoding: "utf8" },
  );
}

/** Creates one tracked temporary Sales release repository. */
function createReleaseRepository() {
  const root = mkdtempSync(join(tmpdir(), "sales-release-source-"));
  temporaryRoots.push(root);
  for (const path of [
    "apps/sales-advantage/scripts",
    "packages/example",
  ]) {
    mkdirSync(join(root, path), { recursive: true });
  }
  for (const path of [
    ".gcloudignore",
    ".pnpmfile.cjs",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    "apps/sales-advantage/cloudbuild.yaml",
    "packages/example/index.ts",
  ]) {
    writeFileSync(join(root, path), `committed:${path}\n`);
  }
  copyFileSync(
    manifestScript,
    join(root, "apps/sales-advantage/scripts/release-source-manifest.mjs"),
  );
  copyFileSync(
    archiveScript,
    join(root, "apps/sales-advantage/scripts/create-sales-release-archive.sh"),
  );
  chmodSync(
    join(root, "apps/sales-advantage/scripts/release-source-manifest.mjs"),
    0o755,
  );
  chmodSync(
    join(root, "apps/sales-advantage/scripts/create-sales-release-archive.sh"),
    0o755,
  );
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.email", "sales-test@example.com"], {
    cwd: root,
  });
  execFileSync("git", ["config", "user.name", "Sales Test"], { cwd: root });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-q", "-m", "release fixture"], { cwd: root });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  return { root, commit };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Sales exact release source archive", () => {
  it("archives committed bytes and verifies the exhaustive manifest", () => {
    const { root, commit } = createReleaseRepository();
    const archive = join(root, "archive");
    writeFileSync(join(root, "package.json"), "dirty working bytes\n");
    writeFileSync(
      join(root, "apps/sales-advantage/scripts/create-sales-release-archive.sh"),
      "exit 91\n",
    );
    const created = createArchiveFromCommit(root, commit, archive);
    expect(created.status).toBe(0);
    expect(readFileSync(join(archive, "package.json"), "utf8")).toBe(
      "committed:package.json\n",
    );
    expect(readFileSync(
      join(
        archive,
        "apps/sales-advantage/scripts/create-sales-release-archive.sh",
      ),
      "utf8",
    )).not.toContain("exit 91");
    const manifestPath = join(
      archive,
      "apps/sales-advantage/release-source.json",
    );
    const manifestBytes = readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestBytes) as {
      commit: string;
      files: Array<{ path: string; mode: string }>;
    };
    expect(manifest.commit).toBe(commit);
    const manifestPaths = manifest.files.map((file) => file.path);
    expect(manifestPaths).toEqual(expect.arrayContaining([
      ".gcloudignore",
      ".pnpmfile.cjs",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "turbo.json",
      "apps/sales-advantage/cloudbuild.yaml",
      "apps/sales-advantage/scripts/create-sales-release-archive.sh",
      "apps/sales-advantage/scripts/release-source-manifest.mjs",
      "packages/example/index.ts",
    ]));
    expect(manifestPaths).not.toContain(
      "apps/sales-advantage/release-source.json",
    );
    expect(manifest.files.find((file) =>
      file.path.endsWith("release-source-manifest.mjs"))?.mode).toBe("100755");

    const sha = created.stdout.trim();
    expect(spawnSync(process.execPath, [
      join(archive, "apps/sales-advantage/scripts/release-source-manifest.mjs"),
      "verify",
      commit,
      archive,
      manifestPath,
      sha,
    ], { encoding: "utf8" }).status).toBe(0);

    writeFileSync(join(archive, "packages/example/index.ts"), "tampered\n");
    expect(spawnSync(process.execPath, [
      join(archive, "apps/sales-advantage/scripts/release-source-manifest.mjs"),
      "verify",
      commit,
      archive,
      manifestPath,
      sha,
    ], { encoding: "utf8" }).status).not.toBe(0);
  });

  it("rejects a manifest SHA or release commit mismatch", () => {
    const { root, commit } = createReleaseRepository();
    const archive = join(root, "archive");
    const created = createArchiveFromCommit(root, commit, archive);
    expect(created.status).toBe(0);
    const archivedManifestScript = join(
      archive,
      "apps/sales-advantage/scripts/release-source-manifest.mjs",
    );
    const manifestPath = join(
      archive,
      "apps/sales-advantage/release-source.json",
    );
    expect(spawnSync(process.execPath, [
      archivedManifestScript,
      "verify",
      commit,
      archive,
      manifestPath,
      "0".repeat(64),
    ]).status).not.toBe(0);
    expect(spawnSync(process.execPath, [
      archivedManifestScript,
      "verify",
      "b".repeat(40),
      archive,
      manifestPath,
      created.stdout.trim(),
    ]).status).not.toBe(0);
  });
});
