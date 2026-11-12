# Primary class code: six hours

Owner request, 2026-11-12: "ปรับเป็น 6 ชม.แล้ว Deploy เลย"
Follow-up: "ขอภาพ screenshot ด้วยนะ"

New class sign-in codes expire six hours after Start class or New code. End class
continues to close the code immediately. Existing stored expiry times stay as issued.
Update the teacher manual in every locale and the current cutover documentation.
Deploy Primary Advantage, verify the live service, and deliver a browser screenshot.

The owner explicitly authorized deployment in this session. No database schema change
or change to student sign-in session policy is part of this task.

## Owner update: restore automatic production deployment

Owner request, 2026-11-12:

> ปรับกลับให้ push แล้วขึ้นเว็บอัตโนมัติเหมือนเดิมเลย แล้ว Deploy ตัว 6 ชม. ขึ้นเว็บจริงให้ด้วย
> แล้วก็ปรับกลับ ให้สลับ traffic เหมือนเดิม

This instruction supersedes the November 7 manual-only Primary release decision D1.
The archived `per_app_cicd_20261107` decision remains historical; the other apps keep their
existing deployment modes.

An affected push to `master` must build Primary, run `refuse-legacy-db`, `migrate-db`, and
`doctor-check`, deploy the app, then run `update-traffic --to-latest`. Keep the Primary V2
secret, Cloud SQL proxy, and required migration `0074_primary_help_events`. A failed check
must stop deployment. Primary becomes a direct deployment in the app table.

The manual Primary traffic file remains an optional fallback, including its existing
release-source binding. Normal pushes do not call it. Verify the six-hour release on the
public production host and confirm 100 percent traffic follows the latest revision.
The requested browser screenshot is still part of delivery; retry capture after deployment.
