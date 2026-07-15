"""Generates Phase-1 denominator artifacts from frozen Git objects only.

The generator deliberately never reads a discovered source file from the working tree.
It asks Git for the frozen revision's tree and blobs, so rerunning it is deterministic
for that revision even when other agents have dirty work in the checkout.
"""

from __future__ import annotations

import hashlib
import json
import mimetypes
import re
import struct
import subprocess
from collections import defaultdict
from pathlib import Path, PurePosixPath
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = Path(__file__).resolve().parent
BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
QUARANTINE_PATH = "measure/tracks/apk_cross_game_asset_ontology_20260712"
SOURCE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".json"}
MEDIA_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".webm"}
AUDIO_SUFFIXES = {".mp3", ".wav", ".ogg", ".m4a"}
DATA_SUFFIXES = {".json", ".csv", ".txt", ".xml", ".yaml", ".yml"}
PUBLIC_GAME_ROOTS = (
    "apps/advantage-games/public",
    "apps/reading-advantage/public/games",
    "apps/primary-advantage/public/games",
)
STATE_NAME = re.compile(
    r"(?:state|status|phase|mode|scene|screen|overlay|wave|floor|turn|pose|step)",
    re.IGNORECASE,
)
STATE_DECLARATION = re.compile(
    r"(?:const|let)\s*\[\s*(\w+)\s*,\s*(set\w+)\s*\]\s*=\s*(?:React\.)?useState\s*<([^>]+)>",
    re.DOTALL,
)
STRING_LITERAL = re.compile(r"['\"]([^'\"\n]+)['\"]")
IMPORT = re.compile(r"^\s*import(?:[\s\S]*?from\s*)?['\"]([^'\"]+)['\"]", re.MULTILINE)
COMPONENT = re.compile(r"(?:export\s+)?(?:function|const)\s+([A-Z][A-Za-z0-9]*(?:Game|Screen|Scene))\b")
REQUIRED_SOURCE_PATHS = {
    "measure/apk-asset-system-program.md",
    "measure/apk-evidence-reconstruction-program.md",
    "packages/game-cartridges/src/catalog.test.ts",
    "packages/game-cartridges/src/catalog.ts",
    "packages/game-cartridges/src/index.ts",
}
CATALOG_PATH = "apps/advantage-games/src/lib/gameCards.ts"


def run_git(*arguments: str) -> bytes:
    """Runs one read-only Git command rooted at the repository.

    Args:
        arguments: Arguments following the Git executable.

    Returns:
        Standard output bytes from Git.

    Raises:
        RuntimeError: If Git cannot resolve the requested committed object.
    """
    result = subprocess.run(
        ["git", *arguments], cwd=REPO_ROOT, capture_output=True, check=False
    )
    if result.returncode:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace").strip())
    return result.stdout


def baseline_paths() -> list[str]:
    """Lists all frozen source-scope paths from the baseline Git tree.

    Returns:
        Sorted repository-relative file paths committed at the frozen baseline.
    """
    roots = ["apps/advantage-games", "apps/reading-advantage", "apps/primary-advantage", "packages", "measure"]
    output = run_git("ls-tree", "-r", "--name-only", BASELINE, "--", *roots)
    return sorted(path for path in output.decode().splitlines() if path)


def blob(path: str, revision: str = BASELINE) -> bytes:
    """Reads one source blob from Git instead of the working tree.

    Args:
        path: Repository-relative path for the committed blob.
        revision: Reachable revision containing the path.

    Returns:
        Exact bytes committed for the locator.
    """
    return run_git("show", f"{revision}:{path}")


def line_locator(path: str, start_line: int, end_line: int, revision: str = BASELINE) -> dict[str, Any]:
    """Builds a hash-verified inclusive line locator for one committed blob.

    Args:
        path: Repository-relative source path.
        start_line: One-indexed first line of the evidence range.
        end_line: One-indexed final line of the evidence range.
        revision: Revision that contains the evidence.

    Returns:
        Locator containing revision, blob hash, and inclusive range hash.
    """
    value = blob(path, revision)
    lines = value.splitlines(keepends=True)
    if not lines:
        lines = [b""]
    start = max(1, min(start_line, len(lines)))
    end = max(start, min(end_line, len(lines)))
    return {
        "revision": revision,
        "path": path,
        "blob_sha256": hashlib.sha256(value).hexdigest(),
        "range": {
            "start_line": start,
            "end_line": end,
            "sha256": hashlib.sha256(b"".join(lines[start - 1 : end])).hexdigest(),
        },
    }


def full_locator(path: str, revision: str = BASELINE) -> dict[str, Any]:
    """Builds a locator spanning an entire committed file.

    Args:
        path: Repository-relative source path.
        revision: Revision that contains the source path.

    Returns:
        Hash-verified locator covering all committed file lines.
    """
    line_count = max(1, len(blob(path, revision).splitlines(keepends=True)))
    return line_locator(path, 1, line_count, revision)


