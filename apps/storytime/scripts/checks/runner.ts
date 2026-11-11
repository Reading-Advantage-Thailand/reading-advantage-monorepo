#!/usr/bin/env tsx
/**
 * The stage 2 pre-check runner of one rubric call (plan task 5.4, P5.1 and P5.7).
 *
 * The runner writes one line of the cost ledger before it makes the model call. The line holds the
 * nine fields of P5.1 as `key=value` pairs separated by ` | `, and it holds no hash and no
 * checksum. A run whose ledger line cannot be written throws and never calls the model, so a run
 * with no ledger line cannot start (P5.1).
 *
 * The runner takes its model client as an argument. The live calibration builds that client from
 * the internal adapter `@reading-advantage/ai`; this script imports no provider SDK and holds no
 * key. The unit test passes a mock client, so it spends no money, and a mock result is labelled
 * `mock`, never `model pre-check` (P5.9). The runner refuses a real client inside Vitest, and it
 * never calls that client.
 *
 * A fail verdict must name the time in the file, or the runner throws (rule 6.7c). Each failure
 * detail names the file, the reason, and the time as `at=<seconds>`.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** The nine ledger keys of P5.1, in the order the runner writes them. */
export const LEDGER_KEYS = [
  "date",
  "task",
  "purpose",
  "model",
  "unit_price",
  "price_read_date",
  "item_count",
  "estimated_total",
  "approval_owner",
] as const;

/** One ledger entry of one paid call (P5.1). */
export interface LedgerEntry {
  /** The UTC date of the call. */
  date: string;
  /** The plan task that pays for the call. */
  task: string;
  /** The purpose of the call. */
  purpose: string;
  /** The model id. */
  model: string;
  /** The unit price of the model. */
  unitPrice: string;
  /** The date the role read the unit price. */
  priceReadDate: string;
  /** The count of the items of the call. */
  itemCount: number;
  /** The estimated total cost of the call. */
  estimatedTotal: string;
  /** The owner who approved the route. */
  approvalOwner: string;
}

/** One verdict of the model client. */
export interface Verdict {
  /** Whether the file passes the rubric. */
  pass: boolean;
  /** The reason of the verdict. */
  reason: string;
  /** The time in the file in seconds, or null when the file has no time. */
  atSeconds: number | null;
}

/** The request that the runner sends to the model client. */
export interface ModelRequest {
  /** The files of the call. */
  files: string[];
  /** The rubric kind of the call. */
  kind: string;
  /** The rubric text of the call. */
  rubricText: string;
}

/** The model client of the runner. The live client comes from `@reading-advantage/ai`. */
export interface ModelClient {
  /** The model id. */
  readonly id: string;
  /** Whether the client is a mock. */
  readonly isMock: boolean;
  /**
   * Checks the files of one call.
   * @param request The files, the rubric kind, and the rubric text.
   * @returns One verdict per file.
   */
  check(request: ModelRequest): Promise<Verdict[]>;
}

/** The options of one pre-check run. */
export interface PreCheckOptions {
  /** The path of the ledger file. */
  ledgerPath: string;
  /** The ledger entry of the call. */
  entry: LedgerEntry;
  /** The model client of the call. */
  client: ModelClient;
  /** The files of the call. */
  files: string[];
  /** The rubric kind of the call. */
  kind: string;
  /** The rubric text of the call. */
  rubricText: string;
}

/** The evidence class of one run. */
export type EvidenceClass = "mock" | "model pre-check";

/** The result of one pre-check run. */
export interface PreCheckResult {
  /** The ledger line that the runner wrote. */
  ledgerLine: string;
  /** Whether the runner called the model client. */
  modelCalled: boolean;
  /** The verdicts of the call. */
  verdicts: Verdict[];
  /** One detail line per fail. */
  failures: string[];
  /** The evidence class of the result. */
  evidence: EvidenceClass;
}

/**
 * Tells whether the process runs under Vitest.
 * @returns True when the process is a Vitest worker.
 */
export function isTestProcess(): boolean {
  return (
    process.env.VITEST !== undefined ||
    process.env.VITEST_WORKER_ID !== undefined ||
    process.env.NODE_ENV === "test"
  );
}

/**
 * Builds the ledger line of one call.
 * @param entry The ledger entry of the call.
 * @param itemCount The count of the items of the call.
 * @returns The nine `key=value` pairs in the order of P5.1, separated by ` | `.
 */
export function ledgerLineOf(entry: LedgerEntry, itemCount: number): string {
  const values: Record<(typeof LEDGER_KEYS)[number], string> = {
    date: entry.date,
    task: entry.task,
    purpose: entry.purpose,
    model: entry.model,
    unit_price: entry.unitPrice,
    price_read_date: entry.priceReadDate,
    item_count: String(itemCount),
    estimated_total: entry.estimatedTotal,
    approval_owner: entry.approvalOwner,
  };
  return LEDGER_KEYS.map((key) => `${key}=${values[key]}`).join(" | ");
}

/**
 * Writes one ledger line to the ledger file.
 * @param ledgerPath The path of the ledger file.
 * @param line The ledger line.
 * @throws When the folder or the file cannot be written.
 */
function writeLedgerLine(ledgerPath: string, line: string): void {
  try {
    mkdirSync(dirname(ledgerPath), { recursive: true });
    appendFileSync(ledgerPath, `${line}\n`, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`the runner cannot write the ledger line to ${ledgerPath}: ${message}`);
  }
}

/**
 * Builds the failure detail of one fail verdict.
 * @param file The file of the verdict.
 * @param verdict The fail verdict.
 * @returns The file, the time in the file as `at=<seconds>`, and the reason.
 * @throws When the verdict holds no time in the file (rule 6.7c).
 */
export function failureDetailOf(file: string, verdict: Verdict): string {
  const at = verdict.atSeconds;
  if (at === null || at === undefined || !Number.isFinite(at)) {
    throw new Error(`the fail verdict for ${file} holds no time in the file (rule 6.7c)`);
  }
  return `${file} at=${at}: ${verdict.reason}`;
}

/**
 * Runs one stage 2 pre-check and writes its ledger line first.
 * @param options The ledger path, the entry, the client, the files, the kind, and the rubric text.
 * @returns The ledger line, the call flag, the verdicts, the failures, and the evidence class.
 * @throws When a real client runs under Vitest, when the ledger line cannot be written, or when a
 *   fail verdict holds no time in the file.
 */
export async function runPreCheck(options: PreCheckOptions): Promise<PreCheckResult> {
  const { ledgerPath, entry, client, files, kind, rubricText } = options;

  if (!client.isMock && isTestProcess()) {
    throw new Error(
      "the runner refuses a real model client under Vitest; pass a mock client in a test " +
        "and run the live calibration outside the test runner",
    );
  }

  const ledgerLine = ledgerLineOf(entry, files.length);
  writeLedgerLine(ledgerPath, ledgerLine);

  const verdicts = await client.check({ files, kind, rubricText });
  const failures: string[] = [];
  verdicts.forEach((verdict, index) => {
    if (verdict.pass) return;
    const file = files[index] ?? `item ${index + 1}`;
    failures.push(failureDetailOf(file, verdict));
  });

  return {
    ledgerLine,
    modelCalled: true,
    verdicts,
    failures,
    evidence: client.isMock ? "mock" : "model pre-check",
  };
}
