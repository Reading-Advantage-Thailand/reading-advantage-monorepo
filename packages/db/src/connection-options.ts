import type { Options } from "postgres";

export function getDatabaseSocketPath(connectionString: string | undefined): string | null {
  if (!connectionString) {
    return null;
  }

  const url = new URL(connectionString);
  const socketPath = url.searchParams.get("host");

  return socketPath?.startsWith("/") ? socketPath : null;
}

export function normalizePostgresConnectionString(connectionString: string | undefined): string {
  if (!connectionString) {
    return "";
  }

  const socketPath = getDatabaseSocketPath(connectionString);
  if (!socketPath) {
    return connectionString;
  }

  const url = new URL(connectionString);
  url.searchParams.delete("host");
  return url.toString();
}

// FR-2 (track connection_pooling_20260522):
//   - Default per-process pool size is intentionally small. With a
//     transaction-mode pooler in front (PgBouncer in docker-compose, the
//     same in production fronting the VPS Postgres), each app process only
//     needs a tiny client-side pool — the pooler multiplexes many client
//     connections onto few backend sessions. Default `max: 3` covers the
//     common Next.js request concurrency without exhausting the pooler.
//   - Override via `DATABASE_POOL_MAX` env var (positive integer). Values
//     that are not positive integers are ignored (fall back to the default).
const DEFAULT_POOL_MAX = 3;

function resolvePoolMax(): number {
  const raw = process.env.DATABASE_POOL_MAX;
  if (raw === undefined || raw === "") {
    return DEFAULT_POOL_MAX;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_POOL_MAX;
  }
  return parsed;
}

export function buildPostgresOptions(connectionString: string | undefined): Options<Record<string, never>> {
  // FR-2: `prepare: false` is required for transaction-mode pooling.
  //   `postgres-js` uses named prepared statements by default (`prepare: true`),
  //   which are scoped to a backend session. A transaction-mode pooler can
  //   route the same client connection to different backends across queries,
  //   so a prepared statement created on backend A is invisible to backend B
  //   and the query fails with `prepared statement "s_1" does not exist`.
  //   Setting `prepare: false` forces postgres-js to use parameterised simple
  //   queries, which work uniformly through the pooler.
  if (!connectionString) {
    return {
      max: resolvePoolMax(),
      idle_timeout: 20,
      connect_timeout: 30,
      prepare: false,
    };
  }

  const url = new URL(connectionString);
  const socketPath = getDatabaseSocketPath(connectionString);
  const port = url.port || "5432";

  return {
    max: resolvePoolMax(),
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
    ...(socketPath?.startsWith("/")
      ? { path: `${socketPath}/.s.PGSQL.${port}` }
      : {}),
  };
}
