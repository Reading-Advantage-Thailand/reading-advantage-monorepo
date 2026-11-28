#!/usr/bin/env python3
"""Falsification contracts for the Phase 3 Task 1 vinext 1.4.6 bump.

Phase 3 Task 1 moves `apps/marketing` and `apps/activity-vinext-fixture` from
vinext 1.2.0 to vinext 1.4.6. This file holds the Red checks that
test-strategy.md section 5a.5 names. The target version is the constant
`TARGET`. Its value is `1.4.6` (PM, 2026-11-21). The target stays 1.4.6. The
file never asserts a React 19.3.x pin.

Two tests pass at the phase base commit. They guard the target constant and
the manifest scan. Every other test fails at the base commit. The failures
name the missing work: the apps still declare 1.2.0, the evidence note is
absent, the install is absent, or the environment variable P3_GREEN_COMMITS
is unset. No test raises an exception at base. Every base failure comes from
an assertion or from `self.fail(...)`.

Targeted Red command (test-strategy.md section 5a.6):

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \\
        measure.tests.test_typescript7_native_migration_phase3_vinext

Expected base result: `FAILED (failures=N)` with no `errors=` part, where N
is the count of red tests. Red parses the labeled integer. Red lists the
green guards by name. No count is written into `spec.md` or `plan.md`.

## The Task 1 note

The note lives at `evidence/phase3-vinext-1-4-6.md` under the track folder.
It holds seven fenced JSON blocks: `peer-check-p3`, `pin-inventory`,
`lock-key-changes`, `gate-results-p3`, `build-times`, `oxc-lessons`, and
`rollback`. A missing note makes each note test fail with `self.fail(...)`.
It never raises.

The `peer-check-p3` block holds the registry output, one row per peer range
plus one Node row, and a `waiver` object when a non-optional row is "not
met". The expected result is that the React peer is "not met": vinext 1.4.6
asks for `^19.3.1` and the repository pins 19.2.9. Default C of section 5a.3
installs 1.4.6 under React 19.2.9 and lets the live gates decide. The waiver
names the peer, the range, the repo value, the decision reference, and the
live gate ids. Every live gate has exit 0 in `gate-results-p3`.

The scope rule accepts the two app manifests, `pnpm-lock.yaml`, the evidence
folder of this track, and `plan.md` of this track. It also accepts one flat
`measure/runs/<track>/green-p3-*.log` and the Phase 2 append-only tech-debt
rule. It rejects `pnpm-workspace.yaml`, the React pin guard tests,
`apps/*/next-env.d.ts`, `.gitignore`, the verify script, and the marketing
vitest config. The environment variable `P3_GREEN_COMMITS` lists the Green
commits. The scope tests fail when the variable is unset or empty.
"""

from __future__ import annotations

import fnmatch
import json
import os
import re
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]

from measure.tests.test_typescript7_native_migration_phase2 import (  # noqa: E402
    _bookkeeping_path_is_allowed,
    _declared_vinext,
    _labeled_values,
    _lock_change_is_in_scope,
    _lock_sections,
    _lock_vinext_importer_entries,
    _lock_sections as _sections_fn,
    parse_note_blocks,
    resolve_installed,
    satisfies,
)
from measure.tests.test_typescript7_native_migration_phase2 import (  # noqa: E402
    track_dir_resolve,
)


