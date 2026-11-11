// @vitest-environment node
// Phase 5 red test for plan task 5.4: the stage 2 pre-check runner.
//
// The runner lives in `apps/storytime/scripts/checks/runner.ts`. This file is the contract.
//
// Contract of `runner.ts`:
//   - It exports `runPreCheck(options)`. The options hold the ledger path, the ledger entry,
//     the model client, the files of the call, the rubric kind, and the rubric text.
//   - The ledger entry holds the nine fields of P5.1: `date` (UTC), `task`, `purpose`,
//     `model` (the model id), `unitPrice`, `priceReadDate` (the date the role read the price),
//     `itemCount`, `estimatedTotal`, and `approvalOwner`.
//   - The runner writes one ledger line before it makes the model call. The line holds nine
//     `key=value` pairs separated by ` | `. The keys are `date`, `task`, `purpose`, `model`,
//     `unit_price`, `price_read_date`, `item_count`, `estimated_total`, and `approval_owner`.
//     The item count is the count of the files of the call. The line holds no hash and no
//     checksum (AGENTS.md hashing policy).
//   - When the runner cannot write the ledger line, it throws and it never calls the model.
//     A run with no ledger line is a gate failure (P5.1).
//   - The model client holds `id`, `isMock`, and `check(request)`. The request holds the files,
//     the rubric kind, and the rubric text. The client returns one verdict per file.
//   - A verdict holds `pass`, `reason`, and `atSeconds` (the time in the file). A fail without
//     a time breaks rule 6.7c, and the runner throws.
//   - The runner returns the ledger line, the model call flag, the verdicts, one failure detail
//     per fail, and the evidence class. A failure detail names the file, the reason, and the
//     time in the file as `at=<seconds>`. The evidence class is `mock` for a mock client and
//     `model pre-check` for a real client. A mock result never counts as a pre-check (P5.9).
//   - The runner refuses a real client when the process runs under Vitest, and it never calls
//     that client (P5.9). The refusal error names Vitest.
//   - The runner sends the files, the rubric kind, and the rubric text to the client.
//   - The runner refuses a call whose client returns fewer verdicts than the files. It throws, or
//     it reports the gap in `failures`. A file with no verdict never looks clean (A4).
//   - The ledger line holds the item count of the entry, `entry.itemCount`, when that count and
//     the count of the files differ.
//
// The test uses a mock client only. The test never calls a model and never spends money.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The runner script of task 5.4. */
const RUNNER_PATH = resolve(app, "scripts", "checks", "runner.ts");

/** The nine ledger keys of P5.1, in the order the runner writes them. */
const LEDGER_KEYS = [
  "date",
  "task",
  "purpose",
  "model",
  "unit_price",
  "price_read_date",
  "item_count",
  "estimated_total",
  "approval_owner",
];

