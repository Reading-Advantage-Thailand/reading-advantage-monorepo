#!/usr/bin/env python3
"""Build a static, offline browser for the standard asset receipt."""

from __future__ import annotations

import csv
import html
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import quote

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
STANDARD = ROOT / "packages/advantage-play-kit/assets/standard"
RECEIPT = STANDARD / "IMPORT-RECEIPT.tsv"
DESCRIPTION_ROOT = Path.home() / "Desktop/Asset Packs"
OUTPUT = ROOT / "packages/advantage-play-kit/assets/review"
EXPECTED_MANIFEST_LINES = 43_069
CELL_SIZE_RE = re.compile(r"^(\d+)x(\d+)$")
NUMBERED_NAME_RE = re.compile(r"^(.*?)(\d+)(\.[^.]+)?$")


CSS = r"""
:root { color-scheme: dark; --bg: #10151c; --panel: #18212b; --panel-2: #202c38;
  --text: #ecf3f8; --muted: #9db0bd; --line: #344654; --accent: #78d5bd;
  --approved: #49c891; --rejected: #f07979; --warning: #f2c76e; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.45 system-ui, sans-serif; }
a { color: var(--accent); }
button, input { font: inherit; }
button, .button { border: 1px solid var(--line); border-radius: 7px; background: var(--panel-2);
  color: var(--text); cursor: pointer; padding: 8px 11px; }
button:hover, .button:hover { border-color: var(--accent); }
.site-header { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; gap: 16px;
  align-items: center; justify-content: space-between; padding: 16px 24px; background: #121a22ee;
  border-bottom: 1px solid var(--line); backdrop-filter: blur(10px); }
.site-header h1 { margin: 2px 0; font-size: clamp(20px, 3vw, 30px); }
.site-header p { margin: 0; color: var(--muted); }
.brand { color: var(--muted); text-decoration: none; font-weight: 700; }
.actions, .toolbar, .pack-stats { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.actions input { display: none; }
main { max-width: 1800px; margin: 0 auto; padding: 22px 24px 56px; }
.toolbar { position: sticky; top: 86px; z-index: 4; margin: 0 0 16px; padding: 10px 12px;
  background: var(--panel); border: 1px solid var(--line); border-radius: 9px; }
.toolbar strong { margin-right: 8px; }
.muted { color: var(--muted); }
.description { margin: 0 0 20px; background: var(--panel); border: 1px solid var(--line); border-radius: 9px; }
.description summary { cursor: pointer; padding: 11px 14px; font-weight: 700; }
.description pre { max-height: 360px; overflow: auto; margin: 0; padding: 0 14px 14px; color: #c8d5dd;
  white-space: pre-wrap; font: 12px/1.5 ui-monospace, monospace; }
.folder { margin: 0 0 14px; background: #141c24; border: 1px solid var(--line); border-radius: 9px; }
.folder summary { cursor: pointer; padding: 12px 14px; font-weight: 700; }
.folder summary::marker { color: var(--accent); }
.folder-count { float: right; color: var(--muted); font-weight: 400; }
.asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; padding: 0 10px 10px; }
.asset-card { position: relative; min-width: 0; overflow: hidden; padding: 10px; border: 2px solid var(--line);
  border-radius: 8px; background: var(--panel); cursor: pointer; transition: border-color .12s, background .12s; }
.asset-card:hover, .asset-card:focus-visible { border-color: var(--accent); outline: none; }
.asset-card[data-flag="approved"] { border-color: var(--approved); background: #123025; }
.asset-card[data-flag="needs-work"] { border-color: var(--warning); background: #3a3017; }
.asset-card[data-flag="rejected"] { border-color: var(--rejected); background: #351d24; }
.flag-status { display: block; min-height: 20px; margin-bottom: 5px; color: var(--muted); font-size: 11px;
  font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.asset-card[data-flag="approved"] .flag-status { color: var(--approved); }
.asset-card[data-flag="needs-work"] .flag-status { color: var(--warning); }
.asset-card[data-flag="rejected"] .flag-status { color: var(--rejected); }
.visuals { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 7px; align-items: start; }
.visual { min-width: 0; min-height: 100px; display: grid; place-items: center; padding: 5px;
  border: 1px solid #30404d; border-radius: 6px; background: #0c1116; }
.visual img, .visual canvas { max-width: 100%; max-height: 128px; image-rendering: pixelated; object-fit: contain; }
.visual canvas { height: auto; }
.visual.single { grid-column: 1 / -1; }
.grid-toggle { display: block; margin: 5px auto 0; padding: 4px 7px; font-size: 11px; }
.asset-heading { display: block; margin: 9px 0 4px; }
.asset-heading code { display: block; overflow-wrap: anywhere; color: #f7fbfd; font-weight: 700; }
.suspects { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-start; margin-top: 5px; }
.suspect { display: inline-block; border-radius: 4px; padding: 2px 5px; background: #59451e; color: #ffe5a6;
  font-size: 10px; font-weight: 700; white-space: nowrap; }
.asset-meta { display: grid; grid-template-columns: auto 1fr; gap: 2px 7px; margin: 0; color: var(--muted); font-size: 11px; }
.asset-meta dt { color: #b6c8d2; }
.asset-meta dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
.asset-meta code, .provenance code { color: #d7e5eb; font: inherit; }
.provenance { margin-top: 7px; color: var(--muted); font-size: 11px; }
.provenance summary { cursor: pointer; }
.asset-description { margin: 8px 0 0; padding-top: 7px; border-top: 1px solid #30404d; color: #dbe8e1; font-size: 12px; }
.pack-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
.pack-card { display: block; padding: 16px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel);
  color: var(--text); text-decoration: none; }
.pack-card:hover { border-color: var(--accent); transform: translateY(-1px); }
.pack-card h2 { margin: 0 0 8px; font-size: 18px; }
.pack-card p { margin: 4px 0; color: var(--muted); }
.pack-card progress { width: 100%; height: 8px; accent-color: var(--approved); }
footer { max-width: 1800px; margin: 0 auto; padding: 0 24px 34px; color: var(--muted); font-size: 12px; }
footer p { max-width: 1000px; }
@media (max-width: 700px) { .site-header { position: static; padding: 14px 16px; }
  .toolbar { position: static; } main { padding: 16px 12px 42px; } footer { padding: 0 12px 24px; }
  .asset-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); padding: 0 6px 6px; } }
"""


