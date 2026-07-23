# Castle Defense — Evidence Collection Method (T4, evidence-collector)

Collector: `evidence-collector-castle-defense:t4:2026-07-20`
Track: `apk_corpus_audit_action_defense_20260712`
Task: `evidence-collector:castle-defense:t4-batch-a`
Canonical identity: `sentence/castle-defense` (catalog id `castle-defense`)
Baseline revision: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`

## Method

1. Verified the mandatory predecessor hashes for the accepted T2 denominator, accepted T2 partition, and accepted T3 pilot manifest. The accepted partition assigns Castle Defense to `Action and defense`.
2. Read the accepted identity ledger, source denominator, scene-state denominator, asset-file denominator, historical-source denominator, and phase-3 reconciliation. The identity ledger resolves the dispatch label `vocabulary/castle-defense` to the accepted canonical `sentence/castle-defense`; the vocabulary path remains represented by legacy asset-only records.
3. Extracted baseline implementation, route, test, logic, and historical track files with `git show 23bb5ad578c01fb29f9e8bb76a7d934d24a4b286:<path>`. Claims cite baseline blobs, not working-tree blobs. T2 artifact claims cite the accepted T2 archive revision `da51b4e006cdce175171077e97c86089a38dbd5b`; the accepted T3 pilot claim cites `f2509aed08973f6f9aaff80b8c37cb7dfef6f2b1`.
4. Computed each blob SHA-256 from the extracted baseline or accepted artifact bytes. Computed each cited range SHA-256 from the cited lines, with every cited line terminated by `\n`, including a final newline for a non-newline-terminated final line.
5. Anchored positive claims by mechanically resolved unique source substrings. Machine-checked full-file absence claims cover pause/resume, typed-answer controls, audio playback, matchMedia/profile branches, escort state, lives fields, the canonical vocabulary route, and the canonical advantage-games ranking route.
6. Reconciled every Castle Defense record selected from the accepted T2 artifacts. Counts are: one identity record; 83 Castle-associated `source-denominator.json` records (`file` 40, `graph` 36, `copy` 4, `identity` 1, `route` 2); four scene records; 57 asset candidates; two historical-source records; and 264 Castle-associated phase-3 records across the reconciliation sections. All selected phase-3 records were non-blocking and `matched` where a resolution status is present.
7. Covered loading, start/instructions, difficulty, active canvas, sentence HUD, word collection, tower readiness/building, enemy strength and pathing, waves, projectiles, base health, gameover, victory, restart, responsive geometry, touch controls, host divergences, tests, and historical contracts.

## Evidence-class breakdown

| evidence class | claims | basis |
|---|---:|---|
| current-source | 80 | Baseline logic, component, page, catalog, and denominator identity/source records |
| asset | 18 | Baseline asset-loading/rendering citations and accepted asset-denominator records |
| test | 12 | Baseline canonical and reading-advantage Jest/RTL test files |
| route | 15 | Baseline page/API route files and mechanically checked route records |
| history | 11 | Baseline historical track docs plus accepted historical/phase-3 artifacts |
| negative-fixture | 3 | Deliberately rejected unsupported multiplier, generic-template, and keyword-only responsive fixtures |
| **total** | **139** | |

## Confidence tally

| confidence | claims |
|---|---:|
| high | 131 |
| medium | 5 |
| low | 3 |

The medium claims are the absence/host-divergence or test-surface claims where the source proves the observed implementation boundary but does not prove runtime intent. The three low claims are rejected negative fixtures and are not accepted factual claims.

## Hosts and copies

- `apps/advantage-games` is the canonical runnable host for `sentence/castle-defense`. It has the rAF/delta-time loop, accessibility sizing, fullscreen entry/exit, sentence API factory wrappers, ranking-dialog configuration, and the complete sentence asset set.
- `apps/reading-advantage` contains a sentence-route/component/logic copy. Its baseline differences include `useInterval`, normal/extreme difficulty values, score-based XP, no canonical fullscreen call in `startGame`, and no `useAccessibilitySettings` import.
- `apps/reading-advantage/public/games/vocabulary/castle-defense/` contains three legacy vocabulary asset candidates (`background.png`, `castles_3x2_sheet.png`, `skeletons.png`) but no accepted vocabulary page/component/logic/API source route.
- No Primary Advantage Castle Defense source copy was selected from the accepted source denominator.

## Visible unknowns

1. The canonical component configures `/api/v1/games/castle-defense/ranking`, while the accepted advantage-games source denominator has no matching ranking route. The reading-advantage host has a protected ranking route. This is an integration follow-up, not a denominator mismatch in the accepted T2 artifact set.
2. The three legacy reading-advantage vocabulary assets have accepted asset records but no canonical vocabulary implementation source record; their runtime use and provenance remain unresolved.
3. The canonical implementation has measured responsive scaling and compact/wide utility classes but no explicit matchMedia or named compact/wide profile contract.
4. The canonical component's completion callback test is named but only asserts that the active stage renders; it does not force a terminal state.
5. The accepted T2 source inventory excludes the server controller implementation imported by protected reading-advantage routes; this collector did not reinterpret that accepted scope as a denominator amendment and made no claim from the controller blob.

## Negative fixtures

- `CD-NEG-001`: unsupported extreme-difficulty 2x XP multiplier; expected disposition `REJECT`.
- `CD-NEG-002`: generic defense-template substitution that removes the six-wave, multi-enemy, sentence, and map model; expected disposition `REJECT`.
- `CD-NEG-003`: regex/keyword-only responsive proof based on `md:` and height classes; expected disposition `REJECT`.

## Stop-loss observations

- Unsupported accepted factual claims: 0.
- Denominator mismatches: 0. The vocabulary-versus-sentence identity issue is resolved by the accepted partition/identity ledger, and the route/asset-only legacy records are preserved as explicit unknowns rather than reclassified.
- Failed citation resolutions: 0.
- Phase-3 selected records with blocking or unmatched status: 0.
- Stop-loss disposition: `CONTINUE`; the three negative fixtures are deliberate rejects and do not count as accepted unsupported claims.

## Resource declaration

Frozen ceiling: `bytes_read <= 268435456`, `command_invocations <= 120`, `source_files <= 100`.

Measured usage: `bytes_read=11858850` for frozen git evidence blobs, `source_files=51` frozen evidence files, and `files_read=61` including authoritative templates/protocol/dispatch inputs. The command-invocation total is bound in the final report and receipt after commit plumbing; all units are numeric and measured.

No source, denominator, registry, plan, or track-status file was modified. Only the four required live-track outputs and the receipt were authored.
