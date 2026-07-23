"""T4 Batch A truth tests for the APK Action and Defense Evidence Cohort.

Role: truth-test-author (fresh context; fork_turns=none; parent_ancestry_ids=[];
no prior-role completion narrative used as a derivation source).
Track: apk_corpus_audit_action_defense_20260712.
Batch A games: Castle Defense, Magic Defense, Wizard vs Zombie.

These tests validate the frozen T1/T2/T3 predecessor inputs, the three committed
Batch A claim ledgers, the mapper blueprint/hypotheses/report, and the Batch A
role receipts at the source-baseline revision
23bb5ad578c01fb29f9e8bb76a7d934d24a4b286. Every invariant is derived from the
committed inputs themselves (denominator manifests, claim ledgers, blueprint,
final reports, receipts) -- never from any role's completion narrative.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
        measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-truth-tests.py

Citation conventions validated here (mirroring the pilot module docstring,
specialized for the Batch A ledger schema which uses `revision` instead of
`cited_revision` and has no `citation_kind` field):

- cited_range_sha256 = SHA-256 of the exact bytes of lines start..end inclusive,
  each line terminated by its in-file newline (a trailing-newline-less form is
  also accepted, mirroring pilot resolution).
- blob_sha256 = SHA-256 of the whole file bytes at the cited revision.
- Binary/data assets use whole-file citation (cited_range_sha256 == blob_sha256).
- Frozen-manifest class: the cited artifact (e.g., T2 accepted manifests) was
  authored after the source baseline; those blobs are verified against the
  committed working-tree bytes (the path did not exist at the baseline
  revision). In this schema the class is recognized structurally: the revision
  does not resolve the path but the working-tree bytes match blob_sha256.
- command-output envelopes (command/observed_output/output_sha256) are
  recognized when file_path is null; none occur in the Batch A ledgers.

TRUTH STATUS AT AUTHORING TIME (derived, not narrative)
-------------------------------------------------------
302 of 314 non-fixture claims resolve under the citation contract above.
12 claims DO NOT resolve and are enumerated by the failing tests:

- Fabricated citation envelopes (hash matches no real bytes anywhere):
  MD-HIST-001, MD-HIST-002 (blob_sha256 is the SHA-256 of the empty byte
  string; both claims share one identical cited_range_sha256 across two
  different ranges; the real historical blob at 097545f1 is a05dc35f...),
  WVZ-COMP-004, WVZ-MECH-019, WVZ-TEST-007 (range hash matches no contiguous
  window of the cited file or its host copies at any width/encoding),
  WVZ-TEST-008, WVZ-HIST-002, WVZ-HIST-003, WVZ-HIST-004 (literally
  sequential-hex placeholder strings: 1a2b3c4d..., c1d3e5f7..., d3e5f7a9...,
  1b3c5d7e...).
- Anchor-drifted (hash matches real contiguous content of the cited file at a
  shifted window, but NOT at the cited line_start..line_end):
  WVZ-COMP-005 (cited 482-504; real 484-504), WVZ-COMP-006 (cited 35; real 33),
  WVZ-MECH-008 (cited 171-182; real 172-182).

Consequence: gate G-CL (claim citation resolves) and the stop-loss counter
`unsupported_factual_claims` are RED. Per
measure/apk-evidence-reconstruction-program.md ("One unsupported or fabricated
factual claim stops the batch."), Batch A acceptance is blocked until the
magic-defense and wizard-vs-zombie evidence is remediated by a re-collection or
a receipt-superseding correction. The failing tests are the detection surface;
they MUST NOT be weakened to force a green run (anti-patterns A4/A5).

Additional informational observation (non-blocking): several magic-defense
mechanic claims carry hash-honest ranges whose prose line anchors are drifted
(e.g., MD-MECH-002 cites controller line 48 while the XP formula lives at lines
45-46; MD-MECH-003 names useGameStore.ts line 9 while MAX_CASTLE_HP is exported
at line 13; MD-MECH-008 cites GameEngine.tsx 337-340 while the lowercased
translation equality lives at line 369). Class 4 re-derives the semantics from
the hash-pinned blob rather than from the prose anchor.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import unittest
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / "apk_corpus_audit_action_defense_20260712"
ARCHIVE_DIR = REPO_ROOT / "measure" / "archive" / "apk_source_denominator_inventory_20260712"
PILOT_DIR = REPO_ROOT / "measure" / "archive" / "apk_three_game_truth_pilot_20260712"
MODULE_PATH = "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-truth-tests.py"

BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
T2_ARCHIVE_REVISION = "da51b4e006cdce175171077e97c86089a38dbd5b"
PHASE_BASE_SHA = "9228c5c5"
MD_HISTORICAL_REVISION = "097545f14a8029d0c3451e3514841f9c5bf3e1c2"

T1_GATE_VERSION = "phase4-v8-candidate"
T1_GATE_COMMIT = "5aea360f94f978ac78e590e0a64d33d176beaa1a"
T2_DENOMINATOR_SHA256 = "d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729"
T2_PARTITION_SHA256 = "6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0"
T3_PILOT_SHA256 = "cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b"

HEX40_RE = re.compile(r"\A[0-9a-f]{40}\Z")
HEX64_RE = re.compile(r"\A[0-9a-f]{64}\Z")
CLAIM_ID_RE = re.compile(r"\b(?:CD|MD|WVZ)-[A-Z]+-\d+\b")
TRANSITION_RECORD_ID_RE = re.compile(r"\A(?:CD|MD|WVZ)-T-\d+\Z")
HYPOTHESIS_ID_RE = re.compile(r"\bH[1-9]\b")

GAMES = ("castle-defense", "magic-defense", "wizard-vs-zombie")
CANONICAL_IDS = {
    "castle-defense": "sentence/castle-defense",
    "magic-defense": "vocabulary/magic-defense",
    "wizard-vs-zombie": "vocabulary/wizard-vs-zombie",
}
PARTITION_LABELS = {
    "castle-defense": "Castle Defense",
    "magic-defense": "Magic Defense",
    "wizard-vs-zombie": "Wizard vs Zombie",
}
COLLECTOR_AGENTS = {
    game: f"evidence-collector-{game}:t4:2026-07-20" for game in GAMES
}
# Serialized-content match variants: slug plus the camelCase lib identifiers
# (castleDefense.ts, magicDefenseConfig.ts, wizardZombie.ts). This rule
# reproduces the castle-defense collector's published reconciliation
# (83 records: file 40, graph 36, copy 4, identity 1, route 2) exactly.
SLUG_VARIANTS = {
    "castle-defense": ("castle-defense", "castleDefense"),
    "magic-defense": ("magic-defense", "magicDefense"),
    "wizard-vs-zombie": ("wizard-vs-zombie", "wizardZombie"),
}
SOURCE_DENOMINATOR_COUNTS = {
    "castle-defense": {"file": 40, "graph": 36, "copy": 4, "identity": 1, "route": 2},
    "magic-defense": {"file": 18, "graph": 23, "copy": 2, "identity": 1, "route": 2},
    "wizard-vs-zombie": {"file": 30, "graph": 56, "copy": 6, "identity": 1, "route": 2},
}
PHASE3_TOTALS = {"castle-defense": 264, "magic-defense": 113, "wizard-vs-zombie": 233}

CLAIM_TOTALS = {"castle-defense": 139, "magic-defense": 110, "wizard-vs-zombie": 77}
FIXTURE_IDS = {
    "castle-defense": {"CD-NEG-001", "CD-NEG-002", "CD-NEG-003"},
    "magic-defense": {"MD-NEG-001", "MD-NEG-002", "MD-NEG-003", "MD-NEG-004", "MD-NEG-005"},
    "wizard-vs-zombie": {"WVZ-NEG-001", "WVZ-NEG-002", "WVZ-NEG-003", "WVZ-NEG-004"},
}
ALLOWED_CATEGORIES = {
    "castle-defense": {
        "asset", "history", "identity", "mechanic", "negative-fixture",
        "responsive", "route", "scene-state", "test", "transition",
    },
    "magic-defense": {
        "asset", "history", "identity", "mechanic", "negative_fixture",
        "responsive", "route", "scene-state", "test", "transition",
    },
    "wizard-vs-zombie": {
        "asset", "component", "history", "identity", "mechanic",
        "negative_fixture", "route", "state", "test",
    },
}
CONFIDENCE_VALUES = {"high", "medium", "low"}
FAIL_DISPOSITIONS = {"FAIL", "FAILED", "MUST_FAIL"}
REJECT_DISPOSITIONS = {"REJECT", "REJECTED"}

WVZ_BIND_COMMIT = "20af641778c0d52c1b18dcbc33aac948c369b744"
WVZ_INTERMEDIATE_COMMITS = ("2f551701", "01e4615e", "2bcb883c")
MD_CONTROLLER_PATH = "apps/reading-advantage/server/controllers/magic-defense-controller.ts"
MD_CONTROLLER_SHA256 = "f356ad6880307f274c85d851caaa185fb69c62d808f29e83084c9d2ab6f30eff"
MD_CONTROLLER_ROUTES = (
    "apps/reading-advantage/app/api/v1/games/magic-defense/complete/route.ts",
    "apps/reading-advantage/app/api/v1/games/magic-defense/ranking/route.ts",
    "apps/reading-advantage/app/api/v1/games/magic-defense/vocabulary/route.ts",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_GIT_SHOW_CACHE: dict[tuple[str, str], bytes | None] = {}


def _git(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    """Runs one read-only git command at the repository root."""
    return subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, check=check
    )


def _git_text(*args: str, check: bool = True) -> str:
    """Returns stdout of one read-only git command as text."""
    return _git(*args, check=check).stdout.decode("utf-8", errors="replace")


def _git_show(revision: str, path: str) -> bytes | None:
    """Returns blob bytes at revision:path, or None when unresolvable."""
    key = (revision, path)
    if key not in _GIT_SHOW_CACHE:
        result = _git("show", f"{revision}:{path}", check=False)
        _GIT_SHOW_CACHE[key] = result.stdout if result.returncode == 0 else None
    return _GIT_SHOW_CACHE[key]


def _git_object_type(revision: str, path: str) -> str | None:
    """Returns the git object type at revision:path, or None."""
    result = _git("cat-file", "-t", f"{revision}:{path}", check=False)
    if result.returncode != 0:
        return None
    return result.stdout.decode().strip()


def _sha256(data: bytes) -> str:
    """Returns the hex SHA-256 of bytes."""
    return hashlib.sha256(data).hexdigest()


def _load_json(path: Path):
    """Loads one JSON file."""
    return json.loads(path.read_text(encoding="utf-8"))


def _literal(path: str) -> str:
    """Quotes a git pathspec as literal (bracket directories are glob-active)."""
    return f":(literal){path}"


_LEDGER_CACHE: dict[str, dict] = {}


def _is_fixture(claim: dict) -> bool:
    """Classifies one ledger record as a negative fixture across schemas."""
    if claim.get("negative_fixture") is True:
        return True
    if claim.get("category") in ("negative_fixture", "negative-fixture"):
        return True
    return bool(re.search(r"-NEG-\d+\Z", str(claim.get("claim_id", ""))))


def load_ledger(game: str) -> dict:
    """Loads one claim ledger, normalized across the three committed schemas.

    Returns a dict with: raw (all claim dicts), claims (non-fixture factual
    claims), fixtures (negative evidence fixtures).
    """
    if game in _LEDGER_CACHE:
        return _LEDGER_CACHE[game]
    path = TRACK_DIR / f"{game}-claim-ledger.json"
    data = _load_json(path)
    raw = data if isinstance(data, list) else list(data.get("claims", []))
    fixtures = [c for c in raw if _is_fixture(c)]
    claims = [c for c in raw if not _is_fixture(c)]
    normalized = {"raw": raw, "claims": claims, "fixtures": fixtures}
    _LEDGER_CACHE[game] = normalized
    return normalized


def fixture_disposition(fixture: dict) -> str | None:
    """Returns the expected disposition across the two committed spellings.

    CD/MD fixtures carry an explicit expected_disposition field; WVZ fixtures
    embed `expected_disposition=<VALUE>` in the interpretation text.
    """
    explicit = fixture.get("expected_disposition") or fixture.get("fixture_disposition")
    if explicit:
        return explicit
    match = re.search(r"expected_disposition=([A-Z_]+)", str(fixture.get("interpretation", "")))
    return match.group(1) if match else None


def resolve_claim_citation(claim: dict) -> tuple[bool, str]:
    """Verifies one non-fixture claim's citation against git or frozen inputs.

    Returns (ok, detail). Handles the citation classes enumerated in the
    module docstring. Never writes to the working tree.
    """
    cid = claim.get("claim_id", "<no-id>")
    file_path = claim.get("file_path")
    revision = claim.get("revision")
    range_hash = claim.get("cited_range_sha256")
    blob_hash = claim.get("blob_sha256")
    line_start = claim.get("line_start")
    line_end = claim.get("line_end")

    if file_path is None:
        if isinstance(claim.get("command"), str):
            if not isinstance(claim.get("observed_output"), str):
                return False, f"{cid}: command-output envelope missing observed_output"
            if not HEX64_RE.match(str(claim.get("output_sha256") or "")):
                return False, f"{cid}: command-output envelope has malformed output_sha256"
            return True, "command-output-envelope"
        return False, f"{cid}: factual claim without any citation"

    if not isinstance(revision, str) or not HEX40_RE.match(revision):
        return False, f"{cid}: missing or malformed revision"

    data = _git_show(revision, file_path)
    if data is None:
        object_type = _git_object_type(revision, file_path.rstrip("/"))
        if object_type == "tree" or file_path.endswith("/"):
            return False, f"{cid}: directory-level citation"
        # Frozen-manifest class: the cited artifact was authored after the
        # source baseline; verify against committed working-tree bytes.
        working = REPO_ROOT / file_path
        if working.is_file() and blob_hash and _sha256(working.read_bytes()) == blob_hash:
            return True, "frozen-manifest"
        return False, f"{cid}: unresolvable citation {revision[:8]}:{file_path}"

    if blob_hash and _sha256(data) != blob_hash:
        return False, f"{cid}: blob_sha256 mismatch at {revision[:8]}:{file_path}"

    if range_hash is None:
        return True, "blob-only"

    if line_end is None or range_hash == blob_hash:
        if _sha256(data) == range_hash:
            return True, "whole-file"
        return False, f"{cid}: whole-file hash mismatch"

    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        if _sha256(data) == range_hash:
            return True, "binary-whole-file"
        return False, f"{cid}: binary file cited with an unverifiable line range"

    lines = text.split("\n")
    if not (1 <= line_start <= line_end <= len(lines)):
        return False, f"{cid}: line range {line_start}..{line_end} outside file"
    selected = lines[line_start - 1 : line_end]
    with_newline = _sha256(("\n".join(selected) + "\n").encode("utf-8"))
    without_newline = _sha256("\n".join(selected).encode("utf-8"))
    if range_hash in (with_newline, without_newline):
        return True, "range"
    return False, f"{cid}: cited_range_sha256 mismatch at {revision[:8]}:{file_path}"


def _claim(game: str, claim_id: str) -> dict:
    """Returns one claim by id from one game's ledger."""
    for claim in load_ledger(game)["raw"]:
        if claim["claim_id"] == claim_id:
            return claim
    raise AssertionError(f"{game}: claim {claim_id} not found")


