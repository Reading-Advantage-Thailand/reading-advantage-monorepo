import { posix } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARCHITECTURE_WRITE_JOURNAL_PREFIX,
  ARCHITECTURE_WRITE_LOCK_PATH,
  RepositoryFileTransactionFailure,
  applyRepositoryFileTransaction,
  previewRepositoryFileTransaction,
  recoverRepositoryFileTransaction,
  type RepositoryFileInspection,
  type RepositoryFileTransactionOperations,
  type RepositoryFileTransactionPlan,
} from "../policy-update-transaction.js";

const ROOT = "/repo";
const PATHS = [
  "config/policy.json",
  "config/database.json",
  "config/provider.json",
];

interface InjectedFailure {
  operation: "copy" | "rename-commit" | "unlink" | "write";
  occurrence: number;
  timing: "after" | "before";
}

class FakeFileOperations implements RepositoryFileTransactionOperations {
  readonly files = new Map<string, string>();
  readonly mutationCalls: string[] = [];
  failure?: InjectedFailure;
  corruptAfterCommit = false;
  raceAfterBackupValidation = false;
  lockHeld = false;
  private readonly occurrences = new Map<string, number>();
  private commitCount = 0;
  private backupReadCount = 0;

  constructor() {
    for (const [index, path] of PATHS.entries()) {
      this.files.set(posix.join(ROOT, path), `original-${index + 1}\n`);
    }
  }

  async acquireExclusiveLock(path: string, owner: string): Promise<void> {
    if (this.lockHeld || this.files.has(path)) throw exists(path);
    this.lockHeld = true;
    this.files.set(path, owner);
    this.mutationCalls.push(`lock:${path}`);
  }

  async assertTransactionPath(_path: string): Promise<void> {}

  async bindTransactionPaths(_paths: readonly string[]): Promise<void> {}

  async copyFileExclusive(source: string, destination: string): Promise<void> {
    const occurrence = this.next("copy");
    this.maybeFail("copy", occurrence, "before");
    const contents = this.files.get(source);
    if (contents === undefined) throw missing(source);
    if (this.files.has(destination)) throw exists(destination);
    this.files.set(destination, contents);
    this.mutationCalls.push(`copy:${destination}`);
    this.maybeFail("copy", occurrence, "after");
  }

  async inspect(path: string): Promise<RepositoryFileInspection> {
    if (!this.files.has(path)) throw missing(path);
    return {
      device: "fake-device",
      inode: path,
      isFile: true,
      isSymbolicLink: false,
    };
  }

  async readFile(path: string): Promise<string> {
    const contents = this.files.get(path);
    if (contents === undefined) throw missing(path);
    if (path.endsWith(".bak")) {
      this.backupReadCount += 1;
      if (
        this.raceAfterBackupValidation &&
        this.backupReadCount === PATHS.length
      ) {
        this.files.set(
          posix.join(ROOT, PATHS[0]!),
          "concurrent-after-backup-validation\n",
        );
      }
    }
    return contents;
  }

  async realpath(path: string): Promise<string> {
    if (path === ROOT || this.files.has(path)) return path;
    throw missing(path);
  }

  async rename(source: string, destination: string): Promise<void> {
    const isCommit = source.endsWith(".tmp");
    const operation = isCommit ? "rename-commit" : "rename-rollback";
    const occurrence = this.next(operation);
    if (isCommit) this.maybeFail("rename-commit", occurrence, "before");
    const contents = this.files.get(source);
    if (contents === undefined) throw missing(source);
    this.files.delete(source);
    this.files.set(destination, contents);
    this.mutationCalls.push(`rename:${source}:${destination}`);
    if (isCommit) {
      this.commitCount += 1;
      if (this.corruptAfterCommit && this.commitCount === PATHS.length) {
        this.files.set(destination, "corrupt\n");
      }
      this.maybeFail("rename-commit", occurrence, "after");
    }
  }

  async releaseExclusiveLock(path: string): Promise<void> {
    if (!this.lockHeld || !this.files.delete(path)) throw missing(path);
    this.lockHeld = false;
    this.mutationCalls.push(`unlock:${path}`);
  }

  async releaseTransactionPaths(): Promise<void> {}

  async unlink(path: string): Promise<void> {
    const occurrence = this.next("unlink");
    this.maybeFail("unlink", occurrence, "before");
    if (!this.files.delete(path)) throw missing(path);
    this.mutationCalls.push(`unlink:${path}`);
    this.maybeFail("unlink", occurrence, "after");
  }

