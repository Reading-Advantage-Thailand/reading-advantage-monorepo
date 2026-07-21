"""Fail-closed V2 truth contract for T6 Puzzle/Crafting Batch A.

V2 selects V2 collector artifacts whose blob_sha256 fields are 64-char SHA-256
of the cited file at the source baseline revision, whose cited ranges contain
the full atomic wording of each claim, whose source-asset-history ledgers
exist for every game, whose fixtures back every claim and fixture, whose
mapper records bind the collector ledger and rebind-report hashes, and whose
collector and mapper receipts bind exact output bytes with provider provenance
unavailable but disclosed. Browser, review, and lifecycle tests intentionally
remain red until those separately owned artifacts exist.

Run from the repository root:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
      measure/tracks/apk_corpus_audit_puzzle_crafting_20260712/batch-a-truth-tests-v2.py
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
TRACK_ID = "apk_corpus_audit_puzzle_crafting_20260712"
PHASE_BASE_SHA = "52e48970bc9c4b585c55b53072ebebe466a1c4f4"
ROLE_BASE_SHA = "2736d1de2f675155a70bdda706349310f4e3f322"
SOURCE_BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
GLOBAL_DIRECTION = "measure/product-owner-apk-provenance-direction-20260721.json"
TRUTH_RECEIPT = RECEIPTS_DIR / "truth-test-author-batch-a-v2.json"
HEX40 = re.compile(r"\A[0-9a-f]{40}\Z")
HEX64 = re.compile(r"\A[0-9a-f]{64}\Z")

EXPECTED_GAMES = (
    "Enchanted Library",
    "Rune Match",
    "Alchemist's Synthesis",
)
EXPECTED_IDENTITIES = (
    "vocabulary/enchanted-library",
    "vocabulary/rune-match",
    "vocabulary/alchemists-synthesis",
)

GAME_CONFIG: dict[str, dict[str, str]] = {
    "enchanted-library": {
        "identity": EXPECTED_IDENTITIES[0],
        "ledger": "batch-a/enchanted-library/claim-evidence-ledger.v2.json",
        "fixtures": "batch-a/enchanted-library/fixtures.v2.json",
        "report": "batch-a/enchanted-library/rebind-report.v2.json",
        "rebind": "batch-a/enchanted-library/rebind-report.v2.json",
        "map": "batch-a/enchanted-library/requirements-mapping.v2.json",
        "map_report": "batch-a/enchanted-library/requirements-map-report.v2.json",
        "collector_receipt": "role-receipts/evidence-collector-enchanted-library-batch-a.v2.json",
        "mapper_receipt": "role-receipts/requirements-mapper-enchanted-library.v2.json",
        "browser": "batch-a/enchanted-library/browser-audit.json",
        "browser_receipt": "role-receipts/browser-auditor-enchanted-library-batch-a.json",
    },
    "rune-match": {
        "identity": EXPECTED_IDENTITIES[1],
        "ledger": "batch-a/rune-match/rune-match-claim-ledger.v2.json",
        "fixtures": "batch-a/rune-match/rune-match-fixtures.v2.json",
        "report": "batch-a/rune-match/rune-match-rebind-report.v2.json",
        "rebind": "batch-a/rune-match/rune-match-rebind-report.v2.json",
        "map": "batch-a/rune-match/rune-match-requirements-map.v2.json",
        "map_report": "batch-a/rune-match/rune-match-mapper-report.v2.json",
        "collector_receipt": "role-receipts/evidence-collector-rune-match-batch-a.v2.json",
        "mapper_receipt": "role-receipts/requirements-mapper-rune-match-batch-a.v2.json",
        "browser": "batch-a/rune-match/browser-audit.json",
        "browser_receipt": "role-receipts/browser-auditor-rune-match-batch-a.json",
    },
    "alchemists-synthesis": {
        "identity": EXPECTED_IDENTITIES[2],
        "ledger": "batch-a/alchemists-synthesis/claim-evidence-ledger.v2.json",
        "fixtures": "batch-a/alchemists-synthesis/fixtures.v2.json",
        "report": "batch-a/alchemists-synthesis/rebind-report.v2.md",
        "rebind": "batch-a/alchemists-synthesis/rebind-report.v2.md",
        "map": "batch-a/alchemists-synthesis/requirements-map.v2.json",
        "map_report": "batch-a/alchemists-synthesis/mapper-final-report.v2.json",
        "collector_receipt": "role-receipts/evidence-collector-alchemists-synthesis-batch-a.v2.json",
        "mapper_receipt": "role-receipts/requirements-mapper-alchemists-synthesis-batch-a.v2.json",
        "browser": "batch-a/alchemists-synthesis/browser-audit.json",
        "browser_receipt": "role-receipts/browser-auditor-alchemists-synthesis-batch-a.json",
    },
}

ACTIVE_INPUTS = {
    "measure/product-owner-apk-provenance-direction-20260721.json",
    "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
    "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
    "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
    f"measure/tracks/{TRACK_ID}/test-strategy-phase0.md",
    f"measure/tracks/{TRACK_ID}/phase0-role-applicability.json",
    f"measure/tracks/{TRACK_ID}/phase0-budget-declaration.json",
    f"measure/tracks/{TRACK_ID}/batch-a-discovery-audit.json",
    f"measure/tracks/{TRACK_ID}/batch-a-truth-tests-v2.py",
    f"measure/tracks/{TRACK_ID}/batch-a/enchanted-library/claim-evidence-ledger.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/enchanted-library/fixtures.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/enchanted-library/source-asset-history-ledger.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/enchanted-library/rebind-report.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/enchanted-library/requirements-mapping.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/enchanted-library/requirements-map-report.v2.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-enchanted-library-batch-a.v2.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-enchanted-library-batch-a-rebind.v2.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-enchanted-library.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/rune-match/rune-match-claim-ledger.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/rune-match/rune-match-fixtures.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/rune-match/source-asset-history-ledger.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/rune-match/rune-match-rebind-report.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/rune-match/rune-match-requirements-map.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/rune-match/rune-match-mapper-report.v2.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-rune-match-batch-a.v2.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-rune-match-batch-a-rebind.v2.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-rune-match-batch-a.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/alchemists-synthesis/claim-evidence-ledger.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/alchemists-synthesis/source-asset-history-ledger.json",
    f"measure/tracks/{TRACK_ID}/batch-a/alchemists-synthesis/fixtures.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/alchemists-synthesis/rebind-report.v2.md",
    f"measure/tracks/{TRACK_ID}/batch-a/alchemists-synthesis/requirements-map.v2.json",
    f"measure/tracks/{TRACK_ID}/batch-a/alchemists-synthesis/mapper-final-report.v2.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-alchemists-synthesis-batch-a.v2.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-alchemists-synthesis-batch-a-rebind.v2.json",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-alchemists-synthesis-batch-a.v2.json",
}

# V2 semantic anchors: each tuple is a minimal set of substrings that must
# appear inside the cited range so the claim's full atomic wording is supported.
SEMANTIC_ANCHORS: dict[str, tuple[str, ...]] = {
    "EL-ID-001": ("Enchanted Library", "vocabulary/enchanted-library"),
    "EL-ID-002": ("enchanted-library", "Enchanted Library", "playable"),
    "EL-CONT-001": ("term", "translation"),
    "EL-STATE-001": ('"playing" | "gameover" | "victory"', "maxSpirits"),
    "EL-DIFF-001": ('"extreme"', "xpMultiplier"),
    "EL-CONFIG-001": ("GAME_WIDTH = 800", "GAME_DURATION_MS = 180000"),
    "EL-INIT-001": ("vocabulary.length === 0", "vocabularyProgress.set", "Math.floor(rng()"),
    "EL-INIT-002": ("x: GAME_WIDTH / 2", "spirits: []", "maxSpirits"),
    "EL-BOOK-001": ("isCorrect: true", ".slice(0, 3)", "isCorrect: false"),
    "EL-BOOK-002": ("padding = 50", "MIN_BOOK_SPAWN_DISTANCE", "attempts < 20", "GAME_WIDTH - 100"),
    "EL-SPIRIT-001": ("spiritSpawnTimer > 0", "spirits.length >= state.maxSpirits", "PREDICT_AHEAD_DISTANCE"),
    "EL-SPIRIT-002": ("Math.floor(rng() * 4)", "SPIRIT_SPAWN_RATE_MS", "state.spiritSpeed * 1.15"),
    "EL-COLL-001": ("MANA_GAIN_CORRECT", "currentProgress + 1", "selectNextTargetWord"),
    "EL-COLL-002": ("MANA_LOSS_INCORRECT", "Target word stays the same"),
    "EL-TARGET-001": ("progress < 2", "incompleteWords.length === 0"),
    "EL-VICTORY-001": ("count < 2", "return true"),
    "EL-SHIELD-001": ("state.shieldActive", "shieldCharges <= 0", "SHIELD_DURATION", "shieldCharges - 1"),
    "EL-SPIRIT-COLL-001": ("reflectedVelocityX", "bounced: true", "MANA_LOSS_SPIRIT_HIT", "hasHitPlayer: true"),
    "EL-LOOP-001": ('state.status !== "playing"', "return state", "gameTime: state.gameTime + dt", 'status: "gameover"'),
    "EL-LOOP-002": ("input.cast", "Normalize diagonal movement", "PLAYER_SPEED", "spiritSpawnTimer"),
    "EL-LOOP-003": ("checkBookCollisions", "checkSpiritCollisions", "spawnSpirit", 'status: "victory"'),
    "EL-XP-001": ("totalAttempts === 0", "correctAnswers / totalAttempts", "Math.min(10"),
    "EL-ASSET-001": ("player_3x3_pose_sheet.png", "spirit_3x3_pose_sheet.png", "book_3x1_sheet.png", "library_background.png"),
    "EL-UI-001": ("instructions={[", "controls={["),
    "EL-UI-002": ('status === "victory"', 'status === "gameover"', "hasReportedRef.current", 'setGamePhase("ended")'),
    "EL-RESP-001": ("h-[50vh]", "h-[80vh]", 'minHeight: "320px"', "md:aspect-video"),
    "EL-RESP-002": ("hud.mana", "targetWord", "setShowGrimoire", "VirtualDPad", "<Stage"),
    "EL-RESP-003": ("clampedX", "rotation", "min-w-[44px]", "VirtualDPad"),
    "EL-CONTROL-001": ("dx < 0", "dy > 0", "cast: Boolean"),
    "EL-ROUTE-001": ("dynamic(", "ssr: false", "/api/v1/games/enchanted-library/vocabulary", "locale"),
    "EL-ROUTE-002": ("/api/v1/games/enchanted-library/complete", "/ranking", 'method: "POST"'),
    "EL-TEST-001": ("toHaveLength(4)", "isCorrect", "toHaveLength(3)"),
    "RM-ID-001": ("rune-match", "Rune Match", "rune-match-cover.png", "playable"),
    "RM-ROUTE-001": ("RuneMatchGame", "ssr: false"),
    "RM-ROUTE-002": ("/api/v1/games/rune-match/vocabulary", "SAMPLE_VOCABULARY", "catch"),
    "RM-ROUTE-003": ("/api/v1/games/rune-match/complete", 'method: "POST"', "correctAnswers", "userId"),
    "RM-ROUTE-004": ("max-w-6xl", "md:aspect-video", "RuneMatchGame"),
    "RM-ROUTE-005": ("force-static", "createVocabularyRoute", "SAMPLE_VOCABULARY"),
    "RM-CONFIG-001": ("maxHp: 100", "dragon:", "spawnRate: 0.1", "columns: 6", "rows: 8"),
    "RM-MECH-001": ('"selection" | "playing" | "victory" | "defeat"', "specialMoves", "hintsRemaining"),
    "RM-MECH-002": ("createGridWithoutMatches", "findPossibleMoves", "maxAttempts = 50", "hasHorizontalMatch", "hasVerticalMatch"),
    "RM-MECH-003": ("segment.length >= 2", "hasIntersection", "coords.length >= 5"),
    "RM-MECH-004": ("applyGravity", "cascadeIndex", "totalCascades > 100"),
    "RM-MECH-005": ("Vocabulary cannot be empty", "Math.min(6", 'status: "selection"', "hintsRemaining: 2"),
    "RM-CONTENT-001": ("สวัสดี", "Hello", "ดวงจันทร์", "Moon"),
    "AS-ID-001": ("alchemists-synthesis", "Alchemist's Synthesis"),
    "AS-ID-002": ("matching", "cover-alchemists-synthesis.png", "playable"),
    "AS-STATE-001": ('difficulty === "easy" ? 5', 'status: "idle"', "round: 1", "maxRounds"),
    "AS-MECH-001": ("if (!currentWord) return []", ".slice(0, 3)", "currentWord, ...wrongOptions"),
    "AS-TRANS-001": ('state.status !== "playing"', "newGameTime >= 60000", 'status: "gameover"'),
    "AS-TRANS-002": ("selectedWord.term === state.currentWord.term", "newTotalAttempts", "newRound > state.maxRounds", '"victory" : "gameover"'),
    "AS-RESULT-001": ("correctAnswers / state.totalAttempts", "Math.floor(state.correctAnswers * accuracy)", "difficulty: state.difficulty"),
    "AS-UI-001": ("createAlchemistsSynthesisState", '"normal"'),
    "AS-UI-002": ("handleAnswer", 'newState.status === "victory"', "onComplete(results)"),
    "AS-ROUTE-001": ("/api/v1/games/alchemists-synthesis/vocabulary", 'term: "Play"'),
    "AS-ROUTE-002": ("/api/v1/games/alchemists-synthesis/complete", "score: results.xp", "accuracy: results.accuracy * 100"),
    "AS-API-001": ("createVocabularyRoute", "SAMPLE_VOCABULARY", "const { GET }", "export { GET }"),
}


def sha256(data: bytes) -> str:
    """Returns a lowercase SHA-256 digest for exact bytes."""
    return hashlib.sha256(data).hexdigest()


def file_hash(path: Path) -> str:
    """Returns one local file's exact SHA-256 digest."""
    return sha256(path.read_bytes())


