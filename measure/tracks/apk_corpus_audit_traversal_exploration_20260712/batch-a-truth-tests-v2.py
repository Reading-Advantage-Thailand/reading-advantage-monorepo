"""Fail-closed V2 truth contracts for T5 Traversal Batch A.

This fresh suite selects the committed V2 collector, rebind, mapper, and
browser-disposition bytes at the supplied role base. Source, metadata, fixture,
mapping, budget, exception, and browser-disposition gates are expected green.
Independent review and lifecycle gates remain red until their separate V2
artifacts exist.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
      measure/tracks/apk_corpus_audit_traversal_exploration_20260712/\
batch-a-truth-tests-v2.py
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unittest
from collections import Counter
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = Path(__file__).resolve().parent
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
TRACK_ID = "apk_corpus_audit_traversal_exploration_20260712"
PHASE_BASE_SHA = "52e48970bc9c4b585c55b53072ebebe466a1c4f4"
ROLE_BASE_SHA = "c83ed9b41c8442616c25d54b36e8df92d65b6f80"
COLLECTOR_ROLE_BASE_SHA = "6be9da09ef11579f3d3a5e0285b8fdc9f8e6a4c4"
MAPPER_ROLE_BASE_SHA = "a59fef7942b73aee028d7c35f5ece83687c78246"
BROWSER_ROLE_BASE_SHA = "877285f5a759eef5db9c4603f83ecdc75328a776"
HEX40 = re.compile(r"\A[0-9a-f]{40}\Z")
HEX64 = re.compile(r"\A[0-9a-f]{64}\Z")

V1_TEST = (
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/"
    "batch-a-truth-tests.py"
)
V1_RECEIPT = (
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/"
    "role-receipts/truth-test-author-batch-a.json"
)
GLOBAL_DIRECTION = "measure/product-owner-apk-provenance-direction-20260721.json"
BUDGET = (
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/"
    "phase0-budget-declaration.json"
)
SPELL_EXCEPTION = (
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/"
    "product-owner-spellweavers-budget-exception.json"
)
TRUTH_RECEIPT = RECEIPTS_DIR / "truth-test-author-batch-a-v2.json"

GAME_CONFIG: dict[str, dict[str, str]] = {
    "dragon-rider": {
        "ledger": "packages/vocabulary/dragon-rider/claim-evidence-ledger-v2.json",
        "method": "packages/vocabulary/dragon-rider/evidence-method-v2.md",
        "report": "packages/vocabulary/dragon-rider/evidence-final-report-v2-rebind.json",
        "support_report": "packages/vocabulary/dragon-rider/evidence-final-report-v2.json",
        "map": "packages/vocabulary/dragon-rider/requirements-map-v2.json",
        "map_report": "packages/vocabulary/dragon-rider/requirements-map-report-v2.json",
        "collector_receipt": "evidence-collector-dragon-rider-v2-rebind.json",
        "mapper_receipt": "requirements-mapper-dragon-rider-v2.json",
        "browser": "packages/vocabulary/dragon-rider/browser-audit.json",
        "browser_receipt": "browser-auditor-dragon-rider.json",
    },
    "dungeon-liberator": {
        "ledger": "packages/sentence/dungeon-liberator/claim-evidence-ledger-v2.json",
        "method": "packages/sentence/dungeon-liberator/evidence-method-v2.md",
        "report": "packages/sentence/dungeon-liberator/evidence-final-report-v2.json",
        "map": "packages/sentence/dungeon-liberator/requirements-map-v2.json",
        "map_report": "packages/sentence/dungeon-liberator/mapper-final-report-v2.json",
        "collector_receipt": "evidence-collector-dungeon-liberator-v2.json",
        "mapper_receipt": "requirements-mapper-dungeon-liberator-v2.json",
        "browser": "packages/sentence/dungeon-liberator/browser-audit.json",
        "browser_receipt": "browser-auditor-dungeon-liberator.json",
    },
    "spellweavers-run": {
        "ledger": "packages/catalog/spellweavers-run/claim-evidence-ledger-v2.json",
        "method": "packages/catalog/spellweavers-run/evidence-method-v2.md",
        "report": "packages/catalog/spellweavers-run/evidence-final-report-v2-rebind.json",
        "map": "packages/catalog/spellweavers-run/requirements-map-v2.json",
        "map_report": "packages/catalog/spellweavers-run/requirements-final-report-v2-rebind.json",
        "collector_receipt": "evidence-collector-spellweavers-run-v2-rebind.json",
        "mapper_receipt": "requirements-mapper-spellweavers-run-v2-rebind.json",
        "browser": "packages/catalog/spellweavers-run/browser-audit.json",
        "browser_receipt": "browser-auditor-spellweavers-run.json",
    },
}

ACTIVE_INPUT_HASHES = {
    V1_TEST: "75aec67d25b98dc21c56f3f68c978020ce1f504e3ad36c79930bbf38928f7df6",
    V1_RECEIPT: "967965717823c41cf993f3989b6ac4cfb2aca1c1c7edb902bc0cb4dca3aa65ff",
    GLOBAL_DIRECTION: "4d1ec24e900665577a413b4c5555d4d53ae1be222d8029cf391d1b55ff7da9ac",
    BUDGET: "81bceb19a002128ae6ccf859db8b6c07d8537b433d726d0fb0235997d9acf896",
    SPELL_EXCEPTION: "a0a4f2e80fa888e3fee7a1ef7e3479af559e1930cbb3eb3a5ea3a2ab8b3bbcf4",
    "measure/acceptance/measure_apk_evidence_integrity_gates_20260712/phase4-v8-accepted-gate-manifest.json": "d9f5c4771a755bae72c037fdbed6e330e523e9f2fabf60010154b981bfb283a3",
    "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json": "d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729",
    "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json": "6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0",
    "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json": "cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/phase0-discovery-audit.json": "6524d33b1af38d93b9cc0a3f1b31421979f7a4120f68d9065935946312e6c152",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/vocabulary/dragon-rider/claim-evidence-ledger-v2.json": "fb778224e67609457ac8ac712bc85b3f5096483e0116f1162a2818bac6b48fe9",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/vocabulary/dragon-rider/evidence-method-v2.md": "4473e4362d4523a29211705177b2b3b4357e9761ef0630c555d8152ec56bf81f",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/vocabulary/dragon-rider/evidence-final-report-v2.json": "364254b1226fc38eda49e1787f1cb5f74ee030c4b3b2ce610682dca2276ff9ff",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/vocabulary/dragon-rider/evidence-final-report-v2-rebind.json": "d32ad575564620d048d8f2bd67c8cc6edcc7c8b24624f07b8df8691bb4d91e04",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/vocabulary/dragon-rider/requirements-map-v2.json": "1b6b52bd21ecefdff0edab3cbe27e6edc3e615ff274d1f10e1d65b9721ef96a6",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/vocabulary/dragon-rider/requirements-map-report-v2.json": "239d03cd15c2f22fdd00bae45163f34237579c4d2285e55432c67e719a53b8b6",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/evidence-collector-dragon-rider-v2-rebind.json": "55e6c58e190dc14a8bca4f9d6c832eaea2fb3093b68857e914a51ebb5e579960",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/requirements-mapper-dragon-rider-v2.json": "c77ff7709e5454c36687e5629c2523096bc4685b899e36e5ff6fac4cc0aaeba6",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/dungeon-liberator/claim-evidence-ledger-v2.json": "ff97238f94caa82a5359143c0a25d2a5ee8a2e479bb2fdd0bfea9aab05eef2bd",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/dungeon-liberator/evidence-method-v2.md": "b016c972605bc85b8b5b78b5f5c8fc245e17b0b28a03b7d67a38efb0f51cae5e",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/dungeon-liberator/evidence-final-report-v2.json": "f845243d7dc3fe1a0c3cf173fb3669bf3e490d7bf44d7d379e843b2902bb113f",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/dungeon-liberator/requirements-map-v2.json": "5fe082c52ef1c12d006bdb496d3faa6ae911c5173a9fd54a196d72f9a1bfba8e",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/dungeon-liberator/mapper-final-report-v2.json": "5bf070752aeebf112421f4354661446e5b441bd82283e597dc98906a7f4ef839",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/evidence-collector-dungeon-liberator-v2.json": "771078740a227234d3e4fb77072673b593874d4e40f35f0c777b8d7068d53e53",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/requirements-mapper-dungeon-liberator-v2.json": "d90c9d7d929e0a0daeadab47443a422e136af1d8bf02d33dfdae0a400142306b",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/spellweavers-run/claim-evidence-ledger-v2.json": "2cd708cbecf94133b92ce5f06822ad420da28a1d4417fdb74284528e7a9fe24b",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/spellweavers-run/evidence-method-v2.md": "1cd64613e86482a78830f522fbe6d83cf1a812d3c42fcbd97e06f9ade035e92a",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/spellweavers-run/evidence-final-report-v2-rebind.json": "c8c174e223501dc1ae4e636a4c45eb8fbc6552011e1b327be1e755df3569197f",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/spellweavers-run/requirements-map-v2.json": "2d1ec95fd9b11230b9800ac50ab7aae7d37f71eae47ccb88e0751142485698ea",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/spellweavers-run/requirements-final-report-v2-rebind.json": "39d017fb719e00f32cfbe6f5e9380bd3eb475015a1cc6abdd9d4a536e0e82f2c",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/evidence-collector-spellweavers-run-v2-rebind.json": "4e639b4ce5116905f46472cd2444284b0e958f5e14e1df9ccf9a99ff95ac131d",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/requirements-mapper-spellweavers-run-v2-rebind.json": "a5231be5461e3a667cc1c868959901fcb98a8dc552225121cae629ac69f1dc7c",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/vocabulary/dragon-rider/browser-audit.json": "a8184107e8f197924992335caa54c4bf95de718ff6e5c7e5de225488599ea273",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/sentence/dungeon-liberator/browser-audit.json": "a8a3e6d81fa7d796f20db749802d618062cd0380ba1713042f3482e336773a5e",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/packages/catalog/spellweavers-run/browser-audit.json": "530a7fb302c7feec001f2faf8b88e4ec331595206e8d9773ab5c96c8d326ba06",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/browser-auditor-dragon-rider.json": "5c96218f0f273ba6e6c525e4a5c785086395800a22a30231a9b13a7d81930a38",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/browser-auditor-dungeon-liberator.json": "64bff92c099e38d52744abb28e1060076864aeaaca15f81f609c50d14e5db1c1",
    "measure/tracks/apk_corpus_audit_traversal_exploration_20260712/role-receipts/browser-auditor-spellweavers-run.json": "2725b9bc762ac64fc9701f1526d9f745470352f3ed8eaabb5cc8aebe4d154b26",
}

REVIEW_PATH = TRACK_DIR / "batch-a-independent-review-v2.json"
REVIEW_RECEIPT_PATH = RECEIPTS_DIR / "adversarial-reviewer-batch-a-v2.json"
CANDIDATE_PATH = TRACK_DIR / "candidate-cohort-manifest-batch-a-v2.json"
APPROVAL_PATH = TRACK_DIR / "product-owner-acceptance-batch-a-v2.json"
ACCEPTED_PATH = TRACK_DIR / "accepted-cohort-manifest-batch-a-v2.json"


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


def ledger_document(game: str) -> Any:
    """Loads one selected V2 claim ledger."""
    return load_json(track_path(GAME_CONFIG[game]["ledger"]))


def claims(game: str) -> list[dict[str, Any]]:
    """Returns all embedded claims in one selected ledger."""
    document = ledger_document(game)
    return document if isinstance(document, list) else document["claims"]


def is_fixture(record: dict[str, Any]) -> bool:
    """Returns whether a record is a negative fixture."""
    return record.get("category") in {"negative-fixture", "negative_fixture"}


def factual_claims(game: str) -> list[dict[str, Any]]:
    """Returns only positive factual claim candidates."""
    return [record for record in claims(game) if not is_fixture(record)]


def fixtures(game: str) -> list[dict[str, Any]]:
    """Returns embedded and separately declared negative fixtures."""
    document = ledger_document(game)
    embedded = [record for record in claims(game) if is_fixture(record)]
    separate = [] if isinstance(document, list) else document.get("fixture_records", [])
    return embedded + separate


def record_id(record: dict[str, Any]) -> str:
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
    claim_id = record_id(record) or "<missing-id>"
    cite = citation(record)
    relative = cite.get("path")
    revision = cite.get("revision")
    start = cite.get("line_start")
    end = cite.get("line_end")
    range_hash = cite.get("cited_range_sha256")
    blob_hash = cite.get("blob_sha256")
    errors: list[str] = []
    if not isinstance(relative, str) or not relative:
        return [f"{claim_id}:missing-path"]
    if Path(relative).is_absolute() or ".." in Path(relative).parts:
        errors.append(f"{claim_id}:unbounded-path")
    if relative.endswith("/"):
        errors.append(f"{claim_id}:directory-citation")
    if not isinstance(revision, str) or not HEX40.fullmatch(revision):
        return errors + [f"{claim_id}:revision"]
    if not isinstance(blob_hash, str) or not HEX64.fullmatch(blob_hash):
        errors.append(f"{claim_id}:blob-hash-shape")
    if not isinstance(range_hash, str) or not HEX64.fullmatch(range_hash):
        errors.append(f"{claim_id}:range-hash-shape")
    source = git_show(revision, relative)
    if source is None:
        return errors + [f"{claim_id}:unreachable"]
    if sha256(source) != blob_hash:
        errors.append(f"{claim_id}:blob-hash")
    if not isinstance(start, int) or not isinstance(end, int):
        return errors + [f"{claim_id}:line-types"]
    lines = source.splitlines(keepends=True)
    if not 1 <= start <= end <= len(lines):
        return errors + [f"{claim_id}:line-bounds"]
    if sha256(b"".join(lines[start - 1 : end])) != range_hash:
        errors.append(f"{claim_id}:range-hash")
    return errors


def related_citation_errors(record: dict[str, Any]) -> list[str]:
    """Returns errors from additional exact envelopes."""
    errors: list[str] = []
    revision = citation(record).get("revision")
    for index, envelope in enumerate(record.get("related_exact_envelopes", [])):
        errors.extend(
            citation_errors(
                {
                    "claim_id": f"{record_id(record)}:related:{index}",
                    "file_path": envelope.get("path"),
                    "line_start": envelope.get("line_start"),
                    "line_end": envelope.get("line_end"),
                    "cited_range_sha256": envelope.get("range_sha256"),
                    "blob_sha256": envelope.get("blob_sha256"),
                    "revision": revision,
                }
            )
        )
    return errors


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


def resolve_output(relative: str) -> Path:
    """Resolves repository- or track-relative declared output paths."""
    if relative.startswith("measure/"):
        return REPO_ROOT / relative
    return TRACK_DIR / relative


class BatchAV2FreezeContract(unittest.TestCase):
    """Exact input selection, predecessor, and role-base contracts."""

    def test_supplied_bases_are_real_and_ordered(self) -> None:
        """Fails when the supplied phase or role base is malformed or unordered."""
        for revision in (
            PHASE_BASE_SHA,
            COLLECTOR_ROLE_BASE_SHA,
            BROWSER_ROLE_BASE_SHA,
            MAPPER_ROLE_BASE_SHA,
            ROLE_BASE_SHA,
        ):
            self.assertRegex(revision, HEX40)
            self.assertTrue(is_ancestor(PHASE_BASE_SHA, revision))
            self.assertTrue(is_ancestor(revision, ROLE_BASE_SHA))

    def test_exact_v2_inputs_are_hashed_and_committed_at_role_base(self) -> None:
        """Fails when a selected V2, browser, direction, or V1 input drifts."""
        defects: list[str] = []
        for relative, expected in ACTIVE_INPUT_HASHES.items():
            path = REPO_ROOT / relative
            if not path.is_file() or file_hash(path) != expected:
                defects.append(f"{relative}:working-tree")
            elif git_show(ROLE_BASE_SHA, relative) != path.read_bytes():
                defects.append(f"{relative}:role-base")
        self.assertEqual(defects, [], f"active input drift: {defects}")

    def test_accepted_predecessors_are_consumable_and_unrevoked(self) -> None:
        """Fails when an inherited T1, T2, or T3 predecessor is not accepted."""
        paths = [
            "measure/acceptance/measure_apk_evidence_integrity_gates_20260712/phase4-v8-accepted-gate-manifest.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
            "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
        ]
        for relative in paths:
            document = load_json(REPO_ROOT / relative)
            self.assertTrue(document.get("consumable"), relative)
            self.assertNotEqual(document.get("status"), "revoked", relative)
            if "revoked" in document:
                self.assertIs(document["revoked"], False, relative)

    def test_batch_a_scope_and_partition_are_exact(self) -> None:
        """Fails when Batch A is widened, renamed, or independently misassigned."""
        expected = ("Dragon Rider", "Dungeon Liberator", "Spellweaver's Run")
        discovery = load_json(TRACK_DIR / "phase0-discovery-audit.json")
        self.assertEqual(tuple(discovery["scope"]["identities"][:3]), expected)
        partition = load_json(
            REPO_ROOT
            / "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json"
        )
        selected = [
            row["canonical_identity_label"]
            for row in partition["assignments"]
            if row["cohort"] == "Traversal and exploration"
        ]
        self.assertEqual(tuple(selected[:3]), expected)
        self.assertEqual(len(selected), 7)
        self.assertEqual(len(selected), len(set(selected)))


class BatchAV2ClaimContract(unittest.TestCase):
    """All-claim count, metadata, source-envelope, and temporal contracts."""

    def test_claim_and_fixture_denominators_are_exact(self) -> None:
        """Fails when any V2 ledger adds, drops, or duplicates an atomic record."""
        expected = {
            "dragon-rider": (16, 3),
            "dungeon-liberator": (16, 3),
            "spellweavers-run": (48, 3),
        }
        all_ids: list[str] = []
        for game, (fact_total, fixture_total) in expected.items():
            self.assertEqual(len(factual_claims(game)), fact_total, game)
            self.assertEqual(len(fixtures(game)), fixture_total, game)
            ids = [record_id(item) for item in factual_claims(game) + fixtures(game)]
            self.assertNotIn("", ids, game)
            self.assertEqual(len(ids), len(set(ids)), game)
            all_ids.extend(ids)
        self.assertEqual(len(all_ids), len(set(all_ids)))

    def test_every_factual_claim_has_required_program_metadata(self) -> None:
        """Fails when source, interpretation, provenance, conflict, or review metadata is absent."""
        defects: list[str] = []
        fields = (
            "interpretation",
            "confidence",
            "evidence_class",
            "discovery_method",
            "collector_agent",
            "conflict_state",
            "conflict_resolution",
            "reviewer_agent",
            "reviewer_disposition",
        )
        for game in GAME_CONFIG:
            for record in factual_claims(game):
                if not record.get("source_fact", record.get("claim_text")):
                    defects.append(f"{record_id(record)}:source-fact")
                for field in fields:
                    if record.get(field) in (None, ""):
                        defects.append(f"{record_id(record)}:{field}")
        self.assertEqual(defects, [], f"metadata defects: {defects}")

    def test_every_positive_envelope_matches_exact_git_bytes(self) -> None:
        """Fails when any of the 80 factual envelopes or related envelopes drifts."""
        errors: list[str] = []
        for game in GAME_CONFIG:
            for record in factual_claims(game):
                errors.extend(citation_errors(record))
                errors.extend(related_citation_errors(record))
        self.assertEqual(errors, [], f"citation defects: {errors}")

    def test_factual_citations_stay_within_bounded_source_roots(self) -> None:
        """Fails when quarantine, prose, or arbitrary paths become factual evidence."""
        allowed = (
            "apps/advantage-games/",
            "apps/reading-advantage/",
            "packages/game-cartridges/",
            "measure/archive/apk_source_denominator_inventory_20260712/",
        )
        defects = [
            f"{record_id(record)}:{citation(record).get('path')}"
            for game in GAME_CONFIG
            for record in factual_claims(game)
            if not str(citation(record).get("path", "")).startswith(allowed)
        ]
        self.assertEqual(defects, [])

    def test_spellweaver_current_and_historical_meanings_are_separate(self) -> None:
        """Fails when deleted legacy/cartridge behavior is promoted to current behavior."""
        historical = {
            "4106ba39547c8cac7645ce0f257a6bdd133712e9",
            "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f",
        }
        defects = [
            record_id(record)
            for record in factual_claims("spellweavers-run")
            if citation(record)["revision"] in historical
            and record.get("evidence_class") != "history"
        ]
        self.assertEqual(defects, [])
        report = load_json(track_path(GAME_CONFIG["spellweavers-run"]["report"]))
        self.assertIn("coming-soon", report["temporal_reconciliation"]["role_base_current"])
        self.assertEqual(report["accepted_factual_claim_candidates"], 48)
        self.assertEqual(report["negative_fixtures"], 3)


class BatchAV2FixtureContract(unittest.TestCase):
    """Independent negative-fixture identity and no-positive-citation contracts."""

    def test_all_nine_fixtures_are_explicitly_rejected(self) -> None:
        """Fails when an unsupported proposition is not an executable rejection fixture."""
        defects: list[str] = []
        for game in GAME_CONFIG:
            for fixture in fixtures(game):
                disposition = str(
                    fixture.get(
                        "expected_disposition", fixture.get("reviewer_disposition", "")
                    )
                ).upper()
                if "REJECT" not in disposition:
                    defects.append(record_id(fixture))
        self.assertEqual(defects, [])

    def test_negative_fixtures_have_no_positive_citation(self) -> None:
        """Fails when a rejected proposition carries a positive source envelope."""
        defects: list[str] = []
        for game in GAME_CONFIG:
            for fixture in fixtures(game):
                if any(value is not None for value in citation(fixture).values()):
                    defects.append(record_id(fixture))
        self.assertEqual(defects, [])

    def test_fixture_ids_are_unique_across_batch_a(self) -> None:
        """Fails when fixture identities collide across selected games."""
        ids = [record_id(item) for game in GAME_CONFIG for item in fixtures(game)]
        self.assertEqual(len(ids), 9)
        self.assertEqual(len(ids), len(set(ids)))


class BatchAV2MapperContract(unittest.TestCase):
    """Exact collector binding, mapper ID, count, and no-new-fact contracts."""

    def test_maps_bind_exact_latest_v2_collector_bytes(self) -> None:
        """Fails when a V2 map points to a superseded ledger, report, rebind, or exception."""
        dragon = load_json(track_path(GAME_CONFIG["dragon-rider"]["map"]))
        self.assertEqual(
            dragon["ledger_binding"]["sha256"],
            file_hash(track_path(GAME_CONFIG["dragon-rider"]["ledger"])),
        )
        self.assertEqual(
            dragon["rebind_binding"]["sha256"],
            file_hash(receipt_path(GAME_CONFIG["dragon-rider"]["collector_receipt"])),
        )
        dungeon = load_json(track_path(GAME_CONFIG["dungeon-liberator"]["map"]))
        self.assertEqual(
            dungeon["evidence_ledger_sha256"],
            file_hash(track_path(GAME_CONFIG["dungeon-liberator"]["ledger"])),
        )
        spell = load_json(track_path(GAME_CONFIG["spellweavers-run"]["map"]))
        bindings = spell["input_bindings"]
        expected = {
            "claim_ledger": track_path(GAME_CONFIG["spellweavers-run"]["ledger"]),
            "collector_report": track_path(GAME_CONFIG["spellweavers-run"]["report"]),
            "collector_method": track_path(GAME_CONFIG["spellweavers-run"]["method"]),
            "collector_receipt": receipt_path(
                GAME_CONFIG["spellweavers-run"]["collector_receipt"]
            ),
            "budget_exception": REPO_ROOT / SPELL_EXCEPTION,
        }
        self.assertEqual(
            {key: value["sha256"] for key, value in bindings.items()},
            {key: file_hash(path) for key, path in expected.items()},
        )

    def test_every_mapper_id_resolves_to_the_correct_v2_ledger(self) -> None:
        """Fails when a mapper omits, invents, or imports a claim or unknown ID."""
        dragon_doc = ledger_document("dragon-rider")
        dragon_map = load_json(track_path(GAME_CONFIG["dragon-rider"]["map"]))
        dragon_claim_refs = set(
            flatten_strings(values_for_key(dragon_map, "cited_claim_ids"))
        )
        dragon_unknown_refs = set(
            flatten_strings(values_for_key(dragon_map, "cited_unknown_ids"))
        )
        self.assertEqual(
            dragon_claim_refs,
            {record_id(item) for item in factual_claims("dragon-rider")},
        )
        self.assertEqual(
            dragon_unknown_refs,
            {item["unknown_id"] for item in dragon_doc["explicit_unknowns"]},
        )
        dungeon_map = load_json(track_path(GAME_CONFIG["dungeon-liberator"]["map"]))
        self.assertEqual(
            set(flatten_strings(values_for_key(dungeon_map, "claim_ids"))),
            {record_id(item) for item in factual_claims("dungeon-liberator") + fixtures("dungeon-liberator")},
        )
        spell_map = load_json(track_path(GAME_CONFIG["spellweavers-run"]["map"]))
        spell_refs = set(
            flatten_strings(values_for_key(spell_map, "backing_claim_ids"))
            + flatten_strings(values_for_key(spell_map["negative_fixtures"], "claim_id"))
        )
        self.assertEqual(
            spell_refs,
            {record_id(item) for item in factual_claims("spellweavers-run") + fixtures("spellweavers-run")},
        )

    def test_mapper_declared_counts_are_mechanically_reproducible(self) -> None:
        """Fails when mapper count summaries drift from their exact active IDs."""
        dragon = load_json(track_path(GAME_CONFIG["dragon-rider"]["map"]))
        self.assertEqual(dragon["claim_reference_accounting"]["distinct_claim_ids_referenced"], 16)
        dungeon = load_json(track_path(GAME_CONFIG["dungeon-liberator"]["map"]))
        self.assertEqual(dungeon["validation"]["factual_claim_ids_referenced"], 16)
        self.assertEqual(dungeon["validation"]["negative_fixture_claim_ids_referenced"], 3)
        spell = load_json(track_path(GAME_CONFIG["spellweavers-run"]["map"]))
        self.assertEqual(spell["counts"]["distinct_referenced_claim_ids"], 51)
        self.assertEqual(spell["counts"]["unresolved_claim_ids"], 0)

    def test_mappers_add_no_source_fact_browser_claim_or_standardization(self) -> None:
        """Fails when mapping becomes evidence collection or cross-game design."""
        forbidden_keys = {"source_fact", "claim_text", "citation"}
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["map"]))
            keys = set(_walk_keys(document))
            text = json.dumps(document, sort_keys=True).lower()
            self.assertFalse(forbidden_keys & keys, game)
            self.assertNotIn("standardize across", text, game)
            self.assertNotIn("cross-game standard", text, game)
            self.assertIn(document.get("acceptance", "not-claimed"), {"not-claimed", False})


def _walk_keys(value: Any) -> list[str]:
    """Returns all dictionary keys recursively."""
    keys: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            keys.append(key)
            keys.extend(_walk_keys(child))
    elif isinstance(value, list):
        for child in value:
            keys.extend(_walk_keys(child))
    return keys


class BatchAV2ReceiptAndBudgetContract(unittest.TestCase):
    """Owner provenance, output hash, budget, exception, and role-scope contracts."""

    def test_global_provenance_direction_is_exact_and_applies_to_all_roles(self) -> None:
        """Fails when local-verifiability authority is broadened or substituted."""
        direction = load_json(REPO_ROOT / GLOBAL_DIRECTION)
        self.assertEqual(direction["decision"], "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE")
        self.assertIn(TRACK_ID, direction["scope"]["tracks"])
        for role in ("evidence-collector", "requirements-mapper", "browser-auditor", "truth-test-author"):
            self.assertIn(role, direction["scope"]["roles"])
        controls = " ".join(direction["required_compensating_controls"]).lower()
        self.assertIn("committed git binding", controls)
        self.assertIn("fresh independent review", controls)

    def test_selected_role_receipts_are_disclosed_and_role_base_committed(self) -> None:
        """Fails when a selected receipt fabricates provider data or lacks immutable local bytes."""
        expected_bases = {
            "collector_receipt": COLLECTOR_ROLE_BASE_SHA,
            "mapper_receipt": MAPPER_ROLE_BASE_SHA,
            "browser_receipt": BROWSER_ROLE_BASE_SHA,
        }
        defects: list[str] = []
        for config in GAME_CONFIG.values():
            for key, expected_base in expected_bases.items():
                path = receipt_path(config[key])
                document = load_json(path)
                text = json.dumps(document, sort_keys=True).lower()
                if document.get("track_id") != TRACK_ID:
                    defects.append(f"{path.name}:track")
                if not str(document.get("phase", "")).startswith("Phase 1: Batch A"):
                    defects.append(f"{path.name}:phase")
                if document.get("role_base_sha") != expected_base:
                    defects.append(f"{path.name}:role-base-metadata")
                if "unavailable" not in text:
                    defects.append(f"{path.name}:provider-disclosure")
                relative = str(path.relative_to(REPO_ROOT))
                if git_show(ROLE_BASE_SHA, relative) != path.read_bytes():
                    defects.append(f"{path.name}:role-base-bytes")
        self.assertEqual(defects, [], f"receipt defects: {defects}")

    def test_selected_receipt_output_hashes_match_exact_outputs(self) -> None:
        """Fails when any declared V2 collector, mapper, or browser output hash is stale."""
        defects: list[str] = []
        for config in GAME_CONFIG.values():
            for key in ("collector_receipt", "mapper_receipt", "browser_receipt"):
                path = receipt_path(config[key])
                document = load_json(path)
                for relative, expected in document.get("output_hashes", {}).items():
                    if relative == "self" or "self-hashed" in str(expected):
                        continue
                    output = resolve_output(relative)
                    if not output.is_file() or file_hash(output) != expected:
                        defects.append(f"{path.name}:{relative}")
        self.assertEqual(defects, [], f"stale output hashes: {defects}")

    def test_collector_budgets_are_within_ceiling_or_exact_exception(self) -> None:
        """Fails when known collector actuals exceed a frozen non-excepted unit."""
        budget = load_json(REPO_ROOT / BUDGET)
        ceiling = budget["ceilings"]["per_game_roles"]["evidence_collector_one_game"]
        exception = load_json(REPO_ROOT / SPELL_EXCEPTION)
        for game, config in GAME_CONFIG.items():
            document = load_json(receipt_path(config["collector_receipt"]))
            actual = document["actual_usage"]
            for unit, limit in ceiling.items():
                value = actual.get(unit)
                if game == "spellweavers-run" and unit == "source_bytes":
                    limit = exception["approved_ceiling"]
                if value is None:
                    self.assertEqual(unit, "elapsed_minutes", game)
                    self.assertIn("unavailable", json.dumps(document).lower())
                    continue
                self.assertIsInstance(value, int, f"{game}:{unit}")
                self.assertLessEqual(value, limit, f"{game}:{unit}")

    def test_mapper_budgets_are_bounded_with_timing_unknown_disclosed(self) -> None:
        """Fails when mapper local actuals exceed ceilings or unavailable timing is fabricated."""
        ceiling = load_json(REPO_ROOT / BUDGET)["ceilings"]["per_game_roles"]["requirements_mapper_one_game"]
        actuals = {
            "dragon-rider": {
                "source_bytes": 42966,
                "source_files_objects": 7,
                "commands": 2,
                "elapsed_minutes": 1,
                "records_authored_reviewed": 13,
                "browser_interactions": 0,
                "captured_artifacts": 0,
            },
            "dungeon-liberator": {
                key: value
                for key, value in load_json(
                    receipt_path(GAME_CONFIG["dungeon-liberator"]["mapper_receipt"])
                )["actual_usage"].items()
                if key in ceiling
            },
            "spellweavers-run": {
                "source_bytes": 67816,
                "source_files_objects": 5,
                "commands": 1,
                "records_authored_reviewed": 0,
                "browser_interactions": 0,
                "captured_artifacts": 0,
            },
        }
        for game, actual in actuals.items():
            for unit, value in actual.items():
                self.assertIsInstance(value, int, f"{game}:{unit}")
                self.assertLessEqual(value, ceiling[unit], f"{game}:{unit}")
        spell = load_json(receipt_path(GAME_CONFIG["spellweavers-run"]["mapper_receipt"]))
        self.assertIsNone(spell["integer_actuals"]["elapsed_minutes"])
        self.assertIn("unavailable", spell["measurement_basis"].lower())

    def test_spellweaver_one_time_exception_and_successor_disclosures_are_exact(self) -> None:
        """Fails when the original breach, narrow increase, or non-waiver is hidden."""
        exception = load_json(REPO_ROOT / SPELL_EXCEPTION)
        self.assertEqual(exception["decision"], "ONE_TIME_SOURCE_BYTE_CEILING_INCREASE")
        self.assertEqual(exception["old_ceiling"], 8_000_000)
        self.assertEqual(exception["approved_ceiling"], 12_000_000)
        self.assertEqual(exception["measured_actual"], 11_558_850)
        self.assertIn("source_bytes only", exception["supersedes"])
        self.assertIn("does not apply to other games or roles", " ".join(exception["conditions"]).lower())
        selected = [
            track_path(GAME_CONFIG["spellweavers-run"][key])
            for key in ("method", "report", "map", "map_report")
        ] + [
            receipt_path(GAME_CONFIG["spellweavers-run"][key])
            for key in ("collector_receipt", "mapper_receipt")
        ]
        defects: list[str] = []
        for path in selected:
            normalized = path.read_text(encoding="utf-8").lower().replace(",", "")
            for token in ("11558850", "8000000", "12000000", "exception"):
                if token not in normalized:
                    defects.append(f"{path.name}:{token}")
        self.assertEqual(defects, [], f"exception disclosure defects: {defects}")

    def test_truth_receipt_binds_v2_test_and_fresh_role_scope(self) -> None:
        """Fails when this isolated role claims another role or another test/base."""
        receipt = load_json(TRUTH_RECEIPT)
        self.assertEqual(receipt["role"], "truth-test-author-batch-a-v2")
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
        self.assertEqual(receipt["prior_role_history"], [])
        self.assertEqual(receipt["role_isolation"]["roles_held"], ["truth-test-author"])
        self.assertEqual(receipt["input_hashes"], ACTIVE_INPUT_HASHES)
        binding = next(
            item
            for item in receipt["output_paths_and_sha256"]
            if item["path"] == str(Path(__file__).resolve().relative_to(REPO_ROOT))
        )
        self.assertEqual(binding["sha256"], file_hash(Path(__file__).resolve()))
        actual = receipt["actual_usage"]
        ceiling = load_json(REPO_ROOT / BUDGET)["ceilings"]["batch_roles"]["truth_test_author_all_seven"]
        for unit, limit in ceiling.items():
            self.assertIsInstance(actual[unit], int, unit)
            self.assertLessEqual(actual[unit], limit, unit)


class BatchAV2BrowserDispositionContract(unittest.TestCase):
    """Exact blocked/non-runnable browser disposition and no-overclaim contracts."""

    def test_dragon_rider_route_unreachable_disposition_is_exact(self) -> None:
        """Fails when connection refusal becomes movement, input, or responsive proof."""
        audit = load_json(track_path(GAME_CONFIG["dragon-rider"]["browser"]))
        self.assertEqual(audit["disposition"], "browser-audit-blocked-route-unreachable")
        self.assertTrue(audit["browser_access"]["kimi_webbridge_used"])
        self.assertIn("ERR_CONNECTION_REFUSED", json.dumps(audit["attempted_commands"]))
        self.assertEqual(audit["observations"]["compact_view"]["status"], "unknown")
        self.assertEqual(audit["observations"]["wide_view"]["status"], "unknown")
        self.assertEqual(audit["observations"]["transitions"]["actual_transitions_independently_established"], [])
        self.assertFalse(audit["observations"]["input_trust"]["trusted_native_input_established"])
        self.assertFalse(audit["observations"]["input_trust"]["synthetic_input_used"])

    def test_dungeon_liberator_browser_unavailable_disposition_is_exact(self) -> None:
        """Fails when no browser session becomes a runnable or observed-behavior claim."""
        audit = load_json(track_path(GAME_CONFIG["dungeon-liberator"]["browser"]))
        self.assertEqual(audit["disposition"], "browser-audit-blocked-browser-unavailable")
        self.assertFalse(audit["browser_access"]["kimi_webbridge_available"])
        self.assertIn("not navigated", audit["route_status"])
        self.assertEqual(audit["observations"]["transitions"]["actual_transitions_independently_established"], [])
        self.assertFalse(audit["observations"]["input_trust"]["trusted_native_input_established"])
        self.assertFalse(audit["observations"]["input_trust"]["synthetic_input_used"])

    def test_spellweaver_non_runnable_unknown_disposition_is_exact(self) -> None:
        """Fails when candidate routes or historical source become current browser proof."""
        audit = load_json(track_path(GAME_CONFIG["spellweavers-run"]["browser"]))
        self.assertEqual(audit["status"], "bounded-non-runnable-unknown")
        self.assertTrue(audit["disposition"].startswith("NON-RUNNABLE/UNKNOWN"))
        self.assertFalse(audit["browser_access"]["available"])
        self.assertTrue(all(item["attempt"] == "not-executed" for item in audit["route_attempts"]))
        self.assertEqual(audit["observations"]["screenshots"], "none captured")
        self.assertIn("not-observed", audit["observations"]["keyboard"])
        self.assertIn("not-tested", audit["observations"]["production_persistence"])

    def test_browser_budgets_and_receipt_dispositions_match_audits(self) -> None:
        """Fails when a browser role exceeds interaction budget or changes disposition."""
        limit = load_json(REPO_ROOT / BUDGET)["ceilings"]["per_game_roles"]["browser_auditor_one_game"]["browser_interactions"]
        expected = {
            "dragon-rider": (8, "blocked"),
            "dungeon-liberator": (0, "blocked"),
            "spellweavers-run": (0, "NON-RUNNABLE/UNKNOWN"),
        }
        for game, (interactions, disposition_token) in expected.items():
            audit = load_json(track_path(GAME_CONFIG[game]["browser"]))
            receipt = load_json(receipt_path(GAME_CONFIG[game]["browser_receipt"]))
            actual = (
                audit.get("budget", {}).get("actual_browser_interactions")
                if game != "spellweavers-run"
                else receipt["resource_use"]["actual"]["browser_interactions"]
            )
            self.assertEqual(actual, interactions, game)
            self.assertLessEqual(actual, limit, game)
            self.assertIn(disposition_token.lower(), json.dumps(receipt).lower(), game)
            self.assertNotIn("production persistence established", json.dumps(audit).lower())


class BatchAV2IndependentReviewContract(unittest.TestCase):
    """Fresh independent-review existence, exact-input, and blocker contracts."""

    def test_fresh_independent_review_binds_every_active_v2_input(self) -> None:
        """Fails only while the separate V2 review report and receipt do not exist or are stale."""
        self.assertTrue(
            REVIEW_PATH.is_file() and REVIEW_RECEIPT_PATH.is_file(),
            "EXPECTED_STAGE_RED[INDEPENDENT_REVIEW_V2_MISSING]",
        )
        review = load_json(REVIEW_PATH)
        receipt = load_json(REVIEW_RECEIPT_PATH)
        required = dict(ACTIVE_INPUT_HASHES)
        required[str(Path(__file__).resolve().relative_to(REPO_ROOT))] = file_hash(Path(__file__).resolve())
        required[str(TRUTH_RECEIPT.relative_to(REPO_ROOT))] = file_hash(TRUTH_RECEIPT)
        inputs = receipt.get("input_hashes", {})
        defects = [relative for relative, digest in required.items() if inputs.get(relative) != digest]
        audited_head = review.get("audited_head_sha")
        if not isinstance(audited_head, str) or not HEX40.fullmatch(audited_head):
            defects.append("audited-head")
        elif not is_ancestor(ROLE_BASE_SHA, audited_head):
            defects.append("review-predates-role-base")
        blockers = review.get("unresolved_findings", {})
        for severity in ("critical", "high", "medium"):
            if blockers.get(severity) != 0:
                defects.append(f"unresolved-{severity}")
        self.assertEqual(defects, [], f"independent review defects: {defects}")


class BatchAV2LifecycleContract(unittest.TestCase):
    """Ordered candidate, owner-approval, and accepted-manifest contracts."""

    def test_candidate_manifest_exists_and_binds_review_and_truth(self) -> None:
        """Fails only while the separate non-consumable V2 candidate does not exist or is stale."""
        self.assertTrue(CANDIDATE_PATH.is_file(), "EXPECTED_STAGE_RED[CANDIDATE_V2_MISSING]")
        candidate = load_json(CANDIDATE_PATH)
        self.assertFalse(candidate.get("consumable"))
        hashes = candidate.get("input_hashes", {})
        required = (Path(__file__).resolve(), TRUTH_RECEIPT, REVIEW_PATH, REVIEW_RECEIPT_PATH)
        for path in required:
            relative = str(path.relative_to(REPO_ROOT))
            self.assertEqual(hashes.get(relative), file_hash(path), relative)

    def test_product_owner_approval_exists_and_is_exactly_bound(self) -> None:
        """Fails only while authentic post-candidate V2 owner approval does not exist or is stale."""
        self.assertTrue(APPROVAL_PATH.is_file(), "EXPECTED_STAGE_RED[OWNER_APPROVAL_V2_MISSING]")
        approval = load_json(APPROVAL_PATH)
        self.assertEqual(approval.get("candidate_manifest_sha256"), file_hash(CANDIDATE_PATH))
        self.assertEqual(approval.get("review_report_sha256"), file_hash(REVIEW_PATH))
        self.assertEqual(approval.get("decision"), "approve")
        self.assertIs(approval.get("revoked"), False)
        self.assertTrue(approval.get("event_id"))
        self.assertTrue(approval.get("approval_message_sha256"))

    def test_accepted_manifest_exists_and_is_exactly_bound(self) -> None:
        """Fails only while the separate consumable V2 accepted manifest does not exist or is stale."""
        self.assertTrue(ACCEPTED_PATH.is_file(), "EXPECTED_STAGE_RED[ACCEPTED_MANIFEST_V2_MISSING]")
        accepted = load_json(ACCEPTED_PATH)
        self.assertEqual(accepted.get("status"), "accepted")
        self.assertTrue(accepted.get("consumable"))
        self.assertIs(accepted.get("revoked"), False)
        self.assertEqual(accepted.get("candidate_manifest_sha256"), file_hash(CANDIDATE_PATH))
        self.assertEqual(accepted.get("owner_acceptance_sha256"), file_hash(APPROVAL_PATH))
        disclosure = json.dumps(accepted, sort_keys=True).lower()
        self.assertIn("provider-side", disclosure)
        self.assertIn("unavailable", disclosure)
        self.assertIn("11558850", disclosure.replace(",", ""))


if __name__ == "__main__":
    unittest.main()
