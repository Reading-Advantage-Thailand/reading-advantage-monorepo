#!/usr/bin/env python3
"""Falsification contracts for the TypeScript 7 Native Migration Phase 2.

Phase 2 moves `apps/marketing` and `apps/activity-vinext-fixture` from vinext
0.2.0 to a vinext 1.x release. This file holds 23 tests. Seven of them pass at
the phase base commit. Sixteen of them fail at the phase base commit.

The seven base failures are guards. They hold at base and must hold after the
upgrade. They are the range checker and the two installed-package guards.

The sixteen base failures name the missing work. They fail because the Task 1
note is absent, because the apps still declare vinext 0.2.0, or because the
environment variable P2_GREEN_COMMITS is unset. No test fails with an error.
Every base failure comes from an assertion.

Targeted Red command (test-strategy.md section 4.4):

    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \\
        measure.tests.test_typescript7_native_migration_phase2

Expected base result: `FAILED (failures=16)` with no `errors=` part.

## The Task 1 note

The note lives at `evidence/phase2-vinext-peer-check.md` under the track
folder. It holds three fenced JSON blocks.

The `peer-check` block holds:

    {
      "checked_on": "2026-11-05",
      "vinext_candidate": "1.2.0",
      "registry_command": "npm view vinext@1.2.0 peerDependencies engines --json",
      "registry_peers": {"react": "^19.2.6", "vite": "^8.0.0"},
      "registry_engines": {"node": ">=22"},
      "rows": [
        {
          "package": "react",
          "range": "^19.2.6",
          "repo_value": "19.2.9",
          "repo_source": "pnpm-workspace.yaml:119",
          "verdict": "met",
          "optional": false,
          "installed": true
        }
      ],
      "overall": "met",
      "decision": "proceed"
    }

Every key of `registry_peers` needs one row. The node engine needs one row.
The row `package` names the peer. A row `verdict` is `met` or `not met`. A
row `repo_source` is `path:line` or `cmd:node --version`. The `cmd:` form is
allowed for the node row only.

The `resolved-after` block holds:

    {
      "vinext": "1.2.0",
      "vite": "8.1.6",
      "react": "19.2.9",
      "reproduce_commands": ["pnpm why vinext", "pnpm why vite"],
      "app_changes_justified": []
    }

The `app_changes_justified` list holds one entry per app file that the Green
commit changed outside `package.json`. Each entry holds `path`, `reason`, and
`build_log`. The build log file must exist and must not be empty.

The `gate-results` block holds:

    {
      "gates": [
        {
          "id": "H1-test",
          "command": "pnpm --filter marketing exec vitest run --maxWorkers=1",
          "exit": 0,
          "log": "H1-test.log",
          "start_epoch": 1762300000,
          "warning_line_count": 0
        }
      ],
      "test_counts": {
        "baseline": {"log": "H0-test.log", "test_files": 12, "tests": 87, "failures": []},
        "after": {"log": "H1-test.log", "test_files": 12, "tests": 87, "failures": []}
      }
    }

A `log` value is a gate id, a log file name, or a repository path. Every gate
id of test-strategy.md section 4.6 needs one entry. A build gate entry needs a
`warning_line_count`.

The lockfile scope rule accepts the importer block of each app. It also accepts
the `packages` section and the `snapshots` section. Every other importer block
is out of scope. The importer key of an app is its `apps/` path.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "typescript7_native_migration_20260710"
APPS = ("marketing", "activity-vinext-fixture")
APP_PATHS = tuple(f"apps/{app}" for app in APPS)
CANDIDATE_PATTERN = re.compile(r"^1\.\d+\.\d+$")
SOURCE_PATTERN = re.compile(r"^(?P<path>[^:]+):(?P<line>\d+)$")
ANSI_PATTERN = re.compile(r"\x1b\[[0-9;]*m")
ALLOWED_COMMANDS = ("node --version",)

GATE_IDS = (
    "H0-test",
    "H1-test",
    "H0-build-marketing",
    "H1-build-marketing",
    "H0-build-fixture",
    "H1-build-fixture",
    "H0-probe-fixture",
    "H1-probe-fixture",
    "H0-types-marketing",
    "H1-types-marketing",
    "H0-types-fixture",
    "H1-types-fixture",
    "H1-install",
)

BUILD_GATE_IDS = (
    "H0-build-marketing",
    "H1-build-marketing",
    "H0-build-fixture",
    "H1-build-fixture",
)


class UnsupportedRange(Exception):
    """Raised when a range form or a version form is outside the checker."""


def track_dir_resolve(track_id: str) -> Path:
    """Find the folder of a track.

    Args:
        track_id: The track identifier.

    Returns:
        The archive folder when it exists, otherwise the active track folder.
    """
    archive = REPO_ROOT / "measure" / "archive" / track_id
    if archive.is_dir():
        return archive
    return REPO_ROOT / "measure" / "tracks" / track_id


TRACK_DIR = track_dir_resolve(TRACK_ID)
NOTE_PATH = TRACK_DIR / "evidence" / "phase2-vinext-peer-check.md"
RAW_LOGS_DIR = TRACK_DIR / "evidence" / "phase2" / "raw-logs"
LOCK_PATH = REPO_ROOT / "pnpm-lock.yaml"


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


def _version_tuple(text: str) -> tuple[int, int, int]:
    """Convert a version into a three part number tuple.

    Args:
        text: The version text.

    Returns:
        The version as a tuple of three integers.

    Raises:
        UnsupportedRange: When the version has a pre-release part or a part
            that is not a number.
    """
    cleaned = text.strip().lstrip("v")
    if "-" in cleaned:
        raise UnsupportedRange(f"a pre-release version is not supported: {text}")
    pieces = cleaned.split(".")
    if len(pieces) > 3 or not all(piece.isdigit() for piece in pieces):
        raise UnsupportedRange(f"the version form is not supported: {text}")
    numbers = [int(piece) for piece in pieces]
    while len(numbers) < 3:
        numbers.append(0)
    return (numbers[0], numbers[1], numbers[2])


def _caret_bounds(base: str) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    """Compute the lower and upper bound of a caret range.

    Args:
        base: The version text of the caret range.

    Returns:
        The inclusive lower bound and the exclusive upper bound.
    """
    pieces = base.split(".")
    numbers = [int(piece) for piece in pieces]
    if numbers[0] > 0:
        upper = (numbers[0] + 1, 0, 0)
    elif len(numbers) >= 2 and numbers[1] > 0:
        upper = (0, numbers[1] + 1, 0)
    elif len(numbers) >= 3:
        upper = (0, 0, numbers[2] + 1)
    else:
        upper = (0, 1, 0)
    return (_version_tuple(base), upper)


def satisfies(version: str, range_text: str) -> str:
    """Check a version against a supported npm range.

    The checker supports the caret form, the greater-or-equal form, and the
    joined alternatives of both forms.

    Args:
        version: The version to test.
        range_text: The range text.

    Returns:
        `met` when the version satisfies the range, otherwise `not met`.

    Raises:
        UnsupportedRange: When the range form or the version form has no
            defined rule.
    """
    if "-" in version:
        raise UnsupportedRange(f"a pre-release version is not supported: {version}")
    for alternative in range_text.split("||"):
        part = alternative.strip()
        if part.startswith("^"):
            lower, upper = _caret_bounds(part[1:])
            if lower <= _version_tuple(version) < upper:
                return "met"
        elif part.startswith(">="):
            if _version_tuple(version) >= _version_tuple(part[2:]):
                return "met"
        else:
            raise UnsupportedRange(f"the range form is not supported: {part}")
    return "not met"


def resolve_installed(app: str, package: str) -> dict[str, Any] | None:
    """Find an installed package under an app or at the repository root.

    The lookup follows the Node resolution order of the hoisted linker.

    Args:
        app: The app folder name.
        package: The package name.

    Returns:
        A map with the package path, the manifest, and the version. The value
        is None when the package is not installed.
    """
    bases = (
        REPO_ROOT / "apps" / app / "node_modules" / package,
        REPO_ROOT / "node_modules" / package,
    )
    for base in bases:
        manifest = base / "package.json"
        if not manifest.is_file():
            continue
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        return {
            "path": base,
            "manifest": data,
            "version": str(data.get("version", "")),
        }
    return None


def parse_note_blocks(note_path: Path) -> dict[str, str]:
    """Read the fenced blocks of the note.

    Args:
        note_path: The note path.

    Returns:
        A map of block name to block body. A missing note gives an empty map.
    """
    if not note_path.is_file():
        return {}
    text = note_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r"^```([A-Za-z0-9_-]+)[ \t]*\r?\n(.*?)^```[ \t]*\r?$",
        re.MULTILINE | re.DOTALL,
    )
    blocks: dict[str, str] = {}
    for match in pattern.finditer(text):
        blocks[match.group(1)] = match.group(2)
    return blocks


def _load_block(name: str) -> tuple[dict[str, Any] | None, str | None]:
    """Load one named JSON block from the note.

    Args:
        name: The block name, such as `peer-check`.

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
        return "", f"git {joined} failed with exit {result.returncode}: {result.stdout.strip()}"
    return result.stdout, None


