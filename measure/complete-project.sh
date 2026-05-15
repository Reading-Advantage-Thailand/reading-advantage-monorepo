#!/usr/bin/env bash
# measure/complete-project.sh
#
# Automates production for remaining incomplete codecamp-advantage phases.
# Auto-discovers codecamp tracks from measure/tracks/, skips completed phases,
# and runs three steps per incomplete phase:
#   1. Implementation  -- opencode / qwen3.6-plus-free
#   2. Review          -- kimi CLI
#   3. Final review    -- opencode / glm-5.1  (also clears codecamp tech-debt items)
#
# Usage:
#   chmod +x measure/complete-project.sh
#   ./measure/complete-project.sh              # run all incomplete phases
#   ./measure/complete-project.sh --start 2    # start from the 2nd incomplete phase
#   ./measure/complete-project.sh --dry-run     # preview without executing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# -- Auto-discover codecamp tracks from measure/tracks/ ----------------------
# Scans for directories matching "codecamp_*" in measure/tracks/ only
# (archive is excluded -- completed tracks are already done). Sorted
# chronologically since the _YYYYMMDD suffix encodes creation order.
mapfile -t CODECAMP_TRACKS < <(
  for dir in "$REPO_ROOT/measure/tracks"/codecamp_*/; do
    [ -d "$dir" ] || continue
    basename "$dir"
  done | sort -t_ -k3
)

# Codecamp-relevant paths (passed to prompts so models stay scoped)
CODECAMP_PATHS="apps/codecamp-advantage/, packages/domain/src/codecamp/, packages/api/src/routers/codecamp.ts, packages/db/src/schema/codecamp.ts, packages/types/src/codecamp.ts, packages/webhooks/src/, packages/codecamp-advantage/"

# Test commands for codecamp packages (used in review prompts)
CODECAMP_TESTS="pnpm turbo run test --filter=@reading-advantage/domain && pnpm turbo run test --filter=@reading-advantage/api && pnpm turbo run test --filter=@reading-advantage/webhooks && pnpm turbo run test --filter=codecamp-advantage"

# -- Parse arguments ----------------------------------------------------------
START_PHASE=1
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --start)
      START_PHASE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--start N] [--dry-run]"
      echo ""
      echo "  --start N    Start from the Nth incomplete phase (1-based)"
      echo "  --dry-run    Print the plan without executing any commands"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

# -- Discover incomplete phases using Python -----------------------------------
# Pass track list as a comma-separated argument to avoid bash/Python quoting issues.
TRACKS_CSV="$(IFS=,; echo "${CODECAMP_TRACKS[*]}")"
PHASE_DATA="$(python3 -c "
import re, os, sys

tracks = sys.argv[1].split(',')
repo = sys.argv[2]

for tid in tracks:
    plan_path = os.path.join(repo, 'measure', 'tracks', tid, 'plan.md')
    if not os.path.isfile(plan_path):
        continue
    text = open(plan_path).read()
    phases = re.split(r'(?=^## Phase )', text, flags=re.MULTILINE)
    for phase in phases:
        heading_match = re.match(r'^## (Phase .+)', phase, re.MULTILINE)
        if not heading_match:
            continue
        heading_line = heading_match.group(0)
        # Count top-level tasks only (not indented sub-tasks).
        incomplete = len(re.findall(r'^- \[[ ~]\]', phase, re.MULTILINE))
        total = len(re.findall(r'^- \[', phase, re.MULTILINE))
        if incomplete > 0:
            display = re.sub(r'^## ', '', heading_line)
            display = re.sub(r' *\[checkpoint:[^\]]*\]', '', display)
            display = re.sub(r' *\[final-verification:[^\]]*\]', '', display)
            print(f'{tid}|{display}|{incomplete}|{total}')
" "$TRACKS_CSV" "$REPO_ROOT")"

if [[ -z "$PHASE_DATA" ]]; then
  echo ""
  echo "All codecamp phases are already complete! Nothing to run."
  exit 0
fi

# -- Build arrays from Python output ------------------------------------------
declare -a TRACK_ID=()
declare -a PHASE_HEADING=()
declare -a PHASE_INCOMPLETE=()
declare -a PHASE_TOTAL=()

while IFS='|' read -r tid heading incomplete total; do
  TRACK_ID+=("$tid")
  PHASE_HEADING+=("$heading")
  PHASE_INCOMPLETE+=("$incomplete")
  PHASE_TOTAL+=("$total")
done <<< "$PHASE_DATA"

