#!/usr/bin/env bash
# Reproduces the subset run behind finding ADV-P1-1 (Phase 1 adversarial pass).
# It builds a throwaway copy of the www app in /tmp, applies the Thai mutation to the copy only,
# and runs the 51 HEAD test files that reference locale or tutor modules (not the full suite).
# It also runs the a1caa5803 version of www-tutor-calculator.locale.test.ts as a positive control.
# A control run without the mutation gives the baseline failure set (the copy lacks measure/tracks).
# Side effect: Vitest rewrites its gitignored results cache under apps/www-reading-advantage/node_modules/.vite.
# Run: bash measure/runs/www_test_audit_pilot_20261122/adversarial-p1-51252ca-subset-run.sh
set -euo pipefail
R=/home/daniebo/Desktop/rama-worktrees/www-test-audit
A=$R/apps/www-reading-advantage
W=$(mktemp -d /tmp/adv-p1-subset-XXXXXX)
C=$W/appcopy
mkdir -p "$C"
ln -s "$R/node_modules" "$W/node_modules"
for e in $(ls -A "$A"); do
  case "$e" in src|vitest.config.ts|node_modules|coverage|playwright-report|test-results|.claude-old|.opencode|cline_docs|revideo|docs|.github) ;; *) ln -s "$A/$e" "$C/$e";; esac
done
ln -s "$A/node_modules" "$C/node_modules"
cp -r "$A/src" "$C/src"
cp "$A/vitest.config.ts" "$C/vitest.config.ts"
(cd "$A" && grep -rlE "tutor-advantage|tutorAdvantage|locales/pages|from \"@/locales|locales/messages|dictionaries|stringLeaves" src --include='*.test.ts' --include='*.test.tsx') | sort > "$W/subset.txt"
echo "subset_files=$(wc -l < "$W/subset.txt")"
git -C "$R" show a1caa5803:apps/www-reading-advantage/src/__tests__/www-tutor-calculator.locale.test.ts > "$C/src/__tests__/p1-calc-positive-control.test.ts"
run() {
  (cd "$C" && CI=true timeout 900 "$W/node_modules/.bin/vitest" run --maxWorkers=2 --reporter=dot $(cat "$W/subset.txt") src/__tests__/p1-calc-positive-control.test.ts) > "$1" 2>&1 || true
}
run "$W/control.txt"
python3 -I - "$C/src/locales/pages/products/tutor-advantage.ts" <<'EOF'
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
old = "ระบบสรุปยอดให้ทุกเดือน อัตราจะสูงขึ้นตามยอดรวมของเครือข่ายในเดือนนั้น"
new = "ระบบสรุปยอดให้ทุกปี อัตราคงที่ไม่ขึ้นกับยอดรวมของเครือข่าย"
assert s.count(old) == 1
open(p, "w", encoding="utf-8").write(s.replace(old, new))
EOF
run "$W/mutant.txt"
python3 -I - "$W/control.txt" "$W/mutant.txt" <<'EOF'
import re, sys
def fails(p):
    return set(re.findall(r"FAIL\s+(\S+) > (.+)", open(p, encoding="utf-8").read()))
def summary(p):
    t = open(p, encoding="utf-8").read()
    return re.search(r"^\s+Tests\s+\d.*$", t, re.M).group(0).strip()
c, m = fails(sys.argv[1]), fails(sys.argv[2])
print("control :", summary(sys.argv[1]))
print("mutant  :", summary(sys.argv[2]))
print("failing only under the Thai mutation:")
for f, t in sorted(m - c):
    print("  ", f, ">", t)
print("only_positive_control_caught_it=", [f for f, _ in m - c] == ["src/__tests__/p1-calc-positive-control.test.ts"])
EOF
echo "workdir=$W (delete it when done)"
