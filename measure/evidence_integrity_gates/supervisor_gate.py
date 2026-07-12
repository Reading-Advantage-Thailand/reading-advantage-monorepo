"""Versioned, fail-closed completion gate for protected Measure tracks."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
from pathlib import Path
from typing import Any, Mapping


SUPERVISOR_GATE_SCHEMA_VERSION = "evidence-integrity.supervisor.v1"
GATE_TRACK_ID = "measure_apk_evidence_integrity_gates_20260712"
ACCEPTED_MANIFEST_PATH = "measure/evidence-integrity-accepted-gate.json"
SUPERVISOR_REJECTION_CODES = frozenset(
    {
        "ACCEPTED_GATE_MANIFEST_REQUIRED",
        "ACCEPTED_GATE_MANIFEST_INVALID",
        "ACCEPTED_GATE_REVOKED",
        "GATE_COMMIT_UNREACHABLE",
        "GATE_FILE_HASH_MISMATCH",
        "LEGACY_DEPENDENCIES_FIELD",
        "CANONICAL_DEPENDENCY_REQUIRED",
        "PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK",
        "PRODUCT_GATE_PIN_MISMATCH",
        "PRODUCT_TRACK_EDITED_GATE",
        "LEGACY_PLAN_MARKER",
        "INCOMPLETE_TASK",
        "CATALOG_GUARD_MISSING",
        "STALE_ARCHIVE_PATH",
        "GENERATED_FACTS_STALE",
    }
)


def _run_git(repo: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    """Runs a read-only Git command for the repository adapter.

    @param repo Repository root.
    @param arguments Git arguments excluding the executable.
    @returns Completed process with captured text output.
    """
    return subprocess.run(
        ["git", *arguments], cwd=repo, text=True, capture_output=True, check=False
    )


def _sha256_bytes(value: bytes) -> str:
    """Hashes exact bytes with SHA-256.

    @param value Bytes to hash.
    @returns Lowercase hexadecimal digest.
    """
    return hashlib.sha256(value).hexdigest()


def _blocked(code: str, **detail: Any) -> dict[str, Any]:
    """Builds one deterministic fail-closed gate report.

    @param code Stable rejection code.
    @param detail Safe diagnostic fields.
    @returns Structured blocked report.
    """
    if code not in SUPERVISOR_REJECTION_CODES:
        raise ValueError(f"unknown supervisor gate rejection code: {code}")
    blocker: dict[str, Any] = {"code": code}
    if detail:
        blocker["detail"] = detail
    return {
        "schema_version": SUPERVISOR_GATE_SCHEMA_VERSION,
        "ok": False,
        "state": "blocked",
        "blockers": [blocker],
    }


def _load_object(path: Path) -> Mapping[str, Any] | None:
    """Loads a JSON object without allowing malformed data to escape.

    @param path JSON file path.
    @returns Parsed mapping, or ``None`` for absent or invalid input.
    """
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    return value if isinstance(value, Mapping) else None


def _validate_manifest(repo: Path) -> tuple[Mapping[str, Any] | None, dict[str, Any] | None]:
    """Validates the accepted manifest and every live gate-file hash.

    @param repo Repository root.
    @returns Manifest and no blocker, or no manifest and a blocker.
    """
    path = repo / ACCEPTED_MANIFEST_PATH
    if not path.is_file():
        return None, _blocked("ACCEPTED_GATE_MANIFEST_REQUIRED", path=ACCEPTED_MANIFEST_PATH)
    manifest = _load_object(path)
    if manifest is None:
        return None, _blocked("ACCEPTED_GATE_MANIFEST_INVALID")
    if manifest.get("status") != "accepted" or manifest.get("schema_version") != SUPERVISOR_GATE_SCHEMA_VERSION:
        return None, _blocked("ACCEPTED_GATE_MANIFEST_INVALID")
    if manifest.get("revoked") is not False:
        return None, _blocked("ACCEPTED_GATE_REVOKED")
    commit = manifest.get("gate_commit")
    files = manifest.get("files")
    if (
        not isinstance(commit, str)
        or re.fullmatch(r"[0-9a-f]{40}", commit) is None
        or not isinstance(manifest.get("gate_version"), str)
        or not manifest["gate_version"]
        or not isinstance(files, Mapping)
        or not files
        or re.fullmatch(r"[0-9a-f]{64}", str(manifest.get("review_hash", ""))) is None
        or re.fullmatch(r"[0-9a-f]{64}", str(manifest.get("owner_approval_hash", ""))) is None
    ):
        return None, _blocked("ACCEPTED_GATE_MANIFEST_INVALID")
    if _run_git(repo, "cat-file", "-e", f"{commit}^{{commit}}").returncode != 0:
        return None, _blocked("GATE_COMMIT_UNREACHABLE", commit=commit)
    for relative_path, expected_hash in sorted(files.items()):
        if not isinstance(relative_path, str) or not isinstance(expected_hash, str):
            return None, _blocked("ACCEPTED_GATE_MANIFEST_INVALID")
        committed = _run_git(repo, "show", f"{commit}:{relative_path}")
        if (
            committed.returncode != 0
            or _sha256_bytes(committed.stdout.encode("utf-8")) != expected_hash
        ):
            return None, _blocked("GATE_FILE_HASH_MISMATCH", path=relative_path)
    return manifest, None


def _validate_live_gate_files(
    repo: Path, files: Mapping[str, Any]
) -> dict[str, Any] | None:
    """Validates accepted gate files against current worktree bytes.

    @param repo Repository root.
    @param files Accepted path-to-hash mapping.
    @returns A hash-mismatch blocker, or ``None`` when all bytes match.
    """
    for relative_path, expected_hash in sorted(files.items()):
        live_path = repo / relative_path
        if not live_path.is_file() or _sha256_bytes(live_path.read_bytes()) != expected_hash:
            return _blocked("GATE_FILE_HASH_MISMATCH", path=relative_path)
    return None


def _validate_plan(plan_path: Path) -> dict[str, Any] | None:
    """Rejects hidden legacy work and non-structured incomplete tasks.

    @param plan_path Product track plan.
    @returns A blocker, or ``None`` when completion markers are valid.
    """
    try:
        text = plan_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return _blocked("INCOMPLETE_TASK", path=str(plan_path))
    if re.search(r"^- \[ \] ", text, re.MULTILINE):
        return _blocked("LEGACY_PLAN_MARKER")
    for status, task in re.findall(r"^- \[([~xb])\] (.+)$", text, re.MULTILINE):
        structured_block = status == "b" and re.search(r"\bdeferred:[\w.-]+\b", task, re.IGNORECASE)
        if status == "x":
            continue
        if not structured_block:
            return _blocked("INCOMPLETE_TASK", task=task)
    return None


def _validate_catalog_and_archive(repo: Path, track_id: str) -> dict[str, Any] | None:
    """Validates catalog guard references and archive-aware track resolution.

    @param repo Repository root.
    @param track_id Product track identifier.
    @returns A blocker, or ``None`` when repository guard paths are current.
    """
    catalog_path = repo / "measure" / "anti-patterns.md"
    try:
        catalog = catalog_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return _blocked("CATALOG_GUARD_MISSING", path=str(catalog_path))
    references = {
        reference
        for line in catalog.splitlines()
        if line.startswith("**Guard:**")
        for reference in re.findall(r"tests/[A-Za-z0-9_./-]+\.sh", line)
    }
    for reference in sorted(references):
        if not (repo / reference).is_file():
            return _blocked("CATALOG_GUARD_MISSING", path=reference)
    active = repo / "measure" / "tracks" / track_id
    archived = repo / "measure" / "archive" / track_id
    if active.exists() and archived.exists():
        return _blocked("STALE_ARCHIVE_PATH", track=track_id)
    registry_path = repo / "measure" / "tracks.md"
    try:
        registry = registry_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return _blocked("STALE_ARCHIVE_PATH", path=str(registry_path))
    if active.exists() and f"./archive/{track_id}/" in registry:
        return _blocked("STALE_ARCHIVE_PATH", track=track_id)
    return None


def _validate_generated_facts(repo: Path) -> dict[str, Any] | None:
    """Rejects generated architecture facts stale after structural changes.

    @param repo Repository root.
    @returns A blocker, or ``None`` when generated facts cover structural HEAD changes.
    """
    facts = _load_object(repo / "measure" / "generated" / "architecture.json")
    revision = facts.get("sourceRevision") if facts else None
    if not isinstance(revision, str) or re.fullmatch(r"[0-9a-f]{40}", revision) is None:
        return _blocked("GENERATED_FACTS_STALE")
    if _run_git(repo, "cat-file", "-e", f"{revision}^{{commit}}").returncode != 0:
        return _blocked("GENERATED_FACTS_STALE", revision=revision)
    changed = _run_git(repo, "diff", "--name-only", revision, "--", "apps", "packages", "services")
    if changed.returncode != 0 or changed.stdout.strip():
        return _blocked("GENERATED_FACTS_STALE", changed=changed.stdout.splitlines())
    return None


def _dependency_gate_status(
    repo: Path, track_id: str, visited: frozenset[str] = frozenset()
) -> tuple[bool, dict[str, Any] | None]:
    """Resolves canonical dependencies until the integrity gate is reached.

    @param repo Repository root.
    @param track_id Track whose dependency chain is being inspected.
    @param visited Already visited track identifiers for cycle safety.
    @returns Whether the gate is reachable and any fail-closed dependency blocker.
    """
    if track_id == GATE_TRACK_ID:
        return True, None
    if track_id in visited:
        return False, _blocked("CANONICAL_DEPENDENCY_REQUIRED", track=track_id)
    active = repo / "measure" / "tracks" / track_id
    archived = repo / "measure" / "archive" / track_id
    if active.exists() and archived.exists():
        return False, _blocked("STALE_ARCHIVE_PATH", track=track_id)
    track_dir = archived if archived.exists() else active
    metadata = _load_object(track_dir / "metadata.json")
    if metadata is None:
        return False, _blocked("CANONICAL_DEPENDENCY_REQUIRED", track=track_id)
    if "dependencies" in metadata:
        return False, _blocked("LEGACY_DEPENDENCIES_FIELD", track=track_id)
    dependencies = metadata.get("depends_on")
    if not isinstance(dependencies, list) or not all(isinstance(item, str) and item for item in dependencies):
        return False, _blocked("CANONICAL_DEPENDENCY_REQUIRED", track=track_id)
    for dependency in dependencies:
        reaches_gate, blocker = _dependency_gate_status(
            repo, dependency, visited | {track_id}
        )
        if blocker and blocker["blockers"][0]["code"] in {
            "LEGACY_DEPENDENCIES_FIELD",
            "STALE_ARCHIVE_PATH",
        }:
            return False, blocker
        if reaches_gate:
            return True, None
    return False, None


def validate_supervisor_completion(
    repo: Path, track_id: str, *, stage: str = "completion"
) -> dict[str, Any]:
    """Validates evidence-integrity requirements before work or completion.

    @param repo Repository root.
    @param track_id Protected product track identifier.
    @param stage ``preflight`` before work or ``completion`` after tasks finish.
    @returns Versioned pass or fail-closed completion report.
    """
    if stage not in {"preflight", "completion"}:
        raise ValueError(f"unsupported supervisor gate stage: {stage}")
    repo = repo.resolve()
    track_dir = repo / "measure" / "tracks" / track_id
    metadata = _load_object(track_dir / "metadata.json")
    if metadata is None:
        return _blocked("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    reaches_gate, dependency_blocker = _dependency_gate_status(repo, track_id)
    if dependency_blocker:
        return dependency_blocker
    if not reaches_gate:
        return _blocked("CANONICAL_DEPENDENCY_REQUIRED")
    manifest, blocker = _validate_manifest(repo)
    if blocker:
        return blocker
    assert manifest is not None
    pin = metadata.get("evidence_integrity_gate")
    first_work_commit = metadata.get("first_work_commit")
    expected_pin = {
        "version": manifest["gate_version"],
        "commit": manifest["gate_commit"],
        "manifest_sha256": _sha256_bytes((repo / ACCEPTED_MANIFEST_PATH).read_bytes()),
        "files": manifest["files"],
    }
    if not isinstance(pin, Mapping) or not isinstance(first_work_commit, str):
        return _blocked("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    parent_metadata = _run_git(repo, "show", f"{first_work_commit}^:measure/tracks/{track_id}/metadata.json")
    if parent_metadata.returncode != 0:
        return _blocked("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    try:
        prior_pin = json.loads(parent_metadata.stdout).get("evidence_integrity_gate")
    except (json.JSONDecodeError, AttributeError):
        return _blocked("PRODUCT_GATE_PIN_REQUIRED_BEFORE_WORK")
    if dict(pin) != expected_pin or prior_pin != expected_pin:
        return _blocked("PRODUCT_GATE_PIN_MISMATCH")
    edited = _run_git(
        repo,
        "diff",
        "--name-only",
        f"{first_work_commit}^..HEAD",
        "--",
        *sorted(manifest["files"]),
    )
    if edited.returncode != 0 or edited.stdout.strip():
        return _blocked("PRODUCT_TRACK_EDITED_GATE", files=edited.stdout.splitlines())
    live_gate_blocker = _validate_live_gate_files(repo, manifest["files"])
    if live_gate_blocker:
        return live_gate_blocker
    checks = [_validate_catalog_and_archive(repo, track_id), _validate_generated_facts(repo)]
    if stage == "completion":
        checks.insert(0, _validate_plan(track_dir / "plan.md"))
    for check in checks:
        if check:
            return check
    return {
        "schema_version": SUPERVISOR_GATE_SCHEMA_VERSION,
        "ok": True,
        "state": f"{stage}_allowed",
        "blockers": [],
        "track_id": track_id,
        "gate_version": manifest["gate_version"],
        "gate_commit": manifest["gate_commit"],
        "manifest_sha256": expected_pin["manifest_sha256"],
    }


__all__ = [
    "ACCEPTED_MANIFEST_PATH",
    "GATE_TRACK_ID",
    "SUPERVISOR_GATE_SCHEMA_VERSION",
    "SUPERVISOR_REJECTION_CODES",
    "validate_supervisor_completion",
]
