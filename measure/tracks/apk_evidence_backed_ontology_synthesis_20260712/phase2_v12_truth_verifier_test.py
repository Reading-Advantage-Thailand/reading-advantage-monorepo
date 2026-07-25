"""No-mock file-backed tests for the Phase 2 v12 no-finding-quota delta."""

import copy
import json
from pathlib import Path
import shutil
import tempfile
import time
import unittest

import phase2_v12_truth_verifier as verifier
import phase2_v11_truth_verifier_test as v11_tests
import phase2_v9_truth_verifier as v9
import phase2_v9_truth_verifier_test as v9_tests

TRACK_ROOT = Path(__file__).resolve().parent
REPO_ROOT = TRACK_ROOT.parents[2]


def _write(path: Path, value: dict) -> None:
    """Writes deterministic JSON to a temporary file-backed candidate."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def _write_compact(path: Path, value: dict) -> None:
    """Writes compact deterministic JSON for budget-sensitive mapper outputs."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n")


def _remove(path: Path) -> None:
    """Removes a temporary file when present."""
    if path.is_file():
        path.unlink()


def _reset(root: Path) -> None:
    """Restores v12 truth bytes and removes runtime authority and candidates."""
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


def _install_authority(root: Path) -> tuple[str, str]:
    """Publishes a temporary v12 seal and externally hashed mapper release."""
    for relative in (
        "phase2-v12-red-report.json",
        "role-receipts/phase2/truth-test-author-v12.json",
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
        "schema_version": "apk-t9-phase2-root-truth-seal.v12",
        "track_id": verifier.TRACK_ID,
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "status": "sealed-red-v12",
        "pins": hashes,
    }
    _write(root / verifier.ROOT_SEAL, seal)
    seal_sha = v9._sha(root / verifier.ROOT_SEAL)
    release = {
        "schema_version": "apk-t9-phase2-mapper-release.v12",
        "track_id": verifier.TRACK_ID,
        "status": "released-for-mapper-v5",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal": {"path": verifier.ROOT_SEAL, "sha256": seal_sha},
        "truth_artifacts": hashes,
    }
    _write(root / verifier.MAPPER_RELEASE, release)
    return seal_sha, v9._sha(root / verifier.MAPPER_RELEASE)


def _publish_candidate(root: Path, bundle: dict[str, dict]) -> str:
    """Writes six mapper outputs and an exact v12 mapper receipt."""
    for relative, value in bundle.items():
        _write_compact(root / relative, value)
    seal_sha, release_sha = _install_authority(root)
    _write(root / verifier.MAPPER_RECEIPT, {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-curated-evidence-mapper-v5-v12",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal_sha256": seal_sha,
        "root_mapper_release_sha256": release_sha,
        "output_hashes": {
            path: v9._sha(root / path) for path in verifier.MAPPER_OUTPUTS
        },
        "status": "candidate",
    })
    return release_sha


def _publish_review(root: Path, bundle: dict, release_sha: str) -> None:
    """Writes exhaustive v12 review evidence and its exact receipt."""
    review = v9_tests._review_projection(bundle, False)
    review["schema_version"] = "apk-t9-phase2-independent-review.v12"
    for review_group in (
        "record_reviews", "use_reviews", "finding_reviews",
        "game_disposition_reviews",
    ):
        for review_row in review[review_group]:
            review_row["rationale"] = (
                "Lifecycle-only quota-stress review with no product-semantic claim. "
                + review_row["rationale"]
            )
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
            f"Canonical lifecycle-only quota-stress taxonomy {entry['taxonomy_id']} atomic dimension {entry['atomic_dimension']} object "
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
        "task_id": "phase2-curated-evidence-review-v12",
        "dispatch_sha256": verifier.DISPATCH_SHA256,
        "root_truth_seal_sha256": v9._sha(root / verifier.ROOT_SEAL),
        "root_mapper_release_sha256": release_sha,
        "review_artifact_sha256": v9._sha(root / verifier.REVIEW_OUTPUT),
        "mapper_output_hashes": hashes,
        "status": "accepted",
    })


