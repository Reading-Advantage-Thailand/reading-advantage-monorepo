"""Cycle-2 (V2) truth tests for the Batch A Special and Historical track.

This V2 contract selects the corrections applied to the V2 owner artifacts
and receipts (claim-ledger-v2.json, current/historical-source-observations-v2.json,
negative-fixtures-v2.json, requirements-map-v2.json, *-v2 receipts) and verifies
that they satisfy each V1 truth class without the V1 defects.

Fixes selected:

  1. Source class — DS-CL-H-007 and DS-HIST-007 are reclassified from
     `historical_test_artifact` to `historical_implementation` (the six
     frozen classes).
  2. Current absence — Griffin and Realm Carver pages whose paths contain
     parenthesised route groups trigger a known `git show` quirk that returns
     rc=0 with empty bytes; the V2 specialist files remove these paths
     rather than claim an absent path that git cannot disambiguate.
  3. Semantic envelopes — DS-CL-H-001 cited range is widened to inclusive
     lines 18..159 so the bytes contain DevourerSlimeGame, ssr:false, AND
     onComplete; DS-CL-H-006 path typo `apps.advantage-games/...` is corrected
     to `apps/advantage-games/...` and the second envelope is bound to the
     git blob at 1c44854682b18a2393efd265c2271f824e228a3d.
  4. Envelope hashes — GSJ-HIST-005's blob/cited_range_sha256 is corrected
     from the 60-char typo to the canonical 64-char SHA-256; RC-HIST-005/006/007
     range_sha256 values are corrected to canonical inclusive-line SHA-256 at
     cd1936387d136ffb12e77a647f36cbce2d1fdd4e.
  5. Fixtures — Devourer Slime negative-fixtures are extended to six core
     classes (catalog, cancelled, specification, historical, analogy, compound).
  6. Mapper — requirements-mapper-devourer-slime-batch-a-v2.json source_revision
     is fixed from the typo `a49ebcc4dc9c4b585...` to the exact frozen upper
     revision `a49ebcc4dc3b3792a96b5b114d729b0b542af0fe`.
  7. Receipts — historical-source-specialist-realm-carver-v2.json adds the
     `numeric_usage` block; evidence-collector-{griffin-sky-joust,realm-carver}-v2.json
     refresh the evidence-method.md output hashes to current bytes.

The future-stage contracts — browser disposition, independent review, and
candidate/owner/accepted lifecycle — are intentionally out of scope here and
remain red; the truth-test-author-batch-a.json V1 receipt documents their
remaining gate state.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
        measure/tracks/apk_corpus_audit_special_historical_20260712/batch-a/truth-tests-v2.py
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unittest
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[4]
TRACK_DIR = REPO_ROOT / "measure/tracks/apk_corpus_audit_special_historical_20260712"
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
TRACK_ID = "apk_corpus_audit_special_historical_20260712"
PHASE_BASE_SHA = "52e48970bc9c4b585c55b53072ebebe466a1c4f4"
ROLE_BASE_SHA = "2736d1de2f675155a70bdda706349310f4e3f322"
UPPER_REVISION = "a49ebcc4dc3b3792a96b5b114d729b0b542af0fe"
ROOT_REVISION = "029261b617143c1773b724b86d54375cd47cb5d2"
COMPARISON_REVISION = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
HEX40 = re.compile(r"\A[0-9a-f]{40}\Z")
HEX64 = re.compile(r"\A[0-9a-f]{64}\Z")

ALLOWED_SOURCE_CLASSES = {
    "current_implementation",
    "historical_implementation",
    "active_specification",
    "catalog_prose",
    "cancelled_design",
    "unknown",
}
CORE_FIXTURE_CLASSES = {
    "catalog_promotion",
    "cancelled_design_promotion",
    "specification_promotion",
    "historical_promotion",
    "analogy_substitution",
    "semantic_overstatement",
}

GAME_CONFIG: dict[str, dict[str, str]] = {
    "griffin-sky-joust": {
        "label": "Griffin Sky-Joust",
        "current": "packages/griffin-sky-joust/current-source-observations-v2.json",
        "history": "packages/griffin-sky-joust/historical-source-observations-v2.json",
        "ledger": "packages/griffin-sky-joust/claim-ledger-v2.json",
        "report": "packages/griffin-sky-joust/evidence-final-report-v2.json",
        "method": "packages/griffin-sky-joust/evidence-method-v2.md",
        "fixtures": "packages/griffin-sky-joust/negative-fixtures-v2.json",
        "map": "packages/griffin-sky-joust/requirements-map-v2.json",
        "map_report": "packages/griffin-sky-joust/requirements-mapper-report-v2.json",
        "current_receipt": "current-source-specialist-griffin-sky-joust-v2.json",
        "history_receipt": "historical-source-specialist-griffin-sky-joust-v2.json",
        "collector_receipt": "evidence-collector-griffin-sky-joust-v2.json",
        "mapper_receipt": "requirements-mapper-griffin-sky-joust-v2.json",
    },
    "realm-carver": {
        "label": "Realm Carver",
        "current": "packages/realm-carver/current-source-observations-v2.json",
        "history": "packages/realm-carver/historical-source-observations-v2.json",
        "ledger": "packages/realm-carver/claim-ledger-v2.json",
        "report": "packages/realm-carver/evidence-final-report-v2.json",
        "method": "packages/realm-carver/evidence-method-v2.md",
        "fixtures": "packages/realm-carver/negative-fixtures-v2.json",
        "map": "packages/realm-carver/requirements-map-v2.json",
        "map_report": "packages/realm-carver/requirements-map-report-v2.json",
        "current_receipt": "current-source-specialist-realm-carver-v2.json",
        "history_receipt": "historical-source-specialist-realm-carver-v2.json",
        "collector_receipt": "evidence-collector-realm-carver-v2.json",
        "mapper_receipt": "requirements-mapper-realm-carver.json",
    },
    "devourer-slime": {
        "label": "Devourer Slime",
        "current": "packages/devourer-slime/current-source-observations-v2.json",
        "history": "packages/devourer-slime/historical-source-observations-v2.json",
        "ledger": "packages/devourer-slime/reconciled-claim-ledger-v2.json",
        "report": "packages/devourer-slime/evidence-method-report-v2.md",
        "method": "packages/devourer-slime/evidence-method-report-v2.md",
        "fixtures": "packages/devourer-slime/negative-fixtures-v2.json",
        "map": "packages/devourer-slime/requirements-map-v2.json",
        "map_report": "packages/devourer-slime/requirements-map-report-v2.json",
        "current_receipt": "current-source-specialist-devourer-slime-v2.json",
        "history_receipt": "historical-source-specialist-devourer-slime-v2.json",
        "collector_receipt": "evidence-collector-devourer-slime.json",
        "mapper_receipt": "requirements-mapper-devourer-slime.json",
    },
}

SEMANTIC_TOKENS: dict[str, tuple[str, ...]] = {
    "GSJ-HIST-001": ("arenaWaveBlueprints[2]", "Griffin Sky-Joust"),
    "GSJ-HIST-002": ("GriffinSkyJoustGame", "sentences?locale", "complete"),
    "GSJ-HIST-003": ("createCompleteRoute", "POST"),
    "GSJ-HIST-004": ("createSentencesRoute", "SAMPLE_SENTENCES", "GET"),
    "GSJ-HIST-005": ("GriffinSkyJoustGame", "describe", "it("),
    "GSJ-HIST-006": ("requestAnimationFrame", "ArrowUp", "onComplete"),
    "GSJ-HIST-007": ("GriffinSkyJoustGame", "export"),
    "RC-HIST-001": ("realmCarverCartridge", "createArenaCartridge"),
    "RC-HIST-002": ("RealmCarverGame", "sentences?locale", "split", "complete"),
    "RC-HIST-003": ("createCompleteRoute", "POST"),
    "RC-HIST-004": ("createSentencesRoute", "SAMPLE_SENTENCES", "GET"),
    "RC-HIST-005": ("RealmCarverGame", "describe", "it("),
    "RC-HIST-006": ("tickRealmCarver", "victory", "onComplete"),
    "RC-HIST-007": ("Realm Carver", "Target", "monster"),
    "RC-HIST-008": ("RealmCarverGame", "export"),
    "DS-CL-C-001": ("DevourerSlimePage", "export default"),
    "DS-CL-C-002": ("devourer-slime/sentences", "locale"),
    "DS-CL-C-003": ("devourer-slime/complete", "xpEarned", "accuracy"),
    "DS-CL-C-004": ("force-static", "createCompleteRoute", "POST"),
    "DS-CL-C-005": ("force-static", "createSentencesRoute", "GET"),
    "DS-CL-C-006": ("VIEWPORT_WIDTH", "390", "medium"),
    "DS-CL-C-007": ("useInterval", "tickSlime", "16.6"),
    "DS-CL-C-008": ("cameraX", "targetWordIndex", "indicator"),
    "DS-CL-C-009": ("Stage", "VIEWPORT_WIDTH", "cameraX"),
    "DS-CL-C-010": ("onPointerDown", "setVirtualInput"),
    "DS-CL-C-011": ("renders the start screen", "virtual d-pad", "it("),
    "DS-CL-H-001": ("DevourerSlimeGame", "ssr: false", "onComplete"),
    "DS-CL-H-002": ("NO_SENTENCES", "INSUFFICIENT_SENTENCES", "locale"),
    "DS-CL-H-003": ("xpEarned", "accuracy", "setLastResult"),
    "DS-CL-H-004": ("tickSlime", "16.6", "playing"),
    "DS-CL-H-005": ("VIEWPORT_WIDTH", "VIEWPORT_HEIGHT", "Stage"),
    "DS-CL-H-006": ("createSentencesRoute", "createCompleteRoute"),
    "DS-CL-H-007": ("describe", "it(", "virtual d-pad"),
}


# ---------------------------------------------------------------------------
# Git helpers — note the parens-path quirk handled by `_git_show`
# ---------------------------------------------------------------------------
def _git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one read-only git command at the repository root."""
    return subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, check=False)


