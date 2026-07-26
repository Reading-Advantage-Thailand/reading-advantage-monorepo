#!/usr/bin/env python3
"""Render root-orchestrator Phase 3 acceptance from exact reviewed evidence."""

import argparse
import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path


TRACK = Path(__file__).resolve().parent
REPOSITORY = TRACK.parents[2]
DIRECT_REVIEW = TRACK / "phase3-root-direct-fitness-review.json"
REVIEW_FILES = (
    TRACK / "phase3-reviews" / "AF-01-04.json",
    TRACK / "phase3-reviews" / "AF-05-08.json",
    TRACK / "phase3-reviews" / "AF-09-12.json",
)
AUDIO_EVIDENCE_FILES = (
    TRACK / "inspection-working-notes" / "audio-multimodal.json",
    TRACK / "inspection-working-notes" / "audio-multimodal-independent-review.json",
    TRACK / "inspection-working-notes" / "audio-review-reconciliation.json",
    TRACK
    / "inspection-working-notes"
    / "audio-targeted-follow-up-2da344189f4831c130645d8396df434a9b35007d2cef98244632bb35e8a83cb3.json",
    TRACK
    / "inspection-working-notes"
    / "audio-targeted-follow-up-d9c3c6b425e40eeb5c167d47832aa979833ff1cb632d58b040043d8479cf238c.json",
)


def load(path: Path) -> dict:
    """Load one JSON object artifact."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path.name} root must be an object")
    return value


def digest(path: Path) -> str:
    """Return the SHA-256 digest of one exact artifact."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def relative(path: Path) -> str:
    """Return one repository-relative POSIX path."""
    return path.relative_to(REPOSITORY).as_posix()


