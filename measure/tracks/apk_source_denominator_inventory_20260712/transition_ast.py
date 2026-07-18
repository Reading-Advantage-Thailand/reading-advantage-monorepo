"""Mechanical Phase-1 adjudication over TypeScript compiler AST write facts."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any, Mapping


TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]
AST_HELPER = TRACK_DIR / "transition_ast_helper.ts"


def enumerate_typescript_transition_facts(
    sources: Mapping[str, str], *, mode: str
) -> list[dict[str, Any]]:
    """Enumerates executable literal-domain writes through the TypeScript compiler.

    Args:
        sources: Frozen source text keyed by repository-relative path.
        mode: Independent traversal mode, either ``phase1`` or ``phase2``.

    Returns:
        Raw AST write facts without inferred fallback edges.

    Raises:
        RuntimeError: If the compiler helper fails or returns malformed output.
    """
    if mode not in {"phase1", "phase2"}:
        raise ValueError(f"Unsupported transition extraction mode: {mode}")
    result = subprocess.run(
        [str(REPO_ROOT / "node_modules" / ".bin" / "tsx"), str(AST_HELPER)],
        cwd=REPO_ROOT,
        input=json.dumps({"mode": mode, "sources": dict(sources)}, sort_keys=True).encode(),
        capture_output=True,
        check=False,
    )
    if result.returncode:
        raise RuntimeError(
            "TypeScript transition AST helper failed: "
            + result.stderr.decode("utf-8", errors="replace").strip()
        )
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError("TypeScript transition AST helper returned invalid JSON") from error
    facts = payload.get("literal_domain_writes") if isinstance(payload, dict) else None
    if not isinstance(facts, list) or not all(isinstance(row, dict) for row in facts):
        raise RuntimeError("TypeScript transition AST helper returned malformed facts")
    return facts


def extract_transition_writes(sources: Mapping[str, str]) -> dict[str, list[dict[str, Any]]]:
    """Adjudicates Phase-1 AST writes as proven edges or unresolved candidates.

    Args:
        sources: Frozen source text keyed by repository-relative path.

    Returns:
        Exact compiler writes partitioned into proven transitions and candidates.
    """
    facts = enumerate_typescript_transition_facts(sources, mode="phase1")
    proven: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []
    for fact in facts:
        common = {
            "path": fact["path"],
            "source_symbol": fact["source_symbol"],
            "to_state_id": fact["to_state_id"],
            "start_line": fact["start_line"],
            "end_line": fact["end_line"],
        }
        from_state = fact.get("proven_from_state_id")
        if isinstance(from_state, str):
            proven.append(
                {
                    **common,
                    "from_state_id": from_state,
                    "transition_evidence_kind": fact["proof_kind"],
                }
            )
        else:
            candidates.append(
                {
                    **common,
                    "record_kind": "transition_write_candidate",
                    "resolution_status": "unresolved",
                    "reason": "no-single-proven-from-state",
                }
            )
    key = lambda row: (
        row["path"],
        row["start_line"],
        row["source_symbol"],
        row.get("from_state_id", ""),
        row["to_state_id"],
    )
    return {
        "literal_domain_writes": sorted(facts, key=key),
        "proven_transitions": sorted(proven, key=key),
        "transition_write_candidates": sorted(candidates, key=key),
    }


__all__ = ["enumerate_typescript_transition_facts", "extract_transition_writes"]
