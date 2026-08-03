# Independent Review: Task 3 Semantic Candidates

**Track:** `apk_existing_core_cutover_20260727`
**Scope:** Per-title semantic-adoption candidates for Dragon Flight, Magic Defense, Dungeon Liberator, The Sorcerer's Ziggurat, and Astral Mage.
**Source review head:** `48baed27dd69e0b9965136c8b44d3ace0b442245`
**Reviewer:** independent fresh-source review — no producer narrative trusted, no candidate source modified.
**Disposition:** **Conditional Hold.** Task 3 is correctly non-consumable and hash-bound. Producer narrative has minor documentation drift that does not invalidate the candidates, plus one structural gap (missing dedicated fail-closed invariant 2 describe block) that should be recorded but does not block forward motion. Owner approval remains absent and task 3 must remain `[~]` in-progress.

---

## 1. Hash Recomputation

All hashes recomputed from disk; all match the producer-stated values.

### 1.1 Predecessor receipt (Task 1)

| Subject | Producer claim | Recomputed SHA-256 |
|---|---|---|
| `apk_denominator_readiness_t11_integrity_20260727/accepted-readiness-receipt-v1.json` | `d371fc5d…f1720` | `d371fc5df05922d5f1bbb50b837c0fd5314d8f136e2c699510c84186447f1720` ✓ |

### 1.2 T11 accepted release identity

| Field | Producer claim | Recomputed |
|---|---|---|
| `version` | `2026.07.23` | matches `packages/advantage-play-kit/src/assets/accepted-standard-pack-release.ts` (`ACCEPTED_STANDARD_ASSET_RELEASE.version`) ✓ |
| `catalogDigest` | `ac801bae…8087` | matches constant `ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087` ✓ |
| `sourceReceiptDigest` | `93562cc3…eea9` | matches constant `93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9` ✓ |
| `catalogArtifactSha256` | implied `ef432a…9932` | matches on-disk `packages/advantage-play-kit/assets/standard/standard-pack-release.json` = `ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932` ✓ |
| `assetCount` | 43 075 | matches standard-pack catalog (43 075 assets) ✓ |

### 1.3 Authority (T3-T7, T10) accepted artifacts

All six authorities in `existing-core-cutover.evidence.json::authorities` were recomputed and match:

| Phase | Path | Producer SHA-256 | Recomputed |
|---|---|---|---|
| T3 | `measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json` | `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b` | match ✓ |
| T4 | `measure/archive/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-t4-v2.json` | `824850257f5eaa2f2bb2d786ddedc5d6cbd03d7b088b00400c0d1d7a11feac80` | match ✓ |
| T5 | `measure/archive/apk_corpus_audit_traversal_exploration_20260712/t5-accepted-cohort-manifest-v1.json` | `4052c243ca66977256a4b60116439884f3f3151fba463ef860e624ed8d050f5d` | match ✓ |
| T6 | `measure/archive/apk_corpus_audit_puzzle_crafting_20260712/successor-accepted-cohort-manifest-v2.json` | `9666b564ba969ef7d0559fb53d8d74c684a746b10264784a9728e52b6284888b` | match ✓ |
| T7 | `measure/archive/apk_corpus_audit_special_historical_20260712/cohort-accepted-manifest-20260722.json` | `4186dfd20fcef683a1a33664a1ffa9d4350280fbee31fe56d553fa0f5a87b2b0` | match ✓ |
| T10 | `measure/archive/apk_independent_acceptance_handoff_20260712/accepted-successor-manifest-v1.json` | `e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49` | match ✓ |
| T10 overlay | `measure/archive/apk_independent_acceptance_handoff_20260712/t10-claim-disposition-overlay-v1.json` | `06e692daff932334a5edc2a06d7121651a6bb2426f05f1b00d8d0a5c1ecb6e41` | match ✓ |

Every authority artifact carries `consumable: true` and is not revoked; lineage test confirms. No authority path contains `apk_cross_game_asset_ontology_20260712` or `mechanic-blueprints`.

### 1.4 Per-title accepted evidence (5 titles × exact paths) and acceptance chain

