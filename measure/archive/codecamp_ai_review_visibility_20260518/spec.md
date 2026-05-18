# Codecamp AI Review Visibility

## Goal

Make it clear to admins and interns when AI PR review is expected, where the PR link lives, and why early modules such as Unit 1 do not produce AI review reports.

## Requirements

- Admin cohort dashboard exposes the latest PR review link/status when one exists.
- Admin intern detail view distinguishes modules with no AI review expectation from modules awaiting or showing PR review.
- Student module view explains that AI code review starts on PR-backed exercise modules when the current module has no exercise repo.
- Existing PR review summary/link behavior remains intact.
- No new production database migration is required for this visibility layer.

## Acceptance Criteria

- Intern overview rows include latest PR review metadata.
- Intern detail module breakdown includes review expectation metadata.
- English and Thai message catalogs stay in parity.
- Targeted domain/API/i18n tests pass.
