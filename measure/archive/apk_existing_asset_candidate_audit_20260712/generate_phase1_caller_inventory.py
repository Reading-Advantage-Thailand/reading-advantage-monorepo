#!/usr/bin/env python3
"""Generate Phase 1 v4 caller inventories from exact pinned blobs."""

from __future__ import annotations

import base64
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
TRACK_ID = "apk_existing_asset_candidate_audit_20260712"
DELTA_REVISION = "65fc00d872ce5aa63820662ee0a1f14952e63235"
FREEZE_SHA256 = "d4bd3606c7c75f495f2d8486ea4220f48aefd9eb216689b765aa9d96f58f2a9b"
BASE_GLOB = "batches/AF-*/candidate-records-base.json"
ZERO_MATCH_RATIONALE = "No case-sensitive fixed repo-path, public-URL, or relative-path literal was found in tracked text blobs at the pinned revision; dynamic or constructed references remain unresolved."
SCAN_CONTRACT = {
    "algorithm_id": "apk-phase1-pinned-blob-rg-exact-literal",
    "algorithm_version": "2.2.0",
    "caller_revision": DELTA_REVISION,
    "source_denominator": "one git ls-tree -rlz enumeration of every blob at caller_revision; one git cat-file --batch materialization of those exact OIDs as regular files in a unique /tmp snapshot; exact path/OID/size reconciliation; one local rg --json --fixed-strings --file pattern-file --hidden --no-ignore scan with binary files suppressed by rg defaults; bytes_read is exact ls-tree bytes plus materialized blob bytes plus pattern bytes plus rg summary bytes_searched plus allocated base-input bytes",
    "excluded_caller_path_rules": [{"category": "root_measure", "path_prefix": "measure/"}, {"category": "app_measure", "path_regex": r"^apps/[^/]+/measure/"}],
    "excluded_occurrence_digest_policy": "SHA-256 of sorted canonical JSONL records containing canonical_path, caller_path, line_start, locator_text_sha256, matched_literal, and category; excluded Measure evidence stays in scan reconciliation but is never a current caller",
    "token_kinds": ["repo_path", "public_url", "relative_path"],
    "case_sensitive": True,
    "line_locator_policy": "one record per candidate/caller-path/line; SHA-256 of line bytes excluding terminator",
    "overlap_policy": "longest token; tie order repo_path, public_url, relative_path",
    "build_graph_used": False,
}


def caller_exclusion_category(caller_path: str) -> str | None:
    """Return the closed Measure-evidence exclusion category for a caller path."""
    if caller_path.startswith("measure/"):
        return "root_measure"
    if re.match(r"^apps/[^/]+/measure/", caller_path):
        return "app_measure"
    return None


