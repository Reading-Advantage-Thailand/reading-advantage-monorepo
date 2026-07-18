"""Verify T2 truth-test and adversarial-review evidence before provider commits."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shlex
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Mapping, Sequence


TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIRECTORY = f"measure/tracks/{TRACK}"
BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
REPO_ROOT = Path(__file__).resolve().parents[3]
PHASE3_PATH = f"{TRACK_DIRECTORY}/phase3-reconciliation.json"
PHASE2_RECEIPT_PATH = f"{TRACK_DIRECTORY}/role-receipts/evidence-collector.json"
ADMISSION_MODULES = (
    "measure.tests.test_apk_source_denominator_inventory_phase0",
    "measure.tests.test_apk_source_denominator_inventory_phase1",
    "measure.tests.test_apk_source_denominator_inventory_phase2",
    "measure.tests.test_apk_source_denominator_inventory_phase3",
)
ADMISSION_RUNNER_PATH = f"{TRACK_DIRECTORY}/run_phase0_3_admission.py"
REVIEW_COVERAGE_FIELDS = {
    "identities": "identity_reconciliation_records",
    "files": "file_reconciliation_records",
    "source_records": "source_record_reconciliation_records",
    "surfaces": "surface_reconciliation_records",
    "asset_candidates": "asset_candidate_reconciliation_records",
    "identical_hash_groups": "identical_hash_group_reconciliation_records",
    "copies": "copy_reconciliation_records",
    "history_and_discrepancies": "discrepancy_reconciliation_records",
}
BLOCKING_SEVERITIES = ("critical", "high", "medium")
_COMMIT = re.compile(r"[0-9a-f]{40}\Z")
_SHA256 = re.compile(r"[0-9a-f]{64}\Z")
_MAX_COMMAND_OUTPUT_BYTES = 1_048_576


class T2EvidenceVerificationError(RuntimeError):
    """Raised when final-role evidence differs from independently derived facts."""


def _canonical_json(value: object) -> bytes:
    """Serializes one value for type-exact structural comparison.

    Args:
        value: JSON-compatible value.

    Returns:
        Canonical compact JSON bytes.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def _strict_zero_counts(value: object, keys: Sequence[str]) -> bool:
    """Checks an exact key set of real integer zero counters.

    Args:
        value: Candidate counter mapping.
        keys: Exact required counter keys.

    Returns:
        Whether all counters are integer zero and none are booleans.
    """
    return (
        isinstance(value, Mapping)
        and set(value) == set(keys)
        and all(
            isinstance(value.get(key), int)
            and not isinstance(value.get(key), bool)
            and value.get(key) == 0
            for key in keys
        )
    )


def _strict_nonblocking_findings(value: object) -> bool:
    """Checks that every finding has one exact nonblocking severity.

    Args:
        value: Candidate findings collection.

    Returns:
        Whether all findings are mappings labeled exactly low or informational.
    """
    return isinstance(value, list) and all(
        isinstance(finding, Mapping)
        and isinstance(finding.get("severity"), str)
        and finding.get("severity") in {"low", "informational"}
        for finding in value
    )


def _sha256(value: bytes) -> str:
    """Returns the lowercase SHA-256 digest for exact bytes.

    Args:
        value: Bytes to hash.

    Returns:
        Lowercase hexadecimal digest.
    """
    return hashlib.sha256(value).hexdigest()


