import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createNodeRepositoryFileTransactionOperations } from "../node-file-transaction.js";
import {
  applyRepositoryFileTransaction,
  previewRepositoryFileTransaction,
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
});
