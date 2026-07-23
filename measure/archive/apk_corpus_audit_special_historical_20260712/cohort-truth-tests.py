"""Truth gates for the additive T7 provenance repair and cohort lifecycle."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
TRACK = Path(__file__).resolve().parent
AUTHORITY_SHA256 = "64073f4e7efd0d91335cf833e7d4a4d9bbbd9202280bc6d8156ec111bb72a766"
BATCH_B_COMMIT = "497b2568c4ecd895751f12fa707597a1fa6c535f"

AUDIT = TRACK / "provenance-audit-20260722.json"
A_APPROVAL = TRACK / "batch-a/product-owner-acceptance-retroactive-superseding-20260722.json"
A_ACCEPTED = TRACK / "batch-a/accepted-manifest-superseding-20260722.json"
B_CANDIDATE = TRACK / "batch-b/candidate-manifest-superseding-20260722.json"
B_APPROVAL = TRACK / "batch-b/product-owner-acceptance-retroactive-20260722.json"
B_ACCEPTED = TRACK / "batch-b/accepted-manifest-20260722.json"
RECONCILIATION = TRACK / "cohort-reconciliation-20260722.json"
COHORT_CANDIDATE = TRACK / "cohort-candidate-manifest-20260722.json"
COHORT_APPROVAL = TRACK / "cohort-product-owner-acceptance-retroactive-20260722.json"
COHORT_ACCEPTED = TRACK / "cohort-accepted-manifest-20260722.json"


def load(path: Path) -> dict:
    """Load a JSON artifact from the T7 lifecycle."""
    return json.loads(path.read_text())


def digest(path: Path) -> str:
    """Return the SHA-256 digest of an artifact's exact bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git_file_digest(commit: str, relative_path: str) -> str:
    """Return the SHA-256 digest of a file at an immutable Git commit."""
    content = subprocess.run(
        ["git", "show", f"{commit}:{relative_path}"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    ).stdout
    return hashlib.sha256(content).hexdigest()


def test_historical_chronology_is_git_derived_and_defect_is_disclosed() -> None:
    """Require the additive audit to preserve the real publication order."""
    audit = load(AUDIT)
    assert audit["authority_record"]["instruction_sha256"] == AUTHORITY_SHA256
    assert audit["authority_record"]["original_message_id"] is None
    assert audit["authority_record"]["original_message_id_claimed"] is False
    commits = [entry["commit_sha"] for entry in audit["batch_a_git_chronology"]]
    assert commits == [
        "97716ad273a324c7d9a112ae701b37f7e9aa3be7",
        "a4892fbd38c98cac918fd1326dadd74669d4e2db",
        "c1e903380e2b1b6ec74133ee38ebdbd236444d80",
    ]
    assert audit["defect"]["original_approval_message_authenticated"] is False
    assert audit["defect"]["correction_mode"] == "additive-current-retroactive-ratification"


def test_batch_a_is_superseded_without_rewriting_history() -> None:
    """Require current retroactive ratification and a new accepted manifest."""
    approval = load(A_APPROVAL)
    accepted = load(A_ACCEPTED)
    assert approval["decision_type"] == "current-retroactive-ratification"
    assert approval["original_message_id"] is None
    assert approval["supersedes_acceptance_sha256"] == digest(TRACK / "batch-a/product-owner-acceptance.json")
    assert accepted["supersedes_accepted_manifest_sha256"] == digest(TRACK / "batch-a/accepted-manifest.json")
    assert accepted["owner_acceptance_sha256"] == digest(A_APPROVAL)
    assert accepted["provenance_audit_sha256"] == digest(AUDIT)


def test_batch_b_candidate_at_497b_is_exactly_superseded() -> None:
    """Require the corrected candidate to bind the immutable 497b candidate."""
    candidate = load(B_CANDIDATE)
    old_path = "measure/tracks/apk_corpus_audit_special_historical_20260712/batch-b/candidate-manifest.json"
    assert candidate["supersedes"]["candidate_commit_sha"] == BATCH_B_COMMIT
    assert candidate["supersedes"]["candidate_sha256"] == git_file_digest(BATCH_B_COMMIT, old_path)
    assert candidate["corrected_bindings"]["truth_tests_sha256"] == digest(TRACK / "batch-b/truth-tests.py")
    assert candidate["corrected_bindings"]["accepted_batch_a_sha256"] == digest(A_ACCEPTED)
    assert candidate["source_gate"]["result"] == "54 passed"


def test_batch_b_acceptance_binds_corrected_candidate() -> None:
    """Require current owner approval and accepted Batch B lifecycle bindings."""
    approval = load(B_APPROVAL)
    accepted = load(B_ACCEPTED)
    assert approval["decision_type"] == "current-retroactive-commit-ratification"
    assert approval["original_message_id"] is None
    assert approval["candidate_manifest_sha256"] == digest(B_CANDIDATE)
    assert accepted["candidate_manifest_sha256"] == digest(B_CANDIDATE)
    assert accepted["owner_acceptance_sha256"] == digest(B_APPROVAL)
    assert accepted["accepted_batch_a_sha256"] == digest(A_ACCEPTED)


def test_full_cohort_reconciliation_is_exact_and_bounded() -> None:
    """Require all five identities and source-class totals to reconcile."""
    reconciliation = load(RECONCILIATION)
    assert reconciliation["source_gate"]["result"] == "54 passed"
    assert reconciliation["scope"]["games"] == [
        "Griffin Sky-Joust",
        "Realm Carver",
        "Devourer Slime",
        "The Haunted Library",
        "Babel Architect",
    ]
    assert reconciliation["totals"] == {
        "source_enveloped_factual_claims": 67,
        "explicit_unknowns": 11,
        "negative_fixtures": 30,
        "browser_dispositions": 5,
    }
    assert reconciliation["unresolved_findings"] == {"critical": 0, "high": 0, "medium": 0}


def test_cohort_candidate_and_acceptance_are_ordered_and_exact() -> None:
    """Require the final candidate, current approval, and accepted manifest chain."""
    candidate = load(COHORT_CANDIDATE)
    approval = load(COHORT_APPROVAL)
    accepted = load(COHORT_ACCEPTED)
    assert candidate["reconciliation_sha256"] == digest(RECONCILIATION)
    assert candidate["accepted_batch_a_sha256"] == digest(A_ACCEPTED)
    assert candidate["accepted_batch_b_sha256"] == digest(B_ACCEPTED)
    assert approval["candidate_manifest_sha256"] == digest(COHORT_CANDIDATE)
    assert approval["original_message_id"] is None
    assert accepted["candidate_manifest_sha256"] == digest(COHORT_CANDIDATE)
    assert accepted["owner_acceptance_sha256"] == digest(COHORT_APPROVAL)
    assert accepted["reconciliation_sha256"] == digest(RECONCILIATION)
    assert accepted["status"] == "accepted-with-disclosure"
    assert accepted["consumable"] is True


def test_no_new_artifact_invents_an_original_message_identifier() -> None:
    """Require every owner artifact to deny unavailable original message IDs."""
    for path in (AUDIT, A_APPROVAL, B_APPROVAL, COHORT_APPROVAL):
        artifact = load(path)
        text = json.dumps(artifact)
        assert "msg_t7_" not in text
        authority = artifact.get("authority_record", artifact)
        assert authority["original_message_id"] is None
        assert authority["original_message_id_claimed"] is False
