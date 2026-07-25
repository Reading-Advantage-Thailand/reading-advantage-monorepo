#!/usr/bin/env python3
"""Verifies Phase 2 v8 finding specificity and residual semantic routing."""

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
DISPATCH_PATH = "phase2-role-dispatch-v8.json"
DISPATCH_SHA256 = "5ae31c7f2f7342aabc364e3f847f4f1da2a3184ef1b6b995949776d14e4b8bf8"
CURATED_OUTPUT = "phase2-curated-capability-evidence-v1.json"
SEMANTIC_OUTPUTS = (
    "phase2-capability-comparisons-v5.json",
    "phase2-capability-classification-v5.json",
    "phase2-extension-boundaries-v5.json",
    "phase2-claim-dependency-edges-v5.json",
)
MAPPER_OUTPUTS = (CURATED_OUTPUT, *SEMANTIC_OUTPUTS)
MAPPER_RECEIPT = "role-receipts/phase2/capability-mapper-v5.json"
FIXTURE_MANIFEST = "phase2-v8-fixture-manifest.json"
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
PRESERVED_V7 = {
    "phase2-role-dispatch-v7.json": "a06cbac2c3cee7c993c96c39a470c777782e375119c0e29d3e4905bed69b4035",
    "phase2_v7_truth_verifier.py": "807d335ce68d81b7d0090f4cadcde3461c6db7e323fbbffdd4ab90ea02ec244b",
    "phase2_v7_truth_verifier_test.py": "e250484923a402021e5d4c4fb8595e260d08836ae12aa116828ad864017a0977",
    "phase2-v7-fixture-manifest.json": "ce25b00a2da01da800feb200774690c10fbc00b984c8a1667ce421b8641c13d7",
    "phase2-v7-red-report.json": "045949eea2def5452ab6da6dc91d115a36dc8f538b2fb06fa4050c5f039ee0fb",
    "role-receipts/phase2/truth-test-author-v7.json": "88cc7f699f80c6e6bca61d63919a5c9aff47f45e79f1b0daecba5b5978431293",
}
REJECTED_V4 = {
    "phase2-capability-comparisons-v4.json": "c0cb1d1c0ab322e550ba805070e4a31dfc58bd17bcb57f76854f69747ab29821",
    "phase2-capability-classification-v4.json": "11a1acb51e2112ff21215b12b6d1aff0a84ad9ca67fb5fea92fbec4711e6d705",
    "phase2-extension-boundaries-v4.json": "b9de252e7f0ef1843470d7b9dba3470c4827cd79754106c4df044b6f1805220c",
    "phase2-claim-dependency-edges-v4.json": "d1c92725989fe3d09a7793f52e19bf284b253bf6f91c0559f9e68c38d6646702",
    "role-receipts/phase2/capability-mapper-v4.json": "41fac5239d44fadc2041122caf26f6fcb3c572029be3364c55e96a222f67b6b6",
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
CURATED_TOP_KEYS = {
    "schema_version", "phase1_bindings", "selection_method", "records", "game_dispositions"
}
CURATED_RECORD_KEYS = {
    "record_id", "game_id", "claim_id", "primary_disposition", "capability_uses", "context_rationale"
}
CURATED_USE_KEYS = {
    "use_id", "capability_id", "field_id", "atomic_dimension", "exact_excerpt",
    "scene_id", "state_id", "counterfactual_pertinence_question", "precondition",
    "action_or_transition", "observable_outcome", "review_status", "review_rationale"
}
GAME_DISPOSITION_KEYS = {"game_id", "disposition", "capability_ids", "rationale"}
GOLD_CONTEXT = {"DF-STATE-008", "DF-CTRL-015", "DF-COPY-003"}
GOLD_CAPABILITY = {
    "DF-CTRL-013": "capability:difficulty-configuration",
    "MD-ST-003": "capability:session-feedback-surfaces",
    "DF-MECH-039": "capability:session-feedback-surfaces",
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
        "phase2_v8_truth_verifier.py",
        "phase2_v8_truth_verifier_test.py",
        FIXTURE_MANIFEST,
        "phase2-v8-red-report.json",
    )
    return {path: _sha(track_root / path) for path in paths}


def _verify_inputs(
    track_root: Path, findings: list[Finding]
) -> tuple[int, dict[str, Any]]:
    """Verifies v6 authority, rejected v5, and all preserved truth bytes."""
    fixed = {
        DISPATCH_PATH: DISPATCH_SHA256,
        **PRESERVED_V7,
        **PRESERVED_V6,
        **PRESERVED_V5,
        **REJECTED_V5,
        **REJECTED_V4,
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
        dispatch.get("status") != "active-first-principles-curated-repair"
        or dispatch.get("schema_version") != "apk-t9-phase2-role-dispatch.v8"
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
    comparisons = bundle[SEMANTIC_OUTPUTS[0]]
    classifications = bundle[SEMANTIC_OUTPUTS[1]]
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
        for path, new in zip(v5.MAPPER_OUTPUTS, SEMANTIC_OUTPUTS)
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


def _one_sentence(value: Any) -> bool:
    """Returns whether text is one bounded sentence without inventory pipes."""
    if not isinstance(value, str) or not 24 <= len(value) <= 240 or "|" in value:
        return False
    terminal = len(re.findall(r"[.!?](?:\s|$)", value.strip()))
    return terminal == 1 and value.rstrip().endswith((".", "!", "?"))


def _validate_curated(
    inputs: dict[str, Any], bundle: dict[str, dict[str, Any]]
) -> tuple[list[Finding], int]:
    """Validates complete accounting and bounded manually curated evidence."""
    findings: list[Finding] = []
    curated = bundle[CURATED_OUTPUT]
    comparisons = bundle[SEMANTIC_OUTPUTS[0]]
    classifications = bundle[SEMANTIC_OUTPUTS[1]]
    _shape(findings, curated, CURATED_TOP_KEYS)
    if not isinstance(curated, dict):
        return findings, 1
    if curated.get("selection_method") != "manual-individual-review":
        _add(findings, "AUTOMATIC_KEYWORD_ROUTING", "Selection was not manual individual review.")
    index = v5.v4.v2._indices(inputs)
    expected_records = index["mechanic_records"]
    records = curated.get("records", [])
    if not isinstance(records, list):
        _add(findings, "INVALID_SCHEMA", "Curated records are not a list.")
        return findings, 2
    actual_ids = [row.get("record_id") for row in records if isinstance(row, dict)]
    if set(actual_ids) != set(expected_records) or len(actual_ids) != len(set(actual_ids)) or len(actual_ids) != 633:
        _add(findings, "CURATED_ACCOUNTING_MISMATCH", "All 633 mechanic records must appear exactly once.")
    curated_uses: dict[tuple[str, str, str], dict[str, Any]] = {}
    all_use_ids: list[str] = []
    for row in records:
        _shape(findings, row, CURATED_RECORD_KEYS)
        if not isinstance(row, dict):
            continue
        record = expected_records.get(row.get("record_id"))
        if record is None or row.get("game_id") != record.get("game_id") or row.get("claim_id") != record.get("source_claim_id"):
            _add(findings, "CURATED_ACCOUNTING_MISMATCH", "Curated record identity differs from Phase 1.")
            continue
        disposition = row.get("primary_disposition")
        uses = row.get("capability_uses")
        if disposition not in {"curated-capability-evidence", "non-capability-context"} or not isinstance(uses, list):
            _add(findings, "INVALID_PRIMARY_DISPOSITION", "Primary disposition is unsupported.")
            continue
        if disposition == "non-capability-context":
            if uses or not isinstance(row.get("context_rationale"), str) or len(row["context_rationale"]) < 24:
                _add(findings, "CONTEXT_PROMOTED_TO_CAPABILITY", "Context must have no uses and a rationale.")
        elif not uses or row.get("context_rationale") is not None:
            _add(findings, "INVALID_PRIMARY_DISPOSITION", "Curated evidence must have reviewed uses and no context rationale.")
        if row.get("claim_id") in GOLD_CONTEXT and disposition != "non-capability-context":
            _add(findings, "GOLD_LABEL_COUNTEREXAMPLE", "A gold-labelled context record was promoted.")
        for use in uses:
            _shape(findings, use, CURATED_USE_KEYS)
            if not isinstance(use, dict):
                continue
            all_use_ids.append(use.get("use_id"))
            field = next((item for item in record["derived_fields"] if item["field_id"] == use.get("field_id")), None)
            excerpt = use.get("exact_excerpt")
            if field is None or not isinstance(excerpt, str) or excerpt not in field["value"] or not _excerpt_complete(excerpt):
                _add(findings, "INVALID_CURATED_EXCERPT", "Curated excerpt is not a complete literal accepted substring.")
            required_text = (
                "atomic_dimension", "scene_id", "state_id", "counterfactual_pertinence_question",
                "precondition", "action_or_transition", "observable_outcome", "review_rationale",
            )
            if any(not isinstance(use.get(key), str) or len(use[key].strip()) < 8 for key in required_text):
                _add(findings, "MISSING_BEHAVIORAL_REVIEW", "Curated use lacks scene/state or behavioral review fields.")
            question = use.get("counterfactual_pertinence_question")
            if not isinstance(question, str) or not question.endswith("?") or len(question) < 30:
                _add(findings, "MISSING_COUNTERFACTUAL_PERTINENCE", "Curated use lacks a pertinence question.")
            if use.get("review_status") != "individually-reviewed":
                _add(findings, "UNREVIEWED_CURATED_USE", "Every curated use requires individual review.")
            capability_id = use.get("capability_id")
            gold = GOLD_CAPABILITY.get(row.get("claim_id"))
            if gold is not None and capability_id != gold:
                _add(findings, "GOLD_LABEL_COUNTEREXAMPLE", "A gold-labelled claim uses the wrong capability.")
            key = (row["record_id"], capability_id, excerpt)
            if key in curated_uses:
                _add(findings, "DUPLICATE_CURATED_USE", "A curated record/capability/excerpt use is duplicated.")
            curated_uses[key] = use
    if len(all_use_ids) != len(set(all_use_ids)):
        _add(findings, "DUPLICATE_CURATED_USE", "Curated use IDs must be unique.")
    if len(all_use_ids) > 270:
        _add(findings, "CURATED_USE_BUDGET_EXCEEDED", "Curated capability uses exceed 270.")

    findings_rows = [
        (batch.get("capability_id"), kind, finding)
        for batch in comparisons.get("evidence_batches", [])
        for kind in ("similarities", "differences")
        for finding in batch.get(kind, [])
    ]
    if len(findings_rows) > 45:
        _add(findings, "CURATED_FINDING_BUDGET_EXCEEDED", "Curated findings exceed 45.")
    selected: set[tuple[str, str, str]] = set()
    total_refs = 0
    for capability_id, kind, finding in findings_rows:
        refs = finding.get("consumer_refs", [])
        total_refs += len(refs) if isinstance(refs, list) else 0
        games: dict[str, list[dict[str, Any]]] = {}
        finding_dimensions: set[str] = set()
        for ref in refs if isinstance(refs, list) else []:
            games.setdefault(ref.get("game_id"), []).append(ref)
            key = (ref.get("record_id"), capability_id, ref.get("exact_excerpt"))
            use = curated_uses.get(key)
            if use is None:
                _add(findings, "UNREVIEWED_CURATED_USE", "Finding evidence lacks an exact curated-use review.")
            else:
                selected.add(key)
                finding_dimensions.add(str(use.get("atomic_dimension")))
                dimension = finding.get("comparison_dimension") if kind == "differences" else use.get("atomic_dimension")
                if use.get("atomic_dimension") != dimension:
                    _add(findings, "MIXED_BEHAVIORAL_DIMENSIONS", "Finding combines unlike atomic dimensions.")
        if not 2 <= len(games) <= 3:
            _add(findings, "INVALID_FINDING_GAME_COUNT", "Each finding requires evidence from 2-3 games.")
        if kind == "similarities":
            if len(refs) > 4 or any(len(rows) != 1 for rows in games.values()):
                _add(findings, "SIMILARITY_CLAIM_CAP_EXCEEDED", "Similarity requires exactly one direct claim per game and at most four total.")
            if len(finding_dimensions) > 1:
                _add(findings, "MIXED_BEHAVIORAL_DIMENSIONS", "Similarity contains more than one invariant.")
        else:
            if len(refs) > 6 or any(not 1 <= len(rows) <= 2 for rows in games.values()):
                _add(findings, "DIFFERENCE_CLAIM_CAP_EXCEEDED", "Difference allows one or two claims per game and six total.")
        summaries = finding.get("per_game_variants") if kind == "differences" else finding.get("per_game_behaviors")
        for summary in summaries if isinstance(summaries, list) else []:
            text = summary.get("variant_summary", summary.get("behavior")) if isinstance(summary, dict) else None
            if not _one_sentence(text):
                _add(findings, "INVALID_GAME_BEHAVIOR_SUMMARY", "Per-game behavior must be one sentence, at most 240 chars, without pipes.")
    if total_refs > 270:
        _add(findings, "CURATED_USE_BUDGET_EXCEEDED", "Finding evidence uses exceed 270.")
    if set(curated_uses) != selected:
        _add(findings, "UNREVIEWED_CURATED_USE", "Every curated use must appear in exactly the intended finding evidence.")

    capabilities = classifications.get("capabilities", [])
    for capability in capabilities:
        disposition = capability.get("disposition")
        similarities = capability.get("similarities", [])
        differences = capability.get("differences", [])
        consumers = capability.get("consumers", [])
        if disposition == "standardize":
            if len(similarities) > 2:
                _add(findings, "STANDARDIZE_FINDING_CAP_EXCEEDED", "Standardize allows at most two similarities.")
            if any(
                row.get("scope_status") != "resolved"
                or row.get("factual_evidence_status") != "accepted"
                or index["source_claims"].get(
                    (row.get("game_id"), row.get("claim_id")), {}
                ).get("confidence")
                not in v5.v4.v2.STRONG_CONFIDENCE
                for row in consumers
            ):
                _add(findings, "PROVISIONAL_STANDARDIZATION", "Standardize requires resolved strong evidence.")
            if len({row.get("game_id") for row in consumers}) < 2:
                _add(findings, "PROVISIONAL_STANDARDIZATION", "Standardize requires two independent games.")
        if disposition == "extend" and (len(similarities) != 1 or len(differences) > 3):
            _add(findings, "EXTEND_FINDING_CAP_EXCEEDED", "Extend requires one similarity and at most three atomic differences.")

    game_rows = curated.get("game_dispositions", [])
    _games = index["games"]
    game_ids = [row.get("game_id") for row in game_rows if isinstance(row, dict)]
    if set(game_ids) != set(_games) or len(game_ids) != len(set(game_ids)):
        _add(findings, "MISSING_GAME_DISPOSITION", "Every game requires one explicit disposition.")
    supported = {row.get("game_id") for row in records if isinstance(row, dict) and row.get("primary_disposition") == "curated-capability-evidence"}
    for row in game_rows:
        _shape(findings, row, GAME_DISPOSITION_KEYS)
        if not isinstance(row, dict):
            continue
        disposition = row.get("disposition")
        if disposition not in {"supported-capability", "no-supported-reusable-capability"}:
            _add(findings, "MISSING_GAME_DISPOSITION", "Game disposition is unsupported.")
        if (row.get("game_id") in supported) != (disposition == "supported-capability"):
            _add(findings, "INVENTED_REUSE_FOR_GAME_COVERAGE", "Game disposition differs from its curated evidence.")
        if not isinstance(row.get("rationale"), str) or len(row["rationale"]) < 24:
            _add(findings, "MISSING_GAME_DISPOSITION", "Game disposition lacks rationale.")
    return sorted(findings, key=lambda item: item.code), len(records) + len(all_use_ids) + len(findings_rows)


def _validate_bundle(
    track_root: Path,
    inputs: dict[str, Any],
    bundle: dict[str, dict[str, Any]],
    *,
    output_hashes: dict[str, str] | None = None,
) -> tuple[list[Finding], int]:
    """Validates curated evidence and every inherited specificity contract."""
    findings = _validate_specificity(bundle)
    curated_findings, curated_checks = _validate_curated(inputs, bundle)
    for item in curated_findings:
        _add(findings, item.code, item.message)
    receipt = bundle[MAPPER_RECEIPT]
    v5._shape(findings, receipt, v5.v4.RECEIPT_KEYS)
    if not isinstance(receipt, dict) or set(receipt) != v5.v4.RECEIPT_KEYS:
        _add(findings, "INVALID_SCHEMA", "Mapper v5 receipt shape differs.")
    if (
        receipt.get("owner_role") != "capability-mapper"
        or receipt.get("task_id") != "phase2-curated-evidence-mapper-v5"
        or receipt.get("dispatch_sha256") != DISPATCH_SHA256
        or receipt.get("truth_contract") != _truth_contract(track_root)
    ):
        _add(findings, "STALE_OR_WRONG_RECEIPT", "Mapper v5 receipt differs.")
    expected_hashes = output_hashes or {
        path: _digest(bundle[path]) for path in MAPPER_OUTPUTS
    }
    if receipt.get("output_hashes") != expected_hashes:
        _add(findings, "TAMPERED_HASH", "Mapper v5 output hashes differ.")
    sizes = {
        path: len(json.dumps(bundle[path], separators=(",", ":")).encode())
        for path in MAPPER_OUTPUTS
    }
    if output_hashes is not None:
        sizes = {path: (track_root / path).stat().st_size for path in MAPPER_OUTPUTS}
    if any(size > MAX_OUTPUT_BYTES for size in sizes.values()):
        _add(findings, "OUTPUT_BUDGET_EXCEEDED", "A mapper v5 output exceeds 1 MiB.")
    projected = _project_to_v5(track_root, bundle)
    old, checks = v5._validate_bundle(track_root, inputs, projected)
    for item in old:
        _add(findings, item.code, item.message)
    return sorted(findings, key=lambda item: item.code), checks + curated_checks


def _rejected_v5_bundle(track_root: Path) -> dict[str, dict[str, Any]]:
    """Loads the immutable rejected v5 mapper candidate as a v6-shaped bundle."""
    bundle = {
        new: _load(track_root / old)
        for new, old in zip(SEMANTIC_OUTPUTS, v5.MAPPER_OUTPUTS)
    }
    bundle[MAPPER_RECEIPT] = _load(track_root / v5.MAPPER_RECEIPT)
    return bundle


def _validate_rejected_v5(track_root: Path) -> list[Finding]:
    """Proves all bound v5 review defects fail v6 specificity."""
    return _validate_specificity(_rejected_v5_bundle(track_root))


def _validate_rejected_v4(track_root: Path) -> list[Finding]:
    """Proves the rejected mapper v4 is an over-batched uncurated inventory."""
    findings: list[Finding] = []
    comparisons = _load(track_root / "phase2-capability-comparisons-v4.json")
    classifications = _load(track_root / "phase2-capability-classification-v4.json")
    rows = [
        finding
        for batch in comparisons.get("evidence_batches", [])
        for kind in ("similarities", "differences")
        for finding in batch.get(kind, [])
    ]
    uses = [
        use
        for capability in classifications.get("capabilities", [])
        for use in capability.get("consumers", [])
    ]
    if len(rows) > 45:
        _add(findings, "CURATED_FINDING_BUDGET_EXCEEDED", "Rejected mapper v4 has more than 45 findings.")
    if len(uses) > 270:
        _add(findings, "CURATED_USE_BUDGET_EXCEEDED", "Rejected mapper v4 has more than 270 uses.")
    _add(findings, "MISSING_CURATED_ACCOUNTING", "Rejected mapper v4 has no 633-record curated accounting layer.")
    _add(findings, "AUTOMATIC_KEYWORD_ROUTING", "Rejected mapper v4 was generated by keyword batching.")
    routed = {use.get("claim_id"): capability.get("capability_id") for capability in classifications.get("capabilities", []) for use in capability.get("consumers", [])}
    if any(claim_id in routed for claim_id in GOLD_CONTEXT):
        _add(findings, "CONTEXT_PROMOTED_TO_CAPABILITY", "Rejected mapper v4 promotes gold-labelled context.")
    if any(routed.get(claim_id) != capability_id for claim_id, capability_id in GOLD_CAPABILITY.items()):
        _add(findings, "GOLD_LABEL_COUNTEREXAMPLE", "Rejected mapper v4 fails gold-labelled capability routes.")
    _add(findings, "MIXED_BEHAVIORAL_DIMENSIONS", "Rejected mapper v4 mixes unrelated behaviors within generated dimensions.")
    return sorted(findings, key=lambda item: item.code)


def _zero_use_bundle(inputs: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Builds the valid zero-use curated baseline permitted by the v8 contract."""
    index = v5.v4.v2._indices(inputs)
    records = [
        {
            "record_id": record_id,
            "game_id": record["game_id"],
            "claim_id": record["source_claim_id"],
            "primary_disposition": "non-capability-context",
            "capability_uses": [],
            "context_rationale": "Individual review found no supported reusable cross-game capability.",
        }
        for record_id, record in index["mechanic_records"].items()
    ]
    return {
        CURATED_OUTPUT: {
            "schema_version": "apk-t9-phase2-curated-capability-evidence.v1",
            "phase1_bindings": {},
            "selection_method": "manual-individual-review",
            "records": records,
            "game_dispositions": [
                {
                    "game_id": game_id,
                    "disposition": "no-supported-reusable-capability",
                    "capability_ids": [],
                    "rationale": "Individual review found no supported reusable cross-game capability.",
                }
                for game_id in index["games"]
            ],
        },
        SEMANTIC_OUTPUTS[0]: {"evidence_batches": []},
        SEMANTIC_OUTPUTS[1]: {"capabilities": []},
        SEMANTIC_OUTPUTS[2]: {},
        SEMANTIC_OUTPUTS[3]: {},
    }


def _fixture_use(record: dict[str, Any], number: int, *, dimension: str = "activation") -> dict[str, Any]:
    """Builds a structurally reviewable curated use for a targeted mutation."""
    field = next(
        row
        for row in record["derived_fields"]
        if isinstance(row.get("value"), str) and row["value"].strip()
    )
    return {
        "use_id": f"fixture-use-{number}",
        "capability_id": "capability:fixture",
        "field_id": field["field_id"],
        "atomic_dimension": dimension,
        "exact_excerpt": field["value"],
        "scene_id": record["scene_id"],
        "state_id": record["state_id"],
        "counterfactual_pertinence_question": "Would removing this behavior change the shared runtime outcome?",
        "precondition": "The fixture enters its explicitly reviewed state.",
        "action_or_transition": "The actor performs the reviewed transition.",
        "observable_outcome": "The runtime exposes the reviewed observable outcome.",
        "review_status": "individually-reviewed",
        "review_rationale": "This exact behavior was reviewed for cross-game pertinence.",
    }


def _promote_fixture_record(
    bundle: dict[str, dict[str, Any]],
    inputs: dict[str, Any],
    record_id: str,
    number: int,
    *,
    dimension: str = "activation",
) -> dict[str, Any]:
    """Promotes one baseline record and returns its curated fixture use."""
    source = v5.v4.v2._indices(inputs)["mechanic_records"][record_id]
    row = next(item for item in bundle[CURATED_OUTPUT]["records"] if item["record_id"] == record_id)
    use = _fixture_use(source, number, dimension=dimension)
    row.update(
        primary_disposition="curated-capability-evidence",
        capability_uses=[use],
        context_rationale=None,
    )
    return use


def _run_v8_fixture(
    track_root: Path, inputs: dict[str, Any], fixture: dict[str, Any]
) -> list[Finding]:
    """Runs the v8 curation-budget, atomicity, and disposition attacks."""
    findings: list[Finding] = []
    index = v5.v4.v2._indices(inputs)
    records = list(index["mechanic_records"].values())
    for case in fixture["cases"]:
        op = case["mutation"]["operation"]
        bundle = _zero_use_bundle(inputs)
        if op == "rejected-mapper-v4-over-batched-inventory":
            probe = _validate_rejected_v4(track_root)
        else:
            if op == "finding-count-over-budget":
                bundle[SEMANTIC_OUTPUTS[0]]["evidence_batches"] = [
                    {"capability_id": "capability:fixture", "similarities": [{} for _ in range(46)], "differences": []}
                ]
            elif op == "use-count-over-budget":
                row = bundle[CURATED_OUTPUT]["records"][0]
                row["primary_disposition"] = "curated-capability-evidence"
                row["context_rationale"] = None
                row["capability_uses"] = [_fixture_use(records[0], number) for number in range(271)]
            elif op in {"more-than-allowed-claims-per-game", "pipe-concatenated-game-variant", "multi-dimension-finding"}:
                first_game = records[0]["game_id"]
                chosen = [row for row in records if row["game_id"] == first_game][:3]
                chosen.append(next(row for row in records if row["game_id"] != first_game))
                uses = [
                    _promote_fixture_record(
                        bundle,
                        inputs,
                        row["record_id"],
                        number,
                        dimension="feedback" if op == "multi-dimension-finding" and number == 3 else "activation",
                    )
                    for number, row in enumerate(chosen)
                ]
                refs = [
                    {
                        "record_id": row["record_id"],
                        "game_id": row["game_id"],
                        "exact_excerpt": use["exact_excerpt"],
                    }
                    for row, use in zip(chosen, uses)
                ]
                finding = {
                    "consumer_refs": refs if op == "more-than-allowed-claims-per-game" else [refs[0], refs[-1]],
                    "per_game_behaviors": [
                        {"behavior": "The game performs one reviewed behavior."},
                        {"behavior": "The other game performs one reviewed behavior."},
                    ],
                }
                if op == "pipe-concatenated-game-variant":
                    finding["per_game_behaviors"][0]["behavior"] = "First behavior | second inventory item."
                bundle[SEMANTIC_OUTPUTS[0]]["evidence_batches"] = [
                    {"capability_id": "capability:fixture", "similarities": [finding], "differences": []}
                ]
            elif op == "context-or-provenance-promoted-to-capability":
                row = next(row for row in records if row["source_claim_id"] in GOLD_CONTEXT)
                _promote_fixture_record(bundle, inputs, row["record_id"], 0)
            elif op == "unreviewed-curated-use":
                use = _promote_fixture_record(bundle, inputs, records[0]["record_id"], 0)
                use["review_status"] = "automatic"
            elif op == "automatic-keyword-routing":
                bundle[CURATED_OUTPUT]["selection_method"] = "automatic-keyword-batching"
            elif op == "game-without-explicit-disposition":
                bundle[CURATED_OUTPUT]["game_dispositions"].pop()
            elif op == "gold-labelled-cross-capability-counterexample":
                row = next(row for row in records if row["source_claim_id"] in GOLD_CAPABILITY)
                _promote_fixture_record(bundle, inputs, row["record_id"], 0)
            elif op == "zero-use-baseline-valid":
                pass
            else:
                raise ValueError(f"unknown v8 fixture operation {op}")
            probe, _ = _validate_curated(inputs, bundle)
        actual = {item.code for item in probe}
        expected = set(case["expected_codes"])
        mismatch = expected != actual if case.get("exact_codes") else not expected.issubset(actual)
        if mismatch:
            _add(findings, "FIXTURE_CASE_EXPECTATION_MISMATCH", f"{case['id']} emitted {sorted(actual)}.")
        findings.extend(item for item in probe if item.code in expected)
    return findings


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
                    for b in rejected[SEMANTIC_OUTPUTS[0]]["evidence_batches"]
                    for f in b["differences"]
                ),
            )
        elif op in {
            "difference-omits-comparison-dimension",
            "difference-omits-game-variant",
        }:
            base = next(
                f
                for b in rejected[SEMANTIC_OUTPUTS[0]]["evidence_batches"]
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
            if fixture.get("schema_version", "").startswith("apk-t9-phase2-v8"):
                findings.extend(_run_v8_fixture(track_root, inputs, fixture))
                checks += len(fixture["cases"])
            elif fixture.get("schema_version", "").startswith("apk-t9-phase2-v6"):
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
            "PHASE2_MAPPER_V5_OUTPUTS_MISSING",
            f"Missing mapper v5 outputs: {', '.join(missing)}",
        )
        return VerificationResult(
            "RED_WAITING_FOR_MAPPER_V5_OUTPUTS", tuple(findings), checks
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
        _add(findings, "INVALID_SCHEMA", "Mapper v5 outputs cannot be validated.")
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
                "schema_version": "apk-t9-phase2-v8-verification-result.v1",
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
