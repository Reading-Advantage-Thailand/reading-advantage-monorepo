"""Fail-closed V5 truth contracts for T5 Traversal Batch A.

The suite selects the exact source packages retained by V4 plus the additive
denominator V5, Dragon Rider mapper V5, Dungeon Liberator mapper V5, and all
three browser V2 repair outputs committed at the supplied role base. It tests
every V4 review defect mechanically. A fresh V5 review and the ordered V5
lifecycle remain intentionally red.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
      measure/tracks/apk_corpus_audit_traversal_exploration_20260712/\
batch-a-truth-tests-v5.py
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
ROLE_BASE_SHA = "3451d6ed6eae16af9b97ed7587a67cdf7a64b484"
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
V4_REVIEW = f"measure/tracks/{TRACK_ID}/batch-a-independent-review-v4.json"
DENOMINATOR_REPAIR = (
    f"measure/tracks/{TRACK_ID}/batch-a-denominator-reconciliation-v5.json"
)
TRUTH_RECEIPT = RECEIPTS_DIR / "truth-test-author-batch-a-v5.json"

GAME_CONFIG: dict[str, dict[str, str]] = {
    "dragon-rider": {
        "prior_ledger": "packages/vocabulary/dragon-rider/claim-evidence-ledger-v2.json",
        "ledger": "packages/vocabulary/dragon-rider/claim-evidence-ledger-v3.json",
        "method": "packages/vocabulary/dragon-rider/evidence-method-v3.md",
        "report": "packages/vocabulary/dragon-rider/evidence-final-report-v3.json",
        "rebind_report": "packages/vocabulary/dragon-rider/evidence-final-report-v3-rebind.json",
        "collector_receipt": "evidence-collector-dragon-rider-v3-rebind.json",
        "map": "packages/vocabulary/dragon-rider/requirements-map-v5.json",
        "map_report": "packages/vocabulary/dragon-rider/requirements-final-report-v5.json",
        "mapper_receipt": "requirements-mapper-dragon-rider-v5.json",
        "browser": "packages/vocabulary/dragon-rider/browser-audit-v2.json",
        "browser_receipt": "browser-auditor-dragon-rider-v2.json",
    },
    "dungeon-liberator": {
        "prior_ledger": "packages/sentence/dungeon-liberator/claim-evidence-ledger-v2.json",
        "ledger": "packages/sentence/dungeon-liberator/claim-evidence-ledger-v3.json",
        "method": "packages/sentence/dungeon-liberator/evidence-method-v3.md",
        "report": "packages/sentence/dungeon-liberator/evidence-final-report-v3.json",
        "collector_receipt": "evidence-collector-dungeon-liberator-v3.json",
        "map": "packages/sentence/dungeon-liberator/requirements-map-v5.json",
        "map_report": "packages/sentence/dungeon-liberator/requirements-final-report-v5.json",
        "mapper_receipt": "requirements-mapper-dungeon-liberator-v5.json",
        "browser": "packages/sentence/dungeon-liberator/browser-audit-v2.json",
        "browser_receipt": "browser-auditor-dungeon-liberator-v2.json",
    },
    "spellweavers-run": {
        "ledger": "packages/catalog/spellweavers-run/claim-evidence-ledger-v2.json",
        "method": "packages/catalog/spellweavers-run/evidence-method-v2.md",
        "report": "packages/catalog/spellweavers-run/evidence-final-report-v2-rebind.json",
        "collector_receipt": "evidence-collector-spellweavers-run-v2-rebind.json",
        "map": "packages/catalog/spellweavers-run/requirements-map-v3.json",
        "map_report": "packages/catalog/spellweavers-run/requirements-final-report-v3.json",
        "mapper_receipt": "requirements-mapper-spellweavers-run-v3.json",
        "browser": "packages/catalog/spellweavers-run/browser-audit-v2.json",
        "browser_receipt": "browser-auditor-spellweavers-run-v2.json",
    },
}

ACTIVE_INPUT_HASHES = {
    GLOBAL_DIRECTION: "4d1ec24e900665577a413b4c5555d4d53ae1be222d8029cf391d1b55ff7da9ac",
    BUDGET: "81bceb19a002128ae6ccf859db8b6c07d8537b433d726d0fb0235997d9acf896",
    TIMING_DIRECTION: "3b3fea0b22f5ac379a1bb3518b1095bc8f3a366eaa7eb2f677b69ac6ffddb2c0",
    SPELL_EXCEPTION: "a0a4f2e80fa888e3fee7a1ef7e3479af559e1930cbb3eb3a5ea3a2ab8b3bbcf4",
    V2_REVIEW: "8eb21f34687e3afeb7a89ccd9ecd9aa5fbc16308f626731d47dbedbbde37216e",
    V4_REVIEW: "bffa3fbb1539a779ba64845d1f116078e22100b213c1883d996f68af236bbc79",
    f"measure/tracks/{TRACK_ID}/role-receipts/adversarial-reviewer-batch-a-v4.json": "1dd70eb8c2849dc9f66d1eb0622f35820d74765ba5fa5848cd2b6cf3993dfeb3",
    f"measure/tracks/{TRACK_ID}/batch-a-truth-tests-v4.py": "c10271ea463322e142687d169ec19409f25711354594376d8144fe2680cafe9b",
    f"measure/tracks/{TRACK_ID}/role-receipts/truth-test-author-batch-a-v4.json": "34608a2015d23ac5aeacbe4595f8cc0db1a560aff69901edfd6b44afcf6e2b07",
    "measure/acceptance/measure_apk_evidence_integrity_gates_20260712/phase4-v8-accepted-gate-manifest.json": "d9f5c4771a755bae72c037fdbed6e330e523e9f2fabf60010154b981bfb283a3",
    "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json": "d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729",
    "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json": "6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0",
    "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json": "cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b",
    f"measure/tracks/{TRACK_ID}/phase0-discovery-audit.json": "6524d33b1af38d93b9cc0a3f1b31421979f7a4120f68d9065935946312e6c152",
    DENOMINATOR_REPAIR: "2a26052f88f07a02bc2d903fc48daf3c0292e7707164ed3a1a473fe1e92d71cb",
    f"measure/tracks/{TRACK_ID}/role-receipts/denominator-reconciler-batch-a-v5.json": "1e1547ed8cf7fb134207f343115dd7648851bff09291544148d18444713e302e",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/claim-evidence-ledger-v2.json": "fb778224e67609457ac8ac712bc85b3f5096483e0116f1162a2818bac6b48fe9",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/claim-evidence-ledger-v3.json": "826323bd9c9ee754c1c5b029e7c4a1cb1907bb0041296a98f2166033be3ca236",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/evidence-method-v3.md": "a13ead6576ff7cde948f68d996ed4fc8b6901ecf4d93394ff7410603c9458a6c",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/evidence-final-report-v3.json": "786f4097a204047b2d7a24ed3f9caf2473775042f912140cbee4feaaaa7928b8",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/evidence-final-report-v3-rebind.json": "3912a12ee752b340f405c948e5120d3c714ad5b78c22a0a0fe5f2b0e2bd9bc66",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-dragon-rider-v3.json": "1cb2a43ae37baaeef1705e24f49bbcaa886e0671ac8621a4b59f0f1f1a16d072",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-dragon-rider-v3-rebind.json": "a88d6a7eb72f5b5bbf41459cfa867bae3d7189b5ba4139bf808867c560733baf",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/requirements-map-v5.json": "7c06238ae6927488809089dc8e7f5779a7ebf0f98721a0d03e6b92bce845c0d9",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/requirements-final-report-v5.json": "a11a4a0d39257887189564d6a9eef674b253b9dfe2964c42584bdf4241d4e1e1",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-dragon-rider-v5.json": "a9c1edb50105457e601e8e305facf20763e4c5865e82cd0a225509268f3da7da",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/claim-evidence-ledger-v2.json": "ff97238f94caa82a5359143c0a25d2a5ee8a2e479bb2fdd0bfea9aab05eef2bd",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/claim-evidence-ledger-v3.json": "f8112af605465ffcf461669e5560037261943df98185bfeb8728a6496997e2a2",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/evidence-method-v3.md": "ee81e7a72fc06f8b1e4be073fcd7e05b3f8e8a716a1cbd4de9cfc991e12a6742",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/evidence-final-report-v3.json": "87ac4103859da863367088e19c213fae9a02baeecf38e840f085b0a02bd32415",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-dungeon-liberator-v3.json": "62edc32b4b5d89be91db4d6750d2e5fcc6289f48d12c3492c52be66ca76fa9e4",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/requirements-map-v5.json": "bd3848442cf5356df6b53243bc5596a33d3d56fbc9d23531da0cc7b1a2698ee1",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/requirements-final-report-v5.json": "de8f8a205e4bf13f9159c96361ef8415c541abe0a01bd6b2329bb0deb6b4b2c7",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-dungeon-liberator-v5.json": "d46abeb595ffc5163a7a6af1f825c072bd9f2a8a927d138986d6e481e3a3ac89",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/claim-evidence-ledger-v2.json": "2cd708cbecf94133b92ce5f06822ad420da28a1d4417fdb74284528e7a9fe24b",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/evidence-method-v2.md": "1cd64613e86482a78830f522fbe6d83cf1a812d3c42fcbd97e06f9ade035e92a",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/evidence-final-report-v2-rebind.json": "c8c174e223501dc1ae4e636a4c45eb8fbc6552011e1b327be1e755df3569197f",
    f"measure/tracks/{TRACK_ID}/role-receipts/evidence-collector-spellweavers-run-v2-rebind.json": "4e639b4ce5116905f46472cd2444284b0e958f5e14e1df9ccf9a99ff95ac131d",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/requirements-map-v3.json": "7ac8e95ed5aa036a5e946400e5038a6cef184f2a4de224f1381b3b34eff6b4d9",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/requirements-final-report-v3.json": "8324fee54332f39d2c26693a1064fd4c4c633edee35824e519bc21d89cae5646",
    f"measure/tracks/{TRACK_ID}/role-receipts/requirements-mapper-spellweavers-run-v3.json": "a40c41c4604c307ec98ab649793dab213eddf4b915abc800b3d115ea114d4fc1",
    f"measure/tracks/{TRACK_ID}/packages/vocabulary/dragon-rider/browser-audit-v2.json": "3eee618646a9c2db321fb436b4677faa73b0f5189e7d1003d54d2783076ffa29",
    f"measure/tracks/{TRACK_ID}/packages/sentence/dungeon-liberator/browser-audit-v2.json": "1c7291e52b23f75062c29799496b9878d8622ffef707db4e046f9f75fbeca30d",
    f"measure/tracks/{TRACK_ID}/packages/catalog/spellweavers-run/browser-audit-v2.json": "04a1edf32e21884c26e06802337435399c234004274f83c2f31cee0edcf00039",
    f"measure/tracks/{TRACK_ID}/role-receipts/browser-auditor-dragon-rider-v2.json": "66df1997081c5e30d5101af12a2c3c7485b43cb5dc6aa23e0590d5762b8d5bbc",
    f"measure/tracks/{TRACK_ID}/role-receipts/browser-auditor-dungeon-liberator-v2.json": "db5272636766c4610f6ee2af411e90b3aa9e67c7d3f272dd816d373f9d97f53e",
    f"measure/tracks/{TRACK_ID}/role-receipts/browser-auditor-spellweavers-run-v2.json": "e7600c5243eaa55d8b4522ab0a7e26e54657c63ff571ec3e07777fe1532b8b20",
}

REVIEW_PATH = TRACK_DIR / "batch-a-independent-review-v5.json"
REVIEW_RECEIPT_PATH = RECEIPTS_DIR / "adversarial-reviewer-batch-a-v5.json"
CANDIDATE_PATH = TRACK_DIR / "candidate-cohort-manifest-batch-a-v5.json"
APPROVAL_PATH = TRACK_DIR / "product-owner-acceptance-batch-a-v5.json"
ACCEPTED_PATH = TRACK_DIR / "accepted-cohort-manifest-batch-a-v5.json"


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
    errors: list[str] = []
    if not isinstance(relative, str) or not relative:
        return [f"{record_name}:missing-path"]
    if Path(relative).is_absolute() or ".." in Path(relative).parts:
        errors.append(f"{record_name}:unbounded-path")
    if not isinstance(revision, str) or not HEX40.fullmatch(revision):
        return errors + [f"{record_name}:revision"]
    source = git_show(revision, relative)
    if source is None:
        return errors + [f"{record_name}:unreachable"]
    if sha256(source) != cite.get("blob_sha256"):
        errors.append(f"{record_name}:blob-hash")
    if not isinstance(start, int) or not isinstance(end, int):
        return errors + [f"{record_name}:line-types"]
    lines = source.splitlines(keepends=True)
    if not 1 <= start <= end <= len(lines):
        return errors + [f"{record_name}:line-bounds"]
    if sha256(b"".join(lines[start - 1 : end])) != cite.get("cited_range_sha256"):
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


class BatchAV5FreezeContract(unittest.TestCase):
    """Exact role-base selection and accepted-predecessor contracts."""

    def test_supplied_bases_are_real_and_ordered(self) -> None:
        """Fails when the supplied phase or role base is unordered."""
        self.assertRegex(ROLE_BASE_SHA, HEX40)
        self.assertTrue(is_ancestor(PHASE_BASE_SHA, ROLE_BASE_SHA))

    def test_every_selected_input_is_exact_and_committed_at_role_base(self) -> None:
        """Fails when any selected source, repair, map, browser, or review byte drifts."""
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


class BatchAV5EvidenceContract(unittest.TestCase):
    """Exact active claim, source-envelope, model, and fixture contracts."""

    def test_active_claim_denominators_are_complete_and_unique(self) -> None:
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

    def test_repaired_semantic_anchors_are_present_in_exact_ranges(self) -> None:
        """Fails when repaired source wording outruns its exact source envelope."""
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
        defects = [
            f"{record_name}:{token}"
            for record_name, tokens in required_tokens.items()
            for token in tokens
            if token not in source_range(records[record_name])
        ]
        self.assertEqual(defects, [], f"semantic anchor defects: {defects}")

    def test_latest_maps_cover_all_facts_and_fixtures_without_foreign_ids(self) -> None:
        """Fails when a selected latest map omits, invents, or imports a claim ID."""
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
            mapped_fixtures = {item["claim_id"] for item in document["negative_fixtures"]}
            self.assertEqual(model_refs, factual, game)
            self.assertEqual(mapped_fixtures, fixture_ids, game)
            self.assertTrue(
                all(item["disposition"] == "REJECT" for item in document["negative_fixtures"]),
                game,
            )

    def test_required_models_are_structured_complete_and_non_estimating(self) -> None:
        """Fails when summaries replace scene, learning, or effort decomposition."""
        expected = {
            "dragon-rider": (11, 4, 5),
            "dungeon-liberator": (10, 5, 5),
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
            self.assertEqual(document["acceptance"], "not-claimed", game)
            for key in ("unresolved_claim_ids", "foreign_claim_ids", "uncited_source_facts"):
                self.assertEqual(document["counts"][key], 0, f"{game}:{key}")

    def test_all_nine_fixtures_are_unique_rejections_without_positive_citations(self) -> None:
        """Fails when unsupported propositions become positive source evidence."""
        records = [item for game in GAME_CONFIG for item in fixtures(game)]
        ids = [claim_id(item) for item in records]
        self.assertEqual(len(ids), 9)
        self.assertEqual(len(ids), len(set(ids)))
        defects: list[str] = []
        for record in records:
            if "REJECT" not in str(record.get("expected_disposition", "")).upper():
                defects.append(f"{claim_id(record)}:disposition")
            if any(value is not None for value in citation(record).values()):
                defects.append(f"{claim_id(record)}:positive-citation")
        self.assertEqual(defects, [], f"fixture defects: {defects}")


class BatchAV5ReviewDefectContract(unittest.TestCase):
    """Mechanical contracts for all four High and one Medium V4 findings."""

    def test_h001_denominator_repair_binds_the_exact_authorities(self) -> None:
        """Fails when the additive denominator repair repeats or hides the wrong digest."""
        repair = load_json(REPO_ROOT / DENOMINATOR_REPAIR)
        receipt = load_json(receipt_path("denominator-reconciler-batch-a-v5.json"))
        denominator = "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json"
        partition = "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json"
        authority = repair["authority"]
        self.assertEqual(authority["accepted_denominator_manifest_path"], denominator)
        self.assertEqual(authority["accepted_denominator_manifest_sha256"], file_hash(REPO_ROOT / denominator))
        self.assertEqual(authority["accepted_partition_manifest_path"], partition)
        self.assertEqual(authority["accepted_partition_manifest_sha256"], file_hash(REPO_ROOT / partition))
        reconciliation = repair["reconciliation"]
        self.assertEqual(reconciliation["reported_finding"], "T5A-V4-H-001")
        self.assertNotEqual(reconciliation["reported_embedded_value"], reconciliation["corrected_embedded_value"])
        self.assertEqual(reconciliation["corrected_embedded_value"], file_hash(REPO_ROOT / denominator))
        self.assertTrue(reconciliation["exact_binding_matches"])
        self.assertEqual(reconciliation["denominator_mismatches"], 0)
        bindings = {item["package"]: item for item in repair["package_bindings"]}
        self.assertEqual(set(bindings), {"vocabulary/dragon-rider", "sentence/dungeon-liberator", "catalog/spellweavers-run"})
        self.assertTrue(
            all(item["accepted_denominator_manifest_sha256"] == file_hash(REPO_ROOT / denominator) for item in bindings.values())
        )
        output = receipt["outputs"][0]
        self.assertEqual(output["sha256"], file_hash(REPO_ROOT / output["path"]))

    def test_h002_dragon_mapper_binds_the_exact_latest_collector_lineage(self) -> None:
        """Fails when Dragon Rider mapping consumes the superseded V2 rebind."""
        document = load_json(track_path(GAME_CONFIG["dragon-rider"]["map"]))
        report = load_json(track_path(GAME_CONFIG["dragon-rider"]["map_report"]))
        receipt = load_json(receipt_path(GAME_CONFIG["dragon-rider"]["mapper_receipt"]))
        expected = {
            "ledger_sha256": "826323bd9c9ee754c1c5b029e7c4a1cb1907bb0041296a98f2166033be3ca236",
            "collector_sha256": "786f4097a204047b2d7a24ed3f9caf2473775042f912140cbee4feaaaa7928b8",
            "collector_method_sha256": "a13ead6576ff7cde948f68d996ed4fc8b6901ecf4d93394ff7410603c9458a6c",
            "collector_rebind_report_sha256": "3912a12ee752b340f405c948e5120d3c714ad5b78c22a0a0fe5f2b0e2bd9bc66",
            "collector_receipt_sha256": "a88d6a7eb72f5b5bbf41459cfa867bae3d7189b5ba4139bf808867c560733baf",
        }
        for key, digest in expected.items():
            self.assertEqual(document["input_bindings"][key], digest, key)
            self.assertEqual(report["input_bindings"][key], digest, key)
        self.assertEqual(receipt["input_hashes"]["collector_rebind_report"], expected["collector_rebind_report_sha256"])
        self.assertEqual(receipt["input_hashes"]["collector_receipt"], expected["collector_receipt_sha256"])
        self.assertNotIn("55e6c58e", json.dumps((document, report, receipt)))
        for output in receipt["outputs"]:
            self.assertEqual(output["sha256"], file_hash(track_path(output["path"])))

    def test_h004_dungeon_keyboard_atom_is_split_from_preserved_unknowns(self) -> None:
        """Fails when source declarations are promoted back into keyboard execution proof."""
        document = load_json(track_path(GAME_CONFIG["dungeon-liberator"]["map"]))
        mechanics = {item["id"]: item for item in document["mechanics_learning_model"]}
        self.assertEqual(mechanics["DL-V5-ML-004A"]["claim_ids"], ["DL-INPUT-001", "DL-INPUT-003"])
        self.assertNotIn("keyboard", mechanics["DL-V5-ML-004A"]["statement"].lower())
        keyboard = mechanics["DL-V5-ML-004B"]
        self.assertEqual(keyboard["claim_ids"], ["DL-INPUT-002"])
        self.assertIn("label declares", keyboard["statement"])
        self.assertIn("binding", keyboard["statement"])
        self.assertIn("remain unknown", keyboard["statement"])
        self.assertIn("no keyboard-wiring proposition", keyboard["disposition"])
        unknown_text = json.dumps(document["unknowns_preserved"]).lower()
        for token in ("keyboard", "event binding", "trusted input", "unknown"):
            self.assertIn(token, unknown_text)
        self.assertEqual(document["counts"]["unsupported_keyboard_wiring_atoms"], 0)

    def test_h003_browser_v2_outputs_have_equal_bounded_integer_accounting(self) -> None:
        """Fails when any superseding browser report or receipt retains unavailable actuals."""
        ceiling = load_json(REPO_ROOT / BUDGET)["ceilings"]["per_game_roles"]["browser_auditor_one_game"]
        expected_dispositions = {
            "dragon-rider": "browser-audit-blocked-route-unreachable",
            "dungeon-liberator": "browser-audit-blocked-browser-unavailable",
            "spellweavers-run": "NON-RUNNABLE/UNKNOWN",
        }
        for game, config in GAME_CONFIG.items():
            audit = load_json(track_path(config["browser"]))
            receipt = load_json(receipt_path(config["browser_receipt"]))
            actual = audit["budget_accounting"]["actual"]
            self.assertEqual(actual, receipt["actual_usage"], game)
            self.assertEqual(set(actual), set(ceiling), game)
            for unit, value in actual.items():
                self.assertIs(type(value), int, f"{game}:{unit}")
                self.assertLessEqual(value, ceiling[unit], f"{game}:{unit}")
            self.assertEqual(audit["disposition"], expected_dispositions[game])
            self.assertEqual(audit["acceptance"], "not-claimed")
            self.assertIn("not elapsed-time evidence", audit["budget_accounting"]["timing_direction"]["timing_note"])
            self.assertIn("not elapsed-time evidence", receipt["timing_accounting"]["note"].lower())
            self.assertIn("No behavior is claimed", receipt["behavior_boundary"])

    def test_h003_all_selected_role_budget_actuals_are_measured_bounded_integers(self) -> None:
        """Fails until every selected collector and mapper records all seven honest actuals."""
        ceilings = load_json(REPO_ROOT / BUDGET)["ceilings"]["per_game_roles"]
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            collector = load_json(receipt_path(config["collector_receipt"]))
            collector_actual = collector.get("actual_usage")
            if not isinstance(collector_actual, dict) and game == "dragon-rider":
                predecessor = collector.get("supersession", {}).get("supersedes_receipt_path")
                if isinstance(predecessor, str):
                    collector_actual = load_json(REPO_ROOT / predecessor).get("actual_usage")
            if not isinstance(collector_actual, dict):
                defects.append(f"{game}:collector:missing-actual")
            else:
                for unit, limit in ceilings["evidence_collector_one_game"].items():
                    value = collector_actual.get(unit)
                    if type(value) is not int:
                        defects.append(f"{game}:collector:{unit}:non-integer")
                    elif value > (12_000_000 if game == "spellweavers-run" and unit == "source_bytes" else limit):
                        defects.append(f"{game}:collector:{unit}:breach")
            mapper = load_json(receipt_path(config["mapper_receipt"]))
            raw_mapper = mapper.get("budget_actual")
            if not isinstance(raw_mapper, dict):
                defects.append(f"{game}:mapper:missing-budget-actual")
                continue
            mapper_actual = {
                "source_bytes": raw_mapper.get("mapper_input_bytes"),
                "source_files_objects": raw_mapper.get("mapper_input_files"),
                "commands": raw_mapper.get("mapper_commands"),
                "elapsed_minutes": raw_mapper.get("elapsed_minutes"),
                "records_authored_reviewed": raw_mapper.get("mapper_records_authored"),
                "browser_interactions": 0,
                "captured_artifacts": 0,
            }
            for unit, limit in ceilings["requirements_mapper_one_game"].items():
                value = mapper_actual[unit]
                if type(value) is not int:
                    defects.append(f"{game}:mapper:{unit}:non-integer")
                elif value > limit:
                    defects.append(f"{game}:mapper:{unit}:breach")
        self.assertEqual(defects, [], f"selected-role budget defects: {defects}")


class BatchAV5TruthReceiptContract(unittest.TestCase):
    """Exact scope, output, isolation, and budget contracts for this role."""

    def test_truth_receipt_binds_v5_scope_output_and_budget(self) -> None:
        """Fails when this isolated role claims another role or stale V5 bytes."""
        receipt = load_json(TRUTH_RECEIPT)
        self.assertEqual(receipt["role"], "truth-test-author-batch-a-v5")
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
        self.assertEqual(receipt["prior_role_history"], [])
        self.assertEqual(receipt["role_isolation"]["roles_held"], ["truth-test-author"])
        self.assertEqual(receipt["input_hashes"], ACTIVE_INPUT_HASHES)
        output = next(item for item in receipt["outputs"] if item["path"].endswith("batch-a-truth-tests-v5.py"))
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


class BatchAV5IndependentReviewContract(unittest.TestCase):
    """Fresh V5 independent-review existence, exact-input, and blocker contracts."""

    def test_fresh_independent_review_binds_every_active_v5_input(self) -> None:
        """Fails until a separate clean V5 review and receipt bind exact bytes."""
        self.assertTrue(
            REVIEW_PATH.is_file() and REVIEW_RECEIPT_PATH.is_file(),
            "EXPECTED_STAGE_RED[INDEPENDENT_REVIEW_V5_MISSING]",
        )
        review = load_json(REVIEW_PATH)
        receipt = load_json(REVIEW_RECEIPT_PATH)
        required = dict(ACTIVE_INPUT_HASHES)
        required[str(Path(__file__).resolve().relative_to(REPO_ROOT))] = file_hash(Path(__file__).resolve())
        required[str(TRUTH_RECEIPT.relative_to(REPO_ROOT))] = file_hash(TRUTH_RECEIPT)
        defects = [
            relative
            for relative, digest in required.items()
            if receipt.get("input_hashes", {}).get(relative) != digest
        ]
        audited_head = review.get("audited_head_sha")
        if not isinstance(audited_head, str) or not HEX40.fullmatch(audited_head):
            defects.append("audited-head")
        elif not is_ancestor(ROLE_BASE_SHA, audited_head):
            defects.append("review-predates-role-base")
        for severity in ("critical", "high", "medium"):
            if review.get("unresolved_findings", {}).get(severity) != 0:
                defects.append(f"unresolved-{severity}")
        self.assertEqual(defects, [], f"independent review defects: {defects}")


class BatchAV5LifecycleContract(unittest.TestCase):
    """Ordered V5 candidate, owner-approval, and accepted-manifest contracts."""

    def test_candidate_manifest_exists_and_binds_review_and_truth(self) -> None:
        """Fails until the separate non-consumable V5 candidate exists."""
        self.assertTrue(CANDIDATE_PATH.is_file(), "EXPECTED_STAGE_RED[CANDIDATE_V5_MISSING]")
        candidate = load_json(CANDIDATE_PATH)
        self.assertFalse(candidate.get("consumable"))
        for path in (Path(__file__).resolve(), TRUTH_RECEIPT, REVIEW_PATH, REVIEW_RECEIPT_PATH):
            relative = str(path.relative_to(REPO_ROOT))
            self.assertEqual(candidate.get("input_hashes", {}).get(relative), file_hash(path), relative)

    def test_product_owner_approval_exists_and_is_exactly_bound(self) -> None:
        """Fails until authentic post-candidate V5 owner approval exists."""
        self.assertTrue(APPROVAL_PATH.is_file(), "EXPECTED_STAGE_RED[OWNER_APPROVAL_V5_MISSING]")
        approval = load_json(APPROVAL_PATH)
        self.assertEqual(approval.get("candidate_manifest_sha256"), file_hash(CANDIDATE_PATH))
        self.assertEqual(approval.get("review_report_sha256"), file_hash(REVIEW_PATH))
        self.assertEqual(approval.get("decision"), "approve")
        self.assertIs(approval.get("revoked"), False)
        self.assertTrue(approval.get("event_id"))
        self.assertTrue(approval.get("approval_message_sha256"))

    def test_accepted_manifest_exists_and_is_exactly_bound(self) -> None:
        """Fails until the separate consumable V5 accepted manifest exists."""
        self.assertTrue(ACCEPTED_PATH.is_file(), "EXPECTED_STAGE_RED[ACCEPTED_MANIFEST_V5_MISSING]")
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
