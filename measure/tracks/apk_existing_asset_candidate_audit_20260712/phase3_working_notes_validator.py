#!/usr/bin/env python3
"""Validate exact direct-evidence coverage in non-decisional Phase 3 working notes."""

import hashlib
import importlib.util
import json
from pathlib import Path


TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
NOTES = TRACK / "inspection-working-notes"
MEDIA_COUNTS = {
    "visual_or_video": 131,
    "audio": 14,
    "text_or_data": 77,
    "unreadable_or_pointer": 5,
}


def load(path: Path) -> dict:
    """Load one JSON object or reject malformed working evidence."""
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise AssertionError(f"{path.name} root must be an object")
    return value


def require_text(value: object, label: str) -> str:
    """Return a non-empty string or reject the evidence field."""
    if not isinstance(value, str) or not value.strip():
        raise AssertionError(f"{label} must be non-empty text")
    return value


def expected_groups() -> dict[str, dict]:
    """Return groups only after the authoritative contract verifies every frozen Git byte."""
    contract_path = TRACK / "phase3-contract-test.py"
    spec = importlib.util.spec_from_file_location("phase3_contract", contract_path)
    if spec is None or spec.loader is None:
        raise AssertionError("Phase 3 contract could not be loaded")
    contract = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(contract)
    freeze, phase0, phase2_input, acceptance = contract.assert_predecessors()
    expected_batches = contract.derive_expected_batches(phase0, phase2_input)
    contract.assert_source_manifests(
        expected_batches,
        freeze,
        phase2_input,
        acceptance,
    )
    records: dict[str, dict] = {}
    for batch_id in expected_batches:
        manifest = load(TRACK / "batches" / batch_id / "inspection-source-manifest.json")
        for group in manifest["groups"]:
            group_id = group["identical_hash_group"]
            if group_id in records:
                raise AssertionError(f"duplicate frozen group {group_id}")
            records[group_id] = {**group, "batch_id": batch_id}
    if len(records) != 227:
        raise AssertionError(f"frozen group count differs: {len(records)}")
    return records


def assert_checked_out_bytes(path: str, sha256: str, label: str) -> None:
    """Require a directly viewed checkout path to equal the verified frozen Git bytes."""
    absolute = REPO / path
    if not absolute.is_file():
        raise AssertionError(f"{label} checked-out source is missing")
    if hashlib.sha256(absolute.read_bytes()).hexdigest() != sha256:
        raise AssertionError(f"{label} checked-out bytes differ from frozen evidence")


