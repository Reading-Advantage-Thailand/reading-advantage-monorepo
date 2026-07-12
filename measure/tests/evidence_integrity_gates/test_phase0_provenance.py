"""Repository-bound Phase 0 provenance and owner-authorization tests."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path

from measure.evidence_integrity_gates.opencode_provenance import validate_role_set


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK = REPO_ROOT / "measure/archive/measure_apk_evidence_integrity_gates_20260712"


class Phase0ProvenanceTests(unittest.TestCase):
    """Replays stored role and authorization checks without provider access."""

    def test_distinct_role_evidence_replays_offline(self) -> None:
        payload = json.loads((TRACK / "phase0-opencode-provenance.json").read_text())
        self.assertEqual(payload["schema_version"], "opencode-provenance.v1")
        roles = payload["roles"]
        self.assertEqual(
            {record["role"] for record in roles},
            {"strategy", "red-counterexamples", "green-contracts", "independent-review"},
        )
        validate_role_set(roles)
        for record in roles:
            self.assertRegex(record["raw_export_sha256"], r"^[0-9a-f]{64}$")
            self.assertGreater(record["raw_export_bytes"], 0)
            self.assertRegex(record["prompt_sha256"], r"^[0-9a-f]{64}$")
            self.assertRegex(record["final_response_sha256"], r"^[0-9a-f]{64}$")
            for output, expected in record["output_sha256"].items():
                committed = subprocess.run(
                    ("git", "show", f"{record['output_commit']}:{output}"),
                    cwd=REPO_ROOT,
                    stdout=subprocess.PIPE,
                    check=True,
                ).stdout
                self.assertEqual(hashlib.sha256(committed).hexdigest(), expected)

    def test_opencode_schema_absence_is_reported_not_fabricated(self) -> None:
        payload = json.loads((TRACK / "phase0-opencode-provenance.json").read_text())
        reviewer = next(record for record in payload["roles"] if record["role"] == "independent-review")
        self.assertIsNone(reviewer["fork_turns"])
        self.assertEqual(reviewer["fork_turns_check"], "schema-field-absent")
        self.assertEqual(reviewer["session_parent_id"], "ses_0aa8a4740ffe2BOVmChNfZLEv0")

    def test_owner_authorization_binds_exact_text_without_event_id(self) -> None:
        authorization = json.loads((TRACK / "phase0-owner-authorization.json").read_text())
        self.assertIsNone(authorization["event_id"])
        actual = hashlib.sha256(authorization["exact_text"].encode()).hexdigest()
        self.assertEqual(actual, authorization["exact_text_sha256"])


if __name__ == "__main__":
    unittest.main()
