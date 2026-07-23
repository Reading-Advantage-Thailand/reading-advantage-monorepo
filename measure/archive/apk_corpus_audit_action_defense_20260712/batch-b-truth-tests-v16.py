"""Batch B V16 truth contracts for review V10's four High findings.

V16 preserves V15's exact source, semantic, fixture, browser, asset, completion,
and lifecycle boundaries. It declares every observed denominator dependency,
uses an explicit post-output committed binding, applies one uniform local
receipt contract to every selected active receipt, and freezes a bounded
verification decomposition for the next fresh review without rewriting V10's
overflow. Fresh review and lifecycle gates remain fail-closed.
"""

from __future__ import annotations

import importlib.util
import inspect
from pathlib import Path
from typing import Any


_V16_PATH = Path(__file__).resolve()
_TRACK_DIR = _V16_PATH.parent
_REPO_ROOT = _V16_PATH.parents[3]
_RECEIPTS_DIR = _TRACK_DIR / "role-receipts"
_V15_PATH = _TRACK_DIR / "batch-b-truth-tests-v15.py"
_V15_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v15.json"
_V16_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v16.json"

_spec = importlib.util.spec_from_file_location("batch_b_truth_v15_for_v16", _V15_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Unable to load V15 truth contracts from {_V15_PATH}")
_v15 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_v15)
_core = _v15._core

PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
AUTHOR_ROLE_BASE_SHA = "803ad6f15b2eacfebb2fdbd81a568b783e496746"
SOURCE_BASELINE_REVISION = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
ALLOWED_INPUT_MANIFEST_SHA256 = "e47a9e95fec45b4f2c03834a09d9ca56f62d18e03d6f29af56b1d3642ec71717"
BUDGET_DECLARATION_SHA256 = "7d649b94d28ddc4538b79ba68a7e0cd71597ec2968ca7ae09874cf817a8b0f2f"

POST_OUTPUT_BINDING = "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-post-output-committed-binding-v16.json"
REVIEW_DECOMPOSITION = "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-review-verification-decomposition-v16.json"
REVIEW_V10 = "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-adversarial-review-v10.json"
REVIEW_RECEIPT_V10 = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/adversarial-reviewer-batch-b-v10.json"
FRESH_REVIEW = "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-adversarial-review-v11.json"
FRESH_REVIEW_RECEIPT = "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/adversarial-reviewer-batch-b-v11.json"

DENOMINATOR_RUNTIME_DEPENDENCIES = {
    "measure/archive/apk_source_denominator_inventory_20260712/asset-file-denominator.json": "41c9ede1a8e5ddab21b74a99959fbddc35b5f5a6902740a740a48f174bf7f438",
    "measure/archive/apk_source_denominator_inventory_20260712/game-identity-ledger.json": "a31c99650bf1abd6623e64b2e9a23c4c481ce970036b52cfbe08c74b1c09c407",
    "measure/archive/apk_source_denominator_inventory_20260712/historical-source-denominator.json": "6e313be829b414e7c85f4f20d4cb7e33283f15d743740b8784b589d0de2c7e6f",
    "measure/archive/apk_source_denominator_inventory_20260712/scene-state-denominator.json": "6308836ca24f1cac5bf4ded5f7e72c5ba06c08f4a5c6648620818b720190bf8b",
    "measure/archive/apk_source_denominator_inventory_20260712/source-denominator.json": "0dbf97dac93ba2056228e79433fb91e6f2ef1898b6f09eff62fe0755082ba21d",
}

