"""Read-only probes for the Phase 1 acceptance, round 2, of www_test_audit_pilot_20261122.

Run: python3 -I measure/runs/www_test_audit_pilot_20261122/phase-acceptance-p1-2bfbd37-probes.py
Each probe prints labeled values. No file is written. No test suite runs.
Round 1 probes (phase-acceptance-p1-51252ca-probes.py) are reused with the D5 revert sums.
"""
import json
import os
import re
import subprocess
import sys

ROOT = "/home/daniebo/Desktop/rama-worktrees/www-test-audit"
RUNS = os.path.join(ROOT, "measure/runs/www_test_audit_pilot_20261122")
TRACK = "measure/tracks/www_test_audit_pilot_20261122"
CLS = os.path.join(ROOT, TRACK, "classification.md")
PLAN = os.path.join(ROOT, TRACK, "plan.md")
REPORT = os.path.join(ROOT, TRACK, "report.md")
APP = "apps/www-reading-advantage"
CHECKER = os.path.expanduser("~/.agents/skills/measure-orchestrator/scripts/measure_interphase_checks.py")

P1_END = "a1caa58034f6455e91205a5673ef172a974a7992"
PHASE_BASE = "cbd023b1bd29333992f7511646cff1245191b049"
TRACK_BASE = "635a604c89b2c909cfce33f555b7f043d4ea520f"
ROUND1_HEAD = "51252ca9e09bd458052894304aaa7680b1daabc2"
ADV_HEAD = "7336f42b31b2a80eb4ba61a093a84ada9befa866"
HEAD = "2bfbd373fef2fc500798efe721975fa0a345e73f"
REVERT = "f97a72f9066c7f2509ec70045a28734926c878fa"
PRE_D5 = "5a104ba6d"

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
check("P0 tree_clean_before_write", out.strip() == "" or all(l.startswith("??") for l in out.splitlines()), f"status_lines={len(out.splitlines())}")
for name, sha in (("phase_base", PHASE_BASE), ("p1_end", P1_END), ("track_base", TRACK_BASE),
                  ("round1_head", ROUND1_HEAD), ("adversarial_head", ADV_HEAD), ("d5_revert", REVERT)):
    rc, _, _ = git("merge-base", "--is-ancestor", sha, HEAD)
    check(f"P0 {name}_ancestor_of_head", rc == 0, f"sha={sha[:9]}")

# ---- P1: Phase 1 diff (unchanged since round 1)
rc, out, _ = git("diff", "--name-status", PHASE_BASE, P1_END)
names = sorted(l.split("\t", 1)[1] for l in out.splitlines())
check("P1 phase_diff_paths", names == [f"{TRACK}/classification.md", f"{TRACK}/plan.md"], f"paths={names}")
for base_name, base in (("phase_base", PHASE_BASE), ("track_base", TRACK_BASE)):
    rc, out, _ = git("diff", "--name-only", base, P1_END, "--", "apps")
    check(f"P1 apps_diff_empty_from_{base_name}", rc == 0 and out.strip() == "", f"apps_paths={len(out.splitlines())}")
rc, out, _ = git("diff", "--name-only", PHASE_BASE, P1_END)
fw = [p for p in out.splitlines() if p.startswith("measure/tracks.md") or "/tests/" in p or p.endswith(".sh") or "contract" in p]
print(f"INFO P1 framework_surface_paths_in_phase_diff={len(fw)}")
# seven tutor-commission files: no change from Phase 1 end to HEAD
tc = []
rc, out, _ = git("ls-tree", "-r", "--name-only", P1_END, "--", APP)
for p in out.splitlines():
    if re.search(r"tutor-commission[^/]*\.test\.(ts|tsx)$", p):
        tc.append(p)
check("P1 tutor_commission_file_count_is_7", len(tc) == 7, f"count={len(tc)}")
rc, out, _ = git("diff", "--name-only", P1_END, "HEAD", "--", *tc)
check("P1 tutor_commission_files_unchanged_p1_end_to_head", out.strip() == "", f"changed={len(out.splitlines())}")

# ---- P2: plan tasks 1.1-1.4 and SHAs
plan_txt = open(PLAN, encoding="utf-8").read()


def phase1_of(text):
    lines, inside, out = text.splitlines(), False, []
    for l in lines:
        if l.startswith("## Phase 1"):
            inside = True
            continue
        if inside and l.startswith("## "):
            break
        if inside:
            out.append(l)
    return out


