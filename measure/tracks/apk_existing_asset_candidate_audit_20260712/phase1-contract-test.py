#!/usr/bin/env python3
"""Read-only contract for T8 Phase 1 base and mechanical metadata outputs.

The contract derives the effective candidate set from the frozen T2 Git object
and accepted T8 delta. It never reads candidate working-tree bytes or makes
content, caller, provenance, inspection, suitability, or disposition claims.
"""

import argparse
import base64
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path


TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
FREEZE_PATH = TRACK / "phase0-input-freeze-v1.json"
DELTA_PATH = TRACK / "accepted-denominator-delta-v1.json"
ROLE_MANIFEST_PATH = TRACK / "phase0-role-ownership-manifest-v1.json"
DISCOVERY_REPORT_PATH = TRACK / "phase0-denominator-discovery-report-v2.json"
CANDIDATE_DELTA_PATH = TRACK / "candidate-denominator-delta-v1.json"
EXPECTED_FREEZE_SHA256 = "d4bd3606c7c75f495f2d8486ea4220f48aefd9eb216689b765aa9d96f58f2a9b"
EXPECTED_DELTA_SHA256 = "71592625cbe09671937b7406afa38f3f59232c0345de455467121dc038863db2"
BASE_PATH = "measure/tracks/apk_source_denominator_inventory_20260712/asset-file-denominator.json"
BASE_PUBLICATION_REVISION = "ba95e6fb1db6acdaecd0808ca1f22dec339d6c5d"
BASE_RECORD_REVISION = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
DELTA_REVISION = "65fc00d872ce5aa63820662ee0a1f14952e63235"
BASE_DENOMINATOR_SHA256 = "41c9ede1a8e5ddab21b74a99959fbddc35b5f5a6902740a740a48f174bf7f438"
ROOT_COUNTS = {
    "apps/advantage-games/public": 250,
    "apps/reading-advantage/public/games": 105,
    "apps/primary-advantage/public/games": 0,
    "apps/advantage-games/measure": 72,
    "packages/codecamp-knowledge/fixtures/apk-guided": 1,
}
BASE_KEYS = {"schema_version", "track_id", "batch_id", "input_binding", "producer", "records", "resource_usage"}
BASE_RECORD_KEYS = {"canonical_path", "sha256", "identical_hash_group", "revision", "source_blob_oid", "file_kind", "relevance_rule_id"}
METADATA_KEYS = {"schema_version", "track_id", "batch_id", "input_binding", "producer", "records", "resource_usage"}
METADATA_RECORD_KEYS = {"canonical_path", "sha256", "revision", "source_blob_oid", "file_kind", "byte_size", "format", "mime_type", "detected_format", "detected_mime_type", "flags", "type_specific"}
FLAGS_KEYS = {"parse_status", "decode_status", "readability_status", "empty", "mislabeled", "text_risk"}
RECEIPT_KEYS = {"schema_version", "track_id", "batch_id", "role", "native_task_name", "declared_model", "fork_turns", "inherited_narrative", "allowed_input_manifest_sha256", "allowed_input_paths", "role_boundary", "output_file_hashes", "findings", "resource_usage", "final_status"}
CALLER_KEYS = {"schema_version", "track_id", "batch_id", "input_binding", "scan_contract", "producer", "records", "resource_usage"}
CALLER_RECORD_KEYS = {"canonical_path", "sha256", "revision", "source_blob_oid", "identical_hash_group", "duplicate_path_peers", "derived_public_url", "static_reference_status", "current_callers", "dynamic_risk", "unknown_rationale"}
CALLER_LOCATOR_KEYS = {"caller_revision", "caller_path", "line_start", "line_end", "locator_text_sha256", "matched_literal", "reference_kind", "use_classification"}
CALLER_SCAN_KEYS = {"algorithm_id", "algorithm_version", "caller_revision", "source_denominator", "token_kinds", "case_sensitive", "line_locator_policy", "overlap_policy", "excluded_caller_path_rules", "excluded_occurrence_digest_policy", "build_graph_used"}
CALLER_REFERENCE_KINDS = {"repo_path", "public_url", "relative_path", "import", "authoring_sidecar", "fixture", "other_exact"}
CALLER_USE_CLASSIFICATIONS = {"runtime_load", "ui_render", "style", "metadata_reference", "test_fixture", "authoring_reference", "unknown"}
CALLER_ZERO_MATCH_RATIONALE = "No case-sensitive fixed repo-path, public-URL, or relative-path literal was found in tracked text blobs at the pinned revision; dynamic or constructed references remain unresolved."
CALLER_SCAN_CONTRACT = {
    "algorithm_id": "apk-phase1-pinned-blob-rg-exact-literal",
    "algorithm_version": "2.2.0",
    "caller_revision": DELTA_REVISION,
    "source_denominator": "one git ls-tree -rlz enumeration of every blob at caller_revision; one git cat-file --batch materialization of those exact OIDs as regular files in a unique /tmp snapshot; exact path/OID/size reconciliation; one local rg --json --fixed-strings --file pattern-file --hidden --no-ignore scan with binary files suppressed by rg defaults; bytes_read is exact ls-tree bytes plus materialized blob bytes plus pattern bytes plus rg summary bytes_searched plus allocated base-input bytes",
    "excluded_caller_path_rules": [{"category": "root_measure", "path_prefix": "measure/"}, {"category": "app_measure", "path_regex": r"^apps/[^/]+/measure/"}],
    "excluded_occurrence_digest_policy": "SHA-256 of sorted canonical JSONL records containing canonical_path, caller_path, line_start, locator_text_sha256, matched_literal, and category; excluded Measure evidence stays in scan reconciliation but is never a current caller",
    "token_kinds": ["repo_path", "public_url", "relative_path"],
    "case_sensitive": True,
    "line_locator_policy": "one record per candidate/caller-path/line; SHA-256 of line bytes excluding terminator",
    "overlap_policy": "longest token; tie order repo_path, public_url, relative_path",
}


def fail(message: str) -> None:
    """Raise a stable contract assertion with a concise explanation.

    Args:
        message: The invariant that failed.

    Returns:
        This function does not return.
    """
    raise AssertionError(message)


def sha256_bytes(value: bytes) -> str:
    """Return the SHA-256 digest of bytes already supplied to the contract.

    Args:
        value: Bytes to digest.

    Returns:
        The lowercase SHA-256 hexadecimal digest.
    """
    return hashlib.sha256(value).hexdigest()


def load_json(path: Path) -> dict:
    """Load one JSON contract artifact.

    Args:
        path: Repository-relative artifact resolved as a local path.

    Returns:
        Parsed JSON object.

    Throws:
        AssertionError: When the JSON root is not an object.
    """
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        fail(f"JSON root must be an object: {path.relative_to(TRACK)}")
    return value


