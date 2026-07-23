"""Fail-closed truth contracts for T5 Traversal Batch B.

The contract selects the exact collector and mapper bytes committed at the
supplied role base. Source, denominator, semantic, fixture, mapping, receipt,
budget, browser-disposition, independent-review, and lifecycle gates are all
machine checked. Missing later-stage artifacts remain explicit failures.

Run from the repository root:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
      measure/tracks/apk_corpus_audit_traversal_exploration_20260712/\
batch-b-truth-tests.py
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unittest
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = Path(__file__).resolve().parent
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
TRACK_ID = "apk_corpus_audit_traversal_exploration_20260712"
PHASE_BASE_SHA = "52e48970bc9c4b585c55b53072ebebe466a1c4f4"
ROLE_BASE_SHA = "3d53d031f48eed2bbb324539900108136190cf57"
SOURCE_BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
HEX40 = re.compile(r"\A[0-9a-f]{40}\Z")
HEX64 = re.compile(r"\A[0-9a-f]{64}\Z")
TRUTH_RECEIPT = RECEIPTS_DIR / "truth-test-author-batch-b.json"

DENOMINATOR_FILES = {
    "source-denominator.json": "records",
    "scene-state-denominator.json": None,
    "asset-file-denominator.json": "candidate_files",
    "historical-source-denominator.json": "records",
    "game-identity-ledger.json": "identity_records",
}

GAME_CONFIG: dict[str, dict[str, Any]] = {
    "shadow-gate-dungeon": {
        "label": "Shadow Gate Dungeon",
        "identity": "sentence/shadow-gate-dungeon",
        "denominator_slug": "shadow-gate-dungeon",
        "ledger": "packages/sentence/shadow-gate-dungeon/claim-evidence-ledger.json",
        "fixtures": "packages/sentence/shadow-gate-dungeon/fixtures.json",
        "report": "packages/sentence/shadow-gate-dungeon/evidence-final-report.json",
        "method": "packages/sentence/shadow-gate-dungeon/evidence-method.md",
        "collector_receipt": "packages/sentence/shadow-gate-dungeon/receipt.json",
        "map": "packages/sentence/shadow-gate-dungeon/requirements-map.json",
        "map_report": "packages/sentence/shadow-gate-dungeon/requirements-final-report.json",
        "mapper_receipt": "role-receipts/requirements-mapper-shadow-gate-dungeon-batch-b.json",
        "browser": "packages/sentence/shadow-gate-dungeon/browser-audit.json",
        "browser_receipt": "role-receipts/browser-auditor-shadow-gate-dungeon-batch-b.json",
    },
    "labyrinth-goblin-king": {
        "label": "Labyrinth of the Goblin King",
        "identity": "sentence/labyrinth-goblin-king",
        "denominator_slug": "labyrinth-goblin-king",
        "ledger": "packages/sentence/labyrinth-goblin-king/claim-evidence-ledger-batch-b.json",
        "fixtures": None,
        "report": "packages/sentence/labyrinth-goblin-king/evidence-final-report-batch-b.json",
        "method": "packages/sentence/labyrinth-goblin-king/evidence-method-batch-b.md",
        "collector_receipt": "role-receipts/evidence-collector-labyrinth-goblin-king-batch-b.json",
        "map": "packages/sentence/labyrinth-goblin-king/requirements-map-batch-b.json",
        "map_report": "packages/sentence/labyrinth-goblin-king/mapper-final-report-batch-b.json",
        "mapper_receipt": "role-receipts/requirements-mapper-labyrinth-goblin-king-batch-b.json",
        "browser": "packages/sentence/labyrinth-goblin-king/browser-audit.json",
        "browser_receipt": "role-receipts/browser-auditor-labyrinth-goblin-king-batch-b.json",
    },
    "griffin-riders-escape": {
        "label": "Griffin Rider's Escape",
        "identity": "catalog/griffin-riders-escape",
        "denominator_slug": "griffin-riders-escape",
        "ledger": "packages/sentence/griffin-riders-escape/claim-evidence-ledger.json",
        "fixtures": "packages/sentence/griffin-riders-escape/fixtures.json",
        "report": "packages/sentence/griffin-riders-escape/evidence-final-report.json",
        "method": "packages/sentence/griffin-riders-escape/evidence-method.md",
        "collector_receipt": "role-receipts/evidence-collector-griffin-riders-escape-batch-b.json",
        "map": "packages/sentence/griffin-riders-escape/requirements-map-batch-b.json",
        "map_report": "packages/sentence/griffin-riders-escape/mapper-final-report-batch-b.json",
        "mapper_receipt": "role-receipts/requirements-mapper-griffin-riders-escape-batch-b.json",
        "browser": "packages/sentence/griffin-riders-escape/browser-audit.json",
        "browser_receipt": "role-receipts/browser-auditor-griffin-riders-escape-batch-b.json",
    },
}

SEMANTIC_ANCHORS: dict[str, tuple[str, ...]] = {
    "SGD-STATE-001": ("useState<ShadowGateDungeonState | null>(null)", "useState<'start' | 'playing' | 'ended'>('start')", "hasReportedRef"),
    "SGD-STATE-002": ("createShadowGateDungeonState", "setResults(null)", "hasReportedRef.current = false"),
    "SGD-WORLD-001": ("GAME_WIDTH = 390", "GAME_HEIGHT = 700", "gateWidth: 100", "gateHeight: 60", "playerSpeed: 200", "playerRadius: 12", "initialHealth: 100"),
    "SGD-STEALTH-001": ("creaturePatrolSpeeds", "creatureSpeeds", "creatureRadius: 14", "sightRadius: 75", "chaseDuration: 1500", "patrolRadius: 70", "patrolCenterX: 195", "patrolCenterY: 350", "creatureCollisionDamage: 25", "wrongWordDamage: 20"),
    "SGD-INPUT-001": ("keydown", "keyup", "ArrowUp", "keys.has('w')", "handleDPadInput({ dx, dy })"),
    "SGD-INPUT-002": ("handleDPadInput", "prevState.status !== 'playing'", "setPlayerVelocity"),
    "SGD-MOVE-001": ("newState.gameTime += deltaMs", "SHADOW_GATE_DUNGEON_CONFIG.playerRadius", "Math.min", "invincibilityTimer"),
    "SGD-STEALTH-002": ("distToPlayer < SHADOW_GATE_DUNGEON_CONFIG.sightRadius", "creatureMode = 'chase'", "chaseTimer"),
    "SGD-STEALTH-003": ("patrolCenterX", "Math.cos(newPatrolAngle)", "Math.sin(newPatrolAngle)", "newVelocity"),
    "SGD-COLL-001": ("playerRadius + SHADOW_GATE_DUNGEON_CONFIG.creatureRadius", "creatureCollisionDamage", "invincibilityDuration"),
    "SGD-PROG-001": ("crystal.word === targetWord", "newState.targetIndex = state.targetIndex + 1", "newState.wrongAnswers = state.wrongAnswers + 1", "wrongWordDamage"),
    "SGD-TRANS-001": ("newState.gate.unlocked", "gateCenterX", "newState.status = 'victory'"),
    "SGD-TRANS-002": ("newState.status = 'defeat'", "newState.player.health <= 0"),
    "SGD-RESP-001": ("dimensions.width / GAME_WIDTH", "dimensions.height / GAME_HEIGHT", "Math.min"),
    "SGD-RESULT-001": ("status === 'victory'", "setGamePhase('ended')", "hasReportedRef.current", "onComplete"),
    "SGD-ROUTE-001": ("setSentences", "shadow-gate-dungeon/sentences", "locale"),
    "SGD-ROUTE-002": ("shadow-gate-dungeon/complete", 'method: "POST"', "xpEarned", "totalAttempts"),
    "SGD-API-001": ("createSentencesRoute", "SAMPLE_SENTENCES", "force-static", "export { GET }"),
    "LGK-STATE-001": ("'start' | 'playing' | 'victory' | 'defeat'",),
    "LGK-MAZE-001": ("mazeCols: 11", "mazeRows: 15", "x % 2 === 0", "maze[1][0]", "maze[rows - 2][cols - 1]"),
    "LGK-INIT-001": ("Sentences cannot be empty", "config.difficulty ?? 'normal'", "config.goblinType ?? 'scout'", "status: 'start'", "direction: 'right'"),
    "LGK-CONFIG-001": ("GAME_WIDTH = 390", "GAME_HEIGHT = 700", "tileSize: 32", "playerSpeed: 3", "heroicAuraDuration: 6000", "chaseRange: 100"),
    "LGK-MOVE-001": ("desiredDirection", "tileSize * 0.45", "canMove", "state.player.direction"),
    "LGK-COLL-001": ("function canMove", "isWall", "size"),
    "LGK-ORB-001": ("justCollectedOrb.orderIndex === state.targetIndex", "correctAnswers", "collectedWords", "targetIndex"),
    "LGK-TRANS-001": ("newState.player.heroicAura = true", "fleeing: true", "newState.sentenceIndex", "newState.collectedWords = []", "newState.targetIndex = 0"),
    "LGK-TRANS-002": ("wrongAnswers", "lives", "invulnerabilityDuration", "availablePositions"),
    "LGK-GOBLIN-001": ("moveGoblinTileBased", "chaseRange", "nonReverse", "newState.player.heroicAura", "newState.player.lives"),
    "LGK-ROUTE-001": ("labyrinth-goblin-king/sentences", "locale", "labyrinth-goblin-king/complete", 'method: "POST"'),
    "LGK-RESP-001": ("dimensions.width / GAME_WIDTH", "dimensions.height / GAME_HEIGHT", "Math.min"),
    "GRF-WORLD-001": ("GAME_WIDTH = 390", "GAME_HEIGHT = 844", "horizonY: 200", "playerY: 700", "laneX", "baseSpeed: 0.005", "spawnInterval: 2000"),
    "GRF-STATE-001": ("'playing' | 'victory' | 'defeat'", "lives", "targetIndex", "spawnTimer", "playerLane"),
    "GRF-START-001": ("Vocabulary cannot be empty", "currentSentence.term.split(' ')", "initialLives", "objects: []", "playerLane: 'center'"),
    "GRF-MOVE-001": ("switchLane", "state.status !== 'playing'", "direction === 'left'", "playerLane: lanes[nextIndex]"),
    "GRF-WAVE-001": ("spawnWave", "type: 'obstacle'", "type: 'gate'", "z: 100", "correctLane"),
    "GRF-COLL-001": ("z: obj.z - speed * deltaMs", "obj.z <= 5", "obj.z >= -5", "obj.lane === state.playerLane"),
    "GRF-TRANS-001": ("obj.type === 'obstacle'", "newState.lives -= 1", "newState.correctAnswers += 1", "newState.collectedWords.push", "newState.status = 'victory'"),
    "GRF-RESP-001": ("GAME_WIDTH", "GAME_HEIGHT", "horizonY", "getProjectedX", "<Stage"),
    "GRF-INPUT-001": ("gamePhase !== 'playing'", "input.dx", "switchLane"),
    "GRF-ROUTE-001": ("griffin-riders-escape/sentences", "griffin-riders-escape/complete", "accuracy", "xp", "userId: session?.user?.id"),
    "GRF-CART-001": ('"world.background"', '"player.hero"', '"target.correct"', '"lane.marker"', '"effect.wind"'),
    "GRF-CART-002": ("ArrowLeft", "KeyA", "ArrowRight", "KeyD", "threshold: 55"),
    "GRF-CART-003": ("width: 960", "height: 540", "preloadSemanticAssets"),
    "GRF-CART-004": ("options.edition.tuning.speed", "resolveTraversalActions", "render()", "deliverComplete"),
}


def sha256(data: bytes) -> str:
    """Returns a lowercase SHA-256 digest for exact bytes."""
    return hashlib.sha256(data).hexdigest()


def file_hash(path: Path) -> str:
    """Returns the SHA-256 digest of one local file."""
    return sha256(path.read_bytes())


def load_json(path: Path) -> dict[str, Any]:
    """Loads one required UTF-8 JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected JSON object")
    return value


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one read-only Git command at the repository root."""
    return subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, check=False)


def git_show(revision: str, relative: str) -> bytes | None:
    """Returns exact repository bytes only when the object exists."""
    if git("cat-file", "-e", f"{revision}:{relative}").returncode != 0:
        return None
    result = git("show", f"{revision}:{relative}")
    return result.stdout if result.returncode == 0 else None


def is_ancestor(ancestor: str, descendant: str) -> bool:
    """Returns whether one revision is an ancestor of another."""
    return git("merge-base", "--is-ancestor", ancestor, descendant).returncode == 0


def track_path(relative: str) -> Path:
    """Resolves one track-relative artifact path."""
    return TRACK_DIR / relative


def repo_relative(path: Path) -> str:
    """Returns a repository-relative POSIX path."""
    return str(path.resolve().relative_to(REPO_ROOT))


def nested_strings(value: Any) -> Iterable[str]:
    """Yields every recursively nested string."""
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from nested_strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from nested_strings(child)


def values_for_key(value: Any, key: str) -> list[Any]:
    """Returns every recursively nested value for one key."""
    found: list[Any] = []
    if isinstance(value, dict):
        for candidate, child in value.items():
            if candidate == key:
                found.append(child)
            found.extend(values_for_key(child, key))
    elif isinstance(value, list):
        for child in value:
            found.extend(values_for_key(child, key))
    return found


def claim_records(game: str) -> list[dict[str, Any]]:
    """Returns all factual collector claims for one game."""
    document = load_json(track_path(GAME_CONFIG[game]["ledger"]))
    records = document.get("claims", document.get("claim_atoms"))
    if not isinstance(records, list):
        raise AssertionError(f"{game}: missing claim records")
    return records


def fixture_records(game: str) -> list[dict[str, Any]]:
    """Returns all negative fixtures for one game."""
    config = GAME_CONFIG[game]
    path = config["fixtures"]
    document = load_json(track_path(path or config["ledger"]))
    records = document.get("fixtures", document.get("negative_fixtures"))
    if not isinstance(records, list):
        raise AssertionError(f"{game}: missing fixture records")
    return records


def claim_id(record: dict[str, Any]) -> str:
    """Returns one factual-claim or fixture identifier."""
    return str(record.get("claim_id", record.get("fixture_id", "")))


def citation(record: dict[str, Any]) -> dict[str, Any]:
    """Normalizes the nested and flat Batch B citation shapes."""
    nested = record.get("citation")
    if isinstance(nested, dict):
        return nested
    line_range = record.get("inclusive_range", {})
    return {
        "path": record.get("relative_path"),
        "line_start": line_range.get("start_line"),
        "line_end": line_range.get("end_line"),
        "blob_sha256": record.get("blob_sha256"),
        "cited_range_sha256": record.get("cited_range_sha256"),
        "revision": record.get("source_revision"),
    }


def cited_bytes(record: dict[str, Any]) -> bytes | None:
    """Returns one claim's exact inclusive source range when resolvable."""
    envelope = citation(record)
    source = git_show(str(envelope.get("revision")), str(envelope.get("path")))
    start, end = envelope.get("line_start"), envelope.get("line_end")
    if source is None or not isinstance(start, int) or not isinstance(end, int):
        return None
    lines = source.splitlines(keepends=True)
    if not 1 <= start <= end <= len(lines):
        return None
    return b"".join(lines[start - 1 : end])


