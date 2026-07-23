"""Validates the current T5 closeout candidate without rewriting historical gates.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \\
      measure/tracks/apk_corpus_audit_traversal_exploration_20260712/t5-closeout-gates-v1.py
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = Path(__file__).resolve().parent
CANDIDATE = TRACK_DIR / "t5-lifecycle-closeout-candidate-v1.json"
LEGACY_ACCEPTED = TRACK_DIR / "accepted-cohort-manifest-v1.json"
LEGACY_APPROVAL = TRACK_DIR / "product-owner-acceptance-cohort-v1.json"
ACTUAL_APPROVAL_PUBLICATION = "a4f4a8325f12f667cd8ad5beab4738563ddeea1a"
INCORRECT_RECORDED_PUBLICATION = "970dad3d1f1e09770b162c7a8acfbb02386f1016"
CANDIDATE_PUBLICATION = "b3d41f7b10df534f86070b24657f8acabf61a71c"


def load_json(path: Path) -> dict[str, Any]:
    """Loads one required JSON object.

    @param path The JSON file to load.
    @returns The parsed JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected JSON object")
    return value


def digest(path: Path) -> str:
    """Returns the SHA-256 digest of one file.

    @param path The file to hash.
    @returns The lowercase SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one read-only Git command in the repository root.

    @param args Git arguments after the executable name.
    @returns The completed subprocess result.
    """
    return subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, check=False)


class T5CloseoutCandidateContract(unittest.TestCase):
    """Verifies current T5 closeout facts and the remaining authority boundary."""

    def test_candidate_is_non_consumable_and_requires_one_fresh_authority_step(self) -> None:
        """Rejects a candidate that presents itself as accepted or self-authorized."""
        candidate = load_json(CANDIDATE)
        self.assertEqual(candidate["status"], "candidate-awaiting-fresh-product-owner-acceptance")
        self.assertIs(candidate["consumable"], False)
        self.assertIs(candidate["authority_required"]["required"], True)
        self.assertIn("one fresh acceptance artifact", candidate["authority_required"]["one_step"])
        self.assertIn("product-owner acceptance", candidate["authority_required"]["not_authorized_here"])

    def test_immutable_legacy_artifacts_are_exactly_preserved(self) -> None:
        """Rejects a closeout candidate that changes the historical evidence it describes."""
        candidate = load_json(CANDIDATE)
        history = candidate["immutable_history"]
        self.assertEqual(history["legacy_cohort_accepted_manifest"]["sha256"], digest(LEGACY_ACCEPTED))
        self.assertEqual(history["legacy_cohort_approval"]["sha256"], digest(LEGACY_APPROVAL))

    def test_stale_historical_test_contracts_are_disclosed_not_relabelled_green(self) -> None:
        """Rejects a candidate that hides the obsolete lifecycle assertions."""
        candidate = load_json(CANDIDATE)
        supersessions = {item["path"]: item for item in candidate["historical_test_supersessions"]}
        prefix = str(TRACK_DIR.relative_to(REPO_ROOT))
        batch_a = supersessions[f"{prefix}/batch-a-truth-tests-v6.py"]
        batch_c = supersessions[f"{prefix}/batch-c-truth-tests-v2.py"]
        self.assertEqual(batch_a["sha256"], digest(TRACK_DIR / "batch-a-truth-tests-v6.py"))
        self.assertEqual(batch_c["sha256"], digest(TRACK_DIR / "batch-c-truth-tests-v2.py"))
        self.assertIn("immutable historical red-stage evidence", batch_a["disposition"])
        self.assertIn("immutable pre-publication fail-closed evidence", batch_c["disposition"])

    def test_all_three_live_batch_manifests_are_exact_and_conditionally_consumable(self) -> None:
        """Rejects a cohort candidate with a missing, changed, revoked, or non-consumable batch."""
        candidate = load_json(CANDIDATE)
        for binding in candidate["accepted_batch_bindings"].values():
            path = REPO_ROOT / binding["path"]
            manifest = load_json(path)
            self.assertEqual(binding["sha256"], digest(path), binding["path"])
            self.assertIs(manifest.get("consumable"), True, binding["path"])
            self.assertIsNot(manifest.get("revoked"), True, binding["path"])

    def test_cohort_approval_publication_fact_is_corrected_by_successor_only(self) -> None:
        """Rejects an incorrect approval publication commit or a mutation of the old manifest."""
        candidate = load_json(CANDIDATE)
        correction = candidate["cohort_publication_binding_correction"]
        self.assertEqual(correction["legacy_recorded_approval_commit"], INCORRECT_RECORDED_PUBLICATION)
        self.assertEqual(correction["actual_approval_publication_commit"], ACTUAL_APPROVAL_PUBLICATION)
        self.assertEqual(load_json(LEGACY_ACCEPTED)["approval"]["commit"], INCORRECT_RECORDED_PUBLICATION[:8])
        relative = str(LEGACY_APPROVAL.relative_to(REPO_ROOT))
        absent = git("show", f"{INCORRECT_RECORDED_PUBLICATION}:{relative}")
        self.assertNotEqual(absent.returncode, 0)
        published = git("show", f"{ACTUAL_APPROVAL_PUBLICATION}:{relative}")
        self.assertEqual(published.returncode, 0, published.stderr.decode())
        self.assertEqual(published.stdout, LEGACY_APPROVAL.read_bytes())

    def test_candidate_precedes_actual_approval_publication_and_discloses_harness_limits(self) -> None:
        """Rejects an unordered correction or fabricated provider evidence."""
        candidate = load_json(CANDIDATE)
        self.assertEqual(candidate["cohort_publication_binding_correction"]["candidate_publication_commit"], CANDIDATE_PUBLICATION)
        self.assertEqual(git("merge-base", "--is-ancestor", CANDIDATE_PUBLICATION, ACTUAL_APPROVAL_PUBLICATION).returncode, 0)
        disclosures = " ".join(candidate["disclosures"]).lower()
        self.assertIn("unavailable", disclosures)
        self.assertIn("not recreated", disclosures)


if __name__ == "__main__":
    unittest.main()
