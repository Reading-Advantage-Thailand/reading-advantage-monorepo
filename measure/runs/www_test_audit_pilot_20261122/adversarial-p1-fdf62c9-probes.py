"""Round 2 read-only adversarial probes for Phase 1 of www_test_audit_pilot_20261122.

Round 2 re-runs the round 1 structure checks against fdf62c97b and adds the erratum checks (G9).
The classification now differs from a1caa5803 by four erratum lines and one share cell (G0).

Run: python3 -I measure/runs/www_test_audit_pilot_20261122/adversarial-p1-fdf62c9-probes.py
The script writes no file and runs no test suite. It reads git objects and run artifacts.
Mutations of classification.md happen on in-memory copies only.

Line labels:
  PASS    an expected invariant holds, or a mutation was detected
  FAIL    an expected invariant broke, or a mutation went undetected (a gate hole)
  FINDING a verified defect or gap in the Phase 1 classification (not a probe failure)
  INFO    a measured value
"""
import json
import os
import re
import subprocess
import sys

ROOT = "/home/daniebo/Desktop/rama-worktrees/www-test-audit"
TRACK = ROOT + "/measure/tracks/www_test_audit_pilot_20261122"
RUNS = ROOT + "/measure/runs/www_test_audit_pilot_20261122"
APP = "apps/www-reading-advantage"
P1 = "a1caa58034f6455e91205a5673ef172a974a7992"
HEAD = "fdf62c97b974cb7aec47a4a4e79f5538488ce9af"
KFILES = [
    "src/lib/tutor-commission.test.ts",
    "src/lib/tutor-commission.adversarial.test.ts",
    "src/lib/tutor-commission.followups.adversarial.test.ts",
    "src/lib/tutor-commission.settlement.adversarial.test.ts",
    "src/components/marketing/tutor-commission-calculator.test.tsx",
    "src/components/marketing/tutor-commission-calculator.adversarial.test.tsx",
    "src/components/marketing/tutor-commission-calculator.legs.adversarial.test.tsx",
]
SECTIONS = {
    "K": "K rows (keep)",
    "D1": "D1 rows (source-text test: delete, or replace with a behavior test)",
    "D2": "D2 rows (duplicate: delete; kept duplicate named)",
    "D4": "D4 rows (weak check: delete, or merge)",
    "D5": "D5 rows (copy pin on a marketing line: replace with a locale-key check)",
    "R2": "R2 rows (brittle: rewrite with fixed clocks and role-based selectors)",
    "NC": "Not counted",
}
fails = []


def say(kind, label, detail=""):
    print(f"{kind} {label} {detail}".rstrip())
    if kind == "FAIL":
        fails.append(label)


def check(label, ok, detail=""):
    say("PASS" if ok else "FAIL", label, detail)


def git(*args):
    r = subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True)
    return r.returncode, r.stdout


def show(rev, path):
    rc, out = git("show", f"{rev}:{APP}/{path}")
    return out if rc == 0 else None


