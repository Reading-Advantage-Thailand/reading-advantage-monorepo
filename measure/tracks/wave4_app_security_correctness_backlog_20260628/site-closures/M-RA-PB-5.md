# Site-Closure Checklist — Reading M-RA-PB-5 (Reporting metrics correctness)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 4
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-PB-5
> **Resolves:** PB-005, PB-006; batches ra-batch-45, ra-batch-46
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/reading-advantage/server/controllers/report-controller.ts` (class-accuracy aggregation) | combines MCQ + open-ended into one accuracy figure | report MCQ accuracy and open-ended accuracy separately | 🔴 open |
| 2 | Combined-metric path (if required) | unweighted blend | weight by question type or normalize | 🔴 open |
| 3 | Scoring rubric | ad-hoc | shared scoring rubric enum used in grading + feedback + reports | 🔴 open |
| 4 | Open-ended scoring rubric doc | absent | document the rubric | 🔴 open |

## Closeout requirement
Rows 1–3 🟢 with report-correctness Red tests (MCQ-only cohort → MCQ accuracy only; open-ended-only
cohort → open-ended accuracy only; mixed → both reported). Defense A3 (labeled accuracy values
parsed, not bare digits). See `test-strategy.md` Phase 4.