def _cited_text(claim: dict) -> str:
    """Returns the decoded text of one claim's cited range (hash-verified)."""
    ok, detail = resolve_claim_citation(claim)
    if not ok:
        raise AssertionError(f"citation does not resolve: {detail}")
    data = _git_show(claim["revision"], claim["file_path"])
    lines = data.decode("utf-8").split("\n")
    return "\n".join(lines[claim["line_start"] - 1 : claim["line_end"]])


def _blob_text(revision: str, path: str) -> str:
    """Returns the decoded whole-file text at one revision."""
    data = _git_show(revision, path)
    if data is None:
        raise AssertionError(f"missing blob {revision[:8]}:{path}")
    return data.decode("utf-8")


def _ledger_claim_ids(game: str) -> set[str]:
    """Returns all claim ids (factual and fixture) in one game's ledger."""
    return {c["claim_id"] for c in load_ledger(game)["raw"]}


def _blueprint() -> dict:
    """Loads the committed Batch A blueprint."""
    return _load_json(TRACK_DIR / "batch-a-blueprint.json")


def _structured_claim_refs(node, refs):
    """Collects every structured claim-id reference in a blueprint subtree."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "claim_id" and isinstance(value, str):
                refs.append(value)
            elif key in ("backing_claims", "evidence_basis_claims", "member_claims") and isinstance(value, list):
                refs.extend(v for v in value if isinstance(v, str))
            else:
                _structured_claim_refs(value, refs)
    elif isinstance(node, list):
        for value in node:
            _structured_claim_refs(value, refs)


def _slug_slice(records: list, game: str) -> Counter:
    """Counts records whose serialized content mentions the game variants."""
    variants = SLUG_VARIANTS[game]
    return Counter(
        r["record_type"]
        for r in records
        if any(v in json.dumps(r) for v in variants)
    )


# ---------------------------------------------------------------------------
# Class 1: denominator truth contract
# ---------------------------------------------------------------------------


class BatchADenominatorTruthContract(unittest.TestCase):
    """Binds the T1/T2/T3 predecessors and the Batch A denominator slices."""

    maxDiff = None

    def test_t1_t2_t3_predecessor_hashes_pinned(self) -> None:
        """Accepted manifests hash to the strategy's pinned values; T2 archive
        revision exists and reaches HEAD."""
        gate = _load_json(REPO_ROOT / "measure" / "evidence-integrity-accepted-gate.json")
        self.assertEqual(gate.get("gate_version"), T1_GATE_VERSION)
        self.assertEqual(gate.get("gate_commit"), T1_GATE_COMMIT)
        self.assertEqual(gate.get("status"), "accepted")
        self.assertIs(gate.get("consumable"), True)
        self.assertIs(gate.get("revoked"), False)

        denom_path = ARCHIVE_DIR / "accepted-denominator-manifest.json"
        part_path = ARCHIVE_DIR / "accepted-partition-manifest.json"
        pilot_path = PILOT_DIR / "accepted-pilot-manifest.json"
        self.assertEqual(_sha256(denom_path.read_bytes()), T2_DENOMINATOR_SHA256)
        self.assertEqual(_sha256(part_path.read_bytes()), T2_PARTITION_SHA256)
        self.assertEqual(_sha256(pilot_path.read_bytes()), T3_PILOT_SHA256)

        denom = _load_json(denom_path)
        self.assertEqual(denom.get("status"), "accepted")
        self.assertIs(denom.get("consumable"), True)
        self.assertIs(denom.get("revoked"), False)
        self.assertEqual(denom.get("source_baseline_revision"), BASELINE)

        self.assertEqual(_git_text("cat-file", "-t", T2_ARCHIVE_REVISION).strip(), "commit")
        result = _git("merge-base", "--is-ancestor", T2_ARCHIVE_REVISION, "HEAD", check=False)
        self.assertEqual(result.returncode, 0, "T2 archive revision unreachable from HEAD")

    def test_batch_a_is_exactly_the_three_current_action_defense_games(self) -> None:
        """The partition's Action-and-defense cohort is the 8-game cohort and
        Batch A is exactly Castle Defense, Magic Defense, Wizard vs Zombie."""
        partition = _load_json(ARCHIVE_DIR / "accepted-partition-manifest.json")
        cohort = {
            a["canonical_identity_label"]
            for a in partition["assignments"]
            if a["cohort"] == "Action and defense"
        }
        self.assertEqual(len(cohort), 8)
        self.assertEqual(
            set(PARTITION_LABELS.values()) <= cohort, True,
            f"Batch A labels missing from cohort: {cohort}",
        )
        blueprint = _blueprint()
        self.assertEqual(set(blueprint["games"].keys()), set(GAMES))
        for game in GAMES:
            self.assertEqual(blueprint["games"][game]["evidence_posture"], "current-source")
            self.assertEqual(blueprint["games"][game]["canonical_identity_id"], CANONICAL_IDS[game])

    def test_each_game_has_one_identity_record_in_t2_identity_ledger(self) -> None:
        """One identity record per canonical id in the accepted T2 ledger."""
        ledger = _load_json(ARCHIVE_DIR / "game-identity-ledger.json")
        records = ledger["identity_records"]
        for game in GAMES:
            canonical = CANONICAL_IDS[game]
            matches = [r for r in records if r.get("canonical_identity_id") == canonical]
            self.assertEqual(len(matches), 1, f"{game}: {len(matches)} identity records")
            aliases = {a["alias"] for a in matches[0].get("aliases", [])}
            self.assertTrue(
                any("advantage-games" in a for a in aliases),
                f"{game}: no advantage-games alias",
            )
            self.assertTrue(
                any("reading-advantage" in a for a in aliases),
                f"{game}: no reading-advantage alias",
            )

    def test_per_game_source_denominator_record_counts(self) -> None:
        """Per-game source-denominator slices match the derived pins.

        Derivation: records whose serialized content mentions the game slug or
        its camelCase lib identifier. The castle-defense slice (83: file 40,
        graph 36, copy 4, identity 1, route 2) independently matches the CD
        collector's published t2_record_reconciliation block.
        """
        source = _load_json(ARCHIVE_DIR / "source-denominator.json")
        self.assertEqual(source["source_baseline_revision"], BASELINE)
        for game in GAMES:
            with self.subTest(game=game):
                counts = _slug_slice(source["records"], game)
                self.assertEqual(dict(counts), SOURCE_DENOMINATOR_COUNTS[game])
                self.assertEqual(sum(counts.values()), sum(SOURCE_DENOMINATOR_COUNTS[game].values()))
                self.assertEqual(counts["identity"], 1)

    def test_zero_phase3_blocking_records(self) -> None:
        """Phase-3 reconciliation is complete with zero blocking records."""
        reconciliation = _load_json(ARCHIVE_DIR / "phase3-reconciliation.json")
        self.assertEqual(reconciliation["status"], "reconciliation-complete")
        self.assertEqual(reconciliation["unresolved_sources"], [])
        for game in GAMES:
            with self.subTest(game=game):
                total = 0
                blocking = 0
                variants = SLUG_VARIANTS[game]
                for value in reconciliation.values():
                    if isinstance(value, list) and value and isinstance(value[0], dict):
                        subset = [
                            r for r in value
                            if any(v in json.dumps(r) for v in variants)
                        ]
                        total += len(subset)
                        blocking += sum(1 for r in subset if r.get("blocking"))
                self.assertEqual(total, PHASE3_TOTALS[game], f"{game}: phase-3 record total")
                self.assertEqual(blocking, 0, f"{game}: blocking phase-3 records")

    def test_pytest_discovery_yields_at_least_28_tests(self) -> None:
        """This module discovers at least 28 tests (strategy section 4.1)."""
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
        result = subprocess.run(
            [
                sys.executable, "-m", "pytest", "--collect-only", "-q",
                "-p", "no:cacheprovider", MODULE_PATH,
            ],
            cwd=REPO_ROOT, capture_output=True, text=True, env=env, timeout=300,
        )
        self.assertEqual(result.returncode, 0, result.stdout[-1500:] + result.stderr[-800:])
        match = re.search(r"(\d+) tests? collected", result.stdout)
        self.assertIsNotNone(match, result.stdout[-800:])
        self.assertGreaterEqual(int(match.group(1)), 28)


# ---------------------------------------------------------------------------
# Class 2: claim-ledger truth contract
# ---------------------------------------------------------------------------


class BatchAClaimLedgerTruthContract(unittest.TestCase):
    """Validates every committed claim against its cited git revision."""

    maxDiff = None

    def _assert_citations_resolve(self, game: str, expected_count: int) -> None:
        ledger = load_ledger(game)
        failures = []
        classes = Counter()
        for claim in ledger["claims"]:
            ok, detail = resolve_claim_citation(claim)
            if ok:
                classes[detail] += 1
            else:
                failures.append(detail)
        self.assertEqual(
            failures, [],
            f"{game}: {len(failures)} unresolvable citations "
            f"(gate G-CL RED): {failures}",
        )
        self.assertEqual(
            sum(classes.values()), expected_count,
            f"{game}: resolved {sum(classes.values())} != {expected_count} ({dict(classes)})",
        )

    def _assert_schema(self, game: str) -> None:
        ledger = load_ledger(game)
        for claim in ledger["raw"]:
            cid = claim["claim_id"]
            with self.subTest(game=game, claim=cid):
                self.assertIn(
                    claim.get("confidence"), CONFIDENCE_VALUES,
                    f"{cid}: bad confidence {claim.get('confidence')!r}",
                )
                self.assertIn(
                    claim.get("category"), ALLOWED_CATEGORIES[game],
                    f"{cid}: bad category {claim.get('category')!r}",
                )
                self.assertEqual(
                    claim.get("collector_agent"), COLLECTOR_AGENTS[game],
                    f"{cid}: bad collector_agent {claim.get('collector_agent')!r}",
                )
                self.assertEqual(claim.get("game"), game, f"{cid}: game field mismatch")

    def _assert_counts_match_report(self, game: str) -> None:
        ledger = load_ledger(game)
        report = _load_json(TRACK_DIR / f"{game}-evidence-final-report.json")
        # Labeled integers (A3): the report's claims_total must be an int that
        # equals the ledger length, not a bare digit substring.
        self.assertIsInstance(report.get("claims_total"), int)
        self.assertEqual(report["claims_total"], len(ledger["raw"]))
        self.assertEqual(report["claims_total"], CLAIM_TOTALS[game])
        counts = Counter(c["category"] for c in ledger["raw"])
        self.assertEqual(dict(counts), report["claims_by_category"])
        report_fixtures = {f["claim_id"] for f in report["negative_fixtures"]}
        self.assertEqual(report_fixtures, FIXTURE_IDS[game])
        self.assertEqual(len(ledger["fixtures"]), len(FIXTURE_IDS[game]))
        self.assertEqual(
            len(ledger["claims"]), CLAIM_TOTALS[game] - len(FIXTURE_IDS[game]),
        )

    def _assert_fixtures_present(self, game: str) -> None:
        fixtures = {c["claim_id"]: c for c in load_ledger(game)["fixtures"]}
        self.assertEqual(set(fixtures), FIXTURE_IDS[game])
        for cid, fixture in fixtures.items():
            with self.subTest(game=game, fixture=cid):
                disposition = fixture_disposition(fixture)
                self.assertIn(
                    disposition, FAIL_DISPOSITIONS | REJECT_DISPOSITIONS,
                    f"{cid}: bad disposition {disposition!r}",
                )

    def test_castle_defense_claim_citations_resolve_against_git_revisions(self) -> None:
        self._assert_citations_resolve("castle-defense", 136)

    def test_magic_defense_claim_citations_resolve_against_git_revisions(self) -> None:
        self._assert_citations_resolve("magic-defense", 105)

    def test_wizard_vs_zombie_claim_citations_resolve_against_git_revisions(self) -> None:
        self._assert_citations_resolve("wizard-vs-zombie", 73)

    def test_castle_defense_claim_schema_confidence_categories_and_collector(self) -> None:
        self._assert_schema("castle-defense")

    def test_magic_defense_claim_schema_confidence_categories_and_collector(self) -> None:
        self._assert_schema("magic-defense")

    def test_wizard_vs_zombie_claim_schema_confidence_categories_and_collector(self) -> None:
        self._assert_schema("wizard-vs-zombie")

    def test_castle_defense_negative_fixtures_present_with_expected_dispositions(self) -> None:
        self._assert_fixtures_present("castle-defense")

    def test_magic_defense_negative_fixtures_present_with_expected_dispositions(self) -> None:
        self._assert_fixtures_present("magic-defense")

    def test_wizard_vs_zombie_negative_fixtures_present_with_expected_dispositions(self) -> None:
        self._assert_fixtures_present("wizard-vs-zombie")

    def test_castle_defense_claim_counts_match_collector_report(self) -> None:
        self._assert_counts_match_report("castle-defense")

    def test_magic_defense_claim_counts_match_collector_report(self) -> None:
        self._assert_counts_match_report("magic-defense")

    def test_wizard_vs_zombie_claim_counts_match_collector_report(self) -> None:
        self._assert_counts_match_report("wizard-vs-zombie")


# ---------------------------------------------------------------------------
# Class 3: blueprint truth contract
# ---------------------------------------------------------------------------


class BatchABlueprintTruthContract(unittest.TestCase):
    """Validates the mapper blueprint against the committed ledgers."""

    maxDiff = None

    @classmethod
    def setUpClass(cls) -> None:
        cls.blueprint = _blueprint()
        cls.ledger_ids = {game: _ledger_claim_ids(game) for game in GAMES}

    def _assert_backing_resolves(self, game: str, entry: dict, label: str) -> None:
        backing = entry.get("backing") or []
        self.assertTrue(backing, f"{game}/{label}: entry has no backing")
        for ref in backing:
            self.assertIn(
                ref.get("claim_id"), self.ledger_ids[game],
                f"{game}/{label}: unresolved backing claim {ref.get('claim_id')!r}",
            )

    def test_scene_state_transition_entries_backed_by_resolvable_claims(self) -> None:
        for game in GAMES:
            scene_state = self.blueprint["games"][game]["A_scene_state_blueprint"]
            for scene in scene_state["scenes"]:
                self._assert_backing_resolves(game, scene, scene.get("scene_id", "?"))
            for state in scene_state["states"]:
                label = state.get("state_id") or state.get("state_family") or "?"
                self._assert_backing_resolves(game, state, label)
                for claim_id in state.get("member_claims") or []:
                    self.assertIn(
                        claim_id, self.ledger_ids[game],
                        f"{game}/{label}: unresolved member claim {claim_id!r}",
                    )
            for transition in scene_state["transitions"]:
                # transition_id values (CD-T-*/MD-T-*/WVZ-T-*) are exempt
                # stable record ids; their backing must resolve to real claims.
                self._assert_backing_resolves(game, transition, transition.get("transition_id", "?"))

    def test_mechanic_control_learning_terminal_entries_backed(self) -> None:
        for game in GAMES:
            mechanics = self.blueprint["games"][game]["B_mechanic_learning_blueprint"]
            containers = list(mechanics["mechanics"]) + list(mechanics["control_surfaces"])
            containers += list(mechanics.get("learning_goals") or [])
            terminal = mechanics.get("terminal_result_mechanic")
            if terminal:
                containers.append(terminal)
            for entry in containers:
                label = (
                    entry.get("mechanic_id") or entry.get("control_id")
                    or entry.get("goal_id") or "terminal"
                )
                backing = entry.get("backing_claims") or []
                self.assertTrue(backing, f"{game}/{label}: entry without backing_claims")
                for claim_id in backing:
                    self.assertIn(
                        claim_id, self.ledger_ids[game],
                        f"{game}/{label}: unresolved backing claim {claim_id!r}",
                    )
                for knob in entry.get("tuning_knobs") or []:
                    self.assertTrue(
                        knob.get("backing_claims"),
                        f"{game}/{label}: tuning knob {knob.get('name')!r} without backing",
                    )
                    for claim_id in knob["backing_claims"]:
                        self.assertIn(
                            claim_id, self.ledger_ids[game],
                            f"{game}/{label}: unresolved knob claim {claim_id!r}",
                        )

    def test_every_structured_claim_reference_in_blueprint_resolves(self) -> None:
        unresolved = []
        total = 0
        unique = set()
        for game in GAMES:
            refs: list[str] = []
            _structured_claim_refs(self.blueprint["games"][game], refs)
            total += len(refs)
            unique.update(refs)
            unresolved.extend(r for r in refs if r not in self.ledger_ids[game])
        self.assertGreater(total, 0)
        self.assertEqual(unresolved, [], f"{len(unresolved)} unresolved refs: {unresolved[:10]}")
        # Cross-check with the mapper report's mechanical walk: 303 regex
        # claim-id-shaped tokens in the file, 21 of which are exempt stable
        # transition record ids, leaving 282 unique ledger claim references.
        blueprint_text = (TRACK_DIR / "batch-a-blueprint.json").read_text(encoding="utf-8")
        regex_ids = set(CLAIM_ID_RE.findall(blueprint_text))
        transition_ids = {i for i in regex_ids if TRANSITION_RECORD_ID_RE.match(i)}
        ledger_refs = regex_ids - transition_ids
        self.assertEqual(len(regex_ids), 303)
        self.assertEqual(len(transition_ids), 21)
        self.assertEqual(len(ledger_refs), 282)
        all_ids = set().union(*self.ledger_ids.values())
        self.assertEqual(ledger_refs - all_ids, set())
        report = _load_json(TRACK_DIR / "mapper-final-report-batch-a.json")
        validation = report["claim_reference_validation"]
        self.assertEqual(validation["structured_claim_ids_referenced"], 282)
        self.assertEqual(validation["unresolved_references"], 0)
        self.assertEqual(validation["hypothesis_ids_cited_as_fact"], 0)
        self.assertEqual(validation["cross_game_claim_prefix_leaks"], 0)

    def test_blueprint_contains_no_hypothesis_citations_as_fact(self) -> None:
        for game in GAMES:
            refs: list[str] = []
            _structured_claim_refs(self.blueprint["games"][game], refs)
            offenders = [r for r in refs if HYPOTHESIS_ID_RE.search(r)]
            self.assertEqual(offenders, [], f"{game}: hypothesis ids cited as fact: {offenders}")
        serialized_games = json.dumps(self.blueprint["games"])
        self.assertNotIn("NON-AUTHORITATIVE HYPOTHESIS", serialized_games)
        # Zero H1..H7 tokens anywhere in the games section (verified empty).
        self.assertEqual(HYPOTHESIS_ID_RE.findall(serialized_games), [])
        declaration = self.blueprint["mapper_boundary_declaration"]
        pointer = declaration["cross_game_similarity_findings"]
        self.assertTrue(pointer.startswith("none"), pointer)
        self.assertIn("mapper-hypotheses-batch-a.md", pointer)
        self.assertIn("NON-AUTHORITATIVE HYPOTHES", pointer)
        self.assertEqual(declaration["novel_factual_claims_added"], 0)

    def test_hypotheses_segregated_in_flagged_companion_artifact(self) -> None:
        path = TRACK_DIR / "mapper-hypotheses-batch-a.md"
        self.assertTrue(path.is_file(), "mapper-hypotheses-batch-a.md missing")
        text = path.read_text(encoding="utf-8")
        self.assertIn("NON-AUTHORITATIVE HYPOTHESIS", text.splitlines()[3])
        entries = re.findall(r"^## H([1-9]) —", text, flags=re.MULTILINE)
        self.assertEqual(entries, ["1", "2", "3", "4", "5", "6", "7"])
        self.assertIn("Count: 7 NON-AUTHORITATIVE HYPOTHESIS entries.", text)
        all_ids = set().union(*self.ledger_ids.values())
        mentioned = set(CLAIM_ID_RE.findall(text))
        unresolved = mentioned - all_ids
        self.assertEqual(unresolved, set(), f"hypotheses cite unknown claims: {unresolved}")
        report = _load_json(TRACK_DIR / "mapper-final-report-batch-a.json")
        self.assertEqual(report["non_authoritative_hypotheses_authored"], 7)

    def test_blueprint_counts_match_mapper_final_report(self) -> None:
        report = _load_json(TRACK_DIR / "mapper-final-report-batch-a.json")
        expected = report["per_game_counts"]
        for game in GAMES:
            with self.subTest(game=game):
                section = self.blueprint["games"][game]
                scene_state = section["A_scene_state_blueprint"]
                mechanics = section["B_mechanic_learning_blueprint"]
                self.assertEqual(len(scene_state["scenes"]), expected[game]["scenes"])
                self.assertEqual(len(scene_state["states"]), expected[game]["state_entries"])
                self.assertEqual(len(scene_state["transitions"]), expected[game]["transitions"])
                # Count convention (mapper report): mechanic_entries =
                # mechanics + control_surfaces.
                mechanic_entries = len(mechanics["mechanics"]) + len(mechanics["control_surfaces"])
                self.assertEqual(mechanic_entries, expected[game]["mechanic_entries"])
                # asset_usage_entries = D_asset_usage_map + D non-scene surfaces.
                asset_entries = (
                    len(section["D_asset_usage_map"])
                    + len(section["D_asset_usage_non_scene_surfaces"])
                )
                self.assertEqual(asset_entries, expected[game]["asset_usage_entries"])
                test_modules = len(section["C_developer_effort_decomposition"]["test_modules"])
                self.assertEqual(test_modules, expected[game]["test_modules"])

    def test_asset_usage_maps_present_and_backed_for_every_game(self) -> None:
        """R-ALL-8: per-game asset-usage map is required for Batch A acceptance."""
        for game in GAMES:
            with self.subTest(game=game):
                section = self.blueprint["games"][game]
                usage_map = section["D_asset_usage_map"]
                non_scene = section["D_asset_usage_non_scene_surfaces"]
                self.assertTrue(usage_map, f"{game}: D_asset_usage_map empty")
                self.assertTrue(non_scene, f"{game}: D_asset_usage_non_scene_surfaces empty")
                for entry in usage_map:
                    refs = entry.get("asset_refs") or []
                    if not refs:
                        # Explicit zero-usage marker: the entry itself must
                        # carry backing_claims and a note.
                        self.assertTrue(
                            entry.get("backing_claims"),
                            f"{game}: zero-usage entry {entry.get('scene_id')!r} "
                            "without entry-level backing_claims",
                        )
                        self.assertTrue(
                            entry.get("note"),
                            f"{game}: zero-usage entry {entry.get('scene_id')!r} without a note",
                        )
                        for claim_id in entry["backing_claims"]:
                            self.assertIn(
                                claim_id, self.ledger_ids[game],
                                f"{game}: unresolved zero-usage backing {claim_id!r}",
                            )
                        continue
                    for ref in refs:
                        backing = ref.get("backing_claims") or []
                        self.assertTrue(
                            backing,
                            f"{game}: asset ref {ref.get('asset_ref')!r} without backing_claims",
                        )
                        for claim_id in backing:
                            self.assertIn(
                                claim_id, self.ledger_ids[game],
                                f"{game}: unresolved asset backing {claim_id!r}",
                            )
                for surface in non_scene:
                    backing = surface.get("backing_claims") or []
                    self.assertTrue(
                        backing,
                        f"{game}: non-scene surface {surface.get('surface')!r} without backing_claims",
                    )
                    for claim_id in backing:
                        self.assertIn(
                            claim_id, self.ledger_ids[game],
                            f"{game}: unresolved non-scene backing {claim_id!r}",
                        )

    def test_controlled_inclusion_source_fixture_slo_md_1(self) -> None:
        """controlled-inclusion-source: the three in-denominator RA routes
        empirically import magic-defense-controller.ts at the baseline.

        This verifies an import relationship only; it is independent of T2
        denominator acceptance (SLO-MD-1 is resolved ACCEPT-AS-CONDITIONAL by
        stop-loss-resolutions-batch-a.md and recorded as hypothesis H6, not as
        a mapper finding).
        """
        for route_path in MD_CONTROLLER_ROUTES:
            with self.subTest(route=route_path):
                text = _blob_text(BASELINE, route_path)
                self.assertIn("@/server/controllers/magic-defense-controller", text)
                self.assertIn("MagicDefenseController", text)
        # The H6 controlled-inclusion record names the file and its sha256.
        hypotheses = (TRACK_DIR / "mapper-hypotheses-batch-a.md").read_text(encoding="utf-8")
        h6 = hypotheses[hypotheses.index("## H6"):]
        h6 = h6[: h6.index("## H7")]
        self.assertIn(MD_CONTROLLER_PATH, h6)
        self.assertIn(MD_CONTROLLER_SHA256, h6)
        self.assertIn("controlled inclusion", h6.lower())
        # The ledger route-wiring claims resolve against the baseline.
        for claim_id in ("MD-ID-012", "MD-ID-013", "MD-ID-014"):
            ok, detail = resolve_claim_citation(_claim("magic-defense", claim_id))
            self.assertTrue(ok, detail)
        # The resolutions document records the conditional disposition.
        resolutions = (TRACK_DIR / "stop-loss-resolutions-batch-a.md").read_text(encoding="utf-8")
        self.assertIn("SLO-MD-1", resolutions)
        self.assertIn("ACCEPT-AS-CONDITIONAL", resolutions)


# ---------------------------------------------------------------------------
# Class 4: action/defense subject contract
# ---------------------------------------------------------------------------


class BatchAActionDefenseSpecificContract(unittest.TestCase):
    """Re-derives Batch A action/defense subject matter from cited source."""

    maxDiff = None

    def test_castle_defense_wave_table_targeting_health_and_terminal(self) -> None:
        """CD: 6-wave composition, closest-in-range targeting, base-HP
        discipline, physical word collection, terminal behavior."""
        # Wave table: WAVE_CONFIGS holds exactly six wave configurations.
        wave_claim = _claim("castle-defense", "CD-MECH-005")
        wave_text = _cited_text(wave_claim)
        self.assertIn("WAVE_CONFIGS", wave_text)
        rows = re.findall(
            r"\{ wave: (\d), soldiers: (\d+), tanks: (\d+), bosses: (\d+) \}", wave_text
        )
        self.assertEqual(
            rows,
            [
                ("1", "10", "0", "0"),
                ("2", "8", "4", "0"),
                ("3", "10", "5", "1"),
                ("4", "12", "8", "1"),
                ("5", "15", "10", "2"),
                ("6", "20", "12", "3"),
            ],
        )
        # Defense-zone health: base HP 150 easy / 100 medium (default) / 80 hard.
        hp_claim = _claim("castle-defense", "CD-MECH-010")
        hp_text = _cited_text(hp_claim)
        self.assertIn('if (options.difficulty === "easy") baseHp = 150;', hp_text)
        self.assertIn('if (options.difficulty === "hard") baseHp = 80;', hp_text)
        lib_text = _blob_text(BASELINE, hp_claim["file_path"])
        self.assertIn("export const BASE_HP = 100;", lib_text)
        # Targeting: active towers fire at the closest enemy within range.
        targeting = _cited_text(_claim("castle-defense", "CD-MECH-025"))
        self.assertIn("Find closest enemy in range", targeting)
        self.assertIn("inRange(tower.x, tower.y, enemy.x, enemy.y, tower.range)", targeting)
        self.assertIn("closestEnemy", targeting)
        # Terminal behavior: gameover on base HP <= 0; victory on final wave.
        gameover_claim = _claim("castle-defense", "CD-MECH-032")
        self.assertIn("gameover", _cited_text(gameover_claim))
        victory_text = _cited_text(_claim("castle-defense", "CD-MECH-031"))
        self.assertIn("victory", victory_text)
        # Physical collection (no typed answer): word index must equal the
        # number of already collected words.
        collect_text = _cited_text(_claim("castle-defense", "CD-MECH-018"))
        self.assertIn("collected", collect_text.lower())
        no_typed = _claim("castle-defense", "CD-MECH-038")
        ok, detail = resolve_claim_citation(no_typed)
        self.assertTrue(ok, detail)
        component_text = _blob_text(BASELINE, no_typed["file_path"])
        self.assertNotIn("checkAnswer", component_text)
        self.assertNotIn("InputController", component_text)

    def test_magic_defense_breach_typed_answer_castle_health(self) -> None:
        """MD: breach escalation, nearest-alive-castle targeting, typed-answer
        input model, 3-castle HP discipline, projectile behavior."""
        # Breach escalation: a reached missile raises spawn rate (cap 3000ms)
        # and duration (cap 15s), resets combo, and damages the nearest alive
        # castle.
        breach_text = _cited_text(_claim("magic-defense", "MD-MECH-009"))
        self.assertIn("SCALING_CONFIG.spawnRateLimit", breach_text)
        self.assertIn("SCALING_CONFIG.durationLimit", breach_text)
        self.assertIn("resetCombo()", breach_text)
        self.assertIn("damageCastle(getNearestAliveCastleId(target.targetX, castles))", breach_text)
        # Targeting: nearest alive castle by x position.
        nearest_text = _cited_text(_claim("magic-defense", "MD-MECH-021"))
        self.assertIn("entries.reduce((closest, [castleId, position])", nearest_text)
        self.assertIn("currentDistance < closestDistance", nearest_text)
        # Defense-zone health: MAX_CASTLE_HP = 3 with three castles.
        store_text = _blob_text(BASELINE, "apps/advantage-games/src/store/useGameStore.ts")
        self.assertIn("export const MAX_CASTLE_HP = 3", store_text)
        self.assertIn("left: MAX_CASTLE_HP,", store_text)
        self.assertIn("center: MAX_CASTLE_HP,", store_text)
        self.assertIn("right: MAX_CASTLE_HP,", store_text)
        # Typed-answer input model (semantic re-derivation from the
        # hash-pinned blob; the claim's prose line anchor is drifted -- see
        # module docstring).
        typed_claim = _claim("magic-defense", "MD-MECH-008")
        ok, detail = resolve_claim_citation(typed_claim)
        self.assertTrue(ok, detail)
        engine_text = _blob_text(BASELINE, typed_claim["file_path"])
        self.assertIn("m.translation.toLowerCase() === answer.toLowerCase()", engine_text)
        self.assertIn("<InputController onSubmit={checkAnswer} mobile />", engine_text)
        # Projectile behavior: a correct answer spawns a MagicBolt from a
        # random alive castle.
        bolt_claim = _claim("magic-defense", "MD-MECH-017")
        ok, detail = resolve_claim_citation(bolt_claim)
        self.assertTrue(ok, detail)
        self.assertIn("getRandomAliveCastleId", engine_text)
        # Terminal behavior: game-over when all three castles reach 0. The
        # cited range covers the damageCastle reducer body (HP clamp at 0 and
        # the all-destroyed predicate); the status assignment itself sits one
        # line past the cited range and is re-derived from the pinned blob.
        transition_text = _cited_text(_claim("magic-defense", "MD-TRANS-002"))
        self.assertIn("Math.max(state.castles[castleId] - 1, 0)", transition_text)
        self.assertIn("Object.values(nextCastles).every((hp) => hp <= 0)", transition_text)
        self.assertIn("status: allDestroyed ? 'game-over' : state.status", store_text)

    def test_wizard_vs_zombie_gate_spawning_orbs_and_player_health(self) -> None:
        """WVZ: four-gate spawning, quadrant orb layout (1 correct + 3 decoys),
        player-HP discipline, physical orb collection, terminal behavior."""
        # Gate spawning: one zombie per spawn tick (cap 50) from one of four
        # off-screen gates (N/S/W/E), damage=10.
        spawn_text = _cited_text(_claim("wizard-vs-zombie", "WVZ-MECH-006"))
        self.assertIn("BASE_SPAWN_RATE_MS * modifiers.spawnRate", spawn_text)
        self.assertIn("zombies.length < 50", spawn_text)
        self.assertIn("const gateIndex = Math.floor(Math.random() * 4);", spawn_text)
        for marker in ("// N", "// S", "// W", "// E"):
            self.assertIn(marker, spawn_text)
        self.assertIn("damage: 10", spawn_text)
        # Orb layout: exactly four orbs across NW/NE/SW/SE quadrants.
        orb_text = _cited_text(_claim("wizard-vs-zombie", "WVZ-MECH-007"))
        for marker in ("// NW", "// NE", "// SW", "// SE"):
            self.assertIn(marker, orb_text)
        self.assertIn("isCorrect", orb_text)
        # Player-HP discipline and physical collection: correct orb grants
        # +10 HP capped at maxHp; zombie contact subtracts zombie.damage;
        # hp <= 0 sets gameover.
        collision_text = _cited_text(_claim("wizard-vs-zombie", "WVZ-MECH-005"))
        self.assertIn("hp: Math.min(player.maxHp, player.hp + 10),", collision_text)
        self.assertIn("hp: Math.max(0, player.hp - zombie.damage),", collision_text)
        self.assertIn('if (player.hp <= 0) {', collision_text)
        self.assertIn('status = "gameover";', collision_text)
        # Health constants: INITIAL_HP = 100.
        constants_text = _cited_text(_claim("wizard-vs-zombie", "WVZ-MECH-001"))
        self.assertIn("export const INITIAL_HP = 100;", constants_text)
        # Terminal union: "playing" | "gameover".
        status_text = _cited_text(_claim("wizard-vs-zombie", "WVZ-STT-003"))
        self.assertIn('"playing" | "gameover"', status_text)

    def test_no_fabricated_aoe_language(self) -> None:
        """Mirror of the pilot's no-mana check: no AOE/area-of-effect language
        is fabricated into Batch A claims or present in the cited sources."""
        aoe_re = re.compile(r"area[- ]of[- ]effect|\bAOE\b", re.IGNORECASE)
        for game in GAMES:
            for claim in load_ledger(game)["raw"]:
                self.assertIsNone(
                    aoe_re.search(claim.get("claim_text", "")),
                    f"{claim['claim_id']}: AOE language in claim text",
                )
        paths = [
            "apps/advantage-games/src/lib/games/castleDefense.ts",
            "apps/advantage-games/src/components/games/sentence/castle-defense/CastleDefenseGame.tsx",
            "apps/advantage-games/src/components/games/game/GameEngine.tsx",
            "apps/advantage-games/src/lib/games/magicDefenseConfig.ts",
            "apps/advantage-games/src/store/useGameStore.ts",
            "apps/advantage-games/src/lib/games/wizardZombie.ts",
            "apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx",
        ]
        for path in paths:
            with self.subTest(path=path):
                text = _blob_text(BASELINE, path)
                self.assertIsNone(aoe_re.search(text), f"AOE language in {path}")


# ---------------------------------------------------------------------------
# Class 5: negative-fixture contract
# ---------------------------------------------------------------------------


class BatchANegativeFixtureContract(unittest.TestCase):
    """Re-derives every negative fixture's expected disposition from source."""

    maxDiff = None

    def test_all_12_fixtures_carry_expected_disposition(self) -> None:
        total = 0
        for game in GAMES:
            for fixture in load_ledger(game)["fixtures"]:
                total += 1
                disposition = fixture_disposition(fixture)
                self.assertIn(
                    disposition, FAIL_DISPOSITIONS | REJECT_DISPOSITIONS,
                    f"{fixture['claim_id']}: bad disposition {disposition!r}",
                )
        self.assertEqual(total, 12)

    def test_castle_defense_fixtures_rederive_reject(self) -> None:
        fixtures = {c["claim_id"]: c for c in load_ledger("castle-defense")["fixtures"]}
        # CD-NEG-001: uncited XP-multiplier injection -> REJECT. Falsity:
        # neither the canonical nor the RA lib contains a difficulty XP
        # multiplier.
        injection = fixtures["CD-NEG-001"]
        self.assertIsNone(injection.get("file_path"))
        self.assertIsNone(injection.get("cited_range_sha256"))
        self.assertIsNone(injection.get("blob_sha256"))
        self.assertIn(fixture_disposition(injection), REJECT_DISPOSITIONS)
        for lib_path in (
            "apps/advantage-games/src/lib/games/castleDefense.ts",
            "apps/reading-advantage/lib/games/castleDefense.ts",
        ):
            text = _blob_text(BASELINE, lib_path)
            self.assertIsNone(
                re.search(r"multiplier", text, re.IGNORECASE),
                f"unexpected multiplier in {lib_path}",
            )
        # CD-NEG-002: generic-template substitution -> REJECT. The cited range
        # is the six-row WAVE_CONFIGS table, which contradicts the fixture's
        # "one enemy type, one map, one tower" premise.
        template = fixtures["CD-NEG-002"]
        cited = _cited_text(template)
        self.assertEqual(cited.count("{ wave:"), 6)
        lib_text = _blob_text(BASELINE, template["file_path"])
        self.assertIn("MAP_CONFIGS", lib_text)
        self.assertIn(fixture_disposition(template), REJECT_DISPOSITIONS)
        # CD-NEG-003: keyword-only responsive -> REJECT. The cited component
        # carries real responsive machinery (ResizeObserver + measured
        # dimensions), so md:/h-[...] keyword presence alone is not evidence.
        responsive = fixtures["CD-NEG-003"]
        ok, detail = resolve_claim_citation(responsive)
        self.assertTrue(ok, detail)
        component_text = _blob_text(BASELINE, responsive["file_path"])
        self.assertIn("ResizeObserver", component_text)
        self.assertIn(fixture_disposition(responsive), REJECT_DISPOSITIONS)

    def test_md_neg_001_rederives_fail_with_real_citation(self) -> None:
        """MD-NEG-001: FAIL with REAL citation. The cited controller range
        48-60 contains no multiplier branch; the hash-pinned blob computes
        xpEarned = Math.floor(correctAnswers * accuracy) (lines 45-46) and
        uses difficulty only as persisted data, never as an XP factor."""
        fixture = _claim("magic-defense", "MD-NEG-001")
        self.assertEqual(fixture_disposition(fixture), "FAIL")
        cited = _cited_text(fixture)
        self.assertIsNone(
            re.search(r"xpEarned\s*=\s*[^;]*\*[^;]*difficulty|difficulty\s*\*", cited),
            "cited range unexpectedly contains a difficulty multiplier",
        )
        blob = _blob_text(BASELINE, fixture["file_path"])
        self.assertIn("const xpEarned = Math.floor(correctAnswers * accuracy);", blob)
        self.assertIsNone(
            re.search(r"xpEarned\s*=\s*[^;\n]*difficulty", blob),
            "xpEarned assignment unexpectedly involves difficulty",
        )
        self.assertIsNone(
            re.search(r"xpEarned\s*\*|\*\s*xpEarned", blob),
            "xpEarned unexpectedly scaled by a multiplier",
        )

    def test_magic_defense_reject_fixtures_rederive(self) -> None:
        fixtures = {c["claim_id"]: c for c in load_ledger("magic-defense")["fixtures"]}
        # MD-NEG-002: no _shared/defense-template.tsx exists at baseline.
        listing = _git_text(
            "ls-tree", "-r", "--name-only", BASELINE, check=True,
        )
        self.assertNotIn("defense-template", listing)
        self.assertIn(fixture_disposition(fixtures["MD-NEG-002"]), REJECT_DISPOSITIONS)
        # MD-NEG-003: matchMedia substring absent from every MD/shared file.
        matchmedia_fixture = fixtures["MD-NEG-003"]
        ok, detail = resolve_claim_citation(matchmedia_fixture)
        self.assertTrue(ok, detail)
        for path in (
            "apps/advantage-games/src/components/games/game/GameEngine.tsx",
            "apps/advantage-games/src/lib/games/magicDefenseConfig.ts",
            "apps/advantage-games/src/components/games/game/GameContainer.tsx",
            "apps/advantage-games/src/components/games/game/StartScreen.tsx",
            "apps/advantage-games/src/components/games/game/ResultsScreen.tsx",
            "apps/advantage-games/src/components/games/game/HUD.tsx",
            "apps/advantage-games/src/components/games/game/InputController.tsx",
            "apps/advantage-games/src/components/games/game/MagicBolt.tsx",
            "apps/advantage-games/src/components/games/game/Explosion.tsx",
            "apps/advantage-games/src/components/games/game/RankingDialog.tsx",
            "apps/advantage-games/src/store/useGameStore.ts",
        ):
            self.assertNotIn("matchMedia", _blob_text(BASELINE, path), path)
        self.assertIn(fixture_disposition(matchmedia_fixture), REJECT_DISPOSITIONS)
        # MD-NEG-004: directory-only citation is a validation failure
        # regardless of the statement's truth value.
        directory = fixtures["MD-NEG-004"]
        self.assertTrue(directory["file_path"].endswith("/"))
        self.assertIsNone(directory.get("line_start"))
        self.assertIsNone(directory.get("cited_range_sha256"))
        self.assertIsNone(directory.get("blob_sha256"))
        self.assertIn(fixture_disposition(directory), REJECT_DISPOSITIONS)
        # MD-NEG-005: fabricated Redis claim; the controller uses Postgres
        # gameRankings with onConflictDoUpdate and contains no Redis
        # identifiers.
        redis_fixture = fixtures["MD-NEG-005"]
        controller = _blob_text(BASELINE, MD_CONTROLLER_PATH)
        self.assertIsNone(re.search(r"redis|zadd|sorted.set|sorted-set", controller, re.IGNORECASE))
        self.assertIn("gameRankings", controller)
        self.assertIn("onConflictDoUpdate", controller)
        self.assertIn(fixture_disposition(redis_fixture), REJECT_DISPOSITIONS)

    def test_wizard_vs_zombie_fixtures_rederive(self) -> None:
        fixtures = {c["claim_id"]: c for c in load_ledger("wizard-vs-zombie")["fixtures"]}
        # WVZ-NEG-001: XP-multiplier injection -> REJECT. The completion route
        # is the 6-line factory POST; no multiplier field exists.
        injection = fixtures["WVZ-NEG-001"]
        cited = _cited_text(injection)
        self.assertIn("createCompleteRoute()", cited)
        self.assertNotIn("multiplier", cited.lower())
        self.assertIn(fixture_disposition(injection), REJECT_DISPOSITIONS)
        # WVZ-NEG-002: generic defense-template substitution -> REJECT. The
        # 745-line bespoke component imports no _shared/defense-template.
        template = fixtures["WVZ-NEG-002"]
        ok, detail = resolve_claim_citation(template)
        self.assertTrue(ok, detail)
        component_text = _blob_text(BASELINE, template["file_path"])
        self.assertNotIn("defense-template", component_text)
        self.assertNotIn("_shared", component_text)
        self.assertIn(fixture_disposition(template), REJECT_DISPOSITIONS)
        # WVZ-NEG-003: matchMedia substring absent from the WVZ source set.
        matchmedia_fixture = fixtures["WVZ-NEG-003"]
        ok, detail = resolve_claim_citation(matchmedia_fixture)
        self.assertTrue(ok, detail)
        for path in (
            "apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx",
            "apps/advantage-games/src/lib/games/wizardZombie.ts",
            "apps/advantage-games/src/lib/games/wizardZombieIndicators.ts",
        ):
            self.assertNotIn("matchMedia", _blob_text(BASELINE, path), path)
        self.assertIn(fixture_disposition(matchmedia_fixture), REJECT_DISPOSITIONS)
        # WVZ-NEG-004: withdrawn-id membership -> REJECT. The cited
        # withdrawnApkGameIds set (baseline lines 12-27) does not contain
        # wizard-vs-zombie, and the catalog card at line 68 is playable.
        withdrawn = fixtures["WVZ-NEG-004"]
        cited = _cited_text(withdrawn)
        self.assertIn("withdrawnApkGameIds", cited)
        self.assertNotIn("wizard-vs-zombie", cited)
        cards_text = _blob_text(BASELINE, withdrawn["file_path"])
        card_block = cards_text[cards_text.index("id: 'wizard-vs-zombie'"):]
        card_block = card_block[: card_block.index("},")]
        self.assertIn("status: 'playable'", card_block)
        self.assertIn(fixture_disposition(withdrawn), REJECT_DISPOSITIONS)

    def test_no_fixture_promoted_to_accepted_claim(self) -> None:
        """R-WVZ-2 and class rule: fixture ids never appear as blueprint fact."""
        blueprint = _blueprint()
        fixture_ids = set().union(*FIXTURE_IDS.values())
        for game in GAMES:
            refs: list[str] = []
            _structured_claim_refs(blueprint["games"][game], refs)
            promoted = [r for r in refs if r in fixture_ids]
            self.assertEqual(promoted, [], f"{game}: fixtures cited as fact: {promoted}")
        serialized = json.dumps(blueprint["games"])
        self.assertNotIn("WVZ-NEG-004", serialized)


