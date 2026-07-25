"""Fail-closed truth verification for the additive Phase 0 v3 freeze."""

from __future__ import annotations

import argparse
from copy import deepcopy
from dataclasses import asdict, dataclass
import hashlib
import json
from pathlib import Path
import sys
from typing import Any


DISPATCH_PATH = "phase0-v3-role-dispatch-v1.json"
DISPATCH_SHA256 = "a34ade4b97794bab87be92d6f72f7505e524861b3dd1013d68979e7784f6793f"
REGISTRY_PATH = "phase0-source-registry-v3.json"
REGISTRY_SHA256 = "ae6050cc6c075614b34b6d8832a350f7d28945154315adebb25667fffc5b858c"
FREEZE_PATH = "phase0-input-freeze-v3.json"
FREEZE_SHA256 = "0517288c5aa267ddbd5f22fd6929cd74aaaacc74b9321d43094c72ade8614dae"
IDENTITY_PATH = "phase0-game-identity-map-v1.json"
IDENTITY_SHA256 = "7b2d3cf7fe5e17eab88f27804aac60e60c2da9e7089b82074b67d27721a47b3f"
MAPPING_DIGEST = "458a5c20db75617820604948cb004a14d579c828cedecbbcb7bdbada2f0a2b0a"
TRACK_PREFIX = "measure/tracks/apk_evidence_backed_ontology_synthesis_20260712/"


@dataclass(frozen=True)
class Finding:
    """Represents one stable Phase 0 v3 truth finding."""

    code: str
    message: str


@dataclass(frozen=True)
class Result:
    """Contains one deterministic Phase 0 v3 verification result."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Reports whether the freeze satisfies every truth contract.

        Returns:
            True only when no findings remain.
        """
        return not self.findings and self.state == "VERIFIED"

    def as_json(self) -> dict[str, Any]:
        """Returns a stable JSON-compatible result.

        Returns:
            Verification state, status, checks, and findings.
        """
        return {
            "schema_version": "apk-t9-phase0-v3-truth-report.v1",
            "state": self.state,
            "status": "pass" if self.passed else "blocked",
            "checks": self.checks,
            "findings": [asdict(item) for item in self.findings],
        }


def _load(path: Path) -> dict[str, Any]:
    """Loads one top-level JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("expected a JSON object")
    return value


def _sha256(path: Path) -> str:
    """Returns one file's lowercase SHA-256 digest."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _pointer(value: Any, pointer: str) -> Any:
    """Resolves one RFC 6901-style JSON pointer."""
    current = value
    for raw in pointer.removeprefix("/").split("/") if pointer else []:
        part = raw.replace("~1", "/").replace("~0", "~")
        current = current[int(part)] if isinstance(current, list) else current[part]
    return current


def _add(findings: list[Finding], code: str, message: str) -> None:
    """Adds at most one finding for a stable code."""
    if not any(item.code == code for item in findings):
        findings.append(Finding(code, message))


def _author_assignment(dispatch: dict[str, Any]) -> dict[str, Any]:
    """Returns the exact truth-author assignment from the v3 dispatch."""
    return next(
        item
        for item in dispatch["assignments"]
        if item["owner_role"] == "phase0-v3-truth-test-author"
    )