| Title | `acceptedEvidence.path/sha256` | Acceptance chain path(s)/sha256 | Recomputed |
|---|---|---|---|
| Dragon Flight | `…/dragon-flight-claim-ledger.json` / `84bd9335c44424142c2d9cb407a2f48d28dd400997741f1904f65cdb6ce6083e` | `pilot-independent-review.json` / `ddd4c4ab9e4ea9e9de824ef78c748729e0ce9b6dbbf17d698ae88f0baf89dcd8`, `dragon-flight-evidence-final-report.json` / `d93e23e20a4bcd00287b4b97f5bcfa13b947afd270f0a68790d1afbd8edfa9ba` | match ✓ |
| Magic Defense | `…/magic-defense-claim-ledger-v2.json` / `10d974bd3e620a4aaacde171a80e5f82945f58fdbd38db57b996805b62b71e45` | `accepted-cohort-manifest-batch-a.json` / `b096d911b7d6bc9fb4d530e695cea10d3816a17158447a89303c2d069cf2a54c`; `candidate-cohort-manifest-batch-a.json` / `8bd3c806a9e35a4caa9d42f3a3e67e374ee957f4285b8220e9756f56046d5ac8` (bound by accepted manifest via `acceptedBy` chain) | match ✓ |
| Dungeon Liberator | `…/claim-evidence-ledger-v3.json` / `f8112af605465ffcf461669e5560037261943df98185bfeb8728a6496997e2a2` (acceptedEvidence) plus `…claim-evidence-ledger-v2.json` / `ff97238f94caa82a5359143c0a25d2a5ee8a2e479bb2fdd0bfea9aab05eef2bd` (claimArtifact). Acceptance chain: batch-a-v6 / `f5a215f44815c79025e86e97a3217d7a85c4a33db86f80db2909f30dd3a9caa3`; candidate-cohort-manifest-batch-a-v6 / `0df0946f3f298b7ece3bea8b13af1bcfeaa9b288161f7ca040f56b1cb49b054d` (bound by accepted-v6); accepted ledger v3 / `f8112af605465ffcf461669e5560037261943df98185bfeb8728a6496997e2a2` | match ✓ |
| Sorcerer's Ziggurat | `…/claim-evidence-ledger-v2.json` / `b99ba08b3db22ffd352ac6ea9fa0ad99d2c30595b7e90e7b389611e7a18e2c4a` (acceptedEvidence) plus `…/claim-evidence-ledger.json` / `54bd65f6f655730125c933c15ba79e992479b905869856c9796b508bcffceeca` (claimArtifact). Acceptance chain: batch-c-v2-retroactive / `f9cef57c46ec6e63f61d7ac0df4e8fd0737252f711c21186f86b846e4c56f0ff`; candidate-cohort-manifest-batch-c-v2 / `b0e857e24f593d811d52970f1cc53f7f0f61ce0516a93de7268bbcd717ef46ec` (bound by retroactive); accepted supersession overlay / `b99ba08b3db22ffd352ac6ea9fa0ad99d2c30595b7e90e7b389611e7a18e2c4a` | match ✓ |
| Astral Mage | `…/batch-b/astral-mage/claim-evidence-ledger-v2.json` / `da7122e80d300c6ff3eab073c2e9151a67c81b707fa470fe64f101a5bbb4eb7e`. Acceptance chain: batch-b-v3 / `5b11e1c44f0b109b740b91a36c694774a48d6c364d8715e95719b9e0574dc271`; candidate-cohort-manifest-batch-b-v3 / `ad0a031ac4d2c16453bcc535eb6bbcaf1a001352ed1137b396bfc56dd8fae755` (bound); independent review v3 / `a88634ca187cf972440dac88ce0370980132c23d5e0a13660d35ba045527f34d` | match ✓ |

The bound-candidate set equals the expected `{accepted-cohort-manifest-t4-v2…, candidate-cohort-manifest-batch-a-v6, candidate-cohort-manifest-batch-c-v2, candidate-cohort-manifest-batch-b-v3}` (validated by `validate_lineage`).

