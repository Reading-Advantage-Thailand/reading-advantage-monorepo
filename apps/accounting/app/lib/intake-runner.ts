/**
 * Intake poll runner of the track `accounting_drive_intake_20261109`
 * (FR-11, FR-24, spec section 5).
 *
 * The runner is the entry of the Cloud Run job `accounting-intake-poll`. It
 * claims the lease row of FR-6 with a compare-and-swap on the lease token,
 * calls the one intake domain function, and releases the lease. It holds no
 * business logic. `--help` is a dry start: it prints the usage and exits 0
 * with no Drive call, no database call, and no network call (D-27).
 *
 * The file is bundled into the single self-contained file
 * `dist/intake-runner.mjs` by the `runner-bundle` Dockerfile stage.
 */
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

import type postgres from "postgres";

import {
  ACCOUNTING_INTAKE_QUEUE_NAME,
  claimIntakeLease,
  createPostgresAccountingSubmissionRepository,
  intakeDriveDocument,
  type AccountingActor,
  type AccountingDocumentExtractionPort,
  type AccountingDocumentLocalReaderPort,
  type AccountingDocumentSourcePort,
  type AccountingEvidenceStore,
  type AccountingIntakeDocumentRepository,
  type AccountingIntakeLease,
  type AccountingIntakeLeaseRepository,
  type AccountingIntakePollResult,
  type AccountingSubmissionRepository,
} from "@reading-advantage/backend/accounting";
import { createAccountingRuntimeClient } from "@reading-advantage/db/accounting/runtime";

/** Lease duration of one poll run: 30 minutes. */
const LEASE_DURATION_MS = 30 * 60 * 1000;

/** Raw `accounting_intake_leases` row as postgres.js returns it. */
interface IntakeLeaseRow {
  readonly queue_name: string;
  readonly lease_token: string;
  readonly worker_id: string;
  readonly lease_expires_at: Date | string;
  readonly claimed_at: Date | string;
}

/**
 * Maps one raw lease row to the domain lease row.
 * @param row Raw snake_case lease row.
 * @returns The lease row.
 */
function toIntakeLease(row: Readonly<IntakeLeaseRow>): AccountingIntakeLease {
  return {
    queueName: row.queue_name,
    leaseToken: row.lease_token,
    workerId: row.worker_id,
    leaseExpiresAt: row.lease_expires_at,
    claimedAt: row.claimed_at,
  };
}

/**
 * Builds the Postgres lease repository over the Accounting runtime client.
 * The claim is a compare-and-swap on the lease token: the update applies only
 * when the stored lease has expired (FR-6, Review A F309).
 * @param sql Accounting database client.
 * @returns The lease repository port.
 */
export function createPostgresIntakeLeaseRepository(
  sql: postgres.Sql,
): AccountingIntakeLeaseRepository {
  return {
    /**
     * Claims the queue when no live lease of another token exists.
     * @param request Company scope, queue, worker, token, and expiry.
     * @returns The claimed lease, or undefined when a live lease holds it.
     */
    async claim(request: {
      readonly scope: { readonly companyId: string };
      readonly queueName: string;
      readonly workerId: string;
      readonly leaseToken: string;
      readonly leaseExpiresAt: Date | number;
      readonly now?: number;
    }): Promise<AccountingIntakeLease | undefined> {
      const expiresAt = new Date(request.leaseExpiresAt);
      const rows = await sql<IntakeLeaseRow[]>`
        insert into accounting_intake_leases (
          queue_name, lease_token, worker_id, lease_expires_at,
          claimed_at, scope_company_id
        ) values (
          ${request.queueName}, ${request.leaseToken}, ${request.workerId},
          ${expiresAt.toISOString()},
          ${new Date(request.now ?? Date.now()).toISOString()},
          ${request.scope.companyId}
        )
        on conflict (scope_company_id, queue_name) do update
        set lease_token = excluded.lease_token,
            worker_id = excluded.worker_id,
            lease_expires_at = excluded.lease_expires_at,
            claimed_at = excluded.claimed_at
        where accounting_intake_leases.lease_expires_at <= excluded.claimed_at
        returning *
      `;
      const [row] = rows;
      return row === undefined ? undefined : toIntakeLease(row);
    },

    /**
     * Releases one lease so the next run may claim the queue.
     * @param request Company scope, queue name, and the held token.
     * @returns The released lease, or undefined when no row matched.
     */
    async release(request: {
      readonly scope: { readonly companyId: string };
      readonly queueName: string;
      readonly leaseToken: string;
    }): Promise<AccountingIntakeLease | undefined> {
      const rows = await sql<IntakeLeaseRow[]>`
        update accounting_intake_leases
        set lease_expires_at = now()
        where scope_company_id = ${request.scope.companyId}
          and queue_name = ${request.queueName}
          and lease_token = ${request.leaseToken}
        returning *
      `;
      const [row] = rows;
      return row === undefined ? undefined : toIntakeLease(row);
    },

    /**
     * Finds the lease row of one queue inside the company scope.
     * @param request Company scope and queue name.
     * @returns The lease row, or undefined when the queue is absent.
     */
    async findByQueue(request: {
      readonly scope: { readonly companyId: string };
      readonly queueName: string;
    }): Promise<AccountingIntakeLease | undefined> {
      const rows = await sql<IntakeLeaseRow[]>`
        select *
        from accounting_intake_leases
        where scope_company_id = ${request.scope.companyId}
          and queue_name = ${request.queueName}
        limit 1
      `;
      const [row] = rows;
      return row === undefined ? undefined : toIntakeLease(row);
    },
  };
}

