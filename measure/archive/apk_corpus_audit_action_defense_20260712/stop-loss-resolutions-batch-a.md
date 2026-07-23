# Batch-A Stop-Loss Resolutions (Orchestrator, Delegated Product-Owner Authority)

Track: `apk_corpus_audit_action_defense_20260712` (T4 — Action and Defense Evidence Cohort)
Date: 2026-07-20
Decision-maker: orchestrator, exercising delegated product-owner authority under `phase0-role-ownership-manifest.json`
Scope: resolve the two stop-loss observations raised by batch-A evidence collectors before requirements-mapping proceeds

## Provenance

| Artifact | sha256 |
|---|---|
| T2 accepted-denominator-manifest | `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729` |
| T2 accepted-partition-manifest | `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0` |
| T3 accepted-pilot-manifest | `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b` |
| Source baseline revision | `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` |

Both T2 hashes remain **canonical and unchanged**. No amendment to the accepted denominator or partition is authorized by this resolution.

## T3 pilot precedent

The T3 three-game truth pilot (`apk_three_game_truth_pilot_20260712`) was accepted as **conditional** on 2026-07-19 with an identical controller-denominator-gap observation (`SLO-DF-1` — `apps/reading-advantage/server/controllers/dragon-flight-controller.ts`). The pilot disposition is recorded in `measure/archive/apk_three_game_truth_pilot_20260712/product-owner-acceptance.json` as `decision: "approve-conditional"` and in `accepted-pilot-manifest.json` as `decision: "approve-conditional"`. Conditional open items include the asset audit (Phase 4) and the browser audit (Phase 3) — the controller-denominator gap was explicitly left as a known structural observation, not a blocking acceptance criterion. The mapper carried it forward in `mapper-final-report.json` without re-elevating it to a blocking finding. This batch-A resolution follows the same precedent.

## SLO-MD-1 — magic-defense-controller denominator gap

| Field | Value |
|---|---|
| id | `SLO-MD-1` |
| kind | `denominator-gap-candidate` |
| reporting role | evidence-collector (magic-defense, task `evidence-collector:magic-defense:t4-batch-a`) |
| evidence-final-report | `magic-defense-evidence-final-report.json` (`commit_sha_outputs: 6998570b…`, bind `d119bbad`) |
| role-receipt | `role-receipts/evidence-collector-magic-defense.json` |

### Detail (from the final-report)

`apps/reading-advantage/server/controllers/magic-defense-controller.ts` (sha256 `f356ad6880307f274c85d851caaa185fb69c62d808f29e83084c9d2ab6f30eff`, 314 lines) exists at baseline and is imported by three in-denominator API routes (`/api/v1/games/magic-defense/complete`, `/api/v1/games/magic-defense/ranking`, `/api/v1/games/magic-defense/vocabulary`) but has no accepted-denominator record. No ledger claim cites the controller's content; only the importing route lines reference it. The collector flagged this as a denominator-amendment-or-exclusion decision required before mapping.

### Disposition: ACCEPT-AS-CONDITIONAL

### Rationale

1. **T3 pilot precedent is on point.** The same shape of gap (a server controller imported by in-denominator routes but outside the accepted source denominator) was accepted as a conditional open item in the T3 pilot via `DF-SLO-1` and was carried forward by the T3 mapper rather than re-elevated to a blocking finding. The T3 product-owner acceptance recorded the pilot disposition as `conditional` with `decision: "approve-conditional"`. The same disposition is warranted here.
2. **Structural, not factual.** The file exists at baseline with a verified sha256. It is well-defined and citable. There is no factual error in the evidence — only an inventory scope question about whether controllers belong in the source denominator. This is a scope-and-amendment question, not a stop-loss condition.
3. **Cascade cost outweighs value.** Amending the T2 accepted-denominator-manifest (hash `d524171d…`) would invalidate every downstream T4+ binding that depends on it (T3 pilot, every T4/T5/T6/T7 batch, and any T8+ successor). Re-running T2 admission across the full corpus would re-emit Phase 0/1/2/3/4 proofs and require a new product-owner acceptance. The cost is program-disproportionate to the value, which is "acknowledge that this controller exists."
4. **The next role can record a controlled inclusion.** The requirements-mapper is the right role to encode the inclusion rule. Citations to the controller's content are allowed in mapper hypotheses and downstream truth-tests because the file exists at baseline with a verified sha256 — but no acceptance claim depends on the controller being inside the accepted T2 denominator.

### Downstream actions

- **requirements-mapper (T4 batch-A)**: record the controller in `mapper-hypotheses-batch-a.md` as a **controlled inclusion** — name the file, the three importing routes, the sha256, and the explicit rule that the controller is out-of-denominator for T2 acceptance purposes but in-scope for content citations. Do not promote it into a mapper finding; do not invoke `denominator_mismatches` for it.
- **truth-test-author (T4 batch-A)**: write a fixture that verifies the three in-denominator API routes import `magic-defense-controller.ts` (e.g., grep for `magic-defense-controller` in `apps/reading-advantage/app/api/v1/games/magic-defense/{complete,ranking,vocabulary}/route.ts`). The fixture's pass/fail signal is **independent of T2 denominator acceptance** — it verifies an empirical import relationship. Tag the fixture as `controlled-inclusion-source` so the reviewer can audit the inclusion rule.
- **asset-forensics (T8, future)**: out of scope — this is a source-file question, not an asset question.
- **product-owner-acceptance (T4 batch-A)**: when writing `accepted-cohort-manifest-batch-a.json`, record this SLO in the `conditional_open_items` array with the same shape used in `pilot-independent-review.json` and `product-owner-acceptance.json`.

