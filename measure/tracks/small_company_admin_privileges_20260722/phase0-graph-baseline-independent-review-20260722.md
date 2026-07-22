# Independent Review: Phase 0 Repository Graph Baseline

Date: 2026-07-22
Reviewer decision: **FAIL — independent Phase 0 acceptance denied**
Producer revision: `88ba9bb0a788da89ef7cc27f92da19db0b9c2198`

## Summary

The immutable graph receipt and all eight required symbol probes reproduce, but
the producer evidence contains a false audit exit claim and does not disclose
current TypeScript sources excluded by the discovered package configuration.
Phase S1 and `customer_licensing_crm_20260722` must remain blocked.

## Verification checks

- **Canonical checkout:** PASS — `/home/daniel-bo/Desktop/reading-advantage-monorepo`, branch `master`, `HEAD` exactly `88ba9bb0a788da89ef7cc27f92da19db0b9c2198`.
- **Immutable artifact:** PASS — SHA-256 `2fc3b352d7897b51d3a201c1501e6a5d8c42a4798b320a58c16114e2e9dcee67`; size `175222784` bytes; mtime `2026-07-22 20:54:51.425403921 +0700`.
- **Tool and metadata:** PASS — `repo-graph 0.1.0`; schema `2.0.0`; `commitSha: null`; `lastIndexedAt: 1784728491130`; canonical project root persisted.
- **Stats:** PASS — `85,945` nodes, `113,742` edges, `3,292` files; reported freshness `stale: []`, `missing: []`, `checkedAt: 1784728491130`.
- **Required search/inspect/callers probes:** PASS — every exact full node ID inspects successfully. Resolved caller counts reproduce as `18, 9, 0, 0, 0, 0, 3, 0` for `getIdentityComposition`, `deepFreeze`, `CapabilityExecutor`, `CompanyIdentityService`, `createCompanyIdentityService`, `createLicense`, `getBlogPost`, and `ContactForm`. The five empty caller queries truthfully return exit `1` and `{"results":[]}`.
- **Audit claim:** FAIL — the exact command exits `1`, not `0`. It reports zero missing files, stale symbols, orphan edges, and duplicate nodes, but `3,944` unaudited symbols: `3,287` fields and `657` routes.
- **Current-source completeness:** FAIL — six untracked TypeScript files are present. Three DB files are indexed with content hashes matching the live files; all three `packages/backend/src/jobs/__tests__/postgres16-harness*` files are absent because `packages/backend/tsconfig.json` excludes `src/**/__tests__` and `src/**/*.test.ts`.
- **Plan/registry markers:** PASS — the producer task remains `[~]`, Phase S1 tasks remain `[b]`, and CRM Phase S1 tasks remain `[b]`. No premature acceptance or unlock was recorded.
- **Browser/test execution:** Not applicable — this was a read-only graph-evidence review; browser use was expressly prohibited and no product code changed.

## Findings

### High — The producer records an audit result that the exact command does not produce

- **File:** `measure/tracks/small_company_admin_privileges_20260722/phase0-graph-baseline-producer-evidence-20260722.md` (line 70)
- **Evidence:** `repo-graph audit ./graph.db --json` exits `1`. Its integrity arrays are empty, but `unauditedSymbols` contains exactly `3,944` entries: all `3,287` field nodes and all `657` route nodes, each stating that stale-symbol detection requires a full scanner rerun.
- **Impact:** The statement that the command "exited `0` with no integrity findings" is factually false and masks a material limitation of the audit result. Independent acceptance cannot rely on a command receipt whose exit status and payload were misstated.
- **Required producer correction:** Record the actual exit status and exact category counts, distinguish empty integrity arrays from the non-empty unaudited set, and explain whether these scanner-required exclusions are accepted limitations.

### High — The completeness/currentness conclusion omits tsconfig-excluded current TypeScript sources

- **Files:** `measure/tracks/small_company_admin_privileges_20260722/phase0-graph-baseline-producer-evidence-20260722.md` (lines 107-128, 132-136); `packages/backend/tsconfig.json` (lines 8-14)
- **Evidence:** The checkout has six untracked `.ts` files. The graph contains and hash-matches these three:
  - `packages/db/src/__tests__/durable-jobs-schema-migration.red.test.ts` — `2b96f926af8fff0001966819f6744902adb96652fb4d5e7d0429102fe873db87`
  - `packages/db/src/__tests__/durable-jobs-transition-fixtures.test.ts` — `8c7f4b340667f72f5e36202a898c9300823829e949fbc535656d0237d39a9408`
  - `packages/db/src/__tests__/fixtures/durable-job-transition-counterexamples.ts` — `70c5c632886614510923dc581c5eec66186625d74c97a0a3e5e8dddfbf184f2f`

  The graph has no file rows for these three live sources:
  - `packages/backend/src/jobs/__tests__/postgres16-harness.integration.test.ts` — `88170cb491a83d75f2e2a1bedbb1249acc5d3d20b15f5f8f4a6238d370220274`
  - `packages/backend/src/jobs/__tests__/postgres16-harness.test.ts` — `827c7635093e123bbd82bc4e4a795210174348776d91558c3446dfd1c6c24aac`
  - `packages/backend/src/jobs/__tests__/postgres16-harness.ts` — `42851e5db77162adfe81a17b89b25f628c1646375f77343674ef9aae0e9e8628`
- **Impact:** `stats.freshness` proves only that already-indexed file rows are unchanged; it does not prove that all current TypeScript files are indexed. The producer's parser/query exclusion section discusses unresolved calls and caller semantics but not package-config source exclusion, so the unqualified "complete, current" conclusion is not truthful for the current monorepo source.
- **Required producer correction:** Either rebuild with an explicit include/config that covers the required test sources or narrow the completeness claim to tsconfig-included sources and enumerate the excluded current files/config rules. Then rerun and republish the immutable receipt for independent review.

## Acceptance decision

**FAIL.** Do not mark the Phase 0 producer task complete. Do not unlock
`small_company_admin_privileges_20260722` Phase S1 or
`customer_licensing_crm_20260722`. The existing `[~]` and `[b]` markers are the
correct current state.