def citation_errors(record: dict[str, Any]) -> list[str]:
    """Returns path, revision, SHA-256, and inclusive-range defects."""
    identifier = claim_id(record) or "<missing>"
    envelope = citation(record)
    relative = envelope.get("path")
    revision = envelope.get("revision")
    defects: list[str] = []
    if not isinstance(relative, str) or not relative:
        return [f"{identifier}:path"]
    if Path(relative).is_absolute() or ".." in Path(relative).parts:
        defects.append(f"{identifier}:unbounded-path")
    if not isinstance(revision, str) or not HEX40.fullmatch(revision):
        return defects + [f"{identifier}:revision-shape"]
    source = git_show(revision, relative)
    if source is None:
        return defects + [f"{identifier}:unreachable"]
    blob_hash = envelope.get("blob_sha256")
    if not isinstance(blob_hash, str) or not HEX64.fullmatch(blob_hash):
        defects.append(f"{identifier}:blob-sha256-shape")
    elif sha256(source) != blob_hash:
        defects.append(f"{identifier}:blob-sha256")
    selected = cited_bytes(record)
    range_hash = envelope.get("cited_range_sha256")
    if selected is None:
        defects.append(f"{identifier}:line-range")
    elif not isinstance(range_hash, str) or not HEX64.fullmatch(range_hash):
        defects.append(f"{identifier}:range-sha256-shape")
    elif sha256(selected) != range_hash:
        defects.append(f"{identifier}:range-sha256")
    evidence_class = record.get("source_class", record.get("evidence_class"))
    if evidence_class in {"current", "current-source", "current_implementation"} and revision != SOURCE_BASELINE:
        defects.append(f"{identifier}:current-revision={revision}")
    if evidence_class in {"history", "historical", "historical_implementation"}:
        if revision == SOURCE_BASELINE or not is_ancestor(revision, SOURCE_BASELINE):
            defects.append(f"{identifier}:historical-chronology")
    return defects