# ---- classification parser (independent of the acceptance probe) -------------------------
def parse(text):
    """Return (sections in order, rows by section key). Cells split on unescaped pipes."""
    order, rows, cur = [], {}, None
    for line in text.splitlines():
        m = re.match(r"## (.+)", line)
        if m:
            cur = m.group(1)
            order.append(cur)
            rows[cur] = []
            continue
        if cur and re.match(r"\| (src|e2e|scripts)/", line):
            cells = [c.strip() for c in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
            rows[cur].append(cells)
    return order, rows


def n_of(cells):
    try:
        return int(cells[2])
    except (ValueError, IndexError):
        return None


def structural_failures(text, ctx):
    """The Phase 1 gate checks as pure functions of the classification text. Returns labels that fail."""
    order, rows = parse(text)
    out = []
    data_sections = [s for s in order if s in SECTIONS.values()]
    if not data_sections or not data_sections[0].startswith("K rows"):
        out.append("k_first")
    class_sum = {}
    file_sections = {}
    per_file = {}
    for key, sec in SECTIONS.items():
        total = 0
        for cells in rows.get(sec, []):
            n = n_of(cells)
            file_sections.setdefault(cells[0], set()).add(key)
            if n is None:
                out.append(f"bad_n:{cells[0]}")
                continue
            if key != "NC":
                total += n
                per_file[cells[0]] = per_file.get(cells[0], 0) + n
        class_sum[key] = total
    if sum(class_sum[k] for k in class_sum if k != "NC") != ctx["case_count"]:
        out.append("class_sum")
    summ = {}
    for line in text.splitlines():
        m = re.match(r"\| (K keep|D1 source-text|D2 duplicate|D4 weak check|D5 copy pin|R2 brittle) \| (\d+) \|", line)
        if m:
            summ[m.group(1)] = int(m.group(2))
    want = {"K keep": "K", "D1 source-text": "D1", "D2 duplicate": "D2", "D4 weak check": "D4", "D5 copy pin": "D5", "R2 brittle": "R2"}
    if any(summ.get(name) != class_sum[key] for name, key in want.items()):
        out.append("summary_table")
    files = set(file_sections)
    if [f for f in ctx["test_files"] if f not in files]:
        out.append("every_file_has_row")
    if [f for f in files if f not in ctx["test_files"]]:
        out.append("no_stray_file")
    nc = {c[0]: c for c in rows.get(SECTIONS["NC"], [])}
    for f in ctx["e2e"] + ["scripts/__tests__/i18n-cli.test.ts"]:
        if f not in nc or "not counted" not in (nc[f][3].lower() if len(nc[f]) > 3 else ""):
            out.append(f"nc_row:{f}")
        if file_sections.get(f, set()) - {"NC"}:
            out.append(f"counted_row_for_not_counted_file:{f}")
    for f in KFILES:
        if file_sections.get(f) != {"K"}:
            out.append(f"kfile_not_k_only:{f}")
    for cells in rows.get(SECTIONS["D2"], []):
        if (n_of(cells) or 0) == 0:
            continue
        kept = cells[3] if len(cells) > 3 else ""
        named = re.findall(r"[\w.\-]+\.test\.tsx?", kept)
        if "same file" in kept:
            ok = "K" in file_sections.get(cells[0], set())
        else:
            # a named file must exist in the P1 test file set (by base name)
            bases = {os.path.basename(f) for f in ctx["test_files"]}
            ok = bool(named) and all(os.path.basename(x) in bases for x in named)
        if not ok:
            out.append(f"d2_kept_missing:{cells[0]}")
    for f, v in ctx["per_file_runner"].items():
        if per_file.get(f) != v:
            out.append(f"per_file_rowsum:{f}")
            break
    return sorted(set(out))


# ---- context ------------------------------------------------------------------------------
cls_text = open(TRACK + "/classification.md", encoding="utf-8").read()
baseline = json.load(open(RUNS + "/baseline.json"))
rc, tree = git("ls-tree", "-r", "--name-only", P1, "--", APP)
all_tree = [p[len(APP) + 1:] for p in tree.splitlines()]
test_files = sorted(p for p in all_tree if re.search(r"\.(test|spec)\.(ts|tsx)$", p))
e2e = [p for p in test_files if p.startswith("e2e/")]
per_file_runner = {}
for line in open(RUNS + "/per-file-counts.md", encoding="utf-8"):
    m = re.match(r"\| (src/\S.*?) \| (\d+) \| (\d+) \| (yes|no) \|", line)
    if m:
        per_file_runner[m.group(1)] = int(m.group(2))
ctx = {"case_count": baseline["case_count"], "test_files": test_files, "e2e": e2e, "per_file_runner": per_file_runner}

# ---- G0: provenance --------------------------------------------------------------------------
rc, out = git("rev-parse", "HEAD")
check("G0 head_is_audited_head", out.strip() == HEAD, f"head={out.strip()[:9]}")
rc, out = git("diff", "-U0", P1, "HEAD", "--", "measure/tracks/www_test_audit_pilot_20261122/classification.md")
changed = [l for l in out.splitlines() if (l.startswith("+") or l.startswith("-")) and not l.startswith(("+++", "---"))]
added = [l[1:] for l in changed if l.startswith("+")]
removed = [l[1:] for l in changed if l.startswith("-")]
erratum_lines = [l for l in added if l.startswith("Erratum:")]
other_added = [l for l in added if l and not l.startswith("Erratum:")]
check("G0 classification_p1_to_head_adds_four_erratum_lines_and_one_share_cell",
      len(erratum_lines) == 4 and removed == ["| K keep | 2843 | 89.6 % | keep |"] and other_added == ["| K keep | 2843 | 89.5 % | keep |"],
      f"errata={len(erratum_lines)} removed={removed} other_added={other_added}")
rc, out = git("diff", "--name-only", "635a604c89b2c909cfce33f555b7f043d4ea520f", P1, "--", "apps")
check("G0 phase1_apps_diff_empty", out.strip() == "")
print(f"INFO G0 p1_test_files={len(test_files)} vitest_src={sum(p.startswith('src/') for p in test_files)} e2e={len(e2e)} per_file_rows={len(per_file_runner)}")

# ---- G1: baseline invariants hold on the real classification ----------------------------------
base_fail = structural_failures(cls_text, ctx)
check("G1 real_classification_passes_all_structural_checks", base_fail == [], f"failures={base_fail}")

# ---- G2: mutations of the classification. Each must be detected (A4: no vacuous gate) ---------
def move_row(text, file_contains, from_marker, to_marker):
    lines = text.splitlines()
    idx = next(i for i, l in enumerate(lines) if l.startswith("| ") and file_contains in l.split("|")[1] and _in_section(lines, i, from_marker))
    row = lines.pop(idx)
    tgt = next(i for i, l in enumerate(lines) if l.startswith("## ") and to_marker in l)
    j = tgt + 1
    while not lines[j].startswith("|---"):
        j += 1
    lines.insert(j + 1, row)
    return "\n".join(lines) + "\n"


def _in_section(lines, i, marker):
    k = i
    while k >= 0 and not lines[k].startswith("## "):
        k -= 1
    return marker in lines[k]


def drop_row(text, file_contains):
    lines = text.splitlines()
    idx = next(i for i, l in enumerate(lines) if l.startswith("| ") and file_contains in l.split("|")[1])
    del lines[idx]
    return "\n".join(lines) + "\n"


MUTANTS = [
    ("M1 relabel_tutor_commission_K_row_as_D1", move_row(cls_text, "src/lib/tutor-commission.test.ts", "K rows", "D1 rows"), "kfile_not_k_only:src/lib/tutor-commission.test.ts"),
    ("M2 drop_row_of_one_test_file", drop_row(cls_text, "src/lib/blog-draft.test.ts"), "every_file_has_row"),
    ("M3 e2e_row_loses_not_counted", cls_text.replace("| e2e/photos.spec.ts | marketing and products photo titles across the target and locale matrix | 2 | Playwright titles expand over the matrix at runtime, not counted |", "| e2e/photos.spec.ts | marketing and products photo titles across the target and locale matrix | 2 | Playwright titles expand over the matrix at runtime |"), "nc_row:e2e/photos.spec.ts"),
    ("M4 d2_kept_duplicate_names_missing_file", cls_text.replace("same file: returns the en subdirectory by default", "src/lib/nope.test.ts returns the en subdirectory"), "d2_kept_missing:src/lib/blog-locale.test.ts"),
    ("M5 d2_kept_duplicate_cell_is_a_dash", cls_text.replace("src/lib/blog.test.ts calculateReadingTime value cases", "-"), "d2_kept_missing:src/lib/blog-locale.test.ts"),
    ("M6 one_n_off_by_one", cls_text.replace("| src/lib/blog-draft.test.ts | all 6 draft cases | 6 |", "| src/lib/blog-draft.test.ts | all 6 draft cases | 7 |"), "class_sum"),
    ("M7 move_d5_row_into_K_keeping_the_sum", move_row(cls_text, "src/__tests__/www-batch-20261116.locale.test.ts", "D5 rows", "K rows"), "summary_table"),
    ("M8 e2e_file_counted_as_K", cls_text.replace("## K rows (keep)\n\n| File | Case(s) | n | Rule | Reason |\n|---|---|---|---|---|\n", "## K rows (keep)\n\n| File | Case(s) | n | Rule | Reason |\n|---|---|---|---|---|\n| e2e/contact.spec.ts | email link | 1 | x | y |\n"), "counted_row_for_not_counted_file:e2e/contact.spec.ts"),
    ("M9 empty_classification", "# empty\n", "every_file_has_row"),
]
for label, text, expect in MUTANTS:
    got = structural_failures(text, ctx)
    check(f"G2 detects {label}", expect in got, f"expect={expect} got={got[:3]}")

# Known blind spot of any structural check: a D2 row that names an existing file but a different rule.
# The real Primary row below names an existing kept file. The structural check accepts it.
check("G2 blind_spot_structural_check_accepts_primary_old_test_id_row", "d2_kept_missing:src/app/[locale]/(marketing)/products/primary-advantage/page.test.tsx" not in base_fail,
      "the semantic duplicate test needs a token bridge (G3)")

# ---- G3: D2 token bridge. Each distinctive token of a deleted case must appear in the kept duplicate at P1 ----
primary_dir = "src/app/[locale]/(marketing)/products/primary-advantage"
pc = show(P1, primary_dir + "/page.content.test.tsx")
pt = show(P1, primary_dir + "/page.test.tsx")
old_ids = ["cefr-timeline", "reversed-split", "overlapping-section", "stat-card"]
in_deleted = [t for t in old_ids if t in pt]
in_kept_p1 = [t for t in old_ids if t in pc]
check("G3 primary_deleted_case_names_four_old_test_ids", in_deleted == old_ids, f"in_deleted={in_deleted}")
print(f"INFO G3 primary_kept_duplicate_old_test_ids_at_P1={in_kept_p1} (empty means the P1 row was wrong; HEAD restores it)")
pc_head = open(ROOT + f"/{APP}/{primary_dir}/page.content.test.tsx", encoding="utf-8").read()
check("G3 head_restored_old_test_id_check_in_page_content", all(t in pc_head for t in old_ids), "commit fb5622ed7")

bl = show(P1, "src/lib/blog-locale.test.ts")
deleted_body = re.search(r'it\("returns the en directory when locale is en".*?\n  \}\);', bl, re.S).group(0)
rest = bl.replace(deleted_body, "")
explicit_en_assert = re.search(r'postsDirectory\("en"\)\)\.toBe\(', rest)
print(f"INFO G3 blog_locale_explicit_en_value_assert_outside_deleted_case_at_P1={bool(explicit_en_assert)} (False means the P1 row was wrong; HEAD restores it)")
bl_head = open(ROOT + f"/{APP}/src/lib/blog-locale.test.ts", encoding="utf-8").read()
check("G3 head_restored_explicit_en_value_assert", re.search(r'postsDirectory\("en"\)\)\.toBe\(', bl_head) is not None)

nav = show(P1, "src/locales/navigation.test.tsx")
nav_head = open(ROOT + f"/{APP}/src/locales/navigation.test.tsx", encoding="utf-8").read()
check("G3 navigation_D4_th_zh_cases_exist_at_P1_and_head", 'it.each(["en", "th", "zh"])' in nav and 'it.each(["th", "zh"])' in nav_head)

# other D2 rows: kept duplicate holds the same literals
rr = show(P1, "src/lib/__tests__/real-logos-references.red.test.ts")
ra = show(P1, "src/lib/__tests__/real-logos-adversarial.test.ts")
lit_re = r'"(/[^"]+)"'
rr_lits = re.findall(lit_re, re.search(r"const REMOVED_LITERALS = \[(.*?)\] as const", rr, re.S).group(1))
ra_lits = re.findall(lit_re, re.search(r"const REMOVED_LITERALS = \[(.*?)\] as const", ra, re.S).group(1))
check("G3 references_D2_removed_literals_equal_kept_duplicate_literals", rr_lits == ra_lits and len(rr_lits) == 11, f"n={len(rr_lits)}")
cap = show(P1, "src/lib/__tests__/real-logos-captures-adversarial.test.ts")
fav_paths = re.search(r"const FAVICON_PATHS = \[(.*?)\]\s*(?:as const)?;", cap, re.S).group(1)
check("G3 favicon_D2_kept_duplicate_covers_both_copies_length_magic_identity",
      '"public/favicon.ico"' in fav_paths and '"src/app/[locale]/favicon.ico"' in fav_paths and "ICO_LENGTH" in cap and "ICO_MAGIC" in cap and "byte-identical" in cap)
ts = show(P1, "src/lib/__tests__/tutor-screens.test.ts")
check("G3 tutor_screens_D2_kept_duplicate_pins_order_and_portrait", "gallery order" in ts and ts.count("portrait: false") >= 5 and "toEqual(expected)" in ts)
fu = show(P1, "src/__tests__/www-tutor-followups.adversarial.test.ts")
pp = show(P1, "src/__tests__/products-page-pictures.red.test.tsx")
check("G3 retired_storytime_D2_regexes_equal", "/2026-11-06\\//" in pp and "/2026-11-06\\//" in fu and "storytime.*2026-11-06|cover-options-2026-11-06" in pp and "storytime.*2026-11-06|cover-options-2026-11-06" in fu)

# ---- G4: counts ----------------------------------------------------------------------------------
simple_exact, simple_sum = 0, 0
for f, n in per_file_runner.items():
    t = show(P1, f)
    plain = len(re.findall(r"^\s*(?:it|test)\(", t, re.M)) + len(re.findall(r"^\s*(?:it|test)\.skipIf\([^)]*\)\(", t, re.M))
    dyn = re.search(r"(?:it|test)\.each\(|^\s*(?:for\s*\(|describe\.each|[\w.]+\.forEach\(|\w+\.map\()", t, re.M)
    if not dyn:
        check(f"G4 static_count_equals_runner {os.path.basename(f)}", plain == n, f"static={plain} runner={n}") if plain != n else None
        simple_exact += int(plain == n)
        simple_sum += n if plain == n else 0
print(f"INFO G4 files_independently_matched_by_static_counter={simple_exact} cases_in_those_files={simple_sum}")
posts = {}
rc, out = git("ls-tree", "-r", P1, "--", f"{APP}/src/app/[locale]/(marketing)/blog/posts")
for l in out.splitlines():
    mode, _, _, path = l.split(None, 3)
    m = re.search(r"/posts/([^/]+)/([^/]+\.md)$", path)
    if m:
        posts[m.group(1)] = posts.get(m.group(1), 0) + 1
n_total, n_non_en = sum(posts.values()), sum(v for k, v in posts.items() if k != "en")
formula = 14 * n_total + 2 + n_non_en
check("G4 blog_posts_validation_1726_rederived_from_post_files", formula == per_file_runner["src/lib/blog-posts-validation.test.ts"] == 1726, f"posts={posts} formula=14*{n_total}+2+{n_non_en}={formula}")
runner_json_kept = [f for f in os.listdir(RUNS) if f.endswith(".json") and "vitest" in f]
print(f"INFO G4 retained_runner_json_files={len(runner_json_kept)} (the Phase 1 JSON reporter output is not kept; per-file-counts.md runner column rests on it)")

# summary-table share arithmetic
for name, n in (("K keep", 2843), ("D1 source-text", 67), ("D2 duplicate", 22), ("D4 weak check", 6), ("D5 copy pin", 221), ("R2 brittle", 16)):
    m = re.search(rf"\| {name} \| {n} \| ([\d.]+) %", cls_text)
    calc = round(n / 3175 * 100, 1)
    check(f"G4 share_column {name}", bool(m) and abs(float(m.group(1)) - calc) <= 0.001, f"listed={m.group(1) if m else None} calc={calc}")
shares = [float(x) for x in re.findall(r"\| (?:K keep|D1 source-text|D2 duplicate|D3 dead target|D4 weak check|D5 copy pin|R1 over-mocked|R2 brittle|R3 unclear) \| \d+ \| ([\d.]+) %", cls_text)]
check("G4 shares_sum_to_100_0", abs(sum(shares) - 100.0) < 0.05, f"sum={sum(shares):.1f} n={len(shares)}")

# ---- G5: not-counted rows and sentinel rows ---------------------------------------------------------
order, rows = parse(cls_text)
nc_rows = {c[0]: c for c in rows[SECTIONS["NC"]]}
declared = {}
for f in e2e:
    t = show(P1, f)
    declared[f] = len(re.findall(r"^\s*test\(|^\s+test\(", t, re.M))
for f in e2e:
    print(f"INFO G5 e2e {f} row_n={nc_rows[f][2]} declared_test_calls={declared[f]} loops_in_file={len(re.findall(r'^\s*for \(', show(P1, f), re.M))}")
sentinels = [(sec, c[0]) for sec in (SECTIONS["D2"], SECTIONS["D5"]) for c in rows[sec] if n_of(c) == 0]
print(f"INFO G5 zero_case_sentinel_rows_in_D_sections={sentinels}")
naive_d_files = {c[0] for sec in ("D1", "D2", "D4", "D5", "R2") for c in rows[SECTIONS[sec]]}
k_files = {c[0] for c in rows[SECTIONS["K"]]}
overlap = sorted(naive_d_files & k_files)
print(f"INFO G5 files_named_in_both_a_D_or_R_section_and_K={len(overlap)}")
zero_named_k = [f for _, f in sentinels if f in k_files]
if zero_named_k:
    say("FINDING", "ADV-P1-7 zero_case_sentinel_rows_name_K_files_in_D_sections", f"{zero_named_k}: a path-based D filter would list them as D2 or D5")

# ---- G6: tutor-commission K files in K rows only, unchanged to HEAD -----------------------------------
check("G6 seven_tutor_commission_files_exist_at_P1", all(f in test_files for f in KFILES))
rc, out = git("diff", "--name-only", P1, "HEAD", "--", *[f"{APP}/{f}" for f in KFILES])
check("G6 seven_tutor_commission_files_unchanged_P1_to_HEAD", out.strip() == "", f"changed={out.split()}")
glob_hits = [f for f in test_files if re.search(r"tutor-commission", f)]
check("G6 k_path_pattern_tutor_commission_star_matches_exactly_the_seven", sorted(glob_hits) == sorted(KFILES), f"matches={len(glob_hits)}")

# ---- G7: A5/A9 text claims -------------------------------------------------------------------------------
plan = open(TRACK + "/plan.md", encoding="utf-8").read()
p1_plan = plan.split("## Phase 1")[1].split("## Phase 2")[0]
check("G7 plan_phase1_claims_exit_0_and_holds_no_number", "Both runner commands exited 0" in p1_plan and not re.search(r"\b3175\b|\b86\.52\b", p1_plan))
hr = subprocess.run(["grep", "-a", "-E", "2026-11-22T1[67].*job ended exit 0.*www-reading-advantage", os.path.expanduser("~/.local/state/heavy-run.log")], capture_output=True, text=True).stdout
check("G7 heavy_run_log_has_three_exit_0_www_jobs_on_baseline_day", len(hr.splitlines()) >= 3, f"lines={len(hr.splitlines())}")
rc, out = subprocess.run(["grep", "-rn", "measure/archive", TRACK + "/classification.md", TRACK + "/plan.md"], capture_output=True, text=True).returncode, ""
check("G7 no_archive_path_in_classification_or_plan", rc == 1)

# ---- G8: second-check sample accounting ---------------------------------------------------------------------
sc = json.load(open(RUNS + "/second-check-1d4ddd2.json"))
sampled = sc["sampled_rows"]
by_class = {}
for r in sampled:
    by_class[r["own_class"]] = by_class.get(r["own_class"], 0) + 1
print(f"INFO G8 sample_by_class={by_class} sample_rows={len(sampled)} d5_rows_in_classification={len(rows[SECTIONS['D5']])} d5_rows_with_cases={sum(1 for c in rows[SECTIONS['D5']] if n_of(c))}")
agreed_later_restored = [r["file"] for r in sampled if r["verdict"] == "agree" and (
    ("primary-advantage/page.test.tsx" in r["file"] and r["own_class"] == "D2") or
    (r["file"].endswith("blog-locale.test.ts") and r["own_class"] == "D2") or
    (r["file"].endswith("navigation.test.tsx") and r["own_class"] == "D4"))]
n_dis = int(sc["disagreement_rate_rows"].split("/")[0])
den = int(sc["disagreement_rate_rows"].split("/")[1].split()[0])
print(f"INFO G8 recorded_disagreements={n_dis}/{den} agreed_rows_later_restored={len(agreed_later_restored)}")
print(f"INFO G8 residual_error_rate_at_p1_end={len(agreed_later_restored)}/{den}={len(agreed_later_restored)/den*100:.2f}% ex_post_rate_incl_fixed_disagreements={(n_dis+len(agreed_later_restored))}/{den}={(n_dis+len(agreed_later_restored))/den*100:.2f}% stop_rule=15%")

# ---- G9: round 2 erratum truth and completeness ---------------------------------------------------------------
def sha_ok(sha, path_contains):
    rc, _ = git("merge-base", "--is-ancestor", sha, "HEAD")
    rc2, files = git("show", "--name-only", "--format=", sha)
    return rc == 0 and any(path_contains in f for f in files.splitlines())

check("G9 erratum_fb5622ed7_is_ancestor_and_touches_blog_locale_test", sha_ok("fb5622ed7", "src/lib/blog-locale.test.ts"))
check("G9 erratum_fb5622ed7_touches_primary_page_content_test", sha_ok("fb5622ed7", "primary-advantage/page.content.test.tsx"))
check("G9 erratum_9eb3b9c4f_touches_navigation_test", sha_ok("9eb3b9c4f", "src/locales/navigation.test.tsx"))
check("G9 erratum_ca91946b_touches_tutor_calculator_locale_test", sha_ok("ca91946b", "www-tutor-calculator.locale.test.ts"))
for line in ("Erratum: the explicit-English row was restored in `fb5622ed7`.",
             "Erratum: the Primary \"no old test id\" row was restored in `fb5622ed7`.",
             "Erratum: The th and zh cases of the navigation row were restored in `9eb3b9c4f`; the en case stays deleted.",
             "Erratum: the live-line en and th pins for `faq.items.5.answer` were restored in `ca91946b`."):
    check(f"G9 erratum_present {line[10:60]}", line in erratum_lines)
nav_head2 = open(ROOT + f"/{APP}/src/locales/navigation.test.tsx", encoding="utf-8").read()
check("G9 d4_erratum_true_th_zh_present_en_absent", 'it.each(["th", "zh"])' in nav_head2 and '"en", "th", "zh"' not in nav_head2)
calc_head = open(ROOT + f"/{APP}/src/__tests__/www-tutor-calculator.locale.test.ts", encoding="utf-8").read()
check("G9 d5_erratum_true_exact_en_th_assertion_exists", 'at(DICTS.th, pin.path), "th faq.items.5.answer").toBe(pin.th)' in calc_head and 'at(DICTS.en, pin.path), "en faq.items.5.answer").toBe(pin.en)' in calc_head)
check("G9 d5_erratum_scope_faq_only_points3_th_has_no_exact_assert",
      calc_head.count("toBe(pin.th)") == 1 and "tutorRole.points.3" in calc_head and "FAQ_ANSWER_PIN" in calc_head,
      "the other live line (tutorRole.points.3) is key-only in th; see ADV-P1-8")
# completeness: every deleted D1/D2/D4 case title is absent at HEAD except the errata rows and the K cases kept in the same file
tests_head = {}
rc, lst = git("ls-files", f"{APP}/src")
for f in lst.splitlines():
    if re.search(r"\.test\.tsx?$", f):
        tests_head[f] = open(ROOT + "/" + f, encoding="utf-8").read()
def present(title):
    return [f for f, t in tests_head.items() if title in t]
deleted_titles = {
    "keeps both production components free of unsafe assertions": False,
    "routes reviewed CTA and accessibility copy through locale messages": False,
    "removes bypass casts from named locale accessors": False,
    "keeps existing Science translator callers type-valid": False,
    "control: the pricing page source is found": False,
    "uses no literal four-row index list for the subject rows": False,
    "does not retain empty layout component modules": False,
    "renders each of the 11 containers exactly once": False,
    "renders the containers in page order: hero, sections 1 to 5, demo, sections 6 to 8, closing": False,
    "returns a number type": False,
    "has src/app/[locale]/favicon.ico and public/favicon.ico byte-identical": False,
    "has byte length 6507 for src/app/[locale]/favicon.ico": False,
    "has byte length 6507 for public/favicon.ico": False,
    "starts with the ICO magic 00 00 01 00 in public/favicon.ico": False,
    "references zero occurrences of": False,
    "does not use the retired Storytime set": False,
    "ADV-M4 slot order is fixed": False,
    "names the en home light capture first": False,
    "names the en tutor dark capture last": False,
    "are present when A34_REQUIRE_SOURCES=1": False,
    # restored, and named in an erratum:
    "returns the en directory when locale is en": True,
    "renders no test id of the old page": True,
}
bad = [t for t, restored in deleted_titles.items() if bool(present(t)) != restored]
check("G9 deleted_case_titles_absent_at_HEAD_except_the_two_restored_rows_with_errata", not bad, f"mismatch={bad}")

# ---- G10: plan task 4.17 and report claims about the ADV-P1-1 fix (A5) ---------------------------------------
gl = open(RUNS + "/green-at-ca91946b.log", encoding="utf-8", errors="ignore").read()
cl = open(RUNS + "/coverage-at-ca91946b.log", encoding="utf-8", errors="ignore").read()
check("G10 green_log_1414_tests_98_files", "Tests  1414 passed (1414)" in gl and "Test Files  98 passed (98)" in gl)
check("G10 coverage_log_lines_92_08", "Lines        : 92.08%" in cl)
bk = open(RUNS + "/green-p1-thai-breakage.log", encoding="utf-8", errors="ignore").read()
check("G10 breakage_log_names_the_restored_case_and_fails", "holds the exact en and th commission FAQ answer" in bk and "1 failed | 18 passed (19)" in bk)
hr = subprocess.run(["grep", "-a", "-E", "2026-11-24T22:2.*job ended exit .*www-reading-advantage", os.path.expanduser("~/.local/state/heavy-run.log")], capture_output=True, text=True).stdout
check("G10 heavy_run_shows_breakage_exit_1_then_exit_0_and_full_suite_exit_0", "exit 1 after" in hr and hr.count("exit 0 after") >= 4, f"lines={len(hr.splitlines())}")
rep_text = open(TRACK + "/report.md", encoding="utf-8").read()
check("G10 report_names_both_halves_of_fb5622ed7", "restored the test `returns the en directory when locale is en`" in rep_text and "restored the Primary `no old test id` old-reference case" in rep_text)
check("G10 report_discloses_second_check_ex_post_rate", "6 of 37, or 16.2 percent" in rep_text and "PM accepted this as a disclosed exception on 2026-11-24" in rep_text)
m_ph = re.search(r"restored in Phases? ([\d ,and]+)\.", rep_text)
if m_ph and "3" in m_ph.group(1):
    say("FINDING", "ADV-P1-4b report_says_rows_restored_in_Phases_2_and_3", "all three restores are in task 2.7 (Phase 2): fb5622ed7 and 9eb3b9c4f precede the Phase 3 R2 commit adf24e723 in git log")
rc, out = git("log", "--format=%h", "fb5622ed7", "9eb3b9c4f", "-1")
rc, anc = git("merge-base", "--is-ancestor", "fb5622ed7", "adf24e723")
check("G10 restores_precede_phase_3_r2_commit", subprocess.run(["git", "-C", ROOT, "merge-base", "--is-ancestor", "fb5622ed7", "adf24e723"]).returncode == 0 and subprocess.run(["git", "-C", ROOT, "merge-base", "--is-ancestor", "9eb3b9c4f", "adf24e723"]).returncode == 0)

print()
print(f"SUMMARY probe_failures={len(fails)} {fails}")
sys.exit(1 if fails else 0)
