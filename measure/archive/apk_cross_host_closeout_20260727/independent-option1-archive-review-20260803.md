# Independent Option-1 Archive Review — 2026-08-03

Reviewer: independent adversarial reviewer (subagent). Scope: falsify the completion claims of the
APK option-1 multi-title host-proof cutover across the 7 Measure tracks listed below, against actual
repo state. Session notes were read but not trusted; every claim below was re-verified with the
commands shown.

## Inputs read

- `measure/tracks/apk_option1_terminal_truth_20260803.json` (fact table)
- `measure/product-owner-apk-live-path-deletion-authority-20260803.json` (authority)
- `measure/tracks/apk_cutover_session_progress_20260803.md` (claims, not evidence)
- All 7 track dirs: metadata.json, plan.md, product-owner-formal-acceptance-2026-08-02.json,
  retirement-disposition-package-2026-08-02.json (where present), residual inventory, and supporting JSONs.

## Verdict: **FAIL**

The eight deletions are authentic and verified absent, the authority is operative-executed, all formals
bind correctly, and the agreement test suites are green. However, Check 5 surfaced a **High** live
dangling caller: the student games hub still `router.push`es to the 8 deleted route paths via three UI
CTAs ("Play Now" buttons for all 8 cutover titles and the entire sentence-game card surface), with no
middleware redirect/catch-all — those clicks resolve to 404, contradicting the "replaced by dual-host
host-proof production cutover" completion claim on the primary student games surface. Archive of 4 of
the 7 tracks is blocked on that bounded, single-file fix; the other 3 tracks are archive-ready as-is.

---

## Check 1 — Deleted Reading student routes absent: **PASS**

Command (fs): `for p in <8 paths>; do [ -e "$p" ] && echo EXISTS || echo absent; done`
Result: all 8 reported `absent`:

- `apps/reading-advantage/app/[locale]/(student)/student/games/sentence/castle-defense`
- `apps/reading-advantage/app/[locale]/(student)/student/games/sentence/potion-rush`
- `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/dragon-flight`
- `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/dragon-rider`
- `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/enchanted-library`
- `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/magic-defense`
- `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/rune-match`
- `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie`

