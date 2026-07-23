# Wizard vs Zombie — Evidence Collection Method v2

Collector: `evidence-collector-wizard-vs-zombie-v2:t4-batch-a:2026-07-20`  
Mode: **B — clean rewrite**  
Source baseline: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`  
Phase base: `9228c5c5`  
Role base: `760100fd6d0a7d41c520c6dc60a716c9f7ec0878`

## Why Mode B was required

The cycle-1 truth-test resolver found only 63 of 73 factual v1 claims resolvable. Ten records had fabricated sequential-hex hashes, hashes that matched no contiguous source window, anchor drift, or a citation to the quarantined `apk_cross_game_asset_ontology_20260712` track. Because the defect set included fabricated envelopes and a prohibited source, v2 is a complete replacement JSON array, not an additive overlay. Stable claim IDs are retained for downstream remapping, but every object is emitted by the v2 collector and every envelope is recomputed from source bytes.

## Citation strategy

1. Each claim is resolved at its declared 40-character revision. Current implementation facts use the frozen source baseline `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`.
2. Text citations hash the exact inclusive line range using the truth-test convention: joined source lines with a trailing LF. Whole-file text and binary citations use the blob SHA-256.
3. When a T2 archive artifact did not exist at the source baseline path, its committed working-tree bytes were used only under the resolver's frozen-manifest rule.
4. Ranges were selected around one atomic proposition. The corrected test claim WVZ-TEST-008 now states only what the test asserts; the old test-versus-production conclusion is not smuggled into that citation.
5. WVZ-HIST-003 was replaced. No fact in v2 is sourced from the quarantined cross-game ontology track.
6. After writing the ledger, the exact `resolve_claim_citation` function imported from `batch-a-truth-tests.py` was run against all 77 records. Result: 77/77 citation envelopes resolve, including 73/73 factual claims and 4/4 fixture citations.

## Source anchoring decisions for the ten v1 defects

| Claim | v2 anchor | Decision |
|---|---|---|
| WVZ-COMP-004 | `WizardZombieGame.tsx:428..468` | Hash the complete start-state branch and shared start screen. |
| WVZ-COMP-005 | `WizardZombieGame.tsx:484..504` | Anchor the GameEndScreen properties beginning at `status="defeat"`. |
| WVZ-COMP-006 | `WizardZombieGame.tsx:35` | Hash the actual `calculateIndicators` import, not line 33. |
| WVZ-MECH-008 | `WizardZombieGame.tsx:172..182` | Use the exact asset-path window matched by the source. |
| WVZ-MECH-019 | `page.tsx:22..53` | Hash the complete fetch plus both fallback branches. |
| WVZ-TEST-007 | RA `page.test.tsx:40..45` | Hash the complete back-link test. |
| WVZ-TEST-008 | RA `WizardZombieGame.test.tsx:91..103` | Limit the fact to the two assertions in the test. |
| WVZ-HIST-002 | compliance `report.md:1..16` | Replace placeholder whole-blob values with a tight report summary range. |
| WVZ-HIST-003 | compliance `report.md:52..60` | Replace the quarantined-track claim with a real baseline report citation. |
| WVZ-HIST-004 | RA `StartScreen.tsx:66..87` | Hash all four configuration entries, including `extreme`. |

## Fixture construction

The four `WVZ-NEG-*` objects remain intentionally false adversarial fixtures. Their citation envelopes are real and resolver-valid; their interpretations carry `expected_disposition=REJECT`. They exercise four distinct rejection surfaces: an unsupported XP multiplier, a nonexistent generic defense renderer, a nonexistent `matchMedia` responsive branch, and false withdrawn-id membership. Fixtures are excluded from the 73 factual-claim denominator but included in the 77-object schema and citation checks.

## Verification and boundaries

- v1 ledger, method, final report, and receipt were read-only and remain untouched.
- The source baseline and live git object store were the factual boundary. Catalog prose was not promoted to implementation behavior.
- The v1 receipt mutation by `ca423fbb` is documented separately in `role-receipts/evidence-collector-wizard-vs-zombie-supersede.json`.
- Browser, asset suitability, requirements mapping, and acceptance remain outside this collector role.
