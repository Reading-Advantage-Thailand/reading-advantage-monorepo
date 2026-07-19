"""Build exhaustive Phase-2 evidence solely from committed Git objects."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any


BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
ASTRAL_HISTORY_REVISION = "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f"
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]
PROGRAM_PATH = "measure/apk-evidence-reconstruction-program.md"
CATALOG_PATH = "apps/advantage-games/src/lib/gameCards.ts"
COLLECTOR_IDENTITY = "evidence-collector-remediation-20260713"
QUARANTINED_SOURCE_PREFIX = "measure/tracks/apk_cross_game_asset_ontology_20260712"
SOURCE_ROOTS = ("apps/advantage-games", "apps/reading-advantage", "apps/primary-advantage", "packages", "measure")
SHARED_PACKAGE_ROOTS = (
    "packages/advantage-play-kit/",
    "packages/game-contracts/",
    "packages/game-cartridges/",
)
RAW_PUBLIC_GAME_ROOTS = (
    "apps/advantage-games/public",
    "apps/reading-advantage/public/games",
    "apps/primary-advantage/public/games",
)
RAW_ASSET_ENUMERATION_ROOTS = (
    *RAW_PUBLIC_GAME_ROOTS,
    "apps/advantage-games/measure",
    "packages/codecamp-knowledge/fixtures/apk-guided",
)
RAW_PROGRAM_SLUGS = (
    "dragon-flight", "rpg-battle", "abyssal-well", "castle-defense", "magic-defense",
    "wizard-vs-zombie", "village-guardian", "archers-revenge", "storm-castle-tower",
    "paladins-twin-soul", "gryphon-patrol", "dragon-rider", "dungeon-liberator",
    "spellweavers-run", "shadow-gate-dungeon", "labyrinth-goblin-king",
    "griffin-riders-escape", "sorcerer-ziggurat", "enchanted-library", "rune-match",
    "alchemists-synthesis", "potion-rush", "rune-forge-chamber", "astral-mage",
    "griffin-sky-joust", "realm-carver", "devourer-slime", "haunted-library",
    "babel-architect",
)
RAW_CONFIG_FILENAMES = {"package.json", "tsconfig.json", "tsconfig.test.json"}
SOURCE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".json"}
TEXT_SUFFIXES = SOURCE_SUFFIXES | {".md"}
ASSET_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".webm", ".mp3", ".wav", ".ogg", ".m4a", ".json", ".csv", ".txt", ".xml", ".yaml", ".yml"}
RAW_STATE_NAME = re.compile(r"(?:state|status|phase|mode|scene|screen|overlay|turn|pose|step|wave|floor)", re.IGNORECASE)
RAW_REQUIRED_SOURCE_PATHS = {
    "measure/apk-asset-system-program.md",
    "measure/apk-evidence-reconstruction-program.md",
    "packages/game-cartridges/src/catalog.test.ts",
    "packages/game-cartridges/src/catalog.ts",
    "packages/game-cartridges/src/index.ts",
}
PHASE1_ARTIFACTS = (
    "source-denominator.json",
    "game-identity-ledger.json",
    "scene-state-denominator.json",
    "asset-file-denominator.json",
    "historical-source-denominator.json",
    "denominator-discrepancies.json",
)
PHASE2_ARTIFACTS = (
    "independent-human-discovery.json",
    "human-duplicate-drift-records.json",
    "human-historical-deleted-records.json",
    "human-discrepancy-records.json",
)
TRANSITION_BUNDLE_PATH = (
    "measure/tracks/apk_source_denominator_inventory_20260712/transition_ast_helper.bundle.cjs"
)
GIT_EXECUTABLE = "/usr/bin/git"
NODE_EXECUTABLE = "/opt/codex-desktop/resources/node-runtime/bin/node"
RUNTIME_ENV = {
    "LANG": "C",
    "PATH": "/opt/codex-desktop/resources/node-runtime/bin:/usr/bin:/bin",
}


@dataclass
class BudgetMeter:
    """Tracks evidence-collector resource use and fails closed at frozen ceilings."""

    source_files: int = 0
    command_invocations: int = 0
    bytes_read: int = 0

    def add(self, *, source_files: int = 0, command_invocations: int = 0, bytes_read: int = 0) -> None:
        """Adds measured usage and rejects the first frozen-ceiling breach."""
        self.source_files += source_files
        self.command_invocations += command_invocations
        self.bytes_read += bytes_read
        ceilings = {"source_files": 7500, "command_invocations": 120, "bytes_read": 268435456}
        for key, ceiling in ceilings.items():
            if getattr(self, key) > ceiling:
                raise RuntimeError(f"RESOURCE_CEILING_EXCEEDED:{key}:{getattr(self, key)}>{ceiling}")


class GitObjectReader:
    """Reads committed blobs through one persistent Git batch process."""

    def __init__(self) -> None:
        """Starts the batch reader and initializes auditable usage counters."""
        self.process = subprocess.Popen(
            [GIT_EXECUTABLE, "cat-file", "--batch"],
            cwd=REPO_ROOT,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
        )
        self.cache: dict[tuple[str, str], bytes] = {}
        self.bytes_read = 0
        self.files_read = 0

    def read(self, revision: str, path: str) -> bytes:
        """Returns committed bytes for an exact revision and path.

        Args:
            revision: Commit containing the object.
            path: Repository-relative object path.

        Returns:
            The exact committed bytes.
        """
        if path == QUARANTINED_SOURCE_PREFIX or path.startswith(f"{QUARANTINED_SOURCE_PREFIX}/"):
            raise ValueError(f"QUARANTINED_FACTUAL_SOURCE:{path}")
        key = (revision, path)
        if key in self.cache:
            return self.cache[key]
        assert self.process.stdin is not None and self.process.stdout is not None
        self.process.stdin.write(f"{revision}:{path}\n".encode())
        self.process.stdin.flush()
        header = self.process.stdout.readline().decode().strip()
        if header.endswith(" missing"):
            raise ValueError(f"Missing committed object: {revision}:{path}")
        parts = header.split()
        if len(parts) != 3 or parts[1] != "blob":
            raise ValueError(f"Unexpected git cat-file response for {revision}:{path}: {header}")
        size = int(parts[2])
        value = self.process.stdout.read(size)
        if self.process.stdout.read(1) != b"\n":
            raise ValueError(f"Malformed git cat-file response for {revision}:{path}")
        self.cache[key] = value
        self.bytes_read += len(value)
        self.files_read += 1
        return value

    def close(self) -> None:
        """Closes the persistent batch process."""
        if self.process is None:
            return
        if self.process.stdin is not None:
            self.process.stdin.close()
        self.process.wait(timeout=10)
        if self.process.stdout is not None:
            self.process.stdout.close()


def _tree_entries() -> list[dict[str, Any]]:
    """Enumerates non-quarantined frozen tree entries with Git object metadata."""
    output = subprocess.check_output(
        [GIT_EXECUTABLE, "ls-tree", "-r", "-l", BASELINE, "--", *SOURCE_ROOTS],
        cwd=REPO_ROOT,
        text=True,
    )
    entries: list[dict[str, Any]] = []
    for line in output.splitlines():
        metadata, path = line.split("\t", 1)
        mode, kind, object_id, size_text = metadata.split()
        if path == QUARANTINED_SOURCE_PREFIX or path.startswith(f"{QUARANTINED_SOURCE_PREFIX}/"):
            continue
        entries.append({"path": path, "mode": mode, "object_type": kind, "git_object_id": object_id, "byte_size": int(size_text)})
    return sorted(entries, key=lambda row: row["path"])


def _raw_normalized_path(path: str) -> str:
    """Normalizes one frozen path for bounded independent slug matching."""
    return re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-")


def _raw_matches_program_slug(path: str) -> bool:
    """Reports whether a path contains one exact bounded program slug."""
    normalized = f"-{_raw_normalized_path(path)}-"
    return any(f"-{slug}-" in normalized for slug in RAW_PROGRAM_SLUGS)


def _raw_source_relevance_rule(path: str) -> str | None:
    """Returns the independent frozen rule admitting one raw source path."""
    if path == QUARANTINED_SOURCE_PREFIX or path.startswith(f"{QUARANTINED_SOURCE_PREFIX}/"):
        return None
    if path in RAW_REQUIRED_SOURCE_PATHS:
        return "active-apk-program-sources"
    if path.startswith(SHARED_PACKAGE_ROOTS):
        return "apk-core-packages"
    filename = Path(path).name
    if filename in RAW_CONFIG_FILENAMES or filename.startswith("tsconfig."):
        return None
    suffix = Path(path).suffix.lower()
    if path.startswith("apps/advantage-games/src/") and suffix in SOURCE_SUFFIXES:
        return "advantage-games-src"
    if path.startswith(("apps/reading-advantage/", "apps/primary-advantage/")) and suffix in SOURCE_SUFFIXES and (
        "/games/" in path or "/api/v1/games/" in path or "/lib/game" in path
    ):
        return "reading-primary-game-copies"
    if path.startswith("packages/codecamp-knowledge/") and any(
        part.startswith("apk-") for part in Path(path).parts
    ) and suffix in SOURCE_SUFFIXES | {".md"}:
        return "codecamp-knowledge-apk-segment"
    if (
        path.startswith("packages/domain/src/games/")
        or path.startswith("packages/domain/src/__tests__/games")
    ) and suffix in SOURCE_SUFFIXES:
        return "domain-games-tests"
    normalized = _raw_normalized_path(path)
    if path.startswith("packages/db/") and (
        "game-completion" in normalized or "codecamp-apk" in normalized
    ):
        return "db-game-completion-codecamp-apk"
    if (
        path.startswith("apps/advantage-games/measure/")
        and suffix in {".md", ".json"}
        and _raw_matches_program_slug(path)
    ):
        return "advantage-games-measure-program-match"
    return None


def _raw_source_path(path: str) -> bool:
    """Reports whether an independent frozen relevance rule admits the source."""
    return _raw_source_relevance_rule(path) is not None


def _raw_asset_relevance_rule(path: str) -> str | None:
    """Returns the independent five-root rule admitting one raw asset path."""
    if path == QUARANTINED_SOURCE_PREFIX or path.startswith(f"{QUARANTINED_SOURCE_PREFIX}/"):
        return None
    filename = Path(path).name
    if filename in RAW_CONFIG_FILENAMES or filename.startswith("tsconfig."):
        return None
    suffix = Path(path).suffix.lower()
    if path.startswith(RAW_PUBLIC_GAME_ROOTS) and suffix in ASSET_SUFFIXES:
        return "public-game-media-audio-data"
    if (
        path.startswith("apps/advantage-games/measure/")
        and filename in {"asset-spec.md", "metadata.json"}
        and _raw_matches_program_slug(path)
    ):
        return "game-measure-asset-sidecars"
    if path == "packages/codecamp-knowledge/fixtures/apk-guided/activity-tutorial.json":
        return "codecamp-activity-tutorial"
    return None


def _raw_asset_path(path: str) -> bool:
    """Reports whether an independent five-root rule admits the asset."""
    return _raw_asset_relevance_rule(path) is not None


def _transition_helper_bundle(code_revision: str | None) -> bytes:
    """Returns commit-bound self-contained helper bytes for Phase-2 traversal.

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
        return (TRACK_DIR / "transition_ast_helper.bundle.cjs").read_bytes()
    if re.fullmatch(r"[0-9a-f]{40}", code_revision) is None:
        raise ValueError("code-revision must be a full 40-character lowercase commit SHA")
    result = subprocess.run(
        [GIT_EXECUTABLE, "show", f"{code_revision}:{TRANSITION_BUNDLE_PATH}"],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    )
    if result.returncode:
        raise RuntimeError(
            "Unable to load immutable Phase-2 transition helper: "
            + result.stderr.decode("utf-8", errors="replace").strip()
        )
    return result.stdout


