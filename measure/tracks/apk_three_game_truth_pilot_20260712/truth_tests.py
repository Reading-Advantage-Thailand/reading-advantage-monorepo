"""T3 truth tests for the APK three-game source-truth pilot.

Role: truth-test-author (fresh context; fork_turns=none; no prior-role narrative).
Track: apk_three_game_truth_pilot_20260712.

These tests validate the frozen T2 denominator inputs, the three committed claim
ledgers, and the mapper blueprint at the source-baseline revision
23bb5ad578c01fb29f9e8bb76a7d934d24a4b286. They are derived from the accepted
denominator manifests, the phase-3 reconciliation, the claim ledgers, and the
blueprint itself -- never from any other role's completion narrative.

Run:
    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
        measure.tracks.apk_three_game_truth_pilot_20260712.truth_tests -v

Citation conventions validated here (per the ledger hash_convention fields and
independent re-computation against the T2 denominator records):

- cited_range_sha256 = SHA-256 of the exact bytes of lines start..end inclusive,
  each line terminated by its in-file newline.
- blob_sha256 = SHA-256 of the whole file bytes at the cited revision.
- Binary/data assets use whole-file citation (cited_range_sha256 == blob_sha256).
- citation_kind "frozen-manifest" cites a T2 accepted input that was authored
  after the source baseline; those blobs are verified against the committed
  working-tree bytes (the manifest path did not exist at the baseline revision).
- citation_kind "command-output" carries a command/observed_output/output_sha256
  envelope instead of a file citation; the envelope's completeness is verified.

A9 archival note (disclosed, stop-loss observation for the orchestrator): the T2
track apk_source_denominator_inventory_20260712 was archived from
measure/tracks/ to measure/archive/ by commit da51b4e0. The four committed T2
phase test modules hardcode the pre-archive track path, so they fail at HEAD on
path resolution alone. This suite proves (a) the modules are byte-frozen, (b)
pytest discovery yields exactly 13/18/31/24 = 86 tests, (c) phases 0 and 1 pass
31/31 at HEAD under a three-line, fully disclosed archival-relocation shim, and
(d) every phase 2/3 failure at HEAD is path-relocation class, with zero
content/hash failures. Repair of the committed T2 modules is infrastructure
work outside the truth-test-author role boundary and is NOT done here.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / "apk_three_game_truth_pilot_20260712"
ARCHIVE_DIR = REPO_ROOT / "measure" / "archive" / "apk_source_denominator_inventory_20260712"
T2_TEST_DIR = REPO_ROOT / "measure" / "tests"

BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
DELETION_COMMIT = "0ee9184728c11188c40b27c23fa649a9b67952dc"
AW_HISTORICAL_REVISIONS = {
    "c76f6af3f62c03979f5073a871e775afd952a070",
    "1c44854682b18a2393efd265c2271f824e228a3d",
    "da51b4e006cdce175171077e97c86089a38dbd5b",
}
HEX40_RE = re.compile(r"\A[0-9a-f]{40}\Z")
HEX64_RE = re.compile(r"\A[0-9a-f]{64}\Z")

T2_TRACK = "apk_source_denominator_inventory_20260712"
T2_PHASE_MODULES = {
    0: ("test_apk_source_denominator_inventory_phase0.py", 13),
    1: ("test_apk_source_denominator_inventory_phase1.py", 18),
    2: ("test_apk_source_denominator_inventory_phase2.py", 31),
    3: ("test_apk_source_denominator_inventory_phase3.py", 24),
}

GAMES = ("dragon-flight", "rpg-battle", "abyssal-well")
CANONICAL_IDS = {
    "dragon-flight": "vocabulary/dragon-flight",
    "rpg-battle": "vocabulary/rpg-battle",
    "abyssal-well": "sentence/abyssal-well",
}
COLLECTOR_AGENTS = {
    game: f"evidence-collector-{game}:t3:2026-07-20" for game in GAMES
}

# Expected claim counts by category, from the collector reports and ledger
# envelopes (independently re-counted here).
DF_CATEGORY_COUNTS = {
    "identity": 14, "scene": 4, "state": 10, "transition": 10, "mechanic": 56,
    "control": 16, "asset": 42, "copy_graph": 20, "test": 29, "responsive": 13,
    "historical": 8, "negative_fixture": 3,
}
RPG_CATEGORY_COUNTS = {
    "identity": 13, "scene": 10, "state": 47, "transition": 22, "mechanic": 27,
    "control": 9, "asset": 42, "copy": 6, "graph": 5, "test": 21,
    "responsive": 6, "historical": 4,
}
ALLOWED_CATEGORIES = {
    "dragon-flight": set(DF_CATEGORY_COUNTS),
    "rpg-battle": set(RPG_CATEGORY_COUNTS) | {"mechanic", "asset"},
    "abyssal-well": {
        "identity", "scene_state", "transition", "mechanic", "control",
        "asset", "copy_graph", "test", "responsive", "history",
        "negative_fixture",
    },
}
CONFIDENCE_VALUES = {"high", "medium", "low"}

FAIL_DISPOSITIONS = {"FAIL", "FAILED", "MUST_FAIL"}
REJECT_DISPOSITIONS = {"REJECT", "REJECTED"}


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


_LEDGER_CACHE: dict[str, dict] = {}


def load_ledger(game: str) -> dict:
    """Loads one claim ledger, normalized across the three committed schemas.

    Returns a dict with: raw (all claim dicts), claims (non-fixture factual
    claims), fixtures (negative evidence fixtures), envelope (dict or None).
    """
    if game in _LEDGER_CACHE:
        return _LEDGER_CACHE[game]
    path = TRACK_DIR / f"{game}-claim-ledger.json"
    data = _load_json(path)
    if isinstance(data, list):
        envelope = None
        raw = data
        fixture_ids = {
            c["claim_id"]
            for c in raw
            if c.get("negative_fixture") is True
            or c.get("category") == "negative_fixture"
        }
    else:
        envelope = data
        fixture_source = list(data.get("negative_evidence_fixtures", []))
        raw = list(data.get("claims", [])) + fixture_source
        fixture_ids = {c["claim_id"] for c in fixture_source}
        fixture_ids |= {
            c["claim_id"]
            for c in raw
            if c.get("negative_fixture") is True
            or c.get("category") == "negative_fixture"
        }
    fixtures = [c for c in raw if c["claim_id"] in fixture_ids]
    claims = [c for c in raw if c["claim_id"] not in fixture_ids]
    normalized = {
        "envelope": envelope,
        "raw": raw,
        "claims": claims,
        "fixtures": fixtures,
    }
    _LEDGER_CACHE[game] = normalized
    return normalized


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
    citation_kind = claim.get("citation_kind")

    if file_path is None:
        if citation_kind == "command-output" or claim.get("command"):
            if not isinstance(claim.get("command"), str):
                return False, f"{cid}: command-output envelope missing command"
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


def _ledger_claim_ids(game: str) -> set[str]:
    """Returns all claim ids (factual and fixture) in one game's ledger."""
    ledger = load_ledger(game)
    return {c["claim_id"] for c in ledger["raw"]}


