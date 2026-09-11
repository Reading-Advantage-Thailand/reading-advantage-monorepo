#!/usr/bin/env python3
"""Crop a named cutlist into processed PNGs and append IMPORT-RECEIPT.tsv rows.

Does not add hashes. Skips boxes with group unused or notes containing "Do not use".
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image

NAME = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
STANDARD = Path(__file__).resolve().parents[1] / "standard"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sheet", required=True, help="Source PNG, relative to assets/standard or absolute.")
    parser.add_argument("--cutlist", required=True, help="Cutlist JSON, relative to assets/standard or absolute.")
    parser.add_argument("--out-dir", required=True, help="Processed PNG directory, relative to assets/standard.")
    parser.add_argument("--prefix", required=True, help="Filename prefix, kebab, no trailing hyphen.")
    parser.add_argument("--archive", required=True, help="source_archive receipt field.")
    parser.add_argument("--nested", default="", help="nested_archive_chain receipt field.")
    parser.add_argument("--member", required=True, help="source_member receipt field.")
    return parser.parse_args()


def resolve(path: str) -> Path:
    candidate = Path(path)
    return candidate if candidate.is_absolute() else STANDARD / candidate


def main() -> None:
    args = parse_args()
    if not NAME.fullmatch(args.prefix):
        raise SystemExit(f"prefix is not kebab: {args.prefix}")
    sheet = resolve(args.sheet)
    cutlist_path = resolve(args.cutlist)
    out_dir = resolve(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    entries = json.loads(cutlist_path.read_text())
    image = Image.open(sheet).convert("RGBA")
    width, height = image.size
    written: list[str] = []
    skipped: list[str] = []
    names: list[str] = []
    for entry in entries:
        name = entry["name"]
        if not NAME.fullmatch(name):
            raise SystemExit(f"name is not kebab: {name}")
        names.append(name)
        notes = entry.get("notes") or ""
        if entry.get("group") == "unused" or "Do not use" in notes:
            skipped.append(name)
            continue
        x, y, box_w, box_h = entry["box"]
        if box_w < 1 or box_h < 1 or x < 0 or y < 0 or x + box_w > width or y + box_h > height:
            raise SystemExit(f"box out of sheet: {name} {entry['box']} {width}x{height}")
        dest_stem = f"{args.prefix}-{name}"
        if not NAME.fullmatch(dest_stem):
            raise SystemExit(f"destination is not kebab: {dest_stem}")
        dest = out_dir / f"{dest_stem}.png"
        frame_boxes = entry.get("frameBoxes")
        if frame_boxes:
            frame_w, frame_h = frame_boxes[0][2:]
            cropped = Image.new("RGBA", (frame_w * len(frame_boxes), frame_h))
            for index, (fx, fy, fw, fh) in enumerate(frame_boxes):
                if (fw, fh) != (frame_w, frame_h) or fw < 1 or fh < 1:
                    raise SystemExit(f"invalid frame size: {name}")
                if fx < 0 or fy < 0 or fx + fw > width or fy + fh > height:
                    raise SystemExit(f"frame out of sheet: {name}")
                cropped.paste(image.crop((fx, fy, fx + fw, fy + fh)), (index * fw, 0))
        else:
            cropped = image.crop((x, y, x + box_w, y + box_h))
        for cx, cy, cw, ch in entry.get("clearRects", []):
            if cx < 0 or cy < 0 or cw <= 0 or ch <= 0 or cx + cw > cropped.width or cy + ch > cropped.height:
                raise ValueError(f"Invalid clear rectangle for {entry['name']}")
            cropped.paste((0, 0, 0, 0), (cx, cy, cx + cw, cy + ch))
        cropped.save(dest, "PNG")
        written.append(dest.relative_to(STANDARD).as_posix())
    dup = {name for name in names if names.count(name) > 1}
    if dup:
        raise SystemExit(f"duplicate cutlist names: {sorted(dup)}")
    receipt = STANDARD / "IMPORT-RECEIPT.tsv"
    lines = [line for line in receipt.read_text().splitlines() if line.strip()]
    header, data = lines[0], lines[1:]
    existing = {line.split("\t", 1)[0] for line in data}
    added = 0
    for rel in written:
        if rel in existing:
            continue
        data.append("\t".join([rel, args.archive, args.nested, args.member, "processed"]))
        added += 1
    receipt.write_text(header + "\n" + "\n".join(data) + "\n")
    print(f"wrote {len(written)} skipped {len(skipped)} receipt {len(data)} added {added}")
    if skipped:
        print("skipped:", ", ".join(skipped))


if __name__ == "__main__":
    main()