TOTAL_PHASES=${#TRACK_ID[@]}

# -- Validate --start argument ------------------------------------------------
if [[ $START_PHASE -lt 1 ]] || [[ $START_PHASE -gt $TOTAL_PHASES ]]; then
  echo "ERROR: --start must be between 1 and $TOTAL_PHASES"
  exit 1
fi

# -- Print header -------------------------------------------------------------
echo ""
echo "+--------------------------------------------------------------+"
echo "|   Reading Advantage -- Codecamp Production Loop              |"
echo "+--------------------------------------------------------------+"
echo ""
echo "Incomplete phases found: $TOTAL_PHASES (completed phases are skipped)"
echo ""

for i in $(seq 0 $((TOTAL_PHASES - 1))); do
  num=$((i + 1))
  if [[ $num -lt $START_PHASE ]]; then
    echo "  [$num] ${TRACK_ID[$i]} -- ${PHASE_HEADING[$i]}  (${PHASE_INCOMPLETE[$i]}/${PHASE_TOTAL[$i]} tasks remaining)  (skipped)"
  else
    echo "  [$num] ${TRACK_ID[$i]} -- ${PHASE_HEADING[$i]}  (${PHASE_INCOMPLETE[$i]}/${PHASE_TOTAL[$i]} tasks remaining)"
  fi
done

echo ""

if [[ $DRY_RUN == true ]]; then
  echo "DRY RUN -- no commands will be executed."
  echo "Would start from incomplete phase $START_PHASE."
  exit 0
fi

# -- Main production loop -----------------------------------------------------
for i in $(seq "$START_PHASE" "$TOTAL_PHASES"); do
  idx=$((i - 1))
  track_id="${TRACK_ID[$idx]}"
  phase_heading="${PHASE_HEADING[$idx]}"
  plan_file="measure/tracks/$track_id/plan.md"

  echo "=============================================================="
  echo "  Phase $i of $TOTAL_PHASES: $phase_heading"
  echo "  Track:  $track_id"
  echo "  Plan:   $plan_file"
  echo "  Tasks:  ${PHASE_INCOMPLETE[$idx]}/${PHASE_TOTAL[$idx]} remaining"
  echo "=============================================================="
  echo ""

  # -- Step 1: Implementation (opencode / qwen3.6-plus-free) ----------------
  echo ">>> [Step 1/3] Implementation with opencode/qwen3.6-plus-free"
  echo ""

  STEP1_PROMPT="Load the measure skill. Read the project context from measure/index.md and the current track plan from ${plan_file}. Implement ${phase_heading} of the codecamp-advantage track (track ID: ${track_id}). Work ONLY in the codecamp-advantage codebase -- specifically: ${CODECAMP_PATHS}). Do NOT modify other projects in this monorepo (no reading-advantage, primary-advantage, science-advantage, or www-reading-advantage changes). Follow the measure workflow from measure/workflow.md: find the next uncompleted task in the phase, mark it as in-progress [~], write failing tests first (Red phase), implement to pass tests (Green phase), refactor, verify coverage, commit with a descriptive message following Conventional Commits, and update plan.md with the commit SHA. Repeat for all tasks in this phase. Use the kimi-webbridge skill to manually check your work against the running application. When all tasks in the phase are done, execute the phase completion verification and checkpointing protocol from measure/workflow.md: run lint, type-check, and tests for all affected packages, spawn a change-quality-reviewer for the phase diff, and propose a manual verification plan."

  opencode run -m deepseek/deepseek-v4-flash "${STEP1_PROMPT}"

  echo ""
  echo ">>> Step 1 complete for: ${phase_heading}"
  echo ""

  # -- Step 2: Review (kimi) -----------------------------------------------
  echo ">>> [Step 2/3] Review with kimi"
  echo ""

  STEP2_PROMPT="Load the measure skill. Read the current track plan from ${plan_file} and review the just-completed phase: ${phase_heading} of the codecamp-advantage project (track ID: ${track_id}). Use the kimi-webbridge skill to visually verify the changes in the running application at localhost:3000. Check for: (1) correctness -- does the implementation match the plan task descriptions?, (2) missing test coverage -- are all new functions and edge cases tested?, (3) style guide violations -- does the code follow measure/code_styleguides/?, (4) security issues -- any auth bypasses, injection vectors, or exposed secrets?, (5) deviations from the plan -- any tasks marked done but not fully implemented? Fix any simple issues directly (typos, missing null checks, obvious bugs, test gaps). For any laborious fixes that would take significant time, add them to measure/tech-debt.md with: date (today), track ID '${track_id}', a description of the issue, severity level (Critical/High/Medium/Low), and status 'Open'. Keep tech-debt.md at or below 50 lines -- prune resolved items first if needed. After fixes, run: ${CODECAMP_TESTS}"

  kimi -y -p "${STEP2_PROMPT}"

  echo ""
  echo ">>> Step 2 complete for: ${phase_heading}"
  echo ""

  # -- Step 3: Final review + tech-debt clearance (opencode / glm-5.1) ------
  echo ">>> [Step 3/3] Second review and tech-debt clearance with opencode-go/glm-5.1"
  echo ""

  STEP3_PROMPT="Load the measure skill. Perform a final review of the just-completed phase: ${phase_heading} of the codecamp-advantage project (track ID: ${track_id}). Read the track plan from ${plan_file} to verify all tasks are properly marked [x] and all checkpoint SHAs are recorded. Then review measure/tech-debt.md and resolve all items related to codecamp-advantage: (1) If the issue has been fixed in the just-completed phase, change its status to 'Resolved' and add a brief note. (2) If it is a quick fix you can do in under 5 minutes, fix it now, test it, commit, and mark it 'Resolved'. (3) If it requires significant work, leave it as 'Open' but add a brief note about why it is deferred. After processing tech-debt items, run the full quality gate: pnpm turbo run lint --filter=codecamp-advantage, pnpm turbo run check-types --filter=codecamp-advantage, and the full codecamp test suite (${CODECAMP_TESTS}). Ensure all tests pass with zero failures. Commit any changes with an appropriate message following Conventional Commits format."

  opencode run -m opencode-go/glm-5.1 "${STEP3_PROMPT}"

  echo ""
  echo ">>> Step 3 complete for: ${phase_heading}"
  echo ""
  echo "  Phase $i of $TOTAL_PHASES done."
  echo ""
done

echo ""
echo "+--------------------------------------------------------------+"
echo "|   All $TOTAL_PHASES incomplete phases complete!               |"
echo "+--------------------------------------------------------------+"
echo ""
