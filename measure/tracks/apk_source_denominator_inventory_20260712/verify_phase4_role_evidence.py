"""Verify T2 truth-test and adversarial-review evidence before provider commits."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import subprocess
import sys
import tempfile
import unittest
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


def canonical_admission_command() -> str:
    """Builds the exact Phase0-3 admission command recorded in the truth report.

    Returns:
        Canonical sanitized admission command.
    """
    return (
        "/usr/bin/env -i "
        "PATH=/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin "
        "LANG=C PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 -I -S -m unittest -v "
        + " ".join(ADMISSION_MODULES)
    )


def run_phase0_3_admission() -> list[dict[str, Any]]:
    """Runs every frozen predecessor module and derives exact per-phase counts.

    Returns:
        Ordered structured inventory for Phase0 through Phase3.

    Raises:
        T2EvidenceVerificationError: When any test fails, errors, or skips.
    """
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))
    inventory: list[dict[str, Any]] = []
    for phase, module in enumerate(ADMISSION_MODULES):
        suite = unittest.defaultTestLoader.loadTestsFromName(module)
        stream = io.StringIO()
        result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
        failed = len(result.failures) + len(result.errors) + len(result.unexpectedSuccesses)
        skipped = len(result.skipped) + len(result.expectedFailures)
        passed = result.testsRun - failed - skipped
        if not result.wasSuccessful() or skipped != 0:
            diagnostic = stream.getvalue()
            if len(diagnostic.encode()) > _MAX_COMMAND_OUTPUT_BYTES:
                diagnostic = diagnostic.encode()[:_MAX_COMMAND_OUTPUT_BYTES].decode(
                    "utf-8", errors="replace"
                )
            raise T2EvidenceVerificationError(
                f"Phase{phase} admission failed or skipped tests: {diagnostic}"
            )
        inventory.append(
            {
                "phase": phase,
                "module": module,
                "tests": result.testsRun,
                "passed": passed,
                "failed": failed,
                "exit_code": 0,
            }
        )
    return inventory


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
        or report.get("test_inventory") != expected_inventory
        or report.get("phase0_3_admission_result") != expected_result
    ):
        raise T2EvidenceVerificationError("truth report admission summary differs from executed tests")
    if (
        not isinstance(stop_loss, Mapping)
        or stop_loss.get("unsupported_factual_claims") != 0
        or stop_loss.get("denominator_mismatches") != 0
        or stop_loss.get("failed_fix_review_cycles") != 0
        or unresolved != {severity: 0 for severity in BLOCKING_SEVERITIES}
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
    run_phase0_3_admission()
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
        or rerun.get("unresolved_source_count") != 0
        or rerun.get("reconciliation_status") != "reconciliation-complete"
        or rerun.get("coverage") != coverage
        or review.get("blocking_findings_by_severity")
        != {severity: 0 for severity in BLOCKING_SEVERITIES}
        or not isinstance(findings, list)
        or any(
            not isinstance(finding, Mapping)
            or str(finding.get("severity", "")).lower() in BLOCKING_SEVERITIES
            for finding in findings
        )
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
        inventory = run_phase0_3_admission()
        validate_truth_report(values.output, inventory, canonical_admission_command())
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
