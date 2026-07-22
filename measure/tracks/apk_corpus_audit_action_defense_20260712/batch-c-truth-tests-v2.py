"""Fail-closed Batch C v2 truth contracts using semantic supersessions only."""

from __future__ import annotations

import hashlib
import json
import subprocess
import unittest
from pathlib import Path
from typing import Any


TRACK = "apk_corpus_audit_action_defense_20260712"
PHASE_BASE = "709b0c69608312aa5d784fcc9c1b74870ce697e0"
ROLE_BASE = "1d7926e9907f1c5c803ecc856ad61121c1a914b7"
SOURCE_BASE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
HERE = Path(__file__).resolve()
ROOT = HERE.parents[3]
TRACK_DIR = HERE.parent
RECEIPT = TRACK_DIR / "role-receipts/truth-test-author-batch-c-v2.json"
RESOURCE_FIELDS = (
    "source_bytes_read", "source_files_or_objects_read", "command_invocations",
    "elapsed_minutes", "records_authored_or_reviewed", "browser_interactions",
    "browser_artifacts_captured", "asset_candidates_inspected",
)
GAMES = {
    "paladin": {
        "original": "paladins-twin-soul-claim-ledger-batch-c.json",
        "semantic": "paladins-twin-soul-semantic-supersession-batch-c-v2.json",
        "semantic_sha": "9c9227e3b560cf15c35b977b9e23bba4b0fa9a346e0a6fae1308e0a298718613",
        "report": "paladins-twin-soul-evidence-final-report-batch-c.json",
        "blueprint": "paladins-twin-soul-blueprint-batch-c.json",
        "hypotheses": "paladins-twin-soul-mapper-hypotheses-batch-c.md",
        "mapper": "paladins-twin-soul-mapper-final-report-batch-c.json",
        "collector_receipt": "evidence-collector-paladins-twin-soul-batch-c-v2.json",
        "mapper_receipt": "requirements-mapper-paladins-twin-soul-batch-c.json",
        "fixture_key": "negative_fixtures", "claim_key": "claims", "count": 21,
    },
    "gryphon": {
        "original": "gryphon-patrol-claim-ledger-batch-c.json",
        "semantic": "gryphon-patrol-semantic-supersession-batch-c-v2.json",
        "semantic_sha": "2f0c23b6aa5a03b814107dbd8325bc1af5d7ce21fa15d6fbfdca87b77345efd4",
        "report": "gryphon-patrol-evidence-final-report-batch-c.json",
        "blueprint": "gryphon-patrol-blueprint-batch-c.json",
        "hypotheses": "gryphon-patrol-mapper-hypotheses-batch-c.md",
        "mapper": "gryphon-patrol-mapper-final-report-batch-c.json",
        "collector_receipt": "evidence-collector-gryphon-patrol-batch-c-v2.json",
        "mapper_receipt": "requirements-mapper-gryphon-patrol-batch-c.json",
        "fixture_key": "negative_fixtures_not_claims", "claim_key": "claims", "count": 15,
    },
}


def sha(data: bytes) -> str:
    """Returns the SHA-256 digest of exact bytes.

    @param data Bytes to digest.
    @returns Lowercase hexadecimal digest.
    """
    return hashlib.sha256(data).hexdigest()


def file_sha(path: Path) -> str:
    """Returns the SHA-256 digest of a file.

    @param path Existing path to digest.
    @returns Lowercase hexadecimal digest.
    """
    return sha(path.read_bytes())


def load(relative: str) -> Any:
    """Loads a JSON artifact relative to the Batch C track directory.

    @param relative Track-relative artifact path.
    @returns Parsed JSON content.
    """
    return json.loads((TRACK_DIR / relative).read_text())


def git_bytes(revision: str, path: str) -> bytes:
    """Reads exact Git object bytes.

    @param revision Reachable Git revision.
    @param path Repository-relative path.
    @returns Exact object bytes.
    @throws AssertionError When Git cannot read the requested object.
    """
    result = subprocess.run(["git", "show", f"{revision}:{path}"], cwd=ROOT, capture_output=True, check=False)
    if result.returncode:
        raise AssertionError(f"git show failed for {revision}:{path}: {result.stderr.decode(errors='replace')}")
    return result.stdout


