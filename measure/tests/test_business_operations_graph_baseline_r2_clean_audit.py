"""Verifies the R2 documented repo-graph clean-audit attempt evidence."""
from __future__ import annotations

import hashlib
import json
import unittest
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
BASELINE_REVISION = "eed6097bd"


def _sha256(data: bytes) -> str:
    """Returns the lowercase SHA-256 digest of data."""
    return hashlib.sha256(data).hexdigest()


def _load_json(path: Path) -> Any:
    """Loads one UTF-8 JSON artifact."""
    return json.loads(path.read_text(encoding="utf-8"))


def _file_reference(path: Path) -> dict[str, Any]:
    """Returns the immutable reference to one regular artifact file."""
    data = path.read_bytes()
    return {
        "path": path.name,
        "sha256": _sha256(data),
        "size": len(data),
    }


class R2CleanAuditAttemptTests(unittest.TestCase):
    """Requires a truthful, replayable clean-audit decision record."""

    maxDiff = None

    def _assert_artifact_reference(
        self, reference: dict[str, Any], *, required_suffix: str = ""
    ) -> Path:
        """Checks one evidence-local immutable file reference."""
        self.assertEqual(set(reference), {"path", "sha256", "size"})
        relative = Path(reference["path"])
        self.assertFalse(relative.is_absolute())
        self.assertNotIn("..", relative.parts)
        self.assertEqual(relative.as_posix(), reference["path"])
        self.assertTrue(reference["path"].endswith(required_suffix))
        path = EVIDENCE_DIR / relative
        self.assertTrue(path.is_file())
        self.assertFalse(path.is_symlink())
        self.assertEqual(_file_reference(path), reference)
        return path

    def test_r1_tasks_two_and_three_cite_the_independent_pass(self) -> None:
        """Pins R1 completion to its independent PASS review before R2 evidence."""
        plan = PLAN_PATH.read_text(encoding="utf-8")
        review_name = R1_REVIEW_PATH.name
        self.assertIn(
            "- [x] Task: Capture the candidate source snapshot", plan
        )
        self.assertIn(
            "- [x] Task: Run the canonical `repo-graph scan . ./graph.db`", plan
        )
        self.assertEqual(plan.count(f"`{review_name}` reports PASS"), 2)
        review = _load_json(R1_REVIEW_PATH)
        self.assertEqual(review["status"], "pass")
        self.assertEqual(review["track"], TRACK_ID)

    def test_clean_audit_attempt_preserves_raw_results_and_decision_rule(self) -> None:
        """Validates the exact documented configuration, scan, and audit attempt."""
        plan = PLAN_PATH.read_text(encoding="utf-8")
        self.assertIn(
            "- [x] Task: Execute and record the documented clean-audit/"
            "configuration attempt",
            plan,
        )
        self.assertIn("`COMPENSATION_REQUIRED`", plan)
        attempt = _load_json(ATTEMPT_PATH)
        self.assertEqual(attempt["schemaVersion"], 1)
        self.assertEqual(attempt["track"], TRACK_ID)
        self.assertEqual(attempt["baselineRevision"], BASELINE_REVISION)
        self.assertEqual(attempt["tool"], {"name": "repo-graph", "version": "0.1.0"})
        self.assertEqual(attempt["sourceBundle"], {
            "archive": _file_reference(R1_ARCHIVE_PATH),
            "manifest": _file_reference(R1_MANIFEST_PATH),
            "independentReview": _file_reference(R1_REVIEW_PATH),
        })
        self.assertEqual(attempt["sourceBundle"]["independentReview"]["path"], R1_REVIEW_PATH.name)
        manifest = _load_json(R1_MANIFEST_PATH)
        self.assertEqual(attempt["materialization"], {
            "archiveEntryCount": len(manifest["entries"]),
            "archiveMetadataSha256": manifest["denominatorSha256"],
            "resolverShim": (
                "node_modules/@reading-advantage/config -> packages/config "
                "(outside the archived scanner-input denominator)"
            ),
        })

        configuration = attempt["configuration"]
        self.assertEqual(configuration["command"], ["repo-graph", "config"])
        self.assertEqual(configuration["exitCode"], 0)
        self.assertEqual(configuration["scanConfig"], {"customEdges": []})
        self._assert_artifact_reference(configuration["stdout"])
        self._assert_artifact_reference(configuration["stderr"])

        scan = attempt["scan"]
        self.assertEqual(scan["command"], [
            "repo-graph",
            "scan",
            ".",
            "./audit-attempt.db",
            "--config",
            "../documented-clean-audit-config.json",
        ])
        self.assertEqual(scan["options"], {
            "config": "documented-empty-custom-edges",
            "include": [],
        })
        self.assertEqual(scan["exitCode"], 0)
        self._assert_artifact_reference(scan["stdout"])
        self._assert_artifact_reference(scan["stderr"])

        audit = attempt["audit"]
        self.assertEqual(audit["command"], [
            "repo-graph",
            "audit",
            "./audit-attempt.db",
            "--json",
        ])
        self._assert_artifact_reference(audit["stdout"], required_suffix=".json")
        self._assert_artifact_reference(audit["stderr"])
        raw_audit = _load_json(self._assert_artifact_reference(
            audit["stdout"], required_suffix=".json"
        ))
        self.assertEqual(audit["result"], raw_audit)
        self.assertEqual(audit["exitCode"], 1)

        integrity_keys = (
            "missingFiles",
            "staleSymbols",
            "orphanEdges",
            "duplicateNodes",
        )
        self.assertEqual(set(audit["integritySets"]), set(integrity_keys))
        for key in integrity_keys:
            self.assertEqual(audit["integritySets"][key], raw_audit[key])
        self.assertEqual(audit["unaudited"], raw_audit["unauditedSymbols"])

        clean_eligible = (
            audit["exitCode"] == 0
            and not audit["unaudited"]
            and not any(audit["integritySets"].values())
        )
        self.assertFalse(clean_eligible)
        self.assertEqual(attempt["decision"], {
            "branch": "COMPENSATION_REQUIRED",
            "cleanEligible": clean_eligible,
            "reason": "audit exit 1 and non-empty unaudited symbol denominator",
        })
        self.assertGreater(len(audit["unaudited"]), 0)
        compensation = attempt["compensationDenominator"]
        self.assertEqual(compensation["label"], "COMPENSATION_REQUIRED")
        self.assertEqual(compensation["auditExitCode"], audit["exitCode"])
        self.assertEqual(compensation["symbols"], audit["unaudited"])
        self.assertEqual(
            compensation["symbolsSha256"],
            _sha256(json.dumps(
                compensation["symbols"], sort_keys=True, separators=(",", ":")
            ).encode("utf-8")),
        )

    def test_evidence_directory_contains_only_declared_raw_artifacts(self) -> None:
        """Prevents undeclared output or a generated graph database from being retained."""
        attempt = _load_json(ATTEMPT_PATH)
        references = [
            attempt["configuration"]["stdout"],
            attempt["configuration"]["stderr"],
            attempt["scan"]["stdout"],
            attempt["scan"]["stderr"],
            attempt["audit"]["stdout"],
            attempt["audit"]["stderr"],
        ]
        expected = {ATTEMPT_PATH.name, *(reference["path"] for reference in references)}
        actual = {
            path.name for path in EVIDENCE_DIR.iterdir() if path.is_file()
        }
        self.assertEqual(actual, expected)
        self.assertFalse(any(path.suffix == ".db" for path in EVIDENCE_DIR.iterdir()))


if __name__ == "__main__":
    unittest.main()