def active_input_paths() -> set[str]:
    """Returns the exact committed process, denominator, collector, and mapper inputs."""
    paths = {
        "measure/product-owner-apk-provenance-direction-20260721.json",
        f"measure/tracks/{TRACK_ID}/product-owner-budget-accounting-direction-v2.json",
        f"measure/tracks/{TRACK_ID}/accepted-cohort-manifest-batch-a-v6.json",
        f"measure/tracks/{TRACK_ID}/test-strategy-phase0.md",
        f"measure/tracks/{TRACK_ID}/phase0-budget-declaration.json",
        f"measure/tracks/{TRACK_ID}/phase0-role-applicability.json",
        f"measure/tracks/{TRACK_ID}/phase0-discovery-audit.json",
        "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
        "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
        "measure/archive/apk_source_denominator_inventory_20260712/source-denominator.json",
        "measure/archive/apk_source_denominator_inventory_20260712/scene-state-denominator.json",
        "measure/archive/apk_source_denominator_inventory_20260712/asset-file-denominator.json",
        "measure/archive/apk_source_denominator_inventory_20260712/historical-source-denominator.json",
        "measure/archive/apk_source_denominator_inventory_20260712/game-identity-ledger.json",
        "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
    }
    for config in GAME_CONFIG.values():
        paths.update(
            f"measure/tracks/{TRACK_ID}/{config[key]}"
            for key in ("ledger", "report", "method", "collector_receipt", "map", "map_report", "mapper_receipt")
        )
        if config["fixtures"]:
            paths.add(f"measure/tracks/{TRACK_ID}/{config['fixtures']}")
    return paths


