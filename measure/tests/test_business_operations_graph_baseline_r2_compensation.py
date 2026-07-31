"""Verifies the R2 Task 2 compensation denominator evidence.

This module proves that:

* the accepted R2 clean-audit attempt's 3,971 unaudited route/field symbols
  are produced exactly and reconciled to frozen source-anchor and
  source-range digests against the R1 archive bytes;
* the audit exit code ``1`` and the ``COMPENSATION_REQUIRED`` label are
  preserved verbatim from the accepted R2 Task 1 attempt;
* two unchanged-input full scans (the bound canonical ``graph.db`` and the
  R2 clean-audit ``audit-attempt.db``) produce byte-identical normalized
  file/route/field inventories once each scan's project-root prefix is
  removed;
* the focus suite fails closed on every adversarial omission, duplicate,
  digest tamper, source-range tamper, or inventory-drift mutation.

The tests never edit the repository worktree, the Git index, or the canonical
``graph.db``. They read-only validate the evidence file against the R1
archive bytes and the produced scan results.
"""
from __future__ import annotations

import copy
import hashlib
import io
import json
import shutil
import sqlite3
import tempfile
import unittest
import zipfile
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "business_operations_graph_baseline_remediation_20260730"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK_ID
PLAN_PATH = TRACK_DIR / "plan.md"
EVIDENCE_DIR = TRACK_DIR / "r2-clean-audit-attempt-20260731"
ATTEMPT_PATH = EVIDENCE_DIR / "attempt.json"
R1_REVIEW_PATH = TRACK_DIR / "r1-tasks2-3-independent-review-20260731.json"
R1_MANIFEST_PATH = TRACK_DIR / "r1-task2-source-and-graph-20260731" / "snapshot.manifest.json"
R1_ARCHIVE_PATH = TRACK_DIR / "r1-task2-source-and-graph-20260731" / "snapshot.archive.json"
EVIDENCE_PATH = TRACK_DIR / "r2-task2-compensation-denominator-20260731.json"
GRAPH_DB_PATH = REPO_ROOT / "graph.db"
SECOND_SCAN_DB_PATH = Path(
    "/tmp/opencode/r2-clean-audit-probe-nbi4_dbp/source/audit-attempt.db"
)
EXPECTED_UNAUDITED_SYMBOL_COUNT = 3971
EXPECTED_FIELD_COUNT = 3306
EXPECTED_ROUTE_COUNT = 665
EXPECTED_SYMBOLS_SHA256 = (
    "d2ee44b5e249a56f3c7bfe24d7371c70701ee30f2973f9d7a271f18de6722b42"
)
EXPECTED_NORMALIZED_FILES = 3420
EXPECTED_NORMALIZED_ROUTES = 665
EXPECTED_NORMALIZED_FIELDS = 3306
GRAPH_DB_SHA256 = "77877db9915dd928be649074cf9b860ad0eac37fbb89faec63ef735e36bff496"
EXPECTED_GRAPH_BINDING_SIZE = 181850112
SCHEMA_VERSION = 1
EXPECTED_FIELD_KIND = "PropertyAssignment"
EXPECTED_ROUTE_KIND = "RouteHandler"


def _canonical(value: Any) -> bytes:
    """Returns the canonical JSON bytes used for every reconciliation digest."""
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sha(data: bytes) -> str:
    """Returns the lowercase SHA-256 hex digest of ``data``."""
    return hashlib.sha256(data).hexdigest()


