import { pathToFileURL } from "node:url";

import {
  DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION,
  DEV_LOCAL_WORKBOOKS_SECRET_ENV,
  runPostgresDevLocalProductAccess,
  type PostgresDevLocalProductAccessInput,
} from "@reading-advantage/backend";

/**
 * Parses secret-bearing environment and explicit operator flags without logging values.
 * @param environment Process environment containing the direct database URL and optional local client secret.
 * @param arguments_ Explicit dry-run or apply command-line flags.
 * @returns Validated adapter input.
 * @throws When required environment or exact operator authorization is missing.
 */
export function createDevLocalProductAccessInput(
  environment: Readonly<Record<string, string | undefined>>,
  arguments_: readonly string[],
): PostgresDevLocalProductAccessInput {
  const dryRun = arguments_.includes("--dry-run");
  const apply = arguments_.includes("--apply");
  if (dryRun === apply) {
    throw new Error("Choose exactly one of --dry-run or --apply.");
  }
  const targetDatabaseUrl =
    environment.COMPANY_AUTH_DIRECT_DATABASE_URL ?? environment.DATABASE_URL;
  if (!targetDatabaseUrl) {
    throw new Error("Local product access seed database environment is incomplete.");
  }
  const username = arguments_
    .find((argument) => argument.startsWith("--username="))
    ?.slice("--username=".length);
  const confirmation = arguments_
    .find((argument) => argument.startsWith("--confirm="))
    ?.slice("--confirm=".length);
  if (apply && confirmation !== DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION) {
    throw new Error(
      `--apply requires --confirm=${DEV_LOCAL_PRODUCT_ACCESS_APPLY_CONFIRMATION}.`,
    );
  }
  const workbooksLocalOidcClientSecret = environment[DEV_LOCAL_WORKBOOKS_SECRET_ENV];
  return {
    targetDatabaseUrl,
    mode: apply ? "apply" : "dry-run",
    ...(username ? { username } : {}),
    ...(confirmation ? { confirmation } : {}),
    ...(workbooksLocalOidcClientSecret !== undefined
      ? { workbooksLocalOidcClientSecret }
      : {}),
  };
}

/**
 * Runs the local product access seed CLI and emits only the aggregate report.
 * @param environment Process environment containing the direct database URL.
 * @param arguments_ Explicit operator command-line flags.
 * @returns A promise that settles after aggregate output is emitted.
 */
export async function main(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  arguments_: readonly string[] = process.argv.slice(2),
): Promise<void> {
  try {
    const report = await runPostgresDevLocalProductAccess(
      createDevLocalProductAccessInput(environment, arguments_),
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
            : "Local product access seed stopped.",
      }),
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
