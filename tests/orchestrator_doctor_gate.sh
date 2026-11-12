#!/usr/bin/env bash
# Cases for the doctor gate: the behavior of measure/doctor.sh and the gate
# record of the track.
# Part A runs a copy of measure/doctor.sh in a temporary root. The root holds
# three stub guard scripts and a stub pnpm on PATH. Part B reads the gate
# record of the track through the track_dir_resolve helper, so the record
# stays readable after the archive move.
# Every case removes its own temporary root. No fixture enters the repository.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCTOR_SRC="$ROOT/measure/doctor.sh"
TRACK_ID="doctor_gate_repair_20261112"
PART_A_FLOOR=11
RECORD_LINES_FLOOR=8

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

# write_stub_pnpm: the stub logs its argv in pnpm.log at the root of the
# scratch tree. The log stays out of bin, so the file list of the root does
# not change because of the stub.
write_stub_pnpm() {
  local pnpm_code="$1"
  local pnpm_path="$tmp_root/bin/pnpm"
  mkdir -p "$tmp_root/bin"
  {
    cat <<EOF
#!/usr/bin/env bash
printf '%s\n' "\$*" >>"$tmp_root/pnpm.log"
exit $pnpm_code
EOF
  } >"$pnpm_path"
  chmod +x "$pnpm_path"
}

# run_gate: run the copy of doctor.sh in the scratch root. The mode "stub"
# puts the scratch bin first on PATH. The mode "no_stub" uses a PATH without
# any pnpm, so the shell returns 127.
run_gate() {
  local path_mode="${1:-stub}"
  local gate_path
  if [ "$path_mode" = "no_stub" ]; then
    gate_path="$tmp_root/bin:/usr/bin:/bin"
  else
    gate_path="$tmp_root/bin:$PATH"
  fi
  gate_output="$(cd "$tmp_root" && PATH="$gate_path" bash measure/doctor.sh 2>&1)"
  gate_rc=$?
}

