# Line-by-Line Review — games-batch-20

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-20`
**Scope source:** `/tmp/opencode/games-batch-20` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch is a **mixed bag**: one Measure compliance-audit track (5 docs), six app-level config/tooling files, two test/mock support files, four `sentence`-game page components, and one page test. Referenced runtime modules (`@/lib/games/api`, `@/lib/xp`, `@/hooks/useSession`, `gameCards.ts`, API route handlers, asset dirs) were inspected read-only to validate claims.
**Finding ID scheme:** `F-GAMES-B20-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Type |
|---|------|------|
| 1 | `measure/tracks/wizard-vs-zombie-compliance-audit_20260426/index.md` | track index |
| 2 | `measure/tracks/wizard-vs-zombie-compliance-audit_20260426/metadata.json` | track metadata |
| 3 | `measure/tracks/wizard-vs-zombie-compliance-audit_20260426/plan.md` | track plan |
| 4 | `measure/tracks/wizard-vs-zombie-compliance-audit_20260426/report.md` | track report |
| 5 | `measure/tracks/wizard-vs-zombie-compliance-audit_20260426/spec.md` | track spec |
| 6 | `measure/workflow.md` | workflow doc |
| 7 | `next.config.ts` | build config |
| 8 | `package.json` | manifest |
| 9 | `playwright.config.ts` | e2e config |
| 10 | `postcss.config.mjs` | css config |
| 11 | `remotion.config.ts` | video config |
| 12 | `scripts/check-game-coverage.sh` | coverage script |
| 13 | `scripts/record-gameplay-video.mjs` | recording script |
| 14 | `src/__mocks__/next/server.ts` | test mock |
| 15 | `src/app/[locale]/(student)/student/games/sentence/abyssal-well/page.tsx` | game page |
| 16 | `src/app/[locale]/(student)/student/games/sentence/castle-defense/page.tsx` | game page |
| 17 | `src/app/[locale]/(student)/student/games/sentence/devourer-slime/page.tsx` | game page |
| 18 | `src/app/[locale]/(student)/student/games/sentence/dungeon-liberator/page.test.tsx` | page test |
| 19 | `src/app/[locale]/(student)/student/games/sentence/dungeon-liberator/page.tsx` | game page |
| 20 | `src/app/[locale]/(student)/student/games/sentence/griffin-riders-escape/page.tsx` | game page |

---

## Cross-Batch Verification Performed (read-only)

- `next.config.ts` sets `output: "export"` (static export) — confirmed line 16.
- API route handlers exist for batch games (`abyssal-well`, `castle-defense`, `griffin-riders-escape`) under `src/app/api/v1/games/<id>/{sentences,complete}/route.ts`; all carry `export const dynamic = "force-static"`. Confirmed.
- `createCompleteRoute()` (`src/lib/games/api/completeRoute.ts`) is a **mock** that returns `mock-activity-<Date.now()>` and persists nothing. Confirmed lines 13-20.
- `useSession` (`src/hooks/useSession.ts`) returns a hardcoded `mock-user-id` / `xp:0` user — there is no real auth/session. Confirmed.
- Two divergent `calculateXP` implementations exist: `src/lib/xp.ts` and `src/lib/games/xp.ts` (identical body, duplicated). Confirmed.
- `remotion.config.ts` imports `@remotion/cli` but **no remotion package is in `package.json`** and `node_modules/@remotion` is absent. Confirmed.
- `record-gameplay-video.mjs` imports `playwright` but only `@playwright/test` is in `package.json`; bare `playwright` is not installed. Confirmed.
- e2e specs exist for all four game pages in this batch under `tests/e2e/games/sentence/`. Confirmed.
- `gameCards.ts` cover paths are inconsistent (`castle-defense-cover.png`, `dungeon-liberator.png`, `cover-the-abyssal-well.png`). Confirmed lines 17, 97, 145.

---

## Findings

### File 1 — `wizard-vs-zombie-compliance-audit/index.md`

**F-GAMES-B20-001 · Info · index.md:1-5**
Minimal three-link stub (spec/plan/metadata). `report.md` — the document carrying the actual audit evidence — is not linked. The track's most important deliverable is undiscoverable from its own index. Recurring pattern across this audit program.

### File 2 — `wizard-vs-zombie-compliance-audit/metadata.json`

