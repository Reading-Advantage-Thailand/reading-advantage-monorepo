"""Mechanical Phase-1 adjudication over TypeScript compiler AST write facts."""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Mapping


TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]
AST_BUNDLE = TRACK_DIR / "transition_ast_helper.bundle.cjs"
AST_BUNDLE_PATH = (
    "measure/tracks/apk_source_denominator_inventory_20260712/transition_ast_helper.bundle.cjs"
)
GIT_EXECUTABLE = "/usr/bin/git"
NODE_EXECUTABLE = "/opt/codex-desktop/resources/node-runtime/bin/node"
RUNTIME_ENV = {
    "LANG": "C",
    "PATH": "/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin",
}


def _helper_bundle(code_revision: str | None) -> bytes:
    """Returns exact self-contained helper bytes from a commit-bound locator.

    Args:
        code_revision: Full immutable code commit, or ``None`` only for focused
            in-process unit tests.

    Returns:
        Self-contained CommonJS bundle bytes.

    Raises:
        ValueError: If a supplied revision is not a full lowercase commit SHA.
        RuntimeError: If Git cannot resolve the helper at the supplied revision.
    """
    if code_revision is None:
        return AST_BUNDLE.read_bytes()
    if re.fullmatch(r"[0-9a-f]{40}", code_revision) is None:
        raise ValueError("code-revision must be a full 40-character lowercase commit SHA")
    result = subprocess.run(
        [GIT_EXECUTABLE, "show", f"{code_revision}:{AST_BUNDLE_PATH}"],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    )
    if result.returncode:
        raise RuntimeError(
            "Unable to load immutable TypeScript transition helper: "
            + result.stderr.decode("utf-8", errors="replace").strip()
        )
    return result.stdout


def _run_bundle(bundle: bytes, request: bytes) -> subprocess.CompletedProcess[bytes]:
    """Executes exact bundle bytes with the frozen Node runtime and clean environment."""
    with tempfile.NamedTemporaryFile(suffix=".cjs") as helper:
        helper.write(bundle)
        helper.flush()
        return subprocess.run(
            [NODE_EXECUTABLE, helper.name],
            cwd=REPO_ROOT,
            input=request,
            capture_output=True,
            check=False,
            env=RUNTIME_ENV,
        )


def enumerate_typescript_transition_facts(
    sources: Mapping[str, str], *, mode: str, code_revision: str | None = None
) -> list[dict[str, Any]]:
    """Enumerates executable literal-domain writes through the TypeScript compiler.

    Args:
        sources: Frozen source text keyed by repository-relative path.
        mode: Independent traversal mode, either ``phase1`` or ``phase2``.
        code_revision: Full commit containing the exact TypeScript helper.

    Returns:
        Raw AST write facts without inferred fallback edges.

    Raises:
        RuntimeError: If the compiler helper fails or returns malformed output.
    """
    if mode not in {"phase1", "phase2"}:
        raise ValueError(f"Unsupported transition extraction mode: {mode}")
    result = _run_bundle(
        _helper_bundle(code_revision),
        json.dumps({"mode": mode, "sources": dict(sources)}, sort_keys=True).encode(),
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


def extract_transition_writes(
    sources: Mapping[str, str], *, code_revision: str | None = None
) -> dict[str, list[dict[str, Any]]]:
    """Adjudicates Phase-1 AST writes as proven edges or unresolved candidates.

    Args:
        sources: Frozen source text keyed by repository-relative path.
        code_revision: Full commit containing the exact TypeScript helper.

    Returns:
        Exact compiler writes partitioned into proven transitions and candidates.
    """
    facts = enumerate_typescript_transition_facts(
        sources, mode="phase1", code_revision=code_revision
    )
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
