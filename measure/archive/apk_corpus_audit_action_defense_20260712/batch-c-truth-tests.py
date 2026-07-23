"""Independent, fail-closed truth contracts for the two Batch C packages."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import unittest
from pathlib import Path
from typing import Any


TRACK = "apk_corpus_audit_action_defense_20260712"
PHASE = "Phase 3: Batch C evidence packages"
PHASE_BASE = "709b0c69608312aa5d784fcc9c1b74870ce697e0"
ROLE_BASE = "9f9bee80d28eb8b384f9f30fe0ae9f53db47fda2"
SOURCE_BASE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
HERE = Path(__file__).resolve()
ROOT = HERE.parents[3]
TRACK_DIR = HERE.parent
RECEIPT = TRACK_DIR / "role-receipts/truth-test-author-batch-c.json"

GAMES = {
    "paladin": {
        "ledger": "paladins-twin-soul-claim-ledger-batch-c.json",
        "report": "paladins-twin-soul-evidence-final-report-batch-c.json",
        "method": "paladins-twin-soul-evidence-method-batch-c.md",
        "blueprint": "paladins-twin-soul-blueprint-batch-c.json",
        "hypotheses": "paladins-twin-soul-mapper-hypotheses-batch-c.md",
        "mapper_report": "paladins-twin-soul-mapper-final-report-batch-c.json",
        "collector_receipt": "evidence-collector-paladins-twin-soul-batch-c.json",
        "mapper_receipt": "requirements-mapper-paladins-twin-soul-batch-c.json",
        "fixture_key": "negative_fixtures",
        "claim_key": "claims",
    },
    "gryphon": {
        "ledger": "gryphon-patrol-claim-ledger-batch-c.json",
        "report": "gryphon-patrol-evidence-final-report-batch-c.json",
        "method": "gryphon-patrol-evidence-method-batch-c.md",
        "blueprint": "gryphon-patrol-blueprint-batch-c.json",
        "hypotheses": "gryphon-patrol-mapper-hypotheses-batch-c.md",
        "mapper_report": "gryphon-patrol-mapper-final-report-batch-c.json",
        "collector_receipt": "evidence-collector-gryphon-patrol-batch-c.json",
        "mapper_receipt": "requirements-mapper-gryphon-patrol-batch-c.json",
        "fixture_key": "negative_fixtures_not_claims",
        "claim_key": "claims",
    },
}
RESOURCE_FIELDS = (
    "source_bytes_read", "source_files_or_objects_read", "command_invocations",
    "elapsed_minutes", "records_authored_or_reviewed", "browser_interactions",
    "browser_artifacts_captured", "asset_candidates_inspected",
)


def sha(data: bytes) -> str:
    """Returns the SHA-256 digest for exact bytes.

    @param data Bytes to digest.
    @returns Lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(data).hexdigest()


def file_sha(path: Path) -> str:
    """Returns the SHA-256 digest of a file.

    @param path Existing file to digest.
    @returns Lowercase hexadecimal SHA-256 digest.
    """
    return sha(path.read_bytes())


def load(relative: str) -> Any:
    """Loads a JSON artifact relative to the track directory.

    @param relative Track-relative filename.
    @returns Parsed JSON value.
    """
    return json.loads((TRACK_DIR / relative).read_text())


