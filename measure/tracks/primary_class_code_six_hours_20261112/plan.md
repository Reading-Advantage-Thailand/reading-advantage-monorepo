# Primary class code: six hours

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
- [~] Run the affected deployment contract tests and separate review, then push the
  workflow change to `master` so the existing GitHub deployment identity runs it.
- [ ] Follow Cloud Build through the database gates, deploy, and automatic traffic move;
  verify the six-hour release on the public host and 100% latest-revision traffic.
- [ ] Retry the requested browser screenshot after production verification. The earlier
  attempt stopped because Computer Use could not establish the Windows browser URL.

Deployment and browser verification are authorized by the owner's request. The owner
explicitly restored push-to-production and automatic traffic routing on 2026-11-12,
superseding the earlier manual-only Primary release decision. Tests and production
deployment of that workflow update are pending.

Validation so far: the changed six-hour assertion failed against the three-hour
implementation, then all 102 student-login domain tests and 38 Primary handler and
class-control tests passed. Domain and Primary type checks passed. Separate review
found no Critical, High, or Medium issues; its Low stale comment was corrected.
All five locale JSON files parse and explain six hours. Production build passed after restoring exact Git LF bytes in packaged Sales
evidence fixtures; no tracked Sales changes are part of the patch. The existing
four dynamic filesystem tracing warnings remain unrelated to this change.

The browser screenshot tool stopped because it could not establish the current
Windows browser URL. No browser authentication or class mutation was performed.

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

Automatic release validation: Primary database contracts passed9/9, Cloud Build
artifact checks passed18/18, and the real workflow selector correctly selects each
of the six deploy-matrix apps individually, including direct Primary. The Primary
workflow contract confirms database doctor, deploy, then `--to-latest`. Separate
runtime review found no actionable findings. A full Windows Git-fixture run is
still being checked (affected-apps44passed/4failed); Linux CI is the authoritative
full selector run. No production traffic change has occurred yet.