def validate_visual_notes(expected: dict[str, dict]) -> set[str]:
    """Validate all three direct visual/video note batches against frozen locators."""
    covered: set[str] = set()
    for filename in ("AF-01-04-visual.json", "AF-09-12-visual.json"):
        document = load(NOTES / filename)
        require_text(document.get("direct_viewing_method"), f"{filename} viewing method")
        for index, note in enumerate(document.get("groups", [])):
            group_id = require_text(note.get("group"), f"{filename}:{index} group")
            frozen = expected.get(group_id)
            if frozen is None or frozen["media_class"] != "visual_or_video":
                raise AssertionError(f"{filename}:{index} is not a frozen visual group")
            if note.get("batch") != frozen["batch_id"]:
                raise AssertionError(f"{group_id} batch differs")
            if note.get("locator") != frozen["inspection_source"]["canonical_path"]:
                raise AssertionError(f"{group_id} canonical locator differs")
            observation = require_text(note.get("observation"), f"{group_id} observation")
            limitations = require_text(note.get("limitations"), f"{group_id} limitations")
            if "no direct visual observation" in observation.lower() or "unavailable" in limitations.lower():
                raise AssertionError(f"{group_id} lacks direct visual evidence")
            assert_checked_out_bytes(note["locator"], frozen["sha256"], group_id)
            if group_id in covered:
                raise AssertionError(f"duplicate visual note {group_id}")
            covered.add(group_id)
        summary = document.get("summary")
        if not isinstance(summary, dict) or summary.get("listed_groups") != len(document["groups"]):
            raise AssertionError(f"{filename} summary count differs")
        if filename == "AF-01-04-visual.json" and (
            summary.get("directly_rendered_by_view_image", 0)
            + summary.get("directly_rendered_from_frozen_svg", 0)
            != len(document["groups"])
            or summary.get("renderer_unavailable_for_svg") != 0
        ):
            raise AssertionError("AF-01-04 visual rendering summary differs")
        if filename == "AF-09-12-visual.json" and summary.get("directly_viewed_groups") != len(document["groups"]):
            raise AssertionError("AF-09-12 visual rendering summary differs")

    document = load(NOTES / "AF-05-08-visual.json")
    require_text(document.get("verification_method"), "AF-05-08 verification method")
    for index, note in enumerate(document.get("records", [])):
        locator = note.get("locator")
        if not isinstance(locator, dict):
            raise AssertionError(f"AF-05-08:{index} locator must be an object")
        sha256 = require_text(locator.get("frozen_sha256"), f"AF-05-08:{index} SHA-256")
        group_id = f"sha256:{sha256}"
        frozen = expected.get(group_id)
        if frozen is None or frozen["media_class"] != "visual_or_video":
            raise AssertionError(f"AF-05-08:{index} is not a frozen visual group")
        if note.get("batch_id") != frozen["batch_id"]:
            raise AssertionError(f"{group_id} batch differs")
        if locator.get("canonical_path") != frozen["inspection_source"]["canonical_path"]:
            raise AssertionError(f"{group_id} canonical locator differs")
        if note.get("checked_out_sha256") != sha256:
            raise AssertionError(f"{group_id} checked-out bytes differ")
        evidence_kind = require_text(note.get("evidence_kind"), f"{group_id} evidence kind")
        if evidence_kind not in {
            "direct_visual_view_image",
            "direct_visual_rasterized_frozen_svg_view_image",
        }:
            raise AssertionError(f"{group_id} is not direct visual evidence")
        require_text(note.get("observation"), f"{group_id} observation")
        require_text(note.get("limitation"), f"{group_id} limitation")
        assert_checked_out_bytes(locator["canonical_path"], sha256, group_id)
        if group_id in covered:
            raise AssertionError(f"duplicate visual note {group_id}")
        covered.add(group_id)
    return covered


def validate_text_notes(expected: dict[str, dict]) -> set[str]:
    """Validate byte-level text/data observations against exact frozen sources."""
    covered: set[str] = set()
    document = load(NOTES / "text-data.json")
    for index, note in enumerate(document.get("records", [])):
        group_id = require_text(note.get("identical_hash_group"), f"text-data:{index} group")
        frozen = expected.get(group_id)
        if frozen is None or frozen["media_class"] != "text_or_data":
            raise AssertionError(f"text-data:{index} is not a frozen text/data group")
        if note.get("batch_id") != frozen["batch_id"]:
            raise AssertionError(f"{group_id} batch differs")
        if note.get("inspection_source") != frozen["inspection_source"]:
            raise AssertionError(f"{group_id} inspection source differs")
        if note.get("evidence_kind") not in {"direct_text_json_bytes", "direct_text_markdown_bytes"}:
            raise AssertionError(f"{group_id} evidence kind differs")
        if not isinstance(note.get("observation"), dict) or not note["observation"]:
            raise AssertionError(f"{group_id} observation is missing")
        require_text(note.get("limitation"), f"{group_id} limitation")
        if group_id in covered:
            raise AssertionError(f"duplicate text/data note {group_id}")
        covered.add(group_id)
    return covered


def validate_unreadable_notes(expected: dict[str, dict]) -> set[str]:
    """Validate direct frozen-byte observations for unreadable and pointer groups."""
    covered: set[str] = set()
    document = load(NOTES / "unreadable-pointer.json")
    for index, note in enumerate(document.get("records", [])):
        group_id = require_text(note.get("identical_hash_group"), f"unreadable:{index} group")
        frozen = expected.get(group_id)
        if frozen is None or frozen["media_class"] != "unreadable_or_pointer":
            raise AssertionError(f"unreadable:{index} is not a frozen unreadable group")
        if note.get("batch_id") != frozen["batch_id"]:
            raise AssertionError(f"{group_id} batch differs")
        expected_locator = f"git-blob:{frozen['inspection_source']['source_blob_oid']}"
        if note.get("inspection_source") != expected_locator:
            raise AssertionError(f"{group_id} frozen blob locator differs")
        require_text(note.get("direct_byte_observation"), f"{group_id} byte observation")
        require_text(note.get("checked_out_state"), f"{group_id} checkout caveat")
        require_text(note.get("limitation"), f"{group_id} limitation")
        if group_id in covered:
            raise AssertionError(f"duplicate unreadable note {group_id}")
        covered.add(group_id)
    return covered