def selected_denominator_rows(slug: str) -> dict[str, list[str]]:
    """Returns canonical row digests for every accepted denominator authority."""
    base = REPO_ROOT / "measure/archive/apk_source_denominator_inventory_20260712"
    selected: dict[str, list[str]] = {}
    for filename, list_key in DENOMINATOR_FILES.items():
        document = load_json(base / filename)
        rows: list[Any] = []
        if list_key is not None:
            rows = document[list_key]
        else:
            for key in ("scene_records", "state_records", "transitions"):
                rows.extend(document[key])
        matched = [
            sha256(json.dumps(row, sort_keys=True, separators=(",", ":")).encode())
            for row in rows
            if slug in json.dumps(row, sort_keys=True).lower()
        ]
        selected[filename] = sorted(matched)
    return selected


class BatchBFreezeContract(unittest.TestCase):
    """Exact role-base, active-input, predecessor, and scope contracts."""

    def test_exact_batch_scope_predecessors_and_committed_inputs(self) -> None:
        """Fails when the three-game scope or any selected input byte drifts."""
        self.assertRegex(ROLE_BASE_SHA, HEX40)
        self.assertTrue(is_ancestor(PHASE_BASE_SHA, ROLE_BASE_SHA))
        self.assertEqual(
            tuple(config["label"] for config in GAME_CONFIG.values()),
            ("Shadow Gate Dungeon", "Labyrinth of the Goblin King", "Griffin Rider's Escape"),
        )
        receipt = load_json(TRUTH_RECEIPT)
        bound = receipt.get("input_hashes", {})
        self.assertEqual(set(bound), active_input_paths())
        defects: list[str] = []
        for relative in sorted(active_input_paths()):
            path = REPO_ROOT / relative
            if not path.is_file() or bound.get(relative) != file_hash(path):
                defects.append(f"{relative}:hash")
            elif git_show(ROLE_BASE_SHA, relative) != path.read_bytes():
                defects.append(f"{relative}:role-base")
        self.assertEqual(defects, [], f"active input drift: {defects}")

    def test_accepted_predecessors_and_partition_are_exact(self) -> None:
        """Fails when an accepted predecessor is revoked or Batch B leaves T5."""
        for relative in (
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
            "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
            f"measure/tracks/{TRACK_ID}/accepted-cohort-manifest-batch-a-v6.json",
        ):
            document = load_json(REPO_ROOT / relative)
            self.assertTrue(document.get("consumable"), relative)
            self.assertIsNot(document.get("revoked"), True, relative)
        partition = load_json(
            REPO_ROOT / "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json"
        )
        labels = tuple(
            row["canonical_identity_label"]
            for row in partition["assignments"]
            if row["cohort"] == "Traversal and exploration"
        )
        self.assertEqual(labels[3:6], tuple(config["label"] for config in GAME_CONFIG.values()))