TRACK_ID = "typescript7_native_migration_20260710"
TARGET = "1.4.6"
APPS = ("marketing", "activity-vinext-fixture")
APP_MANIFESTS = tuple(f"apps/{app}/package.json" for app in APPS)
APP_PATHS = tuple(f"apps/{app}" for app in APPS)
TRACK_DIR = track_dir_resolve(TRACK_ID)
NOTE_PATH = TRACK_DIR / "evidence" / "phase3-vinext-1-4-6.md"
LOCK_PATH = REPO_ROOT / "pnpm-lock.yaml"
VERIFY_SCRIPT = REPO_ROOT / "apps/marketing/scripts/verify-vinext-runtime.mjs"
VITEST_CONFIG = REPO_ROOT / "apps/marketing/vitest.config.ts"
DOCKERFILE = REPO_ROOT / "apps/marketing/Dockerfile"
TARGET_PATTERN = re.compile(r"^1\.4\.\d+$")
EXPECTED_BLOCKS = (
    "peer-check-p3",
    "pin-inventory",
    "lock-key-changes",
    "gate-results-p3",
    "build-times",
    "oxc-lessons",
    "rollback",
)
EXPECTED_LESSON_IDS = [f"L{i}" for i in range(1, 19)]
GATE_IDS = (
    "P-install-base",
    "P-prereq-build",
    "H0-types-marketing",
    "H1-types-marketing",
    "H0-types-fixture",
    "H1-types-fixture",
    "H0-build-marketing",
    "H1-build-marketing",
    "H0-build-fixture",
    "H1-build-fixture",
    "H0-probe-fixture",
    "H1-probe-fixture",
    "H0-time-marketing",
    "H1-time-marketing",
    "H0-time-fixture",
    "H1-time-fixture",
    "H0-test",
    "H1-test",
    "H0-guard",
    "H1-guard",
    "H0-lint-marketing",
    "H1-lint-marketing",
    "H0-vitest-list",
    "H1-vitest-list",
    "H1-install-refresh",
    "H1-install",
    "H1-seed-lint",
    "H1-seed-tsc",
    "H1-check-marketing",
    "H1-why-next",
    "H1-browser-marketing",
    "H1-browser-fixture",
    "H1-verify-marketing",
    "R-rollback",
)
RAW_LOGS_DIR = TRACK_DIR / "evidence" / "phase3" / "raw-logs"
GREEN_LOG_PATTERN = re.compile(
    r"^measure/runs/" + re.escape(TRACK_ID) + r"/green-p3-[A-Za-z0-9._-]+\.log$"
)
DENIED_PATTERNS = (
    "pnpm-workspace.yaml",
    "tests/security-upgrade-*.test.ts",
    "apps/*/next-env.d.ts",
    ".gitignore",
    "apps/marketing/scripts/verify-vinext-runtime.mjs",
    "apps/marketing/vitest.config.ts",
)
SOURCE_PATTERN = re.compile(r"^(?P<path>[^:]+):(?P<line>\d+)$")
ALLOWED_COMMANDS = ("node --version",)


def _relative(path: Path) -> str:
    """Return the repository relative form of a path.

    Args:
        path: The absolute path.

    Returns:
        The path relative to the repository root.
    """
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def _load_p3_block(name: str) -> tuple[dict[str, Any] | None, str | None]:
    """Load one named JSON block from the Phase 3 note.

    Args:
        name: The block name, such as `peer-check-p3`.

    Returns:
        The parsed block and no error, or no block and an error message.
    """
    blocks = parse_note_blocks(NOTE_PATH)
    if name not in blocks:
        if not NOTE_PATH.is_file():
            return None, f"the evidence note is missing: {_relative(NOTE_PATH)}"
        return None, f"the note has no fenced '{name}' block"
    try:
        value = json.loads(blocks[name])
    except json.JSONDecodeError as exc:
        return None, f"the '{name}' block is not valid JSON: {exc}"
    if not isinstance(value, dict):
        return None, f"the '{name}' block must hold a JSON object"
    return value, None


def _p3_green_commits() -> tuple[list[str] | None, str | None]:
    """Read the Green commit list from the environment.

    Returns:
        The commit list and no error, or no list and an error message.
    """
    raw = os.environ.get("P3_GREEN_COMMITS", "").strip()
    if not raw:
        return None, "the environment variable P3_GREEN_COMMITS is unset or empty"
    return raw.split(), None


