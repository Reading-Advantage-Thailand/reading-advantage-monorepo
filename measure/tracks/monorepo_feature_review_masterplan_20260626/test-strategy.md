# Test Strategy: Monorepo Feature Review Masterplan

Scope: planning-only Measure track `monorepo_feature_review_masterplan_20260626`. This strategy validates the review program documents and readiness gates only; it does **not** perform app/package feature reviews and does not edit product source.

## Graph and Readiness Baseline

- `build-graph stats ./graph.db` is available and reports 22,185 nodes, 46,017 edges, and 2,715 files.
- Graph probes that shape review guardrails: `createTenantDB`, `assertCan`, `AIClient`, and `StorageClient` exist as shared seams; child reviews must check usage of these seams rather than fixing callers in review tracks.
- Project `measure/anti-patterns.md` exists with canonical A1-A10 coverage. Child reviews must read it before writing findings or strategies and must extend it if project-specific failure classes are caught.

## Phase Gates and Falsification Commands

| Phase | Targeted Red command | Green gate | Closeout gate | Falsifies if |
|---|---|---|---|---|
| Phase 0: Orchestrator Prerequisites | `python3 - <<'PY'\nfrom pathlib import Path\nassert Path('graph.db').exists(), 'missing graph.db'\nap = Path('measure/anti-patterns.md')\nassert ap.exists(), 'missing project anti-patterns catalog'\ns = ap.read_text()\nfor i in range(1, 11):\n    assert f'A{i}' in s, f'missing A{i}'\nPY` | `build-graph stats ./graph.db` prints labeled counts and `measure/anti-patterns.md` exists with A1-A10. | `python3 ~/.agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py status --repo .` runs and the masterplan remains active, not archived. | Missing graph, unlabeled metrics, or missing A-catalog prerequisite. |
| Phase 1: Master Protocol | `python3 - <<'PY'\nfrom pathlib import Path\ns = Path('measure/tracks/monorepo_feature_review_masterplan_20260626/spec.md').read_text()\nfor term in ['Review Protocol','Feature Taxonomy','Evidence Artifacts','Stop Conditions','anti-pattern']:\n    assert term in s, f'missing {term}'\nPY` | Spec/strategy define taxonomy, severity/finding fields, artifacts, stop conditions, and A-class defenses. | No protocol language claims actual review coverage before child inventories exist. | Broad completion claims, missing finding schema, or no anti-pattern defense. |
| Phase 2: Child Track Creation | `python3 - <<'PY'\nfrom pathlib import Path\ntracks = ['shared_foundation_review_20260626','reading_advantage_full_review_20260626','primary_advantage_full_review_20260626','science_advantage_review_20260626','codecamp_advantage_review_20260626','sales_advantage_review_20260626','marketing_app_review_20260626','advantage_games_review_20260626','www_reading_advantage_review_20260626','cross_app_workflows_review_20260626','monorepo_review_roadmap_20260626']\nfor t in tracks:\n    d = Path('measure/tracks') / t\n    for f in ['metadata.json','spec.md','plan.md']:\n        assert (d / f).exists(), f'missing {t}/{f}'\nPY` | All required child tracks exist with metadata/spec/plan. | Child docs are review-only and create artifacts, not remediation code. | Any missing child track, empty shell doc, or product-source task. |
| Phase 3: Registry Integration | `python3 - <<'PY'\nfrom pathlib import Path\nr = Path('measure/tracks.md').read_text()\norder = ['shared_foundation_review_20260626','reading_advantage_full_review_20260626','primary_advantage_full_review_20260626','science_advantage_review_20260626','codecamp_advantage_review_20260626','sales_advantage_review_20260626','marketing_app_review_20260626','advantage_games_review_20260626','www_reading_advantage_review_20260626','cross_app_workflows_review_20260626','monorepo_review_roadmap_20260626']\npos = [r.index(t) for t in order]\nassert pos == sorted(pos), 'registry order mismatch'\nassert 'remediation must be opened as separate Measure tracks' in r\nPY` | Registry lists master + children in intended order and labels the program review/planning-only. | Existing Reading/Primary AGENTS.md audit stubs remain as separate stubs/cross-references. | Registry order drift, missing child, or overstatement that remediation/review is done. |
| Phase 4: Readiness Verification | `python3 - <<'PY'\nfrom pathlib import Path\nfor d in Path('measure/tracks').glob('*_review_20260626'):\n    spec = (d/'spec.md').read_text(); plan = (d/'plan.md').read_text()\n    for term in ['Scope','Required Artifacts','Non-Goals','Acceptance Criteria']:\n        assert term in spec, f'{d.name} missing {term}'\n    assert 'Inventory' in plan.split('## Phase 0',1)[1].split('## Phase 1',1)[0], f'{d.name} lacks inventory-first phase'\n    assert 'review complete' not in (spec + plan).lower(), f'{d.name} claims completion'\nPY` | Every child track has scope/non-goals/artifacts/acceptance and starts with inventory/evidence loading. | Cross-app track depends on child inventories; roadmap depends on accepted artifacts. | Empty/vacuous child docs, completion claims, or findings before inventory. |
| Phase 5: Closeout | `python3 - <<'PY'\nfrom pathlib import Path\ns = Path('measure/tracks/monorepo_review_roadmap_20260626/spec.md').read_text()\np = Path('measure/tracks/monorepo_review_roadmap_20260626/plan.md').read_text()\nfor term in ['deduplicated-findings.md','critical-high-remediation-plan.md','test-strategy-roadmap.md','Accepted child review artifacts']:\n    assert term in s + p, f'missing roadmap output/input {term}'\nassert 'Do not implement remediation' in s\nPY` | Roadmap inputs/outputs are explicit and require accepted child artifacts. | User sequencing approval is recorded before opening implementation/remediation tracks. | Roadmap opens fixes directly, accepts unaccepted findings, or omits coverage limits. |

