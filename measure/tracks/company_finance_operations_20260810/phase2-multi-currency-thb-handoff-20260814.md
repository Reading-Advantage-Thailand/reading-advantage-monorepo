# Phase 2 multi-currency THB handoff

## Current accepted baseline

Commit `1d0ffd568` binds controlled Finance imports to verified packet facts.
The change preserves exact source amounts and source currencies.

Fresh Review A and Review B passed with no findings. Their artifacts are:

- `phase2-final-trust-binding-review-a-v2-20260814.json`
- `phase2-final-trust-binding-review-b-v2-20260814.json`

The reviewed Finance suite passed 304 tests. Company Identity passed 20 tests.
The private-storage boundary passed 25 tests.

## Owner clarification

Finance must accept bills in any source-stated currency. Each bill must also
have a separate exact THB-equivalent field.

The system must preserve the original amount and currency. The THB value cannot
replace the source amount.

## Required next-session design

Add trusted conversion evidence to the verified packet. At minimum, bind these
values:

- The exact THB-equivalent amount.
- The exact conversion rate.
- The rate effective date.
- The rate source identity.

The caller may repeat these values for validation. The caller cannot set the
authoritative values.

Use decimal arithmetic for all conversion checks. Treat a THB bill as an exact
identity conversion. Reject incomplete conversion evidence.

Do not select a rate provider or rounding policy without an explicit owner or
accountant decision. Place any later provider behind an internal Finance port.

## Required Red tests

- Accept USD, EUR, JPY, THB, and an uncommon valid three-letter currency.
- Preserve each exact original amount and currency.
- Produce a separate exact THB-equivalent amount.
- Use an exact identity conversion for THB bills.
- Reject a missing THB amount, rate, date, or source.
- Reject duplicate or contradictory conversion facts.
- Reject a caller-modified THB amount or conversion field.
- Reject binary floating-point conversion and undocumented rounding.
- Preserve idempotency when every trusted conversion fact is unchanged.
- Produce a conflict when trusted conversion evidence changes.

## Scope boundary

No THB-equivalent implementation exists in the accepted baseline. The next
session must follow Contract-First TDD and obtain fresh independent reviews.
