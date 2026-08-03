"""Guards exact Existing Core Task 6 retirement dispositions and residuals."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import unittest
from functools import lru_cache
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
CORE_TRACK = REPO_ROOT / "measure/archive/apk_existing_core_cutover_20260727"
MANIFEST_PATH = CORE_TRACK / "task6-legacy-retirement-manifest-v1.json"
ACCEPTANCE_PATH = CORE_TRACK / "task5-task6-product-owner-acceptance-v1.json"
MATRIX_PATH = CORE_TRACK / "task5-canonical-reuse-disposition-matrix-v1.json"
SOURCE_INVENTORY_PATH = CORE_TRACK / "task5-legacy-source-inventory-v1.json"
CATALOG_PATH = REPO_ROOT / "packages/game-cartridges/src/catalog.ts"
ROOT_EXPORT_PATH = REPO_ROOT / "packages/game-cartridges/src/index.ts"
SUCCESSOR_CANDIDATE_PATH = REPO_ROOT / "measure/apk-cross-host-cutover-candidate-v1.json"
HISTORICAL_TASK6_REVISION = "1070be300"

EXPECTED_TITLES = [
    "dragon-flight",
    "magic-defense",
    "dungeon-liberator",
    "sorcerer-ziggurat",
    "astral-mage",
]
EXPECTED_DUPLICATE_ASSETS = [
    *[
        f"apps/advantage-games/public/games/dragon-flight/{name}"
        for name in (
            "boss-3x3-sheet-facing-up.png",
            "dragon-army-3x3-sheet-facing-up.png",
            "gates-3x3-sheet-facing-up.png",
            "loading-screen-background.png",
            "parallax-bottom-tiling.png",
            "parallax-middle-tiling.png",
            "parallax-top-tiling.png",
            "player-3x3-sheet-facing-camera.png",
            "player-3x3-sheet-facing-down.png",
        )
    ],
    *[
        f"apps/advantage-games/public/games/dungeon-liberator/{name}"
        for name in ("background.png", "player-sheet.png", "prisoner-sheet.png", "slime-sheet.png")
    ],
]


def _load(path: Path) -> dict[str, Any]:
    """Loads one repository-local JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of one exact repository file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _git_blob_sha256(revision: str, relative_path: str) -> str:
    """Returns the digest of one repository file at an immutable Git revision."""
    value = subprocess.run(
        ["git", "show", f"{revision}:{relative_path}"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
    ).stdout
    return hashlib.sha256(value).hexdigest()


def _repo_path(relative_path: str) -> Path:
    """Resolves a repository-relative path without permitting path escape."""
    candidate = (REPO_ROOT / relative_path).resolve()
    candidate.relative_to(REPO_ROOT.resolve())
    return candidate


def _sql_literal(value: str) -> str:
    """Quotes one value for the read-only repository graph query."""
    return "'" + value.replace("'", "''") + "'"


def _graph_query(query: str) -> list[dict[str, Any]]:
    """Runs one read-only JSON query against the repository graph."""
    result = subprocess.run(
        ["repo-graph", "query", "--json", "./graph.db", query],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    value = json.loads(result.stdout)
    if not isinstance(value, list):
        raise AssertionError("repo-graph query must return a list")
    return value


@lru_cache(maxsize=1)
def _graph_snapshot() -> tuple[set[str], list[dict[str, Any]]]:
    """Loads the relevant graph files and edges once for the retirement guard."""
    manifest = _load(MANIFEST_PATH)
    target_scopes = {
        surface["path"]
        for title in manifest["legacy_surfaces"]
        for surface in title["surfaces"]
    }

    def scope_clauses(column: str, scopes: set[str]) -> str:
        clauses = []
        for scope in sorted(scopes):
            absolute = _repo_path(scope).as_posix()
            prefix = absolute.rstrip("/") + "/"
            clauses.append(
                f"({column} = {_sql_literal(absolute)} OR "
                f"{column} LIKE {_sql_literal(prefix + '%')})"
            )
        return " OR ".join(clauses)

    file_rows = _graph_query(
        "SELECT path FROM files WHERE "
        f"{scope_clauses('path', target_scopes)} ORDER BY path"
    )
    edge_rows = _graph_query(
        "SELECT e.type, s.file_path AS source_file, t.file_path AS target_file "
        "FROM edges e JOIN nodes s ON s.id = e.source JOIN nodes t ON t.id = e.target "
        f"WHERE ({scope_clauses('t.file_path', target_scopes)}) "
        "AND e.type IN ('imports', 'calls', 'references') "
        "ORDER BY e.type, s.file_path, t.file_path"
    )
    return {str(row["path"]) for row in file_rows}, edge_rows


def _graph_scope_paths(relative_path: str) -> list[str]:
    """Returns graph-indexed files at or below one repository-relative scope."""
    absolute = _repo_path(relative_path).as_posix()
    prefix = absolute.rstrip("/") + "/"
    files, _ = _graph_snapshot()
    return sorted(path for path in files if path == absolute or path.startswith(prefix))


def _graph_edges_for_surface(surface: dict[str, Any]) -> list[dict[str, Any]]:
    """Returns indexed import, call, and reference edges for one retained surface."""
    target = _repo_path(surface["path"]).as_posix()
    target_prefix = target.rstrip("/") + "/"
    _, edges = _graph_snapshot()
    return [
        edge
        for edge in edges
        if edge["source_file"] != edge["target_file"]
        and (edge["target_file"] == target or edge["target_file"].startswith(target_prefix))
    ]


class ExistingCoreTask6LegacyRetirementTests(unittest.TestCase):
    """Ensures Task 6 retires only proven paths and records every residual."""

    def test_receipt_and_host_proof_boundary_are_current(self) -> None:
        """Requires the accepted Task 5 receipt and both clean host reports."""
        manifest = _load(MANIFEST_PATH)
        acceptance = _load(ACCEPTANCE_PATH)
        self.assertEqual(_sha256(ACCEPTANCE_PATH), manifest["predecessor"]["sha256"])
        self.assertTrue(acceptance["authorization"]["task6_exact_legacy_retirement_begin_authorized"])
        self.assertEqual(manifest["predecessor"]["reading_host_results"], {"expected": 41, "unexpected": 0, "skipped": 0, "flaky": 0})
        self.assertEqual(manifest["predecessor"]["primary_host_results"], {"expected": 41, "unexpected": 0, "skipped": 0, "browser_cases": 40})
        self.assertTrue(manifest["authorization"]["production_catalog_exposure_authorized"])
        self.assertTrue(manifest["authorization"]["cutover_authorized"])

    def test_exact_matrix_allows_no_legacy_deletion_candidates(self) -> None:
        """Fails closed if a deletion is claimed without an accepted matrix candidate."""
        manifest = _load(MANIFEST_PATH)
        matrix = _load(MATRIX_PATH)
        self.assertEqual(sorted({item["title_id"] for item in matrix["rows"]}), sorted(EXPECTED_TITLES))
        # Option 1 production cutover may populate candidates; deleted paths must be absent.
        self.assertEqual(manifest["scope"]["titles"], EXPECTED_TITLES)
        accepted_candidates = {
            candidate
            for row in matrix["rows"]
            for candidate in row["legacy_retirement_candidates"]
        }
        for deleted_path in manifest["decision"]["deleted_paths"]:
            self.assertIn(deleted_path, accepted_candidates)
            self.assertFalse(_repo_path(deleted_path).exists(), deleted_path)

    def test_source_assets_and_duplicate_residuals_are_exact(self) -> None:
        """Binds every current source asset and keeps divergent/non-owned copies explicit."""
        manifest = _load(MANIFEST_PATH)
        inventory = _load(SOURCE_INVENTORY_PATH)
        self.assertEqual(
            _sha256(SOURCE_INVENTORY_PATH),
            manifest["scope"]["source_inventory_sha256"],
        )
        self.assertEqual(
            [item["title_id"] for item in inventory["source_backed_titles"]],
            ["dragon-flight", "magic-defense", "dungeon-liberator"],
        )
        for title in inventory["source_backed_titles"]:
            for asset in title["assets"]:
                path = _repo_path(asset["repository_path"])
                self.assertTrue(path.is_file(), asset["repository_path"])
                self.assertEqual(_sha256(path), asset["sha256"], asset["repository_path"])
        for copy in inventory["reading_host_public_copies"]:
            path = _repo_path(copy["repository_path"])
            self.assertTrue(path.is_file(), copy["repository_path"])
            self.assertEqual(_sha256(path), copy["sha256"], copy["repository_path"])
        for relative_path in EXPECTED_DUPLICATE_ASSETS:
            self.assertTrue(_repo_path(relative_path).is_file(), relative_path)
        dragon = next(item for item in inventory["reading_host_public_copies"] if item["repository_path"].endswith("projectile-boss.png"))
        fireball = next(item for item in inventory["reading_host_public_copies"] if item["repository_path"].endswith("projectile-fireball.png"))
        self.assertFalse(dragon["matches_advantage_games_sha256"])
        self.assertFalse(fireball["matches_advantage_games_sha256"])

    def test_manifest_enumerates_every_legacy_asset_and_asset_caller(self) -> None:
        """Requires the retirement record to enumerate all retained asset paths and owners."""
        manifest = _load(MANIFEST_PATH)
        inventory = _load(SOURCE_INVENTORY_PATH)
        expected_source_paths = {
            asset["repository_path"]
            for title in inventory["source_backed_titles"]
            for asset in title["assets"]
        }
        expected_host_copy_paths = {
            copy["repository_path"] for copy in inventory["reading_host_public_copies"]
        }
        expected_non_owned_paths = set(EXPECTED_DUPLICATE_ASSETS)
        enumerated_source_paths: set[str] = set()
        enumerated_host_copy_paths: set[str] = set()
        enumerated_non_owned_paths: set[str] = set()

        for title in manifest["legacy_surfaces"]:
            assets = title["assets"]
            for caller in title["exact_legacy_caller_paths"]:
                if "deleted-after-production-cutover" in str(title.get("disposition", "")):
                    continue
                self.assertTrue(_repo_path(caller).is_file(), caller)
            enumerated_source_paths.update(assets["retained_runtime_paths"])
            enumerated_host_copy_paths.update(assets["retained_host_copy_paths"])
            enumerated_non_owned_paths.update(assets["retained_non_owned_paths"])
            for caller_group in assets["direct_asset_callers"].values():
                for caller in caller_group:
                    self.assertTrue(_repo_path(caller).is_file(), caller)
            for asset_path in (
                assets["retained_runtime_paths"]
                + assets["retained_host_copy_paths"]
                + assets["retained_non_owned_paths"]
            ):
                self.assertTrue(_repo_path(asset_path).is_file(), asset_path)

        self.assertEqual(enumerated_source_paths, expected_source_paths)
        self.assertEqual(enumerated_host_copy_paths, expected_host_copy_paths)
        self.assertEqual(enumerated_non_owned_paths, expected_non_owned_paths)

        dragon_assets = next(
            item for item in manifest["legacy_surfaces"] if item["title_id"] == "dragon-flight"
        )["assets"]
        self.assertEqual(
            set(dragon_assets["divergent_copy_paths"]),
            {
                "apps/reading-advantage/public/games/vocabulary/dragon-flight/projectile-boss.png",
                "apps/reading-advantage/public/games/vocabulary/dragon-flight/projectile-fireball.png",
            },
        )

        for title_id in ("sorcerer-ziggurat", "astral-mage"):
            title = next(item for item in manifest["legacy_surfaces"] if item["title_id"] == title_id)
            self.assertEqual(title["surfaces"], [])
            self.assertEqual(title["assets"]["retained_runtime_paths"], [])
            self.assertIn("source-blocked", title["residual"])

    def test_every_retained_path_has_one_explicit_owner_and_reason(self) -> None:
        """Requires every retained surface and asset path to explain ownership and retention."""
        manifest = _load(MANIFEST_PATH)
        expected_paths: set[str] = set()
        for title in manifest["legacy_surfaces"]:
            expected_paths.update(surface["path"] for surface in title["surfaces"])
            for key in (
                "retained_runtime_roots",
                "retained_runtime_paths",
                "retained_host_copy_paths",
                "retained_non_owned_roots",
                "retained_non_owned_paths",
            ):
                expected_paths.update(title["assets"].get(key, []))

        records = manifest["retained_path_ownership"]
        by_path = {record["path"]: record for record in records}
        self.assertEqual(set(by_path), expected_paths)
        self.assertEqual(len(records), len(expected_paths))
        for path, record in by_path.items():
            self.assertEqual(record["path"], path)
            self.assertIsInstance(record["owner"], str)
            self.assertTrue(record["owner"].strip(), path)
            self.assertIsInstance(record["reason"], str)
            self.assertTrue(record["reason"].strip(), path)

    def test_caller_guard_rejects_legacy_duplicate_asset_callers(self) -> None:
        """Requires live callers for residuals and no direct callers for duplicate copies."""
        manifest = _load(MANIFEST_PATH)
        for title in manifest["legacy_surfaces"]:
            for surface in title["surfaces"]:
                if surface.get("disposition") == "deleted-after-production-cutover" or surface.get("deleted"):
                    self.assertFalse(_repo_path(surface["path"]).exists(), surface["path"])
                    self.assertEqual(surface.get("callers") or [], [], surface["path"])
                else:
                    self.assertTrue(_repo_path(surface["path"]).exists(), surface["path"])
                    self.assertGreater(len(surface["callers"]), 0, surface["path"])
                    for caller in surface["callers"]:
                        self.assertTrue(_repo_path(caller).exists(), caller)
        for duplicate in EXPECTED_DUPLICATE_ASSETS:
            title, filename = ("dragon-flight", Path(duplicate).name) if "/dragon-flight/" in duplicate else ("dungeon-liberator", Path(duplicate).name)
            for source_root in (REPO_ROOT / "apps/advantage-games/src", REPO_ROOT / "apps/advantage-games/tests"):
                for source in source_root.rglob("*.ts"):
                    self.assertNotIn(f"/games/{title}/{filename}", source.read_text(encoding="utf-8"), str(source))
                for source in source_root.rglob("*.tsx"):
                    self.assertNotIn(f"/games/{title}/{filename}", source.read_text(encoding="utf-8"), str(source))

    def test_task5_inputs_remain_current_while_the_24_title_candidate_stays_historical(self) -> None:
        """Prevents a historical candidate hash from becoming a live production binding."""
        manifest = _load(MANIFEST_PATH)
        acceptance = _load(ACCEPTANCE_PATH)

        def assert_bound_hashes(value: Any) -> None:
            if isinstance(value, dict):
                path = value.get("path")
                digest = value.get("sha256")
                if isinstance(path, str) and isinstance(digest, str):
                    self.assertEqual(_sha256(_repo_path(path)), digest, path)
                for child in value.values():
                    assert_bound_hashes(child)
            elif isinstance(value, list):
                for child in value:
                    assert_bound_hashes(child)

        assert_bound_hashes(acceptance["bound_inputs"])
        self.assertEqual(
            _git_blob_sha256(HISTORICAL_TASK6_REVISION, "packages/game-cartridges/src/catalog.ts"),
            manifest["production_quarantine"]["catalog"]["sha256"],
        )
        self.assertEqual(
            _git_blob_sha256(HISTORICAL_TASK6_REVISION, "packages/game-cartridges/src/index.ts"),
            manifest["production_quarantine"]["root_exports"]["sha256"],
        )

        candidate = _load(SUCCESSOR_CANDIDATE_PATH)
        self.assertEqual(candidate["status"], "acceptance-candidate-non-consumable")
        self.assertEqual(candidate["title_count"], 24)
        self.assertEqual(set(candidate["authorization"].values()), {False})
        self.assertEqual(candidate["base_revision"], "39a9a2b86184a13f8a20253d0adfa7294783cf18")
        self.assertEqual(
            _sha256(SUCCESSOR_CANDIDATE_PATH),
            "4ee52e76eaefc2d752c4d980b28627f7d040f0b5514ab6c6095670fa5a805346",
        )
        live_drift: list[str] = []
        for binding in candidate["bound_current_files"]:
            path = binding["path"]
            digest = binding["sha256"]
            self.assertEqual(len(digest), 64, path)
            if not _repo_path(path).is_file() or _sha256(_repo_path(path)) != digest:
                live_drift.append(path)
        self.assertTrue(live_drift, "the historical 24-title candidate was rebound to live source")
        self.assertEqual(_load(MATRIX_PATH)["authorization"]["legacy_retirement_authorized"], True)


    def test_no_copy_guard_allows_only_qc_and_exact_dragon_materializations(self) -> None:
        """Allows only the catalog-bound Dragon Flight files outside the historical QC root."""
        manifest = _load(MANIFEST_PATH)
        catalog = _load(REPO_ROOT / "packages/advantage-play-kit/assets/standard/standard-pack-release.json")
        selected_keys = {
            semantic_key
            for title in manifest["legacy_surfaces"]
            for union in _load(ACCEPTANCE_PATH)["bound_inputs"]["selected_union_inputs"]["by_title"]
            if title["title_id"] == union["title_id"]
            for semantic_key in union["semantic_keys"]
        }
        canonical_hashes = {
            asset["physical"]["sha256"]
            for asset in catalog["assets"]
            if asset["key"] in selected_keys
        }
        dragon_keys = (
            "audio/native/combat/hit-01",
            "effects/32x32/combat/hit-01",
            "top-down/32x32/characters/hero-01",
        )
        catalog_by_key = dict((asset["key"], asset) for asset in catalog["assets"])
        exact_materialized_paths: set[str] = set()
        for application in ("reading-advantage", "primary-advantage"):
            public_root = f"apps/{application}/public"
            materialization_root = REPO_ROOT / public_root / "assets/apk/standard-pack-2026-07-23"
            materialization = _load(materialization_root / "materialization-manifest.json")
            self.assertEqual(materialization["schemaVersion"], 1)
            self.assertEqual(materialization["version"], catalog["version"])
            self.assertEqual(materialization["catalogDigest"], catalog["digest"])
            self.assertEqual(materialization["sourceReceiptDigest"], catalog["sourceReceiptDigest"])
            self.assertEqual(materialization["requiredCredit"], catalog["requiredCredit"])
            self.assertEqual([item["key"] for item in materialization["files"]], list(dragon_keys))
            for item in materialization["files"]:
                catalog_asset = catalog_by_key[item["key"]]
                self.assertEqual(item["path"], catalog_asset["path"])
                self.assertEqual(item["sha256"], catalog_asset["physical"]["sha256"])
                self.assertEqual(item["byteSize"], catalog_asset["physical"]["byteSize"])
                materialized_path = materialization_root / item["path"]
                self.assertTrue(materialized_path.is_file(), materialized_path)
                self.assertEqual(_sha256(materialized_path), item["sha256"], materialized_path)
                exact_materialized_paths.add(str(materialized_path.relative_to(REPO_ROOT)))

        allowed_qc_root = "apps/advantage-games/public/assets/apk/standard-pack-qc/"
        for public_root in ("apps/advantage-games/public", "apps/reading-advantage/public", "apps/primary-advantage/public"):
            for path in (REPO_ROOT / public_root).rglob("*"):
                if not path.is_file() or path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ogg", ".mp3", ".wav"}:
                    continue
                if _sha256(path) not in canonical_hashes:
                    continue
                relative_path = str(path.relative_to(REPO_ROOT))
                self.assertTrue(
                    relative_path.startswith(allowed_qc_root) or relative_path in exact_materialized_paths,
                    path,
                )


    def test_graph_guard_indexes_every_runtime_caller_and_successor_remains_bounded(self) -> None:
        """Requires graph evidence plus an exact non-consumable successor boundary."""
        manifest = _load(MANIFEST_PATH)
        self.assertIsNotNone(shutil.which("repo-graph"))
        required = sorted({
            *manifest["graph_guard"]["required_indexed_files"],
            *(
                caller
                for title in manifest["legacy_surfaces"]
                for caller in title["exact_legacy_caller_paths"]
                if "/tests/" not in caller and ".test." not in caller
            ),
        })
        for path in required:
            if any(x in path for x in ("student/games/vocabulary/dragon-flight", "student/games/vocabulary/magic-defense")):
                self.assertFalse(_repo_path(path).exists(), path)
                continue
            self.assertTrue(_repo_path(path).is_file(), path)
        absolute_required = [(REPO_ROOT / path).resolve().as_posix() for path in required]
        quoted = ", ".join("'" + path.replace("'", "''") + "'" for path in absolute_required)
        result = subprocess.run(
            ["repo-graph", "query", "--json", "./graph.db", f"SELECT path FROM files WHERE path IN ({quoted})"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        indexed = {Path(row["path"]).resolve().relative_to(REPO_ROOT).as_posix() for row in json.loads(result.stdout)}
        self.assertEqual(indexed, set(required))

        surfaces = {
            surface["path"]: surface
            for title in manifest["legacy_surfaces"]
            for surface in title["surfaces"]
        }
        proofs = manifest["graph_guard"]["surface_edge_proofs"]
        self.assertEqual({proof["surface_path"] for proof in proofs}, set(surfaces))
        for proof in proofs:
            surface = surfaces[proof["surface_path"]]
            self.assertEqual(proof["declared_caller_paths"], surface["callers"])
            self.assertTrue(_graph_scope_paths(proof["surface_path"]))
            edges = _graph_edges_for_surface(surface)
            actual_callers = sorted({
                str(Path(edge["source_file"]).resolve().relative_to(REPO_ROOT))
                for edge in edges
                if Path(edge.get("source_file","")).exists()
            })
            deleted = (
                proof.get("disposition") == "deleted-after-production-cutover"
                or "Deleted after option-1" in (proof.get("reason") or "")
            )
            if deleted:
                self.assertEqual(proof["actual_indexed_caller_files"], [])
                self.assertTrue(proof["no_indexed_callers"])
                self.assertEqual(proof["edge_count"], 0)
                self.assertEqual(proof["edge_types"], [])
            else:
                self.assertEqual(proof["actual_indexed_caller_files"], actual_callers)
                self.assertEqual(proof["edge_count"], len(edges))
                self.assertEqual(proof["edge_types"], sorted({edge["type"] for edge in edges}))
                if actual_callers:
                    self.assertFalse(proof["no_indexed_callers"])
                else:
                    self.assertTrue(proof["no_indexed_callers"])
                    self.assertTrue(proof["reason"].strip())

        # Production catalog stays quarantined: host-proof bindings must not re-enter the root
        # catalog or loaders. The DF scope quarantine owns this boundary; Task 6 must not require
        # the reverse (which previously conflicted with that guard).
        catalog_source = CATALOG_PATH.read_text(encoding="utf-8")
        root_source = ROOT_EXPORT_PATH.read_text(encoding="utf-8")
        self.assertNotIn("APK_HOST_PROOF_BINDINGS", catalog_source)
        self.assertNotIn("loadCartridge", catalog_source)
        self.assertNotIn("24-title host-proof union", root_source)
        self.assertNotIn("24 accepted catalog identities", catalog_source)
        self.assertIn("cartridgeCatalog", catalog_source)
        self.assertIn("cartridgeLoaders", catalog_source)
        self.assertIn("listCartridgeCatalog", catalog_source)
        candidate = _load(SUCCESSOR_CANDIDATE_PATH)
        self.assertEqual(candidate["status"], "acceptance-candidate-non-consumable")
        self.assertEqual(candidate["title_count"], 24)
        self.assertEqual(
            _sha256(SUCCESSOR_CANDIDATE_PATH),
            "4ee52e76eaefc2d752c4d980b28627f7d040f0b5514ab6c6095670fa5a805346",
        )
        self.assertEqual(set(candidate["authorization"].values()), {False})

@lru_cache(maxsize=1)
def run_retirement_guard_suite() -> unittest.TestResult:
    """Runs the complete Task-6 retirement guard suite for predecessor lifecycle gates."""
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(
        ExistingCoreTask6LegacyRetirementTests
    )
    result = unittest.TestResult()
    suite.run(result)
    return result


if __name__ == "__main__":
    unittest.main()
