# Line Review: sa-batch-18

- **Track:** `science_advantage_review_20260626`
- **Batch:** 18 (20 files)
- **Reviewer focus:** Correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline/golden-path patterns
- **Scope:** OpenTelemetry instrumentation, audit phase contract tests (Phases 0–8), housekeeping phase adversarial closure tests (Phases 1, 3–9, 11–12)
- **Date:** 2026-06-27

---

## File-by-File Review

### F1: `apps/science-advantage/instrumentation.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Sound; well-documented version-compatibility caveat for `@opentelemetry/sdk-node@0.57.2` |
| **Security/tenancy** | No auth/tenant concern — pure observability infrastructure |
| **AGENTS.md compliance** | Uses OTel SDK directly without an adapter layer — see finding |
| **Architecture** | Proper next.js `register()` pattern; guards for `NEXT_RUNTIME !== 'nodejs'` |

| Line | Finding |
|------|---------|
| 1–19 | **F-SA-B18-001 [architecture]** — JSDoc documents an important cross-version `Resource` mismatch. This is good architectural documentation but signals that the OTel dependency versions are in a fragile state (0.57.2 SDK vs bundled 1.30.1 resources). The workaround (`serviceName` instead of `resource:`) is clearly explained. **Severity: informational**. |
| 27 | `let sdk: NodeSDK | undefined` — module-level singleton. **F-SA-B18-002 [ssr-hot-reload]** — In Next.js dev mode with HMR, `register()` may be called multiple times per compilation. The `if (sdk) return` guard on line 33–35 handles re-entrancy for a started SDK, but does not handle the case where `register()` errors partway through (e.g. `new NodeSDK` throws on a bad config) — the `sdk` variable would remain undefined on the second call, retrying the configuration. This is acceptable for OTel (retry is reasonable) but should be documented. **Severity: informational**. |
| 37–42 | `OTEL_SERVICE_NAME` / `OTEL_EXPORTER_OTLP_ENDPOINT` env vars with fallback to `ConsoleSpanExporter` — standard OTel pattern. **Severity: informational**. ✓ |
| 44–48 | NodeSDK configured with `serviceName` and `BatchSpanProcessor` wrapping OTLP or console exporter. Adequate for initial instrumentation. ✓ |
| N/A | **F-SA-B18-003 [golden-path-deviation]** — AGENTS.md says "Observability is a first-class concern" with logging/telemetry via adapters. This file imports `@opentelemetry/sdk-node` directly rather than through an internal observability adapter (e.g. `lib/observability/otel.ts`). The `lib/instrumentation.ts` sibling file exists as a "Phase 2 contract-test target" (per JSDoc line 15–18), which suggests the adapter split is partially architected but not fully applied. For a Next.js app root, the direct SDK coupling is a pragmatic trade-off; the adapter carve-out is documented. **Severity: low**. |

---

### F2: `apps/science-advantage/lib/__tests__/audit-phase0-setup.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — `build-graph stats`, git porcelain checks, filesystem stat operations |
| **Security/tenancy** | N/A — meta-audit infrastructure test |
| **AGENTS.md compliance** | Full JSDoc on every function; references Measure track and protocol section |
| **Test quality** | Well-structured; shells out to git/build-graph appropriately for ground truth |

| Line | Finding |
|------|---------|
| 1–22 | Extensive JSDoc describing what the test pins and referencing the audit protocol section. ✓ |
| 33–35 | `MONOREPO_ROOT` resolved via `git rev-parse --show-toplevel` — robust to directory moves. ✓ |
| 48–50 | `runCaptured` helper — thin wrapper around `execFileSync`. ✓ |
| 59–65 | `build-graph stats` output parsing via regex `Total files:\s*(\d+)` — standard pattern. ✓ |
| 83–87 | Executable-bit check with `stat.mode & 0o100` — correct and consistent with precedent. ✓ |
| 103–108 | "working tree has no uncommitted changes" via `git status --porcelain` — valuable audit reproducibility guard. ✓ |
| 109–115 | Sibling test checks that `apps/science-advantage/` directory exists — redundant with the porcelain check (existence is implied by a clean status) but cheap and harmless. **Severity: informational**. |

No material defects. Test is well-structured, clearly documented, and performs the pre-audit setup checks it promises. ✓

---

### F3: `apps/science-advantage/lib/__tests__/audit-phase1-discovery.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — counts match `find`; cross-references inventory document |
| **Security/tenancy** | N/A — meta-audit test |
| **AGENTS.md compliance** | JSDoc present on all exports; references test-strategy.md, protocol, and findings.md |
| **Architecture** | Good pattern: contract tests pinning the inventory document against filesystem ground truth |
| **Test quality** | Thorough — 671 lines covering inventory shape, route counts, directory listings, build-graph coverage, dependency parity |

| Line | Finding |
|------|---------|
| 1–32 | Comprehensive JSDoc with protocol references and test strategy mapping. ✓ |
| 59–63 | `countLines` helper — splits on `\n`, filters empty — standard. ✓ |
| 71–84 | `readInventoryMetric` — parses markdown table rows from inventory. Clever but **F-SA-B18-004 [brittle-parser]** — the parser depends on the exact markdown table format (backtick-delimited label, pipe columns). If the inventory's table formatting changes (e.g. alignment markers, extra spacing), this silently returns `null` and the tests fail with unhelpful messages. A snapshot-based approach would be more resilient. **Severity: informational**. |
| 90–106 | `readInventoryCodeBlock` — same table-parsing concern. **Severity: informational**. |
| 132–138 | Route count: `find apps/science-advantage/app -name route.ts ...` with hardcoded 27. If routes are added or removed, this test requires manual updating. Appropriate for an audit-pinning test. ✓ |
| 147–166 | Cross-check that every route.ts on disk appears in the inventory — good completeness assertion. ✓ |
| 207–213 | "0 prisma/schema.prisma files" check — important regression guard for Prisma re-emergence. ✓ |
| 273–320 | Build-graph coverage assertions — **F-SA-B18-005 [known-failure-test]** — The test on lines 296–320 explicitly documents that it is RED today ("0 of 27 routes indexed" with a comment about the known coverage gap). This is an intentional pattern for contract-pinning tests but can be confusing to new readers. The JSDoc (lines 274–284) explains this clearly. Acceptable as a deliberate design choice for audit contract tests. **Severity: informational**. |
| 296–320 | The `expect(graphRoutes, ...).toBe(findRoutes)` assertion uses a message-based label parameter. **F-SA-B18-006 [test-lint]** — The error message string is verbose (80+ chars) and repeats the test name. Vitest already provides the test name in its output, so the message is redundant. Minor style concern. **Severity: informational**. |
| 352–491 | Three "RED: drift documented" tests for test file counts, source file counts, and dependency counts. These deliberately assert a stale value and document the drift — valid contract-pinning pattern. ✓ |