  async writeFileExclusive(path: string, contents: string): Promise<void> {
    const occurrence = this.next("write");
    this.maybeFail("write", occurrence, "before");
    if (this.files.has(path)) throw exists(path);
    this.files.set(path, contents);
    this.mutationCalls.push(`write:${path}`);
    this.maybeFail("write", occurrence, "after");
  }

  private maybeFail(
    operation: InjectedFailure["operation"],
    occurrence: number,
    timing: InjectedFailure["timing"],
  ): void {
    if (
      this.failure?.operation === operation &&
      this.failure.occurrence === occurrence &&
      this.failure.timing === timing
    ) {
      throw new Error(`forced ${operation} ${occurrence} ${timing}`);
    }
  }

  private next(operation: string): number {
    const occurrence = (this.occurrences.get(operation) ?? 0) + 1;
    this.occurrences.set(operation, occurrence);
    return occurrence;
  }
}

function missing(path: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`missing ${path}`), { code: "ENOENT" });
}

function exists(path: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`exists ${path}`), { code: "EEXIST" });
}

function proposals() {
  return PATHS.map((repositoryPath, index) => ({
    id: `document-${index + 1}`,
    repositoryPath,
    contents: `replacement-${index + 1}\n`,
  }));
}

async function planWith(
  operations: FakeFileOperations,
): Promise<RepositoryFileTransactionPlan> {
  return previewRepositoryFileTransaction({
    repoRoot: ROOT,
    replacements: proposals(),
    fileOperations: operations,
  });
}

async function interruptedState(
  operations: FakeFileOperations,
  committedCount: number,
  includeJournal = true,
): Promise<{ plan: RepositoryFileTransactionPlan; transactionId: string }> {
  const plan = await planWith(operations);
  const transactionId = "interrupted";
  const recoveryRecord = `${JSON.stringify(
    { schemaVersion: 1, transactionId, plan },
    null,
    2,
  )}\n`;
  operations.lockHeld = true;
  operations.files.set(
    posix.join(ROOT, ARCHITECTURE_WRITE_LOCK_PATH),
    recoveryRecord,
  );
  if (includeJournal) {
    operations.files.set(
      posix.join(
        ROOT,
        `${ARCHITECTURE_WRITE_JOURNAL_PREFIX}${transactionId}.journal.json`,
      ),
      recoveryRecord,
    );
  }
  for (const [index, replacement] of plan.replacements.entries()) {
    const staged = `${replacement.destination}.architecture-transaction-${transactionId}.tmp`;
    const backup = `${replacement.destination}.architecture-transaction-${transactionId}.bak`;
    operations.files.set(staged, replacement.contents);
    operations.files.set(backup, `original-${index + 1}\n`);
    if (index < committedCount) {
      operations.files.delete(staged);
      operations.files.set(replacement.destination, replacement.contents);
    }
  }
  return { plan, transactionId };
}

function expectOriginals(operations: FakeFileOperations): void {
  for (const [index, path] of PATHS.entries()) {
    expect(operations.files.get(posix.join(ROOT, path))).toBe(
      `original-${index + 1}\n`,
    );
  }
}

function expectNoArtifacts(operations: FakeFileOperations): void {
  expect(
    [...operations.files.keys()].filter((path) =>
      /architecture-(?:transaction|enforcement-write-)/.test(path),
    ),
  ).toEqual([]);
  expect(operations.lockHeld).toBe(false);
}

