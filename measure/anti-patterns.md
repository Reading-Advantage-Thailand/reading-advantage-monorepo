# Measure Anti-Patterns Catalog (Canonical)

> This project catalog was initialized from the Measure Orchestrator starter catalog on
> 2026-06-26. Extend it with project-specific entries when new orchestrator failure
> classes are caught.
>
> The catalog is consulted by:
> - `measure-strategy` (test strategy must defend against relevant anti-patterns)
> - `measure-mid-red` (test authoring rules)
> - `measure-jr-green` (Green implementation must not reintroduce A1–A7)
> - `measure-phase-acceptance` (acceptance criteria)
> - `measure-final-acceptance` (pre-closeout audit)
> - `measure-orchestrator-audit` (catalog is the audit's primary input)
> - `measure-adversarial-testing` (anti-patterns are attack surfaces)

## Catalog Summary

| ID | Anti-pattern | Guard |
|----|--------------|-------|
| A1 | Substring-as-structured-signal in supervisor | `tests/orchestrator_supervisor_invariants.sh` / orchestrator audit |
| A2 | Consent-blind publish gate | none (catalog ref `tests/cs_p4.sh` dangling — see A12) |
| A3 | Digit-only as a "labeled count" | none (catalog ref `tests/mir_p1.sh` dangling — see A12) |
| A4 | Vacuous-pass on nothing-done | none (catalog ref `tests/mir_p1.sh` dangling — see A12) |
| A5 | False-claim text vs test reality | orchestrator audit (no static guard yet) |
| A6 | Registry-note overstatement | orchestrator audit (no static guard yet) |
| A7 | Over-broad filter swallowing real hits | none (catalog ref `tests/mir_p1.sh` dangling — see A12) |
| A8 | `[ ]` marker ambiguity | `tests/orchestrator_marker_vocabulary.sh` (all active tracks) / orchestrator audit |
| A9 | Pre-existing test references archived track paths | `track_dir_resolve()` helper + orchestrator audit |
| A10 | Generated-facts drift after structural change | orchestrator audit (no pre-commit hook; `measure/generate.sh` missing) |
| A11 | Executed review track left fully blocked | `tests/orchestrator_review_execution_truthfulness.sh` |
| A12 | Dangling catalog guard-references (unguarded anti-patterns) | `tests/orchestrator_catalog.sh` (catalog-exists only) / orchestrator audit |
| A13 | Stale track dir left in `measure/tracks/` after archive move | orchestrator audit (no static guard yet) |

---

## A1 — Substring-as-structured-signal in supervisor

**Class:** orchestrator heuristic bypass
**Caught:** 2026-06-24 review of last-72h commits vs. measure phase state
**Detection:**
```bash
# Use Python to strip docstrings before matching (the false-positive on docstring
# mentions is itself a known failure mode of grep-based detection).
python3 -c '
import re
src = open("measure/automation-supervisor.py").read()
code = re.sub(r"\"\"\".*?\"\"\"", "", src, flags=re.DOTALL)
code = re.sub(r"'"'"'.*?'"'"'", "", code, flags=re.DOTALL)
matches = re.findall(r"\"deferred\"[[:space:]]+in[[:space:]]+task\.lower\(\)", code)
print(len(matches), "substring-match occurrences")
'
```

**Symptoms:** A `[~]` task with the substring "deferred" in its prose is silently dropped
from the incomplete-task count. Tracks can mark a task `[~]` *without* doing the work
and the supervisor still reports "complete."

**Fix:** Replace the substring check with a structured-signal helper
(`is_task_structurally_blocked(task)` in `measure/automation-supervisor.py`) that
recognizes:
- `[b]` (blocked / human-gated) checkbox state
- trailing `deferred:<owner>` field

A free-text occurrence of "deferred" no longer drops a task from the incomplete count.

**Guard:** `tests/mir_p1.sh` A1 in the `measure_integrity_remediation_20260624` track.

---

## A2 — Consent-blind publish gate

**Class:** orchestrator missing requirement
**Caught:** 2026-06-24 review
**Detection:**
```bash
for t in tests/*p4.sh tests/*_closeout.sh tests/cs_p*.sh; do
  if [ -f "$t" ]; then
    n=$(grep -ic 'consent\|anonym' "$t" 2>/dev/null || echo 0)
    echo "$t: $n consent/anonymization references"
    [ "$n" = "0" ] && echo "  WARN: publish gate has no consent or anonymization check"
  fi
done
```

**Symptoms:** A test that flips a draft → published status does not check for consent
artifacts or anonymization. A named case study can be published without consent
verification.

**Fix:** For any "publish" gate in `tests/*p4.sh` or `tests/*_closeout.sh`, the gate must
require EITHER (a) explicit anonymization marker on the artifact, OR (b) a non-empty
`consent-<subject>.{md,pdf}` artifact with signatory + date.

**Guard:** `tests/cs_p4.sh` P4.1.

---

## A3 — Digit-only as a "labeled count"

**Class:** test fragility / vacuous assertion
**Caught:** 2026-06-24 review
**Detection:**
```bash
rg -nE "rg -q '\[0-9\]\+'" tests/*.sh
```

**Symptoms:** A test asserts a "count" or "baseline" with a regex that matches any digit
(`rg -q '[0-9]+'`). The test passes on a date, a year, or any digit anywhere in the
section.

**Fix:** Require a labeled integer — `rg 'Baseline relationship count:[[:space:]]*[0-9]+'`
and parse the integer.

**Guard:** `tests/mir_p1.sh` A3.

---

## A4 — Vacuous-pass on nothing-done

**Class:** test fragility / vacuous assertion
**Caught:** 2026-06-24 review
**Detection:**
```bash
for t in tests/mr_p1.sh tests/mr_p2.sh tests/mr_p3.sh tests/mr_p4.sh; do
  if [ -f "$t" ]; then
    pair=$(awk '
      /TILDES=/ && /-eq 0/ { t=1 }
      t && /XES=/ && /-eq 0/ { found=1; exit }
      END { print found+0 }
    ' "$t")
    [ "$pair" = "1" ] && echo "  $t: vacuous 'markers consistent' PASS"
  fi
done
```

**Symptoms:** A "markers consistent" check passes when a phase has zero completed tasks
(all-`[~]`) AND when a phase has zero in-progress tasks (all-`[x]`). A phase reporting
"Green" with no `[x]` is inflated to a passing check.

**Fix:** Reclassify the all-`[~]` state as `INCOMPLETE` (and `FAIL` the test), reserve
`PASS` for "all-`[x]`" (with `>= 1 [x]`).

**Guard:** `tests/mir_p1.sh` A4.

---

## A5 — False-claim text vs test reality

**Class:** plan truthfulness
**Caught:** 2026-06-24 review
**Detection:**
```bash
rg -nE "PASS=[0-9]+.*FAIL=0|all checks pass" measure/tracks/*/plan.md
# For each hit, run the test the plan cites; if exit != 0, the claim is false.
```

**Symptoms:** A plan task claims "all checks pass" or "PASS=6, FAIL=0" while the test
the plan cites actually exits 1.

**Fix:** When a test invariant is incompatible with a spec requirement, either retire
the test in favor of a new one or update the test. Do not write "all checks pass" in
plan text unless the test actually exits 0.

**Guard:** `tests/mir_p1.sh` A5.

---

## A6 — Registry-note overstatement

**Class:** marketing copy outrunning implementation
**Caught:** 2026-06-24 review
**Detection:**
```bash
rg -nE "API-key encryption (was )?resolved|encryption.*resolved|completely fixed|fully solved|all (checks |tests )?pass" measure/tracks.md
# For each hit, check the corresponding adversarial test or contract test is green.
```

**Symptoms:** A registry note or `measure/tracks.md` entry claims a security/quality
state is "resolved" while the adversarial test for that state is still failing.

**Fix:** When an adversarial test is red, the registry note must say so. A claim of
"resolved" is only valid when the adversarial test passes.

**Guard:** `tests/mir_p1.sh` A6.

---

## A7 — Over-broad filter swallowing real hits

**Class:** test filter too coarse
**Caught:** 2026-06-24 review
**Detection:**
```bash
rg -nE 'rg -v "[^"]*(never|do not|do NOT|don.t|cannot say|forbidden|prohibited)[^"]*"' tests/*.sh
```

**Symptoms:** A test's exclusion filter uses bare English words ("never", "do not",
"don't") as filter tokens. A real banned-term line that happens to contain "never"
gets silently dropped.

