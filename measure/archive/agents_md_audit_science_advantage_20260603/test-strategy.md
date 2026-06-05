# Test Strategy: AGENTS.md Compliance Audit — science-advantage

> This track is an **audit**, not a feature. "Testing" means verifying each
> audit artifact is accurate, reproducible, and defensible. The SUT is the
> audit protocol itself and its outputs.

---

## 1. Testing Pyramid Per Phase

| Phase | Unit | Integration | E2E |
|-------|------|-------------|-----|
| 0: Setup | graph.db freshness + mtime | `build-graph scan` >0 nodes | `pnpm turbo run build --filter=science-advantage` |
| 1: Discovery | File-count assertions | `build-graph stats` matches `rg` counts | — |
| 2: Static analysis | Grep/query returns expected PASS/FAIL on known sample | Cross-validate `build-graph` vs `rg` (3 sections) | — |
| 3: Manual review | N/A (human judgment) | Spot-check 2 samples per FAIL | — |
| 4: Classify | Severity rubric consistency | — | — |
| 5: Migration tracks | Track skeleton valid (metadata+spec+plan) | Track ≤15 tasks | — |
| 6: Summary | Counts match findings.md | — | — |
| 7–8: Present/close | N/A | — | — |

Meta-tests dominate — integration-level because the audit is cross-tool.

---

## 2. Shared Test Fixtures & Mocks

| Fixture | Source | Phases |
|---------|--------|--------|
| build-graph result snapshot | `graph-snapshot.json` in report dir | 1, 2 |
| Known-violation file list | `fixtures/known-violations.json` | 2, 3 |
| Severity rubric table | Protocol §Severity Scheme, inline | 4 |
| Track skeleton validator | `__tests__/track-skeleton.test.ts` | 5 |
| `createMockDb` (existing) | `packages/api/src/__tests__/` | 2 (domain spot-checks) |
| Thenable mock / `selectSequence` | Existing, per lessons-learned | 2 |

No new mocks needed — the audit reads source and produces documents.

---

## 3. Cross-Phase Edge Cases & Dependencies

1. **Graph emptiness (F-1003):** If `build-graph stats` = 0 files mid-audit,
   everything degrades to grep-only. Phase 0 must gate on `Total files > 0`.
2. **Multiline import detection:** Single-line `rg` undercounts DB imports
   (22 vs 27 in prior audit). Phase 2 must use `rg -l` with multiline-safe
   patterns.
3. **Prisma shadow files:** 56 files in `prisma/` with no `schema.prisma` —
   stale, not active. Phase 2 §5 must distinguish active vs residual usage.
4. **Severity by blast radius, not rule number:** Phase 4 must cross-reference
   caller counts. Missing JSDoc on `assertCan` ≠ missing JSDoc on a private fn.
5. **Findings ↔ tracks consistency:** Every Critical/High finding must have a
   migration track. Phase 5 depends on Phase 4 completeness.
6. **Tech-debt ≤50 lines:** Medium/Low findings must batch into one row per app.

---

## 4. Architecture Guardrails

### Reuse

- **`createTenantDB`** + `tenant-coverage.test.ts` pattern for tenant guards
- **`assertCan`** from `@reading-advantage/auth` — enforced through domain fns
- **Thenable mock pattern** for Drizzle chain mocks
- **`selectSequence`** for multi-query domain tests
- **Track skeleton** — `metadata.json` + `spec.md` + `plan.md`

### Avoid

- Grep-only audit without graph validation (false positives: `vi.mock` matches)
- Severity by rule number (impact decides, not section)
- Single-line grep for `route.ts` violations (multiline-safe required)
- FAIL rows without `file:line` evidence
- Ignoring `vi.mock`/`await import` in Prisma greps (test artifacts, not runtime)

---

## 5. Per-Phase Test Approach

- **Phase 0:** Assert graph.db mtime < 24h; assert `build-graph stats` > 0.
- **Phase 1:** Assert file counts from graph match `find`/`rg`. Assert inventory lists all dirs.
- **Phase 2:** Run protocol grep/query per section. Cross-validate 3 sections with both
  `build-graph search` and `rg`. Snapshot `rg` output to `fixtures/`.
- **Phase 3:** Inspect 1–2 files per FAIL; confirm violation is real, not false positive.
- **Phase 4:** Verify severity against rubric. Verify `tech-debt.md` ≤50 lines.
- **Phase 5:** Validate each track has skeleton + ≤15 tasks + finding ID reference.
- **Phase 6–8:** Verify summary counts match findings. Verify `tracks.md` section exists.

---

## 6. Build-Graph Findings That Shaped This Strategy

1. **1,368 nodes / 1,988 edges / 159 files** but only 6 from
   `apps/science-advantage/` (auth + AI). Route files not indexed — grep mandatory.
2. **238 `calls` edges but `callers` returned empty** for `assertCan`,
   `createTenantDB`, `recordAuditEvent`. Call-graph traversal incomplete;
   grep is the fallback for blast-radius.
3. **`eq` = 214 calls** — confirms Drizzle-heavy codebase. Flag `sql` tagged
   templates that should be Drizzle queries (raw-SQL violations).
4. **17 science-advantage functions** (auth:9, AI:8), zero route.ts indexed.
   Audit must scan routes with `rg`.
5. **`createTenantDB` has 0 incoming `calls` edges** despite domain migration
   claiming 28 functions use it — graph coverage gap, not code issue. Update
   graph post-audit.
6. **No `firebase`/`prisma`/`bcrypt` symbols** in graph — provider-coupling
   checks are grep-only.
7. **Full monorepo scan >5 min** (lessons-learned). Phase 0: scan `packages/`
   first, then `update` with science-advantage files.
