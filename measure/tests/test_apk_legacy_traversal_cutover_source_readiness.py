"""Guards the evidence-only source manifest for Legacy Traversal Task 1."""

from __future__ import annotations

import copy
import hashlib
import json
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ROOT = REPO_ROOT / "measure/tracks/apk_legacy_traversal_cutover_20260727"
MANIFEST_PATH = TRACK_ROOT / "task1-source-readiness-manifest-v1.json"
PLAN_PATH = TRACK_ROOT / "plan.md"
TRACK_ID = "apk_legacy_traversal_cutover_20260727"
TASK1_MARKER = "- [~] Confirm accepted crosswalk/readiness coverage and publish exact legacy manifests for five titles."
EXPECTED_PENDING_TASK_MARKERS = (
    "- [ ] Consume accepted Asset Contract v2 and suitability/ingestion records; freeze each title's semantic roles, physical behavior descriptors, legacy source manifests, and reuse/ingest/block decisions before implementation.",
    "- [ ] Write failing mechanic, responsive composition, and educational-invariant tests per title.",
    "- [ ] Build each cartridge using current public APK APIs and approved semantic bindings.",
    "- [ ] Run Advantage Games QC with compact/wide, resize, input, and selected-output checks.",
    "- [ ] Run Reading and Primary host proofs for loading, authoritative completion, persistence, replay, and navigation.",
    "- [ ] Retire only exact proven legacy paths and validate callers, selected outputs, and copied-asset guards.",
    "- [ ] Obtain independent review and product-owner acceptance.",
)

EXPECTED_BINDINGS = {
    "accepted_readiness_receipt": {
        "archive_preferred_path": "measure/archive/apk_denominator_readiness_t11_integrity_20260727/accepted-readiness-receipt-v1.json",
        "receipt_declared_path": "measure/tracks/apk_denominator_readiness_t11_integrity_20260727/accepted-readiness-receipt-v1.json",
        "sha256": "d371fc5df05922d5f1bbb50b837c0fd5314d8f136e2c699510c84186447f1720",
    },
    "phase1_crosswalk": {
        "archive_preferred_path": "measure/archive/apk_denominator_readiness_t11_integrity_20260727/phase1-denominator-crosswalk.json",
        "receipt_declared_path": "measure/tracks/apk_denominator_readiness_t11_integrity_20260727/phase1-denominator-crosswalk.json",
        "sha256": "eb395d3d365115696fc31359406a4e9f126604ca159ea8358a0eb8931c8c5f57",
    },
    "identity_ledger": {
        "archive_preferred_path": "measure/archive/apk_source_denominator_inventory_20260712/game-identity-ledger.json",
        "sha256": "a31c99650bf1abd6623e64b2e9a23c4c481ce970036b52cfbe08c74b1c09c407",
    },
    "accepted_traversal_batch_a": {
        "archive_preferred_path": "measure/archive/apk_corpus_audit_traversal_exploration_20260712/accepted-cohort-manifest-batch-a-v6.json",
        "sha256": "f5a215f44815c79025e86e97a3217d7a85c4a33db86f80db2909f30dd3a9caa3",
    },
    "accepted_traversal_batch_b": {
        "archive_preferred_path": "measure/archive/apk_corpus_audit_traversal_exploration_20260712/accepted-cohort-manifest-batch-b-v2.json",
        "sha256": "41243b620fb02c413bd7ed2887d59905a02036299ce763b11f70499d63ea99af",
    },
}

EXPECTED_TITLES = [
    {
        "title_id": "dragon-rider",
        "title": "Dragon Rider",
        "assignment_index": 11,
        "source_identity_id": "vocabulary/dragon-rider",
        "identity_record_index": 21,
        "evidence_binding": "accepted_traversal_batch_a",
    },
    {
        "title_id": "spellweavers-run",
        "title": "Spellweaver's Run",
        "assignment_index": 13,
        "source_identity_id": "catalog/spellweavers-run",
        "identity_record_index": 8,
        "evidence_binding": "accepted_traversal_batch_a",
    },
    {
        "title_id": "shadow-gate-dungeon",
        "title": "Shadow Gate Dungeon",
        "assignment_index": 14,
        "source_identity_id": "sentence/shadow-gate-dungeon",
        "identity_record_index": 17,
        "evidence_binding": "accepted_traversal_batch_b",
    },
    {
        "title_id": "labyrinth-goblin-king",
        "title": "Labyrinth of the Goblin King",
        "assignment_index": 15,
        "source_identity_id": "sentence/labyrinth-goblin-king",
        "identity_record_index": 14,
        "evidence_binding": "accepted_traversal_batch_b",
    },
    {
        "title_id": "griffin-riders-escape",
        "title": "Griffin Rider's Escape",
        "assignment_index": 16,
        "source_identity_id": "catalog/griffin-riders-escape",
        "identity_record_index": 2,
        "evidence_binding": "accepted_traversal_batch_b",
    },
]

