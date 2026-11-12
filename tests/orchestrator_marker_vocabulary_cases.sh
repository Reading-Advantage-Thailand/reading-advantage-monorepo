#!/usr/bin/env bash
# Cases for tests/orchestrator_marker_vocabulary.sh.
# Each case builds its own root in a temporary folder, copies the guard to
# <tmp>/tests/, writes fixtures under <tmp>/measure/, and removes <tmp> at the end.
# No fixture enters measure/tracks/.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GUARD_SRC="$ROOT/tests/orchestrator_marker_vocabulary.sh"

CASES_TOTAL=0
CASES_FAILED=0
FAILED_NAMES=""
tmp_root=""
case_fail_reason=""
guard_rc=0

pass_case() {
  printf 'CASE %s: PASS\n' "$1"
}

fail_case() {
  printf 'CASE %s: FAIL (%s)\n' "$1" "$2"
  if [ -z "$FAILED_NAMES" ]; then
    FAILED_NAMES="$1"
  else
    FAILED_NAMES="$FAILED_NAMES,$1"
  fi
}

write_plan() {
  local rel="$1"
  local content="$2"
  mkdir -p "$tmp_root/$(dirname "$rel")"
  printf '%s\n' "$content" >"$tmp_root/$rel"
}

run_guard() {
  guard_rc=0
  bash "$tmp_root/tests/orchestrator_marker_vocabulary.sh" "$@" \
    >"$tmp_root/stdout.txt" 2>"$tmp_root/stderr.txt"
  guard_rc=$?
}

has_literal() {
  grep -qF -- "$2" "$1"
}

# Case clean_active_exits_0: one active fixture with the pending marker.
case_clean_active_exits_0() {
  write_plan "measure/tracks/fixture_clean_20260101/plan.md" "- [ ] 1.1 task"
  run_guard
  if [ "$guard_rc" -ne 0 ]; then
    case_fail_reason="expected exit 0, got exit ${guard_rc}"
    return
  fi
  if ! has_literal "$tmp_root/stdout.txt" 'PASS: all active track plans use only [ ], [~], [x], or [b] task markers (1 plans checked)'; then
    case_fail_reason="missing the pinned PASS line with (1 plans checked)"
  fi
}

# Case unknown_marker_exits_1: one active fixture with an unknown marker.
case_unknown_marker_exits_1() {
  write_plan "measure/tracks/fixture_unknown_20260101/plan.md" "- [?] 1.1 task"
  run_guard
  if [ "$guard_rc" -ne 1 ]; then
    case_fail_reason="expected exit 1, got exit ${guard_rc}"
    return
  fi
  if ! has_literal "$tmp_root/stderr.txt" 'FAIL: unsupported task marker [?] in'; then
    case_fail_reason="missing the pinned FAIL line for [?]"
    return
  fi
  if ! has_literal "$tmp_root/stderr.txt" 'measure/tracks/fixture_unknown_20260101/plan.md'; then
    case_fail_reason="FAIL line does not name the fixture plan path"
  fi
}

# Case canonical_markers_exit_0: the three accepted markers pass.
case_canonical_markers_exit_0() {
  write_plan "measure/tracks/fixture_canonical_20260101/plan.md" \
    "$(printf '%s\n' '- [~] 1.1 task' '- [x] 1.2 task' '- [b] deferred:daniel 1.3 task')"
  run_guard
  if [ "$guard_rc" -ne 0 ]; then
    case_fail_reason="expected exit 0, got exit ${guard_rc}"
    return
  fi
  if has_literal "$tmp_root/stdout.txt" 'FAIL:' || has_literal "$tmp_root/stderr.txt" 'FAIL:'; then
    case_fail_reason="output holds a FAIL: substring"
  fi
}