### 1.5 Task 3 module and test hashes

| Subject | Tool | Hash |
|---|---|---|
| `packages/game-cartridges/src/existing-core-cutover-semantic-candidates.ts` | `git hash-object` | `2c5bf1b72571c1ddaa39a25407acff96ac40fcdb` |
| `packages/game-cartridges/src/existing-core-cutover.semantic-candidates.test.ts` | `git hash-object` | `1f2885954b02eced895dc48eda570b482ef3a3a2` |
| `packages/game-cartridges/src/existing-core-cutover.evidence.json` | `sha256sum` | `85d1ff9012d9bab6311f48ed1571877e78ce680b640939d87154ab80fc9cdffb` |
| `packages/game-cartridges/src/existing-core-cutover.evidence.types.ts` | `sha256sum` | `320c50aced4f39d4d0f22ad327b7a112058486a44ac0cc0a01c9ff955b1e181f` |
| `packages/game-cartridges/src/existing-core-cutover.red.test.ts` | `sha256sum` | `fcc07a3a6964a607076bdec8bfbd1fa6f72454647800174330ac7dadb5391910` |
| `packages/game-cartridges/src/catalog.ts` | `sha256sum` | `14afe602f10710db17edc3a311177f16f148cac24473d3d975de4284ca19b55b` |
| `packages/game-cartridges/src/index.ts` | `sha256sum` | `1f9fdca42f51e5140dc998752ab2c6f6049ef07e1b78b3a90693e5e4fdbf8eda` |
| `measure/archive/apk_shared_developer_kit_20260712/t11-owner-approved-canonical-bindings-v1.json` | `sha256sum` | `393cbadfeaea145c87c0173c497949fca654a83e1c4a13c3e6e79e8faa417867` |

The producer's plan narrative referenced hashes for the two new Task 3 files but left them as placeholders; the values above are the exact content-bound git blobs and sha256 digests at HEAD.

---

## 2. Per-Title Role/State-to-Standard-Pack-Key Inspection

The candidates are constructed in `deriveRoleStateRequirements()` (`packages/game-cartridges/src/existing-core-cutover-semantic-candidates.ts`). Every role/state requirement must be in `OWNER_APPROVED_CANONICAL_BINDINGS` (the only forward bindings source) and must carry the `evidenceClaimId` from the accepted per-title evidence fixture.

### 2.1 Forward-binding manifest

`OWNER_APPROVED_CANONICAL_BINDINGS` (constant in `packages/advantage-play-kit/src/assets/semantic-product-bindings.ts`) is parsed at module load from a literal that mirrors `measure/archive/apk_shared_developer_kit_20260712/t11-owner-approved-canonical-bindings-v1.json` (sha256 `393cbadf…7867`). Seven identities are registered:

| Role | State | Semantic key | Usage |
|---|---|---|---|
| `player` | `idle` | `top-down/32x32/characters/hero-01` | image |
| `enemy` | `idle` | `side-view/32x32/characters/enemy-001-idle` | image |
| `feedback` | `correct` | `effects/32x32/combat/hit-01` | image |
| `control` | `confirm` | `ui/16x16/controls/gamepad-buttons` | image |
| `panel` | `default` | `ui/20x20/inventory/slot` | image |
| `status` | `armor` | `ui/32x32/items/armor-icons` | image |
| `audio-feedback` | `correct` | `audio/native/combat/hit-01` | audio |

All seven semantic keys are present in `packages/advantage-play-kit/assets/standard/standard-pack-release.json` (assetCount 43 075). No identity or key is invented; the only class `false` claim (`legacyEvidenceClaim: false`) forbids any T10 blocked historical adoption mapping.

### 2.2 Dragon Flight (T3, vocabulary)

| Source claim | Locator | Temporal scope | Driven role/state | Resolved key (owner binding) |
|---|---|---|---|---|
| `DF-MECH-003` | `$[?claim_id='DF-MECH-003']` | current-source | `player:idle` | `top-down/32x32/characters/hero-01` ✓ |
| `DF-MECH-009` | `$[?claim_id='DF-MECH-009']` | current-source | `player:idle` (duplicate) | deduped |
| `DF-MECH-008` | `$[?claim_id='DF-MECH-008']` | current-source | `feedback:correct`, `audio-feedback:correct` | `effects/32x32/combat/hit-01`, `audio/native/combat/hit-01` ✓ |

