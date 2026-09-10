#!/usr/bin/env python3
"""Composes a StandardPlayMap JSON layout into a PNG review artifact.

Usage: python3 compose-play-map.py <layout.json> <out.png>

The typed layout is the source of truth. This script derives the PNG from it so
the picture and the collision data stay aligned.
"""
import json
import os
import sys
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
NATIVE = os.path.join(REPO, "packages", "advantage-play-kit", "assets", "standard", "top-down", "native")
QC = os.path.join(REPO, "apps", "advantage-games", "public", "assets", "apk", "standard-pack-qc")
RA = os.path.join(NATIVE, "rogue-adventure-world", "processed")
HALLOWEEN = os.path.join(NATIVE, "fantasy-dreamland-world", "processed", "remastered-halloween")


def p(*parts: str) -> str:
    return os.path.join(*parts)


# Semantic key -> (source file, frame width, frame height, frame index)
KEYS: dict[str, tuple[str, int, int, int]] = {
    "world:ground": (p(QC, "asset-ddb2d3c226e2ebaa.png"), 16, 16, 0),
    "tile-grass": (p(QC, "asset-ddb2d3c226e2ebaa.png"), 16, 16, 0),
    "world:path": (p(QC, "asset-52310a95c4c3016a.png"), 32, 32, 0),
    "tile-dirt": (p(QC, "asset-52310a95c4c3016a.png"), 32, 32, 0),
    "wizard-floor": (p(RA, "ra-crypt-review-parts", "ra-crypt-review-parts-floor-1-2.png"), 16, 16, 0),
    "prop:grave-a": (p(RA, "ra-crypt-review-parts", "ra-crypt-review-parts-stone-tombstone-2-1.png"), 16, 32, 0),
    "prop:grave-b": (p(RA, "ra-crypt-review-parts", "ra-crypt-review-parts-stone-tombstone-3-2.png"), 16, 32, 0),
    "prop:grave-c": (p(RA, "ra-crypt-review-parts", "ra-crypt-review-parts-moss-tombstone-5-1.png"), 16, 32, 0),
    "prop:memorial": (p(HALLOWEEN, "remastered-halloween-plain-memorial-96.png"), 32, 32, 0),
    "prop:mausoleum": (p(RA, "ra-crypt-review-parts", "ra-crypt-review-parts-wall-inner-0.png"), 48, 64, 0),
    "prop:dead-tree-large": (p(HALLOWEEN, "remastered-halloween-large-bare-tree-64-0.png"), 48, 64, 0),
    "prop:dead-tree-small": (p(HALLOWEEN, "remastered-halloween-small-bare-tree-160-16.png"), 48, 48, 0),
    "prop:fence": (p(HALLOWEEN, "remastered-halloween-gray-burning-fence.png"), 16, 32, 0),
    "prop:lantern": (p(NATIVE, "fantasy-dreamland-world", "processed", "halloween-objects", "halloween-objects-candle-sequence-272.png"), 16, 16, 0),
    "prop:gate": (p(RA, "ra-crypt-review-parts", "ra-crypt-review-parts-gate-3-1.png"), 16, 16, 0),
    "world:stone-floor": (p(QC, "asset-ab8ed48e49d778a5.png"), 32, 32, 0),
    "prop:bookshelf": (p(QC, "enchanted-library-bookshelf.png"), 16, 32, 0),
    "prop:crystal": (p(QC, "asset-1a2d909a506fd6c9.png"), 16, 16, 0),
    "prop:tower": (p(QC, "asset-84663e69de1c831d.png"), 32, 80, 0),
    "prop:ruins": (p(QC, "asset-aac6ef52552b8d68.png"), 64, 64, 0),
    "prop:dirt-patch": (p(QC, "asset-2bd2454d7f15581b.png"), 192, 192, 0),
}

_cache: dict[str, Image.Image] = {}


