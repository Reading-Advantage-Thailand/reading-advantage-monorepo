import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createNodeRepositoryFileTransactionOperations } from "../node-file-transaction.js";
import {
  ARCHITECTURE_WRITE_LOCK_PATH,
  applyRepositoryFileTransaction,
  previewRepositoryFileTransaction,
  recoverRepositoryFileTransaction,
} from "../policy-update-transaction.js";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Node repository file transaction adapter", () => {
  it("previews and commits three regular files without artifacts", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "architecture-transaction-"));
    temporaryRoots.push(repoRoot);
    const replacements = ["policy", "database", "provider"].map(
      (id, index) => ({
        id,
        repositoryPath: `config/${id}.json`,
        contents: `replacement-${index + 1}\n`,
      }),
    );
    for (const [index, replacement] of replacements.entries()) {
      const path = resolve(repoRoot, replacement.repositoryPath);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `original-${index + 1}\n`, "utf8");
    }
    const fileOperations = createNodeRepositoryFileTransactionOperations();

    const plan = await previewRepositoryFileTransaction({
      repoRoot,
      replacements,
      fileOperations,
    });
    const outcome = await applyRepositoryFileTransaction({
      plan,
      acknowledge: true,
      expectedPlanHash: plan.planHash,
      fileOperations,
      transactionId: "integration",
      validate: (_replacement, contents) => {
        expect(contents).toMatch(/^replacement-/);
      },
    });

    expect(outcome).toEqual({ state: "committed", planHash: plan.planHash });
    await Promise.all(
      replacements.map(async (replacement, index) => {
        await expect(
          readFile(resolve(repoRoot, replacement.repositoryPath), "utf8"),
        ).resolves.toBe(`replacement-${index + 1}\n`);
      }),
    );
  });

  it("fails closed before staging when a destination parent is swapped", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "architecture-swap-repo-"));
    const outsideRoot = await mkdtemp(
      join(tmpdir(), "architecture-swap-outside-"),
    );
    temporaryRoots.push(repoRoot, outsideRoot);
    const configRoot = resolve(repoRoot, "config");
    const savedConfigRoot = resolve(repoRoot, "config-before-swap");
    await mkdir(configRoot, { recursive: true });
    const replacements = ["policy", "database", "provider"].map(
      (id, index) => ({
        id,
        repositoryPath: `config/${id}.json`,
        contents: `replacement-${index + 1}\n`,
      }),
    );
    for (const [index, replacement] of replacements.entries()) {
      const original = `original-${index + 1}\n`;
      await writeFile(resolve(repoRoot, replacement.repositoryPath), original);
      await writeFile(resolve(outsideRoot, `${replacement.id}.json`), original);
    }
    const nodeOperations = createNodeRepositoryFileTransactionOperations();
    let injectSwap = false;
    let swapped = false;
    const fileOperations = {
      ...nodeOperations,
      readFile: async (path: string) => {
        const contents = await nodeOperations.readFile(path);
        if (
          injectSwap &&
          !swapped &&
          path === resolve(repoRoot, replacements[0]!.repositoryPath)
        ) {
          await rename(configRoot, savedConfigRoot);
          await symlink(outsideRoot, configRoot, "dir");
          swapped = true;
        }
        return contents;
      },
    };
    const plan = await previewRepositoryFileTransaction({
      repoRoot,
      replacements,
      fileOperations,
    });
    injectSwap = true;

    await expect(
      applyRepositoryFileTransaction({
        plan,
        acknowledge: true,
        expectedPlanHash: plan.planHash,
        fileOperations,
        transactionId: "directory-swap",
      }),
    ).rejects.toThrow(/original-byte recovery was attempted/i);

    expect(swapped).toBe(true);
    for (const [index, replacement] of replacements.entries()) {
      await expect(
        readFile(resolve(outsideRoot, `${replacement.id}.json`), "utf8"),
      ).resolves.toBe(`original-${index + 1}\n`);
      await expect(
        readFile(resolve(savedConfigRoot, `${replacement.id}.json`), "utf8"),
      ).resolves.toBe(`original-${index + 1}\n`);
    }
    expect(
      (await readdir(outsideRoot)).some((path) =>
        path.includes("architecture-transaction"),
      ),
    ).toBe(false);
  });

  it("recovers all-old or all-new state after every process-kill boundary", async () => {
    const childPath = new URL(
      "./fixtures/transaction-crash-child.ts",
      import.meta.url,
    );
    for (const operation of ["write", "copy", "rename"] as const) {
      for (const boundary of [1, 2, 3]) {
        const repoRoot = await mkdtemp(
          join(tmpdir(), `architecture-crash-${operation}-${boundary}-`),
        );
        temporaryRoots.push(repoRoot);
        await mkdir(resolve(repoRoot, "config"), { recursive: true });
        for (const [index, id] of [
          "policy",
          "database",
          "provider",
        ].entries()) {
          await writeFile(
            resolve(repoRoot, `config/${id}.json`),
            `original-${index + 1}\n`,
          );
        }
        const child = spawn(
          process.execPath,
          [
            "--import",
            "tsx",
            childPath.pathname,
            repoRoot,
            operation,
            String(boundary),
          ],
          { stdio: "ignore" },
        );
        const [code, signal] = (await once(child, "exit")) as [
          number | null,
          NodeJS.Signals | null,
        ];
        expect(code).toBeNull();
        expect(signal).toBe("SIGKILL");
        const transactionId = (
          await readFile(
            resolve(repoRoot, ARCHITECTURE_WRITE_LOCK_PATH),
            "utf8",
          )
        ).trim();
        expect(transactionId).toBe(`crash-${operation}-${boundary}`);

        const outcome = await recoverRepositoryFileTransaction({
          repoRoot,
          transactionId,
          acknowledge: true,
          fileOperations: createNodeRepositoryFileTransactionOperations(),
        });
        const committed = operation === "rename" && boundary === 3;
        expect(outcome.state).toBe(
          committed ? "finalized-committed" : "recovered-originals",
        );
        for (const [index, id] of [
          "policy",
          "database",
          "provider",
        ].entries()) {
          await expect(
            readFile(resolve(repoRoot, `config/${id}.json`), "utf8"),
          ).resolves.toBe(
            `${committed ? "replacement" : "original"}-${index + 1}\n`,
          );
        }
        expect(
          (await readdir(repoRoot)).some((path) =>
            path.startsWith(".architecture-enforcement-write"),
          ),
        ).toBe(false);
        expect(
          (await readdir(resolve(repoRoot, "config"))).some((path) =>
            path.includes("architecture-transaction"),
          ),
        ).toBe(false);
      }
    }
  }, 60_000);
});
