#!/usr/bin/env tsx
/**
 * Migration Ledger Doctor
 *
 * Compares the Drizzle migration journal against the actual database schema
 * using sentinel probes. Detects divergences where migrations were applied
 * without a ledger entry (or vice versa).
 *
 * Usage:
 *   tsx scripts/migration-ledger-doctor.ts --check   # report only (exit 0/1/2)
 *   tsx scripts/migration-ledger-doctor.ts --repair   # insert missing ledger rows
 *
 * Exit codes:
 *   0 — clean: journal, ledger, and sentinels all agree
 *   1 — divergence detected
 *   2 — connection/config error
 */

import { sentinelProbes } from "./sentinels.js";

const args = process.argv.slice(2);
const mode = args.includes("--repair") ? "repair" : args.includes("--check") ? "check" : null;

if (!mode) {
  console.error("Usage: tsx scripts/migration-ledger-doctor.ts [--check|--repair]");
  process.exit(2);
}

// Stub: full implementation in Phase 3 (Task 9).
// The contract test only asserts that this scaffold exists and declares exit(2).
console.error("migration-ledger-doctor: not yet implemented (Phase 3 Task 9)");
process.exit(2);
