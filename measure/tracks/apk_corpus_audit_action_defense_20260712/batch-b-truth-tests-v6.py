"""Batch B v6 truth contracts for the exact additive evidence packages.

V6 selects Village Guardian v3, Archer's Revenge v2, asset audit v2, the
global local-provenance direction, the bounded WebBridge direction, and review
v4 without mutating any predecessor artifact.  Artifact/source gates are kept
separate from browser, completion, review, and lifecycle gates so a bounded B4
pass cannot be mistaken for completion or cohort acceptance.
"""

from __future__ import annotations

import hashlib
import inspect
import json
import re
import shlex
import struct
import subprocess
import unittest
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure/tracks/apk_corpus_audit_action_defense_20260712"
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
PHASE = "Phase 2: Batch B evidence packages"
PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "ddc38cdf84a5ab3e046ef68561b71dfa65f7a76d"
SOURCE_BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
TRACK_ID = "apk_corpus_audit_action_defense_20260712"
HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")

GAMES = {
    "village-guardian": "Village Guardian",
    "archers-revenge": "Archer's Revenge",
    "storm-castle-tower": "Storm the Castle Tower",
}
LEDGER_PATHS = {
    "village-guardian": TRACK_DIR / "village-guardian-claim-ledger-batch-b-v3.json",
    "archers-revenge": TRACK_DIR / "archers-revenge-claim-ledger-batch-b-v2.json",
    "storm-castle-tower": TRACK_DIR / "storm-castle-tower-claim-ledger-batch-b.json",
}
METHOD_PATHS = {
    "village-guardian": TRACK_DIR / "village-guardian-evidence-method-batch-b-v3.md",
    "archers-revenge": TRACK_DIR / "archers-revenge-evidence-method-batch-b-v2.md",
    "storm-castle-tower": TRACK_DIR / "storm-castle-tower-evidence-method-batch-b.md",
}
REPORT_PATHS = {
    "village-guardian": TRACK_DIR / "village-guardian-evidence-final-report-batch-b-v3.json",
    "archers-revenge": TRACK_DIR / "archers-revenge-evidence-final-report-batch-b-v2.json",
    "storm-castle-tower": TRACK_DIR / "storm-castle-tower-evidence-final-report-batch-b.json",
}
COLLECTOR_RECEIPTS = {
    "village-guardian": RECEIPTS_DIR / "evidence-collector-village-guardian-batch-b-v3.json",
    "archers-revenge": RECEIPTS_DIR / "evidence-collector-archers-revenge-batch-b-v2.json",
    "storm-castle-tower": RECEIPTS_DIR / "evidence-collector-storm-castle-tower-batch-b.json",
}
DISCOVERY_PATH = TRACK_DIR / "batch-b-discovery-audit-v2.json"
BROWSER_PATH = TRACK_DIR / "batch-b-browser-audit-v3.json"
BROWSER_RECEIPT_PATH = RECEIPTS_DIR / "browser-auditor-batch-b-v3.json"
WEBBRIDGE_DIRECTION_PATH = TRACK_DIR / "product-owner-direction-batch-b-webbridge.json"
PROVENANCE_DIRECTION_PATH = REPO_ROOT / "measure/product-owner-apk-provenance-direction-20260721.json"
ASSET_PATH = TRACK_DIR / "batch-b-asset-audit-v2.json"
ASSET_RECEIPT_PATH = RECEIPTS_DIR / "asset-auditor-batch-b-v2.json"
REVIEW_PATH = TRACK_DIR / "batch-b-adversarial-review-v4.json"
REVIEW_RECEIPT_PATH = RECEIPTS_DIR / "adversarial-reviewer-batch-b-v4.json"
V5_PATH = TRACK_DIR / "batch-b-truth-tests-v5.py"
V6_PATH = Path(__file__).resolve()
V6_RECEIPT_PATH = RECEIPTS_DIR / "truth-test-author-batch-b-v6.json"

ACTIVE_INPUT_HASHES = {
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-truth-tests-v5.py": "5e54a0d126bf78b361963c402a2198bc53d343d5c2b41f8085c679a6b595bb76",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/village-guardian-claim-ledger-batch-b-v3.json": "3be82cd7a9ddb144ae82ae220c36b439c6d14bbd58e1c988c897af6156b20484",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/village-guardian-evidence-method-batch-b-v3.md": "95c342a84cce0e6a6651e34cad11804ca8b930e2b9d1d533f3d464417d13200e",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/village-guardian-evidence-final-report-batch-b-v3.json": "b6847970ab60374635b3925d82e9e1c8ac8a06761e8715decd6734f5018b372f",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-village-guardian-batch-b-v3.json": "057961346dbdae04ce78c3587c13a33a2c87c258be2317b9fcd3963e58aca9b2",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-claim-ledger-batch-b-v2.json": "47413ceda62767d911ddb11f91d9a2f30c04c97179f7440e45e024b8da484d84",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-method-batch-b-v2.md": "77c30b16224755f56e98732a35b0dd9d2924dedc56704f6008051f8695f4b773",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/archers-revenge-evidence-final-report-batch-b-v2.json": "302d5f851be7869aa569dfe9d966ad21147bc1ece532f99993071a5e089973fe",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/evidence-collector-archers-revenge-batch-b-v2.json": "d23ed799fcf3f98ff85f2c3443813165d2188d5cd3c168d0996e30561dfa9d20",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-asset-audit-v2.json": "c66b096726e441e6aab0c7a3ffd2cda81413befb00e1c8586cbe911a31329ebd",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/asset-auditor-batch-b-v2.json": "a9958731fe8f2133348625438ac3d3e60090ca81c9f966dfad13884b6e0e6eda",
    "measure/product-owner-apk-provenance-direction-20260721.json": "4d1ec24e900665577a413b4c5555d4d53ae1be222d8029cf391d1b55ff7da9ac",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/product-owner-direction-batch-b-webbridge.json": "7dde397fdb1ceeac3e490d07791e90f69dd630b962d6b799da8426d4e9234498",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-browser-audit-v3.json": "521e08b7a1ef9309cdf31277d0f07b99700bb7721d97ee3e371321e70cd1e4ca",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-b-adversarial-review-v4.json": "1ac23f3f7050c8b47d31770a7c943ecfa41b7942f3c0004e31fd6da9d058726d",
    "measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/adversarial-reviewer-batch-b-v4.json": "2503d31d30efee37a9a2b7ffe9f54cf42acdcbf4a6a700b5414671f7048e2915",
}

PINNED_RECEIPT_HASHES = {
    "discovery-auditor-batch-b-v2.json": "c6c94ea45b4564a5a4cbf17451d0069f3a67e27b63b0af20bbb2bb61df613dfb",
    "evidence-collector-village-guardian-batch-b-v3.json": "057961346dbdae04ce78c3587c13a33a2c87c258be2317b9fcd3963e58aca9b2",
    "evidence-collector-archers-revenge-batch-b-v2.json": "d23ed799fcf3f98ff85f2c3443813165d2188d5cd3c168d0996e30561dfa9d20",
    "evidence-collector-storm-castle-tower-batch-b.json": "1efd07acda32536ddc19d3472e3f9f010f10649f81aa4dcd173479af636d54d8",
    "requirements-mapper-village-guardian-batch-b.json": "692bef438f8ccac4a70384ab44222bc06fe7da3aa0eb15c699591f857b82b351",
    "requirements-mapper-archers-revenge-batch-b.json": "97dcf1ae94c096a0003885cb37bfaa0109d92af9c6133ab4f98101eb8d61ffb9",
    "requirements-mapper-storm-castle-tower-batch-b.json": "f24bf7f2b7854580b4f4003a464c274fabb0fe563fdf817a6bc30f7d21ddfdab",
    "browser-auditor-batch-b-v3.json": "3209377fb793faf304aeaf5c575777ca0f524f0334e9dfc384357a3d9b1adfa8",
    "asset-auditor-batch-b-v2.json": "a9958731fe8f2133348625438ac3d3e60090ca81c9f966dfad13884b6e0e6eda",
    "adversarial-reviewer-batch-b-v4.json": "2503d31d30efee37a9a2b7ffe9f54cf42acdcbf4a6a700b5414671f7048e2915",
}