JS = r"""
const STORAGE_KEY = "standard-asset-review-flags-v1";
const FLAG_STATUSES = new Set(["approved", "needs-work", "rejected"]);
let flags = readFlags();

function readFlags() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (!value || Array.isArray(value) || typeof value !== "object") return {};
    return Object.fromEntries(Object.entries(value).filter(([, status]) => FLAG_STATUSES.has(status)));
  } catch (_error) { return {}; }
}

function saveFlags() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(flags)); } catch (_error) { /* file:// storage can be unavailable */ }
}

function updateCard(card) {
  const status = flags[card.dataset.assetId];
  if (status) card.dataset.flag = status;
  else delete card.dataset.flag;
  const label = card.querySelector(".flag-status");
  if (label) label.textContent = status || "unreviewed · click to flag";
}

function countStatuses(ids) {
  let approved = 0;
  let needsWork = 0;
  let rejected = 0;
  ids.forEach((id) => {
    if (flags[id] === "approved") approved += 1;
    if (flags[id] === "needs-work") needsWork += 1;
    if (flags[id] === "rejected") rejected += 1;
  });
  return { approved, needsWork, rejected, unreviewed: ids.length - approved - needsWork - rejected };
}

function updatePackCounts() {
  const ids = window.PAGE_ASSET_IDS || [];
  const counts = countStatuses(ids);
  document.querySelectorAll("[data-approved-count]").forEach((node) => { node.textContent = counts.approved; });
  document.querySelectorAll("[data-needs-work-count]").forEach((node) => { node.textContent = counts.needsWork; });
  document.querySelectorAll("[data-rejected-count]").forEach((node) => { node.textContent = counts.rejected; });
  document.querySelectorAll("[data-unreviewed-count]").forEach((node) => { node.textContent = counts.unreviewed; });
  document.querySelectorAll(".asset-card").forEach(updateCard);
}

function updateIndexCounts() {
  document.querySelectorAll(".pack-card").forEach((card) => {
    const counts = countStatuses(JSON.parse(card.dataset.assetIds));
    card.querySelector("[data-approved-count]").textContent = counts.approved;
    card.querySelector("[data-needs-work-count]").textContent = counts.needsWork;
    card.querySelector("[data-rejected-count]").textContent = counts.rejected;
    card.querySelector("[data-unreviewed-count]").textContent = counts.unreviewed;
    card.querySelector("progress").value = counts.approved + counts.needsWork + counts.rejected;
  });
}

function cycleFlag(card) {
  const current = flags[card.dataset.assetId];
  if (!current) flags[card.dataset.assetId] = "approved";
  else if (current === "approved") flags[card.dataset.assetId] = "needs-work";
  else if (current === "needs-work") flags[card.dataset.assetId] = "rejected";
  else delete flags[card.dataset.assetId];
  saveFlags();
  updatePackCounts();
}

function wireCards() {
  document.querySelectorAll(".asset-card").forEach((card) => {
    updateCard(card);
    card.addEventListener("click", (event) => {
      if (event.target.closest("button, a, input, summary, details.provenance")) return;
      cycleFlag(card);
    });
    card.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target === card) {
        event.preventDefault(); cycleFlag(card);
      }
    });
  });
}

function setupCanvases() {
  const players = [];
  document.querySelectorAll("canvas[data-cell-width]").forEach((canvas) => {
    const image = canvas.closest(".asset-card").querySelector("img");
    const player = { canvas, image, ctx: canvas.getContext("2d"), active: false, last: 0, frame: 0 };
    player.columns = Number(canvas.dataset.columns);
    player.rows = Number(canvas.dataset.rows);
    player.cellWidth = Number(canvas.dataset.cellWidth);
    player.cellHeight = Number(canvas.dataset.cellHeight);
    player.frameCount = Math.max(1, player.columns * player.rows);
    players.push(player);
    const draw = () => drawFrame(player, performance.now());
    if (image.complete) draw(); else image.addEventListener("load", draw, { once: true });
    const toggle = canvas.parentElement.querySelector(".grid-toggle");
    if (toggle) toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      canvas.classList.toggle("grid-on");
      toggle.setAttribute("aria-pressed", canvas.classList.contains("grid-on"));
      draw();
    });
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      const player = players.find((item) => item.canvas === entry.target);
      if (player) player.active = entry.isIntersecting;
    }));
    players.forEach((player) => observer.observe(player.canvas));
  } else players.forEach((player) => { player.active = true; });
  requestAnimationFrame((now) => animateCanvases(players, now));
}

function drawFrame(player, now) {
  if (!player.image.complete || !player.image.naturalWidth) return;
  const frame = player.frame % player.frameCount;
  const sx = (frame % player.columns) * player.cellWidth;
  const sy = Math.floor(frame / player.columns) * player.cellHeight;
  player.ctx.clearRect(0, 0, player.cellWidth, player.cellHeight);
  player.ctx.imageSmoothingEnabled = false;
  player.ctx.drawImage(player.image, sx, sy, player.cellWidth, player.cellHeight, 0, 0, player.cellWidth, player.cellHeight);
  if (player.canvas.classList.contains("grid-on")) {
    player.ctx.strokeStyle = "rgba(255,255,255,.65)";
    player.ctx.lineWidth = Math.max(1, player.cellWidth / 64);
    player.ctx.strokeRect(.5, .5, player.cellWidth - 1, player.cellHeight - 1);
  }
  player.last = now;
}

function animateCanvases(players, now) {
  players.forEach((player) => {
    if (player.active && now - player.last >= 130) { player.frame += 1; drawFrame(player, now); }
  });
  requestAnimationFrame((next) => animateCanvases(players, next));
}

function wireFlagFiles() {
  document.querySelectorAll("[data-export-flags]").forEach((button) => button.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(flags, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = "asset-review-flags.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }));
  document.querySelectorAll("[data-import-flags]").forEach((input) => input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        if (!imported || Array.isArray(imported) || typeof imported !== "object") throw new Error("root must be an object");
        const valid = Object.fromEntries(Object.entries(imported).filter(([id, status]) => typeof id === "string" && FLAG_STATUSES.has(status)));
        flags = { ...flags, ...valid }; saveFlags(); updatePackCounts(); updateIndexCounts();
      } catch (error) { window.alert(`Could not import flags: ${error.message}`); }
      input.value = "";
    };
    reader.readAsText(file);
  }));
}

document.addEventListener("DOMContentLoaded", () => {
  wireFlagFiles();
  if (document.body.dataset.page === "index") updateIndexCounts();
  else { wireCards(); setupCanvases(); updatePackCounts(); }
});
"""


