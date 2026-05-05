import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

const connectionString = process.env.DATABASE_URL!;

// Connection pool for serverless / edge compatibility
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
});

export const db = drizzle(client, { schema });
export { client };

export type DB = typeof db;