All three roles exist in `OWNER_APPROVED_CANONICAL_BINDINGS`. DF-MECH-007 and DF-MECH-010 from the evidence fixture are not currently driving a role/state — that is intentional minimal binding. Claim locator strings resolve to real records in `…/dragon-flight-claim-ledger.json` and the `claim_text` matches verbatim.

### 2.3 Magic Defense (T4, vocabulary)

| Source claim | Locator | Temporal scope | Driven role/state | Resolved key (owner binding) |
|---|---|---|---|---|
| `MD-MECH-005` | `$.claims[?claim_id='MD-MECH-005']` | current-source | `panel:default`, `status:armor` | `ui/20x20/inventory/slot`, `ui/32x32/items/armor-icons` ✓ |
| `MD-MECH-017` | `$.claims[?claim_id='MD-MECH-017']` | current-source | `feedback:correct`, `audio-feedback:correct` | `effects/32x32/combat/hit-01`, `audio/native/combat/hit-01` ✓ |

`MD-MECH-005` → `panel:default` + `status:armor` is an interpretive pairing (castle HP slot plus UI status row); the cast to owner-bound keys is conservative because both target identity-approved keys. MD-MECH-003/008/018/022 are present in the ledger but not currently driving role/state.

### 2.4 Dungeon Liberator (T5, sentence)

| Source claim | Locator | Temporal scope | Driven role/state | Resolved key (owner binding) |
|---|---|---|---|---|
| `DL-COLL-001` | `$.claims[?claim_id='DL-COLL-001']` | current-source | `player:idle`, `feedback:correct` | `top-down/32x32/characters/hero-01`, `effects/32x32/combat/hit-01` ✓ |
| `DL-COLL-002` | `$.claims[?claim_id='DL-COLL-002']` | current-source | `enemy:idle` | `side-view/32x32/characters/enemy-001-idle` ✓ |
| `DL-TRANS-001` | `$.claims[?claim_id='DL-TRANS-001']` | current-source | `control:confirm` | `ui/16x16/controls/gamepad-buttons` ✓ |

All four roles are owner-bound; DL-TRANS-002 is evidence-present but not currently driving a role/state.

### 2.5 Sorcerer's Ziggurat (T5, sentence, historical-source-only)

| Source claim | Locator | Temporal scope | Driven role/state | Resolved key (owner binding) |
|---|---|---|---|---|
| `SZ-HIST-006` | `$.claims[?claim_id='SZ-HIST-006']` | historical-source-only | `player:idle`, `feedback:correct` | `top-down/32x32/characters/hero-01`, `effects/32x32/combat/hit-01` ✓ |
| `SZ-HIST-009` | `$.claims[?claim_id='SZ-HIST-009']` | historical-source-only | `control:confirm` | `ui/16x16/controls/gamepad-buttons` ✓ |

All three roles are owner-bound. The candidate's `evidenceTemporalScope` correctly reports `historical-source-only` (per `fixture.mechanicFacts.some(...)`). SZ-HIST-005/007 are present in the ledger but not currently driving role/state — note that SZ-HIST-007 references historical "freeze after final sentence" behavior, which is a transition/completion signal rather than a discrete role/state animation; absence is consistent with the semantic key set.

### 2.6 Astral Mage (T6, sentence, historical-source-only)

| Source claim | Locator | Temporal scope | Driven role/state | Resolved key (owner binding) |
|---|---|---|---|---|
| `AM-HIST-004` | `$.claims[?claim_id='AM-HIST-004']` | historical-source-only | `player:idle` | `top-down/32x32/characters/hero-01` ✓ |
| `AM-HIST-005` | `$.claims[?claim_id='AM-HIST-005']` | historical-source-only | `feedback:correct`, `audio-feedback:correct` | `effects/32x32/combat/hit-01`, `audio/native/combat/hit-01` ✓ |