# pnpm_is_absent: the restricted PATH holds no pnpm.
pnpm_is_absent() {
  if ( PATH="$tmp_root/bin:/usr/bin:/bin"; command -v pnpm >/dev/null 2>&1 ); then
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

pnpm_call_count() {
  if [ -f "$tmp_root/pnpm.log" ]; then
    grep -c '' "$tmp_root/pnpm.log"
  else
    echo 0
  fi
}

# list_root_files: the sorted file list of the scratch root, apart from
# pnpm.log, which the stub writes.
list_root_files() {
  local out=""
  local line
  while IFS= read -r line; do
    if [ "$line" = "./pnpm.log" ]; then
      continue
    fi
    out="$out$line
"
  done < <(cd "$tmp_root" && find . -type f -print | LC_ALL=C sort)
  printf '%s' "$out"
}

# Case pnpm_exit_1_gate_exits_0: a boundary verdict of 1 does not gate.
case_pnpm_exit_1_gate_exits_0() {
  write_all_guards 0
  write_stub_pnpm 1
  run_gate stub
  if [ "$gate_rc" -ne 0 ]; then
    case_fail_reason="expected gate exit 0, got exit ${gate_rc}"
    return
  fi
  if ! output_has 'ARCHITECTURE: step 4 exits 1; the owner of the remaining drift is architecture_ci_input_pin_20261110'; then
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

# Case pnpm_exit_0_gate_exits_0: a boundary verdict of 0 does not gate.
case_pnpm_exit_0_gate_exits_0() {
  write_all_guards 0
  write_stub_pnpm 0
  run_gate stub
  if [ "$gate_rc" -ne 0 ]; then
    case_fail_reason="expected gate exit 0, got exit ${gate_rc}"
    return
  fi
  if ! output_has 'ARCHITECTURE: step 4 exits 0; the owner of the remaining drift is architecture_ci_input_pin_20261110'; then
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
  write_stub_pnpm 0
  run_gate stub
  if [ "$gate_rc" -ne 1 ]; then
    case_fail_reason="expected gate exit 1, got exit ${gate_rc}"
    return
  fi
  local calls
  calls="$(pnpm_call_count)"
  if [ "$calls" -ne 0 ]; then
    case_fail_reason="pnpm_calls=${calls} expected=0"
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

# Case pnpm_exit_2_gate_exits_1: a tool failure exits 1.
case_pnpm_exit_2_gate_exits_1() {
  write_all_guards 0
  write_stub_pnpm 2
  run_gate stub
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

# Case pnpm_exit_127_gate_exits_1: no pnpm on PATH is a tool failure.
case_pnpm_exit_127_gate_exits_1() {
  write_all_guards 0
  run_gate no_stub
  if ! pnpm_is_absent; then
    case_fail_reason="pnpm_absent=0 expected=1, the restricted PATH holds a pnpm"
    return
  fi
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

# Case architecture_argv_exact: the architecture command holds one call and
# the pinned argv.
case_architecture_argv_exact() {
  write_all_guards 0
  write_stub_pnpm 0
  run_gate stub
  local calls
  calls="$(pnpm_call_count)"
  if [ "$calls" -ne 1 ]; then
    case_fail_reason="pnpm_calls=${calls} expected=1"
    return
  fi
  if ! grep -qxF -- 'architecture:check --skip-input-snapshot-pin' "$tmp_root/pnpm.log"; then
    case_fail_reason="the pnpm log does not hold the pinned argv"
    return
  fi
  if grep -qF -- 'architecture:pin:refresh' "$tmp_root/pnpm.log"; then
    case_fail_reason="the pnpm log holds the pin refresh command"
  fi
}

# Case tool_failure_codes: every code other than 0 and 1 is a tool failure.
case_tool_failure_codes() {
  local codes=( 2 3 126 137 127 )
  local codes_checked=0
  if [ "${#codes[@]}" -ne 5 ]; then
    case_fail_reason="codes_checked=${#codes[@]} expected=5"
    return
  fi
  local code
  for code in "${codes[@]}"; do
    rm -rf "$tmp_root/tests" "$tmp_root/bin" "$tmp_root/pnpm.log"
    mkdir -p "$tmp_root/tests" "$tmp_root/bin"
    write_all_guards 0
    if [ "$code" = "127" ]; then
      run_gate no_stub
      if ! pnpm_is_absent; then
        case_fail_reason="code 127: pnpm_absent=0 expected=1"
        return
      fi
    else
      write_stub_pnpm "$code"
      run_gate stub
    fi
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
# the run, not a fixed code.
case_architecture_line_shows_code() {
  write_all_guards 0
  write_stub_pnpm 0
  run_gate stub
  if ! output_has 'step 4 exits 0;'; then
    case_fail_reason="the ARCHITECTURE line does not hold the code 0"
    return
  fi
  rm -f "$tmp_root/pnpm.log"
  write_stub_pnpm 1
  run_gate stub
  if ! output_has 'step 4 exits 1;'; then
    case_fail_reason="the ARCHITECTURE line does not hold the code 1"
  fi
}

# Case no_write_in_root: the gate writes no file in its root.
case_no_write_in_root() {
  write_all_guards 0
  write_stub_pnpm 1
  local before
  before="$(list_root_files)"
  run_gate stub
  local after
  after="$(list_root_files)"
  if [ "$before" != "$after" ]; then
    case_fail_reason="the file list of the root changed during the run"
    return
  fi
  local calls
  calls="$(pnpm_call_count)"
  if [ "$calls" -lt 1 ]; then
    case_fail_reason="pnpm_calls=${calls} expected=1, the control wrote no call"
  fi
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
      4) expected="pnpm architecture:check --skip-input-snapshot-pin" ;;
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

# Case record_step_exit_codes: steps 1 to 3 exited 0, and step 4 exited 0
# or 1.
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
  if [ "$code" != "0" ] && [ "$code" != "1" ]; then
    case_fail_reason="the STEP 4 exit code is ${code}, expected 0 or 1"
  fi
}

# Case record_verdict_line: the record holds the verdict line and its owner
# clause.
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
  if ! record_has '; the owner of the remaining drift is architecture_ci_input_pin_20261110'; then
    case_fail_reason="the VERDICT line does not hold the owner clause"
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

# Case record_duration_line: the record holds the duration of step 4.
case_record_duration_line() {
  load_record
  if [ ! -f "$record_path" ]; then
    case_fail_reason="the record file is absent: $record_path"
    return
  fi
  local line
  local found=0
  for line in "${record_lines[@]}"; do
    if grep -qE '^- DURATION: step 4 took [0-9]+([.][0-9]+)? s$' <<<"$line"; then
      found=$((found + 1))
    fi
  done
  if [ "$found" -ne 1 ]; then
    case_fail_reason="duration_lines_checked=${found} expected=1"
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
  mkdir -p "$tmp_root/measure" "$tmp_root/tests" "$tmp_root/bin"
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
  run_case pnpm_exit_1_gate_exits_0
  run_case pnpm_exit_0_gate_exits_0
  run_case guard_catalog_failure_gate_exits_1
  run_case guard_marker_failure_gate_exits_1
  run_case guard_truthfulness_failure_gate_exits_1
  run_case pnpm_exit_2_gate_exits_1
  run_case pnpm_exit_127_gate_exits_1
  run_case architecture_argv_exact
  run_case tool_failure_codes
  run_case architecture_line_shows_code
  run_case no_write_in_root
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