class BatchBDenominatorContract(unittest.TestCase):
    """Accepted identity and every-item denominator reconciliation contracts."""

    def test_identity_and_every_assigned_denominator_row_are_reconciled_once(self) -> None:
        """Fails when identity drifts or exact accepted denominator rows are absent/duplicated."""
        identities = load_json(
            REPO_ROOT / "measure/archive/apk_source_denominator_inventory_20260712/game-identity-ledger.json"
        )["identity_records"]
        accepted = {
            row["canonical_identity_id"]: row
            for row in identities
            if row["canonical_identity_id"] in {config["identity"] for config in GAME_CONFIG.values()}
        }
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            if config["identity"] not in accepted:
                defects.append(f"{game}:accepted-identity")
            ledger = load_json(track_path(config["ledger"]))
            declared_identity = ledger.get(
                "normalized_game_id",
                ledger.get("canonical_identity_id", ledger.get("canonical_identity")),
            )
            if declared_identity != config["identity"]:
                defects.append(f"{game}:identity={declared_identity}")
            reconciliation = ledger.get("accepted_denominator_reconciliation", {})
            actual = reconciliation.get("authority_record_sha256s")
            expected = selected_denominator_rows(config["denominator_slug"])
            if actual != expected:
                defects.append(f"{game}:exact-denominator-rows")
        self.assertEqual(defects, [], "DENOMINATOR_RED: " + ", ".join(defects))


