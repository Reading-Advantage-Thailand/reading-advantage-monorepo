"""Read-only probes for the Phase 1 acceptance of www_test_audit_pilot_20261122.

Run: python3 -I measure/runs/www_test_audit_pilot_20261122/phase-acceptance-p1-51252ca-probes.py
Each probe prints labeled values. No file is written. No test suite runs.
"""
import json
import os
import re
import subprocess
import sys

ROOT = "/home/daniebo/Desktop/rama-worktrees/www-test-audit"
RUNS = os.path.join(ROOT, "measure/runs/www_test_audit_pilot_20261122")
CLS = os.path.join(ROOT, "measure/tracks/www_test_audit_pilot_20261122/classification.md")
PLAN = os.path.join(ROOT, "measure/tracks/www_test_audit_pilot_20261122/plan.md")
APP = "apps/www-reading-advantage"

P1_END = "a1caa58034f6455e91205a5673ef172a974a7992"
PHASE_BASE = "cbd023b1bd29333992f7511646cff1245191b049"
TRACK_BASE = "635a604c89b2c909cfce33f555b7f043d4ea520f"
HEAD = "51252ca9e09bd458052894304aaa7680b1daabc2"

failures = []


def git(*args):
    r = subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True)
    return r.returncode, r.stdout, r.stderr