p1 = phase1_of(plan_txt)
rc, old_plan, _ = git("show", f"{ROUND1_HEAD}:{TRACK}/plan.md")
check("P2 plan_phase1_section_unchanged_since_round1", p1 == phase1_of(old_plan))
tasks = [l for l in p1 if re.match(r"- \[.\] 1\.\d", l)]
check("P2 four_phase1_tasks", len(tasks) == 4, f"tasks={len(tasks)}")
for l in tasks:
    marker = re.match(r"- \[(.)\]", l).group(1)
    check(f"P2 marker_x {l[:20]}", marker == "x", f"marker={marker}")
    check(f"P2 task_has_short_sha {l[:20]}", bool(re.search(r"\(([0-9a-f]{9})\)", l)))
text_p1 = "\n".join(p1)
for sha in sorted(set(re.findall(r"\b[0-9a-f]{40}\b", text_p1))):
    rc, _, _ = git("cat-file", "-e", sha + "^{commit}")
    check(f"P2 full_sha_resolves {sha[:9]}", rc == 0)
for sha in sorted(set(re.findall(r"\(([0-9a-f]{9})\)", text_p1))):
    rc, out, _ = git("rev-parse", "--verify", sha + "^{commit}")
    check(f"P2 short_sha_resolves {sha}", rc == 0, f"full={out.strip()[:12]}")
check("P2 phase1_plan_holds_no_baseline_number", not re.search(r"\b3175\b|\b86\.52\b", text_p1))
check("P2 plan_says_both_runner_commands_exit_0", "Both runner commands exited 0" in text_p1)

# ---- P3: classification.md with the D5 revert
md = open(CLS, encoding="utf-8").read().splitlines()
sections, rows, cur = [], {}, None
for l in md:
    m = re.match(r"## (.+)", l)
    if m:
        cur = m.group(1)
        sections.append(cur)
        rows[cur] = []
        continue
    if cur and re.match(r"\| (src|e2e|scripts)/", l):
        rows[cur].append([c.strip() for c in l.strip().strip("|").split("|")])
data_sections = [s for s in sections if s not in ("Rubric notes (r2)", "Counting rule")]
check("P3 k_rows_first", data_sections[0].startswith("K rows"), f"first={data_sections[0]}")
class_key = {
    "K": "K rows (keep)",
    "D1": "D1 rows (source-text test: delete, or replace with a behavior test)",
    "D2": "D2 rows (duplicate: delete; kept duplicate named)",
    "D4": "D4 rows (weak check: delete, or merge)",
    "D5": "D5 rows (copy pin on a marketing line: replace with a locale-key check)",
    "R2": "R2 rows (brittle: rewrite with fixed clocks and role-based selectors)",
    "NC": "Not counted",
}
class_sum, per_file, file_classes = {}, {}, {}
for k, sec in class_key.items():
    total = 0
    for cells in rows.get(sec, []):
        n = int(cells[2])
        file_classes.setdefault(cells[0], set()).add(k)
        if k != "NC":
            total += n
            per_file[cells[0]] = per_file.get(cells[0], 0) + n
    class_sum[k] = total
print("INFO P3 row_sums=" + json.dumps(class_sum, sort_keys=True))
vitest_total = sum(v for k, v in class_sum.items() if k != "NC")
check("P3 d5_section_marked_reverted", any("All D5 rows were reverted to kept status by PM decision on 2026-11-25, option C" in l for l in md))
summ = {}
for l in md:
    m = re.match(r"\| (K keep|D1 source-text|D2 duplicate|D3 dead target|D4 weak check|D5 copy pin|R1 over-mocked|R2 brittle|R3 unclear) \| (\d+) \| ([\d.]+) %", l)
    if m:
        summ[m.group(1)] = (int(m.group(2)), float(m.group(3)))
print("INFO P3 summary=" + json.dumps(summ, sort_keys=True))
check("P3 summary_K_equals_K_rows_plus_reverted_D5_rows", summ["K keep"][0] == class_sum["K"] + class_sum["D5"], f"summary={summ['K keep'][0]} K_rows={class_sum['K']} D5_rows={class_sum['D5']}")
check("P3 summary_D5_is_zero", summ["D5 copy pin"][0] == 0)
for k, name in (("D1", "D1 source-text"), ("D2", "D2 duplicate"), ("D4", "D4 weak check"), ("R2", "R2 brittle")):
    check(f"P3 summary_equals_row_sum {k}", summ[name][0] == class_sum[k], f"summary={summ[name][0]} rows={class_sum[k]}")
