# Sales curriculum release process

The launch curriculum follows Codecamp's progressive construction:

1. **Learn** a method from a theory lesson.
2. **Practice** it in a realistic school-sales roleplay.
3. **Evaluate** the recording against a source-grounded rubric and the lesson's
   canonical excerpts.
4. **Reflect** through feedback, retry/best-attempt, or a quiz before advancing.

`release-candidate.json` binds the deterministic curriculum graph to the exact
`advantage-pr` commit and SHA-256 of every source document. Automated checks
verify graph identity, module order, rubric source references, honest-claims
guardrails, and non-empty roleplay excerpts. They do not count as human review.

## Generate an OpenRouter review draft

The command below writes curriculum plus non-secret provider/model/source
provenance. It never approves or seeds the result.

```bash
AI_PROVIDER=openrouter \
OPENROUTER_API_KEY='<provided securely>' \
pnpm --filter sales-advantage curriculum:generate-openrouter-draft -- \
  --source-root=/absolute/path/to/advantage-pr \
  --output=measure/tracks/sales_advantage_golive_20260701/openrouter-curriculum-draft.json
```

Sending the private source corpus requires explicit approval for OpenRouter.

## Human approval

Review the pinned graph and complete
`measure/tracks/sales_advantage_golive_20260701/curriculum-approval.md`. Then set
the manifest approval fields to the real reviewer, UTC review time, evidence
path, and four checked review dimensions. Do not infer approval from authorship,
tests, deployment, or an admin account.

`seed:production-curriculum` fails with
`SALES_CURRICULUM_HUMAN_APPROVAL_REQUIRED` until that evidence is complete and
still matches the graph digest.
