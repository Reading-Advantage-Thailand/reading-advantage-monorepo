"""Cycle-2 truth tests for the Batch A Magic Defense and WVZ v2 ledgers.

The module preserves the six-class hierarchy of ``batch-a-truth-tests.py``
while limiting its factual inputs to the two cycle-2 ledgers, their reports,
their collector receipts, the superseding WVZ receipt, the strategy, and git's
read-only object store.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q \
        measure/tracks/apk_corpus_audit_action_defense_20260712/batch-a-truth-tests-v2.py
"""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unittest
from collections import Counter
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = (
    REPO_ROOT
    / "measure"
    / "tracks"
    / "apk_corpus_audit_action_defense_20260712"
)
RECEIPTS_DIR = TRACK_DIR / "role-receipts"

BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
MD_HISTORICAL_REVISION = "097545f14a8029d0c3451e3514841f9c5bf3e1c2"
PHASE_BASE_SHA = "9228c5c5"
ROLE_BASE_SHA = "fadc4f46bacf1c3951c72c850b55fc621e063def"
V1_TRUTH_TEST_BIND = "5464dc6b"
MD_RECEIPT_BIND = "760100fd6d0a7d41c520c6dc60a716c9f7ec0878"
WVZ_RECEIPT_BIND = "81c641a607572853bde05f8e7d3bc90c76e3470b"
WVZ_MUTATION_COMMIT = "ca423fbb8eecbcfeb6bd0a156232462289c4726f"
LEDGER_SCHEMA_VERSION = "apk-claim-ledger.v2"

HEX40_RE = re.compile(r"\A[0-9a-f]{40}\Z")
HEX64_RE = re.compile(r"\A[0-9a-f]{64}\Z")

GAMES = ("magic-defense", "wizard-vs-zombie")
CLAIM_TOTALS = {"magic-defense": 110, "wizard-vs-zombie": 77}
PHASE3_TOTALS = {"magic-defense": 110, "wizard-vs-zombie": 77}
FACTUAL_TOTALS = {"magic-defense": 105, "wizard-vs-zombie": 73}
FIXTURE_TOTALS = {"magic-defense": 5, "wizard-vs-zombie": 4}
FIXTURE_IDS = {
    "magic-defense": {
        "MD-NEG-001",
        "MD-NEG-002",
        "MD-NEG-003",
        "MD-NEG-004",
        "MD-NEG-005",
    },
    "wizard-vs-zombie": {
        "WVZ-NEG-001",
        "WVZ-NEG-002",
        "WVZ-NEG-003",
        "WVZ-NEG-004",
    },
}
BAD_V1_IDS = {
    "magic-defense": {"MD-HIST-001", "MD-HIST-002"},
    "wizard-vs-zombie": {
        "WVZ-COMP-004",
        "WVZ-COMP-005",
        "WVZ-COMP-006",
        "WVZ-MECH-008",
        "WVZ-MECH-019",
        "WVZ-TEST-007",
        "WVZ-TEST-008",
        "WVZ-HIST-002",
        "WVZ-HIST-003",
        "WVZ-HIST-004",
    },
}
EXPECTED_DISPOSITIONS = {
    "MD-NEG-001": "FAIL",
    "MD-NEG-002": "REJECT",
    "MD-NEG-003": "REJECT",
    "MD-NEG-004": "REJECT",
    "MD-NEG-005": "REJECT",
    "WVZ-NEG-001": "REJECT",
    "WVZ-NEG-002": "REJECT",
    "WVZ-NEG-003": "REJECT",
    "WVZ-NEG-004": "REJECT",
}
ALLOWED_PREFIXES = (
    "apps/advantage-games/",
    "apps/reading-advantage/",
    "apps/www-reading-advantage/",
    "measure/archive/apk_source_denominator_inventory_20260712/",
)
QUARANTINED_PATH = (
    "measure/tracks/apk_cross_game_asset_ontology_20260712/"
    "mechanic-blueprints/magic-defense.md"
)


_GIT_SHOW_CACHE: dict[tuple[str, str], bytes | None] = {}
_LEDGER_CACHE: dict[str, dict] = {}


def _git(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    """Runs one read-only git command at the repository root."""
    return subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, check=check
    )


def _git_text(*args: str, check: bool = True) -> str:
    """Returns stdout from one read-only git command as text."""
    return _git(*args, check=check).stdout.decode("utf-8", errors="replace")