EXPECTED_CLAIMS = {
    "semantic_adoption_claimed": False,
    "asset_selection_claimed": False,
    "asset_suitability_claimed": False,
    "asset_adoption_claimed": False,
    "implementation_claimed": False,
    "advantage_games_qc_claimed": False,
    "reading_host_proof_claimed": False,
    "primary_host_proof_claimed": False,
    "retirement_claimed": False,
    "cutover_claimed": False,
    "release_authority_granted": False,
}

EXPECTED_READINESS_BOUNDARY = {
    "receipt_status": "accepted-active",
    "authorized_child_work_only": True,
    "cohort_currently_ready": False,
    "cartridge_cutover_authorized": False,
    "meaning": "The receipt removes only the denominator/readiness predecessor block for this five-title child track. It does not satisfy Task 1 or any downstream task.",
}

EXPECTED_REQUIRED_GATES = [
    "accepted Asset Contract v2 output",
    "accepted per-title/per-role suitability and canonical-ingestion dossier",
    "accepted semantic adoption binding",
    "deterministic traversal cartridge revalidation and selected-output proof",
    "Advantage Games, Reading, and Primary host proof with authoritative completion persistence",
    "exact legacy retirement disposition plus independent review and product-owner acceptance",
]

EXPECTED_TOP_LEVEL_KEYS = {
    "schema_version",
    "track_id",
    "task",
    "status",
    "archive_resolution_rule",
    "source_bindings",
    "readiness_boundary",
    "titles",
    "claims",
    "required_before_any_adoption_or_cutover",
    "revocation_rule",
}

EXPECTED_TITLE_KEYS = {
    "title_id",
    "title",
    "assignment_index",
    "source_identity_id",
    "identity_record_index",
    "evidence_binding",
    "crosswalk_locator",
    "identity_ledger_locator",
}

EXPECTED_ARCHIVE_RULE = (
    "For each predecessor, archive_preferred_path is the only consumable local path after archival. "
    "receipt_declared_path is retained solely to reconcile the immutable receipt text and is not a fallback."
)

EXPECTED_REVOCATION_RULE = "Any bound-byte drift or revoked predecessor invalidates this evidence-only manifest."


def _load_object(path: Path) -> dict[str, Any]:
    """Loads one JSON object from an existing artifact."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"INVALID_ARTIFACT: {path}")
    return value


def _repo_path(path: str) -> Path:
    """Resolves one repository-relative evidence path without allowing traversal."""
    candidate = Path(path)
    if candidate.is_absolute():
        raise AssertionError(f"UNSAFE_EVIDENCE_PATH: {path}")
    resolved = (REPO_ROOT / candidate).resolve()
    try:
        resolved.relative_to(REPO_ROOT.resolve())
    except ValueError as error:
        raise AssertionError(f"UNSAFE_EVIDENCE_PATH: {path}") from error
    return resolved


def _sha256(path: Path) -> str:
    """Computes the SHA-256 digest of exact artifact bytes."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _title_locators(title: dict[str, Any]) -> dict[str, Any]:
    """Builds the exact crosswalk and identity locators for one title."""
    assignment_index = title["assignment_index"]
    identity_record_index = title["identity_record_index"]
    return {
        "crosswalk_locator": {
            "assignment_index": assignment_index,
            "assignment_locator": {
                "artifact": "accepted_partition",
                "json_pointer": f"/assignments/{assignment_index}",
            },
            "source_locator": {
                "artifact": "identity_ledger",
                "json_pointer": f"/identity_records/{identity_record_index}",
            },
        },
        "identity_ledger_locator": {
            "artifact": "identity_ledger",
            "json_pointer": f"/identity_records/{identity_record_index}",
        },
    }


