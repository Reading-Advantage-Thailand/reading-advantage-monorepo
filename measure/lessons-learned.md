# Lessons Learned

> Curated working memory, not an append-only log. Keep ≤ **50 lines**.

## APK cutover / host-proof (2026-08-03)
- **reasonix for bulk; Grok for verification only.** AGENTS.md: bulk mechanical work is `reasonix run --dir <REPO> --permission-mode acceptEdits -p "…"`. In-loop bulk formals/SCRATCH/dual-host ports burns weekly token budget without extra correctness. High-risk host clients, Measure claims, and commits stay in-loop.
- **Multi-title host client must accept any `*_HOST_PROOF_ACTION`.** Filtering only `DRAGON_FLIGHT_HOST_PROOF_ACTION` drops magic-defense/castle-defense/etc. diagnostics so checkpoints never form. Client tests must inject non-DF codes with `gameType=…`; domain multi-title alone is not the host bridge.
- **Option-1 terminal graph needs one fact table + agreement checker.** Field-by-field formals drift (stale c3, zero-deletion language, SHA mismatch). Prefer `apk_option1_terminal_truth_*.json` + whole-file regen of formals/dispositions/authority; never agent self-sign track-complete.
- **Criterion 3 is exact retirement, not empty candidates.** Task-6 empty-delete lists while live callers exist is incomplete; either rewire→delete (option 1) or explicit deferred/blocked with disclosures—not zero-deletion as complete.
- **Primary Vitest dynamic imports of package subpaths need dist or source aliases.** `vi.mock({ virtual: true })` does not satisfy Vite import analysis for `@reading-advantage/game-cartridges/legacy-*-host-proof`.

## Recurring Gotchas (condensed)
- FR-2 greps need runtime call shapes, not only imports (primary drizzle). Drizzle migrator skips non-monotonic `when` stamps. Audit log DELETE needs `DIRECT_DATABASE_URL` + advisory lock. Next.js 16 `proxy.ts` is nodejs (no edge `runtime`).
- Shared checkout: the git index is shared state across concurrent agents—commit with `git commit -- <pathspec>` only, never bare `git add`+`git commit` (a sibling's staged renames got swept into a business-ops commit, 2026-08-03). Committed evidence dirs under `measure/tracks/` are read-only to automation and sibling agents; path-sync must never cross track boundaries (frozen R1 v2 snapshot was rewritten twice).
- Transaction-mode pooling: `prepare: false`, split DATABASE_URL/DIRECT_DATABASE_URL, entrypoint guard for CLI db scripts.
- `FOR UPDATE SKIP LOCKED` job queues work without Redis; adversarial-test URL parsers and DLQ boundaries.
- Never bend production code for structural string assertions in tests. Source-scan guards need counterexample fixtures. Ratchet large deferred sweeps; don't zero.

## CI / closeout (condensed)
- `ignoreBuildErrors: true` masks root causes—wire check-types first. `gate_closeout` needs `## Archived Tracks` H2. Rebuild package `dist/` after export moves. Capture commit SHAs only after they are ancestors of HEAD.
