# Closure State Verification — `company_identity_sso_20260715`

Verified 2026-07-20 against the current plan, metadata, review, production
evidence, and the Codecamp cutover runbook. The requested runbook filename is
not present in this track directory; the authoritative copy is
`apps/codecamp-advantage/docs/codecamp-sso-cutover-runbook-20260719.md`.

The plan contains 49 numbered tasks. Metadata still says 56 estimated tasks and
has not been reconciled with the plan.

## Completed

### Phase S1 — Establish Company Identity Boundary

- [x] Tasks 1–5: ownership/contracts, schema, contract tests, PostgreSQL tests,
  and separate identity database infrastructure.
- [x] Evidence: plan commits `7516c48b`, `b9d81557`, `60ad9d28`, `ba033761`,
  and `43c16457`.

### Phase S2 — Provide Employee SSO

- [x] Tasks 8–13: OIDC/session contracts, threat model, OIDC/session tests,
  cross-application tests, Accounts provider, and reusable client adapter.
- [x] Evidence: Accounts auth implementation, PostgreSQL-backed sessions and
  codes, revocation/readiness gates, and production Accounts logout verification.

### Phase S3 — Manage Employees and App Roles

- [x] Tasks 15–19: capability policies, authorization and PostgreSQL tests,
  employee-management backend, and Accounts administration UI.
- [x] Evidence: production create, role separation, suspend/restore, reset,
  revocation, employee denial, and last-administrator protection checks.

### Phase S4 — Connect Marketing

- [x] Tasks 21–24: Marketing contracts, authorization/SSO tests, integration,
  route migration, and production regression verification.
- [x] Evidence: `marketing-00013-jil` at 100%, public-domain SSO, role isolation,
  workspace persistence, settings protection, and rollback evidence.

### Phase S5 — Connect Sales Advantage

- [x] Tasks 26–31: Sales contracts, role/ownership tests, SSO integration,
  Accounts onboarding, and domain regression verification.
- [x] Evidence: `sales-advantage-00005-yas` at 100%; continuation build passed
  15/15 steps. Full feature QA is still not complete.

### Phase S6 — Migrate Codecamp Accounts

- [x] Tasks 33–41: migration contract/preflight, unit and PostgreSQL tests,
  dry-run/apply tooling, idempotent migration, Codecamp SSO code, rehearsal,
  and migration-readiness evidence.
- [x] Evidence: five identities and stable principals migrated; 155 progress
  rows, 24 reviews, and 3 chats remained owned by the existing product rows.

### Phase S7 — Cut Over and Verify Production

- [x] Tasks 42–46: rollout contract, deployment-gate tests, deployment gates,
  Accounts production deployment, and staged Marketing/Sales rollout.
- [x] Task 49 sub-items for published topology, client registry, secret
  inventory, migration evidence, rollout evidence, and quality-gate evidence.

## In-Progress

### Phase S1

- [~] Task 6: backend identity module and adapter boundary. The plan still
  lacks the approved repository/adapter ownership root, exact architecture
  allowlists, executor policy wiring, and ratchet-test evidence.

### Phase S7

- [~] Task 47: Codecamp migration and cutover. Migration is complete, but the
  company-mode revision is not deployed, candidate smoke tests are not run, and
  the observation window has not started.

## Pending

### Phase S1

- [ ] Task 7: generated identity facts, Measure/database doctors, package gates,
  and `graph.db` update.
- [ ] Phase S1 manual verification task.

### Phase S2

- [ ] Task 14: protocol documentation, generated capability/route facts, full
  doctor and package gates, and graph inspection/update.
- [ ] Phase S2 manual verification task.

### Phase S3

- [ ] Task 20: role matrix, recovery procedures, capability/audit documentation,
  doctor/package gates, and graph update.
- [ ] Phase S3 manual verification task.

### Phase S4

- [ ] Task 25: Marketing documentation, generated facts, doctor/package gates,
  architecture guards, and graph update.
- [ ] Phase S4 manual verification task.

### Phase S5

- [ ] Task 32: Sales documentation, generated facts, doctor/package gates, and
  architecture/authorization guards.
- [ ] Phase S5 manual verification task.
- [ ] Open Sales feature probes: ordinary rep, audio, AI roleplay, streaming
  chat, rate limits, curriculum quality, and final denial repeat.