def source_path(path: str) -> bool:
    """Reports whether a committed path belongs to the mechanical game-source corpus.

    Args:
        path: Repository-relative baseline path.

    Returns:
        Whether the path is an eligible source, test, route, component, or data file.
    """
    if path.startswith(f"{QUARANTINE_PATH}/"):
        return False
    if path in REQUIRED_SOURCE_PATHS:
        return True
    suffix = PurePosixPath(path).suffix.lower()
    if suffix not in SOURCE_SUFFIXES:
        return False
    if path.startswith("apps/advantage-games/src/"):
        return True
    app_roots = ("apps/reading-advantage/", "apps/primary-advantage/")
    return path.startswith(app_roots) and (
        "/games/" in path
        or "/api/v1/games/" in path
        or "/lib/game" in path
    )


def page_identity(path: str) -> tuple[str, str] | None:
    """Extracts a category/slug identity from a committed game page path.

    Args:
        path: Repository-relative baseline path.

    Returns:
        The canonical identity and route, or None when the path is not a game page.
    """
    match = re.search(r"/games/(sentence|vocabulary)/([^/]+)/page\.tsx$", path)
    if not match:
        return None
    category, slug = match.groups()
    route_parts: list[str] = []
    for part in path.split("/src/app/", 1)[-1].split("/")[:-1]:
        if part.startswith("(") or part == "[locale]":
            continue
        route_parts.append(part)
    return f"{category}/{slug}", "/" + "/".join(route_parts)


def source_line_number(value: str, character_offset: int) -> int:
    """Converts a Python string offset to a one-indexed source line number.

    Args:
        value: Decoded committed source text.
        character_offset: Character offset from the beginning of the source.

    Returns:
        One-indexed line number containing the offset.
    """
    return value.count("\n", 0, character_offset) + 1


def resolve_import(path: str, specifier: str, sources: set[str]) -> tuple[str, str] | None:
    """Resolves a relative or application-alias import to a recorded source file.

    Args:
        path: Importing repository-relative file path.
        specifier: Literal import specifier from committed source text.
        sources: Eligible source paths in the frozen tree.

    Returns:
        The resolved path and resolution kind, or None for external/unresolved imports.
    """
    if specifier.startswith("."):
        base = PurePosixPath(path).parent.joinpath(specifier)
        resolution_kind = "relative"
    elif specifier.startswith("@/"):
        if path.startswith("apps/advantage-games/"):
            base = PurePosixPath("apps/advantage-games/src") / specifier[2:]
        elif path.startswith("apps/reading-advantage/"):
            base = PurePosixPath("apps/reading-advantage") / specifier[2:]
        elif path.startswith("apps/primary-advantage/"):
            base = PurePosixPath("apps/primary-advantage") / specifier[2:]
        else:
            return None
        resolution_kind = "application-alias"
    else:
        return None
    candidates = [str(base)]
    candidates.extend(f"{base}{suffix}" for suffix in (".ts", ".tsx", ".js", ".jsx", ".json"))
    candidates.extend(str(base / f"index{suffix}") for suffix in (".ts", ".tsx", ".js", ".jsx"))
    target = next((candidate for candidate in candidates if candidate in sources), None)
    return (target, resolution_kind) if target is not None else None


