"""Fail-closed source-truth contracts for T5 Traversal Batch A.

These tests validate the frozen predecessors, all collector claim envelopes,
mapper backing IDs, negative fixtures, budgets, and locally verifiable role
receipts. Browser tests require disposition inputs to exist but deliberately do
not require a successful run. Review and lifecycle tests stay red until their
independently authored artifacts exist and bind the exact active inputs.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
      measure/tracks/apk_corpus_audit_traversal_exploration_20260712/\
batch-a-truth-tests.py
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unittest
from collections import Counter
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = (
    REPO_ROOT
    / "measure"
    / "tracks"
    / "apk_corpus_audit_traversal_exploration_20260712"
)
RECEIPTS_DIR = TRACK_DIR / "role-receipts"

TRACK_ID = "apk_corpus_audit_traversal_exploration_20260712"
PHASE = "Phase 1: Batch A"
PHASE_BASE_SHA = "52e48970bc9c4b585c55b53072ebebe466a1c4f4"
ROLE_BASE_SHA = "877285f5a759eef5db9c4603f83ecdc75328a776"
SOURCE_BASELINE_SHA = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
T1_SHA256 = "d9f5c4771a755bae72c037fdbed6e330e523e9f2fabf60010154b981bfb283a3"
T2_DENOMINATOR_SHA256 = (
    "d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729"
)
T2_PARTITION_SHA256 = (
    "6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0"
)
T3_PILOT_SHA256 = (
    "cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b"
)
PROVENANCE_DIRECTION_SHA256 = (
    "4d1ec24e900665577a413b4c5555d4d53ae1be222d8029cf391d1b55ff7da9ac"
)
BUDGET_SHA256 = (
    "81bceb19a002128ae6ccf859db8b6c07d8537b433d726d0fb0235997d9acf896"
)
BUDGET_EXCEPTION_SHA256 = (
    "a0a4f2e80fa888e3fee7a1ef7e3479af559e1930cbb3eb3a5ea3a2ab8b3bbcf4"
)

HEX40 = re.compile(r"\A[0-9a-f]{40}\Z")
HEX64 = re.compile(r"\A[0-9a-f]{64}\Z")
BATCH_A_LABELS = (
    "Dragon Rider",
    "Dungeon Liberator",
    "Spellweaver's Run",
)
ALL_TRAVERSAL_LABELS = BATCH_A_LABELS + (
    "Shadow Gate Dungeon",
    "Labyrinth of the Goblin King",
    "Griffin Rider's Escape",
    "The Sorcerer's Ziggurat",
)

GAME_CONFIG = {
    "dragon-rider": {
        "label": "Dragon Rider",
        "package": "packages/vocabulary/dragon-rider",
        "ledger": "packages/vocabulary/dragon-rider/claim-evidence-ledger.json",
        "map": "packages/vocabulary/dragon-rider/requirements-map.json",
        "collector_receipt": "evidence-collector-dragon-rider-phase1.json",
        "mapper_receipt": "requirements-mapper-dragon-rider-phase1.json",
        "claim_total": 16,
        "fixture_total": 3,
        "prefix": "DR-",
    },
    "dungeon-liberator": {
        "label": "Dungeon Liberator",
        "package": "packages/sentence/dungeon-liberator",
        "ledger": "packages/sentence/dungeon-liberator/claim-evidence-ledger.json",
        "map": "packages/sentence/dungeon-liberator/requirements-map.json",
        "collector_receipt": "evidence-collector-dungeon-liberator.json",
        "mapper_receipt": "requirements-mapper-dungeon-liberator.json",
        "claim_total": 16,
        "fixture_total": 3,
        "prefix": "DL-",
    },
    "spellweavers-run": {
        "label": "Spellweaver's Run",
        "package": "packages/catalog/spellweavers-run",
        "ledger": "packages/catalog/spellweavers-run/claim-evidence-ledger.json",
        "map": "packages/catalog/spellweavers-run/requirements-map.json",
        "collector_receipt": "evidence-collector-spellweavers-run.json",
        "mapper_receipt": "requirements-mapper-spellweavers-run.json",
        "claim_total": 51,
        "fixture_total": 3,
        "prefix": "SW-",
    },
}

BROWSER_INPUTS = {
    "dragon-rider": (
        "packages/vocabulary/dragon-rider/browser-audit.json",
        "browser-auditor-dragon-rider.json",
    ),
    "dungeon-liberator": (
        "packages/sentence/dungeon-liberator/browser-audit.json",
        "browser-auditor-dungeon-liberator.json",
    ),
    "spellweavers-run": (
        "packages/catalog/spellweavers-run/browser-audit.json",
        "browser-auditor-spellweavers-run.json",
    ),
}

T1_PATH = (
    REPO_ROOT
    / "measure/acceptance/measure_apk_evidence_integrity_gates_20260712/"
    "phase4-v8-accepted-gate-manifest.json"
)
DENOMINATOR_PATH = (
    REPO_ROOT
    / "measure/archive/apk_source_denominator_inventory_20260712/"
    "accepted-denominator-manifest.json"
)
PARTITION_PATH = (
    REPO_ROOT
    / "measure/archive/apk_source_denominator_inventory_20260712/"
    "accepted-partition-manifest.json"
)
PILOT_PATH = (
    REPO_ROOT
    / "measure/archive/apk_three_game_truth_pilot_20260712/"
    "accepted-pilot-manifest.json"
)
PROVENANCE_DIRECTION_PATH = (
    REPO_ROOT / "measure/product-owner-apk-provenance-direction-20260721.json"
)
BUDGET_PATH = TRACK_DIR / "phase0-budget-declaration.json"
BUDGET_EXCEPTION_PATH = TRACK_DIR / "product-owner-spellweavers-budget-exception.json"
TRUTH_RECEIPT_PATH = RECEIPTS_DIR / "truth-test-author-batch-a.json"
REVIEW_PATH = TRACK_DIR / "batch-a-independent-review.json"
REVIEW_RECEIPT_PATH = RECEIPTS_DIR / "adversarial-reviewer-batch-a.json"
CANDIDATE_PATH = TRACK_DIR / "candidate-cohort-manifest-batch-a.json"
APPROVAL_PATH = TRACK_DIR / "product-owner-acceptance-batch-a.json"
ACCEPTED_PATH = TRACK_DIR / "accepted-cohort-manifest-batch-a.json"


def _sha256(data: bytes) -> str:
    """Returns the lowercase SHA-256 digest for exact bytes."""
    return hashlib.sha256(data).hexdigest()


def _file_sha256(path: Path) -> str:
    """Returns the SHA-256 digest for a local file."""
    return _sha256(path.read_bytes())


def _load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON document."""
    return json.loads(path.read_text(encoding="utf-8"))