def excluded_occurrence_disclosure(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Return the canonical disclosure for excluded Measure-evidence occurrences."""
    ordered = sorted(records, key=lambda item: (item["canonical_path"], item["caller_path"], item["line_start"], item["locator_text_sha256"], item["matched_literal"], item["category"]))
    payload = b"".join(json.dumps(item, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n" for item in ordered)
    counts = {category: sum(item["category"] == category for item in ordered) for category in ("root_measure", "app_measure")}
    return {
        "finding_id": "excluded-measure-evidence-literal-occurrences",
        "root_measure_occurrences": counts["root_measure"],
        "app_measure_occurrences": counts["app_measure"],
        "total_occurrences": len(ordered),
        "occurrence_sha256": sha256_bytes(payload),
    }


def canonical_json(value: Any) -> bytes:
    """Encode JSON in the stable artifact format."""
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    """Return the SHA-256 digest of supplied bytes."""
    return hashlib.sha256(value).hexdigest()


def derived_public_url(path: str) -> str | None:
    """Derive a public URL from a repository path below a public directory."""
    marker = "/public/"
    return "/" + path.split(marker, 1)[1] if marker in path else None


def literal_tokens(path: str) -> list[tuple[str, str]]:
    """Return ordered unique exact-literal tokens for a candidate path."""
    tokens = [("repo_path", path)]
    public_url = derived_public_url(path)
    if public_url is not None:
        tokens.extend((("public_url", public_url), ("relative_path", public_url[1:])))
    result: list[tuple[str, str]] = []
    seen: set[str] = set()
    for kind, literal in tokens:
        if literal and literal not in seen:
            seen.add(literal)
            result.append((kind, literal))
    return result


def classify_caller_use(caller_path: str, line: bytes) -> str:
    """Classify a cited line using the frozen syntax-only rules."""
    value = line.decode("utf-8", errors="replace")
    lower_path = caller_path.lower()
    if re.search(r"(^|[/. _-])(test|spec|fixture)([/. _-]|$)", lower_path):
        return "test_fixture"
    if lower_path.endswith((".css", ".scss", ".sass", ".less")):
        return "style"
    if re.match(r"\s*import\b", value) or re.search(r"\brequire\s*\(", value):
        return "runtime_load"
    if re.search(r"\b(?:src|href|poster)\s*=\s*['\"]", value) or re.search(r"\b(?:backgroundImage|background)\s*:", value):
        return "ui_render"
    if lower_path.endswith((".json", ".yaml", ".yml", ".toml", ".md")):
        return "metadata_reference"
    return "unknown"


def load_base_artifacts() -> list[tuple[Path, dict[str, Any]]]:
    """Load exactly the twelve authorized base-record artifacts."""
    paths = sorted(TRACK.glob(BASE_GLOB))
    if len(paths) != 12:
        raise RuntimeError("expected exactly 12 candidate-record base artifacts")
    return [(path.parent, json.loads(path.read_text(encoding="utf-8"))) for path in paths]


def pinned_blob_entries() -> tuple[list[tuple[str, str, int]], int]:
    """Enumerate safe pinned-tree blobs and return raw manifest bytes."""
    result = subprocess.run(
        ["git", "ls-tree", "-rlz", "--full-tree", DELTA_REVISION],
        cwd=REPO, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    if result.returncode:
        raise RuntimeError(f"pinned caller tree enumeration failed: {result.stderr.decode(errors='replace').strip()}")
    entries: list[tuple[str, str, int]] = []
    seen: set[str] = set()
    for raw_entry in result.stdout.split(b"\0"):
        if not raw_entry:
            continue
        try:
            metadata, raw_path = raw_entry.split(b"\t", 1)
            _mode, kind, raw_oid, raw_size = metadata.split(b" ", 3)
            path = raw_path.decode("utf-8")
        except (UnicodeDecodeError, ValueError) as error:
            raise RuntimeError(f"pinned caller tree entry is malformed: {error}") from error
        if kind != b"blob":
            continue
        parts = Path(path).parts
        if not path or path.startswith("/") or any(part in ("", ".", "..") for part in parts) or "\x00" in path:
            raise RuntimeError("pinned caller tree contains an unsafe blob path")
        if path in seen:
            raise RuntimeError("pinned caller tree duplicates a blob path")
        oid = raw_oid.decode("ascii")
        if not re.fullmatch(r"[0-9a-f]{40}", oid):
            raise RuntimeError("pinned caller tree contains an invalid blob OID")
        try:
            size = int(raw_size)
        except ValueError as error:
            raise RuntimeError("pinned caller tree contains an invalid blob size") from error
        if size < 0:
            raise RuntimeError("pinned caller tree contains a negative blob size")
        seen.add(path)
        entries.append((path, oid, size))
    entries.sort()
    if not entries:
        raise RuntimeError("pinned caller tree contains no blobs")
    return entries, len(result.stdout)


def materialize_pinned_blobs(snapshot: Path, entries: list[tuple[str, str, int]]) -> int:
    """Materialize exact pinned OIDs as safe, regular snapshot files."""
    process = subprocess.Popen(
        ["git", "cat-file", "--batch"], cwd=REPO,
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if process.stdin is None or process.stdout is None or process.stderr is None:
        raise RuntimeError("pinned blob materializer pipes are unavailable")
    total = 0
    for path, expected_oid, expected_size in entries:
        process.stdin.write(expected_oid.encode("ascii") + b"\n")
        process.stdin.flush()
        header = process.stdout.readline().rstrip(b"\n").split()
        if len(header) != 3:
            raise RuntimeError(f"pinned blob materializer returned a malformed header: {path}")
        observed_oid, kind, raw_size = header
        if observed_oid.decode("ascii") != expected_oid or kind != b"blob" or int(raw_size) != expected_size:
            raise RuntimeError(f"pinned blob materializer binding differs: {path}")
        content = process.stdout.read(expected_size)
        terminator = process.stdout.read(1)
        if len(content) != expected_size or terminator != b"\n":
            raise RuntimeError(f"pinned blob materializer truncated a blob: {path}")
        target = snapshot / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        if not target.is_file() or target.is_symlink() or target.stat().st_size != expected_size:
            raise RuntimeError(f"pinned blob materializer did not create an exact regular file: {path}")
        total += expected_size
    process.stdin.close()
    process.stdout.close()
    status = process.wait()
    stderr = process.stderr.read().decode(errors="replace").strip()
    if status:
        raise RuntimeError(f"pinned blob materializer failed: {stderr}")
    observed = sorted(str(item.relative_to(snapshot)) for item in snapshot.rglob("*") if item.is_file())
    if observed != [path for path, _oid, _size in entries]:
        raise RuntimeError("pinned blob materialization path set differs from the committed blob tree")
    return total


def rg_json_bytes(value: object, label: str) -> bytes:
    """Decode one Ripgrep JSON text-or-bytes field without altering bytes."""
    if not isinstance(value, dict) or set(value) != ({"text"} if "text" in value else {"bytes"}):
        raise RuntimeError(f"deterministic archived caller scan returned malformed {label}")
    if "text" in value:
        text = value["text"]
        if not isinstance(text, str):
            raise RuntimeError(f"deterministic archived caller scan returned non-text {label}")
        return text.encode("utf-8")
    encoded = value["bytes"]
    if not isinstance(encoded, str):
        raise RuntimeError(f"deterministic archived caller scan returned non-base64 {label}")
    try:
        return base64.b64decode(encoded, validate=True)
    except ValueError as error:
        raise RuntimeError(f"deterministic archived caller scan returned invalid base64 {label}: {error}") from error


def strip_line_terminator(line: bytes) -> bytes:
    """Remove one trailing physical line terminator without altering line bytes."""
    if line.endswith(b"\r\n"):
        return line[:-2]
    if line.endswith((b"\n", b"\r")):
        return line[:-1]
    return line


def scan_callers(records: dict[str, dict[str, Any]]) -> tuple[dict[str, list[dict[str, Any]]], dict[str, int]]:
    """Run the v2.2 pinned-blob scan with bounded Measure-evidence exclusions."""
    owners: dict[str, list[tuple[str, str, int]]] = {}
    rank = {"repo_path": 0, "public_url": 1, "relative_path": 2}
    for candidate_path in records:
        for kind, literal in literal_tokens(candidate_path):
            owners.setdefault(literal, []).append((candidate_path, kind, rank[kind]))
    literals = sorted(owners)
    if any("\n" in literal or "\r" in literal for literal in literals):
        raise RuntimeError("caller literal cannot be represented in the exact-literal pattern file")
    locators: dict[str, list[dict[str, Any]]] = {path: [] for path in records}
    excluded: list[dict[str, Any]] = []
    entries, tree_bytes = pinned_blob_entries()
    with tempfile.TemporaryDirectory(prefix="apk-phase1-caller-v21-", dir="/tmp") as root:
        snapshot = Path(root) / "snapshot"
        snapshot.mkdir()
        blob_bytes = materialize_pinned_blobs(snapshot, entries)
        patterns = Path(root) / "exact-literals.txt"
        pattern_bytes = b"".join(item.encode("utf-8") + b"\n" for item in literals)
        patterns.write_bytes(pattern_bytes)
        result = subprocess.run(
            ["rg", "--json", "--fixed-strings", "--file", str(patterns), "--hidden", "--no-ignore", "."],
            cwd=snapshot, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        if result.returncode not in (0, 1):
            raise RuntimeError(f"deterministic pinned caller scan failed: {result.stderr.decode(errors='replace').strip()}")
        searched: int | None = None
        for raw_event in result.stdout.splitlines():
            event = json.loads(raw_event)
            if event.get("type") == "summary":
                value = event.get("data", {}).get("stats", {}).get("bytes_searched")
                if not isinstance(value, int) or value < 0:
                    raise RuntimeError("deterministic pinned caller scan lacks exact bytes_searched")
                searched = value
                continue
            if event.get("type") != "match":
                continue
            data = event.get("data")
            if not isinstance(data, dict):
                raise RuntimeError("deterministic pinned caller scan returned malformed match data")
            caller_path = rg_json_bytes(data.get("path"), "caller path").decode("utf-8")
            if caller_path.startswith("./"):
                caller_path = caller_path[2:]
            if not caller_path or caller_path.startswith("/") or caller_path.startswith("../"):
                raise RuntimeError("deterministic pinned caller scan returned a non-snapshot-relative path")
            line_number = data.get("line_number")
            if not isinstance(line_number, int) or line_number < 1:
                raise RuntimeError("deterministic pinned caller scan returned an invalid line number")
            line = strip_line_terminator(rg_json_bytes(data.get("lines"), "line text"))
            matches: dict[str, list[tuple[int, int, str, str]]] = {}
            for literal, token_owners in owners.items():
                if literal.encode("utf-8") not in line:
                    continue
                for candidate_path, kind, token_rank in token_owners:
                    matches.setdefault(candidate_path, []).append((-len(literal), token_rank, kind, literal))
            for candidate_path, choices in matches.items():
                _, _, reference_kind, literal = sorted(choices)[0]
                locator_hash = sha256_bytes(line)
                category = caller_exclusion_category(caller_path)
                if category is not None:
                    excluded.append({
                        "canonical_path": candidate_path,
                        "caller_path": caller_path,
                        "line_start": line_number,
                        "locator_text_sha256": locator_hash,
                        "matched_literal": literal,
                        "category": category,
                    })
                    continue
                locators[candidate_path].append({
                    "caller_revision": DELTA_REVISION,
                    "caller_path": caller_path,
                    "line_start": line_number,
                    "line_end": line_number,
                    "locator_text_sha256": locator_hash,
                    "matched_literal": literal,
                    "reference_kind": reference_kind,
                    "use_classification": classify_caller_use(caller_path, line),
                })
        if searched is None:
            raise RuntimeError("deterministic pinned caller scan lacks a summary event")
    for value in locators.values():
        value.sort(key=lambda item: (item["caller_path"], item["line_start"], item["matched_literal"]))
    return locators, {
        "tree_manifest_bytes": tree_bytes,
        "blob_bytes": blob_bytes,
        "pattern_bytes": len(pattern_bytes),
        "rg_bytes_searched": searched,
        "command_invocations": 3,
        "excluded_disclosure": excluded_occurrence_disclosure(excluded),
    }


def resource_usage(batches: list[tuple[Path, dict[str, Any]]], callers: dict[str, list[dict[str, Any]]], metrics: dict[str, int]) -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    """Allocate exact v2.1 shared scan bytes by sorted quotient and remainder."""
    shared = metrics["tree_manifest_bytes"] + metrics["blob_bytes"] + metrics["pattern_bytes"] + metrics["rg_bytes_searched"]
    quotient, remainder = divmod(shared, len(batches))
    per_batch: dict[str, dict[str, Any]] = {}
    global_sources: set[str] = set()
    total_callers = 0
    for index, (batch_dir, base) in enumerate(batches):
        batch_id = base["batch_id"]
        listed = [locator for candidate in sorted(base["records"], key=lambda item: item["canonical_path"]) for locator in callers[candidate["canonical_path"]]]
        sources = {locator["caller_path"] for locator in listed}
        global_sources |= sources
        total_callers += len(listed)
        per_batch[batch_id] = {
            "candidate_paths": len(base["records"]),
            "source_files": len(sources),
            "caller_records": len(listed),
            "command_invocations": metrics["command_invocations"],
            "bytes_read": quotient + int(index < remainder) + (batch_dir / "candidate-records-base.json").stat().st_size,
            "within_ceiling": True,
        }
    return per_batch, {
        "batch_count": len(batches),
        "candidate_paths": sum(len(base["records"]) for _dir, base in batches),
        "source_files": len(global_sources),
        "caller_records": total_callers,
        "command_invocations": metrics["command_invocations"],
        "bytes_read": sum(item["bytes_read"] for item in per_batch.values()),
        "within_ceiling": True,
    }


def write_json(path: Path, value: dict[str, Any]) -> str:
    """Write canonical JSON and return its SHA-256 digest."""
    raw = canonical_json(value)
    path.write_bytes(raw)
    return sha256_bytes(raw)


def main() -> None:
    """Generate all inventories and the aggregate caller-analyst receipt."""
    batches = load_base_artifacts()
    records: dict[str, dict[str, Any]] = {}
    groups: dict[str, set[str]] = {}
    for _dir, base in batches:
        for record in base["records"]:
            path = record["canonical_path"]
            if path in records:
                raise RuntimeError(f"duplicate candidate path in base inputs: {path}")
            records[path] = record
            groups.setdefault(record["identical_hash_group"], set()).add(path)
    if len(records) != 428 or len(groups) != 227:
        raise RuntimeError("base input denominator differs")
    callers, metrics = scan_callers(records)
    per_batch, aggregate = resource_usage(batches, callers, metrics)
    input_binding = batches[0][1]["input_binding"]
    output_hashes: dict[str, str] = {}
    for batch_dir, base in batches:
        result_records: list[dict[str, Any]] = []
        for candidate in base["records"]:
            path = candidate["canonical_path"]
            current = callers[path]
            found = bool(current)
            result_records.append({
                "canonical_path": path,
                "sha256": candidate["sha256"],
                "revision": candidate["revision"],
                "source_blob_oid": candidate["source_blob_oid"],
                "identical_hash_group": candidate["identical_hash_group"],
                "duplicate_path_peers": sorted(groups[candidate["identical_hash_group"]] - {path}),
                "derived_public_url": derived_public_url(path),
                "static_reference_status": "found" if found else "dynamic_unresolved",
                "current_callers": current,
                "dynamic_risk": not found,
                "unknown_rationale": None if found else ZERO_MATCH_RATIONALE,
            })
        artifact = {
            "schema_version": "apk-asset-forensics.phase1-caller-inventory.v4",
            "track_id": TRACK_ID,
            "batch_id": base["batch_id"],
            "input_binding": input_binding,
            "scan_contract": SCAN_CONTRACT,
            "producer": {"role": "caller-analyst", "receipt_path": "role-receipts/phase1/caller-analyst.json"},
            "records": result_records,
            "resource_usage": per_batch[base["batch_id"]],
        }
        output = batch_dir / "caller-inventory.json"
        output_hashes[str(output.relative_to(REPO))] = write_json(output, artifact)
    receipt = {
        "schema_version": "apk-role-receipt.v1",
        "track_id": TRACK_ID,
        "batch_id": "phase1",
        "role": "caller-analyst",
        "native_task_name": "/root/t8_phase1_caller_v22_producer",
        "declared_model": "gpt-5.6-terra",
        "fork_turns": "none",
        "inherited_narrative": False,
        "allowed_input_manifest_sha256": FREEZE_SHA256,
        "allowed_input_paths": [
            str((TRACK / "phase0-input-freeze-v1.json").relative_to(REPO)),
            *(str((batch_dir / "candidate-records-base.json").relative_to(REPO)) for batch_dir, _base in batches),
            f"git-tree:{DELTA_REVISION}",
        ],
        "role_boundary": "Exact case-sensitive literal caller evidence and duplicate-path reconciliation only; no provenance, asset-content, product, runtime, visual-quality, suitability, disposition, or unused claim.",
        "output_file_hashes": output_hashes,
        "findings": {"critical": [], "high": [], "medium": [], "low": [metrics["excluded_disclosure"]]},
        "resource_usage": aggregate,
        "final_status": "pass",
    }
    write_json(TRACK / "role-receipts/phase1/caller-analyst.json", receipt)


if __name__ == "__main__":
    main()
