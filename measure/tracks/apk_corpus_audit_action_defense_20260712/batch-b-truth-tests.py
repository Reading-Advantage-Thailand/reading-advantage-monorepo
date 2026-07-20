"""Auditable truth contracts for T4 Batch B evidence and acceptance stages.

The suite deliberately leaves later-stage and provenance gates RED until their
artifacts and authentic role metadata exist.  Assertion failures prefixed with
``EXPECTED_STAGE_RED`` are planned gate failures; an ERROR is never an expected
RED and indicates a defect in this module or an unreadable artifact.
"""

from __future__ import annotations

import hashlib
import inspect
import json
import math
import re
import subprocess
import unittest
from collections import Counter
from pathlib import Path
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = REPO_ROOT / "measure/tracks/apk_corpus_audit_action_defense_20260712"
RECEIPTS_DIR = TRACK_DIR / "role-receipts"
PHASE = "Phase 2: Batch B evidence packages"
PHASE_BASE_SHA = "ff01cee9cc973dee89fdc0ba22102dcea0c50542"
ROLE_BASE_SHA = "6606c29fff3b38ab95c8c5dd865f11762230109d"
SOURCE_BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
ALLOWED_INPUT_MANIFEST_SHA256 = (
    "e47a9e95fec45b4f2c03834a09d9ca56f62d18e03d6f29af56b1d3642ec71717"
)
BUDGET_SHA256 = "7d649b94d28ddc4538b79ba68a7e0cd71597ec2968ca7ae09874cf817a8b0f2f"
HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")

GAMES = {
    "village-guardian": "Village Guardian",
    "archers-revenge": "Archer's Revenge",
    "storm-castle-tower": "Storm the Castle Tower",
}
IDENTITIES = {
    "village-guardian": "sentence/village-guardian",
    "archers-revenge": "catalog/archers-revenge",
    "storm-castle-tower": "catalog/storm-castle-tower",
}
FACTUAL_TOTALS = {"village-guardian": 12, "archers-revenge": 8, "storm-castle-tower": 42}
FIXTURE_TOTALS = {game: 4 for game in GAMES}
ASSET_CANDIDATE_TOTALS = {"village-guardian": 4, "archers-revenge": 5, "storm-castle-tower": 3}

EXPECTED_PREDECESSORS = {
    "t1_gate_version": "phase4-v8-candidate",
    "t1_gate_commit": "5aea360f94f978ac78e590e0a64d33d176beaa1a",
    "t2_accepted_denominator_sha256": "d524171dbc412a213ed4be7ad7a77e2eb404e7c5bf4a5debe2ad68dd121b5729",
    "t2_accepted_partition_sha256": "6badf73b625567b3fc6d4558c52ab68bd0e4fe2fb3afe3792aca4126df2d27b0",
    "t3_accepted_pilot_sha256": "cbf04753aa21b0c43999ea202b718573616472a16dce94961242fdcb0260ca1b",
    "batch_a_accepted_sha256": "b096d911b7d6bc9fb4d530e695cea10d3816a17158447a89303c2d069cf2a54c",
    "source_baseline_revision": SOURCE_BASELINE,
}
PREDECESSOR_PATHS = {
    "t2_accepted_denominator_sha256": REPO_ROOT / "measure/archive/apk_source_denominator_inventory_20260712/accepted-denominator-manifest.json",
    "t2_accepted_partition_sha256": REPO_ROOT / "measure/archive/apk_source_denominator_inventory_20260712/accepted-partition-manifest.json",
    "t3_accepted_pilot_sha256": REPO_ROOT / "measure/archive/apk_three_game_truth_pilot_20260712/accepted-pilot-manifest.json",
    "batch_a_accepted_sha256": TRACK_DIR / "accepted-cohort-manifest-batch-a.json",
}

LEDGER_PATHS = {game: TRACK_DIR / f"{game}-claim-ledger-batch-b.json" for game in GAMES}
REPORT_PATHS = {game: TRACK_DIR / f"{game}-evidence-final-report-batch-b.json" for game in GAMES}
BLUEPRINT_PATHS = {game: TRACK_DIR / f"{game}-blueprint-batch-b.json" for game in GAMES}
HYPOTHESIS_PATHS = {game: TRACK_DIR / f"{game}-mapper-hypotheses-batch-b.md" for game in GAMES}
MAPPER_REPORT_PATHS = {game: TRACK_DIR / f"{game}-mapper-final-report-batch-b.json" for game in GAMES}

CURRENT_RECEIPTS = (
    "discovery-auditor-batch-b.json",
    "evidence-collector-village-guardian-batch-b.json",
    "evidence-collector-archers-revenge-batch-b.json",
    "evidence-collector-storm-castle-tower-batch-b.json",
    "requirements-mapper-village-guardian-batch-b.json",
    "requirements-mapper-archers-revenge-batch-b.json",
    "requirements-mapper-storm-castle-tower-batch-b.json",
    "truth-test-author-batch-b.json",
)

_JSON_CACHE: dict[Path, Any] = {}
_GIT_CACHE: dict[tuple[str, str], bytes | None] = {}


def load_json(path: Path) -> Any:
    """Loads a JSON artifact without allowing a missing file to become an ERROR."""
    if path not in _JSON_CACHE:
        if not path.is_file():
            return None
        try:
            _JSON_CACHE[path] = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            _JSON_CACHE[path] = {"__parse_error__": f"{type(exc).__name__}: {exc}"}
    return _JSON_CACHE[path]


def sha256(data: bytes) -> str:
    """Returns the lowercase SHA-256 digest for exact bytes."""
    return hashlib.sha256(data).hexdigest()


def file_sha256(path: Path) -> str:
    """Returns the lowercase SHA-256 digest for one file."""
    return sha256(path.read_bytes())


