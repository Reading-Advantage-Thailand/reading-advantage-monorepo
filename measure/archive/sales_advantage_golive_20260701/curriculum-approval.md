# Sales curriculum approval evidence

> Status: approved for production publication
>
> Curriculum graph: `ccba5498f453f1e2982307ca29d9d56c8bf17aeb26e1d586de232b44416b8717`
>
> Source corpus: `advantage-pr@8dd78171f1d57dd775fad2295d60e86fb267dad8`

The reviewer must inspect the immutable graph represented by
`apps/sales-advantage/scripts/static-seed.ts` and its source-bound manifest at
`apps/sales-advantage/curriculum/release-candidate.json`.

## Required review

- [x] Pedagogy: progression is learn → practice → evaluate → reflect, with
      prerequisites increasing from discovery through closing.
- [x] Source traceability: every selected source file matches both the working
      bytes and committed bytes at the pinned `advantage-pr` commit; every rubric
      criterion uses a registered named source or a verified corpus path + section.
- [x] Honest claims: the Aka (2019) phrasing and prohibited-claim guidance match
      `06-research-and-evidence/outcome-claims-policy.md`; negative examples are
      clearly taught as statements reps must not use.
- [x] Roleplay quality: every launch scenario is realistic, has a useful rubric,
      and is grounded by non-empty canonical lesson excerpts.

## Approval record

- Reviewer: Project owner
- Reviewed at (UTC): 2026-07-18T23:11:09Z
- Decision: Approved for production publication
- Notes: The project owner explicitly approved publishing this exact curriculum
  package after it was identified as the six-module, 27-lesson Sales course with
  its quizzes, eight roleplay scenarios, scoring rubrics, and linked learning
  progression. The approval is bound to the graph and source fingerprints above.

Only the human reviewer may replace the pending values and check the boxes.
After review, the same reviewer must update `curriculum-approval.json` with the
exact graph, source manifest, UTC time, checks, and notes. Its SHA-256 is then
recorded in `curriculum/release-candidate.json`; the reviewer must independently
store that same hash in Secret Manager as `SALES_CURRICULUM_APPROVAL_SHA256`.
The seed gate requires the external trust anchor and verifies both files.
