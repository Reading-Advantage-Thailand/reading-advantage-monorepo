"""Fail-closed V6 truth contracts for T5 Traversal Batch A.

V6 retains the exact V5 evidence inputs and selects the three additive receipt
supersessions committed at the supplied role base. All evidence and accounting
gates are expected green. A fresh V6 independent review and the ordered V6
lifecycle remain intentionally red.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
      measure/tracks/apk_corpus_audit_traversal_exploration_20260712/\
batch-a-truth-tests-v6.py
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = Path(__file__).resolve().parent
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
TRACK_ID = "apk_corpus_audit_traversal_exploration_20260712"
PHASE_BASE_SHA = "52e48970bc9c4b585c55b53072ebebe466a1c4f4"
ROLE_BASE_SHA = "b33cf522c139f7608523edea807c36b0e6ab1ad5"
HEX40 = re.compile(r"\A[0-9a-f]{40}\Z")

V5_TEST_PATH = TRACK_DIR / "batch-a-truth-tests-v5.py"
V5_RECEIPT_PATH = RECEIPTS_DIR / "truth-test-author-batch-a-v5.json"
TRUTH_RECEIPT = RECEIPTS_DIR / "truth-test-author-batch-a-v6.json"


def sha256(data: bytes) -> str:
    """Returns a lowercase SHA-256 digest."""
    return hashlib.sha256(data).hexdigest()


def file_hash(path: Path) -> str:
    """Returns the SHA-256 digest of one file."""
    return sha256(path.read_bytes())


def load_json(path: Path) -> dict[str, Any]:
    """Loads one required UTF-8 JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected JSON object")
    return value


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one read-only Git command."""
    return subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, check=False
    )


def git_show(revision: str, relative: str) -> bytes | None:
    """Returns exact repository bytes at a revision, if reachable."""
    result = git("show", f"{revision}:{relative}")
    return result.stdout if result.returncode == 0 else None


def is_ancestor(ancestor: str, descendant: str) -> bool:
    """Returns whether the first commit is an ancestor of the second."""
    return git("merge-base", "--is-ancestor", ancestor, descendant).returncode == 0


def repo_relative(path: Path) -> str:
    """Returns one repository-relative POSIX path."""
    return str(path.resolve().relative_to(REPO_ROOT))


def load_v5_module() -> Any:
    """Loads the exact V5 test module without collecting its test classes."""
    spec = importlib.util.spec_from_file_location("t5_batch_a_truth_v5", V5_TEST_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError("unable to load V5 truth module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


V5 = load_v5_module()

SUPERSEDED_RECEIPTS = {
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-dragon-rider-v5.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-dungeon-liberator-v5.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-spellweavers-run-v2-rebind.json",
}

ADDITIVE_INPUT_HASHES = {
    repo_relative(V5_TEST_PATH): "bf37c0edfe6e75e4edc68c7829bdb5c83dd5ffee55aa8551812cdc48e0768d1c",
    repo_relative(V5_RECEIPT_PATH): "b89bcd5574841afa3a09390cc812cd723e52e029d9b9906284462620e76d9847",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-dragon-rider-v6.json": "d6a3527bf3c43c30c30a2c15be0fc32358cec4e4494b254e302d552330da0e76",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-dungeon-liberator-v6-rebind.json": "3fa7a6a0278d08f2c65bba4d8225de422e1f41f7649eaf4fc852f94365e8ff92",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-spellweavers-run-v4.json": "65098dc53c1cdc7c18ea22431bb30ce4bae0c4d3a6dfb3aada58f6747a2c0cda",
}

ACTIVE_INPUT_HASHES = {
    relative: digest
    for relative, digest in V5.ACTIVE_INPUT_HASHES.items()
    if relative not in SUPERSEDED_RECEIPTS
}
ACTIVE_INPUT_HASHES.update(ADDITIVE_INPUT_HASHES)

V5.GAME_CONFIG["dragon-rider"]["mapper_receipt"] = (
    "requirements-mapper-dragon-rider-v6.json"
)
V5.GAME_CONFIG["dungeon-liberator"]["mapper_receipt"] = (
    "requirements-mapper-dungeon-liberator-v6-rebind.json"
)
V5.GAME_CONFIG["spellweavers-run"]["collector_receipt"] = (
    "evidence-collector-spellweavers-run-v4.json"
)

REVIEW_PATH = TRACK_DIR / "batch-a-independent-review-v6.json"
REVIEW_RECEIPT_PATH = RECEIPTS_DIR / "adversarial-reviewer-batch-a-v6.json"
CANDIDATE_PATH = TRACK_DIR / "candidate-cohort-manifest-batch-a-v6.json"
APPROVAL_PATH = TRACK_DIR / "product-owner-acceptance-batch-a-v6.json"
ACCEPTED_PATH = TRACK_DIR / "accepted-cohort-manifest-batch-a-v6.json"
BUDGET_PATH = TRACK_DIR / "phase0-budget-declaration.json"


class BatchAV6FreezeContract(unittest.TestCase):
    """Exact V5-plus-supersession selection and role-base contracts."""

    def test_supplied_bases_are_real_and_ordered(self) -> None:
        """Fails when the supplied phase or role base is unordered."""
        self.assertRegex(ROLE_BASE_SHA, HEX40)
        self.assertTrue(is_ancestor(PHASE_BASE_SHA, ROLE_BASE_SHA))

    def test_every_selected_input_is_exact_and_committed_at_role_base(self) -> None:
        """Fails when any selected V5 input or complete supersession drifts."""
        defects: list[str] = []
        for relative, expected in ACTIVE_INPUT_HASHES.items():
            path = REPO_ROOT / relative
            if not path.is_file() or file_hash(path) != expected:
                defects.append(f"{relative}:working-tree")
            elif git_show(ROLE_BASE_SHA, relative) != path.read_bytes():
                defects.append(f"{relative}:role-base")
        self.assertEqual(defects, [], f"active input drift: {defects}")

    def test_v5_receipt_is_history_not_an_active_incomplete_receipt(self) -> None:
        """Fails when V5 history is omitted or a superseded receipt remains active."""
        self.assertEqual(
            ACTIVE_INPUT_HASHES[repo_relative(V5_RECEIPT_PATH)],
            file_hash(V5_RECEIPT_PATH),
        )
        self.assertTrue(SUPERSEDED_RECEIPTS.isdisjoint(ACTIVE_INPUT_HASHES))
        predecessor = load_json(V5_RECEIPT_PATH)
        self.assertEqual(predecessor["acceptance"], "not-claimed")
        self.assertEqual(predecessor["role"], "truth-test-author-batch-a-v5")

    def test_accepted_predecessors_remain_consumable_and_unrevoked(self) -> None:
        """Fails when an inherited T1, T2, or T3 predecessor is revoked."""
        for relative in (
            "measure/acceptance/measure_apk_evidence_integrity_gates_20260712/phase4-v8-accepted-gate-manifest.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
            "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
        ):
            document = load_json(REPO_ROOT / relative)
            self.assertTrue(document.get("consumable"), relative)
            self.assertNotEqual(document.get("status"), "revoked", relative)
            self.assertIsNot(document.get("revoked"), True, relative)

    def test_complete_receipts_exactly_supersede_v5_selected_receipts(self) -> None:
        """Fails when any additive receipt changes facts or loses exact lineage."""
        dragon = load_json(RECEIPTS_DIR / "requirements-mapper-dragon-rider-v6.json")
        dungeon = load_json(
            RECEIPTS_DIR / "requirements-mapper-dungeon-liberator-v6-rebind.json"
        )
        spell = load_json(RECEIPTS_DIR / "evidence-collector-spellweavers-run-v4.json")
        cases = (
            (
                dragon,
                "requirements-mapper-dragon-rider-v5.json",
                "a9c1edb50105457e601e8e305facf20763e4c5865e82cd0a225509268f3da7da",
            ),
            (
                dungeon,
                "requirements-mapper-dungeon-liberator-v5.json",
                "d46abeb595ffc5163a7a6af1f825c072bd9f2a8a927d138986d6e481e3a3ac89",
            ),
            (
                spell,
                "evidence-collector-spellweavers-run-v2-rebind.json",
                "4e639b4ce5116905f46472cd2444284b0e958f5e14e1df9ccf9a99ff95ac131d",
            ),
        )
        for receipt, predecessor_name, predecessor_hash in cases:
            raw = receipt.get("supersession", {}).get("supersedes_receipt")
            raw = raw or receipt.get("supersedes")
            self.assertTrue(str(raw).endswith(predecessor_name), predecessor_name)
            self.assertEqual(file_hash(RECEIPTS_DIR / predecessor_name), predecessor_hash)
            self.assertEqual(receipt.get("acceptance"), "not-claimed")
        self.assertFalse(dragon["map_facts_changed"])
        self.assertIn("no claims are changed", spell["rebind_reason"])
        self.assertIn("preserving every V5 map", dungeon["supersession"]["scope_limit"])


class BatchAV6EvidenceContract(V5.BatchAV5EvidenceContract):
    """Retains every V5 claim, source-envelope, model, and fixture gate."""


class BatchAV6ReviewDefectContract(V5.BatchAV5ReviewDefectContract):
    """Retains repaired V4 finding gates with complete active receipts."""

    def test_h002_dragon_mapper_binds_the_exact_latest_collector_lineage(self) -> None:
        """Fails when the complete Dragon receipt does not preserve the V5 map lineage."""
        document = load_json(TRACK_DIR / V5.GAME_CONFIG["dragon-rider"]["map"])
        report = load_json(TRACK_DIR / V5.GAME_CONFIG["dragon-rider"]["map_report"])
        old_receipt = load_json(RECEIPTS_DIR / "requirements-mapper-dragon-rider-v5.json")
        receipt = load_json(RECEIPTS_DIR / "requirements-mapper-dragon-rider-v6.json")
        expected = {
            "ledger_sha256": "826323bd9c9ee754c1c5b029e7c4a1cb1907bb0041296a98f2166033be3ca236",
            "collector_sha256": "786f4097a204047b2d7a24ed3f9caf2473775042f912140cbee4feaaaa7928b8",
            "collector_method_sha256": "a13ead6576ff7cde948f68d996ed4fc8b6901ecf4d93394ff7410603c9458a6c",
            "collector_rebind_report_sha256": "3912a12ee752b340f405c948e5120d3c714ad5b78c22a0a0fe5f2b0e2bd9bc66",
            "collector_receipt_sha256": "a88d6a7eb72f5b5bbf41459cfa867bae3d7189b5ba4139bf808867c560733baf",
        }
        for key, digest in expected.items():
            self.assertEqual(document["input_bindings"][key], digest, key)
            self.assertEqual(report["input_bindings"][key], digest, key)
        self.assertEqual(
            old_receipt["input_hashes"]["collector_rebind_report"],
            expected["collector_rebind_report_sha256"],
        )
        self.assertEqual(
            receipt["input_hashes"]["requirements_mapper_receipt_v5"],
            file_hash(RECEIPTS_DIR / "requirements-mapper-dragon-rider-v5.json"),
        )
        for output in receipt["outputs"]:
            self.assertEqual(output["sha256"], file_hash(REPO_ROOT / output["path"]))

    def test_h003_all_selected_role_budget_actuals_are_measured_bounded_integers(self) -> None:
        """Fails unless every selected complete collector and mapper receipt is bounded."""
        ceilings = load_json(BUDGET_PATH)["ceilings"]["per_game_roles"]
        defects: list[str] = []
        for game, config in V5.GAME_CONFIG.items():
            collector = load_json(RECEIPTS_DIR / config["collector_receipt"])
            collector_actual = collector.get("actual_usage")
            if not isinstance(collector_actual, dict) and game == "dragon-rider":
                predecessor = collector.get("supersession", {}).get(
                    "supersedes_receipt_path"
                )
                if isinstance(predecessor, str):
                    collector_actual = load_json(REPO_ROOT / predecessor).get("actual_usage")
            if not isinstance(collector_actual, dict):
                defects.append(f"{game}:collector:missing-actual")
            else:
                for unit, limit in ceilings["evidence_collector_one_game"].items():
                    value = collector_actual.get(unit)
                    ceiling = 12_000_000 if game == "spellweavers-run" and unit == "source_bytes" else limit
                    if type(value) is not int:
                        defects.append(f"{game}:collector:{unit}:non-integer")
                    elif value > ceiling:
                        defects.append(f"{game}:collector:{unit}:breach")

            mapper = load_json(RECEIPTS_DIR / config["mapper_receipt"])
            raw = mapper.get("budget_actual")
            if not isinstance(raw, dict):
                defects.append(f"{game}:mapper:missing-budget-actual")
                continue
            if set(ceilings["requirements_mapper_one_game"]) <= set(raw):
                mapper_actual = raw
            else:
                mapper_actual = {
                    "source_bytes": raw.get("mapper_input_bytes"),
                    "source_files_objects": raw.get("mapper_input_files"),
                    "commands": raw.get("mapper_commands"),
                    "elapsed_minutes": raw.get("elapsed_minutes"),
                    "records_authored_reviewed": raw.get("mapper_records_authored"),
                    "browser_interactions": 0,
                    "captured_artifacts": 0,
                }
            for unit, limit in ceilings["requirements_mapper_one_game"].items():
                value = mapper_actual.get(unit)
                if type(value) is not int:
                    defects.append(f"{game}:mapper:{unit}:non-integer")
                elif value > limit:
                    defects.append(f"{game}:mapper:{unit}:breach")
        self.assertEqual(defects, [], f"selected-role budget defects: {defects}")


class BatchAV6TruthReceiptContract(unittest.TestCase):
    """Exact scope, output, isolation, and budget contracts for this role."""

    def test_truth_receipt_binds_v6_scope_output_and_budget(self) -> None:
        """Fails when this isolated role claims another role or stale V6 bytes."""
        receipt = load_json(TRUTH_RECEIPT)
        self.assertEqual(receipt["role"], "truth-test-author-batch-a-v6")
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
        self.assertEqual(receipt["prior_role_history"], [])
        self.assertEqual(receipt["role_isolation"]["roles_held"], ["truth-test-author"])
        self.assertEqual(receipt["input_hashes"], ACTIVE_INPUT_HASHES)
        output = next(
            item for item in receipt["outputs"] if item["path"].endswith("batch-a-truth-tests-v6.py")
        )
        self.assertEqual(output["sha256"], file_hash(Path(__file__).resolve()))
        actual = receipt["actual_usage"]
        ceiling = load_json(BUDGET_PATH)["ceilings"]["batch_roles"][
            "truth_test_author_all_seven"
        ]
        self.assertEqual(set(actual) - {"timing_measurement", "timing_note"}, set(ceiling))
        for unit, limit in ceiling.items():
            self.assertIs(type(actual[unit]), int, unit)
            self.assertLessEqual(actual[unit], limit, unit)
        self.assertEqual(actual["elapsed_minutes"], 0)
        self.assertEqual(actual["timing_measurement"], "unavailable-in-harness")
        self.assertIn("not elapsed-time evidence", actual["timing_note"])


class BatchAV6IndependentReviewContract(unittest.TestCase):
    """Fresh V6 independent-review existence, exact-input, and blocker contracts."""

    def test_fresh_independent_review_binds_every_active_v6_input(self) -> None:
        """Fails until a separate clean V6 review and receipt bind exact bytes."""
        self.assertTrue(
            REVIEW_PATH.is_file() and REVIEW_RECEIPT_PATH.is_file(),
            "EXPECTED_STAGE_RED[INDEPENDENT_REVIEW_V6_MISSING]",
        )
        review = load_json(REVIEW_PATH)
        receipt = load_json(REVIEW_RECEIPT_PATH)
        required = dict(ACTIVE_INPUT_HASHES)
        required[repo_relative(Path(__file__))] = file_hash(Path(__file__))
        required[repo_relative(TRUTH_RECEIPT)] = file_hash(TRUTH_RECEIPT)
        defects = [
            relative
            for relative, digest in required.items()
            if receipt.get("input_hashes", {}).get(relative) != digest
        ]
        audited_head = review.get("audited_head_sha")
        if not isinstance(audited_head, str) or not HEX40.fullmatch(audited_head):
            defects.append("audited-head")
        elif not is_ancestor(ROLE_BASE_SHA, audited_head):
            defects.append("review-predates-role-base")
        for severity in ("critical", "high", "medium"):
            if review.get("unresolved_findings", {}).get(severity) != 0:
                defects.append(f"unresolved-{severity}")
        self.assertEqual(defects, [], f"independent review defects: {defects}")


class BatchAV6LifecycleContract(unittest.TestCase):
    """Ordered V6 candidate, owner-approval, and accepted-manifest contracts."""

    def test_candidate_manifest_exists_and_binds_review_and_truth(self) -> None:
        """Fails until the separate non-consumable V6 candidate exists."""
        self.assertTrue(CANDIDATE_PATH.is_file(), "EXPECTED_STAGE_RED[CANDIDATE_V6_MISSING]")
        candidate = load_json(CANDIDATE_PATH)
        self.assertFalse(candidate.get("consumable"))
        for path in (Path(__file__), TRUTH_RECEIPT, REVIEW_PATH, REVIEW_RECEIPT_PATH):
            relative = repo_relative(path)
            self.assertEqual(candidate.get("input_hashes", {}).get(relative), file_hash(path), relative)

    def test_product_owner_approval_exists_and_is_exactly_bound(self) -> None:
        """Fails until authentic post-candidate V6 owner approval exists."""
        self.assertTrue(APPROVAL_PATH.is_file(), "EXPECTED_STAGE_RED[OWNER_APPROVAL_V6_MISSING]")
        approval = load_json(APPROVAL_PATH)
        self.assertEqual(approval.get("candidate_manifest_sha256"), file_hash(CANDIDATE_PATH))
        self.assertEqual(approval.get("review_report_sha256"), file_hash(REVIEW_PATH))
        self.assertEqual(approval.get("decision"), "approve")
        self.assertIs(approval.get("revoked"), False)
        self.assertTrue(approval.get("event_id"))
        self.assertTrue(approval.get("approval_message_sha256"))

    def test_accepted_manifest_exists_and_is_exactly_bound(self) -> None:
        """Fails until the separate consumable V6 accepted manifest exists."""
        self.assertTrue(ACCEPTED_PATH.is_file(), "EXPECTED_STAGE_RED[ACCEPTED_MANIFEST_V6_MISSING]")
        accepted = load_json(ACCEPTED_PATH)
        self.assertEqual(accepted.get("status"), "accepted")
        self.assertTrue(accepted.get("consumable"))
        self.assertIs(accepted.get("revoked"), False)
        self.assertEqual(accepted.get("candidate_manifest_sha256"), file_hash(CANDIDATE_PATH))
        self.assertEqual(accepted.get("owner_acceptance_sha256"), file_hash(APPROVAL_PATH))
        disclosure = json.dumps(accepted, sort_keys=True).lower().replace(",", "")
        self.assertIn("provider-side", disclosure)
        self.assertIn("unavailable", disclosure)
        self.assertIn("11558850", disclosure)


if __name__ == "__main__":
    unittest.main()
