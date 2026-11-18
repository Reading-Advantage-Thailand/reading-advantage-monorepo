#!/usr/bin/env python3
"""Make the Tutor Advantage screens for the www gallery (A-63 tasks 2.1 and 3.4).

The delivered set of 2026-11-16 shows the development class name "Reading 3.1"
in a few places. Spec 6.1 rule 3 tells us to blur it on every screen that goes
on the page. The five gallery screens of PR section 2 show no class name and no
price, so every rectangle list below is empty. The rectangles are found by
opening each file at 100% (spec D-14, AC-14). They carry a 2 px margin.

This is a build tool: it reads the source folder and writes the repository
assets. No test reads the source folder.
"""

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageFilter

# One rectangle list per used file. Boxes are (x0, y0, x1, y1), 2 px margin.
# Every gallery screen was reviewed at full size and shows no "Reading 3.1",
# so no box is needed. The 070 student screen and the 062 tutor screen that
# carried the class name are not gallery screens and do not ship.
RECTANGLES = {
    # 520 x 1125: the guided writing task from the printed workbook
    "student-mobile/040-screen.png": [],
    # 520 x 1125: the short answer in the app
    "student-mobile/002-screen.png": [],
    # 520 x 1125: the AI check and the points after an answer
    "student-mobile/004-screen.png": [],
    # 520 x 1125: the end of lesson self rating
    "student-mobile/052-screen.png": [],
    # 520 x 1125: the learning record
    "student-mobile/064-screen.png": [],
}

BLUR_RADIUS = 12
WEBP_QUALITY = 85


def blur_boxes(image: Image.Image, boxes: list[tuple[int, int, int, int]]) -> Image.Image:
    """Blur every box in place and return the image."""
    for box in boxes:
        region = image.crop(box).filter(ImageFilter.GaussianBlur(BLUR_RADIUS))
        image.paste(region, box)
    return image


def main() -> int:
    """Run the blur pass over the used files and print each output path."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, help="folder of the delivered screenshot set")
    parser.add_argument("--out", required=True, help="folder that receives the webp files")
    args = parser.parse_args()

    source = Path(args.source).expanduser()
    out = Path(args.out).expanduser()

    for relative, boxes in RECTANGLES.items():
        source_file = source / relative
        if not source_file.is_file():
            print(f"missing source file: {source_file}", file=sys.stderr)
            return 1

        with Image.open(source_file) as opened:
            image = opened.convert("RGB")
        blur_boxes(image, boxes)

        target = out / Path(relative).with_suffix(".webp")
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, format="WEBP", quality=WEBP_QUALITY)
        print(target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