def git(*argv: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one bounded Git command from the repository root.

    @param argv Git arguments excluding the executable.
    @returns Completed process with captured byte streams.
    """
    return subprocess.run(["git", *argv], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)


def git_bytes(revision: str, path: str) -> bytes:
    """Reads the exact Git object bytes for one revision and path.

    @param revision Reachable Git revision.
    @param path Repository-relative path.
    @returns Exact object bytes.
    """
    result = git("show", f"{revision}:{path}")
    if result.returncode:
        raise AssertionError(f"git show failed for {revision}:{path}: {result.stderr.decode(errors='replace')}")
    return result.stdout


def text_range(data: bytes, start: int, end: int) -> bytes:
    """Extracts an inclusive LF-terminated text range.

    @param data Full text object bytes.
    @param start One-indexed first line.
    @param end One-indexed final line.
    @returns Exact selected line bytes.
    """
    lines = data.splitlines(keepends=True)
    if start < 1 or end < start or end > len(lines):
        raise AssertionError(f"invalid inclusive range {start}:{end} for {len(lines)} lines")
    return b"".join(lines[start - 1:end])


def claim_id(claim: dict[str, Any]) -> str:
    """Returns the schema-variant claim identifier.

    @param claim Ledger claim.
    @returns Stable claim identifier.
    """
    return claim.get("claim_id", claim.get("id", ""))


def claim_envelope(claim: dict[str, Any]) -> tuple[str, str, Any, str, str]:
    """Normalizes the two collector envelope schema variants.

    @param claim Ledger claim.
    @returns Revision, path, text/binary scope, blob digest, and cited digest.
    """
    evidence = claim.get("evidence", claim)
    return (
        evidence["revision"], evidence.get("relative_path", evidence.get("path")),
        evidence.get("inclusive_range", evidence.get("range", evidence.get("scope"))),
        evidence["blob_sha256"], evidence.get("cited_range_sha256", evidence.get("range_sha256")),
    )


def normalized_terms(statement: str) -> list[str]:
    """Selects explicit semantic tokens from a factual statement.

    @param statement Source fact to check.
    @returns Meaningful literal tokens that must appear in cited source.
    """
    stop = {"the", "and", "with", "from", "this", "that", "only", "when", "where", "does", "not", "its", "for", "are", "has", "was", "into", "than", "also", "which", "source", "historical"}
    return [word.lower() for word in re.findall(r"[A-Za-z][A-Za-z0-9_-]{3,}", statement) if word.lower() not in stop][:8]


class BatchCFreezeContract(unittest.TestCase):
    """C0 immutable strategy, phase, and scope contracts."""

    def test_phase_binding_recomputes_strategy_publication_bytes(self) -> None:
        """Fails when: the binding, exact phase commit, or any strategy publication hash drifts."""
        binding = load("batch-c-phase-base-binding.json")
        self.assertEqual(binding["phase_base_sha"], PHASE_BASE)
        self.assertEqual(binding["strategy_publication"]["commit_sha"], PHASE_BASE)
        for record in binding["strategy_publication"]["files"]:
            current = (ROOT / record["path"]).read_bytes()
            self.assertEqual(sha(current), record["sha256"], record["path"])
            self.assertEqual(git_bytes(PHASE_BASE, record["path"]), current, record["path"])

    def test_frozen_governance_is_scoped_and_bound(self) -> None:
        """Fails when: Batch C scope, source baseline, or phase binding differs across governance artifacts."""
        strategy = (TRACK_DIR / "test-strategy-batch-c.md").read_text()
        budget, applicability, discovery = (load(name) for name in (
            "batch-c-budget-declaration.json", "batch-c-role-applicability.json", "batch-c-discovery-audit.json"))
        self.assertIn("Paladin's Twin-Soul", strategy)
        self.assertIn("Gryphon Patrol", strategy)
        self.assertEqual(budget["source_baseline_revision"], SOURCE_BASE)
        self.assertEqual(applicability["source_baseline_revision"], SOURCE_BASE)
        self.assertEqual(discovery["phase_base_sha"], PHASE_BASE)
        self.assertEqual(discovery["source_baseline_revision"], SOURCE_BASE)


class BatchCCollectorPackageContract(unittest.TestCase):
    """C1 collector package and bounded-command contracts."""

    def test_collector_packages_are_complete_and_marked(self) -> None:
        """Fails when: either collector omits a required package artifact, claim set, fixture set, or marker."""
        for game in GAMES.values():
            ledger, report = load(game["ledger"]), load(game["report"])
            self.assertTrue((TRACK_DIR / game["method"]).is_file())
            self.assertEqual(len(ledger[game["claim_key"]]), report.get("ledger_claim_count", report.get("summary", {}).get("factual_claim_count")))
            self.assertEqual(len(ledger[game["fixture_key"]]), 4)
            self.assertIn("MEASURE_AGENT_RESULT", (TRACK_DIR / game["method"]).read_text())

    def test_bounded_absence_commands_recompute_argv_exit_output_and_hash(self) -> None:
        """Fails when: any declared bounded absence command, exit code, output, line count, or digest is inaccurate."""
        paladin = load(GAMES["paladin"]["ledger"])["current_absence"]
        gryphon = load(GAMES["gryphon"]["report"])["bounded_absence"]
        for record in (paladin, gryphon):
            result = subprocess.run(record["argv"] if "argv" in record else record["command_argv"], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            self.assertEqual(result.returncode, record["exit_status"])
            self.assertEqual(sha(result.stdout), record["stdout_sha256"])
            if "stdout" in record:
                self.assertEqual(result.stdout.decode(), record["stdout"])
            if "stdout_line_count" in record:
                self.assertEqual(len(result.stdout.splitlines()), record["stdout_line_count"])

    def test_denominator_reconciliation_accounts_for_alias_gaps(self) -> None:
        """Fails when: accepted denominator items are duplicated, omitted, invented, or Gryphon camelCase/config gaps are hidden."""
        discovery = load("batch-c-discovery-audit.json")["denominator_reconciliation"]
        paladin = load(GAMES["paladin"]["ledger"])["denominator_reconciliation"]
        gryphon = load(GAMES["gryphon"]["report"])["accepted_denominator_reconciliation"]
        self.assertEqual(len(paladin["identity"]), 1)
        self.assertEqual(len(paladin["source_records"]), 8)
        self.assertEqual(len(paladin["historical_records"]), 7)
        self.assertEqual(len(paladin["asset_candidates"]), 2)
        self.assertIsNone(paladin["alias_gap"])
        # Documentation is a source-record denominator; only the two PNGs are
        # asset candidates, so do not double-count metadata as an asset.
        self.assertEqual(len([item for item in discovery["source_records"] if "paladins-twin-soul" in item]), 8)
        self.assertEqual(len([item for item in discovery["historical_records"] if "paladins-twin-soul" in item]), 7)
        self.assertEqual(len([item for item in discovery["asset_candidates"] if item.endswith(".png") and "paladins-twin-soul" in item]), 2)
        self.assertEqual(gryphon["counts"]["total"], 19)
        gaps = " ".join(gryphon["denominator_alias_gaps"])
        self.assertIn("gryphonPatrol.ts", gaps)
        self.assertIn("gryphonPatrolConfig.ts", gaps)
        self.assertEqual(len(gryphon["historical_records"]), 7)
        self.assertEqual(len(set(gryphon["historical_records"])), 7)


class BatchCMapperPackageContract(unittest.TestCase):
    """C2 mapper coverage and fixture-separation contracts."""

    def test_every_collector_claim_is_mapped_exactly_once_or_explicitly_non_mapping(self) -> None:
        """Fails when: a mapper loses, duplicates, invents, or leaves a collector claim without exact disposition."""
        for name, game in GAMES.items():
            ledger = load(game["ledger"])
            expected = {claim_id(claim) for claim in ledger[game["claim_key"]]}
            report = load(game["mapper_report"])
            if name == "paladin":
                actual = set(report["result"]["unmapped_factual_claim_ids"]) | set(load(game["blueprint"])["claim_coverage"]["mapped_claim_ids"])
            else:
                coverage = report["claim_coverage"]
                actual = set(coverage["mapped_or_non_mapping_claim_ids"])
            self.assertEqual(actual, expected)
            self.assertEqual(len(actual), len(expected))

    def test_negative_fixtures_are_not_promoted_to_mapping(self) -> None:
        """Fails when: any fixture identifier or proposed false claim becomes mapper coverage or a requirement."""
        for game in GAMES.values():
            ledger = load(game["ledger"])
            fixture_ids = [fixture.get("fixture_id", fixture.get("id")) for fixture in ledger[game["fixture_key"]]]
            mapped_bytes = (TRACK_DIR / game["blueprint"]).read_text() + (TRACK_DIR / game["hypotheses"]).read_text()
            self.assertFalse(any(identifier in mapped_bytes for identifier in fixture_ids))
            self.assertIn("non-authoritative", load(game["mapper_report"])["status"].lower())


class BatchCClaimTruthContract(unittest.TestCase):
    """C3 all-source envelope, semantics, and atomicity contracts."""

    def test_every_positive_envelope_recomputes_from_git(self) -> None:
        """Fails when: any positive text or binary envelope has a non-Git revision, path, range, blob hash, or cited hash."""
        defects: list[str] = []
        for game in GAMES.values():
            for claim in load(game["ledger"])[game["claim_key"]]:
                identifier = claim_id(claim)
                try:
                    revision, path, scope, blob_digest, cited_digest = claim_envelope(claim)
                    blob = git_bytes(revision, path)
                    if sha(blob) != blob_digest:
                        defects.append(f"{identifier}:blob")
                    if scope in ("whole-binary", "whole-binary-file"):
                        cited = blob
                    elif isinstance(scope, str):
                        start, end = map(int, scope.split(":"))
                        cited = text_range(blob, start, end)
                    else:
                        cited = text_range(blob, scope["start_line"], scope["end_line"])
                    if sha(cited) != cited_digest:
                        defects.append(f"{identifier}:cited")
                except (KeyError, ValueError, AssertionError) as error:
                    defects.append(f"{identifier}:{error}")
        self.assertEqual(defects, [])

    def test_source_facts_have_explicit_semantic_and_atomic_proposition_support(self) -> None:
        """Fails when: a hash-valid source fact lacks atomic propositions or required semantic tokens in its cited range."""
        defects: list[str] = []
        for game in GAMES.values():
            for claim in load(game["ledger"])[game["claim_key"]]:
                identifier = claim_id(claim)
                revision, path, scope, _, _ = claim_envelope(claim)
                blob = git_bytes(revision, path)
                if scope in ("whole-binary", "whole-binary-file"):
                    cited = blob
                elif isinstance(scope, str):
                    cited = text_range(blob, *map(int, scope.split(":")))
                else:
                    cited = text_range(blob, scope["start_line"], scope["end_line"])
                source_fact = claim.get("source_fact", "")
                # A bare prose compound has no independently checkable clause boundary.
                propositions = claim.get("atomic_propositions")
                if not isinstance(propositions, list) or not propositions:
                    defects.append(f"{identifier}:missing-atomic-propositions")
                    continue
                cited_lower = cited.decode(errors="replace").lower()
                for proposition in propositions:
                    tokens = proposition.get("required_tokens", []) if isinstance(proposition, dict) else []
                    if not tokens or any(str(token).lower() not in cited_lower for token in tokens):
                        defects.append(f"{identifier}:unsupported-proposition")
                if not source_fact or not normalized_terms(source_fact):
                    defects.append(f"{identifier}:empty-semantic-fact")
        self.assertEqual(defects, [])


class BatchCNegativeFixtureContract(unittest.TestCase):
    """C3 required rejection-fixture contracts."""

    def test_all_eight_negative_fixtures_are_rederived_and_rejected(self) -> None:
        """Fails when: a required fixture type is absent, counts as coverage, lacks rejection text, or its false proposition is supported."""
        required = {"hash-valid-semantic-overstatement", "invalid-directory-or-generated-prose-citation", "fabricated-plausible-mechanic-route-asset", "keyword-or-regex-responsive-claim"}
        gryphon_variants = {"hash-valid-semantic-overstatement", "invalid-generated-prose-citation", "fabricated-plausible-mechanic", "keyword-selected-responsive-claim"}
        total = 0
        for name, game in GAMES.items():
            fixtures = load(game["ledger"])[game["fixture_key"]]
            kinds = {fixture.get("kind", fixture.get("type")) for fixture in fixtures}
            self.assertEqual(kinds, required if name == "paladin" else gryphon_variants)
            for fixture in fixtures:
                total += 1
                self.assertFalse(fixture.get("counts_as_claim", False))
                self.assertTrue(fixture.get("expected_disposition", fixture.get("expected_rejection")))
                false_claim = fixture.get("proposed_claim", fixture.get("proposed_false_statement", "")).lower()
                self.assertNotIn("verified usable", false_claim if "responsive" not in str(fixture) else "")
        self.assertEqual(total, 8)


class BatchCReceiptContract(unittest.TestCase):
    """Receipt, frozen budget, and preflight-correction contracts."""

    def test_preflight_correction_is_additive_and_exact(self) -> None:
        """Fails when: the correction omits either collector, mutates a cited package, or authorizes source claims."""
        correction = load("batch-c-collector-preflight-correction-v1.json")
        self.assertEqual(correction["phase_base_sha"], PHASE_BASE)
        self.assertTrue(correction["consumability"]["preflight_role_base_corrected"])
        self.assertFalse(correction["consumability"]["source_claims_accepted"])
        self.assertEqual(len(correction["corrected_packages"]), 2)
        for package in correction["corrected_packages"]:
            for key in ("ledger", "report", "receipt"):
                self.assertEqual(file_sha(ROOT / package[f"{key}_path"]), package[f"{key}_sha256"])

    def test_package_receipts_bind_outputs_and_labeled_budget_actuals(self) -> None:
        """Fails when: a collector or mapper receipt misbinds output bytes, omits labeled resource actuals, or exceeds its frozen ceiling."""
        budget = load("batch-c-budget-declaration.json")
        for game in GAMES.values():
            for receipt_name in (game["collector_receipt"], game["mapper_receipt"]):
                receipt = load(f"role-receipts/{receipt_name}")
                role = receipt["role"]
                ceiling = budget["role_ceilings"][role]
                actual = receipt.get("resource_budget", receipt.get("resource_actual"))
                actual = actual.get("actual", actual) if isinstance(actual, dict) else actual
                self.assertEqual(set(actual), set(RESOURCE_FIELDS), receipt_name)
                for field in RESOURCE_FIELDS:
                    self.assertIs(type(actual[field]), int, f"{receipt_name}:{field}")
                    self.assertLessEqual(actual[field], ceiling[field], f"{receipt_name}:{field}")
                outputs = receipt.get("outputs", receipt.get("exact_outputs", receipt.get("output_hashes", {})))
                for path, digest in outputs.items():
                    if digest is not None and path != "hashing_status":
                        full_path = ROOT / (path if path.startswith("measure/") else f"measure/tracks/{TRACK}/role-receipts/{path}" if path.startswith("role-receipts/") else f"measure/tracks/{TRACK}/{path}")
                        self.assertEqual(file_sha(full_path), digest, f"{receipt_name}:{path}")

    def test_truth_author_receipt_binds_exact_inputs_test_output_and_bases(self) -> None:
        """Fails when: this receipt selects different bases, input bytes, captured test output, resource actuals, or provider availability."""
        receipt = json.loads(RECEIPT.read_text())
        self.assertEqual(receipt["role"], "truth-test-author-batch-c")
        self.assertEqual(receipt["role_base_sha"], ROLE_BASE)
        self.assertEqual(receipt["phase_base_sha"], PHASE_BASE)
        self.assertFalse(receipt["provider_provenance"]["available"])
        self.assertIsNone(receipt["provider_provenance"]["provider_identifier"])
        for path, digest in receipt["exact_inputs"].items():
            self.assertEqual(file_sha(ROOT / path), digest, path)
        self.assertEqual(receipt["outputs"][str(HERE.relative_to(ROOT))], file_sha(HERE))
        actual = receipt["resource_actual"]
        self.assertEqual(set(actual), set(RESOURCE_FIELDS))
        for field, ceiling in load("batch-c-budget-declaration.json")["role_ceilings"]["truth-test-author-batch-c"].items():
            self.assertIs(type(actual[field]), int)
            self.assertLessEqual(actual[field], ceiling)
        output = receipt["test_execution"]
        self.assertEqual(output["command"], f"PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q {HERE.relative_to(ROOT)}")
        self.assertRegex(output["stdout_sha256"], r"^[0-9a-f]{64}$")
        self.assertIsInstance(output["passed"], int)
        self.assertIsInstance(output["failed"], int)


class BatchCBrowserContract(unittest.TestCase):
    """C4 real-browser evidence gate."""

    def test_real_browser_audit_and_receipt_exist(self) -> None:
        """Fails when: the later-stage browser auditor has not supplied both real-input evidence and its receipt."""
        self.assertTrue((TRACK_DIR / "batch-c-browser-audit.json").is_file(), "EXPECTED_STAGE_RED[C4_BROWSER]: browser audit absent")
        self.assertTrue((TRACK_DIR / "role-receipts/browser-auditor-batch-c.json").is_file(), "EXPECTED_STAGE_RED[C4_BROWSER]: browser receipt absent")


class BatchCAssetContract(unittest.TestCase):
    """C4 asset-usage evidence gate."""

    def test_asset_usage_audit_and_receipt_exist(self) -> None:
        """Fails when: the later-stage asset auditor has not reconciled every assigned asset and supplied its receipt."""
        self.assertTrue((TRACK_DIR / "batch-c-asset-usage-audit.json").is_file(), "EXPECTED_STAGE_RED[C4_ASSET]: asset audit absent")
        self.assertTrue((TRACK_DIR / "role-receipts/asset-auditor-batch-c.json").is_file(), "EXPECTED_STAGE_RED[C4_ASSET]: asset receipt absent")


class BatchCIndependentReviewContract(unittest.TestCase):
    """C5 fresh independent-review gate."""

    def test_fresh_review_and_receipt_exist_with_no_blockers(self) -> None:
        """Fails when: a later fresh review or receipt is absent, or reports unresolved Critical, High, or Medium findings."""
        path = TRACK_DIR / "batch-c-adversarial-review.json"
        self.assertTrue(path.is_file(), "EXPECTED_STAGE_RED[C5_REVIEW]: fresh review absent")
        self.assertTrue((TRACK_DIR / "role-receipts/adversarial-reviewer-batch-c.json").is_file(), "EXPECTED_STAGE_RED[C5_REVIEW]: reviewer receipt absent")
        review = json.loads(path.read_text())
        unresolved = review["unresolved_findings"]
        self.assertEqual((unresolved["critical"], unresolved["high"], unresolved["medium"]), (0, 0, 0))


class BatchCAcceptanceContract(unittest.TestCase):
    """C5 candidate, acceptance, and accepted-manifest lifecycle gate."""

    def test_candidate_acceptance_and_accepted_manifest_exist_in_order(self) -> None:
        """Fails when: later candidate, owner acceptance, or accepted-manifest artifacts have not been published in lifecycle order."""
        candidate = TRACK_DIR / "candidate-cohort-manifest-batch-c.json"
        acceptance = TRACK_DIR / "product-owner-acceptance-batch-c.json"
        accepted = TRACK_DIR / "accepted-cohort-manifest-batch-c.json"
        self.assertTrue(candidate.is_file(), "EXPECTED_STAGE_RED[C5_CANDIDATE]: candidate absent")
        self.assertTrue(acceptance.is_file(), "EXPECTED_STAGE_RED[C5_ACCEPTANCE]: owner acceptance absent")
        self.assertTrue(accepted.is_file(), "EXPECTED_STAGE_RED[C5_ACCEPTED]: accepted manifest absent")


if __name__ == "__main__":
    unittest.main()
