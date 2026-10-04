#!/usr/bin/env tsx
import postgres from "postgres";
import { findLegacyDatabaseMarkers } from "../src/legacy-db-guard.js";
import {
  buildPostgresOptions,
  normalizePostgresConnectionString,
} from "../src/connection-options.js";

/**
 * Exits non-zero when DATABASE_URL points at the legacy Prisma Primary database.
 * Read-only: one SELECT on information_schema. Run before any migration.
 */
const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("[refuse-legacy-db] DATABASE_URL is not set.");
  process.exit(2);
}
const client = postgres(normalizePostgresConnectionString(url), {
  ...buildPostgresOptions(url),
  max: 1,
  connect_timeout: 10,
});
try {
  const markers = await findLegacyDatabaseMarkers(
    async (sql) => (await client.unsafe(sql)) as unknown as { table_name: string }[],
  );
  if (markers.length > 0) {
    console.error(
      `[refuse-legacy-db] REFUSING TO MIGRATE: the target looks like the legacy Primary database (found ${markers.join(", ")}). Point DATABASE_URL at the new database.`,
    );
    process.exitCode = 1;
  } else {
    console.log("[refuse-legacy-db] OK: no legacy Prisma markers found.");
  }
} catch (err) {
  console.error("[refuse-legacy-db] Failed to check the database:", err);
  process.exitCode = 2;
} finally {
  await client.end();
}
