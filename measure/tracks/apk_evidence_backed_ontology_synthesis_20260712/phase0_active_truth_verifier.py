"""Fail-closed verifier for the active T9 Phase 0 input graph."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
from pathlib import Path
import sys
from typing import Any

import phase0_truth_verifier as legacy


ACTIVE_REGISTRY = "phase0-source-registry-v2.json"
ACTIVE_FREEZE = "phase0-input-freeze-v2.json"
ACTIVE_BUDGET = "phase0-budget-stop-loss-v2.json"
FIXTURE_MANIFEST = "phase0-fixture-manifest-v2.json"
EXPECTED_T8_STATE = "ACCEPTED_T9_ONLY"


def _digest(path: Path) -> str:
    """Returns the SHA-256 digest of one file.

    Args:
        path: File whose exact bytes are hashed.

    Returns:
        Lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _add(
    findings: list[legacy.Finding],
    code: str,
    message: str,
    severity: str = "Critical",
) -> None:
    """Adds one deduplicated verification finding.

    Args:
        findings: Mutable finding collection.
        code: Stable machine-readable failure code.
        message: Human-readable failure detail.
        severity: Finding severity.

    Returns:
        None.
    """
    legacy._add(findings, code, message, severity)


def _apply_fixture(
    registry: dict[str, Any],
    roles: dict[str, Any],
    derivation: dict[str, Any],
    budget: dict[str, Any],
    fixture: dict[str, Any],
) -> dict[str, Any]:
    """Applies one negative fixture to copied active contracts.

    Args:
        registry: Mutable active source registry.
        roles: Mutable role-ownership manifest.
        derivation: Mutable derivation schema.
        budget: Mutable active stop-loss budget.
        fixture: Declarative negative mutation.

    Returns:
        Optional provider-counterexample probe data.
    """
    mutation = fixture["mutation"]
    if mutation["type"] == "replace-t8-manifest-sha256":
        registry["t8_accepted"]["accepted_manifest"]["sha256"] = mutation[
            "sha256"
        ]
        return {}
    if mutation["type"] == "restore-root-product-owner-prohibition":
        root = roles["root_orchestrator"]
        root["forbidden_roles"].append("product-owner-acceptance-author")
        roles["incompatible_role_pairs"].append(
            ["orchestrator", "product-owner-acceptance-author"]
        )
        return {}
    return legacy._apply_fixture(
        registry,
        roles,
        derivation,
        budget,
        fixture,
    )


def _verify_fixture_manifest(
    track_root: Path,
    fixture_path: Path | None,
    findings: list[legacy.Finding],
) -> int:
    """Verifies the exact active fixture inventory and file hashes.

    Args:
        track_root: T9 track directory containing negative fixtures.
        fixture_path: Optional fixture selected for this verifier run.
        findings: Mutable finding collection.

    Returns:
        Number of completed checks.
    """
    manifest = legacy.load_json(track_root / FIXTURE_MANIFEST)
    fixtures = manifest.get("fixtures", [])
    checks = 3 + len(fixtures)
    paths = [item.get("path") for item in fixtures]
    ids = [item.get("id") for item in fixtures]
    envelope_exact = (
        manifest.get("schema_version") == "apk-t9-phase0-fixture-manifest.v2"
        and manifest.get("state") == "active-delegated-owner-gate"
        and len(fixtures) == 17
        and len(set(paths)) == len(paths)
        and len(set(ids)) == len(ids)
    )
    if not envelope_exact:
        _add(
            findings,
            "FIXTURE_MANIFEST_DRIFT",
            "Active fixture inventory differs from its v2 contract.",
        )
    for item in fixtures:
        target = track_root / str(item.get("path", ""))
        if (
            not target.is_file()
            or _digest(target) != item.get("sha256")
            or not item.get("expected_codes")
        ):
            _add(
                findings,
                "FIXTURE_MANIFEST_DRIFT",
                f"Fixture binding drifted: {item.get('path')}.",
            )
    if fixture_path is not None:
        declared = {
            (track_root / str(item.get("path", ""))).resolve()
            for item in fixtures
        }
        if fixture_path.resolve() not in declared:
            _add(
                findings,
                "UNDECLARED_FIXTURE",
                "Selected counterexample is absent from the v2 manifest.",
            )
    return checks


