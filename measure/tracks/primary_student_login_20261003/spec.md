# Spec — Primary Student Login

Track ID: `primary_student_login_20261003`
Type: feature
Program: [primary-tutor-parity-program](../../primary-tutor-parity-program.md)

## Context

Today a student enters a class code and picks a name. Anyone who knows the code can
sign in as any classmate. Reedy gives each student a monthly voice budget and
records voice, so impersonation now has a cost. Students are about 8-12 years old
and cannot manage a long password. Classes have 20-30 students on shared devices.

## Design

1. Teacher-started session code. The teacher presses "Start class". The server
   creates a short code for that class only. It expires when the teacher ends the
   class or after 3 hours.
2. Name list. After a valid code, the list shows first name or nickname and a small
   avatar, in a fixed order. No full names, emails, or other PII.
3. Picture password. The student taps 3 pictures in order from a grid of 12. The
   pictures differ in shape AND color. The server stores an argon2 hash.
4. QR login card. Each student has a printed card with a QR code (long random
   token). One scan signs in. The teacher can print the class set and reset one card.
5. Username and password. Every student also has a username and password. This is
   the only way to sign in away from the classroom.
6. Auth strength. A student session carries `authStrength`: `full` (picture password,
   QR card, or password) or `code_only` (teacher turned the picture password off
   for the class). Reedy and profile changes require `full`.

## Functional Requirements

- FR-1: Teacher "Start class" and "End class" controls. One open session per class.
- FR-2: Rate limits per IP and per class on code attempts. Codes are not guessable
  in the session lifetime (length and alphabet chosen with the rate limit).
- FR-3: Picture password set. Random sequence assigned at class creation or import.
  Teacher can reset one student in one tap. Lockout for 5 minutes after 5 wrong tries.
  A lockout shows on the teacher live view.
- FR-4: Live roster for the teacher: who is signed in, who is locked, last seen.
- FR-5: QR card print page (print CSS, 8 cards per A4 page). Rotating a card
  invalidates the old token.
- FR-6: Username/password sign-in on a separate form, with the existing lockout rules.
  Generate usernames at roster import. Print them on the class sheet. A username is two simple
  English words and two digits (for example `bluetiger47`), set once and kept for years: no email,
  no class or grade part (owner decision 2026-10-08; the earlier class-prefix rule `p3a12` is gone).
  Students have no email: the student import (`students.csv`: `name,role,classroom_name`) asks for
  none, and migrated students keep none (owner decision 2026-10-08).
- FR-7: Class setting: picture password on or off. Default on.
- FR-8: Thai and English copy. Large tap targets (48 px minimum). Works at 768 px
  tablet and 375 px phone.
- FR-9: Session policy: student sessions expire at the end of the school day
  (Asia/Bangkok) and after 30 minutes idle. A new login on another device ends the old one.
- FR-10: Audit log entries (existing auth audit) for start, end, lockout, reset, card rotate.

## Schema (additive only)

New tables or nullable columns, named with a `primary_` prefix: class login session
(class, teacher, code hash, starts, expires, closed), student credential (user,
picture hash, failed count, locked until, card token hash, rotated at),
`authStrength` on the session record. No change to existing user columns.

## Known risks (owner decision pending)

- Picture password strength: 3 taps from 12 pictures gives 12^3 = 1728 sequences. With the
  lockout (5 wrong tries, then 5 minutes) a classmate who knows the class code needs about
  6 days of attempts for one student, and the lockout shows on the teacher view and in the audit
  log. The spec keeps this lockout. Accepted for now. Owner review is pending on a stronger
  rule (for example a longer lock after repeated lockouts, or 4 taps).
- Class code strength: 6 characters from 31 gives about 30 bits. Code entry is limited per IP,
  per class, and by a global limit on failed lookups. The code hash is SHA-256 and the code lives
  3 hours at most. Accepted.
- A shared school IP shares one IP bucket (150 requests in 10 minutes). Raise it if a class fails
  to sign in together.
- `/api/*` is outside the proxy matcher. Each API that needs a full sign-in must check
  `canUseFullAuthFeature` in its handler (the student-login teacher handlers do).
- Global miss bucket DoS: an attacker who makes 200 failed code lookups in 10 minutes blocks code
  entry for every school until the window ends. Accepted for now. Owner review is pending.
- One student can use the whole class bucket (200 requests in 10 minutes) and block the class
  from signing in until the window ends. Accepted for now. Owner review is pending.
- A classmate who knows the code can lock a student by design (5 wrong tries), and a teacher
  reset or card rotation ends that student's sessions by design. Accepted. Owner review is pending.
- QR card token in the browser history: `/auth/card` removes the `#token` from the tab history,
  but the browser History list and address-bar suggestions keep the first URL. On a shared
  device a classmate can open it and sign in as the card owner until the teacher rotates the
  card. Mitigation: schools use guest or private browsing on shared devices; card rotation is
  the recovery. Owner review is pending.
- QR card origin: the card URL uses the origin of the teacher's browser. A card printed from a
  preview host, an IP, or localhost keeps that host. Print cards from the production host.
  Owner review is pending (option: a configured public app URL).
- Class-wide picture guessing (Phase 5 security review M1): the lock is per student. A classmate
  with the code who guesses every student in turn reaches a `full` session for some student in
  about 1 to 1.5 hours from one device (many lockouts show on the teacher view). Owner review is
  pending (option: a class-wide limit on wrong picture tries, or a longer lock after repeated locks).
- Per-IP limits trust `X-Forwarded-For` (security review M3): without `TRUST_PROXY_COUNT` the
  leftmost value is used, which the client controls. An attacker can pass the IP limits or fill
  the limits of a school IP. Owner/deploy item: set `TRUST_PROXY_COUNT` for Primary (no Cloud Run
  change in this program).
- School-wide QR or code block by one student (security review M4): 30 failed card scans or 150
  wrong codes from a shared school IP block that path for the school for 10 minutes. Owner review
  is pending (option: a device cookie in the limit key).
- Guessable student usernames (security review L2), now smaller: the class-prefix names (`p3a12`) are
  gone; a random two-word name has about 880,000 choices. Earlier text: `p3a12`, `student1`. An internet attacker can
  lock the home sign-in of many students with 5 wrong passwords each. Owner review is pending
  (option: a random part in each username; FR-6 asks for readable usernames).
- QR cards now need an open class session in one of the student's classes (security review M2,
  Design 5: away from the classroom only the username and password work).

## Non-goals

- No SSO, no Google login for students, no biometric.
- No change to teacher or admin sign-in.

## Acceptance Criteria

- Tests: code expiry, wrong-class code, lockout, rate limit, cross-class isolation,
  no PII before sign-in, name-list enumeration, QR token rotation, `authStrength` gate.
- A browser test with 25 seeded students signs in through all three paths.
- Teacher sign-in time check: a class of 25 students signs in within 3 minutes by
  QR card and within 5 minutes by picture password (measured with a stopwatch in QA).
