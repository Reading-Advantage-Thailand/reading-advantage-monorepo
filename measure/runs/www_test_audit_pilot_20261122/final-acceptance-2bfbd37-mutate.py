"""Temporary money-pin mutation probe for the final acceptance of www_test_audit_pilot_20261122.

Run with: python3 -I final-acceptance-2bfbd37-mutate.py
Each case mutates one locale file, runs the pinned tests through heavy-run,
and restores the file with git checkout. The script checks the restore byte for byte.
"""
import subprocess
from pathlib import Path

REPO = Path("/home/daniebo/Desktop/rama-worktrees/www-test-audit")
APP = "apps/www-reading-advantage"
HEAVY = "/home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh"

CASES = [
    (
        "M1 pricing S7 row 1,200 baht -> 1,300 baht",
        "src/locales/pages/pricing.ts",
        '"1,200 baht",',
        '"1,300 baht",',
        ["src/__tests__/www-pricing-page.content.test.tsx", "src/__tests__/www-features-pricing.locale.test.ts"],
    ),
    (
        "M2 th tutorRole.points.3 live line loses its last word",
        "src/locales/pages/products/tutor-advantage.ts",
        'ทักมาคุยกับเราเรื่องกรณีของคุณเองได้"',
        'ทักมาคุยกับเราเรื่องกรณีของคุณเอง"',
        ["src/__tests__/www-tutor-calculator.locale.test.ts"],
    ),
    (
        "M3 en price note 3,000 baht -> 3,500 baht",
        "src/locales/pages/products/tutor-advantage.ts",
        "Default: 3,000 baht. The price adapts to the market.",
        "Default: 3,500 baht. The price adapts to the market.",
        ["src/__tests__/www-tutor-calculator.locale.test.ts"],
    ),
]


def sh(*args):
    return subprocess.run(args, cwd=REPO, capture_output=True, text=True)


for label, rel, old, new, tests in CASES:
    path = REPO / APP / rel
    original = path.read_bytes()
    text = original.decode("utf-8")
    assert old in text, f"pattern not found for {label}"
    print(f"=== {label}")
    try:
        path.write_text(text.replace(old, new, 1), encoding="utf-8")
        diff = sh("git", "diff", "--stat", "--", f"{APP}/{rel}").stdout.strip().splitlines()
        print("mutation applied:", diff[-1] if diff else "no diff")
        cmd = f"pnpm --filter www-reading-advantage exec vitest run --reporter=dot {' '.join(tests)}"
        env = {**__import__("os").environ, "HEAVY_PREFLIGHT_WAIT_S": "3600"}
        run = subprocess.run(["bash", HEAVY, "-c", cmd], cwd=REPO, capture_output=True, text=True, env=env)
        out = run.stdout + run.stderr
        keep = [ln for ln in out.splitlines() if any(k in ln for k in ("FAIL", "AssertionError", "Test Files", "Tests ", "expected"))]
        for ln in keep[:14]:
            print("  ", ln.strip()[:240])
        print("heavy-run exit:", run.returncode, "(non-zero means a pinned test failed)")
    finally:
        sh("git", "checkout", "--", f"{APP}/{rel}")
        restored = path.read_bytes() == original
        print("restored byte for byte:", restored)

print("final git status --short (empty = clean):", repr(sh("git", "status", "--short").stdout))
