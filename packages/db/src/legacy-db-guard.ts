/** Runs one read-only SQL statement and returns its rows. */
export type ReadOnlyQuery = (sql: string) => Promise<ReadonlyArray<{ table_name: string }>>;

// to_regclass is not filtered by table privileges, unlike information_schema.tables.
const LEGACY_MARKER_SQL = `SELECT 'article' AS table_name WHERE to_regclass('public.article') IS NOT NULL
UNION ALL
SELECT '_prisma_migrations' WHERE to_regclass('public._prisma_migrations') IS NOT NULL`;

/**
 * Finds tables that only the legacy Prisma Primary database has.
 * @param query Runs one read-only SQL statement against the target database.
 * @returns The legacy tables found, as `public.<name>`; empty for a fresh or Drizzle database.
 */
export async function findLegacyDatabaseMarkers(query: ReadOnlyQuery): Promise<string[]> {
  const rows = await query(LEGACY_MARKER_SQL);
  return rows.map((row) => `public.${row.table_name}`);
}
