import type postgres from "postgres";

/** Minimal SQL surface required to evaluate a table sentinel. */
export type SentinelSqlClient = Pick<postgres.Sql, "unsafe">;

/**
 * Checks whether a table or view matches a presence or absence sentinel.
 * @param client Database client used for the catalog query.
 * @param kind Required table state.
 * @param tableName Exact relation name in `public`, or a `schema.name` pair such as `tutor_compat.article`.
 * @returns True when the physical table state matches the sentinel.
 */
export async function checkTableSentinel(
  client: SentinelSqlClient,
  kind: "table" | "table_absent",
  tableName: string,
): Promise<boolean> {
  const [schema, name] = tableName.includes(".") ? tableName.split(".") : ["public", tableName];
  const rows = await client.unsafe(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2 LIMIT 1",
    [schema, name],
  );
  return kind === "table" ? rows.length > 0 : rows.length === 0;
}