**Fix:** Exclude only file path contexts and policy-disclaimer markers
(`outcome-claims-policy.md`, `❌`, `BANNED`), not bare English words.

**Guard:** `tests/mir_p1.sh` A7.

---

## A8 — `[ ]` (space) marker ambiguity (legacy)

**Class:** supervisor regex accepts too many markers
**Caught:** 2026-06-24 review (post-supervisor fix)
**Detection:**
```bash
rg -nE 'r"\^\- \[\(\[ ~x\]\)\]' measure/automation-supervisor.py
```

**Symptoms:** The supervisor's task regex `r"^- \[([ ~x])\] (.+)"` accepts a space
character. A `[ ]` (space) marker is counted as in-progress.

**Fix:** Standardize on `r"^- \[([~xb])\] (.+)"`; the supervisor's incomplete-count
predicate should be `status in ("~", "b") and not is_task_structurally_blocked(task)`.
Project plans that still use `[ ]` must be converted by the plan-update role before
supervisor execution, because the fixed supervisor intentionally ignores `[ ]` tasks.

**Guard:** `tests/orchestrator_marker_vocabulary.sh` for planning-review tracks; static supervisor regex check in `measure-orchestrator-audit`.

---

## A9 — Pre-existing test references archived track paths

**Class:** test not updated on archive move
**Caught:** Multiple occurrences after archive moves
**Detection:**
```bash
rg -nE 'measure/tracks/([a-z_0-9-]+)/plan\.md' tests/*.sh
# Cross-check: for each track id, if measure/archive/<id>/ exists and measure/tracks/<id>/ doesn't, the test is broken.
```

