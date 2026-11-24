"""Final-acceptance coverage probe, round 2, for www_test_audit_pilot_20261122.

Run with: python3 -I final-acceptance-2bfbd37-probes.py [cases.json]
Read-only. It uses the checker's own track-scope functions.
The optional cases.json is a Vitest JSON report of the full suite at HEAD.
"""
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path("/home/daniebo/Desktop/rama-worktrees/www-test-audit")
TRACK = "www_test_audit_pilot_20261122"
TRACK_BASE = "635a604c89b2c909cfce33f555b7f043d4ea520f"
MASTER_TIP = "968bde612595fdcfcbadd8d7d14bafbfa8aa8b67"
HEAD = "2bfbd373fef2fc500798efe721975fa0a345e73f"
APP = "apps/www-reading-advantage/"
RUNS = REPO / "measure/runs" / TRACK
SCRIPT = Path.home() / ".agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py"

spec = importlib.util.spec_from_file_location("mic", SCRIPT)
mic = importlib.util.module_from_spec(spec)
sys.modules["mic"] = mic
spec.loader.exec_module(mic)


def git(*args, check=True):
    out = subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True, check=check)
    return out.stdout


def is_ancestor(a, b):
    return subprocess.run(["git", "-C", str(REPO), "merge-base", "--is-ancestor", a, b]).returncode == 0


def is_plan_or_evidence(path):
    base = f"measure/tracks/{TRACK}/"
    runs = f"measure/runs/{TRACK}/"
    if path == base + "plan.md":
        return True
    if path.startswith(base):
        name = path[len(base):]
        if "/" not in name and "evidence" in name:
            return True
    return path.startswith(runs)


print("== P0 identity")
print("HEAD:", git("rev-parse", "HEAD").strip(), "equals brief:", git("rev-parse", "HEAD").strip() == HEAD)
print("git status --short (empty = clean):", repr(git("status", "--short")))

print("== P1 ancestry of every role result JSON in the run folder that carries both SHAs")
bad = 0
rows = 0
for path in sorted(RUNS.glob("*.json")):
    if path.name.startswith(("gate-", "baseline", "timing")):
        continue
    d = json.loads(path.read_text())
    base, head = d.get("baseline_sha", ""), d.get("audited_head_sha", "")
    if not (base and head):
        print(f"  no SHA pair: {path.name} status={d.get('status')}")
        continue
    rows += 1
    a1 = is_ancestor(base, head)
    a2 = is_ancestor(head, HEAD)
    if not (a1 and a2):
        bad += 1
        print(f"  NOT ANCESTOR {path.name} status={d.get('status')} base={base[:9]} audited={head[:9]} base_anc_audited={a1} audited_anc_HEAD={a2}")
print(f"results with a SHA pair: {rows}; results failing an ancestry test: {bad}")
print("named results of this round:")
for name in (
    "phase-acceptance-8a126f6", "phase-acceptance-e91c4d4", "phase-acceptance-d2c8e63",
    "phase-acceptance-p1-2bfbd37", "phase-acceptance-p4-2bfbd37", "review-a-2bfbd37",
    "adversarial-p1-7336f42", "second-check-d1b9d59", "spec-review-735a7fe",
):
    d = json.loads((RUNS / f"{name}.json").read_text())
    base, head = d.get("baseline_sha", ""), d.get("audited_head_sha", "")
    r1 = is_ancestor(base, head) if base and head else "n/a"
    r2 = is_ancestor(head, HEAD) if head else "n/a"
    print(f"  {name}: status={d['status']} base={base[:9]} audited={head[:9]} base_anc_audited={r1} audited_anc_HEAD={r2} blocking={len(d.get('blocking_findings', []))}")

print("== P2 phase-acceptance results per plan phase")
plan_path = REPO / "measure/tracks" / TRACK / "plan.md"
plan = plan_path.read_text()
phases = [line[3:] for line in plan.splitlines() if line.startswith("## Phase ")]
results = {}
for path in sorted(RUNS.glob("phase-acceptance-*.json")):
    d = json.loads(path.read_text())
    results.setdefault(d["phase"], []).append((path.name, d["status"], d["audited_head_sha"][:9]))
for ph in phases:
    got = results.get(ph, [])
    passes = [(n, h) for n, s, h in got if s == "pass"]
    print(f"{ph}: results={len(got)} passing={len(passes)} {passes}")

