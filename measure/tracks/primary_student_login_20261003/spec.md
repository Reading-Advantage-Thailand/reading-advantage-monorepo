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
  Generate usernames at roster import. Print them on the class sheet.
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

## Non-goals

- No SSO, no Google login for students, no biometric.
- No change to teacher or admin sign-in.

## Acceptance Criteria

- Tests: code expiry, wrong-class code, lockout, rate limit, cross-class isolation,
  no PII before sign-in, name-list enumeration, QR token rotation, `authStrength` gate.
- A browser test with 25 seeded students signs in through all three paths.
- Teacher sign-in time check: a class of 25 students signs in within 3 minutes by
  QR card and within 5 minutes by picture password (measured with a stopwatch in QA).