def expected_freeze(
    dispatch: dict[str, Any],
    registry: dict[str, Any],
) -> dict[str, Any]:
    """Builds the exact root-owned v3 freeze contract.

    Args:
        dispatch: Hash-bound Phase 0 v3 role dispatch.
        registry: Hash-bound Phase 0 v3 source registry.

    Returns:
        Exact structure required before independent review and root acceptance.
    """
    assignment = _author_assignment(dispatch)
    return {
        "schema_version": "apk-t9-phase0-input-freeze.v3",
        "track_id": "apk_evidence_backed_ontology_synthesis_20260712",
        "state": "FROZEN_AWAITING_PHASE0_V3_ROOT_ACCEPTANCE",
        "status": "candidate-non-consumable",
        "consumable": False,
        "registry": {
            "path": REGISTRY_PATH,
            "sha256": REGISTRY_SHA256,
        },
        "role_dispatch": {
            "path": DISPATCH_PATH,
            "sha256": DISPATCH_SHA256,
        },
        "predecessor_inputs": dispatch["required_inputs"],
        "game_identity": {
            "path": IDENTITY_PATH,
            "sha256": IDENTITY_SHA256,
            "entry_count": 29,
            "mapping_digest": MAPPING_DIGEST,
            "generic_slugification_allowed": False,
            "game_ids": [
                *registry["predecessor_repairs"]["denominator"]["resolvable_game_ids"][
                    :3
                ],
                "castle-defense",
                *registry["predecessor_repairs"]["denominator"]["resolvable_game_ids"][
                    3:
                ],
            ],
            "game_ids_sha256": registry["predecessor_repairs"]["denominator"][
                "game_ids_sha256"
            ],
        },
        "denominator": {
            "game_count": 29,
            "resolvable_game_count": 28,
            "castle_defense": {
                "game_id": "castle-defense",
                "disposition": "blocked-by-unknown",
                "scene_or_state_ids": [],
                "fabricated_scene_state_allowed": False,
            },
            "resolvable_game_ids": registry["predecessor_repairs"]["denominator"][
                "resolvable_game_ids"
            ],
            "resolvable_game_ids_sha256": registry["predecessor_repairs"][
                "denominator"
            ]["resolvable_game_ids_sha256"],
        },
        "truth_author_contract": {
            "agent_ref": assignment["agent_ref"],
            "owner_role": assignment["owner_role"],
            "task_id": assignment["task_id"],
            "allowed_outputs": assignment["allowed_outputs"],
        },
        "forbidden_inputs": registry["forbidden_inputs"],
        "supersession": {
            "v2_path": registry["supersedes_registry"]["path"],
            "v2_sha256": registry["supersedes_registry"]["sha256"],
            "v2_activation": False,
            "phase0_v2_acceptance": {
                "path": dispatch["required_inputs"]["phase0_v2_acceptance"]["path"],
                "sha256": dispatch["required_inputs"]["phase0_v2_acceptance"]["sha256"],
                "disposition": "superseded-baseline-only",
                "phase1_authorization_active": False,
            },
        },
        "activation": {
            "phase0_root_acceptance_path": "phase0-root-acceptance-v3.json",
            "requires_root_acceptance_v3": True,
            "phase1_authorized": False,
            "direct_phase1_activation": False,
        },
    }


def _mutate(freeze: dict[str, Any], operation: str) -> None:
    """Applies one bounded adversarial fixture mutation."""
    if operation == "predecessor-hash-drift":
        freeze["predecessor_inputs"]["t3_leaf_acceptance"]["sha256"] = "0" * 64
    elif operation == "dispatch-input-closure":
        freeze["predecessor_inputs"].pop("game_identity_review")
    elif operation == "identity-entry-count":
        freeze["game_identity"]["entry_count"] = 28
    elif operation == "identity-digest":
        freeze["game_identity"]["mapping_digest"] = "0" * 64
    elif operation == "identity-count-preserving-swap":
        freeze["game_identity"]["game_ids"][0] = "fabricated-game"
    elif operation == "castle-omission-loss":
        freeze["denominator"]["castle_defense"]["disposition"] = "resolved"
    elif operation == "castle-fabricated-scene":
        freeze["denominator"]["castle_defense"]["scene_or_state_ids"] = ["start"]
    elif operation == "resolvable-set-digest":
        freeze["denominator"]["resolvable_game_ids_sha256"] = "0" * 64
    elif operation == "generic-slugification":
        freeze["game_identity"]["generic_slugification_allowed"] = True
    elif operation == "stale-v2-activation":
        freeze["supersession"]["v2_activation"] = True
    elif operation == "direct-phase1-activation":
        freeze["activation"]["phase1_authorized"] = True
    elif operation == "failed-monolith":
        freeze["forbidden_inputs"] = []
    elif operation == "role-output-mismatch":
        freeze["truth_author_contract"]["allowed_outputs"][0] = "wrong.py"
    else:
        raise ValueError("unknown fixture mutation")