def _run_command(command: str) -> tuple[str, str | None]:
    """Run an allowed read-only command in the repository.

    Args:
        command: The command line.

    Returns:
        The command output and no error, or no output and an error message.
    """
    if command.strip() not in ALLOWED_COMMANDS:
        return "", f"the command is not allowed: {command}"
    result = subprocess.run(
        command,
        shell=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
        cwd=str(REPO_ROOT),
    )
    if result.returncode != 0:
        return "", f"the command failed with exit {result.returncode}: {command}"
    return result.stdout, None


def _node_version() -> tuple[str, str | None]:
    """Read the node version of the host.

    Returns:
        The version without its leading `v` and no error, or no version and an
        error message.
    """
    output, error = _run_command("node --version")
    if error is not None:
        return "", error
    version = output.strip().lstrip("v")
    if not version:
        return "", "the node command gave no version"
    return version, None


def _declared_vinext(app: str) -> str:
    """Read the declared vinext version of an app.

    Args:
        app: The app folder name.

    Returns:
        The declared version. An empty string means the app declares no
        vinext dependency.
    """
    manifest = REPO_ROOT / "apps" / app / "package.json"
    data = json.loads(manifest.read_text(encoding="utf-8"))
    for section in ("dependencies", "devDependencies"):
        block = data.get(section) or {}
        value = block.get("vinext")
        if isinstance(value, str):
            return value
    return ""


def _lock_vinext_importer_entries() -> list[tuple[str, str]]:
    """Read the vinext entries of the lockfile importers.

    Returns:
        A list of specifier and version pairs.
    """
    lines = LOCK_PATH.read_text(encoding="utf-8").splitlines()
    entries: list[tuple[str, str]] = []
    for index, line in enumerate(lines):
        if not re.match(r"^ {6}vinext:$", line):
            continue
        specifier = ""
        version = ""
        for offset in range(index + 1, min(index + 4, len(lines))):
            candidate = lines[offset]
            specifier_match = re.match(r"^ {8}specifier: (.+)$", candidate)
            version_match = re.match(r"^ {8}version: (.+)$", candidate)
            if specifier_match is not None:
                specifier = specifier_match.group(1).strip().strip("'\"")
                continue
            if version_match is not None:
                version = version_match.group(1).strip().strip("'\"")
                continue
            break
        entries.append((specifier, version))
    return entries