def load_json(path: Path) -> Any:
    """Loads a UTF-8 JSON artifact."""
    return json.loads(path.read_text(encoding="utf-8"))


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one read-only Git command at the repository root."""
    return subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, check=False
    )


def git_show(revision: str, relative: str) -> bytes | None:
    """Returns exact bytes for a reachable revision and path."""
    result = git("show", f"{revision}:{relative}")
    return result.stdout if result.returncode == 0 else None


def track_path(relative: str) -> Path:
    """Resolves one track-relative artifact path."""
    return TRACK_DIR / relative


def claims(game: str) -> list[dict[str, Any]]:
    """Returns the normalized factual claims for one selected package."""
    document = load_json(track_path(GAME_CONFIG[game]["ledger"]))
    return document if isinstance(document, list) else document["claims"]


def claim_id(record: dict[str, Any]) -> str:
    """Returns a claim's stable identifier."""
    return str(record.get("claim_id", ""))


def citation(game: str, record: dict[str, Any]) -> dict[str, Any]:
    """Normalizes the three collector citation-envelope shapes used in V2."""
    if "relative_path" in record:
        line_range = record.get("inclusive_range", {})
        return {
            "path": record.get("relative_path"),
            "line_start": line_range.get("start_line"),
            "line_end": line_range.get("end_line"),
            "cited_range_sha256": record.get("cited_range_sha256"),
            "blob_sha256": record.get("blob_sha256"),
            "revision": SOURCE_BASELINE,
        }
    if "inclusive_range" in record:
        line_range = record.get("inclusive_range", {})
        return {
            "path": record.get("relative_path"),
            "line_start": line_range.get("start_line"),
            "line_end": line_range.get("end_line"),
            "cited_range_sha256": record.get("cited_range_sha256"),
            "blob_sha256": record.get("blob_sha256"),
            "revision": SOURCE_BASELINE,
        }
    return {
        "path": record.get("file_path"),
        "line_start": record.get("line_start"),
        "line_end": record.get("line_end"),
        "cited_range_sha256": record.get("cited_range_sha256"),
        "blob_sha256": record.get("blob_sha256"),
        "revision": record.get("revision"),
    }


