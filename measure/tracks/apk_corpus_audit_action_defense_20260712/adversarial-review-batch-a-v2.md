# Batch A v2 Adversarial Review — Cycle 2

Track: `apk_corpus_audit_action_defense_20260712`  
Role: `adversarial-reviewer`  
Phase base: `9228c5c5`  
Role base / reviewed HEAD: `68769401267d45fe1164149b85edfbeaf976ac9b`  
Isolation: `parent_ancestry_ids=[]`, `inherited_narrative=false`, `fork_turns=none`

## Executive verdict

The v2 citation **bytes** are substantially repaired: all 17 sampled blob/range envelopes matched Git, all nine ledger fixtures re-derived to their expected outcomes, all three synthetic anti-pattern fixtures were rejected, and the independent v2 test rerun remained `47 passed, 189 subtests passed`.

The batch is nevertheless **not gate-green**. Independent source reading found five claim-to-anchor mismatches that hash-only tests do not detect. The full-strategy blueprint, asset-summary, and receipt-integrity gates also remain open or failing. No new fabricated SHA-256 value or revision drift was found.

## Methodology

1. I treated the ledgers as an index of claim IDs and proposed citations, not as factual authority.
2. I selected 17 non-fixture claims across identity, route, mechanic, component, state, asset, history, test, scene, and responsive categories: nine Magic Defense and eight Wizard vs Zombie.
3. For every selected claim I ran `git show <revision>:<file_path>`, hashed the raw blob with SHA-256, decoded textual blobs as UTF-8, selected the stated one-indexed line range, and hashed both accepted range conventions (with and without a trailing newline). Binary `0..0` anchors were hashed as whole files.
4. I then read the cited source text and independently stated what that exact anchor proves. A verdict is `MATCH` only when both the byte envelope and the atomic proposition match. A true proposition located elsewhere is `NO-MATCH` when the ledger's exact anchor does not establish it.
5. I loaded the v2 truth module's `resolve_claim_citation` and applied it to all nine ledger fixtures, then independently checked the underlying source/tree absence or presence rather than trusting fixture prose.
6. I constructed three additional in-memory fixtures from A4, A7, and A15 and evaluated their required fail-closed outcomes.
7. I independently reran the v2 suite and inspected predecessor objects, blueprint structure, asset-audit availability, and receipt fields/hashes for the seven requested gates.

