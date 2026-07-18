"""Falsification contracts for APK denominator Phase-1 mechanical discovery."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path, PurePosixPath
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK
ARTIFACT_DIR = Path(os.environ.get("APK_DENOMINATOR_ARTIFACT_DIR", TRACK_DIR))
FREEZE_PATH = TRACK_DIR / "phase0-input-freeze.json"
REPORT_PATH = TRACK_DIR / "denominator-contract-test-report.json"
SOURCE_PATH = ARTIFACT_DIR / "source-denominator.json"
IDENTITY_PATH = ARTIFACT_DIR / "game-identity-ledger.json"
SCENE_PATH = ARTIFACT_DIR / "scene-state-denominator.json"
ASSET_PATH = ARTIFACT_DIR / "asset-file-denominator.json"
HISTORICAL_PATH = ARTIFACT_DIR / "historical-source-denominator.json"
DISCREPANCY_PATH = ARTIFACT_DIR / "denominator-discrepancies.json"
SHA256 = re.compile(r"^[0-9a-f]{64}$")
REQUIRED_SOURCE_RECORD_TYPES = {"identity", "file", "route", "copy", "graph"}
REQUIRED_NON_GAME_SOURCES = {
    "measure/apk-asset-system-program.md",
    "measure/apk-evidence-reconstruction-program.md",
    "packages/game-cartridges/src/catalog.test.ts",
    "packages/game-cartridges/src/catalog.ts",
    "packages/game-cartridges/src/index.ts",
}
CATALOG_PATH = "apps/advantage-games/src/lib/gameCards.ts"
RUNTIME_STATE_NAME = re.compile(
    r"(?:state|status|phase|mode|scene|screen|overlay|wave|floor|turn|pose|step)",
    re.IGNORECASE,
)
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


def _load_generator_module() -> Any:
    """Loads the Phase-1 generator for focused relevance classifier contracts."""
    path = TRACK_DIR / "generate_phase1_denominators.py"
    spec = importlib.util.spec_from_file_location("apk_phase1_generator_relevance", path)
    if spec is None or spec.loader is None:
        raise AssertionError("Unable to load Phase-1 generator")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _load_transition_module() -> Any:
    """Loads the compiler-AST transition adjudicator for partition checks."""
    path = TRACK_DIR / "transition_ast.py"
    spec = importlib.util.spec_from_file_location("apk_phase1_transition_partition", path)
    if spec is None or spec.loader is None:
        raise AssertionError("Unable to load transition AST adjudicator")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _load_json(path: Path) -> dict[str, Any]:
    """Loads a JSON object from a required contract artifact.

    Args:
        path: Artifact path to load.

    Returns:
        Parsed JSON object.

    Raises:
        AssertionError: If the artifact is absent or does not contain a JSON object.
    """
    label = str(path.relative_to(REPO_ROOT)) if path.is_relative_to(REPO_ROOT) else str(path)
    if not path.is_file():
        raise AssertionError(f"Missing Phase-1 denominator artifact: {label}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{label} must contain a JSON object")
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
        file_paths = {
            record["file_path"]
            for record in records
            if record.get("record_type") == "file" and isinstance(record.get("file_path"), str)
        }
        self.assertTrue(REQUIRED_NON_GAME_SOURCES.issubset(file_paths))
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

        edge_keys = {
            (
                str(record.get("file_path")),
                str(graph.get("import_specifier")),
                str(next(item.get("file_path") for item in records if item.get("record_id") == edge.get("to_record_id"))),
            )
            for graph in records
            if graph.get("record_type") == "graph"
            for edge in graph_edges
            if edge.get("evidence") == graph.get("evidence")
            for record in records
            if record.get("record_id") == edge.get("from_record_id")
        }
        suffixes = ("", ".ts", ".tsx", ".js", ".jsx", ".json")
        for source_path in sorted(path for path in file_paths if path.startswith("apps/")):
            if PurePosixPath(source_path).suffix.lower() not in {".ts", ".tsx", ".js", ".jsx", ".json"}:
                continue
            text = _git_bytes(self.source_baseline, source_path).decode("utf-8", errors="replace")
            for specifier in re.findall(r"^\s*import(?:[\s\S]*?from\s*)?['\"]([^'\"]+)['\"]", text, re.MULTILINE):
                if not specifier.startswith("@/"):
                    continue
                if source_path.startswith("apps/advantage-games/"):
                    base = "apps/advantage-games/src/" + specifier[2:]
                elif source_path.startswith("apps/reading-advantage/"):
                    base = "apps/reading-advantage/" + specifier[2:]
                elif source_path.startswith("apps/primary-advantage/"):
                    base = "apps/primary-advantage/" + specifier[2:]
                else:
                    continue
                candidates = [base + suffix for suffix in suffixes]
                candidates.extend(base + "/index" + suffix for suffix in suffixes[1:-1])
                target = next((candidate for candidate in candidates if candidate in file_paths), None)
                if target is not None:
                    self.assertIn((source_path, specifier, target), edge_keys)

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
            source_states = record.get("source_states")
            self.assertIsInstance(source_states, list)
            assert isinstance(source_states, list)
            source_classes = {state.get("source_class") for state in source_states if isinstance(state, dict)}
            self.assertTrue(source_classes)
            if "current-page-source" in source_classes:
                self.assertTrue(routes, "current page identities require source-evidenced routes")
            else:
                self.assertEqual(
                    source_classes,
                    {"catalog-withdrawn-registration"},
                    "route-less identities must be exact catalog-withdrawn identities, not synthetic pages",
                )
                self.assertEqual(routes, [], "catalog-withdrawn identities cannot acquire synthetic current routes")
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
        scene_occurrences: set[str] = set()
        state_occurrences: set[str] = set()
        state_ids: set[str] = set()
        for records, label, occurrence_label, occurrence_ids in (
            (scene_records, "scene_id", "scene_occurrence_id", scene_occurrences),
            (state_records, "state_id", "state_occurrence_id", state_occurrences),
        ):
            for record in records:
                self.assertIsInstance(record, dict)
                assert isinstance(record, dict)
                identifier = record.get(label)
                self.assertIsInstance(identifier, str)
                assert isinstance(identifier, str)
                self.assertTrue(identifier)
                self.assertNotIn(identifier.lower(), {"main", "default", "fallback", "synthetic"}, "synthetic fallback IDs are forbidden")
                occurrence_id = record.get(occurrence_label)
                self.assertIsInstance(occurrence_id, str)
                assert isinstance(occurrence_id, str)
                self.assertNotIn(occurrence_id, occurrence_ids)
                occurrence_ids.add(occurrence_id)
                if label == "state_id":
                    state_ids.add(identifier)
                locator = self._assert_locator(record.get("evidence"))
                lines = _git_bytes(locator["revision"], locator["path"]).decode("utf-8", errors="replace").splitlines()
                cited = "\n".join(lines[locator["range"]["start_line"] - 1 : locator["range"]["end_line"]])
                self.assertIn(identifier, cited, "scene/state ID must occur in its exact source evidence")
        for transition in transitions:
            self.assertIsInstance(transition, dict)
            assert isinstance(transition, dict)
            self.assertIn(transition.get("from_state_id"), state_ids)
            self.assertIn(transition.get("to_state_id"), state_ids)
            self.assertIn(transition.get("from_state_occurrence_id"), state_occurrences)
            self.assertIn(transition.get("to_state_occurrence_id"), state_occurrences)
            self.assertIn(transition.get("transition_kind"), {"scene", "mode", "overlay", "phase", "wave", "floor", "terminal", "presentation"})
            evidence_kind = transition.get("transition_evidence_kind")
            self.assertIn(evidence_kind, {
                "ast-entry-guarded-write",
                "ast-guarded-setter-call",
                "ast-lifecycle-reset-callback-write",
                "ast-object-spread-state-write",
                "ast-propagated-entry-guarded-write",
                "ast-zustand-conditional-guarded-write",
                "ast-zustand-guarded-write",
            })
            self.assertEqual(
                transition.get("discovery_method"),
                "mechanical-typescript-compiler-ast",
            )
            locator = self._assert_locator(transition.get("evidence"))
            lines = _git_bytes(locator["revision"], locator["path"]).decode("utf-8", errors="replace").splitlines()
            cited = "\n".join(lines[locator["range"]["start_line"] - 1 : locator["range"]["end_line"]])
            self.assertRegex(
                cited,
                rf"['\"]{re.escape(str(transition['to_state_id']))}['\"]",
                "AST transition evidence must cite the exact executable target literal",
            )
        self.assertEqual(
            {row["transition_evidence_kind"] for row in transitions},
            {
                "ast-entry-guarded-write",
                "ast-guarded-setter-call",
                "ast-lifecycle-reset-callback-write",
                "ast-object-spread-state-write",
                "ast-propagated-entry-guarded-write",
                "ast-zustand-conditional-guarded-write",
                "ast-zustand-guarded-write",
            },
            "the frozen corpus must exercise every accepted compiler-AST proof kind",
        )

        expected_scene_occurrences: set[tuple[str, int, str]] = set()
        expected_state_occurrences: set[tuple[str, int, str, str]] = set()
        for record in _load_json(SOURCE_PATH)["records"]:
            if record.get("record_type") != "file" or not str(record.get("file_path", "")).endswith((".ts", ".tsx", ".js", ".jsx")):
                continue
            path = record["file_path"]
            text = _git_bytes(self.source_baseline, path).decode("utf-8", errors="replace")
            for match in re.finditer(r"(?:export\s+)?(?:function|const)\s+([A-Z][A-Za-z0-9]*(?:Game|Screen|Scene))\b", text):
                expected_scene_occurrences.add((path, text.count("\n", 0, match.start(1)) + 1, match.group(1)))
            for match in re.finditer(r"(?:const|let)\s*\[\s*(\w+)\s*,\s*set\w+\s*\]\s*=\s*(?:React\.)?useState\s*<([^>]+)>", text, re.DOTALL):
                state_name, type_text = match.groups()
                if not re.search(r"(?:state|phase|mode|scene|screen|overlay|wave|floor)", state_name, re.IGNORECASE):
                    continue
                line = text.count("\n", 0, match.start()) + 1
                for literal in re.findall(r"['\"]([^'\"\n]+)['\"]", type_text):
                    expected_state_occurrences.add((path, line, state_name, literal))
        self.assertEqual(
            {(row["evidence"]["path"], row["evidence"]["range"]["start_line"], row["scene_id"]) for row in scene_records},
            expected_scene_occurrences,
        )
        self.assertTrue(
            expected_state_occurrences.issubset({
                (row["evidence"]["path"], row["evidence"]["range"]["start_line"], row["source_symbol"], row["state_id"])
                for row in state_records
            })
        )

    def test_identity_ledger_exhausts_frozen_catalog_without_synthetic_pages(self) -> None:
        """Requires every exact catalog ID while keeping withdrawn-only rows route-less.

        Returns:
            Nothing.
        """
        identities = self._artifact(IDENTITY_PATH, "apk-game-identity-ledger.v1")
        records = identities["identity_records"]
        catalog_text = _git_bytes(self.source_baseline, CATALOG_PATH).decode("utf-8", errors="replace")
        catalog_block = re.search(r"const\s+catalogCards\s*:[^=]+\=\s*\[([\s\S]*?)\n\]", catalog_text)
        withdrawn_block = re.search(r"const\s+withdrawnApkGameIds\s*=\s*new\s+Set\(\[([\s\S]*?)\]\);", catalog_text)
        self.assertIsNotNone(catalog_block)
        self.assertIsNotNone(withdrawn_block)
        assert catalog_block is not None and withdrawn_block is not None
        catalog_ids = set(re.findall(r"^\s*id:\s*['\"]([^'\"]+)['\"]", catalog_block.group(1), re.MULTILINE))
        withdrawn_ids = set(re.findall(r"['\"]([^'\"]+)['\"]", withdrawn_block.group(1)))
        self.assertEqual(len(catalog_ids), 27, "the frozen catalog denominator changed unexpectedly")

        recorded_catalog_ids: set[str] = set()
        for record in records:
            catalog_identity_id = record.get("catalog_identity_id")
            if catalog_identity_id is None:
                continue
            self.assertIsInstance(catalog_identity_id, str)
            assert isinstance(catalog_identity_id, str)
            self.assertNotIn(catalog_identity_id, recorded_catalog_ids)
            recorded_catalog_ids.add(catalog_identity_id)
            catalog_evidence = record.get("catalog_evidence")
            locator = self._assert_locator(catalog_evidence)
            self.assertEqual(locator["path"], CATALOG_PATH)
            cited = "\n".join(
                catalog_text.splitlines()[locator["range"]["start_line"] - 1 : locator["range"]["end_line"]]
            )
            self.assertRegex(cited, rf"\bid:\s*['\"]{re.escape(catalog_identity_id)}['\"]")

        self.assertEqual(recorded_catalog_ids, catalog_ids)
        page_slugs = {
            str(record["canonical_identity_id"]).split("/", 1)[1]
            for record in records
            if "current-page-source" in {
                state.get("source_class")
                for state in record.get("source_states", [])
                if isinstance(state, dict)
            }
        }
        withdrawn_only = catalog_ids - page_slugs
        self.assertEqual(withdrawn_only, withdrawn_ids - page_slugs)
        for record in records:
            if record.get("catalog_identity_id") not in withdrawn_only:
                continue
            self.assertEqual(record.get("routes"), [])
            self.assertEqual(
                {state.get("source_class") for state in record.get("source_states", [])},
                {"catalog-withdrawn-registration"},
            )

    def test_shared_apk_package_file_denominator_is_exact_and_complete(self) -> None:
        """Requires every frozen file in the three shared APK packages."""
        result = subprocess.run(
            [
                "git", "ls-tree", "-r", "--name-only", self.source_baseline, "--",
                "packages/advantage-play-kit", "packages/game-contracts", "packages/game-cartridges",
            ],
            cwd=REPO_ROOT,
            capture_output=True,
            check=True,
            text=True,
        )
        expected_paths = set(result.stdout.splitlines())
        self.assertEqual(
            len(expected_paths), 48,
            "the frozen three-package file denominator changed unexpectedly",
        )
        source = self._artifact(SOURCE_PATH, "apk-source-denominator.v1")
        recorded_paths = {
            row["file_path"]
            for row in source["records"]
            if row.get("record_type") == "file" and isinstance(row.get("file_path"), str)
        }
        self.assertEqual(
            expected_paths & recorded_paths,
            expected_paths,
            "all 48 frozen shared-package files must be present; filtering to three "
            "game-cartridge source files is not an exhaustive denominator",
        )

    def test_object_shaped_game_state_domains_are_exhaustively_enumerated(self) -> None:
        """Requires literal state fields declared inside object-shaped state types."""
        specifications = (
            ("apps/advantage-games/src/lib/games/alchemistsSynthesis.ts", "AlchemistsSynthesisState", "status"),
            ("apps/advantage-games/src/lib/games/castleDefense.ts", "CastleDefenseState", "status"),
            ("apps/advantage-games/src/lib/games/dragonFlight.ts", "DragonFlightState", "status"),
            ("apps/advantage-games/src/lib/games/devourerSlime.ts", "SlimeState", "phase"),
            ("apps/advantage-games/src/lib/games/enchantedLibrary.ts", "EnchantedLibraryState", "status"),
            ("apps/advantage-games/src/lib/games/runeMatch.ts", "RuneMatchState", "status"),
            ("apps/advantage-games/src/lib/games/wizardZombie.ts", "WizardZombieState", "status"),
        )
        expected: set[tuple[str, str, str]] = set()
        for path, type_name, property_name in specifications:
            text = _git_bytes(self.source_baseline, path).decode("utf-8", errors="replace")
            declaration = re.search(
                rf"export\s+type\s+{re.escape(type_name)}\s*=\s*\{{([\s\S]*?)\n\}};?",
                text,
            )
            self.assertIsNotNone(declaration, f"frozen object-state type must resolve: {type_name}")
            assert declaration is not None
            property_declaration = re.search(
                rf"^\s*{re.escape(property_name)}\??:\s*([^;]+);",
                declaration.group(1),
                re.MULTILINE,
            )
            self.assertIsNotNone(property_declaration, f"frozen state property must resolve: {type_name}.{property_name}")
            assert property_declaration is not None
            literals = set(re.findall(r"['\"]([^'\"\n]+)['\"]", property_declaration.group(1)))
            self.assertTrue(literals, f"state domain cannot be empty: {type_name}.{property_name}")
            expected.update((path, f"{type_name}.{property_name}", literal) for literal in literals)
        self.assertEqual(len(expected), 22, "the seven frozen object-state domains changed unexpectedly")
        scenes = self._artifact(SCENE_PATH, "apk-scene-state-denominator.v1")
        recorded = {
            (row["evidence"]["path"], row["source_symbol"], row["state_id"])
            for row in scenes["state_records"]
        }
        self.assertEqual(
            expected & recorded,
            expected,
            "object-shaped state declarations must not be omitted by a literal-union/interface-only parser",
        )

    def test_runtime_store_state_domains_and_explicit_transitions_are_exhaustive(self) -> None:
        """Requires general source-backed Zustand state domains and guarded transitions.

        Returns:
            Nothing.
        """
        scenes = self._artifact(SCENE_PATH, "apk-scene-state-denominator.v1")
        state_keys = {
            (row["evidence"]["path"], row["source_symbol"], row["state_id"])
            for row in scenes["state_records"]
        }
        transition_keys = {
            (
                row["evidence"]["path"],
                row.get("source_symbol"),
                row["from_state_id"],
                row["to_state_id"],
            )
            for row in scenes["transitions"]
        }
        transition_candidate_keys = {
            (
                row["evidence"]["path"],
                row.get("source_symbol"),
                row["to_state_id"],
            )
            for row in scenes["transition_write_candidates"]
            if row.get("record_kind") == "transition_write_candidate"
            and row.get("resolution_status") == "unresolved"
        }

        expected_states = {
            ("apps/advantage-games/src/store/usePotionRushStore.ts", "GameState", state)
            for state in {"MENU", "PLAYING", "PAUSED", "GAME_OVER"}
        } | {
            ("apps/advantage-games/src/store/usePotionRushStore.ts", "CauldronState", state)
            for state in {"IDLE", "BREWING", "WARNING", "COMPLETED"}
        } | {
            ("apps/advantage-games/src/store/usePotionRushStore.ts", "Customer.state", state)
            for state in {"WAITING", "LEAVING_ANGRY", "LEAVING_HAPPY"}
        } | {
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "BattleStatus", state)
            for state in {"idle", "playing", "victory", "defeat"}
        } | {
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "BattleTurn", state)
            for state in {"player", "enemy"}
        } | {
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "BattlePose", state)
            for state in {"idle", "casting", "basic-attack", "power-attack", "hurt", "miss", "defend", "victory", "defeat"}
        } | {
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "BattleSelectionStep", state)
            for state in {"hero", "location", "enemy", "ready"}
        }
        self.assertTrue(expected_states.issubset(state_keys))

        expected_typed_domains: set[tuple[str, str, str]] = set()
        for record in _load_json(SOURCE_PATH)["records"]:
            path = str(record.get("file_path", ""))
            if record.get("record_type") != "file" or not path.endswith((".ts", ".tsx", ".js", ".jsx")):
                continue
            text = _git_bytes(self.source_baseline, path).decode("utf-8", errors="replace")
            aliases: dict[str, set[str]] = {}
            for match in re.finditer(
                r"(?:export\s+)?type\s+(\w+)\s*=\s*([\s\S]*?)(?=\n\s*(?:export\s+)?(?:type|interface|const|function|class)\b|\Z)",
                text,
            ):
                alias_name, body = match.groups()
                residue = re.sub(r"[|;\s]", "", re.sub(r"['\"][^'\"\n]+['\"]", "", body))
                literals = set(re.findall(r"['\"]([^'\"\n]+)['\"]", body))
                if RUNTIME_STATE_NAME.search(alias_name) and literals and not residue:
                    aliases[alias_name] = literals
                    expected_typed_domains.update((path, alias_name, literal) for literal in literals)
            for interface in re.finditer(r"(?:export\s+)?interface\s+(\w+)\s*\{([\s\S]*?)\n\}", text):
                interface_name, body = interface.groups()
                for prop in re.finditer(r"^\s*(\w+)\??:\s*([^\n]+)", body, re.MULTILINE):
                    property_name, type_text = prop.groups()
                    if any(re.search(rf"\b{re.escape(alias_name)}\b", type_text) for alias_name in aliases):
                        continue
                    literals = set(re.findall(r"['\"]([^'\"\n]+)['\"]", type_text))
                    if RUNTIME_STATE_NAME.search(property_name) and literals:
                        expected_typed_domains.update(
                            (path, f"{interface_name}.{property_name}", literal)
                            for literal in literals
                        )
        recorded_typed_domains = {
            (row["evidence"]["path"], row["source_symbol"], row["state_id"])
            for row in scenes["state_records"]
            if row.get("source_symbol_kind") in {"literal-union-type-alias", "interface-literal-property"}
        }
        self.assertEqual(recorded_typed_domains, expected_typed_domains)

        expected_transitions = {
            ("apps/advantage-games/src/store/usePotionRushStore.ts", "gameState", "MENU", "PLAYING"),
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "status", "idle", "playing"),
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "selectionStep", "hero", "location"),
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "selectionStep", "location", "enemy"),
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "selectionStep", "enemy", "ready"),
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "turn", "enemy", "player"),
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "status", "playing", "victory"),
            ("apps/advantage-games/src/store/useRPGBattleStore.ts", "status", "playing", "defeat"),
        }
        missing_writes = {
            edge
            for edge in expected_transitions
            if edge not in transition_keys
            and (edge[0], edge[1], edge[3]) not in transition_candidate_keys
        }
        self.assertFalse(
            missing_writes,
            "every expected runtime-store write must be an exact proven edge or an explicit unresolved candidate",
        )
        self.assertTrue(
            all(RUNTIME_STATE_NAME.search(symbol) for _, symbol, _, _ in transition_keys),
            "runtime transition symbols must use the general frozen state vocabulary",
        )

    def test_initial_to_setter_transitions_use_the_declared_initializer(self) -> None:
        """Requires proven transitions and candidates to partition exact AST writes.

        Returns:
            Nothing.
        """
        scenes = self._artifact(SCENE_PATH, "apk-scene-state-denominator.v1")
        source_paths = [
            row["file_path"]
            for row in _load_json(SOURCE_PATH)["records"]
            if row.get("record_type") == "file"
            and str(row.get("file_path", "")).endswith((".ts", ".tsx", ".js", ".jsx"))
        ]
        sources = {
            path: _git_bytes(self.source_baseline, path).decode("utf-8", errors="replace")
            for path in source_paths
        }
        facts = _load_transition_module().enumerate_typescript_transition_facts(
            sources,
            mode="phase1",
        )

        def write_key(row: dict[str, Any]) -> tuple[str, str, str, int, int]:
            """Keys one compiler or projected write by its exact occurrence."""
            evidence = row.get("evidence")
            if isinstance(evidence, dict):
                return (
                    evidence["path"], row["source_symbol"], row["to_state_id"],
                    evidence["range"]["start_line"], evidence["range"]["end_line"],
                )
            return (
                row["path"], row["source_symbol"], row["to_state_id"],
                row["start_line"], row["end_line"],
            )

        fact_by_write = {write_key(row): row for row in facts}
        self.assertEqual(len(fact_by_write), len(facts), "compiler write occurrences must be unique")
        projected = scenes["transitions"] + scenes["transition_write_candidates"]
        projected_keys = [write_key(row) for row in projected]
        self.assertEqual(len(projected_keys), len(set(projected_keys)))
        self.assertEqual(set(projected_keys), set(fact_by_write))
        for transition in scenes["transitions"]:
            fact = fact_by_write[write_key(transition)]
            self.assertEqual(transition["from_state_id"], fact["proven_from_state_id"])
            self.assertEqual(transition["transition_evidence_kind"], fact["proof_kind"])
        for candidate in scenes["transition_write_candidates"]:
            fact = fact_by_write[write_key(candidate)]
            if isinstance(fact.get("proven_from_state_id"), str):
                self.assertEqual(candidate.get("from_state_id"), fact["proven_from_state_id"])
                self.assertEqual(candidate.get("transition_evidence_kind"), fact["proof_kind"])
        self.assertTrue(scenes["transitions"], "the occurrence-bound proven partition must be non-empty")
        self.assertTrue(scenes["transition_write_candidates"], "the unresolved-write partition must be non-empty")
        self.assertTrue(
            all(
                row.get("record_kind") == "transition_write_candidate"
                and row.get("resolution_status") == "unresolved"
                and row.get("reason") in {
                    "no-single-proven-from-state",
                    "state-domain-occurrence-ambiguous",
                }
                for row in scenes["transition_write_candidates"]
            ),
            "unresolved occurrence-bound writes must remain explicit candidates",
        )

    def test_third_colliding_property_domain_cannot_bind_to_the_first_domain(self) -> None:
        """Keeps a third same-named state property fail-closed during edge resolution."""
        generator = _load_generator_module()
        path = "apps/advantage-games/src/store/threeDomainAliasCollision.ts"
        source = b'''import { create } from "zustand";

export type AState = {
  status: "ready" | "done";
}

export type BState = {
  status: "waiting" | "closed";
}

export type CState = {
  status: "ready" | "done";
  finish: () => void;
}

export type DState = {
  phase: "idle" | "complete";
  advance: () => void;
}

export const AliasCollisionScene = () => null;

export const useCState = create<CState>((set) => ({
  status: "ready",
  finish: () => set((state) => {
    if (state.status !== "ready") return state;
    return { ...state, status: "done" };
  }),
}));

export const useDState = create<DState>((set) => ({
  phase: "idle",
  advance: () => set((state) => {
    if (state.phase !== "idle") return state;
    return { ...state, phase: "complete" };
  }),
}));
'''
        with mock.patch.object(generator, "blob", return_value=source):
            document = generator.build_scene_state_denominator([path])

        false_edges = [
            row
            for row in document["transitions"]
            if row["source_symbol"] == "status"
            and row["from_state_id"] == "ready"
            and row["to_state_id"] == "done"
        ]
        self.assertEqual(
            false_edges,
            [],
            "CState.status must not bind to AState.status when both domains contain the guarded states",
        )
        candidates = [
            row
            for row in document["transition_write_candidates"]
            if row["source_symbol"] == "status"
            and row.get("from_state_id") == "ready"
            and row["to_state_id"] == "done"
        ]
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["reason"], "state-domain-occurrence-ambiguous")

    def test_current_page_and_catalog_withdrawn_states_remain_simultaneous(self) -> None:
        """Retains current page evidence separately from catalog withdrawal registration."""
        identities = self._artifact(IDENTITY_PATH, "apk-game-identity-ledger.v1")
        states = {
            row["canonical_identity_id"]: {state["source_class"] for state in row["source_states"]}
            for row in identities["identity_records"]
        }
        simultaneous = {
            identity for identity, source_states in states.items()
            if source_states == {"current-page-source", "catalog-withdrawn-registration"}
        }
        self.assertEqual(simultaneous, {
            "sentence/dungeon-liberator",
            "vocabulary/dragon-flight",
            "vocabulary/dragon-rider",
            "vocabulary/magic-defense",
        })
        discrepancies = _load_json(DISCREPANCY_PATH)
        observed = {
            row["canonical_identity_id"]
            for row in discrepancies["records"]
            if row.get("observation_type") == "simultaneous-source-classes"
        }
        self.assertEqual(observed, simultaneous)

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
        self.assertEqual(
            enumeration.get("roots"),
            [
                "apps/advantage-games/public",
                "apps/reading-advantage/public/games",
                "apps/primary-advantage/public/games",
                "apps/advantage-games/measure",
                "packages/codecamp-knowledge/fixtures/apk-guided",
            ],
        )

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

    def test_frozen_source_relevance_classifier_is_complete_and_excludes_configs(self) -> None:
        """Exercises every frozen source rule and rejects unrelated package configuration."""
        module = _load_generator_module()
        cases = {
            "apps/advantage-games/src/lib/gameCards.ts": "advantage-games-src",
            "apps/reading-advantage/src/app/[locale]/games/vocabulary/dragon-flight/page.tsx": "reading-primary-game-copies",
            "apps/primary-advantage/src/app/[locale]/games/vocabulary/dragon-flight/page.tsx": "reading-primary-game-copies",
            "packages/advantage-play-kit/src/index.ts": "apk-core-packages",
            "packages/advantage-play-kit/package.json": "apk-core-packages",
            "packages/game-contracts/scripts/check-architecture.mjs": "apk-core-packages",
            "packages/codecamp-knowledge/fixtures/apk-guided/src/cartridge.ts": "codecamp-knowledge-apk-segment",
            "packages/codecamp-knowledge/src/__tests__/apk-unit.test.ts": "codecamp-knowledge-apk-segment",
            "packages/domain/src/games/queries.ts": "domain-games-tests",
            "packages/domain/src/__tests__/games.test.ts": "domain-games-tests",
            "packages/db/src/__tests__/codecamp-apk-curriculum-data.test.ts": "db-game-completion-codecamp-apk",
            "packages/db/drizzle/0026_game_completions.sql": "db-game-completion-codecamp-apk",
            "apps/advantage-games/measure/archive/dragon-flight/plan.md": "advantage-games-measure-program-match",
            "measure/apk-evidence-reconstruction-program.md": "active-apk-program-sources",
        }
        for path, rule_id in cases.items():
            self.assertEqual(module.source_relevance_rule(path), rule_id, path)
        for path in (
            "packages/codecamp-knowledge/package.json",
            "packages/codecamp-knowledge/tsconfig.json",
            "packages/domain/src/__tests__/articles.test.ts",
            "apps/advantage-games/measure/archive/accessibility_input_assist_20260407/plan.md",
            "apps/advantage-games/src/app/globals.css",
            "apps/advantage-games/src/templates/game/GameNameGame.tsx.template",
            "apps/advantage-games/src/templates/game/README.md",
        ):
            self.assertIsNone(module.source_relevance_rule(path), path)

    def test_asset_relevance_is_bounded_to_public_files_sidecars_and_tutorial(self) -> None:
        """Rejects package configs while retaining the three exact asset candidate classes."""
        module = _load_generator_module()
        cases = {
            "apps/advantage-games/public/games/example/sprite.png": "public-game-media-audio-data",
            "apps/advantage-games/measure/archive/potion-rush-20260107/asset-spec.md": "game-measure-asset-sidecars",
            "apps/advantage-games/measure/archive/potion-rush-20260107/metadata.json": "game-measure-asset-sidecars",
            "packages/codecamp-knowledge/fixtures/apk-guided/activity-tutorial.json": "codecamp-activity-tutorial",
        }
        for path, rule_id in cases.items():
            self.assertEqual(module.asset_relevance_rule(path), rule_id, path)
        for path in (
            "packages/advantage-play-kit/package.json",
            "packages/codecamp-knowledge/package.json",
            "packages/codecamp-knowledge/tsconfig.json",
            "apps/advantage-games/measure/archive/potion-rush-20260107/plan.md",
        ):
            self.assertIsNone(module.asset_relevance_rule(path), path)

    def test_generated_corpus_matches_frozen_exact_counts_and_relevance_provenance(self) -> None:
        """Pins the complete corrected Phase-1 source, asset, and history denominators."""
        source = self._artifact(SOURCE_PATH, "apk-source-denominator.v1")
        records = source["records"]
        by_type = {
            record_type: [row for row in records if row["record_type"] == record_type]
            for record_type in REQUIRED_SOURCE_RECORD_TYPES
        }
        self.assertEqual(len(by_type["file"]), 923)
        self.assertEqual(len(by_type["identity"]), 17)
        self.assertEqual(len(by_type["route"]), 25)
        self.assertEqual(len(by_type["copy"]), 96)
        self.assertEqual(len(by_type["graph"]), 946)
        self.assertEqual(len(source["graph_edges"]), 946)
        self.assertEqual(len(records), 2007)
        self.assertTrue(all(isinstance(row.get("relevance_rule_id"), str) for row in by_type["file"]))
        self.assertTrue(all(not row["evidence"]["path"].endswith(".md") for row in by_type["graph"]))
        frozen_paths = subprocess.check_output(
            [
                "git", "ls-tree", "-r", "--name-only", self.source_baseline, "--",
                "apps/advantage-games", "apps/reading-advantage", "apps/primary-advantage",
                "packages", "measure",
            ],
            cwd=REPO_ROOT,
            text=True,
        ).splitlines()
        program_slugs = self.freeze["relevance_rules"]["program_slugs"]

        def normalize(path: str) -> str:
            return re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-")

        def expected_rule(path: str) -> str | None:
            if path.startswith(f"{self.quarantine_path}/"):
                return None
            if path in REQUIRED_NON_GAME_SOURCES:
                return "active-apk-program-sources"
            if path.startswith((
                "packages/advantage-play-kit/",
                "packages/game-contracts/",
                "packages/game-cartridges/",
            )):
                return "apk-core-packages"
            filename = PurePosixPath(path).name
            if filename in {"package.json", "tsconfig.json", "tsconfig.test.json"} or filename.startswith("tsconfig."):
                return None
            suffix = PurePosixPath(path).suffix.lower()
            if path.startswith("apps/advantage-games/src/") and suffix in {".ts", ".tsx", ".js", ".jsx", ".json"}:
                return "advantage-games-src"
            if path.startswith(("apps/reading-advantage/", "apps/primary-advantage/")) and suffix in {".ts", ".tsx", ".js", ".jsx", ".json"} and (
                "/games/" in path or "/api/v1/games/" in path or "/lib/game" in path
            ):
                return "reading-primary-game-copies"
            if path.startswith("packages/codecamp-knowledge/") and any(part.startswith("apk-") for part in PurePosixPath(path).parts) and suffix in {".ts", ".tsx", ".js", ".jsx", ".json", ".md"}:
                return "codecamp-knowledge-apk-segment"
            if path.startswith("packages/domain/src/games/") and suffix in {".ts", ".tsx", ".js", ".jsx", ".json"}:
                return "domain-games-tests"
            if path.startswith("packages/domain/src/__tests__/games") and suffix in {".ts", ".tsx", ".js", ".jsx", ".json"}:
                return "domain-games-tests"
            normalized = normalize(path)
            if path.startswith("packages/db/") and ("game-completion" in normalized or "codecamp-apk" in normalized):
                return "db-game-completion-codecamp-apk"
            bounded = f"-{normalized}-"
            if path.startswith("apps/advantage-games/measure/") and suffix in {".md", ".json"} and any(f"-{slug}-" in bounded for slug in program_slugs):
                return "advantage-games-measure-program-match"
            return None

        expected_files = {path: rule for path in frozen_paths if (rule := expected_rule(path)) is not None}
        actual_files = {row["file_path"]: row["relevance_rule_id"] for row in by_type["file"]}
        self.assertEqual(actual_files, expected_files)

        assets = self._artifact(ASSET_PATH, "apk-asset-file-denominator.v1")
        candidates = assets["candidate_files"]
        media_suffixes = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".webm"}
        audio_suffixes = {".mp3", ".wav", ".ogg", ".m4a"}
        data_suffixes = {".json", ".csv", ".txt", ".xml", ".yaml", ".yml"}

        def expected_asset_rule(path: str) -> str | None:
            """Independently applies the frozen asset corpus rules."""
            filename = PurePosixPath(path).name
            suffix = PurePosixPath(path).suffix.lower()
            if path.startswith(f"{self.quarantine_path}/"):
                return None
            if filename in {"package.json", "tsconfig.json", "tsconfig.test.json"} or filename.startswith("tsconfig."):
                return None
            if path.startswith((
                "apps/advantage-games/public/",
                "apps/reading-advantage/public/games/",
                "apps/primary-advantage/public/games/",
            )) and suffix in media_suffixes | audio_suffixes | data_suffixes:
                return "public-game-media-audio-data"
            normalized = f"-{normalize(path)}-"
            if path.startswith("apps/advantage-games/measure/") and filename in {"asset-spec.md", "metadata.json"} and any(
                f"-{slug}-" in normalized for slug in program_slugs
            ):
                return "game-measure-asset-sidecars"
            if path == "packages/codecamp-knowledge/fixtures/apk-guided/activity-tutorial.json":
                return "codecamp-activity-tutorial"
            return None

        expected_assets = {
            path: rule
            for path in frozen_paths
            if (rule := expected_asset_rule(path)) is not None
        }
        actual_assets = {
            row["canonical_path"]: row["relevance_rule_id"]
            for row in candidates
        }
        self.assertEqual(actual_assets, expected_assets)
        swapped = dict(actual_assets)
        valid_path = next(iter(sorted(swapped)))
        swapped.pop(valid_path)
        swapped["apps/advantage-games/GEMINI.md"] = "public-game-media-audio-data"
        self.assertNotEqual(swapped, expected_assets, "same-count substitutions must fail exact path coverage")
        grouped: dict[str, list[dict[str, Any]]] = {}
        for candidate in candidates:
            grouped.setdefault(candidate["sha256"], []).append(candidate)
        multi_groups = [rows for rows in grouped.values() if len(rows) > 1]
        self.assertEqual(len(candidates), 426)
        self.assertEqual(len(grouped), 225)
        self.assertEqual(len(multi_groups), 102)
        self.assertEqual(sum(len(rows) for rows in multi_groups), 303)

        history = self._artifact(HISTORICAL_PATH, "apk-historical-source-denominator.v1")
        historical_records = history["records"]
        self.assertEqual(len(historical_records), 245)
        self.assertEqual(sum(row["classification"] == "current" for row in historical_records), 25)
        deleted = [row for row in historical_records if row["classification"] == "deleted"]
        self.assertEqual(len(deleted), 220)
        self.assertEqual(sum(row["evidence"]["path"].startswith("packages/") for row in deleted), 81)

    def test_generated_method_states_exact_five_roots_and_ast_partition(self) -> None:
        """Rejects stale source-order transition claims and three-root asset prose."""
        module = _load_generator_module()
        with tempfile.TemporaryDirectory() as directory:
            output_dir = Path(directory)
            module.write_method(output_dir)
            method = (output_dir / "denominator-method.md").read_text(encoding="utf-8")
        for root in (
            "apps/advantage-games/public",
            "apps/reading-advantage/public/games",
            "apps/primary-advantage/public/games",
            "apps/advantage-games/measure",
            "packages/codecamp-knowledge/fixtures/apk-guided",
        ):
            self.assertIn(f"`{root}`", method)
        self.assertIn("TypeScript compiler AST", method)
        self.assertRegex(method, r"explicit\s+unresolved transition candidate")
        self.assertIn("without source-order or union-order inference", method)
        self.assertNotIn("three public roots", method)
        self.assertNotIn("first source-ordered setter", method)

    def test_historical_deletions_use_first_parent_and_first_path_only(self) -> None:
        """Retains only the first first-parent deletion for each admitted path."""
        module = _load_generator_module()
        path_a = "apps/advantage-games/src/a.ts"
        path_b = "packages/advantage-play-kit/src/b.ts"
        history = "\n".join(("a" * 40, path_a, "b" * 40, path_a, "c" * 40, path_b))

        def fake_git(*args: str) -> bytes:
            if args[0] == "log":
                self.assertIn("--first-parent", args)
                return history.encode()
            if args[0] == "rev-parse":
                return ({f"{'a' * 40}^": "1" * 40, f"{'c' * 40}^": "3" * 40}[args[1]] + "\n").encode()
            raise AssertionError(args)

        with mock.patch.object(module, "run_git", side_effect=fake_git), mock.patch.object(
            module, "blob", return_value=b"source"
        ):
            self.assertEqual(
                list(module.historical_deletions()),
                [("1" * 40, path_a), ("3" * 40, path_b)],
            )


if __name__ == "__main__":
    unittest.main()