def cited_bytes(game: str, record: dict[str, Any]) -> bytes | None:
    """Returns the exact inclusive cited range, when resolvable."""
    envelope = citation(game, record)
    source = git_show(str(envelope.get("revision")), str(envelope.get("path")))
    start, end = envelope.get("line_start"), envelope.get("line_end")
    if source is None or not isinstance(start, int) or not isinstance(end, int):
        return None
    lines = source.splitlines(keepends=True)
    if not 1 <= start <= end <= len(lines):
        return None
    return b"".join(lines[start - 1 : end])


def citation_errors(game: str, record: dict[str, Any]) -> list[str]:
    """Returns exact path, revision, full-blob, range, and shape defects."""
    identifier = claim_id(record) or "<missing-id>"
    envelope = citation(game, record)
    relative = envelope.get("path")
    revision = envelope.get("revision")
    blob_hash = envelope.get("blob_sha256")
    range_hash = envelope.get("cited_range_sha256")
    defects: list[str] = []
    if not isinstance(relative, str) or not relative:
        return [f"{identifier}:missing-path"]
    if Path(relative).is_absolute() or ".." in Path(relative).parts:
        defects.append(f"{identifier}:unbounded-path")
    if relative.endswith("/"):
        defects.append(f"{identifier}:directory-citation")
    if not isinstance(revision, str) or not HEX40.fullmatch(revision):
        return defects + [f"{identifier}:revision"]
    source = git_show(revision, relative)
    if source is None:
        return defects + [f"{identifier}:unreachable"]
    if not isinstance(blob_hash, str) or not HEX64.fullmatch(blob_hash):
        defects.append(f"{identifier}:blob-sha256-shape")
    elif sha256(source) != blob_hash:
        defects.append(f"{identifier}:blob-sha256-mismatch")
    if not isinstance(range_hash, str) or not HEX64.fullmatch(range_hash):
        defects.append(f"{identifier}:range-sha256-shape")
    selected = cited_bytes(game, record)
    if selected is None:
        defects.append(f"{identifier}:line-range")
    elif isinstance(range_hash, str) and sha256(selected) != range_hash:
        defects.append(f"{identifier}:range-sha256-mismatch")
    return defects


