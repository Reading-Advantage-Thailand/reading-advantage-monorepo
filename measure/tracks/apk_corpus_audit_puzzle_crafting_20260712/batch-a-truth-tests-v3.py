"""Fail-closed V3 truth contract for T6 Puzzle/Crafting Batch A.

V3 retains the exact V2 fixes and selects the three browser audits and receipts
committed at the supplied role base. Every evidence gate is expected green.
Fresh independent review and the ordered lifecycle remain intentionally red.

Run from the repository root:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
      measure/tracks/apk_corpus_audit_puzzle_crafting_20260712/batch-a-truth-tests-v3.py
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
TRACK_ID = "apk_corpus_audit_puzzle_crafting_20260712"
PHASE_BASE_SHA = "52e48970bc9c4b585c55b53072ebebe466a1c4f4"
ROLE_BASE_SHA = "3d53d031f48eed2bbb324539900108136190cf57"
SOURCE_BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
HEX40 = re.compile(r"\A[0-9a-f]{40}\Z")
HEX64 = re.compile(r"\A[0-9a-f]{64}\Z")

V2_TEST_PATH = TRACK_DIR / "batch-a-truth-tests-v2.py"
V2_RECEIPT_PATH = RECEIPTS_DIR / "truth-test-author-batch-a-v2.json"
TRUTH_RECEIPT = RECEIPTS_DIR / "truth-test-author-batch-a-v3.json"


def sha256(data: bytes) -> str:
    """Returns a lowercase SHA-256 digest for exact bytes."""
    return hashlib.sha256(data).hexdigest()


def file_hash(path: Path) -> str:
    """Returns one local file's exact SHA-256 digest."""
    return sha256(path.read_bytes())


def load_json(path: Path) -> dict[str, Any]:
    """Loads one required UTF-8 JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected JSON object")
    return value


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one read-only Git command at the repository root."""
    return subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, check=False
    )


def git_show(revision: str, relative: str) -> bytes | None:
    """Returns exact repository bytes at a reachable revision and path."""
    result = git("show", f"{revision}:{relative}")
    return result.stdout if result.returncode == 0 else None


def is_ancestor(ancestor: str, descendant: str) -> bool:
    """Returns whether the first commit is an ancestor of the second."""
    return git("merge-base", "--is-ancestor", ancestor, descendant).returncode == 0


def repo_relative(path: Path) -> str:
    """Returns one repository-relative POSIX path."""
    return str(path.resolve().relative_to(REPO_ROOT))


