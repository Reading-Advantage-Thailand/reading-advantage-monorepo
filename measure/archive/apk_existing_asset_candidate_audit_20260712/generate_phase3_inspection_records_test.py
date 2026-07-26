#!/usr/bin/env python3
"""Regression test for decision-free Phase 3 inspection-record rendering."""

import subprocess
import unittest
from pathlib import Path


TRACK = Path(__file__).resolve().parent


class GeneratePhase3InspectionRecordsTest(unittest.TestCase):
    """Proves the renderer accepts only complete frozen working evidence."""

    def test_check_reconciles_all_groups_without_writing_records(self) -> None:
        """The check mode requires all 227 observations and classifications."""
        result = subprocess.run(
            ["python3", str(TRACK / "generate_phase3_inspection_records.py"), "--check"],
            cwd=TRACK.parents[2],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            result.stdout.strip(),
            "READY: 227/227 frozen groups have direct observations and explicit classifications; "
            "no official inspection records written",
        )


if __name__ == "__main__":
    unittest.main()
