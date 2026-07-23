# Mapper Hypotheses — T4 Batch A (apk_corpus_audit_action_defense_20260712)

**Role:** requirements-mapper (`requirements-mapper:t4-batch-a:2026-07-20`)
**Status of every entry below:** NON-AUTHORITATIVE HYPOTHESIS — do not cite as fact, requires evidence-collector validation.

These are cross-game similarity hypotheses surfaced during Phase 2 (Batch A) mapping,
plus one orchestrator-mandated controlled-inclusion record (H6). They are NOT findings,
NOT capability conclusions, NOT standardization proposals, and NOT ontology decisions.
Each entry lists only the Batch A ledger claims that prompted the hypothesis. No
hypothesis below may be used as evidence in any downstream artifact until an evidence
collector verifies it against raw source with its own claim ledger entries. The
authoritative blueprint (`batch-a-blueprint.json`) records zero cross-game similarity
findings and cites none of these hypothesis ids.

---

## H1 — 3x3 sprite-sheet pose grids recur across all three Batch A games

- Castle Defense loads player/goblin/orc/troll `*_3x3_pose_sheet.png` sheets
  (CD-ASSET-001) and crops player frames by movement direction (CD-ASSET-010).
- Magic Defense binds `skeletons_3x3_pose_sheet.png` with a 426 px sheet and 142 px
  frame — a 3x3 grid (MD-ASSET-001, MD-ASSET-002) — and a 3x2 castle sheet
  (MD-ASSET-003, MD-ASSET-004).
- Wizard vs Zombie loads player/zombie/orb `*_3x3_pose_sheet.png` sheets
  (WVZ-MECH-008, WVZ-ASSET-001, WVZ-ASSET-002, WVZ-ASSET-004) and animates frames
  0->1->2 every 150 ms (WVZ-MECH-010); the RA StartScreen renders the zombie sheet
  as a CSS-frame sprite with frameWidth/frameHeight=3 (WVZ-MECH-022).
- Hypothesis: a 3x3 pose-sheet convention may recur across Batch A action/defense
  games. UNVERIFIED beyond these three games; the pilot recorded a similar shape for
  two pilot games, which strengthens but does not validate the cross-game pattern.

## H2 — Factory API route pattern appears in all three Batch A games (advantage-games host)

- Castle Defense AG complete route exports POST from createCompleteRoute() and the
  sentences route exports GET from createSentencesRoute(SAMPLE_SENTENCES), both
  force-static (CD-ROUTE-003, CD-ROUTE-004).
- Magic Defense AG complete route is createCompleteRoute() and the vocabulary route is
  createVocabularyRoute(SAMPLE_VOCABULARY), both force-static (MD-ID-010, MD-ID-011,
  MD-ROUTE-003, MD-ROUTE-004).
- Wizard vs Zombie AG complete/vocabulary routes use the same factories (WVZ-ROUTE-003,
  WVZ-ROUTE-004).
- Hypothesis: the advantage-games APK API surface may share a small set of route
  factories with sentence/vocabulary variants. UNVERIFIED at corpus scale; the
  sentence vs vocabulary factory split is not mapped across cohorts.

## H3 — Reading-advantage controller-backed route triple recurs; ranking route is RA-only

- Castle Defense RA exposes complete/ranking/sentences routes behind logRequest+protect
  dispatching CastleDefenseController.* (CD-ROUTE-005, CD-ROUTE-006, CD-ROUTE-007),
  and no AG ranking route exists in the accepted source denominator (CD-ROUTE-012)
  even though the canonical component configures one (CD-ROUTE-011).
- Magic Defense RA exposes complete/ranking/vocabulary routes behind logRequest+protect
  dispatching MagicDefenseController.* (MD-ID-012, MD-ID-013, MD-ID-014); the AG
  RankingDialog fetches the ranking endpoint that exists only in RA (MD-ROUTE-008).
- Wizard vs Zombie RA exposes complete/vocabulary/ranking routes behind
  logRequest+protect dispatching WizardZombieController.*; the ranking route does NOT
  exist in the AG host (WVZ-ROUTE-005, WVZ-ROUTE-006, WVZ-ROUTE-007).
- Hypothesis: "AG factory routes + RA controller routes, with ranking an RA-only
  surface" may be a recurring host split. UNVERIFIED; no claim establishes that the
  three controllers share implementation beyond the route wiring shape.

## H4 — Cross-host byte-identical asset mirroring recurs