def text_range(data: bytes, scope: Any) -> bytes:
    """Extracts an inclusive text range from exact object bytes.

    @param data Full text object bytes.
    @param scope String or object line-range declaration.
    @returns Exact inclusive line bytes.
    """
    if isinstance(scope, str):
        start, end = map(int, scope.split(":"))
    else:
        start, end = scope["start_line"], scope["end_line"]
    lines = data.splitlines(keepends=True)
    if start < 1 or end < start or end > len(lines):
        raise AssertionError(f"invalid inclusive range {start}:{end} for {len(lines)} lines")
    return b"".join(lines[start - 1:end])


def claim_id(claim: dict[str, Any]) -> str:
    """Returns a schema-variant claim identifier.

    @param claim Claim record.
    @returns Stable claim identifier.
    """
    return claim.get("claim_id", claim.get("id", ""))


def envelope(claim: dict[str, Any]) -> dict[str, Any]:
    """Returns the source envelope from either v2 schema variant.

    @param claim Selected semantic claim.
    @returns Source-envelope object.
    """
    return claim.get("envelope", claim.get("evidence", {}))


def selected(name: str) -> dict[str, Any]:
    """Selects the single authoritative semantic supersession for one game.

    @param name Game key.
    @returns Selected v2 semantic supersession.
    """
    return load(GAMES[name]["semantic"])


class BatchCFreezeContract(unittest.TestCase):
    """C0 immutable governance and supersession-selection contracts."""

    def test_phase_binding_and_preflight_correction_are_exact(self) -> None:
        """Fails when frozen strategy bytes or additive correction authority drift."""
        binding = load("batch-c-phase-base-binding.json")
        correction = load("batch-c-collector-preflight-correction-v1.json")
        self.assertEqual(binding["phase_base_sha"], PHASE_BASE)
        self.assertEqual(binding["strategy_publication"]["commit_sha"], PHASE_BASE)
        for record in binding["strategy_publication"]["files"]:
            self.assertEqual(file_sha(ROOT / record["path"]), record["sha256"])
            self.assertEqual(git_bytes(PHASE_BASE, record["path"]), (ROOT / record["path"]).read_bytes())
        self.assertEqual(correction["phase_base_sha"], PHASE_BASE)
        self.assertTrue(correction["consumability"]["preflight_role_base_corrected"])
        self.assertFalse(correction["consumability"]["source_claims_accepted"])
        self.assertTrue(correction["consumability"]["mapper_authorized_after_correction"])
        self.assertEqual(len(correction["corrected_packages"]), 2)
        for package in correction["corrected_packages"]:
            for key in ("ledger", "report", "receipt"):
                self.assertEqual(file_sha(ROOT / package[f"{key}_path"]), package[f"{key}_sha256"])

    def test_each_semantic_supersession_selects_original_ids_exactly_once(self) -> None:
        """Fails when an original claim is omitted, duplicated, invented, or still treated as active evidence."""
        for name, game in GAMES.items():
            original = load(game["original"])[game["claim_key"]]
            semantic = selected(name)
            self.assertEqual(file_sha(TRACK_DIR / game["semantic"]), game["semantic_sha"])
            self.assertEqual(semantic["phase_base_sha"], PHASE_BASE)
            self.assertEqual(semantic["source_baseline_revision"], SOURCE_BASE)
            self.assertEqual(file_sha(ROOT / semantic["supersedes"]["path"]), semantic["supersedes"]["sha256"])
            original_ids = [claim_id(claim) for claim in original]
            selected_ids = [claim_id(claim) for claim in semantic["claims"]]
            self.assertEqual(len(selected_ids), game["count"])
            self.assertEqual(selected_ids, original_ids)
            self.assertEqual(len(selected_ids), len(set(selected_ids)))
            self.assertNotEqual(semantic["claims"], original)