## SLO-WVZ-1 — www wizard-vs-zombie asset denominator gap

| Field | Value |
|---|---|
| id | `SLO-WVZ-1` |
| kind | `denominator-gap-candidate` |
| reporting role | evidence-collector (wizard-vs-zombie, task `evidence-collector:wizard-vs-zombie:t4-batch-a`) |
| evidence-final-report | `wizard-vs-zombie-evidence-final-report.json` (`commit_sha: 20af6417…`, final response `c9111693…`) |
| role-receipt | `role-receipts/evidence-collector-wizard-vs-zombie.json` |

### Detail (from the final-report)

`apps/www-reading-advantage/wizard-vs-zombie.mp3` (sha256 `47dd1e48b91b3f07a9ef3ad760c299c85ffab8dae5521ca0695497396bc35e8c`) and `apps/www-reading-advantage/public/images/wizard-vs-zombie.png` (sha256 `794b0c7937f31e04fab5b16acdf61ad8fb09e468a4a60a63b223432147c7d802`) exist at baseline but are absent from the T2 asset-file-denominator. The www PNG is **byte-identical** to `apps/advantage-games/public/wizard-vs-zombie.png` which IS recorded in the T2 asset-file-denominator at line 5837. Both www files are unreferenced from any wizard-vs-zombie source file. The collector flagged this for orchestrator / asset-auditor decision before mapping.

### Disposition: ACCEPT-EXCLUSION

### Rationale

1. **The www PNG is byte-identical to an already-denominated asset.** The asset underlying the gameplay host (`apps/advantage-games/public/wizard-vs-zombie.png`) IS in the T2 asset-file-denominator at line 5837. The same-hash-group fact (the two PNGs share an identical byte sequence under sha256 `794b0c79…`) means the asset forensics target is already covered by the accepted denominator. No information loss occurs by excluding the marketing mirror.
2. **The www app is outside the cohort's gameplay host scope.** `apps/www-reading-advantage` is the company marketing website, distinct from `apps/advantage-games` (gameplay host) and `apps/reading-advantage` (student host). The T2 cohort protocol defines cohorts by gameplay-relevant apps, not by marketing surface area. The www cohort is not a T4–T7 target.
3. **The www MP3 is genuine dead asset.** It is unique (no byte-identical sibling in the T2 denominator) and unreferenced from any wizard-vs-zombie source file. It is not a denomination gap — it is an unreferenced asset that the asset-forensics track is designed to detect. Recording it as a known unknown is the right disposition; rewriting T2 to absorb it would be overreach.
4. **The byte-identicality is itself an evidence claim.** The collector noted the byte-identicality but did not advance it as a claim. The asset-forensics track (T8) is the right place to publish the same-hash-group finding, because that track owns per-asset forensic records including cross-host duplicates.

### Downstream actions

- **requirements-mapper (T4 batch-A)**: do NOT advance SLO-WVZ-1 as a mapper finding. Do NOT invoke `denominator_mismatches`. The www PNG is excluded by byte-identicality and the www MP3 is excluded by cohort-scope. Both belong in the `visible_unknowns` carry-forward, not in the SLO array.
- **truth-test-author (T4 batch-A)**: do NOT write a fixture against either www file. No truth-test target exists in the gameplay cohort.
- **asset-auditor (T4 batch-A, if scheduled) / asset-forensics (T8, future)**: publish one forensic record per www asset as a **same-hash-group entry** for the PNG (pair with advantage-games `public/wizard-vs-zombie.png`, both sha256 `794b0c79…`) and a **dead-asset entry** for the MP3 (sha256 `47dd1e48…`, unreferenced, host `www-reading-advantage`). The T8 record schema already supports both shapes via the `cross_host_duplicate` and `unreferenced` kinds.
- **product-owner-acceptance (T4 batch-A)**: record this SLO in `conditional_open_items` only as a T8 carry-forward note, not as a cohort-blocking open item.

## T2 denominator / partition hashes remain canonical

This resolution does **not** amend either of:
- `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729` (accepted-denominator-manifest)
- `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0` (accepted-partition-manifest)

Both hashes are bound by every T4+ binding and remain the canonical reference for downstream T5–T11 work. Any successor that wishes to challenge this disposition must open a new orchestrator-tracked denominator-amendment task with a full Phase 0–4 admission rerun.

## Summary table

| SLO | Game | Disposition | T2 amendment? | Carried to |
|---|---|---|---|---|
| `SLO-MD-1` | magic-defense | ACCEPT-AS-CONDITIONAL (controlled inclusion via mapper) | no | mapper, truth-test-author, POA |
| `SLO-WVZ-1` | wizard-vs-zombie | ACCEPT-EXCLUSION (cohort-scope + byte-identical PNG) | no | asset-auditor (T4 batch-A) / T8 asset-forensics |

Both SLOs are resolved. Requirements-mapping (next dispatch) is unblocked. T2 hashes unchanged.