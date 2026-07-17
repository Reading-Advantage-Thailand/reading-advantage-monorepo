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
  it("rejects unbound path assertions and duplicate path binding", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "architecture-binding-"));
    temporaryRoots.push(repoRoot);
    const destination = resolve(repoRoot, "config/policy.json");
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, "original\n");
    const fileOperations = createNodeRepositoryFileTransactionOperations();

    await expect(
      fileOperations.assertTransactionPath(destination),
    ).rejects.toThrow(/not bound/i);
    await fileOperations.bindTransactionPaths([destination]);
    await expect(
      fileOperations.bindTransactionPaths([destination]),
    ).rejects.toThrow(/already bound/i);
    await fileOperations.releaseTransactionPaths();
  });

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

  it("produces the same plan hash in distinct repository roots", async () => {
    const roots = await Promise.all([
      mkdtemp(join(tmpdir(), "architecture-plan-a-")),
      mkdtemp(join(tmpdir(), "architecture-plan-b-")),
    ]);
    temporaryRoots.push(...roots);
    const replacements = ["policy", "database", "provider"].map(
      (id, index) => ({
        id,
        repositoryPath: `config/${id}.json`,
        contents: `replacement-${index + 1}\n`,
      }),
    );
    for (const root of roots) {
      await mkdir(resolve(root, "config"), { recursive: true });
      for (const [index, replacement] of replacements.entries()) {
        await writeFile(
          resolve(root, replacement.repositoryPath),
          `original-${index + 1}\n`,
        );
      }
    }

    const plans = await Promise.all(
      roots.map((repoRoot) =>
        previewRepositoryFileTransaction({
          repoRoot,
          replacements,
          fileOperations: createNodeRepositoryFileTransactionOperations(),
        }),
      ),
    );
    expect(plans[0]?.replacements[0]?.canonicalDestination).not.toBe(
      plans[1]?.replacements[0]?.canonicalDestination,
    );
    expect(plans[0]?.planHash).toBe(plans[1]?.planHash);
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
    ).rejects.toThrow(/transaction parent directory changed/i);

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

  it("releases the lock through its bound root after a late namespace swap", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "architecture-late-repo-"));
    const outsideRoot = await mkdtemp(
      join(tmpdir(), "architecture-late-outside-"),
    );
    const savedRepoRoot = `${repoRoot}-saved`;
    temporaryRoots.push(repoRoot, outsideRoot, savedRepoRoot);
    const replacements = ["policy", "database", "provider"].map(
      (id, index) => ({
        id,
        repositoryPath: `config/${id}.json`,
        contents: `replacement-${index + 1}\n`,
      }),
    );
    await mkdir(resolve(repoRoot, "config"), { recursive: true });
    for (const [index, replacement] of replacements.entries()) {
      await writeFile(
        resolve(repoRoot, replacement.repositoryPath),
        `original-${index + 1}\n`,
      );
    }
    const outsideLock = resolve(outsideRoot, ARCHITECTURE_WRITE_LOCK_PATH);
    await writeFile(outsideLock, "outside-lock-sentinel\n");
    const nodeOperations = createNodeRepositoryFileTransactionOperations();
    let swapped = false;
    const fileOperations = {
      ...nodeOperations,
      unlink: async (path: string) => {
        await nodeOperations.unlink(path);
        if (!swapped && path.endsWith(".journal.json")) {
          await rename(repoRoot, savedRepoRoot);
          await symlink(outsideRoot, repoRoot, "dir");
          swapped = true;
        }
      },
    };
    const plan = await previewRepositoryFileTransaction({
      repoRoot,
      replacements,
      fileOperations,
    });

    await expect(
      applyRepositoryFileTransaction({
        plan,
        acknowledge: true,
        expectedPlanHash: plan.planHash,
        fileOperations,
        transactionId: "late-root-swap",
      }),
    ).resolves.toEqual({ state: "committed", planHash: plan.planHash });
    expect(swapped).toBe(true);
    await expect(readFile(outsideLock, "utf8")).resolves.toBe(
      "outside-lock-sentinel\n",
    );
    await expect(
      readFile(resolve(savedRepoRoot, ARCHITECTURE_WRITE_LOCK_PATH), "utf8"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    for (const [index, replacement] of replacements.entries()) {
      await expect(
        readFile(resolve(savedRepoRoot, replacement.repositoryPath), "utf8"),
      ).resolves.toBe(`replacement-${index + 1}\n`);
    }
  });

  it("recovers all-old or all-new state after every process-kill boundary", async () => {
    const childPath = new URL(
      "./fixtures/transaction-crash-child.ts",
      import.meta.url,
    );
    const crashCases = [
      { operation: "lock", boundary: 1, committed: false },
      ...["write", "copy"].flatMap((operation) =>
        [1, 2, 3].map((boundary) => ({
          operation,
          boundary,
          committed: false,
        })),
      ),
      ...[1, 2, 3].map((boundary) => ({
        operation: "rename",
        boundary,
        committed: boundary === 3,
      })),
      { operation: "journal-cleanup", boundary: 1, committed: true },
    ] as const;
    for (const { operation, boundary, committed } of crashCases) {
      const repoRoot = await mkdtemp(
        join(tmpdir(), `architecture-crash-${operation}-${boundary}-`),
      );
      temporaryRoots.push(repoRoot);
      await mkdir(resolve(repoRoot, "config"), { recursive: true });
      for (const [index, id] of ["policy", "database", "provider"].entries()) {
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
      const lockRecord = JSON.parse(
        await readFile(resolve(repoRoot, ARCHITECTURE_WRITE_LOCK_PATH), "utf8"),
      ) as { transactionId: string };
      const transactionId = lockRecord.transactionId;
      expect(transactionId).toBe(`crash-${operation}-${boundary}`);

      const outcome = await recoverRepositoryFileTransaction({
        repoRoot,
        transactionId,
        acknowledge: true,
        fileOperations: createNodeRepositoryFileTransactionOperations(),
      });
      expect(outcome.state).toBe(
        committed ? "finalized-committed" : "recovered-originals",
      );
      for (const [index, id] of ["policy", "database", "provider"].entries()) {
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
  }, 90_000);
});