def git(*args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs a read-only Git command and captures its exact byte streams."""
    return subprocess.run(["git", *args], cwd=REPO_ROOT, capture_output=True, check=False)


def git_show(revision: str, path: str) -> bytes | None:
    """Returns exact bytes for a reachable ``revision:path`` Git object."""
    key = (revision, path)
    if key not in _GIT_CACHE:
        result = git("show", f"{revision}:{path}")
        _GIT_CACHE[key] = result.stdout if result.returncode == 0 else None
    return _GIT_CACHE[key]


def ledger(game: str) -> dict[str, Any]:
    """Returns one parsed game ledger or a parse sentinel."""
    value = load_json(LEDGER_PATHS[game])
    return value if isinstance(value, dict) else {"__parse_error__": "not a JSON object"}


def claims(game: str) -> list[dict[str, Any]]:
    """Returns only factual claims; fixture arrays are never promoted."""
    value = ledger(game).get("claims", [])
    return value if isinstance(value, list) else []


def fixtures(game: str) -> list[dict[str, Any]]:
    """Returns the explicitly separate negative-fixture records."""
    value = ledger(game).get("negative_fixtures", [])
    return value if isinstance(value, list) else []


def claim_id(record: dict[str, Any]) -> str:
    """Returns a factual claim's stable identifier."""
    return str(record.get("claim_id", ""))


def fixture_id(record: dict[str, Any]) -> str:
    """Returns a negative fixture's stable identifier across ledger schemas."""
    return str(record.get("fixture_id", record.get("claim_id", "")))


def source_fact(record: dict[str, Any]) -> str:
    """Returns the declared source fact across the three collector schemas."""
    return str(record.get("source_fact", record.get("exact_source_fact", "")))


def range_bounds(record: dict[str, Any]) -> tuple[str, int, int] | None:
    """Normalizes a claim's textual or binary inclusive range."""
    value = record.get("inclusive_range")
    if isinstance(value, str):
        match = re.fullmatch(r"(\d+)\.\.(\d+)", value)
        return ("lines", int(match.group(1)), int(match.group(2))) if match else None
    if not isinstance(value, dict):
        return None
    if "start_line" in value and "end_line" in value:
        return "lines", value["start_line"], value["end_line"]
    if "start" in value and "end" in value:
        return str(value.get("kind", "lines")), value["start"], value["end"]
    return None


def citation_bytes(record: dict[str, Any]) -> tuple[bytes | None, str | None]:
    """Resolves one positive source citation exclusively through Git objects."""
    cid = claim_id(record)
    revision = record.get("source_revision")
    path = record.get("relative_path")
    if not isinstance(revision, str) or not HEX40.fullmatch(revision):
        return None, f"{cid}: malformed source_revision"
    commit = git("cat-file", "-e", f"{revision}^{{commit}}")
    if commit.returncode != 0:
        return None, f"{cid}: unreachable revision {revision}"
    if not isinstance(path, str) or not path or Path(path).is_absolute() or ".." in Path(path).parts:
        return None, f"{cid}: invalid relative_path"
    object_type = git("cat-file", "-t", f"{revision}:{path}")
    if object_type.returncode != 0:
        return None, f"{cid}: missing Git object {revision}:{path}"
    if object_type.stdout.strip() != b"blob":
        return None, f"{cid}: citation is {object_type.stdout.decode(errors='replace').strip()}, not blob"
    data = git_show(revision, path)
    return (data, None) if data is not None else (None, f"{cid}: git show failed")


def citation_error(record: dict[str, Any]) -> str | None:
    """Returns the exact positive-envelope defect, if any."""
    cid = claim_id(record)
    data, error = citation_bytes(record)
    if error:
        return error
    assert data is not None
    blob_hash = record.get("blob_sha256")
    range_hash = record.get("cited_range_sha256")
    if not isinstance(blob_hash, str) or not HEX64.fullmatch(blob_hash):
        return f"{cid}: malformed blob_sha256"
    if sha256(data) != blob_hash:
        return f"{cid}: blob_sha256 mismatch"
    if not isinstance(range_hash, str) or not HEX64.fullmatch(range_hash):
        return f"{cid}: malformed cited_range_sha256"
    bounds = range_bounds(record)
    if bounds is None:
        return f"{cid}: malformed inclusive_range"
    kind, start, end = bounds
    if isinstance(start, bool) or isinstance(end, bool) or not isinstance(start, int) or not isinstance(end, int):
        return f"{cid}: range bounds are not labeled integers"
    if kind == "bytes":
        if (start, end) != (0, len(data) - 1):
            return f"{cid}: binary citation is not a whole-file envelope"
        return None if range_hash == blob_hash else f"{cid}: binary range hash mismatch"
    try:
        data.decode("utf-8")
    except UnicodeDecodeError:
        return None if range_hash == blob_hash else f"{cid}: binary line citation is not whole-file"
    lines = data.splitlines(keepends=True)
    if not 1 <= start <= end <= len(lines):
        return f"{cid}: inclusive range {start}..{end} outside 1..{len(lines)}"
    selected = b"".join(lines[start - 1 : end])
    return None if sha256(selected) == range_hash else f"{cid}: cited_range_sha256 mismatch"


def cited_text(record: dict[str, Any]) -> str:
    """Returns decoded text for the exact cited range."""
    data, error = citation_bytes(record)
    if error or data is None:
        return ""
    bounds = range_bounds(record)
    if bounds is None or bounds[0] == "bytes":
        return ""
    _, start, end = bounds
    try:
        return b"".join(data.splitlines(keepends=True)[start - 1 : end]).decode("utf-8")
    except UnicodeDecodeError:
        return ""


def mechanical_semantic_check(
    text: str, proposition: str, *, semantic_kind: str = "literal"
) -> tuple[bool, list[str]]:
    """Checks mechanically decidable atoms without pretending to prove prose semantics.

    Routes, quoted code literals, and numeric literals are exact-source atoms.  A
    reachable-transition assertion additionally requires a source mutation to
    its target; a union/type declaration alone cannot satisfy it.
    """
    required: set[str] = set()
    required.update(
        route.rstrip(".,;:)")
        for route in re.findall(r"/api/[A-Za-z0-9_./?=&${}-]+", proposition)
    )
    required.update(re.findall(r"['\"]([A-Za-z0-9_./?=&${}-]+)['\"]", proposition))
    required.update(
        re.findall(r"(?<![\w-])\d+(?:\.\d+)?(?=\s*(?:ms|px|vh)?\b)", proposition)
    )
    missing = sorted(
        atom
        for atom in required
        if not (re.fullmatch(r"\d+(?:\.\d+)?", atom) and re.search(rf"(?<!\d){re.escape(atom)}(?!\d)", text))
        and atom not in text
    )
    if semantic_kind == "reachable-transition":
        targets = re.findall(r"(?:to|reachable)\s+['\"]?([A-Za-z][\w-]*)['\"]?", proposition, re.I)
        target = targets[-1] if targets else "victory"
        mutation = re.search(
            rf"(?:set[A-Za-z]*\s*\(\s*['\"]{re.escape(target)}['\"]|"
            rf"(?:status|phase)\s*:\s*['\"]{re.escape(target)}['\"])",
            text,
            re.I,
        )
        if mutation is None:
            missing.append(f"guard/mutation/target evidence for {target}")
    if semantic_kind == "immediate-terminal":
        if "immediate" not in text.lower() and re.search(r"\bif\b|<=|at most", text, re.I):
            missing.append("unconditional/immediate terminal evidence")
    return bool(required) or semantic_kind != "literal", missing


def run_safe_recorded_git(command: str) -> subprocess.CompletedProcess[bytes] | None:
    """Executes only recorded argument-vector Git commands without a shell."""
    import shlex

    try:
        args = shlex.split(command)
    except ValueError:
        return None
    if not args or args[0] != "git" or any(token in {"|", ";", "&&", "||"} for token in args):
        return None
    return git(*args[1:])


def bounded_envelope_errors(game: str) -> list[str]:
    """Re-derives every bounded absence/query envelope for a game."""
    errors: list[str] = []
    doc = ledger(game)
    if game == "storm-castle-tower":
        query_records = doc.get("bounded_query_evidence", [])
        for record in query_records:
            qid = record.get("query_id", "<missing-query-id>")
            expected = str(record.get("exact_stdout", "")).encode()
            if sha256(expected) != record.get("stdout_sha256"):
                errors.append(f"{qid}: declared stdout hash mismatch")
                continue
            actual: bytes | None = None
            rc: int | None = None
            if qid == "SCT-Q-BASELINE-TREE":
                result = git("ls-tree", "-r", "--name-only", SOURCE_BASELINE, "--", "apps/advantage-games/src", "apps/advantage-games/public", "packages/game-cartridges/src")
                matches = sorted(line for line in result.stdout.decode().splitlines() if "storm-castle-tower" in line)
                actual = ("\n".join(matches) + ("\n" if matches else "")).encode()
                rc = result.returncode
            elif qid in {"SCT-Q-ASSET-BASELINE", "SCT-Q-ASSET-APP-HISTORY", "SCT-Q-ASSET-CARTRIDGE-HISTORY", "SCT-Q-DIRECTORY-TYPE", "SCT-Q-APP-DELETION", "SCT-Q-CARTRIDGE-DELETION"}:
                result = run_safe_recorded_git(record["command"])
                if result is not None:
                    actual, rc = result.stdout, result.returncode
            elif qid == "SCT-Q-CHRONOLOGY":
                lines = []
                for revision in record["search_domain"]:
                    shown = git("show", "-s", "--format=%H\t%aI\t%s", revision)
                    ancestor = git("merge-base", "--is-ancestor", revision, SOURCE_BASELINE)
                    lines.append(shown.stdout.decode().rstrip("\n") + f"\tancestor_of_baseline={str(ancestor.returncode == 0).lower()}")
                actual, rc = ("\n".join(lines) + "\n").encode(), 0
            if actual is None or rc is None:
                errors.append(f"{qid}: query is not safely executable")
            elif actual != expected or rc != record.get("exit_status"):
                errors.append(f"{qid}: re-derived output/exit mismatch")
        return errors

    records = doc.get("bounded_absence_records", [])
    for record in records:
        rid = record.get("record_id", record.get("id", "<missing-record-id>"))
        output = str(record.get("exact_stdout", record.get("exact_output", ""))).encode()
        expected_hash = record.get("stdout_sha256", record.get("output_sha256"))
        if sha256(output) != expected_hash:
            errors.append(f"{rid}: declared output hash mismatch")
            continue
        result = run_safe_recorded_git(record.get("command", ""))
        expected_rc = record.get("exit_code", record.get("exit_status"))
        if result is None or result.stdout != output or result.returncode != expected_rc:
            errors.append(f"{rid}: re-derived output/exit mismatch")
    return errors


def iter_claim_references(value: Any, key: str = "") -> Iterable[str]:
    """Yields claim IDs only from explicitly named factual-backing fields."""
    if isinstance(value, dict):
        for child_key, child in value.items():
            if child_key in {"claim_ids", "backing_claim_ids", "referenced_claim_ids", "source_claim_ids"}:
                if isinstance(child, list):
                    yield from (item for item in child if isinstance(item, str))
            else:
                yield from iter_claim_references(child, child_key)
    elif isinstance(value, list):
        for child in value:
            yield from iter_claim_references(child, key)


def disc_001_locations(value: Any, path: tuple[str, ...] = ()) -> list[tuple[str, ...]]:
    """Returns every JSON location whose scalar text mentions DISC-001."""
    found: list[tuple[str, ...]] = []
    if isinstance(value, dict):
        for key, child in value.items():
            found.extend(disc_001_locations(child, (*path, key)))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(disc_001_locations(child, (*path, str(index))))
    elif "DISC-001" in str(value):
        found.append(path)
    return found


def receipt_output_bindings(receipt: dict[str, Any]) -> list[tuple[str, str | None]]:
    """Normalizes output paths and hashes across the existing receipt schemas."""
    bindings: list[tuple[str, str | None]] = []
    for key in ("outputs", "output_paths_and_sha256"):
        for item in receipt.get(key, []) if isinstance(receipt.get(key), list) else []:
            if isinstance(item, dict) and isinstance(item.get("path"), str):
                bindings.append((item["path"], item.get("sha256")))
    hashes = receipt.get("output_hashes", receipt.get("output_sha256", {}))
    if isinstance(hashes, dict):
        bindings.extend((path, digest) for path, digest in hashes.items() if isinstance(path, str))
    return list(dict.fromkeys(bindings))


def nested(receipt: dict[str, Any], *paths: tuple[str, ...]) -> Any:
    """Returns the first present value among alternative nested field paths."""
    for path in paths:
        value: Any = receipt
        present = True
        for part in path:
            if not isinstance(value, dict) or part not in value:
                present = False
                break
            value = value[part]
        if present:
            return value
    return None


def unavailable(value: Any) -> bool:
    """Returns whether provenance metadata is absent, null, or explicitly unavailable."""
    if value is None or value == [] or value == {}:
        return True
    text = str(value).strip().lower()
    return not text or "unavailable" in text or "uncommitted" in text or "pending" in text


def receipt_provenance_issues(receipt: dict[str, Any]) -> list[str]:
    """Returns fail-closed provenance defects for one role receipt."""
    role = str(receipt.get("role", receipt.get("role_identity", "<unknown-role>")))
    values = {
        "prompt": nested(receipt, ("prompt_sha256",), ("prompt_metadata", "exact_prompt_sha256"), ("spawn_and_isolation", "raw_prompt_export")),
        "context_manifest": nested(receipt, ("actual_context_manifest_sha256",)),
        "spawn_or_session": nested(receipt, ("provider_spawn_id",), ("spawn_id",), ("orchestration", "spawn_id"), ("spawn_and_ancestry", "collaboration_tool_spawn_id"), ("spawn_and_isolation", "spawn_event_id")),
        "start_event": nested(receipt, ("start_event_id",), ("orchestration", "start_event_id"), ("event_and_timing_metadata", "start_event_id"), ("timing", "start_event_id")),
        "end_event": nested(receipt, ("end_event_id",), ("orchestration", "end_event_id"), ("event_and_timing_metadata", "end_event_id"), ("timing", "end_event_id")),
        "final_response": nested(receipt, ("final_response_sha256",), ("orchestration", "final_response_sha256"), ("final_response_metadata", "exact_final_response_sha256")),
        "commit": nested(receipt, ("commit_sha",), ("orchestration", "commit_sha")),
    }
    issues = [f"{role}.{field}" for field, value in values.items() if unavailable(value)]
    commit = values["commit"]
    if not unavailable(commit) and not HEX40.fullmatch(str(commit)):
        issues.append(f"{role}.commit-not-full-sha")
    fork_turns = nested(receipt, ("fork_turns",), ("isolation", "fork_turns"), ("isolation_metadata", "fork_turns"), ("spawn_and_isolation", "fork_turns"))
    raw_proof = nested(receipt, ("raw_isolation_export",), ("raw_isolation_proof",), ("isolation", "raw_isolation_proof"), ("isolation_metadata", "raw_session_export_sha256"), ("spawn_and_isolation", "isolation_proof"))
    if fork_turns != "none" or unavailable(raw_proof):
        issues.append(f"{role}.provider-isolation-proof")
    return issues


class BatchBFreezeContract(unittest.TestCase):
    """B0 exact scope, predecessor, ownership, budget, and anti-pattern freeze."""

    def test_exact_three_game_scope_and_phase_bases(self) -> None:
        """Fails when: B0 scope differs, is empty, or a frozen phase base drifts (A4/A15)."""
        discovery = load_json(TRACK_DIR / "batch-b-discovery-audit.json")
        applicability = load_json(TRACK_DIR / "batch-b-role-applicability.json")
        self.assertIsInstance(discovery, dict, "B0 discovery JSON is missing/unparseable")
        self.assertIsInstance(applicability, dict, "B0 applicability JSON is missing/unparseable")
        expected = [(GAMES[game], game, IDENTITIES[game]) for game in GAMES]
        actual = [(item["game"], item["normalized_id"], item["identity_id"]) for item in discovery["authoritative_scope"]]
        self.assertEqual(actual, expected)
        self.assertEqual(len(actual), 3)
        self.assertEqual(discovery["phase_base_sha"], PHASE_BASE_SHA)
        self.assertEqual(applicability["phase_base_sha"], PHASE_BASE_SHA)

    def test_predecessor_values_and_exact_bytes_are_frozen(self) -> None:
        """Fails when: a B0 predecessor value or accepted predecessor byte hash differs."""
        discovery = load_json(TRACK_DIR / "batch-b-discovery-audit.json")
        bindings = discovery["predecessor_bindings"]
        gate = load_json(REPO_ROOT / "measure/evidence-integrity-accepted-gate.json")
        self.assertEqual(gate["gate_version"], EXPECTED_PREDECESSORS["t1_gate_version"])
        self.assertEqual(gate["gate_commit"], EXPECTED_PREDECESSORS["t1_gate_commit"])
        for key in ("t2_accepted_denominator_sha256", "t2_accepted_partition_sha256", "t3_accepted_pilot_sha256", "source_baseline_revision"):
            self.assertEqual(bindings[key], EXPECTED_PREDECESSORS[key], key)
        for key, path in PREDECESSOR_PATHS.items():
            self.assertEqual(file_sha256(path), EXPECTED_PREDECESSORS[key], str(path))

    def test_exact_positive_task_and_budget_role_counts(self) -> None:
        """Fails when: B0 roles/tasks are vacuous, boolean counts pass, or exact cardinalities drift (A3/A4)."""
        applicability = load_json(TRACK_DIR / "batch-b-role-applicability.json")
        budget = load_json(TRACK_DIR / "batch-b-budget-declaration.json")
        tasks = applicability["tasks"]
        role_ceilings = budget["role_ceilings"]
        self.assertEqual(len(tasks), 10)
        self.assertEqual(len({task["task_id"] for task in tasks}), 10)
        self.assertEqual(len(role_ceilings), 9)
        self.assertGreater(len(tasks), 0)
        self.assertGreater(len(role_ceilings), 0)
        for role, ceilings in role_ceilings.items():
            self.assertEqual(set(ceilings), {"bytes", "files", "commands", "minutes", "records"}, role)
            for unit, ceiling in ceilings.items():
                self.assertIs(type(ceiling), int, f"{role}.{unit} must be an integer, not bool/prose")
                self.assertGreater(ceiling, 0, f"{role}.{unit} must be positive")

    def test_ownership_is_non_colliding_and_input_bound(self) -> None:
        """Fails when: task ownership/review is missing, self-colliding, or not bound to the frozen input manifest."""
        applicability = load_json(TRACK_DIR / "batch-b-role-applicability.json")
        for task in applicability["tasks"]:
            self.assertTrue(task["owner_role"])
            self.assertTrue(task["reviewer_role"])
            if task["task_id"] != "B2-ACCEPTANCE":
                self.assertNotEqual(task["owner_role"], task["reviewer_role"], task["task_id"])
            self.assertEqual(task["allowed_input_binding"], ALLOWED_INPUT_MANIFEST_SHA256)
            self.assertGreater(len(task["expected_paths"]), 0)

    def test_disc_001_occurs_only_in_labeled_process_metadata(self) -> None:
        """Fails when: Batch A DISC-001 backs a Batch B claim, fixture, mapping, browser, asset, or source disposition."""
        paths = [
            TRACK_DIR / "batch-b-discovery-audit.json",
            *LEDGER_PATHS.values(),
            *REPORT_PATHS.values(),
            *BLUEPRINT_PATHS.values(),
            *MAPPER_REPORT_PATHS.values(),
            *(RECEIPTS_DIR / name for name in CURRENT_RECEIPTS if name != "truth-test-author-batch-b.json"),
        ]
        violations = []
        occurrences = 0
        for path in paths:
            document = load_json(path)
            self.assertIsNotNone(document, f"missing Batch B JSON: {path}")
            for location in disc_001_locations(document):
                occurrences += 1
                if "carried_forward_disclosures" not in location:
                    violations.append(f"{path.name}:{'.'.join(location)}")
        self.assertGreater(occurrences, 0, "DISC-001 carry-forward is missing rather than labeled")
        self.assertEqual(violations, [], f"DISC-001 factual leakage: {violations}")

    def test_plan_markers_and_guard_references_are_unambiguous(self) -> None:
        """Fails when: a [ ] task marker, missing guard, invalid detector syntax, or active/archive duplicate exists (A8/A9/A12/A13/A14)."""
        plan = (TRACK_DIR / "plan.md").read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"(?m)^- \[ \] ", plan), "A8: legacy [ ] task marker")
        for guard in (
            "tests/orchestrator_role_receipt_integrity.sh",
            "tests/orchestrator_marker_vocabulary.sh",
            "tests/orchestrator_review_execution_truthfulness.sh",
            "tests/orchestrator_detector_syntax.sh",
            "tests/orchestrator_catalog.sh",
        ):
            self.assertTrue((REPO_ROOT / guard).is_file(), f"A12 dangling guard: {guard}")
        invalid_detector = "rg " + "-nE"
        self.assertNotIn(invalid_detector, Path(__file__).read_text(encoding="utf-8"))
        self.assertFalse((REPO_ROOT / "measure/archive/apk_corpus_audit_action_defense_20260712").exists(), "A13 active/archive duplicate")