# Case track_scope_exits_0: --track reads only the named clean plan.
case_track_scope_exits_0() {
  write_plan "measure/tracks/fixture_scope_clean_20260101/plan.md" "- [x] 1.1 task"
  write_plan "measure/tracks/fixture_scope_dirty_20260101/plan.md" "- [?] 1.1 task"
  run_guard --track fixture_scope_clean_20260101
  if [ "$guard_rc" -ne 0 ]; then
    case_fail_reason="expected exit 0, got exit ${guard_rc}"
    return
  fi
  if has_literal "$tmp_root/stdout.txt" 'FAIL:' || has_literal "$tmp_root/stderr.txt" 'FAIL:'; then
    case_fail_reason="output holds a FAIL: substring"
  fi
}

# Case archive_excluded_exits_0: no argument reads active plans only.
case_archive_excluded_exits_0() {
  write_plan "measure/archive/fixture_archived_20260103/plan.md" "- [?] 1.1 task"
  write_plan "measure/tracks/fixture_active_20260102/plan.md" "- [x] 1.1 task"
  run_guard
  if [ "$guard_rc" -ne 0 ]; then
    case_fail_reason="expected exit 0, got exit ${guard_rc}"
    return
  fi
  if has_literal "$tmp_root/stdout.txt" 'FAIL:' || has_literal "$tmp_root/stderr.txt" 'FAIL:'; then
    case_fail_reason="output holds a FAIL: substring"
  fi
}

# Case markers_outside_set_exit_1: each near-miss marker fails the guard.
case_markers_outside_set_exit_1() {
  local markers=( '?' 'X' '!' '-' '.' '1' 'a' )
  local marker
  local markers_checked=0
  if [ "${#markers[@]}" -ne 7 ]; then
    case_fail_reason="markers_checked=${#markers[@]} expected=7"
    return
  fi
  for marker in "${markers[@]}"; do
    rm -rf "$tmp_root/measure/tracks/fixture_marker_20260104"
    write_plan "measure/tracks/fixture_marker_20260104/plan.md" "- [$marker] 1.1 task"
    run_guard
    markers_checked=$((markers_checked + 1))
    if [ "$guard_rc" -ne 1 ]; then
      case_fail_reason="marker [${marker}]: expected exit 1, got exit ${guard_rc}"
      return
    fi
    if ! has_literal "$tmp_root/stderr.txt" "FAIL: unsupported task marker [$marker] in"; then
      case_fail_reason="marker [${marker}]: missing the pinned FAIL line"
      return
    fi
    if has_literal "$tmp_root/stdout.txt" 'PASS:'; then
      case_fail_reason="marker [${marker}]: PASS line printed on stdout"
      return
    fi
  done
  if [ "$markers_checked" -ne 7 ]; then
    case_fail_reason="markers_checked=${markers_checked} expected=7"
  fi
}

# Case two_offenders_two_fail_lines: two hits give two FAIL lines.
case_two_offenders_two_fail_lines() {
  local fail_lines=0
  write_plan "measure/tracks/fixture_two_offenders_20260105/plan.md" \
    "$(printf '%s\n' '- [?] 1.1 task' '- [!] 1.2 task')"
  run_guard
  if [ "$guard_rc" -ne 1 ]; then
    case_fail_reason="expected exit 1, got exit ${guard_rc}"
    return
  fi
  fail_lines="$(grep -c '^FAIL: unsupported task marker' "$tmp_root/stderr.txt")"
  if [ "$fail_lines" -ne 2 ]; then
    case_fail_reason="fail_lines=${fail_lines} expected=2"
    return
  fi
  if ! has_literal "$tmp_root/stderr.txt" 'unsupported task marker [?] in'; then
    case_fail_reason="no FAIL line for [?]"
    return
  fi
  if ! has_literal "$tmp_root/stderr.txt" 'unsupported task marker [!] in'; then
    case_fail_reason="no FAIL line for [!]"
  fi
}

