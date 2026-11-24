"""Phase 4 acceptance probes for www_test_audit_pilot_20261122, audited HEAD 2bfbd373f.

Run with: python3 -I phase-acceptance-p4-2bfbd37-probes.py
Read-only. It writes nothing and runs no test suite.
"""
import json
import re
import subprocess
from pathlib import Path

REPO = Path("/home/daniebo/Desktop/rama-worktrees/www-test-audit")
TRACK = "www_test_audit_pilot_20261122"
HEAD = "2bfbd373fef2fc500798efe721975fa0a345e73f"
TRACK_BASE = "635a604c89b2c909cfce33f555b7f043d4ea520f"
PHASE_BASE = "e91c4d4cc3c8d5d61a1e9b802c031247543180fa"
P1_END = "a1caa58034f6455e91205a5673ef172a974a7992"
ADV_P1 = "7336f42b31b2a80eb4ba61a093a84ada9befa866"
MASTER = "968bde612595fdcfcbadd8d7d14bafbfa8aa8b67"
RUNS = REPO / "measure/runs" / TRACK
TDIR = REPO / "measure/tracks" / TRACK
WWW = "apps/www-reading-advantage/"

fails = []
passes = 0


def git(*args, check=True):
    p = subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True)
    if check and p.returncode != 0:
        raise RuntimeError(f"git {args} -> {p.returncode}: {p.stderr}")
    return p.stdout


def ok(name, cond, detail=""):
    global passes
    if cond:
        passes += 1
        print(f"PASS {name} {detail}".rstrip())
    else:
        fails.append(name)
        print(f"FAIL {name} {detail}".rstrip())


def info(msg):
    print(f"INFO {msg}")


def is_test_path(p):
    return p.startswith(WWW) and (
        re.search(r"\.test\.(ts|tsx)$", p) is not None
        or "/__tests__/" in p
        or "/fixtures/" in p
    )


# ---------------------------------------------------------------- G0 context
print("== G0 context")
ok("G0.1 HEAD equals audited head", git("rev-parse", "HEAD").strip() == HEAD)
dirty = [l for l in git("status", "--porcelain=v1").splitlines() if not l[3:].startswith("measure/runs/")]
ok("G0.2 worktree clean outside measure/runs", dirty == [], str(dirty))
ok("G0.3 phase base is ancestor of HEAD", subprocess.run(["git", "-C", str(REPO), "merge-base", "--is-ancestor", PHASE_BASE, HEAD]).returncode == 0)
ok("G0.4 no remote branch holds HEAD (no push)", git("branch", "-r", "--contains", HEAD).strip() == "")

# ---------------------------------------------------------------- G1 tasks 4.1-4.18
print("== G1 plan tasks 4.1 to 4.18")
plan = (TDIR / "plan.md").read_text()
p4 = plan.split("## Phase 4: Pilot report", 1)[1]
tasks = re.findall(r"^- \[(.)\] (4\.\d+) (.*?) \(([0-9a-f]{7,40})\)\s*$", p4, re.M)
ok("G1.1 18 tasks 4.1 to 4.18 found", [t[1] for t in tasks] == [f"4.{i}" for i in range(1, 19)], str([t[1] for t in tasks]))
ok("G1.2 every task marker is [x] (A4: not vacuous)", all(t[0] == "x" for t in tasks) and len(tasks) == 18)
ok("G1.3 no [ ], [~] or [b] marker in Phase 4", re.search(r"^- \[[ ~b]\] 4\.", p4, re.M) is None)
phase4_commits = set(git("rev-list", f"{PHASE_BASE}..{HEAD}").split())
for marker, tid, title, sha in tasks:
    full = git("rev-parse", "--verify", f"{sha}^{{commit}}", check=False).strip()
    in_range = full in phase4_commits
    ok(f"G1.4 task {tid} SHA {sha} resolves and sits in the Phase 4 range", bool(full) and in_range)
    # the Commit: line of the task block names the same commit (full SHA)
    blk = re.search(rf"^- \[x\] {re.escape(tid)} .*?(?=^- \[|\Z)", p4, re.M | re.S)
    cl = re.search(r"^\s+Commit: ([0-9a-f]{40})\.", blk.group(0), re.M) if blk else None
    if cl:
        ok(f"G1.5 task {tid} Commit line matches first-line SHA", cl.group(1) == full, cl.group(1)[:9])
    else:
        info(f"task {tid} has no full-SHA Commit line")
# Report wording commit named in task 4.15
ok("G1.6 task 4.15 report wording commit 9ccdeac32 resolves", git("rev-parse", "--verify", "9ccdeac32567ebcb048fabb21f77533a51588c78^{commit}", check=False).strip() != "")