def _git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one read-only Git command without raising on nonzero status."""
    return subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    )


def _git_show(revision: str, path: str) -> bytes | None:
    """Returns exact bytes at a revision and path, or None when absent."""
    result = _git("show", f"{revision}:{path}")
    return result.stdout if result.returncode == 0 else None


def _is_ancestor(ancestor: str, descendant: str) -> bool:
    """Returns whether one Git commit is an ancestor of another."""
    return _git("merge-base", "--is-ancestor", ancestor, descendant).returncode == 0


def _ledger(game: str) -> dict[str, Any]:
    """Returns a normalized ledger with factual claims and fixtures."""
    document = _load_json(TRACK_DIR / GAME_CONFIG[game]["ledger"])
    claims = document if isinstance(document, list) else document.get("claims", [])
    factual = [claim for claim in claims if not _is_fixture(claim)]
    embedded_fixtures = [claim for claim in claims if _is_fixture(claim)]
    separate_fixtures = [] if isinstance(document, list) else document.get(
        "fixture_records", []
    )
    return {
        "document": document,
        "claims": claims,
        "factual": factual,
        "fixtures": embedded_fixtures + separate_fixtures,
    }


def _is_fixture(claim: dict[str, Any]) -> bool:
    """Returns whether a claim is an explicit falsification fixture."""
    return claim.get("category") in {"negative-fixture", "negative_fixture"}


def _citation(claim: dict[str, Any]) -> dict[str, Any]:
    """Returns a claim's flat or nested citation envelope."""
    nested = claim.get("citation")
    if isinstance(nested, dict):
        return nested
    return {
        "path": claim.get("file_path"),
        "line_start": claim.get("line_start"),
        "line_end": claim.get("line_end"),
        "cited_range_sha256": claim.get("cited_range_sha256"),
        "blob_sha256": claim.get("blob_sha256"),
        "revision": claim.get("revision"),
    }


def _citation_errors(claim: dict[str, Any]) -> list[str]:
    """Returns exact-path, object, blob, and line-envelope defects."""
    claim_id = claim.get("claim_id", "<missing-id>")
    citation = _citation(claim)
    path = citation.get("path")
    revision = citation.get("revision")
    start = citation.get("line_start")
    end = citation.get("line_end")
    range_hash = citation.get("cited_range_sha256")
    blob_hash = citation.get("blob_sha256")
    errors = []
    if not isinstance(path, str) or not path:
        return [f"{claim_id}: missing file path"]
    if Path(path).is_absolute() or ".." in Path(path).parts:
        errors.append(f"{claim_id}: unbounded path {path}")
    if path.endswith("/"):
        errors.append(f"{claim_id}: directory citation")
    if not isinstance(revision, str) or not HEX40.fullmatch(revision):
        return errors + [f"{claim_id}: malformed revision"]
    if not isinstance(blob_hash, str) or not HEX64.fullmatch(blob_hash):
        errors.append(f"{claim_id}: malformed blob hash")
    if not isinstance(range_hash, str) or not HEX64.fullmatch(range_hash):
        errors.append(f"{claim_id}: malformed range hash")
    data = _git_show(revision, path)
    if data is None:
        return errors + [f"{claim_id}: unreachable {revision[:8]}:{path}"]
    if _sha256(data) != blob_hash:
        errors.append(f"{claim_id}: full blob hash mismatch")
    if not isinstance(start, int) or not isinstance(end, int):
        return errors + [f"{claim_id}: non-integer line range"]
    lines = data.splitlines(keepends=True)
    if not 1 <= start <= end <= len(lines):
        return errors + [
            f"{claim_id}: range {start}..{end} outside {len(lines)} lines"
        ]
    if _sha256(b"".join(lines[start - 1 : end])) != range_hash:
        errors.append(f"{claim_id}: cited range hash mismatch")
    return errors