def _verify_t8(
    repo_root: Path,
    registry: dict[str, Any],
    findings: list[legacy.Finding],
) -> int:
    """Verifies the exact active T8 delegated-owner chain.

    Args:
        repo_root: Repository root containing the T8 artifacts.
        registry: Active T9 Phase 0 source registry.
        findings: Mutable finding collection.

    Returns:
        Number of completed checks.
    """
    checks = 0
    accepted = registry.get("t8_accepted", {})
    names = (
        "accepted_manifest",
        "root_acceptance",
        "delegated_owner_event",
        "acceptance_gate_report",
        "acceptance_gate_receipt",
    )
    bindings = [accepted.get(name, {}) for name in names]
    bindings.extend(accepted.get("fresh_reviews", []))
    for binding in bindings:
        path = repo_root / binding.get("path", "")
        checks += 1
        if not path.is_file() or _digest(path) != binding.get("sha256"):
            _add(
                findings,
                "WRONG_T8_ARTIFACT",
                "T8 active artifact differs from its v2 freeze: "
                f"{binding.get('path')}.",
            )
    if any(item.code == "WRONG_T8_ARTIFACT" for item in findings):
        return checks
    manifest_binding = accepted["accepted_manifest"]
    root_binding = accepted["root_acceptance"]
    event_binding = accepted["delegated_owner_event"]
    manifest = legacy.load_json(repo_root / manifest_binding["path"])
    root = legacy.load_json(repo_root / root_binding["path"])
    event = legacy.load_json(repo_root / event_binding["path"])
    report = legacy.load_json(
        repo_root / accepted["acceptance_gate_report"]["path"]
    )
    receipt = legacy.load_json(
        repo_root / accepted["acceptance_gate_receipt"]["path"]
    )
    checks += 14
    event_link = {
        "path": event_binding["path"],
        "sha256": event_binding["sha256"],
    }
    root_link = {
        "path": root_binding["path"],
        "sha256": root_binding["sha256"],
    }
    exact = (
        accepted.get("state") == EXPECTED_T8_STATE
        and manifest.get("status") == manifest_binding["required_status"]
        and manifest.get("revocation_state")
        == manifest_binding["required_revocation_state"]
        and manifest.get("consumer_scope")
        == manifest_binding["required_consumer_scope"]
        and root.get("decision") == root_binding["required_decision"]
        and root.get("revocation_state")
        == root_binding["required_revocation_state"]
        and root.get("scope") == root_binding["required_scope"]
        and event.get("event_type") == event_binding["required_event_type"]
        and event.get("decision") == event_binding["required_decision"]
        and event.get("authority") == event_binding["required_authority"]
        and root.get("owner_approval_event_binding") == event_link
        and manifest.get("root_acceptance_binding") == root_link
        and report.get("final_status")
        == accepted["acceptance_gate_report"]["required_status"]
        and report.get("production", {}).get("passed") is True
        and report.get("all_counterexamples_rejected") is True
        and report.get("counterexample_count") == 10
        and receipt.get("final_status")
        == accepted["acceptance_gate_receipt"]["required_status"]
        and receipt.get("production", {}).get("passed") is True
        and receipt.get("counterexamples", {}).get("all_rejected") is True
    )
    if not exact:
        _add(
            findings,
            "WRONG_T8_ARTIFACT",
            "T8 active chain does not satisfy delegated-owner acceptance.",
        )
    return checks


