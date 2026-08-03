import { db } from "@reading-advantage/db";
import { workbooks } from "@reading-advantage/domain";

/**
 * Builds the durable workbook repository backed by Postgres.
 *
 * The domain defines the port; this binding supplies the concrete Drizzle handle,
 * so no provider detail leaks into the domain layer. Schema is created by
 * migration 0048_workbook_publishing.
 * @returns A repository writing drafts, editions and audit events to Postgres.
 */
export function getWorkbookRepository(): workbooks.WorkbookEditionRepositoryPort {
  return workbooks.createDrizzleEditionRepository(
    db as unknown as workbooks.WorkbookDrizzleDatabase,
  );
}
