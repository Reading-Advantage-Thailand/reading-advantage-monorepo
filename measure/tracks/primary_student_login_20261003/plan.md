# Plan — Primary Student Login

Owner lane: B. Depends on cutover blockers Phase 2 for argon2.

## Phase 0: Read the current flow (1 h)
- [x] Map `components/auth/` student form, `api/auth/*`, `lib/session.ts`, `proxy.ts`, `lib/route-policies.ts`
- [x] List what `@reading-advantage/auth` already offers (rate-limit, audit, sessions)

## Phase 1: Contracts and schema
- [ ] Zod contracts for the new requests
- [ ] Additive migration, db package, with tests
- [ ] `authStrength` in the session and the route policy

## Phase 2: Server (tests first)
- [ ] Class session start/end, code generation, expiry
- [ ] Picture-password verify, lockout, reset
- [ ] QR token issue, verify, rotate
- [ ] Username/password path
- [ ] Rate limits and audit entries

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
