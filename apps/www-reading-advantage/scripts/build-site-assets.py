#!/usr/bin/env python3
"""Build web-sized site assets from the PR repo into public/media.

Usage: python3 scripts/build-site-assets.py [path-to-advantage-pr]
Writes public/media/** and src/lib/site-assets.ts. Image optimization is off in
next.config.ts, so each image ships at 800 and 1600 pixels wide.
"""
import os
import shutil
import subprocess
import sys

from PIL import Image

SRC = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "../../../advantage-pr")
ASSETS = os.path.join(SRC, "assets")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "media")
VI = "video-assets/images/"
FF = "images/games/fantasy-asset-forge/"
SS = "screenshots/reading-advantage/2026-06-11/"

# key: (source under assets/, folder, tags). Tags say which pages may use the image.
IMAGES = {
    "masteryStates": (VI + "2026-08-15-A01-knowledge-graph-states-overview-1920x1080.jpg", "mastery", ["mastery"]),
    "masteryClusterHero": (VI + "2026-08-15-knowledge-graph-cluster-hero-1920x1080.jpg", "mastery", ["mastery"]),
    "masteryClusterEdges": (VI + "2026-08-15-knowledge-graph-cluster-with-edges-1920x1080.jpg", "mastery", ["mastery"]),
    "masteryPulse": (VI + "2026-08-15-A04-knowledge-space-central-pulse-1920x1080.jpg", "mastery", ["mastery"]),
    "masteryGrid": (VI + "2026-08-19-mastery-advantage-img2-1920x1080.jpg", "mastery", ["mastery"]),
    "masteryPixels": (VI + "2026-08-26-mastery-advantage-img2-1920x1080.jpg", "mastery", ["mastery"]),
    "primaryBook": (VI + "2026-08-18-primary-advantage-img1-1920x1080.jpg", "primary", ["primary", "tutor"]),
    "primaryIcons": (VI + "2026-08-18-primary-advantage-img2-1920x1080.jpg", "primary", ["primary", "tutor"]),
    "primaryBookWarm": (VI + "2026-08-25-primary-advantage-img1-1920x1080.jpg", "primary", ["primary", "tutor"]),
    "primaryIconsWarm": (VI + "2026-08-25-primary-advantage-img2-1920x1080.jpg", "primary", ["primary", "tutor"]),
    "readingWorkbookTablet": (VI + "2026-08-17-reading-advantage-img2-1920x1080.jpg", "reading", ["reading", "blended"]),
    "readingBookTablet": (VI + "2026-08-24-reading-advantage-img2-1920x1080.jpg", "reading", ["reading", "blended"]),
    "workbookTabletCutaway": (VI + "2026-08-15-workbook-tablet-cutaway-1920x1080.jpg", "blended", ["blended", "reading", "mastery"]),
    "blendedBookTablet": (VI + "2026-08-20-blended-learning-img1-1920x1080.jpg", "blended", ["blended"]),
    "blendedBookGlow": (VI + "2026-08-27-blended-learning-img1-1920x1080.jpg", "blended", ["blended"]),
    "blendedRibbon": (VI + "2026-08-20-blended-learning-img2-1920x1080.jpg", "blended", ["blended"]),
    "tutorQuestion": (VI + "2026-08-21-tutor-advantage-img2-1920x1080.jpg", "tutor", ["tutor"]),
    "textureWarm": (VI + "2026-08-15-warm-gradient-texture-plate-1920x1080.jpg", "texture", ["any"]),
    "chibiHamletMap": (FF + "chibi-quest-hamlet-concept-map-mockup.png", "chibi", ["primary", "tutor"]),
    "chibiHamletPoster": (FF + "posters/the-hamlet-chibi-quest.webp", "chibi", ["primary", "tutor"]),
    "chibiForestPoster": (FF + "posters/the-enchanted-forest-chibi-quest.jpg", "chibi", ["primary", "tutor"]),
    "chibiVaultPoster": (FF + "posters/the-vault-chibi-quest.jpg", "chibi", ["primary", "tutor"]),
    "chibiOakClearing": (FF + "chibi-quest-old-oak-clearing-3q-render.png", "chibi", ["primary", "tutor"]),
    "screenArticleReading": (SS + "01-2026-06-11-article-reading-full-page.png", "screens", ["reading"]),
    "screenGamesLibrary": (SS + "03-2026-06-11-games-library-full-page.png", "screens", ["reading"]),
    "screenMagicDefense": (SS + "04-2026-06-11-game-magic-defense-full-page.png", "screens", ["reading"]),
    "screenStudentReports": (SS + "10-2026-06-11-student-reports-dashboard-full-page.png", "screens", ["reading", "blended"]),
}

PRODUCTS = ["codecamp", "mastery", "math", "primary", "reading", "science", "stem", "storytime", "tutor", "zhongwen"]
LOGO_SETS = {"svg": "{p}-advantage.svg", "reversed": "{p}-advantage-reversed.svg", "lockups": "{p}-advantage-thai-lockup.svg"}