def _verify_active_roles(
    repo_root: Path,
    roles: dict[str, Any],
    registry: dict[str, Any],
    findings: list[legacy.Finding],
) -> int:
    """Reconciles delegated root authority with active role separation.

    Args:
        repo_root: Repository root containing delegated-owner evidence.
        roles: Active v2 role-ownership contract.
        registry: Active source registry with the T8 owner event.
        findings: Mutable finding collection.

    Returns:
        Number of completed checks.
    """
    checks = 0
    root = roles.get("root_orchestrator", {})
    assignments = roles.get("assignments", [])
    pairs = {
        frozenset(pair)
        for pair in roles.get("incompatible_role_pairs", [])
        if isinstance(pair, list) and len(pair) == 2
    }
    product_role = "product-owner-acceptance-author"
    product_assignment = next(
        (
            item
            for item in assignments
            if item.get("task_id") == "phase6-product-owner-acceptance"
        ),
        {},
    )
    accepted = registry.get("t8_accepted", {})
    event_binding = accepted.get("delegated_owner_event", {})
    authority = root.get("delegated_owner_authority", {})
    event_path = repo_root / event_binding.get("path", "")
    event = legacy.load_json(event_path) if event_path.is_file() else {}
    checks += 12
    delegated_exact = (
        roles.get("schema_version") == "apk-t9-phase0-role-ownership.v2"
        and roles.get("state")
        == "active-delegated-owner-and-assigned-domain-roles"
        and root.get("agent_ref") == "/root"
        and root.get("role") == "orchestrator"
        and root.get("delegated_roles") == [product_role]
        and product_role not in root.get("forbidden_roles", [])
        and frozenset(("orchestrator", product_role)) not in pairs
        and product_assignment.get("owner_role") == product_role
        and product_assignment.get("agent_ref") == "/root"
        and authority.get("path") == event_binding.get("path")
        and authority.get("sha256") == event_binding.get("sha256")
        and authority.get("delegation_message")
        == event.get("delegation_message")
        == "Again YOU ARE THE PRODUCT OWNER!"
        and authority.get("decision") == event.get("decision")
        and authority.get("authority") == event.get("authority")
        and event.get("decision") == "ACCEPT_T8_FOR_T9_ONLY_CONSUMPTION"
        and event.get("authority") == "delegated-root-product-owner"
    )
    if not delegated_exact:
        _add(
            findings,
            "DELEGATED_OWNER_ROLE_CONTRADICTION",
            "Active roles contradict the hash-bound delegated root owner.",
            "High",
        )
    assigned_roles = {
        item.get("owner_role") for item in assignments if item.get("agent_ref")
    }
    checks += 1
    missing_roles = sorted(legacy.REQUIRED_OWNER_ROLES - assigned_roles)
    if missing_roles:
        _add(
            findings,
            "MISSING_ROLE_ASSIGNMENT",
            f"Active role assignments are missing: {missing_roles}.",
        )
    by_agent: dict[str, set[str]] = {
        "/root": {"orchestrator", product_role},
    }
    for assignment in assignments:
        agent = assignment.get("agent_ref")
        role = assignment.get("owner_role")
        if isinstance(agent, str) and isinstance(role, str):
            by_agent.setdefault(agent, set()).add(role)
    checks += len(pairs)
    for pair in pairs:
        for agent, agent_roles in by_agent.items():
            if pair.issubset(agent_roles):
                _add(
                    findings,
                    "ROLE_OVERLAP",
                    f"{agent} holds incompatible active roles {sorted(pair)}.",
                )
    return checks