print("== P3 non-test paths changed by the pilot's own commits (checker rule)")
scope = mic.track_scope(REPO, TRACK_BASE, TRACK)
own = list(scope.own) if scope else git("rev-list", f"{TRACK_BASE}..{HEAD}").split()
paths = set()
for sha in own:
    got = mic.commit_paths(REPO, sha)
    if got is None:
        print("ERR commit_paths", sha)
        continue
    paths.update(got)
non_test = mic.non_test_paths(paths)
print(f"own_commits={len(own)} skipped_other_track={len(scope.skipped) if scope else 0} paths={len(paths)}")
print(f"non_test_non_measure_paths={len(non_test)}")
for p in non_test:
    print("  ", p)
print("apps paths outside apps/www-reading-advantage:", [p for p in paths if p.startswith("apps/") and not p.startswith(APP)])
print("paths outside apps/ and measure/:", [p for p in paths if not p.startswith("apps/") and not p.startswith("measure/")])
print("deleted files vs track base:")
print(git("diff", "--diff-filter=D", "--name-only", TRACK_BASE, HEAD) or "  none")
print("== P3b pilot diff against the merged master tip (what this branch changed beyond master)")
vs_master = [p for p in git("diff", "--name-only", MASTER_TIP, HEAD).split("\n") if p]
app_vs_master = [p for p in vs_master if p.startswith("apps/")]
print(f"paths changed vs master tip: {len(vs_master)}; under apps/: {len(app_vs_master)}")
print("non-test paths vs master tip (checker non_test_paths):", mic.non_test_paths(set(vs_master)))
print("paths vs master tip outside apps/www-reading-advantage and measure/:", [p for p in vs_master if not p.startswith(APP) and not p.startswith("measure/")])
print("git diff --name-only 635a604c89 HEAD over packages, services, integrations:", repr(git("diff", "--name-only", TRACK_BASE, HEAD, "--", "packages", "services", "integrations")))
print("git diff --name-only 635a604c89 968bde612 under apps/ (master's own change):")
for p in git("diff", "--name-only", TRACK_BASE, MASTER_TIP, "--", "apps").split("\n"):
    if p:
        print("  ", p)

print("== P4 later-commit coverage per audit result (track paths changed after the audited HEAD, not plan or evidence)")
RESULTS = {
    "phase-acceptance-p1-2bfbd37": None,
    "phase-acceptance-p4-2bfbd37": None,
    "review-a-2bfbd37": None,
    "adversarial-p1-7336f42": None,
    "phase-acceptance-d2c8e63": None,
    "phase-acceptance-e91c4d4": None,
    "phase-acceptance-8a126f6": None,
}
own_set = set(own)
for name in RESULTS:
    d = json.loads((RUNS / f"{name}.json").read_text())
    audited = d["audited_head_sha"]
    audited_full = git("rev-parse", audited).strip()
    log = set(git("rev-list", f"{TRACK_BASE}..{audited_full}").split())
    track_commits = [s for s in own if s in log]
    tpaths = set()
    for sha in track_commits:
        got = mic.commit_paths(REPO, sha)
        if got:
            tpaths.update(got)
    later = [p for p in git("diff", "--name-only", audited_full, HEAD).split("\n") if p]
    track_set = {p for p in tpaths if not p.startswith("measure/runs/")}
    track_set |= {p for p in later if p.startswith(f"measure/tracks/{TRACK}/") or p.startswith(f"measure/runs/{TRACK}/")}
    hit = sorted(p for p in later if p in track_set and not is_plan_or_evidence(p))
    n_later = len(git("rev-list", f"{audited_full}..{HEAD}").split())
    print(f"{name} audited={audited_full[:9]} later_commits={n_later} later_paths={len(later)} uncovered_track_paths={len(hit)}")
    for p in hit[:40]:
        print("    ", p)
    if len(hit) > 40:
        print(f"     ... {len(hit) - 40} more")

print("== P5 K rows of classification.md against baseline and HEAD")
lines = (REPO / "measure/tracks" / TRACK / "classification.md").read_text().splitlines()
start = lines.index("## K rows (keep)")
end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith("## "))
krows = []
for ln in lines[start:end]:
    if ln.startswith(("| src/", "| scripts/", "| e2e/")):
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

