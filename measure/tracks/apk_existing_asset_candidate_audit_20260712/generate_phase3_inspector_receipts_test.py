#!/usr/bin/env python3
"""Regression tests for deterministic Phase 3 inspector receipts."""

import importlib.util
import unittest
from pathlib import Path


TRACK = Path(__file__).resolve().parent


def load_generator():
    """Load the receipt generator from its file path."""
    path = TRACK / "generate_phase3_inspector_receipts.py"
    spec = importlib.util.spec_from_file_location("phase3_receipt_generator", path)
    if spec is None or spec.loader is None:
        raise AssertionError("receipt generator module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Phase3InspectorReceiptGeneratorTest(unittest.TestCase):
    """Proves receipt rendering stays bound to reviewed official records."""

    def test_renders_exact_closed_denominator(self) -> None:
        """The renderer covers all batches/groups and marks only audio as multimodal."""
        receipts = load_generator().render_receipts()
        self.assertEqual(sorted(receipts), [f"AF-{index:02d}" for index in range(1, 13)])
        groups = [
            group
            for receipt in receipts.values()
            for group in receipt["reviewed_groups"]
        ]
        self.assertEqual(len(groups), 227)
        self.assertEqual(
            sum(group["audio_capable_multimodal"] for group in groups),
            14,
        )
        self.assertTrue(all(group["direct_inspection_confirmed"] for group in groups))


if __name__ == "__main__":
    unittest.main()
