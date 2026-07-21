"""Fail-closed truth contracts for T7 Special/Historical Batch A.

The suite independently checks the frozen Griffin Sky-Joust, Realm Carver,
and Devourer Slime evidence packages. Source, chronology, fixture, mapping,
receipt, budget, browser, review, and lifecycle gates are separate so later
roles cannot turn a structural or hash-only pass into an acceptance claim.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
      measure/tracks/apk_corpus_audit_special_historical_20260712/\
batch-a/truth-tests.py
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
        "current": "packages/griffin-sky-joust/current-source-observations.json",
        "history": "packages/griffin-sky-joust/historical-source-observations.json",
        "ledger": "packages/griffin-sky-joust/claim-ledger.json",
        "report": "packages/griffin-sky-joust/evidence-final-report.json",
        "method": "packages/griffin-sky-joust/evidence-method.md",
        "fixtures": "packages/griffin-sky-joust/negative-fixtures.json",
        "map": "packages/griffin-sky-joust/requirements-map.json",
        "map_report": "packages/griffin-sky-joust/requirements-mapper-report.json",
        "current_receipt": "current-source-specialist-griffin-sky-joust.json",
        "history_receipt": "historical-source-specialist-griffin-sky-joust.json",
        "collector_receipt": "evidence-collector-griffin-sky-joust.json",
        "mapper_receipt": "requirements-mapper-griffin-sky-joust.json",
    },
    "realm-carver": {
        "label": "Realm Carver",
        "current": "packages/realm-carver/current-source-observations.json",
        "history": "packages/realm-carver/historical-source-observations.json",
        "ledger": "packages/realm-carver/claim-ledger.json",
        "report": "packages/realm-carver/evidence-final-report.json",
        "method": "packages/realm-carver/evidence-method.md",
        "fixtures": "packages/realm-carver/negative-fixtures.json",
        "map": "packages/realm-carver/requirements-map.json",
        "map_report": "packages/realm-carver/requirements-map-report.json",
        "current_receipt": "current-source-specialist-realm-carver.json",
        "history_receipt": "historical-source-specialist-realm-carver.json",
        "collector_receipt": "evidence-collector-realm-carver.json",
        "mapper_receipt": "requirements-mapper-realm-carver-batch-a.json",
    },
    "devourer-slime": {
        "label": "Devourer Slime",
        "current": "packages/devourer-slime/current-source-observations.json",
        "history": "packages/devourer-slime/historical-source-observations.json",
        "ledger": "packages/devourer-slime/reconciled-claim-ledger.json",
        "report": "packages/devourer-slime/evidence-method-report.md",
        "method": "packages/devourer-slime/evidence-method-report.md",
        "fixtures": "packages/devourer-slime/negative-fixtures.json",
        "map": "packages/devourer-slime/requirements-map.json",
        "map_report": "packages/devourer-slime/requirements-map-report.json",
        "current_receipt": "current-source-specialist-devourer-slime.json",
        "history_receipt": "historical-source-specialist-devourer-slime.json",
        "collector_receipt": "../packages/devourer-slime/evidence-collector-receipt.json",
        "mapper_receipt": "requirements-mapper-devourer-slime-batch-a.json",
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

TRUTH_RECEIPT = RECEIPTS_DIR / "truth-test-author-batch-a.json"
REVIEW_PATH = TRACK_DIR / "batch-a/adversarial-review.json"
REVIEW_RECEIPT = RECEIPTS_DIR / "adversarial-reviewer-batch-a.json"
CANDIDATE_PATH = TRACK_DIR / "batch-a/candidate-manifest.json"
APPROVAL_PATH = TRACK_DIR / "batch-a/product-owner-acceptance.json"
ACCEPTED_PATH = TRACK_DIR / "batch-a/accepted-manifest.json"


def sha256(data: bytes) -> str:
    """Returns a lowercase SHA-256 digest for exact bytes."""
    return hashlib.sha256(data).hexdigest()


def file_hash(path: Path) -> str:
    """Returns a file's exact SHA-256 digest."""
    return sha256(path.read_bytes())


def load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON document."""
    return json.loads(path.read_text(encoding="utf-8"))


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one read-only Git command at the repository root."""
    return subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, check=False
    )