The rerun command was:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-truth-tests-v2.py
```

Result: `47 passed, 189 subtests passed in 2.54s` (exit 0).

## Claim re-derivations

All hashes below were independently computed from Git objects. `range_sha256` is the digest matching the ledger convention; it is not copied as an assertion of semantic correctness.

| Claim | Category | Independently derived citation | `blob_sha256` | `range_sha256` | Verdict |
|---|---|---|---|---|---|
| `MD-ID-001` | identity | `apps/advantage-games/src/lib/gameCards.ts:46..46` @ `23bb5ad5` | `4dbc3d6eea30313ffad502c5da00026654dd552bce1a44cee70a7e834ff60b2c` | `78bc2e444eb9a67b88881f06088c88ccb783d52ec5c6f8ac51f18753904a2a71` | **MATCH** — line 46 is `id: 'magic-defense'`. |
| `MD-ROUTE-005` | route | `apps/reading-advantage/app/api/v1/games/magic-defense/complete/route.ts:1..22` @ `23bb5ad5` | `f7abf70c61e4352ce42b14d0b91ea98a198631ad812047906619174f81acda76` | `f7abf70c61e4352ce42b14d0b91ea98a198631ad812047906619174f81acda76` | **MATCH** — the whole file wires `logRequest`, `protect`, and `MagicDefenseController.completeGame` to POST. |
| `MD-MECH-002` | mechanic | `apps/reading-advantage/server/controllers/magic-defense-controller.ts:48..48` @ `23bb5ad5` | `f356ad6880307f274c85d851caaa185fb69c62d808f29e83084c9d2ab6f30eff` | `8ff31928cfd886cd46606aab592f896d37253913eb237d30df0a3752d5256b79` | **NO-MATCH (anchor)** — line 48 is `// Create unique target ID...`, not the XP formula. The formula is lines 45..46 (`range d5c28109bc05a0293e74fe9efc4b99be537fb5301151422b5d94f66910b4d76d`). |
| `MD-MECH-006` | mechanic | `apps/advantage-games/src/store/useGameStore.ts:81..92` @ `23bb5ad5` | `32e457e1081da0e597c22366270aade75fbe87a7c905a36ffd75fcb7d2e16dd4` | `dbb01105f77bf9e8e8023c2dfa5225a4037b2760412a706366231bcc7f93d219` | **NO-MATCH (partial anchor)** — the range proves decrement/clamp and computes `allDestroyed`, but ends before the status assignment on line 94. The complete reducer is 85..95 (`range 62aa2eee326d1d7fa4f7d4b272d42dac565ef7c9c6c1370dfc1ec3489fc21ec3`). |
| `MD-MECH-007` | mechanic | `apps/advantage-games/src/components/games/game/GameEngine.tsx:230..247` @ `23bb5ad5` | `18f1dcf23c7718e9401381b8171de84cd31ab252aad18dec879890eddb128a9a` | `c531660841aedf96f8a859d2ea03dbad35cb4c2b160c07f41a2b1441d244cec1` | **MATCH** — random vocabulary indexing, nearest-live-castle targeting, falling state, and spawn insertion are present. |
| `MD-ASSET-016` | asset/render | `apps/advantage-games/src/components/games/game/MagicBolt.tsx:9..20` @ `23bb5ad5` | `8daa8499b9ef9d0c52237687efa698a358333e99c18a7f5bfb45db18d0865385` | `00c43bdda9c2fabac91e79de7a14210e1799deeea8a7f74f947905d578d4516a` | **NO-MATCH (anchor)** — the range proves motion and duration, but the claimed cyan/4x4/rounded/glow classes are on line 21. Lines 14..22 produce `range 3f3a8553c0c760c9348946a93277c7572907883ad3324d2aeaafdac8bd574ee1`. |
| `MD-HIST-002` | history | `apps/advantage-games/public/vocab/magic-defense.json:2..13` @ `097545f1` | `a05dc35f80130771bf0340794717f830793c9a9fa712f846514b08f45f4d556d` | `fc872cf1fa3cc60af64ede85b53ff4a7407a11d0cc4ef20ed60ca9806ee7e9a6` | **MATCH** — exactly 12 Thai-term/English-translation objects are present. |
| `MD-ST-014` | scene-state | `apps/advantage-games/src/components/games/game/GameContainer.tsx:1..89` @ `23bb5ad5` | `adac8e223b90c295f8b8e81e0efd26b9308fffb44e80bf05b1ff39b98905fb97` | `adac8e223b90c295f8b8e81e0efd26b9308fffb44e80bf05b1ff39b98905fb97` | **MATCH** — the whole component contains 560/600 heights, idle/playing/game-over switching, and ranking overlay. |
| `MD-RESP-002` | responsive | `apps/advantage-games/src/components/games/game/InputController.tsx:60..104` @ `23bb5ad5` | `54425a8589565210cfdd01c80627e2f45fc813a80a392c06f383ce9ffb13adad` | `102d28cc18bc270f6b2881525a887d7e05d518dcb8f95a0214e1faa6798279a5` | **NO-MATCH (partial/multi-file anchor)** — this range omits the mobile branch and dark backdrop at 48..51, and bottom pinning is in `GameEngine.tsx:645..650`. Required ranges hash to `454a5060...edd6` and `512ab28f...bca7`, respectively. |
| `WVZ-ID-005` | identity | `apps/advantage-games/src/lib/gameCards.ts:72..73` @ `23bb5ad5` | `4dbc3d6eea30313ffad502c5da00026654dd552bce1a44cee70a7e834ff60b2c` | `600a2065193c08a653e032559d30a834ed2d3a9129e4b460109a58cef38d4e4f` | **MATCH** — the href and `playable` status are exact. |
| `WVZ-ROUTE-007` | route | `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/ranking/route.ts:1..22` @ `23bb5ad5` | `70b2d5e79b40f62cd22a31fe21909e9ed7e5d67d5cfc4c79bacba70633e78423` | `70b2d5e79b40f62cd22a31fe21909e9ed7e5d67d5cfc4c79bacba70633e78423` | **NO-MATCH (compound claim)** — the file proves the reading-advantage route, but cannot prove the second proposition that no advantage-games route exists. A separate tree-absence envelope is required (the absence itself independently checked true). |
| `WVZ-COMP-004` | component | `apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:428..468` @ `23bb5ad5` | `71ff7b6d8b573fe2c3ee4cff37e2a85285e9f28acbaa105b4984b1272c91ceb4` | `bc84e4d2887e0bbe3b3ff7203de0a63ac75a4fa4a8aab55c46c43620bdd31376` | **MATCH** — the start branch, instructions, controls, difficulty choices, and callback are present. |
| `WVZ-STT-003` | state | `apps/advantage-games/src/lib/games/wizardZombie.ts:35..48` @ `23bb5ad5` | `a372b610c8786d9ed9bbe1e77fe5321a19b3c72088537a19632529215aae3043` | `f4ae8d04a11c2e8191cd98ce2d3a172cb9b4e4f00cf5856c0a208f8fba36ecad` | **MATCH** — `status: "playing" | "gameover"` is explicit on line 36. |
| `WVZ-MECH-005` | mechanic | `apps/advantage-games/src/lib/games/wizardZombie.ts:191..282` @ `23bb5ad5` | `a372b610c8786d9ed9bbe1e77fe5321a19b3c72088537a19632529215aae3043` | `570b2539fe00d033a2e92fff531375dd800e09407ec6b945cb6a099fc9046193` | **MATCH** — correct/incorrect orb effects, zombie damage, invulnerability, and game-over are all present. |
| `WVZ-ASSET-003` | asset | `apps/advantage-games/public/games/vocabulary/wizard-vs-zombie/tile-ruins.png:0..0` @ `23bb5ad5` | `46e211ac512f046f29509084157dc3feef834780ae82e647c40b384cbd67f6a8` | `46e211ac512f046f29509084157dc3feef834780ae82e647c40b384cbd67f6a8` | **MATCH** — binary whole-file digest matches; PNG metadata is consistent with the record. |
| `WVZ-TEST-007` | test | `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie/page.test.tsx:40..45` @ `23bb5ad5` | `d5a27eae4e10d230e46a8cc537abfca4669ac4d93c08d9aef9e4969c91aef55c` | `1e76fd59742ef63df27580b4ba1d87179ddfebb43e159f7c28e48861c7fb41f9` | **MATCH** — the test locates “back to home” and requires `href='/'`. |
| `WVZ-HIST-003` | history | `apps/advantage-games/measure/tracks/wizard-vs-zombie-compliance-audit_20260426/report.md:52..60` @ `23bb5ad5` | `f679ace218d28c4bf2781ec43ec842b5fc5a1d2b71842b1c9056a25582f2375e` | `45b98b77364b6a5218d39b040260ecd8ec2e919d20e3760c5ee7c05111c90b82` | **MATCH** — the report records XP, difficulty, shared screens, camera, indicators, and delta-time outcomes. |

