import type postgres from "postgres";

/** Minimal SQL surface required to evaluate a table sentinel. */
export type SentinelSqlClient = Pick<postgres.Sql, "unsafe">;

/**
 * Checks whether a public table matches a presence or absence sentinel.
 * @param client Database client used for the catalog query.
 * @param kind Required table state.
 * @param tableName Exact public table name.
 * @returns True when the physical table state matches the sentinel.
 */
export async function checkTableSentinel(
  client: SentinelSqlClient,
  kind: "table" | "table_absent",
  tableName: string,
): Promise<boolean> {
  const rows = await client.unsafe(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1",
    [tableName],
  );
  return kind === "table" ? rows.length > 0 : rows.length === 0;
}