def git_show(revision: str, relative: str) -> bytes | None:
    """Returns exact Git object bytes, or None when the path is absent."""
    result = git("show", f"{revision}:{relative}")
    return result.stdout if result.returncode == 0 else None


def is_ancestor(ancestor: str, descendant: str) -> bool:
    """Returns whether one commit is an ancestor of another."""
    return git("merge-base", "--is-ancestor", ancestor, descendant).returncode == 0


def track_path(relative: str) -> Path:
    """Resolves one track-relative path."""
    return TRACK_DIR / relative


def receipt_path(relative: str) -> Path:
    """Resolves a receipt path, including the package-local collector receipt."""
    return (RECEIPTS_DIR / relative).resolve()


def ledger_claims(game: str) -> list[dict[str, Any]]:
    """Returns normalized claims from one selected collector ledger."""
    document = load_json(track_path(GAME_CONFIG[game]["ledger"]))
    return document if isinstance(document, list) else document["claims"]


def claim_id(record: dict[str, Any]) -> str:
    """Returns a normalized claim or fixture identifier."""
    return str(record.get("claim_id", record.get("fixture_id", "")))


def source_class(record: dict[str, Any]) -> str | None:
    """Returns the normalized evidence/source class."""
    return record.get("source_class", record.get("evidence_class"))


