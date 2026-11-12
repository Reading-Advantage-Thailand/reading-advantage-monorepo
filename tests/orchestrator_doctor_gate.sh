#!/usr/bin/env bash
# Cases for the doctor gate: the behavior of measure/doctor.sh and the gate
# record of the track.
# Part A runs a copy of measure/doctor.sh in a temporary root. The root holds
# three stub guard scripts and a stub tsx at node_modules/.bin/tsx. The step 4
# command changes into packages/architecture-enforcement, so the stub tsx
# models the real call path of the CLI. No pnpm layer sits between the stub
# and the gate.
# Part B reads the gate record of the track through the track_dir_resolve
# helper, so the record stays readable after the archive move.
# Every case removes its own temporary root. No fixture enters the repository.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCTOR_SRC="$ROOT/measure/doctor.sh"
TRACK_ID="doctor_gate_repair_20261112"
PART_A_FLOOR=19
RECORD_LINES_FLOOR=8
TSX_ARGV="src/architecture-check-cli.ts --skip-input-snapshot-pin"
CLI_COMMAND="(cd packages/architecture-enforcement && ../../node_modules/.bin/tsx src/architecture-check-cli.ts --skip-input-snapshot-pin)"
DRIFT_LINE="Architecture check failed: V2 reconciliation manifest is invalid: Analyzer report hashes do not match current byte-identical reports"
OTHER_LINE="Architecture check failed: another failure"
VERDICT_LINE="architecture check: debt-change (files=12, findings=3, parseErrors=0)"
OWNER_CLAUSE="; the owner of the remaining drift is architecture_ci_input_pin_20261110"
KNOWN_DRIFT_CLAUSE="; the known manifest drift is owned by architecture_ci_input_pin_20261110"

CASES_TOTAL=0
CASES_FAILED=0
FAILED_NAMES=""
PART_A_TOTAL=0
PART_A_FAILED=0
PART_B_TOTAL=0
PART_B_FAILED=0
tmp_root=""
case_fail_reason=""
gate_rc=0
gate_output=""
record_path=""
record_lines=()

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

# track_dir_resolve: prefer measure/archive/<id> when it exists, then
# measure/tracks/<id>. The path is relative to ROOT.
track_dir_resolve() {
  local track_id="$1"
  if [ -d "$ROOT/measure/archive/$track_id" ]; then
    echo "measure/archive/$track_id"
  else
    echo "measure/tracks/$track_id"
  fi
}

# Part A helpers

write_stub_guard() {
  local guard_name="$1"
  local guard_code="$2"
  local guard_path="$tmp_root/tests/$guard_name"
  mkdir -p "$tmp_root/tests"
  {
    cat <<EOF
#!/usr/bin/env bash
printf 'PASS: stub guard $guard_name\n'
exit $guard_code
EOF
  } >"$guard_path"
  chmod +x "$guard_path"
}

write_all_guards() {
  local guard_code="$1"
  write_stub_guard "orchestrator_catalog.sh" "$guard_code"
  write_stub_guard "orchestrator_marker_vocabulary.sh" "$guard_code"
  write_stub_guard "orchestrator_review_execution_truthfulness.sh" "$guard_code"
}

# write_stub_tsx: the stub tsx sits at the path of the real step 4 command.
# It logs its argv in tsx.log at the root of the scratch tree and exits with
# the code that the case sets. It prints the case message on stderr when the
# case sets one, and the case stdout message when the case sets one. The real
# CLI writes the verdict line to stdout and the error line to stderr.
write_stub_tsx() {
  local tsx_code="$1"
  local tsx_path="$tmp_root/node_modules/.bin/tsx"
  mkdir -p "$tmp_root/node_modules/.bin"
  {
    cat <<EOF
#!/usr/bin/env bash
printf '%s\n' "\$*" >>"$tmp_root/tsx.log"
if [ -n "\${DOCTOR_GATE_TSX_MESSAGE:-}" ]; then
  printf '%s\n' "\$DOCTOR_GATE_TSX_MESSAGE" >&2
fi
if [ -n "\${DOCTOR_GATE_TSX_STDOUT:-}" ]; then
  printf '%s\n' "\$DOCTOR_GATE_TSX_STDOUT"
fi
exit $tsx_code
EOF
  } >"$tsx_path"
  chmod +x "$tsx_path"
}

# reset_tsx: remove the stub tsx and its log, and clear both case messages.
reset_tsx() {
  rm -rf "$tmp_root/node_modules" "$tmp_root/tsx.log"
  unset DOCTOR_GATE_TSX_MESSAGE
  unset DOCTOR_GATE_TSX_STDOUT
}

# run_gate: run the copy of doctor.sh in the scratch root. The PATH holds no
# pnpm and no tsx outside the scratch tree, so no real tool runs.
run_gate() {
  gate_output="$(cd "$tmp_root" && PATH="$tmp_root/bin:/usr/bin:/bin" bash measure/doctor.sh 2>&1)"
  gate_rc=$?
}

# tsx_is_absent: the scratch tree holds no step 4 tool.
tsx_is_absent() {
  if [ -x "$tmp_root/node_modules/.bin/tsx" ]; then
    return 1
  fi
  return 0
}

