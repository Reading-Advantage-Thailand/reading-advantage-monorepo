"""No-mock file-backed tests for Phase 2 v13 contradictory accepted evidence."""

import copy
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest

import phase2_v13_truth_verifier as verifier
import phase2_v11_truth_verifier_test as v11_tests
import phase2_v9_truth_verifier as v9
import phase2_v9_truth_verifier_test as v9_tests

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


def _write(path: Path, value: dict, *, compact: bool = False) -> None:
    """Writes deterministic JSON to a temporary file-backed candidate."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        text = json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n"
    else:
        text = json.dumps(value, indent=2, sort_keys=True) + "\n"
    path.write_text(text)


def _remove(path: Path) -> None:
    """Removes a temporary file when present."""
    if path.is_file():
        path.unlink()


def _reset(root: Path) -> None:
    """Restores v13 truth bytes and removes runtime authority and candidates."""
    manifest = json.loads((TRACK_ROOT / verifier.FIXTURE_MANIFEST).read_text())
    for relative in (
        verifier.FIXTURE_MANIFEST,
        *(row["path"] for row in manifest["fixtures"]),
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
    ):
        _remove(root / relative)


def _rules() -> dict[str, dict]:
    """Returns the exact sealed contradiction registry keyed by record ID."""
    dispatch = json.loads((TRACK_ROOT / verifier.DISPATCH_PATH).read_text())
    return {row["record_id"]: row for row in dispatch["known_contradiction_registry"]}


def _v13_bundle(inputs: dict) -> dict[str, dict]:
    """Builds one valid v4 candidate with exactly two contradiction quarantines."""
    bundle = v11_tests._v11_bundle(inputs)
    curated = bundle[v9.MAPPER_OUTPUTS[0]]
    curated["schema_version"] = "apk-t9-phase2-curated-capability-evidence.v4"
    for row in curated["records"]:
        row["audit"].update(
            contradiction_kind=None,
            contradiction_resolution=None,
            conflict_evidence_refs=[],
            conflict_provenance_refs=[],
        )
    taxonomy_ids = {
        entry["taxonomy_id"]
        for entry in bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"]
    }
    for record_id, rule in _rules().items():
        row = next(item for item in curated["records"] if item["record_id"] == record_id)
        excerpts = [
            ref["exact_excerpt"]
            for ref in (
                *rule["required_basis_evidence_refs_exact"],
                *rule["required_conflict_evidence_refs_exact"],
            )
        ]
        row.update(
            primary_disposition="non-capability-context",
            capability_uses=[],
            context_rationale=(
                f"{row['claim_id']} uses contradictory-accepted-evidence with "
                f"{rule['conflict_kind']} and {rule['resolution']}; exact conflicts are "
                + " | ".join(excerpts)
            ),
            audit={
                "review_method": "field-by-field-counterfactual",
                "reviewed_field_ids": row["audit"]["reviewed_field_ids"],
                "fact_category": rule["required_fact_category"],
                "disposition_basis": "contradictory-accepted-evidence",
                "basis_evidence_refs": copy.deepcopy(rule["required_basis_evidence_refs_exact"]),
                "evaluated_taxonomy_ids": [],
                "not_applicable_taxonomy_ids": sorted(taxonomy_ids),
                "redundant_to_use_ids": [],
                "incompatibility_evidence_refs": [],
                "contradiction_kind": rule["conflict_kind"],
                "contradiction_resolution": rule["resolution"],
                "conflict_evidence_refs": copy.deepcopy(rule["required_conflict_evidence_refs_exact"]),
                "conflict_provenance_refs": copy.deepcopy(rule["required_conflict_provenance_refs_exact"]),
            },
        )
    return bundle


def _install_authority(root: Path) -> tuple[str, str]:
    """Publishes a temporary v13 seal and externally hashed mapper release."""
    for relative in (
        "phase2-v13-red-report.json",
        "role-receipts/phase2/truth-test-author-v13.json",
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
        "schema_version": "apk-t9-phase2-root-truth-seal.v13",
        "track_id": verifier.TRACK_ID,
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "status": "sealed-red-v13",
        "pins": hashes,
    }
    _write(root / verifier.ROOT_SEAL, seal)
    seal_sha = v9._sha(root / verifier.ROOT_SEAL)
    release = {
        "schema_version": "apk-t9-phase2-mapper-release.v13",
        "track_id": verifier.TRACK_ID,
        "status": "released-for-mapper-v5",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal": {"path": verifier.ROOT_SEAL, "sha256": seal_sha},
        "truth_artifacts": hashes,
    }
    _write(root / verifier.MAPPER_RELEASE, release)
    return seal_sha, v9._sha(root / verifier.MAPPER_RELEASE)


def _publish_candidate(root: Path, bundle: dict[str, dict]) -> str:
    """Writes six mapper outputs and an exact v13 mapper receipt."""
    for relative, value in bundle.items():
        _write(root / relative, value, compact=True)
    seal_sha, release_sha = _install_authority(root)
    _write(root / verifier.MAPPER_RECEIPT, {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-curated-evidence-mapper-v5-v13",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal_sha256": seal_sha,
        "root_mapper_release_sha256": release_sha,
        "output_hashes": {path: v9._sha(root / path) for path in verifier.MAPPER_OUTPUTS},
        "status": "candidate",
    })
    return release_sha


def _publish_review(root: Path, bundle: dict, release_sha: str) -> None:
    """Writes native exhaustive v13 review evidence and its exact receipt."""
    review = v9_tests._review_projection(bundle, False)
    review["schema_version"] = "apk-t9-phase2-independent-review.v13"
    review["mapper_output_hashes"] = {
        path: v9._sha(root / path) for path in verifier.MAPPER_OUTPUTS
    }
    review["taxonomy_reviews"] = [{
        "taxonomy_id": entry["taxonomy_id"],
        "reviewed_object_sha256": v9._digest(entry),
        "verdicts": {
            "completeness_against_all_records": "accept",
            "atomic_dimension": "accept",
            "selected_or_rejected_status": "accept",
            "cross_game_sufficiency": "accept",
            "bespoke_incompatibility_evidence": "accept",
        },
        "rationale": f"Canonical taxonomy {entry['taxonomy_id']} atomic dimension {entry['atomic_dimension']} was checked against every record and exact evidence.",
        "evidence_refs": [{
            "type": "taxonomy-projection",
            "taxonomy_id": entry["taxonomy_id"],
            "candidate_record_ids": entry["candidate_record_ids"],
            "evidence_refs_sha256": v9._digest(entry["evidence_refs"]),
            "counterpart_record_ids": entry["cross_game_counterpart_record_ids"],
            "incompatibility_refs_sha256": v9._digest(entry["incompatibility_evidence_refs"]),
        }],
    } for entry in bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"]]
    rules = _rules()
    records = {row["record_id"]: row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"]}
    for row in review["record_reviews"]:
        inherited = row["verdicts"]
        row["verdicts"] = {
            "accepted_fact_category": "accept",
            "basis_evidence_refs_and_anchor_completeness": inherited["anchor_completeness"],
            "primary_disposition": inherited["primary_disposition"],
            "disposition_basis": "accept",
            "evaluated_and_not_applicable_taxonomy_partition": "accept",
            "redundant_use_or_incompatibility_joins": "accept",
            "context_rationale_or_selected_uses": inherited["context_rationale_or_selected_uses"],
            "automatic_versus_individual_decision": inherited["automatic_versus_individual_decision"],
            "contradiction_kind": "accept",
            "contradiction_provenance": "accept",
            "contradiction_resolution": "accept",
            "quarantine_verdict": "accept",
        }
        record = records[row["record_id"]]
        if row["record_id"] in rules:
            audit = record["audit"]
            row["evidence_refs"].append({
                "type": "contradiction-projection",
                "record_id": row["record_id"],
                "conflict_kind": audit["contradiction_kind"],
                "contradiction_resolution": audit["contradiction_resolution"],
                "conflict_evidence_refs_sha256": v9._digest(audit["conflict_evidence_refs"]),
                "conflict_provenance_refs_sha256": v9._digest(audit["conflict_provenance_refs"]),
                "audit_sha256": v9._digest(audit),
            })
    _write(root / verifier.REVIEW_OUTPUT, review, compact=True)
    hashes = {path: v9._sha(root / path) for path in verifier.MAPPER_OUTPUTS}
    _write(root / verifier.REVIEW_RECEIPT, {
        "agent_ref": "/root/phase5_review_b",
        "owner_role": "capability-reviewer",
        "task_id": "phase2-curated-evidence-review-v13",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal_sha256": v9._sha(root / verifier.ROOT_SEAL),
        "root_mapper_release_sha256": release_sha,
        "review_artifact_sha256": v9._sha(root / verifier.REVIEW_OUTPUT),
        "mapper_output_hashes": hashes,
        "status": "accepted",
    })


def _result(root: Path, expected: str | None = None) -> verifier.VerificationResult:
    """Calls the public file-backed v13 verifier."""
    return verifier.verify_phase2(REPO_ROOT, root, expected)


class Phase2V13TruthVerifierTest(unittest.TestCase):
    """Exercises v13 contradiction semantics, review, and inherited blockers."""

    @classmethod
    def setUpClass(cls) -> None:
        """Loads inherited inputs and one reusable isolated track."""
        findings = []
        cls.inputs, _, _ = verifier._verify_inputs(TRACK_ROOT, findings)
        if findings:
            raise AssertionError(findings)
        cls.directory = tempfile.TemporaryDirectory()
        cls.root = Path(cls.directory.name)
        shutil.copytree(TRACK_ROOT, cls.root, dirs_exist_ok=True)

    @classmethod
    def tearDownClass(cls) -> None:
        """Closes the reusable temporary track."""
        cls.directory.cleanup()

    def setUp(self) -> None:
        """Resets candidate and authority files before each test."""
        _reset(self.root)

    def test_authority_lifecycle_and_valid_native_review(self) -> None:
        """Proves authority order, six outputs, valid v4 candidate, and v13 review."""
        self.assertEqual(_result(self.root).state, "RED_WAITING_FOR_ROOT_V13_AUTHORITY")
        _, release = _install_authority(self.root)
        self.assertEqual(_result(self.root).state, "INVALID")
        self.assertEqual(_result(self.root, "0" * 64).state, "INVALID")
        self.assertEqual(_result(self.root, release).state, "RED_WAITING_FOR_MAPPER_V5_OUTPUTS")
        bundle = _v13_bundle(self.inputs)
        release = _publish_candidate(self.root, bundle)
        self.assertEqual(_result(self.root, release).state, "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW")
        _publish_review(self.root, bundle, release)
        self.assertEqual(_result(self.root, release).state, "VERIFIED_PENDING_ROOT_ACCEPTANCE")

    def test_rpg_and_md_exact_contradiction_attacks(self) -> None:
        """Rejects alternate bases, missing refs, and drifted RPG terminal provenance."""
        started = time.monotonic()

        def probe(mutator, code: str) -> None:
            bundle = _v13_bundle(self.inputs)
            mutator(bundle)
            release = _publish_candidate(self.root, bundle)
            self.assertIn(code, {row.code for row in _result(self.root, release).findings})

        def row(bundle: dict, record_id: str) -> dict:
            return next(item for item in bundle[v9.MAPPER_OUTPUTS[0]]["records"] if item["record_id"] == record_id)

        for basis in (
            "selected-complete-behavioral-anchors",
            "complete-behavior-no-cross-game-counterpart",
            "context-or-provenance-not-behavior",
            "incompatible-bespoke-behavior",
        ):
            probe(lambda bundle, value=basis: row(bundle, "rpg-battle:RPG-NEG-001")["audit"].update(disposition_basis=value), "INVALID_CONTRADICTION_DISPOSITION")
        probe(lambda bundle: row(bundle, "rpg-battle:RPG-NEG-001")["audit"]["conflict_provenance_refs"][0].update(source_resolution_pointer="/wrong"), "INVALID_CONFLICT_PROVENANCE_REFS")
        probe(lambda bundle: row(bundle, "rpg-battle:RPG-NEG-001")["audit"].update(conflict_evidence_refs=row(bundle, "rpg-battle:RPG-NEG-001")["audit"]["conflict_evidence_refs"][:1]), "INVALID_CONFLICT_EVIDENCE_REFS")
        probe(lambda bundle: row(bundle, "magic-defense:MD-TRANS-006")["audit"].update(disposition_basis="complete-behavior-no-cross-game-counterpart"), "INVALID_CONTRADICTION_DISPOSITION")
        probe(lambda bundle: row(bundle, "magic-defense:MD-TRANS-006")["audit"].update(conflict_evidence_refs=row(bundle, "magic-defense:MD-TRANS-006")["audit"]["conflict_evidence_refs"][:2]), "INVALID_CONFLICT_EVIDENCE_REFS")
        self.assertLess(time.monotonic() - started, 30)

    def test_quarantine_exclusion_controls_and_inherited_blocker(self) -> None:
        """Rejects uses/taxonomy on quarantines, control quarantine, and scene drift."""
        bundle = _v13_bundle(self.inputs)
        rpg = next(row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"] if row["record_id"] == "rpg-battle:RPG-NEG-001")
        rpg["audit"]["evaluated_taxonomy_ids"] = ["taxonomy:baseline-insufficient"]
        rpg["audit"]["not_applicable_taxonomy_ids"] = []
        release = _publish_candidate(self.root, bundle)
        self.assertIn("INVALID_CONTRADICTION_DISPOSITION", {row.code for row in _result(self.root, release).findings})

        for control in json.loads((TRACK_ROOT / verifier.DISPATCH_PATH).read_text())["non_contradiction_controls"]:
            bundle = _v13_bundle(self.inputs)
            target = next(row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"] if row["record_id"] == control["record_ids"][0])
            target["audit"]["contradiction_kind"] = "internal-mutually-exclusive-claims"
            release = _publish_candidate(self.root, bundle)
            self.assertIn("UNAUTHORIZED_CONTRADICTION_QUARANTINE", {row.code for row in _result(self.root, release).findings})

        bundle = _v13_bundle(self.inputs)
        target = next(row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"] if row["record_id"] not in _rules())
        target["game_id"] = "wrong-game"
        release = _publish_candidate(self.root, bundle)
        self.assertIn("CURATED_ACCOUNTING_MISMATCH", {row.code for row in _result(self.root, release).findings})

    def test_native_review_omission_and_full_v4_hash_attacks(self) -> None:
        """Rejects omitted contradiction verdicts/projections and hashes without v4 audit."""
        bundle = _v13_bundle(self.inputs)
        release = _publish_candidate(self.root, bundle)
        _publish_review(self.root, bundle, release)
        review = json.loads((self.root / verifier.REVIEW_OUTPUT).read_text())
        target = next(row for row in review["record_reviews"] if row["record_id"] == "rpg-battle:RPG-NEG-001")
        del target["verdicts"]["quarantine_verdict"]
        _write(self.root / verifier.REVIEW_OUTPUT, review, compact=True)
        receipt = json.loads((self.root / verifier.REVIEW_RECEIPT).read_text())
        receipt["review_artifact_sha256"] = v9._sha(self.root / verifier.REVIEW_OUTPUT)
        _write(self.root / verifier.REVIEW_RECEIPT, receipt)
        self.assertIn("MISSING_CONTRADICTION_REVIEW_VERDICT", {row.code for row in _result(self.root, release).findings})

        _publish_review(self.root, bundle, release)
        review = json.loads((self.root / verifier.REVIEW_OUTPUT).read_text())
        target = next(row for row in review["record_reviews"] if row["record_id"] == "rpg-battle:RPG-NEG-001")
        target["evidence_refs"] = target["evidence_refs"][:1]
        _write(self.root / verifier.REVIEW_OUTPUT, review, compact=True)
        receipt = json.loads((self.root / verifier.REVIEW_RECEIPT).read_text())
        receipt["review_artifact_sha256"] = v9._sha(self.root / verifier.REVIEW_OUTPUT)
        _write(self.root / verifier.REVIEW_RECEIPT, receipt)
        self.assertIn("INVALID_CONTRADICTION_REVIEW_EVIDENCE", {row.code for row in _result(self.root, release).findings})

        _publish_review(self.root, bundle, release)
        review = json.loads((self.root / verifier.REVIEW_OUTPUT).read_text())
        target = next(row for row in review["record_reviews"] if row["record_id"] == "magic-defense:MD-TRANS-006")
        record = next(row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"] if row["record_id"] == target["record_id"])
        projected = copy.deepcopy(record)
        for key in ("contradiction_kind", "contradiction_resolution", "conflict_evidence_refs", "conflict_provenance_refs"):
            projected["audit"].pop(key)
        target["reviewed_object_sha256"] = v9._digest(projected)
        _write(self.root / verifier.REVIEW_OUTPUT, review, compact=True)
        receipt = json.loads((self.root / verifier.REVIEW_RECEIPT).read_text())
        receipt["review_artifact_sha256"] = v9._sha(self.root / verifier.REVIEW_OUTPUT)
        _write(self.root / verifier.REVIEW_RECEIPT, receipt)
        self.assertIn("MISSING_CONTRADICTION_REVIEW_VERDICT", {row.code for row in _result(self.root, release).findings})


if __name__ == "__main__":
    unittest.main()