RECONCILED_RECEIPT_HASHES = {
    "discovery-auditor-batch-b-v16-complete.json": "81dd6e593bb182d6ec5f0904ad933d915d5e48e42e89b56a784c016ed5d4489b",
    "evidence-collector-village-guardian-batch-b-v16-complete.json": "00facb0ccfb6e792a9003eb50658e746937860541f416938b5172a6327fa4044",
    "evidence-collector-archers-revenge-batch-b-v16-complete.json": "366f9092421df5fa704d460143494e547e46e66de142fdefe802c6b0478e6e77",
    "evidence-collector-storm-castle-tower-batch-b-v16-complete.json": "08fdb2733a8bd277409d3c644e9d6b109a99ca4955491d68f072c3cc6a65a672",
    "requirements-mapper-village-guardian-batch-b-v16-complete.json": "aa113df8829ea4960c0ceef8e10dd4d4bfdff1a410642dd1e80fd180bf9c6e92",
    "requirements-mapper-archers-revenge-batch-b-v16-complete.json": "2b4014565811f25ba698abef24de90b7dd75e758c836af226dcabe8731199e25",
    "requirements-mapper-storm-castle-tower-batch-b-v16-complete.json": "cada4098a1aea9fb30c3da7f5aa5b1068ee33dfb9429078354a26f8cb85e49de",
    "browser-auditor-batch-b-v16-complete.json": "3a87217383d35077eaad60efc7aa2aeb5b0882f9d971dad346ec22225dd6550f",
    "asset-auditor-batch-b-v16-complete.json": "fecab1f7b97cc8a80c888ef62f5fd2bce80e975e7f8194ddc25503f31cde961c",
}

ADDITIONAL_INPUT_HASHES = {
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v15.py": "47eef0cf9e6e975a619c6e8fee02bb1a2244674404433b09aa51139612a53ab5",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v15.json": "da99399f881f18cdbf6436749435d6a78a53e973d72e717570b66ac89be8f430",
    REVIEW_V10: "de357cddb84f999aed0f28b085ce29bbd1b663dc30827c0112a6b8c19f010325",
    REVIEW_RECEIPT_V10: "02af6764a6f8384c989d311fb8460ac68b32186dee961d0b6218c04eb81adf97",
    POST_OUTPUT_BINDING: "7ea050667add3b965b6e0c9d872a125fd941b01cfeab1d3cb1c8490aa855a8e1",
    REVIEW_DECOMPOSITION: "3adb30a2f2c2a2691df2e3da9e55a2058c335f77aa84f87cd46571d184a22cd9",
    **DENOMINATOR_RUNTIME_DEPENDENCIES,
    **{
        f"measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/{name}": digest
        for name, digest in RECONCILED_RECEIPT_HASHES.items()
    },
}

ACTIVE_INPUT_HASHES = dict(_v15.ACTIVE_INPUT_HASHES)
ACTIVE_INPUT_HASHES.update(ADDITIONAL_INPUT_HASHES)
RUNTIME_DEPENDENCIES = dict(ACTIVE_INPUT_HASHES)
ACTIVE_RECEIPTS = (*RECONCILED_RECEIPT_HASHES, _V16_RECEIPT_PATH.name)
PINNED_RECEIPT_HASHES = dict(RECONCILED_RECEIPT_HASHES)

PROVIDER_FIELDS = (
    "prompt_sha256",
    "actual_context_manifest_sha256",
    "provider_spawn_id",
    "provider_session_id",
    "parent_ancestry_ids",
    "fork_turns",
    "raw_isolation_export_sha256",
    "start_event_id",
    "start_event_timestamp",
    "end_event_id",
    "end_event_timestamp",
    "final_response_sha256",
    "final_response_event_id",
    "commit_sha",
)
RESOURCE_FIELDS = (
    "source_bytes_read",
    "source_files_read",
    "command_invocations",
    "elapsed_minutes",
    "records_authored",
    "browser_interactions",
    "captured_browser_artifacts",
    "asset_candidates_inspected",
)


def _load_json(relative: str) -> dict[str, Any]:
    """Loads one repository-relative JSON object.

    @param relative Repository-relative artifact path.
    @returns The parsed JSON object.
    """
    return _core.load_json(_REPO_ROOT / relative)


def _receipt_effective_inputs(receipt: dict[str, Any]) -> dict[str, str]:
    """Expands V16's inherited V15 and additive input maps.

    @param receipt Parsed V16 receipt.
    @returns The complete effective runtime path-to-digest map.
    """
    inherited = receipt["input_manifest"]["inherited_v15"]
    assert inherited["path"] == str(_V15_RECEIPT_PATH.relative_to(_REPO_ROOT))
    assert _core.file_hash(_REPO_ROOT / inherited["path"]) == inherited["sha256"]
    base = _v15._receipt_effective_inputs(_core.load_json(_REPO_ROOT / inherited["path"]))
    return {**base, **receipt["input_manifest"]["additions"]}


