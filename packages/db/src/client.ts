import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";
import { buildPostgresOptions, normalizePostgresConnectionString } from "./connection-options.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  const isProduction = process.env.NODE_ENV === "production";
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (isProduction && !isBuildPhase) {
    throw new Error("{ DATABASE_URL is required in production runtime }");
  }
  if (!isProduction) {
    console.warn(
      "DATABASE_URL is not set \u2014 database operations will fail at query time."
    );
  }
}

const client = postgres(
  normalizePostgresConnectionString(connectionString),
  buildPostgresOptions(connectionString)
);

export const db = drizzle(client, { schema });
export { client };

export type DB = typeof db;