class BatchBSourceTruthContract(unittest.TestCase):
    """All-claim source-envelope, chronology, and independent semantic gates."""

    def test_claim_denominators_ids_and_required_metadata_are_exact(self) -> None:
        """Fails when any factual claim is omitted, duplicated, or lacks metadata."""
        expected = {"shadow-gate-dungeon": 18, "labyrinth-goblin-king": 12, "griffin-riders-escape": 14}
        identifiers: list[str] = []
        defects: list[str] = []
        for game, count in expected.items():
            records = claim_records(game)
            ids = [claim_id(record) for record in records]
            identifiers.extend(ids)
            if len(records) != count or len(ids) != len(set(ids)) or any(not item for item in ids):
                defects.append(f"{game}:claim-denominator")
            for record in records:
                if not record.get("source_fact") or not record.get("interpretation"):
                    defects.append(f"{claim_id(record)}:fact-or-interpretation")
                if record.get("confidence") not in {"high", "medium", "low"}:
                    defects.append(f"{claim_id(record)}:confidence")
                if not record.get("conflict_state"):
                    defects.append(f"{claim_id(record)}:conflict-state")
        if len(identifiers) != len(set(identifiers)):
            defects.append("cross-game-id-collision")
        if set(identifiers) != set(SEMANTIC_ANCHORS):
            defects.append("semantic-probe-denominator")
        self.assertEqual(defects, [])

    def test_every_claim_has_an_exact_sha256_source_envelope_and_temporal_class(self) -> None:
        """Fails on stale, SHA-1-shaped, unreachable, or temporally promoted evidence."""
        defects = [
            defect
            for game in GAME_CONFIG
            for record in claim_records(game)
            for defect in citation_errors(record)
        ]
        self.assertEqual(defects, [], "SOURCE_RED: " + ", ".join(defects))

    def test_every_claim_survives_a_manual_semantic_probe(self) -> None:
        """Fails when exact cited bytes do not contain the anchors needed by a claim."""
        defects: list[str] = []
        for game in GAME_CONFIG:
            for record in claim_records(game):
                selected = cited_bytes(record)
                if selected is None:
                    defects.append(f"{claim_id(record)}:unresolvable")
                    continue
                text = selected.decode("utf-8", errors="replace")
                missing = [token for token in SEMANTIC_ANCHORS[claim_id(record)] if token not in text]
                if missing:
                    defects.append(f"{claim_id(record)}:{missing}")
        self.assertEqual(defects, [], "SEMANTIC_RED: " + ", ".join(defects))


class BatchBFixtureContract(unittest.TestCase):
    """Unique, non-factual, independently rejected negative-fixture contracts."""

    def test_all_ten_fixtures_are_unique_explicit_rejections(self) -> None:
        """Fails when a fixture becomes positive evidence or loses its reason/disposition."""
        records = [record for game in GAME_CONFIG for record in fixture_records(game)]
        identifiers = [claim_id(record) for record in records]
        defects: list[str] = []
        for record in records:
            if str(record.get("expected_disposition", "")).upper() != "REJECT":
                defects.append(f"{claim_id(record)}:disposition")
            if not record.get("reason"):
                defects.append(f"{claim_id(record)}:reason")
            if record.get("counts_as_claim") is True:
                defects.append(f"{claim_id(record)}:factual")
            if any(citation(record).values()):
                defects.append(f"{claim_id(record)}:positive-citation")
        self.assertEqual(len(records), 10)
        self.assertEqual(len(identifiers), len(set(identifiers)))
        self.assertEqual(defects, [])


class BatchBMappingContract(unittest.TestCase):
    """Complete claim/fixture coverage, exact input binding, and no-new-fact gates."""

    def test_maps_cover_all_claims_and_fixtures_without_foreign_ids(self) -> None:
        """Fails when a map omits or invents a factual or fixture identifier."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["map"]))
            factual = {claim_id(record) for record in claim_records(game)}
            fixtures = {claim_id(record) for record in fixture_records(game)}
            model_refs = {
                item
                for value in values_for_key(document, "claim_ids")
                for item in (value if isinstance(value, list) else [value])
                if isinstance(item, str)
            }
            mapped_fixtures = {
                str(row.get("claim_id", row.get("fixture_id", "")))
                for row in document.get("negative_fixtures", [])
            }
            if model_refs - factual:
                defects.append(f"{game}:foreign={sorted(model_refs - factual)}")
            if factual - model_refs:
                defects.append(f"{game}:unmapped={sorted(factual - model_refs)}")
            if mapped_fixtures != fixtures:
                defects.append(f"{game}:fixtures")
            if any(row.get("disposition") != "REJECT" for row in document.get("negative_fixtures", [])):
                defects.append(f"{game}:fixture-disposition")
        self.assertEqual(defects, [], "MAP_ID_RED: " + ", ".join(defects))

    def test_maps_bind_the_complete_collector_package_and_add_no_unbacked_fact(self) -> None:
        """Fails when exact collector bytes are unbound or maps add source/browser facts."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["map"]))
            hashes = {value for value in nested_strings(document) if HEX64.fullmatch(value)}
            for key in ("ledger", "report", "method", "collector_receipt"):
                expected = file_hash(track_path(config[key]))
                if expected not in hashes:
                    defects.append(f"{game}:{key}-hash")
            if config["fixtures"] and file_hash(track_path(config["fixtures"])) not in hashes:
                defects.append(f"{game}:fixtures-hash")
            forbidden_keys = {"source_fact", "citation", "cited_range_sha256", "blob_sha256"}
            if forbidden_keys & set(_walk_keys(document)):
                defects.append(f"{game}:novel-source-envelope")
            if document.get("acceptance") != "not-claimed":
                defects.append(f"{game}:acceptance")
            if document.get("counts", {}).get("browser_claims", 0) != 0:
                defects.append(f"{game}:browser-claim")
        self.assertEqual(defects, [], "MAP_BINDING_RED: " + ", ".join(defects))