class BatchBCollectorPackageContract(unittest.TestCase):
    """B1 parser, count, identity, bounded-query, and denominator contracts."""

    def test_all_three_collector_packages_parse_and_are_nonempty(self) -> None:
        """Fails when: any B1 ledger/method/report is missing, unparseable, or empty (A4)."""
        for game in GAMES:
            with self.subTest(game=game):
                self.assertNotIn("__parse_error__", ledger(game), str(LEDGER_PATHS[game]))
                self.assertGreater(len(claims(game)), 0)
                self.assertTrue((TRACK_DIR / f"{game}-evidence-method-batch-b.md").is_file())
                report = load_json(REPORT_PATHS[game])
                self.assertIsInstance(report, dict)
                self.assertNotIn("__parse_error__", report)

    def test_claim_and_fixture_ids_are_unique_and_disjoint(self) -> None:
        """Fails when: a factual/fixture ID is empty, duplicated, cross-game, or shared between populations."""
        global_ids: list[str] = []
        for game, title in GAMES.items():
            factual_ids = [claim_id(item) for item in claims(game)]
            negative_ids = [fixture_id(item) for item in fixtures(game)]
            self.assertEqual(len(factual_ids), len(set(factual_ids)), game)
            self.assertEqual(len(negative_ids), len(set(negative_ids)), game)
            self.assertFalse(set(factual_ids) & set(negative_ids), game)
            self.assertTrue(all(factual_ids + negative_ids), game)
            self.assertTrue(all(item.get("game", title) == title for item in claims(game)), game)
            global_ids.extend(factual_ids + negative_ids)
        self.assertEqual(len(global_ids), len(set(global_ids)), "cross-ledger ID collision")

    def test_factual_and_fixture_totals_reconcile_exactly(self) -> None:
        """Fails when: B1 report totals are prose/booleans, unrecomputable, or fixtures inflate factual coverage (A3/A4)."""
        for game in GAMES:
            factual = len(claims(game))
            negative = len(fixtures(game))
            self.assertEqual(factual, FACTUAL_TOTALS[game], game)
            self.assertEqual(negative, FIXTURE_TOTALS[game], game)
            report = load_json(REPORT_PATHS[game])
            if game == "village-guardian":
                self.assertIs(type(report["factual_claims_total"]), int)
                self.assertEqual(report["factual_claims_total"], factual)
                self.assertEqual(report["negative_fixture_total"], negative)
                self.assertEqual(report["claims_total"], factual + negative)
            elif game == "archers-revenge":
                self.assertEqual(report["claim_totals"]["factual_claims"], factual)
                self.assertEqual(report["claim_totals"]["negative_fixtures"], negative)
            else:
                self.assertEqual(report["claims_total"], factual)
                self.assertEqual(report["negative_fixture_total"], negative)
        self.assertEqual(sum(FACTUAL_TOTALS.values()), 62)
        self.assertEqual(sum(FIXTURE_TOTALS.values()), 12)

    def test_every_claim_has_required_evidence_and_review_fields(self) -> None:
        """Fails when: a B1 factual claim omits its identity, fact/interpretation boundary, evidence class, conflict, or review disposition."""
        missing: list[str] = []
        for game in GAMES:
            expected_collector = f"evidence-collector-{game}-batch-b"
            for item in claims(game):
                cid = claim_id(item)
                required = ("category", "source_revision", "confidence", "evidence_class", "discovery_method", "collector_id", "interpretation", "reviewer_disposition")
                for key in required:
                    if key not in item or item[key] in (None, ""):
                        missing.append(f"{cid}.{key}")
                if not source_fact(item):
                    missing.append(f"{cid}.source_fact")
                if item.get("collector_id") != expected_collector:
                    missing.append(f"{cid}.collector_id-mismatch")
                if "conflict" not in item and "conflict_state" not in item:
                    missing.append(f"{cid}.conflict")
        self.assertEqual(missing, [], f"claim contract defects: {missing}")

    def test_every_positive_git_envelope_resolves_exactly(self) -> None:
        """Fails when: any B1 source revision/path is not a blob or any blob/range hash differs; reports exact claim IDs."""
        errors = [
            error
            for game in GAMES
            for item in claims(game)
            if item.get("relative_path") is not None
            if (error := citation_error(item)) is not None
        ]
        self.assertEqual(errors, [], f"exact citation failures: {errors}")

    def test_every_bounded_absence_or_query_envelope_rederives(self) -> None:
        """Fails when: a B1 absence/history query lacks exact domain/output/exit/hash agreement (A7/A10)."""
        errors = [error for game in GAMES for error in bounded_envelope_errors(game)]
        self.assertEqual(errors, [], f"bounded envelope failures: {errors}")

    def test_denominator_counts_and_asset_candidates_reconcile(self) -> None:
        """Fails when: an assigned denominator or asset candidate is omitted, duplicated, or changed by authored output."""
        discovery = load_json(TRACK_DIR / "batch-b-discovery-audit.json")
        discovered_assets = {item["normalized_id"]: item["candidate_count"] for item in discovery["asset_candidates"]}
        self.assertEqual(discovered_assets, ASSET_CANDIDATE_TOTALS)
        self.assertEqual([item["identity_record_count"] for item in discovery["denominator_reconciliation"]["assigned_identity_records"]], [1, 1, 1])
        for game in GAMES:
            reconciliation = ledger(game).get("denominator_reconciliation")
            self.assertTrue(reconciliation, game)