def _git_show(revision: str, path: str) -> bytes | None:
    """Returns bytes at ``revision:path``, or ``None`` when absent."""
    key = (revision, path)
    if key not in _GIT_SHOW_CACHE:
        result = _git("show", f"{revision}:{path}", check=False)
        _GIT_SHOW_CACHE[key] = result.stdout if result.returncode == 0 else None
    return _GIT_SHOW_CACHE[key]


def _git_object_type(revision: str, path: str) -> str | None:
    """Returns the git object type at ``revision:path``, when present."""
    result = _git("cat-file", "-t", f"{revision}:{path}", check=False)
    if result.returncode != 0:
        return None
    return result.stdout.decode().strip()


def _sha256(data: bytes) -> str:
    """Returns the hexadecimal SHA-256 digest of bytes."""
    return hashlib.sha256(data).hexdigest()


def _load_json(path: Path):
    """Loads one UTF-8 JSON document."""
    return json.loads(path.read_text(encoding="utf-8"))


def _is_fixture(claim: dict) -> bool:
    """Returns whether a claim is one of the preserved negative fixtures."""
    if claim.get("negative_fixture") is True:
        return True
    if claim.get("category") in ("negative_fixture", "negative-fixture"):
        return True
    return bool(re.search(r"-NEG-\d+\Z", str(claim.get("claim_id", ""))))


def load_ledger(game: str) -> dict:
    """Loads one v2 ledger and separates factual claims from fixtures."""
    if game in _LEDGER_CACHE:
        return _LEDGER_CACHE[game]
    path = TRACK_DIR / f"{game}-claim-ledger-v2.json"
    document = _load_json(path)
    raw = list(document.get("claims", [])) if isinstance(document, dict) else document
    normalized = {
        "document": document,
        "raw": raw,
        "claims": [claim for claim in raw if not _is_fixture(claim)],
        "fixtures": [claim for claim in raw if _is_fixture(claim)],
    }
    _LEDGER_CACHE[game] = normalized
    return normalized


def _report(game: str) -> dict:
    """Loads one cycle-2 evidence final report."""
    return _load_json(TRACK_DIR / f"{game}-evidence-final-report-v2.json")


def _claim(game: str, claim_id: str) -> dict:
    """Returns one claim by stable id."""
    matches = [c for c in load_ledger(game)["raw"] if c["claim_id"] == claim_id]
    if len(matches) != 1:
        raise AssertionError(f"{game}: expected one {claim_id}, got {len(matches)}")
    return matches[0]


def _fixture_disposition(fixture: dict) -> str | None:
    """Returns the explicit or interpretation-embedded fixture disposition."""
    explicit = fixture.get("expected_disposition")
    if explicit:
        return explicit
    match = re.search(
        r"expected_disposition=([A-Z_]+)",
        str(fixture.get("interpretation", "")),
    )
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


def _citation_bytes(claim: dict) -> bytes:
    """Returns the cited blob from git or the frozen committed input."""
    data = _git_show(claim["revision"], claim["file_path"])
    if data is not None:
        return data
    path = REPO_ROOT / claim["file_path"]
    if path.is_file():
        return path.read_bytes()
    raise AssertionError(f"{claim['claim_id']}: cited blob is unavailable")


def _exact_citation_error(claim: dict) -> str | None:
    """Returns an exact blob/range error, or ``None`` when hashes match."""
    cid = claim["claim_id"]
    blob_hash = claim.get("blob_sha256")
    range_hash = claim.get("cited_range_sha256")
    if not blob_hash and not range_hash:
        return None
    if not HEX64_RE.match(str(blob_hash or "")):
        return f"{cid}: malformed blob_sha256"
    data = _citation_bytes(claim)
    if _sha256(data) != blob_hash:
        return f"{cid}: full blob hash mismatch"
    if range_hash is None:
        return None
    if not HEX64_RE.match(str(range_hash)):
        return f"{cid}: malformed cited_range_sha256"
    if range_hash == blob_hash or claim.get("line_start") == 0:
        return None if _sha256(data) == range_hash else f"{cid}: whole-file mismatch"
    try:
        lines = data.decode("utf-8").split("\n")
    except UnicodeDecodeError:
        return f"{cid}: binary range is not a whole-file citation"
    start = claim.get("line_start")
    end = claim.get("line_end")
    if not isinstance(start, int) or not isinstance(end, int):
        return f"{cid}: missing textual line range"
    if not 1 <= start <= end <= len(lines):
        return f"{cid}: range {start}..{end} outside {len(lines)} lines"
    selected = lines[start - 1 : end]
    digests = {
        _sha256(("\n".join(selected) + "\n").encode("utf-8")),
        _sha256("\n".join(selected).encode("utf-8")),
    }
    return None if range_hash in digests else f"{cid}: exact range hash mismatch"


