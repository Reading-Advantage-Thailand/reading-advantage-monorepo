// @vitest-environment node
/**
 * Red tests for the Bangkok report date and the real period wording in the
 * year-file dry-run report (plan task 10.14, PM 2026-11-14, items 4 and 8).
 *
 * Contract pinned for the Green task 10.15:
 * - The report file is named `year-files-dry-run-<YYYY-MM-DD>.md` with the
 *   Asia/Bangkok calendar date of the run. A run at 2026-11-14 05:01 +0700
 *   gives 2026-11-14. A run at 2026-11-14 23:30 UTC gives 2026-11-15. The base
 *   uses the UTC date, so the first row names the wrong file.
 * - The run never deletes, renames, or overwrites a report file of an earlier
 *   date (`year-files-dry-run-2026-11-13.md` stays byte-equal).
 * - A dry run over fakes in the real shape gives the period of each file from
 *   the real wording: one PND.1, one PND.53, two PND.3 (a tick at the start of
 *   a line and a tick after an earlier month name), one PND.1 with no period
 *   wording, and one file with no text layer.
 *
 * The clock is injected through the fake system time (`Date` only), so the
 * Green may read `new Date()` or take a clock parameter. No row reads the
 * real clock for its assertion. Every Drive port is a fake. The Drive ids are
 * `fake-drive-<n>`, the file names are `fake-file-<n>.pdf`, and the texts are
 * the fake fixtures under the backend `__fixtures__/year-files/` folder.
 *
 * Rows that pass at the base are characterization rows. Their names end with
 * `(characterization)`.
 *
 * Anti-pattern coverage:
 * - A3: every count is a labeled integer (`report_date_rows=6`,
 *   `period_wording_files=6`).
 * - A4: the period-count rows first assert that the run listed six files.
 * - A9: every report goes to a temp folder; no row names a track path or run
 *   path.
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";
const ROOT_FOLDER_ID = "fake-drive-root";
const PARENT_FOLDER_ID = "fake-drive-folder-80";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const PDF_MIME_TYPE = "application/pdf";

/** The five full folder names of the real layout; position 0 is in the root. */
const FOLDER_NAMES = [
  "Fwd: เอกสารปี 2567 (Fwd: Document from 2024)",
  "Fwd: เอกสารปี 2568 (Fwd: Document from 2025)",
  "Fwd: เอกสารปี 2568-1 (Fwd: Document Year 2025-1)",
  "Fwd: เอกสารปี 2568-2 (Fwd: Document Year 2025-2)",
  "Fwd: เอกสารปี 2568-3 (Fwd: Document Year 2025-3)",
] as const;
const PARENT_FOLDER_NAME = "เอกสารบัญชีรายปี";

const FIXTURE_DIR = fileURLToPath(
  new URL(
    "../../../../../packages/backend/src/modules/accounting/__tests__/__fixtures__/year-files",
    import.meta.url,
  ),
);

/** The marker line that makes the fake text layer return null. */
const NO_TEXT_LAYER_MARKER = "no text layer";

/** The text of the old report that must stay untouched. */
const OLD_REPORT_TEXT = "no real sample\nan older report that stays as it is\n";
const OLD_REPORT_NAME = "year-files-dry-run-2026-11-13.md";

const TEMP_DIRS: string[] = [];
afterAll(() => {
  for (const dir of TEMP_DIRS) rmSync(dir, { recursive: true, force: true });
  vi.useRealTimers();
});

interface FakeEntry {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly byteSize?: number;
}

interface FakeFile extends FakeEntry {
  readonly body: Uint8Array;
}

