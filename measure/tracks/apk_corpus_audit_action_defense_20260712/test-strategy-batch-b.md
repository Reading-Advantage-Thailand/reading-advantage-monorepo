# T4 Batch B — Test Strategy

Track: `apk_corpus_audit_action_defense_20260712`
Plan phase: **Phase 2: Batch B evidence packages**
Strategy role scope: this file only; no product source, ledger, receipt, plan, registry, candidate manifest, or accepted manifest is authored here.

## 1. Authoritative scope and evidence boundary

`plan.md` is authoritative. Batch B contains exactly:

1. Village Guardian
2. Archer's Revenge
3. Storm the Castle Tower

Any different batching in `DISPATCH.md`, `HANDOFF.md`, catalog prose, generated graph output, or another document is stale for scope purposes and must not add, remove, or move a game. The normalized names used in artifact filenames below are document identifiers, not claims about source paths, runtime state, or history.

The accepted Batch A manifest is a process predecessor with SHA-256 `b096d911b7d6bc9fb4d530e695cea10d3816a17158447a89303c2d069cf2a54c`. Batch A disclosure `DISC-001` must be carried forward in Batch B process metadata as an existing low-severity disclosure. It is **not factual input for Batch B**: it may not back a Batch B claim, fixture, source disposition, mapper conclusion, browser result, or asset usage. A Batch B test must fail if `DISC-001` appears anywhere other than an explicitly labeled `carried_forward_disclosures` field.

The following predecessor bindings must be recomputed and matched before source work:

| Binding | Required value |
|---|---|
| T1 evidence-integrity gate version / commit | `phase4-v8-candidate` / `5aea360f` |
| T2 accepted denominator SHA-256 | `d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729` |
| T2 accepted partition SHA-256 | `6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0` |
| T3 accepted pilot SHA-256 | `cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b` |
| Batch A accepted-cohort SHA-256 | `b096d911b7d6bc9fb4d530e695cea10d3816a17158447a89303c2d069cf2a54c` |
| Frozen source baseline revision | `23bb5ad578c01fb29f9e8bb76a7d934d24a4b286` |

A graph query or generated report may identify files or symbols for discovery, but it is never primary evidence. Every source-derived statement must be re-derived from a reachable Git object at its declared revision. This strategy intentionally asserts no undocumented source, route, history, runnable, mechanic, responsive, or asset fact about the three games.

## 2. Role, receipt, and budget contract

### 2.1 Required roles and incompatibility

The orchestrator must publish a machine-readable applicability/task-ownership record before dispatch. It assigns `owner_role`, `reviewer_role`, `forbidden_roles`, allowed-input-manifest hash, expected outputs, and reviewer for every task.

Five roles are mandatory and incompatible for the same package:

1. **Discovery auditor** — reconciles the Batch B denominator and runnable candidates; authors no claims or mappings.
2. **Evidence collector** — one fresh isolated collector package **per game**; the three game packages use three distinct collector sessions/IDs.
3. **Requirements mapper** — one fresh isolated mapper package **per game**; each mapper is distinct from that game's collector and from all truth/review roles.
4. **Truth-test author** — fresh batch-level role; does not collect, map, review, or accept.
5. **Adversarial reviewer** — fresh batch-level `fork_turns="none"` role; reviews all three games and does not author or repair reviewed outputs.

Additional roles supplement rather than replace the five:

- **Browser auditor:** applicable after each game's mechanically reviewed runnable disposition. Runnable means compact and wide real-input proof is mandatory. A non-runnable result still requires a reviewed attempted command, environment, route, revision, exact failure, and logs; it is not a silent skip.
- **Asset auditor:** applicable to all three games for denominator reconciliation and concrete source-derived scene/non-scene usage. Full suitability or production-forensics conclusions remain T8-owned, but missing Batch B usage evidence is not deferred.

The root orchestrator may coordinate, commit, bind receipts, and report. It may not act as any discovery, collector, mapper, truth-test, browser, asset, or adversarial-review role. No agent may repair an artifact it independently reviews; remediation returns to the owning role and is re-reviewed from fresh context.

### 2.2 Receipt requirements

Every role output requires an `apk-role-receipt.v1` record containing the program-required spawn and ancestry IDs, exact prompt SHA-256, allowed-input-manifest SHA-256, actual-context-manifest SHA-256, prior-role history, start/end event IDs and timestamps, exact final-response SHA-256, output paths and SHA-256 values, findings, budget-declaration SHA-256, commit SHA, and phase/role bases.

