"""Fail-closed validator for planning-only APK cohort readiness candidates."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


EXPECTED_SCHEMA = "apk-planning-readiness-candidate.v1"
EXPECTED_BINDINGS = {
    "t10_accepted_manifest": ("measure/archive/apk_independent_acceptance_handoff_20260712/accepted-successor-manifest-v1.json", "e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49"),
    "t10_successor_hashes": ("measure/archive/apk_independent_acceptance_handoff_20260712/successor-hashes-v1.json", "c026c0bff62c3d6739c366fa80cb6593c455e96bffd2532a43223c829ec74005"),
    "t10_owner_acceptance": ("measure/archive/apk_independent_acceptance_handoff_20260712/product-owner-acceptance-v1.json", "165e21c9ddb5a6e0b2f61f3190d604fbb3133459b5f00331a8c66ee1e7572753"),
    "t10_independent_review": ("measure/archive/apk_independent_acceptance_handoff_20260712/t10-independent-acceptance-review-v1.json", "efca1bc8391328fc274c34ac463c362dcffcd921c96204905091b9025554688d"),
    "t11_delegated_acceptance": ("measure/archive/apk_shared_developer_kit_20260712/t11-owner-delegated-acceptance-v1.json", "d36b8ed89558ed202b0e6777efc9ec17efc54df2924a309763a148f6f810455f"),
    "t11_extension_acceptance": ("measure/archive/apk_shared_developer_kit_20260712/t11-owner-extension-acceptance-v1.json", "60fbb63f846cd19873578393684c71e742a73595cf13efd4d96949812598215d"),
    "t11_extension_authorization": ("measure/archive/apk_shared_developer_kit_20260712/t11-owner-authorized-extension-v1.json", "460f64412cbdd19d26d5ef61bd6bb65bd4a15c8a2a1aca694c352815c9e24701"),
    "t11_canonical_bindings": ("measure/archive/apk_shared_developer_kit_20260712/t11-owner-approved-canonical-bindings-v1.json", "393cbadfeaea145c87c0173c497949fca654a83e1c4a13c3e6e79e8faa417867"),
    "standard_pack_release": ("packages/advantage-play-kit/assets/standard/accepted-standard-pack-release.json", "61984e0b53c4ba85379cf6a4f0f33ee956665c4eaad4b3d681e3dccd98389844"),
}
REQUIRED_DISCLOSURES = {
    "uncommitted_acceptance_state",
    "full_advantage_games_jest",
    "reading_primary_import_smokes",
    "representative_device_performance",
    "manual_owner_qc",
}


class _ValidationFailure(Exception):
    """Carries a stable readiness rejection code."""

    def __init__(self, code: str, detail: str) -> None:
        """Initializes a rejection.

        Args:
            code: Machine-readable reason for rejection.
            detail: Human-readable explanation.
        """
        super().__init__(detail)
        self.code = code
        self.detail = detail


def _reject(code: str, detail: str) -> None:
    """Raises a stable readiness rejection.

    Args:
        code: Machine-readable reason for rejection.
        detail: Human-readable explanation.
    """
    raise _ValidationFailure(code, detail)


def _require_receipt(value: object, code: str) -> None:
    """Requires a non-empty planning evidence object.

    Args:
        value: Candidate evidence value.
        code: Rejection code when the evidence is absent or empty.
    """
    if not isinstance(value, dict) or not value:
        _reject(code, "required readiness evidence is missing")


def _load_bound_json(repo_root: Path, binding: object, key: str) -> dict[str, Any]:
    """Loads one exact hash-pinned archive binding.

    Args:
        repo_root: Repository root directory.
        binding: Candidate path and hash binding.
        key: Expected binding name.

    Returns:
        Parsed bound JSON object.
    """
    if not isinstance(binding, dict) or not isinstance(binding.get("sha256"), str):
        _reject("ARCHIVE_HASH_MISSING", f"{key} requires sha256")
    expected_path, expected_hash = EXPECTED_BINDINGS[key]
    if binding.get("path") != expected_path or binding["sha256"] != expected_hash:
        _reject("ARCHIVE_HASH_STALE", f"{key} does not bind the accepted archive bytes")
    path = repo_root / expected_path
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected_hash:
        _reject("ARCHIVE_HASH_STALE", f"{key} archive bytes do not resolve")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        _reject("ARCHIVE_HASH_STALE", f"{key} must be a JSON object")
    return value


def _validate_archives(repo_root: Path, receipt: dict[str, Any]) -> None:
    """Validates T10, T11, and standard-pack bindings and retained restrictions.

    Args:
        repo_root: Repository root directory.
        receipt: Candidate planning readiness receipt.
    """
    bindings = receipt.get("archive_bindings")
    if not isinstance(bindings, dict) or set(bindings) != set(EXPECTED_BINDINGS):
        _reject("ARCHIVE_HASH_MISSING", "receipt must bind every required archive input")
    documents = {key: _load_bound_json(repo_root, bindings[key], key) for key in EXPECTED_BINDINGS}
    t10 = documents["t10_accepted_manifest"]
    if bindings["t10_accepted_manifest"].get("revocation_state") == "revoked" or t10.get("revocation_state") != "active":
        _reject("T10_REVOKED", "T10 acceptance is revoked or no longer active")
    if t10.get("adoption_policy", {}).get("accepted_runtime_contracts") != 0 or t10.get("adoption_policy", {}).get("approved_asset_mappings") != 0:
        _reject("T10_ZERO_ADOPTION_APPROVALS_CHANGED", "T10 zero-adoption restrictions changed")
    t11 = documents["t11_extension_acceptance"]
    policy = t11.get("consumption_policy", {})
    if policy.get("legacy_asset_adoption_approved") is not False or policy.get("cartridge_cutover_authorized") is not False:
        _reject("T11_CUTOVER_RESTRICTION_CHANGED", "T11 must retain zero legacy adoption and no cartridge cutover")
    if set(t11.get("open_verifiable_gaps", {})) != REQUIRED_DISCLOSURES:
        _reject("DISCLOSURE_MISSING", "T11 open-gap set changed from the archived acceptance")
    if bindings["standard_pack_release"].get("version") != "2026.07.23":
        _reject("STANDARD_PACK_RELEASE_INVALID", "only standard-pack release 2026.07.23 is accepted")


def _validate_disclosures(receipt: dict[str, Any]) -> None:
    """Requires every T11 open gap to remain an explicit non-waived disclosure.

    Args:
        receipt: Candidate planning readiness receipt.
    """
    disclosures = receipt.get("disclosures")
    if not isinstance(disclosures, dict) or set(disclosures) != REQUIRED_DISCLOSURES:
        _reject("DISCLOSURE_MISSING", "all archived T11 open gaps must be disclosed")
    if any(not isinstance(value, dict) or value.get("status") != "open" for value in disclosures.values()):
        _reject("DISCLOSURE_WAIVED", "T11 disclosures cannot be waived")


def _validate_evidence(receipt: dict[str, Any]) -> None:
    """Requires cohort-specific adoption, output, host, and retirement evidence.

    Args:
        receipt: Candidate planning readiness receipt.
    """
    evidence = receipt.get("evidence")
    if not isinstance(evidence, dict):
        _reject("SEMANTIC_ADOPTION_MISSING", "readiness evidence is missing")
    adoption = evidence.get("per_game_semantic_adoption")
    if not isinstance(adoption, list) or not adoption or any(not isinstance(item, dict) or not item.get("game_id") or not item.get("semantic_binding_receipt") for item in adoption):
        _reject("SEMANTIC_ADOPTION_MISSING", "per-game semantic adoption proof is required")
    _require_receipt(evidence.get("selected_output"), "SELECTED_OUTPUT_MISSING")
    hosts = evidence.get("host_proofs")
    if not isinstance(hosts, dict):
        _reject("ADVANTAGE_GAMES_PROOF_MISSING", "host proofs are missing")
    for host, code in (("advantage_games", "ADVANTAGE_GAMES_PROOF_MISSING"), ("reading", "READING_PROOF_MISSING"), ("primary", "PRIMARY_PROOF_MISSING")):
        _require_receipt(hosts.get(host), code)
    retirement = evidence.get("retirement")
    if not isinstance(retirement, dict) or not retirement.get("retired_path") or not retirement.get("retired_blob_sha256"):
        _reject("RETIREMENT_EVIDENCE_MISSING", "exact retirement path and hash are required")


def validate_readiness(repo_root: Path, receipt: dict[str, Any]) -> dict[str, object]:
    """Validates a planning-only cohort readiness candidate without authorizing consumption.

    Args:
        repo_root: Repository root directory.
        receipt: Candidate readiness receipt.

    Returns:
        A stable rejection or a non-consumable crosswalk-acceptance blocker.
    """
    try:
        if receipt.get("schema_version") != EXPECTED_SCHEMA or receipt.get("planning_only") is not True or receipt.get("consumable") is not False:
            _reject("PLANNING_ONLY_REQUIRED", "readiness receipt must be planning-only and non-consumable")
        _validate_archives(repo_root, receipt)
        _validate_disclosures(receipt)
        _validate_evidence(receipt)
        if receipt.get("crosswalk_product_owner_acceptance") != "accepted":
            return {"ok": True, "ready": False, "consumable": False, "blocker": "CROSSWALK_OWNER_ACCEPTANCE_ABSENT"}
        _reject("PUBLICATION_NOT_IMPLEMENTED", "publication and authorization remain pending")
    except _ValidationFailure as failure:
        return {"ok": False, "code": failure.code, "detail": failure.detail}
