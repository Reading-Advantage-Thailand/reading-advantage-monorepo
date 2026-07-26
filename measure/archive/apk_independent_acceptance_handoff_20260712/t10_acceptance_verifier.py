#!/usr/bin/env python3
"""Independently verifies the complete T10 acceptance input and safety boundary."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass
from datetime import datetime
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import re
import subprocess
from typing import Any, Iterable


T9_REL = Path("measure/tracks/apk_evidence_backed_ontology_synthesis_20260712")
T8_REL = Path("measure/tracks/apk_existing_asset_candidate_audit_20260712")
T10_REL = Path("measure/tracks/apk_independent_acceptance_handoff_20260712")
PACK_REL = Path("packages/advantage-play-kit/assets/standard")
T9_ROOT_SHA256 = "b02672818991231837afcd1bfc3dbdc59c40d230d1cf3a309d8acec2c5f0341b"
T9_CANDIDATE_SHA256 = "550b15d5f14e294deafec2df86ff8e09f43ba8d7fd204f4c167ebf811f0563ff"
T8_ACCEPTED_SHA256 = "20930a1cb30b763323f0c3d77a0625cb1c54c7aba7094284b91d508f3d68665f"
PACK_ACCEPTANCE_SHA256 = "61984e0b53c4ba85379cf6a4f0f33ee956665c4eaad4b3d681e3dccd98389844"
PACK_CATALOG_SHA256 = "ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932"
CATALOG_DIGEST = "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087"
SOURCE_RECEIPT_DIGEST = "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9"
REQUIRED_CREDIT = "Pixel art assets by ElvGames"
EXPECTED_VERSION = "2026.07.23"
HEX64 = re.compile(r"^[0-9a-f]{64}$")
DIRECT_PATH = re.compile(r"(?:^|/)(?:apps|public|games|asset packs)(?:/|$)|\\|\.(?:png|jpe?g|gif|svg|mp3|wav|ogg)$", re.I)


@dataclass(frozen=True)
class Finding:
    """Describes one stable acceptance failure."""

    code: str
    severity: str
    detail: str


@dataclass(frozen=True)
class VerificationResult:
    """Contains the complete independent candidate-verification result."""

    findings: tuple[Finding, ...]
    metrics: dict[str, int]
    blocked_claim_ids: tuple[str, ...]
    exact_claim_ids: tuple[str, ...]

    @property
    def passed(self) -> bool:
        """Returns whether no acceptance-blocking finding remains."""
        return not self.findings

    @property
    def codes(self) -> set[str]:
        """Returns the stable set of finding codes."""
        return {finding.code for finding in self.findings}

    def as_json(self) -> dict[str, Any]:
        """Returns a deterministic JSON-compatible report."""
        return {
            "passed": self.passed,
            "findings": [asdict(finding) for finding in self.findings],
            "metrics": self.metrics,
            "claim_dispositions": {
                "exact": len(self.exact_claim_ids),
                "blocked": len(self.blocked_claim_ids),
            },
        }


def sha256_bytes(value: bytes) -> str:
    """Returns the lowercase SHA-256 digest of bytes."""
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    """Returns the lowercase SHA-256 digest of one file."""
    return sha256_bytes(path.read_bytes())


def canonical_sha256(value: Any) -> str:
    """Returns the canonical compact-JSON SHA-256 digest of a value."""
    return sha256_bytes(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    )


def resolve_pointer(value: Any, pointer: str) -> Any:
    """Resolves an RFC 6901 JSON pointer against a parsed value."""
    if pointer == "":
        return value
    current = value
    for encoded in pointer.removeprefix("/").split("/"):
        part = encoded.replace("~1", "/").replace("~0", "~")
        current = current[int(part)] if isinstance(current, list) else current[part]
    return current


def mutate_pointer(value: Any, pointer: str, mutation: dict[str, Any]) -> None:
    """Applies one test-only mutation to a parsed JSON value."""
    parts = pointer.removeprefix("/").split("/")
    current = value
    for encoded in parts[:-1]:
        part = encoded.replace("~1", "/").replace("~0", "~")
        if isinstance(current, list):
            current = current[int(part)]
        else:
            current = current.setdefault(part, {})
    final = parts[-1].replace("~1", "/").replace("~0", "~")
    if mutation.get("operation") == "remove":
        if isinstance(current, list):
            current.pop(int(final))
        else:
            current.pop(final, None)
    elif isinstance(current, list):
        current[int(final)] = mutation.get("value")
    else:
        current[final] = mutation.get("value")


class Snapshot:
    """Loads repository JSON with optional isolated adversarial mutations."""

    def __init__(self, repo_root: Path, mutations: Iterable[dict[str, Any]] = ()) -> None:
        """Initializes a snapshot without changing repository files."""
        self.repo_root = repo_root
        self.by_artifact: dict[str, list[dict[str, Any]]] = {}
        for mutation in mutations:
            self.by_artifact.setdefault(mutation["artifact"], []).append(mutation)
        self.cache: dict[str, Any] = {}

    def load(self, relative: str | Path) -> Any:
        """Loads and mutates one JSON artifact in memory."""
        key = Path(relative).as_posix()
        if key not in self.cache:
            value = json.loads((self.repo_root / key).read_text(encoding="utf-8"))
            if key in self.by_artifact:
                value = deepcopy(value)
                for mutation in self.by_artifact[key]:
                    mutate_pointer(value, mutation["pointer"], mutation)
            self.cache[key] = value
        return self.cache[key]

    def digest(self, relative: str | Path) -> str:
        """Returns exact bytes hash, or an isolated mutated-value hash in attacks."""
        key = Path(relative).as_posix()
        if key not in self.by_artifact:
            return sha256_file(self.repo_root / key)
        return canonical_sha256(self.load(key))


def add(findings: list[Finding], code: str, detail: str, severity: str = "High") -> None:
    """Adds one de-duplicated finding per code and detail."""
    finding = Finding(code, severity, detail)
    if finding not in findings:
        findings.append(finding)


def nested_value(value: Any, dotted: str) -> Any:
    """Resolves one dotted expected-value path."""
    current = value
    for part in dotted.split("."):
        current = current[part]
    return current


def verify_frozen_inputs(snapshot: Snapshot, findings: list[Finding]) -> int:
    """Verifies T1-T9 authority, revocation, and exact hash bindings."""
    checks = 0
    root_path = T9_REL / "phase6-root-acceptance-v1.json"
    candidate_path = T9_REL / "phase6-candidate-synthesis-manifest-v1.json"
    if snapshot.digest(root_path) != T9_ROOT_SHA256:
        add(findings, "T9_ROOT_HASH", "The exact T9 root acceptance hash differs.", "Critical")
    if snapshot.digest(candidate_path) != T9_CANDIDATE_SHA256:
        add(findings, "T9_CANDIDATE_HASH", "The exact T9 candidate hash differs.", "Critical")
    root = snapshot.load(root_path)
    if root.get("candidate_manifest", {}).get("sha256") != snapshot.digest(candidate_path):
        add(findings, "STALE_CANDIDATE_BINDING", "T9 root acceptance does not bind the candidate bytes.", "Critical")
    if root.get("consumable") is not False or root.get("t10_may_start") is not True:
        add(findings, "T9_LIFECYCLE", "T9 must remain non-consumable and explicitly open only T10.")
    decisions = snapshot.load(T9_REL / "phase3-6-owner-delegated-decisions-v1.json")
    try:
        if datetime.fromisoformat(root["accepted_at"].replace("Z", "+00:00")) < datetime.fromisoformat(
            decisions["decided_at"].replace("Z", "+00:00")
        ):
            add(findings, "APPROVAL_ORDER", "T9 root acceptance predates its delegated phase decisions.", "Critical")
    except (KeyError, ValueError):
        add(findings, "APPROVAL_ORDER", "T9 approval timestamps are missing or invalid.", "Critical")

    registry = snapshot.load(T9_REL / "phase0-source-registry-v3.json")
    for row in registry.get("sources", []) + registry.get("authority_evidence", []):
        path = row["path"]
        if not (snapshot.repo_root / path).is_file():
            add(findings, "MISSING_PREDECESSOR", path, "Critical")
            continue
        if snapshot.digest(path) != row["sha256"]:
            add(findings, "STALE_PREDECESSOR_HASH", path, "Critical")
        document = snapshot.load(path) if path.endswith(".json") else None
        for dotted, expected in row.get("expected_values", {}).items():
            try:
                if nested_value(document, dotted) != expected:
                    add(findings, "REVOKED_PREDECESSOR", f"{path}:{dotted}", "Critical")
            except (KeyError, TypeError):
                add(findings, "MISSING_PREDECESSOR_FIELD", f"{path}:{dotted}", "Critical")
        checks += 1
    gate = snapshot.load("measure/evidence-integrity-accepted-gate.json")
    if gate.get("revoked") is not False or gate.get("status") != "accepted" or gate.get("consumable") is not True:
        add(findings, "REVOKED_PREDECESSOR", "The T1 evidence-integrity gate is not active.", "Critical")
    t8 = snapshot.load(T8_REL / "phase5-accepted-manifest-v1.json")
    if snapshot.digest(T8_REL / "phase5-accepted-manifest-v1.json") != T8_ACCEPTED_SHA256:
        add(findings, "T8_ACCEPTED_HASH", "The T8 accepted manifest differs.", "Critical")
    if t8.get("revocation_state") != "active" or t8.get("consumer_scope") != "T9_ontology_only":
        add(findings, "REVOKED_PREDECESSOR", "The T8 acceptance scope or revocation state differs.", "Critical")
    return checks + 8


def materialize_claim(snapshot: Snapshot, documents: dict[str, str], row: dict[str, Any]) -> dict[str, Any]:
    """Reconstructs one effective claim from exact source documents and pointers."""
    values = [resolve_pointer(snapshot.load(documents[step["document_id"]]), step["pointer"]) for step in row["materialization_steps"]]
    rule = row["materialization_rule"]
    if rule in {"exact-terminal-row", "terminal-replacement", "terminal-addition"}:
        claim = deepcopy(values[0])
    elif rule == "retained-base-exact-copy":
        if values[1] != row["claim_id"]:
            raise ValueError("retained claim identity differs")
        claim = deepcopy(values[0])
    elif rule == "base-then-governing-then-override":
        claim = deepcopy(values[0])
        for overlay in values[1:]:
            claim.update(overlay)
    else:
        raise ValueError(f"unsupported materialization rule {rule}")
    return claim


def collect_claim_ids(value: Any) -> set[str]:
    """Collects claim identities and retained identities from one terminal document."""
    found: set[str] = set()
    if isinstance(value, dict):
        claim_id = value.get("claim_id")
        if isinstance(claim_id, str):
            found.add(claim_id)
        for key, item in value.items():
            if key == "supersession_log":
                continue
            if key == "retained_claim_ids" and isinstance(item, list):
                found.update(entry for entry in item if isinstance(entry, str))
            else:
                found.update(collect_claim_ids(item))
    elif isinstance(value, list):
        for item in value:
            found.update(collect_claim_ids(item))
    return found


def is_negative_control(claim_id: str, claim: dict[str, Any]) -> bool:
    """Returns whether a row is explicit rejected/negative evidence."""
    disposition = str(claim.get("expected_disposition", "")).upper()
    return (
        "-NEG-" in claim_id
        or claim.get("negative_fixture") is True
        or disposition in {"FAIL", "FAILED", "REJECT", "REJECTED"}
    )


@lru_cache(maxsize=512)
def git_blob(repo_root: str, revision: str, path: str) -> bytes:
    """Reads exact repository bytes from a Git revision without working-tree fallback."""
    completed = subprocess.run(
        ["git", "show", f"{revision}:{path}"],
        cwd=repo_root,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return completed.stdout


def citation_is_exact(
    repo_root: Path,
    claim: dict[str, Any],
    source_document: dict[str, Any] | None,
) -> bool:
    """Returns whether one factual claim has a valid exact Git blob/range envelope."""
    citation = claim.get("citation") if isinstance(claim.get("citation"), dict) else {}
    revision = (
        claim.get("revision")
        or claim.get("source_revision")
        or citation.get("revision")
        or (source_document or {}).get("source_baseline_revision")
    )
    path = claim.get("file_path") or claim.get("relative_path") or claim.get("path") or citation.get("path")
    blob_digest = claim.get("blob_sha256") or citation.get("blob_sha256")
    cited = claim.get("cited_range_sha256") or citation.get("cited_range_sha256")
    start = claim.get("line_start") or claim.get("start_line") or citation.get("line_start")
    end = claim.get("line_end") or claim.get("end_line") or citation.get("line_end")
    inclusive = claim.get("inclusive_range")
    if isinstance(inclusive, str) and ".." in inclusive:
        start_text, end_text = inclusive.split("..", 1)
        start, end = int(start_text), int(end_text)
    elif isinstance(inclusive, dict):
        start = inclusive.get("start_line", inclusive.get("start", start))
        end = inclusive.get("end_line", inclusive.get("end", end))
    if not revision or not path or not blob_digest:
        return False
    try:
        blob = git_blob(str(repo_root), str(revision), str(path))
    except subprocess.CalledProcessError:
        return False
    if sha256_bytes(blob) != blob_digest:
        return False
    if cited is None and start is None and end is None:
        return True
    if not isinstance(start, int) or not isinstance(end, int) or start < 1 or end < start:
        return False
    lines = blob.splitlines(keepends=True)
    if end > len(lines):
        return False
    return sha256_bytes(b"".join(lines[start - 1:end])) == cited


def verify_claims(snapshot: Snapshot, findings: list[Finding]) -> tuple[dict[str, int], tuple[str, ...], tuple[str, ...]]:
    """Reconciles every raw claim, materialization, derivation, and capability use."""
    index = snapshot.load(T9_REL / "phase1-source-resolution-index-v1.json")
    documents = {row["document_id"]: row["path"] for row in index.get("source_artifacts", [])}
    for row in index.get("source_artifacts", []):
        if snapshot.digest(row["path"]) != row["sha256"]:
            add(findings, "RAW_SOURCE_HASH", row["path"], "Critical")
    expected_by_game: dict[str, set[str]] = {}
    for leaf in index.get("terminal_leaves", []):
        if snapshot.digest(leaf["path"]) != leaf["sha256"]:
            add(findings, "RAW_SOURCE_HASH", leaf["path"], "Critical")
        expected_by_game[leaf["game_id"]] = collect_claim_ids(snapshot.load(leaf["path"]))

    materialized: dict[tuple[str, str], dict[str, Any]] = {}
    blocked: list[str] = []
    exact: list[str] = []
    negative: set[tuple[str, str]] = set()
    for row in index.get("upstream_claims", []):
        key = (row["game_id"], row["claim_id"])
        try:
            claim = materialize_claim(snapshot, documents, row)
        except (KeyError, IndexError, TypeError, ValueError):
            add(findings, "CLAIM_MATERIALIZATION", ":".join(key), "Critical")
            continue
        materialized[key] = claim
        if canonical_sha256(claim) != row.get("claim_sha256"):
            add(findings, "CLAIM_HASH", ":".join(key), "Critical")
        try:
            source_value = resolve_pointer(claim, row["value_pointer"])
            if canonical_sha256(source_value) != row["value_sha256"]:
                add(findings, "CLAIM_VALUE_HASH", ":".join(key), "Critical")
        except (KeyError, IndexError, TypeError):
            add(findings, "CLAIM_VALUE_HASH", ":".join(key), "Critical")
        if is_negative_control(row["claim_id"], claim):
            negative.add(key)
            blocked.append(":".join(key))
        source_document_value = snapshot.load(documents[row["materialization_steps"][0]["document_id"]])
        source_document = source_document_value if isinstance(source_document_value, dict) else None
        if is_negative_control(row["claim_id"], claim):
            pass
        elif citation_is_exact(snapshot.repo_root, claim, source_document):
            exact.append(":".join(key))
        elif key not in negative:
            blocked.append(":".join(key))

    actual_by_game: dict[str, set[str]] = {}
    for game_id, claim_id in materialized:
        actual_by_game.setdefault(game_id, set()).add(claim_id)
    if actual_by_game != expected_by_game:
        add(findings, "RAW_CLAIM_DENOMINATOR", "Effective terminal claim identities differ.", "Critical")
    if len(materialized) != 1248:
        add(findings, "RAW_CLAIM_DENOMINATOR", f"Expected 1248 rows, got {len(materialized)}.", "Critical")

    source_rows = {(row["game_id"], row["claim_id"]): row for row in index.get("upstream_claims", [])}
    output_records: list[dict[str, Any]] = []
    for name in ("phase1-mechanic-blueprints-v1.json", "phase1-developer-effort-baseline-v1.json"):
        output_records.extend(snapshot.load(T9_REL / name).get("records", []))
    for record in output_records:
        key = (record.get("game_id"), record.get("source_claim_id"))
        source = source_rows.get(key)
        for field in record.get("derived_fields", []):
            if (
                source is None
                or field.get("derivation_rule") != "exact-copy"
                or field.get("value_sha256") != source.get("value_sha256")
                or canonical_sha256(field.get("value")) != source.get("value_sha256")
            ):
                add(findings, "DERIVATION_MISMATCH", record.get("record_id", "unknown"), "Critical")

    curated = snapshot.load(T9_REL / "phase2-curated-capability-evidence-v1.json")
    capability_uses: dict[str, tuple[str, str]] = {}
    for record in curated.get("records", []):
        key = (record.get("game_id"), record.get("claim_id"))
        if key in negative:
            audit = record.get("audit", {})
            if record.get("capability_uses") or audit.get("contradiction_resolution") != "exclude-negative-control":
                add(findings, "FAILURE_ARTIFACT_NOT_QUARANTINED", ":".join(key), "Critical")
        for use in record.get("capability_uses", []):
            use_key = (record["game_id"], use.get("claim_id", record["claim_id"]))
            capability_uses[use["use_id"]] = use_key
            if ":".join(use_key) not in exact:
                add(findings, "CAPABILITY_WITHOUT_EXACT_EVIDENCE", use["use_id"], "Critical")
    classification = snapshot.load(T9_REL / "phase2-capability-classification-v5.json")
    classified_uses: set[str] = set()
    for capability in classification.get("capabilities", []):
        uses = capability.get("consumer_use_ids", [])
        classified_uses.update(uses)
        games = {capability_uses.get(use, (None, None))[0] for use in uses}
        if None in games or len(games) < 2:
            add(findings, "UNSUPPORTED_STANDARDIZATION", capability.get("capability_id", "unknown"), "Critical")
    if classified_uses != set(capability_uses):
        add(findings, "CAPABILITY_USE_DENOMINATOR", "Curated and classified capability uses differ.", "Critical")
    metrics = {
        "raw_claims": len(materialized),
        "exact_claims": len(exact),
        "blocked_claims": len(blocked),
        "negative_controls": len(negative),
        "derived_records": len(output_records),
        "accepted_capabilities": len(classification.get("capabilities", [])),
        "capability_uses": len(capability_uses),
    }
    return metrics, tuple(sorted(blocked)), tuple(sorted(exact))


def verify_denominator_and_responsive(snapshot: Snapshot, findings: list[Finding]) -> dict[str, int]:
    """Reconciles identities and every responsive contract without browser overclaim."""
    partition = snapshot.load("measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json")
    identity = snapshot.load(T9_REL / "phase0-game-identity-map-v1.json")
    identity_entries = identity.get("entries", identity.get("mappings", []))
    index = snapshot.load(T9_REL / "phase1-source-resolution-index-v1.json")
    game_ids = index.get("denominator", {}).get("accepted_game_ids", [])
    if len(partition.get("assignments", [])) != 29 or len(game_ids) != 29 or len(set(game_ids)) != 29:
        add(findings, "GAME_DENOMINATOR", "The exact 29-game denominator differs.", "Critical")
    if identity_entries and len(identity_entries) != 29:
        add(findings, "GAME_DENOMINATOR", "The identity mapping does not cover 29 games.", "Critical")
    responsive = snapshot.load(T9_REL / "phase3-responsive-contracts-v1.json")
    contracts = responsive.get("contracts", [])
    if {row.get("game_id") for row in contracts} != set(game_ids):
        add(findings, "RESPONSIVE_DENOMINATOR", "Responsive contracts do not cover exactly 29 games.", "Critical")
    blocked_cells = 0
    for contract in contracts:
        if contract.get("status") != "blocked_unknown":
            add(findings, "UNKNOWN_MUST_HAVE_UNBLOCKED", contract.get("contract_id", "unknown"), "Critical")
        for profile in contract.get("profiles", []):
            for state in profile.get("aspect_states", {}).values():
                blocked_cells += 1
                if state != "blocked_unknown":
                    add(findings, "BROWSER_OVERCLAIM", contract.get("contract_id", "unknown"), "Critical")
    return {"games": len(set(game_ids)), "responsive_contracts": len(contracts), "blocked_responsive_cells": blocked_cells}


def verify_assets(snapshot: Snapshot, findings: list[Finding]) -> dict[str, int]:
    """Reconciles all T8 candidates, usages, mappings, dispositions, and browser evidence."""
    t8 = snapshot.load(T8_REL / "phase5-accepted-manifest-v1.json")
    matrix = snapshot.load(T9_REL / "phase4-canonical-adoption-matrix-v1.json")
    normalization = snapshot.load(T9_REL / "phase4-asset-normalization-v1.json")
    entries = t8.get("entries", [])
    rows = matrix.get("candidate_rows", [])
    if len(entries) != 428 or len(rows) != 428:
        add(findings, "T8_CANDIDATE_DENOMINATOR", "Expected 428 T8 candidate rows.", "Critical")
    mappings = []
    for entry, row in zip(entries, rows):
        expected = (
            entry.get("record_index"), entry.get("report_record_sha256"), entry.get("asset_sha256"),
            entry.get("batch_id"), entry.get("disposition", {}).get("value"), entry.get("join_status"),
        )
        actual = (
            row.get("t8_record_index"), row.get("t8_report_record_sha256"), row.get("source_asset_sha256"),
            row.get("batch_id"), row.get("t8_disposition"), row.get("t8_join_status"),
        )
        if actual != expected:
            add(findings, "T8_CANDIDATE_RECONCILIATION", str(entry.get("record_index")), "Critical")
        if row.get("direct_legacy_adoption") is not False:
            add(findings, "DIRECT_LEGACY_PATH", str(entry.get("record_index")), "Critical")
        mappings.extend(row.get("mappings", []))
    for mapping in mappings:
        adoption = mapping.get("adoption", {})
        key = adoption.get("standard_pack_key")
        if isinstance(key, str) and DIRECT_PATH.search(key):
            add(findings, "DIRECT_LEGACY_PATH", key, "Critical")
        if adoption.get("state") == "candidate" and not key:
            add(findings, "ABSENT_CANDIDATE_KEY", mapping.get("usage_id", "unknown"), "Critical")
        if adoption.get("state") != "blocked":
            add(findings, "UNKNOWN_MUST_HAVE_UNBLOCKED", mapping.get("usage_id", "unknown"), "Critical")
        if key is not None:
            add(findings, "UNAPPROVED_CANDIDATE_KEY", str(key), "Critical")
    if len(mappings) != 85 or len(normalization.get("usage_records", [])) != 45:
        add(findings, "ASSET_USAGE_DENOMINATOR", "Expected 45 usages and 85 blocked mappings.", "Critical")

    freeze_path = T8_REL / "phase4-browser-evidence-freeze-v1.json"
    freeze = snapshot.load(freeze_path)
    evidence_files = 0
    routes = set()
    for binding in freeze.get("evidence_bindings", []):
        if snapshot.digest(binding["path"]) != binding["sha256"]:
            add(findings, "BROWSER_EVIDENCE_HASH", binding["path"], "Critical")
        evidence = snapshot.load(binding["path"])
        if "routes" in evidence:
            routes.update(route["route"] for route in evidence["routes"])
            artifacts = [item for route in evidence["routes"] for item in route.get("artifacts", [])]
            base = (snapshot.repo_root / binding["path"]).parent
            for artifact in artifacts:
                path = base / artifact["file"]
                if not path.is_file() or sha256_file(path) != artifact["sha256"]:
                    add(findings, "BROWSER_EVIDENCE_HASH", str(path), "Critical")
                evidence_files += 1
        else:
            for capture in evidence.get("captures", []):
                path = snapshot.repo_root / capture["screenshot_path"]
                if not path.is_file() or sha256_file(path) != capture["screenshot_sha256"]:
                    add(findings, "BROWSER_EVIDENCE_HASH", str(path), "Critical")
                evidence_files += 1
    if freeze.get("admission_rules") is None or freeze.get("acceptance") is not False:
        add(findings, "BROWSER_SCOPE", "Browser evidence must remain bounded and non-accepting.", "Critical")
    return {
        "t8_candidate_rows": len(rows),
        "normalized_usages": len(normalization.get("usage_records", [])),
        "blocked_adoption_mappings": len(mappings),
        "browser_evidence_files": evidence_files,
        "browser_routes": len(routes) + 1,
    }


@lru_cache(maxsize=2)
def verify_pack_files(repo_root_text: str) -> tuple[tuple[str, str], ...]:
    """Verifies every cataloged standard-pack file and receipt locator once."""
    root = Path(repo_root_text)
    pack_root = root / PACK_REL
    catalog = json.loads((pack_root / "standard-pack-release.json").read_text(encoding="utf-8"))
    receipt_rows: dict[str, str] = {}
    for receipt_name in ("IMPORT-RECEIPT.tsv", "CURATED-RECEIPT.tsv"):
        lines = (pack_root / receipt_name).read_text(encoding="utf-8").splitlines()
        for line_number, line in enumerate(lines[1:], start=2):
            destination = line.split("\t", 1)[0]
            receipt_rows[destination] = f"{receipt_name}:{line_number}"
    failures: list[tuple[str, str]] = []
    catalog_paths: set[str] = set()
    keys: set[str] = set()
    for asset in catalog["assets"]:
        path = asset["path"]
        catalog_paths.add(path)
        if asset["key"] in keys:
            failures.append(("PACK_DUPLICATE_KEY", asset["key"]))
        keys.add(asset["key"])
        physical = pack_root / path
        if not physical.is_file():
            failures.append(("PACK_FILE_MISSING", path))
            continue
        if physical.stat().st_size != asset["physical"]["byteSize"] or sha256_file(physical) != asset["physical"]["sha256"]:
            failures.append(("PACK_FILE_HASH", path))
        if receipt_rows.get(path) != asset.get("sourceReceiptLocator"):
            failures.append(("PACK_RECEIPT_LOCATOR", path))
    ignored = {".md", ".txt", ".tsv", ".json"}
    actual_paths = {
        path.relative_to(pack_root).as_posix()
        for path in pack_root.rglob("*")
        if path.is_file() and path.suffix.lower() not in ignored
    }
    if actual_paths != catalog_paths:
        failures.append(("PACK_FILE_DENOMINATOR", f"catalog={len(catalog_paths)} actual={len(actual_paths)}"))
    for line in (pack_root / "LICENSE-RECEIPT.tsv").read_text(encoding="utf-8").splitlines()[1:]:
        destination = line.split("\t", 1)[0]
        path = pack_root / destination
        if not path.is_file() or not path.read_text(encoding="utf-8").strip():
            failures.append(("PACK_LICENSE_RECEIPT", destination))
    return tuple(failures)


def verify_pack(snapshot: Snapshot, findings: list[Finding]) -> dict[str, int]:
    """Verifies the complete canonical release, catalog, receipts, license, and credit."""
    acceptance_path = PACK_REL / "accepted-standard-pack-release.json"
    catalog_path = PACK_REL / "standard-pack-release.json"
    acceptance = snapshot.load(acceptance_path)
    catalog = snapshot.load(catalog_path)
    expected_acceptance = {
        "status": "accepted",
        "version": EXPECTED_VERSION,
        "catalogDigest": CATALOG_DIGEST,
        "sourceReceiptDigest": SOURCE_RECEIPT_DIGEST,
        "catalogArtifactSha256": PACK_CATALOG_SHA256,
        "requiredCredit": REQUIRED_CREDIT,
    }
    if any(acceptance.get(key) != value for key, value in expected_acceptance.items()):
        add(findings, "PACK_RELEASE_MISMATCH", "The accepted release identity differs.", "Critical")
    if snapshot.digest(acceptance_path) != PACK_ACCEPTANCE_SHA256:
        add(findings, "PACK_ACCEPTANCE_HASH", "The accepted release artifact differs.", "Critical")
    if snapshot.digest(catalog_path) != PACK_CATALOG_SHA256:
        add(findings, "PACK_CATALOG_HASH", "The generated catalog artifact differs.", "Critical")
    payload = {
        "schemaVersion": catalog.get("schemaVersion"),
        "version": catalog.get("version"),
        "sourceReceiptDigest": catalog.get("sourceReceiptDigest"),
        "requiredCredit": catalog.get("requiredCredit"),
        "assets": catalog.get("assets"),
    }
    payload_digest = sha256_bytes((json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n").encode())
    pack_root = snapshot.repo_root / PACK_REL
    source_digest = sha256_bytes(
        (pack_root / "IMPORT-RECEIPT.tsv").read_bytes()
        + b"\n"
        + (pack_root / "CURATED-RECEIPT.tsv").read_bytes()
        + b"\n"
        + (pack_root / "LICENSE-RECEIPT.tsv").read_bytes()
    )
    if payload_digest != CATALOG_DIGEST or source_digest != SOURCE_RECEIPT_DIGEST:
        add(findings, "PACK_RELEASE_MISMATCH", "Catalog or receipt digest does not rederive.", "Critical")
    if REQUIRED_CREDIT not in (pack_root / "README.md").read_text(encoding="utf-8"):
        add(findings, "PACK_CREDIT", "Required ElvGames credit is absent.", "Critical")
    license_text = (pack_root / "LICENSE-ELVGAMES.txt").read_text(encoding="utf-8")
    if "Credits to ElvGames" not in license_text or "Use the assets on personal or commercial projects" not in license_text:
        add(findings, "PACK_LICENSE", "The bound ElvGames license text differs.", "Critical")
    if PACK_REL.as_posix() != acceptance.get("downstreamConsumptionRules", {}).get("canonicalRoot"):
        add(findings, "PACK_RELEASE_MISMATCH", "Canonical root policy differs.", "Critical")
    if str(acceptance.get("version")) == EXPECTED_VERSION:
        for code, detail in verify_pack_files(str(snapshot.repo_root)):
            add(findings, code, detail, "Critical")
    return {"standard_pack_assets": len(catalog.get("assets", []))}


def verify_roles_and_quarantine(snapshot: Snapshot, findings: list[Finding]) -> int:
    """Verifies reviewer non-reuse, honest limitations, and monolith quarantine."""
    identity = snapshot.load(T10_REL / "reviewer-identity-v1.json")
    reviewer_id = identity.get("reviewer_id")
    if identity.get("provider_fork_turns_attested") is not False or identity.get("tool_attestation_available") is not False:
        add(findings, "PROVIDER_ATTESTATION_OVERCLAIM", "Unavailable provider/tool isolation was claimed.", "Critical")
    upstream_ids: set[str] = set()
    for root in (snapshot.repo_root / T8_REL / "role-receipts", snapshot.repo_root / T9_REL / "role-receipts"):
        for path in root.rglob("*.json"):
            try:
                value = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            stack = [value]
            while stack:
                item = stack.pop()
                if isinstance(item, dict):
                    for key, child in item.items():
                        if key in {"agent_ref", "native_task_name", "reviewer_id", "collector_agent", "agent_id"} and isinstance(child, str):
                            upstream_ids.add(child)
                        stack.append(child)
                elif isinstance(item, list):
                    stack.extend(item)
    if reviewer_id in upstream_ids or not reviewer_id:
        add(findings, "ROLE_REUSE", str(reviewer_id), "Critical")
    candidate = snapshot.load(T9_REL / "phase6-candidate-synthesis-manifest-v1.json")
    serialized = json.dumps(candidate, sort_keys=True).lower()
    if "measure/archive/apk_cross_game_asset_ontology_20260712" in serialized:
        add(findings, "FAILED_MONOLITH_DEPENDENCY", "The failed monolith entered candidate dependencies.", "Critical")
    return len(upstream_ids) + 2


def verify_package_and_gaps(snapshot: Snapshot, findings: list[Finding]) -> dict[str, int]:
    """Verifies package bindings, review coverage, and unresolved Must-have blockers."""
    candidate = snapshot.load(T9_REL / "phase6-candidate-synthesis-manifest-v1.json")
    for name, digest in candidate.get("artifact_bindings", {}).items():
        if "/" in name:
            if "apk_cross_game_asset_ontology_20260712" in name:
                add(findings, "FAILED_MONOLITH_DEPENDENCY", name, "Critical")
            continue
        if snapshot.digest(T9_REL / name) != digest:
            add(findings, "CANDIDATE_BINDING", name, "Critical")
    if candidate.get("consumable") is not False or candidate.get("consumer_guard") is not False:
        add(findings, "PREAPPROVAL_CONSUMPTION", "T9 candidate became consumable.", "Critical")
    gaps = snapshot.load(T9_REL / "phase5-gap-delivery-ranking-v1.json")
    must_haves = 0
    for gap in gaps.get("ranked_gaps", []):
        if gap.get("priority") == "Must-have":
            must_haves += 1
            if gap.get("decision_state") != "blocked_unknown":
                add(findings, "UNKNOWN_MUST_HAVE_UNBLOCKED", gap.get("gap_id", "unknown"), "Critical")
    return {"blocked_must_have_gaps": must_haves}


def verify_candidate(
    repo_root: Path,
    mutations: Iterable[dict[str, Any]] = (),
) -> VerificationResult:
    """Runs all independent T10 candidate and raw-source gates.

    Args:
        repo_root: Repository root containing the frozen T1-T9 inputs.
        mutations: In-memory adversarial mutations used only by counterexample tests.

    Returns:
        Complete fail-closed verification result and coverage metrics.
    """
    snapshot = Snapshot(repo_root.resolve(), mutations)
    findings: list[Finding] = []
    metrics: dict[str, int] = {}
    metrics["frozen_input_checks"] = verify_frozen_inputs(snapshot, findings)
    claim_metrics, blocked, exact = verify_claims(snapshot, findings)
    metrics.update(claim_metrics)
    metrics.update(verify_denominator_and_responsive(snapshot, findings))
    metrics.update(verify_assets(snapshot, findings))
    metrics.update(verify_pack(snapshot, findings))
    metrics["role_identity_checks"] = verify_roles_and_quarantine(snapshot, findings)
    metrics.update(verify_package_and_gaps(snapshot, findings))
    return VerificationResult(tuple(findings), dict(sorted(metrics.items())), blocked, exact)


def verify_successor(
    repo_root: Path,
    mutations: Iterable[dict[str, Any]] = (),
) -> VerificationResult:
    """Verifies the only post-approval manifest that T11 may consume.

    Args:
        repo_root: Repository root containing the immutable T10 chain.
        mutations: In-memory adversarial mutations used only by guard tests.

    Returns:
        Fail-closed successor verification result.
    """
    snapshot = Snapshot(repo_root.resolve(), mutations)
    findings: list[Finding] = []
    manifest_path = T10_REL / "accepted-successor-manifest-v1.json"
    hashes_path = T10_REL / "successor-hashes-v1.json"
    required = (
        manifest_path,
        hashes_path,
        T10_REL / "product-owner-acceptance-v1.json",
        T10_REL / "t10-candidate-gate-report-v1.json",
        T10_REL / "t10-independent-acceptance-review-v1.json",
        T10_REL / "t10-claim-disposition-overlay-v1.json",
    )
    missing = [path.as_posix() for path in required if not (snapshot.repo_root / path).is_file()]
    if missing:
        add(findings, "MISSING_SUCCESSOR", ", ".join(missing), "Critical")
        return VerificationResult(tuple(findings), {"successor_bindings": 0}, (), ())
    manifest = snapshot.load(manifest_path)
    hashes = snapshot.load(hashes_path)

    def check_binding(value: Any, code: str, label: str) -> None:
        """Checks one path/hash binding without allowing missing-path exceptions."""
        if not isinstance(value, dict) or not isinstance(value.get("path"), str):
            add(findings, code, f"{label} binding is absent.", "Critical")
            return
        path = value["path"]
        if not (snapshot.repo_root / path).is_file() or value.get("sha256") != snapshot.digest(path):
            add(findings, code, f"{label} binding differs.", "Critical")

    if manifest.get("status") != "accepted" or manifest.get("consumable") is not True:
        add(findings, "SUCCESSOR_NOT_ACCEPTED", "Successor lifecycle state differs.", "Critical")
    if manifest.get("revocation_state") != "active":
        add(findings, "REVOKED_SUCCESSOR", "Successor is not active.", "Critical")
    if manifest.get("consumer_scope") != "T11_shared_developer_kit_only":
        add(findings, "SUCCESSOR_SCOPE", "Successor scope is broader than T11.", "Critical")
    candidate = manifest.get("t9_candidate", {})
    if candidate.get("path") != (T9_REL / "phase6-candidate-synthesis-manifest-v1.json").as_posix() or candidate.get("sha256") != T9_CANDIDATE_SHA256:
        add(findings, "STALE_SUCCESSOR_HASH", "T9 candidate binding differs.", "Critical")
    root = manifest.get("t9_root_acceptance", {})
    if root.get("path") != (T9_REL / "phase6-root-acceptance-v1.json").as_posix() or root.get("sha256") != T9_ROOT_SHA256:
        add(findings, "STALE_SUCCESSOR_HASH", "T9 root-acceptance binding differs.", "Critical")
    owner = manifest.get("owner_acceptance", {})
    check_binding(owner, "STALE_SUCCESSOR_HASH", "Owner acceptance")
    review = manifest.get("independent_review", {})
    check_binding(review, "STALE_SUCCESSOR_HASH", "Independent review")
    check_binding(manifest.get("claim_overlay"), "STALE_SUCCESSOR_HASH", "Claim overlay")
    owner_document = snapshot.load(owner["path"])
    review_document = snapshot.load(review["path"])
    if owner_document.get("decision") != "ACCEPT_BOUNDED_T10_HANDOFF_FOR_T11" or owner_document.get("revocation_state") != "active":
        add(findings, "REVOKED_SUCCESSOR", "Owner acceptance is absent, revoked, or mismatched.", "Critical")
    try:
        review_at = datetime.fromisoformat(review_document["review_completed_at"].replace("Z", "+00:00"))
        owner_at = datetime.fromisoformat(owner_document["accepted_at"].replace("Z", "+00:00"))
        manifest_at = datetime.fromisoformat(manifest["accepted_at"].replace("Z", "+00:00"))
        if not review_at < owner_at < manifest_at:
            add(findings, "SUCCESSOR_APPROVAL_ORDER", "Review, owner acceptance, and publication order differs.", "Critical")
    except (KeyError, ValueError):
        add(findings, "SUCCESSOR_APPROVAL_ORDER", "Successor approval timestamps are invalid.", "Critical")
    pack = manifest.get("standard_pack", {})
    if (
        pack.get("version") != EXPECTED_VERSION
        or pack.get("catalog_digest") != CATALOG_DIGEST
        or pack.get("source_receipt_digest") != SOURCE_RECEIPT_DIGEST
        or pack.get("accepted_release_sha256") != PACK_ACCEPTANCE_SHA256
        or pack.get("catalog_artifact_sha256") != PACK_CATALOG_SHA256
    ):
        add(findings, "SUCCESSOR_PACK_MISMATCH", "Canonical pack binding differs.", "Critical")
    if sha256_file(snapshot.repo_root / PACK_REL / "accepted-standard-pack-release.json") != PACK_ACCEPTANCE_SHA256:
        add(findings, "SUCCESSOR_PACK_MISMATCH", "Accepted pack release bytes differ.", "Critical")
    if sha256_file(snapshot.repo_root / PACK_REL / "standard-pack-release.json") != PACK_CATALOG_SHA256:
        add(findings, "SUCCESSOR_PACK_MISMATCH", "Pack catalog bytes differ.", "Critical")
    policy = manifest.get("adoption_policy", {})
    if policy.get("asset_root") != PACK_REL.as_posix():
        add(findings, "SUCCESSOR_PACK_MISMATCH", "Successor asset root differs.", "Critical")
    if policy.get("direct_legacy_paths") != "prohibited" or policy.get("private_pack_trees") != "prohibited":
        add(findings, "SUCCESSOR_LEGACY_PATH", "Legacy/private production asset paths are not prohibited.", "Critical")
    if policy.get("unknown_must_haves") != "blocked" or policy.get("approved_asset_mappings") != 0:
        add(findings, "SUCCESSOR_UNKNOWN_UNBLOCKED", "Unknown Must-have or asset adoption policy differs.", "Critical")
    for name, digest in manifest.get("accepted_capability_inputs", {}).items():
        if snapshot.digest(T9_REL / name) != digest:
            add(findings, "STALE_SUCCESSOR_HASH", f"Accepted capability input differs: {name}", "Critical")
    for name, digest in manifest.get("blocked_evidence_inputs", {}).items():
        if snapshot.digest(T9_REL / name) != digest:
            add(findings, "STALE_SUCCESSOR_HASH", f"Blocked evidence input differs: {name}", "Critical")
    if set(manifest.get("accepted_capability_inputs", {})) != {
        "phase2-capability-classification-v5.json",
        "phase2-curated-capability-evidence-v1.json",
        "phase2-extension-boundaries-v5.json",
    }:
        add(findings, "SUCCESSOR_SCOPE", "Accepted capability input set differs.", "Critical")
    if set(manifest.get("blocked_evidence_inputs", {})) != {
        "phase3-responsive-contracts-v1.json",
        "phase4-asset-normalization-v1.json",
        "phase4-canonical-adoption-matrix-v1.json",
        "phase5-gap-delivery-ranking-v1.json",
    }:
        add(findings, "SUCCESSOR_SCOPE", "Blocked evidence input set differs.", "Critical")
    if hashes.get("accepted_manifest", {}).get("sha256") != snapshot.digest(manifest_path):
        add(findings, "STALE_SUCCESSOR_HASH", "Published manifest digest differs.", "Critical")
    if hashes.get("revocation_state") != "active" or hashes.get("consumer_scope") != "T11_shared_developer_kit_only":
        add(findings, "REVOKED_SUCCESSOR", "Successor hash-set lifecycle differs.", "Critical")
    check_binding(hashes.get("owner_acceptance"), "STALE_SUCCESSOR_HASH", "Hash-set owner acceptance")
    check_binding(hashes.get("independent_review"), "STALE_SUCCESSOR_HASH", "Hash-set independent review")
    check_binding(hashes.get("candidate_gate"), "STALE_SUCCESSOR_HASH", "Hash-set candidate gate")
    check_binding(hashes.get("canonical_pack_release"), "SUCCESSOR_PACK_MISMATCH", "Hash-set pack release")
    return VerificationResult(tuple(findings), {"successor_bindings": 24}, (), ())


def main() -> int:
    """Runs production verification and prints its deterministic report."""
    repo_root = Path(__file__).resolve().parents[3]
    result = verify_candidate(repo_root)
    print(json.dumps(result.as_json(), indent=2, sort_keys=True))
    return 0 if result.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
