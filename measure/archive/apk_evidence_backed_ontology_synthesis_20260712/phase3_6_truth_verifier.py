#!/usr/bin/env python3
"""Fail-closed truth verifier for T9 Phases 3 through 6."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re
import tempfile
from typing import Any

import generate_phase3_6_candidate as generator

RESPONSIVE = generator.RESPONSIVE
ASSET_NORMALIZATION = generator.ASSET_NORMALIZATION
ADOPTION_MATRIX = generator.ADOPTION_MATRIX
GAPS = generator.GAPS
RESOURCE_REPORT = generator.RESOURCE_REPORT
RESPONSIVE_REVIEW = "phase3-independent-responsive-review-v1.json"
ASSET_REVIEW = "phase4-independent-asset-review-v1.json"
CAPABILITY_REVIEW = "phase6-capability-consumer-review-v1.json"
ADVERSARIAL_REVIEW = "phase6-adversarial-review-v1.json"
CANDIDATE_MANIFEST = "phase6-candidate-synthesis-manifest-v1.json"
OWNER_DECISIONS = "phase3-6-owner-delegated-decisions-v1.json"
ROOT_ACCEPTANCE = "phase6-root-acceptance-v1.json"
FIXTURE_MANIFEST = "phase6-fixture-manifest-v1.json"
TRUTH_REPORT = "phase6-truth-report-v1.json"
MAPPER_OUTPUTS = (RESPONSIVE, ASSET_NORMALIZATION, ADOPTION_MATRIX, GAPS, RESOURCE_REPORT)
REVIEW_OUTPUTS = (RESPONSIVE_REVIEW, ASSET_REVIEW, CAPABILITY_REVIEW)
ASPECTS = set(generator.ASPECTS)
PROFILES = set(generator.PROFILES)
DIRECT_MAPPING = re.compile(r"(?:apps/|/games/|\\|\.(?:png|jpg|jpeg|gif|svg|mp3|wav|ogg)\b|elvgames|vendor)", re.IGNORECASE)


@dataclass(frozen=True)
class Finding:
    """Represents one deterministic verification finding."""

    code: str
    detail: str


@dataclass(frozen=True)
class VerificationResult:
    """Represents the public Phase 3 through 6 verification result."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Returns whether the exact T9 candidate is ready for T10."""
        return self.state == "T9_CANDIDATE_READY_FOR_T10_NON_CONSUMABLE" and not self.findings

    @property
    def codes(self) -> set[str]:
        """Returns the stable set of finding codes."""
        return {finding.code for finding in self.findings}


