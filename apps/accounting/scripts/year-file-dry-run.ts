import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { Auth } from "googleapis";

import {
  dryRunAccountingYearFiles,
  type AccountingYearFileTextLayerPort,
} from "@reading-advantage/backend/accounting";

import {
  createDriveDocumentSource,
  readIntakeFolderId,
} from "../app/lib/drive-document-source";

/** The text-layer tool of this machine; it runs with no shell. */
const PDFTOTEXT_PATH = "/usr/bin/pdftotext";

/** Output limit of one `pdftotext` run: 64 MB of text. */
const PDFTOTEXT_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

/** Company scope of the dry run. It writes no row, so the value is a label only. */
const DRY_RUN_COMPANY_ID = "year-file-dry-run";

/**
 * Builds the real text-layer port of the dry run. It pipes the PDF bytes to
 * `/usr/bin/pdftotext` on stdin through `execFile` with no shell, so no file
 * of the accountant is written to disk and no dependency is added (Q17).
 * @returns The text-layer port.
 */
export function createPdftotextLayer(): AccountingYearFileTextLayerPort {
  return {
    /**
     * Reads the text layer of one PDF.
     * @param input The PDF bytes.
     * @returns The text, or null when the PDF has no text or `pdftotext` rejects it.
     * @throws When `pdftotext` is not installed at the fixed path.
     */
    read(input) {
      return new Promise((resolveRead, rejectRead) => {
        const child = execFile(
          PDFTOTEXT_PATH,
          ["-enc", "UTF-8", "-", "-"],
          { encoding: "utf8", maxBuffer: PDFTOTEXT_MAX_BUFFER_BYTES },
          (error, stdout) => {
            if (error !== null) {
              if ("code" in error && error.code === "ENOENT") {
                rejectRead(error);
                return;
              }
              resolveRead({ text: null });
              return;
            }
            resolveRead({ text: stdout.trim() === "" ? null : stdout });
          },
        );
        // A tool that exits early closes the pipe; the callback holds the outcome.
        child.stdin?.on("error", () => undefined);
        child.stdin?.end(Buffer.from(input.body));
      });
    },
  };
}

/** Environment variable that names the service account to impersonate. */
const IMPERSONATE_ENV_NAME = "ACCOUNTING_DRIVE_IMPERSONATE_SERVICE_ACCOUNT";

/** The one scope of the Drive read: read only. */
const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

/** Scope of the source credential, which calls the token service of IAM. */
const SOURCE_CLIENT_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

/**
 * Builds the Drive auth client of the dry run. When the environment names a
 * service account, the client impersonates it with the Drive read-only scope
 * from this machine's Application Default Credentials. Otherwise the client is
 * absent and the Drive source uses Application Default Credentials as the
 * Cloud Run runtime does. No token, folder id, or key is printed.
 * @returns The impersonated auth client, or undefined.
 */
export async function createDryRunAuth(): Promise<Auth.OAuth2Client | undefined> {
  const targetPrincipal = process.env[IMPERSONATE_ENV_NAME];
  if (targetPrincipal === undefined || targetPrincipal.trim() === "") {
    return undefined;
  }
  const { Auth: GoogleAuthLibrary } = await import("googleapis");
  const sourceClient = await new GoogleAuthLibrary.GoogleAuth({
    scopes: [SOURCE_CLIENT_SCOPE],
  }).getClient();
  return new GoogleAuthLibrary.Impersonated({
    sourceClient,
    targetPrincipal: targetPrincipal.trim(),
    targetScopes: [DRIVE_READONLY_SCOPE],
  });
}

/**
 * Runs the year-file dry run against Drive. The root folder id comes from
 * `ACCOUNTING_DRIVE_FOLDER_ID`. The credentials come from Application Default
 * Credentials, or from the impersonation of the service account that
 * `ACCOUNTING_DRIVE_IMPERSONATE_SERVICE_ACCOUNT` names, so no secret enters a
 * file in git.
 * @param reportDir Folder that receives the report file.
 * @returns The path of the report file.
 */
export async function runYearFileDryRun(reportDir: string): Promise<string> {
  const auth = await createDryRunAuth();
  const result = await dryRunAccountingYearFiles({
    actor: {
      accountId: DRY_RUN_COMPANY_ID,
      companyId: DRY_RUN_COMPANY_ID,
      role: "ACCOUNTANT",
    },
    folderId: readIntakeFolderId(),
    source: await createDriveDocumentSource(
      auth === undefined ? undefined : { auth },
    ),
    textLayer: createPdftotextLayer(),
    reportDir,
  });
  return result.reportPath;
}

/** Reads the report folder from the first argument and runs the dry run. */
async function main(): Promise<void> {
  const reportDir = process.argv[2];
  if (reportDir === undefined || reportDir.trim() === "") {
    throw new Error("Usage: year-file-dry-run.ts <report-folder>");
  }
  const reportPath = await runYearFileDryRun(resolve(reportDir));
  process.stdout.write(`report written: ${reportPath}\n`);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `year-file dry run failed: ${error instanceof Error ? error.name : "UnknownError"}\n`,
    );
    process.exitCode = 1;
  });
}
