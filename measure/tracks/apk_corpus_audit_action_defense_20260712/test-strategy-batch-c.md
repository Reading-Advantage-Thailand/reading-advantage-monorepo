# T4 Batch C - Evidence Package Test Strategy

Track: `apk_corpus_audit_action_defense_20260712`  
Plan phase: **Phase 3: Batch C evidence packages**  
Strategy role base HEAD: `1448eb4f168d7c6420e3e25347080283f3b840b5`  
Frozen source baseline: `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`

## Scope and immutable inputs

Batch C contains exactly two games, and no other game may be added, removed, or interpreted here:

1. Paladin's Twin-Soul (`paladins-twin-soul`)
2. Gryphon Patrol (`gryphon-patrol`)

This strategy creates no factual claim, source citation, evidence package, browser observation, asset observation, candidate, acceptance, or ontology decision. It is strategy-only before collector source reads. The exact predecessor bindings are:

| Binding | Frozen value |
|---|---|
| T1 gate | `phase4-v8-candidate` / commit `5aea360f` |
| T2 accepted denominator SHA-256 | `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729` |
| T2 accepted partition SHA-256 | `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0` |
| T3 accepted pilot SHA-256 | `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b` |
| Batch A accepted manifest SHA-256 | `b096d911b7d6bc9fb4d530e695cea10d3816a17158447a89303c2d069cf2a54c` |
| Batch B historical revoked manifest SHA-256 | `aaba39f80639eb180440c928b65d29da7601f7bce9ab2ba993e5b8e865c10c62` |
| Batch B superseding accepted manifest SHA-256 | `3026323c6a6aed61f3fbcb03bacf200a1a610cb2da852606b6e9fe61f90f63d7` |
| Owner policy amendment SHA-256 | `dda6a16c3b18a3bfb448228718d85e467e697653e506daf25fedf8c628694a28` |
| Strategy role base HEAD | `1448eb4f168d7c6420e3e25347080283f3b840b5` |
| Source baseline revision | `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` |

Audited immutable Git chronology may substitute only unavailable lifecycle or preflight provenance. It never substitutes source evidence, claim envelopes, truth/source-evidence tests, fresh review, browser observations, or asset observations.

## Role separation and outputs

The root coordinator may bind, commit, and report, but cannot perform a specialist role. All specialist receipts require fresh-context evidence and `fork_turns: "none"`; a literal declaration alone is insufficient without retained raw-export or provider proof.

| Work | Owner | Separation requirement |
|---|---|---|
| Denominator/runnable discovery | discovery auditor | Authors no claims or mappings. |
| Paladin package | distinct Paladin collector | Cannot map, test, browse, audit assets, review, or own candidate. |
| Gryphon package | distinct Gryphon collector | Different agent/session from Paladin collector and all later roles. |
| Per-game mapping | separate mapper per game | Each mapper differs from its game's collector and both mappers differ from each other. |
| Truth contracts | truth-test author | Cannot collect, map, browser-audit, asset-audit, review, or own candidate. |
| Browser audit | browser auditor | Separate from collectors, mappers, truth author, and reviewer. |
| Asset audit | asset auditor | Separate from collectors, mappers, truth author, browser auditor, and reviewer. |
| Fresh adversarial review | adversarial reviewer | `fork_turns="none"`; cannot author or repair reviewed outputs. |
| Candidate manifest | candidate owner | Cannot collect, map, test, audit, or review; publishes only after review is green. |
| Owner acceptance / accepted manifest | delegated product owner | Must follow candidate publication and bind exact candidate/review bytes. |

Collector outputs per game are a claim ledger, evidence method, evidence final report, negative fixtures, and receipt. Mapper outputs per game are blueprint, hypotheses, final report, and receipt. The batch additionally requires discovery/applicability, frozen budget, `batch-c-truth-tests.py`, browser audit, asset-usage audit, fresh review, candidate, acceptance, and accepted manifest.

## Evidence rules

Every factual field and atomic claim requires an all-source envelope: declared revision, relative path, inclusive range or whole-binary scope, blob SHA-256, cited-range SHA-256, source fact separate from interpretation, evidence class, discovery method, collector ID, conflict state, and reviewer disposition. A hash proves byte identity, not semantic support. Tests must re-derive semantics for literals, counts, relationships, state transitions, routes, responsive behavior, asset usage, and history.

Absence is not inferred from a positive citation. It requires a bounded revision/tree/search command, exact domain, captured output and exit status, and output hash. Current claims use the frozen source baseline unless a separately cited reachable revision is necessary. Historical claims require reachable historical objects and ordered chronology; later prose is never historical evidence. Historical or current absence remains a bounded result, not a global conclusion.

Each game needs independently source-checked negative fixtures for: a hash-valid semantic overstatement or compound claim, invalid directory/generated-prose citation, fabricated plausible mechanic/route/asset claim, and keyword/regex/analogy-selected responsive claim. Fixtures must state an exact expected rejection/failure, never count as coverage, and are re-derived 100% by the truth author and reviewer.

