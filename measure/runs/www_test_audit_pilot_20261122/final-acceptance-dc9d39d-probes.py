"""Final-acceptance coverage probe for www_test_audit_pilot_20261122.

Run with: python3 -I final-acceptance-dc9d39d-probes.py
Read-only. It uses the checker's own track-scope functions.
"""
import importlib.util
import subprocess
import sys
from pathlib import Path

REPO = Path("/home/daniebo/Desktop/rama-worktrees/www-test-audit")
TRACK = "www_test_audit_pilot_20261122"
TRACK_BASE = "635a604c89b2c909cfce33f555b7f043d4ea520f"
HEAD = "dc9d39dac96b66a60d0c07b8ccdecc49c0352395"
SCRIPT = Path.home() / ".agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py"

spec = importlib.util.spec_from_file_location("mic", SCRIPT)
mic = importlib.util.module_from_spec(spec)
sys.modules["mic"] = mic
spec.loader.exec_module(mic)


def git(*args):
    out = subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True, check=True)
    return out.stdout


def track_paths(audited_head):
    scope = mic.track_scope(REPO, TRACK_BASE, TRACK)
    # track_scope reads baseline..HEAD of the worktree; own commits up to audited_head only
    log = git("rev-list", f"{TRACK_BASE}..{audited_head}").split()
    own = [sha for sha in (scope.own if scope else log) if sha in set(log)]
    paths = set()
    for sha in own:
        got = mic.commit_paths(REPO, sha)
        if got is None:
            print("ERR commit_paths", sha)
            continue
        paths.update(got)
    return paths, len(own), (len(scope.skipped) if scope else 0)


def is_plan_or_evidence(path):
    base = f"measure/tracks/{TRACK}/"
    runs = f"measure/runs/{TRACK}/"
    if path == base + "plan.md":
        return True
    if path.startswith(base):
        name = path[len(base):]
        if "/" not in name and "evidence" in name:
            return True
    if path.startswith(runs):
        return True
    return False


import json


def is_ancestor(a, b):
    return subprocess.run(["git", "-C", str(REPO), "merge-base", "--is-ancestor", a, b]).returncode == 0


print("== P1 ancestry of every audit result named in the brief")
RUNS = REPO / "measure/runs" / TRACK
for name in (
    "phase-acceptance-8a126f6",
    "phase-acceptance-e91c4d4",
    "phase-acceptance-d2c8e63",
    "second-check-d1b9d59",
    "review-a-dc9d39d",
    "adversarial-dc9d39d",
    "spec-review-735a7fe",
):
    d = json.loads((RUNS / f"{name}.json").read_text())
    base = d.get("baseline_sha", "")
    head = d.get("audited_head_sha", "")
    r1 = is_ancestor(base, head) if base and head else "n/a"
    r2 = is_ancestor(head, HEAD) if head else "n/a"
    print(f"{name}: status={d['status']} base={base[:9]} audited={head[:9]} base_anc_audited={r1} audited_anc_HEAD={r2}")

print("== P2 phase-acceptance results per plan phase")
plan = (REPO / "measure/tracks" / TRACK / "plan.md").read_text()
phases = [line[3:] for line in plan.splitlines() if line.startswith("## Phase ")]
results = {}
for path in sorted(RUNS.glob("phase-acceptance-*.json")):
    d = json.loads(path.read_text())
    results.setdefault(d["phase"], []).append((path.name, d["status"]))
for ph in phases:
    got = results.get(ph, [])
    passes = [n for n, s in got if s == "pass"]
    print(f"{ph}: results={len(got)} passing={len(passes)} {passes}")

print("== P3 non-test paths changed by the pilot's own commits (checker rule)")
scope = mic.track_scope(REPO, TRACK_BASE, TRACK)
own = scope.own if scope else git("rev-list", f"{TRACK_BASE}..{HEAD}").split()
paths = set()
for sha in own:
    got = mic.commit_paths(REPO, sha)
    if got is None:
        print("ERR commit_paths", sha)
        continue
    paths.update(got)
nonTest = mic.non_test_paths(paths)
print(f"own_commits={len(own)} skipped_other_track={len(scope.skipped) if scope else 0} paths={len(paths)}")
print(f"non_test_non_measure_paths={len(nonTest)}")
for p in nonTest:
    print("  ", p)
print("apps paths outside apps/www-reading-advantage:", [p for p in paths if p.startswith("apps/") and not p.startswith("apps/www-reading-advantage/")])
print("non-apps/non-measure paths:", [p for p in paths if not p.startswith("apps/") and not p.startswith("measure/")])
print("deleted test files vs baseline:")
print(git("diff", "--diff-filter=D", "--name-only", TRACK_BASE, HEAD) or "  none")

import re

print("== P4 K rows of classification.md against baseline and HEAD")
APP = "apps/www-reading-advantage/"
lines = (REPO / "measure/tracks" / TRACK / "classification.md").read_text().splitlines()
start = lines.index("## K rows (keep)")
end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith("## "))
krows = []
for ln in lines[start:end]:
    if ln.startswith("| src/") or ln.startswith("| scripts/") or ln.startswith("| e2e/"):
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        krows.append((cells[0], cells[2]))
print(f"K rows parsed: {len(krows)}; case sum from the n column: {sum(int(n) for _, n in krows if n.isdigit())}")