**Symptoms:** A test references `measure/tracks/<id>/plan.md` but the track was moved
to `measure/archive/<id>/plan.md` on closeout. The test fails forever.

**Fix:** Add a `track_dir_resolve()` helper at the top of every test that prefers
`measure/archive/<id>` if it exists. Codify in `tests/_lib/track_dir.sh` (deferred).

**Guard:** Static check in `measure-orchestrator-audit`.

---

## A10 — Generated-facts drift after structural change

**Class:** CI gate that fights developers
**Caught:** Every `measure/doctor.sh` Check 5 failure
**Detection:**
```bash
ls -la .git/hooks/pre-commit 2>/dev/null
```

**Symptoms:** `measure/doctor.sh` Check 5 fails after every structural change because
no pre-commit hook regenerates `measure/generated/`.

**Fix:** Add a pre-commit hook that runs `bash measure/generate.sh` and stages the
result.

**Guard:** Static check in `measure-orchestrator-audit`.

---

## A11 — Executed review track left fully blocked

**Class:** plan truthfulness / supervisor bypass
**Caught:** 2026-06-27 orchestrator audit for `reading_advantage_full_review_20260626`

**Detection:**
```bash
# For a review track with review result JSON and/or audit-report artifacts, the plan must
# not leave every task as `[b] ... deferred:review-execution`.
for plan in measure/tracks/*/plan.md; do
  dir="${plan%/plan.md}"
  if ls "$dir"/review-*-result.json >/dev/null 2>&1; then
    total=$(grep -c '^- \[[~xb]\] ' "$plan" || true)
    blocked=$(grep -c '^- \[b\].*deferred:review-execution' "$plan" || true)
    if [ "$total" -gt 0 ] && [ "$total" = "$blocked" ]; then
      echo "WARN: executed review track still fully blocked: $plan"
    fi
  fi
done
```

**Symptoms:** Review result artifacts exist and the user has requested execution, but the
track plan still marks every task as `[b] ... deferred:review-execution`. Because `[b]`
is a structured blocked marker, the supervisor treats the track as having no executable
work. The plan then stops representing current truth: execution happened or is authorized,
but task markers still say it is human-gated.

