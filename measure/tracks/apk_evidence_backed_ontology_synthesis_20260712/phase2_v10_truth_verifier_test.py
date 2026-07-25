"""No-mock file-backed tests for Phase 2 v10 authority ordering and manifest truth."""

import copy
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest

import phase2_v10_truth_verifier as verifier
import phase2_v9_truth_verifier as v9
import phase2_v9_truth_verifier_test as v9_tests

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


def _write(path: Path, value: dict) -> None:
    """Writes deterministic JSON to a temporary candidate path."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def _remove(path: Path) -> None:
    """Removes a temporary file when present."""
    if path.is_file():
        path.unlink()


def _isolated_root() -> tempfile.TemporaryDirectory:
    """Copies the track into one reusable temporary file-backed root."""
    directory = tempfile.TemporaryDirectory()
    root = Path(directory.name)
    shutil.copytree(TRACK_ROOT, root, dirs_exist_ok=True)
    directory.track_root = root
    _reset(root)
    return directory


def _reset(root: Path) -> None:
    """Restores v10 truth fixtures and removes candidate/runtime authority files."""
    for relative in (
        verifier.FIXTURE_MANIFEST,
        "negative-fixtures/phase2-v10/end-to-end-attacks.json",
    ):
        destination = root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(TRACK_ROOT / relative, destination)
    for relative in (
        *verifier.MAPPER_OUTPUTS,
        verifier.MAPPER_RECEIPT,
        verifier.REVIEW_OUTPUT,
        verifier.REVIEW_RECEIPT,
        verifier.ROOT_SEAL,
        verifier.MAPPER_RELEASE,
        "negative-fixtures/phase2-v10/duplicate-valid.json",
    ):
        _remove(root / relative)
    for relative in (
        "phase2-v10-red-report.json",
        "role-receipts/phase2/truth-test-author-v10.json",
    ):
        source = TRACK_ROOT / relative
        destination = root / relative
        if source.is_file():
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
        else:
            _remove(destination)


def _install_authority(root: Path) -> tuple[str, str]:
    """Publishes a temporary v10 seal and externally hashed mapper release."""
    for relative in (
        "phase2-v10-red-report.json",
        "role-receipts/phase2/truth-test-author-v10.json",
    ):
        if not (root / relative).is_file():
            _write(root / relative, {"temporary_file_backed_truth_fixture": relative})
    manifest = json.loads((root / verifier.FIXTURE_MANIFEST).read_text())
    truth_paths = (
        *verifier.BASE_TRUTH_PATHS,
        *(row["path"] for row in manifest["fixtures"]),
    )
    hashes = {relative: v9._sha(root / relative) for relative in truth_paths}
    seal = {
        "schema_version": "apk-t9-phase2-root-truth-seal.v10",
        "track_id": verifier.TRACK_ID,
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "status": "sealed-red-v10",
        "pins": hashes,
    }
    _write(root / verifier.ROOT_SEAL, seal)
    seal_sha = v9._sha(root / verifier.ROOT_SEAL)
    release = {
        "schema_version": "apk-t9-phase2-mapper-release.v10",
        "track_id": verifier.TRACK_ID,
        "status": "released-for-mapper-v5",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal": {
            "path": verifier.ROOT_SEAL,
            "sha256": seal_sha,
        },
        "truth_artifacts": hashes,
    }
    _write(root / verifier.MAPPER_RELEASE, release)
    return seal_sha, v9._sha(root / verifier.MAPPER_RELEASE)


def _publish_candidate(root: Path, bundle: dict[str, dict]) -> str:
    """Writes candidate outputs and an exact v10 mapper receipt."""
    for relative, value in bundle.items():
        _write(root / relative, value)
    seal_sha, release_sha = _install_authority(root)
    receipt = {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-curated-evidence-mapper-v5-v10",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal_sha256": seal_sha,
        "root_mapper_release_sha256": release_sha,
        "output_hashes": {
            path: v9._sha(root / path) for path in verifier.MAPPER_OUTPUTS
        },
        "status": "candidate",
    }
    _write(root / verifier.MAPPER_RECEIPT, receipt)
    return release_sha


def _publish_review(
    root: Path, bundle: dict, release_sha: str, *, reject: bool
) -> None:
    """Writes exhaustive v10 review evidence and its exact receipt."""
    review = v9_tests._review_projection(bundle, reject)
    mapper_hashes = {
        path: v9._sha(root / path) for path in verifier.MAPPER_OUTPUTS
    }
    review["mapper_output_hashes"] = mapper_hashes
    _write(root / verifier.REVIEW_OUTPUT, review)
    receipt = {
        "agent_ref": "/root/phase5_review_b",
        "owner_role": "capability-reviewer",
        "task_id": "phase2-curated-evidence-review-v10",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal_sha256": v9._sha(root / verifier.ROOT_SEAL),
        "root_mapper_release_sha256": release_sha,
        "review_artifact_sha256": v9._sha(root / verifier.REVIEW_OUTPUT),
        "mapper_output_hashes": mapper_hashes,
        "status": "rejected" if reject else "accepted",
    }
    _write(root / verifier.REVIEW_RECEIPT, receipt)


def _result(root: Path, expected: str | None = None) -> verifier.VerificationResult:
    """Calls the public v10 file-backed verifier."""
    return verifier.verify_phase2(REPO_ROOT, root, expected)


class Phase2V10TruthVerifierTest(unittest.TestCase):
    """Exercises v10 authority, manifest, and inherited attacks."""

    @classmethod
    def setUpClass(cls) -> None:
        """Loads inherited accepted inputs once."""
        findings = []
        cls.inputs, cls.registry, _ = verifier._verify_inputs(TRACK_ROOT, findings)
        if findings:
            raise AssertionError(findings)

    def test_authority_order_and_complete_manifest_attacks(self) -> None:
        """Proves authority order and every required manifest failure."""
        with _isolated_root() as temp:
            root = Path(temp)
            result = _result(root)
            self.assertEqual(result.state, "RED_WAITING_FOR_ROOT_V10_AUTHORITY")
            self.assertEqual(
                {row.code for row in result.findings},
                {"ROOT_V10_AUTHORITY_MISSING"},
            )

            _, release = _install_authority(root)
            result = _result(root)
            self.assertEqual(result.state, "INVALID")
            self.assertEqual(
                {row.code for row in result.findings},
                {"EXPECTED_MAPPER_RELEASE_REQUIRED"},
            )
            result = _result(root, "0" * 64)
            self.assertEqual(result.state, "INVALID")
            self.assertEqual(
                {row.code for row in result.findings},
                {"MAPPER_RELEASE_MISMATCH"},
            )
            result = _result(root, release)
            self.assertEqual(result.state, "RED_WAITING_FOR_MAPPER_V5_OUTPUTS")
            self.assertEqual(
                {row.code for row in result.findings},
                {"PHASE2_MAPPER_V5_OUTPUTS_MISSING"},
            )

            base_manifest = json.loads((root / verifier.FIXTURE_MANIFEST).read_text())
            base_fixture = json.loads(
                (root / base_manifest["fixtures"][0]["path"]).read_text()
            )

            def manifest_probe(manifest: dict, expected_codes: set[str]) -> None:
                _write(root / verifier.FIXTURE_MANIFEST, manifest)
                result = _result(root)
                self.assertTrue(
                    expected_codes.issubset({row.code for row in result.findings}),
                    result,
                )
                _write(root / verifier.FIXTURE_MANIFEST, base_manifest)

            mutated = copy.deepcopy(base_manifest)
            mutated["extra"] = True
            manifest_probe(mutated, {"INVALID_FIXTURE_MANIFEST"})
            mutated = copy.deepcopy(base_manifest)
            mutated["track_id"] = "wrong"
            manifest_probe(mutated, {"INVALID_FIXTURE_MANIFEST"})
            mutated = copy.deepcopy(base_manifest)
            mutated["dispatch_sha256"] = "0" * 64
            manifest_probe(mutated, {"INVALID_FIXTURE_MANIFEST"})
            mutated = copy.deepcopy(base_manifest)
            duplicate = copy.deepcopy(mutated["fixtures"][0])
            duplicate["path"] = "negative-fixtures/phase2-v10/duplicate-valid.json"
            _write(root / duplicate["path"], base_fixture)
            duplicate["sha256"] = v9._sha(root / duplicate["path"])
            mutated["fixtures"].append(duplicate)
            mutated["fixture_count"] = 2
            mutated["case_count"] = 48
            manifest_probe(mutated, {"DUPLICATE_FIXTURE_ID"})
            mutated = copy.deepcopy(base_manifest)
            duplicate = copy.deepcopy(mutated["fixtures"][0])
            duplicate["id"] = "second-id"
            mutated["fixtures"].append(duplicate)
            mutated["fixture_count"] = 2
            mutated["case_count"] = 48
            manifest_probe(mutated, {"DUPLICATE_FIXTURE_PATH"})
            mutated = copy.deepcopy(base_manifest)
            mutated["fixtures"][0]["case_count"] = 23
            manifest_probe(
                mutated,
                {"FIXTURE_CASE_COUNT_MISMATCH", "TOP_CASE_COUNT_MISMATCH"},
            )
            mutated = copy.deepcopy(base_manifest)
            mutated["case_count"] = 23
            manifest_probe(mutated, {"TOP_CASE_COUNT_MISMATCH"})

            fixture_path = root / base_manifest["fixtures"][0]["path"]
            for key, value in (
                ("schema_version", "wrong"),
                ("track_id", "wrong"),
            ):
                fixture = copy.deepcopy(base_fixture)
                fixture[key] = value
                _write(fixture_path, fixture)
                mutated = copy.deepcopy(base_manifest)
                mutated["fixtures"][0]["sha256"] = v9._sha(fixture_path)
                manifest_probe(mutated, {"INVALID_FIXTURE_SCHEMA"})
                _write(fixture_path, base_fixture)

    def test_all_v9_attacks_run_through_v10_public_entrypoint(self) -> None:
        """Runs inherited lifecycle, v4, and 48-context attacks through v10."""
        started = time.monotonic()
        context_ids = {row["record_id"] for row in self.registry["records"]}
        v4_ids = [
            record_id
            for record_id in v9_tests._v4_record_ids(self.inputs)
            if record_id not in context_ids
        ]
        with _isolated_root() as temp:
            root = Path(temp)

            bundle = v9_tests._zero_bundle(self.inputs)
            release = _publish_candidate(root, bundle)
            self.assertEqual(
                _result(root, release).state,
                "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW",
            )

            receipt = json.loads((root / verifier.MAPPER_RECEIPT).read_text())
            del receipt["status"]
            _write(root / verifier.MAPPER_RECEIPT, receipt)
            self.assertIn("INVALID_SCHEMA", {row.code for row in _result(root, release).findings})

            release = _publish_candidate(root, bundle)
            curated = json.loads((root / verifier.MAPPER_OUTPUTS[0]).read_text())
            curated["audit_method"] = "tampered"
            _write(root / verifier.MAPPER_OUTPUTS[0], curated)
            self.assertIn("TAMPERED_OUTPUT", {row.code for row in _result(root, release).findings})

            release = _publish_candidate(root, bundle)
            (root / "phase2-v10-red-report.json").write_text('{"drift":true}\n')
            self.assertIn("LIVE_TRUTH_DRIFT", {row.code for row in _result(root, release).findings})
            _reset(root)

            for registry_row in self.registry["records"]:
                bundle = v9_tests._zero_bundle(self.inputs)
                target = next(
                    row for row in bundle[verifier.MAPPER_OUTPUTS[0]]["records"]
                    if row["record_id"] == registry_row["record_id"]
                )
                target["primary_disposition"] = "curated-capability-evidence"
                target["context_rationale"] = None
                target["audit"]["disposition_basis"] = "selected-complete-behavioral-anchors"
                release = _publish_candidate(root, bundle)
                self.assertIn(
                    "CONTEXT_COUNTEREXAMPLE_PROMOTED",
                    {row.code for row in _result(root, release).findings},
                    registry_row["record_id"],
                )

            bundle = v9_tests._zero_bundle(self.inputs)
            row = next(
                row for row in bundle[verifier.MAPPER_OUTPUTS[0]]["records"]
                if row["record_id"] == "rune-match:RM-CONTENT-001"
            )
            row["record_id"] = "rune-match:RM-CONT-001"
            release = _publish_candidate(root, bundle)
            self.assertIn("CURATED_ACCOUNTING_MISMATCH", {row.code for row in _result(root, release).findings})

            bundle = v9_tests._zero_bundle(self.inputs)
            use = v9_tests._promote(
                bundle, self.inputs, v4_ids[0], "scene-use", "scene-cap"
            )
            use["scene_id"] = "invented"
            release = _publish_candidate(root, bundle)
            self.assertIn("SCENE_STATE_MISMATCH", {row.code for row in _result(root, release).findings})

            bundle = v9_tests._zero_bundle(self.inputs)
            v9_tests._promote(
                bundle, self.inputs, v4_ids[0], "cross-use", "missing-capability"
            )
            release = _publish_candidate(root, bundle)
            self.assertIn("UNKNOWN_CAPABILITY_ID", {row.code for row in _result(root, release).findings})

            bundle = v9_tests._zero_bundle(self.inputs)
            all_v4 = v9_tests._v4_record_ids(self.inputs)
            for number, record_id in enumerate(all_v4[:271]):
                v9_tests._promote(
                    bundle,
                    self.inputs,
                    record_id,
                    f"v4-full-{number}",
                    "v4-generated",
                )
            v9_tests._sync_game_dispositions(bundle)
            release = _publish_candidate(root, bundle)
            self.assertIn("CURATED_USE_BUDGET_EXCEEDED", {row.code for row in _result(root, release).findings})

            bundle = v9_tests._zero_bundle(self.inputs)
            v9_tests._make_structurally_valid_v4_slice(bundle, self.inputs)
            release = _publish_candidate(root, bundle)
            self.assertEqual(
                _result(root, release).state,
                "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW",
            )
            _publish_review(root, bundle, release, reject=True)
            result = _result(root, release)
            self.assertEqual(result.state, "REVIEW_REJECTED")
            self.assertIn("SEMANTIC_REVIEW_REJECTED", {row.code for row in result.findings})
            review = json.loads((root / verifier.REVIEW_OUTPUT).read_text())
            review["finding_reviews"][0]["evidence_refs"][0]["dimension"] = "fabricated"
            _write(root / verifier.REVIEW_OUTPUT, review)
            reviewer_receipt = json.loads((root / verifier.REVIEW_RECEIPT).read_text())
            reviewer_receipt["review_artifact_sha256"] = v9._sha(root / verifier.REVIEW_OUTPUT)
            _write(root / verifier.REVIEW_RECEIPT, reviewer_receipt)
            self.assertIn(
                "UNRESOLVED_REVIEW_EVIDENCE_REF",
                {row.code for row in _result(root, release).findings},
            )
        self.assertLess(time.monotonic() - started, 30)


if __name__ == "__main__":
    unittest.main()
