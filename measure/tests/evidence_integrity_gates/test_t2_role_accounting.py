"""Focused tests for versioned T2 logical-input accounting."""

from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from measure.evidence_integrity_gates.t2_role_accounting import (
    T2RoleAccountingError,
    derive_t2_actual_usage,
)


TRACK = "measure/tracks/apk_source_denominator_inventory_20260712"
FREEZE_PATH = Path(TRACK) / "phase0-input-freeze.json"


def _digest(value: bytes) -> str:
    """Returns the SHA-256 digest used by artifact references."""
    return hashlib.sha256(value).hexdigest()


class T2RoleAccountingTests(unittest.TestCase):
    """Validates exact committed inputs for every frozen accounting formula."""

    def _git(self, root: Path, *args: str) -> str:
        """Runs a Git fixture command and returns stripped stdout."""
        result = subprocess.run(
            ("git", *args),
            cwd=root,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return result.stdout.strip()

    def _write_json(self, root: Path, name: str, value: object) -> None:
        """Writes one track-local JSON fixture."""
        path = root / TRACK / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, sort_keys=True) + "\n", encoding="utf-8")

    def _commit(self, root: Path, subject: str) -> str:
        """Commits the complete fixture tree and returns its full SHA."""
        self._git(root, "add", ".")
        self._git(root, "commit", "-qm", subject)
        return self._git(root, "rev-parse", "HEAD")

    def _fixture(self) -> tuple[Path, tempfile.TemporaryDirectory[str], dict, dict[str, str]]:
        """Builds real baseline, Phase-1, Phase-2, and Phase-3 commits."""
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name)
        self._git(root, "init", "-q")
        self._git(root, "config", "user.email", "test@example.com")
        self._git(root, "config", "user.name", "Test")
        (root / "src").mkdir()
        (root / "src/a.ts").write_text("export const a = 1;\n", encoding="utf-8")
        (root / "assets").mkdir()
        (root / "assets/a.bin").write_bytes(b"asset-bytes")
        baseline = self._commit(root, "baseline")

        source = {
            "schema_version": "apk-source-denominator.v1",
            "source_baseline_revision": baseline,
            "records": [
                {
                    "record_type": "file",
                    "file_path": "src/a.ts",
                    "evidence": {
                        "revision": baseline,
                        "path": "src/a.ts",
                        "blob_sha256": _digest(b"export const a = 1;\n"),
                    },
                }
            ],
        }
        assets = {
            "schema_version": "apk-asset-file-denominator.v1",
            "candidate_files": [
                {
                    "revision": baseline,
                    "canonical_path": "assets/a.bin",
                    "sha256": _digest(b"asset-bytes"),
                    "format_metadata": {"byte_size": len(b"asset-bytes")},
                }
            ],
        }
        historical = {
            "schema_version": "apk-historical-source-denominator.v1",
            "records": [
                {
                    "evidence": {
                        "revision": baseline,
                        "path": "src/a.ts",
                        "blob_sha256": _digest(b"export const a = 1;\n"),
                    }
                }
            ],
        }
        phase1_values = {
            "source-denominator.json": source,
            "game-identity-ledger.json": {"schema_version": "fixture", "identity_records": []},
            "scene-state-denominator.json": {"schema_version": "fixture", "surface_records": []},
            "asset-file-denominator.json": assets,
            "historical-source-denominator.json": historical,
            "denominator-discrepancies.json": {"schema_version": "fixture", "records": [{"id": "d1"}]},
        }
        for name, value in phase1_values.items():
            self._write_json(root, name, value)
        phase1 = self._commit(root, "phase1")
        phase1_hashes = {
            f"{TRACK}/{name}": _digest((root / TRACK / name).read_bytes())
            for name in phase1_values
        }

        phase2_names = (
            "independent-human-discovery.json",
            "human-duplicate-drift-records.json",
            "human-historical-deleted-records.json",
            "human-discrepancy-records.json",
        )
        for name in phase2_names:
            self._write_json(root, name, {"schema_version": "fixture", "records": []})
        phase2 = self._commit(root, "phase2")
        phase2_hashes = {
            f"{TRACK}/{name}": _digest((root / TRACK / name).read_bytes())
            for name in phase2_names
        }

        phase3 = {
            "schema_version": "apk-source-denominator-phase3-reconciliation.v1",
            "input_provenance": {
                "phase1": {"revision": phase1, "output_hashes": phase1_hashes},
                "phase2": {
                    "implementation_revision": phase2,
                    "consumed_output_hashes": phase2_hashes,
                },
            },
            "asset_candidate_reconciliation_records": [{"id": "a"}],
            "copy_reconciliation_records": [],
            "discrepancy_reconciliation_records": [],
            "file_reconciliation_records": [{"id": "f"}],
            "graph_edge_reconciliation_records": [],
            "identical_hash_group_reconciliation_records": [],
            "identity_reconciliation_records": [],
            "replacement_program_identity_records": [],
            "source_record_reconciliation_records": [],
            "surface_category_coverage": [],
            "surface_reconciliation_records": [],
            "unresolved_sources": [],
        }
        self._write_json(root, "phase3-reconciliation.json", phase3)
        self._write_json(
            root,
            "denominator-contract-test-report.json",
            {
                "schema_version": "apk-denominator-contract-test-report.v1",
                "phase0_3_admission_result": {
                    "total_tests": 3,
                    "passed": 3,
                    "failed": 0,
                    "exit_code": 0,
                    "status": "passed",
                },
                "test_inventory": [
                    {"phase": 0, "tests": 1, "passed": 1, "failed": 0, "exit_code": 0},
                    {"phase": 1, "tests": 2, "passed": 2, "failed": 0, "exit_code": 0},
                ],
            },
        )
        phase3_commit = self._commit(root, "phase3")
        review_refs = [
            {"revision": phase1, "path": path, "sha256": digest}
            for path, digest in sorted(phase1_hashes.items())
        ] + [
            {"revision": phase2, "path": path, "sha256": digest}
            for path, digest in sorted(phase2_hashes.items())
        ] + [
            {
                "revision": phase3_commit,
                "path": f"{TRACK}/phase3-reconciliation.json",
                "sha256": _digest((root / TRACK / "phase3-reconciliation.json").read_bytes()),
            }
        ]
        self._write_json(
            root,
            "independent-review.json",
            {"reviewed_input_ledger": {"artifact_refs": review_refs}},
        )
        review_commit = self._commit(root, "review")
        freeze = json.loads(
            (Path(__file__).parents[3] / FREEZE_PATH).read_text(encoding="utf-8")
        )
        freeze["baseline_revision"] = baseline
        return root, temporary, freeze, {
            "baseline": baseline,
            "phase1": phase1,
            "phase2": phase2,
            "phase3": phase3_commit,
            "review": review_commit,
        }

    def _raw(self, output: str = "") -> bytes:
        """Returns a minimal provider export containing non-generator result bytes."""
        return json.dumps(
            {
                "messages": [
                    {
                        "parts": [
                            {
                                "type": "tool",
                                "tool": "read",
                                "state": {"status": "completed", "output": output},
                            }
                        ]
                    }
                ]
            }
        ).encode()

    def test_freeze_versions_formulas_and_raises_only_evidence_byte_ceiling(self) -> None:
        """Freezes formulas and raises only evidence above its measured corpus."""
        freeze = json.loads(
            (Path(__file__).parents[3] / FREEZE_PATH).read_text(encoding="utf-8")
        )
        accounting = freeze["resource_accounting"]
        self.assertEqual(accounting["schema_version"], "apk-logical-input-accounting.v1")
        self.assertEqual(set(accounting["roles"]), set(freeze["frozen_resource_ceilings"]))
        self.assertEqual(
            freeze["frozen_resource_ceilings"]["evidence-collector"]["bytes_read"],
            536_870_912,
        )
        self.assertEqual(
            freeze["frozen_resource_ceilings"]["discovery-auditor"]["bytes_read"],
            268_435_456,
        )
        self.assertEqual(
            freeze["frozen_resource_ceilings"]["requirements-mapper"]["bytes_read"],
            134_217_728,
        )
        self.assertEqual(
            freeze["frozen_resource_ceilings"]["truth-test-author"]["bytes_read"],
            67_108_864,
        )
        self.assertEqual(
            freeze["frozen_resource_ceilings"]["adversarial-reviewer"]["bytes_read"],
            268_435_456,
        )
        repository_root = Path(__file__).parents[3]
        asset = json.loads(
            (repository_root / TRACK / "asset-file-denominator.json").read_text()
        )
        candidates = asset["candidate_files"]
        batch = subprocess.run(
            ("git", "cat-file", "--batch-check=%(objecttype) %(objectsize)"),
            cwd=repository_root,
            input="".join(
                f'{row["revision"]}:{row["canonical_path"]}\n' for row in candidates
            ),
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        blob_rows = [line.split() for line in batch.stdout.splitlines()]
        self.assertEqual(len(candidates), 426)
        self.assertEqual(len(blob_rows), len(candidates))
        self.assertTrue(all(fields[0] == "blob" for fields in blob_rows))
        exact_sizes = [int(fields[1]) for fields in blob_rows]
        self.assertEqual(
            exact_sizes,
            [row["format_metadata"]["byte_size"] for row in candidates],
        )
        current_bytes = sum(exact_sizes)
        self.assertGreater(current_bytes, 268_435_456)
        self.assertLessEqual(current_bytes, 536_870_912)

    def test_generator_roles_derive_nonzero_committed_logical_inputs(self) -> None:
        """Counts committed inputs for discovery, evidence, and mapper generators."""
        root, temporary, freeze, commits = self._fixture()
        self.addCleanup(temporary.cleanup)
        discovery = derive_t2_actual_usage(
            repository_root=root,
            freeze=freeze,
            role="discovery-auditor",
            output_commit=commits["phase1"],
            raw_export=self._raw(),
        )
        evidence = derive_t2_actual_usage(
            repository_root=root,
            freeze=freeze,
            role="evidence-collector",
            output_commit=commits["phase2"],
            raw_export=self._raw(),
            commit_binding={
                "phase1_attestation_commit": commits["phase1"],
                "phase2_attestation_commit": commits["phase2"],
            },
        )
        mapper = derive_t2_actual_usage(
            repository_root=root,
            freeze=freeze,
            role="requirements-mapper",
            output_commit=commits["phase3"],
            raw_export=self._raw(),
        )
        for value in (discovery, evidence, mapper):
            self.assertGreater(value["bytes_read"], 0)
        self.assertGreater(discovery["source_files"], 0)
        self.assertGreater(evidence["source_files"], 0)
        self.assertEqual(mapper["claim_records"], 3)

    def test_truth_cases_come_only_from_structured_committed_report(self) -> None:
        """Does not credit test-looking prose from provider read output."""
        root, temporary, freeze, commits = self._fixture()
        self.addCleanup(temporary.cleanup)
        usage = derive_t2_actual_usage(
            repository_root=root,
            freeze=freeze,
            role="truth-test-author",
            output_commit=commits["phase3"],
            raw_export=self._raw("Ran 2 tests\n"),
        )
        self.assertEqual(usage["test_cases"], 3)
        self.assertEqual(usage["bytes_read"], len("Ran 2 tests\n".encode()))

    def test_counts_failed_provider_result_bytes(self) -> None:
        """Counts error bytes even when a provider tool does not complete."""
        root, temporary, freeze, commits = self._fixture()
        self.addCleanup(temporary.cleanup)
        error = "failed read still returned diagnostic bytes"
        raw = json.dumps(
            {
                "messages": [
                    {
                        "parts": [
                            {
                                "type": "tool",
                                "tool": "read",
                                "state": {"status": "error", "error": error},
                            }
                        ]
                    }
                ]
            }
        ).encode()
        usage = derive_t2_actual_usage(
            repository_root=root,
            freeze=freeze,
            role="truth-test-author",
            output_commit=commits["phase3"],
            raw_export=raw,
        )
        self.assertEqual(usage["command_invocations"], 1)
        self.assertEqual(usage["bytes_read"], len(error.encode()))

    def test_rejects_hash_mismatched_evidence_and_reviewer_refs(self) -> None:
        """Fails closed on forged artifact provenance or reviewed-input ledgers."""
        root, temporary, freeze, commits = self._fixture()
        self.addCleanup(temporary.cleanup)
        phase3_path = root / TRACK / "phase3-reconciliation.json"
        phase3 = json.loads(phase3_path.read_text())
        first = next(iter(phase3["input_provenance"]["phase1"]["output_hashes"]))
        phase3["input_provenance"]["phase1"]["output_hashes"][first] = "0" * 64
        phase3_path.write_text(json.dumps(phase3) + "\n")
        forged_phase3 = self._commit(root, "forged phase3")
        with self.assertRaisesRegex(T2RoleAccountingError, "hash"):
            derive_t2_actual_usage(
                repository_root=root,
                freeze=freeze,
                role="requirements-mapper",
                output_commit=forged_phase3,
                raw_export=self._raw(),
            )

        review_path = root / TRACK / "independent-review.json"
        review = json.loads(review_path.read_text())
        review["reviewed_input_ledger"]["artifact_refs"][0]["sha256"] = "0" * 64
        review_path.write_text(json.dumps(review) + "\n")
        forged_review = self._commit(root, "forged review")
        with self.assertRaisesRegex(T2RoleAccountingError, "hash"):
            derive_t2_actual_usage(
                repository_root=root,
                freeze=freeze,
                role="adversarial-reviewer",
                output_commit=forged_review,
                raw_export=self._raw(),
            )

    def test_rejects_missing_evidence_binding_and_reviewer_ledger(self) -> None:
        """Requires exact phase commits and a complete reviewer artifact ledger."""
        root, temporary, freeze, commits = self._fixture()
        self.addCleanup(temporary.cleanup)
        with self.assertRaisesRegex(T2RoleAccountingError, "commit binding"):
            derive_t2_actual_usage(
                repository_root=root,
                freeze=freeze,
                role="evidence-collector",
                output_commit=commits["phase2"],
                raw_export=self._raw(),
            )
        review_path = root / TRACK / "independent-review.json"
        review_path.write_text('{"reviewed_input_ledger":{"artifact_refs":[]}}\n')
        missing_review = self._commit(root, "missing review ledger")
        with self.assertRaisesRegex(T2RoleAccountingError, "ledger"):
            derive_t2_actual_usage(
                repository_root=root,
                freeze=freeze,
                role="adversarial-reviewer",
                output_commit=missing_review,
                raw_export=self._raw(),
            )


if __name__ == "__main__":
    unittest.main()