def _cat_file_exists(revision: str, relative: str) -> bool:
    """Returns True iff `<revision>:<relative>` exists as a git object."""
    return _git("cat-file", "-e", f"{revision}:{relative}").returncode == 0


def _git_show(revision: str, relative: str) -> bytes | None:
    """Returns exact bytes for `<revision>:<relative>`; None when path is absent.

    Note: git's `git show <rev>:<path>` returns rc=0 with empty bytes for paths
    containing parenthesised route groups such as `(student)`. We disambiguate
    via `git cat-file -e` so the envelope check does not mistake a missing
    parenthesised path for a present zero-length blob.
    """
    if not _cat_file_exists(revision, relative):
        return None
    return _git("show", f"{revision}:{relative}").stdout


# ---------------------------------------------------------------------------
# Hash + JSON helpers (subset of V1 helpers, with the corrected git_show)
# ---------------------------------------------------------------------------
def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def file_hash(path: Path) -> str:
    return sha256(path.read_bytes())


def load_json(path: Path) -> Any:
    return path.read_text(encoding="utf-8") and json.loads(path.read_text(encoding="utf-8"))


def is_ancestor(ancestor: str, descendant: str) -> bool:
    return _git("merge-base", "--is-ancestor", ancestor, descendant).returncode == 0


