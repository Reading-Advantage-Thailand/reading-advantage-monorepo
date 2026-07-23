#!/usr/bin/env python3
"""Acceptance contract for exact Phase 3 root-orchestrator evidence."""

import importlib.util
import json
import subprocess
import unittest
from pathlib import Path


TRACK = Path(__file__).resolve().parent


def load_generator():
    """Load the Phase 3 acceptance renderer."""
    path = TRACK / "generate_phase3_root_acceptance.py"
    spec = importlib.util.spec_from_file_location("phase3_acceptance_generator", path)
    if spec is None or spec.loader is None:
        raise AssertionError("acceptance generator module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Phase3AcceptanceTest(unittest.TestCase):
    """Proves root acceptance binds the complete reviewed Phase 3 output."""

    def test_root_acceptance_matches_exact_evidence(self) -> None:
        """The published acceptance must equal deterministic reviewed evidence."""
        contract = subprocess.run(
            ["python3", str(TRACK / "phase3-contract-test.py")],
            cwd=TRACK.parents[2],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(contract.returncode, 1)
        self.assertEqual(
            contract.stderr.strip(),
            "RED: Phase 3 inspection records and inspector receipts validate but "
            "remain unaccepted pending root-orchestrator fitness verification",
        )
        acceptance = json.loads(
            (TRACK / "phase3-root-acceptance.json").read_text(encoding="utf-8")
        )
        self.assertEqual(acceptance, load_generator().render_acceptance())


if __name__ == "__main__":
    unittest.main()
