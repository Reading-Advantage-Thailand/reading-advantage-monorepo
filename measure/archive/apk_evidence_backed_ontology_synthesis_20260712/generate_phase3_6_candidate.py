#!/usr/bin/env python3
"""Renders approved evidence-only T9 Phase 3 through 6 candidate artifacts."""

from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
from typing import Any

TRACK_REL = Path("measure/tracks/apk_evidence_backed_ontology_synthesis_20260712")
T8_REL = Path("measure/tracks/apk_existing_asset_candidate_audit_20260712")
PACK_REL = Path("packages/advantage-play-kit/assets/standard")
RESPONSIVE = "phase3-responsive-contracts-v1.json"
ASSET_NORMALIZATION = "phase4-asset-normalization-v1.json"
ADOPTION_MATRIX = "phase4-canonical-adoption-matrix-v1.json"
GAPS = "phase5-gap-delivery-ranking-v1.json"
RESOURCE_REPORT = "phase6-resource-report-v1.json"

ASPECTS = (
    "geometry",
    "camera",
    "visibility",
    "regions",
    "controls",
    "content_fixtures",
    "transitions",
    "state_preservation",
)
PROFILES = ("compact", "wide")
KNOWN_FAILURES = {
    ("dragon-flight", "compact"): "Dragon Flight compact direction controls begin below the initial viewport.",
    ("rpg-battle", "compact"): "RPG Battle remains blocked in a repeated vocabulary-fetch loop at both viewports.",
    ("rpg-battle", "wide"): "RPG Battle remains blocked in a repeated vocabulary-fetch loop at both viewports.",
    ("magic-defense", "compact"): "Magic Defense compact start content is clipped at the edge.",
    ("enchanted-library", "wide"): "Enchanted Library wide capture timed out and remains blocked.",
    ("potion-rush", "compact"): "Potion Rush compact gameplay shows an unresolved HUD key and overlay pressure.",
    ("castle-defense", "compact"): "Castle Defense compact post-start canvas extends below the viewport.",
}
INPUTS = {
    "phase1-mechanic-blueprints-v1.json": "ed3bee70f5e7e94ac101f295d9de3f768cdaf9d97d40d4529f2fbbbe8f479d61",
    "phase1-developer-effort-baseline-v1.json": "168403610d0c69160777ddeca5753dcc57b97e2a7db6ceed65f3e4ce64d14f91",
    "phase1-root-acceptance.json": "bd911f865c95e24874dde657e856718910a05b1737634222055654b331dd020d",
    "phase2-root-acceptance.json": "911e66f2ae9da15ec0f5f0d8b749168f21b374f1c9c22d44b7d14f3c14e2f6db",
    "phase2-capability-classification-v5.json": None,
    "phase2-curated-capability-evidence-v1.json": None,
    "phase2-extension-boundaries-v5.json": None,
}
T8_INPUTS = {
    "phase5-accepted-manifest-v1.json": "20930a1cb30b763323f0c3d77a0625cb1c54c7aba7094284b91d508f3d68665f",
    "phase5-root-acceptance.json": "4e6fc46898dadb42d255127de1214f52514b8a1bd97fcd2ad2073d379d373c86",
    "phase5-acceptance-green-report.json": "8b33353f3ebda940f1eec60761584c62d6df3d0cdc953c87bd92108b785010a5",
}


def load(path: Path) -> Any:
    """Loads a UTF-8 JSON artifact.

    Args:
        path: File to parse.

    Returns:
        Parsed JSON value.
    """
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path: Path) -> str:
    """Returns the SHA-256 digest of exact file bytes.

    Args:
        path: File to hash.

    Returns:
        Lowercase hexadecimal SHA-256 digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def digest_value(value: Any) -> str:
    """Returns the canonical JSON digest for one value.

    Args:
        value: JSON-compatible value.

    Returns:
        Lowercase hexadecimal SHA-256 digest.
    """
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def write_json(path: Path, value: Any) -> None:
    """Writes deterministic formatted JSON.

    Args:
        path: Destination artifact.
        value: JSON-compatible value.

    Returns:
        None.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")


