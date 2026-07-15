import { defineConfig } from "drizzle-kit";

/** Incorrect product migration configuration containing identity ownership. */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/company-identity/schema/index.ts",
  out: "./company-identity/drizzle",
  dbCredentials: { url: process.env.COMPANY_AUTH_DIRECT_DATABASE_URL! },
});
