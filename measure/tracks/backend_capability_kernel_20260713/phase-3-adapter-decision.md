# Phase 3 adapter decision recommendation

## Status

Recommendation only. A product owner must accept or reject this decision.

## D1: durable idempotency stores

Retain both ports now.
The kernel port owns `capability_idempotency_records` for generic capability
operations. The Company Identity port owns its identity database records.
This preserves the employee-identity database boundary.

The ports implement the same `DurableIdempotencyPort` behavior. They use
different persistence representations. The kernel port stores `sha256:`
fingerprints. The identity port removes the prefix and uses raw hexadecimal
hashes. The identity port maps a capability ID to `capability:<id>` while the
kernel port stores `capabilityId` directly.

Keep these translations inside the Company Identity adapter. Add contract
parity tests before any unification work. A later identity owner can approve a
store migration only with data migration, replay compatibility, and rollback
evidence.

## D2: route adapter factory names

Retain the current names for compatibility now.
The public package export maps the internal-route-adapter subpath to the public
shim. The shim supplies no trusted request context. Accounts alone uses the
internal factory through the audited deep import.

The equal factory name creates review risk. The existing security test protects
the export substitution and undefined-context rule. Rename in a dedicated
compatibility change if the Accounts deep import can move to an approved
Accounts-only package entry point.

## Required owner decision

The Company Identity owner must accept, amend, or reject both recommendations.
Phase 3 remains active until that owner decision is recorded.