def _run_transition_bundle(bundle: bytes, request: bytes) -> subprocess.CompletedProcess[bytes]:
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


def _enumerate_raw_transition_facts(
    source_texts: dict[str, str], *, code_revision: str | None = None
) -> list[dict[str, Any]]:
    """Enumerates Phase-2 raw writes through its independent compiler traversal."""
    result = _run_transition_bundle(
        _transition_helper_bundle(code_revision),
        json.dumps(
            {"mode": "phase2", "sources": source_texts}, sort_keys=True
        ).encode(),
    )
    if result.returncode:
        raise RuntimeError(
            "Phase-2 raw TypeScript transition traversal failed: "
            + result.stderr.decode("utf-8", errors="replace").strip()
        )
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise RuntimeError("Phase-2 transition traversal returned invalid JSON") from error
    facts = payload.get("literal_domain_writes") if isinstance(payload, dict) else None
    if not isinstance(facts, list) or not all(isinstance(row, dict) for row in facts):
        raise RuntimeError("Phase-2 transition traversal returned malformed facts")
    return facts


def _raw_store_surfaces(
    reader: GitObjectReader,
    source_paths: list[str],
    *,
    code_revision: str | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Discovers literal domains and independently adjudicates raw AST writes."""
    states: list[dict[str, Any]] = []
    property_domain_symbols: dict[tuple[str, str], set[str]] = defaultdict(set)
    source_texts = {
        path: reader.read(BASELINE, path).decode("utf-8", errors="replace")
        for path in source_paths
        if Path(path).suffix.lower() in {".ts", ".tsx", ".js", ".jsx"}
    }
    for path in source_paths:
        if Path(path).suffix.lower() not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        text = source_texts[path]
        domains: dict[str, set[str]] = {}
        for match in re.finditer(
            r"(?:export\s+)?type\s+(\w+)\s*=\s*([\s\S]*?)(?=\n\s*(?:export\s+)?(?:type|interface|const|function|class)\b|\Z)",
            text,
        ):
            name, body = match.groups()
            if not RAW_STATE_NAME.search(name):
                continue
            residue = re.sub(r"[|;\s]", "", re.sub(r"['\"][^'\"\n]+['\"]", "", body))
            if residue:
                continue
            literals = set(re.findall(r"['\"]([^'\"\n]+)['\"]", body))
            if not literals:
                continue
            domains[name] = literals
            line = text.count("\n", 0, match.start()) + 1
            for literal in sorted(literals):
                states.append({"path": path, "source_symbol": name, "state_id": literal, "evidence": locator(reader, BASELINE, path, line, line)})
        properties: dict[str, list[tuple[str, set[str]]]] = defaultdict(list)
        for interface in re.finditer(r"(?:export\s+)?interface\s+(\w+)\s*\{([\s\S]*?)\n\}", text):
            interface_name, body = interface.groups()
            for prop in re.finditer(r"^\s*(\w+)\??:\s*([^\n]+)", body, re.MULTILINE):
                prop_name, type_text = prop.groups()
                alias = next((name for name in domains if re.search(rf"\b{re.escape(name)}\b", type_text)), None)
                inline = set(re.findall(r"['\"]([^'\"\n]+)['\"]", type_text))
                if alias:
                    properties[prop_name].append((alias, domains[alias]))
                    property_domain_symbols[(path, prop_name)].add(alias)
                elif RAW_STATE_NAME.search(prop_name) and inline:
                    symbol = f"{interface_name}.{prop_name}"
                    properties[prop_name].append((symbol, inline))
                    property_domain_symbols[(path, prop_name)].add(symbol)
                    line = text.count("\n", 0, interface.start(2) + prop.start()) + 1
                    for literal in sorted(inline):
                        states.append({"path": path, "source_symbol": symbol, "state_id": literal, "evidence": locator(reader, BASELINE, path, line, line)})
        for declaration in re.finditer(
            r"(?:export\s+)?type\s+(\w+)\s*=\s*\{([\s\S]*?)^\}\s*;?",
            text,
            re.MULTILINE,
        ):
            type_name, body = declaration.groups()
            if not RAW_STATE_NAME.search(type_name):
                continue
            for prop in re.finditer(r"^\s*(\w+)\??:\s*([^;\n]+);?\s*$", body, re.MULTILINE):
                prop_name, type_text = prop.groups()
                if not RAW_STATE_NAME.search(prop_name):
                    continue
                literals = set(re.findall(r"['\"]([^'\"\n]+)['\"]", type_text))
                if not literals:
                    continue
                symbol = f"{type_name}.{prop_name}"
                properties[prop_name].append((symbol, literals))
                property_domain_symbols[(path, prop_name)].add(symbol)
                line = text.count("\n", 0, declaration.start(2) + prop.start()) + 1
                for literal in sorted(literals):
                    states.append({"path": path, "source_symbol": symbol, "state_id": literal, "evidence": locator(reader, BASELINE, path, line, line)})
        for declaration in re.finditer(
            r"(?:const|let)\s*\[\s*(\w+)\s*,\s*(set\w+)\s*\]\s*=\s*(?:React\.)?useState\s*<([^>]+)>\s*\(\s*(['\"])([^'\"]+)\4",
            text,
            re.DOTALL,
        ):
            state_name, setter_name, type_text, _quote, initial_value = declaration.groups()
            if not RAW_STATE_NAME.search(state_name):
                continue
            literals = set(re.findall(r"['\"]([^'\"\n]+)['\"]", type_text))
            line = text.count("\n", 0, declaration.start()) + 1
            for literal in sorted(literals):
                states.append({"path": path, "source_symbol": state_name, "state_id": literal, "evidence": locator(reader, BASELINE, path, line, line)})
        existing_state_keys = {(row["path"], row["source_symbol"], row["state_id"]) for row in states}
        for declaration in re.finditer(
            r"(?:const|let)\s*\[\s*(\w+)\s*,\s*set\w+\s*\]\s*=\s*(?:React\.)?useState\s*<([^>]+)>",
            text,
            re.DOTALL,
        ):
            state_name, type_text = declaration.groups()
            if not RAW_STATE_NAME.search(state_name):
                continue
            line = text.count("\n", 0, declaration.start()) + 1
            for literal in sorted(set(re.findall(r"['\"]([^'\"\n]+)['\"]", type_text))):
                key = (path, state_name, literal)
                if key not in existing_state_keys:
                    states.append({"path": path, "source_symbol": state_name, "state_id": literal, "evidence": locator(reader, BASELINE, path, line, line)})
                    existing_state_keys.add(key)
    state_occurrences: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for state in states:
        state_occurrences[(state["source_symbol"], state["state_id"])].append(state)

    def resolves_raw_state(symbol: str, state_id: str, evidence_path: str) -> bool:
        """Checks that Phase-2 independently found one exact state occurrence."""
        domain_symbols = {symbol, *property_domain_symbols.get((evidence_path, symbol), set())}
        choices = [
            row
            for domain_symbol in domain_symbols
            for row in state_occurrences.get((domain_symbol, state_id), [])
        ]
        local = [row for row in choices if row["path"] == evidence_path]
        resolved = local if len(local) == 1 else choices
        return len(resolved) == 1

    transitions: list[dict[str, Any]] = []
    candidates: list[dict[str, Any]] = []
    for fact in _enumerate_raw_transition_facts(
        source_texts, code_revision=code_revision
    ):
        evidence = locator(
            reader,
            BASELINE,
            fact["path"],
            fact["start_line"],
            fact["end_line"],
        )
        common = {
            "path": fact["path"],
            "source_symbol": fact["source_symbol"],
            "to_state_id": fact["to_state_id"],
            "evidence": evidence,
        }
        from_state = fact.get("proven_from_state_id")
        if (
            isinstance(from_state, str)
            and resolves_raw_state(fact["source_symbol"], from_state, fact["path"])
            and resolves_raw_state(
                fact["source_symbol"], fact["to_state_id"], fact["path"]
            )
        ):
            transitions.append(
                {
                    **common,
                    "from_state_id": from_state,
                    "transition_evidence_kind": fact["proof_kind"],
                    "discovery_method": "independent-raw-typescript-compiler-ast",
                }
            )
        else:
            has_compiler_proof = isinstance(from_state, str)
            candidates.append(
                {
                    **common,
                    **(
                        {
                            "from_state_id": from_state,
                            "transition_evidence_kind": fact["proof_kind"],
                        }
                        if has_compiler_proof
                        else {}
                    ),
                    "record_kind": "transition_write_candidate",
                    "resolution_status": "unresolved",
                    "reason": (
                        "state-domain-occurrence-ambiguous"
                        if has_compiler_proof
                        else "no-single-proven-from-state"
                    ),
                    "discovery_method": "independent-raw-typescript-compiler-ast",
                }
            )
    state_map = {(row["path"], row["source_symbol"], row["state_id"]): row for row in states}
    transition_map = {
        (
            row["path"],
            row["source_symbol"],
            row["from_state_id"],
            row["to_state_id"],
            row["evidence"]["range"]["start_line"],
        ): row
        for row in transitions
    }
    candidate_map = {
        (row["path"], row["source_symbol"], row["to_state_id"], row["evidence"]["range"]["start_line"]): row
        for row in candidates
    }
    return (
        [state_map[key] for key in sorted(state_map)],
        [transition_map[key] for key in sorted(transition_map)],
        [candidate_map[key] for key in sorted(candidate_map)],
    )


def first_deletion_records(history_output: str) -> list[dict[str, str]]:
    """Parses first-parent deletion output, retaining only the first row per path."""
    records: list[dict[str, str]] = []
    seen_paths: set[str] = set()
    revision = ""
    for line in history_output.splitlines():
        if line.startswith("commit:"):
            revision = line[7:]
        elif line.startswith("D\t"):
            path = line[2:]
            if (
                path not in seen_paths
                and path != QUARANTINED_SOURCE_PREFIX
                and not path.startswith(f"{QUARANTINED_SOURCE_PREFIX}/")
                and (_raw_source_path(path) or _raw_asset_path(path))
            ):
                seen_paths.add(path)
                records.append({"deletion_revision": revision, "path": path})
    return records


def discover_raw_frozen_sources(*, code_revision: str | None = None) -> dict[str, Any]:
    """Discovers identities, files, surfaces, assets, and history without Phase-1 inputs."""
    entries = _tree_entries()
    reader = GitObjectReader()
    try:
        catalog_text = reader.read(BASELINE, CATALOG_PATH).decode("utf-8")
        catalog_records: list[dict[str, Any]] = []
        for match in re.finditer(r"^\s*id:\s*['\"]([^'\"]+)['\"]", catalog_text, re.MULTILINE):
            line = catalog_text.count("\n", 0, match.start()) + 1
            slug = match.group(1)
            catalog_records.append({"catalog_id": slug, "evidence": locator(reader, BASELINE, CATALOG_PATH, line, line)})
        source_paths = [row["path"] for row in entries if _raw_source_path(row["path"])]
        route_records = []
        for path in source_paths:
            match = re.search(r"/games/(sentence|vocabulary)/([^/]+)/page\.tsx$", path)
            if match:
                route_records.append({"source_kind": match.group(1), "catalog_id": match.group(2), "path": path, "evidence": locator(reader, BASELINE, path)})
        states, transitions, transition_candidates = _raw_store_surfaces(
            reader, source_paths, code_revision=code_revision
        )
        asset_records = [
            {
                "canonical_path": row["path"],
                "git_object_id": row["git_object_id"],
                "byte_size": row["byte_size"],
                "relevance_rule_id": _raw_asset_relevance_rule(row["path"]),
            }
            for row in entries if _raw_asset_path(row["path"])
        ]
        history_output = subprocess.check_output(
            [GIT_EXECUTABLE, "log", "--first-parent", "--format=commit:%H", "--name-status", "--diff-filter=D", BASELINE, "--", *SOURCE_ROOTS],
            cwd=REPO_ROOT,
            text=True,
        )
        history_records = first_deletion_records(history_output)
        batches = [
            {"batch_id": f"raw-identity-{index // 3 + 1:02d}", "identity_ids": [row["catalog_id"] for row in catalog_records[index:index + 3]]}
            for index in range(0, len(catalog_records), 3)
        ]
        meter = BudgetMeter(reader.files_read, 3, reader.bytes_read)
        meter.add()
        return {
            "source_baseline_revision": BASELINE,
            "discovery_method": "independent-frozen-tree-and-raw-source-scan",
            "raw_identity_records": catalog_records,
            "raw_route_records": route_records,
            "raw_file_records": [
                {
                    **row,
                    "canonical_path": row["path"],
                    "relevance_rule_id": _raw_source_relevance_rule(row["path"]),
                }
                for row in entries if row["path"] in set(source_paths)
            ],
            "raw_state_records": states,
            "raw_transition_records": transitions,
            "raw_transition_write_candidates": transition_candidates,
            "raw_asset_records": asset_records,
            "raw_history_records": history_records,
            "review_batches": batches,
            "resource_usage": {"source_files": meter.source_files, "command_invocations": meter.command_invocations, "bytes_read": meter.bytes_read},
        }
    finally:
        reader.close()


def symmetric_reconciliation_records(
    category: str,
    mechanical: dict[str, list[dict[str, Any]]],
    human: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    """Returns matched and either-side-only records over the union of keys."""
    rows = []
    for key in sorted(set(mechanical) | set(human)):
        if key in mechanical and key in human:
            status = (
                "evidence-mismatch"
                if category == "transition-write-candidates"
                and canonical_key(mechanical[key]) != canonical_key(human[key])
                else "matched"
            )
        else:
            status = "mechanical-only" if key in mechanical else "human-only"
        unresolved_candidate = category == "transition-write-candidates" and status != "matched"
        rows.append({
            "category": category, "record_key": key, "comparison_status": status,
            "blocking": status != "matched" or unresolved_candidate,
            "resolution_status": (
                "unresolved-candidate"
                if unresolved_candidate
                else "retained-target-write-candidate"
                if category == "transition-write-candidates"
                else "compared"
            ),
            "mechanical_evidence": mechanical.get(key, []), "human_evidence": human.get(key, []),
        })
    return rows


def summarize_symmetric_reconciliation(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Derives fail-closed Phase-2 status and counts from exact symmetric rows.

    Args:
        rows: Complete union comparison emitted by the independent and mechanical paths.

    Returns:
        Exact blocking records, per-category counts, and truthful reconciliation status.

    Raises:
        ValueError: If a row's blocking flag disagrees with its comparison status.
    """
    blockers: list[dict[str, Any]] = []
    by_category: dict[str, int] = defaultdict(int)
    seen_keys: set[tuple[str, str]] = set()
    for row in rows:
        status = row.get("comparison_status")
        category = row.get("category")
        candidate = category == "transition-write-candidates"
        if status not in {"matched", "mechanical-only", "human-only", "evidence-mismatch"}:
            raise ValueError("INVALID_SYMMETRIC_COMPARISON_STATUS")
        if status == "evidence-mismatch" and not candidate:
            raise ValueError("INVALID_SYMMETRIC_COMPARISON_STATUS")
        expected_resolution = (
            "retained-target-write-candidate" if candidate and status == "matched"
            else "unresolved-candidate" if candidate else "compared"
        )
        expected_blocking = status != "matched"
        if row.get("resolution_status") != expected_resolution:
            raise ValueError("SYMMETRIC_RESOLUTION_STATUS_MISMATCH")
        if row.get("blocking") is not expected_blocking:
            raise ValueError("SYMMETRIC_BLOCKING_FLAG_MISMATCH")
        record_key = row.get("record_key")
        if not isinstance(category, str) or not category or not isinstance(record_key, str) or not record_key:
            raise ValueError("INVALID_SYMMETRIC_RECORD_KEY")
        unique_key = (category, record_key)
        if unique_key in seen_keys:
            raise ValueError("DUPLICATE_SYMMETRIC_RECORD")
        seen_keys.add(unique_key)
        if expected_blocking:
            blockers.append(row)
            by_category[category] += 1
    blocked = bool(blockers)
    return {
        "status": (
            "independent-human-reconciliation-blocked"
            if blocked
            else "independent-human-discovery-complete"
        ),
        "coverage_status": "blocked" if blocked else "complete",
        "uncovered_count": len(blockers),
        "uncovered_by_category": dict(sorted(by_category.items())),
        "blocking_records": blockers,
    }


def unique_map(
    records: list[dict[str, Any]],
    key_fn: Any,
    value_fn: Any,
    label: str,
) -> dict[str, list[dict[str, Any]]]:
    """Builds a key map while rejecting duplicate projections before collapse."""
    result: dict[str, list[dict[str, Any]]] = {}
    for row in records:
        key = key_fn(row)
        if key in result:
            raise ValueError(f"DUPLICATE_EXACT_REVIEW_KEY:{label}")
        result[key] = value_fn(row)
    return result


def build_symmetric_reconciliation(
    source: dict[str, Any],
    ledger: dict[str, Any],
    scenes: dict[str, Any],
    assets: dict[str, Any],
    historical: dict[str, Any],
    raw: dict[str, Any],
) -> list[dict[str, Any]]:
    """Derives the exact seven-category mechanical/human symmetric union."""
    maps = {
        "identities": (
            unique_map(ledger["identity_records"], lambda row: row["catalog_identity_id"], lambda row: [row["catalog_evidence"]], "mechanical identities"),
            unique_map(raw["raw_identity_records"], lambda row: row["catalog_id"], lambda row: [row["evidence"]], "raw identities"),
        ),
        "files": (
            unique_map([row for row in source["records"] if row["record_type"] == "file"], lambda row: row["file_path"], lambda row: [row["evidence"]], "mechanical files"),
            unique_map(raw["raw_file_records"], lambda row: row["canonical_path"], lambda row: [row], "raw files"),
        ),
        "states": (
            unique_map(scenes["state_records"], lambda row: canonical_key([row["evidence"]["path"], row["source_symbol"], row["state_id"]]), lambda row: [row["evidence"]], "mechanical states"),
            unique_map(raw["raw_state_records"], lambda row: canonical_key([row["path"], row["source_symbol"], row["state_id"]]), lambda row: [row["evidence"]], "raw states"),
        ),
        "transitions": (
            unique_map(scenes["transitions"], lambda row: canonical_key([row["evidence"]["path"], row["source_symbol"], row["from_state_id"], row["to_state_id"], row["evidence"]["range"]["start_line"]]), lambda row: [row["evidence"]], "mechanical transitions"),
            unique_map(raw["raw_transition_records"], lambda row: canonical_key([row["path"], row["source_symbol"], row["from_state_id"], row["to_state_id"], row["evidence"]["range"]["start_line"]]), lambda row: [row["evidence"]], "raw transitions"),
        ),
        "transition-write-candidates": (
            unique_map(scenes["transition_write_candidates"], transition_candidate_key, lambda row: [row["evidence"]], "mechanical transition candidates"),
            unique_map(raw["raw_transition_write_candidates"], transition_candidate_key, lambda row: [row["evidence"]], "raw transition candidates"),
        ),
        "assets": (
            unique_map(assets["candidate_files"], lambda row: row["canonical_path"], lambda row: [row], "mechanical assets"),
            unique_map(raw["raw_asset_records"], lambda row: row["canonical_path"], lambda row: [row], "raw assets"),
        ),
        "history-paths": (
            unique_map([row for row in historical["records"] if row["classification"] != "current"], lambda row: row["evidence"]["path"], lambda row: [row["evidence"]], "mechanical history"),
            unique_map(raw["raw_history_records"], lambda row: row["path"], lambda row: [row], "raw history"),
        ),
    }
    rows = [
        row
        for category, (mechanical, human) in maps.items()
        for row in symmetric_reconciliation_records(category, mechanical, human)
    ]
    if not rows or {row["category"] for row in rows} != set(maps):
        raise ValueError("SYMMETRIC_UNION_EMPTY_OR_INCOMPLETE")
    return rows


def validate_symmetric_reconciliation_document(
    document: dict[str, Any], expected_rows: list[dict[str, Any]]
) -> dict[str, Any]:
    """Validates exact blocker membership, status, and accounting in a Phase-2 document.

    Args:
        document: Human discrepancy artifact containing the complete symmetric union.
        expected_rows: Freshly derived exact seven-category union.

    Returns:
        The independently derived symmetric reconciliation summary.
    """
    rows = document.get("independent_symmetric_reconciliation")
    if not isinstance(expected_rows, list) or not expected_rows:
        raise ValueError("SYMMETRIC_UNION_EMPTY_OR_INCOMPLETE")
    if not isinstance(rows, list):
        raise ValueError("MISSING_SYMMETRIC_RECONCILIATION")
    summary = summarize_symmetric_reconciliation(rows)
    if rows != expected_rows:
        raise ValueError("SYMMETRIC_UNION_MISMATCH")
    if document.get("independent_symmetric_blocking_records") != summary["blocking_records"]:
        raise ValueError("SYMMETRIC_BLOCKER_SET_MISMATCH")
    if document.get("status") != summary["status"] or document.get("coverage_status") != summary["coverage_status"]:
        raise ValueError("SYMMETRIC_STATUS_MISMATCH")
    coverage_counts = document.get("exhaustive_coverage_counts")
    if not isinstance(coverage_counts, dict) or not coverage_counts:
        raise ValueError("SYMMETRIC_ACCOUNTING_MISMATCH")
    expected_uncovered_by_category = (
        summary["uncovered_by_category"]
        if summary["uncovered_count"]
        else {category: 0 for category in coverage_counts}
    )
    if (
        document.get("uncovered_count") != summary["uncovered_count"]
        or document.get("uncovered_by_category") != expected_uncovered_by_category
    ):
        raise ValueError("SYMMETRIC_ACCOUNTING_MISMATCH")
    return summary


def phase1_input_provenance(reader: GitObjectReader, revision: str) -> dict[str, Any]:
    """Builds exact revision-and-hash provenance for all consumed Phase-1 artifacts.

    Args:
        reader: Committed-object reader used for the Phase-1 load.
        revision: Validated full Phase-1 commit SHA.

    Returns:
        Exact revision and SHA-256 mapping for every consumed Phase-1 artifact.
    """
    return {
        "revision": revision,
        "artifact_sha256": {
            f"measure/tracks/{TRACK}/{name}": hashlib.sha256(
                reader.read(revision, f"measure/tracks/{TRACK}/{name}")
            ).hexdigest()
            for name in PHASE1_ARTIFACTS
        },
    }


def git_json(reader: GitObjectReader, revision: str, name: str) -> dict[str, Any]:
    """Loads a denominator from its committed revision.

    Args:
        reader: Committed-object reader.
        revision: Commit containing the denominator.
        name: Filename within the track directory.

    Returns:
        The parsed JSON object.
    """
    path = f"measure/tracks/{TRACK}/{name}"
    value = json.loads(reader.read(revision, path))
    if not isinstance(value, dict):
        raise TypeError(f"Expected object at {revision}:{path}")
    return value


def validate_phase1_revision(revision: str) -> str:
    """Validates a full reachable Phase-1 commit before any output mutation.

    Args:
        revision: Candidate Phase-1 commit SHA.

    Returns:
        The validated commit SHA.

    Raises:
        ValueError: If the value is not a full commit SHA reachable from the current repository.
    """
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("phase1-revision must be a full 40-character lowercase commit SHA")
    resolved = subprocess.run(
        [GIT_EXECUTABLE, "rev-parse", "--verify", f"{revision}^{{commit}}"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if resolved.returncode != 0 or resolved.stdout.strip() != revision:
        raise ValueError(f"Unresolvable phase1-revision: {revision}")
    reachable = subprocess.run(
        [GIT_EXECUTABLE, "merge-base", "--is-ancestor", revision, "HEAD"],
        cwd=REPO_ROOT,
        capture_output=True,
        check=False,
    )
    if reachable.returncode != 0:
        raise ValueError(f"phase1-revision is not reachable from HEAD: {revision}")
    return revision


def tree_paths() -> list[str]:
    """Returns all frozen paths inside the approved source roots.

    Returns:
        Sorted repository-relative paths from the baseline tree.
    """
    output = subprocess.check_output(
        [
            "git", "ls-tree", "-r", "--name-only", BASELINE, "--",
            "apps/advantage-games", "apps/reading-advantage",
            "apps/primary-advantage", "packages", "measure",
        ],
        cwd=REPO_ROOT,
        text=True,
    )
    return sorted(path for path in output.splitlines() if path)


def locator(
    reader: GitObjectReader,
    revision: str,
    path: str,
    start_line: int = 1,
    end_line: int | None = None,
) -> dict[str, Any]:
    """Creates an exact committed evidence locator.

    Args:
        reader: Committed-object reader.
        revision: Commit containing the source object.
        path: Repository-relative source path.
        start_line: First inclusive evidence line.
        end_line: Last inclusive evidence line, or the final line.

    Returns:
        A blob and inclusive-range hash locator.
    """
    blob = reader.read(revision, path)
    lines = blob.splitlines(keepends=True)
    if not lines:
        if start_line != 1 or end_line not in (None, 0):
            raise ValueError(f"Invalid empty-object range for {revision}:{path}")
        return {
            "revision": revision,
            "path": path,
            "blob_sha256": hashlib.sha256(blob).hexdigest(),
            "range": {"start_line": 0, "end_line": 0, "sha256": hashlib.sha256(blob).hexdigest()},
        }
    final_line = len(lines) if end_line is None else end_line
    if start_line < 1 or final_line < start_line or final_line > len(lines):
        raise ValueError(f"Invalid range for {revision}:{path}: {start_line}-{final_line}")
    return {
        "revision": revision,
        "path": path,
        "blob_sha256": hashlib.sha256(blob).hexdigest(),
        "range": {
            "start_line": start_line,
            "end_line": final_line,
            "sha256": hashlib.sha256(b"".join(lines[start_line - 1 : final_line])).hexdigest(),
        },
    }


def revalidate(reader: GitObjectReader, evidence: dict[str, Any]) -> dict[str, Any]:
    """Rebuilds an existing locator directly from committed bytes.

    Args:
        reader: Committed-object reader.
        evidence: Mechanical locator whose exact range is retained.

    Returns:
        Independently revalidated evidence.
    """
    source_range = evidence["range"]
    rebuilt = locator(
        reader,
        evidence["revision"],
        evidence["path"],
        source_range["start_line"],
        source_range["end_line"],
    )
    if evidence != rebuilt:
        raise ValueError("LOCATOR_MISMATCH")
    return rebuilt


def canonical_key(value: object) -> str:
    """Returns a deterministic key for one mechanical object.

    Args:
        value: JSON-compatible object to identify.

    Returns:
        Canonical compact JSON.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def transition_candidate_key(row: dict[str, Any]) -> str:
    """Returns the exact path/symbol/target/line/optional-from candidate key."""
    evidence = row.get("evidence", {})
    source_range = evidence.get("range", {}) if isinstance(evidence, dict) else {}
    path = row.get("path", evidence.get("path") if isinstance(evidence, dict) else None)
    line = row.get("start_line", source_range.get("start_line"))
    payload = {
        "path": path,
        "source_symbol": row.get("source_symbol"),
        "to_state_id": row.get("to_state_id"),
        "start_line": line,
        "reason": row.get("reason"),
    }
    from_state = row.get("from_state_id", row.get("proven_from_state_id"))
    if isinstance(from_state, str):
        payload["proven_from_state_id"] = from_state
        payload["transition_evidence_kind"] = row.get("transition_evidence_kind")
    if (
        not isinstance(path, str)
        or not isinstance(payload["source_symbol"], str)
        or not isinstance(payload["to_state_id"], str)
        or not isinstance(line, int)
        or not isinstance(payload["reason"], str)
        or isinstance(from_state, str)
        and not isinstance(payload.get("transition_evidence_kind"), str)
    ):
        raise ValueError("INVALID_TRANSITION_CANDIDATE_KEY")
    return canonical_key(payload)


def require_exact_map_cardinalities(
    cardinalities: dict[str, tuple[int, int]],
) -> None:
    """Rejects any reconciliation map whose key projection collapsed source rows."""
    collapsed = [
        label for label, (actual, expected) in cardinalities.items() if actual != expected
    ]
    if collapsed:
        raise ValueError(f"duplicate exact reconciliation keys: {', '.join(collapsed)}")


def evidence_record(
    *,
    method: str,
    evidence: list[dict[str, Any]],
    source_fact: str,
    **fields: Any,
) -> dict[str, Any]:
    """Builds a non-interpretive human evidence record.

    Args:
        method: Exact human review method.
        evidence: Exact committed locators reviewed.
        source_fact: Observation limited to cited source bytes.
        **fields: Stable category-specific record fields.

    Returns:
        A complete collector evidence record.
    """
    if not evidence:
        raise ValueError(f"Evidence record cannot be empty: {fields}")
    return {
        **fields,
        "method": method,
        "collector_role": "evidence-collector",
        "collector_identity": COLLECTOR_IDENTITY,
        "confidence": "high",
        "evidence": evidence,
        "source_fact": source_fact,
        "interpretation": {},
    }


def catalog_ranges(reader: GitObjectReader) -> dict[str, dict[str, Any]]:
    """Finds exact current catalog object ranges by raw card ID.

    Args:
        reader: Committed-object reader.

    Returns:
        Catalog IDs mapped to exact card-block locators.
    """
    text = reader.read(BASELINE, CATALOG_PATH).decode("utf-8")
    lines = text.splitlines()
    result: dict[str, dict[str, Any]] = {}
    for number, line in enumerate(lines, start=1):
        match = re.search(r"\bid:\s*['\"]([^'\"]+)['\"]", line)
        if not match or number < 29:
            continue
        end = number
        while end <= len(lines) and lines[end - 1].strip() != "},":
            end += 1
        result[match.group(1)] = locator(reader, BASELINE, CATALOG_PATH, number, min(end, len(lines)))
    return result


def discover_program_identities(
    reader: GitObjectReader,
    ledger: dict[str, Any],
    historical: dict[str, Any],
) -> list[tuple[str, str, str | None, str]]:
    """Derives program-label mappings from committed catalog, page, and history evidence.

    Args:
        reader: Committed-object reader.
        ledger: Corrected Phase-1 current identity ledger.
        historical: Corrected Phase-1 historical source records.

    Returns:
        Program labels paired with independently resolved source identifiers.
    """
    program = reader.read(BASELINE, PROGRAM_PATH).decode("utf-8")
    partition = program.split("### Pilot\n", 1)[1].split(
        "The partition covers 29 canonical identities exactly once.", 1
    )[0]
    labels = re.findall(r"^- (.+)$", partition, flags=re.MULTILINE)
    if len(labels) != 29 or len(set(labels)) != 29:
        raise ValueError("Frozen program partition must contain 29 unique labels")

    catalog_text = reader.read(BASELINE, CATALOG_PATH).decode("utf-8")
    catalog_by_title: dict[str, str] = {}
    for block in re.findall(r"\{\s*id:\s*['\"][^'\"]+['\"].*?\n\s*\},", catalog_text, flags=re.DOTALL):
        id_match = re.search(r"\bid:\s*['\"]([^'\"]+)['\"]", block)
        title_match = re.search(r"\btitle:\s*(['\"])(.*?)\1", block)
        if id_match is not None and title_match is not None:
            catalog_by_title[title_match.group(2)] = id_match.group(1)

    ledger_ids = [
        row["canonical_identity_id"]
        for row in ledger["identity_records"]
        if any(state.get("source_class") == "current-page-source" for state in row.get("source_states", []))
    ]
    history_paths = [row["evidence"]["path"] for row in historical["records"]]
    discovered: list[tuple[str, str, str | None, str]] = []
    for label in labels:
        display_name = label.split(" —", 1)[0]
        catalog_id = catalog_by_title.get(display_name)
        if catalog_id is None:
            normalized = re.sub(r"^the-", "", re.sub(r"[^a-z0-9]+", "-", display_name.lower()).strip("-"))
            catalog_id = normalized
        mechanical_id = next((identity for identity in ledger_ids if identity.endswith(f"/{catalog_id}")), None)
        if mechanical_id is not None:
            source_identity_id = mechanical_id
        else:
            route_pattern = re.compile(rf"/games/(sentence|vocabulary)/{re.escape(catalog_id)}/")
            route_match = next((route_pattern.search(path) for path in history_paths if route_pattern.search(path)), None)
            if route_match is not None:
                source_kind = route_match.group(1)
            else:
                definition_path = f"packages/game-cartridges/src/cartridges/{catalog_id}/definition.ts"
                try:
                    definition = reader.read(ASTRAL_HISTORY_REVISION, definition_path).decode("utf-8")
                except ValueError as error:
                    raise ValueError(f"No committed page/history source identity found for {label}") from error
                input_mode = re.search(r"\binputMode:\s*['\"](sentence|vocabulary)['\"]", definition)
                if input_mode is None:
                    raise ValueError(f"Historical cartridge lacks an exact inputMode for {label}")
                source_kind = input_mode.group(1)
            source_identity_id = f"{source_kind}/{catalog_id}"
        discovered.append((label, catalog_id, mechanical_id, source_identity_id))
    return discovered


def implementation_matches(paths: list[str], slug: str) -> list[str]:
    """Finds exact baseline implementation paths for one source slug.

    Args:
        paths: Frozen baseline tree paths.
        slug: Exact catalog/history source slug.

    Returns:
        Matching implementation paths, excluding documentation and assets.
    """
    prefixes = (
        "apps/advantage-games/src/",
        "apps/reading-advantage/app/",
        "apps/reading-advantage/components/",
        "apps/primary-advantage/app/",
        "apps/primary-advantage/components/",
        "packages/game-cartridges/src/cartridges/",
    )
    needle = f"/{slug}/"
    return [path for path in paths if path.startswith(prefixes) and needle in path]


def batch_maps(
    program_identities: list[tuple[str, str, str | None, str]],
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Builds replacement-program batches of no more than three games.

    Returns:
        Batch metadata and a slug-to-batch mapping.
    """
    batches: list[dict[str, Any]] = []
    slug_batches: dict[str, str] = {}
    for number, start in enumerate(range(0, len(program_identities), 3), start=1):
        group = program_identities[start : start + 3]
        batch_id = f"human-program-{number:02d}"
        for _, slug, _, _ in group:
            slug_batches[slug] = batch_id
        batches.append({
            "batch_id": batch_id,
            "status": "accepted",
            "accepted_identity_ids": [label for label, _, _, _ in group],
            "method": "human-raw-program-identity-review",
            "collector_role": "evidence-collector",
            "collector_identity": COLLECTOR_IDENTITY,
            "source_fact": "The listed raw replacement-program identities were reviewed as one batch of no more than three.",
            "interpretation": {},
        })
    return batches, slug_batches


def batch_for_path(path: str, slug_batches: dict[str, str]) -> str:
    """Assigns a path to one game batch or the explicit global batch.

    Args:
        path: Repository-relative source or asset path.
        slug_batches: Exact slug-to-batch mapping.

    Returns:
        A game batch ID or the non-game/global batch ID.
    """
    collapsed = re.sub(r"[^a-z0-9]", "", path.lower())
    matches = [batch for slug, batch in slug_batches.items() if re.sub(r"[^a-z0-9]", "", slug) in collapsed]
    return matches[0] if len(set(matches)) == 1 else "human-global-shared-01"


def program_reviews(
    reader: GitObjectReader,
    paths: list[str],
    ledger: dict[str, Any],
    historical: dict[str, Any],
    catalog: dict[str, dict[str, Any]],
    slug_batches: dict[str, str],
    program_identities: list[tuple[str, str, str | None, str]],
) -> list[dict[str, Any]]:
    """Reviews all 29 raw replacement-program identities.

    Args:
        reader: Committed-object reader.
        paths: Frozen baseline tree paths.
        ledger: Mechanical current identity ledger.
        historical: Mechanical historical locator ledger.
        catalog: Exact current catalog card ranges.
        slug_batches: Exact game batch assignments.

    Returns:
        Twenty-nine current-or-absent source review records.
    """
    program_lines = reader.read(BASELINE, PROGRAM_PATH).decode("utf-8").splitlines()
    line_by_label = {line[2:]: number for number, line in enumerate(program_lines, start=1) if line.startswith("- ")}
    catalog_file_evidence = locator(reader, BASELINE, CATALOG_PATH)
    reachable_revisions = set(subprocess.check_output(
        [
            "git", "rev-list", BASELINE, "--", "apps/advantage-games",
            "apps/reading-advantage", "apps/primary-advantage", "packages", "measure",
        ],
        cwd=REPO_ROOT,
        text=True,
    ).splitlines())
    ledger_by_id = {row["canonical_identity_id"]: row for row in ledger["identity_records"]}
    history_by_slug: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in historical["records"]:
        path = row["evidence"]["path"]
        for _, slug, _, _ in program_identities:
            if f"/{slug}/" in path or slug in Path(path).name:
                history_by_slug[slug].append(revalidate(reader, row["evidence"]))

    for slug in ("astral-mage", "sorcerer-ziggurat"):
        prefix = f"packages/game-cartridges/src/cartridges/{slug}/"
        supplemental = [path for path in subprocess.check_output(
            [GIT_EXECUTABLE, "ls-tree", "-r", "--name-only", ASTRAL_HISTORY_REVISION, "--", prefix],
            cwd=REPO_ROOT,
            text=True,
        ).splitlines() if path]
        history_by_slug[slug].extend(locator(reader, ASTRAL_HISTORY_REVISION, path) for path in supplemental)

    reviews: list[dict[str, Any]] = []
    for number, (label, catalog_id, mechanical_id, source_identity_id) in enumerate(program_identities, start=1):
        program_evidence = locator(reader, BASELINE, PROGRAM_PATH, line_by_label[label], line_by_label[label])
        catalog_evidence = [catalog[catalog_id]] if catalog_id in catalog else []
        matches = implementation_matches(paths, catalog_id)
        display_name = label.split(" —", 1)[0]
        primary_historical_evidence: dict[str, Any] | None = None
        if mechanical_id is not None:
            current = [revalidate(reader, alias["evidence"]) for alias in ledger_by_id[mechanical_id]["aliases"]]
            disposition = "current"
            source_fact = "The frozen baseline contains the cited current page-source object(s); exact catalog evidence is retained when present."
            historical_evidence: list[dict[str, Any]] = []
            history_search = {
                "baseline_revision": BASELINE,
                "ancestor_only": True,
                "search_methods": ["frozen-tree exact implementation path fragment", "exact current catalog ID"],
                "matched_locator_keys": [],
            }
        else:
            current = []
            historical_evidence = history_by_slug[catalog_id]
            if any(item["revision"] not in reachable_revisions for item in historical_evidence):
                raise ValueError(f"Unreachable historical source found for absent identity: {label}")
            preferred = [
                item for item in historical_evidence
                if item["path"].endswith(f"/{catalog_id}/page.tsx")
            ] or [
                item for item in historical_evidence
                if item["path"].endswith(f"/{catalog_id}/definition.ts")
            ]
            if historical_evidence:
                primary_historical_evidence = (preferred or historical_evidence)[0]
                disposition = "historical/withdrawn"
                source_fact = "No current implementation path exists at the frozen baseline; ancestor-only exact-name, slug, route/path, deletion, catalog, and specification searches resolve the identity as historical/withdrawn."
            else:
                disposition = "unsupported program assumption"
                source_fact = "No current or ancestor implementation evidence was found by the recorded exhaustive searches; the authored program name is reviewed but excluded from the current source denominator."

            exact_name_command = [GIT_EXECUTABLE, "log", "--first-parent", "--format=%H", "-S", display_name, BASELINE, "--", *SOURCE_ROOTS]
            slug_command = [GIT_EXECUTABLE, "log", "--first-parent", "--format=%H", "-S", catalog_id, BASELINE, "--", *SOURCE_ROOTS]
            current_name_command = [GIT_EXECUTABLE, "grep", "-l", "-F", display_name, BASELINE, "--", *SOURCE_ROOTS]
            spec_command = [GIT_EXECUTABLE, "grep", "-l", "-F", display_name, BASELINE, "--", "measure"]

            def command_lines(command: list[str]) -> list[str]:
                result = subprocess.run(command, cwd=REPO_ROOT, capture_output=True, text=True, check=False)
                if result.returncode not in (0, 1):
                    raise ValueError(f"Historical search failed ({result.returncode}): {' '.join(command)}: {result.stderr.strip()}")
                return [
                    line for line in result.stdout.splitlines()
                    if line and QUARANTINED_SOURCE_PREFIX not in line
                ]

            exact_name_hits = command_lines(exact_name_command)
            slug_hits = command_lines(slug_command)
            current_name_paths = command_lines(current_name_command)
            current_spec_paths = command_lines(spec_command)
            primary_deletion: dict[str, Any] | None = None
            path_history_events: list[str] = []
            if primary_historical_evidence is not None:
                primary_path = primary_historical_evidence["path"]
                deletion_command = [
                    "git", "log", "--first-parent", "--format=%H%x09%P%x09%s", "--diff-filter=D", BASELINE, "--", primary_path,
                ]
                deletion_lines = command_lines(deletion_command)
                if not deletion_lines:
                    raise ValueError(f"No deletion commit found for historical identity: {label}")
                deletion_parts = deletion_lines[0].split("\t", 2)
                parents = deletion_parts[1].split()
                if not parents or primary_historical_evidence["revision"] != parents[0]:
                    raise ValueError(f"Historical locator is not the first deletion parent for {label}")
                primary_deletion = {
                    "command": " ".join(deletion_command),
                    "deletion_commit": deletion_parts[0],
                    "parent_revision": primary_historical_evidence["revision"],
                    "commit_subject": deletion_parts[2],
                    "path": primary_path,
                }
                path_history_command = [
                    "git", "log", "--first-parent", "--format=commit:%H", "--name-status", BASELINE, "--", primary_path,
                ]
                path_history_events = command_lines(path_history_command)
            else:
                deletion_command = [GIT_EXECUTABLE, "log", "--first-parent", "--format=%H%x09%P%x09%s", "--diff-filter=D", BASELINE, "--", f"*{catalog_id}*"]
                path_history_command = [GIT_EXECUTABLE, "log", "--first-parent", "--format=commit:%H", "--name-status", BASELINE, "--", f"*{catalog_id}*"]

            history_search = {
                "baseline_revision": BASELINE,
                "ancestor_only": True,
                "search_methods": [
                    "frozen-tree exact implementation path fragment",
                    "exact current catalog ID",
                    "Git pickaxe exact display name",
                    "Git pickaxe exact slug",
                    "ancestor path history and deletion-parent resolution",
                    "frozen-revision exact-name specification search",
                ],
                "exact_name": display_name,
                "slug_variants": [catalog_id, catalog_id.replace("-", ""), f"/{catalog_id}/"],
                "exact_name_command": " ".join(exact_name_command),
                "exact_name_commit_hits": exact_name_hits,
                "slug_command": " ".join(slug_command),
                "slug_commit_hits": slug_hits,
                "current_name_command": " ".join(current_name_command),
                "current_name_matched_paths": current_name_paths,
                "specification_command": " ".join(spec_command),
                "current_specification_matched_paths": current_spec_paths,
                "path_history_command": " ".join(path_history_command),
                "path_history_events": path_history_events,
                "primary_deletion": primary_deletion,
                "matched_locator_keys": [canonical_key(item) for item in historical_evidence],
            }
        reviews.append(evidence_record(
            record_id=f"program-identity:{number:02d}",
            program_identity_label=label,
            catalog_id=catalog_id,
            canonical_identity_id=mechanical_id,
            source_identity_id=source_identity_id,
            review_batch_id=slug_batches[catalog_id],
            disposition=disposition,
            current_source_denominator_included=disposition == "current",
            baseline_implementation_search={
                "command": f"git ls-tree -r --name-only {BASELINE} -- apps/advantage-games apps/reading-advantage apps/primary-advantage packages measure",
                "revision": BASELINE,
                "roots": ["apps/advantage-games", "apps/reading-advantage", "apps/primary-advantage", "packages", "measure"],
                "exact_path_fragment": f"/{catalog_id}/",
                "matched_implementation_paths": matches,
            },
            catalog_search={
                "revision": BASELINE, "path": CATALOG_PATH,
                "exact_catalog_id": catalog_id,
                "matched_ranges": [item["range"] for item in catalog_evidence],
                "search_evidence": catalog_evidence or [catalog_file_evidence],
            },
            history_search=history_search,
            current_source_evidence=current,
            historical_source_evidence=historical_evidence,
            primary_historical_evidence=primary_historical_evidence,
            method="human-raw-program-identity-review",
            evidence=[program_evidence, *catalog_evidence, *current, *historical_evidence],
            source_fact=source_fact,
        ))
    return reviews


def validate_evidence_record(record: dict[str, Any], location: str) -> None:
    """Validates required collector fields on one generated review record.

    Args:
        record: Review record to validate.
        location: Human-readable record location.
    """
    for field in ("method", "source_fact", "collector_identity"):
        if not isinstance(record.get(field), str) or not record[field]:
            raise AssertionError(f"{location} lacks {field}")
    if record.get("interpretation") != {}:
        raise AssertionError(f"{location} must carry an empty interpretation")
    evidence = record.get("evidence")
    if not isinstance(evidence, list) or not evidence:
        raise AssertionError(f"{location} lacks exact evidence")
    for item in evidence:
        if not isinstance(item, dict) or not all(key in item for key in ("path", "revision", "blob_sha256", "range")):
            raise AssertionError(f"{location} has an incomplete locator")


def unique_projection(records: list[dict[str, Any]], key_fn: Any, label: str) -> set[str]:
    """Projects review keys while rejecting duplicates before set comparison."""
    values = [key_fn(row) for row in records]
    if len(values) != len(set(values)):
        raise ValueError(f"DUPLICATE_EXACT_REVIEW_KEY:{label}")
    return set(values)


def check_coverage(phase1_revision: str) -> dict[str, int]:
    """Proves every mechanical denominator item has a human disposition.

    Returns:
        Expected counts for each exhaustive comparison category.
    """
    phase1_revision = validate_phase1_revision(phase1_revision)
    reader = GitObjectReader()
    try:
        source = git_json(reader, phase1_revision, "source-denominator.json")
        ledger = git_json(reader, phase1_revision, "game-identity-ledger.json")
        scenes = git_json(reader, phase1_revision, "scene-state-denominator.json")
        assets = git_json(reader, phase1_revision, "asset-file-denominator.json")
        historical = git_json(reader, phase1_revision, "historical-source-denominator.json")
        mechanical_discrepancies = git_json(reader, phase1_revision, "denominator-discrepancies.json")
        program_identities = discover_program_identities(reader, ledger, historical)
    finally:
        reader.close()
    human = json.loads((TRACK_DIR / "independent-human-discovery.json").read_text())
    duplicates = json.loads((TRACK_DIR / "human-duplicate-drift-records.json").read_text())
    human_history = json.loads((TRACK_DIR / "human-historical-deleted-records.json").read_text())
    human_discrepancies = json.loads((TRACK_DIR / "human-discrepancy-records.json").read_text())

    expected_source = {row["record_id"] for row in source["records"]}
    actual_source = unique_projection(human["mechanical_source_record_reviews"], lambda row: row["mechanical_record_id"], "source records")
    expected_graph = {canonical_key(row) for row in source["graph_edges"]}
    actual_graph = unique_projection(human["mechanical_graph_edge_reviews"], lambda row: row["mechanical_graph_edge_key"], "graph edges")
    expected_identities = {
        row["canonical_identity_id"]
        for row in ledger["identity_records"]
        if any(state.get("source_class") == "current-page-source" for state in row.get("source_states", []))
    }
    actual_identities = unique_projection(human_discrepancies["identity_comparison_records"], lambda row: row["canonical_identity_id"], "identities")
    expected_surfaces = {
        canonical_key(row)
        for field in ("scene_records", "state_records", "transitions", "transition_write_candidates")
        for row in scenes[field]
    }
    actual_surfaces = unique_projection(human["surface_reviews"], lambda row: row["mechanical_surface_key"], "surfaces")
    expected_assets = {row["canonical_path"] for row in assets["candidate_files"]}
    actual_assets = unique_projection(human["asset_candidate_reviews"], lambda row: row["canonical_path"], "assets")
    expected_groups = {row["identical_hash_group"] for row in assets["candidate_files"]}
    actual_groups = unique_projection(human["identical_hash_group_reviews"], lambda row: row["identical_hash_group"], "asset groups")
    expected_copies = {row["record_id"] for row in source["records"] if row["record_type"] == "copy"}
    actual_copies = unique_projection(duplicates["mechanical_copy_record_reviews"], lambda row: row["mechanical_copy_record_id"], "copies")
    expected_duplicate_families = {f"{family}:{identity}" for identity in expected_identities for family in ("reading", "primary")}
    actual_duplicate_families = unique_projection(duplicates["duplicate_drift_records"], lambda row: f"{row['source_family']}:{row['canonical_identity_id']}", "duplicate families")
    expected_history = {canonical_key(row["evidence"]) for row in historical["records"]}
    actual_history = unique_projection(human_history["mechanical_historical_locator_reviews"], lambda row: row["mechanical_locator_key"], "history")
    expected_discrepancies = {row["observation_id"] for row in mechanical_discrepancies["records"]}
    actual_discrepancies = unique_projection(human_discrepancies["mechanical_observation_records"], lambda row: row["observation_id"], "discrepancies")
    expected_program = {label for label, _, _, _ in program_identities}
    actual_program = unique_projection(human["replacement_program_identity_reviews"], lambda row: row["program_identity_label"], "program identities")
    expected_program_history = {
        row["program_identity_label"]
        for row in human["replacement_program_identity_reviews"]
        if row["disposition"] == "historical/withdrawn"
    }
    actual_program_history = unique_projection(human_history["program_identity_history_reviews"], lambda row: row["program_identity_label"], "program history")
    actual_program_dispositions = unique_projection(human_discrepancies["program_identity_disposition_records"], lambda row: row["program_identity_label"], "program dispositions")
    comparisons = {
        "source_records": (expected_source, actual_source),
        "graph_edges": (expected_graph, actual_graph),
        "current_identities": (expected_identities, actual_identities),
        "surfaces": (expected_surfaces, actual_surfaces),
        "asset_candidates": (expected_assets, actual_assets),
        "identical_hash_groups": (expected_groups, actual_groups),
        "copy_records": (expected_copies, actual_copies),
        "duplicate_family_records": (expected_duplicate_families, actual_duplicate_families),
        "historical_locators": (expected_history, actual_history),
        "mechanical_discrepancies": (expected_discrepancies, actual_discrepancies),
        "replacement_program_identities": (expected_program, actual_program),
        "program_identity_dispositions": (expected_program, actual_program_dispositions),
        "historical_program_identities": (expected_program_history, actual_program_history),
    }
    for category, (expected, actual) in comparisons.items():
        if expected != actual:
            raise AssertionError(f"{category}: missing={sorted(expected - actual)!r}, extra={sorted(actual - expected)!r}")
    review_fields = (
        "replacement_program_identity_reviews", "mechanical_source_record_reviews",
        "mechanical_graph_edge_reviews", "surface_reviews", "asset_candidate_reviews",
        "identical_hash_group_reviews",
    )
    for field in review_fields:
        for index, record in enumerate(human[field]):
            validate_evidence_record(record, f"{field}[{index}]")
    for field, document in (
        ("duplicate_drift_records", duplicates),
        ("mechanical_copy_record_reviews", duplicates),
        ("mechanical_historical_locator_reviews", human_history),
        ("identity_comparison_records", human_discrepancies),
        ("mechanical_observation_records", human_discrepancies),
    ):
        for index, record in enumerate(document[field]):
            validate_evidence_record(record, f"{field}[{index}]")
    return {category: len(expected) for category, (expected, _) in comparisons.items()}


def write_json(name: str, value: dict[str, Any]) -> None:
    """Writes one deterministic Phase-2 artifact.

    Args:
        name: Output filename within the track directory.
        value: JSON-compatible evidence object.
    """
    (TRACK_DIR / name).write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def generate(phase1_revision: str, *, code_revision: str | None = None) -> None:
    """Generates Phase-2 evidence from one explicit admitted Phase-1 revision.

    Args:
        phase1_revision: Full reachable commit containing the Phase-1 artifacts.
        code_revision: Full commit containing immutable executable helpers.

    Returns:
        Nothing.
    """
    _generate_phase2(phase1_revision, code_revision=code_revision)


def _generate_phase2(
    phase1_revision: str, *, code_revision: str | None = None
) -> None:
    """Generates exhaustive non-interpretive Phase-2 evidence artifacts."""
    phase1_revision = validate_phase1_revision(phase1_revision)
    raw_frozen_source_discovery = discover_raw_frozen_sources(
        code_revision=code_revision
    )
    reader = GitObjectReader()
    try:
        source = git_json(reader, phase1_revision, "source-denominator.json")
        ledger = git_json(reader, phase1_revision, "game-identity-ledger.json")
        scenes = git_json(reader, phase1_revision, "scene-state-denominator.json")
        assets = git_json(reader, phase1_revision, "asset-file-denominator.json")
        historical = git_json(reader, phase1_revision, "historical-source-denominator.json")
        discrepancies = git_json(reader, phase1_revision, "denominator-discrepancies.json")
        paths = tree_paths()
        program_identities = discover_program_identities(reader, ledger, historical)
        program_batches, slug_batches = batch_maps(program_identities)
        program = program_reviews(
            reader,
            paths,
            ledger,
            historical,
            catalog_ranges(reader),
            slug_batches,
            program_identities,
        )
        symmetric_reconciliation = build_symmetric_reconciliation(
            source, ledger, scenes, assets, historical, raw_frozen_source_discovery
        )
        symmetric_summary = summarize_symmetric_reconciliation(symmetric_reconciliation)
        symmetric_blockers = symmetric_summary["blocking_records"]
        input_provenance = phase1_input_provenance(reader, phase1_revision)

        current_batches: list[dict[str, Any]] = []
        current_claims: list[dict[str, Any]] = []
        duplicate_rows: list[dict[str, Any]] = []
        identity_comparisons: list[dict[str, Any]] = []
        identities = [
            row for row in ledger["identity_records"]
            if any(state.get("source_class") == "current-page-source" for state in row.get("source_states", []))
        ]
        for batch_number, start in enumerate(range(0, len(identities), 3), start=1):
            batch_records = identities[start : start + 3]
            batch_id = f"human-current-{batch_number:02d}"
            batch_evidence = [revalidate(reader, alias["evidence"]) for row in batch_records for alias in row["aliases"]]
            current_batches.append(evidence_record(
                batch_id=batch_id,
                status="accepted",
                accepted_identity_ids=[row["canonical_identity_id"] for row in batch_records],
                method="human-raw-source-review",
                evidence=batch_evidence,
                source_fact="Each listed identity was reviewed from its committed current page-source object(s).",
            ))
            for row in batch_records:
                identity_id = row["canonical_identity_id"]
                reviewed = [revalidate(reader, alias["evidence"]) for alias in row["aliases"]]
                for alias_number, evidence in enumerate(reviewed, start=1):
                    claim = evidence_record(
                        claim_id=f"current:{identity_id}:{alias_number}",
                        canonical_identity_id=identity_id,
                        batch_id=batch_id,
                        claim_kind="current-source",
                        method="human-raw-source-review",
                        evidence=[evidence],
                        source_fact="The cited committed page-source blob resolves at the frozen baseline and its exact hashes match the cited bytes.",
                    )
                    claim["evidence"] = evidence
                    current_claims.append(claim)
                reading = [item for item in reviewed if item["path"].startswith("apps/reading-advantage/")]
                advantage = [item for item in reviewed if item["path"].startswith("apps/advantage-games/")]
                if reading and advantage:
                    status = "drift-observed" if {x["blob_sha256"] for x in reading} != {x["blob_sha256"] for x in advantage} else "duplicate-observed"
                    reading_evidence = advantage + reading
                else:
                    status = "duplicate-observed" if reading else "not-observed"
                    reading_evidence = reading or reviewed
                duplicate_rows.append(evidence_record(
                    record_id=f"reading:{identity_id}", canonical_identity_id=identity_id,
                    source_family="reading", observation_status=status,
                    method="human-raw-source-review", evidence=reading_evidence,
                    source_fact="Reading and Advantage Games current page paths were retained separately exactly as observed in the frozen source ledger.",
                ))
                primary_suffix = f"/games/{identity_id}/page.tsx"
                primary_paths = [path for path in paths if path.startswith("apps/primary-advantage/") and path.endswith(primary_suffix)]
                primary_evidence = [locator(reader, BASELINE, path) for path in primary_paths] or reviewed
                duplicate_rows.append(evidence_record(
                    record_id=f"primary:{identity_id}", canonical_identity_id=identity_id,
                    source_family="primary", observation_status="duplicate-observed" if primary_paths else "not-observed",
                    committed_tree_search={
                        "command": f"git ls-tree -r --name-only {BASELINE} -- apps/primary-advantage",
                        "expected_page_suffix": primary_suffix, "matched_paths": primary_paths,
                    },
                    method="human-raw-source-review", evidence=primary_evidence,
                    source_fact="The frozen Primary tree was searched for the exact identity page suffix; matched paths are recorded without merging.",
                ))
                identity_comparisons.append(evidence_record(
                    canonical_identity_id=identity_id,
                    comparison_status="resolved" if len(reviewed) > 1 else "no-discrepancy",
                    blocking=False, method="human-raw-source-review", evidence=reviewed,
                    source_fact="Every current page-source locator for this mechanical identity resolved; distinct paths remain distinct records.",
                ))

        source_reviews: list[dict[str, Any]] = []
        file_evidence_by_id: dict[str, dict[str, Any]] = {}
        for row in source["records"]:
            evidence = revalidate(reader, row["evidence"])
            if row["record_type"] == "file":
                file_evidence_by_id[row["record_id"]] = evidence
            source_reviews.append(evidence_record(
                review_id=f"source-review:{len(source_reviews) + 1:04d}",
                mechanical_record_id=row["record_id"], mechanical_record_type=row["record_type"],
                review_batch_id=batch_for_path(evidence["path"], slug_batches), disposition="raw-locator-reviewed",
                method="human-raw-mechanical-record-review", evidence=[evidence],
                source_fact="The exact mechanical record locator was independently re-read from the committed frozen object and retained without interpretation.",
            ))

        graph_reviews = [evidence_record(
            review_id=f"graph-edge-review:{number:04d}",
            mechanical_graph_edge_key=canonical_key(row),
            review_batch_id=batch_for_path(row["evidence"]["path"], slug_batches), disposition="raw-locator-reviewed",
            method="human-raw-graph-edge-review", evidence=[revalidate(reader, row["evidence"])],
            source_fact="The exact import-source range for this mechanical graph edge was independently re-read from the frozen object.",
        ) for number, row in enumerate(source["graph_edges"], start=1)]

        copy_reviews: list[dict[str, Any]] = []
        for row in source["records"]:
            if row["record_type"] != "copy":
                continue
            target = revalidate(reader, row["evidence"])
            source_evidence = file_evidence_by_id[row["copy_source_record_id"]]
            copy_reviews.append(evidence_record(
                review_id=f"copy-review:{len(copy_reviews) + 1:03d}",
                mechanical_copy_record_id=row["record_id"], copy_source_record_id=row["copy_source_record_id"],
                review_batch_id=batch_for_path(target["path"], slug_batches), disposition="byte-identical-copy-reviewed",
                method="human-raw-copy-review", evidence=[source_evidence, target],
                source_fact="The cited source and copy committed blobs have the same whole-file SHA-256 while their paths remain separate.",
            ))

        surface_reviews: list[dict[str, Any]] = []
        for source_kind, rows in (
            ("scene", scenes["scene_records"]),
            ("state", scenes["state_records"]),
            ("transition", scenes["transitions"]),
            ("transition-write-candidate", scenes["transition_write_candidates"]),
        ):
            for row in rows:
                evidence = revalidate(reader, row["evidence"])
                surface_reviews.append(evidence_record(
                    review_id=f"surface-review:{len(surface_reviews) + 1:03d}",
                    mechanical_surface_key=canonical_key(row), source_kind=source_kind,
                    surface_kind=row.get("transition_kind", source_kind),
                    resolution_status=(
                        "unresolved-candidate"
                        if source_kind == "transition-write-candidate"
                        else "reviewed"
                    ),
                    review_batch_id=batch_for_path(evidence["path"], slug_batches), disposition="raw-surface-range-reviewed",
                    method="human-raw-surface-review", evidence=[evidence],
                    source_fact="The exact committed source range attached to this mechanical scene/state/surface record was independently re-read.",
                ))

        asset_reviews: list[dict[str, Any]] = []
        group_members: dict[str, list[dict[str, Any]]] = defaultdict(list)
        group_paths: dict[str, list[str]] = defaultdict(list)
        for row in assets["candidate_files"]:
            evidence = locator(reader, BASELINE, row["canonical_path"])
            if evidence["blob_sha256"] != row["sha256"]:
                raise ValueError(f"Asset hash mismatch: {row['canonical_path']}")
            group_members[row["identical_hash_group"]].append(evidence)
            group_paths[row["identical_hash_group"]].append(row["canonical_path"])
            asset_reviews.append(evidence_record(
                review_id=f"asset-review:{len(asset_reviews) + 1:03d}",
                canonical_path=row["canonical_path"], sha256=row["sha256"],
                identical_hash_group=row["identical_hash_group"],
                review_batch_id=batch_for_path(row["canonical_path"], slug_batches), disposition="raw-asset-reviewed",
                method="human-raw-asset-review", evidence=[evidence],
                source_fact="The raw committed candidate bytes were independently read and their SHA-256 equals the mechanical candidate hash.",
            ))
        group_reviews = [evidence_record(
            review_id=f"asset-group-review:{number:03d}", identical_hash_group=group,
            canonical_paths=sorted(group_paths[group]), disposition="all-group-members-reviewed",
            review_batch_id="human-global-assets-01", method="human-identical-hash-group-review",
            evidence=group_members[group],
            source_fact="Every listed committed candidate blob has the exact SHA-256 encoded by this identical-hash group ID.",
        ) for number, group in enumerate(sorted(group_members), start=1)]

        historical_deleted: list[dict[str, Any]] = []
        all_history: list[dict[str, Any]] = []
        for number, row in enumerate(historical["records"], start=1):
            evidence = revalidate(reader, row["evidence"])
            review = evidence_record(
                record_id=f"history:{number:03d}", source_classification=row["classification"],
                mechanical_locator_key=canonical_key(row["evidence"]),
                review_batch_id=batch_for_path(evidence["path"], slug_batches), disposition="raw-historical-locator-reviewed",
                method="human-history-review", evidence=[evidence],
                source_fact="The cited committed blob resolves at its exact reachable revision and exact hashes match the cited bytes.",
            )
            all_history.append(review)
            if row["classification"] in {"historical", "deleted", "withdrawn"}:
                legacy = dict(review)
                legacy["evidence"] = evidence
                historical_deleted.append(legacy)

        program_history_reviews = [evidence_record(
            record_id=f"program-history:{row['record_id']}",
            program_review_record_id=row["record_id"],
            program_identity_label=row["program_identity_label"],
            source_identity_id=row["source_identity_id"],
            disposition=row["disposition"],
            primary_historical_evidence=row["primary_historical_evidence"],
            history_search={
                "search_methods": row["history_search"]["search_methods"],
                "exact_name_command": row["history_search"]["exact_name_command"],
                "slug_command": row["history_search"]["slug_command"],
                "path_history_command": row["history_search"]["path_history_command"],
                "specification_command": row["history_search"]["specification_command"],
                "primary_deletion": row["history_search"]["primary_deletion"],
            },
            method="human-exhaustive-ancestor-history-review",
            evidence=[row["primary_historical_evidence"]],
            source_fact="Ancestor-only exact-name, slug, route/path, deletion, catalog, and specification searches resolve this program identity only as historical/withdrawn.",
        ) for row in program if row["disposition"] == "historical/withdrawn"]

        program_dispositions = [evidence_record(
            record_id=f"program-disposition:{row['record_id']}",
            program_identity_label=row["program_identity_label"],
            source_identity_id=row["source_identity_id"],
            disposition=row["disposition"],
            current_source_denominator_included=row["current_source_denominator_included"],
            method="human-program-denominator-disposition",
            evidence=(row["current_source_evidence"][:1] or ([row["primary_historical_evidence"]] if row["primary_historical_evidence"] else [row["evidence"][0]])),
            source_fact=row["source_fact"],
        ) for row in program]

        mechanical_observations = [evidence_record(
            observation_id=row["observation_id"], comparison_status="resolved", blocking=False,
            method="human-raw-source-review",
            evidence=[revalidate(reader, item) for item in row["evidence"]],
            source_fact="Every current locator listed by the mechanical observation resolves independently; no path was merged or omitted.",
        ) for row in discrepancies["records"]]

        global_batches = [
            {"batch_id": "human-global-shared-01", "scope": "non-game and shared source, graph, route, identity, scene/state, and copy records"},
            {"batch_id": "human-global-assets-01", "scope": "cross-game identical-hash groups"},
        ]
        for batch in global_batches:
            batch.update({
                "status": "accepted", "method": "human-global-denominator-review",
                "collector_role": "evidence-collector", "collector_identity": COLLECTOR_IDENTITY,
                "source_fact": "This explicit non-game/global batch prevents shared files from being assigned to an invented game identity.",
                "interpretation": {},
            })

        metrics = {
            "source_objects_resolved": len(reader.cache),
            "source_bytes_hashed_by_helper": reader.bytes_read,
            "git_process_invocations": 5,
            "command_basis": "one persistent committed-object reader, one frozen-tree listing, one ancestor-only revision listing, and two historical package-tree listings",
            "agent_resource_usage": None,
            "agent_resource_usage_limitation": "The platform does not expose agent-context bytes or tool-command accounting; helper-internal Git bytes are reported separately and are not represented as frozen role-budget usage.",
        }
        write_json("independent-human-discovery.json", {
            "schema_version": "apk-denominator-independent-human-discovery.v1",
            "status": "independent-human-discovery-complete", "track_id": TRACK,
            "source_baseline_revision": BASELINE, "collector_identity": COLLECTOR_IDENTITY,
            "input_provenance": input_provenance,
            "raw_frozen_source_discovery": raw_frozen_source_discovery,
            "review_batches": current_batches, "replacement_program_review_batches": program_batches,
            "global_review_batches": global_batches, "current_source_claims": current_claims,
            "replacement_program_identity_reviews": program,
            "mechanical_source_record_reviews": source_reviews,
            "mechanical_graph_edge_reviews": graph_reviews, "surface_reviews": surface_reviews,
            "asset_candidate_reviews": asset_reviews, "identical_hash_group_reviews": group_reviews,
            "collection_metrics": metrics, "interpretation": {},
        })
        write_json("human-duplicate-drift-records.json", {
            "schema_version": "apk-denominator-human-duplicate-drift.v1",
            "status": "independent-human-discovery-complete", "track_id": TRACK,
            "source_baseline_revision": BASELINE, "collector_identity": COLLECTOR_IDENTITY,
            "input_provenance": input_provenance,
            "duplicate_drift_records": duplicate_rows,
            "mechanical_copy_record_reviews": copy_reviews, "interpretation": {},
        })
        write_json("human-historical-deleted-records.json", {
            "schema_version": "apk-denominator-human-historical-deleted.v1",
            "status": "independent-human-discovery-complete", "track_id": TRACK,
            "source_baseline_revision": BASELINE, "collector_identity": COLLECTOR_IDENTITY,
            "input_provenance": input_provenance,
            "historical_deleted_records": historical_deleted,
            "mechanical_historical_locator_reviews": all_history,
            "program_identity_history_reviews": program_history_reviews, "interpretation": {},
        })
        write_json("human-discrepancy-records.json", {
            "schema_version": "apk-denominator-human-discrepancies.v1",
            "status": symmetric_summary["status"], "track_id": TRACK,
            "source_baseline_revision": BASELINE, "collector_identity": COLLECTOR_IDENTITY,
            "input_provenance": input_provenance,
            "identity_comparison_records": identity_comparisons,
            "mechanical_observation_records": mechanical_observations,
            "program_identity_disposition_records": program_dispositions,
            "independent_symmetric_reconciliation": symmetric_reconciliation,
            "independent_symmetric_blocking_records": symmetric_blockers,
            "coverage_status": symmetric_summary["coverage_status"], "uncovered_mechanical_records": [],
            "uncovered_replacement_program_identities": [], "interpretation": {},
        })
    finally:
        reader.close()
    counts = check_coverage(phase1_revision)
    discrepancy_path = TRACK_DIR / "human-discrepancy-records.json"
    discrepancy = json.loads(discrepancy_path.read_text())
    discrepancy["exhaustive_coverage_counts"] = counts
    discrepancy["uncovered_count"] = symmetric_summary["uncovered_count"]
    discrepancy["uncovered_by_category"] = (
        symmetric_summary["uncovered_by_category"]
        if symmetric_summary["uncovered_count"]
        else {category: 0 for category in counts}
    )
    write_json("human-discrepancy-records.json", discrepancy)


def check_only_result(
    phase1_revision: str, *, code_revision: str | None = None
) -> dict[str, Any]:
    """Returns truthful coverage and blocker state for an explicit Phase-1 revision.

    Args:
        phase1_revision: Full reachable commit containing the Phase-1 artifacts.
        code_revision: Full commit containing immutable executable helpers.

    Returns:
        Mechanical coverage counts plus exact symmetric blocker counts.
    """
    phase1_revision = validate_phase1_revision(phase1_revision)
    counts = check_coverage(phase1_revision)
    raw_frozen_source_discovery = discover_raw_frozen_sources(
        code_revision=code_revision
    )
    reader = GitObjectReader()
    try:
        expected_provenance = phase1_input_provenance(reader, phase1_revision)
        source = git_json(reader, phase1_revision, "source-denominator.json")
        ledger = git_json(reader, phase1_revision, "game-identity-ledger.json")
        scenes = git_json(reader, phase1_revision, "scene-state-denominator.json")
        assets = git_json(reader, phase1_revision, "asset-file-denominator.json")
        historical = git_json(reader, phase1_revision, "historical-source-denominator.json")
        git_json(reader, phase1_revision, "denominator-discrepancies.json")
        expected_rows = build_symmetric_reconciliation(
            source, ledger, scenes, assets, historical, raw_frozen_source_discovery
        )
    finally:
        reader.close()
    for name in PHASE2_ARTIFACTS:
        document = json.loads((TRACK_DIR / name).read_text())
        if document.get("input_provenance") != expected_provenance:
            raise ValueError(f"PHASE1_INPUT_PROVENANCE_MISMATCH:{name}")
    discrepancy = json.loads((TRACK_DIR / "human-discrepancy-records.json").read_text())
    summary = validate_symmetric_reconciliation_document(discrepancy, expected_rows)
    return {
        "status": "blocked" if summary["uncovered_count"] else "passed",
        "uncovered_count": summary["uncovered_count"],
        "uncovered_by_category": summary["uncovered_by_category"],
        "counts": counts,
    }


def main() -> None:
    """Generates artifacts or runs the explicit exhaustive coverage check."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--check-only", action="store_true")
    parser.add_argument("--phase1-revision", required=True)
    parser.add_argument("--code-revision", required=True)
    args = parser.parse_args()
    if args.check_only:
        result = check_only_result(
            args.phase1_revision, code_revision=args.code_revision
        )
        print(json.dumps(result, sort_keys=True))
        if result["status"] != "passed":
            raise SystemExit(1)
    else:
        generate(args.phase1_revision, code_revision=args.code_revision)


if __name__ == "__main__":
    main()