output_has() {
  case "$gate_output" in
    *"$1"*) return 0 ;;
    *) return 1 ;;
  esac
}

# output_has_line: the output holds a line that equals the literal. The
# pinned lines of FR-3 are whole lines.
output_has_line() {
  local wanted="$1"
  local line
  while IFS= read -r line; do
    if [ "$line" = "$wanted" ]; then
      return 0
    fi
  done <<<"$gate_output"
  return 1
}

# tsx_message_set_count: the number of stub message variables that hold a
# value. A count of 0 proves that no message leaks from an earlier case.
tsx_message_set_count() {
  local count=0
  if [ -n "${DOCTOR_GATE_TSX_MESSAGE:-}" ]; then
    count=$((count + 1))
  fi
  if [ -n "${DOCTOR_GATE_TSX_STDOUT:-}" ]; then
    count=$((count + 1))
  fi
  printf '%d\n' "$count"
}

tsx_call_count() {
  if [ -f "$tmp_root/tsx.log" ]; then
    grep -c '' "$tmp_root/tsx.log"
  else
    echo 0
  fi
}

# list_root_files: the sorted file list of the scratch root, apart from
# tsx.log, which the stub writes.
list_root_files() {
  local out=""
  local line
  while IFS= read -r line; do
    if [ "$line" = "./tsx.log" ]; then
      continue
    fi
    out="$out$line
"
  done < <(cd "$tmp_root" && find . -type f -print | LC_ALL=C sort)
  printf '%s' "$out"
}

# Case tsx_exit_1_gate_exits_0: a boundary verdict of 1 does not gate. The
# stub prints the whole verdict line on stderr, so the case probes the stderr
# stream.
case_tsx_exit_1_gate_exits_0() {
  write_all_guards 0
  write_stub_tsx 1
  export DOCTOR_GATE_TSX_MESSAGE="$VERDICT_LINE"
  run_gate
  if [ "$gate_rc" -ne 0 ]; then
    case_fail_reason="expected gate exit 0, got exit ${gate_rc}"
    return
  fi
  if ! output_has "ARCHITECTURE: step 4 exits 1; the owner of the remaining drift is architecture_ci_input_pin_20261110"; then
    case_fail_reason="the ARCHITECTURE line for exit 1 is missing"
    return
  fi
  if ! output_has 'DOCTOR: the three structural guard steps gate this exit code'; then
    case_fail_reason="the DOCTOR gate line is missing"
    return
  fi
  if output_has 'tool failure'; then
    case_fail_reason="the output holds a tool failure text"
    return
  fi
  if output_has 'did not produce a boundary verdict'; then
    case_fail_reason="the output holds a boundary verdict failure text"
  fi
}

# Case tsx_exit_0_gate_exits_0: a boundary verdict of 0 does not gate.
case_tsx_exit_0_gate_exits_0() {
  write_all_guards 0
  write_stub_tsx 0
  run_gate
  if [ "$gate_rc" -ne 0 ]; then
    case_fail_reason="expected gate exit 0, got exit ${gate_rc}"
    return
  fi
  if ! output_has "ARCHITECTURE: step 4 exits 0; the owner of the remaining drift is architecture_ci_input_pin_20261110"; then
    case_fail_reason="the ARCHITECTURE line for exit 0 is missing"
    return
  fi
  if ! output_has 'DOCTOR: the three structural guard steps gate this exit code'; then
    case_fail_reason="the DOCTOR gate line is missing"
    return
  fi
  if output_has 'tool failure'; then
    case_fail_reason="the output holds a tool failure text"
    return
  fi
  if output_has 'did not produce a boundary verdict'; then
    case_fail_reason="the output holds a boundary verdict failure text"
  fi
}

# guard_failure_run: one guard failure gates the exit and stops the
# architecture step.
guard_failure_run() {
  local failing_guard="$1"
  write_all_guards 0
  write_stub_guard "$failing_guard" 1
  write_stub_tsx 0
  run_gate
  if [ "$gate_rc" -ne 1 ]; then
    case_fail_reason="expected gate exit 1, got exit ${gate_rc}"
    return
  fi
  local calls
  calls="$(tsx_call_count)"
  if [ "$calls" -ne 0 ]; then
    case_fail_reason="tsx_calls=${calls} expected=0"
    return
  fi
  if output_has 'ARCHITECTURE:'; then
    case_fail_reason="the output holds an ARCHITECTURE line"
  fi
}

# Case guard_catalog_failure_gate_exits_1
case_guard_catalog_failure_gate_exits_1() {
  guard_failure_run "orchestrator_catalog.sh"
}

# Case guard_marker_failure_gate_exits_1
case_guard_marker_failure_gate_exits_1() {
  guard_failure_run "orchestrator_marker_vocabulary.sh"
}

# Case guard_truthfulness_failure_gate_exits_1
case_guard_truthfulness_failure_gate_exits_1() {
  guard_failure_run "orchestrator_review_execution_truthfulness.sh"
}