def _assert_receipt_outputs(test: unittest.TestCase, receipt: dict) -> None:
    """Asserts that receipt output hashes match bytes at its output commit."""
    commit = receipt["commit_sha"]
    test.assertRegex(commit, HEX40_RE)
    for path, expected in receipt["output_hashes"].items():
        data = _git_show(commit, path)
        test.assertIsNotNone(data, f"{commit[:8]}:{path} missing")
        test.assertEqual(_sha256(data), expected, path)


# ---------------------------------------------------------------------------
# Class 1: schema + invariants
# ---------------------------------------------------------------------------


class BatchADenominatorTruthContract(unittest.TestCase):
    """Validates the two v2 ledger schemas and record-level invariants."""

    def test_magic_defense_declares_claim_ledger_v2_schema(self) -> None:
        """Mode A carries the required explicit v2 schema version."""
        document = load_ledger("magic-defense")["document"]
        self.assertIsInstance(document, dict)
        self.assertEqual(document.get("schema_version"), LEDGER_SCHEMA_VERSION)

    def test_wizard_vs_zombie_declares_claim_ledger_v2_schema(self) -> None:
        """Mode B's raw-list shape is bound as the collector's v2 ledger."""
        document = load_ledger("wizard-vs-zombie")["document"]
        report = _report("wizard-vs-zombie")
        receipt = _load_json(
            RECEIPTS_DIR / "evidence-collector-wizard-vs-zombie-v2.json"
        )
        self.assertIsInstance(document, list)
        self.assertEqual(report["mode"], "B")
        self.assertEqual(
            report["mode_description"],
            "clean rewrite; no additive v1 claims or supersedes fields",
        )
        self.assertEqual(
            report["task_id"],
            "evidence-collector:wizard-vs-zombie:t4-batch-a:v2",
        )
        self.assertIn(
            "measure/tracks/apk_corpus_audit_action_defense_20260712/"
            "wizard-vs-zombie-claim-ledger-v2.json",
            receipt["output_paths"],
        )

    def test_v2_ledger_claim_counts_are_110_and_77(self) -> None:
        """The cycle-2 ledgers retain their frozen atomic claim counts."""
        for game, expected in CLAIM_TOTALS.items():
            with self.subTest(game=game):
                self.assertEqual(len(load_ledger(game)["raw"]), expected)

    def test_claim_ids_are_unique_within_each_ledger(self) -> None:
        """Every ledger uses each stable claim id exactly once."""
        for game in GAMES:
            ids = [claim["claim_id"] for claim in load_ledger(game)["raw"]]
            self.assertEqual(len(ids), len(set(ids)), game)

    def test_claims_carry_required_identity_and_confidence_fields(self) -> None:
        """Every record carries the minimum v2 identity contract."""
        for game in GAMES:
            for claim in load_ledger(game)["raw"]:
                with self.subTest(game=game, claim=claim.get("claim_id")):
                    self.assertRegex(claim["claim_id"], rf"^{('MD' if game == 'magic-defense' else 'WVZ')}-")
                    self.assertEqual(claim.get("game"), game)
                    self.assertIn(claim.get("confidence"), {"high", "medium", "low"})
                    self.assertIsInstance(claim.get("claim_text"), str)
                    self.assertTrue(claim["claim_text"])

    def test_present_hashes_are_lowercase_sha256(self) -> None:
        """All populated range and blob hashes are canonical SHA-256 strings."""
        for game in GAMES:
            for claim in load_ledger(game)["raw"]:
                for field in ("blob_sha256", "cited_range_sha256"):
                    value = claim.get(field)
                    if value is not None:
                        self.assertRegex(value, HEX64_RE, f"{claim['claim_id']}:{field}")

    def test_collector_reports_bind_modes_a_and_b_to_v2_outputs(self) -> None:
        """Collector envelopes identify Mode A and Mode B cycle-2 outputs."""
        md = _report("magic-defense")
        wvz = _report("wizard-vs-zombie")
        self.assertTrue(md["mode"].startswith("A"))
        self.assertEqual(wvz["mode"], "B")
        self.assertEqual(md["claims_total"], 110)
        self.assertEqual(wvz["claims_total"], 77)