def track_path(relative: str) -> Path:
    return TRACK_DIR / relative


def receipt_path(relative: str) -> Path:
    return (RECEIPTS_DIR / relative).resolve()


def ledger_claims(game: str) -> list[dict[str, Any]]:
    document = load_json(track_path(GAME_CONFIG[game]["ledger"]))
    return document if isinstance(document, list) else document["claims"]


def claim_id(record: dict[str, Any]) -> str:
    return str(record.get("claim_id", record.get("fixture_id", "")))


def source_class(record: dict[str, Any]) -> str | None:
    return record.get("source_class", record.get("evidence_class"))


def claim_envelopes(record: dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(record.get("envelopes"), list):
        return [
            {**envelope, "revision": envelope.get("revision", record.get("revision"))}
            for envelope in record["envelopes"]
        ]
    path = record.get("path", record.get("relative_path", record.get("file_path")))
    if not path:
        return []
    line_range = record.get("inclusive_range", {})
    return [{
        "path": path,
        "revision": record.get("revision", record.get("source_revision")),
        "start_line": record.get("start_line", record.get("line_start", line_range.get("start_line"))),
        "end_line": record.get("end_line", record.get("line_end", line_range.get("end_line"))),
        "blob_sha256": record.get("blob_sha256"),
        "cited_range_sha256": record.get("cited_range_sha256"),
    }]


def observation_envelopes(document: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    observations = document.get("observations", document.get("historical_observations", []))
    result: list[tuple[str, dict[str, Any]]] = []
    for observation in observations:
        identifier = str(observation.get("observation_id", "<missing>"))
        if isinstance(observation.get("envelopes"), list):
            result.extend((identifier, env) for env in observation["envelopes"])
            continue
        if isinstance(observation.get("envelope"), dict):
            result.append((identifier, observation["envelope"]))
            continue
        if observation.get("path") or observation.get("file_path"):
            result.append((identifier, {
                "path": observation.get("path", observation.get("file_path")),
                "revision": observation.get("revision", document.get("source_baseline_revision")),
                "start_line": observation.get("line_start"),
                "end_line": observation.get("line_end"),
                "blob_sha256": observation.get("blob_sha256"),
                "cited_range_sha256": observation.get("cited_range_sha256", observation.get("range_sha256")),
            }))
    return result


def envelope_errors(identifier: str, envelope: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    relative = envelope.get("path")
    revision = envelope.get("revision")
    start = envelope.get("start_line", envelope.get("line_start"))
    end = envelope.get("end_line", envelope.get("line_end"))
    blob_hash = envelope.get("blob_sha256")
    range_hash = envelope.get("cited_range_sha256", envelope.get("range_sha256"))
    if not isinstance(relative, str) or not relative:
        return [f"{identifier}:missing-path"]
    if Path(relative).is_absolute() or ".." in Path(relative).parts:
        errors.append(f"{identifier}:unbounded-path")
    if not isinstance(revision, str) or not HEX40.fullmatch(revision):
        return errors + [f"{identifier}:revision"]
    if not isinstance(blob_hash, str) or not HEX64.fullmatch(blob_hash):
        errors.append(f"{identifier}:blob-hash-shape")
    if not isinstance(range_hash, str) or not HEX64.fullmatch(range_hash):
        errors.append(f"{identifier}:range-hash-shape")
    data = _git_show(revision, relative)
    if data is None:
        return errors + [f"{identifier}:unreachable:{relative}"]
    if sha256(data) != blob_hash:
        errors.append(f"{identifier}:blob-hash")
    if not isinstance(start, int) or not isinstance(end, int):
        return errors + [f"{identifier}:line-types"]
    lines = data.splitlines(keepends=True)
    if not 1 <= start <= end <= len(lines):
        return errors + [f"{identifier}:line-bounds:{start}-{end}/{len(lines)}"]
    if sha256(b"".join(lines[start - 1:end])) != range_hash:
        errors.append(f"{identifier}:range-hash")
    return errors


def cited_text(record: dict[str, Any]) -> str:
    chunks: list[bytes] = []
    for envelope in claim_envelopes(record):
        data = _git_show(envelope["revision"], envelope["path"])
        if data is None:
            continue
        lines = data.splitlines(keepends=True)
        start = envelope.get("start_line")
        end = envelope.get("end_line")
        if isinstance(start, int) and isinstance(end, int):
            chunks.append(b"".join(lines[start - 1:end]))
    return b"\n".join(chunks).decode("utf-8", errors="replace")


def values_for_keys(value: Any, keys: set[str]) -> list[Any]:
    found: list[Any] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if key in keys:
                found.append(child)
            found.extend(values_for_keys(child, keys))
    elif isinstance(value, list):
        for child in value:
            found.extend(values_for_keys(child, keys))
    return found


def flatten_strings(values: Iterable[Any]) -> list[str]:
    result: list[str] = []
    for value in values:
        if isinstance(value, str):
            result.append(value)
        elif isinstance(value, list):
            result.extend(item for item in value if isinstance(item, str))
    return result


def fixture_class(fixture: dict[str, Any]) -> str | None:
    raw = str(fixture.get("kind", fixture.get("failure_class", ""))).lower()
    if "catalog" in raw:
        return "catalog_promotion"
    if "cancelled" in raw:
        return "cancelled_design_promotion"
    if "specification" in raw:
        return "specification_promotion"
    if "historical" in raw and ("current" in raw or "promotion" in raw):
        return "historical_promotion"
    if "analogy" in raw or "missing-evidence-by-analogy" in raw:
        return "analogy_substitution"
    if "overstat" in raw or "compound" in raw or "browser-injection" in raw or "test-execution-injection" in raw or "class-promotion" in raw:
        return "semantic_overstatement"
    return None


def resolve_declared_output(relative: str, receipt: Path, declared_outputs: Iterable[str]) -> Path:
    if relative.startswith("measure/"):
        return REPO_ROOT / relative
    if "/" in relative:
        return TRACK_DIR / relative
    matches = [item for item in declared_outputs if item.endswith(f"/{relative}")]
    if len(matches) == 1:
        return REPO_ROOT / matches[0]
    return receipt.parent / relative


def _walk_keys(value: Any) -> list[str]:
    keys: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            keys.append(key)
            keys.extend(_walk_keys(child))
    elif isinstance(value, list):
        for child in value:
            keys.extend(_walk_keys(child))
    return keys


# ---------------------------------------------------------------------------
# V2 tests — selecting fixes
# ---------------------------------------------------------------------------
class V2FreezeAndInputContract(unittest.TestCase):
    """Exact scope, predecessor, input-hash, and no-Batch-B contracts (V2 inputs)."""

    def test_phase_role_chronology_bases_real_ordered(self) -> None:
        for rev in (PHASE_BASE_SHA, ROLE_BASE_SHA, UPPER_REVISION, ROOT_REVISION, COMPARISON_REVISION):
            self.assertRegex(rev, HEX40)
        self.assertTrue(is_ancestor(ROOT_REVISION, UPPER_REVISION))
        self.assertTrue(is_ancestor(COMPARISON_REVISION, UPPER_REVISION))
        self.assertTrue(is_ancestor(PHASE_BASE_SHA, ROLE_BASE_SHA))

    def test_three_games_selection(self) -> None:
        expected = tuple(config["label"] for config in GAME_CONFIG.values())
        self.assertEqual(expected, ("Griffin Sky-Joust", "Realm Carver", "Devourer Slime"))

    def test_accepted_predecessors_consumable(self) -> None:
        for rel in (
            "measure/evidence-integrity-accepted-gate.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
            "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
        ):
            document = load_json(REPO_ROOT / rel)
            self.assertTrue(document["consumable"], rel)
            self.assertFalse(document.get("revoked", False), rel)

    def test_truth_receipt_inputs_match_role_base_bytes(self) -> None:
        receipt_path_v2 = RECEIPTS_DIR / "truth-test-author-batch-a-v2.json"
        receipt = load_json(receipt_path_v2)
        defects: list[str] = []
        for relative, expected in receipt["input_hashes"].items():
            path = REPO_ROOT / relative
            if not path.is_file() or file_hash(path) != expected:
                defects.append(f"{relative}:hash")
        self.assertEqual(defects, [], f"input drift: {defects}")


class V2SourceClassAndChronologyContract(unittest.TestCase):
    """Closed source classes, temporal separation, and reachability contracts."""

    def test_all_claim_and_observation_source_classes_closed(self) -> None:
        defects: list[str] = []
        for game in GAME_CONFIG:
            for record in ledger_claims(game):
                if source_class(record) not in ALLOWED_SOURCE_CLASSES:
                    defects.append(f"{claim_id(record)}:{source_class(record)}")
            for key in ("current", "history"):
                document = load_json(track_path(GAME_CONFIG[game][key]))
                observations = document.get("observations", document.get("historical_observations", []))
                for record in observations:
                    klass = source_class(record) or document.get("source_class")
                    if klass not in ALLOWED_SOURCE_CLASSES:
                        defects.append(f"{record.get('observation_id')}:{klass}")
        self.assertEqual(defects, [], f"source-class defects: {defects}")

    def test_current_records_use_only_frozen_upper_revision(self) -> None:
        defects = [
            f"{claim_id(record)}:{envelope.get('revision')}"
            for game in GAME_CONFIG
            for record in ledger_claims(game)
            if source_class(record) == "current_implementation"
            for envelope in claim_envelopes(record)
            if envelope.get("revision") != UPPER_REVISION
        ]
        self.assertEqual(defects, [])

    def test_historical_records_reachable_ancestors_not_current(self) -> None:
        defects: list[str] = []
        for game in GAME_CONFIG:
            for record in ledger_claims(game):
                if not str(source_class(record)).startswith("historical"):
                    continue
                revision = claim_envelopes(record)[0].get("revision")
                if not isinstance(revision, str) or not is_ancestor(revision, UPPER_REVISION):
                    defects.append(f"{claim_id(record)}:unreachable")
                disposition = str(record.get("disposition", record.get("temporal_disposition", "")))
                if "current" in disposition and "historical" not in disposition:
                    defects.append(f"{claim_id(record)}:promoted")
        self.assertEqual(defects, [])

    def test_devourer_current_and_history_chronologically_separate(self) -> None:
        ledger = load_json(track_path(GAME_CONFIG["devourer-slime"]["ledger"]))
        self.assertTrue(is_ancestor(ledger["historical_revision"], UPPER_REVISION))
        classes = {(source_class(record), record["revision"]) for record in ledger["claims"]}
        self.assertIn(("current_implementation", UPPER_REVISION), classes)
        self.assertIn(("historical_implementation", ledger["historical_revision"]), classes)
        self.assertIn(
            "No historical proposition is promoted",
            ledger["reconciliation"]["current_history_conflict_policy"],
        )


class V2EnvelopeAndSemanticContract(unittest.TestCase):
    """All-claim exact-envelope and manually selected semantic-token contracts."""

    def test_every_positive_ledger_envelope_matches_exact_git_bytes(self) -> None:
        errors: list[str] = []
        for game in GAME_CONFIG:
            for record in ledger_claims(game):
                envelopes = claim_envelopes(record)
                if source_class(record) == "unknown":
                    continue
                if not envelopes:
                    errors.append(f"{claim_id(record)}:missing-envelope")
                for index, envelope in enumerate(envelopes):
                    errors.extend(envelope_errors(f"{claim_id(record)}:{index}", envelope))
        self.assertEqual(errors, [], f"ledger envelope defects: {errors}")

    def test_every_source_observation_envelope_matches_exact_git_bytes(self) -> None:
        errors: list[str] = []
        for config in GAME_CONFIG.values():
            for key in ("current", "history"):
                document = load_json(track_path(config[key]))
                for identifier, envelope in observation_envelopes(document):
                    if envelope.get("blob_sha256") is None:
                        continue
                    errors.extend(envelope_errors(identifier, envelope))
        self.assertEqual(errors, [], f"observation envelope defects: {errors}")

    def test_every_positive_claim_has_a_manual_semantic_probe(self) -> None:
        actual = {
            claim_id(record)
            for game in GAME_CONFIG
            for record in ledger_claims(game)
            if source_class(record) != "unknown"
        }
        self.assertEqual(set(SEMANTIC_TOKENS), actual)

    def test_every_claims_semantic_tokens_exist_inside_its_exact_envelope(self) -> None:
        defects: list[str] = []
        records = {
            claim_id(record): record
            for game in GAME_CONFIG
            for record in ledger_claims(game)
            if source_class(record) != "unknown"
        }
        for identifier, tokens in SEMANTIC_TOKENS.items():
            text = cited_text(records[identifier])
            missing = [token for token in tokens if token not in text]
            if missing:
                defects.append(f"{identifier}:{missing}")
        self.assertEqual(defects, [], f"semantic defects: {defects}")


class V2FixtureContract(unittest.TestCase):
    """Exhaustive six-class negative-fixture contracts for every game."""

    def test_each_game_has_exactly_six_core_failure_class_fixtures(self) -> None:
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["fixtures"]))
            fixtures = document if isinstance(document, list) else document["fixtures"]
            classes = {fixture_class(fixture) for fixture in fixtures}
            if len(fixtures) != 6 or classes != CORE_FIXTURE_CLASSES:
                defects.append(f"{game}:{len(fixtures)}:{sorted(str(c) for c in classes)}")
        self.assertEqual(defects, [], f"fixture denominator defects: {defects}")

    def test_all_fixtures_are_unique_rejections_excluded_from_factual_counts(self) -> None:
        identifiers: list[str] = []
        defects: list[str] = []
        for config in GAME_CONFIG.values():
            document = load_json(track_path(config["fixtures"]))
            fixtures = document if isinstance(document, list) else document["fixtures"]
            for fixture in fixtures:
                identifiers.append(claim_id(fixture))
                disposition = str(fixture.get("expected_disposition", "")).upper()
                if disposition != "REJECT":
                    defects.append(f"{claim_id(fixture)}:disposition")
                if fixture.get("counts_as_claim") is True:
                    defects.append(f"{claim_id(fixture)}:factual")
        self.assertEqual(len(identifiers), len(set(identifiers)))
        self.assertEqual(defects, [])


class V2MappingContract(unittest.TestCase):
    """Exact collector binding, claim-ID completeness, and no-new-fact contracts."""

    def test_maps_bind_exact_selected_ledgers_and_evidence_inputs(self) -> None:
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["map"]))
            report = load_json(track_path(config["map_report"]))
            binding = document.get("ledger_binding")
            if binding is None:
                binding = report.get("input_bindings", {}).get("claim_ledger") or report.get("exact_bindings")
            if binding is None or binding["sha256"] != file_hash(track_path(config["ledger"])):
                defects.append(f"{game}:ledger")
            bindings = document.get("evidence_bindings", {})
            expected = {
                "current_source_observations": config["current"],
                "historical_source_observations": config["history"],
                "collector_report": config["report"],
            }
            for key, relative in expected.items():
                if key in bindings and bindings[key]["sha256"] != file_hash(track_path(relative)):
                    defects.append(f"{game}:{key}")
        self.assertEqual(defects, [], f"mapping binding defects: {defects}")

    def test_every_ledger_claim_or_explicit_unknown_is_mapped(self) -> None:
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["map"]))
            references = set(flatten_strings(values_for_keys(
                document, {"claim_ids", "cited_claim_ids", "cited_unknown_ids"}
            )))
            expected = {claim_id(record) for record in ledger_claims(game)}
            if game == "griffin-sky-joust":
                expected.add("GSJ-CUR-UNK-001")
            if references != expected:
                defects.append(
                    f"{game}:missing={sorted(expected - references)}:extra={sorted(references - expected)}"
                )
        self.assertEqual(defects, [], f"mapping ID defects: {defects}")

    def test_maps_exclude_fixtures_and_add_no_source_facts_or_acceptance(self) -> None:
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["map"]))
            keys = set(_walk_keys(document))
            if keys & {"source_fact", "claim_text", "citation"}:
                defects.append(f"{game}:novel-fact-key")
            if document.get("acceptance") != "not-claimed":
                defects.append(f"{game}:acceptance")
            fixture_doc = load_json(track_path(config["fixtures"]))
            fixture_rows = fixture_doc if isinstance(fixture_doc, list) else fixture_doc["fixtures"]
            fixture_ids = {claim_id(row) for row in fixture_rows}
            references = set(flatten_strings(values_for_keys(
                document, {"claim_ids", "cited_claim_ids", "cited_unknown_ids"}
            )))
            if fixture_ids & references:
                defects.append(f"{game}:fixture-reference")
        self.assertEqual(defects, [])

    def test_mapper_reports_match_mechanical_claim_counts(self) -> None:
        expected = {"realm-carver": 12, "devourer-slime": 18}
        for game, config in GAME_CONFIG.items():
            report = load_json(track_path(config["map_report"]))
            if game == "griffin-sky-joust":
                self.assertEqual(report["result"]["factual_claims_resolved"], 7)
                self.assertTrue(report["result"]["current_unknown_preserved"])
                continue
            counts = report.get("counts", report.get("result", {}))
            value = counts.get("distinct_claim_ids_referenced", counts.get("factual_claims_resolved"))
            self.assertEqual(value, expected[game], game)


