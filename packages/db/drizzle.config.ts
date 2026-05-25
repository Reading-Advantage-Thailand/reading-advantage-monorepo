import { defineConfig } from "drizzle-kit";

// FR-3 (track connection_pooling_20260522): migrations MUST use the direct
// (session-mode) connection. Transaction-mode pooling breaks:
//   - advisory locks (drizzle-kit acquires one to serialize concurrent runs)
//   - multi-statement DDL transactions
//   - any session-scoped feature
// Fall back to DATABASE_URL only when DIRECT_DATABASE_URL is unset, for
// backward compatibility with environments that have not yet adopted the
// split (logs a hint when this fallback is used at the top level).
const directUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!process.env.DIRECT_DATABASE_URL && process.env.DATABASE_URL) {
  console.warn(
    "[drizzle.config] DIRECT_DATABASE_URL is not set; falling back to DATABASE_URL. " +
      "Set DIRECT_DATABASE_URL to a direct (session-mode) Postgres connection to " +
      "avoid running migrations through a transaction-mode pooler."
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: directUrl!,
  },
});