def slugify(value: str) -> str:
    """Return a stable URL-safe slug for a pack name."""
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "pack"


def escape(value: object) -> str:
    """Escape a value for HTML text or an HTML attribute."""
    return html.escape(str(value), quote=True)


def parse_cell_size(value: str) -> tuple[int, int] | None:
    """Parse a manifest cell size into width and height."""
    match = CELL_SIZE_RE.fullmatch(value.strip())
    return (int(match.group(1)), int(match.group(2))) if match else None


def description_path(pack_name: str) -> Path | None:
    """Find the description markdown file for a source archive."""
    stem = Path(pack_name).stem
    names = [f"{stem}_descriptions.md", f"{re.sub(r'[^A-Za-z0-9]+', '_', stem).strip('_')}_descriptions.md"]
    for name in names:
        path = DESCRIPTION_ROOT / name
        if path.exists():
            return path
    return None


def description_keys(name: str) -> set[str]:
    """Expand the filename portion of a description bullet."""
    cleaned = name.replace("`", "").strip().rstrip(".")
    keys: set[str] = set()
    range_match = re.search(r"([^,]+?)\s+through\s+([^,]+?)(?:\s+and\s+.*)?$", cleaned, re.IGNORECASE)
    if range_match:
        start = range_match.group(1).strip()
        end = range_match.group(2).strip()
        start_match = NUMBERED_NAME_RE.fullmatch(start)
        end_match = NUMBERED_NAME_RE.fullmatch(end)
        if start_match and end_match and start_match.group(1) == end_match.group(1):
            first = int(start_match.group(2))
            last = int(end_match.group(2))
            width = max(len(start_match.group(2)), len(end_match.group(2)))
            suffix = end_match.group(3) or start_match.group(3) or ""
            for number in range(first, last + (1 if last >= first else -1), 1 if last >= first else -1):
                keys.add(f"{start_match.group(1)}{number:0{width}d}{suffix}")
    pieces = re.split(r"\s*,\s*|\s+and\s+(?=[A-Za-z0-9_])", cleaned)
    for piece in pieces:
        piece = piece.strip()
        if piece and " through " not in piece.lower() and not piece.endswith("variants"):
            keys.add(piece)
    expanded = set(keys)
    for key in keys:
        if "." not in Path(key).name:
            expanded.add(f"{key}.png")
    return expanded