# ---------------------------------------------------------------- G2 numbers
print("== G2 report numbers")
base = json.loads((RUNS / "baseline.json").read_text())
base_cases = base["case_count"]
base_cov = base["line_coverage_pct"]
ok("G2.1 baseline.json case_count=3175 and line_coverage_pct=86.52", (base_cases, base_cov) == (3175, 86.52), f"{base_cases} {base_cov}")
glog = (RUNS / "green-at-f97a72f9.log").read_text()
clog = (RUNS / "coverage-at-f97a72f9.log").read_text()
final_cases = int(re.search(r"Tests\s+(\d+) passed \(\1\)", glog).group(1))
final_files = int(re.search(r"Test Files\s+(\d+) passed \(\1\)", glog).group(1))
final_cov = float(re.search(r"Lines\s*:\s*([\d.]+)%", clog).group(1))
ok("G2.2 final run 1494 tests in 98 files, lines 92.08", (final_cases, final_files, final_cov) == (1494, 98, 92.08), f"{final_cases} {final_files} {final_cov}")
cut = base_cases - final_cases
ok("G2.3 cut 1681 and 52.9 %", cut == 1681 and round(cut / base_cases * 100, 1) == 52.9, f"{cut} {cut / base_cases * 100:.3f}")
ok("G2.4 20 % target is 635 cases and the cut is at least it", round(base_cases * 0.2) == 635 and cut >= 635)
ok("G2.5 coverage rise 5.56 points", round(final_cov - base_cov, 2) == 5.56, f"{final_cov - base_cov:.2f}")
g257 = json.loads((RUNS / "gate-257a6b0c.json").read_text())
merge_cut = g257["cases_before"] - g257["cases_after"]
ok("G2.6 blog merge removed 1709 cases (3094 to 1385)", (g257["cases_before"], g257["cases_after"], merge_cut) == (3094, 1385, 1709))
ok("G2.7 without the blog merge 3203 cases, 28 above the baseline", final_cases + merge_cut == 3203 and 3203 - base_cases == 28)
report = (TDIR / "report.md").read_text()
for needle in ("1494 cases", "92.08 %", "1681 cases, or 52.9 %", "5.56 points", "635 cases", "3064 K cases (96.5 %)", "3203 cases", "28 above the 3175 baseline"):
    ok(f"G2.8 report.md states '{needle}'", needle in report)
ok("G2.9 report.md holds no stale 81, 54, 3121 cut figure", re.search(r"\b(81 cases|54 cases|3121)\b", report) is None)

# ---------------------------------------------------------------- G3 per-class table vs gate JSON
print("== G3 per-class table against gate JSON")
sec2 = report.split("## 2. Per-class commits", 1)[1].split("## 3.", 1)[0]
rows = re.findall(r"^\| (D1|D2|D3|D4|D5 part \d \(reverted\)|D5 revert|R2|Blog merge) \| ([\d.]+) \| ([0-9a-f]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|$", sec2, re.M)
ok("G3.1 eleven class rows in the table", len(rows) == 11, str(len(rows)))
for cls, task, commit, cb, ca, green, cov, glg, clg, gj in rows:
    full = git("rev-parse", "--verify", f"{commit}^{{commit}}", check=False).strip()
    ok(f"G3.2 {cls}: commit {commit} resolves", bool(full))
    for lg in (glg.strip(), clg.strip()):
        if lg.startswith("none"):
            continue
        ok(f"G3.3 {cls}: log {lg} exists", (RUNS / lg).exists())
    gj = gj.strip()
    if gj.startswith("gate-"):
        g = json.loads((RUNS / gj).read_text())
        same = (str(g["cases_before"]) == cb.strip() and str(g["cases_after"]) == ca.strip() and str(g["green_exit_code"]) == green.strip() and f"{g['line_coverage_pct']:.2f}" == cov.strip())
        ok(f"G3.4 {cls}: row equals {gj}", same, f"{g['cases_before']}/{g['cases_after']}/{g['green_exit_code']}/{g['line_coverage_pct']}")
        ok(f"G3.5 {cls}: gate status pass and both exit codes 0", g["status"] == "pass" and g["green_exit_code"] == 0 and g["coverage_exit_code"] == 0)
revert_row = [r for r in rows if r[0] == "D5 revert"][0]
ok("G3.6 D5 revert row 1414 to 1494, 92.08, f97a72f90", revert_row[2] == "f97a72f90" and revert_row[3].strip() == "1414" and revert_row[4].strip() == "1494" and revert_row[6].strip() == "92.08")
ok("G3.7 f97a72f90 is a revert commit", git("log", "-1", "--format=%s", "f97a72f90").startswith("revert(test)"))

