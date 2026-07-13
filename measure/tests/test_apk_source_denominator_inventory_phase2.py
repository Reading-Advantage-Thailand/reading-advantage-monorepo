"""Falsification contracts for APK denominator Phase-2 human discovery."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unittest
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = REPO_ROOT / "measure" / "tracks" / TRACK
FREEZE_PATH = TRACK_DIR / "phase0-input-freeze.json"
OWNERSHIP_PATH = TRACK_DIR / "phase0-role-ownership-manifest.json"
IDENTITY_PATH = TRACK_DIR / "game-identity-ledger.json"
PHASE1_HISTORICAL_PATH = TRACK_DIR / "historical-source-denominator.json"
PHASE1_DISCREPANCY_PATH = TRACK_DIR / "denominator-discrepancies.json"
REPORT_PATH = TRACK_DIR / "phase2-human-discovery-contract-test-report.json"
HUMAN_DISCOVERY_PATH = TRACK_DIR / "independent-human-discovery.json"
DUPLICATE_DRIFT_PATH = TRACK_DIR / "human-duplicate-drift-records.json"
HISTORICAL_PATH = TRACK_DIR / "human-historical-deleted-records.json"
DISCREPANCY_PATH = TRACK_DIR / "human-discrepancy-records.json"
EVIDENCE_RECEIPT_PATH = TRACK_DIR / "role-receipts" / "evidence-collector.json"
SHA256 = re.compile(r"^[0-9a-f]{64}$")
COMMIT_SHA = re.compile(r"^[0-9a-f]{40}$")
FORBIDDEN_INTERPRETATION_FIELDS = {
    "asset_suitability",
    "capability",
    "capability_conclusion",
    "conclusion",
    "design_intent",
    "gameplay_interpretation",
    "intent",
    "mechanic",
    "mechanics",
    "product_disposition",
    "recommendation",
    "responsive_strategy",
    "semantic_role",
    "suitability",
}


def _load_json(path: Path, *, phase2: bool = False) -> dict[str, Any]:
    """Loads one JSON contract object and identifies absent Phase-2 artifacts.

    Args:
        path: Artifact path to load.
        phase2: Whether the artifact is authored by the Phase-2 handoff.

    Returns:
        Parsed JSON object.

    Raises:
        AssertionError: If the artifact is missing or is not a JSON object.
    """
    if not path.is_file():
        phase = "Phase-2 human-discovery" if phase2 else "required"
        raise AssertionError(f"Missing {phase} artifact: {path.relative_to(REPO_ROOT)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path.relative_to(REPO_ROOT)} must contain a JSON object")
    return value


def _git_bytes(revision: str, path: str) -> bytes:
    """Reads committed bytes for an exact revision and repository-relative path.

    Args:
        revision: Commit containing the cited path.
        path: Repository-relative path to resolve.

    Returns:
        The committed file bytes.

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
    """Reports whether a cited historical revision is reachable from the baseline.

    Args:
        revision: Historical revision to validate.
        baseline: Frozen source revision that bounds historical work.

    Returns:
        Whether the revision is a reachable ancestor of the baseline.
    """
    result = subprocess.run(
        ["git", "merge-base", "--is-ancestor", revision, baseline],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    )
    return result.returncode == 0


def _locator_key(locator: dict[str, Any]) -> str:
    """Builds a deterministic identity for an exact source evidence locator.

    Args:
        locator: Validated locator to identify.

    Returns:
        A JSON representation suitable for set comparison.
    """
    return json.dumps(locator, sort_keys=True, separators=(",", ":"))


