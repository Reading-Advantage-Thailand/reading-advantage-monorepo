"""Round 3 mutation run for the Phase 1 adversarial pass (D5 revert, option C).

Round 2 found that price and commission pins had no test at fdf62c97b. The PM reverted the D5 class (f97a72f90).
This script re-runs the three round 2 mutants and two more money pins against the HEAD test files. It also runs
a bounded sample of three more pins from the restored files. Each mutant must now fail at HEAD.

Method. The script builds a throwaway copy of the www app in /tmp. It applies one mutation to the copy, then runs
the HEAD test files that can read the mutated text (a narrow set, not the full suite). A control run with no
mutation gives the baseline. A mutant counts as caught when at least one HEAD test fails that did not fail in the
control. English strings that the zh dictionary repeats are changed in every copy, so a zh-equals-en case cannot
catch the mutant by itself. The script prints the failing test names, so a reader can see which pin caught it.

It writes nothing under the repo, except that Vitest rewrites its gitignored results cache under
apps/www-reading-advantage/node_modules/.vite. It edits no production file.

Run: python3 -I measure/runs/www_test_audit_pilot_20261122/adversarial-p1-7336f42-mutation-run.py [mutant ...]
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = "/home/daniebo/Desktop/rama-worktrees/www-test-audit"
APP = ROOT + "/apps/www-reading-advantage"
TUTOR = "src/locales/pages/products/tutor-advantage.ts"
PRICING = "src/locales/pages/pricing.ts"
FEATURE = "src/locales/pages/feature.ts"
TEST_SET = [
    "src/__tests__/www-features-pricing.locale.test.ts",
    "src/__tests__/www-pricing-page.content.test.tsx",
    "src/__tests__/www-features-page.content.test.tsx",
    "src/__tests__/www-pricing-stacking.red.test.ts",
    "src/__tests__/www-tutor-calculator.locale.test.ts",
    "src/__tests__/www-tutor-screens-copy.adversarial.test.ts",
    "src/__tests__/www-tutor-reedy-claim.test.tsx",
    "src/__tests__/phase-5-pricing-legal.red.test.tsx",
]
# (name, group, edits). An edit is (file, old, new). Every occurrence of old is replaced.
MUTANTS = [
    ("S7-en-th", "round2", [
        (PRICING, "Packages start at 3,000 baht and adapt to the market.", "Packages start at 1,200 baht and adapt to the market."),
        (PRICING, "แพ็กเกจเริ่มต้นที่ 3,000 บาท และราคาอาจปรับตามตลาด", "แพ็กเกจเริ่มต้นที่ 1,200 บาท และราคาอาจปรับตามตลาด")]),
    ("S7-typo-3500-en-th", "round2", [
        (PRICING, "Packages start at 3,000 baht and adapt to the market.", "Packages start at 3,500 baht and adapt to the market."),
        (PRICING, "แพ็กเกจเริ่มต้นที่ 3,000 บาท และราคาอาจปรับตามตลาด", "แพ็กเกจเริ่มต้นที่ 3,500 บาท และราคาอาจปรับตามตลาด")]),
    ("S9A2-flip-en-th", "round2", [
        (PRICING, "A: No. Printed workbooks are priced separately, per book, by quotation.", "A: Yes. Printed workbooks are included in the school price."),
        (PRICING, "ไม่รวม เวิร์กบุ๊กฉบับพิมพ์คิดราคาแยกเป็นรายเล่ม โดยเสนอราคาแยกต่างหาก", "รวมอยู่ในราคาสำหรับโรงเรียนแล้ว เวิร์กบุ๊กฉบับพิมพ์ไม่คิดราคาเพิ่ม")]),
    ("P3-th", "round2", [
        (TUTOR, "เครื่องคำนวณในหน้านี้แสดงตัวอย่าง ทักมาคุยกับเราเรื่องกรณีของคุณเองได้", "เครื่องคำนวณในหน้านี้แสดงเงินที่คุณจะได้รับจริง")]),
    ("S9A3-en-th", "required", [
        (PRICING, 'Packages start at 3,000 baht."', 'Packages start at 1,200 baht."'),
        (PRICING, 'แพ็กเกจเริ่มต้นที่ 3,000 บาท"', 'แพ็กเกจเริ่มต้นที่ 1,200 บาท"')]),
    ("F5body3-en-th", "required", [
        (FEATURE, "Class packages start at 3,000 baht. Prices adapt to the market.", "Class packages start at 3,000 baht. Prices never change."),
        (FEATURE, "แพ็กเกจคลาสเริ่มต้นที่ 3,000 บาท ราคาอาจปรับตามตลาด", "แพ็กเกจคลาสเริ่มต้นที่ 3,000 บาท ราคาไม่เปลี่ยนแปลง")]),
    ("N1-S1body2-en-th", "sample", [
        (PRICING, "The school price covers the app, teacher training and support. Printed workbooks are priced separately.", "The school price covers the app only. Printed workbooks are included."),
        (PRICING, "ราคาสำหรับโรงเรียนรวมแอป การอบรมครู และการสนับสนุนแล้ว ส่วนเวิร์กบุ๊กฉบับพิมพ์คิดราคาแยกต่างหาก", "ราคาสำหรับโรงเรียนรวมแอปเท่านั้น ส่วนเวิร์กบุ๊กฉบับพิมพ์รวมอยู่ในราคาแล้ว")]),
    ("N2-S5body-en-th", "sample", [
        (PRICING, "Printed workbooks are priced per book, by quotation.", "Printed workbooks are priced per class, by price list."),
        (PRICING, "เวิร์กบุ๊กฉบับพิมพ์คิดราคาเป็นรายเล่ม โดยเสนอราคาแยกต่างหาก", "เวิร์กบุ๊กฉบับพิมพ์คิดราคาเป็นรายคลาส ตามรายการราคา")]),
    ("N3-ReedyPackage-en-th", "sample", [
        (TUTOR, "Students with an active Tutor Advantage class package, on the lessons they finished.", "Students on any lesson."),
        (TUTOR, "การฝึกพูดกับ Reedy เปิดให้นักเรียนที่มีแพ็กเกจคลาสที่ยังใช้งานอยู่ใช้ได้ ในบทเรียนที่เรียนจบแล้ว", "การฝึกพูดกับ Reedy เปิดให้นักเรียนทุกคนใช้ได้ในทุกบทเรียน")]),
]


def main():
    only = sys.argv[1:]
    w = tempfile.mkdtemp(prefix="adv-p1-r3-")
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
    for t in TEST_SET:
        assert os.path.exists(f"{c}/{t}"), t

    def run(label):
        env = dict(os.environ, CI="true")
        p = subprocess.run([w + "/node_modules/.bin/vitest", "run", "--maxWorkers=3", "--reporter=dot", *TEST_SET],
                           capture_output=True, text=True, env=env, cwd=c, timeout=600)
        out = p.stdout + p.stderr
        fails = sorted(set(re.findall(r"FAIL\s+(\S+) > (.+)", out)))
        m = re.search(r"^\s+Tests\s+\d.*$", out, re.M)
        print(f"RESULT run={label} exit={p.returncode} {m.group(0).strip() if m else 'n/a'}")
        return p.returncode, fails

    rc0, control = run("control")
    print(f"INFO control_exit={rc0} control_failures={len(control)} test_files={len(TEST_SET)}")
    summary = []
    for name, group, edits in MUTANTS:
        if only and name not in only:
            continue
        originals = {}
        counts = []
        for rel, old, new in edits:
            p = f"{c}/{rel}"
            s = open(p, encoding="utf-8").read()
            originals.setdefault(rel, s)
            n = s.count(old)
            assert n >= 1, (name, rel, old[:50])
            counts.append(n)
            open(p, "w", encoding="utf-8").write(s.replace(old, new))
        rc, fails = run(name)
        for rel, s in originals.items():
            open(f"{c}/{rel}", "w", encoding="utf-8").write(s)
        extra = [f for f in fails if f not in control]
        for f, t in extra:
            print(f"   NEW_FAIL {f.split('/')[-1]} > {t}")
        caught = bool(extra)
        summary.append((name, group, caught))
        print(f"VERDICT mutant={name} group={group} occurrences_replaced={counts} caught_by_head_tests={len(extra)} caught={caught}")
    print(f"VERDICT all_caught={all(c_ for _, _, c_ in summary)} n={len(summary)}")
    shutil.rmtree(w, ignore_errors=True)
    print("INFO workdir removed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