def _related_envelope_errors(claim: dict[str, Any]) -> list[str]:
    """Returns defects from any additional exact envelopes on a claim."""
    errors = []
    revision = _citation(claim).get("revision")
    for index, envelope in enumerate(claim.get("related_exact_envelopes", [])):
        synthetic = {
            "claim_id": f"{claim.get('claim_id')}:related:{index}",
            "file_path": envelope.get("path"),
            "line_start": envelope.get("line_start"),
            "line_end": envelope.get("line_end"),
            "cited_range_sha256": envelope.get("range_sha256"),
            "blob_sha256": envelope.get("blob_sha256"),
            "revision": revision,
        }
        errors.extend(_citation_errors(synthetic))
    return errors


def _map_backing_ids(game: str) -> list[str]:
    """Returns every claim or unknown ID referenced by a requirements map."""
    document = _load_json(TRACK_DIR / GAME_CONFIG[game]["map"])
    records = []
    if game == "dragon-rider":
        for values in document["records"].values():
            records.extend(values)
        records.extend(document["unknown_records"])
        key = "cited_ledger_ids"
    elif game == "dungeon-liberator":
        for values in document["records"].values():
            records.extend(values)
        key = "claim_ids"
    else:
        records.extend(document["mapped_sections"])
        records.extend(document["visible_unknowns"])
        key = "backing_claim_ids"
    return [claim_id for record in records for claim_id in record.get(key, [])]


def _resolve_receipt_path(value: str, declared: list[str]) -> Path | None:
    """Resolves heterogeneous receipt paths without guessing outside outputs."""
    if value.startswith("measure/"):
        return REPO_ROOT / value
    if value.startswith(("packages/", "role-receipts/")):
        return TRACK_DIR / value
    matches = [item for item in declared if Path(item).name == value]
    if len(matches) != 1:
        return None
    return _resolve_receipt_path(matches[0], declared)


def _receipt_defects(path: Path) -> list[str]:
    """Returns local-hash, provider-disclosure, and commit-binding defects."""
    receipt = _load_json(path)
    defects = []
    if receipt.get("track_id") != TRACK_ID:
        defects.append("wrong-track")
    if receipt.get("phase") != PHASE:
        defects.append("wrong-phase")
    serialized = json.dumps(receipt, sort_keys=True).lower()
    if "unavailable" not in serialized:
        defects.append("provider-unavailability-not-disclosed")
    declared = receipt.get("output_paths", receipt.get("output_files", []))
    hashes = receipt.get("output_hashes", {})
    for name, expected in hashes.items():
        if name == "self" or expected is None or "self-hashed" in str(expected):
            continue
        output = _resolve_receipt_path(name, declared)
        if output is None or not output.is_file():
            defects.append(f"unresolvable-output:{name}")
            continue
        if not isinstance(expected, str) or not HEX64.fullmatch(expected):
            defects.append(f"malformed-output-hash:{name}")
        elif _file_sha256(output) != expected:
            defects.append(f"stale-output-hash:{name}")
    commit = receipt.get("commit_sha")
    if not isinstance(commit, str) or not HEX40.fullmatch(commit):
        defects.append("missing-committed-git-binding")
        return defects
    for value in declared:
        output = _resolve_receipt_path(value, declared)
        if output is None or output == path or not output.is_file():
            continue
        relative = str(output.relative_to(REPO_ROOT))
        if _git_show(commit, relative) != output.read_bytes():
            defects.append(f"commit-byte-mismatch:{relative}")
    return defects


