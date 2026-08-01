import { describe, expect, it } from "vitest";

import type { Tenant, UserContext } from "@reading-advantage/auth";

import type { TenantDB } from "../db-contract.js";
import { createDragonFlightHostProofAttemptDependencies } from "../games/dragon-flight-host-proof-attempt-adapter.js";

const TENANT = Object.freeze({ schoolId: "school-a" } satisfies Tenant);

/**
 * Creates the bounded adapter input for one student school-assignment variant.
 * @param userSchoolId The authenticated student's server-derived school assignment.
 * @returns The adapter dependencies input for the fixed Dragon Flight tenant.
 */
function createAdapterInput(userSchoolId: string | null): {
  readonly db: TenantDB;
  readonly user: UserContext;
  readonly tenant: Tenant;
  readonly secret: string;
} {
  return {
    db: {} as TenantDB,
    user: {
      id: "student-1",
      username: "student-1",
      name: "Student One",
      role: "STUDENT",
      schoolId: userSchoolId,
      xp: 0,
      level: 1,
      cefrLevel: "A1",
    },
    tenant: TENANT,
    secret: "dragon-flight-host-proof-test-secret-at-least-32-bytes",
  };
}

describe("Dragon Flight host-proof attempt dependency adapter", () => {
  it.each([
    { label: "an unassigned student", schoolId: null },
    { label: "a student assigned to another school", schoolId: "school-b" },
  ])("rejects $label before creating dependencies", ({ schoolId }) => {
    expect(() => createDragonFlightHostProofAttemptDependencies(
      createAdapterInput(schoolId),
    )).toThrow(/(?:user.*school|school.*user)/iu);
  });
});