class BatchBMapperPackageContract(unittest.TestCase):
    """B2 same-game claim backing and temporal/unknown-boundary contracts."""

    def test_all_mapper_packages_parse_and_hypotheses_are_non_authoritative(self) -> None:
        """Fails when: a B2 mapper output is absent/unparseable or hypotheses can masquerade as facts."""
        for game in GAMES:
            blueprint = load_json(BLUEPRINT_PATHS[game])
            report = load_json(MAPPER_REPORT_PATHS[game])
            text = HYPOTHESIS_PATHS[game].read_text(encoding="utf-8") if HYPOTHESIS_PATHS[game].is_file() else ""
            self.assertIsInstance(blueprint, dict, game)
            self.assertIsInstance(report, dict, game)
            self.assertIn("NON-AUTHORITATIVE HYPOTHESIS", text, game)

    def test_blueprint_references_resolve_only_to_own_factual_ledger(self) -> None:
        """Fails when: B2 uses a fixture, foreign/unknown claim, or hypothesis as factual backing."""
        all_factual = {game: {claim_id(item) for item in claims(game)} for game in GAMES}
        all_fixture = {fixture_id(item) for game in GAMES for item in fixtures(game)}
        for game in GAMES:
            refs = list(iter_claim_references(load_json(BLUEPRINT_PATHS[game])))
            self.assertGreater(len(refs), 0, f"{game}: vacuous zero claim references")
            foreign = sorted(set(refs) - all_factual[game])
            fixture_refs = sorted(set(refs) & all_fixture)
            self.assertEqual(foreign, [], f"{game}: foreign/unresolved refs {foreign}")
            self.assertEqual(fixture_refs, [], f"{game}: fixture refs {fixture_refs}")
            self.assertEqual(set(refs), all_factual[game], f"{game}: factual claim coverage drift")

    def test_mapper_report_reference_counts_are_recomputed(self) -> None:
        """Fails when: B2 labeled reference counts disagree with actual blueprint backing arrays (A3/A4)."""
        for game in GAMES:
            refs = list(iter_claim_references(load_json(BLUEPRINT_PATHS[game])))
            report = load_json(MAPPER_REPORT_PATHS[game])
            if game == "village-guardian":
                accounting = load_json(BLUEPRINT_PATHS[game])["claim_reference_accounting"]
                self.assertEqual(accounting["claim_reference_occurrence_count"], len(refs))
                self.assertEqual(accounting["unique_referenced_claim_count"], len(set(refs)))
            elif game == "archers-revenge":
                self.assertEqual(report["claim_reconciliation"]["unique_referenced_claim_count"], len(set(refs)))
            else:
                accounting = load_json(BLUEPRINT_PATHS[game])["claim_reference_accounting"]
                self.assertEqual(accounting["referenced_claim_occurrences"], len(refs))
                self.assertEqual(accounting["distinct_referenced_claim_ids"], len(set(refs)))

    def test_unknown_historical_and_current_boundaries_are_preserved(self) -> None:
        """Fails when: B2 promotes historical evidence/current unknowns into current, runnable, responsive, or asset facts."""
        village = load_json(BLUEPRINT_PATHS["village-guardian"])
        self.assertEqual(village["responsive_evidence"]["status"], "unknown")
        self.assertEqual(village["asset_usage_evidence"]["status"], "unknown")
        self.assertIn("unknown", village["browser_status"])
        archers = load_json(BLUEPRINT_PATHS["archers-revenge"])
        self.assertIn("unknown", archers["source_boundary"]["current"])
        self.assertIn("historical", archers["source_boundary"]["historical"])
        self.assertIn("unknown", archers["source_boundary"]["runnable"])
        storm = load_json(BLUEPRINT_PATHS["storm-castle-tower"])
        self.assertIn("catalog-withdrawn", storm["mapping_boundary"])
        self.assertTrue(any(item["disposition"] == "browser-unknown" for item in storm["visible_unknowns"]))

    def test_mapper_roles_are_distinct_from_collectors_and_truth_role(self) -> None:
        """Fails when: B2 mapper identity collides with its collector, truth author, or another game's mapper."""
        roles = []
        for game in GAMES:
            blueprint = load_json(BLUEPRINT_PATHS[game])
            role = blueprint.get("mapper_role", blueprint.get("role"))
            roles.append(role)
            self.assertEqual(role, f"requirements-mapper-{game}-batch-b")
            self.assertNotEqual(role, f"evidence-collector-{game}-batch-b")
            self.assertNotEqual(role, "truth-test-author-batch-b")
        self.assertEqual(len(roles), len(set(roles)))


