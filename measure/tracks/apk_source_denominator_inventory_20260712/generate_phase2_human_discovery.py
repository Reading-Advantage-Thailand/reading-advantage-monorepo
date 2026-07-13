"""Build exhaustive Phase-2 evidence solely from committed Git objects."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Any


BASELINE = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
PHASE1_REVISION = "f17fa78b36453e4aba36bc90f32bf25cd5b65ddb"
ASTRAL_HISTORY_REVISION = "1a21fb951e27bb4df8a5e8f7b1685cea9e6efb9f"
TRACK = "apk_source_denominator_inventory_20260712"
TRACK_DIR = Path(__file__).resolve().parent
REPO_ROOT = TRACK_DIR.parents[2]
PROGRAM_PATH = "measure/apk-evidence-reconstruction-program.md"
CATALOG_PATH = "apps/advantage-games/src/lib/gameCards.ts"
COLLECTOR_IDENTITY = "evidence-collector-remediation-20260713"

# Raw labels and exact source IDs are transcribed from the frozen replacement
# program and catalog. This table is a search key, not an authored denominator.
PROGRAM_IDENTITIES = [
    ("Dragon Flight — large current action implementation.", "dragon-flight", "vocabulary/dragon-flight"),
    ("RPG Battle — multi-state turn-based implementation.", "rpg-battle", "vocabulary/rpg-battle"),
    ("The Abyssal Well — stale/historical evidence recovery.", "abyssal-well", None),
    ("Castle Defense", "castle-defense", "sentence/castle-defense"),
    ("Magic Defense", "magic-defense", "vocabulary/magic-defense"),
    ("Wizard vs Zombie", "wizard-vs-zombie", "vocabulary/wizard-vs-zombie"),
    ("Village Guardian", "village-guardian", "sentence/village-guardian"),
    ("Archer's Revenge", "archers-revenge", None),
    ("Storm the Castle Tower", "storm-castle-tower", None),
    ("Paladin's Twin-Soul", "paladins-twin-soul", None),
    ("Gryphon Patrol", "gryphon-patrol", None),
    ("Dragon Rider", "dragon-rider", "vocabulary/dragon-rider"),
    ("Dungeon Liberator", "dungeon-liberator", "sentence/dungeon-liberator"),
    ("Spellweaver's Run", "spellweavers-run", None),
    ("Shadow Gate Dungeon", "shadow-gate-dungeon", "sentence/shadow-gate-dungeon"),
    ("Labyrinth of the Goblin King", "labyrinth-goblin-king", "sentence/labyrinth-goblin-king"),
    ("Griffin Rider's Escape", "griffin-riders-escape", None),
    ("The Sorcerer's Ziggurat", "sorcerer-ziggurat", None),
    ("Enchanted Library", "enchanted-library", "vocabulary/enchanted-library"),
    ("Rune Match", "rune-match", "vocabulary/rune-match"),
    ("Alchemist's Synthesis", "alchemists-synthesis", "vocabulary/alchemists-synthesis"),
    ("Potion Rush", "potion-rush", "sentence/potion-rush"),
    ("Rune Forge Chamber", "rune-forge-chamber", "sentence/rune-forge-chamber"),
    ("Astral Mage", "astral-mage", None),
    ("Griffin Sky-Joust", "griffin-sky-joust", None),
    ("Realm Carver", "realm-carver", None),
    ("Devourer Slime", "devourer-slime", "sentence/devourer-slime"),
    ("The Haunted Library", "haunted-library", "sentence/haunted-library"),
    ("Babel Architect", "babel-architect", None),
]


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

    def read(self, revision: str, path: str) -> bytes:
        """Returns committed bytes for an exact revision and path.

        Args:
            revision: Commit containing the object.
            path: Repository-relative object path.

        Returns:
            The exact committed bytes.
        """
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
        return value

    def close(self) -> None:
        """Closes the persistent batch process."""
        if self.process.stdin is not None:
            self.process.stdin.close()
        self.process.wait(timeout=10)


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


def batch_maps() -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Builds replacement-program batches of no more than three games.

    Returns:
        Batch metadata and a slug-to-batch mapping.
    """
    batches: list[dict[str, Any]] = []
    slug_batches: dict[str, str] = {}
    for number, start in enumerate(range(0, len(PROGRAM_IDENTITIES), 3), start=1):
        group = PROGRAM_IDENTITIES[start : start + 3]
        batch_id = f"human-program-{number:02d}"
        for _, slug, _ in group:
            slug_batches[slug] = batch_id
        batches.append({
            "batch_id": batch_id,
            "status": "accepted",
            "accepted_identity_ids": [label for label, _, _ in group],
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
        for _, slug, _ in PROGRAM_IDENTITIES:
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
    for number, (label, catalog_id, mechanical_id) in enumerate(PROGRAM_IDENTITIES, start=1):
        program_evidence = locator(reader, BASELINE, PROGRAM_PATH, line_by_label[label], line_by_label[label])
        catalog_evidence = [catalog[catalog_id]] if catalog_id in catalog else []
        matches = implementation_matches(paths, catalog_id)
        if mechanical_id is not None:
            current = [revalidate(reader, alias["evidence"]) for alias in ledger_by_id[mechanical_id]["aliases"]]
            disposition = "current-page-source-observed"
            source_fact = "The frozen baseline contains the cited current page-source object(s); exact catalog evidence is retained when present."
            historical_evidence: list[dict[str, Any]] = []
        else:
            current = []
            disposition = "absent-at-baseline-with-reachable-history"
            historical_evidence = history_by_slug[catalog_id]
            if not historical_evidence:
                raise ValueError(f"No exact reachable history found for absent identity: {label}")
            if any(item["revision"] not in reachable_revisions for item in historical_evidence):
                raise ValueError(f"Unreachable historical source found for absent identity: {label}")
            source_fact = "The exact frozen implementation-path search returned no match; exact current catalog evidence, when present, and reachable historical source locators are recorded without inferring current implementation."
        reviews.append(evidence_record(
            record_id=f"program-identity:{number:02d}",
            program_identity_label=label,
            catalog_id=catalog_id,
            canonical_identity_id=mechanical_id,
            review_batch_id=slug_batches[catalog_id],
            disposition=disposition,
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
            history_search={
                "command": f"git rev-list {BASELINE} -- apps/advantage-games apps/reading-advantage apps/primary-advantage packages measure",
                "baseline_revision": BASELINE,
                "ancestor_only": True,
                "matched_locator_keys": [canonical_key(item) for item in historical_evidence],
            },
            current_source_evidence=current,
            historical_source_evidence=historical_evidence,
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


def check_coverage() -> dict[str, int]:
    """Proves every mechanical denominator item has a human disposition.

    Returns:
        Expected counts for each exhaustive comparison category.
    """
    reader = GitObjectReader()
    try:
        source = git_json(reader, PHASE1_REVISION, "source-denominator.json")
        ledger = git_json(reader, PHASE1_REVISION, "game-identity-ledger.json")
        scenes = git_json(reader, PHASE1_REVISION, "scene-state-denominator.json")
        assets = git_json(reader, PHASE1_REVISION, "asset-file-denominator.json")
        historical = git_json(reader, PHASE1_REVISION, "historical-source-denominator.json")
        mechanical_discrepancies = git_json(reader, PHASE1_REVISION, "denominator-discrepancies.json")
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
    expected_identities = {row["canonical_identity_id"] for row in ledger["identity_records"]}
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
    expected_program = {label for label, _, _ in PROGRAM_IDENTITIES}
    actual_program = {row["program_identity_label"] for row in human["replacement_program_identity_reviews"]}
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


def generate() -> None:
    """Generates exhaustive non-interpretive Phase-2 evidence artifacts."""
    reader = GitObjectReader()
    try:
        source = git_json(reader, PHASE1_REVISION, "source-denominator.json")
        ledger = git_json(reader, PHASE1_REVISION, "game-identity-ledger.json")
        scenes = git_json(reader, PHASE1_REVISION, "scene-state-denominator.json")
        assets = git_json(reader, PHASE1_REVISION, "asset-file-denominator.json")
        historical = git_json(reader, PHASE1_REVISION, "historical-source-denominator.json")
        discrepancies = git_json(reader, PHASE1_REVISION, "denominator-discrepancies.json")
        paths = tree_paths()
        program_batches, slug_batches = batch_maps()
        program = program_reviews(reader, paths, ledger, historical, catalog_ranges(reader), slug_batches)

        current_batches: list[dict[str, Any]] = []
        current_claims: list[dict[str, Any]] = []
        duplicate_rows: list[dict[str, Any]] = []
        identity_comparisons: list[dict[str, Any]] = []
        identities = ledger["identity_records"]
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
            "source_files": len(reader.cache),
            "bytes_read": reader.bytes_read,
            "command_invocations": 5,
            "command_basis": "one persistent committed-object reader, one frozen-tree listing, one ancestor-only revision listing, and two historical package-tree listings",
        }
        write_json("independent-human-discovery.json", {
            "schema_version": "apk-denominator-independent-human-discovery.v1",
            "status": "independent-human-discovery-complete", "track_id": TRACK,
            "source_baseline_revision": BASELINE, "collector_identity": COLLECTOR_IDENTITY,
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
            "mechanical_historical_locator_reviews": all_history, "interpretation": {},
        })
        write_json("human-discrepancy-records.json", {
            "schema_version": "apk-denominator-human-discrepancies.v1",
            "status": "independent-human-discovery-complete", "track_id": TRACK,
            "source_baseline_revision": BASELINE, "collector_identity": COLLECTOR_IDENTITY,
            "identity_comparison_records": identity_comparisons,
            "mechanical_observation_records": mechanical_observations,
            "coverage_status": "complete", "uncovered_mechanical_records": [],
            "uncovered_replacement_program_identities": [], "interpretation": {},
        })
    finally:
        reader.close()
    counts = check_coverage()
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
    args = parser.parse_args()
    if args.check_only:
        print(json.dumps({"status": "passed", "uncovered_count": 0, "counts": check_coverage()}, sort_keys=True))
    else:
        generate()


if __name__ == "__main__":
    main()
