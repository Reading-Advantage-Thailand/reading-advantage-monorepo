# Behavior contract — <member track ID>

Copy this file to `measure/tracks/<member>/behavior-contract.md`. Fill all seven sections before the
member builds. Write a legacy fact with `file:line` at legacy revision `bfea121`. Write "none" for an
empty section. Do not leave a section out.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| | | | |

## 2. Legacy behavior

Describe what the user does and what the app shows. One block for each page or action.

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| | | | | |

## 3. Data read and written

| Item | Kind (table, route, side effect) | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

List each side effect: XP, logs, email, files, AI calls.

## 4. New target

- Drizzle tables (and the migration, when the schema changes):
- Domain functions (Zod input and output):
- Permission action for `assertCan`:
- TenantDB class for each table (FLAT, EXEMPT, or REFERENTIAL):
- AI adapter use:
- RPG skin components:
- Routes (with the locale):

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| | | |

## 6. Acceptance rows

Each row becomes a pair or a check in `acceptance-pairs.json`.

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

## 7. ETL and runbook changes

Changes for `primary_parity_rehearsal3_20261011`: new ETL steps, new backfills, new runbook steps,
new checks for `scripts/primary-parity/cutover-check.mjs`. Write "none" when there is no change.
