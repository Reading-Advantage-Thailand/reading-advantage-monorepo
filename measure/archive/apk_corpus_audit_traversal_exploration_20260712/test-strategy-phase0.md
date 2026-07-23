# Phase 0 Test Strategy — Freeze Cohort and Roles

Track: `apk_corpus_audit_traversal_exploration_20260712`  
Phase: **Phase 0: Freeze cohort and roles**  
Strategy scope: this file only. It does not author source claims, game packages, plans, registries, candidate manifests, or accepted manifests.

## 1. Source-neutral scope

`plan.md` is authoritative for this phase. The frozen cohort is exactly these batches, in this order:

1. **Batch A:** Dragon Rider, Dungeon Liberator, Spellweaver's Run
2. **Batch B:** Shadow Gate Dungeon, Labyrinth of the Goblin King, Griffin Rider's Escape
3. **Historical/missing batch:** The Sorcerer's Ziggurat

No other identity may be added, removed, renamed, split, or moved by a role. The names above are cohort identifiers only; they do not assert a source path, route, implementation, runnable status, mechanic, asset, or historical fact. A denominator mismatch stops interpretation rather than being repaired in a package.

The following are immutable process inputs and must be verified by bytes before source work:

| Input | Required value |
|---|---|
| Supplied baseline and role-base SHA | `a49ebcc4dc3b3792a96b5b114d729b0b542af0fe` |
| Accepted T2 denominator | `measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json` |
| Accepted T2 partition | `measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json` |
| Accepted T3 pilot | `measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json` |
| Prior accepted cohort process example | `measure/tracks/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-batch-a.json` |

The accepted denominator and partition assign all seven names to **Traversal and exploration**. Their recorded SHA-256 values, predecessor acceptance state, and revocation state must be recomputed from the files at dispatch; this strategy does not invent replacement hashes. The accepted pilot is a process predecessor, not factual evidence about any game in this cohort. No predecessor claim, disclosure, mapper conclusion, browser result, or generated prose may be used as evidence for these seven packages.

This phase makes no assertion about game-source behavior. Discovery may identify reachable source objects and candidate runnable routes, but only later isolated collectors may turn exact source evidence into claims. Graph output, catalog prose, tests, screenshots, directory listings, and generated reports are discovery aids or process evidence, never primary factual evidence.

## 2. Required isolated roles

Before dispatch, publish a machine-readable applicability and task-ownership manifest. Every task records `owner_role`, `reviewer_role`, `forbidden_roles`, allowed-input manifest hash, expected output paths, and role/phase bases.

The following roles are mandatory and incompatible for the same artifact:

1. **Discovery auditor** — verifies denominator membership, exact cohort partition, source/object candidates, and runnable-candidate inventory; authors no factual game claims, mapping, browser verdict, truth test, or review.
2. **Evidence collectors** — one fresh isolated collector per game, seven distinct collector sessions/IDs; collect exact source envelopes and claim-ledger evidence only for the assigned game.
3. **Requirements mappers** — one fresh isolated mapper per game, seven distinct mapper sessions/IDs; map accepted claims to traversal requirements without collecting evidence or adding facts.
4. **Browser auditors** — one isolated browser role per game or an explicitly separate session per game; determine runnable/non-runnable disposition and record observed transitions, inputs, viewport, console, and network evidence. Browser work may not repair collector or mapper outputs.
5. **Truth-test author** — fresh isolated role; authors falsifiable tests and negative fixtures without collecting, mapping, browser auditing, reviewing, or accepting.
6. **Adversarial reviewer** — fresh `fork_turns="none"` role; reviews every game and every batch-relevant artifact, and does not author or repair the artifact it reviews.

The root agent may coordinate, preserve unrelated work, commit this strategy, and bind receipts. It may not substitute for any required role. No role may review its own output. A browser or history specialist supplements the required roles and cannot replace them.

Each role receipt is append-only and must contain the actual spawn/ancestry evidence, exact prompt hash, allowed-input and actual-context manifest hashes, prior-role history, event IDs/timestamps, final-response hash, output paths and current hashes, findings, frozen budget hash, commit SHA, phase base, and role base. Provider `fork_turns="none"` attestation or a raw export beginning with exactly the fresh prompt is required; prose fields alone do not establish isolation. Any reviewed fix creates a superseding receipt rather than rewriting the original.

## 3. Frozen numeric budgets

These ceilings are frozen before any source read. They are integer fields with explicit units; `actual` must be recorded in the same units and must not exceed `ceiling`. Missing, changed, or `unmeasured` values block Phase 0 and revoke affected candidate outputs. The budget declaration hash is bound into every affected receipt.

### 3.1 Batch-level ceilings