def _valid_manifest() -> dict[str, Any]:
    """Builds the expected evidence-only manifest fixture."""
    titles = []
    for expected in EXPECTED_TITLES:
        title = copy.deepcopy(expected)
        title.update(_title_locators(title))
        titles.append(title)
    return {
        "schema_version": "apk-legacy-traversal-task1-source-readiness-manifest.v1",
        "track_id": TRACK_ID,
        "task": "Task 1: source/readiness manifest preparation",
        "status": "evidence-only",
        "archive_resolution_rule": EXPECTED_ARCHIVE_RULE,
        "source_bindings": copy.deepcopy(EXPECTED_BINDINGS),
        "readiness_boundary": copy.deepcopy(EXPECTED_READINESS_BOUNDARY),
        "titles": titles,
        "claims": copy.deepcopy(EXPECTED_CLAIMS),
        "required_before_any_adoption_or_cutover": list(EXPECTED_REQUIRED_GATES),
        "revocation_rule": EXPECTED_REVOCATION_RULE,
    }


def _validate_manifest(manifest: object) -> None:
    """Rejects roster, binding, locator, or authority drift in the manifest."""
    if not isinstance(manifest, dict):
        raise AssertionError("MANIFEST_SCHEMA_INVALID: expected object")
    if set(manifest) != EXPECTED_TOP_LEVEL_KEYS:
        raise AssertionError("MANIFEST_SCHEMA_INVALID: unexpected top-level fields")
    if (
        manifest.get("schema_version")
        != "apk-legacy-traversal-task1-source-readiness-manifest.v1"
    ):
        raise AssertionError("MANIFEST_SCHEMA_INVALID: schema version")
    if (
        manifest.get("track_id") != TRACK_ID
        or manifest.get("status") != "evidence-only"
    ):
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY: task scope")
    if manifest.get("archive_resolution_rule") != EXPECTED_ARCHIVE_RULE:
        raise AssertionError("ARCHIVE_RULE_DRIFT: archive-only resolution changed")
    if manifest.get("source_bindings") != EXPECTED_BINDINGS:
        raise AssertionError("SOURCE_BINDING_DRIFT: exact evidence hashes required")
    for binding in EXPECTED_BINDINGS.values():
        path = _repo_path(binding["archive_preferred_path"])
        if not path.is_file() or _sha256(path) != binding["sha256"]:
            raise AssertionError("SOURCE_BINDING_DRIFT: archive bytes changed")
    if manifest.get("readiness_boundary") != EXPECTED_READINESS_BOUNDARY:
        raise AssertionError("READINESS_BOUNDARY_DRIFT: boundary changed")
    if manifest.get("claims") != EXPECTED_CLAIMS or any(manifest["claims"].values()):
        raise AssertionError("FORBIDDEN_STATUS_OR_AUTHORITY: claim must remain false")
    if (
        manifest.get("required_before_any_adoption_or_cutover")
        != EXPECTED_REQUIRED_GATES
    ):
        raise AssertionError("DOWNSTREAM_GATE_DRIFT: required gates changed")
    if manifest.get("revocation_rule") != EXPECTED_REVOCATION_RULE:
        raise AssertionError("REVOCATION_RULE_DRIFT: revocation rule changed")

    titles = manifest.get("titles")
    if not isinstance(titles, list) or len(titles) != len(EXPECTED_TITLES):
        raise AssertionError("ROSTER_DRIFT: exactly five titles required")
    if any(
        not isinstance(title, dict) or set(title) != EXPECTED_TITLE_KEYS
        for title in titles
    ):
        raise AssertionError("TITLE_SCHEMA_INVALID: title fields changed")
    for actual, expected in zip(titles, EXPECTED_TITLES, strict=True):
        expected_title = copy.deepcopy(expected)
        expected_title.update(_title_locators(expected_title))
        if actual != expected_title:
            raise AssertionError("ROSTER_OR_LOCATOR_DRIFT: title binding changed")


