#!/usr/bin/env python3
"""Verifies Phase 2 v7 finding specificity and residual semantic routing."""

from __future__ import annotations

import argparse
import copy
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re
import sys
from typing import Any

import phase2_v5_truth_verifier as v5

TRACK_ID = "apk_evidence_backed_ontology_synthesis_20260712"
DISPATCH_PATH = "phase2-role-dispatch-v7.json"
DISPATCH_SHA256 = "a06cbac2c3cee7c993c96c39a470c777782e375119c0e29d3e4905bed69b4035"
MAPPER_OUTPUTS = (
    "phase2-capability-comparisons-v4.json",
    "phase2-capability-classification-v4.json",
    "phase2-extension-boundaries-v4.json",
    "phase2-claim-dependency-edges-v4.json",
)
MAPPER_RECEIPT = "role-receipts/phase2/capability-mapper-v4.json"
FIXTURE_MANIFEST = "phase2-v7-fixture-manifest.json"
MAX_FIXTURE_FILES = 16
MAX_OUTPUT_BYTES = 1_048_576

PRESERVED_V5 = {
    "phase2_v5_truth_verifier.py": "caf4d13a7709c305199702df36f8593310df11be3988debecfb26c8064dbb0ba",
    "phase2_v5_truth_verifier_test.py": "749acf58aa0eeae0174b12c1d9c8f71e5bb58bf6bd02464f329ddcb6d2b2ff86",
    "phase2-v5-fixture-manifest.json": "27c1cef4115d479e35ac030eefc58434542c2a87678a560b5aa3fcd93bb1542a",
    "phase2-v5-red-report.json": "3e0e40c20519facf1b1822654e09d06ae8c631abbff170eb988021f33be0d3e7",
    "phase2-v5-green-report.json": "a2bf211de569bfc1517f1e9fb1e272cba6046a66abd15a4a5520122afbf0b3a7",
    "role-receipts/phase2/truth-test-author-v5.json": "cef4ceeb47d00a15120e73b811ddf1261ede4eeb89575a5f706ec2fdf4826abe",
}
PRESERVED_V6 = {
    "phase2-role-dispatch-v6.json": "62fb22f1e81f142cc2b60cde455304b21d4c9dcd368e70f5fa235573dd13c60f",
    "phase2_v6_truth_verifier.py": "523794616e2f764bb020a6fe6a915e6ed3060da7358d0b157cb902277b9af78c",
    "phase2_v6_truth_verifier_test.py": "c0797f8620226ad537b42d59c11077fec334bed5ddf99d6e2851b2a51008898e",
    "phase2-v6-fixture-manifest.json": "48eaeb5c4cc7314e404b9f1dfa3ea61ec53a43284a7ee5827982302c12b489d7",
    "phase2-v6-red-report.json": "7d7af5c8a33dc60f52d640b476023d8357e602356cbcc0dd97fbc7a7371926bb",
    "role-receipts/phase2/truth-test-author-v6.json": "474da3e8c8ba383554e66952074ad0100167706f22c6cca14d66ad251038729b",
}
REJECTED_V5 = {
    "phase2-capability-comparisons-v3.json": "9407896e691f2c156b4ba22ea07f76c64c9e052b2b892e31fcff68a7091ec8a4",
    "phase2-capability-classification-v3.json": "6a76369c35bfd1fe6e4b2b021544628002e99a440cddcd3f620f6d920ff0765b",
    "phase2-extension-boundaries-v3.json": "84595467e1c834f4155b566f422585cb538d46a8de262acd43c1e2d029928a7e",
    "phase2-claim-dependency-edges-v3.json": "242b79c50bba9a9a4a1d1c602b66a6e5dd820c5bb0eeb33a974ba4fdd7966bdd",
    "role-receipts/phase2/capability-mapper-v3.json": "bbae271bb2a7bf8d9d4f8cfeea492a5c90a23def934bc0de4023e07ebfaf9eda",
    "phase2-v5-independent-review.json": "94886c8a6625704ad94173da1690e60f83223294bdf863e5dde1326831d97df9",
    "role-receipts/phase2/capability-reviewer-v5.json": "d0a1940ff720cb5800478f5bc8687fd0bc3694c9bd1e58667e18af03c066fbc1",
}