# Spec (b): every gate and every later run keeps coverage above the floor
print("== G3b criterion (b) and (c) over every gate JSON and late logs")
floor = round(base_cov - 1.0, 2)
bad = []
n_gates = 0
for gp in sorted(RUNS.glob("gate-*.json")):
    g = json.loads(gp.read_text())
    n_gates += 1
    if g.get("status") != "pass" or g.get("green_exit_code") != 0 or g.get("coverage_exit_code") != 0 or g.get("line_coverage_pct", 0) < floor:
        bad.append(gp.name)
ok("G3b.1 every gate JSON passes with coverage at or above the floor 85.52", bad == [] and n_gates > 0, f"gates={n_gates} bad={bad}")
for name in ("coverage-at-ca91946b.log", "coverage-at-f97a72f9.log", "coverage-257a6b0c.log"):
    v = float(re.search(r"Lines\s*:\s*([\d.]+)%", (RUNS / name).read_text()).group(1))
    ok(f"G3b.2 {name} lines {v} at or above 85.52", v >= floor)
for name, n in (("green-at-ca91946b.log", 1414), ("green-merge-e836e7289.log", 1413)):
    t = (RUNS / name).read_text()
    m = re.search(r"Tests\s+(\d+) passed \(\1\)", t)
    ok(f"G3b.3 {name} passes {n} tests", bool(m) and int(m.group(1)) == n and "failed" not in re.search(r"Tests .*", t).group(0))

# ---------------------------------------------------------------- G4 K rows
print("== G4 K rows, report against classification")
cls_text = (TDIR / "classification.md").read_text()