# ---------------------------------------------------------------------------
# Class 2: claim-ledger truth contract
# ---------------------------------------------------------------------------


class BatchAClaimLedgerTruthContract(unittest.TestCase):
    """Validates every v2 citation against the live git object store."""

    def _assert_resolves(self, game: str) -> None:
        """Asserts all non-fixture citations resolve through the v1 resolver."""
        failures = []
        for claim in load_ledger(game)["claims"]:
            ok, detail = resolve_claim_citation(claim)
            if not ok:
                failures.append(detail)
        self.assertEqual(failures, [], f"G-CL RED: {failures}")

    def _assert_exact_hashes(self, game: str) -> None:
        """Asserts all populated citation envelopes have exact live hashes."""
        errors = [
            error
            for claim in load_ledger(game)["raw"]
            if (error := _exact_citation_error(claim)) is not None
        ]
        self.assertEqual(errors, [], errors)

    def _assert_full_blobs(self, game: str) -> None:
        """Asserts every populated blob digest hashes the full cited file."""
        for claim in load_ledger(game)["raw"]:
            if claim.get("blob_sha256") is None:
                continue
            self.assertEqual(
                _sha256(_citation_bytes(claim)),
                claim["blob_sha256"],
                claim["claim_id"],
            )

    def test_magic_defense_non_fixture_citations_resolve(self) -> None:
        """All 105 Magic Defense factual claims resolve through the v1 helper."""
        self._assert_resolves("magic-defense")

    def test_wizard_vs_zombie_non_fixture_citations_resolve(self) -> None:
        """All 73 Wizard vs Zombie factual claims resolve through the v1 helper."""
        self._assert_resolves("wizard-vs-zombie")

    def test_magic_defense_cited_ranges_match_exact_bytes(self) -> None:
        """Every populated Magic Defense range hash matches exact cited bytes."""
        self._assert_exact_hashes("magic-defense")

    def test_wizard_vs_zombie_cited_ranges_match_exact_bytes(self) -> None:
        """Every populated WVZ range hash matches exact cited bytes."""
        self._assert_exact_hashes("wizard-vs-zombie")

    def test_magic_defense_blob_hashes_match_full_files(self) -> None:
        """Every populated Magic Defense blob hash matches the whole file."""
        self._assert_full_blobs("magic-defense")

    def test_wizard_vs_zombie_blob_hashes_match_full_files(self) -> None:
        """Every populated WVZ blob hash matches the whole file."""
        self._assert_full_blobs("wizard-vs-zombie")


# ---------------------------------------------------------------------------
# Class 3: citation integrity versus strategy bounds
# ---------------------------------------------------------------------------