check("P3 d3_r1_r3_zero", all(summ[n][0] == 0 for n in ("D3 dead target", "R1 over-mocked", "R3 unclear")))
total = sum(v[0] for v in summ.values())
check("P3 summary_total_3175", total == 3175, f"total={total}")
check("P3 summary_numbers_are_3064_67_22_6_16", [summ["K keep"][0], summ["D1 source-text"][0], summ["D2 duplicate"][0], summ["D4 weak check"][0], summ["R2 brittle"][0]] == [3064, 67, 22, 6, 16])
for name, (n, share) in summ.items():
    check(f"P3 share_matches {name}", abs(n / 3175 * 100 - share) < 0.06, f"n={n} share={share} calc={n / 3175 * 100:.2f}")
check("P3 check_line_present", any("Check: 3064 + 67 + 22 + 0 + 6 + 0 + 16 = 3175." in l for l in md))
d1_del = sum(int(c[2]) for c in rows[class_key["D1"]] if c[4] == "delete")
d1_rw = sum(int(c[2]) for c in rows[class_key["D1"]] if c[4] == "rewrite")
check("P3 d1_split_7_delete_60_rewrite", (d1_del, d1_rw) == (7, 60), f"delete={d1_del} rewrite={d1_rw}")
errata = [l for l in md if l.startswith("Erratum:")]
print(f"INFO P3 erratum_lines={len(errata)}")
check("P3 four_errata_present", len(errata) == 4)
for key in ("explicit-English row was restored in `fb5622ed7`", "Primary \"no old test id\" row was restored in `fb5622ed7`",
            "th and zh cases of the navigation row were restored in `9eb3b9c4f`; the en case stays deleted",
            "live-line en and th pins for `faq.items.5.answer` returned with the D5 revert"):
    check(f"P3 erratum_text {key[:40]}", any(key in l for l in errata))
for sha in ("fb5622ed7", "9eb3b9c4f"):
    rc, _, _ = git("merge-base", "--is-ancestor", sha, HEAD)
    check(f"P3 erratum_sha_ancestor {sha}", rc == 0)
# the sections that the D5 revert did not rewrite are still in place (Phase 1 content)
rc, out1, _ = git("show", f"{P1_END}:{TRACK}/classification.md")
old_rows = [l for l in out1.splitlines() if re.match(r"\| (src|e2e|scripts)/", l)]
new_rows = [l for l in md if re.match(r"\| (src|e2e|scripts)/", l)]
check("P3 row_lines_identical_p1_end_to_head", old_rows == new_rows, f"old={len(old_rows)} new={len(new_rows)}")
rc, out, _ = git("diff", "-U0", P1_END, "HEAD", "--", f"{TRACK}/classification.md")
added = [l for l in out.splitlines() if l.startswith("+") and not l.startswith("+++")]
removed = [l for l in out.splitlines() if l.startswith("-") and not l.startswith("---")]
print(f"INFO P3 lines_added_after_p1_end={len(added)} lines_removed={len(removed)}")
rem_ok = all(re.search(r"K keep|D5 copy pin|Check: 2843|\| D5 rows|^-$|^-\s*$", l) or "Check:" in l or "|" in l for l in removed)
print("INFO P3 removed_lines=" + " || ".join(r[:80] for r in removed))
stale = [l for l in md if "102 D5 cases" in l or "D5 replacements collapse 221" in l]
print(f"INFO P3 stale_d5_sentences_remaining={len(stale)} :: " + " || ".join(s.strip()[:80] for s in stale))
rc, out, _ = git("diff", "-U0", ADV_HEAD, "HEAD", "--", f"{TRACK}/classification.md")
delta_added = [l[1:].strip() for l in out.splitlines() if l.startswith("+") and not l.startswith("+++")]
check("P3 delta_adv_head_to_head_is_two_note_lines", delta_added == ["Note: D5 was reverted on 2026-11-25 by PM option C. This projection counts a", "D5 cut that no longer exists and is superseded."] and not [l for l in out.splitlines() if l.startswith("-") and not l.startswith("---")], f"added={delta_added}")