DIFFERENCE_KEYS = {*v5.FINDING_KEYS, "comparison_dimension", "per_game_variants"}
VARIANT_KEYS = {"game_id", "variant_summary", "consumer_record_ids"}
EMBEDDED_DIFFERENCE_KEYS = {
    *v5.EMBEDDED_FINDING_KEYS,
    "comparison_dimension",
    "per_game_variants",
}
GENERIC_DIFFERENCE_PHRASES = (
    "rules and parameters",
    "accepted behavior behind the shared contract",
)
GENERIC_BOUNDARY_PHRASES = (
    "typed invariant and shared orchestration",
    "accepted tuning, rules, and presentation behavior",
    "typed inputs and outcomes",
)
GENERIC_RELEVANCE_PHRASES = (
    "governs this runtime behavior because it establishes",
    "the shared contract and game adapter must preserve",
)
STOPWORDS = {
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "for",
    "from",
    "if",
    "in",
    "into",
    "of",
    "on",
    "or",
    "the",
    "then",
    "to",
    "via",
    "when",
    "while",
    "with",
    "without",
}
GENERIC_TOKENS = STOPWORDS | {
    "accepted",
    "adapter",
    "behavior",
    "capability",
    "contract",
    "game",
    "governs",
    "preserve",
    "runtime",
    "shared",
    "this",
}
RESIDUAL_CAPABILITY_ROUTES = {
    "capability:difficulty-configuration": {"RPG-MECH-005", "WVZ-MECH-009"},
    "capability:nonempty-content-precondition": {"AW-HIST-011"},
}
RESIDUAL_CONTEXT = {
    "DF-COPY-008",
    "RPG-GRAPH-001",
    "RPG-GRAPH-002",
    "RPG-GRAPH-003",
    "DF-COPY-010",
    "AW-HIST-012",
}


@dataclass(frozen=True)
class Finding:
    """Describes one stable v6 rejection."""

    code: str
    message: str


@dataclass(frozen=True)
class VerificationResult:
    """Contains a v6 state, findings, and bounded check count."""

    state: str
    findings: tuple[Finding, ...]
    checks: int

    @property
    def passed(self) -> bool:
        """Returns whether all v6 contracts are satisfied."""
        return self.state == "VERIFIED" and not self.findings


def _add(findings: list[Finding], code: str, message: str) -> None:
    """Adds one stable finding per code."""
    if code not in {item.code for item in findings}:
        findings.append(Finding(code, message))


def _load(path: Path) -> dict[str, Any]:
    """Loads one JSON object."""
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError(f"{path} is not a JSON object")
    return value


