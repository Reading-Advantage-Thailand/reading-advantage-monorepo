"""Run the authority-pinned T2 Phase0-3 admission inventory."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Mapping


REPO_ROOT = Path(__file__).resolve().parents[3]
ADMISSION_MODULES = (
    "measure.tests.test_apk_source_denominator_inventory_phase0",
    "measure.tests.test_apk_source_denominator_inventory_phase1",
    "measure.tests.test_apk_source_denominator_inventory_phase2",
    "measure.tests.test_apk_source_denominator_inventory_phase3",
)
EXPECTED_TEST_COUNTS = (13, 17, 31, 24)
_COMMIT_SHA = re.compile(r"[0-9a-f]{40}\Z")
_MAX_DIAGNOSTIC_BYTES = 1_048_576
_SANITIZED_ENV = {
    "PATH": "/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin",
    "LANG": "C",
    "PYTHONDONTWRITEBYTECODE": "1",
}
_MODULE_LAUNCHER = r'''
import io
import json
import sys
import unittest

root, module, phase_text, expected_text = sys.argv[1:]
phase = int(phase_text)
expected = int(expected_text)
sys.path.insert(0, root)
suite = unittest.defaultTestLoader.loadTestsFromName(module)
discovered = suite.countTestCases()
if discovered != expected or discovered <= 0:
    raise SystemExit(f"discovered {discovered} tests; expected {expected}")
stream = io.StringIO()
result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
failed = len(result.failures) + len(result.errors) + len(result.unexpectedSuccesses)
skipped = len(result.skipped) + len(result.expectedFailures)
passed = result.testsRun - failed - skipped
if (
    result.testsRun != expected
    or passed != expected
    or failed != 0
    or skipped != 0
    or not result.wasSuccessful()
):
    sys.stderr.write(stream.getvalue())
    raise SystemExit("admission module did not execute its exact passing inventory")
print(json.dumps({
    "phase": phase,
    "module": module,
    "tests": expected,
    "passed": expected,
    "failed": 0,
    "exit_code": 0,
}, sort_keys=True, separators=(",", ":")))
'''


class T2AdmissionError(RuntimeError):
    """Raised when the exact T2 predecessor admission is not fully Green."""


def _bounded_diagnostic(result: subprocess.CompletedProcess[bytes]) -> str:
    """Returns bounded subprocess diagnostics.

    Args:
        result: Completed subprocess result with captured bytes.

    Returns:
        Bounded decoded stdout and stderr.
    """
    combined = result.stdout + result.stderr
    return combined[:_MAX_DIAGNOSTIC_BYTES].decode("utf-8", errors="replace")


def _run_command(command: tuple[str, ...], cwd: Path, timeout: int) -> subprocess.CompletedProcess[bytes]:
    """Runs one sanitized, bounded local command.

    Args:
        command: Exact executable and arguments.
        cwd: Directory in which to run the command.
        timeout: Maximum runtime in seconds.

    Returns:
        Completed subprocess result.
    """
    return subprocess.run(
        command,
        cwd=cwd,
        env=_SANITIZED_ENV,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=timeout,
    )


def _validate_inventory_row(
    phase: int,
    module: str,
    expected_count: int,
    row: object,
) -> dict[str, Any]:
    """Validates one exact nonzero admission result.

    Args:
        phase: Expected phase number.
        module: Expected test module.
        expected_count: Exact required passing-test count.
        row: Parsed child-process result.

    Returns:
        Canonical admission inventory row.

    Raises:
        T2AdmissionError: When any field differs from the frozen inventory.
    """
    expected = {
        "phase": phase,
        "module": module,
        "tests": expected_count,
        "passed": expected_count,
        "failed": 0,
        "exit_code": 0,
    }
    if not isinstance(row, Mapping) or dict(row) != expected or expected_count <= 0:
        raise T2AdmissionError(
            f"Phase{phase} admission inventory differs from exact {expected_count}-test Green"
        )
    return expected


def _run_admission_at(repo_root: Path, revision: str) -> list[dict[str, Any]]:
    """Runs admission from a detached local clone of one exact revision.

    Args:
        repo_root: Source repository whose local objects are cloned without network access.
        revision: Exact authority commit to check out and execute.

    Returns:
        Ordered structured test inventory for Phase0 through Phase3.

    Raises:
        T2AdmissionError: When checkout, discovery, execution, or output differs.
    """
    if _COMMIT_SHA.fullmatch(revision) is None:
        raise T2AdmissionError("admission revision must be one full lowercase commit SHA")
    resolved_root = repo_root.resolve()
    if not (resolved_root / ".git").exists():
        raise T2AdmissionError("admission source is not a local Git repository")
    with tempfile.TemporaryDirectory(prefix="t2-admission-") as directory:
        checkout = Path(directory) / "repo"
        clone = _run_command(
            (
                "/usr/bin/git",
                "clone",
                "--no-local",
                "--no-checkout",
                "--quiet",
                str(resolved_root),
                str(checkout),
            ),
            resolved_root,
            300,
        )
        if clone.returncode != 0:
            raise T2AdmissionError(f"detached admission clone failed: {_bounded_diagnostic(clone)}")
        detached = _run_command(
            ("/usr/bin/git", "checkout", "--detach", "--quiet", revision),
            checkout,
            300,
        )
        if detached.returncode != 0:
            raise T2AdmissionError(
                f"detached admission checkout failed: {_bounded_diagnostic(detached)}"
            )

        inventory: list[dict[str, Any]] = []
        for phase, (module, expected_count) in enumerate(
            zip(ADMISSION_MODULES, EXPECTED_TEST_COUNTS, strict=True)
        ):
            result = _run_command(
                (
                    "/usr/bin/python3",
                    "-I",
                    "-S",
                    "-c",
                    _MODULE_LAUNCHER,
                    str(checkout),
                    module,
                    str(phase),
                    str(expected_count),
                ),
                checkout,
                900,
            )
            if (
                result.returncode != 0
                or len(result.stdout) > _MAX_DIAGNOSTIC_BYTES
                or len(result.stderr) > _MAX_DIAGNOSTIC_BYTES
            ):
                raise T2AdmissionError(
                    f"Phase{phase} detached admission failed: {_bounded_diagnostic(result)}"
                )
            try:
                row = json.loads(result.stdout)
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                raise T2AdmissionError(
                    f"Phase{phase} detached admission output is not JSON"
                ) from error
            inventory.append(_validate_inventory_row(phase, module, expected_count, row))
        return inventory


def run_admission(revision: str) -> list[dict[str, Any]]:
    """Runs the exact authority revision in a unique detached local clone.

    Args:
        revision: Exact authority commit containing all admission dependencies.

    Returns:
        Ordered structured test inventory for Phase0 through Phase3.
    """
    return _run_admission_at(REPO_ROOT, revision)


def main() -> None:
    """Prints only the bounded canonical JSON inventory after full Green execution.

    Returns:
        Nothing.
    """
    if len(sys.argv) != len(ADMISSION_MODULES) + 2 or tuple(sys.argv[2:]) != ADMISSION_MODULES:
        raise T2AdmissionError("admission arguments differ from the frozen module inventory")
    print(json.dumps(run_admission(sys.argv[1]), sort_keys=True, separators=(",", ":")))


if __name__ == "__main__":
    main()