def _git_bytes(root: Path, revision: str, path: str) -> bytes:
    """Loads one exact committed repository blob.

    Args:
        root: Repository root.
        revision: Full or symbolic Git revision.
        path: Repository-relative blob path.

    Returns:
        Exact committed bytes.

    Raises:
        T2EvidenceVerificationError: When the blob cannot be resolved.
    """
    result = subprocess.run(
        ("/usr/bin/git", "show", f"{revision}:{path}"),
        cwd=root,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise T2EvidenceVerificationError(f"committed input is absent: {revision}:{path}")
    return result.stdout


def _json_object(path: Path) -> dict[str, Any]:
    """Loads one JSON object from a regular non-symlink file.

    Args:
        path: JSON artifact path.

    Returns:
        Parsed JSON object.

    Raises:
        T2EvidenceVerificationError: When the file or JSON shape is unsafe.
    """
    if not path.is_file() or path.is_symlink():
        raise T2EvidenceVerificationError(f"role output is not a regular file: {path}")
    try:
        value = json.loads(path.read_bytes())
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise T2EvidenceVerificationError(f"role output is not valid JSON: {path}") from error
    if not isinstance(value, dict):
        raise T2EvidenceVerificationError(f"role output must contain a JSON object: {path}")
    return value


def _admission_command_argv(phase0_revision: str) -> tuple[str, ...]:
    """Builds the exact sanitized pinned admission subprocess arguments.

    Args:
        phase0_revision: Successor authority commit containing the runner and tests.

    Returns:
        Exact immutable admission command arguments.
    """
    launcher = (
        "exec(compile(__import__(\"subprocess\").check_output((\"/usr/bin/git\",\"show\","
        f"__import__(\"sys\").argv.pop(1)+\":{ADMISSION_RUNNER_PATH}\")),"
        f"\"{ADMISSION_RUNNER_PATH}\",\"exec\"),dict(__file__=\"{ADMISSION_RUNNER_PATH}\",__name__=\"__main__\"))"
    )
    return (
        "/usr/bin/env",
        "-i",
        "PATH=/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin",
        "LANG=C",
        "PYTHONDONTWRITEBYTECODE=1",
        "/usr/bin/python3",
        "-I",
        "-S",
        "-c",
        launcher,
        phase0_revision,
        *ADMISSION_MODULES,
    )


def canonical_admission_command(phase0_revision: str) -> str:
    """Builds the exact Phase0-3 admission command recorded in the truth report.

    Returns:
        Canonical sanitized pinned admission command.
    """
    return shlex.join(_admission_command_argv(phase0_revision))


def run_phase0_3_admission(phase0_revision: str) -> list[dict[str, Any]]:
    """Runs every frozen predecessor module and derives exact per-phase counts.

    Returns:
        Exact subprocess-produced inventory for Phase0 through Phase3.

    Raises:
        T2EvidenceVerificationError: When any test fails, errors, or skips.
    """
    result = subprocess.run(
        _admission_command_argv(phase0_revision),
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=1800,
    )
    if (
        result.returncode != 0
        or len(result.stdout) > _MAX_COMMAND_OUTPUT_BYTES
        or len(result.stderr) > _MAX_COMMAND_OUTPUT_BYTES
    ):
        raise T2EvidenceVerificationError(
            "exact pinned Phase0-3 admission failed or exceeded its output bound"
        )
    try:
        inventory = json.loads(result.stdout)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise T2EvidenceVerificationError("pinned admission output is not JSON") from error
    expected_counts = (13, 17, 31, 24)
    if (
        not isinstance(inventory, list)
        or len(inventory) != len(ADMISSION_MODULES)
        or any(
            not isinstance(row, Mapping)
            or row.get("phase") != phase
            or row.get("module") != module
            or row.get("tests") != expected_counts[phase]
            or row.get("passed") != expected_counts[phase]
            or row.get("failed") != 0
            or row.get("exit_code") != 0
            for phase, (module, row) in enumerate(zip(ADMISSION_MODULES, inventory, strict=True))
        )
    ):
        raise T2EvidenceVerificationError("pinned admission inventory differs from exact nonzero counts")
    return [dict(row) for row in inventory]


def validate_truth_report(
    path: Path,
    inventory: Sequence[Mapping[str, Any]],
    admission_command: str,
) -> None:
    """Validates a provider-authored truth report against actual admission results.

    Args:
        path: Worktree report path awaiting its adjacent commit.
        inventory: Independently derived Phase0-3 test inventory.
        admission_command: Exact sanitized command the report must record.

    Returns:
        Nothing.

    Raises:
        T2EvidenceVerificationError: When the report overstates or changes evidence.
    """
    report = _json_object(path)
    expected_inventory = [dict(row) for row in inventory]
    total = sum(int(row["tests"]) for row in expected_inventory)
    expected_result = {
        "total_tests": total,
        "passed": total,
        "failed": 0,
        "exit_code": 0,
        "status": "passed",
    }
    stop_loss = report.get("stop_loss_counters")
    unresolved = stop_loss.get("unresolved_blocking_findings") if isinstance(stop_loss, Mapping) else None
    if (
        report.get("schema_version") != "apk-denominator-contract-test-report.v1"
        or report.get("status") != "red-contract-authored"
        or report.get("track_id") != TRACK
        or report.get("source_baseline_revision") != BASELINE
        or report.get("role") != "truth-test-author"
        or report.get("phase0_3_admission_command") != admission_command
        or _canonical_json(report.get("test_inventory"))
        != _canonical_json(expected_inventory)
        or _canonical_json(report.get("phase0_3_admission_result"))
        != _canonical_json(expected_result)
    ):
        raise T2EvidenceVerificationError("truth report admission summary differs from executed tests")
    if (
        not isinstance(stop_loss, Mapping)
        or not _strict_zero_counts(
            {key: stop_loss.get(key) for key in (
                "unsupported_factual_claims",
                "denominator_mismatches",
                "failed_fix_review_cycles",
            )},
            (
                "unsupported_factual_claims",
                "denominator_mismatches",
                "failed_fix_review_cycles",
            ),
        )
        or not _strict_zero_counts(unresolved, BLOCKING_SEVERITIES)
        or not isinstance(report.get("unsupported_claims_count"), int)
        or isinstance(report.get("unsupported_claims_count"), bool)
        or report.get("unsupported_claims_count") != 0
    ):
        raise T2EvidenceVerificationError("truth report stop-loss counters are nonzero or malformed")


def build_reviewed_input_ledger(
    root: Path,
    revision: str,
    required_paths: Sequence[str],
) -> list[dict[str, str]]:
    """Derives exact latest-commit references for all frozen reviewer inputs.

    Args:
        root: Repository root.
        revision: Review boundary commit.
        required_paths: Frozen ordered reviewed-input path set.

    Returns:
        Ordered exact revision, path, and SHA-256 ledger.

    Raises:
        T2EvidenceVerificationError: When a path or latest modifying commit is absent.
    """
    ledger: list[dict[str, str]] = []
    if len(required_paths) != len(set(required_paths)):
        raise T2EvidenceVerificationError("reviewed-input path authority contains duplicates")
    for path in required_paths:
        if not isinstance(path, str) or not path.startswith(f"{TRACK_DIRECTORY}/"):
            raise T2EvidenceVerificationError("reviewed-input path escapes the T2 track")
        result = subprocess.run(
            ("/usr/bin/git", "log", "-1", "--format=%H", revision, "--", path),
            cwd=root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            text=True,
        )
        commit = result.stdout.strip()
        if result.returncode != 0 or _COMMIT.fullmatch(commit) is None:
            raise T2EvidenceVerificationError(f"reviewed input has no committed owner: {path}")
        ledger.append({"revision": commit, "path": path, "sha256": _sha256(_git_bytes(root, commit, path))})
    return ledger


def _phase3_regeneration_command(
    phase0_revision: str,
    phase2_receipt_revision: str,
    output_path: Path,
) -> tuple[str, ...]:
    """Builds the exact isolated Phase3 temporary-regeneration argv.

    Args:
        phase0_revision: Successor authority commit containing the pinned generator.
        phase2_receipt_revision: Exact evidence receipt commit consumed by Phase3.
        output_path: Temporary destination outside the repository.

    Returns:
        Immutable sanitized command argument vector.
    """
    generator_path = f"{TRACK_DIRECTORY}/generate_phase3_reconciliation.py"
    launcher = (
        "exec(compile(__import__(\"subprocess\").check_output((\"/usr/bin/git\",\"show\","
        f"__import__(\"sys\").argv.pop(1)+\":{generator_path}\")),"
        f"\"{generator_path}\",\"exec\"),dict(__file__=\"{generator_path}\",__name__=\"__main__\"))"
    )
    return (
        "/usr/bin/env",
        "-i",
        "PATH=/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin",
        "LANG=C",
        "PYTHONDONTWRITEBYTECODE=1",
        "/usr/bin/python3",
        "-I",
        "-S",
        "-c",
        launcher,
        phase0_revision,
        "--phase2-receipt-revision",
        phase2_receipt_revision,
        "--output",
        str(output_path),
    )


def _regenerate_phase3(
    root: Path,
    phase0_revision: str,
    phase2_receipt_revision: str,
) -> bytes:
    """Regenerates Phase3 into a temporary file with bounded captured output.

    Args:
        root: Repository root.
        phase0_revision: Successor authority commit.
        phase2_receipt_revision: Exact selected Phase2 receipt commit.

    Returns:
        Exact regenerated Phase3 bytes.

    Raises:
        T2EvidenceVerificationError: When generation fails or output is oversized.
    """
    with tempfile.TemporaryDirectory(prefix="t2-phase3-review-") as directory:
        output_path = Path(directory) / "phase3-reconciliation.json"
        result = subprocess.run(
            _phase3_regeneration_command(
                phase0_revision, phase2_receipt_revision, output_path
            ),
            cwd=root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=900,
        )
        if (
            result.returncode != 0
            or len(result.stdout) > _MAX_COMMAND_OUTPUT_BYTES
            or len(result.stderr) > _MAX_COMMAND_OUTPUT_BYTES
            or not output_path.is_file()
            or output_path.is_symlink()
        ):
            raise T2EvidenceVerificationError(
                "Phase3 temporary regeneration failed or exceeded its output bound"
            )
        return output_path.read_bytes()


def validate_independent_review(
    path: Path,
    phase0_revision: str,
    phase2_receipt_revision: str,
    required_paths: Sequence[str],
) -> None:
    """Validates reviewer output against admission, regeneration, and Git-ledger facts.

    Args:
        path: Worktree review path awaiting its adjacent commit.
        phase0_revision: Successor authority commit.
        phase2_receipt_revision: Exact selected evidence receipt commit.
        required_paths: Frozen ordered reviewed-input set.

    Returns:
        Nothing.

    Raises:
        T2EvidenceVerificationError: When any review assertion is unsupported.
    """
    run_phase0_3_admission(phase0_revision)
    review = _json_object(path)
    head = subprocess.check_output(("/usr/bin/git", "rev-parse", "HEAD"), cwd=REPO_ROOT, text=True).strip()
    ledger = build_reviewed_input_ledger(REPO_ROOT, head, required_paths)
    phase3_bytes = _git_bytes(REPO_ROOT, head, PHASE3_PATH)
    phase3 = json.loads(phase3_bytes)
    regenerated = _regenerate_phase3(REPO_ROOT, phase0_revision, phase2_receipt_revision)
    if regenerated != phase3_bytes:
        raise T2EvidenceVerificationError("temporary Phase3 regeneration differs from committed bytes")
    if phase3.get("input_provenance", {}).get("phase2", {}).get("receipt_revision") != phase2_receipt_revision:
        raise T2EvidenceVerificationError("Phase3 provenance differs from the exact Phase2 receipt revision")
    coverage = {
        name: len(phase3.get(field, ()))
        for name, field in REVIEW_COVERAGE_FIELDS.items()
    }
    rerun = review.get("full_reconciliation_rerun")
    isolation = review.get("reviewer_isolation")
    reviewed = review.get("reviewed_input_ledger")
    findings = review.get("findings")
    phase3_ref = {"path": PHASE3_PATH, "sha256": _sha256(phase3_bytes)}
    if (
        review.get("schema_version") != "apk-denominator-independent-review.v1"
        or review.get("track_id") != TRACK
        or review.get("status") != "independent-review-complete"
        or review.get("source_baseline_revision") != BASELINE
        or review.get("reviewer_role") != "adversarial-reviewer"
        or not isinstance(isolation, Mapping)
        or isolation.get("fork_turns") != "none"
        or _SHA256.fullmatch(str(isolation.get("fresh_prompt_sha256", ""))) is None
        or review.get("phase3_reconciliation") != phase3_ref
        or not isinstance(reviewed, Mapping)
        or reviewed.get("artifact_refs") != ledger
        or not isinstance(rerun, Mapping)
        or rerun.get("status") != "passed"
        or rerun.get("source_baseline_revision") != BASELINE
        or rerun.get("phase2_receipt_revision") != phase2_receipt_revision
        or rerun.get("phase3_output_sha256") != phase3_ref["sha256"]
        or not isinstance(rerun.get("unresolved_source_count"), int)
        or isinstance(rerun.get("unresolved_source_count"), bool)
        or rerun.get("unresolved_source_count") != 0
        or rerun.get("reconciliation_status") != "reconciliation-complete"
        or _canonical_json(rerun.get("coverage")) != _canonical_json(coverage)
        or not _strict_zero_counts(
            review.get("blocking_findings_by_severity"), BLOCKING_SEVERITIES
        )
        or not _strict_nonblocking_findings(findings)
    ):
        raise T2EvidenceVerificationError("independent review differs from regenerated evidence")


def _parse_args(arguments: Sequence[str]) -> argparse.Namespace:
    """Parses the exact final-role verifier CLI.

    Args:
        arguments: Command-line arguments after the script name.

    Returns:
        Validated argument namespace.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--role", choices=("truth-test-author", "adversarial-reviewer"), required=True)
    parser.add_argument("--phase0-authority-revision", required=True)
    parser.add_argument("--phase2-receipt-revision")
    parser.add_argument("--output", type=Path, required=True)
    values = parser.parse_args(arguments)
    if _COMMIT.fullmatch(values.phase0_authority_revision) is None:
        parser.error("--phase0-authority-revision must be a full lowercase commit SHA")
    if values.role == "adversarial-reviewer":
        if _COMMIT.fullmatch(str(values.phase2_receipt_revision)) is None:
            parser.error("reviewer requires a full --phase2-receipt-revision")
    elif values.phase2_receipt_revision is not None:
        parser.error("truth-test-author may not select a Phase2 receipt")
    expected = TRACK_DIRECTORY + (
        "/denominator-contract-test-report.json"
        if values.role == "truth-test-author"
        else "/independent-review.json"
    )
    try:
        actual = values.output.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        actual = values.output.as_posix()
    if actual != expected:
        parser.error(f"--output must be {expected}")
    return values


def main(arguments: Sequence[str] | None = None) -> None:
    """Runs the exact fail-closed verifier selected by the frozen role authority.

    Args:
        arguments: Optional CLI argument override.

    Returns:
        Nothing.
    """
    values = _parse_args(sys.argv[1:] if arguments is None else arguments)
    if values.role == "truth-test-author":
        inventory = run_phase0_3_admission(values.phase0_authority_revision)
        validate_truth_report(
            values.output,
            inventory,
            canonical_admission_command(values.phase0_authority_revision),
        )
        return
    freeze = json.loads(_git_bytes(REPO_ROOT, values.phase0_authority_revision, f"{TRACK_DIRECTORY}/phase0-input-freeze.json"))
    required_paths = freeze.get("resource_accounting", {}).get("roles", {}).get(
        "adversarial-reviewer", {}
    ).get("required_artifact_paths")
    if not isinstance(required_paths, list):
        raise T2EvidenceVerificationError("frozen reviewer ledger authority is absent")
    validate_independent_review(
        values.output,
        values.phase0_authority_revision,
        values.phase2_receipt_revision,
        required_paths,
    )


if __name__ == "__main__":
    main()
