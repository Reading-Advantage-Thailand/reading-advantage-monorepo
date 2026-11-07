import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { StorytimeDb } from "./index.js";

/**
 * The runtime client of the Storytime database (design section 5a).
 *
 * The app may not import a database driver: the `DATABASE_BOUNDARY` rule of the architecture
 * check bars `postgres`, `drizzle-orm`, and `@reading-advantage/db` from `apps/storytime`. The
 * client therefore lives here, next to the SQL it serves, and the app adapter calls
 * `createStorytimeRuntimeStore`.
 *
 * The URL names the dedicated `storytime` database and its runtime role. A Cloud Run URL names a
 * Unix socket in the `host` query value; the client reads the socket file and drops the query
 * value, so the driver never looks for a TCP host.
 */

/** The largest client-side connection count of one Storytime client. */
const POOL_MAX = 3;

/**
 * Reads the Unix socket path of a PostgreSQL connection string.
 * @param databaseUrl The connection string.
 * @returns The socket path, or `null` when the string names a TCP host.
 */
function socketPath(databaseUrl: string): string | null {
  const path = new URL(databaseUrl).searchParams.get("host");
  return path !== null && path.startsWith("/") ? path : null;
}

/**
 * Opens the Storytime database client.
 * @param databaseUrl The PostgreSQL URL of the Storytime database.
 * @returns A client that opens no connection before the first query.
 */
function createClient(databaseUrl: string): postgres.Sql {
  const url = new URL(databaseUrl);
  const path = socketPath(databaseUrl);
  url.searchParams.delete("host");
  return postgres(url.toString(), {
    max: POOL_MAX,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
    ...(path ? { path: `${path}/.s.PGSQL.${url.port || "5432"}` } : {}),
  });
}

/**
 * Creates the Drizzle client of the Storytime database.
 * @param databaseUrl The PostgreSQL URL of the Storytime database.
 * @returns The client bound to the Storytime schema.
 */
export function createStorytimeRuntimeDb(databaseUrl: string): StorytimeDb {
  return drizzle(createClient(databaseUrl)) as unknown as StorytimeDb;
}
