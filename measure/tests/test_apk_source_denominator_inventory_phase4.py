"""Falsification contracts for APK denominator Phase-4 independent acceptance."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any


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


if __name__ == "__main__":
    unittest.main()
