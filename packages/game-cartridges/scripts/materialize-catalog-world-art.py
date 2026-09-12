#!/usr/bin/env python3
"""Crop and copy selected-union world, prop, and character art into QC public folders."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
STANDARD = ROOT / "packages/advantage-play-kit/assets/standard"
QC_DIRS = [
    ROOT / "apps/advantage-games/public/assets/apk/standard-pack-qc",
    ROOT / "apps/reading-advantage/public/assets/apk/standard-pack-qc",
    ROOT / "apps/primary-advantage/public/assets/apk/standard-pack-qc",
]
OUT_TS = ROOT / "packages/game-cartridges/src/catalog-standard-art-files.ts"

CROPS = [
    {
        "id": "tile-grass",
        "source": STANDARD
        / "top-down/native/fantasy-dreamland-world/tilesets/sprites/fd-grasslands-source-714bbb4fd227.png",
        "box": (32, 16, 48, 32),
        "kind": "image",
        "view": "top-down",
    },
    {
        "id": "tile-stone",
        "source": STANDARD
        / "top-down/native/fantasy-dreamland-world/tilesets/sprites/fd-dungeon-source-b1dafb50cd2d.png",
        "box": (0, 32, 32, 64),
        "kind": "image",
        "view": "top-down",
    },
    {
        "id": "tile-brick",
        "source": STANDARD
        / "top-down/native/fantasy-dreamland-world/tilesets/sprites/fd-castle-source-32beeec1e3b6.png",
        "box": (0, 0, 32, 32),
        "kind": "image",
        "view": "top-down",
    },
    {
        "id": "prop-tower",
        "source": STANDARD
        / "top-down/native/fantasy-dreamland-world/tilesets/sprites/fd-castle-source-32beeec1e3b6.png",
        "box": (176, 80, 208, 160),
        "kind": "image",
        "view": "top-down",
    },
    {
        "id": "prop-tree",
        "source": STANDARD
        / "side-view/native/platformer-world/tilesets/sprites/grassy-fields-source-0a0da4a520fa.png",
        "box": (84, 96, 128, 144),
        "kind": "image",
        "view": "side-scroll",
    },
    {
        "id": "tile-dirt",
        "source": STANDARD
        / "side-view/native/platformer-world/tilesets/sprites/grassy-fields-source-0a0da4a520fa.png",
        "box": (8, 48, 40, 80),
        "kind": "image",
        "view": "top-down",
    },
    {
        "id": "prop-keep",
        "source": STANDARD
        / "top-down/native/fantasy-dreamland-world/tilesets/sprites/fd-castle-source-32beeec1e3b6.png",
        "box": (176, 80, 208, 160),
        "kind": "image",
        "view": "top-down",
    },
    {
        "id": "prop-gate",
        "source": STANDARD
        / "top-down/native/fantasy-dreamland-world/tilesets/sprites/fd-castle-source-32beeec1e3b6.png",
        "box": (96, 192, 144, 256),
        "kind": "image",
        "view": "top-down",
    },
    {
        "id": "prop-grave",
        "source": STANDARD
        / "top-down/native/fantasy-dreamland-world/tilesets/sprites/fd-halloween-source-d7cf39f30d8d.png",
        "box": (160, 208, 208, 272),
        "kind": "image",
        "view": "top-down",
    },
]

COPIES = [
    {
        "id": "player-mage",
        "source": STANDARD
        / "side-view/native/platformer-world/heroes/hero-004/hero-004-idle-source-1d376a805d24.png",
        "kind": "spritesheet",
        "view": "side-scroll",
        "grid": {"frameWidth": 32, "frameHeight": 32, "columns": 6, "rows": 1, "frameCount": 6},
    },
    {
        "id": "player-archer",
        "source": STANDARD
        / "side-view/native/platformer-world/heroes/hero-007/hero-007-idle-source-ac9b849c48b6.png",
        "kind": "spritesheet",
        "view": "side-scroll",
        "grid": {"frameWidth": 32, "frameHeight": 32, "columns": 6, "rows": 1, "frameCount": 6},
    },
    {
        "id": "player-knight",
        "source": STANDARD
        / "side-view/native/platformer-world/heroes/hero-008/hero-008-idle-source-3dc1e5875995.png",
        "kind": "spritesheet",
        "view": "side-scroll",
        "grid": {"frameWidth": 32, "frameHeight": 32, "columns": 6, "rows": 1, "frameCount": 6},
    },
    {
        "id": "player-wizard",
        "source": STANDARD
        / "side-view/native/platformer-world/heroes/hero-010/hero-010-idle-source-670cf1afd6d5.png",
        "kind": "spritesheet",
        "view": "side-scroll",
        "grid": {"frameWidth": 32, "frameHeight": 32, "columns": 6, "rows": 1, "frameCount": 6},
    },
    {
        "id": "player-paladin",
        "source": STANDARD
        / "side-view/native/platformer-world/heroes/hero-012/hero-012-idle-source-6bdbfb127a2d.png",
        "kind": "spritesheet",
        "view": "side-scroll",
        "grid": {"frameWidth": 32, "frameHeight": 32, "columns": 6, "rows": 1, "frameCount": 6},
    },
    {
        "id": "enemy-spirit",
        "source": STANDARD
        / "side-view/native/platformer-world/enemies/enemy-015/enemy-015-idle-source-49478ae08933.png",
        "kind": "spritesheet",
        "view": "side-scroll",
        "grid": {"frameWidth": 32, "frameHeight": 32, "columns": 6, "rows": 1, "frameCount": 6},
    },
    {
        "id": "enemy-beast",
        "source": STANDARD
        / "side-view/native/platformer-world/enemies/enemy-024/enemy-024-idle-source-f2b0002b8751.png",
        "kind": "spritesheet",
        "view": "side-scroll",
        "grid": {"frameWidth": 32, "frameHeight": 32, "columns": 6, "rows": 1, "frameCount": 6},
    },
    {
        "id": "enemy-bat",
        "source": STANDARD
        / "side-view/native/platformer-world/enemies/enemy-005/enemy-005-source-45947174beb7.png",
        "kind": "spritesheet",
        "view": "side-scroll",
        "grid": {"frameWidth": 48, "frameHeight": 48, "columns": 6, "rows": 7, "frameCount": 42},
    },
]

UI_COPIES = [
    {
        "filename": "rpg-apprentice-wand.png",
        "source": STANDARD
        / "ui/32x32/item-icons-32x32/staff-icons-32x32-pixelart/staff-normal/staff-normal-1-source-6e425f4bec7c.png",
    },
    {
        "filename": "rpg-graveyard-staff.png",
        "source": STANDARD
        / "ui/32x32/item-icons-32x32/staff-icons-32x32-pixelart/staff-blue/staff-blue-54-source-43e1b6167c5d.png",
    },
    {
        "filename": "rpg-echo-staff.png",
        "source": STANDARD
        / "ui/32x32/item-icons-32x32/staff-icons-32x32-pixelart/staff-purple/staff-purple-78-source-61b1db6b6b43.png",
    },
]


def write_png(image: Image.Image, asset_id: str, kind: str, view: str, grid: dict | None) -> dict:
    buffer = image.convert("RGBA")
    raw = buffer.tobytes("raw")
    # encode via save
    from io import BytesIO

    out = BytesIO()
    buffer.save(out, format="PNG")
    data = out.getvalue()
    digest = hashlib.sha256(data).hexdigest()
    filename = f"asset-{digest[:16]}.png"
    for directory in QC_DIRS:
        directory.mkdir(parents=True, exist_ok=True)
        (directory / filename).write_bytes(data)
    record = {
        "id": asset_id,
        "path": filename,
        "kind": kind,
        "view": view,
        "width": buffer.width,
        "height": buffer.height,
        "format": "png",
        "alpha": True,
        "byteSize": len(data),
        "sha256": digest,
        "provenance": {
            "source": "ElvGames standard pack 2026.07.23",
            "license": "LicenseRef-ElvGames",
            "creator": "ElvGames",
        },
    }
    if grid:
        record["grid"] = grid
    return record


def main() -> None:
    for copy in UI_COPIES:
        for directory in QC_DIRS:
            directory.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(copy["source"], directory / copy["filename"])

    records = []
    for crop in CROPS:
        image = Image.open(crop["source"])
        records.append(write_png(image.crop(crop["box"]), crop["id"], crop["kind"], crop["view"], None))
    for copy in COPIES:
        image = Image.open(copy["source"])
        records.append(write_png(image, copy["id"], copy["kind"], copy["view"], copy["grid"]))

    lines = [
        "import type { PhysicalAssetFile } from \"@reading-advantage/advantage-play-kit/runtime\";",
        "",
        "/** Selected-union world, prop, and character files from pack 2026.07.23. */",
        "export const CATALOG_WORLD_ART_FILES: Readonly<Record<string, PhysicalAssetFile>> = Object.freeze({",
    ]
    for record in records:
        grid = record.get("grid")
        grid_ts = ""
        if grid:
            grid_ts = f"""
    grid: {{
      frameWidth: {grid["frameWidth"]},
      frameHeight: {grid["frameHeight"]},
      columns: {grid["columns"]},
      rows: {grid["rows"]},
      frameCount: {grid["frameCount"]},
    }},"""
        lines.append(
            f"""  "{record["id"]}": Object.freeze({{
    id: "{record["id"]}",
    path: "{record["path"]}",
    kind: "{record["kind"]}",
    view: "{record["view"]}",
    width: {record["width"]},
    height: {record["height"]},
    format: "png",
    alpha: true,
    byteSize: {record["byteSize"]},
    sha256: "{record["sha256"]}",{grid_ts}
    provenance: Object.freeze({{
      source: "ElvGames standard pack 2026.07.23",
      license: "LicenseRef-ElvGames",
      creator: "ElvGames",
    }}),
  }} satisfies PhysicalAssetFile),"""
        )
    lines.append("});")
    lines.append("")
    OUT_TS.write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps([{"id": r["id"], "path": r["path"], "width": r["width"], "height": r["height"]} for r in records], indent=2))


if __name__ == "__main__":
    main()