def input_bindings(repo_root: Path) -> dict[str, str]:
    """Builds exact accepted-input bindings and fails closed on drift.

    Args:
        repo_root: Repository root containing all predecessor artifacts.

    Returns:
        Repository-relative paths mapped to exact SHA-256 digests.

    Raises:
        ValueError: When a frozen accepted digest differs.
    """
    bindings: dict[str, str] = {}
    for name, expected in INPUTS.items():
        path = repo_root / TRACK_REL / name
        actual = sha(path)
        if expected is not None and actual != expected:
            raise ValueError(f"accepted T9 input drift: {name}")
        bindings[str(TRACK_REL / name)] = actual
    for name, expected in T8_INPUTS.items():
        path = repo_root / T8_REL / name
        actual = sha(path)
        if actual != expected:
            raise ValueError(f"accepted T8 input drift: {name}")
        bindings[str(T8_REL / name)] = actual
    accepted_pack = repo_root / PACK_REL / "accepted-standard-pack-release.json"
    catalog = repo_root / PACK_REL / "standard-pack-release.json"
    bindings[str(PACK_REL / accepted_pack.name)] = sha(accepted_pack)
    bindings[str(PACK_REL / catalog.name)] = sha(catalog)
    return dict(sorted(bindings.items()))


def claim_ids(record: dict[str, Any]) -> list[str]:
    """Returns the complete ordered claim set for one Phase 1 record.

    Args:
        record: Accepted Phase 1 mechanic record.

    Returns:
        Sorted unique upstream claim IDs.
    """
    return sorted({
        claim
        for field in record.get("derived_fields", [])
        for claim in field.get("upstream_claim_ids", [])
        if isinstance(claim, str)
    })


def render_responsive(repo_root: Path, bindings: dict[str, str]) -> dict[str, Any]:
    """Renders per-scope responsive contracts without filling evidence gaps.

    Args:
        repo_root: Repository root containing accepted mechanics.
        bindings: Exact accepted input bindings.

    Returns:
        Non-consumable responsive contract artifact.
    """
    blueprints = load(repo_root / TRACK_REL / "phase1-mechanic-blueprints-v1.json")
    grouped: dict[tuple[str, str | None, str | None], list[dict[str, Any]]] = defaultdict(list)
    for record in blueprints["records"]:
        grouped[(record["game_id"], record.get("scene_id"), record.get("state_id"))].append(record)
    contracts: list[dict[str, Any]] = []
    for (game_id, scene_id, state_id), records in sorted(grouped.items(), key=lambda item: tuple(part or "" for part in item[0])):
        upstream = sorted({claim for record in records for claim in claim_ids(record)})
        profiles = []
        for profile in PROFILES:
            failure = KNOWN_FAILURES.get((game_id, profile))
            profiles.append({
                "profile_id": profile,
                "known_failure": failure,
                "known_failure_source": ({
                    "path": str(T8_REL / "phase5-root-acceptance.json"),
                    "sha256": T8_INPUTS["phase5-root-acceptance.json"],
                    "scope": "bounded-composite-scene-only",
                } if failure else None),
                "aspect_states": {aspect: "blocked_unknown" for aspect in ASPECTS},
            })
        contracts.append({
            "contract_id": f"responsive:{game_id}:{digest_value([scene_id, state_id])[:12]}",
            "game_id": game_id,
            "scene_id": scene_id,
            "state_id": state_id,
            "status": "blocked_unknown",
            "source_record_ids": sorted(record["record_id"] for record in records),
            "upstream_claim_ids": upstream,
            "unknown_blocker": "No accepted profile-specific evidence establishes these aspects; normative responsive policy is not historical fact.",
            "profiles": profiles,
        })
    contracts.append({
        "contract_id": "responsive:castle-defense:blocked-denominator",
        "game_id": "castle-defense",
        "scene_id": None,
        "state_id": None,
        "status": "blocked_unknown",
        "source_record_ids": [],
        "upstream_claim_ids": [],
        "unknown_blocker": "The accepted denominator explicitly has no leaf-resolvable Castle Defense scene/state evidence.",
        "profiles": [{
            "profile_id": profile,
            "known_failure": KNOWN_FAILURES.get(("castle-defense", profile)),
            "known_failure_source": ({
                "path": str(T8_REL / "phase5-root-acceptance.json"),
                "sha256": T8_INPUTS["phase5-root-acceptance.json"],
                "scope": "bounded-composite-scene-only",
            } if ("castle-defense", profile) in KNOWN_FAILURES else None),
            "aspect_states": {aspect: "blocked_unknown" for aspect in ASPECTS},
        } for profile in PROFILES],
    })
    contracts.sort(key=lambda row: row["contract_id"])
    return {
        "schema_version": "apk-t9-phase3-responsive-contracts.v1",
        "track_id": "apk_evidence_backed_ontology_synthesis_20260712",
        "status": "candidate-non-consumable",
        "consumable": False,
        "policy_boundary": "Compact/wide normative policy is a forward constraint only, not historical fact, and is not represented as legacy evidence.",
        "input_bindings": bindings,
        "counts": {
            "games": len({row["game_id"] for row in contracts}),
            "contracts": len(contracts),
            "profiles": sum(len(row["profiles"]) for row in contracts),
            "known_failure_profile_cells": sum(profile["known_failure"] is not None for row in contracts for profile in row["profiles"]),
        },
        "contracts": contracts,
    }


