"""No-mock file-backed tests for the Phase 2 v11 taxonomy truth contract."""

import copy
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest

import phase2_v11_truth_verifier as verifier
import phase2_v9_truth_verifier as v9
import phase2_v9_truth_verifier_test as v9_tests

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


def _write(path: Path, value: dict) -> None:
    """Writes deterministic JSON to a temporary file-backed candidate."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def _remove(path: Path) -> None:
    """Removes a temporary file when present."""
    if path.is_file():
        path.unlink()


def _reset(root: Path) -> None:
    """Restores v11 truth bytes and removes runtime authority and candidates."""
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


def _isolated_root() -> tempfile.TemporaryDirectory:
    """Copies the track into one reusable temporary file-backed root."""
    directory = tempfile.TemporaryDirectory()
    root = Path(directory.name)
    shutil.copytree(TRACK_ROOT, root, dirs_exist_ok=True)
    _reset(root)
    return directory


def _accepted_field(record: dict) -> dict:
    """Returns one exact complete accepted derived field."""
    return next(
        field
        for field in record["derived_fields"]
        if isinstance(field.get("value"), str) and v9._complete_excerpt(field["value"])
    )


def _accepted_fact_field(record: dict) -> dict:
    """Returns one nonempty accepted field for a factual disposition."""
    return next(
        field for field in record["derived_fields"]
        if isinstance(field.get("value"), str) and field["value"].strip()
    )


def _v11_bundle(inputs: dict) -> dict[str, dict]:
    """Builds a valid zero-use v11 candidate with individual audit evidence."""
    bundle = v9_tests._zero_bundle(inputs)
    index = v9._phase1_index(inputs)["mechanic_records"]
    curated = bundle[v9.MAPPER_OUTPUTS[0]]
    taxonomy_id = "taxonomy:baseline-insufficient"
    context_ids = {row["record_id"] for row in json.loads((TRACK_ROOT / v9.CONTEXT_PATH).read_text())["records"]}
    candidate_record = next(
        record for record in index.values()
        if record["record_id"] not in context_ids
        and any(
            isinstance(field.get("value"), str) and v9._complete_excerpt(field["value"])
            for field in record["derived_fields"]
        )
    )
    candidate_field = _accepted_field(candidate_record)
    curated["schema_version"] = "apk-t9-phase2-curated-capability-evidence.v3"
    for row in curated["records"]:
        record = index[row["record_id"]]
        field = _accepted_fact_field(record)
        excerpt = field["value"]
        basis = "context-or-provenance-not-behavior"
        marker = hashlib.sha256(row["record_id"].encode()).hexdigest()[:16]
        row["context_rationale"] = (
            f"{record['source_claim_id']} uses {basis}; accepted fact {marker} "
            f"is exact provenance evidence: {excerpt}"
        )
        row["audit"] = {
            "review_method": "field-by-field-counterfactual",
            "reviewed_field_ids": [item["field_id"] for item in record["derived_fields"]],
            "fact_category": "provenance-location",
            "disposition_basis": basis,
            "basis_evidence_refs": [{
                "role": "fact",
                "field_id": field["field_id"],
                "exact_excerpt": excerpt,
            }],
            "evaluated_taxonomy_ids": [],
            "not_applicable_taxonomy_ids": [taxonomy_id],
            "redundant_to_use_ids": [],
            "incompatibility_evidence_refs": [],
        }
    target = next(row for row in curated["records"] if row["record_id"] == candidate_record["record_id"])
    _complete_audit(target, candidate_record, "complete-behavior-no-cross-game-counterpart")
    target["audit"]["evaluated_taxonomy_ids"] = [taxonomy_id]
    target["audit"]["not_applicable_taxonomy_ids"] = []
    return {
        verifier.TAXONOMY_OUTPUT: {
            "schema_version": "apk-t9-phase2-capability-taxonomy-inventory.v1",
            "source_phase1_root_acceptance_sha256": v9.PHASE1_BINDINGS["phase1-root-acceptance.json"],
            "source_phase1_mechanic_blueprints_sha256": v9.PHASE1_BINDINGS["phase1-mechanic-blueprints-v1.json"],
            "source_phase1_developer_effort_baseline_sha256": v9.PHASE1_BINDINGS["phase1-developer-effort-baseline-v1.json"],
            "record_count": 633,
            "taxonomy_entries": [{
                "taxonomy_id": taxonomy_id,
                "atomic_dimension": "baseline exact isolated candidate behavior",
                "status": "rejected-insufficient-cross-game-evidence",
                "capability_id": None,
                "candidate_record_ids": [candidate_record["record_id"]],
                "cross_game_counterpart_record_ids": [],
                "evidence_refs": [{
                    "record_id": candidate_record["record_id"],
                    "field_id": candidate_field["field_id"],
                    "exact_excerpt": candidate_field["value"],
                }],
                "incompatibility_evidence_refs": [],
            }],
        },
        **bundle,
    }


def _complete_audit(row: dict, record: dict, basis: str) -> None:
    """Assigns a complete-anchor v11 audit and evidence-specific rationale."""
    field = _accepted_field(record)
    row["audit"].update(
        fact_category="complete-behavior",
        disposition_basis=basis,
        basis_evidence_refs=[{
            "role": role,
            "field_id": field["field_id"],
            "exact_excerpt": field["value"],
        } for role in sorted(verifier.ANCHOR_ROLES)],
    )
    row["context_rationale"] = (
        f"{record['source_claim_id']} uses {basis}; exact accepted behavior is "
        f"{field['value']} with proof {hashlib.sha256(row['record_id'].encode()).hexdigest()[:16]}"
    )


def _add_bespoke(bundle: dict, inputs: dict) -> dict:
    """Adds one structurally valid bespoke taxonomy decision to a candidate."""
    records = v9._phase1_index(inputs)["mechanic_records"]
    context_ids = {row["record_id"] for row in json.loads((TRACK_ROOT / v9.CONTEXT_PATH).read_text())["records"]}
    eligible = [record for record in records.values() if record["record_id"] not in context_ids and any(isinstance(field.get("value"), str) and v9._complete_excerpt(field["value"]) for field in record["derived_fields"])]
    candidate = eligible[0]
    counterpart = next(row for row in eligible[1:] if row["game_id"] != candidate["game_id"])
    taxonomy_id = "taxonomy:bespoke-exact"
    refs = [{
        "record_id": record["record_id"],
        "field_id": _accepted_field(record)["field_id"],
        "exact_excerpt": _accepted_field(record)["value"],
    } for record in (candidate, counterpart)]
    entry = {
        "taxonomy_id": taxonomy_id,
        "atomic_dimension": "exact incompatible bespoke behavior",
        "status": "rejected-incompatible-bespoke",
        "capability_id": None,
        "candidate_record_ids": [candidate["record_id"]],
        "cross_game_counterpart_record_ids": [counterpart["record_id"]],
        "evidence_refs": copy.deepcopy(refs),
        "incompatibility_evidence_refs": copy.deepcopy(refs),
    }
    bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"].append(entry)
    for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"]:
        row["audit"]["not_applicable_taxonomy_ids"].append(taxonomy_id)
    target = next(row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"] if row["record_id"] == candidate["record_id"])
    _complete_audit(target, candidate, "incompatible-bespoke-behavior")
    target["audit"]["evaluated_taxonomy_ids"].append(taxonomy_id)
    target["audit"]["not_applicable_taxonomy_ids"].remove(taxonomy_id)
    target["audit"]["incompatibility_evidence_refs"] = copy.deepcopy(refs)
    return target


def _add_second_insufficient(bundle: dict, inputs: dict) -> None:
    """Adds a second valid insufficient taxonomy decision for review attacks."""
    records = v9._phase1_index(inputs)["mechanic_records"]
    existing_ids = {item for entry in bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"] for item in entry["candidate_record_ids"]}
    context_ids = {row["record_id"] for row in json.loads((TRACK_ROOT / v9.CONTEXT_PATH).read_text())["records"]}
    candidate = next(record for record in records.values() if record["record_id"] not in context_ids and record["record_id"] not in existing_ids and any(isinstance(field.get("value"), str) and v9._complete_excerpt(field["value"]) for field in record["derived_fields"]))
    field = _accepted_field(candidate)
    taxonomy_id = "taxonomy:second-insufficient"
    bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"].append({
        "taxonomy_id": taxonomy_id,
        "atomic_dimension": "second isolated exact candidate behavior",
        "status": "rejected-insufficient-cross-game-evidence",
        "capability_id": None,
        "candidate_record_ids": [candidate["record_id"]],
        "cross_game_counterpart_record_ids": [],
        "evidence_refs": [{"record_id": candidate["record_id"], "field_id": field["field_id"], "exact_excerpt": field["value"]}],
        "incompatibility_evidence_refs": [],
    })
    for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"]:
        row["audit"]["not_applicable_taxonomy_ids"].append(taxonomy_id)
    target = next(row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"] if row["record_id"] == candidate["record_id"])
    _complete_audit(target, candidate, "complete-behavior-no-cross-game-counterpart")
    target["audit"]["evaluated_taxonomy_ids"].append(taxonomy_id)
    target["audit"]["not_applicable_taxonomy_ids"].remove(taxonomy_id)


def _install_authority(root: Path) -> tuple[str, str]:
    """Publishes a temporary v11 seal and externally hashed mapper release."""
    for relative in (
        "phase2-v11-red-report.json",
        "role-receipts/phase2/truth-test-author-v11.json",
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
        "schema_version": "apk-t9-phase2-root-truth-seal.v11",
        "track_id": verifier.TRACK_ID,
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "status": "sealed-red-v11",
        "pins": hashes,
    }
    _write(root / verifier.ROOT_SEAL, seal)
    seal_sha = v9._sha(root / verifier.ROOT_SEAL)
    release = {
        "schema_version": "apk-t9-phase2-mapper-release.v11",
        "track_id": verifier.TRACK_ID,
        "status": "released-for-mapper-v5",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal": {"path": verifier.ROOT_SEAL, "sha256": seal_sha},
        "truth_artifacts": hashes,
    }
    _write(root / verifier.MAPPER_RELEASE, release)
    return seal_sha, v9._sha(root / verifier.MAPPER_RELEASE)


def _publish_candidate(root: Path, bundle: dict[str, dict]) -> str:
    """Writes six mapper outputs and an exact v11 mapper receipt."""
    for relative, value in bundle.items():
        _write(root / relative, value)
    seal_sha, release_sha = _install_authority(root)
    _write(root / verifier.MAPPER_RECEIPT, {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-curated-evidence-mapper-v5-v11",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal_sha256": seal_sha,
        "root_mapper_release_sha256": release_sha,
        "output_hashes": {path: v9._sha(root / path) for path in verifier.MAPPER_OUTPUTS},
        "status": "candidate",
    })
    return release_sha


def _publish_review(root: Path, bundle: dict, release_sha: str) -> None:
    """Writes exhaustive expanded v11 review evidence and its exact receipt."""
    review = v9_tests._review_projection(bundle, False)
    review["schema_version"] = "apk-t9-phase2-independent-review.v11"
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
        "rationale": (
            f"Canonical taxonomy {entry['taxonomy_id']} object "
            f"{v9._digest(entry)[:16]} was individually checked against all records and exact evidence."
        ),
        "evidence_refs": [{
            "type": "taxonomy-projection",
            "taxonomy_id": entry["taxonomy_id"],
            "candidate_record_ids": entry["candidate_record_ids"],
            "evidence_refs_sha256": v9._digest(entry["evidence_refs"]),
            "counterpart_record_ids": entry["cross_game_counterpart_record_ids"],
            "incompatibility_refs_sha256": v9._digest(entry["incompatibility_evidence_refs"]),
        }],
    } for entry in bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"]]
    review["mapper_output_hashes"] = {
        path: v9._sha(root / path) for path in verifier.MAPPER_OUTPUTS
    }
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
        }
    _write(root / verifier.REVIEW_OUTPUT, review)
    hashes = {path: v9._sha(root / path) for path in verifier.MAPPER_OUTPUTS}
    _write(root / verifier.REVIEW_RECEIPT, {
        "agent_ref": "/root/phase5_review_b",
        "owner_role": "capability-reviewer",
        "task_id": "phase2-curated-evidence-review-v11",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal_sha256": v9._sha(root / verifier.ROOT_SEAL),
        "root_mapper_release_sha256": release_sha,
        "review_artifact_sha256": v9._sha(root / verifier.REVIEW_OUTPUT),
        "mapper_output_hashes": hashes,
        "status": "accepted",
    })


def _result(root: Path, expected: str | None = None) -> verifier.VerificationResult:
    """Calls the public file-backed v11 verifier."""
    return verifier.verify_phase2(REPO_ROOT, root, expected)


class Phase2V11TruthVerifierTest(unittest.TestCase):
    """Exercises v11 authority, taxonomy, dispositions, review, and v9 attacks."""

    @classmethod
    def setUpClass(cls) -> None:
        """Loads inherited accepted inputs and context registry once."""
        findings = []
        cls.inputs, cls.registry, _ = verifier._verify_inputs(TRACK_ROOT, findings)
        if findings:
            raise AssertionError(findings)

    def test_authority_six_output_binding_and_inventory_drift(self) -> None:
        """Proves authority precedes mapper presence and inventory is bound."""
        with _isolated_root() as temp:
            root = Path(temp)
            self.assertEqual(_result(root).state, "RED_WAITING_FOR_ROOT_V11_AUTHORITY")
            _, release = _install_authority(root)
            self.assertEqual(_result(root).state, "INVALID")
            self.assertEqual(_result(root, release).state, "RED_WAITING_FOR_MAPPER_V5_OUTPUTS")
            bundle = _v11_bundle(self.inputs)
            release = _publish_candidate(root, bundle)
            self.assertEqual(_result(root, release).state, "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW")
            inventory = json.loads((root / verifier.TAXONOMY_OUTPUT).read_text())
            inventory["record_count"] = 632
            _write(root / verifier.TAXONOMY_OUTPUT, inventory)
            codes = {row.code for row in _result(root, release).findings}
            self.assertIn("INVALID_TAXONOMY_SCHEMA", codes)
            self.assertIn("TAMPERED_OUTPUT", codes)

    def test_required_taxonomy_disposition_and_48_context_attacks(self) -> None:
        """Rejects every new disposition attack and inherited context promotion."""
        started = time.monotonic()
        with _isolated_root() as temp:
            root = Path(temp)

            def probe(mutator, expected_code: str) -> None:
                bundle = _v11_bundle(self.inputs)
                mutator(bundle)
                release = _publish_candidate(root, bundle)
                codes = {row.code for row in _result(root, release).findings}
                self.assertIn(expected_code, codes)

            def taxonomy_gap(bundle: dict) -> None:
                record = next(iter(v9._phase1_index(self.inputs)["mechanic_records"].values()))
                field = _accepted_field(record)
                entry = {
                    "taxonomy_id": "taxonomy:omitted-dimension",
                    "atomic_dimension": "omitted reusable candidate dimension",
                    "status": "rejected-insufficient-cross-game-evidence",
                    "capability_id": None,
                    "candidate_record_ids": [record["record_id"]],
                    "cross_game_counterpart_record_ids": [],
                    "evidence_refs": [{"record_id": record["record_id"], "field_id": field["field_id"], "exact_excerpt": field["value"]}],
                    "incompatibility_evidence_refs": [],
                }
                bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"] = [entry]
            probe(taxonomy_gap, "TAXONOMY_PARTITION_MISMATCH")

            def duplicate_taxonomy(bundle: dict) -> None:
                bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"].append(
                    copy.deepcopy(bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"][0])
                )
            probe(duplicate_taxonomy, "DUPLICATE_TAXONOMY_ID")

            def taxonomy_classification_mismatch(bundle: dict) -> None:
                bundle[v9.MAPPER_OUTPUTS[2]]["capabilities"].append({"capability_id": "unbound-capability"})
            probe(taxonomy_classification_mismatch, "TAXONOMY_CLASSIFICATION_BIJECTION_MISMATCH")

            def no_counterpart(bundle: dict) -> None:
                row = next(
                    item for item in bundle[v9.MAPPER_OUTPUTS[0]]["records"]
                    if item["audit"]["evaluated_taxonomy_ids"] == []
                )
                record = v9._phase1_index(self.inputs)["mechanic_records"][row["record_id"]]
                _complete_audit(row, record, "complete-behavior-no-cross-game-counterpart")
            probe(no_counterpart, "NO_COUNTERPART_TAXONOMY_MISMATCH")

            def bespoke(bundle: dict) -> None:
                row = bundle[v9.MAPPER_OUTPUTS[0]]["records"][0]
                record = v9._phase1_index(self.inputs)["mechanic_records"][row["record_id"]]
                _complete_audit(row, record, "incompatible-bespoke-behavior")
            probe(bespoke, "BESPOKE_INCOMPATIBILITY_MISSING")

            probe(lambda bundle: bundle[v9.MAPPER_OUTPUTS[0]]["records"][0]["audit"].update(disposition_basis="no-complete-behavioral-anchors"), "LEGACY_CONTEXT_BASIS")

            def redundant_incomplete(bundle: dict) -> None:
                row = bundle[v9.MAPPER_OUTPUTS[0]]["records"][0]
                row["audit"].update(fact_category="behavioral-fragment", disposition_basis="redundant-to-selected-atomic-evidence")
            probe(redundant_incomplete, "REDUNDANT_SELECTED_USE_JOIN_MISSING")

            def selected_mismatch(bundle: dict) -> None:
                row = bundle[v9.MAPPER_OUTPUTS[0]]["records"][0]
                row["primary_disposition"] = "curated-capability-evidence"
                row["context_rationale"] = None
                row["audit"]["disposition_basis"] = "selected-complete-behavioral-anchors"
            probe(selected_mismatch, "SELECTED_TAXONOMY_USE_MISMATCH")

            probe(lambda bundle: next(row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"] if row["audit"]["disposition_basis"] == "context-or-provenance-not-behavior")["audit"].update(fact_category="complete-behavior"), "PROVENANCE_BASIS_ON_COMPLETE_BEHAVIOR")
            probe(lambda bundle: bundle[v9.MAPPER_OUTPUTS[0]]["records"][0]["audit"].update(basis_evidence_refs=[]), "BASIS_EVIDENCE_REF_MISSING")

            def templated(bundle: dict) -> None:
                records = v9._phase1_index(self.inputs)["mechanic_records"]
                rows = [
                    row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"]
                    if row["audit"]["disposition_basis"] == "context-or-provenance-not-behavior"
                ]
                for row in rows[:2]:
                    record = records[row["record_id"]]
                    excerpt = row["audit"]["basis_evidence_refs"][0]["exact_excerpt"]
                    row["context_rationale"] = f"{record['source_claim_id']} uses context-or-provenance-not-behavior because exact fact is {excerpt}."
            probe(templated, "TEMPLATED_CONTEXT_RATIONALE")

            def malformed_incompatibility(bundle: dict) -> None:
                target = _add_bespoke(bundle, self.inputs)
                target["audit"]["incompatibility_evidence_refs"][0] = {"record_id": "missing"}
            probe(malformed_incompatibility, "INVALID_INCOMPATIBILITY_EVIDENCE_REF")

            def mismatched_incompatibility(bundle: dict) -> None:
                target = _add_bespoke(bundle, self.inputs)
                target["audit"]["incompatibility_evidence_refs"] = target["audit"]["incompatibility_evidence_refs"][:1]
            probe(mismatched_incompatibility, "BESPOKE_INCOMPATIBILITY_MISSING")

            def irrelevant_array(bundle: dict) -> None:
                target = next(row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"] if row["audit"]["disposition_basis"] == "context-or-provenance-not-behavior")
                target["audit"]["redundant_to_use_ids"] = ["irrelevant-use"]
            probe(irrelevant_array, "IRRELEVANT_DISPOSITION_EVIDENCE")

            for registry_row in self.registry["records"]:
                def promote(bundle: dict, record_id: str = registry_row["record_id"]) -> None:
                    row = next(item for item in bundle[v9.MAPPER_OUTPUTS[0]]["records"] if item["record_id"] == record_id)
                    record = v9._phase1_index(self.inputs)["mechanic_records"][record_id]
                    row["primary_disposition"] = "curated-capability-evidence"
                    row["capability_uses"] = []
                    row["context_rationale"] = None
                    _complete_audit(row, record, "selected-complete-behavioral-anchors")
                probe(promote, "CONTEXT_COUNTEREXAMPLE_PROMOTED")
        self.assertLess(time.monotonic() - started, 30)

    def test_review_expansion_and_full_audit_hash(self) -> None:
        """Requires exhaustive audit-basis verdicts and hashes of full audits."""
        with _isolated_root() as temp:
            root = Path(temp)
            bundle = _v11_bundle(self.inputs)
            release = _publish_candidate(root, bundle)
            _publish_review(root, bundle, release)
            self.assertEqual(_result(root, release).state, "VERIFIED_PENDING_ROOT_ACCEPTANCE")

            review = json.loads((root / verifier.REVIEW_OUTPUT).read_text())
            del review["record_reviews"][0]["verdicts"]["disposition_basis"]
            _write(root / verifier.REVIEW_OUTPUT, review)
            receipt = json.loads((root / verifier.REVIEW_RECEIPT).read_text())
            receipt["review_artifact_sha256"] = v9._sha(root / verifier.REVIEW_OUTPUT)
            _write(root / verifier.REVIEW_RECEIPT, receipt)
            self.assertIn("MISSING_AUDIT_BASIS_VERDICT", {row.code for row in _result(root, release).findings})

            _publish_review(root, bundle, release)
            review = json.loads((root / verifier.REVIEW_OUTPUT).read_text())
            review["record_reviews"][0]["verdicts"]["disposition_basis"] = "banana"
            _write(root / verifier.REVIEW_OUTPUT, review)
            receipt = json.loads((root / verifier.REVIEW_RECEIPT).read_text())
            receipt["review_artifact_sha256"] = v9._sha(root / verifier.REVIEW_OUTPUT)
            _write(root / verifier.REVIEW_RECEIPT, receipt)
            self.assertIn("MISSING_AUDIT_BASIS_VERDICT", {row.code for row in _result(root, release).findings})

            template_bundle = _v11_bundle(self.inputs)
            _add_second_insufficient(template_bundle, self.inputs)
            template_release = _publish_candidate(root, template_bundle)
            _publish_review(root, template_bundle, template_release)
            review = json.loads((root / verifier.REVIEW_OUTPUT).read_text())
            entries = {entry["taxonomy_id"]: entry for entry in template_bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"]}
            for row in review["taxonomy_reviews"]:
                entry = entries[row["taxonomy_id"]]
                ref = entry["evidence_refs"][0]
                row["rationale"] = (
                    f"Taxonomy {entry['taxonomy_id']} candidate {ref['record_id']} excerpt "
                    f"{ref['exact_excerpt']} hash {v9._digest(entry)[:16]} number 7 was individually checked."
                )
            _write(root / verifier.REVIEW_OUTPUT, review)
            receipt = json.loads((root / verifier.REVIEW_RECEIPT).read_text())
            receipt["review_artifact_sha256"] = v9._sha(root / verifier.REVIEW_OUTPUT)
            _write(root / verifier.REVIEW_RECEIPT, receipt)
            self.assertIn("GENERIC_REVIEW_RATIONALE", {row.code for row in _result(root, template_release).findings})

            release = _publish_candidate(root, bundle)
            _publish_review(root, bundle, release)
            review = json.loads((root / verifier.REVIEW_OUTPUT).read_text())
            record = bundle[v9.MAPPER_OUTPUTS[0]]["records"][0]
            without_audit = {key: value for key, value in record.items() if key != "audit"}
            review["record_reviews"][0]["reviewed_object_sha256"] = v9._digest(without_audit)
            _write(root / verifier.REVIEW_OUTPUT, review)
            receipt = json.loads((root / verifier.REVIEW_RECEIPT).read_text())
            receipt["review_artifact_sha256"] = v9._sha(root / verifier.REVIEW_OUTPUT)
            _write(root / verifier.REVIEW_RECEIPT, receipt)
            self.assertIn("UNRESOLVED_REVIEW_EVIDENCE_REF", {row.code for row in _result(root, release).findings})


if __name__ == "__main__":
    unittest.main()