def _validate_plan_text(plan_text: str) -> None:
    """Requires the active Task 1 marker and evidence-only dependency boundary."""
    if TASK1_MARKER not in plan_text:
        raise AssertionError("PLAN_MARKER_DRIFT: Task 1 must remain active")
    if "- [ ] Confirm accepted crosswalk/readiness coverage" in plan_text:
        raise AssertionError("PLAN_MARKER_DRIFT: Task 1 cannot remain pending")
    if "Evidence-only Task 1 Red starts here." not in plan_text:
        raise AssertionError("PLAN_EVIDENCE_MISSING: Red boundary is required")
    if (
        "Task 2 remains blocked by the Asset Contract v2 product-owner receipt and suitability evidence."
        not in plan_text
    ):
        raise AssertionError("PLAN_BOUNDARY_DRIFT: Task 2 blocker changed")
    for task_number, marker in enumerate(EXPECTED_PENDING_TASK_MARKERS, start=2):
        if plan_text.count(marker) != 1:
            raise AssertionError(
                f"PLAN_MARKER_DRIFT: Task {task_number} must remain exactly pending"
            )
        active_marker = marker.replace("- [ ]", "- [~]", 1)
        if active_marker in plan_text:
            raise AssertionError(
                f"PLAN_MARKER_DRIFT: Task {task_number} cannot become active"
            )


