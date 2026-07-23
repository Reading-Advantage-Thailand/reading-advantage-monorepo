"""Batch B V8 truth contracts for the exact committed active artifacts.

V8 retains V7's source, semantic, fixture, asset, browser-limit, review, and
lifecycle contracts while selecting the Archer V4 mapper and the later owner
completion disposition.  The observed HTTP 400 remains a mandatory successor
defect disclosure and forbids completion, persistence, and XP claims, but is no
longer an automatic blocker for an otherwise valid evidence-only candidate.
"""

from __future__ import annotations

import importlib.util
import inspect
from pathlib import Path
from typing import Any


_V8_PATH = Path(__file__).resolve()
_TRACK_DIR = _V8_PATH.parent
_REPO_ROOT = _V8_PATH.parents[3]
_RECEIPTS_DIR = _TRACK_DIR / "role-receipts"
_V7_PATH = _TRACK_DIR / "batch-b-truth-tests-v7.py"
_V8_RECEIPT_PATH = _RECEIPTS_DIR / "truth-test-author-batch-b-v8.json"

_spec = importlib.util.spec_from_file_location("batch_b_truth_v7_for_v8", _V7_PATH)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Unable to load V7 truth contracts from {_V7_PATH}")
_v7 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_v7)
_core = _v7._v6

PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "c83ed9b41c8442616c25d54b36e8df92d65b6f80"
GLOBAL_DIRECTION = "measure/product-owner-apk-provenance-direction-20260721.json"
WEBBRIDGE_DIRECTION = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "product-owner-direction-batch-b-webbridge.json"
)
COMPLETION_DIRECTION = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "product-owner-direction-batch-b-completion-disposition.json"
)

MAPPER_RELATIVE = dict(_v7.MAPPER_RELATIVE)
MAPPER_RELATIVE["archers-revenge"] = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "archers-revenge-blueprint-batch-b-v4.json"
)
MAPPER_REPORT_RELATIVE = dict(_v7.MAPPER_REPORT_RELATIVE)
MAPPER_REPORT_RELATIVE["archers-revenge"] = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/"
    "archers-revenge-mapper-final-report-batch-b-v4.json"
)
ARCHER_MAPPER_RECEIPT = (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
    "requirements-mapper-archers-revenge-batch-b-v4.json"
)

ACTIVE_INPUT_HASHES = dict(_v7.ACTIVE_INPUT_HASHES)
for _superseded_mapper_path in (
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-blueprint-batch-b-v3.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-mapper-final-report-batch-b-v3.json",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-archers-revenge-batch-b-v3.json",
):
    ACTIVE_INPUT_HASHES.pop(_superseded_mapper_path)
ACTIVE_INPUT_HASHES.update(
    {
        "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v7.py": "c863dd698bbeb684d7d462c3b32887e58ed6dfc0211c3123d149de817cfe6682",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/truth-test-author-batch-b-v7.json": "dd23913fcfbfe6fe3647af6850e777e62b5962ed2216ed944ef16d358b148406",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/discovery-auditor-batch-b-v2.json": "c6c94ea45b4564a5a4cbf17451d0069f3a67e27b63b0af20bbb2bb61df613dfb",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-storm-castle-tower-batch-b.json": "1efd07acda32536ddc19d3472e3f9f010f10649f81aa4dcd173479af636d54d8",
        MAPPER_RELATIVE["archers-revenge"]: "16de053d4e375ccb28f753b7102fcf4fde3fc23ac08c2395d317422e85599501",
        MAPPER_REPORT_RELATIVE["archers-revenge"]: "ecb0af9f4d2462462bb8c2b9763432c2d2fff41b3d7815a2316434c2eda07c5b",
        ARCHER_MAPPER_RECEIPT: "3673c240ec61d3747fb11002ba1d1dbe15bff588735e86ddaaed1d77bf042522",
        "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-storm-castle-tower-batch-b.json": "f24bf7f2b7854580b4f4003a464c274fabb0fe563fdf817a6bc30f7d21ddfdab",
        COMPLETION_DIRECTION: "973641c8f0b3f3281e9302d5b488f012be82f401bd6831b104674ce67f8c3960",
    }
)

