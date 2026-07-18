"""Falsification contracts for APK denominator Phase-4 independent acceptance."""

from __future__ import annotations

import copy
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

from measure.evidence_integrity_gates.apk_inventory_acceptance import (
    TrustedPhase4Authority,
    _frozen_role_tasks,
    _outputs_match_frozen_task,
    validate_phase4_inventory_acceptance_legacy_test_only,
)
from measure.evidence_integrity_gates.events import MappingEventResolver
from measure.evidence_integrity_gates.git_source import GitSourceAdapter


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK
FREEZE_PATH = TRACK_DIR / "phase0-input-freeze.json"
OWNERSHIP_PATH = TRACK_DIR / "phase0-role-ownership-manifest.json"
PHASE3_PATH = TRACK_DIR / "phase3-reconciliation.json"
PHASE3_GENERATOR_PATH = TRACK_DIR / "generate_phase3_reconciliation.py"
REPORT_PATH = TRACK_DIR / "phase4-acceptance-contract-test-report.json"
REVIEW_PATH = TRACK_DIR / "independent-review.json"
CANDIDATE_PATH = TRACK_DIR / "candidate-denominator-manifest.json"
CANDIDATE_PARTITION_PATH = TRACK_DIR / "candidate-partition-manifest.json"
OWNER_ACCEPTANCE_PATH = TRACK_DIR / "product-owner-acceptance.json"
ACCEPTED_PATH = TRACK_DIR / "accepted-denominator-manifest.json"
ACCEPTED_PARTITION_PATH = TRACK_DIR / "accepted-partition-manifest.json"
REVIEW_RECEIPT_PATH = TRACK_DIR / "role-receipts" / "adversarial-reviewer.json"
METADATA_PATH = TRACK_DIR / "metadata.json"
PLAN_PATH = TRACK_DIR / "plan.md"
REGISTRY_PATH = REPO_ROOT / "measure" / "tracks.md"
PROGRAM_PATH = "measure/apk-evidence-reconstruction-program.md"
SHA256 = re.compile(r"^[0-9a-f]{64}$")
COMMIT_SHA = re.compile(r"^[0-9a-f]{40}$")
COMMIT_EVIDENCE = re.compile(r"\b(?:commit|evidence commit|freeze commit) [`:]?([0-9a-f]{7,40})\b", re.IGNORECASE)
BLOCKING_SEVERITIES = {"critical", "high", "medium"}
FINDING_SEVERITIES = BLOCKING_SEVERITIES | {"low", "informational"}
FORBIDDEN_INTERPRETATION_FIELDS = {
    "asset_suitability",
    "capability",
    "capability_conclusion",
    "conclusion",
    "design_intent",
    "gameplay_interpretation",
    "intent",
    "interpretation",
    "mechanic",
    "mechanics",
    "product_disposition",
    "recommendation",
    "responsive_strategy",
    "semantic_role",
    "suitability",
}
SURFACE_KINDS = {"scene", "state", "phase", "overlay", "transition", "terminal", "presentation"}


def _load_json(path: Path, *, phase4: bool = False) -> dict[str, Any]:
    """Loads one JSON object and identifies a missing Phase-4 output.

    Args:
        path: Artifact path to load.
        phase4: Whether the artifact is a Phase-4 output.

    Returns:
        The parsed JSON object.

    Raises:
        AssertionError: If the artifact is absent or malformed.
    """
    if not path.is_file():
        phase = "Phase-4 independent-acceptance" if phase4 else "required"
        raise AssertionError(f"Missing {phase} artifact: {path.relative_to(REPO_ROOT)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path.relative_to(REPO_ROOT)} must contain a JSON object")
    return value


def _sha256(path: Path) -> str:
    """Returns the SHA-256 digest of an artifact's exact bytes.

    Args:
        path: File whose bytes are hashed.

    Returns:
        Lowercase SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _git_bytes(revision: str, path: str) -> bytes:
    """Reads exact committed bytes for a revision and repository-relative path.

    Args:
        revision: Commit that must contain the path.
        path: Repository-relative file path.

    Returns:
        The resolved committed bytes.

    Raises:
        AssertionError: If Git cannot resolve the locator.
    """
    result = subprocess.run(
        ["git", "show", f"{revision}:{path}"],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="replace").strip()
        raise AssertionError(f"Unresolvable committed source locator {revision}:{path}: {detail}")
    return result.stdout


def _is_ancestor(revision: str, baseline: str) -> bool:
    """Reports whether a cited revision is reachable from the frozen baseline.

    Args:
        revision: Revision claimed by a historical locator.
        baseline: Frozen source baseline that bounds history.

    Returns:
        Whether revision is an ancestor of baseline.
    """
    return subprocess.run(
        ["git", "merge-base", "--is-ancestor", revision, baseline],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    ).returncode == 0


def _key(value: object) -> str:
    """Creates a stable key for an exact JSON denominator record.

    Args:
        value: JSON-compatible value to identify.

    Returns:
        Canonical compact JSON representation.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


