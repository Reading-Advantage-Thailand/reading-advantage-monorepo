"""Probe tool of adversarial-dc9d39d (www test audit pilot, Phase 4, round 2). Labels: Q1..Q4.
Usage: python3 -I mut.py apply <probe> | check <probe> | revert
  apply   writes the edits of one probe and fails when an old-text count is wrong
  check   dry run: counts the old text of every edit, writes nothing
  revert  restores every file a probe can touch with git checkout, then prints git status
"""
import pathlib
import subprocess
import sys

REPO = pathlib.Path("/home/daniebo/Desktop/rama-worktrees/www-test-audit")
APP = "apps/www-reading-advantage"
LOADER = f"{APP}/src/__tests__/fixtures/blog-posts-loader.ts"
ADV_TEST = f"{APP}/src/__tests__/blog-posts-loader.adversarial.test.ts"

# Each edit is (path, old, new, expected count of old).
PROBES = {
    # Q1: brokenPostRefs accepts a directory named like a post (a real directory or a link to one).
    "Q1": [
        (
            LOADER,
            "if (!fs.statSync(fullPath).isFile()) refs.push(`${locale}/${entry.name}`);",
            "if (!fs.statSync(fullPath).isFile() && !fs.statSync(fullPath).isDirectory()) refs.push(`${locale}/${entry.name}`);",
            1,
        ),
    ],
    # Q2: brokenPostRefs follows a symlink and accepts anything that resolves.
    "Q2": [
        (
            LOADER,
            "if (!fs.statSync(fullPath).isFile()) refs.push(`${locale}/${entry.name}`);",
            "if (!fs.existsSync(fullPath)) refs.push(`${locale}/${entry.name}`);",
            1,
        ),
    ],
    # Q3: listPostFiles follows a directory symlink and lists it as a post.
    "Q3": [
        (
            LOADER,
            "if (fs.statSync(fullPath).isFile()) refs.push(`${locale}/${entry.name}`);",
            "if (fs.statSync(fullPath).isFile() || fs.statSync(fullPath).isDirectory()) refs.push(`${locale}/${entry.name}`);",
            1,
        ),
    ],
    # Q4: the ADV-22 case no longer removes its temp base. The stray folder check must see it.
    "Q4": [
        (
            ADV_TEST,
            "      fs.rmSync(tempBase, { recursive: true, force: true });\n",
            "",
            1,
        ),
    ],
    # Q5: link creation throws after the temp base exists (ENOENT). Does the test leak the base?
    "Q5": [
        (
            ADV_TEST,
            '    const linkPath = path.join(localeDir, "zz-adv-dirlink.md");',
            '    const linkPath = path.join(localeDir, "zz-adv-missing-dir", "zz-adv-dirlink.md");',
            1,
        ),
    ],
}

TOUCHED = sorted({edit[0] for edits in PROBES.values() for edit in edits})


def git(*args: str) -> str:
    return subprocess.run(["git", *args], cwd=REPO, check=True, capture_output=True, text=True).stdout


def apply(name: str, write: bool) -> None:
    pending: dict[str, str] = {}
    for path, old, new, count in PROBES[name]:
        text = pending.get(path) or (REPO / path).read_text(encoding="utf-8")
        found = text.count(old)
        if found != count:
            sys.exit(f"PRECONDITION FAILED {name}: {path}: expected {count}, found {found}: {old[:70]!r}")
        pending[path] = text.replace(old, new)
        print(f"ok {name}: {path.split('/')[-1]}: {old[:60]!r} -> {new[:60]!r}")
    if write:
        for path, text in pending.items():
            (REPO / path).write_text(text, encoding="utf-8")
        print(f"APPLIED {name}: {len(pending)} file(s) written")
    else:
        print(f"CHECK {name}: all preconditions hold, nothing written")


def revert() -> None:
    git("checkout", "--", *TOUCHED)
    status = git("status", "--short", "--untracked-files=all")
    print("git status after revert:", repr(status))
    if status.strip():
        sys.exit("TREE NOT CLEAN")
    print("TREE CLEAN")


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "revert":
        revert()
    elif mode in ("apply", "check"):
        apply(sys.argv[2], write=(mode == "apply"))
    else:
        sys.exit("usage: apply|check <probe> | revert")