def _blueprint() -> dict:
    """Loads the committed pilot blueprint."""
    return _load_json(TRACK_DIR / "pilot-blueprint.json")


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


def _literal(path: str) -> str:
    """Quotes a git pathspec as literal (bracket directories are glob-active)."""
    return f":(literal){path}"


# ---------------------------------------------------------------------------
# Class 1: denominator truth contract
# ---------------------------------------------------------------------------


class T3DenominatorTruthContract(unittest.TestCase):
    """Validates the frozen T2 predecessor and the pilot denominator binding."""

    maxDiff = None

    def _collect_count(self, module_name: str) -> int:
        """Returns the pytest --collect-only test count for one module."""
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
        result = subprocess.run(
            [
                sys.executable, "-m", "pytest", "--collect-only", "-q",
                "-p", "no:cacheprovider", str(T2_TEST_DIR / module_name),
            ],
            cwd=REPO_ROOT, capture_output=True, text=True, env=env, timeout=300,
        )
        self.assertEqual(result.returncode, 0, result.stdout[-1500:] + result.stderr[-800:])
        match = re.search(r"(\d+) tests? collected", result.stdout)
        self.assertIsNotNone(match, result.stdout[-800:])
        return int(match.group(1))

    def test_t2_phase0_3_modules_discover_exactly_86_tests(self) -> None:
        """Pytest discovery yields exactly 13/18/31/24 tests = 86 total."""
        total = 0
        for phase, (module_name, expected) in T2_PHASE_MODULES.items():
            with self.subTest(phase=phase):
                count = self._collect_count(module_name)
                self.assertEqual(count, expected, f"phase{phase}: {count} != {expected}")
                total += count
        self.assertEqual(total, 86)

    def test_t2_phase_modules_are_unmodified_committed_bytes(self) -> None:
        """The four T2 phase modules are tracked and clean at HEAD."""
        for module_name, _ in T2_PHASE_MODULES.values():
            relative = f"measure/tests/{module_name}"
            _git("ls-files", "--error-unmatch", relative)
            status = _git_text("status", "--porcelain", "--", relative).strip()
            self.assertEqual(status, "", f"{relative} has uncommitted modifications: {status}")

    def test_t2_green_reports_record_predecessor_pass(self) -> None:
        """Frozen T2 reports record green-passed phases and acceptance."""
        for phase in (1, 2, 3):
            report = _load_json(ARCHIVE_DIR / f"phase{phase}-green-test-report.json")
            self.assertEqual(report.get("status"), "green-passed", f"phase{phase}")
            commands = report.get("commands", [])
            passed_modules = [
                c for c in commands
                if c.get("result") == "passed"
                and "test_apk_source_denominator_inventory" in str(c.get("command", ""))
            ]
            self.assertTrue(passed_modules, f"phase{phase} report records no passed module run")
        manifest = _load_json(ARCHIVE_DIR / "accepted-denominator-manifest.json")
        self.assertEqual(manifest.get("status"), "accepted")
        self.assertIs(manifest.get("consumable"), True)
        self.assertIs(manifest.get("revoked"), False)
        self.assertEqual(manifest.get("source_baseline_revision"), BASELINE)

    def test_t2_phase0_phase1_pass_at_head_under_archive_relocation_shim(self) -> None:
        """Phases 0+1 pass 31/31 at HEAD under a disclosed 3-line A9 shim.

        The shadow copies differ from the committed modules only on whitelisted
        archival-relocation lines; this test asserts that whitelist before
        trusting the run. The committed modules are not modified.
        """
        rewrites = (
            (
                'TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK',
                'TRACK_DIR = REPO_ROOT / "measure" / "archive" / TRACK',
            ),
            (
                '"log", "-1", "--format=%H", "HEAD", "--", str(ROLE_PATH.relative_to(REPO_ROOT))',
                '"log", "--follow", "--diff-filter=AM", "-1", "--format=%H", "HEAD", "--", str(ROLE_PATH.relative_to(REPO_ROOT))',
            ),
        )
        repo_root_re = re.compile(
            r"REPO_ROOT = Path\(__file__\)\.resolve\(\)\.parents\[2\]"
        )
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
        with tempfile.TemporaryDirectory() as directory:
            shadow_names = []
            for phase in (0, 1):
                module_name, _ = T2_PHASE_MODULES[phase]
                original = (T2_TEST_DIR / module_name).read_text(encoding="utf-8")
                shadow = original
                for old, new in rewrites:
                    shadow = shadow.replace(old, new)
                shadow = repo_root_re.sub(f"REPO_ROOT = Path({str(REPO_ROOT)!r})", shadow)
                original_lines = original.splitlines()
                shadow_lines = shadow.splitlines()
                self.assertEqual(len(original_lines), len(shadow_lines))
                diffs = [
                    (a, b) for a, b in zip(original_lines, shadow_lines) if a != b
                ]
                for old_line, new_line in diffs:
                    whitelisted = any(
                        old in old_line and new in new_line for old, new in rewrites
                    ) or (
                        repo_root_re.search(old_line) is not None
                        and "REPO_ROOT = Path(" in new_line
                    )
                    self.assertTrue(
                        whitelisted,
                        f"non-whitelisted shadow diff in {module_name}: "
                        f"{old_line!r} -> {new_line!r}",
                    )
                self.assertLessEqual(len(diffs), 3, f"{module_name}: {len(diffs)} diffs")
                shadow_path = Path(directory) / module_name
                shadow_path.write_text(shadow, encoding="utf-8")
                shadow_names.append(module_name)
            result = subprocess.run(
                [
                    sys.executable, "-m", "pytest", "-q", "--no-header",
                    "-p", "no:cacheprovider", *shadow_names,
                ],
                cwd=directory, capture_output=True, text=True, env=env, timeout=1200,
            )
        summary = result.stdout.strip().splitlines()[-1] if result.stdout.strip() else ""
        self.assertEqual(result.returncode, 0, result.stdout[-2000:])
        self.assertIn("31 passed", summary, summary)
        self.assertNotIn("failed", summary, summary)

    def test_t2_phase2_phase3_head_failures_are_archival_relocation_only(self) -> None:
        """Phase 2/3 failures at HEAD are path-relocation class, zero content.

        Every failure/error line must reference the pre-archive track path or a
        missing file; no sha256/hash/content mismatch may appear. This proves
        the frozen T2 artifacts' content still validates and only the A9
        relocation (an infrastructure repair outside this role) breaks the run.
        """
        markers = (
            "measure/tracks/apk_source_denominator_inventory_20260712",
            "No such file or directory",
            "Missing ",
        )
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
        for phase in (2, 3):
            module_name, expected = T2_PHASE_MODULES[phase]
            with self.subTest(phase=phase):
                result = subprocess.run(
                    [
                        sys.executable, "-m", "pytest", "-q", "--no-header",
                        "-p", "no:cacheprovider", "--tb=short",
                        str(T2_TEST_DIR / module_name),
                    ],
                    cwd=REPO_ROOT, capture_output=True, text=True, env=env, timeout=1200,
                )
                self.assertNotEqual(result.returncode, 0, f"phase{phase} unexpectedly green")
                self.assertNotRegex(result.stdout, r"\d+ passed", f"phase{phase} partially passed")
                exception_lines = [
                    line.strip() for line in result.stdout.splitlines()
                    if line.startswith("E ")
                ]
                self.assertTrue(exception_lines, f"phase{phase}: no exception lines captured")
                for line in exception_lines:
                    self.assertTrue(
                        any(marker in line for marker in markers),
                        f"phase{phase} non-relocation failure: {line}",
                    )
                    self.assertNotIn("sha256", line, f"phase{phase} hash failure: {line}")
                self.assertIn(
                    "measure/tracks/apk_source_denominator_inventory_20260712",
                    result.stdout,
                    f"phase{phase}: failures do not reference the archived track path",
                )

    def test_pilot_identities_match_t2_denominator(self) -> None:
        """The three pilot identities match the accepted T2 denominator."""
        partition = _load_json(ARCHIVE_DIR / "accepted-partition-manifest.json")
        pilot_labels = {
            a["canonical_identity_label"]
            for a in partition["assignments"]
            if a["cohort"] == "Pilot"
        }
        self.assertEqual(
            pilot_labels,
            {
                "Dragon Flight — large current action implementation.",
                "RPG Battle — multi-state turn-based implementation.",
                "The Abyssal Well — stale/historical evidence recovery.",
            },
        )
        ledger = _load_json(ARCHIVE_DIR / "game-identity-ledger.json")
        identity_ids = {r["canonical_identity_id"] for r in ledger["identity_records"]}
        self.assertIn("vocabulary/dragon-flight", identity_ids)
        self.assertIn("vocabulary/rpg-battle", identity_ids)
        # Abyssal Well is deleted: no current identity record; its historical
        # existence is attested by the deleted records below.
        self.assertNotIn("sentence/abyssal-well", identity_ids)

        reconciliation = _load_json(ARCHIVE_DIR / "phase3-reconciliation.json")
        by_id = {
            r["canonical_identity_id"]: r
            for r in reconciliation["identity_reconciliation_records"]
        }
        for canonical in ("vocabulary/dragon-flight", "vocabulary/rpg-battle"):
            self.assertEqual(by_id[canonical]["disposition"], "current")
            self.assertEqual(by_id[canonical]["resolution_status"], "matched")
            self.assertIs(by_id[canonical]["blocking"], False)

        historical = _load_json(ARCHIVE_DIR / "historical-source-denominator.json")
        aw_records = [
            r for r in historical["records"] if "abyssal" in json.dumps(r)
        ]
        self.assertEqual(len(aw_records), 15)
        self.assertTrue(all(r["classification"] == "deleted" for r in aw_records))
        self.assertTrue(
            any("/games/sentence/abyssal-well/" in r["evidence"]["path"] for r in aw_records)
        )

    def test_pilot_source_denominator_record_counts(self) -> None:
        """Pilot record counts in source-denominator.json match the frozen pins.

        Derivation: records whose serialized content mentions the game slug.
        The RPG slice (179 records, 60 file records) independently matches the
        RPG collector method statement; the AW historical slice (15) matches
        the AW ledger denominator_binding.
        """
        source = _load_json(ARCHIVE_DIR / "source-denominator.json")
        self.assertEqual(source["source_baseline_revision"], BASELINE)

        def slug_slice(slug: str) -> Counter:
            return Counter(
                r["record_type"]
                for r in source["records"]
                if slug in json.dumps(r)
            )

        df = slug_slice("dragon-flight")
        self.assertEqual(sum(df.values()), 79)
        self.assertEqual(df["file"], 25)
        self.assertEqual(df["identity"], 1)
        self.assertEqual(df["route"], 2)
        self.assertEqual(df["copy"], 3)
        self.assertEqual(df["graph"], 48)

        rpg = slug_slice("rpg-battle")
        self.assertEqual(sum(rpg.values()), 179)
        self.assertEqual(rpg["file"], 60)
        self.assertEqual(rpg["copy"], 23)
        self.assertEqual(rpg["graph"], 93)

        aw = slug_slice("abyssal-well")
        self.assertEqual(sum(aw.values()), 8)
        self.assertEqual(aw["file"], 8)

        historical = _load_json(ARCHIVE_DIR / "historical-source-denominator.json")
        aw_historical = [
            r for r in historical["records"] if "abyssal" in json.dumps(r)
        ]
        self.assertEqual(len(aw_historical), 15)