### Phase S6

- [ ] Phase S6 manual verification task. The plan calls graph/doctor closeout
  deferred even though Task 41's evidence sub-items are checked.

### Phase S7

- [ ] Task 48: explicit approval, observation acceptance, legacy-auth retirement,
  final cross-application checks, and preservation of backup evidence.
- [ ] Task 49 remaining independent security/migration/change-quality review and
  final documentation/quality closeout.
- [ ] Phase S7 manual verification task.

## Runbook Command-Sequence Verification

The sequence is conceptually correct and uses the documented invariants:
Codecamp project `codecamp-advantage`, Accounts project `reading-advantage`,
region `asia-southeast1`, shared instance
`reading-advantage:asia-southeast1:cloud-sql`, Codecamp runtime service account,
and the Accounts-owned secret project number `1090865515742`.

It is not fully executable as written without these corrections:

1. **Phase 0 is executable and is the current hard gate.** Resolve the project
   number and grant both exact bindings:

   ```bash
   CODECAMP_PN=$(gcloud projects describe codecamp-advantage \
     --format='value(projectNumber)')
   gcloud secrets add-iam-policy-binding CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET \
     --project=reading-advantage \
     --member="serviceAccount:codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com" \
     --role=roles/secretmanager.secretAccessor
   gcloud secrets add-iam-policy-binding CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET \
     --project=reading-advantage \
     --member="serviceAccount:${CODECAMP_PN}@cloudbuild.gserviceaccount.com" \
     --role=roles/secretmanager.secretAccessor
   gcloud secrets get-iam-policy CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET \
     --project=reading-advantage --format=json
   ```

   The documented Cloud Build member resolves to
   `148839308272@cloudbuild.gserviceaccount.com`. Both members must be present.

2. **Phase 1 is executable but under-validates the region.** Require this
   invariant check before proceeding:

   ```bash
   gcloud sql instances describe cloud-sql --project=reading-advantage \
     --format='value(connectionName,region,state)'
   ```

   Expected values are `reading-advantage:asia-southeast1:cloud-sql`,
   `asia-southeast1`, and `RUNNABLE`; also run the documented anchor, secret,
   and five-principal checks.

3. **Phase 2 is executable after Phase 0.** The build command and
   `cloudbuild.yaml` agree on project, region, image repository, Cloud SQL
   instance, company mode, migration `0043_codecamp_company_principal_sync`,
   and no-traffic `sso-candidate` deployment.

4. **Phase 3 needs command fixes.** `curl -sf` is incompatible with the expected
   401/403/409 responses, and parsing `value(status.traffic)` as JSON is not a
   stable revision selector. Resolve the tagged revision and URL using the
   `sso-candidate` tag, then use `curl -sS -o /dev/null -w '%{http_code}'` for
   expected negative responses. Do not derive the tagged URL from the mutable
   current `gcloud config` project.

5. **Phase 4 is executable after a candidate digest exists.** It correctly
   creates a no-traffic legacy revision from the candidate image, removes the
   company secret, and sets `CODECAMP_AUTH_MODE=legacy`. The operator must
   capture and verify the tagged revision before traffic changes.

6. **Phase 5 needs a deterministic tag selector.** Selecting any zero-traffic
   revision can choose the legacy rollback revision. Select the revision with
   tag `sso-candidate`, verify 25% traffic, run smoke checks, then promote that
   exact revision to 100%.

7. **Phase 6 has a schema-name error in its sample SQL.** The identity schema
   defines `company_accounts` and `company_application_role_assignments`, not
   `company_user` or `company_app_role`. Use a reviewed join against the actual
   tables before treating the identity count as evidence. Cloud SQL access also
   requires the approved direct connection/Proxy and operator credentials.

8. **Phase 7 is executable only before source-role repair.** After repair, the
   new Phase 4 `legacy-rollback` revision is the only valid rollback target;
   the old `codecamp-advantage-00019-682` anchor must not be used.

## External-Operator Blocked

The following are the remaining blockers and the exact actions required.

