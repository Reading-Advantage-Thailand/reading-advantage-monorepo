/**
 * Wave 2 Phase 4 — Reusable tenant-isolation test harness.
 *
 * Generalizes the Wave 0/1 two-school acceptance fixture
 * (`packages/domain/src/__tests__/fixtures/2-school.ts`) into a builder that
 * produces:
 *   - exactly two distinct schools (deterministic UUIDs / names)
 *   - per-school tenant contexts (the `{ schoolId }` shape used by `createTenantDB`)
 *   - cross-school adversarial cases (one school's tenant attempting to read
 *     or mutate a resource that belongs to the other school)
 *
 * Why this lives here:
 *   - Reuses the existing Wave 0/1 fixture naming convention so downstream
 *     tests can opt-in to the shared fixtures instead of copy-pasting school
 *     A / B data into each test file.
 *   - Stays inside the `testing/` subpath which is intentionally NOT in the
 *     package's `exports` map (see `packages/domain/package.json`) so the
 *     harness is a test utility, not a shipped runtime API.
 *   - Pure data — no Next/tRPC/DB transport types — so domain tests can
 *     consume it without leaking transport concerns into the harness.
 *
 * @example
 *   const harness = buildTenantIsolationHarness();
 *   const tenantDb = createTenantDB(mockDb, harness.tenants[0]);
 *   expect(harness.adversarialCases.length).toBeGreaterThanOrEqual(1);
 */

interface TenantContext {
  schoolId: string;
}

interface SchoolFixture {
  id: string;
  name: string;
}

interface CrossTenantCase {
  name: string;
  ownerTenant: TenantContext;
  attackerTenant: TenantContext;
  resource: { schoolId: string };
}

interface TenantIsolationHarness {
  schools: [SchoolFixture, SchoolFixture, ...SchoolFixture[]];
  tenants: [TenantContext, TenantContext, ...TenantContext[]];
  adversarialCases: CrossTenantCase[];
}

const SCHOOL_A: SchoolFixture = {
  id: "school-a-id-00000000-0000-0000-0000",
  name: "School A",
};

const SCHOOL_B: SchoolFixture = {
  id: "school-b-id-00000000-0000-0000-0000",
  name: "School B",
};

/**
 * Build a deterministic tenant-isolation harness with two schools and at
 * least one cross-tenant adversarial case. The fixture is intentionally
 * aligned with `packages/domain/src/__tests__/fixtures/2-school.ts` so
 * tests that already import that fixture continue to work; this harness
 * only adds the structured `adversarialCases` and a `schools` array that
 * downstream tests can iterate over without reconstructing tenant A/B by
 * hand.
 *
 * @returns A reusable harness with schools, per-school tenant contexts, and
 *   ready-made cross-school attack surfaces.
 */
export function buildTenantIsolationHarness(): TenantIsolationHarness {
  const schools: [SchoolFixture, SchoolFixture, ...SchoolFixture[]] = [
    SCHOOL_A,
    SCHOOL_B,
  ];

  const tenants: [TenantContext, TenantContext, ...TenantContext[]] = [
    { schoolId: SCHOOL_A.id },
    { schoolId: SCHOOL_B.id },
  ];

  const adversarialCases: CrossTenantCase[] = [
    {
      name: "school-A user attempts to access school-B resource",
      ownerTenant: tenants[0],
      attackerTenant: tenants[1],
      resource: { schoolId: SCHOOL_A.id },
    },
    {
      name: "school-B user attempts to access school-A resource",
      ownerTenant: tenants[1],
      attackerTenant: tenants[0],
      resource: { schoolId: SCHOOL_B.id },
    },
  ];

  return { schools, tenants, adversarialCases };
}

export type {
  CrossTenantCase,
  SchoolFixture,
  TenantContext,
  TenantIsolationHarness,
};