## Fixtures, Mocks, and Live-Behavior Proof

- Fixtures are documentation fixtures only: `graph.db`, `measure/tracks.md`, masterplan `spec.md`/`plan.md`, child track docs, and the project/canonical A1-A10 anti-pattern catalog.
- No product mocks, DB mocks, browser fixtures, or provider fakes are used in this planning track.
- Live-behavior proof is **not applicable** to this track: `UX_REQUIRED=never`; `PROJECT_TESTS` is limited to planning/readiness guards (`bash tests/orchestrator_catalog.sh && bash tests/orchestrator_marker_vocabulary.sh`). Child review tracks must define their own live-behavior proof when they inspect runtime features.
- Artifact/documentation tests prove structure, ordering, prerequisites, and truthfulness only. They do not prove app behavior, tenant isolation, provider fallback, or UX correctness.

## Architecture Guardrails and Changed-Contract Risks

- Review tracks may create audit artifacts under `measure/audit-reports/**`; they must not remediate product source unless evidence gathering is blocked and the user approves a separate track.
- Shared foundation review must precede app review because app findings may be rooted in `packages/db`, `auth`, `domain`, `api`, `ai`, `storage`, `webhooks`, `types`, `ui`, `utils`, `config`, or integrations.
- Child reviews must distinguish changed-contract risks from implementation bugs: route/domain/API/storage/AI contract changes become remediation-track proposals, not silent doc edits.
- If the artifact schema changes, update the master protocol, child specs, cross-app inputs, and roadmap inputs together; otherwise roadmap synthesis can silently drop findings.
- Registry text must stay conservative: planned, review-only, or prerequisite language only until accepted artifacts exist.

## Intentionally-Red Aggregate-Suite Handling

- There is no aggregate product test suite for this planning-only track. `PROJECT_TESTS='bash tests/orchestrator_catalog.sh && bash tests/orchestrator_marker_vocabulary.sh'` is intentionally restricted to document/readiness guards.
- `measure_interphase_checks.py status --repo .` will continue listing many incomplete child-review phases; that is a readiness signal, not a failing product test.
- Do not commit intentionally red product tests in this track. If future doc validators are added, any intentionally-red validator must name the owning phase and falsification condition, and it must be removed or made green before final acceptance.

## Anti-Pattern Coverage by Phase

| Phase | A-class defenses |
|---|---|
| Phase 0 | A1/A8: use structured markers only (`[x]`, `[~]`, `[b] deferred:<owner>`), never substring `deferred`; A3: graph metrics must be labeled integers; A10: graph freshness is explicit and must not be implied by stale generated facts. |
| Phase 1 | A2: artifact protocol must require anonymization/consent review before publish/share; A3: evidence counts require labels; A5: protocol forbids false completion language; A7: any validator filters only known doc/path contexts, not broad English words. |
| Phase 2 | A4: child track existence is not enough; specs/plans must contain required sections; A6: registry cannot overstate child readiness; A8: pending child work should be blocked/deferred or in-progress according to the orchestrator vocabulary; A9: tests should resolve active/archive track paths when reused after closeout. |
| Phase 3 | A1/A8: registry markers must remain structurally parseable; A6: registry notes must not say reviews are complete/resolved; A9: links must point to active child track dirs until archive closeout moves them. |
| Phase 4 | A4: inventory-first check prevents vacuous docs; A5: no child plan may claim review completion before execution; A7: completion-claim scans must target exact false-claim phrases, not discard lines with broad disclaimers; A10: child inventories must cite graph freshness or mark graph unavailable. |
| Phase 5 | A2: roadmap/public summaries must not publish sensitive findings without anonymization/consent handling; A4: roadmap outputs must be non-empty before acceptance; A5/A6: executive summary must state coverage limits and cannot claim remediation complete; A9: roadmap must preserve child artifact paths even after archive moves. |

## Final Readiness Notes

The masterplan is coherent for a planning-only program: it covers all eight apps (Reading, Primary, Advantage Games, company website, Science, CodeCamp, Marketing, Sales), shared packages, cross-app workflows, and final roadmap synthesis. No child track currently claims an actual feature review is complete. The project-level `measure/anti-patterns.md` prerequisite is present, marker-vocabulary cleanup has converted review-program plans to `[x]` or `[b] deferred:<owner>` markers, and child reviews must keep using and extending the catalog before orchestrated review execution. Child execution remains intentionally deferred to each review track; this masterplan readiness pass does not prove any app/package feature behavior or remediation is complete.