def _verify_active_contracts(
    repo_root: Path,
    track_root: Path,
    freeze: dict[str, Any],
    registry: dict[str, Any],
    derivation: dict[str, Any],
    claim_schema: dict[str, Any],
    budget: dict[str, Any],
    findings: list[legacy.Finding],
) -> int:
    """Verifies the v2 freeze, contracts, and cleared stop losses.

    Args:
        repo_root: Repository root containing governing inputs.
        track_root: T9 track directory containing active contracts.
        freeze: Active Phase 0 input freeze.
        registry: Active source registry.
        derivation: Pending derivation contract retained for Phase 1.
        claim_schema: Pending claim dependency contract.
        budget: Cleared active stop-loss budget.
        findings: Mutable finding collection.

    Returns:
        Number of completed checks.
    """
    checks = 0
    registry_binding = freeze.get("source_registry", {})
    checks += 1
    registry_path = track_root / registry_binding.get("path", "")
    if not registry_path.is_file() or _digest(
        registry_path
    ) != registry_binding.get("sha256"):
        _add(
            findings,
            "SCHEMA_DRIFT",
            "Active source registry differs from the v2 freeze.",
        )
    for binding in freeze.get("contract_bindings", []):
        checks += 1
        path = track_root / binding.get("path", "")
        if not path.is_file() or _digest(path) != binding.get("sha256"):
            _add(
                findings,
                "SCHEMA_DRIFT",
                f"Active contract drifted: {binding.get('path')}.",
            )
    for binding in freeze.get("governing_bindings", []):
        checks += 1
        path = repo_root / binding.get("path", "")
        if not path.is_file() or _digest(path) != binding.get("sha256"):
            _add(
                findings,
                "SCHEMA_DRIFT",
                f"Governing input drifted: {binding.get('path')}.",
            )
    checks += 9
    active_stop = budget.get("active_stop_loss", {})
    cycle_stop = budget.get("fix_review_cycle_stop_loss", {})
    schema_exact = (
        freeze.get("schema_version") == "apk-t9-phase0-input-freeze.v2"
        and freeze.get("status") == "VERIFIED_INPUTS"
        and freeze.get("consumable") is True
        and registry.get("schema_version") == "apk-t9-phase0-source-registry.v2"
        and registry.get("state") == "ACTIVE_T9_INPUTS"
        and registry.get("consumable") is True
        and derivation.get("schema_version") == "apk-t9-derivation-schema.v1"
        and claim_schema.get("schema_version")
        == "apk-t9-claim-dependency-schema.v1"
        and budget.get("schema_version") == "apk-t9-phase0-budget-stop-loss.v2"
        and budget.get("state") == "PHASE0_VERIFIED"
        and active_stop.get("code") == "T8_ACCEPTED_FOR_T9_ONLY"
        and active_stop.get("triggered") is False
        and active_stop.get("phase1_authorized") is True
        and cycle_stop.get("triggered") is False
        and cycle_stop.get("cleared") is True
        and cycle_stop.get("phase1_authorized") is True
    )
    if not schema_exact:
        _add(
            findings,
            "SCHEMA_DRIFT",
            "Active Phase 0 schema or clearance state differs from v2.",
        )
    ledger = legacy.load_json(track_root / legacy.CYCLE_LEDGER_PATH)
    for finding in legacy.verify_fix_review_cycle_ledger(
        track_root,
        budget,
        ledger,
    ):
        _add(findings, finding.code, finding.message, finding.severity)
    checks += 24
    proof = legacy.load_json(track_root / legacy.GOVERNANCE_PROOF_PATH)
    direction = cycle_stop.get("delegated_owner_direction_event")
    contract = cycle_stop.get("delegated_owner_direction_contract")
    if not (
        isinstance(direction, dict)
        and isinstance(contract, dict)
        and legacy._delegated_owner_direction_matches(
            direction,
            contract=contract,
            proof=proof,
            ledger=ledger,
        )
    ):
        _add(
            findings,
            "PRODUCT_OWNER_DIRECTION_REQUIRED",
            "The cleared cycle stop lacks exact delegated-owner direction.",
        )
    clearance = active_stop.get("clearance", {})
    accepted = registry.get("t8_accepted", {})
    checks += 4
    if clearance != {
        "registry_path": ACTIVE_REGISTRY,
        "registry_sha256": _digest(track_root / ACTIVE_REGISTRY),
        "delegated_owner_event_path": accepted.get(
            "delegated_owner_event", {}
        ).get("path"),
        "delegated_owner_event_sha256": accepted.get(
            "delegated_owner_event", {}
        ).get("sha256"),
        "root_acceptance_sha256": accepted.get("root_acceptance", {}).get(
            "sha256"
        ),
        "accepted_manifest_sha256": accepted.get("accepted_manifest", {}).get(
            "sha256"
        ),
    }:
        _add(
            findings,
            "FALSE_STOP_LOSS_ACCOUNTING",
            "The active stop-loss clearance differs from the T8 v2 chain.",
        )
    return checks