class BatchABlueprintTruthContract(unittest.TestCase):
    """Confines revisions, file paths, and line ranges to strategy bounds."""

    def _assert_ranges_in_file(self, game: str) -> None:
        """Asserts textual line ranges remain inside their cited files."""
        for claim in load_ledger(game)["raw"]:
            if claim.get("blob_sha256") is None:
                continue
            start = claim.get("line_start")
            end = claim.get("line_end")
            if start == 0 and end == 0:
                self.assertEqual(claim["cited_range_sha256"], claim["blob_sha256"])
                continue
            data = _citation_bytes(claim)
            try:
                line_count = len(data.decode("utf-8").split("\n"))
            except UnicodeDecodeError:
                self.assertEqual(claim["cited_range_sha256"], claim["blob_sha256"])
                continue
            self.assertTrue(
                1 <= start <= end <= line_count,
                f"{claim['claim_id']}: {start}..{end} outside {line_count}",
            )

    def _assert_paths_bounded(self, game: str) -> None:
        """Asserts cited paths are relative and stay in approved source roots."""
        for claim in load_ledger(game)["raw"]:
            path = claim.get("file_path")
            if path is None:
                continue
            self.assertFalse(Path(path).is_absolute(), claim["claim_id"])
            self.assertNotIn("..", Path(path).parts, claim["claim_id"])
            if path == QUARANTINED_PATH:
                self.assertEqual(claim["claim_id"], "MD-HIST-009")
                continue
            self.assertTrue(path.startswith(ALLOWED_PREFIXES), f"{claim['claim_id']}:{path}")

    def test_magic_defense_revisions_stay_at_strategy_sources(self) -> None:
        """Magic Defense cites only the baseline or its real historical blob."""
        revisions = {c.get("revision") for c in load_ledger("magic-defense")["claims"]}
        self.assertEqual(revisions, {BASELINE, MD_HISTORICAL_REVISION})

    def test_wizard_vs_zombie_revisions_stay_at_baseline(self) -> None:
        """Mode B factual claims all cite the frozen source baseline."""
        revisions = {c.get("revision") for c in load_ledger("wizard-vs-zombie")["claims"]}
        self.assertEqual(revisions, {BASELINE})

    def test_magic_defense_line_ranges_stay_inside_files(self) -> None:
        """Magic Defense text ranges do not exceed their source files."""
        self._assert_ranges_in_file("magic-defense")

    def test_wizard_vs_zombie_line_ranges_stay_inside_files(self) -> None:
        """WVZ text ranges do not exceed their source files."""
        self._assert_ranges_in_file("wizard-vs-zombie")

    def test_magic_defense_file_paths_stay_in_strategy_roots(self) -> None:
        """Magic Defense paths stay in approved roots or its quarantine marker."""
        self._assert_paths_bounded("magic-defense")

    def test_wizard_vs_zombie_file_paths_stay_in_strategy_roots(self) -> None:
        """WVZ paths stay in approved application and denominator roots."""
        self._assert_paths_bounded("wizard-vs-zombie")

    def test_binary_claims_use_zero_zero_whole_file_anchors(self) -> None:
        """Binary claims use the v2 zero/zero whole-file convention."""
        binary = []
        for game in GAMES:
            for claim in load_ledger(game)["raw"]:
                if claim.get("line_start") == 0 or claim.get("line_end") == 0:
                    binary.append(claim["claim_id"])
                    self.assertEqual((claim["line_start"], claim["line_end"]), (0, 0))
                    self.assertEqual(claim["cited_range_sha256"], claim["blob_sha256"])
        self.assertEqual(
            set(binary),
            {
                "WVZ-ASSET-001",
                "WVZ-ASSET-002",
                "WVZ-ASSET-003",
                "WVZ-ASSET-004",
                "WVZ-ASSET-005",
                "WVZ-ASSET-007",
                "WVZ-ASSET-010",
            },
        )

    def test_quarantined_path_is_only_an_uncited_negative_evidence_marker(self) -> None:
        """The failed ontology path is never used as primary source evidence."""
        matches = [
            c
            for game in GAMES
            for c in load_ledger(game)["raw"]
            if c.get("file_path") == QUARANTINED_PATH
        ]
        self.assertEqual([c["claim_id"] for c in matches], ["MD-HIST-009"])
        marker = matches[0]
        self.assertIsNone(marker["line_start"])
        self.assertIsNone(marker["line_end"])
        self.assertIsNone(marker["cited_range_sha256"])
        self.assertIsNone(marker["blob_sha256"])
        self.assertIn("quarantined negative evidence", marker["claim_text"])

    def test_asset_claim_anchor_surface_is_green(self) -> None:
        """All 26 v2 asset claims have exact source-backed citation envelopes."""
        assets = [
            claim
            for game in GAMES
            for claim in load_ledger(game)["claims"]
            if claim["category"] == "asset"
        ]
        self.assertEqual(len(assets), 26)
        self.assertEqual(
            [e for c in assets if (e := _exact_citation_error(c)) is not None],
            [],
        )


# ---------------------------------------------------------------------------
# Class 4: negative-fixture preservation
# ---------------------------------------------------------------------------