def load(path: Path) -> Any:
    """Loads one UTF-8 JSON artifact.

    Args:
        path: Artifact to parse.

    Returns:
        Parsed JSON value.
    """
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path: Path) -> str:
    """Returns the SHA-256 digest of exact file bytes.

    Args:
        path: Artifact to hash.

    Returns:
        Lowercase hexadecimal digest.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def value_sha(value: Any) -> str:
    """Returns the canonical digest for one JSON value.

    Args:
        value: JSON-compatible value.

    Returns:
        Lowercase hexadecimal digest.
    """
    text = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def add(findings: list[Finding], code: str, detail: str) -> None:
    """Adds one de-duplicated finding.

    Args:
        findings: Mutable finding collection.
        code: Stable machine-readable code.
        detail: Bounded human-readable detail.

    Returns:
        None.
    """
    finding = Finding(code, detail)
    if finding not in findings:
        findings.append(finding)


def clean_review(review: Any) -> bool:
    """Returns whether a review has no unresolved findings.

    Args:
        review: Candidate review artifact.

    Returns:
        Whether all severity lists are empty and status is passing.
    """
    findings = review.get("findings") if isinstance(review, dict) else None
    return (
        isinstance(findings, dict)
        and set(findings) == {"Critical", "High", "Medium", "Low"}
        and all(not findings[level] for level in findings)
        and review.get("status") == "review-pass-no-unresolved-critical-high-medium"
    )


def expected_responsive(repo_root: Path) -> dict[tuple[str, str | None, str | None], tuple[list[str], list[str]]]:
    """Derives exact responsive scope and claim closure from accepted Phase 1.

    Args:
        repo_root: Repository root containing accepted mechanics.

    Returns:
        Scope keys mapped to exact source record and claim IDs.
    """
    blueprints = load(repo_root / generator.TRACK_REL / "phase1-mechanic-blueprints-v1.json")
    grouped: dict[tuple[str, str | None, str | None], tuple[list[str], list[str]]] = {}
    buckets: dict[tuple[str, str | None, str | None], list[dict[str, Any]]] = {}
    for record in blueprints["records"]:
        buckets.setdefault((record["game_id"], record.get("scene_id"), record.get("state_id")), []).append(record)
    for key, records in buckets.items():
        grouped[key] = (
            sorted(record["record_id"] for record in records),
            sorted({claim for record in records for claim in generator.claim_ids(record)}),
        )
    grouped[("castle-defense", None, None)] = ([], [])
    return grouped


def verify_responsive(repo_root: Path, track_root: Path, findings: list[Finding]) -> int:
    """Verifies responsive denominator, claim closure, profiles, and failures.

    Args:
        repo_root: Repository root containing accepted evidence.
        track_root: Candidate track root.
        findings: Mutable finding collection.

    Returns:
        Number of responsive checks performed.
    """
    artifact = load(track_root / RESPONSIVE)
    contracts = artifact.get("contracts", [])
    expected = expected_responsive(repo_root)
    actual: dict[tuple[str, str | None, str | None], dict[str, Any]] = {}
    for row in contracts if isinstance(contracts, list) else []:
        key = (row.get("game_id"), row.get("scene_id"), row.get("state_id"))
        if key in actual:
            add(findings, "RESPONSIVE_DENOMINATOR", f"duplicate scope {key}")
        actual[key] = row
    if set(actual) != set(expected) or len({key[0] for key in actual}) != 29:
        add(findings, "RESPONSIVE_DENOMINATOR", "exact 29-game scene/state scope differs")
    observed_failures: set[tuple[str, str, str]] = set()
    for key, expected_values in expected.items():
        row = actual.get(key)
        if not isinstance(row, dict):
            continue
        if row.get("source_record_ids") != expected_values[0] or row.get("upstream_claim_ids") != expected_values[1]:
            add(findings, "RESPONSIVE_CLAIM_CLOSURE", str(key))
        profiles = row.get("profiles")
        if not isinstance(profiles, list) or {profile.get("profile_id") for profile in profiles} != PROFILES:
            add(findings, "RESPONSIVE_PROFILE_CONTRACT", str(key))
            continue
        for profile in profiles:
            if profile.get("aspect_states") != {aspect: "blocked_unknown" for aspect in generator.ASPECTS}:
                add(findings, "RESPONSIVE_NON_EQUIVALENCE", f"aspect states {key}")
            failure = profile.get("known_failure")
            if failure:
                observed_failures.add((row["game_id"], profile["profile_id"], failure))
                source = profile.get("known_failure_source")
                if not isinstance(source, dict) or source.get("sha256") != generator.T8_INPUTS["phase5-root-acceptance.json"]:
                    add(findings, "BROWSER_EVIDENCE_SCOPE", str(key))
    expected_failures = {(game, profile, text) for (game, profile), text in generator.KNOWN_FAILURES.items()}
    if observed_failures != expected_failures:
        add(findings, "BROWSER_EVIDENCE_SCOPE", "six accepted defects and two-profile RPG projection differ")
    if artifact.get("consumable") is not False or "not historical fact" not in artifact.get("policy_boundary", ""):
        add(findings, "POLICY_AS_HISTORICAL_FACT", "responsive policy boundary differs")
    return len(expected) + sum(len(row.get("profiles", [])) for row in contracts)


def expected_t8(repo_root: Path) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    """Loads the accepted T8 denominator and exact internal Phase 4 joins.

    Args:
        repo_root: Repository root containing accepted T8 evidence.

    Returns:
        Accepted entries and join index.
    """
    accepted = load(repo_root / generator.T8_REL / "phase5-accepted-manifest-v1.json")
    return accepted["entries"], generator.t8_join_index(repo_root)


def mapping_strings(mapping: dict[str, Any]) -> str:
    """Serializes one adoption mapping for forbidden-path scanning.

    Args:
        mapping: One standard-pack-relative mapping.

    Returns:
        Canonical lowercase JSON text.
    """
    return json.dumps(mapping, sort_keys=True, ensure_ascii=False).lower()


def verify_assets(repo_root: Path, track_root: Path, findings: list[Finding]) -> int:
    """Verifies T8 parity, semantic blockers, and standard-pack key policy.

    Args:
        repo_root: Repository root containing T8 and catalog inputs.
        track_root: Candidate track root.
        findings: Mutable finding collection.

    Returns:
        Number of asset checks performed.
    """
    normalization = load(track_root / ASSET_NORMALIZATION)
    matrix = load(track_root / ADOPTION_MATRIX)
    entries, joins = expected_t8(repo_root)
    rows = matrix.get("candidate_rows", [])
    expected_identity = [{
        "t8_record_index": entry["record_index"],
        "t8_report_record_sha256": entry["report_record_sha256"],
        "source_asset_sha256": entry["asset_sha256"],
        "batch_id": entry["batch_id"],
        "t8_disposition": entry["disposition"]["value"],
        "t8_join_status": entry["join_status"],
    } for entry in entries]
    actual_identity = [{key: row.get(key) for key in expected_identity[0]} for row in rows] if rows else []
    if actual_identity != expected_identity or len(rows) != 428:
        add(findings, "T8_CANDIDATE_DENOMINATOR", "exact ordered 428-row identity differs")
    catalog = load(repo_root / generator.PACK_REL / "standard-pack-release.json")
    catalog_keys = {asset["key"] for asset in catalog["assets"]}
    expected_usage_ids: set[str] = set()
    expected_mapping_rows = 0
    for entry, row in zip(entries, rows):
        join = joins[entry["canonical_path"]]
        links = join.get("usage_links", [])
        expected_mapping_rows += len(links)
        expected_usage_ids.update(link["usage_id"] for link in links)
        mappings = row.get("mappings", [])
        if [mapping.get("usage_id") for mapping in mappings] != sorted(link["usage_id"] for link in links):
            add(findings, "USAGE_RESOLUTION", f"record {entry['record_index']}")
        if row.get("direct_legacy_adoption") is not False:
            add(findings, "DIRECT_OR_VENDOR_MAPPING", f"record {entry['record_index']}")
        for mapping in mappings:
            if DIRECT_MAPPING.search(mapping_strings(mapping)):
                add(findings, "DIRECT_OR_VENDOR_MAPPING", f"record {entry['record_index']}")
            adoption = mapping.get("adoption", {})
            if adoption.get("state") == "candidate":
                key = adoption.get("standard_pack_key")
                if key not in catalog_keys:
                    add(findings, "ABSENT_STANDARD_PACK_KEY", str(key))
            elif adoption != {
                "state": "blocked",
                "standard_pack_key": None,
                "blocker": "No independently approved semantic role/state and exact standard-pack candidate selection exists; filename or visual near-match selection is forbidden.",
            }:
                add(findings, "NON_BLOCKED_UNKNOWN_ADOPTION", f"record {entry['record_index']}")
            if mapping.get("semantic_role") is not None or mapping.get("semantic_state") is not None:
                add(findings, "UNSUPPORTED_SEMANTIC_ROLE", f"record {entry['record_index']}")
            if mapping.get("gameplay_variant") != {"status": "blocked_unknown"}:
                add(findings, "SOURCE_PACK_VARIANT_CONFLATION", f"record {entry['record_index']}")
    usage_records = normalization.get("usage_records", [])
    if len(usage_records) != 45 or {row.get("usage_id") for row in usage_records} != expected_usage_ids:
        add(findings, "USAGE_RESOLUTION", "exact 45 normalized usage IDs differ")
    if matrix.get("counts") != {
        "candidate_rows": 428,
        "mapping_rows": expected_mapping_rows,
        "blocked_mapping_rows": expected_mapping_rows,
        "candidate_key_rows": 0,
    }:
        add(findings, "STALE_CANDIDATE_COUNT", "matrix counts differ")
    release = matrix.get("standard_pack_release_binding")
    if release != {
        "version": "2026.07.23",
        "catalog_digest": "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
        "source_receipt_digest": "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
    }:
        add(findings, "STANDARD_PACK_BINDING", "release binding differs")
    return len(rows) + len(usage_records) + expected_mapping_rows


def capability_games(repo_root: Path) -> dict[str, list[str]]:
    """Derives exact accepted game consumers for each capability.

    Args:
        repo_root: Repository root containing accepted Phase 2 outputs.

    Returns:
        Capability IDs mapped to sorted game IDs.
    """
    _, by_capability = generator.capability_games(repo_root)
    return by_capability


def verify_reviews(repo_root: Path, track_root: Path, findings: list[Finding]) -> int:
    """Verifies exhaustive domain reviews and capability consumer minimums.

    Args:
        repo_root: Repository root containing accepted Phase 2 evidence.
        track_root: Candidate track root.
        findings: Mutable finding collection.

    Returns:
        Number of review rows checked.
    """
    responsive = load(track_root / RESPONSIVE)
    responsive_review = load(track_root / RESPONSIVE_REVIEW)
    asset_normalization = load(track_root / ASSET_NORMALIZATION)
    matrix = load(track_root / ADOPTION_MATRIX)
    asset_review = load(track_root / ASSET_REVIEW)
    capability_review = load(track_root / CAPABILITY_REVIEW)
    for review in (responsive_review, asset_review, capability_review):
        if not clean_review(review):
            add(findings, "BLOCKING_REVIEW_FINDING", review.get("reviewer_role", "unknown"))
        if review.get("provider_fork_turns_attested") is not False or not review.get("provider_isolation_disclosure"):
            add(findings, "REVIEW_PROVENANCE_MISREPRESENTED", review.get("reviewer_role", "unknown"))
    responsive_expected = {row["contract_id"]: value_sha(row) for row in responsive["contracts"]}
    responsive_actual = {row.get("contract_id"): row.get("reviewed_object_sha256") for row in responsive_review.get("reviewed_contracts", [])}
    if responsive_actual != responsive_expected:
        add(findings, "INCOMPLETE_INDEPENDENT_REVIEW", "responsive contracts")
    usage_expected = {row["usage_id"]: value_sha(row) for row in asset_normalization["usage_records"]}
    usage_actual = {row.get("usage_id"): row.get("reviewed_object_sha256") for row in asset_review.get("usage_reviews", [])}
    candidate_expected = {row["t8_record_index"]: value_sha(row) for row in matrix["candidate_rows"]}
    candidate_actual = {row.get("t8_record_index"): row.get("reviewed_object_sha256") for row in asset_review.get("candidate_row_reviews", [])}
    if usage_actual != usage_expected or candidate_actual != candidate_expected:
        add(findings, "INCOMPLETE_INDEPENDENT_REVIEW", "asset usages or candidate rows")
    expected_games = capability_games(repo_root)
    reviews = capability_review.get("capability_reviews", [])
    actual_games = {row.get("capability_id"): row.get("game_ids") for row in reviews}
    if actual_games != expected_games:
        add(findings, "STANDARDIZATION_CONSUMER_COUNT", "capability game consumers differ")
    for row in reviews:
        if row.get("disposition") in {"standardize", "extend"} and len(row.get("game_ids", [])) < 2:
            add(findings, "STANDARDIZATION_CONSUMER_COUNT", row.get("capability_id", "unknown"))
    return len(responsive_expected) + len(usage_expected) + len(candidate_expected) + len(reviews)


def verify_gaps(track_root: Path, findings: list[Finding]) -> int:
    """Verifies ranked gaps preserve unknown Must-have decisions.

    Args:
        track_root: Candidate track root.
        findings: Mutable finding collection.

    Returns:
        Number of ranked gaps checked.
    """
    artifact = load(track_root / GAPS)
    gaps = artifact.get("ranked_gaps", [])
    if [gap.get("rank") for gap in gaps] != list(range(1, len(gaps) + 1)):
        add(findings, "GAP_RANKING", "ranks are not deterministic and contiguous")
    for gap in gaps:
        if gap.get("priority") == "Must-have" and gap.get("decision_state") != "blocked_unknown":
            add(findings, "UNKNOWN_MUST_HAVE_RESOLVED", gap.get("gap_id", "unknown"))
    if artifact.get("consumable") is not False:
        add(findings, "CONSUMABLE_SUCCESSOR_PUBLICATION", GAPS)
    return len(gaps)


def generator_drift(repo_root: Path, track_root: Path) -> list[str]:
    """Regenerates mapper outputs and reports byte-level nondeterminism.

    Args:
        repo_root: Repository root containing accepted inputs.
        track_root: Candidate track root containing published outputs.

    Returns:
        Relative output names whose bytes differ.
    """
    with tempfile.TemporaryDirectory() as directory:
        generated = Path(directory)
        generator.render(repo_root, generated)
        return [name for name in MAPPER_OUTPUTS if (generated / name).read_bytes() != (track_root / name).read_bytes()]


def verify_fixture_manifest(track_root: Path, findings: list[Finding]) -> int:
    """Verifies the exact bounded adversarial fixture inventory.

    Args:
        track_root: Candidate track root.
        findings: Mutable finding collection.

    Returns:
        Number of fixtures checked.
    """
    manifest_path = track_root / FIXTURE_MANIFEST
    if not manifest_path.is_file():
        add(findings, "FIXTURE_MANIFEST", "missing fixture manifest")
        return 0
    manifest = load(manifest_path)
    fixtures = manifest.get("fixtures", [])
    live = sorted((track_root / "negative-fixtures" / "phase3-6").glob("*.json"))
    declared_paths = [row.get("path") for row in fixtures]
    live_paths = [str(path.relative_to(track_root)) for path in live]
    if len(fixtures) > 16 or declared_paths != live_paths or len(declared_paths) != len(set(declared_paths)):
        add(findings, "FIXTURE_MANIFEST", "exact bounded fixture set differs")
    for row in fixtures:
        path = track_root / row["path"]
        if not path.is_file() or sha(path) != row.get("sha256"):
            add(findings, "FIXTURE_MANIFEST", row.get("path", "unknown"))
    return len(fixtures)


def verify_package(track_root: Path, findings: list[Finding]) -> tuple[str, int]:
    """Verifies the final non-consumable package and delegated decisions.

    Args:
        track_root: Candidate track root.
        findings: Mutable finding collection.

    Returns:
        Lifecycle state and package check count.
    """
    required_candidate = (ADVERSARIAL_REVIEW, CANDIDATE_MANIFEST, TRUTH_REPORT)
    if any(not (track_root / name).is_file() for name in required_candidate):
        return "VERIFIED_PENDING_PHASE6_CANDIDATE_PACKAGE", 0
    adversarial = load(track_root / ADVERSARIAL_REVIEW)
    if not clean_review(adversarial):
        add(findings, "BLOCKING_REVIEW_FINDING", "phase6 adversarial review")
    manifest = load(track_root / CANDIDATE_MANIFEST)
    if manifest.get("consumable") is not False or manifest.get("status") != "candidate-non-consumable-for-T10-review-only" or "successor_hashes" in manifest:
        add(findings, "CONSUMABLE_SUCCESSOR_PUBLICATION", CANDIDATE_MANIFEST)
    expected_bindings = {name: sha(track_root / name) for name in (*MAPPER_OUTPUTS, *REVIEW_OUTPUTS, ADVERSARIAL_REVIEW, TRUTH_REPORT)}
    if manifest.get("artifact_bindings") != expected_bindings:
        add(findings, "CANDIDATE_PACKAGE_BINDING", "artifact bindings differ")
    if findings:
        return "T9_BLOCKED", len(expected_bindings) + 2
    if any(not (track_root / name).is_file() for name in (OWNER_DECISIONS, ROOT_ACCEPTANCE)):
        return "VERIFIED_PENDING_OWNER_DELEGATED_PHASE_GATES", len(expected_bindings) + 2
    owner = load(track_root / OWNER_DECISIONS)
    decisions = owner.get("decisions", [])
    expected_phases = [3, 4, 5, 6]
    if [row.get("phase") for row in decisions] != expected_phases or any(row.get("decision") != "ACCEPT_OWNER_DELEGATED_GATE" for row in decisions):
        add(findings, "OWNER_DELEGATED_GATE", "explicit ordered phase decisions differ")
    if owner.get("automated_truth_report") != {"path": TRUTH_REPORT, "sha256": sha(track_root / TRUTH_REPORT)}:
        add(findings, "OWNER_DELEGATED_GATE", "truth report binding differs")
    root = load(track_root / ROOT_ACCEPTANCE)
    if (
        root.get("decision") != "ACCEPT_T9_CANDIDATE_FOR_T10_INDEPENDENT_REVIEW_ONLY"
        or root.get("consumable") is not False
        or root.get("t10_may_start") is not True
        or root.get("candidate_manifest") != {"path": CANDIDATE_MANIFEST, "sha256": sha(track_root / CANDIDATE_MANIFEST)}
    ):
        add(findings, "ROOT_ACCEPTANCE", "T10-only non-consumable handoff differs")
    return "T9_CANDIDATE_READY_FOR_T10_NON_CONSUMABLE", len(expected_bindings) + len(decisions) + 4


def verify(repo_root: Path, track_root: Path) -> VerificationResult:
    """Runs every T9 Phase 3 through 6 truth and package gate.

    Args:
        repo_root: Repository root containing accepted predecessor evidence.
        track_root: T9 candidate track root.

    Returns:
        Deterministic verification result.
    """
    findings: list[Finding] = []
    checks = 0
    for name in MAPPER_OUTPUTS + REVIEW_OUTPUTS:
        if not (track_root / name).is_file():
            add(findings, "MISSING_ARTIFACT", name)
    if findings:
        return VerificationResult("RED_MISSING_PHASE3_6_ARTIFACTS", tuple(findings), checks)
    try:
        generator.input_bindings(repo_root)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        add(findings, "ACCEPTED_INPUT_DRIFT", str(error))
    checks += verify_responsive(repo_root, track_root, findings)
    checks += verify_assets(repo_root, track_root, findings)
    checks += verify_reviews(repo_root, track_root, findings)
    checks += verify_gaps(track_root, findings)
    checks += verify_fixture_manifest(track_root, findings)
    drift = generator_drift(repo_root, track_root)
    if drift:
        add(findings, "GENERATOR_NONDETERMINISM", ", ".join(drift))
    resources = load(track_root / RESOURCE_REPORT)
    if any(not row.get("within_byte_ceiling") for row in resources.get("outputs", [])):
        add(findings, "RESOURCE_BUDGET", "one or more output artifacts exceed 1 MiB")
    if findings:
        return VerificationResult("T9_BLOCKED", tuple(findings), checks)
    state, package_checks = verify_package(track_root, findings)
    checks += package_checks
    if findings:
        state = "T9_BLOCKED"
    return VerificationResult(state, tuple(findings), checks)


def main() -> int:
    """Runs verification and prints a stable JSON report.

    Returns:
        Process exit code.
    """
    repo_root = Path(__file__).resolve().parents[3]
    track_root = Path(__file__).resolve().parent
    result = verify(repo_root, track_root)
    print(json.dumps({
        "state": result.state,
        "passed": result.passed,
        "checks": result.checks,
        "findings": [{"code": row.code, "detail": row.detail} for row in result.findings],
    }, indent=2, sort_keys=True))
    return 0 if not result.findings else 1


if __name__ == "__main__":
    raise SystemExit(main())
