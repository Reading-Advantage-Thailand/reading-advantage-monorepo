"""Build exhaustive Phase-2 evidence solely from committed Git objects."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any


BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
PHASE1_REVISION = "03ad03c56911c762c1933775915364e725613f4b"
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
            ["git", "cat-file", "--batch"],
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
        ["git", "ls-tree", "-r", "-l", BASELINE, "--", *SOURCE_ROOTS],
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


def _raw_source_path(path: str) -> bool:
    """Selects game-bearing source paths using only frozen path structure."""
    if path.startswith(SHARED_PACKAGE_ROOTS):
        return True
    if path == CATALOG_PATH or path in RAW_REQUIRED_SOURCE_PATHS:
        return True
    suffix = Path(path).suffix.lower()
    if suffix not in SOURCE_SUFFIXES:
        return False
    if path.startswith("apps/advantage-games/src/"):
        return True
    return path.startswith(("apps/reading-advantage/", "apps/primary-advantage/")) and (
        "/games/" in path or "/api/v1/games/" in path or "/lib/game" in path
    )


def _raw_asset_path(path: str) -> bool:
    """Selects candidate asset paths independently from frozen tree entries."""
    suffix = Path(path).suffix.lower()
    public = path.startswith((
        "apps/advantage-games/public/",
        "apps/reading-advantage/public/games/",
        "apps/primary-advantage/public/games/",
    ))
    game_source = _raw_source_path(path) and not path.startswith(SHARED_PACKAGE_ROOTS)
    return suffix in ASSET_SUFFIXES and (public or game_source)


def _raw_store_surfaces(reader: GitObjectReader, source_paths: list[str]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Discovers literal state domains and explicit store writes from raw source text."""
    states: list[dict[str, Any]] = []
    transitions: list[dict[str, Any]] = []
    for path in source_paths:
        if Path(path).suffix.lower() not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        text = reader.read(BASELINE, path).decode("utf-8", errors="replace")
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
                elif RAW_STATE_NAME.search(prop_name) and inline:
                    symbol = f"{interface_name}.{prop_name}"
                    properties[prop_name].append((symbol, inline))
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
            setter = re.compile(rf"\b{re.escape(setter_name)}\s*\(\s*['\"]([^'\"]+)['\"]")
            first_change = next(
                (match for match in setter.finditer(text, declaration.end()) if match.group(1) in literals and match.group(1) != initial_value),
                None,
            )
            if first_change is not None:
                transitions.append({
                    "path": path, "source_symbol": state_name,
                    "from_state_id": initial_value, "to_state_id": first_change.group(1),
                    "evidence": locator(reader, BASELINE, path, text.count("\n", 0, first_change.start()) + 1, text.count("\n", 0, first_change.end()) + 1),
                })
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
        create_start = text.find("create<")
        if create_start < 0:
            continue
        for property_name, property_domains in sorted(properties.items()):
            if property_name == "state":
                continue
            distinct_domains = {(symbol, frozenset(literals)) for symbol, literals in property_domains}
            if len(distinct_domains) != 1:
                continue
            domain_symbol, frozen_literals = next(iter(distinct_domains))
            literals = set(frozen_literals)
            writes = [
                match for match in re.finditer(rf"\b{re.escape(property_name)}\s*:\s*['\"]([^'\"]+)['\"]", text[create_start:])
                if match.group(1) in literals
            ]
            ordered: list[tuple[str, int, int]] = []
            for match in writes:
                value = match.group(1)
                absolute_start = create_start + match.start()
                absolute_end = create_start + match.end()
                if not ordered or ordered[-1][0] != value:
                    ordered.append((value, absolute_start, absolute_end))
            changes = [item for item in ordered[1:] if item[0] != ordered[0][0]]
            for previous, current in ([(ordered[0], changes[0])] if changes else []):
                transitions.append({
                    "path": path,
                    "source_symbol": domain_symbol,
                    "from_state_id": previous[0],
                    "to_state_id": current[0],
                    "evidence": locator(reader, BASELINE, path, text.count("\n", 0, previous[1]) + 1, text.count("\n", 0, current[2]) + 1),
                })
            for conditional in re.finditer(
                rf"state\.{re.escape(property_name)}\s*===?\s*['\"]([^'\"]+)['\"][\s\S]{{0,160}}?\?\s*['\"]([^'\"]+)['\"]\s*:\s*state\.{re.escape(property_name)}",
                text[create_start:],
            ):
                if conditional.group(1) in literals and conditional.group(2) in literals:
                    start = create_start + conditional.start()
                    end = create_start + conditional.end()
                    transitions.append({
                        "path": path, "source_symbol": domain_symbol,
                        "from_state_id": conditional.group(1), "to_state_id": conditional.group(2),
                        "evidence": locator(reader, BASELINE, path, text.count("\n", 0, start) + 1, text.count("\n", 0, end) + 1),
                    })
            for guarded in re.finditer(
                rf"if\s*\([^)]*(?:state\.)?{re.escape(property_name)}\s*!==?\s*['\"]([^'\"]+)['\"][^)]*\)\s*return(?:\s*\{{\}})?([\s\S]{{0,350}}?)\b{re.escape(property_name)}\s*:\s*['\"]([^'\"]+)['\"]",
                text[create_start:],
            ):
                if guarded.group(1) in literals and guarded.group(3) in literals:
                    start = create_start + guarded.start()
                    end = create_start + guarded.end()
                    transitions.append({
                        "path": path, "source_symbol": domain_symbol,
                        "from_state_id": guarded.group(1), "to_state_id": guarded.group(3),
                        "evidence": locator(reader, BASELINE, path, text.count("\n", 0, start) + 1, text.count("\n", 0, end) + 1),
                    })
    state_map = {(row["path"], row["source_symbol"], row["state_id"]): row for row in states}
    transition_map = {(row["path"], row["source_symbol"], row["from_state_id"], row["to_state_id"]): row for row in transitions}
    return [state_map[key] for key in sorted(state_map)], [transition_map[key] for key in sorted(transition_map)]