class BatchAActionDefenseSpecificContract(unittest.TestCase):
    """Ensures all nine cycle-2 fixtures preserve their v1 dispositions."""

    def test_magic_defense_fixture_ids_are_preserved(self) -> None:
        """MD-NEG-001 through MD-NEG-005 remain present exactly once."""
        ids = {c["claim_id"] for c in load_ledger("magic-defense")["fixtures"]}
        self.assertEqual(ids, FIXTURE_IDS["magic-defense"])

    def test_wizard_vs_zombie_fixture_ids_are_preserved(self) -> None:
        """WVZ-NEG-001 through WVZ-NEG-004 remain present exactly once."""
        ids = {c["claim_id"] for c in load_ledger("wizard-vs-zombie")["fixtures"]}
        self.assertEqual(ids, FIXTURE_IDS["wizard-vs-zombie"])

    def test_md_neg_001_remains_fail(self) -> None:
        """The real-citation XP multiplier fixture remains FAIL-class."""
        fixture = _claim("magic-defense", "MD-NEG-001")
        self.assertEqual(_fixture_disposition(fixture), "FAIL")
        data = _citation_bytes(fixture).decode("utf-8")
        self.assertNotRegex(data, r"xpEarned\s*=.*difficulty")

    def test_md_neg_002_remains_reject(self) -> None:
        """The uncited generic-template fixture remains REJECT-class."""
        fixture = _claim("magic-defense", "MD-NEG-002")
        self.assertEqual(_fixture_disposition(fixture), "REJECT")
        self.assertIsNone(fixture["file_path"])

    def test_md_neg_003_remains_reject(self) -> None:
        """The matchMedia fixture remains REJECT-class with a whole-file cite."""
        fixture = _claim("magic-defense", "MD-NEG-003")
        self.assertEqual(_fixture_disposition(fixture), "REJECT")
        self.assertNotIn("matchMedia", _citation_bytes(fixture).decode("utf-8"))

    def test_md_neg_004_remains_reject(self) -> None:
        """The directory-only asset fixture remains REJECT-class."""
        fixture = _claim("magic-defense", "MD-NEG-004")
        self.assertEqual(_fixture_disposition(fixture), "REJECT")
        self.assertTrue(fixture["file_path"].endswith("/"))
        self.assertIsNone(fixture["blob_sha256"])

    def test_md_neg_005_remains_reject(self) -> None:
        """The uncited Redis fixture remains REJECT-class."""
        fixture = _claim("magic-defense", "MD-NEG-005")
        self.assertEqual(_fixture_disposition(fixture), "REJECT")
        self.assertIsNone(fixture["file_path"])

    def test_all_wvz_fixtures_remain_reject(self) -> None:
        """All four Mode B WVZ fixtures retain REJECT disposition."""
        fixtures = load_ledger("wizard-vs-zombie")["fixtures"]
        self.assertEqual(
            {_fixture_disposition(fixture) for fixture in fixtures},
            {"REJECT"},
        )

    def test_every_populated_fixture_citation_still_matches(self) -> None:
        """Fixture preservation includes exact hashes for every populated cite."""
        errors = []
        for game in GAMES:
            for fixture in load_ledger(game)["fixtures"]:
                error = _exact_citation_error(fixture)
                if error:
                    errors.append(error)
                self.assertEqual(
                    _fixture_disposition(fixture),
                    EXPECTED_DISPOSITIONS[fixture["claim_id"]],
                )
        self.assertEqual(errors, [])


# ---------------------------------------------------------------------------
# Class 5: cross-claim consistency
# ---------------------------------------------------------------------------


class BatchANegativeFixtureContract(unittest.TestCase):
    """Checks cross-ledger ids and report/count consistency."""

    def test_no_duplicate_claim_ids_across_v2_ledgers(self) -> None:
        """Magic Defense and WVZ have no cross-ledger claim-id collision."""
        md_ids = {c["claim_id"] for c in load_ledger("magic-defense")["raw"]}
        wvz_ids = {c["claim_id"] for c in load_ledger("wizard-vs-zombie")["raw"]}
        self.assertEqual(md_ids & wvz_ids, set())

    def test_phase3_totals_align_with_claim_totals(self) -> None:
        """The cycle-2 phase total pins equal the ledger claim total pins."""
        self.assertEqual(PHASE3_TOTALS, CLAIM_TOTALS)
        self.assertEqual(sum(PHASE3_TOTALS.values()), 187)

    def test_claim_totals_match_ledger_counts(self) -> None:
        """CLAIM_TOTALS matches the actual v2 ledger lengths."""
        actual = {game: len(load_ledger(game)["raw"]) for game in GAMES}
        self.assertEqual(actual, CLAIM_TOTALS)

    def test_report_claim_totals_match_ledgers(self) -> None:
        """Both v2 reports carry labeled integer totals matching their ledgers."""
        for game in GAMES:
            report = _report(game)
            self.assertIsInstance(report["claims_total"], int)
            self.assertEqual(report["claims_total"], len(load_ledger(game)["raw"]))

    def test_report_category_counts_match_ledgers(self) -> None:
        """Category counters in both reports are mechanically reproducible."""
        for game in GAMES:
            counts = Counter(c["category"] for c in load_ledger(game)["raw"])
            self.assertEqual(dict(counts), _report(game)["claims_by_category"])

    def test_fixture_and_factual_subtotals_sum_to_claim_totals(self) -> None:
        """Fixture and factual counts reconcile for each v2 ledger."""
        for game in GAMES:
            ledger = load_ledger(game)
            self.assertEqual(len(ledger["claims"]), FACTUAL_TOTALS[game])
            self.assertEqual(len(ledger["fixtures"]), FIXTURE_TOTALS[game])
            self.assertEqual(
                len(ledger["claims"]) + len(ledger["fixtures"]),
                CLAIM_TOTALS[game],
            )