class BatchAPredecessorScopeContract(unittest.TestCase):
    """Validates predecessor bytes, cohort scope, and denominator assignment."""

    def test_phase_and_role_bases_are_real_ordered_commits(self) -> None:
        """The supplied role base is a descendant of the frozen phase base."""
        self.assertTrue(HEX40.fullmatch(PHASE_BASE_SHA))
        self.assertTrue(HEX40.fullmatch(ROLE_BASE_SHA))
        self.assertTrue(_is_ancestor(PHASE_BASE_SHA, ROLE_BASE_SHA))

    def test_predecessor_manifest_hashes_are_exact(self) -> None:
        """T1, T2, and T3 predecessor bytes match the frozen hashes."""
        expected = {
            T1_PATH: T1_SHA256,
            DENOMINATOR_PATH: T2_DENOMINATOR_SHA256,
            PARTITION_PATH: T2_PARTITION_SHA256,
            PILOT_PATH: T3_PILOT_SHA256,
        }
        self.assertEqual(
            {str(path): _file_sha256(path) for path in expected},
            {str(path): digest for path, digest in expected.items()},
        )

    def test_predecessors_are_consumable_and_unrevoked(self) -> None:
        """Accepted predecessor state is structured rather than inferred."""
        for path in (T1_PATH, DENOMINATOR_PATH, PARTITION_PATH, PILOT_PATH):
            with self.subTest(path=path.name):
                document = _load_json(path)
                self.assertTrue(document.get("consumable"))
                self.assertNotEqual(document.get("status"), "revoked")
                if "revoked" in document:
                    self.assertIs(document["revoked"], False)

    def test_batch_a_scope_is_exactly_three_frozen_games(self) -> None:
        """The active package configuration neither widens nor renames Batch A."""
        self.assertEqual(
            tuple(config["label"] for config in GAME_CONFIG.values()),
            BATCH_A_LABELS,
        )
        discovery = _load_json(TRACK_DIR / "phase0-discovery-audit.json")
        self.assertEqual(discovery["scope"]["batches"], 3)
        self.assertEqual(discovery["scope"]["identities"], list(ALL_TRAVERSAL_LABELS))

    def test_partition_assigns_all_seven_traversal_games_once(self) -> None:
        """The accepted partition supplies the independent denominator."""
        partition = _load_json(PARTITION_PATH)
        assignments = partition["assignments"]
        selected = [
            row["canonical_identity_label"]
            for row in assignments
            if row["cohort"] == "Traversal and exploration"
        ]
        self.assertEqual(tuple(selected), ALL_TRAVERSAL_LABELS)
        self.assertEqual(len(selected), len(set(selected)))

    def test_pilot_is_never_used_as_batch_a_game_evidence(self) -> None:
        """No Batch A factual claim cites the process-only T3 predecessor."""
        forbidden = "apk_three_game_truth_pilot_20260712"
        cited = [
            _citation(claim).get("path", "")
            for game in GAME_CONFIG
            for claim in _ledger(game)["factual"]
        ]
        self.assertFalse(any(forbidden in path for path in cited))


class BatchAClaimEnvelopeContract(unittest.TestCase):
    """Validates every factual claim and related exact evidence envelope."""

    def test_claim_counts_and_ids_are_frozen_and_unique(self) -> None:
        """Every ledger retains its declared atomic record denominator."""
        all_ids = []
        for game, config in GAME_CONFIG.items():
            claims = _ledger(game)["claims"]
            ids = [claim["claim_id"] for claim in claims]
            self.assertEqual(len(claims), config["claim_total"], game)
            self.assertEqual(len(ids), len(set(ids)), game)
            self.assertTrue(all(item.startswith(config["prefix"]) for item in ids))
            all_ids.extend(ids)
        self.assertEqual(len(all_ids), len(set(all_ids)))

    def test_every_factual_claim_has_program_metadata(self) -> None:
        """Every claim carries collector, conflict, discovery, and review fields."""
        defects = []
        for game in GAME_CONFIG:
            for claim in _ledger(game)["factual"]:
                claim_id = claim.get("claim_id")
                source_fact = claim.get("source_fact", claim.get("claim_text"))
                required = {
                    "source-fact": source_fact,
                    "interpretation": claim.get("interpretation"),
                    "confidence": claim.get("confidence"),
                    "evidence-class": claim.get("evidence_class"),
                    "discovery-method": claim.get("discovery_method"),
                    "collector-agent": claim.get("collector_agent"),
                    "conflict-state": claim.get("conflict_state"),
                    "conflict-resolution": claim.get("conflict_resolution"),
                    "reviewer-agent": claim.get("reviewer_agent"),
                    "reviewer-disposition": claim.get(
                        "reviewer_disposition", claim.get("review_disposition")
                    ),
                }
                for field, value in required.items():
                    if value is None or value == "":
                        defects.append(f"{claim_id}:{field}")
        self.assertEqual(defects, [], f"claim metadata defects: {defects}")

    def test_dragon_rider_claim_envelopes_match_exact_git_bytes(self) -> None:
        """Every Dragon Rider claim and related API envelope is byte-exact."""
        errors = []
        for claim in _ledger("dragon-rider")["factual"]:
            errors.extend(_citation_errors(claim))
            errors.extend(_related_envelope_errors(claim))
        self.assertEqual(errors, [])

    def test_dungeon_liberator_claim_envelopes_match_exact_git_bytes(self) -> None:
        """Every Dungeon Liberator nested citation is byte-exact."""
        errors = []
        for claim in _ledger("dungeon-liberator")["factual"]:
            errors.extend(_citation_errors(claim))
        self.assertEqual(errors, [])

    def test_spellweavers_run_claim_envelopes_match_exact_git_bytes(self) -> None:
        """Every non-fixture current or historical Spellweaver cite is exact."""
        errors = []
        for claim in _ledger("spellweavers-run")["factual"]:
            errors.extend(_citation_errors(claim))
        self.assertEqual(errors, [])

    def test_factual_citations_use_only_bounded_source_roots(self) -> None:
        """No claim promotes quarantine, prose, or an arbitrary path to truth."""
        allowed = (
            "apps/advantage-games/",
            "apps/reading-advantage/",
            "packages/game-cartridges/",
            "measure/archive/apk_source_denominator_inventory_20260712/",
        )
        defects = []
        for game in GAME_CONFIG:
            for claim in _ledger(game)["factual"]:
                path = _citation(claim)["path"]
                if not path.startswith(allowed):
                    defects.append(f"{claim['claim_id']}:{path}")
        self.assertEqual(defects, [])