def _output_records(receipt: dict[str, Any]) -> list[tuple[str, str | None]]:
    """Returns normalized output path and digest pairs.

    @param receipt Parsed role receipt.
    @returns Explicit output records.
    """
    return _v15._output_records(receipt)


_modules = (
    _v15,
    _v15._v14,
    _v15._v14._v13,
    _v15._v14._v13._v12,
    _v15._v14._v13._v12._v11,
    _v15._v14._v13._v12._v11._v10,
    _v15._v14._v13._v12._v11._v10._v9,
    _v15._v14._v13._v12._v11._v10._v9._v8,
    _v15._v14._v13._v7,
    _core,
)
for _module in _modules:
    _module.ACTIVE_INPUT_HASHES = ACTIVE_INPUT_HASHES
    _module.PINNED_RECEIPT_HASHES = PINNED_RECEIPT_HASHES
    _module.ACTIVE_RECEIPTS = ACTIVE_RECEIPTS

for _module, _path_name, _receipt_name in (
    (_v15, "_V15_PATH", "_V15_RECEIPT_PATH"),
    (_v15._v14, "_V14_PATH", "_V14_RECEIPT_PATH"),
    (_v15._v14._v13, "_V13_PATH", "_V13_RECEIPT_PATH"),
    (_v15._v14._v13._v12, "_V12_PATH", "_V12_RECEIPT_PATH"),
    (_v15._v14._v13._v12._v11, "_V11_PATH", "_V11_RECEIPT_PATH"),
    (_v15._v14._v13._v12._v11._v10, "_V10_PATH", "_V10_RECEIPT_PATH"),
    (_v15._v14._v13._v12._v11._v10._v9, "_V9_PATH", "_V9_RECEIPT_PATH"),
    (_v15._v14._v13._v12._v11._v10._v9._v8, "_V8_PATH", "_V8_RECEIPT_PATH"),
    (_v15._v14._v13._v7, "_V7_PATH", "_V7_RECEIPT_PATH"),
):
    setattr(_module, _path_name, _V16_PATH)
    setattr(_module, _receipt_name, _V16_RECEIPT_PATH)
_core.V6_PATH = _V16_PATH
_core.V6_RECEIPT_PATH = _V16_RECEIPT_PATH
_core.REVIEW_PATH = _REPO_ROOT / FRESH_REVIEW
_core.REVIEW_RECEIPT_PATH = _REPO_ROOT / FRESH_REVIEW_RECEIPT


class BatchBFreezeContract(_v15.BatchBFreezeContract):
    """B0 exact V16 runtime map and post-output commit contracts."""

    def test_v6_selects_exact_additive_inputs(self) -> None:
        """Fails when: an input drifts or V15 remediation bytes are not bound at the explicit post-output commit."""
        defects = [path for path, digest in ACTIVE_INPUT_HASHES.items() if not (_REPO_ROOT / path).is_file() or _core.file_hash(_REPO_ROOT / path) != digest]
        self.assertEqual(defects, [], f"active input drift: {defects}")
        receipt = _core.load_json(_V16_RECEIPT_PATH)
        self.assertEqual(_receipt_effective_inputs(receipt), ACTIVE_INPUT_HASHES)
        binding = _load_json(POST_OUTPUT_BINDING)
        commit = binding["binding_commit_sha"]
        self.assertEqual(commit, AUTHOR_ROLE_BASE_SHA)
        self.assertNotEqual(commit, _v15.ROLE_BASE_SHA)
        self.assertEqual(_core.git("merge-base", "--is-ancestor", _v15.ROLE_BASE_SHA, commit).returncode, 0)
        for record in binding["bound_outputs"]:
            path, digest = record["path"], record["sha256"]
            self.assertEqual(_core.file_hash(_REPO_ROOT / path), digest, path)
            self.assertEqual(_core.git_show(commit, path), (_REPO_ROOT / path).read_bytes(), path)
        self.assertFalse(binding["candidate_authorized"])


class BatchBCollectorPackageContract(_v15.BatchBCollectorPackageContract):
    """B1 unchanged exact source truth and V8 atomic collector contracts."""


