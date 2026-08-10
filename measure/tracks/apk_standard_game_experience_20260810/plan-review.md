# Phase S1 Independent Review: Standard Game Briefing

**Date:** 2026-08-11  
**Track:** `apk_standard_game_experience_20260810`  
**Reviewed phase range:** `c31eb10b8..1c9734bf0`

## Outcome

No Critical, High, or Medium findings remain after remediation and independent
re-review. The final bounded re-review of `aaf86d305..1c9734bf0` reported no
findings.

## Findings and resolutions

- **High — post-Start errors could dead-end a briefing-enabled host:** Resolved
  in `818c306`. Unavailable phases and renderer failures now expose an enabled
  **Return to briefing** action, clear stale state, preserve the briefing gate,
  and retain one live runtime/canvas on retry.
- **Medium — touch-only hosts could fall back to keyboard/pointer hints:**
  Resolved in `818c306`. The screen renders only controls applicable to the
  current input mode, including a valid zero-row state.
- **Medium — the compact browser case overwrote 390x844 before navigation:**
  Resolved in `fb2f076`. The briefing case now genuinely begins at 390x844 and
  separately verifies 1440x900.
- **Medium — the embedded lifecycle dialog claimed unsupported page-modal
  semantics:** Resolved in `aaf86d3`. The named `dialog` and Start autofocus are
  preserved without a false `aria-modal` claim.
- **Medium — partial renderer DOM or an obtained instance could survive startup
  rejection:** Resolved in `aaf86d3`. `mountCartridge` destroys an obtained
  instance, clears partial DOM, preserves the original structured mount error,
  and reports non-masking cleanup failures.
- **Medium — a throwing lifecycle observer could strand Start:** Resolved in
  `1c9734b`. Synchronous host callback errors become recoverable briefing errors
  and never mount normal gameplay.
- **Medium — initial responsive rejection occurred before runtime cleanup:**
  Resolved in `1c9734b`. Initial composition resolution now unwinds observer,
  visibility/input listener, and `touchAction` state before rethrowing the
  original error.

## Verification

- Full Advantage Play Kit Vitest with coverage: **55 files / 370 tests passed**.
- APK coverage: **89.20% statements**, **81.82% branches**, **96.82% functions**,
  and **91.85% lines**.
- APK TypeScript check, build, and ESLint: passed; the full lint scope retains
  four unrelated pre-existing warnings and zero errors.
- Advantage Games QC Jest: **4/4 passed**; component coverage is **99.45%
  statements**, **83.72% branches**, **69.23% functions**, and **99.45% lines**.
- Advantage Games TypeScript check and focused QC ESLint: passed.
- Chromium APK authoring/QC: **3/3 passed**, including compact 390x844, wide
  1440x900, Thai content, input-mode filtering, no horizontal overflow, a 48px
  Start target, and one validated Start transition.
- Code graph updates completed for every changed export, JSX surface, runtime,
  and test.
- `measure/generate.sh`: passed at source revision `1c9734bf0`.
- Track-scoped marker gate: passed.
- Full `measure/doctor.sh`: remains non-zero only because nine unrelated active
  legacy plans still use deprecated top-level `[ ]` markers. This track is not
  listed by the failure and no unrelated plans were modified.

## Known repository noise

- Focused Advantage Games Jest emits existing React `act(...)` warnings from
  `ExistingCoreCartridgeQc`; the S1 QC assertions pass.
- The standard Playwright config invokes a pnpm predev reconciliation path that
  is incompatible with the repository's stale lock state. Browser verification
  used the same Next app and Playwright spec with a direct Next server and the
  installed Chromium binary, without dependency or lockfile changes.