class BatchCCollectorPackageContract(unittest.TestCase):
    """C1 collector packages, denominators, and selected source boundaries."""

    def test_complete_denominators_preserve_aliases_and_disclosed_gaps(self) -> None:
        """Fails when accepted source, history, asset, alias, or gap accounting changes."""
        discovery = load("batch-c-discovery-audit.json")["denominator_reconciliation"]
        self.assertEqual(discovery["counts"], {"identity": 2, "source_records": 16, "scene_records": 0, "state_records": 0, "transition_records": 0, "asset_candidates": 7, "historical_records": 14})
        paladin = load(GAMES["paladin"]["original"])["denominator_reconciliation"]
        self.assertEqual(len(paladin["identity"]), 1)
        self.assertEqual(len(paladin["source_records"]), 8)
        self.assertEqual(len(paladin["historical_records"]), 7)
        self.assertEqual(len(paladin["asset_candidates"]), 2)
        self.assertIsNone(paladin["alias_gap"])
        aliases = load(GAMES["paladin"]["original"])["aliases_reconciled"]
        self.assertEqual(aliases, ["paladins-twin-soul", "paladinsTwinSoul", "PaladinsTwinSoulGame", "Paladin's Twin-Soul"])
        gryphon = load(GAMES["gryphon"]["report"])["accepted_denominator_reconciliation"]
        self.assertEqual(gryphon["counts"]["total"], 19)
        self.assertEqual(len(gryphon["historical_records"]), 7)
        self.assertEqual(len(set(gryphon["historical_records"])), 7)
        gaps = " ".join(gryphon["denominator_alias_gaps"])
        self.assertIn("gryphonPatrol.ts", gaps)
        self.assertIn("gryphonPatrolConfig.ts", gaps)

    def test_selected_claims_stay_inside_source_only_boundary(self) -> None:
        """Fails when semantic collectors claim browser, asset usage, mapping, review, or acceptance authority."""
        forbidden = ("browser", "asset suitability", "mapping", "candidate", "acceptance", "review", "implementation")
        for name in GAMES:
            semantic = selected(name)
            boundary = semantic.get("scope_boundary", semantic.get("validation_scope", "")).lower().replace("-", " ")
            for term in forbidden:
                self.assertIn(term, boundary)


class BatchCMapperPackageContract(unittest.TestCase):
    """C2 mapper coverage and fixture-promotion contracts."""

    def test_mapper_covers_each_selected_claim_once_with_grypheon_copy_non_mapping(self) -> None:
        """Fails when mappings lose, duplicate, invent, or promote selected semantic claims."""
        paladin_ids = [claim_id(claim) for claim in selected("paladin")["claims"]]
        paladin_report = load(GAMES["paladin"]["mapper"])
        paladin_mapped = load(GAMES["paladin"]["blueprint"])["claim_coverage"]["mapped_claim_ids"]
        self.assertEqual(paladin_report["result"]["factual_claims_available"], 21)
        self.assertEqual(paladin_report["result"]["factual_claims_mapped"], 21)
        self.assertEqual(paladin_report["result"]["unmapped_factual_claim_ids"], [])
        self.assertEqual(paladin_mapped, paladin_ids)
        gryphon_ids = [claim_id(claim) for claim in selected("gryphon")["claims"]]
        gryphon_report = load(GAMES["gryphon"]["mapper"])
        coverage = gryphon_report["claim_coverage"]
        self.assertEqual(coverage["mapped_or_non_mapping_claim_ids"], gryphon_ids)
        self.assertEqual(coverage["uncovered_collector_claim_ids"], [])
        self.assertEqual(coverage["non_mapping_evidence"], [{"claim_id": "C04-copy", "reason": "Historical UI copy is retained but not required for the structural blueprint."}])
        self.assertEqual(gryphon_report["output_summary"]["historical_claims_mapped"], 15)
        self.assertEqual(gryphon_report["output_summary"]["non_mapping_evidence_claims"], 1)

    def test_all_eight_fixtures_remain_rejected_and_unmapped(self) -> None:
        """Fails when a rejection fixture is promoted to a blueprint, hypothesis, or mapper requirement."""
        expected = {
            "paladin": {"hash-valid-semantic-overstatement", "invalid-directory-or-generated-prose-citation", "fabricated-plausible-mechanic-route-asset", "keyword-or-regex-responsive-claim"},
            "gryphon": {"hash-valid-semantic-overstatement", "invalid-generated-prose-citation", "fabricated-plausible-mechanic", "keyword-selected-responsive-claim"},
        }
        total = 0
        for name, game in GAMES.items():
            fixtures = load(game["original"])[game["fixture_key"]]
            self.assertEqual({item.get("kind", item.get("type")) for item in fixtures}, expected[name])
            mapped = (TRACK_DIR / game["blueprint"]).read_text() + (TRACK_DIR / game["hypotheses"]).read_text()
            for fixture in fixtures:
                total += 1
                identifier = fixture.get("fixture_id", fixture.get("id"))
                self.assertFalse(fixture.get("counts_as_claim", False))
                self.assertTrue(fixture.get("expected_disposition", fixture.get("expected_rejection")))
                self.assertNotIn(identifier, mapped)
        self.assertEqual(total, 8)