# ---------------------------------------------------------------------------
# Class 6: stop-loss + role-receipt coherence
# ---------------------------------------------------------------------------


class BatchAStopLossContract(unittest.TestCase):
    """Validates cycle-2 corrections, receipt bindings, and stop-loss state."""

    def test_md_v1_bad_ids_have_corrected_v2_envelopes(self) -> None:
        """Both Magic Defense fabricated envelopes are explicitly superseded."""
        document = load_ledger("magic-defense")["document"]
        log_ids = {entry["claim_id"] for entry in document["supersession_log"]}
        self.assertEqual(log_ids, BAD_V1_IDS["magic-defense"])
        for claim_id in BAD_V1_IDS["magic-defense"]:
            claim = _claim("magic-defense", claim_id)
            self.assertEqual(claim["supersedes_claim_id"], claim_id)
            self.assertNotEqual(claim["blob_sha256"], hashlib.sha256(b"").hexdigest())
            self.assertIsNone(_exact_citation_error(claim))

    def test_wvz_v1_bad_ids_have_different_v2_content(self) -> None:
        """All ten WVZ defects have explicit old/new report records."""
        report = _report("wizard-vs-zombie")
        entries = {entry["claim_id"]: entry for entry in report["supersession_log"]}
        self.assertEqual(set(entries), BAD_V1_IDS["wizard-vs-zombie"])
        for claim_id, entry in entries.items():
            self.assertNotEqual(entry["v1"], entry["v2"], claim_id)
            self.assertEqual(entry["v2"]["resolver_verdict"], "range")
            self.assertIsNone(_exact_citation_error(_claim("wizard-vs-zombie", claim_id)))

    def test_corrected_claims_contain_no_v1_placeholder_hashes(self) -> None:
        """None of the twelve corrected claims retains known fabricated hashes."""
        placeholders = {
            hashlib.sha256(b"").hexdigest(),
            "01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b",
            "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
            "c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3",
            "d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5",
            "1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c",
        }
        for game, ids in BAD_V1_IDS.items():
            for claim_id in ids:
                claim = _claim(game, claim_id)
                self.assertNotIn(claim.get("blob_sha256"), placeholders)
                self.assertNotIn(claim.get("cited_range_sha256"), placeholders)

    def test_magic_defense_v2_receipt_hashes_outputs_at_commit(self) -> None:
        """The MD collector receipt's outputs match its committed bytes."""
        receipt = _load_json(RECEIPTS_DIR / "evidence-collector-magic-defense-v2.json")
        _assert_receipt_outputs(self, receipt)
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(receipt["findings"]["claims_total"], 110)

    def test_wvz_v2_receipt_hashes_outputs_at_commit(self) -> None:
        """The WVZ collector receipt's outputs match its committed bytes."""
        receipt = _load_json(
            RECEIPTS_DIR / "evidence-collector-wizard-vs-zombie-v2.json"
        )
        _assert_receipt_outputs(self, receipt)
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(receipt["findings"]["claims_total"], 77)

    def test_ca423fbb_mutation_is_acknowledged_by_supersede_receipt(self) -> None:
        """The append-only supersede receipt records the A15 mutation exactly."""
        receipt = _load_json(
            RECEIPTS_DIR / "evidence-collector-wizard-vs-zombie-supersede.json"
        )
        mutation = receipt["mutation_record"]
        self.assertEqual(mutation["mutation_commit"], WVZ_MUTATION_COMMIT)
        self.assertEqual(mutation["policy_class"], "anti-pattern A15")
        self.assertEqual(mutation["v1_receipt_disposition"], "superseded; non-authoritative")
        self.assertEqual(set(mutation["field_changes"]), {"commit_sha", "final_response_sha256"})
        self.assertEqual(receipt["findings"]["unresolved"], 0)

    def test_v2_receipts_preserve_fresh_context_isolation(self) -> None:
        """Both collector receipts and the supersede receipt retain isolation."""
        names = (
            "evidence-collector-magic-defense-v2.json",
            "evidence-collector-wizard-vs-zombie-v2.json",
            "evidence-collector-wizard-vs-zombie-supersede.json",
        )
        for name in names:
            receipt = _load_json(RECEIPTS_DIR / name)
            self.assertEqual(receipt["schema_version"], "apk-role-receipt.v1")
            self.assertEqual(receipt["parent_ancestry_ids"], [])
            self.assertEqual(receipt["fork_turns"], "none")
            self.assertIs(receipt["inherited_narrative"], False)
            self.assertRegex(receipt["prompt_sha256"], HEX64_RE)
            self.assertRegex(receipt["final_response_sha256"], HEX64_RE)

    def test_receipt_bind_commits_are_immutable_ancestors(self) -> None:
        """The supplied MD/WVZ receipt bind commits exist and reach role HEAD."""
        prefix = (
            "measure/tracks/apk_corpus_audit_action_defense_20260712/"
            "role-receipts/"
        )
        md_path = prefix + "evidence-collector-magic-defense-v2.json"
        self.assertEqual(
            _git_show(MD_RECEIPT_BIND, md_path),
            (REPO_ROOT / md_path).read_bytes(),
        )

        wvz_path = prefix + "evidence-collector-wizard-vs-zombie-v2.json"
        authored = _git_show(WVZ_RECEIPT_BIND, wvz_path)
        self.assertIsNotNone(authored)
        authored_receipt = json.loads(authored.decode("utf-8"))
        self.assertEqual(authored_receipt["commit_sha"], "<pending-orchestrator-bind>")
        bound_receipt = _load_json(REPO_ROOT / wvz_path)
        self.assertEqual(bound_receipt["commit_sha"], WVZ_RECEIPT_BIND)
        self.assertEqual(
            _git_show(ROLE_BASE_SHA, wvz_path),
            (REPO_ROOT / wvz_path).read_bytes(),
        )

        for revision in (MD_RECEIPT_BIND, WVZ_RECEIPT_BIND):
            result = _git(
                "merge-base", "--is-ancestor", revision, ROLE_BASE_SHA,
                check=False,
            )
            self.assertEqual(result.returncode, 0, revision)

    def test_stop_loss_counters_are_zero_after_v2_corrections(self) -> None:
        """Cycle-2 receipts report no unsupported or unresolved blocker."""
        md = _load_json(RECEIPTS_DIR / "evidence-collector-magic-defense-v2.json")
        stop = md["stop_loss_observations"]
        self.assertEqual(stop["unsupported_factual_claims"], 0)
        self.assertEqual(stop["denominator_mismatches"], 0)
        self.assertEqual(stop["failed_fix_review_cycles"], 0)
        self.assertEqual(stop["unresolved_blocking_findings"], {
            "critical": 0,
            "high": 0,
            "medium": 0,
        })
        wvz = _load_json(
            RECEIPTS_DIR / "evidence-collector-wizard-vs-zombie-v2.json"
        )
        self.assertEqual(wvz["findings"]["unsupported_factual_claims"], 0)
        self.assertEqual(wvz["findings"]["resolve_claim_citation"],
                         "73/73 non-fixture OK; 4/4 fixture citations OK; "
                         "77/77 total citation envelopes OK")

    def test_predecessor_truth_test_and_phase_bindings_are_preserved(self) -> None:
        """Cycle-2 receipts retain the supplied phase and v1 detection binds."""
        md_report = _report("magic-defense")
        wvz_report = _report("wizard-vs-zombie")
        self.assertEqual(
            md_report["envelope"]["predecessor_binding"]["v1_truth_test_receipt_bind"],
            V1_TRUTH_TEST_BIND,
        )
        self.assertEqual(wvz_report["phase_base_sha"], PHASE_BASE_SHA)
        wvz_receipt = _load_json(
            RECEIPTS_DIR / "evidence-collector-wizard-vs-zombie-v2.json"
        )
        self.assertEqual(wvz_receipt["truth_test_author_receipt_bind"], V1_TRUTH_TEST_BIND)


if __name__ == "__main__":
    unittest.main()
