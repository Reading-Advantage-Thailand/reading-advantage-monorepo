"""Guards the R1/R2 v2 candidate boundary before independent acceptance."""
from __future__ import annotations

import hashlib
import json
import re
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK_ID = "business_operations_graph_baseline_remediation_20260730"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK_ID
PLAN_PATH = TRACK_DIR / "plan.md"
TRACKS_PATH = REPO_ROOT / "measure" / "tracks.md"
ADMIN_PLAN_PATH = (
    REPO_ROOT / "measure" / "tracks" / "small_company_admin_privileges_20260722" / "plan.md"
)
CRM_PLAN_PATH = (
    REPO_ROOT / "measure" / "tracks" / "customer_licensing_crm_20260722" / "plan.md"
)
V2_BUNDLE = TRACK_DIR / "r1-task2-source-and-graph-v2-20260801"
V2_MANIFEST = V2_BUNDLE / "snapshot.manifest.json"
V2_ARCHIVE = V2_BUNDLE / "snapshot.archive.json"
V2_PRE_STATE = V2_BUNDLE / "snapshot.pre-state.json"
V2_POST_STATE = V2_BUNDLE / "snapshot.post-state.json"
V2_SCAN = V2_BUNDLE / "snapshot.scan.json"
V2_GRAPH_BINDING = TRACK_DIR / "r1-task3-graph-binding-v2-20260801.json"
V2_AUDIT_ATTEMPT = TRACK_DIR / "r2-clean-audit-attempt-v2-20260801" / "attempt.json"
V2_COMPENSATION = TRACK_DIR / "r2-task2-compensation-denominator-v2-20260801.json"
V2_SCAN_TRANSACTION = TRACK_DIR / "r2-task2-scan-transaction-v2-20260801"
BASELINE_HEAD = "e78fe22bb405de732de14c18590b19af0ce5f0de"

HISTORICAL_V1_SHA256 = {
    "r1-task2-source-and-graph-20260731/snapshot.manifest.json": (
        "93f694e0207d941d0c9bdb421c9ed4651ed431c683a33382ff11cd5faac41853"
    ),
    "r1-task2-source-and-graph-20260731/snapshot.archive.json": (
        "ec691ae0551ebf328d15471708104692066255063df496ff895b726c225bffce"
    ),
    "r1-task3-graph-binding-20260731.json": (
        "221f3dae0db8f833d4afe82dddbd840423e2c78f637ad087029b8f1cb21838e5"
    ),
    "r2-clean-audit-attempt-20260731/attempt.json": (
        "95e0d17e9ab69510e86b85a8b19611578468b4af1ae49fa4f8f54559c6122f1c"
    ),
    "r2-task2-compensation-denominator-20260731.json": (
        "af039a7525424520a6de441575e903f37492660356837bd939c358e3b65fa164"
    ),
}


def _sha256(data: bytes) -> str:
    """Returns the lowercase SHA-256 digest of data.

    @param data The bytes to digest.
    @returns The digest in hexadecimal form.
    """
    return hashlib.sha256(data).hexdigest()


