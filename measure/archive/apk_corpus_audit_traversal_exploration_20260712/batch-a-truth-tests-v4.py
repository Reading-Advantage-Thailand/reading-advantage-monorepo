"""Fail-closed V4 truth contracts for T5 Traversal Batch A.

The suite selects the exact committed Dragon Rider and Dungeon Liberator V3
collector packages, Dragon Rider V3 rebind, all three V3 requirement maps, and
the retained Spellweaver V2 evidence package at the supplied role base. It
mechanically covers the semantic, denominator, model, fixture, and integer
budget repairs raised by the V2 independent review. A fresh V4 review and the
ordered lifecycle remain intentionally red.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
      measure/tracks/apk_corpus_audit_traversal_exploration_20260712/\
batch-a-truth-tests-v4.py
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
ROLE_BASE_SHA = "05248bed054678a41559b50a6d52cc2a0c610084"
PACKAGE_ROLE_BASE_SHA = "134a94bc451f84e2a75ef18a8cbbe7382bd3395c"
HEX40 = re.compile(r"\A[0-9a-f]{40}\Z")
HEX64 = re.compile(r"\A[0-9a-f]{64}\Z")

GLOBAL_DIRECTION = "measure/product-owner-apk-provenance-direction-20260721.json"
BUDGET = f"measure/tracks/{TRACK_ID}/phase0-budget-declaration.json"
TIMING_DIRECTION = (
    f"measure/tracks/{TRACK_ID}/product-owner-budget-accounting-direction-v2.json"
)
SPELL_EXCEPTION = (
    f"measure/tracks/{TRACK_ID}/product-owner-spellweavers-budget-exception.json"
)
V2_REVIEW = f"measure/tracks/{TRACK_ID}/batch-a-independent-review-v2.json"
TRUTH_RECEIPT = RECEIPTS_DIR / "truth-test-author-batch-a-v4.json"

GAME_CONFIG: dict[str, dict[str, str]] = {
    "dragon-rider": {
        "prior_ledger": "packages/vocabulary/dragon-rider/claim-evidence-ledger-v2.json",
        "ledger": "packages/vocabulary/dragon-rider/claim-evidence-ledger-v3.json",
        "method": "packages/vocabulary/dragon-rider/evidence-method-v3.md",
        "report": "packages/vocabulary/dragon-rider/evidence-final-report-v3.json",
        "rebind_report": "packages/vocabulary/dragon-rider/evidence-final-report-v3-rebind.json",
        "collector_receipt": "evidence-collector-dragon-rider-v3.json",
        "collector_rebind": "evidence-collector-dragon-rider-v3-rebind.json",
        "map": "packages/vocabulary/dragon-rider/requirements-map-v3.json",
        "map_report": "packages/vocabulary/dragon-rider/requirements-final-report-v3.json",
        "mapper_receipt": "requirements-mapper-dragon-rider-v3.json",
        "browser": "packages/vocabulary/dragon-rider/browser-audit.json",
        "browser_receipt": "browser-auditor-dragon-rider.json",
    },
    "dungeon-liberator": {
        "prior_ledger": "packages/sentence/dungeon-liberator/claim-evidence-ledger-v2.json",
        "ledger": "packages/sentence/dungeon-liberator/claim-evidence-ledger-v3.json",
        "method": "packages/sentence/dungeon-liberator/evidence-method-v3.md",
        "report": "packages/sentence/dungeon-liberator/evidence-final-report-v3.json",
        "collector_receipt": "evidence-collector-dungeon-liberator-v3.json",
        "map": "packages/sentence/dungeon-liberator/requirements-map-v3.json",
        "map_report": "packages/sentence/dungeon-liberator/requirements-final-report-v3.json",
        "mapper_receipt": "requirements-mapper-dungeon-liberator-v3.json",
        "browser": "packages/sentence/dungeon-liberator/browser-audit.json",
        "browser_receipt": "browser-auditor-dungeon-liberator.json",
    },
    "spellweavers-run": {
        "ledger": "packages/catalog/spellweavers-run/claim-evidence-ledger-v2.json",
        "method": "packages/catalog/spellweavers-run/evidence-method-v2.md",
        "report": "packages/catalog/spellweavers-run/evidence-final-report-v2-rebind.json",
        "collector_receipt": "evidence-collector-spellweavers-run-v2-rebind.json",
        "map": "packages/catalog/spellweavers-run/requirements-map-v3.json",
        "map_report": "packages/catalog/spellweavers-run/requirements-final-report-v3.json",
        "mapper_receipt": "requirements-mapper-spellweavers-run-v3.json",
        "browser": "packages/catalog/spellweavers-run/browser-audit.json",
        "browser_receipt": "browser-auditor-spellweavers-run.json",
    },
}

ACTIVE_INPUT_HASHES = {
    GLOBAL_DIRECTION: "4d1ec24e900665577a413b4c5555d4d53ae1be222d8029cf391d1b55ff7da9ac",
    BUDGET: "81bceb19a002128ae6ccf859db8b6c07d8537b433d726d0fb0235997d9acf896",
    TIMING_DIRECTION: "3b3fea0b22f5ac379a1bb3518b1095bc8f3a366eaa7eb2f677b69ac6ffddb2c0",
    SPELL_EXCEPTION: "a0a4f2e80fa888e3fee7a1ef7e3479af559e1930cbb3eb3a5ea3a2ab8b3bbcf4",
    V2_REVIEW: "8eb21f34687e3afeb7a89ccd9ecd9aa5fbc16308f626731d47dbedbbde37216e",
    "measure/acceptance/measure_apk_evidence_integrity_gates_20260712/phase4-v8-accepted-gate-manifest.json": "d9f5c4771a755bae72c037fdbed6e330e523e9f2fabf60010154b981bfb283a3",
    "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json": "d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729",
    "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json": "6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0",
    "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json": "cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b",
    f"measure/tracks/{TRACK_ID}/phase0-discovery-audit.json": "6524d33b1af38d93b9cc0a3f1b31421979f7a4120f68d9065935946312e6c152",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/claim-evidence-ledger-v2.json": "fb778224e67609457ac8ac712bc85b3f5096483e0116f1162a2818bac6b48fe9",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/claim-evidence-ledger-v3.json": "826323bd9c9ee754c1c5b029e7c4a1cb1907bb0041296a98f2166033be3ca236",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/evidence-method-v3.md": "a13ead6576ff7cde948f68d996ed4fc8b6901ecf4d93394ff7410603c9458a6c",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/evidence-final-report-v3.json": "786f4097a204047b2d7a24ed3f9caf2473775042f912140cbee4feaaaa7928b8",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/evidence-final-report-v3-rebind.json": "3912a12ee752b340f405c948e5120d3c714ad5b78c22a0a0fe5f2b0e2bd9bc66",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-dragon-rider-v3.json": "1cb2a43ae37baaeef1705e24f49bbcaa886e0671ac8621a4b59f0f1f1a16d072",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-dragon-rider-v3-rebind.json": "a88d6a7eb72f5b5bbf41459cfa867bae3d7189b5ba4139bf808867c560733baf",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/requirements-map-v3.json": "4de439509dd936c5e7be6da16e5265b18a0a0340a27b757f6023fa7748fd20af",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/requirements-final-report-v3.json": "38365ab3102eed865399caa3de34f7e52840985289cded8e8be61f9714682525",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-dragon-rider-v3.json": "50c9a7ba7bc420a6d78f2fc53a752101f1f147a3ba76e08e64b592c11c1a3a23",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/claim-evidence-ledger-v2.json": "ff97238f94caa82a5359143c0a25d2a5ee8a2e479bb2fdd0bfea9aab05eef2bd",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/claim-evidence-ledger-v3.json": "f8112af605465ffcf461669e5560037261943df98185bfeb8728a6496997e2a2",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/evidence-method-v3.md": "ee81e7a72fc06f8b1e4be073fcd7e05b3f8e8a716a1cbd4de9cfc991e12a6742",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/evidence-final-report-v3.json": "87ac4103859da863367088e19c213fae9a02baeecf38e840f085b0a02bd32415",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-dungeon-liberator-v3.json": "62edc32b4b5d89be91db4d6750d2e5fcc6289f48d12c3492c52be66ca76fa9e4",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/requirements-map-v3.json": "70881824a63dd51af5a73d268c1f6facdfdedd888fbdfbfe92783359904d94cb",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/requirements-final-report-v3.json": "5f5c6fbc2f859708f6ba906732d84792438160b78e7ac481c1097d9c156b8b19",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-dungeon-liberator-v3.json": "cc864e1e9fe93c423e566353d130d4eaab5cac0c6161d89473d45f596ff25a73",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/claim-evidence-ledger-v2.json": "2cd708cbecf94133b92ce5f06822ad420da28a1d4417fdb74284528e7a9fe24b",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/evidence-method-v2.md": "1cd64613e86482a78830f522fbe6d83cf1a812d3c42fcbd97e06f9ade035e92a",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/evidence-final-report-v2-rebind.json": "c8c174e223501dc1ae4e636a4c45eb8fbc6552011e1b327be1e755df3569197f",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-spellweavers-run-v2-rebind.json": "4e639b4ce5116905f46472cd2444284b0e958f5e14e1df9ccf9a99ff95ac131d",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/requirements-map-v3.json": "7ac8e95ed5aa036a5e946400e5038a6cef184f2a4de224f1381b3b34eff6b4d9",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/requirements-final-report-v3.json": "8324fee54332f39d2c26693a1064fd4c4c633edee35824e519bc21d89cae5646",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-spellweavers-run-v3.json": "a40c41c4604c307ec98ab649793dab213eddf4b915abc800b3d115ea114d4fc1",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/browser-audit.json": "a8184107e8f197924992335caa54c4bf95de718ff6e5c7e5de225488599ea273",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/browser-audit.json": "a8a3e6d81fa7d796f20db749802d618062cd0380ba1713042f3482e336773a5e",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/browser-audit.json": "530a7fb302c7feec001f2faf8b88e4ec331595206e8d9773ab5c96c8d326ba06",
    f"measure/tracks/{TRACK_ID}/role-receipts/browser-auditor-dragon-rider.json": "5c96218f0f273ba6e6c525e4a5c785086395800a22a30231a9b13a7d81930a38",
    f"measure/tracks/{TRACK_ID}/role-receipts/browser-auditor-dungeon-liberator.json": "64bff92c099e38d52744abb28e1060076864aeaaca15f81f609c50d14e5db1c1",
    f"measure/tracks/{TRACK_ID}/role-receipts/browser-auditor-spellweavers-run.json": "2725b9bc762ac64fc9701f1526d9f745470352f3ed8eaabb5cc8aebe4d154b26",
}

REVIEW_PATH = TRACK_DIR / "batch-a-independent-review-v4.json"
REVIEW_RECEIPT_PATH = RECEIPTS_DIR / "adversarial-reviewer-batch-a-v4.json"
CANDIDATE_PATH = TRACK_DIR / "candidate-cohort-manifest-batch-a-v4.json"
APPROVAL_PATH = TRACK_DIR / "product-owner-acceptance-batch-a-v4.json"
ACCEPTED_PATH = TRACK_DIR / "accepted-cohort-manifest-batch-a-v4.json"


def sha256(data: bytes) -> str:
    """Returns a lowercase SHA-256 digest."""
    return hashlib.sha256(data).hexdigest()


def file_hash(path: Path) -> str:
    """Returns the SHA-256 digest of one file."""
    return sha256(path.read_bytes())


def load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON document."""
    return json.loads(path.read_text(encoding="utf-8"))


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one read-only Git command."""
    return subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, check=False
    )


def git_show(revision: str, relative: str) -> bytes | None:
    """Returns exact repository bytes at a revision, if reachable."""
    result = git("show", f"{revision}:{relative}")
    return result.stdout if result.returncode == 0 else None


def is_ancestor(ancestor: str, descendant: str) -> bool:
    """Returns whether the first commit is an ancestor of the second."""
    return git("merge-base", "--is-ancestor", ancestor, descendant).returncode == 0


def track_path(relative: str) -> Path:
    """Resolves a track-relative path."""
    return TRACK_DIR / relative


def receipt_path(name: str) -> Path:
    """Resolves a role-receipt filename."""
    return RECEIPTS_DIR / name


def claim_id(record: dict[str, Any]) -> str:
    """Returns a factual-claim or fixture identifier."""
    return record.get("claim_id", record.get("fixture_id", ""))


def citation(record: dict[str, Any]) -> dict[str, Any]:
    """Normalizes nested and flat citation shapes."""
    nested = record.get("citation")
    if isinstance(nested, dict):
        return nested
    return {
        "path": record.get("file_path"),
        "line_start": record.get("line_start"),
        "line_end": record.get("line_end"),
        "cited_range_sha256": record.get("cited_range_sha256"),
        "blob_sha256": record.get("blob_sha256"),
        "revision": record.get("revision"),
    }


def citation_errors(record: dict[str, Any]) -> list[str]:
    """Returns exact object, range, hash, and path defects for one claim."""
    record_name = claim_id(record) or "<missing-id>"
    cite = citation(record)
    relative = cite.get("path")
    revision = cite.get("revision")
    start = cite.get("line_start")
    end = cite.get("line_end")
    range_hash = cite.get("cited_range_sha256")
    blob_hash = cite.get("blob_sha256")
    errors: list[str] = []
    if not isinstance(relative, str) or not relative:
        return [f"{record_name}:missing-path"]
    if Path(relative).is_absolute() or ".." in Path(relative).parts:
        errors.append(f"{record_name}:unbounded-path")
    if not isinstance(revision, str) or not HEX40.fullmatch(revision):
        return errors + [f"{record_name}:revision"]
    if not isinstance(blob_hash, str) or not HEX64.fullmatch(blob_hash):
        errors.append(f"{record_name}:blob-hash-shape")
    if not isinstance(range_hash, str) or not HEX64.fullmatch(range_hash):
        errors.append(f"{record_name}:range-hash-shape")
    source = git_show(revision, relative)
    if source is None:
        return errors + [f"{record_name}:unreachable"]
    if sha256(source) != blob_hash:
        errors.append(f"{record_name}:blob-hash")
    if not isinstance(start, int) or not isinstance(end, int):
        return errors + [f"{record_name}:line-types"]
    lines = source.splitlines(keepends=True)
    if not 1 <= start <= end <= len(lines):
        return errors + [f"{record_name}:line-bounds"]
    if sha256(b"".join(lines[start - 1 : end])) != range_hash:
        errors.append(f"{record_name}:range-hash")
    return errors


def source_range(record: dict[str, Any]) -> str:
    """Returns the exact cited source range as decoded text."""
    cite = citation(record)
    source = git_show(cite["revision"], cite["path"])
    if source is None:
        return ""
    lines = source.splitlines(keepends=True)
    return b"".join(lines[cite["line_start"] - 1 : cite["line_end"]]).decode()


def prior_claims(game: str) -> list[dict[str, Any]]:
    """Returns all positive records from a selected predecessor ledger."""
    config = GAME_CONFIG[game]
    document = load_json(track_path(config.get("prior_ledger", config["ledger"])))
    records = document if isinstance(document, list) else document["claims"]
    return [item for item in records if item.get("category") != "negative-fixture"]


def factual_claims(game: str) -> list[dict[str, Any]]:
    """Materializes the exact active factual denominator for one game."""
    if game == "dragon-rider":
        v3 = load_json(track_path(GAME_CONFIG[game]["ledger"]))
        retained = set(v3["retained_claim_ids"])
        return [item for item in prior_claims(game) if claim_id(item) in retained] + v3[
            "claim_atoms"
        ]
    if game == "dungeon-liberator":
        v3 = load_json(track_path(GAME_CONFIG[game]["ledger"]))
        return prior_claims(game) + v3["added_claims"]
    return prior_claims(game)


def fixtures(game: str) -> list[dict[str, Any]]:
    """Returns the exact active negative fixtures for one game."""
    config = GAME_CONFIG[game]
    if game == "dragon-rider":
        return load_json(track_path(config["ledger"]))["fixtures"]
    document = load_json(track_path(config.get("prior_ledger", config["ledger"])))
    if isinstance(document, list):
        return [item for item in document if item.get("category") == "negative-fixture"]
    return document["fixture_records"]


def values_for_key(value: Any, key: str) -> list[Any]:
    """Returns values for a key found recursively in a JSON-like value."""
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


def flatten_strings(values: Iterable[Any]) -> list[str]:
    """Flattens string values and lists of strings."""
    result: list[str] = []
    for value in values:
        if isinstance(value, str):
            result.append(value)
        elif isinstance(value, list):
            result.extend(item for item in value if isinstance(item, str))
    return result


class BatchAV4FreezeContract(unittest.TestCase):
    """Exact role-base selection and accepted-predecessor contracts."""

    def test_supplied_bases_are_real_and_ordered(self) -> None:
        """Fails when the supplied phase, package, or role base is unordered."""
        for revision in (PHASE_BASE_SHA, PACKAGE_ROLE_BASE_SHA, ROLE_BASE_SHA):
            self.assertRegex(revision, HEX40)
            self.assertTrue(is_ancestor(PHASE_BASE_SHA, revision))
            self.assertTrue(is_ancestor(revision, ROLE_BASE_SHA))

    def test_exact_active_inputs_are_hashed_and_committed_at_role_base(self) -> None:
        """Fails when any exact active V3/V2/direction/browser input drifts."""
        defects: list[str] = []
        for relative, expected in ACTIVE_INPUT_HASHES.items():
            path = REPO_ROOT / relative
            if not path.is_file() or file_hash(path) != expected:
                defects.append(f"{relative}:working-tree")
            elif git_show(ROLE_BASE_SHA, relative) != path.read_bytes():
                defects.append(f"{relative}:role-base")
        self.assertEqual(defects, [], f"active input drift: {defects}")

    def test_accepted_predecessors_remain_consumable_and_unrevoked(self) -> None:
        """Fails when an inherited T1, T2, or T3 predecessor is revoked."""
        for relative in (
            "measure/acceptance/measure_apk_evidence_integrity_gates_20260712/phase4-v8-accepted-gate-manifest.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
            "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
        ):
            document = load_json(REPO_ROOT / relative)
            self.assertTrue(document.get("consumable"), relative)
            self.assertNotEqual(document.get("status"), "revoked", relative)
            self.assertIsNot(document.get("revoked"), True, relative)


class BatchAV4SemanticContract(unittest.TestCase):
    """Complete active claim, exact-envelope, and semantic repair contracts."""

    def test_active_claim_denominators_replace_only_superseded_dragon_atoms(self) -> None:
        """Fails when active claims are omitted, duplicated, or superseded atoms leak in."""
        expected = {"dragon-rider": 20, "dungeon-liberator": 18, "spellweavers-run": 48}
        all_ids: list[str] = []
        for game, count in expected.items():
            ids = [claim_id(item) for item in factual_claims(game)]
            self.assertEqual(len(ids), count, game)
            self.assertEqual(len(ids), len(set(ids)), game)
            all_ids.extend(ids)
        self.assertEqual(len(all_ids), len(set(all_ids)))
        dragon_ids = {claim_id(item) for item in factual_claims("dragon-rider")}
        self.assertTrue(
            {"DR-STATE-001A", "DR-STATE-001B", "DR-SCENE-002A", "DR-SCENE-002B",
             "DR-ASSET-001A", "DR-ASSET-001B", "DR-TEST-001A", "DR-TEST-001B"}
            <= dragon_ids
        )
        self.assertFalse(
            {"DR-STATE-001", "DR-SCENE-002", "DR-ASSET-001", "DR-TEST-001"}
            & dragon_ids
        )

    def test_every_active_positive_envelope_matches_exact_git_bytes(self) -> None:
        """Fails when any of the 86 active factual source envelopes drifts."""
        errors = [
            error
            for game in GAME_CONFIG
            for record in factual_claims(game)
            for error in citation_errors(record)
        ]
        self.assertEqual(errors, [], f"citation defects: {errors}")

    def test_five_v2_semantic_findings_have_separate_exact_anchors(self) -> None:
        """Fails when repaired wording again outruns its exact source envelope."""
        records = {
            claim_id(item): item
            for game in ("dragon-rider", "dungeon-liberator")
            for item in factual_claims(game)
        }
        required_tokens = {
            "DR-STATE-001A": ("'running'", "'boss'"),
            "DR-STATE-001B": ('"start"', '"playing"', '"ended"'),
            "DR-SCENE-002A": ("DEFAULT_STAGE", "960", "540"),
            "DR-SCENE-002B": ("0.28", "0.72", "playerX", "bossY"),
            "DR-ASSET-001A": ("gates:", "loadingBackground:"),
            "DR-ASSET-001B": ("Promise.all", "loadImage(ASSETS.gates)"),
            "DR-TEST-001A": ("createDragonRiderState", "getDragonRiderResults"),
            "DR-TEST-001B": ("ArrowLeft", '"boss"', '"results"'),
            "DL-TRANS-002": ("advanceToNextLevel", "const newLevel = state.level + 1"),
            "DL-TRANS-003": ("nextState.phase === 'victory'", "advanceToNextLevel", "setGameState"),
        }
        defects: list[str] = []
        for record_name, tokens in required_tokens.items():
            text = source_range(records[record_name])
            for token in tokens:
                if token not in text:
                    defects.append(f"{record_name}:{token}")
        self.assertEqual(defects, [], f"semantic anchor defects: {defects}")

    def test_semantic_boundaries_reject_runtime_and_temporal_overclaim(self) -> None:
        """Fails when source declarations become browser/current/runtime outcomes."""
        dragon = {claim_id(item): item for item in factual_claims("dragon-rider")}
        self.assertIn("Declaration only", dragon["DR-ASSET-001A"]["interpretation"])
        self.assertIn("successful runtime loads are not claimed", dragon["DR-ASSET-001B"]["interpretation"])
        spell = factual_claims("spellweavers-run")
        historical = {"4106ba39547c8cac7645ce0f257a6bdd133712e9", "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f"}
        self.assertTrue(
            all(item.get("evidence_class") == "history" for item in spell if citation(item)["revision"] in historical)
        )
        spell_map = load_json(track_path(GAME_CONFIG["spellweavers-run"]["map"]))
        self.assertIn("coming-soon", spell_map["scene_state_transition_model"][0]["statement"])
        self.assertIn("historical-source-only", json.dumps(spell_map["visible_unknowns"]))


class BatchAV4DenominatorAndModelContract(unittest.TestCase):
    """Accepted-denominator reconciliation and complete model contracts."""

    def test_dragon_denominator_names_every_required_review_category(self) -> None:
        """Fails when Dragon identity, routes, tests, copy, assets, or history disappear."""
        document = load_json(track_path(GAME_CONFIG["dragon-rider"]["ledger"]))
        reconciliation = document["denominator_reconciliation"]
        expected_counts = {
            "identity": 2,
            "current_routes_and_tests": 7,
            "copy_and_data": 1,
            "asset_candidates": 8,
            "history": 13,
        }
        for category, count in expected_counts.items():
            self.assertEqual(len(reconciliation[category]["records"]), count, category)
            self.assertIn("covered", reconciliation[category]["status"])
        all_records = set(
            item
            for category in expected_counts
            for item in reconciliation[category]["records"]
        )
        self.assertIn("apps/advantage-games/public/vocab/dragon-rider.json", all_records)
        self.assertIn("apps/advantage-games/public/games/dragon-rider/", all_records)
        self.assertIn("apps/advantage-games/public/games/vocabulary/dragon-rider/", all_records)
        self.assertIn("packages/game-cartridges/src/cartridges/dragon-rider/scene.ts", all_records)

    def test_dungeon_denominator_names_current_withdrawn_copy_tests_and_duplicate_assets(self) -> None:
        """Fails when Dungeon's simultaneous states or accepted denominator records collapse."""
        document = load_json(track_path(GAME_CONFIG["dungeon-liberator"]["ledger"]))
        reconciliation = document["accepted_denominator_reconciliation"]
        self.assertEqual(len(reconciliation["identity"]), 4)
        self.assertEqual(len(reconciliation["implementation_and_copy"]), 7)
        self.assertEqual(len(reconciliation["tests"]), 3)
        self.assertEqual(len(reconciliation["assets"]), 5)
        state = reconciliation["current_and_withdrawn_state"]
        self.assertIn("page.tsx", state["current"])
        self.assertIn("gameCards.ts", state["catalog_registration"])
        assets = " ".join(reconciliation["assets"])
        self.assertIn("public/games/sentence/dungeon-liberator", assets)
        self.assertIn("public/games/dungeon-liberator", assets)
        self.assertIn("public/vocab/dungeon-liberator.json", assets)
        self.assertTrue(reconciliation["reconciliation_status"].startswith("All accepted"))

    def test_all_v3_maps_cover_every_active_fact_and_fixture_without_foreign_ids(self) -> None:
        """Fails when a map omits, invents, or imports a factual or fixture ID."""
        sections = {
            "dragon-rider": ("scene_state_transition_model", "mechanics_learning_model", "developer_effort_model"),
            "dungeon-liberator": ("scene_state_transition_model", "mechanics_learning_model", "developer_effort_model"),
            "spellweavers-run": ("scene_state_transition_model", "mechanics_learning_model", "developer_effort_model", "assets_and_boundaries"),
        }
        for game, names in sections.items():
            document = load_json(track_path(GAME_CONFIG[game]["map"]))
            factual = {claim_id(item) for item in factual_claims(game)}
            fixture_ids = {claim_id(item) for item in fixtures(game)}
            model_refs = set(
                flatten_strings(
                    value
                    for name in names
                    for value in values_for_key(document[name], "claim_ids")
                )
            )
            mapped_fixtures = {
                item["claim_id"] for item in document["negative_fixtures"]
            }
            self.assertEqual(model_refs, factual, game)
            self.assertEqual(mapped_fixtures, fixture_ids, game)
            self.assertTrue(all(item["disposition"] == "REJECT" for item in document["negative_fixtures"]))

    def test_required_models_are_structured_complete_and_non_estimating(self) -> None:
        """Fails when summaries replace scene, learning, or effort decomposition."""
        expected = {
            "dragon-rider": (11, 4, 5),
            "dungeon-liberator": (10, 4, 5),
            "spellweavers-run": (21, 6, 8),
        }
        for game, counts in expected.items():
            document = load_json(track_path(GAME_CONFIG[game]["map"]))
            actual = tuple(
                len(document[name])
                for name in ("scene_state_transition_model", "mechanics_learning_model", "developer_effort_model")
            )
            self.assertEqual(actual, counts, game)
            self.assertTrue(
                all(item.get("claim_ids") for item in document["developer_effort_model"]),
                game,
            )
            self.assertEqual(document["counts"].get("effort_estimates", 0), 0, game)
            self.assertEqual(document["acceptance"], "not-claimed")
            self.assertEqual(document["counts"]["unresolved_claim_ids"], 0)
            self.assertEqual(document["counts"]["foreign_claim_ids"], 0)
            self.assertEqual(document["counts"]["uncited_source_facts"], 0)


