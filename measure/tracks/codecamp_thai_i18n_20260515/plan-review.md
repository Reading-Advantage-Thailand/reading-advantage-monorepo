# Phase Review: Contract & Schema

**Track:** codecamp_thai_i18n_20260515
**Phase:** 1 — Contract & Schema
**Review Date:** 2026-05-15
**Revision Range:** a3572a5..HEAD

## Summary

All quality gates pass (lint, type-check, 97 tests). No Critical or High findings.

## Findings

### Medium

- **M-1: `metadata` export in `layout.tsx` remains hardcoded to English**  
  The root layout's `metadata.title` and `metadata.description` are static English strings. The translation keys exist in both locale files but are not wired. Per-page `generateMetadata()` functions consuming locale messages will be implemented in Phase 3.  
  **Recommendation:** Address in Phase 3 when per-page metadata is wired.

### Low

- **L-1: `formatRelativeTime` misclassifies small future dates as "just now"**  
  Negative diff values (future dates) bypass the `< 30` check incorrectly. Low risk because all current callers pass past dates.  
  **Recommendation:** Consider adding a `diff < 0` guard.

- **L-2: `formatRelativeTime` has no test coverage for hours/days branches**  
  Only seconds and minutes branches are tested.  
  **Recommendation:** Add test cases for hours, days, and months.

- **L-3: `deepMerge` is tested only indirectly**  
  No direct unit test for the merge function.  
  **Recommendation:** Add direct `deepMerge` tests in Phase 4.

- **L-4: `importMessages` will throw runtime error for unvalidated locales**  
  Dynamic `import()` lacks a guard against locale strings not in `routing.locales`.  
  **Recommendation:** Add defensive check.

- **L-5: Plan.md sub-item checkboxes not updated**  
  Sub-items show `[ ]` despite being implemented.  
  **Recommendation:** Fix checkboxes for consistency.

## Quality Gate Results

| Gate | Result |
|------|--------|
| Lint | ✅ Pass |
| Type Check | ✅ Pass |
| Unit Tests | ✅ 97/97 pass (15 files) |
| Security Audit | ✅ No issues |
