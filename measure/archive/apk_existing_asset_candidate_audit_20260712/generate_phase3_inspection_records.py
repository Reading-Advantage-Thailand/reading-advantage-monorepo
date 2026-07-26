#!/usr/bin/env python3
"""Render official Phase 3 inspection records from reviewed direct-evidence sidecars."""

import argparse
import hashlib
import json
from pathlib import Path

import phase3_working_notes_validator as working_validator


TRACK = Path(__file__).resolve().parent
NOTES = TRACK / "inspection-working-notes"
RISK_STATUSES = {"present", "absent", "unknown", "not_applicable"}
EVIDENCE_KINDS = {
    "visual_or_video": "direct_visual",
    "audio": "direct_audio_multimodal",
    "text_or_data": "direct_text_read",
    "unreadable_or_pointer": "direct_unreadable",
}
CLASSIFICATION_FILES = (
    "AF-01-04-classification.json",
    "AF-05-08-classification.json",
    "AF-09-12-classification.json",
)
PHASE3_FREEZE_SHA256 = "13762016892d6c735a0576bd233568742d07bda5c3ffdc2da7ec1875880c61fb"


def load(path: Path) -> dict:
    """Load one JSON object artifact."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path.name} root must be an object")
    return value


def require_text(value: object, label: str) -> str:
    """Return one non-empty evidence string."""
    if not isinstance(value, str) or not value.strip():
        raise AssertionError(f"{label} must be non-empty text")
    return value


def direct_observations() -> dict[str, dict]:
    """Normalize every validated direct working note without making new decisions."""
    expected = working_validator.expected_groups()
    visual = working_validator.validate_visual_notes(expected)
    text = working_validator.validate_text_notes(expected)
    unreadable = working_validator.validate_unreadable_notes(expected)
    audio = working_validator.validate_audio_notes(expected)
    if visual | text | unreadable | audio != set(expected):
        raise AssertionError("direct working-note denominator differs")
    records: dict[str, dict] = {}

    for filename, observer in (
        ("AF-01-04-visual.json", "subagent:phase3_visual_a"),
        ("AF-09-12-visual.json", "subagent:phase3_visual_c"),
    ):
        for note in load(NOTES / filename)["groups"]:
            group_id = note["group"]
            records[group_id] = {
                "locator": f"inspection-working-notes/{filename}#{group_id}",
                "observed_by": observer,
                "observations": [
                    note["observation"],
                    f"Limitation: {note['limitations']}",
                ],
            }
    filename = "AF-05-08-visual.json"
    for note in load(NOTES / filename)["records"]:
        group_id = f"sha256:{note['locator']['frozen_sha256']}"
        records[group_id] = {
            "locator": f"inspection-working-notes/{filename}#{group_id}",
            "observed_by": "subagent:phase3_visual_b",
            "observations": [
                note["observation"],
                f"Limitation: {note['limitation']}",
            ],
        }

    filename = "text-data.json"
    for note in load(NOTES / filename)["records"]:
        group_id = note["identical_hash_group"]
        records[group_id] = {
            "locator": f"inspection-working-notes/{filename}#{group_id}",
            "observed_by": "root-orchestrator:direct-frozen-text-read",
            "observations": [
                json.dumps(note["observation"], sort_keys=True, ensure_ascii=False),
                f"Limitation: {note['limitation']}",
            ],
        }

    filename = "unreadable-pointer.json"
    for note in load(NOTES / filename)["records"]:
        group_id = note["identical_hash_group"]
        records[group_id] = {
            "locator": f"inspection-working-notes/{filename}#{group_id}",
            "observed_by": "root-orchestrator:direct-frozen-byte-read",
            "observations": [
                note["direct_byte_observation"],
                note["checked_out_state"],
                f"Limitation: {note['limitation']}",
            ],
        }

    filename = "audio-multimodal.json"
    audio_document = load(NOTES / filename)
    review_filename = "audio-multimodal-independent-review.json"
    review_document = load(NOTES / review_filename)
    if (
        review_document.get("schema_version")
        != "apk-asset-forensics.phase3-audio-independent-review.v1"
        or review_document.get("provider")
        != {
            "endpoint": "https://openrouter.ai/api/v1/chat/completions",
            "model": "google/gemini-3-flash-preview",
            "audio_capable_multimodal": True,
        }
    ):
        raise AssertionError("independent audio-review identity differs")
    review_by_group = {
        record["identical_hash_group"]: record
        for record in review_document.get("records", [])
    }
    if len(review_by_group) != 14:
        raise AssertionError("independent audio-review denominator differs")
    reconciliation = load(NOTES / "audio-review-reconciliation.json")
    if (
        reconciliation.get("schema_version")
        != "apk-asset-forensics.phase3-audio-review-reconciliation.v1"
    ):
        raise AssertionError("audio-review reconciliation identity differs")
    reconciliation_by_group = {
        decision["identical_hash_group"]: decision
        for decision in reconciliation.get("root_orchestrator_decisions", [])
    }
    for note in audio_document["records"]:
        group_id = note["identical_hash_group"]
        observation = note["observation"]
        review = review_by_group.get(group_id)
        if (
            not isinstance(review, dict)
            or review.get("inspection_source") != note["inspection_source"]
            or review.get("evidence_kind") != "direct_audio_multimodal"
            or review.get("model") == note["model"]
            or not isinstance(review.get("provider_response_id"), str)
        ):
            raise AssertionError(f"{group_id} independent audio review differs")
        review_observation = review.get("observation")
        if not isinstance(review_observation, dict):
            raise AssertionError(f"{group_id} independent audio observation is missing")
        combined_observations = [
            f"Primary {key}: {value}" for key, value in observation.items()
        ] + [
            f"Independent review {key}: {value}"
            for key, value in review_observation.items()
        ]
        decision = reconciliation_by_group.get(group_id)
        locator = (
            f"inspection-working-notes/{filename}#{group_id}; "
            f"inspection-working-notes/{review_filename}#{group_id}"
        )
        observed_by = (
            f"openrouter:{note['model']}:{note['provider_response_id']}; "
            f"openrouter:{review['model']}:{review['provider_response_id']}"
        )
        pass_count = 2
        if decision is not None:
            if (
                decision.get("primary_response_id") != note["provider_response_id"]
                or decision.get("independent_response_id")
                != review["provider_response_id"]
            ):
                raise AssertionError(f"{group_id} reconciliation response binding differs")
            locator += (
                f"; inspection-working-notes/audio-review-reconciliation.json"
                f"#{group_id}"
            )
            follow_up_id = decision.get("targeted_follow_up_response_id")
            follow_up_model = decision.get("targeted_follow_up_model")
            if follow_up_id is not None or follow_up_model is not None:
                require_text(follow_up_id, f"{group_id} follow-up response")
                require_text(follow_up_model, f"{group_id} follow-up model")
                observed_by += f"; openrouter:{follow_up_model}:{follow_up_id}"
                pass_count += 1
            follow_up_artifact = decision.get("targeted_follow_up_artifact")
            if follow_up_artifact is not None:
                artifact = load(TRACK / require_text(
                    follow_up_artifact,
                    f"{group_id} follow-up artifact",
                ))
                values = artifact.get("records")
                if (
                    artifact.get("schema_version")
                    != "apk-asset-forensics.phase3-audio-targeted-follow-up.v1"
                    or not isinstance(values, list)
                    or len(values) != 1
                    or values[0].get("identical_hash_group") != group_id
                    or values[0].get("inspection_source") != note["inspection_source"]
                    or values[0].get("provider_response_id") != follow_up_id
                    or values[0].get("model") != follow_up_model
                ):
                    raise AssertionError(f"{group_id} follow-up artifact binding differs")
                locator += f"; {follow_up_artifact}#{group_id}"
            combined_observations.append(
                f"Root reconciliation: {decision['decision']} — {decision['reason']}"
            )
        records[group_id] = {
            "locator": locator,
            "observed_by": observed_by,
            "observations": combined_observations
            + [
                "Limitation: "
                f"{pass_count} direct audio-capable model passes over exact frozen "
                "bytes; no runtime mixing, loudness normalization, loop-boundary, "
                "or gameplay suitability claim."
            ],
        }
    if set(review_by_group) != {
        note["identical_hash_group"] for note in audio_document["records"]
    }:
        raise AssertionError("independent audio-review group set differs")
    if set(reconciliation_by_group) != {
        "sha256:2da344189f4831c130645d8396df434a9b35007d2cef98244632bb35e8a83cb3",
        "sha256:a52c3be27272c5254d9d0e2941fad0ec15e0cb09b80eb445bfa538de56b2c361",
        "sha256:d9c3c6b425e40eeb5c167d47832aa979833ff1cb632d58b040043d8479cf238c",
    }:
        raise AssertionError("audio-review reconciliation group set differs")
    if set(records) != set(expected):
        raise AssertionError("normalized direct-observation set differs")
    return records


def classifications(expected: dict[str, dict]) -> dict[str, dict]:
    """Load explicit inspector classifications and reject missing or extra groups."""
    records: dict[str, dict] = {}
    for filename in CLASSIFICATION_FILES:
        document = load(NOTES / filename)
        if document.get("schema_version") != "apk-asset-forensics.phase3-working-classification.v1":
            raise AssertionError(f"{filename} schema differs")
        values = document.get("records")
        if not isinstance(values, list):
            raise AssertionError(f"{filename} records are malformed")
        for value in values:
            if not isinstance(value, dict):
                raise AssertionError(f"{filename} contains a non-object record")
            required = {
                "batch_id",
                "identical_hash_group",
                "state_or_direction_coverage",
                "baked_text_or_ui",
                "placeholder_risk",
                "corruption_risk",
            }
            if set(value) != required:
                raise AssertionError(f"{filename} classification schema differs")
            group_id = require_text(
                value["identical_hash_group"],
                f"{filename} group",
            )
            frozen = expected.get(group_id)
            if frozen is None or value["batch_id"] != frozen["batch_id"]:
                raise AssertionError(f"{filename} group binding differs: {group_id}")
            coverage = value["state_or_direction_coverage"]
            if coverage is not None:
                require_text(coverage, f"{group_id} state/direction coverage")
            for field in ("baked_text_or_ui", "placeholder_risk", "corruption_risk"):
                if value[field] not in RISK_STATUSES:
                    raise AssertionError(f"{group_id} {field} status differs")
            if group_id in records:
                raise AssertionError(f"duplicate classification {group_id}")
            records[group_id] = value
    if set(records) != set(expected):
        missing = sorted(set(expected) - set(records))
        extra = sorted(set(records) - set(expected))
        raise AssertionError(
            f"classification denominator differs; missing={missing} extra={extra}"
        )
    return records


def render_records() -> dict[str, dict]:
    """Render one closed-schema official inspection artifact per frozen batch."""
    expected = working_validator.expected_groups()
    observations = direct_observations()
    decisions = classifications(expected)
    by_batch: dict[str, dict] = {}
    for batch_id in sorted({group["batch_id"] for group in expected.values()}):
        batch_groups = {
            group_id: group
            for group_id, group in expected.items()
            if group["batch_id"] == batch_id
        }
        rendered_groups = []
        for group_id in sorted(batch_groups):
            frozen = batch_groups[group_id]
            direct = observations[group_id]
            classification = decisions[group_id]
            rendered_groups.append({
                "identical_hash_group": group_id,
                "sha256": frozen["sha256"],
                "media_class": frozen["media_class"],
                "member_paths": [
                    member["canonical_path"] for member in frozen["member_sources"]
                ],
                "inspection_source": frozen["inspection_source"],
                "inspection": {
                    "primary_evidence": {
                        "kind": EVIDENCE_KINDS[frozen["media_class"]],
                        "locator": direct["locator"],
                        "observed_by": direct["observed_by"],
                    },
                    "observations": direct["observations"],
                    "state_or_direction_coverage": classification[
                        "state_or_direction_coverage"
                    ],
                    "baked_text_or_ui": classification["baked_text_or_ui"],
                    "placeholder_risk": classification["placeholder_risk"],
                    "corruption_risk": classification["corruption_risk"],
                },
            })
        source_manifest = TRACK / "batches" / batch_id / "inspection-source-manifest.json"
        freeze = load(TRACK / "phase3-input-freeze-v1.json")
        by_batch[batch_id] = {
            "schema_version": "apk-asset-forensics.phase3-inspection-records.v1",
            "track_id": "apk_existing_asset_candidate_audit_20260712",
            "batch_id": batch_id,
            "input_binding": {
                "phase3_input_freeze_sha256": PHASE3_FREEZE_SHA256,
                "inspection_source_manifest_sha256": hashlib.sha256(
                    source_manifest.read_bytes()
                ).hexdigest(),
                "base_record_revision": freeze["effective_denominator_binding"][
                    "base_record_revision"
                ],
                "delta_revision": freeze["effective_denominator_binding"][
                    "delta_revision"
                ],
                "effective_candidate_paths": freeze["effective_denominator_binding"][
                    "candidate_paths"
                ],
                "effective_identical_hash_groups": freeze[
                    "effective_denominator_binding"
                ]["identical_hash_groups"],
            },
            "producer": {"role": "visual-audio-inspector"},
            "groups": rendered_groups,
        }
    return by_batch


def main() -> None:
    """Check readiness or write deterministic official inspection records."""
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    records = render_records()
    total = sum(len(record["groups"]) for record in records.values())
    if total != 227:
        raise AssertionError(f"rendered inspection denominator differs: {total}")
    if args.check:
        print(
            "READY: 227/227 frozen groups have direct observations and explicit "
            "classifications; no official inspection records written"
        )
        return
    for batch_id, record in records.items():
        path = TRACK / "batches" / batch_id / "inspection-records.json"
        path.write_text(
            f"{json.dumps(record, indent=2, ensure_ascii=False)}\n",
            encoding="utf-8",
        )
    print("WROTE: 12 official inspection-record files covering 227/227 frozen groups")


if __name__ == "__main__":
    main()
