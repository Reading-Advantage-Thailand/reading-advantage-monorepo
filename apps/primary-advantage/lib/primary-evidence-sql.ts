import postgres from "postgres";
import { buildPostgresOptions, normalizePostgresConnectionString } from "@reading-advantage/db";

/**
 * Creates the postgres client of the durable job port (track primary_mastery_evidence_20261006).
 * The shared `@reading-advantage/db` client cannot serve: Drizzle replaces the json serializers
 * of the client it wraps with pass-through functions, so `sql.json()` sends a raw object and the
 * driver throws. The port gets a small client of its own with the same pooling rules
 * (`prepare: false` for the transaction-mode pooler) and the same socket handling: the Cloud Run URL
 * names the Cloud SQL socket in a `host` query parameter, which postgres.js ignores, so the raw URL
 * connected to 127.0.0.1:5432 and every live enqueue failed (cutover 2026-10-20, ECONNREFUSED).
 * @param connectionString The database URL; defaults to DATABASE_URL.
 * @returns A postgres client; the caller ends it when a script finishes.
 */
export function createPrimaryEvidenceSql(connectionString: string | undefined = process.env.DATABASE_URL): postgres.Sql {
  return postgres(normalizePostgresConnectionString(connectionString), { ...buildPostgresOptions(connectionString), max: 2 });
}
