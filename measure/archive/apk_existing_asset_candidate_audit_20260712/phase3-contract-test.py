#!/usr/bin/env python3
"""Read-only Phase 3 admission contract for pinned inspection evidence.

This contract validates immutable source bytes plus the closed schemas and exact
cross-file bindings required of later inspection records and inspector receipts.
It deliberately remains Red even if every output validates: final Phase 3
fitness acceptance belongs to a later root-orchestrator gate.
"""

import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path


TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
FREEZE = TRACK / "phase3-input-freeze-v1.json"
PHASE2_ACCEPTANCE = TRACK / "phase2-root-acceptance.json"
PHASE2_CONTRACT = TRACK / "forensics-contract-tests.py"
PHASE2_INPUT_FREEZE = TRACK / "phase2-input-freeze-v1.json"
PHASE1_ACCEPTANCE = TRACK / "phase1-root-acceptance.json"
PHASE0_FREEZE = TRACK / "phase0-input-freeze-v1.json"
EXPECTED = {
    FREEZE: "13762016892d6c735a0576bd233568742d07bda5c3ffdc2da7ec1875880c61fb",
    PHASE2_ACCEPTANCE: "461c1d4f26afa512d1e6266384005b019ab0428a3cc508046675feb9aef35ed1",
    PHASE2_CONTRACT: "f9830d6e56244453bcd20bceaa858339148d22823ceadc9438f47830ceb50882",
    PHASE1_ACCEPTANCE: "2b30be13c8c0f6b7d1d404489c6058b48b6839f58d5ae2ce84b67f9d6a1a6d61",
    PHASE0_FREEZE: "d4bd3606c7c75f495f2d8486ea4220f48aefd9eb216689b765aa9d96f58f2a9b",
}
EXPECTED_PHASE2_INPUT_FREEZE_SHA256 = "385248641ba8d7dcaeedd3920f4d11f67071987be06d336f3a624f5a31f724c0"
EXPECTED_MEDIA_GROUPS = {
    "visual_or_video": 131,
    "audio": 14,
    "text_or_data": 77,
    "unreadable_or_pointer": 5,
}
MANIFEST_KEYS = {
    "schema_version",
    "track_id",
    "batch_id",
    "input_binding",
    "producer",
    "groups",
}
INPUT_BINDING_KEYS = {
    "phase3_input_freeze_sha256",
    "phase0_input_freeze_sha256",
    "phase1_root_acceptance_sha256",
    "phase2_root_acceptance_sha256",
    "phase2_contract_sha256",
    "phase1_batch_input_sha256",
    "phase2_provenance_audit_sha256",
    "phase2_independent_review_sha256",
    "base_record_revision",
    "delta_revision",
    "effective_candidate_paths",
    "effective_identical_hash_groups",
}
GROUP_KEYS = {
    "identical_hash_group",
    "sha256",
    "media_class",
    "member_sources",
    "inspection_source",
}
MEMBER_KEYS = {
    "canonical_path",
    "revision",
    "source_blob_oid",
    "byte_size",
}
INSPECTION_SOURCE_KEYS = MEMBER_KEYS | {"sha256", "locator_kind"}
INSPECTION_RECORD_KEYS = {
    "schema_version",
    "track_id",
    "batch_id",
    "input_binding",
    "producer",
    "groups",
}
INSPECTION_RECORD_BINDING_KEYS = {
    "phase3_input_freeze_sha256",
    "inspection_source_manifest_sha256",
    "base_record_revision",
    "delta_revision",
    "effective_candidate_paths",
    "effective_identical_hash_groups",
}
INSPECTION_RECORD_GROUP_KEYS = {
    "identical_hash_group",
    "sha256",
    "media_class",
    "member_paths",
    "inspection_source",
    "inspection",
}
INSPECTION_KEYS = {
    "primary_evidence",
    "observations",
    "state_or_direction_coverage",
    "baked_text_or_ui",
    "placeholder_risk",
    "corruption_risk",
}
PRIMARY_EVIDENCE_KEYS = {"kind", "locator", "observed_by"}
INSPECTOR_RECEIPT_KEYS = {
    "schema_version",
    "track_id",
    "batch_id",
    "role",
    "input_binding",
    "reviewed_groups",
}
INSPECTOR_RECEIPT_BINDING_KEYS = {
    "phase3_input_freeze_sha256",
    "inspection_source_manifest_sha256",
    "inspection_records_sha256",
}
INSPECTOR_RECEIPT_GROUP_KEYS = {
    "identical_hash_group",
    "sha256",
    "media_class",
    "primary_evidence_kind",
    "direct_inspection_confirmed",
    "audio_capable_multimodal",
}
MEDIA_EVIDENCE_KINDS = {
    "visual_or_video": "direct_visual",
    "audio": "direct_audio_multimodal",
    "text_or_data": "direct_text_read",
    "unreadable_or_pointer": "direct_unreadable",
}
RISK_STATUSES = {"present", "absent", "unknown", "not_applicable"}
HEX40 = re.compile(r"[0-9a-f]{40}")
HEX64 = re.compile(r"[0-9a-f]{64}")