def _quota_stress_bundle(inputs: dict, finding_count: int = 46) -> dict[str, dict]:
    """Builds an isolated structurally valid lifecycle quota-stress fixture with no product-semantic claim."""
    bundle = v11_tests._v11_bundle(inputs)
    curated = bundle[v9.MAPPER_OUTPUTS[0]]
    records = v9._phase1_index(inputs)["mechanic_records"]
    context_ids = {
        row["record_id"]
        for row in json.loads((TRACK_ROOT / v9.CONTEXT_PATH).read_text())["records"]
    }
    available = [
        row for row in curated["records"]
        if row["record_id"] not in context_ids
        and row["audit"]["evaluated_taxonomy_ids"] == []
        and any(
            isinstance(field.get("value"), str)
            and v9._complete_excerpt(field["value"])
            for field in records[row["record_id"]]["derived_fields"]
        )
    ]
    by_game: dict[str, list[dict]] = {}
    for row in available:
        by_game.setdefault(row["game_id"], []).append(row)
    pools = {game_id: list(rows) for game_id, rows in by_game.items()}
    pairs = []
    for _ in range(finding_count):
        games = sorted(pools, key=lambda game_id: len(pools[game_id]), reverse=True)
        available_games = [game_id for game_id in games if pools[game_id]]
        if len(available_games) < 2:
            raise AssertionError("Phase 1 corpus lacks cross-game pairs for the quota fixture")
        left_game, right_game = available_games[:2]
        pairs.append((pools[left_game].pop(), pools[right_game].pop()))
    capability_id = "capability:v12-lifecycle-quota-stress"
    taxonomy_id = "taxonomy:v12-lifecycle-quota-stress"
    dimension = "lifecycle-only quota-stress join dimension"
    candidate_rows = [row for pair in pairs for row in pair]
    evidence_refs = []
    uses: list[dict] = []
    for number, row in enumerate(candidate_rows):
        record = records[row["record_id"]]
        field = v11_tests._accepted_field(record)
        anchor = {"field_id": field["field_id"], "exact_excerpt": field["value"]}
        use = {
            "use_id": f"v12-use-{number:03d}",
            "capability_id": capability_id,
            "scene_id": record["scene_id"],
            "state_id": record["state_id"],
            "atomic_dimension": dimension,
            "counterfactual_pertinence": True,
            "anchors": {
                role: copy.deepcopy(anchor) for role in verifier.ANCHOR_ROLES
            },
        }
        uses.append(use)
        row.update(
            primary_disposition="curated-capability-evidence",
            capability_uses=[use],
            context_rationale=None,
            audit={
                "review_method": "field-by-field-counterfactual",
                "reviewed_field_ids": [item["field_id"] for item in record["derived_fields"]],
                "fact_category": "complete-behavior",
                "disposition_basis": "selected-complete-behavioral-anchors",
                "basis_evidence_refs": [
                    {"role": role, **copy.deepcopy(anchor)}
                    for role in sorted(verifier.ANCHOR_ROLES)
                ],
                "evaluated_taxonomy_ids": [taxonomy_id],
                "not_applicable_taxonomy_ids": ["taxonomy:baseline-insufficient"],
                "redundant_to_use_ids": [],
                "incompatibility_evidence_refs": [],
            },
        )
        evidence_refs.append({"record_id": row["record_id"], **anchor})
    for row in curated["records"]:
        if row not in candidate_rows:
            row["audit"]["not_applicable_taxonomy_ids"].append(taxonomy_id)
    bundle[verifier.TAXONOMY_OUTPUT]["taxonomy_entries"].append({
        "taxonomy_id": taxonomy_id,
        "atomic_dimension": dimension,
        "status": "selected-capability",
        "capability_id": capability_id,
        "candidate_record_ids": [row["record_id"] for row in candidate_rows],
        "cross_game_counterpart_record_ids": [],
        "evidence_refs": evidence_refs,
        "incompatibility_evidence_refs": [],
    })
    v9_tests._sync_game_dispositions(bundle)
    finding_rows = []
    dependencies = []
    effects = []
    for number, pair in enumerate(pairs):
        pair_uses = [pair[0]["capability_uses"][0], pair[1]["capability_uses"][0]]
        finding_id = f"v12-finding-{number:03d}"
        effect = {
            "shared_core": f"Lifecycle-only shared-core join {number}.",
            "game_extensions": f"Lifecycle-only extension join {number}.",
            "interface_consequence": f"Lifecycle-only interface join {number}.",
        }
        finding_rows.append({
            "finding_id": finding_id,
            "statement": f"Lifecycle-only structurally joined finding {number}.",
            "dimension": dimension,
            "consumer_use_ids": [use["use_id"] for use in pair_uses],
            "per_game_summaries": [
                {"game_id": row["game_id"], "summary": f"Lifecycle-only structural record join for finding {number}."}
                for row in pair
            ],
            "boundary_effect": effect,
        })
        effects.append(effect)
        dependencies.append({
            "finding_id": finding_id,
            "use_ids": [use["use_id"] for use in pair_uses],
            "record_ids": [row["record_id"] for row in pair],
            "claim_ids": [records[row["record_id"]]["source_claim_id"] for row in pair],
        })
    bundle[v9.MAPPER_OUTPUTS[1]]["evidence_batches"] = [{
        "capability_id": capability_id,
        "similarities": finding_rows,
        "differences": [],
    }]
    bundle[v9.MAPPER_OUTPUTS[2]]["capabilities"] = [{
        "capability_id": capability_id,
        "disposition": "extend",
        "consumer_use_ids": sorted(use["use_id"] for use in uses),
        "finding_ids": [row["finding_id"] for row in finding_rows],
    }]
    bundle[v9.MAPPER_OUTPUTS[3]]["boundaries"] = [{
        "capability_id": capability_id,
        "finding_ids": [row["finding_id"] for row in finding_rows],
        "effects": effects,
    }]
    bundle[v9.MAPPER_OUTPUTS[4]]["dependencies"] = dependencies
    return bundle