class BatchAMapperBackingContract(unittest.TestCase):
    """Validates mapper hashes, backing IDs, coverage, and role boundaries."""

    def test_mapper_declared_ledger_hashes_match_active_bytes(self) -> None:
        """Every map that declares a ledger digest binds exact active bytes."""
        dragon_report = _load_json(
            TRACK_DIR
            / "packages/vocabulary/dragon-rider/requirements-map-report.json"
        )
        dungeon_map = _load_json(
            TRACK_DIR / GAME_CONFIG["dungeon-liberator"]["map"]
        )
        spell_receipt = _load_json(
            RECEIPTS_DIR / GAME_CONFIG["spellweavers-run"]["mapper_receipt"]
        )
        self.assertEqual(
            dragon_report["input_hashes"]["claim_ledger"],
            _file_sha256(TRACK_DIR / GAME_CONFIG["dragon-rider"]["ledger"]),
        )
        self.assertEqual(
            dungeon_map["evidence_ledger_sha256"],
            _file_sha256(TRACK_DIR / GAME_CONFIG["dungeon-liberator"]["ledger"]),
        )
        self.assertEqual(
            spell_receipt["input_hashes"]["claim_ledger"],
            _file_sha256(TRACK_DIR / GAME_CONFIG["spellweavers-run"]["ledger"]),
        )

    def test_every_mapper_backing_id_resolves_to_its_own_ledger(self) -> None:
        """No mapper invents, imports, or silently drops a backing identifier."""
        defects = []
        for game in GAME_CONFIG:
            ledger = _ledger(game)
            valid = {claim["claim_id"] for claim in ledger["claims"]}
            document = ledger["document"]
            if game == "dragon-rider":
                valid.update(row["unknown_id"] for row in document["explicit_unknowns"])
            references = _map_backing_ids(game)
            unresolved = sorted(set(references) - valid)
            if unresolved:
                defects.append(f"{game}:unresolved={unresolved}")
            claim_ids = {claim["claim_id"] for claim in ledger["claims"]}
            omitted = sorted(claim_ids - set(references))
            if omitted:
                defects.append(f"{game}:omitted={omitted}")
        self.assertEqual(defects, [])

    def test_mapper_counts_are_mechanically_reproducible(self) -> None:
        """Labeled distinct-ID totals equal IDs present in the active maps."""
        dragon = _load_json(TRACK_DIR / GAME_CONFIG["dragon-rider"]["map"])
        spell = _load_json(TRACK_DIR / GAME_CONFIG["spellweavers-run"]["map"])
        self.assertEqual(
            dragon["claim_reference_accounting"]["distinct_claim_ids_referenced"],
            len(set(_map_backing_ids("dragon-rider")) & {
                claim["claim_id"] for claim in _ledger("dragon-rider")["claims"]
            }),
        )
        self.assertEqual(
            spell["counts"]["distinct_referenced_claim_ids"],
            len(set(_map_backing_ids("spellweavers-run"))),
        )

    def test_maps_add_no_source_fact_or_cross_game_standardization(self) -> None:
        """Maps remain transformations of IDs rather than evidence collection."""
        forbidden_keys = {"source_fact", "claim_text", "citation"}
        forbidden_phrases = ("cross-game standard", "standardize across")
        for game in GAME_CONFIG:
            document = _load_json(TRACK_DIR / GAME_CONFIG[game]["map"])
            text = json.dumps(document, sort_keys=True).lower()
            self.assertFalse(forbidden_keys & set(_walk_keys(document)), game)
            self.assertFalse(any(phrase in text for phrase in forbidden_phrases), game)
            self.assertIn(document.get("acceptance", "not-claimed"), {
                "not-claimed",
                False,
            })


def _walk_keys(value: Any) -> list[str]:
    """Returns every dictionary key recursively from a JSON-like value."""
    keys = []
    if isinstance(value, dict):
        for key, child in value.items():
            keys.append(key)
            keys.extend(_walk_keys(child))
    elif isinstance(value, list):
        for child in value:
            keys.extend(_walk_keys(child))
    return keys