def capability_games(repo_root: Path) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """Indexes accepted capability IDs by game and games by capability.

    Args:
        repo_root: Repository root containing Phase 2 outputs.

    Returns:
        A game-to-capabilities map and capability-to-games map.
    """
    curated = load(repo_root / TRACK_REL / "phase2-curated-capability-evidence-v1.json")
    by_game: dict[str, set[str]] = defaultdict(set)
    by_capability: dict[str, set[str]] = defaultdict(set)
    for record in curated["records"]:
        for use in record.get("capability_uses", []):
            capability_id = use["capability_id"]
            by_game[record["game_id"]].add(capability_id)
            by_capability[capability_id].add(record["game_id"])
    return (
        {game: sorted(values) for game, values in by_game.items()},
        {capability: sorted(values) for capability, values in by_capability.items()},
    )


def t8_join_index(repo_root: Path) -> dict[str, dict[str, Any]]:
    """Indexes accepted T8 Phase 4 records by their internal legacy identity.

    Args:
        repo_root: Repository root containing the T8 batches.

    Returns:
        Canonical legacy paths mapped to exact Phase 4 join records.
    """
    rows: dict[str, dict[str, Any]] = {}
    for number in range(1, 13):
        path = repo_root / T8_REL / "batches" / f"AF-{number:02d}" / "phase4-path-usage-joins.json"
        document = load(path)
        for record in document["records"]:
            rows[record["canonical_path"]] = record
    return rows


