#!/bin/bash
# Phase 5 shots against a running build on :3000. Usage: phase5.sh <outdir> <oldQuestId>
set -u
S=$(dirname "$0"); OUT=$1; OLD=$2; mkdir -p "$OUT"
cd "$S"
echo "== close the old quest"; node quest-move.mjs "$OLD" done 2>&1 | tail -1
echo "== stage a new quest in play"; node quest-stage.mjs play 2>&1 | tee "$OUT/../quest-stage.log" | tail -3
Q=$(grep -o 'QUEST [0-9a-f-]*' "$OUT/../quest-stage.log" | tail -1 | cut -d' ' -f2); echo "quest $Q"
echo "== shot 1 home + shot 4 battle (qa-student-a1)"; node capture.mjs "$OUT" qa-student-a1 shot1-home=/student/home shot4-battle=/student/quest/battle 2>&1 | tail -4
echo "== boss fall"; node boss-fall.mjs "$Q" 2>&1 | tail -4
echo "== shot 5 projector (teacher)"; node capture.mjs "$OUT" qa-teacher-a shot5-projector=/teacher/quest/$Q/live 2>&1 | tail -3
echo "== shot 2 picker (ton)"; CAP_PASSWORD="$DEMO_PASSWORD" node capture.mjs "$OUT" ton shot2-picker=/student/avatar#click:Knight 2>&1 | tail -3
echo "== shot 3 shop (ploy)"; node shot3.mjs "$OUT" ploy "$DEMO_PASSWORD" 2>&1 | tail -4
ls "$OUT" | wc -l