**F-GAMES-B20-002 · High · metadata.json:4 vs plan.md:59 & report.md**
`"status": "new"` while `plan.md:59` marks "Update track metadata.json status to completed" as `[x]` done and `report.md` declares the audit complete (25/25, 89.05% coverage, "All 25 compliance specifications now pass"). Metadata flatly contradicts the plan and report. A reader scanning track state sees "new" and cannot tell the audit ran. Same class of defect seen across the audit program (cf. batch-15 B15-002/010/024).

**F-GAMES-B20-003 · Low · metadata.json:9-10**
`"actual_tasks": null` and empty `deviation_notes` despite `plan.md` showing ~35 tasks across 7 phases checked off, including documented deviations (RAF refactor, screen replacement, difficulty rename). Completion bookkeeping was never reconciled.

### File 3 — `wizard-vs-zombie-compliance-audit/plan.md`

**F-GAMES-B20-004 · Medium · plan.md:44-61 (all Phase 6–7 fix tasks share commit `6fe989a`)**
The entire fix set — `useGameFullscreen`, RAF conversion, GameStartScreen/GameEndScreen swap, difficulty standardization, `useCurrentLocale`, unused-import removal, plus new tests and the report — collapses into a single commit `6fe989a` (plus `28a59e6` for the plan). A multi-fix TDD audit landing in one commit gives no Red/Green increment trail; the per-task hashes are decorative, weakening the "strict TDD" claim AGENTS.md requires.

**F-GAMES-B20-005 · Low · plan.md:36 vs plan.md:54 & report.md:120-123**
Baseline coverage is reported as 69.78% with `StartScreen.tsx` at **0%** (plan.md:5, 36). The fix "removed" the 0%-coverage StartScreen.tsx and re-blended to 89.05%. Per the post-fix breakdown (report.md:120-123) `page.tsx` is **76.22%** — below the 80% gate — but the blended overall (89.05%) is used to claim a pass. The riskiest player-facing surface (the page) is technically non-compliant; the blend masks it (same masking pattern as batch-15 B15-005).

### File 4 — `wizard-vs-zombie-compliance-audit/report.md`

**F-GAMES-B20-006 · Medium · report.md:99-108 (deletion of 416-line StartScreen + coverage re-baselining)**
Fix #5 deletes a 416-line custom `StartScreen.tsx` and fix #6 explicitly states "Removed 0%-coverage StartScreen.tsx from report." Removing an untested file to lift the blended coverage number is a legitimate refactor, but presenting the resulting 89.05% as the audit win conflates "deleted the untested code" with "added test coverage." The report should distinguish coverage gained from new tests vs coverage gained by deletion.

**F-GAMES-B20-007 · Low · report.md:16 vs plan.md:6**
Report claims "Lint Status: Clean (0 errors, 0 warnings)" but does not show the command/output. Baseline lint had a warning (`plan.md:6`); the clean claim is asserted, not evidenced. Minor, but the report is the compliance artifact of record.

**F-GAMES-B20-008 · Info · report.md:56,93-96 (difficulty rename only)**
Difficulty "standardization" was a **rename** (`easy/normal/hard/extreme` → `easy/medium/hard`) plus removal of the `extreme` tier. The report does not confirm the renamed tiers actually drive distinct spawn rates / word counts / speeds (spec item 13, spec.md:41). Given that sibling audits in this program admitted difficulty props are not consumed by game logic (batch-15 B15-019), this PASS should have been evidenced with the actual `DIFFICULTY_MODIFIERS` values, not just the type change.

### File 5 — `wizard-vs-zombie-compliance-audit/spec.md`

**F-GAMES-B20-009 · Info · spec.md:36,56**
Spec names `createVocabularyRoute` / `createCompleteRoute` and cover path `/public/games/cover/wizard-vs-zombie-cover.png`. This is a vocabulary-game spec embedded in a batch that is otherwise about sentence games; the factory names differ from the `createSentencesRoute` used by the sentence games reviewed below. Cross-spec naming is not unified across the program — a shared-runtime governance gap (consistent with batch-15 B15-008/030).

**F-GAMES-B20-010 · Info · spec.md:43-44 (camera spec only "if world > 500px")**
The camera/off-screen-indicator requirement is conditional. This conditionality is fine, but no spec item requires the game to declare whether it uses a camera, so a reviewer cannot tell whether "PASS" on items 15/16 reflects a tested camera or an N/A. Ambiguous acceptance language.