class Phase4IndependentAcceptanceContracts(unittest.TestCase):
    """Rejects inferred acceptance, stale evidence, and incomplete closeout."""

    def setUp(self) -> None:
        """Loads the independent review before any other Phase-4 output.

        Returns:
            Nothing.
        """
        self.freeze = _load_json(FREEZE_PATH)
        self.ownership = _load_json(OWNERSHIP_PATH)
        self.review = _load_json(REVIEW_PATH, phase4=True)
        scope = self.freeze.get("source_scope")
        self.assertIsInstance(scope, dict)
        assert isinstance(scope, dict)
        self.baseline = scope.get("current_revision")
        self.assertIsInstance(self.baseline, str)
        assert isinstance(self.baseline, str)
        self.phase3 = _load_json(PHASE3_PATH)

    def _artifact_hash(self, path: Path, record: object, *, path_key: str = "path", hash_key: str = "sha256") -> None:
        """Binds an artifact record to its exact repository bytes.

        Args:
            path: Expected artifact path.
            record: Candidate path/hash record.
            path_key: Record field naming the repository-relative path.
            hash_key: Record field naming the SHA-256 digest.

        Returns:
            Nothing.
        """
        self.assertIsInstance(record, dict)
        assert isinstance(record, dict)
        self.assertEqual(record.get(path_key), str(path.relative_to(REPO_ROOT)))
        digest = record.get(hash_key)
        self.assertIsInstance(digest, str)
        self.assertRegex(str(digest), SHA256)
        self.assertEqual(digest, _sha256(path))

    def _assert_locator(self, locator: object) -> None:
        """Validates a current or reachable-historical exact source locator.

        Args:
            locator: Locator whose revision, blob, and inclusive range must resolve.

        Returns:
            Nothing.
        """
        self.assertIsInstance(locator, dict)
        assert isinstance(locator, dict)
        revision = locator.get("revision")
        path = locator.get("path")
        self.assertIsInstance(revision, str)
        self.assertIsInstance(path, str)
        assert isinstance(revision, str) and isinstance(path, str)
        self.assertFalse(path.startswith("/"))
        self.assertFalse(path.endswith("/"))
        self.assertTrue(revision == self.baseline or _is_ancestor(revision, self.baseline))
        blob = _git_bytes(revision, path)
        self.assertEqual(locator.get("blob_sha256"), hashlib.sha256(blob).hexdigest())
        cited_range = locator.get("range")
        self.assertIsInstance(cited_range, dict)
        assert isinstance(cited_range, dict)
        start = cited_range.get("start_line")
        end = cited_range.get("end_line")
        self.assertIsInstance(start, int)
        self.assertIsInstance(end, int)
        assert isinstance(start, int) and isinstance(end, int)
        lines = blob.splitlines(keepends=True)
        if not lines:
            self.assertEqual((start, end), (0, 0))
            self.assertEqual(cited_range.get("sha256"), hashlib.sha256(blob).hexdigest())
            return
        self.assertGreaterEqual(start, 1)
        self.assertGreaterEqual(end, start)
        self.assertLessEqual(end, len(lines))
        self.assertEqual(
            cited_range.get("sha256"),
            hashlib.sha256(b"".join(lines[start - 1 : end])).hexdigest(),
        )

    def _records(self, field: str) -> list[dict[str, Any]]:
        """Returns a nonempty Phase-3 reconciliation collection.

        Args:
            field: Required Phase-3 collection name.

        Returns:
            Validated reconciliation records.
        """
        records = self.phase3.get(field)
        self.assertIsInstance(records, list, f"{field} must be a list")
        assert isinstance(records, list)
        self.assertTrue(records, f"{field} cannot be empty")
        self.assertTrue(all(isinstance(record, dict) for record in records))
        return [record for record in records if isinstance(record, dict)]

    def _candidate(self) -> dict[str, Any]:
        """Loads the required non-consumable candidate denominator manifest.

        Returns:
            Candidate denominator manifest.
        """
        return _load_json(CANDIDATE_PATH, phase4=True)

    def _assert_no_interpretation_fields(self, value: object, location: str = "$") -> None:
        """Rejects ontology or product conclusions in Phase-4 inventory outputs.

        Args:
            value: JSON value to inspect recursively.
            location: JSON path used in failures.

        Returns:
            Nothing.
        """
        if isinstance(value, dict):
            for key, nested in value.items():
                normalized = key.lower().replace("-", "_").replace(" ", "_")
                self.assertNotIn(normalized, FORBIDDEN_INTERPRETATION_FIELDS, f"forbidden interpretation field at {location}.{key}")
                self._assert_no_interpretation_fields(nested, f"{location}.{key}")
        elif isinstance(value, list):
            for index, nested in enumerate(value):
                self._assert_no_interpretation_fields(nested, f"{location}[{index}]")

    def test_red_report_is_contract_only_and_names_the_phase4_gate(self) -> None:
        """Keeps this RED report separate from review and acceptance evidence.

        Returns:
            Nothing.
        """
        report = _load_json(REPORT_PATH)
        self.assertEqual(report.get("schema_version"), "apk-denominator-phase4-acceptance-contract-report.v1")
        self.assertEqual(report.get("status"), "red-contract-authored")
        self.assertEqual(report.get("source_baseline_revision"), self.baseline)
        self.assertEqual(report.get("red_command"), report.get("green_command"))
        self.assertIn("test_apk_source_denominator_inventory_phase4", str(report.get("red_command")))
        self.assertNotIn("accepted", str(report.get("status")).lower())
        # Phase-4 contract report must pin its authoring baseline to a real,
        # abbreviated commit reference that resolves through `git rev-parse`.
        # This mirrors the resolver used for plan-task commit evidence and
        # prevents a future author from re-authoring the contract at an
        # unresolvable revision without detection.
        authoring_baseline = report.get("phase_authoring_baseline_revision")
        self.assertIsInstance(authoring_baseline, str)
        self.assertRegex(str(authoring_baseline), COMMIT_EVIDENCE)
        assert isinstance(authoring_baseline, str)
        self.assertEqual(
            subprocess.run(
                ["git", "rev-parse", "--verify", f"{authoring_baseline}^{{commit}}"],
                cwd=REPO_ROOT,
                capture_output=True,
                check=False,
            ).returncode,
            0,
            f"phase_authoring_baseline_revision {authoring_baseline!r} does not resolve to a git commit",
        )

    def test_fresh_independent_review_replays_phase3_and_reports_no_blocking_findings(self) -> None:
        """Requires fresh reviewer provenance, full rerun evidence, and zero CHM findings.

        Returns:
            Nothing.
        """
        self.assertEqual(self.review.get("schema_version"), "apk-denominator-independent-review.v1")
        self.assertEqual(self.review.get("track_id"), TRACK)
        self.assertEqual(self.review.get("status"), "independent-review-complete")
        self.assertEqual(self.review.get("source_baseline_revision"), self.baseline)
        self.assertEqual(self.review.get("reviewer_role"), "adversarial-reviewer")
        isolation = self.review.get("reviewer_isolation")
        self.assertIsInstance(isolation, dict)
        assert isinstance(isolation, dict)
        self.assertEqual(isolation.get("fork_turns"), "none")
        self.assertIsInstance(isolation.get("fresh_prompt_sha256"), str)
        self.assertRegex(str(isolation.get("fresh_prompt_sha256")), SHA256)
        self._artifact_hash(PHASE3_PATH, self.review.get("phase3_reconciliation"))

        rerun = self.review.get("full_reconciliation_rerun")
        self.assertIsInstance(rerun, dict)
        assert isinstance(rerun, dict)
        self.assertEqual(rerun.get("status"), "passed")
        self.assertEqual(rerun.get("source_baseline_revision"), self.baseline)
        self.assertIn("generate_phase3_reconciliation.py", str(rerun.get("command")))
        self.assertEqual(rerun.get("phase3_output_sha256"), _sha256(PHASE3_PATH))
        self.assertEqual(rerun.get("unresolved_source_count"), 0)
        self.assertEqual(rerun.get("reconciliation_status"), "reconciliation-complete")
        findings = self.review.get("findings")
        self.assertIsInstance(findings, list)
        assert isinstance(findings, list)
        for finding in findings:
            self.assertIsInstance(finding, dict)
            assert isinstance(finding, dict)
            self.assertIn(str(finding.get("severity", "")).lower(), FINDING_SEVERITIES)
            self.assertNotIn(str(finding.get("severity", "")).lower(), BLOCKING_SEVERITIES)
        self.assertEqual(self.review.get("blocking_findings_by_severity"), {severity: 0 for severity in sorted(BLOCKING_SEVERITIES)})

    def test_rerun_revalidates_all_exact_denominator_partitions_and_source_locators(self) -> None:
        """Requires exact rerun coverage for every source-backed denominator category.

        Returns:
            Nothing.
        """
        rerun = self.review["full_reconciliation_rerun"]
        assert isinstance(rerun, dict)
        coverage = rerun.get("coverage")
        self.assertIsInstance(coverage, dict)
        assert isinstance(coverage, dict)
        expected = {
            "identities": len(self._records("identity_reconciliation_records")),
            "files": len(self._records("file_reconciliation_records")),
            "source_records": len(self._records("source_record_reconciliation_records")),
            "surfaces": len(self._records("surface_reconciliation_records")),
            "asset_candidates": len(self._records("asset_candidate_reconciliation_records")),
            "identical_hash_groups": len(self._records("identical_hash_group_reconciliation_records")),
            "copies": len(self._records("copy_reconciliation_records")),
            "history_and_discrepancies": len(self._records("discrepancy_reconciliation_records")),
        }
        self.assertEqual(coverage, expected)
        self.assertEqual(self.phase3.get("unresolved_sources"), [])
        self.assertEqual(self.phase3.get("status"), "reconciliation-complete")
        with tempfile.TemporaryDirectory() as directory:
            reproduced_path = Path(directory) / "phase3-reconciliation.json"
            result = subprocess.run(
                [sys.executable, str(PHASE3_GENERATOR_PATH), "--output", str(reproduced_path)],
                cwd=REPO_ROOT,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr.decode("utf-8", errors="replace"))
            self.assertEqual(_sha256(reproduced_path), _sha256(PHASE3_PATH))
        for field in (
            "replacement_program_identity_records",
            "identity_reconciliation_records",
            "file_reconciliation_records",
            "source_record_reconciliation_records",
            "graph_edge_reconciliation_records",
            "surface_reconciliation_records",
            "asset_candidate_reconciliation_records",
            "identical_hash_group_reconciliation_records",
            "copy_reconciliation_records",
            "discrepancy_reconciliation_records",
        ):
            for record in self._records(field):
                for key in ("program_evidence", "mechanical_evidence", "human_evidence", "evidence"):
                    value = record.get(key)
                    locators = value if isinstance(value, list) else [value]
                    for locator in locators:
                        if locator is not None:
                            self._assert_locator(locator)

    def test_exact_identity_file_surface_asset_group_copy_and_history_sets_remain_unchanged(self) -> None:
        """Checks complete Phase-3 result sets rather than trusting summary counters.

        Returns:
            Nothing.
        """
        source = _load_json(TRACK_DIR / "source-denominator.json")
        ledger = _load_json(TRACK_DIR / "game-identity-ledger.json")
        scenes = _load_json(TRACK_DIR / "scene-state-denominator.json")
        assets = _load_json(TRACK_DIR / "asset-file-denominator.json")
        history = _load_json(TRACK_DIR / "historical-source-denominator.json")
        discrepancies = _load_json(TRACK_DIR / "denominator-discrepancies.json")
        human_duplicates = _load_json(TRACK_DIR / "human-duplicate-drift-records.json")
        human_history = _load_json(TRACK_DIR / "human-historical-deleted-records.json")
        human_discrepancies = _load_json(TRACK_DIR / "human-discrepancy-records.json")
        identities = {row["canonical_identity_id"] for row in ledger["identity_records"]}
        self.assertEqual({row.get("canonical_identity_id") for row in self._records("identity_reconciliation_records")}, identities)
        files = {row["record_id"] for row in source["records"] if row.get("record_type") == "file"}
        self.assertEqual({row.get("mechanical_record_id") for row in self._records("file_reconciliation_records")}, files)
        all_sources = {row["record_id"] for row in source["records"]}
        self.assertEqual({row.get("mechanical_record_id") for row in self._records("source_record_reconciliation_records")}, all_sources)
        expected_surfaces = {
            **{_key(row): "scene" for row in scenes["scene_records"]},
            **{_key(row): "state" for row in scenes["state_records"]},
            **{_key(row): row["transition_kind"] for row in scenes["transitions"]},
        }
        surface_records = self._records("surface_reconciliation_records")
        self.assertEqual({_key(row.get("mechanical_surface")) for row in surface_records}, set(expected_surfaces))
        self.assertTrue({row.get("surface_kind") for row in surface_records}.issubset(SURFACE_KINDS))
        for row in surface_records:
            self.assertEqual(row.get("surface_kind"), expected_surfaces[_key(row.get("mechanical_surface"))])
        candidates = {
            row["canonical_path"]: (row["sha256"], row["identical_hash_group"])
            for row in assets["candidate_files"]
        }
        self.assertEqual({row.get("canonical_path") for row in self._records("asset_candidate_reconciliation_records")}, set(candidates))
        for row in self._records("asset_candidate_reconciliation_records"):
            self.assertEqual((row.get("sha256"), row.get("identical_hash_group")), candidates[row["canonical_path"]])
        groups: dict[str, set[str]] = {}
        for path, (_, group) in candidates.items():
            groups.setdefault(group, set()).add(path)
        group_records = self._records("identical_hash_group_reconciliation_records")
        self.assertEqual({row.get("identical_hash_group") for row in group_records}, set(groups))
        for row in group_records:
            self.assertEqual(set(row.get("canonical_paths", [])), groups[row["identical_hash_group"]])
        copies = {row["record_id"] for row in source["records"] if row.get("record_type") == "copy"}
        self.assertEqual({row.get("mechanical_copy_record_id") for row in self._records("copy_reconciliation_records")}, copies)
        expected_discrepancies = {
            *(f"mechanical:{row['observation_id']}" for row in discrepancies["records"]),
            *(f"human-duplicate:{row['record_id']}" for row in human_duplicates["duplicate_drift_records"]),
            *(f"historical:{_key(row['evidence'])}" for row in history["records"]),
            *(f"human-historical:{_key(row['evidence'])}" for row in human_history["historical_deleted_records"]),
            *(f"human-comparison:{row['observation_id']}" for row in human_discrepancies["mechanical_observation_records"]),
        }
        self.assertEqual(
            {row.get("discrepancy_key") for row in self._records("discrepancy_reconciliation_records")},
            expected_discrepancies,
        )

    def test_review_receipt_is_fresh_and_has_numeric_usage_under_every_stop_loss_ceiling(self) -> None:
        """Rejects unmeasured reviewer activity and breached numeric stop-losses.

        Returns:
            Nothing.
        """
        receipt = _load_json(REVIEW_RECEIPT_PATH, phase4=True)
        self.assertEqual(receipt.get("schema_version"), self.ownership["receipt_contract"]["schema_version"])
        self.assertEqual(receipt.get("role"), "adversarial-reviewer")
        self.assertEqual(receipt.get("phase"), "Phase 4: Full independent acceptance")
        self.assertEqual(receipt.get("source_baseline_revision"), self.baseline)
        required_provenance = self.ownership["receipt_contract"]["required_provenance"]
        self.assertIsInstance(required_provenance, list)
        assert isinstance(required_provenance, list)
        unavailable_platform_fields = {
            "spawn_id",
            "parent_ancestry_ids",
            "prompt_sha256",
            "actual_context_manifest_sha256",
            "start_event_id",
            "end_event_id",
            "final_response_sha256",
        }
        for field in required_provenance:
            self.assertIn(field, receipt)
            if field in unavailable_platform_fields and receipt[field] is None:
                limitation = receipt.get(f"{field}_limitation")
                self.assertIsInstance(limitation, str)
                self.assertTrue(limitation)
            elif field == "parent_ancestry_ids":
                self.assertIsInstance(receipt[field], list)
                self.assertTrue(all(isinstance(value, str) and value for value in receipt[field]))
            elif field in {"output_sha256", "budget_declaration_sha256"}:
                self.assertIsInstance(receipt[field], str)
                self.assertRegex(str(receipt[field]), SHA256)
            elif field == "commit_sha":
                self.assertIsInstance(receipt[field], str)
                self.assertRegex(str(receipt[field]), COMMIT_SHA)
            else:
                self.assertIsInstance(receipt[field], str)
                self.assertTrue(receipt[field])
        self.assertRegex(str(receipt.get("commit_sha")), COMMIT_SHA)
        output_path = str(REVIEW_PATH.relative_to(REPO_ROOT))
        self.assertEqual(receipt.get("output_paths"), [output_path])
        output_hashes = receipt.get("output_hashes")
        self.assertEqual(output_hashes, {output_path: _sha256(REVIEW_PATH)})
        self.assertEqual(
            receipt.get("output_sha256"),
            hashlib.sha256(json.dumps(output_hashes, sort_keys=True, separators=(",", ":")).encode()).hexdigest(),
        )
        self.assertEqual(_git_bytes(receipt["commit_sha"], output_path), REVIEW_PATH.read_bytes())
        usage = receipt.get("actual_usage")
        ceiling = self.freeze["frozen_resource_ceilings"]["adversarial-reviewer"]
        self.assertIsInstance(usage, dict)
        assert isinstance(usage, dict)
        self.assertEqual(set(usage), set(ceiling))
        for field, limit in ceiling.items():
            value = usage.get(field)
            self.assertIsInstance(value, int)
            self.assertNotIsInstance(value, bool)
            assert isinstance(value, int)
            self.assertGreaterEqual(value, 0)
            self.assertLessEqual(value, limit)
        stop_loss = receipt.get("stop_loss_observations")
        self.assertIsInstance(stop_loss, dict)
        assert isinstance(stop_loss, dict)
        self.assertEqual(stop_loss.get("unsupported_factual_claims"), 0)
        self.assertEqual(stop_loss.get("denominator_mismatches"), 0)
        self.assertEqual(stop_loss.get("failed_fix_review_cycles"), 0)
        self.assertEqual(stop_loss.get("unresolved_blocking_findings"), {severity: 0 for severity in sorted(BLOCKING_SEVERITIES)})

    def test_candidate_denominator_and_partition_manifests_are_nonconsumable_and_exactly_bound(self) -> None:
        """Requires pre-approval manifests to be exact yet explicitly non-consumable.

        Returns:
            Nothing.
        """
        candidate = self._candidate()
        self.assertEqual(candidate.get("schema_version"), "apk-denominator-candidate-manifest.v1")
        self.assertEqual(candidate.get("status"), "candidate-non-consumable")
        self.assertFalse(candidate.get("consumable"))
        self.assertFalse(candidate.get("accepted"))
        self.assertFalse(candidate.get("revoked"))
        self.assertEqual(candidate.get("source_baseline_revision"), self.baseline)
        self._artifact_hash(PHASE3_PATH, candidate.get("phase3_reconciliation"))
        self._artifact_hash(REVIEW_PATH, candidate.get("independent_review"))
        counts = candidate.get("denominator_counts")
        self.assertEqual(counts, self.review["full_reconciliation_rerun"]["coverage"])

        partition = _load_json(CANDIDATE_PARTITION_PATH, phase4=True)
        self.assertEqual(partition.get("schema_version"), "apk-denominator-candidate-partition.v1")
        self.assertEqual(partition.get("status"), "candidate-non-consumable")
        self.assertFalse(partition.get("consumable"))
        self.assertFalse(partition.get("accepted"))
        self.assertFalse(partition.get("revoked"))
        self._artifact_hash(CANDIDATE_PATH, partition.get("candidate_denominator"))
        program = _git_bytes(self.baseline, PROGRAM_PATH).decode("utf-8")
        block = program.split("### Pilot\n", 1)[1].split("The partition covers 29 canonical identities exactly once.", 1)[0]
        expected_names = re.findall(r"^- (.+)$", block, flags=re.MULTILINE)
        assignments = partition.get("assignments")
        self.assertIsInstance(assignments, list)
        assert isinstance(assignments, list)
        self.assertEqual([row.get("canonical_identity_label") for row in assignments], expected_names)
        self.assertEqual(len(assignments), 29)
        self.assertEqual(len({row.get("canonical_identity_label") for row in assignments}), 29)

    def test_owner_acceptance_and_accepted_manifests_are_impossible_before_authorized_approval(self) -> None:
        """Requires exact current-owner approval before either accepted output exists.

        Returns:
            Nothing.
        """
        acceptance_exists = OWNER_ACCEPTANCE_PATH.is_file()
        accepted_paths = (ACCEPTED_PATH, ACCEPTED_PARTITION_PATH)
        if not acceptance_exists:
            self.assertTrue(all(not path.exists() for path in accepted_paths))
            return
        acceptance = _load_json(OWNER_ACCEPTANCE_PATH, phase4=True)
        candidate = self._candidate()
        self.assertEqual(acceptance.get("schema_version"), "apk-denominator-owner-acceptance.v1")
        self.assertEqual(acceptance.get("decision"), "approve")
        self.assertFalse(acceptance.get("revoked"))
        bindings = acceptance.get("approved_hashes")
        self.assertEqual(bindings, {
            "candidate": _sha256(CANDIDATE_PATH),
            "candidate_partition": _sha256(CANDIDATE_PARTITION_PATH),
            "review": _sha256(REVIEW_PATH),
            "gate": self.freeze["accepted_predecessor"]["manifest_sha256"],
        })
        authorization = acceptance.get("current_owner_authorization")
        self.assertIsInstance(authorization, dict)
        assert isinstance(authorization, dict)
        self.assertEqual(authorization.get("actor_role"), "product-owner")
        self.assertEqual(authorization.get("status"), "currently-authorized")
        self.assertIsInstance(authorization.get("event_id"), str)
        self.assertRegex(str(authorization.get("approval_message_sha256")), SHA256)
        self.assertIsInstance(authorization.get("authorization_checked_at"), str)
        for path, schema in ((ACCEPTED_PATH, "apk-denominator-accepted-manifest.v1"), (ACCEPTED_PARTITION_PATH, "apk-denominator-accepted-partition-manifest.v1")):
            manifest = _load_json(path, phase4=True)
            self.assertEqual(manifest.get("schema_version"), schema)
            self.assertEqual(manifest.get("status"), "accepted")
            self.assertTrue(manifest.get("consumable"))
            self.assertFalse(manifest.get("revoked"))
            self._artifact_hash(CANDIDATE_PATH, manifest.get("candidate_denominator"))
            self._artifact_hash(REVIEW_PATH, manifest.get("independent_review"))
            self._artifact_hash(OWNER_ACCEPTANCE_PATH, manifest.get("owner_acceptance"))
            self.assertEqual(manifest.get("gate_manifest_sha256"), bindings["gate"])
            if path == ACCEPTED_PARTITION_PATH:
                self._artifact_hash(CANDIDATE_PARTITION_PATH, manifest.get("candidate_partition"))
                self.assertEqual(manifest.get("assignments"), _load_json(CANDIDATE_PARTITION_PATH)["assignments"])
        self.assertEqual(candidate.get("status"), "candidate-non-consumable")

    def test_phase4_outputs_are_discoverable_and_contain_no_interpretive_conclusions(self) -> None:
        """Requires indexed Phase-4 outputs while retaining the inventory-only boundary.

        Returns:
            Nothing.
        """
        index = (TRACK_DIR / "index.md").read_text(encoding="utf-8")
        report = _load_json(REPORT_PATH)
        required_paths = report.get("required_phase4_artifacts")
        self.assertIsInstance(required_paths, list)
        assert isinstance(required_paths, list)
        for name in required_paths:
            self.assertIsInstance(name, str)
            assert isinstance(name, str)
            self.assertIn(f"./{name}", index)

        outputs = [self.review, self._candidate(), _load_json(CANDIDATE_PARTITION_PATH, phase4=True)]
        if OWNER_ACCEPTANCE_PATH.is_file():
            outputs.extend([_load_json(OWNER_ACCEPTANCE_PATH, phase4=True), _load_json(ACCEPTED_PATH, phase4=True), _load_json(ACCEPTED_PARTITION_PATH, phase4=True)])
        for output in outputs:
            self._assert_no_interpretation_fields(output)

    def test_plan_records_reviewer_completion_but_preserves_deferred_owner_gate(self) -> None:
        """Makes published reviewer outputs consistent with the Phase-4 task markers.

        Returns:
            Nothing.
        """
        phase_four = PLAN_PATH.read_text(encoding="utf-8").split("## Phase 4: Full independent acceptance", 1)[1]
        phase_four = phase_four.split("\n## ", 1)[0]
        reviewer_tasks = [
            "Spawn a `fork_turns=\"none\"`, tool-attested reviewer to re-run full denominator reconciliation",
            "Run claim hash, revision reachability, denominator, role-receipt, and stop-loss validators",
            "Remediate every Critical, High, and Medium finding",
            "Publish non-consumable candidate denominator and partition manifests plus complete review report",
        ]
        for task in reviewer_tasks:
            line = next((item for item in phase_four.splitlines() if task in item), None)
            self.assertIsNotNone(line)
            assert line is not None
            self.assertTrue(line.startswith("- [x] Task:"), line)
            self.assertIsNotNone(COMMIT_EVIDENCE.search(line), f"completed Phase-4 reviewer task lacks commit evidence: {line}")
        self.assertIn("- [b] Task: Obtain product-owner acceptance", phase_four)
        self.assertIn("deferred:product-owner", phase_four)

    def test_metadata_plan_and_registry_only_claim_closeout_after_acceptance_with_commit_evidence(self) -> None:
        """Makes terminal track status contingent on approved accepted manifests.

        Returns:
            Nothing.
        """
        metadata = _load_json(METADATA_PATH)
        plan = PLAN_PATH.read_text(encoding="utf-8")
        registry = REGISTRY_PATH.read_text(encoding="utf-8")
        track_line = next((line for line in registry.splitlines() if TRACK in line), None)
        self.assertIsNotNone(track_line)
        assert track_line is not None
        terminal = OWNER_ACCEPTANCE_PATH.is_file()
        if not terminal:
            self.assertEqual(metadata.get("status"), "in_progress")
            self.assertNotIn("[x] **Track: APK Independent Source Denominator Inventory", track_line)
            return
        self.assertEqual(metadata.get("status"), "completed")
        self.assertIn("[x] **Track: APK Independent Source Denominator Inventory", track_line)
        self.assertNotRegex(plan, r"\[(?:~|b| )\]")
        completed = [line for line in plan.splitlines() if "[x]" in line]
        self.assertTrue(completed)
        for line in completed:
            match = COMMIT_EVIDENCE.search(line)
            self.assertIsNotNone(match, f"completed plan task lacks commit evidence: {line}")
            assert match is not None
            revision = match.group(1)
            self.assertTrue(subprocess.run(["git", "rev-parse", "--verify", f"{revision}^{{commit}}"], cwd=REPO_ROOT, capture_output=True, check=False).returncode == 0)


