"""Fails closed when historical APK disposition evidence gains unsupported authority."""

from __future__ import annotations

import copy
import hashlib
import json
import re
import unittest
from pathlib import Path, PurePosixPath
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "apk_historical_identity_disposition_20260727"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK_ID
SOURCE_LOCK_PATH = TRACK_DIR / "source-lock-v1.json"
SHA256 = re.compile(r"^[0-9a-f]{64}$")
RAW_CATALOG_PATH = "apps/advantage-games/src/lib/gameCards.ts"
PREDECESSOR_RECEIPT = {
    "path": "measure/archive/apk_denominator_readiness_t11_integrity_20260727/accepted-readiness-receipt-v1.json",
    "sha256": "d371fc5df05922d5f1bbb50b837c0fd5314d8f136e2c699510c84186447f1720",
}
CROSSWALK = {
    "path": "measure/tracks/apk_denominator_readiness_t11_integrity_20260727/phase1-denominator-crosswalk.json",
    "sha256": "eb395d3d365115696fc31359406a4e9f126604ca159ea8358a0eb8931c8c5f57",
}
SOURCE_ARTIFACTS = {
    "accepted_denominator": {
        "path": "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
        "sha256": "d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729",
    },
    "accepted_partition": {
        "path": "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
        "sha256": "6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0",
    },
    "identity_ledger": {
        "path": "measure/archive/apk_source_denominator_inventory_20260712/game-identity-ledger.json",
        "sha256": "a31c99650bf1abd6623e64b2e9a23c4c481ce970036b52cfbe08c74b1c09c407",
    },
    "source_denominator": {
        "path": "measure/archive/apk_source_denominator_inventory_20260712/source-denominator.json",
        "sha256": "0dbf97dac93ba2056228e79433fb91e6f2ef1898b6f09eff62fe0755082ba21d",
    },
    "historical_source_denominator": {
        "path": "measure/archive/apk_source_denominator_inventory_20260712/historical-source-denominator.json",
        "sha256": "6e313be829b414e7c85f4f20d4cb7e33283f15d743740b8784b589d0de2c7e6f",
    },
}
EXPECTED_IDENTITIES = [
    {
        "identity_id": "rpg-battle",
        "accepted_label": "RPG Battle — multi-state turn-based implementation.",
        "assignment_index": 1,
        "cohort": "Pilot",
        "classification": "source_identity",
        "source_identity_id": "vocabulary/rpg-battle",
        "source_locator": {"artifact": "identity_ledger", "json_pointer": "/identity_records/24"},
    },
    {
        "identity_id": "the-abyssal-well",
        "accepted_label": "The Abyssal Well — stale/historical evidence recovery.",
        "assignment_index": 2,
        "cohort": "Pilot",
        "classification": "historical_label",
        "source_identity_id": None,
        "source_locator": {
            "artifact": "historical_source_denominator",
            "classification": "deleted",
            "evidence_path": "apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/abyssal-well/page.tsx",
            "evidence_blob_sha256": "319603dbf1ef3ecca622255f366a5ade8b362c82754145243ccfcdc007abc938",
        },
    },
    {
        "identity_id": "devourer-slime",
        "accepted_label": "Devourer Slime",
        "assignment_index": 26,
        "cohort": "Special and historical",
        "classification": "source_identity",
        "source_identity_id": "sentence/devourer-slime",
        "source_locator": {"artifact": "identity_ledger", "json_pointer": "/identity_records/11"},
    },
    {
        "identity_id": "the-haunted-library",
        "accepted_label": "The Haunted Library",
        "assignment_index": 27,
        "cohort": "Special and historical",
        "classification": "source_identity",
        "source_identity_id": "sentence/haunted-library",
        "source_locator": {"artifact": "identity_ledger", "json_pointer": "/identity_records/13"},
    },
    {
        "identity_id": "babel-architect",
        "accepted_label": "Babel Architect",
        "assignment_index": 28,
        "cohort": "Special and historical",
        "classification": "historical_label",
        "source_identity_id": None,
        "source_locator": {
            "artifact": "historical_source_denominator",
            "classification": "deleted",
            "evidence_path": "apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/babel-architect/page.tsx",
            "evidence_blob_sha256": "f438feea924cc464ba6366949b3cd3926ee4b36a13f15c3c1b7162b1b5c76565",
        },
    },
]
EXPECTED_CLAIMS = {
    "current_runtime_claimed": False,
    "playable_claimed": False,
    "rebuild_authorized": False,
    "placeholder_authorized": False,
    "catalog_route_authorized": False,
    "host_import_authorized": False,
    "asset_adoption_authorized": False,
    "cutover_authorized": False,
    "owner_acceptance_claimed": False,
    "program_complete_claimed": False,
}
EXPECTED_BOUNDARIES = {
    "evidence_only": True,
    "no_rebuild": True,
    "no_placeholder": True,
    "no_route": True,
    "no_catalog": True,
    "no_host": True,
    "no_asset": True,
    "no_cutover": True,
}


