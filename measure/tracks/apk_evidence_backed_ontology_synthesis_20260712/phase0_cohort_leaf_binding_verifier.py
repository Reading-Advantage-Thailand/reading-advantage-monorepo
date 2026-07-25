"""Fail-closed verification for T4-B and T6-B cohort leaf bindings."""

from __future__ import annotations

import argparse
from copy import deepcopy
from dataclasses import asdict, dataclass
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from typing import Any


DISPATCH_PATH = "phase0-cohort-leaf-repair-role-dispatch-v1.json"
DISPATCH_SHA256 = "7a7ec749bb4f83c5dfab0e7c63bd754f686eabe77506fb2f83480bf48f828400"
CANDIDATE_PATH = "phase0-cohort-leaf-binding-candidate-v1.json"
CANDIDATE_SHA256 = "2a9c5f2eb24d235dbbb59c81b63e81a162ff08c4a6f0aa95fff66bea58194fef"
AUTHOR_RECEIPT_PATH = "role-receipts/phase0/cohort-leaf-binding-catalog-author.json"
AUTHOR_RECEIPT_SHA256 = (
    "6bd34ea232bdab1f130491a52a871d06a1001c69583ff2c45cfb9687cf51eef3"
)
EXPECTED = {
    "village-guardian": (73, 6, 4, 73, 0, 73, 37),
    "archers-revenge": (43, 0, 4, 43, 0, 43, 43),
    "storm-castle-tower": (42, 6, 4, 36, 6, 32, 31),
    "potion-rush": (28, 4, 6, 28, 0, 28, 28),
    "rune-forge-chamber": (24, 5, 6, 24, 0, 24, 24),
    "astral-mage": (16, 3, 6, 16, 0, 16, 16),
}
ROW_KEYS = {
    "game_id", "claim_count", "explicit_unknown_count",
    "negative_fixture_count", "source_reference_count",
    "blob_or_range_reference_count", "bounded_query_reference_count",
    "source_references_unresolved", "scene_or_state_reference_count",
    "distinct_scene_or_state_id_count", "scene_or_state_ids",
}
TOTALS = (226, 24, 30, 220, 6, 216, 179)
QUERY_COMMANDS = {
    "SCT-Q-BASELINE-TREE": (
        "ls-tree", "-r", "--name-only",
        "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286", "--",
        "apps/advantage-games/src", "apps/advantage-games/public",
        "packages/game-cartridges/src",
    ),
    "SCT-Q-ASSET-BASELINE": (
        "grep", "-n", "-F", "storm-castle-tower-gameplay.png",
        "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286", "--",
        "apps/advantage-games/src", "packages/game-cartridges/src",
    ),
    "SCT-Q-ASSET-APP-HISTORY": (
        "grep", "-n", "-F", "storm-castle-tower-gameplay.png",
        "4106ba39547c8cac7645ce0f257a6bdd133712e9", "--",
        "apps/advantage-games/src/app/[locale]/(student)/student/games/"
        "sentence/storm-castle-tower",
        "apps/advantage-games/src/components/games/sentence/storm-castle-tower",
    ),
    "SCT-Q-ASSET-CARTRIDGE-HISTORY": (
        "grep", "-n", "-F", "storm-castle-tower-gameplay.png",
        "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f", "--",
        "packages/game-cartridges/src/cartridges/storm-castle-tower",
    ),
    "SCT-Q-APP-DELETION": (
        "diff-tree", "--no-commit-id", "--name-status", "-r",
        "524269494fbb4f92667c2889f3206cafd88b1bd0", "--",
        "apps/advantage-games/src/app/[locale]/(student)/student/games/"
        "sentence/storm-castle-tower",
        "apps/advantage-games/src/app/api/v1/games/storm-castle-tower",
        "apps/advantage-games/src/components/games/sentence/storm-castle-tower",
    ),
    "SCT-Q-CARTRIDGE-DELETION": (
        "diff-tree", "--no-commit-id", "--name-status", "-r",
        "05bb6d2909268ea670b106240167f86c9814d67d", "--",
        "packages/game-cartridges/src/cartridges/storm-castle-tower",
    ),
}


