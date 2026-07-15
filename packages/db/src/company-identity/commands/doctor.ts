import { inspectCompanyIdentityDatabase } from "../doctor.js";
import { createCompanyIdentityDirectConfig } from "../environment.js";

/**
 * Inspects the dedicated company-identity migration ledger and schema sentinels.
 * @returns A promise that resolves after inspection and evidence output complete.
 * @throws When configuration, target validation, or catalog inspection fails.
 */
async function main(): Promise<void> {
  const { directDatabaseUrl } = createCompanyIdentityDirectConfig({
    COMPANY_AUTH_DIRECT_DATABASE_URL:
      process.env.COMPANY_AUTH_DIRECT_DATABASE_URL,
  });
  const report = await inspectCompanyIdentityDatabase({ directDatabaseUrl });
  console.log(
    JSON.stringify({ operation: "company_identity_doctor", ...report }),
  );
  if (!report.clean) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "company_identity_doctor",
      clean: false,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  process.exitCode = 1;
});
