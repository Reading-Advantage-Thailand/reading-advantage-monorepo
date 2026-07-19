import { pathToFileURL } from "node:url";

import {
  CODECAMP_MIGRATION_APPLY_CONFIRMATION,
  runPostgresCodecampIdentityMigration,
  type PostgresCodecampMigrationInput,
} from "@reading-advantage/backend";

/**
 * Parses secret-bearing environment and explicit operator flags without logging values.
 * @param environment Process environment containing the two direct database URLs.
 * @param arguments_ Explicit dry-run or apply command-line flags.
 * @returns Validated adapter input.
 * @throws When required environment or exact operator authorization is missing.
 */
export function createCodecampMigrationInput(
  environment: Readonly<Record<string, string | undefined>>,
  arguments_: readonly string[],
): PostgresCodecampMigrationInput {
  const dryRun = arguments_.includes("--dry-run");
  const apply = arguments_.includes("--apply");
  if (dryRun === apply) {
    throw new Error("Choose exactly one of --dry-run or --apply.");
  }
  const sourceDatabaseUrl = environment.CODECAMP_MIGRATION_SOURCE_DATABASE_URL;
  const targetDatabaseUrl = environment.COMPANY_AUTH_DIRECT_DATABASE_URL;
  if (!sourceDatabaseUrl || !targetDatabaseUrl) {
    throw new Error("Migration database environment is incomplete.");
  }
  const expectedSourceFingerprint = arguments_
    .find((argument) => argument.startsWith("--expected-source-fingerprint="))
    ?.slice("--expected-source-fingerprint=".length);
  const confirmation = arguments_
    .find((argument) => argument.startsWith("--confirm="))
    ?.slice("--confirm=".length);
  if (apply && !/^[a-f0-9]{64}$/.test(expectedSourceFingerprint ?? "")) {
    throw new Error(
      "--apply requires --expected-source-fingerprint=<64 lowercase hex>.",
    );
  }
  if (apply && confirmation !== CODECAMP_MIGRATION_APPLY_CONFIRMATION) {
    throw new Error(
      `--apply requires --confirm=${CODECAMP_MIGRATION_APPLY_CONFIRMATION}.`,
    );
  }
  return {
    sourceDatabaseUrl,
    targetDatabaseUrl,
    mode: apply ? "apply" : "dry-run",
    ...(expectedSourceFingerprint ? { expectedSourceFingerprint } : {}),
    ...(confirmation ? { confirmation } : {}),
  };
}

/**
 * Runs the migration CLI and emits only the adapter's aggregate report.
 * @param environment Process environment containing database connections.
 * @param arguments_ Explicit operator command-line flags.
 * @returns A promise that settles after aggregate output is emitted.
 */
export async function main(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  arguments_: readonly string[] = process.argv.slice(2),
): Promise<void> {
  try {
    const report = await runPostgresCodecampIdentityMigration(
      createCodecampMigrationInput(environment, arguments_),
    );
    console.log(JSON.stringify({ ok: true, ...report }, null, 2));
  } catch (error) {
    const safeError = error as { code?: unknown; message?: unknown };
    console.error(
      JSON.stringify({
        ok: false,
        code:
          typeof safeError.code === "string" ? safeError.code : "INPUT_INVALID",
        message:
          typeof safeError.message === "string"
            ? safeError.message
            : "Codecamp identity migration stopped.",
      }),
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