class BatchBClaimTruthContract(unittest.TestCase):
    """B3 all-claim source semantics where mechanically decidable."""

    def test_generic_semantic_assertion_exercises_positive_claim_atoms(self) -> None:
        """Fails when: a mechanically decidable route/literal/number atom is absent from its hash-valid citation."""
        exercised = 0
        failures: list[str] = []
        for game in GAMES:
            for item in claims(game):
                if item.get("relative_path") is None or range_bounds(item) is None or range_bounds(item)[0] == "bytes":
                    continue
                decidable, missing = mechanical_semantic_check(cited_text(item), source_fact(item))
                if decidable:
                    exercised += 1
                    if missing:
                        failures.append(f"{claim_id(item)}: {missing}")
        self.assertGreaterEqual(exercised, 15, f"semantic coverage is vacuous: {exercised}")
        self.assertEqual(failures, [], f"semantic source failures: {failures}")

    def test_all_factual_claims_are_exercised_by_exact_or_bounded_checks(self) -> None:
        """Fails when: B3 all-claim coverage omits a claim or lets a fixture inflate the 62-claim population."""
        positive = sum(1 for game in GAMES for item in claims(game) if item.get("relative_path") is not None)
        bounded = sum(1 for game in GAMES for item in claims(game) if item.get("relative_path") is None)
        self.assertEqual(positive + bounded, 62)
        self.assertGreater(positive, 0)
        self.assertGreater(bounded, 0)

    def test_every_test_declares_an_explicit_fails_when_contract(self) -> None:
        """Fails when: any Batch B test lacks an auditable `Fails when:` falsification condition."""
        missing = []
        for _, cls in inspect.getmembers(__import__(__name__), inspect.isclass):
            if not cls.__name__.startswith("BatchB"):
                continue
            for name, method in inspect.getmembers(cls, inspect.isfunction):
                if name.startswith("test_") and "Fails when:" not in (inspect.getdoc(method) or ""):
                    missing.append(f"{cls.__name__}.{name}")
        self.assertEqual(missing, [], f"tests without fails_when: {missing}")


