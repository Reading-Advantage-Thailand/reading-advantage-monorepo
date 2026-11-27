# Plan — Lexical matcher and article profile job

Status: shelved, not done (PM 2026-11-27)

Light card. One registry line in `measure/tracks.md`. This shared foundation serves the Reading plan and the B2C plan. No spec, no review, no gates.

## Phase 1

- [ ] Port the lexical matcher from the Mastery Advantage recommendation contract into `packages/domain/src/reading-recommendation/`. Pass the nine reference fixtures.
- [ ] Add the `article_lexical_profiles` table and the article profile job that fills it for articles on the keep list.
- [ ] Add tests for longest-group matching and for a profile rerun. Record the job result under this task.
