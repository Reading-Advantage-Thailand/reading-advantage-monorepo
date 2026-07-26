#!/usr/bin/env python3
"""Create byte-verified working notes for Phase 3 text/data inspection."""

import hashlib
import json
from pathlib import Path


TRACK = Path(__file__).resolve().parent
REPO = TRACK.parents[2]
OUTPUT = TRACK / "inspection-working-notes" / "text-data.json"


def digest(path: Path) -> str:
    """Return the SHA-256 digest of one checked-out candidate file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def json_observation(value: object) -> dict[str, object]:
    """Return directly readable top-level JSON facts without interpreting purpose."""
    if isinstance(value, dict):
        preview = {
            key: value[key]
            for key in ("name", "title", "status", "track_id", "version")
            if key in value and (isinstance(value[key], (str, int, float, bool)) or value[key] is None)
        }
        return {"root_kind": "object", "top_level_keys": sorted(value), "direct_scalar_fields": preview}
    if isinstance(value, list):
        return {"root_kind": "array", "item_count": len(value)}
    return {"root_kind": type(value).__name__, "direct_value": value}


def markdown_observation(value: str) -> dict[str, object]:
    """Return directly readable Markdown heading facts without semantic interpretation."""
    headings = [line.removeprefix("#").strip() for line in value.splitlines() if line.startswith("#")]
    return {"headings": headings, "byte_length": len(value.encode("utf-8"))}


def main() -> None:
    """Verify every text/data group and publish one explicit working-note record per group."""
    records: list[dict[str, object]] = []
    for manifest_path in sorted((TRACK / "batches").glob("AF-*/inspection-source-manifest.json")):
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for group in manifest["groups"]:
            if group["media_class"] != "text_or_data":
                continue
            source = group["inspection_source"]
            path = REPO / source["canonical_path"]
            actual_sha256 = digest(path)
            if actual_sha256 != source["sha256"]:
                raise ValueError(f"checked-out bytes differ from frozen source: {source['canonical_path']}")
            raw = path.read_text(encoding="utf-8")
            if path.suffix == ".json":
                observation = json_observation(json.loads(raw))
                evidence_kind = "direct_text_json_bytes"
            elif path.suffix == ".md":
                observation = markdown_observation(raw)
                evidence_kind = "direct_text_markdown_bytes"
            else:
                raise ValueError(f"unexpected text/data extension: {path}")
            records.append({
                "batch_id": manifest["batch_id"],
                "identical_hash_group": group["identical_hash_group"],
                "inspection_source": source,
                "evidence_kind": evidence_kind,
                "observation": observation,
                "limitation": "Direct byte-level text/data observation only; no visual, audio, suitability, replacement, or disposition claim.",
            })
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({
        "schema_version": "apk-asset-forensics.phase3-text-working-notes.v1",
        "track_id": "apk_existing_asset_candidate_audit_20260712",
        "records": records,
    }, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} byte-verified text/data working notes to {OUTPUT.relative_to(REPO)}")


if __name__ == "__main__":
    main()