def _walk_keys(value: Any) -> list[str]:
    """Returns every recursively nested dictionary key."""
    keys: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            keys.append(key)
            keys.extend(_walk_keys(child))
    elif isinstance(value, list):
        for child in value:
            keys.extend(_walk_keys(child))
    return keys


class BatchBReceiptAndBudgetContract(unittest.TestCase):
    """Exact output, provider-disclosure, and frozen numeric-budget contracts."""

    def test_collector_and_mapper_receipts_bind_exact_outputs(self) -> None:
        """Fails when role receipts omit exact outputs or fabricate provider evidence."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            for receipt_key, output_keys in (
                ("collector_receipt", ("ledger", "report", "method", "fixtures")),
                ("mapper_receipt", ("map", "map_report")),
            ):
                receipt = load_json(track_path(config[receipt_key]))
                text = json.dumps(receipt, sort_keys=True).lower()
                hashes = {value for value in nested_strings(receipt) if HEX64.fullmatch(value)}
                if "unavailable" not in text or '"provider_attested": true' in text:
                    defects.append(f"{game}:{receipt_key}:provider")
                for key in output_keys:
                    if key == "fixtures" and not config["fixtures"]:
                        continue
                    if file_hash(track_path(config[key])) not in hashes:
                        defects.append(f"{game}:{receipt_key}:{key}")
        self.assertEqual(defects, [], "RECEIPT_RED: " + ", ".join(defects))

    def test_numeric_actuals_are_integer_and_within_frozen_ceilings(self) -> None:
        """Fails when role actuals are missing, non-integer, negative, or over ceiling."""
        budget = load_json(TRACK_DIR / "phase0-budget-declaration.json")["ceilings"]["per_game_roles"]
        role_limits = {
            "collector_receipt": budget["evidence_collector_one_game"],
            "mapper_receipt": budget["requirements_mapper_one_game"],
        }
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            for receipt_key, limits in role_limits.items():
                receipt = load_json(track_path(config[receipt_key]))
                actual = receipt.get("actual_usage", receipt.get("budget_actual"))
                if not isinstance(actual, dict):
                    defects.append(f"{game}:{receipt_key}:actuals")
                    continue
                for unit, ceiling in limits.items():
                    value = actual.get(unit)
                    if type(value) is not int or not 0 <= value <= ceiling:
                        defects.append(f"{game}:{receipt_key}:{unit}={value!r}")
                if receipt_key == "mapper_receipt":
                    minimum_bytes = sum(
                        track_path(config[key]).stat().st_size for key in ("ledger", "report", "method")
                    )
                    if actual.get("source_bytes", -1) < minimum_bytes:
                        defects.append(f"{game}:{receipt_key}:source-bytes-under-count")
        self.assertEqual(defects, [], "BUDGET_RED: " + ", ".join(defects))

    def test_timing_direction_explicitly_authorizes_batch_b(self) -> None:
        """Fails while the only elapsed-minute fallback direction is scoped to Batch A."""
        direction = load_json(TRACK_DIR / "product-owner-budget-accounting-direction-v2.json")
        scope = f"{direction.get('batch_id', '')} {direction.get('scope', '')}".lower()
        self.assertIn("batch-b", scope, "TIMING_DIRECTION_RED: Batch B is outside the direction's scope")

    def test_truth_receipt_binds_scope_inputs_output_and_budget(self) -> None:
        """Fails when this role widens scope, claims provenance, or loses exact hashes."""
        receipt = load_json(TRUTH_RECEIPT)
        self.assertEqual(receipt.get("role"), "truth-test-author")
        self.assertEqual(receipt.get("acceptance"), "not-claimed")
        self.assertEqual(receipt.get("role_base_sha"), ROLE_BASE_SHA)
        self.assertEqual(set(receipt.get("input_hashes", {})), active_input_paths())
        provider = receipt.get("provider_provenance", {})
        self.assertTrue(provider.get("unavailable_note"))
        self.assertFalse(
            any(value is not None for key, value in provider.items() if key != "unavailable_note")
        )
        output = receipt.get("output_hashes", {}).get(repo_relative(Path(__file__)))
        self.assertEqual(output, file_hash(Path(__file__)))
        limits = load_json(TRACK_DIR / "phase0-budget-declaration.json")["ceilings"]["batch_roles"][
            "truth_test_author_all_seven"
        ]
        actual = receipt.get("actual_usage", {})
        for unit, ceiling in limits.items():
            self.assertIs(type(actual.get(unit)), int, unit)
            self.assertLessEqual(actual[unit], ceiling, unit)


class BatchBBrowserDispositionContract(unittest.TestCase):
    """Per-game reviewed runnable/non-runnable browser disposition contracts."""

    def test_each_game_has_a_fail_closed_browser_disposition_input_and_receipt(self) -> None:
        """Fails until all games have bounded dispositions without screenshot promotion."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            audit_path = track_path(config["browser"])
            receipt_path = track_path(config["browser_receipt"])
            if not audit_path.is_file():
                defects.append(f"{game}:missing-browser-disposition")
                continue
            if not receipt_path.is_file():
                defects.append(f"{game}:missing-browser-receipt")
                continue
            audit = load_json(audit_path)
            text = " ".join(nested_strings(audit)).lower()
            if not any(token in text for token in ("runnable", "non-runnable", "blocked", "unknown")):
                defects.append(f"{game}:disposition")
            if audit.get("screenshots_alone_pass") is True:
                defects.append(f"{game}:screenshot-promotion")
            if "runnable" in text and "non-runnable" not in text:
                if not all(token in text for token in ("compact", "wide", "trusted")):
                    defects.append(f"{game}:runnable-proof")
            receipt = load_json(receipt_path)
            if file_hash(audit_path) not in set(nested_strings(receipt)):
                defects.append(f"{game}:receipt-hash")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[BROWSER]: " + ", ".join(defects))