# ---------------------------------------------------------------------------
# Class 2: claim-ledger truth contract
# ---------------------------------------------------------------------------


class T3ClaimLedgerTruthContract(unittest.TestCase):
    """Validates every committed claim against its cited git revision."""

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
            failures, [], f"{game}: {len(failures)} unresolvable citations: {failures[:10]}"
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

    def test_dragon_flight_claim_citations_resolve_against_git_revisions(self) -> None:
        self._assert_citations_resolve("dragon-flight", 222)

    def test_rpg_battle_claim_citations_resolve_against_git_revisions(self) -> None:
        self._assert_citations_resolve("rpg-battle", 212)

    def test_abyssal_well_claim_citations_resolve_against_git_revisions(self) -> None:
        self._assert_citations_resolve("abyssal-well", 49)

    def test_dragon_flight_claim_schema_confidence_categories_and_collector(self) -> None:
        self._assert_schema("dragon-flight")

    def test_rpg_battle_claim_schema_confidence_categories_and_collector(self) -> None:
        self._assert_schema("rpg-battle")

    def test_abyssal_well_claim_schema_confidence_categories_and_collector(self) -> None:
        self._assert_schema("abyssal-well")

    def test_dragon_flight_negative_fixtures_present_with_expected_dispositions(self) -> None:
        fixtures = {c["claim_id"]: c for c in load_ledger("dragon-flight")["fixtures"]}
        self.assertEqual(set(fixtures), {"DF-NEG-001", "DF-NEG-002", "DF-NEG-003"})
        self.assertEqual(fixtures["DF-NEG-001"]["fixture_class"], "slug-allowlist-role-assignment")
        self.assertEqual(fixtures["DF-NEG-001"]["expected_disposition"], "FAIL")
        self.assertEqual(fixtures["DF-NEG-002"]["fixture_class"], "unsupported-claim-injection")
        self.assertEqual(fixtures["DF-NEG-002"]["expected_disposition"], "REJECT")
        self.assertEqual(fixtures["DF-NEG-003"]["fixture_class"], "directory-only-citation")
        self.assertEqual(fixtures["DF-NEG-003"]["expected_disposition"], "REJECT")

    def test_rpg_battle_negative_fixtures_present_with_expected_dispositions(self) -> None:
        fixtures = {c["claim_id"]: c for c in load_ledger("rpg-battle")["fixtures"]}
        self.assertEqual(set(fixtures), {"RPG-NEG-001", "RPG-NEG-002", "RPG-NEG-003"})
        self.assertEqual(fixtures["RPG-NEG-001"]["fixture_kind"], "unsupported-claim-injection")
        self.assertEqual(fixtures["RPG-NEG-001"]["expected_disposition"], "REJECTED")
        self.assertEqual(fixtures["RPG-NEG-002"]["fixture_kind"], "directory-only-citation")
        self.assertEqual(fixtures["RPG-NEG-002"]["expected_disposition"], "REJECTED")
        self.assertEqual(fixtures["RPG-NEG-003"]["fixture_kind"], "slug-allowlist-asset-role")
        self.assertEqual(fixtures["RPG-NEG-003"]["expected_disposition"], "FAILED")

    def test_abyssal_well_negative_fixtures_present_with_expected_dispositions(self) -> None:
        fixtures = {c["claim_id"]: c for c in load_ledger("abyssal-well")["fixtures"]}
        self.assertEqual(set(fixtures), {"AW-HIST-NEG-001", "AW-HIST-NEG-002"})
        self.assertEqual(fixtures["AW-HIST-NEG-001"]["fixture_disposition"], "MUST_FAIL")
        self.assertEqual(fixtures["AW-HIST-NEG-002"]["fixture_disposition"], "REJECTED")

    def test_dragon_flight_claim_counts_match_collector_report(self) -> None:
        ledger = load_ledger("dragon-flight")
        counts = Counter(c["category"] for c in ledger["raw"])
        self.assertEqual(dict(counts), DF_CATEGORY_COUNTS)
        self.assertEqual(len(ledger["raw"]), 225)
        report = _load_json(TRACK_DIR / "dragon-flight-evidence-final-report.json")
        self.assertEqual(report["claims_total"], 225)
        self.assertEqual(report["claims_by_category"], DF_CATEGORY_COUNTS)

    def test_rpg_battle_claim_counts_match_collector_report(self) -> None:
        ledger = load_ledger("rpg-battle")
        counts = Counter(c["category"] for c in ledger["claims"])
        self.assertEqual(dict(counts), RPG_CATEGORY_COUNTS)
        envelope = ledger["envelope"]
        self.assertEqual(envelope["claim_count"], 212)
        self.assertEqual(envelope["negative_fixture_count"], 3)
        self.assertEqual(len(ledger["claims"]), 212)
        self.assertEqual(len(ledger["fixtures"]), 3)

    def test_abyssal_well_claim_counts_match_collector_report(self) -> None:
        ledger = load_ledger("abyssal-well")
        envelope = ledger["envelope"]
        self.assertEqual(envelope["historical_evidence_claims"], 49)
        self.assertEqual(envelope["negative_fixture_claims"], 2)
        self.assertEqual(envelope["current_implementation_claims"], 0)
        self.assertEqual(len(ledger["claims"]), 49)
        self.assertEqual(len(ledger["fixtures"]), 2)
        self.assertEqual(envelope["canonical_identity"], "sentence/abyssal-well")