def parse_descriptions(markdown: str) -> dict[str, str]:
    """Map described filenames to the text from their markdown bullets."""
    descriptions: dict[str, str] = {}
    for line in markdown.splitlines():
        match = re.match(r"\s*-\s+(.+?):\s*(.+?)\s*$", line)
        if not match:
            continue
        text = match.group(2)
        for key in description_keys(match.group(1)):
            descriptions[key] = text
            descriptions[key.casefold()] = text
    return descriptions


def frame_suspects(image: Image.Image, cell_size: tuple[int, int]) -> list[str]:
    """Return simple grid, transparency, and edge-continuation warnings for a sheet."""
    cell_width, cell_height = cell_size
    width, height = image.size
    suspects: list[str] = []
    if width % cell_width or height % cell_height:
        suspects.append("grid does not divide dimensions evenly")
    columns = width // cell_width
    rows = height // cell_height
    if not columns or not rows:
        return suspects
    alpha = image.convert("RGBA").getchannel("A")
    pixels = alpha.load()
    transparent_frames = 0
    for row in range(rows):
        for column in range(columns):
            if all(pixels[x, y] == 0 for y in range(row * cell_height, (row + 1) * cell_height)
                   for x in range(column * cell_width, (column + 1) * cell_width)):
                transparent_frames += 1
    if transparent_frames:
        suspects.append(f"{transparent_frames} fully transparent frame{'s' if transparent_frames != 1 else ''}")

    edge_boundaries = 0
    for row in range(rows):
        top = row * cell_height
        for column in range(columns - 1):
            left_edge_x = (column + 1) * cell_width - 1
            right_frame_x = (column + 1) * cell_width
            suspicious_rows = 0
            band_width = min(3, cell_width)
            for y in range(top, top + cell_height):
                left_opaque = pixels[left_edge_x, y] >= 128
                neighbor_alpha = [pixels[right_frame_x + offset, y] for offset in range(band_width)]
                mostly_transparent = sum(value < 128 for value in neighbor_alpha) >= band_width * 0.75
                if left_opaque and mostly_transparent:
                    suspicious_rows += 1
            if suspicious_rows >= max(2, cell_height // 8):
                edge_boundaries += 1
    if edge_boundaries:
        suspects.append(f"{edge_boundaries} edge-continuation suspect{'s' if edge_boundaries != 1 else ''}")
    return suspects


def inspect_asset(path: Path, cell_size_text: str) -> dict[str, object]:
    """Read image dimensions and generator-time suspect warnings."""
    cell_size = parse_cell_size(cell_size_text)
    result: dict[str, object] = {"width": 0, "height": 0, "suspects": []}
    try:
        with Image.open(path) as image:
            image.load()
            result["width"], result["height"] = image.size
            if cell_size:
                result["suspects"] = frame_suspects(image, cell_size)
    except (OSError, ValueError) as error:
        result["suspects"] = [f"unreadable image: {error.__class__.__name__}"]
    return result


def load_receipt() -> list[dict[str, str]]:
    """Load and validate the import receipt rows."""
    with RECEIPT.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle, delimiter="\t"))
    required = {"destination", "source_archive", "nested_archive_chain", "source_member", "cell_size"}
    if not rows or set(rows[0]) != required:
        raise ValueError(f"Unexpected receipt columns: {set(rows[0]) if rows else set()}")
    destinations = [row["destination"] for row in rows]
    if len(destinations) != len(set(destinations)):
        raise ValueError("IMPORT-RECEIPT.tsv contains duplicate destinations")
    for row in rows:
        destination = Path(row["destination"])
        if destination.is_absolute() or ".." in destination.parts:
            raise ValueError(f"Unsafe destination: {row['destination']}")
        if not (STANDARD / destination).is_file():
            raise FileNotFoundError(f"Missing asset: {row['destination']}")
    return rows