def git(*args: str) -> bytes:
    """Run a read-only Git object query from the canonical checkout.

    Args:
        args: Git arguments after the executable name.

    Returns:
        Standard output from Git.

    Throws:
        AssertionError: When Git cannot resolve a required pinned object.
    """
    result = subprocess.run(["git", *args], cwd=REPO, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if result.returncode:
        fail(f"git {' '.join(args)} failed: {result.stderr.decode().strip()}")
    return result.stdout


def require_exact_keys(value: dict, expected: set[str], label: str) -> None:
    """Reject unknown, omitted, or renamed JSON keys.

    Args:
        value: Object whose schema is being checked.
        expected: Exact permitted key set.
        label: Stable schema location for errors.

    Returns:
        Nothing.
    """
    actual = set(value)
    if actual != expected:
        fail(f"{label} keys differ; missing={sorted(expected - actual)} extra={sorted(actual - expected)}")


def require_enum(value: object, choices: set[object], label: str) -> None:
    """Require a member of a closed enumeration.

    Args:
        value: Candidate enum value.
        choices: Closed set of allowed values.
        label: Stable schema location for errors.

    Returns:
        Nothing.
    """
    if value not in choices:
        fail(f"{label} is not an allowed enum value")


def parse_git_tree(revision: str) -> dict[str, str]:
    """Map committed repository paths to Git blob OIDs without reading blob bytes.

    Args:
        revision: Commit or tree revision to inspect.

    Returns:
        Mapping of repository-relative path to blob object ID.
    """
    entries: dict[str, str] = {}
    for item in git("ls-tree", "-r", "-z", revision).split(b"\0"):
        if not item:
            continue
        metadata, path = item.split(b"\t", 1)
        mode, object_type, object_id = metadata.decode().split()
        if object_type == "blob":
            entries[path.decode()] = object_id
    return entries


def assert_freeze_chain() -> tuple[dict, dict, dict]:
    """Verify the frozen Phase 0 and accepted delta inputs before loading outputs.

    Returns:
        The freeze, accepted delta, and candidate delta JSON objects.
    """
    if sha256_bytes(FREEZE_PATH.read_bytes()) != EXPECTED_FREEZE_SHA256:
        fail("Phase 0 input-freeze SHA-256 drift")
    if sha256_bytes(DELTA_PATH.read_bytes()) != EXPECTED_DELTA_SHA256:
        fail("accepted denominator delta SHA-256 drift")
    freeze = load_json(FREEZE_PATH)
    accepted_delta = load_json(DELTA_PATH)
    manifest = load_json(ROLE_MANIFEST_PATH)
    if freeze["denominator"]["record_revision"] != DELTA_REVISION:
        fail("effective denominator revision drift")
    if (freeze["denominator"]["candidate_paths"], freeze["denominator"]["identical_hash_groups"]) != (428, 227):
        fail("effective denominator total drift")
    if {item["path"]: item["candidate_paths"] for item in freeze["denominator"]["roots"]} != ROOT_COUNTS:
        fail("frozen root counts drift")
    if manifest["allowed_input_manifest"]["sha256"] != EXPECTED_FREEZE_SHA256:
        fail("role manifest input binding drift")
    if accepted_delta["status"] != "accepted" or accepted_delta["consumable"] is not True:
        fail("accepted denominator delta is not consumable")
    candidate_path = REPO / accepted_delta["candidate"]["path"]
    if sha256_bytes(candidate_path.read_bytes()) != accepted_delta["candidate"]["sha256"]:
        fail("accepted denominator candidate binding drift")
    candidate_delta = load_json(candidate_path)
    if candidate_delta["base"]["sha256"] != BASE_DENOMINATOR_SHA256:
        fail("T2 base denominator binding drift")
    if candidate_delta["delta_revision"] != DELTA_REVISION:
        fail("candidate delta revision drift")
    return freeze, accepted_delta, candidate_delta


def effective_records(candidate_delta: dict) -> tuple[dict[str, dict], dict[str, str]]:
    """Derive the exact effective denominator and its committed blob bindings.

    Args:
        candidate_delta: Accepted candidate delta record.

    Returns:
        Effective path records and their committed-source blob IDs.
    """
    base_bytes = git("show", f"{BASE_PUBLICATION_REVISION}:{BASE_PATH}")
    if sha256_bytes(base_bytes) != BASE_DENOMINATOR_SHA256:
        fail("committed T2 base denominator bytes drift")
    base = json.loads(base_bytes)
    records = {item["canonical_path"]: dict(item) for item in base["candidate_files"]}
    changes = candidate_delta["changes"]
    for replacement in changes["replacements"]:
        current = records.get(replacement["canonical_path"])
        if current is None or current["sha256"] != replacement["prior_sha256"]:
            fail("accepted replacement does not match its frozen predecessor")
        records[replacement["canonical_path"]] = dict(replacement)
    for addition in changes["additions"]:
        if addition["canonical_path"] in records:
            fail("accepted addition duplicates a base path")
        records[addition["canonical_path"]] = dict(addition)
    if len(records) != 428 or len({item["identical_hash_group"] for item in records.values()}) != 227:
        fail("derived effective denominator count drift")
    base_tree = parse_git_tree(BASE_RECORD_REVISION)
    delta_tree = parse_git_tree(DELTA_REVISION)
    bindings: dict[str, str] = {}
    for path, record in records.items():
        revision = record["revision"]
        tree = base_tree if revision == BASE_RECORD_REVISION else delta_tree if revision == DELTA_REVISION else None
        if tree is None or path not in tree:
            fail(f"committed source binding missing: {path}")
        bindings[path] = tree[path]
    return records, bindings


def expected_batches(freeze: dict, records: dict[str, dict]) -> dict[str, set[str]]:
    """Derive immutable batch memberships from frozen hash-group boundaries.

    Args:
        freeze: Phase 0 input-freeze record.
        records: Effective denominator records keyed by canonical path.

    Returns:
        Mapping from frozen batch ID to its exact path set.
    """
    group_members: dict[str, set[str]] = {}
    for path, record in records.items():
        group_members.setdefault(record["identical_hash_group"], set()).add(path)
    sorted_groups = sorted(group_members)
    result: dict[str, set[str]] = {}
    consumed: set[str] = set()
    for batch in freeze["batch_strategy"]["batches"]:
        groups = [group for group in sorted_groups if batch["first_group"] <= group <= batch["last_group"]]
        paths = set().union(*(group_members[group] for group in groups))
        if (len(groups), len(paths)) != (batch["group_count"], batch["path_count"]):
            fail(f"frozen batch boundary no longer derives {batch['batch_id']}")
        if groups[0] != batch["first_group"] or groups[-1] != batch["last_group"]:
            fail(f"frozen batch endpoints no longer derive {batch['batch_id']}")
        if consumed & paths:
            fail("frozen batches overlap")
        consumed |= paths
        result[batch["batch_id"]] = paths
    if consumed != set(records):
        fail("frozen batches omit effective denominator paths")
    return result


def output_paths(batches: dict[str, set[str]], filename: str) -> dict[str, Path]:
    """Return the one exact output path permitted for each frozen batch.

    Args:
        batches: Frozen batch memberships.
        filename: Required producer filename.

    Returns:
        Mapping from batch ID to absolute expected artifact path.
    """
    return {batch_id: TRACK / "batches" / batch_id / filename for batch_id in batches}


def assert_exact_output_files(expected: dict[str, Path], filename: str) -> None:
    """Reject missing, renamed, or extra per-batch producer output files.

    Args:
        expected: Permitted output location per batch.
        filename: Filename being reconciled.

    Returns:
        Nothing.
    """
    actual = set((TRACK / "batches").glob(f"*/{filename}")) if (TRACK / "batches").exists() else set()
    if actual != set(expected.values()):
        fail(f"{filename} file set is not exactly the 12 frozen batch locations")


def input_binding() -> dict:
    """Return the fixed input binding required in every Phase 1 producer file.

    Returns:
        Expected immutable binding object.
    """
    return {
        "phase0_input_freeze_sha256": EXPECTED_FREEZE_SHA256,
        "base_denominator_sha256": BASE_DENOMINATOR_SHA256,
        "base_manifest_publication_revision": BASE_PUBLICATION_REVISION,
        "base_record_revision": BASE_RECORD_REVISION,
        "accepted_delta_sha256": EXPECTED_DELTA_SHA256,
        "delta_revision": DELTA_REVISION,
        "effective_candidate_paths": 428,
        "effective_identical_hash_groups": 227,
    }


def assert_usage(usage: dict, expected_paths: int, expected_groups: int, ceiling: int, label: str) -> None:
    """Require measured resource use within the immutable per-batch ceiling.

    Args:
        usage: Producer's measured resource object.
        expected_paths: Frozen candidate-path count for the batch.
        expected_groups: Frozen hash-group count for the batch.
        ceiling: Immutable byte ceiling for the role.
        label: Stable error location.

    Returns:
        Nothing.
    """
    require_exact_keys(usage, {"candidate_paths", "hash_groups", "command_invocations", "bytes_read", "within_ceiling"}, label)
    if (usage["candidate_paths"], usage["hash_groups"], usage["within_ceiling"]) != (expected_paths, expected_groups, True):
        fail(f"{label} frozen counts or ceiling attestation differ")
    if not all(isinstance(usage[key], int) and usage[key] >= 0 for key in ("command_invocations", "bytes_read")):
        fail(f"{label} resource values must be nonnegative integers")
    if usage["command_invocations"] > 80 or usage["bytes_read"] > ceiling:
        fail(f"{label} immutable resource ceiling exceeded")


def assert_base_artifact(path: Path, batch_id: str, expected_paths: set[str], records: dict[str, dict], bindings: dict[str, str]) -> None:
    """Validate one evidence-collector base record file against frozen records.

    Args:
        path: Base-record artifact path.
        batch_id: Frozen batch ID.
        expected_paths: Exact paths allocated to the batch.
        records: Effective denominator records.
        bindings: Committed source blob bindings.

    Returns:
        Nothing.
    """
    artifact = load_json(path)
    require_exact_keys(artifact, BASE_KEYS, f"{batch_id} base artifact")
    if (artifact["schema_version"], artifact["track_id"], artifact["batch_id"]) != ("apk-asset-forensics.phase1-candidate-record-base.v1", "apk_existing_asset_candidate_audit_20260712", batch_id):
        fail(f"{batch_id} base artifact identity differs")
    if artifact["input_binding"] != input_binding():
        fail(f"{batch_id} base artifact input binding differs")
    expected_producer = {"role": "evidence-collector", "receipt_path": "role-receipts/phase1/evidence-collector.json"}
    if artifact["producer"] != expected_producer:
        fail(f"{batch_id} base artifact producer role differs")
    if not isinstance(artifact["records"], list):
        fail(f"{batch_id} base records must be a list")
    seen: set[str] = set()
    group_to_batch: dict[str, str] = {}
    for item in artifact["records"]:
        if not isinstance(item, dict):
            fail(f"{batch_id} base record is not an object")
        require_exact_keys(item, BASE_RECORD_KEYS, f"{batch_id} base record")
        candidate = records.get(item["canonical_path"])
        if candidate is None:
            fail(f"{batch_id} base record has non-denominator path")
        expected = {
            "canonical_path": item["canonical_path"], "sha256": candidate["sha256"],
            "identical_hash_group": candidate["identical_hash_group"], "revision": candidate["revision"],
            "source_blob_oid": bindings[item["canonical_path"]], "file_kind": candidate["file_kind"],
            "relevance_rule_id": candidate["relevance_rule_id"],
        }
        if item != expected:
            fail(f"{batch_id} base record does not exactly bind committed source: {item['canonical_path']}")
        if item["canonical_path"] in seen:
            fail(f"{batch_id} base record duplicates a path")
        seen.add(item["canonical_path"])
        prior = group_to_batch.setdefault(item["identical_hash_group"], batch_id)
        if prior != batch_id:
            fail(f"{batch_id} base record splits an identical-hash group")
    if seen != expected_paths:
        fail(f"{batch_id} base record paths do not exactly match frozen batch membership")
    group_count = len({records[item]["identical_hash_group"] for item in expected_paths})
    assert_usage(artifact["resource_usage"], len(expected_paths), group_count, 536870912, f"{batch_id} base resource usage")


def assert_flags(flags: dict, kind: str, label: str) -> None:
    """Require explicit mechanical readability and risk state for one path.

    Args:
        flags: Record flags object.
        kind: Frozen file kind.
        label: Stable record location.

    Returns:
        Nothing.
    """
    require_exact_keys(flags, FLAGS_KEYS, f"{label} flags")
    require_enum(flags["parse_status"], {"passed", "failed", "not_applicable"}, f"{label} parse_status")
    require_enum(flags["decode_status"], {"passed", "failed", "not_applicable"}, f"{label} decode_status")
    require_enum(flags["readability_status"], {"readable", "unreadable"}, f"{label} readability_status")
    require_enum(flags["text_risk"], {"none_detected", "possible", "confirmed", "not_applicable"}, f"{label} text_risk")
    if not isinstance(flags["empty"], bool) or not isinstance(flags["mislabeled"], bool):
        fail(f"{label} empty and mislabeled flags must be explicit booleans")
    if kind == "data" and flags["parse_status"] == "not_applicable":
        fail(f"{label} data parse result is not explicit")


def assert_type_specific(record: dict, label: str) -> None:
    """Require closed image, audio, video, or data metadata for the MIME type.

    Args:
        record: Mechanical metadata record.
        label: Stable record location.

    Returns:
        Nothing.
    """
    mime = record["mime_type"]
    fields = record["type_specific"]
    flags = record["flags"]
    if not isinstance(fields, dict):
        fail(f"{label} type_specific must be an object")
    if mime.startswith("image/"):
        require_exact_keys(fields, {"width", "height", "has_alpha", "color_model"}, f"{label} image metadata")
        if flags["readability_status"] == "readable" and (not isinstance(fields["width"], int) or fields["width"] <= 0 or not isinstance(fields["height"], int) or fields["height"] <= 0):
            fail(f"{label} image dimensions are malformed")
        if fields["has_alpha"] is not None and not isinstance(fields["has_alpha"], bool):
            fail(f"{label} image alpha value is malformed")
        return
    if mime.startswith("audio/"):
        require_exact_keys(fields, {"duration_ms", "channels", "sample_rate_hz", "codec"}, f"{label} audio metadata")
        if flags["decode_status"] == "passed" and (not isinstance(fields["duration_ms"], int) or fields["duration_ms"] <= 0 or not isinstance(fields["channels"], int) or fields["channels"] <= 0 or not isinstance(fields["sample_rate_hz"], int) or fields["sample_rate_hz"] <= 0 or not isinstance(fields["codec"], str) or not fields["codec"]):
            fail(f"{label} audio metadata is incomplete")
        return
    if mime.startswith("video/"):
        require_exact_keys(fields, {"width", "height", "duration_ms", "codec"}, f"{label} video metadata")
        if flags["decode_status"] == "passed" and (not isinstance(fields["width"], int) or fields["width"] <= 0 or not isinstance(fields["height"], int) or fields["height"] <= 0 or not isinstance(fields["duration_ms"], int) or fields["duration_ms"] <= 0 or not isinstance(fields["codec"], str) or not fields["codec"]):
            fail(f"{label} video metadata is incomplete")
        return
    require_exact_keys(fields, {"encoding", "parse_format", "top_level_type"}, f"{label} data metadata")
    if flags["parse_status"] == "passed" and (not isinstance(fields["encoding"], str) or not fields["encoding"] or not isinstance(fields["parse_format"], str) or not fields["parse_format"] or not isinstance(fields["top_level_type"], str) or not fields["top_level_type"]):
        fail(f"{label} data metadata is incomplete")


def assert_metadata_artifact(path: Path, batch_id: str, expected_paths: set[str], records: dict[str, dict], bindings: dict[str, str]) -> None:
    """Validate one mechanical-metadata file against the base denominator.

    Args:
        path: Mechanical metadata artifact path.
        batch_id: Frozen batch ID.
        expected_paths: Exact paths allocated to the batch.
        records: Effective denominator records.
        bindings: Committed source blob bindings.

    Returns:
        Nothing.
    """
    artifact = load_json(path)
    require_exact_keys(artifact, METADATA_KEYS, f"{batch_id} metadata artifact")
    if (artifact["schema_version"], artifact["track_id"], artifact["batch_id"]) != ("apk-asset-forensics.phase1-mechanical-metadata.v1", "apk_existing_asset_candidate_audit_20260712", batch_id):
        fail(f"{batch_id} metadata artifact identity differs")
    if artifact["input_binding"] != input_binding():
        fail(f"{batch_id} metadata artifact input binding differs")
    expected_producer = {"role": "mechanical-metadata-inspector", "receipt_path": "role-receipts/phase1/mechanical-metadata-inspector.json"}
    if artifact["producer"] != expected_producer:
        fail(f"{batch_id} metadata artifact producer role differs")
    if not isinstance(artifact["records"], list):
        fail(f"{batch_id} metadata records must be a list")
    seen: set[str] = set()
    for item in artifact["records"]:
        if not isinstance(item, dict):
            fail(f"{batch_id} metadata record is not an object")
        require_exact_keys(item, METADATA_RECORD_KEYS, f"{batch_id} metadata record")
        candidate = records.get(item["canonical_path"])
        if candidate is None:
            fail(f"{batch_id} metadata record has non-denominator path")
        source_format = candidate["format_metadata"]
        for key, expected in (("sha256", candidate["sha256"]), ("revision", candidate["revision"]), ("source_blob_oid", bindings[item["canonical_path"]]), ("file_kind", candidate["file_kind"]), ("byte_size", source_format["byte_size"]), ("format", source_format["format"]), ("mime_type", source_format["mime_type"])):
            if item[key] != expected:
                fail(f"{batch_id} metadata record has stale or mismatched {key}: {item['canonical_path']}")
        if item["canonical_path"] in seen:
            fail(f"{batch_id} metadata record duplicates a path")
        seen.add(item["canonical_path"])
        assert_flags(item["flags"], item["file_kind"], f"{batch_id} {item['canonical_path']}")
        for key in ("detected_format", "detected_mime_type"):
            if item[key] is not None and (not isinstance(item[key], str) or not item[key]):
                fail(f"{batch_id} {item['canonical_path']} {key} must be a nonempty string or null")
        expected_mislabeled = item["detected_format"] != item["format"] or item["detected_mime_type"] != item["mime_type"]
        if item["flags"]["mislabeled"] is not expected_mislabeled:
            fail(f"{batch_id} {item['canonical_path']} mislabeled flag contradicts detected format")
        assert_type_specific(item, f"{batch_id} {item['canonical_path']}")
    if seen != expected_paths:
        fail(f"{batch_id} metadata paths do not exactly match frozen batch membership")
    group_count = len({records[item]["identical_hash_group"] for item in expected_paths})
    assert_usage(artifact["resource_usage"], len(expected_paths), group_count, 268435456, f"{batch_id} metadata resource usage")


def derived_public_url(path: str) -> str | None:
    """Derive the public URL for a candidate below an application public root.

    Args:
        path: Repository-relative candidate path.

    Returns:
        Leading-slash public URL, or None outside a public root.
    """
    marker = "/public/"
    if marker not in path:
        return None
    return "/" + path.split(marker, 1)[1]


def literal_tokens(path: str) -> list[tuple[str, str]]:
    """Derive the frozen ordered exact-literal tokens for one candidate path.

    Args:
        path: Repository-relative candidate path.

    Returns:
        Unique reference-kind and literal pairs in deterministic priority order.
    """
    tokens = [("repo_path", path)]
    public_url = derived_public_url(path)
    if public_url is not None:
        tokens.extend((("public_url", public_url), ("relative_path", public_url[1:])))
    unique: list[tuple[str, str]] = []
    seen: set[str] = set()
    for kind, literal in tokens:
        if literal and literal not in seen:
            seen.add(literal)
            unique.append((kind, literal))
    return unique


def caller_exclusion_category(caller_path: str) -> str | None:
    """Classify only the two closed Measure-owned evidence path zones.

    Args:
        caller_path: Pinned repository path containing a literal occurrence.

    Returns:
        Closed exclusion category, or None for a qualifying caller source.
    """
    if caller_path.startswith("measure/"):
        return "root_measure"
    if re.match(r"^apps/[^/]+/measure/", caller_path):
        return "app_measure"
    return None


def excluded_occurrence_disclosure(records: list[dict]) -> dict:
    """Bind excluded audit-evidence occurrences to one deterministic digest.

    Args:
        records: Exact excluded occurrence records.

    Returns:
        Aggregate counts and SHA-256 disclosure for the producer receipt.
    """
    ordered = sorted(records, key=lambda item: (item["canonical_path"], item["caller_path"], item["line_start"], item["locator_text_sha256"], item["matched_literal"], item["category"]))
    payload = b"".join(json.dumps(item, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n" for item in ordered)
    counts = {category: sum(item["category"] == category for item in ordered) for category in ("root_measure", "app_measure")}
    return {
        "finding_id": "excluded-measure-evidence-literal-occurrences",
        "root_measure_occurrences": counts["root_measure"],
        "app_measure_occurrences": counts["app_measure"],
        "total_occurrences": len(ordered),
        "occurrence_sha256": sha256_bytes(payload),
    }


def classify_caller_use(caller_path: str, line: bytes) -> str:
    """Classify one cited line using frozen syntax-only rules.

    Args:
        caller_path: Pinned repository path containing the line.
        line: Exact line bytes without a terminator.

    Returns:
        One deterministic non-semantic caller-use classification.
    """
    value = line.decode("utf-8", errors="replace")
    lower_path = caller_path.lower()
    if re.search(r"(^|[/. _-])(test|spec|fixture)([/. _-]|$)", lower_path):
        return "test_fixture"
    if lower_path.endswith((".css", ".scss", ".sass", ".less")):
        return "style"
    if re.match(r"\s*import\b", value) or re.search(r"\brequire\s*\(", value):
        return "runtime_load"
    if re.search(r"\b(?:src|href|poster)\s*=\s*['\"]", value) or re.search(r"\b(?:backgroundImage|background)\s*:", value):
        return "ui_render"
    if lower_path.endswith((".json", ".yaml", ".yml", ".toml", ".md")):
        return "metadata_reference"
    return "unknown"


def pinned_blob_entries() -> tuple[list[tuple[str, str, int]], int]:
    """Enumerate every blob in the pinned caller tree.

    Returns:
        Sorted path, object ID, and size entries plus raw manifest bytes read.
    """
    result = subprocess.run(
        ["git", "ls-tree", "-rlz", "--full-tree", DELTA_REVISION],
        cwd=REPO,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode:
        fail(f"pinned caller tree enumeration failed: {result.stderr.decode(errors='replace').strip()}")
    entries: list[tuple[str, str, int]] = []
    seen: set[str] = set()
    for raw_entry in result.stdout.split(b"\0"):
        if not raw_entry:
            continue
        try:
            metadata, raw_path = raw_entry.split(b"\t", 1)
            _mode, kind, raw_oid, raw_size = metadata.split(b" ", 3)
            candidate_path = raw_path.decode("utf-8")
        except (UnicodeDecodeError, ValueError) as error:
            fail(f"pinned caller tree entry is malformed: {error}")
        if kind != b"blob":
            continue
        parts = Path(candidate_path).parts
        if not candidate_path or candidate_path.startswith("/") or any(part in ("", ".", "..") for part in parts) or "\x00" in candidate_path:
            fail("pinned caller tree contains an unsafe blob path")
        if candidate_path in seen:
            fail("pinned caller tree duplicates a blob path")
        oid = raw_oid.decode("ascii")
        if not re.fullmatch(r"[0-9a-f]{40}", oid):
            fail("pinned caller tree contains an invalid blob OID")
        try:
            size = int(raw_size)
        except ValueError:
            fail("pinned caller tree contains an invalid blob size")
        if size < 0:
            fail("pinned caller tree contains a negative blob size")
        seen.add(candidate_path)
        entries.append((candidate_path, oid, size))
    entries.sort()
    if not entries:
        fail("pinned caller tree contains no blobs")
    return entries, len(result.stdout)


def materialize_pinned_blobs(snapshot: Path, entries: list[tuple[str, str, int]]) -> int:
    """Materialize exact pinned blob OIDs as safe regular files.

    Args:
        snapshot: Unique temporary snapshot directory.
        entries: Exact path, OID, and size manifest.

    Returns:
        Exact number of materialized blob bytes.
    """
    process = subprocess.Popen(
        ["git", "cat-file", "--batch"],
        cwd=REPO,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if process.stdin is None or process.stdout is None or process.stderr is None:
        fail("pinned blob materializer pipes are unavailable")
    materialized_bytes = 0
    for candidate_path, expected_oid, expected_size in entries:
        process.stdin.write(expected_oid.encode("ascii") + b"\n")
        process.stdin.flush()
        header = process.stdout.readline().rstrip(b"\n").split()
        if len(header) != 3:
            fail(f"pinned blob materializer returned a malformed header: {candidate_path}")
        observed_oid, kind, raw_size = header
        if observed_oid.decode("ascii") != expected_oid or kind != b"blob" or int(raw_size) != expected_size:
            fail(f"pinned blob materializer binding differs: {candidate_path}")
        content = process.stdout.read(expected_size)
        terminator = process.stdout.read(1)
        if len(content) != expected_size or terminator != b"\n":
            fail(f"pinned blob materializer truncated a blob: {candidate_path}")
        target = snapshot / candidate_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        if not target.is_file() or target.is_symlink() or target.stat().st_size != expected_size:
            fail(f"pinned blob materializer did not create an exact regular file: {candidate_path}")
        materialized_bytes += expected_size
    process.stdin.close()
    process.stdout.close()
    status = process.wait()
    stderr = process.stderr.read().decode(errors="replace").strip()
    if status:
        fail(f"pinned blob materializer failed: {stderr}")
    observed_paths = sorted(str(item.relative_to(snapshot)) for item in snapshot.rglob("*") if item.is_file())
    if observed_paths != [candidate_path for candidate_path, _oid, _size in entries]:
        fail("pinned blob materialization path set differs from the committed blob tree")
    return materialized_bytes


def rederive_literal_callers(records: dict[str, dict]) -> tuple[dict[str, list[dict]], dict[str, object]]:
    """Rederive every fixed literal caller from exact pinned blobs.

    Args:
        records: Effective denominator records keyed by canonical path.

    Returns:
        Expected locator map and exact shared scan resource metrics.

    Throws:
        AssertionError: When pinned materialization or local JSON scan fails.
    """
    token_owners: dict[str, list[tuple[str, str, int]]] = {}
    kind_rank = {"repo_path": 0, "public_url": 1, "relative_path": 2}
    for candidate_path in records:
        for kind, literal in literal_tokens(candidate_path):
            token_owners.setdefault(literal, []).append((candidate_path, kind, kind_rank[kind]))
    literals = sorted(token_owners)
    if any("\n" in literal or "\r" in literal for literal in literals):
        fail("caller literal cannot be represented in the exact-literal pattern file")
    expected: dict[str, list[dict]] = {candidate_path: [] for candidate_path in records}
    excluded: list[dict] = []
    entries, tree_manifest_bytes = pinned_blob_entries()
    with tempfile.TemporaryDirectory(prefix="apk-phase1-caller-v21-", dir="/tmp") as temporary_root:
        snapshot = Path(temporary_root) / "snapshot"
        snapshot.mkdir()
        blob_bytes = materialize_pinned_blobs(snapshot, entries)
        pattern_path = Path(temporary_root) / "exact-literals.txt"
        pattern_bytes = b"".join(literal.encode("utf-8") + b"\n" for literal in literals)
        pattern_path.write_bytes(pattern_bytes)
        result = subprocess.run(
            ["rg", "--json", "--fixed-strings", "--file", str(pattern_path), "--hidden", "--no-ignore", "."],
            cwd=snapshot,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if result.returncode not in (0, 1):
            fail(f"deterministic pinned caller scan failed: {result.stderr.decode(errors='replace').strip()}")
        rg_bytes_searched: int | None = None
        for raw_event in result.stdout.splitlines():
            event = json.loads(raw_event)
            if event.get("type") == "summary":
                stats = event.get("data", {}).get("stats", {})
                value = stats.get("bytes_searched")
                if not isinstance(value, int) or value < 0:
                    fail("deterministic pinned caller scan lacks exact bytes_searched")
                rg_bytes_searched = value
                continue
            if event.get("type") != "match":
                continue
            data = event.get("data")
            if not isinstance(data, dict):
                fail("deterministic pinned caller scan returned malformed match data")
            caller_path = rg_json_bytes(data.get("path"), "caller path").decode("utf-8")
            if caller_path.startswith("./"):
                caller_path = caller_path[2:]
            if not caller_path or caller_path.startswith("/") or caller_path.startswith("../"):
                fail("deterministic pinned caller scan returned a non-snapshot-relative path")
            line_number = data.get("line_number")
            if not isinstance(line_number, int) or line_number < 1:
                fail("deterministic pinned caller scan returned an invalid line number")
            locator_text = strip_line_terminator(rg_json_bytes(data.get("lines"), "line text"))
            matches: dict[str, list[tuple[int, int, str, str]]] = {}
            for literal, owners in token_owners.items():
                if literal.encode("utf-8") not in locator_text:
                    continue
                for candidate_path, kind, rank in owners:
                    matches.setdefault(candidate_path, []).append((-len(literal), rank, kind, literal))
            for candidate_path, candidates in matches.items():
                _, _, reference_kind, literal = sorted(candidates)[0]
                locator_hash = sha256_bytes(locator_text)
                category = caller_exclusion_category(caller_path)
                if category is not None:
                    excluded.append({
                        "canonical_path": candidate_path,
                        "caller_path": caller_path,
                        "line_start": line_number,
                        "locator_text_sha256": locator_hash,
                        "matched_literal": literal,
                        "category": category,
                    })
                    continue
                expected[candidate_path].append({
                    "caller_revision": DELTA_REVISION,
                    "caller_path": caller_path,
                    "line_start": line_number,
                    "line_end": line_number,
                    "locator_text_sha256": locator_hash,
                    "matched_literal": literal,
                    "reference_kind": reference_kind,
                    "use_classification": classify_caller_use(caller_path, locator_text),
                })
        if rg_bytes_searched is None:
            fail("deterministic pinned caller scan lacks a summary event")
    for locators in expected.values():
        locators.sort(key=lambda item: (item["caller_path"], item["line_start"], item["matched_literal"]))
    return expected, {
        "blob_count": len(entries),
        "tree_manifest_bytes": tree_manifest_bytes,
        "blob_bytes": blob_bytes,
        "pattern_bytes": len(pattern_bytes),
        "rg_bytes_searched": rg_bytes_searched,
        "command_invocations": 3,
        "excluded_disclosure": excluded_occurrence_disclosure(excluded),
    }

def rg_json_bytes(value: object, label: str) -> bytes:
    """Decode one Ripgrep JSON text-or-bytes value without changing its bytes.

    Args:
        value: Ripgrep JSON content object for a path or matched line.
        label: Stable description used in contract failures.

    Returns:
        Exact UTF-8 or base64-decoded bytes from the Ripgrep event.
    """
    if not isinstance(value, dict) or set(value) != ({"text"} if "text" in value else {"bytes"}):
        fail(f"deterministic archived caller scan returned malformed {label}")
    if "text" in value:
        text = value["text"]
        if not isinstance(text, str):
            fail(f"deterministic archived caller scan returned non-text {label}")
        return text.encode("utf-8")
    encoded = value["bytes"]
    if not isinstance(encoded, str):
        fail(f"deterministic archived caller scan returned non-base64 {label}")
    try:
        return base64.b64decode(encoded, validate=True)
    except ValueError as error:
        fail(f"deterministic archived caller scan returned invalid base64 {label}: {error}")


def strip_line_terminator(line: bytes) -> bytes:
    """Remove one physical line terminator while preserving all other line bytes.

    Args:
        line: Exact matched-line bytes from Ripgrep JSON.

    Returns:
        The line bytes without one trailing LF, CRLF, or CR terminator.
    """
    if line.endswith(b"\r\n"):
        return line[:-2]
    if line.endswith((b"\n", b"\r")):
        return line[:-1]
    return line


def caller_resource_expectations(batches: dict[str, set[str]], base_outputs: dict[str, Path], expected_callers: dict[str, list[dict]], metrics: dict[str, object]) -> tuple[dict[str, dict], dict]:
    """Derive exact per-batch and aggregate caller resource accounting.

    Args:
        batches: Frozen batch memberships.
        base_outputs: Exact candidate base inputs by batch.
        expected_callers: Independently rederived caller locators.
        metrics: Exact pinned materialization and scan measurements.

    Returns:
        Per-batch usage and aggregate receipt usage.
    """
    shared_bytes = metrics["tree_manifest_bytes"] + metrics["blob_bytes"] + metrics["pattern_bytes"] + metrics["rg_bytes_searched"]
    batch_ids = sorted(batches)
    quotient, remainder = divmod(shared_bytes, len(batch_ids))
    per_batch: dict[str, dict] = {}
    global_sources: set[str] = set()
    total_callers = 0
    for index, batch_id in enumerate(batch_ids):
        locators = [locator for candidate_path in sorted(batches[batch_id]) for locator in expected_callers[candidate_path]]
        sources = {locator["caller_path"] for locator in locators}
        global_sources |= sources
        total_callers += len(locators)
        per_batch[batch_id] = {
            "candidate_paths": len(batches[batch_id]),
            "source_files": len(sources),
            "caller_records": len(locators),
            "command_invocations": metrics["command_invocations"],
            "bytes_read": quotient + int(index < remainder) + base_outputs[batch_id].stat().st_size,
            "within_ceiling": True,
        }
    aggregate = {
        "batch_count": len(batch_ids),
        "candidate_paths": sum(len(paths) for paths in batches.values()),
        "source_files": len(global_sources),
        "caller_records": total_callers,
        "command_invocations": metrics["command_invocations"],
        "bytes_read": sum(usage["bytes_read"] for usage in per_batch.values()),
        "within_ceiling": True,
    }
    return per_batch, aggregate


def assert_caller_usage(usage: dict, expected: dict, label: str) -> None:
    """Require exact caller-analysis resources within the frozen ceiling.

    Args:
        usage: Caller producer resource record.
        expected: Exact independently derived usage values.
        label: Stable schema location.

    Returns:
        Nothing.
    """
    require_exact_keys(usage, {"candidate_paths", "source_files", "caller_records", "command_invocations", "bytes_read", "within_ceiling"}, label)
    if usage != expected:
        fail(f"{label} differs from exact pinned-scan accounting")
    if usage["source_files"] > 600 or usage["caller_records"] > 800 or usage["command_invocations"] > 120 or usage["bytes_read"] > 268435456:
        fail(f"{label} immutable resource ceiling exceeded")

def assert_caller_artifact(path: Path, batch_id: str, expected_paths: set[str], records: dict[str, dict], bindings: dict[str, str], group_members: dict[str, set[str]], expected_callers: dict[str, list[dict]], expected_usage: dict) -> bool:
    """Validate one caller inventory against frozen paths and committed literals.

    Args:
        path: Caller inventory artifact path.
        batch_id: Frozen batch ID.
        expected_paths: Exact paths allocated to this batch.
        records: Effective denominator records.
        bindings: Candidate committed-source blob bindings.
        group_members: Exact identical-hash membership map.
        expected_callers: Independently rederived literal caller locators.
        expected_usage: Exact resource accounting for this batch.

    Returns:
        Whether the producer declared build-graph usage.
    """
    artifact = load_json(path)
    require_exact_keys(artifact, CALLER_KEYS, f"{batch_id} caller artifact")
    if (artifact["schema_version"], artifact["track_id"], artifact["batch_id"]) != ("apk-asset-forensics.phase1-caller-inventory.v4", "apk_existing_asset_candidate_audit_20260712", batch_id):
        fail(f"{batch_id} caller artifact identity differs")
    if artifact["input_binding"] != input_binding():
        fail(f"{batch_id} caller artifact input binding differs")
    if artifact["producer"] != {"role": "caller-analyst", "receipt_path": "role-receipts/phase1/caller-analyst.json"}:
        fail(f"{batch_id} caller artifact producer role differs")
    scan = artifact["scan_contract"]
    require_exact_keys(scan, CALLER_SCAN_KEYS, f"{batch_id} caller scan contract")
    for key, value in CALLER_SCAN_CONTRACT.items():
        if scan[key] != value:
            fail(f"{batch_id} caller scan contract {key} differs")
    if not isinstance(scan["build_graph_used"], bool):
        fail(f"{batch_id} caller build_graph_used must be a boolean")
    if not isinstance(artifact["records"], list):
        fail(f"{batch_id} caller records must be a list")
    seen: set[str] = set()
    cited_count = 0
    for item in artifact["records"]:
        if not isinstance(item, dict):
            fail(f"{batch_id} caller record is not an object")
        require_exact_keys(item, CALLER_RECORD_KEYS, f"{batch_id} caller record")
        candidate_path = item["canonical_path"]
        candidate = records.get(candidate_path)
        if candidate is None:
            fail(f"{batch_id} caller record has non-denominator path")
        expected_core = {
            "canonical_path": candidate_path,
            "sha256": candidate["sha256"],
            "revision": candidate["revision"],
            "source_blob_oid": bindings[candidate_path],
            "identical_hash_group": candidate["identical_hash_group"],
        }
        for key, value in expected_core.items():
            if item[key] != value:
                fail(f"{batch_id} caller record has stale {key}: {candidate_path}")
        peers = sorted(group_members[candidate["identical_hash_group"]] - {candidate_path})
        if item["duplicate_path_peers"] != peers:
            fail(f"{batch_id} caller record duplicate peers differ: {candidate_path}")
        if item["derived_public_url"] != derived_public_url(candidate_path):
            fail(f"{batch_id} caller record public URL differs: {candidate_path}")
        require_enum(item["static_reference_status"], {"found", "none_found", "dynamic_unresolved"}, f"{batch_id} caller static_reference_status")
        if not isinstance(item["dynamic_risk"], bool):
            fail(f"{batch_id} caller dynamic_risk must be a boolean")
        if item["unknown_rationale"] is not None and (not isinstance(item["unknown_rationale"], str) or not item["unknown_rationale"].strip()):
            fail(f"{batch_id} caller unknown_rationale must be nonempty or null")
        if not isinstance(item["current_callers"], list):
            fail(f"{batch_id} current_callers must be a list")
        normalized: list[dict] = []
        locator_keys: set[tuple] = set()
        for caller in item["current_callers"]:
            if not isinstance(caller, dict):
                fail(f"{batch_id} caller locator is not an object")
            require_exact_keys(caller, CALLER_LOCATOR_KEYS, f"{batch_id} caller locator")
            require_enum(caller["reference_kind"], CALLER_REFERENCE_KINDS, f"{batch_id} caller reference_kind")
            require_enum(caller["use_classification"], CALLER_USE_CLASSIFICATIONS, f"{batch_id} caller use_classification")
            locator_key = tuple(caller[key] for key in ("caller_revision", "caller_path", "line_start", "line_end", "locator_text_sha256", "matched_literal"))
            if locator_key in locator_keys:
                fail(f"{batch_id} caller locator duplicates a citation: {candidate_path}")
            locator_keys.add(locator_key)
            normalized.append(caller)
        expected_normalized = expected_callers[candidate_path]
        if normalized != expected_normalized:
            fail(f"{batch_id} caller locator set or classification differs from committed literal evidence: {candidate_path}")
        cited_count += len(normalized)
        has_static = bool(expected_normalized)
        status = item["static_reference_status"]
        if has_static:
            if (status, item["dynamic_risk"], item["unknown_rationale"]) != ("found", False, None):
                fail(f"{batch_id} static caller status contradicts evidence: {candidate_path}")
        elif (status, item["dynamic_risk"], item["unknown_rationale"]) != ("dynamic_unresolved", True, CALLER_ZERO_MATCH_RATIONALE):
            fail(f"{batch_id} zero-match status is not the frozen explicitly unresolved state: {candidate_path}")
        if candidate_path in seen:
            fail(f"{batch_id} caller inventory duplicates a candidate")
        seen.add(candidate_path)
    if seen != expected_paths:
        fail(f"{batch_id} caller inventory paths do not exactly match frozen batch membership")
    assert_caller_usage(artifact["resource_usage"], expected_usage, f"{batch_id} caller resource usage")
    return scan["build_graph_used"]


def assert_caller_receipt(path: Path, outputs: dict[str, Path], base_outputs: dict[str, Path], build_graph_used: bool, expected_usage: dict, expected_disclosure: dict) -> None:
    """Require one proportional native caller-analyst receipt for all 12 outputs.

    Args:
        path: Aggregate caller receipt path.
        outputs: Exact caller inventory output paths.
        base_outputs: Exact candidate base input paths.
        build_graph_used: Whether all batch artifacts attest build-graph use.
        expected_usage: Exact aggregate resource accounting.
        expected_disclosure: Exact excluded Measure-evidence reconciliation.

    Returns:
        Nothing.
    """
    receipt = load_json(path)
    require_exact_keys(receipt, RECEIPT_KEYS, "phase1 caller-analyst receipt")
    identity = (receipt["schema_version"], receipt["track_id"], receipt["batch_id"], receipt["role"], receipt["declared_model"], receipt["fork_turns"], receipt["inherited_narrative"], receipt["allowed_input_manifest_sha256"], receipt["final_status"])
    if identity != ("apk-role-receipt.v1", "apk_existing_asset_candidate_audit_20260712", "phase1", "caller-analyst", "gpt-5.6-terra", "none", False, EXPECTED_FREEZE_SHA256, "pass"):
        fail("phase1 caller-analyst receipt identity or isolation differs")
    if not isinstance(receipt["native_task_name"], str) or not receipt["native_task_name"] or not isinstance(receipt["role_boundary"], str) or not receipt["role_boundary"]:
        fail("phase1 caller-analyst receipt lacks native provenance")
    allowed_inputs = [str(FREEZE_PATH.relative_to(REPO)), *(str(output.relative_to(REPO)) for output in base_outputs.values()), f"git-tree:{DELTA_REVISION}"]
    if build_graph_used:
        if not (REPO / "graph.db").is_file():
            fail("caller-analyst claims build-graph use but graph.db is absent")
        allowed_inputs.append("graph.db")
    if receipt["allowed_input_paths"] != allowed_inputs:
        fail("phase1 caller-analyst receipt allowed inputs differ")
    expected_hashes = {str(output.relative_to(REPO)): sha256_bytes(output.read_bytes()) for output in outputs.values()}
    if receipt["output_file_hashes"] != expected_hashes:
        fail("phase1 caller-analyst receipt does not bind exactly all 12 outputs")
    require_exact_keys(receipt["findings"], {"critical", "high", "medium", "low"}, "phase1 caller-analyst findings")
    if any(receipt["findings"][level] for level in ("critical", "high", "medium")):
        fail("phase1 caller-analyst receipt has unresolved blocking findings")
    if receipt["findings"]["low"] != [expected_disclosure]:
        fail("phase1 caller-analyst receipt exclusion disclosure differs")
    usage = receipt["resource_usage"]
    require_exact_keys(usage, {"batch_count", "candidate_paths", "source_files", "caller_records", "command_invocations", "bytes_read", "within_ceiling"}, "phase1 caller-analyst receipt resource usage")
    if usage != expected_usage:
        fail("phase1 caller-analyst aggregate usage differs from exact pinned-scan accounting")
    if usage["source_files"] > 7200 or usage["caller_records"] > 9600 or usage["command_invocations"] > 1440 or usage["bytes_read"] > 3221225472:
        fail("phase1 caller-analyst aggregate resource ceiling exceeded")


def allowed_inputs_for_role(role: str, outputs: dict[str, Path]) -> list[str]:
    """Return the closed, role-specific input locator list for one producer.

    Args:
        role: Phase 1 producer role.
        outputs: Exact producer output paths keyed by frozen batch ID.

    Returns:
        Stable repository and Git locators permitted to the role.
    """
    freeze = str(FREEZE_PATH.relative_to(REPO))
    delta = str(DELTA_PATH.relative_to(REPO))
    if role == "evidence-collector":
        return [
            freeze,
            f"git:{BASE_PUBLICATION_REVISION}:{BASE_PATH}",
            delta,
            str(CANDIDATE_DELTA_PATH.relative_to(REPO)),
            str(DISCOVERY_REPORT_PATH.relative_to(REPO)),
        ]
    if role == "mechanical-metadata-inspector":
        return [
            freeze,
            delta,
            *(str(output.with_name("candidate-records-base.json").relative_to(REPO)) for output in outputs.values()),
            f"git-tree:{BASE_RECORD_REVISION}",
            f"git-tree:{DELTA_REVISION}",
        ]
    fail(f"unsupported aggregate producer role: {role}")


def assert_aggregate_receipt(path: Path, role: str, outputs: dict[str, Path]) -> None:
    """Require one bounded native receipt binding all 12 outputs for one role.

    Args:
        path: Aggregate receipt path.
        role: Required producer role.
        outputs: Exact producer artifact paths keyed by frozen batch ID.

    Returns:
        Nothing.
    """
    receipt = load_json(path)
    require_exact_keys(receipt, RECEIPT_KEYS, f"phase1 {role} receipt")
    identity = (receipt["schema_version"], receipt["track_id"], receipt["batch_id"], receipt["role"], receipt["declared_model"], receipt["fork_turns"], receipt["inherited_narrative"], receipt["allowed_input_manifest_sha256"], receipt["final_status"])
    if identity != ("apk-role-receipt.v1", "apk_existing_asset_candidate_audit_20260712", "phase1", role, "gpt-5.6-terra", "none", False, EXPECTED_FREEZE_SHA256, "pass"):
        fail(f"phase1 {role} receipt identity or isolation differs")
    if not isinstance(receipt["native_task_name"], str) or not receipt["native_task_name"] or not isinstance(receipt["declared_model"], str) or not receipt["declared_model"] or not isinstance(receipt["role_boundary"], str) or not receipt["role_boundary"]:
        fail(f"phase1 {role} receipt lacks native role provenance")
    if receipt["allowed_input_paths"] != allowed_inputs_for_role(role, outputs):
        fail(f"phase1 {role} receipt allowed inputs differ")
    expected_hashes = {str(output.relative_to(REPO)): sha256_bytes(output.read_bytes()) for output in outputs.values()}
    if receipt["output_file_hashes"] != expected_hashes:
        fail(f"phase1 {role} receipt does not bind exactly all 12 batch outputs")
    require_exact_keys(receipt["findings"], {"critical", "high", "medium", "low"}, f"phase1 {role} findings")
    if any(receipt["findings"][level] for level in ("critical", "high", "medium")):
        fail(f"phase1 {role} receipt has unresolved blocking findings")
    require_exact_keys(receipt["resource_usage"], {"batch_count", "candidate_paths", "hash_groups", "command_invocations", "bytes_read", "within_ceiling"}, f"phase1 {role} receipt resource usage")
    usage = receipt["resource_usage"]
    ceiling = 536870912 * 12 if role == "evidence-collector" else 268435456 * 12
    if (usage["batch_count"], usage["candidate_paths"], usage["hash_groups"], usage["within_ceiling"]) != (12, 428, 227, True):
        fail(f"phase1 {role} aggregate receipt counts or ceiling attestation differ")
    if not all(isinstance(usage[key], int) and usage[key] >= 0 for key in ("command_invocations", "bytes_read")) or usage["command_invocations"] > 960 or usage["bytes_read"] > ceiling:
        fail(f"phase1 {role} aggregate receipt resource ceiling exceeded")

def assert_later_phase_outputs_absent() -> None:
    """Reject Phase 2–5 evidence and lifecycle artifacts before their gates open.

    Returns:
        Nothing.
    """
    forbidden = [
        TRACK / "forensics-contract-tests.py", TRACK / "forensics-contract-test-report.json",
        TRACK / "independent-review.json", TRACK / "product-owner-acceptance.json",
        TRACK / "accepted-candidate-manifest.json",
    ]
    batches = TRACK / "batches"
    if batches.exists():
        forbidden.extend(path for pattern in ("*/provenance-audit.json", "*/inspection-records.json", "*/suitability-disposition.json") for path in batches.glob(pattern))
    present = [str(path.relative_to(TRACK)) for path in forbidden if path.exists()]
    if present:
        fail("later Phase 2-5 artifacts present: " + ", ".join(sorted(present)))


def assert_fixture_rejected(fixture: dict) -> None:
    """Exercise each compact counterexample against the invariant it violates.

    Args:
        fixture: Negative fixture object.

    Returns:
        Nothing.
    """
    kind = fixture["kind"]
    error = fixture["expected_error"]
    if kind == "missing-path":
        actual, expected = set(fixture["actual_paths"]), set(fixture["expected_paths"])
        observed = "missing-path" if actual != expected else "accepted"
    elif kind == "duplicate-path":
        paths = fixture["paths"]
        observed = "duplicate-path" if len(paths) != len(set(paths)) else "accepted"
    elif kind == "split-group":
        observed = "split-group" if len(set(fixture["batch_ids"])) > 1 else "accepted"
    elif kind == "stale-replacement-hash":
        observed = "stale-replacement-hash" if fixture["record_sha256"] != fixture["expected_sha256"] else "accepted"
    elif kind == "wrong-revision":
        observed = "wrong-revision" if fixture["record_revision"] != fixture["expected_revision"] else "accepted"
    elif kind == "malformed-image-dimensions":
        observed = "malformed-image-dimensions" if fixture["width"] <= 0 or fixture["height"] <= 0 else "accepted"
    elif kind == "unlabeled-decode-failure":
        observed = "unlabeled-decode-failure" if fixture["decoder_failed"] and fixture["decode_status"] != "failed" else "accepted"
    elif kind == "audio-metadata-omission":
        observed = "audio-metadata-omission" if any(not fixture[key] for key in ("duration_ms", "channels", "sample_rate_hz", "codec")) else "accepted"
    elif kind == "video-metadata-omission":
        observed = "video-metadata-omission" if any(not fixture[key] for key in ("width", "height", "duration_ms", "codec")) else "accepted"
    elif kind == "mislabeled-flag-mismatch":
        expected = fixture["detected_format"] != fixture["format"] or fixture["detected_mime_type"] != fixture["mime_type"]
        observed = "mislabeled-flag-mismatch" if fixture["mislabeled"] is not expected else "accepted"
    elif kind == "svg-null-dimensions":
        observed = "svg-null-dimensions" if fixture["readability_status"] == "readable" and (not isinstance(fixture["width"], int) or fixture["width"] <= 0 or not isinstance(fixture["height"], int) or fixture["height"] <= 0) else "accepted"
    elif kind == "caller-snapshot-scan-binding":
        observed = "caller-snapshot-scan-binding" if (fixture["schema_version"], fixture["algorithm_id"], fixture["algorithm_version"], fixture["source_denominator"]) != ("apk-asset-forensics.phase1-caller-inventory.v4", CALLER_SCAN_CONTRACT["algorithm_id"], CALLER_SCAN_CONTRACT["algorithm_version"], CALLER_SCAN_CONTRACT["source_denominator"]) else "accepted"
    elif kind == "caller-missing-candidate":
        observed = "caller-missing-candidate" if set(fixture["actual_paths"]) != set(fixture["expected_paths"]) else "accepted"
    elif kind == "caller-wrong-peer-group":
        observed = "caller-wrong-peer-group" if fixture["actual_peers"] != fixture["expected_peers"] else "accepted"
    elif kind == "caller-stale-revision":
        observed = "caller-stale-revision" if fixture["caller_revision"] != fixture["expected_revision"] else "accepted"
    elif kind == "caller-bad-range-hash":
        observed = "caller-bad-range-hash" if fixture["locator_text_sha256"] != fixture["expected_sha256"] else "accepted"
    elif kind == "caller-zero-match-unused":
        observed = "caller-zero-match-unused" if fixture["literal_match_count"] == 0 and fixture["status"] == "unused" else "accepted"
    elif kind == "caller-uncited-classification":
        observed = "caller-uncited-classification" if fixture["use_classification"] is not None and fixture["caller_locator"] is None else "accepted"
    elif kind == "caller-duplicate":
        observed = "caller-duplicate" if len(fixture["locator_ids"]) != len(set(fixture["locator_ids"])) else "accepted"
    elif kind == "caller-scope-leakage":
        observed = "caller-scope-leakage" if fixture["extra_key"] not in CALLER_RECORD_KEYS else "accepted"
    elif kind == "caller-static-match-dynamic-status":
        observed = "caller-static-match-dynamic-status" if fixture["literal_match_count"] > 0 and fixture["status"] != "found" else "accepted"
    elif kind == "caller-wrong-reference-kind":
        observed = "caller-wrong-reference-kind" if fixture["reference_kind"] != fixture["expected_reference_kind"] else "accepted"
    elif kind == "caller-fabricated-use-classification":
        observed = "caller-fabricated-use-classification" if fixture["use_classification"] != fixture["expected_use_classification"] else "accepted"
    elif kind == "caller-resource-drift":
        observed = "caller-resource-drift" if fixture["reported"] != fixture["expected"] else "accepted"
    elif kind == "caller-measure-evidence-promoted":
        observed = "caller-measure-evidence-promoted" if caller_exclusion_category(fixture["caller_path"]) is not None and fixture["promoted_as_current"] else "accepted"
    elif kind == "caller-exclusion-disclosure-drift":
        observed = "caller-exclusion-disclosure-drift" if fixture["reported"] != fixture["expected"] else "accepted"
    elif kind == "cross-role-ownership":
        observed = "cross-role-ownership" if fixture["artifact_role"] != fixture["receipt_role"] else "accepted"
    elif kind == "later-phase-leakage":
        observed = "later-phase-leakage" if fixture["artifact"] in {"provenance-audit.json", "inspection-records.json", "suitability-disposition.json", "accepted-candidate-manifest.json"} else "accepted"
    else:
        fail(f"unknown Phase 1 negative fixture: {kind}")
    if observed != error:
        fail(f"negative fixture was not rejected: {kind}")


def assert_negative_fixtures() -> None:
    """Run the required Phase 1 counterexample suite before producer Green.

    Returns:
        Nothing.
    """
    fixtures = sorted((TRACK / "negative-fixtures" / "phase1").glob("*.json"))
    if len(fixtures) != 28:
        fail("Phase 1 negative fixture count must be exactly 28")
    for path in fixtures:
        assert_fixture_rejected(load_json(path))


def pending_summary(batches: dict[str, set[str]]) -> str | None:
    """Return the sole expected Red reason while Phase 1 producers are incomplete.

    Args:
        batches: Frozen batch memberships.

    Returns:
        A compact pending-output summary, or None when all artifacts exist.
    """
    base_count = sum(path.exists() for path in output_paths(batches, "candidate-records-base.json").values())
    metadata_count = sum(path.exists() for path in output_paths(batches, "mechanical-metadata.json").values())
    receipt_count = sum((TRACK / "role-receipts" / "phase1" / role).exists() for role in ("evidence-collector.json", "mechanical-metadata-inspector.json"))
    if (base_count, metadata_count, receipt_count) != (12, 12, 2):
        return f"pending Phase 1 producer outputs: base-record files {base_count}/12; mechanical-metadata files {metadata_count}/12; aggregate producer receipts {receipt_count}/2"
    return None


def pending_caller_summary(batches: dict[str, set[str]]) -> str | None:
    """Return the sole expected Red while caller producer outputs are absent.

    Args:
        batches: Frozen batch memberships.

    Returns:
        Compact missing caller output summary, or None when complete.
    """
    caller_count = sum(path.exists() for path in output_paths(batches, "caller-inventory.json").values())
    receipt_count = int((TRACK / "role-receipts" / "phase1" / "caller-analyst.json").exists())
    if (caller_count, receipt_count) != (12, 1):
        return f"pending Phase 1 caller outputs: caller-inventory files {caller_count}/12; aggregate caller receipt {receipt_count}/1"
    return None


def main() -> int:
    """Run the independent Phase 1 contract and report one stable Red reason.

    Returns:
        Process status zero only when every Phase 1 contract is complete.
    """
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", action="store_true", help="run required negative fixtures")
    args = parser.parse_args()
    try:
        freeze, _, candidate_delta = assert_freeze_chain()
        records, bindings = effective_records(candidate_delta)
        batches = expected_batches(freeze, records)
        assert_later_phase_outputs_absent()
        if args.fixtures:
            assert_negative_fixtures()
        pending = pending_summary(batches)
        if pending:
            fail(pending)
        base_outputs = output_paths(batches, "candidate-records-base.json")
        metadata_outputs = output_paths(batches, "mechanical-metadata.json")
        assert_exact_output_files(base_outputs, "candidate-records-base.json")
        assert_exact_output_files(metadata_outputs, "mechanical-metadata.json")
        all_seen: set[str] = set()
        for batch_id, paths in batches.items():
            assert_base_artifact(base_outputs[batch_id], batch_id, paths, records, bindings)
            assert_metadata_artifact(metadata_outputs[batch_id], batch_id, paths, records, bindings)
            if all_seen & paths:
                fail("cross-batch path duplication")
            all_seen |= paths
        assert_aggregate_receipt(TRACK / "role-receipts" / "phase1" / "evidence-collector.json", "evidence-collector", base_outputs)
        assert_aggregate_receipt(TRACK / "role-receipts" / "phase1" / "mechanical-metadata-inspector.json", "mechanical-metadata-inspector", metadata_outputs)
        if len(all_seen) != 428 or len({records[path]["identical_hash_group"] for path in all_seen}) != 227:
            fail("Phase 1 final path or group reconciliation differs")
        caller_pending = pending_caller_summary(batches)
        if caller_pending:
            fail(caller_pending)
        caller_outputs = output_paths(batches, "caller-inventory.json")
        assert_exact_output_files(caller_outputs, "caller-inventory.json")
        expected_callers, scan_metrics = rederive_literal_callers(records)
        per_batch_usage, aggregate_usage = caller_resource_expectations(batches, base_outputs, expected_callers, scan_metrics)
        group_members: dict[str, set[str]] = {}
        for candidate_path, record in records.items():
            group_members.setdefault(record["identical_hash_group"], set()).add(candidate_path)
        graph_usage: set[bool] = set()
        for batch_id, paths in batches.items():
            graph_usage.add(assert_caller_artifact(caller_outputs[batch_id], batch_id, paths, records, bindings, group_members, expected_callers, per_batch_usage[batch_id]))
        if len(graph_usage) != 1:
            fail("caller batches disagree about build-graph usage")
        assert_caller_receipt(TRACK / "role-receipts" / "phase1" / "caller-analyst.json", caller_outputs, base_outputs, graph_usage.pop(), aggregate_usage, scan_metrics["excluded_disclosure"])
    except (AssertionError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(f"RED: {error}", file=sys.stderr)
        return 1
    print("GREEN: Phase 1 base, mechanical metadata, and caller outputs exactly reconcile to the frozen denominator")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