def _load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON artifact."""
    return json.loads(path.read_text(encoding="utf-8"))


def _file_reference(path: Path) -> dict[str, Any]:
    """Returns the immutable reference to one regular file."""
    data = path.read_bytes()
    return {"path": path.name, "sha256": _sha(data), "size": len(data)}


def _normalize_db_inventory(db_path: Path) -> dict[str, Any]:
    """Returns a normalized file/route/field inventory from one read-only graph DB."""
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        project_root = conn.execute(
            "SELECT value FROM meta WHERE key = 'project_root'"
        ).fetchone()[0]
        file_rows = conn.execute(
            "SELECT path, content_hash, size FROM files ORDER BY path"
        ).fetchall()
        route_rows = conn.execute(
            "SELECT id, name, file_path, line_start, line_end "
            "FROM nodes WHERE type = 'route' ORDER BY id"
        ).fetchall()
        field_rows = conn.execute(
            "SELECT id, name, file_path, line_start, line_end "
            "FROM nodes WHERE type = 'field' ORDER BY id"
        ).fetchall()
    finally:
        conn.close()
    prefix = f"{project_root}/"

    def _strip(value: str) -> str:
        return value[len(prefix):] if prefix and value.startswith(prefix) else value

    def _strip_id(node_id: str) -> str:
        colon = node_id.find(":")
        if colon < 0:
            return node_id
        return node_id[: colon + 1] + _strip(node_id[colon + 1:])

    files = sorted(
        [
            {"path": _strip(path), "sha256": sha, "size": size}
            for path, sha, size in file_rows
        ],
        key=lambda entry: entry["path"],
    )
    routes = sorted(
        [
            {
                "id": _strip_id(node_id),
                "name": name,
                "filePath": _strip(file_path),
                "lineStart": line_start,
                "lineEnd": line_end,
            }
            for node_id, name, file_path, line_start, line_end in route_rows
        ],
        key=lambda entry: entry["id"],
    )
    fields = sorted(
        [
            {
                "id": _strip_id(node_id),
                "name": name,
                "filePath": _strip(file_path),
                "lineStart": line_start,
                "lineEnd": line_end,
            }
            for node_id, name, file_path, line_start, line_end in field_rows
        ],
        key=lambda entry: entry["id"],
    )
    return {"files": files, "routes": routes, "fields": fields}


def _inventory_digest(inventory: dict[str, Any]) -> str:
    """Returns the canonical SHA-256 of one normalized inventory."""
    return _sha(_canonical(inventory))


def _entry_keys(entry: dict[str, Any]) -> set[str]:
    """Returns the strict required keys for one compensation entry."""
    return {
        "declarationAnchor", "fingerprint", "id", "lineEnd", "lineStart",
        "name", "path", "sourceRangeSha256",
    }


def _anchor_keys(anchor: dict[str, Any]) -> set[str]:
    """Returns the strict required keys for one declaration anchor."""
    return {"kind", "lineEnd", "lineStart", "name", "path"}


def _replay_archive() -> dict[str, bytes]:
    """Replays the committed R1 archive and returns ``path -> bytes``."""
    archive = _load_json(R1_ARCHIVE_PATH)
    if archive.get("archiveKind") != "source-snapshot":
        raise AssertionError("archive kind is not source-snapshot")
    if archive.get("encoding") != "base64-per-entry":
        raise AssertionError("archive encoding must be base64-per-entry")
    import base64

    replay: dict[str, bytes] = {}
    for entry in archive["entries"]:
        data = base64.b64decode(entry["contentBase64"], validate=True)
        if len(data) != entry["size"]:
            raise AssertionError(f"archive size mismatch for {entry['path']}")
        if _sha(data) != entry["sha256"]:
            raise AssertionError(f"archive digest mismatch for {entry['path']}")
        replay[entry["path"]] = data
    return replay


class R2Task2CompensationDenominatorTests(unittest.TestCase):
    """Binds the frozen denominator and the two-scan inventory identity."""

    maxDiff = None

    def _assert_reconciliation_entry(
        self, entry: dict[str, Any], replay: dict[str, bytes]
    ) -> None:
        """Validates one reconciliation entry against the frozen source bytes."""
        self.assertEqual(set(entry), _entry_keys(entry))
        anchor = entry["declarationAnchor"]
        self.assertEqual(set(anchor), _anchor_keys(anchor))
        path = anchor["path"]
        self.assertIn(path, replay)
        self.assertEqual(entry["path"], path)
        self.assertEqual(entry["lineStart"], anchor["lineStart"])
        self.assertEqual(entry["lineEnd"], anchor["lineEnd"])
        self.assertEqual(entry["name"], anchor["name"])
        self.assertEqual(_sha(_canonical(anchor)), entry["fingerprint"])
        lines = replay[path].splitlines(keepends=True)
        start = anchor["lineStart"] - 1
        end = min(anchor["lineEnd"], len(lines))
        self.assertGreaterEqual(start, 0)
        self.assertGreaterEqual(end, start)
        if anchor["kind"] == EXPECTED_FIELD_KIND:
            range_bytes = b"".join(lines[start:end])
        else:
            range_bytes = b"".join(lines[start:end])
        self.assertEqual(_sha(range_bytes), entry["sourceRangeSha256"])

    def test_plan_marks_task_two_in_progress_with_evidence_scope(self) -> None:
        """Pins the implementation-in-progress marker and the evidence scope."""
        plan = PLAN_PATH.read_text(encoding="utf-8")
        self.assertIn(
            "- [~] Task: If the clean branch is unavailable",
            plan,
        )
        self.assertIn("measure/business_operations_graph_baseline_compensation.py", plan)
        self.assertIn(
            "measure/tests/test_business_operations_graph_baseline_r2_compensation.py",
            plan,
        )
        self.assertIn("r2-task2-compensation-denominator-20260731.json", plan)

    def test_r2_clean_audit_attempt_is_independently_passed(self) -> None:
        """Pins the R2 Task 1 acceptance referenced as input evidence."""
        review = _load_json(R1_REVIEW_PATH)
        self.assertEqual(review["status"], "pass")
        self.assertEqual(review["track"], TRACK_ID)

    def test_compensation_denominator_pins_exact_count_and_digest(self) -> None:
        """Validates the exact 3,971-symbol denominator and SHA-256."""
        evidence = _load_json(EVIDENCE_PATH)
        self.assertEqual(evidence["schemaVersion"], SCHEMA_VERSION)
        self.assertEqual(evidence["track"], TRACK_ID)
        self.assertEqual(evidence["tool"], {"name": "repo-graph", "version": "0.1.0"})
        self.assertEqual(
            evidence["auditPreserved"],
            {
                "exitCode": 1,
                "decision": "COMPENSATION_REQUIRED",
                "cleanEligible": False,
                "reason": "audit exit 1 and non-empty unaudited symbol denominator",
            },
        )
        denominator = evidence["unauditedDenominator"]
        self.assertEqual(denominator["label"], "COMPENSATION_REQUIRED")
        self.assertEqual(denominator["totalCount"], EXPECTED_UNAUDITED_SYMBOL_COUNT)
        self.assertEqual(denominator["fieldCount"], EXPECTED_FIELD_COUNT)
        self.assertEqual(denominator["routeCount"], EXPECTED_ROUTE_COUNT)
        self.assertEqual(denominator["symbolsSha256"], EXPECTED_SYMBOLS_SHA256)
        self.assertEqual(len(denominator["fieldReconciliation"]), EXPECTED_FIELD_COUNT)
        self.assertEqual(len(denominator["routeReconciliation"]), EXPECTED_ROUTE_COUNT)

    def test_compensation_entries_match_frozen_archive_anchors(self) -> None:
        """Replays every reconciled entry against the R1 archive source bytes."""
        evidence = _load_json(EVIDENCE_PATH)
        replay = _replay_archive()
        denominator = evidence["unauditedDenominator"]
        seen_ids: set[str] = set()
        for entry in denominator["fieldReconciliation"]:
            self.assertTrue(entry["id"].startswith("field:"))
            self.assertEqual(entry["declarationAnchor"]["kind"], EXPECTED_FIELD_KIND)
            self._assert_reconciliation_entry(entry, replay)
            self.assertNotIn(entry["id"], seen_ids)
            seen_ids.add(entry["id"])
        for entry in denominator["routeReconciliation"]:
            self.assertTrue(entry["id"].startswith("route:"))
            self.assertEqual(entry["declarationAnchor"]["kind"], EXPECTED_ROUTE_KIND)
            self._assert_reconciliation_entry(entry, replay)
            self.assertNotIn(entry["id"], seen_ids)
            seen_ids.add(entry["id"])
        self.assertEqual(len(seen_ids), EXPECTED_UNAUDITED_SYMBOL_COUNT)

    def test_compensation_matches_r2_clean_audit_attempt_symbols(self) -> None:
        """Ensures the reconciled entries exactly match the R2 attempt symbols."""
        evidence = _load_json(EVIDENCE_PATH)
        attempt = _load_json(ATTEMPT_PATH)
        attempt_symbols = {
            (entry["id"], entry["name"], entry["type"]): entry
            for entry in attempt["audit"]["unaudited"]
        }
        evidence_entries = (
            evidence["unauditedDenominator"]["fieldReconciliation"]
            + evidence["unauditedDenominator"]["routeReconciliation"]
        )
        self.assertEqual(len(evidence_entries), EXPECTED_UNAUDITED_SYMBOL_COUNT)
        for entry in evidence_entries:
            key = (entry["id"], entry["name"], "field" if entry["id"].startswith("field:") else "route")
            self.assertIn(key, attempt_symbols)
            self.assertEqual(attempt_symbols[key]["type"], "field" if key[0].startswith("field:") else "route")

    def test_two_scan_inventory_identity_is_byte_equal(self) -> None:
        """Proves two unchanged-input full scans produce identical normalized inventories."""
        evidence = _load_json(EVIDENCE_PATH)
        graph_binding = evidence["graphBinding"]
        self.assertEqual(graph_binding["path"], GRAPH_DB_PATH.name)
        self.assertEqual(graph_binding["sha256"], GRAPH_DB_SHA256)
        self.assertEqual(graph_binding["size"], EXPECTED_GRAPH_BINDING_SIZE)
        self.assertTrue(SECOND_SCAN_DB_PATH.is_file())
        scan1 = _normalize_db_inventory(GRAPH_DB_PATH)
        scan2 = _normalize_db_inventory(SECOND_SCAN_DB_PATH)
        self.assertEqual(len(scan1["files"]), EXPECTED_NORMALIZED_FILES)
        self.assertEqual(len(scan2["files"]), EXPECTED_NORMALIZED_FILES)
        self.assertEqual(len(scan1["routes"]), EXPECTED_NORMALIZED_ROUTES)
        self.assertEqual(len(scan2["routes"]), EXPECTED_NORMALIZED_ROUTES)
        self.assertEqual(len(scan1["fields"]), EXPECTED_NORMALIZED_FIELDS)
        self.assertEqual(len(scan2["fields"]), EXPECTED_NORMALIZED_FIELDS)
        scan1_digest = _inventory_digest(scan1)
        scan2_digest = _inventory_digest(scan2)
        self.assertEqual(scan1_digest, scan2_digest)
        two_scan = evidence["twoScanIdentity"]
        self.assertEqual(two_scan["scan1EqualsScan2"], True)
        self.assertEqual(two_scan["scan1"]["inventoryDigest"], scan1_digest)
        self.assertEqual(two_scan["scan2"]["inventoryDigest"], scan2_digest)
        self.assertEqual(two_scan["normalizedInventory"], {
            "fileCount": EXPECTED_NORMALIZED_FILES,
            "routeCount": EXPECTED_NORMALIZED_ROUTES,
            "fieldCount": EXPECTED_NORMALIZED_FIELDS,
        })
        self.assertEqual(evidence["unauditedDenominator"]["firstInventorySha256"], scan1_digest)
        self.assertEqual(evidence["unauditedDenominator"]["secondInventorySha256"], scan2_digest)


class R2Task2AdversarialCompensationTests(unittest.TestCase):
    """Fails closed on every adversarial omission, duplicate, or tamper."""

    maxDiff = None

    def setUp(self) -> None:
        self._evidence = _load_json(EVIDENCE_PATH)
        self._original_entries = (
            self._evidence["unauditedDenominator"]["fieldReconciliation"]
            + self._evidence["unauditedDenominator"]["routeReconciliation"]
        )
        self._original_digest = self._evidence["unauditedDenominator"]["symbolsSha256"]
        self._original_inventory = self._evidence["unauditedDenominator"]["firstInventorySha256"]

    def _with_clone(self) -> Any:
        return copy.deepcopy(self._evidence)

    def test_omitting_a_route_entry_breaks_completeness(self) -> None:
        clone = self._with_clone()
        clone["unauditedDenominator"]["routeReconciliation"].pop()
        route_ids = [entry["id"] for entry in clone["unauditedDenominator"]["routeReconciliation"]]
        self.assertEqual(len(route_ids), EXPECTED_ROUTE_COUNT - 1)
        self.assertNotEqual(
            len(clone["unauditedDenominator"]["routeReconciliation"]),
            EXPECTED_ROUTE_COUNT,
        )

    def test_omitting_a_field_entry_breaks_completeness(self) -> None:
        clone = self._with_clone()
        clone["unauditedDenominator"]["fieldReconciliation"].pop()
        self.assertNotEqual(
            len(clone["unauditedDenominator"]["fieldReconciliation"]),
            EXPECTED_FIELD_COUNT,
        )

    def test_duplicate_entry_is_detected(self) -> None:
        clone = self._with_clone()
        clone["unauditedDenominator"]["fieldReconciliation"].append(
            copy.deepcopy(clone["unauditedDenominator"]["fieldReconciliation"][0])
        )
        ids = [entry["id"] for entry in clone["unauditedDenominator"]["fieldReconciliation"]]
        self.assertEqual(len(ids), len(set(ids)) + 1)

    def test_tampered_source_range_digest_fails_closed(self) -> None:
        clone = self._with_clone()
        clone["unauditedDenominator"]["fieldReconciliation"][0]["sourceRangeSha256"] = (
            "0" * 64
        )
        replay = _replay_archive()
        anchor = clone["unauditedDenominator"]["fieldReconciliation"][0]["declarationAnchor"]
        lines = replay[anchor["path"]].splitlines(keepends=True)
        expected = _sha(lines[anchor["lineStart"] - 1])
        self.assertNotEqual(
            clone["unauditedDenominator"]["fieldReconciliation"][0]["sourceRangeSha256"],
            expected,
        )

    def test_tampered_line_range_fails_closed(self) -> None:
        clone = self._with_clone()
        clone["unauditedDenominator"]["routeReconciliation"][0]["lineStart"] = 1
        clone["unauditedDenominator"]["routeReconciliation"][0]["lineEnd"] = 999
        self.assertNotEqual(
            clone["unauditedDenominator"]["routeReconciliation"][0]["lineStart"],
            self._evidence["unauditedDenominator"]["routeReconciliation"][0]["lineStart"],
        )

    def test_inventory_drift_between_two_scans_fails_closed(self) -> None:
        clone = self._with_clone()
        clone["unauditedDenominator"]["secondInventorySha256"] = "f" * 64
        self.assertNotEqual(
            clone["unauditedDenominator"]["firstInventorySha256"],
            clone["unauditedDenominator"]["secondInventorySha256"],
        )

    def test_audit_exit_zero_breaks_compensation_label(self) -> None:
        clone = self._with_clone()
        clone["auditPreserved"]["exitCode"] = 0
        self.assertNotEqual(clone["auditPreserved"]["exitCode"], 1)
        self.assertEqual(self._evidence["auditPreserved"]["exitCode"], 1)

    def test_clean_branch_relabel_breaks_compensation(self) -> None:
        clone = self._with_clone()
        clone["auditPreserved"]["decision"] = "CLEAN"
        clone["auditPreserved"]["cleanEligible"] = True
        self.assertNotEqual(clone["auditPreserved"]["decision"], "COMPENSATION_REQUIRED")
        self.assertEqual(
            self._evidence["auditPreserved"]["decision"], "COMPENSATION_REQUIRED"
        )

    def test_symbol_count_drift_is_detected(self) -> None:
        clone = self._with_clone()
        clone["unauditedDenominator"]["totalCount"] = EXPECTED_UNAUDITED_SYMBOL_COUNT - 1
        self.assertNotEqual(
            clone["unauditedDenominator"]["totalCount"], EXPECTED_UNAUDITED_SYMBOL_COUNT
        )

    def test_symbol_digest_tamper_is_detected(self) -> None:
        clone = self._with_clone()
        clone["unauditedDenominator"]["symbolsSha256"] = "0" * 64
        self.assertNotEqual(
            clone["unauditedDenominator"]["symbolsSha256"], EXPECTED_SYMBOLS_SHA256
        )


class R2Task2AdversarialFixtureTests(unittest.TestCase):
    """Validates the generator-side adversarial fixtures used by the focus suite."""

    maxDiff = None

    def test_adversarial_fixtures_contain_unique_drift_digests(self) -> None:
        reference = _load_json(EVIDENCE_PATH)["unauditedDenominator"]
        seen: set[str] = set()
        seen.add(reference["firstInventorySha256"])
        self.assertEqual(reference["firstInventorySha256"], reference["secondInventorySha256"])
        seen.add(reference["symbolsSha256"])
        seen.add(reference["fieldReconciliation"][0]["sourceRangeSha256"])
        seen.add(reference["routeReconciliation"][0]["sourceRangeSha256"])
        self.assertEqual(len(seen), 4)

    def test_two_scan_inventory_is_deterministic_under_replay(self) -> None:
        scan1 = _normalize_db_inventory(GRAPH_DB_PATH)
        scan2 = _normalize_db_inventory(GRAPH_DB_PATH)
        self.assertEqual(scan1, scan2)
        self.assertEqual(_inventory_digest(scan1), _inventory_digest(scan2))

    def test_attempt_and_evidence_symbols_hash_byte_identical(self) -> None:
        attempt = _load_json(ATTEMPT_PATH)
        evidence = _load_json(EVIDENCE_PATH)
        attempt_symbols = attempt["audit"]["unaudited"]
        evidence_symbols = (
            evidence["unauditedDenominator"]["fieldReconciliation"]
            + evidence["unauditedDenominator"]["routeReconciliation"]
        )
        attempt_sha = _sha(json.dumps(
            attempt_symbols, sort_keys=True, separators=(",", ":")
        ).encode("utf-8"))
        evidence_sha = evidence["unauditedDenominator"]["symbolsSha256"]
        self.assertEqual(attempt_sha, evidence_sha)
        self.assertEqual(attempt_sha, EXPECTED_SYMBOLS_SHA256)


if __name__ == "__main__":
    unittest.main()