type DryRunFunction = (
  request: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

/**
 * Reads one fixture text.
 * @param name The fixture file name.
 * @returns The fixture text.
 */
function fixtureText(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8");
}

/**
 * Loads the dry-run function through a soft loader.
 * @returns The function after two assertions.
 */
async function requireDryRun(): Promise<DryRunFunction> {
  const href = new URL(
    "../../../../../packages/backend/src/modules/accounting/intake.ts",
    import.meta.url,
  ).href;
  const module = (await import(/* @vite-ignore */ href)) as Record<string, unknown>;
  const dryRun = module["dryRunAccountingYearFiles"];
  expect(typeof dryRun, "intake.ts must export dryRunAccountingYearFiles").toBe(
    "function",
  );
  return dryRun as DryRunFunction;
}

/**
 * Builds one fake file.
 * @param index Serial of the file.
 * @param text Text to encode.
 * @returns The fake file.
 */
function makeFile(index: number, text: string): FakeFile {
  const body = Buffer.from(text, "utf8");
  return {
    id: `fake-drive-${index}`,
    name: `fake-file-${index}.pdf`,
    mimeType: PDF_MIME_TYPE,
    byteSize: body.byteLength,
    body,
  };
}

/**
 * Builds the fake Drive port of the real layout.
 * @param filesByFolder The files of each named folder, by position.
 * @returns The read-only source port.
 */
function createFakeSource(
  filesByFolder: readonly (readonly FakeFile[])[],
): Record<string, unknown> {
  const folderIds = FOLDER_NAMES.map((_name, index) => `fake-drive-folder-${index + 1}`);
  const named: FakeEntry[] = FOLDER_NAMES.map((name, index) => ({
    id: folderIds[index] ?? "",
    name,
    mimeType: FOLDER_MIME_TYPE,
  }));
  const entries = new Map<string, readonly FakeEntry[]>();
  entries.set(ROOT_FOLDER_ID, [
    ...named.slice(0, 1),
    { id: PARENT_FOLDER_ID, name: PARENT_FOLDER_NAME, mimeType: FOLDER_MIME_TYPE },
  ]);
  entries.set(PARENT_FOLDER_ID, named.slice(1));
  for (const [index, folderId] of folderIds.entries()) {
    entries.set(folderId, filesByFolder[index] ?? []);
  }
  const bodies = new Map(
    filesByFolder.flat().map((file) => [file.id, file.body] as const),
  );
  const read = async (input: { readonly fileId: string }): Promise<Uint8Array> => {
    const body = bodies.get(input.fileId);
    if (body === undefined) throw new Error("fake: unknown file id");
    return body;
  };
  return {
    async list(input: { readonly folderId: string }): Promise<readonly FakeEntry[]> {
      return (entries.get(input.folderId) ?? []).filter(
        (entry) => entry.mimeType !== FOLDER_MIME_TYPE,
      );
    },
    async listFolderEntries(input: {
      readonly folderId: string;
    }): Promise<readonly FakeEntry[]> {
      return entries.get(input.folderId) ?? [];
    },
    download: read,
    export: read,
  };
}

/**
 * Builds the fake text-layer port: UTF-8 decode, null for the marker.
 * @returns The text-layer port.
 */
function createFakeTextLayer(): Record<string, unknown> {
  return {
    async read(input: { readonly body: Uint8Array }): Promise<{ readonly text: string | null }> {
      const text = Buffer.from(input.body).toString("utf8");
      return { text: text.includes(NO_TEXT_LAYER_MARKER) ? null : text };
    },
  };
}

/** The six fake files of the real shape, one for each period wording case. */
const REAL_SHAPE_FILES: readonly (readonly [number, string])[] = [
  [0, fixtureText("pnd1-real-period.txt")],
  [1, fixtureText("pnd53-real-period.txt")],
  [2, fixtureText("pnd3-real-tick-first.txt")],
  [3, fixtureText("pnd3-real-tick-after.txt")],
  [4, fixtureText("pnd1-real-filing-date-only.txt")],
  [4, `no real sample\n${NO_TEXT_LAYER_MARKER}\n`],
];

/**
 * Runs one dry run over the real-shape fakes at one fake clock.
 * @param clock The ISO instant of the fake clock.
 * @param reportDir The report folder; a new temp folder when absent.
 * @returns The report path, the report text, and the report folder.
 */
async function runAt(
  clock: string,
  reportDir?: string,
): Promise<{ reportPath: string; report: string; dir: string }> {
  const dryRun = await requireDryRun();
  const dir = reportDir ?? mkdtempSync(join(tmpdir(), "accounting-dry-run-period-"));
  if (reportDir === undefined) TEMP_DIRS.push(dir);
  const filesByFolder: FakeFile[][] = FOLDER_NAMES.map(() => []);
  for (const [position, [folder, text]] of REAL_SHAPE_FILES.entries()) {
    filesByFolder[folder]?.push(makeFile(position + 1, text));
  }
  const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(clock));
  try {
    const result = await dryRun({
      actor: { accountId: ACCOUNT_ID, companyId: COMPANY_ID, role: "ACCOUNTANT" },
      folderId: ROOT_FOLDER_ID,
      source: createFakeSource(filesByFolder),
      textLayer: createFakeTextLayer(),
      reportDir: dir,
    });
    return {
      reportPath: String(result.reportPath),
      report: String(result.report),
      dir,
    };
  } finally {
    vi.useRealTimers();
    spy.mockRestore();
  }
}

/**
 * Returns the data rows of one report.
 * @param report The report text.
 * @returns The lines that start with one serial.
 */
function reportRows(report: string): string[] {
  return report.split("\n").filter((line) => /^file-\d{3} \| /u.test(line));
}

/**
 * Reads one field of one report row.
 * @param row The row line.
 * @param prefix The field prefix, with its `=` sign.
 * @returns The field value, or null when the row holds no such field.
 */
function readField(row: string, prefix: string): string | null {
  const part = row.split(" | ").find((candidate) => candidate.startsWith(prefix));
  return part === undefined ? null : part.slice(prefix.length);
}

/**
 * Reads the base name of a report path.
 * @param reportPath The report path.
 * @returns The last path segment.
 */
function baseName(reportPath: string): string {
  return reportPath.split("/").pop() ?? "";
}