Independent isolation requires provider proof of `fork_turns="none"` or retained raw-export proof that history starts with exactly the fresh prompt and has no inherited pre-prompt turns. Literal `parent_ancestry_ids: []`, `inherited_narrative: false`, and `fork_turns: "none"` fields alone do not replace raw isolation/prompt proof.

Receipts are append-only. If any reviewed fix changes an output, the original receipt remains immutable and a new tool-attested superseding receipt binds the new commit and output bytes. Missing fields, placeholders, retrospective copied IDs, output/final-response mismatch, stale hashes, in-place receipt edits, or an uncorroborated ownership claim fail closed under A15.

### 2.3 Frozen budgets

Before any source read, the orchestrator must freeze a numeric budget declaration for each role and for the batch. Each declaration uses labeled integer ceilings with explicit units for at least:

- source bytes read;
- source files/objects read;
- command invocations;
- elapsed minutes;
- claims or records authored/reviewed, where applicable;
- browser interactions and captured artifacts, when applicable;
- asset candidates inspected, when applicable.

The declaration hash is included in every affected receipt. Tests parse each named field as an integer (booleans and digit-bearing prose do not count), require actual usage to be a labeled integer in the same unit, and assert `actual <= ceiling`. `unmeasured`, a missing ceiling, a post-source ceiling, or a changed ceiling without prior product-owner approval blocks checkpoint and revokes affected candidate outputs.

## 3. Required outputs without factual assumptions

For each normalized game id (`village-guardian`, `archers-revenge`, `storm-castle-tower`), require one independently owned collector package:

- `<game>-claim-ledger-batch-b.json`
- `<game>-evidence-method-batch-b.md`
- `<game>-evidence-final-report-batch-b.json`
- `role-receipts/evidence-collector-<game>-batch-b.json`

Require one separately owned mapper package per game:

- `<game>-blueprint-batch-b.json`
- `<game>-mapper-hypotheses-batch-b.md`
- `<game>-mapper-final-report-batch-b.json`
- `role-receipts/requirements-mapper-<game>-batch-b.json`

Batch-level outputs expected from later roles are:

- discovery/applicability record and discovery receipt;
- frozen role/budget declarations;
- `batch-b-truth-tests.py` and truth-test-author receipt;
- browser audit plus receipt, with one reviewed disposition per game;
- asset-usage audit plus receipt, with one reconciliation record per assigned denominator path/usage and explicit unknowns;
- adversarial review plus receipt;
- non-consumable candidate manifest, product-owner acceptance, and accepted manifest, authored only by their authorized later roles and in the order in §9.

Each per-game package must reconcile identity, routes, implementation, copy, tests, assets, history, all discovered scenes/states/transitions, mechanics/learning behavior, developer-effort decomposition, responsive evidence, conflicts, unknowns, and confidence against the accepted denominator. Empty categories require a bounded exact-source absence record; they may not be omitted or filled by analogy.

## 4. Audit-ready truth-test method

The truth-test author must create one batch module at:

```text
measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests.py
```

Every test must declare a named contract and an explicit `fails_when` condition. A test without a falsification condition is invalid even if it passes.

### 4.1 All-claim checks

For every factual claim and factual field:

1. Enforce a stable unique claim ID, exact game, category, scene/state when applicable, source revision, relative file path, inclusive range, blob SHA-256, range SHA-256, source fact, separate interpretation, confidence, evidence class, discovery method, collector ID, conflict state/resolution, and reviewer disposition.
2. Resolve the revision with read-only Git commands. Reject unreachable revisions, directories/trees as file citations, working-tree fallback, generated prose as primary evidence, and the quarantined failed ontology track except as labeled negative evidence.
3. Recompute the full blob SHA-256. For UTF-8 text, recompute the declared inclusive range under an explicitly recorded trailing-newline convention. Binary evidence uses a whole-file envelope. Absence claims use a bounded tree/search command, exact search domain, captured output/exit status, and output SHA-256; a positive file citation cannot prove a second absence proposition.
4. Enforce atomicity. A compound proposition must be split or have a separate exact envelope for every atom. A valid hash with an anchor that does not establish the claim is RED.
5. Independently derive semantics by claim kind:
   - literal/configuration claims require the claimed literal in the exact range;
   - counts are recomputed from parsed source and compared to a labeled integer;
   - relationships require exact evidence for both endpoints and the relationship;
   - state/transition/terminal claims require the relevant guard, mutation, and target state anchors;
   - route/API claims require exact method/path/adapter evidence and separate absence evidence for missing counterparts;
   - responsive and asset-usage claims require exact implementation anchors and, when runnable, live corroboration;
   - historical claims require reachable historical objects and chronology evidence, never later prose alone.