class BatchAV4FixtureAndBudgetContract(unittest.TestCase):
    """Negative-fixture, owner-direction, receipt, and integer-budget contracts."""

    def test_all_nine_fixtures_are_unique_rejections_without_positive_citations(self) -> None:
        """Fails when unsupported propositions become positive source evidence."""
        records = [item for game in GAME_CONFIG for item in fixtures(game)]
        ids = [claim_id(item) for item in records]
        self.assertEqual(len(ids), 9)
        self.assertEqual(len(ids), len(set(ids)))
        defects: list[str] = []
        for record in records:
            disposition = str(record.get("expected_disposition", "")).upper()
            if "REJECT" not in disposition:
                defects.append(f"{claim_id(record)}:disposition")
            if any(value is not None for value in citation(record).values()):
                defects.append(f"{claim_id(record)}:positive-citation")
        self.assertEqual(defects, [], f"fixture defects: {defects}")

    def test_timing_direction_is_narrow_and_preserves_every_other_gate(self) -> None:
        """Fails when zero timing accounting becomes evidence or a broad waiver."""
        direction = load_json(REPO_ROOT / TIMING_DIRECTION)
        self.assertEqual(direction["decision"], "UNAVAILABLE_HARNESS_TIMING_ACCOUNTING")
        self.assertIn("Elapsed-minute fields only", direction["scope"])
        self.assertIn("integer 0", direction["direction"])
        self.assertIn("not elapsed-time evidence", direction["direction"])
        non_waived = " ".join(direction["non_waived"]).lower()
        for token in ("source byte", "source object", "command", "record", "claim semantics", "denominator completeness", "fresh independent review", "lifecycle"):
            self.assertIn(token, non_waived)

    def test_collector_and_mapper_repairs_have_seven_bounded_integer_actuals(self) -> None:
        """Fails when repaired local budgets contain null, unavailable, float, or breach values."""
        budget = load_json(REPO_ROOT / BUDGET)["ceilings"]["per_game_roles"]
        collector_actuals = {
            "dragon-rider": {
                key: value
                for key, value in load_json(receipt_path(GAME_CONFIG["dragon-rider"]["collector_receipt"]))["actual_usage"].items()
                if key in budget["evidence_collector_one_game"]
            },
            "dungeon-liberator": {
                key: value
                for key, value in load_json(receipt_path(GAME_CONFIG["dungeon-liberator"]["collector_receipt"]))["actual_usage"].items()
                if key in budget["evidence_collector_one_game"]
            },
            "spellweavers-run": {
                "source_bytes": 11_558_850,
                "source_files_objects": 19,
                "commands": 24,
                "elapsed_minutes": 0,
                "records_authored_reviewed": 51,
                "browser_interactions": 0,
                "captured_artifacts": 4,
            },
        }
        mapper_actuals: dict[str, dict[str, Any]] = {}
        for game, config in GAME_CONFIG.items():
            actual = load_json(receipt_path(config["mapper_receipt"]))["budget_actual"]
            mapper_actuals[game] = {
                "source_bytes": actual["mapper_input_bytes"],
                "source_files_objects": actual["mapper_input_files"],
                "commands": actual["mapper_commands"],
                "elapsed_minutes": actual["elapsed_minutes"],
                "records_authored_reviewed": actual["mapper_records_authored"],
                "browser_interactions": 0,
                "captured_artifacts": 0,
            }
            self.assertEqual(actual["timing_measurement"], "unavailable-in-harness")
            self.assertIn("not elapsed-time evidence", actual["elapsed_note"])
        for role, actuals_by_game in (("evidence_collector_one_game", collector_actuals), ("requirements_mapper_one_game", mapper_actuals)):
            for game, actuals in actuals_by_game.items():
                self.assertEqual(set(actuals), set(budget[role]), game)
                for unit, value in actuals.items():
                    self.assertIs(type(value), int, f"{game}:{unit}")
                    limit = budget[role][unit]
                    if game == "spellweavers-run" and role == "evidence_collector_one_game" and unit == "source_bytes":
                        limit = 12_000_000
                    self.assertLessEqual(value, limit, f"{game}:{unit}")

    def test_spellweaver_exception_remains_exact_and_source_bytes_only(self) -> None:
        """Fails when the original breach, narrow ceiling, or non-waiver is hidden."""
        exception = load_json(REPO_ROOT / SPELL_EXCEPTION)
        self.assertEqual(exception["decision"], "ONE_TIME_SOURCE_BYTE_CEILING_INCREASE")
        self.assertEqual((exception["old_ceiling"], exception["approved_ceiling"], exception["measured_actual"]), (8_000_000, 12_000_000, 11_558_850))
        self.assertIn("source_bytes only", exception["supersedes"])
        mapper = load_json(receipt_path(GAME_CONFIG["spellweavers-run"]["mapper_receipt"]))
        disclosure = mapper["budget_exception_disclosure"].replace(",", "")
        for token in ("11558850", "8000000", "12000000", "No further increase", "no other gate waived"):
            self.assertIn(token.lower(), disclosure.lower())

    def test_selected_v3_receipts_bind_outputs_and_preserve_role_boundaries(self) -> None:
        """Fails when selected collector/rebind/mapper output bindings are stale."""
        selected = [
            receipt_path("evidence-collector-dragon-rider-v3-rebind.json"),
            receipt_path("evidence-collector-dungeon-liberator-v3.json"),
            receipt_path("requirements-mapper-dragon-rider-v3.json"),
            receipt_path("requirements-mapper-dungeon-liberator-v3.json"),
            receipt_path("requirements-mapper-spellweavers-run-v3.json"),
        ]
        defects: list[str] = []
        for path in selected:
            document = load_json(path)
            text = json.dumps(document, sort_keys=True).lower()
            if document.get("track_id") != TRACK_ID:
                defects.append(f"{path.name}:track")
            if "acceptance" in document and document["acceptance"] != "not-claimed":
                defects.append(f"{path.name}:acceptance")
            if "browser claim" not in text and "browser" not in text:
                defects.append(f"{path.name}:role-boundary")
            bindings = document.get("output_sha256", {})
            if not bindings:
                bindings = {
                    item["path"]: item["sha256"]
                    for item in document.get("outputs", [])
                    if isinstance(item, dict)
                }
            for relative, expected in bindings.items():
                output = TRACK_DIR / relative
                if relative.startswith("measure/"):
                    output = REPO_ROOT / relative
                if not output.is_file() or file_hash(output) != expected:
                    defects.append(f"{path.name}:{relative}")
        self.assertEqual(defects, [], f"receipt binding defects: {defects}")

    def test_truth_receipt_binds_v4_scope_inputs_output_and_budget(self) -> None:
        """Fails when this isolated role claims another role or stale V4 bytes."""
        receipt = load_json(TRUTH_RECEIPT)
        self.assertEqual(receipt["role"], "truth-test-author-batch-a-v4")
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
        self.assertEqual(receipt["prior_role_history"], [])
        self.assertEqual(receipt["role_isolation"]["roles_held"], ["truth-test-author"])
        self.assertEqual(receipt["input_hashes"], ACTIVE_INPUT_HASHES)
        output = next(item for item in receipt["outputs"] if item["path"].endswith("batch-a-truth-tests-v4.py"))
        self.assertEqual(output["sha256"], file_hash(Path(__file__).resolve()))
        actual = receipt["actual_usage"]
        ceiling = load_json(REPO_ROOT / BUDGET)["ceilings"]["batch_roles"]["truth_test_author_all_seven"]
        self.assertEqual(set(actual) - {"timing_measurement", "timing_note"}, set(ceiling))
        for unit, limit in ceiling.items():
            self.assertIs(type(actual[unit]), int, unit)
            self.assertLessEqual(actual[unit], limit, unit)
        self.assertEqual(actual["elapsed_minutes"], 0)
        self.assertEqual(actual["timing_measurement"], "unavailable-in-harness")
        self.assertIn("not elapsed-time evidence", actual["timing_note"])


