"""Fail-closed verification for the additive T3 leaf-binding catalog."""

from __future__ import annotations

import argparse
from copy import deepcopy
from dataclasses import asdict, dataclass
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
from typing import Any
import unittest


DISPATCH_SHA256 = "f6a9aedb3eb3246fc107363854aff75ab50b0ed1af19280b5925c3c8138a78e5"
CANDIDATE_SHA256 = "a04bc93f78ad33e22a56af7b94d61e721ae5828ed23fd509456c5250b366bbac"
AUTHOR_RECEIPT_SHA256 = (
    "67ec8d7b08810a3b34b4e575fc00b1b430bbd9459714b4c7c36225b9c048ae2f"
)
DISPATCH_PATH = "phase0-t3-repair-role-dispatch-v1.json"
CANDIDATE_PATH = "phase0-t3-leaf-binding-candidate-v1.json"
AUTHOR_RECEIPT_PATH = "role-receipts/phase0/t3-leaf-binding-catalog-author.json"
REQUIRED_GAMES = ("dragon-flight", "rpg-battle", "abyssal-well")
EXPECTED_CLAIMS = {
    "dragon-flight": (225, 3, "included-in-claim-records"),
    "rpg-battle": (215, 3, "separate-from-claim-records"),
    "abyssal-well": (51, 2, "included-in-claim-records"),
}
EXPECTED_REFS = {"dragon-flight": 170, "rpg-battle": 174, "abyssal-well": 41}


@dataclass(frozen=True)
class Finding:
    """Represents one stable T3 catalog finding."""

    code: str
    message: str


@dataclass(frozen=True)
class Result:
    """Contains one deterministic T3 catalog verification result."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Reports whether the candidate passed.

        Returns:
            True only when no findings remain.
        """
        return not self.findings

    def as_json(self) -> dict[str, Any]:
        """Returns a stable JSON-compatible result.

        Returns:
            Complete verification state and findings.
        """
        return {
            "schema_version": "apk-t9-phase0-t3-leaf-binding-report.v1",
            "state": self.state,
            "status": "pass" if self.passed else "blocked",
            "checks": self.checks,
            "findings": [asdict(item) for item in self.findings],
        }


def _sha256(path: Path) -> str:
    """Returns one file's lowercase SHA-256 digest."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _load(path: Path) -> dict[str, Any]:
    """Loads one top-level JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("expected a JSON object")
    return value


def _pointer(value: Any, pointer: str) -> Any:
    """Resolves one RFC 6901-style JSON pointer."""
    current = value
    if not pointer:
        return current
    for raw in pointer.removeprefix("/").split("/"):
        part = raw.replace("~1", "/").replace("~0", "~")
        current = current[int(part)] if isinstance(current, list) else current[part]
    return current


def _structured_claim_refs(value: Any, refs: list[str]) -> None:
    """Collects structured claim references from one blueprint subtree."""
    if isinstance(value, dict):
        for key, item in value.items():
            if key == "claim_id" and isinstance(item, str):
                refs.append(item)
            elif key in {"backing_claims", "evidence_basis_claims", "member_claims"}:
                refs.extend(ref for ref in item if isinstance(ref, str))
            else:
                _structured_claim_refs(item, refs)
    elif isinstance(value, list):
        for item in value:
            _structured_claim_refs(item, refs)


def _add(findings: list[Finding], code: str, message: str) -> None:
    """Adds at most one finding per stable code."""
    if not any(item.code == code for item in findings):
        findings.append(Finding(code, message))


def _ledger_claims(document: Any, game_id: str) -> tuple[list[dict[str, Any]], int]:
    """Returns accepted-count records and negative-fixture count."""
    if game_id == "dragon-flight":
        claims = document
        negatives = [item for item in claims if "-NEG-" in item["claim_id"]]
        return claims, len(negatives)
    if game_id == "rpg-battle":
        return document["claims"] + document["negative_evidence_fixtures"], len(
            document["negative_evidence_fixtures"]
        )
    claims = document["claims"]
    negatives = [item for item in claims if "-NEG-" in item["claim_id"]]
    return claims, len(negatives)