| Role/work unit | Source bytes | Source files/objects | Commands | Elapsed minutes | Records authored/reviewed | Browser interactions | Captured artifacts |
|---|---:|---:|---:|---:|---:|---:|---:|
| Discovery auditor, all seven | 12,000,000 | 240 | 80 | 90 | 7 inventories | 0 | 35 |
| Truth-test author, all seven | 6,000,000 | 140 | 60 | 75 | 70 tests/fixtures | 0 | 25 |
| Adversarial reviewer, all seven | 10,000,000 | 210 | 100 | 120 | 7 packages + 70 tests | 0 | 70 |
| Phase-0 coordinator | 2,000,000 | 40 | 40 | 45 | 7 ownership rows + 6 role declarations | 0 | 20 |

### 3.2 Per-game ceilings

Each of the seven collector, mapper, and browser rows receives the same declaration below; seven rows must exist and be separately receipted.

| Role | Source bytes | Source files/objects | Commands | Elapsed minutes | Records authored/reviewed | Browser interactions | Captured artifacts |
|---|---:|---:|---:|---:|---:|---:|---:|
| Evidence collector, one game | 8,000,000 | 160 | 70 | 120 | 300 claims/records | 0 | 80 |
| Requirements mapper, one game | 4,000,000 | 100 | 50 | 75 | 250 mappings/unknowns | 0 | 35 |
| Browser auditor, one game | 3,000,000 | 80 | 80 | 90 | 80 observations | 300 | 60 |

The budgets are ceilings, not targets. A role that cannot measure usage in these units is not eligible for dispatch. A later source-dependent phase may publish a separately approved budget declaration; it may not silently reuse or enlarge this one.

## 4. B0 freeze gates

Phase 0 is Green only when every gate below passes with positive, nonzero task and role counts:

- **B0.1 Scope:** the normalized cohort contains exactly the three listed batches and seven unique canonical identities; no duplicate, omission, or fourth game.
- **B0.2 Denominator:** accepted denominator and partition are consumable, unrevoked, reachable, and byte-verified; all seven identities resolve to the traversal cohort exactly once.
- **B0.3 Predecessors:** accepted pilot and predecessor manifests are process inputs only, with their actual recorded acceptance/review bindings verified. No fictional or placeholder hash is accepted.
- **B0.4 Ownership:** every task has one owner, one reviewer, forbidden-role list, expected outputs, and allowed-input manifest. Every required role has at least one assigned task.
- **B0.5 Isolation:** collectors, mappers, browser auditors, truth author, and adversarial reviewer have distinct fresh sessions and no incompatible role history. The adversarial reviewer has `fork_turns="none"` proof.
- **B0.6 Budgets:** every role and batch declaration contains all labeled integer ceilings in §3, is frozen before source work, and is bound to the receipt.
- **B0.7 Stop-loss:** initial counters are labeled integers: unsupported claims `0`, denominator mismatches `0`, unresolved Critical `0`, High `0`, Medium `0`, stale receipts `0`, budget breaches `0`, and failed fix/review cycles `0`.
- **B0.8 Boundary:** no package, source-derived claim, browser run, truth-test output, candidate manifest, or accepted manifest is created during Phase 0.

The B0 truth test must fail when a prose occurrence changes a structured state, a date satisfies a count, zero work passes, `[ ]` is accepted, a missing guard is treated as present, a detector exits 2 but is reported clean, a role collision is hidden, or a receipt hash is stale.

## 5. Browser evidence boundary

Kimi WebBridge is the preferred browser mechanism. It may provide live route startup, real observed state transitions, compact/wide viewport evidence, and console/network observations when the game is reachable. Its synthetic-input limitation must be recorded explicitly: WebBridge automation is not trusted native user input merely because it clicks or types. Synthetic events that do not reach the trusted browser/native-input boundary may establish only an attempted interaction or harness limitation, not successful keyboard, pointer, touch, gesture, or drag behavior.

Trusted native input must therefore be distinguished in every browser record from WebBridge-synthetic input. A runnable disposition requires the applicable trusted native-input path, or an independently documented mechanism that the browser itself treats as trusted, plus compact and wide transition evidence. Screenshots alone never prove movement or a profile transition. If trusted input cannot be established, the result is non-runnable or unknown with the attempted command, environment, route, revision, logs, limitation, and independent review recorded; it is not silently waived.

## 6. Historical and missing Ziggurat boundary

The Sorcerer's Ziggurat is a separate third batch because its current implementation or source history may be missing or historical. No present-day route, scene, mechanic, responsive behavior, asset usage, or transition may be inferred from catalog prose, neighboring games, title similarity, screenshots, or analogy. A historical claim requires a reachable historical Git object, exact path/range or binary envelope, revision chronology, and a collector receipt. A missing-source disposition requires bounded search scope, exact command and exit status, captured output hash, environment, attempted revisions/paths, and independent reviewer acceptance.

