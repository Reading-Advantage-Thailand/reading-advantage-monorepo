import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  discoverRecoveryRepositoryRoot,
  mainRepositoryTransactionRecoveryCli,
  parseRepositoryTransactionRecoveryArguments,
  runRepositoryTransactionRecoveryCli,
  type RepositoryTransactionRecoveryCliDependencies,
} from "../repository-transaction-recovery-cli.js";
import type { RepositoryFileTransactionOperations } from "../policy-update-transaction.js";

describe("repository transaction recovery CLI", () => {
  it("requires explicit acknowledgement and an exact transaction id", () => {
    expect(() =>
      parseRepositoryTransactionRecoveryArguments(
        [],
        "/workspace",
        () => "/repo",
      ),
    ).toThrow(/requires --acknowledge and --transaction-id/i);
    expect(() =>
      parseRepositoryTransactionRecoveryArguments(
        ["--acknowledge"],
        "/workspace",
        () => "/repo",
      ),
    ).toThrow(/requires --acknowledge and --transaction-id/i);
  });

  it("discovers the repository or honors an explicit root", () => {
    const discover = vi.fn(() => "/discovered");
    expect(
      parseRepositoryTransactionRecoveryArguments(
        ["--acknowledge", "--transaction-id", "crash-1"],
        "/workspace",
        discover,
      ),
    ).toEqual({
      acknowledge: true,
      transactionId: "crash-1",
      repoRoot: "/discovered",
    });
    expect(discover).toHaveBeenCalledWith("/workspace");
    expect(
      parseRepositoryTransactionRecoveryArguments(
        [
          "--acknowledge",
          "--transaction-id",
          "crash-2",
          "--repo-root",
          "/explicit",
        ],
        "/workspace",
        discover,
      ).repoRoot,
    ).toBe("/explicit");
    expect(discoverRecoveryRepositoryRoot(process.cwd())).toBe(
      process.cwd().replace(/\/packages\/architecture-enforcement$/, ""),
    );
  });

  it("rejects unsupported and incomplete options", () => {
    expect(() =>
      parseRepositoryTransactionRecoveryArguments(
        ["--acknowledge", "--transaction-id", "id", "--force"],
        "/workspace",
      ),
    ).toThrow(/unsupported/i);
    expect(() =>
      parseRepositoryTransactionRecoveryArguments(
        ["--acknowledge", "--transaction-id"],
        "/workspace",
      ),
    ).toThrow(/requires a value/i);
  });

  it("runs recovery with semantic validation and emits JSON", async () => {
    const writeOutput = vi.fn();
    const fileOperations = { boundary: "fake" };
    const recover = vi.fn<
      RepositoryTransactionRecoveryCliDependencies["recover"]
    >(async (options) => {
      await options.validate?.(
        { id: "ownership-map" } as Parameters<
          NonNullable<typeof options.validate>
        >[0],
        await readFile(
          new URL("../config/ownership-map.v1.json", import.meta.url),
          "utf8",
        ),
      );
      await options.validate?.(
        { id: "database-baseline" } as Parameters<
          NonNullable<typeof options.validate>
        >[0],
        JSON.stringify({
          schemaVersion: 1,
          domain: "database",
          rulesetHash: "0".repeat(64),
          entries: [],
        }),
      );
      return {
        state: "recovered-originals" as const,
        planHash: "plan-hash",
      };
    });

    await expect(
      runRepositoryTransactionRecoveryCli(
        [
          "--acknowledge",
          "--transaction-id",
          "crash-1",
          "--repo-root",
          "/repo",
        ],
        "/workspace",
        writeOutput,
        {
          createFileOperations: () =>
            fileOperations as unknown as RepositoryFileTransactionOperations,
          recover,
        },
      ),
    ).resolves.toBe(0);
    expect(recover).toHaveBeenCalledWith(
      expect.objectContaining({
        acknowledge: true,
        repoRoot: "/repo",
        transactionId: "crash-1",
        fileOperations,
        validate: expect.any(Function),
      }),
    );
    expect(writeOutput).toHaveBeenCalledWith(
      expect.stringContaining('"state": "recovered-originals"'),
    );

    const stdout = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    await runRepositoryTransactionRecoveryCli(
      ["--acknowledge", "--transaction-id", "crash-1", "--repo-root", "/repo"],
      "/workspace",
      undefined,
      {
        createFileOperations: () =>
          fileOperations as unknown as RepositoryFileTransactionOperations,
        recover,
      },
    );
    expect(stdout).toHaveBeenCalledWith(
      expect.stringContaining('"planHash": "plan-hash"'),
    );
    stdout.mockRestore();
  });

  it("rejects a recovered baseline assigned to the wrong domain", async () => {
    const recover = vi.fn<
      RepositoryTransactionRecoveryCliDependencies["recover"]
    >(async (options) => {
      await options.validate?.(
        { id: "provider-baseline" } as Parameters<
          NonNullable<typeof options.validate>
        >[0],
        JSON.stringify({
          schemaVersion: 1,
          domain: "database",
          rulesetHash: "0".repeat(64),
          entries: [],
        }),
      );
      return { state: "recovered-originals", planHash: "unreachable" };
    });

    await expect(
      runRepositoryTransactionRecoveryCli(
        [
          "--acknowledge",
          "--transaction-id",
          "crash-2",
          "--repo-root",
          "/repo",
        ],
        "/workspace",
        vi.fn(),
        {
          createFileOperations: () =>
            ({}) as RepositoryFileTransactionOperations,
          recover,
        },
      ),
    ).rejects.toThrow(/wrong domain/i);
  });

  it("maps runner success and failure to stable process results", async () => {
    const writeError = vi.fn();
    const succeed = vi.fn(async () => 0 as const);
    await expect(
      mainRepositoryTransactionRecoveryCli([], "/repo", succeed, writeError),
    ).resolves.toBe(0);

    const fail = vi.fn(async () => {
      throw "broken recovery";
    });
    await expect(
      mainRepositoryTransactionRecoveryCli([], "/repo", fail, writeError),
    ).resolves.toBe(2);
    expect(writeError).toHaveBeenCalledWith(
      "Architecture transaction recovery failed: broken recovery\n",
    );

    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    await expect(
      mainRepositoryTransactionRecoveryCli([], "/repo", fail),
    ).resolves.toBe(2);
    expect(stderr).toHaveBeenCalledWith(
      "Architecture transaction recovery failed: broken recovery\n",
    );
    stderr.mockRestore();
  });
});
