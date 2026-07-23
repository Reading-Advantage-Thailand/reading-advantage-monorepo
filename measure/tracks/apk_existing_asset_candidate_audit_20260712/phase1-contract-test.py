#!/usr/bin/env python3
"""Read-only contract for T8 Phase 1 base and mechanical metadata outputs.

The contract derives the effective candidate set from the frozen T2 Git object
and accepted T8 delta. It never reads candidate working-tree bytes or makes
content, caller, provenance, inspection, suitability, or disposition claims.
"""

import argparse
import hashlib
import json
import subprocess
import sys
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
    if len(fixtures) != 13:
        fail("Phase 1 negative fixture count must be exactly 13")
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
    except (AssertionError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(f"RED: {error}", file=sys.stderr)
        return 1
    print("GREEN: Phase 1 base and mechanical metadata outputs exactly reconcile to the frozen denominator")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
