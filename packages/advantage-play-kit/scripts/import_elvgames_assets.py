#!/usr/bin/env python3
"""Recursively import every PNG from the purchased ElvGames archives.

The APK filesystem remains the semantic source of truth. This importer derives a
safe path from the source archive and vendor category, writes an exact TSV source
receipt, and deliberately retains source duplicates rather than dropping art.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import re
import shutil
import unicodedata
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

CELL_SIZE = re.compile(r"(?<![0-9])(\d{1,3})\s*[xX]\s*(\d{1,3})(?![0-9])")


@dataclass(frozen=True)
class ImportResult:
    discovered_pngs: int
    imported_pngs: int
    destinations: tuple[str, ...]


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    compact = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return compact or "source"


def view_for(archive_name: str, member_path: str) -> str:
    context = f"{archive_name}/{member_path}".lower()
    if any(token in context for token in ("user interface", "item icons", "/ui/", "gui", "inventory", "controller", "keyboard")):
        return "ui"
    if any(token in context for token in ("pixel vfx", "vfx", "effect", "spell")):
        return "effects"
    if "platformer" in context:
        return "side-view"
    if any(token in context for token in ("rogue adventure", "farming game", "fantasy dreamland", "sewers", "commission packs", "tower defense")):
        return "top-down"
    return "world"


def cell_size_for(member_path: str) -> str:
    matches = CELL_SIZE.findall(member_path)
    if not matches:
        return "native"
    width, height = matches[-1]
    return f"{int(width)}x{int(height)}"


def category_for(archive_name: str, member_path: str) -> str:
    parts = [part for part in Path(member_path).parts[:-1] if part and part != "."]
    meaningful = [slug(part) for part in parts[-2:]]
    return "/".join([slug(Path(archive_name).stem), *meaningful])


def iter_import_members(archive: zipfile.ZipFile, chain: tuple[str, ...]) -> Iterable[tuple[tuple[str, ...], str, bytes]]:
    for member in sorted(archive.infolist(), key=lambda item: item.filename):
        if member.is_dir():
            continue
        lowered = member.filename.lower()
        name = Path(lowered).name
        if lowered.endswith(".png") or name in {"license.txt", "licence.txt"}:
            yield chain, member.filename, archive.read(member)
        elif lowered.endswith(".zip"):
            nested_chain = (*chain, member.filename)
            with zipfile.ZipFile(io.BytesIO(archive.read(member))) as nested:
                yield from iter_import_members(nested, nested_chain)


def import_pixel_art(source_root: Path, destination_root: Path) -> ImportResult:
    archives = sorted(source_root.glob("*.zip"), key=lambda path: path.name.lower())
    if not archives:
        raise ValueError(f"No top-level zip archives found in {source_root}")
    destination_root.mkdir(parents=True, exist_ok=True)
    records: list[tuple[str, str, str, str, str]] = []
    license_records: list[tuple[str, str, str, str]] = []
    destinations: list[str] = []
    discovered = 0
    for archive_path in archives:
        with zipfile.ZipFile(archive_path) as archive:
            for chain, member_path, data in iter_import_members(archive, (archive_path.name,)):
                source_id = "!".join((*chain, member_path))
                suffix = hashlib.sha256(source_id.encode("utf-8")).hexdigest()[:12]
                if member_path.lower().endswith(".png"):
                    discovered += 1
                    view = view_for(archive_path.name, "/".join((*chain[1:], member_path)))
                    cell_size = cell_size_for(member_path)
                    category = category_for(archive_path.name, member_path)
                    filename = f"{slug(Path(member_path).stem)}-source-{suffix}.png"
                    relative = Path(view) / cell_size / category / filename
                    target = destination_root / relative
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(data)
                    relative_text = relative.as_posix()
                    destinations.append(relative_text)
                    records.append((relative_text, archive_path.name, "!".join(chain[1:]), member_path, cell_size))
                else:
                    relative = Path("licenses") / slug(Path(archive_path.name).stem) / f"{slug(Path(member_path).stem)}-source-{suffix}.txt"
                    target = destination_root / relative
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(data)
                    license_records.append((relative.as_posix(), archive_path.name, "!".join(chain[1:]), member_path))
    receipt = destination_root / "IMPORT-RECEIPT.tsv"
    lines = ["destination\tsource_archive\tnested_archive_chain\tsource_member\tcell_size"]
    lines.extend("\t".join(record) for record in records)
    receipt.write_text("\n".join(lines) + "\n", encoding="utf-8")
    license_receipt = destination_root / "LICENSE-RECEIPT.tsv"
    license_lines = ["destination\tsource_archive\tnested_archive_chain\tsource_member"]
    license_lines.extend("\t".join(record) for record in license_records)
    license_receipt.write_text("\n".join(license_lines) + "\n", encoding="utf-8")
    return ImportResult(discovered, len(records), tuple(destinations))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_root", type=Path)
    parser.add_argument("destination_root", type=Path)
    args = parser.parse_args()
    result = import_pixel_art(args.source_root, args.destination_root)
    print(f"imported_pngs={result.imported_pngs} discovered_pngs={result.discovered_pngs}")


if __name__ == "__main__":
    main()