def check(label, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'} {label} {detail}".rstrip())
    if not ok:
        failures.append(label)


# ---- P0: heads and ancestry
rc, out, _ = git("rev-parse", "HEAD")
check("P0 head_is_audited_head", out.strip() == HEAD, f"head={out.strip()}")
rc, out, _ = git("status", "--short")
check("P0 tree_clean_before_write", out.strip() == "" or out.strip().startswith("??"), f"status_lines={len(out.splitlines())}")
for name, sha in (("phase_base", PHASE_BASE), ("p1_end", P1_END), ("track_base", TRACK_BASE)):
    rc, _, _ = git("merge-base", "--is-ancestor", sha, HEAD)
    check(f"P0 {name}_ancestor_of_head", rc == 0, f"sha={sha[:9]}")
rc, _, _ = git("merge-base", "--is-ancestor", PHASE_BASE, P1_END)
check("P0 phase_base_ancestor_of_p1_end", rc == 0)

# ---- P1: Phase 1 diff touches no apps path; names exact set
rc, out, _ = git("diff", "--name-status", PHASE_BASE, P1_END)
names = [l.split("\t", 1)[1] for l in out.splitlines()]
check("P1 phase_diff_paths", sorted(names) == [
    "measure/tracks/www_test_audit_pilot_20261122/classification.md",
    "measure/tracks/www_test_audit_pilot_20261122/plan.md"], f"paths={names}")
for base_name, base in (("phase_base", PHASE_BASE), ("track_base", TRACK_BASE)):
    rc, out, _ = git("diff", "--name-only", base, P1_END, "--", "apps")
    check(f"P1 apps_diff_empty_from_{base_name}", rc == 0 and out.strip() == "", f"apps_paths={len(out.splitlines())}")
rc, out, _ = git("diff", "--name-only", TRACK_BASE, P1_END)
non_measure = [p for p in out.splitlines() if not p.startswith("measure/")]
check("P1 no_non_measure_path_track_base_to_p1_end", non_measure == [], f"non_measure_paths={len(non_measure)}")
# which framework surfaces did Phase 1 change? (A3/A4/A6/A7 applicability)
rc, out, _ = git("diff", "--name-only", PHASE_BASE, P1_END)
fw = [p for p in out.splitlines() if p.startswith("measure/tracks.md") or "/tests/" in p or p.endswith(".sh") or "contract" in p]
print(f"INFO P1 framework_surface_paths_in_phase_diff={len(fw)}")

# ---- P2: plan tasks 1.1-1.4: markers and SHAs
plan = open(PLAN, encoding="utf-8").read().splitlines()
phase1 = []
inside = False
for l in plan:
    if l.startswith("## Phase 1"):
        inside = True
        continue
    if inside and l.startswith("## "):
        break
    if inside:
        phase1.append(l)
tasks = [l for l in phase1 if re.match(r"- \[.\] 1\.\d", l)]
print(f"INFO P2 phase1_task_lines={len(tasks)}")
for l in tasks:
    marker = re.match(r"- \[(.)\]", l).group(1)
    check(f"P2 marker_x {l[:20]}", marker == "x", f"marker={marker}")
text_p1 = "\n".join(phase1)
for sha in sorted(set(re.findall(r"\b[0-9a-f]{40}\b", text_p1))):
    rc, _, _ = git("cat-file", "-e", sha + "^{commit}")
    check(f"P2 full_sha_resolves {sha[:9]}", rc == 0)
for sha in sorted(set(re.findall(r"\(([0-9a-f]{9})\)", text_p1))):
    rc, out, _ = git("rev-parse", "--verify", sha + "^{commit}")
    check(f"P2 task_short_sha_resolves {sha}", rc == 0, f"full={out.strip()[:12]}")
# every full sha in plan equals the expansion of its short sha
pairs = re.findall(r"Commit: ([0-9a-f]{40})", text_p1)
for full in pairs:
    rc, out, _ = git("log", "-1", "--format=%s", full)
    print(f"INFO P2 commit_subject {full[:9]} {out.strip()}")
# task 1.4 commit is the Phase 1 end
check("P2 task_1_4_commit_is_p1_end", P1_END in text_p1)

# ---- P3: classification.md parse
md = open(CLS, encoding="utf-8").read().splitlines()
sections = []
rows = {}
cur = None
for l in md:
    m = re.match(r"## (.+)", l)
    if m:
        cur = m.group(1)
        sections.append(cur)
        rows[cur] = []
        continue
    if cur and l.startswith("| src/") or (cur and l.startswith("| e2e/")) or (cur and l.startswith("| scripts/")):
        cells = [c.strip() for c in l.strip().strip("|").split("|")]
        rows[cur].append(cells)
print("INFO P3 sections=" + " | ".join(sections))
first_data = [s for s in sections if s not in ("Rubric notes (r2)", "Counting rule")]
check("P3 k_rows_first", first_data[0].startswith("K rows"), f"first={first_data[0]}")


def n_of(cells, idx):
    try:
        return int(cells[idx])
    except ValueError:
        return None


class_key = {
    "K": "K rows (keep)",
    "D1": "D1 rows (source-text test: delete, or replace with a behavior test)",
    "D2": "D2 rows (duplicate: delete; kept duplicate named)",
    "D4": "D4 rows (weak check: delete, or merge)",
    "D5": "D5 rows (copy pin on a marketing line: replace with a locale-key check)",
    "R2": "R2 rows (brittle: rewrite with fixed clocks and role-based selectors)",
    "NC": "Not counted",
}
class_sum = {}
per_file = {}
file_classes = {}
bad_n = []
for k, sec in class_key.items():
    total = 0
    for cells in rows.get(sec, []):
        n = n_of(cells, 2)
        if n is None:
            bad_n.append((sec, cells[0]))
            continue
        f = cells[0]
        file_classes.setdefault(f, set()).add(k)
        if k != "NC":
            total += n
            per_file[f] = per_file.get(f, 0) + n
    class_sum[k] = total
print("INFO P3 class_sum=" + json.dumps(class_sum, sort_keys=True))
check("P3 all_rows_have_integer_n", not bad_n, f"bad={bad_n}")
vitest_total = sum(v for k, v in class_sum.items() if k != "NC")

# summary table in the file
summ = {}
for l in md:
    m = re.match(r"\| (K keep|D1 source-text|D2 duplicate|D3 dead target|D4 weak check|D5 copy pin|R1 over-mocked|R2 brittle|R3 unclear) \| (\d+) \|", l)
    if m:
        summ[m.group(1)] = int(m.group(2))
print("INFO P3 summary_table=" + json.dumps(summ, sort_keys=True))
sm = {"K": summ.get("K keep"), "D1": summ.get("D1 source-text"), "D2": summ.get("D2 duplicate"),
      "D4": summ.get("D4 weak check"), "D5": summ.get("D5 copy pin"), "R2": summ.get("R2 brittle")}
for k, v in sm.items():
    check(f"P3 summary_equals_row_sum {k}", v == class_sum[k], f"summary={v} rows={class_sum[k]}")
check("P3 d3_r1_r3_zero", summ.get("D3 dead target") == 0 and summ.get("R1 over-mocked") == 0 and summ.get("R3 unclear") == 0)

# D1 split delete vs rewrite
d1_del = sum(n_of(c, 2) for c in rows[class_key["D1"]] if c[4] == "delete")
d1_rw = sum(n_of(c, 2) for c in rows[class_key["D1"]] if c[4] == "rewrite")
print(f"INFO P3 d1_delete={d1_del} d1_rewrite={d1_rw}")
check("P3 d1_split_matches_summary", d1_del == 7 and d1_rw == 60)

# ---- P4: baseline.json labeled parse (A3) and equality with classification
bj = json.load(open(os.path.join(RUNS, "baseline.json")))
case_count = bj["case_count"]
print(f"INFO P4 baseline case_count={case_count} line_coverage_pct={bj['line_coverage_pct']} file_count={bj['file_count']} status={bj['status']}")
check("P4 baseline_case_count_integer", isinstance(case_count, int))
check("P4 classification_sum_equals_case_count", vitest_total == case_count, f"rows={vitest_total} case_count={case_count}")
check("P4 baseline_status_pass", bj["status"] == "pass")
bl = open(os.path.join(RUNS, "baseline.log"), encoding="utf-8").read()
m_tests = re.search(r"Tests\s+(\d+) passed \((\d+)\)", bl)
m_files = re.search(r"Test Files\s+(\d+) passed \((\d+)\)", bl)
m_lines = re.search(r"Lines\s+:\s+([\d.]+)%\s+\(\s*(\d+)/(\d+)\s*\)", bl)
check("P4 log_tests_equal_json", m_tests and int(m_tests.group(1)) == case_count == int(m_tests.group(2)), f"log={m_tests.groups() if m_tests else None}")
check("P4 log_files_equal_json", m_files and int(m_files.group(1)) == bj["file_count"], f"log={m_files.groups() if m_files else None}")
check("P4 log_lines_equal_json", m_lines and abs(float(m_lines.group(1)) - bj["line_coverage_pct"]) < 1e-9, f"log={m_lines.groups() if m_lines else None}")
if m_lines:
    cov = int(m_lines.group(2)) / int(m_lines.group(3)) * 100
    check("P4 lines_ratio_matches_pct", abs(cov - bj["line_coverage_pct"]) < 0.01, f"ratio={cov:.3f} covered={m_lines.group(2)} total={m_lines.group(3)}")
check("P4 log_states_exit0_twice", len(re.findall(r"Result: exit 0", bl)) == 2)

# gate chain: the first Phase 2 gate must use the same baseline
g = json.load(open(os.path.join(RUNS, "gate-0be4a037.json")))
print("INFO P4 gate_0be4a037 keys=" + ",".join(sorted(g.keys())))
for k in ("cases_before", "cases_after", "line_coverage_pct", "floor", "green_exit_code", "coverage_exit_code"):
    if k in g:
        print(f"INFO P4 gate_0be4a037 {k}={g[k]}")
if "cases_before" in g:
    check("P4 first_gate_cases_before_equals_baseline", g["cases_before"] == case_count)
if "floor" in g:
    check("P4 first_gate_floor_is_baseline_minus_1", abs(g["floor"] - (bj["line_coverage_pct"] - 1)) < 1e-9, f"floor={g['floor']}")

# case arithmetic: first D1 gate removes exactly the D1 delete count
if "cases_after" in g:
    check("P4 first_gate_cases_after_equals_baseline_minus_d1_delete", g["cases_after"] == case_count - d1_del, f"after={g['cases_after']} expected={case_count - d1_del}")

# ---- P5: every test file is classified (file set at P1 end)
rc, out, _ = git("ls-tree", "-r", "--name-only", P1_END, "--", APP)
tree = [p[len(APP) + 1:] for p in out.splitlines() if re.search(r"\.(test|spec)\.(ts|tsx)$", p)]
vitest_files = sorted(p for p in tree if p.startswith("src/") and re.search(r"\.test\.(ts|tsx)$", p))
e2e_files = sorted(p for p in tree if p.startswith("e2e/"))
other = sorted(p for p in tree if p not in vitest_files and p not in e2e_files)
print(f"INFO P5 tree_test_files={len(tree)} vitest_src={len(vitest_files)} e2e={len(e2e_files)} other={other}")
classified = set(file_classes)
missing = [p for p in vitest_files + e2e_files + other if p not in classified]
extra = sorted(f for f in classified if f not in tree)
check("P5 every_test_file_classified", not missing, f"missing={missing}")
check("P5 no_classified_file_absent_from_tree", not extra, f"extra={extra}")
check("P5 vitest_file_count_equals_baseline_file_count", len(vitest_files) == bj["file_count"], f"tree={len(vitest_files)} baseline={bj['file_count']}")
nc = {c[0]: c for c in rows["Not counted"]}
for p in e2e_files:
    ok = p in nc and "not counted" in nc[p][3].lower()
    check(f"P5 e2e_row_marked_not_counted {p}", ok)
check("P5 i18n_cli_marked_not_counted", "scripts/__tests__/i18n-cli.test.ts" in nc and "not counted" in nc["scripts/__tests__/i18n-cli.test.ts"][3].lower())
# a vitest file with rows in K only or split: list files with several classes
multi = sorted(f for f, c in file_classes.items() if len(c) > 1)
print(f"INFO P5 files_with_more_than_one_class={len(multi)}")

# ---- P6: per-file-counts.md vs classification
pc = {}
for l in open(os.path.join(RUNS, "per-file-counts.md"), encoding="utf-8"):
    m = re.match(r"\| (src/\S.*?) \| (\d+) \| (\d+) \| (yes|no) \|", l)
    if m:
        pc[m.group(1)] = (int(m.group(2)), int(m.group(3)), m.group(4))
print(f"INFO P6 per_file_rows={len(pc)} runner_sum={sum(v[0] for v in pc.values())}")
mism = [(f, per_file.get(f), v) for f, v in pc.items() if per_file.get(f) != v[0] or v[2] != "yes"]
check("P6 per_file_runner_equals_row_sum_all_files", not mism, f"mismatches={mism}")
check("P6 per_file_set_equals_vitest_file_set", sorted(pc) == vitest_files)
check("P6 runner_sum_equals_case_count", sum(v[0] for v in pc.values()) == case_count)

# ---- P7: the second-check chain
chain = [("08bec4c", "fail"), ("1d4ddd2", None), ("d1b9d59", "pass")]
sc = {}
for short, expect in chain:
    d = json.load(open(os.path.join(RUNS, f"second-check-{short}.json")))
    sc[short] = d
    rc, _, _ = git("cat-file", "-e", d["audited_head_sha"] + "^{commit}")
    check(f"P7 second_check_{short}_head_resolves", rc == 0, f"audited={d['audited_head_sha'][:9]} status={d['status']} route={d.get('route')}")
    check(f"P7 second_check_{short}_head_matches_name", d["audited_head_sha"].startswith(short))
    rc, out, _ = git("diff", "--name-only", d["phase_base_sha"], d["audited_head_sha"], "--", "apps")
    check(f"P7 second_check_{short}_apps_diff_empty", out.strip() == "")
    check(f"P7 second_check_{short}_log_exists", os.path.getsize(os.path.join(RUNS, f"second-check-{short}.log")) > 0)
check("P7 final_second_check_pass", sc["d1b9d59"]["status"] == "pass" and not sc["d1b9d59"]["blocking_findings"])
check("P7 final_second_check_is_p1_last_classification_commit", sc["d1b9d59"]["audited_head_sha"].startswith("d1b9d597b"))
rc, out, _ = git("diff", "--name-only", sc["d1b9d59"]["audited_head_sha"], P1_END)
check("P7 only_plan_changed_between_final_second_check_and_p1_end", out.split() == ["measure/tracks/www_test_audit_pilot_20261122/plan.md"], f"paths={out.split()}")
routes = {k: v.get("route") for k, v in sc.items()}
print(f"INFO P7 second_check_routes={routes}")
# stop rule: parse labeled rates
for short in ("08bec4c", "1d4ddd2", "d1b9d59"):
    m = re.match(r"(\d+)/(\d+) \(([\d.]+)%\)", sc[short]["disagreement_rate_rows"])
    num, den, pct = int(m.group(1)), int(m.group(2)), float(m.group(3))
    calc = num / den * 100
    print(f"INFO P7 rate_{short} disagree={num} sampled={den} pct_listed={pct} pct_calc={calc:.2f} stop_rule_gt_15={calc > 15}")
    check(f"P7 rate_{short}_arithmetic", abs(calc - pct) < 0.01)
# sample size vs 10 % of rows. Count rows in classification (table data rows, zero rows excluded)
total_rows = sum(len(v) for k, v in rows.items() if k in class_key.values() and k != "Not counted")
total_rows_with_nc = sum(len(v) for k, v in rows.items() if k in class_key.values())
print(f"INFO P7 classification_data_rows_excl_not_counted={total_rows} incl_not_counted={total_rows_with_nc}")
den_final = int(re.match(r"(\d+)/(\d+)", sc["1d4ddd2"]["disagreement_rate_rows"]).group(2))
check("P7 sample_at_least_10pct_of_rows", den_final * 10 >= total_rows, f"sampled={den_final} rows={total_rows} ten_pct={total_rows / 10:.1f}")

# sampled rows of 1d4ddd2: does each still exist and keep its class at the final classification?
cls_by_file = {f: sorted(c) for f, c in file_classes.items()}
samp = sc["1d4ddd2"]["sampled_rows"]
verdict_counts = {}
for s in samp:
    verdict_counts[s["verdict"]] = verdict_counts.get(s["verdict"], 0) + 1
print(f"INFO P7 sampled_rows_1d4ddd2={len(samp)} verdicts={verdict_counts}")
gone = []
changed_class = []
for s in samp:
    f = s["file"]
    if f not in file_classes:
        gone.append(f)
    elif s["own_class"] not in file_classes[f]:
        changed_class.append((f, s["own_class"], sorted(file_classes[f])))
check("P7 sampled_files_still_classified", not gone, f"gone={gone}")
print(f"INFO P7 sampled_rows_whose_class_changed_after_sample={changed_class}")
dis = [(s["file"], s["own_class"], s["own_action"]) for s in samp if s["verdict"] != "agree"]
print(f"INFO P7 sampled_disagreements={dis}")

# ---- P8: Phase 1 plan text claims (A5) and artifact stability
check("P8 plan_phase1_holds_no_baseline_number", not re.search(r"\b3175\b|\b86\.52\b", text_p1), "scan=3175|86.52 in Phase 1 section")
check("P8 plan_says_both_runner_commands_exit_0", "Both runner commands exited 0" in text_p1)
bl_mtime = os.path.getmtime(os.path.join(RUNS, "baseline.json"))
sc_mtime = os.path.getmtime(os.path.join(RUNS, "second-check-d1b9d59.json"))
print(f"INFO P8 baseline_json_mtime={int(bl_mtime)} second_check_final_mtime={int(sc_mtime)}")
rc, out, _ = git("diff", "--stat", P1_END, HEAD, "--", "measure/tracks/www_test_audit_pilot_20261122/classification.md")
check("P8 classification_identical_p1_end_to_head", out.strip() == "", f"stat={out.strip()}")
rc, out, _ = git("diff", "--stat", "d1b9d597b553f6033ef39029491eb2a13a550337", HEAD, "--", "measure/tracks/www_test_audit_pilot_20261122/classification.md")
check("P8 classification_identical_final_second_check_to_head", out.strip() == "")
check("P8 run_artifacts_gitignored_not_tracked", subprocess.run(["git", "-C", ROOT, "ls-files", "--error-unmatch", "measure/runs/www_test_audit_pilot_20261122/baseline.json"], capture_output=True).returncode != 0)

print()
print(f"SUMMARY failures={len(failures)} {failures}")
sys.exit(1 if failures else 0)