class BatchBNegativeFixtureContract(unittest.TestCase):
    """B3 independent semantic refutation of all twelve negative fixtures."""

    def test_all_four_fixture_classes_exist_per_game_and_are_excluded(self) -> None:
        """Fails when: B3 fixture coverage is vacuous, missing a refutation class, or enters factual claims."""
        for game in GAMES:
            records = fixtures(game)
            kinds = " ".join(str(item.get("kind", item.get("fixture_class", ""))).lower() for item in records)
            self.assertEqual(len(records), 4, game)
            self.assertIn("semantic-overstatement", kinds, game)
            self.assertIn("directory", kinds, game)
            self.assertTrue("fabricated" in kinds or "plausible" in kinds, game)
            self.assertTrue("responsive" in kinds or "template" in kinds, game)
            for item in records:
                self.assertIn(str(item.get("expected_disposition", "")).upper(), {"FAIL", "REJECT"})
                self.assertFalse(item.get("counts_as_claim", item.get("counts_as_factual_claim", False)))

    def test_hash_valid_archers_state_union_does_not_prove_reachable_victory(self) -> None:
        """Fails when: B3 accepts AR-B-FIX-001 from hashes/keywords despite no guard-mutation-target transition evidence."""
        item = next(record for record in claims("archers-revenge") if claim_id(record) == "AR-B-HIST-STATE-001")
        self.assertIsNone(citation_error(item), "fixture anchor must first be hash-valid")
        fixture = next(record for record in fixtures("archers-revenge") if fixture_id(record) == "AR-B-FIX-001")
        decidable, missing = mechanical_semantic_check(cited_text(item), fixture["proposed_claim"], semantic_kind="reachable-transition")
        self.assertTrue(decidable)
        self.assertIn("guard/mutation/target evidence for victory", missing)

    def test_storm_immediate_defeat_overstatement_is_semantically_refuted(self) -> None:
        """Fails when: B3 treats a conditional lives guard as proof that every wrong choice immediately defeats."""
        item = next(record for record in claims("storm-castle-tower") if claim_id(record) == "SCT-MECH-H005")
        self.assertIsNone(citation_error(item), "fixture anchor must first be hash-valid")
        fixture = next(record for record in fixtures("storm-castle-tower") if fixture_id(record) == "SCT-NEG-001")
        decidable, missing = mechanical_semantic_check(cited_text(item), fixture["proposition"], semantic_kind="immediate-terminal")
        self.assertTrue(decidable)
        self.assertIn("unconditional/immediate terminal evidence", missing)

    def test_directory_fixtures_resolve_to_trees_not_primary_blobs(self) -> None:
        """Fails when: B3 accepts a directory/generated container as primary source evidence (A10)."""
        archers = git("cat-file", "-t", "cd1936387d136ffb12e77a647f36cbce2d1fdd4e:apps/advantage-games/src/components/games/vocabulary/archers-revenge")
        storm = git("cat-file", "-t", "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f:packages/game-cartridges/src/cartridges/storm-castle-tower")
        self.assertEqual(archers.stdout, b"tree\n")
        self.assertEqual(storm.stdout, b"tree\n")