def _coverage_matches(row: dict[str, Any], game: dict[str, Any]) -> bool:
    """Checks one coverage row against structured blueprint records."""
    scenes = game["A_scene_state_blueprint"]["scenes"]
    states = game["A_scene_state_blueprint"]["states"]
    transitions = game["A_scene_state_blueprint"]["transitions"]
    mechanics = game["B_mechanic_learning_blueprint"]
    effort = game["C_developer_effort_decomposition"]
    scene_ids = [item["scene_id"] for item in scenes]
    state_ids = [item.get("state_id", item.get("state_family")) for item in states]
    return (
        row["scenes"] == scene_ids
        and row["states"] == state_ids
        and row["scene_count"] == len(scenes)
        and row["state_record_count"] == len(states)
        and row["transition_count"] == len(transitions)
        and row["mechanic_count"] == len(mechanics["mechanics"])
        and row["control_surface_count"] == len(mechanics["control_surfaces"])
        and row["learning_goal_count"] == len(mechanics["learning_goals"])
        and row["terminal_result_mechanic_count"] == 1
        and row["developer_effort_key_count"] == len(effort)
    )


def _governance_semantics(
    repo_root: Path,
    track_root: Path,
    candidate: dict[str, Any],
) -> bool:
    """Checks accepted-chain relationships and author-receipt semantics."""
    chain = candidate["accepted_chain"]
    documents = {
        key: _load(repo_root / binding["path"]) for key, binding in chain.items()
    }
    accepted = documents["accepted_pilot"]
    owner = documents["owner_acceptance"]
    pilot = documents["candidate_pilot"]
    review = documents["independent_review"]
    reviewer_receipt = documents["adversarial_reviewer_receipt"]
    author_receipt = _load(track_root / AUTHOR_RECEIPT_PATH)
    dispatch = _load(track_root / DISPATCH_PATH)
    assignment = next(
        item
        for item in dispatch["assignments"]
        if item["task_id"] == "phase0-verify-t3-leaf-bindings"
    )
    expected_inputs = {
        (item["path"], item["sha256"])
        for item in [*chain.values(), *candidate["leaf_bindings"]]
    }
    receipt_inputs = {
        (item["path"], item["sha256"]) for item in author_receipt["input_bindings"]
    }
    return (
        accepted["status"] == "accepted-conditional"
        and accepted["consumable"] is True
        and accepted["acceptance"]["product_owner_acceptance_sha256"]
        == chain["owner_acceptance"]["sha256"]
        and accepted["binding"]["pilot_independent_review_sha256"]
        == chain["independent_review"]["sha256"]
        and accepted["binding"]["adversarial_reviewer_receipt_sha256"]
        == chain["adversarial_reviewer_receipt"]["sha256"]
        and owner["candidate_pilot_manifest_sha256"]
        == chain["candidate_pilot"]["sha256"]
        and owner["review_report_sha256"] == chain["independent_review"]["sha256"]
        and owner["decision"] == "approve-conditional"
        and owner["revoked"] is False
        and pilot["status"] == "candidate-pending-acceptance"
        and pilot["consumable"] is False
        and review["review_disposition"] == "conditional"
        and reviewer_receipt["role"] == "adversarial-reviewer"
        and author_receipt["role"] == "t3-leaf-binding-catalog-author"
        and author_receipt["repair_dispatch"]["sha256"] == DISPATCH_SHA256
        and receipt_inputs == expected_inputs
        and author_receipt["output_bindings"]
        == [
            {
                "path": "measure/tracks/apk_evidence_backed_ontology_synthesis_20260712/"
                + CANDIDATE_PATH,
                "sha256": CANDIDATE_SHA256,
            }
        ]
        and assignment["agent_ref"] == "/root/t9_phase0_governance_author"
        and assignment["owner_role"] == "t3-leaf-binding-truth-test-author"
    )


def _run_immutable_suite(repo_root: Path) -> tuple[bool, str]:
    """Runs all 41 frozen T3 tests with an archive-only path shim."""
    suite_path = (
        repo_root / "measure/archive/apk_three_game_truth_pilot_20260712/truth_tests.py"
    )
    spec = importlib.util.spec_from_file_location(
        "t3_immutable_truth_tests", suite_path
    )
    if spec is None or spec.loader is None:
        return False, "immutable suite could not be loaded"
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    module.TRACK_DIR = repo_root / "measure/archive/apk_three_game_truth_pilot_20260712"
    suite = unittest.defaultTestLoader.loadTestsFromModule(module)
    stream = io.StringIO()
    result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
    failures = [(test.id(), trace) for test, trace in result.failures]
    expected_failure = (
        len(failures) == 1
        and failures[0][0].endswith(
            "T3StopLossContract.test_zero_failed_fix_review_cycles"
        )
        and "adversarial review already exists" in failures[0][1]
    )
    valid = result.testsRun == 41 and len(result.errors) == 0 and expected_failure
    summary = (
        f"tests={result.testsRun}; passes={result.testsRun - len(result.failures)}; "
        f"failures={len(result.failures)}; errors={len(result.errors)}; "
        "known_lifecycle_failure=" + str(expected_failure).lower()
    )
    return valid, summary