# ---- P4: baseline.json labeled parse, unchanged
bj = json.load(open(os.path.join(RUNS, "baseline.json")))
case_count = bj["case_count"]
print(f"INFO P4 baseline case_count={case_count} line_coverage_pct={bj['line_coverage_pct']} file_count={bj['file_count']} status={bj['status']}")
check("P4 baseline_values", (case_count, bj["line_coverage_pct"], bj["file_count"], bj["status"]) == (3175, 86.52, 91, "pass"))
check("P4 classification_sum_equals_case_count", vitest_total == case_count, f"rows={vitest_total}")
bl = open(os.path.join(RUNS, "baseline.log"), encoding="utf-8").read()
m_tests = re.search(r"Tests\s+(\d+) passed \((\d+)\)", bl)
m_lines = re.search(r"Lines\s+:\s+([\d.]+)%\s+\(\s*(\d+)/(\d+)\s*\)", bl)
check("P4 log_tests_equal_json", m_tests and int(m_tests.group(1)) == case_count)
check("P4 log_lines_equal_json", m_lines and abs(float(m_lines.group(1)) - bj["line_coverage_pct"]) < 1e-9)
check("P4 log_states_exit0_twice", len(re.findall(r"Result: exit 0", bl)) == 2)
mt = {f: int(os.path.getmtime(os.path.join(RUNS, f))) for f in ("baseline.json", "baseline.log", "per-file-counts.md", "second-check-08bec4c.json", "second-check-1d4ddd2.json", "second-check-d1b9d59.json")}
print("INFO P4 mtimes=" + json.dumps(mt, sort_keys=True))
check("P4 baseline_json_mtime_unchanged_since_round1", mt["baseline.json"] == 1795342440)
g = json.load(open(os.path.join(RUNS, "gate-0be4a037.json")))
check("P4 first_gate_cases_before_equals_baseline", g["cases_before"] == case_count)
check("P4 first_gate_cases_after_equals_baseline_minus_d1_delete", g["cases_after"] == case_count - d1_del)
# runner-level proof of the baseline runs
hr = os.path.expanduser("~/.local/state/heavy-run.log")
ended = []
with open(hr, "rb") as fh:
    for raw in fh:
        line = raw.decode("utf-8", "ignore")
        if line.startswith("2026-11-22T1") and "job ended exit 0" in line and "www-reading-advantage" in line:
            ended.append(line[:19])
print(f"INFO P4 heavy_run_baseline_job_end_lines={ended}")
check("P4 heavy_run_has_three_exit0_baseline_jobs", ended[:3] == ["2026-11-22T16:53:43", "2026-11-22T17:06:04", "2026-11-22T17:13:39"])

# ---- P5: every test file classified (file set at the Phase 1 end)
rc, out, _ = git("ls-tree", "-r", "--name-only", P1_END, "--", APP)
tree = [p[len(APP) + 1:] for p in out.splitlines() if re.search(r"\.(test|spec)\.(ts|tsx)$", p)]
vitest_files = sorted(p for p in tree if p.startswith("src/") and re.search(r"\.test\.(ts|tsx)$", p))
e2e_files = sorted(p for p in tree if p.startswith("e2e/"))
other = sorted(p for p in tree if p not in vitest_files and p not in e2e_files)
check("P5 file_counts_98_91_6_1", (len(tree), len(vitest_files), len(e2e_files), len(other)) == (98, 91, 6, 1), f"tree={len(tree)} vitest={len(vitest_files)} e2e={len(e2e_files)} other={other}")
classified = set(file_classes)
missing = [p for p in tree if p not in classified]
extra = sorted(f for f in classified if f not in tree)
check("P5 every_test_file_classified", not missing, f"missing={missing}")
check("P5 no_stray_classified_file", not extra, f"extra={extra}")
nc = {c[0]: c for c in rows["Not counted"]}
for p in e2e_files + other:
    check(f"P5 not_counted_row {p}", p in nc and "not counted" in nc[p][3].lower())
# the 77 K files all exist at HEAD
k_files = sorted({c[0] for c in rows[class_key["K"]]})
rc, out, _ = git("ls-tree", "-r", "--name-only", "HEAD", "--", APP)
at_head = {p[len(APP) + 1:] for p in out.splitlines()}
miss_k = [f for f in k_files if f not in at_head]
check("P5 k_files_77_all_exist_at_head", len(k_files) == 77 and not miss_k, f"k_files={len(k_files)} missing={miss_k}")
d5_files = sorted({c[0] for c in rows[class_key["D5"]]})
miss_d5 = [f for f in d5_files if f not in at_head]
check("P5 d5_files_all_exist_at_head", not miss_d5, f"d5_files={len(d5_files)} missing={miss_d5}")