Claim totals: **17 re-derived; 12 MATCH; 5 NO-MATCH**. Byte-envelope totals: **17/17 blob matches and 17/17 range matches**.

## Fixture re-derivations

### Ledger fixtures (exhaustive)

| Fixture | Independently derived expected outcome | Verdict |
|---|---|---|
| `MD-NEG-001` | **FAIL** — the real controller computes `Math.floor(correctAnswers * accuracy)` at lines 45..46 and contains no extreme-difficulty multiplier. | **MATCH** |
| `MD-NEG-002` | **REJECT** — no `_shared/defense-template.tsx` object exists; Magic Defense has a game-specific engine/config surface, and the fixture has no citation envelope. | **MATCH** |
| `MD-NEG-003` | **REJECT** — `matchMedia` is absent from the Magic Defense implementation tree; touch capability and Tailwind classes are used instead. | **MATCH** |
| `MD-NEG-004` | **REJECT** — the citation is directory-only and hashless; additionally, the cover lives outside the asserted directory. | **MATCH** |
| `MD-NEG-005` | **REJECT** — the controller contains no Redis/`zadd`/sorted-set identifiers and writes `gameRankings` through the database layer. | **MATCH** |
| `WVZ-NEG-001` | **REJECT** — the completion factory, controller, and page payload expose no XP-multiplier parameter. | **MATCH** |
| `WVZ-NEG-002` | **REJECT** — the generic template is absent and the game owns a bespoke 745-line `WizardZombieGame.tsx`. | **MATCH** |
| `WVZ-NEG-003` | **REJECT** — `matchMedia` is absent from the component and both game-library files; dimensions/Tailwind drive layout. | **MATCH** |
| `WVZ-NEG-004` | **REJECT** — lines 12..27 omit `wizard-vs-zombie`, while lines 68..74 register a direct href with `status: 'playable'`. | **MATCH** |

`resolve_claim_citation` matched every populated fixture citation. As expected, uncited fixtures `MD-NEG-002` and `MD-NEG-005` do not resolve as factual citations and are rejected on that basis. `MD-NEG-004` is rejected by the claim contract even though `git show <rev>:<tree>` can return a directory listing.

### Synthetic anti-pattern fixtures

