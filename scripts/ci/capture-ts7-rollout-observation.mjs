#!/usr/bin/env node

/** Captures one schema-compatible TypeScript 7 CI rollout observation. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Reads required named command-line arguments without accepting positional ambiguity.
 * @param {string[]} argumentsList Command-line arguments after the node executable.
 * @returns {Map<string, string>} Parsed argument values keyed by their flag names.
 * @throws When a required value is missing or a flag has no value.
 */
function parseArguments(argumentsList) {
  const values = new Map();
  for (let index = 0; index < argumentsList.length; index += 2) {
    const name = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!name?.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`expected --name value pair, received ${argumentsList.slice(index).join(" ")}`);
    }
    values.set(name, value);
  }
  for (const name of [
    "--run-id",
    "--output",
    "--ts6-exit",
    "--ts7-exit",
    "--ts6-log",
    "--ts7-log",
    "--ts7-repeat-exit",
    "--ts7-repeat-log",
    "--ts6-time",
    "--ts7-time",
    "--ts7-repeat-time",
    "--phase3-parity-exit",
    "--phase3-parity-summary",
    "--phase3-parity-time",
  ]) {
    if (!values.has(name)) {
      throw new Error(`missing required ${name}`);
    }
  }
  return values;
}

/**
 * Reads one numeric shell exit-status file written by the CI workflow.
 * @param {string} path Path to the exit-status file.
 * @returns {number} The parsed integer exit status.
 * @throws When the file does not contain one non-negative integer.
 */
async function readExitStatus(path) {
  const raw = (await readFile(path, "utf8")).trim();
  if (!/^\d+$/.test(raw)) {
    throw new Error(`invalid exit status in ${path}: ${raw}`);
  }
  return Number.parseInt(raw, 10);
}

/**
 * Extracts Turbo cache information from one raw task log.
 * @param {string} content Raw workflow command output.
 * @returns {string} The final Turbo cache summary, or an explicit unavailable marker.
 */
function cacheState(content) {
  const matches = [...content.matchAll(/Cached:\s+([^\r\n]+)/g)];
  return matches.at(-1)?.[1]?.trim() ?? "unavailable";
}

/**
 * Normalizes diagnostic lines while discarding Turbo's transport envelope and ordering.
 * @param {string} content Raw workflow command output.
 * @returns {string[]} Sorted actionable TypeScript diagnostic lines.
 */
function diagnostics(content) {
  const lines = [];
  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine;
    try {
      const parsed = JSON.parse(rawLine);
      if (typeof parsed.text === "string") {
        line = parsed.text;
      }
    } catch {
      // A plain task stream is valid and is handled as-is.
    }
    if (/\berror TS\d+:/.test(line)) {
      lines.push(line.replace(/\\/g, "/").trim());
    }
  }
  return [...new Set(lines)].sort();
}

/**
 * Counts diagnostics present in exactly one compiler lane.
 * @param {string[]} left First normalized diagnostic set.
 * @param {string[]} right Second normalized diagnostic set.
 * @returns {number} Number of non-equivalent diagnostics.
 */
function symmetricDifferenceCount(left, right) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return [...leftSet].filter((item) => !rightSet.has(item)).length
    + [...rightSet].filter((item) => !leftSet.has(item)).length;
}

/**
 * Reads GNU time's peak-resident-set-size value.
 * @param {string} content GNU time verbose output.
 * @returns {number} Peak RSS in KiB, or zero when the tool emitted no value.
 */