All three roles are owner-bound. `evidenceTemporalScope` correctly reports `historical-source-only`. The Astral Mage ledger's claims also carry `source_class` values such as `historical_implementation_dependency` and `historical_implementation`; both contain "historical", satisfying the lineage test's `temporalScope == "historical-source-only" ⇒ "historical" in source_class` invariant. AM-HIST-006 is present in the ledger but not currently driving a role/state.

### 2.7 Selected-union composition

Across the five titles, exactly 7 distinct role/state identities are requested. Each maps to exactly one owner-bound semantic key. There is no invented or legacy binding; no entry bypasses `OWNER_APPROVED_CANONICAL_BINDINGS`.

No role/state pair duplicates a T10 blocked claim_ref (the T10 overlay blocked list contains references to MD-ASSET/HIST/NEG and AM-UNK only — never any role/state identity referenced here).

### 2.8 Determ. minimal, deduplicated

`EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES` is a frozen array; each candidate is frozen. `roleStateRequirements` is run through `deduplicateRoleStateRequirements` (preserves first evidence claim per role/state). The selected union output is:

- `semanticKeys`: sorted via T11 `resolver.select()` (which returns sorted, unique keys)
- `resolved`: 1-to-1 mapped `[{role, state, evidenceClaimId, semanticKey}]`, sorted by `role:state` via `localeCompare`
- No raw path / no `sourceReceiptLocator` / no `physicalPaths` on the union (enforced by both the union shape and the test that calls `expect(resolved).not.toHaveProperty("path")`)

Each title's `union.semanticKeys.length` is ≤ 4 (Dragon Flight = 3, Magic Defense = 4, Dungeon Liberator = 4, Sorcerer's Ziggurat = 3, Astral Mage = 3), well below both the 43 075-asset pack and the test's `≤ 5` ceiling.

### 2.9 Public catalog / loaders quarantine

- `cartridgeCatalog === []` (frozen `readonly never[]`)
- `cartridgeLoaders === {}`
- `getCartridgeCatalogEntry(...) === undefined` for every candidate publicId
- The candidates are not listed by any dynamic loader
- The candidate module is reachable only via direct import (`./existing-core-cutover-semantic-candidates.js`) or the package public index, which re-exports only the metadata (no physical surface)

The catalog quarantine is intact and the candidates are non-consumable by construction.

### 2.10 No direct paths/private packs/full-pack delivery

- `materializeCandidateSelectedUnion` returns `ExistingCoreCandidateSelectedUnion` whose schema has only `publicId`, `semanticKeys`, and `resolved` — no path-shaped fields. The tampered-resolver test in invariant 3 confirms that even if `resolver.resolve` returns a `private-pack/...` path the union output never surfaces it.
- The duplicate-physical-files invariant guards `union.semanticKeys` and `union.resolved` to be deduplicated against the synthetic `duplicated` resolver.
- Full-pack delivery is structurally impossible because the manifest's `bindings.length === 7` and the candidate derivation never requests all 7 simultaneously for one title.

### 2.11 Provider / vendor SDK bypass

The candidate module imports only `OWNER_APPROVED_CANONICAL_BINDINGS`, `createSemanticAssetResolver`, `validateSemanticProductBindings`, and the type surface from `@reading-advantage/advantage-play-kit/assets` — no provider SDK paths and no private pack tree imports. All materialization flows through `createSemanticAssetResolver` (which calls `createAcceptedStandardAssetResolver` upstream) and gates on `ACCEPTED_STANDARD_ASSET_RELEASE` identity.

### 2.12 Historical-only scope labels

`SZ-HIST-*` and `AM-HIST-*` claims all carry `temporalScope: "historical-source-only"` in the fixture. Their candidate's `evidenceTemporalScope` resolves to `"historical-source-only"` (no current-source fact is mixed in for those two titles). `CANDIDATE_CLASSIFICATION` is fixed at `per-title-semantic-adoption-candidate` and `status` at `candidate` — never `accepted`, `proved`, or `consumable`.

