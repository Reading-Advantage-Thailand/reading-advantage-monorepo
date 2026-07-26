"""Fail-closed verifier for T9 Phase 0 pending truth contracts."""

from __future__ import annotations

import argparse
import copy
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import sys
from typing import Any
import xml.etree.ElementTree as ElementTree


EXPECTED_SOURCE_IDS = {
    "t1-evidence-integrity-gate",
    "t2-accepted-denominator",
    "t2-accepted-partition",
    "t3-accepted-pilot",
    "t4-accepted-cohort",
    "t5-accepted-cohort",
    "t6-accepted-cohort",
    "t7-accepted-cohort",
    "standard-pack-accepted-release",
}
FAILED_MONOLITH = "apk_cross_game_asset_ontology_20260712"
PENDING_T8 = "PENDING_POST_REVIEW_USER_APPROVAL"
MAX_MEMORY_CITATION_SUFFIX_CHARS = 8192
REQUIRED_OWNER_ROLES = {
    "truth-contract-author",
    "truth-test-author",
    "phase0-adversarial-reviewer",
    "mechanics-capability-mapper",
    "mechanics-capability-reviewer",
    "responsive-mapper",
    "responsive-reviewer",
    "asset-mapper",
    "asset-reviewer",
    "gap-delivery-mapper",
    "gap-delivery-reviewer",
    "synthesis-adversarial-reviewer",
    "product-owner-acceptance-author",
}
GOVERNANCE_PROOF_PATH = (
    "role-receipts/phase0/"
    "governance-remediation-author-provider-attestation-v1.json"
)
OUTPUT_DECLARATION_PATH = (
    "role-receipts/phase0/"
    "governance-remediation-author-output-declaration-v1.json"
)
CYCLE_LEDGER_PATH = "phase0-fix-review-cycle-ledger-v1.json"
CURRENT_GOVERNANCE_RECEIPT_PATH = (
    "role-receipts/phase0/governance-remediation-author-receipt-v1.json"
)
CURRENT_RECEIPT_SCHEMA_PATH = "phase0-current-governance-receipt-schema-v2.json"
EXPECTED_GOVERNANCE_TASK_PATH = "/root/t9_phase0_governance_author"
REQUIRED_TASK_OWNERSHIP = {
    "phase2-compare-capability-claims": "mechanics-capability-mapper",
    "phase2-classify-capabilities": "mechanics-capability-mapper",
    "phase2-run-capability-truth-tests": "truth-test-author",
    "phase2-review-capabilities": "mechanics-capability-reviewer",
    "phase5-test-unknown-must-have-preservation": "truth-test-author",
    "later-artifact-specific-truth-test-author": "truth-test-author",
}


@dataclass(frozen=True)
class Finding:
    """One deterministic fail-closed verification finding."""

    code: str
    severity: str
    message: str


@dataclass(frozen=True)
class VerificationResult:
    """Complete deterministic result for one Phase 0 verification run."""

    passed: bool
    state: str
    findings: tuple[Finding, ...]
    checks: int

    def as_json(self) -> dict[str, Any]:
        """Builds a stable JSON-compatible result object.

        Returns:
            The complete verification result as JSON-compatible values.
        """
        return {
            "schema_version": "apk-t9-phase0-verification-report.v1",
            "status": "pass" if self.passed else "blocked",
            "state": self.state,
            "checks": self.checks,
            "findings": [
                {
                    "code": finding.code,
                    "severity": finding.severity,
                    "message": finding.message,
                }
                for finding in self.findings
            ],
        }