def claim_envelopes(record: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalizes all exact envelopes attached to one ledger claim."""
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
    """Returns all positive current/history observation envelopes."""
    observations = document.get("observations", document.get("historical_observations", []))
    result: list[tuple[str, dict[str, Any]]] = []
    for observation in observations:
        identifier = str(observation.get("observation_id", "<missing>"))
        if isinstance(observation.get("envelopes"), list):
            result.extend((identifier, envelope) for envelope in observation["envelopes"])
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
    """Returns exact path, revision, blob, range, and bounds errors."""
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
    data = git_show(revision, relative)
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
    """Returns concatenated exact cited text for semantic checks."""
    chunks: list[bytes] = []
    for envelope in claim_envelopes(record):
        data = git_show(envelope["revision"], envelope["path"])
        if data is None:
            continue
        lines = data.splitlines(keepends=True)
        start = envelope.get("start_line")
        end = envelope.get("end_line")
        if isinstance(start, int) and isinstance(end, int):
            chunks.append(b"".join(lines[start - 1:end]))
    return b"\n".join(chunks).decode("utf-8", errors="replace")


def values_for_keys(value: Any, keys: set[str]) -> list[Any]:
    """Returns values recursively found under selected dictionary keys."""
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
    """Flattens string values and string lists."""
    result: list[str] = []
    for value in values:
        if isinstance(value, str):
            result.append(value)
        elif isinstance(value, list):
            result.extend(item for item in value if isinstance(item, str))
    return result


def fixture_class(fixture: dict[str, Any]) -> str | None:
    """Maps local fixture names onto the six frozen failure classes."""
    raw = str(fixture.get("kind", fixture.get("failure_class", ""))).lower()
    if "catalog" in raw:
        return "catalog_promotion"
    if "cancelled" in raw:
        return "cancelled_design_promotion"
    if "specification" in raw:
        return "specification_promotion"
    if "historical" in raw and ("current" in raw or "promotion" in raw):
        return "historical_promotion"
    if "analogy" in raw:
        return "analogy_substitution"
    if "overstat" in raw or "compound" in raw:
        return "semantic_overstatement"
    return None


def resolve_declared_output(
    relative: str, receipt: Path, declared_outputs: Iterable[str]
) -> Path:
    """Resolves repository, track, receipt, and basename output references."""
    if relative.startswith("measure/"):
        return REPO_ROOT / relative
    if "/" in relative:
        return TRACK_DIR / relative
    matches = [item for item in declared_outputs if item.endswith(f"/{relative}")]
    if len(matches) == 1:
        return REPO_ROOT / matches[0]
    return receipt.parent / relative


class BatchAFreezeAndInputContract(unittest.TestCase):
    """Exact scope, predecessor, input-hash, and no-Batch-B contracts."""

    def test_phase_role_and_chronology_bases_are_real_and_ordered(self) -> None:
        """Fails when the frozen phase, role, root, comparison, or upper bound drifts."""
        for revision in (PHASE_BASE_SHA, ROLE_BASE_SHA, UPPER_REVISION,
                         ROOT_REVISION, COMPARISON_REVISION):
            self.assertRegex(revision, HEX40)
        self.assertTrue(is_ancestor(ROOT_REVISION, UPPER_REVISION))
        self.assertTrue(is_ancestor(COMPARISON_REVISION, UPPER_REVISION))
        self.assertTrue(is_ancestor(PHASE_BASE_SHA, ROLE_BASE_SHA))

    def test_batch_a_membership_matches_discovery_and_partition(self) -> None:
        """Fails when Batch A is widened, renamed, omitted, or reassigned."""
        expected = tuple(config["label"] for config in GAME_CONFIG.values())
        discovery = load_json(TRACK_DIR / "batch-a/discovery-audit.json")
        self.assertEqual(
            tuple(row["identity_label"] for row in discovery["membership_reconciliation"]),
            expected,
        )
        partition = load_json(
            REPO_ROOT
            / "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json"
        )
        assigned = tuple(
            row["canonical_identity_label"]
            for row in partition["assignments"]
            if row["cohort"] == "Special and historical"
        )
        self.assertEqual(assigned[:3], expected)
        self.assertEqual(len(assigned), 5)

    def test_truth_receipt_inputs_match_exact_committed_role_base_bytes(self) -> None:
        """Fails when any strategy, source, collector, mapper, or receipt input drifts."""
        receipt = load_json(TRUTH_RECEIPT)
        defects: list[str] = []
        for relative, expected in receipt["input_hashes"].items():
            path = REPO_ROOT / relative
            if not path.is_file() or file_hash(path) != expected:
                defects.append(f"{relative}:hash")
            elif git_show(ROLE_BASE_SHA, relative) != path.read_bytes():
                defects.append(f"{relative}:role-base")
        self.assertEqual(defects, [], f"input drift: {defects}")

    def test_accepted_predecessors_remain_consumable_and_unrevoked(self) -> None:
        """Fails when T1, T2, or T3 is missing, revoked, or non-consumable."""
        paths = (
            "measure/evidence-integrity-accepted-gate.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
            "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
            "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
        )
        for relative in paths:
            document = load_json(REPO_ROOT / relative)
            self.assertTrue(document["consumable"], relative)
            self.assertIs(document.get("revoked", False), False, relative)

    def test_batch_b_source_work_has_not_started(self) -> None:
        """Fails when Batch B opens before an exact accepted Batch A manifest."""
        self.assertFalse(ACCEPTED_PATH.exists())
        self.assertFalse((TRACK_DIR / "batch-b").exists())
        self.assertFalse((TRACK_DIR / "packages/the-haunted-library").exists())
        self.assertFalse((TRACK_DIR / "packages/babel-architect").exists())


class BatchASourceClassAndChronologyContract(unittest.TestCase):
    """Closed source classes, temporal separation, and reachability contracts."""

    def test_all_claim_and_observation_source_classes_are_closed(self) -> None:
        """Fails when tests, prose, or methods are promoted into a new evidence class."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            for record in ledger_claims(game):
                if source_class(record) not in ALLOWED_SOURCE_CLASSES:
                    defects.append(f"{claim_id(record)}:{source_class(record)}")
            for key in ("current", "history"):
                document = load_json(track_path(config[key]))
                observations = document.get(
                    "observations", document.get("historical_observations", [])
                )
                for record in observations:
                    klass = source_class(record) or document.get("source_class")
                    if klass not in ALLOWED_SOURCE_CLASSES:
                        defects.append(f"{record.get('observation_id')}:{klass}")
        self.assertEqual(defects, [], f"source-class defects: {defects}")

    def test_current_records_use_only_the_frozen_upper_revision(self) -> None:
        """Fails when current claims cite history, the worktree, or a later revision."""
        defects = [
            f"{claim_id(record)}:{envelope.get('revision')}"
            for game in GAME_CONFIG
            for record in ledger_claims(game)
            if source_class(record) == "current_implementation"
            for envelope in claim_envelopes(record)
            if envelope.get("revision") != UPPER_REVISION
        ]
        self.assertEqual(defects, [])

    def test_historical_records_are_reachable_ancestors_not_current_claims(self) -> None:
        """Fails when a historical claim is unreachable or promoted to current."""
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

    def test_griffin_deletion_events_match_git_parent_and_deleted_paths(self) -> None:
        """Fails when Griffin chronology invents a parent or deletion event."""
        history = load_json(track_path(GAME_CONFIG["griffin-sky-joust"]["history"]))
        defects: list[str] = []
        for event in history["historical_events"]:
            parent = git("rev-parse", f"{event['commit']}^")
            if parent.returncode != 0 or parent.stdout.decode().strip() != event["parent_revision"]:
                defects.append(f"{event['event_id']}:parent")
            deleted = git(
                "diff", "--name-only", "--diff-filter=D",
                event["parent_revision"], event["commit"], "--",
            ).stdout.decode().splitlines()
            if not set(event["paths_deleted"]).issubset(deleted):
                defects.append(f"{event['event_id']}:deleted-paths")
        self.assertEqual(defects, [])

    def test_realm_empty_diff_conflict_remains_explicit_and_unresolved(self) -> None:
        """Fails when Realm's locator/diff conflict is silently resolved as deletion."""
        history = load_json(track_path(GAME_CONFIG["realm-carver"]["history"]))
        report = load_json(track_path(GAME_CONFIG["realm-carver"]["report"]))
        self.assertEqual(history["diff_report"]["changed_files_claimed"], 0)
        self.assertTrue(history["diff_report"]["unresolved"])
        self.assertTrue(report["chronology"]["revision_to_parent_diff_conflict_preserved"])

    def test_devourer_current_and_history_are_chronologically_separate(self) -> None:
        """Fails when equal blobs erase Devourer Slime's revision distinction."""
        ledger = load_json(track_path(GAME_CONFIG["devourer-slime"]["ledger"]))
        self.assertTrue(is_ancestor(ledger["historical_revision"], UPPER_REVISION))
        classes = {(source_class(record), record["revision"]) for record in ledger["claims"]}
        self.assertIn(("current_implementation", UPPER_REVISION), classes)
        self.assertIn(("historical_implementation", ledger["historical_revision"]), classes)
        self.assertIn("No historical proposition is promoted", ledger["reconciliation"]["current_history_conflict_policy"])


class BatchAEnvelopeAndSemanticContract(unittest.TestCase):
    """All-claim exact-envelope and manually selected semantic-token contracts."""

    def test_every_positive_ledger_envelope_matches_exact_git_bytes(self) -> None:
        """Fails on stale blobs, bad ranges, malformed paths, or unreachable revisions."""
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
        """Fails when a current/history specialist's direct envelope is invalid."""
        errors: list[str] = []
        for config in GAME_CONFIG.values():
            for key in ("current", "history"):
                document = load_json(track_path(config[key]))
                for identifier, envelope in observation_envelopes(document):
                    if envelope.get("blob_sha256") is None:
                        continue
                    errors.extend(envelope_errors(identifier, envelope))
        self.assertEqual(errors, [], f"observation envelope defects: {errors}")

    def test_current_unknown_absence_claims_resolve_at_exact_paths(self) -> None:
        """Fails when a bounded missing-path claim ignores a present current object."""
        defects: list[str] = []
        griffin = load_json(track_path(GAME_CONFIG["griffin-sky-joust"]["current"]))
        for relative in griffin["source_scope"]["candidate_paths_examined"]:
            if git_show(UPPER_REVISION, relative) is not None:
                defects.append(f"griffin:{relative}")
        realm = load_json(track_path(GAME_CONFIG["realm-carver"]["current"]))
        for observation in realm["observations"]:
            relative = observation["exact_envelope"]["path"]
            if git_show(UPPER_REVISION, relative) is not None:
                defects.append(f"realm:{relative}")
        self.assertEqual(defects, [])

    def test_every_positive_claim_has_a_manual_semantic_probe(self) -> None:
        """Fails when a factual claim is added without source-semantic review."""
        actual = {
            claim_id(record)
            for game in GAME_CONFIG
            for record in ledger_claims(game)
            if source_class(record) != "unknown"
        }
        self.assertEqual(set(SEMANTIC_TOKENS), actual)

    def test_every_claims_semantic_tokens_exist_inside_its_exact_envelope(self) -> None:
        """Fails when hash-valid cited bytes do not contain each claimed source atom."""
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


class BatchAFixtureContract(unittest.TestCase):
    """Exhaustive six-class negative-fixture contracts for every game."""

    def test_each_game_has_exactly_six_core_failure_class_fixtures(self) -> None:
        """Fails when any mandatory promotion, analogy, or overstatement probe is absent."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["fixtures"]))
            fixtures = document if isinstance(document, list) else document["fixtures"]
            classes = {fixture_class(fixture) for fixture in fixtures}
            if len(fixtures) != 6 or classes != CORE_FIXTURE_CLASSES:
                defects.append(f"{game}:{len(fixtures)}:{sorted(str(item) for item in classes)}")
        self.assertEqual(defects, [], f"fixture denominator defects: {defects}")

    def test_all_fixtures_are_unique_rejections_excluded_from_factual_counts(self) -> None:
        """Fails when fixtures become accepted claims or collide across games."""
        identifiers: list[str] = []
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["fixtures"]))
            fixtures = document if isinstance(document, list) else document["fixtures"]
            for fixture in fixtures:
                identifier = claim_id(fixture)
                identifiers.append(identifier)
                disposition = str(fixture.get("expected_disposition", "")).upper()
                if disposition != "REJECT":
                    defects.append(f"{identifier}:disposition")
                if fixture.get("counts_as_claim") is True:
                    defects.append(f"{identifier}:factual")
        self.assertEqual(len(identifiers), len(set(identifiers)))
        self.assertEqual(defects, [])

    def test_fixture_basis_ids_resolve_only_to_same_game_ledgers(self) -> None:
        """Fails when a fixture cites an invented or cross-game backing ID."""
        defects: list[str] = []
        keys = {"basis_claim_ids", "source_checked_claim_id", "source_checked_claim_ids", "source_observation_id"}
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["fixtures"]))
            fixtures = document if isinstance(document, list) else document["fixtures"]
            ledger_ids = {claim_id(record) for record in ledger_claims(game)}
            observation_ids: set[str] = set()
            for key in ("current", "history"):
                source = load_json(track_path(config[key]))
                rows = source.get("observations", source.get("historical_observations", []))
                observation_ids.update(str(row.get("observation_id")) for row in rows)
            allowed = ledger_ids | observation_ids
            for fixture in fixtures:
                for reference in flatten_strings(values_for_keys(fixture, keys)):
                    if reference not in allowed:
                        defects.append(f"{claim_id(fixture)}:{reference}")
        self.assertEqual(defects, [])


class BatchAMappingContract(unittest.TestCase):
    """Exact collector binding, claim-ID completeness, and no-new-fact contracts."""

    def test_maps_bind_exact_selected_ledgers_and_evidence_inputs(self) -> None:
        """Fails when a map points to stale collector or specialist bytes."""
        defects: list[str] = []
        for game, config in GAME_CONFIG.items():
            document = load_json(track_path(config["map"]))
            report = load_json(track_path(config["map_report"]))
            binding = document.get("ledger_binding")
            if binding is None:
                binding = report.get("input_bindings", {}).get("claim_ledger")
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
        """Fails when mapping omits or invents an active collector ID."""
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
        """Fails when mapping becomes evidence collection, fixture promotion, or approval."""
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
        """Fails when mapper reports overstate reference or unknown coverage."""
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


def _walk_keys(value: Any) -> list[str]:
    """Returns every nested dictionary key."""
    keys: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            keys.append(key)
            keys.extend(_walk_keys(child))
    elif isinstance(value, list):
        for child in value:
            keys.extend(_walk_keys(child))
    return keys


class BatchAReceiptAndBudgetContract(unittest.TestCase):
    """Receipt ownership, local provenance, output hash, and numeric-budget contracts."""

    def test_provenance_direction_is_exact_and_non_waiver_is_preserved(self) -> None:
        """Fails when local-verifiability direction is broadened into gate waiver."""
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
        self.assertIn("missing candidate, approval, or accepted lifecycle artifacts", direction["non_waived"])

    def test_phase0_ownership_expected_receipts_exist_for_completed_inputs(self) -> None:
        """Fails when a current/history/collector/mapper output lacks its assigned receipt."""
        applicability = load_json(TRACK_DIR / "phase0-role-applicability.json")
        missing: list[str] = []
        for game in applicability["game_assignments"][:3]:
            for task in game["tasks"][:4]:
                for relative in task["expected_output_paths"]:
                    if "role-receipts/" in relative and not (REPO_ROOT / relative).is_file():
                        missing.append(relative)
        self.assertEqual(missing, [], f"missing assigned receipts: {missing}")

    def test_existing_receipts_disclose_unavailable_provider_attestation(self) -> None:
        """Fails when an existing role receipt fabricates provider provenance."""
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
                if "provider_attested\": true" in text:
                    defects.append(f"{path.name}:fabricated-attestation")
        self.assertEqual(defects, [])

    def test_existing_receipt_output_hashes_match_current_committed_outputs(self) -> None:
        """Fails when a role receipt's declared output digest is stale or missing."""
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
        """Fails on missing, non-integer, unmeasured, or over-ceiling usage."""
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

    def test_mapper_receipts_use_the_exact_frozen_current_revision(self) -> None:
        """Fails when a mapper receipt carries a malformed or invented source revision."""
        defects: list[str] = []
        for config in GAME_CONFIG.values():
            document = load_json(receipt_path(config["mapper_receipt"]))
            revision = document.get("source_revision", document.get("source_baseline_revision"))
            if revision not in (UPPER_REVISION, COMPARISON_REVISION):
                defects.append(f"{config['label']}:{revision}")
        self.assertEqual(defects, [])

    def test_truth_receipt_binds_only_this_test_and_fresh_role_scope(self) -> None:
        """Fails when this role claims evidence, mapping, browser, review, or acceptance work."""
        receipt = load_json(TRUTH_RECEIPT)
        self.assertEqual(receipt["role"], "truth-test-author-batch-a")
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE_SHA)
        self.assertEqual(receipt["prior_role_history"], [])
        self.assertEqual(receipt["role_isolation"]["roles_held"], ["truth-test-author"])
        test_relative = str(Path(__file__).resolve().relative_to(REPO_ROOT))
        self.assertEqual(receipt["output_hashes"][test_relative], file_hash(Path(__file__).resolve()))
        ceilings = (67108864, 500, 300, 360, 200, 5000)
        keys = ("source_bytes_read", "source_objects_read", "command_invocations",
                "elapsed_minutes", "test_cases", "assertions_executed")
        for key, ceiling in zip(keys, ceilings):
            self.assertIsInstance(receipt["actual_usage"][key], int)
            self.assertLessEqual(receipt["actual_usage"][key], ceiling)