6. Reconcile every accepted denominator item exactly once. Zero items, duplicate ownership, an unassigned item, or an authored-output denominator is RED.
7. Recompute report/category/fixture totals from records. Only labeled integer fields count.

Hash resolution proves byte identity, not factual correctness. Structural/schema/documentation tests are never allowed to promote a source claim without the semantic checks above.

### 4.2 Negative fixtures and mocks

Each game package must include independently source-checked negative fixtures covering at least these distinct refutations:

- a hash-valid but semantically overstated or compound claim;
- a directory-only, generated-prose, or otherwise invalid primary citation;
- a plausible fabricated mechanic, asset usage, route, or infrastructure claim;
- a keyword/regex/analogy-selected responsive or generic-template claim.

Every fixture records `expected_disposition` and the source-bounded reason. The truth author re-derives all fixtures; fixtures are never accepted claims and never inflate factual coverage. Any fixture that is accepted, skipped, or rejected only because its prose contains a convenient word falsifies the gate.

Mocks are allowed only to make a deterministic browser harness reach source-defined states, such as fixed learning data or an explicitly labeled test account. A mock must record what boundary it replaces. Mocked APIs, catalog cards, screenshots, fixtures, or component tests do not prove production route wiring, persistence, asset loading, authentication, or end-to-end behavior.

### 4.3 Independent-review sampling

Automated exact-envelope checks cover 100% of factual claims, fields, and fixtures. The fresh adversarial reviewer then reconciles **every game/package** and uses deterministic stratified source re-derivation:

- per game, sample `max(10, ceil(10% of factual claims))`;
- cover every populated claim category/evidence class, every cited revision class, and text, binary, absence, route/API, state/transition, responsive, and asset shapes when present;
- derive the seed from SHA-256 of the frozen per-game package hash plus normalized game id; record population, seed, selected IDs, and selection algorithm;
- independently recompute bytes and state exactly what each anchor proves, without collector/mapper completion narrative;
- re-derive 100% of negative fixtures, all Critical/High/Medium findings, all claims changed after a review, all source-baseline exceptions, and every candidate acceptance binding.

A sample mismatch triggers the one-unsupported-claim stop-loss and blocks the whole batch. Sampling does not weaken the all-claim machine checks or permit omission of any game.

## 5. Artifact tests versus live behavior

| Evidence type | What it may prove | What it cannot prove | Falsification |
|---|---|---|---|
| Schema, count, hash, receipt, and documentation tests | Artifact shape, exact bytes, declared lineage, labeled counts, and ownership | Claim semantics or runtime behavior | Required field/hash/count/lineage differs, or the test passes with zero work |
| Exact-source semantic tests | The cited source anchor establishes one atomic proposition | That a current route starts or real input works | Anchor does not contain/entail every proposition atom |
| Existing source unit/component tests | What those test artifacts assert and, if rerun, their observed result | Production wiring or behavior outside the tested boundary | Ledger converts test intent into an implementation fact without separate source/live proof |
| Browser/live audit | Observed route startup, real input, compact/wide composition, transitions, terminal behavior, network/console state | Historical behavior or unvisited states | Runnable game lacks required states/inputs/viewports, or proof is screenshots only |
| Asset-usage audit | Exact path/hash and source/live usage at a named state/surface | Suitability, licensing, or a future production asset decision | Denominator path is omitted/duplicated or usage lacks an exact source anchor |

For a runnable disposition, browser proof must record the documented start command/environment/revision/route, compact and wide viewports, real keyboard/pointer/touch input as applicable, start/instruction, active, transition, and terminal/result states discovered from source, plus console/network observations. Screenshots support but do not replace interaction logs and state transitions.

## 6. Phase gates and commands

All commands run from repository root. The planned test classes are contract names; the truth-test author may add tests but may not weaken these names or falsification conditions. A targeted Red is valid only when it exits nonzero for the stated missing/invalid condition; a vacuous pass is not Red evidence.