class BatchBMapperPackageContract(_v15.BatchBMapperPackageContract):
    """B2 unchanged exact Village, Archer, and Storm mapper contracts."""


class BatchBClaimTruthContract(_v15.BatchBClaimTruthContract):
    """B3 unchanged all-field, all-claim, and source-semantic contracts."""

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V16 truth test lacks an auditable `Fails when:` condition."""
        module = __import__(__name__)
        missing = [f"{cls.__name__}.{name}" for _, cls in inspect.getmembers(module, inspect.isclass) if cls.__module__ == __name__ and cls.__name__.startswith("BatchB") for name, method in inspect.getmembers(cls, inspect.isfunction) if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or "")]
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(_v15.BatchBNegativeFixtureContract):
    """B3 unchanged self-contained fixture-refutation contracts."""


class BatchBReceiptContract(_v15.BatchBReceiptContract):
    """Uniform active receipt, runtime dependency, and disclosure contracts."""

    def test_additive_receipts_bind_exact_outputs_and_role_base(self) -> None:
        """Fails when: the selected V16 active set is incomplete, duplicated, mis-hashed, or not reconciled at the supplied role base."""
        self.assertEqual(len(ACTIVE_RECEIPTS), 10)
        self.assertEqual(len(ACTIVE_RECEIPTS), len(set(ACTIVE_RECEIPTS)))
        for name, digest in PINNED_RECEIPT_HASHES.items():
            receipt = _core.load_json(_RECEIPTS_DIR / name)
            self.assertEqual(_core.file_hash(_RECEIPTS_DIR / name), digest, name)
            self.assertEqual(receipt["role_base_sha"], AUTHOR_ROLE_BASE_SHA, name)

    def test_pinned_existing_receipt_bytes_are_not_mutated(self) -> None:
        """Fails when: any selected pre-V16 active receipt differs from its exact declared digest."""
        self.assertEqual([name for name, digest in PINNED_RECEIPT_HASHES.items() if _core.file_hash(_RECEIPTS_DIR / name) != digest], [])

    def test_receipt_output_hashes_bind_current_exact_bytes(self) -> None:
        """Fails when: any selected active receipt omits outputs or binds a non-current output byte sequence."""
        defects: list[str] = []
        for name in ACTIVE_RECEIPTS[:-1]:
            records = _output_records(_core.load_json(_RECEIPTS_DIR / name))
            if not records:
                defects.append(f"{name}:no-outputs")
            for output, digest in records:
                if not isinstance(digest, str) or not (_REPO_ROOT / output).is_file() or _core.file_hash(_REPO_ROOT / output) != digest:
                    defects.append(f"{name}:{output}")
        self.assertEqual(defects, [])

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the V16 truth receipt selects another author base, test, or effective runtime map."""
        receipt = _core.load_json(_V16_RECEIPT_PATH)
        self.assertEqual(receipt["role"], "truth-test-author-batch-b-v16")
        self.assertEqual(receipt["role_base_sha"], AUTHOR_ROLE_BASE_SHA)
        self.assertEqual(_receipt_effective_inputs(receipt), ACTIVE_INPUT_HASHES)
        binding = next((item for item in _output_records(receipt) if item[0] == str(_V16_PATH.relative_to(_REPO_ROOT))), None)
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], _core.file_hash(_V16_PATH))

    def test_unavailable_provider_fields_do_not_automatically_fail_local_receipts(self) -> None:
        """Fails when: any active receipt bypasses the one complete local context, history, provider, findings, budget, output, or commit contract."""
        required = {"schema","status","acceptance","track_id","phase","task_id","role","role_identity","phase_base_sha","role_base_sha","source_baseline_revision","allowed_input_manifest_sha256","budget_declaration_sha256","prior_role_history","provider_unavailability","input_hashes","outputs","findings","resource_use","commit_sha","commit_disposition","completion_constraints","marker"}
        for name in ACTIVE_RECEIPTS:
            receipt = _core.load_json(_RECEIPTS_DIR / name)
            self.assertTrue(required <= set(receipt), f"{name}: {sorted(required - set(receipt))}")
            self.assertEqual(receipt["schema"], "apk-role-receipt.v1", name)
            self.assertEqual(receipt["track_id"], _core.TRACK_ID, name)
            self.assertEqual(receipt["phase"], _core.PHASE, name)
            self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA, name)
            self.assertEqual(receipt["allowed_input_manifest_sha256"], ALLOWED_INPUT_MANIFEST_SHA256, name)
            self.assertEqual(receipt["budget_declaration_sha256"], BUDGET_DECLARATION_SHA256, name)
            self.assertTrue(receipt["prior_role_history"], name)
            provider = receipt["provider_unavailability"]
            self.assertFalse(provider["available"], name)
            self.assertFalse(provider["attestation_claimed"], name)
            self.assertTrue(all(provider[field] is None for field in PROVIDER_FIELDS), name)
            self.assertIsInstance(receipt["findings"]["resolved"], list, name)
            self.assertIsInstance(receipt["findings"]["unresolved"], list, name)
            self.assertTrue(receipt["commit_disposition"], name)
            resource = receipt["resource_use"]
            self.assertEqual(set(resource["ceilings"]), set(RESOURCE_FIELDS), name)
            self.assertEqual(set(resource["actual"]), set(RESOURCE_FIELDS), name)
            for field in RESOURCE_FIELDS:
                self.assertIs(type(resource["ceilings"][field]), int, f"{name}.{field}.ceiling")
                self.assertIs(type(resource["actual"][field]), int, f"{name}.{field}.actual")
                self.assertLessEqual(resource["actual"][field], resource["ceilings"][field], f"{name}.{field}")
            self.assertEqual(resource["ceiling_breaches"], 0, name)
            constraints = receipt["completion_constraints"]
            self.assertTrue(all(constraints[key] is False for key in ("successful_completion","persistence_confirmed","xp_awarded","idempotency_verified","api_correctness")), name)

    def test_latest_artifacts_bind_the_correct_owner_provenance_direction(self) -> None:
        """Fails when: V16 changes WebBridge limits or promotes the Village HTTP 400 observation to completion/API success."""
        browser = _core.load_json(_RECEIPTS_DIR / "browser-auditor-batch-b-v16-complete.json")
        self.assertIn("DOM-level synthetic-input", " ".join(browser["findings"]["carried_forward"]))
        self.assertIn("HTTP 400", " ".join(browser["findings"]["carried_forward"]))
        for name in ACTIVE_RECEIPTS:
            constraints = _core.load_json(_RECEIPTS_DIR / name)["completion_constraints"]
            self.assertFalse(any(constraints.values()), name)

    def test_all_runtime_receipt_dependencies_are_declared_and_hashed(self) -> None:
        """Fails when: the V16 receipt limits completeness to receipts or omits any executed denominator/runtime input."""
        self.test_all_runtime_dependencies_are_declared_and_hashed()

    def test_all_runtime_dependencies_are_declared_and_hashed(self) -> None:
        """Fails when: the full runtime map omits, mis-hashes, or fails to Git-bind any observed denominator dependency."""
        receipt = _core.load_json(_V16_RECEIPT_PATH)
        self.assertEqual(receipt["runtime_dependencies"]["declaration"], "input_manifest")
        self.assertEqual(receipt["runtime_dependencies"]["effective_input_count"], len(RUNTIME_DEPENDENCIES))
        self.assertEqual(_receipt_effective_inputs(receipt), RUNTIME_DEPENDENCIES)
        self.assertTrue(set(DENOMINATOR_RUNTIME_DEPENDENCIES) <= set(RUNTIME_DEPENDENCIES))
        defects = [path for path, digest in RUNTIME_DEPENDENCIES.items() if not (_REPO_ROOT / path).is_file() or _core.file_hash(_REPO_ROOT / path) != digest]
        self.assertEqual(defects, [])
        for path, digest in DENOMINATOR_RUNTIME_DEPENDENCIES.items():
            self.assertEqual(_core.file_hash(_REPO_ROOT / path), digest, path)
            self.assertEqual(_core.git_show(AUTHOR_ROLE_BASE_SHA, path), (_REPO_ROOT / path).read_bytes(), path)


