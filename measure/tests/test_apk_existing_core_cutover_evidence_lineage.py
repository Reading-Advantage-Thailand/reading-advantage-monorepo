"""Fail-closed lineage checks for the existing-core cutover Red fixture."""

from __future__ import annotations

import copy
import hashlib
import json
import re
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PATH = (
    REPO_ROOT
    / "packages/game-cartridges/src/existing-core-cutover.evidence.json"
)
LOCATOR_CORRECTION_PATH = (
    REPO_ROOT
    / "measure/tracks/apk_existing_core_cutover_20260727"
    / "task3-planning-authorization-locator-correction-v1.json"
)
EXPECTED_LOCATOR_CORRECTION_SHA256 = "d511895ef3ecc78c7c7813c0a07609fc9d7529411b182f288d37e0bdb9384a73"
FORBIDDEN_PATH_PARTS = (
    "apk_cross_game_asset_ontology_20260712",
    "mechanic-blueprints",
)
EXPECTED_AUTHORITIES = {
    "T3": (
        "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
        "cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b",
    ),
    "T4": (
        "measure/archive/apk_corpus_audit_action_defense_20260712/accepted-cohort-manifest-t4-v2.json",
        "824850257f5eaa2f2bb2d786ddedc5d6cbd03d7b088b00400c0d1d7a11feac80",
    ),
    "T5": (
        "measure/archive/apk_corpus_audit_traversal_exploration_20260712/t5-accepted-cohort-manifest-v1.json",
        "4052c243ca66977256a4b60116439884f3f3151fba463ef860e624ed8d050f5d",
    ),
    "T6": (
        "measure/archive/apk_corpus_audit_puzzle_crafting_20260712/successor-accepted-cohort-manifest-v2.json",
        "9666b564ba969ef7d0559fb53d8d74c684a746b10264784a9728e52b6284888b",
    ),
    "T7": (
        "measure/archive/apk_corpus_audit_special_historical_20260712/cohort-accepted-manifest-20260722.json",
        "4186dfd20fcef683a1a33664a1ffa9d4350280fbee31fe56d553fa0f5a87b2b0",
    ),
    "T10": (
        "measure/archive/apk_independent_acceptance_handoff_20260712/accepted-successor-manifest-v1.json",
        "e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49",
    ),
}
EXPECTED_TITLE_CLAIMS = {
    "dragon-flight": {
        "DF-MECH-003",
        "DF-MECH-007",
        "DF-MECH-008",
        "DF-MECH-009",
        "DF-MECH-010",
    },
    "magic-defense": {
        "MD-MECH-003",
        "MD-MECH-005",
        "MD-MECH-008",
        "MD-MECH-017",
        "MD-MECH-018",
        "MD-MECH-022",
    },
    "dungeon-liberator": {
        "DL-COLL-001",
        "DL-COLL-002",
        "DL-TRANS-001",
        "DL-TRANS-002",
    },
    "sorcerer-ziggurat": {
        "SZ-HIST-005",
        "SZ-HIST-006",
        "SZ-HIST-007",
        "SZ-HIST-009",
    },
    "astral-mage": {"AM-HIST-004", "AM-HIST-005", "AM-HIST-006"},
}
EXPECTED_TITLE_PHASES = {
    "dragon-flight": "T3",
    "magic-defense": "T4",
    "dungeon-liberator": "T5",
    "sorcerer-ziggurat": "T5",
    "astral-mage": "T6",
}
EXPECTED_TITLE_EVIDENCE = {
    "dragon-flight": (
        ("measure/archive/apk_three_game_truth_pilot_20260712/dragon-flight-claim-ledger.json", "84bd9335c44424142c2d9cb407a2f48d28dd400997741f1904f65cdb6ce6083e"),
        None,
    ),
    "magic-defense": (
        ("measure/archive/apk_corpus_audit_action_defense_20260712/magic-defense-claim-ledger-v2.json", "10d974bd3e620a4aaacde171a80e5f82945f58fdbd38db57b996805b62b71e45"),
        None,
    ),
    "dungeon-liberator": (
        ("measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/dungeon-liberator/claim-evidence-ledger-v3.json", "f8112af605465ffcf461669e5560037261943df98185bfeb8728a6496997e2a2"),
        ("measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/dungeon-liberator/claim-evidence-ledger-v2.json", "ff97238f94caa82a5359143c0a25d2a5ee8a2e479bb2fdd0bfea9aab05eef2bd"),
    ),
    "sorcerer-ziggurat": (
        ("measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/claim-evidence-ledger-v2.json", "b99ba08b3db22ffd352ac6ea9fa0ad99d2c30595b7e90e7b389611e7a18e2c4a"),
        ("measure/archive/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/sorcerer-ziggurat/claim-evidence-ledger.json", "54bd65f6f655730125c933c15ba79e992479b905869856c9796b508bcffceeca"),
    ),
    "astral-mage": (
        ("measure/archive/apk_corpus_audit_puzzle_crafting_20260712/batch-b/astral-mage/claim-evidence-ledger-v2.json", "da7122e80d300c6ff3eab073c2e9151a67c81b707fa470fe64f101a5bbb4eb7e"),
        None,
    ),
}
EXPECTED_BOUND_CANDIDATES = {
    "measure/archive/apk_corpus_audit_action_defense_20260712/candidate-cohort-manifest-batch-a.json",
    "measure/archive/apk_corpus_audit_traversal_exploration_20260712/candidate-cohort-manifest-batch-a-v6.json",
    "measure/archive/apk_corpus_audit_traversal_exploration_20260712/candidate-cohort-manifest-batch-c-v2.json",
    "measure/archive/apk_corpus_audit_puzzle_crafting_20260712/candidate-cohort-manifest-batch-b-v3.json",
}
CLAIM_LOCATOR = re.compile(
    r"^(?:\$|\$\.claims)\[\?claim_id='(?P<claim_id>[^']+)'\]$"
)