def asset_record(row: dict[str, str], descriptions: dict[str, str]) -> dict[str, object]:
    """Build the inline record used by one asset card."""
    destination = row["destination"]
    info = inspect_asset(STANDARD / destination, row["cell_size"])
    basename = Path(row["source_member"]).name
    description = descriptions.get(basename) or descriptions.get(basename.casefold())
    cell_size = parse_cell_size(row["cell_size"])
    record: dict[str, object] = {
        "id": destination,
        "destination": destination,
        "source_member": row["source_member"],
        "cell_size": row["cell_size"],
        "width": info["width"],
        "height": info["height"],
        "suspects": info["suspects"],
    }
    if description:
        record["description"] = description
    if cell_size:
        record["cell_width"], record["cell_height"] = cell_size
        record["columns"] = int(info["width"]) // cell_size[0]
        record["rows"] = int(info["height"]) // cell_size[1]
    return record


def image_url(destination: str) -> str:
    """Return the file-relative URL from a review page to an asset."""
    return "../standard/" + quote(destination, safe="/-_.~")


def actions_html() -> str:
    """Return the shared export and import controls."""
    return ('<div class="actions"><button type="button" data-export-flags>Export flags</button>'
            '<label class="button" for="import-flags">Import flags</label>'
            '<input id="import-flags" type="file" accept="application/json" data-import-flags></div>')


