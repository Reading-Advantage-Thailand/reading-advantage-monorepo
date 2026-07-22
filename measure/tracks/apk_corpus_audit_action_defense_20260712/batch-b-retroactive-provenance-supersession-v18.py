"""Contracts for the additive Batch B provenance supersession policy."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from datetime import datetime
from pathlib import Path


TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]
POLICY_PATH = TRACK_DIR / "batch-b-retroactive-provenance-supersession-v18.json"


def _load_json(path: Path) -> dict[str, object]:
    """Loads a JSON evidence object.

    @param path The artifact path to load.
    @returns The parsed JSON object.
    """
    return json.loads(path.read_text())


def _sha256(path: Path) -> str:
    """Calculates the SHA-256 digest of an artifact.

    @param path The artifact path to hash.
    @returns The lowercase hexadecimal digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _git(*args: str) -> str:
    """Runs a read-only Git query at the repository root.

    @param args The Git arguments following the executable name.
    @returns Standard output with surrounding whitespace removed.
    """
    result = subprocess.run(
        ["git", *args],
        check=True,
        capture_output=True,
        cwd=REPO_ROOT,
        text=True,
    )
    return result.stdout.strip()


class BatchBRetroactiveProvenanceSupersessionContract(unittest.TestCase):
    """Verifies the owner-authorized historical audit remains additive and honest."""

    def test_policy_binds_exact_historical_bytes_and_git_publication_order(self) -> None:
        """Fails when: the policy rewrites history or misstates a bound artifact, commit, parent, or timestamp."""
        policy = _load_json(POLICY_PATH)
        chronology = policy["historical_chronology"]
        self.assertIsInstance(chronology, list)
        previous_commit: str | None = None
        for record in chronology:
            self.assertIsInstance(record, dict)
            commit = str(record["commit_sha"])
            path = REPO_ROOT / str(record["path"])
            self.assertEqual(_sha256(path), record["sha256"])
            self.assertEqual(_git("show", "-s", "--format=%cI", commit), record["commit_timestamp"])
            self.assertEqual(_git("show", f"{commit}:{record['path']}"), path.read_text().rstrip())
            if previous_commit is not None:
                self.assertEqual(_git("merge-base", "--is-ancestor", previous_commit, commit), "")
            previous_commit = commit

    def test_policy_does_not_invent_original_conversation_provenance(self) -> None:
        """Fails when: missing original provider identifiers are presented as known or authenticated."""
        policy = _load_json(POLICY_PATH)
        limits = policy["provenance_limits"]
        self.assertIsNone(limits["historical_approval_conversation_id"])
        self.assertIsNone(limits["historical_approval_thread_id"])
        self.assertIsNone(limits["historical_provider_event_id"])
        self.assertFalse(limits["historical_provider_identity_authenticated"])
        self.assertFalse(limits["nominal_historical_approval_timestamp_is_chronology_proof"])
        self.assertEqual(policy["historical_disposition"]["consumable"], False)

    def test_current_owner_delegation_is_exact_and_prospective(self) -> None:
        """Fails when: the superseding delegation text drifts or is misrepresented as a historical event ID."""
        policy = _load_json(POLICY_PATH)
        delegation = policy["superseding_owner_delegation"]
        text = delegation["exact_message"]
        self.assertEqual(hashlib.sha256(text.encode()).hexdigest(), delegation["message_sha256"])
        self.assertEqual(
            delegation["message_sha256"],
            "d6b30ac772684fdca289bf8eb100cadd5dbb0a05ace7f74f2847c2ec94d53a5f",
        )
        self.assertIsNone(delegation["provider_conversation_id"])
        self.assertIsNone(delegation["provider_event_id"])
        self.assertEqual(delegation["decision_scope"], "prospective-additive-supersession")

    def test_historical_content_finding_matches_the_invalid_nominal_timestamp(self) -> None:
        """Fails when: the audit hides that the nominal approval time predates candidate publication."""
        policy = _load_json(POLICY_PATH)
        acceptance = _load_json(TRACK_DIR / "product-owner-acceptance-batch-b.json")
        candidate_record = next(
            record for record in policy["historical_chronology"] if record["stage"] == "candidate-publication"
        )
        nominal = datetime.fromisoformat(str(acceptance["approval_event_timestamp"]).replace("Z", "+00:00"))
        candidate_time = datetime.fromisoformat(str(candidate_record["commit_timestamp"]))
        self.assertLess(nominal, candidate_time)
        self.assertEqual(policy["historical_content_findings"]["approval_chronology"], "invalid")
        self.assertEqual(policy["historical_content_findings"]["git_publication_chronology"], "verified")


if __name__ == "__main__":
    unittest.main()