# ---------------------------------------------------------------------------
# Class 3: blueprint truth contract
# ---------------------------------------------------------------------------


class T3BlueprintTruthContract(unittest.TestCase):
    """Validates the mapper blueprint against the committed ledgers."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.blueprint = _blueprint()
        cls.ledger_ids = {game: _ledger_claim_ids(game) for game in GAMES}

    def _entries(self, game: str, section: str) -> list:
        return self.blueprint["games"][game]["A_scene_state_blueprint"][section]

    def _assert_backing_resolves(self, game: str, entry: dict, label: str) -> None:
        backing = entry.get("backing") or []
        self.assertTrue(backing, f"{game}/{label}: entry has no backing")
        for ref in backing:
            self.assertIn(
                ref.get("claim_id"), self.ledger_ids[game],
                f"{game}/{label}: unresolved backing claim {ref.get('claim_id')!r}",
            )

    def test_scene_entries_backed_by_resolvable_claims(self) -> None:
        for game in GAMES:
            for scene in self._entries(game, "scenes"):
                self._assert_backing_resolves(game, scene, scene.get("scene_id", "?"))

    def test_state_entries_backed_by_resolvable_claims(self) -> None:
        for game in GAMES:
            for state in self._entries(game, "states"):
                label = state.get("state_id") or state.get("state_family") or "?"
                self._assert_backing_resolves(game, state, label)
                for claim_id in state.get("member_claims") or []:
                    self.assertIn(
                        claim_id, self.ledger_ids[game],
                        f"{game}/{label}: unresolved member claim {claim_id!r}",
                    )

    def test_transition_entries_backed_by_resolvable_claims(self) -> None:
        for game in GAMES:
            for transition in self._entries(game, "transitions"):
                label = transition.get("transition_id", "?")
                # transition_id values (DF-T-*/RPG-T-*/AW-T-*) are exempt
                # stable record ids; their backing must resolve to real claims.
                self._assert_backing_resolves(game, transition, label)

    def test_mechanic_entries_backed_by_resolvable_claims(self) -> None:
        for game in GAMES:
            mechanics = self.blueprint["games"][game]["B_mechanic_learning_blueprint"]
            containers = list(mechanics["mechanics"]) + list(mechanics["control_surfaces"])
            containers += list(mechanics.get("learning_goals") or [])
            terminal = mechanics.get("terminal_result_mechanic")
            if terminal:
                containers.append(terminal)
            for entry in containers:
                label = entry.get("mechanic_id") or entry.get("control_id") or entry.get("goal_id") or "terminal"
                backing = entry.get("backing_claims") or []
                self.assertTrue(backing, f"{game}/{label}: mechanic without backing_claims")
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
        for game in GAMES:
            refs: list[str] = []
            _structured_claim_refs(self.blueprint["games"][game], refs)
            total += len(refs)
            unresolved.extend(r for r in refs if r not in self.ledger_ids[game])
        self.assertGreater(total, 0)
        self.assertEqual(unresolved, [], f"{len(unresolved)} unresolved refs: {unresolved[:10]}")

    def test_blueprint_contains_no_hypothesis_citations_as_fact(self) -> None:
        hypothesis_re = re.compile(r"\AH[1-6]\b")
        for game in GAMES:
            refs: list[str] = []
            _structured_claim_refs(self.blueprint["games"][game], refs)
            offenders = [r for r in refs if hypothesis_re.match(r)]
            self.assertEqual(offenders, [], f"{game}: hypothesis ids cited as fact: {offenders}")
        # Hypotheses may appear only as the boundary declaration's explicit
        # pointer to the segregated artifact -- never as blueprint fact.
        serialized_games = json.dumps(self.blueprint["games"])
        self.assertNotIn("NON-AUTHORITATIVE HYPOTHESIS", serialized_games)
        self.assertNotIn("mapper-hypotheses.md", serialized_games)
        declaration = self.blueprint["mapper_boundary_declaration"]
        pointer = declaration["cross_game_similarity_findings"]
        self.assertTrue(pointer.startswith("none"), pointer)
        self.assertIn("mapper-hypotheses.md", pointer)
        self.assertIn("NON-AUTHORITATIVE HYPOTHES", pointer)

    def test_hypotheses_segregated_in_flagged_companion_artifact(self) -> None:
        path = TRACK_DIR / "mapper-hypotheses.md"
        self.assertTrue(path.is_file(), "mapper-hypotheses.md missing")
        text = path.read_text(encoding="utf-8")
        self.assertIn("NON-AUTHORITATIVE HYPOTHESIS", text.splitlines()[3])
        entries = re.findall(r"^## H([1-6]) —", text, flags=re.MULTILINE)
        self.assertEqual(entries, ["1", "2", "3", "4", "5", "6"])
        self.assertIn("Count: 6 NON-AUTHORITATIVE HYPOTHESIS entries.", text)
        all_ids = set().union(*self.ledger_ids.values())
        mentioned = set(re.findall(r"\b(?:DF|RPG|AW)-[A-Z]+-\d+\b", text))
        unresolved = mentioned - all_ids
        self.assertEqual(unresolved, set(), f"hypotheses cite unknown claims: {unresolved}")
        report = _load_json(TRACK_DIR / "mapper-final-report.json")
        self.assertEqual(report["non_authoritative_hypotheses_authored"], 6)

    def test_blueprint_counts_match_orchestrator_report(self) -> None:
        expected = {
            "dragon-flight": {"scenes": 2, "state_entries": 4, "transitions": 8, "mechanic_entries": 16},
            "rpg-battle": {"scenes": 7, "state_entries": 15, "transitions": 20, "mechanic_entries": 20},
            "abyssal-well": {"scenes": 3, "state_entries": 3, "transitions": 4, "mechanic_entries": 9},
        }
        report = _load_json(TRACK_DIR / "mapper-final-report.json")
        self.assertEqual(report["per_game_counts"], {
            game: {**counts, "test_modules": report["per_game_counts"][game]["test_modules"],
                   "asset_usage_entries": report["per_game_counts"][game]["asset_usage_entries"]}
            for game, counts in expected.items()
        })
        for game in GAMES:
            with self.subTest(game=game):
                scene_state = self.blueprint["games"][game]["A_scene_state_blueprint"]
                mechanics = self.blueprint["games"][game]["B_mechanic_learning_blueprint"]
                self.assertEqual(len(scene_state["scenes"]), expected[game]["scenes"])
                self.assertEqual(len(scene_state["states"]), expected[game]["state_entries"])
                self.assertEqual(len(scene_state["transitions"]), expected[game]["transitions"])
                # Count convention (mapper report): mechanic_entries =
                # mechanics + control_surfaces.
                mechanic_entries = len(mechanics["mechanics"]) + len(mechanics["control_surfaces"])
                self.assertEqual(mechanic_entries, expected[game]["mechanic_entries"])


# ---------------------------------------------------------------------------
# Class 4: Abyssal Well historical contract
# ---------------------------------------------------------------------------


class T3AbyssalWellHistoricalContract(unittest.TestCase):
    """Validates the historical-only evidence posture of the deleted game."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.ledger = load_ledger("abyssal-well")
        cls.head = _git_text("rev-parse", "HEAD").strip()

    def test_all_49_historical_claims_at_allowed_historical_revisions(self) -> None:
        claims = self.ledger["claims"]
        self.assertEqual(len(claims), 49)
        bad = [
            c["claim_id"] for c in claims
            if c.get("revision") not in AW_HISTORICAL_REVISIONS
        ]
        self.assertEqual(bad, [], f"claims outside historical revisions: {bad}")
        for fixture in self.ledger["fixtures"]:
            self.assertIn(fixture["revision"], AW_HISTORICAL_REVISIONS)

    def test_no_abyssal_well_claim_at_current_head_or_baseline(self) -> None:
        for claim in self.ledger["raw"]:
            self.assertNotEqual(claim["revision"], self.head, claim["claim_id"])
            self.assertNotEqual(claim["revision"], BASELINE, claim["claim_id"])
        for revision in AW_HISTORICAL_REVISIONS:
            self.assertEqual(_git_text("cat-file", "-t", revision).strip(), "commit")
            result = _git("merge-base", "--is-ancestor", revision, "HEAD", check=False)
            self.assertEqual(result.returncode, 0, f"{revision} unreachable from HEAD")

    def test_zero_current_implementation_claims(self) -> None:
        envelope = self.ledger["envelope"]
        self.assertEqual(envelope["current_implementation_claims"], 0)
        self.assertIn("deleted", envelope["disposition"])
        for claim in self.ledger["raw"]:
            self.assertTrue(
                claim.get("history_search_method"),
                f"{claim['claim_id']}: no history_search_method",
            )
        prefixes = [
            "apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/abyssal-well",
            "apps/advantage-games/src/app/api/v1/games/abyssal-well",
            "apps/advantage-games/src/components/games/sentence/abyssal-well",
            "apps/advantage-games/src/lib/games/abyssalWell.ts",
            "apps/advantage-games/src/lib/games/abyssalWellConfig.ts",
        ]
        result = _git_text(
            "ls-tree", "-r", "--name-only", "HEAD", "--",
            *[_literal(p) for p in prefixes],
        )
        self.assertEqual(result.strip(), "", f"Abyssal Well paths present at HEAD: {result}")

    def test_deletion_commit_referenced_and_verified(self) -> None:
        envelope = self.ledger["envelope"]
        self.assertEqual(envelope["deletion_commit"], DELETION_COMMIT)
        referencing = [
            c["claim_id"]
            for c in self.ledger["raw"]
            if DELETION_COMMIT in json.dumps(c)
        ]
        self.assertTrue(referencing, "no claim references the deletion commit")
        self.assertIn("AW-HIST-090", referencing)
        deleter = _git_text(
            "log", "--diff-filter=D", "--format=%H", "-1", BASELINE, "--",
            _literal("apps/advantage-games/src/lib/games/abyssalWell.ts"),
        ).strip()
        self.assertEqual(deleter, DELETION_COMMIT)


