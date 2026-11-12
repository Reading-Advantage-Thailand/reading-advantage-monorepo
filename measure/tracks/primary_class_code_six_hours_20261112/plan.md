# Primary class code: six hours

- [x] Change the expiry regression check to six hours; confirm it fails, then update
  the owning constant and current documentation.
- [x] Run the student login tests, affected type checks and production build; review
  the change with a separate agent.
- [x] Commit and merge the change to master and deploy the candidate (4455d10f3;
  Cloud Build 3576b6bd-907b-4298-be16-40d0274ff71b; revision 00147-qaj).
- [b] Complete the Primary traffic gates and verify production: local gcloud account
  lacks `iam.serviceAccounts.actAs` on the build service account (403). Production
  remains 100% on 00143-zop; candidate pa-3576b6bd is ready with 0% traffic.
- [b] Screenshot: Computer Use stopped because the current Windows browser URL
  could not be established by its policy check. No screenshot was produced.

Deployment and manual browser verification are authorized by the owner's request.

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

Production promotion was attempted with the original traffic config and the exact
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