class BatchBIndependentReviewContract(unittest.TestCase):
    """Fresh exact-input review and zero-blocker contracts."""

    def test_review_binds_truth_browser_and_every_active_input(self) -> None:
        """Fails until an independent review covers exact final Batch B bytes."""
        review_path = TRACK_DIR / "batch-b-independent-review.json"
        receipt_path = RECEIPTS_DIR / "adversarial-reviewer-batch-b.json"
        defects: list[str] = []
        if not review_path.is_file():
            defects.append("missing-review")
        if not receipt_path.is_file():
            defects.append("missing-review-receipt")
        if not defects:
            review = load_json(review_path)
            receipt = load_json(receipt_path)
            required = dict(load_json(TRUTH_RECEIPT)["input_hashes"])
            required[repo_relative(Path(__file__))] = file_hash(Path(__file__))
            required[repo_relative(TRUTH_RECEIPT)] = file_hash(TRUTH_RECEIPT)
            for config in GAME_CONFIG.values():
                required[repo_relative(track_path(config["browser"]))] = file_hash(track_path(config["browser"]))
                required[repo_relative(track_path(config["browser_receipt"]))] = file_hash(
                    track_path(config["browser_receipt"])
                )
            if receipt.get("input_hashes") != required:
                defects.append("input-binding")
            unresolved = review.get("unresolved_findings", {})
            if any(unresolved.get(level) != 0 for level in ("critical", "high", "medium")):
                defects.append("blockers")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[REVIEW]: " + ", ".join(defects))


class BatchBLifecycleContract(unittest.TestCase):
    """Ordered candidate, owner-approval, and accepted-manifest contracts."""

    def test_candidate_is_non_consumable_and_exactly_bound(self) -> None:
        """Fails until a post-review non-consumable Batch B candidate exists."""
        path = TRACK_DIR / "candidate-cohort-manifest-batch-b.json"
        self.assertTrue(path.is_file(), "EXPECTED_STAGE_RED[CANDIDATE]: missing candidate")
        candidate = load_json(path)
        self.assertFalse(candidate.get("consumable"))
        self.assertEqual(candidate.get("truth_test_sha256"), file_hash(Path(__file__)))

    def test_owner_approval_is_post_candidate_and_exactly_bound(self) -> None:
        """Fails until an authentic exact-candidate product-owner event exists."""
        candidate_path = TRACK_DIR / "candidate-cohort-manifest-batch-b.json"
        path = TRACK_DIR / "product-owner-acceptance-batch-b.json"
        self.assertTrue(path.is_file(), "EXPECTED_STAGE_RED[APPROVAL]: missing owner approval")
        approval = load_json(path)
        self.assertEqual(approval.get("candidate_manifest_sha256"), file_hash(candidate_path))
        self.assertTrue(approval.get("event_id"))
        self.assertTrue(approval.get("approval_message_sha256"))
        self.assertIs(approval.get("revoked"), False)

    def test_accepted_manifest_is_separate_consumable_and_exactly_bound(self) -> None:
        """Fails until a separate accepted manifest binds candidate and approval."""
        candidate_path = TRACK_DIR / "candidate-cohort-manifest-batch-b.json"
        approval_path = TRACK_DIR / "product-owner-acceptance-batch-b.json"
        path = TRACK_DIR / "accepted-cohort-manifest-batch-b.json"
        self.assertTrue(path.is_file(), "EXPECTED_STAGE_RED[ACCEPTED]: missing accepted manifest")
        accepted = load_json(path)
        self.assertEqual(accepted.get("status"), "accepted")
        self.assertTrue(accepted.get("consumable"))
        self.assertIs(accepted.get("revoked"), False)
        self.assertEqual(accepted.get("candidate_manifest_sha256"), file_hash(candidate_path))
        self.assertEqual(accepted.get("owner_acceptance_sha256"), file_hash(approval_path))


if __name__ == "__main__":
    unittest.main()