def _sha(path: Path) -> str:
    """Returns one raw-byte SHA-256 digest."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _digest(value: Any) -> str:
    """Returns a deterministic in-memory JSON digest."""
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def _shape(findings: list[Finding], value: Any, keys: set[str]) -> None:
    """Rejects missing, surplus, and non-object schema values."""
    if not isinstance(value, dict):
        _add(findings, "INVALID_SCHEMA", "A declared object is not an object.")
        return
    if keys - set(value):
        _add(
            findings,
            "MISSING_REQUIRED_FIELD",
            f"Missing fields: {sorted(keys - set(value))}",
        )
    if set(value) - keys:
        _add(findings, "SURPLUS_FIELD", f"Surplus fields: {sorted(set(value) - keys)}")


def _truth_contract(track_root: Path) -> dict[str, str]:
    """Returns exact v6 Red package hashes required by mapper v4."""
    paths = (
        "phase2_v7_truth_verifier.py",
        "phase2_v7_truth_verifier_test.py",
        FIXTURE_MANIFEST,
        "phase2-v7-red-report.json",
    )
    return {path: _sha(track_root / path) for path in paths}


def _verify_inputs(
    track_root: Path, findings: list[Finding]
) -> tuple[int, dict[str, Any]]:
    """Verifies v6 authority, rejected v5, and all preserved truth bytes."""
    fixed = {
        DISPATCH_PATH: DISPATCH_SHA256,
        **PRESERVED_V6,
        **PRESERVED_V5,
        **REJECTED_V5,
        v5.DISPATCH_PATH: v5.DISPATCH_SHA256,
    }
    for path, digest in fixed.items():
        candidate = track_root / path
        if not candidate.is_file() or _sha(candidate) != digest:
            _add(findings, "PHASE2_INPUT_DRIFT", f"Frozen input differs: {path}")
    if findings:
        return len(fixed), {}
    dispatch = _load(track_root / DISPATCH_PATH)
    if (
        dispatch.get("status") != "active-truth-lifecycle-repair"
        or dispatch.get("schema_version") != "apk-t9-phase2-role-dispatch.v7"
    ):
        _add(findings, "PHASE2_INPUT_DRIFT", "The v6 authority is not active.")
    old: list[v5.Finding] = []
    _, inputs = v5._verify_inputs(track_root, old)
    if old:
        _add(findings, "PHASE2_INPUT_DRIFT", "Preserved v5 inputs differ.")
    return len(fixed) + 6, inputs


def _tokens(value: Any) -> set[str]:
    """Returns meaningful lowercase words from text."""
    return {
        word
        for word in re.findall(r"[a-z0-9]+", str(value).lower())
        if len(word) >= 4 and word not in GENERIC_TOKENS
    }


def _excerpt_complete(value: Any) -> bool:
    """Returns whether an excerpt is balanced and ends at a complete clause."""
    if not isinstance(value, str) or v5._has_ellipsis(value):
        return False
    if value.count("(") != value.count(")") or value.count("[") != value.count("]"):
        return False
    if value.count("“") != value.count("”") or value.count("‘") != value.count("’"):
        return False
    if value.count('"') % 2:
        return False
    words = re.findall(r"[a-z]+", value.lower())
    return (
        bool(words)
        and words[-1] not in STOPWORDS
        and not re.search(r"[,;:\-–—]$", value.strip())
    )


def _validate_excerpt(findings: list[Finding], use: dict[str, Any]) -> None:
    """Validates whole-clause, balanced, literal accepted evidence."""
    excerpt = use.get("exact_excerpt")
    if not _excerpt_complete(excerpt):
        _add(
            findings,
            "INCOMPLETE_EXCERPT",
            "Exact excerpt is unbalanced or ends mid-clause.",
        )


def _validate_relevance(findings: list[Finding], uses: list[dict[str, Any]]) -> None:
    """Validates record-specific relevance grounded in excerpt behavior."""
    seen: dict[tuple[str, str], str] = {}
    statements: dict[str, set[tuple[str, str]]] = {}
    for capability_id, use in uses:
        relevance = use.get("relevance_statement")
        excerpt = use.get("exact_excerpt")
        key = (capability_id, use.get("record_id"))
        if not isinstance(relevance, str):
            continue
        prior = seen.get(key)
        if prior is not None and prior != relevance:
            _add(
                findings,
                "REUSED_RELEVANCE_TEMPLATE",
                "A record/capability pair has inconsistent relevance.",
            )
        seen[key] = relevance
        statements.setdefault(relevance, set()).add(key)
        if any(phrase in relevance.lower() for phrase in GENERIC_RELEVANCE_PHRASES):
            _add(
                findings,
                "GENERIC_RELEVANCE_TEMPLATE",
                "Capability relevance uses a generic template.",
            )
        if not (_tokens(relevance) & _tokens(excerpt)):
            _add(
                findings,
                "RELEVANCE_DOES_NOT_NAME_EXCERPT_BEHAVIOR",
                "Relevance does not name behavior from its excerpt.",
            )
    if any(len(keys) > 1 for keys in statements.values()):
        _add(
            findings,
            "REUSED_RELEVANCE_TEMPLATE",
            "One relevance statement is reused across evidence uses.",
        )


def _validate_difference(findings: list[Finding], finding: Any) -> None:
    """Validates concrete comparison dimensions and game-specific variants."""
    _shape(findings, finding, DIFFERENCE_KEYS)
    if not isinstance(finding, dict):
        return
    dimension = finding.get("comparison_dimension")
    statement = finding.get("statement")
    variants = finding.get("per_game_variants")
    if not isinstance(dimension, str) or not 8 <= len(dimension) <= 120:
        _add(
            findings,
            "MISSING_COMPARISON_DIMENSION",
            "Difference lacks a concrete comparison dimension.",
        )
    if not isinstance(statement, str) or any(
        phrase in statement.lower() for phrase in GENERIC_DIFFERENCE_PHRASES
    ):
        _add(
            findings,
            "GENERIC_DIFFERENCE_STATEMENT",
            "Difference uses generic rules-and-parameters language.",
        )
    elif isinstance(dimension, str) and dimension.lower() not in statement.lower():
        _add(
            findings,
            "DIFFERENCE_OMITS_COMPARISON_DIMENSION",
            "Difference statement omits its comparison dimension.",
        )
    if not isinstance(variants, list) or not variants:
        _add(
            findings, "MISSING_PER_GAME_VARIANTS", "Difference lacks per-game variants."
        )
        return
    expected_games = {
        row.get("game_id") for row in finding.get("per_game_behaviors", [])
    }
    actual_games = {row.get("game_id") for row in variants if isinstance(row, dict)}
    if actual_games != expected_games:
        _add(
            findings,
            "DIFFERENCE_OMITS_GAME_VARIANT",
            "Difference variants do not cover every evidence game.",
        )
    for row in variants:
        _shape(findings, row, VARIANT_KEYS)
        summary = row.get("variant_summary") if isinstance(row, dict) else None
        if (
            not isinstance(summary, str)
            or not 24 <= len(summary) <= 480
            or not _excerpt_complete(summary)
        ):
            _add(
                findings,
                "INCOMPLETE_GAME_VARIANT",
                "Game variant is not a complete concise behavior.",
            )
        if (
            isinstance(statement, str)
            and isinstance(summary, str)
            and not (_tokens(statement) & _tokens(summary))
        ):
            _add(
                findings,
                "DIFFERENCE_OMITS_GAME_VARIANT",
                "Difference statement does not name each game variant.",
            )


def _validate_specificity(bundle: dict[str, dict[str, Any]]) -> list[Finding]:
    """Validates finding, boundary, relevance, excerpt, and residual-route specificity."""
    findings: list[Finding] = []
    comparisons = bundle[MAPPER_OUTPUTS[0]]
    classifications = bundle[MAPPER_OUTPUTS[1]]
    all_findings = []
    uses: list[tuple[str, dict[str, Any]]] = []
    effects: dict[str, list[str]] = {}
    for batch in comparisons.get("evidence_batches", []):
        for finding in batch.get("similarities", []):
            all_findings.append(finding)
            statement = str(finding.get("statement", ""))
            excerpts = [
                ref.get("exact_excerpt", "") for ref in finding.get("consumer_refs", [])
            ]
            if not any(_tokens(statement) & _tokens(excerpt) for excerpt in excerpts):
                _add(
                    findings,
                    "GENERIC_SIMILARITY_STATEMENT",
                    "Similarity does not name an exact shared invariant.",
                )
        for finding in batch.get("differences", []):
            all_findings.append(finding)
            _validate_difference(findings, finding)
        for finding in [*batch.get("similarities", []), *batch.get("differences", [])]:
            effect = finding.get("boundary_effect")
            if isinstance(effect, dict):
                if any(
                    any(
                        phrase in str(value).lower()
                        for phrase in GENERIC_BOUNDARY_PHRASES
                    )
                    for value in effect.values()
                ):
                    _add(
                        findings,
                        "GENERIC_BOUNDARY_TEMPLATE",
                        "Boundary uses a forbidden generic template.",
                    )
                effects.setdefault(_digest(effect), []).append(
                    finding.get("finding_id")
                )
            for use in finding.get("consumer_refs", []):
                _validate_excerpt(findings, use)
    if any(len(ids) > 1 for ids in effects.values()):
        _add(
            findings,
            "REPEATED_BOUNDARY_EFFECT",
            "A boundary effect is reused across findings.",
        )
    for capability in classifications.get("capabilities", []):
        for use in capability.get("consumers", []):
            uses.append((capability.get("capability_id"), use))
    _validate_relevance(findings, uses)
    use_map, context, _ = v5._usage_map(classifications)
    for capability_id, claim_ids in RESIDUAL_CAPABILITY_ROUTES.items():
        for claim_id in claim_ids:
            if capability_id not in use_map.get(claim_id, set()):
                _add(
                    findings,
                    "RESIDUAL_ROUTING_REGRESSION",
                    f"{claim_id} is absent from {capability_id}.",
                )
    for claim_id in RESIDUAL_CONTEXT:
        if claim_id not in context or use_map.get(claim_id):
            _add(
                findings,
                "RESIDUAL_ROUTING_REGRESSION",
                f"{claim_id} is not capability-disjoint context.",
            )
    if "AW-HIST-030" in use_map:
        aw_uses = [
            use for capability_id, use in uses if use.get("claim_id") == "AW-HIST-030"
        ]
        if len({use.get("exact_excerpt") for use in aw_uses}) != len(aw_uses) or any(
            not _excerpt_complete(use.get("exact_excerpt")) for use in aw_uses
        ):
            _add(
                findings,
                "RESIDUAL_ROUTING_REGRESSION",
                "AW-HIST-030 lacks separate complete behavioral excerpts.",
            )
    elif "AW-HIST-030" not in context:
        _add(
            findings,
            "RESIDUAL_ROUTING_REGRESSION",
            "AW-HIST-030 is neither valid capability evidence nor context.",
        )
    del all_findings
    return sorted(findings, key=lambda item: item.code)


def _strip_difference(finding: dict[str, Any]) -> dict[str, Any]:
    """Projects a v6 difference to its inherited v5 finding."""
    return {
        key: copy.deepcopy(value)
        for key, value in finding.items()
        if key in v5.FINDING_KEYS
    }


def _strip_embedded(finding: dict[str, Any]) -> dict[str, Any]:
    """Projects a v6 embedded difference to its inherited v5 shape."""
    return {
        key: copy.deepcopy(value)
        for key, value in finding.items()
        if key in v5.EMBEDDED_FINDING_KEYS
    }


def _project_to_v5(
    track_root: Path, bundle: dict[str, dict[str, Any]]
) -> dict[str, dict[str, Any]]:
    """Projects v6 outputs into the sealed v5 validator."""
    projected = {
        path: copy.deepcopy(bundle[new])
        for path, new in zip(v5.MAPPER_OUTPUTS, MAPPER_OUTPUTS)
    }
    for batch in projected[v5.MAPPER_OUTPUTS[0]].get("evidence_batches", []):
        batch["differences"] = [
            _strip_difference(row) for row in batch.get("differences", [])
        ]
    for capability in projected[v5.MAPPER_OUTPUTS[1]].get("capabilities", []):
        capability["differences"] = [
            _strip_embedded(row) for row in capability.get("differences", [])
        ]
    for boundary in projected[v5.MAPPER_OUTPUTS[2]].get("boundaries", []):
        boundary["extension_points"] = [
            _strip_embedded(row) for row in boundary.get("extension_points", [])
        ]
        boundary["incompatibility_differences"] = [
            _strip_embedded(row)
            for row in boundary.get("incompatibility_differences", [])
        ]
    projected[v5.MAPPER_RECEIPT] = {
        "agent_ref": "/root/phase5_review_a/t9_phase0_final_reviewer",
        "owner_role": "capability-mapper",
        "task_id": "phase2-systemic-semantic-mapper-v3",
        "dispatch_sha256": v5.DISPATCH_SHA256,
        "truth_contract": v5._truth_contract(track_root),
        "output_hashes": {path: _digest(projected[path]) for path in v5.MAPPER_OUTPUTS},
        "status": "candidate",
    }
    return projected


def _validate_bundle(
    track_root: Path,
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    *,
    output_hashes: dict[str, str] | None = None,
) -> tuple[list[Finding], int]:
    """Validates v6 specificity and every inherited v5 contract."""
    findings = _validate_specificity(bundle)
    receipt = bundle[MAPPER_RECEIPT]
    v5._shape(findings, receipt, v5.v4.RECEIPT_KEYS)
    if not isinstance(receipt, dict) or set(receipt) != v5.v4.RECEIPT_KEYS:
        _add(findings, "INVALID_SCHEMA", "Mapper v4 receipt shape differs.")
    if (
        receipt.get("owner_role") != "capability-mapper"
        or receipt.get("task_id") != "phase2-specificity-mapper-v4-v7"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("truth_contract") != _truth_contract(track_root)
    ):
        _add(findings, "STALE_OR_WRONG_RECEIPT", "Mapper v4 receipt differs.")
    expected_hashes = output_hashes or {
        path: _digest(bundle[path]) for path in MAPPER_OUTPUTS
    }
    if receipt.get("output_hashes") != expected_hashes:
        _add(findings, "TAMPERED_HASH", "Mapper v4 output hashes differ.")
    sizes = {
        path: len(json.dumps(bundle[path], separators=(",", ":")).encode())
        for path in MAPPER_OUTPUTS
    }
    if output_hashes is not None:
        sizes = {path: (track_root / path).stat().st_size for path in MAPPER_OUTPUTS}
    if any(size > MAX_OUTPUT_BYTES for size in sizes.values()):
        _add(findings, "OUTPUT_BUDGET_EXCEEDED", "A mapper v4 output exceeds 1 MiB.")
    projected = _project_to_v5(track_root, bundle)
    old, checks = v5._validate_bundle(track_root, inputs, projected)
    for item in old:
        _add(findings, item.code, item.message)
    return sorted(findings, key=lambda item: item.code), checks + 87


def _rejected_v5_bundle(track_root: Path) -> dict[str, dict[str, Any]]:
    """Loads the immutable rejected v5 mapper candidate as a v6-shaped bundle."""
    bundle = {
        new: _load(track_root / old)
        for new, old in zip(MAPPER_OUTPUTS, v5.MAPPER_OUTPUTS)
    }
    bundle[MAPPER_RECEIPT] = _load(track_root / v5.MAPPER_RECEIPT)
    return bundle


def _validate_rejected_v5(track_root: Path) -> list[Finding]:
    """Proves all bound v5 review defects fail v6 specificity."""
    return _validate_specificity(_rejected_v5_bundle(track_root))


def _load_fixture(track_root: Path, path: Path) -> dict[str, Any]:
    """Loads a v6 fixture only when its manifest binding is exact."""
    manifest = _load(track_root / FIXTURE_MANIFEST)
    if (
        manifest.get("fixture_count") != len(manifest.get("fixtures", []))
        or len(manifest.get("fixtures", [])) > MAX_FIXTURE_FILES
    ):
        raise ValueError("fixture budget differs")
    relative = path.resolve().relative_to(track_root.resolve()).as_posix()
    row = next(item for item in manifest["fixtures"] if item["path"] == relative)
    if _sha(path) != row["sha256"]:
        raise ValueError("fixture binding differs")
    return _load(path)


def _run_v6_fixture(track_root: Path, fixture: dict[str, Any]) -> list[Finding]:
    """Runs isolated specificity, excerpt, and residual-route probes."""
    rejected = _rejected_v5_bundle(track_root)
    findings: list[Finding] = []
    for case in fixture["cases"]:
        op = case["mutation"]["operation"]
        probe: list[Finding] = []
        if op == "rejected-v5-candidate-fails":
            probe = _validate_rejected_v5(track_root)
        elif op in {"unbalanced-parentheses", "unbalanced-quotes", "mid-clause-ending"}:
            value = {
                "unbalanced-parentheses": "The gate opens (only while active.",
                "unbalanced-quotes": 'The gate emits "active state.',
                "mid-clause-ending": "The gate advances when the",
            }[op]
            _validate_excerpt(probe, {"exact_excerpt": value})
        elif op == "generic-difference-rules-and-parameters":
            _validate_difference(
                probe,
                next(
                    f
                    for b in rejected[MAPPER_OUTPUTS[0]]["evidence_batches"]
                    for f in b["differences"]
                ),
            )
        elif op in {
            "difference-omits-comparison-dimension",
            "difference-omits-game-variant",
        }:
            base = next(
                f
                for b in rejected[MAPPER_OUTPUTS[0]]["evidence_batches"]
                for f in b["differences"]
            )
            finding = {
                **copy.deepcopy(base),
                "comparison_dimension": "input activation method",
                "per_game_variants": [
                    {
                        "game_id": row["game_id"],
                        "variant_summary": row["behavior"],
                        "consumer_record_ids": row["consumer_record_ids"],
                    }
                    for row in base["per_game_behaviors"]
                ],
            }
            if op == "difference-omits-comparison-dimension":
                finding["statement"] = (
                    "Dragon Flight uses pointer activation while Dragon Rider initializes a timed running state."
                )
            else:
                finding["per_game_variants"].pop()
            _validate_difference(probe, finding)
        elif op in {
            "repeated-boundary-effect",
            "generic-boundary-template",
            "reused-relevance-template",
            "relevance-does-not-name-excerpt-behavior",
            "each-nine-residual-misroute",
        }:
            probe = _validate_specificity(rejected)
        else:
            raise ValueError(f"unknown v6 fixture operation {op}")
        actual = {item.code for item in probe}
        if not set(case["expected_codes"]).issubset(actual):
            _add(
                findings,
                "FIXTURE_CASE_EXPECTATION_MISMATCH",
                f"{case['id']} emitted {sorted(actual)}.",
            )
        findings.extend(
            item for item in probe if item.code in set(case["expected_codes"])
        )
    return findings


def verify_phase2(
    repo_root: Path, track_root: Path, fixture_path: Path | None = None
) -> VerificationResult:
    """Verifies v6 authority, fixtures, lifecycle Red, or mapper v4."""
    del repo_root
    findings: list[Finding] = []
    checks, inputs = _verify_inputs(track_root, findings)
    if findings:
        return VerificationResult("INVALID", tuple(findings), checks)
    if fixture_path is not None:
        try:
            fixture = _load_fixture(track_root, fixture_path)
            if fixture.get("schema_version", "").startswith(
                ("apk-t9-phase2-v6", "apk-t9-phase2-v7")
            ):
                findings.extend(_run_v6_fixture(track_root, fixture))
                checks += len(fixture["cases"])
            else:
                old = v5.verify_phase2(Path("."), track_root, fixture_path)
                findings.extend(
                    Finding(item.code, item.message) for item in old.findings
                )
                checks += old.checks
        except (
            KeyError,
            OSError,
            ValueError,
            StopIteration,
            TypeError,
            json.JSONDecodeError,
        ):
            _add(findings, "INVALID_FIXTURE_BINDING", "A v6 fixture is not bound.")
        return VerificationResult(
            "INVALID", tuple(sorted(findings, key=lambda item: item.code)), checks
        )
    missing = [
        path
        for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
        if not (track_root / path).is_file()
    ]
    if missing:
        _add(
            findings,
            "PHASE2_MAPPER_V4_OUTPUTS_MISSING",
            f"Missing mapper v4 outputs: {', '.join(missing)}",
        )
        return VerificationResult(
            "RED_WAITING_FOR_MAPPER_V4_OUTPUTS", tuple(findings), checks
        )
    try:
        bundle = {
            path: _load(track_root / path) for path in (*MAPPER_OUTPUTS, MAPPER_RECEIPT)
        }
        candidate, candidate_checks = _validate_bundle(
            track_root,
            inputs,
            bundle,
            output_hashes={path: _sha(track_root / path) for path in MAPPER_OUTPUTS},
        )
        findings.extend(candidate)
        checks += candidate_checks
    except (KeyError, OSError, ValueError, TypeError, json.JSONDecodeError):
        _add(findings, "INVALID_SCHEMA", "Mapper v4 outputs cannot be validated.")
    return VerificationResult(
        "VERIFIED" if not findings else "INVALID",
        tuple(sorted(findings, key=lambda item: item.code)),
        checks,
    )


def main(argv: list[str] | None = None) -> int:
    """Runs v6 verification and emits a stable JSON result."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--track-root", type=Path, required=True)
    parser.add_argument("--fixture", type=Path)
    parser.add_argument("--expect-codes", nargs="*")
    args = parser.parse_args(argv)
    result = verify_phase2(args.repo_root, args.track_root, args.fixture)
    print(
        json.dumps(
            {
                "schema_version": "apk-t9-phase2-v7-verification-result.v1",
                "state": result.state,
                "passed": result.passed,
                "checks": result.checks,
                "findings": [
                    {"code": item.code, "message": item.message}
                    for item in result.findings
                ],
            },
            indent=2,
            sort_keys=True,
        )
    )
    if args.expect_codes is not None:
        return (
            0
            if {item.code for item in result.findings} == set(args.expect_codes)
            else 1
        )
    return 0 if result.passed else 1


if __name__ == "__main__":
    sys.exit(main())
