# Primary Advantage Test Gaps

Status: initialized during Phase 0 setup.

Test gaps must distinguish:

- Artifact/documentation tests that verify review artifacts, manifests, coverage TSVs, and finding schemas.
- Live behavior tests that exercise application routes, workflows, auth/session behavior, tenant boundaries, and user-visible behavior.
- Unit/contract tests for domain, adapter, validation, and persistence seams.
- E2E/manual UX checks required for primary-student workflows.

No test gaps are accepted from setup alone; subsequent reviewers must cite line-level evidence and, when relevant, observed gate output.