---

### File 6 — `measure/workflow.md`

**F-GAMES-B20-011 · Low · workflow.md:151-174 (un-instantiated template)**
The "Development Commands" section is still the generic template with Python/Go placeholders ("e.g., for a Node.js project: npm install", "for a Go project: go mod tidy") and empty code fences. For a Next.js/Jest/Playwright app this should name the real commands (`npm test`, `npm run lint`, `npx jest --coverage`, `playwright test`). Agents following this workflow get no project-specific guidance, increasing the chance of inconsistent execution.

**F-GAMES-B20-012 · Low · workflow.md:69-135 (heavy interactive gate vs automation)**
The Phase Completion protocol mandates a human "PAUSE and await the user's response" (workflow.md:114-116) and git-notes checkpoints. This conflicts with the largely autonomous, single-commit execution actually observed in the audit tracks (B20-004) — i.e., the documented workflow and the practiced workflow diverge. Not a code defect, but it means workflow.md is not a reliable description of how tracks are really run.

**F-GAMES-B20-013 · Info · workflow.md:122-129 (mis-numbered steps)**
Step numbering is broken in the checkpoint protocol: "Step 8.1/8.2" appear under list item **7** (Attach Report) and "Step 7.1/7.2/7.3" under item **8** (Record SHA). The sub-step numbers are swapped relative to their parent items. Cosmetic but propagated into every track that follows it.

---

### File 7 — `next.config.ts`

**F-GAMES-B20-014 · High · next.config.ts:16 (static export breaks POST API routes)**
`output: "export"` produces a fully static site. Next.js static export **cannot serve dynamic Route Handlers** — only GET handlers can be statically prerendered, and `POST` handlers do not exist in an exported build. Every game page in this batch POSTs to `/api/v1/games/<id>/complete` (e.g., abyssal-well page.tsx:84, castle-defense:83, devourer-slime:84, dungeon-liberator:83, griffin:41). In the exported deployment these POSTs will 404/405, so **XP/score/progress submission is silently non-functional in production**. The handlers' `dynamic = "force-static"` masks this at build time but does not make POST work at runtime. This is the single most important readiness/integration defect in the batch.

**F-GAMES-B20-015 · Medium · next.config.ts:17-18 (`images.unoptimized`)**
Image optimization is disabled (required for static export). Combined with React-Konva canvas games loading PNG sprite sheets, there is no built-in responsive/format optimization; large or unoptimized art ships as-is. Acceptable for static export but a performance/mobile-bandwidth note: asset weight must be controlled manually since the platform offers no fallback.

**F-GAMES-B20-016 · Low · next.config.ts:20-21 (basePath/assetPrefix and importability)**
`basePath`/`assetPrefix` are derived from GitHub Actions / env. This GitHub-Pages-oriented config is specific to standalone deployment of advantage-games. When these games are **imported into Reading/Primary** (the stated portability goal), the basePath logic and `withBasePath()` asset wrapping in `gameCards.ts` must be reconciled with the host app's routing — a concrete cross-app integration risk not addressed here.

### File 8 — `package.json`

**F-GAMES-B20-017 · Medium · package.json:38-62 (remotion + playwright deps missing)**
`remotion.config.ts` (file 11) imports `@remotion/cli/config` and `scripts/record-gameplay-video.mjs` (file 13) imports the bare `playwright` package, but **neither `@remotion/*` nor `playwright`** is declared in dependencies/devDependencies. Only `@playwright/test` is present. Both scripts will fail with module-not-found if run from a clean install. Either dead tooling (should be removed) or missing deps (should be added) — currently a broken/unsupported tooling surface.

