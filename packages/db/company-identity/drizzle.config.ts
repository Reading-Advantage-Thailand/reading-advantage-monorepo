import { defineConfig } from "drizzle-kit";

// `generate` does not connect; the RFC 2606 host makes missing production
// credentials unmistakable. Runtime migrations never import this config.
const GENERATION_ONLY_UNREACHABLE_URL =
  "postgresql://configuration-required@generation-only.invalid/company_identity";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/company-identity/schema/index.ts",
  out: "./company-identity/drizzle",
  dbCredentials: {
    url:
      process.env.COMPANY_AUTH_DIRECT_DATABASE_URL ??
      GENERATION_ONLY_UNREACHABLE_URL,
  },
  strict: true,
  verbose: true,
});