| Fixture | Anti-pattern and construction | Independently derived expected outcome | Verdict |
|---|---|---|---|
| `SYN-A15-SEQHEX-001` | A15: a receipt binds the v2 truth-test path at its real commit but substitutes sequential hex `1a2b3c...f1a2b` for the real output digest `69c59872...68cba`. | **REJECT** — a 64-hex shape is insufficient; bytes-at-commit do not match. | **MATCH** |
| `SYN-A4-VACUOUS-001` | A4: `{tests_executed: 0, completed_tasks: 0, status: "PASS"}`. | **REJECT** — no performed work can satisfy the gate merely because failure counters are zero. | **MATCH** |
| `SYN-A7-BROAD-FILTER-001` | A7: source line `BANNED: never infer mechanics from catalog prose` is removed by an exclusion filter for the bare word `never`, yielding zero hits. | **REJECT** — the detector swallowed a real banned hit and cannot support a green result. | **MATCH** |

Fixture totals: **12 re-derived; 12 expected outcomes matched; 0 mismatches**.

## Findings

### New finding

1. **AR2-CL-001 — High — five exact-anchor mismatches.** `MD-MECH-002`, `MD-MECH-006`, `MD-ASSET-016`, `MD-RESP-002`, and `WVZ-ROUTE-007` have valid blob/range hashes but their exact anchors do not establish every proposition in `claim_text`. The underlying facts are true at other lines or through an additional tree-absence check, so this is anchor mismatch/atomicity failure rather than a fabricated fact. Per the program's exact claim-evidence contract, it is blocking.
2. **AR2-TT-001 — High — semantic gate coverage gap.** The 47-test suite verifies hashes, range bounds, counts, and selected fixture semantics, but does not compare ordinary claim propositions to their cited source. Consequently all five anchors above pass `resolve_claim_citation` and the suite remains green.

### Independently confirmed pre-existing open gates

3. **AR2-BP-001 — High — blueprint contract incomplete.** `batch-a-blueprint-v2.json` contains zero `backing` keys, zero `backing_claims` keys, zero `D_asset_usage_map` sections, and excludes Castle Defense. It cannot satisfy the full strategy's claim-backed scene/asset blueprint contract. No `H1..H9` fact leakage was found.
4. **AR2-AS-001 — High — required asset summaries absent.** Neither `asset-audit-batch-a.json` nor `role-receipts/asset-auditor-batch-a.json` exists at reviewed HEAD, so the required three per-game records are unavailable.
5. **AR2-RR-001 — High — receipt proof remains insufficient for full-program acceptance.** Existing v2 receipt output hashes mechanically match their commits and all receipts carry `parent_ancestry_ids=[]`, `fork_turns="none"`, and `inherited_narrative=false`. However, the receipts disclose non-raw prompt-hash bases and missing/`unmeasured` frozen ceilings. Program line 47 requires exact prompt-byte proof, and line 88 makes `unmeasured` blocking. This is a receipt-integrity/proof gap, not evidence of inherited narrative.

No new fabricated hash, blob drift, revision drift, claim-ID collision, or literal role-isolation field violation was found.

## Gates verdict

| Gate | Verdict | Reasoning |
|---|---|---|
| **G-DN** | **GREEN** | Direct Git-object checks reproduced T2 denominator `d524171d...`, T2 partition `6badf73b...`, and T3 pilot `cbf04753...`; T1 is `phase4-v8-candidate`, accepted/consumable/not revoked; archive revision `da51b4e0` exists. This closes the v2 test module's predecessor-hash coverage gap for this review. |
| **G-CL** | **RED** | All 178 v2 factual envelopes pass the hash resolver and all 17 sampled hashes matched, but five sampled exact anchors fail the semantic/atomic proposition contract (`AR2-CL-001`). Hash resolution alone is not factual verification. |
| **G-NF** | **GREEN** | All nine ledger fixtures and all three synthetic fixtures independently re-derived to their expected fail-closed outcomes (12/12). |
| **G-BP** | **RED** | The v2 blueprint has no claim-level backing references or required asset-usage-map sections and has never been loaded by the v2 truth suite. |
| **G-SL** | **RED** | The newly found anchor mismatches make unsupported exact citations greater than zero for this review cycle; program stop-loss applies even though the prior 12 v1 hash defects are repaired. |
| **G-AS** | **RED** | The strategy-required three per-game asset-auditor summary records and receipt are absent. Exact asset-file anchors do not substitute for this gate. |
| **G-RR** | **RED** | Mechanical output/commit hashes pass and isolation fields are present, but exact raw-prompt proof and pre-frozen numeric resource ceilings are not established; this reviewer receipt also remains pending orchestrator bind by design. |

## Final disposition

**BLOCK / return to remediation.** Cycle 2 repaired the known fabricated and drifted hash envelopes, but independent semantic review found five remaining exact-anchor failures. Do not publish an accepted cohort manifest until those claims are split/re-anchored, ordinary-claim semantic checks are added, and G-BP/G-AS/G-RR are closed.
