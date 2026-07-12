"""Falsification contracts for APK denominator Phase-1 mechanical discovery."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK
FREEZE_PATH = TRACK_DIR / "phase0-input-freeze.json"
REPORT_PATH = TRACK_DIR / "denominator-contract-test-report.json"
SOURCE_PATH = TRACK_DIR / "source-denominator.json"
IDENTITY_PATH = TRACK_DIR / "game-identity-ledger.json"
SCENE_PATH = TRACK_DIR / "scene-state-denominator.json"
ASSET_PATH = TRACK_DIR / "asset-file-denominator.json"
HISTORICAL_PATH = TRACK_DIR / "historical-source-denominator.json"
SHA256 = re.compile(r"^[0-9a-f]{64}$")
REQUIRED_SOURCE_RECORD_TYPES = {"identity", "file", "route", "copy", "graph"}
FORBIDDEN_INTERPRETATION_FIELDS = {
    "asset_suitability",
    "capability",
    "capability_conclusion",
    "design_intent",
    "gameplay_interpretation",
    "mechanic",
    "mechanics",
    "product_disposition",
    "recommendation",
    "responsive_strategy",
    "semantic_role",
    "suitability",
}


def _load_json(path: Path) -> dict[str, Any]:
    """Loads a JSON object from a required contract artifact.

    Args:
        path: Artifact path to load.

    Returns:
        Parsed JSON object.

    Raises:
        AssertionError: If the artifact is absent or does not contain a JSON object.
    """
    if not path.is_file():
        raise AssertionError(f"Missing Phase-1 denominator artifact: {path.relative_to(REPO_ROOT)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path.relative_to(REPO_ROOT)} must contain a JSON object")
    return value


def _git_bytes(revision: str, path: str) -> bytes:
    """Reads committed bytes for one exact Git revision and repository-relative path.

    Args:
        revision: Commit that must contain the cited path.
        path: Repository-relative file path.

    Returns:
        The committed file bytes.

    Raises:
        AssertionError: If Git cannot resolve the exact revision and path.
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
        revision: Historical revision cited by a record.
        baseline: Frozen source baseline that bounds history.

    Returns:
        Whether the revision is an ancestor of the frozen baseline.
    """
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", revision, baseline],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    )
    return result.returncode == 0


def _assert_sha256(test: unittest.TestCase, value: object, label: str) -> str:
    """Requires a canonical SHA-256 digest field.

    Args:
        test: Active unittest assertion provider.
        value: Candidate digest value.
        label: Field name included in a failure message.

    Returns:
        The validated digest.
    """
    test.assertIsInstance(value, str, f"{label} must be a SHA-256 string")
    assert isinstance(value, str)
    test.assertRegex(value, SHA256, f"{label} must be lowercase SHA-256")
    return value


class Phase1MechanicalDiscoveryContracts(unittest.TestCase):
    """Rejects incomplete, synthetic, unpinned, and interpretive denominator records."""

    def setUp(self) -> None:
        """Loads frozen inputs and the non-factual contract report skeleton.

        Returns:
            Nothing.
        """
        self.freeze = _load_json(FREEZE_PATH)
        self.report = _load_json(REPORT_PATH)
        scope = self.freeze["source_scope"]
        self.assertIsInstance(scope, dict)
        assert isinstance(scope, dict)
        self.source_baseline = scope["current_revision"]
        self.assertIsInstance(self.source_baseline, str)
        assert isinstance(self.source_baseline, str)
        quarantine = self.freeze["failed_track_quarantine"]
        self.assertIsInstance(quarantine, dict)
        assert isinstance(quarantine, dict)
        self.quarantine_path = quarantine["path"]
        self.assertIsInstance(self.quarantine_path, str)
        assert isinstance(self.quarantine_path, str)

    def _artifact(self, path: Path, schema_version: str) -> dict[str, Any]:
        """Loads and validates one completed mechanical-discovery artifact header.

        Args:
            path: Required artifact path.
            schema_version: Exact schema version required for the artifact.

        Returns:
            Parsed artifact object.
        """
        artifact = _load_json(path)
        self.assertEqual(artifact.get("schema_version"), schema_version)
        self.assertEqual(artifact.get("status"), "mechanical-discovery-complete")
        self.assertEqual(artifact.get("source_baseline_revision"), self.source_baseline)
        return artifact

    def _assert_locator(self, locator: object, *, historical: bool = False) -> dict[str, Any]:
        """Validates and resolves an exact committed file/range evidence locator.

        Args:
            locator: Candidate source locator from a denominator record.
            historical: Whether the locator may use an ancestor revision.

        Returns:
            The validated locator object.
        """
        self.assertIsInstance(locator, dict)
        assert isinstance(locator, dict)
        revision = locator.get("revision")
        path = locator.get("path")
        self.assertIsInstance(revision, str)
        self.assertIsInstance(path, str)
        assert isinstance(revision, str) and isinstance(path, str)
        self.assertFalse(path.startswith("/"), "locators must use repository-relative paths")
        self.assertFalse(path.endswith("/"), "directory locators are forbidden")
        self.assertFalse(path.startswith(f"{self.quarantine_path}/"), "quarantined sources cannot supply facts")
        if historical:
            self.assertTrue(
                _is_ancestor(revision, self.source_baseline),
                f"historical revision must be reachable from frozen baseline: {revision}",
            )
        else:
            self.assertEqual(revision, self.source_baseline, "current evidence must use the frozen baseline")
        blob = _git_bytes(revision, path)
        self.assertEqual(_assert_sha256(self, locator.get("blob_sha256"), "blob_sha256"), hashlib.sha256(blob).hexdigest())
        cited_range = locator.get("range")
        self.assertIsInstance(cited_range, dict)
        assert isinstance(cited_range, dict)
        start = cited_range.get("start_line")
        end = cited_range.get("end_line")
        self.assertIsInstance(start, int)
        self.assertIsInstance(end, int)
        assert isinstance(start, int) and isinstance(end, int)
        lines = blob.splitlines(keepends=True)
        self.assertGreaterEqual(start, 1)
        self.assertGreaterEqual(end, start)
        self.assertLessEqual(end, len(lines), "cited range must resolve inside the committed file")
        range_bytes = b"".join(lines[start - 1 : end])
        self.assertEqual(
            _assert_sha256(self, cited_range.get("sha256"), "range.sha256"),
            hashlib.sha256(range_bytes).hexdigest(),
        )
        return locator

    def _assert_no_interpretation_fields(self, value: object, location: str = "$") -> None:
        """Fails when a denominator artifact contains a prohibited conclusion field.

        Args:
            value: JSON value to inspect recursively.
            location: Human-readable JSON path for failure messages.

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

    def test_contract_report_is_red_only_and_names_the_focused_commands(self) -> None:
        """Keeps the authored contract report distinct from discovered source truth.

        Returns:
            Nothing.
        """
        self.assertEqual(self.report.get("schema_version"), "apk-denominator-contract-test-report.v1")
        self.assertEqual(self.report.get("status"), "red-contract-authored")
        self.assertEqual(self.report.get("source_baseline_revision"), self.source_baseline)
        self.assertEqual(self.report.get("red_command"), self.report.get("green_command"))
        self.assertIn("test_apk_source_denominator_inventory_phase1", str(self.report.get("red_command")))
        self.assertNotIn("accepted", str(self.report.get("status")).lower())

    def test_source_identity_file_route_copy_and_graph_records_are_pinned(self) -> None:
        """Requires nonempty current-source records for every mechanical denominator class.

        Returns:
            Nothing.
        """
        source = self._artifact(SOURCE_PATH, "apk-source-denominator.v1")
        records = source.get("records")
        self.assertIsInstance(records, list)
        assert isinstance(records, list)
        self.assertTrue(records, "source denominator cannot be empty")
        ids: set[str] = set()
        record_types: set[str] = set()
        for record in records:
            self.assertIsInstance(record, dict)
            assert isinstance(record, dict)
            record_id = record.get("record_id")
            record_type = record.get("record_type")
            self.assertIsInstance(record_id, str)
            self.assertIsInstance(record_type, str)
            assert isinstance(record_id, str) and isinstance(record_type, str)
            self.assertTrue(record_id)
            self.assertNotIn(record_id, ids, "source record IDs must be unique")
            ids.add(record_id)
            record_types.add(record_type)
            self.assertIn(record.get("discovery_method"), {"mechanical-filesystem", "mechanical-ast", "mechanical-graph"})
            self._assert_locator(record.get("evidence"))
            if record_type == "identity":
                self.assertIsInstance(record.get("canonical_identity_id"), str)
            elif record_type == "file":
                self.assertIsInstance(record.get("file_path"), str)
            elif record_type == "route":
                self.assertIsInstance(record.get("route"), str)
            elif record_type == "copy":
                self.assertIsInstance(record.get("copy_source_record_id"), str)
            elif record_type == "graph":
                self.assertIsInstance(record.get("graph_node_id"), str)
        self.assertTrue(REQUIRED_SOURCE_RECORD_TYPES.issubset(record_types))
        graph_edges = source.get("graph_edges")
        self.assertIsInstance(graph_edges, list)
        assert isinstance(graph_edges, list)
        self.assertTrue(graph_edges, "graph relationships cannot be omitted")
        for edge in graph_edges:
            self.assertIsInstance(edge, dict)
            assert isinstance(edge, dict)
            self.assertIn(edge.get("from_record_id"), ids)
            self.assertIn(edge.get("to_record_id"), ids)
            self._assert_locator(edge.get("evidence"))

    def test_identity_ledger_and_scene_state_transitions_are_real_source_evidenced(self) -> None:
        """Rejects synthetic fallback scenes and unpinned identity or state transitions.

        Returns:
            Nothing.
        """
        identities = self._artifact(IDENTITY_PATH, "apk-game-identity-ledger.v1")
        identity_records = identities.get("identity_records")
        self.assertIsInstance(identity_records, list)
        assert isinstance(identity_records, list)
        self.assertTrue(identity_records, "game identity ledger cannot be empty")
        identity_ids: set[str] = set()
        for record in identity_records:
            self.assertIsInstance(record, dict)
            assert isinstance(record, dict)
            identity_id = record.get("canonical_identity_id")
            self.assertIsInstance(identity_id, str)
            assert isinstance(identity_id, str)
            self.assertTrue(identity_id)
            self.assertNotIn(identity_id, identity_ids)
            identity_ids.add(identity_id)
            aliases = record.get("aliases")
            self.assertIsInstance(aliases, list)
            assert isinstance(aliases, list)
            for alias in aliases:
                self.assertIsInstance(alias, dict)
                assert isinstance(alias, dict)
                self.assertIsInstance(alias.get("alias"), str)
                self._assert_locator(alias.get("evidence"))
            routes = record.get("routes")
            self.assertIsInstance(routes, list)
            assert isinstance(routes, list)
            self.assertTrue(routes, "each identity requires source-evidenced routes")
            for route in routes:
                self.assertIsInstance(route, dict)
                assert isinstance(route, dict)
                self.assertIsInstance(route.get("route"), str)
                self._assert_locator(route.get("evidence"))

        scenes = self._artifact(SCENE_PATH, "apk-scene-state-denominator.v1")
        scene_records = scenes.get("scene_records")
        state_records = scenes.get("state_records")
        transitions = scenes.get("transitions")
        self.assertIsInstance(scene_records, list)
        self.assertIsInstance(state_records, list)
        self.assertIsInstance(transitions, list)
        assert isinstance(scene_records, list) and isinstance(state_records, list) and isinstance(transitions, list)
        self.assertTrue(scene_records, "real scene records cannot be replaced with a synthetic fallback")
        self.assertTrue(state_records, "real state records cannot be omitted")
        self.assertTrue(transitions, "real transitions cannot be omitted")
        scene_ids: set[str] = set()
        state_ids: set[str] = set()
        for records, label, record_ids in (
            (scene_records, "scene_id", scene_ids),
            (state_records, "state_id", state_ids),
        ):
            for record in records:
                self.assertIsInstance(record, dict)
                assert isinstance(record, dict)
                identifier = record.get(label)
                self.assertIsInstance(identifier, str)
                assert isinstance(identifier, str)
                self.assertTrue(identifier)
                self.assertNotIn(identifier.lower(), {"main", "default", "fallback", "synthetic"}, "synthetic fallback IDs are forbidden")
                self.assertNotIn(identifier, record_ids)
                record_ids.add(identifier)
                locator = self._assert_locator(record.get("evidence"))
                lines = _git_bytes(locator["revision"], locator["path"]).decode("utf-8", errors="replace").splitlines()
                cited = "\n".join(lines[locator["range"]["start_line"] - 1 : locator["range"]["end_line"]])
                self.assertIn(identifier, cited, "scene/state ID must occur in its exact source evidence")
        for transition in transitions:
            self.assertIsInstance(transition, dict)
            assert isinstance(transition, dict)
            self.assertIn(transition.get("from_state_id"), state_ids)
            self.assertIn(transition.get("to_state_id"), state_ids)
            self.assertIn(transition.get("transition_kind"), {"scene", "mode", "overlay", "phase", "wave", "floor", "terminal", "presentation"})
            self._assert_locator(transition.get("evidence"))

    def test_asset_audio_and_data_candidates_have_committed_hashes_format_metadata_and_duplicate_groups(self) -> None:
        """Requires every recorded candidate file to be hash- and format-pinned.

        Returns:
            Nothing.
        """
        assets = self._artifact(ASSET_PATH, "apk-asset-file-denominator.v1")
        candidates = assets.get("candidate_files")
        self.assertIsInstance(candidates, list)
        assert isinstance(candidates, list)
        self.assertTrue(candidates, "candidate asset denominator cannot be empty")
        paths: set[str] = set()
        grouped_hashes: dict[str, set[str]] = {}
        hash_groups: dict[str, set[str]] = {}
        for candidate in candidates:
            self.assertIsInstance(candidate, dict)
            assert isinstance(candidate, dict)
            path = candidate.get("canonical_path")
            revision = candidate.get("revision")
            self.assertIsInstance(path, str)
            self.assertIsInstance(revision, str)
            assert isinstance(path, str) and isinstance(revision, str)
            self.assertTrue(path and not path.startswith("/") and not path.endswith("/"))
            self.assertNotIn(path, paths, "candidate paths must not be double counted")
            paths.add(path)
            self.assertFalse(path.startswith(f"{self.quarantine_path}/"))
            self.assertEqual(revision, self.source_baseline)
            blob = _git_bytes(revision, path)
            self.assertEqual(_assert_sha256(self, candidate.get("sha256"), "candidate.sha256"), hashlib.sha256(blob).hexdigest())
            self.assertIn(candidate.get("file_kind"), {"asset", "audio", "data"})
            metadata = candidate.get("format_metadata")
            self.assertIsInstance(metadata, dict)
            assert isinstance(metadata, dict)
            self.assertTrue(all(key in metadata for key in ("format", "mime_type", "byte_size")))
            self.assertIsInstance(metadata["format"], str)
            self.assertIsInstance(metadata["mime_type"], str)
            self.assertEqual(metadata["byte_size"], len(blob))
            group = candidate.get("identical_hash_group")
            self.assertIsInstance(group, str)
            assert isinstance(group, str)
            grouped_hashes.setdefault(group, set()).add(candidate["sha256"])
            hash_groups.setdefault(candidate["sha256"], set()).add(group)
        self.assertTrue(all(len(hashes) == 1 for hashes in grouped_hashes.values()), "duplicate groups may contain only identical hashes")
        self.assertTrue(all(len(groups) == 1 for groups in hash_groups.values()), "identical hashes may not be silently split across groups")
        enumeration = assets.get("enumeration")
        self.assertIsInstance(enumeration, dict)
        assert isinstance(enumeration, dict)
        self.assertEqual(enumeration.get("candidate_count"), len(candidates))
        self.assertIn(enumeration.get("method"), {"mechanical-filesystem", "mechanical-filesystem-and-hash"})

    def test_historical_records_and_negative_quarantine_fixtures_fail_closed(self) -> None:
        """Requires reachable historical locators and explicit failed-track rejection fixtures.

        Returns:
            Nothing.
        """
        historical = self._artifact(HISTORICAL_PATH, "apk-historical-source-denominator.v1")
        records = historical.get("records")
        self.assertIsInstance(records, list)
        assert isinstance(records, list)
        self.assertTrue(records, "historical denominator cannot be empty")
        for record in records:
            self.assertIsInstance(record, dict)
            assert isinstance(record, dict)
            self.assertIn(record.get("classification"), {"current", "withdrawn", "historical", "deleted", "alias", "copy"})
            self._assert_locator(record.get("evidence"), historical=True)

        source = self._artifact(SOURCE_PATH, "apk-source-denominator.v1")
        fixtures = source.get("quarantine_fixtures")
        self.assertIsInstance(fixtures, list)
        assert isinstance(fixtures, list)
        self.assertTrue(fixtures, "failed-track quarantine requires negative fixtures")
        for fixture in fixtures:
            self.assertIsInstance(fixture, dict)
            assert isinstance(fixture, dict)
            self.assertIsInstance(fixture.get("fixture_id"), str)
            self.assertTrue(str(fixture.get("quarantined_path", "")).startswith(self.quarantine_path))
            self.assertEqual(fixture.get("expected_result"), "rejected")
            self.assertEqual(fixture.get("rejection_code"), "QUARANTINED_FACTUAL_SOURCE")
            _assert_sha256(self, fixture.get("fixture_sha256"), "fixture_sha256")

    def test_all_denominator_artifacts_reject_forbidden_interpretation_fields(self) -> None:
        """Prevents mechanical discovery from smuggling ontology or product conclusions.

        Returns:
            Nothing.
        """
        for path, schema in (
            (SOURCE_PATH, "apk-source-denominator.v1"),
            (IDENTITY_PATH, "apk-game-identity-ledger.v1"),
            (SCENE_PATH, "apk-scene-state-denominator.v1"),
            (ASSET_PATH, "apk-asset-file-denominator.v1"),
            (HISTORICAL_PATH, "apk-historical-source-denominator.v1"),
        ):
            self._assert_no_interpretation_fields(self._artifact(path, schema))


if __name__ == "__main__":
    unittest.main()