1. **Cross-project Secret Manager IAM — hard blocker.** A project IAM operator
   with permission to edit the secret policy must grant
   `roles/secretmanager.secretAccessor` on
   `projects/1090865515742/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET` to
   both identities, then verify the policy:

   ```bash
   CODECAMP_PN=$(gcloud projects describe codecamp-advantage \
     --format='value(projectNumber)')
   gcloud secrets add-iam-policy-binding CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET \
     --project=reading-advantage \
     --member="serviceAccount:codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com" \
     --role=roles/secretmanager.secretAccessor
   gcloud secrets add-iam-policy-binding CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET \
     --project=reading-advantage \
     --member="serviceAccount:${CODECAMP_PN}@cloudbuild.gserviceaccount.com" \
     --role=roles/secretmanager.secretAccessor
   gcloud secrets get-iam-policy CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET \
     --project=reading-advantage --format=json
   ```

2. **Cloud SQL/operator pre-flight.** The deployment operator must prove the
   shared instance is the approved instance and runnable, then prove the five
   migrated principals through the direct Codecamp database connection:

   ```bash
   gcloud sql instances describe cloud-sql --project=reading-advantage \
     --format='value(connectionName,region,state)'
   psql "$CODECAMP_DATABASE_URL" -Atc \
     "select count(*) from codecamp_company_principal where archived_at is null" \
     | grep -E '^5$'
   ```

   Expected connection name is
   `reading-advantage:asia-southeast1:cloud-sql`; expected state is `RUNNABLE`.

3. **Codecamp deployment and smoke-test operator action.** After IAM and
   pre-flight pass, submit the pinned build from the repository root:

   ```bash
   gcloud builds submit . --project=codecamp-advantage \
     --region=asia-southeast1 \
     --config=apps/codecamp-advantage/cloudbuild.yaml
   ```

   The operator must capture the candidate revision/digest, run migrated-admin
   and migrated-intern login, role-isolation, progress, GitHub-mapping, and
   product-ownership probes, and stop if any gate fails.

4. **Post-cutover observation and signoff.** An operator must record the final
   traffic-shift timestamp, observe all four apps for 30 consecutive minutes
   with the specified two-hour log lookback, record metrics and revision names,
   and sign the acceptance contract. No observation window has started because
   Codecamp has no promoted company revision.

5. **Legacy-auth retirement approval.** A company owner must explicitly accept
   migration exceptions, rollback evidence, and the observation results before
   disabling legacy credential paths and removing legacy secrets. The current
   repository has no approved retirement command or signed operator approval;
   do not infer approval from `CODECAMP_AUTH_MODE=company`.

6. **Documentation and independent review.** The track owner must backfill the
   unchecked S1–S5 documentation/manual tasks, reconcile metadata's stale 56-task
   estimate, complete the independent security/migration/change-quality review,
   and attach final operator evidence before archive.

## Ready-to-Archive Checklist (cannot archive yet)

- [ ] Both secret-level IAM bindings verified in the Accounts project.
- [ ] Cloud SQL connection name, region, and `RUNNABLE` state verified.
- [ ] Codecamp company-mode candidate deployed at 0% traffic.
- [ ] Candidate URL, digest, readiness, login guards, and Accounts discovery
      verified with corrected commands.
- [ ] Post-repair `legacy-rollback` revision created and tested.
- [ ] Codecamp traffic shifted through 25% and 100% gates.
- [ ] Migrated admin/intern role, progress, GitHub, and ownership probes pass.
- [ ] Sales remaining feature QA and denial repeat pass.
- [ ] Thirty-minute observation window passes with operator signoff.
- [ ] Legacy-auth retirement explicitly approved and executed.
- [ ] S1–S7 documentation, manual verification, graph/doctor, and independent
      review tasks are reconciled in `plan.md`.
- [ ] Metadata task estimate/status is reconciled with the 49-task plan.

## Closure Estimate

The auditable checklist is **40/49 numbered tasks complete (81.6%)**, with two
tasks in progress and seven pending. Counting each in-progress task as half gives
an optimistic **42/49 (85.7%)**, but that is not production closure: Codecamp is
not serving company SSO, the observation window has not run, and legacy retirement
is unapproved. The maximum defensible current estimate is therefore **82% track
closure**, with the remaining 18% blocked by the external IAM/Cloud SQL/operator
actions and the documented reconciliation/review work.
