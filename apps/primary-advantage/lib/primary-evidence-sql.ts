import postgres from "postgres";

/**
 * Creates the postgres client of the durable job port (track primary_mastery_evidence_20261006).
 * The shared `@reading-advantage/db` client cannot serve: Drizzle replaces the json serializers
 * of the client it wraps with pass-through functions, so `sql.json()` sends a raw object and the
 * driver throws. The port gets a small client of its own with the same pooling rules
 * (`prepare: false` for the transaction-mode pooler).
 * @param connectionString The database URL; defaults to DATABASE_URL.
 * @returns A postgres client; the caller ends it when a script finishes.
 */
export function createPrimaryEvidenceSql(connectionString: string | undefined = process.env.DATABASE_URL): postgres.Sql {
  return postgres(connectionString ?? "", { max: 2, idle_timeout: 20, connect_timeout: 30, prepare: false });
}
