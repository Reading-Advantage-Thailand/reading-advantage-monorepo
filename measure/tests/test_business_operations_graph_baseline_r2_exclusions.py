"""Verifies the complete R2 Task 4 TypeScript exclusion ledger."""
from __future__ import annotations

import base64
import copy
import hashlib
import json
import unittest
from pathlib import Path, PurePosixPath
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "business_operations_graph_baseline_remediation_20260730"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK_ID
EVIDENCE_DIR = TRACK_DIR / "r2-task4-exclusions-20260731"
LEDGER_PATH = EVIDENCE_DIR / "ledger.json"
MANIFEST_PATH = TRACK_DIR / "r1-task2-source-and-graph-20260731" / "snapshot.manifest.json"
ARCHIVE_PATH = TRACK_DIR / "r1-task2-source-and-graph-20260731" / "snapshot.archive.json"
INVENTORY_PATH = TRACK_DIR / "r2-task2-scan-transaction-20260731" / "scan-1-normalized-inventory-v1.json"
CANDIDATE_EXTENSIONS = {".ts", ".tsx", ".mts", ".cts"}
EXPECTED_EXCLUDED_COUNT = 3224
EXPECTED_ACCEPTED_SNAPSHOT_EXITS = {
    "backend-test": 1,
    "backend-check-types": 1,
    "advantage-play-kit-test": 1,
    "advantage-play-kit-check-types": 1,
    "vocabulary-games-test": 1,
    "vocabulary-games-check-types": 1,
}
EXPECTED_DIAGNOSTIC_EXITS = {
    "backend-test": 1,
    "backend-check-types": 2,
    "advantage-play-kit-test": 1,
    "advantage-play-kit-check-types": 2,
    "vocabulary-games-test": 1,
    "vocabulary-games-check-types": 0,
}


class ExclusionLedgerValidationError(ValueError):
    """Reports one stable fail-closed Task 4 ledger violation."""


