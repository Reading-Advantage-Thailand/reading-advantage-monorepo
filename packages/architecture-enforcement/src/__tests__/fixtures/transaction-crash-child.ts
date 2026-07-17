import { createNodeRepositoryFileTransactionOperations } from "../../node-file-transaction.js";
import {
  applyRepositoryFileTransaction,
  previewRepositoryFileTransaction,
} from "../../policy-update-transaction.js";

const repoRoot = process.argv[2];
const operation = process.argv[3];
const boundary = Number(process.argv[4]);
if (
  !repoRoot ||
  !["copy", "journal-cleanup", "lock", "rename", "write"].includes(
    operation ?? "",
  ) ||
  !Number.isInteger(boundary) ||
  boundary < 1
) {
  throw new Error("Crash child requires a root, operation, and boundary");
}
const baseOperations = createNodeRepositoryFileTransactionOperations();
let occurrences = 0;
const killAtBoundary = (): void => {
  occurrences += 1;
  if (occurrences === boundary) process.kill(process.pid, "SIGKILL");
};
const fileOperations = {
  ...baseOperations,
  acquireExclusiveLock: async (path: string, recoveryRecord: string) => {
    await baseOperations.acquireExclusiveLock(path, recoveryRecord);
    if (operation === "lock") killAtBoundary();
  },
  copyFileExclusive: async (source: string, destination: string) => {
    await baseOperations.copyFileExclusive(source, destination);
    if (operation === "copy" && destination.endsWith(".bak")) killAtBoundary();
  },
  rename: async (source: string, destination: string) => {
    await baseOperations.rename(source, destination);
    if (operation === "rename" && source.endsWith(".tmp")) killAtBoundary();
  },
  unlink: async (path: string) => {
    await baseOperations.unlink(path);
    if (operation === "journal-cleanup" && path.endsWith(".journal.json")) {
      killAtBoundary();
    }
  },
  writeFileExclusive: async (path: string, contents: string) => {
    await baseOperations.writeFileExclusive(path, contents);
    if (operation === "write" && path.endsWith(".tmp")) killAtBoundary();
  },
};
const replacements = ["policy", "database", "provider"].map((id, index) => ({
  id,
  repositoryPath: `config/${id}.json`,
  contents: `replacement-${index + 1}\n`,
}));
const plan = await previewRepositoryFileTransaction({
  repoRoot,
  replacements,
  fileOperations,
});
await applyRepositoryFileTransaction({
  plan,
  acknowledge: true,
  expectedPlanHash: plan.planHash,
  fileOperations,
  transactionId: `crash-${operation}-${boundary}`,
});