ACTIVE_RECEIPTS = (
    *PINNED_RECEIPT_HASHES,
    "truth-test-author-batch-b-v6.json",
)

# Collector-independent exact atoms for the two ledgers that predate the v3
# semantic_check schema. Every positive claim ID must occur exactly once here.
EXTERNAL_SEMANTIC_ATOMS: dict[str, tuple[str, ...]] = {
    "AR-B2-COPY-001": ("gameTitle=\"Archer's Revenge\"",),
    "AR-B2-COPY-002": ("gameSubtitle=\"Defend the Realm\"",),
    "AR-B2-COPY-003": ("Find the enemy", "matching translation"),
    "AR-B2-COPY-004": ("Tap a column", "SHIELD DOWN", "vulnerable"),
    "AR-B2-COPY-005": ("shielded enemies", "shoot back", "damage your HP"),
    "AR-B2-COPY-006": ("target changes", "few seconds"),
    "AR-B2-COPY-007": ("Shoot", "Tap / Click"),
    "AR-B2-COPY-008": ("Draw Your Bow",),
    "AR-B2-COPY-009": ("Champion Archer!", "Wall Breached!"),
    "AR-B2-COPY-010": ("The realm is safe... for now.", "The monsters have overrun the defense."),
    "AR-B2-ASSET-001": ("89504e470d0a1a0a",),
    "AR-B2-ASSET-002": ("89504e470d0a1a0a",),
    "AR-B2-ASSET-003": ("89504e470d0a1a0a",),
    "AR-B2-TRANS-001": ("Math.max", "playerY - 40", "status: \"defeat\""),
    "AR-B2-TRANS-002": ("hp -= 1", "hp <= 0", "status = \"defeat\""),
    "AR-B2-TRANS-003": ("hitEnemies.size > 0", "enemies.length === 0", "nextWave"),
    "AR-B2-TRANS-004": ("wave: nextWaveNum", "createEnemyFormation", "targetWord", "arrows: []", "enemyProjectiles: []", "formationDirection: 1"),
    "AR-B2-EFFORT-001": ("export", "tickArchersRevenge", "calculateXP"),
    "AR-B2-EFFORT-002": ("useState<\"start\" | \"playing\" | \"ended\">", "gamePhase === \"start\"", "gamePhase === \"playing\"", "gamePhase === \"ended\""),
    "AR-B2-EFFORT-003": ("fetch(", "handleComplete"),
    "SCT-ID-001": ("storm-castle-tower",),
    "SCT-ID-002": ("withdrawnApkGameIds.has", "href: undefined", "status: 'coming-soon'"),
    "SCT-ID-003": ("id: 'storm-castle-tower'", "title: 'Storm the Castle Tower'"),
    "SCT-COPY-001": ("Scale the castle walls!", "Collect words in the correct order", "boiling oil", "falling rocks"),
    "SCT-ASSET-001": ("/games/cover/cover-storm-the-castle-tower.png",),
    "SCT-ASSET-002": ("89504e470d0a1a0a",),
    "SCT-ROUTE-H001": ("StormCastleTowerGame", "ssr: false"),
    "SCT-ROUTE-H002": ("/api/v1/games/storm-castle-tower/sentences", "locale"),
    "SCT-ROUTE-H003": ("/api/v1/games/storm-castle-tower/complete", "method: \"POST\"", "JSON.stringify"),
    "SCT-SCENE-H003": ("'start' | 'playing' | 'ended'", "useState<'start' | 'playing' | 'ended'>('start')"),
    "SCT-TRANS-H001": ("resetGame", "startGame", "setGameState", "setGamePhase(\"playing\")"),
    "SCT-TRANS-H002": ("phase === 'victory'", "phase === 'defeat'", "setGamePhase('ended')", "onComplete"),
    "SCT-SCENE-H004": ("GameEndScreen", "Words Collected", "Lives Left", "setGamePhase('start')"),
    "SCT-RESP-H001": ("getBoundingClientRect", "ResizeObserver", "observer.disconnect", "clearInterval", "clearTimeout"),
    "SCT-RESP-H002": ("Math.min", "dimensions.width / STORM_CASTLE_TOWER_CONFIG.gameWidth", "dimensions.height / STORM_CASTLE_TOWER_CONFIG.gameHeight"),
    "SCT-RESP-H003": ("width={STORM_CASTLE_TOWER_CONFIG.gameWidth}", "height={STORM_CASTLE_TOWER_CONFIG.gameHeight}", "scale={{ x: scale, y: scale }}"),
    "SCT-MECH-H001": ("ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "e.key === 'w'", "e.key === 'a'", "e.key === 's'", "e.key === 'd'", "e.key === ' '", "e.key === 'Enter'"),
    "SCT-MECH-H002": ("onTouchStart", "handleTouchMove('left')", "handleTouchMove('up')", "handleTouchMove('down')", "handleTouchMove('right')", "onTouchStart={handleCollect}"),
    "SCT-ASSET-H001": ("hazard.type === 'oil'", "<Rect", "<Circle"),
    "SCT-ROUTE-H004": ("createCompleteRoute", "export { POST }", "force-static"),
    "SCT-ROUTE-H005": ("createSentencesRoute(SAMPLE_SENTENCES)", "export { GET }", "force-static"),
    "SCT-TEST-H001": ("Storm the Tower", "konva-stage"),
    "SCT-ID-H004": ("id: \"storm-castle-tower\"", "inputMode: \"sentence\""),
    "SCT-ASSET-H002": ("world.background", "player.hero", "target.correct", "target.incorrect", "feedback.correct", "feedback.incorrect", "ui.panel", "terrain.tower", "target.window", "hazard.oil", "hazard.rock"),
    "SCT-SCENE-H006": ("sentenceIndex: 0", "targetIndex: 0", "column: 1", "row: 0", "hazards: []", "lives: 3", "complete: false"),
    "SCT-MECH-H005": ("window.state === \"open\"", "window.column === state.player.column", "window.row === state.player.row", "state.lives - 1", "state.score - 20", "finish(incorrect, false)"),
    "SCT-TRANS-H003": ("state.score + 100", "resolution.nextTargetIndex", "finish({", "}, true)", "state.sentenceIndex + 1", "targetIndex: 0"),
    "SCT-MECH-H006": ("crossed.has(hazard.id)", "hazard.column === state.player.column", "lives -= 1"),
    "SCT-MECH-H007": ("createSeededRandom", "kind: random() < 0.5", "position: Math.min", "hazardCount += 1"),
    "SCT-TRANS-H004": ("elapsedMs", "lives <= 0", "finish(next, false)"),
    "SCT-MECH-H008": ("ArrowLeft", "KeyA", "Space", "Enter", "regions"),
    "SCT-IMPL-H002": ("width: 960", "height: 540", "preloadSemanticAssets", "STORM_CASTLE_ASSET_SLOTS"),
    "SCT-IMPL-H003": ("model.complete", "advanceStormCastle", "resolveTraversalActions", "render", "deliverComplete"),
    "SCT-IMPL-H004": ("export * from \"./definition\"", "export * from \"./systems\""),
    "SCT-TEST-H002": ("it.each([primaryChibiEdition, secondaryEpicEdition])", "width: 960", "height: 540", "preload", "create", "update"),
    "SCT-TEST-H003": ("accuracy: 1", "xp: 60", "score: 600", "correctAnswers: 6", "totalAttempts: 6"),
}


def sha256(data: bytes) -> str:
    """Returns the lowercase SHA-256 digest of exact bytes.

    @param data Bytes to hash.
    @returns The lowercase hexadecimal digest.
    """
    return hashlib.sha256(data).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    """Loads one required JSON object without caching mutable results.

    @param path Repository artifact path.
    @returns The parsed JSON object.
    @throws AssertionError When the artifact is missing, malformed, or not an object.
    """
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise AssertionError(f"{path}: unreadable JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise AssertionError(f"{path}: expected JSON object")
    return value


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one read-only Git command and captures exact streams.

    @param args Git arguments without the executable name.
    @returns The completed process without raising on nonzero status.
    """
    return subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, check=False)


def git_show(revision: str, relative_path: str) -> bytes | None:
    """Reads exact blob bytes from one reachable Git revision.

    @param revision Full Git revision.
    @param relative_path Repository-relative path.
    @returns Blob bytes, or null when Git cannot resolve the object.
    """
    result = git("show", f"{revision}:{relative_path}")
    return result.stdout if result.returncode == 0 else None


def file_hash(path: Path) -> str:
    """Hashes one current repository file.

    @param path File to hash.
    @returns Exact-byte SHA-256 digest.
    """
    return sha256(path.read_bytes())


def claims(game: str) -> list[dict[str, Any]]:
    """Returns the selected factual claim population for one game.

    @param game Normalized game identifier.
    @returns Factual claim records from the active ledger.
    """
    value = load_json(LEDGER_PATHS[game]).get("claims")
    return value if isinstance(value, list) else []


def fixtures(game: str) -> list[dict[str, Any]]:
    """Returns the selected negative fixtures for one game.

    @param game Normalized game identifier.
    @returns Fixture records kept separate from factual claims.
    """
    value = load_json(LEDGER_PATHS[game]).get("negative_fixtures")
    return value if isinstance(value, list) else []


def claim_id(record: dict[str, Any]) -> str:
    """Normalizes one claim identifier.

    @param record Claim record.
    @returns Stable claim identifier or an empty string.
    """
    return str(record.get("claim_id", ""))


def range_bytes(record: dict[str, Any], blob: bytes) -> bytes | None:
    """Extracts an exact declared line or whole-file envelope.

    @param record Claim or fixture record.
    @param blob Full Git blob bytes.
    @returns Selected bytes, or null for a malformed range.
    """
    value = record.get("inclusive_range")
    if value == "whole-file":
        return blob
    try:
        blob.decode("utf-8")
    except UnicodeDecodeError:
        return blob if record.get("cited_range_sha256") == record.get("blob_sha256") else None
    if isinstance(value, str):
        match = re.fullmatch(r"(\d+)\.\.(\d+)", value)
        if not match:
            return None
        start, end = int(match.group(1)), int(match.group(2))
        lines = blob.splitlines(keepends=True)
        return b"".join(lines[start - 1 : end]) if 1 <= start <= end <= len(lines) else None
    if not isinstance(value, dict):
        return None
    start = value.get("start_line", value.get("start"))
    end = value.get("end_line", value.get("end"))
    if type(start) is not int or type(end) is not int:
        return None
    if value.get("kind") == "bytes":
        return blob if (start, end) == (0, len(blob) - 1) else None
    lines = blob.splitlines(keepends=True)
    return b"".join(lines[start - 1 : end]) if 1 <= start <= end <= len(lines) else None


def citation_error(record: dict[str, Any], record_id: str) -> str | None:
    """Recomputes one positive source blob and range envelope.

    @param record Claim, fixture, source-coverage, or asset-anchor record.
    @param record_id Diagnostic identifier.
    @returns A defect string, or null when the envelope is exact.
    """
    revision = record.get("source_revision", record.get("revision"))
    relative = record.get("relative_path", record.get("path"))
    if not isinstance(revision, str) or not HEX40.fullmatch(revision):
        return f"{record_id}: malformed revision"
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute() or ".." in Path(relative).parts:
        return f"{record_id}: invalid path"
    object_type = git("cat-file", "-t", f"{revision}:{relative}")
    if object_type.stdout != b"blob\n":
        return f"{record_id}: source object is not a blob"
    blob = git_show(revision, relative)
    if blob is None:
        return f"{record_id}: git show failed"
    blob_digest = record.get("blob_sha256", record.get("sha256"))
    if not isinstance(blob_digest, str) or sha256(blob) != blob_digest:
        return f"{record_id}: blob hash mismatch"
    range_digest = record.get("cited_range_sha256")
    if range_digest is None:
        return None
    selected = range_bytes(record, blob)
    if selected is None or sha256(selected) != range_digest:
        return f"{record_id}: range hash mismatch"
    return None


def cited_bytes(record: dict[str, Any]) -> bytes:
    """Returns exact selected citation bytes after envelope validation.

    @param record Positive source record.
    @returns Exact cited bytes, or empty bytes when resolution fails.
    """
    revision = record.get("source_revision")
    relative = record.get("relative_path")
    if not isinstance(revision, str) or not isinstance(relative, str):
        return b""
    blob = git_show(revision, relative)
    return range_bytes(record, blob) if blob is not None and range_bytes(record, blob) is not None else b""


def run_recorded_git(command: str) -> subprocess.CompletedProcess[bytes] | None:
    """Executes a shell-free recorded Git command.

    @param command Recorded command text.
    @returns Completed Git process, or null when the command is unsafe or synthetic.
    """
    try:
        args = shlex.split(command)
    except ValueError:
        return None
    if not args or args[0] != "git" or any(token in {"|", ";", "&&", "||"} for token in args):
        return None
    return git(*args[1:])


def storm_query_errors() -> list[str]:
    """Re-derives every Storm bounded query and chronology envelope.

    @returns Exact query defects.
    """
    ledger = load_json(LEDGER_PATHS["storm-castle-tower"])
    errors: list[str] = []
    records = ledger.get("bounded_query_evidence", [])
    for record in records:
        query_id = record.get("query_id", "<missing>")
        expected = str(record.get("exact_stdout", "")).encode()
        if sha256(expected) != record.get("stdout_sha256"):
            errors.append(f"{query_id}: stdout hash")
            continue
        if query_id == "SCT-Q-BASELINE-TREE":
            result = git("ls-tree", "-r", "--name-only", SOURCE_BASELINE, "--", "apps/advantage-games/src", "apps/advantage-games/public", "packages/game-cartridges/src")
            matches = sorted(line for line in result.stdout.decode().splitlines() if "storm-castle-tower" in line)
            actual = ("\n".join(matches) + ("\n" if matches else "")).encode()
            returncode = result.returncode
        elif query_id == "SCT-Q-CHRONOLOGY":
            lines = []
            for revision in record.get("search_domain", []):
                shown = git("show", "-s", "--format=%H\t%aI\t%s", revision)
                ancestor = git("merge-base", "--is-ancestor", revision, SOURCE_BASELINE)
                lines.append(shown.stdout.decode().rstrip("\n") + f"\tancestor_of_baseline={str(ancestor.returncode == 0).lower()}")
            actual, returncode = ("\n".join(lines) + "\n").encode(), 0
        else:
            result = run_recorded_git(str(record.get("command", "")))
            if result is None:
                errors.append(f"{query_id}: unsafe command")
                continue
            actual, returncode = result.stdout, result.returncode
        if actual != expected or returncode != record.get("exit_status"):
            errors.append(f"{query_id}: output/exit mismatch")
    query_ids = {record.get("query_id") for record in records}
    for item in claims("storm-castle-tower"):
        if not item.get("relative_path") and item.get("bounded_query_evidence_id") not in query_ids:
            errors.append(f"{claim_id(item)}: missing query backing")
    return errors


def archer_absence_errors() -> list[str]:
    """Re-derives every Archer bounded absence envelope.

    @returns Exact absence-query defects.
    """
    errors: list[str] = []
    for record in load_json(LEDGER_PATHS["archers-revenge"]).get("bounded_absence_records", []):
        record_id = record.get("record_id", "<missing>")
        expected = str(record.get("exact_stdout", "")).encode()
        result = run_recorded_git(str(record.get("command", "")))
        if sha256(expected) != record.get("stdout_sha256") or result is None:
            errors.append(f"{record_id}: malformed envelope")
        elif result.stdout != expected or result.returncode != record.get("exit_code"):
            errors.append(f"{record_id}: output/exit mismatch")
    return errors


def iter_claim_references(value: Any) -> Iterable[str]:
    """Yields claim IDs from explicit mapper backing fields.

    @param value Arbitrary parsed mapper value.
    @returns An iterator over explicit claim references.
    """
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"claim_ids", "backing_claim_ids", "referenced_claim_ids", "source_claim_ids"} and isinstance(child, list):
                yield from (item for item in child if isinstance(item, str))
            else:
                yield from iter_claim_references(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_claim_references(child)


def output_bindings(receipt: dict[str, Any]) -> list[tuple[str, str | None]]:
    """Normalizes output paths and hashes across receipt schemas.

    @param receipt Parsed receipt.
    @returns Ordered unique path/hash pairs.
    """
    bindings: list[tuple[str, str | None]] = []
    for key in ("outputs", "output_paths_and_sha256"):
        value = receipt.get(key)
        if isinstance(value, list):
            bindings.extend((item["path"], item.get("sha256")) for item in value if isinstance(item, dict) and isinstance(item.get("path"), str))
    paths = receipt.get("output_paths")
    hashes = receipt.get("output_sha256", receipt.get("output_hashes"))
    if isinstance(paths, list) and isinstance(hashes, dict):
        bindings.extend((path, hashes.get(path)) for path in paths if isinstance(path, str))
    if isinstance(hashes, dict):
        bindings.extend((path, digest) for path, digest in hashes.items() if isinstance(path, str))
    return list(dict.fromkeys(bindings))


class BatchBFreezeContract(unittest.TestCase):
    """B0 exact active-input, scope, predecessor, and direction contracts."""

    def test_v6_selects_exact_additive_inputs(self) -> None:
        """Fails when: V6 substitutes, omits, or reads mutated V3/V2, direction, browser, review-v4, or v5 bytes."""
        defects = [relative for relative, digest in ACTIVE_INPUT_HASHES.items() if not (REPO_ROOT / relative).is_file() or file_hash(REPO_ROOT / relative) != digest]
        self.assertEqual(defects, [], f"active input drift: {defects}")
        receipt = load_json(V6_RECEIPT_PATH)
        self.assertEqual(receipt.get("input_hashes"), ACTIVE_INPUT_HASHES)

    def test_scope_is_exact_across_every_active_artifact(self) -> None:
        """Fails when: discovery, ledgers, browser, asset, review, or direction adds, removes, or substitutes a Batch B game."""
        expected = set(GAMES)
        discovery = load_json(DISCOVERY_PATH)
        self.assertEqual({item["normalized_id"] for item in discovery["authoritative_scope"]}, expected)
        self.assertEqual(set(LEDGER_PATHS), expected)
        for game, title in GAMES.items():
            ledger = load_json(LEDGER_PATHS[game])
            self.assertEqual(ledger.get("game"), title)
            self.assertEqual(ledger.get("normalized_id", ledger.get("normalized_game_id")), game)
            self.assertEqual(ledger.get("phase_base_sha"), PHASE_BASE_SHA)
        self.assertEqual({item["normalized_id"] for item in load_json(BROWSER_PATH)["games"]}, expected)
        self.assertEqual({item["ownership"] for item in load_json(ASSET_PATH)["records"]}, expected)
        self.assertEqual(set(load_json(REVIEW_PATH)["scope"]), expected)

    def test_phase_bases_and_predecessors_remain_frozen(self) -> None:
        """Fails when: a selected artifact changes the immutable phase base, source baseline, or accepted predecessor hashes."""
        discovery = load_json(DISCOVERY_PATH)
        self.assertEqual(discovery["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(discovery["predecessor_bindings"]["source_baseline_revision"], SOURCE_BASELINE)
        expected = {
            "t2_accepted_denominator_sha256": "d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729",
            "t2_accepted_partition_sha256": "6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0",
            "t3_accepted_pilot_sha256": "cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b",
        }
        for key, digest in expected.items():
            self.assertEqual(discovery["predecessor_bindings"][key], digest)

    def test_global_provenance_direction_is_exact_and_non_waiving(self) -> None:
        """Fails when: local-verifiability policy is stale, uncommitted, out of scope, or waives a source/lifecycle integrity gate."""
        direction = load_json(PROVENANCE_DIRECTION_PATH)
        relative = str(PROVENANCE_DIRECTION_PATH.relative_to(REPO_ROOT))
        committed = git_show("d77044c35571dabde108098e5c9f9dd62722327d", relative)
        self.assertEqual(PROVENANCE_DIRECTION_PATH.read_bytes(), committed)
        self.assertEqual(direction.get("decision"), "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE")
        self.assertIn(TRACK_ID, direction["scope"]["tracks"])
        self.assertIn("truth-test-author", direction["scope"]["roles"])
        self.assertIn("stale or mutated committed artifacts", direction["non_waived"])
        self.assertIn("missing candidate, approval, or accepted lifecycle artifacts", direction["non_waived"])
        controls = "\n".join(direction["required_compensating_controls"])
        self.assertIn("committed Git binding", controls)
        self.assertIn("remain fail-closed", controls)


class BatchBCollectorPackageContract(unittest.TestCase):
    """B1 selected-package structure, counts, envelopes, and source coverage."""

    def test_selected_packages_are_nonempty_and_counts_reconcile(self) -> None:
        """Fails when: a selected V3/V2/original package is missing, empty, or reports a count different from its records."""
        expected_counts = {"village-guardian": (73, 4), "archers-revenge": (20, 4), "storm-castle-tower": (42, 4)}
        for game, (factual, negative) in expected_counts.items():
            self.assertEqual(len(claims(game)), factual, game)
            self.assertEqual(len(fixtures(game)), negative, game)
            self.assertTrue(METHOD_PATHS[game].is_file(), game)
            report = load_json(REPORT_PATHS[game])
            if game == "village-guardian":
                self.assertEqual(report["counts"]["factual_claims"], factual)
                self.assertEqual(report["counts"]["negative_fixtures"], negative)
            elif game == "archers-revenge":
                self.assertEqual(report["claim_totals"]["factual_claims"], factual)
                self.assertEqual(report["claim_totals"]["negative_fixtures"], negative)
            else:
                self.assertEqual(report["claims_total"], factual)
                self.assertEqual(report["negative_fixture_total"], negative)
        all_ids = [claim_id(item) for game in GAMES for item in claims(game)]
        self.assertEqual(len(all_ids), 135)
        self.assertEqual(len(all_ids), len(set(all_ids)))

    def test_every_positive_claim_source_envelope_rederives(self) -> None:
        """Fails when: any of the 129 selected positive claims cites an unreachable object or mismatched blob/range hash."""
        errors = [error for game in GAMES for item in claims(game) if item.get("relative_path") if (error := citation_error(item, claim_id(item)))]
        self.assertEqual(errors, [], f"claim envelope failures: {errors}")
        self.assertEqual(sum(bool(item.get("relative_path")) for game in GAMES for item in claims(game)), 129)

    def test_every_bounded_claim_envelope_rederives(self) -> None:
        """Fails when: an Archer absence or any Storm absence/history query changes domain, output, status, or hash."""
        self.assertEqual(archer_absence_errors(), [])
        self.assertEqual(storm_query_errors(), [])
        self.assertEqual(sum(not item.get("relative_path") for item in claims("storm-castle-tower")), 6)

    def test_village_source_coverage_rederives_independently(self) -> None:
        """Fails when: a Village V3 source-coverage blob, byte count, line count, or required config/test coverage record drifts."""
        ledger = load_json(LEDGER_PATHS["village-guardian"])
        errors: list[str] = []
        required = []
        for record in ledger.get("source_coverage", []):
            relative = record["relative_path"]
            blob = git_show(record["source_revision"], relative)
            if blob is None or sha256(blob) != record["blob_sha256"] or len(blob) != record["byte_count"]:
                errors.append(relative)
                continue
            if record.get("line_count") is not None and len(blob.splitlines()) != record["line_count"]:
                errors.append(f"{relative}:line-count")
            if record.get("required_configuration_or_test_source"):
                required.append(relative)
        self.assertEqual(errors, [])
        self.assertEqual(len(ledger["source_coverage"]), 12)
        self.assertEqual(len(required), 3)

    def test_denominator_and_disc_001_boundaries_are_preserved(self) -> None:
        """Fails when: active package scope loses denominator coverage or uses DISC-001 outside labeled process metadata."""
        village = load_json(LEDGER_PATHS["village-guardian"])["denominator_reconciliation"]
        archer = load_json(LEDGER_PATHS["archers-revenge"])["denominator_reconciliation"]
        storm = load_json(LEDGER_PATHS["storm-castle-tower"])["counts"]
        self.assertEqual((village["assigned_items"], village["covered_items"], village["unassigned_items"], village["duplicate_items"]), (16, 16, [], []))
        self.assertIn("three baseline binary candidates", archer["assets"])
        self.assertEqual((storm["denominator_mismatches"], storm["unsupported_accepted_claims"]), (0, 0))
        for path in (*LEDGER_PATHS.values(), *REPORT_PATHS.values(), ASSET_PATH):
            document = load_json(path)
            locations: list[tuple[str, ...]] = []

            def walk(value: Any, keys: tuple[str, ...] = ()) -> None:
                if isinstance(value, dict):
                    for key, child in value.items():
                        walk(child, (*keys, key))
                elif isinstance(value, list):
                    for index, child in enumerate(value):
                        walk(child, (*keys, str(index)))
                elif "DISC-001" in str(value):
                    locations.append(keys)

            walk(document)
            self.assertTrue(locations, path.name)
            self.assertTrue(all("carried_forward_disclosures" in location for location in locations), f"{path.name}:{locations}")


class BatchBMapperPackageContract(unittest.TestCase):
    """B2 mapper references must be regenerated for active additive claim IDs."""

    def test_mappers_bind_every_exact_active_claim_id(self) -> None:
        """Fails when: an existing mapper still binds superseded Village/Archer populations or references foreign/fixture IDs."""
        defects: list[str] = []
        for game in GAMES:
            blueprint = load_json(TRACK_DIR / f"{game}-blueprint-batch-b.json")
            references = set(iter_claim_references(blueprint))
            active = {claim_id(item) for item in claims(game)}
            if references != active:
                defects.append(f"{game}:missing={len(active - references)},stale={len(references - active)}")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B2_STALE_MAPPERS]: " + ", ".join(defects))


class BatchBClaimTruthContract(unittest.TestCase):
    """B3 independent all-claim semantic-atom validation."""

    def test_village_v3_semantic_atoms_all_match_exact_ranges(self) -> None:
        """Fails when: any Village V3 claim lacks a semantic manifest or a required/count/signature/forbidden atom disagrees with its exact citation."""
        defects: list[str] = []
        for item in claims("village-guardian"):
            claim = claim_id(item)
            check = item.get("semantic_check")
            if not isinstance(check, dict) or not check:
                defects.append(f"{claim}:missing-manifest")
                continue
            data = cited_bytes(item)
            text = data.decode("utf-8", errors="replace")
            for atom in check.get("required_substrings", []):
                if atom not in text:
                    defects.append(f"{claim}:missing:{atom}")
            for atom in check.get("forbidden_substrings", []):
                if atom in text:
                    defects.append(f"{claim}:forbidden:{atom}")
            count = check.get("expected_substring_count")
            if isinstance(count, dict) and text.count(str(count.get("needle"))) != count.get("count"):
                defects.append(f"{claim}:count")
            signature = check.get("binary_signature_hex")
            if isinstance(signature, str) and not data.startswith(bytes.fromhex(signature)):
                defects.append(f"{claim}:binary-signature")
        self.assertEqual(defects, [], f"Village semantic failures: {defects}")
        self.assertEqual(len(claims("village-guardian")), 73)

    def test_archer_and_storm_semantic_atoms_all_match_exact_ranges(self) -> None:
        """Fails when: any positive Archer/Storm claim is unlisted or one of its independently selected source atoms is absent."""
        selected = [item for game in ("archers-revenge", "storm-castle-tower") for item in claims(game) if item.get("relative_path")]
        selected_ids = {claim_id(item) for item in selected}
        expected_ids = {key for key in EXTERNAL_SEMANTIC_ATOMS if key.startswith("AR-B2-") or key.startswith("SCT-")}
        self.assertEqual(selected_ids, expected_ids)
        defects: list[str] = []
        for item in selected:
            data = cited_bytes(item)
            text = data.decode("utf-8", errors="replace")
            for atom in EXTERNAL_SEMANTIC_ATOMS[claim_id(item)]:
                if atom == "89504e470d0a1a0a":
                    if not data.startswith(bytes.fromhex(atom)):
                        defects.append(f"{claim_id(item)}:PNG")
                elif atom not in text:
                    defects.append(f"{claim_id(item)}:{atom}")
        self.assertEqual(defects, [], f"semantic atom failures: {defects}")
        self.assertEqual(len(selected), 56)

    def test_binary_and_line_count_semantics_are_recomputed(self) -> None:
        """Fails when: binary dimensions/signatures or whole-file Archer source line-count atoms are accepted from prose alone."""
        storm_png = next(item for item in claims("storm-castle-tower") if claim_id(item) == "SCT-ASSET-002")
        png = cited_bytes(storm_png)
        self.assertEqual(png[:8], bytes.fromhex("89504e470d0a1a0a"))
        self.assertEqual(struct.unpack(">IIBB", png[16:26]), (390, 857, 8, 2))
        expected_lines = {"AR-B2-EFFORT-001": 373, "AR-B2-EFFORT-002": 337, "AR-B2-EFFORT-003": 151}
        for item in claims("archers-revenge"):
            if claim_id(item) in expected_lines:
                blob = git_show(item["source_revision"], item["relative_path"])
                self.assertIsNotNone(blob)
                self.assertEqual(len(blob.splitlines()), expected_lines[claim_id(item)])

    def test_every_claim_has_a_fact_interpretation_and_temporal_boundary(self) -> None:
        """Fails when: any active claim omits its source fact, interpretation, evidence class, confidence, collector, conflict, or review boundary."""
        defects: list[str] = []
        for game in GAMES:
            for item in claims(game):
                claim = claim_id(item)
                for key in ("category", "confidence", "evidence_class", "discovery_method", "collector_id", "interpretation", "reviewer_disposition"):
                    if item.get(key) in (None, "", []):
                        defects.append(f"{claim}.{key}")
                if not item.get("source_fact", item.get("exact_source_fact")):
                    defects.append(f"{claim}.source_fact")
                if "conflict" not in item and "conflict_state" not in item:
                    defects.append(f"{claim}.conflict")
        self.assertEqual(defects, [], f"claim boundary defects: {defects}")

    def test_every_test_has_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any V6 truth test lacks an auditable `Fails when:` falsification condition."""
        missing: list[str] = []
        module = __import__(__name__)
        for _, cls in inspect.getmembers(module, inspect.isclass):
            if cls.__module__ != __name__ or not cls.__name__.startswith("BatchB"):
                continue
            for name, method in inspect.getmembers(cls, inspect.isfunction):
                if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or ""):
                    missing.append(f"{cls.__name__}.{name}")
        self.assertEqual(missing, [])


class BatchBNegativeFixtureContract(unittest.TestCase):
    """B3 all-fixture envelope and independent refutation contracts."""

    def test_all_twelve_fixtures_are_unique_rejected_and_excluded(self) -> None:
        """Fails when: a game lacks four fixture classes, a fixture is accepted/skipped, or fixture IDs enter the 135 factual IDs."""
        factual = {claim_id(item) for game in GAMES for item in claims(game)}
        fixture_ids: list[str] = []
        for game in GAMES:
            records = fixtures(game)
            kinds = " ".join(str(item.get("kind", item.get("fixture_class", ""))).lower() for item in records)
            self.assertEqual(len(records), 4, game)
            self.assertIn("directory", kinds)
            self.assertTrue("fabricated" in kinds or "plausible" in kinds)
            self.assertTrue("responsive" in kinds or "template" in kinds)
            for item in records:
                fixture_ids.append(str(item.get("fixture_id")))
                self.assertIn(str(item.get("expected_disposition", "")).upper(), {"FAIL", "REJECT"})
                self.assertFalse(item.get("counts_as_claim", item.get("counts_as_factual_claim", False)))
        self.assertEqual(len(fixture_ids), 12)
        self.assertEqual(len(fixture_ids), len(set(fixture_ids)))
        self.assertFalse(factual & set(fixture_ids))

    def test_village_fixture_envelopes_and_semantic_refutations_rederive(self) -> None:
        """Fails when: a Village V3 fixture has a stale envelope, missing atom, non-tree directory, or permits fabricated Redis/current-responsive behavior."""
        defects: list[str] = []
        for fixture in fixtures("village-guardian"):
            fixture_id = str(fixture["fixture_id"])
            error = citation_error(fixture, fixture_id)
            if error:
                defects.append(error)
                continue
            text = cited_bytes(fixture).decode("utf-8", errors="replace")
            for atom in fixture["semantic_check"].get("required_substrings", []):
                if atom not in text:
                    defects.append(f"{fixture_id}:missing:{atom}")
            for atom in fixture["semantic_check"].get("forbidden_substrings", []):
                if atom in text:
                    defects.append(f"{fixture_id}:forbidden:{atom}")
        directory = next(item["invalid_primary_path"] for item in fixtures("village-guardian") if item.get("invalid_primary_path"))
        self.assertEqual(git("cat-file", "-t", f"{SOURCE_BASELINE}:{directory}").stdout, b"tree\n")
        self.assertEqual(defects, [])

    def test_archer_fixture_refutations_rederive_from_source_boundaries(self) -> None:
        """Fails when: Archer historical copy/presence/CSS or a directory is promoted to current runtime, asset usage, or responsive proof."""
        records = {item["fixture_id"]: item for item in fixtures("archers-revenge")}
        self.assertIn("historical", records["AR-B2-FIX-001"]["reason"].lower())
        command = run_recorded_git(records["AR-B2-FIX-002"]["source_checked_command"])
        self.assertIsNotNone(command)
        self.assertEqual(command.stdout, b"tree\n")
        asset = next(item for item in claims("archers-revenge") if claim_id(item) == records["AR-B2-FIX-003"]["source_checked_claim_id"])
        self.assertEqual(asset["interpretation"], "File presence only; no source call site or live loading is established.")
        predecessor = load_json(TRACK_DIR / "archers-revenge-claim-ledger-batch-b.json")
        responsive = next(item for item in predecessor["claims"] if item["claim_id"] == records["AR-B2-FIX-004"]["source_checked_claim_id"])
        self.assertIn("historical CSS declaration", responsive["interpretation"])

    def test_storm_fixture_refutations_rederive_from_exact_queries_and_guards(self) -> None:
        """Fails when: Storm conditional defeat, tree citation, absent current route/PNG loading, or historical responsive declarations are promoted."""
        records = {item["fixture_id"]: item for item in fixtures("storm-castle-tower")}
        incorrect = next(item for item in claims("storm-castle-tower") if claim_id(item) == "SCT-MECH-H005")
        text = cited_bytes(incorrect).decode()
        self.assertIn("lives - 1", text)
        self.assertIn("lives <= 0", text)
        self.assertNotIn("immediate", text.lower())
        self.assertIn("tree", records["SCT-NEG-002"]["source_bounded_reason"])
        self.assertEqual(storm_query_errors(), [])
        self.assertIn("deleted historical", records["SCT-NEG-004"]["source_bounded_reason"])


class BatchBReceiptContract(unittest.TestCase):
    """Exact local receipt integrity under the owner provenance direction."""

    def test_pinned_existing_receipt_bytes_are_not_mutated(self) -> None:
        """Fails when: any selected pre-v6 receipt is edited in place after its additive publication."""
        defects = [name for name, digest in PINNED_RECEIPT_HASHES.items() if file_hash(RECEIPTS_DIR / name) != digest]
        self.assertEqual(defects, [], f"mutated receipts: {defects}")

    def test_receipt_output_hashes_bind_current_exact_bytes(self) -> None:
        """Fails when: any selected receipt has a missing/malformed output hash or its declared output bytes are stale or mutated."""
        defects: list[str] = []
        for name in ACTIVE_RECEIPTS:
            receipt = load_json(RECEIPTS_DIR / name)
            bindings = output_bindings(receipt)
            if not bindings:
                defects.append(f"{name}:zero-bindings")
            for relative, digest in bindings:
                if relative == f"measure/tracks/apk_corpus_audit_action_defense_20260712/role-receipts/{name}" and digest is None:
                    continue
                if not isinstance(digest, str) or not HEX64.fullmatch(digest):
                    defects.append(f"{name}:{relative}:bad-hash")
                elif not (REPO_ROOT / relative).is_file() or file_hash(REPO_ROOT / relative) != digest:
                    defects.append(f"{name}:{relative}:byte-mismatch")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[STALE_RECEIPT]: " + ", ".join(defects))

    def test_unavailable_provider_fields_do_not_automatically_fail_local_receipts(self) -> None:
        """Fails when: truthful unavailable provider fields are fabricated or policy is misread as waiving local hash, scope, or review controls."""
        direction = load_json(PROVENANCE_DIRECTION_PATH)
        self.assertEqual(direction["decision"], "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE")
        for name in ACTIVE_RECEIPTS:
            receipt = load_json(RECEIPTS_DIR / name)
            self.assertEqual(receipt.get("track_id"), TRACK_ID, name)
            self.assertEqual(receipt.get("phase"), PHASE, name)
            self.assertEqual(receipt.get("phase_base_sha"), PHASE_BASE_SHA, name)
            serialized = json.dumps(receipt).lower()
            if "provider" in serialized:
                self.assertTrue("unavailable" in serialized or "not exposed" in serialized, name)
        self.assertIn("stale or mutated committed artifacts", direction["non_waived"])

    def test_v6_receipt_binds_exact_test_bytes_and_role_base(self) -> None:
        """Fails when: the fresh truth-author receipt selects another test, phase/role base, role, or current test hash."""
        receipt = load_json(V6_RECEIPT_PATH)
        self.assertEqual(receipt.get("role"), "truth-test-author-batch-b-v6")
        self.assertEqual(receipt.get("role_base_sha"), ROLE_BASE_SHA)
        binding = next((item for item in output_bindings(receipt) if item[0] == str(V6_PATH.relative_to(REPO_ROOT))), None)
        self.assertIsNotNone(binding)
        self.assertEqual(binding[1], file_hash(V6_PATH))


class BatchBBrowserContract(unittest.TestCase):
    """B4 bounded-green WebBridge evidence under the exact owner direction."""

    def test_exact_direction_authorizes_only_exact_browser_v3_dispositions(self) -> None:
        """Fails when: B4 uses another browser artifact, direction, tool, scope, or one-runnable/two-404 disposition set."""
        direction = load_json(WEBBRIDGE_DIRECTION_PATH)
        audit = load_json(BROWSER_PATH)
        self.assertEqual(direction["decision"], "WEBBRIDGE_ACCEPTED_FOR_B4")
        self.assertEqual(direction["scope"], "Batch B browser evidence only")
        self.assertEqual(direction["accepted_evidence"]["browser_audit_sha256"], file_hash(BROWSER_PATH))
        self.assertEqual(direction["accepted_evidence"]["tool"], "Kimi WebBridge")
        dispositions = {item["normalized_id"]: item["disposition"] for item in audit["games"]}
        self.assertEqual(dispositions, {"village-guardian": "runnable", "archers-revenge": "non-runnable", "storm-castle-tower": "non-runnable"})
        self.assertEqual((audit["counts"]["runnable_results"], audit["counts"]["non_runnable_results"], audit["counts"]["audit_blocked_results"]), (1, 2, 0))

    def test_synthetic_input_hidden_tab_and_scheduler_limits_are_non_waived(self) -> None:
        """Fails when: any WebBridge event is called trusted/native, hidden-tab timing becomes foreground timing, or the adapter replaces more than scheduling."""
        audit = load_json(BROWSER_PATH)
        village = next(item for item in audit["games"] if item["normalized_id"] == "village-guardian")
        events = [event for viewport in ("compact", "wide") for event in village[viewport]["real_input_events"]]
        self.assertEqual(len(events), 8)
        self.assertTrue(all(event["isTrusted"] is False for event in events))
        self.assertEqual(audit["counts"]["trusted_native_input_events"], 0)
        self.assertIs(audit["environment"]["browser_tab_active_during_audit"], False)
        self.assertEqual(audit["environment"]["browser_visibility_observed"], "hidden")
        boundary = village["scheduler_adapter_boundary"]
        self.assertIn("Only requestAnimationFrame scheduling was replaced", boundary["replacement"])
        self.assertEqual(set(boundary["not_replaced"]), {"game state", "sentence API", "completion API", "React transitions", "Konva rendering", "route wiring", "result UI"})
        self.assertIn("does not establish background-tab wall-clock timing or trusted native input", boundary["claim_limit"])

    def test_compact_wide_states_privacy_screenshot_and_console_limits_are_preserved(self) -> None:
        """Fails when: B4 lacks both viewport transitions, invents screenshots/full console history, or exposes student/unrelated-tab data."""
        audit = load_json(BROWSER_PATH)
        village = next(item for item in audit["games"] if item["normalized_id"] == "village-guardian")
        self.assertEqual(village["compact"]["viewport"], {"width": 390, "height": 844, "devicePixelRatio": 1})
        for viewport in ("compact", "wide"):
            for key in ("start_instruction_state", "active_state", "transition_state", "terminal_result_state", "real_input_events"):
                self.assertTrue(village[viewport][key], f"{viewport}.{key}")
        self.assertEqual(village["screenshots"], [])
        self.assertEqual(audit["counts"]["captured_artifacts"], 0)
        self.assertIn("No claim is made about console messages emitted before", "\n".join(village["console_observations"]))
        self.assertEqual(audit["privacy"]["student_data_records"], 0)
        self.assertIs(audit["privacy"]["unrelated_user_tabs_accessed"], False)
        self.assertIs(audit["privacy"]["published_browser_artifacts"], False)

    def test_non_runnable_404s_are_exact_revision_bounded_failures(self) -> None:
        """Fails when: Archer/Storm non-runnable records omit direct route/log/revision evidence or erase separately preserved history."""
        audit = load_json(BROWSER_PATH)
        expected_routes = {
            "archers-revenge": "http://localhost:3108/en/student/games/vocabulary/archers-revenge",
            "storm-castle-tower": "http://localhost:3108/en/student/games/sentence/storm-castle-tower",
        }
        for game, route in expected_routes.items():
            item = next(record for record in audit["games"] if record["normalized_id"] == game)
            self.assertEqual(item["runnable_disposition"], "non-runnable-at-role-revision")
            self.assertEqual(item["route"], route)
            self.assertEqual(item["revision"], audit["role_base_sha"])
            self.assertIn("HTTP 404 text/html", item["exact_failure"])
            self.assertEqual(item["route_observation"]["body_text"], "404\nThis page could not be found.")
            self.assertIn("does not deny", item["reviewed_bounded_reason"])

    def test_all_direction_non_waived_gates_and_review_limits_are_retained(self) -> None:
        """Fails when: B4 waives claim, denominator, asset, receipt, review, lifecycle, or completion correctness, or review v4 broadens WebBridge proof."""
        direction = load_json(WEBBRIDGE_DIRECTION_PATH)
        expected = {
            "claim citation and semantic correctness", "denominator completeness", "asset evidence",
            "role provenance and receipt integrity", "fresh independent review",
            "candidate, acceptance, and revocation lifecycle", "Village Guardian completion API contract correctness",
        }
        self.assertEqual(set(direction["non_waived_gates"]), expected)
        review = load_json(REVIEW_PATH)
        limits = review["webbridge_direction_binding"]["validated_limits"]
        self.assertTrue(any("isTrusted=false" in item for item in limits))
        self.assertTrue(any("hidden" in item and "scheduler" in item for item in limits))
        self.assertTrue(any("HTTP 400" in item and "no persistence" in item for item in limits))
        self.assertTrue(any("404s" in item and "historical" in item for item in limits))


class BatchBAssetContract(unittest.TestCase):
    """B4 exact asset-v2 denominator, source, and live-limit contracts."""

    def test_asset_v2_reconciles_exact_discovery_denominator_once(self) -> None:
        """Fails when: asset-v2 omits, duplicates, adds, or reassigns one of the exact twelve discovery candidates."""
        discovery = load_json(DISCOVERY_PATH)
        expected = {path: item["normalized_id"] for item in discovery["asset_candidates"] for path in item["paths"]}
        records = load_json(ASSET_PATH)["records"]
        actual = {item["path"]: item["ownership"] for item in records}
        self.assertEqual(len(records), 12)
        self.assertEqual(actual, expected)
        reconciliation = load_json(ASSET_PATH)["reconciliation"]
        self.assertEqual((reconciliation["assigned_candidates"], reconciliation["unassigned_count"], reconciliation["duplicate_count"]), (12, 0, 0))

    def test_every_asset_blob_and_source_anchor_rederives(self) -> None:
        """Fails when: any asset record has a stale baseline hash or a positive call-site blob/range/source atom mismatch."""
        defects: list[str] = []
        for item in load_json(ASSET_PATH)["records"]:
            error = citation_error(item, item["path"])
            if error:
                defects.append(error)
                continue
            evidence = item["source_evidence"]
            if "path" in evidence:
                anchor = {
                    "source_revision": item["revision"], "relative_path": evidence["path"],
                    "inclusive_range": evidence["range"], "blob_sha256": evidence["blob_sha256"],
                    "cited_range_sha256": evidence["range_sha256"],
                }
                error = citation_error(anchor, item["path"] + ":anchor")
                if error:
                    defects.append(error)
                elif Path(item["path"]).name not in cited_bytes(anchor).decode("utf-8", errors="replace"):
                    defects.append(item["path"] + ":anchor-semantic")
        self.assertEqual(defects, [], f"asset envelope failures: {defects}")

    def test_every_asset_absence_record_rederives_in_bounded_domains(self) -> None:
        """Fails when: a bounded-not-referenced/sidecar asset record lacks an exact empty basename query in the declared source domains."""
        audit = load_json(ASSET_PATH)
        domains = audit["method"]["bounded_source_domains"]
        defects: list[str] = []
        for item in audit["records"]:
            evidence = item["source_evidence"]
            if evidence.get("kind") != "bounded-absence" and item["usage_status"] != "bounded-not-referenced":
                continue
            result = git("grep", "-n", "-F", Path(item["path"]).name, item["revision"], "--", *domains)
            if result.returncode != 1 or result.stdout != b"" or sha256(result.stdout) != evidence.get("query_sha256", audit["method"]["empty_output_sha256"]):
                defects.append(item["path"])
        self.assertEqual(defects, [], f"asset absence failures: {defects}")

    def test_asset_v2_preserves_live_and_suitability_unknowns(self) -> None:
        """Fails when: canvas/catalog/file presence becomes physical PNG loading, suitability, licensing, production, completion, persistence, or XP proof."""
        audit = load_json(ASSET_PATH)
        self.assertEqual(audit["browser_binding"]["village_guardian"]["disposition"], "physical asset loading and scene usage unknown; no PNG load, cover load, completion, persistence, or XP claim")
        self.assertEqual(audit["reconciliation"]["source_runtime_asset_usages"], 0)
        self.assertEqual(audit["reconciliation"]["suitability_decisions"], 0)
        self.assertEqual(audit["reconciliation"]["licensing_decisions"], 0)
        self.assertEqual(audit["reconciliation"]["production_decisions"], 0)
        limits = "\n".join(audit["preserved_limits"])
        self.assertIn("isTrusted=false", limits)
        self.assertIn("hidden-tab scheduler", limits)
        self.assertIn("HTTP 400", limits)


class BatchBCompletionContract(unittest.TestCase):
    """The non-waived Village completion API success contract."""

    def test_village_completion_api_succeeds_before_persistence_or_xp_claims(self) -> None:
        """Fails when: observed completion requests remain HTTP 400 or no exact successful completion response exists."""
        village = next(item for item in load_json(BROWSER_PATH)["games"] if item["normalized_id"] == "village-guardian")
        network = "\n".join(village["network_observations"])
        success = "POST /api/v1/games/village-guardian/complete completed 200 application/json"
        self.assertIn(success, network, "EXPECTED_STAGE_RED[COMPLETION_API]: both observed completion POSTs returned HTTP 400")


class BatchBIndependentReviewContract(unittest.TestCase):
    """B5 exact review-v4 selection, freshness, sampling, and blocker contracts."""

    def test_review_v4_and_receipt_are_exact_committed_selected_inputs(self) -> None:
        """Fails when: V6 silently selects another review or current review-v4/receipt bytes differ from their pinned committed artifacts."""
        self.assertEqual(file_hash(REVIEW_PATH), ACTIVE_INPUT_HASHES[str(REVIEW_PATH.relative_to(REPO_ROOT))])
        self.assertEqual(file_hash(REVIEW_RECEIPT_PATH), ACTIVE_INPUT_HASHES[str(REVIEW_RECEIPT_PATH.relative_to(REPO_ROOT))])
        self.assertEqual(REVIEW_PATH.read_bytes(), git_show("a318f5473682e58e8d12e02b427beaddcd2a44e6", str(REVIEW_PATH.relative_to(REPO_ROOT))))
        review = load_json(REVIEW_PATH)
        receipt = load_json(REVIEW_RECEIPT_PATH)
        self.assertEqual(review["role"], "adversarial-reviewer-batch-b-v4")
        self.assertEqual(review["audited_head_sha"], receipt["audited_head_sha"])

    def test_review_v4_binds_every_exact_active_additive_input(self) -> None:
        """Fails when: fresh review-v4 predates or omits Village V3, Archer V2, asset V2, global direction, or V6 truth bytes."""
        inputs = load_json(REVIEW_RECEIPT_PATH).get("input_hashes", {})
        required = {
            str(LEDGER_PATHS["village-guardian"].relative_to(REPO_ROOT)): file_hash(LEDGER_PATHS["village-guardian"]),
            str(REPORT_PATHS["village-guardian"].relative_to(REPO_ROOT)): file_hash(REPORT_PATHS["village-guardian"]),
            str(LEDGER_PATHS["archers-revenge"].relative_to(REPO_ROOT)): file_hash(LEDGER_PATHS["archers-revenge"]),
            str(REPORT_PATHS["archers-revenge"].relative_to(REPO_ROOT)): file_hash(REPORT_PATHS["archers-revenge"]),
            str(ASSET_PATH.relative_to(REPO_ROOT)): file_hash(ASSET_PATH),
            str(PROVENANCE_DIRECTION_PATH.relative_to(REPO_ROOT)): file_hash(PROVENANCE_DIRECTION_PATH),
            str(V6_PATH.relative_to(REPO_ROOT)): file_hash(V6_PATH),
        }
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_STALE_REVIEW_V6]: " + ", ".join(defects))

    def test_review_has_zero_unresolved_blocking_findings_for_active_inputs(self) -> None:
        """Fails when: selected review-v4 reports any unresolved Critical, High, or Medium finding or does not authorize candidate publication."""
        review = load_json(REVIEW_PATH)
        unresolved = review["unresolved_findings"]
        defects = [severity for severity in ("critical", "high", "medium") if unresolved.get(severity) != 0]
        if review["authorization"]["candidate_authorized"] is not True:
            defects.append("candidate-not-authorized")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5_REVIEW_BLOCKERS]: " + ", ".join(defects))


class BatchBAcceptanceContract(unittest.TestCase):
    """B5 candidate, approval, and accepted-manifest existence gates."""

    def test_candidate_manifest_exists(self) -> None:
        """Fails when: the non-consumable Batch B candidate manifest has not been authored after all prerequisite gates."""
        self.assertTrue((TRACK_DIR / "candidate-cohort-manifest-batch-b.json").is_file(), "EXPECTED_STAGE_RED[CANDIDATE_MISSING]")

    def test_product_owner_acceptance_exists(self) -> None:
        """Fails when: authentic product-owner acceptance does not yet bind the exact candidate and fresh review."""
        self.assertTrue((TRACK_DIR / "product-owner-acceptance-batch-b.json").is_file(), "EXPECTED_STAGE_RED[APPROVAL_MISSING]")

    def test_accepted_manifest_exists(self) -> None:
        """Fails when: no accepted Batch B manifest exists after candidate and authentic approval ordering."""
        self.assertTrue((TRACK_DIR / "accepted-cohort-manifest-batch-b.json").is_file(), "EXPECTED_STAGE_RED[ACCEPTED_MANIFEST_MISSING]")


if __name__ == "__main__":
    unittest.main()