@dataclass(frozen=True)
class Finding:
    """Represents one stable cohort-repair finding."""

    code: str
    message: str


@dataclass(frozen=True)
class Result:
    """Contains one deterministic cohort-repair result."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Reports whether no findings remain.

        Returns:
            True only for a fully verified candidate.
        """
        return not self.findings

    def as_json(self) -> dict[str, Any]:
        """Returns a stable JSON-compatible result.

        Returns:
            Complete verification state and findings.
        """
        return {
            "schema_version": "apk-t9-phase0-cohort-leaf-binding-report.v1",
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
    """Resolves one RFC 6901-style pointer."""
    current = value
    if not pointer:
        return current
    for raw in pointer.removeprefix("/").split("/"):
        part = raw.replace("~1", "/").replace("~0", "~")
        current = current[int(part)] if isinstance(current, list) else current[part]
    return current


def _contains_equal(value: Any, expected: Any) -> bool:
    """Checks whether one nested value equals an accepted disclosure set."""
    if value == expected:
        return True
    if isinstance(value, dict):
        return any(_contains_equal(item, expected) for item in value.values())
    if isinstance(value, list):
        return any(_contains_equal(item, expected) for item in value)
    return False


def _add(findings: list[Finding], code: str, message: str) -> None:
    """Adds at most one finding for a stable code."""
    if not any(item.code == code for item in findings):
        findings.append(Finding(code, message))


def _relocated(path: str) -> str:
    """Returns the exact suffix-preserving tracks-to-archive path."""
    return path.replace("measure/tracks/", "measure/archive/", 1)


def _mutate(candidate: dict[str, Any], operation: str) -> None:
    """Applies one bounded negative-fixture mutation."""
    if operation == "stale-leaf-hash":
        candidate["leaf_bindings"][0]["sha256"] = "0" * 64
    elif operation == "missing-leaf":
        candidate["leaf_bindings"].pop()
    elif operation == "wrong-game":
        candidate["leaf_bindings"][0]["game_id"] = "wrong-game"
    elif operation == "disclosure-loss":
        candidate["retained_disclosures"]["t4_root_conditions"].pop()
    elif operation == "receipt-binding-mismatch":
        receipt = candidate["accepted_chains"]["t4_batch_b"]
        receipt["selected_collector_receipts"][0]["ledger_output_pointer"] = "/wrong"
    elif operation == "archive-integrity":
        candidate["archive_integrity"]["archived_inputs_modified"] = True
    elif operation == "coverage-attestation":
        candidate["coverage"]["games"][0]["claim_count"] += 1
    elif operation == "chain-relation":
        candidate["accepted_chains"]["t4_batch_b"]["accepted_root"][
            "consumable"
        ] = False
    elif operation in {
        "claim-count",
        "source-reference-loss",
        "citation-hash-drift",
        "citation-range-drift",
        "query-drift",
    }:
        return
    else:
        raise ValueError("unknown fixture mutation")


def _verify_receipt_bindings(
    repo_root: Path,
    candidate: dict[str, Any],
    leaves: dict[str, dict[str, Any]],
) -> bool:
    """Checks every selected receipt pointer against its exact ledger."""
    for chain in candidate["accepted_chains"].values():
        for binding in chain["selected_collector_receipts"]:
            try:
                receipt = _load(repo_root / binding["path"])
                output = _pointer(receipt, binding["ledger_output_pointer"])
            except (KeyError, IndexError, TypeError, ValueError):
                return False
            leaf = leaves[binding["game_id"]]
            if isinstance(output, dict):
                if output != {
                    "path": leaf["path"].replace(
                        "measure/archive/", "measure/tracks/", 1
                    ),
                    "sha256": leaf["sha256"],
                }:
                    return False
            elif output != leaf["sha256"]:
                return False
    return True


def _git(repo_root: Path, *args: str) -> subprocess.CompletedProcess[bytes]:
    """Runs one bounded Git evidence command.

    Args:
        repo_root: Repository containing the cited Git objects.
        *args: Exact Git arguments without shell interpretation.

    Returns:
        Completed command with byte-preserving output.
    """
    return subprocess.run(
        ["git", *args],
        cwd=repo_root,
        check=False,
        capture_output=True,
        timeout=10,
    )


def _citation_valid(
    repo_root: Path,
    claim: dict[str, Any],
    cache: dict[tuple[str, str], bytes],
) -> bool:
    """Rederives one cited blob and inclusive range from Git.

    Args:
        repo_root: Repository containing the cited object.
        claim: Ledger claim with revision, path, and digest fields.
        cache: Per-run immutable blob cache.

    Returns:
        True only when both blob and cited range hashes rederive.
    """
    revision = claim.get("source_revision", claim.get("revision"))
    path = claim.get("relative_path", claim.get("path"))
    blob_hash = claim.get("blob_sha256")
    range_hash = claim.get("cited_range_sha256")
    if not all(isinstance(item, str) for item in (revision, path, blob_hash)):
        return False
    key = (revision, path)
    if key not in cache:
        completed = _git(repo_root, "show", f"{revision}:{path}")
        if completed.returncode != 0:
            return False
        cache[key] = completed.stdout
    blob = cache[key]
    if hashlib.sha256(blob).hexdigest() != blob_hash:
        return False
    inclusive = claim.get("inclusive_range", claim.get("range"))
    if inclusive == "whole-file":
        cited = blob
    elif isinstance(inclusive, str) and ".." in inclusive:
        start, end = (int(item) for item in inclusive.split("..", 1))
        cited = b"".join(blob.splitlines(keepends=True)[start - 1 : end])
    elif isinstance(inclusive, dict) and inclusive.get("kind") == "bytes":
        cited = blob[inclusive["start"] : inclusive["end"] + 1]
    elif isinstance(inclusive, dict):
        start = inclusive.get("start_line", inclusive.get("start"))
        end = inclusive.get("end_line", inclusive.get("end"))
        cited = b"".join(blob.splitlines(keepends=True)[start - 1 : end])
    else:
        start = claim.get("start_line")
        end = claim.get("end_line")
        if not isinstance(start, int) or not isinstance(end, int):
            return False
        cited = b"".join(blob.splitlines(keepends=True)[start - 1 : end])
    return (
        isinstance(range_hash, str)
        and hashlib.sha256(cited).hexdigest() == range_hash
    )


def _query_valid(repo_root: Path, query: dict[str, Any]) -> bool:
    """Reruns one accepted bounded-query record.

    Args:
        repo_root: Repository containing the queried Git history.
        query: Accepted query evidence record.

    Returns:
        True only when output, digest, status, and count all rederive.
    """
    query_id = query.get("query_id")
    if query_id not in QUERY_COMMANDS:
        return False
    completed = _git(repo_root, *QUERY_COMMANDS[query_id])
    output = completed.stdout
    if query_id == "SCT-Q-BASELINE-TREE":
        lines = [
            line
            for line in output.decode("utf-8").splitlines()
            if "storm-castle-tower" in line
        ]
        output = (("\n".join(sorted(lines)) + "\n") if lines else "").encode()
    exact = query.get("exact_stdout", "").encode()
    return (
        completed.returncode == query.get("exit_status")
        and output == exact
        and hashlib.sha256(output).hexdigest() == query.get("stdout_sha256")
        and len(output.splitlines()) == query.get("match_count")
    )


def _author_receipt_valid(
    track_root: Path,
    candidate: dict[str, Any],
) -> bool:
    """Checks the catalog-author receipt's role and output semantics."""
    receipt = _load(track_root / AUTHOR_RECEIPT_PATH)
    roots = [
        chain["accepted_root"] for chain in candidate["accepted_chains"].values()
    ]
    expected_roots = [
        {"cohort": cohort, "path": root["path"], "sha256": root["sha256"]}
        for cohort, root in zip(("T4 Batch B", "T6 Batch B"), roots)
    ]
    attestation = receipt.get("catalog_attestation", {})
    return (
        receipt.get("task_id") == "phase0-repair-t4b-t6b-leaf-bindings"
        and receipt.get("role") == "cohort-leaf-binding-catalog-author"
        and receipt.get("repair_dispatch", {}).get("sha256") == DISPATCH_SHA256
        and receipt.get("accepted_root_inputs") == expected_roots
        and receipt.get("output_bindings")
        == [{
            "path": "measure/tracks/"
            "apk_evidence_backed_ontology_synthesis_20260712/"
            + CANDIDATE_PATH,
            "sha256": CANDIDATE_SHA256,
        }]
        and attestation.get("leaf_count") == 6
        and attestation.get("accepted_chain_and_selected_receipt_binding_count")
        == 27
        and attestation.get("claim_count") == TOTALS[0]
        and attestation.get("blob_or_range_reference_count") == TOTALS[3]
        and attestation.get("bounded_query_reference_count") == TOTALS[4]
    )


def verify(repo_root: Path, track_root: Path, operation: str | None = None) -> Result:
    """Verifies the six-ledger cohort repair candidate.

    Args:
        repo_root: Repository root containing immutable cohort archives.
        track_root: T9 track containing repair governance.
        operation: Optional bounded mutation used by focused tests.

    Returns:
        Deterministic Red, invalid, or verified result.
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
            _add(findings, "COHORT_CATALOG_MISSING", f"Missing {relative}.")
        elif _sha256(path) != digest:
            _add(findings, "COHORT_GOVERNANCE_HASH_DRIFT", f"Hash drift: {relative}.")
    if findings:
        state = "RED" if findings[0].code == "COHORT_CATALOG_MISSING" else "INVALID"
        return Result(state, tuple(findings), checks)
    original = _load(track_root / CANDIDATE_PATH)
    candidate = deepcopy(original)
    if operation:
        _mutate(candidate, operation)
    try:
        original_leaves = {
            item["game_id"]: item for item in original["leaf_bindings"]
        }
        if not _author_receipt_valid(track_root, original):
            _add(
                findings,
                "COHORT_AUTHOR_RECEIPT_MISMATCH",
                "Catalog-author receipt semantics differ.",
            )
        if not _verify_receipt_bindings(repo_root, original, original_leaves):
            _add(
                findings,
                "RECEIPT_LEAF_BINDING_MISMATCH",
                "A receipt does not bind its ledger.",
            )
        if findings:
            return Result("INVALID", tuple(findings), checks)
        if not (
            candidate["status"] == "candidate-non-consumable"
            and candidate["consumable"] is False
            and candidate["acceptance_claimed"] is False
        ):
            raise ValueError("publication boundary differs")
        leaf_list = candidate["leaf_bindings"]
        leaves = {item["game_id"]: item for item in leaf_list}
        if len(leaf_list) != 6 or set(leaves) != set(EXPECTED):
            _add(
                findings, "INCOMPLETE_COHORT_LEAF_SET", "Six exact games are required."
            )
            return Result("INVALID", tuple(findings), checks)
        accepted_documents = []
        artifact_count = 0
        expected_roots = {
            "t4_batch_b": ("accepted-with-disclosure", True),
            "t6_batch_b": (
                "accepted-for-conditional-evidence-consumption-only",
                True,
            ),
        }
        for chain_id, chain in candidate["accepted_chains"].items():
            root = chain["accepted_root"]
            if (root["status"], root["consumable"]) != expected_roots[chain_id]:
                _add(
                    findings,
                    "ACCEPTED_CHAIN_RELATION_MISMATCH",
                    "Accepted root status or consumability differs.",
                )
            bindings = [
                root,
                *chain["chain_artifacts"],
                *chain["selected_collector_receipts"],
            ]
            for binding in bindings:
                path = repo_root / binding["path"]
                artifact_count += 1
                if not path.is_file() or _sha256(path) != binding["sha256"]:
                    _add(
                        findings,
                        "ACCEPTED_CHAIN_HASH_DRIFT",
                        "An accepted artifact drifted.",
                    )
                elif path.suffix == ".json":
                    document = _load(path)
                    accepted_documents.append(document)
                    if binding is root:
                        if document.get("status") != root["status"]:
                            _add(
                                findings,
                                "ACCEPTED_CHAIN_RELATION_MISMATCH",
                                "Accepted root document status differs.",
                            )
                        if chain_id == "t6_batch_b" and not document.get(
                            "consumable"
                        ):
                            _add(
                                findings,
                                "ACCEPTED_CHAIN_RELATION_MISMATCH",
                                "Accepted root is not consumable.",
                            )
        if artifact_count != 27:
            _add(
                findings,
                "ACCEPTED_CHAIN_HASH_DRIFT",
                "Accepted artifact count differs.",
            )
        if findings:
            return Result("INVALID", tuple(findings), checks)
        support = {
            item["game_id"]: item for item in candidate["supporting_evidence_bindings"]
        }
        row_list = candidate["coverage"]["games"]
        rows = {item["game_id"]: item for item in row_list}
        if (
            len(row_list) != 6
            or set(rows) != set(EXPECTED)
            or any(set(row) != ROW_KEYS for row in row_list)
        ):
            _add(
                findings,
                "COHORT_COVERAGE_MISMATCH",
                "Per-game coverage row keys differ.",
            )
        totals = [0] * 7
        claim_ids: set[str] = set()
        blob_cache: dict[tuple[str, str], bytes] = {}
        for game_id, leaf in leaves.items():
            path = repo_root / leaf["path"]
            if not path.is_file() or _sha256(path) != leaf["sha256"]:
                _add(findings, "STALE_COHORT_LEAF_HASH", "A ledger path/hash differs.")
                return Result("INVALID", tuple(findings), checks)
            document = _load(path)
            claims = deepcopy(_pointer(document, leaf["claims_pointer"]))
            if operation == "claim-count" and game_id == "village-guardian":
                claims.pop()
            if operation == "source-reference-loss" and game_id == "village-guardian":
                claims[0]["blob_sha256"] = None
            if operation == "citation-hash-drift" and game_id == "village-guardian":
                claims[0]["blob_sha256"] = "0" * 64
            if operation == "citation-range-drift" and game_id == "village-guardian":
                claims[0]["cited_range_sha256"] = "0" * 64
            unknowns = (
                _pointer(document, leaf.get("unknowns_pointer", "/missing"))
                if "unknowns_pointer" in leaf
                else []
            )
            if game_id in support:
                binding = support[game_id]
                support_path = repo_root / binding["path"]
                if _sha256(support_path) != binding["sha256"]:
                    _add(
                        findings,
                        "STALE_COHORT_LEAF_HASH",
                        "Fixture support hash differs.",
                    )
                fixtures = _pointer(_load(support_path), binding["fixtures_pointer"])
            else:
                fixtures = _pointer(document, leaf["negative_fixtures_pointer"])
            blob_refs = sum(bool(item.get("blob_sha256")) for item in claims)
            query_refs = sum(
                bool(item.get("bounded_query_evidence_id")) for item in claims
            )
            scene_values = [item.get("scene_or_state_id") for item in claims]
            scene_refs = [item for item in scene_values if item is not None]
            actual = (
                len(claims),
                len(unknowns),
                len(fixtures),
                blob_refs,
                query_refs,
                len(scene_refs),
                len(set(scene_refs)),
            )
            row_actual = {
                "game_id": game_id,
                "claim_count": actual[0],
                "explicit_unknown_count": actual[1],
                "negative_fixture_count": actual[2],
                "source_reference_count": actual[3] + actual[4],
                "blob_or_range_reference_count": actual[3],
                "bounded_query_reference_count": actual[4],
                "source_references_unresolved": actual[0] - actual[3] - actual[4],
                "scene_or_state_reference_count": actual[5],
                "distinct_scene_or_state_id_count": actual[6],
                "scene_or_state_ids": sorted(set(scene_refs)),
            }
            if actual != EXPECTED[game_id] or rows.get(game_id) != row_actual:
                _add(
                    findings,
                    "COHORT_COVERAGE_MISMATCH",
                    f"Coverage differs: {game_id}.",
                )
            for claim in claims:
                if claim["claim_id"] in claim_ids:
                    _add(findings, "COHORT_CLAIM_ID_COLLISION", "Claim IDs collide.")
                claim_ids.add(claim["claim_id"])
                query_id = claim.get("bounded_query_evidence_id")
                if query_id:
                    queries = {
                        item["query_id"]: item
                        for item in document["bounded_query_evidence"]
                    }
                    query = deepcopy(queries[query_id])
                    if operation == "query-drift" and query_id == (
                        "SCT-Q-BASELINE-TREE"
                    ):
                        query["stdout_sha256"] = "0" * 64
                    if not _query_valid(repo_root, query):
                        _add(
                            findings,
                            "COHORT_SOURCE_REFERENCE_DRIFT",
                            "A bounded query does not rederive.",
                        )
                elif not _citation_valid(repo_root, claim, blob_cache):
                    _add(
                        findings,
                        "COHORT_SOURCE_REFERENCE_DRIFT",
                        "A Git blob or cited range does not rederive.",
                    )
            totals = [left + right for left, right in zip(totals, actual)]
        coverage = candidate["coverage"]
        aggregate = {
            "leaf_count": len(leaves),
            "game_count": len(leaves),
            "claim_count": totals[0],
            "explicit_unknown_count": totals[1],
            "negative_fixture_count": totals[2],
            "source_reference_count": totals[3] + totals[4],
            "blob_or_range_reference_count": totals[3],
            "bounded_query_reference_count": totals[4],
            "source_references_resolved": totals[3] + totals[4],
            "source_references_unresolved": totals[0] - totals[3] - totals[4],
            "scene_or_state_reference_count": totals[5],
            "per_game_distinct_scene_or_state_id_count_sum": totals[6],
        }
        stated_aggregate = {key: coverage.get(key) for key in aggregate}
        if tuple(totals) != TOTALS or stated_aggregate != aggregate:
            _add(findings, "COHORT_COVERAGE_MISMATCH", "Aggregate coverage differs.")
        if not _verify_receipt_bindings(repo_root, candidate, leaves):
            _add(
                findings,
                "RECEIPT_LEAF_BINDING_MISMATCH",
                "A receipt does not bind its ledger.",
            )
        for disclosure in candidate["retained_disclosures"].values():
            if not any(
                _contains_equal(document, disclosure) for document in accepted_documents
            ):
                _add(
                    findings,
                    "COHORT_DISCLOSURE_LOSS",
                    "An accepted disclosure set was lost.",
                )
        if any(candidate["no_success_claims"].values()) or any(
            candidate["archive_integrity"].values()
        ):
            _add(
                findings,
                "COHORT_DISCLOSURE_LOSS",
                "No-success or archive flags differ.",
            )
        checks += artifact_count + len(claim_ids) + sum(totals)
    except (KeyError, IndexError, StopIteration, TypeError, ValueError):
        _add(
            findings, "INVALID_COHORT_CATALOG_SCHEMA", "Candidate schema is incomplete."
        )
    findings.sort(key=lambda item: item.code)
    return Result("VERIFIED" if not findings else "INVALID", tuple(findings), checks)


def main(argv: list[str] | None = None) -> int:
    """Runs the cohort verifier CLI."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    args = parser.parse_args(argv)
    result = verify(args.repo_root.resolve(), args.track_root.resolve())
    print(json.dumps(result.as_json(), indent=2, sort_keys=True))
    return 0 if result.passed else 1


if __name__ == "__main__":
    sys.exit(main())