def _load_json(path: Path) -> Any:
    """Loads one JSON artifact.

    Args:
        path: Artifact path to parse.

    Returns:
        The parsed JSON value.
    """
    return json.loads(path.read_text(encoding="utf-8"))


def _sha256(path: Path) -> str:
    """Calculates the SHA-256 digest of an artifact.

    Args:
        path: Artifact path to hash.

    Returns:
        The lowercase hexadecimal digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _assert_artifact(binding: dict[str, Any]) -> Any:
    """Validates a path/hash binding and loads its artifact.

    Args:
        binding: Binding with exact repository-relative path and SHA-256.

    Returns:
        The parsed artifact.
    """
    path = binding.get("path")
    digest = binding.get("sha256")
    if not isinstance(path, str) or not isinstance(digest, str):
        raise AssertionError("Every lineage binding requires path and sha256")
    if any(part in path for part in FORBIDDEN_PATH_PARTS):
        raise AssertionError(f"Quarantined or generic ontology evidence is forbidden: {path}")
    artifact_path = REPO_ROOT / path
    if not artifact_path.is_file():
        correction = _load_json(LOCATOR_CORRECTION_PATH)
        if _sha256(LOCATOR_CORRECTION_PATH) != EXPECTED_LOCATOR_CORRECTION_SHA256:
            raise AssertionError("Planning-authorization locator correction drift")
        if correction.get("status") != "verified-additive-locator-correction":
            raise AssertionError("Planning-authorization locator correction is not verified")
        expected_fixture_binding = {
            "path": "packages/game-cartridges/src/existing-core-cutover.evidence.json",
            "sha256": _sha256(FIXTURE_PATH),
        }
        if correction.get("bound_fixture") != expected_fixture_binding:
            raise AssertionError("Locator correction does not bind the current evidence fixture")
        rebind = correction.get("locator_rebind", {})
        if rebind.get("original_binding") != {"path": path, "sha256": digest}:
            raise AssertionError(f"Bound artifact does not exist: {path}")
        resolved = rebind.get("resolved_binding", {})
        if resolved.get("sha256") != digest:
            raise AssertionError("Locator correction changes accepted receipt bytes")
        governance = correction.get("governance", {})
        required_false = (
            "bound_fixture_rewritten",
            "accepted_receipt_rewritten",
            "accepted_receipt_bytes_changed",
            "owner_acceptance_claimed_by_this_correction",
            "downstream_authorization_expanded",
            "task5_acceptance_authorized",
            "retirement_or_cutover_authorized",
        )
        if any(governance.get(field) is not False for field in required_false):
            raise AssertionError("Locator correction expands or rewrites accepted authority")
        resolved_path = resolved.get("path")
        if not isinstance(resolved_path, str):
            raise AssertionError("Locator correction is missing the resolved path")
        artifact_path = REPO_ROOT / resolved_path
        if not artifact_path.is_file():
            raise AssertionError(f"Resolved artifact does not exist: {resolved_path}")
    actual_digest = _sha256(artifact_path)
    if actual_digest != digest:
        raise AssertionError(f"Stale hash for {path}: {digest} != {actual_digest}")
    return _load_json(artifact_path)


def _assert_no_generic_invariants(value: Any) -> None:
    """Rejects generic mechanic-invariant fields anywhere in the fixture.

    Args:
        value: Fixture value or nested child to inspect.
    """
    if isinstance(value, dict):
        forbidden_keys = {"invariants", "genericInvariants", "generic_invariants"}
        if forbidden_keys.intersection(value):
            raise AssertionError("Generic mechanic invariants are unsupported")
        for child in value.values():
            _assert_no_generic_invariants(child)
    elif isinstance(value, list):
        for child in value:
            _assert_no_generic_invariants(child)


def _claim_records(artifact: Any, collection: str) -> list[dict[str, Any]]:
    """Resolves the fixture's bounded claim collection.

    Args:
        artifact: Parsed evidence artifact.
        collection: Root-array or claims-array selector.

    Returns:
        Claim records in the selected collection.
    """
    records = artifact if collection == "$" else artifact.get("claims")
    if not isinstance(records, list) or not all(isinstance(item, dict) for item in records):
        raise AssertionError(f"Invalid claim collection: {collection}")
    return records


def _claim_fact(record: dict[str, Any]) -> str | None:
    """Returns the exact factual text field used by a ledger schema.

    Args:
        record: One claim record.

    Returns:
        The source fact text when present.
    """
    for key in ("claim_text", "source_fact", "extracted_source_fact"):
        value = record.get(key)
        if isinstance(value, str):
            return value
    return None


def validate_lineage(fixture: dict[str, Any]) -> None:
    """Validates accepted authority, evidence, claim, and candidate lineage.

    Args:
        fixture: Existing-core evidence fixture to validate.

    Raises:
        AssertionError: When any lineage boundary is missing, stale, or unsupported.
    """
    if fixture.get("schemaVersion") != "apk-existing-core-cutover-evidence.v1":
        raise AssertionError("Unexpected evidence fixture schema")
    _assert_no_generic_invariants(fixture)

    planning = fixture.get("planningAuthorization")
    if not isinstance(planning, dict):
        raise AssertionError("Missing accepted planning authorization")
    planning_artifact = _assert_artifact(planning)
    if planning_artifact.get("status") != "accepted" or planning_artifact.get("revocation_state") != "active":
        raise AssertionError("Planning authorization is not active and accepted")

    authorities = fixture.get("authorities")
    if not isinstance(authorities, list):
        raise AssertionError("Missing accepted authority list")
    observed_authorities = {
        item.get("phase"): (item.get("path"), item.get("sha256")) for item in authorities
    }
    if observed_authorities != EXPECTED_AUTHORITIES:
        raise AssertionError("Authority list includes a missing, candidate, or superseded artifact")
    for authority in authorities:
        artifact = _assert_artifact(authority)
        if artifact.get("consumable") is not True:
            raise AssertionError(f"{authority['phase']} authority is not consumable")
        if artifact.get("revoked") is True or artifact.get("revocation_state") == "revoked":
            raise AssertionError(f"{authority['phase']} authority is revoked")
        status = str(artifact.get("status", artifact.get("decision", ""))).lower()
        if "accepted" not in status and "accept" not in status:
            raise AssertionError(f"{authority['phase']} authority is not accepted")

    overlay_binding = fixture.get("t10ClaimOverlay")
    if not isinstance(overlay_binding, dict):
        raise AssertionError("Missing T10 claim overlay")
    overlay = _assert_artifact(overlay_binding)
    blocked_refs = {
        item["claim_ref"] for item in overlay.get("blocked_claims", []) if isinstance(item, dict)
    }

    titles = fixture.get("titles")
    if not isinstance(titles, list) or len(titles) != 5:
        raise AssertionError("The fixture must contain exactly five scoped titles")
    observed_candidates: set[str] = set()
    authority_phases = set(EXPECTED_AUTHORITIES)
    for title in titles:
        public_id = title.get("publicId")
        if public_id not in EXPECTED_TITLE_CLAIMS:
            raise AssertionError(f"Unexpected title: {public_id}")
        if (
            title.get("evidencePhase") not in authority_phases
            or title.get("evidencePhase") != EXPECTED_TITLE_PHASES[public_id]
        ):
            raise AssertionError(f"Missing accepted evidence phase for {public_id}")

        evidence_binding = title.get("acceptedEvidence")
        if not isinstance(evidence_binding, dict):
            raise AssertionError(f"Missing accepted evidence for {public_id}")
        _assert_artifact(evidence_binding)
        expected_evidence, expected_claim_artifact = EXPECTED_TITLE_EVIDENCE[public_id]
        if (evidence_binding.get("path"), evidence_binding.get("sha256")) != expected_evidence:
            raise AssertionError(f"Unexpected accepted evidence artifact for {public_id}")
        claim_binding = title.get("claimArtifact", evidence_binding)
        if not isinstance(claim_binding, dict):
            raise AssertionError(f"Missing exact claim artifact for {public_id}")
        expected_claim_binding = expected_claim_artifact or expected_evidence
        if (claim_binding.get("path"), claim_binding.get("sha256")) != expected_claim_binding:
            raise AssertionError(f"Unexpected exact claim artifact for {public_id}")
        claim_artifact = _assert_artifact(claim_binding)
        records = _claim_records(claim_artifact, claim_binding.get("collection"))
        records_by_id = {record.get("claim_id"): record for record in records}

        facts = title.get("mechanicFacts")
        if not isinstance(facts, list):
            raise AssertionError(f"Missing mechanic facts for {public_id}")
        claim_ids = {fact.get("claimId") for fact in facts}
        if claim_ids != EXPECTED_TITLE_CLAIMS[public_id]:
            raise AssertionError(f"Unsupported or generic mechanic claims for {public_id}")
        for fact in facts:
            claim_id = fact["claimId"]
            locator_match = CLAIM_LOCATOR.fullmatch(str(fact.get("locator")))
            if locator_match is None or locator_match.group("claim_id") != claim_id:
                raise AssertionError(f"Invalid exact claim locator for {public_id}:{claim_id}")
            record = records_by_id.get(claim_id)
            if record is None:
                raise AssertionError(f"Claim locator does not resolve: {public_id}:{claim_id}")
            if _claim_fact(record) != fact.get("fact"):
                raise AssertionError(f"Claim text drift for {public_id}:{claim_id}")
            if f"{public_id}:{claim_id}" in blocked_refs:
                raise AssertionError(f"T10 blocks factual consumption of {public_id}:{claim_id}")
            source_class = str(record.get("source_class", record.get("evidence_class", "")))
            temporal_scope = fact.get("temporalScope")
            if temporal_scope == "historical-source-only" and "historical" not in source_class:
                raise AssertionError(f"Historical scope mismatch for {public_id}:{claim_id}")
            if temporal_scope == "current-source" and source_class != "current-source":
                raise AssertionError(f"Current scope mismatch for {public_id}:{claim_id}")

        chain = title.get("acceptanceChain")
        if not isinstance(chain, list):
            raise AssertionError(f"Missing acceptance chain for {public_id}")
        chain_artifacts = {binding.get("path"): _assert_artifact(binding) for binding in chain}
        accepted_paths = {
            item.get("path") for item in chain if item.get("kind") != "bound-candidate"
        }
        for binding in chain:
            artifact = chain_artifacts[binding.get("path")]
            if binding.get("kind") == "bound-candidate":
                path = binding["path"]
                observed_candidates.add(path)
                if artifact.get("consumable") is True:
                    raise AssertionError(f"Candidate unexpectedly consumable: {path}")
                accepted_by = binding.get("acceptedBy")
                if accepted_by not in accepted_paths:
                    raise AssertionError(f"Candidate is not bound by an accepted artifact: {path}")
                acceptor = chain_artifacts[accepted_by]
                bound_candidate_hashes = {
                    acceptor.get("candidate_manifest_sha256"),
                    acceptor.get("candidate", {}).get("sha256"),
                    acceptor.get("candidate_binding", {}).get("sha256"),
                }
                if binding.get("sha256") not in bound_candidate_hashes:
                    raise AssertionError(f"Accepted artifact does not bind candidate hash: {path}")

    if observed_candidates != EXPECTED_BOUND_CANDIDATES:
        raise AssertionError("Candidate lineage is missing or includes an unaccepted candidate")


class ExistingCoreEvidenceLineageTests(unittest.TestCase):
    """Pins the only accepted lineage and title-specific mechanic facts."""

    def setUp(self) -> None:
        """Loads a fresh fixture before each mutation test."""
        self.fixture = _load_json(FIXTURE_PATH)

    def test_exact_accepted_lineage_and_claims_pass(self) -> None:
        """Accepts the immutable T3-T7/T10 chain and exact title claim locators."""
        validate_lineage(self.fixture)

    def test_failed_ontology_path_is_rejected(self) -> None:
        """Rejects any attempt to consume the quarantined ontology track."""
        candidate = copy.deepcopy(self.fixture)
        candidate["titles"][0]["acceptedEvidence"]["path"] = (
            "measure/archive/apk_cross_game_asset_ontology_20260712/"
            "mechanic-blueprints/dragon-flight.md"
        )
        with self.assertRaisesRegex(AssertionError, "ontology evidence is forbidden"):
            validate_lineage(candidate)

    def test_unaccepted_candidate_authority_is_rejected(self) -> None:
        """Rejects a candidate artifact promoted into an authority slot."""
        candidate = copy.deepcopy(self.fixture)
        candidate["authorities"][1] = {
            "phase": "T4",
            "path": "measure/archive/apk_corpus_audit_action_defense_20260712/candidate-cohort-manifest-batch-a.json",
            "sha256": "8bd3c806a9e35a4caa9d42f3a3e67e374ee957f4285b8220e9756f56046d5ac8",
        }
        with self.assertRaisesRegex(AssertionError, "candidate, or superseded"):
            validate_lineage(candidate)

    def test_unbound_candidate_is_rejected(self) -> None:
        """Rejects a candidate whose later accepted binding is absent."""
        candidate = copy.deepcopy(self.fixture)
        del candidate["titles"][1]["acceptanceChain"][1]["acceptedBy"]
        with self.assertRaisesRegex(AssertionError, "not bound by an accepted artifact"):
            validate_lineage(candidate)

    def test_stale_hash_is_rejected(self) -> None:
        """Rejects byte drift in any accepted evidence artifact."""
        candidate = copy.deepcopy(self.fixture)
        candidate["titles"][2]["acceptedEvidence"]["sha256"] = "0" * 64
        with self.assertRaisesRegex(AssertionError, "Stale hash"):
            validate_lineage(candidate)

    def test_unsupported_generic_invariants_are_rejected(self) -> None:
        """Rejects one invented invariant tuple applied across titles."""
        candidate = copy.deepcopy(self.fixture)
        candidate["titles"][0]["invariants"] = [
            "explicit-start",
            "correct-advances-one-step",
            "incorrect-records-attempt-without-skip",
            "terminal-completes-once",
            "resize-preserves-progress-and-completion",
        ]
        with self.assertRaisesRegex(AssertionError, "Generic mechanic invariants"):
            validate_lineage(candidate)


if __name__ == "__main__":
    unittest.main()