def _mutate(candidate: dict[str, Any], operation: str) -> None:
    """Applies one bounded negative-fixture mutation."""
    if operation == "stale-leaf-hash":
        candidate["leaf_bindings"][0]["sha256"] = "0" * 64
    elif operation == "missing-leaf":
        candidate["leaf_bindings"].pop()
    elif operation == "extra-leaf":
        candidate["leaf_bindings"].append(deepcopy(candidate["leaf_bindings"][-1]))
    elif operation == "wrong-game":
        candidate["leaf_bindings"][1]["game_id"] = "wrong-game"
    elif operation == "disclosure-loss":
        candidate["no_success_disclosures"]["browser_success_claimed"] = True
    elif operation == "accepted-chain-hash-drift":
        candidate["accepted_chain"]["accepted_pilot"]["sha256"] = "0" * 64
    elif operation == "unresolved-blueprint-reference":
        return
    else:
        raise ValueError("unknown fixture mutation")


def verify(
    repo_root: Path,
    track_root: Path,
    operation: str | None = None,
) -> Result:
    """Verifies candidate bytes, ledger coverage, references, and disclosures.

    Args:
        repo_root: Repository root containing the immutable T3 archive.
        track_root: T9 track containing the repair candidate and dispatch.
        operation: Optional bounded negative mutation for focused tests.

    Returns:
        Deterministic Red, invalid, or verified state.
    """
    findings: list[Finding] = []
    checks = 0
    fixed = {
        DISPATCH_PATH: DISPATCH_SHA256,
        CANDIDATE_PATH: CANDIDATE_SHA256,
        AUTHOR_RECEIPT_PATH: AUTHOR_RECEIPT_SHA256,
    }
    for relative, digest in fixed.items():
        path = track_root / relative
        checks += 1
        if not path.is_file():
            _add(findings, "T3_CATALOG_MISSING", f"Missing {relative}.")
        elif _sha256(path) != digest:
            _add(findings, "T3_GOVERNANCE_HASH_DRIFT", f"Hash drift: {relative}.")
    if findings:
        return Result(
            "RED" if findings[0].code == "T3_CATALOG_MISSING" else "INVALID",
            tuple(findings),
            checks,
        )
    candidate = deepcopy(_load(track_root / CANDIDATE_PATH))
    if operation:
        _mutate(candidate, operation)
    try:
        if not (
            candidate["status"] == "candidate-non-consumable"
            and candidate["consumable"] is False
            and candidate["acceptance_claimed"] is False
        ):
            raise ValueError("candidate publication boundary differs")
        leaves = candidate["leaf_bindings"]
        if len(leaves) != 4 or len({item["leaf_id"] for item in leaves}) != 4:
            _add(
                findings,
                "INCOMPLETE_LEAF_SET",
                "Exactly four unique leaves are required.",
            )
        if findings:
            return Result("INVALID", tuple(findings), checks)
        blueprint_leaf = next(
            item for item in leaves if item["leaf_kind"] == "blueprint"
        )
        ledger_leaves = [item for item in leaves if item["leaf_kind"] == "claim-ledger"]
        if {item.get("game_id") for item in ledger_leaves} != set(REQUIRED_GAMES):
            _add(findings, "WRONG_GAME_BINDING", "Ledger games differ from the pilot.")
        if findings:
            return Result("INVALID", tuple(findings), checks)
        for binding in candidate["accepted_chain"].values():
            path = repo_root / binding["path"]
            if not path.is_file() or _sha256(path) != binding["sha256"]:
                _add(
                    findings,
                    "ACCEPTED_CHAIN_HASH_DRIFT",
                    "An accepted-chain path/hash binding differs.",
                )
        if findings:
            return Result("INVALID", tuple(findings), checks)
        if not operation and not _governance_semantics(
            repo_root, track_root, candidate
        ):
            _add(
                findings,
                "ACCEPTED_CHAIN_SEMANTICS_DRIFT",
                "Accepted-chain or author-receipt semantics differ.",
            )
        documents: dict[str, Any] = {}
        for leaf in leaves:
            path = repo_root / leaf["path"]
            if not path.is_file() or _sha256(path) != leaf["sha256"]:
                _add(findings, "STALE_LEAF_HASH", "A leaf path/hash binding differs.")
                continue
            documents[leaf["leaf_id"]] = json.loads(path.read_text(encoding="utf-8"))
        if findings:
            return Result("INVALID", tuple(findings), checks)
        blueprint = documents[blueprint_leaf["leaf_id"]]
        if operation == "unresolved-blueprint-reference":
            game = blueprint["games"]["dragon-flight"]
            game["evidence_basis_claims"].append("DF-MECH-999")
        if set(blueprint["games"]) != set(REQUIRED_GAMES):
            _add(
                findings, "WRONG_GAME_BINDING", "Blueprint games differ from the pilot."
            )
        all_claims: dict[str, dict[str, Any]] = {}
        per_game: dict[str, set[str]] = {}
        for leaf in ledger_leaves:
            game_id = leaf["game_id"]
            if game_id not in EXPECTED_CLAIMS:
                continue
            claims, negative_count = _ledger_claims(documents[leaf["leaf_id"]], game_id)
            expected_count, expected_negatives, storage = EXPECTED_CLAIMS[game_id]
            if (
                len(claims) != expected_count
                or negative_count != expected_negatives
                or leaf["accepted_claim_count"] != expected_count
                or leaf["negative_fixture_records"] != expected_negatives
                or leaf["negative_fixture_storage"] != storage
            ):
                _add(findings, "CLAIM_COUNT_MISMATCH", "Ledger count semantics differ.")
            ids = {item["claim_id"] for item in claims}
            per_game[game_id] = ids
            for claim in claims:
                if claim["claim_id"] in all_claims:
                    _add(findings, "CLAIM_ID_COLLISION", "Claim IDs are not unique.")
                all_claims[claim["claim_id"]] = claim
        if len(all_claims) != 491:
            _add(findings, "CLAIM_COUNT_MISMATCH", "The accepted claim set is not 491.")
        total_refs = 0
        for game_id in REQUIRED_GAMES:
            ref_values: list[str] = []
            _structured_claim_refs(blueprint["games"][game_id], ref_values)
            refs = set(ref_values)
            unresolved = refs - per_game[game_id]
            if len(refs) != EXPECTED_REFS[game_id] or unresolved:
                _add(
                    findings,
                    "UNRESOLVED_BLUEPRINT_REFERENCE",
                    "Blueprint claim closure differs.",
                )
            total_refs += len(refs)
        if total_refs != 385:
            _add(
                findings,
                "UNRESOLVED_BLUEPRINT_REFERENCE",
                "Unique reference count is not 385.",
            )
        coverage = candidate["coverage"]
        if not (
            coverage["leaf_count"] == 4
            and coverage["game_count"] == 3
            and coverage["claim_count"] == 491
            and coverage["blueprint_internal_reference_count"] == 385
            and coverage["blueprint_internal_references_unresolved"] == 0
        ):
            _add(
                findings,
                "COVERAGE_ATTESTATION_MISMATCH",
                "Coverage attestation differs.",
            )
        coverage_rows = {item["game_id"]: item for item in coverage["games"]}
        if set(coverage_rows) != set(REQUIRED_GAMES) or any(
            not _coverage_matches(
                coverage_rows[game_id],
                blueprint["games"][game_id],
            )
            for game_id in REQUIRED_GAMES
        ):
            _add(
                findings,
                "COVERAGE_ATTESTATION_MISMATCH",
                "Structured coverage differs.",
            )
        accepted = _load(
            repo_root / candidate["accepted_chain"]["accepted_pilot"]["path"]
        )
        if (
            candidate["accepted_non_blocking_observations"]
            != accepted["non_blocking_observations"]
        ):
            _add(
                findings, "DISCLOSURE_LOSS", "Accepted observations were not preserved."
            )
        disclosure = candidate["no_success_disclosures"]
        if any(disclosure.values()) or candidate["archive_integrity"] != {
            "archive_rewrite_allowed": False,
            "archived_leaf_bytes_modified": False,
        }:
            _add(
                findings, "DISCLOSURE_LOSS", "No-success or archive disclosures differ."
            )
        checks += 30 + len(all_claims) + total_refs
    except (KeyError, StopIteration, TypeError, ValueError):
        _add(findings, "INVALID_T3_CATALOG_SCHEMA", "Candidate schema is incomplete.")
    if not operation and not findings:
        suite_valid, suite_summary = _run_immutable_suite(repo_root)
        checks += 41
        if not suite_valid:
            _add(
                findings,
                "IMMUTABLE_T3_SUITE_DRIFT",
                suite_summary,
            )
    findings.sort(key=lambda item: item.code)
    return Result("VERIFIED" if not findings else "INVALID", tuple(findings), checks)


def main(argv: list[str] | None = None) -> int:
    """Runs the T3 verifier CLI.

    Args:
        argv: Optional CLI arguments.

    Returns:
        Zero only for a verified candidate.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    args = parser.parse_args(argv)
    result = verify(args.repo_root.resolve(), args.track_root.resolve())
    print(json.dumps(result.as_json(), indent=2, sort_keys=True))
    return 0 if result.passed else 1


if __name__ == "__main__":
    sys.exit(main())