def _load_json(path: Path) -> dict[str, Any]:
    """Loads a required JSON object.

    Args:
        path: JSON artifact to read.

    Returns:
        Parsed object.

    Raises:
        AssertionError: If the artifact is missing or not an object.
    """
    if not path.is_file():
        raise AssertionError(f"MISSING_ARTIFACT: {path.relative_to(REPO_ROOT)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"INVALID_ARTIFACT: {path.relative_to(REPO_ROOT)}")
    return value


def _archive_aware_path(repository_relative_path: str) -> Path:
    """Resolves a source artifact from active or archived Measure track storage.

    Args:
        repository_relative_path: Immutable path recorded by an upstream receipt.

    Returns:
        Existing path in either active or archived Measure storage.

    Raises:
        AssertionError: If the path is unsafe or cannot be resolved.
    """
    candidate = PurePosixPath(repository_relative_path)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise AssertionError(f"UNSAFE_SOURCE_PATH: {repository_relative_path}")
    direct = REPO_ROOT.joinpath(*candidate.parts)
    if direct.is_file():
        return direct
    expected_prefix = ("measure", "tracks")
    if candidate.parts[:2] == expected_prefix and len(candidate.parts) >= 4:
        archived = REPO_ROOT / "measure" / "archive" / candidate.parts[2]
        archived = archived.joinpath(*candidate.parts[3:])
        if archived.is_file():
            return archived
    raise AssertionError(f"MISSING_SOURCE_ARTIFACT: {repository_relative_path}")


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of an immutable artifact.

    Args:
        path: File to hash.

    Returns:
        Lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _pointer(document: object, pointer: str) -> object:
    """Resolves a restricted JSON pointer without accepting ambiguous traversal.

    Args:
        document: JSON value from which to resolve.
        pointer: Slash-prefixed object/list pointer.

    Returns:
        Value referenced by the pointer.

    Raises:
        AssertionError: If the pointer is malformed or unresolved.
    """
    if not isinstance(pointer, str) or not pointer.startswith("/"):
        raise AssertionError("SOURCE_LOCATOR_INVALID: JSON pointer is required")
    value = document
    for segment in pointer[1:].split("/"):
        if isinstance(value, dict) and segment in value:
            value = value[segment]
        elif isinstance(value, list) and segment.isdigit() and int(segment) < len(value):
            value = value[int(segment)]
        else:
            raise AssertionError("SOURCE_LOCATOR_INVALID: pointer does not resolve")
    return value


def _require_binding(value: object, expected: dict[str, str], code: str) -> Path:
    """Verifies one exact source binding and returns its archive-aware file.

    Args:
        value: Candidate path/hash binding.
        expected: Exact immutable path/hash pair.
        code: Stable failure code.

    Returns:
        Resolved source artifact path.

    Raises:
        AssertionError: If the binding drifts or is malformed.
    """
    if value != expected:
        raise AssertionError(f"{code}: source binding must remain exact")
    path = _archive_aware_path(expected["path"])
    if _sha256(path) != expected["sha256"]:
        raise AssertionError(f"{code}: source bytes drifted")
    return path


def _reject_raw_catalog_as_approval(value: object, location: str = "$") -> None:
    """Rejects raw gameCards evidence when presented as acceptance or authority.

    Args:
        value: JSON subtree to inspect.
        location: Human-readable location for failure output.

    Raises:
        AssertionError: If a raw catalog path appears in an authority field.
    """
    if isinstance(value, dict):
        for key, nested in value.items():
            normalized = key.lower().replace("-", "_")
            is_authority_field = any(
                token in normalized for token in ("approval", "acceptance", "authority", "authorization")
            )
            if is_authority_field and isinstance(nested, dict) and nested.get("path") == RAW_CATALOG_PATH:
                raise AssertionError(f"RAW_CATALOG_AS_APPROVAL: {location}.{key}")
            _reject_raw_catalog_as_approval(nested, f"{location}.{key}")
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            _reject_raw_catalog_as_approval(nested, f"{location}[{index}]")


def _validate_source_lock(lock: object) -> None:
    """Validates the evidence-only historical-identity source lock.

    Args:
        lock: Candidate source-lock document.

    Raises:
        AssertionError: If frozen evidence, classifications, or authority limits drift.
    """
    if not isinstance(lock, dict):
        raise AssertionError("INVALID_SOURCE_LOCK: source lock must be an object")
    expected_keys = {
        "schema_version",
        "source_lock_id",
        "track_id",
        "status",
        "scope",
        "predecessor_receipt",
        "foundation_crosswalk",
        "source_artifacts",
        "counts",
        "identities",
        "boundaries",
        "claims",
        "required_before_owner_acceptance",
    }
    if set(lock) != expected_keys:
        raise AssertionError("SOURCE_LOCK_SCHEMA_INVALID: unexpected source lock fields")
    if lock["schema_version"] != "apk-historical-identity-source-lock.v1":
        raise AssertionError("SOURCE_LOCK_SCHEMA_INVALID: schema version")
    if lock["source_lock_id"] != "apk_historical_identity_disposition_20260727_source_lock_v1":
        raise AssertionError("SOURCE_LOCK_SCHEMA_INVALID: source lock id")
    if lock["track_id"] != TRACK_ID:
        raise AssertionError("SOURCE_LOCK_SCHEMA_INVALID: track id")
    if lock["status"] != "evidence-locked-awaiting-independent-review":
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY_CLAIM: source lock has unsupported status")
    if lock["scope"] != "historical-identity-disposition-evidence-only":
        raise AssertionError("SOURCE_LOCK_SCHEMA_INVALID: scope")
    _reject_raw_catalog_as_approval(lock)

    receipt_path = _require_binding(
        lock["predecessor_receipt"], PREDECESSOR_RECEIPT, "PREDECESSOR_RECEIPT_DRIFT"
    )
    crosswalk_path = _require_binding(
        lock["foundation_crosswalk"], CROSSWALK, "CROSSWALK_DRIFT"
    )
    if lock["source_artifacts"] != SOURCE_ARTIFACTS:
        raise AssertionError("SOURCE_ARTIFACT_DRIFT: exact source artifact set changed")
    for name, binding in SOURCE_ARTIFACTS.items():
        _require_binding(lock["source_artifacts"][name], binding, "SOURCE_ARTIFACT_DRIFT")

    receipt = _load_json(receipt_path)
    if receipt.get("status") != "accepted":
        raise AssertionError("PREDECESSOR_RECEIPT_INVALID: receipt is not accepted")
    governance = receipt.get("crosswalk_governance")
    if not isinstance(governance, dict) or governance.get("status") != "owner-accepted":
        raise AssertionError("PREDECESSOR_RECEIPT_INVALID: crosswalk governance is not accepted")
    if governance.get("source_identity_count") != 27 or governance.get("partition_assignment_count") != 29:
        raise AssertionError("SOURCE_COUNT_MISMATCH: predecessor totals changed")
    if governance.get("historical_labels") != [
        "The Abyssal Well — stale/historical evidence recovery.",
        "Babel Architect",
    ]:
        raise AssertionError("HISTORICAL_LABEL_COUNT_INVALID: predecessor labels changed")
    authorization = receipt.get("downstream_authorization")
    if not isinstance(authorization, dict):
        raise AssertionError("PREDECESSOR_RECEIPT_INVALID: cohort authorization missing")
    cohorts = authorization.get("authorized_child_cohorts")
    if not isinstance(cohorts, dict) or cohorts.get(TRACK_ID) != [
        "RPG Battle",
        "The Abyssal Well",
        "Devourer Slime",
        "The Haunted Library",
        "Babel Architect",
    ]:
        raise AssertionError("PREDECESSOR_RECEIPT_INVALID: historical cohort differs")
    if authorization.get("historical_disposition_only") is not True:
        raise AssertionError("PREDECESSOR_RECEIPT_INVALID: scope is not disposition only")

    counts = lock["counts"]
    if not isinstance(counts, dict) or {
        key: counts.get(key)
        for key in ("source_identities", "partition_assignments", "historical_label_assignments")
    } != {
        "source_identities": 27,
        "partition_assignments": 29,
        "historical_label_assignments": 2,
    }:
        raise AssertionError("SOURCE_COUNT_MISMATCH: lock totals differ from predecessor")
    if counts.get("historical_labels") != [
        "The Abyssal Well — stale/historical evidence recovery.",
        "Babel Architect",
    ]:
        raise AssertionError("HISTORICAL_LABEL_COUNT_INVALID: lock historical labels differ")
    if lock["boundaries"] != EXPECTED_BOUNDARIES:
        raise AssertionError("BOUNDARY_DRIFT: evidence-only boundaries must remain exact")
    if lock["claims"] != EXPECTED_CLAIMS or any(lock["claims"].values()):
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY_CLAIM: unsupported claim")
    requirements = lock["required_before_owner_acceptance"]
    if requirements != [
        "independent review of one disposition per identity against this source lock",
        "explicit product-owner acceptance recorded by Task 5",
        "a separately proposed bounded child implementation track before any rebuild",
    ]:
        raise AssertionError("OWNER_ACCEPTANCE_FABRICATED: future owner requirements drifted")

    crosswalk = _load_json(crosswalk_path)
    assignments = crosswalk.get("assignments")
    if not isinstance(assignments, list) or len(assignments) != 29:
        raise AssertionError("SOURCE_COUNT_MISMATCH: accepted crosswalk assignments invalid")
    identities = lock["identities"]
    if not isinstance(identities, list) or len(identities) != len(EXPECTED_IDENTITIES):
        raise AssertionError("MISSING_OR_DUPLICATE_IDENTITY: exact five identities required")
    seen_ids = [identity.get("identity_id") for identity in identities if isinstance(identity, dict)]
    if seen_ids != [identity["identity_id"] for identity in EXPECTED_IDENTITIES] or len(seen_ids) != len(set(seen_ids)):
        raise AssertionError("MISSING_OR_DUPLICATE_IDENTITY: identity order or uniqueness drifted")
    historical_labels: list[str] = []
    for expected, identity in zip(EXPECTED_IDENTITIES, identities, strict=True):
        if not isinstance(identity, dict):
            raise AssertionError("IDENTITY_SCHEMA_INVALID: identity must be an object")
        if set(identity) != {
            "identity_id",
            "accepted_label",
            "assignment_index",
            "cohort",
            "classification",
            "source_identity_id",
            "source_locator",
            "disposition_state",
        }:
            raise AssertionError("IDENTITY_SCHEMA_INVALID: unexpected identity fields")
        for key, value in expected.items():
            if identity.get(key) != value:
                raise AssertionError("WRONG_CLASSIFICATION: identity does not match accepted crosswalk")
        if identity.get("disposition_state") != "gated-no-rebuild-authority":
            raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY_CLAIM: unsupported disposition state")
        index = identity["assignment_index"]
        if not isinstance(index, int) or not 0 <= index < len(assignments):
            raise AssertionError("SOURCE_LOCATOR_INVALID: assignment index invalid")
        assignment = assignments[index]
        if not isinstance(assignment, dict):
            raise AssertionError("SOURCE_LOCATOR_INVALID: accepted assignment invalid")
        for key in ("canonical_identity_label", "cohort", "classification", "source_identity_id", "source_locator"):
            if assignment.get(key) != identity.get(
                {"canonical_identity_label": "accepted_label"}.get(key, key)
            ):
                raise AssertionError("WRONG_CLASSIFICATION: identity diverges from crosswalk")
        if identity["classification"] == "historical_label":
            historical_labels.append(identity["accepted_label"])
    if historical_labels != [
        "The Abyssal Well — stale/historical evidence recovery.",
        "Babel Architect",
    ]:
        raise AssertionError("HISTORICAL_LABEL_COUNT_INVALID: only the two accepted historical labels are allowed")


class HistoricalIdentityDispositionPhase1Tests(unittest.TestCase):
    """Ensures historical APK disposition work stays hash-bound and authority-free."""

    def _source_lock(self) -> dict[str, Any]:
        """Loads the candidate source lock.

        Returns:
            Parsed source-lock document.
        """
        return _load_json(SOURCE_LOCK_PATH)

    def _assert_rejected(self, source_lock: dict[str, Any], code: str) -> None:
        """Requires one tampered source lock to fail with the expected code.

        Args:
            source_lock: Mutated source-lock document.
            code: Expected stable rejection code.
        """
        with self.assertRaisesRegex(AssertionError, code):
            _validate_source_lock(source_lock)

    def test_source_lock_binds_the_accepted_inputs_and_exact_identities(self) -> None:
        """Accepts only the exact evidence-only lock for the five historical identities."""
        _validate_source_lock(self._source_lock())

    def test_archive_aware_crosswalk_resolution_uses_the_receipt_locator(self) -> None:
        """Resolves the active-track receipt locator after its predecessor is archived."""
        resolved = _archive_aware_path(CROSSWALK["path"])
        self.assertEqual(
            resolved.relative_to(REPO_ROOT).as_posix(),
            "measure/archive/apk_denominator_readiness_t11_integrity_20260727/phase1-denominator-crosswalk.json",
        )
        self.assertEqual(_sha256(resolved), CROSSWALK["sha256"])

    def test_receipt_and_crosswalk_hash_drift_fail_closed(self) -> None:
        """Rejects a stale predecessor receipt or foundation crosswalk digest."""
        receipt_drift = copy.deepcopy(self._source_lock())
        receipt_drift["predecessor_receipt"]["sha256"] = "0" * 64
        self._assert_rejected(receipt_drift, "PREDECESSOR_RECEIPT_DRIFT")

        crosswalk_drift = copy.deepcopy(self._source_lock())
        crosswalk_drift["foundation_crosswalk"]["sha256"] = "0" * 64
        self._assert_rejected(crosswalk_drift, "CROSSWALK_DRIFT")

    def test_wrong_classification_missing_or_duplicate_identity_and_third_label_fail_closed(self) -> None:
        """Rejects a crosswalk classification change or any identity-set cardinality drift."""
        wrong_classification = copy.deepcopy(self._source_lock())
        wrong_classification["identities"][1]["classification"] = "source_identity"
        self._assert_rejected(wrong_classification, "WRONG_CLASSIFICATION")

        missing_identity = copy.deepcopy(self._source_lock())
        missing_identity["identities"].pop()
        self._assert_rejected(missing_identity, "MISSING_OR_DUPLICATE_IDENTITY")

        duplicate_identity = copy.deepcopy(self._source_lock())
        duplicate_identity["identities"].append(copy.deepcopy(duplicate_identity["identities"][-1]))
        self._assert_rejected(duplicate_identity, "MISSING_OR_DUPLICATE_IDENTITY")

        third_historical_label = copy.deepcopy(self._source_lock())
        third_historical_label["counts"]["historical_labels"].append("Unaccepted Historical Label")
        self._assert_rejected(third_historical_label, "HISTORICAL_LABEL_COUNT_INVALID")

    def test_status_authority_claims_and_raw_catalog_approval_fail_closed(self) -> None:
        """Rejects false acceptance, rebuild authority, and raw catalog evidence presented as approval."""
        unsupported_status = copy.deepcopy(self._source_lock())
        unsupported_status["status"] = "accepted"
        self._assert_rejected(unsupported_status, "FORBIDDEN_STATUS_OR_AUTHORITY_CLAIM")

        authority_claim = copy.deepcopy(self._source_lock())
        authority_claim["claims"]["rebuild_authorized"] = True
        self._assert_rejected(authority_claim, "FORBIDDEN_STATUS_OR_AUTHORITY_CLAIM")

        fabricated_acceptance = copy.deepcopy(self._source_lock())
        fabricated_acceptance["claims"]["owner_acceptance_claimed"] = True
        self._assert_rejected(fabricated_acceptance, "FORBIDDEN_STATUS_OR_AUTHORITY_CLAIM")

        raw_catalog_approval = copy.deepcopy(self._source_lock())
        raw_catalog_approval["identities"][0]["owner_approval"] = {
            "path": RAW_CATALOG_PATH,
            "sha256": "4dbc3d6eea30313ffad502c5da00026654dd552bce1a44cee70a7e834ff60b2c",
        }
        self._assert_rejected(raw_catalog_approval, "RAW_CATALOG_AS_APPROVAL")


if __name__ == "__main__":
    unittest.main()