def section(text, head):
    m = re.search(rf"^## {re.escape(head)}.*?\n(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


krows = re.findall(r"^\| (src/[^|]+?|scripts/[^|]+?) \| [^|]* \| (\d+) \| [^|]* \| [^|]* \|$", section(cls_text, "K rows"), re.M)
ok("G4.1 77 K file rows in classification.md", len(krows) == 77, str(len(krows)))
ok("G4.2 K rows sum to 2843", sum(int(n) for _, n in krows) == 2843, str(sum(int(n) for _, n in krows)))
rep_k = re.findall(r"^\| (src/[^|]+?) \| (\d+) \| ([^|]*) \| ([^|]*) \|$", section(report, "4. K rows kept"), re.M)
ok("G4.3 report K table holds 77 rows", len(rep_k) == 77, str(len(rep_k)))
ok("G4.4 report K table equals classification K rows (path, count, order)", [(a.strip(), b) for a, b, *_ in rep_k] == [(a.strip(), b) for a, b in krows])
d5_rows = re.findall(r"^\| (src/[^|]+?) \| [^|]* \| (\d+) \|", section(cls_text, "D5 rows"), re.M)
d5_sum = sum(int(n) for _, n in d5_rows)
ok("G4.5 D5 rows sum to 221 (reverted, effective K)", d5_sum == 221, str(d5_sum))
summ = section(cls_text, "Summary")
ok("G4.6 Summary K 3064 (96.5 %) and class sum check 3175", "| K keep | 3064 | 96.5 %" in summ and "3064 + 67 + 22 + 0 + 6 + 0 + 16 = 3175" in summ)
ok("G4.7 2843 + 221 = 3064 and 3064/3175 = 96.5 %", 2843 + d5_sum == 3064 and round(3064 / 3175 * 100, 1) == 96.5)
ok("G4.8 classes sum to the baseline", 3064 + 67 + 22 + 0 + 6 + 0 + 16 == base_cases)
for path, _ in krows:
    pass
missing = [p for p, _ in krows if not (REPO / "apps/www-reading-advantage" / p).exists() and not p.startswith("scripts/")]
ok("G4.9 every K file exists at HEAD", missing == [], str(missing))
missing_d5 = [p for p, _ in d5_rows if not (REPO / "apps/www-reading-advantage" / p).exists()]
ok("G4.10 every reverted D5 file exists at HEAD", missing_d5 == [], str(missing_d5))
# cited proof logs exist
cited = set(re.findall(r"(proof-[A-Za-z0-9._-]+\.log)", section(report, "4. K rows kept")))
ok("G4.11 every proof log cited in the K section exists", all((RUNS / c).exists() for c in cited), f"{len(cited)} cited")

tc = [p for p, _ in krows if "tutor-commission" in p]
ok("G4.12 seven tutor-commission K files", len(tc) == 7, str(len(tc)))
diff_tc = git("diff", P1_END, HEAD, "--", *[f"apps/www-reading-advantage/{p}" for p in tc])
ok("G4.13 tutor-commission files unchanged from a1caa5803 to HEAD", diff_tc == "")

# K title-level deletion check, a1caa5803 against HEAD
TITLE = re.compile(r"""\b(?:it|test)(?:\.each\([^)]*\))?(?:\.skipIf\([^)]*\))?\(\s*(['"`])(.*?)\1""")


def titles(rev, path):
    p = subprocess.run(["git", "-C", str(REPO), "show", f"{rev}:apps/www-reading-advantage/{path}"], capture_output=True, text=True)
    if p.returncode != 0:
        return None
    return sorted(m.group(2) for m in TITLE.finditer(p.stdout))


lost = {}
changed_k = 0
for path, _ in krows + [(p, 0) for p, _ in d5_rows]:
    if path.startswith("scripts/"):
        continue
    a, b = titles(P1_END, path), titles("HEAD", path)
    if a is None:
        continue
    if b is None:
        lost[path] = ["<file deleted>"]
        continue
    if a != b:
        changed_k += 1
    rem = list(b)
    miss = []
    for t in a:
        if t in rem:
            rem.remove(t)
        else:
            miss.append(t)
    if miss:
        lost[path] = miss
info(f"K and reverted-D5 files whose static titles differ from a1caa5803: {changed_k}")
for k, v in lost.items():
    info(f"static titles present at a1caa5803 and absent at HEAD: {k}: {len(v)} e.g. {v[:2]}")
APPROVED = {
    "src/lib/blog-posts-validation.test.ts": "PM-approved blog merge (task 3.5)",
    "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx": "scanner control renamed to a stricter control",
}


def d_row_cases(path):
    """Cases the classification assigns to D1, D2, D4 or D5 rows for this file."""
    n = 0
    for head in ("D1 rows", "D2 rows", "D4 rows", "D5 rows"):
        for p, cnt in re.findall(r"^\| (src/[^|]+?) \| [^|]* \| (\d+) \|", section(cls_text, head), re.M):
            if p.strip() == path:
                n += int(cnt)
    return n


over = []
for k, v in lost.items():
    if k in APPROVED:
        info(f"approved loss: {k}: {APPROVED[k]}")
        continue
    cap = d_row_cases(k)
    if len(v) > cap:
        over.append((k, len(v), cap))
ok("G4.14 every lost static title is covered by D-class case counts of its own file (no K title lost)", over == [], str(over))
st = titles("HEAD", "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx")
ok("G4.14b the stricter Storytime scanner control exists at HEAD", "control: the claims scanner clears the approved public date and the approved school year" in st)
ok("G4.14c K lower bound: 1494 >= 3064 - 1709 + 60 + 16 (K minus blog merge, D1 rewrites, R2 rewrites)", final_cases >= 3064 - 1709 + 60 + 16, f"{final_cases} >= {3064 - 1709 + 60 + 16}")
deleted_all = git("diff", "--diff-filter=D", "--name-only", TRACK_BASE, HEAD, "--", "apps").splitlines()
rel_deleted = [d.replace(WWW, "") for d in deleted_all]
d_files = sections_d = set()
d_set = set()
for head in ("D1 rows", "D2 rows"):
    d_set |= {p.strip() for p, _ in re.findall(r"^\| (src/[^|]+?) \| [^|]* \| (\d+) \|", section(cls_text, head), re.M)}
ok("G4.15 every deleted file is a D1 or D2 row file", all(d in d_set for d in rel_deleted), str(rel_deleted))
ok("G4.16 no deleted file is a K row file", not any(d in {p for p, _ in krows} for d in rel_deleted), str(rel_deleted))
info(f"files deleted since the track base: {rel_deleted}")
ok("G4.17 the two deleted files hold no K row", all(not any(p.strip() == d for p, _ in krows) for d in rel_deleted))

# ---------------------------------------------------------------- G5 production code
print("== G5 no production code changed")
names = git("diff", "--name-only", TRACK_BASE, HEAD, "--", ".", ":(exclude)measure/**").splitlines()
nontest = [n for n in names if not is_test_path(n)]
info(f"non-measure paths changed since 635a604c89: {len(names)}; non-test: {len(nontest)}")
for n in nontest:
    info(f"  non-test path: {n}")
vs_master = git("diff", "--name-only", MASTER, HEAD, "--", ".", ":(exclude)measure/**").splitlines()
ok("G5.1 HEAD differs from master tip 968bde612 only in test and fixture paths", all(is_test_path(n) for n in vs_master) and len(vs_master) > 0, f"{len(vs_master)} paths")
ok("G5.2 the non-test paths equal master content (no production edit by the track)", all(git("diff", MASTER, HEAD, "--", n) == "" for n in nontest))
ok("G5.3 635a604c89 is an ancestor of master 968bde612", subprocess.run(["git", "-C", str(REPO), "merge-base", "--is-ancestor", TRACK_BASE, MASTER]).returncode == 0)
track_only = git("rev-list", "--no-merges", f"{TRACK_BASE}..{HEAD}", f"^{MASTER}").split()
bad_commits = []
for c in track_only:
    for n in git("show", "--name-only", "--format=", c, "--", ".", ":(exclude)measure/**").splitlines():
        if n and not is_test_path(n):
            bad_commits.append((c[:9], n))
ok("G5.4 no track-only non-merge commit touches a non-test path outside measure/", bad_commits == [], str(bad_commits))
info(f"track-only non-merge commits: {len(track_only)}")
merge_cc = git("show", "--cc", "--name-only", "--format=", "6ee56327b").splitlines()
ok("G5.5 master merge 6ee56327b resolves only test and fixture paths by hand", all(is_test_path(n) for n in merge_cc if n), str(merge_cc))
ok("G5.6 git diff --check over the Phase 4 range", subprocess.run(["git", "-C", str(REPO), "diff", "--check", f"{PHASE_BASE}..{HEAD}"]).returncode == 0)
p4_paths = git("diff", "--name-only", f"{PHASE_BASE}..{HEAD}", "--", ".", ":(exclude)measure/runs/**").splitlines()
info(f"Phase 4 range paths outside measure/runs: {len(p4_paths)}")
p4_nontest = [n for n in p4_paths if not is_test_path(n)]
for n in p4_nontest:
    info(f"  Phase 4 non-test path: {n}")
from_master = [n for n in p4_nontest if git("diff", MASTER, HEAD, "--", n) == "" and not n.startswith(f"measure/tracks/{TRACK}/") and n != "measure/tech-debt.md"]
info(f"Phase 4 non-test paths equal to master tip content (master merge): {len(from_master)}")
ok("G5.7 Phase 4 range non-test paths are the track plan, report, classification, tech-debt, or equal master content", all(n.startswith(f"measure/tracks/{TRACK}/") or n == "measure/tech-debt.md" or n in from_master for n in p4_nontest), str([n for n in p4_nontest if n not in from_master and not n.startswith(f'measure/tracks/{TRACK}/') and n != 'measure/tech-debt.md']))
ok("G5.7b only three track documents plus tech-debt.md differ from master outside tests", sorted(n for n in p4_nontest if n not in from_master) == sorted([f"measure/tracks/{TRACK}/classification.md", f"measure/tracks/{TRACK}/plan.md", f"measure/tracks/{TRACK}/report.md", "measure/tech-debt.md"]))
ok("G5.8 Phase 4 range does not touch measure/tracks.md, scripts, or contract tests", not any(n in ("measure/tracks.md",) or n.startswith("scripts/") or n.startswith("measure/tests") for n in p4_paths))

# ---------------------------------------------------------------- G6 one commit per class
print("== G6 one commit per class")
cls_commits = {
    "D1": ["0be4a0374"],
    "D2": ["e332f594e"],
    "D4": ["0d705612d"],
    "D5": ["ee5c7b739", "7008ccefd", "c577cdf18", "407c5d9bd"],
    "R2": ["adf24e723"],
    "Blog merge": ["257a6b0cd"],
    "D5 revert": ["f97a72f90"],
}
sections = {c: {p for p, _ in re.findall(r"^\| (src/[^|]+?) \| [^|]* \| (\d+) \|", section(cls_text, h), re.M)} for c, h in (("D1", "D1 rows"), ("D2", "D2 rows"), ("D4", "D4 rows"), ("D5", "D5 rows"), ("R2", "R2 rows"))}
for c, shas in cls_commits.items():
    for s in shas:
        files = [f for f in git("show", "--name-only", "--format=", s).splitlines() if f]
        nonapps = [f for f in files if not f.startswith(WWW)]
        sub = git("log", "-1", "--format=%s", s).strip()
        tag = c.split()[0]
        info(f"{c} {s}: {len(files)} files; subject: {sub[:90]}")
        ok(f"G6.1 {c} {s}: only www test paths", nonapps == [] and all(is_test_path(f) for f in files), str(nonapps))
        if c in sections:
            rel = {f.replace(WWW, "") for f in files}
            extra = sorted(r for r in rel if r not in sections[c] and "fixtures/" not in r)
            info(f"{c} {s}: files not in that class's rows: {extra}")
# D5 revert: 12 files, all D5 files
rev_files = {f.replace(WWW, "") for f in git("show", "--name-only", "--format=", "f97a72f90").splitlines() if f}
ok("G6.2 D5 revert changes 12 files", len(rev_files) == 12, str(len(rev_files)))
d5_all = set()
for s in cls_commits["D5"]:
    d5_all |= {f.replace(WWW, "") for f in git("show", "--name-only", "--format=", s).splitlines() if f}
ok("G6.3 every file of the D5 revert was changed by a D5 part commit", rev_files <= d5_all, str(sorted(rev_files - d5_all)))
pre_d5 = git("rev-parse", "ee5c7b739^").strip()
same, differ = [], []
for f in sorted(rev_files):
    a = subprocess.run(["git", "-C", str(REPO), "show", f"{pre_d5}:{WWW}{f}"], capture_output=True, text=True).stdout
    b = subprocess.run(["git", "-C", str(REPO), "show", f"HEAD:{WWW}{f}"], capture_output=True, text=True).stdout
    (same if a == b else differ).append(f)
info(f"revert files byte-identical to the pre-D5 tree {pre_d5[:9]}: {len(same)}; differ: {len(differ)}")
for f in differ:
    info(f"  differs from pre-D5: {f}")
ok("G6.4 8 of 12 revert files equal the pre-D5 tree", len(same) == 8)
# the four that differ carry only named non-D5 commits
named = {"4d1688131", "fb5622ed7", "6ee56327b", "9eb3b9c4f", "4d168813"}
for f in differ:
    later = git("log", "--format=%h %s", f"{pre_d5}..HEAD", "--", WWW + f).splitlines()
    nonrev = [l for l in later if not l.startswith("f97a72f9") and not re.match(r"(ee5c7b7|7008cce|c577cdf|407c5d9)", l)]
    info(f"  {f}: later commits besides the D5 parts and revert: {[l[:70] for l in nonrev]}")
ok("G6.5 D5 gone from effective code: no D5 helper imported by a revert file", all("locale-key-check" not in subprocess.run(["git", "-C", str(REPO), "show", f"HEAD:{WWW}{f}"], capture_output=True, text=True).stdout for f in rev_files))

# ---------------------------------------------------------------- G7 late findings and tech-debt
print("== G7 late findings and tech-debt")
late = re.findall(r"^- Late finding ([A-Za-z0-9-]+): (tech-debt|one-fix-round) \((.+)\)$", p4, re.M)
ids = [l[0] for l in late]
want = ["L1", "ADV-26", "ADV-27", "ADV-28", "ADV-29", "ADV-30", "ADV-31", "ADV-32", "ADV-P1-9", "N8"]
ok("G7.1 ten late-finding lines in the contract form", ids == want, str(ids))
ok("G7.2 every late-finding line sits under the Phase 4 heading (before task 4.1)", p4.index("- Late finding L1") < p4.index("- [x] 4.1 "))
ok("G7.3 no late-finding line is outside the contract form", len(re.findall(r"^- Late finding", plan, re.M)) == 10)
td = (REPO / "measure/tech-debt.md").read_text()
td_lines = td.count("\n") + (0 if td.endswith("\n") else 1)
ok("G7.4 tech-debt.md holds 50 lines", td_lines == 50, str(td_lines))
row = [l for l in td.splitlines() if TRACK in l]
ok("G7.5 one tech-debt row for the track", len(row) == 1)
for i in want:
    ok(f"G7.6 tech-debt row names {i}", f"[{i}]" in row[0], "")
ok("G7.7 the row is Open, Low", "| Low | Open |" in row[0])
rv = {ln for ln in git("diff", "--name-only", f"{PHASE_BASE}..{HEAD}", "--", "measure/tech-debt.md").splitlines()}
info(f"tech-debt.md changed in Phase 4 range: {sorted(rv)}")

# ---------------------------------------------------------------- G8 A5 claims in the plan
print("== G8 A5 plan claims against logs")
ok("G8.1 task 4.2 before 90.47s in baseline.log", "Duration  90.47s" in (RUNS / "baseline.log").read_text())
ok("G8.2 task 4.2 after 98.11s in green-66aeb1011.log", "Duration  98.11s" in (RUNS / "green-66aeb1011.log").read_text())
ok("G8.3 task 4.3 pre-merge cut 1763 = 3175 - 1412 (55.5 %)", 3175 - 1412 == 1763 and round(1763 / 3175 * 100, 1) == 55.5)
ok("G8.4 task 4.17 cut 1761 = 3175 - 1414 (55.5 %)", 3175 - 1414 == 1761 and round(1761 / 3175 * 100, 1) == 55.5)
ok("G8.5 task 4.18 cut 1681 = 3175 - 1494 (52.9 %)", 3175 - 1494 == 1681)
ok("G8.6 task 4.13 and 4.15 1413 tests (green-merge-e836e7289.log)", re.search(r"Tests\s+1413 passed \(1413\)", (RUNS / "green-merge-e836e7289.log").read_text()) is not None)
ok("G8.7 plan 4.18 states one lint warning and 1494 tests", "1494 tests in 98 files" in plan and "lint exited 0\n  with one pre-existing warning" in plan or "with one pre-existing warning" in plan)
ok("G8.8 plan has no 'all checks pass' or 'PASS=' claim", re.search(r"all checks pass|PASS=\d|FAIL=0", plan) is None)
ok("G8.9 plan 4.3 labels the pre-merge cut", "pre-merge raw case cut is 1763 cases" in plan)

# ---------------------------------------------------------------- G9 prerequisites and the path rule
print("== G9 prerequisites and the path rule")


def result(name):
    return json.loads((RUNS / name).read_text())


ra = result("review-a-2bfbd37.json")
ok("G9.1 Review A targets HEAD and passes", ra["audited_head_sha"] == HEAD and ra["status"] == "pass" and ra["blocking_findings"] == [])
a1 = result("adversarial-p1-7336f42.json")
ok("G9.2 Phase 1 adversarial passes at 7336f42b3", a1["audited_head_sha"] == ADV_P1 and a1["status"] == "pass" and a1["blocking_findings"] == [])
p1a = result("phase-acceptance-p1-2bfbd37.json")
ok("G9.3 Phase 1 acceptance targets HEAD and passes", p1a["audited_head_sha"] == HEAD and p1a["status"] == "pass")
tree_adv = git("rev-parse", f"{ADV_P1}:apps").strip()
tree_head = git("rev-parse", "HEAD:apps").strip()
ok("G9.4 the apps tree at HEAD equals the apps tree at 7336f42b3 (the adversarial head)", tree_adv == tree_head, f"{tree_adv[:9]} {tree_head[:9]}")
delta = git("diff", "--name-only", ADV_P1, HEAD).splitlines()
ok("G9.5 7336f42b3 to HEAD changes only classification.md, plan.md and report.md", sorted(delta) == sorted(f"measure/tracks/{TRACK}/{n}" for n in ("classification.md", "plan.md", "report.md")), str(delta))
dc = git("diff", "--name-only", "dc9d39dac", HEAD, "--", "apps").splitlines()
ok("G9.6 dc9d39dac to HEAD changes 12 test files under apps (the D5 revert) and nothing else under apps", len(dc) == 12 and all(is_test_path(p) for p in dc), str(len(dc)))
ok("G9.7 the pre-revert adversarial result is dc9d39dac, before f97a72f90", result("adversarial-dc9d39d.json")["audited_head_sha"].startswith("dc9d39dac"))
strategy = (TDIR / "test-strategy.md").read_text()
ok("G9.8 test-strategy.md requires Review A only for Phase 4 (no adversarial, no browser)", "| P4 Pilot report | medium | yes, artifact only | no | no | no | no | no |" in strategy and "No browser review and no adversarial pass." in strategy)
ok("G9.9 Review A result artifacts for Phase 4 and Phase 1 acceptance exist at HEAD", (RUNS / "review-a-2bfbd37.log").exists() and (RUNS / "phase-acceptance-p1-2bfbd37.log").exists())

# ---------------------------------------------------------------- G10 carried items still in report.md
print("== G10 carried nits and open record items")
ok("G10.1 F52 still open: D3 bullet says 'No commit and no gate'", "**D3 dead target**, zero rows. No commit and no gate." in report)
ok("G10.2 F53 still open: 'the phase-base test' without a SHA", "restore parity with the phase-base test" in report)
ok("G10.3 F54 still open: runner citation names gate-66aeb1011.json green command for the wait variable", "(`baseline.log`; `gate-66aeb1011.json`, green command)" in report)
ok("G10.4 F55 fixed: D5 bullet no longer says final count 3035", "The final case count is 3035" not in report and "The case count after that step is 3035 cases" in report)
ok("G10.5 Review A N14 still open: stale 'second lever' sentence in classification.md", "The second lever is the primary-advantage content pin set (102 D5 cases); its replacement design decides the final count." in " ".join(cls_text.split()))
ok("G10.6 Review A N13 wording present in report.md", "Without the blog merge, the suite holds 3203 cases" in report)
posts = sum(1 for l in ("en", "th") for _ in [0] for n in git("ls-tree", "--name-only", "HEAD", f"apps/www-reading-advantage/src/app/[locale]/(marketing)/blog/posts/{l}/").splitlines() if n.endswith(".md"))
ok("G10.7 N13 arithmetic: 121 posts at HEAD, unmerged file would hold 14*121+2+59 = 1755, suite about 3232", posts == 121 and 14 * 121 + 2 + 59 == 1755 and final_cases - 17 + 1755 == 3232, f"posts={posts}")
ok("G10.8 plan rule 9 and 10 text is present (plan quotes counts anyway, carried nit)", "9. This plan holds no baseline number." in plan)
ok("G10.9 plan 4.18 says ADV-P1-10 fixed the projection note", "ADV-P1-10" in plan.split("4.18", 1)[1])
ok("G10.10 plan 4.15 names no gate log path (A5 path rule, carried nit)", "green-" not in plan.split("- [x] 4.15", 1)[1].split("- [x] 4.16", 1)[0])
ok("G10.11 plan 4.13 and 4.18 name no lint or check-types log path", "lint-" not in plan.split("- [x] 4.13", 1)[1].split("- [x] 4.14", 1)[0])

# ---------------------------------------------------------------- G11 applicability of A3, A4, A6, A7
print("== G11 framework surface changed in the Phase 4 range")
fw = [n for n in git("diff", "--name-only", f"{PHASE_BASE}..{HEAD}").splitlines() if n.startswith(("scripts/", "measure/doctor", "measure/generate", "measure/tests", ".husky", "measure/tracks.md")) or n.endswith(("guard.ts", "contract.test.ts"))]
ok("G11.1 no contract test, filter, or tracks registry path changed (A3, A4, A6, A7 not applicable)", fw == [], str(fw))
ok("G11.2 measure/tracks.md untouched in the Phase 4 range", git("diff", "--name-only", f"{PHASE_BASE}..{HEAD}", "--", "measure/tracks.md") == "")
trk = [l for l in (REPO / "measure/tracks.md").read_text().splitlines() if TRACK in l]
info(f"tracks.md lines naming the track: {len(trk)}")
for l in trk:
    info("  " + l[:300])

# ---------------------------------------------------------------- G12 fix-commit table, hash and archive scans
print("== G12 fix table, A9 and A15 scans, commit subjects")
fix_rows = re.findall(r"^\| ([0-9a-f]{7,9}) \| (green-[^|]+?\.log) \| (coverage-[^|]+?\.log) \|$", sec2, re.M)
ok("G12.1 23 fix-commit rows in report.md section 2", len(fix_rows) == 23, str(len(fix_rows)))
fix_bad = []
for sha, g, c in fix_rows:
    if git("rev-parse", "--verify", f"{sha}^{{commit}}", check=False).strip() == "":
        fix_bad.append(("sha", sha))
    for lg, pat in ((g, r"Tests\s+\d+ passed \(\d+\)"), (c, r"Coverage summary")):
        p = RUNS / lg
        if not p.exists():
            fix_bad.append(("missing", lg))
        elif re.search(pat, p.read_text()) is None:
            fix_bad.append(("no-summary", lg))
ok("G12.2 every fix SHA resolves and every named log exists with its summary line", fix_bad == [], str(fix_bad))
added = "\n".join(l for l in git("diff", f"{PHASE_BASE}..{HEAD}", "--", f"measure/tracks/{TRACK}", "measure/tech-debt.md").splitlines() if l.startswith("+") and not l.startswith("+++"))
ok("G12.3 A15: no sha256, checksum or md5 field added in Phase 4 documents", re.search(r"sha-?256|checksum|\bmd5\b", added, re.I) is None)
ok("G12.4 A9: no row cites measure/archive for this track", "measure/archive/" not in report + plan + cls_text)
subjects = {}
for c in track_only:
    subjects[c] = git("log", "-1", "--format=%s", c).strip()
no_tid = [c[:9] for c, s in subjects.items() if f"track_id: {TRACK}" not in s]
ok("G12.5 every track-only commit subject names the track id", no_tid == [], str(no_tid[:5]))
ok("G12.6 no commit message mentions push or force", not any(re.search(r"\b(force|--no-verify)\b", git("log", "-1", "--format=%B", c)) for c in track_only))

print()
print(f"SUMMARY pass={passes} fail={len(fails)}")
for f in fails:
    print("FAILED:", f)
