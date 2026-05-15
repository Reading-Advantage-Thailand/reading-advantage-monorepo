# Phase 2 Code Review Findings: Language Switcher & Routing

**Track:** codecamp_thai_i18n_20260515
**Phase:** 2 — Implement Language Switcher & Routing
**Revision range:** c5012d0..46ebe2a
**Date:** 2026-05-15

## Resolved Findings

| Severity | Finding | Fix Commit |
|----------|---------|------------|
| HIGH | Admin guard case-sensitive — uppercase variants bypass auth check | 46ebe2a |
| MEDIUM | Admin guard bypass for dot-containing paths | 46ebe2a (guard restructured) |
| MEDIUM | Query parameters lost in auth redirect | 46ebe2a |
| LOW | `aria-current` uses string instead of boolean | 46ebe2a |

## Remaining Medium/Low Findings (Accepted)

| Severity | Finding | Notes |
|----------|---------|-------|
| MEDIUM | Missing test: authenticated nested admin route | Added in 46ebe2a |
| LOW | Redundant static-bypass check inside proxy body | The matcher is the primary gate; body check is intentional defense-in-depth. Accept as-is. |
| LOW | Proxy tests do not verify `config.matcher` export | Added in 46ebe2a |

## Validation Gates

| Gate | Result |
|------|--------|
| Tests (codecamp-advantage) | ✅ 130 passed, 0 failed, 16 files |
| Lint (codecamp-advantage) | ✅ 0 errors, 0 warnings |
| Check-types (all) | ✅ All packages type-check cleanly |
