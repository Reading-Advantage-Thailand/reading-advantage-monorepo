# Primary class code: six hours

- [x] Change the expiry regression check to six hours; confirm it fails, then update
  the owning constant and current documentation.
- [x] Run the student login tests, affected type checks and production build; review
  the change with a separate agent.
- [ ] Commit and merge the change to master, deploy a candidate, complete the Primary
  traffic gates, and verify the live six-hour expiry and screenshot.

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