def load_v2_module() -> Any:
    """Loads the exact V2 test module without collecting its test classes."""
    spec = importlib.util.spec_from_file_location("t6_batch_a_truth_v2", V2_TEST_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError("unable to load V2 truth module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


V2 = load_v2_module()

BROWSER_CONFIG = {
    "enchanted-library": {
        "game": "Enchanted Library",
        "identity": "vocabulary/enchanted-library",
        "audit": "batch-a/enchanted-library/browser-audit-batch-a.json",
        "receipt": "role-receipts/browser-auditor-enchanted-library-batch-a.json",
    },
    "rune-match": {
        "game": "Rune Match",
        "identity": "vocabulary/rune-match",
        "audit": "batch-a/rune-match/browser-audit-batch-a.json",
        "receipt": "role-receipts/browser-auditor-rune-match-batch-a.json",
    },
    "alchemists-synthesis": {
        "game": "Alchemist's Synthesis",
        "identity": "vocabulary/alchemists-synthesis",
        "audit": "batch-a/alchemists-synthesis/browser-audit-batch-a.json",
        "receipt": "role-receipts/browser-auditor-alchemists-synthesis-batch-a.json",
    },
}

DIRECT_INPUT_HASHES = {
    repo_relative(V2_TEST_PATH): "9005366f4e938c1d4d565e042ee18c16b18f12df2cec8334c8a77eea51b5e4f6",
    repo_relative(V2_RECEIPT_PATH): "0ffe44665048c47906a1efcfa1a82ec730514b7871d8660a5eb1a23829892c3f",
    f"measure/tracks/{TRACK_ID}/batch-a/alchemists-synthesis/browser-audit-batch-a.json": "d413d99aaa626f91d4426c8c8cb05518fb434e849e3ecac07b207f19960a3ce3",
    f"measure/tracks/{TRACK_ID}/batch-a/enchanted-library/browser-audit-batch-a.json": "9dc4e8c196cb43db78f987a68ec66e31032343c20b39e237e590005ed0507ae5",
    f"measure/tracks/{TRACK_ID}/batch-a/rune-match/browser-audit-batch-a.json": "eefbecd0fc706dda2c51a11227c253eba94104e7db162b88f568f7cbcb043105",
    f"measure/tracks/{TRACK_ID}/role-receipts/browser-auditor-alchemists-synthesis-batch-a.json": "1fe33d93065e8ad22e0f7785eff01bddef7a553c20c6f623895466d92d2edee0",
    f"measure/tracks/{TRACK_ID}/role-receipts/browser-auditor-enchanted-library-batch-a.json": "e2d0182bbc3b3ea9bec09b83289fc8633fdccc29914f21523975c130631c1430",
    f"measure/tracks/{TRACK_ID}/role-receipts/browser-auditor-rune-match-batch-a.json": "ee1faf8430f04f0c3c62fcf7e9df47b801e5a2e4b3a2c3ff28a65aea09321e5d",
}

REVIEW_PATH = TRACK_DIR / "batch-a-independent-review-v3.json"
REVIEW_RECEIPT_PATH = RECEIPTS_DIR / "adversarial-reviewer-batch-a-v3.json"
CANDIDATE_PATH = TRACK_DIR / "candidate-cohort-manifest-batch-a-v3.json"
APPROVAL_PATH = TRACK_DIR / "product-owner-acceptance-batch-a-v3.json"
ACCEPTED_PATH = TRACK_DIR / "accepted-cohort-manifest-batch-a-v3.json"


class BatchAV3FreezeContract(unittest.TestCase):
    """Exact V2-plus-browser selection and role-base gates."""

    def test_supplied_bases_are_real_and_ordered(self) -> None:
        """Fails when the supplied phase or role base is malformed or unordered."""
        self.assertRegex(PHASE_BASE_SHA, HEX40)
        self.assertRegex(ROLE_BASE_SHA, HEX40)
        self.assertTrue(is_ancestor(PHASE_BASE_SHA, ROLE_BASE_SHA))

    def test_every_direct_input_is_exact_and_committed_at_role_base(self) -> None:
        """Fails when a selected V2 predecessor or browser artifact drifts."""
        defects: list[str] = []
        for relative, expected in DIRECT_INPUT_HASHES.items():
            path = REPO_ROOT / relative
            if not path.is_file() or file_hash(path) != expected:
                defects.append(f"{relative}:working-tree")
            elif git_show(ROLE_BASE_SHA, relative) != path.read_bytes():
                defects.append(f"{relative}:role-base")
        self.assertEqual(defects, [], f"direct input drift: {defects}")

    def test_v2_fix_manifest_remains_exact_and_green(self) -> None:
        """Fails when V2 history is not the exact non-accepting fix selection."""
        receipt = load_json(V2_RECEIPT_PATH)
        self.assertEqual(receipt["role"], "truth-test-author")
        self.assertEqual(receipt["acceptance"], "not-claimed")
        self.assertEqual(receipt["expected_gate_state"]["source_envelopes"], "green for 57/57 claims with 64-char SHA-256 blob and cited-range envelopes")
        self.assertEqual(set(receipt["input_hashes"]), V2.ACTIVE_INPUTS)


class BatchAV3InheritedFreezeAndScopeContract(V2.BatchAFreezeAndScopeContract):
    """Retains V2 predecessor, identity, and package-scope gates."""


class BatchAV3ClaimTruthContract(V2.BatchAClaimTruthContract):
    """Retains every V2 claim, source-envelope, and semantic gate."""


class BatchAV3FixtureContract(V2.BatchAFixtureContract):
    """Retains every V2 positive-boundary and negative-control fixture gate."""


class BatchAV3MapperContract(V2.BatchAMapperContract):
    """Retains every V2 exact collector-binding and no-new-fact gate."""


class BatchAV3ReceiptAndBudgetContract(V2.BatchAReceiptAndBudgetContract):
    """Retains every V2 collector, mapper, truth-receipt, and budget gate."""


class BatchAV3BrowserEvidenceContract(unittest.TestCase):
    """Exact bounded browser-disposition and receipt gates."""

    def test_all_three_audits_are_identity_bound_and_non_promotional(self) -> None:
        """Fails when a browser audit changes identity or promotes a 404 to gameplay proof."""
        defects: list[str] = []
        for key, config in BROWSER_CONFIG.items():
            audit = load_json(TRACK_DIR / config["audit"])
            text = json.dumps(audit, ensure_ascii=False).lower()
            if audit.get("game") != config["game"]:
                defects.append(f"{key}:game")
            if audit.get("normalized_game_id") != config["identity"]:
                defects.append(f"{key}:identity")
            if audit.get("source_baseline_revision") != SOURCE_BASELINE:
                defects.append(f"{key}:source-baseline")
            if audit.get("acceptance") != "not-claimed":
                defects.append(f"{key}:acceptance")
            if audit.get("claims_authored") != 0 or audit.get("maps_authored") != 0:
                defects.append(f"{key}:cross-role-authoring")
            if "404" not in text or "unknown" not in text or "non-runnable" not in text:
                defects.append(f"{key}:bounded-disposition")
            if "all compact/wide behavior" not in text and "no gameplay transition was observed" not in text:
                defects.append(f"{key}:gameplay-trust-limit")
            if audit.get("screenshots_alone_pass") is True:
                defects.append(f"{key}:screenshot-promotion")
        self.assertEqual(defects, [], f"browser audit defects: {defects}")

    def test_all_three_receipts_are_isolated_and_bind_owned_outputs(self) -> None:
        """Fails when a browser receipt changes role, identity, isolation, or output ownership."""
        defects: list[str] = []
        for key, config in BROWSER_CONFIG.items():
            audit_path = TRACK_DIR / config["audit"]
            receipt_path = TRACK_DIR / config["receipt"]
            receipt = load_json(receipt_path)
            owned = set(receipt.get("owned_outputs", []))
            audit_relative = repo_relative(audit_path)
            receipt_relative = repo_relative(receipt_path)
            if receipt.get("role") != "browser-auditor":
                defects.append(f"{key}:role")
            if receipt.get("game") != config["game"] or receipt.get("normalized_game_id") != config["identity"]:
                defects.append(f"{key}:identity")
            if receipt.get("acceptance") != "not-claimed":
                defects.append(f"{key}:acceptance")
            if receipt.get("parent_ancestry_ids") != [] or "fork_turns=none" not in receipt.get("reviewer_isolation", ""):
                defects.append(f"{key}:isolation")
            if receipt.get("provider_attestation", {}).get("available") is not False:
                defects.append(f"{key}:provider-disclosure")
            if {audit_relative, receipt_relative} - owned:
                defects.append(f"{key}:owned-outputs")
            declared = receipt.get("output_hashes", {}).get(audit_path.name)
            if declared is not None and declared != file_hash(audit_path):
                defects.append(f"{key}:audit-hash")
        self.assertEqual(defects, [], f"browser receipt defects: {defects}")

    def test_browser_actuals_are_bounded_and_make_no_product_claim(self) -> None:
        """Fails when browser accounting is malformed or a bounded audit claims product success."""
        defects: list[str] = []
        for key, config in BROWSER_CONFIG.items():
            audit = load_json(TRACK_DIR / config["audit"])
            receipt = load_json(TRACK_DIR / config["receipt"])
            actual = receipt.get("actual_usage", {})
            for field in (
                "browser_interactions",
                "captured_browser_artifacts",
                "source_claims_authored",
                "maps_authored",
                "games_audited",
            ):
                if not isinstance(actual.get(field), int) or actual[field] < 0:
                    defects.append(f"{key}:{field}")
            if actual.get("games_audited") != 1:
                defects.append(f"{key}:games-audited")
            for claim in (
                "completion_success_claimed",
                "persistence_claimed",
                "xp_awarded_claimed",
                "api_correctness_claimed",
            ):
                if audit.get(claim) is True:
                    defects.append(f"{key}:{claim}")
            resource = audit.get("resource_use")
            if isinstance(resource, dict) and resource.get("ceiling_breaches") != 0:
                defects.append(f"{key}:ceiling-breach")
        self.assertEqual(defects, [], f"browser accounting defects: {defects}")


class BatchAV3TruthReceiptContract(unittest.TestCase):
    """Exact V3 truth-role receipt gate."""

    def test_v3_truth_receipt_binds_direct_inputs_output_and_non_acceptance(self) -> None:
        """Fails when the V3 receipt widens role scope or loses exact bindings."""
        receipt = load_json(TRUTH_RECEIPT)
        provider = receipt.get("provider_provenance", {})
        test_relative = repo_relative(Path(__file__))
        defects: list[str] = []
        if receipt.get("role") != "truth-test-author" or receipt.get("acceptance") != "not-claimed":
            defects.append("role-or-acceptance")
        if receipt.get("role_base_sha") != ROLE_BASE_SHA:
            defects.append("role-base")
        if receipt.get("input_hashes") != DIRECT_INPUT_HASHES:
            defects.append("direct-inputs")
        if receipt.get("output_hashes", {}).get(test_relative) != file_hash(Path(__file__)):
            defects.append("test-output-hash")
        if any(value is not None for key, value in provider.items() if key != "unavailable_note"):
            defects.append("provider-provenance-claimed")
        actual = receipt.get("actual_usage", {})
        for key, ceiling in (("test_cases", 24), ("fixture_executions", 24), ("test_runs_this_revision", 2)):
            value = actual.get(key)
            if not isinstance(value, int) or not 0 < value <= ceiling:
                defects.append(f"{key}={value!r}")
        self.assertEqual(defects, [])


class BatchAV3IndependentReviewContract(unittest.TestCase):
    """Fresh exact-input V3 adversarial-review gate."""

    def test_fresh_independent_review_binds_every_active_v3_input(self) -> None:
        """Fails until a fresh review and receipt bind exact V3 bytes with no blockers."""
        defects: list[str] = []
        if not REVIEW_PATH.is_file():
            defects.append("missing-review")
        if not REVIEW_RECEIPT_PATH.is_file():
            defects.append("missing-review-receipt")
        if not defects:
            review = load_json(REVIEW_PATH)
            receipt = load_json(REVIEW_RECEIPT_PATH)
            required = dict(DIRECT_INPUT_HASHES)
            required[repo_relative(Path(__file__))] = file_hash(Path(__file__))
            required[repo_relative(TRUTH_RECEIPT)] = file_hash(TRUTH_RECEIPT)
            if receipt.get("input_hashes") != required:
                defects.append("review-input-binding")
            unresolved = review.get("unresolved_findings", {})
            if any(unresolved.get(level, 0) != 0 for level in ("critical", "high", "medium")):
                defects.append("review-blockers")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[REVIEW]: " + ", ".join(defects))


class BatchAV3LifecycleContract(unittest.TestCase):
    """Candidate, authentic approval, and accepted-manifest ordering gates."""

    def test_candidate_manifest_exists_and_binds_review_and_truth(self) -> None:
        """Fails until a non-consumable V3 candidate binds exact truth and review bytes."""
        self.assertTrue(CANDIDATE_PATH.is_file(), "EXPECTED_STAGE_RED[CANDIDATE]: missing V3 candidate")
        candidate = load_json(CANDIDATE_PATH)
        self.assertFalse(candidate.get("consumable"))
        self.assertEqual(candidate.get("truth_test_sha256"), file_hash(Path(__file__)))
        self.assertEqual(candidate.get("truth_receipt_sha256"), file_hash(TRUTH_RECEIPT))
        self.assertEqual(candidate.get("review_sha256"), file_hash(REVIEW_PATH))
        self.assertEqual(candidate.get("review_receipt_sha256"), file_hash(REVIEW_RECEIPT_PATH))

    def test_product_owner_approval_exists_and_is_exactly_bound(self) -> None:
        """Fails until an authentic owner event binds the exact V3 candidate and review."""
        self.assertTrue(APPROVAL_PATH.is_file(), "EXPECTED_STAGE_RED[APPROVAL]: missing V3 owner approval")
        approval = load_json(APPROVAL_PATH)
        self.assertEqual(approval.get("role"), "product-owner")
        self.assertEqual(approval.get("candidate_sha256"), file_hash(CANDIDATE_PATH))
        self.assertEqual(approval.get("review_sha256"), file_hash(REVIEW_PATH))

    def test_accepted_manifest_exists_and_is_exactly_bound(self) -> None:
        """Fails until a separate consumable manifest binds exact V3 approval and candidate."""
        self.assertTrue(ACCEPTED_PATH.is_file(), "EXPECTED_STAGE_RED[ACCEPTED]: missing V3 accepted manifest")
        accepted = load_json(ACCEPTED_PATH)
        self.assertTrue(accepted.get("consumable"))
        self.assertEqual(accepted.get("candidate_sha256"), file_hash(CANDIDATE_PATH))
        self.assertEqual(accepted.get("product_owner_approval_sha256"), file_hash(APPROVAL_PATH))


if __name__ == "__main__":
    unittest.main()