Every Ziggurat record must label one of: current implementation fact, reachable historical fact, active design/prose only, unresolved conflict, or unknown. Active design and catalog prose may explain provenance but cannot satisfy implementation or browser evidence. Missing or historical evidence remains provisional and blocks dependent Must-have conclusions. No browser run may convert a missing or historical disposition into current behavior.

## 7. Candidate, acceptance, and successor ordering

This strategy creates neither candidate nor accepted output. Later authorized roles must enforce this order:

1. Commit this strategy while preserving unrelated dirty work.
2. Immediately after that commit, and before role/budget manifests, any source read under a role, dispatch, or evidence output, capture `git rev-parse HEAD^{commit}`. That full returned SHA is the immutable `phase_base_sha`; this file intentionally contains no future phase-base hash. The supplied `a49ebcc4dc3b3792a96b5b114d729b0b542af0fe` remains the baseline/role-base input unless a later receipt records a different actual role-base capture.
3. Freeze and receipt the B0 ownership, isolation, and budgets. Only after B0 passes may source work begin.
4. Complete each batch in order; complete and independently accept one batch before opening the next. No cross-game standardization or ontology decision is permitted.
5. Run exact semantic truth tests, browser/history boundaries, and all required role reviews. One unsupported claim or denominator mismatch stops the batch; unresolved Critical, High, or Medium findings block checkpoint.
6. Publish a **non-consumable candidate manifest** only after all package, truth, browser, budget, stop-loss, and receipt gates pass and the fresh full-cohort adversarial review has zero unresolved Critical/High/Medium findings.
7. Product-owner acceptance must be a valid tool-generated approval event bound to the exact candidate hash, review hash, gate version, scope, owner, timestamps, conversation/thread, approval-message hash, revocation state, and supersession state. It must occur after review and cannot be agent-authored, replayed, or inferred from prose.
8. Generate a separate **accepted manifest** only after that exact acceptance validates. Any input or output byte change revokes the candidate/acceptance chain and requires additive superseding receipts, rerun gates, and fresh review.

## 8. A1–A15 defense matrix

| Anti-pattern | Phase-0 defense and falsification |
|---|---|
| A1 | Parse structured task/role fields and exact markers; free-text “deferred” or similar prose cannot alter state. |
| A2 | Keep acceptance and publication separate; require explicit owner approval event and, where evidence is publishable, anonymization/consent basis. |
| A3 | Parse labeled integer counts and budgets with units; dates, hashes, or digit-bearing prose never satisfy a count. |
| A4 | Require exact positive scope, positive task counts, and positive role counts; zero work cannot pass B0. |
| A5 | Bind every status claim to the actual command exit code and labeled totals; no narrative Green over a red test. |
| A6 | Do not update registry or plan claims in this strategy; later acceptance text must not overstate candidate or review results. |
| A7 | Use exact field/path filters and bounded searches only; never suppress real hits using bare words such as “never” or “do not.” |
| A8 | Accept only `[~xb]` task markers; `[ ]` is invalid and cannot represent progress. |
| A9 | Resolve active/archive paths before reading predecessor artifacts; an archived track path must not be assumed active. |
| A10 | Treat generated graph/prose output as non-primary; structural changes require fresh generated facts where applicable, without promoting them to source truth. |
| A11 | If review executes, later plan state must reflect actual completed/remaining work; a fully blocked placeholder cannot conceal execution. |
| A12 | Verify every named catalog guard exists and fail closed on a dangling guard reference. |
| A13 | At eventual closeout, reject an archived track that also leaves a stale active track directory. |
| A14 | Use `rg -n`, not `rg -nE`; any detector exit 2 is an audit failure, never zero findings. |
| A15 | Keep receipts immutable and supersede them after fixes; recompute output hashes and bind actual commit, role, and phase bases. |

## 9. Stop-loss thresholds

The exact thresholds are: games in cohort `7`; batches `3`; unsupported/fabricated factual claims `0`; denominator mismatches `0`; unresolved Critical/High/Medium findings before checkpoint `0/0/0`; budget breaches `0`; unmeasured roles `0`; stale or missing receipts `0`; role collisions `0`; unreviewed browser dispositions `0`; failed fix/review cycles `2` maximum, with product-owner blockade after the second. Any threshold breach preserves the failing artifacts as non-authoritative, returns remediation to the owning isolated role, and requires additive superseding outputs plus fresh review.

MEASURE_AGENT_RESULT