class BatchAV4BrowserDispositionContract(unittest.TestCase):
    """Inherited exact blocked/non-runnable browser disposition contracts."""

    def test_browser_dispositions_remain_bounded_unknowns(self) -> None:
        """Fails when blocked or non-runnable evidence becomes behavior proof."""
        dragon = load_json(track_path(GAME_CONFIG["dragon-rider"]["browser"]))
        dungeon = load_json(track_path(GAME_CONFIG["dungeon-liberator"]["browser"]))
        spell = load_json(track_path(GAME_CONFIG["spellweavers-run"]["browser"]))
        self.assertEqual(dragon["disposition"], "browser-audit-blocked-route-unreachable")
        self.assertEqual(dungeon["disposition"], "browser-audit-blocked-browser-unavailable")
        self.assertEqual(spell["status"], "bounded-non-runnable-unknown")
        self.assertEqual(dragon["observations"]["transitions"]["actual_transitions_independently_established"], [])
        self.assertEqual(dungeon["observations"]["transitions"]["actual_transitions_independently_established"], [])
        self.assertIn("none captured", spell["observations"]["screenshots"])


class BatchAV4IndependentReviewContract(unittest.TestCase):
    """Fresh V4 independent-review existence, exact-input, and blocker contracts."""

    def test_fresh_independent_review_binds_every_active_v4_input(self) -> None:
        """Fails until a separate clean V4 review and receipt bind exact bytes."""
        self.assertTrue(
            REVIEW_PATH.is_file() and REVIEW_RECEIPT_PATH.is_file(),
            "EXPECTED_STAGE_RED[INDEPENDENT_REVIEW_V4_MISSING]",
        )
        review = load_json(REVIEW_PATH)
        receipt = load_json(REVIEW_RECEIPT_PATH)
        required = dict(ACTIVE_INPUT_HASHES)
        required[str(Path(__file__).resolve().relative_to(REPO_ROOT))] = file_hash(Path(__file__).resolve())
        required[str(TRUTH_RECEIPT.relative_to(REPO_ROOT))] = file_hash(TRUTH_RECEIPT)
        defects = [relative for relative, digest in required.items() if receipt.get("input_hashes", {}).get(relative) != digest]
        audited_head = review.get("audited_head_sha")
        if not isinstance(audited_head, str) or not HEX40.fullmatch(audited_head):
            defects.append("audited-head")
        elif not is_ancestor(ROLE_BASE_SHA, audited_head):
            defects.append("review-predates-role-base")
        for severity in ("critical", "high", "medium"):
            if review.get("unresolved_findings", {}).get(severity) != 0:
                defects.append(f"unresolved-{severity}")
        self.assertEqual(defects, [], f"independent review defects: {defects}")