class Phase2IndependentHumanDiscoveryContracts(unittest.TestCase):
    """Rejects sampled, unpinned, merged, interpretive, or unresolved human review."""

    def setUp(self) -> None:
        """Loads frozen Phase-1 ledgers and the required Phase-2 discovery record.

        Returns:
            Nothing.
        """
        self.freeze = _load_json(FREEZE_PATH)
        self.ownership = _load_json(OWNERSHIP_PATH)
        self.ledger = _load_json(IDENTITY_PATH)
        self.phase1_historical = _load_json(PHASE1_HISTORICAL_PATH)
        self.phase1_discrepancies = _load_json(PHASE1_DISCREPANCY_PATH)
        self.human_discovery = _load_json(HUMAN_DISCOVERY_PATH, phase2=True)
        scope = self.freeze["source_scope"]
        self.assertIsInstance(scope, dict)
        assert isinstance(scope, dict)
        self.baseline = scope["current_revision"]
        self.assertIsInstance(self.baseline, str)
        assert isinstance(self.baseline, str)

    def _identity_ids(self) -> set[str]:
        """Returns the complete frozen Phase-1 canonical identity set.

        Returns:
            Canonical identities from the mechanical ledger.
        """
        records = self.ledger.get("identity_records")
        self.assertIsInstance(records, list)
        assert isinstance(records, list)
        identities = {record.get("canonical_identity_id") for record in records if isinstance(record, dict)}
        self.assertNotIn(None, identities)
        self.assertTrue(identities, "Phase-1 identity ledger cannot be empty")
        return {identity for identity in identities if isinstance(identity, str)}

    def _ledger_paths_for_identity(self, identity_id: str) -> set[str]:
        """Returns Phase-1 page-source paths associated with an identity.

        Args:
            identity_id: Canonical identity whose page paths are needed.

        Returns:
            Exact committed paths from the identity ledger.
        """
        records = self.ledger["identity_records"]
        assert isinstance(records, list)
        paths: set[str] = set()
        for record in records:
            if not isinstance(record, dict) or record.get("canonical_identity_id") != identity_id:
                continue
            for alias in record.get("aliases", []):
                if isinstance(alias, dict):
                    evidence = alias.get("evidence")
                    if isinstance(evidence, dict) and isinstance(evidence.get("path"), str):
                        paths.add(evidence["path"])
        self.assertTrue(paths, f"Phase-1 ledger must contain page evidence for {identity_id}")
        return paths

    def _assert_locator(self, locator: object, *, historical: bool = False) -> dict[str, Any]:
        """Validates a committed exact path, revision, blob, and inclusive range hash.

        Args:
            locator: Candidate evidence locator.
            historical: Whether an ancestor revision is allowed.

        Returns:
            The validated locator.
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
        if historical:
            self.assertTrue(_is_ancestor(revision, self.baseline), "historical revision must be reachable")
        else:
            self.assertEqual(revision, self.baseline, "current evidence must use the frozen baseline")
        blob = _git_bytes(revision, path)
        self.assertIsInstance(locator.get("blob_sha256"), str)
        self.assertRegex(str(locator.get("blob_sha256")), SHA256)
        self.assertEqual(locator["blob_sha256"], hashlib.sha256(blob).hexdigest())
        cited_range = locator.get("range")
        self.assertIsInstance(cited_range, dict)
        assert isinstance(cited_range, dict)
        start_line = cited_range.get("start_line")
        end_line = cited_range.get("end_line")
        self.assertIsInstance(start_line, int)
        self.assertIsInstance(end_line, int)
        assert isinstance(start_line, int) and isinstance(end_line, int)
        lines = blob.splitlines(keepends=True)
        self.assertGreaterEqual(start_line, 1)
        self.assertGreaterEqual(end_line, start_line)
        self.assertLessEqual(end_line, len(lines))
        self.assertIsInstance(cited_range.get("sha256"), str)
        self.assertRegex(str(cited_range.get("sha256")), SHA256)
        self.assertEqual(
            cited_range["sha256"],
            hashlib.sha256(b"".join(lines[start_line - 1 : end_line])).hexdigest(),
        )
        return locator

    def _assert_no_interpretation_fields(self, value: object, location: str = "$") -> None:
        """Rejects semantic or product conclusions anywhere in a Phase-2 record.

        Args:
            value: JSON value to inspect recursively.
            location: JSON path used in a failure message.

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

    def test_red_report_is_nonfactual_and_names_the_phase2_gate(self) -> None:
        """Keeps the Phase-2 test report distinct from human discovery evidence.

        Returns:
            Nothing.
        """
        report = _load_json(REPORT_PATH)
        self.assertEqual(report.get("schema_version"), "apk-denominator-phase2-human-discovery-contract-report.v1")
        self.assertEqual(report.get("status"), "red-contract-authored")
        self.assertEqual(report.get("source_baseline_revision"), self.baseline)
        self.assertEqual(report.get("red_command"), report.get("green_command"))
        self.assertIn("test_apk_source_denominator_inventory_phase2", str(report.get("red_command")))
        self.assertNotIn("accepted", str(report.get("status")).lower())

    def test_every_phase1_identity_is_reviewed_once_in_explicit_batches_of_three_or_fewer(self) -> None:
        """Requires exhaustive accepted identity coverage rather than a sampled review.

        Returns:
            Nothing.
        """
        self.assertEqual(self.human_discovery.get("schema_version"), "apk-denominator-independent-human-discovery.v1")
        self.assertEqual(self.human_discovery.get("status"), "independent-human-discovery-complete")
        self.assertEqual(self.human_discovery.get("source_baseline_revision"), self.baseline)
        batches = self.human_discovery.get("review_batches")
        self.assertIsInstance(batches, list)
        assert isinstance(batches, list)
        batch_ids: set[str] = set()
        reviewed: list[str] = []
        for batch in batches:
            self.assertIsInstance(batch, dict)
            assert isinstance(batch, dict)
            batch_id = batch.get("batch_id")
            self.assertIsInstance(batch_id, str)
            assert isinstance(batch_id, str)
            self.assertTrue(batch_id)
            self.assertNotIn(batch_id, batch_ids)
            batch_ids.add(batch_id)
            self.assertEqual(batch.get("status"), "accepted")
            identities = batch.get("accepted_identity_ids")
            self.assertIsInstance(identities, list)
            assert isinstance(identities, list)
            self.assertGreaterEqual(len(identities), 1)
            self.assertLessEqual(len(identities), 3, "human review batches may contain no more than three identities")
            self.assertTrue(all(isinstance(identity, str) and identity for identity in identities))
            reviewed.extend(identities)
        self.assertEqual(set(reviewed), self._identity_ids(), "every Phase-1 identity must be reviewed")
        self.assertEqual(len(reviewed), len(set(reviewed)), "an accepted identity may not be silently reviewed twice")

    def test_raw_current_source_claims_are_pinned_and_exhaustive(self) -> None:
        """Requires exact raw-source evidence and method for every accepted identity.

        Returns:
            Nothing.
        """
        batches = self.human_discovery["review_batches"]
        assert isinstance(batches, list)
        accepted_by_batch = {
            batch["batch_id"]: set(batch["accepted_identity_ids"])
            for batch in batches
            if isinstance(batch, dict)
        }
        claims = self.human_discovery.get("current_source_claims")
        self.assertIsInstance(claims, list)
        assert isinstance(claims, list)
        claim_ids: set[str] = set()
        covered: set[str] = set()
        for claim in claims:
            self.assertIsInstance(claim, dict)
            assert isinstance(claim, dict)
            claim_id = claim.get("claim_id")
            identity_id = claim.get("canonical_identity_id")
            batch_id = claim.get("batch_id")
            self.assertIsInstance(claim_id, str)
            self.assertIsInstance(identity_id, str)
            self.assertIsInstance(batch_id, str)
            assert isinstance(claim_id, str) and isinstance(identity_id, str) and isinstance(batch_id, str)
            self.assertTrue(claim_id)
            self.assertNotIn(claim_id, claim_ids)
            claim_ids.add(claim_id)
            self.assertIn(identity_id, self._identity_ids())
            self.assertIn(batch_id, accepted_by_batch)
            self.assertIn(identity_id, accepted_by_batch[batch_id])
            self.assertEqual(claim.get("method"), "human-raw-source-review")
            self.assertEqual(claim.get("claim_kind"), "current-source")
            evidence = self._assert_locator(claim.get("evidence"))
            self.assertIn(evidence["path"], self._ledger_paths_for_identity(identity_id))
            covered.add(identity_id)
        self.assertEqual(covered, self._identity_ids(), "every accepted identity needs a raw current-source claim")

    def test_reading_and_primary_duplicate_drift_records_cover_every_identity_without_merging(self) -> None:
        """Requires distinct Reading and Primary observations for every ledger identity.

        Returns:
            Nothing.
        """
        records = _load_json(DUPLICATE_DRIFT_PATH, phase2=True)
        self.assertEqual(records.get("schema_version"), "apk-denominator-human-duplicate-drift.v1")
        self.assertEqual(records.get("status"), "independent-human-discovery-complete")
        self.assertEqual(records.get("source_baseline_revision"), self.baseline)
        rows = records.get("duplicate_drift_records")
        self.assertIsInstance(rows, list)
        assert isinstance(rows, list)
        keys: set[tuple[str, str]] = set()
        for row in rows:
            self.assertIsInstance(row, dict)
            assert isinstance(row, dict)
            identity_id = row.get("canonical_identity_id")
            source_family = row.get("source_family")
            self.assertIsInstance(identity_id, str)
            self.assertIn(identity_id, self._identity_ids())
            self.assertIn(source_family, {"reading", "primary"})
            assert isinstance(identity_id, str) and isinstance(source_family, str)
            key = (identity_id, source_family)
            self.assertNotIn(key, keys, "Reading and Primary records cannot be silently merged")
            keys.add(key)
            self.assertEqual(row.get("method"), "human-raw-source-review")
            self.assertIn(row.get("observation_status"), {"duplicate-observed", "drift-observed", "not-observed"})
            evidence = row.get("evidence")
            self.assertIsInstance(evidence, list)
            assert isinstance(evidence, list)
            self.assertTrue(evidence, "a duplicate/drift observation requires raw-source evidence")
            for locator in evidence:
                self._assert_locator(locator)
        expected = {(identity_id, family) for identity_id in self._identity_ids() for family in ("reading", "primary")}
        self.assertEqual(keys, expected, "Reading and Primary review must be exhaustive, not sampled")

    def test_reachable_historical_and_deleted_records_match_every_phase1_locator(self) -> None:
        """Requires every Phase-1 historical/deleted locator to receive human review.

        Returns:
            Nothing.
        """
        records = _load_json(HISTORICAL_PATH, phase2=True)
        self.assertEqual(records.get("schema_version"), "apk-denominator-human-historical-deleted.v1")
        self.assertEqual(records.get("status"), "independent-human-discovery-complete")
        self.assertEqual(records.get("source_baseline_revision"), self.baseline)
        phase1_rows = self.phase1_historical.get("records")
        self.assertIsInstance(phase1_rows, list)
        assert isinstance(phase1_rows, list)
        expected = {
            _locator_key(row["evidence"])
            for row in phase1_rows
            if isinstance(row, dict) and row.get("classification") in {"historical", "deleted", "withdrawn"}
        }
        rows = records.get("historical_deleted_records")
        self.assertIsInstance(rows, list)
        assert isinstance(rows, list)
        actual: set[str] = set()
        for row in rows:
            self.assertIsInstance(row, dict)
            assert isinstance(row, dict)
            self.assertIsInstance(row.get("record_id"), str)
            self.assertEqual(row.get("method"), "human-history-review")
            self.assertIn(row.get("source_classification"), {"historical", "deleted", "withdrawn"})
            locator = self._assert_locator(row.get("evidence"), historical=True)
            key = _locator_key(locator)
            self.assertNotIn(key, actual, "historical records may not be double counted")
            actual.add(key)
        self.assertEqual(actual, expected, "all Phase-1 historical/deleted locators require exact human review")

    def test_evidence_collector_receipt_is_separate_and_attests_its_outputs(self) -> None:
        """Requires an evidence-collector receipt distinct from the human review data.

        Returns:
            Nothing.
        """
        receipt = _load_json(EVIDENCE_RECEIPT_PATH, phase2=True)
        self.assertEqual(receipt.get("schema_version"), self.ownership["receipt_contract"]["schema_version"])
        self.assertEqual(receipt.get("role"), "evidence-collector")
        self.assertEqual(receipt.get("phase"), "Phase 2: Independent human discovery")
        self.assertEqual(receipt.get("source_baseline_revision"), self.baseline)
        required = self.ownership["receipt_contract"]["required_provenance"]
        self.assertIsInstance(required, list)
        assert isinstance(required, list)
        digest_fields = {"prompt_sha256", "final_response_sha256", "output_sha256", "budget_declaration_sha256"}
        unavailable_platform_fields = {
            "spawn_id",
            "parent_ancestry_ids",
            "actual_context_manifest_sha256",
            "start_event_id",
            "end_event_id",
        }
        for field in required:
            self.assertIn(field, receipt)
            if field in unavailable_platform_fields and receipt[field] is None:
                limitation = receipt.get(f"{field}_limitation")
                self.assertIsInstance(limitation, str)
                self.assertTrue(limitation)
            elif field == "parent_ancestry_ids":
                self.assertIsInstance(receipt[field], list)
                self.assertTrue(all(isinstance(value, str) and value for value in receipt[field]))
            elif field == "commit_sha":
                self.assertIsInstance(receipt[field], str)
                self.assertRegex(receipt[field], COMMIT_SHA)
            elif field in digest_fields:
                self.assertIsInstance(receipt[field], str)
                self.assertRegex(receipt[field], SHA256)
            else:
                self.assertIsInstance(receipt[field], str)
                self.assertTrue(receipt[field])
        outputs = receipt.get("output_paths")
        self.assertIsInstance(outputs, list)
        assert isinstance(outputs, list)
        self.assertIn(str(DUPLICATE_DRIFT_PATH.relative_to(REPO_ROOT)), outputs)
        self.assertIn(str(HISTORICAL_PATH.relative_to(REPO_ROOT)), outputs)
        self.assertNotIn(str(HUMAN_DISCOVERY_PATH.relative_to(REPO_ROOT)), outputs)

    def test_discrepancies_cover_phase1_observations_and_fail_closed_without_interpretation(self) -> None:
        """Blocks advancement for omitted, unresolved, or interpretive comparison records.

        Returns:
            Nothing.
        """
        discrepancies = _load_json(DISCREPANCY_PATH, phase2=True)
        self.assertEqual(discrepancies.get("schema_version"), "apk-denominator-human-discrepancies.v1")
        self.assertEqual(discrepancies.get("status"), "independent-human-discovery-complete")
        self.assertEqual(discrepancies.get("source_baseline_revision"), self.baseline)
        identity_rows = discrepancies.get("identity_comparison_records")
        self.assertIsInstance(identity_rows, list)
        assert isinstance(identity_rows, list)
        seen_identities: set[str] = set()
        for row in identity_rows:
            self.assertIsInstance(row, dict)
            assert isinstance(row, dict)
            identity_id = row.get("canonical_identity_id")
            self.assertIsInstance(identity_id, str)
            assert isinstance(identity_id, str)
            self.assertNotIn(identity_id, seen_identities)
            seen_identities.add(identity_id)
            self.assertIn(row.get("comparison_status"), {"no-discrepancy", "resolved"})
            self.assertFalse(row.get("blocking"), "unresolved discrepancies must block Phase 2")
        self.assertEqual(seen_identities, self._identity_ids())

        phase1_rows = self.phase1_discrepancies.get("records")
        self.assertIsInstance(phase1_rows, list)
        assert isinstance(phase1_rows, list)
        expected_observations = {
            row.get("observation_id") for row in phase1_rows if isinstance(row, dict) and isinstance(row.get("observation_id"), str)
        }
        observation_rows = discrepancies.get("mechanical_observation_records")
        self.assertIsInstance(observation_rows, list)
        assert isinstance(observation_rows, list)
        seen_observations: set[str] = set()
        for row in observation_rows:
            self.assertIsInstance(row, dict)
            assert isinstance(row, dict)
            observation_id = row.get("observation_id")
            self.assertIsInstance(observation_id, str)
            assert isinstance(observation_id, str)
            self.assertNotIn(observation_id, seen_observations)
            seen_observations.add(observation_id)
            self.assertIn(row.get("comparison_status"), {"no-discrepancy", "resolved"})
            self.assertFalse(row.get("blocking"), "unresolved discrepancies must block Phase 2")
        self.assertEqual(seen_observations, expected_observations)

        for artifact in (self.human_discovery, discrepancies):
            self._assert_no_interpretation_fields(artifact)


if __name__ == "__main__":
    unittest.main()
