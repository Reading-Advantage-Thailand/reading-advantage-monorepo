# Phase S2 Mandatory Review

**Date:** 2026-07-11

## Initial findings

The mandatory reviewer requested changes for three Medium and one Low issue:

1. Arrow keys and Space could control a cartridge while also scrolling the browser.
2. Inclusive adjacent pointer-region boundaries could emit two actions for one press.
3. `pointercancel` was indistinguishable from a completed touch swipe.
4. Surface origins and gate seeds lacked the complete numeric validation claimed by the public API.

## Remediation

- Scoped `preventDefault()` to Arrow keys and Space while leaving Tab and unrelated keys unaffected.
- Stopped pointer-region resolution after the first deterministic match and added exact shared-boundary coverage.
- Added a canceled-gesture flag to normalized APK pointer state and excluded canceled touches from swipe resolution.
- Validated finite surface origins and integer gate seeds.
- Added regression tests for every finding.

## Re-review verdict

All findings are resolved. The reviewer reported zero remaining Critical, High, Medium, or Low findings and returned **PASS**.