def verify_phase0(
    repo_root: Path,
    track_root: Path,
    fixture_path: Path | None = None,
) -> legacy.VerificationResult:
    """Verifies the active T9 Phase 0 graph and optional counterexample.

    Args:
        repo_root: Repository root containing predecessor inputs.
        track_root: T9 track directory containing active contracts.
        fixture_path: Optional negative fixture applied in memory.

    Returns:
        Deterministic pass or blocked result with stable finding codes.
    """
    freeze = legacy.load_json(track_root / ACTIVE_FREEZE)
    registry = legacy.load_json(track_root / ACTIVE_REGISTRY)
    pending_roles = legacy.load_json(
        track_root / "phase0-role-ownership-manifest-pending-v1.json"
    )
    roles = legacy.load_json(
        track_root / "phase0-role-ownership-manifest-v2.json"
    )
    derivation = legacy.load_json(
        track_root / "phase0-derivation-schema-pending-v1.json"
    )
    claim_schema = legacy.load_json(
        track_root / "phase0-claim-dependency-schema-pending-v1.json"
    )
    budget = legacy.load_json(track_root / ACTIVE_BUDGET)
    registry = copy.deepcopy(registry)
    roles = copy.deepcopy(roles)
    derivation = copy.deepcopy(derivation)
    budget = copy.deepcopy(budget)
    probe: dict[str, Any] = {}
    if fixture_path is not None:
        fixture = legacy.load_json(fixture_path)
        probe = _apply_fixture(
            registry,
            roles,
            derivation,
            budget,
            fixture,
        )
    findings: list[legacy.Finding] = []
    checks = _verify_fixture_manifest(
        track_root,
        fixture_path,
        findings,
    )
    checks += legacy._verify_sources(repo_root, registry, findings)
    checks += legacy._verify_pack(repo_root, registry, probe, findings)
    checks += legacy._verify_roles(track_root, pending_roles, findings)
    checks += legacy._verify_current_receipt(
        track_root,
        pending_roles,
        findings,
    )
    checks += _verify_active_roles(
        repo_root,
        roles,
        registry,
        findings,
    )
    checks += legacy._verify_provider_counterexample(
        track_root,
        probe.get("provider_counterexample"),
        findings,
    )
    checks += _verify_active_contracts(
        repo_root,
        track_root,
        freeze,
        registry,
        derivation,
        claim_schema,
        budget,
        findings,
    )
    checks += _verify_t8(repo_root, registry, findings)
    findings.sort(key=lambda finding: finding.code)
    state = "VERIFIED" if not findings else "INVALID"
    return legacy.VerificationResult(
        passed=not findings,
        state=state,
        findings=tuple(findings),
        checks=checks,
    )


def _parse_args(argv: list[str]) -> argparse.Namespace:
    """Parses active Phase 0 verifier arguments.

    Args:
        argv: Command-line arguments excluding the executable.

    Returns:
        Parsed command-line namespace.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--expect-code")
    parser.add_argument("--expect-codes", nargs="+")
    parser.add_argument("--write-report", type=Path)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Runs active Phase 0 verification with fail-closed status.

    Args:
        argv: Optional arguments; defaults to process arguments.

    Returns:
        Zero only for a clean graph or an exact expected finding set.
    """
    args = _parse_args(sys.argv[1:] if argv is None else argv)
    result = verify_phase0(
        args.repo_root.resolve(),
        args.track_root.resolve(),
        fixture_path=args.fixture.resolve() if args.fixture else None,
    )
    report = result.as_json()
    if args.fixture:
        report["fixture"] = str(args.fixture)
    if args.write_report:
        args.write_report.write_text(
            json.dumps(report, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(report, indent=2, sort_keys=True))
    codes = {finding.code for finding in result.findings}
    if args.expect_code:
        return (
            0
            if len(result.findings) == 1 and codes == {args.expect_code}
            else 1
        )
    if args.expect_codes:
        return 0 if codes == set(args.expect_codes) else 1
    return 0 if result.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
