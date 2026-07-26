#!/usr/bin/env python3
"""Generate T8 Phase 1 mechanical metadata from the closed Git-bound inputs."""
import hashlib
import io
import json
import math
import os
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from collections import OrderedDict
from pathlib import Path

from PIL import Image

TRACK = Path("measure/tracks/apk_existing_asset_candidate_audit_20260712")
BASE_REV = "23bb5ad578c01fb29f9e8bb76a7d934d24a4b286"
DELTA_REV = "65fc00d872ce5aa63820662ee0a1f14952e63235"
FREEZE_SHA = "d4bd3606c7c75f495f2d8486ea4220f48aefd9eb216689b765aa9d96f58f2a9b"
DELTA_SHA = "71592625cbe09671937b7406afa38f3f59232c0345de455467121dc038863db2"
DENOM_SHA = "41c9ede1a8e5ddab21b74a99959fbddc35b5f5a6902740a740a48f174bf7f438"
PUB_REV = "ba95e6fb1db6acdaecd0808ca1f22dec339d6c5d"
CEILING = 268435456
BINDING = OrderedDict((
    ("phase0_input_freeze_sha256", FREEZE_SHA), ("base_denominator_sha256", DENOM_SHA),
    ("base_manifest_publication_revision", PUB_REV), ("base_record_revision", BASE_REV),
    ("accepted_delta_sha256", DELTA_SHA), ("delta_revision", DELTA_REV),
    ("effective_candidate_paths", 428), ("effective_identical_hash_groups", 227),
))


def run(args, data=None):
    return subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True).stdout


def cat_batch(specs):
    """Read exact Git blobs for revision:path specs and retain their Git headers."""
    raw = run(["git", "cat-file", "--batch"], ("\n".join(specs) + "\n").encode())
    out, index = {}, 0
    for spec in specs:
        stop = raw.index(b"\n", index)
        header = raw[index:stop].decode()
        index = stop + 1
        parts = header.split()
        if len(parts) != 3 or parts[1] != "blob":
            raise RuntimeError(f"Git blob unavailable: {spec}: {header}")
        oid, size = parts[0], int(parts[2])
        content = raw[index:index + size]
        if len(content) != size or raw[index + size:index + size + 1] != b"\n":
            raise RuntimeError(f"Git blob framing mismatch: {spec}")
        index += size + 1
        out[spec] = (oid, content)
    if index != len(raw):
        raise RuntimeError("Git batch returned trailing bytes")
    return out


def fmt_mime(path):
    ext = Path(path).suffix.lower()
    return {
        ".png": ("png", "image/png"), ".jpg": ("jpg", "image/jpeg"),
        ".svg": ("svg", "image/svg+xml"), ".mp3": ("mp3", "audio/mpeg"),
        ".webm": ("webm", "video/webm"), ".json": ("json", "application/json"),
        ".md": ("md", "text/markdown"),
    }[ext]


def svg_dimension(value):
    """Return a positive integer SVG dimension from a numeric XML value."""
    if not value:
        return None
    try:
        number = float(str(value).strip().removesuffix("px"))
    except ValueError:
        return None
    return int(round(number)) if number > 0 else None


def image_metadata(blob, svg):
    if svg:
        root = ET.fromstring(blob)
        width, height = svg_dimension(root.get("width")), svg_dimension(root.get("height"))
        if width is None or height is None:
            view_box = root.get("viewBox", "").replace(",", " ").split()
            if len(view_box) == 4:
                width = width or svg_dimension(view_box[2])
                height = height or svg_dimension(view_box[3])
        return {"parse_status": "passed", "decode_status": "not_applicable", "readability_status": "readable", "empty": len(blob) == 0, "mislabeled": False, "text_risk": "possible"}, {"width": width, "height": height, "has_alpha": None, "color_model": "vector"}
    with Image.open(io.BytesIO(blob)) as image:
        image.verify()
    with Image.open(io.BytesIO(blob)) as image:
        width, height, mode = image.width, image.height, image.mode
    return {"parse_status": "not_applicable", "decode_status": "passed", "readability_status": "readable", "empty": len(blob) == 0, "mislabeled": False, "text_risk": "possible"}, {"width": width, "height": height, "has_alpha": "A" in mode or mode in {"PA"}, "color_model": mode}