def load_cell(key: str) -> Image.Image | None:
    """Loads one frame cell for a semantic key."""
    entry = KEYS.get(key)
    if entry is None:
        return None
    path, fw, fh, frame = entry
    if not os.path.exists(path):
        print(f"warning: missing source for {key}: {path}", file=sys.stderr)
        return None
    cache_key = f"{key}:{frame}"
    if cache_key in _cache:
        return _cache[cache_key]
    sheet = Image.open(path).convert("RGBA")
    cols = max(1, sheet.width // fw)
    col = frame % cols
    cell = sheet.crop((col * fw, 0, col * fw + fw, fh))
    _cache[cache_key] = cell
    return cell


def stamp(canvas: Image.Image, tile: Image.Image, cx: float, cy: float, w: float, h: float, rotation: float = 0.0) -> None:
    """Pastes one sprite scaled to the target display box, centered at (cx, cy)."""
    tw, th = max(1, int(round(w))), max(1, int(round(h)))
    scaled = tile.resize((tw, th), Image.NEAREST)
    if rotation:
        scaled = scaled.rotate(-rotation, expand=True, resample=Image.NEAREST)
    canvas.alpha_composite(scaled, (int(round(cx - scaled.width / 2)), int(round(cy - scaled.height / 2))))


def tile_fill(canvas: Image.Image, tile: Image.Image, box: tuple[float, float, float, float], tile_size: float) -> None:
    """Tiles a sprite across a rectangle."""
    x0, y0, x1, y1 = box
    size = max(1, int(round(tile_size)))
    cell = tile.resize((size, size), Image.NEAREST)
    y = y0
    while y < y1:
        x = x0
        while x < x1:
            canvas.alpha_composite(cell, (int(round(x)), int(round(y))))
            x += size
        y += size


def compose(layout: dict) -> Image.Image:
    """Renders one layout into an RGBA image."""
    width = int(layout["world"]["width"])
    height = int(layout["world"]["height"])
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    # Ground layer: fill the whole world.
    ground_key = next((layer["assetKey"] for layer in layout["terrain"] if layer["assetKey"] == "world:ground"), None)
    if ground_key:
        tile = load_cell(ground_key)
        if tile:
            tile_fill(canvas, tile, (0, 0, width, height), tile.width)

    # Crypt floor: tile inside the floor feature box (repeat xy).
    for feature in layout["decor"]:
        if feature.get("repeat") == "xy":
            tile = load_cell(feature["assetKey"])
            if tile is None:
                continue
            half_w, half_h = feature["displayWidth"] / 2, feature["displayHeight"] / 2
            tile_fill(
                canvas,
                tile,
                (feature["position"]["x"] - half_w, feature["position"]["y"] - half_h,
                 feature["position"]["x"] + half_w, feature["position"]["y"] + half_h),
                tile.width,
            )

    # Paths: stamp the dirt tile along every centerline segment.
    path_key = next((layer["assetKey"] for layer in layout["terrain"] if layer["assetKey"] == "world:path"), None)
    path_tile = load_cell(path_key) if path_key else None
    if path_tile:
        for path in layout["paths"]:
            points = path["points"]
            for index in range(1, len(points)):
                start, end = points[index - 1], points[index]
                dx, dy = end["x"] - start["x"], end["y"] - start["y"]
                distance = max(1.0, (dx * dx + dy * dy) ** 0.5)
                angle = 0.0
                if abs(dx) > 1 or abs(dy) > 1:
                    import math
                    angle = math.degrees(math.atan2(dy, dx))
                steps = int(distance // (path["width"] * 0.4)) + 1
                for step in range(steps + 1):
                    t = step / steps
                    stamp(canvas, path_tile, start["x"] + dx * t, start["y"] + dy * t, path["width"], path["width"], angle)

    # Decor layer, painted back to front by depth.
    for feature in sorted(layout["decor"], key=lambda item: item["depth"]):
        tile = load_cell(feature["assetKey"])
        if tile is None:
            continue
        repeat = feature.get("repeat")
        rotation = feature.get("rotation", 0) % 360
        if repeat in ("x", "y"):
            eff_w = feature["displayHeight"] if rotation in (90, 270) else feature["displayWidth"]
            eff_h = feature["displayWidth"] if rotation in (90, 270) else feature["displayHeight"]
            axis = "y" if (rotation in (90, 270)) == (repeat == "x") else "x"
            half_w, half_h = eff_w / 2, eff_h / 2
            box = (feature["position"]["x"] - half_w, feature["position"]["y"] - half_h,
                   feature["position"]["x"] + half_w, feature["position"]["y"] + half_h)
            span = box[2] - box[0] if axis == "x" else box[3] - box[1]
            cell_size = float(tile.width if axis == "x" else tile.height)
            count = max(1, int(span // cell_size))
            seg = span / count
            for index in range(count):
                if axis == "x":
                    stamp(canvas, tile, box[0] + seg * (index + 0.5), feature["position"]["y"], seg, eff_h)
                else:
                    stamp(canvas, tile, feature["position"]["x"], box[1] + seg * (index + 0.5), eff_w, seg)
        elif repeat == "xy":
            continue
        else:
            stamp(
                canvas, tile,
                feature["position"]["x"], feature["position"]["y"],
                feature["displayWidth"], feature["displayHeight"],
                feature.get("rotation", 0.0),
            )
    return canvas


def main() -> int:
    """Reads the layout JSON and writes the PNG."""
    if len(sys.argv) != 3:
        print("Usage: compose-play-map.py <layout.json> <out.png>", file=sys.stderr)
        return 2
    with open(sys.argv[1], "r", encoding="utf-8") as handle:
        layout = json.load(handle)
    image = compose(layout)
    os.makedirs(os.path.dirname(os.path.abspath(sys.argv[2])), exist_ok=True)
    image.save(sys.argv[2], "PNG")
    print(f"wrote {sys.argv[2]} ({image.width}x{image.height})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