def _identity_valid(repo_root: Path, track_root: Path) -> bool:
    """Checks the exact 29-game mapping and every explicit source pointer."""
    identity = _load(track_root / IDENTITY_PATH)
    review = _load(track_root / "phase0-game-identity-map-independent-review-v1.json")
    partition = _load(
        repo_root / "measure/archive/apk_source_denominator_inventory_20260712/"
        "accepted-partition-manifest.json"
    )
    entries = identity.get("entries", [])
    if len(entries) != 29 or len({item["game_id"] for item in entries}) != 29:
        return False
    canonical = json.dumps(
        entries,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    if hashlib.sha256(canonical).hexdigest() != MAPPING_DIGEST:
        return False
    if identity["mapping_contract"]["generic_slugification_allowed"] is not False:
        return False
    game_ids = [item["game_id"] for item in entries]
    if game_ids != review["verification"]["verified_game_ids_in_t2_order"]:
        return False
    for index, item in enumerate(entries):
        expected_t2_pointer = f"/assignments/{index}/canonical_identity_label"
        if item["t2_pointer"] != expected_t2_pointer:
            return False
        if _pointer(partition, expected_t2_pointer) != item["t2_label"]:
            return False
        path = repo_root / item["id_source_path"]
        if not path.is_file() or _sha256(path) != item["id_source_sha256"]:
            return False
        source = _load(path)
        resolved = _pointer(source, item["id_source_pointer"])
        extraction = item["id_extraction"]
        if extraction == "exact-value":
            extracted = resolved
        elif extraction == "terminal-path-segment":
            extracted = str(resolved).rstrip("/").split("/")[-1]
        elif extraction == "package-directory-segment-from-output-hash-key":
            decoded = item["id_source_pointer"].replace("~1", "/")
            extracted = decoded.split("/packages/", 1)[1].split("/", 1)[0]
        else:
            return False
        if extracted != item["game_id"]:
            return False
    return True


def _compact_list_digest(values: list[str]) -> str:
    """Returns the compact UTF-8 JSON digest for one ordered ID list."""
    encoded = json.dumps(
        values,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _input_only_acceptance_valid(document: dict[str, Any]) -> bool:
    """Checks a predecessor acceptance remains scoped to Phase 0 v3 only."""
    scope = document.get("scope", {})
    return (
        document.get("status") == "accepted-for-phase0-v3-input-only"
        and scope.get("direct_phase1_consumption_authorized") is False
        and scope.get("phase0_v3_input_authorized") is True
        and scope.get("requires_phase0_v3_registry_and_acceptance") is True
    )


def _expected_values_valid(document: dict[str, Any], expected: dict[str, Any]) -> bool:
    """Checks registry expected-value paths against one source document."""
    for dotted, value in expected.items():
        current: Any = document
        try:
            for part in dotted.split("."):
                current = current[part]
        except (KeyError, TypeError):
            if dotted == "consumable" and value is True:
                if document.get("status") == "accepted-with-disclosure":
                    continue
            return False
        if current != value:
            return False
    return True


def verify(
    repo_root: Path,
    track_root: Path,
    freeze_override: dict[str, Any] | None = None,
    operation: str | None = None,
    simulate_missing_freeze: bool = False,
) -> Result:
    """Verifies the additive Phase 0 v3 registry and freeze.

    Args:
        repo_root: Repository containing every bound predecessor artifact.
        track_root: T9 track containing root and truth-author artifacts.
        freeze_override: Optional in-memory freeze used only by focused tests.
        operation: Optional bounded adversarial mutation.
        simulate_missing_freeze: Tests the Red absence path without file mutation.

    Returns:
        Deterministic Red, invalid, or verified result.
    """
    findings: list[Finding] = []
    checks = 0
    for relative, digest in (
        (DISPATCH_PATH, DISPATCH_SHA256),
        (REGISTRY_PATH, REGISTRY_SHA256),
    ):
        path = track_root / relative
        checks += 1
        if not path.is_file() or _sha256(path) != digest:
            _add(findings, "PHASE0_V3_GOVERNANCE_DRIFT", f"Drift: {relative}.")
    if findings:
        return Result("INVALID", tuple(findings), checks)
    dispatch = _load(track_root / DISPATCH_PATH)
    registry = _load(track_root / REGISTRY_PATH)
    freeze_path = track_root / FREEZE_PATH
    if simulate_missing_freeze or (
        freeze_override is None and not freeze_path.is_file()
    ):
        _add(findings, "PHASE0_V3_FREEZE_MISSING", f"Missing {FREEZE_PATH}.")
        return Result("RED", tuple(findings), checks + 1)
    if freeze_override is None and _sha256(freeze_path) != FREEZE_SHA256:
        _add(findings, "PHASE0_V3_FREEZE_HASH_DRIFT", "Freeze hash differs.")
        return Result("INVALID", tuple(findings), checks + 1)
    freeze = deepcopy(
        freeze_override if freeze_override is not None else _load(freeze_path)
    )
    if operation:
        _mutate(freeze, operation)
    expected = expected_freeze(dispatch, registry)
    if freeze != expected:
        sections = {
            "game_identity": "GAME_IDENTITY_CONTRACT_DRIFT",
            "denominator": "DENOMINATOR_OR_CASTLE_DRIFT",
            "truth_author_contract": "ROLE_OUTPUT_CONTRACT_MISMATCH",
            "forbidden_inputs": "FAILED_MONOLITH_INPUT_ADMITTED",
            "supersession": "STALE_V2_ACTIVATION",
            "activation": "PREMATURE_PHASE1_ACTIVATION",
        }
        for section, code in sections.items():
            if freeze.get(section) != expected[section]:
                _add(findings, code, f"Freeze section differs: {section}.")
        if freeze.get("predecessor_inputs") != expected["predecessor_inputs"]:
            actual_keys = set(freeze.get("predecessor_inputs", {}))
            expected_keys = set(expected["predecessor_inputs"])
            code = (
                "DISPATCH_INPUT_CLOSURE_FAILURE"
                if actual_keys != expected_keys
                else "PREDECESSOR_BINDING_DRIFT"
            )
            _add(findings, code, "Freeze predecessor inputs differ.")
        if not findings:
            _add(findings, "PHASE0_V3_FREEZE_SCHEMA_DRIFT", "Freeze envelope differs.")
    for binding in registry["authority_evidence"] + registry["sources"]:
        path = repo_root / binding["path"]
        checks += 1
        if not path.is_file() or _sha256(path) != binding["sha256"]:
            _add(findings, "PREDECESSOR_BINDING_DRIFT", "A registry input drifted.")
        elif "expected_values" in binding and not _expected_values_valid(
            _load(path), binding["expected_values"]
        ):
            _add(findings, "PREDECESSOR_BINDING_DRIFT", "Expected values drifted.")
    authority_hashes = {item["sha256"] for item in registry["authority_evidence"]}
    source_hashes = {item["sha256"] for item in registry["sources"]}
    required_hashes = {item["sha256"] for item in dispatch["required_inputs"].values()}
    if not required_hashes.issubset(authority_hashes | source_hashes):
        _add(findings, "DISPATCH_INPUT_CLOSURE_FAILURE", "Dispatch inputs are open.")
    v2_authority = next(
        item
        for item in registry["authority_evidence"]
        if item["id"] == "phase0-v2-root-acceptance-superseded-baseline"
    )
    v2_required = dispatch["required_inputs"]["phase0_v2_acceptance"]
    if not (
        v2_authority["path"] == TRACK_PREFIX + v2_required["path"]
        and v2_authority["sha256"] == v2_required["sha256"]
        and v2_authority["disposition"] == "superseded-baseline-only"
        and v2_authority["phase1_authorization_active"] is False
    ):
        _add(findings, "STALE_V2_ACTIVATION", "V2 supersession semantics differ.")
    for binding in dispatch["required_inputs"].values():
        path = track_root / binding["path"]
        checks += 1
        if not path.is_file() or _sha256(path) != binding["sha256"]:
            _add(findings, "PREDECESSOR_BINDING_DRIFT", "A required input drifted.")
    checks += 29
    if not _identity_valid(repo_root, track_root):
        _add(
            findings, "GAME_IDENTITY_CONTRACT_DRIFT", "Identity map does not rederive."
        )
    if registry.get("candidate_only") is not True or registry.get("consumable"):
        _add(findings, "PREMATURE_PHASE1_ACTIVATION", "Registry is prematurely active.")
    registry_denominator = registry["predecessor_repairs"]["denominator"]
    castle = registry_denominator["explicit_omission"]
    identity = _load(track_root / IDENTITY_PATH)
    game_ids = [item["game_id"] for item in identity["entries"]]
    resolvable = [game_id for game_id in game_ids if game_id != "castle-defense"]
    if not (
        registry_denominator["game_count"] == 29
        and registry_denominator["resolvable_game_count"] == 28
        and castle["game_id"] == "castle-defense"
        and castle["disposition"] == "blocked-by-unknown"
        and castle["fabricated_scene_state_allowed"] is False
        and registry_denominator["game_ids_sha256"]
        == "84c9b442ac27cdd8bb9e895d5bf7c9874beecdf22674f766f612ee26c54f71a5"
        and registry_denominator["resolvable_game_ids_sha256"]
        == "8dd4aea6de41c80b97515ae7d82fce87b617e0c438ee429db02667e99b18eed3"
        and registry_denominator["resolvable_game_ids"] == resolvable
        and _compact_list_digest(game_ids) == registry_denominator["game_ids_sha256"]
        and _compact_list_digest(resolvable)
        == registry_denominator["resolvable_game_ids_sha256"]
    ):
        _add(findings, "DENOMINATOR_OR_CASTLE_DRIFT", "Registry denominator differs.")
    for key in ("t3_leaf_acceptance", "cohort_leaf_acceptance"):
        binding = dispatch["required_inputs"][key]
        if not _input_only_acceptance_valid(_load(track_root / binding["path"])):
            _add(
                findings,
                "PREDECESSOR_SCOPE_DRIFT",
                "A repair acceptance exceeds Phase 0 v3 input scope.",
            )
    checks += 9
    findings.sort(key=lambda item: item.code)
    return Result("VERIFIED" if not findings else "INVALID", tuple(findings), checks)


def main(argv: list[str] | None = None) -> int:
    """Runs the Phase 0 v3 truth verifier CLI."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    args = parser.parse_args(argv)
    result = verify(args.repo_root.resolve(), args.track_root.resolve())
    print(json.dumps(result.as_json(), indent=2, sort_keys=True))
    return 0 if result.passed else 1


if __name__ == "__main__":
    sys.exit(main())