- Magic Defense RA public assets are byte-identical copies of the AG cover, background,
  castle sheet, and skeleton sheet (MD-ASSET-008, MD-ASSET-011, MD-ASSET-012,
  MD-ASSET-013, MD-ASSET-014).
- Wizard vs Zombie RA public asset copies are enumerated in the T2
  asset-file-denominator (WVZ-ASSET-008), and the legacy AG
  `public/games/wizard-vs-zombie/*` directory is byte-identical to the current
  `public/games/vocabulary/wizard-vs-zombie/*` directory (WVZ-ASSET-007); the www
  standalone PNG is byte-identical to the denominated AG standalone PNG
  (WVZ-ASSET-009).
- Castle Defense sentence assets are recorded under both hosts in the asset
  denominator (CD-ASSET-015), and BackgroundLayer is reconciled as a non-blocking
  matched copy pair (CD-ASSET-016).
- Hypothesis: cross-host asset mirroring (byte-identical or matched-pair) may be a
  recurring APK asset distribution pattern. UNVERIFIED; byte-identity for the Castle
  Defense pair is asserted by reconciliation records, not by per-file hash claims.

## H5 — Difficulty-tier vocabularies drift across games and hosts

- Castle Defense canonical difficulty is easy/medium/hard with base HP 150/100/80
  (CD-SCENE-010, CD-MECH-010), while the RA host logic accepts easy/normal/hard/extreme
  with extreme base HP 50 (CD-SCENE-015, CD-MECH-035).
- Magic Defense uses easy/normal/hard/extreme in StartScreen and DIFFICULTY_SETTINGS
  (MD-ST-011, MD-MECH-014), but RankingDialog uses 'medium' instead of 'normal'
  (MD-ST-013).
- Wizard vs Zombie AG has a 3-tier Difficulty union easy/medium/hard (WVZ-STT-004),
  while the RA lib retains 4 tiers including 'extreme' (WVZ-STT-005, WVZ-HIST-004).
- Hypothesis: difficulty naming and tier counts are not standardized across Batch A
  games or across hosts of the same game. UNVERIFIED as a general rule; only the
  three per-game drifts above are evidenced.

## H6 — Controlled inclusion: magic-defense-controller.ts (SLO-MD-1 resolution record)

- Per stop-loss-resolutions-batch-a.md (orchestrator, delegated product-owner
  authority), SLO-MD-1 is resolved ACCEPT-AS-CONDITIONAL. This entry is the mandated
  controlled-inclusion record, NOT a mapper finding.
- File: `apps/reading-advantage/server/controllers/magic-defense-controller.ts`
  (sha256 `f356ad6880307f274c85d851caaa185fb69c62d808f29e83084c9d2ab6f30eff`,
  314 lines, exists at baseline per the collector's stop-loss observation).
- Importing routes (all in the accepted denominator): the RA complete, ranking, and
  vocabulary API routes (MD-ID-012, MD-ID-013, MD-ID-014, MD-ROUTE-005, MD-ROUTE-006,
  MD-ROUTE-007).
- Inclusion rule: the controller is out-of-denominator for T2 acceptance purposes but
  in-scope for content citations. The ledger already cites controller line 48 for the
  XP formula (MD-MECH-002) and the negative fixture MD-NEG-001 cites controller lines
  48-60 to re-derive its FAIL disposition. No acceptance claim may depend on the
  controller being inside the accepted T2 denominator.
- Validation needed: an evidence collector (or the truth-test-author's
  `controlled-inclusion-source` fixture) must verify the three import relationships
  empirically before any downstream artifact relies on this inclusion.

## H7 — Two distinct answer-input families appear across Batch A

- Magic Defense uses a typed-answer input matched by lowercased translation equality
  (MD-MECH-008) through a mobile bottom-pinned input bar or an invisible desktop
  keyboard input (MD-RESP-002, MD-RESP-003).
- Castle Defense has no typed-answer control anywhere in the canonical component
  (CD-MECH-038); words are collected by physical contact (CD-MECH-020, CD-HIST-001).
- Wizard vs Zombie resolves answers by physical orb contact — one correct orb plus
  three decoys across quadrants (WVZ-MECH-005, WVZ-MECH-007).
- Hypothesis: Batch A splits into a typed-production family (Magic Defense) and a
  physical-collection family (Castle Defense, Wizard vs Zombie). UNVERIFIED as a
  cohort taxonomy; this is a similarity observation only and makes no ontology claim.

---

*End of hypotheses. Count: 7 NON-AUTHORITATIVE HYPOTHESIS entries.*