/** Ports and identity of one intake poll run. */
export interface IntakePollDependencies {
  /** Poll actor; the company scope comes from it. */
  readonly actor: AccountingActor;
  /** Drive folder id of the intake folder. */
  readonly folderId: string;
  /** Read-only Drive port. */
  readonly source: AccountingDocumentSourcePort;
  /** Evidence store port. */
  readonly evidenceStore: AccountingEvidenceStore;
  /** Intake row repository port. */
  readonly intakeRepository: AccountingIntakeDocumentRepository;
  /** Submission repository port. */
  readonly submissionRepository: AccountingSubmissionRepository;
  /** Local text and workbook reader. */
  readonly localReader: AccountingDocumentLocalReaderPort;
  /** Model reader on Vertex AI. */
  readonly extraction: AccountingDocumentExtractionPort;
  /** Lease repository port. */
  readonly leaseRepository: AccountingIntakeLeaseRepository;
  /** Optional duplicate scan cap override. */
  readonly duplicateScanCap?: number;
}

/** Local reader placeholder until the parsing adapter of Phase 6 lands. */
const unavailableLocalReader: AccountingDocumentLocalReaderPort = {
  /**
   * Refuses a local read while the reader adapter is not wired.
   * @returns Never returns.
   * @throws When a local read is attempted.
   */
  async read(): Promise<never> {
    throw new Error("The local document reader is not configured");
  },
};

/** Extraction placeholder until the adapter of Phase 4 lands. */
const unavailableExtraction: AccountingDocumentExtractionPort = {
  /**
   * Refuses a model read while the extraction adapter is not wired.
   * @returns Never returns.
   * @throws When a model read is attempted.
   */
  async extract(): Promise<never> {
    throw new Error("The document extraction adapter is not configured");
  },
};

/**
 * Reads the poll actor from one environment. The actor id comes from
 * `ACCOUNTING_INTAKE_ACTOR_ID`, the company id comes from
 * `ACCOUNTING_INTAKE_COMPANY_ID` parsed as a UUID, and the role is the fixed
 * `ACCOUNTANT` (PM-21, Review A F304). The read makes no database call.
 * @param env Environment of the run.
 * @returns The poll actor.
 * @throws When the actor id is blank or the company id is blank or not a
 *   UUID. The error holds no environment value.
 */
export function readIntakePollActor(env: NodeJS.ProcessEnv): AccountingActor {
  const accountId = env.ACCOUNTING_INTAKE_ACTOR_ID?.trim() ?? "";
  if (accountId === "") {
    throw new Error("The intake actor id is not configured");
  }
  const companyId = env.ACCOUNTING_INTAKE_COMPANY_ID?.trim() ?? "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(
      companyId,
    )
  ) {
    throw new Error("The intake company id is not a valid company id");
  }
  return { accountId, companyId, role: "ACCOUNTANT" };
}

/**
 * Builds the runtime dependencies of the poll from the job environment.
 * The actor and the folder id are read before the database client is made,
 * so a misconfiguration fails with its own message (PM-21, Review B F305).
 * @returns The poll dependencies.
 * @throws When the actor, the folder id, or a required environment value is
 *   absent.
 */