# Case tsx_exit_2_manifest_drift_gate_exits_0: the known manifest drift is
# the recorded drift, so the gate exit code does not depend on it.
case_tsx_exit_2_manifest_drift_gate_exits_0() {
  write_all_guards 0
  write_stub_tsx 2
  export DOCTOR_GATE_TSX_MESSAGE="$DRIFT_LINE"
  run_gate
  if [ "$gate_rc" -ne 0 ]; then
    case_fail_reason="expected gate exit 0, got exit ${gate_rc}"
    return
  fi
  if ! output_has "ARCHITECTURE: step 4 exits 2; the known manifest drift is owned by architecture_ci_input_pin_20261110"; then
    case_fail_reason="the known manifest drift ARCHITECTURE line is missing"
    return
  fi
  if ! output_has 'DOCTOR: the three structural guard steps gate this exit code'; then
    case_fail_reason="the DOCTOR gate line is missing"
    return
  fi
  if output_has 'tool failure'; then
    case_fail_reason="the output holds a tool failure text"
    return
  fi
  if output_has 'did not produce a boundary verdict'; then
    case_fail_reason="the output holds a boundary verdict failure text"
  fi
}

# Case tsx_exit_2_other_line_gate_exits_1: an exit 2 with any other output
# is a tool failure.
case_tsx_exit_2_other_line_gate_exits_1() {
  write_all_guards 0
  write_stub_tsx 2
  export DOCTOR_GATE_TSX_MESSAGE="$OTHER_LINE"
  run_gate
  if [ "$gate_rc" -ne 1 ]; then
    case_fail_reason="expected gate exit 1, got exit ${gate_rc}"
    return
  fi
  if ! output_has 'ARCHITECTURE: step 4 exits 2; this is a tool failure, not a boundary verdict'; then
    case_fail_reason="the tool failure ARCHITECTURE line is missing"
    return
  fi
  if ! output_has 'DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1'; then
    case_fail_reason="the tool failure DOCTOR line is missing"
    return
  fi
  if output_has 'DOCTOR: the three structural guard steps gate this exit code'; then
    case_fail_reason="the output holds the gate line on the tool failure path"
  fi
}

# Case tsx_exit_127_gate_exits_1: no step 4 tool on the path is a tool
# failure. The case asserts that the tool is absent before the gate runs.
case_tsx_exit_127_gate_exits_1() {
  write_all_guards 0
  reset_tsx
  if ! tsx_is_absent; then
    case_fail_reason="tsx_absent=0 expected=1, the scratch tree holds a step 4 tool"
    return
  fi
  run_gate
  if [ "$gate_rc" -ne 1 ]; then
    case_fail_reason="expected gate exit 1, got exit ${gate_rc}"
    return
  fi
  if ! output_has 'ARCHITECTURE: step 4 exits 127; this is a tool failure, not a boundary verdict'; then
    case_fail_reason="the tool failure ARCHITECTURE line for 127 is missing"
    return
  fi
  if ! output_has 'DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1'; then
    case_fail_reason="the tool failure DOCTOR line for 127 is missing"
    return
  fi
  if output_has 'DOCTOR: the three structural guard steps gate this exit code'; then
    case_fail_reason="the output holds the gate line on the tool failure path"
  fi
}

# Case tsx_argv_exact: the architecture command holds one call and the pinned
# argv.
case_tsx_argv_exact() {
  write_all_guards 0
  write_stub_tsx 0
  run_gate
  local calls
  calls="$(tsx_call_count)"
  if [ "$calls" -ne 1 ]; then
    case_fail_reason="tsx_calls=${calls} expected=1"
    return
  fi
  if ! grep -qxF -- "$TSX_ARGV" "$tmp_root/tsx.log"; then
    case_fail_reason="the tsx log does not hold the pinned argv"
    return
  fi
  if grep -qF -- 'architecture:pin:refresh' "$tmp_root/tsx.log"; then
    case_fail_reason="the tsx log holds the pin refresh command"
  fi
}

# Case tool_failure_codes: every code other than 0 and 1 is a tool failure.
# The loop runs the codes 2, 3, 126, and 137 with a stub, and the code 127
# with no stub.
case_tool_failure_codes() {
  local codes=( 2 3 126 137 127 )
  local codes_checked=0
  if [ "${#codes[@]}" -ne 5 ]; then
    case_fail_reason="codes_checked=${#codes[@]} expected=5"
    return
  fi
  local code
  for code in "${codes[@]}"; do
    reset_tsx
    write_all_guards 0
    if [ "$code" = "127" ]; then
      if ! tsx_is_absent; then
        case_fail_reason="code 127: tsx_absent=0 expected=1"
        return
      fi
    else
      write_stub_tsx "$code"
    fi
    run_gate
    codes_checked=$((codes_checked + 1))
    if [ "$gate_rc" -ne 1 ]; then
      case_fail_reason="code ${code}: expected gate exit 1, got exit ${gate_rc}"
      return
    fi
    if ! output_has "ARCHITECTURE: step 4 exits ${code}; this is a tool failure, not a boundary verdict"; then
      case_fail_reason="code ${code}: the tool failure ARCHITECTURE line is missing"
      return
    fi
    if ! output_has 'DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1'; then
      case_fail_reason="code ${code}: the tool failure DOCTOR line is missing"
      return
    fi
    if output_has 'DOCTOR: the three structural guard steps gate this exit code'; then
      case_fail_reason="code ${code}: the output holds the gate line on the tool failure path"
      return
    fi
  done
  if [ "$codes_checked" -ne 5 ]; then
    case_fail_reason="codes_checked=${codes_checked} expected=5"
  fi
}