class BatchASemanticBoundsContract(unittest.TestCase):
    """Keeps current, historical, source-only, and browser meanings separate."""

    def test_spellweaver_implementation_claims_remain_historical(self) -> None:
        """Deleted legacy and cartridge behavior is never labeled current."""
        historical_revisions = {
            "4106ba39547c8cac7645ce0f257a6bdd133712e9",
            "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f",
        }
        defects = []
        for claim in _ledger("spellweavers-run")["factual"]:
            revision = _citation(claim)["revision"]
            if revision in historical_revisions and claim.get("evidence_class") != "history":
                defects.append(claim["claim_id"])
        self.assertEqual(defects, [])

    def test_spellweaver_current_disposition_withholds_runnable_behavior(self) -> None:
        """Current catalog evidence preserves coming-soon and unknown runtime."""
        report = _load_json(
            TRACK_DIR / "packages/catalog/spellweavers-run/evidence-final-report.json"
        )
        requirements = _load_json(TRACK_DIR / GAME_CONFIG["spellweavers-run"]["map"])
        self.assertIn("coming-soon", report["temporal_reconciliation"]["role_base_current"])
        self.assertTrue(
            all("unknown" in row["disposition"] for row in requirements["visible_unknowns"])
        )
        self.assertEqual(requirements["counts"]["browser_claims"], 0)

    def test_dragon_and_dungeon_browser_facts_remain_unknown(self) -> None:
        """Source hooks and controls do not become observed browser behavior."""
        dragon = _ledger("dragon-rider")["document"]
        dungeon = _ledger("dungeon-liberator")["document"]
        dragon_topics = {row["topic"] for row in dragon["explicit_unknowns"]}
        self.assertIn("browser-runnable-disposition", dragon_topics)
        self.assertTrue(any("No browser audit" in item for item in dungeon["unknowns"]))
        for game in ("dragon-rider", "dungeon-liberator"):
            self.assertFalse(
                any(
                    claim.get("evidence_class") == "browser"
                    for claim in _ledger(game)["factual"]
                )
            )

    def test_claim_category_counts_match_collector_reports(self) -> None:
        """Collector category summaries cannot drift from their ledgers."""
        dragon_report = _load_json(
            TRACK_DIR / "packages/vocabulary/dragon-rider/evidence-final-report.json"
        )
        spell_report = _load_json(
            TRACK_DIR / "packages/catalog/spellweavers-run/evidence-final-report.json"
        )
        self.assertEqual(
            dragon_report["claims_by_category"],
            dict(Counter(c["category"] for c in _ledger("dragon-rider")["claims"])),
        )
        self.assertEqual(
            spell_report["claims_by_category"],
            dict(Counter(c["category"] for c in _ledger("spellweavers-run")["claims"])),
        )


class BatchANegativeFixtureContract(unittest.TestCase):
    """Requires explicit rejected fixtures without promoting them to facts."""

    def test_each_game_has_three_rejected_negative_fixtures(self) -> None:
        """Unsupported inference remains executable rather than prose-only."""
        defects = []
        for game, config in GAME_CONFIG.items():
            fixtures = _ledger(game)["fixtures"]
            if len(fixtures) != config["fixture_total"]:
                defects.append(
                    f"{game}:expected={config['fixture_total']}:actual={len(fixtures)}"
                )
                continue
            for fixture in fixtures:
                disposition = fixture.get(
                    "expected_disposition", fixture.get("reviewer_disposition", "")
                )
                if "REJECT" not in disposition:
                    defects.append(f"{game}:{fixture.get('claim_id', fixture.get('fixture_id'))}")
        self.assertEqual(defects, [], f"negative fixture defects: {defects}")

    def test_embedded_negative_fixtures_have_no_positive_citation(self) -> None:
        """A rejected proposition cannot carry a factual source envelope."""
        for game in GAME_CONFIG:
            for fixture in _ledger(game)["fixtures"]:
                if "claim_id" not in fixture:
                    continue
                citation = _citation(fixture)
                self.assertTrue(
                    all(value is None for value in citation.values()),
                    fixture["claim_id"],
                )

    def test_fixture_ids_are_unique_across_batch_a(self) -> None:
        """Fixture records have stable non-colliding identifiers."""
        ids = []
        for game in GAME_CONFIG:
            for fixture in _ledger(game)["fixtures"]:
                ids.append(fixture.get("claim_id", fixture.get("fixture_id")))
        self.assertNotIn(None, ids)
        self.assertEqual(len(ids), len(set(ids)))


