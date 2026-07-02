/**
 * Wave 2 Phase 4 — Reusable tenant-isolation harness.
 *
 * Track:  wave2_confidence_restoration_20260628
 * Phase:  4 — Reusable Harnesses
 *
 * Drives a shared tenant-isolation test helper that builds deterministic
 * two-school fixtures and at least one cross-school adversarial case.
 *
 * The harness is intended to live in:
 *   packages/domain/src/testing/tenant-isolation-harness.ts
 * and be consumed by any domain/tRPC test that needs realistic tenant
 * boundaries (e.g. class queries, assignment mutations, progress reports).
 *
 * RED expectations at HEAD:
 *   - The reusable harness module does not exist, so the import fails.
 *   - If a stub exists, it must expose >=2 schools and >=1 adversarial case
 *     or the labeled count assertions fail.
 *
 * Anti-pattern coverage:
 *   A1: assertions consume structured fixture objects, not substring truth.
 *   A3: counts are labeled ("School fixture count: N",
 *       "Cross-tenant rejection count: N").
 *   A4: test fails if the harness produces <2 schools or 0 adversarial cases.
 *   A5: injected counterexample fixtures prove the consumer catches a bad
 *       cross-tenant access attempt.
 */
import { describe, expect, it } from "vitest";
import { buildTenantIsolationHarness } from "../testing/tenant-isolation-harness.js";

interface TenantContext {
  schoolId: string;
}

interface CrossTenantCase {
  name: string;
  ownerTenant: TenantContext;
  attackerTenant: TenantContext;
  resource: { schoolId: string };
}

interface TenantIsolationHarness {
  schools: Array<{ id: string; name: string }>;
  tenants: [TenantContext, TenantContext, ...TenantContext[]];
  adversarialCases: CrossTenantCase[];
}

/**
 * Sample domain consumer: a same-tenant access guard.
 * In production this would be a domain function or TenantDB query; here it
 * proves the harness fixtures are usable for cross-tenant adversarial tests.
 */
function sameTenantAccessGuard(
  requestingTenant: TenantContext,
  resource: { schoolId: string }
): { allowed: boolean } {
  return { allowed: requestingTenant.schoolId === resource.schoolId };
}

describe("Wave 2 Phase 4 — tenant isolation harness", () => {
  it("exists and exposes a builder function", () => {
    expect(
      buildTenantIsolationHarness,
      "packages/domain/src/testing/tenant-isolation-harness.ts must export " +
        "`buildTenantIsolationHarness()`. This helper generalizes the Wave 0/1 " +
        "two-school fixtures so domain tests do not copy-paste school A/B data.",
    ).toBeTypeOf("function");
  });

  it("constructs at least two schools (A4 / mandatory two-school fixtures)", () => {
    const harness = buildTenantIsolationHarness() as TenantIsolationHarness;
    const schoolCount = harness.schools.length;
    expect(
      schoolCount,
      `School fixture count: ${schoolCount}. ` +
        `A tenant-isolation harness must produce >=2 schools so tests can ` +
        `exercise cross-tenant boundaries (anti-pattern A4).`,
    ).toBeGreaterThanOrEqual(2);
  });

  it("produces at least one cross-school adversarial case", () => {
    const harness = buildTenantIsolationHarness() as TenantIsolationHarness;
    const caseCount = harness.adversarialCases.length;
    expect(
      caseCount,
      `Cross-school adversarial case count: ${caseCount}. ` +
        `The harness must ship ready-made cross-tenant attack surfaces ` +
        `(e.g. school-A user accessing school-B resource) so consumer tests ` +
        `do not fabricate them (anti-pattern A4).`,
    ).toBeGreaterThanOrEqual(1);
  });

  it("tenant contexts have distinct schoolIds", () => {
    const harness = buildTenantIsolationHarness() as TenantIsolationHarness;
    const ids = harness.tenants.map((t) => t.schoolId);
    const uniqueIds = new Set(ids);
    expect(
      uniqueIds.size,
      `Distinct tenant schoolId count: ${uniqueIds.size} (of ${ids.length}). ` +
        `Tenants must not share a schoolId or isolation tests are vacuous.`,
    ).toBe(ids.length);
  });

  describe("consumer — same-tenant access guard", () => {
    it("rejects a cross-tenant access attempt using harness fixtures (A5 counterexample)", () => {
      const harness = buildTenantIsolationHarness() as TenantIsolationHarness;
      const adversarial = harness.adversarialCases[0];
      const result = sameTenantAccessGuard(
        adversarial.attackerTenant,
        adversarial.resource,
      );
      const rejectionCount = result.allowed ? 0 : 1;
      expect(
        result.allowed,
        `Cross-tenant rejection count: ${rejectionCount}. ` +
          `The harness adversarial case ${adversarial.name} must represent a ` +
          `cross-tenant request (attacker schoolId ${adversarial.attackerTenant.schoolId} ` +
          `vs resource schoolId ${adversarial.resource.schoolId}).`,
      ).toBe(false);
    });

    it("allows same-tenant access using harness fixtures", () => {
      const harness = buildTenantIsolationHarness() as TenantIsolationHarness;
      const adversarial = harness.adversarialCases[0];
      const result = sameTenantAccessGuard(
        adversarial.ownerTenant,
        adversarial.resource,
      );
      expect(
        result.allowed,
        "The owner tenant must be allowed access to its own resource.",
      ).toBe(true);
    });
  });
});
