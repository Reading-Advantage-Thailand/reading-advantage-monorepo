"""Mutation harness for finding ADV-P1-1 (Phase 1 adversarial pass).

Question: does the suite fail when the Thai commission-model FAQ sentence is changed?
The sentence says tutors settle monthly and the rate rises with network volume.
Classification.md put its two en/th pins in a D5 row ("exact prose pins").

The harness copies two test files at two commits into a temp directory outside the repo.
It aliases the locale module to a mutated copy. It runs Vitest on four test files per mutant.
It writes nothing under the repo. It edits no production file.

Run: python3 -I measure/runs/www_test_audit_pilot_20261122/adversarial-p1-51252ca-thai-claim-harness.py
Output: one labeled line per (mutant, test version): label, exit code, failing test names.
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
EN_OLD = "the system settles it monthly. The rate rises with the network volume of the month."
EN_NEW = "the system settles it yearly. The rate stays flat whatever the network volume."
TH_OLD = "ระบบสรุปยอดให้ทุกเดือน อัตราจะสูงขึ้นตามยอดรวมของเครือข่ายในเดือนนั้น"
TH_NEW = "ระบบสรุปยอดให้ทุกปี อัตราคงที่ไม่ขึ้นกับยอดรวมของเครือข่าย"


def git_show(rev, path):
    r = subprocess.run(["git", "-C", ROOT, "show", f"{rev}:apps/www-reading-advantage/{path}"], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"git show failed for {rev}:{path}")
    return r.stdout


def main():
    tmp = tempfile.mkdtemp(prefix="adv-p1-harness-")
    os.makedirs(tmp + "/mods")
    for ver in ("head", "p1"):
        os.makedirs(f"{tmp}/tests/{ver}")
    os.symlink(ROOT + "/node_modules", tmp + "/node_modules")
    base = git_show("HEAD", LOCALE_MODULE)
    assert base.count(EN_OLD) == 2, base.count(EN_OLD)  # en dict and zh dict (zh equals en by D-10)
    assert base.count(TH_OLD) == 1, base.count(TH_OLD)
    i = base.index(EN_OLD)
    mods = {
        "base": base,
        "en-only": base[:i] + EN_NEW + base[i + len(EN_OLD):],
        "en-and-zh": base.replace(EN_OLD, EN_NEW),
        "th-only": base.replace(TH_OLD, TH_NEW),
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
            m = re.search(r"Tests\s+(?:(\d+) failed \| )?(\d+) passed \((\d+)\)", out)
            results[(mut, ver)] = (r.returncode, fails)
            print(f"RESULT mutant={mut} tests={ver} exit={r.returncode} summary={m.group(0) if m else 'n/a'}")
            for f in fails:
                print(f"   FAIL {f}")
    # verdicts
    def passes(mut, ver):
        return results[(mut, ver)][0] == 0
    print()
    print(f"VERDICT control_base_head_passes={passes('base', 'head')} control_base_p1_passes={passes('base', 'p1')}")
    print(f"VERDICT th_only_caught_by_p1_tests={not passes('th-only', 'p1')} th_only_caught_by_head_tests={not passes('th-only', 'head')}")
    print(f"VERDICT en_only_caught_by_head_tests={not passes('en-only', 'head')} (indirect: zh equals en)")
    print(f"VERDICT en_and_zh_caught_by_head_tests={not passes('en-and-zh', 'head')} (zh pinned to the en literal)")
    survived = passes("th-only", "head") and not passes("th-only", "p1")
    print(f"VERDICT thai_claim_unpinned_at_head={survived}")
    return 0 if survived else 1


if __name__ == "__main__":
    sys.exit(main())