PINNED_RECEIPT_HASHES = dict(_v7.PINNED_RECEIPT_HASHES)
PINNED_RECEIPT_HASHES.pop("requirements-mapper-archers-revenge-batch-b-v3.json")
PINNED_RECEIPT_HASHES["requirements-mapper-archers-revenge-batch-b-v4.json"] = (
    "3673c240ec61d3747fb11002ba1d1dbe15bff588735e86ddaaed1d77bf042522"
)
PINNED_RECEIPT_HASHES["truth-test-author-batch-b-v7.json"] = (
    "dd23913fcfbfe6fe3647af6850e777e62b5962ed2216ed944ef16d358b148406"
)
ACTIVE_RECEIPTS = (
    "discovery-auditor-batch-b-v2.json",
    "evidence-collector-village-guardian-batch-b-v3.json",
    "evidence-collector-archers-revenge-batch-b-v3-rebind.json",
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b-v3.json",
    "requirements-mapper-archers-revenge-batch-b-v4.json",
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "browser-auditor-batch-b-v3.json",
    "asset-auditor-batch-b-v2.json",
    "adversarial-reviewer-batch-b-v4.json",
    "truth-test-author-batch-b-v8.json",
)

# Point every inherited contract at the V8-selected immutable inputs.
_v7.ROLE_BASE_SHA = ROLE_BASE_SHA
_v7.ACTIVE_INPUT_HASHES = ACTIVE_INPUT_HASHES
_v7.PINNED_RECEIPT_HASHES = PINNED_RECEIPT_HASHES
_v7.ACTIVE_RECEIPTS = ACTIVE_RECEIPTS
_v7.MAPPER_RELATIVE = MAPPER_RELATIVE
_v7.MAPPER_REPORT_RELATIVE = MAPPER_REPORT_RELATIVE
_v7._V7_PATH = _V8_PATH
_v7._V7_RECEIPT_PATH = _V8_RECEIPT_PATH
_core.ROLE_BASE_SHA = ROLE_BASE_SHA
_core.ACTIVE_INPUT_HASHES = ACTIVE_INPUT_HASHES
_core.PINNED_RECEIPT_HASHES = PINNED_RECEIPT_HASHES
_core.ACTIVE_RECEIPTS = ACTIVE_RECEIPTS
_core.V6_PATH = _V8_PATH
_core.V6_RECEIPT_PATH = _V8_RECEIPT_PATH


def _load_json(relative: str) -> dict[str, Any]:
    """Loads one repository-relative JSON object.

    @param relative Repository-relative artifact path.
    @returns The parsed JSON object.
    """
    return _core.load_json(_REPO_ROOT / relative)


def _has_exact_descendant_binding(path: Path) -> bool:
    """Checks whether exact current bytes have a commit after the role base.

    @param path Output whose external committed binding is required.
    @returns Whether a descendant commit on the current history contains the exact bytes.
    """
    relative = str(path.relative_to(_REPO_ROOT))
    history = _core.git("log", "--format=%H", "--", relative)
    for commit in history.stdout.decode().splitlines():
        if _core.git("merge-base", "--is-ancestor", ROLE_BASE_SHA, commit).returncode != 0:
            continue
        if _core.git_show(commit, relative) == path.read_bytes():
            return True
    return False


