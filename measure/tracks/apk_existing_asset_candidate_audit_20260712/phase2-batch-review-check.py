#!/usr/bin/env python3
"""Run the bounded, read-only Phase 2 adversarial batch verification.

The helper is deliberately a reviewer aid, not a producer.  It reuses the
current Phase 2 admission contract for frozen-input, provenance-artifact, and
receipt validation, then adds the two checks the admission contract correctly
does not claim: per-path addition-history counting and a bounded canonical-path
search of non-Measure text at the two frozen source revisions.  It writes no
files and emits one deterministic JSON object on stdout.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from types import ModuleType


TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
FREEZE_PATH = TRACK / "phase2-input-freeze-v1.json"
CONTRACT_PATH = TRACK / "forensics-contract-tests.py"
FROZEN_BATCH_IDS = tuple(f"AF-{number:02d}" for number in range(1, 13))
STATE_NAMES = ("repository_introduction", "upstream_provenance", "license")
SOURCE_REVISIONS = (
    "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286",
    "65fc00d872ce5aa63820662ee0a1f14952e63235",
)


def sha256_file(path: Path) -> str:
    """Return the SHA-256 digest for one exact local artifact.

    Args:
        path: Artifact to hash without changing it.

    Returns:
        Lowercase hexadecimal digest of the artifact bytes.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict:
    """Load one JSON-object artifact without changing it.

    Args:
        path: JSON artifact to load.

    Returns:
        Parsed JSON object.

    Raises:
        ValueError: If the JSON root is not an object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"JSON root is not an object: {path.relative_to(REPO)}")
    return value


def import_contract() -> ModuleType:
    """Import the current Phase 2 contract without producing bytecode files.

    Returns:
        Loaded Phase 2 contract module.

    Raises:
        RuntimeError: If the contract module cannot be loaded.
    """
    specification = importlib.util.spec_from_file_location("apk_phase2_contract", CONTRACT_PATH)
    if specification is None or specification.loader is None:
        raise RuntimeError("unable to load Phase 2 contract module")
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


def parse_batch_id(value: str) -> str:
    """Reject any batch identifier outside the frozen twelve-batch authority.

    Args:
        value: CLI batch identifier.

    Returns:
        The accepted frozen batch identifier.

    Raises:
        argparse.ArgumentTypeError: If the value is not one frozen batch ID.
    """
    if value not in FROZEN_BATCH_IDS:
        raise argparse.ArgumentTypeError("batch_id must be one frozen ID from AF-01 through AF-12")
    return value


def exact_batch_hash_mismatches(freeze: dict, batch_id: str) -> list[str]:
    """Compare this batch's three predecessor files to their frozen hashes.

    Args:
        freeze: Parsed Phase 2 input freeze.
        batch_id: Frozen batch identifier being reviewed.

    Returns:
        Stable mismatch descriptions, empty when all exact bytes match.
    """
    expected = freeze.get("phase1_batch_inputs", {}).get(batch_id)
    if not isinstance(expected, dict):
        return [f"{batch_id} missing frozen Phase 1 hash map"]
    mismatches: list[str] = []
    for relative_path, required_hash in sorted(expected.items()):
        path = REPO / relative_path
        if not path.is_file():
            mismatches.append(f"missing frozen Phase 1 input: {relative_path}")
        elif sha256_file(path) != required_hash:
            mismatches.append(f"frozen Phase 1 input hash drift: {relative_path}")
    return mismatches


def make_counted_git(contract: ModuleType) -> tuple[Callable[..., bytes], Callable[..., bytes], Callable[[], int]]:
    """Wrap contract Git reads and reviewer Git reads in one subprocess counter.

    Args:
        contract: Imported Phase 2 admission contract.

    Returns:
        Counted contract Git callable, reviewer Git callable, and count accessor.
    """
    count = 0
    original_git = contract.git

    def counted_contract_git(*args: str) -> bytes:
        """Run one contract Git read while recording the subprocess count."""
        nonlocal count
        count += 1
        return original_git(*args)

    def reviewer_git(*args: str, accepted_returncodes: set[int] | None = None) -> bytes:
        """Run one bounded reviewer Git read while recording the subprocess count."""
        nonlocal count
        count += 1
        result = subprocess.run(
            ["git", *args],
            cwd=REPO,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        allowed = {0} if accepted_returncodes is None else accepted_returncodes
        if result.returncode not in allowed:
            message = result.stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"git {' '.join(args)} failed: {message}")
        return result.stdout

    def git_count() -> int:
        """Return the total internal read-only Git subprocess count."""
        return count

    contract.git = counted_contract_git
    return counted_contract_git, reviewer_git, git_count


def artifact_counts(artifact: dict, expected_paths: set[str], records: dict[str, dict]) -> dict:
    """Derive reviewer-visible counts without changing artifact interpretation.

    Args:
        artifact: Contract-validated provenance artifact.
        expected_paths: Frozen canonical paths for the batch.
        records: Frozen effective denominator records.

    Returns:
        Deterministic counts summarizing validated record states and resources.
    """
    items = artifact.get("records", [])
    state_objects = 0
    unknown_objects = 0
    citations = 0
    eligibility_anomalies = 0
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        statuses: dict[str, str] = {}
        for name in STATE_NAMES:
            state = item.get(name)
            if not isinstance(state, dict):
                continue
            state_objects += 1
            if state.get("status") == "unknown":
                unknown_objects += 1
            citations_value = state.get("citations")
            if isinstance(citations_value, list):
                citations += len(citations_value)
            statuses[name] = str(state.get("status"))
        eligibility = item.get("prospective_eligibility")
        complete = statuses.get("upstream_provenance") == "evidenced" and statuses.get("license") == "evidenced"
        expected_eligibility = (
            {"reuse": "eligible_for_later_evaluation", "adapt": "eligible_for_later_evaluation", "reason_code": "evidence_complete_pending_later_evaluation"}
            if complete
            else {"reuse": "blocked", "adapt": "blocked", "reason_code": "evidence_incomplete"}
        )
        if eligibility != expected_eligibility:
            eligibility_anomalies += 1
    groups = {records[path]["identical_hash_group"] for path in expected_paths}
    usage = artifact.get("resource_usage", {})
    return {
        "frozen_candidate_paths": len(expected_paths),
        "frozen_hash_groups": len(groups),
        "reviewed_candidate_paths": len(items) if isinstance(items, list) else 0,
        "reviewed_hash_groups": len({item.get("identical_hash_group") for item in items if isinstance(item, dict)}) if isinstance(items, list) else 0,
        "provenance_state_objects": state_objects,
        "unknown_state_objects": unknown_objects,
        "citation_objects": citations,
        "eligibility_pairing_anomalies": eligibility_anomalies,
        "artifact_resource_usage": usage,
    }


def count_addition_history(paths: set[str], reviewer_git: Callable[..., bytes]) -> tuple[dict[str, int], list[str]]:
    """Count exact-path Git addition commits without treating history as evidence.

    Args:
        paths: Frozen canonical paths for the batch.
        reviewer_git: Counted read-only Git runner.

    Returns:
        Per-path addition counts and paths with no recorded exact-path addition.
    """
    counts: dict[str, int] = {}
    missing: list[str] = []
    for path in sorted(paths):
        output = reviewer_git("log", "--all", "--format=%H", "--diff-filter=A", "--", path)
        additions = [line for line in output.decode("ascii", errors="strict").splitlines() if line]
        counts[path] = len(additions)
        if not additions:
            missing.append(path)
    return counts, missing


def parse_git_grep_hits(revision: str, output: bytes) -> list[dict[str, object]]:
    """Parse stable line-oriented Git grep results into reviewer inspection hits.

    Args:
        revision: Pinned tree revision searched.
        output: Git grep standard output.

    Returns:
        Sorted path, line, and source-text hits for reviewer inspection.
    """
    hits: list[dict[str, object]] = []
    pattern = re.compile(r"^(?:(?:[^:]+):)?(.+?):(\d+):(.*)$")
    for line in output.decode("utf-8", errors="replace").splitlines():
        match = pattern.match(line)
        if match is None:
            hits.append({"revision": revision, "unparsed": line})
        else:
            hits.append({"revision": revision, "caller_path": match.group(1), "line": int(match.group(2)), "text": match.group(3)})
    return sorted(hits, key=lambda hit: json.dumps(hit, sort_keys=True, separators=(",", ":")))


def search_non_measure_paths(paths: set[str], reviewer_git: Callable[..., bytes]) -> dict[str, list[dict[str, object]]]:
    """Search exact canonical paths in non-Measure tracked text at both revisions.

    Args:
        paths: Frozen canonical paths used as fixed-string needles.
        reviewer_git: Counted read-only Git runner.

    Returns:
        Reviewer-inspection hits keyed by each frozen source revision.
    """
    patterns: list[str] = []
    for path in sorted(paths):
        patterns.extend(("-e", path))
    results: dict[str, list[dict[str, object]]] = {}
    for revision in SOURCE_REVISIONS:
        output = reviewer_git(
            "grep",
            "-n",
            "-I",
            "-F",
            *patterns,
            revision,
            "--",
            ".",
            ":(exclude)measure/**",
            ":(exclude)apps/*/measure/**",
            accepted_returncodes={0, 1},
        )
        results[revision] = parse_git_grep_hits(revision, output)
    return results


def review(batch_id: str) -> tuple[dict, int]:
    """Validate one frozen batch and return its deterministic reviewer report.

    Args:
        batch_id: Frozen Phase 2 batch identifier.

    Returns:
        JSON-compatible report object and its required process exit code.
    """
    mismatches: list[str] = []
    hits: dict[str, list[dict[str, object]]] = {revision: [] for revision in SOURCE_REVISIONS}
    history_counts: dict[str, int] = {}
    counts: dict[str, object] = {}
    contract_hash = sha256_file(CONTRACT_PATH) if CONTRACT_PATH.is_file() else None
    try:
        freeze = load_json(FREEZE_PATH)
        mismatches.extend(exact_batch_hash_mismatches(freeze, batch_id))
        contract = import_contract()
        _contract_git, reviewer_git, git_count = make_counted_git(contract)
        try:
            _freeze, phase0, candidate_delta = contract.assert_phase1_bindings()
            records = contract.effective_records(candidate_delta)
            batches = contract.expected_batches(phase0, records)
            expected_paths = batches[batch_id]
            artifact_path = contract.output_paths([batch_id])[batch_id]
            if not artifact_path.is_file():
                raise AssertionError(f"{batch_id} provenance artifact is missing")
            artifact_usage = contract.assert_artifact(artifact_path, batch_id, expected_paths, records)
            contract.assert_receipt(artifact_path, batch_id, expected_paths, records, artifact_usage)
            artifact = load_json(artifact_path)
            counts = artifact_counts(artifact, expected_paths, records)
            counts["artifact_receipt_resource_differences"] = 0
            history_counts, missing_history = count_addition_history(expected_paths, reviewer_git)
            counts["history_addition_missing"] = len(missing_history)
            counts["history_addition_paths_checked"] = len(history_counts)
            if missing_history:
                mismatches.append("path-specific Git addition history missing: " + ", ".join(missing_history))
            hits = search_non_measure_paths(expected_paths, reviewer_git)
            counts["non_measure_path_explicit_hits"] = {revision: len(value) for revision, value in hits.items()}
            counts["internal_git_subprocesses"] = git_count()
            if git_count() > 120:
                mismatches.append(f"reviewer Git subprocess ceiling exceeded: {git_count()} > 120")
        except (AssertionError, OSError, RuntimeError, ValueError, KeyError, TypeError) as error:
            mismatches.append(str(error))
            counts["internal_git_subprocesses"] = git_count()
    except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as error:
        mismatches.append(str(error))
        counts.setdefault("internal_git_subprocesses", 0)
    report = {
        "schema_version": "apk-asset-forensics.phase2-batch-review-check.v1",
        "track_id": "apk_existing_asset_candidate_audit_20260712",
        "phase": "phase2",
        "batch_id": batch_id,
        "contract_sha256": contract_hash,
        "counts": counts,
        "history_addition_counts": history_counts,
        "mismatches": sorted(set(mismatches)),
        "hits": hits,
    }
    needs_inspection = any(hits.values())
    exit_code = 1 if report["mismatches"] or needs_inspection else 0
    report["decision"] = {
        "status": "pass" if exit_code == 0 else "reviewer_inspection_required" if needs_inspection and not report["mismatches"] else "mismatch",
        "admit": exit_code == 0,
        "reason": "all frozen checks passed with no admissible path-explicit non-Measure hit" if exit_code == 0 else "mismatch or admissible path-explicit hit requires reviewer inspection",
    }
    return report, exit_code


def main() -> int:
    """Parse the frozen batch ID, emit one JSON report, and return its status.

    Returns:
        Zero only when every frozen check passes and neither pinned-tree search hits.
    """
    parser = argparse.ArgumentParser(description="Read-only T8 Phase 2 batch reviewer verifier")
    parser.add_argument("batch_id", type=parse_batch_id, help="frozen batch ID, AF-01 through AF-12")
    arguments = parser.parse_args()
    report, exit_code = review(arguments.batch_id)
    print(json.dumps(report, sort_keys=True, separators=(",", ":"), ensure_ascii=False))
    return exit_code


if __name__ == "__main__":
    sys.dont_write_bytecode = True
    raise SystemExit(main())
