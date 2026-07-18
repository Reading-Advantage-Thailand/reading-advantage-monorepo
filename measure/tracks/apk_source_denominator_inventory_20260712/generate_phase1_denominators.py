"""Generates Phase-1 denominator artifacts from frozen Git objects only.

The generator deliberately never reads a discovered source file from the working tree.
It asks Git for the frozen revision's tree and blobs, so rerunning it is deterministic
for that revision even when other agents have dirty work in the checkout.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import struct
import subprocess
import sys
import types
from collections import defaultdict
from pathlib import Path, PurePosixPath
from typing import Any, Iterable


REPO_ROOT = Path(__file__).resolve().parents[3]
TRACK_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = Path(os.environ.get("APK_DENOMINATOR_ARTIFACT_DIR", TRACK_DIR))
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
ASSET_ENUMERATION_ROOTS = (
    *PUBLIC_GAME_ROOTS,
    "apps/advantage-games/measure",
    "packages/codecamp-knowledge/fixtures/apk-guided",
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
SHARED_PACKAGE_ROOTS = (
    "packages/advantage-play-kit/",
    "packages/game-contracts/",
    "packages/game-cartridges/",
)
PROGRAM_SLUGS = (
    "dragon-flight", "rpg-battle", "abyssal-well", "castle-defense", "magic-defense",
    "wizard-vs-zombie", "village-guardian", "archers-revenge", "storm-castle-tower",
    "paladins-twin-soul", "gryphon-patrol", "dragon-rider", "dungeon-liberator",
    "spellweavers-run", "shadow-gate-dungeon", "labyrinth-goblin-king",
    "griffin-riders-escape", "sorcerer-ziggurat", "enchanted-library", "rune-match",
    "alchemists-synthesis", "potion-rush", "rune-forge-chamber", "astral-mage",
    "griffin-sky-joust", "realm-carver", "devourer-slime", "haunted-library",
    "babel-architect",
)
CONFIG_FILENAMES = {"package.json", "tsconfig.json", "tsconfig.test.json"}
ROLE_OUTPUTS = {
    "discovery-auditor": (
        "source-denominator.json",
        "game-identity-ledger.json",
        "scene-state-denominator.json",
    ),
    "evidence-collector": (
        "asset-file-denominator.json",
        "historical-source-denominator.json",
    ),
    "requirements-mapper": (
        "denominator-discrepancies.json",
        "denominator-method.md",
    ),
}
TRANSITION_MODULE_PATH = (
    "measure/tracks/apk_source_denominator_inventory_20260712/transition_ast.py"
)


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
        ["/usr/bin/git", *arguments], cwd=REPO_ROOT, capture_output=True, check=False
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


def normalized_path(path: str) -> str:
    """Normalizes a repository path for exact frozen slug matching.

    Args:
        path: Repository-relative path.

    Returns:
        Lowercase hyphen-delimited alphanumeric path text.
    """
    return re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-")


def matches_program_slug(path: str) -> bool:
    """Reports whether a normalized path contains one exact frozen program slug.

    Args:
        path: Repository-relative path.

    Returns:
        Whether one exact 29-program slug occurs on hyphen boundaries.
    """
    normalized = f"-{normalized_path(path)}-"
    return any(f"-{slug}-" in normalized for slug in PROGRAM_SLUGS)


def source_relevance_rule(path: str) -> str | None:
    """Returns the frozen relevance rule admitting one mechanical source path.

    Args:
        path: Repository-relative baseline path.

    Returns:
        Stable relevance rule ID, or None when the path is outside the corpus.
    """
    if path.startswith(f"{QUARANTINE_PATH}/"):
        return None
    if path in REQUIRED_SOURCE_PATHS:
        return "active-apk-program-sources"
    if path.startswith(SHARED_PACKAGE_ROOTS):
        return "apk-core-packages"
    filename = PurePosixPath(path).name
    if filename in CONFIG_FILENAMES or filename.startswith("tsconfig."):
        return None
    suffix = PurePosixPath(path).suffix.lower()
    if path.startswith("apps/advantage-games/src/") and suffix in SOURCE_SUFFIXES:
        return "advantage-games-src"
    app_roots = ("apps/reading-advantage/", "apps/primary-advantage/")
    if suffix in SOURCE_SUFFIXES and path.startswith(app_roots) and (
        "/games/" in path
        or "/api/v1/games/" in path
        or "/lib/game" in path
    ):
        return "reading-primary-game-copies"
    if path.startswith("packages/codecamp-knowledge/") and any(
        part.startswith("apk-") for part in PurePosixPath(path).parts
    ) and suffix in SOURCE_SUFFIXES | {".md"}:
        return "codecamp-knowledge-apk-segment"
    if path.startswith("packages/domain/src/games/") and suffix in SOURCE_SUFFIXES:
        return "domain-games-tests"
    if path.startswith("packages/domain/src/__tests__/games") and suffix in SOURCE_SUFFIXES:
        return "domain-games-tests"
    normalized = normalized_path(path)
    if path.startswith("packages/db/") and (
        "game-completion" in normalized or "codecamp-apk" in normalized
    ):
        return "db-game-completion-codecamp-apk"
    if (
        path.startswith("apps/advantage-games/measure/")
        and suffix in {".md", ".json"}
        and matches_program_slug(path)
    ):
        return "advantage-games-measure-program-match"
    return None


def source_path(path: str) -> bool:
    """Reports whether a committed path belongs to the frozen source corpus.

    Args:
        path: Repository-relative baseline path.

    Returns:
        Whether a stable relevance rule admits the path.
    """
    return source_relevance_rule(path) is not None


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


def discover_pages(paths: list[str]) -> dict[str, list[dict[str, str]]]:
    """Discovers ordered canonical page identities without reading page contents.

    Args:
        paths: Candidate baseline paths in their deterministic input order.

    Returns:
        Canonical identities mapped to ordered path and route observations.
    """
    pages: dict[str, list[dict[str, str]]] = {}
    for path in paths:
        if not source_path(path):
            continue
        identity = page_identity(path)
        if identity is None:
            continue
        canonical_id, route = identity
        pages.setdefault(canonical_id, []).append({"path": path, "route": route})
    return pages


def build_source_denominator(paths: list[str]) -> dict[str, Any]:
    """Builds mechanically pinned source, route, copy, and import-graph records.

    Args:
        paths: All frozen source-scope paths.

    Returns:
        Source denominator artifact object.
    """
    sources = [path for path in paths if source_path(path)]
    source_set = set(sources)
    records: list[dict[str, Any]] = []
    file_ids: dict[str, str] = {}
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
            "relevance_rule_id": source_relevance_rule(path),
            "discovery_method": "mechanical-filesystem",
            "evidence": full_locator(path),
        })
    pages = discover_pages(sources)
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
        if PurePosixPath(path).suffix.lower() not in SOURCE_SUFFIXES:
            continue
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
    return {
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
    }


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


def build_identity_ledger(paths: list[str]) -> dict[str, Any]:
    """Builds a ledger from frozen page paths and the complete exact catalog.

    Args:
        paths: All frozen source-scope paths.

    Returns:
        The identity ledger artifact object.
    """
    pages = discover_pages(paths)
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


def _load_transition_module(code_revision: str | None) -> Any:
    """Loads the transition adjudicator from immutable Git bytes when bound.

    Args:
        code_revision: Full commit containing the exact adjudicator source, or
            ``None`` only for focused in-process unit tests.

    Returns:
        Executed transition adjudicator module.
    """
    module_path = TRACK_DIR / "transition_ast.py"
    source = (
        run_git("show", f"{code_revision}:{TRANSITION_MODULE_PATH}")
        if code_revision is not None
        else module_path.read_bytes()
    )
    module = types.ModuleType("apk_phase1_transition_ast")
    module.__file__ = str(module_path)
    sys.modules[module.__name__] = module
    exec(compile(source, str(module_path), "exec"), module.__dict__)
    return module


def build_scene_state_denominator(
    paths: list[str], *, code_revision: str | None = None
) -> dict[str, Any]:
    """Extracts explicit state domains and source-backed transitions from source.

    Args:
        paths: All frozen source-scope paths.

    Returns:
        Scene/presentation symbols, literal states, and direct source-local transitions.
    """
    game_sources = [path for path in paths if source_path(path) and PurePosixPath(path).suffix in {".ts", ".tsx", ".js", ".jsx"}]
    source_texts = {
        path: blob(path).decode("utf-8", errors="replace") for path in game_sources
    }
    transition_module = _load_transition_module(code_revision)
    ast_writes = transition_module.extract_transition_writes(
        source_texts, code_revision=code_revision
    )
    scene_records: list[dict[str, Any]] = []
    state_records: list[dict[str, Any]] = []
    transitions: list[dict[str, Any]] = []
    property_domain_symbols: dict[tuple[str, str], set[str]] = defaultdict(set)
    for path in game_sources:
        text = source_texts[path]
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
        ambiguous_property_names: set[str] = set()

        def register_property_domain(
            property_name: str, symbol: str, literals: set[str], line: int
        ) -> None:
            """Registers a property domain without allowing collisions to drive edges."""
            if property_name in ambiguous_property_names:
                return
            previous = property_domains.get(property_name)
            if previous is not None and previous[0] != symbol:
                property_domains[property_name] = ("", set(), 0)
                ambiguous_property_names.add(property_name)
                property_domain_symbols[(path, property_name)].add(symbol)
                return
            property_domains[property_name] = (symbol, literals, line)
            property_domain_symbols[(path, property_name)].add(symbol)

        object_type_pattern = re.compile(
            r"export\s+type\s+(\w+)\s*=\s*\{([\s\S]*?)\n\}\s*;?"
        )
        for object_type in object_type_pattern.finditer(text):
            type_name, body = object_type.groups()
            body_offset = object_type.start(2)
            for prop in re.finditer(r"^\s*(\w+)\??:\s*([^;\n]+);?", body, re.MULTILINE):
                property_name, type_text = prop.groups()
                if not STATE_NAME.search(type_name) or not STATE_NAME.search(property_name):
                    continue
                literals = {literal.group(1) for literal in STRING_LITERAL.finditer(type_text)}
                if not literals:
                    continue
                symbol = f"{type_name}.{property_name}"
                line = source_line_number(text, body_offset + prop.start(1))
                register_property_domain(property_name, symbol, literals, line)
                for literal in sorted(literals):
                    literal_line = source_line_number(text, body_offset + prop.start(2))
                    add_state(symbol, literal, literal_line, "object-type-literal-property")

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
                    register_property_domain(property_name, alias_name, literals, alias_line)
                    continue
                if not STATE_NAME.search(property_name):
                    continue
                literals = {literal.group(1) for literal in STRING_LITERAL.finditer(type_text)}
                if not literals:
                    continue
                symbol = f"{interface_name}.{property_name}"
                register_property_domain(property_name, symbol, literals, line)
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
    occurrences: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for record in state_records:
        occurrences[(record["source_symbol"], record["state_id"])].append(record)

    def resolve_occurrence(symbol: str, state_id: str, evidence_path: str) -> str | None:
        """Resolves one exact state occurrence without path-global silent merging."""
        domain_symbols = {symbol, *property_domain_symbols.get((evidence_path, symbol), set())}
        choices = [
            row
            for domain_symbol in domain_symbols
            for row in occurrences.get((domain_symbol, state_id), [])
        ]
        local = [row for row in choices if row["evidence"]["path"] == evidence_path]
        resolved = local if len(local) == 1 else choices
        return resolved[0]["state_occurrence_id"] if len(resolved) == 1 else None

    transition_candidates: list[dict[str, Any]] = []
    for record in ast_writes["proven_transitions"]:
        from_occurrence = resolve_occurrence(
            record["source_symbol"], record["from_state_id"], record["path"]
        )
        to_occurrence = resolve_occurrence(
            record["source_symbol"], record["to_state_id"], record["path"]
        )
        if from_occurrence is None or to_occurrence is None:
            transition_candidates.append(
                {
                    **record,
                    "record_kind": "transition_write_candidate",
                    "resolution_status": "unresolved",
                    "reason": "state-domain-occurrence-ambiguous",
                    "evidence": line_locator(
                        record["path"], record["start_line"], record["end_line"]
                    ),
                }
            )
            continue
        transitions.append(
            {
                "from_state_occurrence_id": from_occurrence,
                "to_state_occurrence_id": to_occurrence,
                "from_state_id": record["from_state_id"],
                "to_state_id": record["to_state_id"],
                "source_symbol": record["source_symbol"],
                "transition_kind": "phase",
                "transition_evidence_kind": record["transition_evidence_kind"],
                "discovery_method": "mechanical-typescript-compiler-ast",
                "evidence": line_locator(
                    record["path"], record["start_line"], record["end_line"]
                ),
            }
        )
    for record in ast_writes["transition_write_candidates"]:
        transition_candidates.append(
            {
                **record,
                "discovery_method": "mechanical-typescript-compiler-ast",
                "evidence": line_locator(
                    record["path"], record["start_line"], record["end_line"]
                ),
            }
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
        "transition_write_candidates": sorted(
            transition_candidates,
            key=lambda record: (
                record["evidence"]["path"],
                record["evidence"]["range"]["start_line"],
                record["source_symbol"],
                record["to_state_id"],
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


def asset_relevance_rule(path: str) -> str | None:
    """Returns the frozen relevance rule admitting one candidate asset path.

    Args:
        path: Repository-relative baseline path.

    Returns:
        Stable asset relevance rule ID, or None when excluded.
    """
    if path.startswith(f"{QUARANTINE_PATH}/"):
        return None
    filename = PurePosixPath(path).name
    if filename in CONFIG_FILENAMES or filename.startswith("tsconfig."):
        return None
    suffix = PurePosixPath(path).suffix.lower()
    if path.startswith(PUBLIC_GAME_ROOTS) and suffix in MEDIA_SUFFIXES | AUDIO_SUFFIXES | DATA_SUFFIXES:
        return "public-game-media-audio-data"
    if (
        path.startswith("apps/advantage-games/measure/")
        and filename in {"asset-spec.md", "metadata.json"}
        and matches_program_slug(path)
    ):
        return "game-measure-asset-sidecars"
    if path == "packages/codecamp-knowledge/fixtures/apk-guided/activity-tutorial.json":
        return "codecamp-activity-tutorial"
    return None


def candidate_asset_path(path: str) -> bool:
    """Reports whether a committed path belongs in the frozen asset corpus.

    Args:
        path: Repository-relative baseline path.

    Returns:
        Whether a stable asset relevance rule admits the path.
    """
    return asset_relevance_rule(path) is not None


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
            "relevance_rule_id": asset_relevance_rule(path),
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
            "roots": list(ASSET_ENUMERATION_ROOTS),
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
        "log", "--first-parent", "--format=%H", "--name-only", "--diff-filter=D", BASELINE, "--",
        "apps/advantage-games", "apps/reading-advantage", "apps/primary-advantage",
        "packages", "measure",
    ).decode("utf-8", errors="replace")
    revision: str | None = None
    seen_paths: set[str] = set()
    for line in output.splitlines():
        if re.fullmatch(r"[0-9a-f]{40}", line):
            revision = line
            continue
        if not revision or not line or line in seen_paths or not (source_path(line) or candidate_asset_path(line)):
            continue
        parent = run_git("rev-parse", f"{revision}^").decode().strip()
        try:
            blob(line, parent)
        except RuntimeError:
            continue
        seen_paths.add(line)
        yield parent, line


def build_historical_denominator(paths: list[str]) -> dict[str, Any]:
    """Builds current page and reachable deleted-path historical locators.

    Args:
        paths: All frozen source-scope paths.

    Returns:
        Historical source locator records bounded by the frozen revision ancestry.
    """
    pages = discover_pages(paths)
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
        "history_method": "git-log first-parent deletion walk retaining the first deletion per path",
        "records": records,
    }


def build_discrepancies(paths: list[str]) -> dict[str, Any]:
    """Records non-interpretive repeated identity observations for later reconciliation.

    Args:
        paths: All frozen source-scope paths.

    Returns:
        A mechanical observation list without reconciliation conclusions.
    """
    pages = discover_pages(paths)
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


def write_method(output_dir: Path) -> None:
    """Writes the non-interpretive method and exclusion record for the artifacts.

    Args:
        output_dir: Directory receiving the method artifact.

    Returns:
        Nothing.
    """
    (output_dir / "denominator-method.md").write_text(
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
   vocabulary; typed `useState` declarations; and executable literal-domain writes
   through the TypeScript compiler AST. Emit a proven transition only when the AST
   establishes one source state; retain every other executable write as an explicit
   unresolved transition candidate. The proven and unresolved partitions exactly cover
   the compiler-enumerated writes without source-order or union-order inference.
4. Enumerate media, audio, and data suffixes below the five frozen roots:
   `apps/advantage-games/public`, `apps/reading-advantage/public/games`,
   `apps/primary-advantage/public/games`, `apps/advantage-games/measure`, and
   `packages/codecamp-knowledge/fixtures/apk-guided`; hash every committed byte sequence
   and report basic encoded format metadata.
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


def main(
    output_dir: Path | None = None,
    role: str | None = None,
    *,
    code_revision: str | None = None,
) -> None:
    """Generates every Phase-1 denominator artifact required by the Red contract.

    Args:
        output_dir: Directory receiving selected artifacts.
        role: Optional role whose owned artifacts alone are written.
        code_revision: Full commit containing immutable executable helpers.

    Returns:
        Nothing.

    Raises:
        ValueError: If role is not one of the supported Phase-1 roles.
    """
    if role is not None and role not in ROLE_OUTPUTS:
        raise ValueError(f"Unsupported Phase-1 role: {role}")
    if output_dir is None:
        output_dir = DEFAULT_OUTPUT_DIR
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = baseline_paths()
    if role is None or role == "discovery-auditor":
        write_json(output_dir / "source-denominator.json", build_source_denominator(paths))
        write_json(output_dir / "game-identity-ledger.json", build_identity_ledger(paths))
        write_json(
            output_dir / "scene-state-denominator.json",
            build_scene_state_denominator(paths, code_revision=code_revision),
        )
    if role is None or role == "evidence-collector":
        write_json(output_dir / "asset-file-denominator.json", build_asset_denominator(paths))
        write_json(output_dir / "historical-source-denominator.json", build_historical_denominator(paths))
    if role is None or role == "requirements-mapper":
        write_json(output_dir / "denominator-discrepancies.json", build_discrepancies(paths))
        write_method(output_dir)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument(
        "--role",
        choices=("discovery-auditor", "evidence-collector", "requirements-mapper"),
    )
    parser.add_argument("--code-revision", required=True)
    arguments = parser.parse_args()
    main(
        output_dir=arguments.output_dir,
        role=arguments.role,
        code_revision=arguments.code_revision,
    )
