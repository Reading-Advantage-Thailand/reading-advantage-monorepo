# Plan — Primary Student Login

Owner lane: B. Depends on cutover blockers Phase 2 for argon2.

## Phase 0: Read the current flow (1 h)
- [x] Map `components/auth/` student form, `api/auth/*`, `lib/session.ts`, `proxy.ts`, `lib/route-policies.ts` (d6243eb5f)
- [x] List what `@reading-advantage/auth` already offers (rate-limit, audit, sessions) (d6243eb5f)

## Phase 1: Contracts and schema
- [x] Zod contracts for the new requests (b05454309)
- [x] Additive migration, db package, with tests (9ad13562c; 0062 also adds sessions.auth_strength; drizzle drift on primary_legacy_id_map_new_id_idx removed from the SQL)
- [x] `authStrength` in the session and the route policy (ab7febf68, committed under a wrong chore(measure) subject; helper in apps/primary-advantage/lib/auth-strength.ts, not wired to Reedy)

## Phase 2: Server (tests first)
- [x] Class session start/end, code generation, expiry (ad3fef1f3; 2b3722647 adds unique open-code index; name list uses the credential id as opaque handle; restart replaces the open session; routes dad2b819a)
- [x] Picture-password verify, lockout, reset (12ae97d1d; 0063 adds classrooms.picture_password_enabled in 2b3722647; code-only sign-in when the class setting is off; teacher lockout list; routes dad2b819a)
- [x] QR token issue, verify, rotate (1cde62216; 256-bit token, SHA-256 in card_token_hash; scan checks credential school and class membership; failed scans limited per IP, 30 per 10 min; issue and rotate by class teacher or school admin; routes qr, card-token/rotate, card-token/issue)
- [x] Username/password path (ab2b017ad; provisionStudentLogins at add-student and both CSV imports; username is class prefix plus number, for example p3a12; initial password has 8 readable characters and is returned once as studentLogins/credentials; only students created by an upload change)
- [x] Rate limits and audit entries (49f2385dc; per IP, per class, global failed-lookup limit; audit start, end, lockout, reset, assign, setting; fail-closed authStrength 779bc5945)

### Run 2b decisions (defaults, owner may change)
- Student session policy (FR-9, cc10574c9): the school day ends at 17:00 Asia/Bangkok (default; constant `SCHOOL_DAY_END_HOUR` in packages/auth). A sign-in at or after 17:00 gets the next 17:00. Idle limit is 30 minutes. One session per student: a new sign-in ends the old one. Migration 0064 adds nullable `sessions.idle_timeout_seconds` and `sessions.last_seen_at`; "last seen" is written at most once a minute and feeds the Phase 3 live roster. The shared login applies the policy only to STUDENT when the app sets `studentSessionPolicy: true` (Primary does).
- Initial passwords are not stored in plain text. The class sheet in Phase 3 needs a "reset passwords for the class" use-case, because only the creation or import response carries the plain initial password.
- `userModel.createUser` (public sign-up action) is not changed: owner decision says no self-service accounts.

## Phase 3: Teacher UI
- [x] Start/End class control on the class page (c2a8ec409; panel on `teacher/class-roster/[classroomId]`; new read `getClassLoginRoster`, route `roster`)
- [x] Live roster with lockout and reset (77fbc8a2d; polls roster + lockouts every 10 s while visible; adds `qrcode` 1.5.4 and `@types/qrcode` to the Primary app only)
- [x] Class sheet and QR card print pages (219ddc225; new use-case `resetClassPasswords`, route `class-passwords/reset`)
- [x] Class setting for the picture password (8fc0d42a7)

### Phase 3 decisions (defaults, owner may change)
- The class code shows once. The server keeps only its hash, so after a page reload the panel says the class is open and offers New code (restart replaces the code, Phase 2 rule).
- Roster read: `getClassLoginRoster` returns the open session, the setting, and per student `signedIn` and `lastSeenAt` from `sessions` (same idle rule as `validateSession`), plus booleans for picture password and card. No hash leaves the server. Locked students come from the Phase 2 lockouts route.
- Picture pictures: 12 inline SVG pictures in `components/student-login/pictures.tsx`. The array index is the stored picture number and must not change. Phase 4 reuses it for the student grid.
- QR card URL: `<origin>/auth/card#<token>`. The token is in the fragment, so it stays out of server logs and Referer headers. Phase 4 builds `/auth/card`: read `location.hash`, POST `/api/auth/student/qr`.
- Class sheet: `resetClassPasswords` (teacher of the class or school admin) sets new initial passwords for the whole class and returns them once. Each student's credential write and session delete run in one transaction. A failed student keeps the old password and is listed. Audit `student_login:class_password_reset` with counts only. Limit: 5 resets per class per 10 minutes (default chosen here).
- QR cards: issued by a button, not on page load. Cards made earlier cannot be shown again; the page offers New card (rotate) for each. 8 cards per A4 page.
- Print isolation: `PrintStyles` hides everything outside `[data-print-area]` with `:has()` (Chrome 105+, Safari 15.4+, Firefox 121+). No change to `styles/globals.css`.
- The roster has "Give picture passwords" (Phase 2 assign route) for students without one, because import does not assign pictures.

## Phase 4: Student UI
- [ ] Code entry, name list, picture grid, QR scan page
- [ ] Username/password form
- [ ] Thai and English copy; 48 px targets; 375/768 layouts

## Phase 5: Verify
- [ ] 25-student browser test through all paths
- [ ] Security review by a separate agent (no shared context with the author)
- [ ] Timing check in QA
