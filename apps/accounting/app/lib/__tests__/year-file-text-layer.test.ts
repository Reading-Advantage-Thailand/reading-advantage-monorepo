// @vitest-environment node
/**
 * Red tests for the `pdftotext` text-layer adapter of the year-file dry-run
 * runner of the track `accounting_drive_intake_20261109` (plan task 10.12,
 * Review B finding F1001).
 *
 * The runner `apps/accounting/scripts/year-file-dry-run.ts` exports
 * `createPdftotextLayer()`. It pipes the PDF bytes to `/usr/bin/pdftotext`
 * through `execFile`. Review B found no per-file timeout, so a malformed PDF
 * can hold the runner until the outer limit. This file pins:
 *
 * - the `execFile` options hold a positive integer `timeout` (at most five
 *   minutes) and keep a positive `maxBuffer`;
 * - a timed-out file resolves `{ text: null }`, which the dry-run lists as
 *   text layer `no`, and does not reject, so the run does not crash;
 * - the no-shell, stdin-only rule of Q17 stays: the fixed binary path, the
 *   fixed arguments, no `shell` option, and the bytes go to stdin only.
 *
 * Every row mocks `node:child_process`. No row starts a real process, reads a
 * real PDF, or calls Drive. The bytes are synthetic.
 *
 * Anti-pattern coverage:
 * - A3: counts are labeled integers (`exec_file_calls=1`, `timeout_ms=<n>`).
 * - A4: every option row first asserts that `execFile` ran once.
 * - A5: every failure names the option or behavior it proves.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

/** The longest per-file timeout that this file accepts: five minutes. */
const MAX_TIMEOUT_MS = 5 * 60 * 1000;

/** The recorded arguments of one fake `execFile` call. */
interface ExecFileCall {
  readonly path: string;
  readonly args: readonly string[];
  readonly options: Record<string, unknown>;
  readonly stdinWrites: Uint8Array[];
}

/** How the fake `execFile` ends one call. */
type FakeOutcome =
  | { readonly kind: "text"; readonly stdout: string }
  | { readonly kind: "timeout" }
  | { readonly kind: "buffer" };

/** The calls of the fake `execFile` of the current row. */
let calls: ExecFileCall[] = [];

/**
 * Installs a fake `node:child_process` whose `execFile` ends each call with
 * one outcome after the stdin end, as a real child process would.
 * @param outcome How each call ends.
 */