---

## 3. Test Inspection (Counterexample Strength)

Test runs in this environment:

| Suite | Pass | Fail | Notes |
|---|---|---|---|
| `packages/game-cartridges/vitest run` (whole package) | 23 | 20 | 1 catalog quarantine + 1 lineage-pin in red + 21 in semantic-candidates; 20 fails are intentional Red (missing catalog/loaders implementation) |
| `pytest measure/tests/test_apk_existing_core_cutover_evidence_lineage.py` | 6 | 0 | exact accepted chain + 5 mutation tests |
| `pytest measure/tests/test_apk_existing_core_cutover_readiness.py` | 1 | 0 | receipt bytes + 27/29 five-title authorization |
| `pnpm check-types` (game-cartridges) | — | 0 errors | green |
| `pnpm lint` (game-cartridges) | — | 0 errors | clean |
| `pnpm build` (game-cartridges) | — | 0 errors | success |
| `pnpm vitest run src/assets` (advantage-play-kit) | 20 | 0 | green |
| `pnpm check-types` (advantage-play-kit) | — | 0 errors | green |
| `pnpm lint` (advantage-play-kit) | — | 0 errors | clean |

Counterexample quality for the seven labeled invariant groups:

- **Invariant 1 (missing roles/states)** — strong. Pattern + identity set, rejects tampered `imagined:ghost` injected into the candidate, exposes the unmapped error class.
- **Invariant 3 (direct paths / private packs)** — strong. The first test walks `unions[]` and asserts `assertNoForbiddenPattern` over every `semanticKey` and `resolved.semanticKey`. The second test only checks `union.semanticKeys.toContain(expectedKey)`, so its counterexample value is weaker — but it is additional coverage for the candidate-keeps-binding-via-owner-manifest property.
- **Invariant 4 (duplicate physical files)** — adequate (test executes the structurally-broken-case via the `duplicated` resolver), but the assertion `Set.size <= resolved.length` is weakly bounded; uniqueness of `resolved` follows from the binding manifest, not from the adversarial surface. The bound is intentionally low-strength because the union shape never carries paths.
- **Invariant 5 (full-pack delivery)** — strong. Asserts `union.semanticKeys.length` is `> 0` and `< assetCount (43 075)` and `<= 5` per union.
- **Invariant 6 (unsupported mappings)** — strong. Verifies every semantic key is in `OWNER_APPROVED_CANONICAL_BINDINGS`, plus a tampering test that invents `imagined:ghost` and expects `UnmappedCandidateRoleStateError` from `materializeCandidateSelectedUnion`.
- **Invariant 7 (premature consumability)** — strong. `cartridgeCatalog`/`cartridgeLoaders` are required empty; no candidate publicId appears in either; tampered `consumable`, `status`, and `classification` are each rejected by `assertCandidateNotConsumable`.
- **Determinism / sort / evidence anchoring / owner binding pinning** — strong. `JSON.stringify(first) === JSON.stringify(second)` re-invocation test plus sorted-by-identity and `toSemanticAssetRequirements` ordering tests.

The 20 Red `existing-core-cutover.red.test.ts` failures are exactly the intended "missing implementation" state (no `cartridgeCatalog` entry, no `cartridgeLoaders[publicId]`, no deterministic mechanic factory). Failures emit `Missing implementation, not invalid accepted evidence: …` which preserves the misleading-emit ordering recorded in the readiness receipt.

---

## 4. Findings

### 4.1 Medium — Only six of seven labeled "fail-closed invariant groups" exist as `describe` blocks

- **Where**:
  - `packages/game-cartridges/src/existing-core-cutover.semantic-candidates.test.ts` header line 12 enumerates "seven fail-closed invariants"; the `describe` blocks present are 1, 3, 4, 5, 6, 7 — there is **no** `describe("fail-closed invariant 2: stale catalog/release hashes", …)` block.
  - `measure/tracks/apk_existing_core_cutover_20260727/plan.md` line 5 (Task 3 narrative) and `metadata.json::deviation_notes` both claim "seven fail-closed invariant groups".
  - The top-level test `receives release identity only through the accepted T11 asset API` (line 132) covers the version string and forbids `"assets/standard"` from candidate JSON, but it is not a dedicated counterexample for stale-release ingest of a resolver that accepts anything other than `2026.07.23`.