# ---- P6: per-file counts versus row sums (rows unchanged by the revert)
pc = {}
for l in open(os.path.join(RUNS, "per-file-counts.md"), encoding="utf-8"):
    m = re.match(r"\| (src/\S.*?) \| (\d+) \| (\d+) \| (yes|no) \|", l)
    if m:
        pc[m.group(1)] = (int(m.group(2)), int(m.group(3)), m.group(4))
mism = [(f, per_file.get(f), v) for f, v in pc.items() if per_file.get(f) != v[0] or v[2] != "yes"]
check("P6 per_file_runner_equals_row_sum_all_files", not mism and len(pc) == 91, f"files={len(pc)} mismatches={mism}")
check("P6 runner_sum_equals_case_count", sum(v[0] for v in pc.values()) == case_count)

# ---- P7: second-check chain and the ex post rate
sc = {}
for short in ("08bec4c", "1d4ddd2", "d1b9d59"):
    d = json.load(open(os.path.join(RUNS, f"second-check-{short}.json")))
    sc[short] = d
    rc, _, _ = git("cat-file", "-e", d["audited_head_sha"] + "^{commit}")
    check(f"P7 second_check_{short}_head_resolves", rc == 0, f"status={d['status']} route={d.get('route')}")
check("P7 final_second_check_pass", sc["d1b9d59"]["status"] == "pass" and not sc["d1b9d59"]["blocking_findings"])
rec = re.match(r"(\d+)/(\d+) \(([\d.]+)%\)", sc["1d4ddd2"]["disagreement_rate_rows"])
rec_n, den = int(rec.group(1)), int(rec.group(2))
print(f"INFO P7 recorded_rate={rec_n}/{den}={rec_n / den * 100:.2f}")
samp = sc["1d4ddd2"]["sampled_rows"]
check("P7 sample_size_37", len(samp) == 37)


def find(sub, cls=None):
    return [s for s in samp if sub in s["file"] and (cls is None or s["own_class"] == cls)]


nav_d4 = find("navigation.test", "D4")
prim_d2 = find("primary-advantage/page.test.tsx", "D2")
d5_fp = find("www-features-pricing.locale", "D5")
expl = [s for s in find("blog-locale") if "explicit" in s["row"].lower() or "en directory" in s["row"].lower()]
r1 = sc["08bec4c"]["sampled_rows"]
expl_r1 = [s for s in r1 if "blog-locale" in s["file"] and "explicit" in s["row"].lower()]
print(f"INFO P7 in_37_sample: D4_navigation={len(nav_d4)} D2_Primary={len(prim_d2)} D5_features_pricing={len(d5_fp)} D2_explicit_English={len(expl)}")
print(f"INFO P7 in_round1_18_row_sample: D2_explicit_English={len(expl_r1)}")
later_wrong_in_37 = len(nav_d4) + len(prim_d2) + len(d5_fp)
ex_post_n = rec_n + later_wrong_in_37
print(f"INFO P7 ex_post_in_sample={ex_post_n}/{den}={ex_post_n / den * 100:.2f} stop_rule_gt_15={ex_post_n / den * 100 > 15}")
check("P7 ex_post_rate_is_6_of_37_16_2", (ex_post_n, den) == (6, 37) and abs(ex_post_n / den * 100 - 16.2) < 0.05)
check("P7 explicit_english_not_in_37_sample", len(expl) == 0)
rep = open(REPORT, encoding="utf-8").read()
check("P7 report_states_6_of_37_16_2_and_pm_exception", "6 of 37, or 16.2 percent" in rep and "2026-11-24" in rep)
check("P7 plan_4_17_states_pm_exception", "6 of 37, or 16.2 percent" in plan_txt and "disclosed exception" in plan_txt and "2026-11-24" in plan_txt)
check("P7 plan_4_18_records_pm_option_c", "PM decision 2026-11-25, option C: revert D5 entirely" in plan_txt)