Command (git): `git log --diff-filter=D --oneline -- <path>` for each path.
Result: each path deleted by commit `faa750580` (2026-08-03 12:03:24 +0700,
`feat(apk): option-1 multi-title host-proof cutover (track_id: apk_existing_core_cutover_20260727)`).
The commit's stat shows exactly 8 `page.tsx` deletions (+7 sibling `page.test.tsx` files) under
reading-advantage student games; no other Reading student route was deleted in that commit, and
`git log --diff-filter=D` shows no older deletion of these paths. Only surviving student game route is
`vocabulary/rpg-battle` (not in the fact table's deleted set — correct).

## Check 2 — Track metadata + plan completeness: **PASS**

Command: `cat measure/tracks/<id>/metadata.json`; `grep -c '^- \[ \]' plan.md` per track.

| track | metadata.status | unchecked plan tasks |
|---|---|---|
| apk_existing_core_cutover_20260727 | complete | 0 |
| apk_existing_action_cutover_20260727 | complete | 0 |
| apk_legacy_defense_cutover_20260727 | complete | 0 |
| apk_legacy_puzzle_cutover_20260727 | complete | 0 |
| apk_legacy_traversal_cutover_20260727 | complete | 0 |
| apk_cross_host_closeout_20260727 | complete | 0 |
| apk_standard_pack_suitability_ingestion_20260728 | complete | 1 — plan.md line 117 `- [ ] Optional future: ...` |

The single unchecked item in `apk_standard_pack_suitability_ingestion_20260728/plan.md` (lines 101–121)
is the documented **optional Phase-7** legacy-PNG ingest, explicitly non-blocking for closeout and
confirmed by `phase7-scope-clarification-2026-08-03.json` (`status: phase7-optional-deferred-not-track-blocking`).
This matches the review mandate exactly. No other unchecked markers exist in any plan.md
(also scanned for `[ ]` / `[X]` variants).

## Check 3 — Authority JSON operative + criterion-3 true: **PASS**

Command: `python3 -c` decode of authority + `sha256sum` of fact table.
Result:

- `status: operative-executed`, `operative: true`
- `authorization.criterion_3_retirement_complete: true` (also `production_cutover_authorized`, `live_legacy_path_deletion_authorized`, `track_formal_close_authorized` all true)
- Fact-table binding verifies: `sha256(measure/tracks/apk_option1_terminal_truth_20260803.json) = 01fa70f7…60e1` == `fact_table.sha256`
- Approval-message binding verifies: `sha256(message_exact)` == `approval_event.message_sha256` (`1ce674f3…ce08`)
- Supersede chain verifies: `measure/product-owner-apk-deferred-retirement-authority-20260803.json` has `status: superseded-by-live-path-deletion-authority`, `operative: false`; the agent self-signed
  `product-owner-apk-production-deferred-retirement-track-complete-20260803.json` exists and is rejected/non-operative per disclosures.
- Closeout retirement package's bound authority SHA (`85bf4dbd…b1a5`) verifies against the on-disk authority file.

## Check 4 — Agreement test suites: **PASS**

Command: `python3 -m pytest measure/tests/test_apk_option1_terminal_agreement_20260803.py measure/tests/test_apk_retirement_disposition_packages_20260802.py -q`
Result: `11 passed, 18 subtests passed in 0.79s`.
The agreement suite includes `test_deleted_paths_from_fact_table_are_absent` (fs-absence for all 8 paths) and
authority/formals/disposition SHA bindings. Note: this suite checks fs-absence and document binding; it does
**not** scan for live callers of deleted routes (that gap is what Check 5 caught).

## Check 5 — Contradiction hunt: **FAIL** (findings below)

Searches performed: `grep` for route slugs in `apps/reading-advantage` (asset paths, component imports,
hrefs, `router.push`, `window.location`), `git show` of the cutover commit, `measure/generated/routes.md`,
middleware inspection, and cross-app import scan.

### High — H1: Games hub still navigates to the 8 deleted routes (live dangling caller)

File: `apps/reading-advantage/app/[locale]/(student)/student/games/page.tsx` (the student games hub,
reachable via `configs/student-page-config.ts` href `/student/games`).

- Line 293 (vocabulary card "Play Now" `<Button>`): `router.push(\`/student/games/${game.id}\`)`
  → `/student/games/vocabulary/{magic-defense,rune-match,wizard-vs-zombie,dragon-flight,dragon-rider,enchanted-library}` — all deleted.
- Line 334 (sentence card `onClick`): `router.push(\`/student/games/${game.id}\`)`
  → `/student/games/sentence/{castle-defense,potion-rush}` — both deleted.
- Line 426 (sentence card "Play Now" `<Button>`): same deleted paths.

The commit `faa750580` added a `cutoverHref` map to the **card-body** `onClick` for all 8 titles (works),
but the Play-Now buttons (which `stopPropagation`) and the sentence-game cards were not updated. No
middleware rewrite/redirect exists for these paths (`apps/reading-advantage/middleware.ts` has no
game-path handling; no catch-all route exists under `student/games`; the only surviving sibling route is
`vocabulary/rpg-battle`). Net effect: clicking Play Now on any of the 8 cutover game cards, or clicking a
sentence-game card, renders 404 instead of the host-proof surface.

Why it matters: this is a live UI caller of the deleted paths on the primary student surface — exactly the
"retain-live-callers" failure class the fact table's `forbidden_when_c3_complete` list warns about
(`retain-live-callers-zero-deletion`; deletion occurred, but a live caller of the deleted paths remains).
The deletion itself is NOT being challenged (all 8 paths are absent and correctly listed); the fix is to
re-point those three `router.push` sites to the existing `cutoverHref` map (or remove the stale CTAs) —
**not** new deletions. This is a bounded single-file fix.

### Medium — M1: `measure/generated/routes.md` still lists the 8 deleted routes

`measure/generated/routes.md` (regenerated in the same commit `faa750580`, header source revision
`7e4bdf14…`) lines 275–283 still list all 8 deleted reading-advantage route files plus rpg-battle.
Consumers of the generated doc would believe the routes exist. The live tree is authoritative; this is a
stale committed artifact contradicting the deletion claim.

### Low — L1: local `.next` build artifacts still list the deleted routes

`.next/types/routes.d.ts` and `.next/dev/types/validator.ts` (and `.next/types/validator.ts`) still
declare the 8 deleted routes. `.next/` is gitignored (`apps/reading-advantage/.gitignore` line 15), so
this is stale local build output, not repo state; a fresh build regenerates it. Informational only.

### Classified as legitimate remains (NOT contradictions; do NOT delete)

- Game components + their tests under `components/games/{sentence,vocabulary}/<slug>/` (e.g.
  `DragonFlightGame.tsx`, `CastleDefenseGame.tsx`, `.test.tsx`) — consumed by host-proof loaders
  (`lib/host-proof-cartridge-loader.ts`), `HostProofGameClient` gameType union, and lesson phase
  `components/lesson/phases/phase10-vocabulary-matching.tsx` (direct component render, not routes).
  Session note discloses this class; verified real, matches "lesson-phase callers may legitimately remain".
- Public asset paths (`withBasePath("/games/sentence/potion-rush/…")` etc.) — files exist under
  `apps/reading-advantage/public/games/…`; these are assets, not routes.
- `EnchantedLibraryGame.tsx:805` `window.location.href = "/student/games"` — navigates to the hub (exists).
- `configs/student-page-config.ts` href `/student/games` — hub exists.
- `apps/advantage-games/tests/e2e/fixtures/gameFixtures.ts` paths — refer to the separate
  `apps/advantage-games` app's own routes (which exist there), out of scope.
- `__test__/jest30-phase5-quarantine.test.ts` — references the still-existing component test files.
- Host-proof surface covers all 8 titles: `(host-proof)/student/host-proof/games/page.tsx`
  `PRODUCTION_CUTOVER_GAME_TYPES` includes dragon-flight, magic-defense, castle-defense, wizard-vs-zombie,
  enchanted-library, rune-match, potion-rush; dragon-rider has a dedicated route
  `(host-proof)/student/host-proof/dragon-rider/page.tsx`. Verified present.

---

## Archive-readiness statement per track

| Track | Ready | Basis |
|---|---|---|
| apk_existing_core_cutover_20260727 | **NO** — blocked by H1 | Deletions, formals, authority verified; but hub Play-Now for magic-defense + dragon-flight → 404. Fix: re-point `page.tsx` line 293 to `cutoverHref`. |
| apk_existing_action_cutover_20260727 | **YES** | Source-blocked cohort terminal (5/5), 0 deletions, no hub presence; fact table, formal, retirement package mutually consistent. |
| apk_legacy_defense_cutover_20260727 | **NO** — blocked by H1 | Deletions verified; but castle-defense card+button and wizard-vs-zombie Play-Now → 404. |
| apk_legacy_traversal_cutover_20260727 | **NO** — blocked by H1 | dragon-rider route deleted and absent; hub Play-Now for dragon-rider → 404. |
| apk_legacy_puzzle_cutover_20260727 | **NO** — blocked by H1 | 3 deletions verified; enchanted-library/rune-match Play-Now and potion-rush card+button → 404. |
| apk_cross_host_closeout_20260727 | **YES** | Residual-only closeout (0 deletions, all inventory items cohort-owned/rejected); retirement package + authority SHA binding verified; plan all checked. |
| apk_standard_pack_suitability_ingestion_20260728 | **YES** | Evidence-only governance; formal acceptance SHA (`1d56d4cd…904c`) verified; licensed ElvGames pack + `LICENSE-ELVGAMES.txt` present; optional Phase-7 documented and non-blocking. |

## Recommended pre-archive action (single bounded fix, no new deletions)

In `apps/reading-advantage/app/[locale]/(student)/student/games/page.tsx`, route the three remaining
`router.push(\`/student/games/${game.id}\`)` sites (lines 293, 334, 426) through the same `cutoverHref`
map already used by the card-body `onClick`, then re-run the agreement suites and the Reading host-proof
client tests. After that fix, H1 clears and all 7 tracks are archive-ready. M1 (routes.md regeneration) and
L1 (fresh `.next` build) are cosmetic and can be handled alongside.

## Commands run

- `git status --short`
- `git log --diff-filter=D --oneline -- <8 paths>` / `git show --stat faa750580` / `git show faa750580 -- <page.tsx> / <routes.md>`
- fs existence checks for all 8 deleted paths; `find` over `(student)/student/games`
- `cat` + `grep -c '^- \[ \]'` over all 7 plan.md; grep over tracks.md
- `python3 -m pytest measure/tests/test_apk_option1_terminal_agreement_20260803.py measure/tests/test_apk_retirement_disposition_packages_20260802.py -q` → **11 passed, 18 subtests passed**
- SHA-256 verification: fact table, formal acceptance, authority approval message, closeout bound inputs
- `grep` sweeps: route slugs in apps/reading-advantage (tsx/ts, excluding test-results), template-literal
  `student/games/${` callers, `student/games/(sentence|vocabulary)` literals, page-module imports across
  apps/packages, middleware redirect/rewrite handling, `.next` artifact inspection