- **Why it matters**: The invariant 2 dimension is part of the producer's named guarantee set but does not have its own counterexample inside a stable describe block. The lineage test would catch stale or superseded evidence-ledger bytes but would not catch a candidate module drift that no longer pins the catalog/release digests at the right runtime resolution.
- **Suggestion**: keep the test name "stale catalog/release hashes" and add a `describe("fail-closed invariant 2: stale catalog/release hashes", () => { it("rejects a tampered catalog with stale digest", ...) })` block that drives `createAcceptedStandardAssetResolver` against a hand-built catalog whose `digest` is mutated. The candidate module cannot police this directly because the binding is upstream of the resolver; this is exactly why the invariant should be tested at the resolver boundary. **Do not modify the candidate source from the review pass.**

### 4.2 Low — Test count claim in plan is off by three

- **Where**:
  - `plan.md` line 5 states "24/24 new tests pass".
  - `metadata.json::deviation_notes` repeats the same.
- **Why it matters**: actual count for `existing-core-cutover.semantic-candidates.test.ts` is **21** `it(`/`it.each(` blocks (counted by `grep -E '(^ +it\(|\.it\.each)' src/existing-core-cutover.semantic-candidates.test.ts`). All 21 pass. The plan appears to have over-counted by 3 (possibly double-counted invariant 7 subtests, or duplicated a count from a draft). No Green implementation is falsely claimed; the count is a documentation inaccuracy.
- **Suggestion**: rewrite the count to "21/21 new tests pass" on the next non-blocking plan revision (the current pass state is unaffected).

### 4.3 Low — Tampered-resolver test in invariant 3 is weakly bounded

- **Where**: `existing-core-cutover.semantic-candidates.test.ts` line 227, "rejects a tampered resolver that returns a direct path for an owner key".
- **Why it matters**: assertion is `union.semanticKeys).toContain(expectedKey)`. The test does not check that the tampered path leaks or doesn't leak. Coverage is provided by the preceding "no candidate output ever contains a direct path" test (line 208), which exhaustively scans every union property, so the structural property holds regardless of this second test. The second test primarily re-asserts "candidate binds via the manifest", which is already covered by invariant 1. The test as written does not exercise the resolver's path-leaking behaviour.
- **Suggestion**: rename to "candidate still binds through the owner manifest when a resolver returns a non-canonical path", or strengthen it to assert `union.resolved.every(r => r.semanticKey === expectedKey)` and that no `private-pack` substring appears in the resolved data — but **do not modify the candidate source from the review pass**.

### 4.4 Low — Duplicated-path test in invariant 4 is structurally vacuous

- **Where**: `existing-core-cutover.semantic-candidates.test.ts` line 275, "forces the synthetic resolver to return a duplicated path and rejects the duplicate".
- **Why it matters**: the assertion `Set.size <= resolved.length` holds trivially. The actual dedup property (one physical path per semantic key) cannot fail in the union shape because the union never contains paths. The invariant 4 contract is met structurally, but the test does not exercise an adversarial dedup surface.
- **Suggestion**: replace with a property-based check that hashes the synthetic `duplicated` resolver's outputs and counts unique physical paths; or document that the test asserts "dedup by semantic key" and the value lives in the bounded `Set` size check from line 266. **Do not modify the candidate source from the review pass.**

### 4.5 Informational — No new leaves in the public catalog or loaders

Confirms the producer's quarantine claim: `cartridgeCatalog === []`, `cartridgeLoaders === {}`, no candidate publicId resolvable through `getCartridgeCatalogEntry`. Catalogs are not stealth-exposed via the candidate module. The candidates are reachable only through the public `index.ts` of `@reading-advantage/game-cartridges` (re-exports metadata; no Phaser runtime is exposed).

### 4.6 Informational — Owner-approval absent