def card_html(record: dict[str, object]) -> str:
    """Render one accessible asset card."""
    asset_id = str(record["id"])
    source_member = str(record["source_member"])
    suspects = record["suspects"]
    grid = "columns" in record and int(record["columns"]) > 0 and int(record["rows"]) > 0
    image = image_url(asset_id)
    visual_parts = [f'<div class="visual"><img loading="lazy" src="{escape(image)}" alt="{escape(Path(asset_id).name)}"></div>']
    if grid:
        visual_parts.append(
            f'<div class="visual"><canvas width="{record["cell_width"]}" height="{record["cell_height"]}" '
            f'data-cell-width="{record["cell_width"]}" data-cell-height="{record["cell_height"]}" '
            f'data-columns="{record["columns"]}" data-rows="{record["rows"]}" aria-label="Animated frame preview"></canvas>'
            '<button class="grid-toggle" type="button" aria-pressed="false">Grid</button></div>'
        )
    else:
        visual_parts[0] = visual_parts[0].replace('class="visual"', 'class="visual single"')
    suspect_html = "".join(f'<span class="suspect">{escape(item)}</span>' for item in suspects)
    description_html = f'<p class="asset-description">{escape(record["description"])}</p>' if record.get("description") else ""
    return (
        f'<article class="asset-card" tabindex="0" role="button" data-asset-id="{escape(asset_id)}" '
        f'aria-label="Review {escape(asset_id)}"><span class="flag-status">unreviewed · click to flag</span>'
        f'<div class="visuals">{"".join(visual_parts)}</div>'
        f'<div class="asset-heading"><code>{escape(Path(asset_id).name)}</code><span class="suspects">{suspect_html}</span></div>'
        '<dl class="asset-meta">'
        f'<dt>ID</dt><dd><code>{escape(asset_id)}</code></dd>'
        f'<dt>Dimensions</dt><dd>{record["width"]} × {record["height"]}</dd>'
        f'<dt>Cell size</dt><dd>{escape(record["cell_size"])}</dd>'
        f'<dt>Source member</dt><dd><code>{escape(source_member)}</code></dd>'
        f'</dl><details class="provenance"><summary>Show destination</summary><code>{escape(asset_id)}</code></details>'
        f'{description_html}</article>'
    )


def pack_page(pack: str, records: list[dict[str, object]], markdown: str | None) -> str:
    """Render one source-pack page with destination-folder sections."""
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for record in records:
        grouped[str(Path(str(record["destination"])).parent)].append(record)
    sections: list[str] = []
    for index, (folder, folder_records) in enumerate(sorted(grouped.items())):
        cards = "".join(card_html(record) for record in folder_records)
        open_attr = " open" if index == 0 else ""
        sections.append(f'<details class="folder"{open_attr}><summary>{escape(folder)}<span class="folder-count">{len(folder_records):,} assets</span></summary><div class="asset-grid">{cards}</div></details>')
    ids = [str(record["id"]) for record in records]
    title = Path(pack).stem
    description = "<p class=\"muted\">No matching description markdown was found.</p>" if markdown is None else f'<pre>{escape(markdown)}</pre>'
    counts = '<span><b data-approved-count>0</b> approved</span><span><b data-needs-work-count>0</b> needs-work</span><span><b data-rejected-count>0</b> rejected</span><span><b data-unreviewed-count>0</b> unreviewed</span>'
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} — asset review</title><style>{CSS}</style></head>
<body data-page="pack"><header class="site-header"><div><a class="brand" href="index.html">Asset review</a><h1>{escape(title)}</h1><p>{len(records):,} assets from {escape(pack)}</p></div>{actions_html()}</header>
<main><div class="toolbar"><strong>Flags</strong><div class="pack-stats">{counts}</div><span class="muted">Click an asset to cycle unreviewed → approved (usable as-is) → needs-work (valid, not usable as-is) → rejected (defective/unusable) → unreviewed.</span></div>
<details class="description"><summary>Pack description markdown</summary>{description}</details>
{''.join(sections)}</main><footer><p><b>Review heuristics:</b> “grid does not divide dimensions evenly” means the declared cell width or height leaves a remainder. “Fully transparent frame” means every pixel in a grid frame has zero alpha. “Edge-continuation suspect” compares each frame’s right edge with the next frame’s first three columns and flags repeated rows where the current edge is opaque while the neighbor edge is at least 75% transparent. These warnings are simple review cues, not decisions.</p><p>Pixel art assets by ElvGames.</p></footer>
<script>window.PAGE_ASSET_IDS={json.dumps(ids, separators=(',', ':'))};</script><script>{JS}</script></body></html>'''


def index_page(packs: list[dict[str, object]]) -> str:
    """Render the pack index with localStorage-backed progress."""
    cards = []
    for pack in packs:
        ids = json.dumps(pack["ids"], separators=(",", ":"))
        cards.append(
            f'<a class="pack-card" href="{escape(pack["slug"])}.html" data-asset-ids=\'{escape(ids)}\'> '
            f'<h2>{escape(pack["title"])}</h2><p>{int(pack["count"]):,} assets</p>'
            '<p><span data-approved-count>0</span> approved · <span data-needs-work-count>0</span> needs-work · <span data-rejected-count>0</span> rejected · '
            '<span data-unreviewed-count>0</span> unreviewed</p>'
            f'<progress max="{int(pack["count"])}" value="0" aria-label="Review progress"></progress></a>'
        )
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Standard asset review</title><style>{CSS}</style></head>
<body data-page="index"><header class="site-header"><div><h1>Standard asset review</h1><p>Offline review browser for the imported source packs.</p></div>{actions_html()}</header>
<main><div class="toolbar"><strong>Progress is saved in this browser.</strong><span class="muted">Click an asset to cycle unreviewed → approved (usable as-is) → needs-work (valid, not usable as-is) → rejected (defective/unusable) → unreviewed.</span></div><div class="pack-grid">{''.join(cards)}</div></main>
<footer><p>Pages use only relative file paths, embedded metadata, localStorage, and browser APIs. No server or JSON fetch is required.</p></footer><script>{JS}</script></body></html>'''


