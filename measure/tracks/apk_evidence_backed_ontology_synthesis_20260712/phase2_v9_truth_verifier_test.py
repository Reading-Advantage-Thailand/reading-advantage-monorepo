"""File-backed public-entrypoint tests for the Phase 2 v9 truth contract."""

import copy
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest

import phase2_v9_truth_verifier as verifier

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


def _write(path: Path, value: dict) -> None:
    """Writes deterministic JSON for a temporary file-backed candidate."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def _inputs() -> tuple[dict, dict]:
    """Loads v9-verified Phase 1 inputs and the context registry."""
    findings = []
    inputs, registry, _ = verifier._verify_authority(TRACK_ROOT, findings)
    if findings:
        raise AssertionError(findings)
    return inputs, registry


def _zero_bundle(inputs: dict) -> dict[str, dict]:
    """Builds the valid audited zero-use candidate allowed by v9."""
    index = verifier._phase1_index(inputs)
    records = []
    for record in index["mechanic_records"].values():
        records.append({
            "record_id": record["record_id"],
            "game_id": record["game_id"],
            "claim_id": record["source_claim_id"],
            "primary_disposition": "non-capability-context",
            "capability_uses": [],
            "context_rationale": "Individual field review found no complete cross-game behavioral anchors.",
            "audit": {
                "review_method": "field-by-field-counterfactual",
                "reviewed_field_ids": [field["field_id"] for field in record["derived_fields"]],
                "disposition_basis": "no-complete-behavioral-anchors",
            },
        })
    curated = {
        "schema_version": "apk-t9-phase2-curated-capability-evidence.v2",
        "phase1_bindings": verifier.PHASE1_BINDINGS,
        "audit_method": "per-record-field-by-field-counterfactual",
        "records": records,
        "game_dispositions": [
            {
                "game_id": game_id,
                "disposition": "no-supported-reusable-capability",
                "capability_ids": [],
                "rationale": "Individual review found no supported reusable cross-game capability.",
            }
            for game_id in index["games"]
        ],
    }
    return {
        verifier.MAPPER_OUTPUTS[0]: curated,
        verifier.MAPPER_OUTPUTS[1]: {
            "schema_version": "apk-t9-phase2-capability-comparisons.v5",
            "phase1_bindings": verifier.PHASE1_BINDINGS,
            "evidence_batches": [],
        },
        verifier.MAPPER_OUTPUTS[2]: {
            "schema_version": "apk-t9-phase2-capability-classification.v5",
            "phase1_bindings": verifier.PHASE1_BINDINGS,
            "capabilities": [],
        },
        verifier.MAPPER_OUTPUTS[3]: {
            "schema_version": "apk-t9-phase2-extension-boundaries.v5",
            "phase1_bindings": verifier.PHASE1_BINDINGS,
            "boundaries": [],
        },
        verifier.MAPPER_OUTPUTS[4]: {
            "schema_version": "apk-t9-phase2-claim-dependency-edges.v5",
            "phase1_bindings": verifier.PHASE1_BINDINGS,
            "dependencies": [],
        },
    }


def _accepted_anchor(record: dict) -> dict:
    """Returns a complete accepted derived-field anchor."""
    field = next(
        field
        for field in record["derived_fields"]
        if isinstance(field.get("value"), str)
        and verifier._complete_excerpt(field["value"])
    )
    return {"field_id": field["field_id"], "exact_excerpt": field["value"]}


def _promote(
    bundle: dict[str, dict],
    inputs: dict,
    record_id: str,
    use_id: str,
    capability_id: str,
    *,
    dimension: str = "fixture behavior",
) -> dict:
    """Promotes one temporary record with exact accepted anchors."""
    record = verifier._phase1_index(inputs)["mechanic_records"][record_id]
    row = next(
        item
        for item in bundle[verifier.MAPPER_OUTPUTS[0]]["records"]
        if item["record_id"] == record_id
    )
    anchor = _accepted_anchor(record)
    use = {
        "use_id": use_id,
        "capability_id": capability_id,
        "scene_id": record["scene_id"],
        "state_id": record["state_id"],
        "atomic_dimension": dimension,
        "counterfactual_pertinence": True,
        "anchors": {
            role: copy.deepcopy(anchor)
            for role in verifier.ANCHOR_ROLES
        },
    }
    row.update(
        primary_disposition="curated-capability-evidence",
        capability_uses=[use],
        context_rationale=None,
        audit={
            "review_method": "field-by-field-counterfactual",
            "reviewed_field_ids": [field["field_id"] for field in record["derived_fields"]],
            "disposition_basis": "selected-complete-behavioral-anchors",
        },
    )
    return use


def _sync_game_dispositions(bundle: dict[str, dict]) -> None:
    """Synchronizes game capability sets to selected uses."""
    by_game: dict[str, set[str]] = {}
    for record in bundle[verifier.MAPPER_OUTPUTS[0]]["records"]:
        for use in record["capability_uses"]:
            by_game.setdefault(record["game_id"], set()).add(use["capability_id"])
    for row in bundle[verifier.MAPPER_OUTPUTS[0]]["game_dispositions"]:
        row["capability_ids"] = sorted(by_game.get(row["game_id"], set()))
        if row["capability_ids"]:
            row["disposition"] = "supported-capability"
            row["rationale"] = "Individually reviewed uses support the listed reusable capability."


def _install_truth_authority(root: Path) -> tuple[str, str]:
    """Creates a root seal and externally hashed mapper release in temp storage."""
    for relative in (
        "phase2-v9-red-report.json",
        "role-receipts/phase2/truth-test-author-v9.json",
    ):
        if not (root / relative).is_file():
            _write(root / relative, {"temporary_file_backed_truth_fixture": relative})
    manifest = json.loads((root / verifier.FIXTURE_MANIFEST).read_text())
    truth_paths = (
        *verifier.BASE_TRUTH_PATHS,
        *(row["path"] for row in manifest["fixtures"]),
    )
    truth_hashes = {relative: verifier._sha(root / relative) for relative in truth_paths}
    seal = {
        "schema_version": "apk-t9-phase2-root-truth-seal.v9",
        "track_id": verifier.TRACK_ID,
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "status": "sealed-red-v9",
        "pins": truth_hashes,
    }
    _write(root / verifier.ROOT_SEAL, seal)
    seal_sha = verifier._sha(root / verifier.ROOT_SEAL)
    release = {
        "schema_version": "apk-t9-phase2-mapper-release.v9",
        "track_id": verifier.TRACK_ID,
        "status": "released-for-mapper-v5",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal": {"path": verifier.ROOT_SEAL, "sha256": seal_sha},
        "truth_artifacts": truth_hashes,
    }
    _write(root / verifier.MAPPER_RELEASE, release)
    return seal_sha, verifier._sha(root / verifier.MAPPER_RELEASE)


def _publish_candidate(root: Path, bundle: dict[str, dict]) -> str:
    """Writes mapper outputs and a valid seal/release-bound mapper receipt."""
    for path, value in bundle.items():
        _write(root / path, value)
    seal_sha, release_sha = _install_truth_authority(root)
    receipt = {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-curated-evidence-mapper-v5-v9",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal_sha256": seal_sha,
        "root_mapper_release_sha256": release_sha,
        "output_hashes": {
            path: verifier._sha(root / path) for path in verifier.MAPPER_OUTPUTS
        },
        "status": "candidate",
    }
    _write(root / verifier.MAPPER_RECEIPT, receipt)
    return release_sha


def _isolated_root() -> tempfile.TemporaryDirectory:
    """Copies the track into a disposable file-backed lifecycle root."""
    directory = tempfile.TemporaryDirectory()
    root = Path(directory.name)
    shutil.copytree(TRACK_ROOT, root, dirs_exist_ok=True)
    for relative in (
        *verifier.MAPPER_OUTPUTS,
        verifier.MAPPER_RECEIPT,
        verifier.REVIEW_OUTPUT,
        verifier.REVIEW_RECEIPT,
        verifier.ROOT_SEAL,
        verifier.MAPPER_RELEASE,
    ):
        path = root / relative
        if path.is_file():
            path.unlink()
    directory.track_root = root
    return directory


def _candidate_result(root: Path, release_sha: str) -> verifier.VerificationResult:
    """Calls the public file-backed verifier entrypoint."""
    return verifier.verify_phase2(REPO_ROOT, root, release_sha)


def _v4_record_ids(inputs: dict) -> list[str]:
    """Returns unique accepted record IDs in rejected-v4 consumer order."""
    classification = json.loads(
        (TRACK_ROOT / "phase2-capability-classification-v4.json").read_text()
    )
    accepted = verifier._phase1_index(inputs)["mechanic_records"]
    seen = set()
    result = []
    for capability in classification["capabilities"]:
        for use in capability["consumers"]:
            record_id = use["record_id"]
            if record_id in accepted and record_id not in seen:
                try:
                    _accepted_anchor(accepted[record_id])
                except StopIteration:
                    continue
                seen.add(record_id)
                result.append(record_id)
    return result


def _make_structurally_valid_v4_slice(bundle: dict, inputs: dict) -> None:
    """Transforms two rejected-v4 consumers into an under-budget valid candidate."""
    classification = json.loads(
        (TRACK_ROOT / "phase2-capability-classification-v4.json").read_text()
    )
    context = {
        row["record_id"]
        for row in json.loads((TRACK_ROOT / verifier.CONTEXT_PATH).read_text())["records"]
    }
    accepted = verifier._phase1_index(inputs)["mechanic_records"]
    selected = None
    for capability in classification["capabilities"]:
        candidates = []
        games = set()
        for consumer in capability["consumers"]:
            record_id = consumer["record_id"]
            if record_id not in accepted or record_id in context:
                continue
            try:
                _accepted_anchor(accepted[record_id])
            except StopIteration:
                continue
            if accepted[record_id]["game_id"] not in games:
                candidates.append(record_id)
                games.add(accepted[record_id]["game_id"])
            if len(candidates) == 2:
                selected = (capability["capability_id"], candidates)
                break
        if selected:
            break
    if selected is None:
        raise AssertionError("rejected v4 has no two-game transform slice")
    capability_id, record_ids = selected
    uses = [
        _promote(bundle, inputs, record_id, f"v4-slice-use-{number}", capability_id)
        for number, record_id in enumerate(record_ids)
    ]
    _sync_game_dispositions(bundle)
    finding_id = "v4-slice-incoherent-finding"
    finding = {
        "finding_id": finding_id,
        "statement": "Both games expose a grammatical but semantically incoherent generated behavior.",
        "dimension": "fixture behavior",
        "consumer_use_ids": [use["use_id"] for use in uses],
        "per_game_summaries": [
            {
                "game_id": accepted[record_id]["game_id"],
                "summary": "The selected rejected-v4 fragment is presented as shared behavior.",
            }
            for record_id in record_ids
        ],
        "boundary_effect": {
            "shared_core": "Generated text claims an unsupported shared runtime core.",
            "game_extensions": "Generated text claims unsupported game-owned variants.",
            "interface_consequence": "Generated text claims an unsupported interface boundary.",
        },
    }
    bundle[verifier.MAPPER_OUTPUTS[1]]["evidence_batches"] = [{
        "capability_id": capability_id,
        "similarities": [finding],
        "differences": [],
    }]
    bundle[verifier.MAPPER_OUTPUTS[2]]["capabilities"] = [{
        "capability_id": capability_id,
        "disposition": "extend",
        "consumer_use_ids": sorted(use["use_id"] for use in uses),
        "finding_ids": [finding_id],
    }]
    bundle[verifier.MAPPER_OUTPUTS[3]]["boundaries"] = [{
        "capability_id": capability_id,
        "finding_ids": [finding_id],
        "effects": [finding["boundary_effect"]],
    }]
    bundle[verifier.MAPPER_OUTPUTS[4]]["dependencies"] = [{
        "finding_id": finding_id,
        "use_ids": [use["use_id"] for use in uses],
        "record_ids": record_ids,
        "claim_ids": [accepted[record_id]["source_claim_id"] for record_id in record_ids],
    }]


def _review_projection(bundle: dict, reject_finding: bool) -> dict:
    """Builds exhaustive exact review rows, optionally rejecting the v4 finding."""
    records = {
        row["record_id"]: row
        for row in bundle[verifier.MAPPER_OUTPUTS[0]]["records"]
    }
    uses = {
        use["use_id"]: use
        for record in records.values()
        for use in record["capability_uses"]
    }
    findings = {
        finding["finding_id"]: finding
        for batch in bundle[verifier.MAPPER_OUTPUTS[1]]["evidence_batches"]
        for kind in ("similarities", "differences")
        for finding in batch[kind]
    }
    games = {
        row["game_id"]: row
        for row in bundle[verifier.MAPPER_OUTPUTS[0]]["game_dispositions"]
    }
    record_reviews = []
    for number, (record_id, row) in enumerate(records.items()):
        refs = [{
            "type": "record-decision",
            "record_id": record_id,
            "primary_disposition": row["primary_disposition"],
            "audit_sha256": verifier._digest(row["audit"]),
            "capability_use_ids": [use["use_id"] for use in row["capability_uses"]],
            "context_rationale_sha256": verifier._digest(row["context_rationale"]),
        }]
        record_reviews.append({
            "record_id": record_id,
            "reviewed_object_sha256": verifier._digest(row),
            "verdicts": {
                "primary_disposition": "accept",
                "anchor_completeness": "accept",
                "context_rationale_or_selected_uses": "accept",
                "automatic_versus_individual_decision": "accept",
            },
            "rationale": f"Canonical record decision {verifier._digest(row)[:16]} was checked against audit {verifier._digest(row['audit'])[:16]} and its exact disposition evidence.",
            "evidence_refs": refs,
        })
    use_reviews = []
    for number, (use_id, use) in enumerate(uses.items()):
        refs = [{
            "type": "behavioral-anchor",
            "role": role,
            "field_id": anchor["field_id"],
            "exact_excerpt": anchor["exact_excerpt"],
            "anchor_sha256": verifier._digest(anchor),
        } for role, anchor in sorted(use["anchors"].items())]
        use_reviews.append({
            "use_id": use_id,
            "reviewed_object_sha256": verifier._digest(use),
            "verdicts": {
                "anchor_role_correctness": "accept",
                "counterfactual_pertinence": "accept",
                "atomic_dimension": "accept",
                "context_or_capability_routing": "accept",
                "same_excerpt_multi_role": "accept",
            },
            "rationale": f"Canonical use {verifier._digest(use)[:16]} checked anchor {refs[0]['anchor_sha256'][:16]} explicitly across all causal roles.",
            "evidence_refs": refs,
        })
    finding_reviews = []
    for number, (finding_id, row) in enumerate(findings.items()):
        verdicts = {
            "one_invariant_or_axis_coherence": "reject" if reject_finding else "accept",
            "cross_game_pertinence": "reject" if reject_finding else "accept",
            "per_game_summary": "accept",
            "boundary_ownership": "reject" if reject_finding else "accept",
            "classification_disposition": "reject" if reject_finding else "accept",
        }
        finding_reviews.append({
            "finding_id": finding_id,
            "reviewed_object_sha256": verifier._digest(row),
            "verdicts": verdicts,
            "rationale": f"Canonical finding {verifier._digest(row)[:16]} compared its exact use set and rejected generated cross-game ownership semantics.",
            "evidence_refs": [{
                "type": "finding-projection",
                "finding_id": finding_id,
                "dimension": row["dimension"],
                "consumer_use_ids": row["consumer_use_ids"],
                "per_game_summaries_sha256": verifier._digest(row["per_game_summaries"]),
                "boundary_effect_sha256": verifier._digest(row["boundary_effect"]),
            }],
        })
    game_reviews = []
    for number, (game_id, row) in enumerate(games.items()):
        game_reviews.append({
            "game_id": game_id,
            "reviewed_object_sha256": verifier._digest(row),
            "verdicts": {
                "capability_set": "accept",
                "supported_or_no_supported_reuse": "accept",
                "rationale": "accept",
            },
            "rationale": f"Canonical game disposition {verifier._digest(row)[:16]} reconciled its exact capability set and explicit supported-or-none outcome.",
            "evidence_refs": [{
                "type": "game-disposition-projection",
                "game_id": game_id,
                "disposition": row["disposition"],
                "capability_ids": row["capability_ids"],
                "rationale_sha256": verifier._digest(row["rationale"]),
            }],
        })
    return {
        "schema_version": "apk-t9-phase2-independent-review.v9",
        "track_id": verifier.TRACK_ID,
        "phase": 2,
        "reviewer": {
            "agent_ref": "/root/phase5_review_b",
            "owner_role": "capability-reviewer",
        },
        "mapper_output_hashes": {},
        "sampling": "none-exhaustive",
        "record_reviews": record_reviews,
        "use_reviews": use_reviews,
        "finding_reviews": finding_reviews,
        "game_disposition_reviews": game_reviews,
        "unresolved_counts": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0},
        "status": "rejected" if reject_finding else "accepted",
    }


def _publish_review(root: Path, bundle: dict, release_sha: str, *, reject: bool) -> None:
    """Writes an exhaustive review and exact reviewer receipt."""
    review = _review_projection(bundle, reject)
    mapper_hashes = {
        path: verifier._sha(root / path) for path in verifier.MAPPER_OUTPUTS
    }
    review["mapper_output_hashes"] = mapper_hashes
    _write(root / verifier.REVIEW_OUTPUT, review)
    receipt = {
        "agent_ref": "/root/phase5_review_b",
        "owner_role": "capability-reviewer",
        "task_id": "phase2-curated-evidence-review-v9",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal_sha256": verifier._sha(root / verifier.ROOT_SEAL),
        "root_mapper_release_sha256": release_sha,
        "review_artifact_sha256": verifier._sha(root / verifier.REVIEW_OUTPUT),
        "mapper_output_hashes": mapper_hashes,
        "status": "rejected" if reject else "accepted",
    }
    _write(root / verifier.REVIEW_RECEIPT, receipt)


class Phase2V9TruthVerifierTest(unittest.TestCase):
    """Exercises every v9 attack through file-backed public verification."""

    @classmethod
    def setUpClass(cls) -> None:
        """Loads accepted inputs once."""
        cls.inputs, cls.registry = _inputs()

    def test_complete_file_backed_lifecycle_and_attacks(self) -> None:
        """Runs valid, malformed, drift, counterexample, and v4 candidates."""
        started = time.monotonic()

        with _isolated_root() as temp:
            root = Path(temp)
            bundle = _zero_bundle(self.inputs)
            release = _publish_candidate(root, bundle)
            result = _candidate_result(root, release)
            self.assertEqual(result.state, "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW")
            self.assertEqual(result.findings, ())

        with _isolated_root() as temp:
            root = Path(temp)
            bundle = _zero_bundle(self.inputs)
            release = _publish_candidate(root, bundle)
            receipt = json.loads((root / verifier.MAPPER_RECEIPT).read_text())
            del receipt["status"]
            _write(root / verifier.MAPPER_RECEIPT, receipt)
            result = _candidate_result(root, release)
            self.assertIn("INVALID_SCHEMA", {row.code for row in result.findings})

        with _isolated_root() as temp:
            root = Path(temp)
            bundle = _zero_bundle(self.inputs)
            release = _publish_candidate(root, bundle)
            curated = json.loads((root / verifier.MAPPER_OUTPUTS[0]).read_text())
            curated["audit_method"] = "tampered"
            _write(root / verifier.MAPPER_OUTPUTS[0], curated)
            result = _candidate_result(root, release)
            self.assertIn("TAMPERED_OUTPUT", {row.code for row in result.findings})

        with _isolated_root() as temp:
            root = Path(temp)
            release = _publish_candidate(root, _zero_bundle(self.inputs))
            (root / "phase2-v9-red-report.json").write_text('{"drift":true}\n')
            result = _candidate_result(root, release)
            self.assertIn("LIVE_TRUTH_DRIFT", {row.code for row in result.findings})

        with _isolated_root() as temp:
            root = Path(temp)
            for registry_row in self.registry["records"]:
                bundle = _zero_bundle(self.inputs)
                target = next(
                    row for row in bundle[verifier.MAPPER_OUTPUTS[0]]["records"]
                    if row["record_id"] == registry_row["record_id"]
                )
                target["primary_disposition"] = "curated-capability-evidence"
                target["context_rationale"] = None
                target["audit"]["disposition_basis"] = "selected-complete-behavioral-anchors"
                release = _publish_candidate(root, bundle)
                result = _candidate_result(root, release)
                self.assertIn(
                    "CONTEXT_COUNTEREXAMPLE_PROMOTED",
                    {row.code for row in result.findings},
                    registry_row["record_id"],
                )

        with _isolated_root() as temp:
            root = Path(temp)
            bundle = _zero_bundle(self.inputs)
            row = next(
                row for row in bundle[verifier.MAPPER_OUTPUTS[0]]["records"]
                if row["record_id"] == "rune-match:RM-CONTENT-001"
            )
            row["record_id"] = "rune-match:RM-CONT-001"
            release = _publish_candidate(root, bundle)
            result = _candidate_result(root, release)
            self.assertIn("CURATED_ACCOUNTING_MISMATCH", {row.code for row in result.findings})

        candidate_ids = [
            record_id for record_id in _v4_record_ids(self.inputs)
            if record_id not in {row["record_id"] for row in self.registry["records"]}
        ]
        with _isolated_root() as temp:
            root = Path(temp)
            bundle = _zero_bundle(self.inputs)
            use = _promote(bundle, self.inputs, candidate_ids[0], "scene-use", "scene-cap")
            use["scene_id"] = "invented-scene"
            release = _publish_candidate(root, bundle)
            result = _candidate_result(root, release)
            self.assertIn("SCENE_STATE_MISMATCH", {row.code for row in result.findings})

        with _isolated_root() as temp:
            root = Path(temp)
            bundle = _zero_bundle(self.inputs)
            _promote(bundle, self.inputs, candidate_ids[0], "cross-use", "missing-capability")
            release = _publish_candidate(root, bundle)
            result = _candidate_result(root, release)
            self.assertIn("UNKNOWN_CAPABILITY_ID", {row.code for row in result.findings})

        with _isolated_root() as temp:
            root = Path(temp)
            bundle = _zero_bundle(self.inputs)
            all_v4_ids = _v4_record_ids(self.inputs)
            self.assertGreaterEqual(len(all_v4_ids), 271)
            for number, record_id in enumerate(all_v4_ids[:271]):
                _promote(bundle, self.inputs, record_id, f"v4-full-{number}", "v4-generated")
            _sync_game_dispositions(bundle)
            release = _publish_candidate(root, bundle)
            result = _candidate_result(root, release)
            self.assertIn("CURATED_USE_BUDGET_EXCEEDED", {row.code for row in result.findings})

        with _isolated_root() as temp:
            root = Path(temp)
            bundle = _zero_bundle(self.inputs)
            _make_structurally_valid_v4_slice(bundle, self.inputs)
            release = _publish_candidate(root, bundle)
            self.assertEqual(
                _candidate_result(root, release).state,
                "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW",
            )
            _publish_review(root, bundle, release, reject=True)
            result = _candidate_result(root, release)
            self.assertEqual(result.state, "REVIEW_REJECTED")
            self.assertIn("SEMANTIC_REVIEW_REJECTED", {row.code for row in result.findings})

            review = json.loads((root / verifier.REVIEW_OUTPUT).read_text())
            review["finding_reviews"][0]["evidence_refs"][0]["dimension"] = "fabricated"
            _write(root / verifier.REVIEW_OUTPUT, review)
            receipt = json.loads((root / verifier.REVIEW_RECEIPT).read_text())
            receipt["review_artifact_sha256"] = verifier._sha(root / verifier.REVIEW_OUTPUT)
            _write(root / verifier.REVIEW_RECEIPT, receipt)
            result = _candidate_result(root, release)
            self.assertIn("UNRESOLVED_REVIEW_EVIDENCE_REF", {row.code for row in result.findings})

        self.assertLess(time.monotonic() - started, 30)

    def test_live_missing_candidate_is_exact_red(self) -> None:
        """The live public entrypoint has one missing-mapper Red finding."""
        result = verifier.verify_phase2(REPO_ROOT, TRACK_ROOT)
        self.assertEqual(result.state, "RED_WAITING_FOR_MAPPER_V5_OUTPUTS")
        self.assertEqual(
            {row.code for row in result.findings},
            {"PHASE2_MAPPER_V5_OUTPUTS_MISSING"},
        )


if __name__ == "__main__":
    unittest.main()
