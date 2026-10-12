# Design — system dashboard (Phase 1)

Place: `observatory` (the reports place, as the admin dashboard). The `Scene` uses the `contained` option.
Layout, top to bottom: the heading and the week ("This week: 6 Oct to 12 Oct"), the "Platform totals" panel,
the "Schools" panel. Phone first (375 px), then 1280 px. Day and night.

## Totals strip

- Six tiles, 2 columns on a phone and 3 from 768 px: Schools, Students, Teachers, Active students this week
  (with a meter and "n of m (p%)"), Articles opened this week, Seats used (with a meter and "of N seats").
- Each label names its metric. Only two tiles have a meter.
- "Seats used" shows "—" and "No license" when no school has seats.
- A note line shows inside the panel only when students have no school: "{n} students have no school. They are
  not in the table. Assign a school on the Users page." A mark "!" and the text, not colour only.

## Schools table

- Toolbar: a search field (a part of the school name) and, below 768 px, the sort control.
- Table from 768 px, columns: School (a link), Active students ("n of m (p%)"), Articles opened, Seats ("used of
  total" or "No license"), Last activity (a Bangkok date or "None"), Status, and an "Open" button. Each header is
  a button of 48 px height with `aria-sort`.
- Cards below 768 px: the school name (a link) and the status chip, four labeled values, and a full-width
  "Open dashboard" button.
- Status chip: a mark and a label. Quiet "!" (red), Active "✓" (green), No students "–" (grey).
- Default order: quiet schools first, then the school name. A sort on a column changes it; a second tap changes the order.
- Empty states: no school at all ("No schools yet" and a link to Schools); a search with no match (a status line).
- Footer note: "This week means the last 7 days, today included. Quiet means a school with students and no
  activity this week. Seats count students only."

## Values for the look check (defaults used, "look check pending (owner, async)")

1. Quiet rule: at least one student and no activity event in 7 days. In the mock, 2 of 9 schools are quiet.
2. "This week" is the last 7 days, not the calendar week from Monday.
3. "Articles opened" is the reading number.
4. Default order: quiet schools first, then the name.
5. The count of students without a school shows in the strip, as a note.
6. Design choice: the strip "Seats used" counts only schools that have an active license with seats.

## Proposed English strings for Phase 3 (namespace `SystemDashboard`)

title, week ("This week: {start} to {end}"), totals.heading, totals.{schools, students, teachers, active,
activeSub, articles, seatsUsed, seatsOf, noLicense, withoutSchool}, table.{heading, search, sortBy, empty,
emptyHint, noMatch, school, active, articles, seats, last, status, open, openFor, none, noLicense, footnote},
status.{quiet, active, noStudents}. The old key for "System Dashboard Description" is removed (FR-13).