def build_source_denominator(paths: list[str]) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    """Builds mechanically pinned source, route, copy, and import-graph records.

    Args:
        paths: All frozen source-scope paths.

    Returns:
        Source denominator plus page observations grouped by canonical identity.
    """
    sources = [path for path in paths if source_path(path)]
    source_set = set(sources)
    records: list[dict[str, Any]] = []
    file_ids: dict[str, str] = {}
    pages: dict[str, list[dict[str, Any]]] = defaultdict(list)
    digest_paths: dict[str, list[str]] = defaultdict(list)
    for path in sources:
        record_id = f"file:{path}"
        file_ids[path] = record_id
        data = blob(path)
        digest_paths[hashlib.sha256(data).hexdigest()].append(path)
        records.append({
            "record_id": record_id,
            "record_type": "file",
            "file_path": path,
            "discovery_method": "mechanical-filesystem",
            "evidence": full_locator(path),
        })
        identity = page_identity(path)
        if identity:
            canonical_id, route = identity
            pages[canonical_id].append({"path": path, "route": route})

    for canonical_id, observations in sorted(pages.items()):
        first = observations[0]
        records.append({
            "record_id": f"identity:{canonical_id}",
            "record_type": "identity",
            "canonical_identity_id": canonical_id,
            "discovery_method": "mechanical-filesystem",
            "evidence": full_locator(first["path"]),
        })
        for observation in observations:
            records.append({
                "record_id": f"route:{observation['path']}",
                "record_type": "route",
                "route": observation["route"],
                "discovery_method": "mechanical-filesystem",
                "evidence": full_locator(observation["path"]),
            })

    copy_count = 0
    for digest, same_bytes_paths in sorted(digest_paths.items()):
        if len(same_bytes_paths) < 2:
            continue
        origin = same_bytes_paths[0]
        for copied_path in same_bytes_paths[1:]:
            copy_count += 1
            records.append({
                "record_id": f"copy:{copied_path}",
                "record_type": "copy",
                "copy_source_record_id": file_ids[origin],
                "discovery_method": "mechanical-filesystem",
                "evidence": full_locator(copied_path),
            })
    if not copy_count:
        raise RuntimeError("No identical committed source blobs were found for the required copy record class")

    graph_edges: list[dict[str, Any]] = []
    for path in sources:
        text = blob(path).decode("utf-8", errors="replace")
        for import_number, match in enumerate(IMPORT.finditer(text), start=1):
            resolved = resolve_import(path, match.group(1), source_set)
            if resolved is None:
                continue
            target, resolution_kind = resolved
            line = source_line_number(text, match.start())
            record_id = f"graph:{path}:{line}:{import_number}"
            evidence = line_locator(path, line, line)
            records.append({
                "record_id": record_id,
                "record_type": "graph",
                "graph_node_id": f"{path}:{line}",
                "import_specifier": match.group(1),
                "resolution_kind": resolution_kind,
                "discovery_method": "mechanical-graph",
                "evidence": evidence,
            })
            graph_edges.append({
                "from_record_id": file_ids[path],
                "to_record_id": file_ids[target],
                "evidence": evidence,
            })
    identity_ids = sorted(pages)
    batches = [
        {
            "batch_number": index // 3 + 1,
            "canonical_identity_ids": identity_ids[index : index + 3],
            "locator_resolution": "passed",
        }
        for index in range(0, len(identity_ids), 3)
    ]
    return ({
        "schema_version": "apk-source-denominator.v1",
        "status": "mechanical-discovery-complete",
        "source_baseline_revision": BASELINE,
        "discovery_method": "git-ls-tree plus committed-blob filesystem and literal-import traversal",
        "records": records,
        "graph_edges": graph_edges,
        "mechanical_batches": batches,
        "quarantine_fixtures": [{
            "fixture_id": "failed-track-prefix-rejection",
            "quarantined_path": f"{QUARANTINE_PATH}/generated-ontology.json",
            "expected_result": "rejected",
            "rejection_code": "QUARANTINED_FACTUAL_SOURCE",
            "fixture_sha256": hashlib.sha256(
                f"{QUARANTINE_PATH}/generated-ontology.json\0QUARANTINED_FACTUAL_SOURCE".encode()
            ).hexdigest(),
        }],
    }, pages)


def catalog_withdrawals() -> dict[str, dict[str, Any]]:
    """Returns catalog IDs explicitly withdrawn at the frozen revision.

    Returns:
        Withdrawn card IDs mapped to exact catalog locators.
    """
    text = blob(CATALOG_PATH).decode("utf-8", errors="replace")
    block = re.search(r"const\s+withdrawnApkGameIds\s*=\s*new\s+Set\(\[([\s\S]*?)\]\);", text)
    if block is None:
        raise RuntimeError("Frozen catalog has no withdrawnApkGameIds registration set")
    result: dict[str, dict[str, Any]] = {}
    for literal in STRING_LITERAL.finditer(block.group(1)):
        offset = block.start(1) + literal.start()
        line = source_line_number(text, offset)
        result[literal.group(1)] = line_locator(CATALOG_PATH, line, line)
    return result


def catalog_identities() -> dict[str, dict[str, Any]]:
    """Returns every exact ID declared in the frozen game-card catalog.

    Returns:
        Catalog card IDs mapped to their exact declaration locators.
    """
    text = blob(CATALOG_PATH).decode("utf-8", errors="replace")
    block = re.search(r"const\s+catalogCards\s*:[^=]+=\s*\[([\s\S]*?)\n\]", text)
    if block is None:
        raise RuntimeError("Frozen catalog has no catalogCards array")
    result: dict[str, dict[str, Any]] = {}
    for match in re.finditer(r"^\s*id:\s*['\"]([^'\"]+)['\"]", block.group(1), re.MULTILINE):
        offset = block.start(1) + match.start()
        line = source_line_number(text, offset)
        result[match.group(1)] = line_locator(CATALOG_PATH, line, line)
    if not result:
        raise RuntimeError("Frozen catalog has no exact game-card IDs")
    return result


