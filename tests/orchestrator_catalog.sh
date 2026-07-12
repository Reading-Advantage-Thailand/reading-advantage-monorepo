#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

if [ ! -f measure/anti-patterns.md ]; then
  fail "measure/anti-patterns.md is required before orchestrated review tracks execute"
fi

for id in A1 A2 A3 A4 A5 A6 A7 A8 A9 A10 A11 A12 A13 A14 A15; do
  if ! grep -q "## ${id} " measure/anti-patterns.md; then
    fail "measure/anti-patterns.md is missing ${id}"
  fi
done

python3 - <<'PY'
import re
from pathlib import Path

catalog = Path("measure/anti-patterns.md").read_text(encoding="utf-8")
references = sorted({
    reference
    for line in catalog.splitlines()
    if line.startswith("**Guard:**")
    for reference in re.findall(r"tests/[A-Za-z0-9_./-]+\.sh", line)
})
missing = [reference for reference in references if not Path(reference).is_file()]
if missing:
    raise SystemExit("FAIL: A12 dangling Guard declarations: " + ", ".join(missing))

registry = Path("measure/tracks.md").read_text(encoding="utf-8")
stale = []
for directory in sorted(Path("measure/tracks").iterdir()):
    if not directory.is_dir():
        continue
    track_id = directory.name
    if f"./archive/{track_id}/" in registry and not (directory / "plan.md").is_file():
        stale.append(track_id)
if stale:
    raise SystemExit("FAIL: A13 stale archived directories under measure/tracks: " + ", ".join(stale))
print(f"PASS: A12/A13 guard declarations and archive directories verified ({len(references)} guards)")
PY

printf 'PASS: measure anti-pattern catalog exists with A1-A15\n'