**F-GAMES-B20-018 · Low · package.json:9 (`"lint": "eslint"` with no path/flags)**
The lint script is bare `eslint` with no target glob or `--max-warnings`. Behavior depends entirely on flat-config defaults; CI cannot enforce a zero-warning gate (the wizard report's "0 warnings" claim, B20-007, is not enforceable by this script as written).

**F-GAMES-B20-019 · Low · package.json:55 vs 29 (eslint-config-next 15 vs next 16)**
`next` is `16.2.9` but `eslint-config-next` is pinned to `15.5.9`. Major-version skew between the framework and its lint config can miss or misfire Next 16 lint rules. Pre-existing version drift worth flagging for the platform.

**F-GAMES-B20-020 · Info · package.json:2 (`"name": "vocabulary-games"`)**
Package name is `vocabulary-games` while the app dir is `advantage-games` and the batch is dominated by `sentence` games. Naming drift; minor confusion for tooling/imports.

### File 9 — `playwright.config.ts`

**F-GAMES-B20-021 · Medium · playwright.config.ts:22-26 (single browser project)**
Only `chromium` is configured. The audit's stated focus includes **browser compatibility**; there are no WebKit (Safari/iOS) or Firefox projects. React-Konva + canvas + fullscreen behavior differs materially on iOS Safari (the primary mobile target per AGENTS.md mobile-first portrait). Cross-browser readiness is unverified by the e2e harness.

**F-GAMES-B20-022 · Low · playwright.config.ts:27-32 (`npm run dev` as webServer)**
e2e runs against the dev server (`npm run dev --turbopack`), not a production `next build && start`/exported build. Because the production target is static export (B20-014), the e2e suite never exercises the actual deployed artifact — notably the POST `/complete` path that works in dev but breaks in export. Tests can pass while production is broken.

### File 10 — `postcss.config.mjs`

**F-GAMES-B20-023 · Info · postcss.config.mjs:1-5**
Minimal Tailwind v4 PostCSS config. No issues. Consistent with `@tailwindcss/postcss` in devDependencies.

### File 11 — `remotion.config.ts`

**F-GAMES-B20-024 · Medium · remotion.config.ts:1-4 (orphaned config, missing dependency)**
Imports `@remotion/cli/config` which is not installed (B20-017). This config is orphaned — there is no remotion composition/entry in the batch and the package is absent. Either dead code to remove or an incomplete video-tooling integration. As-is it is a build/tooling trap.

### File 12 — `scripts/check-game-coverage.sh`

**F-GAMES-B20-025 · Low · check-game-coverage.sh:21 (hardcoded game list, none from this batch)**
The default `GAMES` list is six fixed games (`shadowGateDungeon|runeForgeChamber|villageGuardian|labyrinthGoblinKing|abyssalWell|archersRevenge`). It is not data-driven from the registry and does not cover most games (e.g., castle-defense, dungeon-liberator, devourer-slime, griffin-riders-escape are absent). Coverage auditing is selective and will silently omit games not in the literal. The script's own comment (lines 16-19) correctly warns that mocked tests inflate coverage — a good caveat, but the script does not enforce it.

**F-GAMES-B20-026 · Info · check-game-coverage.sh:7-19 (pseudocode comment block)**
Large PSEUDOCODE comment duplicates the actual implementation. Harmless, but indicates the script was scaffolded and left semi-finished.

### File 13 — `scripts/record-gameplay-video.mjs`

**F-GAMES-B20-027 · Medium · record-gameplay-video.mjs:1 (imports uninstalled `playwright`)**
`import { chromium } from 'playwright'` — the bare `playwright` package is not a dependency (only `@playwright/test`). Script fails on a clean checkout. Should import from `@playwright/test` or declare `playwright`.

**F-GAMES-B20-028 · Low · record-gameplay-video.mjs:35,124 (hardcoded to wizard-vs-zombie + localhost)**
URL `http://localhost:3000/en/student/games/vocabulary/wizard-vs-zombie/` and output filename are hardcoded to one game. Not parameterized, ignores `basePath`, and uses random keyboard input (lines 76-103) — non-deterministic "gameplay" that proves little about correctness. Useful as a demo, but not a reliable QA/recording tool.

**F-GAMES-B20-029 · Info · record-gameplay-video.mjs:17-19 (`headless: false`)**
Requires a headed browser and `slowMo`; cannot run in CI/headless environments. Manual-only tool.

### File 14 — `src/__mocks__/next/server.ts`

**F-GAMES-B20-030 · Medium · server.ts:1-41 (mock diverges from real NextResponse/NextRequest)**
The hand-rolled mock implements only `json()`/`status`/`url`/`headers`. Real `NextResponse.json` sets `Content-Type`, supports `headers`/`cookies`, and `NextRequest` exposes `nextUrl`, `cookies`, `method`, search params, etc. Route-handler tests using this mock pass against a much thinner contract than production — tests can pass while real handlers misbehave (e.g., header/cookie/method logic is untested). For auth/session-bearing endpoints this is a meaningful test-fidelity gap, though the current handlers are mocks themselves (B20-031).

### File 15 — `abyssal-well/page.tsx`

**F-GAMES-B20-031 · High · page.tsx:84-96 (XP/progress submission is a no-op in production)**
`handleComplete` POSTs to `/api/v1/games/abyssal-well/complete`. As established (B20-014), POST handlers don't exist in static export, and even in dev the `createCompleteRoute` handler persists nothing (returns `mock-activity-<timestamp>`). So **no XP, score, accuracy, or progress is ever recorded** to any backend/leaderboard. `setLastResult` only updates client-side Zustand state. For the audit's scoring/XP/leaderboards/progress focus, this game has no real progress persistence.

**F-GAMES-B20-032 · High · page.tsx:122-193 (hardcoded Thai-only error/UX strings)**
The entire NO_SENTENCES / INSUFFICIENT_SENTENCES screen is hardcoded Thai (`"กลับไปหน้าเกม"`, `"ไม่พบประโยคที่บันทึกไว้"`, etc.) with no i18n. The page imports `useScopedI18n` (line 8, `t`) but only uses it for the loading string (line 110); all error and back-link copy bypasses i18n. This breaks the platform's i18n contract and is a hard blocker for importing into English-first Reading/Primary apps and for any non-Thai locale. Accessibility/age-UX: a non-Thai child sees untranslated UI.

**F-GAMES-B20-033 · Medium · page.tsx:92-93 (fabricated correctAnswers/totalAttempts)**
`correctAnswers: Math.floor(results.accuracy * 10)` and `totalAttempts: 10` are synthesized from accuracy rather than reported by the game. The real attempt counts are discarded, so any server-side XP recomputation (`createCompleteRoute` recomputes from these) would be based on fabricated denominators. Scoring integrity defect — the "10" is arbitrary.

**F-GAMES-B20-034 · Low · page.tsx:13-19 vs 21-23 (imports interleaved with code)**
`dynamic(...)` definition (lines 13-19) is placed between import groups, with more imports (Button, icons, Header) after it (lines 21-24). Stylistic, but violates import-ordering conventions and the kind of thing the project's own lint gate should catch.

**F-GAMES-B20-035 · Low · page.tsx:79-102 (onComplete signature lacks difficulty)**
`handleComplete` for abyssal-well accepts only `{ xp, accuracy }` and includes `userId: session?.user?.id` in the body, while sibling pages (castle-defense, dungeon-liberator) send `difficulty` and omit `userId`. The per-game complete payloads are inconsistent — divergent contracts to the same factory endpoint, complicating any unified progress/leaderboard backend.

### File 16 — `castle-defense/page.tsx`

**F-GAMES-B20-036 · High · page.tsx:121-237 (hardcoded Thai-only error/UX, no i18n at all)**
Same as B20-032 but worse: this page imports neither `useScopedI18n` nor any translation for the loading string (line 109 `"กำลังโหลด"` is a literal). All copy — error screens, a multi-step "how to save sentences" instruction list (lines 202-211), progress label — is hardcoded Thai. Zero i18n. Blocks importability and non-Thai locales.

**F-GAMES-B20-037 · Low · page.tsx:40-41 (eslint-disable for unused session)**
`session` is destructured then suppressed with `// eslint-disable-next-line @typescript-eslint/no-unused-vars`. Calling `useSession()` only for side-effects but discarding the value is wasteful; if session isn't needed, drop the destructure. Indicates copy-paste from a page that did use session.

**F-GAMES-B20-038 · Medium · page.tsx:78-101, 92-93 (fabricated counts) & component prop name mismatch**
Same fabricated `correctAnswers`/`totalAttempts: 10` issue as B20-033. Additionally, sentences are loaded into state typed `SentenceItem[]` (line 33) but passed to the game as `vocabulary={sentences}` (line 256) — the prop is named "vocabulary" while carrying sentence items, echoing the cross-app `VocabularyItem`/`SentenceItem` contract confusion flagged elsewhere in this audit program.

### File 17 — `devourer-slime/page.tsx`

**F-GAMES-B20-039 · Medium · page.tsx:13-14, 77 (uses `@/lib/xp` not `@/lib/games/xp`; duplicated XP logic)**
This page imports `calculateXP` from `@/lib/xp` (line 13) and computes XP client-side, whereas the platform also has `@/lib/games/xp` with an identical function. Two sources of truth for XP. Worse, the other pages let the (mock) server route compute XP, while this page computes it client-side and sends `xpEarned: xp` — inconsistent XP pipelines across games undermines comparable scoring/leaderboards.

**F-GAMES-B20-040 · High · page.tsx:84-95 (progress submission no-op) + English-only here**
Same POST-to-mock no-op as B20-031 (devourer-slime/complete). Note this page's UX strings are English ("Forest Empty", "Concocting Slimy Essence...", line 144 "Back to Library"), while abyssal-well/castle-defense/dungeon-liberator are Thai. The batch ships **mixed hardcoded languages with no i18n** — a glaring inconsistency for a single platform and a localization blocker either way.

**F-GAMES-B20-041 · Low · page.tsx:40-41 (hooks called for side-effect, results discarded)**
`useSession()` and `useScopedI18n(...)` are invoked with their return values discarded. The i18n hook is imported and called but never used to translate any string on the page — dead i18n wiring.

**F-GAMES-B20-042 · Low · page.tsx:144 (back link to `/` not `/student/games`)**
The error-screen CTA links to `/` ("Back to Library") while every other page in the batch links to `/student/games`. Inconsistent navigation; in an imported context `/` is the host app root, likely wrong.

### File 18 — `dungeon-liberator/page.test.tsx`

**F-GAMES-B20-043 · Medium · page.test.tsx:32-34 (game component fully mocked → zero gameplay coverage)**
The test mocks `DungeonLiberatorGame` to a static `<div>`. This is reasonable for a page test, but it means the page's only real logic exercised is fetch/warning branching and rendering. `handleComplete` (the XP/POST path) is **never invoked or asserted** — the scoring/submission code has no test coverage here. The most defect-prone logic (B20-031/033) is untested at the page layer.

**F-GAMES-B20-044 · Low · page.test.tsx:38-43 (fetch mock omits `ok`/error paths inconsistently)**
The happy-path mock returns `{ ok: true, json: ... }`, but the page never checks `res.ok` (dungeon-liberator/page.tsx:50 reads `data` regardless of status). Tests don't cover a non-OK HTTP response or a network rejection's `setWarningStatus("NO_SENTENCES")` catch branch (page.tsx:67-70). Error-handling coverage gap.

**F-GAMES-B20-045 · Info · page.test.tsx:27-29 (locale mock hardcodes 'en')**
`useCurrentLocale` is mocked to `'en'`; the locale-driven fetch URL and any locale branching are never tested across locales. Given the i18n defects (B20-032/036), there is no test guarding localization behavior.

### File 19 — `dungeon-liberator/page.tsx`

**F-GAMES-B20-046 · High · page.tsx:116-192 (hardcoded Thai-only error/UX, no i18n)**
Same blocker as B20-032/036: error screens, loading string (line 109 `"กำลังโหลด"`), and navigation labels are hardcoded Thai. No `useScopedI18n` usage at all. Importability/localization blocker.

**F-GAMES-B20-047 · Medium · page.tsx:83-94, 92-93 (no-op submission + fabricated counts)**
Same as B20-031/033: POSTs to mock `/complete` (no persistence in dev, non-existent in static export) and fabricates `correctAnswers`/`totalAttempts: 10` from accuracy.

**F-GAMES-B20-048 · Low · page.tsx:40-41 (unused session suppressed)**
Same `eslint-disable` for an unused `session` as castle-defense (B20-037).

### File 20 — `griffin-riders-escape/page.tsx`

**F-GAMES-B20-049 · High · page.tsx:39-52 (no warning/empty-state handling + no-op submission)**
Unlike the other four pages, this page has **no NO_SENTENCES / INSUFFICIENT_SENTENCES handling**. If the API returns a warning (no `data.sentences`), `vocabulary` stays `[]` and the game renders with empty data — likely a broken/empty game rather than a helpful prompt to read articles. It also lacks the `res.ok` check. `handleComplete` POSTs `...results` plus `userId` to the mock `/complete` (no persistence; non-functional in export). Readiness/UX gap relative to its siblings.

**F-GAMES-B20-050 · Medium · page.tsx:39 (no accuracy/XP normalization, raw spread)**
`handleComplete` spreads `results` (`{ accuracy, xp }`) directly into the POST body with no validation/clamping and no `correctAnswers`/`totalAttempts`. The server route's recompute path (`xp ?? floor(correct*acc)`) would get `undefined` counts. Scoring contract is the loosest of the batch — yet another per-game divergence (cf. B20-035).

**F-GAMES-B20-051 · Low · page.tsx:57 (single hardcoded English loading fallback)**
Loading text uses `t('loading') || 'Loading Skyscape...'` — at least wired to i18n (better than siblings), but the game has no error/empty UI to translate, so the i18n surface is inconsistent across the batch. Positive relative to B20-032/036/046, noted for contrast.

**F-GAMES-B20-052 · Info · page.tsx:5 (VocabularyItem type for a sentence game)**
Imports `VocabularyItem` from `@/store/useGameStore` to type sentence data — same `VocabularyItem`-vs-`SentenceItem` contract divergence flagged across the program. Reinforces that the shared sentence data contract is not unified.

---

## Cross-Cutting Themes

| Theme | Findings | Severity |
|-------|----------|----------|
| Static export (`output: "export"`) makes POST `/complete` non-functional in production; XP/score/progress never persisted (also a client mock) | B20-014, B20-031, B20-040, B20-047, B20-049 | High |
| Hardcoded, non-i18n UI strings — Thai in 3 pages, English in 1, mixed across batch — blocks importability into Reading/Primary and non-Thai locales | B20-032, B20-036, B20-040, B20-046 | High |
| Track metadata `status:"new"` contradicts plan/report "completed" | B20-002 | High |
| Fabricated `correctAnswers`/`totalAttempts:10` and divergent per-game complete payloads (some send difficulty/userId, some don't) → inconsistent scoring contract | B20-033, B20-035, B20-038, B20-047, B20-050 | Medium |
| Orphaned/broken tooling: remotion config without dep, record script imports uninstalled `playwright` | B20-017, B20-024, B20-027 | Medium |
| Browser-compat & artifact-fidelity gaps: chromium-only e2e, e2e runs dev not exported build | B20-021, B20-022 | Medium |
| Test fidelity: NextResponse/NextRequest mock thinner than real; game/handleComplete fully mocked out | B20-030, B20-043, B20-044 | Medium |
| Duplicated/divergent `calculateXP` (`@/lib/xp` vs `@/lib/games/xp`); inconsistent client-vs-server XP computation | B20-039 | Medium |
| Single-commit audit (no incremental TDD trail) + coverage masked by deletion/blending; page coverage <80% | B20-004, B20-005, B20-006 | Low–Medium |
| `VocabularyItem` vs `SentenceItem` contract divergence in sentence games | B20-038, B20-052 | Info–Medium |
| Stale/generic workflow.md template; mis-numbered steps; unenforceable lint script | B20-011, B20-013, B20-018 | Low |

---

## Limitations

- **Read-only review.** No source was edited, per instructions. The wizard-vs-zombie report's 25/25 verdicts and coverage numbers were not independently re-derived end-to-end; only the spot-checks under "Cross-Batch Verification Performed" were run (file/symbol existence, dep presence, config values, route-handler bodies, registry lines).
- I did **not** execute the games, run the Jest suites, run Playwright, measure runtime FPS, render on real iOS Safari/Firefox, or submit to any live backend. FPS/mobile/accessibility/touch-target claims are taken from documents as claims, not measured.
- The static-export → POST-non-functional finding (B20-014) is based on documented Next.js static-export behavior and the confirmed `output:"export"` + `force-static` handlers; it was not reproduced via a production build in this session.
- The four game pages' linked game components, the full `@/lib/games/api` factory set, and asset directories were consulted only for verification and are not themselves under review in this batch.
- i18n findings are based on literal string inspection; it is possible (though unsupported by the code read) that a build step externalizes these strings — no such mechanism was found.
- Findings are scoped to the 20 files in `/tmp/opencode/games-batch-20`.

---

*No acceptance or closeout determination is made by this report. This is a line-by-line review deliverable only; track acceptance/closeout remains the responsibility of the Measure workflow owner.*
