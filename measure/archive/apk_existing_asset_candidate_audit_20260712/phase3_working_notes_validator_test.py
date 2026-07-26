#!/usr/bin/env python3
"""Regression test for exact Phase 3 working-note coverage."""

import subprocess
import unittest
from pathlib import Path


TRACK = Path(__file__).resolve().parent


class Phase3WorkingNotesValidatorTest(unittest.TestCase):
    """Proves partial direct evidence is exact without promoting it to acceptance."""

    def test_exact_direct_evidence_coverage_without_phase_acceptance(self) -> None:
        """The validator accepts 227 exact notes but does not promote official Phase 3 outputs."""
        result = subprocess.run(
            ["python3", str(TRACK / "phase3_working_notes_validator.py")],
            cwd=TRACK.parents[2],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            result.stdout.strip(),
            "VERIFIED_WORKING_NOTES: direct working notes 227/227; "
            "visual_or_video 131/131; text_or_data 77/77; "
            "unreadable_or_pointer 5/5; audio 14/14; "
            "working-note evidence is complete but Phase 3 acceptance remains governed "
            "by the official contract and independent inspector receipts",
        )


if __name__ == "__main__":
    unittest.main()
