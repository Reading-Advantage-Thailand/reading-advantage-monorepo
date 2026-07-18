#!/usr/bin/env tsx
import { migrateProductDatabase } from "../src/migration.js";

const directDatabaseUrl =
  process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!directDatabaseUrl) {
  console.error(
    "DIRECT_DATABASE_URL is not set (and no DATABASE_URL fallback is available).",
  );
  process.exitCode = 2;
} else {
  if (!process.env.DIRECT_DATABASE_URL) {
    console.warn(
      "[migrate] DIRECT_DATABASE_URL is not set; falling back to DATABASE_URL.",
    );
  }
  await migrateProductDatabase({ directDatabaseUrl });
}