def show(rev, path):
    r = subprocess.run(["git", "-C", str(REPO), "show", f"{rev}:{APP}{path}"], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


CALL = re.compile(r"\b(?:it|test)(?:\.each|\.skipIf\([^)]*\))?\s*\(")
missing, changed, same = [], [], 0
for path, n in krows:
    h = show("HEAD", path)
    b = show(TRACK_BASE, path)
    if h is None:
        missing.append(path)
    elif b is None:
        changed.append((path, "absent at base", len(CALL.findall(h))))
    elif b == h:
        same += 1
    else:
        changed.append((path, len(CALL.findall(b)), len(CALL.findall(h))))
print(f"K files byte-identical to baseline: {same}; missing at HEAD: {len(missing)} {missing}")
print(f"K files changed vs baseline: {len(changed)}")
for c in changed:
    print("  ", c)
print("K files whose HEAD test-call count is below the K n of the row (necessary-condition check):")
for path, n in krows:
    h = show("HEAD", path)
    calls = len(CALL.findall(h)) if h else 0
    if n.isdigit() and calls < int(n):
        print("  ", path, "K n =", n, "HEAD calls =", calls)
print("== P5 runner counts of pure-K files: baseline per-file-counts.md vs timing-at-head.json (pre-merge head)")
other_text = "\n".join(lines[end:])
base_counts = {}
for ln in (RUNS / "per-file-counts.md").read_text().splitlines():
    if ln.startswith("| src/") or ln.startswith("| scripts/"):
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if cells[1].isdigit():
            base_counts[cells[0]] = int(cells[1])
head_counts = {}
for t in json.loads((RUNS / "timing-at-head.json").read_text())["testResults"]:
    name = t["name"]
    if APP in name:
        head_counts[name.split(APP, 1)[1]] = len(t["assertionResults"])
pure, mixed = [], []
for path, _ in krows:
    in_other = any(f"| {path} |" in ln for ln in lines[end:])
    (mixed if in_other else pure).append(path)
print(f"pure-K files: {len(pure)}; K files that also hold rows of another class: {len(mixed)}")
lost = []
for path in pure:
    b = base_counts.get(path)
    h = head_counts.get(path)
    if b is None or h is None:
        lost.append((path, b, h, "no count"))
    elif h < b:
        lost.append((path, b, h, "fewer cases at head"))
for row in lost:
    print("  ", row)
print("pure-K files with a lower count at head or no count:", len(lost))
print("== P6 plan markers and SHA evidence (checker functions)")
plan_path = REPO / "measure/tracks" / TRACK / "plan.md"
for ph in phases:
    total, complete, in_progress, incomplete, with_sha = mic.phase_counts(plan_path, ph)
    print(f"{ph}: tasks={total} complete={complete} in_progress={in_progress} incomplete={incomplete} complete_with_sha={with_sha}")
print("track_incomplete:", mic.track_incomplete(plan_path))
print("deferred [b] markers:", [l for l in plan.splitlines() if l.lstrip().startswith("- [b]")])
print("== P7 push state")
print("remote branches containing HEAD:", git("branch", "-r", "--contains", HEAD).strip() or "none")
print("remote branch names with test-audit:", git("branch", "-r", "--list", "*test-audit*").strip() or "none")
print("git status --short (empty = clean):", repr(git("status", "--short")))
money = [p for p, _ in krows if "tutor-commission" in p]
print("tutor-commission K files:", money)
print("git diff --stat baseline..HEAD over them:",
      subprocess.run(["git", "-C", str(REPO), "diff", "--stat", TRACK_BASE, "HEAD", "--", *[APP + p for p in money]],
                     capture_output=True, text=True).stdout or "empty")

print("== P0 later-commit coverage: track paths changed after each phase result, not plan or evidence files")
for label, audited in (
    ("phase4-result d2c8e6336", "d2c8e6336743897f6f55bc6dc1f0a5b3e5005683"),
    ("phase3-result e91c4d4cc", "e91c4d4cc3c8d5d61a1e9b802c031247543180fa"),
):
    paths, n_own, n_skipped = track_paths(HEAD)
    later = git("diff", "--name-only", audited, HEAD).split("\n")
    later = [p for p in later if p]
    track_set = {p for p in paths if not p.startswith("measure/runs/")}
    track_set |= {p for p in later if p.startswith(f"measure/tracks/{TRACK}/") or p.startswith(f"measure/runs/{TRACK}/")}
    hit = sorted(p for p in later if p in track_set and not is_plan_or_evidence(p))
    print(f"== {label}: own_commits={n_own} skipped_other_track={n_skipped}")
    print(f"later_changed_paths={len(later)} track_paths_not_plan_or_evidence={len(hit)}")
    for p in hit:
        print("  ", p)