/** One ledger entry. Its fields are the fields of P5.1. */
interface LedgerEntry {
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
interface Verdict {
  /** Whether the file passes the rubric. */
  pass: boolean;
  /** The reason of the verdict. */
  reason: string;
  /** The time in the file, in seconds. */
  atSeconds: number | null;
}

/** The request the runner sends to the model client. */
interface ModelRequest {
  /** The files of the call. */
  files: string[];
  /** The rubric kind of the call. */
  kind: string;
  /** The rubric text of the call. */
  rubricText: string;
}

/** The model client of the runner. */
interface ModelClient {
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
interface RunnerOptions {
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

/** The result of one pre-check run. */
interface RunnerResult {
  /** The ledger line the runner wrote. */
  ledgerLine: string;
  /** Whether the runner called the model. */
  modelCalled: boolean;
  /** The verdicts of the call. */
  verdicts: Verdict[];
  /** One detail line per fail. */
  failures: string[];
  /** The evidence class of the result. */
  evidence: string;
}

/** The folder that holds the ledger files of the test. */
const scratch = mkdtempSync(resolve(tmpdir(), "storytime-phase5-runner-"));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

/**
 * Reads the runner script.
 * @returns The exports of the runner script.
 */
async function loadRunner(): Promise<Record<string, unknown>> {
  expect(existsSync(RUNNER_PATH), `Missing ${RUNNER_PATH}`).toBe(true);
  const module = (await import(/* @vite-ignore */ new URL(`file://${RUNNER_PATH}`).href)) as Record<
    string,
    unknown
  >;
  return module;
}

/**
 * Checks that the runner script exists.
 *
 * The check runs before any promise. A test that catches an error would otherwise pass on the
 * missing script and prove nothing (rule 11.1).
 */
function expectRunnerExists(): void {
  expect(existsSync(RUNNER_PATH), `Missing ${RUNNER_PATH}`).toBe(true);
}

/**
 * Runs the runner once.
 * @param options The options of the run.
 * @returns The result of the run.
 */
async function runRunner(options: RunnerOptions): Promise<RunnerResult> {
  const script = await loadRunner();
  const runPreCheck = script["runPreCheck"] as (
    options: RunnerOptions,
  ) => Promise<RunnerResult>;
  expect(typeof runPreCheck, "the runner script has no function runPreCheck").toBe("function");
  return runPreCheck(options);
}

/**
 * Reads the pairs of one ledger line.
 * @param line The ledger line.
 * @returns The pairs of the line, each as a key and a value.
 */
function pairsOf(line: string): Array<[string, string]> {
  return line
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => {
      const at = part.indexOf("=");
      return [part.slice(0, at).trim(), part.slice(at + 1).trim()] as [string, string];
    });
}

/**
 * Reads the ledger lines of a ledger file that hold the item count.
 * @param text The text of the ledger file.
 * @returns The lines that name the item count.
 */
function ledgerLinesOf(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.includes("item_count="));
}

/**
 * Gives the ledger entry of the test.
 * @returns The entry with the known values of the test.
 */
function entryOf(): LedgerEntry {
  return {
    date: "2026-11-11",
    task: "5.4",
    purpose: "stage 2 rubric calibration",
    model: "deepseek-chat",
    unitPrice: "0.28 USD per 1M tokens",
    priceReadDate: "2026-11-10",
    itemCount: 2,
    estimatedTotal: "0.56 USD",
    approvalOwner: "daniel",
  };
}

/**
 * Gives the files of the test call.
 * @returns The two file names of the call.
 */
function filesOf(): string[] {
  return ["l2/media/w01/words/wa-net.mp3", "l2/media/w01/words/wa-pip.mp3"];
}

/**
 * The mock provider of the test. It gives a fixed verdict and it never calls a model.
 */
class MockProvider implements ModelClient {
  /** The model id of the mock. */
  readonly id = "mock-provider";

  /** The mock flag of the client. */
  readonly isMock = true;

  /** The number of calls the mock received. */
  calls = 0;

  /** The text of the ledger file at the moment of the call. */
  ledgerAtCall: string | null = null;

  /** The path of the ledger file the mock reads at the call. */
  private readonly ledgerPath: string;

  /** The verdicts the mock gives. */
  private readonly verdicts: Verdict[];

  /**
   * Makes the mock provider.
   * @param ledgerPath The path of the ledger file the mock reads at the call.
   * @param verdicts The verdicts the mock gives.
   */
  constructor(ledgerPath: string, verdicts: Verdict[]) {
    this.ledgerPath = ledgerPath;
    this.verdicts = verdicts;
  }

  /**
   * Gives the fixed verdicts and records the ledger text.
   * @param request The files, the rubric kind, and the rubric text.
   * @returns One verdict per file.
   */
  async check(request: ModelRequest): Promise<Verdict[]> {
    this.calls += 1;
    this.ledgerAtCall = existsSync(this.ledgerPath)
      ? readFileSync(this.ledgerPath, "utf8")
      : "";
    return this.verdicts.slice(0, Math.max(request.files.length, 1));
  }
}

/**
 * Gives a client that claims to be a real provider.
 * @returns The client that counts its calls and never runs a model.
 */
function realClient(): { client: ModelClient; calls: () => number } {
  let calls = 0;
  const client: ModelClient = {
    id: "real-provider",
    isMock: false,
    check: async () => {
      calls += 1;
      throw new Error("the test must never call a real provider");
    },
  };
  return { client, calls: () => calls };
}

/**
 * The mock provider that returns exactly the verdicts it holds.
 * It never cuts its list, so a test can give the runner fewer verdicts than files.
 */
class FixedVerdictProvider implements ModelClient {
  /** The model id of the mock. */
  readonly id = "fixed-provider";

  /** The mock flag of the client. */
  readonly isMock = true;

  /** The number of calls the mock received. */
  calls = 0;

  /** The files of the last call. */
  files: string[] = [];

  /** The verdicts the mock gives. */
  private readonly verdicts: Verdict[];

  /**
   * Makes the mock provider.
   * @param verdicts The verdicts the mock gives, with no cut.
   */
  constructor(verdicts: Verdict[]) {
    this.verdicts = verdicts;
  }

  /**
   * Gives the verdicts and records the call.
   * @param request The files, the rubric kind, and the rubric text.
   * @returns The verdicts of the mock, with no cut.
   */
  async check(request: ModelRequest): Promise<Verdict[]> {
    this.calls += 1;
    this.files = request.files.slice();
    return this.verdicts.slice();
  }
}

/**
 * Runs the runner once and gives the outcome.
 * @param options The options of the run.
 * @returns The thrown message, or the result of the run.
 */
async function outcomeOf(
  options: RunnerOptions,
): Promise<{ error: string; result: RunnerResult | null }> {
  try {
    return { error: "", result: await runRunner(options) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), result: null };
  }
}

