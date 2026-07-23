"""Source-semantic truth gates for T7 Special/Historical Batch B.

These tests validate the evidence-stage package and its non-consumable candidate.
They deliberately reject product-owner acceptance or an accepted manifest; those
lifecycle stages require later explicit project-owner direction and separate action.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
TRACK = ROOT / "measure/tracks/apk_corpus_audit_special_historical_20260712"
UPPER = "a49ebcc4dc3b3792a96b5b114d729b0b542af0fe"
HISTORICAL_BABEL = "c76f6af3f62c03979f5073a871e775afd952a070"
RETIRED_BABEL = "0ee9184728c11188c40b27c23fa649a9b67952dc"
ACCEPTED_BATCH_A_SHA256 = "ef8aeb1917dcf0f34363e25aa359d4743bc98b9f8a8f2afd50bb929348440d18"
CLASSES = {
    "current_implementation",
    "historical_implementation",
    "active_specification",
    "catalog_prose",
    "cancelled_design",
    "unknown",
}
FIXTURE_CLASSES = {
    "catalog_promotion",
    "cancelled_design_promotion",
    "specification_promotion",
    "historical_promotion",
    "analogy_substitution",
    "semantic_overstatement",
}

HAUNTED_LEDGER = TRACK / "packages/the-haunted-library/claim-ledger-batch-b.json"
BABEL_LEDGER = TRACK / "packages/babel-architect/claim-ledger-batch-b.json"
READINESS = TRACK / "batch-b/candidate-readiness-package.json"

SEMANTIC_TOKENS = {
    "HL-CUR-001": ["HauntedLibraryGame", "ssr: false"],
    "HL-CUR-002": ["haunted-library/sentences", "INSUFFICIENT_SENTENCES"],
    "HL-CUR-003": ["haunted-library/complete", "idempotencyKey", "xpEarned"],
    "HL-CUR-004": ["'start' | 'playing' | 'ended'", "createLibraryState"],
    "HL-CUR-005": ["floorCount", "easy' ? 3", "medium' ? 4 : 5"],
    "HL-CUR-006": ["wordIndex: null", "trapDoorCount"],
    "HL-CUR-007": ["ghostCount", "bats: []", "phase: 'playing'"],
    "HL-CUR-008": ["GRAVITY", "TRAMPOLINE_FORCE", "player.state = 'jumping'"],
    "HL-CUR-009": ["stunTimer", "BAT_SPEED", "Remove bat on hit"],
    "HL-CUR-010": ["nextWordIndex", "Spawn bat", "stunTimer: 2000"],
    "HL-CUR-011": ["phase = 'victory'", "phase = 'defeat'"],
    "HL-CUR-012": ["library floors", "trampolines", "correct order"],
    "HL-CUR-013": ["GameEndScreen", "calculateXP"],
    "HL-CUR-014": ["gameState.floors", "gameState.doors", "VirtualDPad"],
    "HL-CUR-015": ["createSentencesRoute", "SAMPLE_SENTENCES"],
    "HL-CUR-016": ["createCompleteRoute", "POST"],
    "HL-HIST-001": ["floorCount", "ghosts", "phase: 'playing'"],
    "HL-HIST-002": ["TRAMPOLINE_FORCE", "nextWordIndex", "victory", "defeat"],
    "BA-HIST-001": ["BabelArchitectPhase", "placedBlocks", "idempotencyKey"],
    "BA-HIST-002": ["timeLimitMs", "errorStabilityCost", "stabilityDecayPerSecond"],
    "BA-HIST-003": ["playableSentences", "stability: MAX_STABILITY"],
    "BA-HIST-004": ["isCorrect", "placedBlocks", "phase", "defeat"],
    "BA-HIST-005": ["safeDelta", "timeLimitMs", "timeout"],
    "BA-HIST-006": ["gameType: \"babel-architect\"", "idempotencyKey", "completedSentences"],
    "BA-HIST-007": ["phase: \"victory\"", "sentence-complete", "stability"],
    "BA-HIST-008": ["dumb renderer", "onPlaceBlock", "owns no learning rules"],
    "BA-HIST-009": ["reconcileActiveBlocks", "reconcilePlacedBlocks", "stable"],
    "BA-HIST-010": ["\"start\" | \"playing\" | \"ended\"", "placeBlockRef"],
    "BA-HIST-011": ["requestAnimationFrame", "clampedDelta", "setState"],
    "BA-HIST-012": ["completeBabelArchitectRun", "hasReportedRef", "onComplete"],
    "BA-HIST-013": ["event.key < \"1\"", "placeBlockRef"],
    "BA-HIST-014": ["babel-architect/sentences", "INSUFFICIENT_SENTENCES"],
    "BA-CANCEL-001": ["\"status\": \"cancelled\"", "implementation code not retained", "never performed"],
    "BA-CANCEL-002": ["deferred:cancelled-by-user", "Verify 390×844", "Verify completion"],
}


def load(path: Path) -> dict:
    """Load one JSON evidence artifact.

    Args:
        path: Repository path to the JSON document.

    Returns:
        Parsed JSON object.
    """

    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    """Hash one evidence artifact as committed bytes.

    Args:
        path: Repository path to hash.

    Returns:
        Lowercase SHA-256 digest.
    """

    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    """Run a bounded Git command from the repository root.

    Args:
        args: Git subcommand and arguments.
        check: Whether a nonzero exit should raise.

    Returns:
        Completed Git process with captured output.
    """

    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def claims() -> list[dict]:
    """Return all factual Batch B claims.

    Returns:
        Haunted Library and Babel Architect claim records.
    """

    return load(HAUNTED_LEDGER)["claims"] + load(BABEL_LEDGER)["claims"]


class TestBatchBTruthContract:
    """Validate source truth, chronology, unknowns, and lifecycle fail-closure."""

    def test_accepted_batch_a_exact_hash_opens_batch_b(self) -> None:
        """Fails when: Batch B does not bind the exact accepted Batch A bytes."""

        discovery = load(TRACK / "batch-b/discovery-audit.json")
        binding = discovery["accepted_batch_a_prerequisite"]
        accepted = TRACK / "batch-a/accepted-manifest.json"
        assert sha256(accepted) == ACCEPTED_BATCH_A_SHA256 == binding["sha256"]
        assert binding["status"] == "accepted"
        assert binding["consumable"] is True
        assert binding["revoked"] is False

    def test_exact_two_identity_denominator(self) -> None:
        """Fails when: Batch B omits, duplicates, or adds an identity."""

        discovery = load(TRACK / "batch-b/discovery-audit.json")
        assert [entry["game"] for entry in discovery["identities"]] == [
            "The Haunted Library",
            "Babel Architect",
        ]
        assert all(entry["accepted_partition_matches"] == 1 for entry in discovery["identities"])
        assert discovery["denominator_mismatches"] == 0

    def test_every_factual_claim_has_an_exact_reproducible_envelope(self) -> None:
        """Fails when: a source revision/path/range or either SHA-256 drifts."""

        for claim in claims():
            blob = git("show", f"{claim['revision']}:{claim['path']}").stdout
            lines = blob.splitlines(keepends=True)
            cited = b"".join(lines[claim["start_line"] - 1 : claim["end_line"]])
            assert len(cited) > 0, claim["claim_id"]
            assert hashlib.sha256(blob).hexdigest() == claim["blob_sha256"], claim["claim_id"]
            assert hashlib.sha256(cited).hexdigest() == claim["cited_range_sha256"], claim["claim_id"]

    def test_every_claim_is_semantically_rederived(self) -> None:
        """Fails when: an exact hash does not contain the atoms the claim asserts."""

        records = {claim["claim_id"]: claim for claim in claims()}
        assert set(records) == set(SEMANTIC_TOKENS)
        for claim_id, tokens in SEMANTIC_TOKENS.items():
            claim = records[claim_id]
            blob = git("show", f"{claim['revision']}:{claim['path']}").stdout.decode("utf-8")
            lines = blob.splitlines(keepends=True)
            cited = "".join(lines[claim["start_line"] - 1 : claim["end_line"]])
            for token in tokens:
                assert token in cited, f"{claim_id} missing semantic token {token!r}"

    def test_source_classes_are_closed_and_revision_correct(self) -> None:
        """Fails when: historical bytes are promoted to current or a class is invented."""

        for claim in claims():
            assert claim["source_class"] in CLASSES
            if claim["source_class"] == "current_implementation":
                assert claim["revision"] == UPPER
            if claim["source_class"] == "historical_implementation":
                assert claim["revision"] != UPPER or claim["claim_id"].startswith("HL-HIST-") is False
            if claim["claim_id"].startswith("BA-HIST-"):
                assert claim["revision"] == HISTORICAL_BABEL
            if claim["claim_id"].startswith("BA-CANCEL-"):
                assert claim["source_class"] == "cancelled_design"
                assert claim["revision"] == UPPER

    def test_haunted_library_covers_every_modeled_floor_and_state(self) -> None:
        """Fails when: a difficulty floor count, lifecycle, rules phase, or entity is omitted."""

        observations = load(
            TRACK / "packages/the-haunted-library/current-source-observations-batch-b.json"
        )["bounded_model"]
        assert observations["difficulty_floor_counts"] == {"easy": 3, "medium": 4, "hard": 5}
        assert observations["lifecycle_states"] == ["start", "playing", "ended"]
        assert observations["rules_phases"] == ["playing", "victory", "defeat"]
        assert set(observations["modeled_entities"]) == {
            "player", "ghost", "bat", "door", "floor", "trampoline"
        }
        assert observations["room_model"] is None
        assert observations["room_disposition"].startswith("unknown:")

    def test_haunted_history_never_substitutes_for_current_source(self) -> None:
        """Fails when: byte-identical historical rules are used as current envelopes."""

        history = load(
            TRACK / "packages/the-haunted-library/historical-source-observations-batch-b.json"
        )
        assert history["reachable_from_upper"] is True
        assert history["historical_blob_sha256"] == history["current_blob_sha256"]
        assert "Historical envelopes establish historical behavior only" in history["chronology_disposition"]
        ledger = load(HAUNTED_LEDGER)
        assert all(c["source_class"] == "historical_implementation" for c in ledger["claims"] if c["claim_id"].startswith("HL-HIST-"))
        assert all(c["revision"] == UPPER for c in ledger["claims"] if c["claim_id"].startswith("HL-CUR-"))

    def test_babel_current_paths_are_absent_at_frozen_upper_revision(self) -> None:
        """Fails when: a Babel current path exists or absence is promoted to mechanics."""

        current = load(TRACK / "packages/babel-architect/current-source-observations-batch-b.json")
        assert current["paths_present_at_revision"] == 0
        assert current["current_behavior"] == "unknown"
        for path in current["candidate_paths_checked"]:
            result = git("cat-file", "-e", f"{UPPER}:{path}", check=False)
            assert result.returncode != 0, path

    def test_babel_chronology_is_reachable_and_directly_ordered(self) -> None:
        """Fails when: historical implementation follows retirement or a revision is unreachable."""

        retirement = git("show", "-s", "--format=%P", RETIRED_BABEL).stdout.decode().strip()
        assert retirement == HISTORICAL_BABEL
        assert git("merge-base", "--is-ancestor", HISTORICAL_BABEL, RETIRED_BABEL, check=False).returncode == 0
        assert git("merge-base", "--is-ancestor", RETIRED_BABEL, UPPER, check=False).returncode == 0
        history = load(TRACK / "packages/babel-architect/historical-source-observations-batch-b.json")
        assert history["all_revisions_reachable_from_upper"] is True
        assert history["historical_implementation_revision"] == HISTORICAL_BABEL
        assert history["retirement_revision"] == RETIRED_BABEL

    def test_babel_cancellation_cannot_erase_history_or_create_current_behavior(self) -> None:
        """Fails when: cancellation is treated as implementation or history is treated as current."""

        mapping = load(TRACK / "packages/babel-architect/requirements-map-batch-b.json")
        chronology = next(row for row in mapping["mappings"] if row["mapping_id"] == "BA-MAP-004")
        assert "historical implementation existed" in chronology["result"]
        assert "not current facts" in chronology["result"]
        current = load(TRACK / "packages/babel-architect/current-source-observations-batch-b.json")
        assert current["precedence_rule"].startswith("The upper-revision absence")

    def test_explicit_unknowns_block_dependent_conclusions(self) -> None:
        """Fails when: rooms, current Babel behavior, responsiveness, or shipping are inferred."""

        haunted_unknowns = load(HAUNTED_LEDGER)["unknowns"]
        babel_unknowns = load(BABEL_LEDGER)["unknowns"]
        assert {item["claim_id"] for item in haunted_unknowns} == {
            "HL-UNK-001", "HL-UNK-002", "HL-UNK-003"
        }
        assert {item["claim_id"] for item in babel_unknowns} == {
            "BA-UNK-001", "BA-UNK-002", "BA-UNK-003", "BA-UNK-004"
        }
        assert all(item["source_class"] == "unknown" and item["blocks"] for item in haunted_unknowns + babel_unknowns)

    def test_negative_fixtures_exhaustively_reject_six_promotion_classes(self) -> None:
        """Fails when: a source-promotion counterexample is absent or accepted."""

        paths = [
            TRACK / "packages/the-haunted-library/negative-fixtures-batch-b.json",
            TRACK / "packages/babel-architect/negative-fixtures-batch-b.json",
        ]
        fixture_ids: set[str] = set()
        for path in paths:
            document = load(path)
            assert document["counts_as_factual_claims"] is False
            assert len(document["fixtures"]) == 6
            assert {row["failure_class"] for row in document["fixtures"]} == FIXTURE_CLASSES
            assert all(row["expected_disposition"] == "REJECT" for row in document["fixtures"])
            fixture_ids.update(row["fixture_id"] for row in document["fixtures"])
        assert len(fixture_ids) == 12

    def test_mappers_reference_only_backed_claims_and_unknowns(self) -> None:
        """Fails when: a map invents a source fact or cites an unknown record."""

        for slug, ledger_path in [
            ("the-haunted-library", HAUNTED_LEDGER),
            ("babel-architect", BABEL_LEDGER),
        ]:
            ledger = load(ledger_path)
            known_ids = {row["claim_id"] for row in ledger["claims"] + ledger["unknowns"]}
            mapping = load(TRACK / f"packages/{slug}/requirements-map-batch-b.json")
            assert mapping["acceptance"] == "not-claimed"
            assert mapping["ontology_decisions"] == 0
            assert mapping["novel_source_facts"] == 0
            cited = {claim_id for row in mapping["mappings"] for claim_id in row["cited_claim_ids"]}
            assert cited <= known_ids
            assert {row["claim_id"] for row in ledger["unknowns"]} <= cited

    def test_asset_denominator_is_reconciled_without_loading_inference(self) -> None:
        """Fails when: denominator asset files are promoted to loaded scene assets."""

        discovery = load(TRACK / "batch-b/discovery-audit.json")
        by_game = {entry["game"]: entry for entry in discovery["identities"]}
        assert by_game["The Haunted Library"]["denominator_counts"]["asset_candidates"] == 4
        assert by_game["Babel Architect"]["denominator_counts"]["asset_candidates"] == 2
        haunted_map = (TRACK / "packages/the-haunted-library/requirements-map-batch-b.json").read_text()
        babel_map = (TRACK / "packages/babel-architect/requirements-map-batch-b.json").read_text()
        assert "not promoted to loaded scene assets" in haunted_map
        assert "not current loaded assets" in babel_map

    def test_browser_records_fail_closed_without_gameplay_promotion(self) -> None:
        """Fails when: a blocked route is represented as successful browser evidence."""

        for slug in ["the-haunted-library", "babel-architect"]:
            audit = load(TRACK / f"packages/{slug}/browser-audit-batch-b.json")
            assert audit["kimi_webbridge"]["attempted"] is True
            assert audit["application_game_responses"] == 0
            assert audit["transitions_observed"] == 0
            assert audit["compact_view_observed"] is False
            assert audit["wide_view_observed"] is False
            assert audit["captured_artifacts"] == 0
            assert all(value is False for value in audit["success_claims"].values())
            assert audit["acceptance"] == "not-claimed"

    def test_candidate_readiness_binds_every_active_evidence_artifact(self) -> None:
        """Fails when: a selected evidence artifact changes without package regeneration."""

        readiness = load(READINESS)
        assert readiness["status"] == "candidate-published-awaiting-project-owner-acceptance"
        assert readiness["consumable"] is False
        assert readiness["candidate_manifest_published"] is True
        assert readiness["candidate_authorized"] is True
        assert readiness["acceptance_claimed"] is False
        for relative_path, expected in readiness["input_hashes"].items():
            assert sha256(ROOT / relative_path) == expected, relative_path

    def test_required_independent_roles_remain_truthful_blockers(self) -> None:
        """Fails when: missing role isolation or review is hidden to force candidate green."""

        readiness = load(READINESS)
        assert readiness["candidate_authorized"] is True
        assert readiness["resolved_blockers"] == ["T7-BB-BLOCK-001", "T7-BB-BLOCK-002", "T7-BB-BLOCK-003"]
        assert readiness["provider_provenance"]["provider_attestation_claimed"] is False
        assert readiness["provider_provenance"]["resource_accounting_measured"] is True

    def test_no_product_owner_acceptance_or_accepted_manifest_is_published(self) -> None:
        """Fails when: this Green package crosses the owner-only lifecycle boundary."""

        assert (TRACK / "batch-b/candidate-manifest.json").exists()
        forbidden = [TRACK / "batch-b/product-owner-acceptance.json", TRACK / "batch-b/accepted-manifest.json"]
        assert all(not path.exists() for path in forbidden)
        readiness = load(READINESS)
        assert readiness["lifecycle"]["product_owner_acceptance_published"] is False
        assert readiness["lifecycle"]["accepted_manifest_published"] is False

    def test_completion_and_api_success_claims_remain_false(self) -> None:
        """Fails when: source or blocked browser evidence is upgraded to product success."""

        readiness = load(READINESS)
        assert all(value is False for value in readiness["success_claims"].values())
