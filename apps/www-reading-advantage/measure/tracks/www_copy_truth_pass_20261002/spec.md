# Spec: www copy truth pass

Source of truth: `advantage-pr/AGENTS.md`, `08-strategy/product-strategy-2026-2027.md`, `06-research-and-evidence/outcome-claims-policy.md`.

## Requirements
1. Remove retired or near-retired phrases ("One engine. Four products today") and banned words (guarantee, leading, best, optimal).
2. Remove unsourced numbers (85%, 100%, 50% gains, 30+ students, 60+ articles daily, 3000+ articles).
3. Public copy names CEFR only. No Cambridge, YLE, PET, GSE, or Pearson.
4. Tutor Advantage is a tutor-led class network that sells the printed books. It is not an AI tutor app. Add a Tutor hero on the home page beside the current message.
5. Blended Learning and Managed Service carry no stale dates. Managed Service is not pre-sold.
6. Scale is honest: 1 active school (Primary Advantage); no school uses Reading Advantage.
7. Reedy voice practice appears only on the Tutor Advantage page.
8. Mastery Advantage: live in CodeCamp Advantage, entering Primary Advantage through tagged content.
9. Same changes in en, th and zh. Daniel checks the Thai.
10. Primary Advantage files are in scope after commit d7f6609c7. Do not touch the `experience` section.

## Acceptance
- `npm run i18n:verify`, `check-types`, `lint`, and `test` pass.
