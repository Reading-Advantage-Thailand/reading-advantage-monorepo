# Product Risk Register

| Risk | Severity | Affected products | Evidence | Product impact | Decision needed |
|---|---|---|---|---|---|
| Primary core learning loop crashes | Critical | Primary Advantage | ~30 game components crash on completion | Students cannot complete lessons/games | Fix before any student deployment |
| Reading tenant/auth gaps | Critical | Reading Advantage | 0/209 routes use TenantDB/assertCan; unauth endpoints | Cross-school data and privilege risk | Prioritize over feature work |
| CodeCamp PR review unreliable | High | CodeCamp Advantage | TenantScopeError, sync LLM webhook, no idempotency | Intern workflow and GitHub automation fail | Confirm in prod, then DLQ/job track |
| Sales audio/AI privacy | High | Sales Advantage | Raw learner/prospect audio sent without consent/redaction | Privacy/compliance exposure | Define consent/retention policy |
| Marketing public API exposure | Critical/High | Marketing App | unauth settings/video routes, API key exposure | Token spend and credential leakage | Gate routes before public use |
| Games not import-ready | High | Reading/Primary + Advantage Games | all games NOT-READY/AT-RISK for import | Regresses student XP/progress if embedded | Hold import until contract track complete |
| Website claims mismatch | High | Public website | stale dates, nonexistent apps, placeholder case studies | Trust/reputation/legal risk | Product-owner claims review |
| Test false confidence | High | All apps | vacuous/tautological/live-prod tests | Remediation may close without real safety | Mandate behavior gates |

## Product Owner Questions

1. Which public product pages should remain visible for apps with no code directory?
2. What AI provider/model claims are approved for public marketing after current implementation review?
3. What consent/retention language is required for Sales audio roleplay?
4. Should Advantage Games be embedded into Reading/Primary soon, or remain standalone until shared runtime work completes?
5. Which legacy Reading/Primary workflows are highest traffic and should anchor first route/domain migration slices?