# Case fail_on_stderr_pass_on_stdout: streams stay apart.
case_fail_on_stderr_pass_on_stdout() {
  write_plan "measure/tracks/fixture_stream_clean_20260106/plan.md" "- [ ] 1.1 task"
  run_guard
  if [ "$guard_rc" -ne 0 ]; then
    case_fail_reason="clean run: expected exit 0, got exit ${guard_rc}"
    return
  fi
  if ! has_literal "$tmp_root/stdout.txt" 'PASS: all active track plans use only [ ], [~], [x], or [b] task markers'; then
    case_fail_reason="clean run: missing the PASS line on stdout"
    return
  fi
  if [ -s "$tmp_root/stderr.txt" ]; then
    case_fail_reason="clean run: stderr is not empty"
    return
  fi
  rm -rf "$tmp_root/measure/tracks"
  mkdir -p "$tmp_root/measure/tracks"
  write_plan "measure/tracks/fixture_stream_dirty_20260106/plan.md" "- [?] 1.1 task"
  run_guard
  if [ "$guard_rc" -ne 1 ]; then
    case_fail_reason="offending run: expected exit 1, got exit ${guard_rc}"
    return
  fi
  if ! has_literal "$tmp_root/stderr.txt" 'FAIL:'; then
    case_fail_reason="offending run: no FAIL: on stderr"
    return
  fi
  if has_literal "$tmp_root/stdout.txt" 'FAIL:'; then
    case_fail_reason="offending run: FAIL: printed on stdout"
  fi
}

# Case two_plans_count_two: the PASS line counts two plans.
case_two_plans_count_two() {
  write_plan "measure/tracks/fixture_count_a_20260107/plan.md" "- [ ] 1.1 task"
  write_plan "measure/tracks/fixture_count_b_20260108/plan.md" "- [ ] 1.1 task"
  run_guard
  if [ "$guard_rc" -ne 0 ]; then
    case_fail_reason="expected exit 0, got exit ${guard_rc}"
    return
  fi
  if ! has_literal "$tmp_root/stdout.txt" 'task markers (2 plans checked)'; then
    case_fail_reason="PASS line does not hold (2 plans checked)"
  fi
}

# Case prose_bracket_not_flagged: a bracket in prose is not a task marker.
case_prose_bracket_not_flagged() {
  write_plan "measure/tracks/fixture_prose_20260109/plan.md" \
    "$(printf '%s\n' '- [x] 1.1 task' '  - nested see [a] below' 'Prose [?] in the middle of a line')"
  run_guard
  if [ "$guard_rc" -ne 0 ]; then
    case_fail_reason="expected exit 0, got exit ${guard_rc}"
    return
  fi
  if has_literal "$tmp_root/stdout.txt" 'FAIL:' || has_literal "$tmp_root/stderr.txt" 'FAIL:'; then
    case_fail_reason="output holds a FAIL: substring"
  fi
}

# Case indented_marker_ignored: only top-level task lines count.
case_indented_marker_ignored() {
  write_plan "measure/tracks/fixture_indent_20260110/plan.md" \
    "$(printf '%s\n' '- [x] 1.1 task' '  - [?] 1.2 nested')"
  run_guard
  if [ "$guard_rc" -ne 0 ]; then
    case_fail_reason="expected exit 0, got exit ${guard_rc}"
    return
  fi
  if has_literal "$tmp_root/stdout.txt" 'FAIL:' || has_literal "$tmp_root/stderr.txt" 'FAIL:'; then
    case_fail_reason="output holds a FAIL: substring"
  fi
}

# Case usage_error_exits_2: --track with no id is a usage error.
case_usage_error_exits_2() {
  run_guard --track
  if [ "$guard_rc" -ne 2 ]; then
    case_fail_reason="expected exit 2, got exit ${guard_rc}"
    return
  fi
  if ! has_literal "$tmp_root/stderr.txt" 'Usage:'; then
    case_fail_reason="stderr does not hold Usage:"
  fi
}

