#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Guards for the supervisor-side anti-patterns A1 and A8.
#
# A1 — substring-as-structured-signal: the supervisor must NOT use
#   `"deferred" in task.lower()` (a free-text substring check) to decide a task
#   is blocked. That check is exploited by plans that mention "deferred" in prose
#   to silently drop incomplete work. The supervisor must instead use the
#   structured helper is_task_structurally_blocked() (status 'b' or a trailing
#   `deferred:<owner>` field).
#
# A8 — marker regex: the supervisor task regex must be `^- \[([~xb])\]` (no
#   space character; `b` allowed). A `[ ]` (space) marker must NOT be recognized
#   as an in-progress task — it is the deprecated legacy form.
#
# Docstring mentions of these patterns are stripped before matching so that
# documenting the anti-pattern does not itself trip the guard.

sup="measure/automation-supervisor.py"
if [ ! -f "$sup" ]; then
  printf 'FAIL: %s not found\n' "$sup" >&2
  exit 1
fi

status=0

# A1: no substring-as-signal check in code (docstrings stripped).
a1_hits=$(python3 - <<'PY'
import re
src = open("measure/automation-supervisor.py").read()
code = re.sub(r'"""(.|\n)*?"""', "", src)
code = re.sub(r"'''(.|\n)*?'''", "", code)
# Match the banned substring-as-signal form. The structured helper uses a regex
# (\bdeferred:[\w.-]+), which is intentionally NOT matched here.
hits = re.findall(r'"deferred"\s+in\s+task\.lower\(\)', code)
print(len(hits))
PY
)
if [ "$a1_hits" != "0" ]; then
  printf 'FAIL: A1 — supervisor uses "deferred" in task.lower() substring check (%s occurrences); use is_task_structurally_blocked()\n' "$a1_hits" >&2
  status=1
fi

# A1 positive control: the structured helper MUST exist and be referenced.
if ! grep -q 'def is_task_structurally_blocked' "$sup"; then
  printf 'FAIL: A1 — is_task_structurally_blocked helper is missing from supervisor\n' >&2
  status=1
fi
if ! grep -q 'is_task_structurally_blocked(' "$sup"; then
  printf 'FAIL: A1 — is_task_structurally_blocked is defined but never called\n' >&2
  status=1
fi

# A8: the task regex must NOT accept a space marker; must accept ~, x, b.
# Reject any character class in a task regex that includes a space (e.g. `[ ~x]`).
if grep -nE 'r"[^"]*\\\[\[ ~x' "$sup" >/tmp/a8hits.$$ 2>/dev/null; then
  printf 'FAIL: A8 — supervisor task regex accepts legacy space marker ([ ]):\n' >&2
  cat /tmp/a8hits.$$ >&2
  status=1
fi
rm -f /tmp/a8hits.$$
# Positive control: the canonical character class `[~xb]` (no space) must be present.
if ! grep -qF '[~xb]' "$sup"; then
  printf 'FAIL: A8 — supervisor task regex does not use the canonical [~xb] character class\n' >&2
  status=1
fi

if [ "$status" -ne 0 ]; then
  exit "$status"
fi

printf 'PASS: supervisor invariants hold (A1 no substring-as-signal; A8 marker regex ~xb only)\n'