def _run_git(arguments: list[str]) -> tuple[str, str | None]:
    """Run a read-only git command in the repository.

    Args:
        arguments: The git arguments.

    Returns:
        The command output and no error, or no output and an error message.
    """
    result = subprocess.run(
        ["git", "-C", str(REPO_ROOT), *arguments],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if result.returncode != 0:
        joined = " ".join(arguments)
        return "", f"git {joined} failed with exit {result.returncode}"
    return result.stdout, None


def _commit_files(sha: str) -> tuple[list[str] | None, str | None]:
    """List the files of one commit.

    Args:
        sha: The commit SHA.

    Returns:
        The file list and no error, or no list and an error message.
    """
    output, error = _run_git(["show", "--name-only", "--format=", sha])
    if error is not None:
        return None, error
    return [line for line in output.splitlines() if line.strip()], None


def _commit_diff(sha: str, path: str) -> tuple[str | None, str | None]:
    """Read the diff of one file in one commit.

    Args:
        sha: The commit SHA.
        path: The repository relative file path.

    Returns:
        The diff text and no error, or no text and an error message.
    """
    output, error = _run_git(["show", "--format=", sha, "--", path])
    if error is not None:
        return None, error
    return output, None


def _p3_path_is_allowed(path: str, diff: str) -> bool:
    """Decide whether a Green commit may touch a path.

    The rule accepts the two app manifests, the lockfile, the evidence folder
    of this track, and `plan.md` of this track. It also accepts one flat Green
    log and the Phase 2 append-only tech-debt rule.

    Args:
        path: The changed file path.
        diff: The unified diff of that path in the commit.

    Returns:
        True when the change is allowed. False otherwise.
    """
    if path in APP_MANIFESTS:
        return True
    if path == "pnpm-lock.yaml":
        return True
    if path == f"measure/tracks/{TRACK_ID}/plan.md":
        return True
    if path.startswith(f"measure/tracks/{TRACK_ID}/evidence/"):
        return True
    if path == f"measure/tech-debt.md":
        return _bookkeeping_path_is_allowed(path, diff)
    return bool(GREEN_LOG_PATTERN.match(path))


def _tracked_vinext_files() -> tuple[list[str] | None, str | None]:
    """Scan tracked files for vinext references.

    The scan covers every tracked `package.json`, `pnpm-workspace.yaml`,
    `.npmrc`, and `.pnpmfile.cjs`. It reads each file and reports the ones
    that name vinext.

    Returns:
        The sorted file list and no error, or no list and an error message.
    """
    output, error = _run_git(["ls-files"])
    if error is not None:
        return None, error
    candidates = []
    for line in output.splitlines():
        name = line.strip()
        if not name:
            continue
        if name.endswith("package.json"):
            candidates.append(name)
        elif name in ("pnpm-workspace.yaml", ".npmrc", ".pnpmfile.cjs"):
            candidates.append(name)
    found = []
    for name in candidates:
        try:
            text = (REPO_ROOT / name).read_text(encoding="utf-8")
        except OSError:
            return None, f"the tracked file cannot be read: {name}"
        if "vinext" in text:
            found.append(name)
    return sorted(found), None


def _resolve_p3_log(value: str) -> Path:
    """Resolve a gate log reference to a path.

    Args:
        value: A gate id, a log file name, or a repository path.

    Returns:
        The resolved log path. The path may not exist.
    """
    text = str(value).strip()
    if "/" in text:
        candidate = REPO_ROOT / text
        if candidate.is_file():
            return candidate
        return RAW_LOGS_DIR / Path(text).name
    if text.endswith(".log"):
        return RAW_LOGS_DIR / text
    return RAW_LOGS_DIR / f"{text}.log"


def _median(values: list[int]) -> int:
    """Return the median of an odd-length integer list.

    Args:
        values: The integer values.

    Returns:
        The middle value of the sorted list.
    """
    ordered = sorted(values)
    return ordered[len(ordered) // 2]


class P3T1TargetTests(unittest.TestCase):
    """Guard and declaration tests for the 1.4.6 target."""

    def test_target_is_stable_1_4_x(self) -> None:
        """Requires TARGET to name a stable 1.4.x release without a prefix."""
        self.assertEqual(TARGET, "1.4.6")
        self.assertRegex(TARGET, TARGET_PATTERN)
        self.assertNotIn("^", TARGET)
        self.assertNotIn("~", TARGET)

    def test_both_apps_pin_target(self) -> None:
        """Requires both apps to declare vinext exactly at TARGET."""
        for app in APPS:
            with self.subTest(app=app):
                self.assertEqual(
                    _declared_vinext(app),
                    TARGET,
                    f"apps/{app}/package.json declares "
                    f"{_declared_vinext(app)!r} instead of {TARGET!r}",
                )

    def test_exactly_two_manifests_declare_vinext(self) -> None:
        """Requires the manifest scan to find exactly the two app manifests."""
        found, error = _tracked_vinext_files()
        self.assertIsNone(error, error)
        assert found is not None
        manifests = [name for name in found if name.endswith("package.json")]
        self.assertEqual(
            sorted(manifests),
            sorted(APP_MANIFESTS),
            f"vinext manifests found: {len(manifests)}",
        )


class P3T1LockTests(unittest.TestCase):
    """Lockfile tests for the 1.4.6 resolution."""

    def test_lock_importers_resolve_target(self) -> None:
        """Requires both importer entries to specify TARGET and resolve it."""
        entries = _lock_vinext_importer_entries()
        self.assertEqual(
            len(entries), 2, f"vinext importer entries found: {len(entries)}"
        )
        for specifier, version in entries:
            with self.subTest(specifier=specifier, version=version):
                self.assertEqual(specifier, TARGET)
                self.assertTrue(
                    version.startswith(TARGET),
                    f"the resolved version {version!r} does not start with {TARGET!r}",
                )

    def test_lock_has_one_vinext_key(self) -> None:
        """Requires one packages key at TARGET and no 1.2.0 entry left."""
        text = LOCK_PATH.read_text(encoding="utf-8")
        keys = re.findall(r"(?m)^  (vinext@[^:]+):", text)
        self.assertEqual(keys, [f"vinext@{TARGET}"])
        self.assertEqual(
            text.count("vinext@1.2.0"),
            0,
            "the lockfile still names vinext@1.2.0",
        )

    def test_installed_matches_target(self) -> None:
        """Requires the installed vinext to report TARGET for each app."""
        for app in APPS:
            with self.subTest(app=app):
                found = resolve_installed(app, "vinext")
                if found is None:
                    self.fail(
                        f"vinext is not installed for apps/{app}; "
                        "run the Green install first"
                    )
                self.assertEqual(found["version"], TARGET)


class P3T1PeerTests(unittest.TestCase):
    """Peer row tests for the 1.4.6 registry ranges."""

    def test_note_blocks_parse(self) -> None:
        """Requires the note to hold all seven fenced JSON blocks."""
        blocks = parse_note_blocks(NOTE_PATH)
        if not NOTE_PATH.is_file():
            self.fail(f"the evidence note is missing: {_relative(NOTE_PATH)}")
        for name in EXPECTED_BLOCKS:
            with self.subTest(block=name):
                self.assertIn(name, blocks, f"the note has no fenced '{name}' block")
                try:
                    value = json.loads(blocks[name])
                except json.JSONDecodeError as exc:
                    self.fail(f"the '{name}' block is not valid JSON: {exc}")
                self.assertIsInstance(value, dict)

    def test_peer_rows_recomputed(self) -> None:
        """Requires each peer verdict to match the recomputed range check."""
        block, error = _load_p3_block("peer-check-p3")
        if error is not None or block is None:
            self.fail(error)
        assert block is not None
        rows = block.get("rows")
        self.assertIsInstance(rows, list)
        assert isinstance(rows, list)
        self.assertGreaterEqual(len(rows), 6, f"peer rows found: {len(rows)}")
        for row in rows:
            with self.subTest(row=row):
                self.assertIn("package", row)
                self.assertIn("range", row)
                self.assertIn("repo_value", row)
                self.assertIn("verdict", row)
                self.assertIn(row["verdict"], ("met", "not met"))
                self.assertEqual(satisfies(row["repo_value"], row["range"]), row["verdict"])
                source = str(row.get("repo_source", ""))
                if source.startswith("cmd:"):
                    self.assertEqual(row["package"], "node")
                    self.assertIn(source[4:], ALLOWED_COMMANDS)
                    continue
                match = SOURCE_PATTERN.match(source)
                self.assertIsNotNone(match, f"the repo source has no path:line form: {source!r}")
                assert match is not None
                target = REPO_ROOT / match.group("path")
                self.assertTrue(target.is_file(), f"the cited file is missing: {source}")
                try:
                    line = target.read_text(encoding="utf-8").splitlines()[
                        int(match.group("line")) - 1
                    ]
                except (IndexError, ValueError):
                    self.fail(f"the cited line is missing: {source}")
                self.assertIn(row["repo_value"], line)

    def test_unmet_peer_has_waiver_or_fix(self) -> None:
        """Requires a complete waiver for each non-optional unmet peer."""
        block, error = _load_p3_block("peer-check-p3")
        if error is not None or block is None:
            self.fail(error)
        assert block is not None
        gates, gate_error = _load_p3_block("gate-results-p3")
        if gate_error is not None or gates is None:
            self.fail(gate_error)
        assert gates is not None
        rows = block.get("rows", [])
        unmet = [
            row
            for row in rows
            if row.get("verdict") == "not met" and not row.get("optional", False)
        ]
        if not unmet:
            return
        waiver = block.get("waiver")
        self.assertIsInstance(waiver, dict, "a non-optional peer is not met with no waiver")
        assert isinstance(waiver, dict)
        for key in ("peer", "range", "repo_value", "decision_ref", "live_gates"):
            self.assertIn(key, waiver)
        live = waiver["live_gates"]
        self.assertIsInstance(live, list)
        self.assertGreaterEqual(len(live), 1)
        entries = {entry.get("id"): entry for entry in gates.get("gates", [])}
        for gate_id in live:
            with self.subTest(gate=gate_id):
                self.assertIn(gate_id, entries, f"the live gate {gate_id!r} has no gate result")
                self.assertEqual(entries[gate_id].get("exit"), 0)
        self.assertIn("H1-browser-marketing", live)
        self.assertIn("H1-browser-fixture", live)

    def test_hardcoded_vinext_paths_exist(self) -> None:
        """Requires each hard-coded vinext path to exist in the install."""
        sources = {
            _relative(VITEST_CONFIG): VITEST_CONFIG.read_text(encoding="utf-8"),
            _relative(DOCKERFILE): DOCKERFILE.read_text(encoding="utf-8"),
            _relative(VERIFY_SCRIPT): VERIFY_SCRIPT.read_text(encoding="utf-8"),
        }
        paths: set[str] = set()
        for name, text in sources.items():
            for match in re.finditer(r"vinext/dist/[A-Za-z0-9_./-]+", text):
                candidate = match.group(0).rstrip(".")
                paths.add(candidate)
        self.assertGreaterEqual(
            len(paths), 7, f"hard-coded vinext paths found: {len(paths)}"
        )
        for app in APPS:
            found = resolve_installed(app, "vinext")
            if found is None:
                self.fail(
                    f"vinext is not installed for apps/{app}; "
                    "run the Green install first"
                )
        root = resolve_installed(APPS[0], "vinext")
        assert root is not None
        base = Path(str(root["path"]))
        for path in sorted(paths):
            with self.subTest(path=path):
                direct = base / path.removeprefix("vinext/")
                if direct.suffix:
                    self.assertTrue(direct.is_file(), f"the installed package lacks {path}")
                else:
                    self.assertTrue(
                        direct.is_file() or direct.with_suffix(".js").is_file(),
                        f"the installed package lacks {path}",
                    )


class P3T1PinInventoryTests(unittest.TestCase):
    """Pin inventory tests for every tracked vinext reference."""

    def test_pin_inventory_matches_scan(self) -> None:
        """Requires the pin inventory to list each scanned vinext file."""
        block, error = _load_p3_block("pin-inventory")
        if error is not None or block is None:
            self.fail(error)
        assert block is not None
        rows = block.get("rows")
        self.assertIsInstance(rows, list)
        assert isinstance(rows, list)
        self.assertGreaterEqual(len(rows), 3, f"pin inventory rows found: {len(rows)}")
        scanned, scan_error = _tracked_vinext_files()
        if scan_error is not None or scanned is None:
            self.fail(scan_error)
        assert scanned is not None
        listed = sorted(row.get("path", "") for row in rows)
        self.assertEqual(listed, scanned)
        for row in rows:
            with self.subTest(row=row):
                self.assertIn(row.get("kind"), ("package.json", "pnpm-workspace.yaml", ".npmrc", ".pnpmfile.cjs"))
                self.assertIn("changed", row)
        stale = [row for row in rows if row.get("path") == "pnpm-workspace.yaml"]
        if stale:
            self.assertFalse(stale[0]["changed"])


class P3T1ScopeTests(unittest.TestCase):
    """Scope tests for the Green commit list."""

    def test_green_commits_in_scope(self) -> None:
        """Requires each Green commit to touch only allowed paths."""
        commits, error = _p3_green_commits()
        if error is not None or commits is None:
            self.fail(error)
        assert commits is not None
        for sha in commits:
            files, files_error = _commit_files(sha)
            if files_error is not None or files is None:
                self.fail(f"{sha}: {files_error}")
            assert files is not None
            for path in files:
                with self.subTest(commit=sha, path=path):
                    diff, diff_error = _commit_diff(sha, path)
                    if diff_error is not None or diff is None:
                        self.fail(f"{sha} {path}: {diff_error}")
                    assert diff is not None
                    self.assertTrue(
                        _p3_path_is_allowed(path, diff),
                        f"{sha} touches an out-of-scope path: {path}",
                    )

    def test_denied_paths_untouched(self) -> None:
        """Requires no Green commit to touch a denied path."""
        commits, error = _p3_green_commits()
        if error is not None or commits is None:
            self.fail(error)
        assert commits is not None
        for sha in commits:
            files, files_error = _commit_files(sha)
            if files_error is not None or files is None:
                self.fail(f"{sha}: {files_error}")
            assert files is not None
            for path in files:
                with self.subTest(commit=sha, path=path):
                    for pattern in DENIED_PATTERNS:
                        self.assertFalse(
                            fnmatch.fnmatch(path, pattern),
                            f"{sha} touches a denied path: {path}",
                        )

    def test_lock_diff_in_scope(self) -> None:
        """Requires each lockfile change to stay in the app importers."""
        commits, error = _p3_green_commits()
        if error is not None or commits is None:
            self.fail(error)
        assert commits is not None
        for sha in commits:
            diff, diff_error = _commit_diff(sha, "pnpm-lock.yaml")
            if diff_error is not None or diff is None:
                self.fail(f"{sha}: {diff_error}")
            assert diff is not None
            if not diff.strip():
                continue
            new_text, new_error = _run_git(["show", f"{sha}:pnpm-lock.yaml"])
            old_text, old_error = _run_git(["show", f"{sha}^:pnpm-lock.yaml"])
            if new_error is not None or old_error is not None:
                self.fail(f"{sha}: the lockfile side cannot be read")
            assert new_text is not None and old_text is not None
            new_sections = _sections_fn(new_text)
            old_sections = _sections_fn(old_text)
            from measure.tests.test_typescript7_native_migration_phase2 import (  # noqa: E402
                _changed_lock_lines,
            )

            for side, number in _changed_lock_lines(diff):
                section = new_sections.get(number) if side == "new" else old_sections.get(number)
                with self.subTest(commit=sha, side=side, line=number):
                    self.assertIsNotNone(section)
                    assert section is not None
                    self.assertTrue(
                        _lock_change_is_in_scope(section),
                        f"{sha} changes the lockfile outside the two app importers",
                    )

    def test_lock_key_changes_explained(self) -> None:
        """Requires each added lock key to be vinext, a dependency, or drift."""
        commits, error = _p3_green_commits()
        if error is not None or commits is None:
            self.fail(error)
        assert commits is not None
        block, block_error = _load_p3_block("lock-key-changes")
        if block_error is not None or block is None:
            self.fail(block_error)
        assert block is not None
        added = block.get("added", [])
        removed = block.get("removed", [])
        self.assertIsInstance(added, list)
        self.assertIsInstance(removed, list)
        peer, peer_error = _load_p3_block("peer-check-p3")
        if peer_error is not None or peer is None:
            self.fail(peer_error)
        assert peer is not None
        allowed = {"vinext"}
        dependencies = peer.get("dependencies", {})
        if isinstance(dependencies, dict):
            allowed |= set(dependencies.keys())
        drift = {
            entry.get("key")
            for entry in block.get("explained_drift", [])
            if isinstance(entry, dict) and entry.get("reason")
        }
        for key in added:
            with self.subTest(key=key):
                name = str(key).split("@")[0] or str(key)
                self.assertTrue(
                    key == f"vinext@{TARGET}"
                    or name in allowed
                    or key in drift,
                    f"the added lock key {key!r} has no explanation",
                )


class P3T1GateEvidenceTests(unittest.TestCase):
    """Gate evidence tests for the heavy gate logs."""

    def _gates_block(self) -> dict[str, Any]:
        """Load the gate-results block or fail the calling test."""
        block, error = _load_p3_block("gate-results-p3")
        if error is not None or block is None:
            self.fail(error)
        assert block is not None
        return block

    def test_gate_results_complete(self) -> None:
        """Requires one complete entry for each gate id of section 5a.6."""
        block = self._gates_block()
        entries = {entry.get("id"): entry for entry in block.get("gates", [])}
        for gate_id in GATE_IDS:
            with self.subTest(gate=gate_id):
                self.assertIn(gate_id, entries, f"the gate {gate_id!r} has no result")
                entry = entries[gate_id]
                for key in ("command", "exit", "log", "start_epoch"):
                    self.assertIn(key, entry)
                log_path = _resolve_p3_log(str(entry["log"]))
                self.assertTrue(log_path.is_file(), f"the log is missing: {log_path}")
                self.assertGreater(log_path.stat().st_size, 0)
                command = str(entry["command"])
                if command.startswith("pnpm") or "heavy-run.sh" in command:
                    self.assertIn("HEAVY_PRIORITY=p2", command)
                    self.assertIn("heavy-run.sh", command)

    def test_log_claims_match_labels(self) -> None:
        """Requires each gate log to hold the labeled lines of its entry."""
        block = self._gates_block()
        for entry in block.get("gates", []):
            with self.subTest(gate=entry.get("id")):
                log_path = _resolve_p3_log(str(entry["log"]))
                try:
                    text = log_path.read_text(encoding="utf-8")
                except OSError as exc:
                    self.fail(f"the log cannot be read: {log_path}: {exc}")
                    continue
                gate_lines = _labeled_values(text, "GATE=")
                self.assertIn(str(entry["id"]), gate_lines)
                exit_lines = _labeled_values(text, "EXIT=")
                self.assertIn(str(entry["exit"]), exit_lines)
                elapsed = _labeled_values(text, "ELAPSED_S=")
                self.assertGreaterEqual(len(elapsed), 1)
                for value in elapsed:
                    self.assertLess(
                        int(value),
                        1800,
                        f"the gate {entry.get('id')} hit the heavy-run cap",
                    )

    def test_vitest_counts_match_logs(self) -> None:
        """Requires the note counts to equal the labeled vitest lines."""
        block = self._gates_block()
        from measure.tests.test_typescript7_native_migration_phase2 import (  # noqa: E402
            _parse_vitest_counts,
            _parse_vitest_failures,
        )

        entries = {entry.get("id"): entry for entry in block.get("gates", [])}
        counts = block.get("test_counts", {})
        for label in ("H0-test", "H1-test"):
            with self.subTest(gate=label):
                self.assertIn(label, entries)
                command = str(entries[label].get("command", ""))
                self.assertIn("--maxWorkers=1", command)
                log_path = _resolve_p3_log(str(entries[label]["log"]))
                try:
                    text = log_path.read_text(encoding="utf-8")
                except OSError as exc:
                    self.fail(f"the log cannot be read: {log_path}: {exc}")
                    continue
                files_passed, tests_passed = _parse_vitest_counts(text)
                self.assertIsNotNone(files_passed)
                self.assertIsNotNone(tests_passed)
                noted = counts.get(label, {})
                self.assertEqual(noted.get("test_files"), files_passed)
                self.assertEqual(noted.get("tests"), tests_passed)
        h0 = counts.get("H0-test", {})
        h1 = counts.get("H1-test", {})
        if h0 and h1:
            self.assertGreaterEqual(h1.get("test_files", 0), h0.get("test_files", 0))
            self.assertGreaterEqual(h1.get("tests", 0), h0.get("tests", 0))
            h0_log = _resolve_p3_log(str(entries["H0-test"]["log"]))
            h1_log = _resolve_p3_log(str(entries["H1-test"]["log"]))
            try:
                h0_failures = set(_parse_vitest_failures(h0_log.read_text(encoding="utf-8")))
                h1_failures = set(_parse_vitest_failures(h1_log.read_text(encoding="utf-8")))
            except OSError as exc:
                self.fail(f"a test log cannot be read: {exc}")
                return
            self.assertTrue(
                h1_failures <= h0_failures,
                "a failure after the bump is not in the H0 failure set",
            )

    def test_warning_counts_match_logs(self) -> None:
        """Requires the warning and peer counts to match the whole logs."""
        block = self._gates_block()
        for entry in block.get("gates", []):
            with self.subTest(gate=entry.get("id")):
                if "warning_line_count" not in entry and "peer_line_count" not in entry:
                    continue
                log_path = _resolve_p3_log(str(entry["log"]))
                try:
                    text = log_path.read_text(encoding="utf-8")
                except OSError as exc:
                    self.fail(f"the log cannot be read: {log_path}: {exc}")
                    continue
                if "warning_line_count" in entry:
                    warned = len(re.findall(r"(?im)^.*warn.*$", text))
                    self.assertEqual(entry["warning_line_count"], warned)
                if "peer_line_count" in entry:
                    peers = len(re.findall(r"(?im)^.*unmet peer.*$", text))
                    self.assertEqual(entry["peer_line_count"], peers)

    def test_verify_script_is_oracle(self) -> None:
        """Requires the verify script to stay unchanged and strict."""
        commits, error = _p3_green_commits()
        if error is not None or commits is None:
            self.fail(error)
        assert commits is not None
        for sha in commits:
            files, files_error = _commit_files(sha)
            if files_error is not None or files is None:
                self.fail(f"{sha}: {files_error}")
            assert files is not None
            self.assertNotIn(
                "apps/marketing/scripts/verify-vinext-runtime.mjs",
                files,
                f"{sha} touches the verify oracle",
            )
        text = VERIFY_SCRIPT.read_text(encoding="utf-8")
        self.assertIn("!== 200", text)
        self.assertIn("!== 401", text)
        block = self._gates_block()
        entries = {entry.get("id"): entry for entry in block.get("gates", [])}
        self.assertIn("H1-verify-marketing", entries)
        log_path = _resolve_p3_log(str(entries["H1-verify-marketing"]["log"]))
        try:
            log_text = log_path.read_text(encoding="utf-8")
        except OSError as exc:
            self.fail(f"the log cannot be read: {log_path}: {exc}")
            return
        self.assertIn("PORT_FREE=1", _labeled_values(log_text, "PORT_FREE="))
        self.assertIn("0", _labeled_values(log_text, "EXIT="))

    def test_build_times_recomputed(self) -> None:
        """Requires the note medians and ratio to match the BUILD_RUN lines."""
        block = self._gates_block()
        times = block.get("build-times")
        if times is None:
            times, error = _load_p3_block("build-times")
            if error is not None or times is None:
                self.fail(error)
            assert times is not None
        else:
            times_holder, error = _load_p3_block("build-times")
            if error is not None or times_holder is None:
                self.fail(error)
            assert times_holder is not None
            times = times_holder
        for app in APPS:
            with self.subTest(app=app):
                self.assertIn(app, times)
                row = times[app]
                for condition in ("before", "after"):
                    runs = row.get(condition, [])
                    self.assertEqual(len(runs), 3, f"{app} {condition} runs found: {len(runs)}")
                    for run in runs:
                        self.assertEqual(run.get("EXIT"), 0)
                        self.assertEqual(run.get("VINEXT"), "1.2.0" if condition == "before" else TARGET)
                before_median = _median([int(run["MS"]) for run in row["before"]])
                after_median = _median([int(run["MS"]) for run in row["after"]])
                self.assertEqual(row.get("before_median_ms"), before_median)
                self.assertEqual(row.get("after_median_ms"), after_median)
                ratio = round(after_median / before_median, 2) if before_median else 0
                self.assertEqual(row.get("ratio"), ratio)
                self.assertEqual(row.get("performance_finding"), ratio > 1.00)

    def test_oxc_lessons_complete(self) -> None:
        """Requires exactly the 18 Oxc lesson rows L1 to L18."""
        lessons, error = _load_p3_block("oxc-lessons")
        if error is not None or lessons is None:
            self.fail(error)
        assert lessons is not None
        rows = lessons.get("rows")
        self.assertIsInstance(rows, list)
        assert isinstance(rows, list)
        self.assertEqual(
            sorted(row.get("id", "") for row in rows),
            EXPECTED_LESSON_IDS,
            f"lesson rows found: {len(rows)}",
        )
        for row in rows:
            with self.subTest(lesson=row.get("id")):
                self.assertIn(row.get("disposition"), ("check", "defer"))
                if row["disposition"] == "check":
                    self.assertIn("gate", row)
                else:
                    self.assertGreaterEqual(len(str(row.get("reason", ""))), 20)
                    self.assertIn("owner", row)

    def test_rollback_proven(self) -> None:
        """Requires the rollback command to name the three paths with proof."""
        rollback, error = _load_p3_block("rollback")
        if error is not None or rollback is None:
            self.fail(error)
        assert rollback is not None
        command = str(rollback.get("command", ""))
        for path in (
            "apps/marketing/package.json",
            "apps/activity-vinext-fixture/package.json",
            "pnpm-lock.yaml",
        ):
            self.assertIn(path, command)
        block = self._gates_block()
        entries = {entry.get("id"): entry for entry in block.get("gates", [])}
        self.assertIn("R-rollback", entries)
        log_path = _resolve_p3_log(str(entries["R-rollback"]["log"]))
        try:
            text = log_path.read_text(encoding="utf-8")
        except OSError as exc:
            self.fail(f"the log cannot be read: {log_path}: {exc}")
            return
        self.assertIn("1", _labeled_values(text, "ROLLBACK_BYTES_EQUAL="))
        self.assertIn("1", _labeled_values(text, "REAPPLY_BYTES_EQUAL="))

    def test_no_deploy_or_push_in_logs(self) -> None:
        """Requires no gate log to hold a deploy or push line."""
        block = self._gates_block()
        pattern = re.compile(r"git push|vinext deploy|gcloud|wrangler")
        for entry in block.get("gates", []):
            with self.subTest(gate=entry.get("id")):
                log_path = _resolve_p3_log(str(entry["log"]))
                try:
                    text = log_path.read_text(encoding="utf-8")
                except OSError as exc:
                    self.fail(f"the log cannot be read: {log_path}: {exc}")
                    continue
                hits = [line for line in text.splitlines() if pattern.search(line)]
                self.assertEqual(hits, [])


class P3HelperTests(unittest.TestCase):
    """Guard tests for the scope helpers of this file."""

    def test_scope_accepts_allowed_paths(self) -> None:
        """Requires the scope rule to accept the track evidence folder."""
        self.assertTrue(
            _p3_path_is_allowed(
                f"measure/tracks/{TRACK_ID}/evidence/phase3/raw-logs/H1-test.log",
                "",
            )
        )
        self.assertTrue(_p3_path_is_allowed("apps/marketing/package.json", ""))
        self.assertTrue(_p3_path_is_allowed("pnpm-lock.yaml", ""))

    def test_scope_rejects_other_importer(self) -> None:
        """Requires the lock scope to reject another app importer."""
        self.assertFalse(_lock_change_is_in_scope(("importers", "apps/reading-advantage")))

    def test_scope_rejects_workspace_file(self) -> None:
        """Requires the scope rule to reject the workspace file."""
        self.assertFalse(_p3_path_is_allowed("pnpm-workspace.yaml", ""))

    def test_scope_rejects_next_env(self) -> None:
        """Requires the scope rule to reject a tracked next-env file."""
        self.assertFalse(
            _p3_path_is_allowed("apps/marketing/next-env.d.ts", "")
        )

    def test_scope_rejects_run_python_file(self) -> None:
        """Requires the scope rule to reject a Python file in the run folder."""
        self.assertFalse(
            _p3_path_is_allowed(
                f"measure/runs/{TRACK_ID}/green-p3-x.py",
                "",
            )
        )


if __name__ == "__main__":
    unittest.main()