# Case architecture_line_shows_code: the ARCHITECTURE line holds the code of
# the run, not a fixed code. The code 1 run prints the whole verdict line on
# stderr, so the line holds the boundary clause.
case_architecture_line_shows_code() {
  write_all_guards 0
  write_stub_tsx 0
  run_gate
  if ! output_has 'step 4 exits 0;'; then
    case_fail_reason="the ARCHITECTURE line does not hold the code 0"
    return
  fi
  reset_tsx
  write_stub_tsx 1
  export DOCTOR_GATE_TSX_MESSAGE="$VERDICT_LINE"
  run_gate
  if ! output_has 'step 4 exits 1;'; then
    case_fail_reason="the ARCHITECTURE line does not hold the code 1"
    return
  fi
  if ! output_has "$OWNER_CLAUSE"; then
    case_fail_reason="the ARCHITECTURE line for exit 1 does not hold the boundary clause"
  fi
}

# Case no_write_in_root: the gate writes no file in its root. The stub prints
# the whole verdict line on stderr, so the file list check covers the boundary
# path.
case_no_write_in_root() {
  write_all_guards 0
  write_stub_tsx 1
  export DOCTOR_GATE_TSX_MESSAGE="$VERDICT_LINE"
  local before
  before="$(list_root_files)"
  run_gate
  local after
  after="$(list_root_files)"
  if [ -z "$gate_output" ]; then
    case_fail_reason="the gate printed no output"
    return
  fi
  if [ "$before" != "$after" ]; then
    case_fail_reason="the file list of the root changed during the run"
  fi
}

# ---------------------------------------------------------------------------
# Adversarial cases (Phase 2)
# ---------------------------------------------------------------------------

# Case drift_match_requires_whole_line: an exit 2 whose output holds the drift
# text inside a longer line is a tool failure, not the known drift. The real
# match is a whole-line match (grep -qxF). A mutant that drops the whole-line
# flag (grep -qF) accepts this run as the known drift and exits 0.
case_drift_match_requires_whole_line() {
  write_all_guards 0
  write_stub_tsx 2
  export DOCTOR_GATE_TSX_MESSAGE="crash context: $DRIFT_LINE (uncaught exception)"
  run_gate
  if [ "$gate_rc" -ne 1 ]; then
    case_fail_reason="expected gate exit 1, got exit ${gate_rc}"
    return
  fi
  if ! output_has 'ARCHITECTURE: step 4 exits 2; this is a tool failure, not a boundary verdict'; then
    case_fail_reason="the tool failure ARCHITECTURE line is missing"
    return
  fi
  if ! output_has 'DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1'; then
    case_fail_reason="the tool failure DOCTOR line is missing"
    return
  fi
  if output_has 'DOCTOR: the three structural guard steps gate this exit code'; then
    case_fail_reason="the output holds the gate line for a substring drift match"
  fi
}

# ---------------------------------------------------------------------------
# Adversarial cases (Phase 3, the exit 1 verdict rule)
# ---------------------------------------------------------------------------

# assert_tool_failure_lines: the gate exit is 1. The output holds the two
# tool failure lines and no boundary gate line.
assert_tool_failure_lines() {
  local architecture_line="$1"
  if [ "$gate_rc" -ne 1 ]; then
    case_fail_reason="expected gate exit 1, got exit ${gate_rc}"
    return 1
  fi
  if ! output_has_line "$architecture_line"; then
    case_fail_reason="the tool failure ARCHITECTURE line is missing"
    return 1
  fi
  if ! output_has_line 'DOCTOR: the architecture step did not produce a boundary verdict; the gate exits 1'; then
    case_fail_reason="the tool failure DOCTOR line is missing"
    return 1
  fi
  if output_has 'DOCTOR: the three structural guard steps gate this exit code'; then
    case_fail_reason="the output holds the gate line on the tool failure path"
    return 1
  fi
  return 0
}

# assert_boundary_lines: the gate exit is 0. The output holds the two boundary
# lines and no tool failure text.
assert_boundary_lines() {
  local architecture_line="$1"
  if [ "$gate_rc" -ne 0 ]; then
    case_fail_reason="expected gate exit 0, got exit ${gate_rc}"
    return 1
  fi
  if ! output_has_line "$architecture_line"; then
    case_fail_reason="the boundary ARCHITECTURE line is missing"
    return 1
  fi
  if ! output_has_line 'DOCTOR: the three structural guard steps gate this exit code'; then
    case_fail_reason="the DOCTOR gate line is missing"
    return 1
  fi
  if output_has 'tool failure'; then
    case_fail_reason="the output holds a tool failure text"
    return 1
  fi
  if output_has 'did not produce a boundary verdict'; then
    case_fail_reason="the output holds a boundary verdict failure text"
    return 1
  fi
  return 0
}