# key: (source, output name, max width, crf). The 2026-08-15 explainer is excluded: it says "our quality guarantee" and "Retain longer, review less".
VIDEOS = {
    "masteryBloom": ("video-assets/videos/2026-08-14-A01-knowledge-graph-bloom-1366x768.mp4", "mastery-graph-bloom.mp4", 1280, 28),
}


def save_webp(im, path, width, quality):
    im = im.copy()
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(path, "WEBP", quality=quality, method=6)
    return im.size


def build_images():
    out = {}
    for key, (rel, folder, tags) in IMAGES.items():
        im = Image.open(os.path.join(ASSETS, rel)).convert("RGB")
        d = os.path.join(OUT, "images", folder)
        os.makedirs(d, exist_ok=True)
        name = "".join("-" + c.lower() if c.isupper() else c for c in key)
        lg = save_webp(im, os.path.join(d, f"{name}-1600.webp"), 1600, 78)
        # Screenshots are tall pages: cap the 1600 file to the first 1000 px of height.
        if folder == "screens" and lg[1] > 1000:
            cropped = im.resize((lg[0], lg[1]), Image.LANCZOS).crop((0, 0, lg[0], 1000))
            cropped.save(os.path.join(d, f"{name}-1600.webp"), "WEBP", quality=78, method=6)
            lg = cropped.size
            sm_im = cropped
        else:
            sm_im = im
        sm = save_webp(sm_im, os.path.join(d, f"{name}-800.webp"), 800, 76)
        base = f"/media/images/{folder}/{name}"
        out[key] = {"sm": f"{base}-800.webp", "lg": f"{base}-1600.webp", "width": lg[0], "height": lg[1], "tags": tags}
    return out


def build_logos():
    out = {}
    for kind, pattern in LOGO_SETS.items():
        d = os.path.join(OUT, "brand", "logos", kind)
        os.makedirs(d, exist_ok=True)
        for p in PRODUCTS:
            name = pattern.format(p=p)
            shutil.copy(os.path.join(ASSETS, "logos", kind, name), os.path.join(d, name))
            out.setdefault(p, {})[kind] = f"/media/brand/logos/{kind}/{name}"
    return out


def build_videos():
    out = {}
    d = os.path.join(OUT, "video")
    os.makedirs(d, exist_ok=True)
    for key, (rel, name, width, crf) in VIDEOS.items():
        dest = os.path.join(d, name)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(ASSETS, rel),
             "-vf", f"scale='min({width},iw)':-2", "-c:v", "libx264", "-crf", str(crf),
             "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an" if key == "masteryBloom" else "-c:a", *([] if key == "masteryBloom" else ["aac", "-b:a", "96k"]), dest],
            check=True,
        )
        poster = dest.replace(".mp4", "-poster.webp")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "2", "-i", dest, "-frames:v", "1", poster + ".png"], check=True)
        Image.open(poster + ".png").convert("RGB").save(poster, "WEBP", quality=78)
        os.remove(poster + ".png")
        out[key] = {"src": f"/media/video/{name}", "poster": f"/media/video/{name.replace('.mp4', '-poster.webp')}"}
    return out


def write_manifest(images, logos, videos):
    lines = [
        "// Generated by scripts/build-site-assets.py. Do not edit by hand.",
        "// Image optimization is off, so each image has an 800 and a 1600 pixel file.",
        "// `tags` list the pages that may use the image. Chibi Quest art is primary and tutor only.",
        "",
        "export type SiteImage = {",
        "  sm: string;",
        "  lg: string;",
        "  width: number;",
        "  height: number;",
        '  tags: readonly ("any" | "mastery" | "primary" | "reading" | "blended" | "tutor")[];',
        "};",
        "",
        "export const siteImages = {",
    ]
    for k, v in images.items():
        tags = ", ".join(f'"{t}"' for t in v["tags"])
        lines.append(f'  {k}: {{ sm: "{v["sm"]}", lg: "{v["lg"]}", width: {v["width"]}, height: {v["height"]}, tags: [{tags}] }},')
    lines += ["} as const satisfies Record<string, SiteImage>;", "", "export const siteLogos = {"]
    for p, v in logos.items():
        lines.append(f'  {p}: {{ color: "{v["svg"]}", reversed: "{v["reversed"]}", thaiLockup: "{v["lockups"]}" }},')
    lines += ["} as const;", "", "export const siteVideos = {"]
    for k, v in videos.items():
        lines.append(f'  {k}: {{ src: "{v["src"]}", poster: "{v["poster"]}" }},')
    lines += ["} as const;", ""]
    with open(os.path.join(ROOT, "src", "lib", "site-assets.ts"), "w") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    write_manifest(build_images(), build_logos(), build_videos())