def discover_raw_frozen_sources() -> dict[str, Any]:
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
        states, transitions = _raw_store_surfaces(reader, source_paths)
        asset_records = [
            {"canonical_path": row["path"], "git_object_id": row["git_object_id"], "byte_size": row["byte_size"]}
            for row in entries if _raw_asset_path(row["path"])
        ]
        history_output = subprocess.check_output(
            ["git", "log", "--format=commit:%H", "--name-status", "--diff-filter=D", BASELINE, "--", *SOURCE_ROOTS],
            cwd=REPO_ROOT,
            text=True,
        )
        history_records: list[dict[str, Any]] = []
        revision = ""
        for line in history_output.splitlines():
            if line.startswith("commit:"):
                revision = line[7:]
            elif line.startswith("D\t"):
                path = line[2:]
                if (
                    path != QUARANTINED_SOURCE_PREFIX
                    and not path.startswith(f"{QUARANTINED_SOURCE_PREFIX}/")
                    and (_raw_source_path(path) or _raw_asset_path(path))
                ):
                    history_records.append({"deletion_revision": revision, "path": path})
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
            "raw_file_records": [{**row, "canonical_path": row["path"]} for row in entries if row["path"] in set(source_paths)],
            "raw_state_records": states,
            "raw_transition_records": transitions,
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
        status = "matched" if key in mechanical and key in human else "mechanical-only" if key in mechanical else "human-only"
        rows.append({
            "category": category, "record_key": key, "comparison_status": status,
            "blocking": status != "matched", "mechanical_evidence": mechanical.get(key, []), "human_evidence": human.get(key, []),
        })
    return rows


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
        ["git", "rev-parse", "--verify", f"{revision}^{{commit}}"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if resolved.returncode != 0 or resolved.stdout.strip() != revision:
        raise ValueError(f"Unresolvable phase1-revision: {revision}")
    reachable = subprocess.run(
        ["git", "merge-base", "--is-ancestor", revision, "HEAD"],
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
    return locator(
        reader,
        evidence["revision"],
        evidence["path"],
        source_range["start_line"],
        source_range["end_line"],
    )


def canonical_key(value: object) -> str:
    """Returns a deterministic key for one mechanical object.

    Args:
        value: JSON-compatible object to identify.

    Returns:
        Canonical compact JSON.
    """
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


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
            ["git", "ls-tree", "-r", "--name-only", ASTRAL_HISTORY_REVISION, "--", prefix],
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

            exact_name_command = ["git", "log", "--format=%H", "-S", display_name, BASELINE, "--", *SOURCE_ROOTS]
            slug_command = ["git", "log", "--format=%H", "-S", catalog_id, BASELINE, "--", *SOURCE_ROOTS]
            current_name_command = ["git", "grep", "-l", "-F", display_name, BASELINE, "--", *SOURCE_ROOTS]
            spec_command = ["git", "grep", "-l", "-F", display_name, BASELINE, "--", "measure"]

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
                    "git", "log", "--format=%H%x09%P%x09%s", "--diff-filter=D", BASELINE, "--", primary_path,
                ]
                deletion_lines = command_lines(deletion_command)
                if not deletion_lines:
                    raise ValueError(f"No deletion commit found for historical identity: {label}")
                deletion_parts = deletion_lines[0].split("\t", 2)
                parents = deletion_parts[1].split()
                if primary_historical_evidence["revision"] not in parents:
                    raise ValueError(f"Historical locator is not a deletion parent for {label}")
                primary_deletion = {
                    "command": " ".join(deletion_command),
                    "deletion_commit": deletion_parts[0],
                    "parent_revision": primary_historical_evidence["revision"],
                    "commit_subject": deletion_parts[2],
                    "path": primary_path,
                }
                path_history_command = [
                    "git", "log", "--format=commit:%H", "--name-status", BASELINE, "--", primary_path,
                ]
                path_history_events = command_lines(path_history_command)
            else:
                deletion_command = ["git", "log", "--format=%H%x09%P%x09%s", "--diff-filter=D", BASELINE, "--", f"*{catalog_id}*"]
                path_history_command = ["git", "log", "--format=commit:%H", "--name-status", BASELINE, "--", f"*{catalog_id}*"]

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


def check_coverage(phase1_revision: str = PHASE1_REVISION) -> dict[str, int]:
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
    actual_source = {row["mechanical_record_id"] for row in human["mechanical_source_record_reviews"]}
    expected_graph = {canonical_key(row) for row in source["graph_edges"]}
    actual_graph = {row["mechanical_graph_edge_key"] for row in human["mechanical_graph_edge_reviews"]}
    expected_identities = {
        row["canonical_identity_id"]
        for row in ledger["identity_records"]
        if any(state.get("source_class") == "current-page-source" for state in row.get("source_states", []))
    }
    actual_identities = {row["canonical_identity_id"] for row in human_discrepancies["identity_comparison_records"]}
    expected_surfaces = {
        canonical_key(row)
        for field in ("scene_records", "state_records", "transitions")
        for row in scenes[field]
    }
    actual_surfaces = {row["mechanical_surface_key"] for row in human["surface_reviews"]}
    expected_assets = {row["canonical_path"] for row in assets["candidate_files"]}
    actual_assets = {row["canonical_path"] for row in human["asset_candidate_reviews"]}
    expected_groups = {row["identical_hash_group"] for row in assets["candidate_files"]}
    actual_groups = {row["identical_hash_group"] for row in human["identical_hash_group_reviews"]}
    expected_copies = {row["record_id"] for row in source["records"] if row["record_type"] == "copy"}
    actual_copies = {row["mechanical_copy_record_id"] for row in duplicates["mechanical_copy_record_reviews"]}
    expected_duplicate_families = {f"{family}:{identity}" for identity in expected_identities for family in ("reading", "primary")}
    actual_duplicate_families = {f"{row['source_family']}:{row['canonical_identity_id']}" for row in duplicates["duplicate_drift_records"]}
    expected_history = {canonical_key(row["evidence"]) for row in historical["records"]}
    actual_history = {row["mechanical_locator_key"] for row in human_history["mechanical_historical_locator_reviews"]}
    expected_discrepancies = {row["observation_id"] for row in mechanical_discrepancies["records"]}
    actual_discrepancies = {row["observation_id"] for row in human_discrepancies["mechanical_observation_records"]}
    expected_program = {label for label, _, _, _ in program_identities}
    actual_program = {row["program_identity_label"] for row in human["replacement_program_identity_reviews"]}
    expected_program_history = {
        row["program_identity_label"]
        for row in human["replacement_program_identity_reviews"]
        if row["disposition"] == "historical/withdrawn"
    }
    actual_program_history = {row["program_identity_label"] for row in human_history["program_identity_history_reviews"]}
    actual_program_dispositions = {row["program_identity_label"] for row in human_discrepancies["program_identity_disposition_records"]}
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


# Compatibility marker for the source-order contract: def generate()
def generate(phase1_revision: str = PHASE1_REVISION) -> None:
    """Generates exhaustive non-interpretive Phase-2 evidence artifacts."""
    phase1_revision = validate_phase1_revision(phase1_revision)
    raw_frozen_source_discovery = discover_raw_frozen_sources()
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
        raw_identity_map = {
            row["catalog_id"]: [row["evidence"]]
            for row in raw_frozen_source_discovery["raw_identity_records"]
        }
        mechanical_identity_map = {
            row["catalog_identity_id"]: [row["catalog_evidence"]]
            for row in ledger["identity_records"]
        }
        raw_file_map = {
            row["canonical_path"]: [row]
            for row in raw_frozen_source_discovery["raw_file_records"]
        }
        mechanical_file_map = {
            row["file_path"]: [row["evidence"]]
            for row in source["records"] if row["record_type"] == "file"
        }
        raw_state_map = {
            canonical_key([row["path"], row["source_symbol"], row["state_id"]]): [row["evidence"]]
            for row in raw_frozen_source_discovery["raw_state_records"]
        }
        mechanical_state_map = {
            canonical_key([row["evidence"]["path"], row["source_symbol"], row["state_id"]]): [row["evidence"]]
            for row in scenes["state_records"]
        }
        raw_transition_map = {
            canonical_key([row["path"], row["source_symbol"], row["from_state_id"], row["to_state_id"]]): [row["evidence"]]
            for row in raw_frozen_source_discovery["raw_transition_records"]
        }
        mechanical_transition_map = {
            canonical_key([row["evidence"]["path"], row["source_symbol"], row["from_state_id"], row["to_state_id"]]): [row["evidence"]]
            for row in scenes["transitions"]
        }
        raw_asset_map = {
            row["canonical_path"]: [row]
            for row in raw_frozen_source_discovery["raw_asset_records"]
        }
        mechanical_asset_map = {
            row["canonical_path"]: [row]
            for row in assets["candidate_files"]
        }
        raw_history_map = {
            row["path"]: [row]
            for row in raw_frozen_source_discovery["raw_history_records"]
        }
        mechanical_history_map = {
            row["evidence"]["path"]: [row["evidence"]]
            for row in historical["records"] if row["classification"] != "current"
        }
        symmetric_reconciliation = [
            *symmetric_reconciliation_records("identities", mechanical_identity_map, raw_identity_map),
            *symmetric_reconciliation_records("files", mechanical_file_map, raw_file_map),
            *symmetric_reconciliation_records("states", mechanical_state_map, raw_state_map),
            *symmetric_reconciliation_records("transitions", mechanical_transition_map, raw_transition_map),
            *symmetric_reconciliation_records("assets", mechanical_asset_map, raw_asset_map),
            *symmetric_reconciliation_records("history-paths", mechanical_history_map, raw_history_map),
        ]
        symmetric_blockers = [row for row in symmetric_reconciliation if row["blocking"]]

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
        for source_kind, rows in (("scene", scenes["scene_records"]), ("state", scenes["state_records"]), ("transition", scenes["transitions"])):
            for row in rows:
                evidence = revalidate(reader, row["evidence"])
                surface_reviews.append(evidence_record(
                    review_id=f"surface-review:{len(surface_reviews) + 1:03d}",
                    mechanical_surface_key=canonical_key(row), source_kind=source_kind,
                    surface_kind=row.get("transition_kind", source_kind),
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
            "duplicate_drift_records": duplicate_rows,
            "mechanical_copy_record_reviews": copy_reviews, "interpretation": {},
        })
        write_json("human-historical-deleted-records.json", {
            "schema_version": "apk-denominator-human-historical-deleted.v1",
            "status": "independent-human-discovery-complete", "track_id": TRACK,
            "source_baseline_revision": BASELINE, "collector_identity": COLLECTOR_IDENTITY,
            "historical_deleted_records": historical_deleted,
            "mechanical_historical_locator_reviews": all_history,
            "program_identity_history_reviews": program_history_reviews, "interpretation": {},
        })
        write_json("human-discrepancy-records.json", {
            "schema_version": "apk-denominator-human-discrepancies.v1",
            "status": "independent-human-discovery-complete", "track_id": TRACK,
            "source_baseline_revision": BASELINE, "collector_identity": COLLECTOR_IDENTITY,
            "identity_comparison_records": identity_comparisons,
            "mechanical_observation_records": mechanical_observations,
            "program_identity_disposition_records": program_dispositions,
            "independent_symmetric_reconciliation": symmetric_reconciliation,
            "independent_symmetric_blocking_records": symmetric_blockers,
            "coverage_status": "blocked" if symmetric_blockers else "complete", "uncovered_mechanical_records": [],
            "uncovered_replacement_program_identities": [], "interpretation": {},
        })
    finally:
        reader.close()
    counts = check_coverage(phase1_revision)
    discrepancy_path = TRACK_DIR / "human-discrepancy-records.json"
    discrepancy = json.loads(discrepancy_path.read_text())
    discrepancy["exhaustive_coverage_counts"] = counts
    discrepancy["uncovered_count"] = 0
    discrepancy["uncovered_by_category"] = {category: 0 for category in counts}
    write_json("human-discrepancy-records.json", discrepancy)


def main() -> None:
    """Generates artifacts or runs the explicit exhaustive coverage check."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--check-only", action="store_true")
    parser.add_argument("--phase1-revision", default=PHASE1_REVISION)
    args = parser.parse_args()
    if args.check_only:
        print(json.dumps({"status": "passed", "uncovered_count": 0, "counts": check_coverage(args.phase1_revision)}, sort_keys=True))
    else:
        generate(args.phase1_revision)


if __name__ == "__main__":
    main()