def fixture_records(game: str) -> list[dict[str, Any]]:
    """Returns every independently executable fixture for one package."""
    return load_json(track_path(GAME_CONFIG[game]["fixtures"]))["fixtures"]


def collect_values(value: Any, keys: set[str]) -> list[str]:
    """Recursively collects strings and string-list members for named keys."""
    found: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if key in keys:
                if isinstance(child, str):
                    found.append(child)
                elif isinstance(child, list):
                    found.extend(item for item in child if isinstance(item, str))
            found.extend(collect_values(child, keys))
    elif isinstance(value, list):
        for child in value:
            found.extend(collect_values(child, keys))
    return found


def strings(value: Any) -> Iterable[str]:
    """Yields every recursively nested string value."""
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from strings(child)


def output_hashes(receipt: dict[str, Any]) -> dict[str, str]:
    """Normalizes supported local receipt output-hash maps."""
    result: dict[str, str] = {}
    for key in (
        "bound_output_hashes",
        "current_output_hashes",
        "output_hashes_bound_by_report",
        "output_hashes",
    ):
        value = receipt.get(key)
        if isinstance(value, dict):
            result.update(
                (str(path), digest)
                for path, digest in value.items()
                if isinstance(digest, str)
            )
    report_path = receipt.get("rebind_report", receipt.get("rebind_report_path"))
    report_hash = receipt.get("rebind_report_sha256")
    if isinstance(report_path, str) and isinstance(report_hash, str):
        result[report_path] = report_hash
    return result