def media_metadata(blob, suffix, kind):
    with tempfile.NamedTemporaryFile(suffix=suffix) as temp:
        temp.write(blob)
        temp.flush()
        probe = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name,codec_type,channels,sample_rate,width,height", "-of", "json", temp.name]))
    streams = probe.get("streams", [])
    stream = next((item for item in streams if item.get("codec_type") == kind), None)
    duration = probe.get("format", {}).get("duration")
    if stream is None or duration is None:
        raise RuntimeError(f"ffprobe metadata missing for {suffix}")
    duration_ms = int(round(float(duration) * 1000))
    if duration_ms <= 0:
        raise RuntimeError(f"ffprobe duration invalid for {suffix}")
    flags = {"parse_status": "not_applicable", "decode_status": "passed", "readability_status": "readable", "empty": len(blob) == 0, "mislabeled": False, "text_risk": "not_applicable"}
    if kind == "audio":
        data = {"duration_ms": duration_ms, "channels": int(stream["channels"]), "sample_rate_hz": int(stream["sample_rate"]), "codec": stream["codec_name"]}
    else:
        data = {"width": int(stream["width"]), "height": int(stream["height"]), "duration_ms": duration_ms, "codec": stream["codec_name"]}
    return flags, data


def data_metadata(blob, ext):
    text = blob.decode("utf-8")
    if ext == ".json":
        value = json.loads(text)
        top = "object" if isinstance(value, dict) else "array" if isinstance(value, list) else type(value).__name__
        parse_format = "json"
    else:
        top, parse_format = "text", "utf-8"
    return {"parse_status": "passed", "decode_status": "not_applicable", "readability_status": "readable", "empty": len(blob) == 0, "mislabeled": False, "text_risk": "not_applicable"}, {"encoding": "utf-8", "parse_format": parse_format, "top_level_type": top}


def detected_format_mime(blob, ext, flags):
    """Detect only the format and MIME type mechanically supported by blob bytes."""
    if not blob:
        return None, None
    if blob.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png", "image/png"
    if blob.startswith(b"\xff\xd8\xff"):
        return "jpg", "image/jpeg"
    if ext == ".svg":
        try:
            root = ET.fromstring(blob)
            if root.tag.rsplit("}", 1)[-1] == "svg":
                return "svg", "image/svg+xml"
        except ET.ParseError:
            pass
    if ext == ".mp3" and (blob.startswith(b"ID3") or (len(blob) >= 2 and blob[0] == 0xff and blob[1] & 0xe0 == 0xe0)) and flags["decode_status"] == "passed":
        return "mp3", "audio/mpeg"
    if ext == ".webm" and blob.startswith(b"\x1aE\xdf\xa3") and flags["decode_status"] == "passed":
        return "webm", "video/webm"
    if ext == ".json":
        try:
            json.loads(blob.decode("utf-8"))
            return "json", "application/json"
        except (UnicodeDecodeError, json.JSONDecodeError):
            pass
    if ext == ".md":
        try:
            blob.decode("utf-8")
            return "md", "text/markdown"
        except UnicodeDecodeError:
            pass
    return None, None


def metadata(record, blob):
    path, ext = record["canonical_path"], Path(record["canonical_path"]).suffix.lower()
    format_name, mime = fmt_mime(path)
    if ext in {".png", ".jpg", ".svg"}:
        flags, specific = image_metadata(blob, ext == ".svg")
    elif ext == ".mp3":
        flags, specific = media_metadata(blob, ext, "audio")
    elif ext == ".webm":
        flags, specific = media_metadata(blob, ext, "video")
    else:
        flags, specific = data_metadata(blob, ext)
    detected_format, detected_mime_type = detected_format_mime(blob, ext, flags)
    flags["mislabeled"] = detected_format != format_name or detected_mime_type != mime
    return OrderedDict((
        ("canonical_path", path), ("sha256", record["sha256"]), ("revision", record["revision"]),
        ("source_blob_oid", record["source_blob_oid"]), ("file_kind", record["file_kind"]),
        ("byte_size", len(blob)), ("format", format_name), ("mime_type", mime),
        ("detected_format", detected_format), ("detected_mime_type", detected_mime_type),
        ("flags", flags), ("type_specific", specific),
    ))

