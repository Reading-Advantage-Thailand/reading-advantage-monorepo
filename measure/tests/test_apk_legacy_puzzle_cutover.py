"""Fail-closed evidence checks for Legacy Puzzle Tasks 1 through 5."""

from __future__ import annotations

import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_legacy_puzzle_cutover_20260727"
SOURCE_READINESS_PATH = TRACK_ROOT / "task1-source-readiness-manifest-v1.json"
SUITABILITY_PATH = TRACK_ROOT / "task2-canonical-suitability-v1.json"
EXPECTED_TITLES = [
    ("enchanted-library", "vocabulary", 18),
    ("rune-match", "vocabulary", 19),
    ("alchemists-synthesis", "vocabulary", 20),
    ("potion-rush", "sentence", 21),
    ("rune-forge-chamber", "sentence", 22),
]


def _load_json(path: Path) -> dict[str, Any]:
    """Loads a required repository-local JSON object.

    Args:
        path: Artifact path to parse.

    Returns:
        Parsed JSON object.

    Raises:
        AssertionError: If the artifact is absent or does not contain an object.
    """
    if not path.is_file():
        raise AssertionError(f"MISSING_ARTIFACT: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise AssertionError(f"INVALID_ARTIFACT: {path}")
    return payload


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of an evidence artifact.

    Args:
        path: Artifact whose exact bytes are hashed.

    Returns:
        Lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


class LegacyPuzzleCutoverEvidenceTests(unittest.TestCase):
    """Requires title-specific evidence without granting catalog or host authority."""

    def test_task1_keeps_the_accepted_readiness_receipt_and_source_boundary(self) -> None:
        """Binds all five titles to the accepted readiness receipt without downstream authority."""
        manifest = _load_json(SOURCE_READINESS_PATH)

        self.assertEqual(manifest["schema_version"], "apk-legacy-puzzle-task1-source-readiness-manifest.v1")
        self.assertEqual(manifest["status"], "evidence-only")
        self.assertEqual(
            [(title["title_id"], title["input_mode"], title["assignment_index"]) for title in manifest["titles"]],
            EXPECTED_TITLES,
        )
        receipt = manifest["source_bindings"]["accepted_readiness_receipt"]
        receipt_path = REPO_ROOT / receipt["archive_preferred_path"]
        self.assertEqual(
            _sha256(receipt_path),
            "d371fc5df05922d5f1bbb50b837c0fd5314d8f136e2c699510c84186447f1720",
        )
        self.assertTrue(manifest["readiness_boundary"]["authorized_child_work_only"])
        self.assertFalse(manifest["readiness_boundary"]["cohort_currently_ready"])
        self.assertFalse(manifest["readiness_boundary"]["cartridge_cutover_authorized"])
        self.assertTrue(all(value is False for value in manifest["claims"].values()))

    def test_task2_records_real_canonical_descriptors_but_no_unaccepted_selected_union(self) -> None:
        """Requires a descriptor-backed canonical comparison while preserving the title-adoption block."""
        suitability = _load_json(SUITABILITY_PATH)

        self.assertEqual(suitability["schema_version"], "apk-legacy-puzzle-task2-canonical-suitability.v1")
        self.assertEqual(suitability["status"], "canonical-descriptor-comparison-only")
        self.assertEqual(
            [(title["title_id"], title["input_mode"]) for title in suitability["titles"]],
            [(title_id, input_mode) for title_id, input_mode, _ in EXPECTED_TITLES],
        )
        for title in suitability["titles"]:
            self.assertEqual(title["disposition"], "blocked")
            self.assertEqual(title["selected_semantic_keys"], [])
            self.assertEqual(
                title["blockers"],
                [
                    "missing-title-specific-accepted-suitability-dossier",
                    "missing-title-specific-accepted-semantic-binding",
                ],
            )
            self.assertNotIn("apps/", title["canonical_key"])
            self.assertNotIn("legacy", title["canonical_key"])

        enchanted = suitability["titles"][0]
        self.assertEqual(enchanted["descriptor"]["media_kind"], "animation")
        self.assertEqual(enchanted["descriptor"]["clip"], {
            "id": "walk",
            "frame_count": 6,
            "fps": 12,
            "loop": True,
            "direction": "down",
        })
        self.assertEqual(
            enchanted["technical_compatibility"],
            {
                "animation_behavior": "pass",
                "frame_direction_compatibility": "pass",
                "geometry": "pass",
                "collision_envelope": "pass",
                "source_receipt": "pass",
            },
        )
        self.assertTrue(all(value is False for value in suitability["authority_boundary"].values()))

    def test_tasks_three_through_five_keep_cartridges_title_scoped_and_out_of_public_catalogs(self) -> None:
        """Requires one puzzle module and deterministic test per title without touching public loaders."""
        for title_id, _, _ in EXPECTED_TITLES:
            cartridge = REPO_ROOT / f"packages/game-cartridges/src/puzzle/{title_id}-cartridge.ts"
            test = REPO_ROOT / f"packages/game-cartridges/src/puzzle/{title_id}-cartridge.test.ts"
            self.assertTrue(cartridge.is_file(), cartridge)
            self.assertTrue(test.is_file(), test)

        self.assertTrue((REPO_ROOT / "packages/game-cartridges/src/puzzle/puzzle-cartridges-qc.test.ts").is_file())
        self.assertTrue((REPO_ROOT / "packages/game-cartridges/src/puzzle-suitability.ts").is_file())
        self.assertTrue((REPO_ROOT / "packages/game-cartridges/src/puzzle-suitability.test.ts").is_file())


if __name__ == "__main__":
    unittest.main()