def _load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON artifact.

    @param path The artifact path to load.
    @returns The parsed JSON value.
    """
    return json.loads(path.read_text(encoding="utf-8"))


def _canonical_digest(value: Any) -> str:
    """Hashes one value using the ledger's canonical JSON projection.

    @param value The JSON-compatible value to hash.
    @returns The lowercase SHA-256 digest.
    """
    payload = json.dumps(
        value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _require_keys(value: dict[str, Any], expected: set[str], code: str) -> None:
    """Rejects missing or unknown object keys.

    @param value The object under validation.
    @param expected The exact accepted key set.
    @param code The stable error prefix.
    @returns Nothing.
    @throws ExclusionLedgerValidationError When the key set differs.
    """
    if set(value) != expected:
        raise ExclusionLedgerValidationError(f"{code}: {sorted(set(value) ^ expected)}")


def _verify_stream(stream: dict[str, Any], context: str) -> None:
    """Binds a command stream descriptor to its retained bytes.

    @param stream The stream descriptor to verify.
    @param context The required evidence-directory prefix.
    @returns Nothing.
    @throws ExclusionLedgerValidationError When path, size, or digest differs.
    """
    _require_keys(stream, {"path", "sha256", "size"}, "COMMAND_STREAM_KEYS")
    relative = stream["path"]
    if not isinstance(relative, str) or not relative.startswith(f"{context}/"):
        raise ExclusionLedgerValidationError("COMMAND_STREAM_PATH")
    if Path(relative).is_absolute() or ".." in PurePosixPath(relative).parts:
        raise ExclusionLedgerValidationError("COMMAND_STREAM_MUTABLE_PATH")
    artifact = EVIDENCE_DIR / relative
    if not artifact.is_file():
        raise ExclusionLedgerValidationError("COMMAND_STREAM_MISSING")
    payload = artifact.read_bytes()
    if len(payload) != stream["size"]:
        raise ExclusionLedgerValidationError("COMMAND_STREAM_SIZE")
    if hashlib.sha256(payload).hexdigest() != stream["sha256"]:
        raise ExclusionLedgerValidationError("COMMAND_STREAM_DIGEST")


def _verify_commands(
    commands: list[dict[str, Any]], expected_exits: dict[str, int], context: str
) -> None:
    """Validates the complete exact-command set and retained streams.

    @param commands The command receipts to verify.
    @param expected_exits The expected truthful exits by command ID.
    @param context The retained stream directory and execution context.
    @returns Nothing.
    @throws ExclusionLedgerValidationError When any receipt is omitted or altered.
    """
    ids = [item.get("id") for item in commands]
    if len(ids) != len(set(ids)):
        raise ExclusionLedgerValidationError("COMMAND_DUPLICATE")
    if set(ids) != set(expected_exits):
        raise ExclusionLedgerValidationError("COMMAND_OMISSION")
    expected_argv = {
        "backend-test": ["CI=true", "pnpm", "--filter", "@reading-advantage/backend", "test"],
        "backend-check-types": ["CI=true", "pnpm", "--filter", "@reading-advantage/backend", "check-types"],
        "advantage-play-kit-test": ["CI=true", "pnpm", "--filter", "@reading-advantage/advantage-play-kit", "test"],
        "advantage-play-kit-check-types": ["CI=true", "pnpm", "--filter", "@reading-advantage/advantage-play-kit", "check-types"],
        "vocabulary-games-test": ["CI=true", "pnpm", "--filter", "vocabulary-games", "test", "--", "--runInBand"],
        "vocabulary-games-check-types": ["CI=true", "pnpm", "--filter", "vocabulary-games", "check-types"],
    }
    for item in commands:
        expected_keys = {
            "id", "command", "workingDirectory", "exitCode", "timedOut", "stdout", "stderr"
        }
        if context == "shared-worktree-diagnostic":
            expected_keys.add("preExistingOwnership")
        _require_keys(item, expected_keys, "COMMAND_KEYS")
        command_id = item["id"]
        if item["command"] != expected_argv[command_id]:
            raise ExclusionLedgerValidationError("COMMAND_ARGV")
        if item["exitCode"] != expected_exits[command_id] or item["timedOut"] is not False:
            raise ExclusionLedgerValidationError("COMMAND_EXIT")
        expected_cwd = (
            "accepted-snapshot-materialization"
            if context == "accepted-snapshot-attempt"
            else "shared-master-worktree-diagnostic-only"
        )
        if item["workingDirectory"] != expected_cwd:
            raise ExclusionLedgerValidationError("COMMAND_WORKING_DIRECTORY")
        if context == "shared-worktree-diagnostic" and item["exitCode"] != 0:
            owners = item["preExistingOwnership"]
            if not isinstance(owners, list) or not owners:
                raise ExclusionLedgerValidationError("COMMAND_FAILURE_OWNER")
        _verify_stream(item["stdout"], context)
        _verify_stream(item["stderr"], context)


def validate_ledger(ledger: dict[str, Any]) -> None:
    """Validates the ledger against immutable snapshot and graph evidence.

    @param ledger The Task 4 ledger object to validate.
    @returns Nothing.
    @throws ExclusionLedgerValidationError When any denominator, disposition, or receipt fails closed.
    """
    _require_keys(
        ledger,
        {
            "schemaVersion", "track", "phase", "snapshotBinding", "denominator",
            "excludedFiles", "requiredCommands", "overallDisposition",
        },
        "LEDGER_KEYS",
    )
    if ledger["schemaVersion"] != 1 or ledger["track"] != TRACK_ID:
        raise ExclusionLedgerValidationError("LEDGER_IDENTITY")

    manifest = _load_json(MANIFEST_PATH)
    archive = _load_json(ARCHIVE_PATH)
    inventory_document = _load_json(INVENTORY_PATH)
    inventory = inventory_document["inventory"]
    manifest_entries = {item["path"]: item for item in manifest["entries"]}
    archive_entries = {
        item["path"]: item for item in archive["entries"] if item["kind"] == "file"
    }
    candidates = sorted(
        path for path in manifest_entries if PurePosixPath(path).suffix in CANDIDATE_EXTENSIONS
    )
    graph_paths = sorted(item["path"] for item in inventory["files"])
    excluded_paths = sorted(set(candidates) - set(graph_paths))

    binding = ledger["snapshotBinding"]
    _require_keys(
        binding,
        {
            "manifestPath", "denominatorSha256", "entryCount",
            "normalizedGraphInventoryPath", "normalizedGraphInventorySha256",
        },
        "SNAPSHOT_BINDING_KEYS",
    )
    if binding["denominatorSha256"] != manifest["denominatorSha256"]:
        raise ExclusionLedgerValidationError("SNAPSHOT_DENOMINATOR_DIGEST")
    if binding["entryCount"] != len(manifest["entries"]):
        raise ExclusionLedgerValidationError("SNAPSHOT_ENTRY_COUNT")
    if binding["normalizedGraphInventorySha256"] != hashlib.sha256(INVENTORY_PATH.read_bytes()).hexdigest():
        raise ExclusionLedgerValidationError("GRAPH_INVENTORY_DIGEST")

    denominator = ledger["denominator"]
    _require_keys(
        denominator,
        {
            "candidateExtensions", "candidateTypeScriptCount", "candidatePathsSha256",
            "graphFileCount", "graphPathsSha256", "candidateGraphIntersectionCount",
            "excludedCount", "excludedPathsSha256", "excludedEntriesSha256",
        },
        "DENOMINATOR_KEYS",
    )
    if denominator["candidateExtensions"] != [".cts", ".mts", ".ts", ".tsx"]:
        raise ExclusionLedgerValidationError("CANDIDATE_EXTENSIONS")
    expected_values = {
        "candidateTypeScriptCount": len(candidates),
        "candidatePathsSha256": _canonical_digest(candidates),
        "graphFileCount": len(graph_paths),
        "graphPathsSha256": _canonical_digest(graph_paths),
        "candidateGraphIntersectionCount": len(set(candidates) & set(graph_paths)),
        "excludedCount": len(excluded_paths),
        "excludedPathsSha256": _canonical_digest(excluded_paths),
    }
    for key, expected in expected_values.items():
        if denominator[key] != expected:
            raise ExclusionLedgerValidationError(f"DENOMINATOR_{key}")

    rows = ledger["excludedFiles"]
    paths = [row.get("path") for row in rows]
    if len(paths) != len(set(paths)):
        raise ExclusionLedgerValidationError("EXCLUSION_DUPLICATE")
    if paths != excluded_paths:
        raise ExclusionLedgerValidationError("EXCLUSION_OMISSION_OR_EXTRA")
    if denominator["excludedEntriesSha256"] != _canonical_digest(rows):
        raise ExclusionLedgerValidationError("EXCLUSION_LEDGER_DIGEST")

    for row in rows:
        _require_keys(
            row,
            {
                "path", "sha256", "size", "owningPackage", "owningPackageRoot",
                "tsconfigExclusion", "classification", "adminCrmRelevance", "disposition",
            },
            "EXCLUSION_ROW_KEYS",
        )
        path = row["path"]
        source = manifest_entries[path]
        archived = archive_entries[path]
        payload = base64.b64decode(archived["contentBase64"])
        if row["sha256"] != source["sha256"] or row["size"] != source["size"]:
            raise ExclusionLedgerValidationError("EXCLUSION_SOURCE_IDENTITY")
        if hashlib.sha256(payload).hexdigest() != row["sha256"] or len(payload) != row["size"]:
            raise ExclusionLedgerValidationError("EXCLUSION_ARCHIVE_IDENTITY")
        if not row["owningPackage"] or not row["classification"] or not row["adminCrmRelevance"]:
            raise ExclusionLedgerValidationError("EXCLUSION_DISPOSITION_METADATA")
        reason = row["tsconfigExclusion"]
        _require_keys(reason, {"kind", "tsconfigPath", "patterns"}, "TSCONFIG_REASON_KEYS")
        if not reason["kind"] or not isinstance(reason["patterns"], list):
            raise ExclusionLedgerValidationError("TSCONFIG_REASON_EMPTY")
        disposition = row["disposition"]
        _require_keys(
            disposition,
            {"kind", "sourceAnchor", "typeCoverage", "testCoverage", "status"},
            "DISPOSITION_KEYS",
        )
        if disposition["kind"] != "SOURCE_ANCHOR_TYPE_TEST_COMPENSATION":
            raise ExclusionLedgerValidationError("DISPOSITION_KIND")
        anchor = disposition["sourceAnchor"]
        _require_keys(anchor, {"lineStart", "lineEnd", "sourceRangeSha256"}, "SOURCE_ANCHOR_KEYS")
        if anchor["lineStart"] != 1 or anchor["lineEnd"] < 1:
            raise ExclusionLedgerValidationError("SOURCE_ANCHOR_RANGE")
        if anchor["sourceRangeSha256"] != hashlib.sha256(payload).hexdigest():
            raise ExclusionLedgerValidationError("SOURCE_ANCHOR_DIGEST")
        for coverage_key in ("typeCoverage", "testCoverage"):
            coverage = disposition[coverage_key]
            _require_keys(coverage, {"commandId"}, "COVERAGE_KEYS")
            if not coverage["commandId"]:
                raise ExclusionLedgerValidationError("ZERO_ITEM_COMPENSATION")

    commands = ledger["requiredCommands"]
    _require_keys(
        commands,
        {
            "acceptedSnapshotAttempt", "acceptedSnapshotDisposition",
            "sharedWorktreeDiagnostic", "sharedWorktreeDisposition",
        },
        "REQUIRED_COMMAND_KEYS",
    )
    _verify_commands(
        commands["acceptedSnapshotAttempt"],
        EXPECTED_ACCEPTED_SNAPSHOT_EXITS,
        "accepted-snapshot-attempt",
    )
    _verify_commands(
        commands["sharedWorktreeDiagnostic"],
        EXPECTED_DIAGNOSTIC_EXITS,
        "shared-worktree-diagnostic",
    )
    if commands["acceptedSnapshotDisposition"]["status"] != "BLOCKED":
        raise ExclusionLedgerValidationError("FALSE_SNAPSHOT_SUCCESS")
    if commands["sharedWorktreeDisposition"]["status"] != "DIAGNOSTIC_ONLY":
        raise ExclusionLedgerValidationError("FALSE_DIAGNOSTIC_ACCEPTANCE")
    if ledger["overallDisposition"]["status"] != "BLOCKED":
        raise ExclusionLedgerValidationError("FALSE_BASELINE_ACCEPTANCE")
    if ledger["overallDisposition"]["compensationCount"] != len(rows):
        raise ExclusionLedgerValidationError("COMPENSATION_COUNT")
    if "/tmp/" in json.dumps(ledger):
        raise ExclusionLedgerValidationError("MACHINE_LOCAL_PATH")


class R2Task4ExclusionLedgerTests(unittest.TestCase):
    """Proves denominator completeness, disposition coverage, and truthful exits."""

    @classmethod
    def setUpClass(cls) -> None:
        """Loads the immutable committed ledger once for the test class."""
        cls.ledger = _load_json(LEDGER_PATH)

    def test_ledger_recomputes_complete_snapshot_minus_graph_denominator(self) -> None:
        """Accepts the committed ledger only through complete recomputation."""
        validate_ledger(self.ledger)
        self.assertEqual(self.ledger["denominator"]["excludedCount"], EXPECTED_EXCLUDED_COUNT)
        self.assertEqual(len(self.ledger["excludedFiles"]), EXPECTED_EXCLUDED_COUNT)

    def test_every_exclusion_has_explicit_metadata_anchor_type_and_test_disposition(self) -> None:
        """Rejects empty compensation and verifies all required per-file fields."""
        for row in self.ledger["excludedFiles"]:
            with self.subTest(path=row["path"]):
                self.assertTrue(row["owningPackage"])
                self.assertTrue(row["tsconfigExclusion"]["kind"])
                self.assertTrue(row["classification"])
                self.assertTrue(row["adminCrmRelevance"])
                self.assertTrue(row["disposition"]["sourceAnchor"]["sourceRangeSha256"])
                self.assertTrue(row["disposition"]["typeCoverage"]["commandId"])
                self.assertTrue(row["disposition"]["testCoverage"]["commandId"])

    def test_fr5_exits_are_truthful_and_failed_snapshot_execution_stays_blocked(self) -> None:
        """Preserves all six exact exits without treating diagnostics as acceptance."""
        commands = self.ledger["requiredCommands"]
        self.assertEqual(
            {item["id"]: item["exitCode"] for item in commands["acceptedSnapshotAttempt"]},
            EXPECTED_ACCEPTED_SNAPSHOT_EXITS,
        )
        self.assertEqual(
            {item["id"]: item["exitCode"] for item in commands["sharedWorktreeDiagnostic"]},
            EXPECTED_DIAGNOSTIC_EXITS,
        )
        self.assertEqual(commands["acceptedSnapshotDisposition"]["status"], "BLOCKED")
        self.assertEqual(self.ledger["overallDisposition"]["status"], "BLOCKED")


class R2Task4FailClosedCounterexampleTests(unittest.TestCase):
    """Mutates valid evidence to prove omission and tamper detection."""

    @classmethod
    def setUpClass(cls) -> None:
        """Loads the valid base ledger once for counterexample cloning."""
        cls.base = _load_json(LEDGER_PATH)

    def _assert_rejected(self, mutation: str, expected: str) -> None:
        """Applies one mutation and requires its stable fail-closed code.

        @param mutation The named mutation operation.
        @param expected The expected validation error fragment.
        @returns Nothing.
        """
        ledger = copy.deepcopy(self.base)
        rows = ledger["excludedFiles"]
        if mutation == "omit-exclusion":
            rows.pop()
        elif mutation == "duplicate-exclusion":
            rows.append(copy.deepcopy(rows[0]))
        elif mutation == "tamper-source-digest":
            rows[0]["sha256"] = "0" * 64
            ledger["denominator"]["excludedEntriesSha256"] = _canonical_digest(rows)
        elif mutation == "tamper-anchor-digest":
            rows[0]["disposition"]["sourceAnchor"]["sourceRangeSha256"] = "0" * 64
            ledger["denominator"]["excludedEntriesSha256"] = _canonical_digest(rows)
        elif mutation == "zero-type-compensation":
            rows[0]["disposition"]["typeCoverage"]["commandId"] = ""
            ledger["denominator"]["excludedEntriesSha256"] = _canonical_digest(rows)
        elif mutation == "omit-required-command":
            ledger["requiredCommands"]["acceptedSnapshotAttempt"].pop()
        elif mutation == "tamper-command-stream":
            ledger["requiredCommands"]["acceptedSnapshotAttempt"][0]["stdout"]["sha256"] = "0" * 64
        elif mutation == "false-success":
            ledger["overallDisposition"]["status"] = "ACCEPTED"
        elif mutation == "unknown-ledger-field":
            ledger["unexpected"] = True
        else:
            self.fail(f"unknown mutation: {mutation}")
        with self.assertRaisesRegex(ExclusionLedgerValidationError, expected):
            validate_ledger(ledger)

    def test_omission_counterexample_fails_closed(self) -> None:
        """Rejects a ledger that silently drops one excluded file."""
        self._assert_rejected("omit-exclusion", "EXCLUSION_OMISSION_OR_EXTRA")

    def test_duplicate_counterexample_fails_closed(self) -> None:
        """Rejects a duplicated disposition even when all rows look valid."""
        self._assert_rejected("duplicate-exclusion", "EXCLUSION_DUPLICATE")

    def test_source_and_anchor_tamper_counterexamples_fail_closed(self) -> None:
        """Rejects independently tampered source identity and anchor bytes."""
        self._assert_rejected("tamper-source-digest", "EXCLUSION_SOURCE_IDENTITY")
        self._assert_rejected("tamper-anchor-digest", "SOURCE_ANCHOR_DIGEST")

    def test_zero_item_compensation_counterexample_fails_closed(self) -> None:
        """Rejects a present-looking disposition with no type command."""
        self._assert_rejected("zero-type-compensation", "ZERO_ITEM_COMPENSATION")

    def test_command_omission_and_stream_tamper_counterexamples_fail_closed(self) -> None:
        """Rejects a missing required gate or altered retained output digest."""
        self._assert_rejected("omit-required-command", "COMMAND_OMISSION")
        self._assert_rejected("tamper-command-stream", "COMMAND_STREAM_DIGEST")

    def test_false_success_and_unknown_field_counterexamples_fail_closed(self) -> None:
        """Rejects false acceptance and schema-extension tampering."""
        self._assert_rejected("false-success", "FALSE_BASELINE_ACCEPTANCE")
        self._assert_rejected("unknown-ledger-field", "LEDGER_KEYS")


if __name__ == "__main__":
    unittest.main()
