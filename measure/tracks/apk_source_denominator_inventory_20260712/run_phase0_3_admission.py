"""Run the immutable nonzero T2 Phase0-3 admission inventory."""

from __future__ import annotations

import io
import json
import sys
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
ADMISSION_MODULES = (
    "measure.tests.test_apk_source_denominator_inventory_phase0",
    "measure.tests.test_apk_source_denominator_inventory_phase1",
    "measure.tests.test_apk_source_denominator_inventory_phase2",
    "measure.tests.test_apk_source_denominator_inventory_phase3",
)
EXPECTED_TEST_COUNTS = (13, 17, 31, 24)
_MAX_DIAGNOSTIC_BYTES = 1_048_576


class T2AdmissionError(RuntimeError):
    """Raised when the exact T2 predecessor admission is not fully Green."""


def run_admission(
    loader: unittest.TestLoader | None = None,
) -> list[dict[str, Any]]:
    """Runs the exact pinned module set with fixed nonzero test counts.

    Args:
        loader: Optional test loader used only by focused falsification tests.

    Returns:
        Ordered structured test inventory for Phase0 through Phase3.

    Raises:
        T2AdmissionError: When discovery count, execution count, or result differs.
    """
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))
    selected_loader = loader or unittest.defaultTestLoader
    inventory: list[dict[str, Any]] = []
    for phase, (module, expected_count) in enumerate(
        zip(ADMISSION_MODULES, EXPECTED_TEST_COUNTS, strict=True)
    ):
        suite = selected_loader.loadTestsFromName(module)
        discovered = suite.countTestCases()
        if discovered != expected_count or discovered <= 0:
            raise T2AdmissionError(
                f"Phase{phase} discovered {discovered} tests; expected {expected_count}"
            )
        stream = io.StringIO()
        result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
        failed = len(result.failures) + len(result.errors) + len(result.unexpectedSuccesses)
        skipped = len(result.skipped) + len(result.expectedFailures)
        passed = result.testsRun - failed - skipped
        if (
            result.testsRun != expected_count
            or passed != expected_count
            or failed != 0
            or skipped != 0
            or not result.wasSuccessful()
        ):
            diagnostic = stream.getvalue().encode()[:_MAX_DIAGNOSTIC_BYTES].decode(
                "utf-8", errors="replace"
            )
            raise T2AdmissionError(
                f"Phase{phase} admission did not execute exactly {expected_count} passing tests: {diagnostic}"
            )
        inventory.append(
            {
                "phase": phase,
                "module": module,
                "tests": expected_count,
                "passed": expected_count,
                "failed": 0,
                "exit_code": 0,
            }
        )
    return inventory


def main() -> None:
    """Prints only the bounded canonical JSON inventory after full Green execution.

    Returns:
        Nothing.
    """
    print(json.dumps(run_admission(), sort_keys=True, separators=(",", ":")))


if __name__ == "__main__":
    main()
