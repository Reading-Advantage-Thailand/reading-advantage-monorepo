import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";
import { buildPostgresOptions, normalizePostgresConnectionString } from "./connection-options.js";

const connectionString = process.env.DATABASE_URL;

// Connection pool for serverless / edge compatibility
const client = postgres(
  normalizePostgresConnectionString(connectionString),
  buildPostgresOptions(connectionString)
);

export const db = drizzle(client, { schema });
export { client };

export type DB = typeof db;
