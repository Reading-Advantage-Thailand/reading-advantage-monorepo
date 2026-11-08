#!/usr/bin/env bash
# Review A measurement: the strategy P3 Green gate `turbo_filters_ok=10`.
# Runs from apps/science-advantage (the working directory the gates expect) is not
# needed here; turbo ls works from the monorepo root.
set -u
cd /home/daniebo/Desktop/reading-advantage-monorepo
ok=0
for id in www-reading-advantage primary-advantage storytime accounting codecamp-advantage marketing sales-advantage accounts workbooks reading-advantage; do
  if pnpm exec turbo ls --filter="$id..." >/tmp/opencode/turbo-ls-$id.txt 2>&1; then
    n=$(grep -c . /tmp/opencode/turbo-ls-$id.txt)
    echo "turbo_filter $id=exit0 packages_lines=$n"
    ok=$((ok + 1))
  else
    echo "turbo_filter $id=FAILED"
  fi
done
echo "turbo_filters_ok=$ok"
