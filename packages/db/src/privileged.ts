import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { buildPostgresOptions, normalizePostgresConnectionString } from "./connection-options.js";
import type { DB } from "./client.js";

/**
 * Creates a privileged database connection using DIRECT_DATABASE_URL.
 * This is required for operations the app role cannot perform
 * (e.g., DELETE on append-only tables like audit_events).
 *
 * The caller is responsible for closing the returned client.
 *
 * @returns An object with the drizzle DB instance and the raw postgres client (for cleanup)
 * @throws When neither DIRECT_DATABASE_URL nor DATABASE_URL is set
 */
export function createPrivilegedDb(): { db: DB; client: postgres.Sql } {
  const directUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!directUrl) {
    throw new Error(
      "createPrivilegedDb requires DIRECT_DATABASE_URL or DATABASE_URL"
    );
  }

  const client = postgres(
    normalizePostgresConnectionString(directUrl),
    { ...buildPostgresOptions(directUrl), max: 1 }
  );

  const db = drizzle(client) as DB;
  return { db, client };
}
