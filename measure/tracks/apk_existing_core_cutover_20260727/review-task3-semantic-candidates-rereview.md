# Independent Re-review: Task 3 Semantic Candidates After Remediation

**Track:** `apk_existing_core_cutover_20260727`
**Scope:** Current per-title semantic-adoption candidate and remediation bytes for Dragon Flight, Magic Defense, Dungeon Liberator, The Sorcerer's Ziggurat, and Astral Mage.
**Review basis:** Worktree at Git head `48baed27dd69e0b9965136c8b44d3ace0b442245`; hashes below bind the uncommitted reviewed bytes.
**Reviewed at:** `2026-07-27T20:03:00Z`
**Method:** Fresh source and test inspection plus independent command execution. The prior review disposition was not adopted as a premise. No candidate mapping, production code, catalog, or loader was changed by this re-review.
**Disposition:** **Re-review pass; progression hold remains.** The remediated candidate evidence satisfies the reviewed Task 3 semantic-candidate checks. Task 3 remains in progress, non-consumable, and blocked on product-owner acceptance and later host/retirement evidence. This report does not claim owner acceptance.

## 1. Recomputed content bindings

| Artifact | Binding | Recomputed value |
|---|---|---|
| `existing-core-cutover-semantic-candidates.ts` | Git blob | `2c5bf1b72571c1ddaa39a25407acff96ac40fcdb` |
| `existing-core-cutover-semantic-candidates.ts` | SHA-256 | `8d33f785fed5487ac81dd7e6501d5b867cd5faa614274726fa8d3d299148a9d3` |
| `existing-core-cutover.semantic-candidates.test.ts` | Git blob | `7233586fa66d2d4155a610129f7ddf3f4545f8fc` |
| `existing-core-cutover.semantic-candidates.test.ts` | SHA-256 | `74cfc6e37a8e4b31ff6139ef663c8a05a9fe76d85dc838edd4809c58a2e78413` |
| `existing-core-cutover.evidence.json` | SHA-256 | `85d1ff9012d9bab6311f48ed1571877e78ce680b640939d87154ab80fc9cdffb` |
| `existing-core-cutover.evidence.types.ts` | SHA-256 | `320c50aced4f39d4d0f22ad327b7a112058486a44ac0cc0a01c9ff955b1e181f` |
| `existing-core-cutover.red.test.ts` | SHA-256 | `fcc07a3a6964a607076bdec8bfbd1fa6f72454647800174330ac7dadb5391910` |
| `semantic-product-bindings.ts` | SHA-256 | `937ea020f5ae2c5ede1b6c5795019d5459619e8bb47ba9add3f251f12f5fe121` |
| `semantic-product-bindings.test.ts` | SHA-256 | `e8c328e17df7522ef349616b3b3d7c2be8c0403ca5049722b0f845a969dca4d8` |
| `catalog.ts` | SHA-256 | `14afe602f10710db17edc3a311177f16f148cac24473d3d975de4284ca19b55b` |
| `index.ts` | SHA-256 | `1f9fdca42f51e5140dc998752ab2c6f6049ef07e1b78b3a90693e5e4fdbf8eda` |
| remediation report | SHA-256 | `9b7df1be5dd9c89c3ea6aa25c6fe01ea4d450b886a472276cd68372ec2154e44` |

The candidate module's blob and SHA-256 exactly match the pre-remediation reviewed candidate source and the remediation record. Candidate mappings therefore remain byte-for-byte unchanged. The test and resolver hashes match the remediation record.

## 2. Accepted release and lineage recomputation

- Planning/readiness receipt: `d371fc5df05922d5f1bbb50b837c0fd5314d8f136e2c699510c84186447f1720`.
- Accepted standard catalog artifact: `ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932`.
- Accepted standard release artifact: `61984e0b53c4ba85379cf6a4f0f33ee956665c4eaad4b3d681e3dccd98389844`.
- T11 owner binding artifact: `393cbadfeaea145c87c0173c497949fca654a83e1c4a13c3e6e79e8faa417867`.
- Release identity remains exact: version `2026.07.23`, catalog digest `ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`, source-receipt digest `93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9`, asset count `43,075`.
- T3/T4/T5/T6/T7/T10 authority digests recomputed respectively as `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b`, `824850257f5eaa2f2bb2d786ddedc5d6cbd03d7b088b00400c0d1d7a11feac80`, `4052c243ca66977256a4b60116439884f3f3151fba463ef860e624ed8d050f5d`, `9666b564ba969ef7d0559fb53d8d74c684a746b10264784a9728e52b6284888b`, `4186dfd20fcef683a1a33664a1ffa9d4350280fbee31fe56d553fa0f5a87b2b0`, and `e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49`; all match their bindings.
- T10 overlay recomputed as `06e692daff932334a5edc2a06d7121651a6bb2426f05f1b00d8d0a5c1ecb6e41`.
- Every per-title accepted-evidence, claim-artifact, and acceptance-chain digest was recomputed from disk and matched the fixture. The lineage test also proved exact title claim sets, locators, claim text, accepted-by links, temporal classifications, and rejection of quarantined ontology paths, stale hashes, unaccepted/unbound candidates, and generic invariants.
- Dragon Flight, Magic Defense, and Dungeon Liberator remain `current-source`; Sorcerer's Ziggurat and Astral Mage remain `historical-source-only`. No temporal promotion or mixed-current claim was observed.