class V2ReceiptAndBudgetContract(unittest.TestCase):
    """Receipt ownership, output hash, and numeric-budget contracts (V2)."""

    def test_provenance_direction_exact_and_non_waiver(self) -> None:
        direction = load_json(
            REPO_ROOT / "measure/product-owner-apk-provenance-direction-20260721.json"
        )
        self.assertEqual(
            direction["decision"],
            "LOCAL_VERIFIABLE_RECEIPTS_ACCEPTED_WITH_DISCLOSURE",
        )
        self.assertIn(TRACK_ID, direction["scope"]["tracks"])
        for role in ("truth-test-author", "browser-auditor", "adversarial-reviewer"):
            self.assertIn(role, direction["scope"]["roles"])
        self.assertIn(
            "missing candidate, approval, or accepted lifecycle artifacts",
            direction["non_waived"],
        )

    def test_phase0_ownership_expected_v2_receipts_exist(self) -> None:
        applicability = load_json(TRACK_DIR / "phase0-role-applicability.json")
        missing: list[str] = []
        for game in applicability["game_assignments"][:3]:
            for task in game["tasks"][:4]:
                for relative in task["expected_output_paths"]:
                    if "role-receipts/" in relative and not (REPO_ROOT / relative).is_file():
                        missing.append(relative)
        self.assertEqual(missing, [], f"missing phase0 receipts: {missing}")

    def test_existing_v2_receipts_disclose_unavailable_provider_attestation(self) -> None:
        defects: list[str] = []
        for config in GAME_CONFIG.values():
            for key in ("current_receipt", "history_receipt", "collector_receipt", "mapper_receipt"):
                path = receipt_path(config[key])
                document = load_json(path)
                text = json.dumps(document, sort_keys=True).lower()
                if document.get("track_id") != TRACK_ID:
                    defects.append(f"{path.name}:track")
                if "unavailable" not in text:
                    defects.append(f"{path.name}:provider-disclosure")
                if 'provider_attested": true' in text:
                    defects.append(f"{path.name}:fabricated-attestation")
        self.assertEqual(defects, [])

    def test_existing_v2_receipt_output_hashes_match_current_v2_outputs(self) -> None:
        defects: list[str] = []
        for config in GAME_CONFIG.values():
            for key in ("current_receipt", "history_receipt", "collector_receipt", "mapper_receipt"):
                path = receipt_path(config[key])
                document = load_json(path)
                entries: list[tuple[str, str]] = []
                for field in ("output_hashes", "output_sha256"):
                    value = document.get(field, {})
                    if isinstance(value, dict):
                        entries.extend((relative, digest) for relative, digest in value.items())
                for item in document.get("output_files", []):
                    entries.append((item["path"], item["sha256"]))
                for relative, expected in entries:
                    if relative == "self" or "self-hashed" in str(expected):
                        continue
                    output = resolve_declared_output(
                        relative, path, document.get("output_paths", document.get("outputs", []))
                    )
                    if not output.is_file() or file_hash(output) != expected:
                        defects.append(f"{path.name}:{relative}")
        self.assertEqual(defects, [], f"receipt output defects: {defects}")

    def test_each_role_has_integer_actuals_within_frozen_role_budget(self) -> None:
        limits = {
            "current_receipt": (33554432, 240, 150, 240, 300),
            "history_receipt": (67108864, 600, 300, 360, 400),
            "collector_receipt": (33554432, 240, 160, 300, 500),
            "mapper_receipt": (16777216, 160, 120, 240, 500),
        }
        aliases = {
            "bytes": ("source_bytes_read", "source_bytes"),
            "objects": ("source_objects_read", "input_files_read"),
            "commands": ("command_invocations", "commands"),
            "elapsed": ("elapsed_minutes",),
            "records": ("observations_authored", "claims_authored", "records_authored", "records_authored_reviewed", "mapped_records"),
        }
        defects: list[str] = []
        for config in GAME_CONFIG.values():
            for key, ceilings in limits.items():
                path = receipt_path(config[key])
                document = load_json(path)
                actual = document.get(
                    "actual_usage",
                    document.get("numeric_usage", document.get("usage", document.get("budget", {}))),
                )
                for (unit, names), ceiling in zip(aliases.items(), ceilings):
                    value = next((actual[name] for name in names if name in actual), None)
                    if not isinstance(value, int) or isinstance(value, bool):
                        defects.append(f"{path.name}:{unit}:missing")
                    elif value < 0 or value > ceiling:
                        defects.append(f"{path.name}:{unit}:{value}>{ceiling}")
        self.assertEqual(defects, [], f"budget defects: {defects}")

    def test_mapper_receipts_use_exact_frozen_upper_revision(self) -> None:
        defects: list[str] = []
        for config in GAME_CONFIG.values():
            document = load_json(receipt_path(config["mapper_receipt"]))
            revision = document.get("source_revision", document.get("source_baseline_revision"))
            if revision not in (UPPER_REVISION, COMPARISON_REVISION):
                defects.append(f"{config['label']}:{revision}")
        self.assertEqual(defects, [])


if __name__ == "__main__":
    unittest.main()