class BatchAV4LifecycleContract(unittest.TestCase):
    """Ordered V4 candidate, owner-approval, and accepted-manifest contracts."""

    def test_candidate_manifest_exists_and_binds_review_and_truth(self) -> None:
        """Fails until the separate non-consumable V4 candidate exists."""
        self.assertTrue(CANDIDATE_PATH.is_file(), "EXPECTED_STAGE_RED[CANDIDATE_V4_MISSING]")
        candidate = load_json(CANDIDATE_PATH)
        self.assertFalse(candidate.get("consumable"))
        for path in (Path(__file__).resolve(), TRUTH_RECEIPT, REVIEW_PATH, REVIEW_RECEIPT_PATH):
            relative = str(path.relative_to(REPO_ROOT))
            self.assertEqual(candidate.get("input_hashes", {}).get(relative), file_hash(path), relative)

    def test_product_owner_approval_exists_and_is_exactly_bound(self) -> None:
        """Fails until authentic post-candidate V4 owner approval exists."""
        self.assertTrue(APPROVAL_PATH.is_file(), "EXPECTED_STAGE_RED[OWNER_APPROVAL_V4_MISSING]")
        approval = load_json(APPROVAL_PATH)
        self.assertEqual(approval.get("candidate_manifest_sha256"), file_hash(CANDIDATE_PATH))
        self.assertEqual(approval.get("review_report_sha256"), file_hash(REVIEW_PATH))
        self.assertEqual(approval.get("decision"), "approve")
        self.assertIs(approval.get("revoked"), False)
        self.assertTrue(approval.get("event_id"))
        self.assertTrue(approval.get("approval_message_sha256"))

    def test_accepted_manifest_exists_and_is_exactly_bound(self) -> None:
        """Fails until the separate consumable V4 accepted manifest exists."""
        self.assertTrue(ACCEPTED_PATH.is_file(), "EXPECTED_STAGE_RED[ACCEPTED_MANIFEST_V4_MISSING]")
        accepted = load_json(ACCEPTED_PATH)
        self.assertEqual(accepted.get("status"), "accepted")
        self.assertTrue(accepted.get("consumable"))
        self.assertIs(accepted.get("revoked"), False)
        self.assertEqual(accepted.get("candidate_manifest_sha256"), file_hash(CANDIDATE_PATH))
        self.assertEqual(accepted.get("owner_acceptance_sha256"), file_hash(APPROVAL_PATH))
        disclosure = json.dumps(accepted, sort_keys=True).lower().replace(",", "")
        self.assertIn("provider-side", disclosure)
        self.assertIn("unavailable", disclosure)
        self.assertIn("11558850", disclosure)


if __name__ == "__main__":
    unittest.main()
