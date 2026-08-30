import { inspectAccountingDatabase } from "../doctor.js";
import { createAccountingDirectConfig } from "../environment.js";

/**
 * Inspects the dedicated Accounting migration ledger and schema sentinels.
 * @returns A promise that resolves after inspection and evidence output complete.
 * @throws When configuration, target validation, or catalog inspection fails.
 */
async function main(): Promise<void> {
  const { directDatabaseUrl } = createAccountingDirectConfig({
    ACCOUNTING_DIRECT_DATABASE_URL:
      process.env.ACCOUNTING_DIRECT_DATABASE_URL,
  });
  const report = await inspectAccountingDatabase({ directDatabaseUrl });
  console.log(
    JSON.stringify({ operation: "accounting_doctor", ...report }),
  );
  if (!report.clean) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "accounting_doctor",
      clean: false,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  process.exitCode = 1;
});
