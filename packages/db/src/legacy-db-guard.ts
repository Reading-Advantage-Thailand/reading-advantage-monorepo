/** Runs one read-only SQL statement and returns its rows. */
export type ReadOnlyQuery = (sql: string) => Promise<ReadonlyArray<{ table_name: string }>>;

const LEGACY_MARKER_SQL = `SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('_prisma_migrations', 'article')`;

/**
 * Finds tables that only the legacy Prisma Primary database has.
 * @param query Runs one read-only SQL statement against the target database.
 * @returns The legacy tables found, as `public.<name>`; empty for a fresh or Drizzle database.
 */
export async function findLegacyDatabaseMarkers(query: ReadOnlyQuery): Promise<string[]> {
  const rows = await query(LEGACY_MARKER_SQL);
  return rows.map((row) => `public.${row.table_name}`);
}