class BatchBReceiptContract(unittest.TestCase):
    """B0-B5 exact output-byte and fail-closed role-provenance contracts."""

    def test_existing_receipt_output_hashes_bind_exact_bytes(self) -> None:
        """Fails when: an A15 receipt output hash is stale at its commit, or at current bytes when no commit exists."""
        errors: list[str] = []
        for name in CURRENT_RECEIPTS:
            receipt = load_json(RECEIPTS_DIR / name)
            self.assertIsInstance(receipt, dict, f"missing/unparseable receipt: {name}")
            bindings = receipt_output_bindings(receipt)
            self.assertGreater(len(bindings), 0, f"{name}: zero output bindings")
            commit = nested(receipt, ("commit_sha",), ("orchestration", "commit_sha"))
            for relative, expected in bindings:
                if expected is None and relative == str((RECEIPTS_DIR / name).relative_to(REPO_ROOT)):
                    continue
                if not isinstance(expected, str) or not HEX64.fullmatch(expected):
                    errors.append(f"{name}:{relative}:missing/malformed hash")
                    continue
                data = git_show(str(commit), relative) if isinstance(commit, str) and HEX40.fullmatch(commit) else ((REPO_ROOT / relative).read_bytes() if (REPO_ROOT / relative).is_file() else None)
                if data is None or sha256(data) != expected:
                    errors.append(f"{name}:{relative}:byte mismatch")
        self.assertEqual(errors, [], f"A15 output binding failures: {errors}")

    def test_required_role_receipts_have_authentic_provenance(self) -> None:
        """Fails when: prompt/session/events/final-response/isolation/commit metadata is null, missing, unavailable, or uncorroborated."""
        issues = []
        for name in CURRENT_RECEIPTS:
            receipt = load_json(RECEIPTS_DIR / name)
            if not isinstance(receipt, dict):
                issues.append(f"missing:{name}")
                continue
            issues.extend(receipt_provenance_issues(receipt))
        self.assertEqual(
            issues,
            [],
            "EXPECTED_STAGE_RED[PROVENANCE]: authentic receipts are incomplete: " + ", ".join(issues),
        )

    def test_receipt_phase_role_and_budget_bindings_are_exact(self) -> None:
        """Fails when: an existing receipt drifts from phase base, allowed inputs, or frozen budget bytes."""
        missing = []
        for name in CURRENT_RECEIPTS:
            receipt = load_json(RECEIPTS_DIR / name)
            if not isinstance(receipt, dict):
                missing.append(name)
                continue
            self.assertEqual(receipt.get("phase_base_sha"), PHASE_BASE_SHA, name)
            self.assertEqual(receipt.get("allowed_input_manifest_sha256"), ALLOWED_INPUT_MANIFEST_SHA256, name)
            self.assertEqual(receipt.get("budget_declaration_sha256", nested(receipt, ("budget", "declaration_sha256"))), BUDGET_SHA256, name)
        self.assertEqual(missing, [], "missing/unparseable receipts: " + ", ".join(missing))


class BatchBBrowserContract(unittest.TestCase):
    """B4 reviewed current runnable/non-runnable browser evidence contract."""

    def test_browser_audit_exists_and_covers_every_game(self) -> None:
        """Fails when: B4 browser audit is absent or omits a reviewed disposition for any exact Batch B game."""
        path = TRACK_DIR / "batch-b-browser-audit.json"
        audit = load_json(path)
        self.assertIsInstance(audit, dict, "EXPECTED_STAGE_RED[B4]: batch-b-browser-audit.json is missing")
        records = audit.get("games", audit.get("records", []))
        ids = {item.get("normalized_id") for item in records if isinstance(item, dict)}
        self.assertEqual(ids, set(GAMES), "EXPECTED_STAGE_RED[B4]: browser dispositions incomplete")

    def test_browser_records_require_real_behavior_or_reviewed_failure(self) -> None:
        """Fails when: B4 runnable proof is screenshots-only/zero-input or non-runnable proof lacks command, logs, exact failure, revision, and review."""
        audit = load_json(TRACK_DIR / "batch-b-browser-audit.json")
        self.assertIsInstance(audit, dict, "EXPECTED_STAGE_RED[B4]: browser audit unavailable")
        records = audit.get("games", audit.get("records", []))
        defects = []
        for item in records:
            disposition = item.get("disposition", item.get("runnable_disposition"))
            if disposition == "runnable":
                for key in ("compact", "wide", "real_input_events", "transition_log", "console_observations", "network_observations"):
                    if not item.get(key):
                        defects.append(f"{item.get('normalized_id')}.{key}")
            elif disposition == "non-runnable":
                for key in ("attempted_command", "environment", "route", "revision", "exact_failure", "logs", "reviewer_disposition"):
                    if not item.get(key):
                        defects.append(f"{item.get('normalized_id')}.{key}")
            else:
                defects.append(f"{item.get('normalized_id')}.unreviewed-disposition")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B4]: " + ", ".join(defects))

    def test_collectors_and_mappers_remain_unknown_without_browser_audit(self) -> None:
        """Fails when: pre-B4 artifacts claim current/runnable/browser truth without the dedicated browser audit."""
        self.assertIn("not performed", load_json(REPORT_PATHS["village-guardian"])["browser_status"])
        self.assertIn("unknown", load_json(REPORT_PATHS["archers-revenge"])["source_disposition"]["runnable"])
        self.assertEqual(load_json(REPORT_PATHS["storm-castle-tower"])["current_disposition"]["runnable"], "unknown-not-claimed")