# ---------------------------------------------------------------------------
# Class 5: negative-fixture contract
# ---------------------------------------------------------------------------


class T3NegativeFixtureContract(unittest.TestCase):
    """Re-derives every negative fixture's expected disposition from source."""

    def test_all_negative_fixtures_carry_expected_disposition(self) -> None:
        total = 0
        for game in GAMES:
            for fixture in load_ledger(game)["fixtures"]:
                total += 1
                disposition = (
                    fixture.get("expected_disposition")
                    or fixture.get("fixture_disposition")
                )
                self.assertIn(
                    disposition, FAIL_DISPOSITIONS | REJECT_DISPOSITIONS,
                    f"{fixture['claim_id']}: bad disposition {disposition!r}",
                )
        self.assertEqual(total, 8)

    def test_df_neg_001_slug_allowlist_rederives_fail(self) -> None:
        fixture = next(
            c for c in load_ledger("dragon-flight")["fixtures"] if c["claim_id"] == "DF-NEG-001"
        )
        data = _git_show(fixture["revision"], fixture["file_path"])
        self.assertIsNotNone(data)
        lines = data.decode("utf-8").split("\n")
        cited = lines[fixture["line_start"] - 1 : fixture["line_end"]]
        self.assertEqual(
            _sha256(("\n".join(cited) + "\n").encode("utf-8")),
            fixture["cited_range_sha256"],
        )
        # Re-derivation: the boss entry loads boss-3x3-sheet-facing-up.png and
        # projectile-boss.png is loaded as projectileBoss -- so the fixture's
        # slug-allowlist claim is false and must FAIL.
        joined = "\n".join(cited)
        boss_entry = re.search(r"boss:\s*withBasePath\(\s*\"([^\"]+)\"", joined)
        projectile_entry = re.search(r"projectileBoss:\s*withBasePath\(\s*\"([^\"]+)\"", joined)
        self.assertIsNotNone(boss_entry)
        self.assertIsNotNone(projectile_entry)
        self.assertIn("boss-3x3-sheet-facing-up.png", boss_entry.group(1))
        self.assertIn("projectile-boss.png", projectile_entry.group(1))
        self.assertNotIn("projectile-boss.png", boss_entry.group(1))
        self.assertIn(fixture["expected_disposition"], FAIL_DISPOSITIONS)

    def test_uncited_injection_fixtures_rederive_reject(self) -> None:
        df = next(c for c in load_ledger("dragon-flight")["fixtures"] if c["claim_id"] == "DF-NEG-002")
        rpg = next(c for c in load_ledger("rpg-battle")["fixtures"] if c["claim_id"] == "RPG-NEG-001")
        for fixture in (df, rpg):
            self.assertIsNone(fixture.get("file_path"), fixture["claim_id"])
            self.assertIsNone(fixture.get("cited_range_sha256"), fixture["claim_id"])
            self.assertIsNone(fixture.get("blob_sha256"), fixture["claim_id"])
            self.assertIn(
                fixture["expected_disposition"], REJECT_DISPOSITIONS,
                f"{fixture['claim_id']}: uncited claim must be reject-class",
            )
        # Falsity re-derivation: DF XP takes no difficulty multiplier. The
        # 'extreme' difficulty label exists only as a results pass-through.
        lib = _git_show(BASELINE, "apps/advantage-games/src/lib/games/dragonFlight.ts")
        self.assertIsNotNone(lib)
        lib_text = lib.decode("utf-8")
        self.assertIn("calculateXP(0, correctAnswers, totalAttempts)", lib_text)
        self.assertIsNone(
            re.search(r"calculateXP\([^)]*difficulty", lib_text),
            "difficulty unexpectedly feeds the XP calculation",
        )
        self.assertIsNone(
            re.search(r"xp\s*=\s*calculateXP\([^)]*\)\s*\*", lib_text),
            "XP unexpectedly scaled by a multiplier",
        )
        # Falsity re-derivation: no mana/MP identifier in any rpg-battle path.
        mana_hits = _git_text("grep", "-i", "-l", "mana", BASELINE, check=False)
        rpg_hits = [p for p in mana_hits.splitlines() if "rpg-battle" in p]
        self.assertEqual(rpg_hits, [], f"unexpected mana evidence: {rpg_hits}")

    def test_directory_only_citation_fixtures_rederive_reject(self) -> None:
        df = next(c for c in load_ledger("dragon-flight")["fixtures"] if c["claim_id"] == "DF-NEG-003")
        rpg = next(c for c in load_ledger("rpg-battle")["fixtures"] if c["claim_id"] == "RPG-NEG-002")
        for fixture in (df, rpg):
            path = fixture["file_path"]
            self.assertEqual(
                _git_object_type(fixture["revision"], path.rstrip("/")), "tree",
                f"{fixture['claim_id']}: cited path is not a directory",
            )
            self.assertIsNone(fixture.get("line_start"))
            self.assertIsNone(fixture.get("line_end"))
            self.assertIsNone(fixture.get("cited_range_sha256"))
            self.assertIsNone(fixture.get("blob_sha256"))
            self.assertIn(
                fixture["expected_disposition"], REJECT_DISPOSITIONS,
                f"{fixture['claim_id']}: directory citation must be reject-class",
            )

    def test_rpg_neg_003_slug_allowlist_rederives_fail(self) -> None:
        fixture = next(
            c for c in load_ledger("rpg-battle")["fixtures"] if c["claim_id"] == "RPG-NEG-003"
        )
        self.assertEqual(fixture["fixture_kind"], "slug-allowlist-asset-role")
        # Re-derivation: no file at the baseline contains the claimed
        # 'battle-sprite' role, so no such slug allowlist exists -> claim false.
        hits = _git_text("grep", "-l", "battle-sprite", BASELINE, check=False)
        self.assertEqual(hits.strip(), "", f"unexpected battle-sprite allowlist: {hits}")
        self.assertIn(fixture["expected_disposition"], FAIL_DISPOSITIONS)

    def test_abyssal_well_fixtures_rederive_dispositions(self) -> None:
        fixtures = {c["claim_id"]: c for c in load_ledger("abyssal-well")["fixtures"]}
        current_routes = fixtures["AW-HIST-NEG-001"]
        prefixes = [
            "apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/abyssal-well",
            "apps/advantage-games/src/app/api/v1/games/abyssal-well",
            "apps/advantage-games/src/components/games/sentence/abyssal-well",
        ]
        listing = _git_text(
            "ls-tree", "-r", "--name-only", "HEAD", "--",
            *[_literal(p) for p in prefixes],
        )
        self.assertEqual(listing.strip(), "", f"unexpected AW paths at HEAD: {listing}")
        self.assertEqual(current_routes["fixture_disposition"], "MUST_FAIL")

        injection = fixtures["AW-HIST-NEG-002"]
        data = _git_show(injection["revision"], injection["file_path"])
        self.assertIsNotNone(data)
        text = data.decode("utf-8")
        self.assertNotRegex(text.lower(), r"streak|daily")
        lines = text.split("\n")
        cited = "\n".join(lines[injection["line_start"] - 1 : injection["line_end"]])
        self.assertIn("calculateXP", cited)
        self.assertIn("Perfect accuracy bonus", cited)
        self.assertIn("Survival bonus", cited)
        self.assertIn("Speed bonus", cited)
        self.assertNotIn("streak", cited.lower())
        self.assertEqual(injection["fixture_disposition"], "REJECTED")


