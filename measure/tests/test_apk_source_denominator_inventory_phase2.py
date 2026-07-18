"""Falsification contracts for APK denominator Phase-2 human discovery."""

from __future__ import annotations

import copy
import hashlib
import importlib.util
import inspect
import json
import re
import subprocess
import sys
import tempfile
import unittest
from collections import Counter
from unittest import mock
from pathlib import Path, PurePosixPath
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK
FREEZE_PATH = TRACK_DIR / "phase0-input-freeze.json"
OWNERSHIP_PATH = TRACK_DIR / "phase0-role-ownership-manifest.json"
IDENTITY_PATH = TRACK_DIR / "game-identity-ledger.json"
SOURCE_PATH = TRACK_DIR / "source-denominator.json"
SCENE_PATH = TRACK_DIR / "scene-state-denominator.json"
ASSET_PATH = TRACK_DIR / "asset-file-denominator.json"
PHASE1_HISTORICAL_PATH = TRACK_DIR / "historical-source-denominator.json"
PHASE1_DISCREPANCY_PATH = TRACK_DIR / "denominator-discrepancies.json"
REPORT_PATH = TRACK_DIR / "phase2-human-discovery-contract-test-report.json"
HUMAN_DISCOVERY_PATH = TRACK_DIR / "independent-human-discovery.json"
DUPLICATE_DRIFT_PATH = TRACK_DIR / "human-duplicate-drift-records.json"
HISTORICAL_PATH = TRACK_DIR / "human-historical-deleted-records.json"
DISCREPANCY_PATH = TRACK_DIR / "human-discrepancy-records.json"
EVIDENCE_RECEIPT_PATH = TRACK_DIR / "role-receipts" / "evidence-collector.json"
SHA256 = re.compile(r"^[0-9a-f]{64}$")
COMMIT_SHA = re.compile(r"^[0-9a-f]{40}$")
PHASE1_REVISION = "ad02fb34764a961107f9d963430a7b27f8ff4dae"
PROGRAM_PATH = "measure/apk-evidence-reconstruction-program.md"
GENERATOR_PATH = TRACK_DIR / "generate_phase2_human_discovery.py"
QUARANTINED_SOURCE_PREFIX = "measure/tracks/apk_cross_game_asset_ontology_20260712"
FORBIDDEN_INTERPRETATION_FIELDS = {
    "asset_suitability",
    "capability",
    "capability_conclusion",
    "conclusion",
    "design_intent",
    "gameplay_interpretation",
    "intent",
    "mechanic",
    "mechanics",
    "product_disposition",
    "recommendation",
    "responsive_strategy",
    "semantic_role",
    "suitability",
}
PROGRAM_DISPOSITIONS = {
    "current",
    "historical/withdrawn",
    "alias/copy",
    "unsupported program assumption",
}