async function createRuntimeIntakePollDependencies(): Promise<IntakePollDependencies> {
  const actor = readIntakePollActor(process.env);
  // The Drive, storage, and row adapters load on demand, so the `--help` dry
  // start and the lease rows pay no `googleapis` or storage import cost (D-27).
  const { createDriveDocumentSource, readIntakeFolderId } = await import(
    "./drive-document-source.js"
  );
  const folderId = readIntakeFolderId();
  const sql = await createAccountingRuntimeClient({
    databaseUrl: process.env.ACCOUNTING_DATABASE_URL ?? "",
  });
  const rawCap = process.env.ACCOUNTING_DUPLICATE_SCAN_CAP;
  const duplicateScanCap =
    rawCap === undefined || rawCap.trim() === ""
      ? undefined
      : Number.parseInt(rawCap, 10);
  const [
    { createAccountingEvidenceStore },
    { createAccountingIntakeDocumentRepository },
  ] = await Promise.all([
    import("./accounting-evidence-store.js"),
    import("./accounting-intake-document-repository.js"),
  ]);
  return {
    actor,
    folderId,
    source: createDriveDocumentSource(),
    evidenceStore: createAccountingEvidenceStore(),
    intakeRepository: createAccountingIntakeDocumentRepository({ sql }),
    submissionRepository: createPostgresAccountingSubmissionRepository({ sql }),
    localReader: unavailableLocalReader,
    extraction: unavailableExtraction,
    leaseRepository: createPostgresIntakeLeaseRepository(sql),
    ...(duplicateScanCap === undefined || Number.isNaN(duplicateScanCap)
      ? {}
      : { duplicateScanCap }),
  };
}

/** Prints the usage of the runner entry. */
function printUsage(): void {
  console.log(
    "Usage: node dist/intake-runner.mjs [--help] — polls the Accounting Drive intake folder once.",
  );
}

/** Emits one safe structured log line. */
function logRunnerLine(record: Record<string, string | number>): void {
  try {
    console.log(JSON.stringify(record));
  } catch {
    // Logging must not replace the run result.
  }
}

/**
 * Runs one intake poll under the lease row of FR-6.
 * @param argv Argument list of the run; `--help` makes a dry start.
 * @param dependencies Optional injected ports; the runtime builds them when
 *   absent.
 * @returns The process exit code of the run.
 * @throws When the poll cannot claim the lease or the domain rejects the run.
 */
export async function runIntakePoll(
  argv: readonly string[] = process.argv.slice(2),
  dependencies?: IntakePollDependencies,
): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return 0;
  }

  const deps = dependencies ?? (await createRuntimeIntakePollDependencies());
  const scope = { companyId: deps.actor.companyId };
  const leaseToken = randomUUID();
  const lease = await claimIntakeLease({
    repository: deps.leaseRepository,
    scope,
    queueName: ACCOUNTING_INTAKE_QUEUE_NAME,
    workerId: process.env.HOSTNAME ?? "intake-runner",
    leaseToken,
    leaseExpiresAt: new Date(Date.now() + LEASE_DURATION_MS),
  });
  if (lease === undefined) {
    logRunnerLine({ event: "intake_lease_refused" });
    return 1;
  }

  try {
    const result: AccountingIntakePollResult = await intakeDriveDocument({
      actor: deps.actor,
      mode: "poll",
      folderId: deps.folderId,
      source: deps.source,
      evidenceStore: deps.evidenceStore,
      intakeRepository: deps.intakeRepository,
      submissionRepository: deps.submissionRepository,
      localReader: deps.localReader,
      extraction: deps.extraction,
      ...(deps.duplicateScanCap === undefined
        ? {}
        : { duplicateScanCap: deps.duplicateScanCap }),
    });
    logRunnerLine({ event: "intake_poll_done", ...result });
    return 0;
  } finally {
    await deps.leaseRepository.release({
      scope,
      queueName: ACCOUNTING_INTAKE_QUEUE_NAME,
      leaseToken,
    });
  }
}

/**
 * Runs one intake poll entry and turns a failure into one safe log line and
 * the exit code 1 (F313, Review B F307). The log line holds the event name
 * and the error name only, so no Drive id, no request URL, and no error body
 * reaches the log.
 * @param argv Argument list of the run; `--help` makes a dry start.
 * @param dependencies Optional injected ports; the runtime builds them when
 *   absent.
 * @returns 0 when the poll ran and 1 when it failed.
 */
export async function runIntakePollEntry(
  argv: readonly string[] = process.argv.slice(2),
  dependencies?: IntakePollDependencies,
): Promise<number> {
  try {
    return await runIntakePoll(argv, dependencies);
  } catch (error) {
    logRunnerLine({
      event: "intake_poll_failed",
      error_name: error instanceof Error ? error.name : "Error",
    });
    return 1;
  }
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  void runIntakePollEntry(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
