import { createHash } from "node:crypto";
import {
  constants as fsConstants,
  copyFile,
  link,
  lstat,
  open,
  readFile,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import { basename, dirname } from "node:path";
import type { RepositoryFileTransactionOperations } from "./policy-update-transaction.js";

/**
 * Creates the production Node filesystem adapter for repository transactions.
 * @returns Exclusive, UTF-8 file operations used by preview and acknowledged writes.
 */
export function createNodeRepositoryFileTransactionOperations(): RepositoryFileTransactionOperations {
  const directoryHandles = new Map<string, Awaited<ReturnType<typeof open>>>();
  const translated = (path: string): string => {
    const handle = directoryHandles.get(dirname(path));
    return handle ? `/proc/self/fd/${handle.fd}/${basename(path)}` : path;
  };
  const syncDirectory = async (path: string): Promise<void> => {
    const handle = await open(dirname(translated(path)), fsConstants.O_RDONLY);
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  };
  const writeDurableExclusive = async (
    path: string,
    contents: string,
  ): Promise<void> => {
    const target = translated(path);
    const handle = await open(target, "wx", 0o600);
    try {
      await handle.writeFile(contents, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await syncDirectory(path);
  };
  const unlinkDurable = async (path: string): Promise<void> => {
    await unlink(translated(path));
    await syncDirectory(path);
  };
  const lockCandidatePath = (path: string, recoveryRecord: string): string =>
    `${path}.${createHash("sha256").update(recoveryRecord).digest("hex")}.candidate`;
  const isMissingPath = (error: unknown): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT";
  return {
    acquireExclusiveLock: async (path, recoveryRecord) => {
      const candidate = lockCandidatePath(path, recoveryRecord);
      await writeDurableExclusive(candidate, recoveryRecord);
      let linked = false;
      try {
        await link(translated(candidate), translated(path));
        linked = true;
        await syncDirectory(path);
        await unlinkDurable(candidate);
      } catch (error) {
        if (!linked) await unlinkDurable(candidate).catch(() => {});
        throw error;
      }
    },
    assertTransactionPath: async (path) => {
      const directory = dirname(path);
      const handle = directoryHandles.get(directory);
      if (!handle) throw new Error(`Transaction path is not bound: ${path}`);
      const [current, bound] = await Promise.all([
        lstat(directory),
        handle.stat(),
      ]);
      if (
        current.isSymbolicLink() ||
        !current.isDirectory() ||
        current.dev !== bound.dev ||
        current.ino !== bound.ino
      ) {
        throw new Error(`Transaction parent directory changed: ${directory}`);
      }
    },
    bindTransactionPaths: async (paths) => {
      if (directoryHandles.size > 0) {
        throw new Error("Transaction paths are already bound");
      }
      try {
        for (const directory of new Set(paths.map((path) => dirname(path)))) {
          const handle = await open(
            directory,
            fsConstants.O_RDONLY |
              fsConstants.O_DIRECTORY |
              fsConstants.O_NOFOLLOW,
          );
          directoryHandles.set(directory, handle);
        }
      } catch (error) {
        await Promise.allSettled(
          [...directoryHandles.values()].map((handle) => handle.close()),
        );
        directoryHandles.clear();
        throw error;
      }
    },
    copyFileExclusive: async (source, destination) => {
      await copyFile(
        translated(source),
        translated(destination),
        fsConstants.COPYFILE_EXCL,
      );
      const handle = await open(translated(destination), fsConstants.O_RDONLY);
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
      await syncDirectory(destination);
    },
    inspect: async (path) => {
      const stats = await lstat(translated(path));
      return {
        device: String(stats.dev),
        inode: String(stats.ino),
        isFile: stats.isFile(),
        isSymbolicLink: stats.isSymbolicLink(),
      };
    },
    readFile: async (path) => readFile(translated(path), "utf8"),
    realpath: async (path) => realpath(translated(path)),
    rename: async (source, destination) => {
      await rename(translated(source), translated(destination));
      await syncDirectory(source);
      if (dirname(source) !== dirname(destination)) {
        await syncDirectory(destination);
      }
    },
    releaseExclusiveLock: async (path) => {
      const recoveryRecord = await readFile(translated(path), "utf8");
      const candidate = lockCandidatePath(path, recoveryRecord);
      try {
        await unlinkDurable(candidate);
      } catch (error) {
        if (!isMissingPath(error)) throw error;
      }
      await unlinkDurable(path);
    },
    releaseTransactionPaths: async () => {
      const results = await Promise.allSettled(
        [...directoryHandles.values()].map((handle) => handle.close()),
      );
      directoryHandles.clear();
      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          "Failed to close transaction directory handles",
        );
      }
    },
    unlink: unlinkDurable,
    writeFileExclusive: writeDurableExclusive,
  };
}
