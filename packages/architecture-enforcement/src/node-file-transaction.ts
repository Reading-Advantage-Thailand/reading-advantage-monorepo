import {
  constants as fsConstants,
  copyFile,
  lstat,
  readFile,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import type { RepositoryFileTransactionOperations } from "./policy-update-transaction.js";

/**
 * Creates the production Node filesystem adapter for repository transactions.
 * @returns Exclusive, UTF-8 file operations used by preview and acknowledged writes.
 */
export function createNodeRepositoryFileTransactionOperations(): RepositoryFileTransactionOperations {
  return {
    copyFileExclusive: async (source, destination) => {
      await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
    },
    inspect: async (path) => {
      const stats = await lstat(path);
      return {
        isFile: stats.isFile(),
        isSymbolicLink: stats.isSymbolicLink(),
      };
    },
    readFile: async (path) => readFile(path, "utf8"),
    realpath,
    rename,
    unlink,
    writeFileExclusive: async (path, contents) => {
      await writeFile(path, contents, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
    },
  };
}