describe("Phase 5 stage 2 pre-check runner (rule 6.7 and P5.1)", () => {
  it("names the runner script of task 5.4", () => {
    expect(existsSync(RUNNER_PATH), `Missing ${RUNNER_PATH}`).toBe(true);
  });

  it("writes one ledger line with the nine fields of P5.1 before the model call", async () => {
    const ledgerPath = resolve(scratch, "ledger-fields.md");
    const entry = entryOf();
    const client = new MockProvider(ledgerPath, [{ pass: true, reason: "ok", atSeconds: null }]);
    const result = await runRunner({
      ledgerPath,
      entry,
      client,
      files: filesOf(),
      kind: "word cut",
      rubricText: "the whole word, no part of the next word",
    });
    expect(client.calls, "the runner did not call the model client").toBe(1);
    expect(result.modelCalled, "the runner does not report the model call").toBe(true);
    const text = readFileSync(ledgerPath, "utf8");
    const lines = ledgerLinesOf(text);
    expect(lines.length, "the ledger file does not hold exactly one ledger line").toBe(1);
    const pairs = pairsOf(lines[0] ?? "");
    expect(
      pairs.map(([key]) => key),
      "the ledger line does not hold the nine fields of P5.1 in order",
    ).toEqual(LEDGER_KEYS);
    const values = Object.fromEntries(pairs);
    expect(values["date"], "the ledger line does not hold the UTC date").toBe(entry.date);
    expect(values["task"], "the ledger line does not hold the task").toBe(entry.task);
    expect(values["purpose"], "the ledger line does not hold the purpose").toBe(entry.purpose);
    expect(values["model"], "the ledger line does not hold the model id").toBe(entry.model);
    expect(values["unit_price"], "the ledger line does not hold the unit price").toBe(
      entry.unitPrice,
    );
    expect(
      values["price_read_date"],
      "the ledger line does not hold the date the price was read",
    ).toBe(entry.priceReadDate);
    expect(values["item_count"], "the ledger line does not hold the item count").toBe(
      String(entry.itemCount),
    );
    expect(values["estimated_total"], "the ledger line does not hold the estimated total").toBe(
      entry.estimatedTotal,
    );
    expect(values["approval_owner"], "the ledger line does not hold the approval owner").toBe(
      entry.approvalOwner,
    );
    expect(text, "the ledger line holds a hash").not.toMatch(/[0-9a-f]{32,}/i);
    expect(text, "the ledger line names a hash or a checksum").not.toMatch(
      /hash|checksum|sha-?256/i,
    );
  });

  it("writes the ledger line before the model call starts", async () => {
    const ledgerPath = resolve(scratch, "ledger-order.md");
    const client = new MockProvider(ledgerPath, [{ pass: true, reason: "ok", atSeconds: null }]);
    await runRunner({
      ledgerPath,
      entry: entryOf(),
      client,
      files: filesOf(),
      kind: "word cut",
      rubricText: "the whole word, no part of the next word",
    });
    const atCall = client.ledgerAtCall ?? "";
    const lines = ledgerLinesOf(atCall);
    expect(lines.length, "the ledger file had no ledger line at the moment of the model call").toBe(1);
    expect(atCall, "the ledger line did not come before the model call").toContain(
      entryOf().estimatedTotal,
    );
  });

  it("makes no model call when it cannot write the ledger line", async () => {
    expectRunnerExists();
    const blocker = resolve(scratch, "not-a-folder");
    writeFileSync(blocker, "this file blocks the ledger path", "utf8");
    const ledgerPath = resolve(blocker, "ledger.md");
    const client = new MockProvider(ledgerPath, [{ pass: true, reason: "ok", atSeconds: null }]);
    await expect(
      runRunner({
        ledgerPath,
        entry: entryOf(),
        client,
        files: filesOf(),
        kind: "word cut",
        rubricText: "the whole word, no part of the next word",
      }),
    ).rejects.toThrow(/ledger/i);
    expect(client.calls, "the runner called the model without a ledger line").toBe(0);
  });

  it("holds the reason and the time in the file for each fail", async () => {
    const ledgerPath = resolve(scratch, "ledger-fail.md");
    const client = new MockProvider(ledgerPath, [
      { pass: false, reason: "the cut starts inside the next word", atSeconds: 1.25 },
      { pass: true, reason: "ok", atSeconds: null },
    ]);
    const result = await runRunner({
      ledgerPath,
      entry: entryOf(),
      client,
      files: filesOf(),
      kind: "word cut",
      rubricText: "the whole word, no part of the next word",
    });
    expect(result.failures.length, "the result holds no failure detail").toBe(1);
    const detail = result.failures[0] ?? "";
    expect(detail, "the failure detail holds no reason").toContain(
      "the cut starts inside the next word",
    );
    expect(detail, "the failure detail holds no time in the file").toMatch(/at=1\.25/);
    expect(detail, "the failure detail names no file").toContain("wa-net.mp3");
  });

  it("throws when a fail holds no time in the file", async () => {
    expectRunnerExists();
    const ledgerPath = resolve(scratch, "ledger-no-time.md");
    const client = new MockProvider(ledgerPath, [
      { pass: false, reason: "the cut starts inside the next word", atSeconds: null },
    ]);
    await expect(
      runRunner({
        ledgerPath,
        entry: entryOf(),
        client,
        files: filesOf(),
        kind: "word cut",
        rubricText: "the whole word, no part of the next word",
      }),
    ).rejects.toThrow(/atSeconds|time in the file|no time/i);
  });

  it("labels a mock result as a mock and never as a pre-check", async () => {
    const ledgerPath = resolve(scratch, "ledger-mock.md");
    const client = new MockProvider(ledgerPath, [{ pass: true, reason: "ok", atSeconds: null }]);
    const result = await runRunner({
      ledgerPath,
      entry: entryOf(),
      client,
      files: filesOf(),
      kind: "word cut",
      rubricText: "the whole word, no part of the next word",
    });
    expect(result.evidence, "the result does not label the mock run").toBe("mock");
    expect(result.evidence, "the result counts a mock as a pre-check").not.toBe("model pre-check");
  });

  it("never calls a real client inside a test", async () => {
    expectRunnerExists();
    const ledgerPath = resolve(scratch, "ledger-real.md");
    const { client, calls } = realClient();
    let message = "";
    try {
      await runRunner({
        ledgerPath,
        entry: entryOf(),
        client,
        files: filesOf(),
        kind: "word cut",
        rubricText: "the whole word, no part of the next word",
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(calls(), "the runner called a real client inside a test").toBe(0);
    expect(message, "the runner did not refuse a real client inside a test").not.toBe("");
  });

  it("refuses a call whose client returns no verdict", async () => {
    expectRunnerExists();
    const ledgerPath = resolve(scratch, "ledger-no-verdict.md");
    const client = new FixedVerdictProvider([]);
    const outcome = await outcomeOf({
      ledgerPath,
      entry: entryOf(),
      client,
      files: filesOf(),
      kind: "word cut",
      rubricText: "the whole word, no part of the next word",
    });
    expect(client.calls, "the runner did not call the model client").toBe(1);
    const refused = outcome.error !== "" || (outcome.result?.failures ?? []).length > 0;
    expect(refused, "the runner accepted a call whose client returned no verdict").toBe(true);
  });

  it("refuses a call whose client returns fewer verdicts than files", async () => {
    expectRunnerExists();
    const ledgerPath = resolve(scratch, "ledger-short-verdicts.md");
    const client = new FixedVerdictProvider([{ pass: true, reason: "ok", atSeconds: null }]);
    const outcome = await outcomeOf({
      ledgerPath,
      entry: entryOf(),
      client,
      files: filesOf(),
      kind: "word cut",
      rubricText: "the whole word, no part of the next word",
    });
    expect(client.calls, "the runner did not call the model client").toBe(1);
    expect(client.files.length, "the runner sent no files to the client").toBe(filesOf().length);
    const refused = outcome.error !== "" || (outcome.result?.failures ?? []).length > 0;
    expect(refused, "the runner accepted a call with fewer verdicts than files").toBe(true);
  });

  it("writes the item count of the ledger entry when it differs from the count of the files", async () => {
    expectRunnerExists();
    const ledgerPath = resolve(scratch, "ledger-item-count.md");
    const entry = { ...entryOf(), itemCount: 3 };
    const client = new FixedVerdictProvider([
      { pass: true, reason: "ok", atSeconds: null },
      { pass: true, reason: "ok", atSeconds: null },
    ]);
    const outcome = await outcomeOf({
      ledgerPath,
      entry,
      client,
      files: filesOf(),
      kind: "word cut",
      rubricText: "the whole word, no part of the next word",
    });
    if (outcome.error !== "") {
      expect(
        outcome.error,
        "the runner refused the call for a reason other than the count of the items",
      ).toMatch(/count|item/i);
      return;
    }
    const values = Object.fromEntries(pairsOf(outcome.result?.ledgerLine ?? ""));
    expect(
      values["item_count"],
      "the ledger line takes the count of the files, not the count of the entry",
    ).toBe("3");
  });
});