# Case tsx_exit_1_no_verdict_gate_exits_1: an exit 1 with no verdict line is
# a tool failure, not a boundary verdict. The stub prints nothing on either
# stream. The case asserts that no stub message leaks from an earlier case.
case_tsx_exit_1_no_verdict_gate_exits_1() {
  write_all_guards 0
  reset_tsx
  write_stub_tsx 1
  local message_set
  message_set="$(tsx_message_set_count)"
  if [ "$message_set" -ne 0 ]; then
    case_fail_reason="tsx_message_set=${message_set} expected=0"
    return
  fi
  run_gate
  assert_tool_failure_lines 'ARCHITECTURE: step 4 exits 1; this is a tool failure, not a boundary verdict'
}

# Case step4_cd_fails_gate_exits_1: the m-cd case. The stub tsx exists and
# prints a whole verdict line on stdout. The case removes the packages
# directory, so the cd of the step 4 command fails. The case asserts
# arch_dir_absent=1 before the run and tsx_calls=0 after the run.
case_step4_cd_fails_gate_exits_1() {
  write_all_guards 0
  reset_tsx
  write_stub_tsx 1
  export DOCTOR_GATE_TSX_STDOUT="$VERDICT_LINE"
  rm -rf "$tmp_root/packages"
  local arch_dir_absent=0
  if [ ! -d "$tmp_root/packages/architecture-enforcement" ]; then
    arch_dir_absent=1
  fi
  if [ "$arch_dir_absent" -ne 1 ]; then
    case_fail_reason="arch_dir_absent=${arch_dir_absent} expected=1"
    return
  fi
  run_gate
  local calls
  calls="$(tsx_call_count)"
  if [ "$calls" -ne 0 ]; then
    case_fail_reason="tsx_calls=${calls} expected=0"
    return
  fi
  assert_tool_failure_lines 'ARCHITECTURE: step 4 exits 1; this is a tool failure, not a boundary verdict'
}

# Case tsx_exit_1_verdict_line_gate_exits_0: the positive control. The stub
# exits 1 and prints three lines on stdout. The verdict line sits in the
# middle. The gate exit is 0.
case_tsx_exit_1_verdict_line_gate_exits_0() {
  write_all_guards 0
  reset_tsx
  write_stub_tsx 1
  export DOCTOR_GATE_TSX_STDOUT="build output line
${VERDICT_LINE}
architecture policy: v2 (status=ok, default=deny)"
  run_gate
  assert_boundary_lines 'ARCHITECTURE: step 4 exits 1; the owner of the remaining drift is architecture_ci_input_pin_20261110'
}

# Case tsx_exit_1_verdict_in_longer_line_gate_exits_1: the verdict line must
# be a whole line. The loop runs two fixtures. Each fixture holds the verdict
# line inside a longer line.
case_tsx_exit_1_verdict_in_longer_line_gate_exits_1() {
  local fixtures=(
    "crash: ${VERDICT_LINE}"
    "${VERDICT_LINE} (uncaught exception)"
  )
  local fixtures_checked=0
  if [ "${#fixtures[@]}" -ne 2 ]; then
    case_fail_reason="fixtures_checked=${#fixtures[@]} expected=2"
    return
  fi
  local fixture
  for fixture in "${fixtures[@]}"; do
    reset_tsx
    write_all_guards 0
    write_stub_tsx 1
    export DOCTOR_GATE_TSX_STDOUT="$fixture"
    run_gate
    fixtures_checked=$((fixtures_checked + 1))
    if ! assert_tool_failure_lines 'ARCHITECTURE: step 4 exits 1; this is a tool failure, not a boundary verdict'; then
      case_fail_reason="fixture_index=${fixtures_checked}: ${case_fail_reason}"
      return
    fi
  done
  if [ "$fixtures_checked" -ne 2 ]; then
    case_fail_reason="fixtures_checked=${fixtures_checked} expected=2"
  fi
}

# Case tsx_exit_1_malformed_verdict_gate_exits_1: the verdict line must hold
# a status and three counts. The loop runs seven malformed shapes. Each shape
# is a tool failure.
case_tsx_exit_1_malformed_verdict_gate_exits_1() {
  local shapes=(
    "architecture check: failed"
    "architecture check: debt-change (files=, findings=, parseErrors=)"
    "architecture check: debt-change (files=x, findings=y, parseErrors=z)"
    "architecture check: debt-change (files=12, findings=3)"
    "architecture check:  (files=12, findings=3, parseErrors=0)"
    "architecture check: debt change (files=12, findings=3, parseErrors=0)"
    "Architecture check: debt-change (files=12, findings=3, parseErrors=0)"
  )
  local shapes_checked=0
  if [ "${#shapes[@]}" -ne 7 ]; then
    case_fail_reason="shapes_checked=${#shapes[@]} expected=7"
    return
  fi
  local shape
  for shape in "${shapes[@]}"; do
    reset_tsx
    write_all_guards 0
    write_stub_tsx 1
    export DOCTOR_GATE_TSX_STDOUT="$shape"
    run_gate
    shapes_checked=$((shapes_checked + 1))
    if ! assert_tool_failure_lines 'ARCHITECTURE: step 4 exits 1; this is a tool failure, not a boundary verdict'; then
      case_fail_reason="shape_index=${shapes_checked}: ${case_fail_reason}"
      return
    fi
  done
  if [ "$shapes_checked" -ne 7 ]; then
    case_fail_reason="shapes_checked=${shapes_checked} expected=7"
  fi
}