def _load_generator_module() -> Any:
    """Loads the Phase-2 generator for focused independence unit contracts."""
    spec = importlib.util.spec_from_file_location("apk_phase2_generator", GENERATOR_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError("Unable to load Phase-2 generator")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _load_json(path: Path, *, phase2: bool = False) -> dict[str, Any]:
    """Loads one JSON contract object and identifies absent Phase-2 artifacts.

    Args:
        path: Artifact path to load.
        phase2: Whether the artifact is authored by the Phase-2 handoff.

    Returns:
        Parsed JSON object.

    Raises:
        AssertionError: If the artifact is missing or is not a JSON object.
    """
    if not path.is_file():
        phase = "Phase-2 human-discovery" if phase2 else "required"
        raise AssertionError(f"Missing {phase} artifact: {path.relative_to(REPO_ROOT)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path.relative_to(REPO_ROOT)} must contain a JSON object")
    return value


def _git_bytes(revision: str, path: str) -> bytes:
    """Reads committed bytes for an exact revision and repository-relative path.

    Args:
        revision: Commit containing the cited path.
        path: Repository-relative path to resolve.

    Returns:
        The committed file bytes.

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


def _git_json(revision: str, path: Path) -> dict[str, Any]:
    """Loads a JSON artifact from an exact committed revision.

    Args:
        revision: Commit containing the artifact.
        path: Repository-local artifact path.

    Returns:
        The committed JSON object.
    """
    value = json.loads(_git_bytes(revision, str(path.relative_to(REPO_ROOT))))
    if not isinstance(value, dict):
        raise AssertionError(f"Committed artifact must be an object: {revision}:{path}")
    return value


def _is_ancestor(revision: str, baseline: str) -> bool:
    """Reports whether a cited historical revision is reachable from the baseline.

    Args:
        revision: Historical revision to validate.
        baseline: Frozen source revision that bounds historical work.

    Returns:
        Whether the revision is a reachable ancestor of the baseline.
    """
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", revision, baseline],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    )
    return result.returncode == 0


def _locator_key(locator: dict[str, Any]) -> str:
    """Builds a deterministic identity for an exact source evidence locator.

    Args:
        locator: Validated locator to identify.

    Returns:
        A JSON representation suitable for set comparison.
    """
    return json.dumps(locator, sort_keys=True, separators=(",", ":"))


class Phase2IndependentCorpusClassifierContracts(unittest.TestCase):
    """Pins the independent raw source and asset predicates to the frozen tree."""

    @classmethod
    def setUpClass(cls) -> None:
        """Loads the Phase-2 classifier and exact baseline tree without Phase-1 artifacts."""
        cls.module = _load_generator_module()
        cls.freeze = _load_json(FREEZE_PATH)
        cls.baseline = cls.freeze["source_scope"]["current_revision"]
        cls.entries = cls.module._tree_entries()
        cls.paths = [row["path"] for row in cls.entries]

    @staticmethod
    def _normalized(path: str) -> str:
        """Normalizes one path for exact bounded program-slug matching."""
        return re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-")

    def _expected_source_rule(self, path: str) -> str | None:
        """Independently derives the frozen raw-source relevance rule."""
        required = {
            "measure/apk-asset-system-program.md",
            "measure/apk-evidence-reconstruction-program.md",
            "packages/game-cartridges/src/catalog.test.ts",
            "packages/game-cartridges/src/catalog.ts",
            "packages/game-cartridges/src/index.ts",
        }
        source_suffixes = {".ts", ".tsx", ".js", ".jsx", ".json"}
        if path.startswith(f"{QUARANTINED_SOURCE_PREFIX}/"):
            return None
        if path in required:
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
        if path.startswith("apps/advantage-games/src/") and suffix in source_suffixes:
            return "advantage-games-src"
        if path.startswith(("apps/reading-advantage/", "apps/primary-advantage/")) and suffix in source_suffixes and (
            "/games/" in path or "/api/v1/games/" in path or "/lib/game" in path
        ):
            return "reading-primary-game-copies"
        if path.startswith("packages/codecamp-knowledge/") and any(
            part.startswith("apk-") for part in PurePosixPath(path).parts
        ) and suffix in source_suffixes | {".md"}:
            return "codecamp-knowledge-apk-segment"
        if (
            path.startswith("packages/domain/src/games/")
            or path.startswith("packages/domain/src/__tests__/games")
        ) and suffix in source_suffixes:
            return "domain-games-tests"
        normalized = self._normalized(path)
        if path.startswith("packages/db/") and (
            "game-completion" in normalized or "codecamp-apk" in normalized
        ):
            return "db-game-completion-codecamp-apk"
        bounded = f"-{normalized}-"
        program_slugs = self.freeze["relevance_rules"]["program_slugs"]
        if path.startswith("apps/advantage-games/measure/") and suffix in {".md", ".json"} and any(
            f"-{slug}-" in bounded for slug in program_slugs
        ):
            return "advantage-games-measure-program-match"
        return None

    def _expected_asset_rule(self, path: str) -> str | None:
        """Independently derives the frozen five-root asset relevance rule."""
        filename = PurePosixPath(path).name
        if path.startswith(f"{QUARANTINED_SOURCE_PREFIX}/"):
            return None
        if filename in {"package.json", "tsconfig.json", "tsconfig.test.json"} or filename.startswith("tsconfig."):
            return None
        suffix = PurePosixPath(path).suffix.lower()
        candidates = {
            ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".webm",
            ".mp3", ".wav", ".ogg", ".m4a", ".json", ".csv", ".txt", ".xml", ".yaml", ".yml",
        }
        if path.startswith((
            "apps/advantage-games/public",
            "apps/reading-advantage/public/games",
            "apps/primary-advantage/public/games",
        )) and suffix in candidates:
            return "public-game-media-audio-data"
        normalized = self._normalized(path)
        bounded = f"-{normalized}-"
        if path.startswith("apps/advantage-games/measure/") and filename in {"asset-spec.md", "metadata.json"} and any(
            f"-{slug}-" in bounded
            for slug in self.freeze["relevance_rules"]["program_slugs"]
        ):
            return "game-measure-asset-sidecars"
        if path == "packages/codecamp-knowledge/fixtures/apk-guided/activity-tutorial.json":
            return "codecamp-activity-tutorial"
        return None

    def test_exact_frozen_path_to_rule_maps_and_category_counts(self) -> None:
        """Requires every current frozen path and rule, not merely equal totals."""
        expected_sources = {
            path: rule
            for path in self.paths
            if (rule := self._expected_source_rule(path)) is not None
        }
        actual_sources = {
            path: rule
            for path in self.paths
            if (rule := self.module._raw_source_relevance_rule(path)) is not None
        }
        self.assertEqual(actual_sources, expected_sources)
        self.assertEqual(len(actual_sources), 923)
        self.assertEqual(Counter(actual_sources.values()), {
            "advantage-games-src": 392,
            "advantage-games-measure-program-match": 273,
            "reading-primary-game-copies": 182,
            "apk-core-packages": 45,
            "codecamp-knowledge-apk-segment": 13,
            "domain-games-tests": 10,
            "active-apk-program-sources": 5,
            "db-game-completion-codecamp-apk": 3,
        })

        expected_assets = {
            path: rule
            for path in self.paths
            if (rule := self._expected_asset_rule(path)) is not None
        }
        actual_assets = {
            path: rule
            for path in self.paths
            if (rule := self.module._raw_asset_relevance_rule(path)) is not None
        }
        self.assertEqual(actual_assets, expected_assets)
        self.assertEqual(len(actual_assets), 426)
        self.assertEqual(Counter(actual_assets.values()), {
            "public-game-media-audio-data": 353,
            "game-measure-asset-sidecars": 72,
            "codecamp-activity-tutorial": 1,
        })
        self.assertEqual(len(self.module.RAW_PROGRAM_SLUGS), 29)
        self.assertEqual(len(set(self.module.RAW_PROGRAM_SLUGS)), 29)
        self.assertEqual(len(self.module.RAW_ASSET_ENUMERATION_ROOTS), 5)

    def test_same_count_path_substitutions_do_not_satisfy_exact_maps(self) -> None:
        """Proves equal category totals cannot hide one omitted and one forged path."""
        expected_sources = {
            path: rule
            for path in self.paths
            if (rule := self._expected_source_rule(path)) is not None
        }
        substituted_sources = dict(expected_sources)
        removed_source = next(
            path for path, rule in substituted_sources.items()
            if rule == "advantage-games-src"
        )
        del substituted_sources[removed_source]
        substituted_sources["apps/advantage-games/src/forged-same-count.ts"] = "advantage-games-src"
        self.assertEqual(Counter(substituted_sources.values()), Counter(expected_sources.values()))
        self.assertNotEqual(substituted_sources, expected_sources)

        expected_assets = {
            path: rule
            for path in self.paths
            if (rule := self._expected_asset_rule(path)) is not None
        }
        substituted_assets = dict(expected_assets)
        removed_asset = next(
            path for path, rule in substituted_assets.items()
            if rule == "public-game-media-audio-data"
        )
        del substituted_assets[removed_asset]
        substituted_assets["apps/advantage-games/public/forged-same-count.png"] = "public-game-media-audio-data"
        self.assertEqual(Counter(substituted_assets.values()), Counter(expected_assets.values()))
        self.assertNotEqual(substituted_assets, expected_assets)


class Phase2IndependentHumanDiscoveryContracts(unittest.TestCase):
    """Rejects sampled, unpinned, merged, interpretive, or unresolved human review."""

    def setUp(self) -> None:
        """Loads frozen Phase-1 ledgers and the required Phase-2 discovery record.

        Returns:
            Nothing.
        """
        self.freeze = _load_json(FREEZE_PATH)
        self.ownership = _load_json(OWNERSHIP_PATH)
        self.ledger = _git_json(PHASE1_REVISION, IDENTITY_PATH)
        self.source = _git_json(PHASE1_REVISION, SOURCE_PATH)
        self.scenes = _git_json(PHASE1_REVISION, SCENE_PATH)
        self.assets = _git_json(PHASE1_REVISION, ASSET_PATH)
        self.phase1_historical = _git_json(PHASE1_REVISION, PHASE1_HISTORICAL_PATH)
        self.phase1_discrepancies = _git_json(PHASE1_REVISION, PHASE1_DISCREPANCY_PATH)
        self.human_discovery = _load_json(HUMAN_DISCOVERY_PATH, phase2=True)
        scope = self.freeze["source_scope"]
        self.assertIsInstance(scope, dict)
        assert isinstance(scope, dict)
        self.baseline = scope["current_revision"]
        self.assertIsInstance(self.baseline, str)
        assert isinstance(self.baseline, str)

    def _identity_ids(self) -> set[str]:
        """Returns the complete frozen Phase-1 canonical identity set.

        Returns:
            Canonical identities from the mechanical ledger.
        """
        records = self.ledger.get("identity_records")
        self.assertIsInstance(records, list)
        assert isinstance(records, list)
        identities = {
            record.get("canonical_identity_id")
            for record in records
            if isinstance(record, dict)
            and any(
                isinstance(state, dict) and state.get("source_class") == "current-page-source"
                for state in record.get("source_states", [])
            )
        }
        self.assertNotIn(None, identities)
        self.assertTrue(identities, "Phase-1 identity ledger cannot be empty")
        return {identity for identity in identities if isinstance(identity, str)}

    def _ledger_paths_for_identity(self, identity_id: str) -> set[str]:
        """Returns Phase-1 page-source paths associated with an identity.

        Args:
            identity_id: Canonical identity whose page paths are needed.

        Returns:
            Exact committed paths from the identity ledger.
        """
        records = self.ledger["identity_records"]
        assert isinstance(records, list)
        paths: set[str] = set()
        for record in records:
            if not isinstance(record, dict) or record.get("canonical_identity_id") != identity_id:
                continue
            for alias in record.get("aliases", []):
                if isinstance(alias, dict):
                    evidence = alias.get("evidence")
                    if isinstance(evidence, dict) and isinstance(evidence.get("path"), str):
                        paths.add(evidence["path"])
        self.assertTrue(paths, f"Phase-1 ledger must contain page evidence for {identity_id}")
        return paths

    def _assert_locator(self, locator: object, *, historical: bool = False) -> dict[str, Any]:
        """Validates a committed exact path, revision, blob, and inclusive range hash.

        Args:
            locator: Candidate evidence locator.
            historical: Whether an ancestor revision is allowed.

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
            self.assertTrue(_is_ancestor(revision, self.baseline), "historical revision must be reachable")
        else:
            self.assertEqual(revision, self.baseline, "current evidence must use the frozen baseline")
        blob = _git_bytes(revision, path)
        self.assertIsInstance(locator.get("blob_sha256"), str)
        self.assertRegex(str(locator.get("blob_sha256")), SHA256)
        self.assertEqual(locator["blob_sha256"], hashlib.sha256(blob).hexdigest())
        cited_range = locator.get("range")
        self.assertIsInstance(cited_range, dict)
        assert isinstance(cited_range, dict)
        start_line = cited_range.get("start_line")
        end_line = cited_range.get("end_line")
        self.assertIsInstance(start_line, int)
        self.assertIsInstance(end_line, int)
        assert isinstance(start_line, int) and isinstance(end_line, int)
        lines = blob.splitlines(keepends=True)
        if not lines:
            self.assertEqual((start_line, end_line), (0, 0))
            self.assertEqual(cited_range.get("sha256"), hashlib.sha256(b"").hexdigest())
            return locator
        self.assertGreaterEqual(start_line, 1)
        self.assertGreaterEqual(end_line, start_line)
        self.assertLessEqual(end_line, len(lines))
        self.assertIsInstance(cited_range.get("sha256"), str)
        self.assertRegex(str(cited_range.get("sha256")), SHA256)
        self.assertEqual(
            cited_range["sha256"],
            hashlib.sha256(b"".join(lines[start_line - 1 : end_line])).hexdigest(),
        )
        return locator

    def _assert_no_interpretation_fields(self, value: object, location: str = "$") -> None:
        """Rejects semantic or product conclusions anywhere in a Phase-2 record.

        Args:
            value: JSON value to inspect recursively.
            location: JSON path used in a failure message.

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

    def _assert_review_record(self, record: object, *, location: str) -> dict[str, Any]:
        """Validates provenance and exact evidence for one human disposition.

        Args:
            record: Human review record to validate.
            location: Record location used in assertion failures.

        Returns:
            The validated review record.
        """
        self.assertIsInstance(record, dict, location)
        assert isinstance(record, dict)
        self.assertEqual(record.get("collector_role"), "evidence-collector", location)
        self.assertIsInstance(record.get("collector_identity"), str, location)
        self.assertTrue(record.get("collector_identity"), location)
        self.assertIsInstance(record.get("method"), str, location)
        self.assertTrue(record.get("method"), location)
        self.assertIsInstance(record.get("source_fact"), str, location)
        self.assertTrue(record.get("source_fact"), location)
        self.assertEqual(record.get("interpretation"), {}, location)
        evidence = record.get("evidence")
        self.assertIsInstance(evidence, list, location)
        assert isinstance(evidence, list)
        self.assertTrue(evidence, location)
        for item in evidence:
            self.assertIsInstance(item, dict, location)
            assert isinstance(item, dict)
            self._assert_locator(item, historical=item.get("revision") != self.baseline)
        return record

    def test_red_report_is_nonfactual_and_names_the_phase2_gate(self) -> None:
        """Keeps the Phase-2 test report distinct from human discovery evidence.

        Returns:
            Nothing.
        """
        report = _load_json(REPORT_PATH)
        self.assertEqual(report.get("schema_version"), "apk-denominator-phase2-human-discovery-contract-report.v1")
        self.assertEqual(report.get("status"), "red-contract-authored")
        self.assertEqual(report.get("source_baseline_revision"), self.baseline)
        self.assertEqual(report.get("red_command"), report.get("green_command"))
        self.assertIn("test_apk_source_denominator_inventory_phase2", str(report.get("red_command")))
        self.assertNotIn("accepted", str(report.get("status")).lower())

    def test_every_phase1_identity_is_reviewed_once_in_explicit_batches_of_three_or_fewer(self) -> None:
        """Requires exhaustive accepted identity coverage rather than a sampled review.

        Returns:
            Nothing.
        """
        self.assertEqual(self.human_discovery.get("schema_version"), "apk-denominator-independent-human-discovery.v1")
        self.assertEqual(self.human_discovery.get("status"), "independent-human-discovery-complete")
        self.assertEqual(self.human_discovery.get("source_baseline_revision"), self.baseline)
        batches = self.human_discovery.get("review_batches")
        self.assertIsInstance(batches, list)
        assert isinstance(batches, list)
        batch_ids: set[str] = set()
        reviewed: list[str] = []
        for batch in batches:
            self.assertIsInstance(batch, dict)
            assert isinstance(batch, dict)
            batch_id = batch.get("batch_id")
            self.assertIsInstance(batch_id, str)
            assert isinstance(batch_id, str)
            self.assertTrue(batch_id)
            self.assertNotIn(batch_id, batch_ids)
            batch_ids.add(batch_id)
            self.assertEqual(batch.get("status"), "accepted")
            identities = batch.get("accepted_identity_ids")
            self.assertIsInstance(identities, list)
            assert isinstance(identities, list)
            self.assertGreaterEqual(len(identities), 1)
            self.assertLessEqual(len(identities), 3, "human review batches may contain no more than three identities")
            self.assertTrue(all(isinstance(identity, str) and identity for identity in identities))
            reviewed.extend(identities)
        self.assertEqual(set(reviewed), self._identity_ids(), "every Phase-1 identity must be reviewed")
        self.assertEqual(len(reviewed), len(set(reviewed)), "an accepted identity may not be silently reviewed twice")

    def test_raw_current_source_claims_are_pinned_and_exhaustive(self) -> None:
        """Requires exact raw-source evidence and method for every accepted identity.

        Returns:
            Nothing.
        """
        batches = self.human_discovery["review_batches"]
        assert isinstance(batches, list)
        accepted_by_batch = {
            batch["batch_id"]: set(batch["accepted_identity_ids"])
            for batch in batches
            if isinstance(batch, dict)
        }
        claims = self.human_discovery.get("current_source_claims")
        self.assertIsInstance(claims, list)
        assert isinstance(claims, list)
        claim_ids: set[str] = set()
        covered: set[str] = set()
        for claim in claims:
            self.assertIsInstance(claim, dict)
            assert isinstance(claim, dict)
            claim_id = claim.get("claim_id")
            identity_id = claim.get("canonical_identity_id")
            batch_id = claim.get("batch_id")
            self.assertIsInstance(claim_id, str)
            self.assertIsInstance(identity_id, str)
            self.assertIsInstance(batch_id, str)
            assert isinstance(claim_id, str) and isinstance(identity_id, str) and isinstance(batch_id, str)
            self.assertTrue(claim_id)
            self.assertNotIn(claim_id, claim_ids)
            claim_ids.add(claim_id)
            self.assertIn(identity_id, self._identity_ids())
            self.assertIn(batch_id, accepted_by_batch)
            self.assertIn(identity_id, accepted_by_batch[batch_id])
            self.assertEqual(claim.get("method"), "human-raw-source-review")
            self.assertEqual(claim.get("claim_kind"), "current-source")
            evidence = self._assert_locator(claim.get("evidence"))
            self.assertIn(evidence["path"], self._ledger_paths_for_identity(identity_id))
            covered.add(identity_id)
        self.assertEqual(covered, self._identity_ids(), "every accepted identity needs a raw current-source claim")

    def test_reading_and_primary_duplicate_drift_records_cover_every_identity_without_merging(self) -> None:
        """Requires distinct Reading and Primary observations for every ledger identity.

        Returns:
            Nothing.
        """
        records = _load_json(DUPLICATE_DRIFT_PATH, phase2=True)
        self.assertEqual(records.get("schema_version"), "apk-denominator-human-duplicate-drift.v1")
        self.assertEqual(records.get("status"), "independent-human-discovery-complete")
        self.assertEqual(records.get("source_baseline_revision"), self.baseline)
        rows = records.get("duplicate_drift_records")
        self.assertIsInstance(rows, list)
        assert isinstance(rows, list)
        keys: set[tuple[str, str]] = set()
        for row in rows:
            self.assertIsInstance(row, dict)
            assert isinstance(row, dict)
            identity_id = row.get("canonical_identity_id")
            source_family = row.get("source_family")
            self.assertIsInstance(identity_id, str)
            self.assertIn(identity_id, self._identity_ids())
            self.assertIn(source_family, {"reading", "primary"})
            assert isinstance(identity_id, str) and isinstance(source_family, str)
            key = (identity_id, source_family)
            self.assertNotIn(key, keys, "Reading and Primary records cannot be silently merged")
            keys.add(key)
            self.assertEqual(row.get("method"), "human-raw-source-review")
            self.assertEqual(row.get("collector_role"), "evidence-collector")
            self.assertIsInstance(row.get("collector_identity"), str)
            self.assertTrue(row.get("source_fact"))
            self.assertEqual(row.get("interpretation"), {})
            self.assertIn(row.get("observation_status"), {"duplicate-observed", "drift-observed", "not-observed"})
            evidence = row.get("evidence")
            self.assertIsInstance(evidence, list)
            assert isinstance(evidence, list)
            self.assertTrue(evidence, "a duplicate/drift observation requires raw-source evidence")
            for locator in evidence:
                self._assert_locator(locator)
        expected = {(identity_id, family) for identity_id in self._identity_ids() for family in ("reading", "primary")}
        self.assertEqual(keys, expected, "Reading and Primary review must be exhaustive, not sampled")

    def test_reachable_historical_and_deleted_records_match_every_phase1_locator(self) -> None:
        """Requires every Phase-1 historical/deleted locator to receive human review.

        Returns:
            Nothing.
        """
        records = _load_json(HISTORICAL_PATH, phase2=True)
        self.assertEqual(records.get("schema_version"), "apk-denominator-human-historical-deleted.v1")
        self.assertEqual(records.get("status"), "independent-human-discovery-complete")
        self.assertEqual(records.get("source_baseline_revision"), self.baseline)
        phase1_rows = self.phase1_historical.get("records")
        self.assertIsInstance(phase1_rows, list)
        assert isinstance(phase1_rows, list)
        expected = {
            _locator_key(row["evidence"])
            for row in phase1_rows
            if isinstance(row, dict) and row.get("classification") in {"historical", "deleted", "withdrawn"}
        }
        rows = records.get("historical_deleted_records")
        self.assertIsInstance(rows, list)
        assert isinstance(rows, list)
        actual: set[str] = set()
        for row in rows:
            self.assertIsInstance(row, dict)
            assert isinstance(row, dict)
            self.assertIsInstance(row.get("record_id"), str)
            self.assertEqual(row.get("method"), "human-history-review")
            self.assertEqual(row.get("collector_role"), "evidence-collector")
            self.assertIsInstance(row.get("collector_identity"), str)
            self.assertTrue(row.get("source_fact"))
            self.assertEqual(row.get("interpretation"), {})
            self.assertIn(row.get("source_classification"), {"historical", "deleted", "withdrawn"})
            locator = self._assert_locator(row.get("evidence"), historical=True)
            key = _locator_key(locator)
            self.assertNotIn(key, actual, "historical records may not be double counted")
            actual.add(key)
        self.assertEqual(actual, expected, "all Phase-1 historical/deleted locators require exact human review")

    def test_all_29_program_identities_are_reviewed_and_strictly_dispositioned(self) -> None:
        """Requires exhaustive program review without treating authored names as current identities.

        Returns:
            Nothing.
        """
        program = _git_bytes(self.baseline, PROGRAM_PATH).decode("utf-8")
        partition = program.split("### Pilot\n", 1)[1].split(
            "The partition covers 29 canonical identities exactly once.", 1
        )[0]
        expected_labels = re.findall(r"^- (.+)$", partition, flags=re.MULTILINE)
        self.assertEqual(len(expected_labels), 29)

        batches = self.human_discovery.get("replacement_program_review_batches")
        self.assertIsInstance(batches, list)
        assert isinstance(batches, list)
        batched_labels: list[str] = []
        for index, batch in enumerate(batches):
            self.assertIsInstance(batch, dict)
            assert isinstance(batch, dict)
            labels = batch.get("accepted_identity_ids")
            self.assertIsInstance(labels, list)
            assert isinstance(labels, list)
            self.assertGreaterEqual(len(labels), 1)
            self.assertLessEqual(len(labels), 3, "program game batches may contain no more than three identities")
            self.assertEqual(batch.get("status"), "accepted")
            self.assertEqual(batch.get("collector_role"), "evidence-collector")
            self.assertEqual(batch.get("interpretation"), {})
            batched_labels.extend(labels)
        self.assertEqual(batched_labels, expected_labels)
        self.assertEqual(len(batched_labels), len(set(batched_labels)))

        reviews = self.human_discovery.get("replacement_program_identity_reviews")
        self.assertIsInstance(reviews, list)
        assert isinstance(reviews, list)
        self.assertEqual([row.get("program_identity_label") for row in reviews if isinstance(row, dict)], expected_labels)
        dispositions: dict[str, str] = {}
        for index, value in enumerate(reviews):
            row = self._assert_review_record(value, location=f"replacement_program_identity_reviews[{index}]")
            label = row["program_identity_label"]
            disposition = row.get("disposition")
            self.assertIn(disposition, PROGRAM_DISPOSITIONS)
            assert isinstance(disposition, str)
            dispositions[label] = disposition
            self.assertIn(row.get("review_batch_id"), {batch["batch_id"] for batch in batches})
            search = row.get("baseline_implementation_search")
            self.assertIsInstance(search, dict)
            assert isinstance(search, dict)
            self.assertEqual(search.get("revision"), self.baseline)
            self.assertIn(row["catalog_id"], str(search.get("exact_path_fragment")))
            catalog_search = row.get("catalog_search")
            self.assertIsInstance(catalog_search, dict)
            assert isinstance(catalog_search, dict)
            self.assertEqual(catalog_search.get("revision"), self.baseline)
            catalog_evidence = catalog_search.get("search_evidence")
            self.assertIsInstance(catalog_evidence, list)
            assert isinstance(catalog_evidence, list)
            self.assertTrue(catalog_evidence)
            for evidence in catalog_evidence:
                self._assert_locator(evidence)

            current = row.get("current_source_evidence")
            history = row.get("historical_source_evidence")
            self.assertIsInstance(current, list)
            self.assertIsInstance(history, list)
            assert isinstance(current, list) and isinstance(history, list)
            if disposition == "current":
                self.assertTrue(current)
                self.assertFalse(history)
                self.assertTrue(row.get("current_source_denominator_included"))
            else:
                self.assertFalse(current)
                self.assertEqual(search.get("matched_implementation_paths"), [])
                self.assertFalse(row.get("current_source_denominator_included"))
                history_search = row.get("history_search")
                self.assertIsInstance(history_search, dict)
                assert isinstance(history_search, dict)
                self.assertEqual(history_search.get("baseline_revision"), self.baseline)
                self.assertTrue(history_search.get("ancestor_only"))
                self.assertEqual(len(history_search.get("matched_locator_keys", [])), len(history))
                self.assertIsInstance(history_search.get("search_methods"), list)
                self.assertTrue(history_search.get("search_methods"))
                if disposition == "historical/withdrawn":
                    self.assertTrue(history)
                    primary = self._assert_locator(row.get("primary_historical_evidence"), historical=True)
                    self.assertIn(primary, history)
                    deletion = history_search.get("primary_deletion")
                    self.assertIsInstance(deletion, dict)
                    assert isinstance(deletion, dict)
                    self.assertRegex(str(deletion.get("deletion_commit")), COMMIT_SHA)
                    self.assertEqual(deletion.get("parent_revision"), primary["revision"])
                    self.assertEqual(deletion.get("path"), primary["path"])
                elif disposition == "unsupported program assumption":
                    self.assertFalse(history)
                    self.assertEqual(history_search.get("exact_name_commit_hits"), [])
                    self.assertEqual(history_search.get("slug_commit_hits"), [])
                for evidence in history:
                    self._assert_locator(evidence, historical=True)

        self.assertEqual(len(dispositions), 29)
        self.assertEqual(sum(value == "current" for value in dispositions.values()), len(self._identity_ids()))
        self.assertEqual(sum(value == "historical/withdrawn" for value in dispositions.values()), 12)

        historical = _load_json(HISTORICAL_PATH, phase2=True)
        program_history = historical.get("program_identity_history_reviews")
        self.assertIsInstance(program_history, list)
        assert isinstance(program_history, list)
        self.assertEqual(
            {row.get("program_identity_label") for row in program_history if isinstance(row, dict)},
            {label for label, disposition in dispositions.items() if disposition == "historical/withdrawn"},
        )
        for index, value in enumerate(program_history):
            row = self._assert_review_record(value, location=f"program_identity_history_reviews[{index}]")
            self.assertEqual(row.get("disposition"), "historical/withdrawn")
            self._assert_locator(row.get("primary_historical_evidence"), historical=True)

    def test_generator_derives_program_identity_mapping_without_an_authored_inventory(self) -> None:
        """Rejects a hard-coded program-label-to-source-identity mapping.

        Returns:
            Nothing.
        """
        source = GENERATOR_PATH.read_text(encoding="utf-8")
        self.assertNotRegex(source, r"(?m)^PROGRAM_IDENTITIES\s*=")
        self.assertIn("discover_program_identities", source)

    def test_raw_discovery_precedes_and_survives_poisoned_phase1_loading(self) -> None:
        """Requires a raw frozen-tree result before any Phase-1 artifact can be read."""
        source = GENERATOR_PATH.read_text(encoding="utf-8")
        generate_body = source.split("def generate(", 1)[1]
        self.assertLess(
            generate_body.index("discover_raw_frozen_sources("),
            generate_body.index("git_json("),
        )
        module = _load_generator_module()
        with mock.patch.object(module, "git_json", side_effect=AssertionError("poisoned Phase-1 input")):
            raw = module.discover_raw_frozen_sources()
        self.assertEqual(raw["source_baseline_revision"], self.baseline)
        self.assertTrue(raw["raw_identity_records"])

    def test_raw_catalog_route_and_store_discovery_finds_review_a_counterexamples(self) -> None:
        """Requires raw identities and store domains that were absent from the replay path."""
        raw = self.human_discovery.get("raw_frozen_source_discovery")
        self.assertIsInstance(raw, dict)
        assert isinstance(raw, dict)
        catalog_ids = {row["catalog_id"] for row in raw["raw_identity_records"]}
        self.assertEqual(len(catalog_ids), 27)
        self.assertIn("potion-rush", catalog_ids)
        self.assertIn("rpg-battle", catalog_ids)
        self.assertTrue(all(1 <= len(batch["identity_ids"]) <= 3 for batch in raw["review_batches"]))
        self.assertEqual(
            {identity for batch in raw["review_batches"] for identity in batch["identity_ids"]},
            catalog_ids,
        )
        states = {
            (row["path"], row["source_symbol"], row["state_id"])
            for row in raw["raw_state_records"]
        }
        self.assertIn(("apps/advantage-games/src/store/usePotionRushStore.ts", "GameState", "PLAYING"), states)
        self.assertIn(("apps/advantage-games/src/store/useRPGBattleStore.ts", "BattleStatus", "victory"), states)
        transitions = {
            (row["path"], row["source_symbol"], row["from_state_id"], row["to_state_id"])
            for row in raw["raw_transition_records"]
        }
        self.assertIn(("apps/advantage-games/src/store/useRPGBattleStore.ts", "status", "playing", "victory"), transitions)
        self.assertIn(("apps/advantage-games/src/store/useRPGBattleStore.ts", "status", "playing", "defeat"), transitions)
        candidates = {
            (
                row["path"],
                row["source_symbol"],
                row.get("from_state_id"),
                row["to_state_id"],
                row["reason"],
            )
            for row in raw["raw_transition_write_candidates"]
        }
        self.assertIn(
            (
                "apps/advantage-games/src/store/usePotionRushStore.ts",
                "gameState",
                None,
                "PLAYING",
                "no-single-proven-from-state",
            ),
            candidates,
        )
        self.assertIn(
            (
                "apps/advantage-games/src/store/useRPGBattleStore.ts",
                "status",
                None,
                "playing",
                "no-single-proven-from-state",
            ),
            candidates,
        )

    def test_raw_discovery_independently_covers_exact_shared_package_files(self) -> None:
        """Requires raw Phase-2 file discovery to cover the full source-derived package set."""
        raw = self.human_discovery["raw_frozen_source_discovery"]
        result = subprocess.run(
            [
                "git", "ls-tree", "-r", "--name-only", self.baseline, "--",
                "packages/advantage-play-kit", "packages/game-contracts", "packages/game-cartridges",
            ],
            cwd=REPO_ROOT,
            capture_output=True,
            check=True,
            text=True,
        )
        expected_package_paths = set(result.stdout.splitlines())
        self.assertEqual(len(expected_package_paths), 48)
        raw_package_paths = {
            row["canonical_path"]
            for row in raw["raw_file_records"]
            if isinstance(row.get("canonical_path"), str)
            and row["canonical_path"].startswith(
                ("packages/advantage-play-kit/", "packages/game-contracts/", "packages/game-cartridges/")
            )
        }
        self.assertEqual(
            raw_package_paths,
            expected_package_paths,
            "independent raw discovery must not reuse Phase-1's three-file package filter",
        )

    def test_raw_discovery_independently_covers_object_shaped_state_domains(self) -> None:
        """Requires raw Phase-2 state discovery to cover source-derived object state domains."""
        raw = self.human_discovery["raw_frozen_source_discovery"]

        specifications = (
            ("apps/advantage-games/src/lib/games/alchemistsSynthesis.ts", "AlchemistsSynthesisState", "status"),
            ("apps/advantage-games/src/lib/games/castleDefense.ts", "CastleDefenseState", "status"),
            ("apps/advantage-games/src/lib/games/dragonFlight.ts", "DragonFlightState", "status"),
            ("apps/advantage-games/src/lib/games/devourerSlime.ts", "SlimeState", "phase"),
            ("apps/advantage-games/src/lib/games/enchantedLibrary.ts", "EnchantedLibraryState", "status"),
            ("apps/advantage-games/src/lib/games/runeMatch.ts", "RuneMatchState", "status"),
            ("apps/advantage-games/src/lib/games/wizardZombie.ts", "WizardZombieState", "status"),
        )
        expected_states: set[tuple[str, str, str]] = set()
        for path, type_name, property_name in specifications:
            text = _git_bytes(self.baseline, path).decode("utf-8", errors="replace")
            declaration = re.search(
                rf"export\s+type\s+{re.escape(type_name)}\s*=\s*\{{([\s\S]*?)\n\}};?",
                text,
            )
            self.assertIsNotNone(declaration)
            assert declaration is not None
            property_declaration = re.search(
                rf"^\s*{re.escape(property_name)}\??:\s*([^;]+);",
                declaration.group(1),
                re.MULTILINE,
            )
            self.assertIsNotNone(property_declaration)
            assert property_declaration is not None
            expected_states.update(
                (path, f"{type_name}.{property_name}", literal)
                for literal in re.findall(r"['\"]([^'\"\n]+)['\"]", property_declaration.group(1))
            )
        self.assertEqual(len(expected_states), 22)
        raw_states = {
            (row["path"], row["source_symbol"], row["state_id"])
            for row in raw["raw_state_records"]
        }
        self.assertEqual(
            expected_states & raw_states,
            expected_states,
            "the independent path must discover all seven object-shaped state domains",
        )

    def test_raw_tree_asset_history_quarantine_and_resource_contracts_fail_closed(self) -> None:
        """Requires tree-derived sets, quarantine-before-read, and numeric ceilings."""
        module = _load_generator_module()
        raw = self.human_discovery["raw_frozen_source_discovery"]
        self.assertTrue(raw["raw_file_records"])
        self.assertTrue(raw["raw_asset_records"])
        self.assertTrue(raw["raw_history_records"])
        usage = raw["resource_usage"]
        ceilings = self.freeze["frozen_resource_ceilings"]["evidence-collector"]
        for key in ("source_files", "command_invocations", "bytes_read"):
            self.assertIs(type(usage[key]), int)
            self.assertLessEqual(usage[key], ceilings[key])
        reader = module.GitObjectReader.__new__(module.GitObjectReader)
        reader.cache = {}
        reader.bytes_read = 0
        reader.files_read = 0
        reader.process = None
        with self.assertRaisesRegex(ValueError, "QUARANTINED_FACTUAL_SOURCE"):
            reader.read(self.baseline, f"{QUARANTINED_SOURCE_PREFIX}/fabricated.json")
        meter = module.BudgetMeter(source_files=ceilings["source_files"], command_invocations=0, bytes_read=0)
        with self.assertRaisesRegex(RuntimeError, "RESOURCE_CEILING_EXCEEDED"):
            meter.add(source_files=1)

    def test_symmetric_reconciliation_retains_human_and_mechanical_only_blockers(self) -> None:
        """Requires either side's omission to remain an explicit blocking discrepancy."""
        module = _load_generator_module()
        mechanical = {"a": [{"path": "mechanical"}], "mechanical-only": [{"path": "mechanical"}]}
        human = {"a": [{"path": "human"}], "human-only": [{"path": "human"}]}
        rows = module.symmetric_reconciliation_records("fixture", mechanical, human)
        by_key = {row["record_key"]: row for row in rows}
        self.assertEqual(by_key["a"]["comparison_status"], "matched")
        self.assertFalse(by_key["a"]["blocking"])
        self.assertEqual(by_key["mechanical-only"]["comparison_status"], "mechanical-only")
        self.assertTrue(by_key["mechanical-only"]["blocking"])
        self.assertEqual(by_key["human-only"]["comparison_status"], "human-only")
        self.assertTrue(by_key["human-only"]["blocking"])

    def test_exact_matched_transition_candidates_are_retained_without_edges(self) -> None:
        """Retains 136 exact target writes while any missing or substituted evidence blocks."""
        module = _load_generator_module()
        base = {
            "path": "game.ts",
            "source_symbol": "status",
            "to_state_id": "victory",
            "reason": "no-single-proven-from-state",
            "evidence": {"path": "game.ts", "range": {"start_line": 10}},
        }
        with_from = {**base, "from_state_id": "playing", "transition_evidence_kind": "guarded-write"}
        moved = copy.deepcopy(base)
        moved["evidence"]["range"]["start_line"] = 11
        keys = {
            module.transition_candidate_key(base),
            module.transition_candidate_key(with_from),
            module.transition_candidate_key(moved),
        }
        self.assertEqual(len(keys), 3, "line and optional proven-from are part of candidate identity")
        changed_reason = {**base, "reason": "state-domain-occurrence-ambiguous"}
        changed_proof = {**with_from, "transition_evidence_kind": "branch-guarded-write"}
        self.assertNotEqual(module.transition_candidate_key(base), module.transition_candidate_key(changed_reason))
        self.assertNotEqual(module.transition_candidate_key(with_from), module.transition_candidate_key(changed_proof))
        mechanical = {f"candidate:{index}": [base["evidence"]] for index in range(136)}
        human = copy.deepcopy(mechanical)
        rows = module.symmetric_reconciliation_records(
            "transition-write-candidates", mechanical, human,
        )
        self.assertEqual(len(rows), 136)
        self.assertTrue(all(row["comparison_status"] == "matched" for row in rows))
        self.assertTrue(all(row["resolution_status"] == "retained-target-write-candidate" for row in rows))
        self.assertTrue(all(row["blocking"] is False for row in rows))
        summary = module.summarize_symmetric_reconciliation(rows)
        self.assertEqual(summary["uncovered_count"], 0)
        missing = module.symmetric_reconciliation_records(
            "transition-write-candidates", mechanical, {key: value for key, value in human.items() if key != "candidate:0"},
        )
        self.assertEqual(module.summarize_symmetric_reconciliation(missing)["uncovered_count"], 1)
        substituted = copy.deepcopy(human)
        substituted["candidate:0"][0]["range"]["end_line"] = 11
        mismatch = module.symmetric_reconciliation_records(
            "transition-write-candidates", mechanical, substituted,
        )
        self.assertEqual(mismatch[0]["comparison_status"], "evidence-mismatch")
        self.assertTrue(mismatch[0]["blocking"])
        forged = [dict(mismatch[0], category="files", blocking=False, resolution_status="compared")]
        with self.assertRaisesRegex(ValueError, "INVALID_SYMMETRIC_COMPARISON_STATUS"):
            module.summarize_symmetric_reconciliation(forged)

    def test_duplicate_exact_reconciliation_keys_fail_before_set_comparison(self) -> None:
        """Rejects same-count duplicate-key collapse before symmetric set logic runs."""
        module = _load_generator_module()
        module.require_exact_map_cardinalities({"raw transitions": (2, 2)})
        with self.assertRaisesRegex(ValueError, "raw transitions"):
            module.require_exact_map_cardinalities({"raw transitions": (1, 2)})

    def test_symmetric_blocker_summary_is_exact_and_fail_closed(self) -> None:
        """Derives Phase-2 status and uncovered counts only from exact symmetric rows."""
        module = _load_generator_module()
        rows = [
            {
                "category": "files",
                "record_key": "matched",
                "comparison_status": "matched",
                "resolution_status": "compared",
                "blocking": False,
                "mechanical_evidence": [],
                "human_evidence": [],
            },
            {
                "category": "assets",
                "record_key": "human-only",
                "comparison_status": "human-only",
                "resolution_status": "compared",
                "blocking": True,
                "mechanical_evidence": [],
                "human_evidence": [{"path": "asset.png"}],
            },
            {
                "category": "history-paths",
                "record_key": "mechanical-only",
                "comparison_status": "mechanical-only",
                "blocking": True,
                "resolution_status": "compared",
                "mechanical_evidence": [{"path": "deleted.ts"}],
                "human_evidence": [],
            },
        ]

        summary = module.summarize_symmetric_reconciliation(rows)

        self.assertEqual(summary["status"], "independent-human-reconciliation-blocked")
        self.assertEqual(summary["coverage_status"], "blocked")
        self.assertEqual(summary["uncovered_count"], 2)
        self.assertEqual(summary["uncovered_by_category"], {"assets": 1, "history-paths": 1})
        self.assertEqual(summary["blocking_records"], rows[1:])

        rows[1]["blocking"] = False
        with self.assertRaisesRegex(ValueError, "SYMMETRIC_BLOCKING_FLAG_MISMATCH"):
            module.summarize_symmetric_reconciliation(rows)

    def test_symmetric_reconciliation_mutations_fail_closed(self) -> None:
        """Rejects duplicate, omitted, repeated, and falsely completed blocker accounting."""
        module = _load_generator_module()
        rows = [
            {
                "category": "files",
                "record_key": "matched",
                "comparison_status": "matched",
                "resolution_status": "compared",
                "blocking": False,
                "mechanical_evidence": [],
                "human_evidence": [],
            },
            {
                "category": "assets",
                "record_key": "human-only.png",
                "comparison_status": "human-only",
                "resolution_status": "compared",
                "blocking": True,
                "mechanical_evidence": [],
                "human_evidence": [{"path": "human-only.png"}],
            },
        ]
        summary = module.summarize_symmetric_reconciliation(rows)
        document = {
            "independent_symmetric_reconciliation": rows,
            "independent_symmetric_blocking_records": summary["blocking_records"],
            "status": summary["status"],
            "coverage_status": summary["coverage_status"],
            "uncovered_count": summary["uncovered_count"],
            "uncovered_by_category": summary["uncovered_by_category"],
        }
        module.validate_symmetric_reconciliation_document(document, rows)

        duplicated_row = copy.deepcopy(document)
        duplicated_row["independent_symmetric_reconciliation"].append(copy.deepcopy(rows[1]))
        with self.assertRaisesRegex(ValueError, "DUPLICATE_SYMMETRIC_RECORD"):
            module.validate_symmetric_reconciliation_document(duplicated_row, rows)

        for blockers in ([], [rows[1], copy.deepcopy(rows[1])]):
            mutated = copy.deepcopy(document)
            mutated["independent_symmetric_blocking_records"] = blockers
            with self.assertRaisesRegex(ValueError, "SYMMETRIC_BLOCKER_SET_MISMATCH"):
                module.validate_symmetric_reconciliation_document(mutated, rows)

        false_complete = copy.deepcopy(document)
        false_complete["status"] = "independent-human-discovery-complete"
        false_complete["coverage_status"] = "complete"
        with self.assertRaisesRegex(ValueError, "SYMMETRIC_STATUS_MISMATCH"):
            module.validate_symmetric_reconciliation_document(false_complete, rows)

        false_counts = copy.deepcopy(document)
        false_counts["uncovered_count"] = 0
        false_counts["uncovered_by_category"] = {}
        with self.assertRaisesRegex(ValueError, "SYMMETRIC_ACCOUNTING_MISMATCH"):
            module.validate_symmetric_reconciliation_document(false_counts, rows)

        empty_union = copy.deepcopy(document)
        empty_union["independent_symmetric_reconciliation"] = []
        with self.assertRaisesRegex(ValueError, "SYMMETRIC_UNION_MISMATCH"):
            module.validate_symmetric_reconciliation_document(empty_union, rows)

    def test_phase1_provenance_hashes_every_consumed_artifact(self) -> None:
        """Requires exact SHA-256 provenance for all six Phase-1 inputs."""
        module = _load_generator_module()
        revision = "a" * 40
        test_case = self

        class Reader:
            """Provides deterministic committed bytes for provenance testing."""

            def read(self, requested_revision: str, path: str) -> bytes:
                """Returns deterministic bytes for one requested artifact."""
                test_case.assertEqual(requested_revision, revision)
                return f"{requested_revision}:{path}".encode()

        provenance = module.phase1_input_provenance(Reader(), revision)
        self.assertEqual(provenance["revision"], revision)
        expected_paths = {f"measure/tracks/{TRACK}/{name}" for name in module.PHASE1_ARTIFACTS}
        self.assertEqual(set(provenance["artifact_sha256"]), expected_paths)
        for path in expected_paths:
            self.assertEqual(
                provenance["artifact_sha256"][path],
                hashlib.sha256(f"{revision}:{path}".encode()).hexdigest(),
            )

    def test_check_only_rejects_committed_output_provenance_drift(self) -> None:
        """Requires check-only to compare every output against requested revision hashes."""
        module = _load_generator_module()
        revision = "a" * 40

        class Reader:
            """Provides deterministic committed bytes without starting Git."""

            def read(self, requested_revision: str, path: str) -> bytes:
                """Returns deterministic bytes for one requested artifact."""
                return f"{requested_revision}:{path}".encode()

            def close(self) -> None:
                """Closes the no-op reader."""

        provenance = module.phase1_input_provenance(Reader(), revision)
        rows = [{
            "category": "files",
            "record_key": "matched",
            "comparison_status": "matched",
            "resolution_status": "compared",
            "blocking": False,
            "mechanical_evidence": [],
            "human_evidence": [],
        }]
        discrepancy = {
            "input_provenance": provenance,
            "independent_symmetric_reconciliation": rows,
            "independent_symmetric_blocking_records": [],
            "status": "independent-human-discovery-complete",
            "coverage_status": "complete",
            "uncovered_count": 0,
            "uncovered_by_category": {},
        }
        with tempfile.TemporaryDirectory() as directory:
            track_dir = Path(directory)
            for name in module.PHASE2_ARTIFACTS:
                document = discrepancy if name == "human-discrepancy-records.json" else {"input_provenance": provenance}
                (track_dir / name).write_text(json.dumps(document), encoding="utf-8")
            with (
                mock.patch.object(module, "TRACK_DIR", track_dir),
                mock.patch.object(module, "GitObjectReader", Reader),
                mock.patch.object(module, "validate_phase1_revision", return_value=revision),
                mock.patch.object(module, "check_coverage", return_value={"files": 1}),
                mock.patch.object(module, "discover_raw_frozen_sources", return_value={}) as discover,
                mock.patch.object(module, "git_json", return_value={}),
                mock.patch.object(module, "build_symmetric_reconciliation", return_value=rows) as build,
            ):
                self.assertEqual(module.check_only_result(revision)["status"], "passed")
                discover.assert_called()
                build.assert_called()
                drifted_path = track_dir / "independent-human-discovery.json"
                drifted = json.loads(drifted_path.read_text(encoding="utf-8"))
                drifted["input_provenance"]["revision"] = "b" * 40
                drifted_path.write_text(json.dumps(drifted), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "PHASE1_INPUT_PROVENANCE_MISMATCH"):
                    module.check_only_result(revision)

    def test_committed_symmetric_blockers_drive_phase2_status_and_counts(self) -> None:
        """Rejects the current hard-coded complete/zero summary when blockers exist."""
        discrepancies = _load_json(DISCREPANCY_PATH, phase2=True)
        module = _load_generator_module()
        rows = discrepancies.get("independent_symmetric_reconciliation")
        self.assertIsInstance(rows, list)
        assert isinstance(rows, list)
        summary = module.summarize_symmetric_reconciliation(rows)

        self.assertEqual(discrepancies.get("independent_symmetric_blocking_records"), summary["blocking_records"])
        self.assertEqual(discrepancies.get("status"), summary["status"])
        self.assertEqual(discrepancies.get("coverage_status"), summary["coverage_status"])
        self.assertEqual(discrepancies.get("uncovered_count"), summary["uncovered_count"])
        self.assertEqual(discrepancies.get("uncovered_by_category"), summary["uncovered_by_category"])

    def test_phase1_revision_is_mandatory_and_has_no_generator_default(self) -> None:
        """Prevents a stale embedded Phase-1 commit from silently rewriting Phase-2."""
        module = _load_generator_module()
        self.assertEqual(
            list(inspect.signature(module.generate).parameters),
            ["phase1_revision", "code_revision"],
        )
        self.assertEqual(list(inspect.signature(module.check_coverage).parameters), ["phase1_revision"])
        self.assertEqual(
            list(inspect.signature(module.check_only_result).parameters),
            ["phase1_revision", "code_revision"],
        )
        with self.assertRaises(TypeError):
            module.generate()
        with self.assertRaises(TypeError):
            module.check_coverage()
        source = GENERATOR_PATH.read_text(encoding="utf-8")
        self.assertNotRegex(source, r"(?m)^PHASE1_REVISION\s*=")
        self.assertIn('parser.add_argument("--phase1-revision", required=True)', source)
        self.assertIn('parser.add_argument("--code-revision", required=True)', source)
        self.assertIn("PHASE1_INPUT_PROVENANCE_MISMATCH", source)

    def test_phase2_factual_outputs_exclude_quarantined_source_strings(self) -> None:
        """Rejects failed-track paths anywhere in Phase-2 factual outputs.

        Returns:
            Nothing.
        """
        for path in (
            HUMAN_DISCOVERY_PATH,
            DUPLICATE_DRIFT_PATH,
            HISTORICAL_PATH,
            DISCREPANCY_PATH,
        ):
            document = _load_json(path, phase2=True)
            self.assertNotIn(QUARANTINED_SOURCE_PREFIX, json.dumps(document), str(path))

    def test_every_mechanical_record_has_one_exact_human_disposition(self) -> None:
        """Compares all mechanical record classes to independent human dispositions.

        Returns:
            Nothing.
        """
        source_reviews = self.human_discovery.get("mechanical_source_record_reviews")
        graph_reviews = self.human_discovery.get("mechanical_graph_edge_reviews")
        surface_reviews = self.human_discovery.get("surface_reviews")
        asset_reviews = self.human_discovery.get("asset_candidate_reviews")
        group_reviews = self.human_discovery.get("identical_hash_group_reviews")
        for rows in (source_reviews, graph_reviews, surface_reviews, asset_reviews, group_reviews):
            self.assertIsInstance(rows, list)
        assert all(isinstance(rows, list) for rows in (source_reviews, graph_reviews, surface_reviews, asset_reviews, group_reviews))

        expected_source = {row["record_id"] for row in self.source["records"]}
        self.assertEqual({row["mechanical_record_id"] for row in source_reviews}, expected_source)
        expected_graph = {_locator_key(row) for row in self.source["graph_edges"]}
        self.assertEqual({row["mechanical_graph_edge_key"] for row in graph_reviews}, expected_graph)
        expected_surfaces = {
            _locator_key(row)
            for field in ("scene_records", "state_records", "transitions", "transition_write_candidates")
            for row in self.scenes[field]
        }
        self.assertEqual({row["mechanical_surface_key"] for row in surface_reviews}, expected_surfaces)
        expected_assets = {row["canonical_path"] for row in self.assets["candidate_files"]}
        self.assertEqual({row["canonical_path"] for row in asset_reviews}, expected_assets)
        expected_groups = {row["identical_hash_group"] for row in self.assets["candidate_files"]}
        self.assertEqual({row["identical_hash_group"] for row in group_reviews}, expected_groups)

        for field, rows in (
            ("mechanical_source_record_reviews", source_reviews),
            ("mechanical_graph_edge_reviews", graph_reviews),
            ("surface_reviews", surface_reviews),
            ("asset_candidate_reviews", asset_reviews),
            ("identical_hash_group_reviews", group_reviews),
        ):
            for index, row in enumerate(rows):
                self._assert_review_record(row, location=f"{field}[{index}]")

    def test_coverage_receipt_reports_zero_uncovered_for_every_category(self) -> None:
        """Requires explicit zero-uncovered counts for the complete mechanical denominator.

        Returns:
            Nothing.
        """
        discrepancies = _load_json(DISCREPANCY_PATH, phase2=True)
        counts = discrepancies.get("exhaustive_coverage_counts")
        self.assertIsInstance(counts, dict)
        assert isinstance(counts, dict)
        expected_counts = {
            "asset_candidates": len(self.assets["candidate_files"]),
            "copy_records": sum(row.get("record_type") == "copy" for row in self.source["records"]),
            "current_identities": len(self._identity_ids()),
            "duplicate_family_records": 2 * len(self._identity_ids()),
            "graph_edges": len(self.source["graph_edges"]),
            "historical_locators": len(self.phase1_historical["records"]),
            "identical_hash_groups": len({row["identical_hash_group"] for row in self.assets["candidate_files"]}),
            "mechanical_discrepancies": len(self.phase1_discrepancies["records"]),
            "replacement_program_identities": 29,
            "program_identity_dispositions": 29,
            "historical_program_identities": 12,
            "source_records": len(self.source["records"]),
            "surfaces": sum(
                len(self.scenes[field])
                for field in (
                    "scene_records",
                    "state_records",
                    "transitions",
                    "transition_write_candidates",
                )
            ),
        }
        self.assertEqual(counts, expected_counts)
        self.assertEqual(discrepancies.get("coverage_status"), "complete")
        self.assertEqual(discrepancies.get("uncovered_count"), 0)
        self.assertEqual(discrepancies.get("uncovered_by_category"), {key: 0 for key in expected_counts})

    def test_evidence_collector_receipt_is_separate_and_attests_its_outputs(self) -> None:
        """Requires an evidence-collector receipt distinct from the human review data.

        Returns:
            Nothing.
        """
        receipt = _load_json(EVIDENCE_RECEIPT_PATH, phase2=True)
        self.assertEqual(receipt.get("schema_version"), self.ownership["receipt_contract"]["schema_version"])
        self.assertEqual(receipt.get("role"), "evidence-collector")
        self.assertEqual(receipt.get("phase"), "Phase 2: Independent human discovery")
        self.assertEqual(receipt.get("source_baseline_revision"), self.baseline)
        required = self.ownership["receipt_contract"]["required_provenance"]
        self.assertIsInstance(required, list)
        assert isinstance(required, list)
        digest_fields = {"output_sha256", "budget_declaration_sha256"}
        unavailable_platform_fields = {
            "spawn_id",
            "parent_ancestry_ids",
            "prompt_sha256",
            "actual_context_manifest_sha256",
            "start_event_id",
            "end_event_id",
            "final_response_sha256",
        }
        for field in required:
            self.assertIn(field, receipt)
            if field in unavailable_platform_fields and receipt[field] is None:
                limitation = receipt.get(f"{field}_limitation")
                self.assertIsInstance(limitation, str)
                self.assertTrue(limitation)
            elif field == "parent_ancestry_ids":
                self.assertIsInstance(receipt[field], list)
                self.assertTrue(all(isinstance(value, str) and value for value in receipt[field]))
            elif field == "commit_sha":
                self.assertIsInstance(receipt[field], str)
                self.assertRegex(receipt[field], COMMIT_SHA)
            elif field in digest_fields:
                self.assertIsInstance(receipt[field], str)
                self.assertRegex(receipt[field], SHA256)
            else:
                self.assertIsInstance(receipt[field], str)
                self.assertTrue(receipt[field])
        outputs = receipt.get("output_paths")
        self.assertIsInstance(outputs, list)
        assert isinstance(outputs, list)
        self.assertIn(str(HUMAN_DISCOVERY_PATH.relative_to(REPO_ROOT)), outputs)
        self.assertIn(str(DUPLICATE_DRIFT_PATH.relative_to(REPO_ROOT)), outputs)
        self.assertIn(str(HISTORICAL_PATH.relative_to(REPO_ROOT)), outputs)
        self.assertIn(str(DISCREPANCY_PATH.relative_to(REPO_ROOT)), outputs)
        output_hashes = receipt.get("output_hashes")
        self.assertIsInstance(output_hashes, dict)
        assert isinstance(output_hashes, dict)
        self.assertEqual(set(output_hashes), set(outputs))
        commit_sha = receipt["commit_sha"]
        for path in outputs:
            self.assertEqual(output_hashes[path], hashlib.sha256(_git_bytes(commit_sha, path)).hexdigest())
        hash_basis = json.dumps(output_hashes, sort_keys=True, separators=(",", ":")).encode()
        self.assertEqual(receipt.get("output_sha256"), hashlib.sha256(hash_basis).hexdigest())

    def test_discrepancies_cover_phase1_observations_and_fail_closed_without_interpretation(self) -> None:
        """Blocks advancement for omitted, unresolved, or interpretive comparison records.

        Returns:
            Nothing.
        """
        discrepancies = _load_json(DISCREPANCY_PATH, phase2=True)
        self.assertEqual(discrepancies.get("schema_version"), "apk-denominator-human-discrepancies.v1")
        self.assertEqual(discrepancies.get("status"), "independent-human-discovery-complete")
        self.assertEqual(discrepancies.get("source_baseline_revision"), self.baseline)
        identity_rows = discrepancies.get("identity_comparison_records")
        self.assertIsInstance(identity_rows, list)
        assert isinstance(identity_rows, list)
        seen_identities: set[str] = set()
        for row in identity_rows:
            self.assertIsInstance(row, dict)
            assert isinstance(row, dict)
            identity_id = row.get("canonical_identity_id")
            self.assertIsInstance(identity_id, str)
            assert isinstance(identity_id, str)
            self.assertNotIn(identity_id, seen_identities)
            seen_identities.add(identity_id)
            self.assertIn(row.get("comparison_status"), {"no-discrepancy", "resolved"})
            self.assertFalse(row.get("blocking"), "unresolved discrepancies must block Phase 2")
            self._assert_review_record(row, location=f"identity_comparison_records[{identity_id}]")
        self.assertEqual(seen_identities, self._identity_ids())

        phase1_rows = self.phase1_discrepancies.get("records")
        self.assertIsInstance(phase1_rows, list)
        assert isinstance(phase1_rows, list)
        expected_observations = {
            row.get("observation_id") for row in phase1_rows if isinstance(row, dict) and isinstance(row.get("observation_id"), str)
        }
        observation_rows = discrepancies.get("mechanical_observation_records")
        self.assertIsInstance(observation_rows, list)
        assert isinstance(observation_rows, list)
        seen_observations: set[str] = set()
        for row in observation_rows:
            self.assertIsInstance(row, dict)
            assert isinstance(row, dict)
            observation_id = row.get("observation_id")
            self.assertIsInstance(observation_id, str)
            assert isinstance(observation_id, str)
            self.assertNotIn(observation_id, seen_observations)
            seen_observations.add(observation_id)
            self.assertIn(row.get("comparison_status"), {"no-discrepancy", "resolved"})
            self.assertFalse(row.get("blocking"), "unresolved discrepancies must block Phase 2")
            self._assert_review_record(row, location=f"mechanical_observation_records[{observation_id}]")
        self.assertEqual(seen_observations, expected_observations)

        for artifact in (self.human_discovery, discrepancies):
            self._assert_no_interpretation_fields(artifact)

    def test_revalidate_rejects_forged_locator_payload(self) -> None:
        """Rejects a submitted locator whose hashes differ from recomputed bytes."""
        module = _load_generator_module()

        class Reader:
            def read(self, revision: str, path: str) -> bytes:
                return b"source\n"

        valid = module.locator(Reader(), "a" * 40, "source.ts", 1, 1)
        self.assertEqual(module.revalidate(Reader(), valid), valid)
        forged = copy.deepcopy(valid)
        forged["blob_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "LOCATOR_MISMATCH"):
            module.revalidate(Reader(), forged)

    def test_duplicate_review_projection_fails_before_set_comparison(self) -> None:
        """Rejects duplicate reviewed keys before coverage can collapse them."""
        module = _load_generator_module()
        rows = [{"id": "same"}, {"id": "same"}]
        with self.assertRaisesRegex(ValueError, "DUPLICATE_EXACT_REVIEW_KEY:source"):
            module.unique_projection(rows, lambda row: row["id"], "source")

    def test_all_history_log_commands_are_first_parent_bound(self) -> None:
        """Requires raw discovery and program history commands to stay first-parent only."""
        module = _load_generator_module()
        source = (TRACK_DIR / "generate_phase2_human_discovery.py").read_text(encoding="utf-8")
        log_commands = [line for line in source.splitlines() if '"git", "log"' in line]
        self.assertTrue(log_commands)
        self.assertTrue(all('"--first-parent"' in line for line in log_commands), log_commands)
        path_a = "apps/advantage-games/src/a.ts"
        path_b = "packages/advantage-play-kit/src/b.ts"
        history = "\n".join((f"commit:{'a' * 40}", f"D\t{path_a}", f"commit:{'b' * 40}", f"D\t{path_a}", f"commit:{'c' * 40}", f"D\t{path_b}"))
        self.assertEqual(
            module.first_deletion_records(history),
            [
                {"deletion_revision": "a" * 40, "path": path_a},
                {"deletion_revision": "c" * 40, "path": path_b},
            ],
        )


if __name__ == "__main__":
    unittest.main()
