// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { DB } from "@reading-advantage/db";

import { createTenantDB } from "../db-contract.js";
import { getCohortOverview, getSalesRepDetail } from "../sales/index.js";
import { createMockDb } from "./mock-db.js";

const organizationA = "20000000-0000-4000-8000-000000000003";
const organizationB = "20000000-0000-4000-8000-000000000004";
const organizationKey = "internal-company";

const salesAdmin = {
  id: "admin-a",
  username: "admin.a",
  name: "Admin A",
  role: "SALES_ADMIN" as const,
  schoolId: null,
  organizationId: organizationA,
  organizationKey,
  xp: 0,
  level: 1,
  cefrLevel: "N/A",
};

const companyTenant = {
  schoolId: null,
  organizationId: organizationA,
  organizationKey,
};

function companyDb(sequence: unknown[][]) {
  const database = createMockDb({ selectSequence: sequence });
  return {
    database,
    scoped: createTenantDB(database as unknown as DB, { schoolId: null }),
  };
}

describe("Sales company organization oversight", () => {
  it("returns only same-company reps without requiring a school membership", async () => {
    const sameCompanyRep = {
      id: "rep-a",
      username: "rep.a",
      name: "Rep A",
      schoolId: null,
      organizationId: organizationA,
      organizationKey,
    };
    const otherCompanyRep = {
      id: "rep-b",
      username: "rep.b",
      name: "Rep B",
      schoolId: null,
      organizationId: organizationB,
      organizationKey: "future-company",
    };
    const { scoped } = companyDb([
      [sameCompanyRep, otherCompanyRep],
      [],
      [],
      [],
      [],
      [],
      [],
    ]);

    const result = await getCohortOverview({
      db: scoped,
      user: salesAdmin,
      tenant: companyTenant,
    });

    expect(result.map((rep) => rep.userId)).toEqual(["rep-a"]);
  });

  it("loads same-company rep detail without a school membership", async () => {
    const { scoped } = companyDb([
      [
        {
          id: "rep-a",
          username: "rep.a",
          name: "Rep A",
          organizationId: organizationA,
          organizationKey,
        },
      ],
      [],
      [],
      [],
      [],
      [],
      [],
    ]);

    await expect(
      getSalesRepDetail(
        { db: scoped, user: salesAdmin, tenant: companyTenant },
        { repId: "rep-a" },
      ),
    ).resolves.toMatchObject({ rep: { userId: "rep-a" } });
  });

  it("rejects rep detail when the durable mapping belongs to another company", async () => {
    const { scoped } = companyDb([
      [
        {
          id: "rep-b",
          username: "rep.b",
          name: "Rep B",
          organizationId: organizationB,
          organizationKey: "future-company",
        },
      ],
    ]);

    await expect(
      getSalesRepDetail(
        { db: scoped, user: salesAdmin, tenant: companyTenant },
        { repId: "rep-b" },
      ),
    ).rejects.toThrow("Representative is unavailable");
  });
});