# Case tsx_exit_2_verdict_line_gate_exits_1: the exit 1 rule changes no exit
# 2 rule. The stub exits 2 and prints the whole verdict line on stdout. The
# gate exit is 1.
case_tsx_exit_2_verdict_line_gate_exits_1() {
  write_all_guards 0
  reset_tsx
  write_stub_tsx 2
  export DOCTOR_GATE_TSX_STDOUT="$VERDICT_LINE"
  run_gate
  assert_tool_failure_lines 'ARCHITECTURE: step 4 exits 2; this is a tool failure, not a boundary verdict'
}

# Part B helpers

load_record() {
  local track_dir
  track_dir="$(track_dir_resolve "$TRACK_ID")"
  record_path="$ROOT/$track_dir/doctor-gate-evidence.md"
  record_lines=()
  if [ -f "$record_path" ]; then
    while IFS= read -r record_line; do
      record_lines+=("$record_line")
    done <"$record_path"
  fi
}

record_has() {
  local line
  for line in "${record_lines[@]}"; do
    case "$line" in
      *"$1"*) return 0 ;;
    esac
  done
  return 1
}

step_line_for() {
  local step_number="$1"
  local line
  for line in "${record_lines[@]}"; do
    case "$line" in
      "- STEP ${step_number}: "*) printf '%s\n' "$line"; return 0 ;;
    esac
  done
  return 1
}

step_command_text() {
  local line="$1"
  local text="${line#*: }"
  printf '%s\n' "${text%%, exit *}"
}

step_exit_code() {
  local line="$1"
  local text="${line#*, exit }"
  printf '%s\n' "${text%%,*}"
}

verdict_line_of() {
  local line
  for line in "${record_lines[@]}"; do
    case "$line" in
      "- VERDICT: ARCHITECTURE: step 4 exits "*) printf '%s\n' "$line"; return 0 ;;
    esac
  done
  return 1
}

verdict_exit_code() {
  local line="$1"
  local text="${line#*step 4 exits }"
  printf '%s\n' "${text%%;*}"
}

head_line_of() {
  local line
  for line in "${record_lines[@]}"; do
    case "$line" in
      "- HEAD: "*) printf '%s\n' "$line"; return 0 ;;
    esac
  done
  return 1
}

head_sha_of() {
  local line="$1"
  local text="${line#- HEAD: }"
  printf '%s\n' "$text"
}

duration_line_of() {
  local line
  for line in "${record_lines[@]}"; do
    if grep -qE '^- DURATION: step 4 took [0-9]+([.][0-9]+)? s, from the timing run at [0-9a-f]{7,12}$' <<<"$line"; then
      printf '%s\n' "$line"
      return 0
    fi
  done
  return 1
}

duration_sha_of() {
  local line="$1"
  local text="${line##*at }"
  printf '%s\n' "$text"
}

record_line_count() {
  local line
  local count=0
  for line in "${record_lines[@]}"; do
    if [ -n "$line" ]; then
      count=$((count + 1))
    fi
  done
  printf '%d\n' "$count"
}

# Case record_file_present: the gate record exists at the resolved path.
case_record_file_present() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
  fi
}

# Case record_step_lines: one STEP line for each of the four steps, in the
# planned form.
case_record_step_lines() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  local step_number
  local step_lines_checked=0
  local line
  for step_number in 1 2 3 4; do
    if ! line="$(step_line_for "$step_number")"; then
      case_fail_reason="the record holds no STEP ${step_number} line"
      return
    fi
    if ! grep -qE '^- STEP [1-4]: .+, exit [0-9]+, [0-9]{4}-[0-9]{2}-[0-9]{2}$' <<<"$line"; then
      case_fail_reason="the STEP ${step_number} line does not hold the planned form"
      return
    fi
    step_lines_checked=$((step_lines_checked + 1))
  done
  if [ "$step_lines_checked" -ne 4 ]; then
    case_fail_reason="step_lines_checked=${step_lines_checked} expected=4"
  fi
}

