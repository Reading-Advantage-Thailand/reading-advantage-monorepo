"""Contracts for the T4 current owner policy amendment."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]
POLICY_PATH = TRACK_DIR / "owner-policy-amendment-v19.json"


def load_policy() -> dict[str, object]:
    """Loads the current T4 owner policy amendment.

    @returns The parsed policy object.
    """
    return json.loads(POLICY_PATH.read_text())


def test_instruction_is_exact_and_delegates_final_authority() -> None:
    """Requires exact current authority without fabricating provider identifiers."""
    policy = load_policy()
    authority = policy["authority_record"]
    instruction = authority["exact_instruction"]
    assert hashlib.sha256(instruction.encode()).hexdigest() == authority["instruction_sha256"]
    assert authority["instruction_sha256"] == "fedd762bdf0357f43fe8701aadfc10d9dbcb7204eb666327bb86842b185fe082"
    assert authority["original_message_id"] is None
    assert authority["original_thread_id"] is None
    assert authority["final_acceptance_authority_delegated"] is True


def test_required_commits_are_exact_and_ordered() -> None:
    """Requires the owner-named V18 policy and blocker commits in ancestor order."""
    chronology = load_policy()["required_t4_chronology"]
    policy_commit = chronology["policy_commit"]
    blocker_commit = chronology["blocked_gate_commit"]
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", policy_commit, blocker_commit],
        cwd=REPO_ROOT,
        check=True,
    )
    assert policy_commit.startswith("970dad3d")
    assert blocker_commit.startswith("0c0ce71b")
    assert chronology["ordered"] is True


def test_git_substitution_cannot_replace_evidence_or_review() -> None:
    """Limits retroactive authentication to lifecycle and preflight provenance."""
    substitution = load_policy()["retroactive_authentication_policy"]
    forbidden = set(substitution["never_substitutable"])
    assert {"source evidence", "truth and source-evidence tests", "fresh independent review"} <= forbidden
    assert substitution["scope"] == "T4 lifecycle and preflight provenance only"
    assert substitution["historical_artifacts_mutable"] is False


def test_marker_guard_is_scoped_to_t4() -> None:
    """Runs the marker guard against T4 without touching unrelated plans."""
    marker_policy = load_policy()["marker_guard_policy"]
    assert marker_policy["unrelated_track_modification_authorized"] is False
    assert marker_policy["global_default_behavior_preserved"] is True
    subprocess.run(
        [
            "bash",
            "tests/orchestrator_marker_vocabulary.sh",
            "--track",
            "apk_corpus_audit_action_defense_20260712",
        ],
        cwd=REPO_ROOT,
        check=True,
    )
