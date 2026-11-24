"""Round 2 bounded sample for the Phase 1 adversarial pass: three D5 live-line pins (commission, price).

Pins in the sample (each pin is mutated in en and th together unless the name says th):
  P3  tutorRole.points.3 in th: the calculator-shows-examples disclaimer (second live line of the D5 row)
  S7  pricing.ts S7 body: the Tutor package price ("Packages start at 3,000 baht and adapt to the market")
  S9  pricing.ts S9 answer 2: "printed workbooks are not included in the school price"

Method. The script builds a throwaway copy of the www app in /tmp. It copies src, applies one mutation
to the copy, and runs the HEAD test files that reference locale, pricing or tutor modules (not the
full suite). It also runs three a1caa5803 test files in the copy as positive controls. A control run
without a mutation gives the baseline failure set. A pin counts as lost when a positive control fails
and no HEAD test fails under that mutation.

It writes nothing under the repo, except that Vitest rewrites its gitignored results cache under
apps/www-reading-advantage/node_modules/.vite. It edits no production file.

Run: python3 -I measure/runs/www_test_audit_pilot_20261122/adversarial-p1-fdf62c9-sample-run.py [mutant ...]
A mutant name list limits the run. S7-typo-3500-en-th is the calibration variant: a plain typo to a figure
outside the price list. The sample bound stays three pins; this variant mutates the S7 pin again.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = "/home/daniebo/Desktop/rama-worktrees/www-test-audit"
APP = ROOT + "/apps/www-reading-advantage"
P1 = "a1caa5803"
CONTROLS = {
    "p1-ctrl-calc.test.ts": "src/__tests__/www-tutor-calculator.locale.test.ts",
    "p1-ctrl-features-pricing-locale.test.ts": "src/__tests__/www-features-pricing.locale.test.ts",
    "p1-ctrl-pricing-page-content.test.tsx": "src/__tests__/www-pricing-page.content.test.tsx",
}
TUTOR = "src/locales/pages/products/tutor-advantage.ts"
PRICING = "src/locales/pages/pricing.ts"
MUTANTS = {
    "P3-th": [(TUTOR, "เครื่องคำนวณในหน้านี้แสดงตัวอย่าง ทักมาคุยกับเราเรื่องกรณีของคุณเองได้", "เครื่องคำนวณในหน้านี้แสดงเงินที่คุณจะได้รับจริง", 1)],
    "S7-en-th": [
        (PRICING, "Packages start at 3,000 baht and adapt to the market.", "Packages start at 1,200 baht and adapt to the market.", 1),
        (PRICING, "แพ็กเกจเริ่มต้นที่ 3,000 บาท และราคาอาจปรับตามตลาด", "แพ็กเกจเริ่มต้นที่ 1,200 บาท และราคาอาจปรับตามตลาด", 1),
    ],
    "S7-typo-3500-en-th": [
        (PRICING, "Packages start at 3,000 baht and adapt to the market.", "Packages start at 3,500 baht and adapt to the market.", 1),
        (PRICING, "แพ็กเกจเริ่มต้นที่ 3,000 บาท และราคาอาจปรับตามตลาด", "แพ็กเกจเริ่มต้นที่ 3,500 บาท และราคาอาจปรับตามตลาด", 1),
    ],
    "S9-en-th": [
        (PRICING, "A: No. Printed workbooks are priced separately, per book, by quotation.", "A: Yes. Printed workbooks are included in the school price.", 1),
        (PRICING, "ไม่รวม เวิร์กบุ๊กฉบับพิมพ์คิดราคาแยกเป็นรายเล่ม โดยเสนอราคาแยกต่างหาก", "รวมอยู่ในราคาสำหรับโรงเรียนแล้ว เวิร์กบุ๊กฉบับพิมพ์ไม่คิดราคาเพิ่ม", 1),
    ],
}


def sh(*args, **kw):
    return subprocess.run(args, capture_output=True, text=True, **kw)


def git_show(rev, path):
    r = sh("git", "-C", ROOT, "show", f"{rev}:apps/www-reading-advantage/{path}")
    if r.returncode != 0:
        sys.exit(f"git show failed for {rev}:{path}")
    return r.stdout


def main():
    w = tempfile.mkdtemp(prefix="adv-p1-r2-sample-")
    c = w + "/appcopy"
    os.makedirs(c)
    os.symlink(ROOT + "/node_modules", w + "/node_modules")
    skip = {"src", "vitest.config.ts", "node_modules", "coverage", "playwright-report", "test-results", ".claude-old", ".opencode", "cline_docs", "revideo", "docs", ".github"}
    for e in os.listdir(APP):
        if e not in skip:
            os.symlink(f"{APP}/{e}", f"{c}/{e}")
    os.symlink(APP + "/node_modules", c + "/node_modules")
    shutil.copytree(APP + "/src", c + "/src")
    shutil.copy(APP + "/vitest.config.ts", c + "/vitest.config.ts")
    pat = r"tutor-advantage|tutorAdvantage|locales/|from \"@/locales|dictionaries|stringLeaves|pricing|PricingPage"
    r = sh("bash", "-c", f"cd {APP} && grep -rlE '{pat}' src --include='*.test.ts' --include='*.test.tsx' | sort")
    subset = [p for p in r.stdout.split() if p]
    print(f"INFO subset_head_files={len(subset)} positive_controls={len(CONTROLS)}")
    ctrl_files = []
    for name, path in CONTROLS.items():
        open(f"{c}/src/__tests__/{name}", "w", encoding="utf-8").write(git_show(P1, path))
        ctrl_files.append(f"src/__tests__/{name}")

    def run(label):
        env = dict(os.environ, CI="true")
        p = subprocess.run([w + "/node_modules/.bin/vitest", "run", "--maxWorkers=3", "--reporter=dot", *subset, *ctrl_files],
                           capture_output=True, text=True, env=env, cwd=c, timeout=900)
        out = p.stdout + p.stderr
        fails = set(re.findall(r"FAIL\s+(\S+) > (.+)", out))
        m = re.search(r"^\s+Tests\s+\d.*$", out, re.M)
        print(f"RESULT run={label} exit={p.returncode} {m.group(0).strip() if m else 'n/a'}")
        return fails

    control = run("control")
    env_files = sorted({f for f, _ in control})
    print(f"INFO control_failing_files={env_files} (environment: the copy has no repo root for measure/tracks)")
    only = sys.argv[1:]
    for name, edits in MUTANTS.items():
        if only and name not in only:
            continue
        originals = {}
        for rel, old, new, count in edits:
            p = f"{c}/{rel}"
            s = open(p, encoding="utf-8").read()
            originals.setdefault(rel, s)
            assert s.count(old) >= 1, (name, old[:40])
            open(p, "w", encoding="utf-8").write(s.replace(old, new, count))
        fails = run(name)
        for rel, s in originals.items():
            open(f"{c}/{rel}", "w", encoding="utf-8").write(s)
        extra = sorted(fails - control)
        head_catch = [(f, t) for f, t in extra if "p1-ctrl" not in f]
        ctrl_catch = [(f, t) for f, t in extra if "p1-ctrl" in f]
        for f, t in extra:
            print(f"   NEW_FAIL {f} > {t}")
        print(f"VERDICT mutant={name} caught_by_head_tests={len(head_catch)} caught_by_p1_controls={len(ctrl_catch)} lost_pin={bool(ctrl_catch) and not head_catch}")
    shutil.rmtree(w, ignore_errors=True)
    print("INFO workdir removed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