class BatchCClaimTruthContract(unittest.TestCase):
    """C3 selected source envelope, atomic assertion, and binary identity contracts."""

    def test_selected_envelopes_recompute_exact_git_bytes_and_paladin_correction(self) -> None:
        """Fails when any selected source envelope does not reproduce blob and cited bytes from Git."""
        for name in GAMES:
            for claim in selected(name)["claims"]:
                item = envelope(claim)
                blob = git_bytes(item["revision"], item["relative_path"])
                self.assertEqual(sha(blob), item["blob_sha256"], claim_id(claim))
                cited = blob if item.get("scope") in ("whole-binary", "whole-binary-file") else text_range(blob, item["inclusive_range"])
                self.assertEqual(sha(cited), item["cited_range_sha256"], claim_id(claim))
        correction = selected("paladin")["identity_correction"]
        self.assertEqual(correction["claim_id"], "PTS-C-IDENTITY-001")
        self.assertEqual(correction["corrected_range"], {"start_line": 181, "end_line": 187})
        self.assertEqual(correction["corrected_cited_range_sha256"], "ff46e4f7c8c67a7dc6af7d37fd4721fb80c139020393178b913e9807cecc58dc")
        self.assertEqual(correction["original_range"], {"start_line": 182, "end_line": 186})
        self.assertEqual(correction["original_cited_range_sha256"], "7d367eb72c717d169c359d267b5b7d2cd9b34f8a58580214a583e10ce88423d6")

    def test_every_atomic_proposition_assertion_and_binary_signature_rederives(self) -> None:
        """Fails when a selected atomic assertion lacks exact cited support, identity, length, or signature."""
        for name in GAMES:
            for claim in selected(name)["claims"]:
                item = envelope(claim)
                blob = git_bytes(item["revision"], item["relative_path"])
                cited = blob if item.get("scope") in ("whole-binary", "whole-binary-file") else text_range(blob, item["inclusive_range"])
                self.assertTrue(claim.get("source_fact"), claim_id(claim))
                self.assertTrue(claim.get("atomic_propositions"), claim_id(claim))
                for proposition in claim["atomic_propositions"]:
                    assertion = proposition["evidence_local_assertion"]
                    kind = assertion["assertion_type"]
                    if kind == "text":
                        self.assertTrue(assertion["required_tokens"])
                        lower = cited.decode(errors="replace").lower()
                        for token in assertion["required_tokens"]:
                            self.assertIn(token.lower(), lower, proposition["proposition_id"])
                    else:
                        self.assertEqual(assertion["whole_file_sha256"], sha(blob), proposition["proposition_id"])
                        if "byte_length" in assertion:
                            self.assertEqual(len(blob), assertion["byte_length"])
                        if "signature_hex" in assertion:
                            self.assertEqual(blob[:len(assertion["signature_hex"]) // 2].hex(), assertion["signature_hex"])
        gryphon_binary = next(claim for claim in selected("gryphon")["claims"] if claim_id(claim) == "C15-asset-binary")
        assertions = [item["evidence_local_assertion"] for item in gryphon_binary["atomic_propositions"]]
        self.assertIn({"assertion_type": "binary-signature", "signature_hex": "ffd8ffe000104a46", "whole_file_sha256": "abc46e828c209b27597d4e3f9d6cf76b0f5b7bf1490e88e045e37f383b74b27b"}, assertions)


class BatchCNegativeFixtureContract(unittest.TestCase):
    """C3 all required negative-fixture rejection contracts."""

    def test_all_eight_fixture_rejections_are_preserved_by_selected_evidence(self) -> None:
        """Fails when fixture rejection evidence is absent, unsupported, or promoted as a semantic claim."""
        for name, game in GAMES.items():
            fixtures = load(game["original"])[game["fixture_key"]]
            selected_ids = {claim_id(claim) for claim in selected(name)["claims"]}
            for fixture in fixtures:
                self.assertTrue(fixture.get("expected_disposition", fixture.get("expected_rejection")))
                self.assertFalse(fixture.get("counts_as_claim", False))
                self.assertNotIn(fixture.get("fixture_id", fixture.get("id")), selected_ids)


class BatchCReceiptContract(unittest.TestCase):
    """V2 collector, mapper, budget, and truth-author receipt contracts."""

    def test_v2_collector_receipts_bind_outputs_preflight_scope_and_budget(self) -> None:
        """Fails when a semantic collector receipt has unbound bytes, scope, provenance, or resource accounting."""
        budget = load("batch-c-budget-declaration.json")
        correction_path = "measure/tracks/apk_corpus_audit_action_defense_20260712/batch-c-collector-preflight-correction-v1.json"
        for name, game in GAMES.items():
            receipt = load(f"role-receipts/{game['collector_receipt']}")
            self.assertEqual(receipt["phase_base_sha"], PHASE_BASE)
            self.assertEqual(receipt["source_baseline_revision"], SOURCE_BASE)
            self.assertFalse(receipt["provider_provenance"]["available"])
            self.assertIsNone(receipt["provider_provenance"]["provider_identifier"])
            self.assertIn(correction_path, receipt["exact_inputs"])
            self.assertEqual(receipt["outputs"][f"measure/tracks/{TRACK}/{game['semantic']}"], game["semantic_sha"])
            self.assertIsNone(receipt["outputs"][f"measure/tracks/{TRACK}/role-receipts/{game['collector_receipt']}"])
            actual = receipt.get("resource_actual") or receipt["resource_budget"]["actual"]
            ceiling = budget["role_ceilings"][f"evidence-collector-{'paladins-twin-soul' if name == 'paladin' else 'gryphon-patrol'}-batch-c"]
            self.assertEqual(set(actual), set(RESOURCE_FIELDS))
            self.assertTrue(all(type(actual[key]) is int and actual[key] <= ceiling[key] for key in RESOURCE_FIELDS))
            scope = json.dumps(receipt).lower()
            self.assertIn("forbidden_work_not_performed" if name == "paladin" else "no browser interaction", scope)

    def test_original_mapper_receipts_and_reports_remain_bound_to_corrected_preflight(self) -> None:
        """Fails when an original mapper loses its correction binding, budget, or non-authoritative boundary."""
        budget = load("batch-c-budget-declaration.json")
        for name, game in GAMES.items():
            report = load(game["mapper"])
            receipt = load(f"role-receipts/{game['mapper_receipt']}")
            self.assertIn("non-authoritative", report["status"])
            self.assertEqual(report.get("bindings", report)["phase_base_sha"], PHASE_BASE)
            actual = receipt.get("resource_actual", receipt.get("resource_budget", {}).get("actual"))
            role = receipt["role"]
            self.assertEqual(set(actual), set(RESOURCE_FIELDS))
            self.assertTrue(all(type(actual[key]) is int and actual[key] <= budget["role_ceilings"][role][key] for key in RESOURCE_FIELDS))

    def test_v2_truth_author_receipt_binds_exact_inputs_output_and_honest_execution(self) -> None:
        """Fails when this role receipt changes bases, inputs, output bytes, resources, or reported test result."""
        receipt = json.loads(RECEIPT.read_text())
        self.assertEqual(receipt["role"], "truth-test-author-batch-c-v2")
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE)
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE)
        self.assertEqual(receipt["source_baseline_revision"], SOURCE_BASE)
        self.assertFalse(receipt["provider_provenance"]["available"])
        for path, digest in receipt["exact_inputs"].items():
            self.assertEqual(file_sha(ROOT / path), digest, path)
        self.assertEqual(receipt["outputs"][str(HERE.relative_to(ROOT))], file_sha(HERE))
        self.assertIsNone(receipt["outputs"][str(RECEIPT.relative_to(ROOT))])
        actual = receipt["resource_actual"]
        ceiling = load("batch-c-budget-declaration.json")["role_ceilings"]["truth-test-author-batch-c"]
        self.assertEqual(set(actual), set(RESOURCE_FIELDS))
        self.assertTrue(all(type(actual[key]) is int and actual[key] <= ceiling[key] for key in RESOURCE_FIELDS))
        execution = receipt["test_execution"]
        self.assertEqual(execution["command"], f"PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q {HERE.relative_to(ROOT)}")
        self.assertRegex(execution["stdout_sha256"], r"^[0-9a-f]{64}$")
        self.assertEqual((execution["passed"], execution["failed"]), (12, 4))