No ontology, cross-game standardization, capability synthesis, implementation, asset suitability/licensing, production, or shipping decision is in scope. Mapper hypotheses remain non-authoritative and may not create facts.

## Browser and asset disposition

Discovery first makes a mechanically reviewed runnable disposition for each game. A runnable candidate requires a real browser and real keyboard, pointer, or touch input as applicable, at compact and wide viewports, with observed start/instruction, active, transition, and terminal/result states plus console/network observations. Screenshots, synthetic DOM input, mock-only output, or catalog/test prose cannot replace real browser proof.

If a candidate is non-runnable, it still needs an explicit independently reviewed non-runnable disposition: attempted command, environment, route, revision, exact failure, and logs. It is not a silent skip or `not_applicable`. Asset auditing reconciles every assigned denominator path/usage exactly once with an exact source anchor, named state/surface, variant/conflict/unknown, and live corroboration when runnable. Unknowns remain explicit and block dependent Must-have conclusions.

## Lifecycle and gates

The required order is:

1. Commit these three strategy artifacts.
2. Capture `phase_base_sha` from that strategy publication commit before dispatch or source reads.
3. Publish and test discovery, role applicability, and budget bindings.
4. Complete both independent collector packages.
5. Complete separate mapper packages.
6. Author and run truth tests, including all-source envelopes and negative fixtures.
7. Complete browser and asset audits.
8. Obtain a fresh adversarial review with no unresolved Critical, High, or Medium finding.
9. Candidate owner publishes a non-consumable candidate manifest.
10. Delegated product owner publishes exact-hash acceptance after the candidate.
11. Publish accepted manifest after acceptance; then and only then may later cohort reconciliation consume it.

One unsupported claim, denominator mismatch, source-envelope failure, budget breach, stale/mutated receipt, missing runnable/non-runnable disposition, lifecycle-order defect, or unresolved Critical/High/Medium finding stops the batch. Two failed fix/review cycles require product-owner direction. Changed inputs revoke later bindings and require fresh receipts, tests, and review.

## Commands

All commands run from repository root. `batch-c-truth-tests.py` is a future required artifact; these commands are intentionally Red until its named class and later-stage data exist. Repository guards use marker vocabulary scoped only to this T4 track.

| Stage | Targeted Red command | Green command | Closeout command |
|---|---|---|---|
| C0 freeze | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-truth-tests.py -k BatchCFreezeContract --maxfail=1` | same command without `--maxfail=1` | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-truth-tests.py -k 'BatchCFreezeContract or BatchCReceiptContract'` |
| C1 collection | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-truth-tests.py -k BatchCCollectorPackageContract --maxfail=1` | same command without `--maxfail=1` | cumulative `BatchCFreezeContract or BatchCCollectorPackageContract or BatchCReceiptContract` selector |
| C2 mapping | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-truth-tests.py -k BatchCMapperPackageContract --maxfail=1` | same command without `--maxfail=1` | cumulative C0-C2 selector |
| C3 truth | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-truth-tests.py -k 'BatchCClaimTruthContract or BatchCNegativeFixtureContract' --maxfail=1` | same command without `--maxfail=1` | cumulative C0-C3 selector |
| C4 browser/assets | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-truth-tests.py -k 'BatchCBrowserContract or BatchCAssetContract' --maxfail=1` | same command without `--maxfail=1` | cumulative C0-C4 selector |
| C5 review/lifecycle | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-truth-tests.py -k 'BatchCIndependentReviewContract or BatchCAcceptanceContract' --maxfail=1` | same command without `--maxfail=1` | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-truth-tests.py && bash tests/orchestrator_role_receipt_integrity.sh && bash tests/orchestrator_marker_vocabulary.sh --track apk_corpus_audit_action_defense_20260712 && bash tests/orchestrator_review_execution_truthfulness.sh && bash tests/orchestrator_detector_syntax.sh && bash tests/orchestrator_catalog.sh` |

Every truth-test class declares a named contract and `fails_when`. The implementation must parse labeled integer counts, reject vacuous zero-work success, preserve receipt immutability, distinguish test results from prose, avoid broad filters, and treat detector exit 2 as failure. A full module may be red before its later stage, but only the exact named later-stage reds may be excluded; no broad suppression is valid.

## Phase-base capture

`phase_base_sha` is deliberately absent from these pre-commit strategy artifacts. It will be the strategy publication commit and must be captured immediately after these three files commit:

```bash
git rev-parse HEAD^{commit}
```

That full SHA binds every Batch C dispatch, role base, budget receipt, source output, truth report, review, candidate, acceptance, and accepted manifest. No source read, evidence creation, plan/registry edit, or role dispatch precedes capture.

`MEASURE_AGENT_RESULT`