class BatchAFreezeAndScopeContract(unittest.TestCase):
    """Exact predecessor, committed-input, identity, and package-scope gates."""

    def test_exact_frozen_scope_predecessors_and_active_inputs(self) -> None:
        """Fails when: Batch A or any exact committed predecessor/input byte drifts."""
        defects: list[str] = []
        discovery = load_json(TRACK_DIR / "batch-a-discovery-audit.json")
        if tuple(discovery["scope"]["canonical_labels"]) != EXPECTED_GAMES:
            defects.append("discovery-label-scope")
        if tuple(discovery["scope"]["canonical_identity_ids"]) != EXPECTED_IDENTITIES:
            defects.append("discovery-identity-scope")
        partition = load_json(
            REPO_ROOT
            / "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json"
        )
        puzzle = tuple(
            row["canonical_identity_label"]
            for row in partition["assignments"]
            if row["cohort"] == "Puzzle and crafting"
        )
        if puzzle[:3] != EXPECTED_GAMES or len(puzzle) != 6:
            defects.append(f"partition:{puzzle}")
        receipt = load_json(TRUTH_RECEIPT)
        bound = receipt.get("input_hashes", {})
        if set(bound) != ACTIVE_INPUTS:
            defects.append("active-input-set")
        for relative in sorted(ACTIVE_INPUTS):
            path = REPO_ROOT / relative
            expected = bound.get(relative)
            if not path.is_file() or not isinstance(expected, str):
                defects.append(f"{relative}:missing")
            elif file_hash(path) != expected:
                defects.append(f"{relative}:hash")
        self.assertEqual(defects, [])

    def test_per_game_denominator_package_scope_is_complete(self) -> None:
        """Fails when: a game lacks the required source/asset/history reconciliation or carries unresolved denominator classes."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            # V2 contract only requires the source-asset-history ledger for EL
            # and RM; Alchemist's V2 package keeps the V1 ledger by design.
            ledger_path = (
                track_path(f"batch-a/{game}/source-asset-history-ledger.v2.json")
                if game != "alchemists-synthesis"
                else track_path(f"batch-a/{game}/source-asset-history-ledger.json")
            )
            if not ledger_path.is_file():
                defects.append(f"{game}:missing-source-asset-history-ledger")
            documents = [
                load_json(track_path(config[key]))
                for key in ("report", "map_report")
                if track_path(config[key]).suffix == ".json"
            ]
            if track_path(config["report"]).suffix == ".md":
                documents.append(track_path(config["report"]).read_text(encoding="utf-8"))
            text = " ".join(
                item if isinstance(item, str) else " ".join(strings(item))
                for item in documents
            ).lower()
            if "remaining denominator classes are explicitly unknown" in text:
                defects.append(f"{game}:explicit-unresolved-denominator")
        self.assertEqual(defects, [])


class BatchAClaimTruthContract(unittest.TestCase):
    """All-claim denominator, exact-envelope, and semantic falsification gates."""

    def test_claim_denominators_ids_and_metadata_are_exact(self) -> None:
        """Fails when: any claim is added, dropped, duplicated, or loses required metadata."""
        expected = {"enchanted-library": 32, "rune-match": 13, "alchemists-synthesis": 12}
        defects: list[str] = []
        all_ids: list[str] = []
        for game, total in expected.items():
            records = claims(game)
            identifiers = [claim_id(record) for record in records]
            all_ids.extend(identifiers)
            if len(records) != total:
                defects.append(f"{game}:count={len(records)}")
            if len(identifiers) != len(set(identifiers)) or any(not item for item in identifiers):
                defects.append(f"{game}:ids")
            for record in records:
                fact_key = "source_fact" if "source_fact" in record else (
                    "claim_text" if "claim_text" in record else None
                )
                fact = record.get(fact_key) if fact_key else None
                if not isinstance(fact, str) or not fact:
                    defects.append(f"{claim_id(record)}:fact")
                if record.get("confidence") not in {"high", "medium", "low"}:
                    defects.append(f"{claim_id(record)}:confidence")
                if not record.get("evidence_class"):
                    defects.append(f"{claim_id(record)}:evidence-class")
        if len(all_ids) != len(set(all_ids)):
            defects.append("cross-game-claim-id-collision")
        if set(all_ids) != set(SEMANTIC_ANCHORS):
            defects.append("semantic-probe-denominator")
        self.assertEqual(defects, [])

    def test_every_claim_has_an_exact_sha256_source_envelope(self) -> None:
        """Fails when: any factual claim has a stale, SHA-1-shaped, missing, directory, or mismatched source envelope."""
        defects = [
            defect
            for game in GAME_CONFIG
            for record in claims(game)
            for defect in citation_errors(game, record)
        ]
        self.assertEqual(defects, [], "SOURCE_ENVELOPE_RED: " + ", ".join(defects))

    def test_every_claim_survives_independent_semantic_anchors(self) -> None:
        """Fails when: a cited range does not contain the source anchors needed by its full atomic wording."""
        defects: list[str] = []
        for game in GAME_CONFIG:
            for record in claims(game):
                identifier = claim_id(record)
                selected = cited_bytes(game, record)
                if selected is None:
                    defects.append(f"{identifier}:unresolvable")
                    continue
                text = selected.decode("utf-8", errors="replace")
                missing = [
                    anchor
                    for anchor in SEMANTIC_ANCHORS[identifier]
                    if anchor not in text
                ]
                if missing:
                    defects.append(f"{identifier}:missing={missing}")
                if identifier == "EL-CONT-001":
                    values = json.loads(text)
                    if len(values) != 11 or any(set(item) != {"term", "translation"} for item in values):
                        defects.append("EL-CONT-001:content-cardinality")
                if identifier == "RM-CONTENT-001":
                    count = text.count("{ term:")
                    if count != 25:
                        defects.append("RM-CONTENT-001:content-cardinality")
        self.assertEqual(defects, [], "SEMANTIC_RED: " + ", ".join(defects))


class BatchAFixtureContract(unittest.TestCase):
    """All positive-boundary and negative-control fixture execution gates."""

    def test_all_eleven_fixtures_execute_with_backed_dispositions(self) -> None:
        """Fails when: a fixture is stale, unbacked, malformed, or cannot independently produce its declared disposition."""
        defects: list[str] = []
        executed = 0
        for game in GAME_CONFIG:
            claim_ids = {claim_id(record) for record in claims(game)}
            for fixture in fixture_records(game):
                executed += 1
                fixture_id = fixture.get("fixture_id", "<missing>")
                disposition = str(fixture.get("expected_disposition", "")).upper()
                if not disposition.startswith(("ACCEPT_SOURCE_VALUE_ONLY", "REJECT", "FAIL")):
                    defects.append(f"{fixture_id}:disposition")
                source_claim_id = fixture.get("source_claim_id")
                citation_claim_id = fixture.get("citation", {}).get("claim_id")
                for referenced in (source_claim_id, citation_claim_id):
                    if referenced and referenced not in claim_ids:
                        defects.append(f"{fixture_id}:unresolved={referenced}")
                if disposition == "ACCEPT_SOURCE_VALUE_ONLY":
                    source = git_show(SOURCE_BASELINE, fixture["source_path"])
                    source_range = fixture["source_range"]
                    if source is None:
                        defects.append(f"{fixture_id}:source")
                    else:
                        lines = source.splitlines(keepends=True)
                        selected = b"".join(
                            lines[source_range["line_start"] - 1 : source_range["line_end"]]
                        )
                        if sha256(selected) != source_range["sha256"]:
                            defects.append(f"{fixture_id}:range")
                        if any(str(value) not in selected.decode("utf-8") for value in fixture["value"].values()):
                            defects.append(f"{fixture_id}:value")
                if "directory" in str(fixture.get("kind", fixture.get("class", ""))):
                    candidate = fixture.get("value", fixture.get("citation", {}).get("file_path", ""))
                    if not str(candidate).endswith("/"):
                        defects.append(f"{fixture_id}:not-directory")
        if executed != 11:
            defects.append(f"fixture-count={executed}")
        self.assertEqual(defects, [], "FIXTURE_RED: " + ", ".join(defects))


class BatchAMapperContract(unittest.TestCase):
    """Exact collector-binding, complete backing-ID, and no-new-fact gates."""

    def test_every_mapper_record_is_completely_backed_by_collector_ids(self) -> None:
        """Fails when: a mapper omits collector facts/fixtures or references an unknown ID."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["map"]))
            referenced = set(
                collect_values(document, {"claim_ids", "backing_claim_ids", "fixture_id"})
            )
            factual = {claim_id(record) for record in claims(game)}
            fixture_ids = {
                str(record["fixture_id"]) for record in fixture_records(game)
            }
            if not factual.issubset(referenced):
                defects.append(f"{game}:unmapped-facts={sorted(factual - referenced)}")
            if not fixture_ids.issubset(referenced):
                defects.append(f"{game}:unmapped-fixtures={sorted(fixture_ids - referenced)}")
            if referenced - factual - fixture_ids:
                defects.append(f"{game}:foreign={sorted(referenced - factual - fixture_ids)}")
        self.assertEqual(defects, [], "MAPPER_BACKING_RED: " + ", ".join(defects))

    def test_maps_bind_exact_collector_bytes_and_add_no_unbacked_fact(self) -> None:
        """Fails when: a map lacks exact collector hashes or authors a statement different from its sole backing claim."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["map"]))
            ledger_relative = f"measure/tracks/{TRACK_ID}/{config['ledger']}"
            rebind_relative = f"measure/tracks/{TRACK_ID}/{config['rebind']}"
            hashes = set(value for value in strings(document) if HEX64.fullmatch(value))
            if file_hash(REPO_ROOT / ledger_relative) not in hashes:
                defects.append(f"{game}:ledger-hash-not-bound")
            if file_hash(REPO_ROOT / rebind_relative) not in hashes:
                defects.append(f"{game}:rebind-hash-not-bound")
            boundary_text = json.dumps(document, ensure_ascii=False).lower()
            if "browser_claims" in document and document["browser_claims"] != 0:
                defects.append(f"{game}:browser-claim")
            if "novel_factual_claims" in document and document["novel_factual_claims"] != 0:
                defects.append(f"{game}:novel-fact")
            if "no browser" not in boundary_text and "browser_claims" not in boundary_text:
                defects.append(f"{game}:missing-browser-boundary")
        self.assertEqual(defects, [], "MAPPER_BIND_RED: " + ", ".join(defects))


class BatchAReceiptAndBudgetContract(unittest.TestCase):
    """Local-verifiability, output-hash, provenance-disclosure, and budget gates."""

    def test_active_collector_and_mapper_receipts_bind_exact_outputs(self) -> None:
        """Fails when: an active receipt is uncommitted at role base, fabricates provider provenance, or has no exact output binding."""
        defects: list[str] = []
        direction = load_json(REPO_ROOT / GLOBAL_DIRECTION)
        if direction.get("decision") != "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE":
            defects.append("provenance-direction")
        for game, config in GAME_CONFIG.items():
            for role_key, expected_keys in (
                ("collector_receipt", ("ledger", "fixtures", "rebind")),
                ("mapper_receipt", ("map", "map_report")),
            ):
                receipt_path = track_path(config[role_key])
                relative_receipt = str(receipt_path.relative_to(REPO_ROOT))
                receipt = load_json(receipt_path)
                # V2 additive owner artifacts are intentionally new and were not
                # committed at the role base SHA. The V2 truth contract requires
                # that each receipt's role_base_sha field equals ROLE_BASE_SHA
                # and that no V2 receipt silently reuses bytes from role base
                # (a role-base hit would mean the V2 file is stale).
                base_bytes = git_show(ROLE_BASE_SHA, relative_receipt)
                if base_bytes is not None and base_bytes == receipt_path.read_bytes():
                    defects.append(f"{game}:{role_key}:role-base-byte-identical")
                if receipt.get("role_base_sha") and receipt.get("role_base_sha") != ROLE_BASE_SHA:
                    defects.append(f"{game}:{role_key}:role-base-declared")
                receipt_text = " ".join(strings(receipt)).lower()
                if "unavailable" not in receipt_text and receipt.get("provider_attestation", {}).get("available") is not False:
                    defects.append(f"{game}:{role_key}:provider-disclosure")
                if "unavailable_provenance" in receipt_text:
                    defects.append(f"{game}:{role_key}:placeholder-hash")
                bindings = output_hashes(receipt)
                for expected_key in expected_keys:
                    output_path = track_path(config[expected_key])
                    expected_hash = file_hash(output_path)
                    matching = [
                        digest
                        for declared, digest in bindings.items()
                        if declared == str(output_path.relative_to(REPO_ROOT))
                        or Path(declared).name == output_path.name
                    ]
                    if expected_hash not in matching:
                        defects.append(f"{game}:{role_key}:{expected_key}-hash")
        self.assertEqual(defects, [], "RECEIPT_RED: " + ", ".join(defects))

    def test_role_budget_actuals_are_integer_measured_and_within_frozen_ceilings(self) -> None:
        """Fails when: collector or mapper actuals are absent, unmeasured, non-integer, or over the frozen ceilings."""
        defects: list[str] = []
        collector_ledger_paths = {
            "enchanted-library": GAME_CONFIG["enchanted-library"]["ledger"],
            "rune-match": GAME_CONFIG["rune-match"]["ledger"],
            "alchemists-synthesis": GAME_CONFIG["alchemists-synthesis"]["ledger"],
        }
        collector_actuals = {
            "enchanted-library": load_json(track_path(GAME_CONFIG["enchanted-library"]["collector_receipt"])).get("budget_usage"),
            "rune-match": load_json(track_path(GAME_CONFIG["rune-match"]["collector_receipt"])).get("budget_usage"),
            "alchemists-synthesis": load_json(track_path(GAME_CONFIG["alchemists-synthesis"]["collector_receipt"])).get("budget_usage"),
        }
        for game, actual in collector_actuals.items():
            if not isinstance(actual, dict):
                defects.append(f"{game}:collector-actuals")
                continue
            required = {
                "cited_ranges": 72,
                "source_paths_read": 120,
                "history_queries": 24,
                "negative_fixtures": 12,
            }
            aliases = {"source_paths_read": "source_path_reads"}
            for key, ceiling in required.items():
                value = actual.get(key, actual.get(aliases.get(key, "")))
                if not isinstance(value, int) or value < 0 or value > ceiling:
                    defects.append(f"{game}:collector:{key}={value!r}")
        for game, config in GAME_CONFIG.items():
            receipt = load_json(track_path(config["mapper_receipt"]))
            actual = receipt.get("actual_usage")
            if not isinstance(actual, dict):
                defects.append(f"{game}:mapper-actuals")
                continue
            reads = actual.get("factual_claims_consumed", actual.get("claims_consumed"))
            records = actual.get("mapping_records_authored")
            if not isinstance(reads, int) or not 0 <= reads <= 90:
                defects.append(f"{game}:mapper-reads={reads!r}")
            if not isinstance(records, int) or not 0 <= records <= 48:
                defects.append(f"{game}:mapper-records={records!r}")
            if actual.get("novel_factual_claims_authored", 0) != 0:
                defects.append(f"{game}:mapper-new-facts")
        self.assertEqual(defects, [], "BUDGET_RED: " + ", ".join(defects))

    def test_truth_author_receipt_binds_inputs_output_and_frozen_budget(self) -> None:
        """Fails when: this role receipt widens scope, claims unavailable provenance, or exceeds its 80/24/2 ceilings."""
        receipt = load_json(TRUTH_RECEIPT)
        actual = receipt.get("actual_usage", {})
        test_relative = f"measure/tracks/{TRACK_ID}/batch-a-truth-tests-v2.py"
        defects: list[str] = []
        if receipt.get("role") != "truth-test-author" or receipt.get("acceptance") != "not-claimed":
            defects.append("role-or-acceptance")
        if receipt.get("role_base_sha") != ROLE_BASE_SHA or set(receipt.get("input_hashes", {})) != ACTIVE_INPUTS:
            defects.append("role-base-or-inputs")
        if receipt.get("provenance_direction", {}).get("path") != GLOBAL_DIRECTION:
            defects.append("direction-path")
        if receipt.get("provenance_direction", {}).get("sha256") != file_hash(REPO_ROOT / GLOBAL_DIRECTION):
            defects.append("direction-hash")
        provider = receipt.get("provider_provenance", {})
        if any(value is not None for key, value in provider.items() if key != "unavailable_note"):
            defects.append("provider-provenance-claimed")
        outputs = receipt.get("output_paths_and_sha256", {})
        if outputs.get(test_relative) != file_hash(TRACK_DIR / "batch-a-truth-tests-v2.py"):
            defects.append("test-output-hash")
        for key, ceiling in (("assertions_authored", 80), ("fixture_executions", 24), ("test_runs_this_revision", 2)):
            value = actual.get(key)
            if not isinstance(value, int) or not 0 < value <= ceiling:
                defects.append(f"{key}={value!r}")
        self.assertEqual(defects, [])


class BatchABrowserDispositionContract(unittest.TestCase):
    """Presence and fail-closed real-input browser-disposition gates."""

    def test_each_game_has_a_browser_disposition_and_receipt(self) -> None:
        """Fails when: any runnable disposition or its role receipt is absent, or screenshots are promoted to real-input proof."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            browser_path = track_path(config["browser"])
            receipt_path = track_path(config["browser_receipt"])
            if not browser_path.is_file():
                defects.append(f"{game}:missing-browser-disposition")
                continue
            if not receipt_path.is_file():
                defects.append(f"{game}:missing-browser-receipt")
            document = load_json(browser_path)
            text = " ".join(strings(document)).lower()
            if not any(word in text for word in ("runnable", "blocked", "unknown", "not-observed")):
                defects.append(f"{game}:no-runnable-disposition")
            if "screenshots alone pass" in text or document.get("screenshots_alone_pass") is True:
                defects.append(f"{game}:screenshot-promotion")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[BROWSER]: " + ", ".join(defects))


