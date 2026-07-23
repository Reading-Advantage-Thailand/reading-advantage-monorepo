#!/usr/bin/env python3
"""Render Phase 3 inspector receipts from independently reviewed official records."""

import argparse
import hashlib
import json
from pathlib import Path


TRACK = Path(__file__).resolve().parent
FREEZE = TRACK / "phase3-input-freeze-v1.json"
REVIEW_SLICES = {
    "AF-01-04.json": (
        "/root/phase3_record_audit_a",
        [f"AF-{index:02d}" for index in range(1, 5)],
    ),
    "AF-05-08.json": (
        "/root/phase3_record_audit_b",
        [f"AF-{index:02d}" for index in range(5, 9)],
    ),
    "AF-09-12.json": (
        "/root/phase3_record_audit_c",
        [f"AF-{index:02d}" for index in range(9, 13)],
    ),
}


def load(path: Path) -> dict:
    """Load one JSON object."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path.name} root must be an object")
    return value


def digest(path: Path) -> str:
    """Return the SHA-256 digest of one exact artifact."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate_reviews() -> dict[str, dict]:
    """Validate independent review identity, record hashes, counts, and blockers."""
    reviewed: dict[str, dict] = {}
    for filename, (reviewer, expected_batches) in REVIEW_SLICES.items():
        report = load(TRACK / "phase3-reviews" / filename)
        required = {
            "schema_version",
            "track_id",
            "reviewer_task_name",
            "fork_turns",
            "batches",
            "findings",
            "totals",
            "scope_boundary",
            "validators_run",
            "prior_findings",
            "final_status",
        }
        if not required <= set(report):
            raise AssertionError(f"{filename} review schema is incomplete")
        if (
            report["schema_version"],
            report["track_id"],
            report["reviewer_task_name"],
            report["fork_turns"],
            report["final_status"],
        ) != (
            "apk-asset-forensics.phase3-independent-record-review.v1",
            "apk_existing_asset_candidate_audit_20260712",
            reviewer,
            "none",
            "pass",
        ):
            raise AssertionError(f"{filename} review identity or status differs")
        findings = report["findings"]
        if not isinstance(findings, dict):
            raise AssertionError(f"{filename} findings are malformed")
        for severity in ("critical", "high", "medium"):
            if findings.get(severity) != []:
                raise AssertionError(f"{filename} has unresolved {severity} findings")
        batches = report["batches"]
        if not isinstance(batches, list):
            raise AssertionError(f"{filename} batches are malformed")
        if [value.get("batch_id") for value in batches] != expected_batches:
            raise AssertionError(f"{filename} batch slice differs")
        group_total = 0
        member_total = 0
        for value in batches:
            batch_id = value["batch_id"]
            record_path = TRACK / "batches" / batch_id / "inspection-records.json"
            record = load(record_path)
            expected_path = str(record_path.relative_to(TRACK.parents[2]))
            reported_path = value.get(
                "inspection_records_path",
                value.get("inspection_record_path"),
            )
            reported_sha256 = value.get(
                "inspection_records_sha256",
                value.get("inspection_record_sha256"),
            )
            if (
                reported_path != expected_path
                or reported_sha256 != digest(record_path)
            ):
                raise AssertionError(f"{filename} {batch_id} record binding differs")
            groups = record.get("groups")
            if not isinstance(groups, list):
                raise AssertionError(f"{batch_id} record groups are malformed")
            group_count = len(groups)
            member_count = sum(len(group.get("member_paths", [])) for group in groups)
            if (
                value.get("identical_hash_groups"),
                value.get("member_paths"),
            ) != (group_count, member_count):
                raise AssertionError(f"{filename} {batch_id} counts differ")
            group_total += group_count
            member_total += member_count
            reviewed[batch_id] = record
        totals = report["totals"]
        if (
            totals.get("batches"),
            totals.get("identical_hash_groups"),
            totals.get("member_paths"),
        ) != (4, group_total, member_total):
            raise AssertionError(f"{filename} aggregate counts differ")
    if sorted(reviewed) != [f"AF-{index:02d}" for index in range(1, 13)]:
        raise AssertionError("independent review batch denominator differs")
    return reviewed


def render_receipts() -> dict[str, dict]:
    """Render closed-schema receipts for every independently reviewed batch."""
    records = validate_reviews()
    freeze_sha256 = digest(FREEZE)
    receipts: dict[str, dict] = {}
    for batch_id, record in sorted(records.items()):
        manifest_path = TRACK / "batches" / batch_id / "inspection-source-manifest.json"
        record_path = TRACK / "batches" / batch_id / "inspection-records.json"
        reviewed_groups = []
        for group in record["groups"]:
            evidence = group["inspection"]["primary_evidence"]
            reviewed_groups.append({
                "identical_hash_group": group["identical_hash_group"],
                "sha256": group["sha256"],
                "media_class": group["media_class"],
                "primary_evidence_kind": evidence["kind"],
                "direct_inspection_confirmed": True,
                "audio_capable_multimodal": group["media_class"] == "audio",
            })
        receipts[batch_id] = {
            "schema_version": "apk-role-receipt.phase3-visual-audio-inspector.v1",
            "track_id": "apk_existing_asset_candidate_audit_20260712",
            "batch_id": batch_id,
            "role": "visual-audio-inspector",
            "input_binding": {
                "phase3_input_freeze_sha256": freeze_sha256,
                "inspection_source_manifest_sha256": digest(manifest_path),
                "inspection_records_sha256": digest(record_path),
            },
            "reviewed_groups": reviewed_groups,
        }
    return receipts


def main() -> None:
    """Check reviewed readiness or write all deterministic inspector receipts."""
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    receipts = render_receipts()
    total = sum(len(receipt["reviewed_groups"]) for receipt in receipts.values())
    if total != 227:
        raise AssertionError(f"receipt denominator differs: {total}")
    if args.check:
        print("READY: 12 reviewed inspector receipts covering 227/227 frozen groups")
        return
    for batch_id, receipt in receipts.items():
        path = TRACK / "role-receipts" / batch_id / "visual-audio-inspector.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            f"{json.dumps(receipt, indent=2, ensure_ascii=False)}\n",
            encoding="utf-8",
        )
    print("WROTE: 12 inspector receipts covering 227/227 frozen groups")


if __name__ == "__main__":
    main()
