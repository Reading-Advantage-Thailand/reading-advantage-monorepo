import { db } from "@reading-advantage/db";
import { workbooks } from "@reading-advantage/domain";

/**
 * Runs a workbook write path inside a single database transaction.
 *
 * The domain repository port has no transaction boundary of its own, so the
 * callback receives a repository built on the transaction handle. Every write
 * made through that repository commits or rolls back as one unit; a throw
 * inside the callback aborts the transaction and rolls back all writes.
 * @param fn Callback receiving a transaction-bound repository.
 * @returns Whatever the callback returns.
 */
export async function runInWorkbookTransaction<T>(
  fn: (repository: workbooks.WorkbookEditionRepositoryPort) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) =>
    fn(
      workbooks.createDrizzleEditionRepository(
        tx as unknown as workbooks.WorkbookDrizzleDatabase,
      ),
    ),
  );
}
