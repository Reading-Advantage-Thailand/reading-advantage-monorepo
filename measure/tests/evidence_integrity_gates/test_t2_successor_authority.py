"""Focused contracts for the T2 successor evidence-production authority."""

from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from measure.tracks.apk_source_denominator_inventory_20260712.run_phase0_3_admission import (
    ADMISSION_MODULES,
    EXPECTED_TEST_COUNTS,
    T2AdmissionError,
    _run_admission_at,
    _validate_inventory_row,
)
from measure.tracks.apk_source_denominator_inventory_20260712.verify_phase4_role_evidence import (
    MAPPER_OUTPUT_PATHS,
    T2EvidenceVerificationError,
    _admission_command_argv,
    _validate_admission_revision,
    _strict_nonblocking_findings,
    _strict_zero_counts,
    build_reviewed_input_ledger,
    validate_truth_report,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK
FREEZE_PATH = TRACK_DIR / "phase0-input-freeze.json"
OWNERSHIP_PATH = TRACK_DIR / "phase0-role-ownership-manifest.json"
BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
FINAL_ROLES = {"truth-test-author", "adversarial-reviewer"}


def _load(path: Path) -> dict[str, object]:
    """Loads one JSON object from the successor authority.

    Args:
        path: JSON artifact to load.

    Returns:
        Parsed JSON object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path} must contain an object")
    return value


class SuccessorAuthorityTests(unittest.TestCase):
    """Rejects unverifiable final-role commands or ambiguous rerun consequences."""

    def setUp(self) -> None:
        """Loads the frozen input and ownership manifests.

        Returns:
            Nothing.
        """
        self.freeze = _load(FREEZE_PATH)
        self.ownership = _load(OWNERSHIP_PATH)

    def test_final_roles_have_one_pinned_verifier_and_exact_commit_ownership(self) -> None:
        """Requires one sanitized verifier and adjacent single-output commit per role."""
        tasks = {task["owner_role"]: task for task in self.ownership["tasks"]}
        for role in FINAL_ROLES:
            task = tasks[role]
            contract = task["execution_contract"]
            self.assertEqual(contract["allowed_provider_tools"], ["bash", "read", "write"])
            self.assertFalse(contract["direct_write_only"])
            self.assertEqual(contract["direct_write_outputs"], [])
            self.assertEqual(contract["ordered_operations"], ["generator:0"])
            self.assertEqual(contract["read_only_shell_commands"], [])
            self.assertEqual(len(contract["shell_generators"]), 1)
            verifier = contract["shell_generators"][0]
            command = verifier["command_template"]
            self.assertTrue(command.startswith(
                "/usr/bin/env -i PATH=/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin "
                "LANG=C PYTHONDONTWRITEBYTECODE=1 /usr/bin/python3 -I -S -c "
            ))
            self.assertIn("verify_phase4_role_evidence.py", command)
            self.assertIn(f"--role {role}", command)
            self.assertIn("--phase0-authority-revision {phase0_commit}", command)
            self.assertIn("--admission-revision {admission_commit}", command)
            self.assertNotIn(";", command)
            self.assertNotIn("&&", command)
            self.assertNotIn("||", command)
            if role == "adversarial-reviewer":
                self.assertIn("--phase2-receipt-revision {phase2_receipt_commit}", command)
            self.assertEqual(
                verifier["owned_outputs"],
                [f"measure/tracks/{TRACK}/{task['expected_outputs'][0]}"],
            )
            commit = verifier["commit"]
            self.assertEqual(commit["mode"], "normal-only")
            self.assertTrue(commit["immediate_adjacency"])
            self.assertEqual(commit["attestation_commit_source"], "output_commit")
            for dependency in verifier["dependency_blobs"]:
                revision = dependency["revision"]
                path = dependency["path"]
                blob = __import__("subprocess").check_output(
                    ["/usr/bin/git", "show", f"{revision}:{path}"], cwd=REPO_ROOT
                )
                self.assertEqual(hashlib.sha256(blob).hexdigest(), dependency["sha256"])

    def test_successor_declares_that_every_role_receipt_must_be_rerun(self) -> None:
        """Documents the fail-closed consequence of changing the authority hash."""
        successor = self.freeze["authority_successor"]
        self.assertTrue(successor["requires_all_role_reruns"])
        self.assertEqual(set(successor["invalidated_roles"]), set(self.ownership["required_roles"]))
        self.assertEqual(
            successor["reason"],
            "Every admitted receipt must name one authority commit, bind its exact input-freeze hash, and descend from that authority commit.",
        )
        self.assertFalse(successor["product_owner_acceptance_claimed"])

    def test_review_accounting_requires_the_exact_frozen_ledger_path_set(self) -> None:
        """Requires the reviewer verifier to derive every ledger hash from Git bytes."""
        accounting = self.freeze["resource_accounting"]["roles"]["adversarial-reviewer"]
        ledger = build_reviewed_input_ledger(
            REPO_ROOT,
            "HEAD",
            tuple(accounting["required_artifact_paths"]),
        )
        self.assertEqual(
            [entry["path"] for entry in ledger], accounting["required_artifact_paths"]
        )
        self.assertTrue(all(entry["revision"] for entry in ledger))
        self.assertTrue(all(len(entry["sha256"]) == 64 for entry in ledger))

    def test_truth_report_rejects_a_passing_summary_that_disagrees_with_inventory(self) -> None:
        """Proves the admission report cannot claim more passing tests than were run."""
        report = {
            "schema_version": "apk-denominator-contract-test-report.v1",
            "status": "red-contract-authored",
            "track_id": TRACK,
            "source_baseline_revision": BASELINE,
            "role": "truth-test-author",
            "admission_revision": "a" * 40,
            "phase0_3_admission_command": "frozen-command",
            "phase0_3_admission_result": {
                "total_tests": 2,
                "passed": 2,
                "failed": 0,
                "exit_code": 0,
                "status": "passed",
            },
            "test_inventory": [
                {"phase": 0, "module": "m0", "tests": 1, "passed": 1, "failed": 0, "exit_code": 0}
            ],
            "stop_loss_counters": {
                "unsupported_factual_claims": 0,
                "denominator_mismatches": 0,
                "failed_fix_review_cycles": 0,
                "unresolved_blocking_findings": {"critical": 0, "high": 0, "medium": 0},
            },
            "unsupported_claims_count": 0,
        }
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "report.json"
            path.write_text(json.dumps(report), encoding="utf-8")
            with self.assertRaisesRegex(
                T2EvidenceVerificationError, "admission summary differs"
            ):
                validate_truth_report(
                    path, report["test_inventory"], "frozen-command", "a" * 40
                )

    def test_admission_rejects_zero_test_modules_and_stale_12_18_counts(self) -> None:
        """Falsifies zero-suite and superseded 12/18 Phase1/2 false Greens."""
        self.assertEqual(EXPECTED_TEST_COUNTS, (13, 17, 31, 24))
        for phase, actual in ((0, 0), (1, 12), (2, 18)):
            expected = EXPECTED_TEST_COUNTS[phase]
            row = {
                "phase": phase,
                "module": ADMISSION_MODULES[phase],
                "tests": actual,
                "passed": actual,
                "failed": 0,
                "exit_code": 0,
            }
            with self.assertRaisesRegex(T2AdmissionError, "inventory differs"):
                _validate_inventory_row(phase, ADMISSION_MODULES[phase], expected, row)

    def test_detached_admission_ignores_mutated_transitive_worktree_dependency(self) -> None:
        """Proves admission imports committed transitive bytes, not mutable source bytes."""
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "source"
            tests = repo / "measure" / "tests"
            tests.mkdir(parents=True)
            (repo / "measure" / "__init__.py").write_text("", encoding="utf-8")
            (tests / "__init__.py").write_text("", encoding="utf-8")
            probe = repo / "measure" / "transitive_probe.py"
            probe.write_text('VALUE = "committed"\n', encoding="utf-8")
            for module, count in zip(ADMISSION_MODULES, EXPECTED_TEST_COUNTS, strict=True):
                methods = "\n".join(
                    f"    def test_{index:02d}(self): self.assertEqual(VALUE, 'committed')"
                    for index in range(count)
                )
                source = (
                    "import unittest\n"
                    "from measure.transitive_probe import VALUE\n"
                    "class PinnedTests(unittest.TestCase):\n"
                    f"{methods}\n"
                )
                (repo / f"{module.replace('.', '/')}.py").write_text(
                    source, encoding="utf-8"
                )
            subprocess.run(["/usr/bin/git", "init", "--quiet", str(repo)], check=True)
            subprocess.run(
                ["/usr/bin/git", "-C", str(repo), "add", "measure"], check=True
            )
            subprocess.run(
                [
                    "/usr/bin/git",
                    "-C",
                    str(repo),
                    "-c",
                    "user.name=T2 Test",
                    "-c",
                    "user.email=t2@example.invalid",
                    "commit",
                    "--quiet",
                    "--no-gpg-sign",
                    "-m",
                    "test fixture",
                ],
                check=True,
            )
            revision = subprocess.check_output(
                ["/usr/bin/git", "-C", str(repo), "rev-parse", "HEAD"], text=True
            ).strip()

            probe.write_text(
                'raise RuntimeError("mutable worktree dependency was imported")\n',
                encoding="utf-8",
            )
            inventory = _run_admission_at(repo, revision)
            self.assertEqual(
                [row["tests"] for row in inventory], list(EXPECTED_TEST_COUNTS)
            )

    def test_sanitized_launcher_preserves_authority_argument_for_runner(self) -> None:
        """Proves the Git loader does not consume the runner's authority revision."""
        revision = "f" * 40
        command = _admission_command_argv(revision)
        launcher = command[command.index("-c") + 1]
        self.assertIn('argv[1]+":', launcher)
        self.assertNotIn("argv.pop", launcher)
        self.assertEqual(command[-(len(ADMISSION_MODULES) + 1)], revision)

    def test_admission_uses_fresh_descendant_mapper_commit(self) -> None:
        """Proves stale authority artifacts cannot replace the explicit mapper HEAD."""
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "repo"
            repo.mkdir()
            subprocess.run(["/usr/bin/git", "init", "--quiet", str(repo)], check=True)
            for path in MAPPER_OUTPUT_PATHS:
                target = repo / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text("stale\n", encoding="utf-8")
            subprocess.run(["/usr/bin/git", "-C", str(repo), "add", "."], check=True)
            commit = [
                "/usr/bin/git", "-C", str(repo), "-c", "user.name=T2 Test", "-c",
                "user.email=t2@example.invalid", "commit", "--quiet", "--no-gpg-sign", "-m",
            ]
            subprocess.run([*commit, "authority"], check=True)
            authority = subprocess.check_output(
                ["/usr/bin/git", "-C", str(repo), "rev-parse", "HEAD"], text=True
            ).strip()
            stale_phase3 = subprocess.check_output(
                ["/usr/bin/git", "-C", str(repo), "show", f"{authority}:{MAPPER_OUTPUT_PATHS[-1]}"]
            )
            for path in MAPPER_OUTPUT_PATHS:
                (repo / path).write_text("fresh\n", encoding="utf-8")
            subprocess.run(["/usr/bin/git", "-C", str(repo), "add", "."], check=True)
            subprocess.run([*commit, "mapper"], check=True)
            mapper = subprocess.check_output(
                ["/usr/bin/git", "-C", str(repo), "rev-parse", "HEAD"], text=True
            ).strip()
            self.assertEqual(
                _validate_admission_revision(
                    repo, authority, mapper, "truth-test-author"
                ),
                mapper,
            )
            self.assertNotEqual(
                stale_phase3,
                subprocess.check_output(
                    ["/usr/bin/git", "-C", str(repo), "show", f"{mapper}:{MAPPER_OUTPUT_PATHS[-1]}"]
                ),
            )
            with self.assertRaisesRegex(
                T2EvidenceVerificationError, "chronology is invalid"
            ):
                _validate_admission_revision(
                    repo, authority, authority, "truth-test-author"
                )

            truth_paths = (
                f"measure/tracks/{TRACK}/denominator-contract-test-report.json",
                f"measure/tracks/{TRACK}/role-receipts/truth-test-author.json",
            )
            for index, path in enumerate(truth_paths):
                target = repo / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(f"truth-{index}\n", encoding="utf-8")
                subprocess.run(
                    ["/usr/bin/git", "-C", str(repo), "add", path], check=True
                )
                subprocess.run([*commit, f"truth-{index}"], check=True)
            self.assertEqual(
                _validate_admission_revision(
                    repo, authority, mapper, "adversarial-reviewer"
                ),
                mapper,
            )

    def test_reviewer_rejects_boolean_counters_and_whitespace_severity(self) -> None:
        """Falsifies Python equality coercion and untrimmed blocking severity bypasses."""
        self.assertTrue(
            _strict_zero_counts(
                {"critical": 0, "high": 0, "medium": 0},
                ("critical", "high", "medium"),
            )
        )
        self.assertFalse(
            _strict_zero_counts(
                {"critical": False, "high": 0, "medium": 0},
                ("critical", "high", "medium"),
            )
        )
        self.assertTrue(_strict_nonblocking_findings([{"severity": "low"}]))
        self.assertFalse(_strict_nonblocking_findings([{"severity": "HIGH "}]))


if __name__ == "__main__":
    unittest.main()
