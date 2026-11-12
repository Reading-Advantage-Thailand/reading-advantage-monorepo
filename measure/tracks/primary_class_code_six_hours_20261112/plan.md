# Primary class code: six hours

- [x] Add the owner-authorized isolated production QA teacher/school/class fixture,
  sign in through the public production host, open its class code through Start
  class, and capture the actual Class sign-in screen with expiry timing evidence.
  Remove the one-time workflow after it runs. The earlier Cloud Run screenshot
  proves deployment only and does not satisfy this follow-up.

Production Class sign-in proof: temporary workflow f353696c1 ran successfully
as GitHub run 43168271198 / job 131015167463. Cloud Build
ca31d5ee-2931-42b2-81f9-72fc65761eb2 committed the five fresh QA fixture records
in primary_v2 at 2026-11-12 06:28:29 UTC. No real students or pre-existing records
were changed. The temporary workflow is removed after its successful run.

The QA teacher then signed in on primary.reading-advantage.com, opened its new
classroom, and pressed Start class. The click was observed at 13:30:29 Bangkok
time; the actual Class sign-in panel displayed Open until 7:30 PM (19:30).
The screenshot Primary_ClassSignIn_Live_6h.jpg shows the real generated code and
expiry. No expiry was inserted by the seed and no DOM was modified for proof.
The isolated QA school, teacher, and classroom remain as the owner requested.

- [x] Change the expiry regression check to six hours; confirm it fails, then update
  the owning constant and current documentation.
- [x] Run the student login tests, affected type checks and production build; review
  the change with a separate agent.
- [x] Commit and merge the change to master and deploy the candidate (4455d10f3;
  Cloud Build 3576b6bd-907b-4298-be16-40d0274ff71b; revision 00147-qaj).
- [x] Restore automatic Primary deployment on an affected push to `master`, retaining
  the database guard, migration and doctor checks, then deploy and restore latest-revision
  routing with `update-traffic --to-latest`. Update the app selector, contracts, and runbook
  for Primary only.
- [x] Run the affected deployment contract tests and separate review, then push the
  workflow change to `master` so the existing GitHub deployment identity runs it.
- [x] Follow Cloud Build through the database gates, deploy, and automatic traffic move;
  verify the six-hour release on the public host and 100% latest-revision traffic.
- [x] Capture the requested browser screenshot after production verification; the
  Cloud Run console shows the serving revision at `100% (to latest)`.

Deployment and browser verification are authorized by the owner's request. The owner
explicitly restored push-to-production and automatic traffic routing on 2026-11-12,
superseding the earlier manual-only Primary release decision. The workflow update
is deployed and production verification is complete.

Validation so far: the changed six-hour assertion failed against the three-hour
implementation, then all 102 student-login domain tests and 38 Primary handler and
class-control tests passed. Domain and Primary type checks passed. Separate review
found no Critical, High, or Medium issues; its Low stale comment was corrected.
All five locale JSON files parse and explain six hours. Production build passed after restoring exact Git LF bytes in packaged Sales
evidence fixtures; no tracked Sales changes are part of the patch. The existing
four dynamic filesystem tracing warnings remain unrelated to this change.

The earlier browser attempt could not establish the Windows browser URL. The
later verification used the existing signed-in Cloud console and saved
`Primary_AutoDeploy_6h_Traffic.jpg` as a delivered artifact. No class mutation was
performed; new Start class / New code values use six hours, while existing expiry
rows retain their stored times.

Candidate checks: `/en` and `/en/auth/signin` both returned 200 and embedded the
six-hour teacher-manual sentence; the old three-hour sentence was absent.
Candidate: https://pa-3576b6bd---primary-advantage-app-kxpqzttnmq-as.a.run.app

Earlier manual promotion attempt, before the owner restored automatic deployment:
production promotion was attempted with the original traffic config and the exact
candidate source archive. The CLI rejected source-bucket access. The equivalent
Cloud Build API request returned 403 for acting as the build service account.
No traffic build was created and no migration or traffic change ran. The owner was
asked to sign in with an existing deploy-capable gcloud account.

CI note: the Primary job stopped in the unchanged `@reading-advantage/backend`
tests: concurrent last-admin removal expected LAST_COMPANY_ADMIN_REQUIRED but got
FORBIDDEN, and a route-binding test expected ERR_PACKAGE_PATH_NOT_EXPORTED but got
ERR_MODULE_NOT_FOUND (601 passed, 2 failed, 52 skipped). Backend, auth, and DB content
are identical to the base. Base commit 17ab2d5 already had red CI, stopping earlier
in an activity-runtime package-entry test; the same two outcomes were not observed
on that earlier run. The six-hour domain, handler, and UI tests passed locally.

Automatic release validation: Primary database contracts passed 9/9, Cloud Build
artifact checks passed 18/18, and the real workflow selector correctly selects each
of the six deploy-matrix apps individually, including direct Primary. The Primary
workflow contract confirms database doctor, deploy, then `--to-latest`. Separate
runtime review found no actionable findings. Windows manifest regressions B10,
B15, and B18 passed after portable fixture-path corrections. The full Linux
`CI selector tests` step passed for commit 2b8c25d9 in CI run 43160466991.

That CI run's Core job stopped afterward on the existing architecture analyzer
snapshot mismatch, also observed before this workflow change and documented in
`measure/archive/per_app_cicd_20261107/plan.md`. The Primary job stopped only in
the unchanged Company Identity route-binding test (expected
ERR_PACKAGE_PATH_NOT_EXPORTED, received ERR_MODULE_NOT_FOUND): 602 backend tests
passed, 1 failed, and 52 skipped. Concurrent administrator safety tests passed in
this run. No architecture manifest or unrelated backend code was changed.

The automatic release workflow was pushed to `master` as 2b8c25d9. Its Primary
Cloud Build bf383284-a9cb-4ef0-8717-c02794cf40da completed successfully at
2026-11-12 05:34:51 UTC. All seven steps passed, including refuse-legacy-db,
migrate-db, doctor-check, deploy-cloudrun, and update-traffic. The Primary GitHub
CD job 130990422868 also completed successfully.

Production is Ready on revision `primary-advantage-app-00140-fhl`; its image
matches this build's pushed image. Both configured and serving traffic have
`latestRevision: true` and `percent: 100`, restoring automatic routing for later
affected pushes. Public `/en`, `/en/auth/signin`, and `/th/auth/signin` returned
200. English pages contain the six-hour manual sentence and omit the old
three-hour sentence. An unauthenticated POST to class-session/start returned 401.
The requested screenshot shows the new revision at `100% (to latest)` and the
previous serving revision at 0%.
