#!/usr/bin/env python3
"""Make the blurred Tutor Advantage screens for the www gallery (A-63 task 2.1).

The delivered set shows the development class name "Reading 3.1" in a few
places. Spec 6.1 rule 3 tells us to blur it on every used tutor-desktop screen
and on student-mobile/070. The rectangles below were found by opening each file
at 100% (spec D-14, AC-14). They carry a 2 px margin.

This is a build tool: it reads the handoff folder and writes the repository
assets. No test reads the source folder.
"""

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageFilter

# One rectangle list per used file. Boxes are (x0, y0, x1, y1), 2 px margin.
# Four edges were widened after a full-size measurement of the glyph bounds
# (AC-14): the hero "3.1" ends at x 301, the bubble "g" descender ends at y 232,
# the title "1" ends at x 550, and the dropdown colon ends at x 392.
RECTANGLES = {
    # 520 x 1125
    "student-mobile/070-screen.png": [
        (34, 121, 182, 152),  # the chip "Reading 3.1 · A1"
        (110, 198, 233, 234),  # "Reading 3.1" inside the speech bubble
        (137, 351, 303, 388),  # "Reading 3.1" in the hero card title
        (118, 923, 247, 953),  # "Reading 3.1" in the class list row
    ],
    # 520 x 1125: no class name
    "student-mobile/002-screen.png": [],
    # 1440 x 900
    "tutor-desktop/062-screen.png": [
        (395, 95, 553, 134),  # "Reading 3.1" in the page title
        (393, 132, 485, 157),  # the subtitle "Reading 3.1"
        (395, 390, 487, 419),  # "Reading 3.1" inside the lesson dropdown
        (1085, 341, 1173, 364),  # "Reading 3.1" in the progress card
    ],
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
