#!/usr/bin/env tsx
/**
 * Copies the Workbooks primary print template into the monorepo print kit (track
 * primary_parity_print_lesson_20261011). Reads the Workbooks repository with `git show`; never writes it.
 *
 * Sync:  tsx scripts/sync-print-kit.ts [--workbooks ~/Desktop/Workbooks] [--commit <id>]
 * Check: tsx scripts/sync-print-kit.ts --check   (exit 1 when a newer kit commit exists)
 * Exit: 0 done, 1 stale kit, 2 config error or a local change in a kit path.
 * Writes `src/primary-books/print/kit.generated.ts` and `apps/primary-advantage/public/print-fonts/`.
 */
import { runSyncPrintKit } from "../src/primary-books/print/sync.js";

process.exitCode = await runSyncPrintKit(process.argv.slice(2));