def _forbidden_positive_claims(value: Any, location: str = "$") -> list[str]:
    """Finds structured positive completion claims forbidden in evidence manifests.

    @param value Parsed candidate or accepted-manifest value.
    @param location Diagnostic JSON location.
    @returns Locations of truthy forbidden claim fields.
    """
    forbidden = {
        "successfulcompletion",
        "completionsuccess",
        "completionaccepted",
        "persistenceconfirmed",
        "persistencesuccess",
        "xpawarded",
        "xppersisted",
        "idempotencyverified",
        "apicorrectness",
        "completionapicorrect",
    }
    truthy = {"true", "pass", "passed", "success", "successful", "confirmed", "verified", "awarded"}
    defects: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = "".join(character for character in key.lower() if character.isalnum())
            is_positive = child is True or (isinstance(child, str) and child.lower() in truthy)
            if normalized in forbidden and is_positive:
                defects.append(f"{location}.{key}")
            defects.extend(_forbidden_positive_claims(child, f"{location}.{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            defects.extend(_forbidden_positive_claims(child, f"{location}[{index}]"))
    return defects


class BatchBFreezeContract(_v7.BatchBFreezeContract):
    """B0 exact committed input, scope, predecessor, and direction contracts."""


class BatchBCollectorPackageContract(_v7.BatchBCollectorPackageContract):
    """B1 latest selected-package structure, counts, envelopes, and coverage."""


class BatchBMapperPackageContract(_v7.BatchBMapperPackageContract):
    """B2 exact Village V3, Archer V4, and Storm mapper contracts."""

    def test_mappers_bind_every_exact_active_claim_id(self) -> None:
        """Fails when: a selected mapper omits active IDs, cites fixtures/foreign IDs, or binds superseded collector bytes."""
        defects: list[str] = []
        for game in _core.GAMES:
            blueprint = _load_json(MAPPER_RELATIVE[game])
            report = _load_json(MAPPER_REPORT_RELATIVE[game])
            references = set(_core.iter_claim_references(blueprint))
            active = {_core.claim_id(item) for item in _core.claims(game)}
            if references != active:
                defects.append(f"{game}:missing={len(active - references)},stale={len(references - active)}")
            if game == "village-guardian":
                bindings = blueprint.get("source_output_bindings", {})
                if bindings.get("claim_ledger_path") != _v7.LEDGER_RELATIVE[game]:
                    defects.append(f"{game}:ledger-path")
                if bindings.get("claim_ledger_sha256") != _core.file_hash(_core.LEDGER_PATHS[game]):
                    defects.append(f"{game}:ledger-hash")
            elif game == "archers-revenge":
                if blueprint.get("source_claim_ledger") != Path(_v7.LEDGER_RELATIVE[game]).name:
                    defects.append(f"{game}:ledger-path")
                bindings = report.get("v3_input_bindings", {})
                ledger = bindings.get("claim_ledger", {})
                if ledger.get("path") != _v7.LEDGER_RELATIVE[game]:
                    defects.append(f"{game}:report-ledger-path")
                if ledger.get("sha256") != _core.file_hash(_core.LEDGER_PATHS[game]):
                    defects.append(f"{game}:report-ledger-hash")
                collector = bindings.get("collector_receipt", {})
                if collector.get("path") != (
                    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/"
                    "evidence-collector-archers-revenge-batch-b-v3-rebind.json"
                ):
                    defects.append(f"{game}:collector-receipt-path")
                if collector.get("sha256") != _core.file_hash(
                    _RECEIPTS_DIR / "evidence-collector-archers-revenge-batch-b-v3-rebind.json"
                ):
                    defects.append(f"{game}:collector-receipt-hash")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B2_STALE_MAPPER_BINDING]: " + ", ".join(defects))


class BatchBClaimTruthContract(_v7.BatchBClaimTruthContract):
    """B3 independent all-claim source-semantic contracts."""

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V8 truth test lacks an auditable `Fails when:` condition."""
        missing: list[str] = []
        module = __import__(__name__)
        for _, cls in inspect.getmembers(module, inspect.isclass):
            if cls.__module__ != __name__ or not cls.__name__.startswith("BatchB"):
                continue
            for name, method in inspect.getmembers(cls, inspect.isfunction):
                if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or ""):
                    missing.append(f"{cls.__name__}.{name}")
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(_v7.BatchBNegativeFixtureContract):
    """B3 all-fixture envelope and independent-refutation contracts."""


class BatchBReceiptContract(_v7.BatchBReceiptContract):
    """Exact local receipt, direction, and external commit-binding contracts."""

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the V8 receipt selects another role/base/test or either V8 output lacks a descendant exact-byte commit."""
        receipt = _core.load_json(_V8_RECEIPT_PATH)
        self.assertEqual(receipt.get("role"), "truth-test-author-batch-b-v8")
        self.assertEqual(receipt.get("role_base_sha"), ROLE_BASE_SHA)
        binding = next(
            (item for item in _core.output_bindings(receipt) if item[0] == str(_V8_PATH.relative_to(_REPO_ROOT))),
            None,
        )
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], _core.file_hash(_V8_PATH))
        uncommitted = [
            str(path.relative_to(_REPO_ROOT))
            for path in (_V8_PATH, _V8_RECEIPT_PATH)
            if not _has_exact_descendant_binding(path)
        ]
        self.assertEqual(
            uncommitted,
            [],
            "EXPECTED_STAGE_RED[UNCOMMITTED_V8]: owner policy requires an external descendant Git binding",
        )

    def test_latest_artifacts_bind_the_correct_owner_provenance_direction(self) -> None:
        """Fails when: an active collector or mapper receipt mislabels WebBridge direction as local-provenance authority."""
        expected = "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE"
        self.assertEqual(_load_json(GLOBAL_DIRECTION).get("decision"), expected)
        selected = [
            _v7.LEDGER_RELATIVE["village-guardian"],
            _v7.REPORT_RELATIVE["village-guardian"],
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-village-guardian-batch-b-v3.json",
            MAPPER_REPORT_RELATIVE["village-guardian"],
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/requirements-mapper-village-guardian-batch-b-v3.json",
            _v7.LEDGER_RELATIVE["archers-revenge"],
            _v7.REPORT_RELATIVE["archers-revenge"],
            "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v3-rebind.json",
            ARCHER_MAPPER_RECEIPT,
        ]
        defects: list[str] = []
        for relative in selected:
            document = _load_json(relative)
            direction = document.get("provenance_direction")
            if not isinstance(direction, dict):
                direction = document.get("provenance")
            if not isinstance(direction, dict):
                direction = document.get("v3_input_bindings", {}).get("provenance_direction", {})
            if direction.get("path", direction.get("direction_path")) != GLOBAL_DIRECTION:
                defects.append(f"{relative}:path")
            if direction.get("decision", expected) != expected:
                defects.append(f"{relative}:decision")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[OWNER_PROVENANCE_BINDING]: " + ", ".join(defects))