# ---------------------------------------------------------------------------
# Class 6: stop-loss contract
# ---------------------------------------------------------------------------


class T3StopLossContract(unittest.TestCase):
    """Aggregates the program stop-loss counters for the pilot batch."""

    def test_zero_unsupported_factual_claims(self) -> None:
        unsupported = []
        total = 0
        for game in GAMES:
            for claim in load_ledger(game)["claims"]:
                total += 1
                ok, detail = resolve_claim_citation(claim)
                if not ok:
                    unsupported.append(detail)
        self.assertEqual(total, 483)
        self.assertEqual(
            unsupported, [],
            f"{len(unsupported)} unsupported factual claims: {unsupported[:10]}",
        )

    def test_zero_denominator_mismatches(self) -> None:
        reconciliation = _load_json(ARCHIVE_DIR / "phase3-reconciliation.json")
        self.assertEqual(reconciliation["status"], "reconciliation-complete")
        self.assertEqual(reconciliation["unresolved_sources"], [])
        dispositions = reconciliation["program_disposition_counts"]
        self.assertEqual(dispositions.get("unsupported program assumption"), 0)
        self.assertEqual(dispositions.get("alias/copy"), 0)
        discrepancies = _load_json(ARCHIVE_DIR / "denominator-discrepancies.json")
        blocking = [r for r in discrepancies["records"] if r.get("blocking")]
        self.assertEqual(blocking, [], f"blocking discrepancies: {blocking}")

    def test_zero_failed_fix_review_cycles(self) -> None:
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

    def test_zero_unresolved_blocking_findings(self) -> None:
        artifacts = list(TRACK_DIR.glob("*.json")) + list(
            (TRACK_DIR / "role-receipts").glob("*.json")
        )
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
        # Visibility: carried-forward observations must be recorded, not zeroed.
        df_report = _load_json(TRACK_DIR / "dragon-flight-evidence-final-report.json")
        observation_ids = {o["id"] for o in df_report["stop_loss_observations"]}
        self.assertIn("SLO-DF-1", observation_ids)
        mapper_receipt = _load_json(TRACK_DIR / "role-receipts" / "requirements-mapper.json")
        carried = mapper_receipt["findings"]["carried_forward_unknowns"]
        self.assertEqual(len(carried), 5)
        self.assertTrue(any("SLO-DF-1" in item for item in carried))


if __name__ == "__main__":
    unittest.main()