# Case record_step_commands: each STEP line holds the planned command text.
case_record_step_commands() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  local step_number
  local expected
  local line
  local text
  local commands_checked=0
  for step_number in 1 2 3 4; do
    case "$step_number" in
      1) expected="bash tests/orchestrator_catalog.sh" ;;
      2) expected="bash tests/orchestrator_marker_vocabulary.sh" ;;
      3) expected="bash tests/orchestrator_review_execution_truthfulness.sh" ;;
      4) expected="$CLI_COMMAND" ;;
    esac
    if ! line="$(step_line_for "$step_number")"; then
      case_fail_reason="the record holds no STEP ${step_number} line"
      return
    fi
    text="$(step_command_text "$line")"
    if [ "$text" != "$expected" ]; then
      case_fail_reason="the STEP ${step_number} command text is not the planned literal"
      return
    fi
    commands_checked=$((commands_checked + 1))
  done
  if [ "$commands_checked" -ne 4 ]; then
    case_fail_reason="commands_checked=${commands_checked} expected=4"
  fi
}

# Case record_step_exit_codes: steps 1 to 3 exited 0. Step 4 exited 0, 1, or
# 2, and a 2 holds only with the known manifest drift.
case_record_step_exit_codes() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  local step_number
  local line
  local code
  for step_number in 1 2 3; do
    if ! line="$(step_line_for "$step_number")"; then
      case_fail_reason="the record holds no STEP ${step_number} line"
      return
    fi
    code="$(step_exit_code "$line")"
    if [ "$code" != "0" ]; then
      case_fail_reason="the STEP ${step_number} exit code is ${code}, expected 0"
      return
    fi
  done
  if ! line="$(step_line_for 4)"; then
    case_fail_reason="the record holds no STEP 4 line"
    return
  fi
  code="$(step_exit_code "$line")"
  if [ "$code" = "2" ]; then
    if ! record_has "$KNOWN_DRIFT_CLAUSE"; then
      case_fail_reason="the STEP 4 exit code is 2, and the VERDICT line does not hold the known manifest drift"
      return
    fi
  elif [ "$code" != "0" ] && [ "$code" != "1" ]; then
    case_fail_reason="the STEP 4 exit code is ${code}, expected 0, 1, or 2"
  fi
}

# Case record_verdict_line: the record holds the verdict line and one of its
# two owner clauses.
case_record_verdict_line() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  local line
  if ! line="$(verdict_line_of)"; then
    case_fail_reason="the record holds no VERDICT line"
    return
  fi
  if ! record_has "$OWNER_CLAUSE" && ! record_has "$KNOWN_DRIFT_CLAUSE"; then
    case_fail_reason="the VERDICT line does not hold an owner clause"
  fi
}

# Case record_verdict_code_matches_step4: the VERDICT code equals the code of
# the STEP 4 line.
case_record_verdict_code_matches_step4() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  local step_line
  local verdict_line
  if ! step_line="$(step_line_for 4)"; then
    case_fail_reason="the record holds no STEP 4 line"
    return
  fi
  if ! verdict_line="$(verdict_line_of)"; then
    case_fail_reason="the record holds no VERDICT line"
    return
  fi
  local step_code
  local verdict_code
  step_code="$(step_exit_code "$step_line")"
  verdict_code="$(verdict_exit_code "$verdict_line")"
  if [ "$step_code" != "$verdict_code" ]; then
    case_fail_reason="the VERDICT code ${verdict_code} differs from the STEP 4 code ${step_code}"
  fi
}

# Case record_owner_line: the record names the owner of the remaining drift.
case_record_owner_line() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  if ! record_has 'OWNER: architecture_ci_input_pin_20261110 owns tasks 1.4 (pin refresh) and 1.4d (debt baseline)'; then
    case_fail_reason="the record does not hold the owner line"
  fi
}

# Case record_doctor_line: the record holds the gate line.
case_record_doctor_line() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  if ! record_has '- DOCTOR: the three structural guard steps gate this exit code'; then
    case_fail_reason="the record does not hold the DOCTOR line"
  fi
}

# Case record_duration_line: the record holds the duration of step 4 and
# names its source run.
case_record_duration_line() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  local line
  if ! line="$(duration_line_of)"; then
    case_fail_reason="the record holds no DURATION line with a source run"
    return
  fi
  local seconds
  seconds="${line#- DURATION: step 4 took }"
  seconds="${seconds%% s,*}"
  if ! [[ "$seconds" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    case_fail_reason="the DURATION value is not a number of seconds"
  fi
}

# Case record_duration_sha_matches_head: the sha of the DURATION source run
# equals the HEAD value of the record.
case_record_duration_sha_matches_head() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  local duration_line
  local head_line
  if ! duration_line="$(duration_line_of)"; then
    case_fail_reason="the record holds no DURATION line with a source run"
    return
  fi
  if ! head_line="$(head_line_of)"; then
    case_fail_reason="the record holds no HEAD line"
    return
  fi
  local duration_sha
  local head_sha
  duration_sha="$(duration_sha_of "$duration_line")"
  head_sha="$(head_sha_of "$head_line")"
  if [ "$duration_sha" != "$head_sha" ]; then
    case_fail_reason="the DURATION sha ${duration_sha} differs from the HEAD sha ${head_sha}"
  fi
}

# Case record_head_line: the record holds the short HEAD sha.
case_record_head_line() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  local line
  local found=0
  for line in "${record_lines[@]}"; do
    if grep -qE '^- HEAD: [0-9a-f]{7,12}$' <<<"$line"; then
      found=$((found + 1))
    fi
  done
  if [ "$found" -ne 1 ]; then
    case_fail_reason="head_lines_checked=${found} expected=1"
  fi
}