class LegacyTraversalSourceReadinessManifestTests(unittest.TestCase):
    """Ensures Legacy Traversal Task 1 remains archive-aware and evidence-only."""

    def test_red_manifest_is_only_missing_artifact(self) -> None:
        """Requires the not-yet-created Task 1 manifest and validates it after creation."""
        self.assertTrue(
            MANIFEST_PATH.is_file(),
            f"MISSING_ARTIFACT: create only {MANIFEST_PATH}",
        )
        _validate_manifest(_load_object(MANIFEST_PATH))

    def test_archived_source_bindings_are_current(self) -> None:
        """Verifies every archive binding and exact SHA-256 digest."""
        for binding in EXPECTED_BINDINGS.values():
            path = _repo_path(binding["archive_preferred_path"])
            self.assertTrue(path.is_file(), f"MISSING_ARCHIVE_ARTIFACT: {path}")
            self.assertEqual(_sha256(path), binding["sha256"])

    def test_readiness_receipt_is_active_and_bounded(self) -> None:
        """Verifies accepted readiness and rejects cohort or cutover authority."""
        receipt = _load_object(
            _repo_path(
                EXPECTED_BINDINGS["accepted_readiness_receipt"][
                    "archive_preferred_path"
                ]
            )
        )
        self.assertEqual(receipt["status"], "accepted")
        self.assertEqual(receipt["revocation_state"], "active")
        self.assertFalse(
            receipt["readiness_governance"][
                "any_cohort_currently_ready_by_this_receipt"
            ]
        )
        self.assertFalse(
            receipt["readiness_governance"][
                "any_cartridge_cutover_authorized_by_this_receipt"
            ]
        )
        self.assertEqual(
            receipt["downstream_authorization"]["authorized_child_cohorts"][TRACK_ID],
            [title["title"] for title in EXPECTED_TITLES],
        )

    def test_crosswalk_and_identity_roster_are_exact(self) -> None:
        """Verifies five title identities, assignment indices, and archive locators."""
        crosswalk = _load_object(
            _repo_path(EXPECTED_BINDINGS["phase1_crosswalk"]["archive_preferred_path"])
        )
        ledger = _load_object(
            _repo_path(EXPECTED_BINDINGS["identity_ledger"]["archive_preferred_path"])
        )
        for expected in EXPECTED_TITLES:
            assignment = crosswalk["assignments"][expected["assignment_index"]]
            self.assertEqual(assignment["canonical_identity_label"], expected["title"])
            self.assertEqual(assignment["cohort"], "Traversal and exploration")
            self.assertEqual(assignment["classification"], "source_identity")
            self.assertEqual(
                assignment["source_identity_id"], expected["source_identity_id"]
            )
            self.assertEqual(
                assignment["assignment_locator"],
                {
                    "artifact": "accepted_partition",
                    "json_pointer": f"/assignments/{expected['assignment_index']}",
                },
            )
            self.assertEqual(
                assignment["source_locator"],
                {
                    "artifact": "identity_ledger",
                    "json_pointer": f"/identity_records/{expected['identity_record_index']}",
                },
            )
            record = ledger["identity_records"][expected["identity_record_index"]]
            self.assertEqual(
                record["canonical_identity_id"], expected["source_identity_id"]
            )
            self.assertEqual(record["catalog_identity_id"], expected["title_id"])

    def test_accepted_traversal_evidence_covers_each_title(self) -> None:
        """Verifies accepted traversal evidence covers each title without implementation authority."""
        for binding_name, expected_packages in {
            "accepted_traversal_batch_a": {
                "vocabulary/dragon-rider",
                "catalog/spellweavers-run",
            },
            "accepted_traversal_batch_b": {
                "sentence/shadow-gate-dungeon",
                "sentence/labyrinth-goblin-king",
                "catalog/griffin-riders-escape",
            },
        }.items():
            evidence = _load_object(
                _repo_path(EXPECTED_BINDINGS[binding_name]["archive_preferred_path"])
            )
            self.assertEqual(evidence["status"], "accepted")
            self.assertFalse(evidence["revoked"])
            self.assertTrue(evidence["consumable"])
            self.assertEqual(
                set(evidence["scope"]["packages"]) & expected_packages,
                expected_packages,
            )
            self.assertEqual(
                evidence["scope"]["accepted_use"].split(", ")[0], "Bounded source-truth"
            )
            self.assertIn(
                "implementation", " ".join(evidence["scope"]["excluded_use"]).lower()
            )

    def test_plan_marker_and_boundary_are_active(self) -> None:
        """Reads the plan and preserves the evidence-only Task 2 boundary."""
        plan_text = PLAN_PATH.read_text(encoding="utf-8")
        _validate_plan_text(plan_text)

        pending_plan = plan_text.replace(
            "- [~] Confirm accepted crosswalk/readiness",
            "- [ ] Confirm accepted crosswalk/readiness",
            1,
        )
        with self.assertRaisesRegex(AssertionError, "PLAN_MARKER_DRIFT"):
            _validate_plan_text(pending_plan)

        for task_number, marker in enumerate(EXPECTED_PENDING_TASK_MARKERS, start=2):
            promoted_plan = plan_text.replace(
                marker,
                marker.replace("- [ ]", "- [~]", 1),
                1,
            )
            with self.subTest(task_number=task_number):
                with self.assertRaisesRegex(AssertionError, "PLAN_MARKER_DRIFT"):
                    _validate_plan_text(promoted_plan)

    def test_valid_manifest_fixture_passes(self) -> None:
        """Verifies the complete five-title evidence-only contract fixture."""
        _validate_manifest(_valid_manifest())

    def test_manifest_mutation_falsifiers(self) -> None:
        """Rejects hash, roster, locator, evidence, authority, and boundary mutations."""
        mutations = {
            "source hash": lambda manifest: manifest["source_bindings"][
                "phase1_crosswalk"
            ].update({"sha256": "0" * 64}),
            "bound evidence hash": lambda manifest: manifest["source_bindings"][
                "accepted_traversal_batch_b"
            ].update({"sha256": "1" * 64}),
            "title roster": lambda manifest: manifest["titles"][0].update(
                {"title_id": "forged-title"}
            ),
            "assignment index": lambda manifest: manifest["titles"][1].update(
                {"assignment_index": 12}
            ),
            "crosswalk locator": lambda manifest: manifest["titles"][2][
                "crosswalk_locator"
            ]["assignment_locator"].update({"json_pointer": "/assignments/99"}),
            "identity locator": lambda manifest: manifest["titles"][3][
                "identity_ledger_locator"
            ].update({"json_pointer": "/identity_records/99"}),
            "authority claim": lambda manifest: manifest["claims"].update(
                {"cutover_claimed": True}
            ),
            "readiness authority": lambda manifest: manifest[
                "readiness_boundary"
            ].update({"cartridge_cutover_authorized": True}),
        }
        for name, mutate in mutations.items():
            with self.subTest(name=name):
                candidate = _valid_manifest()
                mutate(candidate)
                with self.assertRaisesRegex(AssertionError, "DRIFT|AUTHORITY"):
                    _validate_manifest(candidate)


if __name__ == "__main__":
    unittest.main()