def main() -> None:
    """Generate the index and one static HTML page for each receipt source pack."""
    rows = load_receipt()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    by_pack: dict[str, list[dict[str, object]]] = defaultdict(list)
    descriptions_cache: dict[str, dict[str, str]] = {}
    description_markdown: dict[str, str | None] = {}
    suspect_counts: Counter[str] = Counter()
    description_matches = 0
    for row in rows:
        pack = row["source_archive"]
        if pack not in descriptions_cache:
            path = description_path(pack)
            markdown = path.read_text(encoding="utf-8") if path else None
            descriptions_cache[pack] = parse_descriptions(markdown) if markdown else {}
            description_markdown[pack] = markdown
        record = asset_record(row, descriptions_cache[pack])
        by_pack[pack].append(record)
        if record.get("description"):
            description_matches += 1
        for suspect in record["suspects"]:
            suspect_counts[suspect.split(" ", 1)[-1]] += 1

    packs: list[dict[str, object]] = []
    for pack in sorted(by_pack, key=str.casefold):
        slug = slugify(Path(pack).stem)
        records = by_pack[pack]
        packs.append({"title": Path(pack).stem, "slug": slug, "count": len(records), "ids": [r["id"] for r in records]})
        (OUTPUT / f"{slug}.html").write_text(pack_page(pack, records, description_markdown[pack]), encoding="utf-8")
        print(f"{Path(pack).stem}: {len(records):,} assets")
    (OUTPUT / "index.html").write_text(index_page(packs), encoding="utf-8")
    asset_total = len(rows)
    print(f"Total: {asset_total + 1:,} manifest lines including header; {asset_total:,} asset rows")
    print(f"Total assets: {asset_total:,}")
    print(f"Expected manifest lines: {EXPECTED_MANIFEST_LINES:,}")
    print(f"Source packs: {len(packs)}")
    print(f"Description matches: {description_matches:,}")
    print(f"Suspect cards: {sum(1 for pack in by_pack.values() for record in pack if record['suspects']):,}")
    if suspect_counts:
        print("Suspect summary: " + ", ".join(f"{key}={value:,}" for key, value in sorted(suspect_counts.items())))


if __name__ == "__main__":
    main()