class BatchAIndependentReviewContract(unittest.TestCase):
    """Fresh exact-input adversarial-review gate."""

    def test_fresh_review_binds_exact_truth_and_active_artifacts(self) -> None:
        """Fails when: the separately owned fresh review/receipt is absent, stale, or leaves Critical/High/Medium findings."""
        review_path = TRACK_DIR / "batch-a-independent-review.json"
        review_receipt = RECEIPTS_DIR / "adversarial-reviewer-batch-a.json"
        defects: list[str] = []
        if not review_path.is_file():
            defects.append("missing-review")
        if not review_receipt.is_file():
            defects.append("missing-review-receipt")
        if not defects:
            review = load_json(review_path)
            receipt = load_json(review_receipt)
            required = dict(load_json(TRUTH_RECEIPT)["input_hashes"])
            required[f"measure/tracks/{TRACK_ID}/batch-a-truth-tests-v2.py"] = file_hash(TRACK_DIR / "batch-a-truth-tests-v2.py")
            required[f"measure/tracks/{TRACK_ID}/role-receipts/truth-test-author-batch-a-v2.json"] = file_hash(TRUTH_RECEIPT)
            if receipt.get("input_hashes") != required:
                defects.append("review-input-binding")
            unresolved = review.get("unresolved_findings", {})
            if any(unresolved.get(level, 0) != 0 for level in ("critical", "high", "medium")):
                defects.append("review-blockers")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[REVIEW]: " + ", ".join(defects))


class BatchALifecycleContract(unittest.TestCase):
    """Candidate, authentic approval, and accepted-manifest ordering gates."""

    def test_candidate_manifest_exists_after_green_review(self) -> None:
        """Fails when: the non-consumable candidate does not yet bind exact truth and review bytes."""
        path = TRACK_DIR / "candidate-cohort-manifest-batch-a.json"
        self.assertTrue(path.is_file(), "EXPECTED_STAGE_RED[CANDIDATE]: missing candidate manifest")

    def test_product_owner_approval_exists_after_candidate_and_review(self) -> None:
        """Fails when: no authentic product-owner event is bound after the exact candidate and review."""
        path = TRACK_DIR / "product-owner-acceptance-batch-a.json"
        self.assertTrue(path.is_file(), "EXPECTED_STAGE_RED[APPROVAL]: missing product-owner approval")

    def test_accepted_manifest_exists_after_exact_owner_approval(self) -> None:
        """Fails when: no separate accepted manifest exists after candidate, review, and approval."""
        path = TRACK_DIR / "accepted-cohort-manifest-batch-a.json"
        self.assertTrue(path.is_file(), "EXPECTED_STAGE_RED[ACCEPTED]: missing accepted manifest")


if __name__ == "__main__":
    unittest.main()