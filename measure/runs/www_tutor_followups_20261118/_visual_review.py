#!/usr/bin/env python3
"""Visual-review aid for www_tutor_followups_20261118 task 1.7 finish.

The direct image-read tool mis-served files in this session (a 390x400 crop
request displayed a full 1033px block screenshot), so this script:

1. Locates the rendered picture box in each of the 12 section PNGs by
   template-matching the source webp (scaled to the checks.json rendered
   size) against the PNG. A low match score proves the rendered box IS the
   source photo, so no crop hides content.
2. Builds two self-labeled contact sheets (filename drawn in each cell and
   a sheet title), so any served image carries its own identity.
3. Deletes the two _verify*.png temp crops from p1-captures and the failed
   _build_sheets.py.
"""
from PIL import Image, ImageChops, ImageStat, ImageDraw
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
CAP = os.path.join(HERE, "p1-captures")
SRC = "/home/daniebo/Desktop/rama-worktrees/www-tutor-followups/apps/www-reading-advantage/public/images"
SRC_FILES = {
    "hero": os.path.join(SRC, "tutor-advantage-hero-2026-11-06.webp"),
    "become-a-tutor": os.path.join(SRC, "tutor-advantage-teach-class.webp"),
}

checks = json.load(open(os.path.join(CAP, "checks.json")))
section_captures = checks["captures"]


def match_box(png_path, rw, rh):
    """Coarse-to-fine slide of the source photo over the PNG; returns (box, score)."""
    hay = Image.open(png_path).convert("RGB")
    W, H = hay.size
    block = os.path.basename(png_path)
    bcls = "-".join(block.split("-")[1:-1])
    needle_src = Image.open(SRC_FILES[bcls]).convert("RGB")

    # coarse pass at quarter resolution, step 4 (=16px full-res)
    q_hay = hay.resize((W // 4, H // 4))
    q_needle = needle_src.resize((max(1, rw // 4), max(1, rh // 4)))
    qw, qh = q_needle.size
    best = None
    for y in range(0, q_hay.size[1] - qh + 1, 4):
        for x in range(0, q_hay.size[0] - qw + 1, 4):
            crop = q_hay.crop((x, y, x + qw, y + qh))
            score = sum(ImageStat.Stat(ImageChops.difference(crop, q_needle)).mean) / 3
            if best is None or score < best[0]:
                best = (score, x * 4, y * 4)
    # refine at half resolution, step 1 (=2px full-res) around the coarse hit
    h_hay = hay.resize((W // 2, H // 2))
    h_needle = needle_src.resize((max(1, rw // 2), max(1, rh // 2)))
    hw, hh = h_needle.size
    cx, cy = best[1] // 2, best[2] // 2
    fine = None
    for y in range(max(0, cy - 8), min(h_hay.size[1] - hh, cy + 8) + 1):
        for x in range(max(0, cx - 8), min(h_hay.size[0] - hw, cx + 8) + 1):
            crop = h_hay.crop((x, y, x + hw, y + hh))
            score = sum(ImageStat.Stat(ImageChops.difference(crop, h_needle)).mean) / 3
            if fine is None or score < fine[0]:
                fine = (score, x * 2, y * 2)
    score, x0, y0 = fine
    return (x0, y0, x0 + rw, y0 + rh), round(score, 2)


results = []
boxes = {}
print("template match (mean abs diff, 0-255; low = picture region matches source):")
for c in section_captures:
    f = c["file"]
    box, score = match_box(os.path.join(CAP, f), c["renderedWidth"], c["renderedHeight"])
    boxes[f] = box
    results.append(
        {
            "file": f,
            "box": list(box),
            "match_score": score,
            "rendered": [c["renderedWidth"], c["renderedHeight"]],
            "png": list(Image.open(os.path.join(CAP, f)).size),
        }
    )
    flag = "OK" if score < 25 else "CHECK"
    print(f"  {f:30s} box={box} score={score} {flag}")


def try_font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        try:
            return ImageFont_truetype(p, size)
        except Exception:
            continue
    return None


from PIL import ImageFont  # noqa: E402

ImageFont_truetype = ImageFont.truetype


def font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()


def sheet(kind, out):
    order = [f"{l}-{kind}-{w}.png" for l in ("en", "th") for w in (390, 980, 1280)]
    CELL_W, LABEL = 470, 36
    scaled = []
    for f in order:
        im = Image.open(os.path.join(CAP, f)).convert("RGB").crop(boxes[f])
        cw, ch = im.size
        nh = round(ch * CELL_W / cw)
        scaled.append((f, im.resize((CELL_W, nh))))
    cell_h = max(im.size[1] for _, im in scaled) + LABEL + 14
    cols, rows = 2, 3
    W = cols * (CELL_W + 14) + 14
    H = rows * (cell_h + 14) + 14 + 56
    sh = Image.new("RGB", (W, H), (250, 250, 250))
    d = ImageDraw.Draw(sh)
    d.text((14, 16), f"SELF-LABELED SHEET KIND={kind} TRACK=www_tutor_followups_20261118", fill=(200, 0, 0), font=font(22))
    d.text((14, 40), "cells in order: en-390 en-980 en-1280 / th-390 th-980 th-1280", fill=(0, 0, 0), font=font(16))
    for i, (f, im) in enumerate(scaled):
        r, c = divmod(i, cols)
        x = 14 + c * (CELL_W + 14)
        y = 70 + r * (cell_h + 14)
        d.rectangle([x, y, x + CELL_W, y + LABEL], fill=(255, 255, 0))
        d.text((x + 6, y + 8), f, fill=(0, 0, 0), font=font(20))
        sh.paste(im, (x, y + LABEL + 4))
    sh.save(out)
    print(f"saved {out} {sh.size}")


sheet("hero", os.path.join(HERE, "_visual-sheet-hero.png"))
sheet("become-a-tutor", os.path.join(HERE, "_visual-sheet-block.png"))

json.dump(results, open(os.path.join(HERE, "_visual-match.json"), "w"), indent=1)

# cleanup temp files from the earlier session
for victim in (
    os.path.join(CAP, "_verify-hero-390-top.png"),
    os.path.join(CAP, "_verify-block-390-top.png"),
    os.path.join(HERE, "_build_sheets.py"),
):
    if os.path.exists(victim):
        os.remove(victim)
        print(f"removed {victim}")
print("done")