def load_receipt_generator():
    """Load the reviewed receipt generator from its file path."""
    path = TRACK / "generate_phase3_inspector_receipts.py"
    spec = importlib.util.spec_from_file_location("phase3_receipt_generator", path)
    if spec is None or spec.loader is None:
        raise AssertionError("receipt generator module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def official_records() -> tuple[dict[str, dict], dict[str, dict]]:
    """Load every official batch record and index every frozen group."""
    batches: dict[str, dict] = {}
    groups: dict[str, dict] = {}
    for index in range(1, 13):
        batch_id = f"AF-{index:02d}"
        record = load(TRACK / "batches" / batch_id / "inspection-records.json")
        if record.get("batch_id") != batch_id:
            raise AssertionError(f"{batch_id} record identity differs")
        batches[batch_id] = record
        for group in record.get("groups", []):
            group_id = group["identical_hash_group"]
            if group_id in groups:
                raise AssertionError(f"duplicate official group {group_id}")
            groups[group_id] = group
    if len(groups) != 227:
        raise AssertionError(f"official group denominator differs: {len(groups)}")
    return batches, groups


def validate_direct_review(groups: dict[str, dict]) -> dict:
    """Validate the root's direct image, frozen-blob, and video checks."""
    review = load(DIRECT_REVIEW)
    if (
        review.get("schema_version"),
        review.get("track_id"),
        review.get("reviewer"),
        review.get("decision"),
    ) != (
        "apk-asset-forensics.phase3-root-direct-fitness-review.v1",
        "apk_existing_asset_candidate_audit_20260712",
        "root-orchestrator-product-owner",
        "ACCEPT_PHASE3_DIRECT_INSPECTION_FITNESS",
    ):
        raise AssertionError("root direct-review identity or decision differs")
    for check in review.get("direct_image_checks", []):
        group = groups.get(check.get("identical_hash_group"))
        path = REPOSITORY / check.get("canonical_path", "")
        if (
            group is None
            or check["canonical_path"] not in group["member_paths"]
            or check.get("checked_out_sha256") != group["sha256"]
            or digest(path) != group["sha256"]
            or check.get("evidence_kind") != "direct_view_image_original"
        ):
            raise AssertionError(f"direct image check differs: {check}")
    if len(review.get("direct_image_checks", [])) != 6:
        raise AssertionError("direct image-check denominator differs")
    for check in review.get("direct_frozen_blob_checks", []):
        group = groups.get(check.get("identical_hash_group"))
        blob = subprocess.run(
            ["git", "cat-file", "blob", check.get("source_blob_oid", "")],
            cwd=REPOSITORY,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
        ).stdout
        if (
            group is None
            or check.get("source_blob_oid")
            != group["inspection_source"]["source_blob_oid"]
            or len(blob) != check.get("byte_size")
            or hashlib.sha256(blob).hexdigest() != group["sha256"]
        ):
            raise AssertionError(f"direct frozen-blob check differs: {check}")
    if len(review.get("direct_frozen_blob_checks", [])) != 5:
        raise AssertionError("direct frozen-blob denominator differs")
    video = review.get("supplemental_video_check")
    if not isinstance(video, dict):
        raise AssertionError("supplemental video review is missing")
    group = groups.get(video.get("identical_hash_group"))
    video_path = REPOSITORY / video.get("canonical_path", "")
    if (
        group is None
        or video.get("source_blob_oid") != group["inspection_source"]["source_blob_oid"]
        or video.get("checked_out_sha256") != group["sha256"]
        or digest(video_path) != group["sha256"]
        or sorted(video.get("frame_sha256", {})) != ["0", "10", "20", "30", "40"]
    ):
        raise AssertionError("supplemental video binding differs")
    return review


def validate_actual_receipts() -> None:
    """Require every published receipt to equal deterministic reviewed output."""
    expected = load_receipt_generator().render_receipts()
    for batch_id, receipt in expected.items():
        actual = load(
            TRACK / "role-receipts" / batch_id / "visual-audio-inspector.json"
        )
        if actual != receipt:
            raise AssertionError(f"{batch_id} published inspector receipt differs")


def render_acceptance() -> dict:
    """Render exact Phase 3 product-owner acceptance after all gates validate."""
    batches, groups = official_records()
    validate_direct_review(groups)
    validate_actual_receipts()
    media_counts: dict[str, int] = {}
    member_paths = 0
    for group in groups.values():
        media_class = group["media_class"]
        media_counts[media_class] = media_counts.get(media_class, 0) + 1
        member_paths += len(group["member_paths"])
    if (
        member_paths,
        media_counts,
    ) != (
        428,
        {
            "audio": 14,
            "text_or_data": 77,
            "unreadable_or_pointer": 5,
            "visual_or_video": 131,
        },
    ):
        raise AssertionError("Phase 3 accepted denominator differs")
    batch_bindings = {}
    for batch_id in sorted(batches):
        manifest = TRACK / "batches" / batch_id / "inspection-source-manifest.json"
        record = TRACK / "batches" / batch_id / "inspection-records.json"
        receipt = TRACK / "role-receipts" / batch_id / "visual-audio-inspector.json"
        batch_bindings[batch_id] = {
            "inspection_source_manifest_sha256": digest(manifest),
            "inspection_records_sha256": digest(record),
            "inspector_receipt_sha256": digest(receipt),
            "identical_hash_groups": len(batches[batch_id]["groups"]),
            "member_paths": sum(
                len(group["member_paths"]) for group in batches[batch_id]["groups"]
            ),
        }
    return {
        "schema_version": "apk-asset-forensics.phase3-root-acceptance.v1",
        "track_id": "apk_existing_asset_candidate_audit_20260712",
        "phase": 3,
        "accepted_by": "root-orchestrator-product-owner",
        "decision": "ACCEPT_PHASE3",
        "input_binding": {
            "phase3_input_freeze_sha256": digest(
                TRACK / "phase3-input-freeze-v1.json"
            ),
            "phase3_contract_sha256": digest(TRACK / "phase3-contract-test.py"),
            "root_direct_fitness_review_sha256": digest(DIRECT_REVIEW),
            "independent_review_sha256": {
                relative(path): digest(path) for path in REVIEW_FILES
            },
            "audio_evidence_sha256": {
                relative(path): digest(path) for path in AUDIO_EVIDENCE_FILES
            },
            "batch_bindings": batch_bindings,
        },
        "accepted_denominator": {
            "candidate_paths": member_paths,
            "identical_hash_groups": len(groups),
            "media_class_groups": media_counts,
            "inspection_source_manifests": 12,
            "inspection_records": 12,
            "inspector_receipts": 12,
            "independent_review_slices": 3,
        },
        "blocking_findings": {
            "critical": [],
            "high": [],
            "medium": [],
        },
        "verification": {
            "phase3_contract_pre_acceptance_state": (
                "all inspection records and receipts validate; deliberate RED "
                "pending this root acceptance"
            ),
            "working_notes": "227/227 exact direct observations validated",
            "official_records": "227/227 groups and 428/428 member paths",
            "independent_review": (
                "three fork_turns=none slices cover AF-01 through AF-12 with "
                "zero unresolved Critical, High, or Medium findings"
            ),
            "root_direct_review": (
                "six direct original-resolution images, five exact frozen Git "
                "blobs, and five individually viewed WebM timestamps"
            ),
            "audio_review": (
                "14/14 exact frozen audio groups have primary and independent "
                "audio-capable multimodal passes; two conflicts have preserved "
                "targeted follow-up artifacts and root reconciliation"
            ),
        },
        "disclosures": [
            "Phase 3 accepts visible and audible inspection evidence only; it does not decide compact/wide suitability or any asset disposition.",
            "The root orchestrator did not personally hear the audio; audio acceptance relies on exact-byte, audio-capable multimodal evidence and independent reconciliation.",
            "The supplemental WebM review samples five timestamps rather than every frame, so corruption remains conservatively unknown.",
            "Unreadable and pointer findings bind pinned historical Git blobs; a checked-out path may now contain different bytes without changing the frozen Phase 3 finding.",
        ],
        "rationale": (
            "All 227 frozen groups and 428 member paths have official direct "
            "inspection records and receipts, every substantive record received "
            "fresh independent review, all identified High and Medium defects were "
            "remediated and re-reviewed, automated bindings pass, and representative "
            "product-owner visual and byte-level checks corroborate the highest-risk "
            "findings."
        ),
    }


def main() -> None:
    """Check acceptance readiness or publish exact root acceptance."""
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    acceptance = render_acceptance()
    if args.check:
        print("READY: Phase 3 root acceptance evidence reconciles 428/428 paths")
        return
    path = TRACK / "phase3-root-acceptance.json"
    path.write_text(
        f"{json.dumps(acceptance, indent=2, ensure_ascii=False)}\n",
        encoding="utf-8",
    )
    print(f"WROTE: {path.name}")


if __name__ == "__main__":
    main()