def _lock_sections(text: str) -> dict[int, tuple[str, str]]:
    """Map each lockfile line to its section and its importer.

    Args:
        text: The lockfile text.

    Returns:
        A map of line number to a section and importer pair.
    """
    sections: dict[int, tuple[str, str]] = {}
    section = ""
    importer = ""
    for number, line in enumerate(text.splitlines(), start=1):
        if line and not line.startswith((" ", "\t")):
            section = line.strip().rstrip(":")
            importer = ""
        elif (
            line.startswith("  ")
            and not line.startswith("   ")
            and line.strip().endswith(":")
        ):
            importer = line.strip().rstrip(":")
        sections[number] = (section, importer)
    return sections


def _lock_change_is_in_scope(section: tuple[str, str]) -> bool:
    """Decide whether a lockfile change stays inside the phase scope.

    The scope holds the importer block of each app in `APP_PATHS`. It also
    holds the `packages` section and the `snapshots` section. Every other
    importer block is out of scope.

    Args:
        section: The section and importer pair of a changed lockfile line.

    Returns:
        True when the change is in scope. False for every other importer.
    """
    top, importer = section
    if top in ("packages", "snapshots"):
        return True
    return top == "importers" and importer in APP_PATHS


def _changed_lock_lines(diff: str) -> list[tuple[str, int]]:
    """Read the changed line numbers of a lockfile diff.

    Args:
        diff: A unified diff of pnpm-lock.yaml.

    Returns:
        A list of side and line number pairs.
    """
    result: list[tuple[str, int]] = []
    old_line = 0
    new_line = 0
    for line in diff.splitlines():
        if line.startswith("@@"):
            match = re.search(r"@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
            if match is not None:
                old_line = int(match.group(1))
                new_line = int(match.group(2))
            continue
        if line.startswith("---") or line.startswith("+++"):
            continue
        if line.startswith("+"):
            result.append(("new", new_line))
            new_line += 1
        elif line.startswith("-"):
            result.append(("old", old_line))
            old_line += 1
        elif line.startswith(" "):
            old_line += 1
            new_line += 1
    return result


def _resolve_log(value: str) -> Path:
    """Resolve a log reference to a path.

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


def _parse_vitest_counts(text: str) -> tuple[int | None, int | None]:
    """Read the labeled vitest counts from a log.

    Args:
        text: The log text.

    Returns:
        The passed file count and the passed test count. Each value is None
        when the log has no labeled line.
    """
    files_passed: int | None = None
    tests_passed: int | None = None
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("Test Files"):
            match = re.search(r"(\d+)\s+passed", stripped)
            if match is not None:
                files_passed = int(match.group(1))
        elif stripped.startswith("Tests "):
            match = re.search(r"(\d+)\s+passed", stripped)
            if match is not None:
                tests_passed = int(match.group(1))
    return files_passed, tests_passed


def _parse_vitest_failures(text: str) -> list[str]:
    """Read the failed test lines from a vitest log.

    Args:
        text: The log text.

    Returns:
        A list of file and test name strings.
    """
    failures: list[str] = []
    for line in text.splitlines():
        cleaned = ANSI_PATTERN.sub("", line).strip()
        if not cleaned.startswith("FAIL"):
            continue
        remainder = cleaned[4:].strip()
        if not remainder:
            continue
        failures.append(re.sub(r"\s+", " ", remainder))
    return failures


class P2CheckerTests(unittest.TestCase):
    """Guard tests for the range checker of this file.

    The checker carries the rules that the note tests rely on. A broken copy of
    the checker fails at least one case here.
    """

    def test_caret_major_range_is_not_met(self) -> None:
        """Requires a caret range to reject a version under its lower bound."""
        self.assertEqual(satisfies("19.2.9", "^19.3.1"), "not met")

    def test_caret_zero_major_range_is_not_met(self) -> None:
        """Requires the caret rule to hold the minor bound of a zero major."""
        self.assertEqual(satisfies("0.5.27", "^0.5.37"), "not met")

    def test_joined_caret_range_is_met(self) -> None:
        """Requires a joined range to accept a version in the second part."""
        self.assertEqual(satisfies("6.0.3", "^5.1.4 || ^6.0.0"), "met")

    def test_greater_or_equal_range_is_met(self) -> None:
        """Requires a greater-or-equal range to accept a later version."""
        self.assertEqual(satisfies("22.22.3", ">=22"), "met")

    def test_unsupported_range_form_raises(self) -> None:
        """Requires an unsupported range form to raise UnsupportedRange."""
        with self.assertRaises(UnsupportedRange):
            satisfies("1.2.3", "~1.2")


class P2T1PeerNoteTests(unittest.TestCase):
    """Contracts for the Task 1 peer check note.

    The gate G2.1 of test-strategy.md section 4.5 runs this class. It checks
    that the note is true. It does not require the verdict `met`.
    """

    REQUIRED_KEYS = (
        "checked_on",
        "vinext_candidate",
        "registry_command",
        "registry_peers",
        "registry_engines",
        "rows",
        "overall",
        "decision",
    )

    def _peer_check(self) -> dict[str, Any]:
        """Load the peer-check block of the note.

        Returns:
            The parsed block. The test fails when the block is absent.
        """
        block, error = _load_block("peer-check")
        self.assertIsNone(error, error)
        assert block is not None
        return block

    def _rows(self, block: dict[str, Any]) -> list[dict[str, Any]]:
        """Read the row list of the peer-check block.

        Args:
            block: The peer-check block.

        Returns:
            The row list. The test fails when the list is absent or empty.
        """
        rows = block.get("rows")
        self.assertIsInstance(rows, list, "the rows field must be a list")
        assert isinstance(rows, list)
        self.assertGreaterEqual(
            len(rows),
            6,
            f"the rows field holds {len(rows)} rows, the note needs at least 6",
        )
        for row in rows:
            self.assertIsInstance(row, dict, "every row must be an object")
            assert isinstance(row, dict)
            self.assertIn("package", row, "every row needs a package name")
        return rows

    def test_note_exists_and_parses(self) -> None:
        """Requires the note to hold a peer-check block with every key."""
        block = self._peer_check()
        missing = [key for key in self.REQUIRED_KEYS if key not in block]
        self.assertFalse(
            missing,
            f"the peer-check block is missing these keys: {missing}",
        )

    def test_candidate_is_stable_1x(self) -> None:
        """Requires the candidate to be a stable 1.x version."""
        block = self._peer_check()
        candidate = block.get("vinext_candidate")
        self.assertIsInstance(candidate, str, "vinext_candidate must be a string")
        assert isinstance(candidate, str)
        self.assertRegex(
            candidate,
            CANDIDATE_PATTERN,
            f"the candidate {candidate} is not a stable 1.x version",
        )

    def test_rows_cover_every_registry_peer(self) -> None:
        """Requires one row for every registry peer and one node row."""
        block = self._peer_check()
        peers = block.get("registry_peers")
        self.assertIsInstance(peers, dict, "registry_peers must be an object")
        assert isinstance(peers, dict)
        self.assertTrue(peers, "registry_peers cannot be empty")
        rows = self._rows(block)
        names = [row["package"] for row in rows]
        for peer in peers:
            self.assertIn(
                peer,
                names,
                f"no row covers the registry peer {peer}",
            )
        self.assertIn("node", names, "no row covers the node engine range")

    def test_verdicts_recomputed(self) -> None:
        """Requires each row verdict to match the recomputed range check."""
        block = self._peer_check()
        rows = self._rows(block)
        for row in rows:
            package = row["package"]
            range_text = row.get("range")
            repo_value = row.get("repo_value")
            verdict = row.get("verdict")
            for key, value in (
                ("range", range_text),
                ("repo_value", repo_value),
                ("verdict", verdict),
            ):
                self.assertIsInstance(
                    value,
                    str,
                    f"the row {package} needs a string {key}",
                )
            assert isinstance(range_text, str)
            assert isinstance(repo_value, str)
            assert isinstance(verdict, str)
            try:
                recomputed = satisfies(repo_value, range_text)
            except UnsupportedRange as exc:
                self.fail(f"the row {package} uses an unsupported range: {exc}")
            self.assertEqual(
                recomputed,
                verdict,
                f"the row {package} states {verdict} but the check gives {recomputed}",
            )

    def test_repo_values_are_cited(self) -> None:
        """Requires each repo value to be cited by path and line."""
        block = self._peer_check()
        rows = self._rows(block)
        for row in rows:
            package = row["package"]
            source = row.get("repo_source")
            repo_value = row.get("repo_value")
            self.assertIsInstance(source, str, f"the row {package} needs a repo_source")
            self.assertIsInstance(repo_value, str, f"the row {package} needs a repo_value")
            assert isinstance(source, str)
            assert isinstance(repo_value, str)
            if source.startswith("cmd:"):
                self.assertEqual(
                    package,
                    "node",
                    f"the row {package} uses a command source, only the node row may do that",
                )
                command = source[4:].strip()
                output, error = _run_command(command)
                self.assertIsNone(error, error)
                self.assertIn(
                    repo_value,
                    output,
                    f"the command {command} does not print {repo_value}",
                )
                continue
            match = SOURCE_PATTERN.match(source)
            self.assertIsNotNone(
                match,
                f"the repo_source {source} of the row {package} is not path:line",
            )
            assert match is not None
            target = REPO_ROOT / match.group("path")
            self.assertTrue(
                target.is_file(),
                f"the cited file of the row {package} does not exist: {match.group('path')}",
            )
            lines = target.read_text(encoding="utf-8").splitlines()
            number = int(match.group("line"))
            self.assertGreater(
                number,
                0,
                f"the cited line of the row {package} is not positive",
            )
            self.assertLess(
                number,
                len(lines) + 1,
                f"the cited line {number} of the row {package} is past the file end",
            )
            self.assertIn(
                repo_value,
                lines[number - 1],
                f"the cited line {number} of the row {package} does not hold {repo_value}",
            )

    def test_decision_follows_verdicts(self) -> None:
        """Requires the overall verdict and the decision to follow the rows."""
        block = self._peer_check()
        rows = self._rows(block)
        blocking_not_met: list[str] = []
        for row in rows:
            package = row["package"]
            optional = bool(row.get("optional", False))
            installed = bool(row.get("installed", True))
            if optional and not installed:
                resolved = resolve_installed("marketing", package)
                self.assertFalse(
                    resolved is not None,
                    f"the row {package} states it is not installed, but the disk holds it",
                )
                continue
            if row.get("verdict") != "met":
                blocking_not_met.append(package)
        overall = block.get("overall")
        decision = block.get("decision")
        self.assertIsInstance(overall, str, "overall must be a string")
        self.assertIsInstance(decision, str, "decision must be a string")
        assert isinstance(overall, str)
        assert isinstance(decision, str)
        if blocking_not_met:
            self.assertEqual(
                overall,
                "not met",
                f"these blocking rows are not met: {blocking_not_met}",
            )
            self.assertEqual(
                decision,
                "stop-ask-pm",
                "a blocking row that is not met must stop for the PM",
            )
        else:
            self.assertEqual(overall, "met", "every blocking row is met")
            self.assertEqual(
                decision,
                "proceed",
                "no blocking row is not met, so the phase may continue",
            )


class P2T2DeclarationTests(unittest.TestCase):
    """Contracts for the Task 2 declaration, lockfile, and install state."""

    def _candidate(self) -> str:
        """Read the candidate version from the note.

        Returns:
            The candidate version. The test fails when the note is absent.
        """
        block, error = _load_block("peer-check")
        self.assertIsNone(error, error)
        assert block is not None
        candidate = block.get("vinext_candidate")
        self.assertIsInstance(candidate, str, "vinext_candidate must be a string")
        assert isinstance(candidate, str)
        return candidate

    def test_both_apps_declare_candidate(self) -> None:
        """Requires both apps to declare the candidate without a range prefix."""
        candidate = self._candidate()
        for app in APPS:
            declared = _declared_vinext(app)
            self.assertEqual(
                declared,
                candidate,
                f"the app {app} declares vinext {declared} and not {candidate}",
            )
            self.assertFalse(
                declared.startswith("^"),
                f"the app {app} declares a caret range for vinext",
            )
            self.assertFalse(
                declared.startswith("~"),
                f"the app {app} declares a tilde range for vinext",
            )
            self.assertEqual(
                declared.split(".")[0],
                "1",
                f"the app {app} declares vinext major {declared}",
            )

    def test_lock_importers(self) -> None:
        """Requires exactly two lockfile importer entries for vinext."""
        candidate = self._candidate()
        entries = _lock_vinext_importer_entries()
        self.assertEqual(
            len(entries),
            2,
            f"the lockfile holds {len(entries)} vinext importer entries, it needs 2",
        )
        for specifier, version in entries:
            self.assertEqual(
                specifier,
                candidate,
                f"a lockfile importer specifier is {specifier} and not {candidate}",
            )
            self.assertTrue(
                version.startswith(candidate),
                f"a lockfile importer version is {version} and does not start with {candidate}",
            )

    def test_lock_has_no_old_version(self) -> None:
        """Requires the lockfile to drop the old version and add the candidate."""
        candidate = self._candidate()
        text = LOCK_PATH.read_text(encoding="utf-8")
        old_count = text.count("vinext@0.2.0")
        self.assertEqual(
            old_count,
            0,
            f"the lockfile still holds {old_count} entries for vinext@0.2.0",
        )
        pattern = re.compile(
            r"^ {2}vinext@" + re.escape(candidate) + r":\s*$",
            re.MULTILINE,
        )
        self.assertIsNotNone(
            pattern.search(text),
            f"the lockfile has no package key for vinext@{candidate}",
        )

    def test_installed_matches_declared(self) -> None:
        """Requires the installed vinext version to match the declared version."""
        candidate = self._candidate()
        for app in APPS:
            installed = resolve_installed(app, "vinext")
            self.assertIsNotNone(
                installed,
                f"the app {app} has no installed vinext package",
            )
            assert installed is not None
            self.assertEqual(
                installed["version"],
                candidate,
                f"the app {app} has vinext {installed['version']} installed",
            )
            declared = _declared_vinext(app)
            self.assertEqual(
                declared,
                installed["version"],
                f"the app {app} declares {declared} and has {installed['version']} installed",
            )


class P2T2PeerGuardTests(unittest.TestCase):
    """Guard tests for the installed vinext package.

    These tests hold at the phase base commit. They must hold after the
    upgrade. The peer guard is the decisive refutation of a peer violation.
    """

    REQUIRED_PEERS = ("react", "react-dom", "vite")

    def test_installed_peers_satisfied(self) -> None:
        """Requires every installed peer of vinext to satisfy its range."""
        for app in APPS:
            installed = resolve_installed(app, "vinext")
            self.assertIsNotNone(
                installed,
                f"the app {app} has no installed vinext package",
            )
            assert installed is not None
            peers = installed["manifest"].get("peerDependencies") or {}
            self.assertIsInstance(peers, dict, "peerDependencies must be an object")
            assert isinstance(peers, dict)
            meta = installed["manifest"].get("peerDependenciesMeta") or {}
            for required in self.REQUIRED_PEERS:
                self.assertIn(
                    required,
                    peers,
                    f"the installed vinext does not peer on {required}",
                )
            for name, range_text in peers.items():
                self.assertIsInstance(range_text, str, f"the peer range of {name} must be a string")
                assert isinstance(range_text, str)
                resolved = resolve_installed(app, name)
                if resolved is None:
                    optional = bool((meta.get(name) or {}).get("optional"))
                    self.assertTrue(
                        optional,
                        f"the app {app} misses the required peer {name}",
                    )
                    continue
                try:
                    verdict = satisfies(resolved["version"], range_text)
                except UnsupportedRange as exc:
                    self.fail(f"the peer range of {name} has no rule: {exc}")
                self.assertEqual(
                    verdict,
                    "met",
                    f"the app {app} has {name} {resolved['version']} and the peer range is {range_text}",
                )
            engines = installed["manifest"].get("engines") or {}
            node_range = engines.get("node")
            if isinstance(node_range, str):
                version, error = _node_version()
                self.assertIsNone(error, error)
                try:
                    verdict = satisfies(version, node_range)
                except UnsupportedRange as exc:
                    self.fail(f"the node engine range has no rule: {exc}")
                self.assertEqual(
                    verdict,
                    "met",
                    f"the host node {version} does not satisfy the range {node_range}",
                )

    def test_hardcoded_vinext_paths_exist(self) -> None:
        """Requires every hard-coded vinext path to exist in the package."""
        sources = (
            "apps/marketing/vitest.config.ts",
            "apps/marketing/Dockerfile",
            "apps/marketing/scripts/verify-vinext-runtime.mjs",
        )
        found: set[str] = set()
        for source in sources:
            path = REPO_ROOT / source
            self.assertTrue(path.is_file(), f"the source file is missing: {source}")
            text = path.read_text(encoding="utf-8")
            for match in re.finditer(r"vinext/(dist/[A-Za-z0-9_./-]+)", text):
                found.add(match.group(1))
        self.assertGreaterEqual(
            len(found),
            7,
            f"the sources name {len(found)} vinext paths, the guard needs 7",
        )
        installed = resolve_installed("marketing", "vinext")
        self.assertIsNotNone(
            installed,
            "the marketing app has no installed vinext package",
        )
        assert installed is not None
        for relative in sorted(found):
            target = installed["path"] / relative
            if not target.exists() and not target.suffix:
                target = target.with_suffix(".js")
            self.assertTrue(
                target.exists(),
                f"the installed package has no file for {relative}",
            )


class P2T2ScopeTests(unittest.TestCase):
    """Contracts for the scope of the Green commits.

    The environment variable P2_GREEN_COMMITS lists the Green commit SHAs.
    The tests fail when the variable is unset or empty.
    """

    ALLOWED_FILES = (
        "pnpm-lock.yaml",
        f"measure/tracks/{TRACK_ID}/plan.md",
    )

    def _green_commits(self) -> list[str]:
        """Read the Green commit list from the environment.

        Returns:
            The commit SHAs. The test fails when the variable is unset.
        """
        raw = os.environ.get("P2_GREEN_COMMITS", "").strip()
        self.assertTrue(
            raw,
            "P2_GREEN_COMMITS is unset or empty, so the Green commits are unknown",
        )
        return raw.split()

    def _justified_app_changes(self) -> dict[str, dict[str, Any]]:
        """Read the justified app changes from the note.

        Returns:
            A map of app path to its justification entry.
        """
        block, error = _load_block("resolved-after")
        if error is not None:
            return {}
        entries = block.get("app_changes_justified")
        if not isinstance(entries, list):
            return {}
        justified: dict[str, dict[str, Any]] = {}
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            path = entry.get("path")
            if not isinstance(path, str):
                continue
            justified[path] = entry
        return justified

    def test_green_commits_in_scope(self) -> None:
        """Requires each Green commit to touch only the allowed paths."""
        commits = self._green_commits()
        justified = self._justified_app_changes()
        for commit in commits:
            output, error = _run_git(["show", "--name-only", "--format=", commit])
            self.assertIsNone(error, error)
            paths = [line.strip() for line in output.splitlines() if line.strip()]
            self.assertTrue(paths, f"the commit {commit} names no file")
            for path in paths:
                if path in self.ALLOWED_FILES:
                    continue
                if path.startswith(f"measure/tracks/{TRACK_ID}/evidence/"):
                    continue
                if any(path.startswith(f"{app_path}/") for app_path in APP_PATHS):
                    if path.endswith("/package.json"):
                        continue
                    self.assertIn(
                        path,
                        justified,
                        f"the commit {commit} touches {path} and the note has no justification",
                    )
                    entry = justified[path]
                    build_log = entry.get("build_log")
                    self.assertIsInstance(
                        build_log,
                        str,
                        f"the justification of {path} needs a build_log",
                    )
                    assert isinstance(build_log, str)
                    log_path = _resolve_log(build_log)
                    self.assertTrue(
                        log_path.is_file(),
                        f"the build log of {path} does not exist: {build_log}",
                    )
                    self.assertGreater(
                        log_path.stat().st_size,
                        0,
                        f"the build log of {path} is empty: {build_log}",
                    )
                    continue
                self.fail(
                    f"the commit {commit} touches {path}, which is outside the phase scope"
                )

    def test_lock_diff_in_scope(self) -> None:
        """Requires each lockfile change to stay in the app importers or packages."""
        commits = self._green_commits()
        for commit in commits:
            diff, error = _run_git(
                ["show", "--format=", "--unified=0", commit, "--", "pnpm-lock.yaml"]
            )
            self.assertIsNone(error, error)
            if not diff.strip():
                continue
            new_text, error = _run_git(["show", f"{commit}:pnpm-lock.yaml"])
            self.assertIsNone(error, error)
            old_text, error = _run_git(["show", f"{commit}^:pnpm-lock.yaml"])
            if error is not None:
                old_text = ""
            new_sections = _lock_sections(new_text)
            old_sections = _lock_sections(old_text)
            for side, number in _changed_lock_lines(diff):
                if side == "new":
                    section = new_sections.get(number)
                else:
                    section = old_sections.get(number)
                self.assertIsNotNone(
                    section,
                    f"the lockfile line {number} of {commit} has no section",
                )
                assert section is not None
                top, importer = section
                if _lock_change_is_in_scope(section):
                    continue
                self.fail(
                    f"the commit {commit} changes the lockfile line {number} "
                    f"in the {top} section ({importer})"
                )


class P2T2ScopeRuleTests(unittest.TestCase):
    """Falsification tests for the lockfile scope rule.

    The rule accepts the importer block of each app. It also accepts the
    `packages` section and the `snapshots` section. It rejects every other
    importer block. These tests feed a synthetic lockfile through the same
    helper that the scope test calls.
    """

    LOCK_TEXT = (
        "lockfileVersion: '9.0'\n"
        "\n"
        "settings:\n"
        "  autoInstallPeers: true\n"
        "\n"
        "overrides:\n"
        "  react: 19.2.9\n"
        "\n"
        "importers:\n"
        "\n"
        "  apps/activity-vinext-fixture:\n"
        "    dependencies:\n"
        "      vinext:\n"
        "        specifier: 1.2.0\n"
        "        version: 1.2.0\n"
        "\n"
        "  apps/marketing:\n"
        "    dependencies:\n"
        "      vinext:\n"
        "        specifier: 1.2.0\n"
        "        version: 1.2.0\n"
        "\n"
        "  apps/storytime:\n"
        "    dependencies:\n"
        "      vinext:\n"
        "        specifier: 1.2.0\n"
        "        version: 1.2.0\n"
        "\n"
        "packages:\n"
        "\n"
        "  vinext@1.2.0:\n"
        "    resolution: {integrity: sha512-placeholder}\n"
        "\n"
        "snapshots:\n"
        "\n"
        "  vinext@1.2.0:\n"
        "    dependencies:\n"
        "      react: 19.2.9\n"
    )

    def _lines_of(self, section: tuple[str, str]) -> list[int]:
        """Read the line numbers of a section and importer pair.

        Args:
            section: The section and importer pair.

        Returns:
            The line numbers that hold the pair.
        """
        sections = _lock_sections(self.LOCK_TEXT)
        return [
            number for number, pair in sections.items() if pair == section
        ]

    def test_app_importer_lines_are_in_scope(self) -> None:
        """Requires the importer block of each app to be in scope."""
        for app_path in APP_PATHS:
            section = ("importers", app_path)
            numbers = self._lines_of(section)
            self.assertTrue(
                numbers,
                f"the synthetic lockfile has no line for {app_path}",
            )
            for number in numbers:
                self.assertTrue(
                    _lock_change_is_in_scope(section),
                    f"the line {number} of {app_path} must be in scope",
                )

    def test_other_importer_lines_are_out_of_scope(self) -> None:
        """Requires a change in another importer block to fail the rule."""
        section = ("importers", "apps/storytime")
        numbers = self._lines_of(section)
        self.assertTrue(
            numbers,
            "the synthetic lockfile has no line for apps/storytime",
        )
        for number in numbers:
            self.assertFalse(
                _lock_change_is_in_scope(section),
                f"the line {number} of apps/storytime must be out of scope",
            )

    def test_package_section_lines_are_in_scope(self) -> None:
        """Requires the packages section and the snapshots section to be in scope."""
        for top in ("packages", "snapshots"):
            section = (top, "vinext@1.2.0")
            numbers = self._lines_of(section)
            self.assertTrue(
                numbers,
                f"the synthetic lockfile has no line for {top}",
            )
            for number in numbers:
                self.assertTrue(
                    _lock_change_is_in_scope(section),
                    f"the line {number} of {top} must be in scope",
                )

    def test_other_section_lines_are_out_of_scope(self) -> None:
        """Requires a change in another lockfile section to fail the rule."""
        section = ("overrides", "")
        numbers = self._lines_of(section)
        self.assertTrue(
            numbers,
            "the synthetic lockfile has no line for the overrides section",
        )
        for number in numbers:
            self.assertFalse(
                _lock_change_is_in_scope(section),
                f"the line {number} of the overrides section must be out of scope",
            )


class P2T3ResolvedNoteTests(unittest.TestCase):
    """Contracts for the Task 3 resolved note and the gate results."""

    def _gate_results(self) -> dict[str, Any]:
        """Load the gate-results block of the note.

        Returns:
            The parsed block. The test fails when the block is absent.
        """
        block, error = _load_block("gate-results")
        self.assertIsNone(error, error)
        assert block is not None
        return block

    def _gates(self, block: dict[str, Any]) -> list[dict[str, Any]]:
        """Read the gate entry list of the gate-results block.

        Args:
            block: The gate-results block.

        Returns:
            The gate entry list. The test fails when the list is absent.
        """
        gates = block.get("gates")
        self.assertIsInstance(gates, list, "the gates field must be a list")
        assert isinstance(gates, list)
        for entry in gates:
            self.assertIsInstance(entry, dict, "every gate entry must be an object")
            assert isinstance(entry, dict)
            for key in ("id", "command", "exit", "log", "start_epoch"):
                self.assertIn(key, entry, f"a gate entry lacks the key {key}")
        return gates

    def test_resolved_after_matches_disk(self) -> None:
        """Requires the resolved versions to match the installed packages."""
        block, error = _load_block("resolved-after")
        self.assertIsNone(error, error)
        assert block is not None
        for key in ("vinext", "vite", "react"):
            self.assertIn(key, block, f"the resolved-after block needs {key}")
        self.assertEqual(
            block.get("reproduce_commands"),
            ["pnpm why vinext", "pnpm why vite"],
            "the reproduce_commands list must name the two pnpm why commands",
        )
        for app in APPS:
            installed = resolve_installed(app, "vinext")
            self.assertIsNotNone(
                installed,
                f"the app {app} has no installed vinext package",
            )
            assert installed is not None
            self.assertEqual(
                block["vinext"],
                installed["version"],
                f"the note names vinext {block['vinext']} and the disk holds {installed['version']}",
            )
        for package in ("vite", "react"):
            installed = resolve_installed("marketing", package)
            self.assertIsNotNone(
                installed,
                f"the marketing app has no installed {package} package",
            )
            assert installed is not None
            self.assertEqual(
                block[package],
                installed["version"],
                f"the note names {package} {block[package]} and the disk holds {installed['version']}",
            )

    def test_gate_results_complete(self) -> None:
        """Requires one gate entry per strategy gate with an exit code and a log."""
        block = self._gate_results()
        gates = self._gates(block)
        ids = [entry["id"] for entry in gates]
        self.assertEqual(
            sorted(ids),
            sorted(GATE_IDS),
            "the gate entries do not match the gate ids of the strategy",
        )
        for entry in gates:
            gate_id = entry["id"]
            self.assertEqual(
                entry["exit"],
                0,
                f"the gate {gate_id} did not exit 0",
            )
            self.assertIsInstance(
                entry["start_epoch"],
                int,
                f"the gate {gate_id} needs an integer start_epoch",
            )
            assert isinstance(entry["start_epoch"], int)
            self.assertGreater(
                entry["start_epoch"],
                0,
                f"the gate {gate_id} needs a positive start_epoch",
            )
            log = _resolve_log(entry["log"])
            self.assertTrue(
                log.is_file(),
                f"the log of the gate {gate_id} does not exist: {entry['log']}",
            )
            self.assertGreater(
                log.stat().st_size,
                0,
                f"the log of the gate {gate_id} is empty: {entry['log']}",
            )

    def test_counts_match_logs(self) -> None:
        """Requires the vitest counts to match the raw logs and the baseline."""
        block = self._gate_results()
        counts = block.get("test_counts")
        self.assertIsInstance(counts, dict, "the gate-results block needs test_counts")
        assert isinstance(counts, dict)
        for phase in ("baseline", "after"):
            self.assertIn(phase, counts, f"the test_counts needs a {phase} entry")
        baseline = counts["baseline"]
        after = counts["after"]
        self.assertIsInstance(baseline, dict, "the baseline counts must be an object")
        self.assertIsInstance(after, dict, "the after counts must be an object")
        assert isinstance(baseline, dict)
        assert isinstance(after, dict)
        for phase, entry in (("baseline", baseline), ("after", after)):
            for key in ("log", "test_files", "tests", "failures"):
                self.assertIn(key, entry, f"the {phase} counts lack the key {key}")
            log = _resolve_log(entry["log"])
            self.assertTrue(
                log.is_file(),
                f"the {phase} log does not exist: {entry['log']}",
            )
            text = log.read_text(encoding="utf-8")
            files_passed, tests_passed = _parse_vitest_counts(text)
            self.assertIsNotNone(
                files_passed,
                f"the {phase} log has no labeled Test Files line",
            )
            self.assertIsNotNone(
                tests_passed,
                f"the {phase} log has no labeled Tests line",
            )
            assert files_passed is not None
            assert tests_passed is not None
            self.assertEqual(
                entry["test_files"],
                files_passed,
                f"the {phase} file count does not match the log",
            )
            self.assertEqual(
                entry["tests"],
                tests_passed,
                f"the {phase} test count does not match the log",
            )
            failures = entry["failures"]
            self.assertIsInstance(failures, list, f"the {phase} failures must be a list")
            assert isinstance(failures, list)
            parsed = _parse_vitest_failures(text)
            for failure in failures:
                self.assertIsInstance(failure, str, "a failure entry must be a string")
                assert isinstance(failure, str)
                self.assertTrue(
                    any(failure in line or line in failure for line in parsed),
                    f"the {phase} log does not hold the failure {failure}",
                )
            self.assertEqual(
                len(failures),
                len(set(parsed)),
                f"the {phase} failure count does not match the log",
            )
        self.assertEqual(
            after["test_files"],
            baseline["test_files"],
            "the upgrade changed the test file count",
        )
        self.assertGreaterEqual(
            after["tests"],
            baseline["tests"],
            "the upgrade lost tests",
        )
        after_failures = set(after["failures"])
        baseline_failures = set(baseline["failures"])
        self.assertTrue(
            after_failures.issubset(baseline_failures),
            "the upgrade introduced a new test failure",
        )

    def test_warning_counts_match_logs(self) -> None:
        """Requires each build log warning count to match the log lines."""
        block = self._gate_results()
        gates = self._gates(block)
        for entry in gates:
            gate_id = entry["id"]
            if "warning_line_count" not in entry:
                if gate_id in BUILD_GATE_IDS:
                    self.fail(f"the build gate {gate_id} has no warning_line_count")
                continue
            count = entry["warning_line_count"]
            self.assertIsInstance(
                count,
                int,
                f"the warning count of {gate_id} must be an integer",
            )
            assert isinstance(count, int)
            log = _resolve_log(entry["log"])
            self.assertTrue(
                log.is_file(),
                f"the log of the gate {gate_id} does not exist: {entry['log']}",
            )
            text = log.read_text(encoding="utf-8")
            lines = [
                line for line in text.splitlines() if re.search("warn", line, re.IGNORECASE)
            ]
            self.assertEqual(
                count,
                len(lines),
                f"the warning count of {gate_id} does not match the log",
            )


if __name__ == "__main__":
    unittest.main()
