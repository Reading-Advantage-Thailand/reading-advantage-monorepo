# Sales curriculum release process

The launch curriculum follows Codecamp's progressive construction:

1. **Learn** a method from a theory lesson.
2. **Practice** it in a realistic school-sales roleplay.
3. **Evaluate** the recording against a source-grounded rubric and the lesson's
   canonical excerpts.
4. **Reflect** through feedback, retry/best-attempt, or a quiz before advancing.

`release-candidate.json` binds the deterministic curriculum graph to the exact
`advantage-pr` commit and SHA-256 of every selected source document. Candidate
generation recomputes each hash from both the current file and the file stored at
the pinned Git commit, and verifies every corpus-backed rubric section exists.
Automated checks verify graph identity, lesson-level progression, registered
rubric sources, honest-claims guardrails, and roleplay excerpts. They do not
count as human review.

`scripts/static-seed.ts` is library-only and refuses direct execution. The only
production entrypoint is `seed:production-curriculum`, which verifies the human
evidence before opening the seed transaction. Production requires the
reviewer-controlled `SALES_CURRICULUM_APPROVAL_SHA256` trust anchor from Secret
Manager. If `SALES_CURRICULUM_SOURCE_ROOT` is supplied, the seed gate also
repeats the Git commit and source-byte checks; Cloud Build may omit the private
checkout because the external trust anchor binds the reviewed evidence file.

## Generate an OpenRouter review draft

The command below writes curriculum plus non-secret provider/model/source
provenance. It never approves or seeds the result.

```bash
AI_PROVIDER=openrouter \
OPENROUTER_API_KEY='<provided securely>' \
SALES_CURRICULUM_EXTERNAL_SHARING_APPROVED=advantage-pr-to-openrouter \
pnpm --filter sales-advantage curriculum:generate-openrouter-draft -- \
  --source-root=/absolute/path/to/advantage-pr \
  --output=measure/tracks/sales_advantage_golive_20260701/openrouter-curriculum-draft.json
```

Sending the private source corpus requires explicit approval for OpenRouter.
The provider-specific environment value is a code-enforced record of that
approval; setting it does not itself grant permission. Without it, the command
stops before reading source files or creating an AI client.

## Human approval

Review the pinned graph and complete
`measure/tracks/sales_advantage_golive_20260701/curriculum-approval.md`. Then
replace the pending values in the adjacent `curriculum-approval.json` with the
real reviewer, UTC time, `decision: "approved"`, the exact manifest source
object, four true checks, and substantive notes. Record that JSON file's SHA-256
and path in the manifest approval fields. The human reviewer must independently
place the same SHA-256 in Secret Manager as
`SALES_CURRICULUM_APPROVAL_SHA256`; a repo-only hash is not an approval trust
anchor. Do not infer approval from authorship, tests, deployment, or an admin
account.

`seed:production-curriculum` fails with
`SALES_CURRICULUM_HUMAN_APPROVAL_REQUIRED` until that evidence is complete. It
then verifies the evidence hash against both the manifest and the Secret Manager
trust anchor, plus reviewer, review time, graph digest, source manifest, and all
four checks before seeding. Candidate generation already verified the source
commit and every committed source-document byte.