---

### F4: `apps/science-advantage/lib/__tests__/audit-phase2-static-analysis.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | High — thorough grep/build-graph queries with cross-validation |
| **Security/tenancy** | Verifies crucial security invariants (no firebase, no next-auth, no raw SQL, no direct db imports from routes) |
| **AGENTS.md compliance** | Extensive JSDoc; tracks post-migration state with per-track comments |
| **Architecture** | Excellent — contract tests that pin protocol PASS/FAIL states as executable assertions |
| **Test quality** | Very thorough — 13 protocol sections tested, cross-validation of rg vs build-graph for 3 sections, fixture snapshots |

| Line | Finding |
|------|---------|
| 1–65 | Massive JSDoc (65 lines) documenting protocol sections, cross-validation strategy, snapshot policy, and post-migration state. **F-SA-B18-007 [doc-verbosity]** — While this follows AGENTS.md documentation standards, the JSDoc block is exceptionally long. Consider moving protocol context to a companion `README.md` and keeping inline JSDoc to 15–20 lines. **Severity: informational**. |
| 89–102 | `runCaptured` with careful exit-code handling (allows 0 and 1 for rg's "no match" exit). ✓ |
| 116–124 | `rgFiles` helper — captures file lists from ripgrep with sorting. Good for cross-section assertions. ✓ |
| 126–142 | `snapshotRgFiles` — writes rg output to `fixtures/` for audit reproducibility. **Golden-path pattern** for audit tooling. ✓ |
| 149–168 | §1.1 — AI SDK import count assertion with `≤2` ceiling. The post-migration comment documents Track 5's partial progress. Good pattern for tracking resolution across tracks. ✓ |
| 170–179 | §1.1 — package.json declares `@ai-sdk/google`, `@ai-sdk/openai`, `ai`. **F-SA-B18-008 [adapter-bypass]** — Validates that the AI SDKs are still declared in the app's dependencies. The audit records this as FAIL (F-101) because the adapter pattern hasn't been fully applied. This is the correct assertion for the audit contract. **Severity: informational** (per audit protocol). |
| 181–191 | §1.5 — zero firebase imports (PASS). ✓ |
| 242–266 | §2.5 — route.ts importing `@reading-advantage/db` directly. The assertion allows either 0 (post-track-1 migrated) or ≥22 (pre-migration). **F-SA-B18-009 [ambiguous-pass]** — The `migrated || preMigrated` pattern means the test passes regardless of whether the migration actually happened. If the migration regresses partially (e.g. 15 routes still importing db), the test still passes because 15 < 22 (not ≥22) but also > 0 (not 0). This creates a false-green window for incomplete migration. **Severity: low**. |
| 359–371 | §3.2 — assertCan call site count with ≥50 threshold. ✓ |
| 382–397 | §3.3 — z.object count with ≥1 threshold (post-track-1 partial). ✓ |
| 399–407 | §3.4 — permissions.ts file count with ≤2 cap. ✓ |
| 466–485 | §4.4 — bcrypt call sites with OR pattern (`postTrack3 || preTrack3`). Same ambiguous-pass concern as F-SA-B18-009. **Severity: low**. |
| 602–618 | §5.3 — schoolId predicate count with ≥1 threshold. ✓ |
| 664–673 | §5.6 — migration file count with ≥15 threshold. ✓ |
| 689–711 | §6.1 — Zod parse/safeParse usage with dual bounds. ✓ |
| 840–863 | §9.2 — console.log/error/warn count. **F-SA-B18-010 [large-output]** — The test shells out to rg for `console.*` hits across app/, lib/, components/. At 67+ hits, the full output is large and is only snapshotted as a count, not the full file list. Consider also snapshotting the file:line pairs so the count can be manually verified. **Severity: informational**. |
| 1062–1068 | §12.6 — Conventional Commits assertion. Hardcoded 50-commit window with regex `^(feat|fix|chore|docs|refactor|test|perf|build|ci|style)\([^)]+\)!?:\s`. **F-SA-B18-011 [regex-coverage]** — This regex does not account for breaking-change `!` after scope (e.g. `feat(science)!: breaking change`) or multi-word scopes. The `!` is optional but the colon must follow immediately. Minor regex coverage gap. **Severity: informational**. |

---

### F5: `apps/science-advantage/lib/__tests__/audit-phase3-manual-review.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — parses findings.md, validates inspection annotations |
| **Security/tenancy** | N/A — meta-audit |
| **AGENTS.md compliance** | Good JSDoc with protocol references |
| **Test quality** | Thorough — 5 contract dimensions tested (annotation presence, sample count, file existence, line range, judgment keyword) |

| Line | Finding |
|------|---------|
| 1–69 | Extensive JSDoc documenting the inspection block format. ✓ |
| 99–105 | `VALID_JUDGMENTS` — closed enum of 5 values. Good pattern. ✓ |
| 123 | `HEADING_RE = /^### (F-\d+(?:-F-\d+)?):/` — **F-SA-B18-012 [naming-collision]** — If a finding ID contains the literal text `-F-` (e.g. an edge case like `F-1-F-2`), the regex captures `F-1-F-2` which is then treated as a range heading and excluded by `getFailIdsRequiringInspection`. This edge case is unlikely but the regex is over-fitted to the current findings.md structure. **Severity: informational**. |
| 139 | `SAMPLE_RE` — file path regex restricted to `[A-Za-z0-9._\-\/[\]()@+]+`. This excludes uppercase extensions like `.SPEC.ts` and paths with spaces. No such paths exist in the codebase, but the constraint is tight. **Severity: informational**. |
| 214–234 | `parseInspectionBlock` — bounded by `### ` heading or `- **Field:**` bullet. Clean separation of concerns. ✓ |

---

### F6: `apps/science-advantage/lib/__tests__/audit-phase4-classify-findings.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — parses findings.md severity bullets, validates classification |
| **AGENTS.md compliance** | JSDoc references protocol severity scheme; maps to tech-debt.md |
| **Test quality** | Good — 5 concrete contracts covering severity, rollup table, sort order, line cap, and tech-debt rows |

| Line | Finding |
|------|---------|
| 1–74 | JSDoc documents the severity rubric and state of each test (RED/GREEN). ✓ |
| 125–126 | `HEADING_RE` — same regex as Phase 3, same concern as F-SA-B18-012. **Severity: informational**. |
| 146 | `SEVERITY_RE = /^- \*\*Severity:\*\*\s*\*\*(\w+)\*\*/m` — matches any `\w+` after `Severity:`. This would match misspellings like `Critial` instead of `Critical`. **F-SA-B18-013 [weak-validation]** — The regex does not validate against the `VALID_SEVERITIES` set at parse time; validation happens downstream in the test assertion. A misspelled severity would be caught by the `VALID_SEVERITIES.includes()` check, but the error message would not surface the typo. **Severity: informational**. |
| 261–278 | Phase 4.3 — sort-by-severity test (documented as RED today). Checks that findings.md is ordered Critical → High → Medium → Low. ✓ |

---

### F7: `apps/science-advantage/lib/__tests__/audit-phase5-migration-tracks.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates migration-tracks.md, track directories, and plan structures |
| **AGENTS.md compliance** | JSDoc references test-strategy and protocol |
| **Test quality** | Excellent — data-driven via `PROPOSED_TRACKS` table, `it.each` for all 12 tracks, 5 contract dimensions |

| Line | Finding |
|------|---------|
| 86–176 | `PROPOSED_TRACKS` table — explicit mapping of all 12 tracks with track ID, severity, and resolved findings. **Golden-path pattern** for audit-to-track traceability. ✓ |
| 228–239 | `locateTrackDir` — checks both `tracks/` and `archive/` directories. Handles both pending and archived tracks. ✓ |
| 248–255 | `countTopLevelPhases` — counts `## Phase N:` headings in plan.md. ✓ |
| 315–336 | `it.each(PROPOSED_TRACKS)` — skeleton verification for all 12 tracks. ✓ |
| 344–366 | `metadata.json` structural validation (track_id, type, description). ✓ |
| 389–406 | Phase cap (≤15) with minimum sanity (≥3). ✓ |

---

### F8: `apps/science-advantage/lib/__tests__/audit-phase6-executive-summary.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — parses executive-summary.md and cross-references with findings.md |
| **AGENTS.md compliance** | Good JSDoc; documents RED/GREEN state of each contract |
| **Test quality** | Good — 7 contracts, but multiple tests are documented as intentionally RED |

| Line | Finding |
|------|---------|
| 1–99 | Comprehensive JSDoc documenting the 7 contracts and their state at audit time. ✓ |
| 199–222 | `parseExecSummarySeverityCounts` — parses markdown table rows with optional bold markers. Robust regex construction. ✓ |
| 316–358 | Phase 6.3 — severity rollup match (documented RED). Clear failure messaging. ✓ |
| 393–417 | Phase 6.4 — Top 5 risks count (documented RED). Uses `Math.max(numberedItems, bulletedItems)` to handle both ordered and unordered lists. **F-SA-B18-014 [counting-ambiguity]** — If the section contains both numbered and bulleted lists, `Math.max` takes the larger count, which could mask a mix of list types. For the Top 5 risks section, this is acceptable since a single list type is expected. **Severity: informational**. |
| 459–488 | Phase 6.5 — 3-track recommendation count. Uses `task_id_20260603` regex to count track IDs. ✓ |
| 516–529 | Phase 6.6 — index.md cross-link. ✓ |

---

### F9: `apps/science-advantage/lib/__tests__/audit-phase7-present-to-user.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates sign-off markers, open questions, and maintenance section |
| **AGENTS.md compliance** | Good JSDoc; documents RED/GREEN state |
| **Test quality** | Good — 6 contracts covering the present phase audit trail |

| Line | Finding |
|------|---------|
| 1–104 | Extensive JSDoc documenting 7 contracts and RED/GREEN state. ✓ |
| 222–234 | Phase 7.1 — metadata status allows both "active" and "complete". Cross-references Phase 8's expected state change. ✓ |
| 319–327 | Phase 7.2 — sign-off requested marker. **F-SA-B18-015 [boolean-result]** — `expect(contents.match(markerRe)).not.toBeNull()` — `String.match()` returns `null` on no match. The assertion is correct but the `match()` API choice is fragile; `RegExp.test()` would be more idiomatic. **Severity: informational**. |
| 405–431 | Phase 7.4 — Open Question status annotations. Multi-line regex spanning 400 chars to match title + status. **F-SA-B18-016 [regex-fragility]** — The `[\s\S]{0,400}?` window is tight: if a question's bullet contains more than 400 characters (bullets with links, multiple paragraphs), the status annotation would not be found even if present. **Severity: low**. |

---

### F10: `apps/science-advantage/lib/__tests__/audit-phase8-close-out.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates close-out artifacts |
| **AGENTS.md compliance** | Good JSDoc; cross-references Phase 7 |
| **Test quality** | Good — 3 categories of contracts (status, archive, registry) |

| Line | Finding |
|------|---------|
| 1–88 | JSDoc documents the Phase 7 ↔ Phase 8 overlap and intentional RED state. ✓ |
| 152–165 | Phase 8.1 — `metadata.status` must be "complete" (RED today). ✓ |
| 173–189 | JSON validity check after status edit — important regression guard. ✓ |
| 207–215 | Archive source absent check — `expect(exists).toBe(false)`. ✓ |
| 226–234 | Archive destination present check. ✓ |
| 293–310 | Phase 8.3 — `tracks.md` checked row. Regex anchors on `AGENTS\.md\s+Compliance\s+Audit\s+—\s+science-advantage`. **F-SA-B18-017 [whitespace-regex]** — Uses `\s+` between words, which would match any whitespace including newlines. Since the track title is a single inline entry, this is fine but overly permissive. **Severity: informational**. |

---

### F11: `apps/science-advantage/lib/__tests__/housekeeping-phase1-relocate-prisma.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — SHA-256 hash comparison, path resolution, import smoke tests |
| **Security/tenancy** | N/A — seed data relocation |
| **AGENTS.md compliance** | Full JSDoc; references housekeeping track plan and spec |
| **Architecture** | Excellent adversarial closure pattern — hash identity CI gate complements the existing §2.8 audit tests |
| **Test quality** | High — 5 sections covering hash identity, path resolution, import smoke tests, README references, regression guard |

| Line | Finding |
|------|---------|
| 1–56 | Comprehensive JSDoc documenting 4 test categories and their rationale. ✓ |
| 108–143 | §1.2 — SHA-256 hash multiset comparison. **F-SA-B18-018 [crypto-api]** — Uses `require('node:crypto')` instead of `import { createHash } from 'node:crypto'`. The `require` call triggers the ESLint rule `@typescript-eslint/no-require-imports` (eslint-disable comment on line 128). Prefer ESM `import` for consistency. **Severity: low**. |
| 145–187 | §1.3 — Path-identity check mapping legacy `prisma/seed-data/` paths to `scripts/seed-data/`. ✓ |
| 286–312 | §3 — Dynamic `import()` smoke tests for 4 seed modules. Correctly avoids invoking the functions (no DB). ✓ |
| 315–343 | §4 — README path reference assertions. ✓ |
| 346–381 | §5 — Regression guard: `prisma/` directory absence, AGENTS.md guard note, no legacy paths in scripts. **Golden-path pattern** for multi-phase adversarial closure. ✓ |

---

### F12: `apps/science-advantage/lib/__tests__/housekeeping-phase11-final-acceptance.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates plan.md FR table, task list, turbo.json, and per-phase artifacts |
| **Security/tenancy** | N/A — housekeeping meta-test |
| **AGENTS.md compliance** | JSDoc present; references test-strategy and plan |
| **Test quality** | Good — 5 sections covering FR completeness, task status, live-gate preconditions, artifact presence, and documented boundary |

| Line | Finding |
|------|---------|
| 1–55 | Good JSDoc documenting the 4 Phase 11 deliverable categories. ✓ |
| 128–168 | `parseFrTable` — markdown table parser for FR rows. **F-SA-B18-019 [parser-robustness]** — The parser strips leading/trailing pipes (`filter((c, i, arr) => ...)`). This logic is correct for standard markdown pipe tables but fragile for tables with leading whitespace or missing trailing pipes. **Severity: informational**. |
| 243–255 | §1.1 — FR terminal state check. ✓ |
| 269–278 | §1.3 — FR distinct count = 10. ✓ |
| 455–473 | §4.1 — Phase 1 seed-data artifact presence. ✓ |
| 475–495 | §4.2 — Phase 4 `.gitignore` + no tracked logs. **F-SA-B18-020 [error-handling]** — Line 482: `runCaptured('find', ...)` throws on non-zero/1 exit. If `find` fails due to a permission error (exit 2), the test throws an unhelpful `Error` rather than a vitest assertion failure with context. Consider using `spawnSync` directly with error handling in phase artifact tests. **Severity: low**. |
| 516–559 | §4.4 — `refactor(science):` commit git-note audit. Hardcoded `TRACK_ID` and `NON_TRACK_SHAS`. Correctly isolates negative controls. ✓ |
| 561–592 | §4.5 — ADR directory + sql-adr-guard verification. ✓ |
| 594–630 | §4.6 — commitlint config + husky + AGENTS.md checks. ✓ |

---

### F13: `apps/science-advantage/lib/__tests__/housekeeping-phase12-closeout.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates tech-debt.md, lessons-learned.md, archive directory, and tracks.md |
| **AGENTS.md compliance** | JSDoc present; references plan and strategy |
| **Test quality** | Good — 3 sections covering all Phase 12 close-out dimensions |

| Line | Finding |
|------|---------|
| 1–48 | JSDoc documents the 3 close-out deliverables. ✓ |
| 105–128 | `parseTechDebtRow` — parses the tech-debt.md table row. **F-SA-B18-021 [fragile-index]** — The parser finds the Status column by adding 3 to the Track column index (`cells[trackIdx + 3]`). If the table columns are reordered without updating the test, this silently reads the wrong cell. A column-header-based lookup would be more resilient. **Severity: informational**. |
| 130–155 | §1 — tech-debt.md closeout assertions. ✓ |
| 160–187 | §2 — lessons-learned.md entry assertions. Checks for batched-housekeeping pattern keyword. ✓ |
| 200–242 | §3 — archive directory + tracks.md update. **F-SA-B18-022 [link-check]** — Lines 218–229 check both the archive link pattern in text and the `[x]` line pattern. Both checks are independent grep operations on the same content — redundant but harmless. **Severity: informational**. |

---

### F14: `apps/science-advantage/lib/__tests__/housekeeping-phase3-agents-md.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates AGENTS.md content against Phase 3 contract |
| **Security/tenancy** | N/A — documentation cleanup |
| **AGENTS.md compliance** | Full JSDoc; cross-references Phase 1 regression guard |
| **Test quality** | Good — 8 sections covering all FR-2 / F-1102 contract dimensions |

| Line | Finding |
|------|---------|
| 1–36 | JSDoc documents the Phase 1 ↔ Phase 3 coordination (regression guard note allowed). ✓ |
| 80–108 | §1.1 — body lines exclude the regression-guard note. Uses contiguous blockquote detection (`while (j < lines.length && lines[j].trimStart().startsWith('>'))`). **F-SA-B18-023 [blockquote-detection]** — The detection assumes the regression guard is a single contiguous blockquote. If the guard note is split by a blank line or interrupted by a non-blockquote line, only the first blockquote segment is excluded, and `prisma` references in later segments would be incorrectly flagged. **Severity: low**. |
| 111–127 | §1.2 — rg-based check confirms exactly 1 prisma reference on line 3. ✓ |
| 138–144 | §2 — next-auth removal. ✓ |
| 154–160 | §3 — npx prisma removal. ✓ |
| 168–177 | §4 — npm install removal. ✓ |
| 185–194 | §5 — npm run removal. ✓ |
| 197–236 | §6 — Deviation header note presence and blockquote format. ✓ |
| 247–272 | §7 — package.json script consistency. **F-SA-B18-024 [regex-gap]** — Line 259: `invocationRegex` matches `pnpm` script invocations but excludes `pnpm install`, `pnpm exec`, `pnpm add`, `pnpm --filter`, and `pnpm -F`. This does not exclude `pnpx` or `pnpm dlx` which are also workspace-level commands. **Severity: informational**. |
| 290–297 | §8 — Phase 1 regression guard preservation. ✓ |

---

### F15: `apps/science-advantage/lib/__tests__/housekeeping-phase4-gitignore-log.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates app-local gitignore rule and probe behavior |
| **Security/tenancy** | N/A — gitignore cleanup |
| **AGENTS.md compliance** | Good JSDoc; references plan and test-strategy |
| **Test quality** | Good — 3 sections covering rule presence, git behavior, and hermeticity |

| Line | Finding |
|------|---------|
| 1–34 | Good JSDoc with background context (root .gitignore, two untracked .log files). ✓ |
| 79–86 | §1.1 — gitignore rule pattern check. Uses `/\*\.log(?:$|\*)/` to match both `*.log` and `*.log*`. ✓ |
| 88–120 | §1.2 — `git check-ignore -v` probe. Uses `--no-index` with a non-existent probe path. Hermetic and reliable. **Golden-path pattern** for gitignore testing. ✓ |
| 132–145 | §2 — no tracked *.log files. Uses `git ls-files`. ✓ |
| 155–161 | §3 — hermeticity assertion (probe path does not exist). ✓ |

---

### F16: `apps/science-advantage/lib/__tests__/housekeeping-phase5-orphan-todos.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — rg-based orphan TODO detection with tracked-form validation |
| **AGENTS.md compliance** | Good JSDoc; documents pre-migration context |
| **Test quality** | High — 5 sections covering live-proof command, tighter scope, specific file, positive regression, exact command replay |

| Line | Finding |
|------|---------|
| 1–80 | Extensive JSDoc with pre-migration context and scope decisions. ✓ |
| 128–145 | `rgOrphanTodoLines` — wraps rg with negative-lookahead `TODO(?!\()`. Correctly uses `--pcre2` for lookahead support. ✓ |
| 147–164 | `rgTrackedTodoLines` — positive match for `TODO(#`. ✓ |
| 190–196 | §1.1 — exact live-proof command. **F-SA-B18-025 [glob-exclusion]** — The `!**/*.test.*` glob excludes files like `foo.test.ts` and `foo.test.tsx`, but does not exclude `foo.spec.ts` (e2e test files). This is by design per the test-strategy.md, but means e2e test TODOs are in scope for §1.1. The JSDoc at lines 166–189 documents this correctly. **Severity: informational**. |
| 212–224 | §2.1 — tighter scope excluding test, spec, `__tests__`, node_modules, .next. ✓ |
| 242–255 | §3.1 — specific badges.ts line 115 check. ✓ |
| 289–315 | §4.1 — disjointness of orphan vs tracked sets. ✓ |
| 318–340 | §4.2 — tracked TODO format validation (`TODO(#NNN)`). ✓ |
| 355–374 | §5.1 — exact test-strategy command replay. ✓ |

---

### F17: `apps/science-advantage/lib/__tests__/housekeeping-phase6-repin-deps.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates deviation note in AGENTS.md and repo state consistency |
| **AGENTS.md compliance** | JSDoc present; references plan and audit findings |
| **Test quality** | Good — 5 sections covering note content, lockfile mention, regression guard, cross-phase preservation, and live-proof replay |

| Line | Finding |
|------|---------|
| 1–80 | JSDoc documents the Phase 6 deliverable being doc-only. ✓ |
| 153–163 | `hasCaretRangePhrase` — multi-line regex with 200-char window. **F-SA-B18-026 [regex-window]** — The `[\s\S]{0,200}?` window is generous but could still miss a note where the caret mention and the context word are separated by more than 200 characters (e.g. across sections). The AGENTS.md deviation note is typically <10 lines; 200 chars is adequate. **Severity: informational**. |
| 178–184 | §1.1 — caret range phrase presence. ✓ |
| 194–208 | §2.1 — pnpm-lock.yaml as source of truth. ✓ |
| 220–226 | §3.1 — caret range count ≥51. ✓ |
| 228–238 | §3.2 — no tracked .npmrc files. ✓ |
| 248–256 | §4.1 — Phase 1 regression guard preserved. **F-SA-B18-027 [vague-regex]** — Line 256: `/Regression guard.*prisma.*directory.*must not exist/i` — the `.*` between "directory" and "must" could match a very large gap, potentially matching across multiple lines. The intention is correct (pin the guard note), but the regex is wider than necessary. **Severity: informational**. |
| 284–302 | §5.1 — live-proof rg replay. ✓ |

---

### F18: `apps/science-advantage/lib/__tests__/housekeeping-phase7-git-notes.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates git notes for `refactor(science):` commits |
| **AGENTS.md compliance** | JSDoc present; documents TRACK_ID and SHA enumeration strategy |
| **Test quality** | Excellent — 7 sections covering main RED gate, negative controls, live-proof, precondition, note shape, audit SHA enumeration, adversarial regression |

| Line | Finding |
|------|---------|
| 1–124 | Comprehensive JSDoc documenting HEAD pre-state, membership rule, and strategy. ✓ |
| 179–185 | `KNOWN_FAILING_SHAS` — explicit SHA enumeration. **F-SA-B18-028 [sha-volatility]** — Hardcoded SHAs are sensitive to git history rewrites (rebase, squash). If any of these commits are rewritten, the tests silently fail with no-track-id (the commit subject would not match `refactor(science):` or the SHA would not exist). This is accepted by the test design (JSDoc line 62–64 acknowledges the membership-rule choice). **Severity: informational**. |
| 193–196 | `NON_TRACK_SHAS` — negative control SHAs. Same volatility concern. **Severity: informational**. |
| 227–241 | §1.x — Data-driven sub-tests for known-failing SHAs. Uses `KNOWN_FAILING_SHAS.indexOf(sha)` for sub-test numbering. ✓ |
| 258–269 | §2.x — Negative control assertions. ✓ |
| 287–306 | §3.1 — Live-proof refactor count (≥52). ✓ |
| 354–363 | §4.1 — Precondition (all known-failing have a note). ✓ |
| 379–407 | §5.1 — Note shape preservation (average length ≥100). **F-SA-B18-029 [performance]** — The test iterates all `refactor(science):` commits and calls `git notes show` for each. With 59+ commits, this is 59+ git subprocesses per test run. Consider batching with `git log --format=%H --all` piped through a single `git notes` call. **Severity: informational**. |
| 425–461 | §6.1 — Post-Green SHA enumeration. ✓ |
| 480–509 | §7.1 — Adversarial regression guard (every `refactor(science):` commit must be tracked or negative-controlled). ✓ |
| 522–546 | §7.2 — Canonical `Track: <id>` line format. **F-SA-B18-030 [format-vs-content]** — Validates presence of the canonical line format (`^Track:\\s+${TRACK_ID}\\s*$`). This is a "content" check on top of the §1 "contains" check — ensuring the track ID is in the right format, not just present anywhere in the note. Good tightening. ✓ |

---

### F19: `apps/science-advantage/lib/__tests__/housekeeping-phase8-adr-directory.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates ADR files, migration annotations, and lint script |
| **AGENTS.md compliance** | Good JSDoc; references plan, spec, and test-strategy |
| **Test quality** | Excellent — 9 sections covering directory, 3 ADRs, migration header, lint script, fixture-based live behavior, allowlist, and rg sweep |

| Line | Finding |
|------|---------|
| 1–80 | Comprehensive JSDoc with pre-state at HEAD. ✓ |
| 81–110 | Path constants for all ADR files, migrations, and lint script. ✓ |
| 116–131 | `runCaptured` — consistent pattern with other test files. ✓ |
| 138–145 | Fixture paths in `/tmp` with `.housekeeping-` prefix. Clean hermetic design. ✓ |
| 147–180 | `beforeAll` / `afterAll` — creates passing and failing fixtures. **Golden-path pattern** for hermetic SQL fixture testing. ✓ |
| 230–244 | §2.2 — ADR 0001 content pins (Drizzle, Prisma, migration 0013). ✓ |
| 332–341 | §5.1 — Migration 0012 header ADR reference. **F-SA-B18-031 [regex-complexity]** — The matcher uses `/ADR[^A-Za-z0-9]+0003/` which matches `ADR-0003`, `ADR 0003`, `ADR:0003`, etc. Combined with the `||` for the filename form. While functionally correct, the two-branch regex is harder to maintain than a single combined pattern. **Severity: informational**. |
| 396–401 | §7.1 — Failing fixture exits non-zero. ✓ |
| 404–410 | §7.2 — Passing fixture exits 0. ✓ |
| 412–418 | §7.3 — Annotated 0012 exits 0. ✓ |
| 420–439 | §7.4 — Commented-out DROP in 0018_audit_events.sql exits 0. Important regression guard for a previous bug (JSDoc lines 421–429 document the Phase Acceptance audit finding). **Golden-path pattern** for bug-regression pinning. ✓ |
| 471–487 | §8.1 — Allowlist mechanism presence via `--help` output. ✓ |
| 489–511 | §8.2 — Allowlist works for grandfathered migration. Uses `--allow` flag. ✓ |
| 524–542 | §9.1 — rg sweep for ADR file count (≥3). ✓ |

---

### F20: `apps/science-advantage/lib/__tests__/housekeeping-phase9-commitlint-config.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Correct — validates commitlint config, regex extraction, husky hook, and package.json |
| **AGENTS.md compliance** | Good JSDoc; references plan, spec, and test-strategy |
| **Test quality** | Excellent — 7 sections covering config presence, content, regex extraction, husky hook, package.json, AGENTS.md, and optional live CLI behavior |

| Line | Finding |
|------|---------|
| 1–99 | Comprehensive JSDoc with pre-state analysis. ✓ |
| 177–219 | `extractSubjectPatternRegex` — extracts the regex literal from config text. **Golden-path pattern** for testing regex-based validation rules without installing the CLI tool. ✓ |
| 265–270 | §2.1 — extends config-conventional. ✓ |
| 273–292 | §2.2 — subject-pattern rule level 2 + applicability "always". ✓ |
| 315–326 | §3.1 — regex extraction succeeds. ✓ |
| 328–338 | §3.2 — no-track-id **REJECTED** (must be false). ✓ |
| 341–351 | §3.3 — with-track-id **ACCEPTED** (must be true). ✓ |
| 354–377 | §3.4 — all 10 conventional types accepted with track_id. ✓ |
| 379–388 | §3.5 — chore without track_id allowed. ✓ |
| 427–431 | §4.2 — executability check with `stat.mode & 0o100`. ✓ |
| 434–445 | §4.3 — hook invokes commitlint on commit message. ✓ |
| 459–466 | §5.1–5.4 — package.json devDependencies and prepare script. ✓ |
| 505–519 | §6.1 — root AGENTS.md commitlint documentation. ✓ |
| 560–586 | `resolveCommitlintInvocation` — checks 3 binary locations. ✓ |
| 616–646 | `describe.runIf(commitlintBinaryAvailable)` — optional live gate. **Golden-path pattern** for bounded-live testing (contract proof via static regex extraction; CLI behavior as optional belt-and-suspenders). ✓ |

---

## Cross-Cutting Findings

| ID | Theme | Files Affected | Severity |
|----|-------|---------------|----------|
| F-SA-B18-001 | OTel adapter vs direct SDK coupling | `instrumentation.ts` | Info |
| F-SA-B18-002 | HMR re-entrancy concern | `instrumentation.ts` | Info |
| F-SA-B18-003 | Missing observability adapter layer | `instrumentation.ts` | Low |
| F-SA-B18-004 | Brittle markdown table parser | `audit-phase1-discovery.test.ts` | Info |
| F-SA-B18-005 | Known-failure test pattern (intentional) | `audit-phase1-discovery.test.ts` | Info |
| F-SA-B18-006 | Verbose test error messages | `audit-phase1-discovery.test.ts` | Info |
| F-SA-B18-007 | JSDoc verbosity (65+ line blocks) | `audit-phase2-static-analysis.test.ts` | Info |
| F-SA-B18-008 | AI SDK adapter bypass (per audit F-101) | `audit-phase2-static-analysis.test.ts` | Info |
| F-SA-B18-009 | Ambiguous pass (OR pattern allows false-green window) | `audit-phase2-static-analysis.test.ts` | Low |
| F-SA-B18-010 | Console count snapshots lack file:line | `audit-phase2-static-analysis.test.ts` | Info |
| F-SA-B18-011 | Conventional Commits regex misses breaking-change `!` variant | `audit-phase2-static-analysis.test.ts` | Info |
| F-SA-B18-012 | Findings heading regex over-fitted | `audit-phase3-manual-review.test.ts` | Info |
| F-SA-B18-013 | Severity regex doesn't validate against enum at parse time | `audit-phase4-classify-findings.test.ts` | Info |
| F-SA-B18-014 | List-count ambiguity (Math.max of numbered+bulleted) | `audit-phase6-executive-summary.test.ts` | Info |
| F-SA-B18-015 | `match()` vs `test()` for boolean check | `audit-phase7-present-to-user.test.ts` | Info |
| F-SA-B18-016 | Regex window too tight for long annotation bullets | `audit-phase7-present-to-user.test.ts` | Low |
| F-SA-B18-017 | Whitespace regex overly permissive | `audit-phase8-close-out.test.ts` | Info |
| F-SA-B18-018 | `require()` instead of ESM `import` | `housekeeping-phase1-relocate-prisma.test.ts` | Low |
| F-SA-B18-019 | FR table parser column-count fragility | `housekeeping-phase11-final-acceptance.test.ts` | Info |
| F-SA-B18-020 | `runCaptured` throws on find permission errors | `housekeeping-phase11-final-acceptance.test.ts` | Low |
| F-SA-B18-021 | tech-debt.md parser uses hardcoded column offset | `housekeeping-phase12-closeout.test.ts` | Info |
| F-SA-B18-022 | Redundant grep assertions | `housekeeping-phase12-closeout.test.ts` | Info |
| F-SA-B18-023 | Blockquote detection assumes contiguous guard note | `housekeeping-phase3-agents-md.test.ts` | Low |
| F-SA-B18-024 | pnpm invocation regex doesn't exclude `pnpm dlx` | `housekeeping-phase3-agents-md.test.ts` | Info |
| F-SA-B18-025 | Test glob excludes `*.test.*` but not `*.spec.*` (by design) | `housekeeping-phase5-orphan-todos.test.ts` | Info |
| F-SA-B18-026 | Regex window for caret phrase detection | `housekeeping-phase6-repin-deps.test.ts` | Info |
| F-SA-B18-027 | Vague regex with unbounded `.*` | `housekeeping-phase6-repin-deps.test.ts` | Info |
| F-SA-B18-028 | Hardcoded SHAs sensitive to history rewrite | `housekeeping-phase7-git-notes.test.ts` | Info |
| F-SA-B18-029 | Per-commit `git notes show` subprocess overhead (59+ calls) | `housekeeping-phase7-git-notes.test.ts` | Info |
| F-SA-B18-030 | Canonical note format enforcement (good tightening) | `housekeeping-phase7-git-notes.test.ts` | N/A (positive) |
| F-SA-B18-031 | Regex complexity for ADR reference matching | `housekeeping-phase8-adr-directory.test.ts` | Info |

---

## Golden-Path Patterns Identified

1. **Hermetic gitignore testing** (`housekeeping-phase4-gitignore-log.test.ts`, §1.2) — Uses `git check-ignore -v --no-index` with a non-existent probe path to verify rule source without creating files. This is the recommended pattern for gitignore contract tests.

2. **Bounded-live CLI testing** (`housekeeping-phase9-commitlint-config.test.ts`, §3 + §7) — Static regex extraction from config (works without the CLI binary) as the authoritative gate, with `describe.runIf()` wrapping an optional live-CLI test. Avoids fake binaries while still providing real tool verification when available.

3. **Adversarial closure with hash identity** (`housekeeping-phase1-relocate-prisma.test.ts`, §1) — SHA-256 pre-snapshot that survives file moves, providing content-identity proof that no data changed during relocation. Recommended for any data-migration or file-relocation track.

4. **Multi-attempt binary resolution** (`housekeeping-phase9-commitlint-config.test.ts`, lines 560–586) — Checks 3 possible locations (local node_modules, app node_modules, `pnpm exec`) before skipping. Portable across CI and dev environments.

5. **Cross-phase regression guard** (`housekeeping-phase11-final-acceptance.test.ts`, §4) — Every Phase 1–9 deliverable file is checked for existence in a single acceptance test. Prevents silent removal or regression of earlier phase artifacts.

6. **Commented-out SQL regression guard** (`housekeeping-phase8-adr-directory.test.ts`, §7.4) — Pins the specific behavior of the lint script against `0018_audit_events.sql` line 50 (a previously-buggy case). Recommended pattern for any CI-script regression test.

7. **Negative control SHAs** (`housekeeping-phase7-git-notes.test.ts`, §2) — Explicit non-track commits listed alongside known-failing commits. Prevents over-attribution of track IDs to unrelated commits. Recommended pattern for git-note or label-based audit tests.

---

## Patterns Not to Generalize

1. **Intentional RED tests** (F3, F6, F8, F9, F10) — Several audit-phase tests are deliberately RED, asserting the audit's current failure state. This is valid for contract-pinning audit tests but should NOT be generalized to production test suites. Production tests should always be GREEN on the target branch.

2. **Hardcoded SHA lists** (`housekeeping-phase7-git-notes.test.ts`) — `KNOWN_FAILING_SHAS` and `NON_TRACK_SHAS` are hardcoded commit hashes. This pattern is sensitive to history rewrites (rebase, squash). Acceptable for audit close-out tests that pin specific commits, but not appropriate for ongoing CI.

3. **Ambiguous OR-pattern assertions** (`audit-phase2-static-analysis.test.ts`, §2.5, §4.4) — The `postTrack3 || preTrack3` pattern allows the test to pass in both pre-migration and post-migration states. This creates a false-green window where partial migration (e.g. 15 of 27 routes migrated) still passes. Use only for transitional audit contracts; remove once the migration is complete.

4. **Excessive JSDoc blocks** (F4, F5, F6, F7, F8, F9, F10) — Many audit test files have 30–65 line JSDoc blocks. While this follows AGENTS.md documentation standards, it creates very long files (675–1175 lines). Future audit protocol iterations should consider companion documentation files or template-generated JSDoc.

---

## Limitations

1. **No runtime execution** — Most tests in this batch are static analysis / file-system assertions. The `housekeeping-phase1-relocate-prisma.test.ts` §3 import smoke tests load modules but do not invoke them (no DB). Phase 11 `§5` explicitly documents that live-behavior gates (`pnpm turbo run test|lint|build`, `pnpm seed`) require a dev environment with Postgres and cannot be exercised here.

2. **Audit tests are meta-tests** — Files F2–F10 are audit protocol contract tests, not application tests. They verify that the audit artifacts (findings.md, inventory, executive summary, etc.) are internally consistent and match the filesystem. Their quality assessment is about the contract-pinning pattern itself, not about app behavior.

3. **Git history dependency** — `housekeeping-phase7-git-notes.test.ts` depends on specific commit SHAs and `git notes`. If the repository is shallow-cloned or notes are not fetched, these tests fail. The test design accepts this (JSDoc documents the volatility).

4. **Fixture files created in /tmp** — `housekeeping-phase8-adr-directory.test.ts` creates hermetic fixtures in `/tmp`. While cleaned up in `afterAll`, an interrupted test run could leave stale `.housekeeping-*` files. The prefix convention (`housekeeping-`) minimizes collision risk.

5. **No acceptance/closeout claims** — This report identifies findings for remediation; it does not declare any batch "accepted" or "closed."

---

## Summary

**20 files reviewed.** Key findings:

| Severity | Count |
|----------|-------|
| 🔴 High | 0 |
| 🟡 Medium | 0 |
| 🔵 Low | 5 (F-SA-B18-003: missing OTel adapter, F-SA-B18-009: ambiguous OR-pass in static analysis tests, F-SA-B18-016: regex window too tight, F-SA-B18-018: require() vs import, F-SA-B18-020/023: error handling and blockquote detection) |
| ℹ️ Informational | 26 (various: brittle parsers, regex edge cases, documentation verbosity, volatile SHAs, performance) |

**Most important action items:**

1. **Consider an observability adapter** (`instrumentation.ts`, F-SA-B18-003) — The `lib/instrumentation.ts` sibling file already exists as a contract-test target. Complete the split by routing the root `instrumentation.ts` through an internal OTel adapter.

2. **Fix OR-pattern ambiguity in static analysis tests** (`audit-phase2-static-analysis.test.ts`, F-SA-B18-009 + related) — The `migrated || preMigrated` pattern allows false-green for partial migration. Once the relevant migration tracks are complete, replace with a single-value assertion (e.g. `expect(files.length).toBe(0)`).

3. **Tighten regex windows in Phase 7** (`audit-phase7-present-to-user.test.ts`, F-SA-B18-016) — The 400-char window for Open Question status annotations could miss long bullets. Widen the limit or restructure the approach.

4. **Replace `require()` calls** (`housekeeping-phase1-relocate-prisma.test.ts`, F-SA-B18-018) — ESM `import` is available and preferred. Remove the eslint-disable and use proper imports.