class BatchABrowserDispositionContract(unittest.TestCase):
    """Per-game runnable/non-runnable browser evidence contracts."""

    def _assert_browser_artifacts(self, game: str) -> None:
        """Asserts one game's browser audit and receipt satisfy its disposition."""
        package = TRACK_DIR / f"packages/{game}"
        audit_path = package / "browser-audit.json"
        receipt = RECEIPTS_DIR / f"browser-auditor-{game}.json"
        self.assertTrue(
            audit_path.is_file() and receipt.is_file(),
            f"EXPECTED_STAGE_RED[BROWSER_DISPOSITION_MISSING:{game}]",
        )
        audit = load_json(audit_path)
        text = json.dumps(audit, sort_keys=True).lower()
        for required in ("kimi", "synthetic", "revision", "route"):
            self.assertIn(required, text)
        self.assertIn(audit.get("acceptance", "not-claimed"), (False, "not-claimed"))
        if game == "devourer-slime":
            self.assertIn("compact", text)
            self.assertIn("wide", text)
            self.assertIn("transition", text)
        else:
            for required in ("command", "environment", "failure", "log"):
                self.assertIn(required, text)

    def test_griffin_sky_joust_has_reviewable_non_runnable_disposition(self) -> None:
        """Fails until missing current source is followed by a reviewed browser disposition."""
        self._assert_browser_artifacts("griffin-sky-joust")

    def test_realm_carver_has_reviewable_non_runnable_disposition(self) -> None:
        """Fails until missing current source is followed by a reviewed browser disposition."""
        self._assert_browser_artifacts("realm-carver")

    def test_devourer_slime_has_compact_and_wide_live_transition_evidence(self) -> None:
        """Fails until the current implementation receives required browser evidence."""
        self._assert_browser_artifacts("devourer-slime")