class BatchBBrowserContract(_v15.BatchBBrowserContract):
    """B4 unchanged WebBridge evidence and bounded-browser contracts."""


class BatchBAssetContract(_v15.BatchBAssetContract):
    """B4 unchanged asset denominator, source, and live-limit contracts."""


class BatchBCompletionContract(_v15.BatchBCompletionContract):
    """The unchanged disclosure-only Village HTTP 400 completion disposition."""


class BatchBIndependentReviewContract(_v15.BatchBIndependentReviewContract):
    """B5 exact V10 predecessor, bounded decomposition, and fresh-review gates."""

    def test_review_v4_and_receipt_are_exact_committed_selected_inputs(self) -> None:
        """Fails when: V10 review overflow evidence drifts or is not exact committed predecessor evidence at the post-output commit."""
        for relative in (REVIEW_V10, REVIEW_RECEIPT_V10):
            self.assertEqual(_core.file_hash(_REPO_ROOT / relative), ACTIVE_INPUT_HASHES[relative])
            self.assertEqual(_core.git_show(AUTHOR_ROLE_BASE_SHA, relative), (_REPO_ROOT / relative).read_bytes())
        self.assertEqual(_load_json(REVIEW_V10)["unresolved_findings"]["high"], 4)

    def test_review_budget_is_resolved_by_frozen_bounded_decomposition(self) -> None:
        """Fails when: V10 overflow is hidden, a ceiling is enlarged, usage is fabricated, or future review units can omit/overlap input verification."""
        decomposition = _load_json(REVIEW_DECOMPOSITION)
        predecessor = decomposition["overflow_predecessor"]
        self.assertEqual((predecessor["actual_source_files_read"], predecessor["actual_command_invocations"]), (106, 210))
        self.assertIn("non-authorizing", predecessor["disposition"])
        self.assertFalse(decomposition["budget_policy"]["ceiling_change"])
        self.assertIsNone(decomposition["resource_use"]["actual"])
        units = decomposition["units"]
        self.assertEqual(len(units), len({unit["unit_id"] for unit in units}))
        self.assertEqual(len(units), len({unit["owner_role"] for unit in units}))
        self.assertEqual(sum(1 for unit in units if unit["unit_id"].startswith("RV16-INPUT-")), 3)
        self.assertGreaterEqual(3 * 40, len(ACTIVE_INPUT_HASHES))
        self.assertTrue(all(unit["actual"] is None and unit["status"] == "not-run" for unit in units))
        self.assertEqual(decomposition["unit_ceilings"]["source_files_read"], 80)
        self.assertEqual(decomposition["unit_ceilings"]["command_invocations"], 50)

    def test_review_has_zero_unresolved_blocking_findings_for_active_inputs(self) -> None:
        """Fails when: the decomposed fresh V11 review is absent or reports any unresolved Critical, High, or Medium finding."""
        review = _core.load_json(_REPO_ROOT / FRESH_REVIEW)
        self.assertIsInstance(review, dict, "EXPECTED_STAGE_RED[B5_FRESH_REVIEW_V16]: review V11 missing")
        unresolved = review["unresolved_findings"]
        self.assertEqual((unresolved["critical"], unresolved["high"], unresolved["medium"]), (0, 0, 0))

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: no fresh decomposed reviewer binds every V16 runtime input, both V16 outputs, and every completed unit receipt."""
        receipt = _core.load_json(_REPO_ROOT / FRESH_REVIEW_RECEIPT)
        self.assertIsInstance(receipt, dict, "EXPECTED_STAGE_RED[B5_FRESH_REVIEW_V16_RECEIPT]: receipt V11 missing")
        required = dict(ACTIVE_INPUT_HASHES)
        required[str(_V16_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V16_PATH)
        required[str(_V16_RECEIPT_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V16_RECEIPT_PATH)
        self.assertEqual([path for path, digest in required.items() if receipt["input_hashes"].get(path) != digest], [])
        self.assertEqual(receipt["review_decomposition_sha256"], ACTIVE_INPUT_HASHES[REVIEW_DECOMPOSITION])
        self.assertTrue(all(unit["status"] == "complete" for unit in receipt["verification_units"]))


class BatchBAcceptanceContract(_v15.BatchBAcceptanceContract):
    """B5 unchanged candidate, approval, and accepted-manifest existence gates."""


if __name__ == "__main__":
    _core.unittest.main()