class BatchCBrowserContract(unittest.TestCase):
    """C4 browser evidence gate, intentionally red until its future artifacts exist."""

    def test_real_browser_audit_and_receipt_exist(self) -> None:
        """Fails when the independently owned browser artifacts are absent."""
        self.assertTrue((TRACK_DIR / "batch-c-browser-audit.json").is_file(), "EXPECTED_STAGE_RED[C4_BROWSER]: browser audit absent")
        self.assertTrue((TRACK_DIR / "role-receipts/browser-auditor-batch-c.json").is_file(), "EXPECTED_STAGE_RED[C4_BROWSER]: browser receipt absent")


class BatchCAssetContract(unittest.TestCase):
    """C4 asset evidence gate, intentionally red until its future artifacts exist."""

    def test_asset_usage_audit_and_receipt_exist(self) -> None:
        """Fails when the independently owned asset artifacts are absent."""
        self.assertTrue((TRACK_DIR / "batch-c-asset-usage-audit.json").is_file(), "EXPECTED_STAGE_RED[C4_ASSET]: asset audit absent")
        self.assertTrue((TRACK_DIR / "role-receipts/asset-auditor-batch-c.json").is_file(), "EXPECTED_STAGE_RED[C4_ASSET]: asset receipt absent")


class BatchCIndependentReviewContract(unittest.TestCase):
    """C5 independent-review gate, intentionally red until its future artifacts exist."""

    def test_fresh_review_and_receipt_exist_with_no_blockers(self) -> None:
        """Fails when an independently owned review is absent or retains material findings."""
        path = TRACK_DIR / "batch-c-adversarial-review.json"
        self.assertTrue(path.is_file(), "EXPECTED_STAGE_RED[C5_REVIEW]: fresh review absent")
        self.assertTrue((TRACK_DIR / "role-receipts/adversarial-reviewer-batch-c.json").is_file(), "EXPECTED_STAGE_RED[C5_REVIEW]: reviewer receipt absent")
        unresolved = json.loads(path.read_text())["unresolved_findings"]
        self.assertEqual((unresolved["critical"], unresolved["high"], unresolved["medium"]), (0, 0, 0))


class BatchCAcceptanceContract(unittest.TestCase):
    """C5 lifecycle gate, intentionally red until its future artifacts exist."""

    def test_candidate_acceptance_and_accepted_manifest_exist_in_order(self) -> None:
        """Fails when independently owned candidate and acceptance artifacts are absent."""
        for name, marker in (("candidate-cohort-manifest-batch-c.json", "C5_CANDIDATE"), ("product-owner-acceptance-batch-c.json", "C5_ACCEPTANCE"), ("accepted-cohort-manifest-batch-c.json", "C5_ACCEPTED")):
            self.assertTrue((TRACK_DIR / name).is_file(), f"EXPECTED_STAGE_RED[{marker}]: {name} absent")


if __name__ == "__main__":
    unittest.main()
