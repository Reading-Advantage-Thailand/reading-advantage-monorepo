# Finance H-1 Green evidence

## Scope

- Track: `company_finance_operations_20260810`
- Phase: Phase 2 — controlled operational imports
- Role: `measure-jr-green`
- Source commit: `e27090fa43d523e9249b89cb8e7e5e5be8a0939d`
- Current HEAD: `e6265b0bed56290f5776353193e554c177a823df`

## Delivered correction

The Finance durable outbox projector omits `schoolIds` when its value is undefined.
It retains `schoolIds` when the value is present.
The durable request JSON-safe validation remains unchanged.
The source commit contains one behavior change.
The remaining source changes apply Prettier formatting only.

## Verification

- The focused Finance security review passed 52/52 tests.
- The full Finance suite passed 401/401 tests.
- The THB suite passed 94/94 tests.
- The THB adversarial suite passed 29/29 tests.
- The architecture suite passed 11/11 tests.
- The Company Identity suite passed 103/103 tests.
- Production and test TypeScript checks passed.
- Finance ESLint passed.
- The backend build passed.
- Prettier passed for `ports.ts`.
- The scoped diff check passed.
- No tests, plan, evidence, or logs changed in the source commit.

## Owner gates and status

THB rate-source, rounding, and effective-date decisions remain deferred.
The historical pilot remains blocked by `finance-owner-data`.
CRM and Tutor source-owner contracts remain deferred.
Close, accountant-pack, release, and Company Admin gates remain blocked.
No phase or whole-track acceptance claim is made.