def dump(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main():
    batches = sorted((TRACK / "batches").glob("AF-*"))
    base_paths = [batch / "candidate-records-base.json" for batch in batches]
    if len(base_paths) != 12:
        raise RuntimeError("expected exactly 12 base-record files")
    base_specs = [f"HEAD:{path.as_posix()}" for path in base_paths]
    base_blobs = cat_batch(base_specs)
    staged, aggregate_commands, aggregate_bytes, aggregate_paths, aggregate_groups = [], 0, 0, 0, 0
    for batch, path, spec in zip(batches, base_paths, base_specs):
        base_oid, base_bytes = base_blobs[spec]
        if path.read_bytes() != base_bytes:
            raise RuntimeError(f"working-tree base-record mismatch: {path}")
        artifact = json.loads(base_bytes)
        records = artifact["records"]
        specs = [f"{record['revision']}:{record['canonical_path']}" for record in records]
        blobs = cat_batch(specs)
        parsed, bytes_read, media_count = [], len(base_bytes), 0
        for record, source_spec in zip(records, specs):
            oid, blob = blobs[source_spec]
            if oid != record["source_blob_oid"]:
                raise RuntimeError(f"source OID mismatch: {record['canonical_path']}")
            if hashlib.sha256(blob).hexdigest() != record["sha256"]:
                raise RuntimeError(f"source SHA mismatch: {record['canonical_path']}")
            parsed.append(metadata(record, blob))
            bytes_read += len(blob)
            if Path(record["canonical_path"]).suffix.lower() in {".mp3", ".webm"}:
                bytes_read += len(blob)
                media_count += 1
        commands = 2 + media_count
        groups = len({record["identical_hash_group"] for record in records})
        if commands > 80 or bytes_read > CEILING:
            raise RuntimeError(f"resource ceiling exceeded: {batch.name}")
        output = OrderedDict((
            ("schema_version", "apk-asset-forensics.phase1-mechanical-metadata.v1"),
            ("track_id", "apk_existing_asset_candidate_audit_20260712"), ("batch_id", batch.name),
            ("input_binding", BINDING),
            ("producer", {"role": "mechanical-metadata-inspector", "receipt_path": "role-receipts/phase1/mechanical-metadata-inspector.json"}),
            ("records", parsed),
            ("resource_usage", {"candidate_paths": len(records), "hash_groups": groups, "command_invocations": commands, "bytes_read": bytes_read, "within_ceiling": True}),
        ))
        staged.append((batch / "mechanical-metadata.json", output))
        aggregate_commands += commands; aggregate_bytes += bytes_read; aggregate_paths += len(records); aggregate_groups += groups
    if (aggregate_paths, aggregate_groups) != (428, 227) or aggregate_commands > 960 or aggregate_bytes > CEILING * 12:
        raise RuntimeError("aggregate reconciliation or ceiling mismatch")
    for path, output in staged:
        dump(path, output)
    output_hashes = OrderedDict((str(path), hashlib.sha256(path.read_bytes()).hexdigest()) for path, _ in staged)
    receipt = OrderedDict((
        ("schema_version", "apk-role-receipt.v1"), ("track_id", "apk_existing_asset_candidate_audit_20260712"),
        ("batch_id", "phase1"), ("role", "mechanical-metadata-inspector"),
        ("native_task_name", "/root/t8_phase1_mechanical_retry"), ("declared_model", "gpt-5.6-terra"),
        ("fork_turns", "none"), ("inherited_narrative", False), ("allowed_input_manifest_sha256", FREEZE_SHA),
        ("allowed_input_paths", [
            "measure/tracks/apk_existing_asset_candidate_audit_20260712/phase0-input-freeze-v1.json",
            "measure/tracks/apk_existing_asset_candidate_audit_20260712/accepted-denominator-delta-v1.json",
            *(str(path.with_name("candidate-records-base.json")) for path, _ in staged),
            f"git-tree:{BASE_REV}", f"git-tree:{DELTA_REV}",
        ]),
        ("role_boundary", "Mechanical metadata only: Git-bound byte, format, parse, decode, and readability facts; no content, caller, provenance, semantic, mapping, suitability, or disposition claims."),
        ("output_file_hashes", output_hashes), ("findings", {"critical": [], "high": [], "medium": [], "low": []}),
        ("resource_usage", {"batch_count": 12, "candidate_paths": aggregate_paths, "hash_groups": aggregate_groups, "command_invocations": aggregate_commands, "bytes_read": aggregate_bytes, "within_ceiling": True}), ("final_status", "pass"),
    ))
    dump(TRACK / "role-receipts" / "phase1" / "mechanical-metadata-inspector.json", receipt)


if __name__ == "__main__":
    original_image_metadata = image_metadata
    original_media_metadata = media_metadata
    original_data_metadata = data_metadata

    def image_metadata(blob, svg):
        try:
            return original_image_metadata(blob, svg)
        except Exception:
            return ({"parse_status": "not_applicable", "decode_status": "failed", "readability_status": "unreadable", "empty": len(blob) == 0, "mislabeled": False, "text_risk": "possible"}, {"width": None, "height": None, "has_alpha": None, "color_model": None})

    def media_metadata(blob, suffix, kind):
        try:
            return original_media_metadata(blob, suffix, kind)
        except Exception:
            fields = {"duration_ms": None, "channels": None, "sample_rate_hz": None, "codec": None} if kind == "audio" else {"width": None, "height": None, "duration_ms": None, "codec": None}
            return ({"parse_status": "not_applicable", "decode_status": "failed", "readability_status": "unreadable", "empty": len(blob) == 0, "mislabeled": False, "text_risk": "not_applicable"}, fields)

    def data_metadata(blob, ext):
        try:
            return original_data_metadata(blob, ext)
        except Exception:
            return ({"parse_status": "failed", "decode_status": "not_applicable", "readability_status": "unreadable", "empty": len(blob) == 0, "mislabeled": False, "text_risk": "not_applicable"}, {"encoding": None, "parse_format": None, "top_level_type": None})

    main()
