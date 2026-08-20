import { defineConfig } from "drizzle-kit";

// `generate` does not connect; the RFC 2606 host makes missing production
// credentials unmistakable. Runtime migrations never import this config.
const GENERATION_ONLY_UNREACHABLE_URL =
  "postgresql://configuration-required@generation-only.invalid/accounting";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/accounting/schema/index.ts",
  out: "./accounting/drizzle",
  dbCredentials: {
    url:
      process.env.ACCOUNTING_DIRECT_DATABASE_URL ??
      GENERATION_ONLY_UNREACHABLE_URL,
  },
  strict: true,
  verbose: true,
});