The track's `metadata.json` reports `status: "in_progress"`; `plan.md` task 3 checkbox is `[~]` (in progress); there is no `product-owner-acceptance-*.json` for `apk_existing_core_cutover_20260727`. Historical T10/T11 disclosures remain binding (`approved_asset_mappings=0`, `legacy_asset_adoption_approved=false`, etc.), so no Green production claim is made.

---

## 5. Summary

| Verification | Pass | Source of truth |
|---|---|---|
| Predecessor receipt SHA-256 | ✓ | recomputed on disk |
| T11 release identity (version + 2 digests) | ✓ | matches `ACCEPTED_STANDARD_ASSET_RELEASE` |
| Authority hashes (T3/T4/T5/T6/T7/T10) | ✓ | recomputed; `consumable: true`, not revoked |
| Per-title accepted evidence (5 titles) | ✓ | recomputed |
| Acceptance chain (bound-candidate + accepted) | ✓ | recomputed; bound-candidate set equals expected |
| Per-title role/state-to-key (7 unique pairs across 5 titles) | ✓ | every role/state in `OWNER_APPROVED_CANONICAL_BINDINGS` |
| Quarantine (`cartridgeCatalog`/`Loaders` empty, candidates not added) | ✓ | structural guarantee + test suite |
| Selected unions deterministic/minimal/dedup | ✓ | structural + test |
| No direct paths / private packs / full-pack delivery | ✓ | union shape + invariants |
| No provider / SDK bypass | ✓ | only `advantage-play-kit/assets` imports |
| Historical-only facts remain labelled | ✓ | `evidenceTemporalScope` and per-claim temporalScope retained |
| Candidates non-consumable / absent from public catalog and loaders | ✓ | `consumable: false`, `status: candidate`, `classification: per-title-semantic-adoption-candidate` |
| Evidence-lineage counterexample strength | ✓ strong | 5 mutation tests reject stale/unsupported lineage |
| Counterexample for 7th invariant 2 | ✗ dedicated block missing — see Finding 4.1 |
| Counterexample for invariant 3 tampered-resolver | weak — see Finding 4.3 |
| Counterexample for invariant 4 duplicated-path | weak/vacuous — see Finding 4.4 |
| 20 Red tests fail as intentional | ✓ | assertions are "Missing implementation, not invalid accepted evidence: …" |

**Disposition:** Conditional Hold. The candidates are correctly non-consumable, hash-bound, and isolated from the public catalog/loaders. Three documentation/structural findings (one Medium, two Low) should be queued for the next non-blocking revision, but they do not change the verdict that **task 3 is incomplete, in-progress, and owner-approval absent**. No fix is applied by this review pass.

---

## 6. Recorded Hashes (for the next independent reviewer)

- `existing-core-cutover-semantic-candidates.ts` (git blob) = `2c5bf1b72571c1ddaa39a25407acff96ac40fcdb`
- `existing-core-cutover.semantic-candidates.test.ts` (git blob) = `1f2885954b02eced895dc48eda570b482ef3a3a2`
- `existing-core-cutover.evidence.json` (sha256) = `85d1ff9012d9bab6311f48ed1571877e78ce680b640939d87154ab80fc9cdffb`
- `existing-core-cutover.evidence.types.ts` (sha256) = `320c50aced4f39d4d0f22ad327b7a112058486a44ac0cc0a01c9ff955b1e181f`
- `existing-core-cutover.red.test.ts` (sha256) = `fcc07a3a6964a607076bdec8bfbd1fa6f72454647800174330ac7dadb5391910`
- `existing-core-cutover-semantic-candidates.ts` content sha256 = `8d33f785fed5487ac81dd7e6501d5b867cd5faa614274726fa8d3d299148a9d3` (matches `git cat-file -p` for the blob above)
- `existing-core-cutover.semantic-candidates.test.ts` content sha256 = `39a1bf6f61e82bcfa2e43f3fbf4f2dc6b9eb6b5b17ad31db750128c26781d832`

These values may be republished verbatim by any subsequent reviewer and stay bound to the HEAD bytes at the time of this review.

— end of report —