| Stage | Risk | Targeted Red command and expected falsification | Green gate | Closeout gate |
|---|---|---|---|---|
| **B0 — Freeze scope, predecessors, roles, budgets** | **high** | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests.py -k BatchBFreezeContract --maxfail=1` — RED if exact three-game scope, predecessor bytes, Batch A process binding, ownership, isolation, or pre-source numeric budgets are missing/mismatched. | Same command without `--maxfail=1`; all freeze tests pass with positive nonzero task/role counts. | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests.py -k 'BatchBFreezeContract or BatchBReceiptContract'` exits 0; strategy base and declarations are committed and receipt-bound. |
| **B1 — Discovery and three collector packages** | **critical** | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests.py -k BatchBCollectorPackageContract --maxfail=1` — RED on one unsupported claim, denominator mismatch, unassigned/duplicate item, directory/generated citation, missing per-game package, or collector-role collision. | Same command without `--maxfail=1`; all exact-envelope, schema, category, and denominator checks pass for three separate packages. | Cumulative `-k 'BatchBFreezeContract or BatchBCollectorPackageContract or BatchBReceiptContract'` exits 0; all three collector commits and fresh receipts bind current bytes; stop-loss counters are zero. |
| **B2 — Three per-game mapper packages** | **high** | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests.py -k BatchBMapperPackageContract --maxfail=1` — RED if backing IDs are unresolved, facts are added, unknowns disappear, Batch A/DISC-001 becomes factual input, or ontology/analogy/template conclusions leak in. | Same command without `--maxfail=1`; every mapped field resolves to accepted per-game claims and hypotheses remain explicitly non-authoritative. | Cumulative freeze/collector/mapper/receipt selector exits 0; three separate mapper commits/receipts bind outputs and no mapper held a collector/test/reviewer role. |
| **B3 — Truth tests and semantic refutation** | **critical** | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests.py -k 'BatchBClaimTruthContract or BatchBNegativeFixtureContract' --maxfail=1` — RED if any byte-valid anchor overstates semantics, compound claim lacks envelopes, fixture is not refuted, count is unlabeled/vacuous, or all-claim coverage is incomplete. | Same command without `--maxfail=1`; 100% claims and fixtures are exercised and every test has a named `fails_when`. | Cumulative B0-B3 selector exits 0; the truth-test receipt binds the exact test bytes and actual labeled pass/fail totals. No narrative may say Green when the command exits nonzero. |
| **B4 — Browser/live and asset-usage proof** | **high** | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests.py -k 'BatchBBrowserContract or BatchBAssetContract' --maxfail=1` — RED if a runnable game lacks compact/wide real-input transitions, a non-runnable disposition lacks attempted evidence/review, screenshots substitute for behavior, or an asset denominator usage is missing/duplicated/unanchored. | Same command without `--maxfail=1`; every game has a reviewed runnable/non-runnable record and every assigned asset usage is exact or an explicit blocking unknown. | Cumulative B0-B4 selector exits 0; browser/asset receipts bind evidence; mocks are labeled and no mocked boundary is claimed live. |
| **B5 — Independent review and acceptance chain** | **critical** | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests.py -k 'BatchBIndependentReviewContract or BatchBAcceptanceContract' --maxfail=1` — RED before full stratified review, zero Critical/High/Medium findings, authentic exact-hash approval, or correct candidate/accepted ordering. | Same command without `--maxfail=1`; review, stop-loss, receipt, candidate, approval-event, revocation, and accepted-manifest checks all pass. | `PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests.py && bash tests/orchestrator_role_receipt_integrity.sh && bash tests/orchestrator_marker_vocabulary.sh && bash tests/orchestrator_review_execution_truthfulness.sh && bash tests/orchestrator_detector_syntax.sh && bash tests/orchestrator_catalog.sh` exits 0 at one immutable reviewed HEAD; registry/plan claims are then checked against actual results. |

“Cumulative selector” means the literal OR expression formed from the named classes in that row and every preceding row. Later-stage classes may remain intentionally red and excluded until their stage; exclusions must be listed in the phase report, never hidden by a broad filter.

## 7. Intentionally-red aggregate handling

During B0-B4, the full Batch B module and repository aggregate may be intentionally red because later acceptance artifacts do not yet exist. This is not a waiver:

- Every run records command, start/end time, exit code, exact failing test IDs, and the set of expected later-stage reds.
- Only failures named in the current frozen Red report may be excluded from a stage closeout. Any new or differently failing test is blocking.
- Filters are exact test/class IDs, not bare English words or broad path suppression.
- A targeted stage cannot be called Green if its command is red, even when the aggregate failure is “expected.”
- B5 closeout requires the complete Batch B module and listed guards to exit 0. Pre-existing unrelated repository failures, if an orchestrator also runs `pnpm turbo run test`, remain separately labeled with command/output and may not be converted into a Batch B pass.
- Artifact tests and live behavior results are reported separately; one cannot cancel the other's failure.

## 8. Architecture guardrails and changed-contract risks

- This phase changes Measure evidence artifacts only. Any product-source edit is out of scope and stops the role.
- The accepted T2 denominator/partition are immutable inputs. A discovered mismatch stops interpretation; it is not silently “fixed” in a Batch B ledger.
- No generic defense/action template, cross-game capability, ontology, standardization, asset-production decision, or analogy may replace game-specific evidence.
- Generators may format approved records only; they may not choose scenes, mechanics, responsive strategies, capabilities, assets, confidence, conflicts, or dispositions.
- Source facts and interpretations remain separate. Unknowns stay explicit and block dependent Must-have conclusions.
- Current working-tree, catalog, graph, test, and historical documentation can disagree. Such conflicts are recorded, not reconciled by preference or prose.
- Schema/category/claim-ID changes can break truth parsers and downstream mappers. Any such change requires versioning, a new receipt, complete rerun, and fresh review.
- Route/API claims risk confusing file presence, adapter wiring, mocked response, and live behavior; each is a separate contract.
- Responsive claims risk converting CSS/keywords or screenshots into behavior; exact source plus runnable live proof is required.
- Asset claims risk converting file presence into usage; exact call-site/state evidence is required.
- Any input change after review revokes candidate/acceptance bindings and requires regenerated outputs, fresh receipts, truth rerun, and fresh review.

## 9. Candidate and acceptance ordering

This strategy role creates no candidate or accepted manifest. Later authorized roles must enforce this exact order:

1. All Batch B package, truth, browser/asset, budget, stop-loss, and receipt gates pass.
2. Fresh independent review completes with zero unresolved Critical, High, or Medium findings.
3. The orchestrator publishes a **non-consumable** candidate manifest binding exact package, test, review, receipt, budget, predecessor, and phase hashes.
4. Product-owner acceptance is created only after review and binds the exact candidate and review SHA-256 values, gate-version hash, owner identity, timestamp, scope, revocation/supersession state, tool-generated approval event/message ID, conversation/thread ID, exact approval-message SHA-256, and approval-event timestamp. The event is resolved and must be human/authorized, non-replayed, and later than review.
5. Only after valid acceptance may a separate accepted manifest be generated.

One unsupported/fabricated claim, one denominator mismatch, any unresolved Critical/High/Medium finding, any budget breach, stale receipt, or changed input blocks this chain. Low disclosures may be carried only as accurately scoped disclosures; they cannot downgrade a blocking defect. Two failed fix/review cycles block the track pending product-owner direction.

## 10. Review applicability

| Review | Applicability | Required focus |
|---|---|---|
| Security review | **Applicable** | Provenance tampering, path/revision confinement, command safety, raw-export/prompt authenticity, receipt immutability, approval replay/identity, accidental student/user data in browser artifacts, and mock/live boundary claims. Product security behavior is reviewed only when a Batch B claim asserts it. |
| UX/API review | **Applicable** | User-visible copy/control/state and route/API contracts as separate source claims; compact/wide usability and API/live parity where runnable; no inference from catalog or tests. |
| Adversarial testing | **Mandatory** | Stratified re-derivation for every game, all fixtures, semantic-overstatement attacks, denominator/scope injection, role collision, budget/receipt mutation, stale hashes, and approval ordering. |
| Browser review | **Conditionally mandatory per game** | Mechanically decide runnable status. Runnable requires real-input compact/wide state-transition evidence; non-runnable requires independently reviewed failure evidence. No unreviewed `not_applicable`. |
| Asset audit | **Applicable to every game** | Exact denominator path/hash, source call site, named scene/state/non-scene use, variant/unknown/conflict, and live corroboration when runnable; no suitability or production decision. |

## 11. Per-phase anti-pattern coverage and falsification

| Stage | Anti-pattern defenses the stage must exercise | Stage falsifies when |
|---|---|---|
| B0 | **A1** structured role/task states, never prose substring; **A3** labeled-integer budget/count parser; **A4** exact three games and positive role/task cardinality; **A8** only `[~xb]`; **A12** verify named guards exist; **A14** detector exit 2 is failure and no `rg -nE`; **A15** immutable strategy/role receipt bindings. | A prose token changes state, a year satisfies a count, zero work passes, `[ ]` is accepted, a guard is dangling, a detector error looks clean, or receipt bytes differ. |
| B1 | **A3** parsed ledger/report counts; **A4** nonempty exact per-game packages; **A5** executed source tests control claims; **A7** bounded absence/refutation with no bare-word exclusion; **A10** generated graph/prose cannot be source truth; **A15** collector fixes issue superseding receipts. | Count is not recomputable, a game/package is empty, prose says pass over a red command, filters hide evidence, generated facts become claims, or an output changes behind its receipt. |
| B2 | **A3** recomputed backing totals; **A4** every mapped field has backing; **A5** mapping status derives from tests; **A7** no broad hypothesis/fact filters; **A10** mapping cannot promote generated facts; **A15** one immutable mapper receipt per game/revision. | A bare number passes, zero backing passes, a red mapping is called complete, a real violation is filtered, mapper adds facts, or receipt/output hashes drift. |
| B3 | **A3** labeled test/subtest/claim counts; **A4** all-claim positive coverage; **A5** exact command/exit/result binding; **A7** exact refutations; **A14** executable detectors and nonzero tooling errors; **A15** truth-test receipt refreshed only by supersession. | Dates satisfy counts, no claims are exercised, report text disagrees with exit code, broad filters swallow a hit, detector syntax fails silently, or test bytes change after receipt. |
| B4 | **A2** synthetic/anonymized browser data or explicit consent for identifiable evidence; **A4** screenshots-only/zero-interaction proof fails; **A5** live status matches observed run; **A7** no console/network error suppression by broad filters; **A10** screenshots/generated reports do not become source facts; **A15** browser/asset evidence changes require new receipts. | Identifiable evidence is published without basis, zero interactions pass, “runnable” contradicts logs, errors are filtered, artifact proof is called live, or evidence hashes are stale. |
| B5 | **A1** structured acceptance/revocation fields; **A2** publication privacy/consent gate; **A3** parsed severity/sample/pass counts; **A4** candidate cannot pass with zero reviewed claims/games; **A5** candidate/plan claims match commands; **A6** registry cannot overstate acceptance; **A8** truthful plan markers; **A9** active/archive path resolution; **A11** completed review cannot remain fully blocked; **A12** guard references resolve; **A13** no stale duplicate track dir at eventual archive closeout; **A14** detector syntax/exit discipline; **A15** full receipt lineage and supersession. | Any structured gate is inferred from prose, publication lacks privacy basis, counts are vacuous, review omits a game, text outruns tests, registry/plan overstate, paths/markers drift, review state lies, guards/detectors are invalid, archive state duplicates, or a receipt is stale. |

Coverage is deliberately exhaustive across A1-A15. Each test implementation must link to at least one row above and carry its own narrower `fails_when`; the table is not a substitute for test-level falsifiability.

## 12. Stop-loss and closeout thresholds

- Games in batch: exactly 3; a fourth or missing game stops work.
- Unsupported or fabricated factual claims: 0; one stops the batch.
- Denominator mismatches: 0; one stops interpretation and synthesis.
- Failed fix/review cycles: at most 2; after the second failure, block pending product-owner direction.
- Unresolved Critical/High/Medium findings: 0 before any later checkpoint.
- Budget ceiling violations or `unmeasured` roles: 0.
- Missing/stale/mutated role receipts: 0.
- Unreviewed runnable/non-runnable dispositions: 0.
- Unassigned or multiply assigned denominator items: 0.
- Candidate or acceptance publication before its predecessor gate: 0.

On stop-loss, preserve the exact failing artifacts and receipts, mark them non-authoritative, return remediation to the owning isolated role, publish additive superseding outputs/receipts, rerun all affected truth/live gates, and obtain a fresh independent review. Never edit history to make a failed cycle appear green.

## 13. Immutable `phase_base_sha` capture

This file must be committed by the orchestrator before the immutable Batch B `phase_base_sha` is captured. This strategy does not and cannot contain that future SHA.

The exact sequence is:

1. The orchestrator commits **this strategy file** while preserving unrelated dirty work.
2. **Immediately after that strategy commit, before writing role/budget manifests, dispatching any Batch B role, reading Batch B source under a role, or creating any Batch B evidence output**, run:

   ```bash
   git rev-parse HEAD^{commit}
   ```

3. The full returned commit SHA is the immutable `phase_base_sha`. Record and bind it into every Batch B ownership record, budget declaration, prompt, output, receipt, truth report, review, and later candidate/acceptance artifact.
4. Every role separately records the full `role_base_sha` captured immediately before its dispatch. A later HEAD never replaces the immutable phase base.

A SHA from before the committed strategy, including the strategy role baseline, is invalid as `phase_base_sha`.