# Case record_lines_floor: the record holds enough lines to prove a record.
case_record_lines_floor() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  local count
  count="$(record_line_count)"
  if [ "$count" -lt "$RECORD_LINES_FLOOR" ]; then
    case_fail_reason="record_lines_checked=${count} expected at least ${RECORD_LINES_FLOOR}"
  fi
}

# The runners

run_case() {
  local name="$1"
  CASES_TOTAL=$((CASES_TOTAL + 1))
  case_fail_reason=""
  tmp_root="$(mktemp -d /tmp/orchestrator-doctor-gate.XXXXXX)" || {
    fail_case "$name" "mktemp failed"
    CASES_FAILED=$((CASES_FAILED + 1))
    return
  }
  mkdir -p "$tmp_root/measure" "$tmp_root/tests" "$tmp_root/bin" "$tmp_root/packages/architecture-enforcement"
  cp "$DOCTOR_SRC" "$tmp_root/measure/doctor.sh"
  "case_$name"
  if [ -n "$case_fail_reason" ]; then
    fail_case "$name" "$case_fail_reason"
    CASES_FAILED=$((CASES_FAILED + 1))
  else
    pass_case "$name"
  fi
  rm -rf "$tmp_root"
}

run_part_a() {
  local total_before="$CASES_TOTAL"
  local failed_before="$CASES_FAILED"
  run_case tsx_exit_1_gate_exits_0
  run_case tsx_exit_0_gate_exits_0
  run_case guard_catalog_failure_gate_exits_1
  run_case guard_marker_failure_gate_exits_1
  run_case guard_truthfulness_failure_gate_exits_1
  run_case tsx_exit_2_manifest_drift_gate_exits_0
  run_case tsx_exit_2_other_line_gate_exits_1
  run_case tsx_exit_127_gate_exits_1
  run_case tsx_argv_exact
  run_case tool_failure_codes
  run_case architecture_line_shows_code
  run_case no_write_in_root
  run_case drift_match_requires_whole_line
  run_case tsx_exit_1_no_verdict_gate_exits_1
  run_case step4_cd_fails_gate_exits_1
  run_case tsx_exit_1_verdict_line_gate_exits_0
  run_case tsx_exit_1_verdict_in_longer_line_gate_exits_1
  run_case tsx_exit_1_malformed_verdict_gate_exits_1
  run_case tsx_exit_2_verdict_line_gate_exits_1
  PART_A_TOTAL=$((CASES_TOTAL - total_before))
  PART_A_FAILED=$((CASES_FAILED - failed_before))
}

run_part_b() {
  local total_before="$CASES_TOTAL"
  local failed_before="$CASES_FAILED"
  run_case record_file_present
  run_case record_step_lines
  run_case record_step_commands
  run_case record_step_exit_codes
  run_case record_verdict_line
  run_case record_verdict_code_matches_step4
  run_case record_owner_line
  run_case record_doctor_line
  run_case record_duration_line
  run_case record_duration_sha_matches_head
  run_case record_head_line
  run_case record_lines_floor
  PART_B_TOTAL=$((CASES_TOTAL - total_before))
  PART_B_FAILED=$((CASES_FAILED - failed_before))
}

usage() {
  printf 'Usage: %s [--part a|--part b]\n' "$0" >&2
}

main() {
  local mode="both"
  if [ "$#" -eq 2 ] && [ "$1" = "--part" ]; then
    case "$2" in
      a) mode="a" ;;
      b) mode="b" ;;
      *)
        usage
        exit 2
        ;;
    esac
  elif [ "$#" -eq 1 ]; then
    case "$1" in
      "--part=a") mode="a" ;;
      "--part=b") mode="b" ;;
      *)
        usage
        exit 2
        ;;
    esac
  elif [ "$#" -ne 0 ]; then
    usage
    exit 2
  fi

  case "$mode" in
    a) run_part_a ;;
    b) run_part_b ;;
    both)
      run_part_a
      run_part_b
      ;;
  esac

  local total="$CASES_TOTAL"
  local failed="$CASES_FAILED"
  if [ "$mode" = "a" ]; then
    total="$PART_A_TOTAL"
    failed="$PART_A_FAILED"
  elif [ "$mode" = "b" ]; then
    total="$PART_B_TOTAL"
    failed="$PART_B_FAILED"
  fi

  printf 'cases_total=%d cases_failed=%d\n' "$total" "$failed"
  if [ -n "$FAILED_NAMES" ]; then
    printf 'failed_cases=%s\n' "$FAILED_NAMES"
  fi

  if [ "$mode" = "a" ] || [ "$mode" = "both" ]; then
    if [ "$PART_A_TOTAL" -lt "$PART_A_FLOOR" ]; then
      printf 'FAIL: cases_total=%d is below the floor of %d\n' "$PART_A_TOTAL" "$PART_A_FLOOR" >&2
      exit 1
    fi
  fi
  if [ "$failed" -gt 0 ]; then
    exit 1
  fi
  exit 0
}

main "$@"
