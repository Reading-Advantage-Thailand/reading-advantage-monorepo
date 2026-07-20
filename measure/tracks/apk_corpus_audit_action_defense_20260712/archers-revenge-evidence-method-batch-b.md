# Archer's Revenge — Batch B evidence method

Collector: `evidence-collector-archers-revenge-batch-b`  
Frozen phase base: `ff01cee9cc973dee89fdc0ba22102dcea0c50542`  
Role base: `386084b4cff7358bf03a223de44be83954b069a1`

## Budget freeze before game-source reads

The declared `evidence-collector-batch-b` ceiling was frozen from
`batch-b-budget-declaration.json` before the Git source queries: 52,428,800
source bytes, 120 source files, 80 commands, 45 minutes, and 300 records.
Actual use is labeled in the ledger and remains within each ceiling.

## Method and boundaries

1. Re-derived the frozen baseline identity from a Git blob.
2. Used `git ls-tree` at the frozen baseline for the exact former page, API,
   component, and supporting-library paths. Its empty output is a bounded
   absence record, not a repository-wide absence or non-runnable conclusion.
3. Recovered historical source only from reachable Git objects. The old page,
   component, routes, and tests were read at
   `cd1936387d136ffb12e77a647f36cbce2d1fdd4e`; the accessible chronology
   records `a30e8777952139460092c7d4649b8a72b5e8beda` with that revision as
   parent. A later reachable withdrawal commit is recorded in the final report.
4. Computed full-blob and inclusive-LF-range SHA-256 values from `git show`
   bytes. Binary asset candidates use whole-file SHA-256 envelopes only.
5. Kept catalog identity, test intent, static CSS, historical source, and live
   behavior separate. No catalog, documentation, graph, or test artifact is
   used as runtime evidence.

## Explicit limitations

This role did not run a browser or start command. It therefore makes no
current/runnable, compact/wide, route-live, asset-usage, or production behavior
claim. The four negative fixtures are refutations, not factual coverage.