def _result(root: Path, expected: str | None = None) -> verifier.VerificationResult:
    """Calls the public file-backed v12 verifier."""
    return verifier.verify_phase2(REPO_ROOT, root, expected)


class Phase2V12TruthVerifierTest(unittest.TestCase):
    """Exercises the sole v12 quota delta and inherited blocking contracts."""

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

    def test_authority_precedes_six_output_presence(self) -> None:
        """Requires external authority before checking all six mapper outputs."""
        self.assertEqual(_result(self.root).state, "RED_WAITING_FOR_ROOT_V12_AUTHORITY")
        _, release = _install_authority(self.root)
        self.assertEqual(_result(self.root).state, "INVALID")
        self.assertEqual(_result(self.root, "0" * 64).state, "INVALID")
        result = _result(self.root, release)
        self.assertEqual(result.state, "RED_WAITING_FOR_MAPPER_V5_OUTPUTS")
        self.assertEqual({row.code for row in result.findings}, {"PHASE2_MAPPER_V5_OUTPUTS_MISSING"})

    def test_46_structurally_valid_quota_stress_findings_have_no_count_quota(self) -> None:
        """Accepts 46 lifecycle-only structurally joined findings while malformed joins remain blocking."""
        started = time.monotonic()
        bundle = _quota_stress_bundle(self.inputs, 46)
        release = _publish_candidate(self.root, bundle)
        result = _result(self.root, release)
        self.assertEqual(result.state, "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW", result)
        self.assertEqual(
            verifier.REMOVED_GLOBAL_COUNT_CODES,
            frozenset({"CURATED_FINDING_BUDGET_EXCEEDED", "CURATED_USE_BUDGET_EXCEEDED"}),
        )
        self.assertTrue(verifier.REMOVED_GLOBAL_COUNT_CODES.isdisjoint({row.code for row in result.findings}))
        _publish_review(self.root, bundle, release)
        reviewed = _result(self.root, release)
        self.assertEqual(reviewed.state, "VERIFIED_PENDING_ROOT_ACCEPTANCE", reviewed)

        malformed = copy.deepcopy(bundle)
        malformed[v9.MAPPER_OUTPUTS[1]]["evidence_batches"][0]["similarities"][0]["consumer_use_ids"][0] = "missing-use"
        release = _publish_candidate(self.root, malformed)
        self.assertIn("FINDING_USE_JOIN_MISMATCH", {row.code for row in _result(self.root, release).findings})

        broken = copy.deepcopy(bundle)
        broken[v9.MAPPER_OUTPUTS[4]]["dependencies"][0]["record_ids"][0] = "wrong-record"
        release = _publish_candidate(self.root, broken)
        self.assertIn("DEPENDENCY_JOIN_MISMATCH", {row.code for row in _result(self.root, release).findings})

        dimension = copy.deepcopy(bundle)
        dimension[v9.MAPPER_OUTPUTS[1]]["evidence_batches"][0]["similarities"][0]["dimension"] = "wrong-dimension"
        release = _publish_candidate(self.root, dimension)
        self.assertIn("ATOMIC_DIMENSION_MISMATCH", {row.code for row in _result(self.root, release).findings})

        selected_join = copy.deepcopy(bundle)
        selected_join[v9.MAPPER_OUTPUTS[1]]["evidence_batches"][0]["similarities"][0]["consumer_use_ids"] = []
        release = _publish_candidate(self.root, selected_join)
        self.assertIn("SELECTED_USE_JOIN_MISMATCH", {row.code for row in _result(self.root, release).findings})

        local_cap = copy.deepcopy(bundle)
        all_use_ids = [
            use["use_id"]
            for row in local_cap[v9.MAPPER_OUTPUTS[0]]["records"]
            for use in row["capability_uses"]
        ]
        local_cap[v9.MAPPER_OUTPUTS[1]]["evidence_batches"][0]["similarities"][0]["consumer_use_ids"] = all_use_ids[:5]
        release = _publish_candidate(self.root, local_cap)
        self.assertIn("SIMILARITY_CLAIM_CAP_EXCEEDED", {row.code for row in _result(self.root, release).findings})

        classification = copy.deepcopy(bundle)
        classification[v9.MAPPER_OUTPUTS[2]]["capabilities"][0]["finding_ids"].append("missing-finding")
        release = _publish_candidate(self.root, classification)
        self.assertIn("CLASSIFICATION_JOIN_MISMATCH", {row.code for row in _result(self.root, release).findings})

        boundary = copy.deepcopy(bundle)
        boundary[v9.MAPPER_OUTPUTS[3]]["boundaries"][0]["finding_ids"].pop()
        boundary[v9.MAPPER_OUTPUTS[3]]["boundaries"][0]["effects"].pop()
        release = _publish_candidate(self.root, boundary)
        self.assertIn("BOUNDARY_JOIN_MISMATCH", {row.code for row in _result(self.root, release).findings})
        self.assertLess(time.monotonic() - started, 30)

    def test_272_structurally_valid_quota_stress_uses_have_no_global_count_quota(self) -> None:
        """Accepts at least 271 lifecycle-only structurally joined uses while retaining local caps."""
        bundle = _quota_stress_bundle(self.inputs, 136)
        use_count = sum(
            len(row["capability_uses"])
            for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"]
        )
        self.assertEqual(use_count, 272)
        release = _publish_candidate(self.root, bundle)
        result = _result(self.root, release)
        self.assertEqual(result.state, "CANDIDATE_VERIFIED_PENDING_INDEPENDENT_REVIEW", result)
        self.assertTrue(verifier.REMOVED_GLOBAL_COUNT_CODES.isdisjoint({row.code for row in result.findings}))

    def test_non_budget_inherited_finding_remains_blocking(self) -> None:
        """Keeps an unrelated inherited scene/state finding blocking."""
        bundle = _quota_stress_bundle(self.inputs, 46)
        selected = next(
            row for row in bundle[v9.MAPPER_OUTPUTS[0]]["records"]
            if row["capability_uses"]
        )
        selected["capability_uses"][0]["scene_id"] = "invented-scene"
        release = _publish_candidate(self.root, bundle)
        result = _result(self.root, release)
        self.assertEqual(result.state, "INVALID")
        self.assertIn("SCENE_STATE_MISMATCH", {row.code for row in result.findings})


if __name__ == "__main__":
    unittest.main()
