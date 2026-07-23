"""Integrity checks for the Batch B lifecycle stop-loss.

This check deliberately preserves prior artifacts and prevents their consumption
until an authorized product owner supplies the missing ordered approval evidence.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from datetime import datetime
from pathlib import Path


TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]
STOP_LOSS_PATH = TRACK_DIR / "batch-b-lifecycle-stop-loss-v17.json"


def _load_json(path: Path) -> dict[str, object]:
    """Loads a JSON object from an evidence artifact.

    @param path The artifact path.
    @returns The parsed artifact object.
    """
    return json.loads(path.read_text())


def _sha256(path: Path) -> str:
    """Calculates the SHA-256 digest for an artifact.

    @param path The artifact path.
    @returns The lowercase hexadecimal digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _commit_timestamp(commit_sha: str) -> datetime:
    """Reads a commit timestamp from the local immutable Git history.

    @param commit_sha The commit to inspect.
    @returns The commit timestamp as an offset-aware value.
    """
    result = subprocess.run(
        ["git", "show", "-s", "--format=%cI", commit_sha],
        check=True,
        capture_output=True,
        cwd=REPO_ROOT,
        text=True,
    )
    return datetime.fromisoformat(result.stdout.strip())


class BatchBLifecycleStopLossContract(unittest.TestCase):
    """Prevents consumption of the Batch B lifecycle chain without ordered owner evidence."""

    def test_stop_loss_binds_the_exact_published_lifecycle_artifacts(self) -> None:
        """Fails when: the stop-loss does not bind the exact historical lifecycle bytes it blocks."""
        stop_loss = _load_json(STOP_LOSS_PATH)
        artifacts = stop_loss["affected_artifacts"]
        self.assertIsInstance(artifacts, dict)
        for name, artifact in artifacts.items():
            self.assertIsInstance(artifact, dict, name)
            path = REPO_ROOT / artifact["path"]
            self.assertTrue(path.is_file(), name)
            self.assertEqual(_sha256(path), artifact["sha256"], name)

    def test_missing_ordered_owner_evidence_keeps_lifecycle_fail_closed(self) -> None:
        """Fails when: Batch B lifecycle consumption is enabled without the required ordered owner approval evidence."""
        stop_loss = _load_json(STOP_LOSS_PATH)
        acceptance = _load_json(REPO_ROOT / stop_loss["affected_artifacts"]["acceptance"]["path"])
        candidate_commit = stop_loss["affected_artifacts"]["candidate"]["publication_commit_sha"]
        self.assertFalse(
            "approval_conversation_id" in acceptance or "approval_thread_id" in acceptance,
            "The historical artifact unexpectedly gained required owner-event provenance; publish a supersession instead of mutating it.",
        )
        approval_time = datetime.fromisoformat(str(acceptance["approval_event_timestamp"]).replace("Z", "+00:00"))
        self.assertLess(approval_time, _commit_timestamp(str(candidate_commit)))
        disposition = stop_loss["gate_disposition"]
        self.assertFalse(disposition["candidate_creation_authorized"])
        self.assertFalse(disposition["owner_acceptance_authorized"])
        self.assertFalse(disposition["accepted_manifest_publication_authorized"])
        self.assertFalse(disposition["consumption_authorized"])


if __name__ == "__main__":
    unittest.main()
