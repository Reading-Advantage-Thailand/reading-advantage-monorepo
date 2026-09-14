import { z } from "zod";

/**
 * Per-upload summary returned by the CSV import route.
 *
 * - `inserted` counts the rows written to the database.
 * - `skippedDuplicate` counts the rows dropped because an earlier row in the same file used the same email.
 * - `skippedExisting` counts the rows dropped because the email already exists in the database.
 */
export const CsvUploadSummary = z.object({
  inserted: z.number().int().nonnegative(),
  skippedDuplicate: z.number().int().nonnegative(),
  skippedExisting: z.number().int().nonnegative(),
});