# ---------------------------------------------------------------------------
# Class 6: stop-loss contract
# ---------------------------------------------------------------------------


class BatchAStopLossContract(unittest.TestCase):
    """Aggregates the program stop-loss counters for Batch A."""

    maxDiff = None

    def test_total_atomic_claims_is_labeled_integer_326(self) -> None:
        """Total atomic claims = 326 (A3 labeled-integer check)."""
        total = 0
        for game in GAMES:
            ledger = load_ledger(game)
            report = _load_json(TRACK_DIR / f"{game}-evidence-final-report.json")
            self.assertIsInstance(report["claims_total"], int)
            self.assertEqual(report["claims_total"], len(ledger["raw"]))
            total += len(ledger["raw"])
        self.assertEqual(total, 326)
        mapper_report = _load_json(TRACK_DIR / "mapper-final-report-batch-a.json")
        self.assertEqual(mapper_report["cohort_games"], list(GAMES))
        mapper_receipt = _load_json(
            TRACK_DIR / "role-receipts" / "requirements-mapper-batch-a.json"
        )
        consumed = mapper_receipt["findings"]["claims_consumed"]
        self.assertEqual(consumed["total"]["claims"], 326)
        self.assertEqual(consumed["total"]["negative_fixtures"], 12)

    def test_zero_unsupported_factual_claims(self) -> None:
        """Every non-fixture claim must resolve. Any failure here is a
        fabricated-or-unverifiable citation and stops the batch (program:
        'One unsupported or fabricated factual claim stops the batch.')."""
        unsupported = []
        total = 0
        for game in GAMES:
            for claim in load_ledger(game)["claims"]:
                total += 1
                ok, detail = resolve_claim_citation(claim)
                if not ok:
                    unsupported.append(detail)
        self.assertEqual(total, 314)
        self.assertEqual(
            unsupported, [],
            f"{len(unsupported)} unsupported factual claims "
            f"(gate G-CL/G-SL RED): {unsupported}",
        )

    def test_zero_denominator_mismatches_and_slos_resolved(self) -> None:
        """Zero unresolved denominator mismatches; both SLOs are recorded as
        conditional-item + exclusion via stop-loss-resolutions-batch-a.md, and
        the T2 manifests are unamended."""
        resolutions_path = TRACK_DIR / "stop-loss-resolutions-batch-a.md"
        self.assertTrue(resolutions_path.is_file())
        text = resolutions_path.read_text(encoding="utf-8")
        self.assertIn("SLO-MD-1", text)
        self.assertIn("SLO-WVZ-1", text)
        self.assertIn("ACCEPT-AS-CONDITIONAL", text)
        self.assertIn("ACCEPT-EXCLUSION", text)
        # The resolution does not amend the canonical T2 hashes.
        self.assertIn(T2_DENOMINATOR_SHA256, text)
        self.assertIn(T2_PARTITION_SHA256, text)
        self.assertEqual(
            _sha256((ARCHIVE_DIR / "accepted-denominator-manifest.json").read_bytes()),
            T2_DENOMINATOR_SHA256,
        )
        self.assertEqual(
            _sha256((ARCHIVE_DIR / "accepted-partition-manifest.json").read_bytes()),
            T2_PARTITION_SHA256,
        )
        # Exactly two resolved Batch A SLOs (SLO-DF-1 appears only as the T3
        # pilot precedent citation inside the resolutions document).
        slo_ids = set(re.findall(r"SLO-[A-Z]+-\d+", text))
        self.assertEqual(slo_ids, {"SLO-MD-1", "SLO-WVZ-1", "SLO-DF-1"})
        for json_path in sorted(TRACK_DIR.glob("*.json")):
            if json_path.name in ("mapper-final-report-batch-a.json",):
                continue  # the report's notes legitimately name the resolved ids
            found = set(re.findall(r"SLO-[A-Z]+-\d+", json_path.read_text(encoding="utf-8")))
            self.assertTrue(
                found <= {"SLO-MD-1", "SLO-WVZ-1", "SLO-CD-1", "SLO-CD-2", "SLO-CD-3", "SLO-CD-4"},
                f"{json_path.name}: unexpected SLO ids {found}",
            )
        # Collector stop-loss counters: CD reports all-zero PASS-CONTINUE;
        # MD/WVZ each carry exactly one denominator-gap observation, both
        # resolved by the resolutions document above.
        cd_report = _load_json(TRACK_DIR / "castle-defense-evidence-final-report.json")
        for observation in cd_report["stop_loss_observations"]:
            self.assertEqual(observation["count"], 0)
            self.assertEqual(observation["disposition"], "PASS-CONTINUE")
        md_report = _load_json(TRACK_DIR / "magic-defense-evidence-final-report.json")
        self.assertEqual(
            [o["id"] for o in md_report["stop_loss_observations"]], ["SLO-MD-1"],
        )
        wvz_report = _load_json(TRACK_DIR / "wizard-vs-zombie-evidence-final-report.json")
        self.assertEqual(
            [o["id"] for o in wvz_report["stop_loss_observations"]], ["SLO-WVZ-1"],
        )

    def test_zero_failed_fix_review_cycles_and_zero_unresolved_blocking_findings(self) -> None:
        receipts = sorted((TRACK_DIR / "role-receipts").glob("*.json"))
        self.assertTrue(receipts, "no role receipts found")
        for receipt_path in receipts:
            receipt = _load_json(receipt_path)
            self.assertNotEqual(
                receipt.get("role"), "adversarial-reviewer",
                "adversarial review already exists; cycle accounting must come from it",
            )
        for json_path in TRACK_DIR.glob("*.json"):
            text = json_path.read_text(encoding="utf-8")
            self.assertNotRegex(
                text, r'"(failed_fix_review_cycles|fix_review_cycles_failed)"\s*:\s*[1-9]',
                f"{json_path.name} records a failed fix/review cycle",
            )
        artifacts = list(TRACK_DIR.glob("*.json")) + receipts
        unresolved = []

        def walk(node, origin):
            if isinstance(node, dict):
                severity = str(node.get("severity", "")).lower()
                if severity in ("critical", "high", "medium"):
                    status = str(node.get("status", node.get("disposition", ""))).lower()
                    if status not in ("resolved", "closed", "accepted"):
                        unresolved.append((origin, node))
                for value in node.values():
                    walk(value, origin)
            elif isinstance(node, list):
                for value in node:
                    walk(value, origin)

        for artifact in artifacts:
            walk(_load_json(artifact), artifact.name)
        self.assertEqual(
            unresolved, [],
            f"unresolved blocking findings: {[u[0] for u in unresolved]}",
        )

    def test_receipt_integrity_known_imperfections_confined(self) -> None:
        """G-RR support: the documented A15-class imperfections are exactly
        IMP-CD-1 / IMP-MD-1 / IMP-WVZ-1 and nothing else; WVZ is pinned to its
        authoritative bind commit; intermediate commits are not authoritative.

        This test intentionally does NOT assert the receipts are clean: the
        imperfections are real and gate G-RR stays red until a superseding
        receipt lands on a new commit. This test confines the damage so any
        NEW placeholder or hash drift is caught.
        """
        receipts_dir = TRACK_DIR / "role-receipts"
        cd = _load_json(receipts_dir / "evidence-collector-castle-defense.json")
        md = _load_json(receipts_dir / "evidence-collector-magic-defense.json")
        wvz = _load_json(receipts_dir / "evidence-collector-wizard-vs-zombie.json")
        mapper = _load_json(receipts_dir / "requirements-mapper-batch-a.json")

        # IMP-CD-1: CD receipt lacks final_response_sha256 entirely.
        self.assertNotIn("final_response_sha256", cd)
        # IMP-MD-1: MD receipt carries the literal placeholder.
        self.assertEqual(md.get("final_response_sha256"), "PENDING-RECEIPT-BIND")
        # No other placeholder strings anywhere in the receipt set.
        placeholder_re = re.compile(r"PENDING-RECEIPT-BIND|prose basis", re.IGNORECASE)
        for receipt_path in sorted(receipts_dir.glob("*.json")):
            hits = placeholder_re.findall(receipt_path.read_text(encoding="utf-8"))
            if receipt_path.name == "evidence-collector-magic-defense.json":
                self.assertEqual(len(hits), 1, f"{receipt_path.name}: {hits}")
            else:
                self.assertEqual(hits, [], f"{receipt_path.name}: placeholder strings {hits}")
        # R-WVZ-1: WVZ receipt pins the authoritative bind commit. Its ledger
        # and method output hashes match the committed working-tree bytes.
        self.assertEqual(wvz.get("commit_sha"), WVZ_BIND_COMMIT)
        ledger_rel = "measure/tracks/apk_corpus_audit_action_defense_20260712/wizard-vs-zombie-claim-ledger.json"
        method_rel = "measure/tracks/apk_corpus_audit_action_defense_20260712/wizard-vs-zombie-evidence-method.md"
        for relative in (ledger_rel, method_rel):
            digest = wvz["output_hashes"][relative]
            self.assertTrue(HEX64_RE.match(digest), f"{relative}: malformed hash")
            self.assertEqual(
                _sha256((REPO_ROOT / relative).read_bytes()), digest,
                f"{relative}: output hash does not match working-tree bytes",
            )
        # IMP-WVZ-1 (A15-class, documented): the receipt's enumerated hash for
        # the wizard-vs-zombie final report is stale -- it matches neither the
        # working-tree bytes at HEAD nor the bytes at the bind commit
        # 20af6417. Additionally the receipt itself was mutated in place by
        # ca423fbb (an unrelated track's commit), which is a receipt
        # immutability breach. This test confines the documented imperfection:
        # exactly one enumerated output hash is stale and it is exactly the
        # final-report entry. G-RR remains red until a superseding receipt
        # lands on a new commit.
        report_rel = "measure/tracks/apk_corpus_audit_action_defense_20260712/wizard-vs-zombie-evidence-final-report.json"
        stale = []
        for relative, digest in wvz["output_hashes"].items():
            if _sha256((REPO_ROOT / relative).read_bytes()) != digest:
                stale.append(relative)
        self.assertEqual(stale, [report_rel])
        enumerated = wvz["output_hashes"][report_rel]
        head_bytes = _git_show("HEAD", report_rel)
        bind_bytes = _git_show(WVZ_BIND_COMMIT, report_rel)
        self.assertIsNotNone(head_bytes)
        self.assertIsNotNone(bind_bytes)
        self.assertNotEqual(_sha256(head_bytes), enumerated)
        self.assertNotEqual(_sha256(bind_bytes), enumerated)
        # Intermediate WVZ commits are never referenced as authoritative.
        for receipt_path in sorted(receipts_dir.glob("*.json")):
            text = receipt_path.read_text(encoding="utf-8")
            for intermediate in WVZ_INTERMEDIATE_COMMITS:
                self.assertNotIn(intermediate, text, f"{receipt_path.name}: {intermediate}")
        # Role-isolation literals on every receipt (R-ALL-2).
        for receipt in (cd, md, wvz, mapper):
            self.assertEqual(receipt.get("schema_version"), "apk-role-receipt.v1")
            self.assertEqual(receipt.get("parent_ancestry_ids"), [])
            self.assertEqual(
                receipt.get("reviewer_isolation"),
                "fresh-context-only, inherited_narrative=false, fork_turns=none",
            )
        # Mapper receipt carries real (non-placeholder) hash fields.
        self.assertTrue(HEX64_RE.match(mapper["prompt_sha256"]))
        self.assertTrue(HEX64_RE.match(mapper["final_response_sha256"]))
        self.assertTrue(HEX40_RE.match(mapper["commit_sha"]))
        self.assertEqual(mapper.get("phase_base_sha"), PHASE_BASE_SHA)


if __name__ == "__main__":
    unittest.main()
