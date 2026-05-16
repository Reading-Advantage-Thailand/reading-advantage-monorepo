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

export function buildPostgresOptions(connectionString: string | undefined): Options<Record<string, never>> {
  if (!connectionString) {
    return {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 30,
    };
  }

  const url = new URL(connectionString);
  const socketPath = getDatabaseSocketPath(connectionString);
  const port = url.port || "5432";

  return {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 30,
    ...(socketPath?.startsWith("/")
      ? { path: `${socketPath}/.s.PGSQL.${port}` }
      : {}),
  };
}
