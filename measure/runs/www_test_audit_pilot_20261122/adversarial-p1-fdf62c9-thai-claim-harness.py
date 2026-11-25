"""Round 2 mutation harness for findings ADV-P1-1 and the live-line sample (Phase 1 adversarial pass).

Round 1 showed that the Thai text of the commission FAQ answer (faq.items.5.answer) had no test at
fdf62c97b's parent. Commit ca91946bf added an exact en and th test. This harness re-runs the mutants
against the current HEAD tests and against the a1caa5803 tests, and adds mutants for the second live
line (tutorRole.points.3, the calculator-shows-examples disclaimer).

It copies two test files at two commits into a temp directory outside the repo. It aliases the locale
module to a mutated copy and runs Vitest. It writes nothing under the repo. It edits no production file.

Run: python3 -I measure/runs/www_test_audit_pilot_20261122/adversarial-p1-fdf62c9-thai-claim-harness.py
Output: one RESULT line per (mutant, test version), then labeled VERDICT lines. Exit 0 when every
expectation holds (a gap shows as a VERDICT line with gap=True and still exits 0 so the log stays complete).
"""
import os
import re
import subprocess
import sys
import tempfile

ROOT = "/home/daniebo/Desktop/rama-worktrees/www-test-audit"
APP = ROOT + "/apps/www-reading-advantage"
P1 = "a1caa5803"
LOCALE_MODULE = "src/locales/pages/products/tutor-advantage.ts"
TESTS = {
    "calc": "src/__tests__/www-tutor-calculator.locale.test.ts",
    "screens-copy": "src/__tests__/www-tutor-screens-copy.adversarial.test.ts",
}
FAQ_EN = "the system settles it monthly. The rate rises with the network volume of the month."
FAQ_TH = "ระบบสรุปยอดให้ทุกเดือน อัตราจะสูงขึ้นตามยอดรวมของเครือข่ายในเดือนนั้น"
P3_EN = "The calculator on this page shows examples. Ask us about your own case."
P3_TH = "เครื่องคำนวณในหน้านี้แสดงตัวอย่าง ทักมาคุยกับเราเรื่องกรณีของคุณเองได้"


def git_show(rev, path):
    r = subprocess.run(["git", "-C", ROOT, "show", f"{rev}:apps/www-reading-advantage/{path}"], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"git show failed for {rev}:{path}")
    return r.stdout


def first(s, old, new):
    i = s.index(old)
    return s[:i] + new + s[i + len(old):]


def main():
    tmp = tempfile.mkdtemp(prefix="adv-p1-r2-harness-")
    os.makedirs(tmp + "/mods")
    for ver in ("head", "p1"):
        os.makedirs(f"{tmp}/tests/{ver}")
    os.symlink(ROOT + "/node_modules", tmp + "/node_modules")
    base = git_show("HEAD", LOCALE_MODULE)
    assert base.count(FAQ_EN) == 2 and base.count(FAQ_TH) == 1
    assert base.count(P3_EN) == 2 and base.count(P3_TH) == 1, (base.count(P3_EN), base.count(P3_TH))
    mods = {
        "base": base,
        "faq-th": base.replace(FAQ_TH, "ระบบสรุปยอดให้ทุกปี อัตราคงที่ไม่ขึ้นกับยอดรวมของเครือข่าย"),
        "faq-th-one-word": base.replace(FAQ_TH, FAQ_TH.replace("ทุกเดือน", "ทุกสัปดาห์")),
        "faq-en-only": first(base, FAQ_EN, "the system settles it yearly. The rate stays flat whatever the network volume."),
        "faq-en-one-word": first(base, FAQ_EN, FAQ_EN.replace("monthly", "weekly")),
        "faq-en-and-zh": base.replace(FAQ_EN, "the system settles it yearly. The rate stays flat whatever the network volume."),
        "points3-th": base.replace(P3_TH, "เครื่องคำนวณในหน้านี้แสดงเงินที่คุณจะได้รับจริง"),
        "points3-en-only": first(base, P3_EN, "The calculator on this page shows your exact payout."),
        "points3-en-and-zh": base.replace(P3_EN, "The calculator on this page shows your exact payout."),
    }
    for name, text in mods.items():
        open(f"{tmp}/mods/{name}.ts", "w", encoding="utf-8").write(text)
    for key, path in TESTS.items():
        open(f"{tmp}/tests/head/{key}.test.ts", "w", encoding="utf-8").write(git_show("HEAD", path))
        open(f"{tmp}/tests/p1/{key}.test.ts", "w", encoding="utf-8").write(git_show(P1, path))
    open(tmp + "/vitest.config.mjs", "w").write(
        f'''const app = "{APP}";
export default {{
  root: "{tmp}",
  cacheDir: "{tmp}/.cache",
  test: {{ environment: "node", include: ["tests/**/*.test.ts"] }},
  resolve: {{ alias: [
    {{ find: /^@\\/locales\\/pages\\/products\\/tutor-advantage$/, replacement: process.env.MUT_FILE }},
    {{ find: /^@\\//, replacement: app + "/src/" }},
  ] }},
}};
'''
    )
    results = {}
    for mut in mods:
        for ver in ("head", "p1"):
            env = dict(os.environ, MUT_FILE=f"{tmp}/mods/{mut}.ts", CI="true")
            r = subprocess.run(
                [tmp + "/node_modules/.bin/vitest", "run", "--config", tmp + "/vitest.config.mjs", f"tests/{ver}", "--reporter=dot"],
                capture_output=True, text=True, env=env, cwd=tmp, timeout=300,
            )
            out = r.stdout + r.stderr
            fails = sorted(set(re.findall(r"FAIL\s+tests/\S+ > (.+)", out)))
            m = re.search(r"^\s+Tests\s+\d.*$", out, re.M)
            results[(mut, ver)] = (r.returncode, fails)
            print(f"RESULT mutant={mut} tests={ver} exit={r.returncode} summary={m.group(0).strip() if m else 'n/a'}")
            for f in fails:
                print(f"   FAIL {f}")

    def caught(mut, ver):
        return results[(mut, ver)][0] != 0

    print()
    print(f"VERDICT control base_head_passes={not caught('base', 'head')} base_p1_passes={not caught('base', 'p1')}")
    for mut in mods:
        if mut == "base":
            continue
        print(f"VERDICT mutant={mut} caught_by_p1_tests={caught(mut, 'p1')} caught_by_head_tests={caught(mut, 'head')} gap={caught(mut, 'p1') and not caught(mut, 'head')}")
    faq_ok = all(caught(m, "head") for m in mods if m.startswith("faq-"))
    print(f"VERDICT adv_p1_1_all_faq_mutants_caught_by_head_tests={faq_ok}")
    named = [f for f in results[("faq-th", "head")][1] if "commission FAQ answer" in f]
    print(f"VERDICT faq_th_failing_case_is_the_restored_case={bool(named)} names={named}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