class BatchABudgetAndReceiptContract(unittest.TestCase):
    """Enforces the one-time exception and local-verifiability owner policy."""

    def test_budget_and_provenance_directions_have_exact_bytes(self) -> None:
        """Neither owner direction can be silently replaced or broadened."""
        self.assertEqual(_file_sha256(BUDGET_PATH), BUDGET_SHA256)
        self.assertEqual(
            _file_sha256(BUDGET_EXCEPTION_PATH), BUDGET_EXCEPTION_SHA256
        )
        self.assertEqual(
            _file_sha256(PROVENANCE_DIRECTION_PATH),
            PROVENANCE_DIRECTION_SHA256,
        )

    def test_spellweaver_exception_is_one_role_one_unit_and_in_bounds(self) -> None:
        """The exception changes only the collector source-byte ceiling."""
        exception = _load_json(BUDGET_EXCEPTION_PATH)
        self.assertEqual(exception["decision"], "ONE_TIME_SOURCE_BYTE_CEILING_INCREASE")
        self.assertEqual(exception["old_ceiling"], 8_000_000)
        self.assertEqual(exception["approved_ceiling"], 12_000_000)
        self.assertEqual(exception["measured_actual"], 11_558_850)
        self.assertLessEqual(exception["measured_actual"], exception["approved_ceiling"])
        self.assertIn("source_bytes only", exception["supersedes"])
        self.assertIn("does not apply to other games or roles", " ".join(exception["conditions"]).lower())

    def test_spellweaver_successors_disclose_original_budget_breach(self) -> None:
        """Mapper successors preserve the original breach and narrow exception."""
        paths = (
            TRACK_DIR / "packages/catalog/spellweavers-run/requirements-map.json",
            TRACK_DIR / "packages/catalog/spellweavers-run/requirements-final-report.json",
            RECEIPTS_DIR / "requirements-mapper-spellweavers-run.json",
            TRUTH_RECEIPT_PATH,
        )
        defects = []
        for path in paths:
            if not path.is_file():
                defects.append(f"missing:{path.name}")
                continue
            text = path.read_text(encoding="utf-8").lower()
            if "spellweaver" not in text or "exception" not in text:
                defects.append(f"missing-exception-disclosure:{path.name}")
            if "11558850" not in text:
                defects.append(f"missing-original-actual:{path.name}")
        self.assertEqual(defects, [])

    def test_unmeasured_budget_units_remain_blocking(self) -> None:
        """The provenance direction does not waive numeric budget actuals."""
        units = {
            "source_bytes",
            "source_files_objects",
            "commands",
            "elapsed_minutes",
            "records_authored_reviewed",
            "browser_interactions",
            "captured_artifacts",
        }
        defects = []
        for game, config in GAME_CONFIG.items():
            for role in ("collector_receipt", "mapper_receipt"):
                receipt = _load_json(RECEIPTS_DIR / config[role])
                actual = receipt.get("actual_usage")
                if actual is None:
                    actual = receipt.get("budget_declaration", {}).get("actual")
                if actual is None:
                    actual = receipt.get("budget", {}).get("actual")
                if actual is None:
                    actual = receipt.get("resource_use", {}).get("actual", {})
                    aliases = {
                        "source_bytes": "source_bytes_read",
                        "source_files_objects": "source_files_or_objects_read",
                        "commands": "command_invocations",
                        "elapsed_minutes": "elapsed_minutes",
                        "records_authored_reviewed": "claims_or_records_authored",
                        "browser_interactions": "browser_interactions",
                        "captured_artifacts": "captured_browser_artifacts",
                    }
                    actual = {key: actual.get(alias) for key, alias in aliases.items()}
                for unit in units:
                    if not isinstance(actual.get(unit), int):
                        defects.append(f"{game}:{role}:{unit}")
        truth_actual = _load_json(TRUTH_RECEIPT_PATH).get("actual_usage", {})
        for unit in units:
            if not isinstance(truth_actual.get(unit), int):
                defects.append(f"truth-test-author:{unit}")
        self.assertEqual(defects, [], f"unmeasured budget units: {defects}")

    def test_active_role_receipts_satisfy_local_owner_policy(self) -> None:
        """Provider telemetry may be unavailable; hashes and Git binds may not."""
        receipt_paths = [
            RECEIPTS_DIR / config[key]
            for config in GAME_CONFIG.values()
            for key in ("collector_receipt", "mapper_receipt")
        ]
        receipt_paths.append(TRUTH_RECEIPT_PATH)
        defects = {
            path.name: _receipt_defects(path)
            for path in receipt_paths
            if _receipt_defects(path)
        }
        self.assertEqual(defects, {}, f"local receipt defects: {defects}")

    def test_truth_author_receipt_preserves_role_and_base_isolation(self) -> None:
        """This role claims only truth-test authorship at the supplied bases."""
        receipt = _load_json(TRUTH_RECEIPT_PATH)
        self.assertEqual(receipt["role"], "truth-test-author")
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
        self.assertEqual(receipt["prior_role_history"], [])
        self.assertEqual(receipt["role_isolation"]["roles_held"], ["truth-test-author"])
        self.assertNotIn("evidence-collector", receipt["role_isolation"]["roles_held"])


class BatchABrowserDispositionInputContract(unittest.TestCase):
    """Requires browser disposition inputs without asserting browser success."""

    def _assert_browser_input(self, game: str) -> None:
        """Asserts only that one game's audit and receipt inputs are present."""
        audit_name, receipt_name = BROWSER_INPUTS[game]
        audit_path = TRACK_DIR / audit_name
        receipt_path = RECEIPTS_DIR / receipt_name
        self.assertTrue(
            audit_path.is_file() and receipt_path.is_file(),
            f"EXPECTED_STAGE_RED[BROWSER_INPUT_MISSING]: {game}",
        )
        audit = _load_json(audit_path)
        receipt = _load_json(receipt_path)
        self.assertEqual(audit.get("track_id"), TRACK_ID)
        self.assertEqual(receipt.get("role"), "browser-auditor")
        self.assertTrue(audit.get("disposition"))
        self.assertIn(receipt_name, {receipt_path.name})

    def test_dragon_rider_browser_disposition_input_exists(self) -> None:
        """Dragon Rider supplies a parseable browser disposition input."""
        self._assert_browser_input("dragon-rider")

    def test_dungeon_liberator_browser_disposition_input_exists(self) -> None:
        """Dungeon Liberator supplies a parseable browser disposition input."""
        self._assert_browser_input("dungeon-liberator")

    def test_spellweaver_browser_disposition_input_exists(self) -> None:
        """Spellweaver supplies a parseable browser disposition input."""
        self._assert_browser_input("spellweavers-run")


