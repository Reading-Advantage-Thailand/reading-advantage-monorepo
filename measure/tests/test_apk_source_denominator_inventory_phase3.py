"""Falsification contracts for APK denominator Phase-3 reconciliation."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import re
import subprocess
import sys
import unittest
from unittest import mock
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK
FREEZE_PATH = TRACK_DIR / "phase0-input-freeze.json"
SOURCE_PATH = TRACK_DIR / "source-denominator.json"
IDENTITY_PATH = TRACK_DIR / "game-identity-ledger.json"
SCENE_PATH = TRACK_DIR / "scene-state-denominator.json"
ASSET_PATH = TRACK_DIR / "asset-file-denominator.json"
HISTORICAL_PATH = TRACK_DIR / "historical-source-denominator.json"
MECHANICAL_DISCREPANCY_PATH = TRACK_DIR / "denominator-discrepancies.json"
HUMAN_DISCOVERY_PATH = TRACK_DIR / "independent-human-discovery.json"
HUMAN_DUPLICATE_PATH = TRACK_DIR / "human-duplicate-drift-records.json"
HUMAN_HISTORICAL_PATH = TRACK_DIR / "human-historical-deleted-records.json"
HUMAN_DISCREPANCY_PATH = TRACK_DIR / "human-discrepancy-records.json"
REPORT_PATH = TRACK_DIR / "phase3-reconciliation-contract-test-report.json"
RECONCILIATION_PATH = TRACK_DIR / "phase3-reconciliation.json"
REPLACEMENT_PROGRAM_PATH = "measure/apk-evidence-reconstruction-program.md"
PHASE1_REVISION = "990dd9c060ca844ad16d141b1eb4086b310369a4"
PHASE2_IMPLEMENTATION_REVISION = "4f5dde0a04c70c57f123a72eded84836325743da"
PHASE2_RECEIPT_REVISION = "7eef639674e927f2d56107866d385e0df812aa66"
PHASE2_RECEIPT_PATH = f"measure/tracks/{TRACK}/role-receipts/evidence-collector.json"
QUARANTINED_SOURCE_PREFIX = "measure/tracks/apk_cross_game_asset_ontology_20260712"
PHASE1_ARTIFACTS = {
    "source-denominator.json",
    "game-identity-ledger.json",
    "scene-state-denominator.json",
    "asset-file-denominator.json",
    "historical-source-denominator.json",
    "denominator-discrepancies.json",
}
PHASE1_CURRENT_STABLE_ARTIFACTS = {
    "source-denominator.json",
    "game-identity-ledger.json",
    "scene-state-denominator.json",
    "asset-file-denominator.json",
    "historical-source-denominator.json",
}
PHASE1_COLLECTOR_ARTIFACTS = {
    "asset-file-denominator.json",
    "historical-source-denominator.json",
}
PHASE2_ARTIFACTS = {
    "independent-human-discovery.json",
    "human-duplicate-drift-records.json",
    "human-historical-deleted-records.json",
    "human-discrepancy-records.json",
}
SHA256 = re.compile(r"^[0-9a-f]{64}$")
FORBIDDEN_INTERPRETATION_FIELDS = {
    "asset_suitability",
    "capability",
    "capability_conclusion",
    "conclusion",
    "design_intent",
    "gameplay_interpretation",
    "intent",
    "interpretation",
    "mechanic",
    "mechanics",
    "product_disposition",
    "recommendation",
    "responsive_strategy",
    "semantic_role",
    "suitability",
}
SURFACE_KINDS = {
    "scene",
    "state",
    "phase",
    "overlay",
    "transition",
    "transition-write-candidate",
    "terminal",
    "presentation",
}
DISCREPANCY_TYPES = {"duplicate", "stale", "missing", "withdrawn", "historical", "denominator-mismatch"}
RESOLVED_STATUSES = {"matched", "resolved", "retained-target-write-candidate"}
UNRESOLVED_STATUS = "unresolved-source"


def _load_phase3_generator_module() -> Any:
    """Loads the Phase-3 generator for focused propagation contracts."""
    generator_path = TRACK_DIR / "generate_phase3_reconciliation.py"
    spec = importlib.util.spec_from_file_location("apk_phase3_generator", generator_path)
    if spec is None or spec.loader is None:
        raise AssertionError("Unable to load Phase-3 generator")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


PROGRAM_DISPOSITIONS = {
    "current",
    "historical/withdrawn",
    "alias/copy",
    "unsupported program assumption",
}


def _load_json(path: Path, *, phase3: bool = False) -> dict[str, Any]:
    """Loads a contract object and identifies absent Phase-3 reconciliation output.

    Args:
        path: Artifact path to load.
        phase3: Whether the artifact is the required Phase-3 output.

    Returns:
        Parsed JSON object.

    Raises:
        AssertionError: If the artifact is absent or is not a JSON object.
    """
    if not path.is_file():
        phase = "Phase-3 reconciliation" if phase3 else "required"
        raise AssertionError(f"Missing {phase} artifact: {path.relative_to(REPO_ROOT)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path.relative_to(REPO_ROOT)} must contain a JSON object")
    return value


def _git_bytes(revision: str, path: str) -> bytes:
    """Reads committed bytes for one exact revision and repository-relative path.

    Args:
        revision: Commit that must contain the cited path.
        path: Repository-relative path to resolve.

    Returns:
        The committed bytes.

    Raises:
        AssertionError: If Git cannot resolve the locator.
    """
    result = subprocess.run(
        ["git", "show", f"{revision}:{path}"],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise AssertionError(f"Unresolvable committed source locator {revision}:{path}: {detail}")
    return result.stdout


def _is_ancestor(revision: str, baseline: str) -> bool:
    """Reports whether a historical revision is reachable from the frozen baseline.

    Args:
        revision: Historical revision to validate.
        baseline: Frozen source revision that bounds historical work.

    Returns:
        Whether the revision is a reachable ancestor of the baseline.
    """
    return subprocess.run(
        ["git", "merge-base", "--is-ancestor", revision, baseline],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    ).returncode == 0


def _load_git_json(revision: str, name: str) -> dict[str, Any]:
    """Loads one committed predecessor artifact as a JSON object.

    Args:
        revision: Exact predecessor commit to read.
        name: Filename within the active track directory.

    Returns:
        Parsed committed JSON object.

    Raises:
        AssertionError: If the committed object is not a JSON object.
    """
    path = f"measure/tracks/{TRACK}/{name}"
    value = json.loads(_git_bytes(revision, path))
    if not isinstance(value, dict):
        raise AssertionError(f"{revision}:{path} must contain a JSON object")
    return value


def _key(value: object) -> str:
    """Returns a stable JSON key for one denominator item.

    Args:
        value: JSON-compatible value to identify.

    Returns:
        A canonical JSON representation.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