**Fix:** Once execution is requested or review artifacts exist, convert task markers to
truthful states: `[x]` for completed tasks with artifact/result evidence, `[~]` for
remaining executable tasks, or keep `[b] deferred:<owner>` only for a real external gate.
Do not use `[b] deferred:review-execution` as a permanent placeholder after execution
begins.

**Guard:** `tests/orchestrator_review_execution_truthfulness.sh`.

---

## A12 — Dangling catalog guard-references (unguarded anti-patterns)

**Class:** catalog / guard drift
**Caught:** 2026-07-03 orchestrator audit

**Detection:**
```bash
# Every "Guard: tests/<name>.sh" reference in this catalog must point at a file
# that actually exists. The starter catalog referenced track-specific guards
# (tests/mir_p1.sh, tests/cs_p4.sh, tests/mr_p*.sh) that were never created in
# this repo, so A1-A7 were silently unguarded.
for ref in $(grep -oE 'tests/[a-z_0-9]+\.sh' measure/anti-patterns.md | sort -u); do
  [ -f "$ref" ] || echo "DANGLING guard reference: $ref"
done
```

**Symptoms:** The catalog's per-entry `Guard:` line names a test file that does
not exist in the repo. Readers (and the orchestrator) believe A1-A7 are guarded
when they are not. A regression of A1 (substring-as-signal) or A3 (digit-only
count) would not be caught by any test, only by a manual orchestrator audit.

**Fix:** Either (a) create the referenced guard test, or (b) update the
`Guard:` line to `none (... — see A12)` and rely on the orchestrator audit.
This repo chose (b) for A2-A7 (low-frequency in current tracks) and (a) for A1
and A8 via `tests/orchestrator_supervisor_invariants.sh` and the expanded
`tests/orchestrator_marker_vocabulary.sh`.

**Guard:** `tests/orchestrator_catalog.sh` enforces that every A-entry exists;
the dangling-reference sweep itself is run by the orchestrator audit (no static
guard yet).

---

## A13 — Stale track directory left in `measure/tracks/` after archive move

**Class:** closeout / registry drift
**Caught:** 2026-07-03 orchestrator audit of `agents_md_audit_science_advantage_20260603`

**Detection:**
```bash
# A track that tracks.md marks archived (link under ./archive/) must NOT also
# have a directory under measure/tracks/. A stale leftover means the active
# track list is inconsistent with the registry.
for d in measure/tracks/*/; do
  tid=$(basename "$d")
  if grep -q "\./archive/${tid}/" measure/tracks.md && [ ! -f "${d}plan.md" ]; then
    echo "STALE: $tid is archived in tracks.md but a dir remains in measure/tracks/ (no plan.md)"
  fi
done
```

**Symptoms:** `tracks.md` marks a track `[x]` archived with a `./archive/<id>/`
link, and `measure/archive/<id>/` holds the complete archived track, BUT a
leftover `measure/tracks/<id>/` directory still exists (often with only stray
fixtures and no `plan.md`/`metadata.json`). The active-track enumeration and the
registry disagree. Because the leftover has no `plan.md`, the marker-vocabulary
guard skips it silently, so the drift is invisible.

**Fix:** `measure-closeout` must remove the `measure/tracks/<id>/` directory
once the archive move is complete and verified (archive copy has `plan.md`,
`metadata.json`, and all artifacts). Do not leave stray fixtures behind.

**Guard:** Orchestrator audit (no static guard yet).

---

## How projects extend this catalog

When a new class of failure is caught (in this project, in another project, or by the
`measure-orchestrator-audit` subagent):

1. Add a new entry to the project's `measure/anti-patterns.md` (or to this canonical
   file if it's framework-wide).
2. Use a unique A-number (continue from the highest existing entry).
3. Provide: description, detection recipe, symptoms, fix, and a guard test reference.
4. The `measure-orchestrator-audit` subagent will pick up the new entry in its next run.

## Cross-project propagation

When a new A-entry is added to a project's `measure/anti-patterns.md`, the
`measure-orchestrator-audit` subagent reports the entry as a "promotion candidate" in
its audit result. The orchestrator's Mid + Jr cycle can then promote the entry to
`references/anti-pattern-catalog.md` so all projects benefit.
