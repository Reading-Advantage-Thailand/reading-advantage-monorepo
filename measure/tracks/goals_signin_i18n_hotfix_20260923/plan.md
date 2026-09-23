# Plan: Goals and Signin i18n Hotfix

Track ID: `goals_signin_i18n_hotfix_20260923`

## Tasks

- [x] Task 1: Add `pages.student.goalsPage` scope (16 keys) to en, th, cn, tw, vi; wire the goals page shell and `goals-page-content.tsx` (stats, tabs, empty state, error state).
  - Verified: tsc clean; i18n invariant suite 9/9 pass.
- [x] Task 2: Add `pages.signInForm.usernameLabel` / `passwordLabel` to all 5 locales; wire `user-signin-form.tsx`.
  - Verified: tsc clean; invariant suite passes.
- [x] Task 3: Live-verify `/th/student/goals` renders zero hardcoded English and `/th/auth/signin` shows Thai labels (ชื่อผู้ใช้ / รหัสผ่าน). Owner manual verification S5.19 on 2026-09-23.