class Phase3ReconciliationContracts(unittest.TestCase):
    """Rejects absent, sampled, interpretive, or non-fail-closed reconciliation."""

    def setUp(self) -> None:
        """Loads the required Phase-3 artifact before all comparison inputs.

        Returns:
            Nothing.
        """
        self.freeze = _load_json(FREEZE_PATH)
        self.reconciliation = _load_json(RECONCILIATION_PATH, phase3=True)
        scope = self.freeze["source_scope"]
        self.assertIsInstance(scope, dict)
        assert isinstance(scope, dict)
        self.baseline = scope["current_revision"]
        self.assertIsInstance(self.baseline, str)
        assert isinstance(self.baseline, str)
        self.source = _load_git_json(PHASE1_REVISION, SOURCE_PATH.name)
        self.ledger = _load_git_json(PHASE1_REVISION, IDENTITY_PATH.name)
        self.scenes = _load_git_json(PHASE1_REVISION, SCENE_PATH.name)
        self.assets = _load_git_json(PHASE1_REVISION, ASSET_PATH.name)
        self.historical = _load_git_json(PHASE1_REVISION, HISTORICAL_PATH.name)
        self.mechanical_discrepancies = _load_git_json(PHASE1_REVISION, MECHANICAL_DISCREPANCY_PATH.name)
        self.human_discovery = _load_git_json(PHASE2_IMPLEMENTATION_REVISION, HUMAN_DISCOVERY_PATH.name)
        self.human_duplicates = _load_git_json(PHASE2_IMPLEMENTATION_REVISION, HUMAN_DUPLICATE_PATH.name)
        self.human_historical = _load_git_json(PHASE2_IMPLEMENTATION_REVISION, HUMAN_HISTORICAL_PATH.name)
        self.human_discrepancies = _load_git_json(PHASE2_IMPLEMENTATION_REVISION, HUMAN_DISCREPANCY_PATH.name)

    def _assert_locator(self, locator: object, *, historical: bool = False) -> dict[str, Any]:
        """Validates a committed exact path, blob, and inclusive range hash.

        Args:
            locator: Candidate source locator.
            historical: Whether a reachable ancestor is allowed.

        Returns:
            The validated locator.
        """
        self.assertIsInstance(locator, dict)
        assert isinstance(locator, dict)
        revision = locator.get("revision")
        path = locator.get("path")
        self.assertIsInstance(revision, str)
        self.assertIsInstance(path, str)
        assert isinstance(revision, str) and isinstance(path, str)
        self.assertFalse(path.startswith("/"))
        self.assertFalse(path.endswith("/"))
        if historical:
            self.assertTrue(_is_ancestor(revision, self.baseline))
        else:
            self.assertEqual(revision, self.baseline)
        blob = _git_bytes(revision, path)
        self.assertIsInstance(locator.get("blob_sha256"), str)
        self.assertRegex(str(locator.get("blob_sha256")), SHA256)
        self.assertEqual(locator["blob_sha256"], hashlib.sha256(blob).hexdigest())
        cited_range = locator.get("range")
        self.assertIsInstance(cited_range, dict)
        assert isinstance(cited_range, dict)
        start = cited_range.get("start_line")
        end = cited_range.get("end_line")
        self.assertIsInstance(start, int)
        self.assertIsInstance(end, int)
        assert isinstance(start, int) and isinstance(end, int)
        lines = blob.splitlines(keepends=True)
        if not lines:
            self.assertEqual((start, end), (0, 0))
            self.assertEqual(cited_range.get("sha256"), hashlib.sha256(blob).hexdigest())
            return locator
        self.assertGreaterEqual(start, 1)
        self.assertGreaterEqual(end, start)
        self.assertLessEqual(end, len(lines))
        self.assertIsInstance(cited_range.get("sha256"), str)
        self.assertRegex(str(cited_range.get("sha256")), SHA256)
        self.assertEqual(
            cited_range["sha256"],
            hashlib.sha256(b"".join(lines[start - 1 : end])).hexdigest(),
        )
        return locator

    def _assert_no_interpretation_fields(self, value: object, location: str = "$") -> None:
        """Rejects conclusion fields throughout the Phase-3 reconciliation object.

        Args:
            value: JSON value to inspect recursively.
            location: JSON path used in failures.

        Returns:
            Nothing.
        """
        if isinstance(value, dict):
            for key, nested in value.items():
                normalized = key.lower().replace("-", "_").replace(" ", "_")
                self.assertNotIn(normalized, FORBIDDEN_INTERPRETATION_FIELDS, f"forbidden interpretation field at {location}.{key}")
                self._assert_no_interpretation_fields(nested, f"{location}.{key}")
        elif isinstance(value, list):
            for index, nested in enumerate(value):
                self._assert_no_interpretation_fields(nested, f"{location}[{index}]")

    def _records(self, field: str) -> list[dict[str, Any]]:
        """Returns a nonempty reconciliation record collection.

        Args:
            field: Required reconciliation collection field.

        Returns:
            The validated record collection.
        """
        records = self.reconciliation.get(field)
        self.assertIsInstance(records, list, f"{field} must be a list")
        assert isinstance(records, list)
        self.assertTrue(records, f"{field} cannot be empty")
        self.assertTrue(all(isinstance(record, dict) for record in records))
        return [record for record in records if isinstance(record, dict)]

    def _assert_resolution(self, record: dict[str, Any]) -> None:
        """Validates one explicit match or fail-closed unresolved result.

        Args:
            record: Reconciliation record to validate.

        Returns:
            Nothing.
        """
        status = record.get("resolution_status")
        self.assertIn(status, RESOLVED_STATUSES | {UNRESOLVED_STATUS})
        if status == UNRESOLVED_STATUS:
            self.assertTrue(record.get("blocking"), "unresolved source must remain blocking")
            self.assertIsInstance(record.get("unresolved_source_id"), str)
        else:
            self.assertFalse(record.get("blocking"), "resolved records cannot conceal a blocker")
            evidence = record.get("human_evidence")
            self.assertIsInstance(evidence, list)
            assert isinstance(evidence, list)
            self.assertTrue(evidence, "a resolved comparison requires independent raw-source evidence")
            for locator in evidence:
                self.assertIsInstance(locator, dict)
                assert isinstance(locator, dict)
                self._assert_locator(locator, historical=locator.get("revision") != self.baseline)

    def _replacement_program_identities(self) -> list[str]:
        """Extracts the exact replacement-program identity list from committed raw bytes.

        Returns:
            The 29 raw program labels in their declared order.
        """
        program = _git_bytes(self.baseline, REPLACEMENT_PROGRAM_PATH).decode("utf-8")
        self.assertIn("The partition covers 29 canonical identities exactly once.", program)
        partition = program.split("### Pilot\n", 1)[1].split("The partition covers 29 canonical identities exactly once.", 1)[0]
        identities = re.findall(r"^- (.+)$", partition, flags=re.MULTILINE)
        self.assertEqual(len(identities), 29, "raw replacement-program evidence must contain 29 identities")
        self.assertEqual(len(identities), len(set(identities)))
        return identities

    def test_red_report_is_contract_only_and_names_the_phase3_gate(self) -> None:
        """Keeps the Phase-3 RED report distinct from reconciliation evidence.

        Returns:
            Nothing.
        """
        report = _load_json(REPORT_PATH)
        self.assertEqual(report.get("schema_version"), "apk-denominator-phase3-reconciliation-contract-report.v1")
        self.assertEqual(report.get("status"), "red-contract-authored")
        self.assertEqual(report.get("source_baseline_revision"), self.baseline)
        self.assertEqual(report.get("red_command"), report.get("green_command"))
        self.assertIn("test_apk_source_denominator_inventory_phase3", str(report.get("red_command")))
        self.assertNotIn("accepted", str(report.get("status")).lower())

    def test_reconciliation_header_is_nonconsumable_and_fail_closed(self) -> None:
        """Requires an explicit non-acceptance status and coherent unresolved blocking state.

        Returns:
            Nothing.
        """
        self.assertEqual(self.reconciliation.get("schema_version"), "apk-source-denominator-phase3-reconciliation.v1")
        self.assertEqual(self.reconciliation.get("track_id"), TRACK)
        self.assertEqual(self.reconciliation.get("source_baseline_revision"), self.baseline)
        self.assertIn(self.reconciliation.get("status"), {"reconciliation-complete", "reconciliation-blocked"})
        self.assertNotIn("candidate", str(self.reconciliation.get("status")).lower())
        self.assertNotIn("accepted", str(self.reconciliation.get("status")).lower())
        unresolved = self.reconciliation.get("unresolved_sources")
        self.assertIsInstance(unresolved, list)
        assert isinstance(unresolved, list)
        unresolved_ids = {row.get("unresolved_source_id") for row in unresolved}
        self.assertNotIn(None, unresolved_ids)
        if self.reconciliation.get("status") == "reconciliation-blocked":
            self.assertTrue(unresolved_ids, "blocked reconciliation requires explicit unresolved source records")
        else:
            self.assertFalse(unresolved_ids, "complete reconciliation cannot carry unresolved source records")

    def test_reconciliation_binds_exact_repaired_predecessor_provenance(self) -> None:
        """Rejects stale Phase-1 or Phase-2 pins and unverifiable receipt propagation.

        Returns:
            Nothing.
        """
        provenance = self.reconciliation.get("input_provenance")
        self.assertIsInstance(provenance, dict)
        assert isinstance(provenance, dict)
        phase1 = provenance.get("phase1")
        phase2 = provenance.get("phase2")
        self.assertIsInstance(phase1, dict)
        self.assertIsInstance(phase2, dict)
        assert isinstance(phase1, dict) and isinstance(phase2, dict)
        self.assertEqual(phase1.get("revision"), PHASE1_REVISION)
        expected_phase1_hashes = {
            f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
                _git_bytes(PHASE1_REVISION, f"measure/tracks/{TRACK}/{name}")
            ).hexdigest()
            for name in PHASE1_ARTIFACTS
        }
        self.assertEqual(phase1.get("output_hashes"), expected_phase1_hashes)

        receipt_bytes = _git_bytes(PHASE2_RECEIPT_REVISION, PHASE2_RECEIPT_PATH)
        receipt = json.loads(receipt_bytes)
        self.assertEqual(receipt.get("commit_sha"), PHASE2_IMPLEMENTATION_REVISION)
        expected_phase2_hashes = {
            f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
                _git_bytes(PHASE2_IMPLEMENTATION_REVISION, f"measure/tracks/{TRACK}/{name}")
            ).hexdigest()
            for name in PHASE2_ARTIFACTS
        }
        expected_receipt_owned_hashes = {
            **{
                f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
                    _git_bytes(PHASE1_REVISION, f"measure/tracks/{TRACK}/{name}")
                ).hexdigest()
                for name in PHASE1_COLLECTOR_ARTIFACTS
            },
            **expected_phase2_hashes,
        }
        self.assertEqual(receipt.get("output_hashes"), expected_receipt_owned_hashes)
        self.assertEqual(phase2.get("implementation_revision"), PHASE2_IMPLEMENTATION_REVISION)
        self.assertEqual(phase2.get("receipt_revision"), PHASE2_RECEIPT_REVISION)
        self.assertEqual(phase2.get("receipt_path"), PHASE2_RECEIPT_PATH)
        self.assertEqual(phase2.get("receipt_sha256"), hashlib.sha256(receipt_bytes).hexdigest())
        self.assertEqual(phase2.get("consumed_output_hashes"), expected_phase2_hashes)
        self.assertEqual(phase2.get("receipt_owned_output_hashes"), expected_receipt_owned_hashes)
        expected_receipt_output_sha256 = hashlib.sha256(
            json.dumps(expected_receipt_owned_hashes, sort_keys=True, separators=(",", ":")).encode("utf-8")
        ).hexdigest()
        self.assertEqual(receipt.get("output_sha256"), expected_receipt_output_sha256)
        self.assertEqual(phase2.get("receipt_output_sha256"), expected_receipt_output_sha256)
        self.assertEqual(
            set(phase2),
            {
                "implementation_revision",
                "receipt_revision",
                "receipt_path",
                "receipt_sha256",
                "consumed_output_hashes",
                "receipt_owned_output_hashes",
                "receipt_output_sha256",
            },
        )

    def test_reconciliation_provenance_matches_current_committed_predecessor_bytes(self) -> None:
        """Rejects stale pins while excluding mapper-owned rewritten output bytes from HEAD freshness."""
        provenance = self.reconciliation["input_provenance"]
        current_phase1_hashes = {
            f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
                _git_bytes("HEAD", f"measure/tracks/{TRACK}/{name}")
            ).hexdigest()
            for name in PHASE1_CURRENT_STABLE_ARTIFACTS
        }
        current_phase2_hashes = {
            f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
                _git_bytes("HEAD", f"measure/tracks/{TRACK}/{name}")
            ).hexdigest()
            for name in PHASE2_ARTIFACTS
        }
        self.assertEqual(
            {
                path: provenance["phase1"]["output_hashes"][path]
                for path in current_phase1_hashes
            },
            current_phase1_hashes,
            "Phase 3 HEAD freshness excludes mapper-owned rewritten bytes, not immutable input provenance",
        )
        self.assertEqual(
            provenance["phase2"]["consumed_output_hashes"], current_phase2_hashes,
            "Phase 3 must reconcile the current committed Phase-2 artifact bytes",
        )

    def test_reconciliation_covers_current_complete_identity_ledger(self) -> None:
        """Requires all current ledger identities instead of the obsolete 17-row pin."""
        current_ledger = _load_json(IDENTITY_PATH)
        expected = {row["canonical_identity_id"] for row in current_ledger["identity_records"]}
        self.assertEqual(len(expected), 27, "the current frozen catalog ledger must contain 27 identities")
        actual = {
            row.get("canonical_identity_id")
            for row in self._records("identity_reconciliation_records")
        }
        self.assertEqual(
            actual,
            expected,
            "Phase 3 must not retain the obsolete 17-identity Phase-1 snapshot",
        )

    def test_reconciliation_covers_current_complete_surface_denominator(self) -> None:
        """Requires all current scene/state/transition rows instead of 102 stale rows."""
        current_scenes = _load_json(SCENE_PATH)
        expected = {
            _key(row)
            for field in ("scene_records", "state_records", "transitions", "transition_write_candidates")
            for row in current_scenes[field]
        }
        self.assertEqual(
            len(expected),
            sum(
                len(current_scenes[field])
                for field in (
                    "scene_records",
                    "state_records",
                    "transitions",
                    "transition_write_candidates",
                )
            ),
            "surface keys must remain collision-free across proven and candidate partitions",
        )
        actual = {
            _key(row.get("mechanical_surface"))
            for row in self._records("surface_reconciliation_records")
        }
        self.assertEqual(
            actual,
            expected,
            "Phase 3 must retain every proven surface and unresolved transition candidate",
        )

    def test_reconciliation_excludes_failed_track_quarantine_strings(self) -> None:
        """Rejects failed-track paths anywhere in the Phase-3 factual output.

        Returns:
            Nothing.
        """
        self.assertNotIn(QUARANTINED_SOURCE_PREFIX, json.dumps(self.reconciliation))

    def test_all_29_program_names_are_reviewed_without_forcing_29_current_identities(self) -> None:
        """Separates reviewed program names from the smaller source-backed current denominator.

        Returns:
            Nothing.
        """
        program_identities = self._replacement_program_identities()
        mechanical = self.ledger.get("identity_records")
        self.assertIsInstance(mechanical, list)
        assert isinstance(mechanical, list)
        mechanical_ids = {row.get("canonical_identity_id") for row in mechanical if isinstance(row, dict)}
        self.assertEqual(self.reconciliation.get("replacement_program_identity_count"), 29)
        self.assertEqual(self.reconciliation.get("mechanical_identity_count"), len(mechanical_ids))
        human_claims = self.human_discovery.get("current_source_claims")
        self.assertIsInstance(human_claims, list)
        assert isinstance(human_claims, list)
        human_ids = {row.get("canonical_identity_id") for row in human_claims if isinstance(row, dict)}
        self.assertEqual(self.reconciliation.get("human_identity_count"), len(human_ids))
        records = self._records("replacement_program_identity_records")
        labels = [record.get("program_identity_label") for record in records]
        self.assertEqual(labels, program_identities)
        self.assertEqual(len(labels), 29)
        mapped_mechanical: list[str] = []
        mapped_human: list[str] = []
        dispositions: dict[str, str] = {}
        for record in records:
            evidence = self._assert_locator(record.get("program_evidence"))
            lines = _git_bytes(evidence["revision"], evidence["path"]).decode("utf-8").splitlines()
            cited = "\n".join(lines[evidence["range"]["start_line"] - 1 : evidence["range"]["end_line"]])
            self.assertIn(record["program_identity_label"], cited)
            self.assertIsInstance(record.get("mechanical_identity_ids"), list)
            self.assertIsInstance(record.get("human_identity_ids"), list)
            assert isinstance(record.get("mechanical_identity_ids"), list)
            assert isinstance(record.get("human_identity_ids"), list)
            mapped_mechanical.extend(record["mechanical_identity_ids"])
            mapped_human.extend(record["human_identity_ids"])
            disposition = record.get("disposition")
            self.assertIn(disposition, PROGRAM_DISPOSITIONS)
            assert isinstance(disposition, str)
            dispositions[record["program_identity_label"]] = disposition
            self._assert_resolution(record)
        self.assertEqual(set(mapped_mechanical), mechanical_ids)
        self.assertEqual(len(mapped_mechanical), len(set(mapped_mechanical)))
        self.assertEqual(set(mapped_human), human_ids)
        self.assertEqual(len(mapped_human), len(set(mapped_human)))
        self.assertEqual(len(dispositions), 29)
        self.assertEqual(sum(value == "current" for value in dispositions.values()), 17)
        self.assertEqual(sum(value == "historical/withdrawn" for value in dispositions.values()), 12)
        self.assertEqual(self.reconciliation.get("reviewed_program_identity_count"), 29)
        self.assertEqual(self.reconciliation.get("current_identity_denominator_count"), 17)
        for record in records:
            included = record.get("current_source_denominator_included")
            if record.get("disposition") == "current":
                self.assertTrue(included)
                self.assertEqual(len(record["mechanical_identity_ids"]), 1)
                self.assertEqual(len(record["human_identity_ids"]), 1)
            else:
                self.assertFalse(included)
                self.assertLessEqual(len(record["mechanical_identity_ids"]), 1)
                self.assertEqual(record["human_identity_ids"], [])

    def test_identity_and_file_denominators_are_exhaustively_compared(self) -> None:
        """Requires one comparison for every mechanical identity and source file record.

        Returns:
            Nothing.
        """
        mechanical_identities = self.ledger.get("identity_records")
        human_claims = self.human_discovery.get("current_source_claims")
        source_records = self.source.get("records")
        self.assertIsInstance(mechanical_identities, list)
        self.assertIsInstance(human_claims, list)
        self.assertIsInstance(source_records, list)
        assert isinstance(mechanical_identities, list) and isinstance(human_claims, list) and isinstance(source_records, list)
        expected_identities = {row["canonical_identity_id"] for row in mechanical_identities if isinstance(row, dict)}
        expected_human_identities = {row["canonical_identity_id"] for row in human_claims if isinstance(row, dict)}
        identity_records = self._records("identity_reconciliation_records")
        self.assertEqual(len(identity_records), 27)
        identity_ids = {row.get("canonical_identity_id") for row in identity_records}
        self.assertEqual(identity_ids, expected_identities)
        current_mechanical_identities = {
            row["canonical_identity_id"]
            for row in mechanical_identities
            if any(state["source_class"] == "current-page-source" for state in row["source_states"])
        }
        withdrawn_mechanical_identities = expected_identities - current_mechanical_identities
        self.assertEqual(len(current_mechanical_identities), 17)
        self.assertEqual(len(withdrawn_mechanical_identities), 10)
        self.assertEqual(expected_human_identities, current_mechanical_identities)
        for record in identity_records:
            self._assert_resolution(record)
            if record["canonical_identity_id"] in withdrawn_mechanical_identities:
                self.assertTrue(record["human_evidence"])
                self.assertTrue(all(locator.get("revision") != self.baseline for locator in record["human_evidence"]))

        expected_files = {row["record_id"] for row in source_records if isinstance(row, dict) and row.get("record_type") == "file"}
        file_records = self._records("file_reconciliation_records")
        self.assertEqual({row.get("mechanical_record_id") for row in file_records}, expected_files)
        for record in file_records:
            self._assert_resolution(record)

        source_record_records = self._records("source_record_reconciliation_records")
        self.assertEqual(
            {row.get("mechanical_record_id") for row in source_record_records},
            {row["record_id"] for row in source_records if isinstance(row, dict)},
        )
        for record in source_record_records:
            self._assert_resolution(record)

    def test_every_mechanical_graph_edge_and_copy_is_compared(self) -> None:
        """Requires explicit raw-evidence comparisons for every graph edge and copy record.

        Returns:
            Nothing.
        """
        graph_edges = self.source.get("graph_edges")
        source_records = self.source.get("records")
        self.assertIsInstance(graph_edges, list)
        self.assertIsInstance(source_records, list)
        assert isinstance(graph_edges, list) and isinstance(source_records, list)

        graph_records = self._records("graph_edge_reconciliation_records")
        self.assertEqual(
            {row.get("mechanical_graph_edge_key") for row in graph_records},
            {_key(row) for row in graph_edges if isinstance(row, dict)},
        )
        for record in graph_records:
            self._assert_resolution(record)

        copy_records = self._records("copy_reconciliation_records")
        self.assertEqual(
            {row.get("mechanical_copy_record_id") for row in copy_records},
            {row["record_id"] for row in source_records if isinstance(row, dict) and row.get("record_type") == "copy"},
        )
        for record in copy_records:
            self._assert_resolution(record)

    def test_every_scene_state_and_surface_is_compared_with_raw_evidence(self) -> None:
        """Requires exhaustive scene, state, phase, overlay, transition, and terminal coverage.

        Returns:
            Nothing.
        """
        scene_records = self.scenes.get("scene_records")
        state_records = self.scenes.get("state_records")
        transitions = self.scenes.get("transitions")
        self.assertIsInstance(scene_records, list)
        self.assertIsInstance(state_records, list)
        self.assertIsInstance(transitions, list)
        assert isinstance(scene_records, list) and isinstance(state_records, list) and isinstance(transitions, list)
        expected: dict[str, str] = {}
        transition_candidates = self.scenes.get("transition_write_candidates")
        self.assertIsInstance(transition_candidates, list)
        assert isinstance(transition_candidates, list)
        for kind, rows in (
            ("scene", scene_records),
            ("state", state_records),
            ("transition", transitions),
            ("transition-write-candidate", transition_candidates),
        ):
            for row in rows:
                self.assertIsInstance(row, dict)
                assert isinstance(row, dict)
                expected[_key(row)] = kind if kind != "transition" else str(row["transition_kind"])
        records = self._records("surface_reconciliation_records")
        self.assertEqual({_key(row.get("mechanical_surface")) for row in records}, set(expected))
        observed_kinds = {row.get("surface_kind") for row in records}
        self.assertTrue(observed_kinds.issubset(SURFACE_KINDS))
        for record in records:
            self.assertEqual(record.get("surface_kind"), expected[_key(record.get("mechanical_surface"))])
            if record.get("surface_kind") == "transition-write-candidate":
                self.assertFalse(record.get("edge_inferred"))
            self._assert_resolution(record)
        category_records = self._records("surface_category_coverage")
        self.assertEqual({row.get("surface_kind") for row in category_records}, SURFACE_KINDS)
        for record in category_records:
            self.assertIn(record.get("coverage_status"), {"reviewed", "not-found-with-raw-evidence"})
            self._assert_locator(record.get("evidence"))

    def test_every_asset_candidate_and_identical_hash_group_is_compared(self) -> None:
        """Requires exact candidate path/hash and identical-hash-group reconciliation.

        Returns:
            Nothing.
        """
        candidates = self.assets.get("candidate_files")
        self.assertIsInstance(candidates, list)
        assert isinstance(candidates, list)
        expected_candidates = {row["canonical_path"]: (row["sha256"], row["identical_hash_group"]) for row in candidates if isinstance(row, dict)}
        candidate_records = self._records("asset_candidate_reconciliation_records")
        self.assertEqual({row.get("canonical_path") for row in candidate_records}, set(expected_candidates))
        for record in candidate_records:
            path = record["canonical_path"]
            self.assertEqual((record.get("sha256"), record.get("identical_hash_group")), expected_candidates[path])
            self._assert_resolution(record)

        expected_groups: dict[str, set[str]] = {}
        for path, (_, group) in expected_candidates.items():
            expected_groups.setdefault(group, set()).add(path)
        group_records = self._records("identical_hash_group_reconciliation_records")
        self.assertEqual({row.get("identical_hash_group") for row in group_records}, set(expected_groups))
        for record in group_records:
            group = record["identical_hash_group"]
            self.assertEqual(set(record.get("canonical_paths", [])), expected_groups[group])
            self._assert_resolution(record)

    def test_duplicate_stale_missing_withdrawn_and_historical_inputs_are_all_resolved_or_blocked(self) -> None:
        """Requires one explicit result for every duplicate and historical discrepancy input.

        Returns:
            Nothing.
        """
        mechanical = self.mechanical_discrepancies.get("records")
        duplicates = self.human_duplicates.get("duplicate_drift_records")
        history = self.historical.get("records")
        human_history = self.human_historical.get("historical_deleted_records")
        comparisons = self.human_discrepancies.get("mechanical_observation_records")
        self.assertTrue(all(isinstance(rows, list) for rows in (mechanical, duplicates, history, human_history, comparisons)))
        assert isinstance(mechanical, list) and isinstance(duplicates, list) and isinstance(history, list) and isinstance(human_history, list) and isinstance(comparisons, list)
        expected = {
            *(f"mechanical:{row['observation_id']}" for row in mechanical if isinstance(row, dict)),
            *(f"human-duplicate:{row['record_id']}" for row in duplicates if isinstance(row, dict)),
            *(f"historical:{_key(row['evidence'])}" for row in history if isinstance(row, dict)),
            *(f"human-historical:{_key(row['evidence'])}" for row in human_history if isinstance(row, dict)),
            *(f"human-comparison:{row['observation_id']}" for row in comparisons if isinstance(row, dict)),
        }
        module = _load_phase3_generator_module()
        expected.update(
            module.symmetric_blocker_id(row["category"], row["record_key"])
            for row in self.human_discrepancies["independent_symmetric_blocking_records"]
        )
        records = self._records("discrepancy_reconciliation_records")
        self.assertEqual({row.get("discrepancy_key") for row in records}, expected)
        for record in records:
            self.assertIn(record.get("discrepancy_type"), DISCREPANCY_TYPES)
            self._assert_resolution(record)

    def test_unresolved_sources_are_enumerated_once_and_block_all_completion(self) -> None:
        """Ensures missing evidence is recorded as a blocker rather than inferred away.

        Returns:
            Nothing.
        """
        unresolved = self.reconciliation.get("unresolved_sources")
        self.assertIsInstance(unresolved, list)
        assert isinstance(unresolved, list)
        ids = [row.get("unresolved_source_id") for row in unresolved]
        self.assertTrue(all(isinstance(identifier, str) and identifier for identifier in ids))
        self.assertEqual(len(ids), len(set(ids)))
        all_records = [
            *self._records("replacement_program_identity_records"),
            *self._records("identity_reconciliation_records"),
            *self._records("file_reconciliation_records"),
            *self._records("source_record_reconciliation_records"),
            *self._records("graph_edge_reconciliation_records"),
            *self._records("surface_reconciliation_records"),
            *self._records("asset_candidate_reconciliation_records"),
            *self._records("identical_hash_group_reconciliation_records"),
            *self._records("copy_reconciliation_records"),
            *self._records("discrepancy_reconciliation_records"),
        ]
        record_unresolved = {row.get("unresolved_source_id") for row in all_records if row.get("resolution_status") == UNRESOLVED_STATUS}
        self.assertEqual(record_unresolved, set(ids), "every unresolved source must be explicit and every explicit unresolved source must block a record")
        module = _load_phase3_generator_module()
        expected_symmetric_ids = {
            module.symmetric_blocker_id(row["category"], row["record_key"])
            for row in self.human_discrepancies["independent_symmetric_blocking_records"]
        }
        self.assertEqual(set(ids), expected_symmetric_ids)
        self.assertEqual(
            self.reconciliation.get("status"),
            "reconciliation-blocked" if expected_symmetric_ids else "reconciliation-complete",
        )

    def test_symmetric_blockers_propagate_one_to_one_into_phase3(self) -> None:
        """Requires every Phase-2 either-side-only record to remain blocking in Phase 3."""
        phase2 = _load_json(HUMAN_DISCREPANCY_PATH)
        module = _load_phase3_generator_module()
        blockers = phase2.get("independent_symmetric_blocking_records")
        self.assertIsInstance(blockers, list)
        assert isinstance(blockers, list)
        expected = {
            module.symmetric_blocker_id(row["category"], row["record_key"])
            for row in blockers
        }
        propagated = {
            row.get("unresolved_source_id")
            for row in self._records("discrepancy_reconciliation_records")
            if row.get("discrepancy_type") == "denominator-mismatch"
        }
        self.assertEqual(propagated, expected)
        if expected:
            self.assertEqual(self.reconciliation.get("status"), "reconciliation-blocked")

    def test_matched_transition_candidate_does_not_propagate_as_unresolved(self) -> None:
        """Keeps an exact retained target write out of blocker propagation."""
        module = _load_phase3_generator_module()
        from measure.evidence_integrity_gates import apk_inventory_live

        phase2_spec = importlib.util.spec_from_file_location(
            "apk_phase2_key_parity",
            TRACK_DIR / "generate_phase2_human_discovery.py",
        )
        assert phase2_spec is not None and phase2_spec.loader is not None
        phase2_module = importlib.util.module_from_spec(phase2_spec)
        sys.modules[phase2_spec.name] = phase2_module
        phase2_spec.loader.exec_module(phase2_module)
        evidence = self.human_discovery["surface_reviews"][0]["evidence"][0]
        candidate = {
            "path": "game.ts",
            "source_symbol": "status",
            "to_state_id": "victory",
            "reason": "no-single-proven-from-state",
            "evidence": {"path": "game.ts", "range": {"start_line": 10}},
        }
        self.assertEqual(
            phase2_module.transition_candidate_key(candidate),
            module.transition_candidate_key(candidate),
        )
        self.assertEqual(
            module.transition_candidate_key(candidate),
            apk_inventory_live._transition_candidate_key(candidate),
        )
        row = {
            "category": "transition-write-candidates",
            "record_key": module.transition_candidate_key(candidate),
            "comparison_status": "matched",
            "blocking": False,
            "resolution_status": "retained-target-write-candidate",
            "mechanical_evidence": [evidence],
            "human_evidence": [evidence],
        }
        records, unresolved = module.propagate_symmetric_blockers([row])
        self.assertEqual(records, [])
        self.assertEqual(unresolved, [])
        with self.assertRaisesRegex(ValueError, "SYMMETRIC_RESOLUTION_STATUS_MISMATCH"):
            module.propagate_symmetric_blockers([dict(row, resolution_status="compared")])

    def test_symmetric_blocker_propagation_preserves_exact_records(self) -> None:
        """Exercises human-only and mechanical-only propagation without repository fixtures."""
        module = _load_phase3_generator_module()
        rows = [
            {
                "category": "assets",
                "record_key": "human-only.png",
                "comparison_status": "human-only",
                "blocking": True,
                "resolution_status": "compared",
                "mechanical_evidence": [],
                "human_evidence": [{"path": "human-only.png"}],
            },
            {
                "category": "history-paths",
                "record_key": "mechanical-only.ts",
                "comparison_status": "mechanical-only",
                "blocking": True,
                "resolution_status": "compared",
                "mechanical_evidence": [{"path": "mechanical-only.ts"}],
                "human_evidence": [],
            },
        ]
        with mock.patch.object(module, "validate_symmetric_evidence", side_effect=lambda value: value):
            records, unresolved = module.propagate_symmetric_blockers(rows)
        self.assertEqual(len(records), 2)
        self.assertEqual(len(unresolved), 2)
        self.assertEqual({row["comparison_status"] for row in records}, {"human-only", "mechanical-only"})
        self.assertTrue(all(row["blocking"] for row in records))
        self.assertEqual(
            {row["unresolved_source_id"] for row in records},
            {row["unresolved_source_id"] for row in unresolved},
        )
        for source, propagated in zip(rows, records, strict=True):
            self.assertEqual(propagated["symmetric_category"], source["category"])
            self.assertEqual(propagated["record_key"], source["record_key"])
            self.assertEqual(propagated["comparison_status"], source["comparison_status"])
            self.assertEqual(propagated["mechanical_evidence"], source["mechanical_evidence"])
            self.assertEqual(propagated["human_evidence"], source["human_evidence"])
            self.assertEqual(
                propagated["unresolved_source_id"],
                module.symmetric_blocker_id(source["category"], source["record_key"]),
            )

    def test_symmetric_blocker_empty_sides_survive_real_revalidation(self) -> None:
        """Uses committed locators to prove empty evidence sides are preserved without mocking."""
        module = _load_phase3_generator_module()
        phase2 = _load_json(HUMAN_DISCREPANCY_PATH)
        blockers = phase2["independent_symmetric_blocking_records"]
        rows = [
            {
                **next(row for row in blockers if row["category"] == "transitions" and row["comparison_status"] == status),
                "resolution_status": "compared",
            }
            for status in ("human-only", "mechanical-only")
        ]

        records, unresolved = module.propagate_symmetric_blockers(rows)

        self.assertEqual(len(records), 2)
        self.assertEqual(len(unresolved), 2)
        by_status = {row["comparison_status"]: row for row in records}
        self.assertEqual(by_status["human-only"]["mechanical_evidence"], [])
        self.assertEqual(by_status["mechanical-only"]["human_evidence"], [])
        self.assertEqual(by_status["human-only"]["human_evidence"], rows[0]["human_evidence"])
        self.assertEqual(by_status["mechanical-only"]["mechanical_evidence"], rows[1]["mechanical_evidence"])

    def test_all_committed_symmetric_blocker_evidence_is_valid_and_exact(self) -> None:
        """Validates locator, asset hash, and deletion evidence for every current blocker."""
        module = _load_phase3_generator_module()
        phase2 = _load_json(HUMAN_DISCREPANCY_PATH)
        blockers = phase2["independent_symmetric_blocking_records"]

        records, unresolved = module.propagate_symmetric_blockers(blockers)

        self.assertEqual(len(records), len(blockers))
        self.assertEqual(len(unresolved), len(blockers))
        for source, propagated in zip(blockers, records, strict=True):
            self.assertEqual(propagated["symmetric_category"], source["category"])
            self.assertEqual(propagated["record_key"], source["record_key"])
            self.assertEqual(propagated["comparison_status"], source["comparison_status"])
            self.assertEqual(propagated["mechanical_evidence"], source["mechanical_evidence"])
            self.assertEqual(propagated["human_evidence"], source["human_evidence"])

    def test_phase3_derives_predecessor_revisions_from_the_receipt(self) -> None:
        """Prevents stale embedded Phase-1 and Phase-2 implementation revisions."""
        source = (TRACK_DIR / "generate_phase3_reconciliation.py").read_text(encoding="utf-8")
        self.assertNotRegex(source, r"(?m)^PHASE1_REVISION\s*=")
        self.assertNotRegex(source, r"(?m)^PHASE2_IMPLEMENTATION_REVISION\s*=")
        self.assertIn('commit_binding.get("phase1_attestation_commit")', source)
        self.assertIn('receipt.get("commit_sha")', source)

    def test_phase3_contains_no_interpretation_or_vacuous_completion(self) -> None:
        """Rejects semantic conclusions and empty comparison collections.

        Returns:
            Nothing.
        """
        self._assert_no_interpretation_fields(self.reconciliation)
        for field in (
            "replacement_program_identity_records",
            "identity_reconciliation_records",
            "file_reconciliation_records",
            "source_record_reconciliation_records",
            "graph_edge_reconciliation_records",
            "surface_reconciliation_records",
            "asset_candidate_reconciliation_records",
            "identical_hash_group_reconciliation_records",
            "copy_reconciliation_records",
            "discrepancy_reconciliation_records",
        ):
            self._records(field)

    def test_revalidate_rejects_forged_locator_hashes(self) -> None:
        """Rejects a locator whose submitted payload differs from recomputation."""
        module = _load_phase3_generator_module()
        valid = {
            "revision": module.BASELINE,
            "path": "source.ts",
            "blob_sha256": "a" * 64,
            "range": {"start_line": 1, "end_line": 1, "sha256": "b" * 64},
        }
        with mock.patch.object(module, "locator", return_value=valid):
            self.assertEqual(module.revalidate(valid), valid)
            forged = dict(valid, blob_sha256="0" * 64)
            with self.assertRaisesRegex(ValueError, "LOCATOR_MISMATCH"):
                module.revalidate(forged)

    def test_matched_record_rejects_unrelated_valid_evidence(self) -> None:
        """Rejects two valid locators without overlap or paired key equivalence."""
        module = _load_phase3_generator_module()
        mechanical = {"revision": "a" * 40, "path": "a.ts", "blob_sha256": "1" * 64, "range": {"start_line": 1, "end_line": 1, "sha256": "2" * 64}}
        human = {"revision": "a" * 40, "path": "b.ts", "blob_sha256": "3" * 64, "range": {"start_line": 1, "end_line": 1, "sha256": "4" * 64}}
        with mock.patch.object(module, "revalidate", side_effect=lambda item: item):
            with self.assertRaisesRegex(ValueError, "MATCH_EVIDENCE_UNRELATED"):
                module.matched_record(
                    canonical_identity_id="one-sided-is-insufficient",
                    mechanical_evidence=[mechanical],
                    human_evidence=[human],
                )
            matched = module.matched_record(
                disposition="historical/withdrawn",
                mechanical_record_key="catalog/x",
                human_record_key="catalog/x",
                mechanical_evidence=[mechanical],
                human_evidence=[human],
            )
            self.assertEqual(matched["resolution_status"], "matched")

    def test_duplicate_phase3_review_projection_rejects(self) -> None:
        """Rejects duplicate reviewed keys before dictionary collapse."""
        module = _load_phase3_generator_module()
        with self.assertRaisesRegex(ValueError, "DUPLICATE_EXACT_REVIEW_KEY:source"):
            module.unique_review_map(
                [{"id": "same"}, {"id": "same"}], lambda row: row["id"], "source"
            )
        source = (TRACK_DIR / "generate_phase3_reconciliation.py").read_text(encoding="utf-8")
        self.assertNotIn("allow_disjoint_evidence", source)


if __name__ == "__main__":
    unittest.main()