money = [p for p, _ in krows if "tutor-commission" in p]
print("tutor-commission K files:", len(money))
print("git diff --stat 635a604c89 HEAD over them:",
      subprocess.run(["git", "-C", str(REPO), "diff", "--stat", TRACK_BASE, "HEAD", "--", *[APP + p for p in money]],
                     capture_output=True, text=True).stdout or "empty")

print("== P5b D5 revert: files the D5 commits touched, HEAD against the track base")
d5 = ["ee5c7b7390847eee0879ca9e8fa94b5eb4d33bd3", "7008ccefd63494410c7790bed26ead80fb6dd8c0",
      "c577cdf18746f049571f21103bf8870dce0d114f", "407c5d9bd88b840bd896c2f36defb466c8d90832"]
d5files = set()
for sha in d5:
    d5files.update(p for p in git("diff-tree", "--no-commit-id", "--name-only", "-r", sha).split("\n") if p)
print(f"files touched by the four D5 part commits: {len(d5files)}")
ident = diff = 0
for p in sorted(d5files):
    r = subprocess.run(["git", "-C", str(REPO), "diff", "--quiet", TRACK_BASE, "HEAD", "--", p])
    if r.returncode == 0:
        ident += 1
    else:
        diff += 1
        print("   differs from track base:", p)
print(f"identical to the track base at HEAD: {ident}; differ: {diff}")

if len(sys.argv) > 1:
    print("== P6 runner counts per file, baseline per-file-counts.md against the HEAD Vitest JSON report")
    base_counts = {}
    for ln in (RUNS / "per-file-counts.md").read_text().splitlines():
        if ln.startswith(("| src/", "| scripts/")):
            cells = [c.strip() for c in ln.strip().strip("|").split("|")]
            if cells[1].isdigit():
                base_counts[cells[0]] = int(cells[1])
    rep = json.loads(Path(sys.argv[1]).read_text())
    head_counts = {}
    for t in rep["testResults"]:
        if APP in t["name"]:
            head_counts[t["name"].split(APP, 1)[1]] = len(t["assertionResults"])
    print(f"report: tests={rep['numTotalTests']} passed={rep['numPassedTests']} failed={rep['numFailedTests']} files={len(head_counts)}")
    pure, mixed = [], []
    for path, _ in krows:
        in_other = any(f"| {path} |" in ln for ln in lines[end:])
        (mixed if in_other else pure).append(path)
    print(f"pure-K files: {len(pure)}; K files that also hold rows of another class: {len(mixed)}")
    lost = []
    for path in pure:
        b, h = base_counts.get(path), head_counts.get(path)
        if b is None or h is None:
            lost.append((path, b, h, "no count"))
        elif h < b:
            lost.append((path, b, h, "fewer cases at head"))
    for row in lost:
        print("  ", row)
    print("pure-K files with a lower count at head or no count:", len(lost))
    kcases_base = sum(base_counts.get(p, 0) for p, _ in krows)
    kcases_head = sum(head_counts.get(p, 0) for p, _ in krows)
    print(f"K files total runner cases: baseline {kcases_base}, HEAD {kcases_head}")
    print("mixed K files with a lower count at HEAD:")
    for path in mixed:
        b, h = base_counts.get(path), head_counts.get(path)
        if b is not None and h is not None and h < b:
            print("  ", path, b, "->", h)
    print("files at baseline missing at HEAD:", sorted(set(base_counts) - set(head_counts)))
    print("files at HEAD missing at baseline:", sorted(set(head_counts) - set(base_counts)))

print("== P7 plan markers and SHA evidence (checker functions)")
for ph in phases:
    total, complete, in_progress, incomplete, with_sha = mic.phase_counts(plan_path, ph)
    print(f"{ph}: tasks={total} complete={complete} in_progress={in_progress} incomplete={incomplete} complete_with_sha={with_sha}")
print("track_incomplete:", mic.track_incomplete(plan_path))
print("[b] markers:", [l for l in plan.splitlines() if l.lstrip().startswith("- [b]")])
print("plan_closeout_feedback:", mic.plan_closeout_feedback(plan_path))
print("== P8 push state")
print("remote branches containing HEAD:", git("branch", "-r", "--contains", HEAD).strip() or "none")
print("remote branch names with test-audit:", git("branch", "-r", "--list", "*test-audit*").strip() or "none")