## 3. Independent candidate inspection

The unchanged mappings remain:

| Title | Evidence-backed role/state to semantic key |
|---|---|
| Dragon Flight | `player:idle` → `top-down/32x32/characters/hero-01`; `feedback:correct` → `effects/32x32/combat/hit-01`; `audio-feedback:correct` → `audio/native/combat/hit-01` |
| Magic Defense | `panel:default` → `ui/20x20/inventory/slot`; `status:armor` → `ui/32x32/items/armor-icons`; `feedback:correct` → `effects/32x32/combat/hit-01`; `audio-feedback:correct` → `audio/native/combat/hit-01` |
| Dungeon Liberator | `player:idle` → `top-down/32x32/characters/hero-01`; `enemy:idle` → `side-view/32x32/characters/enemy-001-idle`; `feedback:correct` → `effects/32x32/combat/hit-01`; `control:confirm` → `ui/16x16/controls/gamepad-buttons` |
| Sorcerer's Ziggurat | `player:idle` → `top-down/32x32/characters/hero-01`; `feedback:correct` → `effects/32x32/combat/hit-01`; `control:confirm` → `ui/16x16/controls/gamepad-buttons` |
| Astral Mage | `player:idle` → `top-down/32x32/characters/hero-01`; `feedback:correct` → `effects/32x32/combat/hit-01`; `audio-feedback:correct` → `audio/native/combat/hit-01` |

All seven distinct identities come only from `OWNER_APPROVED_CANONICAL_BINDINGS`. Outputs remain frozen, sorted, deduplicated, and minimal at 3/4/4/3/3 keys per title. Candidate outputs expose only `publicId`, semantic keys, and role/state/evidence-claim/key records; they do not expose registrations, physical paths, source locators, private packs, or the full catalog.

`cartridgeCatalog` remains `[]`, `cartridgeLoaders` remains `{}`, and catalog lookup remains non-resolving. Candidate state remains `classification: "per-title-semantic-adoption-candidate"`, `status: "candidate"`, and `consumable: false`.

## 4. Remediation counterexample review

- **Stale release/catalog identity:** pass. The dedicated invariant 2 constructs a stale catalog digest and matching stale binding and proves `createAcceptedSemanticAssetResolver` rejects before candidate materialization. The accepted resolver independently checks catalog version, catalog digest, source-receipt digest, credit, asset count, all three binding fields, and serialized payload digest.
- **Tampered resolver integrity:** pass. Both the package-level resolver test and candidate test independently reject a resolved key differing from the owner binding, a descriptor path differing from `key + extension` (including a private-pack path), and an empty source-receipt locator.
- **Meaningful duplicate physical source:** pass. Distinct semantic keys sharing a source-receipt identity are rejected during `select()`, before deduplication by semantic key. This adversarial case is non-vacuous and exercises the materialization boundary. The implementation also rejects distinct keys sharing a physical path.
- **No bypass:** pass. Candidate materialization uses `createSemanticAssetResolver`; production boundary checking passed; candidate source imports no direct standard-pack path, private pack, legacy asset tree, provider SDK, or physical filename. Full-pack delivery remains excluded by selected-union shape and size checks.

## 5. Commands and results

| Command/gate | Result |
|---|---|
| `CI=true pnpm exec pytest measure/tests/test_apk_existing_core_cutover_evidence_lineage.py measure/tests/test_apk_existing_core_cutover_readiness.py` | 7/7 passed |
| Focused Advantage Play Kit asset/accepted-input Vitest | 4 files, 29/29 passed |
| Focused Game Cartridges semantic-candidate Vitest | 1 file, 22/22 passed |
| `check:standard-asset-boundaries` | passed |
| `scripts/check-accepted-inputs.mjs` | passed; 3 capability inputs, 0 runtime contracts, 0 approved mappings, 85 blocked mappings, browser success false |
| Advantage Play Kit lint / typecheck / build | passed / passed / passed |
| Advantage Play Kit full tests | 41 files, 238/238 passed |
| Game Cartridges lint / typecheck / build | passed / passed / passed |
| Game Cartridges full tests | expected non-zero Red state: 24 passed, exactly 20 failed in `existing-core-cutover.red.test.ts`; every failure states missing catalog/loader/mechanic implementation rather than invalid evidence |
| `git diff --check` before report creation | passed |

The first combined lint/type/build attempts reached successful lint and typecheck but their build processes exceeded the 120-second command timeout. Both builds were rerun independently with a 300-second timeout and passed.

## 6. Severity findings and disposition

- **Critical:** none.
- **High:** none.
- **Medium:** none.
- **Low:** none.
- **Informational hold:** the 20 deliberate Red failures remain, host and exact-retirement proofs are not present, and product-owner acceptance is absent.

**Final disposition:** The current remediated Task 3 semantic-candidate bytes pass this independent re-review. This is reviewer verification only, not product-owner acceptance or promotion authorization. Keep Task 3 `[~]` in progress; keep candidates non-consumable and catalog/loaders quarantined.