describe("repository policy update transaction", () => {
  it("creates a deterministic read-only preview with before and after hashes", async () => {
    const operations = new FakeFileOperations();

    const first = await planWith(operations);
    const second = await planWith(operations);

    expect(first).toEqual(second);
    expect(first.planHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.replacements).toHaveLength(3);
    expect(first.replacements[0]?.beforeHash).not.toBe(
      first.replacements[0]?.afterHash,
    );
    expect(operations.mutationCalls).toEqual([]);
  });

  it("requires acknowledgement and the exact preview hash", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);

    const notAcknowledged = await applyRepositoryFileTransaction({
      plan,
      acknowledge: false,
      expectedPlanHash: plan.planHash,
      fileOperations: operations,
      transactionId: "test",
    });
    expect(notAcknowledged.state).toBe("not-acknowledged");
    await expect(
      applyRepositoryFileTransaction({
        plan,
        acknowledge: true,
        expectedPlanHash: "0".repeat(64),
        fileOperations: operations,
        transactionId: "test",
      }),
    ).rejects.toThrow(/plan hash/i);
    expect(operations.mutationCalls).toEqual([]);
  });

  it("fails closed when an original changes after preview", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);
    operations.files.set(posix.join(ROOT, PATHS[1]!), "changed\n");

    const error = await applyRepositoryFileTransaction({
      plan,
      acknowledge: true,
      expectedPlanHash: plan.planHash,
      fileOperations: operations,
      transactionId: "test",
    }).catch((caught: unknown) => caught);
    expect(error).toHaveProperty(
      "message",
      expect.stringMatching(/raced after (?:preview|recovery capture)/i),
    );
    expect(
      operations.mutationCalls.filter((call) =>
        /^(?:copy|rename|write):/.test(call),
      ),
    ).toEqual([]);
  });

  it("preserves a destination raced after backup validation", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);
    operations.raceAfterBackupValidation = true;

    await expect(
      applyRepositoryFileTransaction({
        plan,
        acknowledge: true,
        expectedPlanHash: plan.planHash,
        fileOperations: operations,
        transactionId: "race",
      }),
    ).rejects.toBeInstanceOf(RepositoryFileTransactionFailure);

    expect(operations.files.get(posix.join(ROOT, PATHS[0]!))).toBe(
      "concurrent-after-backup-validation\n",
    );
    for (const [index, path] of PATHS.slice(1).entries()) {
      expect(operations.files.get(posix.join(ROOT, path))).toBe(
        `original-${index + 2}\n`,
      );
    }
    expectNoArtifacts(operations);
  });

  it("fails before staging when another supported writer holds the lock", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);
    operations.lockHeld = true;

    await expect(
      applyRepositoryFileTransaction({
        plan,
        acknowledge: true,
        expectedPlanHash: plan.planHash,
        fileOperations: operations,
        transactionId: "locked",
      }),
    ).rejects.toMatchObject({ code: "EEXIST" });
    expect(
      operations.mutationCalls.filter((call) =>
        /^(?:copy|rename|write):/.test(call),
      ),
    ).toEqual([]);
  });

  it("recovers exact originals from a mixed interrupted commit", async () => {
    const operations = new FakeFileOperations();
    const { plan, transactionId } = await interruptedState(operations, 1);

    const outcome = await recoverRepositoryFileTransaction({
      repoRoot: ROOT,
      transactionId,
      acknowledge: true,
      fileOperations: operations,
    });

    expect(outcome).toEqual({
      state: "recovered-originals",
      planHash: plan.planHash,
    });
    expectOriginals(operations);
    expectNoArtifacts(operations);
  });

  it("finalizes an all-new interrupted commit without retrying writes", async () => {
    const operations = new FakeFileOperations();
    const { plan, transactionId } = await interruptedState(
      operations,
      PATHS.length,
    );

    const outcome = await recoverRepositoryFileTransaction({
      repoRoot: ROOT,
      transactionId,
      acknowledge: true,
      fileOperations: operations,
      validate: (_replacement, contents) => {
        expect(contents).toMatch(/^replacement-/);
      },
    });

    expect(outcome).toEqual({
      state: "finalized-committed",
      planHash: plan.planHash,
    });
    for (const [index, path] of PATHS.entries()) {
      expect(operations.files.get(posix.join(ROOT, path))).toBe(
        `replacement-${index + 1}\n`,
      );
    }
    expectNoArtifacts(operations);
  });

  it("recovers from the durable lock record when the journal is absent", async () => {
    const operations = new FakeFileOperations();
    const { plan, transactionId } = await interruptedState(
      operations,
      0,
      false,
    );

    await expect(
      recoverRepositoryFileTransaction({
        repoRoot: ROOT,
        transactionId,
        acknowledge: true,
        fileOperations: operations,
      }),
    ).resolves.toEqual({
      state: "recovered-originals",
      planHash: plan.planHash,
    });
    expectOriginals(operations);
    expectNoArtifacts(operations);
  });

  it("retains the lock and artifacts when crash recovery bytes are corrupt", async () => {
    const operations = new FakeFileOperations();
    const { transactionId } = await interruptedState(operations, 1);
    operations.files.set(
      `${posix.join(ROOT, PATHS[0]!)}.architecture-transaction-${transactionId}.bak`,
      "corrupt-backup\n",
    );

    await expect(
      recoverRepositoryFileTransaction({
        repoRoot: ROOT,
        transactionId,
        acknowledge: true,
        fileOperations: operations,
      }),
    ).rejects.toThrow(/raced after preview/i);
    expect(operations.lockHeld).toBe(true);
    expect(
      [...operations.files.keys()].some((path) => path.endsWith(".bak")),
    ).toBe(true);
  });

  it("detects a destination race in recovery bytes before the first commit", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);
    const originalRead = operations.readFile.bind(operations);
    let destinationReads = 0;
    operations.readFile = async (path) => {
      const contents = await originalRead(path);
      if (!path.includes("architecture-transaction")) {
        destinationReads += 1;
        if (destinationReads === PATHS.length) {
          operations.files.set(posix.join(ROOT, PATHS[0]!), "raced\n");
        }
      }
      return contents;
    };

    const error = await applyRepositoryFileTransaction({
      plan,
      acknowledge: true,
      expectedPlanHash: plan.planHash,
      fileOperations: operations,
      transactionId: "race",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RepositoryFileTransactionFailure);
    expect(
      (error as RepositoryFileTransactionFailure).primaryError,
    ).toHaveProperty(
      "message",
      expect.stringMatching(/raced after (?:preview|recovery capture)/i),
    );
    expect(
      operations.mutationCalls.some((call) => call.startsWith("rename:")),
    ).toBe(false);
    expect(operations.files.get(posix.join(ROOT, PATHS[0]!))).toBe("raced\n");
    expectNoArtifacts(operations);
  });

  for (const operation of ["write", "copy", "rename-commit"] as const) {
    const occurrences = operation === "write" ? [1, 2, 3, 4] : [1, 2, 3];
    for (const occurrence of occurrences) {
      for (const timing of ["before", "after"] as const) {
        it(`restores originals after ${operation} ${occurrence} ${timing}`, async () => {
          const operations = new FakeFileOperations();
          const plan = await planWith(operations);
          operations.failure = { operation, occurrence, timing };

          await expect(
            applyRepositoryFileTransaction({
              plan,
              acknowledge: true,
              expectedPlanHash: plan.planHash,
              fileOperations: operations,
              transactionId: "test",
            }),
          ).rejects.toBeInstanceOf(RepositoryFileTransactionFailure);
          expectOriginals(operations);
          expectNoArtifacts(operations);
        });
      }
    }
  }

  it("rolls back all originals when post-write readback is corrupt", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);
    operations.corruptAfterCommit = true;

    await expect(
      applyRepositoryFileTransaction({
        plan,
        acknowledge: true,
        expectedPlanHash: plan.planHash,
        fileOperations: operations,
        transactionId: "test",
      }),
    ).rejects.toBeInstanceOf(RepositoryFileTransactionFailure);
    expectOriginals(operations);
    expectNoArtifacts(operations);
  });

  it("rolls back all originals when the post-write validator rejects bytes", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);

    await expect(
      applyRepositoryFileTransaction({
        plan,
        acknowledge: true,
        expectedPlanHash: plan.planHash,
        fileOperations: operations,
        transactionId: "test",
        validate: (replacement) => {
          if (replacement.id === "document-2") {
            throw new Error("forced parser rejection");
          }
        },
      }),
    ).rejects.toBeInstanceOf(RepositoryFileTransactionFailure);
    expectOriginals(operations);
    expectNoArtifacts(operations);
  });

  it("aggregates cleanup errors without masking the primary failure", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);
    operations.failure = {
      operation: "rename-commit",
      occurrence: 2,
      timing: "before",
    };
    const originalUnlink = operations.unlink.bind(operations);
    let failedCleanup = false;
    operations.unlink = async (path) => {
      if (!failedCleanup) {
        failedCleanup = true;
        throw new Error("forced cleanup failure");
      }
      await originalUnlink(path);
    };

    const error = await applyRepositoryFileTransaction({
      plan,
      acknowledge: true,
      expectedPlanHash: plan.planHash,
      fileOperations: operations,
      transactionId: "test",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RepositoryFileTransactionFailure);
    expect(
      (error as RepositoryFileTransactionFailure).primaryError,
    ).toHaveProperty("message", "forced rename-commit 2 before");
    expect(
      (error as RepositoryFileTransactionFailure).cleanupErrors,
    ).toHaveLength(1);
    expectOriginals(operations);
  });

  it("rolls back every backup in reverse order", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);
    operations.failure = {
      operation: "rename-commit",
      occurrence: 2,
      timing: "before",
    };

    await expect(
      applyRepositoryFileTransaction({
        plan,
        acknowledge: true,
        expectedPlanHash: plan.planHash,
        fileOperations: operations,
        transactionId: "test",
      }),
    ).rejects.toBeInstanceOf(RepositoryFileTransactionFailure);

    const rollbackSources = operations.mutationCalls
      .filter((call) => call.startsWith("rename:") && call.includes(".bak:"))
      .map((call) => call.split(":")[1]);
    expect(rollbackSources).toEqual(
      [...PATHS]
        .reverse()
        .map(
          (path) =>
            `${posix.join(ROOT, path)}.architecture-transaction-test.bak`,
        ),
    );
  });

  it("retains recovery backups when rollback cannot restore original bytes", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);
    operations.failure = {
      operation: "rename-commit",
      occurrence: 2,
      timing: "before",
    };
    const originalRename = operations.rename.bind(operations);
    let rollbackCount = 0;
    operations.rename = async (source, destination) => {
      if (source.endsWith(".bak")) {
        rollbackCount += 1;
        if (rollbackCount === 3) {
          throw new Error("forced rollback failure");
        }
      }
      await originalRename(source, destination);
    };

    const error = await applyRepositoryFileTransaction({
      plan,
      acknowledge: true,
      expectedPlanHash: plan.planHash,
      fileOperations: operations,
      transactionId: "test",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RepositoryFileTransactionFailure);
    expect(
      (error as RepositoryFileTransactionFailure).rollbackErrors,
    ).toHaveLength(1);
    expect(
      (error as RepositoryFileTransactionFailure).verificationErrors.length,
    ).toBeGreaterThan(0);
    expect(
      [...operations.files.keys()].some((path) => path.endsWith(".bak")),
    ).toBe(true);
  });

  it("returns an explicit committed outcome when only cleanup is incomplete", async () => {
    const operations = new FakeFileOperations();
    const plan = await planWith(operations);
    operations.failure = {
      operation: "unlink",
      occurrence: 4,
      timing: "before",
    };

    const result = await applyRepositoryFileTransaction({
      plan,
      acknowledge: true,
      expectedPlanHash: plan.planHash,
      fileOperations: operations,
      transactionId: "test",
      validate: (_replacement, contents) => {
        expect(contents).toMatch(/^replacement-/);
      },
    });

    expect(result.state).toBe("committed-cleanup-incomplete");
    if (result.state === "committed-cleanup-incomplete") {
      expect(result.cleanupErrors).toHaveLength(1);
    }
    for (const [index, path] of PATHS.entries()) {
      expect(operations.files.get(posix.join(ROOT, path))).toBe(
        `replacement-${index + 1}\n`,
      );
    }
  });

  it("commits an ordered four-document plan", async () => {
    const operations = new FakeFileOperations();
    const fourthPath = "config/manifest.json";
    operations.files.set(posix.join(ROOT, fourthPath), "original-4\n");
    const plan = await previewRepositoryFileTransaction({
      repoRoot: ROOT,
      replacements: [
        ...proposals(),
        {
          id: "document-4",
          repositoryPath: fourthPath,
          contents: "replacement-4\n",
        },
      ],
      fileOperations: operations,
    });

    const result = await applyRepositoryFileTransaction({
      plan,
      acknowledge: true,
      expectedPlanHash: plan.planHash,
      fileOperations: operations,
      transactionId: "test",
    });

    expect(result.state).toBe("committed");
    expect(operations.files.get(posix.join(ROOT, fourthPath))).toBe(
      "replacement-4\n",
    );
    expectNoArtifacts(operations);
  });

  it("rejects duplicate, escaping, and symlink destinations during preview", async () => {
    const duplicateOperations = new FakeFileOperations();
    await expect(
      previewRepositoryFileTransaction({
        repoRoot: ROOT,
        replacements: [proposals()[0]!, proposals()[0]!, proposals()[2]!],
        fileOperations: duplicateOperations,
      }),
    ).rejects.toThrow(/distinct/i);

    await expect(
      previewRepositoryFileTransaction({
        repoRoot: ROOT,
        replacements: [
          { ...proposals()[0]!, repositoryPath: "../policy.json" },
          proposals()[1]!,
          proposals()[2]!,
        ],
        fileOperations: new FakeFileOperations(),
      }),
    ).rejects.toThrow(/repository-relative/i);

    const symlinkOperations = new FakeFileOperations();
    symlinkOperations.inspect = async () => ({
      device: "fake-device",
      inode: "symlink",
      isFile: false,
      isSymbolicLink: true,
    });
    await expect(planWith(symlinkOperations)).rejects.toThrow(/symbolic link/i);

    const redirectedOperations = new FakeFileOperations();
    const originalRealpath =
      redirectedOperations.realpath.bind(redirectedOperations);
    redirectedOperations.realpath = async (path) =>
      path === posix.join(ROOT, PATHS[0]!)
        ? "/outside/policy.json"
        : originalRealpath(path);
    await expect(planWith(redirectedOperations)).rejects.toThrow(
      /resolves outside repository root/i,
    );
  });
});
