# Plan review findings — sales_training_2027_20261015

## Phase S1 review (2026-10-15, range `origin/master..3b78191e0`)

Automated reviewer: no Critical or High findings. Commands: `packages/ai` vitest 245 pass
(3 failures in `phase-10-closeout.test.ts` exist on master), `packages/domain` 22/22,
`apps/sales-advantage` 27/27, `tsc` clean in the three packages, eslint clean.

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | Medium | Criteria match by exact name; a shortened or translated name scores 0, and the prompt invites extra criteria | Fixed: prompt rule (one entry for each rubric criterion, rubric order, exact text) |
| 2 | Low | The position fallback can use a model entry again; duplicate rubric names share one entry | Fixed: unmatched rubric criteria take the unused model entries in order |
| 3 | Low | The route accepts `audio/mp4`, the adapter rejected it; the recorder labels every recording `audio/webm` (Safari records MP4/AAC) | Fixed: `audio/mp4` → `m4a` (live check: both models transcribe it); the recorder labels the blob with the recorder's base type |
| 4 | Low | A scoring error inside the model `try` starts the backup model and is reported as a model failure | Fixed: the score is calculated after the model calls |
| 5 | Low | The API key is a visible property of the provider | Fixed: ES private field |
| 6 | Low | The evaluator logs full error objects (can contain model output with trainee speech) | Fixed: logs only the model and the error message |
| 7 | Low | Two 120 s calls can exceed `maxDuration` 180 | Fixed: `maxDuration` 300 (Cloud Run default request timeout) with a correct comment |
| 8 | Low | The deploy must also add a new `SALES_AUDIO_EVAL_MODEL` version, or Nemotron stays the main model | In the deploy task (owner OK) |