@lru_cache(maxsize=128)
def _load_json_cached(
    path_text: str,
    size: int,
    mtime_ns: int,
) -> dict[str, Any]:
    """Loads and caches one JSON object by immutable file identity."""
    del size, mtime_ns
    value = json.loads(Path(path_text).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object at {path_text}")
    return value


def load_json(path: Path) -> dict[str, Any]:
    """Loads one JSON object from an exact local path.

    Args:
        path: Local JSON file to load.

    Returns:
        The parsed top-level JSON object.

    Raises:
        OSError: The file cannot be inspected or read.
        json.JSONDecodeError: The file does not contain valid JSON.
        ValueError: The top-level JSON value is not an object.
    """
    stat = path.stat()
    return _load_json_cached(
        str(path.resolve()), stat.st_size, stat.st_mtime_ns
    )


@lru_cache(maxsize=512)
def _sha256_cached(path_text: str, size: int, mtime_ns: int) -> str:
    """Streams and caches one file digest by immutable file identity."""
    del size, mtime_ns
    digest = hashlib.sha256()
    with Path(path_text).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _sha256(path: Path) -> str:
    """Returns the lowercase SHA-256 digest for one file."""
    stat = path.stat()
    return _sha256_cached(str(path.resolve()), stat.st_size, stat.st_mtime_ns)


def _sha256_prefix(path: Path, prefix_bytes: int) -> str:
    """Returns the SHA-256 of exactly the first requested file bytes."""
    digest = hashlib.sha256()
    remaining = prefix_bytes
    with path.open("rb") as handle:
        while remaining:
            chunk = handle.read(min(1024 * 1024, remaining))
            if not chunk:
                raise ValueError("file ended before the declared prefix")
            digest.update(chunk)
            remaining -= len(chunk)
    return digest.hexdigest()


def _prefix_matches(
    path: Path,
    prefix_bytes: Any,
    prefix_sha256: Any,
) -> bool:
    """Checks an immutable file prefix while allowing append-only suffixes."""
    try:
        return (
            isinstance(prefix_bytes, int)
            and prefix_bytes > 0
            and isinstance(prefix_sha256, str)
            and path.is_file()
            and path.stat().st_size >= prefix_bytes
            and _sha256_prefix(path, prefix_bytes) == prefix_sha256
        )
    except (OSError, TypeError, ValueError):
        return False


def _parent_prefix_matches(path: Path, binding: dict[str, Any]) -> bool:
    """Checks an immutable parent prefix while allowing append-only suffixes."""
    try:
        return _prefix_matches(
            path,
            binding["prefix_bytes"],
            binding["prefix_sha256"],
        )
    except KeyError:
        return False


def _child_rollout_binding_state(path: Path, binding: dict[str, Any]) -> str:
    """Classifies a child rollout binding as exact, resumed, or mismatched."""
    try:
        bound_bytes = binding["bytes"]
        if not _prefix_matches(path, bound_bytes, binding["sha256"]):
            return "mismatch"
        return (
            "exact"
            if path.stat().st_size == bound_bytes
            else "append_only_growth"
        )
    except (KeyError, OSError, TypeError, ValueError):
        return "mismatch"


def _record_at_prefix_boundary(
    path: Path,
    prefix_bytes: int,
    record_line: int,
) -> tuple[bytes, dict[str, Any]]:
    """Returns a record only when its bound prefix ends exactly."""
    if (
        not isinstance(prefix_bytes, int)
        or prefix_bytes <= 0
        or not isinstance(record_line, int)
        or record_line <= 0
    ):
        raise ValueError(
            "rollout prefix and record line must be positive integers"
        )
    consumed_bytes = 0
    with path.open("rb") as handle:
        for line_number, raw_line in enumerate(handle, 1):
            consumed_bytes += len(raw_line)
            if consumed_bytes > prefix_bytes:
                raise ValueError("rollout prefix ends inside a record")
            if consumed_bytes == prefix_bytes:
                if line_number != record_line:
                    raise ValueError(
                        "rollout prefix ends at a different record"
                    )
                record = json.loads(raw_line)
                if not isinstance(record, dict):
                    raise ValueError("bound rollout record must be an object")
                return raw_line, record
    raise ValueError("rollout prefix does not end at the bound record")


def _json_path(value: dict[str, Any], path: str) -> Any:
    """Resolves a dot-separated field path in one JSON object."""
    current: Any = value
    for segment in path.split("."):
        if not isinstance(current, dict) or segment not in current:
            raise KeyError(path)
        current = current[segment]
    return current


def _add(
    findings: list[Finding],
    code: str,
    message: str,
    severity: str = "Critical",
) -> None:
    """Appends one finding unless its code is already present."""
    if not any(finding.code == code for finding in findings):
        findings.append(Finding(code, severity, message))


def _apply_fixture(
    registry: dict[str, Any],
    roles: dict[str, Any],
    derivation: dict[str, Any],
    budget: dict[str, Any],
    fixture: dict[str, Any],
) -> dict[str, Any]:
    """Applies one declarative negative mutation to copied inputs."""
    mutation = fixture["mutation"]
    mutation_type = mutation["type"]
    probe: dict[str, Any] = {}
    if mutation_type == "remove-source":
        registry["sources"] = [
            source
            for source in registry["sources"]
            if source["id"] != mutation["source_id"]
        ]
    elif mutation_type == "replace-source-sha256":
        for source in registry["sources"]:
            if source["id"] == mutation["source_id"]:
                source["sha256"] = mutation["sha256"]
    elif mutation_type == "replace-t8-manifest-sha256":
        registry["t8_pending"]["current_manifest"]["sha256"] = mutation[
            "sha256"
        ]
    elif mutation_type == "replace-pack-version":
        registry["standard_pack"]["version"] = mutation["version"]
    elif mutation_type == "replace-pack-catalog-digest":
        registry["standard_pack"]["catalog_digest"] = mutation["catalog_digest"]
    elif mutation_type == "replace-pack-receipt-digest":
        registry["standard_pack"]["source_receipt_digest"] = mutation[
            "source_receipt_digest"
        ]
    elif mutation_type == "add-source":
        registry["sources"].append(mutation["source"])
    elif mutation_type == "set-policy-probe":
        probe["asset_reference"] = mutation["asset_reference"]
    elif mutation_type == "assign-role-overlap":
        for role in mutation["roles"]:
            roles["assignments"].append(
                {
                    "task_id": f"fixture-{role}",
                    "phase": 4,
                    "owner_role": role,
                    "agent_ref": mutation["agent_ref"],
                    "status": "fixture",
                }
            )
    elif mutation_type == "replace-derivation-schema-version":
        derivation["schema_version"] = mutation["schema_version"]
    elif mutation_type == "remove-provider-attestation":
        roles["provider_attestation"] = {}
    elif mutation_type == "remove-role-assignment":
        roles["assignments"] = [
            assignment
            for assignment in roles["assignments"]
            if assignment["owner_role"] != mutation["owner_role"]
        ]
    elif mutation_type == "provider-counterexample":
        probe["provider_counterexample"] = mutation["case"]
    elif mutation_type == "replace-failed-fix-review-cycles":
        budget["observed_state"]["failed_fix_review_cycles"] = mutation["value"]
    else:
        raise ValueError(f"Unknown fixture mutation: {mutation_type}")
    return probe


def _verify_provider_counterexample(
    track_root: Path,
    case: str | None,
    findings: list[Finding],
) -> int:
    """Runs retained real-record counterexamples against provenance claims."""
    if case is None:
        return 0
    receipt_root = track_root / "role-receipts/phase0"
    proof_path = (
        receipt_root / "phase0-truth-author-provider-attestation-v1.json"
    )
    final_path = (
        receipt_root
        / "raw-exports/truth-test-author/child-final-response-record.jsonl"
    )
    proof = load_json(proof_path)
    final = _load_single_jsonl(final_path)["payload"]
    final_text = _message_text(final)
    if case == "historical-output-hash-mismatch":
        receipt = load_json(receipt_root / "truth-test-author-pending-v1.json")
        claimed = receipt["artifact_bindings"] | receipt["fixture_bindings"]
        if all(
            path in final_text and digest in final_text
            for path, digest in claimed.items()
        ):
            raise ValueError(
                "counterexample no longer contains an output mismatch"
            )
        _add(
            findings,
            "OUTPUT_OWNERSHIP_MISMATCH",
            "Final response omits receipt-claimed outputs.",
        )
    elif case == "substituted-unbound-author-receipt":
        if proof["task_path"] == EXPECTED_GOVERNANCE_TASK_PATH:
            raise ValueError(
                "counterexample is unexpectedly bound to current author"
            )
        _add(
            findings,
            "UNBOUND_GOVERNANCE_AUTHOR",
            "Historical receipt cannot replace the current author proof.",
        )
    elif case == "forged-ancestry-lifecycle":
        child_path = Path(proof["source_rollout_bindings"]["child"]["path"])
        child_index = _indexed_rollout(child_path)
        child_meta = child_index["session_meta"]
        forged = list(proof["ancestry_ids"])
        forged[1] = "forged-parent-session"
        actual = [
            child_meta["session_id"],
            child_meta["parent_thread_id"],
            child_meta["id"],
        ]
        turn_id = proof["end_event"]["id"]
        completion = child_index["task_completes"][turn_id]
        historical_final = child_index["finals"][turn_id]
        forged_completion_timestamp = proof["start_event"]["timestamp"]
        if (
            forged == actual
            or forged_completion_timestamp == completion["timestamp"]
            or completion["record"]["payload"]["last_agent_message"]
            != _message_text(historical_final["record"]["payload"])
        ):
            raise ValueError(
                "counterexample did not forge exact lifecycle data"
            )
        _add(
            findings,
            "FORGED_ANCESTRY_OR_LIFECYCLE",
            "Forged ancestry or completion differs from live records.",
        )
    else:
        raise ValueError(f"Unknown provider counterexample: {case}")
    return 4


def _verify_sources(
    repo_root: Path,
    registry: dict[str, Any],
    findings: list[Finding],
) -> int:
    """Verifies predecessor files, hashes, states, and exclusions."""
    checks = 0
    source_ids = {source["id"] for source in registry["sources"]}
    missing = sorted(EXPECTED_SOURCE_IDS - source_ids)
    if missing:
        _add(
            findings,
            "MISSING_PREDECESSOR",
            f"Required predecessor sources are missing: {missing}.",
        )
    unexpected = [
        source["id"]
        for source in registry["sources"]
        if source["id"] not in EXPECTED_SOURCE_IDS
        and FAILED_MONOLITH not in source["path"]
    ]
    if unexpected:
        _add(
            findings,
            "UNEXPECTED_PREDECESSOR",
            f"Unapproved predecessor sources entered the graph: "
            f"{sorted(unexpected)}.",
        )
    checks += 1
    for source in registry["sources"]:
        path_text = source["path"]
        if FAILED_MONOLITH in path_text:
            _add(
                findings,
                "FAILED_MONOLITH_INPUT",
                f"Failed monolith entered the live graph: {path_text}.",
            )
            continue
        path = repo_root / path_text
        checks += 1
        if not path.is_file():
            _add(
                findings,
                "MISSING_PREDECESSOR",
                f"Required source is missing: {path_text}.",
            )
            continue
        if _sha256(path) != source["sha256"]:
            _add(
                findings,
                "STALE_PREDECESSOR",
                f"Source hash drifted: {path_text}.",
            )
            continue
        value = load_json(path)
        for field, expected in source.get("expected_values", {}).items():
            checks += 1
            try:
                actual = _json_path(value, field)
            except KeyError:
                actual = object()
            if actual != expected:
                _add(
                    findings,
                    "STALE_PREDECESSOR",
                    f"Source state drifted at {path_text}:{field}.",
                )
    for evidence in registry["authority_evidence"]:
        path = repo_root / evidence["path"]
        checks += 1
        if not path.is_file() or _sha256(path) != evidence["sha256"]:
            _add(
                findings,
                "STALE_PREDECESSOR",
                f"Authority evidence drifted: {evidence['path']}.",
            )
    return checks


def _verify_t8(
    repo_root: Path,
    registry: dict[str, Any],
    findings: list[Finding],
) -> int:
    """Verifies current T8 bytes, then enforces its pending user-event gate."""
    checks = 0
    pending = registry["t8_pending"]
    manifest_binding = pending["current_manifest"]
    root_binding = pending["current_root_acceptance"]
    for binding in [manifest_binding, root_binding, *pending["fresh_reviews"]]:
        path = repo_root / binding["path"]
        checks += 1
        if not path.is_file() or _sha256(path) != binding["sha256"]:
            _add(
                findings,
                "WRONG_T8_ARTIFACT",
                f"T8 artifact differs from freeze: {binding['path']}.",
            )
    if findings and any(
        finding.code == "WRONG_T8_ARTIFACT" for finding in findings
    ):
        return checks
    manifest = load_json(repo_root / manifest_binding["path"])
    root = load_json(repo_root / root_binding["path"])
    checks += 4
    successor = pending["required_successor"]
    pending_is_exact = (
        pending["state"] == PENDING_T8
        and manifest.get("status") == manifest_binding["required_status"]
        and root.get("decision") == root_binding["required_decision"]
        and root.get("revocation_state")
        == root_binding["required_revocation_state"]
    )
    successor_missing = any(
        successor.get(field) is None
        for field in (
            "tool_resolved_user_event_id",
            "owner_acceptance_path",
            "owner_acceptance_sha256",
            "accepted_manifest_path",
            "accepted_manifest_sha256",
        )
    )
    if pending_is_exact and successor_missing:
        _add(
            findings,
            "T8_PENDING_POST_REVIEW_USER_APPROVAL",
            "T8 is revoked and non-consumable until a later tool-resolved "
            "user approval event and exact successor artifacts are bound.",
        )
    elif successor_missing:
        _add(
            findings,
            "WRONG_T8_ARTIFACT",
            "T8 does not satisfy either the exact pending state or a complete "
            "accepted successor chain.",
        )
    return checks


def _catalog_payload(catalog: dict[str, Any]) -> bytes:
    """Serializes the digest-independent catalog payload like JSON.stringify."""
    payload = {
        "schemaVersion": catalog["schemaVersion"],
        "version": catalog["version"],
        "sourceReceiptDigest": catalog["sourceReceiptDigest"],
        "requiredCredit": catalog["requiredCredit"],
        "assets": catalog["assets"],
    }
    serialized = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return f"{serialized}\n".encode()


@lru_cache(maxsize=4)
def _catalog_payload_digest(
    path_text: str,
    size: int,
    mtime_ns: int,
) -> str:
    """Caches the expensive canonical catalog payload serialization."""
    catalog = _load_json_cached(path_text, size, mtime_ns)
    return hashlib.sha256(_catalog_payload(catalog)).hexdigest()


@lru_cache(maxsize=8)
def _joined_digest(bindings: tuple[tuple[str, int, int], ...]) -> str:
    """Streams a newline-joined digest for a frozen ordered file set."""
    digest = hashlib.sha256()
    for index, (path_text, _size, _mtime_ns) in enumerate(bindings):
        if index:
            digest.update(b"\n")
        with Path(path_text).open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
    return digest.hexdigest()


def _verify_pack(
    repo_root: Path,
    registry: dict[str, Any],
    probe: dict[str, Any],
    findings: list[Finding],
) -> int:
    """Verifies accepted release, catalog payload, receipts, and key policy."""
    checks = 0
    pack = registry["standard_pack"]
    accepted = load_json(
        repo_root / "packages/advantage-play-kit/assets/standard/"
        "accepted-standard-pack-release.json"
    )
    catalog_path = repo_root / pack["catalog_path"]
    catalog = load_json(catalog_path)
    checks += 4
    if (
        pack["version"] != accepted["version"]
        or accepted["version"] != "2026.07.23"
    ):
        _add(
            findings,
            "WRONG_STANDARD_PACK_RELEASE",
            "Standard-pack version is not the root-accepted 2026.07.23.",
        )
    catalog_stat = catalog_path.stat()
    payload_digest = _catalog_payload_digest(
        str(catalog_path.resolve()),
        catalog_stat.st_size,
        catalog_stat.st_mtime_ns,
    )
    if (
        pack["catalog_digest"] != accepted["catalogDigest"]
        or catalog["digest"] != accepted["catalogDigest"]
        or payload_digest != accepted["catalogDigest"]
        or _sha256(catalog_path) != pack["catalog_artifact_sha256"]
    ):
        _add(
            findings,
            "WRONG_STANDARD_PACK_CATALOG",
            "Standard-pack catalog identity or payload digest differs.",
        )
    receipt_paths = [repo_root / path for path in pack["receipt_paths"]]
    receipt_bindings = tuple(
        (str(path.resolve()), path.stat().st_size, path.stat().st_mtime_ns)
        for path in receipt_paths
    )
    receipt_digest = _joined_digest(receipt_bindings)
    if (
        pack["source_receipt_digest"] != accepted["sourceReceiptDigest"]
        or catalog["sourceReceiptDigest"] != accepted["sourceReceiptDigest"]
        or receipt_digest != accepted["sourceReceiptDigest"]
    ):
        _add(
            findings,
            "WRONG_STANDARD_PACK_RECEIPT",
            "Standard-pack source receipt digest differs.",
        )
    if (
        len(catalog["assets"]) != pack["asset_count"]
        or len(catalog["assets"])
        != accepted["acceptanceEvidence"]["assetCount"]
    ):
        _add(
            findings,
            "WRONG_STANDARD_PACK_CATALOG",
            "Standard-pack catalog denominator differs.",
        )
    reference = probe.get("asset_reference")
    if reference is not None:
        keys = {asset["key"] for asset in catalog["assets"]}
        if (
            reference.startswith("/")
            or reference.startswith("apps/")
            or reference.startswith("public/")
            or "." in reference.rsplit("/", 1)[-1]
            or reference not in keys
        ):
            _add(
                findings,
                "DIRECT_LEGACY_KEY_POLICY_VIOLATION",
                "Adoption references must be exact accepted-catalog semantic "
                f"keys, not legacy paths: {reference}.",
            )
    return checks


def _load_single_jsonl(path: Path) -> dict[str, Any]:
    """Loads one exact JSON object from a one-record JSONL evidence file."""
    lines = path.read_text(encoding="utf-8").splitlines()
    if len(lines) != 1:
        raise ValueError(f"Expected one JSONL record at {path}")
    value = json.loads(lines[0])
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object at {path}")
    return value


@lru_cache(maxsize=8)
def _rollout_index(
    path_text: str,
    size: int,
    mtime_ns: int,
    prefix_bytes: int | None,
) -> dict[str, Any]:
    """Streams one rollout into the bounded provenance index needed here."""
    del size, mtime_ns
    index: dict[str, Any] = {
        "session_meta": None,
        "spawn_calls": {},
        "spawn_outputs": {},
        "task_starts": {},
        "task_completes": {},
        "agent_messages": [],
        "assistant_outputs": [],
        "finals": {},
    }
    consumed_bytes = 0
    with Path(path_text).open("rb") as handle:
        for line_number, raw_line in enumerate(handle, 1):
            consumed_bytes += len(raw_line)
            if prefix_bytes is not None and consumed_bytes > prefix_bytes:
                raise ValueError(
                    "rollout prefix does not end at a record boundary"
                )
            record = json.loads(raw_line)
            record_type = record.get("type")
            payload = record.get("payload", {})
            if record_type == "session_meta" and index["session_meta"] is None:
                index["session_meta"] = payload
            elif record_type == "event_msg":
                event_type = payload.get("type")
                if event_type in {"task_started", "task_complete"}:
                    key = (
                        "task_starts"
                        if event_type == "task_started"
                        else "task_completes"
                    )
                    index[key][payload.get("turn_id")] = {
                        "line": line_number,
                        "timestamp": record.get("timestamp"),
                        "record": record,
                        "raw_sha256": hashlib.sha256(
                            raw_line.rstrip(b"\r\n")
                        ).hexdigest(),
                    }
            elif record_type == "response_item":
                payload_type = payload.get("type")
                call_id = payload.get("call_id")
                if payload_type in {"reasoning", "function_call"} or (
                    payload_type == "message"
                    and payload.get("role") == "assistant"
                ):
                    index["assistant_outputs"].append(
                        {
                            "line": line_number,
                            "timestamp": record.get("timestamp"),
                            "record": record,
                        }
                    )
                if (
                    payload_type == "function_call"
                    and payload.get("name") == "spawn_agent"
                ):
                    index["spawn_calls"][call_id] = {
                        "line": line_number,
                        "timestamp": record.get("timestamp"),
                        "record": record,
                    }
                elif payload_type == "function_call_output" and call_id:
                    index["spawn_outputs"][call_id] = {
                        "line": line_number,
                        "end_byte": consumed_bytes,
                        "timestamp": record.get("timestamp"),
                        "record": record,
                    }
                elif payload_type == "agent_message":
                    index["agent_messages"].append(
                        {
                            "line": line_number,
                            "timestamp": record.get("timestamp"),
                            "record": record,
                        }
                    )
                elif (
                    payload_type == "message"
                    and payload.get("role") == "assistant"
                    and payload.get("phase") == "final_answer"
                ):
                    turn_id = payload.get(
                        "internal_chat_message_metadata_passthrough", {}
                    ).get("turn_id")
                    index["finals"][turn_id] = {
                        "line": line_number,
                        "timestamp": record.get("timestamp"),
                        "record": record,
                        "raw_sha256": hashlib.sha256(
                            raw_line.rstrip(b"\r\n")
                        ).hexdigest(),
                    }
            if prefix_bytes is not None and consumed_bytes == prefix_bytes:
                break
    if prefix_bytes is not None and consumed_bytes != prefix_bytes:
        raise ValueError("rollout prefix does not resolve to complete records")
    return index


def _indexed_rollout(
    path: Path,
    prefix_bytes: int | None = None,
) -> dict[str, Any]:
    """Returns a cached bounded index for one exact rollout file."""
    stat = path.stat()
    return _rollout_index(
        str(path.resolve()),
        stat.st_size,
        stat.st_mtime_ns,
        prefix_bytes,
    )


def _timestamp(value: str) -> datetime:
    """Parses one UTC ISO timestamp for chronology comparison."""
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _message_text(payload: dict[str, Any]) -> str:
    """Concatenates text-bearing content in one response payload."""
    return "".join(
        item.get("text", "")
        for item in payload.get("content", [])
        if isinstance(item, dict)
    )


def _task_complete_matches_final(
    last_agent_message: Any,
    final_text: Any,
) -> bool:
    """Allows only one bounded memory-citation suffix after lifecycle text."""
    if not isinstance(last_agent_message, str) or not isinstance(
        final_text, str
    ):
        return False
    if final_text == last_agent_message:
        return True
    if not last_agent_message or not final_text.startswith(last_agent_message):
        return False
    suffix = final_text[len(last_agent_message) :]
    if (
        len(suffix) > MAX_MEMORY_CITATION_SUFFIX_CHARS
        or not suffix.startswith("<oai-mem-citation>")
        or not suffix.endswith("</oai-mem-citation>")
    ):
        return False
    try:
        root = ElementTree.fromstring(suffix)
    except ElementTree.ParseError:
        return False
    children = list(root)
    return (
        root.tag == "oai-mem-citation"
        and not root.attrib
        and (root.text is None or not root.text.strip())
        and [child.tag for child in children]
        == ["citation_entries", "rollout_ids"]
        and all(not child.attrib and not list(child) for child in children)
        and all(
            child.tail is None or not child.tail.strip() for child in children
        )
    )


def _agent_message_headers(payload: dict[str, Any]) -> dict[str, str]:
    """Parses the provider routing headers from one inter-agent message."""
    lines = _message_text(payload).splitlines()
    expected = (
        "Message Type: ",
        "Task name: ",
        "Sender: ",
    )
    if (
        len(lines) < 4
        or any(
            not lines[index].startswith(prefix)
            for index, prefix in enumerate(expected)
        )
        or lines[3] != "Payload:"
    ):
        raise ValueError("inter-agent message headers are malformed")
    headers = {
        "message_type": lines[0][len(expected[0]) :],
        "task_name": lines[1][len(expected[1]) :],
        "sender": lines[2][len(expected[2]) :],
    }
    if not all(headers.values()):
        raise ValueError("inter-agent message headers are incomplete")
    return headers


def _encrypted_agent_payload(payload: dict[str, Any]) -> str:
    """Returns the single encrypted payload attached to an agent message."""
    encrypted = [
        item.get("encrypted_content")
        for item in payload.get("content", [])
        if isinstance(item, dict) and item.get("type") == "encrypted_content"
    ]
    if len(encrypted) != 1 or not isinstance(encrypted[0], str):
        raise ValueError("agent message must contain one encrypted payload")
    return encrypted[0]


def _governance_task_message_sequence(
    child: dict[str, Any],
    task_path: str,
    parent_task_path: str,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Binds the first spawn task and audits later same-parent followups."""
    routed: list[dict[str, Any]] = []
    for item in child["agent_messages"]:
        payload = item["record"]["payload"]
        if payload.get("recipient") != task_path:
            continue
        headers = _agent_message_headers(payload)
        if not (
            headers["message_type"] in {"NEW_TASK", "MESSAGE"}
            and headers["task_name"] == task_path
            and headers["sender"] == parent_task_path
        ):
            raise ValueError("governance task message route disagrees")
        _encrypted_agent_payload(payload)
        routed.append(item)
    initial_candidates = [
        item
        for item in routed
        if _agent_message_headers(item["record"]["payload"])["message_type"]
        == "NEW_TASK"
    ]
    if not initial_candidates:
        raise ValueError("initial governance NEW_TASK is missing")
    initial = min(initial_candidates, key=lambda item: item["line"])
    if any(item["line"] < initial["line"] for item in child["agent_messages"]):
        raise ValueError("an inter-agent task message predates the spawn task")
    if any(
        item["line"] < initial["line"] for item in child["assistant_outputs"]
    ):
        raise ValueError("assistant output predates the spawn task")
    return initial, sorted(routed, key=lambda item: item["line"])


@lru_cache(maxsize=8)
def _bounded_rollout_messages(
    path: Path,
    prefix_bytes: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Loads session metadata and messages through one exact record boundary."""
    meta: dict[str, Any] = {}
    messages: list[dict[str, Any]] = []
    consumed = 0
    with path.open("rb") as handle:
        for line_number, raw_line in enumerate(handle, 1):
            consumed += len(raw_line)
            if consumed > prefix_bytes:
                raise ValueError("rollout prefix ends inside a record")
            record = json.loads(raw_line)
            payload = record.get("payload", {})
            if record.get("type") == "session_meta":
                meta = payload
            if (
                record.get("type") == "response_item"
                and payload.get("type") == "message"
            ):
                messages.append(
                    {
                        "line": line_number,
                        "end_byte": consumed,
                        "timestamp": record.get("timestamp"),
                        "record": record,
                        "raw_sha256": hashlib.sha256(
                            raw_line.rstrip(b"\r\n")
                        ).hexdigest(),
                        "text": _message_text(payload),
                    }
                )
            if consumed == prefix_bytes:
                break
    if consumed != prefix_bytes:
        raise ValueError("rollout prefix is not a complete record boundary")
    return meta, messages


def _delegated_owner_direction_matches(
    direction: dict[str, Any],
    *,
    contract: dict[str, Any],
    proof: dict[str, Any],
    ledger: dict[str, Any],
) -> bool:
    """Checks exact delegated-owner authority and root direction.

    Args:
        direction: Bound delegation and assistant-direction event.
        contract: Exact delegated-owner text and root-session contract.
        proof: Current governance-author proof with parent binding.
        ledger: Independently verified failed-review cycle ledger.

    Returns:
        True only when the live root rollout proves delegated direction.
    """
    try:
        rollout_path = Path(direction["root_rollout_path"])
        prefix_bytes = direction["source_prefix_bytes"]
        if not (
            direction["schema_version"]
            == "apk-t9-delegated-owner-direction-event.v1"
            and contract["schema_version"]
            == "apk-t9-delegated-owner-direction-contract.v1"
            and contract["cycle_ledger_path"] == CYCLE_LEDGER_PATH
            and direction["cycle_ledger_path"] == CYCLE_LEDGER_PATH
            and direction["cycle_ledger_sha256"]
            == contract["cycle_ledger_sha256"]
            and ledger["failed_cycle_count"] == 2
            and direction["root_rollout_path"]
            == contract["root_rollout_path"]
            == proof["source_rollout_bindings"]["parent"]["path"]
            and direction["root_session_id"]
            == contract["root_session_id"]
            == proof["parent_session_id"]
        ):
            return False
        if not _prefix_matches(
            rollout_path,
            prefix_bytes,
            direction["source_prefix_sha256"],
        ):
            return False
        meta, messages = _bounded_rollout_messages(
            rollout_path,
            prefix_bytes,
        )
        by_line = {message["line"]: message for message in messages}
        delegation_binding = direction["user_delegation"]
        assistant_binding = direction["assistant_direction"]
        delegation = by_line[delegation_binding["record_line"]]
        assistant = by_line[assistant_binding["record_line"]]
        latest_review = max(
            _timestamp(cycle["final_response"]["timestamp"])
            for cycle in ledger["cycles"]
        )
        no_intervening_user = not any(
            delegation["line"] < message["line"] < assistant["line"]
            and message["record"]["payload"].get("role") == "user"
            for message in messages
        )
        delegation_turn = (
            delegation["record"]["payload"]
            .get("internal_chat_message_metadata_passthrough", {})
            .get("turn_id")
        )
        assistant_turn = (
            assistant["record"]["payload"]
            .get("internal_chat_message_metadata_passthrough", {})
            .get("turn_id")
        )
        return (
            meta.get("id") == direction["root_session_id"]
            and delegation["line"] < assistant["line"]
            and assistant["end_byte"] == prefix_bytes
            and delegation["record"]["payload"].get("role") == "user"
            and assistant["record"]["payload"].get("role") == "assistant"
            and delegation["text"] == contract["exact_user_delegation_text"]
            and assistant["text"] == contract["exact_assistant_direction_text"]
            and delegation["raw_sha256"] == delegation_binding["record_sha256"]
            and assistant["raw_sha256"] == assistant_binding["record_sha256"]
            and hashlib.sha256(delegation["text"].encode()).hexdigest()
            == delegation_binding["text_sha256"]
            and hashlib.sha256(assistant["text"].encode()).hexdigest()
            == assistant_binding["text_sha256"]
            and delegation["timestamp"] == delegation_binding["timestamp"]
            and assistant["timestamp"] == assistant_binding["timestamp"]
            and _timestamp(delegation["timestamp"]) > latest_review
            and _timestamp(assistant["timestamp"])
            > _timestamp(delegation["timestamp"])
            and delegation_turn is not None
            and delegation_turn == assistant_turn
            and no_intervening_user
        )
    except (
        IndexError,
        KeyError,
        ValueError,
        OSError,
        TypeError,
        json.JSONDecodeError,
    ):
        return False


def verify_fix_review_cycle_ledger(
    track_root: Path,
    budget: dict[str, Any],
    ledger: dict[str, Any],
) -> tuple[Finding, ...]:
    """Rederives exactly two failed cycles from completed reviewer rollouts.

    Args:
        track_root: T9 track directory containing the cycle ledger.
        budget: Stop-loss contract binding the expected ledger.
        ledger: Parsed ledger to corroborate against live rollouts.

    Returns:
        Exact findings; an empty tuple means the ledger is valid.
    """
    findings: list[Finding] = []
    binding = budget.get("fix_review_cycle_ledger", {})
    ledger_path = track_root / binding.get("path", "")
    try:
        persisted = load_json(ledger_path)
        if not (
            binding["path"] == CYCLE_LEDGER_PATH
            and binding["required_rederived_count"] == 2
            and _sha256(ledger_path) == binding["sha256"]
            and persisted == ledger
            and ledger["schema_version"]
            == "apk-t9-phase0-fix-review-cycle-ledger.v1"
            and ledger["failed_cycle_count"] == 2
            and len(ledger["cycles"]) == 2
        ):
            raise ValueError("ledger binding or shape disagrees")
        expected = [
            {
                "cycle": 1,
                "task": "/root/phase5_review_a/t9_phase0_final_reviewer",
                "findings": [
                    ("MISSING_ROLE_PROVENANCE", "High"),
                    ("INCOMPLETE_ROLE_SEPARATION", "Medium"),
                    ("MISSING_GAP_DELIVERY_ASSIGNMENT", "Medium"),
                ],
                "markers": [
                    "Required role/isolation provenance is absent",
                    "Frozen role separation",
                    "Frozen ownership omits",
                ],
                "transition": "phase0-governance-remediation",
            },
            {
                "cycle": 2,
                "task": "/root/t9_phase0_postbind_reviewer",
                "findings": [
                    ("PRODUCT_OWNER_DIRECTION_BYPASS", "High"),
                    ("UNATTESTED_FIX_REVIEW_CYCLE_LEDGER", "Medium"),
                    ("UNBOUND_CURRENT_GOVERNANCE_RECEIPT", "Medium"),
                ],
                "markers": [
                    "Product-owner stop-loss direction",
                    "two failed cycles are asserted",
                    "current governance receipt",
                ],
                "transition": "final-governance-truth-contract-remediation",
            },
        ]
        previous_final: datetime | None = None
        for cycle, requirement in zip(ledger["cycles"], expected, strict=True):
            rollout = cycle["reviewer_rollout"]
            path = Path(rollout["path"])
            if not (
                cycle["cycle"] == requirement["cycle"]
                and cycle["reviewer_task_path"] == requirement["task"]
                and path.is_file()
                and _prefix_matches(
                    path,
                    rollout["bytes"],
                    rollout["sha256"],
                )
                and [
                    (item["code"], item["severity"])
                    for item in cycle["findings"]
                ]
                == requirement["findings"]
                and cycle["remediation_transition"]["to"]
                == requirement["transition"]
                and cycle["remediation_transition"]["author_task_path"]
                == EXPECTED_GOVERNANCE_TASK_PATH
            ):
                raise ValueError(
                    "cycle identity or immutable binding disagrees"
                )
            index = _indexed_rollout(path)
            meta = index["session_meta"]
            source = (
                meta.get("source", {})
                .get("subagent", {})
                .get("thread_spawn", {})
            )
            final_binding = cycle["final_response"]
            complete_binding = cycle["task_complete"]
            final = index["finals"].get(final_binding["turn_id"])
            complete = index["task_completes"].get(complete_binding["turn_id"])
            if not final or not complete:
                raise ValueError("review final lifecycle is missing")
            final_text = _message_text(final["record"]["payload"])
            final_time = _timestamp(final["timestamp"])
            if not (
                meta["id"] == rollout["session_id"]
                and meta["parent_thread_id"] == rollout["parent_session_id"]
                and source.get("agent_path")
                == rollout["agent_path"]
                == requirement["task"]
                and final["timestamp"] == final_binding["timestamp"]
                and final["raw_sha256"] == final_binding["record_sha256"]
                and hashlib.sha256(final_text.encode()).hexdigest()
                == final_binding["text_sha256"]
                and complete["timestamp"] == complete_binding["timestamp"]
                and complete["raw_sha256"] == complete_binding["record_sha256"]
                and complete["record"]["payload"]["turn_id"]
                == final_binding["turn_id"]
                and _task_complete_matches_final(
                    complete["record"]["payload"]["last_agent_message"],
                    final_text,
                )
                and final["line"] < complete["line"]
                and final["line"]
                == max(index["finals"].values(), key=lambda item: item["line"])[
                    "line"
                ]
                and complete["line"]
                == max(
                    index["task_completes"].values(),
                    key=lambda item: item["line"],
                )["line"]
                and all(
                    marker in final_text for marker in requirement["markers"]
                )
                and (previous_final is None or final_time > previous_final)
            ):
                raise ValueError("reviewer final evidence disagrees")
            previous_final = final_time
    except (
        KeyError,
        OSError,
        TypeError,
        ValueError,
        json.JSONDecodeError,
    ):
        _add(
            findings,
            "INVALID_FIX_REVIEW_CYCLE_LEDGER",
            "Two failed reviews cannot be rederived from completed rollouts.",
        )
    if budget.get("observed_state", {}).get("failed_fix_review_cycles") != 2:
        _add(
            findings,
            "FALSE_STOP_LOSS_ACCOUNTING",
            "Failed-cycle scalar must equal the rederived count of two.",
        )
    return tuple(findings)


def verify_current_governance_receipt(
    track_root: Path,
    roles: dict[str, Any],
    receipt: dict[str, Any] | None,
    receipt_sha256: str | None,
) -> tuple[Finding, ...]:
    """Validates the cycle-safe current author receipt and role binding.

    Args:
        track_root: T9 track directory containing governance artifacts.
        roles: Current role-ownership manifest.
        receipt: Current governance receipt, or None when unpublished.
        receipt_sha256: Current receipt digest, or None when absent.

    Returns:
        Exact findings; an empty tuple means the receipt is valid.
    """
    findings: list[Finding] = []
    if receipt is None:
        _add(
            findings,
            "CURRENT_GOVERNANCE_RECEIPT_REBIND_PENDING",
            "Cycle-safe governance receipt is not published and role-bound.",
        )
        return tuple(findings)
    if receipt.get("schema_version") != (
        "apk-t9-governance-remediation-author-receipt.v2"
    ):
        code = (
            "CURRENT_GOVERNANCE_RECEIPT_REBIND_PENDING"
            if receipt.get("task_path") == EXPECTED_GOVERNANCE_TASK_PATH
            else "INVALID_CURRENT_GOVERNANCE_RECEIPT"
        )
        _add(
            findings,
            code,
            "Current receipt must use the cycle-safe v2 schema.",
        )
        return tuple(findings)
    try:
        schema = load_json(track_root / CURRENT_RECEIPT_SCHEMA_PATH)
        proof_path = track_root / GOVERNANCE_PROOF_PATH
        declaration_path = track_root / OUTPUT_DECLARATION_PATH
        declaration = load_json(declaration_path)
        role_binding = roles["provider_attestation"]["current_receipt"]
        assignments = {
            assignment["task_id"]: assignment
            for assignment in roles["assignments"]
        }
        expected_tasks = [
            {
                "task_id": "phase0-remediate-governance-truth-contracts",
                "owner_role": "truth-contract-author",
                "agent_ref": EXPECTED_GOVERNANCE_TASK_PATH,
            },
            {
                "task_id": "phase0-remediate-governance-truth-tests",
                "owner_role": "truth-test-author",
                "agent_ref": EXPECTED_GOVERNANCE_TASK_PATH,
            },
        ]
        forbidden = schema["forbidden_receipt_bindings"]
        serialized = json.dumps(receipt, sort_keys=True)
        if not (
            schema["receipt_schema_version"] == receipt["schema_version"]
            and receipt["track_id"]
            == "apk_evidence_backed_ontology_synthesis_20260712"
            and receipt["phase"] == 0
            and receipt["roles"]
            == ["truth-contract-author", "truth-test-author"]
            and receipt["task_path"] == EXPECTED_GOVERNANCE_TASK_PATH
            and receipt["status"] == "attested-current"
            and receipt["provider_attestation"]
            == {
                "path": GOVERNANCE_PROOF_PATH,
                "sha256": _sha256(proof_path),
            }
            and receipt["output_declaration"]
            == {
                "path": OUTPUT_DECLARATION_PATH,
                "sha256": _sha256(declaration_path),
            }
            and receipt["task_role_bindings"] == expected_tasks
            and all(
                assignments[item["task_id"]]["owner_role"] == item["owner_role"]
                and assignments[item["task_id"]]["agent_ref"]
                == item["agent_ref"]
                for item in expected_tasks
            )
            and receipt["owned_outputs"] == declaration["owned_outputs"]
            and all(
                _sha256(track_root / path) == digest
                for path, digest in receipt["owned_outputs"].items()
            )
            and role_binding
            == {
                "path": CURRENT_GOVERNANCE_RECEIPT_PATH,
                "sha256": receipt_sha256,
            }
            and receipt_sha256 is not None
            and not any(item in serialized for item in forbidden)
        ):
            raise ValueError("current receipt binding disagrees")
    except (KeyError, OSError, TypeError, ValueError, json.JSONDecodeError):
        _add(
            findings,
            "INVALID_CURRENT_GOVERNANCE_RECEIPT",
            "Current receipt does not exactly bind proof, roles, and outputs.",
        )
    return tuple(findings)


def verify_governance_author_proof(
    track_root: Path,
    proof: dict[str, Any],
) -> tuple[Finding, ...]:
    """Validates a current author proof against actual parent/child rollouts.

    Args:
        track_root: T9 track directory containing the output declaration.
        proof: Additive provider proof to validate without trusting its claims.

    Returns:
        Exact fail-closed provenance findings; an empty tuple means valid proof.
    """
    findings: list[Finding] = []
    try:
        if (
            proof["schema_version"]
            != "apk-t9-governance-author-provider-attestation.v1"
            or proof["status"] != "attested"
            or proof["fork_turns_none"] is not True
            or proof["task_path"] != EXPECTED_GOVERNANCE_TASK_PATH
            or proof["parent_task_path"] != "/root"
        ):
            _add(
                findings,
                "UNBOUND_GOVERNANCE_AUTHOR",
                "Provider proof is not bound to the current governance author.",
            )
            return tuple(findings)
        parent_binding = proof["source_rollout_bindings"]["parent"]
        child_binding = proof["source_rollout_bindings"]["child"]
        parent_path = Path(parent_binding["path"])
        child_path = Path(child_binding["path"])
        if not _parent_prefix_matches(parent_path, parent_binding):
            _add(
                findings,
                "SOURCE_ROLLOUT_MISMATCH",
                "Parent rollout prefix bytes or SHA-256 disagree.",
            )
            return tuple(findings)
        child_binding_state = _child_rollout_binding_state(
            child_path,
            child_binding,
        )
        if child_binding_state == "append_only_growth":
            _add(
                findings,
                "GOVERNANCE_AUTHOR_PROOF_PENDING",
                "Governance author resumed after the bound child prefix.",
            )
            return tuple(findings)
        if child_binding_state != "exact":
            _add(
                findings,
                "SOURCE_ROLLOUT_MISMATCH",
                "Completed child rollout full bytes or SHA-256 disagree.",
            )
            return tuple(findings)
        parent = _indexed_rollout(parent_path, parent_binding["prefix_bytes"])
        child = _indexed_rollout(child_path)
        parent_meta = parent["session_meta"]
        child_meta = child["session_meta"]
        expected_ancestry = [
            child_meta["session_id"],
            child_meta["parent_thread_id"],
            child_meta["id"],
        ]
        source = (
            child_meta.get("source", {})
            .get("subagent", {})
            .get("thread_spawn", {})
        )
        if not (
            parent_meta["id"]
            == proof["parent_session_id"]
            == child_meta["parent_thread_id"]
            and child_meta["id"] == proof["session_id"]
            and proof["ancestry_ids"] == expected_ancestry
            and source.get("parent_thread_id") == parent_meta["id"]
            and source.get("agent_path") == proof["task_path"]
        ):
            _add(
                findings,
                "FORGED_ANCESTRY_OR_LIFECYCLE",
                "Declared ancestry differs from the live session chain.",
            )
        spawn = parent["spawn_calls"].get(proof["spawn_id"])
        spawn_output = parent["spawn_outputs"].get(proof["spawn_id"])
        initial_task, routed_task_messages = _governance_task_message_sequence(
            child,
            proof["task_path"],
            proof["parent_task_path"],
        )
        if not spawn or not spawn_output:
            raise ValueError("spawn request/output or child task is missing")
        if spawn_output["end_byte"] != parent_binding["prefix_bytes"]:
            raise ValueError("parent prefix does not end at exact spawn output")
        arguments = json.loads(spawn["record"]["payload"]["arguments"])
        encrypted = _encrypted_agent_payload(initial_task["record"]["payload"])
        output = json.loads(spawn_output["record"]["payload"]["output"])
        if not (
            arguments["task_name"] == "t9_phase0_governance_author"
            and arguments["fork_turns"] == "none"
            and arguments["message"] == encrypted
            and hashlib.sha256(encrypted.encode()).hexdigest()
            == proof["prompt_sha256"]
            and output["task_name"] == proof["task_path"]
        ):
            _add(
                findings,
                "PROMPT_OR_SPAWN_MISMATCH",
                "Exact fork:none spawn request, prompt, or output differs.",
            )
        start = child["task_starts"].get(proof["start_event"]["id"])
        end = child["task_completes"].get(proof["end_event"]["id"])
        final = child["finals"].get(proof["end_event"]["id"])
        if not start or not end or not final:
            raise ValueError("task start/end lifecycle record is missing")
        latest_final = max(
            child["finals"].values(), key=lambda item: item["line"]
        )
        latest_end = max(
            child["task_completes"].values(),
            key=lambda item: item["line"],
        )
        final_payload = final["record"]["payload"]
        final_text = _message_text(final_payload)
        chronological = (
            _timestamp(spawn["timestamp"])
            <= _timestamp(start["timestamp"])
            <= _timestamp(initial_task["timestamp"])
            <= _timestamp(final["timestamp"])
            <= _timestamp(end["timestamp"])
            and start["line"] <= initial_task["line"]
            and routed_task_messages[-1]["line"] <= final["line"]
            and final["line"] < end["line"]
        )
        if not (
            chronological
            and final["line"] == latest_final["line"]
            and end["line"] == latest_end["line"]
            and start["timestamp"] == proof["start_event"]["timestamp"]
            and start["raw_sha256"] == proof["start_event"]["record_sha256"]
            and end["timestamp"] == proof["end_event"]["timestamp"]
            and end["raw_sha256"] == proof["end_event"]["record_sha256"]
            and end["record"]["payload"]["turn_id"] == proof["end_event"]["id"]
            and _task_complete_matches_final(
                end["record"]["payload"]["last_agent_message"],
                final_text,
            )
            and final["raw_sha256"] == proof["final_response_record_sha256"]
            and hashlib.sha256(final_text.encode()).hexdigest()
            == proof["final_response_sha256"]
        ):
            _add(
                findings,
                "FORGED_ANCESTRY_OR_LIFECYCLE",
                "Task chronology or final response binding differs.",
            )
        declaration_binding = proof["output_declaration"]
        declaration_path = track_root / declaration_binding["path"]
        declaration = load_json(declaration_path)
        ownership_ok = (
            declaration_binding["path"] == OUTPUT_DECLARATION_PATH
            and _sha256(declaration_path) == declaration_binding["sha256"]
            and declaration["author_task_path"] == proof["task_path"]
        )
        for relative_path, expected_hash in declaration[
            "owned_outputs"
        ].items():
            output_path = track_root / relative_path
            ownership_ok = ownership_ok and output_path.is_file()
            if output_path.is_file():
                ownership_ok = (
                    ownership_ok and _sha256(output_path) == expected_hash
                )
            ownership_ok = ownership_ok and relative_path in final_text
            ownership_ok = ownership_ok and expected_hash in final_text
        ownership_ok = (
            ownership_ok
            and declaration_binding["path"] in final_text
            and declaration_binding["sha256"] in final_text
        )
        if not ownership_ok:
            _add(
                findings,
                "OUTPUT_OWNERSHIP_MISMATCH",
                "Final response and declaration do not bind current outputs.",
            )
    except (
        KeyError,
        StopIteration,
        TypeError,
        ValueError,
        json.JSONDecodeError,
        OSError,
    ):
        _add(
            findings,
            "INVALID_GOVERNANCE_AUTHOR_PROOF",
            "Governance proof is incomplete or cannot resolve live records.",
        )
    return tuple(findings)


def _verify_governance_author(
    track_root: Path,
    findings: list[Finding],
) -> int:
    """Requires the additive current-author proof without fabricating it."""
    proof_path = track_root / GOVERNANCE_PROOF_PATH
    if not proof_path.is_file():
        _add(
            findings,
            "GOVERNANCE_AUTHOR_PROOF_PENDING",
            "Current remediation awaits a distinct tool-attested author proof.",
        )
        return 1
    proof = load_json(proof_path)
    for finding in verify_governance_author_proof(track_root, proof):
        _add(findings, finding.code, finding.message, finding.severity)
    return 12


def _verify_current_receipt(
    track_root: Path,
    roles: dict[str, Any],
    findings: list[Finding],
) -> int:
    """Requires the cycle-safe receipt without editing parent-owned bindings."""
    path = track_root / CURRENT_GOVERNANCE_RECEIPT_PATH
    receipt = load_json(path) if path.is_file() else None
    digest = _sha256(path) if path.is_file() else None
    for finding in verify_current_governance_receipt(
        track_root,
        roles,
        receipt,
        digest,
    ):
        _add(findings, finding.code, finding.message, finding.severity)
    return 10


def _verify_roles(
    track_root: Path,
    roles: dict[str, Any],
    findings: list[Finding],
) -> int:
    """Rejects missing ownership, incomplete separation, or role overlap."""
    checks = _verify_governance_author(track_root, findings)
    assignments = roles["assignments"]
    assigned_roles = {assignment["owner_role"] for assignment in assignments}
    missing_roles = sorted(REQUIRED_OWNER_ROLES - assigned_roles)
    checks += 1
    if missing_roles:
        _add(
            findings,
            "MISSING_ROLE_ASSIGNMENT",
            f"Required role assignments are missing: {missing_roles}.",
        )
    assignments_by_task = {
        assignment["task_id"]: assignment["owner_role"]
        for assignment in assignments
    }
    missing_tasks = sorted(
        task_id
        for task_id, role in REQUIRED_TASK_OWNERSHIP.items()
        if assignments_by_task.get(task_id) != role
    )
    checks += 1
    if missing_tasks:
        _add(
            findings,
            "MISSING_TASK_OWNERSHIP",
            "Required task-level ownership is absent: "
            + ", ".join(missing_tasks),
            "High",
        )
    root = roles["root_orchestrator"]
    forbidden = set(root["forbidden_roles"])
    pair_set = {frozenset(pair) for pair in roles["incompatible_role_pairs"]}
    checks += 1
    missing_separation = sorted(REQUIRED_OWNER_ROLES - forbidden)
    missing_orchestrator_pairs = sorted(
        role
        for role in REQUIRED_OWNER_ROLES
        if frozenset((root["role"], role)) not in pair_set
    )
    if missing_separation or missing_orchestrator_pairs:
        _add(
            findings,
            "INCOMPLETE_ROLE_SEPARATION",
            "Orchestrator separation omits an owner or reviewer role.",
        )
    by_agent: dict[str, set[str]] = {}
    by_agent.setdefault(root["agent_ref"], set()).add(root["role"])
    for assignment in assignments:
        agent = assignment.get("agent_ref")
        if agent:
            by_agent.setdefault(agent, set()).add(assignment["owner_role"])
    for left, right in roles["incompatible_role_pairs"]:
        checks += 1
        for agent, agent_roles in by_agent.items():
            if left in agent_roles and right in agent_roles:
                _add(
                    findings,
                    "ROLE_OVERLAP",
                    f"{agent} holds incompatible roles {left} and {right}.",
                )
    return checks


def _verify_contracts(
    repo_root: Path,
    track_root: Path,
    freeze: dict[str, Any],
    registry: dict[str, Any],
    derivation: dict[str, Any],
    claim_schema: dict[str, Any],
    budget: dict[str, Any],
    findings: list[Finding],
) -> int:
    """Verifies frozen contract hashes, schemas, and stop-loss state."""
    checks = 0
    registry_binding = freeze["source_registry"]
    checks += 1
    if (
        _sha256(track_root / registry_binding["path"])
        != (registry_binding["sha256"])
    ):
        _add(
            findings,
            "SCHEMA_DRIFT",
            "Source registry bytes differ from the input freeze.",
        )
    for binding in freeze["contract_bindings"]:
        checks += 1
        if _sha256(track_root / binding["path"]) != binding["sha256"]:
            if binding["path"] == "phase0-budget-stop-loss-pending-v1.json":
                _add(
                    findings,
                    "GOVERNANCE_REBIND_PENDING",
                    "Input freeze awaits the corrected stop-loss rebind.",
                )
            else:
                _add(
                    findings,
                    "SCHEMA_DRIFT",
                    f"Contract bytes drifted: {binding['path']}.",
                )
    for binding in freeze["governing_bindings"]:
        checks += 1
        if _sha256(repo_root / binding["path"]) != binding["sha256"]:
            _add(
                findings,
                "SCHEMA_DRIFT",
                f"Governing input drifted: {binding['path']}.",
            )
    checks += 5
    if (
        derivation.get("schema_version") != "apk-t9-derivation-schema.v1"
        or claim_schema.get("schema_version")
        != "apk-t9-claim-dependency-schema.v1"
        or registry.get("schema_version") != "apk-t9-phase0-source-registry.v1"
        or budget.get("state") != "STOPPED_BEFORE_SYNTHESIS"
        or budget["active_stop_loss"]["code"]
        != "T8_PENDING_POST_REVIEW_USER_APPROVAL"
    ):
        _add(
            findings,
            "SCHEMA_DRIFT",
            "Phase 0 schema or stop-loss contract differs from v1.",
        )
    ledger = load_json(track_root / CYCLE_LEDGER_PATH)
    ledger_findings = verify_fix_review_cycle_ledger(
        track_root,
        budget,
        ledger,
    )
    checks += 24
    for finding in ledger_findings:
        _add(findings, finding.code, finding.message, finding.severity)
    cycle_stop = budget.get("fix_review_cycle_stop_loss", {})
    direction = cycle_stop.get("delegated_owner_direction_event")
    if not (
        cycle_stop.get("triggered") is True
        and cycle_stop.get("phase1_authorized") is False
    ):
        _add(
            findings,
            "FALSE_STOP_LOSS_ACCOUNTING",
            "The two-cycle rule must keep Phase 1 stopped until T8 clears.",
        )
    proof_path = track_root / GOVERNANCE_PROOF_PATH
    if direction is None:
        _add(
            findings,
            "PRODUCT_OWNER_DIRECTION_REQUIRED",
            "Two failed cycles require bound delegated-owner direction.",
        )
    elif proof_path.is_file() and not _delegated_owner_direction_matches(
        direction,
        contract=cycle_stop["delegated_owner_direction_contract"],
        proof=load_json(proof_path),
        ledger=ledger,
    ):
        _add(
            findings,
            "INVALID_PRODUCT_OWNER_DIRECTION",
            "Delegated-owner direction is not the exact post-cycle root event.",
        )
    return checks


def verify_phase0(
    repo_root: Path,
    track_root: Path,
    fixture_path: Path | None = None,
) -> VerificationResult:
    """Verifies the exact pending Phase 0 graph and optional counterexample.

    Args:
        repo_root: Repository root containing Measure and package inputs.
        track_root: T9 track directory containing Phase 0 contracts.
        fixture_path: Optional negative fixture to apply to copied inputs.

    Returns:
        A deterministic pass or blocked result with stable finding codes.
    """
    freeze = load_json(track_root / "phase0-input-freeze-pending-v1.json")
    registry = load_json(track_root / "phase0-source-registry-pending-v1.json")
    roles = load_json(
        track_root / "phase0-role-ownership-manifest-pending-v1.json"
    )
    derivation = load_json(
        track_root / "phase0-derivation-schema-pending-v1.json"
    )
    claim_schema = load_json(
        track_root / "phase0-claim-dependency-schema-pending-v1.json"
    )
    budget = load_json(track_root / "phase0-budget-stop-loss-pending-v1.json")
    registry = copy.deepcopy(registry)
    roles = copy.deepcopy(roles)
    derivation = copy.deepcopy(derivation)
    budget = copy.deepcopy(budget)
    probe: dict[str, Any] = {}
    if fixture_path is not None:
        fixture = load_json(fixture_path)
        probe = _apply_fixture(registry, roles, derivation, budget, fixture)
    findings: list[Finding] = []
    checks = _verify_sources(repo_root, registry, findings)
    checks += _verify_pack(repo_root, registry, probe, findings)
    checks += _verify_roles(track_root, roles, findings)
    checks += _verify_current_receipt(track_root, roles, findings)
    checks += _verify_provider_counterexample(
        track_root,
        probe.get("provider_counterexample"),
        findings,
    )
    checks += _verify_contracts(
        repo_root,
        track_root,
        freeze,
        registry,
        derivation,
        claim_schema,
        budget,
        findings,
    )
    checks += _verify_t8(repo_root, registry, findings)
    findings.sort(key=lambda finding: finding.code)
    finding_codes = {finding.code for finding in findings}
    expected_live_blockers = {
        "CURRENT_GOVERNANCE_RECEIPT_REBIND_PENDING",
        "GOVERNANCE_AUTHOR_PROOF_PENDING",
        "GOVERNANCE_REBIND_PENDING",
        "MISSING_TASK_OWNERSHIP",
        "PRODUCT_OWNER_DIRECTION_REQUIRED",
        "T8_PENDING_POST_REVIEW_USER_APPROVAL",
    }
    if not findings:
        state = "VERIFIED"
    elif fixture_path is None and finding_codes.issubset(
        expected_live_blockers
    ):
        state = "STOPPED_BEFORE_SYNTHESIS"
    else:
        state = "INVALID"
    return VerificationResult(
        passed=not findings,
        state=state,
        findings=tuple(findings),
        checks=checks,
    )


def _parse_args(argv: list[str]) -> argparse.Namespace:
    """Parses command-line arguments for deterministic verification."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--expect-code")
    parser.add_argument("--expect-codes", nargs="+")
    parser.add_argument("--write-report", type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Runs Phase 0 verification and returns a fail-closed process status.

    Args:
        argv: Optional arguments; defaults to process arguments.

    Returns:
        Zero when verification or an expected finding set succeeds; otherwise
        one.
    """
    args = _parse_args(sys.argv[1:] if argv is None else argv)
    result = verify_phase0(
        args.repo_root.resolve(),
        args.track_root.resolve(),
        fixture_path=args.fixture.resolve() if args.fixture else None,
    )
    report = result.as_json()
    if args.fixture:
        report["fixture"] = str(args.fixture)
    if args.write_report:
        args.write_report.write_text(
            f"{json.dumps(report, indent=2, sort_keys=True)}\n",
            encoding="utf-8",
        )
    print(json.dumps(report, indent=2, sort_keys=True))
    if args.expect_code:
        codes = {finding.code for finding in result.findings}
        exact_expected_finding = len(result.findings) == 1 and codes == {
            args.expect_code
        }
        return 0 if exact_expected_finding else 1
    if args.expect_codes:
        codes = {finding.code for finding in result.findings}
        return 0 if codes == set(args.expect_codes) else 1
    return 0 if result.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