def build_identity_ledger(pages: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """Builds a ledger from frozen page paths and the complete exact catalog.

    Args:
        pages: Page-path observations grouped by canonical identity.

    Returns:
        The identity ledger artifact object.
    """
    records = []
    withdrawals = catalog_withdrawals()
    catalog = catalog_identities()
    pages_by_slug = {canonical_id.split("/", 1)[1]: canonical_id for canonical_id in pages}
    for canonical_id, observations in sorted(pages.items()):
        slug = canonical_id.split("/", 1)[1]
        source_states = [{
            "source_class": "current-page-source",
            "evidence": full_locator(observations[0]["path"]),
        }]
        if slug in withdrawals:
            source_states.append({
                "source_class": "catalog-withdrawn-registration",
                "evidence": withdrawals[slug],
            })
        records.append({
            "canonical_identity_id": canonical_id,
            "catalog_identity_id": slug if slug in catalog else None,
            "catalog_evidence": catalog.get(slug),
            "aliases": [
                {"alias": observation["path"], "evidence": full_locator(observation["path"])}
                for observation in observations
            ],
            "routes": [
                {"route": observation["route"], "evidence": full_locator(observation["path"])}
                for observation in observations
            ],
            "discovery_method": "mechanical-filesystem",
            "source_states": source_states,
        })
    for slug in sorted(set(catalog) - set(pages_by_slug)):
        if slug not in withdrawals:
            raise RuntimeError(f"Catalog identity has neither a current page nor withdrawal evidence: {slug}")
        records.append({
            "canonical_identity_id": f"catalog/{slug}",
            "catalog_identity_id": slug,
            "catalog_evidence": catalog[slug],
            "aliases": [{"alias": slug, "evidence": catalog[slug]}],
            "routes": [],
            "discovery_method": "mechanical-catalog-enumeration",
            "source_states": [{
                "source_class": "catalog-withdrawn-registration",
                "evidence": withdrawals[slug],
            }],
        })
    records.sort(key=lambda record: record["canonical_identity_id"])
    return {
        "schema_version": "apk-game-identity-ledger.v1",
        "status": "mechanical-discovery-complete",
        "source_baseline_revision": BASELINE,
        "identity_records": records,
    }


def build_scene_state_denominator(paths: list[str]) -> dict[str, Any]:
    """Extracts explicit state domains and source-backed transitions from source.

    Args:
        paths: All frozen source-scope paths.

    Returns:
        Scene/presentation symbols, literal states, and direct source-local transitions.
    """
    game_sources = [path for path in paths if source_path(path) and PurePosixPath(path).suffix in {".ts", ".tsx", ".js", ".jsx"}]
    scene_records: list[dict[str, Any]] = []
    state_records: list[dict[str, Any]] = []
    transitions: list[dict[str, Any]] = []
    for path in game_sources:
        text = blob(path).decode("utf-8", errors="replace")
        for match in COMPONENT.finditer(text):
            scene_id = match.group(1)
            line = source_line_number(text, match.start(1))
            scene_records.append({
                "scene_occurrence_id": f"{path}:{line}:{scene_id}",
                "scene_id": scene_id,
                "source_symbol_kind": "component-declaration",
                "discovery_method": "mechanical-syntax-traversal",
                "evidence": line_locator(path, line, line),
            })
        state_occurrences: dict[tuple[str, str], str] = {}
        state_record_keys: set[tuple[str, int, str, str]] = set()

        def add_state(symbol: str, literal: str, line: int, kind: str) -> str:
            """Adds one path-scoped literal-domain occurrence if it is new."""
            occurrence_id = f"{path}:{line}:{symbol}:{literal}"
            key = (path, line, symbol, literal)
            if key not in state_record_keys:
                state_record_keys.add(key)
                state_records.append({
                    "state_occurrence_id": occurrence_id,
                    "state_id": literal,
                    "source_symbol": symbol,
                    "source_symbol_kind": kind,
                    "discovery_method": "mechanical-syntax-traversal",
                    "evidence": line_locator(path, line, line),
                })
            state_occurrences[(symbol, literal)] = occurrence_id
            return occurrence_id

        alias_domains: dict[str, tuple[set[str], int]] = {}
        alias_pattern = re.compile(
            r"(?:export\s+)?type\s+(\w+)\s*=\s*([\s\S]*?)(?=\n\s*(?:export\s+)?(?:type|interface|const|function|class)\b|\Z)"
        )
        for alias in alias_pattern.finditer(text):
            alias_name, alias_body = alias.groups()
            if not STATE_NAME.search(alias_name):
                continue
            residue = re.sub(r"[|;\s]", "", STRING_LITERAL.sub("", alias_body))
            if residue:
                continue
            literals = {literal.group(1) for literal in STRING_LITERAL.finditer(alias_body)}
            if not literals:
                continue
            line = source_line_number(text, alias.start())
            alias_domains[alias_name] = (literals, line)
            for literal_match in STRING_LITERAL.finditer(alias_body):
                literal_line = source_line_number(text, alias.start(2) + literal_match.start())
                add_state(alias_name, literal_match.group(1), literal_line, "literal-union-type-alias")

        property_domains: dict[str, tuple[str, set[str], int]] = {}
        interface_pattern = re.compile(r"(?:export\s+)?interface\s+(\w+)\s*\{([\s\S]*?)\n\}")
        for interface in interface_pattern.finditer(text):
            interface_name, body = interface.groups()
            body_offset = interface.start(2)
            for prop in re.finditer(r"^\s*(\w+)\??:\s*([^\n]+)", body, re.MULTILINE):
                property_name, type_text = prop.groups()
                line = source_line_number(text, body_offset + prop.start(1))
                alias_name = next((name for name in alias_domains if re.search(rf"\b{re.escape(name)}\b", type_text)), None)
                if alias_name is not None:
                    literals, alias_line = alias_domains[alias_name]
                    previous = property_domains.get(property_name)
                    property_domains[property_name] = (
                        (alias_name, literals, alias_line)
                        if previous is None or previous[0] == alias_name
                        else ("", set(), 0)
                    )
                    continue
                if not STATE_NAME.search(property_name):
                    continue
                literals = {literal.group(1) for literal in STRING_LITERAL.finditer(type_text)}
                if not literals:
                    continue
                symbol = f"{interface_name}.{property_name}"
                previous = property_domains.get(property_name)
                property_domains[property_name] = (
                    (symbol, literals, line)
                    if previous is None or previous[0] == symbol
                    else ("", set(), 0)
                )
                for literal in sorted(literals):
                    add_state(symbol, literal, line, "interface-literal-property")

        declarations: dict[str, tuple[str, set[str], str | None, int, int]] = {}
        for declaration in STATE_DECLARATION.finditer(text):
            state_name, setter_name, type_text = declaration.groups()
            if not STATE_NAME.search(state_name):
                continue
            literals = {literal.group(1) for literal in STRING_LITERAL.finditer(type_text)}
            if not literals:
                continue
            line = source_line_number(text, declaration.start())
            init_match = re.match(
                r"\s*\(\s*([\"'])([^\"']+)\1",
                text[declaration.end() :],
            )
            initial_value = init_match.group(2) if init_match is not None else None
            if initial_value is not None and initial_value not in literals:
                raise RuntimeError(
                    f"Typed state initializer is outside its literal union at {path}:{line}:{state_name}"
                )
            declarations[setter_name] = (state_name, literals, initial_value, declaration.start(), line)
            for literal in sorted(literals):
                add_state(state_name, literal, line, "typed-useState-declaration")
        for setter_name, (state_name, literals, initial_value, declaration_offset, declaration_line) in declarations.items():
            guard = re.compile(
                rf"if\s*\([^)]*\b{re.escape(state_name)}\s*===?\s*['\"]([^'\"]+)['\"][^)]*\)\s*\{{?[^{{}}]{{0,500}}?\b{re.escape(setter_name)}\s*\(\s*['\"]([^'\"]+)['\"]",
                re.MULTILINE,
            )
            guarded_from_states: set[str] = set()
            for match in guard.finditer(text):
                from_state, to_state = match.groups()
                if from_state not in literals or to_state not in literals:
                    continue
                guarded_from_states.add(from_state)
                line = source_line_number(text, match.start())
                transitions.append({
                    "from_state_occurrence_id": f"{path}:{declaration_line}:{state_name}:{from_state}",
                    "to_state_occurrence_id": f"{path}:{declaration_line}:{state_name}:{to_state}",
                    "from_state_id": from_state,
                    "to_state_id": to_state,
                    "source_symbol": state_name,
                    "transition_kind": "phase",
                    "transition_evidence_kind": "explicit-state-guarded-setter",
                    "discovery_method": "mechanical-syntax-traversal",
                    "evidence": line_locator(path, line, source_line_number(text, match.end())),
                })
            if not guarded_from_states and initial_value is not None:
                setter = re.compile(rf"\b{re.escape(setter_name)}\s*\(\s*['\"]([^'\"]+)['\"]")
                for match in setter.finditer(text, declaration_offset):
                    to_state = match.group(1)
                    if to_state not in literals or to_state == initial_value:
                        continue
                    line = source_line_number(text, match.start())
                    transitions.append({
                        "from_state_occurrence_id": f"{path}:{declaration_line}:{state_name}:{initial_value}",
                        "to_state_occurrence_id": f"{path}:{declaration_line}:{state_name}:{to_state}",
                        "from_state_id": initial_value,
                        "to_state_id": to_state,
                        "source_symbol": state_name,
                        "transition_kind": "phase",
                        "transition_evidence_kind": "useState-initial-to-setter-call",
                        "discovery_method": "mechanical-syntax-traversal",
                        "evidence": line_locator(path, line, source_line_number(text, match.end())),
                    })
                    break

        create_match = re.search(r"\bcreate\s*<\s*(\w+)\s*>\s*\(\s*\([^)]*\)\s*=>\s*\(\{", text)
        if create_match is not None:
            store_start = create_match.end()

            def add_runtime_transition(
                property_name: str,
                from_state: str,
                to_state: str,
                start: int,
                end: int,
                evidence_kind: str,
            ) -> None:
                """Adds one exact runtime-store transition backed by a literal domain."""
                domain = property_domains.get(property_name)
                if domain is None:
                    return
                symbol, literals, declaration_line = domain
                if not symbol:
                    return
                if from_state not in literals or to_state not in literals or from_state == to_state:
                    return
                from_occurrence = state_occurrences.get((symbol, from_state))
                to_occurrence = state_occurrences.get((symbol, to_state))
                if from_occurrence is None:
                    from_occurrence = add_state(symbol, from_state, declaration_line, "literal-union-type-alias")
                if to_occurrence is None:
                    to_occurrence = add_state(symbol, to_state, declaration_line, "literal-union-type-alias")
                transitions.append({
                    "from_state_occurrence_id": from_occurrence,
                    "to_state_occurrence_id": to_occurrence,
                    "from_state_id": from_state,
                    "to_state_id": to_state,
                    "source_symbol": property_name,
                    "transition_kind": "phase",
                    "transition_evidence_kind": evidence_kind,
                    "discovery_method": "mechanical-syntax-traversal",
                    "evidence": line_locator(
                        path,
                        source_line_number(text, start),
                        source_line_number(text, end),
                    ),
                })

            for property_name, (_symbol, literals, _line) in property_domains.items():
                write_pattern = re.compile(rf"\b{re.escape(property_name)}\s*:\s*['\"]([^'\"]+)['\"]")
                writes = [match for match in write_pattern.finditer(text, store_start) if match.group(1) in literals]
                if not writes:
                    continue
                initializer = writes[0]
                first_change = next((match for match in writes[1:] if match.group(1) != initializer.group(1)), None)
                if first_change is not None:
                    add_runtime_transition(
                        property_name,
                        initializer.group(1),
                        first_change.group(1),
                        initializer.start(),
                        first_change.end(),
                        "runtime-store-initial-to-first-write",
                    )

                guarded = re.compile(
                    rf"if\s*\([^)]*(?:state\.)?{re.escape(property_name)}\s*!==?\s*['\"]([^'\"]+)['\"][^)]*\)\s*return\s*\{{\}}([\s\S]{{0,350}}?)\b{re.escape(property_name)}\s*:\s*['\"]([^'\"]+)['\"]"
                )
                for match in guarded.finditer(text, store_start):
                    add_runtime_transition(
                        property_name,
                        match.group(1),
                        match.group(3),
                        match.start(),
                        match.end(),
                        "runtime-store-guarded-write",
                    )

                guard_then_set = re.compile(
                    rf"if\s*\([^)]*\b{re.escape(property_name)}\s*!==?\s*['\"]([^'\"]+)['\"][^)]*\)\s*return([\s\S]{{0,350}}?)\b{re.escape(property_name)}\s*:\s*['\"]([^'\"]+)['\"]"
                )
                for match in guard_then_set.finditer(text, store_start):
                    add_runtime_transition(
                        property_name,
                        match.group(1),
                        match.group(3),
                        match.start(),
                        match.end(),
                        "runtime-store-guarded-write",
                    )

                ternary = re.compile(
                    rf"state\.{re.escape(property_name)}\s*===?\s*['\"]([^'\"]+)['\"][^?\n]*\?\s*['\"]([^'\"]+)['\"]\s*:\s*state\.{re.escape(property_name)}"
                )
                for match in ternary.finditer(text, store_start):
                    add_runtime_transition(
                        property_name,
                        match.group(1),
                        match.group(2),
                        match.start(),
                        match.end(),
                        "runtime-store-conditional-write",
                    )
    unique_transitions = {
        (record["from_state_occurrence_id"], record["to_state_occurrence_id"], record["evidence"]["range"]["start_line"]): record
        for record in transitions
    }
    if not scene_records or not state_records or not unique_transitions:
        raise RuntimeError("Committed source did not yield required component, state, and guarded transition records")
    return {
        "schema_version": "apk-scene-state-denominator.v1",
        "status": "mechanical-discovery-complete",
        "source_baseline_revision": BASELINE,
        "scene_records": scene_records,
        "state_records": state_records,
        "transitions": sorted(
            unique_transitions.values(),
            key=lambda record: (
                record["evidence"]["path"],
                record["evidence"]["range"]["start_line"],
                record["from_state_occurrence_id"],
                record["to_state_occurrence_id"],
            ),
        ),
    }


def format_metadata(path: str, value: bytes) -> dict[str, Any]:
    """Returns non-interpretive file format metadata derived from committed bytes.

    Args:
        path: Repository-relative candidate path.
        value: Exact committed candidate bytes.

    Returns:
        Basic format, MIME type, byte size, and PNG dimensions when encoded.
    """
    suffix = PurePosixPath(path).suffix.lower().lstrip(".") or "none"
    mime_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    result: dict[str, Any] = {"format": suffix, "mime_type": mime_type, "byte_size": len(value)}
    if value.startswith(b"\x89PNG\r\n\x1a\n") and len(value) >= 24:
        result["width"] = struct.unpack(">I", value[16:20])[0]
        result["height"] = struct.unpack(">I", value[20:24])[0]
    return result


def candidate_asset_path(path: str) -> bool:
    """Reports whether a path is a static candidate or game-associated data file.

    Args:
        path: Repository-relative baseline path.

    Returns:
        Whether the committed path belongs in the mechanical candidate enumeration.
    """
    if path.startswith(f"{QUARANTINE_PATH}/"):
        return False
    suffix = PurePosixPath(path).suffix.lower()
    return (
        (path.startswith(PUBLIC_GAME_ROOTS) and suffix in MEDIA_SUFFIXES | AUDIO_SUFFIXES | DATA_SUFFIXES)
        or (source_path(path) and suffix in DATA_SUFFIXES)
    )


def build_asset_denominator(paths: list[str]) -> dict[str, Any]:
    """Builds a hash-complete static asset, audio, and data enumeration.

    Args:
        paths: All frozen source-scope paths.

    Returns:
        Candidate file records and identical-byte hash groups.
    """
    candidates = []
    for path in (path for path in paths if candidate_asset_path(path)):
        value = blob(path)
        suffix = PurePosixPath(path).suffix.lower()
        file_kind = "audio" if suffix in AUDIO_SUFFIXES else "data" if suffix in DATA_SUFFIXES else "asset"
        digest = hashlib.sha256(value).hexdigest()
        candidates.append({
            "canonical_path": path,
            "revision": BASELINE,
            "sha256": digest,
            "file_kind": file_kind,
            "format_metadata": format_metadata(path, value),
            "identical_hash_group": f"sha256:{digest}",
            "provenance": {"enumerated_from": "git-ls-tree", "source_baseline_revision": BASELINE},
        })
    return {
        "schema_version": "apk-asset-file-denominator.v1",
        "status": "mechanical-discovery-complete",
        "source_baseline_revision": BASELINE,
        "enumeration": {
            "method": "mechanical-filesystem-and-hash",
            "roots": list(PUBLIC_GAME_ROOTS),
            "candidate_count": len(candidates),
        },
        "candidate_files": candidates,
    }


def historical_deletions() -> Iterable[tuple[str, str]]:
    """Yields deleted game-corps paths with their parent revisions when resolvable.

    Returns:
        Pairs of parent revision and deleted path, limited to the frozen source corpus.
    """
    output = run_git(
        "log", "--format=%H", "--name-only", "--diff-filter=D", BASELINE, "--",
        "apps/advantage-games", "apps/reading-advantage", "apps/primary-advantage",
    ).decode("utf-8", errors="replace")
    revision: str | None = None
    seen: set[tuple[str, str]] = set()
    for line in output.splitlines():
        if re.fullmatch(r"[0-9a-f]{40}", line):
            revision = line
            continue
        if not revision or not line or not (source_path(line) or candidate_asset_path(line)):
            continue
        parent = run_git("rev-parse", f"{revision}^").decode().strip()
        try:
            blob(line, parent)
        except RuntimeError:
            continue
        pair = (parent, line)
        if pair not in seen:
            seen.add(pair)
            yield pair


def build_historical_denominator(pages: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """Builds current page and reachable deleted-path historical locators.

    Args:
        pages: Current game page observations grouped by canonical identity.

    Returns:
        Historical source locator records bounded by the frozen revision ancestry.
    """
    records = []
    for observations in pages.values():
        for observation in observations:
            records.append({"classification": "current", "evidence": full_locator(observation["path"])})
    for revision, path in historical_deletions():
        records.append({"classification": "deleted", "evidence": full_locator(path, revision)})
    return {
        "schema_version": "apk-historical-source-denominator.v1",
        "status": "mechanical-discovery-complete",
        "source_baseline_revision": BASELINE,
        "history_method": "git-log deletion walk bounded by reachable baseline ancestors",
        "records": records,
    }


def build_discrepancies(pages: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """Records non-interpretive repeated identity observations for later reconciliation.

    Args:
        pages: Current game page observations grouped by canonical identity.

    Returns:
        A mechanical observation list without reconciliation conclusions.
    """
    records = []
    for canonical_id, observations in sorted(pages.items()):
        if len(observations) > 1:
            records.append({
                "observation_id": f"multiple-page-paths:{canonical_id}",
                "observation_type": "multiple-paths-for-canonical-identity",
                "canonical_identity_id": canonical_id,
                "evidence": [full_locator(observation["path"]) for observation in observations],
            })
    withdrawals = catalog_withdrawals()
    for canonical_id, observations in sorted(pages.items()):
        slug = canonical_id.split("/", 1)[1]
        if slug not in withdrawals:
            continue
        records.append({
            "observation_id": f"simultaneous-current-and-catalog-withdrawn:{canonical_id}",
            "observation_type": "simultaneous-source-classes",
            "canonical_identity_id": canonical_id,
            "source_classes": ["current-page-source", "catalog-withdrawn-registration"],
            "evidence": [full_locator(observations[0]["path"]), withdrawals[slug]],
        })
    return {
        "schema_version": "apk-denominator-discrepancies.v1",
        "status": "mechanical-discovery-complete",
        "source_baseline_revision": BASELINE,
        "records": records,
    }


def write_json(path: Path, value: dict[str, Any]) -> None:
    """Writes a deterministic JSON artifact in the track directory.

    Args:
        path: Output artifact path.
        value: JSON-compatible object to serialize.

    Returns:
        Nothing.
    """
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_method() -> None:
    """Writes the non-interpretive method and exclusion record for the artifacts.

    Returns:
        Nothing.
    """
    (TRACK_DIR / "denominator-method.md").write_text(
        f"""# Denominator Method

Schema version: `apk-denominator-method.v1`

## Frozen input

All factual records were read with `git ls-tree` and `git show` from
`{BASELINE}`. The generator does not read a discovered source blob from the
working tree. Historical records use only parents reached by `git log` from that
revision. Every JSON locator carries the committed blob SHA-256 and an inclusive
line-range SHA-256.

## Mechanical passes

1. Enumerate the frozen tree under the Phase-0 roots. The identity ledger joins every
   exact frozen catalog ID to page evidence by exact slug where a page exists and keeps
   catalog-withdrawn-only identities route-less; it never synthesizes a current page.
   Game-page identities are emitted in deterministic batches of no more than three; a
   failed committed-locator resolution raises before later batch output is written.
2. Select source files by the documented game-path predicate plus the frozen cartridge
   catalog/index/test and active APK program sources; record file, game-page identity,
   route, byte-identical copy, and every resolvable relative or `@/` import edge.
3. Extract declared component symbols ending in `Game`, `Screen`, or `Scene`; pure
   literal-union type aliases and inline interface properties whose names use the state
   vocabulary; typed `useState` declarations; and explicit source-local transitions.
   Runtime-store transitions are limited to an exact initializer-to-first-write edge,
   guarded writes, and conditional writes whose from/to literals share a declared
   domain. Ambiguous repeated property names are not joined. Component and state
   occurrences remain path-scoped even when symbols/literals repeat. For a `useState`
   declaration with no guarded setter pair, only the first source-ordered setter target
   differing from the exact typed initializer is retained. This is syntax traversal,
   not runtime execution.
4. Enumerate media, audio, and data suffixes below the three public roots plus
   game-associated data files; hash every committed byte sequence and report basic
   encoded format metadata.
5. Walk reachable deletion commits and retain only a parent locator when the deleted
   path resolves in that parent.

## Quarantine and limits

The `{QUARANTINE_PATH}` prefix is rejected before any source blob is read. The
negative fixture records that prefix rejection only and contains no failed-track
factual input. The output is a mechanical inventory: it makes no conclusion about
runtime intent, layout behavior, source suitability, semantic classification, or
product outcome.
""",
        encoding="utf-8",
    )


def main() -> None:
    """Generates every Phase-1 denominator artifact required by the Red contract.

    Returns:
        Nothing.
    """
    paths = baseline_paths()
    source, pages = build_source_denominator(paths)
    write_json(TRACK_DIR / "source-denominator.json", source)
    write_json(TRACK_DIR / "game-identity-ledger.json", build_identity_ledger(pages))
    write_json(TRACK_DIR / "scene-state-denominator.json", build_scene_state_denominator(paths))
    write_json(TRACK_DIR / "asset-file-denominator.json", build_asset_denominator(paths))
    write_json(TRACK_DIR / "historical-source-denominator.json", build_historical_denominator(pages))
    write_json(TRACK_DIR / "denominator-discrepancies.json", build_discrepancies(pages))
    write_method()


if __name__ == "__main__":
    main()