class Phase4GreenBranchCounterexamples(unittest.TestCase):
    """Exercises forged Green transitions without creating live acceptance evidence."""

    REQUIRED_ROLES = (
        "discovery-auditor",
        "evidence-collector",
        "requirements-mapper",
        "truth-test-author",
        "adversarial-reviewer",
    )

    @classmethod
    def setUpClass(cls) -> None:
        """Creates one temporary two-commit repository and a valid paired control.

        Returns:
            Nothing.
        """
        cls._temporary = tempfile.TemporaryDirectory(prefix="apk-phase4-attacks-")
        cls.fixture_repo = Path(cls._temporary.name)
        cls._git("init", "-q", "-b", "main")
        cls._git("config", "user.email", "phase4-fixture@example.invalid")
        cls._git("config", "user.name", "Phase 4 Fixture")
        (cls.fixture_repo / "raw").mkdir()
        (cls.fixture_repo / "quarantine" / "failed-track").mkdir(parents=True)
        source_bytes = (
            b'export const supportedTransition = "playing->ended";\n'
            b'export const duplicateSceneOccurrenceA = "battle";\n'
            b'export const duplicateSceneOccurrenceB = "battle";\n'
        )
        (cls.fixture_repo / "raw" / "game.ts").write_bytes(source_bytes)
        (cls.fixture_repo / "quarantine" / "failed-track" / "invented.json").write_text(
            '{"invented":"game"}\n', encoding="utf-8"
        )
        cls._git("add", ".")
        cls._git("commit", "-q", "-m", "fixture: raw source")
        cls.source_commit = cls._git("rev-parse", "HEAD").stdout.strip()

        ceilings = {
            "discovery-auditor": {"source_files": 10, "command_invocations": 10, "bytes_read": 10000},
            "evidence-collector": {"source_files": 10, "command_invocations": 10, "bytes_read": 10000},
            "requirements-mapper": {"claim_records": 100, "command_invocations": 10, "bytes_read": 10000},
            "truth-test-author": {"test_cases": 100, "command_invocations": 10, "bytes_read": 10000},
            "adversarial-reviewer": {"source_files": 10, "command_invocations": 10, "bytes_read": 10000},
        }
        cls.predecessor_gate_sha256 = "f" * 64
        cls.quarantined_prefix = "quarantine/failed-track/"
        cls.freeze_path = "authority/phase0-input-freeze.json"
        cls.ownership_path = "authority/phase0-role-ownership-manifest.json"
        freeze = {
            "schema_version": "apk-source-denominator.phase0-input-freeze.v1",
            "baseline_revision": cls.source_commit,
            "accepted_predecessor": {
                "manifest_sha256": cls.predecessor_gate_sha256,
            },
            "source_scope": {
                "current_revision": cls.source_commit,
                "roots": ["raw"],
            },
            "failed_track_quarantine": {
                "path": cls.quarantined_prefix.rstrip("/"),
            },
            "frozen_resource_ceilings": ceilings,
            "stop_loss": {
                "unsupported_factual_claims_before_stop": 1,
                "denominator_mismatches_before_stop": 1,
                "failed_fix_review_cycles_before_block": 2,
                "unresolved_blocking_severities": ["critical", "high", "medium"],
                "unmeasured_resource_usage_blocks_checkpoint": True,
            },
        }
        freeze_bytes = cls._json_bytes(freeze)
        ownership = {
            "schema_version": "apk-source-denominator.phase0-role-ownership.v1",
            "allowed_input_manifest_path": cls.freeze_path,
            "allowed_input_manifest_sha256": hashlib.sha256(freeze_bytes).hexdigest(),
            "required_roles": list(cls.REQUIRED_ROLES),
            "incompatible_roles": [
                [left, right]
                for index, left in enumerate(cls.REQUIRED_ROLES)
                for right in cls.REQUIRED_ROLES[index + 1 :]
            ],
            "tasks": [
                {
                    "task_id": "discovery-auditor:fixture-owned-task",
                    "owner_role": "discovery-auditor",
                    "reviewer_role": "adversarial-reviewer",
                    "forbidden_roles": list(cls.REQUIRED_ROLES[1:]),
                    "expected_outputs": ["evidence/raw-inventory.json"],
                },
                {
                    "task_id": "evidence-collector:fixture-owned-task",
                    "owner_role": "evidence-collector",
                    "reviewer_role": "adversarial-reviewer",
                    "forbidden_roles": [role for role in cls.REQUIRED_ROLES if role != "evidence-collector"],
                    "expected_outputs": ["evidence/human-discovery.json"],
                },
                {
                    "task_id": "requirements-mapper:fixture-owned-task",
                    "owner_role": "requirements-mapper",
                    "reviewer_role": "adversarial-reviewer",
                    "forbidden_roles": [role for role in cls.REQUIRED_ROLES if role != "requirements-mapper"],
                    "expected_outputs": ["evidence/reconciliation.json"],
                },
                {
                    "task_id": "truth-test-author:fixture-owned-task",
                    "owner_role": "truth-test-author",
                    "reviewer_role": "adversarial-reviewer",
                    "forbidden_roles": [role for role in cls.REQUIRED_ROLES if role != "truth-test-author"],
                    "expected_outputs": ["evidence/contract-report.json"],
                },
                {
                    "task_id": "adversarial-reviewer:fixture-owned-task",
                    "owner_role": "adversarial-reviewer",
                    "reviewer_role": "product-owner",
                    "forbidden_roles": list(cls.REQUIRED_ROLES[:-1]),
                    "expected_outputs": [
                        "evidence/independent-review.json",
                    ],
                },
            ],
            "receipt_contract": {
                "schema_version": "apk-role-receipt.v1",
                "required_provenance": [
                    "spawn_id",
                    "parent_ancestry_ids",
                    "prompt_sha256",
                    "actual_context_manifest_sha256",
                    "start_event_id",
                    "end_event_id",
                    "final_response_sha256",
                    "output_sha256",
                    "budget_declaration_sha256",
                    "commit_sha",
                ],
            },
        }
        for relative, data in {
            cls.freeze_path: freeze_bytes,
            cls.ownership_path: cls._json_bytes(ownership),
        }.items():
            path = cls.fixture_repo / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        cls._git("add", ".")
        cls._git("commit", "-q", "-m", "fixture: frozen Phase-0 authority")
        cls.authority_commit = cls._git("rev-parse", "HEAD").stdout.strip()
        cls.authority = TrustedPhase4Authority(
            phase0_commit_sha=cls.authority_commit,
            input_freeze_path=cls.freeze_path,
            ownership_manifest_path=cls.ownership_path,
            admitted_phase_base_sha=cls.authority_commit,
        )

        lines = source_bytes.splitlines(keepends=True)
        transition_locator = cls._locator("raw/game.ts", 1, lines[0])
        scene_a_locator = cls._locator("raw/game.ts", 2, lines[1])
        scene_b_locator = cls._locator("raw/game.ts", 3, lines[2])
        record_sets: dict[str, list[dict[str, Any]]] = {
            "identities": [
                {
                    "record_id": "identity:game-a",
                    "identity_id": "game-a",
                    "states": ["current", "catalog-withdrawn"],
                    "evidence": [scene_a_locator],
                },
                {
                    "record_id": "identity:game-b",
                    "identity_id": "game-b",
                    "states": ["historical/withdrawn"],
                    "evidence": [scene_b_locator],
                },
            ],
            "files": [
                {"record_id": "file:game", "path": "raw/game.ts", "evidence": [transition_locator]},
            ],
            "source_records": [
                {"record_id": "source:transition", "occurrence_id": "raw/game.ts:1", "evidence": [transition_locator]},
                {"record_id": "source:scene-a", "occurrence_id": "raw/game.ts:2", "evidence": [scene_a_locator]},
                {"record_id": "source:scene-b", "occurrence_id": "raw/game.ts:3", "evidence": [scene_b_locator]},
            ],
            "graph_edges": [
                {"record_id": "edge:game-to-runtime", "source": "file:game", "target": "runtime:game"},
            ],
            "surfaces": [
                {"record_id": "scene:battle:a", "surface_id": "battle", "kind": "scene", "occurrence_id": "raw/game.ts:2", "evidence": [scene_a_locator]},
                {"record_id": "scene:battle:b", "surface_id": "battle", "kind": "scene", "occurrence_id": "raw/game.ts:3", "evidence": [scene_b_locator]},
                {"record_id": "state:playing", "surface_id": "playing", "kind": "state", "occurrence_id": "raw/game.ts:1", "evidence": [transition_locator]},
                {"record_id": "transition:playing-ended", "kind": "transition", "from_state": "playing", "to_state": "ended", "source_signature": "playing->ended", "evidence": [transition_locator]},
            ],
            "asset_candidates": [
                {"record_id": "asset:game", "path": "raw/game.ts", "sha256": hashlib.sha256(source_bytes).hexdigest()},
            ],
            "identical_hash_groups": [
                {"record_id": "group:game", "paths": ["raw/game.ts"]},
            ],
            "copies": [
                {"record_id": "copy:reading", "host": "reading", "source_record_id": "file:game"},
                {"record_id": "copy:primary", "host": "primary", "source_record_id": "file:game"},
            ],
            "history_and_discrepancies": [
                {"record_id": "history:game-b", "identity_id": "game-b", "evidence": [scene_b_locator]},
            ],
        }
        raw_inventory = {
            "schema_version": "apk-denominator-raw-inventory-fixture.v1",
            "discovery_method": "raw-source-enumeration",
            "record_sets": record_sets,
        }
        human_discovery = {
            "schema_version": "apk-denominator-human-discovery-fixture.v1",
            "discovery_origin": "independent-raw-source-event",
            "event_id": "evt_evidence_collector",
            "record_sets": copy.deepcopy(record_sets),
        }
        reconciliation = {
            "schema_version": "apk-denominator-reconciliation-fixture.v1",
            "status": "reconciliation-complete",
            "unresolved_sources": [],
            "record_sets": copy.deepcopy(record_sets),
        }
        contract_report = {
            "schema_version": "apk-denominator-contract-fixture.v1",
            "status": "red-contract-authored",
        }
        raw_path = "evidence/raw-inventory.json"
        human_path = "evidence/human-discovery.json"
        reconciliation_path = "evidence/reconciliation.json"
        contract_path = "evidence/contract-report.json"
        review_path = "evidence/independent-review.json"
        candidate_path = "evidence/candidate.json"
        partition_path = "evidence/candidate-partition.json"
        owner_path = "evidence/owner-approval.json"
        accepted_path = "evidence/accepted.json"
        accepted_partition_path = "evidence/accepted-partition.json"
        artifacts: dict[str, bytes] = {
            raw_path: cls._json_bytes(raw_inventory),
            human_path: cls._json_bytes(human_discovery),
            reconciliation_path: cls._json_bytes(reconciliation),
            contract_path: cls._json_bytes(contract_report),
        }
        review = {
            "schema_version": "apk-denominator-independent-review-fixture.v1",
            "status": "independent-review-complete",
            "reviewer_event_id": "evt_adversarial_reviewer",
            "source_baseline_revision": cls.source_commit,
            "phase_base_sha": cls.authority_commit,
            "fork_turns": "none",
            "completed_ms": 100,
            "blocking_findings_by_severity": {"critical": 0, "high": 0, "medium": 0},
            "rerun_record_sets": copy.deepcopy(record_sets),
            "reconciliation_sha256": hashlib.sha256(artifacts[reconciliation_path]).hexdigest(),
        }
        artifacts[review_path] = cls._json_bytes(review)
        candidate = {
            "schema_version": "apk-denominator-candidate-fixture.v1",
            "status": "candidate-non-consumable",
            "consumable": False,
            "phase_base_sha": cls.authority_commit,
            "source_baseline_revision": cls.source_commit,
            "bound_hashes": {
                "reconciliation": hashlib.sha256(artifacts[reconciliation_path]).hexdigest(),
                "review": hashlib.sha256(artifacts[review_path]).hexdigest(),
                "gate": cls.predecessor_gate_sha256,
            },
        }
        artifacts[candidate_path] = cls._json_bytes(candidate)
        assignments = [
            {"identity_id": row["identity_id"], "states": row["states"]}
            for row in record_sets["identities"]
        ]
        partition = {
            "schema_version": "apk-denominator-candidate-partition-fixture.v1",
            "status": "candidate-non-consumable",
            "consumable": False,
            "candidate_sha256": hashlib.sha256(artifacts[candidate_path]).hexdigest(),
            "assignments": assignments,
        }
        artifacts[partition_path] = cls._json_bytes(partition)
        approved_hashes = {
            "candidate": hashlib.sha256(artifacts[candidate_path]).hexdigest(),
            "candidate_partition": hashlib.sha256(artifacts[partition_path]).hexdigest(),
            "review": hashlib.sha256(artifacts[review_path]).hexdigest(),
            "gate": cls.predecessor_gate_sha256,
        }
        owner_message = cls._json_bytes({"decision": "approve", "approved_hashes": approved_hashes})
        owner = {
            "schema_version": "apk-denominator-owner-approval-fixture.v1",
            "decision": "approve",
            "event_id": "evt_owner_approval",
            "session_id": "ses_owner",
            "event_timestamp_ms": 110,
            "message_sha256": hashlib.sha256(owner_message).hexdigest(),
            "approved_hashes": approved_hashes,
        }
        artifacts[owner_path] = cls._json_bytes(owner)
        accepted = {
            "schema_version": "apk-denominator-accepted-fixture.v1",
            "status": "accepted",
            "consumable": True,
            "candidate_sha256": approved_hashes["candidate"],
            "review_sha256": approved_hashes["review"],
            "owner_approval_sha256": hashlib.sha256(artifacts[owner_path]).hexdigest(),
            "gate_sha256": cls.predecessor_gate_sha256,
        }
        accepted_partition = {
            "schema_version": "apk-denominator-accepted-partition-fixture.v1",
            "status": "accepted",
            "consumable": True,
            "candidate_partition_sha256": approved_hashes["candidate_partition"],
            "owner_approval_sha256": hashlib.sha256(artifacts[owner_path]).hexdigest(),
            "assignments": assignments,
        }
        artifacts[accepted_path] = cls._json_bytes(accepted)
        artifacts[accepted_partition_path] = cls._json_bytes(accepted_partition)
        for relative, data in artifacts.items():
            path = cls.fixture_repo / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        cls._git("add", ".")
        cls._git("commit", "-q", "-m", "fixture: accepted transition")
        cls.artifact_commit = cls._git("rev-parse", "HEAD").stdout.strip()

        owned_outputs = {
            "discovery-auditor": [raw_path],
            "evidence-collector": [human_path],
            "requirements-mapper": [reconciliation_path],
            "truth-test-author": [contract_path],
            "adversarial-reviewer": [review_path],
        }
        receipts = []
        events: dict[str, dict[str, Any]] = {}
        for index, role in enumerate(cls.REQUIRED_ROLES):
            event_id = "evt_" + role.replace("-", "_")
            output_hashes = {
                path: hashlib.sha256(artifacts[path]).hexdigest()
                for path in owned_outputs[role]
            }
            usage = {key: 1 for key in ceilings[role]}
            started_ms = 90 if role == "adversarial-reviewer" else index * 10 + 1
            completed_ms = 100 if role == "adversarial-reviewer" else index * 10 + 5
            receipt = {
                "schema_version": "apk-role-receipt.v1",
                "role": role,
                "task_id": f"{role}:fixture-owned-task",
                "spawn_id": f"ses_{index}",
                "parent_ancestry_ids": ["ses_root"],
                "prompt_sha256": str(index) * 64,
                "actual_context_manifest_sha256": chr(ord("a") + index) * 64,
                "start_event_id": f"evt_start_{index}",
                "end_event_id": event_id,
                "final_response_sha256": chr(ord("f") - index) * 64,
                "commit_sha": cls.artifact_commit,
                "output_sha256": hashlib.sha256(
                    cls._json_bytes(output_hashes).rstrip(b"\n")
                ).hexdigest(),
                "output_hashes": output_hashes,
                "actual_usage": usage,
                "budget_declaration_sha256": chr(ord("1") + index) * 64,
                "stop_loss_observations": {
                    "unsupported_factual_claims": 0,
                    "denominator_mismatches": 0,
                    "failed_fix_review_cycles": 0,
                    "unresolved_blocking_findings": {"critical": 0, "high": 0, "medium": 0},
                },
            }
            receipts.append(receipt)
            events[event_id] = {
                "id": event_id,
                "role": "assistant",
                "task_role": role,
                "task_id": receipt["task_id"],
                "spawn_id": receipt["spawn_id"],
                "parent_ancestry_ids": receipt["parent_ancestry_ids"],
                "prompt_sha256": receipt["prompt_sha256"],
                "actual_context_manifest_sha256": receipt["actual_context_manifest_sha256"],
                "start_event_id": receipt["start_event_id"],
                "end_event_id": receipt["end_event_id"],
                "final_response_sha256": receipt["final_response_sha256"],
                "budget_declaration_sha256": receipt["budget_declaration_sha256"],
                "started_ms": started_ms,
                "completed_ms": completed_ms,
                "fork_turns": "none",
                "inherited_turn_count": 0,
                "output_hashes": output_hashes,
            }
        events["evt_owner_approval"] = {
            "id": "evt_owner_approval",
            "role": "user",
            "actor_role": "product-owner",
            "session_id": "ses_owner",
            "created_ms": 110,
            "message_bytes": owner_message,
            "message_sha256": hashlib.sha256(owner_message).hexdigest(),
            "approved_hashes": approved_hashes,
        }
        cls.control_events = events
        cls.control_bundle = {
            "schema_version": "apk-denominator-phase4-validation.v1",
            "phase_base_sha": cls.authority_commit,
            "source_baseline_revision": cls.source_commit,
            "predecessor_gate_sha256": cls.predecessor_gate_sha256,
            "quarantined_prefix": cls.quarantined_prefix,
            "frozen_resource_ceilings": ceilings,
            "required_roles": list(cls.REQUIRED_ROLES),
            "role_receipts": receipts,
            "artifact_paths": {
                "raw_inventory": raw_path,
                "human_discovery": human_path,
                "reconciliation": reconciliation_path,
                "review": review_path,
                "candidate": candidate_path,
                "candidate_partition": partition_path,
                "owner_approval": owner_path,
                "accepted": accepted_path,
                "accepted_partition": accepted_partition_path,
            },
            "artifact_bytes": dict(artifacts),
            "artifact_sha256": {
                path: hashlib.sha256(data).hexdigest() for path, data in artifacts.items()
            },
            "artifact_commits": {path: cls.artifact_commit for path in artifacts},
        }
        cls.source_adapter = GitSourceAdapter(cls.fixture_repo)
        cls.control_result = validate_phase4_inventory_acceptance_legacy_test_only(
            copy.deepcopy(cls.control_bundle),
            MappingEventResolver(copy.deepcopy(cls.control_events)),
            cls.source_adapter,
            cls.authority,
        )

    @classmethod
    def tearDownClass(cls) -> None:
        """Deletes all temporary commits and fixture files.

        Returns:
            Nothing.
        """
        cls._temporary.cleanup()

    @classmethod
    def _git(cls, *args: str) -> subprocess.CompletedProcess[str]:
        """Runs one checked Git command in the temporary fixture repository.

        Args:
            args: Git command arguments.

        Returns:
            Completed Git command.
        """
        return subprocess.run(
            ["git", *args],
            cwd=cls.fixture_repo,
            text=True,
            capture_output=True,
            check=True,
        )

    @classmethod
    def _locator(cls, path: str, line_number: int, cited_bytes: bytes) -> dict[str, Any]:
        """Builds one source locator against the fixture's raw-source commit.

        Args:
            path: Repository-relative source path.
            line_number: One-based cited line.
            cited_bytes: Exact committed line bytes.

        Returns:
            Commit-bound locator record.
        """
        return {
            "revision": cls.source_commit,
            "path": path,
            "blob_sha256": hashlib.sha256(
                (cls.fixture_repo / path).read_bytes()
            ).hexdigest(),
            "range": {
                "start_line": line_number,
                "end_line": line_number,
                "sha256": hashlib.sha256(cited_bytes).hexdigest(),
            },
        }

    @staticmethod
    def _json_bytes(value: object) -> bytes:
        """Serializes fixture values to deterministic JSON bytes.

        Args:
            value: JSON-compatible fixture value.

        Returns:
            Canonical JSON with one trailing newline.
        """
        return json.dumps(value, sort_keys=True, separators=(",", ":")).encode() + b"\n"

    def _fixture(self) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
        """Returns a mutation-safe paired control and trusted event set.

        Returns:
            Deep copies of the Phase-4 bundle and provider events.
        """
        return copy.deepcopy(self.control_bundle), copy.deepcopy(self.control_events)

    def _validate(
        self,
        bundle: dict[str, Any],
        events: dict[str, dict[str, Any]],
        *,
        resolver: MappingEventResolver | None = None,
    ) -> dict[str, Any]:
        """Runs the production acceptance boundary over one temporary fixture.

        Args:
            bundle: Phase-4 artifact transition bundle.
            events: Provider-resolved task and owner events.
            resolver: Optional stateful resolver for replay tests.

        Returns:
            Reason-coded validation result.
        """
        return validate_phase4_inventory_acceptance_legacy_test_only(
            bundle,
            resolver or MappingEventResolver(events),
            self.source_adapter,
            self.authority,
        )

    def _assert_rejects(
        self,
        bundle: dict[str, Any],
        events: dict[str, dict[str, Any]],
        expected_code: str,
    ) -> None:
        """Requires a passing paired control and one exact reason-coded rejection.

        Args:
            bundle: Mutated attack bundle.
            events: Mutated provider event map.
            expected_code: Frozen rejection code for this mutation class.

        Returns:
            Nothing.
        """
        self.assertTrue(
            self.control_result.get("ok"),
            "paired Green control failed, so the mutation rejection is vacuous: "
            f"{self.control_result}",
        )
        result = self._validate(bundle, events)
        self.assertFalse(
            result.get("ok"),
            f"forged Phase-4 transition reached Green: {result}",
        )
        self.assertEqual(
            result.get("code"),
            expected_code,
            f"forged Phase-4 transition returned the wrong rejection code: {result}",
        )

    def _artifact(self, bundle: dict[str, Any], name: str) -> tuple[str, dict[str, Any]]:
        """Loads one named artifact from a fixture bundle.

        Args:
            bundle: Phase-4 fixture bundle.
            name: Logical artifact name from artifact_paths.

        Returns:
            Artifact path and parsed JSON object.
        """
        path = bundle["artifact_paths"][name]
        return path, json.loads(bundle["artifact_bytes"][path])

    def _replace_artifact(
        self,
        bundle: dict[str, Any],
        name: str,
        payload: dict[str, Any],
        *,
        refresh_declared_hash: bool = True,
    ) -> None:
        """Replaces temporary artifact bytes without touching the live track.

        Args:
            bundle: Mutable Phase-4 fixture bundle.
            name: Logical artifact name.
            payload: Replacement JSON object.
            refresh_declared_hash: Whether to coordinate the bundle's declared hash.

        Returns:
            Nothing.
        """
        path = bundle["artifact_paths"][name]
        data = self._json_bytes(payload)
        bundle["artifact_bytes"][path] = data
        if refresh_declared_hash:
            bundle["artifact_sha256"][path] = hashlib.sha256(data).hexdigest()

    def test_valid_temporary_green_control_uses_no_live_acceptance_artifact(self) -> None:
        """Confirms the valid temporary transition reaches Green without live artifacts.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        result = self._validate(bundle, events)
        self.assertTrue(
            result.get("ok"),
            f"unmodified temporary bundle did not reach Green: {result}",
        )

    def test_all_five_distinct_role_receipts_are_mandatory(self) -> None:
        """Rejects incomplete five-role provenance.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        bundle["role_receipts"].pop()
        self._assert_rejects(bundle, events, "MISSING_REQUIRED_ROLE")

    def test_coordinated_role_and_ceiling_mutations_cannot_redefine_phase0(self) -> None:
        """Rejects coordinated bundle edits to frozen roles or numeric ceilings.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        omitted = bundle["required_roles"].pop(0)
        bundle["role_receipts"] = [
            receipt for receipt in bundle["role_receipts"] if receipt["role"] != omitted
        ]
        bundle["frozen_resource_ceilings"].pop(omitted)
        self._assert_rejects(bundle, events, "FROZEN_AUTHORITY_MISMATCH")

        bundle, events = self._fixture()
        bundle["frozen_resource_ceilings"]["discovery-auditor"]["source_files"] = 999999
        bundle["role_receipts"][0]["actual_usage"]["source_files"] = 999998
        self._assert_rejects(bundle, events, "FROZEN_AUTHORITY_MISMATCH")

    def test_basename_task_outputs_are_confined_to_the_frozen_track_directory(self) -> None:
        """Rejects cross-track, traversal, and absolute basename substitutions."""
        prefix = "measure/tracks/apk_source_denominator_inventory_20260712"
        expected = ["source-denominator.json"]
        self.assertTrue(
            _outputs_match_frozen_task(
                expected, {f"{prefix}/source-denominator.json": "0" * 64}, prefix
            )
        )
        for path in (
            "measure/tracks/other/source-denominator.json",
            f"{prefix}/../other/source-denominator.json",
            "/tmp/source-denominator.json",
        ):
            with self.subTest(path=path):
                self.assertFalse(
                    _outputs_match_frozen_task(expected, {path: "0" * 64}, prefix)
                )

    def test_frozen_task_parser_rejects_malformed_outputs_and_duplicate_forbidden_roles(self) -> None:
        """Rejects malformed trusted authority without raising parser errors."""
        ownership = json.loads(
            (self.fixture_repo / self.ownership_path).read_text(encoding="utf-8")
        )
        malformed = copy.deepcopy(ownership)
        malformed["tasks"][0]["expected_outputs"] = [{}]
        self.assertIsNone(_frozen_role_tasks(malformed, list(self.REQUIRED_ROLES)))

        duplicated = copy.deepcopy(ownership)
        forbidden = duplicated["tasks"][0]["forbidden_roles"]
        forbidden.append(forbidden[0])
        self.assertIsNone(_frozen_role_tasks(duplicated, list(self.REQUIRED_ROLES)))

    def test_every_role_budget_requires_measured_non_boolean_integers(self) -> None:
        """Rejects unmeasured or boolean resource usage under frozen ceilings.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        bundle["role_receipts"][0]["actual_usage"]["source_files"] = False
        self._assert_rejects(bundle, events, "INVALID_RESOURCE_USAGE")

    def test_stop_loss_observations_are_exact_numeric_and_fail_closed(self) -> None:
        """Rejects absent, malformed, negative, or threshold-reaching stop-loss data.

        Returns:
            Nothing.
        """
        mutations = (
            ("missing", lambda receipt: receipt.pop("stop_loss_observations")),
            ("null", lambda receipt: receipt.__setitem__("stop_loss_observations", None)),
            (
                "boolean",
                lambda receipt: receipt["stop_loss_observations"].__setitem__(
                    "unsupported_factual_claims", False
                ),
            ),
            (
                "negative",
                lambda receipt: receipt["stop_loss_observations"].__setitem__(
                    "denominator_mismatches", -1
                ),
            ),
        )
        for label, mutate in mutations:
            with self.subTest(label=label):
                bundle, events = self._fixture()
                mutate(bundle["role_receipts"][0])
                self._assert_rejects(bundle, events, "INVALID_STOP_LOSS_OBSERVATION")

        threshold_mutations = (
            ("unsupported_factual_claims", 1),
            ("denominator_mismatches", 1),
            ("failed_fix_review_cycles", 2),
        )
        for field, value in threshold_mutations:
            with self.subTest(field=field):
                bundle, events = self._fixture()
                bundle["role_receipts"][0]["stop_loss_observations"][field] = value
                self._assert_rejects(bundle, events, "STOP_LOSS_BREACHED")

        bundle, events = self._fixture()
        bundle["role_receipts"][0]["stop_loss_observations"][
            "unresolved_blocking_findings"
        ]["medium"] = 1
        self._assert_rejects(bundle, events, "STOP_LOSS_BREACHED")

    def test_role_receipts_require_provider_resolved_event_identity(self) -> None:
        """Rejects a receipt whose self-attested event has no provider match.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        bundle["role_receipts"][0]["end_event_id"] = "evt_self_attested"
        self._assert_rejects(bundle, events, "EVENT_UNREACHABLE")

    def test_v1_receipt_adapter_requires_every_frozen_provenance_field(self) -> None:
        """Rejects a v1 receipt with any frozen provenance field omitted.

        Returns:
            Nothing.
        """
        for field in (
            "spawn_id",
            "parent_ancestry_ids",
            "prompt_sha256",
            "actual_context_manifest_sha256",
            "start_event_id",
            "end_event_id",
            "final_response_sha256",
            "output_sha256",
            "budget_declaration_sha256",
            "commit_sha",
        ):
            with self.subTest(field=field):
                bundle, events = self._fixture()
                bundle["role_receipts"][0].pop(field)
                self._assert_rejects(bundle, events, "INVALID_ROLE_RECEIPT_V1")

    def test_provider_outputs_exactly_bind_receipt_outputs(self) -> None:
        """Rejects omitted, extra, stale, and forged provider output maps.

        Returns:
            Nothing.
        """
        for label in ("omitted", "extra", "stale", "forged"):
            with self.subTest(label=label):
                bundle, events = self._fixture()
                event = events["evt_discovery_auditor"]
                outputs = event["output_hashes"]
                if label == "omitted":
                    event.pop("output_hashes")
                elif label == "extra":
                    outputs["evidence/unowned.json"] = "0" * 64
                elif label == "stale":
                    outputs[next(iter(outputs))] = "0" * 64
                else:
                    event["output_hashes"] = {"evidence/forged.json": "1" * 64}
                self._assert_rejects(bundle, events, "PROVIDER_OUTPUT_MISMATCH")

    def test_reviewer_event_rejects_inherited_context_even_with_fork_none_text(self) -> None:
        """Rejects inherited reviewer history despite a self-asserted isolation field.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        events["evt_adversarial_reviewer"]["inherited_turn_count"] = 1
        self._assert_rejects(bundle, events, "INHERITED_REVIEWER_CONTEXT")

    def test_every_frozen_role_rejects_inherited_predecessor_context(self) -> None:
        """Rejects inherited context for every pairwise-incompatible frozen role."""
        for role in self.REQUIRED_ROLES[:-1]:
            with self.subTest(role=role):
                bundle, events = self._fixture()
                event = events["evt_" + role.replace("-", "_")]
                event["fork_turns"] = "all"
                event["inherited_turn_count"] = 4
                self._assert_rejects(bundle, events, "INHERITED_ROLE_CONTEXT")

    def test_receipt_and_provider_event_must_bind_the_frozen_task_id(self) -> None:
        """Rejects coordinated receipt/event task substitution outside frozen ownership."""
        bundle, events = self._fixture()
        for receipt in bundle["role_receipts"]:
            receipt["task_id"] = "forged-unowned-task"
            events[receipt["end_event_id"]]["task_id"] = "forged-unowned-task"
        self._assert_rejects(bundle, events, "TASK_OWNERSHIP_MISMATCH")

    def test_provider_outputs_must_remain_with_their_frozen_task_owner(self) -> None:
        """Rejects coordinated output-map swaps between incompatible frozen roles."""
        bundle, events = self._fixture()
        discovery = next(
            row for row in bundle["role_receipts"]
            if row["role"] == "discovery-auditor"
        )
        truth = next(
            row for row in bundle["role_receipts"]
            if row["role"] == "truth-test-author"
        )
        discovery["output_hashes"], truth["output_hashes"] = (
            truth["output_hashes"],
            discovery["output_hashes"],
        )
        for receipt in (discovery, truth):
            receipt["output_sha256"] = hashlib.sha256(
                self._json_bytes(receipt["output_hashes"]).rstrip(b"\n")
            ).hexdigest()
            events[receipt["end_event_id"]]["output_hashes"] = copy.deepcopy(
                receipt["output_hashes"]
            )
        self._assert_rejects(bundle, events, "OUTPUT_OWNERSHIP_MISMATCH")

    def test_review_artifact_cannot_self_attest_an_unresolved_reviewer_event(self) -> None:
        """Rejects a forged review that names no trusted provider event.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, review = self._artifact(bundle, "review")
        review["reviewer_event_id"] = "evt_forged_review"
        self._replace_artifact(bundle, "review", review)
        self._assert_rejects(bundle, events, "EVENT_UNREACHABLE")

    def test_failed_track_paths_are_quarantined_even_when_hashes_resolve(self) -> None:
        """Rejects resolvable failed-track paths as factual denominator evidence.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, raw = self._artifact(bundle, "raw_inventory")
        quarantine_bytes = b'{"invented":"game"}\n'
        raw["quarantine_leak"] = self._locator(
            "quarantine/failed-track/invented.json", 1, quarantine_bytes
        )
        self._replace_artifact(bundle, "raw_inventory", raw)
        self._assert_rejects(bundle, events, "QUARANTINED_SOURCE")

    def test_live_nested_locator_schema_validates_blob_range_roots_and_shape(self) -> None:
        """Rejects tampered or unrecognized live nested locator records.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, raw = self._artifact(bundle, "raw_inventory")
        raw["record_sets"]["source_records"][0]["evidence"][0]["blob_sha256"] = "0" * 64
        self._replace_artifact(bundle, "raw_inventory", raw)
        self._assert_rejects(bundle, events, "SOURCE_LOCATOR_INVALID")

        bundle, events = self._fixture()
        _, raw = self._artifact(bundle, "raw_inventory")
        locator = raw["record_sets"]["source_records"][0]["evidence"][0]
        locator.pop("range")
        locator["line_span"] = {"start": 1, "end": 1, "sha256": "0" * 64}
        self._replace_artifact(bundle, "raw_inventory", raw)
        self._assert_rejects(bundle, events, "UNRECOGNIZED_SOURCE_LOCATOR")

        bundle, events = self._fixture()
        _, raw = self._artifact(bundle, "raw_inventory")
        locator = raw["record_sets"]["source_records"][0]["evidence"][0]
        locator["path"] = "quarantine/failed-track/invented.json"
        locator["blob_sha256"] = hashlib.sha256(
            b'{"invented":"game"}\n'
        ).hexdigest()
        locator["range"]["sha256"] = locator["blob_sha256"]
        self._replace_artifact(bundle, "raw_inventory", raw)
        self._assert_rejects(bundle, events, "QUARANTINED_SOURCE")

    def test_bundle_trust_anchors_and_artifact_ancestry_are_authority_bound(self) -> None:
        """Rejects coordinated redefinition of every frozen trust anchor.

        Returns:
            Nothing.
        """
        for field, value in (
            ("phase_base_sha", self.source_commit),
            ("source_baseline_revision", self.authority_commit),
            ("predecessor_gate_sha256", "0" * 64),
            ("quarantined_prefix", "other/quarantine/"),
        ):
            with self.subTest(field=field):
                bundle, events = self._fixture()
                bundle[field] = value
                self._assert_rejects(bundle, events, "FROZEN_AUTHORITY_MISMATCH")

        bundle, events = self._fixture()
        raw_path = bundle["artifact_paths"]["raw_inventory"]
        bundle["artifact_commits"][raw_path] = self.source_commit
        self._assert_rejects(bundle, events, "ARTIFACT_ANCESTRY_INVALID")

    def test_human_discovery_cannot_originate_from_authored_program_inventory(self) -> None:
        """Rejects generated human discovery derived from authored requirements.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, human = self._artifact(bundle, "human_discovery")
        human["discovery_origin"] = "authored-program-inventory"
        self._replace_artifact(bundle, "human_discovery", human)
        self._assert_rejects(bundle, events, "AUTHORED_DENOMINATOR_REJECTED")

    def test_coordinated_worktree_candidate_edits_cannot_replace_committed_bytes(self) -> None:
        """Rejects a candidate whose coordinated bytes are absent from its bound commit.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, candidate = self._artifact(bundle, "candidate")
        candidate["coordinated_worktree_only"] = True
        self._replace_artifact(bundle, "candidate", candidate)
        self._assert_rejects(bundle, events, "ARTIFACT_COMMIT_MISMATCH")

    def test_receipt_commit_must_be_a_reachable_full_commit_with_exact_outputs(self) -> None:
        """Rejects a syntactically full but nonexistent receipt commit.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        bundle["role_receipts"][0]["commit_sha"] = "0" * 40
        self._assert_rejects(bundle, events, "RECEIPT_COMMIT_UNREACHABLE")

    def test_omitted_source_records_fail_exact_reconciliation(self) -> None:
        """Rejects omission from the exhaustive source-record set.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, reconciliation = self._artifact(bundle, "reconciliation")
        reconciliation["record_sets"]["source_records"].pop()
        self._replace_artifact(bundle, "reconciliation", reconciliation)
        self._assert_rejects(bundle, events, "INCOMPLETE_RECORD_SET")

    def test_omitted_import_edges_fail_exact_reconciliation(self) -> None:
        """Rejects omission from the exhaustive graph-edge/import set.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, reconciliation = self._artifact(bundle, "reconciliation")
        reconciliation["record_sets"]["graph_edges"] = []
        self._replace_artifact(bundle, "reconciliation", reconciliation)
        self._assert_rejects(bundle, events, "INCOMPLETE_RECORD_SET")

    def test_silently_merged_scene_occurrences_fail_exact_reconciliation(self) -> None:
        """Rejects global-ID merging of distinct scene occurrences.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, reconciliation = self._artifact(bundle, "reconciliation")
        reconciliation["record_sets"]["surfaces"] = [
            row
            for row in reconciliation["record_sets"]["surfaces"]
            if row["record_id"] != "scene:battle:b"
        ]
        self._replace_artifact(bundle, "reconciliation", reconciliation)
        self._assert_rejects(bundle, events, "INCOMPLETE_RECORD_SET")

    def test_duplicate_records_cannot_hide_double_counting(self) -> None:
        """Rejects duplicate exact records rather than collapsing them through sets.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, reconciliation = self._artifact(bundle, "reconciliation")
        reconciliation["record_sets"]["files"].append(
            copy.deepcopy(reconciliation["record_sets"]["files"][0])
        )
        self._replace_artifact(bundle, "reconciliation", reconciliation)
        self._assert_rejects(bundle, events, "DUPLICATE_RECORD")

    def test_unsupported_transition_claims_fail_against_raw_source_bytes(self) -> None:
        """Rejects a transition signature absent from the committed source locator.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, raw = self._artifact(bundle, "raw_inventory")
        _, reconciliation = self._artifact(bundle, "reconciliation")
        for artifact in (raw, reconciliation):
            transition = next(
                row
                for row in artifact["record_sets"]["surfaces"]
                if row["kind"] == "transition"
            )
            transition["from_state"] = "ended"
            transition["to_state"] = "playing"
            transition["source_signature"] = "ended->playing"
        self._replace_artifact(bundle, "raw_inventory", raw)
        self._replace_artifact(bundle, "reconciliation", reconciliation)
        self._assert_rejects(bundle, events, "UNSUPPORTED_TRANSITION_CLAIM")

    def test_chm_counts_require_actual_integers_not_boolean_zeroes(self) -> None:
        """Rejects False values that compare equal to numeric zero in Python.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, review = self._artifact(bundle, "review")
        review["blocking_findings_by_severity"]["high"] = False
        self._replace_artifact(bundle, "review", review)
        self._assert_rejects(bundle, events, "NON_INTEGER_CHM_COUNT")

    def test_nonzero_chm_counts_block_candidate_publication(self) -> None:
        """Rejects any unresolved Critical, High, or Medium finding.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, review = self._artifact(bundle, "review")
        review["blocking_findings_by_severity"]["medium"] = 1
        self._replace_artifact(bundle, "review", review)
        self._assert_rejects(bundle, events, "BLOCKING_FINDINGS_REMAIN")

    def test_candidate_hashes_bind_phase_base_reconciliation_review_and_gate(self) -> None:
        """Rejects a forged candidate with a stale reconciliation hash.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, candidate = self._artifact(bundle, "candidate")
        candidate["bound_hashes"]["reconciliation"] = "0" * 64
        self._replace_artifact(bundle, "candidate", candidate)
        self._assert_rejects(bundle, events, "CANDIDATE_HASH_MISMATCH")

    def test_candidate_partition_preserves_simultaneous_current_withdrawn_states(self) -> None:
        """Rejects a partition that collapses a simultaneous catalog-withdrawn state.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, partition = self._artifact(bundle, "candidate_partition")
        partition["assignments"][0]["states"] = ["current"]
        self._replace_artifact(bundle, "candidate_partition", partition)
        self._assert_rejects(bundle, events, "INCOMPLETE_SIMULTANEOUS_CLASSIFICATION")

    def test_owner_approval_requires_a_resolvable_product_owner_event(self) -> None:
        """Rejects self-attested owner fields without a trusted user event.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        events.pop("evt_owner_approval")
        self._assert_rejects(bundle, events, "FORGED_OWNER_APPROVAL")

    def test_owner_event_must_follow_completed_independent_review(self) -> None:
        """Rejects owner authorization recorded before reviewer completion.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        events["evt_owner_approval"]["created_ms"] = 99
        self._assert_rejects(bundle, events, "OWNER_ORDERING_INVALID")

    def test_owner_approval_binds_all_four_current_hashes(self) -> None:
        """Rejects stale candidate, partition, review, or predecessor bindings.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, owner = self._artifact(bundle, "owner_approval")
        owner["approved_hashes"]["candidate_partition"] = "0" * 64
        self._replace_artifact(bundle, "owner_approval", owner)
        self._assert_rejects(bundle, events, "OWNER_APPROVAL_HASH_MISMATCH")

    def test_accepted_outputs_cannot_exist_without_owner_approval(self) -> None:
        """Rejects accepted artifacts when the owner artifact is omitted.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        owner_path = bundle["artifact_paths"]["owner_approval"]
        bundle["artifact_bytes"].pop(owner_path)
        bundle["artifact_sha256"].pop(owner_path)
        bundle["artifact_commits"].pop(owner_path)
        self._assert_rejects(bundle, events, "OWNER_APPROVAL_REQUIRED")

    def test_accepted_artifacts_bind_exact_candidate_owner_review_and_partition_bytes(self) -> None:
        """Rejects a forged accepted manifest with stale candidate bytes.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        _, accepted = self._artifact(bundle, "accepted")
        accepted["candidate_sha256"] = "0" * 64
        self._replace_artifact(bundle, "accepted", accepted)
        self._assert_rejects(bundle, events, "ACCEPTED_BINDING_MISMATCH")

    def test_owner_authorization_event_is_single_use(self) -> None:
        """Accepts an owner event once and rejects its replay deterministically.

        Returns:
            Nothing.
        """
        bundle, events = self._fixture()
        resolver = MappingEventResolver(events)
        first = self._validate(bundle, events, resolver=resolver)
        self.assertTrue(
            first.get("ok"),
            f"first validation did not reach Green: {first}",
        )
        replay = self._validate(bundle, events, resolver=resolver)
        self.assertFalse(
            replay.get("ok"),
            f"replayed owner approval unexpectedly reached Green: {replay}",
        )
        self.assertEqual(
            replay.get("code"),
            "REPLAYED_OWNER_APPROVAL",
            f"replay validation returned the wrong rejection code: {replay}",
        )


if __name__ == "__main__":
    unittest.main()