def render_assets(repo_root: Path, bindings: dict[str, str]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Renders evidence families and a path-free, standard-pack-relative matrix.

    Args:
        repo_root: Repository root containing accepted T8 and Phase 2 evidence.
        bindings: Exact accepted input bindings.

    Returns:
        Asset-normalization and canonical-adoption artifacts.
    """
    accepted = load(repo_root / T8_REL / "phase5-accepted-manifest-v1.json")
    joins = t8_join_index(repo_root)
    by_game, _ = capability_games(repo_root)
    usages: dict[str, dict[str, Any]] = {}
    candidate_rows: list[dict[str, Any]] = []
    for entry in accepted["entries"]:
        join = joins[entry["canonical_path"]]
        mappings = []
        for link in join.get("usage_links", []):
            usage = link["normalized_usage"]
            usage_id = usage["usage_id"]
            evidence_ids = sorted(usage.get("claim_ids") or [usage_id])
            normalized = {
                "usage_id": usage_id,
                "game_id": usage["game_id"],
                "surface_kind": usage["surface_kind"],
                "surface_id": usage["surface_id"],
                "source_evidence_family": usage["category"],
                "upstream_evidence_ids": evidence_ids,
                "candidate_record_indices": [],
                "semantic_role": None,
                "semantic_state": None,
                "normalization_status": "blocked_unknown_role_state",
                "gameplay_variant": {"status": "blocked_unknown", "value": None},
                "source_pack_treatment": "standard-pack-only-forward-policy-not-historical-fact",
            }
            if usage_id not in usages:
                usages[usage_id] = normalized
            usages[usage_id]["candidate_record_indices"].append(entry["record_index"])
            mappings.append({
                "usage_id": usage_id,
                "source_evidence_family": usage["category"],
                "semantic_role": None,
                "semantic_state": None,
                "gameplay_variant": {"status": "blocked_unknown"},
                "source_pack_treatment": "standard-pack-only-forward-policy-not-historical-fact",
                "capability_ids": by_game.get(usage["game_id"], []),
                "profile_ids": list(PROFILES) if usage["surface_kind"] == "scene" else [],
                "adoption": {
                    "state": "blocked",
                    "standard_pack_key": None,
                    "blocker": "No independently approved semantic role/state and exact standard-pack candidate selection exists; filename or visual near-match selection is forbidden.",
                },
                "upstream_claim_ids": evidence_ids,
            })
        candidate_rows.append({
            "t8_record_index": entry["record_index"],
            "t8_report_record_sha256": entry["report_record_sha256"],
            "source_asset_sha256": entry["asset_sha256"],
            "batch_id": entry["batch_id"],
            "t8_disposition": entry["disposition"]["value"],
            "t8_join_status": entry["join_status"],
            "mappings": sorted(mappings, key=lambda row: row["usage_id"]),
            "candidate_adoption_state": "blocked_pending_exact_role_state_and_catalog_selection",
            "direct_legacy_adoption": False,
        })
    for usage in usages.values():
        usage["candidate_record_indices"] = sorted(set(usage["candidate_record_indices"]))
    normalization = {
        "schema_version": "apk-t9-phase4-asset-normalization.v1",
        "track_id": "apk_evidence_backed_ontology_synthesis_20260712",
        "status": "candidate-non-consumable",
        "consumable": False,
        "input_bindings": bindings,
        "counts": {
            "normalized_usage_records": len(usages),
            "blocked_role_state_records": len(usages),
            "adopted_role_state_records": 0,
        },
        "usage_records": sorted(usages.values(), key=lambda row: row["usage_id"]),
    }
    matrix = {
        "schema_version": "apk-t9-phase4-canonical-adoption-matrix.v1",
        "track_id": "apk_evidence_backed_ontology_synthesis_20260712",
        "status": "candidate-non-consumable",
        "consumable": False,
        "canonical_root": "packages/advantage-play-kit/assets/standard",
        "standard_pack_release_binding": {
            "version": "2026.07.23",
            "catalog_digest": "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
            "source_receipt_digest": "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
        },
        "mapping_boundary": "Only extension-free standard-pack-relative keys are permitted; all unresolved selections remain blocked.",
        "counts": {
            "candidate_rows": len(candidate_rows),
            "mapping_rows": sum(len(row["mappings"]) for row in candidate_rows),
            "blocked_mapping_rows": sum(len(row["mappings"]) for row in candidate_rows),
            "candidate_key_rows": 0,
        },
        "candidate_rows": candidate_rows,
    }
    return normalization, matrix


def render_gaps(
    responsive: dict[str, Any],
    normalization: dict[str, Any],
    matrix: dict[str, Any],
    repo_root: Path,
    bindings: dict[str, str],
) -> dict[str, Any]:
    """Ranks evidence gaps and bounded successor delivery without resolving them.

    Args:
        responsive: Rendered responsive contracts.
        normalization: Rendered semantic usage normalization.
        matrix: Rendered canonical adoption matrix.
        repo_root: Repository root containing accepted capability outputs.
        bindings: Exact accepted input bindings.

    Returns:
        Ranked non-consumable gap and delivery artifact.
    """
    classifications = load(repo_root / TRACK_REL / "phase2-capability-classification-v5.json")["capabilities"]
    blocked_responsive = sum(
        state == "blocked_unknown"
        for contract in responsive["contracts"]
        for profile in contract["profiles"]
        for state in profile["aspect_states"].values()
    )
    ranked = [
        {
            "rank": 1,
            "gap_id": "gap:responsive-profile-evidence",
            "kind": "responsive-primitive-and-contract-evidence",
            "priority": "Must-have",
            "decision_state": "blocked_unknown",
            "affected_count": blocked_responsive,
            "delivery_owner": "T10-independent-validation-then-cartridge-cohorts",
            "recommendation": "Collect exact compact/wide geometry, camera, visibility, region, control, content, transition, and state-preservation evidence per contract; preserve the six accepted failures.",
        },
        {
            "rank": 2,
            "gap_id": "gap:semantic-role-state-decisions",
            "kind": "physical-asset-requirement",
            "priority": "Must-have",
            "decision_state": "blocked_unknown",
            "affected_count": normalization["counts"]["blocked_role_state_records"],
            "delivery_owner": "T10-independent-asset-review",
            "recommendation": "Independently decide source-backed semantic role/state identities before any catalog candidate is selected.",
        },
        {
            "rank": 3,
            "gap_id": "gap:standard-pack-candidate-selection",
            "kind": "standard-pack-candidate-key",
            "priority": "Must-have",
            "decision_state": "blocked_unknown",
            "affected_count": matrix["counts"]["blocked_mapping_rows"],
            "delivery_owner": "T10-independent-asset-review",
            "recommendation": "Select only exact catalog keys after role/state approval and visual/contract validation; near matches and vendor filenames remain forbidden.",
        },
        {
            "rank": 4,
            "gap_id": "gap:accepted-capability-delivery",
            "kind": "kit-capability",
            "priority": "Should-have-after-T10",
            "decision_state": "candidate_recommendation_only",
            "affected_count": len(classifications),
            "delivery_owner": "T11-shared-developer-kit",
            "recommendation": "Implement only the seven accepted standardize/extend capability contracts after T10 publishes consumable hashes.",
        },
        {
            "rank": 5,
            "gap_id": "gap:cartridge-cohort-delivery",
            "kind": "cartridge-cohort",
            "priority": "Should-have-after-T10-and-T11",
            "decision_state": "candidate_recommendation_only",
            "affected_count": 29,
            "delivery_owner": "cartridge-rebuild-successor",
            "recommendation": "Retain the accepted pilot/action-traversal-puzzle-special partition; start no cohort until T10 and required shared capabilities are accepted.",
        },
    ]
    return {
        "schema_version": "apk-t9-phase5-gap-delivery-ranking.v1",
        "track_id": "apk_evidence_backed_ontology_synthesis_20260712",
        "status": "candidate-non-consumable",
        "consumable": False,
        "input_bindings": bindings,
        "unknown_must_have_resolution_policy": "Every unknown Must-have remains blocked for an explicit successor decision.",
        "ranked_gaps": ranked,
    }


def render(repo_root: Path, output_track_root: Path) -> list[Path]:
    """Renders all deterministic mapper outputs from accepted inputs.

    Args:
        repo_root: Repository root containing accepted evidence.
        output_track_root: Destination directory for generated artifacts.

    Returns:
        Paths written by the renderer.
    """
    bindings = input_bindings(repo_root)
    responsive = render_responsive(repo_root, bindings)
    normalization, matrix = render_assets(repo_root, bindings)
    gaps = render_gaps(responsive, normalization, matrix, repo_root, bindings)
    outputs = {
        RESPONSIVE: responsive,
        ASSET_NORMALIZATION: normalization,
        ADOPTION_MATRIX: matrix,
        GAPS: gaps,
    }
    written = []
    for name, value in outputs.items():
        path = output_track_root / name
        write_json(path, value)
        written.append(path)
    resources = {
        "schema_version": "apk-t9-phase6-resource-report.v1",
        "track_id": "apk_evidence_backed_ontology_synthesis_20260712",
        "status": "candidate-non-consumable",
        "consumable": False,
        "budget": {
            "negative_fixture_file_ceiling": 16,
            "published_output_byte_ceiling": 1048576,
            "normalized_source_document_ceiling": 32,
            "verifier_runtime_seconds_ceiling": 30,
        },
        "outputs": [{
            "path": name,
            "sha256": sha(output_track_root / name),
            "byte_size": (output_track_root / name).stat().st_size,
            "within_byte_ceiling": (output_track_root / name).stat().st_size <= 1048576,
        } for name in sorted(outputs)],
        "generator": {
            "path": "generate_phase3_6_candidate.py",
            "decision_boundary": "The renderer copies accepted identities and applies the approved fail-closed rule that absent exact evidence remains blocked; it never selects a semantic role, responsive fact, or catalog candidate.",
        },
    }
    resource_path = output_track_root / RESOURCE_REPORT
    write_json(resource_path, resources)
    written.append(resource_path)
    return written


def main() -> int:
    """Runs the deterministic candidate renderer.

    Returns:
        Process exit code.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument("--output-track-root", type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    written = render(args.repo_root.resolve(), args.output_track_root.resolve())
    print(json.dumps({"written": [str(path) for path in written]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