function peakRssKib(content) {
  const match = content.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/**
 * Interprets the complete, ledger-aware Phase 3 parity result used for rollout promotion.
 * @param {string} summaryPath Path to the Phase 3 parity runner summary.
 * @param {number} exitStatus Exit status recorded for the parity runner.
 * @returns {Promise<object>} Semantic-parity status that remains auditable when the summary is unavailable.
 */
async function semanticParity(summaryPath, exitStatus) {
  try {
    const summary = JSON.parse(await readFile(summaryPath, "utf8"));
    const accepted = exitStatus === 0
      && summary.config_count === 39
      && summary.passed_count === 39
      && summary.failed_count === 0
      && Array.isArray(summary.gate_failures)
      && summary.gate_failures.length === 0
      && summary.input_provenance?.stable === true;
    return {
      accepted,
      status: accepted ? "accepted" : "rejected",
      reason: accepted
        ? "all_39_configs_passed_with_reviewed_ledger"
        : "phase3_summary_did_not_satisfy_rollout_contract",
      exit_status: exitStatus,
      config_count: summary.config_count ?? null,
      passed_count: summary.passed_count ?? null,
      failed_count: summary.failed_count ?? null,
      gate_failures: Array.isArray(summary.gate_failures) ? summary.gate_failures : null,
      input_provenance_stable: summary.input_provenance?.stable === true,
      diagnostic_parity_ledger_sha256: summary.diagnostic_parity_ledger?.sha256 ?? null,
      compiler_contract: summary.compiler_contract ?? null,
    };
  } catch (error) {
    return {
      accepted: false,
      status: "incomplete",
      reason: `phase3_summary_unavailable:${error instanceof Error ? error.message : String(error)}`,
      exit_status: exitStatus,
      config_count: null,
      passed_count: null,
      failed_count: null,
      gate_failures: null,
      input_provenance_stable: false,
      diagnostic_parity_ledger_sha256: null,
      compiler_contract: null,
    };
  }
}

const values = parseArguments(process.argv.slice(2));
const [ts6Exit, ts7Exit, ts7RepeatExit, phase3ParityExit, ts6Log, ts7Log, ts7RepeatLog, ts6Time, ts7Time, ts7RepeatTime, phase3ParityTime] = await Promise.all([
  readExitStatus(values.get("--ts6-exit")),
  readExitStatus(values.get("--ts7-exit")),
  readExitStatus(values.get("--ts7-repeat-exit")),
  readExitStatus(values.get("--phase3-parity-exit")),
  readFile(values.get("--ts6-log"), "utf8"),
  readFile(values.get("--ts7-log"), "utf8"),
  readFile(values.get("--ts7-repeat-log"), "utf8"),
  readFile(values.get("--ts6-time"), "utf8"),
  readFile(values.get("--ts7-time"), "utf8"),
  readFile(values.get("--ts7-repeat-time"), "utf8"),
  readFile(values.get("--phase3-parity-time"), "utf8"),
]);
const ts6Diagnostics = diagnostics(ts6Log);
const ts7Diagnostics = diagnostics(ts7Log);
const ts7RepeatDiagnostics = diagnostics(ts7RepeatLog);
const rawTurboOrderDependentDiffCount = symmetricDifferenceCount(ts7Diagnostics, ts7RepeatDiagnostics);
const parity = await semanticParity(values.get("--phase3-parity-summary"), phase3ParityExit);
const output = values.get("--output");
const observation = {
  schema_version: 1,
  run_id: values.get("--run-id"),
  lane: "ts7-parity-non-blocking",
  ts7_gate_exit: ts7Exit,
  ts6_parity_exit: ts6Exit,
  cache_state: {
    ts6: cacheState(ts6Log),
    ts7: cacheState(ts7Log),
    ts7_repeat_forced: cacheState(ts7RepeatLog),
  },
  // Turbo stops after its first failing task, so only the complete Phase 3 oracle can establish ordering parity.
  order_dependent_diff_count: parity.accepted ? 0 : null,
  compiler_diagnostic_diff_count: parity.accepted ? 0 : null,
  ts7_repeat_exit: ts7RepeatExit,
  peak_rss_kib: Math.max(
    peakRssKib(ts6Time),
    peakRssKib(ts7Time),
    peakRssKib(ts7RepeatTime),
    peakRssKib(phase3ParityTime),
  ),
  ts7_checkers: Number.parseInt(process.env.TS7_CHECKERS ?? "1", 10),
  semantic_parity: parity,
  turbo_execution_diagnostics: {
    comparable: false,
    reason: "turbo_short_circuits_after_different_failing_tasks; use_semantic_parity_for_promotion",
    raw_order_dependent_diff_count: rawTurboOrderDependentDiffCount,
    ts6: ts6Diagnostics,
    ts7: ts7Diagnostics,
    ts7_repeat: ts7RepeatDiagnostics,
  },
  source_revision: process.env.GITHUB_SHA ?? "local",
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(observation, null, 2)}\n`, "utf8");
