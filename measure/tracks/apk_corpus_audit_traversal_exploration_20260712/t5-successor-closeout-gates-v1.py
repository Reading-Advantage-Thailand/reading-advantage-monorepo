"""Validates additive T5 owner acceptance and successor cohort consumption.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \\
      measure/tracks/apk_corpus_audit_traversal_exploration_20260712/t5-successor-closeout-gates-v1.py
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
ACCEPTANCE = TRACK_DIR / "t5-product-owner-acceptance-v1.json"
SUCCESSOR = TRACK_DIR / "t5-accepted-cohort-manifest-v1.json"
CURRENT_GATE = TRACK_DIR / "t5-closeout-gates-v1.py"
CANDIDATE_COMMIT = "8a28856e9b6f1c5123ff09b1d77e862a6b2df71e"


def load_json(path: Path) -> dict[str, Any]:
    """Loads a required JSON object.

    @param path The JSON file to load.
    @returns The parsed JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected JSON object")
    return value


def digest(path: Path) -> str:
    """Returns the SHA-256 digest of a file.

    @param path The file to hash.
    @returns The lowercase SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs a read-only Git command from the repository root.

    @param args The Git arguments after the executable name.
    @returns The completed subprocess result.
    """
    return subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, check=False)


class T5SuccessorCloseoutContract(unittest.TestCase):
    """Verifies the separate owner-acceptance and successor consumption chain."""

    def test_candidate_hash_and_committed_binding_are_exact(self) -> None:
        """Rejects a candidate reference that does not resolve to its committed bytes."""
        acceptance = load_json(ACCEPTANCE)
        successor = load_json(SUCCESSOR)
        for binding in (acceptance["candidate_binding"], successor["candidate_binding"]):
            self.assertEqual(binding["path"], str(CANDIDATE.relative_to(REPO_ROOT)))
            self.assertEqual(binding["sha256"], digest(CANDIDATE))
            self.assertEqual(binding["commit_sha"], CANDIDATE_COMMIT)
        committed = git("show", f"{CANDIDATE_COMMIT}:{CANDIDATE.relative_to(REPO_ROOT)}")
        self.assertEqual(committed.returncode, 0, committed.stderr.decode())
        self.assertEqual(committed.stdout, CANDIDATE.read_bytes())

    def test_successor_hashes_bind_acceptance_batches_and_current_gate(self) -> None:
        """Rejects any drift in the files consumed by the successor manifest."""
        successor = load_json(SUCCESSOR)
        self.assertEqual(successor["acceptance_binding"]["sha256"], digest(ACCEPTANCE))
        self.assertEqual(successor["current_gate_binding"]["sha256"], digest(CURRENT_GATE))
        for binding in successor["accepted_batch_bindings"].values():
            path = REPO_ROOT / binding["path"]
            self.assertEqual(binding["sha256"], digest(path), binding["path"])

    def test_git_order_is_limited_to_real_committed_evidence(self) -> None:
        """Rejects a false publication-order claim for uncommitted successor artifacts."""
        acceptance = load_json(ACCEPTANCE)
        successor = load_json(SUCCESSOR)
        self.assertEqual(git("merge-base", "--is-ancestor", CANDIDATE_COMMIT, "HEAD").returncode, 0)
        self.assertTrue(acceptance["ordered_after_candidate"])
        publication_basis = successor["acceptance_separation"]["publication_order_basis"].lower()
        self.assertIn("no fabricated publication commit or timestamp", publication_basis)
        self.assertNotIn("publication_commit", acceptance)
        self.assertNotIn("publication_commit", successor)

    def test_candidate_acceptance_and_consumption_artifacts_are_separate(self) -> None:
        """Rejects lifecycle collapse between candidate, authority, and consumable manifest."""
        candidate = load_json(CANDIDATE)
        acceptance = load_json(ACCEPTANCE)
        successor = load_json(SUCCESSOR)
        self.assertEqual(len({CANDIDATE, ACCEPTANCE, SUCCESSOR}), 3)
        self.assertIs(candidate["consumable"], False)
        self.assertEqual(acceptance["status"], "accepted-successor-authority")
        self.assertNotIn("consumable", acceptance)
        self.assertIs(successor["consumable"], True)
        self.assertTrue(successor["acceptance_separation"]["acceptance_is_a_separate_authority_artifact"])

    def test_provider_fields_are_explicitly_unavailable_without_fabrication(self) -> None:
        """Rejects invented native-provider identifiers, timestamps, events, or prompts."""
        provider = load_json(ACCEPTANCE)["native_provider_evidence"]
        for field in ("message_id", "event_id", "prompt", "timestamp"):
            self.assertIsNone(provider[field])
            self.assertEqual(provider[f"{field}_status"], "unavailable")
        self.assertIn("no ids, timestamps", provider["disclosure"].lower())

    def test_consumability_requires_three_live_batches_and_both_gates(self) -> None:
        """Rejects an accepted successor that loses its conditional consumption controls."""
        successor = load_json(SUCCESSOR)
        self.assertEqual(successor["status"], "accepted")
        self.assertEqual(successor["decision"], "ACCEPT-WITH-DISCLOSURE")
        self.assertEqual(successor["consumability"], "conditional")
        self.assertIs(successor["revoked"], False)
        self.assertEqual(len(successor["accepted_batch_bindings"]), 3)
        for binding in successor["accepted_batch_bindings"].values():
            manifest = load_json(REPO_ROOT / binding["path"])
            self.assertIs(manifest["consumable"], True)
            self.assertIsNot(manifest.get("revoked"), True)
        self.assertEqual(successor["current_gate_binding"]["result"], "6 passed; exit 0")


if __name__ == "__main__":
    unittest.main()