function installFakeExecFile(outcome: FakeOutcome): void {
  calls = [];
  vi.doMock("node:child_process", () => ({
    execFile: (
      path: string,
      args: readonly string[],
      options: Record<string, unknown>,
      callback: (error: Error | null, stdout: string) => void,
    ) => {
      const call: ExecFileCall = { path, args, options, stdinWrites: [] };
      calls.push(call);
      return {
        stdin: {
          /** Accepts the error listener of the adapter. */
          on: () => undefined,
          /** Records the bytes and ends the fake process. */
          end: (bytes: Uint8Array) => {
            call.stdinWrites.push(bytes);
            setImmediate(() => {
              if (outcome.kind === "text") {
                callback(null, outcome.stdout);
                return;
              }
              const error = Object.assign(
                new Error(
                  outcome.kind === "timeout"
                    ? "Command failed: timed out"
                    : "stdout maxBuffer length exceeded",
                ),
                outcome.kind === "timeout"
                  ? { killed: true, signal: "SIGTERM", code: null }
                  : { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" },
              );
              callback(error, "");
            });
          },
        },
      };
    },
  }));
}

/** The port shape of the text-layer adapter that these rows call. */
interface TextLayerPort {
  read(input: {
    readonly companyId: string;
    readonly mimeType: string;
    readonly body: Uint8Array;
  }): Promise<{ readonly text: string | null }>;
}

/**
 * Loads the runner through a soft loader, so a missing export fails an
 * assertion instead of the whole file load.
 * @returns The text-layer port.
 */
async function loadTextLayer(): Promise<TextLayerPort> {
  vi.resetModules();
  const href = new URL(
    "../../../scripts/year-file-dry-run.ts",
    import.meta.url,
  ).href;
  const module = (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
  expect(
    typeof module["createPdftotextLayer"],
    "apps/accounting/scripts/year-file-dry-run.ts must export the function createPdftotextLayer",
  ).toBe("function");
  return (module["createPdftotextLayer"] as () => TextLayerPort)();
}

/** The input of every read: one synthetic body. */
const READ_INPUT = {
  companyId: "33333333-3333-4333-8333-333333333333",
  mimeType: "application/pdf",
  body: Buffer.from("synthetic bytes, not a real pdf"),
} as const;

afterEach(() => {
  vi.doUnmock("node:child_process");
  vi.resetModules();
});

describe("the pdftotext adapter of the dry-run runner (Review B F1001)", () => {
  it("passes a positive per-file timeout and keeps maxBuffer to execFile (exec_file_calls=1)", async () => {
    installFakeExecFile({ kind: "text", stdout: "some text" });
    const layer = await loadTextLayer();
    const result = await layer.read(READ_INPUT);
    console.log(`exec_file_calls=${calls.length}`);
    expect(calls, "exec_file_calls=1: one read runs execFile once").toHaveLength(1);
    expect(result, "a clean run returns the text").toEqual({ text: "some text" });
    const options = calls[0]?.options ?? {};
    console.log(`timeout_ms=${String(options.timeout)}`);
    expect(
      typeof options.timeout === "number" &&
        Number.isInteger(options.timeout) &&
        options.timeout > 0 &&
        options.timeout <= MAX_TIMEOUT_MS,
      `the execFile options must hold a positive integer timeout of at most ${MAX_TIMEOUT_MS} ms (F1001); got ${String(options.timeout)}`,
    ).toBe(true);
    expect(
      typeof options.maxBuffer === "number" && options.maxBuffer > 0,
      "the execFile options must keep a positive maxBuffer",
    ).toBe(true);
  });

  it("lists a timed-out file as text layer no and does not reject (timed_out_rejections=0)", async () => {
    installFakeExecFile({ kind: "timeout" });
    const layer = await loadTextLayer();
    let rejected = 0;
    let result: { readonly text: string | null } | undefined;
    try {
      result = await layer.read(READ_INPUT);
    } catch {
      rejected += 1;
    }
    console.log(`timed_out_rejections=${rejected}`);
    expect(calls, "the timed-out read must run execFile once (A4)").toHaveLength(1);
    expect(
      typeof calls[0]?.options.timeout,
      "the timed-out read must have run with a timeout option (F1001)",
    ).toBe("number");
    expect(rejected, "timed_out_rejections=0: a timed-out file must not crash the run").toBe(0);
    expect(result, "a timed-out file resolves text null, which the dry-run lists as text layer no").toEqual({
      text: null,
    });
  });

  it("returns text null for a file that exceeds the output buffer (buffer_rejections=0)", async () => {
    installFakeExecFile({ kind: "buffer" });
    const layer = await loadTextLayer();
    const result = await layer.read(READ_INPUT);
    expect(calls, "one read runs execFile once (A4)").toHaveLength(1);
    expect(result).toEqual({ text: null });
  });

  it("keeps the no-shell, stdin-only rule (shell_options=0, stdin_writes=1)", async () => {
    installFakeExecFile({ kind: "text", stdout: "some text" });
    const layer = await loadTextLayer();
    await layer.read(READ_INPUT);
    expect(calls, "one read runs execFile once (A4)").toHaveLength(1);
    const call = calls[0];
    expect(call?.path, "the fixed binary path").toBe("/usr/bin/pdftotext");
    expect(call?.args, "the fixed arguments: UTF-8, stdin in, stdout out").toEqual([
      "-enc",
      "UTF-8",
      "-",
      "-",
    ]);
    console.log(`shell_options=${call?.options.shell === undefined || call.options.shell === false ? 0 : 1}`);
    expect(
      call?.options.shell === undefined || call.options.shell === false,
      "no shell option: the file bytes never reach a shell",
    ).toBe(true);
    console.log(`stdin_writes=${call?.stdinWrites.length ?? 0}`);
    expect(call?.stdinWrites, "the bytes go to stdin once").toHaveLength(1);
    expect(
      Buffer.from(call?.stdinWrites[0] ?? new Uint8Array()).equals(Buffer.from(READ_INPUT.body)),
      "the bytes on stdin equal the PDF bytes",
    ).toBe(true);
    expect(
      call?.args.some((argument) => argument.includes("fake") || argument.endsWith(".pdf")),
      "no file path argument: no PDF lands on disk",
    ).toBe(false);
  });
});