class BatchAIndependentReviewContract(unittest.TestCase):
    """Fresh full-batch adversarial-review existence and binding contract."""

    def test_fresh_review_binds_truth_and_has_zero_blocking_findings(self) -> None:
        """Fails until a separate reviewer binds exact active bytes and all three games."""
        self.assertTrue(
            REVIEW_PATH.is_file() and REVIEW_RECEIPT.is_file(),
            "EXPECTED_STAGE_RED[INDEPENDENT_REVIEW_MISSING]",
        )
        review = load_json(REVIEW_PATH)
        receipt = load_json(REVIEW_RECEIPT)
        self.assertEqual(set(review["games_reviewed"]), set(GAME_CONFIG))
        blockers = review["unresolved_findings"]
        self.assertEqual(
            {key: blockers[key] for key in ("critical", "high", "medium")},
            {"critical": 0, "high": 0, "medium": 0},
        )
        required = {
            str(Path(__file__).resolve().relative_to(REPO_ROOT)): file_hash(Path(__file__).resolve()),
            str(TRUTH_RECEIPT.relative_to(REPO_ROOT)): file_hash(TRUTH_RECEIPT),
        }
        for relative, expected in required.items():
            self.assertEqual(receipt["input_hashes"].get(relative), expected)


class BatchALifecycleContract(unittest.TestCase):
    """Ordered candidate, authentic owner approval, and accepted-manifest contracts."""

    def test_non_consumable_candidate_binds_truth_browser_and_review(self) -> None:
        """Fails until a post-review, non-consumable Batch A candidate exists."""
        self.assertTrue(CANDIDATE_PATH.is_file(), "EXPECTED_STAGE_RED[CANDIDATE_MISSING]")
        candidate = load_json(CANDIDATE_PATH)
        self.assertFalse(candidate["consumable"])
        for path in (Path(__file__).resolve(), TRUTH_RECEIPT, REVIEW_PATH, REVIEW_RECEIPT):
            relative = str(path.relative_to(REPO_ROOT))
            self.assertEqual(candidate["input_hashes"].get(relative), file_hash(path))

    def test_authentic_product_owner_approval_binds_candidate_and_review(self) -> None:
        """Fails until authentic post-review owner acceptance is exactly bound."""
        self.assertTrue(APPROVAL_PATH.is_file(), "EXPECTED_STAGE_RED[OWNER_APPROVAL_MISSING]")
        approval = load_json(APPROVAL_PATH)
        self.assertEqual(approval["candidate_manifest_sha256"], file_hash(CANDIDATE_PATH))
        self.assertEqual(approval["review_report_sha256"], file_hash(REVIEW_PATH))
        self.assertEqual(approval["decision"], "approve")
        self.assertIs(approval["revoked"], False)
        for field in ("event_id", "conversation_id", "approval_message_sha256", "approval_event_timestamp"):
            self.assertTrue(approval[field])

    def test_accepted_manifest_is_last_and_discloses_local_verifiability(self) -> None:
        """Fails until a separately generated accepted manifest binds owner approval."""
        self.assertTrue(ACCEPTED_PATH.is_file(), "EXPECTED_STAGE_RED[ACCEPTED_MANIFEST_MISSING]")
        accepted = load_json(ACCEPTED_PATH)
        self.assertEqual(accepted["status"], "accepted")
        self.assertTrue(accepted["consumable"])
        self.assertIs(accepted["revoked"], False)
        self.assertEqual(accepted["candidate_manifest_sha256"], file_hash(CANDIDATE_PATH))
        self.assertEqual(accepted["owner_acceptance_sha256"], file_hash(APPROVAL_PATH))
        disclosure = json.dumps(accepted, sort_keys=True).lower()
        self.assertIn("provider-side", disclosure)
        self.assertIn("unavailable", disclosure)


if __name__ == "__main__":
    unittest.main()
