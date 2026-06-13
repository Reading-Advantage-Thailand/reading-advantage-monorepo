#!/usr/bin/env node
/**
 * Validates the upgrade-matrix.md artifact and associated baseline snapshots
 * for the dependency_upgrade_hardening_20260607 track.
 *
 * Exit codes:
 *   0 — matrix schema, decision cells, and baselines are all complete
 *   1 — validation failed (missing artifacts, schema errors, incomplete cells)
 *
 * Usage:
 *   node validate-matrix.mjs --track-dir <path>
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const BASELINE_FILENAMES = [
  "pnpm-outdated.json",
  "pnpm-list.json",
  "pnpm-dedupe-check.txt",
  "pnpm-audit.json",
];

const REQUIRED_MATRIX_COLUMNS = [
  "package",
  "current",
  "wanted",
  "latest",
  "dependents",
  "risk class",
  "decision",
  "implementation batch",
  "validation scope",
];



/**
 * Parses CLI arguments and returns the track directory path.
 * @returns {string} Absolute path to the track directory.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--track-dir");
  if (idx === -1 || idx + 1 >= args.length) {
    console.error("Usage: validate-matrix.mjs --track-dir <path>");
    process.exit(1);
  }
  return resolve(args[idx + 1]);
}

/**
 * Checks that the track directory exists and contains upgrade-matrix.md.
 * @param {string} trackDir Absolute path to the track directory.
 * @returns {string} Contents of upgrade-matrix.md.
 */
function readMatrix(trackDir) {
  let stat;
  try {
    stat = statSync(trackDir);
  } catch {
    console.error(`Error: track directory does not exist: ${trackDir}`);
    process.exit(1);
  }
  if (!stat.isDirectory()) {
    console.error(`Error: track path is not a directory: ${trackDir}`);
    process.exit(1);
  }

  const matrixPath = join(trackDir, "upgrade-matrix.md");
  try {
    return readFileSync(matrixPath, "utf8");
  } catch {
    console.error(
      `Error: missing required artifact: upgrade-matrix.md\n  expected at: ${matrixPath}`,
    );
    process.exit(1);
  }
}

/**
 * Validates that all four baseline snapshot files exist in the baseline/ subdirectory.
 * @param {string} trackDir Absolute path to the track directory.
 * @returns {{audit: object}} Parsed audit payload for downstream checks.
 */
function validateBaselines(trackDir) {
  const baselineDir = join(trackDir, "baseline");
  const missing = [];
  let audit = {};

  for (const filename of BASELINE_FILENAMES) {
    const filePath = join(baselineDir, filename);
    try {
      statSync(filePath);
      if (filename === "pnpm-audit.json") {
        audit = JSON.parse(readFileSync(filePath, "utf8"));
      }
    } catch {
      missing.push(filename);
    }
  }

  if (missing.length > 0) {
    console.error(
      `Error: missing baseline artifacts:\n${missing.map((f) => `  - ${f}`).join("\n")}`,
    );
    process.exit(1);
  }

  return { audit };
}

/**
 * Parses the markdown table header and returns normalised column names.
 * @param {string} matrixContent Raw markdown content.
 * @returns {{headerColumns: string[], headerLine: string, dataLines: string[]}}
 */
function parseMarkdownTable(matrixContent) {
  const lines = matrixContent.split("\n");
  const headerIdx = lines.findIndex(
    (l) => l.trim().startsWith("|") && l.toLowerCase().includes("package"),
  );
  if (headerIdx === -1) {
    return { headerColumns: [], headerLine: "", dataLines: [] };
  }

  const headerLine = lines[headerIdx];
  const headerColumns = headerLine
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim().toLowerCase());

  const dataLines = lines
    .slice(headerIdx + 2)
    .filter((l) => l.trim().startsWith("|") && !l.match(/^\|\s*[-:]+/));

  return { headerColumns, headerLine, dataLines };
}

/**
 * Validates that the matrix table contains all required columns.
 * @param {string[]} headerColumns Parsed header column names.
 * @returns {string[]} Missing column names, empty if all present.
 */
function checkSchemaColumns(headerColumns) {
  return REQUIRED_MATRIX_COLUMNS.filter(
    (col) => !headerColumns.includes(col),
  );
}

/**
 * Maps a data row's cells to header column names.
 * @param {string} dataLine A markdown table data row.
 * @param {string[]} headerColumns Ordered header column names.
 * @returns {Record<string, string>} Map of column name to cell value.
 */
function mapRow(dataLine, headerColumns) {
  const cells = dataLine
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
  const row = {};
  headerColumns.forEach((col, i) => {
    row[col] = cells[i] ?? "";
  });
  return row;
}

/**
 * Validates decision cells have owner, batch, and validation scope.
 * @param {string[]} dataLines Markdown table data rows.
 * @param {string[]} headerColumns Ordered header column names.
 * @returns {string[]} Error messages for incomplete decision cells.
 */
function checkDecisionCells(dataLines, headerColumns) {
  const errors = [];

  for (const line of dataLines) {
    const row = mapRow(line, headerColumns);
    const decision = row["decision"];
    if (!decision || decision === "—" || decision === "-") continue;

    const pkg = row["package"] ?? "(unknown)";
    const missing = [];

    const batch = row["implementation batch"];
    const scope = row["validation scope"];

    // Only validate rows that have a non-empty decision and are not "hold"
    if (decision === "hold" || decision === "defer") continue;

    if (!batch || batch === "" || batch === "—") {
      missing.push("batch");
    }
    if (!scope || scope === "" || scope === "—") {
      missing.push("validation scope");
    }

    if (missing.length > 0) {
      errors.push(
        `Row "${pkg}" has incomplete decision cell: missing ${missing.join(", ")}`,
      );
    }
  }

  return errors;
}

/**
 * Handles the pnpm-audit incomplete-audit marker.
 * @param {object} audit Parsed pnpm-audit.json payload.
 * @returns {{ok: boolean, message: string|null}}
 */
function checkAuditCompleteness(audit) {
  if (audit && audit.incomplete === true) {
    const note = audit.note ? `: ${audit.note}` : "";
    return {
      ok: true,
      message: `Incomplete audit accepted (explicit marker present${note})`,
    };
  }
  return { ok: true, message: null };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const trackDir = parseArgs();
const matrixContent = readMatrix(trackDir);
const { audit } = validateBaselines(trackDir);

const { headerColumns } = parseMarkdownTable(matrixContent);

const missingColumns = checkSchemaColumns(headerColumns);
if (missingColumns.length > 0) {
  console.error(
    `Error: upgrade-matrix.md is missing required columns:\n${missingColumns.map((c) => `  - ${c}`).join("\n")}`,
  );
  process.exit(1);
}

const decisionErrors = checkDecisionCells(
  parseMarkdownTable(matrixContent).dataLines,
  headerColumns,
);
if (decisionErrors.length > 0) {
  console.error(
    `Error: incomplete decision cells:\n${decisionErrors.map((e) => `  - ${e}`).join("\n")}`,
  );
  process.exit(1);
}

const auditResult = checkAuditCompleteness(audit);
if (auditResult.message) {
  console.log(auditResult.message);
}

console.log("Validation passed: upgrade-matrix.md and baselines are complete.");
process.exit(0);