class BatchAIndependentReviewContract(unittest.TestCase):
    """Requires fresh review over every exact active Batch A input."""

    def test_fresh_independent_review_binds_all_active_inputs(self) -> None:
        """Review stays red until report, receipt, hashes, and zero blockers exist."""
        self.assertTrue(
            REVIEW_PATH.is_file() and REVIEW_RECEIPT_PATH.is_file(),
            "EXPECTED_STAGE_RED[INDEPENDENT_REVIEW_MISSING]",
        )
        review = _load_json(REVIEW_PATH)
        receipt = _load_json(REVIEW_RECEIPT_PATH)
        required = [
            Path(__file__).resolve(),
            TRUTH_RECEIPT_PATH,
            BUDGET_EXCEPTION_PATH,
        ]
        for config in GAME_CONFIG.values():
            required.extend(
                (TRACK_DIR / config["ledger"], TRACK_DIR / config["map"])
            )
        for audit_name, receipt_name in BROWSER_INPUTS.values():
            required.extend((TRACK_DIR / audit_name, RECEIPTS_DIR / receipt_name))
        input_hashes = receipt.get("input_hashes", {})
        defects = []
        for path in required:
            relative = str(path.relative_to(REPO_ROOT))
            if not path.is_file() or input_hashes.get(relative) != _file_sha256(path):
                defects.append(f"missing-or-stale:{relative}")
        audited_head = review.get("audited_head_sha")
        if not isinstance(audited_head, str) or not HEX40.fullmatch(audited_head):
            defects.append("missing-audited-head")
        elif not _is_ancestor(ROLE_BASE_SHA, audited_head):
            defects.append("review-predates-role-base")
        blockers = review.get("unresolved_findings", {})
        for severity in ("critical", "high", "medium"):
            if blockers.get(severity) != 0:
                defects.append(f"unresolved-{severity}")
        self.assertEqual(defects, [], f"independent review defects: {defects}")


class BatchALifecycleAcceptanceContract(unittest.TestCase):
    """Keeps candidate, approval, and accepted publication ordered and red."""

    def test_candidate_exists_only_with_complete_browser_and_review_inputs(self) -> None:
        """A candidate must bind truth, browser, and independent-review bytes."""
        self.assertTrue(
            CANDIDATE_PATH.is_file(),
            "EXPECTED_STAGE_RED[CANDIDATE_MISSING]",
        )
        candidate = _load_json(CANDIDATE_PATH)
        self.assertFalse(candidate.get("consumable"))
        required_hashes = candidate.get("input_hashes", {})
        required = [Path(__file__).resolve(), TRUTH_RECEIPT_PATH, REVIEW_PATH]
        required.extend(TRACK_DIR / value[0] for value in BROWSER_INPUTS.values())
        self.assertEqual(
            {
                str(path.relative_to(REPO_ROOT)): required_hashes.get(
                    str(path.relative_to(REPO_ROOT))
                )
                for path in required
            },
            {
                str(path.relative_to(REPO_ROOT)): _file_sha256(path)
                for path in required
            },
        )

    def test_product_owner_approval_is_later_and_exactly_bound(self) -> None:
        """Owner approval cannot be inferred before candidate and review."""
        self.assertTrue(
            APPROVAL_PATH.is_file(),
            "EXPECTED_STAGE_RED[OWNER_APPROVAL_MISSING]",
        )
        approval = _load_json(APPROVAL_PATH)
        self.assertEqual(approval.get("candidate_manifest_sha256"), _file_sha256(CANDIDATE_PATH))
        self.assertEqual(approval.get("review_report_sha256"), _file_sha256(REVIEW_PATH))
        self.assertEqual(approval.get("decision"), "approve")
        self.assertIs(approval.get("revoked"), False)
        self.assertTrue(approval.get("event_id"))
        self.assertTrue(approval.get("approval_message_sha256"))

    def test_accepted_manifest_is_separate_and_exactly_bound(self) -> None:
        """Acceptance remains red until a separate consumable manifest exists."""
        self.assertTrue(
            ACCEPTED_PATH.is_file(),
            "EXPECTED_STAGE_RED[ACCEPTED_MANIFEST_MISSING]",
        )
        accepted = _load_json(ACCEPTED_PATH)
        self.assertEqual(accepted.get("status"), "accepted")
        self.assertTrue(accepted.get("consumable"))
        self.assertIs(accepted.get("revoked"), False)
        self.assertEqual(
            accepted.get("candidate_manifest_sha256"), _file_sha256(CANDIDATE_PATH)
        )
        self.assertEqual(
            accepted.get("owner_acceptance_sha256"), _file_sha256(APPROVAL_PATH)
        )
        disclosure = json.dumps(accepted, sort_keys=True).lower()
        self.assertIn("provider-side", disclosure)
        self.assertIn("unavailable", disclosure)
        self.assertIn("11558850", disclosure)


def main() -> None:
    """Runs the complete Batch A truth-test suite."""
    unittest.main()


if __name__ == "__main__":
    main()