# ---- P8: the Phase 1 adversarial result and the checkers
adv_path = os.path.join(RUNS, "adversarial-p1-7336f42.json")
adv = json.load(open(adv_path))
check("P8 adversarial_pass_phase1", adv["status"] == "pass" and adv["phase"].startswith("Phase 1") and not adv["blocking_findings"], f"status={adv['status']} round={adv.get('round')} route={adv.get('route')}")
check("P8 adversarial_violations_empty", all(not adv[k] for k in ("test_strategy_violations", "live_contract_violations", "prod_wiring_violations", "route_parity_violations")))
check("P8 adversarial_head_resolves", adv["audited_head_sha"] == ADV_HEAD)
check("P8 adversarial_commands_are_strings", all(isinstance(c, str) and c for c in adv["commands"]))
for prev in adv["previous_results"]:
    d = json.load(open(os.path.join(ROOT, prev)))
    ids = [f.split(" ")[0] for f in d["blocking_findings"]]
    check(f"P8 previous_result_fail {os.path.basename(prev)}", d["status"] == "fail" and d["phase"].startswith("Phase 1"), f"blocking={ids}")
rc, out, _ = git("diff", "--name-only", ADV_HEAD, "HEAD")
delta = sorted(out.split())
check("P8 delta_adv_head_to_head_paths", delta == [f"{TRACK}/classification.md", f"{TRACK}/plan.md", f"{TRACK}/report.md"], f"paths={delta}")
rc, out, _ = git("diff", "--name-only", ADV_HEAD, "HEAD", "--", "apps")
check("P8 delta_has_no_apps_path", out.strip() == "")
for role, f in (("adversarial-testing", adv_path), ("review-a", os.path.join(RUNS, "review-a-2bfbd37.json"))):
    r = subprocess.run(["python3", CHECKER, "audit-result", "--role", role, "--file", f], capture_output=True, text=True, cwd=ROOT)
    check(f"P8 checker_audit_result {os.path.basename(f)}", r.returncode == 0 and "audit result is valid" in r.stdout, r.stdout.strip())
ra = json.load(open(os.path.join(RUNS, "review-a-2bfbd37.json")))
check("P8 review_a_targets_head_and_passes", ra["audited_head_sha"] == HEAD and ra["status"] == "pass" and not ra["blocking_findings"])
for name in ("adversarial-p1-7336f42-probes.py", "adversarial-p1-7336f42-thai-claim-harness.py", "adversarial-p1-7336f42-mutation-run.py", "adversarial-p1-7336f42.log"):
    check(f"P8 adversarial_artifact_exists {name}", os.path.getsize(os.path.join(RUNS, name)) > 0)
alog = open(os.path.join(RUNS, "adversarial-p1-7336f42.log"), encoding="utf-8", errors="ignore").read().split("\n")
check("P8 adversarial_log_has_result_block", "MEASURE_AGENT_RESULT" in [l.strip() for l in alog] and "END_MEASURE_AGENT_RESULT" in [l.strip() for l in alog])

# ---- P9: the D5 revert commit
rc, out, _ = git("show", REVERT, "--name-only", "--format=")
files = out.split("\n")
files = [f for f in files if f]
check("P9 revert_touches_12_test_files_only", len(files) == 12 and all(f.startswith(APP + "/src/") and re.search(r"\.test\.(ts|tsx)$", f) for f in files), f"files={len(files)}")
rc, out, _ = git("diff", "--name-only", REVERT, "HEAD", "--", "apps")
check("P9 apps_unchanged_revert_to_head", out.strip() == "")
ident = 0
for f in files:
    rc, out, _ = git("diff", "--numstat", PRE_D5, "HEAD", "--", f)
    if out.strip() == "":
        ident += 1
print(f"INFO P9 revert_files_identical_to_pre_d5={ident} of {len(files)}")
check("P9 at_least_8_of_12_identical_to_pre_d5", ident >= 8)
check("P9 green_at_revert_log_1494", "Tests  1494 passed (1494)" in open(os.path.join(RUNS, "green-at-f97a72f9.log"), encoding="utf-8", errors="ignore").read())

# ---- P10: anti-pattern scans
def scan(pattern, paths):
    r = subprocess.run(["grep", "-n", "-i", "-E", pattern] + paths, capture_output=True, text=True, cwd=ROOT)
    return r.returncode, r.stdout


rc, _ = scan("measure/archive", [f"{TRACK}/classification.md", f"{TRACK}/plan.md", f"{TRACK}/report.md"])
check("P10 A9_no_archive_path", rc == 1)
rc, _ = scan("sha256|checksum|sha-256", [f"{TRACK}/classification.md", "measure/runs/www_test_audit_pilot_20261122/baseline.json", "measure/runs/www_test_audit_pilot_20261122/baseline.log"])
check("P10 A15_no_hash_field", rc == 1)

print()
print(f"SUMMARY failures={len(failures)} {failures}")
sys.exit(1 if failures else 0)
