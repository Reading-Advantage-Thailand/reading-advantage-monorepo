import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { buildPostgresOptions, normalizePostgresConnectionString } from "./connection-options.js";
import type { DB } from "./client.js";

/**
 * Creates a privileged database connection using DIRECT_DATABASE_URL.
 * Falls back to DATABASE_URL with a warning when DIRECT_DATABASE_URL is unset.
 *
 * @returns An object with the drizzle DB instance and the raw postgres client (for cleanup)
 * @throws When neither DIRECT_DATABASE_URL nor DATABASE_URL is set
 */
export function createPrivilegedDb(): { db: DB; client: postgres.Sql } {
  const directUrl = process.env.DIRECT_DATABASE_URL;
  const DATABASE_URL = process.env.DATABASE_URL;
  const url = directUrl ?? DATABASE_URL;

  if (!url) {
    throw new Error(
      "createPrivilegedDb requires DIRECT_DATABASE_URL or DATABASE_URL"
    );
  }

  if (!directUrl && DATABASE_URL) {
    console.warn(
      "DIRECT_DATABASE_URL is not set \u2014 falling back to DATABASE_URL for privileged DB."
    );
  }

  const client = postgres(
    normalizePostgresConnectionString(url),
    { ...buildPostgresOptions(url), max: 1 }
  );

  const db = drizzle(client) as DB;
  return { db, client };
}