def _load_json(path: Path, case: unittest.TestCase) -> dict[str, Any]:
    """Loads one required, non-symlink JSON evidence artifact.

    @param path The evidence artifact to load.
    @param case The test case that reports assertion failures.
    @returns The parsed JSON object.
    """
    case.assertTrue(path.is_file(), f"missing required candidate artifact: {path.relative_to(REPO_ROOT)}")
    case.assertFalse(path.is_symlink(), f"candidate artifact must not be a symlink: {path.relative_to(REPO_ROOT)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    case.assertIsInstance(value, dict, f"candidate artifact must be a JSON object: {path.relative_to(REPO_ROOT)}")
    return value


def _track_reference(path: Path) -> dict[str, Any]:
    """Builds the required track-relative immutable artifact reference.

    @param path The artifact to reference.
    @returns The path, digest, and size reference expected in candidate evidence.
    """
    data = path.read_bytes()
    return {
        "path": path.relative_to(TRACK_DIR).as_posix(),
        "sha256": _sha256(data),
        "size": len(data),
    }


def _load_track_reference(reference: dict[str, Any], case: unittest.TestCase) -> dict[str, Any]:
    """Loads one hash-bound JSON reference located below the owning track.

    @param reference The track-relative artifact reference to validate.
    @param case The test case that reports assertion failures.
    @returns The parsed referenced JSON object.
    """
    case.assertEqual(set(reference), {"path", "sha256", "size"})
    relative = Path(reference["path"])
    case.assertFalse(relative.is_absolute())
    case.assertNotIn("..", relative.parts)
    path = TRACK_DIR / relative
    case.assertTrue(path.is_file(), f"missing hash-bound artifact: {reference['path']}")
    case.assertFalse(path.is_symlink(), f"artifact must not be a symlink: {reference['path']}")
    case.assertEqual(_track_reference(path), reference)
    return _load_json(path, case)


class R1R2V2CandidateAcceptanceTests(unittest.TestCase):
    """Prevents an incomplete R1/R2 v2 candidate from being treated as accepted."""

    maxDiff = None

    def test_historical_v1_evidence_is_immutable(self) -> None:
        """Pins every superseded v1 evidence input to its retained historical bytes."""
        for relative, expected_sha256 in HISTORICAL_V1_SHA256.items():
            with self.subTest(relative=relative):
                path = TRACK_DIR / relative
                self.assertTrue(path.is_file(), f"missing retained v1 evidence: {relative}")
                self.assertFalse(path.is_symlink(), f"v1 evidence must remain a regular file: {relative}")
                self.assertEqual(_sha256(path.read_bytes()), expected_sha256)

    def test_only_allowed_track_markers_and_successor_blockers_remain(self) -> None:
        """Requires the recapture to preserve its scope and both downstream blockers."""
        plan = PLAN_PATH.read_text(encoding="utf-8")
        markers = re.findall(r"^- \[([^\]]+)\]", plan, flags=re.MULTILINE)
        self.assertGreater(len(markers), 0)
        self.assertTrue(set(markers).issubset({"~", "x", "b"}), markers)
        self.assertIn("R2 Task 3/4 acceptance", plan)
        self.assertRegex(plan, r"cannot unblock either\s+successor")
        self.assertIn("`COMPENSATION_REQUIRED`", plan)
        self.assertIn("- [x] Task: Recapture the R1 source/graph candidate", plan)
        self.assertIn("- [x] Task: Execute and record the documented clean-audit/", plan)
        self.assertIn("- [x] Task: If the clean branch is unavailable", plan)
        self.assertIn("commit `772839f` binds the evidence", plan)
        self.assertRegex(plan, r"R2 Tasks 3-5\s+and all R3 tasks remain `\[b\]`")
        self.assertIn("- [b] Task: Produce and test the Accounts unaudited-route security matrix", plan)
        self.assertIn("- [b] Task: Compute the snapshot TypeScript-minus-graph denominator", plan)
        self.assertIn("- [b] Task: Apply the FR6 decision rule", plan)
        phase_r3 = plan.split("## Phase R3: Verify, review, and control unblocking", maxsplit=1)[1]
        self.assertEqual(len(re.findall(r"^- \[b\] Task:", phase_r3, flags=re.MULTILINE)), 5)

        admin_plan = ADMIN_PLAN_PATH.read_text(encoding="utf-8")
        self.assertIn("- [~] Task: Publish the graph baseline producer evidence", admin_plan)
        self.assertIn("- [b] Task: Define the exact owner-to-application role mapping contract", admin_plan)
        self.assertIn("deferred:small_company_admin_privileges_20260722-phase0-acceptance", admin_plan)

        crm_plan = CRM_PLAN_PATH.read_text(encoding="utf-8")
        self.assertIn("- [b] Task: Define strict lead, organization, contact, school-site", crm_plan)
        self.assertIn("deferred:small_company_admin_privileges_20260722-phase0-acceptance", crm_plan)

        tracks = TRACKS_PATH.read_text(encoding="utf-8")
        self.assertIn("- [~] **Track: Business Operations Graph Baseline Remediation**", tracks)
        self.assertIn("- [b] **Track: Customer, Licensing, and Minimal CRM Control Plane**", tracks)

    def test_v2_graph_binding_is_source_hash_bound_and_explicitly_unaccepted(self) -> None:
        """Requires the v2 graph to bind only the current snapshot and remain a candidate."""
        manifest = _load_json(V2_MANIFEST, self)
        scan = _load_json(V2_SCAN, self)
        pre_state = _load_json(V2_PRE_STATE, self)
        post_state = _load_json(V2_POST_STATE, self)
        self.assertTrue(V2_ARCHIVE.is_file(), "missing required v2 source archive")
        self.assertFalse(V2_ARCHIVE.is_symlink(), "v2 source archive must not be a symlink")
        self.assertEqual(manifest["baselineHead"], BASELINE_HEAD)
        self.assertEqual(manifest["branch"], "master")
        self.assertIn(".pnpmfile.cjs", manifest["discovery"]["configPaths"])
        manifest_entries = {entry["path"]: entry for entry in manifest["entries"]}
        pnpmfile_entry = manifest_entries[".pnpmfile.cjs"]
        pnpmfile_bytes = (REPO_ROOT / ".pnpmfile.cjs").read_bytes()
        self.assertEqual(pnpmfile_entry["sha256"], _sha256(pnpmfile_bytes))
        self.assertEqual(pnpmfile_entry["size"], len(pnpmfile_bytes))
        self.assertEqual(scan["preHead"], BASELINE_HEAD)
        self.assertEqual(scan["postHead"], BASELINE_HEAD)
        self.assertEqual(scan["exitCode"], 0)
        for state in (pre_state, post_state):
            self.assertEqual(state["denominatorSha256"], manifest["denominatorSha256"])
            self.assertIn(".pnpmfile.cjs", state["scannerPaths"])
        for key in ("denominatorSha256", "scannerPaths", "status", "statusSha256", "stagedDiff", "stagedDiffSha256"):
            self.assertEqual(pre_state[key], post_state[key], key)

        binding = _load_json(V2_GRAPH_BINDING, self)
        self.assertEqual(binding["trackId"], TRACK_ID)
        self.assertEqual(binding["status"], "CANDIDATE_UNACCEPTED")
        self.assertEqual(
            binding["sourceSnapshot"],
            {
                "path": V2_BUNDLE.relative_to(REPO_ROOT).as_posix(),
                "archive": _track_reference(V2_ARCHIVE),
                "manifest": _track_reference(V2_MANIFEST),
                "preState": _track_reference(V2_PRE_STATE),
                "postState": _track_reference(V2_POST_STATE),
                "scan": _track_reference(V2_SCAN),
            },
        )
        graph = binding["graph"]
        self.assertEqual(graph["sha256"], scan["graph"]["sha256"])
        self.assertEqual(graph["size"], scan["graph"]["size"])
        self.assertEqual(graph["schemaVersion"], "2.0.0")
        self.assertEqual(graph["toolVersion"], "0.1.0")
        self.assertEqual(graph["fileRowCount"], len(graph["fileRows"]))
        self.assertEqual(
            graph["reconciliation"],
            {
                "allGraphFileRowsBoundToSnapshot": True,
                "graphRowsAbsentFromSnapshot": [],
                "graphRowsWithHashOrSizeMismatch": [],
            },
        )
        for row in graph["fileRows"]:
            with self.subTest(graph_path=row["path"]):
                self.assertIn(row["path"], manifest_entries)
                self.assertEqual(row["sourceSha256"], manifest_entries[row["path"]]["sha256"])
                self.assertEqual(row["size"], manifest_entries[row["path"]]["size"])
        self.assertEqual(len(binding["probes"]), 8)
        self.assertEqual(len(binding["commands"]), 28)
        for probe in binding["probes"]:
            with self.subTest(surface=probe["surface"]):
                self.assertEqual(set(probe) & {"search", "inspect", "callers"}, {"search", "inspect", "callers"})
                self.assertEqual(probe["search"]["exitCode"], 0)
                self.assertEqual(probe["inspect"]["exitCode"], 0)
                self.assertIn(probe["callers"]["exitCode"], {0, 1})
        self.assertNotIn("acceptanceDecision", binding)
        self.assertNotIn("acceptedAt", binding)
        self.assertNotEqual(binding["status"], "ACCEPTED")

    def test_v2_audit_truthfully_selects_compensation_from_the_bound_candidate(self) -> None:
        """Requires the v2 clean-audit record to preserve the non-clean raw outcome."""
        _load_json(V2_MANIFEST, self)
        self.assertTrue(V2_ARCHIVE.is_file(), "missing required v2 source archive")
        _load_json(V2_SCAN, self)
        _load_json(V2_GRAPH_BINDING, self)
        attempt = _load_json(V2_AUDIT_ATTEMPT, self)
        expected_source_bundle = {
            "archive": _track_reference(V2_ARCHIVE),
            "manifest": _track_reference(V2_MANIFEST),
            "graphBinding": _track_reference(V2_GRAPH_BINDING),
        }
        self.assertEqual(attempt["track"], TRACK_ID)
        self.assertEqual(attempt["baselineRevision"], BASELINE_HEAD)
        self.assertEqual(attempt["sourceBundle"], expected_source_bundle)
        audit = attempt["audit"]
        self.assertEqual(audit["exitCode"], 1)
        self.assertGreater(len(audit["unaudited"]), 0)
        self.assertEqual(
            attempt["decision"],
            {
                "branch": "COMPENSATION_REQUIRED",
                "cleanEligible": False,
                "reason": "audit exit 1 and non-empty unaudited symbol denominator",
            },
        )
        self.assertEqual(attempt["compensationDenominator"]["label"], "COMPENSATION_REQUIRED")
        self.assertEqual(attempt["compensationDenominator"]["symbols"], audit["unaudited"])

    def test_v2_compensation_links_the_same_candidate_and_two_equal_scans(self) -> None:
        """Requires compensation to preserve source, audit, and two-scan provenance links."""
        manifest = _load_json(V2_MANIFEST, self)
        self.assertTrue(V2_ARCHIVE.is_file(), "missing required v2 source archive")
        _load_json(V2_SCAN, self)
        _load_json(V2_GRAPH_BINDING, self)
        attempt = _load_json(V2_AUDIT_ATTEMPT, self)
        evidence = _load_json(V2_COMPENSATION, self)
        self.assertTrue(V2_SCAN_TRANSACTION.is_dir(), "missing required v2 durable scan transaction")

        expected_source_bundle = {
            "archive": _track_reference(V2_ARCHIVE),
            "manifest": _track_reference(V2_MANIFEST),
            "graphBinding": _track_reference(V2_GRAPH_BINDING),
        }
        self.assertTrue(evidence["frozen"])
        self.assertEqual(evidence["sourceBundle"], expected_source_bundle)
        self.assertEqual(
            evidence["manifest"],
            {
                "path": "snapshot.manifest.json",
                "denominatorSha256": manifest["denominatorSha256"],
                "entryCount": len(manifest["entries"]),
            },
        )
        self.assertEqual(
            evidence["auditPreserved"],
            {
                "exitCode": attempt["audit"]["exitCode"],
                "decision": "COMPENSATION_REQUIRED",
                "cleanEligible": False,
                "reason": "audit exit 1 and non-empty unaudited symbol denominator",
            },
        )

        transaction = evidence["scanTransaction"]
        self.assertEqual(transaction["sourceEntryCount"], len(manifest["entries"]))
        self.assertEqual(transaction["sourceDenominatorSha256"], manifest["denominatorSha256"])
        self.assertEqual(
            transaction["scan1"]["inventorySha256"],
            transaction["scan2"]["inventorySha256"],
        )
        first_inventory = transaction["scan1"]["normalizedInventory"]
        second_inventory = transaction["scan2"]["normalizedInventory"]
        self.assertNotEqual(first_inventory["path"], second_inventory["path"])
        self.assertEqual(first_inventory["sha256"], second_inventory["sha256"])
        self.assertEqual(first_inventory["size"], second_inventory["size"])
        first_inventory_data = _load_track_reference(first_inventory, self)
        second_inventory_data = _load_track_reference(second_inventory, self)
        self.assertEqual(first_inventory_data, second_inventory_data)
        inventory = first_inventory_data["inventory"]
        self.assertEqual(
            transaction["normalizedInventory"],
            {
                "fileCount": len(inventory["files"]),
                "routeCount": len(inventory["routes"]),
                "fieldCount": len(inventory["fields"]),
                "inventorySha256": transaction["scan1"]["inventorySha256"],
            },
        )
        for scan_key in ("scan1", "scan2"):
            with self.subTest(scan=scan_key):
                bracket = transaction[scan_key]["inputBracket"]
                self.assertEqual(bracket["pre"]["entryCount"], len(manifest["entries"]))
                self.assertEqual(bracket["post"]["entryCount"], len(manifest["entries"]))
                self.assertEqual(bracket["pre"]["denominatorSha256"], manifest["denominatorSha256"])
                self.assertEqual(bracket["post"]["denominatorSha256"], manifest["denominatorSha256"])

        denominator = evidence["unauditedDenominator"]
        self.assertEqual(denominator["label"], "COMPENSATION_REQUIRED")
        self.assertEqual(denominator["totalCount"], len(attempt["audit"]["unaudited"]))
        self.assertEqual(
            denominator["totalCount"],
            denominator["fieldCount"] + denominator["routeCount"],
        )


if __name__ == "__main__":
    unittest.main()