def validate_audio_notes(expected: dict[str, dict]) -> set[str]:
    """Validate audio-capable multimodal observations against exact frozen audio bytes."""
    covered: set[str] = set()
    document = load(NOTES / "audio-multimodal.json")
    if document.get("schema_version") != "apk-asset-forensics.phase3-audio-working-notes.v1":
        raise AssertionError("audio working-note schema differs")
    provider = document.get("provider")
    if provider != {
        "endpoint": "https://openrouter.ai/api/v1/chat/completions",
        "model": "google/gemini-2.5-flash",
        "audio_capable_multimodal": True,
    }:
        raise AssertionError("audio working-note provider identity differs")
    observation_keys = {
        "audible_content",
        "content_class",
        "speech_or_language",
        "temporal_coverage",
        "placeholder_risk_observation",
        "corruption_or_clipping",
    }
    allowed_classes = {
        "vocalization",
        "speech",
        "music",
        "ambient",
        "sound_effect",
        "mixed",
        "unclear",
    }
    response_ids: set[str] = set()
    for index, note in enumerate(document.get("records", [])):
        group_id = require_text(note.get("identical_hash_group"), f"audio:{index} group")
        frozen = expected.get(group_id)
        if frozen is None or frozen["media_class"] != "audio":
            raise AssertionError(f"audio:{index} is not a frozen audio group")
        if note.get("batch_id") != frozen["batch_id"]:
            raise AssertionError(f"{group_id} batch differs")
        if note.get("inspection_source") != frozen["inspection_source"]:
            raise AssertionError(f"{group_id} inspection source differs")
        if note.get("evidence_kind") != "direct_audio_multimodal":
            raise AssertionError(f"{group_id} evidence kind differs")
        if note.get("model") != provider["model"]:
            raise AssertionError(f"{group_id} model identity differs")
        response_id = require_text(note.get("provider_response_id"), f"{group_id} response ID")
        if response_id in response_ids:
            raise AssertionError(f"duplicate provider response ID {response_id}")
        response_ids.add(response_id)
        observation = note.get("observation")
        if not isinstance(observation, dict) or set(observation) != observation_keys:
            raise AssertionError(f"{group_id} observation schema differs")
        for key in observation_keys:
            require_text(observation[key], f"{group_id} {key}")
        if observation["content_class"] not in allowed_classes:
            raise AssertionError(f"{group_id} content class differs")
        if not isinstance(note.get("usage"), dict):
            raise AssertionError(f"{group_id} provider usage is missing")
        require_text(note.get("limitation"), f"{group_id} limitation")
        assert_checked_out_bytes(
            frozen["inspection_source"]["canonical_path"],
            frozen["sha256"],
            group_id,
        )
        if group_id in covered:
            raise AssertionError(f"duplicate audio note {group_id}")
        covered.add(group_id)
    return covered


def main() -> None:
    """Validate all working evidence without promoting it to official Phase 3 outputs."""
    expected = expected_groups()
    by_class = {
        media_class: {group_id for group_id, group in expected.items() if group["media_class"] == media_class}
        for media_class in MEDIA_COUNTS
    }
    visual = validate_visual_notes(expected)
    text = validate_text_notes(expected)
    unreadable = validate_unreadable_notes(expected)
    audio = validate_audio_notes(expected)
    if visual != by_class["visual_or_video"]:
        raise AssertionError("visual/video working-note coverage differs from frozen groups")
    if text != by_class["text_or_data"]:
        raise AssertionError("text/data working-note coverage differs from frozen groups")
    if unreadable != by_class["unreadable_or_pointer"]:
        raise AssertionError("unreadable/pointer working-note coverage differs from frozen groups")
    if audio != by_class["audio"]:
        raise AssertionError("audio working-note coverage differs from frozen groups")
    covered = visual | text | unreadable | audio
    if covered != set(expected):
        raise AssertionError("working-note coverage does not equal the frozen denominator")
    print(
        "VERIFIED_WORKING_NOTES: direct working notes 227/227; "
        "visual_or_video 131/131; text_or_data 77/77; "
        "unreadable_or_pointer 5/5; audio 14/14; "
        "working-note evidence is complete but Phase 3 acceptance remains governed "
        "by the official contract and independent inspector receipts"
    )


if __name__ == "__main__":
    main()