# Case empty_scope_exits_1: an empty scope is a failure, not a pass.
case_empty_scope_exits_1() {
  run_guard
  if [ "$guard_rc" -ne 1 ]; then
    case_fail_reason="expected exit 1, got exit ${guard_rc}"
    return
  fi
  if ! has_literal "$tmp_root/stderr.txt" 'FAIL: no plan.md found'; then
    case_fail_reason="stderr does not hold FAIL: no plan.md found"
  fi
}

# Case track_archive_first_exits_1: --track reads measure/archive first.
case_track_archive_first_exits_1() {
  write_plan "measure/archive/fixture_archived_20260103/plan.md" "- [?] 1.1 task"
  run_guard --track fixture_archived_20260103
  if [ "$guard_rc" -ne 1 ]; then
    case_fail_reason="expected exit 1, got exit ${guard_rc}"
    return
  fi
  if ! has_literal "$tmp_root/stderr.txt" 'FAIL: unsupported task marker [?] in'; then
    case_fail_reason="missing the pinned FAIL line for [?]"
  fi
}

run_case() {
  local name="$1"
  CASES_TOTAL=$((CASES_TOTAL + 1))
  case_fail_reason=""
  tmp_root="$(mktemp -d /tmp/orchestrator-marker-cases.XXXXXX)" || {
    fail_case "$name" "mktemp failed"
    CASES_FAILED=$((CASES_FAILED + 1))
    return
  }
  mkdir -p "$tmp_root/tests" "$tmp_root/measure/tracks"
  cp "$GUARD_SRC" "$tmp_root/tests/orchestrator_marker_vocabulary.sh"
  "case_$name"
  if [ -n "$case_fail_reason" ]; then
    fail_case "$name" "$case_fail_reason"
    CASES_FAILED=$((CASES_FAILED + 1))
  else
    pass_case "$name"
  fi
  rm -rf "$tmp_root"
}

# Adversarial cases (Phase 1)

# Case track_traversal_outside_root_exits_1: a --track value that resolves
# outside measure/tracks must not pass silently (finding F153). The fixture
# plan sits at <tmp>/measure/escapee_20260111/plan.md. The value
# ../escapee_20260111 resolves through measure/tracks/../ and leaves the
# tracks root. The guard must not print PASS for it.
case_track_traversal_outside_root_exits_1() {
  write_plan "measure/escapee_20260111/plan.md" "- [?] 1.1 task"
  run_guard --track ../escapee_20260111
  if [ "$guard_rc" -eq 0 ]; then
    case_fail_reason="traversal run: expected a non-zero exit, got exit 0"
    return
  fi
  if has_literal "$tmp_root/stdout.txt" 'PASS:'; then
    case_fail_reason="traversal run: PASS line printed on stdout"
  fi
}

run_case clean_active_exits_0
run_case unknown_marker_exits_1
run_case canonical_markers_exit_0
run_case track_scope_exits_0
run_case archive_excluded_exits_0
run_case markers_outside_set_exit_1
run_case two_offenders_two_fail_lines
run_case fail_on_stderr_pass_on_stdout
run_case two_plans_count_two
run_case prose_bracket_not_flagged
run_case indented_marker_ignored
run_case usage_error_exits_2
run_case empty_scope_exits_1
run_case track_archive_first_exits_1
run_case track_traversal_outside_root_exits_1

printf 'cases_total=%d cases_failed=%d\n' "$CASES_TOTAL" "$CASES_FAILED"
if [ -n "$FAILED_NAMES" ]; then
  printf 'failed_cases=%s\n' "$FAILED_NAMES"
fi
if [ "$CASES_TOTAL" -lt 14 ]; then
  printf 'FAIL: cases_total=%d is below the floor of 14\n' "$CASES_TOTAL" >&2
  exit 1
fi
if [ "$CASES_FAILED" -gt 0 ]; then
  exit 1
fi
exit 0
