"""Temporary blog-merge mutation probe for the final acceptance of www_test_audit_pilot_20261122.

Run with: python3 -I final-acceptance-2bfbd37-blog-mutate.py
Each case breaks one rule in one post other than the post of proof-blog-merge.log,
runs the merged validation file through heavy-run, and restores the post with git checkout.
The script checks the restore byte for byte.
"""
import os
import re
import subprocess
from pathlib import Path

REPO = Path("/home/daniebo/Desktop/rama-worktrees/www-test-audit")
POSTS = "apps/www-reading-advantage/src/app/[locale]/(marketing)/blog/posts"
HEAVY = "/home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh"
TEST = "src/lib/blog-posts-validation.test.ts"

CASES = [
    ("B1 en/welcome-to-our-blog: date becomes an impossible calendar date", "en/welcome-to-our-blog.md", r'^date:.*$', 'date: "2024-13-45"'),
    ("B2 en/ai-education-evolution: excerpt becomes empty", "en/ai-education-evolution.md", r'^excerpt:.*$', 'excerpt: ""'),
    ("B3 th/welcome-to-our-blog: title becomes empty", "th/welcome-to-our-blog.md", r'^title:.*$', 'title: ""'),
]


def sh(*args):
    return subprocess.run(args, cwd=REPO, capture_output=True, text=True)


for label, rel, pattern, replacement in CASES:
    path = REPO / POSTS / rel
    original = path.read_bytes()
    text = original.decode("utf-8")
    mutated, n = re.subn(pattern, replacement, text, count=1, flags=re.M)
    assert n == 1, f"pattern not found for {label}"
    print(f"=== {label}")
    try:
        path.write_text(mutated, encoding="utf-8")
        cmd = f"pnpm --filter www-reading-advantage exec vitest run --reporter=dot {TEST}"
        env = {**os.environ, "HEAVY_PREFLIGHT_WAIT_S": "3600"}
        run = subprocess.run(["bash", HEAVY, "-c", cmd], cwd=REPO, capture_output=True, text=True, env=env)
        out = run.stdout + run.stderr
        keep = [ln for ln in out.splitlines() if any(k in ln for k in ("FAIL", "AssertionError", "Test Files", "Tests ", "welcome-to-our-blog", "ai-education-evolution"))]
        for ln in keep[:10]:
            print("  ", ln.strip()[:260])
        print("heavy-run exit:", run.returncode, "(non-zero means the merged test failed)")
    finally:
        sh("git", "checkout", "--", f"{POSTS}/{rel}")
        print("restored byte for byte:", path.read_bytes() == original)

print("final git status --short (empty = clean):", repr(sh("git", "status", "--short").stdout))
