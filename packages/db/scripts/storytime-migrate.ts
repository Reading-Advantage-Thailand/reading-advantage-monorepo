#!/usr/bin/env tsx
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Applies the Storytime migrations to the Storytime database only.
 *
 * The URL comes from `STORYTIME_DATABASE_URL` with no fallback, so the shared
 * product database can never be the target of this command.
 */
const databaseUrl = process.env.STORYTIME_DATABASE_URL;

if (!databaseUrl) {
  console.error("STORYTIME_DATABASE_URL is not set.");
  process.exitCode = 2;
} else {
  const sql = postgres(databaseUrl, {
    max: 1,
    onnotice: () => undefined,
  });
  try {
    await migrate(drizzle(sql), {
      migrationsFolder: fileURLToPath(
        new URL("../drizzle-storytime", import.meta.url),
      ),
    });
    console.log(
      JSON.stringify({ operation: "storytime_migrate", status: "ok" }),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