describe("the report date is the Asia/Bangkok date of the run (task 10.14, item 4)", () => {
  it("names a run at 05:01 +0700 with that Bangkok date, not the UTC date of the day before", async () => {
    const run = await runAt("2026-11-14T05:01:00+07:00");
    expect(baseName(run.reportPath)).toBe("year-files-dry-run-2026-11-14.md");
  });

  it("names a run at 23:30 UTC with the next Bangkok date", async () => {
    const run = await runAt("2026-11-14T23:30:00Z");
    expect(baseName(run.reportPath)).toBe("year-files-dry-run-2026-11-15.md");
  });

  it("changes the date at 17:00 UTC, the Bangkok midnight", async () => {
    const before = await runAt("2026-11-14T16:59:59Z");
    expect(baseName(before.reportPath)).toBe("year-files-dry-run-2026-11-14.md");
    const after = await runAt("2026-11-14T17:00:00Z");
    expect(baseName(after.reportPath)).toBe("year-files-dry-run-2026-11-15.md");
  });

  it("names a midday run with the one date that UTC and Bangkok share (characterization)", async () => {
    const run = await runAt("2026-11-14T10:00:00Z");
    expect(baseName(run.reportPath)).toBe("year-files-dry-run-2026-11-14.md");
  });

  it("does not depend on the process time zone (characterization)", async () => {
    const saved = process.env.TZ;
    process.env.TZ = "Asia/Tokyo";
    try {
      const run = await runAt("2026-11-14T16:30:00Z");
      expect(baseName(run.reportPath)).toBe("year-files-dry-run-2026-11-14.md");
    } finally {
      if (saved === undefined) delete process.env.TZ;
      else process.env.TZ = saved;
    }
  });

  it("leaves the report of an earlier date unchanged and in place", async () => {
    const dir = mkdtempSync(join(tmpdir(), "accounting-dry-run-period-"));
    TEMP_DIRS.push(dir);
    writeFileSync(join(dir, OLD_REPORT_NAME), OLD_REPORT_TEXT, "utf8");
    const run = await runAt("2026-11-14T05:01:00+07:00", dir);
    expect(existsSync(join(dir, OLD_REPORT_NAME)), "the old report must stay").toBe(true);
    expect(readFileSync(join(dir, OLD_REPORT_NAME), "utf8")).toBe(OLD_REPORT_TEXT);
    expect(baseName(run.reportPath)).not.toBe(OLD_REPORT_NAME);
    expect(readdirSync(dir).sort()).toEqual(
      [OLD_REPORT_NAME, baseName(run.reportPath)].sort(),
    );
    console.log("report_date_rows=6");
  });
});

describe("the dry-run report over the real period wording (task 10.14, item 8)", () => {
  it("gives the period of each real-shape file and lists the two unreadable files", async () => {
    const run = await runAt("2026-11-14T10:00:00Z");
    const rows = reportRows(run.report);
    console.log(`period_wording_files=${rows.length}`);
    expect(rows.length, "the run must list the six fake files").toBe(6);
    const fields = rows.map((row) => ({
      type: readField(row, "type="),
      period: readField(row, "period="),
      textLayer: readField(row, "text-layer="),
    }));
    expect(fields).toEqual([
      { type: "wht-filing-pnd1", period: "2025-02-01..2025-02-28", textLayer: "yes" },
      { type: "wht-filing-pnd53", period: "2025-02-01..2025-02-28", textLayer: "yes" },
      { type: "wht-filing-pnd3", period: "2025-03-01..2025-03-31", textLayer: "yes" },
      { type: "wht-filing-pnd3", period: "2025-04-01..2025-04-30", textLayer: "yes" },
      { type: "unmatched", period: "period-unreadable", textLayer: "yes" },
      { type: "unmatched", period: "period-unreadable", textLayer: "no" },
    ]);
  });

  it("counts the periods, the text layers, and the unmatched files", async () => {
    const run = await runAt("2026-11-14T10:00:00Z");
    expect(reportRows(run.report).length, "the run must list the six fake files").toBe(6);
    const lines = run.report.split("\n");
    expect(lines).toContain("count with a text layer: 5");
    expect(lines).toContain("count without a text layer: 1");
    expect(lines).toContain("count unmatched: 2");
    const periodLine = lines.find((line) => line.startsWith("count by period: ")) ?? "";
    const entries = new Map(
      periodLine
        .slice("count by period: ".length)
        .split("; ")
        .map((entry) => {
          const cut = entry.lastIndexOf("=");
          return [entry.slice(0, cut), Number.parseInt(entry.slice(cut + 1), 10)] as const;
        }),
    );
    expect(Object.fromEntries(entries)).toEqual({
      "2025-02-01..2025-02-28": 2,
      "2025-03-01..2025-03-31": 1,
      "2025-04-01..2025-04-30": 1,
      "period-unreadable": 2,
    });
  });
});