class BatchBAssetContract(unittest.TestCase):
    """B4 exact asset-denominator usage and privacy-bound artifact contract."""

    def test_asset_audit_exists_and_reconciles_twelve_candidates(self) -> None:
        """Fails when: B4 asset audit is absent, has zero work, or omits/duplicates one of twelve assigned candidates."""
        audit = load_json(TRACK_DIR / "batch-b-asset-usage-audit.json")
        self.assertIsInstance(audit, dict, "EXPECTED_STAGE_RED[B4]: batch-b-asset-usage-audit.json is missing")
        records = audit.get("records", audit.get("asset_usage_records", []))
        paths = [item.get("path", item.get("canonical_path")) for item in records if isinstance(item, dict)]
        self.assertEqual(len(paths), 12, "EXPECTED_STAGE_RED[B4]: asset denominator must contain 12 records")
        self.assertEqual(len(paths), len(set(paths)), "EXPECTED_STAGE_RED[B4]: duplicate asset ownership")

    def test_asset_usage_requires_exact_anchor_or_blocking_unknown(self) -> None:
        """Fails when: B4 promotes presence/screenshots/filenames to usage or publishes identifiable evidence without privacy basis (A2/A10)."""
        audit = load_json(TRACK_DIR / "batch-b-asset-usage-audit.json")
        self.assertIsInstance(audit, dict, "EXPECTED_STAGE_RED[B4]: asset audit unavailable")
        records = audit.get("records", audit.get("asset_usage_records", []))
        defects = []
        for item in records:
            status = item.get("usage_status")
            if status == "established" and not item.get("source_anchor"):
                defects.append(f"{item.get('path')}.source_anchor")
            if status not in {"established", "blocking-unknown", "bounded-not-referenced", "non-runtime-sidecar"}:
                defects.append(f"{item.get('path')}.usage_status")
        if audit.get("published_browser_artifacts"):
            self.assertTrue(audit.get("anonymized") or audit.get("consent_artifact"), "A2 privacy/consent gate")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B4]: " + ", ".join(defects))


class BatchBIndependentReviewContract(unittest.TestCase):
    """B5 full-package review, deterministic sample, and zero-blocker contract."""

    def test_independent_review_and_receipt_exist(self) -> None:
        """Fails when: B5 independent review or its fresh adversarial-reviewer receipt is absent."""
        review = load_json(TRACK_DIR / "batch-b-adversarial-review.json")
        receipt = load_json(RECEIPTS_DIR / "adversarial-reviewer-batch-b.json")
        self.assertIsInstance(review, dict, "EXPECTED_STAGE_RED[B5]: independent review is missing")
        self.assertIsInstance(receipt, dict, "EXPECTED_STAGE_RED[B5]: reviewer receipt is missing")

    def test_review_samples_every_game_and_has_zero_blockers(self) -> None:
        """Fails when: B5 omits a game/fixture, undersamples claims, or leaves Critical/High/Medium findings."""
        review = load_json(TRACK_DIR / "batch-b-adversarial-review.json")
        self.assertIsInstance(review, dict, "EXPECTED_STAGE_RED[B5]: review unavailable")
        samples = review.get("samples", {})
        defects = []
        for game, count in FACTUAL_TOTALS.items():
            sample = samples.get(game, {}) if isinstance(samples, dict) else {}
            required = max(10, math.ceil(count * 0.10))
            if len(sample.get("selected_claim_ids", [])) < required:
                defects.append(f"{game}.sample<{required}")
            if len(sample.get("fixture_ids_rederived", [])) != 4:
                defects.append(f"{game}.fixtures")
        severities = review.get("unresolved_findings", {})
        for severity in ("critical", "high", "medium"):
            if severities.get(severity) != 0:
                defects.append(f"unresolved.{severity}")
        self.assertEqual(defects, [], "EXPECTED_STAGE_RED[B5]: " + ", ".join(defects))


class BatchBAcceptanceContract(unittest.TestCase):
    """B5 non-consumable candidate, authentic approval, and accepted ordering."""

    def test_candidate_acceptance_and_accepted_manifests_exist(self) -> None:
        """Fails when: B5 candidate, product-owner acceptance, or accepted manifest is missing."""
        missing = [
            name
            for name in ("candidate-cohort-manifest-batch-b.json", "product-owner-acceptance-batch-b.json", "accepted-cohort-manifest-batch-b.json")
            if not (TRACK_DIR / name).is_file()
        ]
        self.assertEqual(missing, [], "EXPECTED_STAGE_RED[B5]: missing acceptance chain: " + ", ".join(missing))

    def test_acceptance_stays_red_without_b4_and_authentic_receipts(self) -> None:
        """Fails when: B5 candidate/acceptance can pass before browser, asset, review, and authentic receipt gates (A1/A4/A5/A6/A15)."""
        prerequisites = {
            "browser_audit": (TRACK_DIR / "batch-b-browser-audit.json").is_file(),
            "asset_audit": (TRACK_DIR / "batch-b-asset-usage-audit.json").is_file(),
            "independent_review": (TRACK_DIR / "batch-b-adversarial-review.json").is_file(),
            "all_authentic_receipts": all(
                isinstance(load_json(RECEIPTS_DIR / name), dict)
                and not receipt_provenance_issues(load_json(RECEIPTS_DIR / name))
                for name in CURRENT_RECEIPTS
            ),
        }
        failed = [key for key, passed in prerequisites.items() if not passed]
        self.assertEqual(failed, [], "EXPECTED_STAGE_RED[B5]: unmet prerequisites: " + ", ".join(failed))

    def test_acceptance_hashes_and_chronology_bind_exact_bytes(self) -> None:
        """Fails when: B5 candidate/review/approval hashes or review-before-approval-before-accepted chronology differ."""
        candidate_path = TRACK_DIR / "candidate-cohort-manifest-batch-b.json"
        approval_path = TRACK_DIR / "product-owner-acceptance-batch-b.json"
        accepted_path = TRACK_DIR / "accepted-cohort-manifest-batch-b.json"
        review_path = TRACK_DIR / "batch-b-adversarial-review.json"
        documents = [load_json(path) for path in (candidate_path, approval_path, accepted_path, review_path)]
        self.assertTrue(all(isinstance(item, dict) for item in documents), "EXPECTED_STAGE_RED[B5]: chain unavailable")
        candidate, approval, accepted, review = documents
        candidate_hash = file_sha256(candidate_path)
        review_hash = file_sha256(review_path)
        self.assertEqual(approval.get("candidate_manifest_sha256"), candidate_hash)
        self.assertEqual(approval.get("review_report_sha256"), review_hash)
        self.assertFalse(candidate.get("consumable", True), "candidate must be non-consumable")
        self.assertTrue(accepted.get("consumable"))
        self.assertEqual(accepted.get("candidate_manifest_sha256"), candidate_hash)
        self.assertRegex(str(approval.get("approval_event_id", "")), r"^msg_")
        self.assertRegex(str(approval.get("approval_message_sha256", "")), HEX64)
        self.assertLess(review["completed_at"], approval["approval_event_timestamp"])
        self.assertLessEqual(approval["approval_event_timestamp"], accepted["created_at"])


if __name__ == "__main__":
    unittest.main()