def digest(path: Path) -> str:
    """Return the SHA-256 digest of one pinned local artifact."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> dict:
    """Load one JSON object artifact or reject a non-object root."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"JSON root is not an object: {path.relative_to(REPO)}")
    return value


def exact_keys(value: object, expected: set[str], label: str) -> dict:
    """Return an object only when it has the exact closed-schema key set."""
    if not isinstance(value, dict) or set(value) != expected:
        actual = set(value) if isinstance(value, dict) else set()
        fail(
            f"{label} keys differ; "
            f"missing={sorted(expected - actual)} extra={sorted(actual - expected)}"
        )
    return value


def fail(message: str) -> None:
    """Raise one stable contract failure."""
    raise AssertionError(message)


def git(*args: str) -> bytes:
    """Run one read-only Git object query in the canonical checkout."""
    result = subprocess.run(
        ["git", *args],
        cwd=REPO,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode:
        fail(
            f"git {' '.join(args)} failed: "
            f"{result.stderr.decode(errors='replace').strip()}"
        )
    return result.stdout


def assert_predecessors() -> tuple[dict, dict, dict, dict]:
    """Bind the Phase 3 freeze and every source-manifest predecessor exactly."""
    for path, expected in EXPECTED.items():
        if not path.is_file() or digest(path) != expected:
            fail(f"stale or missing predecessor: {path.relative_to(REPO)}")
    freeze = load(FREEZE)
    acceptance = load(PHASE2_ACCEPTANCE)
    phase0 = load(PHASE0_FREEZE)
    phase2_input = load(PHASE2_INPUT_FREEZE)
    if digest(PHASE2_INPUT_FREEZE) != EXPECTED_PHASE2_INPUT_FREEZE_SHA256:
        fail("Phase 2 input freeze SHA-256 drift")
    if (
        freeze.get("schema_version"),
        freeze.get("track_id"),
        freeze.get("phase"),
        freeze.get("admission_status"),
    ) != (
        "apk-asset-forensics.phase3-input-freeze.v1",
        "apk_existing_asset_candidate_audit_20260712",
        "phase3",
        "red-admission-only",
    ):
        fail("Phase 3 freeze identity differs")
    if (
        acceptance.get("decision"),
        acceptance.get("phase"),
        acceptance.get("denominator"),
    ) != (
        "accepted",
        "phase2",
        {"candidate_paths": 428, "identical_hash_groups": 227, "batches": 12},
    ):
        fail("Phase 2 acceptance is not consumable")
    accepted_hashes = acceptance.get("accepted_evidence_sha256")
    if not isinstance(accepted_hashes, dict):
        fail("Phase 2 accepted evidence map is missing")
    if (
        accepted_hashes.get("phase2_contract") != EXPECTED[PHASE2_CONTRACT]
        or accepted_hashes.get("phase2_input_freeze")
        != EXPECTED_PHASE2_INPUT_FREEZE_SHA256
    ):
        fail("Phase 2 accepted contract or input-freeze binding differs")
    findings = acceptance.get("findings", {})
    if any(findings.get(level) != 0 for level in ("critical", "high", "medium")):
        fail("Phase 2 acceptance has unresolved blocking findings")
    if freeze.get("phase0_input_freeze") != {
        "path": str(PHASE0_FREEZE.relative_to(REPO)),
        "sha256": EXPECTED[PHASE0_FREEZE],
    }:
        fail("Phase 3 Phase 0 binding differs")
    if freeze.get("phase1_acceptance") != {
        "path": str(PHASE1_ACCEPTANCE.relative_to(REPO)),
        "sha256": EXPECTED[PHASE1_ACCEPTANCE],
    }:
        fail("Phase 3 Phase 1 binding differs")
    if freeze.get("phase2_acceptance") != {
        "path": str(PHASE2_ACCEPTANCE.relative_to(REPO)),
        "sha256": EXPECTED[PHASE2_ACCEPTANCE],
        "contract_path": str(PHASE2_CONTRACT.relative_to(REPO)),
        "contract_sha256": EXPECTED[PHASE2_CONTRACT],
    }:
        fail("Phase 3 Phase 2 binding differs")
    if freeze.get("effective_denominator_binding") != {
        "base_record_revision": "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286",
        "delta_revision": "65fc00d872ce5aa63820662ee0a1f14952e63235",
        "candidate_paths": 428,
        "identical_hash_groups": 227,
        "batches": 12,
    }:
        fail("Phase 3 effective denominator binding differs")
    if freeze.get("expected_media_groups") != EXPECTED_MEDIA_GROUPS:
        fail("Phase 3 frozen media-group counts differ")
    batch_inputs = phase2_input.get("phase1_batch_inputs")
    provenance_hashes = accepted_hashes.get("provenance_artifacts")
    review_hashes = accepted_hashes.get("independent_reviews")
    expected_batches = {f"AF-{number:02d}" for number in range(1, 13)}
    if (
        not isinstance(batch_inputs, dict)
        or set(batch_inputs) != expected_batches
        or not isinstance(provenance_hashes, dict)
        or set(provenance_hashes) != expected_batches
        or not isinstance(review_hashes, dict)
        or set(review_hashes) != expected_batches
    ):
        fail("Phase 3 predecessor batch hash maps differ")
    for batch_id in sorted(expected_batches):
        for relative_path, expected_sha in batch_inputs[batch_id].items():
            path = REPO / relative_path
            if (
                not HEX64.fullmatch(expected_sha)
                or not path.is_file()
                or digest(path) != expected_sha
            ):
                fail(f"{batch_id} accepted Phase 1 input hash drift")
        provenance_path = TRACK / "batches" / batch_id / "provenance-audit.json"
        review_path = TRACK / "phase2-reviews" / f"{batch_id}.json"
        if (
            not provenance_path.is_file()
            or digest(provenance_path) != provenance_hashes[batch_id]
        ):
            fail(f"{batch_id} accepted provenance hash drift")
        if not review_path.is_file() or digest(review_path) != review_hashes[batch_id]:
            fail(f"{batch_id} accepted independent-review hash drift")
    return freeze, phase0, phase2_input, acceptance


def media_class(record: dict) -> str:
    """Derive the required direct-inspection media class from mechanical facts."""
    flags = record["flags"]
    if (
        flags["decode_status"] == "failed"
        or flags["readability_status"] == "unreadable"
    ):
        return "unreadable_or_pointer"
    if record["file_kind"] == "audio":
        return "audio"
    if record["format"] in {"json", "md"}:
        return "text_or_data"
    if record["format"] not in {"png", "jpg", "svg", "webm"}:
        fail(f"unsupported Phase 3 media format: {record['format']}")
    return "visual_or_video"


def derive_expected_batches(
    phase0: dict,
    phase2_input: dict,
) -> dict[str, dict[str, dict]]:
    """Derive exact batch groups and member locators from accepted Phase 1 bytes."""
    expected: dict[str, dict[str, dict]] = {}
    all_paths: set[str] = set()
    all_groups: set[str] = set()
    class_counts = {name: 0 for name in EXPECTED_MEDIA_GROUPS}
    frozen_batches = {
        batch["batch_id"]: batch for batch in phase0["batch_strategy"]["batches"]
    }
    for number in range(1, 13):
        batch_id = f"AF-{number:02d}"
        batch_dir = TRACK / "batches" / batch_id
        base_path = batch_dir / "candidate-records-base.json"
        metadata_path = batch_dir / "mechanical-metadata.json"
        batch_bindings = phase2_input["phase1_batch_inputs"][batch_id]
        for path in (base_path, metadata_path):
            relative = str(path.relative_to(REPO))
            if batch_bindings.get(relative) != digest(path):
                fail(f"{batch_id} source-manifest predecessor binding differs")
        base = load(base_path)
        metadata = load(metadata_path)
        if base.get("batch_id") != batch_id or metadata.get("batch_id") != batch_id:
            fail(f"{batch_id} Phase 1 batch identity differs")
        base_records = base.get("records")
        metadata_records = metadata.get("records")
        if not isinstance(base_records, list) or not isinstance(metadata_records, list):
            fail(f"{batch_id} Phase 1 records are malformed")
        metadata_by_path = {
            record["canonical_path"]: record for record in metadata_records
        }
        if len(metadata_by_path) != len(metadata_records):
            fail(f"{batch_id} mechanical metadata duplicates a path")
        groups: dict[str, list[dict]] = {}
        group_classes: dict[str, set[str]] = {}
        for record in base_records:
            path = record["canonical_path"]
            if path in all_paths:
                fail("frozen candidate paths overlap batches")
            all_paths.add(path)
            mechanical = metadata_by_path.get(path)
            if mechanical is None:
                fail(f"{batch_id} mechanical metadata omits a frozen path")
            for field in ("sha256", "revision", "source_blob_oid"):
                if mechanical.get(field) != record.get(field):
                    fail(f"{batch_id} mechanical/base identity differs: {path}")
            group_id = record["identical_hash_group"]
            sha256 = record["sha256"]
            if group_id != f"sha256:{sha256}" or not HEX64.fullmatch(sha256):
                fail(f"{batch_id} frozen hash-group identity differs")
            member = {
                "canonical_path": path,
                "revision": record["revision"],
                "source_blob_oid": record["source_blob_oid"],
                "byte_size": mechanical["byte_size"],
            }
            groups.setdefault(group_id, []).append(member)
            group_classes.setdefault(group_id, set()).add(media_class(mechanical))
        if set(metadata_by_path) != {record["canonical_path"] for record in base_records}:
            fail(f"{batch_id} mechanical metadata adds a non-frozen path")
        frozen = frozen_batches[batch_id]
        ordered_groups = sorted(groups)
        if (
            len(base_records),
            len(ordered_groups),
            ordered_groups[0],
            ordered_groups[-1],
        ) != (
            frozen["path_count"],
            frozen["group_count"],
            frozen["first_group"],
            frozen["last_group"],
        ):
            fail(f"{batch_id} frozen batch boundary differs")
        batch_expected: dict[str, dict] = {}
        for group_id in ordered_groups:
            if group_id in all_groups:
                fail("frozen hash groups overlap batches")
            all_groups.add(group_id)
            if len(group_classes[group_id]) != 1:
                fail(f"{batch_id} exact-hash group has conflicting media classes")
            derived_class = next(iter(group_classes[group_id]))
            class_counts[derived_class] += 1
            members = sorted(groups[group_id], key=lambda item: item["canonical_path"])
            batch_expected[group_id] = {
                "sha256": group_id.removeprefix("sha256:"),
                "media_class": derived_class,
                "member_sources": members,
            }
        expected[batch_id] = batch_expected
    if (len(all_paths), len(all_groups)) != (428, 227):
        fail("derived Phase 3 denominator differs")
    if class_counts != EXPECTED_MEDIA_GROUPS:
        fail("derived Phase 3 media-class totals differ")
    return expected


def assert_git_member(
    member: dict,
    group_sha256: str,
    blob_cache: dict[str, bytes],
) -> None:
    """Prove one frozen member resolves to exact Git blob bytes and identity."""
    revision = member["revision"]
    path = member["canonical_path"]
    oid = member["source_blob_oid"]
    byte_size = member["byte_size"]
    if (
        not HEX40.fullmatch(revision)
        or not HEX40.fullmatch(oid)
        or not isinstance(path, str)
        or not path
        or path.startswith("/")
        or ".." in Path(path).parts
        or not isinstance(byte_size, int)
        or isinstance(byte_size, bool)
        or byte_size < 0
    ):
        fail(f"source member locator is malformed: {path}")
    tree_line = git("ls-tree", revision, "--", path).decode(
        "utf-8", errors="strict"
    ).strip()
    if not tree_line:
        fail(f"source member is absent at pinned revision: {path}")
    metadata, observed_path = tree_line.split("\t", 1)
    _mode, kind, observed_oid = metadata.split()
    if kind != "blob" or observed_path != path or observed_oid != oid:
        fail(f"source member Git blob identity differs: {path}")
    if oid not in blob_cache:
        blob_cache[oid] = git("cat-file", "blob", oid)
    blob = blob_cache[oid]
    if len(blob) != byte_size:
        fail(f"source member byte size differs: {path}")
    if hashlib.sha256(blob).hexdigest() != group_sha256:
        fail(f"source member byte hash differs: {path}")


def manifest_input_binding(
    batch_id: str,
    freeze: dict,
    phase2_input: dict,
    acceptance: dict,
) -> dict:
    """Return the exact accepted input binding for one source manifest."""
    accepted = acceptance["accepted_evidence_sha256"]
    denominator = freeze["effective_denominator_binding"]
    return {
        "phase3_input_freeze_sha256": EXPECTED[FREEZE],
        "phase0_input_freeze_sha256": EXPECTED[PHASE0_FREEZE],
        "phase1_root_acceptance_sha256": EXPECTED[PHASE1_ACCEPTANCE],
        "phase2_root_acceptance_sha256": EXPECTED[PHASE2_ACCEPTANCE],
        "phase2_contract_sha256": EXPECTED[PHASE2_CONTRACT],
        "phase1_batch_input_sha256": phase2_input["phase1_batch_inputs"][
            batch_id
        ],
        "phase2_provenance_audit_sha256": accepted["provenance_artifacts"][
            batch_id
        ],
        "phase2_independent_review_sha256": accepted["independent_reviews"][
            batch_id
        ],
        "base_record_revision": denominator["base_record_revision"],
        "delta_revision": denominator["delta_revision"],
        "effective_candidate_paths": denominator["candidate_paths"],
        "effective_identical_hash_groups": denominator[
            "identical_hash_groups"
        ],
    }


def assert_source_manifest(
    batch_id: str,
    expected_groups: dict[str, dict],
    freeze: dict,
    phase2_input: dict,
    acceptance: dict,
    blob_cache: dict[str, bytes],
) -> None:
    """Validate one closed source manifest against its exact frozen batch."""
    path = TRACK / "batches" / batch_id / "inspection-source-manifest.json"
    manifest = exact_keys(load(path), MANIFEST_KEYS, f"{batch_id} source manifest")
    if (
        manifest["schema_version"],
        manifest["track_id"],
        manifest["batch_id"],
    ) != (
        "apk-asset-forensics.phase3-inspection-source-manifest.v1",
        "apk_existing_asset_candidate_audit_20260712",
        batch_id,
    ):
        fail(f"{batch_id} source-manifest identity differs")
    if manifest["producer"] != {"role": "evidence-collector"}:
        fail(f"{batch_id} source-manifest producer differs")
    binding = exact_keys(
        manifest["input_binding"],
        INPUT_BINDING_KEYS,
        f"{batch_id} source-manifest input binding",
    )
    if binding != manifest_input_binding(batch_id, freeze, phase2_input, acceptance):
        fail(f"{batch_id} source-manifest input binding differs")
    group_values = manifest["groups"]
    if not isinstance(group_values, list):
        fail(f"{batch_id} source-manifest groups are malformed")
    observed_group_ids = [
        value.get("identical_hash_group")
        for value in group_values
        if isinstance(value, dict)
    ]
    if observed_group_ids != sorted(expected_groups):
        fail(f"{batch_id} source-manifest frozen group set or order differs")
    for value in group_values:
        group = exact_keys(value, GROUP_KEYS, f"{batch_id} source group")
        group_id = group["identical_hash_group"]
        expected = expected_groups[group_id]
        if (
            group["sha256"],
            group["media_class"],
        ) != (
            expected["sha256"],
            expected["media_class"],
        ):
            fail(f"{batch_id} source group SHA or media class differs")
        members = group["member_sources"]
        if not isinstance(members, list):
            fail(f"{batch_id} source group members are malformed")
        for member in members:
            exact_keys(member, MEMBER_KEYS, f"{batch_id} source member")
        if members != expected["member_sources"]:
            fail(f"{batch_id} source group frozen member set or order differs")
        inspection_source = exact_keys(
            group["inspection_source"],
            INSPECTION_SOURCE_KEYS,
            f"{batch_id} canonical inspection source",
        )
        canonical = {
            **expected["member_sources"][0],
            "sha256": expected["sha256"],
            "locator_kind": "git_blob",
        }
        if inspection_source != canonical:
            fail(f"{batch_id} canonical inspection source differs")
        for member in members:
            assert_git_member(member, expected["sha256"], blob_cache)


def assert_source_manifests(
    expected_batches: dict[str, dict[str, dict]],
    freeze: dict,
    phase2_input: dict,
    acceptance: dict,
) -> None:
    """Require and validate exactly one source manifest per frozen batch."""
    expected_paths = {
        TRACK / "batches" / batch_id / "inspection-source-manifest.json"
        for batch_id in expected_batches
    }
    actual_paths = set(
        (TRACK / "batches").glob("AF-*/inspection-source-manifest.json")
    )
    if actual_paths != expected_paths:
        fail("Phase 3 source-manifest file set differs from the 12 frozen batches")
    blob_cache: dict[str, bytes] = {}
    for batch_id, expected_groups in expected_batches.items():
        assert_source_manifest(
            batch_id,
            expected_groups,
            freeze,
            phase2_input,
            acceptance,
            blob_cache,
        )


def nonempty_strings(value: object, label: str) -> list[str]:
    """Return a nonempty list of nonempty strings from a closed evidence field."""
    if (
        not isinstance(value, list)
        or not value
        or any(not isinstance(item, str) or not item.strip() for item in value)
    ):
        fail(f"{label} must be a nonempty list of nonempty strings")
    return value


def expected_record_binding(batch_id: str) -> dict:
    """Return the immutable bindings that one inspection record must declare."""
    denominator = load(FREEZE)["effective_denominator_binding"]
    source_manifest = TRACK / "batches" / batch_id / "inspection-source-manifest.json"
    return {
        "phase3_input_freeze_sha256": EXPECTED[FREEZE],
        "inspection_source_manifest_sha256": digest(source_manifest),
        "base_record_revision": denominator["base_record_revision"],
        "delta_revision": denominator["delta_revision"],
        "effective_candidate_paths": denominator["candidate_paths"],
        "effective_identical_hash_groups": denominator["identical_hash_groups"],
    }


def assert_inspection_record(
    batch_id: str,
    expected_groups: dict[str, dict],
) -> dict:
    """Validate one inspection record against the exact frozen source groups."""
    path = TRACK / "batches" / batch_id / "inspection-records.json"
    record = exact_keys(load(path), INSPECTION_RECORD_KEYS, f"{batch_id} inspection record")
    if (
        record["schema_version"],
        record["track_id"],
        record["batch_id"],
        record["producer"],
    ) != (
        "apk-asset-forensics.phase3-inspection-records.v1",
        "apk_existing_asset_candidate_audit_20260712",
        batch_id,
        {"role": "visual-audio-inspector"},
    ):
        fail(f"{batch_id} inspection-record identity or producer differs")
    binding = exact_keys(
        record["input_binding"],
        INSPECTION_RECORD_BINDING_KEYS,
        f"{batch_id} inspection-record input binding",
    )
    if binding != expected_record_binding(batch_id):
        fail(f"{batch_id} inspection-record input binding differs")
    groups = record["groups"]
    if not isinstance(groups, list):
        fail(f"{batch_id} inspection-record groups are malformed")
    group_ids = [group.get("identical_hash_group") for group in groups if isinstance(group, dict)]
    if group_ids != sorted(expected_groups):
        fail(f"{batch_id} inspection-record frozen group set or order differs")
    for value in groups:
        group = exact_keys(value, INSPECTION_RECORD_GROUP_KEYS, f"{batch_id} inspection record group")
        group_id = group["identical_hash_group"]
        expected = expected_groups[group_id]
        if (group["sha256"], group["media_class"]) != (
            expected["sha256"],
            expected["media_class"],
        ):
            fail(f"{batch_id} inspection record group binding differs")
        expected_paths = [member["canonical_path"] for member in expected["member_sources"]]
        if group["member_paths"] != expected_paths:
            fail(f"{batch_id} inspection record member-path set or order differs")
        canonical_source = {
            **expected["member_sources"][0],
            "sha256": expected["sha256"],
            "locator_kind": "git_blob",
        }
        if group["inspection_source"] != canonical_source:
            fail(f"{batch_id} inspection record canonical source differs")
        inspection = exact_keys(
            group["inspection"], INSPECTION_KEYS, f"{batch_id} inspection evidence"
        )
        evidence = exact_keys(
            inspection["primary_evidence"],
            PRIMARY_EVIDENCE_KEYS,
            f"{batch_id} primary inspection evidence",
        )
        expected_kind = MEDIA_EVIDENCE_KINDS[expected["media_class"]]
        if evidence["kind"] != expected_kind:
            fail(f"{batch_id} inspection evidence kind differs for {group_id}")
        if (
            not isinstance(evidence["locator"], str)
            or not evidence["locator"].strip()
            or not isinstance(evidence["observed_by"], str)
            or not evidence["observed_by"].strip()
        ):
            fail(f"{batch_id} inspection evidence locator or observer is malformed")
        locator = evidence["locator"].lower()
        if "contact sheet" in locator or "contact-sheet" in locator or "playlist" in locator:
            fail(f"{batch_id} inspection evidence uses forbidden navigation evidence")
        nonempty_strings(inspection["observations"], f"{batch_id} inspection observations")
        coverage = inspection["state_or_direction_coverage"]
        if coverage is not None and (
            not isinstance(coverage, str) or not coverage.strip()
        ):
            fail(f"{batch_id} inspection state/direction coverage is malformed")
        for field in ("baked_text_or_ui", "placeholder_risk", "corruption_risk"):
            if inspection[field] not in RISK_STATUSES:
                fail(f"{batch_id} inspection {field} status differs")
    return record


def assert_inspector_receipt(
    batch_id: str,
    expected_groups: dict[str, dict],
    record: dict,
) -> None:
    """Validate one inspector receipt against the inspected records and source groups."""
    path = TRACK / "role-receipts" / batch_id / "visual-audio-inspector.json"
    receipt = exact_keys(load(path), INSPECTOR_RECEIPT_KEYS, f"{batch_id} inspector receipt")
    if (
        receipt["schema_version"],
        receipt["track_id"],
        receipt["batch_id"],
        receipt["role"],
    ) != (
        "apk-role-receipt.phase3-visual-audio-inspector.v1",
        "apk_existing_asset_candidate_audit_20260712",
        batch_id,
        "visual-audio-inspector",
    ):
        fail(f"{batch_id} inspector receipt identity or role differs")
    binding = exact_keys(
        receipt["input_binding"],
        INSPECTOR_RECEIPT_BINDING_KEYS,
        f"{batch_id} inspector receipt input binding",
    )
    expected_binding = {
        "phase3_input_freeze_sha256": EXPECTED[FREEZE],
        "inspection_source_manifest_sha256": digest(
            TRACK / "batches" / batch_id / "inspection-source-manifest.json"
        ),
        "inspection_records_sha256": digest(
            TRACK / "batches" / batch_id / "inspection-records.json"
        ),
    }
    if binding != expected_binding:
        fail(f"{batch_id} inspector receipt input binding differs")
    groups = receipt["reviewed_groups"]
    if not isinstance(groups, list):
        fail(f"{batch_id} inspector receipt reviewed groups are malformed")
    group_ids = [group.get("identical_hash_group") for group in groups if isinstance(group, dict)]
    if group_ids != sorted(expected_groups):
        fail(f"{batch_id} inspector receipt frozen group set or order differs")
    record_by_group = {group["identical_hash_group"]: group for group in record["groups"]}
    for value in groups:
        group = exact_keys(value, INSPECTOR_RECEIPT_GROUP_KEYS, f"{batch_id} inspector receipt group")
        group_id = group["identical_hash_group"]
        expected = expected_groups[group_id]
        if (group["sha256"], group["media_class"]) != (
            expected["sha256"],
            expected["media_class"],
        ):
            fail(f"{batch_id} inspector receipt group binding differs")
        record_kind = record_by_group[group_id]["inspection"]["primary_evidence"]["kind"]
        if group["primary_evidence_kind"] != record_kind:
            fail(f"{batch_id} inspector receipt evidence kind does not reconcile")
        if group["direct_inspection_confirmed"] is not True:
            fail(f"{batch_id} inspector receipt lacks direct-inspection confirmation")
        audio_required = expected["media_class"] == "audio"
        if group["audio_capable_multimodal"] is not audio_required:
            fail(f"{batch_id} inspector receipt audio-capability assertion differs")


def output_status(
    path: Path,
    validator: object,
) -> tuple[str, str | None]:
    """Classify one later output as missing, structurally invalid, or valid."""
    if not path.exists():
        return "missing", None
    try:
        validator()
    except (AssertionError, KeyError, TypeError, json.JSONDecodeError) as error:
        return "invalid", str(error)
    return "valid", None


def assert_inspection_output_file_sets(expected_batches: dict[str, dict[str, dict]]) -> None:
    """Reject extra Phase 3 record or inspector-receipt files outside frozen batches."""
    expected_records = {
        TRACK / "batches" / batch_id / "inspection-records.json"
        for batch_id in expected_batches
    }
    expected_receipts = {
        TRACK / "role-receipts" / batch_id / "visual-audio-inspector.json"
        for batch_id in expected_batches
    }
    if set((TRACK / "batches").glob("AF-*/inspection-records.json")) - expected_records:
        fail("Phase 3 inspection-record file set contains an unfrozen batch")
    if set((TRACK / "role-receipts").glob("AF-*/visual-audio-inspector.json")) - expected_receipts:
        fail("Phase 3 inspector-receipt file set contains an unfrozen batch")


def pending_outputs(expected_batches: dict[str, dict[str, dict]]) -> str | None:
    """Return a Red distinguishing absent outputs from structurally invalid ones."""
    assert_inspection_output_file_sets(expected_batches)
    record_states: list[str] = []
    receipt_states: list[str] = []
    invalid: list[str] = []
    records: dict[str, dict] = {}
    for batch_id, expected_groups in expected_batches.items():
        record_path = TRACK / "batches" / batch_id / "inspection-records.json"
        state, reason = output_status(
            record_path,
            lambda batch_id=batch_id, expected_groups=expected_groups: records.setdefault(
                batch_id, assert_inspection_record(batch_id, expected_groups)
            ),
        )
        record_states.append(state)
        if reason:
            invalid.append(f"{batch_id} inspection record: {reason}")
        receipt_path = TRACK / "role-receipts" / batch_id / "visual-audio-inspector.json"
        if state != "valid":
            receipt_state = "missing" if not receipt_path.exists() else "invalid"
            receipt_reason = (
                None
                if receipt_state == "missing"
                else f"{batch_id} inspector receipt cannot reconcile without a valid inspection record"
            )
        else:
            receipt_state, receipt_reason = output_status(
                receipt_path,
                lambda batch_id=batch_id, expected_groups=expected_groups: assert_inspector_receipt(
                    batch_id, expected_groups, records[batch_id]
                ),
            )
        receipt_states.append(receipt_state)
        if receipt_reason:
            invalid.append(receipt_reason)
    source = 12
    record_valid = record_states.count("valid")
    receipt_valid = receipt_states.count("valid")
    if not invalid:
        if (source, record_valid, receipt_valid) != (12, 12, 12):
            return (
                "pending Phase 3 inspection outputs: "
                f"inspection source manifests {source}/12; "
                f"inspection records {record_valid}/12; "
                f"inspector receipts {receipt_valid}/12"
            )
        return None
    return (
        "pending Phase 3 inspection outputs: "
        f"inspection source manifests {source}/12; "
        f"inspection records valid {record_valid}/12, missing {record_states.count('missing')}/12, invalid {record_states.count('invalid')}/12; "
        f"inspector receipts valid {receipt_valid}/12, missing {receipt_states.count('missing')}/12, invalid {receipt_states.count('invalid')}/12; "
        f"structurally invalid outputs: {' | '.join(invalid)}"
    )


def main() -> int:
    """Validate source manifests and remain Red until a later contract is added."""
    try:
        freeze, phase0, phase2_input, acceptance = assert_predecessors()
        expected_batches = derive_expected_batches(phase0, phase2_input)
        assert_source_manifests(
            expected_batches,
            freeze,
            phase2_input,
            acceptance,
        )
        pending = pending_outputs(expected_batches)
        if pending:
            fail(pending)
        fail(
            "Phase 3 inspection records and inspector receipts validate but "
            "remain unaccepted pending root-orchestrator fitness verification"
        )
    except (AssertionError, KeyError, TypeError, json.JSONDecodeError) as error:
        print(f"RED: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