class BatchBBrowserContract(_v7.BatchBBrowserContract):
    """B4 exact WebBridge evidence and browser-limit contracts."""


class BatchBAssetContract(_v7.BatchBAssetContract):
    """B4 exact asset-V2 denominator, source, and live-limit contracts."""


class BatchBCompletionContract(_v7.BatchBCompletionContract):
    """The owner's evidence-only disposition for the disclosed completion defect."""

    test_village_completion_api_succeeds_before_persistence_or_xp_claims = None

    def test_http_400_is_disclosed_without_automatically_blocking_evidence_only_candidate(self) -> None:
        """Fails when: HTTP 400 is hidden, called success, or still made an automatic evidence-only candidate blocker."""
        direction_path = _REPO_ROOT / COMPLETION_DIRECTION
        direction = _load_json(COMPLETION_DIRECTION)
        self.assertEqual(direction_path.read_bytes(), _core.git_show(ROLE_BASE_SHA, COMPLETION_DIRECTION))
        self.assertEqual(direction.get("decision"), "CONDITIONAL_EVIDENCE_ACCEPTANCE_WITH_SUCCESSOR_DEFECT_TRANSFER")
        self.assertEqual(direction.get("finding"), "Village Guardian completion POST returned HTTP 400 in the accepted WebBridge observation.")
        self.assertIn("mandatory carry-forward disclosure", direction.get("disposition", ""))
        self.assertIn("successor implementation defect", direction.get("disposition", ""))
        self.assertIn("not evidence of successful completion", direction.get("disposition", ""))
        self.assertEqual(
            direction.get("supersedes"),
            "The prior completion finding's use as an automatic B5 blocker only; it remains a recorded successor defect.",
        )
        village = next(
            item for item in _load_json(str(_core.BROWSER_PATH.relative_to(_REPO_ROOT)))["games"]
            if item["normalized_id"] == "village-guardian"
        )
        network = "\n".join(village["network_observations"])
        self.assertIn("Both terminal runs POSTed", network)
        self.assertIn("400 application/json", network)
        self.assertNotIn("POST /api/v1/games/village-guardian/complete completed 200", network)

    def test_completion_persistence_and_xp_success_claims_remain_forbidden(self) -> None:
        """Fails when: owner limits permit a candidate/accepted manifest to claim completion, persistence, XP, idempotency, or API correctness."""
        direction = _load_json(COMPLETION_DIRECTION)
        limits = set(direction.get("required_limits", []))
        self.assertIn(
            "No candidate or accepted evidence manifest may claim successful completion, persistence, XP award, idempotency, or API correctness.",
            limits,
        )
        self.assertIn(
            "Any successor implementation that claims completion must fix and integration-test the API independently.",
            limits,
        )
        for name in ("candidate-cohort-manifest-batch-b.json", "accepted-cohort-manifest-batch-b.json"):
            path = _TRACK_DIR / name
            if path.is_file():
                self.assertEqual(_forbidden_positive_claims(_core.load_json(path)), [], name)
        accepted = _TRACK_DIR / "accepted-cohort-manifest-batch-b.json"
        if accepted.is_file():
            serialized = accepted.read_text(encoding="utf-8")
            self.assertIn(str(_core.BROWSER_PATH.relative_to(_REPO_ROOT)), serialized)
            self.assertIn(COMPLETION_DIRECTION, serialized)
            self.assertIn("HTTP 400", serialized)


class BatchBIndependentReviewContract(_v7.BatchBIndependentReviewContract):
    """B5 exact review-V4 selection, freshness, sampling, and blocker contracts."""

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: review V4 predates any selected V3/V4 input, owner direction, or exact V8 output byte."""
        inputs = _core.load_json(_core.REVIEW_RECEIPT_PATH).get("input_hashes", {})
        required = {
            relative: digest
            for relative, digest in ACTIVE_INPUT_HASHES.items()
            if relative not in {
                str(_core.REVIEW_PATH.relative_to(_REPO_ROOT)),
                str(_core.REVIEW_RECEIPT_PATH.relative_to(_REPO_ROOT)),
            }
        }
        required[str(_V8_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V8_PATH)
        required[str(_V8_RECEIPT_PATH.relative_to(_REPO_ROOT))] = _core.file_hash(_V8_RECEIPT_PATH)
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_STALE_REVIEW_V8]: " + ", ".join(defects))


class BatchBAcceptanceContract(_v7.BatchBAcceptanceContract):
    """B5 candidate, approval, and accepted-manifest existence gates."""


if __name__ == "__main__":
    _core.unittest.main()
