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
- [ ] QR token issue, verify, rotate
- [ ] Username/password path
- [x] Rate limits and audit entries (49f2385dc; per IP, per class, global failed-lookup limit; audit start, end, lockout, reset, assign, setting; fail-closed authStrength 779bc5945)

## Phase 3: Teacher UI
- [ ] Start/End class control on the class page
- [ ] Live roster with lockout and reset
- [ ] Class sheet and QR card print pages
- [ ] Class setting for the picture password

## Phase 4: Student UI
- [ ] Code entry, name list, picture grid, QR scan page
- [ ] Username/password form
- [ ] Thai and English copy; 48 px targets; 375/768 layouts

## Phase 5: Verify
- [ ] 25-student browser test through all paths
- [ ] Security review by a separate agent (no shared context with the author)
- [ ] Timing check in QA
